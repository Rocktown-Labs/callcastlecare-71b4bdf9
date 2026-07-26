import type { Hono } from "hono";
import { hc } from "hono/client";

export * from "./contracts";
export * from "./pricing";
export * from "./window-washing";

export interface CreateApiClientOptions {
  headers?: Record<string, string>;
  customFetch?: typeof fetch;
}

export const createApiClient = <TApp extends Hono>(
  baseURL: string,
  options?: CreateApiClientOptions
) =>
  hc<TApp>(baseURL, {
    fetch: options?.customFetch,
    headers: options?.headers,
    init: {
      credentials: "include",
    },
  });
