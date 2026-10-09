"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDown, Camera, CheckCheck, Dumbbell, Moon, Ruler, Scale } from "lucide-react";
import dynamic from "next/dynamic";
import { Link } from "@/i18n/navigation";
import { getGsap, isWideScreen, prefersReducedMotion } from "./motion/gsap";

const HeroDumbbell = dynamic(() => import("./HeroDumbbell"), { ssr: false });
const EASE = [0.2, 0.8, 0.2, 1];
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function WaGlyph({ size = 16 }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
			<path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s1 2.6 1.1 2.7c.1.2 1.9 2.9 4.6 4.1 1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
		</svg>
	);
}

/**
 * The client file broken into floating cards. On load one coaching loop plays
 * (check-in → report → coach raises the squat → reply). Pointer moves each card by
 * its depth; scrolling straightens and gathers them (see Hero's ScrollTrigger).
 */
function CoachingCollage() {
	const t = useTranslations("home.hero.board");
	const locale = useLocale();
	const reduced = useReducedMotion();
	const kg = locale === "ar" ? "كجم" : "kg";
	const cm = locale === "ar" ? "سم" : "cm";
	const [step, setStep] = useState(reduced ? 4 : 0);

	useEffect(() => {
		if (reduced) {
			setStep(4);
			return undefined;
		}
		const timers = [900, 1700, 2900, 3800].map((delay, index) => window.setTimeout(() => setStep(index + 1), delay));
		return () => timers.forEach(window.clearTimeout);
	}, [reduced]);

	const metrics = [
		{ icon: Scale, label: t("weight"), value: `78.4 ${kg}`, delta: "−0.6" },
		{ icon: Ruler, label: t("waist"), value: `82 ${cm}`, delta: "−1.5" },
		{ icon: Camera, label: t("photos"), value: t("photosValue") },
		{ icon: Moon, label: t("sleep"), value: t("sleepValue") },
	];
	const initials = t("client")
		.split(" ")
		.map(part => part[0])
		.join("");

	return (
		<figure className="hm-collage" aria-label={t("label")}>
			<div className="hm-collage__card is-client" data-depth="0.6">
				<header className="hm-board__client">
					<span className="hm-board__avatar" aria-hidden="true">
						{initials}
					</span>
					<div className="min-w-0 flex-1">
						<p className="hm-board__name">{t("client")}</p>
						<p className="hm-board__meta">{t("clientGoal")}</p>
					</div>
				</header>
				<div className="hm-board__chat">
					<AnimatePresence initial={false}>
						{step >= 1 ? (
							<motion.div
								key="in"
								className="hm-board__bubble is-in"
								initial={reduced ? false : { opacity: 0, x: locale === "ar" ? 16 : -16, scale: 0.96 }}
								animate={{ opacity: 1, x: 0, scale: 1 }}
								transition={{ duration: 0.4, ease: EASE }}
							>
								<span className="hm-board__wa" aria-hidden="true">
									<WaGlyph size={13} />
								</span>
								<span>{t("message")}</span>
								<time className="hm-board__time">{t("messageTime")}</time>
							</motion.div>
						) : (
							<span className="hm-board__typing" aria-hidden="true">
								<i />
								<i />
								<i />
							</span>
						)}
					</AnimatePresence>
				</div>
			</div>

			<div className="hm-collage__card is-report" data-depth="1">
				<div className="hm-board__block-head">
					<p className="hm-board__block-title">{t("report")}</p>
					<AnimatePresence initial={false}>
						{step >= 2 ? (
							<motion.span
								key="received"
								className="hm-chip"
								initial={reduced ? false : { opacity: 0, scale: 0.9 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.3, ease: EASE }}
							>
								<CheckCheck size={13} strokeWidth={2.4} aria-hidden="true" />
								{t("reportReceived")}
							</motion.span>
						) : null}
					</AnimatePresence>
				</div>
				<dl className="hm-board__metrics">
					{metrics.map((metric, index) => {
						const Icon = metric.icon;
						const filled = step >= 2;
						return (
							<div key={metric.label} className="hm-board__metric">
								<dt>
									<Icon size={14} strokeWidth={2} aria-hidden="true" />
									{metric.label}
								</dt>
								<dd>
									<motion.span
										initial={false}
										animate={{ opacity: filled ? 1 : 0.18 }}
										transition={{ duration: 0.35, delay: reduced ? 0 : index * 0.12 }}
									>
										{metric.value}
									</motion.span>
									{metric.delta ? (
										<motion.small
											initial={false}
											animate={{ opacity: filled ? 1 : 0 }}
											transition={{ duration: 0.35, delay: reduced ? 0 : 0.3 + index * 0.12 }}
										>
											{metric.delta}
										</motion.small>
									) : null}
								</dd>
							</div>
						);
					})}
				</dl>
			</div>

			<div className="hm-collage__card is-plan" data-depth="1.5">
				<div className="hm-board__block-head">
					<p className="hm-board__block-title">{t("plan")}</p>
					<span className="hm-board__meta">{step >= 3 ? t("planUpdated") : t("sets")}</span>
				</div>
				<div className={`hm-board__exercise${step >= 3 ? " is-bumped" : ""}`}>
					<span className="hm-board__exercise-icon" aria-hidden="true">
						<Dumbbell size={16} strokeWidth={2} />
					</span>
					<span className="min-w-0 flex-1">
						<span className="hm-board__exercise-name">{t("exercise")}</span>
						<span className="hm-board__meta">{t("sets")}</span>
					</span>
					<span className="hm-board__load" aria-live="polite">
						<AnimatePresence mode="popLayout" initial={false}>
							<motion.span
								key={step >= 3 ? "up" : "base"}
								initial={reduced ? false : { opacity: 0, y: 14 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -14 }}
								transition={{ duration: 0.35, ease: EASE }}
							>
								{step >= 3 ? "72.5" : "70"}
							</motion.span>
						</AnimatePresence>
						<small>{kg}</small>
					</span>
				</div>
			</div>

			<div className="hm-collage__card is-reply" data-depth="2">
				<AnimatePresence initial={false}>
					{step >= 4 ? (
						<motion.div
							key="out"
							className="hm-board__bubble is-out"
							initial={reduced ? false : { opacity: 0, y: 8, scale: 0.96 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							transition={{ duration: 0.4, ease: EASE }}
						>
							<span>{t("reply")}</span>
							<CheckCheck size={14} strokeWidth={2.2} className="hm-board__ticks" aria-hidden="true" />
						</motion.div>
					) : (
						<span className="hm-board__bubble is-out is-ghost" aria-hidden="true">
							{t("reply")}
						</span>
					)}
				</AnimatePresence>
			</div>
		</figure>
	);
}

export default function Hero() {
	const t = useTranslations("home.hero");
	const sectionRef = useRef(null);
	const titleRef = useRef(null);

	useIsoLayoutEffect(() => {
		const section = sectionRef.current;
		if (!section) return undefined;
		const { gsap, SplitText } = getGsap();
		const reduced = prefersReducedMotion();
		const ctx = gsap.context(() => {
			let removePointer = null;
			const cards = gsap.utils.toArray(".hm-collage__card", section);
			if (reduced) {
				gsap.set(".hm-hero__reveal", { opacity: 1 });
				return;
			}

			// Load: headline rises line by line through masks, then copy and cards.
			const split = SplitText.create(titleRef.current, { type: "lines", mask: "lines", linesClass: "hm-line" });
			const intro = gsap.timeline({ defaults: { ease: "expo.out" } });
			intro
				.set(titleRef.current, { opacity: 1 })
				.from(split.lines, { yPercent: 110, duration: 1.1, stagger: 0.09 })
				.fromTo(".hm-hero__reveal", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08 }, "-=0.75")
				.from(cards, { opacity: 0, y: 80, rotate: (i) => [-8, 6, -5, 7][i] || 0, duration: 1.1, stagger: 0.1 }, "-=0.9")
				.from(".hm-dumbbell", { opacity: 0, scale: 0.85, duration: 1.6 }, "-=1.2");

			// Pointer: each card drifts by its depth. Fine pointers only.
			if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
				const movers = cards.map(card => {
					const depth = Number(card.dataset.depth) || 1;
					return {
						depth,
						x: gsap.quickTo(card, "xPercent", { duration: 0.9, ease: "power3.out" }),
						y: gsap.quickTo(card, "yPercent", { duration: 0.9, ease: "power3.out" }),
					};
				});
				const onMove = event => {
					const rect = section.getBoundingClientRect();
					const px = (event.clientX - rect.left) / rect.width - 0.5;
					const py = (event.clientY - rect.top) / rect.height - 0.5;
					movers.forEach(m => {
						m.x(px * m.depth * 6);
						m.y(py * m.depth * 6);
					});
				};
				section.addEventListener("pointermove", onMove);
				removePointer = () => section.removeEventListener("pointermove", onMove);
			}

			// Scroll: the scattered file gathers and straightens while the headline lifts away.
			if (isWideScreen()) {
				gsap
					.timeline({
						scrollTrigger: { trigger: section, start: "top top", end: "bottom top", scrub: 0.8 },
					})
					.to(".hm-hero__copy", { yPercent: -18, opacity: 0.25, ease: "none" }, 0)
					.to(cards, { rotate: 0, ease: "none" }, 0)
					.to(".is-client", { x: 30, y: 40, ease: "none" }, 0)
					.to(".is-plan", { x: -40, y: -60, ease: "none" }, 0)
					.to(".is-reply", { x: -70, y: -90, ease: "none" }, 0)
					.to(".hm-hero__scroll", { opacity: 0, ease: "none" }, 0);
			}
			return () => removePointer?.();
		}, section);
		return () => ctx.revert();
	}, []);

	return (
		<section ref={sectionRef} id="hero" aria-labelledby="hero-title" className="hm-hero hm-night">
			<div className="hm-mesh" aria-hidden="true">
				<span />
				<span />
				<span />
			</div>
			<div className="hm-grain" aria-hidden="true" />
			<HeroDumbbell />

			<div className="hm-container hm-hero__grid">
				<div className="hm-hero__copy">
					<h1 id="hero-title" ref={titleRef} className="hm-display hm-hero__title">
						{t("title")}
					</h1>
					<p className="hm-lead hm-hero__reveal mt-8">{t("description")}</p>
					<div className="hm-hero__reveal mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
						<Link href="/auth" className="hm-btn hm-btn--glow" data-magnetic="0.4">
							<span>{t("cta.getStarted")}</span>
						</Link>
						<a href="#how-it-works-section" className="hm-link hm-link--light hm-focus">
							{t("secondary")}
						</a>
					</div>
				</div>
				<div className="hm-hero__stage">
					<CoachingCollage />
				</div>
			</div>

			<a href="#how-it-works-section" className="hm-hero__scroll hm-focus" aria-label={t("secondary")}>
				<ArrowDown size={16} strokeWidth={2} aria-hidden="true" />
			</a>
		</section>
	);
}
