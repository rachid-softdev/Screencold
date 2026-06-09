import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { s3CircuitBreaker } from './circuit-breaker';
import fs from 'fs/promises';
import path from 'path';

const FALLBACK_DIR = path.join(process.cwd(), '.s3-fallback');

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      requestTimeout: 30000,
      maxAttempts: 2,
    });
  }
  return s3Client;
}

async function ensureFallbackDir(): Promise<void> {
  try {
    await fs.mkdir(FALLBACK_DIR, { recursive: true });
  } catch { /* exists */ }
}

export async function uploadFile(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  return s3CircuitBreaker.call(
    async () => {
      const client = getS3Client();
      const bucket = process.env.AWS_S3_BUCKET;
      if (!bucket) throw new Error('AWS_S3_BUCKET not set');

      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }));

      return `https://${bucket}.s3.amazonaws.com/${key}`;
    },
    async () => {
      console.warn('[s3] Circuit breaker OPEN, using fallback storage');
      await ensureFallbackDir();
      const localPath = path.join(FALLBACK_DIR, key.replace(/\//g, '-'));
      await fs.writeFile(localPath, body);
      return `file://${localPath}`;
    }
  );
}

export async function downloadFile(key: string): Promise<Buffer> {
  return s3CircuitBreaker.call(
    async () => {
      const client = getS3Client();
      const bucket = process.env.AWS_S3_BUCKET;
      if (!bucket) throw new Error('AWS_S3_BUCKET not set');

      const response = await client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }));

      return Buffer.from(await response.Body!.transformToByteArray());
    },
    async () => {
      const localPath = path.join(FALLBACK_DIR, key.replace(/\//g, '-'));
      return fs.readFile(localPath);
    }
  );
}

export async function getFallbackFiles(): Promise<string[]> {
  try {
    return fs.readdir(FALLBACK_DIR);
  } catch {
    return [];
  }
}
