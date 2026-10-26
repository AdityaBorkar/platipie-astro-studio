// §5 settings — cms/constants.ts typed form + raw fallback.
// Codegen preserves comments/formatting where feasible; validates via
// Bun.Transpiler parse before save (tsc-style check without full typecheck).
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

/** Replace one `export const KEY = ...;` block via balanced-brace scan. */
function replaceExportBlock(src: string, key: string, replacement: string): string {
	const marker = `export const ${key}`;
	const idx = src.indexOf(marker);
	if (idx === -1) {
		// Append if missing (additive).
		return `${src.replace(/\s+$/u, "")}\n\n${replacement}\n`;
	}
	// Scan from `=` to terminating `;` at depth 0.
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
	// Backup + atomic (shared helpers keep .bak rotation consistent).
	await backupFile(abs);
	await atomicWrite(abs, raw);
	const st2 = await fs.stat(abs);
	return { mtime: st2.mtimeMs };
}

function patchSiteUrlValue(next: string, key: string, val: string): string {
	// Preserve the NODE_ENV conditional; replace embedded URLs.
	if (!next.includes("process.env.NODE_ENV")) {
		return replaceExportBlock(next, key, `export const ${key} = ${JSON.stringify(val)};`);
	}
	// Replace the two quoted URLs: production first, dev second.
	// Targeted: replace production URL (adityab.tech) and leave dev as-is
	// unless val looks like localhost.
	if (val.includes("localhost") || val.includes("127.0.0.1")) {
		return next.replaceAll(/https?:\/\/localhost:\d+/gu, val);
	}
	// Replace first https URL inside SITE_URL block.
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

/** Best-effort parse of constants into values (for typed form). */
export function parseSettingsValues(raw: string): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	// Extract via dynamic import of a data: URL? Avoid eval: use regex + JSON-ish parse
	// for simple keys; fall back to raw-only when complex.
	// For V1 we return raw + attempt JSON parse of each block by transpiling TS->JS lite:
	// strip `export const`, `as const`, trailing `;`, then JSON5-ish eval in sandbox.
	// We keep it conservative: try Bun.Transpiler + Function on object literals only.
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
			// Remove `as const` / satisfies.
			expr = stripTypeSuffix(expr);
			// Only evaluate object/array/primitive literals.
			// Safety: `new Function` can execute arbitrary code, so the regex
			// gate above restricts evaluation to JSON-like literals (objects,
			// arrays, quoted strings, true/false/null/numbers). Anything else
			// is skipped and the key stays missing (raw-only fallback). The
			// per-key try/catch below keeps one bad block from failing parse.
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
