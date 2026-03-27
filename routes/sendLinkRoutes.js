import express from 'express';
import { Resend } from 'resend';
import { protect } from '../middleware/authMiddleware.js';
import Video from '../models/Video.js';
import AuditLog from '../models/AuditLog.js';

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

        // 1. Generate Unique Share Token via AuditLog FIRST
        let shareId = null;
        let finalVideoLink = videoLink;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 4);

        try {
            // A more robust way to extract videoId from the URL
            const urlObj = new URL(videoLink);
            const pathSegments = urlObj.pathname.split('/');
            const viewIndex = pathSegments.indexOf('view');

            let videoId = null;
            if (viewIndex !== -1 && pathSegments.length > viewIndex + 1) {
                videoId = pathSegments[viewIndex + 1];
            }

            if (videoId && /^[a-f\d]{24}$/i.test(videoId)) {
                const log = await AuditLog.create({
                    action: 'SEND_VIDEO_LINK',
                    user: req.user._id,
                    details: `Sent video link for ${vehicleDetails?.make} ${vehicleDetails?.model} to ${email || mobile}. Expiry set to 4 days.`,
                    targetId: videoId,
                    metadata: { registration: vehicleDetails?.registration, expiresAt, sentTo: email || mobile, sentToEmail: email || null, sentToMobile: mobile || null, customerName: customerName || null }
                });
                shareId = log._id;

                // Update legacy field on video
                await Video.findByIdAndUpdate(videoId, { linkExpiresAt: expiresAt });

                // Append token to link
                urlObj.searchParams.append('s', shareId.toString());
                // Append sender name so video view page shows correct Sales Executive
                const senderName = req.user?.name || req.user?.username || '';
                if (senderName) {
                    urlObj.searchParams.append('ref', encodeURIComponent(senderName));
                }
                finalVideoLink = urlObj.toString();
            } else {
                console.error(`Failed to extract videoId from videoLink: ${videoLink}`);
            }
        } catch (err) {
            console.error('Failed to generate share token:', err);
        }

        // Send Email (if email provided)
        if (email) {
            try {
                const resend = new Resend(process.env.RESEND_API_KEY);
                const { data, error } = await resend.emails.send({
                    from: process.env.EMAIL_FROM || 'Heston Automotive <info@hestonautomotive.com>',
                    to: [email],
                    replyTo: process.env.EMAIL_REPLY_TO || 'enquiries@hestonautomotive.com',
                    subject: `Your video link for ${vehicleDetails?.make} ${vehicleDetails?.model}`,
                    text: `Dear ${greetingName},

Thank you for your interest in the ${vehicleDetails?.make} ${vehicleDetails?.model}.

Watch your video presentation here:
${finalVideoLink}

For security, this link will expire in 4 days.

If you have any questions, call 020 8564 8030 or email enquiries@hestonautomotive.com.

Heston Automotive`,
                    html: `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Your video link</title>
                    </head>
                    <body style="font-family: Arial, Helvetica, sans-serif; color: #222; line-height: 1.5;">
                        <p>Dear ${greetingName},</p>
                        <p>Thank you for your interest in the ${vehicleDetails?.make} ${vehicleDetails?.model}.</p>
                        <p>You can watch your video presentation here:</p>
                        <p><a href="${finalVideoLink}">${finalVideoLink}</a></p>
                        <p>For security, this link will expire in 4 days.</p>
                        <p>If you have any questions, call 020 8564 8030 or email enquiries@hestonautomotive.com.</p>
                        <p>Heston Automotive</p>
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
                const smsMessage = `Hi ${greetingName}, here's your personalised video presentation for the ${vehicleDetails?.make} ${vehicleDetails?.model} from Heston Automotive: ${finalVideoLink}`;
                await sendBirdSMS(mobile, smsMessage);
                console.log('SMS sent successfully to:', mobile);
                results.sms = 'sent';
            } catch (error) {
                console.error('SMS send error:', error.message);
                results.sms = 'failed';
            }
        }

        // Expiration logic moved to start of process

        res.json({ message: 'Send request processed', results });

    } catch (error) {
        console.error('Send link error:', error);
        res.status(500).json({ message: 'Failed to process send request' });
    }
});

export default router;
