import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { connectDB } from './config/db.ts';
import applicationRouter from './routes/applicationRoutes';
import dashboardRouter from './routes/dashboardRoutes';
import savedJobRouter from './routes/savedJobRoutes';
import authRouter from './routes/authRoutes';
import platformRouter from './routes/platformRoutes';
import { runPlatformMigration } from './utils/migratePlatforms';

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB & Run Migrations
const initDB = async () => {
  await connectDB();
  try {
    await runPlatformMigration();
  } catch (err) {
    console.error('Failed to run platform migration:', err);
  }
};
initDB();

// Middlewares
app.use(cors(
  {  
origin: process.env.FRONTEND_URL,
  credentials: true,
  }

));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// API Routes
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date(),
    service: 'JobTrack Backend'
  });
});

app.use('/api/auth', authRouter);
app.use('/api/applications', applicationRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/saved-jobs', savedJobRouter);
app.use('/api/platforms', platformRouter);

// Fallback 404 Handler
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Error:', err);

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e: any) => e.message);
    res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: messages
    });
    return;
  }

  // Handle Mongoose Cast Error (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      message: `Invalid format for field: ${err.path}`
    });
    return;
  }

  // Handle Custom Errors (with custom statusCodes)
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
