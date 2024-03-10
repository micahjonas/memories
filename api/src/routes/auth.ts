import { Hono } from "hono";
import { generateId, Scrypt } from "lucia";
import { eq } from "drizzle-orm";
import {} from "lucia";
import { getDB } from "../db/connect";
import { userTable } from "../db/models/user";
import { getLucia } from "../lucia";
import type { Bindings } from "../index";

const app = new Hono<{ Bindings: Bindings }>();

function isValidEmail(email: string): boolean {
  return /.+@.+/.test(email);
}

app.post("/signup", async (c) => {
  const formData = await c.req.parseBody();

  const email = formData.email;
  if (!email || typeof email !== "string" || !isValidEmail(email)) {
    return new Response("Invalid email", {
      status: 400,
    });
  }

  const password = formData.password;
  if (!password || typeof password !== "string" || password.length < 6) {
    return new Response("Invalid password", {
      status: 400,
    });
  }

  const scrypt = new Scrypt();
  const hashedPassword = await scrypt.hash(password);
  const userId = generateId(15);

  try {
    const db = await getDB({
      url: c.env.LIBSQL_DB_URL,
      authToken: c.env.LIBSQL_DB_AUTH_TOKEN,
    });
    const lucia = await getLucia({
      db,
      stage: c.env.STAGE,
    });

    await db.insert(userTable).values({
      id: userId,
      email,
      hashed_password: hashedPassword,
    });

    const session = await lucia.createSession(userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
        "Set-Cookie": sessionCookie.serialize(),
      },
    });
  } catch {
    // db error, email taken, etc
    return new Response("Email already used", {
      status: 400,
    });
  }
});

app.post("/login", async (c) => {
  const formData = await c.req.parseBody();
  const email = formData.email;
  if (!email || typeof email !== "string") {
    return new Response("Invalid email", {
      status: 400,
    });
  }
  const password = formData.password;
  if (!password || typeof password !== "string") {
    return new Response(null, {
      status: 400,
    });
  }

  try {
    const db = await getDB({
      url: c.env.LIBSQL_DB_URL,
      authToken: c.env.LIBSQL_DB_AUTH_TOKEN,
    });
    const lucia = await getLucia({
      db,
      stage: c.env.STAGE,
    });

    const user = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, email))
      .get();

    if (!user) {
      // NOTE:
      // Returning immediately allows malicious actors to figure out valid emails from response times,
      // allowing them to only focus on guessing passwords in brute-force attacks.
      // As a preventive measure, you may want to hash passwords even for invalid emails.
      // However, valid emails can be already be revealed with the signup page
      // and a similar timing issue can likely be found in password reset implementation.
      // It will also be much more resource intensive.
      // Since protecting against this is none-trivial,
      // it is crucial your implementation is protected against brute-force attacks with login throttling etc.
      // If emails/usernames are public, you may outright tell the user that the username is invalid.
      return new Response("Invalid email or password", {
        status: 400,
      });
    }

    const scrypt = new Scrypt();
    const validPassword = await scrypt.verify(user.hashed_password, password);
    if (!validPassword) {
      return new Response("Invalid email or password", {
        status: 400,
      });
    }

    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    console.log("sessionCookie", sessionCookie.serialize());
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
        "Set-Cookie": sessionCookie.serialize(),
      },
    });
  } catch {
    return new Response("Invalid email or password", {
      status: 400,
    });
  }
});

export default app;
