export function humanize(value: string): string {
	return value.replaceAll(/[-_]+/gu, " ").replaceAll(/\b\w/gu, (char) => char.toUpperCase());
}

export function routeFor(relativePath: string): { dynamic: boolean; route: string } {
	const withoutExt = relativePath.replace(/\.(astro|js|md|mdx|ts)$/u, "");
	const segments = withoutExt.split("/").filter(Boolean);
	if (segments.at(-1) === "index") segments.pop();
	const mapped = segments.map((segment) => {
		const catchAll = /^\[\.\.\.([^\]]+)\]$/u.exec(segment);
		if (catchAll) return `*${catchAll[1]}`;
		const optionalCatchAll = /^\[\[\.\.\.([^\]]+)\]\]$/u.exec(segment);
		if (optionalCatchAll) return `*${optionalCatchAll[1]}`;
		const dynamic = /^\[([^\]]+)\]$/u.exec(segment);
		if (dynamic) return `:${dynamic[1]}`;
		return segment;
	});
	const dynamic = mapped.some((s) => s.startsWith(":") || s.startsWith("*"));
	return { dynamic, route: `/${mapped.join("/")}`.replace(/\/$/u, "") || "/" };
}

export function titleFor(segments: string[], dynamic: boolean): string {
	const last = segments.findLast(Boolean);
	if (last === "404") return "404 Not Found";
	if (last === "500") return "500 Server Error";
	if (!last) return "Home";
	if (dynamic) {
		const parent = segments
			.toReversed()
			.find(
				(segment) => !segment.startsWith(":") && !segment.startsWith("*") && segment !== "index",
			);
		return parent ? `${humanize(parent)} detail` : "Detail";
	}
	if (last === "index") {
		const parent = segments.toReversed().find((segment) => segment !== "index" && Boolean(segment));
		return parent ? humanize(parent) : "Home";
	}
	return humanize(last);
}
