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
                    <div style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #000000; max-width: 600px;">
                        <p style="margin-bottom: 20px;">
                            Dear ${greetingName},
                        </p>
                        
                        <p style="margin-bottom: 20px;">
                            Thank you for your enquiry to ${vehicleDetails?.make} ${vehicleDetails?.model}.
                        </p>
                        
                        <p style="margin-bottom: 20px;">
                            Please click here to watch a short personal video presentation of the vehicle you’re interested in: 
                            <br>
                            <a href="${videoLink}" style="color: #0000EE; text-decoration: underline;">${videoLink}</a>
                        </p>
                        
                        <p style="margin-bottom: 40px;">
                            Please feel free to contact me on 020 8564 8030 to organise a test drive or answer any questions you may have.
                        </p>
                        
                        <p style="margin-bottom: 0;">
                            Many thanks,
                        </p>
                        
                        <p style="margin-top: 20px; font-weight: bold; margin-bottom: 5px;">
                            Heston Automotive
                        </p>
                        <p style="margin: 0;">
                            Phone: 020 8564 8030
                        </p>
                        <p style="margin: 0;">
                            Email: <a href="mailto:enquiries@hestonautomotive.com" style="color: #000000; text-decoration: none;">enquiries@hestonautomotive.com</a>
                        </p>
                    </div>
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
