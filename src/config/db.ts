import mongoose from "mongoose";

export const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI is not defined in environment variables");
    return;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB connected: ${conn.connection.host} | Database: ${conn.connection.name}`);
  } catch (error: any) {
    console.error("MongoDB connection error:", error.message || error);
  }
};
