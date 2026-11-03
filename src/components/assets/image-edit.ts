import { clamp } from "./utils";

export function outputMime(ext: string): string {
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

export function extensionForMime(mime: string): string {
	if (mime === "image/jpeg") return ".jpg";
	if (mime === "image/webp") return ".webp";
	if (mime === "image/avif") return ".avif";
	return ".png";
}

export function stemOf(name: string): string {
	const dot = name.lastIndexOf(".");
	return dot > 0 ? name.slice(0, dot) : name;
}

export async function canvasToBlob(canvas: HTMLCanvasElement, mime: string): Promise<Blob> {
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

/** Render the rotated source, apply the normalized crop, and encode the result. */
export async function renderEditedImage(
	image: HTMLImageElement,
	ext: string,
	rotation: number,
	crop: { height: number; width: number; x: number; y: number },
): Promise<{ blob: Blob; height: number; width: number }> {
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

	const blob = await canvasToBlob(output, outputMime(ext));
	return { blob, height: sourceHeight, width: sourceWidth };
}
