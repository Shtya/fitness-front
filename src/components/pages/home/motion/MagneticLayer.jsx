"use client";

import { useEffect } from "react";
import { getGsap, prefersReducedMotion } from "./gsap";

/**
 * Gives every [data-magnetic] element inside the homepage a gentle pull toward
 * the pointer. Mouse/trackpad only: touch screens have no hover to answer.
 */
export default function MagneticLayer({ rootSelector = ".hm" }) {
	useEffect(() => {
		if (prefersReducedMotion() || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
			return undefined;
		}
		const { gsap } = getGsap();
		const root = document.querySelector(rootSelector);
		if (!root) return undefined;
		const cleanups = [];

		const attach = el => {
			if (el.__hmMagnet) return;
			el.__hmMagnet = true;
			const strength = Number(el.dataset.magnetic) || 0.35;
			const xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
			const yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
			const move = event => {
				const rect = el.getBoundingClientRect();
				xTo((event.clientX - (rect.left + rect.width / 2)) * strength);
				yTo((event.clientY - (rect.top + rect.height / 2)) * strength);
			};
			const leave = () => {
				xTo(0);
				yTo(0);
			};
			el.addEventListener("pointermove", move);
			el.addEventListener("pointerleave", leave);
			cleanups.push(() => {
				el.removeEventListener("pointermove", move);
				el.removeEventListener("pointerleave", leave);
				gsap.set(el, { x: 0, y: 0 });
				el.__hmMagnet = false;
			});
		};

		root.querySelectorAll("[data-magnetic]").forEach(attach);
		// Buttons that mount later (tab panels, success states).
		const observer = new MutationObserver(() => root.querySelectorAll("[data-magnetic]").forEach(attach));
		observer.observe(root, { childList: true, subtree: true });

		return () => {
			observer.disconnect();
			cleanups.forEach(fn => fn());
		};
	}, [rootSelector]);

	return null;
}
