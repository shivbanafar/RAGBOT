"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.restrictTo = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const error_1 = require("../utils/error");
global.inMemoryUsers = global.inMemoryUsers || new Map();
const JWT_SECRET = process.env.JWT_SECRET || 'a-very-strong-and-unique-secret-key-for-ragbot';
const protect = async (req, res, next) => {
    try {
        console.log('\n=== Auth Middleware ===');
        const authHeader = req.headers.authorization;
        console.log('🔑 Auth header:', authHeader ? 'Present' : 'Missing');
        if (!authHeader?.startsWith('Bearer ')) {
            console.error('❌ Invalid auth header format');
            throw new error_1.AuthenticationError('Please log in to access this resource');
        }
        const token = authHeader.split(' ')[1];
        console.log('🔑 Token extracted:', token ? 'Yes' : 'No');
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            console.log('✅ Token verified successfully');
            console.log('👤 User ID from token:', decoded.id);
            const user = await User_1.User.findById(decoded.id);
            if (!user) {
                console.error('❌ User not found in database');
                throw new error_1.AuthenticationError('User no longer exists');
            }
            console.log('✅ User found in database');
            req.user = user;
            next();
        }
        catch (error) {
            console.error('❌ Token verification failed:', error);
            throw new error_1.AuthenticationError('Invalid token');
        }
    }
    catch (error) {
        console.error('❌ Auth middleware error:', error);
        next(error);
    }
};
exports.protect = protect;
const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            console.error('❌ No user found in request');
            return next(new error_1.AuthenticationError('Please log in to access this resource'));
        }
        if (!roles.includes(req.user.role)) {
            console.error('❌ User role not authorized:', req.user.role);
            return next(new error_1.AuthorizationError('You do not have permission to perform this action'));
        }
        console.log('✅ User role authorized:', req.user.role);
        next();
    };
};
exports.restrictTo = restrictTo;
//# sourceMappingURL=auth.js.map