import mongoose from 'mongoose';
import { DB_NAME, DB_SECURITY } from '../constants.js';

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGO_URI}/${DB_NAME}${DB_SECURITY}`
    );
    console.log(
      `\nDB connected! DB HOST: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log('DB connection error', error);
    process.exit(1);
  }
};

export default connectDB;
