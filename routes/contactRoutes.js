import express from 'express';
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// @desc    Request a Call Back
// @route   POST /api/contact/request-call
// @access  Public
router.post('/request-call', async (req, res) => {
    const { name, phone, vehicleDetails, videoLink } = req.body;

    if (!name || !phone) {
        return res.status(400).json({ message: 'Name and Phone Number are required' });
    }

    try {
        const emailContent = `
            <h1>New Call Back Request</h1>
            <p><strong>Customer Name:</strong> ${name}</p>
            <p><strong>Phone Number:</strong> ${phone}</p>
            <hr />
            <h3>Vehicle Interest</h3>
            <p><strong>Vehicle:</strong> ${vehicleDetails?.make} ${vehicleDetails?.model} (${vehicleDetails?.registration})</p>
            <p><strong>Video Link:</strong> <a href="${videoLink}">${videoLink}</a></p>
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
