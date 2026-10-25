import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

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
