// Resolves the JSON-LD encoded behind a `SchemaMarkup.get("…")` / `generate(…)` type
// by reading the Astro project's `src/lib/schema-markup.ts` registry and the
// defining module under `cms/schema-markup/…`. Source files stay canonical;
// this only extracts a display excerpt, never evaluates project code.
import { promises as fs } from "node:fs";

import { balancedSlice, findBlockEnd } from "./balanced.ts";
import { resolveRepoPath } from "./config.ts";
import { CmsError } from "./errors.ts";

const SCHEMA_LIB = "src/lib/schema-markup.ts";
const MAX_EXCERPT = 12_000;

export interface SchemaDetail {
	context: string | null;
	encoded: string | null;
	id: string | null;
	identifier: string | null;
	keys: string[];
	kind: "dynamic" | "static" | "unknown";
	schemaType: string | null;
	snippet: string;
	sourceFile: string | null;
	type: string;
}

function parseImports(text: string): Map<string, string> {
	const out = new Map<string, string>();
	for (const match of text.matchAll(/import\s+([\s\S]*?)\s+from\s+["']([^"']+)["']/gu)) {
		const clause = match[1];
		const specifier = match[2];
		// Strip `type` qualifiers so `import { type X, Y }` still maps Y.
		const cleaned = clause.replaceAll(/\btype\b/gu, " ");
		for (const id of cleaned.matchAll(/[A-Za-z_$][\w$]*/gu)) {
			const name = id[0];
			if (name === "import" || name === "from" || name === "as") continue;
			if (!out.has(name)) out.set(name, specifier);
		}
	}
	return out;
}

function objectBodyAt(text: string, braceAt: number): string | null {
	return balancedSlice(text, braceAt, "{", "}");
}

function registryBody(text: string, name: string): string | null {
	const at = text.search(new RegExp(`\\b${name}\\b`, "u"));
	if (at === -1) return null;
	// Skip the type annotation (`: Record<…>` / `: { … }`); the value starts at `= {`.
	const eqAt = text.indexOf("=", at);
	if (eqAt === -1) return null;
	const braceAt = text.indexOf("{", eqAt);
	if (braceAt === -1) return null;
	return objectBodyAt(text, braceAt);
}

function parseStaticMap(body: string): Map<string, string> {
	const out = new Map<string, string>();
	for (const match of body.matchAll(
		/(?:"([^"]+)"|([A-Za-z_$][\w$]*))\s*:\s*([A-Za-z_$][\w$]*)/gu,
	)) {
		out.set(match[1] ?? match[2], match[3]);
	}
	return out;
}

function parseDynamicMap(body: string): Map<string, string> {
	const out = new Map<string, string>();
	for (const match of body.matchAll(/"([^"]+)"\s*:\s*\([^)]*\)\s*=>\s*([A-Za-z_$][\w$]*)/gu)) {
		out.set(match[1], match[2]);
	}
	return out;
}

function specifierToRepoRel(specifier: string): string | null {
	let rel: string | null = null;
	if (specifier.startsWith("#cms/")) rel = `cms/${specifier.slice("#cms/".length)}`;
	else if (specifier.startsWith("#/lib/")) rel = `src/lib/${specifier.slice("#/lib/".length)}`;
	else if (specifier.startsWith("#/")) rel = `src/${specifier.slice("#/".length)}`;
	else if (specifier.startsWith("./") || specifier.startsWith("../")) return null;
	else return null;
	if (rel.endsWith(".ts") || rel.endsWith(".tsx")) return rel;
	return `${rel}.ts`;
}

async function readRepoFile(repoRel: string): Promise<string | null> {
	try {
		const text = await fs.readFile(resolveRepoPath(repoRel), "utf8");
		return text;
	} catch {
		// `index.ts` fallback for directory-style specifiers.
		if (!repoRel.endsWith("/index.ts")) {
			try {
				const text = await fs.readFile(
					resolveRepoPath(repoRel.replace(/\.ts$/u, "/index.ts")),
					"utf8",
				);
				return text;
			} catch {
				return null;
			}
		}
		return null;
	}
}

function canonicalRepoRel(repoRel: string): string {
	return repoRel.endsWith("/index.ts") ? repoRel : repoRel;
}

function extractObjectForIdentifier(source: string, identifier: string): string | null {
	const pattern = new RegExp(`\\b${identifier}\\b`, "u");
	const at = source.search(pattern);
	if (at === -1) return null;
	const braceAt = source.indexOf("{", at);
	if (braceAt === -1) return null;
	// Bail if a `;` or a new declaration intervenes before the brace.
	const between = source.slice(at, braceAt);
	if (/;\s*(?:export|import|const|function)\b/u.test(between)) return null;
	const end = findBlockEnd(source, braceAt, "{", "}");
	if (end === -1) return null;
	return source.slice(braceAt, end + 1);
}

function extractBuilderBlock(source: string, builder: string): string | null {
	const pattern = new RegExp(
		`export\\s+(?:async\\s+)?(?:function\\s+${builder}\\b|const\\s+${builder}\\b)[\\s\\S]*?\\{`,
		"u",
	);
	const match = pattern.exec(source);
	if (!match || match.index === undefined) return null;
	const braceAt = source.indexOf("{", match.index + match[0].length - 1);
	if (braceAt === -1) return null;
	const end = findBlockEnd(source, braceAt, "{", "}");
	if (end === -1) return null;
	const start = source.lastIndexOf("export", match.index);
	const text = source.slice(start === -1 ? match.index : start, end + 1);
	return text.length > MAX_EXCERPT ? `${text.slice(0, MAX_EXCERPT)}\n…` : text;
}

function extractQuoted(body: string, key: string): string | null {
	const match = new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`, "u").exec(body);
	return match?.[1] ?? null;
}

function topKeys(body: string): string[] {
	const keys: string[] = [];
	let depth = 0;
	let inStr: string | null = null;
	let escaped = false;
	let segment = "";
	const flush = () => {
		const match = /^\s*(?:"([^"]+)"|'([^']+)'|([A-Za-z_$][\w$]*))\s*:/u.exec(segment);
		const key = match?.[1] ?? match?.[2] ?? match?.[3];
		if (key && !keys.includes(key)) keys.push(key);
		segment = "";
	};
	for (const ch of body) {
		if (inStr) {
			segment += depth === 0 ? ch : "";
			if (escaped) escaped = false;
			else if (ch === "\\") escaped = true;
			else if (ch === inStr) inStr = null;
			continue;
		}
		if (ch === '"' || ch === "'" || ch === "`") {
			inStr = ch;
			segment += depth === 0 ? ch : "";
			continue;
		}
		if (ch === "{" || ch === "[") depth++;
		if (ch === "}" || ch === "]") depth--;
		if (ch === "," && depth === 0) flush();
		else if (depth === 0) segment += ch;
	}
	flush();
	return keys;
}

export async function readSchemaDetail(type: string): Promise<SchemaDetail> {
	const name = type.trim();
	if (!name || name.length > 200 || name.includes("..") || name.startsWith("/")) {
		throw new CmsError("VALIDATION", "Unknown schema type", { status: 400 });
	}
	const unknown: SchemaDetail = {
		context: null,
		encoded: null,
		id: null,
		identifier: null,
		keys: [],
		kind: "unknown",
		schemaType: null,
		snippet: `SchemaMarkup.get("${name}")`,
		sourceFile: null,
		type: name,
	};

	const libText = await readRepoFile(SCHEMA_LIB);
	if (!libText) return unknown;

	const imports = parseImports(libText);
	const staticBody = registryBody(libText, "staticRegistry");
	const staticMap = staticBody ? parseStaticMap(staticBody) : new Map<string, string>();
	const dynamicBody = registryBody(libText, "dynamicBuilders");
	const dynamicMap = dynamicBody ? parseDynamicMap(dynamicBody) : new Map<string, string>();

	const staticId = staticMap.get(name);
	if (staticId) {
		const snippet = `SchemaMarkup.get("${name}")`;
		const specifier = imports.get(staticId);
		const repoRel = specifier ? specifierToRepoRel(specifier) : null;
		if (!repoRel) return { ...unknown, identifier: staticId, snippet };
		const alternate = repoRel.replace(/\.ts$/u, "/index.ts");
		let source = await readRepoFile(repoRel);
		let file: string | null = repoRel;
		if (!source) {
			source = await readRepoFile(alternate);
			file = source ? alternate : null;
		}
		if (!source || !file) return { ...unknown, identifier: staticId, snippet };
		const encoded = extractObjectForIdentifier(source, staticId);
		if (!encoded) {
			return { ...unknown, identifier: staticId, snippet, sourceFile: file };
		}
		const body = encoded.slice(1, -1);
		const text = encoded.length > MAX_EXCERPT ? `${encoded.slice(0, MAX_EXCERPT)}\n…` : encoded;
		return {
			context: extractQuoted(body, "@context"),
			encoded: text,
			id: extractQuoted(body, "@id"),
			identifier: staticId,
			keys: topKeys(body),
			kind: "static",
			schemaType: extractQuoted(body, "@type"),
			snippet,
			sourceFile: canonicalRepoRel(file),
			type: name,
		};
	}

	const builder = dynamicMap.get(name);
	if (builder) {
		const snippet = `SchemaMarkup.generate({ type: "${name}", data: … })`;
		const specifier = imports.get(builder);
		const repoRel = specifier ? specifierToRepoRel(specifier) : null;
		if (!repoRel) return { ...unknown, kind: "dynamic", snippet };
		let source = await readRepoFile(repoRel);
		let file: string | null = repoRel;
		if (!source) {
			const alternate = repoRel.replace(/\.ts$/u, "/index.ts");
			source = await readRepoFile(alternate);
			file = source ? alternate : null;
		}
		if (!source || !file) return { ...unknown, identifier: builder, kind: "dynamic", snippet };
		return {
			context: null,
			encoded: extractBuilderBlock(source, builder),
			id: null,
			identifier: builder,
			keys: [],
			kind: "dynamic",
			schemaType: null,
			snippet,
			sourceFile: canonicalRepoRel(file),
			type: name,
		};
	}

	return unknown;
}
