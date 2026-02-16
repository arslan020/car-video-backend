import express from 'express';
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// Helper function to capitalize first letter of each word
const capitalizeWords = (str) => {
    if (!str) return str;
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

// @desc    Request a Call Back
// @route   POST /api/contact/request-call
// @access  Public
router.post('/request-call', async (req, res) => {
    const { name, phone, vehicleDetails, videoLink } = req.body;

    if (!name || !phone) {
        return res.status(400).json({ message: 'Name and Phone Number are required' });
    }

    // Capitalize customer name properly
    const formattedName = capitalizeWords(name);

    try {
        const emailContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Call Request - ${vehicleDetails?.make} ${vehicleDetails?.model}</title>
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
                                            📞 New Call Request
                                        </h1>
                                        
                                        <!-- Customer Info Box -->
                                        <div style="background-color: #f8f8f8; padding: 25px; border-radius: 6px; margin-bottom: 20px;">
                                            <h3 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 16px; font-weight: 600;">
                                                Customer Details
                                            </h3>
                                            <p style="margin: 0 0 10px 0; color: #333333; font-size: 15px;">
                                                <strong>Name:</strong> ${formattedName}
                                            </p>
                                            <p style="margin: 0; color: #333333; font-size: 15px;">
                                                <strong>Phone:</strong> <a href="tel:${phone}" style="color: #5b9bd5; text-decoration: none; font-weight: 600;">${phone}</a>
                                            </p>
                                        </div>
                                        
                                        <!-- Vehicle Info Box -->
                                        <div style="background-color: #f8f8f8; padding: 25px; border-radius: 6px; margin-bottom: 25px;">
                                            <h3 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 16px; font-weight: 600;">
                                                Vehicle Interest
                                            </h3>
                                            <p style="margin: 0 0 8px 0; color: #1a1a1a; font-size: 18px; font-weight: 700;">
                                                ${vehicleDetails?.make} ${vehicleDetails?.model}
                                            </p>
                                            <p style="margin: 0; color: #666666; font-size: 14px;">
                                                Registration: ${vehicleDetails?.registration || 'N/A'}
                                            </p>
                                            ${videoLink ? `
                                            <p style="margin: 15px 0 0 0;">
                                                <a href="${videoLink}" style="color: #5b9bd5; font-weight: 600; text-decoration: none; font-size: 14px;">
                                                    View Video Presentation →
                                                </a>
                                            </p>
                                            ` : ''}
                                        </div>
                                        
                                        <p style="margin: 0; color: #666666; font-size: 14px; text-align: center; font-style: italic;">
                                            Please contact this customer as soon as possible.
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #f8f8f8; padding: 20px 40px; text-align: center; border-top: 1px solid #e0e0e0;">
                                        <p style="margin: 0; color: #999999; font-size: 12px;">
                                            © ${new Date().getFullYear()} Heston Automotive. Automated Notification.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;

        await resend.emails.send({
            from: 'Heston Automotive <notifications@hestonautomotive.com>',
            to: ['rashid@hestonautomotive.com'],
            subject: `Call Request: ${vehicleDetails?.make} ${vehicleDetails?.model}`,
            html: emailContent
        });

        res.status(200).json({ message: 'Call request sent successfully' });
    } catch (error) {
        console.error('Error sending call request email:', error);
        res.status(500).json({ message: 'Failed to send call request' });
    }
});

export default router;
