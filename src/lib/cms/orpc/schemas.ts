// Zod input schemas for every CMS oRPC procedure.
// These replace the ad-hoc `readJson<T>` casts + manual `if (!x) 400` guards
// in the old file routes; the domain services remain the source of truth and
// still enforce their own (richer) invariants.
import { z } from "zod";

import { COLLECTION_IDS, SLUG_RE } from "#cms/schemas.ts";
import { SYNC_SCOPES } from "#cms/sync/index.ts";

export const slugSchema = z
	.string()
	.min(1, "slug required")
	.max(120)
	.regex(SLUG_RE, "Slug must match ^[a-z0-9]+(?:-[a-z0-9]+)*$");

export const collectionIdSchema = z.enum(COLLECTION_IDS);

/** Repo-relative path inside the PROJECT_PATH jail (traversal rejected). */
export const repoPathSchema = z
	.string()
	.min(1, "path required")
	.max(500)
	.refine((p) => !p.split("/").includes(".."), "Path traversal rejected");

export const syncScopeSchema = z.enum(SYNC_SCOPES);

export const frontmatterSchema = z.record(z.string(), z.unknown());

const qSchema = z.string().max(200).optional();

export const entriesListSchema = z.object({
	collection: collectionIdSchema,
	q: qSchema,
});

export const entriesCreateSchema = z.object({
	body: z.string().max(1_048_576).optional(),
	collection: z.enum(["blog", "projects"]),
	ext: z.enum([".md", ".mdx"]).optional(),
	fromTemplate: z.boolean().optional(),
	frontmatter: frontmatterSchema.optional(),
	slug: slugSchema,
});

export const entryGetSchema = z.object({
	path: repoPathSchema,
});

export const entryRefSchema = z.object({
	collection: collectionIdSchema,
	path: repoPathSchema,
});

export const entryPayloadSchema = z.object({
	body: z.string(),
	frontmatter: frontmatterSchema,
	mtime: z.number(),
});

export const entrySaveSchema = z.object({
	force: z.boolean().optional(),
	payload: entryPayloadSchema,
	ref: entryRefSchema,
});

export const entryDeleteSchema = z.object({
	path: repoPathSchema,
	rowId: z.string().min(1).optional(),
});

export const pageGetSchema = z.object({
	path: repoPathSchema,
});

export const pageSeoInputSchema = z.object({
	description: z.string().nullable().optional(),
	keywords: z.array(z.string()).optional(),
	title: z.string().nullable().optional(),
});

export const pageSaveSchema = z.object({
	force: z.boolean().optional(),
	mtime: z.number(),
	path: repoPathSchema,
	schema: z.array(z.string()).optional(),
	seo: pageSeoInputSchema.optional(),
});

export const projectsListSchema = z.object({
	q: qSchema,
});

export const projectsSelectSchema = z.object({
	root: z.string().min(1, "root required").max(500),
});

export const browseSchema = z.object({
	path: z.string().min(1).max(500).optional(),
});

export const settingsSaveSchema = z
	.object({
		force: z.boolean().optional(),
		mtime: z.number(),
		raw: z.string().optional(),
		values: z.record(z.string(), z.unknown()).optional(),
	})
	.refine((v) => v.raw !== undefined || v.values !== undefined, {
		message: "raw or values required",
	});

export const syncRunSchema = z.object({
	scope: syncScopeSchema.optional(),
});

export const inventoryGetSchema = z.object({
	scope: z.string().min(1).max(200).optional(),
});

export const diffGetSchema = z.object({
	path: repoPathSchema,
	rev: z.string().min(1).max(60).optional(),
});

export const duplicateSchema = z.object({
	path: repoPathSchema,
});

export const renameSchema = z.object({
	newSlug: slugSchema,
	path: repoPathSchema,
});

export const restoreRunSchema = z.object({
	trashPath: z
		.string()
		.min(1, "trashPath required")
		.max(500)
		.refine((p) => p.startsWith(".cms-trash/") && !p.split("/").includes(".."), {
			message: "Not a trash path",
		}),
});

export const seoGetSchema = z.object({
	path: repoPathSchema,
});

export const aiSuggestSchema = z.object({
	action: z.enum(["excerpt", "keywords", "titles"]),
	body: z.string().max(50_000).optional(),
	frontmatter: frontmatterSchema.optional(),
});
