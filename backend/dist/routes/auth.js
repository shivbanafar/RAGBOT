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
router.post('/register', async (req, res, next) => {
    try {
        await (0, mongodb_1.default)();
        const { email, name, password } = req.body;
        const existingUser = await User_1.User.findOne({ email });
        if (existingUser) {
            throw new error_1.ValidationError('User already exists');
        }
        const user = new User_1.User({
            email,
            name,
            password,
        });
        await user.save();
        const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
        res.status(201).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/login', async (req, res, next) => {
    try {
        await (0, mongodb_1.default)();
        const { email, password } = req.body;
        const user = await User_1.User.findOne({ email });
        if (!user) {
            throw new error_1.AuthenticationError('Invalid credentials');
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            throw new error_1.AuthenticationError('Invalid credentials');
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/me', async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            throw new error_1.AuthenticationError('No token provided');
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        await (0, mongodb_1.default)();
        const user = await User_1.User.findById(decoded.id).select('-password');
        if (!user) {
            throw new error_1.AuthenticationError('User not found');
        }
        res.json({ user });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map