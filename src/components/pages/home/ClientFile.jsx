"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Check, Minus, Plus, Camera, MessageCircle, Utensils } from "lucide-react";
import { ExerciseBanner, MealBanner, ReportBanner } from "./FileArt";

const STAGE_IDS = ["intake", "review", "account", "plans", "assignment", "followup"];

function displayFont(locale) {
	return locale === "ar"
		? "var(--font-arabic), sans-serif"
		: "var(--font-space-grotesk), var(--font-open-sans), sans-serif";
}

function PaperRow({ label, value, mark }) {
	return (
		<div className="flex items-baseline justify-between gap-4 border-b border-[#e6dfd2] py-3 last:border-b-0">
			<span className="text-[13px] text-[#6d655c]">{label}</span>
			<span className="text-end text-[14px] font-semibold text-[#1c1916]">
				{mark ? (
					<span className="inline-flex items-center gap-2">
						<span
							className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-primary-500)]"
							aria-hidden="true"
						/>
						{value}
					</span>
				) : (
					value
				)}
			</span>
		</div>
	);
}

function CheckLine({ text, done }) {
	return (
		<li className="flex items-start gap-3 border-b border-[#e6dfd2] py-3 last:border-b-0">
			<span
				aria-hidden="true"
				className={[
					"mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border",
					done
						? "border-[var(--color-primary-600)] bg-[var(--color-primary-600)] text-white"
						: "border-[#cfc6b8] bg-transparent",
				].join(" ")}
			>
				{done ? <Check size={10} strokeWidth={3} /> : null}
			</span>
			<span className={["text-[14px] leading-snug", done ? "text-[#1c1916]" : "text-[#5c554c]"].join(" ")}>
				{text}
			</span>
		</li>
	);
}

function SetLogger({ locale }) {
	const t = useTranslations("mobile.exercise");
	const [sets, setSets] = useState([
		{ done: true, weight: 60, reps: 8 },
		{ done: true, weight: 70, reps: 6 },
		{ done: false, weight: 75, reps: 5 },
	]);
	const [rest, setRest] = useState(60);

	const toggle = (i) =>
		setSets((prev) => prev.map((set, idx) => (idx === i ? { ...set, done: !set.done } : set)));
	const update = (i, field, value) =>
		setSets((prev) => prev.map((set, idx) => (idx === i ? { ...set, [field]: value } : set)));

	const unit = locale === "ar" ? " كجم" : " kg";

	return (
		<div>
			<ExerciseBanner title={t("exercise.name")} subtitle={t("exercise.target")} />
			<div className="mb-4 flex items-end justify-between gap-3">
				<div>
					<p className="text-[15px] font-semibold text-[#1c1916]">{t("exercise.name")}</p>
					<p className="mt-0.5 text-[12px] text-[var(--color-primary-700)]">{t("exercise.target")}</p>
				</div>
				<div className="flex items-center gap-1 text-[#6d655c]">
					<button
						type="button"
						onClick={() => setRest((value) => Math.max(15, value - 15))}
						className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-[#efeae1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)]"
						aria-label="−15"
					>
						<Minus size={12} />
					</button>
					<span className="min-w-[2.6rem] text-center text-[12px] tabular-nums">
						{Math.floor(rest / 60)}:{String(rest % 60).padStart(2, "0")}
					</span>
					<button
						type="button"
						onClick={() => setRest((value) => value + 15)}
						className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-[#efeae1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)]"
						aria-label="+15"
					>
						<Plus size={12} />
					</button>
				</div>
			</div>

			<div className="mb-2 grid grid-cols-[36px_1fr_1fr] px-1 text-[11px] font-semibold text-[#5c564e] ltr:uppercase ltr:tracking-[0.12em]">
				<span className="text-center">{t("table.done")}</span>
				<span className="text-center">{t("table.weight")}</span>
				<span className="text-center">{t("table.reps")}</span>
			</div>

			<ul className="space-y-1.5">
				{sets.map((set, i) => (
					<li
						key={i}
						className={[
							"grid grid-cols-[36px_1fr_1fr] items-center rounded-md px-1 py-1.5",
							set.done ? "bg-[var(--color-primary-50)]" : "bg-[#efeae1]",
						].join(" ")}
					>
						<div className="flex justify-center">
							<button
								type="button"
								aria-pressed={set.done}
								aria-label={set.done ? t("table.done") : t("table.done")}
								onClick={() => toggle(i)}
								className={[
									"flex h-8 w-8 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)]",
									set.done ? "bg-[var(--color-primary-600)] text-white" : "bg-white text-transparent",
								].join(" ")}
							>
								<Check size={14} strokeWidth={3} />
							</button>
						</div>
						<Stepper
							value={`${set.weight}${unit}`}
							decLabel={t("table.weight")}
							onDec={() => update(i, "weight", Math.max(0, set.weight - 5))}
							onInc={() => update(i, "weight", set.weight + 5)}
						/>
						<Stepper
							value={set.reps}
							decLabel={t("table.reps")}
							onDec={() => update(i, "reps", Math.max(0, set.reps - 1))}
							onInc={() => update(i, "reps", set.reps + 1)}
						/>
					</li>
				))}
			</ul>

			<div className="mt-4 flex justify-end">
				<button
					type="button"
					className="rounded-md bg-[var(--color-primary-600)] px-4 py-2 text-[13px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-700)] focus-visible:ring-offset-2"
				>
					{t("buttons.save")}
				</button>
			</div>
		</div>
	);
}

function Stepper({ value, onDec, onInc, decLabel }) {
	return (
		<div className="flex items-center justify-center gap-1">
			<button
				type="button"
				aria-label={decLabel}
				onClick={onDec}
				className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-[#3a342c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)]"
			>
				<Minus size={12} />
			</button>
			<span className="min-w-[3.2rem] text-center text-[13px] font-semibold tabular-nums text-[#1c1916]">
				{value}
			</span>
			<button
				type="button"
				aria-label={decLabel}
				onClick={onInc}
				className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-[#3a342c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)]"
			>
				<Plus size={12} />
			</button>
		</div>
	);
}

function StageBody({ stage }) {
	const tHow = useTranslations("home.howItWorks");
	const tSteps = useTranslations("home.steps");
	const tRoles = useTranslations("home.roles");
	const tNav = useTranslations("home.navbar");
	const tPeople = useTranslations("home.testimonials");
	const tDash = useTranslations("clientDashboard");
	const tExercise = useTranslations("mobile.exercise");

	if (stage === "intake") {
		return (
			<div className="grid grid-cols-3 gap-2">
				{[0, 1, 2].map((i) => (
					<div key={i} className="rounded-lg bg-[#efeae1] px-2 py-3">
						<span className="mb-2 block h-1.5 w-8 rounded-full bg-[var(--color-primary-500)]" />
						<span className="block text-[11px] leading-snug text-[#3a342c]">{tHow(`steps.0.features.${i}`)}</span>
					</div>
				))}
			</div>
		);
	}

	if (stage === "review") {
		return (
			<div>
				<p className="mb-4 text-[14px] leading-relaxed text-[#4a453e]">{tSteps("steps.review.description")}</p>
				<ul>
					<CheckLine done text={tHow("steps.0.features.0")} />
					<CheckLine done text={tHow("steps.0.features.1")} />
					<CheckLine done={false} text={tHow("steps.0.features.2")} />
				</ul>
			</div>
		);
	}

	if (stage === "account") {
		const people = [
			{ role: tNav("roles.client"), name: tPeople("items.0.name"), tone: "bg-[var(--color-primary-600)]" },
			{ role: tDash("hero.coachLabel"), name: tPeople("items.1.name"), tone: "bg-[#1c1916]" },
		];
		return (
			<div className="grid grid-cols-2 gap-3">
				{people.map((person) => (
					<div key={person.role} className="rounded-xl bg-[#efeae1] p-3">
						<div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full text-[15px] font-semibold text-white ${person.tone}`}>
							{person.name.slice(0, 1)}
						</div>
						<p className="text-[12px] text-[#6d655c]">{person.role}</p>
						<p className="text-[16px] font-semibold text-[#1c1916]">{person.name}</p>
					</div>
				))}
			</div>
		);
	}

	if (stage === "plans") {
		return (
			<div className="grid gap-3">
				<div className="flex items-center gap-3 rounded-xl bg-[#efeae1] p-3">
					<span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--color-primary-600)] text-white">
						<DumbbellMark />
					</span>
					<div>
						<p className="text-[12px] text-[#6d655c]">{tDash("plans.exercisePlan")}</p>
						<p className="font-semibold text-[#1c1916]">{tExercise("exercise.name")}</p>
					</div>
				</div>
				<div className="flex items-center gap-3 rounded-xl bg-[#efeae1] p-3">
					<span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#1c1916] text-white">
						<Utensils size={18} />
					</span>
					<div>
						<p className="text-[12px] text-[#6d655c]">{tDash("plans.mealPlan")}</p>
						<p className="font-semibold text-[#1c1916]">{tRoles("client.features.nutrition.title")}</p>
					</div>
				</div>
			</div>
		);
	}

	if (stage === "followup") {
		return (
			<div>
				<ReportBanner title={tDash("hero.weeklyReport")} subtitle={tRoles("client.features.reports.title")} />
				<div className="grid grid-cols-3 gap-2">
					{[
						{ icon: Camera, label: tRoles("client.features.reports.badge") },
						{ icon: MessageCircle, label: tRoles("client.features.chat.badge") },
						{ icon: Utensils, label: tRoles("client.features.nutrition.badge") },
					].map(({ icon: Icon, label }) => (
						<div key={label} className="rounded-lg bg-[#efeae1] px-2 py-3 text-center">
							<Icon className="mx-auto mb-2 h-4 w-4 text-[var(--color-primary-700)]" />
							<p className="text-[11px] font-semibold leading-snug text-[#1c1916]">{label}</p>
						</div>
					))}
				</div>
			</div>
		);
	}

	return null;
}

function DumbbellMark() {
	return (
		<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
			<rect x="2" y="9" width="3" height="6" rx="1" />
			<rect x="6" y="7" width="3" height="10" rx="1" />
			<rect x="15" y="7" width="3" height="10" rx="1" />
			<rect x="19" y="9" width="3" height="6" rx="1" />
			<rect x="9" y="11" width="6" height="2" rx="1" />
		</svg>
	);
}

function SceneBody({ scene, locale }) {
	const tRoles = useTranslations("home.roles");
	const tDash = useTranslations("clientDashboard");
	if (scene === "meals") {
		return (
			<div>
				<MealBanner title={tRoles("client.features.nutrition.title")} subtitle={tRoles("client.features.recipes.title")} />
				<ul>
					<CheckLine done text={tRoles("client.features.nutrition.title")} />
					<CheckLine done text={tRoles("client.features.recipes.title")} />
					<CheckLine done={false} text={tDash("nutrition.adherence")} />
				</ul>
			</div>
		);
	}
	if (scene === "report") {
		return (
			<div>
				<ReportBanner title={tDash("hero.weeklyReport")} subtitle={tRoles("client.features.reports.title")} />
				<ul>
					<CheckLine done text={tRoles("client.features.reports.title")} />
					<CheckLine done text={tRoles("client.features.progress.title")} />
					<CheckLine done={false} text={tRoles("client.features.chat.title")} />
				</ul>
			</div>
		);
	}
	return <SetLogger locale={locale} />;
}

export default function ClientFile({ stage = "assignment", scene, headline, showIndex = true, footerNote }) {
	const locale = useLocale();
	const reduced = useReducedMotion();
	const tSteps = useTranslations("home.steps");
	const tPeople = useTranslations("home.testimonials");
	const tNav = useTranslations("home.navbar");
	const tDash = useTranslations("clientDashboard");
	const font = displayFont(locale);
	const index = Math.max(0, STAGE_IDS.indexOf(stage));
	const title = headline || tSteps(`steps.${stage}.title`);

	return (
		<article
			aria-label={title}
			className="relative overflow-hidden rounded-[18px] bg-white text-[#1c1916] shadow-[0_24px_70px_rgba(28,25,22,0.16)] ring-1 ring-black/5"
		>
			<div
				aria-hidden="true"
				className="h-[3px] w-full"
				style={{
					background:
						"linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-to))",
				}}
			/>
			<header className="flex items-start justify-between gap-4 px-5 pb-4 pt-5 sm:px-6">
				<div className="min-w-0">
					<p className="text-[11px] font-semibold text-[#5c564e] ltr:uppercase ltr:tracking-[0.16em]">
						{tPeople("items.0.name")}
						<span className="px-1.5 text-[#c9c0b3]">/</span>
						{tNav("roles.client")}
					</p>
					<h3
						className="mt-1 text-[1.35rem] leading-tight text-[#1c1916] sm:text-[1.6rem]"
						style={{ fontFamily: font }}
					>
						{title}
					</h3>
				</div>
				{showIndex ? (
					<p className="shrink-0 pt-1 text-[12px] tabular-nums text-[#6a6258]">
						{String(index + 1).padStart(2, "0")}
						<span className="text-[#c9c0b3]"> / 06</span>
					</p>
				) : null}
			</header>

			<div className="px-5 pb-5 sm:px-6 sm:pb-6">
				<AnimatePresence mode="wait" initial={false}>
					<motion.div
						key={scene || stage}
						initial={reduced ? false : { opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={reduced ? undefined : { opacity: 0, y: -6 }}
						transition={{ duration: reduced ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
					>
						{scene ? <SceneBody scene={scene} locale={locale} /> : stage === "assignment" ? <SetLogger locale={locale} /> : <StageBody stage={stage} />}
					</motion.div>
				</AnimatePresence>
			</div>

			<footer className="flex items-center justify-between gap-3 border-t border-[#e6dfd2] px-5 py-3 text-[12px] text-[#6d655c] sm:px-6">
				<span>
					{tDash("hero.coachLabel")} · {tPeople("items.1.name")}
				</span>
				<span className="text-[#6a6258]">{footerNote || tDash("hero.weeklyReport")}</span>
			</footer>
		</article>
	);
}

export { STAGE_IDS };
