import { useEffect, useRef } from "react";
import type { CSSProperties, ElementType, ReactNode } from "react";

import { cn } from "#/lib/utils";

interface RevealProps {
	children: ReactNode;
	className?: string;
	delay?: number;
	as?: ElementType;
}

/**
 * GitBook-style scroll reveal: soft fade-up with a hint of blur, driven by
 * IntersectionObserver. Transform/opacity only; disabled under reduced motion.
 */
export function Reveal({ children, className, delay = 0, as }: RevealProps) {
	const ref = useRef<HTMLElement | null>(null);
	const Tag = (as ?? "div") as ElementType;

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		if (typeof IntersectionObserver === "undefined") {
			el.classList.add("is-visible");
			return;
		}
		const io = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						entry.target.classList.add("is-visible");
						io.unobserve(entry.target);
					}
				}
			},
			{ rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
		);
		io.observe(el);
		return () => io.disconnect();
	}, []);

	return (
		<Tag
			className={cn("gb-reveal", className)}
			ref={ref}
			style={{ "--gb-reveal-delay": `${delay}ms` } as CSSProperties}
		>
			{children}
		</Tag>
	);
}
