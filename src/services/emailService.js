import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { redis } from '../config/db.js';

// Create SMTP transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // For production, remove this line
    tls: {
      rejectUnauthorized: false // ✅ This disables cert trust check
    }
  });
};

// Generate OTP
export const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Send OTP email
export const sendOTPEmail = async (email, otp) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.APP_NAME || 'Auth System'}" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: 'Email Verification - OTP Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Email Verification</h2>
          <p>Hello,</p>
          <p>Your OTP code for email verification is:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; margin: 0; font-size: 36px; letter-spacing: 5px;">${otp}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this verification, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message, please do not reply to this email.
          </p>
        </div>
      `,
      text: `Your OTP code for email verification is: ${otp}. This code will expire in 10 minutes.`
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ OTP email sent:', result.messageId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send OTP email:', error);
    throw new Error('Failed to send verification email');
  }
};

// Store OTP in Redis with expiration
export const storeOTP = async (email, otp) => {
  const key = `otp:${email}`;
  await redis.setEx(key, 600, otp); // 10 minutes expiration
};

// Verify OTP
export const verifyOTP = async (email, inputOTP) => {
  const key = `otp:${email}`;
  const storedOTP = await redis.get(key);
  
  if (!storedOTP) {
    return { valid: false, message: 'OTP expired or not found' };
  }

  if (storedOTP === inputOTP) {
    await redis.del(key); // Delete OTP after successful verification
    return { valid: true, message: 'OTP verified successfully' };
  }

  return { valid: false, message: 'Invalid OTP' };
};

// Store email verification token
export const storeEmailVerification = async (email, token) => {
  const key = `email_verified:${email}`;
  await redis.setEx(key, 3600, token); // 1 hour to complete registration
};

// Check if email is verified
export const isEmailVerified = async (email) => {
  const key = `email_verified:${email}`;
  const token = await redis.get(key);
  return !!token;
};
