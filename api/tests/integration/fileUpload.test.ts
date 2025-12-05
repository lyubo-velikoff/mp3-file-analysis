import request from 'supertest';
import * as path from 'path';
import express from 'express';
import fileUploadRoute from '../../src/routes/fileUpload.route';
import { errorHandler, notFoundHandler } from '../../src/middleware/errorHandler';
import { FrameCountResponse, ErrorResponse } from '../../src/types/mp3.types';

// Create test app
const app = express();
app.use(express.json());
app.use('/file-upload', fileUploadRoute);
app.use(notFoundHandler);
app.use(errorHandler);

// Path to test data
const DATA_DIR = path.join(__dirname, '..', '..', '..', 'data');

describe('POST /file-upload', () => {
  describe('Success cases', () => {
    it('should return correct frame count for sample file', async () => {
      const response = await request(app)
        .post('/file-upload')
        .attach('file', path.join(DATA_DIR, 'sample (2).mp3'));

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toEqual({ frameCount: 6089 });
    });

    it('should return correct frame count for CBR file without tags', async () => {
      const response = await request(app)
        .post('/file-upload')
        .attach('file', path.join(DATA_DIR, 'test-cbr-no-tags.mp3'));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ frameCount: 193 });
    });

    it('should return correct frame count for VBR file with tags', async () => {
      const response = await request(app)
        .post('/file-upload')
        .attach('file', path.join(DATA_DIR, 'test-vbr-with-tags.mp3'));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ frameCount: 116 });
    });

    it('should return correct frame count for mono file', async () => {
      const response = await request(app)
        .post('/file-upload')
        .attach('file', path.join(DATA_DIR, 'test-mono.mp3'));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ frameCount: 78 });
    });
  });

  describe('Error cases', () => {
    it('should return 400 when no file is uploaded', async () => {
      const response = await request(app).post('/file-upload');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect((response.body as ErrorResponse).error).toContain('No file uploaded');
    });

    it('should return 400 for invalid file type', async () => {
      // Create a text file buffer
      const textBuffer = Buffer.from('This is not an MP3 file');

      const response = await request(app)
        .post('/file-upload')
        .attach('file', textBuffer, {
          filename: 'test.txt',
          contentType: 'text/plain',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for empty file', async () => {
      const emptyBuffer = Buffer.alloc(0);

      const response = await request(app)
        .post('/file-upload')
        .attach('file', emptyBuffer, {
          filename: 'empty.mp3',
          contentType: 'audio/mpeg',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 422 for invalid MP3 structure', async () => {
      // Create a buffer that passes MIME check but has invalid MP3 structure
      const fakeMP3 = Buffer.alloc(1000);
      fakeMP3.write('ID3'); // Start with ID3 marker
      fakeMP3[3] = 4; // Version
      fakeMP3[4] = 0;
      fakeMP3[5] = 0; // Flags
      // Size (synchsafe): 0x00 0x00 0x00 0x10 = 16 bytes
      fakeMP3[6] = 0;
      fakeMP3[7] = 0;
      fakeMP3[8] = 0;
      fakeMP3[9] = 0x10;
      // Rest is zeros - no valid MP3 frames

      const response = await request(app)
        .post('/file-upload')
        .attach('file', fakeMP3, {
          filename: 'fake.mp3',
          contentType: 'audio/mpeg',
        });

      expect(response.status).toBe(422);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Response format', () => {
    it('should return JSON content type', async () => {
      const response = await request(app)
        .post('/file-upload')
        .attach('file', path.join(DATA_DIR, 'test-mono.mp3'));

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should return only frameCount property on success', async () => {
      const response = await request(app)
        .post('/file-upload')
        .attach('file', path.join(DATA_DIR, 'test-mono.mp3'));

      expect(Object.keys(response.body as FrameCountResponse)).toEqual(['frameCount']);
      expect(typeof (response.body as FrameCountResponse).frameCount).toBe('number');
    });

    it('should return error property on failure', async () => {
      const response = await request(app).post('/file-upload');

      expect(response.body).toHaveProperty('error');
      expect(typeof (response.body as ErrorResponse).error).toBe('string');
    });
  });
});

describe('Other endpoints', () => {
  it('should return 404 for unknown endpoints', async () => {
    const response = await request(app).get('/unknown');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Endpoint not found' });
  });

  it('should return 404 for GET /file-upload', async () => {
    const response = await request(app).get('/file-upload');

    expect(response.status).toBe(404);
  });
});
