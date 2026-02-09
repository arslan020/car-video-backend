import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import videoRoutes from './routes/videoRoutes.js';
import autoTraderRoutes from './routes/autoTraderRoutes.js';
import sendLinkRoutes from './routes/sendLinkRoutes.js';
import startScheduler from './scheduler.js';

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/autotrader', autoTraderRoutes);
app.use('/api/send-link', sendLinkRoutes);

app.get('/', (req, res) => {
    res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

// Start the scheduler
startScheduler();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
