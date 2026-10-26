export interface AssetRow {
	dir: string;
	ext: string;
	kind: string;
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
