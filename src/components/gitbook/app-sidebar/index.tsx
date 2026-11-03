import { useRouterState } from "@tanstack/react-router";
import { GitBranchIcon, MenuIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { SyncStatusBar } from "#/components/sync-status-bar";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { BrandMark } from "../brand";
import { overallLastSync, useCollections, useSyncStatus, useWorkspace } from "./hooks";
import type { CollectionSummary, SyncScopeStatus, WorkspacePayload } from "./hooks";
import { SidebarNav } from "./sidebar-nav";
import { WorkspaceMenu } from "./workspace-menu";

function SidebarPanel({
	collections,
	collectionsError,
	onNavigate,
	onResync,
	syncError,
	syncStatus,
	syncing,
	workspace,
	workspaceError,
}: {
	collections: CollectionSummary[];
	collectionsError: string | null;
	onNavigate?: () => void;
	onResync: () => void;
	syncError: boolean;
	syncStatus: SyncScopeStatus[] | null;
	syncing: boolean;
	workspace: WorkspacePayload | null;
	workspaceError: string | null;
}) {
	const { lastSync, stale } = overallLastSync(syncStatus);
	return (
		<div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
			<div className="border-b border-sidebar-border p-2">
				<WorkspaceMenu
					onNavigate={onNavigate}
					workspace={workspace}
					workspaceError={workspaceError}
				/>
			</div>
			<nav aria-label="Primary" className="min-h-0 flex-1 overflow-y-auto p-2">
				<SidebarNav
					collections={collections}
					collectionsError={collectionsError}
					onNavigate={onNavigate}
					workspace={workspace}
				/>
			</nav>
			<div className="border-t border-sidebar-border p-2">
				<SyncStatusBar
					lastSync={lastSync}
					loading={syncStatus === null && !syncError}
					onRefresh={onResync}
					refreshing={syncing}
					stale={stale || syncError}
				/>
			</div>
		</div>
	);
}

export function AppSidebar() {
	const [mobileOpen, setMobileOpen] = useState(false);
	const { error: workspaceError, workspace } = useWorkspace();
	const routerHref = useRouterState({ select: (state) => state.location.href });
	const { collections, error: collectionsError } = useCollections();
	const { resync, status, syncError, syncing } = useSyncStatus();

	useEffect(() => {
		if (routerHref) setMobileOpen(false);
	}, [routerHref]);

	return (
		<>
			<aside className="fixed inset-y-0 left-0 z-40 hidden w-sidebar border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block">
				<SidebarPanel
					collections={collections}
					collectionsError={collectionsError}
					onResync={resync}
					syncError={syncError}
					syncStatus={status}
					syncing={syncing}
					workspace={workspace}
					workspaceError={workspaceError}
				/>
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
								collectionsError={collectionsError}
								onNavigate={() => setMobileOpen(false)}
								onResync={resync}
								syncError={syncError}
								syncStatus={status}
								syncing={syncing}
								workspace={workspace}
								workspaceError={workspaceError}
							/>
						</div>
					</div>
				</div>
			) : null}
		</>
	);
}
