import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "@/db/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const neonClient = neon(connectionString, {
  fetchOptions: {
    cache: "no-store",
  },
});

export const db = drizzle(neonClient, { schema });
export { schema };

