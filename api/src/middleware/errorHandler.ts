import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { ErrorResponse } from '../types/mp3.types';
import { config } from '../config';

/**
 * Global error handling middleware
 * Catches all errors and returns appropriate JSON responses
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response<ErrorResponse>,
  _next: NextFunction
): void {
  // Log error in development
  if (config.nodeEnv === 'development') {
    console.error('Error:', err);
  }

  // Handle our custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
    });
    return;
  }

  // Handle Multer errors
  if (err.name === 'MulterError') {
    const multerError = err as Error & { code?: string };
    let message = 'File upload error';

    switch (multerError.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected field in form data';
        break;
      default:
        message = multerError.message;
    }

    res.status(400).json({ error: message });
    return;
  }

  // Handle unknown errors
  res.status(500).json({
    error: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
  });
}

/**
 * Middleware for handling 404 Not Found
 */
export function notFoundHandler(_req: Request, res: Response<ErrorResponse>): void {
  res.status(404).json({
    error: 'Endpoint not found',
  });
}
