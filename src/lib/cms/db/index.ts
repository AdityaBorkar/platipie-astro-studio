// SQLite connection + DDL for the sync read-model. Server-only.
//
// Uses `bun:sqlite` (no native postinstall needed) through drizzle-orm.
// The DB file lives at `CMS_DB_PATH` or `<XDG_DATA_HOME>/platipie-cms-dev/cms.db`
// (see `../paths.ts`). Legacy `<cwd>/.data/cms.db` is migrated once on open.
import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import { drizzle } from "drizzle-orm/bun-sqlite";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

import { getDbPath as resolveDbPath, migrateLegacyFileSync } from "../paths.ts";

export type SyncDb = BunSQLiteDatabase;

let db: SyncDb | null = null;

export function getDbPath(): string {
	return resolveDbPath();
}

// DDL mirrors db/schema.ts — update both together.

const DDL = [
	`CREATE TABLE IF NOT EXISTS assets (
		path TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '', dir TEXT NOT NULL DEFAULT '',
		ext TEXT NOT NULL DEFAULT '', kind TEXT NOT NULL DEFAULT 'other',
		size INTEGER NOT NULL DEFAULT 0, mtime INTEGER NOT NULL DEFAULT 0,
		updated_at INTEGER NOT NULL DEFAULT 0
	)`,
	`CREATE TABLE IF NOT EXISTS content_collections (
		name TEXT PRIMARY KEY, base TEXT NOT NULL DEFAULT '', pattern TEXT NOT NULL DEFAULT '',
		loader TEXT NOT NULL DEFAULT '', schema_keys TEXT NOT NULL DEFAULT '[]',
		file_path TEXT NOT NULL DEFAULT '', mtime INTEGER NOT NULL DEFAULT 0,
		count INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL DEFAULT 0
	)`,
	`CREATE TABLE IF NOT EXISTS components (
		path TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '', dir TEXT NOT NULL DEFAULT '',
		ext TEXT NOT NULL DEFAULT '', size INTEGER NOT NULL DEFAULT 0,
		mtime INTEGER NOT NULL DEFAULT 0, props TEXT NOT NULL DEFAULT '[]',
		has_slot INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL DEFAULT 0
	)`,
	`CREATE TABLE IF NOT EXISTS layouts (
		path TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '', dir TEXT NOT NULL DEFAULT '',
		ext TEXT NOT NULL DEFAULT '', size INTEGER NOT NULL DEFAULT 0,
		mtime INTEGER NOT NULL DEFAULT 0, props TEXT NOT NULL DEFAULT '[]',
		has_slot INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL DEFAULT 0
	)`,
	`CREATE TABLE IF NOT EXISTS templates (
		path TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '', dir TEXT NOT NULL DEFAULT '',
		ext TEXT NOT NULL DEFAULT '', size INTEGER NOT NULL DEFAULT 0,
		mtime INTEGER NOT NULL DEFAULT 0, props TEXT NOT NULL DEFAULT '[]',
		has_slot INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL DEFAULT 0
	)`,
	`CREATE TABLE IF NOT EXISTS emails (
		path TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '', dir TEXT NOT NULL DEFAULT '',
		ext TEXT NOT NULL DEFAULT '', size INTEGER NOT NULL DEFAULT 0,
		mtime INTEGER NOT NULL DEFAULT 0, subject TEXT,
		updated_at INTEGER NOT NULL DEFAULT 0
	)`,
	`CREATE TABLE IF NOT EXISTS pages (
		path TEXT PRIMARY KEY, route TEXT NOT NULL DEFAULT '', title TEXT NOT NULL DEFAULT '',
		type TEXT NOT NULL DEFAULT '', dynamic INTEGER NOT NULL DEFAULT 0,
		private INTEGER NOT NULL DEFAULT 0, mtime INTEGER NOT NULL DEFAULT 0,
		size INTEGER NOT NULL DEFAULT 0, prerender TEXT NOT NULL DEFAULT 'unset',
		has_seo INTEGER NOT NULL DEFAULT 0, seo_title TEXT, seo_description TEXT,
		seo_keywords TEXT NOT NULL DEFAULT '[]', schema_types TEXT NOT NULL DEFAULT '[]',
		updated_at INTEGER NOT NULL DEFAULT 0
	)`,
	`CREATE TABLE IF NOT EXISTS astro_settings (
		id INTEGER PRIMARY KEY, raw TEXT NOT NULL DEFAULT '',
		site TEXT, output TEXT, adapter TEXT, integrations TEXT NOT NULL DEFAULT '[]',
		redirects TEXT NOT NULL DEFAULT '{}', file_path TEXT NOT NULL DEFAULT '',
		mtime INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL DEFAULT 0
	)`,
	`CREATE TABLE IF NOT EXISTS sync_meta (
		scope TEXT PRIMARY KEY, file_count INTEGER NOT NULL DEFAULT 0,
		last_sync INTEGER NOT NULL DEFAULT 0
	)`,
];

/** Open (and create tables for) the SQLite mirror. Safe to call repeatedly. */
export function getDb(): SyncDb {
	if (db) return db;
	const file = getDbPath();
	mkdirSync(path.dirname(file), { recursive: true });
	migrateLegacyFileSync(file);
	// WAL sidecars travel with the main file; carry them over on migration.
	for (const suffix of ["-wal", "-shm"]) {
		if (!existsSync(`${file}${suffix}`)) migrateLegacyFileSync(`${file}${suffix}`);
	}
	const sqlite = new Database(file, { create: true });
	sqlite.exec("PRAGMA journal_mode = WAL;");
	sqlite.exec("PRAGMA synchronous = NORMAL;");
	for (const stmt of DDL) sqlite.exec(stmt);
	db = drizzle(sqlite);
	return db;
}

/** Close the shared connection (lets CLI/watcher processes exit cleanly). */
export function closeDb(): void {
	if (db) {
		try {
			(db as unknown as { $client: Database }).$client.close();
		} catch {
			// Already closed — nothing to do.
		}
		db = null;
	}
}
