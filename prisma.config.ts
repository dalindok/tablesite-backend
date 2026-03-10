import "dotenv/config";
import { defineConfig, env } from "@prisma/config";

export default defineConfig({
  // Prisma 7+ no longer supports defining the database URL in schema.prisma.
  // Move it here so migration/introspection commands can read it from a single source.
  datasource: {
    url: env("DATABASE_URL"),
  },
});
