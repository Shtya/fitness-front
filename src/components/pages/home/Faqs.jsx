"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
	ChevronDown, Sparkles, HelpCircle, Search,
	User, Dumbbell, CreditCard, Settings, Shield,
	Zap, Heart, TrendingUp, MessageSquare,
	Phone, Mail, Plus, Minus,
} from "lucide-react";

// ─── Stable particle positions — never re-randomised on render ────────────────
const PARTICLES = Array.from({ length: 10 }, (_, i) => ({
	left: `${(i * 41 + 7) % 100}%`,
	top: `${(i * 67 + 13) % 100}%`,
	dur: 3 + (i % 3),
	del: (i * 0.28) % 2,
}));

// ─── Illustration floating icons ──────────────────────────────────────────────
const FLOAT_ICONS = [
	{ Icon: Sparkles, top: "20%", left: "12%" },
	{ Icon: Heart, top: "35%", left: "68%" },
	{ Icon: Zap, top: "58%", left: "18%" },
	{ Icon: Shield, top: "72%", left: "65%" },
];

export default function FAQs() {
	const [searchQuery, setSearchQuery] = useState("");
	const [activeCategory, setActiveCategory] = useState("all");
	const [openIndex, setOpenIndex] = useState(null);
	const t = useTranslations("home.faqs");

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
	];

	const filtered = faqs.filter(f => {
		const inCategory = activeCategory === "all" || f.category === activeCategory;
		const q = searchQuery.toLowerCase();
		const inSearch = !q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
		return inCategory && inSearch;
	});

	const toggle = (i) => setOpenIndex(openIndex === i ? null : i);

	return (
		<section className="relative py-20 sm:py-24 md:py-28 lg:py-32 overflow-hidden">

			{/* ── Background ── */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<motion.div
					className="absolute top-20 ltr:right-20 rtl:left-20 w-[500px] h-[500px]
            rounded-full blur-3xl opacity-[0.13]
            bg-[radial-gradient(circle,var(--color-primary-400),transparent)]"
					animate={{ scale: [1, 1.2, 1], opacity: [0.12, 0.2, 0.12] }}
					transition={{ duration: 8, repeat: Infinity }}
				/>
				<motion.div
					className="absolute bottom-20 ltr:left-20 rtl:right-20 w-[500px] h-[500px]
            rounded-full blur-3xl opacity-[0.13]
            bg-[radial-gradient(circle,var(--color-secondary-400),transparent)]"
					animate={{ scale: [1.2, 1, 1.2], opacity: [0.18, 0.12, 0.18] }}
					transition={{ duration: 8, repeat: Infinity, delay: 1 }}
				/>
				{/* Fine grid */}
				<div className="absolute inset-0 opacity-[0.025]
          bg-[linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)]
          bg-[size:60px_60px]
          [mask-image:radial-gradient(ellipse_at_50%_50%,black_30%,transparent_80%)]" />
				{/* Stable particles */}
				{PARTICLES.map((p, i) => (
					<motion.div
						key={i}
						className="absolute w-1.5 h-1.5 rounded-full
              bg-[var(--color-primary-400)]"
						style={{ left: p.left, top: p.top }}
						animate={{ y: [0, -18, 0], opacity: [0, 0.45, 0], scale: [0, 1, 0] }}
						transition={{ duration: p.dur, repeat: Infinity, delay: p.del }}
					/>
				))}
			</div>

			{/* ── Content ── */}
			<div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-16">

				<div className="flex flex-col items-center ">
				 

					{/* Title */}
					<h2 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl
              leading-tight tracking-tight mb-5">
						<span className="theme-gradient-text">{t("title")}</span>
					</h2>

					{/* Description */}
					<p className="font-body text-center text-base md:text-lg text-white/55 mb-8 leading-relaxed max-w-xl">
						{t("description")}
					</p>
 

					{/* ── Category pills ── */}
					<div className="flex flex-wrap gap-2 mb-8">
						{categories.map((cat, idx) => {
							const Icon = cat.icon;
							const isActive = activeCategory === cat.id;
							return (
								<motion.button
									key={cat.id}
									onClick={() => { setActiveCategory(cat.id); setOpenIndex(null); }}
									className={[
										"relative flex items-center gap-1.5 px-4 py-2 rounded-xl",
										"font-body font-bold text-xs overflow-hidden",
										"border-2 transition-colors duration-200",
										isActive
											? "text-white border-transparent"
											: "text-white/50 border-slate-700/40 bg-slate-800/30 hover:text-white/80 hover:border-slate-600/60",
									].join(" ")}
									whileHover={{ scale: 1.04 }}
									whileTap={{ scale: 0.96 }}
									initial={{ opacity: 0, x: -12 }}
									whileInView={{ opacity: 1, x: 0 }}
									viewport={{ once: true }}
									transition={{ delay: idx * 0.04 }}
								>
									{/* Sliding active bg */}
									{isActive && (
										<motion.div
											className="absolute inset-0 theme-gradient-bg"
											layoutId="activeCategory"
											transition={{ type: "spring", stiffness: 400, damping: 32 }}
										/>
									)}
									<Icon className={`w-3.5 h-3.5 relative z-10 ${isActive ? "animate-pulse" : ""}`} />
									<span className="relative z-10">{cat.label}</span>
								</motion.button>
							);
						})}
					</div>
				</div>
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">


					<motion.div
						className="lg:col-span-7"
						initial={{ opacity: 0, x: 24 }}
						whileInView={{ opacity: 1, x: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.7 }}
					>


						{/* ── FAQ accordion ── */}
						<div className="space-y-3">
							<AnimatePresence mode="popLayout">
								{filtered.length === 0 ? (
									<motion.div
										key="empty"
										initial={{ opacity: 0, scale: 0.95 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0.95 }}
										className="text-center py-16"
									>
										<div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5
                      bg-white/[0.04] border border-white/[0.08]">
											<Search className="w-9 h-9 text-white/25" />
										</div>
										<h3 className="font-body text-2xl font-black text-white mb-2">
											{t("noResults.title")}
										</h3>
										<p className="font-body text-white/45">{t("noResults.description")}</p>
									</motion.div>
								) : (
									filtered.map((faq, index) => {
										const isOpen = openIndex === index;
										return (
											<motion.div
												key={`${activeCategory}-${index}`}
												layout
												initial={{ opacity: 0, y: 16 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0, y: -16 }}
												transition={{ delay: index * 0.03 }}
											>
												<motion.button
													onClick={() => toggle(index)}
													className="w-full text-left group"
													whileTap={{ scale: 0.995 }}
												>
													<div className={[
														"relative bg-slate-800/45 backdrop-blur-xl",
														"rounded-xl border-2 transition-all duration-300 overflow-hidden p-5 sm:p-6",
														isOpen
															? "border-[var(--color-primary-500)]/60 shadow-[0_0_32px_var(--color-primary-500)/15]"
															: "border-slate-700/35 hover:border-[var(--color-primary-500)]/30",
													].join(" ")}>

														{/* Open — subtle tint */}
														{isOpen && (
															<motion.div
																className="absolute inset-0 theme-gradient-bg opacity-[0.04] pointer-events-none"
																initial={{ opacity: 0 }}
																animate={{ opacity: 0.04 }}
															/>
														)}

														{/* Question row */}
														<div className="relative flex items-start justify-between gap-4">
															<h3 className={[
																"font-body text-base font-bold leading-snug transition-colors duration-200 flex-1 ltr:pr-2 rtl:pl-2",
																isOpen ? "text-[var(--color-primary-200)]" : "text-white group-hover:text-[var(--color-primary-200)]",
															].join(" ")}>
																{faq.question}
															</h3>

															{/* Toggle chip */}
															<motion.div
																className={[
																	"w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
																	"transition-colors duration-200",
																	isOpen ? "theme-gradient-bg" : "bg-slate-700/60 group-hover:bg-slate-600/60",
																].join(" ")}
																animate={{ rotate: isOpen ? 180 : 0 }}
																transition={{ duration: 0.25 }}
															>
																{isOpen
																	? <Minus className="w-4 h-4 text-white" strokeWidth={3} />
																	: <Plus className="w-4 h-4 text-white/60" strokeWidth={3} />
																}
															</motion.div>
														</div>

														{/* Answer */}
														<AnimatePresence>
															{isOpen && (
																<motion.div
																	initial={{ height: 0, opacity: 0, marginTop: 0 }}
																	animate={{ height: "auto", opacity: 1, marginTop: 16 }}
																	exit={{ height: 0, opacity: 0, marginTop: 0 }}
																	transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
																	className="overflow-hidden"
																>
																	<div className="ltr:pl-4 rtl:pr-4
                                    ltr:border-l-2 rtl:border-r-2
                                    border-[var(--color-primary-500)]/30">
																		<motion.p
																			initial={{ y: -8 }}
																			animate={{ y: 0 }}
																			className="font-body text-sm text-white/60 leading-relaxed"
																		>
																			{faq.answer}
																		</motion.p>
																	</div>
																</motion.div>
															)}
														</AnimatePresence>
													</div>
												</motion.button>
											</motion.div>
										);
									})
								)}
							</AnimatePresence>
						</div>

						{/* ── Still have questions CTA ── */}
						<motion.div
							className="mt-10 relative"
							initial={{ opacity: 0, y: 16 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: 0.4 }}
						>
							{/* Glow behind card */}
							<motion.div
								className="absolute -inset-4 rounded-2xl blur-2xl theme-gradient-bg opacity-20 -z-10"
								animate={{ opacity: [0.18, 0.28, 0.18] }}
								transition={{ duration: 3, repeat: Infinity }}
							/>

							<div className="relative bg-slate-800/55 backdrop-blur-xl rounded-2xl p-7
                border border-[var(--color-primary-500)]/25">
								<div className="flex flex-col sm:flex-row items-center gap-6">
									{/* Icon */}
									<motion.div
										className="w-14 h-14 rounded-xl theme-gradient-bg
                      flex items-center justify-center shadow-xl shrink-0"
										whileHover={{ rotate: 360, scale: 1.1 }}
										transition={{ duration: 0.55 }}
									>
										<MessageSquare className="w-7 h-7 text-white" />
									</motion.div>

									{/* Text */}
									<div className="flex-1 text-center sm:ltr:text-left sm:rtl:text-right">
										<h3 className="font-body text-xl font-black text-white mb-1">
											{t("cta.title")}
										</h3>
										<p className="font-body text-sm text-white/45">
											{t("cta.description")}
										</p>
									</div>

									{/* Buttons */}
									<div className="flex gap-3 shrink-0">
										<motion.button
											className="group relative flex items-center gap-2
                        px-5 py-3 rounded-xl font-body font-bold text-sm text-white
                        theme-gradient-bg shadow-xl overflow-hidden
                        shadow-[0_6px_24px_var(--color-primary-500)/30]"
											whileHover={{ scale: 1.04, y: -2 }}
											whileTap={{ scale: 0.96 }}
										>
											<motion.div
												className="absolute inset-0 bg-white/20"
												initial={{ x: "-100%" }}
												whileHover={{ x: "100%" }}
												transition={{ duration: 0.55 }}
											/>
											<Mail className="w-4 h-4 relative z-10" />
											<span className="relative z-10">{t("cta.email")}</span>
										</motion.button>

										<motion.button
											className="flex items-center gap-2
                        px-5 py-3 rounded-xl font-body font-bold text-sm text-white/70
                        border-2 border-slate-600/50 bg-slate-700/30
                        hover:border-[var(--color-primary-500)]/50 hover:text-white
                        transition-colors duration-200"
											whileHover={{ scale: 1.04, y: -2 }}
											whileTap={{ scale: 0.96 }}
										>
											<Phone className="w-4 h-4" />
											{t("cta.call")}
										</motion.button>
									</div>
								</div>
							</div>
						</motion.div>
					</motion.div>

					{/* ═══════════════════════════════════════════════
              RIGHT: Sticky illustration
          ═══════════════════════════════════════════════ */}
					<motion.div
						className="lg:col-span-5 lg:sticky lg:top-8 lg:self-start"
						initial={{ opacity: 0, x: -24 }}
						whileInView={{ opacity: 1, x: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.7, delay: 0.15 }}
					>
						{/* Illustration card */}
						<div className="relative w-full aspect-square rounded-2xl overflow-hidden
              border border-[var(--color-primary-500)]/20
              bg-[linear-gradient(135deg,var(--color-primary-900)/20,var(--color-secondary-900)/20)]">

							{/* Animated border glow */}
							<motion.div
								className="absolute -inset-[1px] rounded-2xl theme-gradient-bg -z-10 blur-lg"
								animate={{ opacity: [0.18, 0.32, 0.18] }}
								transition={{ duration: 4, repeat: Infinity }}
							/>

							{/* Concentric rings */}
							{[180, 260, 340].map((size, i) => (
								<motion.div
									key={i}
									className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                    rounded-full border border-dashed border-[var(--color-primary-500)]/[0.12]"
									style={{ width: size, height: size }}
									animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
									transition={{ duration: 18 + i * 6, repeat: Infinity, ease: "linear" }}
								/>
							))}

							{/* Central question mark */}
							<motion.div
								className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                  w-28 h-28 rounded-2xl theme-gradient-bg
                  flex items-center justify-center shadow-2xl"
								animate={{ scale: [1, 1.06, 1], rotate: [0, 4, -4, 0] }}
								transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
							>
								<HelpCircle className="w-14 h-14 text-white" strokeWidth={1.5} />
							</motion.div>

							{/* Floating icon chips */}
							{FLOAT_ICONS.map(({ Icon, top, left }, i) => (
								<motion.div
									key={i}
									className="absolute w-12 h-12 rounded-xl theme-gradient-bg
                    flex items-center justify-center shadow-lg"
									style={{ top, left }}
									animate={{ y: [0, -14, 0], rotate: [0, 360] }}
									transition={{
										y: { duration: 3 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 },
										rotate: { duration: 6 + i, repeat: Infinity, ease: "linear", delay: i * 0.5 },
									}}
								>
									<Icon className="w-6 h-6 text-white" />
								</motion.div>
							))}

							{/* Stats chips */}
							<motion.div
								className="absolute bottom-6 ltr:left-6 rtl:right-6
                  flex items-center gap-2.5 px-4 py-2.5 rounded-xl
                  bg-slate-900/80 border border-white/[0.08] backdrop-blur-sm shadow-xl"
								initial={{ opacity: 0, y: 12 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ delay: 0.6 }}
							>
								<div className="w-8 h-8 rounded-lg theme-gradient-bg flex items-center justify-center">
									<MessageSquare className="w-4 h-4 text-white" />
								</div>
								<div>
									<p className="font-body text-xs font-black text-white leading-none">
										{t("badge")}
									</p>
									<p className="font-body text-[10px] text-white/40 mt-0.5">
										24/7
									</p>
								</div>
							</motion.div>

							{/* Answered count chip */}
							<motion.div
								className="absolute top-6 ltr:right-6 rtl:left-6
                  flex items-center gap-2 px-3.5 py-2 rounded-xl
                  bg-slate-900/80 border border-white/[0.08] backdrop-blur-sm shadow-xl"
								initial={{ opacity: 0, y: -12 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ delay: 0.7 }}
							>
								<span className="font-display text-xl text-[var(--color-primary-400)] leading-none">
									{faqs.length}+
								</span>
								<span className="font-body text-[10px] text-white/40 leading-tight max-w-[48px]">
									{t("categories.all")}
								</span>
							</motion.div>
						</div>

						{/* FAQ count by category */}
						<div className="mt-5 grid grid-cols-3 gap-3">
							{categories.filter(c => c.id !== "all").slice(0, 3).map((cat) => {
								const count = faqs.filter(f => f.category === cat.id).length;
								const Icon = cat.icon;
								return (
									<motion.button
										key={cat.id}
										onClick={() => { setActiveCategory(cat.id); setOpenIndex(null); }}
										className={[
											"flex flex-col items-center gap-1.5 p-3 rounded-xl",
											"border transition-all duration-200 text-center",
											activeCategory === cat.id
												? "theme-gradient-bg border-transparent shadow-lg"
												: "bg-slate-800/40 border-white/[0.06] hover:border-[var(--color-primary-500)]/30",
										].join(" ")}
										whileHover={{ y: -3 }}
										whileTap={{ scale: 0.97 }}
									>
										<Icon className={`w-5 h-5 ${activeCategory === cat.id ? "text-white" : "text-[var(--color-primary-400)]"}`} />
										<span className={`font-display text-xl leading-none ${activeCategory === cat.id ? "text-white" : "theme-gradient-text"}`}>
											{count}
										</span>
										<span className={`font-body text-[10px] font-bold uppercase tracking-wide ${activeCategory === cat.id ? "text-white/70" : "text-white/35"}`}>
											{cat.label}
										</span>
									</motion.button>
								);
							})}
						</div>
					</motion.div>

				</div>
			</div>
		</section>
	);
}