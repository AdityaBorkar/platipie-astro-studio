import { CopyIcon, CropIcon, RotateCcwIcon, RotateCwIcon, SaveIcon } from "lucide-react";

import { Button } from "#/components/ui/button";
import { Separator } from "#/components/ui/separator";
import { cn } from "#/lib/utils";
import type { AssetRow } from "./types";
import { copyValue, formatBytes } from "./utils";

export function EditorPanel({
	asset,
	cropMode,
	editable,
	hasCrop,
	image,
	imageLike,
	onReset,
	onRotate,
	onSaveCopy,
	onToggleCrop,
	publicUrl,
	saving,
	videoSizeForAsset,
}: {
	asset: AssetRow;
	cropMode: boolean;
	editable: boolean;
	hasCrop: boolean;
	image: HTMLImageElement | null;
	imageLike: boolean;
	onReset: () => void;
	onRotate: (direction: -1 | 1) => void;
	onSaveCopy: () => void;
	onToggleCrop: () => void;
	publicUrl: string;
	saving: boolean;
	videoSizeForAsset: { height: number; width: number } | null;
}) {
	return (
		<aside className="flex flex-col gap-4 border-t border-border p-4 md:border-t-0 md:border-l">
			<section>
				<p className="text-11 font-bold tracking-14 text-brand uppercase">Metadata</p>
				<dl className="mt-2 grid grid-cols-page-meta gap-x-3 gap-y-1.5 text-xs">
					<MetaRow label="Kind" value={asset.kind} />
					<MetaRow label="Type" value={asset.ext.replace(".", "") || "—"} />
					<MetaRow label="Size" value={formatBytes(asset.size)} />
					{image && imageLike ? (
						<MetaRow
							label="Dimensions"
							value={`${image.naturalWidth} × ${image.naturalHeight} px`}
						/>
					) : videoSizeForAsset ? (
						<MetaRow
							label="Dimensions"
							value={`${videoSizeForAsset.width} × ${videoSizeForAsset.height} px`}
						/>
					) : null}
					<MetaRow label="Modified" value={new Date(asset.mtime).toLocaleString()} />
					<MetaRow label="Folder" mono value={asset.dir} />
					<MetaRow label="Path" mono value={asset.path} />
				</dl>
			</section>

			<Separator />

			<section>
				<p className="text-11 font-bold tracking-14 text-brand uppercase">Copy</p>
				<div className="mt-2 grid gap-1.5">
					<Button
						className="w-full justify-start"
						onClick={() => void copyValue(asset.path, "path")}
						size="sm"
						variant="outline"
					>
						<CopyIcon className="size-3.5" />
						Copy path
					</Button>
					<Button
						className="w-full justify-start"
						onClick={() => void copyValue(publicUrl, "URL")}
						size="sm"
						variant="outline"
					>
						<CopyIcon className="size-3.5" />
						Copy URL
					</Button>
					{imageLike ? (
						<Button
							className="w-full justify-start"
							onClick={() => void copyValue(`![${asset.name}](${publicUrl})`, "Markdown")}
							size="sm"
							variant="outline"
						>
							<CopyIcon className="size-3.5" />
							Copy Markdown
						</Button>
					) : null}
				</div>
			</section>

			{editable ? (
				<>
					<Separator />
					<section>
						<div className="flex items-center justify-between gap-2">
							<p className="text-11 font-bold tracking-14 text-brand uppercase">Image editor</p>
							<Button disabled={!image} onClick={onReset} size="xs" variant="ghost">
								Reset
							</Button>
						</div>
						<div className="mt-2 grid grid-cols-2 gap-1.5">
							<Button disabled={!image} onClick={() => onRotate(-1)} size="sm" variant="outline">
								<RotateCcwIcon className="size-3.5" />
								Rotate left
							</Button>
							<Button disabled={!image} onClick={() => onRotate(1)} size="sm" variant="outline">
								<RotateCwIcon className="size-3.5" />
								Rotate right
							</Button>
						</div>
						<Button
							className="mt-1.5 w-full"
							disabled={!image}
							onClick={onToggleCrop}
							size="sm"
							variant={cropMode ? "default" : "outline"}
						>
							<CropIcon className="size-3.5" />
							{cropMode ? "Done cropping" : "Crop"}
						</Button>
						<p className="mt-2 text-11 leading-relaxed text-muted-foreground">
							{cropMode
								? "Drag on the preview to draw a crop area, or drag a corner to resize."
								: hasCrop
									? "The crop area will be applied when you save."
									: "Edits are non-destructive. Saving creates a new asset in assets/images."}
						</p>
						<Button
							className="mt-2 w-full"
							disabled={!image || saving}
							onClick={onSaveCopy}
							size="sm"
						>
							<SaveIcon className="size-3.5" />
							{saving ? "Saving…" : "Save edited copy"}
						</Button>
					</section>
				</>
			) : imageLike ? (
				<p className="text-11 leading-relaxed text-muted-foreground">
					Animated GIFs are preview-only. Editing is disabled to preserve the animation.
				</p>
			) : null}
		</aside>
	);
}

function MetaRow({ label, mono = false, value }: { label: string; mono?: boolean; value: string }) {
	return (
		<div className="contents">
			<dt className="text-muted-foreground">{label}</dt>
			<dd className={cn("min-w-0 wrap-break-word", mono && "font-mono text-10")}>{value}</dd>
		</div>
	);
}
