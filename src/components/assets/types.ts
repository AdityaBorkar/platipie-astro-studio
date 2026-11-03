export type AssetKind = "font" | "image" | "other" | "svg" | "video";

export interface AssetRow {
	dir: string;
	ext: string;
	kind: AssetKind;
	mtime: number;
	name: string;
	path: string;
	size: number;
}

export interface FolderNode {
	children: FolderNode[];
	count: number;
	name: string;
	path: string;
	total: number;
}
