import { getDB } from "../db/connect"
import type { DrizzleD1Database } from "drizzle-orm/d1"

let drizzle: ReturnType<typeof initializeDrizzle>





export default defineEventHandler(async (c) => {

  if (!drizzle) {
    drizzle = getDB(DB)
  }

  event.context.db = drizzle
})

// declare module "h3" {
//   interface H3EventContext {
//     db: DrizzleD1Database
//   }
// }