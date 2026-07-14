import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const protect = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  let token: string | undefined;

  // Check Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided'
    });
    return;
  }

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'access_secret_123_key');
    
    // Fetch the user and attach to request, excluding password
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Not authorized, user not found'
      });
      return;
    }

    req.user = user;
    next();
  } catch (error: any) {
    console.error('JWT Verification Error:', error.message);
    
    // Return a specific message if expired, so client can refresh
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Token has expired'
      });
      return;
    }

    res.status(401).json({
      success: false,
      message: 'Not authorized, token failed'
    });
  }
};
