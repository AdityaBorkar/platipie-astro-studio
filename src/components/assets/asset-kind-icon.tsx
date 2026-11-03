import { FileCode2Icon, FilmIcon, ImageIcon, TypeIcon } from "lucide-react";

import { FileTypeIcon } from "#/components/file-type-icon";
import { cn } from "#/lib/utils";
import type { AssetKind } from "./types";

export function AssetKindGlyph({ className, kind }: { className?: string; kind: AssetKind }) {
	if (kind === "image" || kind === "svg") return <ImageIcon className={className} />;
	if (kind === "video") return <FilmIcon className={className} />;
	if (kind === "font") return <TypeIcon className={className} />;
	return <FileCode2Icon className={className} />;
}

/**
 * Single generic fallback: FileCode2Icon for every unknown or missing
 * extension. FileTypeIcon already falls back to FileCode2Icon, so the
 * no-ext branch matches it instead of splitting FileIcon/FileCode2Icon.
 */
export function AssetIcon({
	className,
	ext,
	kind,
}: {
	className?: string;
	ext?: string;
	kind: AssetKind;
}) {
	if (kind === "other") {
		if (!ext) return <FileCode2Icon aria-hidden="true" className={cn("shrink-0", className)} />;
		return <FileTypeIcon className={className} ext={ext} />;
	}
	return <AssetKindGlyph className={className} kind={kind} />;
}
