import { CircleCheckIcon, CircleXIcon, SparklesIcon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";
import type * as React from "react";
import { toast } from "sonner";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "#/components/ui/input-group";
import { Separator } from "#/components/ui/separator";
import { Spinner } from "#/components/ui/spinner";
import type { Frontmatter } from "./helpers";
import { requestAiSuggest } from "./helpers";

export interface SeoCheck {
	detail?: string;
	id: string;
	label: string;
	status: string;
}

export interface SeoCounts {
	descriptionLen?: number;
	titleLen?: number;
	wordCount?: number;
}

export interface SeoResponse {
	aiEnabled: boolean;
	checks: SeoCheck[];
	counts?: SeoCounts;
	jsonLd?: unknown;
	keywordCoverage?: number;
	readability?: { flesch?: number };
	score: number;
}

interface SeoPaneProps {
	aiBusy: boolean;
	body: string;
	fm: Frontmatter;
	seo: SeoResponse | null;
	setAiBusy: (busy: boolean) => void;
	setAiDraft: (draft: string | null) => void;
	setFm: React.Dispatch<React.SetStateAction<Frontmatter>>;
}

export function SeoPane({ aiBusy, body, fm, seo, setAiBusy, setAiDraft, setFm }: SeoPaneProps) {
	const [suggest, setSuggest] = useState<string[]>([]);
	if (!seo) return <p className="text-sm text-muted-foreground">Loading SEO…</p>;
	return (
		<div className="grid gap-3 text-sm">
			<div className="flex flex-wrap items-center gap-1.5">
				<Badge variant="brand">Score: {seo.score}/100</Badge>
				<Badge variant="outline">Flesch {seo.readability?.flesch}</Badge>
				<Badge variant="outline">keywords {seo.keywordCoverage}%</Badge>
			</div>
			<p className="text-xs text-muted-foreground">
				title {seo.counts?.titleLen} · desc {seo.counts?.descriptionLen} · words{" "}
				{seo.counts?.wordCount}
			</p>
			<ul className="grid gap-1">
				{seo.checks?.map((c) => (
					<li className="flex items-start gap-1.5 text-13" key={c.id}>
						{c.status === "pass" ? (
							<CircleCheckIcon className="mt-0.5 size-3.5 shrink-0 text-success" />
						) : c.status === "warn" ? (
							<TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0 text-warning" />
						) : (
							<CircleXIcon className="mt-0.5 size-3.5 shrink-0 text-destructive" />
						)}
						<span>
							{c.label}
							{c.detail ? ` — ${c.detail}` : ""}
						</span>
					</li>
				))}
			</ul>
			<details>
				<summary className="text-xs font-medium text-muted-foreground hover:text-foreground">
					JSON-LD preview
				</summary>
				<pre className="code-surface mt-2 max-h-45dvh overflow-auto p-3 font-mono text-xs">
					{JSON.stringify(seo.jsonLd, null, 2)?.slice(0, 2000)}
				</pre>
			</details>
			<Separator />
			<InputGroup>
				<InputGroupAddon>
					<SparklesIcon />
				</InputGroupAddon>
				<InputGroupInput
					aria-label="AI suggestion prompt context"
					placeholder="AI suggestions write back into the form…"
					readOnly
					value={suggest[0] ?? ""}
				/>
			</InputGroup>
			<div className="flex flex-wrap items-center gap-2">
				<Button
					disabled={!seo.aiEnabled || aiBusy}
					onClick={() => {
						setAiBusy(true);
						requestAiSuggest("excerpt", body, fm)
							.then((j) => {
								setSuggest(j.suggestions ?? []);
								if (j.suggestions?.[0]) {
									setFm((p) => ({ ...p, excerpt: j.suggestions[0] }));
									setAiDraft("excerpt (AI-drafted)");
								}
							})
							.catch((e: unknown) => toast.error(e instanceof Error ? e.message : String(e)))
							.finally(() => setAiBusy(false));
					}}
					size="sm"
					title={seo.aiEnabled ? "" : "Set AI_BASE_URL + AI_API_KEY to enable"}
					variant="outline"
				>
					{aiBusy && <Spinner />}
					Suggest excerpt
				</Button>
				<Button
					disabled={!seo.aiEnabled || aiBusy}
					onClick={() => {
						setAiBusy(true);
						requestAiSuggest("titles", body, fm)
							.then((j) => {
								setSuggest(j.suggestions ?? []);
							})
							.catch((e: unknown) => toast.error(e instanceof Error ? e.message : String(e)))
							.finally(() => setAiBusy(false));
					}}
					size="sm"
					title={seo.aiEnabled ? "" : "Set AI_BASE_URL + AI_API_KEY to enable"}
					variant="outline"
				>
					{aiBusy && <Spinner />}
					Suggest titles
				</Button>
				{!seo.aiEnabled && (
					<p className="text-xs text-muted-foreground">
						AI off — set <code>AI_BASE_URL</code> + <code>AI_API_KEY</code> (BYOK)
					</p>
				)}
			</div>
			{suggest.length > 0 && (
				<ul className="grid gap-1">
					{suggest.map((s) => (
						<li className="text-13" key={s}>
							{s}
						</li>
					))}
				</ul>
			)}
			<p className="font-mono text-xs text-muted-foreground">Never blocks save.</p>
		</div>
	);
}
