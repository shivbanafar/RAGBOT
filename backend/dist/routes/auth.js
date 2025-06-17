"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const User_1 = require("../models/User");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongodb_1 = __importDefault(require("../lib/mongodb"));
const error_1 = require("../utils/error");
const router = express_1.default.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'a-very-strong-and-unique-secret-key-for-ragbot';
global.inMemoryUsers = global.inMemoryUsers || new Map();
router.post('/register', async (req, res, next) => {
    try {
        console.log('\n=== Register Route ===');
        const { email, name, password } = req.body;
        console.log('📥 Registration request:', { email, name });
        let useMongoDB = true;
        try {
            await (0, mongodb_1.default)();
            console.log('✅ MongoDB connected');
        }
        catch (error) {
            console.log('⚠️ MongoDB connection failed, using in-memory storage');
            useMongoDB = false;
        }
        if (useMongoDB) {
            const existingUser = await User_1.User.findOne({ email });
            if (existingUser) {
                console.error('❌ User already exists:', email);
                throw new error_1.ValidationError('User already exists');
            }
            const user = new User_1.User({
                email,
                name,
                password,
            });
            await user.save();
            console.log('✅ User created in MongoDB:', user._id);
            const token = jsonwebtoken_1.default.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
            console.log('✅ JWT token generated');
            res.status(201).json({
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                },
            });
        }
        else {
            if (global.inMemoryUsers.has(email)) {
                console.error('❌ User already exists in memory:', email);
                throw new error_1.ValidationError('User already exists');
            }
            const userId = Date.now().toString();
            const user = {
                id: userId,
                email,
                name,
                password,
            };
            global.inMemoryUsers.set(email, user);
            console.log('✅ User created in memory:', userId);
            const token = jsonwebtoken_1.default.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });
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
    }
    catch (error) {
        console.error('❌ Registration error:', error);
        next(error);
    }
});
router.post('/login', async (req, res, next) => {
    try {
        console.log('\n=== Login Route ===');
        const { email, password } = req.body;
        console.log('📥 Login request:', { email });
        let useMongoDB = true;
        try {
            await (0, mongodb_1.default)();
            console.log('✅ MongoDB connected');
        }
        catch (error) {
            console.log('⚠️ MongoDB connection failed, using in-memory storage');
            useMongoDB = false;
        }
        if (useMongoDB) {
            const user = await User_1.User.findOne({ email });
            if (!user) {
                console.error('❌ User not found:', email);
                throw new error_1.AuthenticationError('Invalid credentials');
            }
            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                console.error('❌ Invalid password for user:', email);
                throw new error_1.AuthenticationError('Invalid credentials');
            }
            console.log('✅ Password verified');
            const token = jsonwebtoken_1.default.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
            console.log('✅ JWT token generated');
            res.json({
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                },
            });
        }
        else {
            const user = global.inMemoryUsers.get(email);
            if (!user || user.password !== password) {
                console.error('❌ Invalid credentials for user:', email);
                throw new error_1.AuthenticationError('Invalid credentials');
            }
            console.log('✅ Password verified');
            const token = jsonwebtoken_1.default.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
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
    }
    catch (error) {
        console.error('❌ Login error:', error);
        next(error);
    }
});
router.get('/me', async (req, res, next) => {
    try {
        console.log('\n=== Get Current User Route ===');
        const authHeader = req.headers.authorization;
        console.log('🔑 Auth header:', authHeader ? 'Present' : 'Missing');
        if (!authHeader?.startsWith('Bearer ')) {
            console.error('❌ Invalid auth header format');
            throw new error_1.AuthenticationError('No token provided');
        }
        const token = authHeader.split(' ')[1];
        console.log('🔑 Token extracted:', token ? 'Yes' : 'No');
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        console.log('✅ Token verified, user ID:', decoded.id);
        let useMongoDB = true;
        try {
            await (0, mongodb_1.default)();
            console.log('✅ MongoDB connected');
        }
        catch (error) {
            console.log('⚠️ MongoDB connection failed, using in-memory storage');
            useMongoDB = false;
        }
        if (useMongoDB) {
            const user = await User_1.User.findById(decoded.id).select('-password');
            if (!user) {
                console.error('❌ User not found in database');
                throw new error_1.AuthenticationError('User not found');
            }
            console.log('✅ User found in database');
            res.json({ user });
        }
        else {
            const user = Array.from(global.inMemoryUsers.values()).find(u => u.id === decoded.id);
            if (!user) {
                console.error('❌ User not found in memory');
                throw new error_1.AuthenticationError('User not found');
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
    }
    catch (error) {
        console.error('❌ Get current user error:', error);
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map