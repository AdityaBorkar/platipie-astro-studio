import { promises as fs } from "node:fs";

import { findStatementEnd, stripTypeSuffix } from "./balanced.ts";
import { resolveRepoPath } from "./config.ts";
import { CmsError } from "./errors.ts";
import { isStaleWrite } from "./mtime.ts";
import { atomicWrite, backupFile } from "./save.ts";

const SETTINGS_PATH = "cms/constants.ts";

export const KNOWN_KEYS = [
	"CONTACT_FORM_ETA",
	"HOMEPAGE",
	"IS_AVAILABLE_NOW",
	"LABS_URL",
	"NAV_ITEMS",
	"PRICING",
	"SITE_URL",
	"SOCIALS",
] as const;

export async function readSettingsRaw(): Promise<{ raw: string; mtime: number }> {
	const abs = resolveRepoPath(SETTINGS_PATH);
	const raw = await fs.readFile(abs, "utf8").catch(() => {
		throw new CmsError("NOT_FOUND", `Not found: ${SETTINGS_PATH}`, { status: 404 });
	});
	const st = await fs.stat(abs);
	return { mtime: st.mtimeMs, raw };
}

function validateTsSyntax(raw: string): void {
	try {
		const t = new Bun.Transpiler({ loader: "ts" });
		t.transformSync(raw);
	} catch (e) {
		throw new CmsError("VALIDATION", `Raw TS failed to parse: ${(e as Error).message}`, {
			fields: { raw: "Syntax error" },
			status: 400,
		});
	}
	// Guard: must still export all known keys (additive safety).
	for (const k of KNOWN_KEYS) {
		if (!raw.includes(`export const ${k}`)) {
			throw new CmsError("VALIDATION", `Raw TS drops required export: ${k}`, {
				fields: { raw: `Missing ${k}` },
				status: 400,
			});
		}
	}
}

function replaceExportBlock(src: string, key: string, replacement: string): string {
	const marker = `export const ${key}`;
	const idx = src.indexOf(marker);
	if (idx === -1) {
		return `${src.replace(/\s+$/u, "")}\n\n${replacement}\n`;
	}
	const eq = src.indexOf("=", idx);
	if (eq === -1) throw new CmsError("SCHEMA_MERGE", `Cannot locate ${key} value`, { status: 500 });
	const end = findStatementEnd(src, eq + 1);
	if (end === -1)
		throw new CmsError("SCHEMA_MERGE", `Cannot terminate ${key} block`, { status: 500 });
	return src.slice(0, idx) + replacement + src.slice(end + 1);
}

function serializeValue(v: unknown): string {
	return JSON.stringify(v, null, 2);
}

export async function writeSettingsRaw(
	raw: string,
	mtime: number,
	opts?: { force?: boolean },
): Promise<{ mtime: number }> {
	validateTsSyntax(raw);
	const abs = resolveRepoPath(SETTINGS_PATH);
	const st = await fs.stat(abs).catch(() => {
		throw new CmsError("NOT_FOUND", `Not found: ${SETTINGS_PATH}`, { status: 404 });
	});
	if (!opts?.force && isStaleWrite(st.mtimeMs, mtime)) {
		throw new CmsError("CONFLICT", "Stale write: constants.ts changed", { status: 409 });
	}
	await backupFile(abs);
	await atomicWrite(abs, raw);
	const st2 = await fs.stat(abs);
	return { mtime: st2.mtimeMs };
}

function patchSiteUrlValue(next: string, key: string, val: string): string {
	if (!next.includes("process.env.NODE_ENV")) {
		return replaceExportBlock(next, key, `export const ${key} = ${JSON.stringify(val)};`);
	}
	if (val.includes("localhost") || val.includes("127.0.0.1")) {
		return next.replaceAll(/https?:\/\/localhost:\d+/gu, val);
	}
	const blockStart = next.indexOf("export const SITE_URL");
	const blockEnd = next.indexOf(";", blockStart);
	const block = next.slice(blockStart, blockEnd);
	const prodMatch = block.match(/https:\/\/[^"']+/u);
	if (prodMatch) {
		return next.slice(0, blockStart) + block.replace(prodMatch[0], val) + next.slice(blockEnd);
	}
	return replaceExportBlock(
		next,
		key,
		`export const ${key} =\n\tprocess.env.NODE_ENV === "production" ? "${val}" : "https://localhost:3050";`,
	);
}

export async function patchSettingsValues(
	values: Record<string, unknown>,
	mtime: number,
	opts?: { force?: boolean },
): Promise<{ mtime: number; raw: string }> {
	const { raw } = await readSettingsRaw();
	let next = raw;
	for (const [key, val] of Object.entries(values)) {
		if (!(KNOWN_KEYS as readonly string[]).includes(key)) continue;
		if (key === "SITE_URL" && typeof val === "string") {
			next = patchSiteUrlValue(next, key, val);
			continue;
		}
		next = replaceExportBlock(next, key, `export const ${key} = ${serializeValue(val)};`);
	}
	validateTsSyntax(next);
	const res = await writeSettingsRaw(next, mtime, opts);
	return { mtime: res.mtime, raw: next };
}

export function parseSettingsValues(raw: string): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const key of KNOWN_KEYS) {
		try {
			const marker = `export const ${key}`;
			const idx = raw.indexOf(marker);
			if (idx === -1) continue;
			const eq = raw.indexOf("=", idx);
			const semi = findStatementEnd(raw, eq + 1);
			const end = semi === -1 ? raw.length : semi;
			let expr = raw.slice(eq + 1, end).trim();
			if (key === "SITE_URL") {
				const m = expr.match(/"(https:\/\/[^"]+)"/u);
				if (m) out[key] = m[1];
				continue;
			}
			expr = stripTypeSuffix(expr);
			// new Function can execute arbitrary code, so regex gate restricts evaluation to literals.
			if (
				/^[{[].*[}\]]$/su.test(expr) ||
				/^["']/u.test(expr) ||
				/^(true|false|null|\d)/u.test(expr)
			) {
				const fn = new Function(`return (${expr});`);
				out[key] = fn() as unknown;
			}
		} catch {
			/* leave missing */
		}
	}
	return out;
}
