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
                                        
                                        <!-- Vehicle Banner -->
                                        <tr>
                                            <td style="background: linear-gradient(135deg, #1a1654 0%, #2a2664 100%); padding: 25px 40px; text-align: center;">
                                                <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: bold; letter-spacing: 0.5px;">
                                                    ${vehicleDetails?.make || ''} ${vehicleDetails?.model || ''}
                                                </h1>
                                                <p style="margin: 8px 0 0 0; color: #e6f3ff; font-size: 15px;">
                                                    Your Personalized Video Presentation
                                                </p>
                                            </td>
                                        </tr>

                                        <!-- Main Content -->
                                        <tr>
                                            <td style="padding: 40px;">
                                                <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                                                    Dear <strong style="color: #1a1654;">${greetingName}</strong>,
                                                </p>
                                                
                                                <p style="margin: 0 0 30px 0; color: #555555; font-size: 15px; line-height: 1.7;">
                                                    Thank you for your enquiry regarding the <strong style="color: #1a1654;">${vehicleDetails?.make} ${vehicleDetails?.model}</strong>. We're delighted to share a personalized video presentation showcasing this exceptional vehicle.
                                                </p>
                                                
                                                <!-- CTA Button -->
                                                <div style="text-align: center; margin: 35px 0;">
                                                    <a href="${videoLink}" style="display: inline-block; background-color: #1a1654; color: #ffffff; text-decoration: none; padding: 18px 45px; border-radius: 50px; font-size: 16px; font-weight: bold; letter-spacing: 0.8px; box-shadow: 0 4px 15px rgba(26, 22, 84, 0.3); transition: all 0.3s ease;">
                                                        ▶ WATCH VIDEO PRESENTATION
                                                    </a>
                                                </div>
                                                
                                                <p style="margin: 30px 0 0 0; color: #555555; font-size: 15px; line-height: 1.7; text-align: center;">
                                                    We would be delighted to arrange a test drive or answer any questions you may have about this vehicle.
                                                </p>
                                            </td>
                                        </tr>
                                        
                                        <!-- Contact Section -->
                                        <tr>
                                            <td style="background-color: #e6f3ff; padding: 35px 40px; border-top: 3px solid #1a1654;">
                                                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                                    <tr>
                                                        <td style="text-align: center; padding-bottom: 20px;">
                                                            <h2 style="margin: 0 0 8px 0; color: #1a1654; font-size: 20px; font-weight: bold;">
                                                                Heston Automotive
                                                            </h2>
                                                            <p style="margin: 0; color: #666666; font-size: 13px; letter-spacing: 0.5px;">
                                                                Premium Vehicle Specialists
                                                            </p>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td>
                                                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                                                <tr>
                                                                    <td style="padding: 10px 0; text-align: center;">
                                                                        <span style="color: #1a1654; font-size: 18px; margin-right: 8px;">📞</span>
                                                                        <a href="tel:02085648030" style="color: #1a1654; text-decoration: none; font-size: 15px; font-weight: 600;">
                                                                            020 8564 8030
                                                                        </a>
                                                                    </td>
                                                                </tr>
                                                                <tr>
                                                                    <td style="padding: 10px 0; text-align: center;">
                                                                        <span style="color: #1a1654; font-size: 18px; margin-right: 8px;">✉️</span>
                                                                        <a href="mailto:enquiries@hestonautomotive.com" style="color: #1a1654; text-decoration: none; font-size: 15px; font-weight: 600;">
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
                                            <td style="background-color: #1a1654; padding: 25px 40px; text-align: center;">
                                                <p style="margin: 0; color: #e6f3ff; font-size: 12px; line-height: 1.6; opacity: 0.9;">
                                                    © ${new Date().getFullYear()} Heston Automotive. All rights reserved.
                                                </p>
                                                <p style="margin: 10px 0 0 0; color: #a0b4ff; font-size: 11px; opacity: 0.8;">
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
