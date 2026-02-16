import express from 'express';
import { Resend } from 'resend';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Helper function to capitalize first letter of each word
const capitalizeWords = (str) => {
    if (!str) return str;
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

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

        // Ensure customer name is properly formatted with capitalization
        const formattedName = capitalizeWords(customerName);
        const greetingName = formattedName
            ? `${customerTitle ? customerTitle + ' ' : ''}${formattedName}`
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
                    <body style="margin: 0; padding: 0; background-color: #f8f8f8; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased;">
                        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8f8f8;">
                            <tr>
                                <td align="center" style="padding: 40px 0;">
                                    <!-- Main Container -->
                                    <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e5e5;">
                                        
                                        <!-- Header with Logo -->
                                        <tr>
                                            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #f0f0f0;">
                                                <img src="${process.env.FRONTEND_URL}/business-logo.png" alt="Heston Automotive" style="max-width: 200px; height: auto; display: block; margin: 0 auto;">
                                            </td>
                                        </tr>

                                        <!-- Main Content -->
                                        <tr>
                                            <td style="padding: 40px;">
                                                <h1 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px; font-weight: normal; text-align: center; letter-spacing: -0.5px;">
                                                    Your Personalized Video Presentation
                                                </h1>
                                                
                                                <p style="margin: 0 0 25px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6; text-align: left;">
                                                    Dear ${greetingName},
                                                </p>
                                                
                                                <p style="margin: 0 0 30px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6; text-align: left;">
                                                    Thank you for your interest in the <strong>${vehicleDetails?.make} ${vehicleDetails?.model}</strong>. We have prepared a detailed video presentation specifically for you to showcase the tailored features and condition of this vehicle.
                                                </p>
                                                
                                                <!-- CTA Button -->
                                                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                                    <tr>
                                                        <td align="center" style="padding: 10px 0 40px 0;">
                                                            <a href="${videoLink}" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 16px 32px; font-size: 16px; font-weight: bold; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px;">
                                                                Watch Video Presentation
                                                            </a>
                                                        </td>
                                                    </tr>
                                                </table>
                                                
                                                <p style="margin: 0 0 30px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6; text-align: left;">
                                                    If you would like to arrange a viewing or have any further questions, please do not hesitate to contact our team.
                                                </p>
                                                
                                                <div style="border-top: 1px solid #f0f0f0; margin: 30px 0;"></div>
                                                
                                                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                                    <tr>
                                                        <td style="vertical-align: top;">
                                                            <p style="margin: 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">
                                                                Heston Automotive
                                                            </p>
                                                            <p style="margin: 5px 0 0 0; color: #666666; font-size: 14px;">
                                                                Premium Vehicle Specialists
                                                            </p>
                                                        </td>
                                                        <td style="vertical-align: top; text-align: right;">
                                                            <p style="margin: 0; color: #4a4a4a; font-size: 14px;">
                                                                <a href="tel:02085648030" style="color: #4a4a4a; text-decoration: none;">020 8564 8030</a>
                                                            </p>
                                                            <p style="margin: 5px 0 0 0; color: #4a4a4a; font-size: 14px;">
                                                                <a href="mailto:enquiries@hestonautomotive.com" style="color: #4a4a4a; text-decoration: none;">enquiries@hestonautomotive.com</a>
                                                            </p>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                        
                                        <!-- Footer -->
                                        <tr>
                                            <td style="background-color: #f8f8f8; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e5e5;">
                                                <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.5;">
                                                    &copy; ${new Date().getFullYear()} Heston Automotive. All rights reserved.<br>
                                                    You are receiving this email because you enquired about a vehicle.
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
