"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import ClientFile, { STAGE_IDS } from "./ClientFile";
import JourneyCompact from "./JourneyCompact";
import { getGsap } from "./motion/gsap";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Wide screens with motion get the pinned, sideways scene; everyone else the tap-through. */
function useWideMotion() {
	const [ok, setOk] = useState(false);
	useEffect(() => {
		const wide = window.matchMedia("(min-width: 1024px)");
		const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
		const update = () => setOk(wide.matches && !calm.matches);
		update();
		wide.addEventListener("change", update);
		calm.addEventListener("change", update);
		return () => {
			wide.removeEventListener("change", update);
			calm.removeEventListener("change", update);
		};
	}, []);
	return ok;
}

/**
 * The six stages pass sideways like sets on a timeline while the section is pinned.
 * The rail at the bottom scrubs with the scroll and doubles as stage navigation.
 */
function JourneyPinned() {
	const t = useTranslations("home.steps");
	const tCommon = useTranslations("home.howItWorks");
	const sectionRef = useRef(null);
	const trackRef = useRef(null);
	const triggerRef = useRef(null);
	const [active, setActive] = useState(0);

	useIsoLayoutEffect(() => {
		const section = sectionRef.current;
		const track = trackRef.current;
		if (!section || !track) return undefined;
		const { gsap } = getGsap();
		const rtl = document.documentElement.dir === "rtl";
		const ctx = gsap.context(() => {
			const distance = () => track.scrollWidth - window.innerWidth;
			const tween = gsap.to(track, {
				x: () => (rtl ? distance() : -distance()),
				ease: "none",
				scrollTrigger: {
					trigger: section,
					start: "top top",
					end: () => `+=${distance()}`,
					pin: true,
					scrub: 0.7,
					invalidateOnRefresh: true,
					onUpdate: self => {
						const index = Math.min(STAGE_IDS.length - 1, Math.round(self.progress * (STAGE_IDS.length - 1)));
						setActive(current => (current === index ? current : index));
						gsap.set(".hm-stages__fill", { scaleX: self.progress });
					},
				},
			});
			triggerRef.current = tween.scrollTrigger;

			// Each panel's number and copy slide a little slower than the track: depth.
			gsap.utils.toArray(".hm-stage", track).forEach(panel => {
				gsap.fromTo(
					panel.querySelector(".hm-stage__num"),
					{ xPercent: rtl ? -30 : 30 },
					{
						xPercent: rtl ? 30 : -30,
						ease: "none",
						scrollTrigger: {
							trigger: panel,
							containerAnimation: tween,
							start: "left right",
							end: "right left",
							scrub: true,
						},
					},
				);
			});
		}, section);
		return () => ctx.revert();
	}, []);

	const jump = index => {
		const st = triggerRef.current;
		if (!st) return;
		const y = st.start + (st.end - st.start) * (index / (STAGE_IDS.length - 1));
		if (window.__hmLenis) window.__hmLenis.scrollTo(y, { duration: 1.2 });
		else window.scrollTo({ top: y, behavior: "smooth" });
	};

	return (
		<section
			ref={sectionRef}
			id="how-it-works-section"
			aria-labelledby="journey-heading"
			className="hm-stages"
		>
			<div className="hm-container hm-stages__head">
				<h2 id="journey-heading" className="hm-h2">
					{t("title")}
				</h2>
				<p className="hm-lead">{t("description")}</p>
			</div>

			<div ref={trackRef} className="hm-stages__track">
				{STAGE_IDS.map((id, i) => (
					<article key={id} className="hm-stage" aria-labelledby={`stage-${id}`}>
						<div className="hm-stage__copy">
							<span className="hm-stage__num" aria-hidden="true">
								{String(i + 1).padStart(2, "0")}
							</span>
							<h3 id={`stage-${id}`} className="hm-stage__title">
								{t(`steps.${id}.title`)}
							</h3>
							<p className="hm-stage__desc">{t(`steps.${id}.description`)}</p>
						</div>
						<div className="hm-stage__file">
							<ClientFile stage={id} />
						</div>
					</article>
				))}
			</div>

			<nav className="hm-container hm-stages__rail" aria-label={tCommon("badge")}>
				<span className="hm-stages__bar" aria-hidden="true">
					<span className="hm-stages__fill" />
				</span>
				<ol>
					{STAGE_IDS.map((id, i) => (
						<li key={id}>
							<button
								type="button"
								aria-current={active === i ? "step" : undefined}
								onClick={() => jump(i)}
								className="hm-stages__dot hm-focus"
							>
								<span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span>
								<span className="hm-stages__dot-label">{t(`steps.${id}.title`)}</span>
							</button>
						</li>
					))}
				</ol>
			</nav>
		</section>
	);
}

export default function Journey() {
	const wide = useWideMotion();
	// Stable host: GSAP pinning wraps the section in a pin-spacer, so React must own
	// the parent it swaps children in, not the shared <main>.
	return <div className="hm-pin-host">{wide ? <JourneyPinned /> : <JourneyCompact />}</div>;
}
