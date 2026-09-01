import { randomUUID } from 'crypto';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const client = new S3Client({ region: env.awsRegion });

export function isImageStorageEnabled(): boolean {
  return env.s3ImageBucket.length > 0;
}

export async function putProductImage(
  productId: string,
  file: Express.Multer.File,
): Promise<string> {
  const key = `products/${productId}/${randomUUID()}.${EXTENSIONS[file.mimetype]}`;

  await client.send(
    new PutObjectCommand({
      Bucket: env.s3ImageBucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }),
  );

  return key;
}

export async function getProductImageUrl(key: string | null): Promise<string | null> {
  if (!key || !isImageStorageEnabled()) {
    return null;
  }

  return getSignedUrl(client, new GetObjectCommand({ Bucket: env.s3ImageBucket, Key: key }), {
    expiresIn: 3600,
  });
}
