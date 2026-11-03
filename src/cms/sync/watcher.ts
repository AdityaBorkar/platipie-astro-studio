import path from "node:path";

import { watch } from "chokidar";

import { getProjectRoot } from "../config.ts";
import { SYNC_SCOPES, fullSync, syncScope } from "./index.ts";
import type { SyncScope } from "./index.ts";

// Watched roots per scope. Chokidar watches these dirs/files directly —
// no glob matching, so the watch list and the scope matcher cannot drift.
const SCOPE_ROOTS: { roots: string[]; scope: SyncScope }[] = [
	{ roots: ["assets"], scope: "assets" },
	{ roots: ["cms", "content.config.ts", "src/content.config.ts"], scope: "content" },
	{ roots: ["src/components"], scope: "components" },
	{ roots: ["src/emails"], scope: "emails" },
	{ roots: ["src/layouts"], scope: "layouts" },
	{ roots: ["src/pages"], scope: "pages" },
	{ roots: ["src/templates"], scope: "templates" },
	{ roots: ["astro.config.mjs"], scope: "astro" },
];

function scopeForPath(root: string, absPath: string): SyncScope[] {
	const rel = path.relative(root, absPath).replaceAll("\\", "/");
	const scopes = new Set<SyncScope>();
	for (const { roots, scope } of SCOPE_ROOTS) {
		for (const watched of roots) {
			if (rel === watched || rel.startsWith(`${watched}/`)) scopes.add(scope);
		}
	}
	return [...scopes];
}

export interface WatcherHandle {
	close: () => Promise<void>;
	root: string;
}

const WATCHED_ROOTS = [...new Set(SCOPE_ROOTS.flatMap(({ roots }) => roots))];

export async function startWatcher(root = getProjectRoot()): Promise<WatcherHandle> {
	const initial = await fullSync(root);
	console.log(
		`[watcher] initial sync of ${root}: ` +
			initial.scopes.map((s) => `${s.scope}=${s.fileCount}`).join(" "),
	);
	const pending = new Map<SyncScope, ReturnType<typeof setTimeout>>();
	const watcher = watch(
		WATCHED_ROOTS.map((rel) => path.join(root, rel)),
		{
			atomic: 200,
			depth: 12,
			ignoreInitial: true,
			ignored: (absPath: string) => {
				const rel = path.relative(root, absPath).replaceAll("\\", "/");
				if (
					/(^|\/)(node_modules|\.git|\.output|dist|\.nitro|\.data|\.cms-trash)(\/|$)/u.test(rel)
				) {
					return true;
				}
				// Save rotation artifacts: atomicWrite tmp files + .bak revisions.
				// Without this every save double-syncs (write tmp then rename).
				const base = rel.split("/").at(-1) ?? rel;
				return base.includes(".tmp-") || base.includes(".bak");
			},
			persistent: true,
		},
	);
	function schedule(scope: SyncScope, rel: string): void {
		const existing = pending.get(scope);
		if (existing) clearTimeout(existing);
		pending.set(
			scope,
			setTimeout(() => {
				pending.delete(scope);
				syncScope(scope, root)
					.then((count) => console.log(`[watcher] re-synced ${scope} (${count} rows) ← ${rel}`))
					.catch((error: unknown) =>
						console.error(`[watcher] re-sync failed for ${scope}:`, (error as Error).message),
					);
			}, 400),
		);
	}

	watcher.on("all", (event: string, eventPath: string) => {
		if (!eventPath) return;
		const abs = path.isAbsolute(eventPath) ? eventPath : path.resolve(root, eventPath);
		const rel = path.relative(root, abs).replaceAll("\\", "/");
		// Watch list is a fixed snapshot: if a whole watched root (e.g.
		// src/components) is created after boot, add it so later files under
		// it are picked up. chokidar watches missing paths via their parent,
		// so this is belt-and-braces; documented here rather than silent.
		if (event === "addDir") watcher.add(abs);
		for (const scope of scopeForPath(root, abs)) schedule(scope, `${event}:${rel}`);
	});
	watcher.on("error", (error: unknown) => {
		console.error("[watcher] error:", (error as Error).message ?? error);
	});
	console.log(`[watcher] watching ${root} (scopes: ${SYNC_SCOPES.join(", ")})`);
	return {
		close: async () => {
			for (const timer of pending.values()) clearTimeout(timer);
			pending.clear();
			await watcher.close();
		},
		root,
	};
}
