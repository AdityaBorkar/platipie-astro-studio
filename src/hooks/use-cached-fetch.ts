import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface CacheEntry<T> {
	data: T;
	updatedAt: number;
}

interface UseCachedFetchOptions {
	enabled?: boolean;
	errorMessage?: string;
	persist?: boolean;
	toastOnBackgroundError?: boolean;
}

interface UseCachedFetchResult<T> {
	data: T | null;
	error: string | null;
	isLoading: boolean;
	isRefreshing: boolean;
	refresh: () => void;
	updatedAt: number | null;
}

const MEMORY = new Map<string, CacheEntry<unknown>>();
const INFLIGHT = new Map<string, Promise<unknown>>();

function storageKey(key: string): string {
	return `cms.cache.v1.${key}`;
}

function readStorage<T>(key: string): CacheEntry<T> | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(storageKey(key));
		if (!raw) return null;
		const parsed = JSON.parse(raw) as CacheEntry<T>;
		if (!parsed || typeof parsed !== "object" || !("data" in parsed)) return null;
		return parsed;
	} catch {
		return null;
	}
}

function readCached<T>(key: string, persist: boolean): CacheEntry<T> | null {
	const memory = MEMORY.get(key) as CacheEntry<T> | undefined;
	if (memory) return memory;
	if (!persist) return null;
	const stored = readStorage<T>(key);
	if (stored) MEMORY.set(key, stored);
	return stored;
}

function writeCached<T>(key: string, data: T, persist: boolean): number {
	const updatedAt = Date.now();
	const entry: CacheEntry<T> = { data, updatedAt };
	MEMORY.set(key, entry);
	if (persist && typeof window !== "undefined") {
		try {
			window.localStorage.setItem(storageKey(key), JSON.stringify(entry));
		} catch {
			// Quota or private-mode failures must not break the UI.
		}
	}
	return updatedAt;
}

function stableStringify(value: unknown): string {
	if (value === null || value === undefined) return String(value);
	if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
	if (typeof value === "object") {
		const record = value as Record<string, unknown>;
		const keys = Object.keys(record).toSorted();
		return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(record[k])}`).join(",")}}`;
	}
	return JSON.stringify(value) ?? String(value);
}

function isDeepEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true;
	return stableStringify(a) === stableStringify(b);
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
	const response = await fetch(url, init);
	const json = (await response.json().catch(() => ({}))) as {
		code?: unknown;
		diff?: unknown;
		fields?: unknown;
		message?: unknown;
	};
	if (!response.ok) {
		const message =
			typeof json.message === "string" ? json.message : `Request failed (${response.status})`;
		const error = new Error(message) as Error & {
			code?: unknown;
			diff?: unknown;
			fields?: unknown;
			status?: number;
		};
		error.code = json.code;
		error.diff = json.diff;
		error.fields = json.fields;
		error.status = response.status;
		throw error;
	}
	return json as T;
}

export function useCachedFetch<T>(
	key: string,
	fetcher: () => Promise<T>,
	options?: UseCachedFetchOptions,
): UseCachedFetchResult<T> {
	const enabled = options?.enabled ?? true;
	const errorMessage = options?.errorMessage;
	const persist = options?.persist ?? true;
	const toastOnBackgroundError = options?.toastOnBackgroundError ?? true;

	const [snapshot, setSnapshot] = useState<{
		data: T | null;
		key: string;
		updatedAt: number | null;
	}>(() => {
		const cached = readCached<T>(key, persist);
		return { data: cached?.data ?? null, key, updatedAt: cached?.updatedAt ?? null };
	});
	if (snapshot.key !== key) {
		const cached = readCached<T>(key, persist);
		setSnapshot({ data: cached?.data ?? null, key, updatedAt: cached?.updatedAt ?? null });
	}
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(enabled);
	const [tick, setTick] = useState(0);

	const data = snapshot.key === key ? snapshot.data : null;
	const updatedAt = snapshot.key === key ? snapshot.updatedAt : null;

	const fetcherRef = useRef(fetcher);
	const dataRef = useRef<T | null>(null);

	useEffect(() => {
		fetcherRef.current = fetcher;
	});

	useEffect(() => {
		dataRef.current = snapshot.key === key ? snapshot.data : null;
	}, [key, snapshot]);

	const refresh = useCallback(() => {
		setTick((value) => value + 1);
	}, []);

	const generationRef = useRef(0);

	useEffect(() => {
		const generation = tick;
		generationRef.current = generation;
		if (!enabled) {
			setPending(false);
			return;
		}
		let alive = true;
		setPending(true);
		setError(null);

		const run = async () => {
			try {
				let inflight = INFLIGHT.get(key) as Promise<T> | undefined;
				if (!inflight) {
					inflight = fetcherRef.current();
					INFLIGHT.set(key, inflight);
					inflight
						.finally(() => {
							if (INFLIGHT.get(key) === inflight) INFLIGHT.delete(key);
						})
						.catch(() => {});
				}
				const fresh = await inflight;
				if (!alive || generation !== generationRef.current) return;
				const previous = dataRef.current;
				if (previous === null || !isDeepEqual(previous, fresh)) {
					setSnapshot({ data: fresh, key, updatedAt: Date.now() });
					dataRef.current = fresh;
				} else {
					setSnapshot((current) =>
						current.key === key ? current : { data: previous, key, updatedAt: current.updatedAt },
					);
				}
				const stamp = writeCached<T>(key, fresh, persist);
				if (!alive || generation !== generationRef.current) return;
				setSnapshot((current) =>
					current.key === key ? { ...current, updatedAt: stamp } : current,
				);
				setError(null);
			} catch (e: unknown) {
				if (!alive || generation !== generationRef.current) return;
				const message = e instanceof Error ? e.message : String(e);
				if (dataRef.current === null) {
					setError(message);
					if (toastOnBackgroundError) toast.error(errorMessage ?? message);
				} else if (toastOnBackgroundError) {
					toast.error(errorMessage ?? message);
				}
			} finally {
				if (alive && generation === generationRef.current) setPending(false);
			}
		};

		void run();
		return () => {
			alive = false;
		};
	}, [enabled, errorMessage, key, persist, tick, toastOnBackgroundError]);

	const isLoading = pending && data === null;
	const isRefreshing = pending && data !== null;

	return { data, error, isLoading, isRefreshing, refresh, updatedAt };
}
