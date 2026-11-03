import { FileCode2Icon } from "lucide-react";

import { cn } from "#/lib/utils";
import type { LowercaseExt } from "./file-type-icons.paths";
import { BRAND_GLYPHS, FALLBACK_ICONS } from "./file-type-icons.paths";

interface FileTypeIconProps {
	className?: string;
	ext: string;
}

export function FileTypeIcon({ className, ext }: FileTypeIconProps) {
	const key = ext.toLowerCase() as LowercaseExt;
	const glyph = BRAND_GLYPHS[key] ?? null;

	if (glyph) {
		return (
			<svg
				aria-hidden="true"
				className={cn("size-3.5 shrink-0", className)}
				fill="currentColor"
				viewBox="0 0 24 24"
			>
				<path d={glyph} />
			</svg>
		);
	}

	const Icon = FALLBACK_ICONS[key] ?? FileCode2Icon;
	return <Icon aria-hidden="true" className={cn("size-3.5 shrink-0", className)} />;
}
