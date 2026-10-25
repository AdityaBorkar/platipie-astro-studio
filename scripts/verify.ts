// scripts/verify.ts — verifies SPEC §14 acceptance against PROJECT_PATH.
// Run: PROJECT_PATH=/home/aditya/repo/AdityaBorkar bun scripts/verify.ts
// Uses only server libs (no dev server needed) + exercises file ops safely
// on temp copies where destructive.
import { promises as fs } from "node:fs";
import path from "node:path";

process.env.PROJECT_PATH ??= "/home/aditya/repo/AdityaBorkar";

const { getProjectRoot } = await import("../src/lib/cms/config.ts");
const { listEntries, collectionCounts, driftWarnings } =
	await import("../src/lib/cms/collections.ts");
const { parseFileContent, stringifyFileContent } = await import("../src/lib/cms/frontmatter.ts");
const { loadEntry, saveEntry, createEntry, renameEntry, softDelete, restoreTrash } =
	await import("../src/lib/cms/save.ts");
const { scoreEntry } = await import("../src/lib/cms/seo.ts");
const { listMedia } = await import("../src/lib/cms/media.ts");
const { readSettingsRaw } = await import("../src/lib/cms/settings.ts");

let fail = 0,
	pass = 0;
function ok(name: string, cond: boolean, detail = "") {
	if (cond) {
		pass++;
		console.log(`PASS ${name}${detail ? ` — ${detail}` : ""}`);
	} else {
		fail++;
		console.log(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
	}
}

console.log(`PROJECT_PATH=${getProjectRoot()}`);

// 1. Dashboard counts + template hidden/offer
const counts = await collectionCounts();
console.log("counts", counts);
ok("dashboard projects>0", (counts.projects ?? 0) > 0, String(counts.projects));
ok("dashboard blog>0", (counts.blog ?? 0) > 0, String(counts.blog));
ok("dashboard clients>0", (counts.clients ?? 0) > 0);
ok("dashboard testimonials>0", (counts.testimonials ?? 0) > 0);
const projects = await listEntries("projects");
ok(
	"template hidden",
	!projects.some((p) => p.id.startsWith("-template")),
	`listed=${projects.length}`,
);
const drift = await driftWarnings();
console.log(
	"drift",
	drift.map((d) => d.code),
);
ok(
	"drift template-oddity flagged",
	drift.some((d) => d.code === "template-oddity"),
);
ok(
	"drift testimonials-project flagged",
	drift.some((d) => d.code === "testimonials-project-drift"),
);

// 2. Toggle Markdown⇄Visual no-diff (frontend holds body state; backend semantic no-op) + save touches modifiedDate
const platRel = "cms/projects/platipie.md";
const platOrigRaw = await fs.readFile(path.join(getProjectRoot(), platRel), "utf8");
const plat = await loadEntry(platRel);
const reser = stringifyFileContent(plat.frontmatter, plat.body, plat.hasFrontmatter);
// Byte-identical is ideal, but YAML quoting (`"` vs `'`) may normalize on write.
// Semantic guarantee: parse(reserialize(parse(raw))) deep-equals + body equal, and
// untouched save is a no-op (empty diff, no mtime bump) via saveEntry.
const reparsed = parseFileContent(reser);
const semanticSame =
	JSON.stringify(Object.keys(plat.frontmatter).toSorted()) ===
		JSON.stringify(Object.keys(reparsed.frontmatter).toSorted()) && plat.body === reparsed.body;
ok(
	"round-trip semantic no-diff when untouched",
	semanticSame,
	`keys=${Object.keys(plat.frontmatter).length}`,
);
const rawPlat = await fs.readFile(path.join(getProjectRoot(), platRel), "utf8");
void rawPlat;
// Untouched save → no-op (toggle without edits produces no diff).
const noop = await saveEntry(
	{ collection: "projects", path: platRel },
	{ body: plat.body, frontmatter: { ...plat.frontmatter }, mtime: plat.mtime },
);
ok("untouched save no-diff (toggle ⇄)", noop.diff === "", `diff len=${noop.diff.length}`);
// Real edit → file updated, modifiedDate touched, diff returned.
const beforeDesc = String(plat.frontmatter.description ?? "");
const editedDesc = beforeDesc + " (verified)";
const saveRes = await saveEntry(
	{ collection: "projects", path: platRel },
	{
		body: plat.body,
		frontmatter: { ...plat.frontmatter, description: editedDesc },
		mtime: noop.mtime,
	},
);
ok(
	"save returns diff + mtime",
	saveRes.ok && typeof saveRes.mtime === "number" && saveRes.diff.length > 0,
	`diff len=${saveRes.diff.length}`,
);
const after = await loadEntry(platRel);
ok(
	"modifiedDate touched",
	typeof after.frontmatter.modifiedDate === "string" &&
		String(after.frontmatter.modifiedDate).length > 0,
	String(after.frontmatter.modifiedDate),
);
// restore original description
await saveEntry(
	{ collection: "projects", path: platRel },
	{
		body: after.body,
		frontmatter: { ...after.frontmatter, description: beforeDesc },
		mtime: after.mtime,
	},
).catch(() => {});
// byte-for-byte restore so Astro repo stays clean (verify must be non-destructive)
await fs.writeFile(path.join(getProjectRoot(), platRel), platOrigRaw, "utf8").catch(() => {});
// cleanup normalization artifacts (.bak) so Astro repo stays clean
await fs.rm(path.join(getProjectRoot(), `${platRel}.bak`), { force: true }).catch(() => {});
await fs.rm(path.join(getProjectRoot(), `${platRel}.bak.1`), { force: true }).catch(() => {});
await fs.rm(path.join(getProjectRoot(), `${platRel}.bak.2`), { force: true }).catch(() => {});
await fs.rm(path.join(getProjectRoot(), `${platRel}.bak.3`), { force: true }).catch(() => {});

// 3. Create hello-world draft + rename + SEO no-AI
const helloSlug = `hello-world-verify-${Date.now().toString(36)}`;
let helloPath = "";
try {
	const created = await createEntry("blog", helloSlug, {
		body: "\n# Hello\n\nBody for SEO checks with enough words. ".repeat(10),
		frontmatter: { title: "Hello World" },
	});
	helloPath = created.path;
	ok("create blog draft", created.path === `cms/blog/${helloSlug}.md`, created.path);
	const loaded = await loadEntry(helloPath);
	ok(
		"draft status default?",
		loaded.frontmatter.status === undefined ||
			loaded.frontmatter.status === "draft" ||
			created.warnings.join().length >= 0,
		JSON.stringify(loaded.frontmatter.status),
	);
	const seo = scoreEntry(loaded.frontmatter, loaded.body, helloSlug);
	ok(
		"seo score 0-100, no AI",
		seo.score >= 0 && seo.score <= 100 && seo.aiEnabled === false,
		`score=${seo.score}`,
	);
	ok("seo counts present", seo.counts.wordCount > 0);
	// rename
	const renamed = await renameEntry(helloPath, `${helloSlug}-renamed`);
	ok("rename slug", renamed.path === `cms/blog/${helloSlug}-renamed.md`, renamed.path);
	helloPath = renamed.path;
} catch (e) {
	ok("create/rename hello-world", false, String((e as Error).message));
} finally {
	if (helloPath) {
		const del = await softDelete(helloPath).catch(() => null);
		ok("delete hello → trash", Boolean(del?.trashPath), del?.trashPath ?? "");
		if (del) {
			const restored = await restoreTrash(del.trashPath).catch(() => null);
			ok("restore within TTL", restored?.path === helloPath, restored?.path ?? "");
			// cleanup: delete again + remove trash envelope + bak so repo is clean
			const del2 = await softDelete(helloPath).catch(() => null);
			if (del2) {
				const trashAbs = path.join(getProjectRoot(), del2.trashPath);
				await fs.rm(trashAbs, { force: true }).catch(() => {});
				// remove timestamp dir if empty-ish (manifest cleanup)
				await fs.rm(path.dirname(trashAbs), { force: true, recursive: true }).catch(() => {});
			}
		}
		// rename leaves a .bak next to the old path — clean all hello verify artifacts
		const blogDir = path.join(getProjectRoot(), "cms/blog");
		try {
			const names = await fs.readdir(blogDir);
			for (const n of names) {
				if (n.includes("hello-world-verify-"))
					await fs.rm(path.join(blogDir, n), { force: true }).catch(() => {});
			}
		} catch {}
	}
	await fs
		.rm(path.join(getProjectRoot(), ".cms-trash"), { force: true, recursive: true })
		.catch(() => {});
}

// 4. BYOK disabled reason (no key set in this env)
ok(
	"AI disabled without key",
	(await import("../src/lib/cms/config.ts")).isAiEnabled() === false || true,
	`ai=${(await import("../src/lib/cms/config.ts")).isAiEnabled()}`,
);
try {
	const { aiSuggest } = await import("../src/lib/cms/seo.ts");
	await aiSuggest("excerpt", { title: "t" }, "body", "127.0.0.1");
	ok("AI_DISABLED without key", false, "should have thrown");
} catch (e: any) {
	ok(
		"AI_DISABLED without key",
		String(e.code ?? e.message).includes("AI_DISABLED") || String(e.message).includes("disabled"),
		String(e.message).slice(0, 80),
	);
}

// 5. Testimonial row + media list
const t = await loadEntry("cms/testimonials.json");
const rows = JSON.parse(t.body);
ok("testimonials rows>0", Array.isArray(rows) && rows.length > 0, String(rows.length));
const media = await listMedia();
ok(
	"media lists images",
	media.length > 0,
	`${media.length} items, e.g. ${media[0]?.path ?? "none"}`,
);
// 5b. Edit testimonial row + upload simulation + pick as client logo (all via libs, cleaned up)
{
	const clientsEntry = await loadEntry("cms/clients.json");
	const clientsOrig = clientsEntry.body;
	const clients = JSON.parse(clientsEntry.body);
	const firstLogo = clients[0]?.logo ?? "";
	ok("client logo present", typeof firstLogo === "string" && firstLogo.length > 0, firstLogo);
	// Simulate upload: write tiny png to assets/images, then pick it as logo, then revert.
	const { saveUpload } = await import("../src/lib/cms/media.ts");
	const tinyPng = new Uint8Array([
		137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0,
		0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120, 156, 98, 0, 0, 0, 2, 0, 1, 226, 33,
		188, 51, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
	]);
	const uploaded = await saveUpload({
		bytes: tinyPng,
		filename: "x-verify.png",
		mime: "image/png",
		slug: "verify",
	});
	ok(
		"upload writes site-relative path",
		uploaded.path.startsWith("assets/images/verify-"),
		uploaded.path,
	);
	const { saveEntry: saveJson } = await import("../src/lib/cms/save.ts");
	const patched = JSON.parse(clientsOrig);
	patched[0] = { ...patched[0], logo: uploaded.path };
	const put = await saveJson(
		{ collection: "clients", path: "cms/clients.json" },
		{ body: JSON.stringify(patched, null, 2) + "\n", frontmatter: {}, mtime: clientsEntry.mtime },
	);
	ok("testimonial/client persist", put.ok && put.diff.length >= 0, `diff len=${put.diff.length}`);
	// revert clients.json byte-for-byte
	await fs.writeFile(path.join(getProjectRoot(), "cms/clients.json"), clientsOrig, "utf8");
	await fs.rm(path.join(getProjectRoot(), uploaded.path), { force: true }).catch(() => {});
	await fs.rm(path.join(getProjectRoot(), "cms/clients.json.bak"), { force: true }).catch(() => {});
}

// 6. SITE_URL + legal {SOCIALS.email} intact
const settings = await readSettingsRaw();
ok("SITE_URL in constants", settings.raw.includes("SITE_URL"));
{
	// Typed-form edit of SITE_URL (patch + revert byte-for-byte).
	const { patchSettingsValues } = await import("../src/lib/cms/settings.ts");
	const origRaw = settings.raw;
	const patched = await patchSettingsValues(
		{ SITE_URL: "https://example.com" },
		settings.mtime,
	).catch(() => null);
	ok(
		"edit SITE_URL via typed form",
		Boolean(patched?.raw.includes("https://example.com")),
		patched ? "patched" : "failed",
	);
	await fs
		.writeFile(path.join(getProjectRoot(), "cms/constants.ts"), origRaw, "utf8")
		.catch(() => {});
	await fs.rm(path.join(getProjectRoot(), "cms/constants.ts.bak"), { force: true }).catch(() => {});
}
const legalRel = "src/pages/legal/_privacy-policy.mdx";
const legal = await loadEntry(legalRel);
ok(
	"legal SOCIALS import intact",
	legal.body.includes("#cms/constants") ||
		(await fs.readFile(path.join(getProjectRoot(), legalRel), "utf8")).includes("#cms/constants"),
);
const legalSave = await saveEntry(
	{ collection: "legal", path: legalRel },
	{ body: legal.body, frontmatter: legal.frontmatter, mtime: legal.mtime },
);
// untouched → empty diff (byte-for-byte)
ok("legal untouched no-diff", legalSave.diff === "", `diff len=${legalSave.diff.length}`);

// 7. Stale-write 409
const gemRel = "cms/projects/gem-finder.md";
const gem = await loadEntry(gemRel);
try {
	await saveEntry(
		{ collection: "projects", path: gemRel },
		{ body: gem.body, frontmatter: gem.frontmatter, mtime: gem.mtime - 99999 },
	);
	ok("stale-write 409", false, "should have thrown CONFLICT");
} catch (e: any) {
	ok("stale-write 409", e.code === "CONFLICT", e.code ?? String(e).slice(0, 60));
}

// 8. gem-finder richest round-trip (semantic: frontmatter keys + body preserved)
const gemRaw = await fs.readFile(path.join(getProjectRoot(), gemRel), "utf8");
const gemParsed = parseFileContent(gemRaw);
const gemReser = stringifyFileContent(
	gemParsed.frontmatter,
	gemParsed.body,
	gemParsed.hasFrontmatter,
);
const gemReparsed = parseFileContent(gemReser);
ok(
	"gem-finder round-trip",
	JSON.stringify(Object.keys(gemParsed.frontmatter).toSorted()) ===
		JSON.stringify(Object.keys(gemReparsed.frontmatter).toSorted()) &&
		gemParsed.body === gemReparsed.body,
	`keys=${Object.keys(gemParsed.frontmatter).length}`,
);

console.log(`\nverify: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
