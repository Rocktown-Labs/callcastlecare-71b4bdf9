export interface CloudflareEnv {
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  CORS_ORIGIN?: string;
  DATABASE_URL?: string;
  LOG_LEVEL?: string;
  MEDIA_BUCKET?: unknown;
  NODE_ENV?: string;
  QUEUE?: unknown;
  [key: string]: string | undefined | unknown;
}

declare global {
  // eslint-disable-next-line no-var
  var Env: CloudflareEnv;
  type Env = CloudflareEnv;
}
