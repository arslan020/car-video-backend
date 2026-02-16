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
                                        <h1 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 24px; font-weight: normal; text-align: center; letter-spacing: -0.5px;">
                                            New Call Request
                                        </h1>
                                        
                                        <p style="margin: 0 0 30px 0; color: #666666; font-size: 14px; text-align: center; text-transform: uppercase; letter-spacing: 1px;">
                                            Action Required
                                        </p>
                                        
                                        <!-- Customer Information -->
                                        <div style="background-color: #f8f8f8; padding: 25px; border-left: 4px solid #003366; margin-bottom: 30px;">
                                            <h2 style="margin: 0 0 20px 0; color: #003366; font-size: 16px; font-weight: bold; text-transform: uppercase;">
                                                Customer Details
                                            </h2>
                                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                                <tr>
                                                    <td style="padding-bottom: 10px; width: 40%; color: #666666; font-size: 14px;">Name:</td>
                                                    <td style="padding-bottom: 10px; color: #1a1a1a; font-size: 16px; font-weight: bold;">${formattedName}</td>
                                                </tr>
                                                <tr>
                                                    <td style="width: 40%; color: #666666; font-size: 14px;">Phone:</td>
                                                    <td style="color: #1a1a1a; font-size: 16px; font-weight: bold;">
                                                        <a href="tel:${phone}" style="color: #1a1a1a; text-decoration: none;">${phone}</a>
                                                    </td>
                                                </tr>
                                            </table>
                                        </div>
                                        
                                        <!-- Vehicle Information -->
                                        <div style="background-color: #ffffff; border: 1px solid #e5e5e5; padding: 25px; margin-bottom: 30px;">
                                            <h2 style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; font-weight: bold; text-transform: uppercase;">
                                                Vehicle Interest
                                            </h2>
                                            <p style="margin: 0; color: #1a1a1a; font-size: 18px; font-weight: bold;">
                                                ${vehicleDetails?.make} ${vehicleDetails?.model}
                                            </p>
                                            <p style="margin: 5px 0 0 0; color: #666666; font-size: 14px;">
                                                Registration: ${vehicleDetails?.registration || 'N/A'}
                                            </p>
                                            ${videoLink ? `
                                            <p style="margin: 15px 0 0 0;">
                                                <a href="${videoLink}" style="color: #003366; font-weight: bold; text-decoration: none; font-size: 14px;">
                                                    View Video Presentation &rarr;
                                                </a>
                                            </p>
                                            ` : ''}
                                        </div>
                                        
                                        <p style="margin: 0; color: #666666; font-size: 14px; font-style: italic; text-align: center;">
                                            Please contact this customer as soon as possible.
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #f8f8f8; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e5e5;">
                                        <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.5;">
                                            &copy; ${new Date().getFullYear()} Heston Automotive Admin System.<br>
                                            Automated Notification.
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
