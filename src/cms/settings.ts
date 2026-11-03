import { promises as fs } from "node:fs";

import { findStatementEnd, stripComments, stripTypeSuffix } from "./balanced.ts";
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
	let raw: string;
	try {
		raw = await fs.readFile(abs, "utf8");
	} catch (e) {
		if (e instanceof CmsError) throw e;
		if ((e as NodeJS.ErrnoException)?.code === "ENOENT") {
			throw new CmsError("NOT_FOUND", `Not found: ${SETTINGS_PATH}`, { status: 404 });
		}
		throw e;
	}
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
	// Guard: must still export all known keys (additive safety). Anchored to
	// line start so `// export const X` comments cannot satisfy the check.
	for (const k of KNOWN_KEYS) {
		if (!new RegExp(`^export\\s+const\\s+${k}\\b`, "mu").test(raw)) {
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
	let st;
	try {
		st = await fs.stat(abs);
	} catch (e) {
		if (e instanceof CmsError) throw e;
		if ((e as NodeJS.ErrnoException)?.code === "ENOENT") {
			throw new CmsError("NOT_FOUND", `Not found: ${SETTINGS_PATH}`, { status: 404 });
		}
		throw e;
	}
	if (!opts?.force && isStaleWrite(st.mtimeMs, mtime)) {
		throw new CmsError("CONFLICT", "Stale write: constants.ts changed", { status: 409 });
	}
	await backupFile(abs);
	await atomicWrite(abs, raw);
	const st2 = await fs.stat(abs);
	return { mtime: st2.mtimeMs };
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
		next = replaceExportBlock(next, key, `export const ${key} = ${serializeValue(val)};`);
	}
	validateTsSyntax(next);
	const res = await writeSettingsRaw(next, mtime, opts);
	return { mtime: res.mtime, raw: next };
}

class TsLiteralParser {
	private index = 0;
	private depth = 0;

	constructor(private readonly text: string) {
		// Size cap: constants.ts values are small; reject pathological inputs.
		if (text.length > 1_048_576) throw new Error("literal too large");
	}

	eof(): boolean {
		return this.index >= this.text.length;
	}

	skipWs(): void {
		while (this.index < this.text.length && /\s/u.test(this.text[this.index])) this.index++;
	}

	parseValue(): unknown {
		this.skipWs();
		const ch = this.text[this.index];
		if (ch === undefined) throw new Error("unexpected end");
		if (ch === '"' || ch === "'" || ch === "`") return this.parseString();
		if (ch === "[") return this.parseArray();
		if (ch === "{") return this.parseObject();
		const rest = this.text.slice(this.index);
		const keyword = /^(true|false|null)(?=[\s,\]}]|$)/u.exec(rest);
		if (keyword) {
			this.index += keyword[1].length;
			if (keyword[1] === "true") return true;
			if (keyword[1] === "false") return false;
			return null;
		}
		const num = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/u.exec(rest);
		if (num) {
			this.index += num[0].length;
			return Number(num[0]);
		}
		throw new Error(`unsupported literal at: ${rest.slice(0, 24)}`);
	}

	private parseString(): string {
		const quote = this.text[this.index];
		let out = "";
		let i = this.index + 1;
		for (; i < this.text.length; i++) {
			const ch = this.text[i];
			if (ch === "\\") {
				const next = this.text[i + 1];
				if (next === undefined) break;
				if (next === "n") out += "\n";
				else if (next === "t") out += "\t";
				else if (next === "r") out += "\r";
				else out += next;
				i++;
			} else if (ch === quote) {
				this.index = i + 1;
				if (quote === "`" && out.includes("${")) throw new Error("template rejected");
				return out;
			} else {
				out += ch;
			}
		}
		throw new Error("unterminated string");
	}

	private parseArray(): unknown[] {
		if (++this.depth > 50) throw new Error("nesting too deep");
		try {
			this.index++;
			const out: unknown[] = [];
			for (;;) {
				this.skipWs();
				if (this.text[this.index] === "]") {
					this.index++;
					return out;
				}
				out.push(this.parseValue());
				this.skipWs();
				if (this.text[this.index] === ",") this.index++;
				else if (this.text[this.index] !== "]") throw new Error("expected , or ]");
			}
		} finally {
			this.depth--;
		}
	}

	private parseObject(): Record<string, unknown> {
		if (++this.depth > 50) throw new Error("nesting too deep");
		try {
			this.index++;
			const out: Record<string, unknown> = {};
			for (;;) {
				this.skipWs();
				if (this.text[this.index] === "}") {
					this.index++;
					return out;
				}
				const key = this.parseKey();
				this.skipWs();
				if (this.text[this.index] !== ":") throw new Error("expected :");
				this.index++;
				out[key] = this.parseValue();
				this.skipWs();
				if (this.text[this.index] === ",") this.index++;
				else if (this.text[this.index] !== "}") throw new Error("expected , or }");
			}
		} finally {
			this.depth--;
		}
	}

	private parseKey(): string {
		this.skipWs();
		const ch = this.text[this.index];
		if (ch === '"' || ch === "'") return this.parseString();
		const id = /^[A-Za-z_$][\w$]*/u.exec(this.text.slice(this.index));
		if (!id) throw new Error("expected key");
		this.index += id[0].length;
		return id[0];
	}
}

// Safe literal parser for CMS-written constants (strings, numbers, booleans,
// null, arrays, plain objects). Never evaluates code — non-literal expressions
// (ternaries, calls, references) are rejected and the key stays unread.
function parseLiteralValue(expr: string): unknown {
	const parser = new TsLiteralParser(stripComments(expr).trim());
	const value = parser.parseValue();
	parser.skipWs();
	if (!parser.eof()) throw new Error("trailing input");
	return value;
}

export function parseSettingsValues(raw: string): Record<string, unknown> {
	return parseSettingsDetailed(raw).values;
}

/**
 * Per-key parse report: `values` holds what parsed, `errors` distinguishes
 * missing exports from unparsable ones (previously indistinguishable —
 * both just left the key out).
 */
export function parseSettingsDetailed(raw: string): {
	values: Record<string, unknown>;
	errors: Record<string, string>;
} {
	const values: Record<string, unknown> = {};
	const errors: Record<string, string> = {};
	for (const key of KNOWN_KEYS) {
		try {
			const marker = `export const ${key}`;
			const idx = raw.indexOf(marker);
			if (idx === -1) {
				errors[key] = "missing export";
				continue;
			}
			const eq = raw.indexOf("=", idx);
			const semi = findStatementEnd(raw, eq + 1);
			const end = semi === -1 ? raw.length : semi;
			const expr = stripTypeSuffix(raw.slice(eq + 1, end).trim());
			values[key] = parseLiteralValue(expr);
		} catch (e) {
			errors[key] = e instanceof Error ? e.message : "unparsable literal";
		}
	}
	return { errors, values };
}

export function parseSettingsErrors(raw: string): Record<string, string> {
	return parseSettingsDetailed(raw).errors;
}
