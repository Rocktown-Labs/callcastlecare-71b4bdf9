import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

import { env } from "@callcastlecare/env/server";

const TOKEN_VERSION = "v1";
const TOKEN_TTL_MS = 10 * 60 * 1000;
const IV_BYTES = 12;

interface CheckoutAccessClaims {
  checkoutSessionId: number;
  expiresAt: number;
}

const getKey = (secret: string) =>
  createHash("sha256").update(secret, "utf-8").digest();

const encode = (value: Buffer) => value.toString("base64url");
const decode = (value: string) => Buffer.from(value, "base64url");

export const createCheckoutAccessToken = (
  checkoutSessionId: number,
  secret = env.BETTER_AUTH_SECRET
) => {
  const claims: CheckoutAccessClaims = {
    checkoutSessionId,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  };
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", getKey(secret), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(claims), "utf-8"),
    cipher.final(),
  ]);

  return [
    TOKEN_VERSION,
    encode(iv),
    encode(cipher.getAuthTag()),
    encode(ciphertext),
  ].join(".");
};

const isCheckoutAccessClaims = (
  value: unknown
): value is CheckoutAccessClaims => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const claims = value as Record<string, unknown>;
  return (
    Number.isInteger(claims.checkoutSessionId) &&
    typeof claims.expiresAt === "number" &&
    claims.expiresAt > Date.now()
  );
};

export const readCheckoutAccessToken = (
  token: string,
  secret = env.BETTER_AUTH_SECRET
) => {
  try {
    const [version, encodedIv, encodedTag, encodedCiphertext] =
      token.split(".");
    if (
      version !== TOKEN_VERSION ||
      !encodedIv ||
      !encodedTag ||
      !encodedCiphertext
    ) {
      return null;
    }

    const decipher = createDecipheriv(
      "aes-256-gcm",
      getKey(secret),
      decode(encodedIv)
    );
    decipher.setAuthTag(decode(encodedTag));
    const plaintext = Buffer.concat([
      decipher.update(decode(encodedCiphertext)),
      decipher.final(),
    ]).toString("utf-8");
    const claims: unknown = JSON.parse(plaintext);

    return isCheckoutAccessClaims(claims) ? claims : null;
  } catch {
    return null;
  }
};
