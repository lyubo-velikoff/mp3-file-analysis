/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);

    // Set the prototype explicitly for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Error for invalid file uploads
 */
export class InvalidFileError extends AppError {
  constructor(message: string) {
    super(message, 400);
    Object.setPrototypeOf(this, InvalidFileError.prototype);
  }
}

/**
 * Error for invalid MP3 structure
 */
export class InvalidMp3Error extends AppError {
  constructor(message: string) {
    super(message, 422);
    Object.setPrototypeOf(this, InvalidMp3Error.prototype);
  }
}

/**
 * Error for unsupported MP3 format (e.g., MPEG-2)
 */
export class UnsupportedFormatError extends AppError {
  constructor(message: string) {
    super(message, 422);
    Object.setPrototypeOf(this, UnsupportedFormatError.prototype);
  }
}
