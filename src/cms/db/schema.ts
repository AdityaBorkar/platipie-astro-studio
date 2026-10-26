import { integer, text } from "drizzle-orm/sqlite-core";
import { sqliteTable } from "drizzle-orm/sqlite-core";

export const assets = sqliteTable("assets", {
	dir: text("dir").notNull().default(""),
	ext: text("ext").notNull().default(""),
	kind: text("kind").notNull().default("other"),
	mtime: integer("mtime").notNull().default(0),
	name: text("name").notNull().default(""),
	path: text("path").primaryKey(),
	size: integer("size").notNull().default(0),
	updatedAt: integer("updated_at").notNull().default(0),
});

export const contentCollections = sqliteTable("content_collections", {
	base: text("base").notNull().default(""),
	count: integer("count").notNull().default(0),
	filePath: text("file_path").notNull().default(""),
	loader: text("loader").notNull().default(""),
	mtime: integer("mtime").notNull().default(0),
	name: text("name").primaryKey(),
	pattern: text("pattern").notNull().default(""),
	schemaKeys: text("schema_keys").notNull().default("[]"),
	updatedAt: integer("updated_at").notNull().default(0),
});

const fileInventoryColumns = {
	dir: text("dir").notNull().default(""),
	ext: text("ext").notNull().default(""),
	hasSlot: integer("has_slot").notNull().default(0),
	mtime: integer("mtime").notNull().default(0),
	name: text("name").notNull().default(""),
	path: text("path").primaryKey(),
	props: text("props").notNull().default("[]"),
	size: integer("size").notNull().default(0),
	updatedAt: integer("updated_at").notNull().default(0),
} as const;

export const components = sqliteTable("components", fileInventoryColumns);

export const layouts = sqliteTable("layouts", fileInventoryColumns);

export const templates = sqliteTable("templates", fileInventoryColumns);

export const emails = sqliteTable("emails", {
	dir: text("dir").notNull().default(""),
	ext: text("ext").notNull().default(""),
	mtime: integer("mtime").notNull().default(0),
	name: text("name").notNull().default(""),
	path: text("path").primaryKey(),
	size: integer("size").notNull().default(0),
	subject: text("subject"),
	updatedAt: integer("updated_at").notNull().default(0),
});

export const pages = sqliteTable("pages", {
	dynamic: integer("dynamic").notNull().default(0),
	hasSeo: integer("has_seo").notNull().default(0),
	mtime: integer("mtime").notNull().default(0),
	path: text("path").primaryKey(),
	prerender: text("prerender").notNull().default("unset"),
	private: integer("private").notNull().default(0),
	route: text("route").notNull().default(""),
	schemaTypes: text("schema_types").notNull().default("[]"),
	seoDescription: text("seo_description"),
	seoKeywords: text("seo_keywords").notNull().default("[]"),
	seoTitle: text("seo_title"),
	size: integer("size").notNull().default(0),
	title: text("title").notNull().default(""),
	type: text("type").notNull().default(""),
	updatedAt: integer("updated_at").notNull().default(0),
});

export const astroSettings = sqliteTable("astro_settings", {
	adapter: text("adapter"),
	filePath: text("file_path").notNull().default(""),
	id: integer("id").primaryKey(),
	integrations: text("integrations").notNull().default("[]"),
	mtime: integer("mtime").notNull().default(0),
	output: text("output"),
	raw: text("raw").notNull().default(""),
	redirects: text("redirects").notNull().default("{}"),
	site: text("site"),
	updatedAt: integer("updated_at").notNull().default(0),
});

export const syncMeta = sqliteTable("sync_meta", {
	fileCount: integer("file_count").notNull().default(0),
	lastSync: integer("last_sync").notNull().default(0),
	scope: text("scope").primaryKey(),
});

export type AssetRow = typeof assets.$inferSelect;
export type ComponentRow = typeof components.$inferSelect;
export type ContentCollectionRow = typeof contentCollections.$inferSelect;
export type EmailRow = typeof emails.$inferSelect;
export type PageRow = typeof pages.$inferSelect;
