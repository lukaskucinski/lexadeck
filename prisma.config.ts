import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // CLI operations (db push, migrate) use the direct connection
    url: process.env.DIRECT_URL ?? "",
  },
});
