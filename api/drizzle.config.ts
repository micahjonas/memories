import { config } from "dotenv";
config({ path: ".dev.vars" });

console.log("env", process.env.LIBSQL_DB_AUTH_TOKEN);

import type { Config } from "drizzle-kit";
export default {
  schema: "./src/db/models/*.ts",
  out: "./drizzle",
  driver: "turso",
  dbCredentials: {
    url: "libsql://memories-dev-micahjonas.turso.io",
    authToken: process.env.LIBSQL_DB_AUTH_TOKEN,
  },
} satisfies Config;
