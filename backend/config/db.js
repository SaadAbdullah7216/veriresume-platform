import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI;

const connectDB = async () => {
  if (!MONGO_URI) {
    console.error('❌ MONGO_URI is missing from environment variables!');
    return;
  }

  try {
    console.log(`⏳ Connecting to MongoDB at ${MONGO_URI.split('@').pop()}...`); // Log only host for security
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB Connected Successfully');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    // In production, we might want to exit, but let's log first
    // process.exit(1); 
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB Disconnected');
});

export default connectDB;
