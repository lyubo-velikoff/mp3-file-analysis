# MP3 File Analysis API

A TypeScript-based REST API that analyzes MP3 files and returns the number of audio frames. Built with Express.js, featuring custom MP3 parsing logic without external parsing libraries.

## Features

- Counts MPEG Version 1 Layer 3 audio frames
- Handles ID3v2 tags (with proper synchsafe integer decoding)
- Handles ID3v1 tags
- Detects and excludes Xing/Info metadata frames from count
- Supports Variable Bit Rate (VBR) and Constant Bit Rate (CBR) files
- Comprehensive error handling with appropriate HTTP status codes

## Requirements

- Node.js >= 18.0.0
- npm or yarn

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd mp3-file-analysis

# Install dependencies
cd api
npm install
```

## Running the Application

### Development Mode

```bash
cd api
npm run dev
```

The server will start on `http://localhost:3000` with hot-reloading enabled.

### Production Mode

```bash
cd api
npm run build
npm start
```

## API Documentation

### POST /file-upload

Accepts an MP3 file and returns the frame count.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: Form field `file` containing the MP3 file

**Example using curl:**

```bash
curl -X POST -F "file=@path/to/your/file.mp3" http://localhost:3000/file-upload
```

**Success Response (200 OK):**

```json
{
  "frameCount": 6089
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | No file uploaded, empty file, or invalid file type |
| 422 | Invalid MP3 structure or unsupported format |
| 500 | Internal server error |

Error response format:
```json
{
  "error": "Error message description"
}
```

### GET /health

Health check endpoint.

**Response (200 OK):**
```json
{
  "status": "ok"
}
```

## Testing

### Run All Tests

```bash
cd api
npm test
```

### Run Tests with Coverage

```bash
cd api
npm run test:coverage
```

### Watch Mode

```bash
cd api
npm run test:watch
```

## Test Files

Sample MP3 files are provided in the `data/` directory:

| File | Frame Count | Description |
|------|-------------|-------------|
| sample (2).mp3 | 6089 | Original sample file (VBR, ID3v2 tags) |
| test-cbr-no-tags.mp3 | 193 | CBR 128kbps, no ID3 tags |
| test-vbr-with-tags.mp3 | 116 | VBR, with ID3v2 tags |
| test-mono.mp3 | 78 | Mono, 64kbps |

All frame counts are verified against `mediainfo`.

## Verification

You can verify the frame count using mediainfo:

```bash
mediainfo --Output="Audio;%FrameCount%" path/to/file.mp3
```

## Project Structure

```
mp3-file-analysis/
├── api/
│   ├── src/
│   │   ├── index.ts                 # Express entry point
│   │   ├── config/
│   │   │   └── index.ts             # Environment configuration
│   │   ├── routes/
│   │   │   └── fileUpload.route.ts  # File upload endpoint
│   │   ├── services/
│   │   │   └── mp3Parser.service.ts # Custom MP3 parsing logic
│   │   ├── types/
│   │   │   └── mp3.types.ts         # TypeScript interfaces
│   │   ├── middleware/
│   │   │   └── errorHandler.ts      # Error handling middleware
│   │   └── errors/
│   │       └── AppError.ts          # Custom error classes
│   ├── tests/
│   │   ├── unit/
│   │   │   └── mp3Parser.test.ts    # Parser unit tests
│   │   └── integration/
│   │       └── fileUpload.test.ts   # API integration tests
│   ├── package.json
│   ├── tsconfig.json
│   └── jest.config.js
├── data/                            # Test MP3 files
└── README.md
```

## Technical Details

### MP3 Parsing

The MP3 parser implements:

1. **ID3v2 Tag Detection**: Recognizes the "ID3" marker and parses the tag size using synchsafe integer encoding (28-bit values stored in 4 bytes where each byte's MSB is 0).

2. **Frame Sync Detection**: Validates the 11-bit sync word (0xFF followed by 0xE0 or higher).

3. **Frame Header Parsing**: Extracts MPEG version, layer, bitrate, sample rate, padding, and channel mode from the 4-byte frame header.

4. **Frame Size Calculation**: Uses the formula `floor(144 * bitrate / sampleRate) + padding` for MPEG1 Layer 3.

5. **Xing/Info Frame Detection**: Identifies and excludes VBR info frames from the audio frame count.

### Supported Format

- MPEG Version 1
- Layer 3
- All standard bitrates (32-320 kbps)
- All standard sample rates (32000, 44100, 48000 Hz)
- Mono, Stereo, Joint Stereo, Dual Channel

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot-reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Start production server |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Server port |
| NODE_ENV | development | Environment (development/production) |
| MAX_FILE_SIZE | 52428800 | Maximum upload size in bytes (50MB) |

## License

MIT
