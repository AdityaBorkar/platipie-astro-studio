import { eq } from "drizzle-orm";
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
	const live = new Set<string>();
	for (const item of scanned) {
		const values = mapRow(item, stamp);
		live.add(String(values[keyColumn.name]));
		await db.insert(table).values(values).onConflictDoUpdate({ set: values, target: keyColumn });
	}
	for (const row of await db.select({ key: keyColumn }).from(table)) {
		const key = String(row.key);
		if (!live.has(key)) await db.delete(table).where(eq(keyColumn, row.key));
	}
	return scanned.length;
}

type PathInventoryTable = typeof components | typeof layouts | typeof templates;

async function syncAssets(root: string): Promise<number> {
	const scanned = await scanAssets(root);
	return syncTableRows(assets, assets.path, scanned, (row, stamp) => ({
		...row,
		updatedAt: stamp,
	}));
}

async function syncContent(root: string): Promise<number> {
	const scanned = await scanContentCollections(root);
	return syncTableRows(contentCollections, contentCollections.name, scanned, (row, stamp) => ({
		base: row.base,
		count: row.count,
		filePath: row.filePath,
		loader: row.loader,
		mtime: Math.round(row.mtime),
		name: row.name,
		pattern: row.pattern,
		schemaKeys: JSON.stringify(row.schemaKeys),
		updatedAt: stamp,
	}));
}

async function syncComponentDir(
	root: string,
	table: PathInventoryTable,
	dir: string,
): Promise<number> {
	const scanned = await scanComponentDir(root, dir);
	return syncTableRows(table, table.path, scanned, (row, stamp) => ({
		dir: row.dir,
		ext: row.ext,
		hasSlot: row.hasSlot ? 1 : 0,
		mtime: Math.round(row.mtime),
		name: row.name,
		path: row.path,
		props: JSON.stringify(row.props),
		size: row.size,
		updatedAt: stamp,
	}));
}

async function syncEmails(root: string): Promise<number> {
	const scanned = await scanEmails(root);
	return syncTableRows(emails, emails.path, scanned, (row, stamp) => ({
		dir: row.dir,
		ext: row.ext,
		mtime: Math.round(row.mtime),
		name: row.name,
		path: row.path,
		size: row.size,
		subject: row.subject,
		updatedAt: stamp,
	}));
}

async function syncPages(root: string): Promise<number> {
	const scanned = await scanPages(root);
	return syncTableRows(pages, pages.path, scanned, (row, stamp) => ({
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
	}));
}

async function syncAstro(root: string): Promise<number> {
	const db = getDb();
	const stamp = now();
	const scanned = await scanAstroSettings(root);
	if (!scanned) {
		await db.delete(astroSettings);
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

export async function syncScope(scope: SyncScope, root = getProjectRoot()): Promise<number> {
	let count = 0;
	switch (scope) {
		case "assets":
			count = await syncAssets(root);
			break;
		case "astro":
			count = await syncAstro(root);
			break;
		case "components":
			count = await syncComponentDir(root, components, "components");
			break;
		case "content":
			count = await syncContent(root);
			break;
		case "emails":
			count = await syncEmails(root);
			break;
		case "layouts":
			count = await syncComponentDir(root, layouts, "layouts");
			break;
		case "pages":
			count = await syncPages(root);
			break;
		case "templates":
			count = await syncComponentDir(root, templates, "templates");
			break;
	}
	await stampScope(scope, count);
	return count;
}

export async function fullSync(root = getProjectRoot()): Promise<SyncResult> {
	const scopes: ScopeStatus[] = [];
	// WARNING: bun:sqlite has a single connection — keep sequential, never Promise.all.
	for (const scope of SYNC_SCOPES) {
		const fileCount = await syncScope(scope, root);
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
const INVENTORY_SOURCES: Record<SyncScope, { key: string; read: () => Promise<unknown[]> }> = {
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
	const rows = (await source.read()) as Record<string, unknown>[];
	return rows.toSorted((a, b) =>
		String(a[source.key] ?? "").localeCompare(String(b[source.key] ?? "")),
	);
}
