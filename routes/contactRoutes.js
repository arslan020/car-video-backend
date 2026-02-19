import express from 'express';
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

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

    const formattedName = capitalizeWords(name);

    try {
        const emailContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Call Request – ${vehicleDetails?.make} ${vehicleDetails?.model}</title>
            </head>
            <body style="margin:0;padding:0;background-color:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5;">
                    <tr>
                        <td align="center" style="padding:48px 20px;">
                            <table role="presentation" width="100%" style="max-width:580px;border-collapse:collapse;">

                                <!-- Top blue accent bar -->
                                <tr>
                                    <td style="height:4px;background-color:#5b9bd5;border-radius:4px 4px 0 0;"></td>
                                </tr>

                                <!-- Header with Logo -->
                                <tr>
                                    <td style="background-color:#ffffff;padding:32px 44px 24px;text-align:center;border-left:1px solid #e8e8e8;border-right:1px solid #e8e8e8;">
                                        <img src="${process.env.FRONTEND_URL}/business-logo.png" alt="Heston Automotive" style="max-width:180px;height:auto;margin-bottom:20px;display:block;margin-left:auto;margin-right:auto;">
                                        <div style="height:1px;background-color:#e8e8e8;"></div>
                                    </td>
                                </tr>

                                <!-- Title -->
                                <tr>
                                    <td style="background-color:#ffffff;padding:28px 44px 0;border-left:1px solid #e8e8e8;border-right:1px solid #e8e8e8;">
                                        <div style="display:inline-block;background-color:#eef4fb;border:1px solid #c5daf0;border-radius:20px;padding:5px 14px;margin-bottom:14px;">
                                            <span style="color:#5b9bd5;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">Incoming Request</span>
                                        </div>
                                        <h1 style="margin:0 0 6px;color:#1a1a1a;font-size:26px;font-weight:700;line-height:1.2;">
                                            📞 New Call Request
                                        </h1>
                                        <p style="margin:0 0 24px;color:#888888;font-size:13px;">
                                            A customer is waiting to hear from you
                                        </p>
                                    </td>
                                </tr>

                                <!-- Content -->
                                <tr>
                                    <td style="background-color:#ffffff;padding:0 44px 36px;border-left:1px solid #e8e8e8;border-right:1px solid #e8e8e8;">

                                        <!-- Customer Card -->
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                                            <tr>
                                                <td style="background-color:#f8f9fa;border:1px solid #ebebeb;border-radius:10px;padding:22px 26px;">
                                                    <p style="margin:0 0 14px;color:#aaaaaa;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Customer Details</p>

                                                    <!-- Name -->
                                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                                                        <tr>
                                                            <td width="36" valign="middle" style="padding-right:12px;">
                                                                <div style="width:36px;height:36px;background-color:#eef4fb;border-radius:50%;text-align:center;line-height:36px;font-size:15px;">👤</div>
                                                            </td>
                                                            <td>
                                                                <p style="margin:0 0 2px;color:#aaaaaa;font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Full Name</p>
                                                                <p style="margin:0;color:#1a1a1a;font-size:15px;font-weight:600;">${formattedName}</p>
                                                            </td>
                                                        </tr>
                                                    </table>

                                                    <div style="height:1px;background-color:#e8e8e8;margin-bottom:12px;"></div>

                                                    <!-- Phone -->
                                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td width="36" valign="middle" style="padding-right:12px;">
                                                                <div style="width:36px;height:36px;background-color:#eef4fb;border-radius:50%;text-align:center;line-height:36px;font-size:15px;">📞</div>
                                                            </td>
                                                            <td>
                                                                <p style="margin:0 0 2px;color:#aaaaaa;font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Phone Number</p>
                                                                <a href="tel:${phone}" style="color:#5b9bd5;font-size:17px;font-weight:700;text-decoration:none;">${phone}</a>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Vehicle Card -->
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                                            <tr>
                                                <td style="background-color:#f8f9fa;border:1px solid #ebebeb;border-left:3px solid #5b9bd5;border-radius:10px;padding:22px 26px;">
                                                    <p style="margin:0 0 14px;color:#aaaaaa;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Vehicle of Interest</p>
                                                    <p style="margin:0 0 8px;color:#1a1a1a;font-size:22px;font-weight:700;">${vehicleDetails?.make} ${vehicleDetails?.model}</p>
                                                    <p style="margin:0 0 18px;">
                                                        <span style="display:inline-block;background-color:#ffffff;border:1px solid #ddd;border-radius:4px;padding:4px 12px;color:#555555;font-size:12px;font-weight:600;letter-spacing:1.5px;font-family:monospace;">
                                                            ${vehicleDetails?.registration || 'N/A'}
                                                        </span>
                                                    </p>
                                                    ${videoLink ? `
                                                    <div style="border-top:1px solid #e8e8e8;padding-top:16px;">
                                                        <a href="${videoLink}" style="display:inline-block;background-color:#5b9bd5;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 20px;border-radius:6px;">
                                                            ▶ &nbsp;Watch Video Presentation
                                                        </a>
                                                    </div>
                                                    ` : ''}
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Alert notice -->
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="background-color:#eef4fb;border:1px solid #c5daf0;border-radius:8px;padding:14px 20px;text-align:center;">
                                                    <p style="margin:0;color:#5b9bd5;font-size:13px;font-weight:600;">
                                                        ⚡ Please contact this customer as soon as possible
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
                                            © ${new Date().getFullYear()} Heston Automotive &nbsp;·&nbsp; Automated Notification &nbsp;·&nbsp; Do not reply
                                        </p>
                                    </td>
                                </tr>

                                <!-- Bottom blue bar -->
                                <tr>
                                    <td style="height:3px;background-color:#5b9bd5;border-radius:0 0 4px 4px;"></td>
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
            subject: `📞 Call Request: ${vehicleDetails?.make} ${vehicleDetails?.model} — ${formattedName}`,
            html: emailContent
        });

        res.status(200).json({ message: 'Call request sent successfully' });
    } catch (error) {
        console.error('Error sending call request email:', error);
        res.status(500).json({ message: 'Failed to send call request' });
    }
});

export default router;