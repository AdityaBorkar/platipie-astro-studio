// Page-level SEO + schema editing for Astro route files.
//
// Reads the top-level `const title / description / keywords / schema_markup`
// declarations out of a route's frontmatter and writes edits back to the same
// file — the Astro checkout stays the source of truth.
import { promises as fs } from "node:fs";

import { resolveRepoPath } from "./config.ts";
import { CmsError } from "./errors.ts";
import { atomicWrite, backupFile, unifiedDiff } from "./save.ts";
import { routeFor } from "./sync/scanners.ts";

const SEO_KEYS = ["title", "description", "keywords", "schema_markup"] as const;
type SeoKey = (typeof SEO_KEYS)[number];

const SCHEMA_IMPORT = 'import { SchemaMarkup } from "#/lib/schema-markup";';
const SCHEMA_LIB = "src/lib/schema-markup.ts";
const FALLBACK_SCHEMA_TYPES = [
	"business",
	"certification",
	"contact",
	"documents/index",
	"organization",
	"person",
	"product",
	"review",
	"services",
	"software/computer-lang",
	"webpage/about",
	"webpage/collection",
	"webpage/contact",
	"webpage/faq",
	"webpage/faq-services",
	"webpage/page",
	"webpage/plain",
	"webpage/profile",
	"webpage/qa",
	"website",
	"work",
];

export interface PageSeoEditable {
	description: boolean;
	keywords: boolean;
	schema: boolean;
	title: boolean;
}

export interface PageSeoDetail {
	description: string | null;
	editable: PageSeoEditable;
	keywords: string[];
	mtime: number;
	path: string;
	prerender: string;
	route: string;
	schemaMode: "dynamic" | "list" | "none";
	schemaTypes: string[];
	title: string | null;
}

export interface PageSeoPatch {
	description?: string | null;
	keywords?: string[];
	schema?: string[];
	title?: string | null;
}

interface ConstBlock {
	end: number;
	key: SeoKey;
	start: number;
	valueStart: number;
}

interface FrontmatterBounds {
	end: number;
	start: number;
}

function frontmatterBounds(text: string): FrontmatterBounds | null {
	if (!text.startsWith("---")) return null;
	const firstLineEnd = text.indexOf("\n");
	if (firstLineEnd === -1) return null;
	const start = firstLineEnd + 1;
	const rest = text.slice(start);
	const closeOffset = rest.search(/^---[ \t]*\r?$/mu);
	if (closeOffset === -1) return null;
	return { end: start + closeOffset, start };
}

/** Index of the `;` that terminates a const value, respecting nesting + strings. */
function findValueEnd(text: string, from: number, end: number): number {
	let braces = 0;
	let brackets = 0;
	let parens = 0;
	let inStr: string | null = null;
	let escaped = false;
	for (let i = from; i < end; i++) {
		const ch = text[i];
		if (inStr) {
			if (escaped) escaped = false;
			else if (ch === "\\") escaped = true;
			else if (ch === inStr) inStr = null;
			continue;
		}
		if (ch === '"' || ch === "'" || ch === "`") {
			inStr = ch;
			continue;
		}
		if (ch === "{") braces++;
		else if (ch === "}") braces--;
		else if (ch === "[") brackets++;
		else if (ch === "]") brackets--;
		else if (ch === "(") parens++;
		else if (ch === ")") parens--;
		else if (ch === ";" && braces === 0 && brackets === 0 && parens === 0) return i;
	}
	return -1;
}

/** Top-level `const <seo key> = …` declarations inside the frontmatter only. */
function findConstBlocks(text: string, bounds: FrontmatterBounds): Map<SeoKey, ConstBlock> {
	const blocks = new Map<SeoKey, ConstBlock>();
	let depth = 0;
	let inStr: string | null = null;
	let escaped = false;
	for (let i = bounds.start; i < bounds.end; i++) {
		const ch = text[i];
		if (inStr) {
			if (escaped) escaped = false;
			else if (ch === "\\") escaped = true;
			else if (ch === inStr) inStr = null;
			continue;
		}
		if (ch === '"' || ch === "'" || ch === "`") {
			inStr = ch;
			continue;
		}
		if (ch === "{" || ch === "(" || ch === "[") {
			depth++;
			continue;
		}
		if (ch === "}" || ch === ")" || ch === "]") {
			depth--;
			continue;
		}
		if (depth !== 0 || ch !== "c") continue;
		const match = /const\s+(title|description|keywords|schema_markup)\s*=/uy;
		match.lastIndex = i;
		const found = match.exec(text);
		if (!found) continue;
		const key = found[1] as SeoKey;
		const valueStart = i + found[0].length;
		const valueEnd = findValueEnd(text, valueStart, bounds.end);
		if (valueEnd === -1) continue;
		if (!blocks.has(key)) blocks.set(key, { end: valueEnd, key, start: i, valueStart });
		i = valueEnd;
	}
	return blocks;
}

function parseStringLiteral(raw: string): string | null {
	const trimmed = raw.trim();
	const quote = trimmed[0];
	if (quote !== '"' && quote !== "'" && quote !== "`") return null;
	if (trimmed.length < 2 || trimmed.at(-1) !== quote) return null;
	const inner = trimmed.slice(1, -1);
	if (quote === "`" && inner.includes("${")) return null;
	let out = "";
	for (let i = 0; i < inner.length; i++) {
		const ch = inner[i];
		if (ch !== "\\") {
			out += ch;
			continue;
		}
		const next = inner[++i];
		if (next === undefined) return null;
		if (next === "n") out += "\n";
		else if (next === "t") out += "\t";
		else if (next === "r") out += "\r";
		else if (next === "u") {
			const hex = inner.slice(i + 1, i + 5);
			if (!/^[0-9a-f]{4}$/iu.test(hex)) return null;
			out += String.fromCodePoint(Number.parseInt(hex, 16));
			i += 4;
		} else out += next;
	}
	return out;
}

const STRING_LITERAL = /("([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`)/gu;
const SCHEMA_GET =
	/SchemaMarkup\s*\.\s*get\s*\(\s*("([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`)\s*\)/gu;

function stripTypeSuffix(raw: string): string {
	return raw
		.trim()
		.replace(/\s+as\s+const\s*$/u, "")
		.replace(/\s+as\s+never\[\]\s*$/u, "");
}

function arrayBody(raw: string): string | null {
	const trimmed = stripTypeSuffix(raw);
	if (trimmed[0] !== "[" || trimmed.at(-1) !== "]") return null;
	return trimmed.slice(1, -1);
}

function stripComments(body: string): string {
	return body.replaceAll(/\/\*[\s\S]*?\*\//gu, "").replaceAll(/\/\/[^\n]*/gu, "");
}

/** Plain `["a", "b"]` literals only — anything computed is not editable. */
function parseStringArray(raw: string): string[] | null {
	const body = arrayBody(raw);
	if (body === null) return null;
	const cleaned = stripComments(body);
	if (cleaned.replaceAll(STRING_LITERAL, "").replaceAll(/[\s,]/gu, "") !== "") return null;
	const out: string[] = [];
	for (const match of cleaned.matchAll(STRING_LITERAL)) {
		const value = parseStringLiteral(match[0]);
		if (value === null) return null;
		out.push(value);
	}
	return out;
}

/** `[SchemaMarkup.get("person"), …]` only; `generate()`/spreads stay read-only. */
function parseSchemaArray(raw: string): string[] | null {
	const body = arrayBody(raw);
	if (body === null) return null;
	const cleaned = stripComments(body);
	if (cleaned.replaceAll(SCHEMA_GET, "").replaceAll(/[\s,]/gu, "") !== "") return null;
	const out: string[] = [];
	for (const match of cleaned.matchAll(SCHEMA_GET)) {
		const value = parseStringLiteral(match[1]);
		if (value === null) return null;
		out.push(value);
	}
	return out;
}

function generatedSchemaTypes(raw: string): string[] {
	const out: string[] = [];
	for (const match of raw.matchAll(/type\s*:\s*["']([^"']+)["']/gu)) {
		if (!out.includes(match[1])) out.push(match[1]);
	}
	return out;
}

function parsePrerender(text: string): string {
	return /export\s+const\s+prerender\s*=\s*(true|false)/u.exec(text)?.[1] ?? "unset";
}

function parsePageSource(text: string): Omit<PageSeoDetail, "mtime" | "path" | "route"> {
	const empty = {
		description: null,
		editable: { description: false, keywords: false, schema: false, title: false },
		keywords: [],
		prerender: parsePrerender(text),
		schemaMode: "none" as const,
		schemaTypes: [],
		title: null,
	};
	const bounds = frontmatterBounds(text);
	if (!bounds) return empty;
	const blocks = findConstBlocks(text, bounds);
	const valueOf = (key: SeoKey): string | null => {
		const block = blocks.get(key);
		return block ? text.slice(block.valueStart, block.end) : null;
	};
	const title = valueOf("title");
	const description = valueOf("description");
	const keywordsRaw = valueOf("keywords");
	const schemaRaw = valueOf("schema_markup");
	const keywords = keywordsRaw === null ? null : parseStringArray(keywordsRaw);
	const schemaList = schemaRaw === null ? null : parseSchemaArray(schemaRaw);
	return {
		description: description === null ? null : parseStringLiteral(description),
		editable: {
			description: description !== null && parseStringLiteral(description) !== null,
			keywords: keywords !== null,
			// A missing `SchemaMarkup` import is fine — writePageSeo adds it.
			schema: schemaRaw !== null && schemaList !== null,
			title: title !== null && parseStringLiteral(title) !== null,
		},
		keywords: keywords ?? [],
		prerender: parsePrerender(text),
		schemaMode: schemaRaw === null ? "none" : schemaList === null ? "dynamic" : "list",
		schemaTypes: schemaList ?? (schemaRaw === null ? [] : generatedSchemaTypes(schemaRaw)),
		title: title === null ? null : parseStringLiteral(title),
	};
}

function pageRoute(repoRel: string): string {
	return routeFor(repoRel.replace(/^src\/pages\//u, "")).route;
}

export async function readPageSeo(repoRel: string): Promise<PageSeoDetail> {
	const abs = resolveRepoPath(repoRel);
	const st = await fs.stat(abs).catch(() => {
		throw new CmsError("NOT_FOUND", `Not found: ${repoRel}`, { status: 404 });
	});
	const text = await fs.readFile(abs, "utf8");
	return { ...parsePageSource(text), mtime: st.mtimeMs, path: repoRel, route: pageRoute(repoRel) };
}

/** Schema types registered by the Astro project, used for the add-type picker. */
export async function readSchemaOptions(): Promise<string[]> {
	const text = await fs.readFile(resolveRepoPath(SCHEMA_LIB), "utf8").catch(() => "");
	const block = /export\s+type\s+StaticSchemaMarkupType\s*=([\s\S]*?);/u.exec(text)?.[1];
	if (!block) return FALLBACK_SCHEMA_TYPES;
	const types = [...block.matchAll(/"([^"]+)"/gu)].map((match) => match[1]);
	return types.length > 0 ? types : FALLBACK_SCHEMA_TYPES;
}

function quoteString(value: string): string {
	return JSON.stringify(value);
}

function formatArray(items: string[], raw: string, render: (item: string) => string): string {
	if (items.length === 0) return "[]";
	const indent = /\n([ \t]+)\S/u.exec(raw)?.[1] ?? "\t";
	return `[\n${items.map((item) => `${indent}${render(item)},`).join("\n")}\n]`;
}

function formatConst(key: SeoKey, value: string | string[], raw: string): string {
	if (key === "title") return `const title = ${quoteString(String(value))};`;
	if (key === "description") return `const description = ${quoteString(String(value))};`;
	if (key === "keywords") {
		return `const keywords = ${formatArray(value as string[], raw, quoteString)};`;
	}
	return `const schema_markup = ${formatArray(
		value as string[],
		raw,
		(item) => `SchemaMarkup.get(${quoteString(item)})`,
	)};`;
}

function mismatchedFields(next: ReturnType<typeof parsePageSource>, patch: PageSeoPatch): string[] {
	const mismatched: string[] = [];
	if (patch.title !== undefined && next.title !== patch.title) mismatched.push("title");
	if (patch.description !== undefined && next.description !== patch.description) {
		mismatched.push("description");
	}
	if (
		patch.keywords !== undefined &&
		next.keywords.join("\u0000") !== patch.keywords.join("\u0000")
	) {
		mismatched.push("keywords");
	}
	if (
		patch.schema !== undefined &&
		next.schemaTypes.join("\u0000") !== patch.schema.join("\u0000")
	) {
		mismatched.push("schema");
	}
	return mismatched;
}

export async function writePageSeo(
	repoRel: string,
	patch: PageSeoPatch,
	mtime: number,
	opts?: { force?: boolean },
): Promise<{ diff: string; mtime: number; path: string }> {
	if (!repoRel.startsWith("src/pages/")) {
		throw new CmsError("VALIDATION", "Only files under src/pages are editable here", {
			status: 400,
		});
	}
	if (patch.title === null || patch.description === null) {
		throw new CmsError("VALIDATION", "title and description must be strings", { status: 400 });
	}
	const abs = resolveRepoPath(repoRel);
	const oldText = await fs.readFile(abs, "utf8").catch(() => {
		throw new CmsError("NOT_FOUND", `Not found: ${repoRel}`, { status: 404 });
	});
	const st = await fs.stat(abs);
	if (!opts?.force && Math.abs(st.mtimeMs - mtime) > 1000 && st.mtimeMs !== mtime) {
		throw new CmsError("CONFLICT", "Stale write: page changed since you loaded it", {
			status: 409,
		});
	}
	const bounds = frontmatterBounds(oldText);
	if (!bounds) {
		throw new CmsError("VALIDATION", "No Astro frontmatter in this file", { status: 400 });
	}
	const blocks = findConstBlocks(oldText, bounds);

	const wanted: Partial<Record<SeoKey, string | string[]>> = {};
	if (patch.title !== undefined) wanted.title = patch.title;
	if (patch.description !== undefined) wanted.description = patch.description;
	if (patch.keywords !== undefined) wanted.keywords = patch.keywords;
	if (patch.schema !== undefined) wanted.schema_markup = patch.schema;

	const replacements: { end: number; start: number; text: string }[] = [];
	for (const key of SEO_KEYS) {
		const value = wanted[key];
		if (value === undefined) continue;
		const block = blocks.get(key);
		if (!block) {
			throw new CmsError("VALIDATION", `No top-level \`const ${key}\` in ${repoRel}`, {
				fields: { [key]: "Not defined in this page's source" },
				status: 400,
			});
		}
		const raw = oldText.slice(block.valueStart, block.end);
		if (key === "keywords" && parseStringArray(raw) === null) {
			throw new CmsError("VALIDATION", `keywords in ${repoRel} are computed, not a literal array`, {
				status: 400,
			});
		}
		if (key === "schema_markup" && parseSchemaArray(raw) === null) {
			throw new CmsError(
				"VALIDATION",
				`schema_markup in ${repoRel} uses computed calls and cannot be rewritten`,
				{ status: 400 },
			);
		}
		if ((key === "title" || key === "description") && parseStringLiteral(raw) === null) {
			throw new CmsError("VALIDATION", `${key} in ${repoRel} is not a string literal`, {
				status: 400,
			});
		}
		replacements.push({
			end: block.end + 1,
			start: block.start,
			text: formatConst(key, value, raw),
		});
	}
	const schemaList = wanted.schema_markup;
	if (
		Array.isArray(schemaList) &&
		schemaList.length > 0 &&
		!/\bSchemaMarkup\b/u.test(oldText.slice(bounds.start, bounds.end))
	) {
		replacements.push({ end: bounds.start, start: bounds.start, text: `${SCHEMA_IMPORT}\n` });
	}

	let nextText = oldText;
	for (const replacement of replacements.toSorted((a, b) => b.start - a.start)) {
		nextText =
			nextText.slice(0, replacement.start) + replacement.text + nextText.slice(replacement.end);
	}

	const mismatched = mismatchedFields(parsePageSource(nextText), patch);
	if (mismatched.length > 0) {
		throw new CmsError(
			"SCHEMA_MERGE",
			`Could not safely rewrite ${mismatched.join(", ")} in ${repoRel}`,
			{ status: 500 },
		);
	}

	if (nextText === oldText) {
		return { diff: "", mtime: st.mtimeMs, path: repoRel };
	}

	await backupFile(abs);
	await atomicWrite(abs, nextText);
	const st2 = await fs.stat(abs);
	return { diff: unifiedDiff(oldText, nextText, repoRel), mtime: st2.mtimeMs, path: repoRel };
}
