// Sync engine: scan slices of the Astro checkout and mirror them into
// SQLite (drizzle-orm). Files on disk stay the source of truth; the DB is a
// read-model the UI pages render from.
import { eq, sql } from "drizzle-orm";

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

async function syncAssets(root: string): Promise<number> {
	const db = getDb();
	const stamp = now();
	const scanned = await scanAssets(root);
	const live = new Set(scanned.map((row) => row.path));
	for (const row of scanned) {
		await db
			.insert(assets)
			.values({ ...row, updatedAt: stamp })
			.onConflictDoUpdate({
				set: {
					dir: sql`excluded.dir`,
					ext: sql`excluded.ext`,
					kind: sql`excluded.kind`,
					mtime: sql`excluded.mtime`,
					name: sql`excluded.name`,
					size: sql`excluded.size`,
					updatedAt: stamp,
				},
				target: assets.path,
			});
	}
	for (const row of await db.select({ path: assets.path }).from(assets)) {
		if (!live.has(row.path)) await db.delete(assets).where(eq(assets.path, row.path));
	}
	return scanned.length;
}

async function syncContent(root: string): Promise<number> {
	const db = getDb();
	const stamp = now();
	const scanned = await scanContentCollections(root);
	await db.delete(contentCollections);
	if (scanned.length > 0) {
		await db.insert(contentCollections).values(
			scanned.map((row) => ({
				base: row.base,
				count: row.count,
				filePath: row.filePath,
				loader: row.loader,
				mtime: Math.round(row.mtime),
				name: row.name,
				pattern: row.pattern,
				schemaKeys: JSON.stringify(row.schemaKeys),
				updatedAt: stamp,
			})),
		);
	}
	return scanned.length;
}

async function syncComponentDir(
	root: string,
	table: typeof components | typeof layouts | typeof templates,
	pathColumn: typeof components.path | typeof layouts.path | typeof templates.path,
	dir: string,
): Promise<number> {
	const db = getDb();
	const stamp = now();
	// The three inventory tables share identical columns; normalize the type
	// so drizzle's query builder stays fully inferred.
	const tableAs = table as typeof components;
	const pathAs = pathColumn as typeof components.path;
	const scanned = await scanComponentDir(root, dir);
	const live = new Set(scanned.map((row) => row.path));
	for (const row of scanned) {
		await db
			.insert(tableAs)
			.values({
				dir: row.dir,
				ext: row.ext,
				hasSlot: row.hasSlot ? 1 : 0,
				mtime: Math.round(row.mtime),
				name: row.name,
				path: row.path,
				props: JSON.stringify(row.props),
				size: row.size,
				updatedAt: stamp,
			})
			.onConflictDoUpdate({
				set: {
					dir: sql`excluded.dir`,
					ext: sql`excluded.ext`,
					hasSlot: sql`excluded.has_slot`,
					mtime: sql`excluded.mtime`,
					name: sql`excluded.name`,
					props: sql`excluded.props`,
					size: sql`excluded.size`,
					updatedAt: stamp,
				},
				target: pathAs,
			});
	}
	for (const existing of await db.select({ path: pathAs }).from(tableAs)) {
		if (!live.has(existing.path)) await db.delete(tableAs).where(eq(pathAs, existing.path));
	}
	return scanned.length;
}

async function syncEmails(root: string): Promise<number> {
	const db = getDb();
	const stamp = now();
	const scanned = await scanEmails(root);
	const live = new Set(scanned.map((row) => row.path));
	for (const row of scanned) {
		await db
			.insert(emails)
			.values({
				dir: row.dir,
				ext: row.ext,
				mtime: Math.round(row.mtime),
				name: row.name,
				path: row.path,
				size: row.size,
				subject: row.subject,
				updatedAt: stamp,
			})
			.onConflictDoUpdate({
				set: {
					dir: sql`excluded.dir`,
					ext: sql`excluded.ext`,
					mtime: sql`excluded.mtime`,
					name: sql`excluded.name`,
					size: sql`excluded.size`,
					subject: sql`excluded.subject`,
					updatedAt: stamp,
				},
				target: emails.path,
			});
	}
	for (const row of await db.select({ path: emails.path }).from(emails)) {
		if (!live.has(row.path)) await db.delete(emails).where(eq(emails.path, row.path));
	}
	return scanned.length;
}

async function syncPages(root: string): Promise<number> {
	const db = getDb();
	const stamp = now();
	const scanned = await scanPages(root);
	const live = new Set(scanned.map((row) => row.path));
	for (const row of scanned) {
		await db
			.insert(pages)
			.values({
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
			})
			.onConflictDoUpdate({
				set: {
					dynamic: sql`excluded.dynamic`,
					hasSeo: sql`excluded.has_seo`,
					mtime: sql`excluded.mtime`,
					prerender: sql`excluded.prerender`,
					private: sql`excluded.private`,
					route: sql`excluded.route`,
					schemaTypes: sql`excluded.schema_types`,
					seoDescription: sql`excluded.seo_description`,
					seoKeywords: sql`excluded.seo_keywords`,
					seoTitle: sql`excluded.seo_title`,
					size: sql`excluded.size`,
					title: sql`excluded.title`,
					type: sql`excluded.type`,
					updatedAt: stamp,
				},
				target: pages.path,
			});
	}
	for (const row of await db.select({ path: pages.path }).from(pages)) {
		if (!live.has(row.path)) await db.delete(pages).where(eq(pages.path, row.path));
	}
	return scanned.length;
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

/** Sync one scope and record its watermark. Returns the mirrored row count. */
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
			count = await syncComponentDir(root, components, components.path, "components");
			break;
		case "content":
			count = await syncContent(root);
			break;
		case "emails":
			count = await syncEmails(root);
			break;
		case "layouts":
			count = await syncComponentDir(root, layouts, layouts.path, "layouts");
			break;
		case "pages":
			count = await syncPages(root);
			break;
		case "templates":
			count = await syncComponentDir(root, templates, templates.path, "templates");
			break;
	}
	await stampScope(scope, count);
	return count;
}

/** Sync every scope. Used by the CLI `--once` path and the watcher bootstrap. */
export async function fullSync(root = getProjectRoot()): Promise<SyncResult> {
	const scopes: ScopeStatus[] = [];
	for (const scope of SYNC_SCOPES) {
		const fileCount = await syncScope(scope, root);
		scopes.push({ fileCount, lastSync: now(), scope });
	}
	return { root, scopes };
}

/** Watermarks for every scope (`lastSync: null` = never synced). */
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

/** Read mirrored rows for one scope (UI pages render from this, not the FS). */
export async function getInventory(scope: SyncScope): Promise<Record<string, unknown>[]> {
	const db = getDb();
	let key: string;
	let rows: Record<string, unknown>[];
	switch (scope) {
		case "assets":
			rows = (await db.select().from(assets)) as unknown as Record<string, unknown>[];
			key = "path";
			break;
		case "astro":
			rows = (await db.select().from(astroSettings)) as unknown as Record<string, unknown>[];
			key = "id";
			break;
		case "components":
			rows = (await db.select().from(components)) as unknown as Record<string, unknown>[];
			key = "path";
			break;
		case "content":
			rows = (await db.select().from(contentCollections)) as unknown as Record<string, unknown>[];
			key = "name";
			break;
		case "emails":
			rows = (await db.select().from(emails)) as unknown as Record<string, unknown>[];
			key = "path";
			break;
		case "layouts":
			rows = (await db.select().from(layouts)) as unknown as Record<string, unknown>[];
			key = "path";
			break;
		case "pages":
			rows = (await db.select().from(pages)) as unknown as Record<string, unknown>[];
			key = "path";
			break;
		case "templates":
			rows = (await db.select().from(templates)) as unknown as Record<string, unknown>[];
			key = "path";
			break;
	}
	return rows.toSorted((a, b) => String(a[key] ?? "").localeCompare(String(b[key] ?? "")));
}
