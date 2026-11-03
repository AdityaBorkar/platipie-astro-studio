// `media.ts` stays separate: binary streaming + multipart upload are not JSON procedures.
import { promises as fs } from "node:fs";
import path from "node:path";

import {
	collectionCounts,
	COLLECTIONS,
	driftWarnings,
	listEntries,
	recentEdits,
} from "#/cms/collections.ts";
import { envStatus, resolveRepoPath } from "#/cms/config.ts";
import { CmsError } from "#/cms/errors.ts";
import { readPageSeo, readSchemaOptions, writePageSeo } from "#/cms/page-seo.ts";
import type { PageSeoPatch } from "#/cms/page-seo.ts";
import { browseDirectory, listProjects, selectProject } from "#/cms/projects.ts";
import {
	createEntry,
	duplicateEntry,
	listTrash,
	loadEntry,
	purgeExpiredTrash,
	renameEntry,
	restoreTrash,
	saveEntry,
	softDelete,
	unifiedDiff,
} from "#/cms/save.ts";
import { readSchemaDetail } from "#/cms/schema-detail.ts";
import { aiSuggest, scoreEntry } from "#/cms/seo.ts";
import {
	parseSettingsDetailed,
	patchSettingsValues,
	readSettingsRaw,
	writeSettingsRaw,
} from "#/cms/settings.ts";
import { getInventory, getSyncStatus, SYNC_SCOPES, fullSync, syncScope } from "#/cms/sync/index.ts";
import type { SyncScope } from "#/cms/sync/index.ts";
import { getWorkspace } from "#/cms/workspace.ts";
import { aiBase, base } from "./base.ts";
import {
	aiSuggestSchema,
	browseSchema,
	diffGetSchema,
	duplicateSchema,
	entriesCreateSchema,
	entriesListSchema,
	entryDeleteSchema,
	entryGetSchema,
	entrySaveSchema,
	inventoryGetSchema,
	pageGetSchema,
	pageSaveSchema,
	projectsListSchema,
	projectsSelectSchema,
	renameSchema,
	restoreRunSchema,
	schemaGetSchema,
	seoGetSchema,
	settingsSaveSchema,
	syncRunSchema,
} from "./schemas.ts";

function filterByQuery<T>(items: T[], q: string, fields: (keyof T)[]): T[] {
	const needle = q.toLowerCase();
	if (!needle) return items;
	return items.filter((item) =>
		fields.some((field) =>
			String(item[field] ?? "")
				.toLowerCase()
				.includes(needle),
		),
	);
}

const collectionsList = base.route({ method: "GET", path: "/collections" }).handler(async () => {
	const [counts, drift, recent, env] = await Promise.all([
		collectionCounts(),
		driftWarnings(),
		recentEdits(20),
		envStatus(),
	]);
	const collections = await Promise.all(
		COLLECTIONS.map((c) =>
			Object.assign({}, c, {
				count: counts[c.id] ?? 0,
				entries: undefined,
			}),
		),
	);
	return { collections, counts, drift, env, recent };
});

const entriesList = base
	.route({ method: "GET", path: "/entries" })
	.input(entriesListSchema)
	.handler(async ({ input }) => {
		const entries = await listEntries(input.collection);
		return {
			collection: input.collection,
			entries: filterByQuery(entries, input.q ?? "", ["id", "title", "path"]),
		};
	});

const entriesCreate = base
	.route({ method: "POST", path: "/entries", successStatus: 201 })
	.input(entriesCreateSchema)
	.handler(({ input }) => {
		return createEntry(input.collection, input.slug, {
			body: input.body,
			ext: input.ext,
			fromTemplate: input.fromTemplate,
			frontmatter: input.frontmatter,
		});
	});

const entryGet = base
	.route({ method: "GET", path: "/entry" })
	.input(entryGetSchema)
	.handler(({ input }) => loadEntry(input.path));

const entrySave = base
	.route({ method: "PUT", path: "/entry" })
	.input(entrySaveSchema)
	.handler(({ input }) => saveEntry(input.ref, input.payload, { force: input.force }));

const entryRemove = base
	.route({ method: "DELETE", path: "/entry" })
	.input(entryDeleteSchema)
	.handler(({ input }) => softDelete(input.path, input.rowId));

const pageGet = base
	.route({ method: "GET", path: "/page" })
	.input(pageGetSchema)
	.handler(async ({ input }) => {
		const [page, options] = await Promise.all([readPageSeo(input.path), readSchemaOptions()]);
		return { ...page, options };
	});

const pageSave = base
	.route({ method: "PUT", path: "/page" })
	.input(pageSaveSchema)
	.handler(({ input }) => {
		const patch: PageSeoPatch = { ...input.seo };
		if (input.schema !== undefined) patch.schema = input.schema;
		// No inline re-sync: the FS watcher is the sole sync path.
		return writePageSeo(input.path, patch, input.mtime, { force: input.force });
	});

const projectsList = base
	.route({ method: "GET", path: "/projects" })
	.input(projectsListSchema)
	.handler(async ({ input }) => {
		const projects = await listProjects();
		return {
			projects: filterByQuery(projects, input.q ?? "", ["name", "displayPath", "branch"]),
		};
	});

const projectsSelect = base
	.route({ method: "POST", path: "/projects" })
	.input(projectsSelectSchema)
	.handler(async ({ input }) => ({ workspace: await selectProject(input.root) }));

const projectsBrowse = base
	.route({ method: "GET", path: "/projects/browse" })
	.input(browseSchema)
	.handler(({ input }) => browseDirectory(input.path ?? undefined));

const settingsGet = base.route({ method: "GET", path: "/settings" }).handler(async () => {
	const [{ mtime, raw }, env] = await Promise.all([readSettingsRaw(), envStatus()]);
	const { errors, values } = parseSettingsDetailed(raw);
	return { env, errors, mtime, raw, values };
});

const settingsSave = base
	.route({ method: "PUT", path: "/settings" })
	.input(settingsSaveSchema)
	.handler(async ({ input }) => {
		if (input.raw !== undefined) {
			const res = await writeSettingsRaw(input.raw, input.mtime, { force: input.force });
			return {
				...res,
				errors: parseSettingsDetailed(input.raw).errors,
				raw: input.raw,
				values: parseSettingsDetailed(input.raw).values,
			};
		}
		if (input.values !== undefined) {
			return patchSettingsValues(input.values, input.mtime, { force: input.force });
		}
		throw new CmsError("VALIDATION", "raw or values required", { status: 400 });
	});

const syncStatus = base.route({ method: "GET", path: "/sync" }).handler(async () => {
	return { status: await getSyncStatus() };
});

const syncRun = base
	.route({ method: "POST", path: "/sync" })
	.input(syncRunSchema)
	.handler(async ({ input }) => {
		if (input.scope) {
			const fileCount = await syncScope(input.scope);
			return { fileCount, scope: input.scope, status: await getSyncStatus() };
		}
		const result = await fullSync();
		return { ...result, status: await getSyncStatus() };
	});

const inventoryGet = base
	.route({ method: "GET", path: "/inventory" })
	.input(inventoryGetSchema)
	.handler(async ({ input }) => {
		// input.scope is pre-split and validated by the schema (no manual checks).
		const scopes = input.scope ?? ["all"];
		const status = await getSyncStatus();
		if (scopes.includes("all")) {
			const entries = await Promise.all(
				SYNC_SCOPES.map(async (entry) => [entry, await getInventory(entry)] as const),
			);
			const rows = Object.fromEntries(entries) as Record<SyncScope, Record<string, unknown>[]>;
			return { rows, scope: "all", status };
		}
		const unique = [...new Set(scopes)] as SyncScope[];
		if (unique.length === 1) {
			const scope = unique[0];
			return { rows: await getInventory(scope), scope, status };
		}
		const entries = await Promise.all(
			unique.map(async (scope) => [scope, await getInventory(scope)] as const),
		);
		const rows = Object.fromEntries(entries) as Record<string, Record<string, unknown>[]>;
		return { rows, scope: unique.join(","), status };
	});

const diffGet = base
	.route({ method: "GET", path: "/diff" })
	.input(diffGetSchema)
	.handler(async ({ input }) => {
		const abs = resolveRepoPath(input.path);
		let cur: string;
		try {
			cur = await fs.readFile(abs, "utf8");
		} catch (e) {
			if (e instanceof CmsError) throw e;
			if ((e as NodeJS.ErrnoException)?.code === "ENOENT") {
				throw new CmsError("NOT_FOUND", `Not found: ${input.path}`, { status: 404 });
			}
			throw e;
		}
		const rev = input.rev ?? "bak";
		const bakPath = rev === "bak" ? `${abs}.bak` : `${abs}.bak.${path.basename(rev)}`;
		if (!bakPath.startsWith(abs)) {
			throw new CmsError("VALIDATION", "Invalid revision", { status: 400 });
		}
		const old = await fs.readFile(bakPath, "utf8").catch(() => "");
		if (!old) return { diff: "", note: "No backup revision found", path: input.path };
		return { diff: unifiedDiff(old, cur, input.path), path: input.path };
	});

const duplicateCreate = base
	.route({ method: "POST", path: "/duplicate", successStatus: 201 })
	.input(duplicateSchema)
	.handler(({ input }) => duplicateEntry(input.path));

const renameRun = base
	.route({ method: "POST", path: "/rename" })
	.input(renameSchema)
	.handler(({ input }) => renameEntry(input.path, input.newSlug));

const restoreList = base.route({ method: "GET", path: "/restore" }).handler(async () => {
	const items = await listTrash();
	const purged = await purgeExpiredTrash().catch(() => ({ purged: 0 }));
	return { purged: purged.purged, trash: items };
});

const restoreRun = base
	.route({ method: "POST", path: "/restore" })
	.input(restoreRunSchema)
	.handler(({ input }) => restoreTrash(input.trashPath));

const seoScore = base
	.route({ method: "GET", path: "/seo" })
	.input(seoGetSchema)
	.handler(async ({ input }) => {
		const entry = await loadEntry(input.path);
		if (entry.corrupt) {
			throw new CmsError(
				"VALIDATION",
				`Frontmatter YAML is corrupt — fix it before scoring: ${entry.parseError ?? "Unparsable YAML"}`,
				{ fields: { frontmatter: entry.parseError ?? "Unparsable YAML" }, status: 422 },
			);
		}
		const slug = path.parse(input.path).name;
		return { ...scoreEntry(entry.frontmatter, entry.body, slug), corrupt: false };
	});

const schemaGet = base
	.route({ method: "GET", path: "/schema" })
	.input(schemaGetSchema)
	.handler(({ input }) => readSchemaDetail(input.type));

const aiSuggestRun = aiBase
	.route({ method: "POST", path: "/seo/ai" })
	.input(aiSuggestSchema)
	.handler(({ input }) => aiSuggest(input.action, input.frontmatter ?? {}, input.body ?? ""));

const workspaceGet = base
	.route({ method: "GET", path: "/workspace" })
	.handler(() => getWorkspace());

export const cmsRouter = {
	collections: {
		list: collectionsList,
	},
	diff: {
		get: diffGet,
	},
	duplicate: {
		create: duplicateCreate,
	},
	entries: {
		create: entriesCreate,
		list: entriesList,
	},
	entry: {
		get: entryGet,
		remove: entryRemove,
		save: entrySave,
	},
	inventory: {
		get: inventoryGet,
	},
	page: {
		get: pageGet,
		save: pageSave,
	},
	projects: {
		browse: projectsBrowse,
		list: projectsList,
		select: projectsSelect,
	},
	rename: {
		run: renameRun,
	},
	restore: {
		list: restoreList,
		run: restoreRun,
	},
	schema: {
		get: schemaGet,
	},
	seo: {
		score: seoScore,
		suggest: aiSuggestRun,
	},
	settings: {
		get: settingsGet,
		save: settingsSave,
	},
	sync: {
		run: syncRun,
		status: syncStatus,
	},
	workspace: {
		get: workspaceGet,
	},
};

export type CmsRouter = typeof cmsRouter;
