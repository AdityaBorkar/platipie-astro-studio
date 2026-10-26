import { CropIcon, CopyIcon, RotateCcwIcon, RotateCwIcon, SaveIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type * as React from "react";
import { toast } from "sonner";

import { Hint } from "#/components/gitbook/hint";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";
import { Spinner } from "#/components/ui/spinner";
import { cn } from "#/lib/utils";
import { AssetKindGlyph } from "./asset-kind-icon";
import type { AssetRow } from "./types";
import {
	assetPublicUrl,
	canEditImage,
	formatBytes,
	isPreviewableImage,
	isVideo,
	mediaUrl,
} from "./utils";

interface AssetPreviewDialogProps {
	asset: AssetRow;
	onClose: () => void;
	onUpload: (file: File, slug?: string) => Promise<string>;
	onUploaded: () => void;
}

interface Rect {
	height: number;
	width: number;
	x: number;
	y: number;
}

interface Point {
	x: number;
	y: number;
}

type HandleMode = "e" | "n" | "ne" | "nw" | "s" | "se" | "sw" | "w";
type DragMode = "move" | "new" | HandleMode;

interface DragState {
	mode: DragMode;
	origin: Rect;
	start: Point;
}

const FULL_CROP: Rect = { height: 1, width: 1, x: 0, y: 0 };
const INITIAL_CROP: Rect = { height: 0.8, width: 0.8, x: 0.1, y: 0.1 };
const MIN_CROP = 0.05;

const CROP_HANDLES: { className: string; label: string; mode: HandleMode }[] = [
	{
		className: "-top-1.5 -left-1.5 cursor-nwse-resize",
		label: "Resize crop from the top left",
		mode: "nw",
	},
	{
		className: "-top-1.5 left-1/2 cursor-ns-resize",
		label: "Resize crop from the top",
		mode: "n",
	},
	{
		className: "-top-1.5 -right-1.5 cursor-nesw-resize",
		label: "Resize crop from the top right",
		mode: "ne",
	},
	{
		className: "top-1/2 -right-1.5 cursor-ew-resize",
		label: "Resize crop from the right",
		mode: "e",
	},
	{
		className: "-right-1.5 -bottom-1.5 cursor-nwse-resize",
		label: "Resize crop from the bottom right",
		mode: "se",
	},
	{
		className: "-bottom-1.5 left-1/2 cursor-ns-resize",
		label: "Resize crop from the bottom",
		mode: "s",
	},
	{
		className: "-bottom-1.5 -left-1.5 cursor-nesw-resize",
		label: "Resize crop from the bottom left",
		mode: "sw",
	},
	{
		className: "top-1/2 -left-1.5 cursor-ew-resize",
		label: "Resize crop from the left",
		mode: "w",
	},
];

export function AssetPreviewDialog({
	asset,
	onClose,
	onUpload,
	onUploaded,
}: AssetPreviewDialogProps) {
	const [image, setImage] = useState<HTMLImageElement | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [videoSize, setVideoSize] = useState<{ height: number; width: number } | null>(null);
	const [rotation, setRotation] = useState(0);
	const [crop, setCrop] = useState<Rect>(FULL_CROP);
	const [cropMode, setCropMode] = useState(false);
	const [saving, setSaving] = useState(false);
	const previewRef = useRef<HTMLCanvasElement>(null);

	const imageLike = isPreviewableImage(asset);
	const editable = canEditImage(asset);
	const publicUrl = assetPublicUrl(asset.path);
	const hasCrop = crop.x > 0 || crop.y > 0 || crop.width < 1 || crop.height < 1;

	useEffect(() => {
		if (!imageLike) return;
		let alive = true;
		const img = new Image();
		const handleLoad = () => {
			if (alive) setImage(img);
		};
		const handleError = () => {
			if (alive) setLoadError("This image could not be decoded for preview.");
		};
		img.addEventListener("load", handleLoad);
		img.addEventListener("error", handleError);
		img.src = mediaUrl(asset.path);
		return () => {
			alive = false;
			img.removeEventListener("load", handleLoad);
			img.removeEventListener("error", handleError);
		};
	}, [asset.path, imageLike]);

	useEffect(() => {
		const canvas = previewRef.current;
		if (!canvas || !image) return;
		const rotated = rotation % 180 !== 0;
		const width = rotated ? image.naturalHeight : image.naturalWidth;
		const height = rotated ? image.naturalWidth : image.naturalHeight;
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext("2d");
		if (!context) return;
		context.imageSmoothingQuality = "high";
		context.clearRect(0, 0, width, height);
		context.save();
		context.translate(width / 2, height / 2);
		context.rotate((rotation * Math.PI) / 180);
		context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
		context.restore();
	}, [image, rotation]);

	function resetEdits() {
		setRotation(0);
		setCrop(FULL_CROP);
		setCropMode(false);
	}

	function rotate(direction: -1 | 1) {
		setRotation((current) => (current + direction * 90 + 360) % 360);
		setCrop(FULL_CROP);
		setCropMode(false);
	}

	function toggleCrop() {
		if (cropMode) {
			setCropMode(false);
			return;
		}
		setCrop(INITIAL_CROP);
		setCropMode(true);
	}

	async function saveCopy() {
		if (!image || saving) return;
		setSaving(true);
		try {
			const rotated = rotation % 180 !== 0;
			const stageWidth = rotated ? image.naturalHeight : image.naturalWidth;
			const stageHeight = rotated ? image.naturalWidth : image.naturalHeight;
			const stage = document.createElement("canvas");
			stage.width = stageWidth;
			stage.height = stageHeight;
			const stageContext = stage.getContext("2d");
			if (!stageContext) throw new Error("Canvas is unavailable in this browser.");
			stageContext.imageSmoothingQuality = "high";
			stageContext.translate(stageWidth / 2, stageHeight / 2);
			stageContext.rotate((rotation * Math.PI) / 180);
			stageContext.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

			const sourceX = clamp(Math.round(crop.x * stageWidth), 0, stageWidth - 1);
			const sourceY = clamp(Math.round(crop.y * stageHeight), 0, stageHeight - 1);
			const sourceWidth = clamp(Math.round(crop.width * stageWidth), 1, stageWidth - sourceX);
			const sourceHeight = clamp(Math.round(crop.height * stageHeight), 1, stageHeight - sourceY);

			const output = document.createElement("canvas");
			output.width = sourceWidth;
			output.height = sourceHeight;
			const outputContext = output.getContext("2d");
			if (!outputContext) throw new Error("Canvas is unavailable in this browser.");
			outputContext.drawImage(
				stage,
				sourceX,
				sourceY,
				sourceWidth,
				sourceHeight,
				0,
				0,
				sourceWidth,
				sourceHeight,
			);

			const blob = await canvasToBlob(output, outputMime(asset.ext));
			const file = new File([blob], `${stemOf(asset.name)}-edited${extensionForMime(blob.type)}`, {
				type: blob.type,
			});
			const path = await onUpload(file, "edited");
			toast.success(`Saved ${path}`);
			onUploaded();
			onClose();
		} catch (error: unknown) {
			toast.error(error instanceof Error ? error.message : String(error));
		} finally {
			setSaving(false);
		}
	}

	return (
		<Dialog
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			open
		>
			<DialogContent className="max-h-dialog gap-0 overflow-hidden p-0 sm:max-w-5xl">
				<DialogHeader className="border-b border-border py-3 pr-12 pl-4 text-left">
					<DialogTitle className="truncate font-mono text-sm">{asset.name}</DialogTitle>
					<DialogDescription className="truncate font-mono text-10">{asset.path}</DialogDescription>
				</DialogHeader>

				<div className="grid max-h-84dvh overflow-y-auto md:grid-cols-asset-dialog">
					<div className="flex min-h-64 items-center justify-center bg-muted/40 p-4">
						{editable ? (
							image ? (
								<div className="relative inline-flex max-w-full items-center justify-center overflow-hidden rounded-lg">
									<canvas className="block max-h-asset-preview max-w-full" ref={previewRef} />
									{cropMode ? (
										<CropOverlay crop={crop} onChange={setCrop} />
									) : hasCrop ? (
										<div
											className="pointer-events-none absolute border border-brand"
											style={cropStyle(crop)}
										/>
									) : null}
								</div>
							) : loadError ? (
								<Hint title="Preview unavailable" variant="danger">
									{loadError}
								</Hint>
							) : (
								<Spinner className="size-6 text-muted-foreground" />
							)
						) : imageLike ? (
							<img
								alt={asset.name}
								className="max-h-asset-preview max-w-full rounded-lg object-contain"
								src={mediaUrl(asset.path)}
							/>
						) : isVideo(asset) ? (
							<video
								className="max-h-asset-preview max-w-full rounded-lg"
								controls
								onLoadedMetadata={(event) =>
									setVideoSize({
										height: event.currentTarget.videoHeight,
										width: event.currentTarget.videoWidth,
									})
								}
								src={mediaUrl(asset.path)}
							/>
						) : (
							<div className="flex flex-col items-center gap-2 text-muted-foreground">
								<AssetKindGlyph className="size-12" kind={asset.kind} />
								<span className="font-mono text-11">{asset.ext.replace(".", "")}</span>
							</div>
						)}
					</div>

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
								) : videoSize ? (
									<MetaRow
										label="Dimensions"
										value={`${videoSize.width} × ${videoSize.height} px`}
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
										<p className="text-11 font-bold tracking-14 text-brand uppercase">
											Image editor
										</p>
										<Button disabled={!image} onClick={resetEdits} size="xs" variant="ghost">
											Reset
										</Button>
									</div>
									<div className="mt-2 grid grid-cols-2 gap-1.5">
										<Button
											disabled={!image}
											onClick={() => rotate(-1)}
											size="sm"
											variant="outline"
										>
											<RotateCcwIcon className="size-3.5" />
											Rotate left
										</Button>
										<Button disabled={!image} onClick={() => rotate(1)} size="sm" variant="outline">
											<RotateCwIcon className="size-3.5" />
											Rotate right
										</Button>
									</div>
									<Button
										className="mt-1.5 w-full"
										disabled={!image}
										onClick={toggleCrop}
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
										onClick={() => void saveCopy()}
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
				</div>
			</DialogContent>
		</Dialog>
	);
}

function CropOverlay({ crop, onChange }: { crop: Rect; onChange: (next: Rect) => void }) {
	const overlayRef = useRef<HTMLDivElement>(null);
	const dragRef = useRef<DragState | null>(null);

	function pointerPosition(event: React.PointerEvent<HTMLElement>): Point {
		const bounds = overlayRef.current?.getBoundingClientRect();
		if (!bounds) return { x: 0, y: 0 };
		return {
			x: clamp((event.clientX - bounds.left) / bounds.width, 0, 1),
			y: clamp((event.clientY - bounds.top) / bounds.height, 0, 1),
		};
	}

	function beginDrag(event: React.PointerEvent<HTMLElement>, mode: DragMode) {
		event.preventDefault();
		event.stopPropagation();
		event.currentTarget.setPointerCapture(event.pointerId);
		dragRef.current = { mode, origin: crop, start: pointerPosition(event) };
	}

	function moveDrag(event: React.PointerEvent<HTMLElement>) {
		const drag = dragRef.current;
		if (!drag) return;
		onChange(nextRect(drag, pointerPosition(event)));
	}

	function endDrag(event: React.PointerEvent<HTMLElement>) {
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
		dragRef.current = null;
	}

	const dragHandlers = {
		onPointerCancel: endDrag,
		onPointerMove: moveDrag,
		onPointerUp: endDrag,
	};

	return (
		<div className="absolute inset-0 touch-none" ref={overlayRef}>
			<button
				aria-label="Draw a new crop area"
				className="absolute inset-0 cursor-crosshair"
				onPointerDown={(event) => beginDrag(event, "new")}
				type="button"
				{...dragHandlers}
			/>
			<button
				aria-label="Move crop area"
				className="absolute cursor-move border-2 border-brand"
				onPointerDown={(event) => beginDrag(event, "move")}
				style={cropMoveStyle(crop)}
				type="button"
				{...dragHandlers}
			/>
			{CROP_HANDLES.map((handle) => (
				<button
					aria-label={handle.label}
					className={cn(
						"absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand bg-background",
						handle.className,
					)}
					key={handle.mode}
					onPointerDown={(event) => beginDrag(event, handle.mode)}
					style={handleStyle(crop, handle.mode)}
					type="button"
					{...dragHandlers}
				/>
			))}
		</div>
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

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function nextRect(drag: DragState, point: Point): Rect {
	if (drag.mode === "new") {
		const x = Math.min(drag.start.x, point.x);
		const y = Math.min(drag.start.y, point.y);
		const width = clamp(Math.abs(point.x - drag.start.x), MIN_CROP, 1 - x);
		const height = clamp(Math.abs(point.y - drag.start.y), MIN_CROP, 1 - y);
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
	if (drag.mode.includes("w")) left = clamp(point.x, 0, right - MIN_CROP);
	if (drag.mode.includes("e")) right = clamp(point.x, left + MIN_CROP, 1);
	if (drag.mode.includes("n")) top = clamp(point.y, 0, bottom - MIN_CROP);
	if (drag.mode.includes("s")) bottom = clamp(point.y, top + MIN_CROP, 1);
	return { height: bottom - top, width: right - left, x: left, y: top };
}

function cropMoveStyle(crop: Rect): React.CSSProperties {
	return {
		boxShadow: "0 0 0 9999px color-mix(in oklch, var(--scrim) 55%, transparent)",
		height: `${crop.height * 100}%`,
		left: `${crop.x * 100}%`,
		top: `${crop.y * 100}%`,
		width: `${crop.width * 100}%`,
	};
}

function cropStyle(crop: Rect): React.CSSProperties {
	return {
		height: `${crop.height * 100}%`,
		left: `${crop.x * 100}%`,
		top: `${crop.y * 100}%`,
		width: `${crop.width * 100}%`,
	};
}

function handleStyle(crop: Rect, mode: HandleMode): React.CSSProperties {
	const x = crop.x + (mode.includes("w") ? 0 : mode.includes("e") ? crop.width : crop.width / 2);
	const y = crop.y + (mode.includes("n") ? 0 : mode.includes("s") ? crop.height : crop.height / 2);
	return { left: `${x * 100}%`, top: `${y * 100}%` };
}

async function copyValue(value: string, label: string) {
	try {
		await navigator.clipboard.writeText(value);
		toast.success(`Copied ${label}`);
	} catch {
		toast.error("Clipboard unavailable");
	}
}

function outputMime(ext: string): string {
	switch (ext) {
		case ".avif":
			return "image/avif";
		case ".jpg":
		case ".jpeg":
			return "image/jpeg";
		case ".webp":
			return "image/webp";
		default:
			return "image/png";
	}
}

async function canvasToBlob(canvas: HTMLCanvasElement, mime: string): Promise<Blob> {
	const blob = await new Promise<Blob | null>((resolve) => {
		canvas.toBlob(resolve, mime, 0.92);
	});
	if (blob) return blob;
	const fallback = await new Promise<Blob | null>((resolve) => {
		canvas.toBlob(resolve, "image/png");
	});
	if (!fallback) throw new Error("Could not encode the edited image.");
	return fallback;
}

function extensionForMime(mime: string): string {
	if (mime === "image/jpeg") return ".jpg";
	if (mime === "image/webp") return ".webp";
	if (mime === "image/avif") return ".avif";
	return ".png";
}

function stemOf(name: string): string {
	const dot = name.lastIndexOf(".");
	return dot > 0 ? name.slice(0, dot) : name;
}
