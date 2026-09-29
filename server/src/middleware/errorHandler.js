import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || null;

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message
    }));
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  else if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Invalid format for ${err.path}`;
  }

  // Handle Mongoose ValidationError
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Database validation failed';
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message
    }));
  }

  // Handle MongoDB Duplicate Key Error (E11000)
  else if (err.code === 11000) {
    statusCode = 409;
    code = 'CONFLICT';
    const fields = Object.keys(err.keyValue || {});
    message = fields.length > 0
      ? `A resource with that ${fields.join(', ')} already exists`
      : 'Duplicate resource found';
  }

  // Handle JWT Errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = 'Authentication token has expired';
  }

  // If this is an unexpected 500 error, mask message and log stack
  if (statusCode === 500) {
    console.error('💥 Unhandled Server Error:', err);
    message = 'An unexpected server error occurred';
    code = 'INTERNAL_ERROR';
    details = null;
  } else if (env.NODE_ENV === 'development' && statusCode >= 400) {
    // Helpful log for debugging in dev
    // console.warn(`[${req.method} ${req.originalUrl}] ${statusCode} ${code} - ${message}`);
  }

  const errorResponse = {
    code,
    message
  };

  if (details) {
    errorResponse.details = details;
  }

  return res.status(statusCode).json({
    success: false,
    error: errorResponse
  });
};
