import { useCallback, useSyncExternalStore } from "react";

export interface UiPrefs {
	showCms: boolean;
	showContentSeo: boolean;
	showPagesInSidebar: boolean;
	showWebsiteMeta: boolean;
}

export type UiPrefKey = keyof UiPrefs;

export const UI_PREF_DEFAULTS: UiPrefs = {
	showCms: true,
	showContentSeo: true,
	showPagesInSidebar: true,
	showWebsiteMeta: true,
};

const STORAGE_KEY = "platipie.ui-prefs";
const listeners = new Set<() => void>();

function readPrefs(): UiPrefs {
	if (typeof window === "undefined") return UI_PREF_DEFAULTS;
	try {
		const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<UiPrefs>;
		return {
			showCms: raw.showCms ?? UI_PREF_DEFAULTS.showCms,
			showContentSeo: raw.showContentSeo ?? UI_PREF_DEFAULTS.showContentSeo,
			showPagesInSidebar: raw.showPagesInSidebar ?? UI_PREF_DEFAULTS.showPagesInSidebar,
			showWebsiteMeta: raw.showWebsiteMeta ?? UI_PREF_DEFAULTS.showWebsiteMeta,
		};
	} catch {
		return UI_PREF_DEFAULTS;
	}
}

let state = readPrefs();

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
	return UI_PREF_DEFAULTS;
}

export function setUiPref(key: UiPrefKey, value: boolean) {
	state = { ...state, [key]: value };
	if (typeof window !== "undefined") {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		} catch {
			// Private-mode storage failures must not break the shell.
		}
	}
	for (const listener of listeners) listener();
}

export function useUiPrefs() {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useUiPref(key: UiPrefKey) {
	return useUiPrefs()[key];
}

export function useToggleUiPref(key: UiPrefKey) {
	const value = useUiPref(key);
	return useCallback(() => {
		setUiPref(key, !value);
	}, [key, value]);
}
