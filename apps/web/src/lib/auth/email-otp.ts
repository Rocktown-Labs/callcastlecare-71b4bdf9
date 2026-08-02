import { authBaseURL } from "@/lib/auth-client";

type AuthOtpType =
  | "change-email"
  | "email-verification"
  | "forget-password"
  | "sign-in";

interface AuthResponse {
  success?: boolean;
  token?: string;
}

const getErrorMessage = (payload: unknown) => {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return payload.message;
  }

  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return "The auth request could not be completed.";
};

const postAuth = async <TResponse extends AuthResponse>(
  path: string,
  body: unknown
) => {
  const response = await fetch(`${authBaseURL}${path}`, {
    body: JSON.stringify(body),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(getErrorMessage(payload));
  }

  return payload as TResponse;
};

export const sendVerificationOtp = (input: {
  email: string;
  type: AuthOtpType;
}) => postAuth<{ success: boolean }>("/email-otp/send-verification-otp", input);

export const signInWithEmailOtp = (input: {
  email: string;
  otp: string;
  name?: string;
}) => postAuth<{ token: string }>("/sign-in/email-otp", input);

export const requestPasswordResetOtp = (input: { email: string }) =>
  postAuth<{ success: boolean }>("/email-otp/request-password-reset", input);

export const resetPasswordWithOtp = (input: {
  email: string;
  otp: string;
  password: string;
}) => postAuth<{ success: boolean }>("/email-otp/reset-password", input);
