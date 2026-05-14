import { S3Client } from "@aws-sdk/client-s3";

const s3Config = {
  region: process.env.AWS_REGION ?? "eu-west-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
  endpoint: process.env.AWS_S3_ENDPOINT,
  forcePathStyle: Boolean(process.env.AWS_S3_ENDPOINT),
};

export const s3Client = new S3Client(s3Config);

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
      key: `${basePath}/desktop.png`,
      url: "",
    },
  };

  // Upload desktop screenshot
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const desktopCommand = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: result.desktop.key,
    Body: screenshots.desktop,
    ContentType: "image/png",
    ServerSideEncryption: "AES256",
  });
  await s3Client.send(desktopCommand);
  result.desktop.url = getS3Url(result.desktop.key);

  // Upload mobile screenshot
  if (screenshots.mobile) {
    result.mobile = {
      key: `${basePath}/mobile.png`,
      url: "",
    };
    const mobileCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: result.mobile.key,
      Body: screenshots.mobile,
      ContentType: "image/png",
      ServerSideEncryption: "AES256",
    });
    await s3Client.send(mobileCommand);
    result.mobile.url = getS3Url(result.mobile.key);
  }

  // Upload annotated screenshot
  if (screenshots.annotated) {
    result.annotated = {
      key: `${basePath}/annotated.png`,
      url: "",
    };
    const annotatedCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: result.annotated.key,
      Body: screenshots.annotated,
      ContentType: "image/png",
      ServerSideEncryption: "AES256",
    });
    await s3Client.send(annotatedCommand);
    result.annotated.url = getS3Url(result.annotated.key);
  }

  return result;
}

export default s3Client;