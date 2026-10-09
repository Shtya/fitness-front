"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

let registered = false;

export function getGsap() {
	if (!registered && typeof window !== "undefined") {
		gsap.registerPlugin(ScrollTrigger, SplitText);
		registered = true;
		// Dev only: lets automated visual checks drive the ticker in a background tab.
		if (process.env.NODE_ENV !== "production") window.__hmGsap = { gsap, ScrollTrigger };
	}
	return { gsap, ScrollTrigger, SplitText };
}

export function prefersReducedMotion() {
	if (typeof window === "undefined") return true;
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Desktop-class pointer and width: where pinned, scrubbed scenes make sense. */
export function isWideScreen() {
	if (typeof window === "undefined") return false;
	return window.matchMedia("(min-width: 1024px)").matches;
}
