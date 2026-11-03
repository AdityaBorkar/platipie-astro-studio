import type { ReactNode } from "react";

interface WorkbenchShellProps {
	rail: ReactNode;
	sidebar?: ReactNode | null;
	stage: ReactNode;
}

export function WorkbenchShell({ rail, sidebar, stage }: WorkbenchShellProps) {
	if (!sidebar) {
		return (
			<div className="grid min-h-dvh grid-cols-1 lg:h-dvh lg:grid-cols-app-rail lg:overflow-hidden">
				<section className="hidden min-h-0 flex-col lg:flex">{stage}</section>
				<aside className="min-h-0 border-border/70 lg:h-dvh lg:overflow-y-auto lg:border-l lg:bg-sidebar/50">
					{rail}
				</aside>
			</div>
		);
	}
	return (
		<div className="min-h-dvh lg:grid lg:grid-cols-docs-shell xl:h-dvh xl:grid-cols-workbench xl:overflow-hidden">
			<aside className="flex flex-col border-b border-border/70 bg-sidebar/40 lg:sticky lg:top-0 lg:row-span-2 lg:h-dvh lg:self-start lg:border-r lg:border-b-0 xl:static xl:row-span-1">
				{sidebar}
			</aside>
			<section className="flex min-h-96 flex-col border-b border-border/70 lg:border-b-0 xl:min-h-0">
				{stage}
			</section>
			<aside className="flex min-h-0 flex-col border-border/70 bg-sidebar/30 lg:border-t xl:h-dvh xl:border-t-0 xl:border-l">
				{rail}
			</aside>
		</div>
	);
}
