import mongoose from 'mongoose';
import { env } from './env.js';

let isConnected = false;

export const connectDB = async (uri = env.MONGODB_URI) => {
  if (isConnected) {
    return;
  }

  try {
    const conn = await mongoose.connect(uri);
    isConnected = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    if (env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

export const disconnectDB = async () => {
  if (!isConnected) {
    return;
  }
  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log('MongoDB Disconnected');
  } catch (error) {
    console.error(`MongoDB Disconnect Error: ${error.message}`);
  }
};
