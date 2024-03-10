import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

export const getDB = async ({
  url,
  authToken,
}: {
  url: string;
  authToken: string;
}) => {
  const client = await createClient({
    url,
    authToken,
  });

  return drizzle(client);
};
