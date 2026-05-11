import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/veriresume';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useUnifiedTopology: true,
    });
  } catch (err) {
    process.exit(1);
  }
};

export default connectDB;
