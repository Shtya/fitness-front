"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { getGsap, prefersReducedMotion } from "./gsap";

/**
 * Lenis smooth scrolling for the homepage only, driven by GSAP's ticker so
 * ScrollTrigger scenes and the scroll position never drift apart.
 * Skipped entirely when the visitor prefers reduced motion.
 */
export default function SmoothScroll() {
	useEffect(() => {
		if (prefersReducedMotion()) return undefined;
		const { gsap, ScrollTrigger } = getGsap();
		const lenis = new Lenis({ duration: 1.1, smoothWheel: true, wheelMultiplier: 0.95 });
		lenis.on("scroll", ScrollTrigger.update);
		const tick = time => lenis.raf(time * 1000);
		gsap.ticker.add(tick);
		gsap.ticker.lagSmoothing(0);

		// In-page anchors go through Lenis so they glide instead of jumping.
		const onClick = event => {
			const link = event.target.closest?.('a[href^="#"]');
			if (!link) return;
			const id = link.getAttribute("href");
			if (id.length < 2) return;
			const target = document.querySelector(id);
			if (!target) return;
			event.preventDefault();
			lenis.scrollTo(target, { offset: -72 });
			history.replaceState(null, "", id);
		};
		document.addEventListener("click", onClick);
		window.__hmLenis = lenis;

		return () => {
			document.removeEventListener("click", onClick);
			gsap.ticker.remove(tick);
			lenis.destroy();
			delete window.__hmLenis;
		};
	}, []);

	return null;
}
