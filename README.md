# MP3 File Analysis API

A REST API that counts audio frames in MP3 files. Built with TypeScript and Express.js, with custom MP3 parsing (no external parsing libraries).

## Quick Start

```bash
# Install dependencies
cd api
npm install

# Start the server
npm run dev
```

Server runs at `http://localhost:3000`

## API Usage

### POST /file-upload

Upload an MP3 file to get the frame count.

```bash
# Using the provided sample file
curl -X POST -F "file=@data/sample.mp3" http://localhost:3000/file-upload
```

**Response:**
```json
{
  "frameCount": 6089
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| 400 | No file uploaded, empty file, or invalid file type |
| 422 | Invalid MP3 structure or unsupported format |

## Testing

```bash
cd api
npm test
```

### Test Files

Sample MP3 files in `data/`:

| File | Frame Count |
|------|-------------|
| sample.mp3 | 6089 |
| test-cbr-no-tags.mp3 | 193 |
| test-vbr-with-tags.mp3 | 116 |
| test-mono.mp3 | 78 |

Frame counts verified with `mediainfo`.

## Project Structure

```
mp3-file-analysis/
├── api/
│   ├── src/
│   │   ├── index.ts              # Express server
│   │   ├── routes/               # API endpoints
│   │   ├── services/             # MP3 parsing logic
│   │   ├── types/                # TypeScript interfaces
│   │   ├── middleware/           # Error handling
│   │   └── errors/               # Custom error classes
│   └── tests/                    # Unit & integration tests
├── data/                         # Sample MP3 files
└── README.md
```

## Available Scripts

```bash
npm run dev          # Start dev server with hot-reload
npm run build        # Compile TypeScript
npm start            # Start production server
npm test             # Run tests
npm run lint         # Run ESLint
```

## Technical Notes

- Supports MPEG Version 1 Layer 3 files
- Handles ID3v2 and ID3v1 tags
- Correctly excludes Xing/Info metadata frames from count
- Supports VBR and CBR files
