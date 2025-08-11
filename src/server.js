import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import { errorHandler, notFound } from './middleware/validation.js';

dotenv.config();
const app = express();

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500', 'null'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

(async () => {
  await connectDB();
  app.listen(3000, () => {
    console.log('🚀 Server running at http://localhost:3000');
    console.log('📋 Available endpoints:');
    console.log('  POST /api/auth/request-otp - Request OTP for email verification');
    console.log('  POST /api/auth/verify-otp - Verify OTP code');
    console.log('  POST /api/auth/check-username - Check username availability');
    console.log('  POST /api/auth/register - Complete registration');
    console.log('  POST /api/auth/login - Login with username:password');
    console.log('  GET  /api/health - Health check');
  });
})();
