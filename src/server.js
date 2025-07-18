import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';

dotenv.config();
const app = express();
app.use(express.json());

(async () => {
  await connectDB();
  app.listen(3000, () => {
    console.log('🚀 Server running at http://localhost:3000');
  });
})();
