import {
	ArrowRightIcon,
	ArrowUpRightIcon,
	BookOpenIcon,
	FileTextIcon,
	BriefcaseIcon,
	CodeXmlIcon,
	MailIcon,
	PlayIcon,
} from "lucide-react";

import { cn } from "#/lib/utils";
import { Wordmark } from "./brand";
import { LogoWordmark } from "./logo-cloud";
import { Reveal } from "./motion";

interface FooterColumn {
	links: { href: string; label: string }[];
	title: string;
}

interface FooterProps {
	brand?: string;
	className?: string;
	columns?: FooterColumn[];
}

const defaultColumns: FooterColumn[] = [
	{
		links: [
			{ href: "/", label: "Dashboard" },
			{ href: "/design", label: "Design system" },
			{ href: "/settings", label: "Settings" },
		],
		title: "Workspace",
	},
	{
		links: [
			{ href: "/design", label: "Projects" },
			{ href: "/design", label: "Blog" },
			{ href: "/design", label: "Legal" },
		],
		title: "Collections",
	},
	{
		links: [
			{ href: "/design", label: "SPEC" },
			{ href: "/design", label: "Glossary" },
			{ href: "/design", label: "Verification" },
		],
		title: "Resources",
	},
];

/**
 * GitBook's light footer: orange section eyebrows, a wide link matrix, and a
 * right-hand stack of promotional cards led by a saturated orange enterprise
 * plate.
 */
export function Footer({ brand = "platipie", className, columns = defaultColumns }: FooterProps) {
	return (
		<footer className={cn("border-t border-border bg-muted", className)}>
			<div className="mx-auto w-page px-5 py-14">
				<div className="grid gap-12 lg:grid-cols-footer">
					<Reveal>
						<Wordmark badge="cms" />
						<p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
							A local-first content system for the Astro site. Files are the source of truth; every
							surface is built on shadcn tokens.
						</p>
						<div className="mt-10 grid grid-cols-2 gap-8 sm:grid-cols-3">
							{columns.map((column) => (
								<div key={column.title}>
									<p className="text-11 font-bold tracking-12 text-brand uppercase">
										{column.title}
									</p>
									<ul className="mt-3 grid gap-2.5">
										{column.links.map((link) => (
											<li key={link.label}>
												<a
													className="text-sm text-muted-foreground transition-colors hover:text-foreground"
													href={link.href}
												>
													{link.label}
												</a>
											</li>
										))}
									</ul>
								</div>
							))}
						</div>
					</Reveal>

					<Reveal delay={90} className="grid gap-4">
						<a
							aria-label="Enterprise: intelligent documentation built to scale"
							className="group relative overflow-hidden rounded-2xl bg-brand p-5 text-on-brand"
							href="/settings"
						>
							<div aria-hidden="true" className="absolute inset-0 opacity-50">
								<svg className="size-full" viewBox="0 0 300 180">
									<g className="gb-connector-light">
										<ellipse cx="240" cy="26" rx="90" ry="44" transform="rotate(-18 240 26)" />
										<ellipse cx="240" cy="26" rx="90" ry="44" transform="rotate(24 240 26)" />
										<ellipse cx="240" cy="26" rx="90" ry="44" transform="rotate(66 240 26)" />
									</g>
								</svg>
							</div>
							<div className="relative">
								<span className="inline-flex size-8 items-center justify-center rounded-lg bg-on-brand/15">
									<BookOpenIcon className="size-4" />
								</span>
								<p className="mt-4 text-11 font-bold tracking-12 uppercase opacity-80">
									Enterprise
								</p>
								<h3 className="mt-1 max-w-56 text-base leading-snug font-bold tracking-heading">
									Intelligent documentation built to scale
								</h3>
								<span className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-full bg-background px-3.5 text-xs font-bold text-brand transition-transform duration-300 group-hover:translate-x-0.5">
									Get a demo
									<ArrowRightIcon className="size-3.5" />
								</span>
							</div>
						</a>

						<a
							className="group rounded-2xl border border-border bg-brand-cream p-5 transition-colors hover:border-brand/25"
							href="/design"
						>
							<LogoWordmark className="text-foreground" name="FreedomPay" size="md" />
							<p className="mt-4 text-sm font-bold tracking-tight">FreedomPay</p>
							<p className="mt-1 text-sm leading-relaxed text-muted-foreground">
								How FreedomPay rebuilt its integration experience with platipie.
							</p>
							<span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground underline underline-offset-4">
								Read the story
							</span>
						</a>

						<a
							className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-foreground/15"
							href="/design"
						>
							<span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-brand">
								<FileTextIcon className="size-4" />
							</span>
							<span className="min-w-0 flex-1">
								<span className="block text-sm font-bold tracking-tight">
									The Content Health Report 2026
								</span>
								<span className="mt-0.5 block text-xs text-muted-foreground">
									What readers and agents get stuck on
								</span>
							</span>
							<ArrowUpRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
						</a>
					</Reveal>
				</div>

				<div className="mt-12 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
					<p className="text-xs text-muted-foreground">
						© 2026 {brand}. GitBook-inspired design system · shadcn tokens · no database.
					</p>
					<div className="flex items-center gap-1 sm:ml-auto">
						{[
							{ href: "https://github.com", icon: CodeXmlIcon, label: "GitHub" },
							{ href: "https://linkedin.com", icon: BriefcaseIcon, label: "LinkedIn" },
							{ href: "https://youtube.com", icon: PlayIcon, label: "YouTube" },
							{ href: "mailto:hello@adityab.tech", icon: MailIcon, label: "Email" },
						].map((social) => {
							const Icon = social.icon;
							return (
								<a
									aria-label={social.label}
									className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
									href={social.href}
									key={social.label}
								>
									<Icon className="size-4" />
								</a>
							);
						})}
					</div>
				</div>
			</div>
		</footer>
	);
}
