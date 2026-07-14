import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://[IP_ADDRESS]/jobtrack';
    
    mongoose.connection.on('connected', () => {
      console.log('MongoDB successfully connected');
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    await mongoose.connect(mongoURI);
  } catch (error) {
    console.error('Failed to initialize MongoDB connection:', error);
    process.exit(1);
  }
};
