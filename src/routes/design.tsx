import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "#/components/gitbook";
import { BrandSection } from "./design/sections/brand";
import { ComponentsSection } from "./design/sections/components";
import { LanguagesSection } from "./design/sections/languages";
import { MotionSection } from "./design/sections/motion";
import { OverviewSection } from "./design/sections/overview";
import { PatternsSection } from "./design/sections/patterns";
import { StyleSection } from "./design/sections/style";
import { TokensSection } from "./design/sections/tokens";
import { ViewportsSection } from "./design/sections/viewports";

export const Route = createFileRoute("/design")({
	component: DesignSystemPage,
	head: () => ({ meta: [{ title: "Design system · platipie-cms" }] }),
});

function DesignSystemPage() {
	return (
		<div>
			<PageShell className="pb-16">
				<OverviewSection />
				<TokensSection />
				<BrandSection />
				<StyleSection />
				<LanguagesSection />
				<ComponentsSection />
				<MotionSection />
				<ViewportsSection />
				<PatternsSection />
			</PageShell>
		</div>
	);
}
