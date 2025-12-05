# Implementation Plan - MP3 File Analysis API

## Research Validation (2025-12-05)

### Framework & Library Choices - VALIDATED
- **Express**: Appropriate for this task - familiar, battle-tested, matches expectations
- **Multer**: Correct choice - Express-native, uses Busboy internally, memory storage for parsing
- **Project Structure**: Service-layered architecture with config module added

### Sources Consulted:
- [Express TypeScript Best Practices 2025](https://dev.to/pramod_boda/recommended-folder-structure-for-nodets-2025-39jl)
- [Multer vs Busboy vs Formidable Comparison](https://npm-compare.com/busboy,formidable,multer)
- [ID3v2 Tag Specification](https://id3.org/id3v2.3.0)
- [MP3 Frame Header Structure](http://www.mp3-tech.org/programmer/frame_header.html)

---

## Verified Sample Data

Using `mediainfo`, the sample file has:
- **Frame count: 6089** (our target - verified against Xing header)
- Format: MPEG Version 1, Layer 3
- Sample rate: 44100 Hz
- VBR (Variable Bit Rate)
- Samples per frame: 1152
- Contains: ID3v2 tag + Xing header in first frame

## Technical Approach

### MP3 Frame Structure

An MP3 file consists of:
1. Optional ID3v2 tag at the beginning (variable length)
2. Audio frames (what we need to count)
3. Optional ID3v1 tag at the end (128 bytes)

Each MP3 frame header is 4 bytes:
```
Byte 1:   Sync (8 bits, all 1s = 0xFF)
Byte 2:   Sync (3 bits) + Version (2 bits) + Layer (2 bits) + Protection (1 bit)
Byte 3:   Bitrate (4 bits) + Sample rate (2 bits) + Padding (1 bit) + Private (1 bit)
Byte 4:   Channel mode (2 bits) + Mode ext (2 bits) + Copyright + Original + Emphasis (2 bits)
```

For MPEG Version 1 Layer 3:
- Sync word: First 11 bits must be 1 (0xFF followed by 0xE0 or higher)
- Frame size = floor(144 * bitrate / sample_rate) + padding

### Key Implementation Considerations

1. **ID3v2 Detection**: Check for "ID3" at file start, parse extended header to find audio start
2. **ID3v1 Detection**: Last 128 bytes starting with "TAG"
3. **Frame sync validation**: Must validate all 11 sync bits, not just first byte
4. **VBR handling**: Each frame can have different bitrate, must calculate size per frame
5. **Padding bit**: Adds 1 byte to frame when set

## Project Structure

```
src/
├── index.ts                    # Entry point, Express app
├── routes/
│   └── fileUpload.route.ts     # Route handler
├── services/
│   └── mp3Parser.service.ts    # Core MP3 parsing logic
├── types/
│   └── mp3.types.ts            # TypeScript interfaces
├── utils/
│   └── validation.utils.ts     # File validation utilities
└── errors/
    └── AppError.ts             # Custom error classes

tests/
├── unit/
│   └── mp3Parser.test.ts       # Unit tests for parser
├── integration/
│   └── fileUpload.test.ts      # API tests
└── fixtures/
    └── (test mp3 files)
```

## Dependencies

### Production
- `express` - HTTP framework
- `multer` - File upload handling

### Development
- `typescript`
- `@types/express`, `@types/multer`, `@types/node`
- `jest`, `ts-jest`, `@types/jest` - Testing
- `supertest`, `@types/supertest` - API testing
- `eslint`, `@typescript-eslint/*` - Linting
- `prettier` - Formatting
- `tsx` or `ts-node` - Running TypeScript

## Bitrate & Sample Rate Tables

### MPEG Version 1, Layer 3 Bitrates (in kbps)
Index 0-15: [free, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, bad]

### Sample Rates for MPEG Version 1
Index 0-3: [44100, 48000, 32000, reserved]

## Error Handling Strategy

1. Invalid file type → 400 Bad Request
2. Invalid MP3 structure → 422 Unprocessable Entity
3. Empty file → 400 Bad Request
4. Server errors → 500 Internal Server Error

All errors return JSON:
```json
{
  "error": "descriptive message"
}
```

## Testing Strategy

1. **Unit tests**: Test parser functions with raw byte buffers
2. **Integration tests**: Test full API with file uploads
3. **Fixtures**: Create small valid MP3 files for testing edge cases
4. **Verification**: Cross-reference with mediainfo for all test files

## CRITICAL: ID3v2 Synchsafe Integer Decoding

ID3v2 tag size uses "synchsafe" encoding (28 bits, not 32):
```typescript
// WRONG - will give incorrect offset:
const size = (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;

// CORRECT - synchsafe decoding:
const size = (b0 << 21) | (b1 << 14) | (b2 << 7) | b3;
```

## CRITICAL: Off-by-One Prevention

Common causes identified from previous candidates:
1. Wrong ID3v2 boundary calculation (synchsafe vs regular int)
2. Not counting Xing/Info frame (it IS a valid frame)
3. Missing partial frame at end of file
4. Starting count from wrong offset

## Avoiding Common Pitfalls (from feedback)

- [ ] Verify exact frame count matches mediainfo (6089 for sample)
- [ ] Handle ID3v2 tags correctly (synchsafe integer decoding!)
- [ ] Don't use arbitrary file size limits
- [ ] Test with multiple MP3 files before submission
- [ ] Use explicit types, not just inference
- [ ] Consistent code style throughout
- [ ] Tests that actually verify frame counting logic (not just "returns a number")
- [ ] Keep it simple - no unnecessary complexity (no serverless, no streaming)
