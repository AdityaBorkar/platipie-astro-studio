import {
	Code2Icon,
	FrameIcon,
	LayersIcon,
	RulerIcon,
	SwatchBookIcon,
	TypeIcon,
} from "lucide-react";

import { ThemeToggle } from "#/components/theme-toggle";
import { Badge } from "#/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import {
	actionTokens,
	brandTokens,
	chartTokens,
	chromeTokens,
	radii,
	rails,
	shadows,
	surfaceTokens,
	typeScale,
} from "../data";
import { DesignSection, Panel, TokenTable, CodeBlock } from "../shared";

export function TokensSection() {
	return (
		<DesignSection
			actions={
				<div className="ml-auto flex w-full justify-end sm:w-auto">
					<ThemeToggle />
				</div>
			}
			description="All colors, type, radii, shadows, and layout widths below mirror the :root, .dark, and @theme inline blocks in src/styles.css. Swatches follow the active theme."
			eyebrow="01 · Foundations"
			id="tokens"
			title="Every value resolves through the token layer"
		>
			<Panel icon={SwatchBookIcon} note="46 roles · light / dark" title="Semantic color roles">
				<Tabs defaultValue="surfaces">
					<TabsList className="gb-scroll-clean max-w-full justify-start overflow-x-auto">
						<TabsTrigger className="shrink-0" value="surfaces">
							Surfaces
						</TabsTrigger>
						<TabsTrigger className="shrink-0" value="actions">
							Text & actions
						</TabsTrigger>
						<TabsTrigger className="shrink-0" value="brand">
							Brand & feedback
						</TabsTrigger>
						<TabsTrigger className="shrink-0" value="chrome">
							Chrome
						</TabsTrigger>
						<TabsTrigger className="shrink-0" value="charts">
							Charts
						</TabsTrigger>
					</TabsList>
					<TabsContent value="surfaces">
						<TokenTable rows={surfaceTokens} />
					</TabsContent>
					<TabsContent value="actions">
						<TokenTable rows={actionTokens} />
					</TabsContent>
					<TabsContent value="brand">
						<TokenTable rows={brandTokens} />
					</TabsContent>
					<TabsContent value="chrome">
						<TokenTable rows={chromeTokens} />
					</TabsContent>
					<TabsContent value="charts">
						<TokenTable rows={chartTokens} />
					</TabsContent>
				</Tabs>
			</Panel>

			<div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
				<Panel icon={TypeIcon} note="General Sans + Geist Mono" title="Type scale">
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="rounded-xl bg-muted p-4">
							<p className="font-mono text-9 font-bold tracking-12 text-muted-foreground uppercase">
								General Sans · 400–700
							</p>
							<p className="mt-1 text-display leading-display font-bold tracking-display">Aa</p>
							<p className="text-xs text-muted-foreground">Display, headings, UI</p>
						</div>
						<div className="rounded-xl bg-muted p-4">
							<p className="font-mono text-9 font-bold tracking-12 text-muted-foreground uppercase">
								Geist Mono Variable
							</p>
							<p className="mt-1 font-mono text-display">Aa</p>
							<p className="text-xs text-muted-foreground">Tokens, code, trace ids</p>
						</div>
					</div>
					<div className="mt-5 grid gap-3">
						{typeScale.map((type) => (
							<div
								className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-2.5 last:border-0 last:pb-0"
								key={type.label}
							>
								<p
									className={`${type.className} min-w-0 basis-full font-bold tracking-heading sm:flex-1`}
									style={{ lineHeight: type.lineHeight }}
								>
									{type.sample}
								</p>
								<span className="ml-auto shrink-0 font-mono text-10 text-muted-foreground">
									{type.size} · {type.meta}
								</span>
							</div>
						))}
					</div>
					<p className="mt-4 text-xs leading-relaxed text-muted-foreground">
						Eyebrows are 11px / 700 / <code>tracking-14</code> / uppercase / brand orange. Body copy
						is 16px / 1.6 / muted stone.
					</p>
				</Panel>

				<div className="grid gap-4">
					<Panel icon={RulerIcon} note="0.5–2rem" title="Radius">
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
							{radii.map((radius) => (
								<div key={radius.token}>
									<div className={`h-12 border border-border bg-muted ${radius.className}`} />
									<p className="mt-1.5 font-mono text-10 text-muted-foreground">
										{radius.label} · {radius.value}
									</p>
								</div>
							))}
						</div>
						<div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
							<Badge variant="outline">--radius 0.75rem</Badge>
							<span>Pills use rounded-full. Cards 16px, illustration panels 24px.</span>
						</div>
					</Panel>

					<Panel icon={LayersIcon} note="Warm and low-contrast" title="Elevation">
						<div className="grid gap-2 sm:grid-cols-3">
							{shadows.map((shadow) => (
								<div
									className={`rounded-xl border border-border bg-card p-3 ${shadow.className}`}
									key={shadow.label}
								>
									<p className="font-mono text-10 font-semibold">{shadow.label}</p>
									<p className="mt-1 text-10 leading-relaxed text-muted-foreground">
										{shadow.value}
									</p>
								</div>
							))}
						</div>
						<p className="mt-3 text-xs leading-relaxed text-muted-foreground">
							Dark mode swaps in black-based shadows. Cards lift 4px over 420ms with the spring
							ease.
						</p>
					</Panel>

					<Panel icon={RulerIcon} note="4 → 96px" title="Spacing">
						<div className="grid gap-2">
							{[4, 8, 16, 24, 48, 96].map((space) => (
								<div className="flex items-center gap-3" key={space}>
									<span className="w-6 shrink-0 font-mono text-10 text-muted-foreground">
										{space}
									</span>
									<span
										className="h-2 rounded-full bg-brand/70"
										style={{ width: `${(space / 96) * 100}%` }}
									/>
								</div>
							))}
						</div>
						<p className="mt-3 text-xs leading-relaxed text-muted-foreground">
							Section rhythm is 48–80px. Hero top padding is <code>pt-hero</code> (8.5rem).
						</p>
					</Panel>
				</div>
			</div>

			<div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
				<Panel icon={FrameIcon} note="min(100%, …)" title="Rails & layout width">
					<div className="grid gap-3">
						{rails.map((rail) => (
							<div className="grid gap-1.5" key={rail.token}>
								<div className="flex flex-wrap items-baseline justify-between gap-2">
									<span className="text-xs font-semibold">{rail.label}</span>
									<span className="font-mono text-10 text-muted-foreground">
										{rail.token} · {rail.value}
									</span>
								</div>
								<div className="h-2 rounded-full bg-muted">
									<div className="h-2 rounded-full bg-brand/70" style={{ width: rail.bar }} />
								</div>
							</div>
						))}
					</div>
					<p className="mt-4 text-xs leading-relaxed text-muted-foreground">
						Content never exceeds 1200px; side rails collapse before the content does. The docs tree
						and TOC pin at <code>top-24</code>.
					</p>
				</Panel>

				<Panel icon={Code2Icon} note="src/styles.css" title="Token source">
					<CodeBlock label=":root / .dark">
						{`:root {
  --brand: #fe551b;
  --background: #ffffff;
  --foreground: #1c1917;
  --primary: #1c1917;
  --radius: 0.75rem;
  --ease-spring: cubic-bezier(0.22, 1, 0.36, 1);
}

.dark {
  --brand: #ff6a35;
  --background: #0c0a09;
  --foreground: #fafaf9;
  --primary: #fafaf9;
}`}
					</CodeBlock>
					<CodeBlock className="mt-3" label="@theme inline">
						{`@theme inline {
  --color-brand: var(--brand);
  --color-muted-foreground: var(--muted-foreground);
  --text-title: 1.25rem;
  --tracking-heading: -0.02em;
  --radius-xl: 1rem;
}`}
					</CodeBlock>
				</Panel>
			</div>
		</DesignSection>
	);
}
