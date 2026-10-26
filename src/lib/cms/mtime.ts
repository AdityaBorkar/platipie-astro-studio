// Shared mtime staleness check — 1s tolerance for FS granularity.
export function isStaleWrite(stored: number, provided: number): boolean {
	return Math.abs(stored - provided) > 1000;
}
