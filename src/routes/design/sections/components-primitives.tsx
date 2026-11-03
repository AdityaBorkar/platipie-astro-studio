import { BlocksIcon, ComponentIcon } from "lucide-react";

import { Badge } from "#/components/ui/badge";
import { primitives, systemComponents } from "../data";
import { Panel } from "../shared";

export function ComponentInventoryPanels() {
	return (
		<>
			<Panel
				icon={ComponentIcon}
				id="primitives"
				note={`${primitives.length} files`}
				title="Primitive index"
			>
				<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
					{primitives.map((primitive) => (
						<div className="rounded-lg border border-border bg-muted/30 p-2.5" key={primitive.name}>
							<span className="font-mono text-11 font-semibold">{primitive.name}</span>
							<p className="mt-0.5 text-11 leading-relaxed text-muted-foreground">
								{primitive.purpose}
							</p>
						</div>
					))}
				</div>
			</Panel>

			<Panel icon={BlocksIcon} id="gitbook" note="src/components/gitbook" title="GitBook surfaces">
				<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
					{systemComponents.map((component) => (
						<div className="rounded-lg border border-border bg-muted/30 p-2.5" key={component.name}>
							<div className="flex flex-wrap items-center justify-between gap-1.5">
								<span className="font-mono text-11 font-semibold">{component.name}</span>
								<Badge variant="outline">{component.group}</Badge>
							</div>
							<p className="mt-1 text-11 leading-relaxed text-muted-foreground">
								{component.purpose}
							</p>
						</div>
					))}
				</div>
			</Panel>
		</>
	);
}
