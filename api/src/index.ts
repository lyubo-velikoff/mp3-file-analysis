import express from 'express';
import { config } from './config';
import fileUploadRoute from './routes/fileUpload.route';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();

// Parse JSON bodies (for potential future endpoints)
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// File upload endpoint
app.use('/file-upload', fileUploadRoute);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  console.info(`MP3 Analysis API running on port ${config.port}`);
  console.info(`Environment: ${config.nodeEnv}`);
  console.info(`Max file size: ${config.maxFileSize} bytes`);
});

export default app;
