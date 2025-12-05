export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE ?? '52428800', 10), // 50MB default
} as const;

export type Config = typeof config;
