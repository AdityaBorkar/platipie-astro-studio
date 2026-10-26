import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import mkcert from "vite-plugin-mkcert";

function platipieSyncEngine(): Plugin {
	return {
		async configureServer(server) {
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
		viteReact(),
		mkcert(),
	],
	preview: {
		host: process.env.HOST,
		port: Number(process.env.PORT || 3000),
	},
	resolve: {
		tsconfigPaths: true,
	},
	server: {
		host: process.env.HOST,
		port: Number(process.env.PORT || 3000),
	},
});
