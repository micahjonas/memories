import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const userTable = sqliteTable("user", {
  id: text("id").notNull().primaryKey(),
  email: text("email").unique().notNull(),
  hashed_password: text("hashed_password").notNull(),
});
