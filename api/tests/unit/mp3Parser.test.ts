import * as fs from 'fs';
import * as path from 'path';
import { countMp3Frames, validateMp3Buffer, _internal } from '../../src/services/mp3Parser.service';
import { InvalidMp3Error } from '../../src/errors/AppError';
import { MpegVersion, MpegLayer, ChannelMode } from '../../src/types/mp3.types';

const {
  decodeSynchsafeInt,
  parseId3v2Tag,
  hasId3v1Tag,
  isValidSyncWord,
  parseFrameHeader,
} = _internal;

// Path to test data
const DATA_DIR = path.join(__dirname, '..', '..', '..', 'data');

describe('MP3 Parser Service', () => {
  describe('decodeSynchsafeInt', () => {
    it('should decode synchsafe integer correctly', () => {
      // 0x00 0x00 0x00 0x7F = 127
      const buffer = Buffer.from([0x00, 0x00, 0x00, 0x7f]);
      expect(decodeSynchsafeInt(buffer, 0)).toBe(127);
    });

    it('should decode larger synchsafe integer', () => {
      // 0x00 0x00 0x01 0x00 = 128 (bit 7 of byte 2 set in 7-bit encoding)
      const buffer = Buffer.from([0x00, 0x00, 0x01, 0x00]);
      expect(decodeSynchsafeInt(buffer, 0)).toBe(128);
    });

    it('should decode synchsafe integer at offset', () => {
      const buffer = Buffer.from([0xff, 0xff, 0x00, 0x00, 0x00, 0x7f]);
      expect(decodeSynchsafeInt(buffer, 2)).toBe(127);
    });

    it('should handle maximum synchsafe value', () => {
      // 0x7F 0x7F 0x7F 0x7F = 268435455 (max 28-bit value)
      const buffer = Buffer.from([0x7f, 0x7f, 0x7f, 0x7f]);
      expect(decodeSynchsafeInt(buffer, 0)).toBe(268435455);
    });
  });

  describe('parseId3v2Tag', () => {
    it('should return null for buffer without ID3v2 tag', () => {
      const buffer = Buffer.from([0xff, 0xfb, 0x90, 0x00]); // MP3 frame header
      expect(parseId3v2Tag(buffer)).toBeNull();
    });

    it('should parse ID3v2 tag from sample file', () => {
      const filePath = path.join(DATA_DIR, 'sample (2).mp3');
      const buffer = fs.readFileSync(filePath);
      const tag = parseId3v2Tag(buffer);

      expect(tag).not.toBeNull();
      expect(tag?.version.major).toBe(4); // ID3v2.4
      expect(tag?.totalSize).toBeGreaterThan(10);
    });

    it('should parse ID3v2 tag from VBR test file', () => {
      const filePath = path.join(DATA_DIR, 'test-vbr-with-tags.mp3');
      const buffer = fs.readFileSync(filePath);
      const tag = parseId3v2Tag(buffer);

      expect(tag).not.toBeNull();
    });

    it('should return null for file without ID3v2 tag', () => {
      const filePath = path.join(DATA_DIR, 'test-cbr-no-tags.mp3');
      const buffer = fs.readFileSync(filePath);
      const tag = parseId3v2Tag(buffer);

      expect(tag).toBeNull();
    });
  });

  describe('hasId3v1Tag', () => {
    it('should return false for small buffer', () => {
      const buffer = Buffer.from([0x00, 0x00, 0x00]);
      expect(hasId3v1Tag(buffer)).toBe(false);
    });

    it('should return false for buffer without ID3v1 tag', () => {
      const filePath = path.join(DATA_DIR, 'sample (2).mp3');
      const buffer = fs.readFileSync(filePath);
      expect(hasId3v1Tag(buffer)).toBe(false);
    });

    it('should detect ID3v1 tag when present', () => {
      // Create a mock buffer ending with "TAG"
      const buffer = Buffer.alloc(200);
      buffer.write('TAG', 200 - 128);
      expect(hasId3v1Tag(buffer)).toBe(true);
    });
  });

  describe('isValidSyncWord', () => {
    it('should detect valid sync word', () => {
      const buffer = Buffer.from([0xff, 0xfb, 0x90, 0x00]);
      expect(isValidSyncWord(buffer, 0)).toBe(true);
    });

    it('should reject invalid first byte', () => {
      const buffer = Buffer.from([0xfe, 0xfb, 0x90, 0x00]);
      expect(isValidSyncWord(buffer, 0)).toBe(false);
    });

    it('should reject invalid second byte (not enough sync bits)', () => {
      const buffer = Buffer.from([0xff, 0x1f, 0x90, 0x00]); // Only 3 bits set, need 3 more
      expect(isValidSyncWord(buffer, 0)).toBe(false);
    });

    it('should handle offset correctly', () => {
      const buffer = Buffer.from([0x00, 0x00, 0xff, 0xfb, 0x90, 0x00]);
      expect(isValidSyncWord(buffer, 0)).toBe(false);
      expect(isValidSyncWord(buffer, 2)).toBe(true);
    });

    it('should return false for buffer too small', () => {
      const buffer = Buffer.from([0xff]);
      expect(isValidSyncWord(buffer, 0)).toBe(false);
    });
  });

  describe('parseFrameHeader', () => {
    it('should parse valid MPEG1 Layer3 frame header', () => {
      // 0xFF 0xFB = sync + MPEG1 + Layer3 + no CRC
      // 0x90 = 128kbps + 44100Hz + no padding
      // 0x00 = stereo
      const buffer = Buffer.from([0xff, 0xfb, 0x90, 0x00]);
      const header = parseFrameHeader(buffer, 0);

      expect(header).not.toBeNull();
      expect(header?.mpegVersion).toBe(MpegVersion.MPEG_1);
      expect(header?.layer).toBe(MpegLayer.LAYER_3);
      expect(header?.bitrate).toBe(128);
      expect(header?.sampleRate).toBe(44100);
      expect(header?.hasCrc).toBe(false);
      expect(header?.hasPadding).toBe(false);
      expect(header?.channelMode).toBe(ChannelMode.STEREO);
    });

    it('should calculate frame size correctly', () => {
      // 128kbps at 44100Hz, no padding
      // frameSize = floor(144 * 128000 / 44100) = 417
      const buffer = Buffer.from([0xff, 0xfb, 0x90, 0x00]);
      const header = parseFrameHeader(buffer, 0);

      expect(header?.frameSize).toBe(417);
    });

    it('should calculate frame size with padding', () => {
      // 128kbps at 44100Hz, with padding
      // frameSize = floor(144 * 128000 / 44100) + 1 = 418
      const buffer = Buffer.from([0xff, 0xfb, 0x92, 0x00]); // padding bit set
      const header = parseFrameHeader(buffer, 0);

      expect(header?.frameSize).toBe(418);
    });

    it('should return null for non-MPEG1 frames', () => {
      // MPEG2 frame
      const buffer = Buffer.from([0xff, 0xf3, 0x90, 0x00]);
      const header = parseFrameHeader(buffer, 0);

      expect(header).toBeNull();
    });

    it('should return null for non-Layer3 frames', () => {
      // Layer 2 frame
      const buffer = Buffer.from([0xff, 0xfd, 0x90, 0x00]);
      const header = parseFrameHeader(buffer, 0);

      expect(header).toBeNull();
    });

    it('should return null for invalid bitrate index', () => {
      // Bitrate index 0xF (invalid)
      const buffer = Buffer.from([0xff, 0xfb, 0xf0, 0x00]);
      const header = parseFrameHeader(buffer, 0);

      expect(header).toBeNull();
    });
  });

  describe('countMp3Frames', () => {
    it('should count frames correctly for sample file', () => {
      const filePath = path.join(DATA_DIR, 'sample (2).mp3');
      const buffer = fs.readFileSync(filePath);
      const result = countMp3Frames(buffer);

      // Verified against mediainfo
      expect(result.frameCount).toBe(6089);
      expect(result.id3v2Tag).not.toBeNull();
      expect(result.hasId3v1Tag).toBe(false);
    });

    it('should count frames correctly for CBR file without tags', () => {
      const filePath = path.join(DATA_DIR, 'test-cbr-no-tags.mp3');
      const buffer = fs.readFileSync(filePath);
      const result = countMp3Frames(buffer);

      // Verified against mediainfo
      expect(result.frameCount).toBe(193);
      expect(result.id3v2Tag).toBeNull();
      expect(result.hasId3v1Tag).toBe(false);
    });

    it('should count frames correctly for VBR file with tags', () => {
      const filePath = path.join(DATA_DIR, 'test-vbr-with-tags.mp3');
      const buffer = fs.readFileSync(filePath);
      const result = countMp3Frames(buffer);

      // Verified against mediainfo
      expect(result.frameCount).toBe(116);
      expect(result.id3v2Tag).not.toBeNull();
    });

    it('should count frames correctly for mono file', () => {
      const filePath = path.join(DATA_DIR, 'test-mono.mp3');
      const buffer = fs.readFileSync(filePath);
      const result = countMp3Frames(buffer);

      // Verified against mediainfo
      expect(result.frameCount).toBe(78);
    });

    it('should throw error for empty buffer', () => {
      const buffer = Buffer.alloc(0);
      expect(() => countMp3Frames(buffer)).toThrow(InvalidMp3Error);
    });

    it('should throw error for buffer with no valid frames', () => {
      const buffer = Buffer.alloc(1000, 0x00);
      expect(() => countMp3Frames(buffer)).toThrow(InvalidMp3Error);
    });
  });

  describe('validateMp3Buffer', () => {
    it('should not throw for valid MP3 file', () => {
      const filePath = path.join(DATA_DIR, 'sample (2).mp3');
      const buffer = fs.readFileSync(filePath);

      expect(() => validateMp3Buffer(buffer)).not.toThrow();
    });

    it('should not throw for MP3 without ID3 tags', () => {
      const filePath = path.join(DATA_DIR, 'test-cbr-no-tags.mp3');
      const buffer = fs.readFileSync(filePath);

      expect(() => validateMp3Buffer(buffer)).not.toThrow();
    });

    it('should throw for too small buffer', () => {
      const buffer = Buffer.from([0x00, 0x00, 0x00]);
      expect(() => validateMp3Buffer(buffer)).toThrow(InvalidMp3Error);
    });

    it('should throw for non-MP3 data', () => {
      const buffer = Buffer.alloc(1000, 0x00);
      expect(() => validateMp3Buffer(buffer)).toThrow(InvalidMp3Error);
    });
  });
});
