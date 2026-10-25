import { createFileRoute } from "@tanstack/react-router";
import { GitBranchIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { BrandMark } from "#/components/gitbook/brand";
import { Hint } from "#/components/gitbook/hint";
import { Badge } from "#/components/ui/badge";
import { Skeleton } from "#/components/ui/skeleton";

interface ProjectEntry {
	branch: string;
	current: boolean;
	displayPath: string;
	favicon: string | null;
	name: string;
	root: string;
}

export const Route = createFileRoute("/dashboard")({
	component: Dashboard,
	head: () => ({ meta: [{ title: "Dashboard · platipie-cms" }] }),
});

function Dashboard() {
	const [project, setProject] = useState<ProjectEntry | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		let alive = true;
		fetch("/api/cms/projects")
			.then(async (response) => {
				const json = await response.json();
				if (!response.ok) throw new Error(json.message ?? "Failed to load project");
				return json as { projects?: ProjectEntry[] };
			})
			.then((json) => {
				if (!alive) return;
				setProject((json.projects ?? []).find((entry) => entry.current) ?? null);
				setLoaded(true);
			})
			.catch((e: unknown) => {
				if (!alive) return;
				setError(e instanceof Error ? e.message : String(e));
				setLoaded(true);
			});
		return () => {
			alive = false;
		};
	}, []);

	if (error) {
		return (
			<div className="mx-auto w-page px-5 py-10">
				<Hint title="Failed to load the workspace" variant="danger">
					{error}
				</Hint>
			</div>
		);
	}

	if (!loaded) {
		return (
			<div className="mx-auto w-page px-5 py-10">
				<div className="flex items-center gap-4">
					<Skeleton className="size-12 rounded-xl" />
					<div className="grid gap-2">
						<Skeleton className="h-7 w-48" />
						<Skeleton className="h-5 w-32" />
					</div>
				</div>
			</div>
		);
	}

	if (project === null) {
		return (
			<div className="mx-auto w-page px-5 py-10">
				<Hint title="No project selected" variant="warning">
					No current project found. Select one from the sidebar workspace menu.
				</Hint>
			</div>
		);
	}

	return (
		<div className="mx-auto w-page px-5 py-8 sm:py-10">
			<div className="animate-rise flex items-center gap-4">
				{project.favicon ? (
					<img alt="" className="size-12 rounded-xl object-contain" src={project.favicon} />
				) : (
					<span className="inline-flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
						<BrandMark className="size-6" />
					</span>
				)}
				<div className="min-w-0">
					<h1 className="gb-display truncate text-3xl sm:text-display-sm">{project.name}</h1>
					<Badge className="mt-2 font-mono" variant="outline">
						<GitBranchIcon className="size-3" />
						{project.branch}
					</Badge>
				</div>
			</div>
		</div>
	);
}
