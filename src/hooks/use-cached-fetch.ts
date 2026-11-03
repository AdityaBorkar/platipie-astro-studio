import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export class ApiError extends Error {
	code?: unknown;
	diff?: unknown;
	fields?: unknown;
	status?: number;

	constructor(
		message: string,
		init?: { code?: unknown; diff?: unknown; fields?: unknown; status?: number },
	) {
		super(message);
		this.code = init?.code;
		this.diff = init?.diff;
		this.fields = init?.fields;
		this.name = "ApiError";
		this.status = init?.status;
	}
}

interface ErrorPayload {
	code?: unknown;
	diff?: unknown;
	fields?: unknown;
	message?: unknown;
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
	const response = await fetch(url, init);
	let body: unknown = null;
	try {
		body = await response.json();
	} catch {
		body = null;
	}
	const payload = (body ?? {}) as ErrorPayload;
	if (!response.ok) {
		const message =
			typeof payload.message === "string" ? payload.message : `Request failed (${response.status})`;
		throw new ApiError(message, {
			code: payload.code,
			diff: payload.diff,
			fields: payload.fields,
			status: response.status,
		});
	}
	return payload as T;
}

interface UseCachedFetchOptions {
	enabled?: boolean;
	errorMessage?: string;
	maxAgeMs?: number;
	persist?: boolean;
	toastOnBackgroundError?: boolean;
	validate?: (data: unknown) => boolean;
}

interface UseCachedFetchResult<T> {
	data: T | null;
	error: string | null;
	isLoading: boolean;
	isRefreshing: boolean;
	refresh: () => void;
	updatedAt: number | null;
}

interface Snapshot<T> {
	attempt: number;
	data: T | null;
	key: string;
	updatedAt: number | null;
}

const MEMORY = new Map<string, { data: unknown; updatedAt: number }>();
const STORAGE_VERSION = 2;
const DEFAULT_MAX_AGE_MS = 10 * 60 * 1000;
const SWEEP_MARKER = `cms.cache.swept.v${STORAGE_VERSION}`;
let legacySwept = false;

function sweepLegacyCaches(): void {
	if (legacySwept || typeof window === "undefined") return;
	legacySwept = true;
	try {
		if (window.localStorage.getItem(SWEEP_MARKER)) return;
		const victims: string[] = [];
		for (let index = 0; index < window.localStorage.length; index += 1) {
			const storedKey = window.localStorage.key(index);
			if (storedKey?.startsWith("cms.cache.v1.")) victims.push(storedKey);
		}
		for (const victim of victims) window.localStorage.removeItem(victim);
		window.localStorage.setItem(SWEEP_MARKER, String(Date.now()));
	} catch {
		// Quota or private-mode failures must not break the UI.
	}
}

function storageKey(key: string): string {
	return `cms.cache.v${STORAGE_VERSION}.${key}`;
}

function readCached<T>(
	key: string,
	options: { maxAgeMs: number; persist: boolean; validate?: (data: unknown) => boolean },
): Snapshot<T> {
	const empty: Snapshot<T> = { attempt: 0, data: null, key, updatedAt: null };
	const memory = MEMORY.get(key);
	const candidate: { data: unknown; updatedAt: unknown } | undefined = memory ?? readStorage(key);
	if (!candidate) return empty;
	if (typeof candidate.updatedAt !== "number" || !Number.isFinite(candidate.updatedAt)) {
		return empty;
	}
	if (Date.now() - candidate.updatedAt > options.maxAgeMs) return empty;
	if (options.validate && !options.validate(candidate.data)) return empty;
	if (memory === undefined && options.persist) {
		MEMORY.set(key, { data: candidate.data, updatedAt: candidate.updatedAt });
	}
	return { attempt: 0, data: candidate.data as T, key, updatedAt: candidate.updatedAt };
}

function readStorage(key: string): { data: unknown; updatedAt: unknown } | undefined {
	if (typeof window === "undefined") return undefined;
	sweepLegacyCaches();
	try {
		const raw = window.localStorage.getItem(storageKey(key));
		if (!raw) return undefined;
		const parsed = JSON.parse(raw) as { data?: unknown; updatedAt?: unknown; version?: unknown };
		if (!parsed || typeof parsed !== "object") return undefined;
		if (parsed.version !== STORAGE_VERSION || !("data" in parsed)) return undefined;
		return { data: parsed.data, updatedAt: parsed.updatedAt };
	} catch {
		return undefined;
	}
}

function writeCached<T>(key: string, data: T, persist: boolean): number {
	const updatedAt = Date.now();
	MEMORY.set(key, { data, updatedAt });
	if (persist && typeof window !== "undefined") {
		try {
			window.localStorage.setItem(
				storageKey(key),
				JSON.stringify({ data, updatedAt, version: STORAGE_VERSION }),
			);
		} catch {
			// Quota or private-mode failures must not break the UI.
		}
	}
	return updatedAt;
}

export function useCachedFetch<T>(
	key: string,
	fetcher: (signal?: AbortSignal) => Promise<T>,
	options?: UseCachedFetchOptions,
): UseCachedFetchResult<T> {
	const enabled = options?.enabled ?? true;
	const errorMessage = options?.errorMessage;
	const maxAgeMs = options?.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
	const persist = options?.persist ?? false;
	const toastOnBackgroundError = options?.toastOnBackgroundError ?? true;
	const validate = options?.validate;

	const [snapshot, setSnapshot] = useState<Snapshot<T>>(() =>
		readCached<T>(key, { maxAgeMs, persist, validate }),
	);
	const [error, setError] = useState<string | null>(null);
	const [nonce, setNonce] = useState(0);
	const [pending, setPending] = useState(false);

	// Fetcher stays in a ref so route call sites can pass inline closures
	// without forcing every consumer onto useCallback. Boring fetch per mount.
	const fetcherRef = useRef(fetcher);
	useEffect(() => {
		fetcherRef.current = fetcher;
	});

	// Reset on key change via effect — never setState during render.
	useEffect(() => {
		if (snapshot.key === key) return;
		setSnapshot(readCached<T>(key, { maxAgeMs, persist, validate }));
	}, [key, maxAgeMs, persist, snapshot.key, validate]);

	const refresh = useCallback(() => {
		setNonce((value) => value + 1);
	}, []);

	useEffect(() => {
		// Each manual refresh bumps `nonce`, so `attempt` identifies this run. A slower
		// overlapping run must not overwrite state settled by a newer attempt.
		const attempt = nonce;
		if (!enabled) {
			setPending(false);
			return;
		}
		const controller = new AbortController();
		let alive = true;
		setError(null);
		setPending(true);

		const run = async () => {
			try {
				const fresh = await fetcherRef.current(controller.signal);
				if (!alive || controller.signal.aborted) return;
				const stamp = writeCached<T>(key, fresh, persist);
				if (!alive || controller.signal.aborted) return;
				setSnapshot((current) =>
					current.key !== key || attempt < current.attempt
						? current
						: { attempt, data: fresh, key, updatedAt: stamp },
				);
				setError(null);
			} catch (e: unknown) {
				if (!alive || controller.signal.aborted) return;
				const message = e instanceof Error ? e.message : String(e);
				const cached = readCached<T>(key, { maxAgeMs, persist, validate });
				if (cached.data === null) setError(message);
				if (toastOnBackgroundError && cached.data === null) toast.error(errorMessage ?? message);
			} finally {
				if (alive && !controller.signal.aborted) setPending(false);
			}
		};

		void run();
		return () => {
			alive = false;
			controller.abort();
		};
	}, [enabled, errorMessage, key, maxAgeMs, nonce, persist, toastOnBackgroundError, validate]);

	const data = snapshot.key === key ? snapshot.data : null;
	const updatedAt = snapshot.key === key ? snapshot.updatedAt : null;
	const isLoading = pending && data === null;
	const isRefreshing = pending && data !== null;

	return { data, error, isLoading, isRefreshing, refresh, updatedAt };
}
