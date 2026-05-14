/**
 * S3 Utilities
 * Handles upload and retrieval of screenshots from AWS S3
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "eu-west-3",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const bucketName = process.env.AWS_BUCKET_NAME || "screencold-assets";
const publicUrlBase = `https://${bucketName}.s3.${process.env.AWS_REGION || "eu-west-3"}.amazonaws.com`;

/**
 * Generates an S3 key for a screenshot
 * Format: screenshots/{userId}/{prospectId}/{timestamp}-{variant}.png
 */
export function generateScreenshotKey(
  userId: string,
  prospectId: string,
  variant: "desktop" | "mobile" | "annotated"
): string {
  const timestamp = Date.now();
  return `screenshots/${userId}/${prospectId}/${timestamp}-${variant}.png`;
}

/**
 * Uploads a buffer to S3 with public read access
 * @param buffer - The image buffer to upload
 * @param key - The S3 key (path) for the file
 * @returns The public URL of the uploaded file
 */
export async function uploadScreenshot(
  buffer: Buffer,
  key: string
): Promise<string> {
  const command: PutObjectCommandInput = {
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: "image/png",
    ACL: "public-read",
    Metadata: {
      "uploaded-at": new Date().toISOString(),
    },
  };

  await s3Client.send(new PutObjectCommand(command));

  return `${publicUrlBase}/${key}`;
}

/**
 * Generates a signed URL for private S3 objects
 * @param key - The S3 key for the file
 * @param expiresIn - Number of seconds until the URL expires (default 3600 = 1 hour)
 * @returns The signed URL
 */
export async function getSignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const signedUrl = await getSignedUrl(s3Client, command, {
    expiresIn,
  });

  return signedUrl;
}

/**
 * Deletes an object from S3
 * @param key - The S3 key for the file
 */
export async function deleteObject(key: string): Promise<void> {
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );
}

/**
 * Checks if S3 is configured and accessible
 */
export async function checkS3Connection(): Promise<boolean> {
  try {
    const { HeadBucketCommand } = await import("@aws-sdk/client-s3");
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    return true;
  } catch {
    return false;
  }
}