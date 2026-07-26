interface AuthUser {
  email: string;
  id: string;
  image?: string | null;
  name?: string | null;
}

interface AuthSession {
  expiresAt?: Date | string;
  id?: string;
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
