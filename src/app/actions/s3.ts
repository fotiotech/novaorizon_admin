// app/actions/s3.ts
"use server";

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.NEXT_PUBLIC_AWS_BUCKET_NAME!;
const REGION = process.env.NEXT_PUBLIC_AWS_REGION!;

function getPublicUrl(key: string): string {
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

function extractKeyFromUrl(url: string): string {
  const urlObj = new URL(url);
  return urlObj.pathname.slice(1);
}

// -------------------- CREATE (presigned PUT URL) --------------------
export async function getPresignedUploadUrl(
  fileName: string,
  contentType: string,
  instanceId?: string,
  existingKey?: string,
  subfolder?: string, // NEW
) {
  let fileKey: string;
  if (existingKey) {
    fileKey = existingKey;
  } else {
    let base = "uploads/";
    if (instanceId) base += `${instanceId}/`;
    if (subfolder) base += `${subfolder}/`;
    fileKey = `${base}${uuidv4()}-${fileName}`;
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: fileKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });
  return { uploadUrl, fileKey };
}

// -------------------- READ (list objects) --------------------
export async function listS3Objects(instanceId?: string, subfolder?: string) {
  let prefix = "uploads/";
  if (instanceId) {
    prefix += `${instanceId}/`;
    if (subfolder) prefix += `${subfolder}/`;
  } else if (subfolder) {
    prefix += `${subfolder}/`;
  }

  const command = new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: prefix,
  });
  const response = await s3Client.send(command);
  return (response.Contents || [])
    .filter((item) => item.Key)
    .map((item) => ({
      key: item.Key!,
      size: item.Size || 0,
      lastModified: item.LastModified?.toISOString() || "",
      url: getPublicUrl(item.Key!),
    }));
}

// -------------------- READ (presigned GET URL) --------------------
export async function getPresignedGetUrl(fileKey: string, expiresIn = 60) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: fileKey,
  });
  return await getSignedUrl(s3Client, command, { expiresIn });
}

// -------------------- UPDATE (presigned URL for overwriting) --------------------
export async function getPresignedUpdateUrl(
  existingKey: string,
  contentType: string,
) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: existingKey,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });
  return { uploadUrl, fileKey: existingKey };
}

// -------------------- DELETE (single) --------------------
export async function deleteS3Object(fileUrlOrKey: string) {
  const key = fileUrlOrKey.startsWith("http")
    ? extractKeyFromUrl(fileUrlOrKey)
    : fileUrlOrKey;
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  await s3Client.send(command);
  return { success: true };
}

// -------------------- DELETE (batch) --------------------
export async function deleteMultipleS3Objects(fileUrlsOrKeys: string[]) {
  const keys = fileUrlsOrKeys.map((item) =>
    item.startsWith("http") ? extractKeyFromUrl(item) : item,
  );
  const command = new DeleteObjectsCommand({
    Bucket: BUCKET,
    Delete: {
      Objects: keys.map((Key) => ({ Key })),
      Quiet: false,
    },
  });
  const response = await s3Client.send(command);
  return {
    success: true,
    deleted: response.Deleted?.map((d) => d.Key) || [],
    errors: response.Errors || [],
  };
}
