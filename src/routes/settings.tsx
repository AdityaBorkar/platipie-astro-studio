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
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "#/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "#/components/ui/field";
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
import { useTheme } from "#/hooks/use-theme";

export const Route = createFileRoute("/settings")({
	component: SettingsPage,
	head: () => ({ meta: [{ title: "Settings · platipie-cms" }] }),
});

const sections = [
	{ href: "#environment", icon: DatabaseIcon, label: "Environment" },
	{ href: "#appearance", icon: PaletteIcon, label: "Appearance" },
	{ href: "#astro", icon: CogIcon, label: "Astro Settings" },
	{ href: "#typed-form", icon: Settings2Icon, label: "Typed form" },
	{ href: "#advanced", icon: Code2Icon, label: "Advanced" },
	{ href: "#trash", icon: Trash2Icon, label: "Trash" },
];

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

function parseList(raw: string): string[] {
	try {
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.map(String) : [];
	} catch {
		return [];
	}
}

function parseRecord(raw: string): Record<string, string> {
	try {
		const parsed: unknown = JSON.parse(raw);
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
			return parsed as Record<string, string>;
		}
		return {};
	} catch {
		return {};
	}
}

function SettingsPage() {
	const { resolved } = useTheme();
	const [raw, setRaw] = useState("");
	const [values, setValues] = useState<Record<string, any>>({});
	const [mtime, setMtime] = useState(0);
	const [env, setEnv] = useState<any>(null);
	const [msg, setMsg] = useState<string | null>(null);
	const [err, setErr] = useState<string | null>(null);
	const [trash, setTrash] = useState<{ path: string }[]>([]);
	const [astro, setAstro] = useState<AstroSettings | null>(null);
	const [astroSync, setAstroSync] = useState<number | null>(null);
	const [loaded, setLoaded] = useState(false);
	const [rawDialogOpen, setRawDialogOpen] = useState(false);
	const [activeSection, setActiveSection] = useState("environment");

	const load = useCallback(async () => {
		const response = await fetch("/api/cms/settings");
		const json = await response.json();
		setRaw(json.raw);
		setValues(json.values ?? {});
		setMtime(json.mtime);
		setEnv(json.env);
		const trashResponse = await fetch("/api/cms/restore")
			.then((value) => value.json())
			.catch(() => ({ trash: [] }));
		setTrash(trashResponse.trash ?? []);
		const astroResponse = await fetch("/api/cms/inventory?scope=astro")
			.then((value) => value.json())
			.catch(() => ({ rows: [], status: [] }));
		const astroRows = (astroResponse.rows ?? []) as AstroSettings[];
		setAstro(astroRows[0] ?? null);
		const astroStatus = (astroResponse.status ?? []) as {
			lastSync: number | null;
			scope: string;
		}[];
		setAstroSync(astroStatus.find((entry) => entry.scope === "astro")?.lastSync ?? null);
		setLoaded(true);
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	async function saveRaw() {
		setErr(null);
		setMsg(null);
		const response = await fetch("/api/cms/settings", {
			body: JSON.stringify({ mtime, raw }),
			headers: { "Content-Type": "application/json" },
			method: "PUT",
		});
		const json = await response.json();
		if (!response.ok) {
			const message =
				json.code === "CONFLICT"
					? "Conflict (409): constants changed — reload then retry with force"
					: json.message;
			setErr(message);
			toast.error(message);
			return;
		}
		setMtime(json.mtime);
		setMsg("Settings saved (raw)");
		toast.success("Settings saved (raw)");
	}

	async function saveForm() {
		setErr(null);
		setMsg(null);
		const response = await fetch("/api/cms/settings", {
			body: JSON.stringify({ mtime, values }),
			headers: { "Content-Type": "application/json" },
			method: "PUT",
		});
		const json = await response.json();
		if (!response.ok) {
			setErr(json.message);
			toast.error(json.message);
			return;
		}
		setMtime(json.mtime);
		setRaw(json.raw);
		setMsg("Settings saved (typed form)");
		toast.success("Settings saved (typed form)");
	}

	async function restoreTrash(trashPath: string) {
		const response = await fetch("/api/cms/restore", {
			body: JSON.stringify({ trashPath }),
			headers: { "Content-Type": "application/json" },
			method: "POST",
		});
		const json = await response.json();
		const message = response.ok ? `Restored → ${json.path}` : json.message;
		setMsg(message);
		if (response.ok) toast.success(message);
		else toast.error(message);
		void load();
	}

	if (!loaded) {
		return (
			<div className="mx-auto w-page px-5 py-10">
				<Skeleton className="h-10 w-56" />
				<Skeleton className="mt-6 h-48 w-full" />
				<Skeleton className="mt-4 h-64 w-full" />
			</div>
		);
	}

	return (
		<div className="mx-auto w-page px-5 py-8 sm:py-10">
			<div className="animate-rise flex flex-wrap items-end justify-between gap-5">
				<div>
					<p className="text-11 font-bold tracking-14 text-brand uppercase">Configuration</p>
					<h1 className="gb-display mt-2 text-3xl sm:text-display-sm">Settings</h1>
					<p className="gb-sub mt-3 max-w-xl text-base">
						Environment, typed constants, raw TypeScript, and the soft-delete queue — all in one
						quiet surface.
					</p>
				</div>
				<Button onClick={() => void load()} size="sm" variant="outline">
					<RefreshCwIcon className="size-3.5" />
					Reload
				</Button>
			</div>

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
											? "flex items-center gap-2 rounded-md border-l-2 border-brand bg-brand-soft px-2.5 py-1.5 text-sm font-semibold text-brand"
											: "flex items-center gap-2 rounded-md border-l-2 border-transparent px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
									<Badge className="font-mono" variant="outline">
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
											{parseList(astro.integrations).length} integrations
										</Badge>
										<Badge className="font-mono" variant="secondary">
											{Object.keys(parseRecord(astro.redirects)).length} redirects
										</Badge>
										<Badge className="font-mono" variant="success">
											{astroSync
												? `synced ${new Date(astroSync).toLocaleString()}`
												: "never synced"}
										</Badge>
									</div>
									{parseList(astro.integrations).length > 0 ? (
										<div className="flex flex-wrap gap-1">
											{parseList(astro.integrations).map((integration) => (
												<Badge className="font-mono" key={integration} variant="outline">
													{integration}
												</Badge>
											))}
										</div>
									) : null}
									{Object.keys(parseRecord(astro.redirects)).length > 0 ? (
										<Table>
											<TableHeader>
												<TableRow className="bg-muted/40 hover:bg-muted/40">
													<TableHead>From</TableHead>
													<TableHead className="text-right">To</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{Object.entries(parseRecord(astro.redirects)).map(([from, to]) => (
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
										onChange={(event) => {
											try {
												setValues((previous) => ({
													...previous,
													PRICING: JSON.parse(event.target.value),
												}));
											} catch {
												/* keep typing */
											}
										}}
										value={JSON.stringify(values.PRICING ?? {}, null, 2)}
									/>
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
								<Empty>
									<EmptyHeader>
										<EmptyTitle>Trash is empty</EmptyTitle>
										<EmptyDescription>Deleted entries will show up here.</EmptyDescription>
									</EmptyHeader>
								</Empty>
							) : (
								<Table>
									<TableHeader>
										<TableRow className="bg-muted/40 hover:bg-muted/40">
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
		</div>
	);
}
