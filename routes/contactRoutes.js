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
                                            New Call Request
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- Alert Banner -->
                                <tr>
                                    <td style="background-color: #3b82f6; padding: 20px 30px; text-align: center;">
                                        <h2 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">
                                            📞 Customer Callback Request
                                        </h2>
                                    </td>
                                </tr>
                                
                                <!-- Main Content -->
                                <tr>
                                    <td style="padding: 40px 30px;">
                                        <p style="margin: 0 0 25px 0; color: #1e3a8a; font-size: 16px; font-weight: 600; line-height: 1.6;">
                                            A customer has requested a callback regarding a vehicle.
                                        </p>
                                        
                                        <!-- Customer Information Card -->
                                        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin-bottom: 25px; border-radius: 4px;">
                                            <h3 style="margin: 0 0 15px 0; color: #1e3a8a; font-size: 18px; font-weight: 700;">
                                                Customer Information
                                            </h3>
                                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                                <tr>
                                                    <td style="padding: 8px 0;">
                                                        <span style="color: #64748b; font-size: 14px; font-weight: 500;">Name:</span>
                                                        <br>
                                                        <span style="color: #1e293b; font-size: 16px; font-weight: 600;">${formattedName}</span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0;">
                                                        <span style="color: #64748b; font-size: 14px; font-weight: 500;">Phone Number:</span>
                                                        <br>
                                                        <a href="tel:${phone}" style="color: #3b82f6; font-size: 18px; font-weight: 700; text-decoration: none;">
                                                            📱 ${phone}
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>
                                        </div>
                                        
                                        <!-- Vehicle Interest Card -->
                                        <div style="background-color: #f8fafc; border: 2px solid #e2e8f0; padding: 20px; margin-bottom: 25px; border-radius: 6px;">
                                            <h3 style="margin: 0 0 15px 0; color: #1e3a8a; font-size: 18px; font-weight: 700;">
                                                Vehicle of Interest
                                            </h3>
                                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                                <tr>
                                                    <td style="padding: 8px 0;">
                                                        <span style="color: #64748b; font-size: 14px; font-weight: 500;">Vehicle:</span>
                                                        <br>
                                                        <span style="color: #1e293b; font-size: 17px; font-weight: 700;">
                                                            ${vehicleDetails?.make} ${vehicleDetails?.model}
                                                        </span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0;">
                                                        <span style="color: #64748b; font-size: 14px; font-weight: 500;">Registration:</span>
                                                        <br>
                                                        <span style="color: #1e293b; font-size: 16px; font-weight: 600;">
                                                            ${vehicleDetails?.registration || 'N/A'}
                                                        </span>
                                                    </td>
                                                </tr>
                                                ${videoLink ? `
                                                <tr>
                                                    <td style="padding: 15px 0 0 0;">
                                                        <a href="${videoLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-size: 14px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                                                            ▶ View Video Presentation
                                                        </a>
                                                    </td>
                                                </tr>
                                                ` : ''}
                                            </table>
                                        </div>
                                        
                                        <!-- Action Required -->
                                        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px;">
                                            <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">
                                                ⚡ Action Required: Please contact this customer as soon as possible.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #1e3a8a; padding: 20px 30px; text-align: center;">
                                        <p style="margin: 0; color: #93c5fd; font-size: 12px; line-height: 1.5;">
                                            © ${new Date().getFullYear()} Heston Automotive. All rights reserved.
                                        </p>
                                        <p style="margin: 10px 0 0 0; color: #60a5fa; font-size: 11px;">
                                            This is an automated notification from your video portal system
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
