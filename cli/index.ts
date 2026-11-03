#!/usr/bin/env bun
// Entry point for `bunx @platipie/cms`: loads cwd Astro project by default, else auto-opens Project Selector.
// Interactive prompts run TTY-only so CI never blocks.
import { existsSync } from "node:fs";
import path from "node:path";

import * as p from "@clack/prompts";
import { Command, InvalidArgumentError } from "commander";
import pc from "picocolors";

import {
	isAstroProjectSync,
	isDirectorySync,
	readPackageVersionSync,
} from "#/cms/astro-project.ts";
import { getHost, parsePortStrict, resolvePort } from "#/cms/config.ts";
import { runSyncCommand } from "#/cms/sync/command.ts";
import type { SyncCommandOptions } from "#/cms/sync/command.ts";
import { SYNC_SCOPES } from "#/cms/sync/index.ts";

interface CliActionOptions {
	dev: boolean;
	host: string | undefined;
	open: boolean;
	port: number | undefined;
	prod: boolean;
	project: string | undefined;
	sync: boolean;
}

interface ProjectSelection {
	autoOpen: boolean;
	root: string;
}

interface ServerConfig {
	host: string;
	open: boolean;
	port: number;
	projectRoot: string;
	syncEnabled: boolean;
	useProd: boolean;
}

function fail(message: string): never {
	p.log.error(message);
	process.exit(1);
}

function parsePort(value: string): number {
	try {
		return parsePortStrict(value);
	} catch {
		throw new InvalidArgumentError(`Invalid port: ${value}`);
	}
}

function cmsRoot(): string {
	// cli/index.ts lives in <package>/cli, so the package root is one level up.
	return path.resolve(import.meta.dir, "..");
}

/** Resolve + validate an explicit project root (flag/env/arg/prompt).
 * Throws with a labelled message; reuses src/cms/astro-project.ts checks. */
function assertAstroRoot(candidate: string, label: string): string {
	const resolved = path.resolve(candidate);
	if (!isDirectorySync(resolved)) throw new Error(`Not a directory: ${label}`);
	if (!isAstroProjectSync(resolved))
		throw new Error(`Not an Astro project (astro.config.* missing): ${resolved}`);
	return resolved;
}

/** Explicit root (flag/arg/env) throws instead of silently falling back;
 * only clean cwd auto-opens selector. */
function resolveProjectRoot(explicit: string | undefined, cwd: string): ProjectSelection {
	if (explicit !== undefined) {
		return { autoOpen: false, root: assertAstroRoot(explicit, explicit) };
	}
	const envRoot = process.env.PROJECT_PATH?.trim();
	if (envRoot) {
		return { autoOpen: false, root: assertAstroRoot(envRoot, envRoot) };
	}
	if (isAstroProjectSync(cwd)) return { autoOpen: false, root: cwd };
	return { autoOpen: true, root: cwd };
}

function isInteractive(): boolean {
	if (process.env.CI) return false;
	return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

async function maybePromptForProject(cwd: string): Promise<string | undefined> {
	if (!isInteractive()) return undefined;
	const confirm = await p.confirm({
		initialValue: false,
		message: "Enter an Astro project path now?",
	});
	if (p.isCancel(confirm) || !confirm) return undefined;
	const input = await p.text({
		message: "Astro project path",
		placeholder: cwd,
		validate: (value: string | undefined) => {
			const candidate = value?.trim() || cwd;
			try {
				assertAstroRoot(candidate, candidate);
			} catch (error) {
				return error instanceof Error ? error.message : String(error);
			}
		},
	});
	if (p.isCancel(input)) {
		p.cancel("Project selection cancelled — continuing to the Project Selector.");
		return undefined;
	}
	return path.resolve(input.trim() || cwd);
}

async function startServer(server: ServerConfig): Promise<void> {
	const root = cmsRoot();
	const displayHost = server.host === "0.0.0.0" || server.host === "::" ? "localhost" : server.host;
	const url = `http://${displayHost}:${server.port}/`;
	const mode = server.useProd ? "production preview" : "development";

	if (!server.useProd && !existsSync(path.join(root, "vite.config.ts"))) {
		throw new Error(`Cannot find vite.config.ts in ${root}`);
	}
	if (server.useProd && !existsSync(path.join(root, ".output"))) {
		throw new Error("Production output not found — run `bun run build` first or omit --prod.");
	}

	// Leading --bun forces bun runtime for vite child process.
	const subcommand = server.useProd ? "preview" : "dev";
	const args = ["--bun", "vite", subcommand, "--port", String(server.port), "--host", server.host];
	if (server.open) args.push("--open");

	p.log.success(`Starting ${mode} server at ${pc.cyan(url)}`);
	p.note(`Project  ${server.projectRoot}\nMode     ${mode}\nURL      ${url}`, "platipie-cms");
	if (!server.syncEnabled) {
		p.log.warn("Sync engine disabled (--no-sync) — the inventory will go stale.");
	}

	const child = Bun.spawn(["bun", ...args], {
		cwd: root,
		env: {
			...process.env,
			...(server.syncEnabled ? {} : { CMS_SYNC: "0" }),
			HOST: server.host,
			PORT: String(server.port),
			PROJECT_PATH: server.projectRoot,
		},
		stdio: ["inherit", "inherit", "inherit"],
	});
	const onSignal = (signal: NodeJS.Signals) => {
		try {
			child.kill(signal);
		} catch {}
	};
	process.on("SIGINT", onSignal);
	process.on("SIGTERM", onSignal);
	const exitCode = await child.exited;
	p.outro(`Server stopped (exit code ${exitCode}).`);
	process.exit(exitCode);
}

async function serve(projectPath: string | undefined, options: CliActionOptions): Promise<void> {
	p.intro(pc.cyan("platipie-cms"));
	if (options.project && projectPath) {
		throw new Error("Pass the project path only once — either as an argument or with --project.");
	}
	if (options.dev && options.prod) throw new Error("Pass only one of --dev or --prod.");

	const cwd = process.cwd();
	const project = resolveProjectRoot(options.project ?? projectPath, cwd);

	let root = project.root;
	if (project.autoOpen) {
		p.log.warn(`No Astro project in ${cwd} — the Project Selector opens by default.`);
		root = (await maybePromptForProject(cwd)) ?? root;
	} else {
		p.log.info(`Loading Astro project ${pc.cyan(root)}`);
	}

	await startServer({
		host: options.host?.trim() || getHost(),
		open: options.open,
		port: resolvePort(options.port),
		projectRoot: root,
		syncEnabled: options.sync,
		useProd: options.prod,
	});
}

async function syncAction(options: SyncCommandOptions): Promise<void> {
	p.intro(pc.cyan("platipie-cms sync"));
	if (options.scope && !options.once) {
		throw new Error("--scope requires --once (scoped watch is not supported).");
	}
	const controller = new AbortController();
	process.once("SIGINT", () => controller.abort());
	process.once("SIGTERM", () => controller.abort());
	const code = await runSyncCommand(options, controller.signal);
	process.exit(code);
}

function buildSyncCommand(): Command {
	const sync = new Command("sync");
	sync
		.description(
			"Build the SQLite read-model and watch the project (same engine as scripts/sync.ts).",
		)
		.option("--once", "Run one sync then exit (default: watch).")
		.option("--scope <scope>", `Sync only one scope with --once (${SYNC_SCOPES.join("|")}).`)
		.option("--root <path>", "Override PROJECT_PATH for this run.")
		.option("--db <path>", "Override the SQLite file (CMS_DB_PATH).")
		.addHelpText(
			"after",
			"\nNote: --machine-stats was removed in a prior release; passing it now errors. Use an external monitor for CPU/memory/disk.\n",
		)
		.action(syncAction);
	return sync;
}

function buildProgram(version: string): Command {
	const program = new Command();
	program
		.name("platipie-cms")
		.description("Standalone content-management server for Astro sites.")
		.version(version, "-v, --version", "Show the CLI version.")
		.argument("[project-path]", "Astro project to load (defaults to auto-detect).")
		.option("-p, --project <path>", "Use this Astro project instead of auto-detecting.")
		.option("--port <number>", "Port to listen on (default: PORT env or 4000).", parsePort)
		.option("--host <host>", "Host to bind (default: HOST env or 127.0.0.1).")
		.option("--open", "Open the browser on startup.")
		.option("--dev", "Run the Vite dev server (default).")
		.option("--prod", "Run the production preview server (requires build).")
		.option("--no-sync", "Disable the sync engine (FS watcher) for this server run.")
		.addHelpText(
			"after",
			"\nBehaviour:\n  If the current folder is an Astro project (astro.config.* present) it is\n  loaded by default and its sync engine starts with the server. Otherwise\n  the server starts and the Project Selector dialog opens by default in the\n  web UI so you can pick a project (opening one starts its engine).\n",
		)
		.showHelpAfterError("(Run with --help for usage.)")
		.action(serve);
	program.addCommand(buildSyncCommand());
	return program;
}

async function main(): Promise<void> {
	const program = buildProgram(readPackageVersionSync(cmsRoot()));
	try {
		await program.parseAsync(process.argv);
	} catch (error) {
		fail(error instanceof Error ? error.message : String(error));
	}
}

await main();
