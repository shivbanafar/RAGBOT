"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
class AppError extends Error {
    constructor(statusCode, message, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, AppError.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message) {
        super(400, message);
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(401, message);
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends AppError {
    constructor(message = 'Not authorized') {
        super(403, message);
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(404, message);
    }
}
exports.NotFoundError = NotFoundError;
const handleError = (error) => {
    if (error instanceof AppError) {
        return {
            status: error.statusCode,
            message: error.message,
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        };
    }
    if (error.name === 'ValidationError') {
        return {
            status: 400,
            message: 'Validation Error',
            errors: Object.values(error.errors).map((err) => err.message)
        };
    }
    if (error.name === 'CastError') {
        return {
            status: 400,
            message: `Invalid ${error.path}: ${error.value}`
        };
    }
    if (error.name === 'JsonWebTokenError') {
        return {
            status: 401,
            message: 'Invalid token. Please log in again.'
        };
    }
    if (error.name === 'TokenExpiredError') {
        return {
            status: 401,
            message: 'Your token has expired. Please log in again.'
        };
    }
    return {
        status: 500,
        message: 'Something went wrong',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    };
};
exports.handleError = handleError;
//# sourceMappingURL=error.js.map