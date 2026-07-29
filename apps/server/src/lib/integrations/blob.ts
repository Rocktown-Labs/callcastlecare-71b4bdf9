import { env } from "@callcastlecare/env/server";
import { get } from "@vercel/blob";
import { handleUpload } from "@vercel/blob/client";
import type { HandleUploadBody } from "@vercel/blob/client";

import { logger } from "../logger";

const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];
const privateBlobAccess = "private";

export const getMediaUploadUrl = (baseOrigin: string) =>
  `${baseOrigin}/api/v1/media/client-upload`;

export const createMediaStoragePath = (input: {
  extension: string;
  mediaType: string;
  orderId?: number;
  legId?: number;
}) => {
  const orderSegment = input.orderId ? `order-${input.orderId}` : "order-none";
  const legSegment = input.legId ? `leg-${input.legId}` : "leg-none";
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10);
  return `callcastlecare-media/${orderSegment}/${legSegment}/${input.mediaType}/${timestamp}-${random}.${input.extension}`;
};

export const handleBlobClientUpload = (request: Request, body: unknown) => {
  if (!env.VERCEL_BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "VERCEL_BLOB_READ_WRITE_TOKEN is required for blob uploads"
    );
  }

  const uploadBody = body as HandleUploadBody;

  return handleUpload({
    body: uploadBody,
    // Vercel Blob requires promise-returning callbacks for this client upload API.
    // eslint-disable-next-line require-await
    onBeforeGenerateToken: async (pathname) => {
      if (!pathname.startsWith("callcastlecare-media/")) {
        throw new Error("Invalid upload pathname");
      }

      return {
        addRandomSuffix: false,
        allowOverwrite: false,
        allowedContentTypes: ALLOWED_CONTENT_TYPES,
        cacheControlMaxAge: 31_536_000,
        maximumSizeInBytes: MAX_UPLOAD_SIZE_BYTES,
        validUntil: Date.now() + 30 * 60 * 1000,
      };
    },
    // eslint-disable-next-line require-await
    onUploadCompleted: async ({ blob, tokenPayload }) => {
      logger.info(
        {
          pathname: blob.pathname,
          tokenPayload,
          url: blob.url,
        },
        "blob:upload:completed"
      );
    },
    request,
    token: env.VERCEL_BLOB_READ_WRITE_TOKEN,
  });
};

export const getPrivateBlob = async (pathname: string) => {
  if (!env.VERCEL_BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "VERCEL_BLOB_READ_WRITE_TOKEN is required for blob downloads"
    );
  }

  return await get(pathname, {
    access: privateBlobAccess,
    token: env.VERCEL_BLOB_READ_WRITE_TOKEN,
    useCache: false,
  });
};
