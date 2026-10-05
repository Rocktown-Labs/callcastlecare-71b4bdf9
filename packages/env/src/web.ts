import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const serverUrlSchema = z.union([
  z.url(),
  z
    .string()
    .regex(/^\/(?!\/)/u, "Use an absolute URL or a same-origin path like /api"),
]);

export const env = createEnv({
  client: {
    VITE_SERVER_URL: serverUrlSchema,
    VITE_STRIPE_PUBLISHABLE_KEY: z
      .string()
      .regex(/^pk_(?:test|live)_[A-Za-z0-9_]+$/u)
      .optional(),
  },
  clientPrefix: "VITE_",
  emptyStringAsUndefined: true,
  runtimeEnv: (
    import.meta as unknown as { env: Record<string, string | undefined> }
  ).env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
