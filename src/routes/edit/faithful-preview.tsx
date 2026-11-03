import { useCallback } from "react";

import { Hint } from "#/components/gitbook/hint";
import { fetchJson, useCachedFetch } from "#/hooks/use-cached-fetch";
import { cmsKeys } from "../cms-keys";

interface FaithfulPreviewProps {
	collection: string;
	slug: string;
}

export function FaithfulPreview({ collection, slug }: FaithfulPreviewProps) {
	const fetchSettings = useCallback(
		() => fetchJson<{ env?: { astroUrl?: string | null } }>(cmsKeys.settings),
		[],
	);
	const settingsQuery = useCachedFetch(cmsKeys.settings, fetchSettings, {
		toastOnBackgroundError: false,
	});
	const astroUrl = settingsQuery.data?.env?.astroUrl ?? null;
	if (!astroUrl) {
		return (
			<Hint title="Faithful preview needs ASTRO_URL" variant="info">
				Start the Astro dev server and set <code>ASTRO_URL</code> for a pixel-faithful iframe. The
				local render above always works.
			</Hint>
		);
	}
	const previewPath =
		collection === "blog"
			? `blog/${slug}`
			: collection === "projects"
				? `work/${slug}`
				: collection === "legal"
					? `legal/${slug}`
					: null;
	// Gate on markdown collections only: anything else (JSON tables, settings,
	// unknown ids) has no 1:1 Astro route, so hide instead of guessing a wrong
	// `work/…/legal` path.
	if (!previewPath) {
		return (
			<Hint title="Faithful preview unavailable" variant="info">
				Collection <code>{collection}</code> has no Astro route to mirror. The local render above is
				the preview for this entry.
			</Hint>
		);
	}
	return (
		<iframe
			sandbox="allow-scripts"
			src={`${astroUrl}/${previewPath}`}
			className="h-120 w-full"
			title="faithful"
		/>
	);
}
