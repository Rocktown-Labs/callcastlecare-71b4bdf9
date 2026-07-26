import dotenv from "dotenv";
import pg from "pg";

dotenv.config({
  path: "../../apps/server/.env",
});

const connectionString = process.env.DATABASE_URL;

if (!connectionString || connectionString.includes("username:password")) {
  console.error(
    "Error: Please set a valid DATABASE_URL in apps/server/.env before running reset."
  );
  process.exit(1);
}

console.log("Resetting database schema...");
const client = new pg.Client({ connectionString });

try {
  await client.connect();
  await client.query(
    "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;"
  );
  console.log("Successfully dropped all tables and reset the public schema.");
} catch (error) {
  console.error("Failed to reset database:", error);
  process.exit(1);
} finally {
  await client.end();
}
