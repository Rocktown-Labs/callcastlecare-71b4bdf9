import { env } from "@callcastlecare/env/web";

const isAbsoluteUrl = function isAbsoluteUrl(value: string) {
  return /^https?:\/\//u.test(value);
};

export const getServerUrl = function getServerUrl() {
  const normalized = env.VITE_SERVER_URL.endsWith("/")
    ? env.VITE_SERVER_URL.slice(0, -1)
    : env.VITE_SERVER_URL;

  if (isAbsoluteUrl(normalized)) {
    return normalized;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}${normalized}`;
  }

  return `http://localhost:3000${normalized}`;
};
