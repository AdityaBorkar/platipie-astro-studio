// §5.1 — blog registration (CMS-managed), AST-preserving text merges.
// Idempotent; backup + abort on merge failure; never full-file rewrite.
import { existsSync, promises as fs } from "node:fs";
import path from "node:path";

import { getAstroRoot } from "./config.ts";
import { CmsError } from "./errors.ts";

const BLOG_BLOCK = `const blog = defineCollection({
\tloader: glob({ base: "./cms/blog", pattern: "**/*.md" }),
\tschema: z.object({
\t\ttitle: z.string(),
\t\texcerpt: z.string().optional(),
\t\tstatus: z.enum(["draft", "published", "scheduled"]).optional(),
\t\tpublishDate: z.string().optional(),
\t\tdate: z.string().optional(),
\t\tmodifiedDate: z.string().optional(),
\t\tauthor: z.string().optional(),
\t\tcategories: z.array(z.string()).optional(),
\t\ttags: z.array(z.string()).optional(),
\t\tfeaturedImage: z.string().optional(),
\t\tcanonicalUrl: z.string().url().optional().or(z.literal("").optional()),
\t\tmetaTitle: z.string().optional(),
\t\tmetaDescription: z.string().optional(),
\t\tkeywords: z.array(z.string()).optional(),
\t\togImage: z.string().optional(),
\t\togType: z.string().optional(),
\t\ttwitterCard: z.string().optional(),
\t\tnoindex: z.boolean().optional(),
\t\tnofollow: z.boolean().optional(),
\t\tschemaType: z.string().optional(),
\t}).passthrough(),
});`;

const PROJECTS_WP_SNIPPET = `\n\t\t// WP-parity additions (CMS-managed, additive-only):\n\t\texcerpt: z.string().optional(),\n\t\tstatus: z.enum(["draft", "published", "scheduled"]).optional(),\n\t\tpublishDate: z.string().optional(),\n\t\tmodifiedDate: z.string().optional(),\n\t\tauthor: z.string().optional(),\n\t\tcategories: z.array(z.string()).optional(),\n\t\tfeaturedImage: z.string().optional(),\n\t\tcanonicalUrl: z.string().optional(),\n\t\tmetaTitle: z.string().optional(),\n\t\tmetaDescription: z.string().optional(),\n\t\tkeywords: z.array(z.string()).optional(),\n\t\togImage: z.string().optional(),\n\t\togType: z.string().optional(),\n\t\ttwitterCard: z.string().optional(),\n\t\tnoindex: z.boolean().optional(),\n\t\tnofollow: z.boolean().optional(),\n\t\tschemaType: z.string().optional(),\n\t\tschemaFields: z.record(z.unknown()).optional(),`;

function contentConfigPath(): string {
	const root = getAstroRoot();
	const a = path.join(root, "src/content.config.ts");
	if (existsSync(a)) return a;
	return path.join(root, "content.config.ts");
}

export async function blogRegistrationStatus(): Promise<{
	registered: boolean;
	projectsExtended: boolean;
	path: string;
}> {
	const p = contentConfigPath();
	const text = await fs.readFile(p, "utf8").catch(() => "");
	const registered = /(const|let|var)\s+blog\s*=/u.test(text) && text.includes("cms/blog");
	const projectsExtended =
		text.includes("WP-parity additions (CMS-managed") ||
		(text.includes("excerpt: z.string().optional()") && text.includes("schemaType"));
	return { path: p, projectsExtended, registered };
}

/** Validate TS parses (Bun transpile) — aborts merge on failure. */
function assertParses(text: string, label: string): void {
	try {
		new Bun.Transpiler({ loader: "ts" }).transformSync(text);
	} catch (e) {
		throw new CmsError("SCHEMA_MERGE", `${label} failed to parse: ${(e as Error).message}`, {
			status: 500,
		});
	}
}

export async function registerBlogCollection(opts?: { widenGlobs?: boolean }): Promise<{
	ok: true;
	already: boolean;
	path: string;
	backup: boolean;
	widened: boolean;
}> {
	const p = contentConfigPath();
	const original = await fs.readFile(p, "utf8").catch(() => {
		throw new CmsError("NOT_FOUND", "content.config.ts not found", { status: 404 });
	});
	assertParses(original, "content.config.ts (pre-merge)");
	let next = original;
	let changed = false;

	// 1. Insert `const blog = ...` before `export const collections` if missing.
	const hasBlog = /(const|let|var)\s+blog\s*=/u.test(next) && next.includes("cms/blog");
	if (!hasBlog) {
		const anchor = "export const collections";
		const idx = next.indexOf(anchor);
		if (idx === -1)
			throw new CmsError("SCHEMA_MERGE", "Cannot locate `export const collections`", {
				status: 500,
			});
		next = `${next.slice(0, idx)}${BLOG_BLOCK}\n\n${next.slice(idx)}`;
		changed = true;
	}

	// 2. Add `blog,` to collections object if missing.
	if (!/collections\s*=\s*\{[^}]*\bblog\b/u.test(next)) {
		const m = next.match(/export const collections\s*=\s*\{([^}]*)\}/su);
		if (!m || m.index === undefined)
			throw new CmsError("SCHEMA_MERGE", "Cannot locate collections object", { status: 500 });
		const inner = m[1];
		// Preserve trailing comma style.
		const replacement = `export const collections = {${inner.replace(/\s*$/u, "")}\n\tblog,\n}`;
		next = next.slice(0, m.index) + replacement + next.slice(m.index + m[0].length);
		changed = true;
	}

	// 3. Extend projects schema additively if missing.
	if (!next.includes("WP-parity additions (CMS-managed")) {
		// Anchor: `year: z.number(),` inside projects block.
		const projIdx = next.indexOf("const projects");
		if (projIdx === -1)
			throw new CmsError("SCHEMA_MERGE", "Cannot locate `const projects`", { status: 500 });
		const yearNeedle = "year: z.number(),";
		const yearIdx = next.indexOf(yearNeedle, projIdx);
		if (yearIdx === -1)
			throw new CmsError("SCHEMA_MERGE", "Cannot locate projects `year` field for additive merge", {
				status: 500,
			});
		const insertAt = yearIdx + yearNeedle.length;
		next = next.slice(0, insertAt) + PROJECTS_WP_SNIPPET + next.slice(insertAt);
		changed = true;
	}

	// 4. Optional glob widening to **/*.{md,mdx}.
	let widened = false;
	if (opts?.widenGlobs) {
		const before = next;
		next = next.replace('pattern: "**/*.md"', 'pattern: "**/*.{md,mdx}"');
		widened = next !== before;
		if (widened) changed = true;
	}

	if (!changed) {
		return { already: true, backup: false, ok: true, path: p, widened: false };
	}

	assertParses(next, "content.config.ts (post-merge)");
	// Pre-save backup.
	await fs.copyFile(p, `${p}.bak`).catch(() => {});
	// Atomic write.
	const tmp = `${p}.tmp-${Date.now()}`;
	await fs.writeFile(tmp, next, "utf8");
	await fs.rename(tmp, p);
	return { already: false, backup: true, ok: true, path: p, widened };
}
