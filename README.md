# MP3 File Analysis

A REST API that counts audio frames in MP3 files, with a web UI. Built with TypeScript, Express.js, and Next.js, featuring custom MP3 parsing.

**Live UI:** https://mp3-analyzer-ui.vercel.app

**Live API:** https://mp3-file-analysis.vercel.app

## Try It

```bash
curl -X POST -F "file=@your-file.mp3" https://mp3-file-analysis.vercel.app/file-upload
```

## Local Development

```bash
# API (runs on port 3001)
cd api
npm install
npm run dev

# UI (runs on port 3000)
cd ui
npm install
npm run dev
```

## API Usage

### POST /file-upload

Upload an MP3 file to get the frame count.

```bash
# Using the provided sample file
curl -X POST -F "file=@data/sample.mp3" http://localhost:3001/file-upload
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

### API Tests

```bash
cd api
npm test
```

### UI Tests

```bash
cd ui
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### Test Files

Sample MP3 files in `data/`:

| File | Frame Count |
|------|-------------|
| sample.mp3 | 6089 |
| test-cbr-no-tags.mp3 | 193 |
| test-vbr-with-tags.mp3 | 116 |
| test-mono.mp3 | 78 |
| we-are-the-dreamers.mp3 | 8340 |

Frame counts verified with `mediainfo`.

### Verifying Frame Counts

Install mediainfo to verify frame counts:

```bash
# macOS
brew install mediainfo

# Ubuntu/Debian
sudo apt-get install mediainfo

# Windows (via Chocolatey)
choco install mediainfo-cli
```

Check frame count of any MP3 file:

```bash
mediainfo --Inform="Audio;%FrameCount%" path/to/file.mp3
```

## Project Structure

```
mp3-file-analysis/
├── api/                          # Express.js API
│   ├── src/
│   │   ├── index.ts              # Express server
│   │   ├── routes/               # API endpoints
│   │   ├── services/             # MP3 parsing logic
│   │   ├── types/                # TypeScript interfaces
│   │   ├── middleware/           # Error handling
│   │   └── errors/               # Custom error classes
│   └── tests/                    # Unit & integration tests
├── ui/                           # Next.js frontend
│   ├── src/app/                  # App router pages
│   ├── src/components/           # React components
│   └── src/__tests__/            # Unit tests
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

## Architecture Decision: Memory-Based Parsing

This implementation reads the entire MP3 file into memory before parsing, rather than using a streaming approach.

**Why this approach:**
- **Correctness**: MP3 parsing requires random access (ID3v2 at start, ID3v1 at end, sync recovery)
- **Sync word validation**: The 11-bit sync pattern can appear in audio data; validation requires lookahead
- **VBR support**: Variable bitrate files have unpredictable frame sizes

**Trade-offs:**
- Memory usage scales with file size (mitigated by 50MB limit)
- Full upload required before processing begins

See `api/src/services/mp3Parser.service.ts` for detailed architectural notes.

## Deployment Limitations

The live API is deployed on Vercel's free tier, which has payload size limits. Large MP3 files (typically >4.5MB) will return:

```
Request Entity Too Large
FUNCTION_PAYLOAD_TOO_LARGE
```

For larger files, run the API locally where there are no such restrictions (default limit: 50MB).

## Future Improvements

With additional time, the following enhancements would add value:

### High Priority
- **Streaming with disk buffering**: For files >50MB, stream to disk first, then memory-map for parsing
- **Request timeout handling**: Add configurable timeout for long-running parse operations
- **Rate limiting**: Per-IP rate limiting to prevent abuse in production
- **Memory exhaustion protection**: Currently, multiple concurrent large uploads could cause OOM crashes. Add memory guards to check available heap before parsing and reject requests when memory is low. Also consider limiting concurrent uploads.
- **Graceful degradation**: Catch Buffer allocation failures and return proper 503 "Service temporarily unavailable" instead of crashing

### Medium Priority
- **MPEG2/2.5 support**: Extend parser to handle older/lower-quality MP3 formats
- **Detailed parse results**: Return additional metadata (duration, average bitrate, channel info)
- **Progress reporting**: WebSocket or SSE endpoint for real-time parse progress on large files

### Low Priority
- **Batch processing**: Accept multiple files in single request
- **Audio validation**: Verify frame audio data integrity beyond header parsing
- **Caching layer**: Cache results for identical files (by content hash)

### Testing Enhancements
- **E2E tests**: Add Playwright tests for UI-to-API integration
- **Performance benchmarks**: Automated performance regression tests
- **Fuzzing**: Property-based testing with randomly generated MP3-like data
