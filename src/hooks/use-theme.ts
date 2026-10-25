import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "tally.theme";

function systemTheme(): ResolvedTheme {
	if (typeof window === "undefined") return "light";
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStoredMode(): ThemeMode {
	if (typeof window === "undefined") return "system";
	const stored = localStorage.getItem(STORAGE_KEY);
	return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

function applyTheme(mode: ThemeMode): ResolvedTheme {
	const resolved = mode === "system" ? systemTheme() : mode;
	if (typeof document !== "undefined") {
		const root = document.documentElement;
		root.classList.toggle("dark", resolved === "dark");
		root.style.colorScheme = resolved;
	}
	return resolved;
}

/** Light / dark / system theme with localStorage persistence. */
export function useTheme() {
	const [mode, setModeState] = useState<ThemeMode>("system");
	const [resolved, setResolved] = useState<ResolvedTheme>("light");

	useEffect(() => {
		const stored = readStoredMode();
		setModeState(stored);
		setResolved(applyTheme(stored));
	}, []);

	useEffect(() => {
		setResolved(applyTheme(mode));
		if (mode !== "system") return;
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => setResolved(applyTheme("system"));
		media.addEventListener("change", onChange);
		return () => media.removeEventListener("change", onChange);
	}, [mode]);

	const setMode = useCallback((next: ThemeMode) => {
		setModeState(next);
		localStorage.setItem(STORAGE_KEY, next);
	}, []);

	return { mode, resolved, setMode };
}

/** Runs before paint to avoid a light flash on a dark-theme visit. */
export const themeScript = `(function(){try{var m=localStorage.getItem("${STORAGE_KEY}")||"system";var d=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
