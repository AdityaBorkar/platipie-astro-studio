import { existsSync, promises as fs } from "node:fs";
import path from "node:path";

import {
	balancedSlice,
	escapeRegExp,
	findBlockEnd,
	topLevelKeys,
	topLevelListItems,
} from "../balanced.ts";
import { IMAGE_EXTS } from "../config.ts";
import { mapChunked, walkDir } from "../fs-walk.ts";
import { listEmailFiles, listSitePages } from "../workspace.ts";

export interface AssetScan {
	dir: string;
	ext: string;
	kind: string;
	mtime: number;
	name: string;
	path: string;
	size: number;
}

export interface ContentCollectionScan {
	base: string;
	count: number;
	filePath: string;
	loader: string;
	mtime: number;
	name: string;
	pattern: string;
	schemaKeys: string[];
}

export interface ComponentScan {
	dir: string;
	ext: string;
	hasSlot: boolean;
	mtime: number;
	name: string;
	path: string;
	props: string[];
	size: number;
}

export interface EmailScan {
	dir: string;
	ext: string;
	mtime: number;
	name: string;
	path: string;
	size: number;
	subject: string | null;
}

export interface PageScan {
	dynamic: boolean;
	hasSeo: boolean;
	mtime: number;
	path: string;
	prerender: string;
	private: boolean;
	route: string;
	schemaTypes: string[];
	seoDescription: string | null;
	seoKeywords: string[];
	seoTitle: string | null;
	size: number;
	title: string;
	type: string;
}

export interface AstroSettingsScan {
	adapter: string | null;
	filePath: string;
	integrations: string[];
	mtime: number;
	output: string | null;
	raw: string;
	redirects: Record<string, string>;
	site: string | null;
}

const SCANNER_IMAGE_EXT = new Set([...IMAGE_EXTS, ".bmp", ".tiff"]);
const FONT_EXT = new Set([".woff", ".woff2", ".ttf", ".otf", ".eot"]);
const VIDEO_EXT = new Set([".mp4", ".webm", ".mov", ".ogv"]);

function kindForExt(ext: string): string {
	if (ext === ".svg") return "svg";
	if (SCANNER_IMAGE_EXT.has(ext)) return "image";
	if (VIDEO_EXT.has(ext)) return "video";
	if (FONT_EXT.has(ext)) return "font";
	return "other";
}

export async function scanAssets(projectRoot: string): Promise<AssetScan[]> {
	const entries = await walkDir(path.join(projectRoot, "assets"), "assets");
	return entries.map((entry) => {
		const ext = path.extname(entry.rel).toLowerCase();
		return {
			dir: path.dirname(entry.rel).replaceAll("\\", "/"),
			ext,
			kind: kindForExt(ext),
			mtime: entry.mtime,
			name: path.basename(entry.rel),
			path: entry.rel,
			size: entry.size,
		};
	});
}

export function findContentConfig(projectRoot: string): string | null {
	const candidates = ["src/content.config.ts", "content.config.ts"];
	for (const rel of candidates) {
		if (existsSync(path.join(projectRoot, rel))) return rel;
	}
	return null;
}

function extensionsForPattern(pattern: string): string[] {
	const exts = new Set<string>();
	for (const match of pattern.matchAll(/\.([A-Za-z0-9]+)/gu)) {
		if (["md", "mdx", "json", "yaml", "yml", "toml"].includes(match[1].toLowerCase())) {
			exts.add(`.${match[1].toLowerCase()}`);
		}
	}
	return [...exts];
}

async function countGlobEntries(
	projectRoot: string,
	base: string,
	pattern: string,
): Promise<number> {
	const cleanBase = base.replace(/^\.\//u, "");
	const entries = await walkDir(path.join(projectRoot, cleanBase), cleanBase);
	const exts = extensionsForPattern(pattern);
	if (exts.length === 0) return entries.length;
	return entries.filter((entry) => exts.includes(path.extname(entry.rel).toLowerCase())).length;
}

async function countFileEntries(projectRoot: string, base: string): Promise<number> {
	try {
		const raw = await fs.readFile(path.join(projectRoot, base.replace(/^\.\//u, "")), "utf8");
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.length : 0;
	} catch (e) {
		if ((e as NodeJS.ErrnoException)?.code === "ENOENT") return 0;
		throw e;
	}
}

export async function scanContentCollections(
	projectRoot: string,
): Promise<ContentCollectionScan[]> {
	const rel = findContentConfig(projectRoot);
	if (!rel) return [];
	const abs = path.join(projectRoot, rel);
	let text: string;
	try {
		text = await fs.readFile(abs, "utf8");
	} catch (e) {
		if ((e as NodeJS.ErrnoException)?.code === "ENOENT") return [];
		if ((e as NodeJS.ErrnoException)?.code === "ENOTDIR") return [];
		throw e;
	}
	if (!text) return [];
	const st = await fs.stat(abs).catch(() => null);
	const mtime = st?.mtimeMs ?? 0;
	const out: ContentCollectionScan[] = [];
	const decl = /(?:const|let|var)\s+(\w+)\s*=\s*defineCollection\s*\(/gu;
	let match: RegExpExecArray | null;
	while ((match = decl.exec(text)) !== null) {
		const name = match[1];
		const open = text.indexOf("(", match.index + match[0].length - 1);
		const end = findBlockEnd(text, open, "(", ")");
		if (open === -1 || end === -1) continue;
		const body = text.slice(open + 1, end);
		const loaderMatch = /loader\s*:\s*(glob|file)\s*\(/u.exec(body);
		const loader = loaderMatch?.[1] ?? "unknown";
		const baseMatch = /base\s*:\s*["']([^"']+)["']/u.exec(body);
		const patternMatch = /pattern\s*:\s*["']([^"']+)["']/u.exec(body);
		// `file()` takes the path positionally, without a `base:` key.
		const positionalMatch = /loader\s*:\s*(?:glob|file)\s*\(\s*["']([^"']+)["']/u.exec(body);
		const base = baseMatch?.[1] ?? positionalMatch?.[1] ?? "";
		const pattern = patternMatch?.[1] ?? "";
		const schemaAt = body.indexOf("schema");
		let schemaKeys: string[] = [];
		if (schemaAt !== -1) {
			const objAt = body.indexOf("z.object({", schemaAt);
			if (objAt !== -1) {
				const braceOpen = body.indexOf("{", objAt);
				const braceEnd = findBlockEnd(body, braceOpen, "{", "}");
				if (braceOpen !== -1 && braceEnd !== -1) {
					schemaKeys = topLevelKeys(body.slice(braceOpen + 1, braceEnd));
				}
			}
		}
		const count =
			loader === "file" && base
				? await countFileEntries(projectRoot, base)
				: loader === "glob" && base
					? await countGlobEntries(projectRoot, base, pattern)
					: 0;
		out.push({
			base,
			count,
			filePath: rel,
			loader,
			mtime,
			name,
			pattern,
			schemaKeys,
		});
	}
	return out.toSorted((a, b) => a.name.localeCompare(b.name));
}

const COMPONENT_EXTS = new Set([".astro", ".tsx", ".ts", ".mdx", ".jsx", ".js"]);

function parsePropsFields(text: string): string[] {
	const match = /interface\s+Props\s*\{([\s\S]*?)\}/u.exec(text);
	if (!match) return [];
	const fields: string[] = [];
	for (const line of match[1].split("\n")) {
		const field = /^\s*(?:readonly\s+)?([A-Za-z_$][\w$]*)\s*[?:]/u.exec(line);
		if (field?.[1]) fields.push(field[1]);
	}
	return fields;
}

export async function scanComponentDir(projectRoot: string, dir: string): Promise<ComponentScan[]> {
	const entries = await walkDir(path.join(projectRoot, "src", dir), `src/${dir}`);
	const out = await mapChunked(entries, async (entry): Promise<ComponentScan | null> => {
		const ext = path.extname(entry.rel).toLowerCase();
		if (!COMPONENT_EXTS.has(ext)) return null;
		let props: string[] = [];
		let hasSlot = false;
		try {
			const text = await fs.readFile(entry.abs, "utf8");
			props = parsePropsFields(text);
			hasSlot = text.includes("<slot");
		} catch {
			// Unreadable file still gets a row, without parsed fields.
		}
		return {
			dir: path.dirname(entry.rel).replaceAll("\\", "/"),
			ext,
			hasSlot,
			mtime: entry.mtime,
			name: path.basename(entry.rel),
			path: entry.rel,
			props,
			size: entry.size,
		};
	});
	return out
		.filter((row): row is ComponentScan => row !== null)
		.toSorted((a, b) => a.path.localeCompare(b.path));
}

export async function scanEmails(projectRoot: string): Promise<EmailScan[]> {
	const entries = await listEmailFiles(projectRoot);
	const out = await mapChunked(entries, async (entry): Promise<EmailScan> => {
		const ext = path.extname(entry.rel).toLowerCase();
		let subject: string | null = null;
		try {
			const text = await fs.readFile(entry.abs, "utf8");
			const preview = /<Preview[^>]*>([\s\S]*?)<\/Preview>/u.exec(text);
			if (preview) {
				const cleaned = preview[1]
					.replaceAll(/<[^>]+>/gu, "")
					.replaceAll(/\s+/gu, " ")
					.trim();
				subject = cleaned.slice(0, 160) || null;
			}
			if (!subject) {
				const subjectConst = /(?:subject|title)\s*=\s*["']([^"']+)["']/u.exec(text);
				subject = subjectConst?.[1] ?? null;
			}
		} catch {
			// Keep the row with subject null.
		}
		return {
			dir: path.dirname(entry.rel).replaceAll("\\", "/"),
			ext,
			mtime: entry.mtime,
			name: path.basename(entry.rel),
			path: entry.rel,
			size: entry.size,
			subject,
		};
	});
	return out.toSorted((a, b) => a.path.localeCompare(b.path));
}

function quotedValue(text: string, key: string): string | null {
	const match = new RegExp(
		`const\\s+${escapeRegExp(key)}\\s*=\\s*("([^"\\\\]|\\\\.)*"|'([^'\\\\]|\\\\.)*')`,
		"su",
	).exec(text);
	if (!match?.[1]) return null;
	const raw = match[1];
	const quote = raw[0];
	return raw.slice(1, -1).replaceAll(`\\${quote}`, quote).replaceAll("\\n", " ").trim() || null;
}

function keywordsValue(text: string): string[] {
	const match = /const\s+keywords\s*=\s*\[([\s\S]*?)\]/u.exec(text);
	if (!match) return [];
	const out: string[] = [];
	for (const quoted of match[1].matchAll(/["']([^"']+)["']/gu)) {
		if (quoted[1].trim()) out.push(quoted[1].trim());
	}
	return out;
}

function schemaTypesValue(text: string): string[] {
	const match = /const\s+schema_markup\s*=\s*\[([\s\S]*?)\];/u.exec(text);
	if (!match) return [];
	const out: string[] = [];
	for (const get of match[1].matchAll(/SchemaMarkup\.get\(\s*["']([^"']+)["']\s*\)/gu)) {
		if (!out.includes(get[1])) out.push(get[1]);
	}
	for (const type of match[1].matchAll(/type\s*:\s*["']([^"']+)["']/gu)) {
		if (!out.includes(type[1])) out.push(type[1]);
	}
	return out;
}

// Maps over the single listSitePages enumerator, enriching each page with the
// SEO fields read from its source file. Private `_` files stay flagged so the
// Pages route shows the full picture.
export async function scanPages(projectRoot: string): Promise<PageScan[]> {
	const sitePages = await listSitePages(projectRoot);
	const out = await mapChunked(sitePages, async (page): Promise<PageScan | null> => {
		if (page.type !== "astro" && page.type !== "md" && page.type !== "mdx" && page.type !== "ts") {
			return null;
		}
		const fromPages = page.path.replace(/^src\/pages\//u, "");
		const segments = fromPages.replace(/\.(astro|md|mdx|ts)$/u, "").split("/");
		const isPrivate = segments.some((segment) => segment.startsWith("_"));
		let prerender = "unset";
		let seoTitle: string | null = null;
		let seoDescription: string | null = null;
		let seoKeywords: string[] = [];
		let schemaTypes: string[] = [];
		let size = 0;
		try {
			const abs = path.join(projectRoot, page.path);
			const st = await fs.stat(abs).catch(() => null);
			size = st?.size ?? 0;
			const text = await fs.readFile(abs, "utf8");
			const prerenderMatch = /export\s+const\s+prerender\s*=\s*(true|false)/u.exec(text);
			if (prerenderMatch) prerender = prerenderMatch[1];
			seoTitle = quotedValue(text, "title");
			seoDescription = quotedValue(text, "description");
			seoKeywords = keywordsValue(text);
			schemaTypes = schemaTypesValue(text);
		} catch {
			// Keep the row with defaults.
		}
		return {
			dynamic: page.kind === "dynamic",
			hasSeo: Boolean(seoTitle && seoDescription),
			mtime: page.mtime,
			path: page.path,
			prerender,
			private: isPrivate,
			route: page.route,
			schemaTypes,
			seoDescription,
			seoKeywords,
			seoTitle,
			size,
			title: seoTitle ?? page.title,
			type: page.type,
		};
	});
	return out
		.filter((row): row is PageScan => row !== null)
		.toSorted((a, b) => a.route.localeCompare(b.route));
}

export async function scanAstroSettings(projectRoot: string): Promise<AstroSettingsScan | null> {
	const rel = "astro.config.mjs";
	const abs = path.join(projectRoot, rel);
	let raw: string | null;
	try {
		raw = await fs.readFile(abs, "utf8");
	} catch (e) {
		if ((e as NodeJS.ErrnoException)?.code === "ENOENT") return null;
		if ((e as NodeJS.ErrnoException)?.code === "ENOTDIR") return null;
		throw e;
	}
	if (raw === null) return null;
	const st = await fs.stat(abs).catch(() => null);
	let site: string | null = null;
	const siteMatch = /site\s*:\s*(?:SITE_URL|["']([^"']+)["'])/u.exec(raw);
	if (siteMatch?.[1]) site = siteMatch[1];
	else if (raw.includes("site: SITE_URL")) site = "SITE_URL (from #/cms/constants)";
	const output = /output\s*:\s*["']([^"']+)["']/u.exec(raw)?.[1] ?? null;
	const adapter = /adapter\s*:\s*(\w+)\s*\(/u.exec(raw)?.[1] ?? null;
	let integrations: string[] = [];
	const integrationsAt = raw.indexOf("integrations:");
	if (integrationsAt !== -1) {
		const bracketAt = raw.indexOf("[", integrationsAt);
		const body = bracketAt === -1 ? null : balancedSlice(raw, bracketAt, "[", "]");
		if (body) {
			integrations = topLevelListItems(body)
				.map((item) => /^\s*([A-Za-z_$][\w$]*)/u.exec(item)?.[1] ?? "")
				.filter((name) => name.length > 0);
		}
	}
	const redirects: Record<string, string> = {};
	const redirectsAt = raw.indexOf("redirects:");
	if (redirectsAt !== -1) {
		const braceAt = raw.indexOf("{", redirectsAt);
		const body = braceAt === -1 ? null : balancedSlice(raw, braceAt, "{", "}");
		if (body) {
			for (const pair of body.matchAll(/["']([^"']+)["']\s*:\s*["']([^"']+)["']/gu)) {
				redirects[pair[1]] = pair[2];
			}
		}
	}
	return {
		adapter,
		filePath: rel,
		integrations,
		mtime: st?.mtimeMs ?? 0,
		output,
		raw,
		redirects,
		site,
	};
}
