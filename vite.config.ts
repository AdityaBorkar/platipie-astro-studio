import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Plugin } from "vite";

/** Dev starts watcher eagerly on boot, stops on server close;
 * prod boots lazily on first API request. */
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
		// Nitro `bun` preset so production build runs on the bun server.
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
