import type { LucideIcon } from "lucide-react";
import {
	AccessibilityIcon,
	BlocksIcon,
	Code2Icon,
	CommandIcon,
	ComponentIcon,
	FrameIcon,
	LayersIcon,
	MonitorSmartphoneIcon,
	PaletteIcon,
	SparklesIcon,
	SwatchBookIcon,
	ZapIcon,
} from "lucide-react";

export interface DesignNavSection {
	href: string;
	icon: LucideIcon;
	label: string;
	note: string;
}

export const designSections: DesignNavSection[] = [
	{
		href: "#overview",
		icon: LayersIcon,
		label: "Overview",
		note: "Principles, counts, and source files",
	},
	{
		href: "#tokens",
		icon: SwatchBookIcon,
		label: "Tokens",
		note: "46 colors, 11 type steps, radii, shadows",
	},
	{
		href: "#brand",
		icon: PaletteIcon,
		label: "Brand",
		note: "Mark, lockup, and voice",
	},
	{
		href: "#style",
		icon: AccessibilityIcon,
		label: "Style guide",
		note: "Action hierarchy and do/don't",
	},
	{
		href: "#languages",
		icon: Code2Icon,
		label: "Design languages",
		note: "Tokens → theme → utilities → surfaces",
	},
	{
		href: "#components",
		icon: ComponentIcon,
		label: "Components",
		note: "25 primitives and 22 GitBook modules",
	},
	{
		href: "#motion",
		icon: ZapIcon,
		label: "Motion",
		note: "Easing, keyframes, reduced motion",
	},
	{
		href: "#viewports",
		icon: MonitorSmartphoneIcon,
		label: "Viewports",
		note: "Breakpoints and rails",
	},
	{
		href: "#patterns",
		icon: BlocksIcon,
		label: "Patterns",
		note: "App pages, docs, and marketing flow",
	},
];

export const stats = [
	{ detail: "Light + dark semantic roles", label: "Color tokens", value: "46" },
	{ detail: "display → 9px micro labels", label: "Type steps", value: "11" },
	{ detail: "shadcn base-nova primitives", label: "UI surfaces", value: "25" },
	{ detail: "Named @utility, no arbitrary values", label: "Utilities", value: "58" },
];

export const sources = [
	{
		detail: "Colors, type, radii, shadows, utilities, keyframes",
		file: "src/styles.css",
	},
	{ detail: "25 shadcn primitives on the base-nova preset", file: "src/components/ui" },
	{ detail: "22 GitBook-inspired marketing and docs modules", file: "src/components/gitbook" },
	{ detail: "The written rules this page renders", file: "DESIGN.md" },
];

export const principles = [
	{
		body: "Primary actions use --primary (ink). Orange is emphasis, drift, and agent affordances.",
		icon: CommandIcon,
		title: "Black is the action",
	},
	{
		body: "Paper is white, secondary surfaces are stone, and text is warm: #1c1917 and #79716b.",
		icon: PaletteIcon,
		title: "Warm neutrals",
	},
	{
		body: "Surfaces use 1px borders and low-contrast warm shadows. Cards lift 4px, never bounce.",
		icon: FrameIcon,
		title: "Hairlines, not heavy borders",
	},
	{
		body: "Buttons, badges, and segmented controls are pills. Cards are 16px, illustration panels 24px.",
		icon: LayersIcon,
		title: "Pills for actions",
	},
	{
		body: "Entrances are transform + opacity, one-shot, under 750ms. Reduced motion disables them all.",
		icon: SparklesIcon,
		title: "Motion resolves content",
	},
];

// Token tables mirror src/styles.css (tokens/utilities live there; this file only
// lists what exists — do not re-add utilities removed from styles.css).
export interface ColorToken {
	dark: string;
	light: string;
	name: string;
	usage: string;
}

export const surfaceTokens: ColorToken[] = [
	{ dark: "#0c0a09", light: "#ffffff", name: "--background", usage: "Page canvas" },
	{ dark: "#fafaf9", light: "#1c1917", name: "--foreground", usage: "Primary text and icons" },
	{ dark: "#141110", light: "#ffffff", name: "--card", usage: "Cards, panels, inputs" },
	{ dark: "#fafaf9", light: "#1c1917", name: "--card-foreground", usage: "Text on card surfaces" },
	{ dark: "#171412", light: "#ffffff", name: "--popover", usage: "Popovers, menus, dialogs" },
	{
		dark: "#fafaf9",
		light: "#1c1917",
		name: "--popover-foreground",
		usage: "Text on popovers",
	},
	{ dark: "#171412", light: "#fafaf9", name: "--muted", usage: "Quiet rails and tracks" },
	{
		dark: "#a8a29e",
		light: "#79716b",
		name: "--muted-foreground",
		usage: "Secondary text and metadata",
	},
	{ dark: "#1e1a18", light: "#f5f4f2", name: "--accent", usage: "Hover and active rows" },
	{
		dark: "#fafaf9",
		light: "#1c1917",
		name: "--accent-foreground",
		usage: "Text on accent rows",
	},
];

export const actionTokens: ColorToken[] = [
	{ dark: "#fafaf9", light: "#1c1917", name: "--primary", usage: "The one completing action" },
	{
		dark: "#1c1917",
		light: "#fafaf9",
		name: "--primary-foreground",
		usage: "Text on primary actions",
	},
	{ dark: "#221e1c", light: "#efeeed", name: "--secondary", usage: "Reversible secondary actions" },
	{
		dark: "#fafaf9",
		light: "#1c1917",
		name: "--secondary-foreground",
		usage: "Text on secondary actions",
	},
	{ dark: "#2c2724", light: "#e7e5e3", name: "--secondary-hover", usage: "Secondary hover state" },
	{ dark: "#282422", light: "#efeeed", name: "--border", usage: "Hairline borders and rules" },
	{ dark: "#322d2a", light: "#e7e5e4", name: "--input", usage: "Field and control borders" },
	{ dark: "#ff6a35", light: "#fe551b", name: "--ring", usage: "Focus and invalid rings" },
];

export const brandTokens: ColorToken[] = [
	{ dark: "#ff6a35", light: "#fe551b", name: "--brand", usage: "Emphasis, eyebrows, drift" },
	{
		dark: "#1c1917",
		light: "#ffffff",
		name: "--brand-foreground",
		usage: "Text on a solid orange fill",
	},
	{
		dark: "#ffffff",
		light: "#ffffff",
		name: "--on-brand",
		usage: "Fixed white on the enterprise plate",
	},
	{
		dark: "orange 12%",
		light: "orange 8%",
		name: "--brand-soft",
		usage: "Tinted brand surfaces and badges",
	},
	{
		dark: "#7ce3b6",
		light: "#a4f4cf",
		name: "--brand-mint",
		usage: "Success and verified states",
	},
	{
		dark: "#062d1e",
		light: "#0b3d2a",
		name: "--brand-mint-foreground",
		usage: "Text on mint",
	},
	{
		dark: "#2a1810",
		light: "#fff4ee",
		name: "--brand-cream",
		usage: "Warm promotional cards",
	},
	{
		dark: "#f87171",
		light: "#dc2626",
		name: "--destructive",
		usage: "Destructive actions and errors",
	},
	{
		dark: "#0c0a09",
		light: "#ffffff",
		name: "--destructive-foreground",
		usage: "Text on destructive fills",
	},
	{ dark: "#fbbf24", light: "#b45309", name: "--warning", usage: "Drift and caution" },
	{ dark: "#7ce3b6", light: "#047857", name: "--success", usage: "Healthy content states" },
];

export const chromeTokens: ColorToken[] = [
	{ dark: "#100d0c", light: "#fafaf9", name: "--sidebar", usage: "Fixed app rail" },
	{
		dark: "#fafaf9",
		light: "#1c1917",
		name: "--sidebar-foreground",
		usage: "Rail text",
	},
	{ dark: "#ff6a35", light: "#fe551b", name: "--sidebar-primary", usage: "Rail emphasis" },
	{
		dark: "#1c1917",
		light: "#ffffff",
		name: "--sidebar-primary-foreground",
		usage: "Text on rail emphasis",
	},
	{ dark: "#1e1a18", light: "#f5f4f2", name: "--sidebar-accent", usage: "Active rail row" },
	{
		dark: "#fafaf9",
		light: "#1c1917",
		name: "--sidebar-accent-foreground",
		usage: "Active rail text",
	},
	{ dark: "#282422", light: "#efeeed", name: "--sidebar-border", usage: "Rail hairlines" },
	{ dark: "#ff6a35", light: "#fe551b", name: "--sidebar-ring", usage: "Rail focus ring" },
	{ dark: "#100d0c", light: "#fafaf9", name: "--code-bg", usage: "Code surfaces" },
	{ dark: "#282422", light: "#efeeed", name: "--code-border", usage: "Code hairlines" },
	{ dark: "#f5f5f4", light: "#292524", name: "--code-foreground", usage: "Code text" },
	{ dark: "#000000", light: "#1c1917", name: "--scrim", usage: "Drawer and dialog scrim" },
];

export const chartTokens: ColorToken[] = [
	{ dark: "#ff6a35", light: "#fe551b", name: "--chart-1", usage: "Primary series" },
	{ dark: "#fafaf9", light: "#1c1917", name: "--chart-2", usage: "Contrast series" },
	{ dark: "var(--warning)", light: "var(--warning)", name: "--chart-3", usage: "Caution series" },
	{ dark: "#7ce3b6", light: "#a4f4cf", name: "--chart-4", usage: "Positive series" },
	{ dark: "#8b8b86", light: "#8b8b86", name: "--chart-5", usage: "Neutral series" },
];

export const typeScale = [
	{
		className: "text-display",
		label: "--text-display",
		lineHeight: "1",
		meta: "1 · -0.02em",
		sample: "Accurate",
		size: "45px",
	},
	{
		className: "text-display-sm",
		label: "--text-display-sm",
		lineHeight: "1.2",
		meta: "1.2 · -0.02em",
		sample: "Better answers.",
		size: "38px",
	},
	{
		className: "text-heading",
		label: "--text-heading",
		lineHeight: "1.2",
		meta: "1.2",
		sample: "Content health",
		size: "32px",
	},
	{
		className: "text-title",
		label: "--text-title",
		lineHeight: "1.3",
		meta: "1.3",
		sample: "Stale content queue",
		size: "20px",
	},
	{
		className: "text-15",
		label: "--text-15",
		lineHeight: "1.6",
		meta: "1.6",
		sample: "Files are the source of truth.",
		size: "15px",
	},
	{
		className: "text-base",
		label: "text-base",
		lineHeight: "1.6",
		meta: "1.6",
		sample: "Files are the source of truth.",
		size: "16px",
	},
	{
		className: "text-13",
		label: "--text-13",
		lineHeight: "1.5",
		meta: "1.5",
		sample: "Sidebar navigation and dense rows.",
		size: "13px",
	},
	{
		className: "text-12",
		label: "--text-12",
		lineHeight: "1.5",
		meta: "1.5",
		sample: "Secondary metadata",
		size: "12px",
	},
	{
		className: "text-11",
		label: "--text-11",
		lineHeight: "1.4",
		meta: "1.4",
		sample: "EYEBROWS AND LABELS",
		size: "11px",
	},
	{
		className: "text-10",
		label: "--text-10",
		lineHeight: "1.4",
		meta: "1.4",
		sample: "MONO BADGES · TRACE IDS",
		size: "10px",
	},
	{
		className: "text-9",
		label: "--text-9",
		lineHeight: "1.2",
		meta: "1.2",
		sample: "MICRO CHIPS",
		size: "9px",
	},
];

export const radii = [
	{ className: "rounded-sm", label: "sm", token: "--radius-sm", value: "8px" },
	{ className: "rounded-md", label: "md", token: "--radius-md", value: "8px" },
	{ className: "rounded-lg", label: "lg", token: "--radius-lg", value: "12px" },
	{ className: "rounded-xl", label: "xl", token: "--radius-xl", value: "16px" },
	{ className: "rounded-2xl", label: "2xl", token: "--radius-2xl", value: "24px" },
	{ className: "rounded-3xl", label: "3xl", token: "--radius-3xl", value: "28px" },
	{ className: "rounded-4xl", label: "4xl", token: "--radius-4xl", value: "32px" },
];

export const shadows = [
	{
		className: "shadow-soft",
		label: "shadow-soft",
		value: "1px / 12px · hover cards",
	},
	{
		className: "shadow-lift",
		label: "shadow-lift",
		value: "2px / 28px · frames, drawers",
	},
	{
		className: "shadow-nav",
		label: "shadow-nav",
		value: "1px / 16px · floating nav",
	},
];

export const rails = [
	{ bar: "100%", label: "Page", token: "w-page", value: "1200px / 75rem" },
	{ bar: "81%", label: "Narrow prose", token: "w-page-narrow", value: "976px / 61rem" },
	{ bar: "22%", label: "App rail", token: "w-sidebar", value: "264px / 16.5rem" },
	{ bar: "19%", label: "Docs tree", token: "grid-cols-docs-shell", value: "232px" },
	{ bar: "17%", label: "Docs TOC", token: "grid-cols-docs-wide", value: "208px" },
	{ bar: "47%", label: "Editor side rails", token: "grid-cols-editor", value: "272 + 288px" },
	{
		bar: "46%",
		label: "Workbench rails",
		token: "grid-cols-workbench",
		value: "256 + 1fr + 304px",
	},
	{
		bar: "33%",
		label: "Product stage",
		token: "grid-cols-product-wide",
		value: "180 + 1fr + 220px",
	},
];

export const breakpoints = [
	{ label: "base", range: "0–639px", rule: "One column; the app rail becomes a drawer" },
	{ label: "sm", range: "640px+", rule: "Two-up fields, cards, and stat grids" },
	{ label: "md", range: "768px+", rule: "Three-column form and metadata rows" },
	{ label: "lg", range: "1024px+", rule: "Fixed 264px rail; content offset with pl-sidebar" },
	{ label: "xl", range: "1280px+", rule: "Three-rail docs shell; four-up stats" },
	{ label: "2xl", range: "1536px+", rule: "Wider gutters, same 1200px content" },
];

export const gridUtilities = [
	"grid-cols-app-rail",
	"grid-cols-asset-browser",
	"grid-cols-asset-dialog",
	"grid-cols-card-action",
	"grid-cols-docs",
	"grid-cols-docs-shell",
	"grid-cols-docs-wide",
	"grid-cols-editor",
	"grid-cols-enterprise",
	"grid-cols-footer",
	"grid-cols-page-meta",
	"grid-cols-product",
	"grid-cols-product-wide",
	"grid-cols-quote",
	"grid-cols-settings",
	"grid-cols-workbench",
];

export const utilityGroups = [
	{
		items: [
			"w-page",
			"w-page-narrow",
			"w-sidebar",
			"pl-sidebar",
			"pt-hero",
			"max-w-85vw",
			"w-dialog-narrow",
			"max-w-dialog",
			"max-h-dialog",
			"h-84dvh",
			"max-h-84dvh",
			"min-h-60vh",
			"max-h-30dvh",
			"max-h-45dvh",
			"max-h-58vh",
			"max-h-docs-rail",
		],
		label: "Layout & viewport",
		note: "Page width, rails, and height caps",
	},
	{
		items: [
			"grid-cols-docs-shell",
			"grid-cols-docs-wide",
			"grid-cols-docs",
			"grid-cols-card-action",
			"grid-rows-card-desc",
			"grid-cols-footer",
			"grid-cols-product",
			"grid-cols-product-wide",
			"grid-cols-quote",
			"grid-cols-enterprise",
			"grid-cols-settings",
			"grid-cols-app-rail",
			"grid-cols-asset-browser",
			"grid-cols-asset-dialog",
			"grid-cols-page-meta",
			"grid-cols-workbench",
		],
		label: "Grids & geometry",
		note: "Every repeated column recipe",
	},
	{
		items: ["gap-card", "py-card", "px-card", "p-card", "pb-card"],
		label: "Spacing & cards",
		note: "Card padding driven by --card-spacing",
	},
	{
		items: [
			"bottom-status",
			"top-12p",
			"max-h-available",
			"w-anchor",
			"h-switch",
			"translate-switch-checked",
			"translate-y-tooltip-arrow",
			"tabs-trigger-h",
			"origin-transform",
		],
		label: "Micro geometry",
		note: "Primitive-specific mechanics",
	},
	{
		items: [
			"transition-gb",
			"transition-card",
			"transition-color-shadow",
			"shadow-soft",
			"shadow-lift",
			"shadow-nav",
		],
		label: "Motion & elevation",
		note: "Shared durations and warm shadows",
	},
];

export const primitives = [
	{ name: "alert", purpose: "Inline status and error block with a title" },
	{ name: "alert-dialog", purpose: "Destructive confirmation before a write" },
	{ name: "badge", purpose: "24px pill for counts, states, and drift" },
	{ name: "button", purpose: "Pill action; 7 variants and 8 sizes" },
	{ name: "card", purpose: "16px hairline surface for one decision" },
	{ name: "checkbox", purpose: "Multi-select rows and field groups" },
	{ name: "dialog", purpose: "Focused task without leaving the page" },
	{ name: "empty", purpose: "Neutral empty state with one next step" },
	{ name: "field", purpose: "Label, control, description, and error" },
	{ name: "input", purpose: "36px text field on a 12px radius" },
	{ name: "input-group", purpose: "Input with a leading icon or action" },
	{ name: "item", purpose: "List row for entries and pickers" },
	{ name: "kbd", purpose: "Mono keyboard chip" },
	{ name: "label", purpose: "Accessible field label" },
	{ name: "scroll-area", purpose: "Styled overflow region" },
	{ name: "select", purpose: "Schema, status, and collection choices" },
	{ name: "separator", purpose: "Hairline between toolbar groups" },
	{ name: "skeleton", purpose: "Loading placeholder at the final size" },
	{ name: "sonner", purpose: "Toast feedback for writes and sync" },
	{ name: "spinner", purpose: "Inline indeterminate progress" },
	{ name: "switch", purpose: "Immediate on/off preference" },
	{ name: "table", purpose: "Dense scanning for entries and trash" },
	{ name: "tabs", purpose: "Markdown / visual and section panels" },
	{ name: "textarea", purpose: "Descriptions, promises, and raw JSON" },
	{ name: "tooltip", purpose: "Short hover label for icon actions" },
];

export const systemComponents = [
	{ group: "App", name: "PageShell", purpose: "Shared app content column" },
	{ group: "App", name: "PageHeader", purpose: "Eyebrow, display title, actions, meta" },
	{ group: "App", name: "SectionHeader", purpose: "In-page heading rhythm" },
	{ group: "App", name: "EmptyState", purpose: "Neutral empty result with one next step" },
	{ group: "App", name: "SyncBadge", purpose: "Relative read-model freshness" },
	{ group: "Docs", name: "DocsShell", purpose: "232 / 1fr / 208 three-rail docs layout" },
	{ group: "Docs", name: "DocsNav", purpose: "Tree nav with an orange active rail" },
	{ group: "Docs", name: "DocsToc", purpose: "Right-rail on-this-page links" },
	{ group: "Docs", name: "Hint", purpose: "Info, success, warning, danger callout" },
	{ group: "Docs", name: "LinkCards", purpose: "Two-up docs link table" },
	{ group: "Marketing", name: "Hero", purpose: "Centered display headline and pill actions" },
	{ group: "Marketing", name: "ProductStage", purpose: "Orange halo and browser frame" },
	{ group: "Marketing", name: "FeatureGrid", purpose: "Four-up bento with an optional orbit" },
	{ group: "Marketing", name: "FeatureSplit", purpose: "Alternating two-column story rows" },
	{ group: "Marketing", name: "Testimonial", purpose: "Logo card, quote, and attribution" },
	{ group: "Marketing", name: "EnterpriseGrid", purpose: "Feature ring around certification art" },
	{ group: "Marketing", name: "Customers", purpose: "Scroll-snap customer carousel" },
	{ group: "Marketing", name: "FinalCta", purpose: "Centered close with watermark mark" },
	{ group: "Marketing", name: "Footer", purpose: "Link matrix and promotional cards" },
	{ group: "System", name: "BrandMark", purpose: "Three-plane layered-page mark" },
	{ group: "System", name: "Wordmark", purpose: "Mark, name, and optional mono badge" },
	{ group: "System", name: "Reveal", purpose: "One-shot fade-rise-deblur entrance" },
];

export const motionTokens = [
	{
		label: "Spring ease",
		name: "--ease-spring",
		usage: "Entrances, hovers, and disclosures",
		value: "cubic-bezier(0.22, 1, 0.36, 1)",
	},
	{
		label: "Out quint",
		name: "--ease-out-quint",
		usage: "Short exits and opacity resolves",
		value: "cubic-bezier(0.16, 1, 0.3, 1)",
	},
];

export const keyframes = [
	{ className: "animate-rise", duration: "500ms", name: "rise-in", usage: "App page headers" },
	{
		className: "animate-rise-delayed",
		duration: "650ms + 100ms",
		name: "rise-in",
		usage: "Secondary header content",
	},
	{
		className: "animate-gb-fade-up",
		duration: "700ms",
		name: "gb-fade-up",
		usage: "Marketing entrances",
	},
	{
		className: "animate-gb-pop",
		duration: "220ms",
		name: "gb-pop",
		usage: "Popovers and mobile drawers",
	},
	{
		className: "animate-gb-tab-in",
		duration: "420ms",
		name: "gb-tab-in",
		usage: "Tab panel crossfade",
	},
	{
		className: "animate-gb-marquee",
		duration: "38s",
		name: "gb-marquee",
		usage: "Logo cloud; pauses on hover",
	},
	{
		className: "animate-gb-float",
		duration: "6s",
		name: "gb-float",
		usage: "Floating status chips",
	},
	{
		className: "animate-gb-glow",
		duration: "5s",
		name: "gb-glow",
		usage: "Brand halo pulse",
	},
	{
		className: "dash-march",
		duration: "1.6s",
		name: "gb-dash",
		usage: "Marching connectors",
	},
];

export const marketingFlow = [
	{
		components: "Hero · HeroFrame · actions",
		step: "01",
		title: "Display headline + pill actions",
	},
	{
		components: "ProductStage · ProductDemo",
		step: "02",
		title: "Product stage with orange halo",
	},
	{ components: "LogoCloud · LogoWordmark", step: "03", title: "Masked logo marquee" },
	{ components: "AgentRow", step: "04", title: "Agent capsule + copy prompt" },
	{ components: "FeatureSplit · illustrations", step: "05", title: "Alternating story rows" },
	{ components: "FeatureGrid · SystemOrbit", step: "06", title: "Orbit + four-up bento" },
	{ components: "Testimonial", step: "07", title: "Customer quote" },
	{ components: "EnterpriseGrid · EnterpriseArt", step: "08", title: "Certification feature ring" },
	{ components: "Customers", step: "09", title: "Scroll-snap customer carousel" },
	{ components: "FinalCta · Footer", step: "10", title: "Close + link matrix" },
];

export const docsGroups = [
	{
		items: [
			{ href: "#patterns", label: "Quickstart" },
			{ active: true, href: "#tokens", label: "Design tokens" },
			{ href: "#motion", label: "Motion" },
		],
		title: "Get started",
	},
	{
		items: [
			{ href: "#components", label: "Hints" },
			{ href: "#components", label: "Link cards" },
			{ href: "#components", label: "Tabs" },
		],
		title: "Components",
	},
];

export const docsToc = [
	{ href: "#tokens", label: "Tokens" },
	{ active: true, href: "#motion", label: "Motion" },
	{ href: "#components", label: "Components" },
];
