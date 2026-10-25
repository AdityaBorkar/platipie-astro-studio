import { createFileRoute, Link } from "@tanstack/react-router";
import {
	AccessibilityIcon,
	ArrowRightIcon,
	BlocksIcon,
	ChevronRightIcon,
	Code2Icon,
	CommandIcon,
	ComponentIcon,
	FrameIcon,
	LayersIcon,
	MonitorSmartphoneIcon,
	MousePointerClickIcon,
	PaletteIcon,
	RulerIcon,
	SparklesIcon,
	SwatchBookIcon,
	TypeIcon,
	ZapIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import {
	BrandMark,
	DocsNav,
	DocsToc,
	EmptyState,
	Hint,
	LinkCards,
	PageHeader,
	PageShell,
	Reveal,
	SectionHeader,
	ShowcaseTabs,
	Wordmark,
} from "#/components/gitbook";
import { ThemeToggle } from "#/components/theme-toggle";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Checkbox } from "#/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "#/components/ui/input-group";
import { Kbd, KbdGroup } from "#/components/ui/kbd";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import { Spinner } from "#/components/ui/spinner";
import { Switch } from "#/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { Textarea } from "#/components/ui/textarea";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/design")({
	component: DesignSystemPage,
	head: () => ({ meta: [{ title: "Design system · platipie-cms" }] }),
});

const sections = [
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

const sectionIds = sections.map((section) => section.href.slice(1));

const stats = [
	{ detail: "Light + dark semantic roles", label: "Color tokens", value: "46" },
	{ detail: "display → 9px micro labels", label: "Type steps", value: "11" },
	{ detail: "shadcn base-nova primitives", label: "UI surfaces", value: "25" },
	{ detail: "Named @utility, no arbitrary values", label: "Utilities", value: "54" },
];

const sources = [
	{
		detail: "Colors, type, radii, shadows, utilities, keyframes",
		file: "src/styles.css",
	},
	{ detail: "25 shadcn primitives on the base-nova preset", file: "src/components/ui" },
	{ detail: "22 GitBook-inspired marketing and docs modules", file: "src/components/gitbook" },
	{ detail: "The written rules this page renders", file: "DESIGN.md" },
];

const principles = [
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

// Token tables mirror the :root, .dark, and @theme inline blocks in
// src/styles.css. Update both in the same change.
interface ColorToken {
	dark: string;
	light: string;
	name: string;
	usage: string;
}

const surfaceTokens: ColorToken[] = [
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

const actionTokens: ColorToken[] = [
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

const brandTokens: ColorToken[] = [
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

const chromeTokens: ColorToken[] = [
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

const chartTokens: ColorToken[] = [
	{ dark: "#ff6a35", light: "#fe551b", name: "--chart-1", usage: "Primary series" },
	{ dark: "#fafaf9", light: "#1c1917", name: "--chart-2", usage: "Contrast series" },
	{ dark: "var(--warning)", light: "var(--warning)", name: "--chart-3", usage: "Caution series" },
	{ dark: "#7ce3b6", light: "#a4f4cf", name: "--chart-4", usage: "Positive series" },
	{ dark: "#8b8b86", light: "#8b8b86", name: "--chart-5", usage: "Neutral series" },
];

const typeScale = [
	{
		className: "text-display",
		label: "--text-display",
		leading: "1",
		lineHeight: "1 · -0.02em",
		sample: "Accurate",
		size: "45px",
	},
	{
		className: "text-display-sm",
		label: "--text-display-sm",
		leading: "1.2",
		lineHeight: "1.2 · -0.02em",
		sample: "Better answers.",
		size: "38px",
	},
	{
		className: "text-heading",
		label: "--text-heading",
		leading: "1.2",
		lineHeight: "1.2",
		sample: "Content health",
		size: "32px",
	},
	{
		className: "text-title",
		label: "--text-title",
		leading: "1.3",
		lineHeight: "1.3",
		sample: "Stale content queue",
		size: "20px",
	},
	{
		className: "text-15",
		label: "--text-15",
		leading: "1.6",
		lineHeight: "1.6",
		sample: "Files are the source of truth.",
		size: "15px",
	},
	{
		className: "text-base",
		label: "text-base",
		leading: "1.6",
		lineHeight: "1.6",
		sample: "Files are the source of truth.",
		size: "16px",
	},
	{
		className: "text-13",
		label: "--text-13",
		leading: "1.5",
		lineHeight: "1.5",
		sample: "Sidebar navigation and dense rows.",
		size: "13px",
	},
	{
		className: "text-12",
		label: "--text-12",
		leading: "1.5",
		lineHeight: "1.5",
		sample: "Secondary metadata",
		size: "12px",
	},
	{
		className: "text-11",
		label: "--text-11",
		leading: "1.4",
		lineHeight: "1.4",
		sample: "EYEBROWS AND LABELS",
		size: "11px",
	},
	{
		className: "text-10",
		label: "--text-10",
		leading: "1.4",
		lineHeight: "1.4",
		sample: "MONO BADGES · TRACE IDS",
		size: "10px",
	},
	{
		className: "text-9",
		label: "--text-9",
		leading: "1.2",
		lineHeight: "1.2",
		sample: "MICRO CHIPS",
		size: "9px",
	},
];

const radii = [
	{ className: "rounded-sm", label: "sm", token: "--radius-sm", value: "8px" },
	{ className: "rounded-md", label: "md", token: "--radius-md", value: "8px" },
	{ className: "rounded-lg", label: "lg", token: "--radius-lg", value: "12px" },
	{ className: "rounded-xl", label: "xl", token: "--radius-xl", value: "16px" },
	{ className: "rounded-2xl", label: "2xl", token: "--radius-2xl", value: "24px" },
	{ className: "rounded-3xl", label: "3xl", token: "--radius-3xl", value: "28px" },
	{ className: "rounded-4xl", label: "4xl", token: "--radius-4xl", value: "32px" },
];

const shadows = [
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

const rails = [
	{ bar: "100%", label: "Page", token: "w-page", value: "1200px / 75rem" },
	{ bar: "81%", label: "Narrow prose", token: "w-page-narrow", value: "976px / 61rem" },
	{ bar: "22%", label: "App rail", token: "w-sidebar", value: "264px / 16.5rem" },
	{ bar: "19%", label: "Docs tree", token: "grid-cols-docs-shell", value: "232px" },
	{ bar: "17%", label: "Docs TOC", token: "grid-cols-docs-wide", value: "208px" },
	{ bar: "47%", label: "Editor side rails", token: "grid-cols-editor", value: "272 + 288px" },
	{
		bar: "33%",
		label: "Product stage",
		token: "grid-cols-product-wide",
		value: "180 + 1fr + 220px",
	},
];

const breakpoints = [
	{ label: "base", range: "0–639px", rule: "One column; the app rail becomes a drawer" },
	{ label: "sm", range: "640px+", rule: "Two-up fields, cards, and stat grids" },
	{ label: "md", range: "768px+", rule: "Three-column form and metadata rows" },
	{ label: "lg", range: "1024px+", rule: "Fixed 264px rail; content offset with pl-sidebar" },
	{ label: "xl", range: "1280px+", rule: "Three-rail docs shell; four-up stats" },
	{ label: "2xl", range: "1536px+", rule: "Wider gutters, same 1200px content" },
];

const gridUtilities = [
	"grid-cols-app-rail",
	"grid-cols-card-action",
	"grid-cols-docs",
	"grid-cols-docs-shell",
	"grid-cols-docs-wide",
	"grid-cols-editor",
	"grid-cols-enterprise",
	"grid-cols-fields",
	"grid-cols-fields-wide",
	"grid-cols-footer",
	"grid-cols-history",
	"grid-cols-page-meta",
	"grid-cols-pages-workspace",
	"grid-cols-product",
	"grid-cols-product-wide",
	"grid-cols-quote",
	"grid-cols-settings",
];

const utilityGroups = [
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
			"max-h-workspace-menu",
			"max-h-docs-rail",
		],
		label: "Layout & viewport",
		note: "Page width, rails, and height caps",
	},
	{
		items: [
			"grid-cols-fields",
			"grid-cols-fields-wide",
			"grid-cols-history",
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
			"grid-cols-pages-workspace",
			"grid-cols-page-meta",
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

const primitives = [
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

const systemComponents = [
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

const motionTokens = [
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

const keyframes = [
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

const marketingFlow = [
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

const docsGroups = [
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

const docsToc = [
	{ href: "#tokens", label: "Tokens" },
	{ active: true, href: "#motion", label: "Motion" },
	{ href: "#components", label: "Components" },
];

function currentSectionHref() {
	let current = sectionIds[0] ?? "overview";
	for (const id of sectionIds) {
		const element = document.querySelector(`#${id}`);
		if (element && element.getBoundingClientRect().top <= 200) current = id;
	}
	return `#${current}`;
}

function useActiveSection() {
	const [active, setActive] = useState(sectionIds[0] ? `#${sectionIds[0]}` : "#overview");

	useEffect(() => {
		if (typeof IntersectionObserver === "undefined") return;
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) setActive(`#${entry.target.id}`);
				}
			},
			{ rootMargin: "-18% 0px -70% 0px", threshold: 0 },
		);
		for (const id of sectionIds) {
			const element = document.querySelector(`#${id}`);
			if (element) observer.observe(element);
		}
		const frame = requestAnimationFrame(() => setActive(currentSectionHref()));
		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
		};
	}, []);

	return active;
}

function DesignSystemPage() {
	const active = useActiveSection();

	return (
		<div>
			<PageShell className="pb-16">
				<div className="relative isolate scroll-mt-24" id="overview">
					<div aria-hidden="true" className="page-glow -z-10" />
					<PageHeader
						actions={
							<>
								<Button
									className="h-10 px-5"
									nativeButton={false}
									render={<a aria-label="Browse tokens" href="#tokens" />}
									size="lg"
								>
									Browse tokens
									<ArrowRightIcon />
								</Button>
								<Button
									className="h-10 px-5"
									nativeButton={false}
									render={<a aria-label="Component gallery" href="#components" />}
									size="lg"
									variant="outline"
								>
									Component gallery
								</Button>
							</>
						}
						description={
							<>
								Every surface resolves through the shadcn token layer in <code>src/styles.css</code>
								. This page is the live reference: colors, type, radii, utilities, primitives,
								GitBook surfaces, and the motion that holds them together.
							</>
						}
						eyebrow="Design system · 2026"
						meta={
							<>
								<Badge variant="brand">v1 · shadcn tokens</Badge>
								<Badge variant="outline">Tailwind v4</Badge>
								<Badge variant="outline">General Sans + Geist Mono</Badge>
								<Badge variant="success">Light / dark</Badge>
							</>
						}
						title={
							<>
								Warm stone. One orange. <span className="text-brand">Black actions.</span>
							</>
						}
					/>

					<div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
						{stats.map((stat) => (
							<div className="rounded-xl border border-border bg-card p-4" key={stat.label}>
								<p className="font-mono text-10 font-bold tracking-12 text-muted-foreground uppercase">
									{stat.label}
								</p>
								<p className="mt-2 text-2xl font-bold tracking-heading">{stat.value}</p>
								<p className="mt-1 text-xs leading-relaxed text-muted-foreground">{stat.detail}</p>
							</div>
						))}
					</div>

					<div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
						<Panel icon={LayersIcon} note="The rules" title="Principles">
							<div className="grid gap-2">
								{principles.map((principle) => {
									const Icon = principle.icon;
									return (
										<div className="flex gap-3 rounded-lg bg-muted/50 p-3" key={principle.title}>
											<span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-card text-brand ring-1 ring-border">
												<Icon className="size-3.5" />
											</span>
											<span className="min-w-0">
												<span className="block text-xs font-bold tracking-tight">
													{principle.title}
												</span>
												<span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
													{principle.body}
												</span>
											</span>
										</div>
									);
								})}
							</div>
						</Panel>

						<Panel icon={Code2Icon} note="Read before editing" title="Source of truth">
							<div className="grid gap-2">
								{sources.map((source) => (
									<div
										className="rounded-lg border border-border bg-muted/30 px-3 py-2.5"
										key={source.file}
									>
										<p className="font-mono text-11 font-semibold text-foreground">{source.file}</p>
										<p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
											{source.detail}
										</p>
									</div>
								))}
							</div>
							<Hint className="mt-3" title="Token-first, always" variant="info">
								Add a semantic token in <code>:root</code>, <code>.dark</code>, and{" "}
								<code>@theme inline</code>. Never hard-code a hex in a component.
							</Hint>
						</Panel>
					</div>

					<div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
						{sections.slice(1).map((section) => {
							const Icon = section.icon;
							return (
								<a
									className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-card hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-soft"
									href={section.href}
									key={section.href}
								>
									<span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-brand">
										<Icon className="size-4" />
									</span>
									<span className="min-w-0">
										<span className="block text-sm font-bold tracking-tight">{section.label}</span>
										<span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
											{section.note}
										</span>
									</span>
									<ArrowRightIcon className="ml-auto size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
								</a>
							);
						})}
					</div>
				</div>

				<div className="sticky top-12 z-20 -mx-5 mt-8 border-y border-border bg-background/90 px-5 py-2 backdrop-blur-xl lg:top-0">
					<nav
						aria-label="Design system sections"
						className="gb-scroll-clean flex items-center gap-0.5 overflow-x-auto"
					>
						{sections.map((section) => {
							const Icon = section.icon;
							const selected = active === section.href;
							return (
								<a
									aria-current={selected ? "location" : undefined}
									className={cn(
										"inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-11 font-semibold transition-gb",
										selected
											? "bg-brand-soft text-brand"
											: "text-muted-foreground hover:bg-muted hover:text-foreground",
									)}
									href={section.href}
									key={section.href}
								>
									<Icon className="size-3.5" />
									{section.label}
								</a>
							);
						})}
					</nav>
				</div>

				<TokensSection />
				<BrandSection />
				<StyleSection />
				<LanguagesSection />
				<ComponentsSection />
				<MotionSection />
				<ViewportsSection />
				<PatternsSection />
			</PageShell>

			<footer className="border-t border-border bg-muted/40">
				<div className="mx-auto w-page px-5 py-10">
					<div className="flex flex-wrap items-start justify-between gap-6">
						<div>
							<Wordmark badge="design" />
							<p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
								A GitBook-inspired system built on shadcn tokens. Warm paper, one orange, black
								actions, pill geometry, hairline borders, and motion that resolves content.
							</p>
						</div>
						<nav aria-label="Design resources" className="grid gap-2 text-sm">
							<a className="text-muted-foreground hover:text-foreground" href="#overview">
								Back to overview
							</a>
							<Link className="text-muted-foreground hover:text-foreground" to="/components">
								Synced component inventory
							</Link>
							<Link className="text-muted-foreground hover:text-foreground" to="/settings">
								Appearance settings
							</Link>
						</nav>
					</div>
					<div className="mt-8 flex flex-wrap items-center gap-1.5 border-t border-border pt-5">
						<Badge variant="outline">src/styles.css</Badge>
						<Badge variant="outline">src/components/ui</Badge>
						<Badge variant="outline">src/components/gitbook</Badge>
						<Badge variant="outline">DESIGN.md</Badge>
						<span className="ml-auto text-xs text-muted-foreground">
							Keep this page current with every token or component change.
						</span>
					</div>
				</div>
			</footer>
		</div>
	);
}

function TokensSection() {
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
									style={{ lineHeight: type.leading }}
								>
									{type.sample}
								</p>
								<span className="ml-auto shrink-0 font-mono text-10 text-muted-foreground">
									{type.size} · {type.lineHeight}
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

function BrandSection() {
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

function StyleSection() {
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

function LanguagesSection() {
	return (
		<DesignSection
			description="Three layers, one vocabulary: raw values in :root, semantic shadcn variables in @theme, and named @utility escape hatches. Components only ever use the semantic classes."
			eyebrow="04 · Design languages"
			id="languages"
			title="How a decision becomes a class"
		>
			<div className="grid items-start gap-4 lg:grid-cols-2">
				<Panel icon={LayersIcon} note="never skip a layer" title="Layers">
					<div className="grid gap-2">
						{[
							{
								detail: "Raw hex and cubic-bezier values live here once, then flip in .dark",
								name: "Tokens",
							},
							{
								detail: "@theme inline maps them to color-*, text-*, tracking-*, and radius-*",
								name: "Theme",
							},
							{
								detail: "@utility names repeated geometry, motion, and elevation",
								name: "Utilities",
							},
							{
								detail: "Components use only semantic utilities and named tokens",
								name: "Surfaces",
							},
						].map((layer, index) => (
							<div
								className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5"
								key={layer.name}
							>
								<span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-card font-mono text-10 font-bold text-muted-foreground ring-1 ring-border">
									{index + 1}
								</span>
								<span className="min-w-0 flex-1">
									<span className="block text-xs font-bold text-foreground">{layer.name}</span>
									<span className="block text-11 leading-relaxed text-muted-foreground">
										{layer.detail}
									</span>
								</span>
								<ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
							</div>
						))}
					</div>
				</Panel>

				<Panel icon={Code2Icon} note="semantic first" title="Naming rules">
					<ul className="grid gap-2 text-xs text-muted-foreground">
						<li>
							<span className="font-mono text-foreground">--brand</span>,{" "}
							<span className="font-mono text-foreground">--brand-soft</span>, and{" "}
							<span className="font-mono text-foreground">--brand-mint</span> carry emphasis.
						</li>
						<li>
							Roles stay semantic: <span className="font-mono text-foreground">background</span>,{" "}
							<span className="font-mono text-foreground">muted</span>,{" "}
							<span className="font-mono text-foreground">border</span>,{" "}
							<span className="font-mono text-foreground">sidebar-accent</span>.
						</li>
						<li>Repeated geometry becomes an @utility, not a comment.</li>
						<li>Imports are sorted; type-only imports are explicit.</li>
						<li>
							ARIA states use <span className="font-mono text-foreground">data-*</span> variants,
							never a parallel color token.
						</li>
					</ul>
					<CodeBlock className="mt-4" label="Decision → class">
						{`/* 1. token */      --brand: #fe551b;
/* 2. theme */      --color-brand: var(--brand);
/* 3. utility */  @utility w-page { width: min(100%, 75rem); }
/* 4. surface */  className="bg-brand text-on-brand"`}
					</CodeBlock>
				</Panel>
			</div>

			<div className="mt-4">
				<Panel
					icon={ComponentIcon}
					note={`${utilityGroups.reduce((sum, group) => sum + group.items.length, 0)} named utilities`}
					title="Utility inventory"
				>
					<div className="grid gap-3 lg:grid-cols-2">
						{utilityGroups.map((group) => (
							<div className="rounded-xl border border-border bg-muted/30 p-3" key={group.label}>
								<div className="flex flex-wrap items-baseline justify-between gap-2">
									<p className="text-xs font-bold tracking-tight">{group.label}</p>
									<span className="font-mono text-9 text-muted-foreground">
										{group.items.length}
									</span>
								</div>
								<p className="mt-0.5 text-11 text-muted-foreground">{group.note}</p>
								<div className="mt-2 flex flex-wrap gap-1">
									{group.items.map((utility) => (
										<code
											className="rounded-md bg-card px-1.5 py-0.5 font-mono text-9 text-foreground ring-1 ring-border"
											key={utility}
										>
											{utility}
										</code>
									))}
								</div>
							</div>
						))}
					</div>
					<Hint className="mt-3" title="No arbitrary values" variant="warning">
						If a Tailwind value is not on the scale, add a named <code>@utility</code> in{" "}
						<code>src/styles.css</code>. The Tailwind lint rules reject arbitrary values.
					</Hint>
				</Panel>
			</div>
		</DesignSection>
	);
}

function ComponentsSection() {
	return (
		<DesignSection
			description="Everything is a shadcn primitive underneath. GitBook supplies the pill geometry, hairline borders, and hover language. All demos render against the current theme."
			eyebrow="05 · Components"
			id="components"
			title="Quiet surfaces, confident affordances"
		>
			<div className="grid items-start gap-4 lg:grid-cols-2">
				<Panel
					className="lg:col-span-2"
					icon={ComponentIcon}
					note="7 variants · 8 sizes"
					title="Buttons"
				>
					<div className="flex flex-wrap items-center gap-2">
						<Button>
							Primary action
							<ArrowRightIcon />
						</Button>
						<Button variant="secondary">Secondary</Button>
						<Button variant="outline">Outline</Button>
						<Button variant="ghost">Ghost</Button>
						<Button variant="brand">Brand</Button>
						<Button variant="destructive">Destructive</Button>
						<Button variant="link">Link</Button>
					</div>
					<Separator className="my-4" />
					<div className="flex flex-wrap items-center gap-2">
						<Button size="xs">Extra small</Button>
						<Button size="sm">Small</Button>
						<Button>Default</Button>
						<Button size="lg">Large</Button>
						<Button aria-label="Command" size="icon" variant="outline">
							<CommandIcon className="size-4" />
						</Button>
						<Button aria-label="Command" size="icon-sm" variant="ghost">
							<CommandIcon className="size-3.5" />
						</Button>
					</div>
				</Panel>

				<Panel icon={AccessibilityIcon} note="36px · 12px radius" title="Fields">
					<div className="grid gap-3">
						<Field>
							<FieldLabel htmlFor="design-title">Page title</FieldLabel>
							<Input defaultValue="Design tokens" id="design-title" />
							<FieldDescription>Shown in the page header and the browser tab.</FieldDescription>
						</Field>
						<InputGroup>
							<InputGroupAddon>
								<SwatchBookIcon />
							</InputGroupAddon>
							<InputGroupInput placeholder="Filter tokens, classes, or files" />
						</InputGroup>
						<Textarea placeholder="Write a short description…" />
						<div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
							<span className="flex items-center gap-2">
								<Switch aria-label="Notify on drift" defaultChecked /> Notify on drift
							</span>
							<span className="flex items-center gap-2">
								<Checkbox aria-label="Include drafts" defaultChecked /> Include drafts
							</span>
						</div>
					</div>
				</Panel>

				<Panel icon={CommandIcon} note="mono chips" title="Controls & keyboard">
					<div className="grid gap-4">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="secondary">36px control</Badge>
							<Badge variant="brand">orange emphasis</Badge>
							<Badge variant="success">verified</Badge>
							<Badge variant="outline">outline</Badge>
						</div>
						<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
							<span>Open the palette</span>
							<KbdGroup>
								<Kbd>Ctrl</Kbd>
								<Kbd>K</Kbd>
							</KbdGroup>
							<span className="mx-1 text-border">·</span>
							<span>Save the page</span>
							<KbdGroup>
								<Kbd>⌘</Kbd>
								<Kbd>S</Kbd>
							</KbdGroup>
						</div>
						<Separator />
						<div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
							<span className="inline-flex items-center gap-2">
								<Spinner /> Syncing inventory…
							</span>
							<span className="inline-flex items-center gap-2">
								<Skeleton className="h-3 w-16 rounded-full" /> Loading row
							</span>
						</div>
					</div>
				</Panel>

				<Panel icon={SparklesIcon} note="info · success · warning · danger" title="Callouts">
					<div className="grid gap-2">
						<Hint title="Grounded answers" variant="info">
							Every AI answer cites the exact page and section it came from.
						</Hint>
						<Hint title="Review passed" variant="success">
							All checks pass. The content matches the current product.
						</Hint>
						<Hint title="Drift detected" variant="warning">
							Two pages reference a flag that no longer exists.
						</Hint>
						<Hint title="Write blocked" variant="danger">
							The path sits outside the <code>project</code> jail.
						</Hint>
					</div>
				</Panel>

				<Panel icon={LayersIcon} note="16px surface" title="Cards">
					<Card className="shadow-soft">
						<CardHeader>
							<CardTitle>Stale content queue</CardTitle>
							<CardDescription>Oldest drift first. Review before it publishes.</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-2">
							<div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
								<span className="font-mono text-11">pricing.md</span>
								<Badge variant="brand">drift</Badge>
							</div>
							<div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
								<span className="font-mono text-11">auth.mdx</span>
								<Badge variant="success">clear</Badge>
							</div>
						</CardContent>
						<CardFooter className="justify-between gap-2">
							<span className="text-11 text-muted-foreground">2 checks · 1 warning</span>
							<Button size="sm">Review queue</Button>
						</CardFooter>
					</Card>
				</Panel>

				<Panel icon={BlocksIcon} note="muted header rail" title="Tables">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Page</TableHead>
								<TableHead>State</TableHead>
								<TableHead className="hidden sm:table-cell">Updated</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{[
								{ page: "/pricing", state: "drift", updated: "2m ago" },
								{ page: "/quickstart", state: "clear", updated: "1h ago" },
								{ page: "/auth", state: "clear", updated: "3h ago" },
							].map((row) => (
								<TableRow key={row.page}>
									<TableCell className="font-mono text-11">{row.page}</TableCell>
									<TableCell>
										<Badge variant={row.state === "drift" ? "brand" : "success"}>{row.state}</Badge>
									</TableCell>
									<TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
										{row.updated}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Panel>

				<Panel icon={FrameIcon} note="neutral, one next step" title="Empty state">
					<EmptyState
						compact
						description="Try a different route or clear the filter."
						icon={SwatchBookIcon}
						title="No tokens match"
					/>
				</Panel>

				<Panel icon={Code2Icon} note="crossfade panels" title="Tabs">
					<Tabs defaultValue="markdown">
						<TabsList>
							<TabsTrigger className="shrink-0" value="markdown">
								Markdown
							</TabsTrigger>
							<TabsTrigger className="shrink-0" value="visual">
								Visual
							</TabsTrigger>
							<TabsTrigger className="shrink-0" value="preview">
								Preview
							</TabsTrigger>
						</TabsList>
						<TabsContent value="markdown">
							<pre className="code-surface mt-2 overflow-x-auto p-3 font-mono text-11">{`# Quickstart

Files are the source of truth.`}</pre>
						</TabsContent>
						<TabsContent value="visual">
							<div className="mt-2 rounded-xl border border-border bg-muted/30 p-4">
								<p className="text-sm font-bold tracking-tight">Quickstart</p>
								<p className="mt-1 text-xs text-muted-foreground">
									A rich-text surface over the same file.
								</p>
							</div>
						</TabsContent>
						<TabsContent value="preview">
							<div className="prose-preview mt-2">
								<h3>Quickstart</h3>
								<p>Files are the source of truth. The CMS is a lens over them.</p>
							</div>
						</TabsContent>
					</Tabs>
				</Panel>

				<Panel icon={LayersIcon} note="popover list" title="Select">
					<div className="grid gap-3">
						<Select defaultValue="published">
							<SelectTrigger className="w-full" id="design-status">
								<SelectValue placeholder="Select status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="draft">draft</SelectItem>
								<SelectItem value="published">published</SelectItem>
								<SelectItem value="scheduled">scheduled</SelectItem>
							</SelectContent>
						</Select>
						<FieldDescription>
							Native-feeling popover with a checked indicator, keyboard navigation, and a portal.
						</FieldDescription>
						<div className="flex flex-wrap gap-1.5">
							<Badge variant="outline">36px trigger</Badge>
							<Badge variant="outline">portal</Badge>
							<Badge variant="outline">checked indicator</Badge>
						</div>
					</div>
				</Panel>
			</div>

			<div className="mt-4 grid gap-4">
				<LinkCards
					items={[
						{
							desc: "The docs shell, page header, and marketing order in one place.",
							href: "#patterns",
							icon: FrameIcon,
							title: "Patterns",
						},
						{
							desc: "Every duration, ease, and keyframe in the system.",
							href: "#motion",
							icon: ZapIcon,
							title: "Motion",
						},
						{
							desc: "Breakpoint behaviour and the 264px app rail.",
							href: "#viewports",
							icon: MonitorSmartphoneIcon,
							title: "Viewports",
						},
						{
							desc: "The primitive index and GitBook modules below.",
							href: "#primitives",
							icon: ComponentIcon,
							title: "Inventory",
						},
					]}
				/>
			</div>

			<div className="mt-4 grid gap-4">
				<Panel
					icon={ComponentIcon}
					id="primitives"
					note={`${primitives.length} files`}
					title="Primitive index"
				>
					<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
						{primitives.map((primitive) => (
							<div
								className="rounded-lg border border-border bg-muted/30 p-2.5"
								key={primitive.name}
							>
								<span className="font-mono text-11 font-semibold">{primitive.name}</span>
								<p className="mt-0.5 text-11 leading-relaxed text-muted-foreground">
									{primitive.purpose}
								</p>
							</div>
						))}
					</div>
				</Panel>

				<Panel
					icon={BlocksIcon}
					id="gitbook"
					note="src/components/gitbook"
					title="GitBook surfaces"
				>
					<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
						{systemComponents.map((component) => (
							<div
								className="rounded-lg border border-border bg-muted/30 p-2.5"
								key={component.name}
							>
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
			</div>

			<div className="mt-4">
				<ShowcaseTabs
					items={[
						{
							content: (
								<div className="grid gap-3 p-5 sm:p-7">
									<div className="flex flex-wrap items-center gap-2">
										<Badge variant="brand">review/quickstart</Badge>
										<Badge variant="secondary">2 checks</Badge>
										<Badge variant="success">Ready to merge</Badge>
									</div>
									<Hint title="Branch, review, merge" variant="success">
										Documentation follows the same flow as code. Reviewers approve the diff before
										anything publishes.
									</Hint>
									<div className="flex flex-wrap gap-2">
										<Button size="sm">New branch</Button>
										<Button size="sm" variant="outline">
											Request review
										</Button>
										<Button size="sm" variant="ghost">
											Merge
										</Button>
									</div>
								</div>
							),
							id: "collaborate",
							label: "Collaborate",
						},
						{
							content: (
								<div className="grid gap-3 p-5 sm:p-7">
									<Hint title="Drift detected" variant="warning">
										Two pages reference flags that no longer exist in the product. Queued for
										review.
									</Hint>
									<div className="grid gap-2 rounded-xl border border-border bg-card p-4">
										<p className="text-sm font-bold tracking-tight">Stale-content queue</p>
										<p className="text-xs text-muted-foreground">Oldest drift first</p>
										<div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
											<span className="rounded-md bg-muted px-2 py-1 font-mono">pricing.md</span>
											<span className="rounded-md bg-muted px-2 py-1 font-mono">auth.mdx</span>
										</div>
									</div>
								</div>
							),
							id: "detect",
							label: "Detect drift",
						},
						{
							content: (
								<div className="grid gap-3 p-5 sm:p-7">
									<Hint title="Assistant" variant="info">
										Grounded answers cite the exact page and section they came from.
									</Hint>
									<InputGroup>
										<InputGroupAddon>
											<SparklesIcon />
										</InputGroupAddon>
										<InputGroupInput placeholder="Ask your docs…" />
									</InputGroup>
								</div>
							),
							id: "answer",
							label: "Answer",
						},
					]}
				/>
			</div>
		</DesignSection>
	);
}

function MotionSection() {
	return (
		<DesignSection
			description="Motion resolves content rather than decorating it. Every entrance is transform + opacity, every duration is short, and everything disappears under reduced-motion."
			eyebrow="06 · Motion"
			id="motion"
			title="Spring ease, one-shot reveals, marching details"
		>
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				<MotionCard label="Reveal" note="750ms · translate + blur">
					<Reveal>
						<div className="animate-gb-float rounded-xl border border-border bg-card p-4 shadow-soft">
							<p className="text-xs font-bold">Resolves into place</p>
							<p className="mt-1 text-10 text-muted-foreground">fade · rise · deblur</p>
						</div>
					</Reveal>
				</MotionCard>
				<MotionCard label="Disclosure" note="500ms · track + deblur">
					<DisclosureDemo />
				</MotionCard>
				<MotionCard label="Marching dash" note="1.6s · linear loop">
					<svg aria-hidden="true" className="h-20 w-full" viewBox="0 0 200 80">
						<ellipse className="gb-connector dash-march" cx="100" cy="40" rx="80" ry="28" />
						<circle cx="100" cy="40" fill="var(--brand)" r="3" />
					</svg>
				</MotionCard>
				<MotionCard label="Marquee" note="38s · pause on hover">
					<div className="gb-mask-fade-x overflow-hidden">
						<div className="gb-marquee-track animate-gb-marquee gap-6">
							{["Acme", "bunq", "OpenHQ", "Northwind", "Contoso", "Fabrikam"].map((name) => (
								<span
									className="text-sm font-bold tracking-tight whitespace-nowrap text-muted-foreground"
									key={name}
								>
									{name}
								</span>
							))}
						</div>
					</div>
				</MotionCard>
				<MotionCard label="Brand glow" note="5s · ease-in-out pulse">
					<div className="rounded-full border border-brand/25 bg-brand/5 p-3">
						<div className="animate-gb-glow rounded-full bg-brand/20 px-6 py-3 text-center text-10 font-bold text-brand">
							content health
						</div>
					</div>
				</MotionCard>
				<MotionCard label="Hover lift" note="420ms · translateY(-4px)">
					<div className="gb-card-hover w-full max-w-52 rounded-xl border border-border bg-card p-4">
						<MousePointerClickIcon className="size-4 text-brand" />
						<p className="mt-2 text-xs font-bold">Hover this card</p>
						<p className="mt-0.5 text-10 text-muted-foreground">shadow-soft → shadow-lift</p>
					</div>
				</MotionCard>
			</div>

			<div className="mt-4 grid items-start gap-4 sm:grid-cols-3">
				{motionTokens.map((token) => (
					<Panel icon={ZapIcon} key={token.name} note={token.name} title={token.label}>
						<p className="font-mono text-11 text-muted-foreground">{token.value}</p>
						<p className="mt-2 text-11 leading-relaxed text-muted-foreground">{token.usage}</p>
					</Panel>
				))}
				<Panel icon={TypeIcon} note="three steps" title="Durations">
					<div className="grid gap-1.5 text-11">
						<div className="flex items-center justify-between gap-2">
							<code>transition-gb</code>
							<span className="font-mono text-muted-foreground">300ms</span>
						</div>
						<div className="flex items-center justify-between gap-2">
							<code>transition-card</code>
							<span className="font-mono text-muted-foreground">420ms</span>
						</div>
						<div className="flex items-center justify-between gap-2">
							<code>.gb-reveal</code>
							<span className="font-mono text-muted-foreground">750ms</span>
						</div>
					</div>
				</Panel>
			</div>

			<Panel className="mt-4" icon={TypeIcon} note="class → keyframe" title="Keyframe inventory">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Class</TableHead>
							<TableHead className="hidden sm:table-cell">Keyframe</TableHead>
							<TableHead>Duration</TableHead>
							<TableHead className="hidden sm:table-cell">Use</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{keyframes.map((keyframe) => (
							<TableRow key={keyframe.className}>
								<TableCell className="font-mono text-10">{keyframe.className}</TableCell>
								<TableCell className="hidden font-mono text-10 text-muted-foreground sm:table-cell">
									{keyframe.name}
								</TableCell>
								<TableCell className="font-mono text-10 text-muted-foreground">
									{keyframe.duration}
								</TableCell>
								<TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
									{keyframe.usage}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</Panel>

			<Hint className="mt-4" title="Reduced motion" variant="info">
				<code>prefers-reduced-motion: reduce</code> disables every animation and transition named
				above, and forces <code>.gb-reveal</code> to its resolved state. Scroll behavior becomes
				instant.
			</Hint>
		</DesignSection>
	);
}

function ViewportsSection() {
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

function PatternsSection() {
	return (
		<DesignSection
			description="Compositions combine the tokens and primitives into the app shell, the docs shell, and the marketing flow. These are the patterns to copy, not reinvent."
			eyebrow="08 · Patterns"
			id="patterns"
			title="The three shells and the marketing order"
		>
			<Panel icon={FrameIcon} note="232 / 1fr / 208" title="Docs shell">
				<div className="overflow-hidden rounded-xl border border-border bg-muted/20 p-3 sm:p-4">
					<div className="grid gap-4 lg:grid-cols-docs-shell xl:grid-cols-docs-wide">
						<aside className="hidden lg:block">
							<DocsNav groups={docsGroups} />
						</aside>
						<article className="min-w-0 rounded-lg border border-border bg-background p-4 sm:p-5">
							<p className="text-11 font-bold tracking-12 text-brand uppercase">Getting started</p>
							<h3 className="mt-2 text-2xl font-bold tracking-heading">Design tokens</h3>
							<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
								Every surface resolves to a shadcn variable. The palette is warm stone and
								off-white; the orange appears only when something needs attention.
							</p>
							<Hint className="mt-4" title="Token-first, always" variant="info">
								Use <code>bg-brand</code>, <code>text-muted-foreground</code>, or{" "}
								<code>border-border</code> so both themes stay coherent.
							</Hint>
							<div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
								<p className="text-xs font-bold tracking-tight">Next</p>
								<div className="mt-2 flex flex-wrap gap-1.5">
									<Badge variant="outline">Components</Badge>
									<Badge variant="outline">Motion</Badge>
									<Badge variant="outline">Patterns</Badge>
								</div>
							</div>
						</article>
						<aside className="hidden xl:block">
							<DocsToc items={docsToc} />
						</aside>
					</div>
				</div>
				<p className="mt-3 text-xs leading-relaxed text-muted-foreground">
					The tree pins at <code>top-24</code> and both rails cap at <code>max-h-docs-rail</code>.
					The active branch carries an orange rail; everything else stays quiet.
				</p>
			</Panel>

			<div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
				<Panel icon={ComponentIcon} note="PageShell + PageHeader" title="App page anatomy">
					<div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
						<p className="text-11 font-bold tracking-14 text-brand uppercase">App page</p>
						<p className="mt-2 text-2xl font-bold tracking-heading">Pages</p>
						<p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
							Astro routes, metadata, and the SEO rail. One header rhythm on every route.
						</p>
						<div className="mt-3 flex flex-wrap items-center gap-1.5">
							<Badge variant="success">synced 2m ago</Badge>
							<Badge variant="outline">18 pages</Badge>
							<Button size="sm">Sync now</Button>
						</div>
						<Separator className="my-4" />
						<SectionHeader
							description="The in-page heading keeps eyebrow, title, and action aligned."
							eyebrow="In-page section"
							title="Shared section heading"
						/>
					</div>
					<p className="mt-3 text-xs leading-relaxed text-muted-foreground">
						Every app page renders inside <code>PageShell</code> and opens with{" "}
						<code>PageHeader</code>. Dense forms skip <code>Reveal</code>.
					</p>
				</Panel>

				<Panel icon={FrameIcon} note="fixed rail + content" title="App shell">
					<div className="overflow-hidden rounded-xl border border-border">
						<div className="flex items-center gap-2 border-b border-border bg-sidebar px-3 py-2">
							<BrandMark className="size-4 text-brand" />
							<span className="text-xs font-bold">platipie-cms</span>
							<Badge className="ml-auto font-mono" variant="outline">
								main
							</Badge>
						</div>
						<div className="grid" style={{ gridTemplateColumns: "35% minmax(0, 1fr)" }}>
							<div className="grid gap-1.5 border-r border-sidebar-border bg-sidebar p-2">
								{["Dashboard", "Pages", "Content", "Assets", "Design"].map((item) => (
									<span
										className={cn(
											"rounded-md px-2 py-1 text-10",
											item === "Design"
												? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
												: "text-muted-foreground",
										)}
										key={item}
									>
										{item}
									</span>
								))}
							</div>
							<div className="min-w-0 p-3">
								<p className="text-10 font-bold tracking-12 text-muted-foreground uppercase">
									App page
								</p>
								<p className="mt-1 text-sm font-bold tracking-tight">Content</p>
								<div className="mt-2 grid gap-1.5">
									<div className="h-1.5 w-3/4 rounded-full bg-muted" />
									<div className="h-1.5 w-full rounded-full bg-muted" />
									<div className="h-1.5 w-5/6 rounded-full bg-muted" />
								</div>
							</div>
						</div>
					</div>
					<p className="mt-3 text-xs leading-relaxed text-muted-foreground">
						A 264px fixed rail on <code>lg</code>, a 48px top bar below it, and{" "}
						<code>lg:pl-sidebar</code> on the content. The rail holds identity, nav, and sync
						freshness.
					</p>
				</Panel>
			</div>

			<div className="mt-4">
				<Panel icon={BlocksIcon} note="GitBook order" title="Marketing composition">
					<ol className="grid gap-2 sm:grid-cols-2">
						{marketingFlow.map((item) => (
							<li
								className="flex gap-2.5 rounded-lg border border-border bg-muted/30 p-2.5"
								key={item.step}
							>
								<span className="font-mono text-10 font-bold text-brand">{item.step}</span>
								<span className="min-w-0">
									<span className="block text-xs font-bold tracking-tight">{item.title}</span>
									<span className="mt-0.5 block font-mono text-9 text-muted-foreground">
										{item.components}
									</span>
								</span>
							</li>
						))}
					</ol>
					<p className="mt-3 text-xs leading-relaxed text-muted-foreground">
						The marketing flow lives on the public site. Keep the order, spacing, and orange
						emphasis intact when recreating it here.
					</p>
				</Panel>
			</div>
		</DesignSection>
	);
}

function DesignSection({
	actions,
	children,
	description,
	eyebrow,
	id,
	title,
}: {
	actions?: ReactNode;
	children: ReactNode;
	description: string;
	eyebrow: string;
	id: string;
	title: string;
}) {
	return (
		<section className="scroll-mt-28 border-t border-border py-12 sm:py-16" id={id}>
			<SectionHeader actions={actions} description={description} eyebrow={eyebrow} title={title} />
			<div className="mt-8">{children}</div>
		</section>
	);
}

function Panel({
	children,
	className,
	icon: Icon,
	id,
	note,
	title,
}: {
	children: ReactNode;
	className?: string;
	icon?: LucideIcon;
	id?: string;
	note?: string;
	title: string;
}) {
	return (
		<div className={cn("rounded-xl border border-border bg-card p-5", className)} id={id}>
			<div className="mb-4 flex flex-wrap items-center justify-between gap-2">
				<h3 className="flex items-center gap-2 text-sm font-bold tracking-tight">
					{Icon ? <Icon aria-hidden="true" className="size-4 text-brand" /> : null}
					{title}
				</h3>
				{note ? <span className="font-mono text-10 text-muted-foreground">{note}</span> : null}
			</div>
			{children}
		</div>
	);
}

function Swatch({ className, token }: { className?: string; token: string }) {
	return (
		<span
			aria-hidden="true"
			className={cn("block size-6 shrink-0 rounded-md ring-1 ring-border", className)}
			style={{ backgroundColor: `var(${token})` }}
		/>
	);
}

function TokenTable({ rows }: { rows: ColorToken[] }) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Token</TableHead>
					<TableHead className="hidden sm:table-cell">Light</TableHead>
					<TableHead className="hidden sm:table-cell">Dark</TableHead>
					<TableHead className="hidden sm:table-cell">Use</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map((row) => (
					<TableRow key={row.name}>
						<TableCell>
							<span className="flex items-center gap-2.5">
								<Swatch token={row.name} />
								<span className="font-mono text-11">{row.name}</span>
							</span>
							<span className="mt-1 block font-mono text-9 text-muted-foreground sm:hidden">
								{row.light} · {row.dark}
							</span>
						</TableCell>
						<TableCell className="hidden font-mono text-11 text-muted-foreground sm:table-cell">
							{row.light}
						</TableCell>
						<TableCell className="hidden font-mono text-11 text-muted-foreground sm:table-cell">
							{row.dark}
						</TableCell>
						<TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
							{row.usage}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

function CodeBlock({
	children,
	className,
	label,
}: {
	children: string;
	className?: string;
	label: string;
}) {
	return (
		<div className={cn("overflow-hidden rounded-xl border border-border", className)}>
			<div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-1.5">
				<span className="font-mono text-9 font-bold tracking-12 text-muted-foreground uppercase">
					{label}
				</span>
				<Badge variant="outline">css</Badge>
			</div>
			<div className="code-surface rounded-none border-0">
				<pre className="overflow-x-auto p-4 text-11">{children}</pre>
			</div>
		</div>
	);
}

function DisclosureDemo() {
	const [open, setOpen] = useState(true);
	return (
		<div className="w-full max-w-52">
			<button
				aria-expanded={open}
				className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-11 font-semibold text-muted-foreground transition-gb hover:bg-sidebar-accent hover:text-foreground"
				onClick={() => setOpen((value) => !value)}
				type="button"
			>
				<LayersIcon className="size-3.5 shrink-0" />
				<span className="flex-1 truncate">Product</span>
				<ChevronRightIcon
					className={cn("size-3.5 shrink-0 transition-transform duration-300", open && "rotate-90")}
				/>
			</button>
			<div
				aria-hidden={open ? undefined : true}
				className="gb-accordion"
				data-open={open}
				inert={!open}
			>
				<div className="min-h-0 overflow-hidden">
					<ul className="gb-accordion-body gb-accordion-list mt-0.5 ml-3 grid gap-0.5 border-l border-sidebar-border pl-2">
						{["Overview", "Changelog", "Roadmap"].map((label) => (
							<li className="rounded-md px-2 py-1 text-10 text-muted-foreground" key={label}>
								{label}
							</li>
						))}
					</ul>
				</div>
			</div>
		</div>
	);
}

function MotionCard({
	children,
	label,
	note,
}: {
	children: ReactNode;
	label: string;
	note: string;
}) {
	return (
		<div className="overflow-hidden rounded-xl border border-border bg-card">
			<div className="flex h-28 items-center justify-center bg-muted/40 px-4">{children}</div>
			<div className="border-t border-border p-3">
				<p className="text-xs font-bold tracking-tight">{label}</p>
				<p className="mt-0.5 font-mono text-10 text-muted-foreground">{note}</p>
			</div>
		</div>
	);
}
