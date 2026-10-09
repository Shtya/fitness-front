"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useMessages, useTranslations } from "next-intl";
import { CircleDot } from "lucide-react";
import { getGsap, prefersReducedMotion } from "./motion/gsap";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function Row({ words, reverse }) {
	// Repeated so the band never shows an edge while it slides.
	const items = [...words, ...words, ...words];
	return (
		<div className={`hm-marquee__row${reverse ? " is-reverse" : ""}`}>
			{items.map((word, index) => (
				<span key={index} className="hm-marquee__item">
					<span className={index % 2 ? "is-outline" : ""}>{word}</span>
					<CircleDot className="hm-marquee__mark" size={34} strokeWidth={2.4} aria-hidden="true" />
				</span>
			))}
		</div>
	);
}

/** Everything the platform covers, as one band that moves with your scroll. */
export default function FeatureMarquee() {
	const t = useTranslations("home.marquee");
	const words = useMessages()?.home?.marquee?.words || [];
	const ref = useRef(null);

	useIsoLayoutEffect(() => {
		const el = ref.current;
		if (!el || prefersReducedMotion()) return undefined;
		const { gsap } = getGsap();
		const rtl = document.documentElement.dir === "rtl";
		const ctx = gsap.context(() => {
			const dir = rtl ? -1 : 1;
			gsap.fromTo(
				".hm-marquee__row:not(.is-reverse)",
				{ xPercent: 0 },
				{ xPercent: -22 * dir, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.6 } },
			);
			gsap.fromTo(
				".hm-marquee__row.is-reverse",
				{ xPercent: -22 * dir },
				{ xPercent: 0, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.6 } },
			);
		}, el);
		return () => ctx.revert();
	}, []);

	if (!words.length) return null;

	return (
		<section ref={ref} className="hm-marquee" aria-label={t("label")}>
			<p className="sr-only">{words.join(", ")}</p>
			<div aria-hidden="true">
				<Row words={words} />
				<Row words={[...words].reverse()} reverse />
			</div>
		</section>
	);
}
