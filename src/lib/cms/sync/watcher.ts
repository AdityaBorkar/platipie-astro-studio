// FS watcher: keeps the SQLite read-model in sync with the Astro checkout.
// Watches the inventory scopes and re-syncs the affected scope on change
// (debounced). Server/CLI-only.
import path from "node:path";

import { watch } from "chokidar";

import { getAstroRoot } from "../config.ts";
import { SYNC_SCOPES, fullSync, syncScope } from "./index.ts";
import type { SyncScope } from "./index.ts";

const SCOPE_PATTERNS: { patterns: string[]; scope: SyncScope }[] = [
	{ patterns: ["assets/**/*"], scope: "assets" },
	{ patterns: ["src/content.config.ts", "content.config.ts", "cms/**/*"], scope: "content" },
	{ patterns: ["src/components/**/*"], scope: "components" },
	{ patterns: ["src/layouts/**/*"], scope: "layouts" },
	{ patterns: ["src/templates/**/*"], scope: "templates" },
	{ patterns: ["src/pages/**/*"], scope: "pages" },
	{ patterns: ["src/emails/**/*"], scope: "emails" },
	{ patterns: ["astro.config.mjs"], scope: "astro" },
];

function scopeForPath(root: string, absPath: string): SyncScope[] {
	const rel = path.relative(root, absPath).replaceAll("\\", "/");
	const scopes = new Set<SyncScope>();
	for (const { patterns, scope } of SCOPE_PATTERNS) {
		for (const pattern of patterns) {
			const base = pattern.replace(/\/\*\*\/\*$/u, "").replace(/\/\*\*$/u, "");
			if (pattern === rel || rel.startsWith(`${base}/`) || rel === base) {
				scopes.add(scope);
			}
		}
	}
	return [...scopes];
}

export interface WatcherHandle {
	close: () => Promise<void>;
	root: string;
}

/** Subtrees + files that back the eight sync scopes. */
const WATCHED_REL = [
	"assets",
	"astro.config.mjs",
	"cms",
	"content.config.ts",
	"src/components",
	"src/content.config.ts",
	"src/emails",
	"src/layouts",
	"src/pages",
	"src/templates",
];

/** Bootstrap a full sync, then watch the checkout and re-sync on change. */
export async function startWatcher(root = getAstroRoot()): Promise<WatcherHandle> {
	const initial = await fullSync(root);
	console.log(
		`[watcher] initial sync of ${root}: ` +
			initial.scopes.map((s) => `${s.scope}=${s.fileCount}`).join(" "),
	);
	const pending = new Map<SyncScope, ReturnType<typeof setTimeout>>();
	const watcher = watch(
		WATCHED_REL.map((rel) => path.join(root, rel)),
		{
			atomic: 200,
			depth: 12,
			ignoreInitial: true,
			ignored: (absPath: string) =>
				/(^|\/)(node_modules|\.git|\.output|dist|\.nitro|\.data|\.cms-trash)(\/|$)/u.test(
					path.relative(root, absPath).replaceAll("\\", "/"),
				),
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
