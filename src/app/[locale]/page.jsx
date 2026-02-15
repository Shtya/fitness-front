"use client";

import { useMemo, useState, useEffect } from "react";
import {
	ClipboardCheck,
	Lightbulb,
	PenTool,
	Code,
	Search,
	Settings,
	Sparkles,
	ArrowRight,
	CheckCircle2,
	Trophy,
	Target,
	TrendingUp,
	Users,
	Check,
	Zap,
	Crown,
	Rocket,
	Star,
	Dumbbell,
	Mail,
	Phone,
	MapPin,
	Facebook,
	Twitter,
	Instagram,
	Linkedin,
	Youtube,
	Send,
	Heart,
	Shield,
	Award,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/app/[locale]/theme";

// Import your components
import FitnessHero from "@/components/pages/home/hero";
import RoleTabsDemo from "@/components/pages/home/RoleTabs";
import Testimonials from "@/components/pages/home/Testimonials";
import ContactUs from "@/components/pages/home/Contactus";
import FAQs from "@/components/pages/home/Faqs";
import HowItWork from "@/components/pages/home/HowItWorks";
import Navbar from "@/components/pages/home/Navbar";
import ThemeShowcaseSection from "@/components/pages/home/ThemeSection";
import Footer from "@/components/pages/home/Footer";

export default function Page() {
	return (
		<div className="min-h-screen antialiased bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
			{/* Global Background Grid Pattern */}
			<div
				className="fixed inset-0 opacity-[0.015] pointer-events-none z-0"
				style={{
					backgroundImage: `linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px)`,
					backgroundSize: '50px 50px'
				}}
			/>

			{/* Content */}
			<div className="relative z-10">
				<Navbar />

				{/* Hero Section */}
				<FitnessHero />

				{/* Section Divider */}
				<SectionDivider />

				{/* Stats Bar */}
				<StatsBar />

				{/* Section Divider */}
				<SectionDivider variant="subtle" />

				{/* Theme Showcase */}
				<ThemeShowcaseSection />

				{/* Section Divider */}
				<SectionDivider />

				{/* How It Works */}
				<HowItWork />

				{/* Section Divider */}
				<SectionDivider variant="subtle" />

				{/* Role Tabs */}
				<RoleTabsDemo />

				{/* Section Divider */}
				<SectionDivider />

				{/* Steps */}
				<Steps />

				{/* Section Divider */}
				<SectionDivider variant="subtle" />

				{/* Pricing */}
				<PricingPlans />

				{/* Section Divider */}
				<SectionDivider />

				{/* Testimonials */}
				<Testimonials />

				{/* Section Divider */}
				<SectionDivider variant="subtle" />

				{/* FAQs */}
				<FAQs />

				{/* Section Divider */}
				<SectionDivider />

				{/* Contact Us */}
				<ContactUs />

				{/* Footer */}
				<Footer />
			</div>
		</div>
	);
}

// ============================================================================
// SECTION DIVIDER - Creates visual separation between sections
// ============================================================================
function SectionDivider({ variant = "default" }) {
	const { colors } = useTheme();

	if (variant === "subtle") {
		return (
			<div className="relative py-8 sm:py-12 md:py-16">
				<div className="container mx-auto px-4">
					<motion.div
						className="h-px w-full"
						style={{
							background: `linear-gradient(to right, transparent, ${colors.primary[500]}20, transparent)`,
						}}
						initial={{ scaleX: 0 }}
						whileInView={{ scaleX: 1 }}
						viewport={{ once: true }}
						transition={{ duration: 1 }}
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="relative py-12 sm:py-16 md:py-20 overflow-hidden">
			{/* Animated Background Glow */}
			<motion.div
				className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 sm:w-96 sm:h-96 rounded-full blur-3xl opacity-20"
				style={{
					background: `radial-gradient(circle, ${colors.primary[500]}, transparent)`,
				}}
				animate={{
					scale: [1, 1.2, 1],
					opacity: [0.15, 0.25, 0.15],
				}}
				transition={{ duration: 5, repeat: Infinity }}
			/>

			<div className="container mx-auto px-4 relative z-10">
				<div className="flex items-center gap-3 sm:gap-4">
					{/* Left Line */}
					<motion.div
						className="flex-1 h-px"
						style={{
							background: `linear-gradient(to right, transparent, ${colors.primary[500]})`,
						}}
						initial={{ scaleX: 0 }}
						whileInView={{ scaleX: 1 }}
						viewport={{ once: true }}
						transition={{ duration: 0.8 }}
					/>

					{/* Center Icon */}
					<motion.div
						className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shadow-lg theme-gradient-bg"
						initial={{ scale: 0, rotate: -180 }}
						whileInView={{ scale: 1, rotate: 0 }}
						viewport={{ once: true }}
						transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
					>
						<Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
					</motion.div>

					{/* Right Line */}
					<motion.div
						className="flex-1 h-px"
						style={{
							background: `linear-gradient(to left, transparent, ${colors.secondary[500]})`,
						}}
						initial={{ scaleX: 0 }}
						whileInView={{ scaleX: 1 }}
						viewport={{ once: true }}
						transition={{ duration: 0.8 }}
					/>
				</div>
			</div>
		</div>
	);
}

// ============================================================================
// STATS BAR - Improved Responsive Design
// ============================================================================
function StatsBar() {
	const t = useTranslations("home.hero");
	const { colors } = useTheme();

	const stats = [
		{ icon: Trophy, value: t("stats.coaches.value"), label: t("stats.coaches.label") },
		{ icon: Target, value: t("stats.members.value"), label: t("stats.members.label") },
		{ icon: TrendingUp, value: t("stats.programs.value"), label: t("stats.programs.label") },
		{ icon: Users, value: "50,000+", label: t("trust.activeUsers") }
	];

	return (
		<section className="relative py-12 sm:py-16 md:py-20">
			<div className="container mx-auto px-4 sm:px-6">
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
					{stats.map((stat, index) => {
						const Icon = stat.icon;

						return (
							<motion.div
								key={index}
								className="group relative"
								initial={{ opacity: 0, y: 30 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ delay: index * 0.1, duration: 0.5 }}
							>
								{/* Glow Effect */}
								<motion.div
									className="absolute inset-0 rounded-lg sm:rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
									style={{
										background: `radial-gradient(circle at 30% 20%, ${colors.primary[500]}35, transparent 60%)`,
									}}
								/>

								{/* Card */}
								<div
									className="relative rounded-lg sm:rounded-lg border bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-4 sm:p-6 backdrop-blur-xl transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl"
									style={{
										borderColor: `${colors.primary[500]}20`,
										boxShadow: `0 10px 15px -3px rgba(0,0,0,0.30), 0 4px 6px -2px rgba(0,0,0,0.20), inset 0 2px 4px ${colors.primary[500]}05`,
									}}
								>
									<div className="flex flex-col items-center space-y-2 sm:space-y-3 text-center">
										{/* Icon */}
										<motion.div
											className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-lg flex items-center justify-center shadow-lg theme-gradient-bg"
											whileHover={{ scale: 1.1, rotate: 5 }}
											transition={{ type: "spring", stiffness: 300 }}
										>
											<Icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
										</motion.div>

										{/* Value */}
										<p className="text-2xl sm:text-3xl md:text-4xl font-black theme-gradient-text font-en">
											{stat.value}
										</p>

										{/* Label */}
										<p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-400">
											{stat.label}
										</p>
									</div>

									{/* Bottom Accent */}
									<motion.div
										className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl sm:rounded-b-3xl theme-gradient-bg origin-left"
										initial={{ scaleX: 0 }}
										whileInView={{ scaleX: 1 }}
										viewport={{ once: true }}
										transition={{ delay: 0.2, duration: 0.6 }}
									/>
								</div>
							</motion.div>
						);
					})}
				</div>
			</div>
		</section>
	);
}

// ============================================================================
// STEPS SECTION - Improved Mobile Layout
// ============================================================================


const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.1,
			delayChildren: 0.2,
		},
	},
};

const stepVariants = {
	hidden: {
		opacity: 0,
		scale: 0.8,
		y: 30,
	},
	visible: {
		opacity: 1,
		scale: 1,
		y: 0,
		transition: {
			type: "spring",
			stiffness: 100,
			damping: 15,
		},
	},
};


const headerVariants = {
	hidden: { opacity: 0, y: -30 },
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			type: "spring",
			stiffness: 100,
			damping: 20,
		},
	},
};
function Steps() {
	const [activeStep, setActiveStep] = useState(null);
	const [completedSteps, setCompletedSteps] = useState([]);
	const t = useTranslations("home.steps");

	const steps = [
		{
			id: 1,
			categoryStep: t("step") + " 1:",
			title: t("steps.validation.title"),
			description: t("steps.validation.description"),
			icon: ClipboardCheck,
			color: "primary",
		},
		{
			id: 2,
			categoryStep: t("step") + " 2:",
			title: t("steps.features.title"),
			description: t("steps.features.description"),
			icon: Lightbulb,
			color: "secondary",
		},
		{
			id: 3,
			categoryStep: t("step") + " 3:",
			title: t("steps.design.title"),
			description: t("steps.design.description"),
			icon: PenTool,
			color: "primary",
		},
		{
			id: 4,
			categoryStep: t("step") + " 4:",
			title: t("steps.coding.title"),
			description: t("steps.coding.description"),
			icon: Code,
			color: "secondary",
		},
		{
			id: 5,
			categoryStep: t("step") + " 5:",
			title: t("steps.testing.title"),
			description: t("steps.testing.description"),
			icon: Search,
			color: "primary",
		},
		{
			id: 6,
			categoryStep: t("step") + " 6:",
			title: t("steps.optimization.title"),
			description: t("steps.optimization.description"),
			icon: Settings,
			color: "secondary",
		},
	];

	const toggleStepCompletion = (stepId) => {
		setCompletedSteps((prev) =>
			prev.includes(stepId)
				? prev.filter((id) => id !== stepId)
				: [...prev, stepId]
		);
	};
	function StepCard({
		step,
		index,
		isActive,
		isCompleted,
		isLast,
		onHoverStart,
		onHoverEnd,
		onToggleComplete,
	}) {
		const Icon = step.icon;

		return (
			<div className="relative flex-shrink-0 w-44 sm:w-48 lg:w-auto">
				{/* Arrow - Desktop Only */}
				{!isLast && (
					<motion.div
						initial={{ x: -10, opacity: 0 }}
						animate={{ x: 0, opacity: 1 }}
						transition={{ delay: index * 0.1 + 0.3 }}
						className="hidden lg:block absolute top-16 ltr:-right-2 rtl:-left-2 transform -translate-y-1/2 z-20"
					>
						<ArrowRight
							className={`w-5 h-5 transition-colors rtl:rotate-180 ${isCompleted ? "" : ""
								}`}
							style={{
								color: isCompleted ? `var(--color-primary-400)` : `rgb(71, 85, 105)`,
							}}
						/>
					</motion.div>
				)}

				{/* Step Card */}
				<motion.div
					variants={stepVariants}
					onHoverStart={onHoverStart}
					onHoverEnd={onHoverEnd}
					whileHover={{ y: -8 }}
					className="relative cursor-pointer"
					onClick={onToggleComplete}
				>
					{/* Circle Container */}
					<div className="flex flex-col items-center mb-3 md:mb-4">
						{/* Outer Dashed Circle */}
						<motion.div
							className="relative w-28 h-28 md:w-32 md:h-32 rounded-full border-2 border-dashed flex items-center justify-center"
							style={{
								borderColor: isCompleted
									? `var(--color-primary-400)`
									: `var(--color-primary-400)`,
								borderOpacity: isCompleted ? 0.6 : 0.3,
							}}
							animate={{
								rotate: isActive ? 360 : 0,
							}}
							transition={{
								rotate: { duration: 2, ease: "linear" },
							}}
						>
							{/* Progress Arc */}
							<svg
								className="absolute inset-0 w-28 h-28 md:w-32 md:h-32 -rotate-90"
								viewBox="0 0 128 128"
							>
								<motion.circle
									cx="64"
									cy="64"
									r="60"
									fill="none"
									stroke={`var(--color-primary-500)`}
									strokeWidth="4"
									strokeDasharray="377"
									strokeLinecap="round"
									initial={{ strokeDashoffset: 377 }}
									animate={{
										strokeDashoffset: isCompleted
											? 0
											: isActive
												? 377 * 0.3
												: 377 - (377 * (step.id / 6)),
									}}
									transition={{ duration: 1, ease: "easeOut" }}
								/>
							</svg>

							{/* Inner Circle with Icon */}
							<motion.div
								whileHover={{ scale: 1.1 }}
								transition={{ type: "spring", stiffness: 300 }}
								className="relative w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center shadow-xl border z-10"
								style={{
									background: isCompleted
										? `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`
										: `linear-gradient(to bottom right, rgba(51, 65, 85, 0.5), rgba(30, 41, 59, 0.5))`,
									backdropFilter: 'blur(4px)',
									borderColor: isCompleted
										? `var(--color-primary-400)`
										: `rgb(71, 85, 105)`,
									borderOpacity: isCompleted ? 0.5 : 0.5,
								}}
							>
								{/* Completion Checkmark */}
								{isCompleted && (
									<motion.div
										initial={{ scale: 0, rotate: -180 }}
										animate={{ scale: 1, rotate: 0 }}
										className="absolute inset-0 flex items-center justify-center"
									>
										<CheckCircle2 className="w-10 h-10 md:w-12 md:h-12 text-white" />
									</motion.div>
								)}

								{/* Icon */}
								<Icon
									className={`w-8 h-8 md:w-10 md:h-10 transition-all ${isCompleted ? "opacity-0" : ""
										}`}
									style={{
										color: isCompleted
											? "white"
											: isActive
												? `var(--color-primary-300)`
												: `rgb(156, 163, 175)`,
									}}
									strokeWidth={1.5}
								/>

								{/* Shine Effect */}
								<motion.div
									className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full rtl:translate-x-full ltr:-translate-x-full"
									animate={{
										translateX: isActive ? "200%" : "-100%",
									}}
									transition={{
										duration: 1,
										repeat: isActive ? Infinity : 0,
										repeatDelay: 1,
									}}
								/>
							</motion.div>
						</motion.div>
					</div>

					{/* Step Number */}
					<div className="text-center mb-2">
						<span
							className="text-sm md:text-base font-bold transition-colors"
							style={{
								color: isCompleted
									? `var(--color-primary-600)`
									: isActive
										? `var(--color-primary-300)`
										: `var(--color-primary-400)`,
							}}
						>
							{step.categoryStep}
						</span>
					</div>

					{/* Title */}
					<h3
						className={`text-base md:text-lg font-bold text-center mb-2 px-2 transition-all ${isCompleted ? "theme-gradient-text" : ""
							}`}
						style={{
							color: isCompleted
								? undefined
								: isActive
									? "white"
									: `rgb(209, 213, 219)`,
						}}
					>
						{step.title}
					</h3>

					{/* Description - Hidden on mobile */}
					<p className="hidden lg:block text-gray-400 text-center text-xs leading-relaxed px-2 group-hover:text-gray-300 transition-colors">
						{step.description}
					</p>

					{/* Completion Badge - Mobile */}
					{isCompleted && (
						<motion.div
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							className="lg:hidden absolute -top-2 ltr:-right-2 rtl:-left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold"
						>
							✓
						</motion.div>
					)}

					{/* Glow Effect on Hover/Active */}
					<motion.div
						className="absolute inset-0 rounded-lg -z-10 blur-xl"
						style={{
							backgroundColor: isCompleted
								? `var(--color-primary-500)`
								: `var(--color-primary-500)`,
							opacity: isCompleted ? 0.2 : 0.1,
						}}
						animate={{
							scale: isActive || isCompleted ? 1.2 : 1,
							opacity: isActive || isCompleted ? (isCompleted ? 0.2 : 0.1) : 0,
						}}
						transition={{ duration: 0.3 }}
					/>

					{/* Click Indicator */}
					<motion.div
						className="absolute -bottom-6 ltr:left-1/2 rtl:right-1/2 transform ltr:-translate-x-1/2 rtl:translate-x-1/2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden lg:block"
						initial={{ y: -5 }}
						animate={{ y: 0 }}
					>
						{isCompleted ? "انقر للإلغاء" : "انقر للإكمال"}
					</motion.div>
				</motion.div>
			</div>
		);
	}
	return (
		<section className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">

			<div className="absolute inset-0 overflow-hidden pointer-events-none">

				<motion.div
					variants={glowVariants}
					initial="initial"
					animate="animate"
					className="absolute top-10 md:top-20 ltr:right-10 rtl:left-10 ltr:md:right-20 rtl:md:left-20 w-64 h-64 md:w-96 md:h-96 rounded-full blur-3xl"
					style={{
						background: `radial-gradient(circle, var(--color-primary-500) 0%, transparent 70%)`,
						opacity: 0.2,
					}}
				/>
				<motion.div
					variants={glowVariants}
					initial="initial"
					animate="animate"
					transition={{ delay: 0.5 }}
					className="absolute bottom-10 md:bottom-20 ltr:left-10 rtl:right-10 ltr:md:left-20 rtl:md:right-20 w-64 h-64 md:w-96 md:h-96 rounded-full blur-3xl"
					style={{
						background: `radial-gradient(circle, var(--color-secondary-500) 0%, transparent 70%)`,
						opacity: 0.2,
					}}
				/>

				{/* Grid Pattern */}
				<div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]" />

				{/* Floating Particles */}
				{[...Array(20)].map((_, i) => (
					<motion.div
						key={i}
						className="absolute w-1 h-1 rounded-full"
						style={{
							left: `${Math.random() * 100}%`,
							top: `${Math.random() * 100}%`,
							backgroundColor: `var(--color-primary-400)`,
							opacity: 0.3,
						}}
						animate={{
							y: [0, -30, 0],
							opacity: [0.3, 0.6, 0.3],
						}}
						transition={{
							duration: 3 + Math.random() * 2,
							repeat: Infinity,
							delay: Math.random() * 2,
						}}
					/>
				))}
			</div>

			<div className="relative z-10 container mx-auto px-4 md:px-6">
				{/* Section Header */}
				<motion.div
					variants={headerVariants}
					initial="hidden"
					animate="visible"
					className="text-center mb-12 md:mb-20"
				>
					{/* Badge */}
					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.5 }}
						className="inline-flex items-center gap-2 px-4 md:px-5 py-2 md:py-3 rounded-full backdrop-blur-sm border mb-4 md:mb-6"
						style={{
							background: `linear-gradient(to right, var(--color-primary-500), var(--color-secondary-500))`,
							opacity: 0.2,
							borderColor: `var(--color-primary-500)`,
							borderOpacity: 0.3,
						}}
					>
						<Sparkles
							className="w-4 h-4 animate-pulse"
							style={{ color: `var(--color-primary-400)` }}
						/>
						<span
							className="text-xs md:text-sm font-bold uppercase tracking-wide"
							style={{ color: `var(--color-primary-200)` }}
						>
							{t("badge")}
						</span>
					</motion.div>

					{/* Title */}
					<h2 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-white mb-4 md:mb-6 leading-tight px-4">
						<span className="theme-gradient-text">{t("title")}</span>
					</h2>

					{/* Description */}
					<p className="text-base md:text-lg lg:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed px-4">
						{t("description")}
					</p>
				</motion.div>

				{/* Steps Container */}
				<div className="relative max-w-7xl mx-auto">
					{/* Horizontal Connection Line - Desktop */}
					<motion.div
						className="hidden lg:block absolute top-16 ltr:left-0 rtl:right-0 ltr:right-0 rtl:left-0 h-0.5"
						style={{
							background: `linear-gradient(to right, transparent, var(--color-primary-500), transparent)`,
							opacity: 0.3,
						}}
						initial={{ scaleX: 0 }}
						animate={{ scaleX: 1 }}
						transition={{ duration: 1, delay: 0.5 }}
					/>

					{/* Progress Line - Desktop */}
					<motion.div
						className="hidden lg:block absolute top-16 ltr:left-0 rtl:right-0 h-0.5 theme-gradient-bg"
						initial={{ width: 0 }}
						animate={{
							width: `${(completedSteps.length / steps.length) * 100}%`,
						}}
						transition={{ duration: 0.5 }}
					/>

					{/* Steps Grid */}
					<div className="overflow-x-auto pb-4 lg:overflow-visible scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300 scrollbar-thumb-slate-400:hover">
						<motion.div
							variants={containerVariants}
							initial="hidden"
							animate="visible"
							className="flex lg:grid lg:grid-cols-6 gap-4 md:gap-6 lg:gap-4 min-w-max lg:min-w-0 px-4 lg:px-0"
						>
							{steps.map((step, index) => (
								<StepCard
									key={step.id}
									step={step}
									index={index}
									isActive={activeStep === step.id}
									isCompleted={completedSteps.includes(step.id)}
									isLast={index === steps.length - 1}
									onHoverStart={() => setActiveStep(step.id)}
									onHoverEnd={() => setActiveStep(null)}
									onToggleComplete={() => toggleStepCompletion(step.id)}
								/>
							))}
						</motion.div>
					</div>
				</div>

			</div>
		</section>
	);
}

// Step Card Component - Fully Responsive
function StepCard({ step, index, isActive, isCompleted, onHoverStart, onHoverEnd, onToggleComplete, colors }) {
	const Icon = step.icon;

	return (
		<motion.div
			className="relative"
			initial={{ opacity: 0, y: 30 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true }}
			transition={{ delay: index * 0.1, duration: 0.5 }}
			onMouseEnter={onHoverStart}
			onMouseLeave={onHoverEnd}
			onClick={onToggleComplete}
		>
			<motion.div
				className="relative cursor-pointer h-full"
				whileHover={{ y: -8, scale: 1.02 }}
				whileTap={{ scale: 0.98 }}
			>
				{/* Card Container */}
				<div className="flex flex-col items-center text-center p-4 sm:p-6">
					{/* Circle with Icon */}
					<div className="relative mb-4">
						{/* Outer Dashed Circle */}
						<motion.div
							className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full border-2 border-dashed flex items-center justify-center"
							style={{
								borderColor: isCompleted ? colors.primary[400] : `${colors.primary[400]}30`,
							}}
							animate={{
								rotate: isActive ? 360 : 0,
							}}
							transition={{ rotate: { duration: 2, ease: "linear" } }}
						>
							{/* Progress Arc - SVG */}
							<svg
								className="absolute inset-0 w-full h-full -rotate-90"
								viewBox="0 0 128 128"
							>
								<motion.circle
									cx="64"
									cy="64"
									r="60"
									fill="none"
									stroke={colors.primary[500]}
									strokeWidth="4"
									strokeDasharray="377"
									strokeLinecap="round"
									initial={{ strokeDashoffset: 377 }}
									animate={{
										strokeDashoffset: isCompleted ? 0 : 377 - (377 * (step.id / 6)),
									}}
									transition={{ duration: 1 }}
								/>
							</svg>

							{/* Inner Circle */}
							<motion.div
								className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center shadow-xl border z-10"
								style={{
									background: isCompleted
										? `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.to})`
										: 'rgba(51, 65, 85, 0.5)',
									borderColor: isCompleted ? colors.primary[400] : 'rgb(71, 85, 105)',
									backdropFilter: 'blur(4px)',
								}}
								whileHover={{ scale: 1.1 }}
							>
								{isCompleted ? (
									<motion.div
										initial={{ scale: 0, rotate: -180 }}
										animate={{ scale: 1, rotate: 0 }}
										className="absolute inset-0 flex items-center justify-center"
									>
										<CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" />
									</motion.div>
								) : (
									<Icon
										className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10"
										style={{
											color: isActive ? colors.primary[300] : 'rgb(156, 163, 175)',
										}}
										strokeWidth={1.5}
									/>
								)}
							</motion.div>
						</motion.div>
					</div>

					{/* Step Number */}
					<span
						className="text-sm sm:text-base font-bold mb-2"
						style={{
							color: isCompleted ? colors.primary[600] : isActive ? colors.primary[300] : colors.primary[400],
						}}
					>
						{step.categoryStep}
					</span>

					{/* Title */}
					<h3
						className={`text-base sm:text-lg md:text-xl font-bold mb-2 px-2 ${
							isCompleted ? "theme-gradient-text" : ""
						}`}
						style={{
							color: isCompleted ? undefined : isActive ? "white" : "rgb(209, 213, 219)",
						}}
					>
						{step.title}
					</h3>

					{/* Description - Hidden on Mobile */}
					<p className="hidden md:block text-gray-400 text-sm leading-relaxed px-2">
						{step.description}
					</p>
				</div>

				{/* Glow Effect */}
				<motion.div
					className="absolute inset-0 rounded-lg -z-10 blur-xl"
					style={{
						backgroundColor: colors.primary[500],
						opacity: isCompleted ? 0.2 : 0.1,
					}}
					animate={{
						scale: isActive || isCompleted ? 1.2 : 1,
						opacity: isActive || isCompleted ? (isCompleted ? 0.2 : 0.1) : 0,
					}}
					transition={{ duration: 0.3 }}
				/>
			</motion.div>
		</motion.div>
	);
}

// ============================================================================
// PRICING PLANS - Mobile-First Responsive Design
// ============================================================================
function PricingPlans() {
	const [billingCycle, setBillingCycle] = useState("month");
	const t = useTranslations("home.pricing");
	const { colors } = useTheme();

	const billingCycles = [
		{ id: "month", label: t("cycles.month"), discount: null },
		{ id: "6months", label: t("cycles.6months"), discount: "15%" },
		{ id: "year", label: t("cycles.year"), discount: "30%" },
	];

	const plans = [
		{
			id: "plus",
			name: t("plans.plus.name"),
			tagline: t("plans.plus.tagline"),
			icon: Zap,
			popular: false,
			pricing: { month: 29, "6months": 24, year: 20 },
			features: [
				t("plans.plus.features.0"),
				t("plans.plus.features.1"),
				t("plans.plus.features.2"),
				t("plans.plus.features.3"),
				t("plans.plus.features.4"),
				t("plans.plus.features.5"),
			],
		},
		{
			id: "professional",
			name: t("plans.professional.name"),
			tagline: t("plans.professional.tagline"),
			icon: Crown,
			popular: true,
			pricing: { month: 79, "6months": 67, year: 55 },
			features: [
				t("plans.professional.features.0"),
				t("plans.professional.features.1"),
				t("plans.professional.features.2"),
				t("plans.professional.features.3"),
				t("plans.professional.features.4"),
				t("plans.professional.features.5"),
				t("plans.professional.features.6"),
				t("plans.professional.features.7"),
			],
		},
		{
			id: "enterprise",
			name: t("plans.enterprise.name"),
			tagline: t("plans.enterprise.tagline"),
			icon: Rocket,
			popular: false,
			pricing: { month: 199, "6months": 169, year: 139 },
			features: [
				t("plans.enterprise.features.0"),
				t("plans.enterprise.features.1"),
				t("plans.enterprise.features.2"),
				t("plans.enterprise.features.3"),
				t("plans.enterprise.features.4"),
				t("plans.enterprise.features.5"),
				t("plans.enterprise.features.6"),
				t("plans.enterprise.features.7"),
				t("plans.enterprise.features.8"),
				t("plans.enterprise.features.9"),
			],
		},
	];

	return (
		<section className="relative py-16 sm:py-20 md:py-24 overflow-hidden">
			{/* Background Effects */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<motion.div
					className="absolute top-20 ltr:right-10 rtl:left-10 w-64 h-64 sm:w-96 sm:h-96 rounded-full blur-3xl opacity-20"
					style={{
						background: `radial-gradient(circle, ${colors.primary[500]}, transparent)`,
					}}
					animate={{
						scale: [1, 1.2, 1],
						opacity: [0.2, 0.3, 0.2],
					}}
					transition={{ duration: 8, repeat: Infinity }}
				/>
			</div>

			<div className="relative z-10 container mx-auto px-4 sm:px-6">
				{/* Section Header */}
				<motion.div
					className="text-center mb-12 sm:mb-16"
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
				>
					{/* Badge */}
					<motion.div
						className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-3 rounded-full backdrop-blur-sm border mb-4 sm:mb-6"
						style={{
							background: `linear-gradient(to right, ${colors.primary[500]}, ${colors.secondary[500]})`,
							opacity: 0.2,
							borderColor: `${colors.primary[500]}30`,
						}}
						whileHover={{ scale: 1.05 }}
					>
						<Sparkles className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" style={{ color: colors.primary[400] }} />
						<span className="text-xs sm:text-sm font-bold uppercase tracking-wide" style={{ color: colors.primary[200] }}>
							{t("badge")}
						</span>
					</motion.div>

					{/* Title */}
					<h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 sm:mb-6 px-4">
						<span className="theme-gradient-text">{t("title")}</span>
					</h2>

					{/* Description */}
					<p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-3xl mx-auto px-4">
						{t("description")}
					</p>
				</motion.div>

				{/* Billing Cycle Tabs - Mobile Scrollable */}
				<div className="flex justify-center mb-12 sm:mb-16 px-4">
					<div className="inline-flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 bg-slate-800/50 backdrop-blur-xl rounded-lg border border-slate-700/50 shadow-2xl overflow-x-auto scrollbar-thin w-full sm:w-auto">
						{billingCycles.map((cycle) => {
							const isActive = billingCycle === cycle.id;

							return (
								<motion.button
									key={cycle.id}
									onClick={() => setBillingCycle(cycle.id)}
									className={`relative px-4 sm:px-6 md:px-8 py-3 sm:py-4 rounded-lg font-bold text-sm sm:text-base transition-all whitespace-nowrap flex-shrink-0 ${
										isActive ? "text-white" : "text-gray-400"
									}`}
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
								>
									{isActive && (
										<motion.div
											layoutId="billing-active"
											className="absolute inset-0 theme-gradient-bg rounded-lg shadow-lg"
											style={{
												boxShadow: `0 0 20px ${colors.primary[500]}40`,
											}}
											transition={{
												type: "spring",
												stiffness: 380,
												damping: 30,
											}}
										/>
									)}
									<span className="relative z-10 flex flex-col items-center">
										<span>{cycle.label}</span>
										{cycle.discount && (
											<span className="text-xs text-green-400 font-semibold mt-1">
												{t("save")} {cycle.discount}
											</span>
										)}
									</span>
								</motion.button>
							);
						})}
					</div>
				</div>

				{/* Pricing Cards - Responsive Grid */}
				<AnimatePresence mode="wait">
					<motion.div
						key={billingCycle}
						className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-7xl mx-auto"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					>
						{plans.map((plan, index) => (
							<PricingCard
								key={plan.id}
								plan={plan}
								billingCycle={billingCycle}
								index={index}
								colors={colors}
								t={t}
							/>
						))}
					</motion.div>
				</AnimatePresence>
			</div>
		</section>
	);
}

// Pricing Card Component - Mobile Optimized
function PricingCard({ plan, billingCycle, index, colors, t }) {
	const Icon = plan.icon;
	const price = plan.pricing[billingCycle];
	const monthlyEquivalent =
		billingCycle === "6months"
			? price * 6
			: billingCycle === "year"
			? price * 12
			: price;

	return (
		<motion.div
			className={`relative ${plan.popular ? "md:scale-105" : ""}`}
			initial={{ opacity: 0, y: 30 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: index * 0.1, duration: 0.5 }}
			whileHover={{ y: -8, scale: plan.popular ? 1.08 : 1.03 }}
		>
			{/* Popular Badge */}
			{plan.popular && (
				<motion.div
					className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20"
					initial={{ y: -10, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					transition={{ delay: 0.5 }}
				>
					<div className="flex items-center gap-2 px-4 py-2 theme-gradient-bg rounded-full shadow-lg">
						<Star className="w-4 h-4 text-white fill-white" />
						<span className="text-white font-bold text-sm uppercase">
							{t("mostPopular")}
						</span>
					</div>
				</motion.div>
			)}

			{/* Card */}
			<div
				className={`relative h-full bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-lg p-6 sm:p-8 border-2 transition-all duration-300 ${
					plan.popular
						? "border-opacity-50 shadow-2xl"
						: "border-slate-700/50 shadow-xl"
				}`}
				style={{
					borderColor: plan.popular ? colors.primary[500] : undefined,
					boxShadow: plan.popular ? `0 20px 60px ${colors.primary[500]}30` : undefined,
				}}
			>
				{/* Animated Glow */}
				<motion.div
					className="absolute -inset-1 theme-gradient-bg rounded-lg opacity-0 group-hover:opacity-20 blur-2xl transition-opacity duration-300"
					aria-hidden="true"
				/>

				<div className="relative z-10">
					{/* Icon */}
					<motion.div
						className="w-14 h-14 sm:w-16 sm:h-16 theme-gradient-bg rounded-lg flex items-center justify-center shadow-xl mb-6"
						whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
						transition={{ duration: 0.5 }}
					>
						<Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
					</motion.div>

					{/* Plan Name */}
					<h3 className="text-2xl sm:text-3xl font-black text-white mb-2">
						{plan.name}
					</h3>
					<p className="text-gray-400 text-sm mb-6">{plan.tagline}</p>

					{/* Price */}
					<div className="mb-8">
						<div className="flex items-baseline gap-2">
							<span className="text-4xl sm:text-5xl font-black text-white">
								${price}
							</span>
							<span className="text-gray-400 font-semibold text-sm sm:text-base">
								/{t("perMonth")}
							</span>
						</div>
						{billingCycle !== "month" && (
							<p className="text-sm text-gray-500 mt-2">
								${monthlyEquivalent}{" "}
								{billingCycle === "6months" ? t("per6Months") : t("perYear")}
							</p>
						)}
					</div>

					{/* CTA Button */}
					<motion.button
						className={`w-full py-4 rounded-lg font-bold text-base mb-8 transition-all ${
							plan.popular
								? "theme-gradient-bg text-white shadow-xl"
								: "bg-slate-700/50 text-white border-2 border-slate-600"
						}`}
						style={{
							boxShadow: plan.popular ? `0 10px 40px ${colors.primary[500]}40` : undefined,
						}}
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
					>
						{t("getStarted")}
					</motion.button>

					{/* Features */}
					<div className="space-y-4">
						<p className="text-sm text-gray-400 font-bold uppercase tracking-wide mb-4">
							{t("whatsIncluded")}
						</p>
						{plan.features.map((feature, idx) => (
							<motion.div
								key={idx}
								className="flex items-start gap-3"
								initial={{ opacity: 0, x: -20 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: idx * 0.05 }}
							>
								<div className="flex-shrink-0 w-5 h-5 rounded-full theme-gradient-bg flex items-center justify-center mt-0.5">
									<Check className="w-3 h-3 text-white" strokeWidth={3} />
								</div>
								<span className="text-gray-300 text-sm leading-relaxed">
									{feature}
								</span>
							</motion.div>
						))}
					</div>
				</div>

				{/* Bottom Accent */}
				<motion.div
					className="absolute bottom-0 left-0 right-0 h-1 theme-gradient-bg rounded-b-3xl"
					initial={{ scaleX: 0 }}
					whileInView={{ scaleX: 1 }}
					viewport={{ once: true }}
					transition={{ duration: 0.6, delay: 0.2 }}
				/>
			</div>
		</motion.div>
	);
}


export const glowVariants = {
	initial: { opacity: 0, scale: 0.8 },
	animate: {
		opacity: [0.2, 0.4, 0.2],
		scale: [0.8, 1.2, 0.8],
		transition: {
			duration: 5,
			repeat: Infinity,
			ease: "easeInOut",
		},
	},
};