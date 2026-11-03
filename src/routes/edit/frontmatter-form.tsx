import type * as React from "react";

import { Hint } from "#/components/gitbook/hint";
import { Checkbox } from "#/components/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import type { Frontmatter, MediaItem } from "./helpers";
import { asStringList, asStringMap } from "./helpers";

interface FrontmatterFormProps {
	aiDraft: string | null;
	fieldErrors: Record<string, string>;
	fm: Frontmatter;
	media: MediaItem[];
	setFm: React.Dispatch<React.SetStateAction<Frontmatter>>;
}

export function FrontmatterForm({ aiDraft, fieldErrors, fm, media, setFm }: FrontmatterFormProps) {
	const set = (k: string, v: unknown): void => {
		setFm((p) => ({ ...p, [k]: v }));
	};
	const tag = (k: string, v: string) =>
		set(
			k,
			v
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean),
		);
	return (
		<FieldGroup>
			{aiDraft ? (
				<Hint title="AI draft" variant="info">
					AI-drafted until edited: {aiDraft}
				</Hint>
			) : null}
			<Field data-invalid={Boolean(fieldErrors.title)}>
				<FieldLabel htmlFor="fm-title">title</FieldLabel>
				<Input
					id="fm-title"
					onChange={(e) => set("title", e.target.value)}
					value={String(fm.title ?? "")}
				/>
				{fieldErrors.title && <FieldError>{fieldErrors.title}</FieldError>}
			</Field>
			{/* Single source: description and excerpt are independent keys. Each field writes only its own key (no cross-write), so clearing one never resurrects the other. */}
			<Field>
				<FieldLabel htmlFor="fm-description">description</FieldLabel>
				<Textarea
					id="fm-description"
					onChange={(e) => set("description", e.target.value)}
					value={String(fm.description ?? "")}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-excerpt">excerpt</FieldLabel>
				<Textarea
					id="fm-excerpt"
					onChange={(e) => set("excerpt", e.target.value)}
					value={String(fm.excerpt ?? "")}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-status">status</FieldLabel>
				<Select onValueChange={(v) => set("status", v)} value={String(fm.status ?? "draft")}>
					<SelectTrigger id="fm-status">
						<SelectValue placeholder="Select status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="draft">draft</SelectItem>
						<SelectItem value="published">published</SelectItem>
						<SelectItem value="scheduled">scheduled</SelectItem>
					</SelectContent>
				</Select>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-publish-date">publishDate</FieldLabel>
				<Input
					id="fm-publish-date"
					onChange={(e) => set("publishDate", e.target.value)}
					type="date"
					value={String(fm.publishDate ?? fm.date ?? "").slice(0, 10)}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-modified">modifiedDate</FieldLabel>
				<Input
					id="fm-modified"
					onChange={(e) => set("modifiedDate", e.target.value)}
					value={String(fm.modifiedDate ?? "")}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-author">author</FieldLabel>
				<Input
					id="fm-author"
					onChange={(e) => set("author", e.target.value)}
					value={String(fm.author ?? "")}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-categories">categories (comma)</FieldLabel>
				<Input
					id="fm-categories"
					onChange={(e) =>
						tag(fm.categories === undefined ? "filter_category" : "categories", e.target.value)
					}
					value={asStringList(fm.categories ?? fm.filter_category).join(", ")}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-tags">tags (comma)</FieldLabel>
				<Input
					id="fm-tags"
					onChange={(e) => tag("tags", e.target.value)}
					value={asStringList(fm.tags).join(", ")}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-keywords">keywords (comma)</FieldLabel>
				<Input
					id="fm-keywords"
					onChange={(e) => tag("keywords", e.target.value)}
					value={asStringList(fm.keywords).join(", ")}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-hero">hero_image / featuredImage</FieldLabel>
				<Input
					id="fm-hero"
					onChange={(e) =>
						set(fm.hero_image === undefined ? "featuredImage" : "hero_image", e.target.value)
					}
					value={String(fm.hero_image ?? fm.featuredImage ?? "")}
				/>
				<MediaPicker
					media={media}
					onPick={(p: string) =>
						set(fm.hero_image === undefined ? "featuredImage" : "hero_image", p)
					}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-og-image">ogImage</FieldLabel>
				<Input
					id="fm-og-image"
					onChange={(e) => set("ogImage", e.target.value)}
					value={String(fm.ogImage ?? "")}
				/>
				<MediaPicker media={media} onPick={(p: string) => set("ogImage", p)} />
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-canonical">canonicalUrl</FieldLabel>
				<Input
					id="fm-canonical"
					onChange={(e) => set("canonicalUrl", e.target.value)}
					value={String(fm.canonicalUrl ?? "")}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-meta-title">metaTitle</FieldLabel>
				<Input
					id="fm-meta-title"
					onChange={(e) => set("metaTitle", e.target.value)}
					value={String(fm.metaTitle ?? "")}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-meta-desc">metaDescription</FieldLabel>
				<Textarea
					id="fm-meta-desc"
					onChange={(e) => set("metaDescription", e.target.value)}
					value={String(fm.metaDescription ?? "")}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-og-type">ogType</FieldLabel>
				<Input
					id="fm-og-type"
					onChange={(e) => set("ogType", e.target.value)}
					value={String(fm.ogType ?? "article")}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-twitter">twitterCard</FieldLabel>
				<Input
					id="fm-twitter"
					onChange={(e) => set("twitterCard", e.target.value)}
					value={String(fm.twitterCard ?? "summary_large_image")}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-hero-tag">hero_tag</FieldLabel>
				<Select onValueChange={(v) => set("hero_tag", v || null)} value={String(fm.hero_tag ?? "")}>
					<SelectTrigger id="fm-hero-tag">
						<SelectValue placeholder="(none)" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="">(none)</SelectItem>
						<SelectItem value="featured">featured</SelectItem>
						<SelectItem value="open-source">open-source</SelectItem>
						<SelectItem value="ongoing">ongoing</SelectItem>
					</SelectContent>
				</Select>
			</Field>
			<Field orientation="horizontal">
				<Checkbox
					checked={Boolean(fm.noindex)}
					id="fm-noindex"
					onCheckedChange={(checked) => set("noindex", checked === true)}
				/>
				<FieldLabel htmlFor="fm-noindex">noindex</FieldLabel>
				<Checkbox
					checked={Boolean(fm.nofollow)}
					id="fm-nofollow"
					onCheckedChange={(checked) => set("nofollow", checked === true)}
				/>
				<FieldLabel htmlFor="fm-nofollow">nofollow</FieldLabel>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-schema">schemaType</FieldLabel>
				<Select onValueChange={(v) => set("schemaType", v)} value={String(fm.schemaType ?? "")}>
					<SelectTrigger id="fm-schema">
						<SelectValue placeholder="(none)" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="">(none)</SelectItem>
						{[
							"BlogPosting",
							"Article",
							"HowTo",
							"WebPage",
							"WebPage/About",
							"WebPage/FAQ",
							"SoftwareApplication",
							"Review",
							"Organization",
							"Person",
							"Product",
						].map((t) => (
							<SelectItem key={t} value={t}>
								{t}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-schema-fields">schemaFields (JSON)</FieldLabel>
				<Textarea
					className="font-mono"
					id="fm-schema-fields"
					onChange={(e) => {
						try {
							set("schemaFields", JSON.parse(e.target.value));
						} catch {
							set("schemaFields", e.target.value);
						}
					}}
					value={
						typeof fm.schemaFields === "object"
							? JSON.stringify(fm.schemaFields, null, 2)
							: String(fm.schemaFields ?? "")
					}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-github">links.github</FieldLabel>
				<Input
					id="fm-github"
					onChange={(e) => set("links", { ...asStringMap(fm.links), github: e.target.value })}
					value={String(asStringMap(fm.links).github ?? "")}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-preview">links.preview</FieldLabel>
				<Input
					id="fm-preview"
					onChange={(e) => set("links", { ...asStringMap(fm.links), preview: e.target.value })}
					value={String(asStringMap(fm.links).preview ?? "")}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-timeline">timeline</FieldLabel>
				<Input
					id="fm-timeline"
					onChange={(e) => set("timeline", e.target.value)}
					value={String(fm.timeline ?? "")}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-year">year</FieldLabel>
				<Input
					id="fm-year"
					onChange={(e) => set("year", Number(e.target.value))}
					type="number"
					value={Number(fm.year ?? 2024)}
				/>
			</Field>
		</FieldGroup>
	);
}

function MediaPicker({
	media,
	onPick,
}: {
	media: { path: string }[];
	onPick: (p: string) => void;
}) {
	return (
		<Select onValueChange={(v) => v && onPick(v)} value="">
			<SelectTrigger>
				<SelectValue placeholder="Pick media…" />
			</SelectTrigger>
			<SelectContent>
				{media.slice(0, 200).map((m) => (
					<SelectItem key={m.path} value={m.path}>
						{m.path}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
