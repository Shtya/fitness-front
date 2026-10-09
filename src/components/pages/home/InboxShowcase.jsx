"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLocale, useMessages, useTranslations } from "next-intl";
import {
	CalendarClock,
	CheckCheck,
	FileText,
	Mic,
	Paperclip,
	Search,
	Smile,
	UserRoundCheck,
	Users,
	Zap,
} from "lucide-react";
import { SectionHead } from "./ui";
import { getGsap, isWideScreen, prefersReducedMotion } from "./motion/gsap";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const POINTS = [
	{ id: "team", icon: Users },
	{ id: "context", icon: FileText },
	{ id: "routine", icon: Zap },
];

function initials(name) {
	return String(name)
		.split(/\s+/)
		.slice(0, 2)
		.map(part => part[0])
		.join("")
		.toUpperCase();
}

function InboxReplica({ focus, shown = Infinity }) {
	const t = useTranslations("home.inbox.demo");
	const tBoard = useTranslations("home.hero.board");
	const messages = useMessages();
	const demo = messages?.home?.inbox?.demo || {};
	const chats = demo.chats || [];
	const thread = demo.thread || [];
	const reduced = useReducedMotion();
	const locale = useLocale();
	const glow = area => (focus === area ? " is-focus" : "");

	return (
		<div className="hm-inbox" aria-hidden="true">
			<aside className="hm-inbox__list">
				<div className="hm-inbox__search">
					<Search size={14} strokeWidth={2} />
					<span>{t("search")}</span>
				</div>
				<div className="hm-inbox__filters">
					<span className="is-on">{t("filters.all")}</span>
					<span>{t("filters.unread")}</span>
					<span className={glow("team")}>{t("filters.mine")}</span>
				</div>
				<ul>
					{chats.map((chat, index) => (
						<li key={chat.name} className={index === 0 ? "is-active" : ""}>
							<span className="hm-inbox__avatar">{initials(chat.name)}</span>
							<span className="hm-inbox__row">
								<span className="hm-inbox__row-top">
									<b>{chat.name}</b>
									<time>{chat.time}</time>
								</span>
								<span className="hm-inbox__row-bottom">
									<span className="truncate">
										{chat.text.includes("0:42") ? <Mic size={12} strokeWidth={2} /> : null}
										{chat.text}
									</span>
									{chat.unread ? <em>{chat.unread}</em> : null}
								</span>
							</span>
						</li>
					))}
				</ul>
			</aside>

			<section className="hm-inbox__thread">
				<header className="hm-inbox__head">
					<span className="hm-inbox__avatar is-lg">{initials(chats[0]?.name || "S")}</span>
					<span className="min-w-0 flex-1">
						<b>{chats[0]?.name}</b>
						<small>{t("typing")}</small>
					</span>
					<span className={`hm-inbox__assignee${glow("team")}`}>
						<UserRoundCheck size={13} strokeWidth={2} />
						{t("assigned")}
					</span>
				</header>

				<div className={`hm-inbox__context${glow("context")}`}>
					<FileText size={14} strokeWidth={2} />
					<span className="truncate">
						{tBoard("plan")} · {tBoard("report")}
					</span>
					<span className="hm-inbox__context-meta">{tBoard("clientGoal")}</span>
				</div>

				<div className="hm-inbox__messages">
					{thread.map((message, index) => (
						<motion.p
							key={index}
							className={`hm-inbox__msg is-${message.from}`}
							initial={false}
							animate={index < shown ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 12, scale: 0.97 }}
							transition={{ duration: reduced ? 0 : 0.35, ease: [0.2, 0.8, 0.2, 1] }}
						>
							{message.text}
							{message.from === "coach" ? <CheckCheck size={13} strokeWidth={2.2} /> : null}
						</motion.p>
					))}
					<motion.p
						className={`hm-inbox__scheduled${glow("routine")}`}
						initial={false}
						animate={shown > thread.length ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
						transition={{ duration: reduced ? 0 : 0.35 }}
					>
						<CalendarClock size={14} strokeWidth={2} />
						{t("scheduled")}
					</motion.p>
				</div>

				<footer className="hm-inbox__composer">
					<Smile size={18} strokeWidth={1.8} />
					<Paperclip size={18} strokeWidth={1.8} className={locale === "ar" ? "-scale-x-100" : ""} />
					<span className="hm-inbox__input">{t("compose")}</span>
					<span className="hm-inbox__mic">
						<Mic size={16} strokeWidth={2} />
					</span>
				</footer>
			</section>
		</div>
	);
}

export default function InboxShowcase() {
	const t = useTranslations("home.inbox");
	const threadLength = useMessages()?.home?.inbox?.demo?.thread?.length || 3;
	const [focus, setFocus] = useState("team");
	// Messages shown: everything by default; the pinned scene plays them in as you scroll.
	const [shown, setShown] = useState(Infinity);
	const sectionRef = useRef(null);

	useIsoLayoutEffect(() => {
		const section = sectionRef.current;
		if (!section || prefersReducedMotion()) return undefined;
		const { gsap, ScrollTrigger } = getGsap();
		const ctx = gsap.context(() => {
			// Pin only when the whole scene fits on screen.
			if (isWideScreen() && window.innerHeight >= 740) {
				// Pinned: the conversation plays as you read, and the feature list follows it.
				const total = threadLength + 1; // + scheduled reminder
				setShown(0);
				ScrollTrigger.create({
					trigger: section,
					start: "top top",
					end: "+=140%",
					pin: true,
					onUpdate: self => {
						const count = Math.min(total, Math.floor(self.progress * (total + 0.6)));
						setShown(current => (current === count ? current : count));
						const point = self.progress < 0.34 ? "team" : self.progress < 0.68 ? "context" : "routine";
						setFocus(current => (current === point ? current : point));
					},
					onLeave: () => setShown(total),
				});
			} else {
				// Phones: the thread plays once when it comes into view.
				setShown(0);
				ScrollTrigger.create({
					trigger: section.querySelector(".hm-inbox"),
					start: "top 75%",
					once: true,
					onEnter: () => {
						for (let i = 1; i <= threadLength + 1; i += 1) {
							gsap.delayedCall(i * 0.5, () => setShown(i));
						}
					},
				});
			}
			gsap.from(".hm-inbox-point", {
				opacity: 0,
				x: document.documentElement.dir === "rtl" ? 24 : -24,
				stagger: 0.12,
				duration: 0.8,
				ease: "expo.out",
				scrollTrigger: { trigger: section, start: "top 70%" },
			});
			gsap.from(".hm-inbox", {
				opacity: 0,
				y: 60,
				rotateX: 12,
				transformPerspective: 1200,
				duration: 1.2,
				ease: "expo.out",
				scrollTrigger: { trigger: section, start: "top 70%" },
			});
		}, section);
		return () => {
			ctx.revert();
			setShown(Infinity);
		};
	}, [threadLength]);

	return (
		// Stable host for the GSAP pin-spacer (see Journey).
		<div className="hm-pin-host">
		<section
			ref={sectionRef}
			id="inbox-section"
			aria-labelledby="inbox-heading"
			className="hm-section hm-section--rubber hm-night hm-inbox-section"
		>
			<div className="hm-mesh is-soft" aria-hidden="true">
				<span />
				<span />
			</div>
			<div className="hm-grain" aria-hidden="true" />
			<div className="hm-container">
				<SectionHead id="inbox-heading" title={t("title")} lead={t("lead")} />

				<div className="hm-inbox-layout">
					<ul className="hm-inbox-points" aria-label={t("title")}>
						{POINTS.map(point => {
							const Icon = point.icon;
							const on = focus === point.id;
							return (
								<li key={point.id}>
									<button
										type="button"
										aria-pressed={on}
										onClick={() => setFocus(point.id)}
										onMouseEnter={() => setFocus(point.id)}
										onFocus={() => setFocus(point.id)}
										className="hm-inbox-point hm-focus"
									>
										<span className="hm-inbox-point__icon" aria-hidden="true">
											<Icon size={18} strokeWidth={2} />
										</span>
										<span>
											<span className="hm-inbox-point__title">{t(`points.${point.id}.title`)}</span>
											<span className="hm-inbox-point__text">{t(`points.${point.id}.text`)}</span>
										</span>
									</button>
								</li>
							);
						})}
					</ul>
					<InboxReplica focus={focus} shown={shown} />
				</div>
			</div>
		</section>
		</div>
	);
}
