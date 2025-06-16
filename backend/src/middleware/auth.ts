import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AuthenticationError, AuthorizationError } from '../utils/error';

interface JwtPayload {
  id: string;
  iat: number;
  exp: number;
}

// In-memory user storage reference (same as in auth.ts)
declare global {
  var inMemoryUsers: Map<string, any>;
}
global.inMemoryUsers = global.inMemoryUsers || new Map();

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log('\n=== Auth Middleware ===');
    // 1) Get token from header
    const authHeader = req.headers.authorization;
    console.log('🔑 Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('❌ Invalid auth header format');
      throw new AuthenticationError('Please log in to access this resource');
    }

    const token = authHeader.split(' ')[1];
    console.log('🔑 Token extracted:', token ? 'Yes' : 'No');

    // 2) Verify token
    try {
      const decoded = jwt.verify(
        token,
        'your-super-secret-jwt-key-here'
      ) as JwtPayload;
      console.log('✅ Token verified successfully');
      console.log('👤 User ID from token:', decoded.id);

      // 3) Check if user still exists
      const user = await User.findById(decoded.id);
      if (!user) {
        console.error('❌ User not found in database');
        throw new AuthenticationError('User no longer exists');
      }
      console.log('✅ User found in database');

      // 4) Grant access to protected route
      req.user = user;
      next();
    } catch (error) {
      console.error('❌ Token verification failed:', error);
      throw new AuthenticationError('Invalid token');
    }
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    next(error);
  }
};

export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      console.error('❌ No user found in request');
      return next(new AuthenticationError('Please log in to access this resource'));
    }

    if (!roles.includes(req.user.role)) {
      console.error('❌ User role not authorized:', req.user.role);
      return next(
        new AuthorizationError('You do not have permission to perform this action')
      );
    }

    console.log('✅ User role authorized:', req.user.role);
    next();
  };
}; 