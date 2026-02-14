import express from 'express';
import Booking from '../models/Booking.js';
import Video from '../models/Video.js';
import { Resend } from 'resend';

const router = express.Router();

// @desc    Create a new booking
// @route   POST /api/bookings
// @access  Public
router.post('/', async (req, res) => {
    try {
        const { videoId, customerName, customerEmail, customerPhone, visitDate, visitTime, notes } = req.body;

        // Validate required fields
        if (!videoId || !customerName || !customerEmail || !customerPhone || !visitDate || !visitTime) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Get video details
        const video = await Video.findById(videoId);
        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }

        // Create booking
        const booking = await Booking.create({
            videoId,
            customerName,
            customerEmail,
            customerPhone,
            visitDate,
            visitTime,
            registration: video.registration,
            make: video.make,
            model: video.model,
            notes
        });

        // Send email notification to rashid@hestonautomotive.com
        const resend = new Resend(process.env.RESEND_API_KEY);

        const formattedDate = new Date(visitDate).toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        try {
            // Email to Rashid
            await resend.emails.send({
                from: process.env.EMAIL_FROM || 'Heston Automotive <no-reply@hestonautomotive.com>',
                to: ['rashid@hestonautomotive.com'],
                subject: `New Showroom Visit Booking - ${video.registration || 'Vehicle'}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; color: #333;">
                        <h2 style="color: #2563EB;">New Showroom Visit Booking</h2>
                        
                        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #2563EB;">Customer Details</h3>
                            <p style="margin: 5px 0;"><strong>Name:</strong> ${customerName}</p>
                            <p style="margin: 5px 0;"><strong>Email:</strong> ${customerEmail}</p>
                            <p style="margin: 5px 0;"><strong>Phone:</strong> ${customerPhone}</p>
                        </div>

                        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #2563EB;">Visit Details</h3>
                            <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
                            <p style="margin: 5px 0;"><strong>Time:</strong> ${visitTime}</p>
                        </div>

                        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #2563EB;">Vehicle Details</h3>
                            <p style="margin: 5px 0;"><strong>Registration:</strong> ${video.registration || 'N/A'}</p>
                            <p style="margin: 5px 0;"><strong>Make:</strong> ${video.make || 'N/A'}</p>
                            <p style="margin: 5px 0;"><strong>Model:</strong> ${video.model || 'N/A'}</p>
                        </div>

                        ${notes ? `
                        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #2563EB;">Additional Notes</h3>
                            <p style="margin: 5px 0;">${notes}</p>
                        </div>
                        ` : ''}

                        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                            Booking ID: ${booking._id}
                        </p>
                    </div>
                `
            });

            // Confirmation email to customer
            await resend.emails.send({
                from: process.env.EMAIL_FROM || 'Heston Automotive <no-reply@hestonautomotive.com>',
                to: [customerEmail],
                subject: 'Showroom Visit Booking Confirmation - Heston Automotive',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; color: #333;">
                        <h2 style="color: #2563EB;">Thank You for Your Booking!</h2>
                        
                        <p>Dear ${customerName},</p>
                        
                        <p>Your showroom visit has been successfully booked. We look forward to seeing you!</p>

                        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #2563EB;">Your Visit Details</h3>
                            <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
                            <p style="margin: 5px 0;"><strong>Time:</strong> ${visitTime}</p>
                            <p style="margin: 5px 0;"><strong>Vehicle:</strong> ${video.make || ''} ${video.model || ''} ${video.registration ? `(${video.registration})` : ''}</p>
                        </div>

                        <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563EB;">
                            <h3 style="margin-top: 0; color: #2563EB;">Showroom Address</h3>
                            <p style="margin: 5px 0;">Heston Automotive Ltd</p>
                            <p style="margin: 5px 0;">Unit 1 Vinyl Pl, Dawley Rd, Hayes UB3 1DA</p>
                            <p style="margin: 5px 0;">Contact: 020 8564 8030</p>
                        </div>

                        <p>If you need to reschedule or have any questions, please contact us.</p>
                        
                        <p style="margin-top: 30px;">Best regards,<br><strong>Heston Automotive Team</strong></p>
                        
                        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                            Booking Reference: ${booking._id}
                        </p>
                    </div>
                `
            });

            console.log(`Booking confirmation emails sent for booking ${booking._id}`);
        } catch (emailError) {
            console.error('Failed to send booking emails:', emailError);
            // Don't fail the booking if email fails
        }

        res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            booking
        });
    } catch (error) {
        console.error('Booking creation error:', error);
        res.status(500).json({ message: 'Failed to create booking' });
    }
});

// @desc    Get all bookings (for admin)
// @route   GET /api/bookings
// @access  Private/Admin
router.get('/', async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate('videoId', 'registration make model')
            .sort({ visitDate: 1 });
        res.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ message: 'Failed to fetch bookings' });
    }
});

export default router;
