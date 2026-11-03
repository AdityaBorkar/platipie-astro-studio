import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { EditorPanel } from "./editor-panel";
import { extensionForMime, renderEditedImage, stemOf } from "./image-edit";
import { PreviewStage } from "./preview-stage";
import type { AssetRow } from "./types";
import { assetPublicUrl, canEditImage, drawRotated, isPreviewableImage, mediaUrl } from "./utils";
import type { CropRect } from "./utils";

interface AssetPreviewDialogProps {
	asset: AssetRow;
	onClose: () => void;
	onUpload: (file: File, slug?: string) => Promise<string>;
	onUploaded: () => void;
}

const FULL_CROP: CropRect = { height: 1, width: 1, x: 0, y: 0 };
const INITIAL_CROP: CropRect = { height: 0.8, width: 0.8, x: 0.1, y: 0.1 };

export function AssetPreviewDialog({
	asset,
	onClose,
	onUpload,
	onUploaded,
}: AssetPreviewDialogProps) {
	const [image, setImage] = useState<HTMLImageElement | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [videoSize, setVideoSize] = useState<{
		height: number;
		path: string;
		width: number;
	} | null>(null);
	const [rotation, setRotation] = useState(0);
	const [crop, setCrop] = useState<CropRect>(FULL_CROP);
	const [cropMode, setCropMode] = useState(false);
	const [saving, setSaving] = useState(false);
	const previewRef = useRef<HTMLCanvasElement>(null);
	const videoSizeForAsset = videoSize?.path === asset.path ? videoSize : null;

	const imageLike = isPreviewableImage(asset);
	const editable = canEditImage(asset);
	const publicUrl = assetPublicUrl(asset.path);
	const hasCrop = crop.x > 0 || crop.y > 0 || crop.width < 1 || crop.height < 1;

	useEffect(() => {
		setVideoSize((current) => (current?.path === asset.path ? current : null));
	}, [asset.path]);

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
		const context = canvas.getContext("2d");
		if (!context) return;
		drawRotated(context, image, rotation);
	}, [image, rotation]);

	function resetEdits() {
		setCrop(FULL_CROP);
		setCropMode(false);
		setRotation(0);
	}

	function rotate(direction: -1 | 1) {
		setCrop(FULL_CROP);
		setCropMode(false);
		setRotation((current) => (current + direction * 90 + 360) % 360);
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
			const { blob } = await renderEditedImage(image, asset.ext, rotation, crop);
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
					<PreviewStage
						asset={asset}
						crop={crop}
						cropMode={cropMode}
						editable={editable}
						hasCrop={hasCrop}
						image={image}
						imageLike={imageLike}
						loadError={loadError}
						onCropChange={setCrop}
						onVideoSize={setVideoSize}
						previewRef={previewRef}
					/>

					<EditorPanel
						asset={asset}
						cropMode={cropMode}
						editable={editable}
						hasCrop={hasCrop}
						image={image}
						imageLike={imageLike}
						onReset={resetEdits}
						onRotate={rotate}
						onSaveCopy={() => void saveCopy()}
						onToggleCrop={toggleCrop}
						publicUrl={publicUrl}
						saving={saving}
						videoSizeForAsset={videoSizeForAsset}
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}
