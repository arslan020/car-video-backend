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
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>New Showroom Visit Booking</title>
                    </head>
                    <body style="margin: 0; padding: 0; background-color: #e6f3ff; font-family: 'Segoe UI', Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased;">
                        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #e6f3ff;">
                            <tr>
                                <td align="center" style="padding: 40px 20px;">
                                    <!-- Main Container -->
                                    <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
                                        
                                        <!-- Header -->
                                        <tr>
                                            <td style="background-color: #1a1654; padding: 40px 40px; text-align: center;">
                                                <img src="${process.env.FRONTEND_URL}/business-logo.png" alt="Heston Automotive" style="max-width: 180px; height: auto; display: block; margin: 0 auto; filter: brightness(0) invert(1);">
                                                <p style="margin: 15px 0 0 0; color: #ffffff; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; opacity: 0.9;">
                                                    Premium Vehicle Specialists
                                                </p>
                                            </td>
                                        </tr>
                                        
                                        <!-- Banner -->
                                        <tr>
                                            <td style="background: linear-gradient(135deg, #1a1654 0%, #2a2664 100%); padding: 25px 40px; text-align: center;">
                                                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold; letter-spacing: 0.5px;">
                                                    New Showroom Visit Booking
                                                </h1>
                                                <p style="margin: 8px 0 0 0; color: #e6f3ff; font-size: 14px;">
                                                    Booking Confirmed
                                                </p>
                                            </td>
                                        </tr>
                                        <!-- Main Content -->
                                        <tr>
                                            <td style="padding: 40px;">
                                                <!-- Visit Details -->
                                                <div style="background-color: #e6f3ff; padding: 25px; border-left: 4px solid #1a1654; margin-bottom: 30px;">
                                                    <h2 style="margin: 0 0 20px 0; color: #1a1654; font-size: 16px; font-weight: bold; text-transform: uppercase;">
                                                        Visit Details
                                                    </h2>
                                                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                                        <tr>
                                                            <td style="padding-bottom: 10px; width: 40%; color: #666666; font-size: 14px;">Date:</td>
                                                            <td style="padding-bottom: 10px; color: #1a1a1a; font-size: 16px; font-weight: bold;">${formattedDate}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style="width: 40%; color: #666666; font-size: 14px;">Time:</td>
                                                            <td style="color: #1a1a1a; font-size: 16px; font-weight: bold;">${visitTime}</td>
                                                        </tr>
                                                    </table>
                                                </div>

                                                <!-- Customer Details -->
                                                <div style="background-color: #ffffff; border: 1px solid #e5e5e5; padding: 25px; margin-bottom: 30px;">
                                                    <h2 style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; font-weight: bold; text-transform: uppercase;">
                                                        Customer Information
                                                    </h2>
                                                    <p style="margin: 0 0 5px 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">${customerName}</p>
                                                    <p style="margin: 0 0 5px 0; color: #666666; font-size: 14px;">
                                                        <a href="mailto:${customerEmail}" style="color: #666666; text-decoration: none;">${customerEmail}</a>
                                                    </p>
                                                    <p style="margin: 0; color: #666666; font-size: 14px;">
                                                        <a href="tel:${customerPhone}" style="color: #666666; text-decoration: none;">${customerPhone}</a>
                                                    </p>
                                                </div>

                                                <!-- Vehicle Details -->
                                                <div style="background-color: #ffffff; border: 1px solid #e5e5e5; padding: 25px; margin-bottom: 30px;">
                                                    <h2 style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; font-weight: bold; text-transform: uppercase;">
                                                        Vehicle of Interest
                                                    </h2>
                                                    <p style="margin: 0 0 5px 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">
                                                        ${video.make || 'N/A'} ${video.model || 'N/A'}
                                                    </p>
                                                    <p style="margin: 0; color: #666666; font-size: 14px;">
                                                        Registration: ${video.registration || 'N/A'}
                                                    </p>
                                                </div>

                                                ${notes ? `
                                                <div style="background-color: #fef3c7; padding: 20px; border-radius: 4px; border-left: 4px solid #f59e0b;">
                                                    <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 14px; text-transform: uppercase; font-weight: bold;">Additional Notes</h3>
                                                    <p style="margin: 0; color: #92400e; font-size: 14px;">${notes}</p>
                                                </div>
                                                ` : ''}
                                                
                                            </td>
                                        </tr>
                                        
                                        <!-- Footer -->
                                        <tr>
                                            <td style="background-color: #1a1654; padding: 25px 40px; text-align: center;">
                                                <p style="margin: 0; color: #e6f3ff; font-size: 12px; line-height: 1.6; opacity: 0.9;"> 
                                                    Booking ID: ${booking._id}<br>
                                                    © ${new Date().getFullYear()} Heston Automotive Admin System.
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>
                `
            });

            // Confirmation email to customer
            await resend.emails.send({
                from: process.env.EMAIL_FROM || 'Heston Automotive <no-reply@hestonautomotive.com>',
                to: [customerEmail],
                subject: 'Showroom Visit Booking Confirmation - Heston Automotive',
                html: `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Showroom Visit Booking Confirmation</title>
                    </head>
                    <body style="margin: 0; padding: 0; background-color: #e6f3ff; font-family: 'Segoe UI', Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased;">
                        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #e6f3ff;">
                            <tr>
                                <td align="center" style="padding: 40px 20px;">
                                    <!-- Main Container -->
                                    <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
                                        
                                        <!-- Header -->
                                        <tr>
                                            <td style="background-color: #1a1654; padding: 40px 40px; text-align: center;">
                                                <img src="${process.env.FRONTEND_URL}/business-logo.png" alt="Heston Automotive" style="max-width: 180px; height: auto; display: block; margin: 0 auto; filter: brightness(0) invert(1);">
                                                <p style="margin: 15px 0 0 0; color: #ffffff; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; opacity: 0.9;">
                                                    Premium Vehicle Specialists
                                                </p>
                                            </td>
                                        </tr>
                                        
                                        <!-- Banner -->
                                        <tr>
                                            <td style="background: linear-gradient(135deg, #1a1654 0%, #2a2664 100%); padding: 25px 40px; text-align: center;">
                                                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold; letter-spacing: 0.5px;">
                                                    Booking Confirmed
                                                </h1>
                                                <p style="margin: 8px 0 0 0; color: #e6f3ff; font-size: 15px;">
                                                    We look forward to seeing you
                                                </p>
                                            </td>
                                        </tr>
                                                
                                                <!-- Visit Details -->
                                                <div style="background-color: #e6f3ff; padding: 25px; border-left: 4px solid #1a1654; margin-bottom: 30px;">
                                                    <h2 style="margin: 0 0 20px 0; color: #1a1654; font-size: 16px; font-weight: bold; text-transform: uppercase;">
                                                        Your Visit Details
                                                    </h2>
                                                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                                        <tr>
                                                            <td style="padding-bottom: 10px; width: 40%; color: #666666; font-size: 14px;">Date:</td>
                                                            <td style="padding-bottom: 10px; color: #1a1a1a; font-size: 16px; font-weight: bold;">${formattedDate}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding-bottom: 10px; width: 40%; color: #666666; font-size: 14px;">Time:</td>
                                                            <td style="padding-bottom: 10px; color: #1a1a1a; font-size: 16px; font-weight: bold;">${visitTime}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style="width: 40%; color: #666666; font-size: 14px;">Vehicle:</td>
                                                            <td style="color: #1a1a1a; font-size: 16px; font-weight: bold;">
                                                                ${video.make || ''} ${video.model || ''}
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </div>

                                                <!-- Address and Contact -->
                                                <div style="background-color: #ffffff; border: 1px solid #e5e5e5; padding: 25px; margin-bottom: 30px;">
                                                    <h2 style="margin: 0 0 15px 0; color: #1a1654; font-size: 16px; font-weight: bold; text-transform: uppercase;">
                                                        Location
                                                    </h2>
                                                    <p style="margin: 0 0 5px 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">
                                                        Heston Automotive Ltd
                                                    </p>
                                                    <p style="margin: 0 0 5px 0; color: #666666; font-size: 14px;">
                                                        Unit 1 Vinyl Pl, Dawley Rd<br>Hayes, UB3 1DA
                                                    </p>
                                                    <p style="margin: 15px 0 0 0; color: #666666; font-size: 14px;">
                                                        <a href="tel:02085648030" style="color: #666666; text-decoration: none; font-weight: bold;">020 8564 8030</a>
                                                    </p>
                                                </div>

                                                <p style="margin: 0; color: #4a4a4a; font-size: 15px; line-height: 1.6; text-align: center;">
                                                    If you need to reschedule or have any questions prior to your visit, please do not hesitate to contact us.
                                                </p>
                                            </td>
                                        </tr>
                                        
                                        <!-- Footer -->
                                        <tr>
                                            <td style="background-color: #1a1654; padding: 25px 40px; text-align: center;">
                                                <p style="margin: 0; color: #e6f3ff; font-size: 12px; line-height: 1.6; opacity: 0.9;">
                                                    Booking Reference: ${booking._id}<br>
                                                    © ${new Date().getFullYear()} Heston Automotive. All rights reserved.
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>
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
