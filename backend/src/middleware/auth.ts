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
    // 1) Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthenticationError('Please log in to access this resource');
    }

    const token = authHeader.split(' ')[1];

    // 2) Verify token
    const decoded = jwt.verify(
      token,
      'your-super-secret-jwt-key-here'
    ) as JwtPayload;

    // 3) Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new AuthenticationError('User no longer exists');
    }

    // 4) Grant access to protected route
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError());
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AuthorizationError('You do not have permission to perform this action')
      );
    }

    next();
  };
}; 