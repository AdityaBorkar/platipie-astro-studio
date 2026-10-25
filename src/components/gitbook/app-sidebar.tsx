import { Link, useRouterState } from "@tanstack/react-router";
import type { LinkProps } from "@tanstack/react-router";
import {
	CheckIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	DatabaseIcon,
	FileTextIcon,
	GitBranchIcon,
	GlobeIcon,
	ImageIcon,
	LayoutDashboardIcon,
	MenuIcon,
	PaletteIcon,
	Settings2Icon,
	ShapesIcon,
	XIcon,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { setUiPref, useUiPref, useUiPrefs } from "#/hooks/use-ui-prefs";
import type { UiPrefKey } from "#/hooks/use-ui-prefs";
import { cn } from "#/lib/utils";
import { BrandMark } from "./brand";

interface ShellLink {
	description?: string;
	href: string;
	label: string;
}

interface WorkspacePayload {
	branch: string;
	pages: {
		dynamic: boolean;
		path: string;
		route: string;
		title: string;
		type: string;
	}[];
	project: string;
	reachable: boolean;
	root: string;
}

interface CollectionSummary {
	count: number;
	id: string;
	label: string;
	source: string;
}

const designLinks: ShellLink[] = [
	{
		description: "Overview of tokens, components, and patterns",
		href: "/design",
		label: "Design System",
	},
	{ href: "/design#brand", label: "Brand Guidelines" },
	{ href: "/design#style", label: "Style Guide" },
	{ href: "/design#languages", label: "Design Languages" },
	{ href: "/design#motion", label: "Animations" },
	{ href: "/design#viewports", label: "Viewports" },
	{ href: "/design#tokens", label: "Tokens" },
];

const componentLinks: ShellLink[] = [
	{ href: "/components", label: "Components" },
	{ href: "/components#synced", label: "Synced inventory" },
	{ href: "/components#templates", label: "Templates" },
	{ href: "/components#ui", label: "UI" },
];

function useWorkspace() {
	const [workspace, setWorkspace] = useState<WorkspacePayload | null>(null);
	useEffect(() => {
		let alive = true;
		fetch("/api/cms/workspace")
			.then((response) => response.json())
			.then((json: WorkspacePayload) => {
				if (alive) setWorkspace(json);
			})
			.catch(() => {});
		return () => {
			alive = false;
		};
	}, []);
	return workspace;
}

function useCollections(enabled: boolean) {
	const [collections, setCollections] = useState<CollectionSummary[]>([]);
	useEffect(() => {
		if (!enabled) return;
		let alive = true;
		fetch("/api/cms/collections")
			.then((response) => response.json())
			.then((json: { collections?: CollectionSummary[] }) => {
				if (alive) setCollections(json.collections ?? []);
			})
			.catch(() => {});
		return () => {
			alive = false;
		};
	}, [enabled]);
	return collections;
}

function AppLink({
	children,
	className,
	href,
	onClick,
}: {
	children: ReactNode;
	className?: string;
	href: string;
	onClick?: () => void;
}) {
	const hashAt = href.indexOf("#");
	if (hashAt >= 0) {
		const hash = href.slice(hashAt + 1);
		const to = href.slice(0, hashAt) || "/";
		return (
			<Link className={className} hash={hash} onClick={onClick} to={to as LinkProps["to"]}>
				{children}
			</Link>
		);
	}
	return (
		<Link className={className} onClick={onClick} to={href as LinkProps["to"]}>
			{children}
		</Link>
	);
}

function isActive(href: string, pathname: string, activeHref: string, exact: boolean) {
	const [path, hash] = href.split("#");
	if (path !== pathname) return false;
	if (!hash) return exact ? activeHref === path : true;
	if (!exact) return true;
	return activeHref.endsWith(`#${hash}`);
}

function useHash() {
	const routerHref = useRouterState({ select: (state) => state.location.href });
	const [browserHash, setBrowserHash] = useState("");
	useEffect(() => {
		const sync = () => setBrowserHash(window.location.hash);
		sync();
		window.addEventListener("hashchange", sync);
		return () => window.removeEventListener("hashchange", sync);
	}, []);
	const hashAt = routerHref.indexOf("#");
	const routerHash = hashAt >= 0 ? routerHref.slice(hashAt) : "";
	return routerHash || browserHash;
}

function SidebarLink({
	active,
	href,
	icon: Icon,
	label,
	onClick,
}: {
	active: boolean;
	href: string;
	icon: typeof LayoutDashboardIcon;
	label: string;
	onClick?: () => void;
}) {
	return (
		<li>
			<AppLink
				className={cn(
					"flex items-center gap-2 rounded-lg px-2 py-1.5 text-13 font-semibold transition-colors",
					active
						? "bg-sidebar-accent text-sidebar-accent-foreground"
						: "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
				)}
				href={href}
				onClick={onClick}
			>
				<Icon className="size-4 shrink-0" />
				<span className="truncate">{label}</span>
			</AppLink>
		</li>
	);
}

function SidebarChildLink({
	active,
	description,
	href,
	label,
	onClick,
}: {
	active: boolean;
	description?: string;
	href: string;
	label: string;
	onClick?: () => void;
}) {
	return (
		<li>
			<AppLink
				className={cn(
					"block rounded-md px-2 py-1 text-12 transition-colors",
					active
						? "bg-sidebar-accent font-semibold text-foreground"
						: "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
				)}
				href={href}
				onClick={onClick}
			>
				<span className="block truncate">{label}</span>
				{description ? (
					<span className="mt-0.5 block text-10 leading-snug text-muted-foreground">
						{description}
					</span>
				) : null}
			</AppLink>
		</li>
	);
}

function SidebarToggle({ label, pref }: { label: string; pref: UiPrefKey }) {
	const enabled = useUiPref(pref);
	return (
		<li>
			<button
				aria-checked={enabled}
				className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent"
				onClick={() => setUiPref(pref, !enabled)}
				role="switch"
				type="button"
			>
				<span
					aria-hidden="true"
					className={cn(
						"mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded border",
						enabled ? "border-brand bg-brand text-brand-foreground" : "border-input bg-background",
					)}
				>
					{enabled ? <CheckIcon className="size-3" /> : null}
				</span>
				<span className="block text-12 leading-snug font-medium text-foreground">{label}</span>
			</button>
		</li>
	);
}

function SidebarGroup({
	active,
	children,
	expanded,
	href,
	icon: Icon,
	id,
	label,
	onClick,
	onToggle,
}: {
	active: boolean;
	children: ReactNode;
	expanded: boolean;
	href: string;
	icon: typeof LayoutDashboardIcon;
	id: string;
	label: string;
	onClick?: () => void;
	onToggle: () => void;
}) {
	return (
		<li>
			<div className={cn("flex items-center gap-0.5 rounded-lg", active && "bg-sidebar-accent")}>
				<AppLink
					className={cn(
						"flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-13 font-semibold transition-colors",
						active
							? "text-sidebar-accent-foreground"
							: "text-muted-foreground hover:text-foreground",
					)}
					href={href}
					onClick={onClick}
				>
					<Icon className="size-4 shrink-0" />
					<span className="truncate">{label}</span>
				</AppLink>
				<button
					aria-controls={`sidebar-${id}`}
					aria-expanded={expanded}
					aria-label={`${expanded ? "Collapse" : "Expand"} ${label}`}
					className="mr-1 inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
					onClick={onToggle}
					type="button"
				>
					<ChevronRightIcon
						className={cn("size-3.5 transition-transform", expanded && "rotate-90")}
					/>
				</button>
			</div>
			{expanded ? (
				<ul
					className="mt-0.5 ml-3 grid gap-0.5 border-l border-sidebar-border pl-2"
					id={`sidebar-${id}`}
				>
					{children}
				</ul>
			) : null}
		</li>
	);
}

function MenuLink({
	description,
	href,
	icon: Icon,
	label,
	onClick,
}: {
	description?: string;
	href: string;
	icon: typeof LayoutDashboardIcon;
	label: string;
	onClick?: () => void;
}) {
	return (
		<li>
			<AppLink
				className="flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted"
				href={href}
				onClick={onClick}
			>
				<Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
				<span className="min-w-0">
					<span className="block text-12 font-semibold text-foreground">{label}</span>
					{description ? (
						<span className="mt-0.5 block text-10 leading-snug text-muted-foreground">
							{description}
						</span>
					) : null}
				</span>
			</AppLink>
		</li>
	);
}

function MenuGroup({
	children,
	description,
	href,
	icon: Icon,
	label,
	onClick,
}: {
	children: ReactNode;
	description: string;
	href: string;
	icon: typeof LayoutDashboardIcon;
	label: string;
	onClick?: () => void;
}) {
	return (
		<li>
			<AppLink
				className="flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted"
				href={href}
				onClick={onClick}
			>
				<Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
				<span className="min-w-0">
					<span className="block text-12 font-semibold text-foreground">{label}</span>
					<span className="mt-0.5 block text-10 leading-snug text-muted-foreground">
						{description}
					</span>
				</span>
			</AppLink>
			<ul className="mb-1 ml-3 grid gap-0.5 border-l border-border pl-2">{children}</ul>
		</li>
	);
}

function WorkspaceMenu({
	collections,
	onNavigate,
	workspace,
}: {
	collections: CollectionSummary[];
	onNavigate?: () => void;
	workspace: WorkspacePayload | null;
}) {
	const [open, setOpen] = useState(false);
	const prefs = useUiPrefs();
	const menuId = useId();
	const rootRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		function onPointerDown(event: PointerEvent) {
			if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
		}
		function onKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") setOpen(false);
		}
		document.addEventListener("pointerdown", onPointerDown);
		window.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [open]);

	function navigate() {
		setOpen(false);
		onNavigate?.();
	}

	return (
		<div className="relative" ref={rootRef}>
			<button
				aria-controls={menuId}
				aria-expanded={open}
				className="flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent"
				onClick={() => setOpen((value) => !value)}
				type="button"
			>
				<span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
					<BrandMark className="size-4" />
				</span>
				<span className="min-w-0 flex-1">
					<span className="block truncate text-13 font-bold tracking-tight">
						{workspace?.project ?? "platipie-cms"}
					</span>
					<span className="mt-0.5 flex items-center gap-1 text-10 text-muted-foreground">
						<GitBranchIcon className="size-3 shrink-0" />
						<span className="truncate">{workspace?.branch ?? "loading…"}</span>
						{workspace && !workspace.reachable ? (
							<span className="text-destructive">· offline</span>
						) : null}
					</span>
				</span>
				<ChevronDownIcon
					className={cn(
						"size-4 shrink-0 text-muted-foreground transition-transform duration-300",
						open && "rotate-180",
					)}
				/>
			</button>

			{open ? (
				<div
					className="animate-gb-pop absolute inset-x-0 top-full z-50 mt-1 max-h-workspace-menu overflow-y-auto rounded-xl border border-border bg-popover p-2 shadow-lift"
					id={menuId}
				>
					<p className="px-2 pt-1 pb-1.5 text-9 font-bold tracking-12 text-brand uppercase">
						Navigate
					</p>
					<ul className="grid gap-0.5">
						<MenuLink href="/" icon={LayoutDashboardIcon} label="Dashboard" onClick={navigate} />
						<MenuGroup
							description="Pages, SEO, page metadata, schema markup"
							href="/website"
							icon={GlobeIcon}
							label="Website"
							onClick={navigate}
						>
							<SidebarToggle label="Show pages in sidebar" pref="showPagesInSidebar" />
							<SidebarToggle
								label="Show SEO / Page Metadata / Schema Markup in right sidebar"
								pref="showWebsiteMeta"
							/>
						</MenuGroup>
						<MenuGroup
							description="Design System + Brand Guidelines + Style Guide + Design Languages + Animations + Viewports + Tokens"
							href="/design"
							icon={PaletteIcon}
							label="Design"
							onClick={navigate}
						>
							{designLinks.map((link) => (
								<SidebarChildLink
									active={false}
									href={link.href}
									key={link.label}
									label={link.label}
									onClick={navigate}
								/>
							))}
						</MenuGroup>
						<MenuGroup
							description="Components + Templates + UI"
							href="/components"
							icon={ShapesIcon}
							label="Components"
							onClick={navigate}
						>
							{componentLinks.map((link) => (
								<SidebarChildLink
									active={false}
									href={link.href}
									key={link.label}
									label={link.label}
									onClick={navigate}
								/>
							))}
						</MenuGroup>
						<MenuLink
							description="List of assets"
							href="/assets"
							icon={ImageIcon}
							label="Assets"
							onClick={navigate}
						/>
						<MenuGroup
							description="CMS entries, SEO, schema markup"
							href="/content"
							icon={DatabaseIcon}
							label="Content"
							onClick={navigate}
						>
							<SidebarToggle label="Show CMS" pref="showCms" />
							<SidebarToggle
								label="Show SEO + Schema Markup in right sidebar"
								pref="showContentSeo"
							/>
						</MenuGroup>
						<MenuLink href="/settings" icon={Settings2Icon} label="Settings" onClick={navigate} />
					</ul>
					{prefs.showCms && collections.length > 0 ? (
						<div className="mt-1 border-t border-border px-2 pt-2">
							<p className="pb-1 text-9 font-bold tracking-12 text-muted-foreground uppercase">
								CMS
							</p>
							<ul className="grid gap-0.5">
								{collections.map((collection) => (
									<li key={collection.id}>
										<Link
											className="flex items-center gap-1.5 rounded-md p-1 text-11 text-muted-foreground hover:bg-muted hover:text-foreground"
											hash={collection.id}
											onClick={navigate}
											to="/content"
										>
											<span className="truncate">{collection.label}</span>
											<span className="ml-auto font-mono text-10">{collection.count}</span>
										</Link>
									</li>
								))}
							</ul>
						</div>
					) : null}
				</div>
			) : null}
		</div>
	);
}

function SidebarNav({
	collections,
	onNavigate,
	workspace,
}: {
	collections: CollectionSummary[];
	onNavigate?: () => void;
	workspace: WorkspacePayload | null;
}) {
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const hash = useHash();
	const activeHref = `${pathname}${hash}`;
	const prefs = useUiPrefs();
	const [groups, setGroups] = useState<Record<string, boolean>>({});

	function expanded(id: string, active: boolean) {
		return groups[id] ?? active;
	}

	function toggleGroup(id: string, current: boolean) {
		setGroups((previous) => ({ ...previous, [id]: !current }));
	}

	return (
		<ul className="grid gap-0.5">
			<SidebarLink
				active={pathname === "/"}
				href="/"
				icon={LayoutDashboardIcon}
				label="Dashboard"
				onClick={onNavigate}
			/>

			<SidebarGroup
				active={pathname === "/website"}
				expanded={expanded("website", pathname === "/website")}
				href="/website"
				icon={GlobeIcon}
				id="website"
				label="Website"
				onClick={onNavigate}
				onToggle={() => toggleGroup("website", expanded("website", pathname === "/website"))}
			>
				<SidebarToggle label="Show pages in sidebar" pref="showPagesInSidebar" />
				<SidebarToggle
					label="Show SEO / Page Metadata / Schema Markup in right sidebar"
					pref="showWebsiteMeta"
				/>
				{prefs.showPagesInSidebar && workspace?.pages.length ? (
					<li className="mt-1 border-t border-sidebar-border pt-1">
						<p className="px-2 pb-0.5 text-9 font-bold tracking-12 text-muted-foreground uppercase">
							Pages
						</p>
						<ul className="grid gap-0.5">
							{workspace.pages.map((page) => (
								<li key={page.path}>
									<Link
										className={cn(
											"flex items-center gap-1.5 rounded-md px-2 py-1 text-11 transition-colors",
											"text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
										)}
										onClick={onNavigate}
										search={{ page: page.path }}
										to="/website"
									>
										<FileTextIcon className="size-3 shrink-0" />
										<span className="truncate font-mono">{page.route}</span>
										{page.dynamic ? (
											<span className="ml-auto rounded bg-muted px-1 font-mono text-9">dyn</span>
										) : null}
									</Link>
								</li>
							))}
						</ul>
					</li>
				) : null}
			</SidebarGroup>

			<SidebarGroup
				active={pathname === "/design"}
				expanded={expanded("design", pathname === "/design")}
				href="/design"
				icon={PaletteIcon}
				id="design"
				label="Design"
				onClick={onNavigate}
				onToggle={() => toggleGroup("design", expanded("design", pathname === "/design"))}
			>
				{designLinks.map((link) => (
					<SidebarChildLink
						active={isActive(link.href, pathname, activeHref, true)}
						description={link.description}
						href={link.href}
						key={link.label}
						label={link.label}
						onClick={onNavigate}
					/>
				))}
			</SidebarGroup>

			<SidebarGroup
				active={pathname === "/components"}
				expanded={expanded("components", pathname === "/components")}
				href="/components"
				icon={ShapesIcon}
				id="components"
				label="Components"
				onClick={onNavigate}
				onToggle={() =>
					toggleGroup("components", expanded("components", pathname === "/components"))
				}
			>
				{componentLinks.map((link) => (
					<SidebarChildLink
						active={isActive(link.href, pathname, activeHref, true)}
						href={link.href}
						key={link.label}
						label={link.label}
						onClick={onNavigate}
					/>
				))}
			</SidebarGroup>

			<SidebarLink
				active={pathname === "/assets"}
				href="/assets"
				icon={ImageIcon}
				label="Assets"
				onClick={onNavigate}
			/>

			<SidebarGroup
				active={pathname === "/content" || pathname.startsWith("/edit/")}
				expanded={expanded("content", pathname === "/content" || pathname.startsWith("/edit/"))}
				href="/content"
				icon={DatabaseIcon}
				id="content"
				label="Content"
				onClick={onNavigate}
				onToggle={() =>
					toggleGroup(
						"content",
						expanded("content", pathname === "/content" || pathname.startsWith("/edit/")),
					)
				}
			>
				<SidebarToggle label="Show CMS" pref="showCms" />
				<SidebarToggle label="Show SEO + Schema Markup in right sidebar" pref="showContentSeo" />
				{prefs.showCms ? (
					<li className="mt-1 border-t border-sidebar-border pt-1">
						<p className="px-2 pb-0.5 text-9 font-bold tracking-12 text-muted-foreground uppercase">
							CMS
						</p>
						<ul className="grid gap-0.5">
							{collections.map((collection) => (
								<li key={collection.id}>
									<Link
										className="flex items-center gap-1.5 rounded-md px-2 py-1 text-11 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
										hash={collection.id}
										onClick={onNavigate}
										to="/content"
									>
										<span className="truncate">{collection.label}</span>
										<span className="ml-auto font-mono text-10">{collection.count}</span>
									</Link>
								</li>
							))}
							{collections.length === 0 ? (
								<li className="px-2 py-1 text-10 text-muted-foreground">Loading CMS…</li>
							) : null}
						</ul>
					</li>
				) : null}
			</SidebarGroup>

			<SidebarLink
				active={pathname === "/settings"}
				href="/settings"
				icon={Settings2Icon}
				label="Settings"
				onClick={onNavigate}
			/>
		</ul>
	);
}

function SidebarPanel({
	collections,
	onNavigate,
	workspace,
}: {
	collections: CollectionSummary[];
	onNavigate?: () => void;
	workspace: WorkspacePayload | null;
}) {
	return (
		<div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
			<div className="border-b border-sidebar-border p-2">
				<WorkspaceMenu collections={collections} onNavigate={onNavigate} workspace={workspace} />
			</div>
			<nav aria-label="Primary" className="min-h-0 flex-1 overflow-y-auto p-2">
				<SidebarNav collections={collections} onNavigate={onNavigate} workspace={workspace} />
			</nav>
			<div className="border-t border-sidebar-border p-3">
				<p className="flex items-center gap-1.5 text-10 text-muted-foreground">
					<span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />
					local-first · files are the source of truth
				</p>
			</div>
		</div>
	);
}

/**
 * Fixed application rail: workspace identity and the CMS map live at the top,
 * followed by the primary navigation. The same panel becomes a drawer below
 * the `lg` breakpoint.
 */
export function AppSidebar() {
	const [mobileOpen, setMobileOpen] = useState(false);
	const workspace = useWorkspace();
	const routerHref = useRouterState({ select: (state) => state.location.href });
	const showCms = useUiPref("showCms");
	const collections = useCollections(showCms);

	useEffect(() => {
		if (routerHref) setMobileOpen(false);
	}, [routerHref]);

	return (
		<>
			<aside className="fixed inset-y-0 left-0 z-40 hidden w-sidebar border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block">
				<SidebarPanel collections={collections} workspace={workspace} />
			</aside>

			<header className="fixed inset-x-0 top-0 z-40 flex h-12 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur-xl lg:hidden">
				<Button
					aria-label="Open navigation"
					onClick={() => setMobileOpen(true)}
					size="icon-sm"
					variant="ghost"
				>
					<MenuIcon />
				</Button>
				<BrandMark className="size-4 text-brand" />
				<span className="min-w-0 flex-1 truncate text-13 font-bold tracking-tight">
					{workspace?.project ?? "platipie-cms"}
				</span>
				<Badge className="max-w-28 gap-1 font-mono" variant="outline">
					<GitBranchIcon className="size-3 shrink-0" />
					<span className="truncate">{workspace?.branch ?? "…"}</span>
				</Badge>
			</header>

			{mobileOpen ? (
				<div className="fixed inset-0 z-50 lg:hidden">
					<button
						aria-label="Dismiss navigation"
						className="absolute inset-0 bg-scrim/40"
						onClick={() => setMobileOpen(false)}
						type="button"
					/>
					<div className="animate-gb-pop absolute inset-y-0 left-0 flex w-sidebar flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lift">
						<div className="flex h-12 shrink-0 items-center justify-end border-b border-sidebar-border px-2">
							<Button
								aria-label="Close navigation"
								onClick={() => setMobileOpen(false)}
								size="icon-sm"
								variant="ghost"
							>
								<XIcon />
							</Button>
						</div>
						<div className="min-h-0 flex-1">
							<SidebarPanel
								collections={collections}
								onNavigate={() => setMobileOpen(false)}
								workspace={workspace}
							/>
						</div>
					</div>
				</div>
			) : null}
		</>
	);
}
