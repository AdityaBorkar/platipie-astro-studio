import { useRef } from "react";
import type { PointerEvent, RefObject } from "react";

import { Hint } from "#/components/gitbook/hint";
import { Spinner } from "#/components/ui/spinner";
import { cn } from "#/lib/utils";
import { AssetIcon } from "./asset-kind-icon";
import type { AssetRow } from "./types";
import {
	clamp,
	cropBoxStyle,
	cropDimStyle,
	cropHandleStyle,
	isVideo,
	mediaUrl,
	nextCropRect,
} from "./utils";
import type { CropDragState, CropHandleMode, CropRect } from "./utils";

const MIN_CROP = 0.05;

const CROP_HANDLES: { className: string; label: string; mode: CropHandleMode }[] = [
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

export function PreviewStage({
	asset,
	crop,
	cropMode,
	editable,
	hasCrop,
	image,
	imageLike,
	loadError,
	onCropChange,
	onVideoSize,
	previewRef,
}: {
	asset: AssetRow;
	crop: CropRect;
	cropMode: boolean;
	editable: boolean;
	hasCrop: boolean;
	image: HTMLImageElement | null;
	imageLike: boolean;
	loadError: string | null;
	onCropChange: (next: CropRect) => void;
	onVideoSize: (size: { height: number; path: string; width: number }) => void;
	previewRef: RefObject<HTMLCanvasElement | null>;
}) {
	if (editable) {
		if (!image) {
			if (loadError) {
				return (
					<div className="flex min-h-64 items-center justify-center bg-muted/40 p-4">
						<Hint title="Preview unavailable" variant="danger">
							{loadError}
						</Hint>
					</div>
				);
			}
			return (
				<div className="flex min-h-64 items-center justify-center bg-muted/40 p-4">
					<Spinner className="size-6 text-muted-foreground" />
				</div>
			);
		}
		return (
			<div className="flex min-h-64 items-center justify-center bg-muted/40 p-4">
				<div className="relative inline-flex max-w-full items-center justify-center overflow-hidden rounded-lg">
					<canvas className="block max-h-58vh max-w-full" ref={previewRef} />
					{cropMode ? (
						<CropOverlay crop={crop} onChange={onCropChange} />
					) : hasCrop ? (
						<div
							className="pointer-events-none absolute border border-brand"
							style={cropBoxStyle(crop)}
						/>
					) : null}
				</div>
			</div>
		);
	}

	if (imageLike) {
		return (
			<div className="flex min-h-64 items-center justify-center bg-muted/40 p-4">
				<img
					alt={asset.name}
					className="max-h-58vh max-w-full rounded-lg object-contain"
					src={mediaUrl(asset.path)}
				/>
			</div>
		);
	}

	if (isVideo(asset)) {
		return (
			<div className="flex min-h-64 items-center justify-center bg-muted/40 p-4">
				<video
					className="max-h-58vh max-w-full rounded-lg"
					controls
					onLoadedMetadata={(event) =>
						onVideoSize({
							height: event.currentTarget.videoHeight,
							path: asset.path,
							width: event.currentTarget.videoWidth,
						})
					}
					src={mediaUrl(asset.path)}
				>
					<track kind="captions" label="Captions" srcLang="en" />
				</video>
			</div>
		);
	}

	return (
		<div className="flex min-h-64 items-center justify-center bg-muted/40 p-4">
			<div className="flex flex-col items-center gap-2 text-muted-foreground">
				<AssetIcon className="size-12" ext={asset.ext} kind={asset.kind} />
				<span className="font-mono text-11">{asset.ext.replace(".", "")}</span>
			</div>
		</div>
	);
}

export function CropOverlay({
	crop,
	onChange,
}: {
	crop: CropRect;
	onChange: (next: CropRect) => void;
}) {
	const dragRef = useRef<CropDragState | null>(null);
	const overlayRef = useRef<HTMLDivElement>(null);

	function pointerPosition(event: PointerEvent<HTMLElement>): { x: number; y: number } {
		const bounds = overlayRef.current?.getBoundingClientRect();
		if (!bounds) return { x: 0, y: 0 };
		return {
			x: clamp((event.clientX - bounds.left) / bounds.width, 0, 1),
			y: clamp((event.clientY - bounds.top) / bounds.height, 0, 1),
		};
	}

	function beginDrag(event: PointerEvent<HTMLElement>, mode: CropDragState["mode"]) {
		event.preventDefault();
		event.stopPropagation();
		event.currentTarget.setPointerCapture(event.pointerId);
		dragRef.current = { mode, origin: crop, start: pointerPosition(event) };
	}

	function moveDrag(event: PointerEvent<HTMLElement>) {
		const drag = dragRef.current;
		if (!drag) return;
		onChange(nextCropRect(drag, pointerPosition(event), MIN_CROP));
	}

	function endDrag(event: PointerEvent<HTMLElement>) {
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
				style={cropDimStyle(crop)}
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
					style={cropHandleStyle(crop, handle.mode)}
					type="button"
					{...dragHandlers}
				/>
			))}
		</div>
	);
}
