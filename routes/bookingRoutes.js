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

        if (!videoId || !customerName || !customerEmail || !customerPhone || !visitDate || !visitTime) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const video = await Video.findById(videoId);
        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }

        const booking = await Booking.create({
            videoId, customerName, customerEmail, customerPhone,
            visitDate, visitTime,
            registration: video.registration,
            make: video.make,
            model: video.model,
            notes
        });

        const resend = new Resend(process.env.RESEND_API_KEY);

        const formattedDate = new Date(visitDate).toLocaleDateString('en-GB', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        try {
            // ─────────────────────────────────────────
            // EMAIL 1 — Admin Notification (to Rashid)
            // ─────────────────────────────────────────
            await resend.emails.send({
                from: process.env.EMAIL_FROM || 'Heston Automotive <no-reply@hestonautomotive.com>',
                to: ['rashid@hestonautomotive.com'],
                subject: `📅 New Booking: ${video.make} ${video.model} — ${formattedDate}`,
                html: `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>New Showroom Visit Booking</title>
                    </head>
                    <body style="margin:0;padding:0;background-color:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5;">
                            <tr>
                                <td align="center" style="padding:48px 20px;">
                                    <table role="presentation" width="100%" style="max-width:580px;border-collapse:collapse;">

                                        <!-- Top bar -->
                                        <tr>
                                            <td style="height:4px;background-color:#5b9bd5;border-radius:4px 4px 0 0;"></td>
                                        </tr>

                                        <!-- Header -->
                                        <tr>
                                            <td style="background-color:#ffffff;padding:32px 44px 24px;text-align:center;border-left:1px solid #e8e8e8;border-right:1px solid #e8e8e8;">
                                                <img src="${process.env.FRONTEND_URL}/business-logo.png" alt="Heston Automotive" style="max-width:180px;height:auto;display:block;margin:0 auto 20px;">
                                                <div style="height:1px;background-color:#e8e8e8;"></div>
                                            </td>
                                        </tr>

                                        <!-- Title -->
                                        <tr>
                                            <td style="background-color:#ffffff;padding:28px 44px 0;border-left:1px solid #e8e8e8;border-right:1px solid #e8e8e8;">
                                                <div style="display:inline-block;background-color:#eef4fb;border:1px solid #c5daf0;border-radius:20px;padding:5px 14px;margin-bottom:14px;">
                                                    <span style="color:#5b9bd5;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">Incoming Booking</span>
                                                </div>
                                                <h1 style="margin:0 0 6px;color:#1a1a1a;font-size:26px;font-weight:700;line-height:1.2;">
                                                    📅 New Showroom Visit
                                                </h1>
                                                <p style="margin:0 0 24px;color:#888888;font-size:13px;">
                                                    A customer has booked a showroom visit
                                                </p>
                                            </td>
                                        </tr>

                                        <!-- Content -->
                                        <tr>
                                            <td style="background-color:#ffffff;padding:0 44px 36px;border-left:1px solid #e8e8e8;border-right:1px solid #e8e8e8;">

                                                <!-- Visit Date/Time Card -->
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                                                    <tr>
                                                        <td style="background-color:#f8f9fa;border:1px solid #ebebeb;border-left:3px solid #5b9bd5;border-radius:10px;padding:22px 26px;">
                                                            <p style="margin:0 0 14px;color:#aaaaaa;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Visit Details</p>
                                                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                                                <tr>
                                                                    <td width="36" valign="middle" style="padding-right:12px;">
                                                                        <div style="width:36px;height:36px;background-color:#eef4fb;border-radius:50%;text-align:center;line-height:36px;font-size:16px;">📅</div>
                                                                    </td>
                                                                    <td>
                                                                        <p style="margin:0 0 2px;color:#aaaaaa;font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Date</p>
                                                                        <p style="margin:0;color:#1a1a1a;font-size:15px;font-weight:600;">${formattedDate}</p>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            <div style="height:1px;background-color:#e8e8e8;margin:12px 0;"></div>
                                                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                                                <tr>
                                                                    <td width="36" valign="middle" style="padding-right:12px;">
                                                                        <div style="width:36px;height:36px;background-color:#eef4fb;border-radius:50%;text-align:center;line-height:36px;font-size:16px;">🕐</div>
                                                                    </td>
                                                                    <td>
                                                                        <p style="margin:0 0 2px;color:#aaaaaa;font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Time</p>
                                                                        <p style="margin:0;color:#1a1a1a;font-size:15px;font-weight:600;">${visitTime}</p>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </table>

                                                <!-- Customer Card -->
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                                                    <tr>
                                                        <td style="background-color:#f8f9fa;border:1px solid #ebebeb;border-radius:10px;padding:22px 26px;">
                                                            <p style="margin:0 0 14px;color:#aaaaaa;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Customer Details</p>

                                                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                                                                <tr>
                                                                    <td width="36" valign="middle" style="padding-right:12px;">
                                                                        <div style="width:36px;height:36px;background-color:#eef4fb;border-radius:50%;text-align:center;line-height:36px;font-size:15px;">👤</div>
                                                                    </td>
                                                                    <td>
                                                                        <p style="margin:0 0 2px;color:#aaaaaa;font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Name</p>
                                                                        <p style="margin:0;color:#1a1a1a;font-size:15px;font-weight:600;">${customerName}</p>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            <div style="height:1px;background-color:#e8e8e8;margin-bottom:12px;"></div>
                                                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                                                                <tr>
                                                                    <td width="36" valign="middle" style="padding-right:12px;">
                                                                        <div style="width:36px;height:36px;background-color:#eef4fb;border-radius:50%;text-align:center;line-height:36px;font-size:15px;">✉️</div>
                                                                    </td>
                                                                    <td>
                                                                        <p style="margin:0 0 2px;color:#aaaaaa;font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Email</p>
                                                                        <a href="mailto:${customerEmail}" style="color:#5b9bd5;font-size:14px;font-weight:600;text-decoration:none;">${customerEmail}</a>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            <div style="height:1px;background-color:#e8e8e8;margin-bottom:12px;"></div>
                                                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                                                <tr>
                                                                    <td width="36" valign="middle" style="padding-right:12px;">
                                                                        <div style="width:36px;height:36px;background-color:#eef4fb;border-radius:50%;text-align:center;line-height:36px;font-size:15px;">📞</div>
                                                                    </td>
                                                                    <td>
                                                                        <p style="margin:0 0 2px;color:#aaaaaa;font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Phone</p>
                                                                        <a href="tel:${customerPhone}" style="color:#5b9bd5;font-size:17px;font-weight:700;text-decoration:none;">${customerPhone}</a>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </table>

                                                <!-- Vehicle Card -->
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:${notes ? '16px' : '24px'};">
                                                    <tr>
                                                        <td style="background-color:#f8f9fa;border:1px solid #ebebeb;border-left:3px solid #5b9bd5;border-radius:10px;padding:22px 26px;">
                                                            <p style="margin:0 0 10px;color:#aaaaaa;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Vehicle of Interest</p>
                                                            <p style="margin:0 0 8px;color:#1a1a1a;font-size:22px;font-weight:700;">${video.make || 'N/A'} ${video.model || 'N/A'}</p>
                                                            <span style="display:inline-block;background-color:#ffffff;border:1px solid #ddd;border-radius:4px;padding:4px 12px;color:#555555;font-size:12px;font-weight:600;letter-spacing:1.5px;font-family:monospace;">
                                                                ${video.registration || 'N/A'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                </table>

                                                ${notes ? `
                                                <!-- Notes Card -->
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                                                    <tr>
                                                        <td style="background-color:#fff8e1;border:1px solid #ffe082;border-left:3px solid #ffa726;border-radius:10px;padding:20px 26px;">
                                                            <p style="margin:0 0 10px;color:#e65100;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Additional Notes</p>
                                                            <p style="margin:0;color:#5d4037;font-size:14px;line-height:1.6;">${notes}</p>
                                                        </td>
                                                    </tr>
                                                </table>
                                                ` : ''}

                                                <!-- Alert -->
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                                    <tr>
                                                        <td style="background-color:#eef4fb;border:1px solid #c5daf0;border-radius:8px;padding:14px 20px;text-align:center;">
                                                            <p style="margin:0;color:#5b9bd5;font-size:13px;font-weight:600;">
                                                                ⚡ Please prepare for this visit and confirm with the customer
                                                            </p>
                                                        </td>
                                                    </tr>
                                                </table>

                                            </td>
                                        </tr>

                                        <!-- Footer -->
                                        <tr>
                                            <td style="background-color:#f8f9fa;padding:20px 44px;text-align:center;border:1px solid #e8e8e8;border-radius:0 0 8px 8px;">
                                                <p style="margin:0;color:#bbbbbb;font-size:11px;">
                                                    Booking ID: ${booking._id} &nbsp;·&nbsp; © ${new Date().getFullYear()} Heston Automotive &nbsp;·&nbsp; Automated Notification
                                                </p>
                                            </td>
                                        </tr>

                                        <!-- Bottom bar -->
                                        <tr>
                                            <td style="height:3px;background-color:#5b9bd5;border-radius:0 0 4px 4px;"></td>
                                        </tr>

                                    </table>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>
                `
            });

            // ─────────────────────────────────────────────────
            // EMAIL 2 — Confirmation Email (to Customer)
            // ─────────────────────────────────────────────────
            await resend.emails.send({
                from: process.env.EMAIL_FROM || 'Heston Automotive <no-reply@hestonautomotive.com>',
                to: [customerEmail],
                subject: `✅ Booking Confirmed – ${video.make} ${video.model} on ${formattedDate}`,
                html: `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Booking Confirmed – Heston Automotive</title>
                    </head>
                    <body style="margin:0;padding:0;background-color:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5;">
                            <tr>
                                <td align="center" style="padding:48px 20px;">
                                    <table role="presentation" width="100%" style="max-width:580px;border-collapse:collapse;">

                                        <!-- Top bar -->
                                        <tr>
                                            <td style="height:4px;background-color:#5b9bd5;border-radius:4px 4px 0 0;"></td>
                                        </tr>

                                        <!-- Header -->
                                        <tr>
                                            <td style="background-color:#ffffff;padding:32px 44px 24px;text-align:center;border-left:1px solid #e8e8e8;border-right:1px solid #e8e8e8;">
                                                <img src="${process.env.FRONTEND_URL}/business-logo.png" alt="Heston Automotive" style="max-width:180px;height:auto;display:block;margin:0 auto 20px;">
                                                <div style="height:1px;background-color:#e8e8e8;"></div>
                                            </td>
                                        </tr>

                                        <!-- Title -->
                                        <tr>
                                            <td style="background-color:#ffffff;padding:28px 44px 0;border-left:1px solid #e8e8e8;border-right:1px solid #e8e8e8;">
                                                <div style="display:inline-block;background-color:#e8f5e9;border:1px solid #a5d6a7;border-radius:20px;padding:5px 14px;margin-bottom:14px;">
                                                    <span style="color:#2e7d32;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">Booking Confirmed</span>
                                                </div>
                                                <h1 style="margin:0 0 8px;color:#1a1a1a;font-size:26px;font-weight:700;line-height:1.2;">
                                                    ✅ You're All Set!
                                                </h1>
                                                <p style="margin:0 0 24px;color:#555555;font-size:15px;line-height:1.6;">
                                                    We look forward to seeing you, <strong>${customerName}</strong>. Here's a summary of your upcoming visit.
                                                </p>
                                            </td>
                                        </tr>

                                        <!-- Content -->
                                        <tr>
                                            <td style="background-color:#ffffff;padding:0 44px 36px;border-left:1px solid #e8e8e8;border-right:1px solid #e8e8e8;">

                                                <!-- Visit Summary Card -->
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                                                    <tr>
                                                        <td style="background-color:#f8f9fa;border:1px solid #ebebeb;border-left:3px solid #5b9bd5;border-radius:10px;padding:22px 26px;">
                                                            <p style="margin:0 0 14px;color:#aaaaaa;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Your Visit</p>

                                                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                                                                <tr>
                                                                    <td width="36" valign="middle" style="padding-right:12px;">
                                                                        <div style="width:36px;height:36px;background-color:#eef4fb;border-radius:50%;text-align:center;line-height:36px;font-size:16px;">📅</div>
                                                                    </td>
                                                                    <td>
                                                                        <p style="margin:0 0 2px;color:#aaaaaa;font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Date</p>
                                                                        <p style="margin:0;color:#1a1a1a;font-size:15px;font-weight:600;">${formattedDate}</p>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            <div style="height:1px;background-color:#e8e8e8;margin-bottom:12px;"></div>
                                                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                                                                <tr>
                                                                    <td width="36" valign="middle" style="padding-right:12px;">
                                                                        <div style="width:36px;height:36px;background-color:#eef4fb;border-radius:50%;text-align:center;line-height:36px;font-size:16px;">🕐</div>
                                                                    </td>
                                                                    <td>
                                                                        <p style="margin:0 0 2px;color:#aaaaaa;font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Time</p>
                                                                        <p style="margin:0;color:#1a1a1a;font-size:15px;font-weight:600;">${visitTime}</p>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            <div style="height:1px;background-color:#e8e8e8;margin-bottom:12px;"></div>
                                                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                                                <tr>
                                                                    <td width="36" valign="middle" style="padding-right:12px;">
                                                                        <div style="width:36px;height:36px;background-color:#eef4fb;border-radius:50%;text-align:center;line-height:36px;font-size:16px;">🚗</div>
                                                                    </td>
                                                                    <td>
                                                                        <p style="margin:0 0 2px;color:#aaaaaa;font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Vehicle</p>
                                                                        <p style="margin:0;color:#1a1a1a;font-size:15px;font-weight:600;">${video.make || ''} ${video.model || ''}</p>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </table>

                                                <!-- Location Card -->
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                                                    <tr>
                                                        <td style="background-color:#f8f9fa;border:1px solid #ebebeb;border-radius:10px;padding:22px 26px;">
                                                            <p style="margin:0 0 14px;color:#aaaaaa;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Location</p>
                                                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                                                <tr>
                                                                    <td width="36" valign="top" style="padding-right:12px;padding-top:2px;">
                                                                        <div style="width:36px;height:36px;background-color:#eef4fb;border-radius:50%;text-align:center;line-height:36px;font-size:15px;">📍</div>
                                                                    </td>
                                                                    <td>
                                                                        <p style="margin:0 0 4px;color:#1a1a1a;font-size:15px;font-weight:700;">Heston Automotive Ltd</p>
                                                                        <p style="margin:0 0 10px;color:#666666;font-size:14px;line-height:1.6;">Unit 1 Vinyl Pl, Dawley Rd<br>Hayes, UB3 1DA</p>
                                                                        <a href="tel:02085648030" style="color:#5b9bd5;font-size:14px;font-weight:600;text-decoration:none;">📞 020 8564 8030</a>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </table>

                                                <!-- Help Notice -->
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                                    <tr>
                                                        <td style="background-color:#eef4fb;border:1px solid #c5daf0;border-radius:8px;padding:16px 22px;text-align:center;">
                                                            <p style="margin:0 0 6px;color:#555555;font-size:13px;">Need to reschedule or have a question?</p>
                                                            <p style="margin:0;font-size:13px;">
                                                                <a href="tel:02085648030" style="color:#5b9bd5;text-decoration:none;font-weight:600;">020 8564 8030</a>
                                                                <span style="color:#aaaaaa;margin:0 8px;">·</span>
                                                                <a href="mailto:enquiries@hestonautomotive.com" style="color:#5b9bd5;text-decoration:none;font-weight:600;">enquiries@hestonautomotive.com</a>
                                                            </p>
                                                        </td>
                                                    </tr>
                                                </table>

                                            </td>
                                        </tr>

                                        <!-- Footer -->
                                        <tr>
                                            <td style="background-color:#1a1654;padding:24px 44px;text-align:center;border-radius:0 0 8px 8px;">
                                                <p style="margin:0 0 6px;color:#e6f3ff;font-size:12px;opacity:0.9;">
                                                    © ${new Date().getFullYear()} Heston Automotive. All rights reserved.
                                                </p>
                                                <p style="margin:0;color:#a0b4ff;font-size:11px;opacity:0.8;">
                                                    Booking Reference: ${booking._id}
                                                </p>
                                            </td>
                                        </tr>

                                        <!-- Bottom bar -->
                                        <tr>
                                            <td style="height:3px;background-color:#5b9bd5;border-radius:0 0 4px 4px;"></td>
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