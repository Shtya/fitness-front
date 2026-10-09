"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { SectionHead } from "./ui";
import { getGsap, prefersReducedMotion } from "./motion/gsap";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// Coaches are the people choosing the platform, so the coach's words lead.
const FEATURED = 1;
const OTHERS = [0, 2, 3];

export default function Testimonials() {
	const t = useTranslations("home.testimonials");
	const sectionRef = useRef(null);
	const quoteRef = useRef(null);

	useIsoLayoutEffect(() => {
		const section = sectionRef.current;
		if (!section || prefersReducedMotion()) return undefined;
		const { gsap, SplitText } = getGsap();
		const ctx = gsap.context(() => {
			// The quote lights up word by word as you read down the page.
			const split = SplitText.create(quoteRef.current, { type: "words", wordsClass: "hm-word" });
			gsap.fromTo(
				split.words,
				{ opacity: 0.16 },
				{
					opacity: 1,
					stagger: 0.08,
					ease: "none",
					scrollTrigger: { trigger: quoteRef.current, start: "top 78%", end: "bottom 42%", scrub: true },
				},
			);
			gsap.from(".hm-voices__list li", {
				opacity: 0,
				y: 40,
				stagger: 0.14,
				duration: 0.9,
				ease: "expo.out",
				scrollTrigger: { trigger: ".hm-voices__list", start: "top 80%" },
			});
		}, section);
		return () => ctx.revert();
	}, []);

	return (
		<section ref={sectionRef} id="voices" aria-labelledby="voices-heading" className="hm-section">
			<div className="hm-container">
				<SectionHead id="voices-heading" title={t("title")} lead={t("description")} />

				<div className="hm-voices">
					<figure className="hm-voices__featured">
						<span className="hm-voices__mark" aria-hidden="true">
							“
						</span>
						<blockquote ref={quoteRef} className="hm-voices__quote">
							{t(`items.${FEATURED}.text`)}
						</blockquote>
						<figcaption className="hm-voices__person">
							<span className="hm-voices__avatar is-lg" aria-hidden="true">
								{t(`items.${FEATURED}.name`).slice(0, 1)}
							</span>
							<span>
								<b>{t(`items.${FEATURED}.name`)}</b>
								<small>{t(`items.${FEATURED}.role`)}</small>
							</span>
							<span className="hm-chip ms-auto">{t(`items.${FEATURED}.achievement`)}</span>
						</figcaption>
					</figure>

					<ul className="hm-voices__list">
						{OTHERS.map(i => (
							<li key={i}>
								<figure className="m-0">
									<blockquote className="hm-voices__small">{t(`items.${i}.text`)}</blockquote>
									<figcaption className="hm-voices__person">
										<span className="hm-voices__avatar" aria-hidden="true">
											{t(`items.${i}.name`).slice(0, 1)}
										</span>
										<span>
											<b>{t(`items.${i}.name`)}</b>
											<small>{t(`items.${i}.role`)}</small>
										</span>
									</figcaption>
								</figure>
							</li>
						))}
					</ul>
				</div>
			</div>
		</section>
	);
}
