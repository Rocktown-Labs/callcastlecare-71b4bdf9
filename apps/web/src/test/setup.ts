import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

vi.stubEnv("VITE_SERVER_URL", "/api");

Object.defineProperty(globalThis, "crypto", {
  value: {
    randomUUID: () => "quote-request-test-id",
  },
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.restoreAllMocks();
});
