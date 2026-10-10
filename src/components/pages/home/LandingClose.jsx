"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BRAND_LOGO_SRC } from "@/lib/brand";
import { LangSwitch } from "./Navbar";
import { getGsap, prefersReducedMotion } from "./motion/gsap";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export default function LandingClose() {
	const t = useTranslations("home.footer");
	const nav = useTranslations("home.navbar");
	const close = useTranslations("home.close");
	const footerRef = useRef(null);
	const markRef = useRef(null);

	useIsoLayoutEffect(() => {
		const footer = footerRef.current;
		if (!footer || prefersReducedMotion()) return undefined;
		const { gsap, SplitText } = getGsap();
		const ctx = gsap.context(() => {
			gsap.from(".hm-footer__cta > *", {
				opacity: 0,
				y: 40,
				stagger: 0.1,
				duration: 1,
				ease: "expo.out",
				scrollTrigger: { trigger: footer, start: "top 75%" },
			});
			// The brand rises out of the floor, letter by letter.
			const split = SplitText.create(markRef.current, { type: "chars", mask: "chars" });
			gsap.from(split.chars, {
				yPercent: 105,
				stagger: 0.05,
				duration: 1.2,
				ease: "expo.out",
				scrollTrigger: { trigger: markRef.current, start: "top 95%" },
			});
		}, footer);
		return () => ctx.revert();
	}, []);

	const links = [
		{ href: "#how-it-works-section", label: nav("nav.workflow") },
		{ href: "#inbox-section", label: nav("nav.inbox") },
		{ href: "#role-tabs-section", label: nav("nav.community") },
		{ href: "#voices", label: t("links.product.testimonials") },
		{ href: "#faqs-section", label: nav("nav.faqs") },
		{ href: "#contact-section", label: nav("nav.contact") },
	];

	return (
		<footer ref={footerRef} className="hm-footer hm-night">
			<div className="hm-mesh is-soft" aria-hidden="true">
				<span />
				<span />
			</div>
			<div className="hm-grain" aria-hidden="true" />
			<div className="hm-container">
				<div className="hm-footer__cta">
					<h2 className="hm-h2">{close("title")}</h2>
					<p className="hm-lead mt-6">{close("lead")}</p>
					<div className="mt-10 flex flex-wrap items-center gap-3">
						<Link href="/auth" className="hm-btn hm-btn--glow" data-magnetic="0.4">
							{close("primary")}
						</Link>
						<a href="#contact-section" className="hm-btn hm-btn--outline-light">
							{close("secondary")}
						</a>
					</div>
				</div>

				<div className="hm-footer__bottom">
					<div className="max-w-sm">
						<Link href="/" className="hm-footer__brand hm-focus">
							<img src={BRAND_LOGO_SRC} alt="" className="hm-logo h-9 w-9 object-contain" />
							<span>{nav("brand.name")}</span>
						</Link>
						<p className="mt-3 text-[14px] leading-relaxed text-[var(--night-muted)]">{t("brand.description")}</p>
					</div>
					<nav aria-label={nav("mobile.sectionNav")} className="hm-footer__links">
						{links.map(item => (
							<a key={item.href} href={item.href} className="hm-focus">
								{item.label}
							</a>
						))}
					</nav>
				</div>

				<div className="hm-footer__legal">
					<p>{t("copyright.text")}</p>
					<LangSwitch tone="photo" />
				</div>
			</div>
			<p ref={markRef} className="hm-wordmark" aria-hidden="true" dir="ltr">
				So7baFit
			</p>
		</footer>
	);
}
