import express from 'express';
import { Resend } from 'resend';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Send video link via email
// @route   POST /api/send-link
// @access  Private/Admin
router.post('/', protect, async (req, res) => {
    try {
        const { videoLink, email, vehicleDetails, customerName, customerTitle } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Please provide an email address' });
        }

        const results = {
            email: null
        };

        // Initialize Resend client
        const resend = new Resend(process.env.RESEND_API_KEY);

        // Ensure customer name is properly formatted
        const greetingName = customerName
            ? `${customerTitle ? customerTitle + ' ' : ''}${customerName}`
            : 'Customer';

        // Send Email
        try {
            const { data, error } = await resend.emails.send({
                from: process.env.EMAIL_FROM || 'Heston Automotive <no-reply@hestonautomotive.com>',
                to: [email],
                subject: `${vehicleDetails?.make} ${vehicleDetails?.model} - Video Presentation`,
                html: `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Video Presentation - ${vehicleDetails?.make} ${vehicleDetails?.model}</title>
                    </head>
                    <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
                            <tr>
                                <td align="center" style="padding: 40px 20px;">
                                    <!-- Main Container -->
                                    <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden;">
                                        
                                        <!-- Header Section -->
                                        <tr>
                                            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 40px 30px; text-align: center;">
                                                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: 0.5px;">
                                                    HESTON AUTOMOTIVE
                                                </h1>
                                                <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 14px; font-weight: 500; letter-spacing: 1px; text-transform: uppercase;">
                                                    Premium Vehicle Specialists
                                                </p>
                                            </td>
                                        </tr>
                                        
                                        <!-- Vehicle Banner -->
                                        <tr>
                                            <td style="background-color: #3b82f6; padding: 20px 30px; text-align: center;">
                                                <h2 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                                                    ${vehicleDetails?.make || ''} ${vehicleDetails?.model || ''}
                                                </h2>
                                                <p style="margin: 5px 0 0 0; color: #e0e7ff; font-size: 16px; font-weight: 500;">
                                                    Video Presentation
                                                </p>
                                            </td>
                                        </tr>
                                        
                                        <!-- Main Content -->
                                        <tr>
                                            <td style="padding: 40px 30px;">
                                                <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                                                    Dear <strong>${greetingName}</strong>,
                                                </p>
                                                
                                                <p style="margin: 0 0 25px 0; color: #555555; font-size: 15px; line-height: 1.7;">
                                                    Thank you for your enquiry regarding the <strong>${vehicleDetails?.make} ${vehicleDetails?.model}</strong>. We're delighted to share a personalized video presentation showcasing this exceptional vehicle.
                                                </p>
                                                
                                                <!-- CTA Button -->
                                                <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                                                    <tr>
                                                        <td align="center">
                                                            <a href="${videoLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: 700; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); transition: all 0.3s ease;">
                                                                ▶ WATCH VIDEO PRESENTATION
                                                            </a>
                                                        </td>
                                                    </tr>
                                                </table>
                                                
                                                <p style="margin: 25px 0 30px 0; color: #555555; font-size: 15px; line-height: 1.7;">
                                                    We would be delighted to arrange a test drive or answer any questions you may have about this vehicle. Please don't hesitate to contact us at your convenience.
                                                </p>
                                                
                                                <!-- Divider -->
                                                <div style="border-top: 2px solid #e0e0e0; margin: 30px 0;"></div>
                                                
                                                <p style="margin: 0 0 5px 0; color: #333333; font-size: 15px;">
                                                    Warm regards,
                                                </p>
                                                <p style="margin: 0; color: #1e3a8a; font-size: 17px; font-weight: 700;">
                                                    The Heston Automotive Team
                                                </p>
                                            </td>
                                        </tr>
                                        
                                        <!-- Contact Information Section -->
                                        <tr>
                                            <td style="background-color: #eff6ff; padding: 30px; border-top: 3px solid #3b82f6;">
                                                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                                    <tr>
                                                        <td style="padding-bottom: 15px;">
                                                            <p style="margin: 0 0 5px 0; color: #1e3a8a; font-size: 18px; font-weight: 700;">
                                                                Heston Automotive
                                                            </p>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td>
                                                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                                                <tr>
                                                                    <td style="padding: 8px 0;">
                                                                        <span style="color: #3b82f6; font-size: 16px; margin-right: 10px;">📞</span>
                                                                        <a href="tel:02085648030" style="color: #1e3a8a; text-decoration: none; font-size: 15px; font-weight: 500;">
                                                                            020 8564 8030
                                                                        </a>
                                                                    </td>
                                                                </tr>
                                                                <tr>
                                                                    <td style="padding: 8px 0;">
                                                                        <span style="color: #3b82f6; font-size: 16px; margin-right: 10px;">✉️</span>
                                                                        <a href="mailto:enquiries@hestonautomotive.com" style="color: #1e3a8a; text-decoration: none; font-size: 15px; font-weight: 500;">
                                                                            enquiries@hestonautomotive.com
                                                                        </a>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                        
                                        <!-- Footer -->
                                        <tr>
                                            <td style="background-color: #1e3a8a; padding: 20px 30px; text-align: center;">
                                                <p style="margin: 0; color: #93c5fd; font-size: 12px; line-height: 1.5;">
                                                    © ${new Date().getFullYear()} Heston Automotive. All rights reserved.
                                                </p>
                                                <p style="margin: 10px 0 0 0; color: #60a5fa; font-size: 11px;">
                                                    This email was sent regarding your enquiry about ${vehicleDetails?.make} ${vehicleDetails?.model}
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

            if (error) {
                console.error('Resend error:', error);
                results.email = 'failed';
            } else {
                console.log('Email sent successfully:', data);
                results.email = 'sent';
            }
        } catch (error) {
            console.error('Email send error:', error);
            results.email = 'failed';
        }

        res.json({ message: 'Email send request processed', results });

    } catch (error) {
        console.error('Send link error:', error);
        res.status(500).json({ message: 'Failed to process send request' });
    }
});

export default router;
