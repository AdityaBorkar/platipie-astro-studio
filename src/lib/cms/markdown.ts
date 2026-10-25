import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
// §7.2 local render — unified/remark pipeline for preview (server + client safe).
import { unified } from "unified";

const processor = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkRehype, { allowDangerousHtml: false })
	.use(rehypeStringify);

/** Strip MDX-only constructs for local HTML preview (imports/JSX kept opaque in Visual). */
export function stripMdxForPreview(md: string): string {
	return md
		.split("\n")
		.filter((line) => !/^\s*import\s+.*from\s+["']/u.test(line))
		.join("\n");
}

export async function renderMarkdownPreview(md: string): Promise<string> {
	const clean = stripMdxForPreview(md);
	try {
		const file = await processor.process(clean);
		return String(file);
	} catch {
		// Fallback: escape + line breaks.
		const esc = clean.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
		return `<pre>${esc}</pre>`;
	}
}

/** Detect uneditable MDX/JSX blocks for Visual mode opaque placeholders (§7.4). */
export function findUneditableBlocks(md: string): { line: number; preview: string }[] {
	const out: { line: number; preview: string }[] = [];
	const lines = md.split("\n");
	lines.forEach((line, i) => {
		const t = line.trim();
		if (
			/^\s*import\s+/u.test(line) ||
			/^\s*<[A-Z][^>]*>/u.test(line) ||
			/^\s*<\/[A-Z]/u.test(line) ||
			/^\{[A-Z_]+\./u.test(t) ||
			(t.startsWith("{") && t.endsWith("}") && t.length < 120)
		) {
			out.push({ line: i + 1, preview: line.slice(0, 120) });
		}
	});
	return out;
}
