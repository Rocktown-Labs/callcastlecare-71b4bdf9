import { env } from "@callcastlecare/env/web";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const isAbsoluteUrl = function isAbsoluteUrl(value: string) {
  return /^https?:\/\//u.test(value);
};

const getServerUrl = function getServerUrl(url: string) {
  const normalized = url.endsWith("/") ? url.slice(0, -1) : url;

  if (isAbsoluteUrl(normalized)) {
    return normalized;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}${normalized}`;
  }

  return `http://localhost:3000${normalized}`;
};

export const authBaseURL = new URL(
  "/api/auth",
  getServerUrl(env.VITE_SERVER_URL)
).toString();

export const authClient = createAuthClient({
  // better-auth derives its route-matching base from this URL's path, so the
  // public auth path must equal the server-side mount (/api/auth everywhere)
  baseURL: authBaseURL,
  plugins: [emailOTPClient()],
});
