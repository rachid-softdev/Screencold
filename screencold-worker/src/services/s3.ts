import { S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";

const s3Config = {
  region: process.env.AWS_REGION ?? "eu-west-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
  endpoint: process.env.AWS_S3_ENDPOINT,
  forcePathStyle: Boolean(process.env.AWS_S3_ENDPOINT),
};

export const s3Client = new S3Client({
  ...s3Config,
  requestHandler: {
    requestTimeout: 30_000,
    connectionTimeout: 5_000,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET ?? "screencold-screenshots";

export function getS3Url(key: string): string {
  if (process.env.AWS_S3_ENDPOINT) {
    return `${process.env.AWS_S3_ENDPOINT}/${BUCKET_NAME}/${key}`;
  }
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

export interface ScreenshotUploadData {
  desktop: Buffer;
  mobile?: Buffer;
  annotated?: Buffer;
}

/**
 * Compress and convert image to WebP using Sharp
 */
async function compressImage(buffer: Buffer, maxWidth: number = 1920): Promise<Buffer> {
  return await sharp(buffer)
    .resize(maxWidth, null, {
      withoutEnlargement: true,
      fit: 'inside',
    })
    .webp({
      quality: 80,
      effort: 4, // Balance between size and speed
    })
    .toBuffer();
}

export async function uploadScreenshots(
  userId: string,
  screenshots: ScreenshotUploadData
): Promise<{
  desktop: { key: string; url: string };
  mobile?: { key: string; url: string };
  annotated?: { key: string; url: string };
}> {
  const timestamp = Date.now();
  const basePath = `screenshots/${userId}/${timestamp}`;

  const result: {
    desktop: { key: string; url: string };
    mobile?: { key: string; url: string };
    annotated?: { key: string; url: string };
  } = {
    desktop: {
      key: `${basePath}/desktop.webp`,
      url: "",
    },
  };

  const { PutObjectCommand } = await import("@aws-sdk/client-s3");

  // Compress and upload desktop screenshot
  const compressedDesktop = await compressImage(screenshots.desktop);
  const desktopCommand = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: result.desktop.key,
    Body: compressedDesktop,
    ContentType: "image/webp",
    ServerSideEncryption: "AES256",
  });
  await s3Client.send(desktopCommand);
  result.desktop.url = getS3Url(result.desktop.key);

  // Compress and upload mobile screenshot
  if (screenshots.mobile) {
    result.mobile = {
      key: `${basePath}/mobile.webp`,
      url: "",
    };
    const compressedMobile = await compressImage(screenshots.mobile, 480);
    const mobileCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: result.mobile.key,
      Body: compressedMobile,
      ContentType: "image/webp",
      ServerSideEncryption: "AES256",
    });
    await s3Client.send(mobileCommand);
    result.mobile.url = getS3Url(result.mobile.key);
  }

  // Compress and upload annotated screenshot
  if (screenshots.annotated) {
    result.annotated = {
      key: `${basePath}/annotated.webp`,
      url: "",
    };
    const compressedAnnotated = await compressImage(screenshots.annotated);
    const annotatedCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: result.annotated.key,
      Body: compressedAnnotated,
      ContentType: "image/webp",
      ServerSideEncryption: "AES256",
    });
    await s3Client.send(annotatedCommand);
    result.annotated.url = getS3Url(result.annotated.key);
  }

  return result;
}

export default s3Client;