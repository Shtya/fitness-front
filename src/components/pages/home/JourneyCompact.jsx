"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ClientFile, { STAGE_IDS } from "./ClientFile";
import { SectionHead } from "./ui";

/**
 * The six-stage client journey. This is a real sequence, so it is numbered; the
 * rail's line fills up to the active stage and the client file on the right shows
 * that stage inside the product.
 */
export default function JourneyCompact() {
	const [stage, setStage] = useState("intake");
	const t = useTranslations("home.steps");
	const tCommon = useTranslations("home.howItWorks");
	const reduced = useReducedMotion();
	const index = Math.max(0, STAGE_IDS.indexOf(stage));
	const stripRef = useRef(null);

	// Keep the active step visible in the phone strip.
	useEffect(() => {
		const strip = stripRef.current;
		const active = strip?.querySelector('[aria-current="step"]');
		if (!strip || !active || strip.scrollWidth <= strip.clientWidth) return;
		active.scrollIntoView({ block: "nearest", inline: "center", behavior: reduced ? "auto" : "smooth" });
	}, [stage, reduced]);

	const go = delta => {
		const next = STAGE_IDS[Math.min(STAGE_IDS.length - 1, Math.max(0, index + delta))];
		setStage(next);
	};
	const number = i => String(i + 1).padStart(2, "0");

	return (
		<section
			id="how-it-works-section"
			aria-labelledby="journey-heading"
			className="hm-section hm-section--chalk"
		>
			<div className="hm-container">
				<SectionHead id="journey-heading" title={t("title")} lead={t("description")} />

				{/* Phones and tablets: swipeable step strip. */}
				<ol ref={stripRef} className="hm-steps-strip" aria-label={tCommon("badge")}>
					{STAGE_IDS.map((id, i) => (
						<li key={id}>
							<button
								type="button"
								aria-current={stage === id ? "step" : undefined}
								onClick={() => setStage(id)}
								className="hm-steps-strip__item hm-focus"
							>
								<span className="hm-steps-strip__num">{number(i)}</span>
								{t(`steps.${id}.title`)}
							</button>
						</li>
					))}
				</ol>

				<div className="hm-journey">
					<ol className="hm-rail" aria-label={tCommon("badge")}>
						<span className="hm-rail__track" aria-hidden="true">
							<motion.span
								className="hm-rail__fill"
								initial={false}
								animate={{ scaleY: (index + 0.5) / STAGE_IDS.length }}
								transition={{ duration: reduced ? 0 : 0.5, ease: [0.2, 0.8, 0.2, 1] }}
							/>
						</span>
						{STAGE_IDS.map((id, i) => {
							const on = stage === id;
							const done = i < index;
							return (
								<li key={id}>
									<button
										type="button"
										aria-current={on ? "step" : undefined}
										aria-expanded={on}
										aria-controls="journey-detail"
										onClick={() => setStage(id)}
										className={`hm-rail__step hm-focus${on ? " is-on" : ""}${done ? " is-done" : ""}`}
									>
										<span className="hm-rail__num">{number(i)}</span>
										<span className="min-w-0">
											<span className="hm-rail__title">{t(`steps.${id}.title`)}</span>
											<AnimatePresence initial={false}>
												{on ? (
													<motion.span
														className="hm-rail__desc"
														initial={reduced ? false : { opacity: 0, height: 0 }}
														animate={{ opacity: 1, height: "auto" }}
														exit={{ opacity: 0, height: 0 }}
														transition={{ duration: reduced ? 0 : 0.3, ease: [0.2, 0.8, 0.2, 1] }}
													>
														<span className="block pt-2">{t(`steps.${id}.description`)}</span>
													</motion.span>
												) : null}
											</AnimatePresence>
										</span>
									</button>
								</li>
							);
						})}
					</ol>

					<div id="journey-detail" className="hm-journey__file">
						<p className="hm-journey__mobile-desc" aria-live="polite">
							{t(`steps.${stage}.description`)}
						</p>
						<ClientFile stage={stage} />
						<div className="hm-journey__pager">
							<button
								type="button"
								onClick={() => go(-1)}
								disabled={index === 0}
								className="hm-btn hm-btn--ghost hm-journey__pager-btn"
								aria-label={index > 0 ? t(`steps.${STAGE_IDS[index - 1]}.title`) : undefined}
							>
								<ChevronLeft size={18} strokeWidth={2} className="rtl:-scale-x-100" aria-hidden="true" />
							</button>
							<span className="hm-journey__count" aria-hidden="true">
								{number(index)} / {number(STAGE_IDS.length - 1)}
							</span>
							<button
								type="button"
								onClick={() => go(1)}
								disabled={index === STAGE_IDS.length - 1}
								className="hm-btn hm-btn--primary hm-journey__next"
							>
								<span className="truncate">
									{index < STAGE_IDS.length - 1
										? t(`steps.${STAGE_IDS[index + 1]}.title`)
										: t(`steps.${STAGE_IDS[index]}.title`)}
								</span>
								<ChevronRight size={18} strokeWidth={2} className="shrink-0 rtl:-scale-x-100" aria-hidden="true" />
							</button>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
