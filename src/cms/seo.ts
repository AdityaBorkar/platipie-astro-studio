import { existsSync } from "node:fs";
import path from "node:path";

import { getAiConfig, getProjectRoot, isAiEnabled } from "./config.ts";
import { CmsError } from "./errors.ts";

export interface SeoCheck {
	id: string;
	label: string;
	status: "pass" | "warn" | "fail";
	detail?: string;
}
export interface SeoResult {
	checks: SeoCheck[];
	counts: { titleLen: number; descriptionLen: number; wordCount: number; keywordCount: number };
	score: number;
	readability: { flesch: number; grade: string };
	keywordCoverage: number;
	jsonLd: Record<string, unknown> | null;
	warnings: string[];
	aiEnabled: boolean;
}

function fleschReadingEase(text: string): number {
	const words = text.split(/\s+/u).filter(Boolean);
	const sentences = text.split(/[.!?]+/u).filter((s) => s.trim().length > 0);
	const syllables = words.reduce((acc, w) => acc + countSyllables(w), 0);
	if (words.length === 0 || sentences.length === 0) return 0;
	const score =
		206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syllables / words.length);
	return Math.max(0, Math.min(100, Math.round(score)));
}

function countSyllables(word: string): number {
	const w = word.toLowerCase().replaceAll(/[^a-z]/gu, "");
	if (w.length <= 3) return 1;
	const m = w.replace(/(?:[^aeiouy]e|ed|es)$/u, "").match(/[aeiouy]{1,2}/gu);
	return m ? m.length : 1;
}

function fleschGrade(score: number): string {
	if (score >= 90) return "Very easy";
	if (score >= 80) return "Easy";
	if (score >= 70) return "Fairly easy";
	if (score >= 60) return "Standard";
	if (score >= 50) return "Fairly difficult";
	if (score >= 30) return "Difficult";
	return "Very difficult";
}

function imageResolves(ref: string): boolean {
	// remote allowed as plain string (§10)
	if (/^https?:\/\//u.test(ref)) return true;
	const root = getProjectRoot();
	const cleaned = ref.replace(/^\/+/u, "");
	const base = path.basename(cleaned);
	const candidates = [
		path.join(root, cleaned),
		path.join(root, "assets", base),
		path.join(root, "public", base),
	];
	return candidates.some((c) => existsSync(c));
}

const KNOWN_SCHEMA_TYPES = [
	"BlogPosting",
	"Article",
	"HowTo",
	"WebPage",
	"WebPage/About",
	"WebPage/Contact",
	"WebPage/FAQ",
	"WebPage/Collection",
	"SoftwareApplication",
	"SoftwareSourceCode",
	"MobileApplication",
	"WebApplication",
	"Review",
	"Organization",
	"Person",
	"Product",
	"Breadcrumb",
	"Business",
	"Service",
];

export function knownSchemaTypes(): string[] {
	return KNOWN_SCHEMA_TYPES;
}

export function buildJsonLdPreview(
	fm: Record<string, unknown>,
	body: string,
	slug: string,
): Record<string, unknown> | null {
	const type = typeof fm.schemaType === "string" && fm.schemaType ? fm.schemaType : "WebPage";
	const title = (fm.metaTitle as string) ?? (fm.title as string) ?? slug;
	const description =
		(fm.metaDescription as string) ??
		(fm.excerpt as string) ??
		(fm.description as string) ??
		body.slice(0, 160);
	const base: Record<string, unknown> = {
		"@context": "https://schema.org",
		"@type": type.split("/")[0],
		description,
		headline: title,
		...(fm.author ? { author: { "@type": "Person", name: fm.author } } : {}),
		...(fm.publishDate || fm.date ? { datePublished: fm.publishDate ?? fm.date } : {}),
		...(fm.modifiedDate ? { dateModified: fm.modifiedDate } : {}),
		...(fm.keywords ? { keywords: fm.keywords } : {}),
	};
	if (fm.schemaFields && typeof fm.schemaFields === "object") {
		Object.assign(base, fm.schemaFields as Record<string, unknown>);
	}
	return base;
}

export function scoreEntry(fm: Record<string, unknown>, body: string, slug: string): SeoResult {
	const checks: SeoCheck[] = [];
	const push = (id: string, label: string, status: "pass" | "warn" | "fail", detail?: string) =>
		checks.push({ detail, id, label, status });

	const title = (fm.metaTitle as string) ?? (fm.title as string) ?? "";
	const desc = (fm.metaDescription as string) ?? (fm.excerpt as string) ?? "";
	const words = body.split(/\s+/u).filter(Boolean);

	// metaTitle
	if (!title) push("metaTitle", "metaTitle present", "fail", "Missing title");
	else if (title.length > 60)
		push("metaTitle", "metaTitle ≤ 60 chars", "warn", `${title.length} chars`);
	else push("metaTitle", "metaTitle ≤ 60 chars", "pass", `${title.length} chars`);

	// metaDescription 120–160
	if (!desc) push("metaDescription", "metaDescription 120–160", "warn", "Missing description");
	else if (desc.length < 120 || desc.length > 160)
		push("metaDescription", "metaDescription 120–160", "warn", `${desc.length} chars`);
	else push("metaDescription", "metaDescription 120–160", "pass", `${desc.length} chars`);

	// slug readability
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug))
		push("slug", "Slug readable", "fail", "Slug violates slug pattern");
	else if (slug.length > 60) push("slug", "Slug readable", "warn", "Long slug");
	else push("slug", "Slug readable", "pass", slug);

	// canonical
	const canon = fm.canonicalUrl as string | undefined;
	if (canon) {
		try {
			const u = new URL(canon, "https://example.com");
			if (!/^https?:/u.test(u.protocol) && !canon.startsWith("/")) throw new Error("bad");
			if (canon.startsWith("http")) {
				push("canonical", "Canonical valid", "pass", canon);
			} else {
				push("canonical", "Canonical valid", "warn", "Site-relative canonical; absolute preferred");
			}
		} catch {
			push("canonical", "Canonical valid", "fail", "Invalid canonicalUrl");
		}
	} else {
		push("canonical", "Canonical valid", "pass", "No canonical (uses default URL)");
	}

	// images
	const feat = (fm.featuredImage as string) ?? (fm.hero_image as string) ?? (fm.ogImage as string);
	if (!feat)
		push("featuredImage", "Featured/OG image", "warn", "Missing featuredImage/hero_image/ogImage");
	else if (imageResolves(feat)) push("featuredImage", "Featured/OG image", "pass", feat);
	else push("featuredImage", "Featured/OG image", "fail", `Missing file: ${feat}`);

	// keywords ≈ tags
	const tags = (fm.tags as string[]) ?? [];
	const keywords = (fm.keywords as string[]) ?? [];
	if (keywords.length === 0)
		push("keywords", "Keywords set", "warn", "Missing keywords (defaults to tags)");
	else {
		const overlap = keywords.filter((k) =>
			tags.map((t) => t.toLowerCase()).includes(k.toLowerCase()),
		).length;
		if (overlap === 0 && tags.length > 0)
			push("keywords", "Keywords ≈ tags", "warn", "No overlap with tags");
		else push("keywords", "Keywords ≈ tags", "pass", `${overlap}/${keywords.length} overlap`);
	}

	// noindex vs sitemap
	if (fm.noindex === true)
		push("noindex", "noindex vs sitemap", "warn", "noindex set — conflicts with sitemap inclusion");
	else push("noindex", "noindex vs sitemap", "pass", "Indexable");

	// excerpt/schema
	if (!fm.excerpt && !(fm as Record<string, unknown>).description)
		push("excerpt", "Excerpt present", "warn", "Missing excerpt");
	else push("excerpt", "Excerpt present", "pass");
	if (fm.schemaType) {
		push("schemaType", "schemaType selected", "pass", String(fm.schemaType));
	} else {
		push("schemaType", "schemaType selected", "warn", "Missing schemaType");
	}

	// score: 100 - warns*8 - fails*20, clamped.
	const warns = checks.filter((c) => c.status === "warn").length;
	const fails = checks.filter((c) => c.status === "fail").length;
	const score = Math.max(0, Math.min(100, 100 - warns * 8 - fails * 20));

	const flesch = fleschReadingEase(`${title}\n${desc}\n${body}`);
	const allText = `${title} ${desc} ${body}`.toLowerCase();
	const kws = keywords.length > 0 ? keywords : tags;
	const hits = kws.filter(
		(k) => typeof k === "string" && k && allText.includes(k.toLowerCase()),
	).length;
	const keywordCoverage = kws.length === 0 ? 0 : Math.round((hits / kws.length) * 100);

	const warnings = checks
		.filter((c) => c.status !== "pass")
		.map((c) => `${c.label}: ${c.detail ?? c.status}`);

	return {
		aiEnabled: isAiEnabled(),
		checks,
		counts: {
			descriptionLen: desc.length,
			keywordCount: kws.length,
			titleLen: title.length,
			wordCount: words.length,
		},
		jsonLd: buildJsonLdPreview(fm, body, slug),
		keywordCoverage,
		readability: { flesch, grade: fleschGrade(flesch) },
		score,
		warnings,
	};
}

// ---- BYOK AI (OpenAI-compatible, server-only) ----
// Rate limiting lives in the oRPC `aiRateLimitMiddleware` (transport edge),
// so direct lib callers stay unlimited but every HTTP call is capped.

export async function aiSuggest(
	action: "excerpt" | "keywords" | "titles",
	fm: Record<string, unknown>,
	body: string,
	_ip?: string,
): Promise<{ action: string; model: string; suggestions: string[] }> {
	const cfg = getAiConfig();
	if (!cfg) {
		throw new CmsError(
			"AI_DISABLED",
			"AI suggestions are disabled — set AI_BASE_URL and AI_API_KEY",
			{ status: 400 },
		);
	}
	const title = (fm.title as string) ?? "";
	const prompt =
		action === "titles"
			? `Suggest 5 SEO meta titles (<=60 chars) for a post titled "${title}". Body excerpt: ${body.slice(0, 1500)}. Return JSON array of strings.`
			: action === "excerpt"
				? `Write one SEO meta excerpt (120-160 chars) for "${title}". Body: ${body.slice(0, 2000)}. Return JSON array with a single string.`
				: `Extract 5-8 SEO keywords from this post titled "${title}". Body: ${body.slice(0, 2000)}. Return JSON array of strings.`;
	const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
		body: JSON.stringify({
			messages: [
				{
					content: "You are an SEO assistant. Respond with a JSON array of strings only.",
					role: "system",
				},
				{ content: prompt, role: "user" },
			],
			model: cfg.model,
			temperature: 0.7,
		}),
		headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
		method: "POST",
	});
	if (!res.ok) {
		throw new CmsError("IO", `AI provider error: ${res.status}`, { status: 502 });
	}
	const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
	const content = data.choices?.[0]?.message?.content ?? "[]";
	let suggestions: string[] = [];
	try {
		const parsed = JSON.parse(content);
		if (Array.isArray(parsed)) suggestions = parsed.map(String).slice(0, 8);
		else if (typeof parsed === "object" && parsed !== null) {
			const vals = Object.values(parsed as Record<string, unknown>);
			if (Array.isArray(vals[0])) suggestions = (vals[0] as unknown[]).map(String).slice(0, 8);
		}
	} catch {
		suggestions = content
			.split("\n")
			.map((s) => s.replace(/^[-*\d.]+\s*/u, "").trim())
			.filter(Boolean)
			.slice(0, 8);
	}
	return { action, model: cfg.model, suggestions };
}
