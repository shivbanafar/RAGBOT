import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';
import connectDB from '../lib/mongodb';
import { ValidationError, AuthenticationError } from '../utils/error';

const router = express.Router();

// JWT secret key - should be in environment variables in production
const JWT_SECRET = 'your-super-secret-jwt-key-here';

// In-memory user storage for testing (fallback when MongoDB is not available)
declare global {
  var inMemoryUsers: Map<string, any>;
}
global.inMemoryUsers = global.inMemoryUsers || new Map();

// Register new user
router.post('/register', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    console.log('\n=== Register Route ===');
    const { email, name, password } = req.body;
    console.log('📥 Registration request:', { email, name });

    // Try to connect to MongoDB first
    let useMongoDB = true;
    try {
      await connectDB();
      console.log('✅ MongoDB connected');
    } catch (error) {
      console.log('⚠️ MongoDB connection failed, using in-memory storage');
      useMongoDB = false;
    }

    if (useMongoDB) {
      // Check if user already exists in MongoDB
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        console.error('❌ User already exists:', email);
        throw new ValidationError('User already exists');
      }

      // Create new user in MongoDB
      const user = new User({
        email,
        name,
        password, // Will be hashed by the pre-save hook
      });

      await user.save();
      console.log('✅ User created in MongoDB:', user._id);

      // Generate JWT
      const token = jwt.sign(
        { id: user._id },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      console.log('✅ JWT token generated');

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
        console.error('❌ User already exists in memory:', email);
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
      console.log('✅ User created in memory:', userId);

      // Generate JWT
      const token = jwt.sign(
        { id: userId },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      console.log('✅ JWT token generated');

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
    console.error('❌ Registration error:', error);
    next(error);
  }
});

// Login user
router.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    console.log('\n=== Login Route ===');
    const { email, password } = req.body;
    console.log('📥 Login request:', { email });

    // Try to connect to MongoDB first
    let useMongoDB = true;
    try {
      await connectDB();
      console.log('✅ MongoDB connected');
    } catch (error) {
      console.log('⚠️ MongoDB connection failed, using in-memory storage');
      useMongoDB = false;
    }

    if (useMongoDB) {
      // Find user in MongoDB
      const user = await User.findOne({ email });
      if (!user) {
        console.error('❌ User not found:', email);
        throw new AuthenticationError('Invalid credentials');
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        console.error('❌ Invalid password for user:', email);
        throw new AuthenticationError('Invalid credentials');
      }
      console.log('✅ Password verified');

      // Generate JWT
      const token = jwt.sign(
        { id: user._id },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      console.log('✅ JWT token generated');

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
        console.error('❌ Invalid credentials for user:', email);
        throw new AuthenticationError('Invalid credentials');
      }
      console.log('✅ Password verified');

      // Generate JWT
      const token = jwt.sign(
        { id: user.id },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      console.log('✅ JWT token generated');

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
    console.error('❌ Login error:', error);
    next(error);
  }
});

// Get current user
router.get('/me', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    console.log('\n=== Get Current User Route ===');
    const authHeader = req.headers.authorization;
    console.log('🔑 Auth header:', authHeader ? 'Present' : 'Missing');

    if (!authHeader?.startsWith('Bearer ')) {
      console.error('❌ Invalid auth header format');
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    console.log('🔑 Token extracted:', token ? 'Yes' : 'No');

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    console.log('✅ Token verified, user ID:', decoded.id);
    
    // Try to connect to MongoDB first
    let useMongoDB = true;
    try {
      await connectDB();
      console.log('✅ MongoDB connected');
    } catch (error) {
      console.log('⚠️ MongoDB connection failed, using in-memory storage');
      useMongoDB = false;
    }

    if (useMongoDB) {
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        console.error('❌ User not found in database');
        throw new AuthenticationError('User not found');
      }
      console.log('✅ User found in database');
      res.json({ user });
    } else {
      // Use in-memory storage as fallback
      const user = Array.from(global.inMemoryUsers.values()).find(u => u.id === decoded.id);
      if (!user) {
        console.error('❌ User not found in memory');
        throw new AuthenticationError('User not found');
      }
      console.log('✅ User found in memory');
      res.json({ 
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      });
    }
  } catch (error) {
    console.error('❌ Get current user error:', error);
    next(error);
  }
});

export default router; 