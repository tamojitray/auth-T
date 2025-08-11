import { mongo, redis } from '../config/db.js';

import pkg from 'bloom-filters';
const { BloomFilter } = pkg;

// Initialize Bloom Filter for username checking
let usernameBloomFilter = null;

// Initialize Bloom Filter
export const initializeBloomFilter = async () => {
  try {
    // Create Bloom Filter with capacity for 1M usernames, 1% false positive rate
    usernameBloomFilter = new BloomFilter(1000000, 4);
    
    // Load existing usernames into Bloom Filter
    const db = mongo();
    const users = db.collection('users');
    const existingUsers = await users.find({}, { projection: { username: 1 } }).toArray();
    
    existingUsers.forEach(user => {
      if (user.username) {
        usernameBloomFilter.add(user.username);
      }
    });
    
    console.log(`✅ Bloom Filter initialized with ${existingUsers.length} usernames`);
  } catch (error) {
    console.error('❌ Failed to initialize Bloom Filter:', error);
  }
};

// Check username availability using Bloom Filter + Redis cache + DB
export const checkUsernameAvailability = async (username) => {
  try {
    const cleanUsername = username.toLowerCase().trim();

    // Step 1: Quick check with Bloom Filter
    if (usernameBloomFilter && usernameBloomFilter.has(cleanUsername)) {
      // Bloom filter says "possibly exists" - need to verify with cache/DB
      
      // Step 2: Check Redis cache
      const cacheKey = `username:${cleanUsername}`;
      const cached = await redis.get(cacheKey);
      
      if (cached === 'taken') {
        return { available: false, message: 'Username is already taken' };
      }
      
      if (cached === 'available') {
        return { available: true, message: 'Username is available' };
      }
      
      // Step 3: Check database (cache miss)
      const db = mongo();
      const users = db.collection('users');
      const existingUser = await users.findOne({ username: cleanUsername });
      
      if (existingUser) {
        // Cache the result for 5 minutes
        await redis.setEx(cacheKey, 300, 'taken');
        return { available: false, message: 'Username is already taken' };
      } else {
        // False positive in Bloom Filter - cache as available for 1 minute
        await redis.setEx(cacheKey, 60, 'available');
        return { available: true, message: 'Username is available' };
      }
    } else {
      // Bloom filter says "definitely not exists"
      return { available: true, message: 'Username is available' };
    }
  } catch (error) {
    console.error('Error checking username availability:', error);
    return { available: false, message: 'Error checking username availability' };
  }
};

// Add username to Bloom Filter when user registers
export const addUsernameToFilter = (username) => {
  if (usernameBloomFilter) {
    usernameBloomFilter.add(username.toLowerCase().trim());
  }
};

// Validate username format
export const validateUsername = (username) => {
  const errors = [];
  
  if (!username) {
    errors.push('Username is required');
    return errors;
  }
  
  const cleanUsername = username.trim();
  
  // Length check
  if (cleanUsername.length < 6) {
    errors.push('Username must be at least 6 characters long');
  }
  
  if (cleanUsername.length > 20) {
    errors.push('Username must be less than 20 characters long');
  }
  
  // Character check - only alphanumeric, underscore, and hyphen
  if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
    errors.push('Username can only contain letters, numbers, underscores, and hyphens');
  }
  
  // Must start with letter or number
  if (!/^[a-zA-Z0-9]/.test(cleanUsername)) {
    errors.push('Username must start with a letter or number');
  }
  
  // Reserved usernames
  const reserved = ['admin', 'root', 'user', 'test', 'api', 'www', 'mail', 'support'];
  if (reserved.includes(cleanUsername.toLowerCase())) {
    errors.push('This username is reserved and cannot be used');
  }
  
  return errors;
};
