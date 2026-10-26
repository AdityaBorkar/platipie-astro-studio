import type { AssetRow, FolderNode } from "./types";

export const ASSET_ROOT = "assets";

export interface FolderCrumb {
	name: string;
	path: string;
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function isPreviewableImage(asset: AssetRow): boolean {
	return asset.kind === "image" || asset.kind === "svg";
}

export function isVideo(asset: AssetRow): boolean {
	return asset.kind === "video";
}

export function canEditImage(asset: AssetRow): boolean {
	return isPreviewableImage(asset) && asset.ext !== ".gif";
}

export function matchesQuery(asset: AssetRow, needle: string): boolean {
	return (
		asset.path.toLowerCase().includes(needle) ||
		asset.kind.toLowerCase().includes(needle) ||
		asset.name.toLowerCase().includes(needle)
	);
}

export function mediaUrl(path: string): string {
	return `/api/cms/media?path=${encodeURIComponent(path)}`;
}

export function assetPublicUrl(path: string): string {
	if (path.startsWith("assets/")) return `/${path.slice("assets/".length)}`;
	if (path.startsWith("public/")) return `/${path.slice("public/".length)}`;
	return `/${path}`;
}

export function buildFolderTree(rows: AssetRow[]): FolderNode {
	const root: FolderNode = {
		children: [],
		count: 0,
		name: ASSET_ROOT,
		path: ASSET_ROOT,
		total: 0,
	};
	const index = new Map<string, FolderNode>([[ASSET_ROOT, root]]);

	for (const row of rows) {
		const segments = row.dir.split("/").filter(Boolean);
		let current = root;
		let currentPath = "";

		for (const segment of segments) {
			currentPath = currentPath ? `${currentPath}/${segment}` : segment;
			let child = index.get(currentPath);
			if (!child) {
				child = {
					children: [],
					count: 0,
					name: segment,
					path: currentPath,
					total: 0,
				};
				index.set(currentPath, child);
				current.children.push(child);
			}
			current = child;
		}

		current.count += 1;
	}

	sortAndTotal(root);
	return root;
}

function sortAndTotal(node: FolderNode): number {
	node.children.sort((a, b) => a.name.localeCompare(b.name));
	node.total = node.count + node.children.reduce((sum, child) => sum + sortAndTotal(child), 0);
	return node.total;
}

export function flattenFolders(root: FolderNode): Map<string, FolderNode> {
	const folders = new Map<string, FolderNode>();
	const walk = (node: FolderNode) => {
		folders.set(node.path, node);
		for (const child of node.children) walk(child);
	};
	walk(root);
	return folders;
}

export function folderCrumbs(dir: string): FolderCrumb[] {
	const parts = dir.split("/").filter(Boolean);
	return parts.map((name, index) => ({
		name,
		path: parts.slice(0, index + 1).join("/"),
	}));
}
