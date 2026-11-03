import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

// Converged on rehype-sanitize (v6 present in package.json) instead of the
// previous hand-rolled regex sanitizer, which was bypassable via style
// attributes, WHATWG whitespace/entity scheme tricks, `<svg/onload=...>`,
// and an incomplete URL-attr/tag blocklist. The allowlist below starts from
// `defaultSchema` (GitHub-style: no style attributes, no on* handlers, only
// http(s) (+mailto) URL protocols) and additionally drops the contents of
// embed-ish tags. Raw HTML in markdown is parsed (allowDangerousHtml) so the
// sanitizer — not a regex — decides what survives. `data:` URLs are blocked
// entirely (stricter than data:image/png|jpeg|gif|webp; no legit content uses
// them here). frame/frameset/svg/video/input/button are not in `tagNames`, so
// they are unwrapped (contents kept, tag removed); script/style/iframe and
// friends are in `strip`, so their contents are dropped too.
const sanitizeSchema = {
	...defaultSchema,
	protocols: {
		...defaultSchema.protocols,
		cite: ["http", "https"],
		href: ["http", "https", "mailto"],
		longDesc: ["http", "https"],
		src: ["http", "https"],
	},
	strip: [
		...(defaultSchema.strip ?? []),
		"base",
		"embed",
		"form",
		"frame",
		"frameset",
		"iframe",
		"link",
		"meta",
		"noscript",
		"object",
		"style",
	],
};

const processor = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkRehype, { allowDangerousHtml: true })
	.use(rehypeSanitize, sanitizeSchema)
	.use(rehypeStringify);

export function escapeHtml(raw: string): string {
	return raw
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

export function markdownToSafeHtml(body: string): string {
	try {
		const file = processor.processSync(body ?? "");
		const html = String(file);
		if (html.trim().length === 0) return "";
		return html;
	} catch {
		return `<pre>${escapeHtml((body ?? "").slice(0, 2000))}</pre>`;
	}
}
