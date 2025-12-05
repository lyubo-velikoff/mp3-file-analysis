/**
 * MPEG Audio Version
 * We only support MPEG Version 1 as per requirements
 */
export enum MpegVersion {
  MPEG_2_5 = 0, // Not supported
  RESERVED = 1, // Invalid
  MPEG_2 = 2, // Not supported
  MPEG_1 = 3, // Supported
}

/**
 * MPEG Audio Layer
 * We only support Layer 3 as per requirements
 */
export enum MpegLayer {
  RESERVED = 0, // Invalid
  LAYER_3 = 1, // Supported
  LAYER_2 = 2, // Not supported
  LAYER_1 = 3, // Not supported
}

/**
 * Channel mode for the audio
 */
export enum ChannelMode {
  STEREO = 0,
  JOINT_STEREO = 1,
  DUAL_CHANNEL = 2,
  MONO = 3,
}

/**
 * Parsed MP3 frame header information
 */
export interface Mp3FrameHeader {
  mpegVersion: MpegVersion;
  layer: MpegLayer;
  hasCrc: boolean;
  bitrate: number; // in kbps
  sampleRate: number; // in Hz
  hasPadding: boolean;
  channelMode: ChannelMode;
  frameSize: number; // calculated frame size in bytes
}

/**
 * ID3v2 tag information
 */
export interface Id3v2Tag {
  version: {
    major: number;
    minor: number;
  };
  flags: {
    unsynchronisation: boolean;
    extendedHeader: boolean;
    experimental: boolean;
    footer: boolean;
  };
  size: number; // Size of tag excluding header (10 bytes)
  totalSize: number; // Total size including header (and footer if present)
}

/**
 * Result of MP3 file parsing
 */
export interface Mp3ParseResult {
  frameCount: number;
  id3v2Tag: Id3v2Tag | null;
  hasId3v1Tag: boolean;
}

/**
 * API response format
 */
export interface FrameCountResponse {
  frameCount: number;
}

/**
 * API error response format
 */
export interface ErrorResponse {
  error: string;
}
