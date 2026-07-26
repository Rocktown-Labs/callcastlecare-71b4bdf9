import { env } from "@callcastlecare/env/web";

export function getServerUrl() {
  const normalized = env.VITE_SERVER_URL.endsWith("/")
    ? env.VITE_SERVER_URL.slice(0, -1)
    : env.VITE_SERVER_URL;

  if (!normalized.startsWith("/")) {
    return normalized;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}${normalized}`;
  }

  const processEnv = (
    globalThis as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env;
  const vercelUrl =
    processEnv?.VERCEL_ENV === "production"
      ? (processEnv?.VERCEL_PROJECT_PRODUCTION_URL ?? processEnv?.VERCEL_URL)
      : (processEnv?.VERCEL_URL ?? processEnv?.VERCEL_PROJECT_PRODUCTION_URL);

  if (!vercelUrl) {
    return `http://localhost:3000${normalized}`;
  }

  const origin = vercelUrl.startsWith("http")
    ? vercelUrl
    : `https://${vercelUrl}`;
  return `${origin}${normalized}`;
}
