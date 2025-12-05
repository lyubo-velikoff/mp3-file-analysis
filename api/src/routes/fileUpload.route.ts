import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { config } from '../config';
import { validateUploadedFile } from '../utils/validation.utils';
import { countMp3Frames, validateMp3Buffer } from '../services/mp3Parser.service';
import { FrameCountResponse } from '../types/mp3.types';

const router = Router();

/**
 * Configure Multer for memory storage
 * Files are stored in memory as Buffer objects for direct parsing
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxFileSize,
  },
});

/**
 * POST /file-upload
 * Accepts an MP3 file and returns the frame count
 *
 * Request: multipart/form-data with 'file' field
 * Response: { "frameCount": number }
 */
router.post(
  '/',
  upload.single('file'),
  (req: Request, res: Response<FrameCountResponse>, next: NextFunction): void => {
    try {
      // Validate the uploaded file
      const file = validateUploadedFile(req.file);

      // Validate that it appears to be an MP3
      validateMp3Buffer(file.buffer);

      // Count the frames
      const result = countMp3Frames(file.buffer);

      // Log info in development
      if (config.nodeEnv === 'development') {
        console.info(`Processed file: ${file.originalname}`);
        console.info(`  ID3v2 tag: ${result.id3v2Tag ? 'yes' : 'no'}`);
        console.info(`  ID3v1 tag: ${result.hasId3v1Tag ? 'yes' : 'no'}`);
        console.info(`  Frame count: ${result.frameCount}`);
      }

      // Return the frame count
      res.json({
        frameCount: result.frameCount,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
