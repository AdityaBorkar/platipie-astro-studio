import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

import { drizzle } from "drizzle-orm/bun-sqlite";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

import { getDbPath, migrateLegacyFileSync } from "../paths.ts";
import { SYNC_DDL } from "./ddl.ts";

export type SyncDb = BunSQLiteDatabase;

let db: SyncDb | null = null;

export function getDb(): SyncDb {
	if (db) return db;
	const file = getDbPath();
	mkdirSync(path.dirname(file), { recursive: true });
	migrateLegacyFileSync(file);
	// WAL sidecars are recreated by SQLite on open; legacy sidecars are never carried over.
	const sqlite = new Database(file, { create: true });
	sqlite.exec("PRAGMA journal_mode = WAL;");
	sqlite.exec("PRAGMA synchronous = NORMAL;");
	for (const stmt of SYNC_DDL) sqlite.exec(stmt);
	db = drizzle(sqlite);
	return db;
}

// Close shared connection so CLI/watcher processes exit cleanly.
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
