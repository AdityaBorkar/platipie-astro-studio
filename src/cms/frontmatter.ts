import { dump, load } from "js-yaml";

export interface ParsedFile {
	frontmatter: Record<string, unknown>;
	body: string;
	hasFrontmatter: boolean;
	rawFrontmatterText: string | null;
	/**
	 * True when the YAML block failed to parse. frontmatter is {} in that
	 * case — callers must NOT treat it as real data (save paths throw 422).
	 */
	corrupt: boolean;
	parseError: string | null;
}

export interface FrontmatterBounds {
	end: number;
	start: number;
}

// Byte offsets of the frontmatter body (between the `---` fences), or null
// when the file has no frontmatter block. Single source for bounds so the
// page editor and the generic parser cannot drift apart.
export function frontmatterBounds(text: string): FrontmatterBounds | null {
	if (!text.startsWith("---")) return null;
	const firstLineEnd = text.indexOf("\n");
	if (firstLineEnd === -1) return null;
	const start = firstLineEnd + 1;
	const rest = text.slice(start);
	const closeOffset = rest.search(/^---[ \t]*\r?$/mu);
	if (closeOffset === -1) return null;
	return { end: start + closeOffset, start };
}

export function parseFileContent(text: string): ParsedFile {
	if (!text.startsWith("---")) {
		return {
			body: text,
			corrupt: false,
			frontmatter: {},
			hasFrontmatter: false,
			parseError: null,
			rawFrontmatterText: null,
		};
	}
	const nl = text.indexOf("\n");
	if (nl === -1)
		return {
			body: text,
			corrupt: false,
			frontmatter: {},
			hasFrontmatter: false,
			parseError: null,
			rawFrontmatterText: null,
		};
	const lines = text.split("\n");
	if (lines[0].trim() !== "---") {
		return {
			body: text,
			corrupt: false,
			frontmatter: {},
			hasFrontmatter: false,
			parseError: null,
			rawFrontmatterText: null,
		};
	}
	let closeIdx = -1;
	for (let i = 1; i < lines.length; i++) {
		if (lines[i].trim() === "---") {
			closeIdx = i;
			break;
		}
	}
	if (closeIdx === -1) {
		return {
			body: text,
			corrupt: false,
			frontmatter: {},
			hasFrontmatter: false,
			parseError: null,
			rawFrontmatterText: null,
		};
	}
	const rawYaml = lines.slice(1, closeIdx).join("\n");
	let data: unknown = {};
	let parseError: string | null = null;
	try {
		data = load(rawYaml) ?? {};
	} catch (e) {
		// Never silently degrade to {}: a corrupt block must block saves so
		// an unrelated edit cannot wipe the real frontmatter.
		data = {};
		parseError = e instanceof Error ? e.message : String(e);
	}
	const frontmatter = (typeof data === "object" && data !== null ? data : {}) as Record<
		string,
		unknown
	>;
	const body = lines.slice(closeIdx + 1).join("\n");
	return {
		body,
		corrupt: parseError !== null,
		frontmatter,
		hasFrontmatter: true,
		parseError,
		rawFrontmatterText: rawYaml,
	};
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
