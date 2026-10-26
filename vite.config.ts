import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Plugin } from "vite";

/** Eager sync-engine lifecycle for `vite dev`: start the watcher for the open
 * project on server boot, stop it when the dev server (or process) closes.
 * Production/preview boots lazily on the first API request instead. */
function platipieSyncEngine(): Plugin {
	return {
		async configureServer(server) {
			const engine = await import("./src/lib/cms/sync/engine.ts");
			engine.registerSyncShutdownHooks();
			engine.ensureServerSync();
			server.httpServer?.once("close", () => {
				void engine.stopAllSyncEngines().catch(() => {});
			});
		},
		name: "platipie-sync-engine",
	};
}

const port = Number(process.env.PORT ?? 4000);

export default defineConfig({
	build: {
		outDir: ".output",
		rolldownOptions: {
			onLog(level, log, defaultHandler) {
				if (log.code === "MODULE_LEVEL_DIRECTIVE" && log.message?.includes('"use client"')) {
					return;
				}
				defaultHandler(level, log);
			},
		},
	},
	plugins: [
		platipieSyncEngine(),
		devtools(),
		tailwindcss(),
		// Nitro with `bun` preset: TanStack Start serves via Nitro; when building
		// for production the preset resolves to `bun` so `bun run start` runs the
		// Nitro bun server. Options are forwarded to Nitro underneath.
		tanstackStart({
			// @ts-expect-error — nitro preset passthrough (Start forwards `server` to Nitro)
			server: { preset: "bun" },
		}),
		viteReact(),
		basicSsl(),
	],
	preview: {
		host: process.env.HOST ?? "127.0.0.1",
		port,
	},
	resolve: {
		tsconfigPaths: true,
	},
	server: {
		// §13: bind localhost by default; never 0.0.0.0 unless explicitly overridden.
		host: process.env.HOST ?? "127.0.0.1",
		port,
	},
});
