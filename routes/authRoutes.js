import express from 'express';
import User from '../models/User.js';
import Video from '../models/Video.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Resend } from 'resend';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Case-insensitive username lookup
    const user = await User.findOne({
        username: { $regex: new RegExp(`^${username}$`, 'i') }
    });

    if (user && (await user.matchPassword(password))) {
        // Check for 2FA
        if (user.isTwoFactorEnabled) {
            // Generate 6-digit OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();

            // Save OTP to user
            user.twoFactorCode = otp;
            user.twoFactorCodeExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
            await user.save();

            // Send OTP via Email
            const resend = new Resend(process.env.RESEND_API_KEY);
            try {
                await resend.emails.send({
                    from: process.env.EMAIL_FROM || 'Heston Automotive <no-reply@hestonautomotive.com>',
                    to: [user.email],
                    subject: 'Your Login Verification Code',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; color: #333;">
                            <h2>Login Verification</h2>
                            <p>Please use the following code to complete your login:</p>
                            <h1 style="color: #2563EB; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
                            <p>This code will expire in 10 minutes.</p>
                            <p>If you did not attempt to login, please contact support immediately.</p>
                        </div>
                    `
                });
            } catch (error) {
                console.error('Failed to send 2FA email:', error);
                return res.status(500).json({ message: 'Failed to send verification code' });
            }

            return res.json({
                requireTwoFactor: true,
                userId: user._id
            });
        }

        res.json({
            _id: user._id,
            username: user.username,
            name: user.name, // Return name
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            isTwoFactorEnabled: user.isTwoFactorEnabled,
            token: generateToken(user._id),
        });
    } else {
        res.status(401).json({ message: 'Invalid username or password' });
    }
});

// @desc    Verify 2FA Code
// @route   POST /api/auth/verify-2fa
// @access  Public
router.post('/verify-2fa', async (req, res) => {
    const { userId, code } = req.body;

    const user = await User.findById(userId);

    if (user && user.twoFactorCode === code && user.twoFactorCodeExpire > Date.now()) {
        // Clear OTP
        user.twoFactorCode = undefined;
        user.twoFactorCodeExpire = undefined;
        await user.save();

        res.json({
            _id: user._id,
            username: user.username,
            name: user.name, // Return name
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            isTwoFactorEnabled: user.isTwoFactorEnabled,
            token: generateToken(user._id),
        });
    } else {
        res.status(400).json({ message: 'Invalid or expired verification code' });
    }
});

// @desc    Register a new staff member
// @route   POST /api/auth/staff
// @access  Private/Admin
router.post('/staff', protect, admin, async (req, res) => {
    const { username, name, password, email, phoneNumber } = req.body;

    const userExists = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (userExists) {
        return res.status(400).json({ message: 'User or Email already exists' });
    }

    const user = await User.create({
        username,
        name, // Save name
        password,
        email,
        phoneNumber,
        role: 'staff',
    });

    if (user) {
        // Send welcome email to new staff member
        const resend = new Resend(process.env.RESEND_API_KEY);
        const frontendUrl = process.env.FRONTEND_URL || 'https://video.hestonautomotive.com';

        try {
            await resend.emails.send({
                from: process.env.EMAIL_FROM || 'Heston Automotive <no-reply@hestonautomotive.com>',
                to: [email],
                subject: 'Welcome to Heston Automotive - Account Created',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; color: #333;">
                        <h2 style="color: #2563EB;">Welcome to Heston Automotive!</h2>
                        <p>Your staff account has been successfully created. Here are your login credentials:</p>
                        
                        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>Username:</strong> ${username}</p>
                            <p style="margin: 5px 0;"><strong>Temporary Password:</strong> ${password}</p>
                            <p style="margin: 5px 0;"><strong>Login URL:</strong> <a href="${frontendUrl}" style="color: #2563EB;">${frontendUrl}</a></p>
                        </div>
                        
                        <p><strong>Important:</strong> For security reasons, we recommend changing your password after your first login.</p>
                        
                        <h3 style="color: #2563EB;">How to Change Your Password:</h3>
                        <ol>
                            <li>Go to <a href="${frontendUrl}/forgot-password" style="color: #2563EB;">Forgot Password</a></li>
                            <li>Enter your email address</li>
                            <li>Follow the instructions in the email to reset your password</li>
                        </ol>
                        
                        <p>If you have any questions or need assistance, please contact your administrator.</p>
                        
                        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">This is an automated message. Please do not reply to this email.</p>
                    </div>
                `
            });
            console.log(`Welcome email sent to ${email}`);
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Don't fail the request if email fails, just log it
        }

        res.status(201).json({
            _id: user._id,
            username: user.username,
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
        });
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
});

// @desc    Get all staff
// @route   GET /api/auth/staff
// @access  Private/Admin
router.get('/staff', protect, admin, async (req, res) => {
    const staff = await User.find({ role: 'staff' }).select('-password');
    res.json(staff);
});

// @desc    Update staff member
// @route   PUT /api/auth/staff/:id
// @access  Private/Admin
router.post('/staff/:id', protect, admin, async (req, res) => {
    const user = await User.findById(req.params.id);

    if (user) {
        user.username = req.body.username || user.username;
        user.name = req.body.name || user.name; // Update name
        user.email = req.body.email || user.email;
        user.phoneNumber = req.body.phoneNumber || user.phoneNumber;
        if (req.body.isTwoFactorEnabled !== undefined) {
            user.isTwoFactorEnabled = req.body.isTwoFactorEnabled;
        }

        if (req.body.password) {
            user.password = req.body.password;
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            username: updatedUser.username,
            name: updatedUser.name,
            email: updatedUser.email,
            phoneNumber: updatedUser.phoneNumber,
            role: updatedUser.role,
            isTwoFactorEnabled: updatedUser.isTwoFactorEnabled,
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});

// @desc    Delete staff member
// @route   DELETE /api/auth/staff/:id
// @access  Private/Admin
router.delete('/staff/:id', protect, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            // Delete user's videos first
            await Video.deleteMany({ uploadedBy: user._id });

            // Delete user
            await user.deleteOne();

            res.json({ message: 'User and all associated data removed' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @desc    Update user profile (username and/or password)
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
    try {
        const { username, currentPassword, newPassword } = req.body;

        // Find the logged-in user
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        if (!currentPassword) {
            return res.status(400).json({ message: 'Current password is required' });
        }

        const isPasswordValid = await user.matchPassword(currentPassword);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        // Check if at least one field is being updated
        if (!username && !newPassword) {
            return res.status(400).json({ message: 'Please provide username or new password to update' });
        }

        // Prepare update object
        const updateData = {};

        // Update username if provided
        if (username && username !== user.username) {
            // Check if username already exists
            const usernameExists = await User.findOne({ username, _id: { $ne: user._id } });
            if (usernameExists) {
                return res.status(400).json({ message: 'Username already taken' });
            }
            updateData.username = username;
        }

        // Update password if provided
        if (newPassword) {
            if (newPassword.length < 6) {
                return res.status(400).json({ message: 'New password must be at least 6 characters' });
            }
            // Hash the password manually
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(newPassword, salt);
        }

        // Update user with new data
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true, runValidators: false }
        );

        // Return updated user data with new token
        res.json({
            _id: updatedUser._id,
            username: updatedUser.username,
            email: updatedUser.email,
            phoneNumber: updatedUser.phoneNumber,
            role: updatedUser.role,
            token: generateToken(updatedUser._id),
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ message: 'Failed to update profile' });
    }
});

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'Email could not be sent' });
        }

        // Get reset token
        const resetToken = user.getResetPasswordToken();

        await user.save();

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

        const resend = new Resend(process.env.RESEND_API_KEY);

        try {
            await resend.emails.send({
                from: process.env.EMAIL_FROM || 'Heston Automotive <no-reply@hestonautomotive.com>',
                to: [user.email],
                subject: 'Password Reset Request',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; color: #333;">
                        <h2>Password Reset Request</h2>
                        <p>You have requested a password reset. Please click the link below to reset your password:</p>
                        <a href="${resetUrl}" style="background-color: #2563EB; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Reset Password</a>
                        <p>If you did not request this, please ignore this email.</p>
                        <p>This link will expire in 10 minutes.</p>
                    </div>
                `
            });

            res.status(200).json({ success: true, data: 'Email sent' });
        } catch (err) {
            console.error(err);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();
            return res.status(500).json({ message: 'Email could not be sent' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Reset Password
// @route   PUT /api/auth/reset-password/:resetToken
// @access  Public
router.put('/reset-password/:resetToken', async (req, res) => {
    try {
        // Get hashed token
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.resetToken)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid token' });
        }

        // Set new password
        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.status(200).json({
            success: true,
            data: 'Password reset success',
            token: generateToken(user._id),
            _id: user._id,
            username: user.username,
            role: user.role,
            isTwoFactorEnabled: user.isTwoFactorEnabled
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;
