// §11 — save pipeline + file ops: validate → backup → atomic → diff → mtime.
// Concurrency via mtime/etag; 409 on stale-write unless force.
import { promises as fs } from "node:fs";
import path from "node:path";

import { createTwoFilesPatch } from "diff";

import { getProjectRoot, getTrashTtlDays, resolveRepoPath, LARGE_FILE_BYTES } from "./config.ts";
import { CmsError } from "./errors.ts";
import { normalizeText, parseFileContent, stringifyFileContent } from "./frontmatter.ts";
import {
	hardErrorsForFrontmatter,
	warningsForFrontmatter,
	clientsSchema,
	mockupsSchema,
	testimonialsSchema,
	type CollectionId,
} from "./schemas.ts";

export interface EntryRef {
	collection: CollectionId;
	path: string;
}
export interface EntryPayload {
	frontmatter: Record<string, unknown>;
	body: string;
	mtime: number;
}
export interface SaveResult {
	ok: true;
	diff: string;
	warnings: string[];
	mtime: number;
	path: string;
}

export function collectionForPath(repoRel: string): CollectionId {
	if (repoRel.startsWith("cms/projects/")) return "projects";
	if (repoRel.startsWith("cms/blog/")) return "blog";
	if (repoRel === "cms/clients.json") return "clients";
	if (repoRel === "cms/mockups.json") return "mockups";
	if (repoRel === "cms/testimonials.json") return "testimonials";
	if (repoRel.startsWith("src/pages/legal/")) return "legal";
	if (repoRel === "cms/constants.ts") return "settings";
	throw new CmsError("NOT_FOUND", `Unknown collection for path: ${repoRel}`, { status: 404 });
}

export interface LoadedEntry {
	ref: EntryRef;
	frontmatter: Record<string, unknown>;
	body: string;
	mtime: number;
	hasFrontmatter: boolean;
	readOnly: boolean;
	readOnlyReason?: string;
}

export async function loadEntry(repoRel: string): Promise<LoadedEntry> {
	const abs = resolveRepoPath(repoRel);
	let st;
	try {
		st = await fs.stat(abs);
	} catch {
		throw new CmsError("NOT_FOUND", `Not found: ${repoRel}`, { status: 404 });
	}
	const collection = collectionForPath(repoRel);
	if (repoRel.endsWith(".json")) {
		const text = await fs.readFile(abs, "utf8");
		return {
			body: text,
			frontmatter: {},
			hasFrontmatter: false,
			mtime: st.mtimeMs,
			readOnly: st.size > LARGE_FILE_BYTES,
			readOnlyReason: st.size > LARGE_FILE_BYTES ? "File >1 MB — read-only" : undefined,
			ref: { collection, path: repoRel },
		};
	}
	if (repoRel === "cms/constants.ts") {
		const text = await fs.readFile(abs, "utf8");
		return {
			body: text,
			frontmatter: {},
			hasFrontmatter: false,
			mtime: st.mtimeMs,
			readOnly: st.size > LARGE_FILE_BYTES,
			readOnlyReason: st.size > LARGE_FILE_BYTES ? "File >1 MB — read-only" : undefined,
			ref: { collection, path: repoRel },
		};
	}
	const text = await fs.readFile(abs, "utf8");
	const parsed = parseFileContent(text);
	return {
		body: parsed.body,
		frontmatter: parsed.frontmatter,
		hasFrontmatter: parsed.hasFrontmatter,
		mtime: st.mtimeMs,
		readOnly: Buffer.byteLength(text, "utf8") > LARGE_FILE_BYTES,
		readOnlyReason:
			Buffer.byteLength(text, "utf8") > LARGE_FILE_BYTES
				? "File >1 MB — opens read-only (§13)"
				: undefined,
		ref: { collection, path: repoRel },
	};
}

export async function backupFile(abs: string): Promise<void> {
	try {
		const text = await fs.readFile(abs, "utf8").catch(() => null);
		if (text === null) return;
		// Rotating .bak (keep .bak + .bak.1..3).
		for (let i = 3; i >= 1; i--) {
			const from = i === 1 ? `${abs}.bak` : `${abs}.bak.${i - 1}`;
			const to = `${abs}.bak.${i}`;
			try {
				await fs.rename(from, to);
			} catch {
				/* ignore */
			}
		}
		try {
			await fs.copyFile(abs, `${abs}.bak`);
		} catch {
			/* ignore */
		}
	} catch {
		/* best-effort */
	}
}

export async function atomicWrite(abs: string, content: string): Promise<void> {
	await fs.mkdir(path.dirname(abs), { recursive: true });
	const tmp = `${abs}.tmp-${process.pid}-${Date.now()}`;
	await fs.writeFile(tmp, content, "utf8");
	await fs.rename(tmp, abs);
}

export function unifiedDiff(oldText: string, newText: string, filePath: string): string {
	return createTwoFilesPatch(filePath, filePath, normalizeText(oldText), normalizeText(newText));
}

function mtimeMismatch(stored: number, provided: number): boolean {
	// 1s tolerance for FS granularity, but strict enough to catch stale writes.
	return Math.abs(stored - provided) > 1000 && stored !== provided;
}

function stableStringify(v: unknown): string {
	if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "";
	if (Array.isArray(v)) return `[${v.map((item) => stableStringify(item)).join(",")}]`;
	const obj = v as Record<string, unknown>;
	return `{${Object.keys(obj)
		.toSorted()
		.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
		.join(",")}}`;
}

function stableEqual(a: unknown, b: unknown): boolean {
	return stableStringify(a) === stableStringify(b);
}

function touchModifiedDate(
	stored: Record<string, unknown>,
	incoming: Record<string, unknown>,
): Record<string, unknown> {
	const next = { ...incoming };
	const storedMd = stored.modifiedDate;
	const incomingMd = incoming.modifiedDate;
	// Editable override: if user changed it, keep theirs; else touch to now.
	if (incomingMd === storedMd || incomingMd === undefined || incomingMd === "") {
		next.modifiedDate = new Date().toISOString();
	}
	return next;
}

export async function saveEntry(
	ref: EntryRef,
	payload: EntryPayload,
	opts?: { force?: boolean },
): Promise<SaveResult> {
	const abs = resolveRepoPath(ref.path);
	let oldText = "";
	let oldMtime = 0;
	let oldParsed: ReturnType<typeof parseFileContent> | null = null;
	try {
		oldText = await fs.readFile(abs, "utf8");
		const st = await fs.stat(abs);
		oldMtime = st.mtimeMs;
		if (!opts?.force && mtimeMismatch(oldMtime, payload.mtime)) {
			const attempted = stringifyFileContent(payload.frontmatter, payload.body, true);
			throw new CmsError("CONFLICT", "Stale write: file changed since you loaded it", {
				diff: unifiedDiff(oldText, attempted, ref.path),
				status: 409,
			});
		}
		oldParsed = parseFileContent(oldText);
	} catch (e) {
		if (e instanceof CmsError && e.code === "CONFLICT") throw e;
		throw new CmsError("NOT_FOUND", `Not found: ${ref.path}`, { status: 404 });
	}

	const collection = collectionForPath(ref.path);
	// JSON collections: body is raw JSON text; validate parses + row schemas.
	if (ref.path.endsWith(".json")) {
		let arr: unknown;
		try {
			arr = JSON.parse(payload.body);
		} catch {
			throw new CmsError("VALIDATION", "Invalid JSON", {
				fields: { body: "Invalid JSON" },
				status: 400,
			});
		}
		if (!Array.isArray(arr))
			throw new CmsError("VALIDATION", "JSON must be an array", { status: 400 });
		// Row-level Zod (passthrough) — hard errors block.
		const schema =
			collection === "clients"
				? clientsSchema
				: collection === "mockups"
					? mockupsSchema
					: testimonialsSchema;
		const fields: Record<string, string> = {};
		(arr as unknown[]).forEach((row, i) => {
			const r = schema.safeParse(row);
			if (!r.success) {
				for (const issue of r.error.issues)
					fields[`[${i}].${issue.path.join(".")}`] = issue.message;
			}
		});
		if (Object.keys(fields).length > 0)
			throw new CmsError("VALIDATION", "Validation failed", { fields, status: 400 });
		if (!opts?.force && Buffer.byteLength(oldText, "utf8") > LARGE_FILE_BYTES) {
			throw new CmsError("VALIDATION", "File >1 MB — refusing write without force", {
				status: 400,
			});
		}
		if (normalizeText(oldText) === normalizeText(payload.body)) {
			return { diff: "", mtime: oldMtime, ok: true, path: ref.path, warnings: [] };
		}
		await backupFile(abs);
		await atomicWrite(abs, payload.body.endsWith("\n") ? payload.body : payload.body + "\n");
		const st2 = await fs.stat(abs);
		return {
			diff: unifiedDiff(oldText, payload.body, ref.path),
			mtime: st2.mtimeMs,
			ok: true,
			path: ref.path,
			warnings: [],
		};
	}
	// Validate md frontmatter (projects/blog). Legal/settings skip Zod here.
	let warnings: string[] = [];
	if (collection === "projects" || collection === "blog") {
		const errs = hardErrorsForFrontmatter(collection, payload.frontmatter);
		if (Object.keys(errs).length > 0) {
			throw new CmsError("VALIDATION", "Validation failed", { fields: errs, status: 400 });
		}
		warnings = warningsForFrontmatter(collection, payload.frontmatter, payload.body);
		// Filename-is-slug: `slug` in frontmatter is virtual; strip before persist
		// unless caller explicitly wants it stored? Spec: slug derived from filename.
		// We persist all WP fields but drop virtual `slug` to avoid duplication.
	}

	// modifiedDate auto-touch for md collections — only when content actually changed.
	// Untouched save (toggle without edits) is a byte-for-byte no-op, no mtime bump.
	let fmToWrite = payload.frontmatter;
	if (collection === "projects" || collection === "blog") {
		const {
			slug: _ps,
			modifiedDate: _pmd,
			...payloadCore
		} = payload.frontmatter as Record<string, unknown> & { slug?: unknown; modifiedDate?: unknown };
		const {
			slug: _os,
			modifiedDate: _omd,
			...oldCore
		} = (oldParsed?.frontmatter ?? {}) as Record<string, unknown> & {
			slug?: unknown;
			modifiedDate?: unknown;
		};
		void _ps;
		void _pmd;
		void _os;
		void _omd;
		const coreEqual = stableEqual(oldCore, payloadCore);
		const bodyEqual = normalizeText(oldParsed?.body ?? "") === normalizeText(payload.body);
		if (coreEqual && bodyEqual) {
			return {
				diff: "",
				mtime: oldMtime,
				ok: true,
				path: ref.path,
				warnings: warningsForFrontmatter(collection, payload.frontmatter, payload.body),
			};
		}
		fmToWrite = touchModifiedDate(oldParsed?.frontmatter ?? {}, payload.frontmatter);
		const { slug: _s, ...rest } = fmToWrite as Record<string, unknown> & { slug?: unknown };
		// Recompute warnings with touched date (scheduled check).
		warnings = warningsForFrontmatter(collection, fmToWrite, payload.body);
		fmToWrite = rest;
		void _s;
	}

	// Byte-for-byte no-op: untouched → no write, no mtime change (legal imports safe).
	const hasFm = oldParsed?.hasFrontmatter ?? true;
	const newText =
		collection === "legal" && !hasFm && Object.keys(fmToWrite).length === 0
			? payload.body
			: stringifyFileContent(fmToWrite, payload.body, hasFm);

	// Handle slug rename (filename-is-slug): if payload.frontmatter.slug differs
	// from filename stem, the caller should use POST /rename; here we just persist
	// content at the current path. Rename is a separate op (see rename.ts section below).
	if (normalizeText(oldText) === normalizeText(newText)) {
		return { diff: "", mtime: oldMtime, ok: true, path: ref.path, warnings };
	}

	// Large-file guard is read-only in UI; server still enforces explicit force.
	if (Buffer.byteLength(oldText, "utf8") > LARGE_FILE_BYTES && !opts?.force) {
		throw new CmsError("VALIDATION", "File >1 MB — refusing write without force", { status: 400 });
	}

	await backupFile(abs);
	await atomicWrite(abs, newText);
	const st2 = await fs.stat(abs);
	return {
		diff: unifiedDiff(oldText, newText, ref.path),
		mtime: st2.mtimeMs,
		ok: true,
		path: ref.path,
		warnings,
	};
}

// ---- create / duplicate / rename / soft-delete / restore / diff ----

export function slugToFilename(slug: string, ext = ".md"): string {
	return `${slug}${ext}`;
}

export function validateNewSlug(slug: string): void {
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug)) {
		throw new CmsError("VALIDATION", "Slug must match ^[a-z0-9]+(?:-[a-z0-9]+)*$", {
			fields: { slug: "Invalid slug" },
			status: 400,
		});
	}
}

export async function createEntry(
	collection: Extract<CollectionId, "projects" | "blog">,
	slug: string,
	opts?: {
		fromTemplate?: boolean;
		frontmatter?: Record<string, unknown>;
		body?: string;
		ext?: ".md" | ".mdx";
	},
): Promise<SaveResult> {
	validateNewSlug(slug);
	const ext = opts?.ext ?? ".md";
	if (ext === ".mdx") {
		// §7.4 warning is surfaced by caller; creation allowed everywhere.
	}
	const dirRel = collection === "projects" ? "cms/projects" : "cms/blog";
	const fileRel = `${dirRel}/${slugToFilename(slug, ext)}`;
	const abs = resolveRepoPath(fileRel);
	try {
		await fs.stat(abs);
		throw new CmsError("VALIDATION", `Already exists: ${fileRel}`, {
			fields: { slug: "Collision — choose another slug" },
			status: 400,
		});
	} catch (e) {
		if (e instanceof CmsError) throw e;
		// ENOENT → free to create.
	}
	let frontmatter: Record<string, unknown> = { status: "draft", title: slug };
	let body = `\n# ${slug}\n`;
	if (opts?.fromTemplate && collection === "projects") {
		try {
			const tpl =
				(await fs
					.readFile(resolveRepoPath("cms/projects/-template.md."), "utf8")
					.catch(() => null)) ??
				(await fs.readFile(resolveRepoPath("cms/projects/-template.md"), "utf8").catch(() => null));
			if (tpl) {
				const p = parseFileContent(tpl);
				frontmatter = { ...p.frontmatter, status: "draft", title: slug };
				body = p.body;
			}
		} catch {
			/* fallback to blank */
		}
	}
	if (opts?.frontmatter) frontmatter = { ...frontmatter, ...opts.frontmatter };
	if (opts?.body !== undefined) body = opts.body;
	if (collection === "projects" || collection === "blog") {
		const errs = hardErrorsForFrontmatter(collection, {
			...frontmatter,
			title: frontmatter.title ?? slug,
		});
		if (Object.keys(errs).length > 0)
			throw new CmsError("VALIDATION", "Validation failed", { fields: errs, status: 400 });
	}
	const withTouched = { ...frontmatter, modifiedDate: new Date().toISOString() };
	const { slug: _s, ...toWrite } = withTouched as Record<string, unknown> & { slug?: unknown };
	void _s;
	const text = stringifyFileContent(toWrite, body, true);
	await atomicWrite(abs, text);
	const st = await fs.stat(abs);
	const warnings = warningsForFrontmatter(collection, withTouched, body);
	if (ext === ".mdx")
		warnings.unshift(
			"MDX file created — ensure the loader glob + Astro route accept *.mdx (offer to widen to **/*.{md,mdx}).",
		);
	return {
		diff: unifiedDiff("", text, fileRel),
		mtime: st.mtimeMs,
		ok: true,
		path: fileRel,
		warnings,
	};
}

export async function duplicateEntry(repoRel: string): Promise<SaveResult> {
	const abs = resolveRepoPath(repoRel);
	const parsed = path.parse(repoRel);
	const copyRel = `${parsed.dir}/${parsed.name}-copy${parsed.ext}`;
	const copyAbs = resolveRepoPath(copyRel);
	try {
		await fs.stat(copyAbs);
		throw new CmsError("VALIDATION", `Copy target exists: ${copyRel}`, { status: 400 });
	} catch (e) {
		if (e instanceof CmsError) throw e;
	}
	const text = await fs.readFile(abs, "utf8").catch(() => {
		throw new CmsError("NOT_FOUND", `Not found: ${repoRel}`, { status: 404 });
	});
	await atomicWrite(copyAbs, text);
	const st = await fs.stat(copyAbs);
	return {
		diff: unifiedDiff("", text, copyRel),
		mtime: st.mtimeMs,
		ok: true,
		path: copyRel,
		warnings: [],
	};
}

export async function renameEntry(
	oldRel: string,
	newSlug: string,
): Promise<{ ok: true; path: string; mtime: number; warnings: string[] }> {
	validateNewSlug(newSlug);
	const parsed = path.parse(oldRel);
	const dir = parsed.dir;
	if (!dir.startsWith("cms/projects") && !dir.startsWith("cms/blog")) {
		throw new CmsError("VALIDATION", "Rename only supported for projects/blog files", {
			status: 400,
		});
	}
	const newRel = `${dir}/${newSlug}${parsed.ext}`;
	const oldAbs = resolveRepoPath(oldRel);
	const newAbs = resolveRepoPath(newRel);
	try {
		await fs.stat(newAbs);
		throw new CmsError("VALIDATION", `Collision: ${newRel} exists`, {
			fields: { slug: "Collision — choose another slug" },
			status: 400,
		});
	} catch (e) {
		if (e instanceof CmsError) throw e;
	}
	await fs.stat(oldAbs).catch(() => {
		throw new CmsError("NOT_FOUND", `Not found: ${oldRel}`, { status: 404 });
	});
	await backupFile(oldAbs);
	await fs.rename(oldAbs, newAbs);
	const st = await fs.stat(newAbs);
	return {
		mtime: st.mtimeMs,
		ok: true,
		path: newRel,
		warnings: ["Links to the old slug may now be stale — check internal references."],
	};
}

function trashRoot(): string {
	return path.join(getProjectRoot(), ".cms-trash");
}

export async function softDelete(
	repoRel: string,
	rowId?: string,
): Promise<{ ok: true; trashPath: string }> {
	const ttlNote = getTrashTtlDays();
	void ttlNote;
	const ts = new Date().toISOString().replaceAll(/[:.]/gu, "-");
	if (rowId && repoRel.endsWith(".json")) {
		// Row-level delete with trash envelope.
		const abs = resolveRepoPath(repoRel);
		const text = await fs.readFile(abs, "utf8").catch(() => {
			throw new CmsError("NOT_FOUND", `Not found: ${repoRel}`, { status: 404 });
		});
		const arr = JSON.parse(text);
		if (!Array.isArray(arr)) throw new CmsError("IO", "JSON is not an array", { status: 500 });
		const idx = arr.findIndex((r) => (r as { id?: unknown })?.id === rowId);
		if (idx === -1) throw new CmsError("NOT_FOUND", `Row not found: ${rowId}`, { status: 404 });
		const [removed] = arr.splice(idx, 1);
		await backupFile(abs);
		await atomicWrite(abs, JSON.stringify(arr, null, 2) + "\n");
		const envelopeRel = `.cms-trash/${ts}/${repoRel}#${rowId}.json`;
		const envelopeAbs = resolveRepoPath(envelopeRel);
		await fs.mkdir(path.dirname(envelopeAbs), { recursive: true });
		await fs.writeFile(
			envelopeAbs,
			JSON.stringify(
				{
					deletedAt: new Date().toISOString(),
					op: "row-delete",
					path: repoRel,
					row: removed,
					rowId,
				},
				null,
				2,
			),
			"utf8",
		);
		return { ok: true, trashPath: envelopeRel };
	}
	const abs = resolveRepoPath(repoRel);
	await fs.stat(abs).catch(() => {
		throw new CmsError("NOT_FOUND", `Not found: ${repoRel}`, { status: 404 });
	});
	const destRel = `.cms-trash/${ts}/${repoRel}`;
	const destAbs = resolveRepoPath(destRel);
	await fs.mkdir(path.dirname(destAbs), { recursive: true });
	await fs.rename(abs, destAbs);
	// Keep a manifest for restore.
	await fs
		.writeFile(
			path.join(path.dirname(destAbs), ".manifest.json"),
			JSON.stringify({ deletedAt: new Date().toISOString(), originalPath: repoRel }, null, 2),
			"utf8",
		)
		.catch(() => {});
	return { ok: true, trashPath: destRel };
}

export async function listTrash(): Promise<{ path: string; deletedAt?: string }[]> {
	const root = trashRoot();
	const out: { path: string; deletedAt?: string }[] = [];
	async function walk(dir: string) {
		let names: string[] = [];
		try {
			names = await fs.readdir(dir);
		} catch {
			return;
		}
		for (const n of names) {
			if (n === ".manifest.json") continue;
			const abs = path.join(dir, n);
			const st = await fs.stat(abs);
			if (st.isDirectory()) await walk(abs);
			else {
				const rel = path.relative(getProjectRoot(), abs).replaceAll("\\", "/");
				out.push({ path: rel });
			}
		}
	}
	await walk(root);
	return out.toSorted().toReversed();
}

export async function restoreTrash(trashPath: string): Promise<{ ok: true; path: string }> {
	const trashAbs = resolveRepoPath(trashPath);
	if (!trashPath.startsWith(".cms-trash/"))
		throw new CmsError("VALIDATION", "Not a trash path", { status: 400 });
	const envelope = trashAbs.endsWith(".json") && trashPath.includes("#");
	if (envelope) {
		const data = JSON.parse(await fs.readFile(trashAbs, "utf8"));
		const origRel = data.path as string;
		const abs = resolveRepoPath(origRel);
		const text = await fs.readFile(abs, "utf8").catch(() => "[]");
		const arr = JSON.parse(text);
		arr.push(data.row);
		await atomicWrite(abs, JSON.stringify(arr, null, 2) + "\n");
		await fs.rm(trashAbs, { force: true });
		return { ok: true, path: origRel };
	}
	// File restore: trashPath = .cms-trash/<ts>/<origRel>
	const m = trashPath.match(/^\.cms-trash\/[^/]+\/(.+)$/u);
	if (!m) throw new CmsError("VALIDATION", "Unrecognized trash layout", { status: 400 });
	const origRel = m[1];
	const destAbs = resolveRepoPath(origRel);
	// TTL check.
	const ttlDays = getTrashTtlDays();
	const st = await fs.stat(trashAbs);
	const ageDays = (Date.now() - st.mtimeMs) / 86400000;
	if (ageDays > ttlDays)
		throw new CmsError("NOT_FOUND", "Trash entry expired (TTL)", { status: 404 });
	try {
		await fs.stat(destAbs);
		throw new CmsError("CONFLICT", `Restore target exists: ${origRel}`, { status: 409 });
	} catch (e) {
		if (e instanceof CmsError) throw e;
	}
	await fs.mkdir(path.dirname(destAbs), { recursive: true });
	await fs.rename(trashAbs, destAbs);
	return { ok: true, path: origRel };
}

export async function purgeExpiredTrash(): Promise<{ purged: number }> {
	const ttlDays = getTrashTtlDays();
	const root = trashRoot();
	let purged = 0;
	async function walk(dir: string) {
		let names: string[] = [];
		try {
			names = await fs.readdir(dir);
		} catch {
			return;
		}
		for (const n of names) {
			const abs = path.join(dir, n);
			const st = await fs.stat(abs);
			if (st.isDirectory()) await walk(abs);
			else {
				const ageDays = (Date.now() - st.mtimeMs) / 86400000;
				if (ageDays > ttlDays) {
					await fs.rm(abs, { force: true });
					purged++;
				}
			}
		}
	}
	await walk(root);
	return { purged };
}
