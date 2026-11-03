import { Editor } from "@monaco-editor/react";
import { createFileRoute } from "@tanstack/react-router";
import {
	Code2Icon,
	CogIcon,
	DatabaseIcon,
	PaletteIcon,
	RefreshCwIcon,
	SaveIcon,
	Settings2Icon,
	Trash2Icon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Hint } from "#/components/gitbook/hint";
import { EmptyState, PageHeader, PageShell, SyncBadge } from "#/components/gitbook/page";
import { LiveBadge } from "#/components/live-badge";
import { ThemeToggle } from "#/components/theme-toggle";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Skeleton } from "#/components/ui/skeleton";
import { Switch } from "#/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { Textarea } from "#/components/ui/textarea";
import { fetchJson, useCachedFetch } from "#/hooks/use-cached-fetch";
import { useTheme } from "#/hooks/use-theme";
import { cmsKeys } from "./cms-keys";

export const Route = createFileRoute("/settings")({
	component: SettingsPage,
	head: () => ({ meta: [{ title: "Settings · platipie-astro-studio" }] }),
});

const sections = [
	{ href: "#environment", icon: DatabaseIcon, label: "Environment" },
	{ href: "#appearance", icon: PaletteIcon, label: "Appearance" },
	{ href: "#astro", icon: CogIcon, label: "Astro Settings" },
	{ href: "#typed-form", icon: Settings2Icon, label: "Typed form" },
	{ href: "#advanced", icon: Code2Icon, label: "Advanced" },
	{ href: "#trash", icon: Trash2Icon, label: "Trash" },
];

export interface SettingsValues {
	IS_AVAILABLE_NOW?: boolean;
	LABS_URL?: string;
	PRICING?: unknown;
	SITE_URL?: string;
	SOCIALS?: Record<string, unknown>;
}

interface EnvInfo {
	aiEnabled: boolean;
	astroUrl: string | null;
	port: number;
	projectReachable: boolean;
	trashTtlDays: number;
}

interface AstroSettings {
	adapter: string | null;
	filePath: string;
	integrations: string;
	mtime: number;
	output: string | null;
	raw: string;
	redirects: string;
	site: string | null;
}

interface SettingsApiResponse {
	env: EnvInfo;
	mtime: number;
	raw: string;
	values?: SettingsValues;
}

function parseStringArray(raw: string, fallback: string[] = []): string[] {
	try {
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed)
			? parsed.filter((entry): entry is string => typeof entry === "string")
			: fallback;
	} catch {
		return fallback;
	}
}

function parseStringRecord(
	raw: string,
	fallback: Record<string, string> = {},
): Record<string, string> {
	try {
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
			return fallback;
		}
		const out: Record<string, string> = {};
		for (const [key, value] of Object.entries(parsed)) {
			if (typeof value === "string") out[key] = value;
		}
		return out;
	} catch {
		return fallback;
	}
}

function SettingsPage() {
	const { resolved } = useTheme();
	const [raw, setRaw] = useState("");
	const [values, setValues] = useState<SettingsValues>({});
	const [pricingRaw, setPricingRaw] = useState<string | null>(null);
	const [pricingError, setPricingError] = useState<string | null>(null);
	const [mtime, setMtime] = useState(0);
	const [msg, setMsg] = useState<string | null>(null);
	const [err, setErr] = useState<string | null>(null);
	const [rawDialogOpen, setRawDialogOpen] = useState(false);
	const [activeSection, setActiveSection] = useState("environment");
	const [initialized, setInitialized] = useState(false);

	const fetchSettings = useCallback(() => fetchJson<SettingsApiResponse>(cmsKeys.settings), []);
	const fetchTrash = useCallback(
		() => fetchJson<{ trash: { path: string }[] }>(cmsKeys.restore),
		[],
	);
	const fetchAstro = useCallback(
		() =>
			fetchJson<{ rows: AstroSettings[]; status: { lastSync: number | null; scope: string }[] }>(
				cmsKeys.inventory("astro"),
			),
		[],
	);
	const settingsQuery = useCachedFetch(cmsKeys.settings, fetchSettings, {
		errorMessage: "Could not refresh settings",
	});
	const trashQuery = useCachedFetch(cmsKeys.restore, fetchTrash, {
		errorMessage: "Could not refresh trash",
		toastOnBackgroundError: false,
	});
	const astroQuery = useCachedFetch(cmsKeys.inventory("astro"), fetchAstro, {
		errorMessage: "Could not refresh Astro settings",
		toastOnBackgroundError: false,
	});

	const env = settingsQuery.data?.env ?? null;
	const trash = trashQuery.data?.trash ?? [];
	const astro = astroQuery.data?.rows[0] ?? null;
	const astroSync =
		astroQuery.data?.status.find((entry) => entry.scope === "astro")?.lastSync ?? null;
	const loaded = settingsQuery.data !== null;
	const refreshing =
		astroQuery.isRefreshing || settingsQuery.isRefreshing || trashQuery.isRefreshing;

	useEffect(() => {
		if (!initialized && settingsQuery.data) {
			setRaw(settingsQuery.data.raw);
			setValues(settingsQuery.data.values ?? {});
			setPricingRaw(null);
			setPricingError(null);
			setMtime(settingsQuery.data.mtime);
			setInitialized(true);
		}
	}, [initialized, settingsQuery.data]);

	const load = useCallback(() => {
		setInitialized(false);
		astroQuery.refresh();
		settingsQuery.refresh();
		trashQuery.refresh();
	}, [astroQuery, settingsQuery, trashQuery]);

	async function saveSettings(
		payload: { raw: string } | { values: SettingsValues },
		label: string,
	): Promise<boolean> {
		setErr(null);
		setMsg(null);
		try {
			const json = await fetchJson<{ mtime: number; raw?: string }>(cmsKeys.settings, {
				body: JSON.stringify({ mtime, ...payload }),
				headers: { "Content-Type": "application/json" },
				method: "PUT",
			});
			setMtime(json.mtime);
			if (typeof json.raw === "string") setRaw(json.raw);
			setPricingRaw(null);
			setPricingError(null);
			setMsg(`Settings saved (${label})`);
			toast.success(`Settings saved (${label})`);
			settingsQuery.refresh();
			return true;
		} catch (e: unknown) {
			const code = (e as { code?: unknown }).code;
			const message =
				code === "CONFLICT"
					? "Conflict (409): constants changed — reload then retry with force"
					: e instanceof Error
						? e.message
						: String(e);
			setErr(message);
			toast.error(message);
			return false;
		}
	}

	async function saveRaw() {
		await saveSettings({ raw }, "raw");
	}

	async function saveForm() {
		let next = values;
		if (pricingRaw !== null) {
			try {
				const parsed: unknown = JSON.parse(pricingRaw);
				next = { ...values, PRICING: parsed };
				setPricingError(null);
			} catch {
				const message = "PRICING is not valid JSON — fix it before saving.";
				setPricingError(message);
				setErr(message);
				return;
			}
		}
		// Only adopt the parsed PRICING into form state after the save
		// succeeds, so a failed PUT never leaves unpersisted values on screen.
		const ok = await saveSettings({ values: next }, "typed form");
		if (ok) setValues(next);
	}

	async function restoreTrash(trashPath: string) {
		try {
			const json = await fetchJson<{ path: string }>(cmsKeys.restore, {
				body: JSON.stringify({ trashPath }),
				headers: { "Content-Type": "application/json" },
				method: "POST",
			});
			const message = `Restored → ${json.path}`;
			setMsg(message);
			toast.success(message);
		} catch (e: unknown) {
			const message = e instanceof Error ? e.message : String(e);
			setMsg(message);
			toast.error(message);
		}
		trashQuery.refresh();
	}

	if (!loaded) {
		return (
			<PageShell>
				<div className="grid gap-4">
					<Skeleton className="h-10 w-56" />
					<Skeleton className="h-5 w-96 max-w-full" />
					<Skeleton className="mt-2 h-48 w-full" />
					<Skeleton className="h-64 w-full" />
				</div>
			</PageShell>
		);
	}

	return (
		<PageShell>
			<PageHeader
				actions={
					<>
						<LiveBadge refreshing={refreshing} />
						<Button onClick={() => load()} size="sm" variant="outline">
							<RefreshCwIcon className="size-3.5" />
							Reload
						</Button>
					</>
				}
				description="Environment, typed constants, raw TypeScript, and the soft-delete queue — all in one quiet surface."
				eyebrow="Configuration"
				title="Settings"
			/>

			<div className="mt-6 grid gap-6 lg:grid-cols-settings">
				<aside className="hidden lg:block">
					<nav aria-label="Settings sections" className="sticky top-24 grid gap-0.5">
						{sections.map((section) => {
							const Icon = section.icon;
							const isActive = activeSection === section.href.slice(1);
							return (
								<a
									aria-current={isActive ? "true" : undefined}
									className={
										isActive
											? "flex items-center gap-2 rounded-md border-l-2 border-brand bg-brand-soft px-2.5 py-1.5 text-sm font-semibold text-brand outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
											: "flex items-center gap-2 rounded-md border-l-2 border-transparent px-2.5 py-1.5 text-sm text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30"
									}
									href={section.href}
									key={section.href}
									onClick={() => setActiveSection(section.href.slice(1))}
								>
									<Icon className="size-3.5" />
									{section.label}
								</a>
							);
						})}
					</nav>
				</aside>

				<div className="grid min-w-0 gap-4">
					{err ? (
						<Hint title="Error" variant="danger">
							{err}
						</Hint>
					) : null}
					{msg ? (
						<Hint title="Saved" variant="success">
							{msg}
						</Hint>
					) : null}

					<Card id="environment">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<DatabaseIcon className="size-4 text-brand" />
								Environment
							</CardTitle>
							<CardDescription>
								Runtime values are read from <code>.env</code> and the Astro repo jail.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-wrap items-center gap-1.5">
							{env ? (
								<>
									<Badge
										className="font-mono"
										variant={env.projectReachable ? "success" : "destructive"}
									>
										Project {env.projectReachable ? "✓ reachable" : "✗ missing"}
									</Badge>
									<Badge className="max-w-full truncate font-mono" variant="outline">
										ASTRO_URL {env.astroUrl ?? "unset"}
									</Badge>
									<Badge variant={env.aiEnabled ? "brand" : "secondary"}>
										AI {env.aiEnabled ? "enabled · BYOK" : "disabled"}
									</Badge>
									<Badge className="font-mono" variant="secondary">
										PORT {env.port} · TRASH_TTL {env.trashTtlDays}d
									</Badge>
								</>
							) : null}
						</CardContent>
					</Card>

					<Card id="appearance">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<PaletteIcon className="size-4 text-brand" />
								Appearance
							</CardTitle>
							<CardDescription>
								The theme switcher lives here now. The choice is stored in this browser and applied
								before paint.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex flex-wrap items-center justify-between gap-3">
								<div>
									<p className="text-sm font-semibold">Theme</p>
									<p className="text-xs text-muted-foreground">
										Light, dark, or follow the system preference.
									</p>
								</div>
								<ThemeToggle />
							</div>
						</CardContent>
					</Card>

					<Card id="astro">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<CogIcon className="size-4 text-brand" />
								Astro Settings
							</CardTitle>
							<CardDescription>
								Parsed from <code>{astro?.filePath ?? "astro.config.mjs"}</code> in the Astro
								checkout · mirrored into SQLite by the FS watcher · read-only in V1.
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-3">
							{astro ? (
								<>
									<div className="flex flex-wrap items-center gap-1.5">
										<Badge className="font-mono" variant="outline">
											site {astro.site ?? "unset"}
										</Badge>
										<Badge className="font-mono" variant="outline">
											output {astro.output ?? "unset"}
										</Badge>
										<Badge className="font-mono" variant="outline">
											adapter {astro.adapter ?? "unset"}
										</Badge>
										<Badge className="font-mono" variant="secondary">
											{parseStringArray(astro.integrations).length} integrations
										</Badge>
										<Badge className="font-mono" variant="secondary">
											{Object.keys(parseStringRecord(astro.redirects)).length} redirects
										</Badge>
										<SyncBadge lastSync={astroSync} />
									</div>
									{parseStringArray(astro.integrations).length > 0 ? (
										<div className="flex flex-wrap gap-1">
											{parseStringArray(astro.integrations).map((integration) => (
												<Badge className="font-mono" key={integration} variant="outline">
													{integration}
												</Badge>
											))}
										</div>
									) : null}
									{Object.keys(parseStringRecord(astro.redirects)).length > 0 ? (
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead>From</TableHead>
													<TableHead className="text-right">To</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{Object.entries(parseStringRecord(astro.redirects)).map(([from, to]) => (
													<TableRow key={from}>
														<TableCell className="font-mono text-xs">{from}</TableCell>
														<TableCell className="text-right font-mono text-xs">{to}</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									) : null}
									<pre className="code-surface max-h-96 overflow-auto p-3 font-mono text-10 whitespace-pre-wrap">
										{astro.raw}
									</pre>
									<Hint title="Read-only" variant="info">
										Editing <code>astro.config.mjs</code> from the CMS is out of scope for V1 —
										change it in the Astro checkout. The watcher re-syncs this view on save.
									</Hint>
								</>
							) : (
								<Hint title="Astro config not mirrored yet" variant="info">
									Run <code>bun run sync:once</code> to parse <code>astro.config.mjs</code> into the
									SQLite mirror.
								</Hint>
							)}
						</CardContent>
					</Card>

					<Card id="typed-form">
						<CardHeader>
							<CardTitle>Typed form</CardTitle>
							<CardDescription>
								Edit the known settings fields. Validation runs before anything is written.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<FieldGroup className="gap-4">
								<Field>
									<FieldLabel htmlFor="site-url">SITE_URL</FieldLabel>
									<Input
										id="site-url"
										onChange={(event) =>
											setValues((previous) => ({ ...previous, SITE_URL: event.target.value }))
										}
										value={String(values.SITE_URL ?? "")}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="labs-url">LABS_URL</FieldLabel>
									<Input
										id="labs-url"
										onChange={(event) =>
											setValues((previous) => ({ ...previous, LABS_URL: event.target.value }))
										}
										value={String(values.LABS_URL ?? "")}
									/>
								</Field>
								<Field orientation="horizontal">
									<FieldLabel htmlFor="available-now">IS_AVAILABLE_NOW</FieldLabel>
									<Switch
										checked={Boolean(values.IS_AVAILABLE_NOW ?? true)}
										id="available-now"
										onCheckedChange={(checked) =>
											setValues((previous) => ({ ...previous, IS_AVAILABLE_NOW: checked }))
										}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="socials-email">SOCIALS.email</FieldLabel>
									<Input
										id="socials-email"
										onChange={(event) =>
											setValues((previous) => ({
												...previous,
												SOCIALS: { ...previous.SOCIALS, email: event.target.value },
											}))
										}
										value={String(values.SOCIALS?.email ?? "")}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="pricing">PRICING (JSON)</FieldLabel>
									<Textarea
										className="min-h-40 font-mono text-xs"
										id="pricing"
										onBlur={(event) => {
											try {
												JSON.parse(event.target.value);
												setPricingError(null);
											} catch {
												setPricingError("PRICING is not valid JSON yet.");
											}
										}}
										onChange={(event) => {
											const text = event.target.value;
											setPricingRaw(text);
											try {
												JSON.parse(text);
												setPricingError(null);
											} catch {
												setPricingError(
													"Invalid JSON — keep typing; save is blocked until it parses.",
												);
											}
										}}
										value={pricingRaw ?? JSON.stringify(values.PRICING ?? {}, null, 2)}
									/>
									{pricingError ? <FieldError>{pricingError}</FieldError> : null}
								</Field>
								<div>
									<Button onClick={() => void saveForm()}>
										<SaveIcon className="size-3.5" />
										Save typed form
									</Button>
								</div>
							</FieldGroup>
						</CardContent>
					</Card>

					<Card id="advanced">
						<CardHeader>
							<CardTitle>Advanced: raw TypeScript</CardTitle>
							<CardDescription>
								Direct edit of <code>cms/constants.ts</code>. Requires danger-zone confirmation.
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-3">
							<div className="overflow-hidden rounded-lg border border-border">
								<Editor
									height="380px"
									language="typescript"
									onChange={(value) => setRaw(value ?? "")}
									options={{
										fontFamily: "Geist Mono Variable, monospace",
										fontSize: 12,
										minimap: { enabled: false },
										scrollBeyondLastLine: false,
									}}
									theme={resolved === "dark" ? "vs-dark" : "vs"}
									value={raw}
								/>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<Button onClick={() => setRawDialogOpen(true)} variant="destructive">
									Save raw (danger zone)
								</Button>
								<Button onClick={() => void load()} variant="outline">
									Reload
								</Button>
							</div>
						</CardContent>
					</Card>

					<Card id="trash">
						<CardHeader>
							<CardTitle>Trash</CardTitle>
							<CardDescription>
								{trash.length} soft-deleted {trash.length === 1 ? "entry" : "entries"} · restores
								back into the repo
							</CardDescription>
						</CardHeader>
						<CardContent>
							{trash.length === 0 ? (
								<EmptyState
									compact
									description="Deleted entries will show up here."
									icon={Trash2Icon}
									title="Trash is empty"
								/>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Path</TableHead>
											<TableHead className="w-28 text-right">Action</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{trash.slice(0, 50).map((entry) => (
											<TableRow key={entry.path}>
												<TableCell className="font-mono text-xs">{entry.path}</TableCell>
												<TableCell className="text-right">
													<Button
														onClick={() => void restoreTrash(entry.path)}
														size="sm"
														variant="outline"
													>
														Restore
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</div>
			</div>

			<AlertDialog onOpenChange={setRawDialogOpen} open={rawDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Save raw constants?</AlertDialogTitle>
						<AlertDialogDescription>
							Danger zone: raw TS edit rewrites cms/constants.ts. Continue?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<Button
							onClick={() => {
								setRawDialogOpen(false);
								void saveRaw();
							}}
							variant="destructive"
						>
							Save raw
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</PageShell>
	);
}
