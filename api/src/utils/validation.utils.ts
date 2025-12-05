import { InvalidFileError } from '../errors/AppError';

/**
 * Allowed MIME types for MP3 files
 */
const ALLOWED_MIME_TYPES = ['audio/mpeg', 'audio/mp3'] as const;

/**
 * Validates that a file was uploaded
 */
export function validateFilePresent(
  file: Express.Multer.File | undefined
): asserts file is Express.Multer.File {
  if (!file) {
    throw new InvalidFileError('No file uploaded. Please upload an MP3 file.');
  }
}

/**
 * Validates that the uploaded file has an acceptable MIME type
 * Note: MIME type detection is not always reliable, so we also check the extension
 */
export function validateFileMimeType(file: Express.Multer.File): void {
  const mimeType = file.mimetype.toLowerCase();
  const fileName = file.originalname.toLowerCase();

  // Check MIME type
  const validMimeType = ALLOWED_MIME_TYPES.some((allowed) => mimeType.includes(allowed));

  // Check file extension as fallback
  const hasValidExtension = fileName.endsWith('.mp3');

  if (!validMimeType && !hasValidExtension) {
    throw new InvalidFileError(
      `Invalid file type: ${file.mimetype}. Only MP3 files are accepted.`
    );
  }
}

/**
 * Validates that the file is not empty
 */
export function validateFileNotEmpty(file: Express.Multer.File): void {
  if (file.size === 0) {
    throw new InvalidFileError('Uploaded file is empty.');
  }
}

/**
 * Runs all file validations
 */
export function validateUploadedFile(file: Express.Multer.File | undefined): Express.Multer.File {
  validateFilePresent(file);
  validateFileNotEmpty(file);
  validateFileMimeType(file);
  return file;
}
