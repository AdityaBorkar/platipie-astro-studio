import { promises as fs } from "node:fs";
import path from "node:path";

export interface WalkEntry {
	abs: string;
	mtime: number;
	rel: string;
	size: number;
}

export async function walkDir(absDir: string, repoRel: string): Promise<WalkEntry[]> {
	const out: WalkEntry[] = [];
	async function walk(dir: string, rel: string): Promise<void> {
		let names: string[];
		try {
			names = await fs.readdir(dir);
		} catch (e) {
			// Only a missing dir is empty; EACCES/ENOSPC must surface.
			if ((e as NodeJS.ErrnoException)?.code === "ENOENT") return;
			throw e;
		}
		for (const name of names.toSorted()) {
			if (name.startsWith(".")) continue;
			const abs = path.join(dir, name);
			const childRel = rel ? `${rel}/${name}` : name;
			const st = await fs.stat(abs).catch(() => null);
			if (!st) continue;
			if (st.isDirectory()) await walk(abs, childRel);
			else if (st.isFile()) out.push({ abs, mtime: st.mtimeMs, rel: childRel, size: st.size });
		}
	}
	await walk(absDir, repoRel);
	return out;
}

export const IO_CONCURRENCY = 20;

// Bounded parallelism for per-file enrichment: chunks of N keep large trees
// from exhausting file descriptors (never unbounded Promise.all). Shared by
// scanners, collections, and projects (single source; no import cycle —
// fs-walk is the lowest-level module).
export async function mapChunked<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
	const out: R[] = [];
	for (let i = 0; i < items.length; i += IO_CONCURRENCY) {
		const chunk = await Promise.all(items.slice(i, i + IO_CONCURRENCY).map((item) => fn(item)));
		out.push(...chunk);
	}
	return out;
}
