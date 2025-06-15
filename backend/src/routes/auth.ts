import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';
import connectDB from '../lib/mongodb';
import { ValidationError, AuthenticationError } from '../utils/error';

const router = express.Router();

// In-memory user storage for testing (fallback when MongoDB is not available)
declare global {
  var inMemoryUsers: Map<string, any>;
}
global.inMemoryUsers = global.inMemoryUsers || new Map();

// Register new user
router.post('/register', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, name, password } = req.body;

    // Try to connect to MongoDB first
    let useMongoDB = true;
    try {
      await connectDB();
    } catch (error) {
      console.log('MongoDB connection failed, using in-memory storage');
      useMongoDB = false;
    }

    if (useMongoDB) {
      // Check if user already exists in MongoDB
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new ValidationError('User already exists');
      }

      // Create new user in MongoDB
      const user = new User({
        email,
        name,
        password, // Will be hashed by the pre-save hook
      });

      await user.save();

      // Generate JWT
      const token = jwt.sign(
        { id: user._id },
        'your-super-secret-jwt-key-here',
        { expiresIn: '7d' }
      );

      res.status(201).json({
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
        },
      });
    } else {
      // Use in-memory storage as fallback
      if (global.inMemoryUsers.has(email)) {
        throw new ValidationError('User already exists');
      }

      // Create user in memory
      const userId = Date.now().toString();
      const user = {
        id: userId,
        email,
        name,
        password, // In production, this should be hashed
      };

      global.inMemoryUsers.set(email, user);

      // Generate JWT
      const token = jwt.sign(
        { id: userId },
        'your-super-secret-jwt-key-here',
        { expiresIn: '7d' }
      );

      res.status(201).json({
        token,
        user: {
          id: userId,
          email: user.email,
          name: user.name,
        },
      });
    }
  } catch (error) {
    next(error);
  }
});

// Login user
router.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Try to connect to MongoDB first
    let useMongoDB = true;
    try {
      await connectDB();
    } catch (error) {
      console.log('MongoDB connection failed, using in-memory storage');
      useMongoDB = false;
    }

    if (useMongoDB) {
      // Find user in MongoDB
      const user = await User.findOne({ email });
      if (!user) {
        throw new AuthenticationError('Invalid credentials');
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        throw new AuthenticationError('Invalid credentials');
      }

      // Generate JWT
      const token = jwt.sign(
        { id: user._id },
        'your-super-secret-jwt-key-here',
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
        },
      });
    } else {
      // Use in-memory storage as fallback
      const user = global.inMemoryUsers.get(email);
      if (!user || user.password !== password) {
        throw new AuthenticationError('Invalid credentials');
      }

      // Generate JWT
      const token = jwt.sign(
        { id: user.id },
        'your-super-secret-jwt-key-here',
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    }
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    const decoded = jwt.verify(token, 'your-super-secret-jwt-key-here') as { id: string };
    
    // Try to connect to MongoDB first
    let useMongoDB = true;
    try {
      await connectDB();
    } catch (error) {
      console.log('MongoDB connection failed, using in-memory storage');
      useMongoDB = false;
    }

    if (useMongoDB) {
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        throw new AuthenticationError('User not found');
      }
      res.json({ user });
    } else {
      // Use in-memory storage as fallback
      const user = Array.from(global.inMemoryUsers.values()).find(u => u.id === decoded.id);
      if (!user) {
        throw new AuthenticationError('User not found');
      }
      res.json({ 
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

export default router; 