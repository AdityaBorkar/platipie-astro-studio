// §11.1 — frontmatter parse/stringify. Preserves unknown keys; byte-for-byte
// no-op when untouched (critical for legal MDX imports/{EXPR}).
import { dump, load } from "js-yaml";

export interface ParsedFile {
	frontmatter: Record<string, unknown>;
	body: string;
	hasFrontmatter: boolean;
	rawFrontmatterText: string | null;
}

export function parseFileContent(text: string): ParsedFile {
	// Only `---` at byte 0 opens frontmatter (gray-matter equivalent).
	if (!text.startsWith("---")) {
		return { body: text, frontmatter: {}, hasFrontmatter: false, rawFrontmatterText: null };
	}
	const nl = text.indexOf("\n");
	if (nl === -1)
		return { body: text, frontmatter: {}, hasFrontmatter: false, rawFrontmatterText: null };
	// Find closing `---` on its own line.
	const lines = text.split("\n");
	if (lines[0].trim() !== "---") {
		return { body: text, frontmatter: {}, hasFrontmatter: false, rawFrontmatterText: null };
	}
	let closeIdx = -1;
	for (let i = 1; i < lines.length; i++) {
		if (lines[i].trim() === "---") {
			closeIdx = i;
			break;
		}
	}
	if (closeIdx === -1) {
		return { body: text, frontmatter: {}, hasFrontmatter: false, rawFrontmatterText: null };
	}
	const rawYaml = lines.slice(1, closeIdx).join("\n");
	let data: unknown = {};
	try {
		data = load(rawYaml) ?? {};
	} catch {
		data = {};
	}
	const frontmatter = (typeof data === "object" && data !== null ? data : {}) as Record<
		string,
		unknown
	>;
	const body = lines.slice(closeIdx + 1).join("\n");
	return { body, frontmatter, hasFrontmatter: true, rawFrontmatterText: rawYaml };
}

export function stringifyFileContent(
	frontmatter: Record<string, unknown>,
	body: string,
	hasFrontmatter = true,
): string {
	if (!hasFrontmatter && Object.keys(frontmatter).length === 0) return body;
	let y = dump(frontmatter ?? {}, { lineWidth: 120, noRefs: true, sortKeys: false });
	// Match repo style: empty (not `null`) for null values — `hero_tag:` vs `hero_tag: null`.
	y = y.replaceAll(/: null(\n|$)/gu, ":$1");
	// Preserve body verbatim. parseFileContent keeps a leading `\n` when the
	// file has a blank line after `---`, so `---\n` + body reconstructs it.
	return `---\n${y}---\n${body}`;
}

/** Serialize deterministically for diffing (LF normalized). */
export function normalizeText(t: string): string {
	return t.replaceAll("\r\n", "\n");
}
