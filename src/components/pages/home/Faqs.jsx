"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
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
	Minus
} from "lucide-react";
import { useTheme } from "@/app/[locale]/theme";

export default function FAQs() {
	const [searchQuery, setSearchQuery] = useState("");
	const [activeCategory, setActiveCategory] = useState("all");
	const [openIndex, setOpenIndex] = useState(null);

	const t = useTranslations("home.faqs");
	const { colors } = useTheme();

	const categories = [
		{ id: "all", label: t("categories.all"), icon: HelpCircle },
		{ id: "general", label: t("categories.general"), icon: Sparkles },
		{ id: "membership", label: t("categories.membership"), icon: User },
		{ id: "training", label: t("categories.training"), icon: Dumbbell },
		{ id: "billing", label: t("categories.billing"), icon: CreditCard },
		{ id: "technical", label: t("categories.technical"), icon: Settings }
	];

	const faqs = [
		{
			category: "general",
			question: t("questions.general.0.question"),
			answer: t("questions.general.0.answer"),
			icon: Sparkles,
		},
		{
			category: "general",
			question: t("questions.general.1.question"),
			answer: t("questions.general.1.answer"),
			icon: Heart,
		},
		{
			category: "general",
			question: t("questions.general.2.question"),
			answer: t("questions.general.2.answer"),
			icon: TrendingUp,
		},
		{
			category: "membership",
			question: t("questions.membership.0.question"),
			answer: t("questions.membership.0.answer"),
			icon: User,
		},
		{
			category: "membership",
			question: t("questions.membership.1.question"),
			answer: t("questions.membership.1.answer"),
			icon: Shield,
		},
		{
			category: "membership",
			question: t("questions.membership.2.question"),
			answer: t("questions.membership.2.answer"),
			icon: Zap,
		},
		{
			category: "training",
			question: t("questions.training.0.question"),
			answer: t("questions.training.0.answer"),
			icon: Dumbbell,
		},
		{
			category: "training",
			question: t("questions.training.1.question"),
			answer: t("questions.training.1.answer"),
			icon: TrendingUp,
		},
		{
			category: "training",
			question: t("questions.training.2.question"),
			answer: t("questions.training.2.answer"),
			icon: Heart,
		},
		{
			category: "billing",
			question: t("questions.billing.0.question"),
			answer: t("questions.billing.0.answer"),
			icon: CreditCard,
		},
		{
			category: "billing",
			question: t("questions.billing.1.question"),
			answer: t("questions.billing.1.answer"),
			icon: Shield,
		},
		{
			category: "billing",
			question: t("questions.billing.2.question"),
			answer: t("questions.billing.2.answer"),
			icon: Zap,
		},
		{
			category: "technical",
			question: t("questions.technical.0.question"),
			answer: t("questions.technical.0.answer"),
			icon: Settings,
		},
		{
			category: "technical",
			question: t("questions.technical.1.question"),
			answer: t("questions.technical.1.answer"),
			icon: Phone,
		},
		{
			category: "technical",
			question: t("questions.technical.2.question"),
			answer: t("questions.technical.2.answer"),
			icon: Shield,
		}
	];

	const filteredFaqs = faqs.filter(faq => {
		const matchesCategory = activeCategory === "all" || faq.category === activeCategory;
		const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
			faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
		return matchesCategory && matchesSearch;
	});

	const toggleFAQ = (index) => {
		setOpenIndex(openIndex === index ? null : index);
	};

	return (
		<section className="relative py-20 sm:py-24 md:py-28 lg:py-32 overflow-hidden">
			{/* Decorative Background Elements */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<motion.div
					className="absolute top-20 ltr:right-20 rtl:left-20 w-[500px] h-[500px] rounded-full blur-3xl opacity-20"
					style={{
						background: `radial-gradient(circle, ${colors.primary[400]}, transparent)`,
					}}
					animate={{
						scale: [1, 1.2, 1],
						opacity: [0.2, 0.3, 0.2]
					}}
					transition={{ duration: 8, repeat: Infinity }}
				/>
				<motion.div
					className="absolute bottom-20 ltr:left-20 rtl:right-20 w-[500px] h-[500px] rounded-full blur-3xl opacity-20"
					style={{
						background: `radial-gradient(circle, ${colors.secondary[400]}, transparent)`,
					}}
					animate={{
						scale: [1.2, 1, 1.2],
						opacity: [0.3, 0.2, 0.3]
					}}
					transition={{ duration: 8, repeat: Infinity, delay: 1 }}
				/>

				{/* Floating Particles */}
				{[...Array(10)].map((_, i) => (
					<motion.div
						key={i}
						className="absolute w-1.5 h-1.5 rounded-full"
						style={{
							background: colors.primary[400],
							left: `${Math.random() * 100}%`,
							top: `${Math.random() * 100}%`,
						}}
						animate={{
							y: [0, -20, 0],
							opacity: [0, 0.5, 0],
							scale: [0, 1, 0],
						}}
						transition={{
							duration: 3 + Math.random() * 2,
							repeat: Infinity,
							delay: Math.random() * 2,
						}}
					/>
				))}
			</div>

			<div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
				<div className=" h-fit grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">

					{/* Right Side - Header & Illustration */}
					<motion.div className="lg:col-span-7"
						initial={{ opacity: 0, x: 30 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.8 }}
					>
						{/* Badge */}
						<motion.div
							className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg mb-6 backdrop-blur-xl"
							style={{
								background: `linear-gradient(135deg, ${colors.primary[500]}20, ${colors.secondary[500]}20)`,
								border: `2px solid ${colors.primary[500]}30`,
							}}
							animate={{ y: [0, -3, 0] }}
							transition={{ duration: 3, repeat: Infinity }}
						>
							<motion.div
								animate={{ rotate: 360 }}
								transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
							>
								<HelpCircle className="w-4 h-4" style={{ color: colors.primary[400] }} />
							</motion.div>
							<span className="text-sm font-black uppercase tracking-wider" style={{ color: colors.primary[300] }}>
								{t("badge")}
							</span>
						</motion.div>

						{/* Title */}
						<h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight tracking-tight">
							<span
								style={{
									background: `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.to})`,
									WebkitBackgroundClip: "text",
									backgroundClip: "text",
									WebkitTextFillColor: "transparent",
								}}
							>
								{t("title")}
							</span>
						</h2>

						{/* Description */}
						<p className="text-lg md:text-xl text-white/80 mb-8 leading-relaxed font-medium">
							{t("description")}
						</p>

						{/* Search Bar */}
						<motion.div
							className="relative mb-8"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.2 }}
						>
							<div className="relative">
								<Search className="absolute ltr:left-5 rtl:right-5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
								<input
									type="text"
									placeholder={t("searchPlaceholder")}
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full ltr:pl-14 rtl:pr-14 ltr:pr-5 rtl:pl-5 py-4 bg-slate-800/60 backdrop-blur-xl border-2 border-slate-700/50 rounded-lg text-white placeholder-white/40 focus:border-opacity-100 focus:ring-4 transition-all outline-none font-medium"
									style={{
										borderColor: searchQuery ? colors.primary[500] : '',
										boxShadow: searchQuery ? `0 0 0 4px ${colors.primary[500]}15` : '',
									}}
								/>
								{searchQuery && (
									<motion.button
										initial={{ opacity: 0, scale: 0.8 }}
										animate={{ opacity: 1, scale: 1 }}
										onClick={() => setSearchQuery("")}
										className="absolute ltr:right-5 rtl:left-5 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white transition-colors"
									>
										<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
										</svg>
									</motion.button>
								)}
							</div>
						</motion.div>

						{/* Category Pills */}
						<motion.div
							className="flex flex-wrap gap-2 mb-8"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.3 }}
						>
							{categories.map((category, idx) => {
								const Icon = category.icon;
								const isActive = activeCategory === category.id;

								return (
									<motion.button
										key={category.id}
										onClick={() => setActiveCategory(category.id)}
										className="relative flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all text-sm overflow-hidden"
										style={{
											backgroundColor: isActive
												? colors.primary[500]
												: 'rgba(30, 41, 59, 0.4)',
											color: isActive ? 'white' : 'rgba(255, 255, 255, 0.6)',
											border: `2px solid ${isActive ? colors.primary[500] : 'rgba(71, 85, 105, 0.3)'}`,
										}}
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.95 }}
										initial={{ opacity: 0, x: -20 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ delay: idx * 0.05 }}
									>
										{isActive && (
											<motion.div
												className="absolute inset-0"
												style={{
													background: `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.to})`,
												}}
												layoutId="activeCategory"
												transition={{
													type: "spring",
													stiffness: 380,
													damping: 30
												}}
											/>
										)}
										<Icon className={`w-4 h-4 relative z-10 ${isActive ? 'animate-pulse' : ''}`} />
										<span className="relative z-10">{category.label}</span>
									</motion.button>
								);
							})}
						</motion.div>

						<div className="space-y-4">
							<AnimatePresence mode="popLayout">
								{filteredFaqs.length === 0 ? (
									<motion.div
										initial={{ opacity: 0, scale: 0.9 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0.9 }}
										className="text-center py-20"
									>
										<div
											className="w-24 h-24 rounded-lg flex items-center justify-center mx-auto mb-6"
											style={{
												background: `linear-gradient(135deg, ${colors.primary[900]}40, ${colors.secondary[900]}40)`,
											}}
										>
											<Search className="w-12 h-12 text-white/40" />
										</div>
										<h3 className="text-3xl font-black text-white mb-3">{t("noResults.title")}</h3>
										<p className="text-white/60 text-lg">{t("noResults.description")}</p>
									</motion.div>
								) : (
									filteredFaqs.map((faq, index) => {
										const Icon = faq.icon;
										const isOpen = openIndex === index;

										return (
											<motion.div
												key={index}
												layout
												initial={{ opacity: 0, y: 20 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0, y: -20 }}
												transition={{ delay: index * 0.03 }}
											>
												<motion.button
													onClick={() => toggleFAQ(index)}
													className="relative w-full text-left group"
													whileHover={{ scale: 1.01 }}
													whileTap={{ scale: 0.99 }}
												>
													<div
														className="relative bg-slate-800/40 backdrop-blur-xl rounded-lg border-2 transition-all duration-300 overflow-hidden p-6"
														style={{
															borderColor: isOpen
																? colors.primary[500]
																: 'rgba(71, 85, 85, 0.3)',
															boxShadow: isOpen
																? `0 0 40px ${colors.primary[500]}20`
																: '0 4px 20px rgba(0, 0, 0, 0.1)',
														}}
													>
														{/* Animated gradient background */}
														{isOpen && (
															<motion.div
																className="absolute inset-0 opacity-5"
																style={{
																	background: `linear-gradient(135deg, ${colors.primary[500]}, ${colors.secondary[500]})`,
																}}
																initial={{ opacity: 0 }}
																animate={{ opacity: 0.05 }}
															/>
														)}

														{/* Header Section - Always Visible */}
														<div className="relative flex items-start justify-between gap-4">
															{/* Question Text */}
															<div className="flex-1">
																<h3
																	className="text-lg font-bold transition-colors leading-snug pr-4"
																	style={{
																		color: isOpen ? colors.primary[300] : 'white',
																	}}
																>
																	{faq.question}
																</h3>
															</div>

															{/* Expand/Collapse Icon */}
															<motion.div
																className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300"
																style={{
																	background: isOpen
																		? `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.to})`
																		: 'rgba(51, 65, 85, 0.6)',
																}}
																whileHover={{ scale: 1.1 }}
																animate={{ rotate: isOpen ? 180 : 0 }}
															>
																{isOpen ? (
																	<Minus className="w-5 h-5 text-white" strokeWidth={3} />
																) : (
																	<Plus className="w-5 h-5 text-white/60" strokeWidth={3} />
																)}
															</motion.div>
														</div>

														{/* Answer - Expands Inside */}
														<AnimatePresence>
															{isOpen && (
																<motion.div
																	initial={{ height: 0, opacity: 0, marginTop: 0 }}
																	animate={{ height: "auto", opacity: 1, marginTop: 20 }}
																	exit={{ height: 0, opacity: 0, marginTop: 0 }}
																	transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
																	className="overflow-hidden"
																>
																	<div className="relative ltr:pl-4 rtl:pr-4 ltr:border-l-2 rtl:border-r-2"
																		style={{
																			borderColor: `${colors.primary[500]}30`,
																		}}
																	>
																		<motion.p
																			initial={{ y: -10 }}
																			animate={{ y: 0 }}
																			className="text-white/70 leading-relaxed text-base"
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

						{/* Still Have Questions CTA */}
						<motion.div
							className="mt-12"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.6 }}
						>
							<div className="relative">
								<motion.div
									className="absolute -inset-4 rounded-lg blur-2xl opacity-30"
									style={{
										background: `linear-gradient(135deg, ${colors.primary[500]}, ${colors.secondary[500]})`,
									}}
									animate={{ opacity: [0.3, 0.5, 0.3] }}
									transition={{ duration: 3, repeat: Infinity }}
								/>

								<div
									className="relative backdrop-blur-xl rounded-lg p-8 border-2"
									style={{
										backgroundColor: 'rgba(30, 41, 59, 0.6)',
										borderColor: `${colors.primary[500]}30`,
									}}
								>
									<div className="flex flex-col md:flex-row items-center gap-6">
										<motion.div
											className="w-16 h-16 rounded-lg flex items-center justify-center shadow-2xl shrink-0"
											style={{
												background: `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.to})`,
											}}
											whileHover={{ rotate: 360, scale: 1.1 }}
											transition={{ duration: 0.6 }}
										>
											<MessageSquare className="w-8 h-8 text-white" />
										</motion.div>

										<div className="flex-1 text-center md:text-left">
											<h3 className="text-2xl font-black text-white mb-2">
												{t("cta.title")}
											</h3>
											<p className="text-white/60 font-medium">
												{t("cta.description")}
											</p>
										</div>

										<div className="flex gap-3">
											<motion.button
												className="group relative text-white px-6 py-3 rounded-lg font-bold shadow-xl overflow-hidden"
												style={{
													background: `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.to})`,
													boxShadow: `0 10px 40px ${colors.primary[500]}30`,
												}}
												whileHover={{ scale: 1.05, y: -2 }}
												whileTap={{ scale: 0.95 }}
											>
												<motion.div
													className="absolute inset-0 bg-white/20"
													initial={{ x: '-100%' }}
													whileHover={{ x: '100%' }}
													transition={{ duration: 0.6 }}
												/>
												<span className="relative flex items-center gap-2">
													<Mail className="w-5 h-5" />
													{t("cta.email")}
												</span>
											</motion.button>

											<motion.button
												className="group relative text-white px-6 py-3 rounded-lg font-bold border-2 transition-colors bg-slate-700/30"
												style={{
													borderColor: `${colors.primary[500]}40`,
												}}
												whileHover={{
													scale: 1.05,
													y: -2,
													borderColor: colors.primary[500],
												}}
												whileTap={{ scale: 0.95 }}
											>
												<span className="relative flex items-center gap-2">
													<Phone className="w-5 h-5" />
													{t("cta.call")}
												</span>
											</motion.button>
										</div>
									</div>
								</div>
							</div>
						</motion.div>
					</motion.div>

					{/* Left Side - FAQ List */}
					<motion.div className=" lg:col-span-5 lg:sticky top-8 h-fit lg:self-start"
						initial={{ opacity: 0, x: -30 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.8, delay: 0.2 }}
					>
						{/* Illustration Area */}
						<motion.div
							className="mt-12"
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: 0.5 }}
						>
							<div className="relative">
								{/* FAQ Illustration Placeholder */}
								<motion.div
									className="relative w-full aspect-square rounded-lg overflow-hidden"
									style={{
										background: `linear-gradient(135deg, ${colors.primary[900]}20, ${colors.secondary[900]}20)`,
										border: `2px solid ${colors.primary[500]}20`,
									}}
									animate={{
										boxShadow: [
											`0 0 60px ${colors.primary[500]}20`,
											`0 0 80px ${colors.secondary[500]}30`,
											`0 0 60px ${colors.primary[500]}20`,
										],
									}}
									transition={{ duration: 4, repeat: Infinity }}
								>
									{/* Question Mark */}
									<motion.div
										className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
										animate={{
											rotate: [0, 10, -10, 0],
											scale: [1, 1.1, 1],
										}}
										transition={{ duration: 6, repeat: Infinity }}
									>
										<HelpCircle
											className="w-32 h-32"
											style={{
												color: colors.primary[400],
												opacity: 0.2,
											}}
										/>
									</motion.div>

									{/* Floating Icons */}
									{[Sparkles, Heart, Zap, Shield].map((Icon, i) => (
										<motion.div
											key={i}
											className="absolute"
											style={{
												top: `${25 + (i * 15)}%`,
												left: `${15 + (i % 2) * 60}%`,
											}}
											animate={{
												y: [0, -15, 0],
												rotate: [0, 360],
												scale: [1, 1.2, 1],
											}}
											transition={{
												duration: 3 + i,
												repeat: Infinity,
												delay: i * 0.5,
											}}
										>
											<div
												className="w-12 h-12 rounded-lg flex items-center justify-center"
												style={{
													background: `linear-gradient(135deg, ${colors.primary[500]}, ${colors.secondary[500]})`,
												}}
											>
												<Icon className="w-6 h-6 text-white" />
											</div>
										</motion.div>
									))}
								</motion.div>
							</div>
						</motion.div>
					</motion.div>


				</div>
			</div>
		</section>
	);
}