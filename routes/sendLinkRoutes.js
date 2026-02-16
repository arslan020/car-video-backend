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
                    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, Helvetica, sans-serif;">
                        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
                            <tr>
                                <td align="center" style="padding: 40px 20px;">
                                    <!-- Main Container -->
                                    <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                                        
                                        <!-- Header with Logo -->
                                        <tr>
                                            <td style="padding: 30px 40px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #e0e0e0;">
                                                <img src="${process.env.FRONTEND_URL}/business-logo.png" alt="Heston Automotive" style="max-width: 180px; height: auto;">
                                            </td>
                                        </tr>

                                        <!-- Main Content -->
                                        <tr>
                                            <td style="padding: 40px;">
                                                <h1 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 28px; font-weight: 700;">
                                                    Your Personalized Video Presentation
                                                </h1>
                                                
                                                <p style="margin: 0 0 15px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                                                    Dear ${greetingName},
                                                </p>
                                                
                                                <!-- CTA Box with Text -->
                                                <div style="background-color: #f8f8f8; padding: 30px; border-radius: 6px; margin-bottom: 30px; text-align: center;">
                                                    <p style="margin: 0 0 25px 0; color: #555555; font-size: 16px; line-height: 1.6;">
                                                        Thank you for your interest in the <strong style="color: #1a1a1a;">${vehicleDetails?.make} ${vehicleDetails?.model}</strong>. We have prepared a detailed video presentation specifically for you to showcase the features and condition of this vehicle.
                                                    </p>
                                                    <a href="${videoLink}" style="display: inline-block; background-color: #28a745; color: #ffffff; text-decoration: none; padding: 16px 48px; font-size: 16px; font-weight: 600; border-radius: 50px;">
                                                        Watch Video Presentation
                                                    </a>
                                                </div>
                                                
                                                <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6; text-align: center;">
                                                    If you have any questions, please contact us at 
                                                    <a href="tel:02085648030" style="color: #5b9bd5; text-decoration: none; font-weight: 600;">020 8564 8030</a> or 
                                                    <a href="mailto:enquiries@hestonautomotive.com" style="color: #5b9bd5; text-decoration: none; font-weight: 600;">enquiries@hestonautomotive.com</a>
                                                </p>
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
