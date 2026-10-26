import { useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "tally.theme";
const listeners = new Set<() => void>();

interface ThemeState {
	mode: ThemeMode;
	resolved: ResolvedTheme;
}

const INITIAL_STATE: ThemeState = { mode: "system", resolved: "light" };

function systemTheme(): ResolvedTheme {
	if (typeof window === "undefined") return "light";
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStoredMode(): ThemeMode {
	if (typeof window === "undefined") return "system";
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
	} catch {
		return "system";
	}
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

function emit() {
	for (const listener of listeners) listener();
}

const storedMode: ThemeMode = typeof window === "undefined" ? "system" : readStoredMode();

let state: ThemeState =
	typeof window === "undefined"
		? INITIAL_STATE
		: { mode: storedMode, resolved: applyTheme(storedMode) };

if (typeof window !== "undefined") {
	const media = window.matchMedia("(prefers-color-scheme: dark)");
	media.addEventListener("change", () => {
		if (state.mode !== "system") return;
		state = { mode: "system", resolved: applyTheme("system") };
		emit();
	});
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function getSnapshot() {
	return state;
}

function getServerSnapshot() {
	return INITIAL_STATE;
}

export function setThemeMode(next: ThemeMode) {
	state = { mode: next, resolved: applyTheme(next) };
	if (typeof window !== "undefined") {
		try {
			localStorage.setItem(STORAGE_KEY, next);
		} catch {
			// Private-mode storage failures must not break the shell.
		}
	}
	emit();
}

export function useTheme() {
	const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
	return { mode: snapshot.mode, resolved: snapshot.resolved, setMode: setThemeMode };
}

/** Runs before paint to avoid a light flash on a dark-theme visit. */
export const themeScript = `(function(){try{var m=localStorage.getItem("${STORAGE_KEY}")||"system";var d=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
