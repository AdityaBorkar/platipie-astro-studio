import { FileIcon, FilmIcon, ImageIcon, TypeIcon } from "lucide-react";

export function AssetKindGlyph({ className, kind }: { className?: string; kind: string }) {
	if (kind === "image" || kind === "svg") return <ImageIcon className={className} />;
	if (kind === "video") return <FilmIcon className={className} />;
	if (kind === "font") return <TypeIcon className={className} />;
	return <FileIcon className={className} />;
}
