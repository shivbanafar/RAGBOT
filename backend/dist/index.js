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
const error_1 = require("./utils/error");
const path_1 = __importDefault(require("path"));
const result = (0, dotenv_1.config)({ path: path_1.default.resolve(__dirname, '../.env') });
if (result.error) {
    console.error('Error loading .env file:', result.error);
    process.exit(1);
}
console.log('Environment loaded:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    FRONTEND_URL: process.env.FRONTEND_URL,
    MONGODB_URI: process.env.MONGODB_URI ? '***' : undefined
});
const auth_1 = __importDefault(require("./routes/auth"));
const chat_1 = __importDefault(require("./routes/chat"));
const documents_1 = __importDefault(require("./routes/documents"));
const app = (0, express_1.default)();
mongoose_1.default
    .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rag-chat')
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});
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
app.use('/api/auth', auth_1.default);
app.use('/api/chat', chat_1.default);
app.use('/api/documents', documents_1.default);
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
app.use((err, req, res, next) => {
    const error = (0, error_1.handleError)(err);
    res.status(error.status).json(error);
});
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map