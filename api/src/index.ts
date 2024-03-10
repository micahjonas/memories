import { Hono } from "hono";
import {
  getCookie,
  getSignedCookie,
  setCookie,
  setSignedCookie,
  deleteCookie,
} from "hono/cookie";
import { eq } from "drizzle-orm";
import { verifyRequestOrigin } from "lucia";
import type { User, Session } from "lucia";
import { getDB } from "./db/connect";
import { getLucia } from "./lucia.js";
import { todoTable } from "./db/models/todo";
import auth from "./routes/auth";

export interface Env {
  // The environment variable containing your the URL for your Turso database.
  LIBSQL_DB_URL?: string;
  // The Secret that contains the authentication token for your Turso database.
  LIBSQL_DB_AUTH_TOKEN?: string;
}

export type Bindings = {
  MY_BUCKET: R2Bucket;
  LIBSQL_DB_URL: string;
  LIBSQL_DB_AUTH_TOKEN: string;
  STAGE: string;
};

type Variables = {
  db: Awaited<ReturnType<typeof getDB>>;
  session: Session | null;
  user: User | null;
};

let lucia: Awaited<ReturnType<typeof getLucia>>;
let db: Awaited<ReturnType<typeof getDB>>;

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use(async (c, next) => {
  if (!db) {
    db = await getDB({
      url: c.env.LIBSQL_DB_URL,
      authToken: c.env.LIBSQL_DB_AUTH_TOKEN,
    });
  }
  c.set("db", db);
  await next();
});

app.use(async (c, next) => {
  // if (c.req.method !== "GET") {
  //   const originHeader = c.req.header("Origin");
  //   const hostHeader = c.req.header("Host");
  //   console.log(originHeader, hostHeader);
  //   if (
  //     !originHeader ||
  //     !hostHeader ||
  //     !verifyRequestOrigin(originHeader, [hostHeader])
  //   ) {
  //     return c.body(null, 403);
  //   }
  // }

  if (!lucia) {
    lucia = await getLucia({
      db: c.get("db"),
      stage: c.env.STAGE,
    });
  }
  const sessionId = getCookie(c, lucia.sessionCookieName) ?? null;
  console.log("wait what", sessionId, lucia.sessionCookieName);
  if (!sessionId) {
    c.set("session", null);
    c.set("user", null);
    return await next();
  }

  const { session, user } = await lucia.validateSession(sessionId);

  c.set("session", session);
  c.set("user", user);
  await next();
  if (session && session.fresh) {
    c.res.headers.set(
      "Set-Cookie",
      lucia.createSessionCookie(session.id).serialize()
    );
  }
  if (!session) {
    c.res.headers.set(
      "Set-Cookie",
      lucia.createBlankSessionCookie().serialize()
    );
  }
});

app.get("/", async (c) => {
  const db = c.get("db");

  const user = c.get("user");

  if (!user?.id) {
    return c.body("Not logged in", 403);
  }

  const result = await db
    .select()
    .from(todoTable)
    .where(eq(todoTable.userId, user.id))
    .get();

  console.log(c.env.LIBSQL_DB_URL);
  console.log(result);
  return c.json(result);
});

app.post("/todo", async (c) => {
  const mydb = c.get("db");

  const user = c.get("user");

  if (!user?.id) {
    return c.body("Not logged in", 403);
  }

  const res = await mydb.insert(todoTable).values({
    id: crypto.randomUUID(),
    title: `Hello, ${user.email}!`,
    description: "This is a todo item",
    userId: user.id,
  });

  const result = await db
    .select()
    .from(todoTable)
    .where(eq(todoTable.userId, user.id))
    .get();

  console.log(c.env.LIBSQL_DB_URL);
  console.log(result);
  return c.json(result);
});

app.route("/auth", auth);

export default app;
