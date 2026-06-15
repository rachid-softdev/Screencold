import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// S3 configuration from environment variables
const s3Config = {
  region: process.env.AWS_REGION ?? "eu-west-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
  endpoint: process.env.AWS_S3_ENDPOINT,
  forcePathStyle: Boolean(process.env.AWS_S3_ENDPOINT), // For S3-compatible services
};

// Create S3 client with 30-second timeout on all operations.
// The requestHandler config object matches NodeHttpHandlerOptions
// and is accepted by the S3Client constructor via the HttpHandlerUserInput union type.
const s3Client = new S3Client({
  ...s3Config,
  requestHandler: {
    requestTimeout: 30_000,
    connectionTimeout: 5_000,
  },
});

// Bucket name
const BUCKET_NAME = process.env.AWS_S3_BUCKET ?? "screencold-screenshots";

// Generate unique key for file
export function generateS3Key(
  prefix: string,
  filename: string,
  userId?: string
): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const userPrefix = userId ? `${userId}/` : "";
  return `${prefix}/${userPrefix}${timestamp}-${sanitizedFilename}`;
}

// Upload file to S3
export async function uploadToS3(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string,
  metadata?: Record<string, string>
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: metadata,
    // Enable server-side encryption
    ServerSideEncryption: "AES256",
    // Set cache headers for images
    CacheControl: "public, max-age=31536000",
  });

  await s3Client.send(command);

  // Return the URL
  return getS3Url(key);
}

// Get public URL for a key
export function getS3Url(key: string): string {
  if (process.env.AWS_S3_ENDPOINT) {
    // For S3-compatible services (MinIO, etc.)
    return `${process.env.AWS_S3_ENDPOINT}/${BUCKET_NAME}/${key}`;
  }
  // For AWS S3
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

// Generate presigned URL for upload
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600 // 1 hour
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

// Generate presigned URL for download
export async function generatePresignedDownloadUrl(
  key: string,
  expiresIn = 3600 // 1 hour
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

// Download file from S3
export async function downloadFromS3(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await s3Client.send(command);

  // Convert the readable stream to buffer
  const chunks: Uint8Array[] = [];
  const stream = response.Body as AsyncIterable<Uint8Array>;

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

// Delete file from S3
export async function deleteFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

// Delete multiple files from S3
export async function deleteMultipleFromS3(keys: string[]): Promise<void> {
  await Promise.all(keys.map((key) => deleteFromS3(key)));
}

// List files in a prefix
export async function listFilesInS3(
  prefix: string,
  maxKeys = 100
): Promise<string[]> {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: prefix,
    MaxKeys: maxKeys,
  });

  const response = await s3Client.send(command);
  return response.Contents?.map((obj: any) => obj.Key ?? "") ?? [];
}

// Copy file within S3
export async function copyFileInS3(
  sourceKey: string,
  destinationKey: string
): Promise<void> {
  const command = new CopyObjectCommand({
    Bucket: BUCKET_NAME,
    CopySource: `${BUCKET_NAME}/${sourceKey}`,
    Key: destinationKey,
  });

  await s3Client.send(command);
}

// Check if file exists
export async function fileExists(key: string): Promise<boolean> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    // Check if it's a "not found" error
    if ((error as { name?: string }).name === "NoSuchKey") {
      return false;
    }
    throw error;
  }
}

// Get file metadata
export async function getFileMetadata(
  key: string
): Promise<{
  contentType: string | null;
  contentLength: number | null;
  lastModified: Date | null;
  etag: string | null;
}> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await s3Client.send(command);

  return {
    contentType: response.ContentType ?? null,
    contentLength: response.ContentLength ?? null,
    lastModified: response.LastModified ?? null,
    etag: response.ETag ?? null,
  };
}

// Screenshot-specific helpers
export interface ScreenshotUploadResult {
  desktop: {
    key: string;
    url: string;
  };
  mobile?: {
    key: string;
    url: string;
  };
  annotated?: {
    key: string;
    url: string;
  };
}

// Upload screenshot set
export async function uploadScreenshots(
  userId: string,
  screenshots: {
    desktop: Buffer;
    mobile?: Buffer;
    annotated?: Buffer;
  }
): Promise<ScreenshotUploadResult> {
  const timestamp = Date.now();
  const basePath = `screenshots/${userId}/${timestamp}`;

  const result: ScreenshotUploadResult = {
    desktop: {
      key: `${basePath}/desktop.png`,
      url: "",
    },
  };

  // Upload desktop screenshot
  result.desktop.url = await uploadToS3(
    result.desktop.key,
    screenshots.desktop,
    "image/png",
    { userId, type: "desktop" }
  );

  // Upload mobile screenshot if available
  if (screenshots.mobile) {
    result.mobile = {
      key: `${basePath}/mobile.png`,
      url: "",
    };
    result.mobile.url = await uploadToS3(
      result.mobile.key,
      screenshots.mobile,
      "image/png",
      { userId, type: "mobile" }
    );
  }

  // Upload annotated screenshot if available
  if (screenshots.annotated) {
    result.annotated = {
      key: `${basePath}/annotated.png`,
      url: "",
    };
    result.annotated.url = await uploadToS3(
      result.annotated.key,
      screenshots.annotated,
      "image/png",
      { userId, type: "annotated" }
    );
  }

  return result;
}

// Clean up old screenshots for a user
export async function cleanupOldScreenshots(
  userId: string,
  maxAgeDays = 30
): Promise<number> {
  const prefix = `screenshots/${userId}/`;
  const files = await listFilesInS3(prefix, 1000);

  // Filter files older than maxAgeDays
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

  const filesToDelete: string[] = [];
  const now = Date.now();

  for (const file of files) {
    // Extract timestamp from filename (format: userId/timestamp-filename)
    const parts = file.split("/");
    const filename = parts[parts.length - 1];
    const timestampMatch = filename.match(/^(\d+)-/);

    if (timestampMatch) {
      const fileTimestamp = parseInt(timestampMatch[1] ?? "0", 10);
      const fileAgeDays = (now - fileTimestamp) / (1000 * 60 * 60 * 24);

      if (fileAgeDays > maxAgeDays) {
        filesToDelete.push(file);
      }
    }
  }

  // Delete old files
  if (filesToDelete.length > 0) {
    await deleteMultipleFromS3(filesToDelete);
  }

  return filesToDelete.length;
}

export default s3Client;