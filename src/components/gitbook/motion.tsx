import { useEffect, useRef } from "react";
import type { CSSProperties, ElementType, ReactNode } from "react";

import { cn } from "#/lib/utils";

interface RevealProps {
	children: ReactNode;
	className?: string;
	/** Stagger in milliseconds. Keep sequences under ~400ms. */
	delay?: number;
	as?: ElementType;
}

/**
 * GitBook's scroll entrance: a short rise with a touch of blur, resolved by
 * an IntersectionObserver. Transform/opacity only, one-shot, and skipped
 * entirely when the reader prefers reduced motion.
 */
export function Reveal({ children, className, delay = 0, as }: RevealProps) {
	const ref = useRef<HTMLElement | null>(null);
	const Tag = (as ?? "div") as ElementType;

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		if (
			typeof IntersectionObserver === "undefined" ||
			window.matchMedia("(prefers-reduced-motion: reduce)").matches
		) {
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
			{ rootMargin: "0px 0px -6% 0px", threshold: 0.1 },
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
