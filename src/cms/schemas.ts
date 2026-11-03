import { z } from "zod";

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
export const FILTER_CATEGORIES = [
	"Artificial Intelligence",
	"Full Stack Dev.",
	"Backend Dev.",
	"Frontend Dev.",
	"Plugins & Extensions",
	"Dev Tooling",
	"Open Source",
] as const;

export const wpAdditions = {
	author: z.string().optional(),
	canonicalUrl: z.string().optional(),
	categories: z.array(z.string()).optional(),
	date: z.string().optional(),
	excerpt: z.string().optional(),
	featuredImage: z.string().optional(),
	keywords: z.array(z.string()).optional(),
	metaDescription: z.string().optional(),
	metaTitle: z.string().optional(),
	modifiedDate: z.string().optional(),
	nofollow: z.boolean().optional(),
	noindex: z.boolean().optional(),
	ogImage: z.string().optional(),
	ogType: z.string().optional(),
	publishDate: z.string().optional(),
	schemaFields: z.record(z.string(), z.unknown()).optional(),
	schemaType: z.string().optional(),
	status: z.enum(["draft", "published", "scheduled"]).optional(),
	twitterCard: z.string().optional(),
};

export const projectsSchema = z
	.object({
		benefits: z.array(z.object({ label: z.string(), metric: z.coerce.string() })),
		description: z.string(),
		filter_category: z.array(z.enum(FILTER_CATEGORIES as unknown as [string, ...string[]])),
		hero_image: z.string(),
		hero_tag: z.enum(["featured", "open-source", "ongoing"]).nullable(),
		index: z.number().optional(),
		links: z.object({
			github: z.string().optional(),
			preview: z.string().optional(),
			video: z.string().optional(),
		}),
		tags: z.array(z.string()),
		timeline: z.string(),
		title: z.string(),
		year: z.number(),
		...wpAdditions,
		categories: z.array(z.string()).optional(),
	})
	.passthrough();

export const blogSchema = z
	.object({
		tags: z.array(z.string()).optional(),
		title: z.string(),
		...wpAdditions,
	})
	.passthrough();

export const clientsSchema = z
	.object({ className: z.string().optional(), id: z.string(), logo: z.string() })
	.passthrough();

export const mockupsSchema = z.object({ id: z.string(), img: z.string() }).passthrough();

export const testimonialsSchema = z
	.object({
		id: z.string(),
		proof: z.object({ name: z.string(), url: z.string() }).optional(),
		role: z.string(),
		text: z.string(),
	})
	.passthrough();

export type CollectionId =
	| "projects"
	| "blog"
	| "clients"
	| "mockups"
	| "testimonials"
	| "legal"
	| "settings";

export const COLLECTION_IDS: CollectionId[] = [
	"projects",
	"blog",
	"clients",
	"mockups",
	"testimonials",
	"legal",
	"settings",
];

// Single source for collections that support entry creation (md file-per-entry).
export const CREATABLE_COLLECTION_IDS = ["blog", "projects"] as const;

export type CreatableCollectionId = (typeof CREATABLE_COLLECTION_IDS)[number];

export function validateSlug(slug: string): string | null {
	if (!SLUG_RE.test(slug)) return "Slug must match ^[a-z0-9]+(?:-[a-z0-9]+)*$";
	return null;
}

export function validateUrlField(value: string): string | null {
	if (!value) return null;
	if (
		value.startsWith("/") ||
		value.startsWith("./") ||
		value.startsWith("../") ||
		value.startsWith("assets/") ||
		value.startsWith("images/")
	)
		return null;
	try {
		const u = new URL(value);
		if (u.protocol !== "http:" && u.protocol !== "https:")
			return "URL must be http(s) or site-relative";
		return null;
	} catch {
		return "Invalid URL (must be absolute http(s) or site-relative)";
	}
}

export function validateIsoDate(value: string): string | null {
	if (!value) return null;
	const t = Date.parse(value);
	if (Number.isNaN(t)) return "Invalid ISO-8601 date";
	return null;
}

export function hardErrorsForFrontmatter(
	collection: "projects" | "blog",
	fm: Record<string, unknown>,
): Record<string, string> {
	const errs: Record<string, string> = {};
	const schema = collection === "projects" ? projectsSchema : blogSchema;
	const res = schema.safeParse(fm);
	if (!res.success) {
		for (const issue of res.error.issues) {
			const key = issue.path.join(".") || "_root";
			if (!errs[key]) errs[key] = issue.message;
		}
	}
	// Filename-is-slug: slug is virtual, validated only when present.
	if (typeof fm.slug === "string" && fm.slug) {
		const e = validateSlug(fm.slug);
		if (e) errs.slug = e;
	}
	for (const k of ["canonicalUrl", "featuredImage", "ogImage"] as const) {
		const v = fm[k];
		if (typeof v === "string" && v) {
			// Site-relative image paths are allowed; only flag truly malformed absolute URLs.
			if (v.includes("://")) {
				const e = validateUrlField(v);
				if (e) errs[k] = e;
			} else if (/\s/u.test(v)) {
				errs[k] = "Invalid path (contains whitespace)";
			}
		}
	}
	for (const k of ["publishDate", "modifiedDate", "date"] as const) {
		const v = fm[k];
		if (typeof v === "string" && v) {
			const e = validateIsoDate(v);
			if (e) errs[k] = e;
		}
	}
	return errs;
}

/** Soft warnings (never block save). */
export function warningsForFrontmatter(
	collection: string,
	fm: Record<string, unknown>,
	body: string,
	opts?: { slug?: string },
): string[] {
	const w: string[] = [];
	if (fm.status === "scheduled") {
		const pd =
			typeof fm.publishDate === "string"
				? fm.publishDate
				: typeof fm.date === "string"
					? fm.date
					: "";
		const t = pd ? Date.parse(pd) : NaN;
		if (!pd || Number.isNaN(t))
			w.push("scheduled status needs a future publishDate (warning only)");
		else if (t <= Date.now()) w.push("scheduled status but publishDate is not in the future");
	}
	if (fm.noindex === true) w.push("noindex is set — entry will be excluded from sitemap");
	if (!fm.excerpt) w.push("Missing excerpt — recommended for listings/SEO");
	if (!fm.featuredImage && !fm.hero_image && (collection === "blog" || collection === "projects"))
		w.push("Missing featuredImage/hero_image");
	if (!fm.schemaType) w.push("Missing schemaType — JSON-LD will fall back to generic WebPage");
	if (
		fm.canonicalUrl &&
		typeof fm.canonicalUrl === "string" &&
		!fm.canonicalUrl.startsWith("http")
	) {
		w.push("canonicalUrl is site-relative; absolute URL preferred");
	}
	const metaTitle =
		typeof fm.metaTitle === "string" ? fm.metaTitle : typeof fm.title === "string" ? fm.title : "";
	if (metaTitle && metaTitle.length > 60)
		w.push(`metaTitle is ${metaTitle.length} chars (warn >60)`);
	const md =
		typeof fm.metaDescription === "string"
			? fm.metaDescription
			: typeof fm.excerpt === "string"
				? fm.excerpt
				: "";
	if (md && (md.length < 120 || md.length > 160))
		w.push(`metaDescription is ${md.length} chars (ideal 120–160)`);
	void body;
	void opts;
	return w;
}
