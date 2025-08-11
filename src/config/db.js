import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { createClient } from 'redis';
import { initializeBloomFilter } from '../services/usernameService.js';

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URL);
const redisClient = new createClient({ url: process.env.REDIS_URL });

export const connectDB = async () => {
  try {
    await Promise.all([mongoClient.connect(), redisClient.connect()]);
    console.log('✅ Connected to MongoDB and Redis');
    
    // Initialize Bloom Filter after DB connection
    await initializeBloomFilter();
  } catch (err) {
    console.error('❌ DB connection failed:', err);
    process.exit(1);
  }
};

export const mongo = () => mongoClient.db();
export { redisClient as redis };
