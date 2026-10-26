import { CopyIcon } from "lucide-react";

import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import { AssetKindGlyph } from "./asset-kind-icon";
import type { AssetRow } from "./types";
import { formatBytes, isPreviewableImage, mediaUrl } from "./utils";

interface AssetCardProps {
	asset: AssetRow;
	className?: string;
	onCopy: (path: string) => void;
	onOpen: (asset: AssetRow) => void;
	showPath?: boolean;
}

export function AssetCard({ asset, className, onCopy, onOpen, showPath = true }: AssetCardProps) {
	return (
		<li
			className={cn(
				"group overflow-hidden rounded-xl border border-border bg-card transition-card hover:border-foreground/20 hover:shadow-soft",
				className,
			)}
		>
			<button
				className="block w-full text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
				onClick={() => onOpen(asset)}
				type="button"
			>
				<span className="flex h-36 items-center justify-center overflow-hidden bg-muted">
					{isPreviewableImage(asset) ? (
						<img
							alt={asset.name}
							className="size-full object-contain"
							loading="lazy"
							src={mediaUrl(asset.path)}
						/>
					) : (
						<span className="flex flex-col items-center gap-1 text-muted-foreground">
							<AssetKindGlyph className="size-8" kind={asset.kind} />
							<span className="font-mono text-10">{asset.ext.replace(".", "")}</span>
						</span>
					)}
				</span>
				<span className="block px-3 pt-3 pb-1">
					<span className="block truncate text-xs font-semibold text-foreground" title={asset.name}>
						{asset.name}
					</span>
					{showPath ? (
						<span
							className="mt-0.5 block truncate font-mono text-10 text-muted-foreground"
							title={asset.path}
						>
							{asset.dir}
						</span>
					) : null}
				</span>
			</button>
			<div className="flex items-center justify-between gap-2 px-3 pt-1 pb-3">
				<span className="truncate font-mono text-10 text-muted-foreground">
					{asset.kind} · {formatBytes(asset.size)} · {new Date(asset.mtime).toLocaleDateString()}
				</span>
				<Button
					aria-label={`Copy ${asset.path}`}
					onClick={() => onCopy(asset.path)}
					size="icon-xs"
					variant="ghost"
				>
					<CopyIcon className="size-3.5" />
				</Button>
			</div>
		</li>
	);
}
