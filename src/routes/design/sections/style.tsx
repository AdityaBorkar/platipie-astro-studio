import { AccessibilityIcon, ArrowRightIcon, CommandIcon, FrameIcon, TypeIcon } from "lucide-react";

import { Hint } from "#/components/gitbook";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Separator } from "#/components/ui/separator";
import { DesignSection, Panel } from "../shared";

export function StyleSection() {
	return (
		<DesignSection
			description="Black is the action, orange is the emphasis, and hairline borders keep dense screens readable. These rules decide the look before any component does."
			eyebrow="03 · Style guide"
			id="style"
			title="Rules that decide the look"
		>
			<div className="grid items-start gap-4 lg:grid-cols-2">
				<Panel icon={CommandIcon} note="one primary per surface" title="Action hierarchy">
					<div className="flex flex-wrap items-center gap-2">
						<Button>
							Save
							<ArrowRightIcon />
						</Button>
						<Button variant="secondary">Cancel</Button>
						<Button variant="outline">Diff</Button>
						<Button variant="ghost">Copy path</Button>
						<Button variant="brand">Drift</Button>
						<Button variant="destructive">Delete</Button>
					</div>
					<Separator className="my-4" />
					<div className="flex flex-wrap items-center gap-2">
						<Badge>Default</Badge>
						<Badge variant="secondary">Secondary</Badge>
						<Badge variant="outline">Outline</Badge>
						<Badge variant="brand">Emphasis</Badge>
						<Badge variant="success">Clear</Badge>
						<Badge variant="destructive">Danger</Badge>
					</div>
					<ul className="mt-4 grid gap-1.5 text-xs text-muted-foreground">
						<li>Primary ink for the one action that finishes the task.</li>
						<li>Outline and ghost for everything reversible.</li>
						<li>Orange for attention, drift, and brand — never for the main button.</li>
					</ul>
				</Panel>

				<Panel icon={AccessibilityIcon} note="pick one signal" title="Do and don't">
					<div className="grid gap-2">
						<Hint title="Do" variant="success">
							Use a hint for inline status, a card for a decision, and a table for scanning.
						</Hint>
						<Hint title="Don't" variant="danger">
							Stack heavy borders, shadows, and orange on the same surface.
						</Hint>
						<Hint title="Do" variant="success">
							Keep forms on the app grid: 36px controls, 12px radius, visible labels.
						</Hint>
						<Hint title="Don't" variant="warning">
							Hide a destructive action behind a hover or an unlabeled icon.
						</Hint>
					</div>
				</Panel>

				<Panel icon={FrameIcon} note="hairline first" title="Surface hierarchy">
					<div className="grid gap-2 sm:grid-cols-3">
						<div className="rounded-xl border border-border bg-card p-3">
							<span className="font-mono text-10 text-muted-foreground">01</span>
							<p className="mt-1 text-xs font-bold">Hairline</p>
							<p className="mt-0.5 text-10 text-muted-foreground">
								1px border, no shadow. The default for dense app rows.
							</p>
						</div>
						<div className="rounded-xl border border-border bg-card p-3 shadow-soft">
							<span className="font-mono text-10 text-muted-foreground">02</span>
							<p className="mt-1 text-xs font-bold">Soft lift</p>
							<p className="mt-0.5 text-10 text-muted-foreground">
								One warm shadow for cards that need separation.
							</p>
						</div>
						<div className="rounded-xl border border-brand/20 bg-brand-soft p-3">
							<span className="font-mono text-10 text-brand">03</span>
							<p className="mt-1 text-xs font-bold">Emphasis</p>
							<p className="mt-0.5 text-10 text-muted-foreground">
								Brand tint for drift, eyebrows, and agent moments.
							</p>
						</div>
					</div>
					<p className="mt-3 text-xs leading-relaxed text-muted-foreground">
						Never combine all three. Pick the signal the surface actually needs.
					</p>
				</Panel>

				<Panel icon={TypeIcon} note="sentence case" title="Copy">
					<div className="grid gap-3 text-xs">
						<div className="rounded-lg bg-muted/50 p-3">
							<p className="font-mono text-9 text-success uppercase">Write</p>
							<p className="mt-1 font-semibold">Files are the source of truth.</p>
							<p className="mt-1 text-muted-foreground">
								Short, concrete, unhurried. Name the file or field in the instruction.
							</p>
						</div>
						<div className="rounded-lg bg-muted/50 p-3">
							<p className="font-mono text-9 text-destructive uppercase">Avoid</p>
							<p className="mt-1 font-semibold line-through">Revolutionary content platform!</p>
							<p className="mt-1 text-muted-foreground">
								Hype, stacked adjectives, and exclamation marks.
							</p>
						</div>
						<div className="flex flex-wrap gap-1.5">
							<Badge variant="outline">sentence case</Badge>
							<Badge variant="outline">name the field</Badge>
							<Badge variant="outline">no exclamation</Badge>
							<Badge variant="outline">verb first</Badge>
						</div>
					</div>
				</Panel>
			</div>
		</DesignSection>
	);
}
