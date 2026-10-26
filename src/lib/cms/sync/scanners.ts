// Filesystem scanners for the SQLite sync read-model. Server-only.
//
// Every scanner walks a slice of the Astro checkout and returns plain rows
// ready for drizzle upserts. The Astro files stay the source of truth; these
// rows are a derived mirror.
import { existsSync, promises as fs } from "node:fs";
import path from "node:path";

import { balancedSlice, findBlockEnd, topLevelKeys, topLevelListItems } from "../balanced.ts";
import { IMAGE_EXTS } from "../config.ts";
import { walkDir } from "../fs-walk.ts";
import { routeFor, titleFor } from "../route-utils.ts";

export { routeFor };

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

// Scanner image kinds reuse the canonical base set plus inventory-only extras.
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

/** Every file under `<root>/assets` (all kinds — the Assets Viewer scope). */
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

/** Locate `src/content.config.ts` (fallback: `<root>/content.config.ts`). */
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
	} catch {
		return 0;
	}
}

/**
 * Parse collections from `src/content.config.ts` — the only CMS source.
 * Returns one row per `defineCollection` with loader base/pattern and the
 * top-level schema keys.
 */
export async function scanContentCollections(
	projectRoot: string,
): Promise<ContentCollectionScan[]> {
	const rel = findContentConfig(projectRoot);
	if (!rel) return [];
	const abs = path.join(projectRoot, rel);
	const text = await fs.readFile(abs, "utf8").catch(() => "");
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
		// `file("./cms/clients.json")` passes the path positionally (no `base:` key).
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

/** Files under `<root>/src/<dir>` (components, layouts, templates). */
export async function scanComponentDir(projectRoot: string, dir: string): Promise<ComponentScan[]> {
	const entries = await walkDir(path.join(projectRoot, "src", dir), `src/${dir}`);
	const out: ComponentScan[] = [];
	for (const entry of entries) {
		const ext = path.extname(entry.rel).toLowerCase();
		if (!COMPONENT_EXTS.has(ext)) continue;
		let props: string[] = [];
		let hasSlot = false;
		try {
			const text = await fs.readFile(entry.abs, "utf8");
			props = parsePropsFields(text);
			hasSlot = text.includes("<slot");
		} catch {
			// Unreadable file — record the inventory row without parsed fields.
		}
		out.push({
			dir: path.dirname(entry.rel).replaceAll("\\", "/"),
			ext,
			hasSlot,
			mtime: entry.mtime,
			name: path.basename(entry.rel),
			path: entry.rel,
			props,
			size: entry.size,
		});
	}
	return out.toSorted((a, b) => a.path.localeCompare(b.path));
}

/** React-email files under `<root>/src/emails` (optional upstream). */
export async function scanEmails(projectRoot: string): Promise<EmailScan[]> {
	const entries = await walkDir(path.join(projectRoot, "src", "emails"), "src/emails");
	const out: EmailScan[] = [];
	for (const entry of entries) {
		const ext = path.extname(entry.rel).toLowerCase();
		if (![".tsx", ".ts", ".jsx", ".js"].includes(ext)) continue;
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
			// Keep the row; subject stays null.
		}
		out.push({
			dir: path.dirname(entry.rel).replaceAll("\\", "/"),
			ext,
			mtime: entry.mtime,
			name: path.basename(entry.rel),
			path: entry.rel,
			size: entry.size,
			subject,
		});
	}
	return out.toSorted((a, b) => a.path.localeCompare(b.path));
}

function quotedValue(text: string, key: string): string | null {
	const match = new RegExp(
		`const\\s+${key}\\s*=\\s*("([^"\\\\]|\\\\.)*"|'([^'\\\\]|\\\\.)*')`,
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

/**
 * Pages under `<root>/src/pages` with SEO metadata + prerender settings.
 * Unlike the sidebar inventory, private `_` files and API routes are kept
 * and flagged so the Pages route can show the full picture.
 */
export async function scanPages(projectRoot: string): Promise<PageScan[]> {
	const entries = await walkDir(path.join(projectRoot, "src", "pages"), "src/pages");
	const out: PageScan[] = [];
	for (const entry of entries) {
		const ext = path.extname(entry.rel).toLowerCase();
		const type = ext === ".astro" ? "astro" : ext === ".md" ? "md" : ext === ".mdx" ? "mdx" : ext;
		if (!["astro", "md", "mdx", "ts"].includes(type)) continue;
		const fromPages = entry.rel.replace(/^src\/pages\//u, "");
		const { dynamic, route } = routeFor(fromPages);
		const segments = fromPages.replace(/\.(astro|md|mdx|ts)$/u, "").split("/");
		const isPrivate = segments.some((segment) => segment.startsWith("_"));
		let prerender = "unset";
		let seoTitle: string | null = null;
		let seoDescription: string | null = null;
		let seoKeywords: string[] = [];
		let schemaTypes: string[] = [];
		try {
			const text = await fs.readFile(entry.abs, "utf8");
			const prerenderMatch = /export\s+const\s+prerender\s*=\s*(true|false)/u.exec(text);
			if (prerenderMatch) prerender = prerenderMatch[1];
			seoTitle = quotedValue(text, "title");
			seoDescription = quotedValue(text, "description");
			seoKeywords = keywordsValue(text);
			schemaTypes = schemaTypesValue(text);
		} catch {
			// Keep the row with defaults.
		}
		out.push({
			dynamic,
			hasSeo: Boolean(seoTitle && seoDescription),
			mtime: entry.mtime,
			path: entry.rel,
			prerender,
			private: isPrivate,
			route,
			schemaTypes,
			seoDescription,
			seoKeywords,
			seoTitle,
			size: entry.size,
			title: seoTitle ?? titleFor(segments, dynamic),
			type,
		});
	}
	return out.toSorted((a, b) => a.route.localeCompare(b.route));
}

/** Read + parse `astro.config.mjs` (shown in Settings as “Astro Settings”). */
export async function scanAstroSettings(projectRoot: string): Promise<AstroSettingsScan | null> {
	const rel = "astro.config.mjs";
	const abs = path.join(projectRoot, rel);
	const raw = await fs.readFile(abs, "utf8").catch(() => null);
	if (raw === null) return null;
	const st = await fs.stat(abs).catch(() => null);
	let site: string | null = null;
	const siteMatch = /site\s*:\s*(?:SITE_URL|["']([^"']+)["'])/u.exec(raw);
	if (siteMatch?.[1]) site = siteMatch[1];
	else if (raw.includes("site: SITE_URL")) site = "SITE_URL (from #cms/constants)";
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
