"use client";

import { useMemo, useState } from "react"; import {
	ClipboardCheck,
	Lightbulb,
	PenTool,
	Code,
	Search,
	Settings,
	Sparkles,
	ArrowRight,
	CheckCircle2, Trophy, Target, TrendingUp, Users , Check,
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
		<div className="min-h-screen bg-white antialiased bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">

			<div
				className="absolute inset-0 opacity-10"
				style={{
					backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px)`,
					backgroundSize: '50px 50px'
				}}
			/>
			<Navbar />
			<FitnessHero />
			<StatsBar />
			<ThemeShowcaseSection />
			<RoleTabsDemo />
			<Steps />
			<PricingPlans />
			<Testimonials />
			<ContactUs />
			<FAQs />
			<HowItWork />
			<Footer />


		</div>
	);
}





function StatsBar() {
	const t = useTranslations("home.hero");

	const stats = [
		{ icon: Trophy, value: t("stats.coaches.value"), label: t("stats.coaches.label") },
		{ icon: Target, value: t("stats.members.value"), label: t("stats.members.label") },
		{ icon: TrendingUp, value: t("stats.programs.value"), label: t("stats.programs.label") },
		{ icon: Users, value: "50,000+", label: t("trust.activeUsers") }
	];

	return (
		<section className="relative">
			<div className="container mx-auto px-6 py-16">
				<div className="grid grid-cols-2 gap-6 md:grid-cols-4">
					{stats.map((stat, index) => {
						const Icon = stat.icon;

						// rotate theme usage a bit so cards don't look identical,
						// but all still come from your CSS vars
						const iconBg =
							index % 2 === 0
								? "bg-[linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))]"
								: "bg-[linear-gradient(135deg,var(--color-primary-500),var(--color-secondary-500))]";

						const valueText =
							index % 2 === 0
								? "theme-gradient-text"
								: "bg-[linear-gradient(135deg,var(--color-primary-400),var(--color-secondary-400))] bg-clip-text text-transparent";

						const bottomAccent =
							index % 2 === 0
								? "bg-[linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))]"
								: "bg-[linear-gradient(135deg,var(--color-primary-500),var(--color-secondary-500))]";

						return (
							<div key={index} className="group relative">
								{/* Glow (no inline styles) */}
								<div className="absolute inset-0 rounded-2xl opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_30%_20%,color-mix(in_srgb,var(--color-primary-500)_35%,transparent),transparent_60%)]" />

								{/* Card */}
								<div
									className={[
										"relative rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80",
										"p-6 backdrop-blur-xl transition-all duration-300",
										"group-hover:-translate-y-1 group-hover:border-slate-600",
										"shadow-[0_10px_15px_-3px_rgba(0,0,0,0.30),0_4px_6px_-2px_rgba(0,0,0,0.20),inset_0_2px_4px_rgba(255,255,255,0.05)]"
									].join(" ")}
								>
									<div className="flex flex-col items-center space-y-3 text-center">
										{/* Icon */}
										<div
											className={[
												"grid h-14 w-14 place-items-center rounded-xl shadow-lg",
												"transition-transform duration-300 group-hover:scale-110",
												iconBg
											].join(" ")}
										>
											<Icon className="h-7 w-7 text-white" />
										</div>

										{/* Value */}
										<p className={["text-4xl font-black font-en ", valueText].join(" ")}>
											{stat.value}
										</p>

										{/* Label */}
										<p className="text-sm font-bold uppercase tracking-wider text-gray-400">
											{stat.label}
										</p>
									</div>

									{/* Bottom Accent */}
									<div
										className={[
											"absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl",
											"origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100",
											bottomAccent
										].join(" ")}
									/>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}



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

const glowVariants = {
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
						className="absolute inset-0 rounded-2xl -z-10 blur-xl"
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
			pricing: {
				month: 29,
				"6months": 24,
				year: 20,
			},
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
			pricing: {
				month: 79,
				"6months": 67,
				year: 55,
			},
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
			pricing: {
				month: 199,
				"6months": 169,
				year: 139,
			},
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

	// Animation variants
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

	const cardVariants = {
		hidden: { opacity: 0, y: 30, scale: 0.95 },
		visible: {
			opacity: 1,
			y: 0,
			scale: 1,
			transition: {
				duration: 0.5,
				ease: [0.215, 0.61, 0.355, 1],
			},
		},
	};

	const featureVariants = {
		hidden: { opacity: 0, x: -20 },
		visible: (index) => ({
			opacity: 1,
			x: 0,
			transition: {
				delay: index * 0.05,
				duration: 0.4,
			},
		}),
	};

	return (
		<section className="relative py-16 sm:py-20 md:py-24 lg:py-28 overflow-hidden">
			{/* Animated Background Blobs */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<motion.div
					className="absolute top-20 ltr:right-10 rtl:left-10 sm:ltr:right-20 sm:rtl:left-20 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-[var(--color-primary-500)] opacity-20 rounded-full blur-3xl"
					animate={{
						scale: [1, 1.2, 1],
						opacity: [0.2, 0.3, 0.2],
					}}
					transition={{
						duration: 8,
						repeat: Infinity,
						ease: "easeInOut",
					}}
				/>
				<motion.div
					className="absolute bottom-20 ltr:left-10 rtl:right-10 sm:ltr:left-20 sm:rtl:right-20 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-[var(--color-secondary-500)] opacity-20 rounded-full blur-3xl"
					animate={{
						scale: [1.2, 1, 1.2],
						opacity: [0.3, 0.2, 0.3],
					}}
					transition={{
						duration: 8,
						repeat: Infinity,
						ease: "easeInOut",
					}}
				/>
			</div>

			<div className="relative z-10 container mx-auto">
				{/* Section Header */}
				<motion.div
					className="text-center mb-12 sm:mb-14 md:mb-16"
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
				>
					{/* Badge */}
					<motion.div
						className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-3 rounded-full bg-[var(--color-primary-500)] bg-opacity-20 border border-[var(--color-primary-500)] border-opacity-30 backdrop-blur-sm mb-4 sm:mb-6"
						whileHover={{ scale: 1.05 }}
						transition={{ type: "spring", stiffness: 400, damping: 10 }}
					>
						<Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--color-primary-400)] animate-pulse" />
						<span className="text-xs sm:text-sm font-bold text-[var(--color-primary-200)] uppercase tracking-wide">
							{t("badge")}
						</span>
					</motion.div>

					{/* Title */}
					<h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-white mb-4 sm:mb-6 px-4">
						<span className="theme-gradient-text">{t("title")}</span>
					</h2>

					{/* Description */}
					<p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-3xl mx-auto px-4">
						{t("description")}
					</p>
				</motion.div>

				{/* Billing Cycle Tabs */}
				<div className="flex justify-center mb-12 sm:mb-14 md:mb-16 px-4">
					<div className="inline-flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 bg-slate-800 bg-opacity-50 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-slate-700 border-opacity-50 shadow-2xl w-full sm:w-auto overflow-x-auto scrollbar-thin">
						{billingCycles.map((cycle) => {
							const isActive = billingCycle === cycle.id;

							return (
								<motion.button
									key={cycle.id}
									onClick={() => setBillingCycle(cycle.id)}
									className={`relative px-4 sm:px-6 md:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base md:text-lg transition-all whitespace-nowrap ${
										isActive ? "text-white" : "text-gray-400 hover:text-white"
									}`}
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
								>
									{isActive && (
										<motion.div
											layoutId="billing-active"
											className="absolute inset-0 theme-gradient-bg rounded-lg sm:rounded-xl shadow-lg shadow-[var(--color-primary-500)] shadow-opacity-40"
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
											<motion.span
												className="text-[10px] sm:text-xs text-green-400 font-semibold mt-0.5 sm:mt-1"
												initial={{ opacity: 0, y: -5 }}
												animate={{ opacity: 1, y: 0 }}
												transition={{ delay: 0.2 }}
											>
												{t("save")} {cycle.discount}
											</motion.span>
										)}
									</span>
								</motion.button>
							);
						})}
					</div>
				</div>

				{/* Pricing Cards */}
				<AnimatePresence mode="wait">
					<motion.div
						key={billingCycle}
						className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-7xl mx-auto"
						variants={containerVariants}
						initial="hidden"
						animate="visible"
					>
						{plans.map((plan, index) => {
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
									key={plan.id}
									className={`relative group ${
										plan.popular ? "lg:-mt-4" : ""
									}`}
									variants={cardVariants}
									whileHover={{
										y: -8,
										transition: { duration: 0.3 },
									}}
								>
									{/* Popular Badge */}
									{plan.popular && (
										<motion.div
											className="absolute -top-3 sm:-top-4 ltr:left-1/2 rtl:right-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2 z-20"
											initial={{ y: -10, opacity: 0 }}
											animate={{ y: 0, opacity: 1 }}
											transition={{ delay: 0.5 }}
										>
											<div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 theme-gradient-bg rounded-full shadow-lg">
												<Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white fill-white" />
												<span className="text-white font-bold text-xs sm:text-sm uppercase">
													{t("mostPopular")}
												</span>
											</div>
										</motion.div>
									)}

									{/* Card */}
									<div
										className={`relative h-full bg-gradient-to-br from-slate-800 from-opacity-80 to-slate-900 to-opacity-80 backdrop-blur-xl rounded-[20px_20px_0_0]  p-6 sm:p-8 border-2 transition-all duration-300 ${
											plan.popular
												? "border-[var(--color-primary-500)] border-opacity-50 shadow-2xl shadow-[var(--color-primary-500)] shadow-opacity-30"
												: "border-slate-700 border-opacity-50 shadow-xl"
										}`}
									>
										{/* Animated Glow on Hover */}
										<motion.div
											className="absolute -inset-1 theme-gradient-bg rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-20 blur-2xl transition-opacity duration-300"
											aria-hidden="true"
										/>

										<div className="relative z-10">
											{/* Icon */}
											<motion.div
												className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 theme-gradient-bg rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl mb-4 sm:mb-6"
												whileHover={{
													rotate: [0, -10, 10, -10, 0],
													scale: 1.1,
												}}
												transition={{ duration: 0.5 }}
											>
												<Icon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
											</motion.div>

											{/* Plan Name */}
											<h3 className="text-2xl sm:text-3xl font-black text-white mb-2">
												{plan.name}
											</h3>
											<p className="text-gray-400 text-xs sm:text-sm mb-4 sm:mb-6">
												{plan.tagline}
											</p>

											{/* Price */}
											<div className="mb-6 sm:mb-8">
												<div className="flex items-baseline gap-2">
													<span className="text-4xl sm:text-5xl font-black text-white">
														${price}
													</span>
													<span className="text-gray-400 font-semibold text-sm sm:text-base">
														/{t("perMonth")}
													</span>
												</div>
												{billingCycle !== "month" && (
													<motion.p
														className="text-xs sm:text-sm text-gray-500 mt-2"
														initial={{ opacity: 0 }}
														animate={{ opacity: 1 }}
														transition={{ delay: 0.3 }}
													>
														${monthlyEquivalent}{" "}
														{billingCycle === "6months"
															? t("per6Months")
															: t("perYear")}
													</motion.p>
												)}
											</div>

											{/* CTA Button */}
											<motion.button
												className={`w-full py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base md:text-lg mb-6 sm:mb-8 transition-all ${
													plan.popular
														? "theme-gradient-bg text-white shadow-xl shadow-[var(--color-primary-500)] shadow-opacity-40 hover:shadow-2xl"
														: "bg-slate-700 bg-opacity-50 text-white border-2 border-slate-600 hover:border-slate-500 hover:bg-slate-700"
												}`}
												whileHover={{ scale: 1.02 }}
												whileTap={{ scale: 0.98 }}
											>
												{t("getStarted")}
											</motion.button>

											{/* Features */}
											<div className="space-y-3 sm:space-y-4">
												<p className="text-xs sm:text-sm text-gray-400 font-bold uppercase tracking-wide mb-3 sm:mb-4">
													{t("whatsIncluded")}
												</p>
												{plan.features.map((feature, idx) => (
													<motion.div
														key={idx}
														className="flex items-start gap-2 sm:gap-3"
														custom={idx}
														variants={featureVariants}
														initial="hidden"
														animate="visible"
													>
														<div className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full theme-gradient-bg flex items-center justify-center mt-0.5">
															<Check
																className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white"
																strokeWidth={3}
															/>
														</div>
														<span className="text-gray-300 text-xs sm:text-sm leading-relaxed">
															{feature}
														</span>
													</motion.div>
												))}
											</div>
										</div>

										{/* Bottom Accent Line */}
										<motion.div
											className="absolute bottom-0 ltr:left-0 rtl:right-0 ltr:right-0 rtl:left-0 h-1 theme-gradient-bg rounded-b-2xl sm:rounded-b-3xl origin-left rtl:origin-right"
											initial={{ scaleX: 0 }}
											whileInView={{ scaleX: 1 }}
											viewport={{ once: true }}
											transition={{ duration: 0.6, delay: 0.2 }}
										/>
									</div>
								</motion.div>
							);
						})}
					</motion.div>
				</AnimatePresence>
 
			</div>
		</section>
	);
}



