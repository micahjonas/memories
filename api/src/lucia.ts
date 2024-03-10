import { Lucia } from "lucia";
import { type LibSQLDatabase } from "drizzle-orm/libsql";
import { DrizzleSQLiteAdapter } from "@lucia-auth/adapter-drizzle";
import { sessionTable } from "./db/models/session";
import { userTable } from "./db/models/user";

export const getLucia = async ({
  db,
  stage,
}: {
  db: LibSQLDatabase<Record<string, never>>;
  stage: string;
}) => {
  const adapter = new DrizzleSQLiteAdapter(db, sessionTable, userTable);

  return new Lucia(adapter, {
    sessionCookie: {
      attributes: {
        secure: stage === "PRODUCTION", // set `Secure` flag in HTTPS
      },
    },
    getUserAttributes: (attributes) => {
      return {
        // we don't need to expose the hashed password!
        email: attributes.email,
      };
    },
  });
};

// IMPORTANT!
declare module "lucia" {
  interface Register {
    Lucia: Awaited<ReturnType<typeof getLucia>>;
    DatabaseUserAttributes: {
      email: string;
    };
  }
}
