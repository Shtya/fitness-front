"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
	Award,
	BarChart3,
	Bell,
	BookOpen,
	Calendar,
	ClipboardList,
	CreditCard,
	Dumbbell,
	FileText,
	Heart,
	LayoutDashboard,
	MessageSquare,
	Settings,
	Shield,
	TrendingUp,
	Users,
	Utensils,
	Video,
} from "lucide-react";

const ROLE_IDS = ["client", "coach", "admin"];

const FEATURE_ICONS = {
	client: {
		workouts: Dumbbell,
		nutrition: Utensils,
		exercises: Video,
		progress: TrendingUp,
		reports: Heart,
		chat: MessageSquare,
		reminders: Bell,
		recipes: BookOpen,
	},
	coach: {
		clients: Users,
		workoutPlans: ClipboardList,
		nutritionPlans: Utensils,
		reports: Calendar,
		exerciseLibrary: Award,
		chat: MessageSquare,
		forms: FileText,
		sharedTools: Settings,
	},
	admin: {
		dashboard: LayoutDashboard,
		users: Users,
		billing: CreditCard,
		plans: Dumbbell,
		forms: ClipboardList,
		reports: BarChart3,
		content: BookOpen,
		operations: Shield,
	},
};

const FEATURE_KEYS = {
	client: ["workouts", "nutrition", "exercises", "progress", "reports", "chat", "reminders", "recipes"],
	coach: ["clients", "workoutPlans", "nutritionPlans", "reports", "exerciseLibrary", "chat", "forms", "sharedTools"],
	admin: ["dashboard", "users", "billing", "plans", "forms", "reports", "content", "operations"],
};

function displayFont(locale) {
	return locale === "ar"
		? "var(--font-arabic), sans-serif"
		: "var(--font-space-grotesk), var(--font-open-sans), sans-serif";
}

export default function RoleTabsFinal() {
	const [activeTab, setActiveTab] = useState("client");
	const t = useTranslations("home.roles");
	const locale = useLocale();
	const font = displayFont(locale);
	const keys = FEATURE_KEYS[activeTab];

	return (
		<section
			id="role-tabs-section"
			aria-labelledby="role-tabs-heading"
			className="px-5 py-20 sm:px-8 sm:py-28 lg:px-12"
			style={{ background: "linear-gradient(160deg, var(--color-primary-700), var(--color-primary-500) 55%, var(--color-secondary-500))" }}
		>
			<div className="mx-auto max-w-[1180px]">
				<div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
					<div className="lg:col-span-4">
						<p className="text-[12px] font-semibold text-white/35 ltr:uppercase ltr:tracking-[0.18em]">{t("badge")}</p>
						<h2
							id="role-tabs-heading"
							className="mt-4 text-[clamp(2rem,4vw,3.25rem)] leading-[1.02] text-white ltr:tracking-[-0.04em]"
							style={{ fontFamily: font }}
						>
							{t("title")}
						</h2>
						<p className="mt-4 text-[15px] leading-relaxed text-white/52">{t("description")}</p>

						<div role="tablist" aria-label={t("badge")} className="mt-8 grid grid-cols-3 gap-2">
							{ROLE_IDS.map((id) => {
								const on = activeTab === id;
								const Icon = id === "client" ? Dumbbell : id === "coach" ? Users : Shield;
								return (
									<button
										key={id}
										type="button"
										role="tab"
										id={`role-tab-${id}`}
										aria-selected={on}
										aria-controls={`role-panel-${id}`}
										onClick={() => setActiveTab(id)}
										className={[
											"flex min-h-[88px] flex-col items-start justify-between rounded-2xl border px-3 py-3 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-300)]",
											on ? "border-transparent bg-white text-[#12110f]" : "border-white/25 bg-white/15 text-white hover:bg-white/25",
										].join(" ")}
									>
										<Icon className="h-5 w-5" aria-hidden="true" />
										<span className="text-[14px] font-semibold">{t(`tabs.${id}`)}</span>
									</button>
								);
							})}
						</div>
					</div>

					<div
						id={`role-panel-${activeTab}`}
						role="tabpanel"
						aria-labelledby={`role-tab-${activeTab}`}
						className="lg:col-span-8 lg:pt-16"
					>
						<p
							className="text-[1.35rem] leading-snug text-white sm:text-[1.6rem] ltr:tracking-[-0.03em]"
							style={{ fontFamily: font }}
						>
							{t(`${activeTab}.cta.title`)}
						</p>
						<p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/50">
							{t(`${activeTab}.cta.description`)}
						</p>

						<ul className="mt-8 grid gap-3 sm:grid-cols-2">
							{keys.map((key) => {
								const Icon = FEATURE_ICONS[activeTab][key];
								return (
									<li key={key} className="rounded-2xl bg-white p-4 text-[#1c1916] shadow-[0_16px_40px_rgba(0,0,0,0.12)]">
										<span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-500)] text-white">
											<Icon className="h-5 w-5" aria-hidden="true" />
										</span>
										<h3 className="text-[15px] font-semibold">{t(`${activeTab}.features.${key}.title`)}</h3>
										<p className="mt-1.5 text-[13px] leading-relaxed text-[#5c5348]">
											{t(`${activeTab}.features.${key}.description`)}
										</p>
									</li>
								);
							})}
						</ul>

						<Link
							href="/auth"
							className="mt-8 inline-flex rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-[#1c1916] no-underline"
						>
							{t(`${activeTab}.cta.button`)}
						</Link>
					</div>
				</div>
			</div>
		</section>
	);
}
