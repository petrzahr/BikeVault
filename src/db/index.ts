import { drizzle } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

// Global database instance caching for Next.js hot reloading
declare global {
  // eslint-disable-next-line no-var
  var __bikevault_db: ReturnType<typeof drizzle<typeof schema>> | undefined;
  // eslint-disable-next-line no-var
  var __bikevault_client: PGlite | undefined;
}

export function getClient(): PGlite {
  if (global.__bikevault_client) {
    return global.__bikevault_client;
  }

  const dataDir = path.join(process.cwd(), ".data", "pgdata");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Clean stale lock / pid files left from previous abnormal process termination
  try {
    const stalePid = path.join(dataDir, "postmaster.pid");
    if (fs.existsSync(stalePid)) {
      fs.unlinkSync(stalePid);
    }
    const staleLock = path.join(dataDir, ".s.PGSQL.5432.lock.out");
    if (fs.existsSync(staleLock)) {
      fs.unlinkSync(staleLock);
    }
  } catch (err) {
    console.warn("Notice: Unable to clean stale db lock files:", err);
  }

  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });

  global.__bikevault_client = client;
  global.__bikevault_db = db;

  return client;
}

export function getDatabase() {
  if (global.__bikevault_db) {
    return global.__bikevault_db;
  }
  getClient();
  return global.__bikevault_db!;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const realDb = getDatabase();
    return (realDb as any)[prop];
  },
});
export { schema };
