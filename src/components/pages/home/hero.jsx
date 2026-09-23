"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Camera, Check, Dumbbell, Minus, Plus, Utensils } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SCENE_PHOTOS } from "./FileArt";

function displayFont(locale) {
	return locale === "ar"
		? "var(--font-arabic), sans-serif"
		: "var(--font-space-grotesk), var(--font-open-sans), sans-serif";
}

const SCENES = [
	{ id: "workout", icon: Dumbbell, labelKey: "client.features.workouts" },
	{ id: "meals", icon: Utensils, labelKey: "client.features.nutrition" },
	{ id: "report", icon: Camera, labelKey: "client.features.reports" },
];

function Phone({ scene, locale }) {
	const t = useTranslations("mobile.exercise");
	const tRoles = useTranslations("home.roles");
	const tDash = useTranslations("clientDashboard");
	const [sets, setSets] = useState([
		{ done: true, weight: 60, reps: 8 },
		{ done: true, weight: 70, reps: 6 },
		{ done: false, weight: 75, reps: 5 },
	]);
	const unit = locale === "ar" ? "كجم" : "kg";
	const photo = SCENE_PHOTOS[scene] || SCENE_PHOTOS.workout;

	return (
		<div className="relative mx-auto w-full max-w-[340px]">
			<div className="rounded-[2.4rem] bg-[#161616] p-2.5 shadow-[0_40px_80px_rgba(0,0,0,0.45)] ring-1 ring-white/20">
				<div className="overflow-hidden rounded-[1.9rem] bg-white">
					<div className="relative h-[210px]">
						<img src={photo} alt="" className="h-full w-full object-cover" />
						<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/20" />
						<div className="absolute start-4 top-4 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
							{t("title")}
						</div>
						<div className="absolute inset-x-4 bottom-4 text-white">
							<p className="text-[18px] font-semibold leading-tight">
								{scene === "meals"
									? tRoles("client.features.nutrition.title")
									: scene === "report"
										? tDash("hero.weeklyReport")
										: t("exercise.name")}
							</p>
							<p className="mt-1 text-[12px] text-white/80">
								{scene === "workout" ? t("exercise.target") : tRoles(`client.features.${scene === "meals" ? "nutrition" : "reports"}.badge`)}
							</p>
						</div>
					</div>

					<div className="p-3.5">
						{scene === "workout" ? (
							<ul className="space-y-2">
								{sets.map((set, i) => (
									<li key={i} className="flex items-center gap-2 rounded-xl bg-[#f4f4f5] px-2 py-2">
										<button
											type="button"
											aria-pressed={set.done}
											onClick={() =>
												setSets((prev) => prev.map((row, idx) => (idx === i ? { ...row, done: !row.done } : row)))
											}
											className={[
												"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
												set.done ? "bg-[var(--color-primary-600)] text-white" : "bg-white text-transparent",
											].join(" ")}
										>
											<Check size={16} strokeWidth={3} />
										</button>
										<div className="flex flex-1 items-center justify-between gap-1">
											<button
												type="button"
												aria-label={t("table.weight")}
												onClick={() =>
													setSets((prev) =>
														prev.map((row, idx) => (idx === i ? { ...row, weight: Math.max(0, row.weight - 5) } : row))
													)
												}
												className="flex h-8 w-8 items-center justify-center rounded-lg bg-white"
											>
												<Minus size={14} />
											</button>
											<span className="text-[13px] font-semibold tabular-nums text-[#161616]">
												{set.weight} {unit}
											</span>
											<button
												type="button"
												aria-label={t("table.weight")}
												onClick={() =>
													setSets((prev) => prev.map((row, idx) => (idx === i ? { ...row, weight: row.weight + 5 } : row)))
												}
												className="flex h-8 w-8 items-center justify-center rounded-lg bg-white"
											>
												<Plus size={14} />
											</button>
										</div>
										<span className="w-12 text-center text-[13px] font-semibold tabular-nums text-[#161616]">
											{set.reps}
										</span>
									</li>
								))}
							</ul>
						) : (
							<ul className="space-y-2">
								{(scene === "meals"
									? ["nutrition", "recipes", "progress"]
									: ["reports", "progress", "chat"]
								).map((key) => (
									<li key={key} className="flex items-center gap-3 rounded-xl bg-[#f4f4f5] px-3 py-3">
										<span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary-600)] text-white">
											{key === "nutrition" || key === "recipes" ? <Utensils size={16} /> : key === "chat" ? <Camera size={16} /> : <Dumbbell size={16} />}
										</span>
										<span className="text-[13px] font-semibold text-[#161616]">{tRoles(`client.features.${key}.title`)}</span>
									</li>
								))}
							</ul>
						)}
						<button
							type="button"
							className="mt-3 w-full rounded-xl bg-[var(--color-primary-600)] py-2.5 text-[13px] font-semibold text-white"
						>
							{t("buttons.save")}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function ResponsiveHero() {
	const [scene, setScene] = useState("workout");
	const t = useTranslations("home.hero");
	const tHow = useTranslations("home.howItWorks");
	const tRoles = useTranslations("home.roles");
	const locale = useLocale();
	const reduced = useReducedMotion();
	const font = displayFont(locale);
	const photo = SCENE_PHOTOS[scene];

	return (
		<section id="hero" aria-labelledby="hero-title" className="relative min-h-[100svh] overflow-hidden">
			<AnimatePresence mode="sync">
				<motion.img
					key={photo}
					src={photo}
					alt=""
					className="absolute inset-0 h-full w-full object-cover"
					initial={reduced ? false : { opacity: 0, scale: 1.04 }}
					animate={{ opacity: 1, scale: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: reduced ? 0 : 0.6 }}
				/>
			</AnimatePresence>
			<div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/45 to-black/75 lg:bg-gradient-to-r lg:from-black/80 lg:via-black/50 lg:to-black/25" />

			<div className="relative mx-auto flex min-h-[100svh] max-w-[1180px] flex-col justify-end gap-10 px-5 pb-12 pt-28 sm:px-8 lg:grid lg:grid-cols-12 lg:items-center lg:px-12 lg:pb-16 lg:pt-24">
				<div className="lg:col-span-6">
					<p className="text-[12px] font-semibold text-white/80 ltr:uppercase ltr:tracking-[0.18em]">{t("badge")}</p>
					<h1
						id="hero-title"
						className="mt-4 max-w-[12ch] text-[clamp(2.8rem,6vw,5.4rem)] leading-[0.92] text-white ltr:tracking-[-0.045em] rtl:max-w-none"
						style={{ fontFamily: font }}
					>
						{t("title")}
					</h1>
					<p className="mt-5 max-w-md text-[1.05rem] leading-relaxed text-white/80">{t("description")}</p>

					<div className="mt-7 flex flex-wrap gap-2" role="tablist">
						{SCENES.map((item) => {
							const Icon = item.icon;
							const on = scene === item.id;
							return (
								<button
									key={item.id}
									type="button"
									role="tab"
									aria-selected={on}
									onClick={() => setScene(item.id)}
									className={[
										"inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
										on ? "bg-white text-[#161616]" : "bg-white/15 text-white hover:bg-white/25",
									].join(" ")}
								>
									<Icon className="h-4 w-4" aria-hidden="true" />
									{tRoles(`${item.labelKey}.title`)}
								</button>
							);
						})}
					</div>

					<div className="mt-8 flex flex-wrap items-center gap-5">
						<Link
							href="/auth"
							className="inline-flex h-12 items-center rounded-full bg-white px-6 text-[14px] font-semibold text-[#161616]"
						>
							{t("cta.getStarted")}
						</Link>
						<a href="#how-it-works-section" className="text-[14px] font-semibold text-white underline decoration-white/40 underline-offset-4">
							{tHow("title")}
						</a>
					</div>
				</div>

				<div className="lg:col-span-6 lg:flex lg:justify-end">
					<Phone scene={scene} locale={locale} />
				</div>
			</div>
		</section>
	);
}
