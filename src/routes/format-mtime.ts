export function formatMtime(mtime: number): string {
	return new Date(mtime).toLocaleString();
}

export function formatMtimeDate(mtime: number): string {
	return new Date(mtime).toLocaleDateString();
}

export function formatMtimeTime(mtime: number): string {
	return new Date(mtime).toLocaleTimeString();
}
