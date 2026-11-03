import { toast } from "sonner";

import type { AssetRow, FolderNode } from "./types";

export const ASSET_ROOT = "assets";

export interface FolderCrumb {
	name: string;
	path: string;
}

export interface CropRect {
	height: number;
	width: number;
	x: number;
	y: number;
}

export interface CropPoint {
	x: number;
	y: number;
}

export type CropHandleMode = "e" | "n" | "ne" | "nw" | "s" | "se" | "sw" | "w";
export type CropDragMode = "move" | "new" | CropHandleMode;

export interface CropDragState {
	mode: CropDragMode;
	origin: CropRect;
	start: CropPoint;
}

export function formatBytes(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes < 0) return "—";
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
	const path = asset.path.toLowerCase();
	const name = asset.name.toLowerCase();
	const kind = asset.kind.toLowerCase();
	return path.includes(needle) || name.includes(needle) || kind.includes(needle);
}

export function mediaUrl(path: string): string {
	return `/api/cms/media?path=${encodeURIComponent(path)}`;
}

export function assetPublicUrl(path: string): string {
	if (path.startsWith("assets/")) return `/${path.slice("assets/".length)}`;
	if (path.startsWith("public/")) return `/${path.slice("public/".length)}`;
	return `/${path}`;
}

export async function copyValue(value: string, label: string): Promise<void> {
	try {
		await navigator.clipboard.writeText(value);
		toast.success(`Copied ${label}`);
	} catch {
		toast.error("Clipboard unavailable");
	}
}

/** Paint an image onto a canvas sized for the rotated frame. Shared by preview + export. */
export function drawRotated(
	context: CanvasRenderingContext2D,
	image: HTMLImageElement,
	rotation: number,
): { height: number; width: number } {
	const rotated = rotation % 180 !== 0;
	const width = rotated ? image.naturalHeight : image.naturalWidth;
	const height = rotated ? image.naturalWidth : image.naturalHeight;
	context.canvas.width = width;
	context.canvas.height = height;
	context.imageSmoothingQuality = "high";
	context.clearRect(0, 0, width, height);
	context.save();
	context.translate(width / 2, height / 2);
	context.rotate((rotation * Math.PI) / 180);
	context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
	context.restore();
	return { height, width };
}

export function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

export function nextCropRect(drag: CropDragState, point: CropPoint, min: number): CropRect {
	if (drag.mode === "new") {
		const x = Math.min(drag.start.x, point.x);
		const y = Math.min(drag.start.y, point.y);
		const width = clamp(Math.abs(point.x - drag.start.x), min, 1 - x);
		const height = clamp(Math.abs(point.y - drag.start.y), min, 1 - y);
		return { height, width, x, y };
	}

	if (drag.mode === "move") {
		const height = drag.origin.height;
		const width = drag.origin.width;
		const x = clamp(drag.origin.x + point.x - drag.start.x, 0, 1 - width);
		const y = clamp(drag.origin.y + point.y - drag.start.y, 0, 1 - height);
		return { height, width, x, y };
	}

	let bottom = drag.origin.y + drag.origin.height;
	let left = drag.origin.x;
	let right = drag.origin.x + drag.origin.width;
	let top = drag.origin.y;
	if (drag.mode.includes("w")) left = clamp(point.x, 0, right - min);
	if (drag.mode.includes("e")) right = clamp(point.x, left + min, 1);
	if (drag.mode.includes("n")) top = clamp(point.y, 0, bottom - min);
	if (drag.mode.includes("s")) bottom = clamp(point.y, top + min, 1);
	return { height: bottom - top, width: right - left, x: left, y: top };
}

export function cropBoxStyle(rect: CropRect): {
	height: string;
	left: string;
	top: string;
	width: string;
} {
	return {
		height: `${rect.height * 100}%`,
		left: `${rect.x * 100}%`,
		top: `${rect.y * 100}%`,
		width: `${rect.width * 100}%`,
	};
}

export function cropDimStyle(rect: CropRect): {
	boxShadow: string;
	height: string;
	left: string;
	top: string;
	width: string;
} {
	return {
		...cropBoxStyle(rect),
		boxShadow: "0 0 0 9999px color-mix(in oklch, var(--scrim) 55%, transparent)",
	};
}

export function cropHandleStyle(
	rect: CropRect,
	mode: CropHandleMode,
): { left: string; top: string } {
	const x = rect.x + (mode.includes("w") ? 0 : mode.includes("e") ? rect.width : rect.width / 2);
	const y = rect.y + (mode.includes("n") ? 0 : mode.includes("s") ? rect.height : rect.height / 2);
	return { left: `${x * 100}%`, top: `${y * 100}%` };
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
