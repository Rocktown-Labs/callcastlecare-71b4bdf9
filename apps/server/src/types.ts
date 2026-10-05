interface AuthUser {
  email: string;
  id: string;
  image?: string | null;
  name?: string | null;
  role?: string | null;
}

interface AuthSession {
  expiresAt?: Date | string;
  id?: string;
  impersonatedBy?: string | null;
  token?: string;
  userId?: string;
}

export interface AppVariables {
  requestId: string;
  user: AuthUser | null;
  session: AuthSession | null;
}

export interface AppEnv {
  Bindings: {
    BETTER_AUTH_SECRET?: string;
    BETTER_AUTH_URL?: string;
    CORS_ORIGIN?: string;
    DATABASE_URL?: string;
    LOG_LEVEL?: string;
    MEDIA_BUCKET?: R2Bucket;
    NODE_ENV?: string;
    QUEUE?: Queue;
    [key: string]: string | undefined | R2Bucket | Queue | unknown;
  };
  Variables: AppVariables;
}
