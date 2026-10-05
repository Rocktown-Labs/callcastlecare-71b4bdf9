import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export * from "drizzle-orm";

export type Database = ReturnType<typeof createDb>;

let configuredUrl: string | undefined;
let dbInstance: Database | undefined;

const buildClient = (databaseUrl: string) =>
  postgres(databaseUrl, { max: 1, prepare: false });

export const configureDatabase = (databaseUrl: string): void => {
  if (dbInstance && configuredUrl === databaseUrl) {
    return;
  }

  configuredUrl = databaseUrl;
  const client = buildClient(databaseUrl);
  dbInstance = drizzle(client, { schema });
};

export const createDb = (databaseUrl: string) => {
  const client = buildClient(databaseUrl);
  return drizzle(client, { schema });
};

export const db = new Proxy({} as Database, {
  get(_, property) {
    if (!dbInstance) {
      throw new Error(
        "Database is not configured. Call configureDatabase(DATABASE_URL) before handling requests."
      );
    }

    const value = (dbInstance as unknown as Record<string | symbol, unknown>)[
      property
    ];

    if (typeof value === "function") {
      return value.bind(dbInstance);
    }

    return value;
  },
}) as Database;
