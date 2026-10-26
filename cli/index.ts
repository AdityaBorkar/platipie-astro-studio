#!/usr/bin/env bun
// Entry point for `bunx @platipie/cms`.
// Starts the CMS server. When invoked from inside an Astro project that
// project is loaded by default (PROJECT_PATH = cwd). Otherwise the server
// starts with the current folder (non-Astro) and the web UI auto-opens the
// Project Selector dialog so the user can pick a project.
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ASTRO_CONFIG_NAMES = [
	"astro.config.cjs",
	"astro.config.js",
	"astro.config.mjs",
	"astro.config.mts",
	"astro.config.ts",
] as const;

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 4000;

interface CliOptions {
	dev: boolean;
	help: boolean;
	host: string | null;
	open: boolean;
	port: string | null;
	prod: boolean;
	project: string | null;
	version: boolean;
}

function defaultOptions(): CliOptions {
	return {
		dev: false,
		help: false,
		host: null,
		open: false,
		port: null,
		prod: false,
		project: null,
		version: false,
	};
}

function isAstroProjectSync(dir: string): boolean {
	for (const name of ASTRO_CONFIG_NAMES) {
		try {
			const stat = statSync(path.join(dir, name));
			if (stat.isFile()) return true;
		} catch {
			// Try the next candidate.
		}
	}
	return false;
}

function isDirectorySync(dir: string): boolean {
	try {
		return statSync(dir).isDirectory();
	} catch {
		return false;
	}
}

function parseArgs(argv: string[]): CliOptions {
	const options = defaultOptions();
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index] ?? "";
		if (arg === "--help" || arg === "-h") {
			options.help = true;
		} else if (arg === "--version" || arg === "-v") {
			options.version = true;
		} else if (arg === "--dev") {
			options.dev = true;
		} else if (arg === "--prod") {
			options.prod = true;
		} else if (arg === "--open") {
			options.open = true;
		} else if (arg === "--project" || arg === "-p") {
			const next = argv[index + 1];
			if (!next) throw new Error("Missing value for --project <path>");
			options.project = next;
			index += 1;
		} else if (arg.startsWith("--project=")) {
			options.project = arg.slice("--project=".length);
		} else if (arg === "--port") {
			const next = argv[index + 1];
			if (!next) throw new Error("Missing value for --port <number>");
			options.port = next;
			index += 1;
		} else if (arg.startsWith("--port=")) {
			options.port = arg.slice("--port=".length);
		} else if (arg === "--host") {
			const next = argv[index + 1];
			if (!next) throw new Error("Missing value for --host <host>");
			options.host = next;
			index += 1;
		} else if (arg.startsWith("--host=")) {
			options.host = arg.slice("--host=".length);
		} else if (arg === "--") {
			break;
		} else if (arg.startsWith("-")) {
			throw new Error(`Unknown flag: ${arg}`);
		} else if (options.project === null) {
			// Bare positional arg is treated as the project path.
			options.project = arg;
		} else throw new Error(`Unexpected argument: ${arg}`);
	}
	return options;
}

function printHelp(): void {
	const help = `platipie-cms — standalone content-management server for Astro sites.

Usage:
  bunx @platipie/cms [options] [project-path]

Behaviour:
  If the current folder is an Astro project (astro.config.* present) it is
  loaded by default. Otherwise the server starts and the Project Selector
  dialog opens by default in the web UI so you can pick a project.

Options:
  -p, --project <path>   Use this Astro project instead of auto-detecting.
  --port <number>        Port to listen on (default: PORT env or 4000).
  --host <host>          Host to bind (default: HOST env or 127.0.0.1).
  --open                 Open the browser on startup.
  --dev                  Run the Vite dev server (default).
  --prod                 Run the production preview server (requires build).
  -h, --help             Show this help.
  -v, --version          Show the CLI version.
`;
	process.stdout.write(help);
}

function cmsRoot(): string {
	// cli/index.ts lives in <package>/cli, so the package root is one level up.
	return path.resolve(import.meta.dir, "..");
}

function readVersion(root: string): string {
	try {
		const raw = readFileSync(path.join(root, "package.json"), "utf8");
		const parsed = JSON.parse(raw) as { version?: unknown };
		if (typeof parsed.version === "string" && parsed.version.length > 0) return parsed.version;
	} catch {
		// Fall through to unknown.
	}
	return "unknown";
}

function resolvePort(raw: string | null): number {
	const candidate = raw ?? process.env.PORT ?? String(DEFAULT_PORT);
	const port = Number(candidate);
	if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
		throw new Error(`Invalid port: ${candidate}`);
	}
	return port;
}

function resolveHost(raw: string | null): string {
	const host = (raw ?? process.env.HOST ?? DEFAULT_HOST).trim();
	if (!host) return DEFAULT_HOST;
	return host;
}

function resolveProjectRoot(options: CliOptions, cwd: string): { autoOpen: boolean; root: string } {
	if (options.project) {
		const root = path.resolve(options.project);
		if (!isDirectorySync(root)) throw new Error(`Not a directory: ${options.project}`);
		if (!isAstroProjectSync(root))
			throw new Error(`Not an Astro project (astro.config.* missing): ${root}`);
		return { autoOpen: false, root };
	}
	if (isAstroProjectSync(cwd)) return { autoOpen: false, root: cwd };
	const envRoot = process.env.PROJECT_PATH?.trim();
	if (envRoot) {
		const resolved = path.resolve(envRoot);
		if (isDirectorySync(resolved) && isAstroProjectSync(resolved)) {
			return { autoOpen: false, root: resolved };
		}
	}
	return { autoOpen: true, root: cwd };
}

async function main(): Promise<void> {
	let options: CliOptions;
	try {
		options = parseArgs(process.argv.slice(2));
	} catch (error) {
		console.error(`platipie-cms: ${error instanceof Error ? error.message : String(error)}`);
		console.error("Run with --help for usage.");
		process.exit(1);
	}
	const root = cmsRoot();
	if (options.help) {
		printHelp();
		return;
	}
	if (options.version) {
		process.stdout.write(`${readVersion(root)}\n`);
		return;
	}
	if (options.dev && options.prod) throw new Error("Pass only one of --dev or --prod.");
	const cwd = process.cwd();
	let project: { autoOpen: boolean; root: string };
	try {
		project = resolveProjectRoot(options, cwd);
	} catch (error) {
		console.error(`platipie-cms: ${error instanceof Error ? error.message : String(error)}`);
		process.exit(1);
	}
	const port = resolvePort(options.port);
	const host = resolveHost(options.host);
	const useProd = options.prod;

	const env = {
		...process.env,
		HOST: host,
		PORT: String(port),
		PROJECT_PATH: project.root,
	};
	const displayHost = host === "0.0.0.0" || host === "::" ? "localhost" : host;
	if (project.autoOpen) {
		console.log(`platipie-cms: no Astro project in ${cwd} — opening Project Selector by default.`);
	} else {
		console.log(`platipie-cms: loading Astro project ${project.root}`);
	}
	console.log(`platipie-cms: starting server at http://${displayHost}:${port}/`);

	const args = useProd
		? ["--bun", "vite", "preview", "--port", String(port), "--host", host]
		: ["--bun", "vite", "dev", "--port", String(port), "--host", host];
	if (options.open) args.push("--open");
	if (!useProd && !existsSync(path.join(root, "vite.config.ts"))) {
		console.error(`platipie-cms: cannot find vite.config.ts in ${root}`);
		process.exit(1);
	}
	if (useProd && !existsSync(path.join(root, ".output"))) {
		console.error(
			"platipie-cms: production output not found — run `bun run build` first or omit --prod.",
		);
		process.exit(1);
	}
	const child = Bun.spawn(["bun", ...args], {
		cwd: root,
		env,
		stdio: ["inherit", "inherit", "inherit"],
	});
	const onSignal = (signal: NodeJS.Signals) => {
		try {
			child.kill(signal);
		} catch {
			// Already exited.
		}
	};
	process.on("SIGINT", onSignal);
	process.on("SIGTERM", onSignal);
	const exitCode = await child.exited;
	process.exit(exitCode);
}

await main();
