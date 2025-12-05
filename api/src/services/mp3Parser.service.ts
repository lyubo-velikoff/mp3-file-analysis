/**
 * MP3 Parser Service
 *
 * Custom implementation for counting audio frames in MPEG Version 1 Layer 3 files.
 *
 * ARCHITECTURAL DECISION: Memory-based vs Streaming Approach
 * -----------------------------------------------------------
 * This implementation reads the entire MP3 file into memory before parsing.
 *
 * WHY MEMORY-BASED:
 * 1. Correctness over complexity: MP3 frame parsing requires random access to detect
 *    ID3v2 tags at the start, ID3v1 tags at the end, and to recover from sync loss.
 *    Streaming implementations are significantly harder to get correct.
 *
 * 2. Sync word ambiguity: The 11-bit sync pattern (0xFF + 0xE0 mask) can appear
 *    within audio data. Proper validation requires reading ahead to verify frame
 *    structure, which complicates streaming.
 *
 * 3. VBR handling: Variable bitrate files have different frame sizes throughout,
 *    making it impossible to predict where the next frame starts without parsing.
 *
 * TRADE-OFFS:
 * - Memory usage: Entire file loaded into memory (mitigated by 50MB limit)
 * - Scalability: Very large files (>RAM) cannot be processed
 * - Latency: Must wait for full upload before processing begins
 *
 * ALTERNATIVE (Not implemented):
 * A streaming approach with a sliding buffer could work but requires:
 * - Buffering at least 2 frames to validate sync words
 * - Handling ID3v2 extended headers that can be megabytes
 * - Complex state machine for partial frame handling
 * - Risk of off-by-one errors that are hard to detect
 *
 * For production with files >50MB, consider a hybrid approach:
 * - Stream the file to disk first
 * - Memory-map the file for random access
 * - Parse using the same proven algorithm
 */

import {
  MpegVersion,
  MpegLayer,
  ChannelMode,
  Mp3FrameHeader,
  Id3v2Tag,
  Mp3ParseResult,
} from '../types/mp3.types';
import { InvalidMp3Error } from '../errors/AppError';

/**
 * Bitrate table for MPEG Version 1, Layer 3
 * Index 0 = free, Index 15 = bad
 * Values in kbps
 */
const BITRATE_TABLE_V1_L3: readonly (number | null)[] = [
  null, // free (not supported)
  32,
  40,
  48,
  56,
  64,
  80,
  96,
  112,
  128,
  160,
  192,
  224,
  256,
  320,
  null, // bad
] as const;

/**
 * Sample rate table for MPEG Version 1
 * Index 3 = reserved
 * Values in Hz
 */
const SAMPLE_RATE_TABLE_V1: readonly (number | null)[] = [44100, 48000, 32000, null] as const;

/**
 * MP3 Frame Structure Constants
 * These define the byte offsets and sizes within MP3 frames
 */
const FRAME_HEADER_SIZE = 4; // MP3 frame header is always 4 bytes
const CRC_SIZE = 2; // CRC-16 checksum size when protection bit is set
const SIDE_INFO_SIZE_MONO = 17; // Side information size for mono channel
const SIDE_INFO_SIZE_STEREO = 32; // Side information size for stereo/joint/dual channel
const ID3V1_TAG_SIZE = 128; // ID3v1 tag is always 128 bytes at end of file
const ID3V2_HEADER_SIZE = 10; // ID3v2 header size (marker + version + flags + size)
const ID3V2_FOOTER_SIZE = 10; // ID3v2 footer size (only in v2.4)
const SYNC_RECOVERY_LIMIT = 4096; // Max bytes to scan when recovering from sync loss

/**
 * Decodes a synchsafe integer (used in ID3v2 tags)
 * Each byte only uses 7 bits (MSB is always 0)
 * Total: 28 bits of data in 4 bytes
 */
function decodeSynchsafeInt(buffer: Buffer, offset: number): number {
  const b0 = buffer[offset] ?? 0;
  const b1 = buffer[offset + 1] ?? 0;
  const b2 = buffer[offset + 2] ?? 0;
  const b3 = buffer[offset + 3] ?? 0;

  // Each byte contributes 7 bits
  return (b0 << 21) | (b1 << 14) | (b2 << 7) | b3;
}

/**
 * Parses ID3v2 tag if present at the beginning of the buffer
 * ID3v2 header format:
 * - 3 bytes: "ID3"
 * - 2 bytes: version (major, minor)
 * - 1 byte: flags
 * - 4 bytes: size (synchsafe integer)
 */
function parseId3v2Tag(buffer: Buffer): Id3v2Tag | null {
  // Check for "ID3" marker
  if (buffer.length < ID3V2_HEADER_SIZE) {
    return null;
  }

  const marker = buffer.toString('ascii', 0, 3);
  if (marker !== 'ID3') {
    return null;
  }

  const majorVersion = buffer[3] ?? 0;
  const minorVersion = buffer[4] ?? 0;
  const flags = buffer[5] ?? 0;

  // Parse flags
  const unsynchronisation = (flags & 0x80) !== 0;
  const extendedHeader = (flags & 0x40) !== 0;
  const experimental = (flags & 0x20) !== 0;
  const footer = (flags & 0x10) !== 0; // Only in ID3v2.4

  // Size is stored as synchsafe integer (excludes header)
  const size = decodeSynchsafeInt(buffer, 6);

  // Total size = header + size + footer (if present)
  const totalSize = ID3V2_HEADER_SIZE + size + (footer ? ID3V2_FOOTER_SIZE : 0);

  return {
    version: {
      major: majorVersion,
      minor: minorVersion,
    },
    flags: {
      unsynchronisation,
      extendedHeader,
      experimental,
      footer,
    },
    size,
    totalSize,
  };
}

/**
 * Checks for ID3v1 tag at the end of the file
 * ID3v1 is always 128 bytes at the end, starting with "TAG"
 */
function hasId3v1Tag(buffer: Buffer): boolean {
  if (buffer.length < ID3V1_TAG_SIZE) {
    return false;
  }

  const tagStart = buffer.length - ID3V1_TAG_SIZE;
  const marker = buffer.toString('ascii', tagStart, tagStart + 3);
  return marker === 'TAG';
}

/**
 * Validates if the bytes at the given offset form a valid MP3 frame sync
 * Sync word is 11 bits, all set to 1:
 * - First byte: 0xFF (all 8 bits set)
 * - Second byte: top 3 bits set (0xE0 mask)
 */
function isValidSyncWord(buffer: Buffer, offset: number): boolean {
  if (offset + 1 >= buffer.length) {
    return false;
  }

  const byte1 = buffer[offset];
  const byte2 = buffer[offset + 1];

  if (byte1 === undefined || byte2 === undefined) {
    return false;
  }

  // Check all 11 sync bits
  return byte1 === 0xff && (byte2 & 0xe0) === 0xe0;
}

/**
 * Parses an MP3 frame header at the given offset
 * Frame header is 4 bytes:
 * - Byte 1: Sync (8 bits)
 * - Byte 2: Sync (3) + Version (2) + Layer (2) + Protection (1)
 * - Byte 3: Bitrate (4) + Sample rate (2) + Padding (1) + Private (1)
 * - Byte 4: Channel mode (2) + Mode ext (2) + Copyright (1) + Original (1) + Emphasis (2)
 */
function parseFrameHeader(buffer: Buffer, offset: number): Mp3FrameHeader | null {
  if (offset + FRAME_HEADER_SIZE > buffer.length) {
    return null;
  }

  if (!isValidSyncWord(buffer, offset)) {
    return null;
  }

  const byte2 = buffer[offset + 1];
  const byte3 = buffer[offset + 2];
  const byte4 = buffer[offset + 3];

  if (byte2 === undefined || byte3 === undefined || byte4 === undefined) {
    return null;
  }

  // Extract fields from byte 2
  const versionBits = (byte2 >> 3) & 0x03;
  const layerBits = (byte2 >> 1) & 0x03;
  const protectionBit = byte2 & 0x01;

  // Extract fields from byte 3
  const bitrateIndex = (byte3 >> 4) & 0x0f;
  const sampleRateIndex = (byte3 >> 2) & 0x03;
  const paddingBit = (byte3 >> 1) & 0x01;

  // Extract fields from byte 4
  const channelModeBits = (byte4 >> 6) & 0x03;

  // Convert to enums
  const mpegVersion = versionBits as MpegVersion;
  const layer = layerBits as MpegLayer;
  const channelMode = channelModeBits as ChannelMode;

  // Validate MPEG Version 1 (required by spec)
  if (mpegVersion !== MpegVersion.MPEG_1) {
    return null; // Skip non-MPEG1 frames
  }

  // Validate Layer 3 (required by spec)
  if (layer !== MpegLayer.LAYER_3) {
    return null; // Skip non-Layer3 frames
  }

  // Get bitrate
  const bitrate = BITRATE_TABLE_V1_L3[bitrateIndex];
  if (bitrate === null || bitrate === undefined) {
    return null; // Invalid or free bitrate
  }

  // Get sample rate
  const sampleRate = SAMPLE_RATE_TABLE_V1[sampleRateIndex];
  if (sampleRate === null || sampleRate === undefined) {
    return null; // Invalid sample rate
  }

  const hasPadding = paddingBit === 1;
  const hasCrc = protectionBit === 0; // 0 means CRC is present

  // Calculate frame size for MPEG1 Layer 3
  // Formula: floor(144 * bitrate * 1000 / sampleRate) + padding
  const frameSize = Math.floor((144 * bitrate * 1000) / sampleRate) + (hasPadding ? 1 : 0);

  return {
    mpegVersion,
    layer,
    hasCrc,
    bitrate,
    sampleRate,
    hasPadding,
    channelMode,
    frameSize,
  };
}

/**
 * Checks if a frame contains a Xing or Info VBR header
 * This frame is metadata, not actual audio data, and should not be counted
 *
 * The Xing/Info header location depends on channel mode:
 * - Mono: 17 bytes after frame header (21 with CRC)
 * - Stereo/Joint/Dual: 32 bytes after frame header (36 with CRC)
 */
function isXingInfoFrame(buffer: Buffer, frameOffset: number, header: Mp3FrameHeader): boolean {
  // Calculate offset to Xing/Info header within the frame
  // Structure: [Frame Header (4)] + [CRC if present (2)] + [Side Info] + [Xing/Info marker (4)]
  const sideInfoSize =
    header.channelMode === ChannelMode.MONO ? SIDE_INFO_SIZE_MONO : SIDE_INFO_SIZE_STEREO;

  let xingOffset = frameOffset + FRAME_HEADER_SIZE + sideInfoSize;

  // Adjust for CRC if present (CRC comes immediately after frame header)
  if (header.hasCrc) {
    xingOffset += CRC_SIZE;
  }

  // Check if we have enough bytes to read the 4-byte marker
  if (xingOffset + FRAME_HEADER_SIZE > buffer.length) {
    return false;
  }

  // Check for "Xing" (VBR) or "Info" (CBR) marker
  const marker = buffer.toString('ascii', xingOffset, xingOffset + 4);
  return marker === 'Xing' || marker === 'Info';
}

/**
 * Finds the start position of audio data (after ID3v2 tag if present)
 */
function findAudioStart(buffer: Buffer): number {
  const id3Tag = parseId3v2Tag(buffer);
  if (id3Tag) {
    return id3Tag.totalSize;
  }
  return 0;
}

/**
 * Finds the end position of audio data (before ID3v1 tag if present)
 */
function findAudioEnd(buffer: Buffer): number {
  if (hasId3v1Tag(buffer)) {
    return buffer.length - ID3V1_TAG_SIZE;
  }
  return buffer.length;
}

/**
 * Main function to count MP3 frames in a buffer
 * This is the core parsing logic that:
 * 1. Skips ID3v2 tag at the start
 * 2. Excludes ID3v1 tag at the end
 * 3. Finds and validates each frame
 * 4. Calculates frame size and jumps to next frame
 */
export function countMp3Frames(buffer: Buffer): Mp3ParseResult {
  if (buffer.length === 0) {
    throw new InvalidMp3Error('Empty file provided');
  }

  const id3v2Tag = parseId3v2Tag(buffer);
  const id3v1Present = hasId3v1Tag(buffer);

  const audioStart = findAudioStart(buffer);
  const audioEnd = findAudioEnd(buffer);

  if (audioStart >= audioEnd) {
    throw new InvalidMp3Error('No audio data found in file');
  }

  let frameCount = 0;
  let position = audioStart;
  let foundFirstFrame = false;

  while (position < audioEnd) {
    // Try to parse frame at current position
    const header = parseFrameHeader(buffer, position);

    if (header) {
      // Check if this is a Xing/Info metadata frame (should not be counted as audio)
      const isMetadataFrame = !foundFirstFrame && isXingInfoFrame(buffer, position, header);

      if (!isMetadataFrame) {
        // Valid audio frame found
        frameCount++;
      }

      foundFirstFrame = true;

      // Move to next frame
      position += header.frameSize;
    } else {
      // No valid frame at this position
      if (!foundFirstFrame) {
        // Still looking for first frame - scan byte by byte
        position++;
      } else {
        // We've been finding frames, but this one is invalid
        // This might be the end of audio data or corruption
        // Try to find next sync word within a reasonable range
        let found = false;
        for (let i = position + 1; i < Math.min(position + SYNC_RECOVERY_LIMIT, audioEnd); i++) {
          if (isValidSyncWord(buffer, i)) {
            const nextHeader = parseFrameHeader(buffer, i);
            if (nextHeader) {
              position = i;
              found = true;
              break;
            }
          }
        }

        if (!found) {
          // No more valid frames found
          break;
        }
      }
    }
  }

  if (frameCount === 0) {
    throw new InvalidMp3Error('No valid MPEG Version 1 Layer 3 frames found in file');
  }

  return {
    frameCount,
    id3v2Tag,
    hasId3v1Tag: id3v1Present,
  };
}

/**
 * Validates that a buffer appears to be an MP3 file
 * Checks for common MP3 signatures
 */
export function validateMp3Buffer(buffer: Buffer): void {
  if (buffer.length < ID3V2_HEADER_SIZE) {
    throw new InvalidMp3Error('File too small to be a valid MP3');
  }

  // Check for ID3v2 tag or frame sync
  const hasId3v2 = buffer.toString('ascii', 0, 3) === 'ID3';
  const hasFrameSync = isValidSyncWord(buffer, 0);

  if (!hasId3v2 && !hasFrameSync) {
    // Try to find a frame sync in the first few KB
    let foundSync = false;
    for (let i = 0; i < Math.min(buffer.length, SYNC_RECOVERY_LIMIT); i++) {
      if (isValidSyncWord(buffer, i)) {
        const header = parseFrameHeader(buffer, i);
        if (header) {
          foundSync = true;
          break;
        }
      }
    }

    if (!foundSync) {
      throw new InvalidMp3Error('File does not appear to be a valid MP3 file');
    }
  }
}

// Export helper functions for testing
export const _internal = {
  decodeSynchsafeInt,
  parseId3v2Tag,
  hasId3v1Tag,
  isValidSyncWord,
  parseFrameHeader,
  isXingInfoFrame,
  findAudioStart,
  findAudioEnd,
};
