import { promises as fs } from "node:fs";

import { notInArray } from "drizzle-orm";
import type { AnySQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";

import { getProjectRoot } from "../config.ts";
import { getDb } from "../db/index.ts";
import {
	astroSettings,
	assets,
	components,
	contentCollections,
	emails,
	layouts,
	pages,
	syncMeta,
	templates,
} from "../db/schema.ts";
import {
	scanAssets,
	scanAstroSettings,
	scanComponentDir,
	scanContentCollections,
	scanEmails,
	scanPages,
} from "./scanners.ts";

export const SYNC_SCOPES = [
	"assets",
	"astro",
	"components",
	"content",
	"emails",
	"layouts",
	"pages",
	"templates",
] as const;

export type SyncScope = (typeof SYNC_SCOPES)[number];

export interface ScopeStatus {
	fileCount: number;
	lastSync: number | null;
	scope: SyncScope;
}

export interface SyncResult {
	root: string;
	scopes: ScopeStatus[];
}

function now(): number {
	return Date.now();
}

async function stampScope(scope: SyncScope, fileCount: number): Promise<void> {
	const stamp = now();
	await getDb()
		.insert(syncMeta)
		.values({ fileCount, lastSync: stamp, scope })
		.onConflictDoUpdate({
			set: { fileCount, lastSync: stamp },
			target: syncMeta.scope,
		});
}

async function syncTableRows<TTable extends SQLiteTable, TScan>(
	table: TTable,
	keyColumn: AnySQLiteColumn,
	scanned: TScan[],
	mapRow: (item: TScan, stamp: number) => TTable["$inferInsert"] & Record<string, unknown>,
): Promise<number> {
	const db = getDb();
	const stamp = now();
	const valuesList = scanned.map((item) => mapRow(item, stamp));
	const live = new Set(valuesList.map((values) => String(values[keyColumn.name])));
	// Single transaction per scope: one bulk upsert loop plus one stale-row
	// delete, instead of N+1 autocommit statements. Empty scans never wipe:
	// a typo'd root or unreadable dir must leave tables intact.
	await db.transaction(async (tx) => {
		for (const values of valuesList) {
			await tx.insert(table).values(values).onConflictDoUpdate({ set: values, target: keyColumn });
		}
		if (live.size > 0) {
			await tx.delete(table).where(notInArray(keyColumn, [...live]));
		}
	});
	return scanned.length;
}

// Table-driven scope sync: one generic path plus the astro special case.
function makeTableSyncer<TTable extends SQLiteTable, TScan>(
	table: TTable,
	keyColumn: AnySQLiteColumn,
	scan: (root: string) => Promise<TScan[]>,
	mapRow: (item: TScan, stamp: number) => TTable["$inferInsert"] & Record<string, unknown>,
): (root: string) => Promise<number> {
	return async (root: string) => {
		const scanned = await scan(root);
		return syncTableRows(table, keyColumn, scanned, mapRow);
	};
}

const SCOPE_SYNCERS: Record<Exclude<SyncScope, "astro">, (root: string) => Promise<number>> = {
	assets: makeTableSyncer(assets, assets.path, scanAssets, (row, stamp) => ({
		...row,
		updatedAt: stamp,
	})),
	components: makeTableSyncer(
		components,
		components.path,
		(root) => scanComponentDir(root, "components"),
		(row, stamp) => ({
			dir: row.dir,
			ext: row.ext,
			hasSlot: row.hasSlot ? 1 : 0,
			mtime: Math.round(row.mtime),
			name: row.name,
			path: row.path,
			props: JSON.stringify(row.props),
			size: row.size,
			updatedAt: stamp,
		}),
	),
	content: makeTableSyncer(
		contentCollections,
		contentCollections.name,
		scanContentCollections,
		(row, stamp) => ({
			base: row.base,
			count: row.count,
			filePath: row.filePath,
			loader: row.loader,
			mtime: Math.round(row.mtime),
			name: row.name,
			pattern: row.pattern,
			schemaKeys: JSON.stringify(row.schemaKeys),
			updatedAt: stamp,
		}),
	),
	emails: makeTableSyncer(emails, emails.path, scanEmails, (row, stamp) => ({
		dir: row.dir,
		ext: row.ext,
		mtime: Math.round(row.mtime),
		name: row.name,
		path: row.path,
		size: row.size,
		subject: row.subject,
		updatedAt: stamp,
	})),
	layouts: makeTableSyncer(
		layouts,
		layouts.path,
		(root) => scanComponentDir(root, "layouts"),
		(row, stamp) => ({
			dir: row.dir,
			ext: row.ext,
			hasSlot: row.hasSlot ? 1 : 0,
			mtime: Math.round(row.mtime),
			name: row.name,
			path: row.path,
			props: JSON.stringify(row.props),
			size: row.size,
			updatedAt: stamp,
		}),
	),
	pages: makeTableSyncer(pages, pages.path, scanPages, (row, stamp) => ({
		dynamic: row.dynamic ? 1 : 0,
		hasSeo: row.hasSeo ? 1 : 0,
		mtime: Math.round(row.mtime),
		path: row.path,
		prerender: row.prerender,
		private: row.private ? 1 : 0,
		route: row.route,
		schemaTypes: JSON.stringify(row.schemaTypes),
		seoDescription: row.seoDescription,
		seoKeywords: JSON.stringify(row.seoKeywords),
		seoTitle: row.seoTitle,
		size: row.size,
		title: row.title,
		type: row.type,
		updatedAt: stamp,
	})),
	templates: makeTableSyncer(
		templates,
		templates.path,
		(root) => scanComponentDir(root, "templates"),
		(row, stamp) => ({
			dir: row.dir,
			ext: row.ext,
			hasSlot: row.hasSlot ? 1 : 0,
			mtime: Math.round(row.mtime),
			name: row.name,
			path: row.path,
			props: JSON.stringify(row.props),
			size: row.size,
			updatedAt: stamp,
		}),
	),
};

async function syncAstro(root: string): Promise<number> {
	const db = getDb();
	const stamp = now();
	const scanned = await scanAstroSettings(root);
	if (!scanned) {
		// Empty scan never wipes: leave the row intact (typo'd root already
		// throws above; a genuinely removed config stays stale, not wiped).
		return 0;
	}
	const row = {
		adapter: scanned.adapter,
		filePath: scanned.filePath,
		id: 1,
		integrations: JSON.stringify(scanned.integrations),
		mtime: Math.round(scanned.mtime),
		output: scanned.output,
		raw: scanned.raw,
		redirects: JSON.stringify(scanned.redirects),
		site: scanned.site,
		updatedAt: stamp,
	};
	await db
		.insert(astroSettings)
		.values(row)
		.onConflictDoUpdate({
			set: {
				adapter: row.adapter,
				filePath: row.filePath,
				integrations: row.integrations,
				mtime: row.mtime,
				output: row.output,
				raw: row.raw,
				redirects: row.redirects,
				site: row.site,
				updatedAt: stamp,
			},
			target: astroSettings.id,
		});
	return 1;
}

async function assertRootReachable(root: string): Promise<void> {
	const st = await fs.stat(root).catch(() => null);
	if (!st || !st.isDirectory()) {
		throw new Error(`[sync] root unreachable, refusing sync: ${root}`);
	}
}

function syncScopeCount(scope: SyncScope, root: string): Promise<number> {
	return scope === "astro" ? syncAstro(root) : SCOPE_SYNCERS[scope](root);
}

export async function syncScope(scope: SyncScope, root = getProjectRoot()): Promise<number> {
	await assertRootReachable(root);
	const count = await syncScopeCount(scope, root);
	await stampScope(scope, count);
	return count;
}

export async function fullSync(root = getProjectRoot()): Promise<SyncResult> {
	await assertRootReachable(root);
	const scopes: ScopeStatus[] = [];
	// WARNING: bun:sqlite has a single connection — keep sequential, never Promise.all.
	// Two-phase: count first so an all-zero scan (typo'd root, unmounted
	// volume) never wipes tables + stamps success.
	const counts = new Map<SyncScope, number>();
	for (const scope of SYNC_SCOPES) {
		counts.set(scope, await syncScopeCount(scope, root));
	}
	const total = [...counts.values()].reduce((a, b) => a + b, 0);
	if (total === 0) {
		console.warn(
			`[sync] refusing full sync of ${root}: all scopes scanned 0 files, tables left intact`,
		);
		for (const scope of SYNC_SCOPES) {
			scopes.push({ fileCount: 0, lastSync: null, scope });
		}
		return { root, scopes };
	}
	for (const scope of SYNC_SCOPES) {
		const fileCount = counts.get(scope) ?? 0;
		await stampScope(scope, fileCount);
		scopes.push({ fileCount, lastSync: now(), scope });
	}
	return { root, scopes };
}

export async function getSyncStatus(): Promise<ScopeStatus[]> {
	const db = getDb();
	const rows = await db.select().from(syncMeta);
	const byScope = new Map(rows.map((row) => [row.scope, row]));
	return SYNC_SCOPES.map((scope) => {
		const row = byScope.get(scope);
		return {
			fileCount: row?.fileCount ?? 0,
			lastSync: row && row.lastSync > 0 ? row.lastSync : null,
			scope,
		};
	});
}

// Thunks keep drizzle table inference (no casts).
const INVENTORY_SOURCES: Record<
	SyncScope,
	{ key: string; read: () => Promise<Record<string, unknown>[]> }
> = {
	assets: { key: "path", read: () => getDb().select().from(assets) },
	astro: { key: "id", read: () => getDb().select().from(astroSettings) },
	components: { key: "path", read: () => getDb().select().from(components) },
	content: { key: "name", read: () => getDb().select().from(contentCollections) },
	emails: { key: "path", read: () => getDb().select().from(emails) },
	layouts: { key: "path", read: () => getDb().select().from(layouts) },
	pages: { key: "path", read: () => getDb().select().from(pages) },
	templates: { key: "path", read: () => getDb().select().from(templates) },
};

export async function getInventory(scope: SyncScope): Promise<Record<string, unknown>[]> {
	const source = INVENTORY_SOURCES[scope];
	const rows = await source.read();
	return rows.toSorted((a, b) =>
		String(a[source.key] ?? "").localeCompare(String(b[source.key] ?? "")),
	);
}
