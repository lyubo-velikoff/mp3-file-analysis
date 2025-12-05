import express from 'express';
import { config } from './config';
import fileUploadRoute from './routes/fileUpload.route';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();

// CORS middleware
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (_req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

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

// Start server only when not running on Vercel
if (!process.env.VERCEL) {
  app.listen(config.port, () => {
    console.info(`MP3 Analysis API running on port ${config.port}`);
    console.info(`Environment: ${config.nodeEnv}`);
    console.info(`Max file size: ${config.maxFileSize} bytes`);
  });
}

// Export for Vercel serverless
export default app;
