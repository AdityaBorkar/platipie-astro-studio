import { defineConfig } from "drizzle-kit";

import { getDbPath } from "./src/cms/paths.ts";

export default defineConfig({
	dbCredentials: { url: process.env.CMS_DB_PATH?.trim() || getDbPath() },
	dialect: "sqlite",
	out: "./drizzle",
	schema: "./src/cms/db/schema.ts",
});
