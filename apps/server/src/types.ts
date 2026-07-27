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
  Variables: AppVariables;
}
