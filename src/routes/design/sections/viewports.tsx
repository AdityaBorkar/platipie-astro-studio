import { FrameIcon, LayersIcon, MonitorSmartphoneIcon } from "lucide-react";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { breakpoints, gridUtilities, rails } from "../data";
import { DesignSection, Panel } from "../shared";

export function ViewportsSection() {
	return (
		<DesignSection
			description="The app rail is fixed at 264px on large screens. Content stays inside a 1200px page, docs reserve their own rails, and the editor keeps its columns until 1100px."
			eyebrow="07 · Viewports"
			id="viewports"
			title="Space at every width"
		>
			<div className="grid items-start gap-4 lg:grid-cols-2">
				<Panel icon={MonitorSmartphoneIcon} note="Tailwind defaults" title="Breakpoints">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Token</TableHead>
								<TableHead>From</TableHead>
								<TableHead>Behaviour</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{breakpoints.map((breakpoint) => (
								<TableRow key={breakpoint.label}>
									<TableCell className="font-mono text-11 font-semibold">
										{breakpoint.label}
									</TableCell>
									<TableCell className="font-mono text-11 text-muted-foreground">
										{breakpoint.range}
									</TableCell>
									<TableCell className="text-xs whitespace-normal text-muted-foreground">
										{breakpoint.rule}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Panel>

				<Panel icon={FrameIcon} note="fixed rails" title="Rails">
					<div className="grid gap-3">
						{rails.map((rail) => (
							<div className="grid gap-1.5" key={rail.token}>
								<div className="flex flex-wrap items-baseline justify-between gap-2">
									<span className="text-xs font-semibold">{rail.label}</span>
									<span className="font-mono text-10 text-muted-foreground">{rail.value}</span>
								</div>
								<div className="h-2 rounded-full bg-muted">
									<div className="h-2 rounded-full bg-brand/70" style={{ width: rail.bar }} />
								</div>
							</div>
						))}
					</div>
					<p className="mt-4 text-xs leading-relaxed text-muted-foreground">
						Below <code>lg</code>, the app rail becomes a 48px top bar and a slide-in drawer. The
						content takes the full width and the editor collapses at 1100px.
					</p>
				</Panel>
			</div>

			<div className="mt-4">
				<Panel icon={LayersIcon} note="no ad-hoc columns" title="Column recipes">
					<div className="flex flex-wrap gap-1.5">
						{gridUtilities.map((utility) => (
							<code
								className="rounded-md border border-border bg-muted/40 px-2 py-1 font-mono text-10"
								key={utility}
							>
								{utility}
							</code>
						))}
					</div>
					<p className="mt-3 text-xs leading-relaxed text-muted-foreground">
						Each recipe is a named utility in <code>src/styles.css</code> or the component layer.
						New repeated columns become a utility before they become a class string.
					</p>
				</Panel>
			</div>
		</DesignSection>
	);
}
