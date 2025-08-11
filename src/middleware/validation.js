// Middleware to validate email for OTP request
export const validateEmailOTP = (req, res, next) => {
  const { email } = req.body;
  const errors = [];

  // Check required fields
  if (!email) {
    errors.push('Email is required');
  } else {
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Please provide a valid email address');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// Middleware to validate OTP verification
export const validateOTPVerification = (req, res, next) => {
  const { email, otp } = req.body;
  const errors = [];

  if (!email) errors.push('Email is required');
  if (!otp) errors.push('OTP is required');

  // Email validation
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Please provide a valid email address');
  }

  // OTP validation
  if (otp && (!/^\d{6}$/.test(otp))) {
    errors.push('OTP must be a 6-digit number');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// Middleware to validate registration after OTP verification
export const validateRegistration = (req, res, next) => {
  const { email, credentials } = req.body;
  const errors = [];

  // Check required fields
  if (!email) errors.push('Email is required');
  if (!credentials) errors.push('Credentials are required');

  // Email validation
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Please provide a valid email address');
  }

  // Credentials validation (username:password format)
  if (credentials) {
    const colonCount = (credentials.match(/:/g) || []).length;
    
    if (colonCount === 0) {
      errors.push('Credentials must be in format "username:password"');
    } else if (colonCount > 1) {
      errors.push('Credentials cannot contain multiple colons');
    } else {
      const [username, password] = credentials.split(':');
      
      // Username validation
      if (!username || username.trim().length === 0) {
        errors.push('Username cannot be empty');
      } else if (username.trim().length < 6) {
        errors.push('Username must be at least 6 characters long');
      } else if (username.trim().length > 20) {
        errors.push('Username must be less than 20 characters long');
      } else if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
        errors.push('Username can only contain letters, numbers, underscores, and hyphens');
      } else if (!/^[a-zA-Z0-9]/.test(username.trim())) {
        errors.push('Username must start with a letter or number');
      }
      
      // Password validation
      if (!password) {
        errors.push('Password cannot be empty');
      } else if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// Middleware to validate login credentials
export const validateLogin = (req, res, next) => {
  const { credentials } = req.body;
  const errors = [];

  if (!credentials) {
    errors.push('Credentials are required');
  } else {
    // Check if credentials contain ':'
    if (!credentials.includes(':')) {
      errors.push('Credentials must be in format "username:password"');
    } else {
      const parts = credentials.split(':');
      if (parts.length !== 2) {
        errors.push('Credentials must be in format "username:password"');
      } else {
        const [username, password] = parts;
        if (!username.trim()) {
          errors.push('Username cannot be empty');
        }
        if (!password) {
          errors.push('Password cannot be empty');
        }
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// Global error handler
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // MongoDB duplicate key error
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'User with this email already exists'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
};

// Not found handler
export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
};
