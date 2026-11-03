function withPath(base: string, path: string): string {
	return `${base}?path=${encodeURIComponent(path)}`;
}

export const cmsKeys = {
	collections: "/api/cms/collections",
	contentIndex: "/api/cms/collections?expand=entries",
	diff: (path: string): string => withPath("/api/cms/diff", path),
	duplicate: "/api/cms/duplicate",
	entries: (collection: string): string =>
		`/api/cms/entries?collection=${encodeURIComponent(collection)}`,
	entry: (path: string): string => withPath("/api/cms/entry", path),
	entryBase: "/api/cms/entry",
	entryFallback: "content:entry:none",
	inventory: (scope: string): string => `/api/cms/inventory?scope=${scope}`,
	media: "/api/cms/media",
	page: (path: string): string => withPath("/api/cms/page", path),
	pageBase: "/api/cms/page",
	pageDetailFallback: "pages:detail:none",
	projects: "/api/cms/projects",
	rename: "/api/cms/rename",
	restore: "/api/cms/restore",
	schema: (type: string): string => `/api/cms/schema?type=${encodeURIComponent(type)}`,
	seo: (path: string): string => withPath("/api/cms/seo", path),
	seoAi: "/api/cms/seo/ai",
	settings: "/api/cms/settings",
	sync: "/api/cms/sync",
};

export function entryApiKey(path: string): string {
	return cmsKeys.entry(path);
}

export function entriesKey(collection: string): string {
	return cmsKeys.entries(collection);
}

export function inventoryKey(scope: string): string {
	return cmsKeys.inventory(scope);
}

export function pageApiKey(path: string): string {
	return cmsKeys.page(path);
}

export function mediaKey(): string {
	return cmsKeys.media;
}

export function entryBaseKey(): string {
	return cmsKeys.entryBase;
}

export function pageBaseKey(): string {
	return cmsKeys.pageBase;
}
