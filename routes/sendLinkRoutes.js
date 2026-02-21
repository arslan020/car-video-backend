import express from 'express';
import { Resend } from 'resend';
import { protect } from '../middleware/authMiddleware.js';

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

// Helper: Send SMS via Bird API
const sendBirdSMS = async (mobile, message) => {
    const workspaceId = process.env.BIRD_WORKSPACE_ID;
    const channelId = process.env.BIRD_CHANNEL_ID;
    const accessKey = process.env.BIRD_ACCESS_KEY;

    // Normalize phone number to E.164 format
    let phone = mobile.replace(/\s+/g, '').replace(/-/g, '');
    if (phone.startsWith('0')) {
        phone = '+44' + phone.slice(1);
    } else if (!phone.startsWith('+')) {
        phone = '+44' + phone;
    }

    const url = `https://api.bird.com/workspaces/${workspaceId}/channels/${channelId}/messages`;

    const body = {
        receiver: {
            contacts: [
                {
                    identifierKey: 'phonenumber',
                    identifierValue: phone
                }
            ]
        },
        body: {
            type: 'text',
            text: { text: message }
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `AccessKey ${accessKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bird API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
};

// @desc    Send video link via email and/or SMS
// @route   POST /api/send-link
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { videoLink, email, mobile, vehicleDetails, customerName, customerTitle } = req.body;

        if (!email && !mobile) {
            return res.status(400).json({ message: 'Please provide an email address or mobile number' });
        }

        const results = { email: null, sms: null };

        const formattedName = capitalizeWords(customerName);
        const greetingName = formattedName
            ? `${customerTitle ? customerTitle + ' ' : ''}${formattedName}`
            : 'Customer';

        // Send Email (if email provided)
        if (email) {
            try {
                const resend = new Resend(process.env.RESEND_API_KEY);
                const { data, error } = await resend.emails.send({
                    from: process.env.EMAIL_FROM || 'Heston Automotive <no-reply@hestonautomotive.com>',
                    to: [email],
                    subject: `Your Video Presentation – ${vehicleDetails?.make} ${vehicleDetails?.model}`,
                    html: `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Video Presentation - ${vehicleDetails?.make} ${vehicleDetails?.model}</title>
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
                                                <img src="${process.env.FRONTEND_URL}/business-logo.png" alt="Heston Automotive" style="max-width:180px;height:auto;display:block;margin:0 auto 20px;">
                                                <div style="height:1px;background-color:#e8e8e8;"></div>
                                            </td>
                                        </tr>

                                        <!-- Greeting & Title -->
                                        <tr>
                                            <td style="background-color:#ffffff;padding:32px 44px 0;border-left:1px solid #e8e8e8;border-right:1px solid #e8e8e8;">
                                                <div style="display:inline-block;background-color:#eef4fb;border:1px solid #c5daf0;border-radius:20px;padding:5px 14px;margin-bottom:14px;">
                                                    <span style="color:#5b9bd5;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">Personalised For You</span>
                                                </div>
                                                <h1 style="margin:0 0 8px;color:#1a1a1a;font-size:26px;font-weight:700;line-height:1.2;">
                                                    Your Video Presentation
                                                </h1>
                                                <p style="margin:0 0 24px;color:#555555;font-size:15px;line-height:1.6;">
                                                    Dear <strong>${greetingName}</strong>, thank you for your interest in the
                                                    <strong style="color:#1a1a1a;">${vehicleDetails?.make} ${vehicleDetails?.model}</strong>.
                                                    We've prepared a detailed video walkthrough just for you.
                                                </p>
                                            </td>
                                        </tr>

                                        <!-- Vehicle + CTA Card -->
                                        <tr>
                                            <td style="background-color:#ffffff;padding:0 44px 36px;border-left:1px solid #e8e8e8;border-right:1px solid #e8e8e8;">

                                                <!-- Vehicle Info Card -->
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                                                    <tr>
                                                        <td style="background-color:#f8f9fa;border:1px solid #ebebeb;border-left:3px solid #5b9bd5;border-radius:10px;padding:22px 26px;">
                                                            <p style="margin:0 0 10px;color:#aaaaaa;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Vehicle of Interest</p>
                                                            <p style="margin:0;color:#1a1a1a;font-size:22px;font-weight:700;">${vehicleDetails?.make} ${vehicleDetails?.model}</p>
                                                        </td>
                                                    </tr>
                                                </table>

                                                <!-- CTA Button Card -->
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                                                    <tr>
                                                        <td style="background-color:#f8f9fa;border:1px solid #ebebeb;border-radius:10px;padding:28px 26px;text-align:center;">
                                                            <p style="margin:0 0 20px;color:#555555;font-size:14px;line-height:1.6;">
                                                                Click below to watch the full video presentation showcasing the features and condition of this vehicle.
                                                            </p>
                                                            <a href="${videoLink}" style="display:inline-block;background-color:#28a745;color:#ffffff;text-decoration:none;padding:14px 44px;font-size:15px;font-weight:600;border-radius:50px;letter-spacing:0.3px;">
                                                                ▶ &nbsp;Watch Video Presentation
                                                            </a>
                                                        </td>
                                                    </tr>
                                                </table>

                                                <!-- Contact Info -->
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                                    <tr>
                                                        <td style="background-color:#eef4fb;border:1px solid #c5daf0;border-radius:8px;padding:16px 22px;text-align:center;">
                                                            <p style="margin:0 0 6px;color:#555555;font-size:13px;">Have questions? We're here to help.</p>
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
                                                <p style="margin:0 0 6px;color:#e6f3ff;font-size:12px;line-height:1.6;opacity:0.9;">
                                                    © ${new Date().getFullYear()} Heston Automotive. All rights reserved.
                                                </p>
                                                <p style="margin:0;color:#a0b4ff;font-size:11px;opacity:0.8;">
                                                    This email was sent regarding your enquiry about ${vehicleDetails?.make} ${vehicleDetails?.model}
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
        }

        // Send SMS via Bird (if mobile provided)
        if (mobile) {
            try {
                const smsMessage = `Hi ${greetingName}, here's your personalised video presentation for the ${vehicleDetails?.make} ${vehicleDetails?.model} from Heston Automotive: ${videoLink}`;
                await sendBirdSMS(mobile, smsMessage);
                console.log('SMS sent successfully to:', mobile);
                results.sms = 'sent';
            } catch (error) {
                console.error('SMS send error:', error.message);
                results.sms = 'failed';
            }
        }

        res.json({ message: 'Send request processed', results });

    } catch (error) {
        console.error('Send link error:', error);
        res.status(500).json({ message: 'Failed to process send request' });
    }
});

export default router;
