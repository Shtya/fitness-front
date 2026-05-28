"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
	User,
	Dumbbell,
	Shield,
	Calendar,
	TrendingUp,
	Heart,
	Users,
	ClipboardList,
	BarChart3,
	Settings,
	Award,
	Target,
	Activity,
	MessageSquare,
	FileText,
	Lock,
	Zap,
	Trophy,
	Video,
	BookOpen,
	DollarSign,
	UserCheck,
	Bell,
	Database,
	CheckCircle2,
	ArrowRight,
	Sparkles,
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
				offset: 60,
				delay: 0,
			});
		});
	}, []);
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RoleTabsFinal() {
	const [activeTab, setActiveTab] = useState("client");
	const [prevTab, setPrevTab] = useState(null);
	const [animating, setAnimating] = useState(false);
	const t = useTranslations("home.roles");
	useAOS();

	const tabs = [
		{ id: "client", label: t("tabs.client"), icon: User },
		{ id: "coach", label: t("tabs.coach"), icon: Dumbbell },
		{ id: "admin", label: t("tabs.admin"), icon: Shield },
	];

	const features = {
		client: [
			{
				icon: Calendar,
				title: t("client.features.workouts.title"),
				description: t("client.features.workouts.description"),
				badge: t("client.features.workouts.badge"),
			},
			{
				icon: Activity,
				title: t("client.features.nutrition.title"),
				description: t("client.features.nutrition.description"),
				badge: t("client.features.nutrition.badge"),
			},
			{
				icon: Video,
				title: t("client.features.exercises.title"),
				description: t("client.features.exercises.description"),
				badge: t("client.features.exercises.badge"),
			},
			{
				icon: TrendingUp,
				title: t("client.features.progress.title"),
				description: t("client.features.progress.description"),
				badge: t("client.features.progress.badge"),
			},
			{
				icon: Heart,
				title: t("client.features.reports.title"),
				description: t("client.features.reports.description"),
				badge: t("client.features.reports.badge"),
			},
			{
				icon: MessageSquare,
				title: t("client.features.chat.title"),
				description: t("client.features.chat.description"),
				badge: t("client.features.chat.badge"),
			},
			{
				icon: Target,
				title: t("client.features.reminders.title"),
				description: t("client.features.reminders.description"),
				badge: t("client.features.reminders.badge"),
			},
			{
				icon: BookOpen,
				title: t("client.features.recipes.title"),
				description: t("client.features.recipes.description"),
				badge: t("client.features.recipes.badge"),
			},
		],
		coach: [
			{
				icon: Users,
				title: t("coach.features.clients.title"),
				description: t("coach.features.clients.description"),
				badge: t("coach.features.clients.badge"),
			},
			{
				icon: ClipboardList,
				title: t("coach.features.workoutPlans.title"),
				description: t("coach.features.workoutPlans.description"),
				badge: t("coach.features.workoutPlans.badge"),
			},
			{
				icon: BarChart3,
				title: t("coach.features.nutritionPlans.title"),
				description: t("coach.features.nutritionPlans.description"),
				badge: t("coach.features.nutritionPlans.badge"),
			},
			{
				icon: Calendar,
				title: t("coach.features.reports.title"),
				description: t("coach.features.reports.description"),
				badge: t("coach.features.reports.badge"),
			},
			{
				icon: Award,
				title: t("coach.features.exerciseLibrary.title"),
				description: t("coach.features.exerciseLibrary.description"),
				badge: t("coach.features.exerciseLibrary.badge"),
			},
			{
				icon: MessageSquare,
				title: t("coach.features.chat.title"),
				description: t("coach.features.chat.description"),
				badge: t("coach.features.chat.badge"),
			},
			{
				icon: FileText,
				title: t("coach.features.forms.title"),
				description: t("coach.features.forms.description"),
				badge: t("coach.features.forms.badge"),
			},
			{
				icon: DollarSign,
				title: t("coach.features.sharedTools.title"),
				description: t("coach.features.sharedTools.description"),
				badge: t("coach.features.sharedTools.badge"),
			},
		],
		admin: [
			{
				icon: Database,
				title: t("admin.features.dashboard.title"),
				description: t("admin.features.dashboard.description"),
				badge: t("admin.features.dashboard.badge"),
			},
			{
				icon: UserCheck,
				title: t("admin.features.users.title"),
				description: t("admin.features.users.description"),
				badge: t("admin.features.users.badge"),
			},
			{
				icon: BarChart3,
				title: t("admin.features.billing.title"),
				description: t("admin.features.billing.description"),
				badge: t("admin.features.billing.badge"),
			},
			{
				icon: Settings,
				title: t("admin.features.plans.title"),
				description: t("admin.features.plans.description"),
				badge: t("admin.features.plans.badge"),
			},
			{
				icon: Lock,
				title: t("admin.features.forms.title"),
				description: t("admin.features.forms.description"),
				badge: t("admin.features.forms.badge"),
			},
			{
				icon: Bell,
				title: t("admin.features.reports.title"),
				description: t("admin.features.reports.description"),
				badge: t("admin.features.reports.badge"),
			},
			{
				icon: Trophy,
				title: t("admin.features.content.title"),
				description: t("admin.features.content.description"),
				badge: t("admin.features.content.badge"),
			},
			{
				icon: Zap,
				title: t("admin.features.operations.title"),
				description: t("admin.features.operations.description"),
				badge: t("admin.features.operations.badge"),
			},
		],
	};

	function handleTabChange(id) {
		if (id === activeTab || animating) return;
		setAnimating(true);
		setPrevTab(activeTab);
		setTimeout(() => {
			setActiveTab(id);
			setAnimating(false);
		}, 180);
	}
 
	return (
		<section
			id="role-tabs-section"
			aria-label="Platform roles and features"
			className="relative overflow-hidden py-16 md:py-24 lg:py-32"
		>
			{/* ── Background decorations ── */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 overflow-hidden"
			>
				{/* Primary glow */}
				<div
					className="absolute top-10 h-72 w-72 rounded-full
            bg-[var(--color-primary-500)] opacity-10 blur-3xl
            ltr:right-10 rtl:left-10
            md:top-20 md:h-[28rem] md:w-[28rem]
            ltr:md:right-20 rtl:md:left-20
            animate-[pulse_4s_ease-in-out_infinite]"
				/>
			 
				 
			</div>

			{/* ── Content ── */}
			<div
				id="role-tabs-inner"
				className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-16"
			>
				{/* ── Section header ── */}

				<SectionHeader id="role-tabs-header" badge={t("badge")} title={t("title")} subtitle={t("description")} />
 
				<nav
					id="role-tabs-nav"
					aria-label="Role selector"
					className="mb-8 flex justify-center px-4 md:mb-12"
					data-aos="fade-up"
					data-aos-delay="100"
					data-aos-duration="600"
				>
					<div
						role="tablist"
						className="grid w-full max-w-lg grid-cols-3 gap-1 rounded-xl bg-white/[0.04] p-1.5 ring-1 ring-white/[0.08] backdrop-blur-xl sm:gap-1.5 sm:max-w-xl"
					>
						{tabs.map((tab) => {
							const Icon = tab.icon;
							const isActive = activeTab === tab.id;

							return (
								<button
									key={tab.id}
									role="tab"
									id={`role-tab-${tab.id}`}
									aria-selected={isActive}
									aria-controls={`role-panel-${tab.id}`}
									onClick={() => handleTabChange(tab.id)}
									className={[
										"relative cursor-pointer rounded-[10px] px-3 py-2.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)] sm:px-4 sm:py-3",
										isActive
											? "bg-gradient-to-r from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)] shadow-[0_0_18px_rgba(99,102,241,0.35)]"
											: "hover:bg-white/[0.06]",
									].join(" ")}
								>
									<span
										className={[
											"relative z-10 flex items-center justify-center gap-2 font-body text-sm font-bold transition-colors duration-200 sm:text-base",
											isActive
												? "text-white"
												: "text-white/40 hover:text-white/70",
										].join(" ")}
									>
										<Icon
											aria-hidden="true"
											className={[
												"h-4 w-4 shrink-0 transition-transform duration-200 sm:h-5 sm:w-5",
												isActive ? "scale-110" : "",
											].join(" ")}
										/>
										<span className="hidden sm:inline">{tab.label}</span>
									</span>
								</button>
							);
						})}
					</div>
				</nav>

				{/* ── Feature grid ── */}
				<div
					id={`role-panel-${activeTab}`}
					role="tabpanel"
					aria-labelledby={`role-tab-${activeTab}`}
					className={[
						"grid grid-cols-1 gap-4 transition-opacity duration-200 sm:grid-cols-2 md:gap-5 lg:grid-cols-4",
						animating ? "opacity-0" : "opacity-100",
					].join(" ")}
				>
					{features[activeTab].map((feature, index) => (
						<FeatureCard
							key={`${activeTab}-${index}`}
							feature={feature}
							index={index}
							t={t}
						/>
					))}
				</div>

			</div>
		</section>
	);
}

// ─── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({ feature, index, t }) {
	const Icon = feature.icon;
	const delay = (index % 4) * 80;

	return (
		<article
			id={`feature-card-${index}`}
			className="group relative h-full"
			data-aos="fade-up"
			data-aos-delay={delay}
			data-aos-duration="550"
		>
			{/* Hover glow */}
			<div
				aria-hidden="true"
				className="absolute -inset-px -z-10 rounded-xl bg-gradient-to-br from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)] opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-20"
			/>

			<div
				className="relative flex h-full flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.2)] backdrop-blur-sm transition-all duration-300 group-hover:-translate-y-1.5 group-hover:border-[var(--color-primary-500)]/30 group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)] md:p-6"
			>
				{/* Shimmer */}
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent transition-transform duration-700 group-hover:translate-x-full"
				/>

				<div className="relative flex h-full flex-col gap-4">
					{/* Icon + Badge row */}
					<div className="flex items-start justify-between gap-3">
						{/* Icon box */}
						<div
							className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)] shadow-lg transition-transform duration-300 group-hover:scale-105 md:h-14 md:w-14"
							aria-hidden="true"
						>
							<Icon className="h-6 w-6 text-white md:h-7 md:w-7" />
						</div>

						{/* Badge */}
						<span className="mt-0.5 shrink-0 rounded-full border border-[var(--color-primary-500)]/25 bg-[var(--color-primary-500)]/[0.12] px-2.5 py-1 font-body text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-primary-300)]">
							{feature.badge}
						</span>
					</div>

					{/* Text */}
					<div className="flex flex-1 flex-col gap-1.5">
						<h3 className="font-body text-base font-black md: leading-snug text-white transition-colors duration-200 group-hover:text-[var(--color-primary-200)] md:text-lg">
							{feature.title}
						</h3>
						<p className="font-body text-xs md: leading-relaxed text-white/40 transition-colors duration-200 group-hover:text-white/60 md:text-sm">
							{feature.description}
						</p>
					</div>

					{/* Footer */}
					<div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
						<div className="flex items-center gap-1.5">
							<CheckCircle2
								aria-hidden="true"
								className="h-4 w-4 shrink-0 text-emerald-400"
							/>
							<span className="font-body text-[10px] font-bold uppercase tracking-[0.1em] text-white/35">
								{t("included")}
							</span>
						</div>

						<span
							aria-hidden="true"
							className="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
						>
							<ArrowRight className="h-4 w-4 text-[var(--color-primary-400)] rtl:rotate-180" />
						</span>
					</div>
				</div>

				{/* Bottom accent bar */}
				<div
					aria-hidden="true"
					className="absolute bottom-0 left-0 right-0 h-[3px] origin-left scale-x-0 rounded-b-xl bg-gradient-to-r from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)] transition-transform duration-300 group-hover:scale-x-100 rtl:origin-right"
				/>
			</div>
		</article>
	);
}
