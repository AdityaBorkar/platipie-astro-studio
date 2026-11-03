import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import mkcert from "vite-plugin-mkcert";

import { DEFAULT_HOST, DEFAULT_PORT } from "./src/cms/config.ts";

function platipieSyncEngine(): Plugin {
	return {
		async configureServer(server) {
			// Kill-switch guard mirroring src/cms/sync/engine.ts isSyncDisabled():
			// skip the watcher import entirely when CMS_SYNC=0 (or --no-sync,
			// which the CLI forwards as CMS_SYNC=0). ensureServerSync()
			// re-checks at runtime as a second gate.
			const syncFlag = (process.env.CMS_SYNC ?? "").trim().toLowerCase();
			if (syncFlag === "0" || syncFlag === "false" || syncFlag === "no" || syncFlag === "off")
				return;
			const engine = await import("./src/cms/sync/engine.ts");
			engine.registerSyncShutdownHooks();
			engine.ensureServerSync();
			server.httpServer?.once("close", () => {
				void engine.stopAllSyncEngines().catch(() => {});
			});
		},
		name: "platipie-sync-engine",
	};
}

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
		tanstackStart(),
		// Nitro `bun` preset so `bun run start` serves the production build with bun.
		nitro({ preset: "bun" }),
		viteReact(),
		mkcert(),
	],
	preview: {
		host: process.env.HOST ?? DEFAULT_HOST,
		port: Number(process.env.PORT ?? DEFAULT_PORT),
	},
	resolve: {
		tsconfigPaths: true,
	},
	server: {
		host: process.env.HOST ?? DEFAULT_HOST,
		port: Number(process.env.PORT ?? DEFAULT_PORT),
	},
});
