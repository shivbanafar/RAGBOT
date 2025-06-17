export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(401, message);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Not authorized') {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, message);
  }
}

export const handleError = (error: Error) => {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    };
  }

  // Handle mongoose errors
  if (error.name === 'ValidationError') {
    return {
      status: 400,
      message: 'Validation Error',
      errors: Object.values((error as any).errors).map((err: any) => err.message)
    };
  }

  if (error.name === 'CastError') {
    return {
      status: 400,
      message: `Invalid ${(error as any).path}: ${(error as any).value}`
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

  // Default error
  return {
    status: 500,
    message: 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  };
}; 