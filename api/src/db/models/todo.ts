import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { userTable } from "./user";

export const todoTable = sqliteTable("todo", {
  id: text("id").notNull().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  completed: integer("completed").notNull().default(0),
  userId: text("user_id")
  .notNull()
  .references(() => userTable.id),
});
