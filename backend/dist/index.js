"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = require("dotenv");
const mongoose_1 = __importDefault(require("mongoose"));
const path_1 = __importDefault(require("path"));
const result = (0, dotenv_1.config)({ path: path_1.default.resolve(__dirname, '../.env') });
if (result.error) {
    console.error('Error loading .env file:', result.error);
    console.log('Continuing without .env file...');
}
console.log('Environment loaded:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    FRONTEND_URL: process.env.FRONTEND_URL,
    MONGODB_URI: process.env.MONGODB_URI ? '***' : undefined,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? '***' : undefined
});
const auth_1 = __importDefault(require("./routes/auth"));
const chat_1 = __importDefault(require("./routes/chat"));
const documents_1 = __importDefault(require("./routes/documents"));
const app = (0, express_1.default)();
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('MONGODB_URI environment variable is not set');
    process.exit(1);
}
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later'
});
app.use('/api', limiter);
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
if (process.env.NODE_ENV === 'development') {
    app.use((0, morgan_1.default)('dev'));
}
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Request headers:', req.headers);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('Request body:', req.body);
    }
    next();
});
app.use((req, res, next) => {
    const originalSend = res.send;
    res.send = function (body) {
        console.log(`[${new Date().toISOString()}] Response status: ${res.statusCode}`);
        if (body) {
            try {
                const parsedBody = JSON.parse(body);
                console.log('Response body:', parsedBody);
            }
            catch (e) {
                console.log('Response body:', body);
            }
        }
        return originalSend.call(this, body);
    };
    next();
});
app.use('/api/auth', auth_1.default);
app.use('/api/chat', chat_1.default);
app.use('/api/documents', documents_1.default);
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
app.use((err, req, res, next) => {
    console.error('Error occurred:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body,
        headers: req.headers
    });
    res.status(500).json({ error: err.message || 'Internal server error' });
});
const PORT = process.env.PORT || 3001;
async function startServer() {
    try {
        console.log('Connecting to MongoDB...');
        console.log('MongoDB URI:', MONGODB_URI ? '***' : 'not set');
        await mongoose_1.default.connect(MONGODB_URI, {
            maxPoolSize: 5,
            minPoolSize: 1,
            maxIdleTimeMS: 30000,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            bufferCommands: false,
        });
        console.log('Connected to MongoDB successfully');
        console.log('MongoDB connection state:', mongoose_1.default.connection.readyState);
        mongoose_1.default.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
        });
        mongoose_1.default.connection.on('reconnected', () => {
            console.log('MongoDB reconnected');
        });
        app.use('/api/auth', auth_1.default);
        app.use('/api/chat', chat_1.default);
        app.use('/api/documents', documents_1.default);
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log('Environment:', process.env.NODE_ENV || 'development');
            console.log('Available routes:');
            console.log('- POST /api/auth/register');
            console.log('- POST /api/auth/login');
            console.log('- POST /api/chat');
            console.log('- POST /api/chat/message');
            console.log('- POST /api/chat/:id/process');
            console.log('- GET /api/documents');
            console.log('- POST /api/documents/upload');
        });
    }
    catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        process.exit(1);
    }
}
startServer();
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
});
//# sourceMappingURL=index.js.map