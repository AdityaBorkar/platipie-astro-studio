import { Editor } from "@monaco-editor/react";
import { createFileRoute } from "@tanstack/react-router";
import { TriangleAlertIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
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

export const Route = createFileRoute("/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	const [raw, setRaw] = useState("");
	const [values, setValues] = useState<Record<string, any>>({});
	const [mtime, setMtime] = useState(0);
	const [env, setEnv] = useState<any>(null);
	const [blog, setBlog] = useState<any>(null);
	const [msg, setMsg] = useState<string | null>(null);
	const [err, setErr] = useState<string | null>(null);
	const [trash, setTrash] = useState<{ path: string }[]>([]);
	const [loaded, setLoaded] = useState(false);
	const [rawDialogOpen, setRawDialogOpen] = useState(false);
	const [registerDialogOpen, setRegisterDialogOpen] = useState(false);

	const load = useCallback(async () => {
		const r = await fetch("/api/cms/settings");
		const j = await r.json();
		setRaw(j.raw);
		setValues(j.values ?? {});
		setMtime(j.mtime);
		setEnv(j.env);
		setBlog(j.blog);
		const t = await fetch("/api/cms/restore")
			.then((x) => x.json())
			.catch(() => ({ trash: [] }));
		setTrash(t.trash ?? []);
		setLoaded(true);
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	async function saveRaw() {
		setErr(null);
		setMsg(null);
		const r = await fetch("/api/cms/settings", {
			body: JSON.stringify({ mtime, raw }),
			headers: { "Content-Type": "application/json" },
			method: "PUT",
		});
		const j = await r.json();
		if (!r.ok) {
			const message =
				j.code === "CONFLICT"
					? "Conflict (409): constants changed — reload then retry with force"
					: j.message;
			setErr(message);
			toast.error(message);
			return;
		}
		setMtime(j.mtime);
		setMsg("Settings saved (raw)");
		toast.success("Settings saved (raw)");
	}

	async function saveForm() {
		setErr(null);
		setMsg(null);
		const r = await fetch("/api/cms/settings", {
			body: JSON.stringify({ mtime, values }),
			headers: { "Content-Type": "application/json" },
			method: "PUT",
		});
		const j = await r.json();
		if (!r.ok) {
			setErr(j.message);
			toast.error(j.message);
			return;
		}
		setMtime(j.mtime);
		setRaw(j.raw);
		setMsg("Settings saved (typed form)");
		toast.success("Settings saved (typed form)");
	}

	if (!loaded) {
		return (
			<div className="grid gap-3">
				<Skeleton className="h-16 w-full" />
				<Skeleton className="h-64 w-full" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	return (
		<div className="grid gap-4">
			<h2 className="text-lg font-semibold tracking-tight">Settings</h2>
			{err && (
				<Alert variant="destructive">
					<TriangleAlertIcon />
					<AlertTitle>Error</AlertTitle>
					<AlertDescription>{err}</AlertDescription>
				</Alert>
			)}
			{msg && (
				<Alert>
					<AlertTitle>Saved</AlertTitle>
					<AlertDescription>{msg}</AlertDescription>
				</Alert>
			)}
			{env && (
				<Card>
					<CardContent className="flex flex-wrap items-center gap-1.5">
						<Badge className="font-mono" variant="outline">
							ASTRO_ROOT: {env.astroRoot} {env.astroRootReachable ? "✓ reachable" : "✗ missing"}
						</Badge>
						<Badge className="font-mono" variant="outline">
							ASTRO_URL: {env.astroUrl ?? "unset"}
						</Badge>
						<Badge variant={env.aiEnabled ? "default" : "secondary"}>
							AI: {env.aiEnabled ? "enabled (BYOK)" : "disabled"}
						</Badge>
						<Badge className="font-mono" variant="secondary">
							PORT {env.port} · TRASH_TTL {env.trashTtlDays}d
						</Badge>
					</CardContent>
				</Card>
			)}
			<Card>
				<CardHeader>
					<CardTitle>Typed form</CardTitle>
					<CardDescription>Edit the known settings fields with validation.</CardDescription>
				</CardHeader>
				<CardContent>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="site-url">SITE_URL</FieldLabel>
							<Input
								id="site-url"
								onChange={(e) => setValues((p) => ({ ...p, SITE_URL: e.target.value }))}
								value={String(values.SITE_URL ?? "")}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="labs-url">LABS_URL</FieldLabel>
							<Input
								id="labs-url"
								onChange={(e) => setValues((p) => ({ ...p, LABS_URL: e.target.value }))}
								value={String(values.LABS_URL ?? "")}
							/>
						</Field>
						<Field orientation="horizontal">
							<FieldLabel htmlFor="available-now">IS_AVAILABLE_NOW</FieldLabel>
							<Switch
								checked={Boolean(values.IS_AVAILABLE_NOW ?? true)}
								id="available-now"
								onCheckedChange={(checked) =>
									setValues((p) => ({ ...p, IS_AVAILABLE_NOW: checked }))
								}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="socials-email">SOCIALS.email</FieldLabel>
							<Input
								id="socials-email"
								onChange={(e) =>
									setValues((p) => ({ ...p, SOCIALS: { ...p.SOCIALS, email: e.target.value } }))
								}
								value={String(values.SOCIALS?.email ?? "")}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="pricing">PRICING (JSON)</FieldLabel>
							<Textarea
								className="font-mono"
								id="pricing"
								onChange={(e) => {
									try {
										setValues((p) => ({ ...p, PRICING: JSON.parse(e.target.value) }));
									} catch {
										/* keep typing */
									}
								}}
								value={JSON.stringify(values.PRICING ?? {}, null, 2)}
							/>
						</Field>
						<div className="flex flex-wrap items-center gap-2">
							<Button onClick={() => void saveForm()}>Save typed form</Button>
						</div>
					</FieldGroup>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Advanced: raw TS (Monaco)</CardTitle>
					<CardDescription>
						Direct edit of cms/constants.ts. Requires danger-zone confirmation.
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-3">
					<Editor
						height="420px"
						language="typescript"
						onChange={(v) => setRaw(v ?? "")}
						value={raw}
					/>
					<div className="flex flex-wrap items-center gap-2">
						<Button onClick={() => setRawDialogOpen(true)}>Save raw (danger zone)</Button>
						<Button onClick={() => void load()} variant="outline">
							Reload
						</Button>
					</div>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Blog registration (§5.1)</CardTitle>
					<CardDescription>
						registered: {String(blog?.registered)} · projectsExtended:{" "}
						{String(blog?.projectsExtended)} · {blog?.path}
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-wrap items-center gap-2">
					<Button onClick={() => setRegisterDialogOpen(true)} variant="outline">
						Register blog collection
					</Button>
					<Button
						onClick={() => {
							fetch("/api/cms/collections/blog/register", {
								body: JSON.stringify({ widenGlobs: true }),
								headers: { "Content-Type": "application/json" },
								method: "POST",
							})
								.then(async (r) => ({ body: await r.json(), ok: r.ok }))
								.then(({ body, ok }) => {
									const message = ok ? `Widened=${body.widened}` : body.message;
									setMsg(message);
									if (ok) toast.success(message);
									else toast.error(message);
								})
								.catch((e: unknown) => toast.error(String(e)));
						}}
						variant="ghost"
					>
						Widen globs to MDX
					</Button>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Trash</CardTitle>
					<CardDescription>
						{trash.length} soft-deleted {trash.length === 1 ? "entry" : "entries"}
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
								<TableRow>
									<TableHead>Path</TableHead>
									<TableHead className="w-28">Action</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{trash.slice(0, 50).map((t) => (
									<TableRow key={t.path}>
										<TableCell className="font-mono">{t.path}</TableCell>
										<TableCell>
											<Button
												onClick={() => {
													fetch("/api/cms/restore", {
														body: JSON.stringify({ trashPath: t.path }),
														headers: { "Content-Type": "application/json" },
														method: "POST",
													})
														.then(async (r) => ({ body: await r.json(), ok: r.ok }))
														.then(({ body, ok }) => {
															const message = ok ? `Restored → ${body.path}` : body.message;
															setMsg(message);
															if (ok) toast.success(message);
															else toast.error(message);
															void load();
														})
														.catch((e: unknown) => toast.error(String(e)));
												}}
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
						>
							Save raw
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog onOpenChange={setRegisterDialogOpen} open={registerDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Register blog collection?</AlertDialogTitle>
						<AlertDialogDescription>
							Danger zone: merges blog collection + projects extension into content.config.ts.
							Continue?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<Button
							onClick={() => {
								setRegisterDialogOpen(false);
								fetch("/api/cms/collections/blog/register", {
									body: "{}",
									headers: { "Content-Type": "application/json" },
									method: "POST",
								})
									.then(async (r) => ({ body: await r.json(), ok: r.ok }))
									.then(({ body, ok }) => {
										const message = ok
											? `Register: already=${body.already} backup=${body.backup}`
											: body.message;
										setMsg(message);
										if (ok) toast.success(message);
										else toast.error(message);
										void load();
									})
									.catch((e: unknown) => toast.error(String(e)));
							}}
						>
							Register
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
