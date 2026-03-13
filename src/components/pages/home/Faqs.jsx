"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import {
	ChevronDown,
	Sparkles,
	HelpCircle,
	Search,
	User,
	Dumbbell,
	CreditCard,
	Settings,
	Shield,
	Zap,
	Heart,
	TrendingUp,
	MessageSquare,
	Phone,
	Mail,
	Plus,
	Minus,
} from "lucide-react";
import SectionHeader from "./SectionHeader";

// ─── AOS Init Hook ────────────────────────────────────────────────────────────
function useAOS() {
	useEffect(() => {
		if (typeof window === "undefined") return;
		import("aos").then((AOS) => {
			AOS.init({
				duration: 600,
				easing: "ease-out-cubic",
				once: true,
				offset: 50,
			});
		});
	}, []);
}

// ─── Static data (outside component to avoid re-creation) ────────────────────
const FLOAT_ICONS = [
	{ Icon: Sparkles, posClass: "top-[20%] ltr:left-[10%] rtl:right-[10%]" },
	{ Icon: Heart, posClass: "top-[35%] ltr:left-[68%] rtl:right-[68%]" },
	{ Icon: Zap, posClass: "top-[58%] ltr:left-[16%] rtl:right-[16%]" },
	{ Icon: Shield, posClass: "top-[72%] ltr:left-[65%] rtl:right-[65%]" },
];

const RING_SIZES = [180, 260, 340];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FAQs() {
	const [searchQuery, setSearchQuery] = useState("");
	const [activeCategory, setActiveCategory] = useState("all");
	const [openIndex, setOpenIndex] = useState(null);
	const [visibleItems, setVisibleItems] = useState([]);
	const t = useTranslations("home.faqs");
	useAOS();

	const categories = [
		{ id: "all", label: t("categories.all"), icon: HelpCircle },
		{ id: "general", label: t("categories.general"), icon: Sparkles },
		{ id: "membership", label: t("categories.membership"), icon: User },
		{ id: "training", label: t("categories.training"), icon: Dumbbell },
		{ id: "billing", label: t("categories.billing"), icon: CreditCard },
		{ id: "technical", label: t("categories.technical"), icon: Settings },
	];

	const faqs = [
		{ category: "general", icon: Sparkles, question: t("questions.general.0.question"), answer: t("questions.general.0.answer") },
		{ category: "general", icon: Heart, question: t("questions.general.1.question"), answer: t("questions.general.1.answer") },
		{ category: "general", icon: TrendingUp, question: t("questions.general.2.question"), answer: t("questions.general.2.answer") },
		{ category: "membership", icon: User, question: t("questions.membership.0.question"), answer: t("questions.membership.0.answer") },
		{ category: "membership", icon: Shield, question: t("questions.membership.1.question"), answer: t("questions.membership.1.answer") },
		{ category: "training", icon: Dumbbell, question: t("questions.training.0.question"), answer: t("questions.training.0.answer") },
		{ category: "billing", icon: CreditCard, question: t("questions.billing.0.question"), answer: t("questions.billing.0.answer") },
		{ category: "technical", icon: Settings, question: t("questions.technical.0.question"), answer: t("questions.technical.0.answer") },
	];

	const filtered = faqs.filter((f) => {
		const inCategory = activeCategory === "all" || f.category === activeCategory;
		const q = searchQuery.toLowerCase();
		const inSearch = !q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
		return inCategory && inSearch;
	});

	// Stagger filtered items into view on change
	useEffect(() => {
		setVisibleItems([]);
		filtered.forEach((_, i) => {
			setTimeout(() => {
				setVisibleItems((prev) => [...prev, i]);
			}, i * 50);
		});
		setOpenIndex(null);
	}, [activeCategory, searchQuery]);

	const toggle = (i) => setOpenIndex(openIndex === i ? null : i);

	const changeCategory = (id) => {
		setActiveCategory(id);
		setOpenIndex(null);
	};

	return (
		<section
			id="faqs-section"
			aria-labelledby="faqs-heading"
			className="relative overflow-hidden py-20 sm:py-24 md:py-28 lg:py-32"
		>


			<div className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-16">

				{/* ── Header ── */}

				<SectionHeader
					id="faqs-heading"
					badge={t("badge")}
					title={t("title")}
					subtitle={t("description")}
				/>



				{/* ── Two-column layout ── */}
				<div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-16">

					{/* ── FAQ list ── */}
					<div
						className="lg:col-span-7"
						data-aos="fade-up"
						data-aos-delay="60"
						data-aos-duration="700"
					>
						<div className="space-y-3" role="list" aria-label="FAQ list">

							{/* Empty state */}
							{filtered.length === 0 && (
								<div className="py-16 text-center">
									<div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
										<Search aria-hidden="true" className="h-9 w-9 text-white/25" />
									</div>
									<h3 className="font-body mb-2 text-2xl font-black text-white">
										{t("noResults.title")}
									</h3>
									<p className="font-body text-white/45">
										{t("noResults.description")}
									</p>
								</div>
							)}

							{/* FAQ items */}
							{filtered.map((faq, index) => {
								const isOpen = openIndex === index;
								const isVisible = visibleItems.includes(index);

								return (
									<div
										key={`${activeCategory}-${index}`}
										role="listitem"
										className={[
											"transition-all duration-300",
											isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
										].join(" ")}
									>
										<div
											className={[
												"relative overflow-hidden rounded-xl border-2 bg-slate-800/45 backdrop-blur-xl transition-all duration-300",
												isOpen
													? "border-[var(--color-primary-500)]/60 shadow-[0_0_32px_rgba(99,102,241,0.14)]"
													: "border-slate-700/35 hover:border-[var(--color-primary-500)]/30",
											].join(" ")}
										>
											{/* Open gradient wash */}
											{isOpen && (
												<div
													aria-hidden="true"
													className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--color-gradient-from)]/[0.04] to-transparent"
												/>
											)}

											{/* Trigger button */}
											<button
												type="button"
												aria-expanded={isOpen}
												aria-controls={`faq-answer-${index}`}
												id={`faq-trigger-${index}`}
												onClick={() => toggle(index)}
												className="group w-full p-5 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)] focus-visible:ring-inset sm:p-6"
											>
												<div className="relative flex items-center justify-between gap-4">
													<h3
														className={[
															"font-body flex-1 max-md:text-[12px] text-base font-bold leading-snug transition-colors duration-200 ltr:pr-2 rtl:pl-2",
															isOpen
																? "text-[var(--color-primary-200)]"
																: "text-white group-hover:text-[var(--color-primary-200)]",
														].join(" ")}
													>
														{faq.question}
													</h3>

													<div
														className={[
															"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-300",
															isOpen
																? "bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] rotate-180"
																: "bg-slate-700/60 group-hover:bg-slate-600/60 rotate-0",
														].join(" ")}
														aria-hidden="true"
													>
														<ChevronDown
															className={["h-4 w-4 transition-colors duration-200", isOpen ? "text-white" : "text-white/60"].join(" ")}
															strokeWidth={2.5}
														/>
													</div>
												</div>
											</button>

											{/* Answer panel */}
											<div
												id={`faq-answer-${index}`}
												role="region"
												aria-labelledby={`faq-trigger-${index}`}
												className={[
													"overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
													isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0",
												].join(" ")}
											>
												<div className="px-5 pb-5 ltr:pl-5 rtl:pr-5 sm:px-6 sm:pb-6">
													<div className="border-[var(--color-primary-500)]/30 ltr:border-l-2 ltr:pl-4 rtl:border-r-2 rtl:pr-4">
														<p className="font-body text-sm leading-relaxed text-white/60">
															{faq.answer}
														</p>
													</div>
												</div>
											</div>
										</div>
									</div>
								);
							})}
						</div>

					</div>

					{/* ── Decorative sidebar ── */}
					<aside
						className=" max-lg:hidden lg:sticky lg:top-8 lg:col-span-5 lg:self-start"
						aria-hidden="true"
						data-aos="fade-up"
						data-aos-delay="150"
						data-aos-duration="700"
					>
						<div className="relative aspect-square w-full overflow-hidden rounded-xl border border-[var(--color-primary-500)]/20 bg-gradient-to-br from-slate-900/80 to-slate-950/80">
							{/* Glow border */}
							<div className="absolute -inset-px -z-10 rounded-xl bg-gradient-to-br from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)] opacity-[0.22] blur-lg animate-[pulse_4s_ease-in-out_infinite]" />

							{/* Rotating rings */}
							{RING_SIZES.map((size, i) => (
								<div
									key={i}
									className={[
										"absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[var(--color-primary-500)]/[0.12]",
										i % 2 === 0
											? "animate-[spin_18s_linear_infinite]"
											: "animate-[spin_24s_linear_infinite_reverse]",
									].join(" ")}
									style={{ width: size, height: size }}
								/>
							))}

							{/* Center icon */}
							<div className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)] shadow-2xl animate-[pulse_5s_ease-in-out_infinite]">
								<HelpCircle className="h-14 w-14 text-white" strokeWidth={1.5} />
							</div>

							{/* Floating icons */}
							{FLOAT_ICONS.map(({ Icon, posClass }, i) => (
								<div
									key={i}
									className={[
										"absolute flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)] shadow-lg",
										posClass,
										i % 2 === 0
											? "animate-[floatUp_3s_ease-in-out_infinite]"
											: "animate-[floatUp_4s_ease-in-out_0.5s_infinite]",
									].join(" ")}
								>
									<Icon className="h-6 w-6 text-white" />
								</div>
							))}

							{/* Bottom badge — direction-aware */}
							<div className="absolute bottom-6 flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-slate-900/80 px-4 py-2.5 shadow-xl backdrop-blur-sm ltr:left-6 rtl:right-6">
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)]">
									<MessageSquare className="h-4 w-4 text-white" />
								</div>
								<div>
									<p className="font-body text-xs font-black leading-none text-white">
										{t("badge")}
									</p>
									<p className="mt-0.5 font-body text-[10px] text-white/40">24/7</p>
								</div>
							</div>

							{/* Top counter — direction-aware */}
							<div className="absolute top-6 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-slate-900/80 px-3.5 py-2 shadow-xl backdrop-blur-sm ltr:right-6 rtl:left-6">
								<span className="font-display text-xl leading-none text-[var(--color-primary-400)]">
									{faqs.length}+
								</span>
								<span className="max-w-[48px] font-body text-[10px] leading-tight text-white/40">
									{t("questionsCount")}
								</span>
							</div>
						</div>

						{/* Category quick-stats */}
						<div className="mt-5 grid grid-cols-3 gap-3">
							{categories
								.filter((c) => c.id !== "all")
								.slice(0, 3)
								.map((cat) => {
									const count = faqs.filter((f) => f.category === cat.id).length;
									const Icon = cat.icon;
									const isActive = activeCategory === cat.id;

									return (
										<button
											key={cat.id}
											type="button"
											onClick={() => changeCategory(cat.id)}
											className={[
												"flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all duration-200 hover:-translate-y-1 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)]",
												isActive
													? "border-transparent bg-gradient-to-br from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)] shadow-lg"
													: "border-white/[0.06] bg-slate-800/40 hover:border-[var(--color-primary-500)]/30",
											].join(" ")}
										>
											<Icon
												aria-hidden="true"
												className={["h-5 w-5", isActive ? "text-white" : "text-[var(--color-primary-400)]"].join(" ")}
											/>
											<span className={["font-display text-xl leading-none", isActive ? "text-white" : "theme-gradient-text"].join(" ")}>
												{count}
											</span>
											<span className={["font-body text-[10px] font-bold uppercase tracking-wide", isActive ? "text-white/70" : "text-white/35"].join(" ")}>
												{cat.label}
											</span>
										</button>
									);
								})}
						</div>
					</aside>
				</div>
			</div>

			{/* ── Keyframes ── */}
			<style>{`
        @keyframes floatUp {
          0%, 100% { transform: translateY(0);    }
          50%       { transform: translateY(-14px); }
        }
      `}</style>
		</section>
	);
}