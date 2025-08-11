import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { mongo, redis } from '../config/db.js';
import { 
  validateEmailOTP, 
  validateOTPVerification, 
  validateRegistration, 
  validateLogin 
} from '../middleware/validation.js';
import { 
  generateOTP, 
  sendOTPEmail, 
  storeOTP, 
  verifyOTP, 
  storeEmailVerification,
  isEmailVerified 
} from '../services/emailService.js';
import { 
  checkUsernameAvailability, 
  addUsernameToFilter, 
  validateUsername 
} from '../services/usernameService.js';

const router = express.Router();

// Step 1: Request OTP for email verification
router.post('/request-otp', validateEmailOTP, async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const db = mongo();
    const users = db.collection('users');
    const existingUser = await users.findOne({ email: normalizedEmail });
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Generate and send OTP
    const otp = generateOTP();
    await storeOTP(normalizedEmail, otp);
    await sendOTPEmail(normalizedEmail, otp);

    res.json({
      success: true,
      message: 'OTP sent to your email address',
      data: {
        email: normalizedEmail,
        expiresIn: '10 minutes'
      }
    });

  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send OTP'
    });
  }
});

// Step 2: Verify OTP
router.post('/verify-otp', validateOTPVerification, async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const verification = await verifyOTP(normalizedEmail, otp);
    
    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        message: verification.message
      });
    }

    // Store email verification token
    const verificationToken = uuidv4();
    await storeEmailVerification(normalizedEmail, verificationToken);

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        email: normalizedEmail,
        verificationToken,
        message: 'You can now complete your registration'
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP'
    });
  }
});

// Step 3: Check username availability (real-time)
router.post('/check-username', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required'
      });
    }

    // Validate username format
    const formatErrors = validateUsername(username);
    if (formatErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid username format',
        errors: formatErrors
      });
    }

    // Check availability
    const availability = await checkUsernameAvailability(username);
    
    res.json({
      success: true,
      data: {
        username: username.toLowerCase().trim(),
        available: availability.available,
        message: availability.message
      }
    });

  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check username availability'
    });
  }
});

// Step 4: Complete registration
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { email, credentials } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    
    // Parse credentials
    const [username, password] = credentials.split(':');
    const normalizedUsername = username.toLowerCase().trim();

    // Verify email was verified
    const emailVerified = await isEmailVerified(normalizedEmail);
    if (!emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email not verified. Please verify your email first.'
      });
    }

    // Validate username format
    const formatErrors = validateUsername(username);
    if (formatErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid username format',
        errors: formatErrors
      });
    }

    // Check username availability one more time
    const availability = await checkUsernameAvailability(username);
    if (!availability.available) {
      return res.status(409).json({
        success: false,
        message: availability.message
      });
    }

    const db = mongo();
    const users = db.collection('users');

    // Double-check email doesn't exist
    const existingUser = await users.findOne({ 
      $or: [
        { email: normalizedEmail },
        { username: normalizedUsername }
      ]
    });
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = {
      id: uuidv4(),
      email: normalizedEmail,
      username: normalizedUsername,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      emailVerified: true
    };

    // Insert user into database
    await users.insertOne(user);

    // Add username to Bloom Filter
    addUsernameToFilter(normalizedUsername);

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        username: user.username
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Store session in Redis
    const sessionKey = `session:${user.id}`;
    await redis.setEx(sessionKey, 60 * 60 * 24 * 7, token); // 7 days

    // Clean up verification data
    await redis.del(`email_verified:${normalizedEmail}`);

    // Remove password from response
    const { password: _, ...userResponse } = user;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userResponse,
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Login with username:password credentials
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { credentials } = req.body;
    const [username, password] = credentials.split(':');
    const normalizedUsername = username.toLowerCase().trim();

    const db = mongo();
    const users = db.collection('users');

    // Find user by username
    const user = await users.findOne({ username: normalizedUsername });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        username: user.username
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Store session in Redis
    const sessionKey = `session:${user.id}`;
    await redis.setEx(sessionKey, 60 * 60 * 24 * 7, token); // 7 days

    // Update last login
    await users.updateOne(
      { _id: user._id },
      { 
        $set: { 
          lastLogin: new Date(),
          updatedAt: new Date()
        }
      }
    );

    // Remove password from response
    const { password: _, ...userResponse } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
