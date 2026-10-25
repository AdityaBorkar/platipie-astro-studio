import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dbCredentials: { url: process.env.CMS_DB_PATH ?? "./.data/cms.db" },
	dialect: "sqlite",
	out: "./drizzle",
	schema: "./src/lib/cms/db/schema.ts",
});
