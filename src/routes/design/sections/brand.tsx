import { CommandIcon, LayersIcon, PaletteIcon, SparklesIcon } from "lucide-react";

import { BrandMark, Hint, Wordmark } from "#/components/gitbook";
import { DesignSection, Panel } from "../shared";

export function BrandSection() {
	return (
		<DesignSection
			description="The mark stays quiet, the wordmark carries the name, and the orange does the pointing. Nothing else competes."
			eyebrow="02 · Brand guidelines"
			id="brand"
			title="A calm mark for a content system"
		>
			<div className="grid items-start gap-4 lg:grid-cols-3">
				<Panel icon={PaletteIcon} note="16 / 24 / 48px" title="Mark">
					<div className="grid gap-3">
						<div className="flex flex-wrap items-center gap-4 rounded-xl bg-muted p-6">
							<BrandMark className="size-12 text-foreground" />
							<BrandMark className="size-6 text-foreground" />
							<BrandMark className="size-4 text-foreground" />
							<span className="ml-auto inline-flex size-12 items-center justify-center rounded-xl bg-brand text-on-brand">
								<BrandMark className="size-6" />
							</span>
						</div>
						<p className="text-xs leading-relaxed text-muted-foreground">
							Three stacked planes. Never rotate, outline, or recolor the mark outside the semantic
							palette. On orange, use <code>--on-brand</code>.
						</p>
					</div>
				</Panel>

				<Panel icon={PaletteIcon} note="mark + name + badge" title="Lockup">
					<div className="flex flex-col items-start gap-4 rounded-xl bg-muted p-6">
						<Wordmark />
						<Wordmark badge="design" />
						<Wordmark badge="cms" />
					</div>
					<p className="mt-3 text-xs leading-relaxed text-muted-foreground">
						Mark and name sit on one baseline. Badges are optional mono chips for the surface name.
					</p>
				</Panel>

				<Panel icon={SparklesIcon} note="short and concrete" title="Voice">
					<Hint title="Say what changed, where, and what to do next" variant="info">
						Prefer “Files are the source of truth” over “revolutionary content platform.”
					</Hint>
					<ul className="mt-3 grid gap-2 text-xs text-muted-foreground">
						<li>Sentence case for headings and buttons.</li>
						<li>Name the file or field when giving an instruction.</li>
						<li>Reserve exclamation marks for nothing.</li>
						<li>Use “drift” and “content health” as product terms, not metaphors.</li>
					</ul>
				</Panel>
			</div>

			<div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
				<Panel icon={LayersIcon} note="one orange signal" title="Brand on surfaces">
					<div className="grid gap-2 sm:grid-cols-2">
						<div className="rounded-xl bg-brand p-4 text-on-brand">
							<p className="text-10 font-bold tracking-12 uppercase opacity-80">Enterprise</p>
							<p className="mt-1 text-sm font-bold tracking-tight">
								Intelligent documentation built to scale
							</p>
						</div>
						<div className="rounded-xl border border-brand/20 bg-brand-soft p-4">
							<p className="text-10 font-bold tracking-12 text-brand uppercase">Drift</p>
							<p className="mt-1 text-sm font-bold tracking-tight text-foreground">
								Two pages reference a flag that no longer exists.
							</p>
						</div>
						<div className="rounded-xl border border-brand-mint/60 bg-brand-mint/20 p-4">
							<p className="text-10 font-bold tracking-12 text-success uppercase">Verified</p>
							<p className="mt-1 text-sm font-bold tracking-tight">
								All checks pass against the current product.
							</p>
						</div>
						<div className="rounded-xl border border-border bg-muted/40 p-4">
							<p className="text-10 font-bold tracking-12 text-muted-foreground uppercase">Quiet</p>
							<p className="mt-1 text-sm font-bold tracking-tight">
								Hairline borders carry the structure.
							</p>
						</div>
					</div>
				</Panel>

				<Panel icon={CommandIcon} note="do / don't" title="Logo rules">
					<div className="grid gap-2">
						<Hint title="Do" variant="success">
							Use the mark at 16px or larger, with the name on the same baseline. Badges are mono
							and optional.
						</Hint>
						<Hint title="Don't" variant="danger">
							Rotate the planes, add a second accent color, or set the mark on a photograph without
							a quiet plate.
						</Hint>
						<Hint title="Do" variant="success">
							Use <code>text-foreground</code> for the mark on paper and <code>text-on-brand</code>{" "}
							on the orange plate.
						</Hint>
						<Hint title="Don't" variant="warning">
							Recolor the mark to mint, cream, or a raw hex. The mark is ink or brand-white.
						</Hint>
					</div>
				</Panel>
			</div>
		</DesignSection>
	);
}
