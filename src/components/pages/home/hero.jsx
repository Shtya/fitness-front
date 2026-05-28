"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
	ImageIcon,
	Video,
	Plus,
	Minus,
	Check,
	Play,
	Zap,
	User,
	ArrowRight,
	Timer,
	Users,
	Star,
} from "lucide-react";
import SectionHeader from "./SectionHeader";

// ─── Status Bar ───────────────────────────────────────────────────────────────
function StatusBar() {
	const [time, setTime] = useState("");

	useEffect(() => {
		const tick = () => {
			const n = new Date();
			setTime(
				`${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`
			);
		};
		tick();
		const id = setInterval(tick, 10000);
		return () => clearInterval(id);
	}, []);

	return (
		<div
			className="relative flex h-11 shrink-0 items-center justify-between bg-[#f5f5f7] px-[22px]"
			data-aos="fade-down"
			data-aos-delay="80"
			data-aos-duration="700"
		>
			<span className="text-[12px] font-bold tracking-tight text-[#1a1a1a]">{time}</span>
			<div className="absolute left-1/2 top-[10px] h-[30px] w-[120px] -translate-x-1/2 rounded-[20px] bg-black" />
			<div className="flex items-center gap-[5px]">
				<svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true">
					{[0, 1, 2, 3].map((i) => (
						<rect
							key={i}
							x={i * 4}
							y={12 - (3 + i * 3)}
							width={3}
							height={3 + i * 3}
							rx={0.8}
							fill={i < 3 ? "#1a1a1a" : "#c7c7cc"}
						/>
					))}
				</svg>
				<svg width="14" height="11" viewBox="0 0 14 11" aria-hidden="true">
					<circle cx="7" cy="9.5" r="1.5" fill="#1a1a1a" />
					<path
						d="M4.5 7a3.5 3.5 0 015 0"
						stroke="#1a1a1a"
						strokeWidth="1.2"
						strokeLinecap="round"
						fill="none"
					/>
					<path
						d="M2 4.5a6.5 6.5 0 0110 0"
						stroke="#1a1a1a"
						strokeWidth="1.2"
						strokeLinecap="round"
						fill="none"
					/>
					<path
						d="M0 2a9 9 0 0114 0"
						stroke="#c7c7cc"
						strokeWidth="1.2"
						strokeLinecap="round"
						fill="none"
					/>
				</svg>
				<svg width="24" height="11" viewBox="0 0 24 11" aria-hidden="true">
					<rect
						x="0.5"
						y="0.5"
						width="20"
						height="10"
						rx="3"
						stroke="#1a1a1a"
						strokeOpacity="0.35"
						fill="none"
					/>
					<rect x="2" y="2" width="14" height="7" rx="1.5" fill="#1a1a1a" />
					<path d="M22 3.5v4a2 2 0 000-4z" fill="#1a1a1a" fillOpacity="0.4" />
				</svg>
			</div>
		</div>
	);
}

// ─── Home Indicator ───────────────────────────────────────────────────────────
function HomeIndicator() {
	return (
		<div
			className="flex h-[30px] shrink-0 items-center justify-center bg-[#f5f5f7]"
			data-aos="fade-up"
			data-aos-delay="120"
			data-aos-duration="700"
		>
			<div className="h-1 w-[120px] rounded-full bg-black opacity-[0.18]" />
		</div>
	);
}

// ─── IPhone Mockup ────────────────────────────────────────────────────────────
function IPhoneMockup({ children }) {
	return (
		<div
			id="iphone-mockup"
			className="relative mx-auto w-full max-w-[280px] sm:max-w-[320px]"
			data-aos="zoom-in-up"
			data-aos-delay="140"
			data-aos-duration="1000"
			data-aos-easing="ease-out-cubic"
		>
			<div className="rounded-[44px] bg-gradient-to-br from-[#2a2a2c] via-[#1a1a1c] to-[#0f0f10] p-[9px] shadow-[0_0_0_0.5px_rgba(255,255,255,0.08),0_32px_80px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(0,0,0,0.4)]">
				{/* Side buttons */}
				<div className="absolute -left-[3px] top-[100px] h-7 w-[3px] rounded-l-sm bg-gradient-to-b from-[#333] to-[#222]" />
				<div className="absolute -left-[3px] top-[140px] h-11 w-[3px] rounded-l-sm bg-gradient-to-b from-[#333] to-[#222]" />
				<div className="absolute -left-[3px] top-[196px] h-11 w-[3px] rounded-l-sm bg-gradient-to-b from-[#333] to-[#222]" />
				<div className="absolute -right-[3px] top-[138px] h-16 w-[3px] rounded-r-sm bg-gradient-to-b from-[#333] to-[#222]" />
				<div className="flex h-[560px] flex-col overflow-hidden rounded-[36px] bg-[#f5f5f7] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.1)] sm:h-[620px]">
					{children}
				</div>
			</div>
		</div>
	);
}

// ─── App Header ───────────────────────────────────────────────────────────────
function AppHeader({ locale }) {
	const t = useTranslations("mobile.exercise");
	const isRTL = locale === "ar";
	const tabs = [t("tabs.exercises"), t("tabs.reps"), t("tabs.cardio")];
	const [active, setActive] = useState(1);

	return (
		<div
			id="app-header"
			dir={isRTL ? "rtl" : "ltr"}
			className="theme-gradient-bg shrink-0 px-4 pb-4 pt-[14px]"
			data-aos="fade-down"
			data-aos-delay="180"
			data-aos-duration="750"
		>
			<p
				className="mb-[10px] text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70"
				data-aos="fade-down"
				data-aos-delay="220"
				data-aos-duration="600"
			>
				{t("title")}
			</p>
			<div
				role="tablist"
				aria-label={t("title")}
				className="flex gap-1.5 rounded-[14px] bg-black/20 p-1"
				data-aos="fade-up"
				data-aos-delay="260"
				data-aos-duration="650"
			>
				{tabs.map((tab, i) => (
					<button
						key={i}
						role="tab"
						aria-selected={active === i}
						onClick={() => setActive(i)}
						className={[
							"flex-1 min-w-0 cursor-pointer rounded-[10px] py-2 text-[11px] font-bold tracking-[0.02em] transition-all duration-200 truncate px-1",
							active === i
								? "bg-white text-[var(--color-primary-600)] shadow-[0_2px_8px_rgba(0,0,0,0.18)]"
								: "bg-transparent text-white/70",
						].join(" ")}
						data-aos="zoom-in"
						data-aos-delay={300 + i * 70}
						data-aos-duration="550"
					>
						{tab}
					</button>
				))}
			</div>
		</div>
	);
}

// ─── Counter ─────────────────────────────────────────────────────────────────
function Counter({ value, onDec, onInc, unit = "" }) {
	return (
		<div className="flex items-center justify-center gap-1 rounded-[10px] bg-[#f0f0f2] px-1 py-1">
			<button
				onClick={onDec}
				aria-label="Decrease"
				className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12)] transition-transform active:scale-90"
			>
				<Minus size={11} className="text-[#555]" />
			</button>
			<span className="min-w-[28px] text-center text-[12px] font-extrabold text-[#1a1a1a] tabular-nums">
				{value}
				{unit}
			</span>
			<button
				onClick={onInc}
				aria-label="Increase"
				className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12)] transition-transform active:scale-90"
			>
				<Plus size={11} className="text-[#555]" />
			</button>
		</div>
	);
}

// ─── Exercise Card ────────────────────────────────────────────────────────────
function ExerciseCard({ locale }) {
	const t = useTranslations("mobile.exercise");
	const isRTL = locale === "ar";

	const [sets, setSets] = useState([
		{ done: false, weight: 60, reps: 8 },
		{ done: true, weight: 70, reps: 6 },
		{ done: false, weight: 75, reps: 5 },
	]);
	const [restTime, setRestTime] = useState(60);

	const toggle = (i) =>
		setSets((p) => p.map((s, idx) => (idx === i ? { ...s, done: !s.done } : s)));
	const update = (i, f, v) =>
		setSets((p) => p.map((s, idx) => (idx === i ? { ...s, [f]: v } : s)));

	return (
		<div
			id="exercise-card"
			className="overflow-hidden bg-white"
			data-aos="fade-up"
			data-aos-delay="240"
			data-aos-duration="850"
		>
			{/* Exercise banner */}
			<div
				className="relative flex h-[120px] items-center justify-center overflow-hidden bg-gradient-to-br from-[var(--color-primary-50)] to-[#ede9fe] sm:h-[140px]"
				data-aos="zoom-in"
				data-aos-delay="280"
				data-aos-duration="800"
			>
				<svg
					aria-hidden="true"
					className="absolute inset-0 h-full w-full opacity-[0.06]"
					viewBox="0 0 200 160"
				>
					{[...Array(8)].map((_, i) => (
						<circle
							key={i}
							cx={i * 30}
							cy={80}
							r={40 + i * 5}
							fill="none"
							stroke="var(--color-primary-600)"
							strokeWidth="1"
						/>
					))}
				</svg>
				<svg
					width="110"
					height="74"
					viewBox="0 0 120 80"
					fill="none"
					className="relative z-[1]"
					aria-hidden="true"
				>
					<rect x="20" y="36" width="80" height="8" rx="4" fill="var(--color-primary-400)" opacity="0.4" />
					<rect x="8" y="24" width="16" height="32" rx="6" fill="var(--color-primary-500)" />
					<rect x="4" y="30" width="8" height="20" rx="4" fill="var(--color-primary-700)" />
					<rect x="96" y="24" width="16" height="32" rx="6" fill="var(--color-primary-500)" />
					<rect x="108" y="30" width="8" height="20" rx="4" fill="var(--color-primary-700)" />
					<rect x="52" y="32" width="16" height="16" rx="3" fill="var(--color-primary-600)" />
				</svg>
				<div
					dir={isRTL ? "rtl" : "ltr"}
					className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white/95 to-transparent px-3 pb-2 pt-5"
					data-aos="fade-up"
					data-aos-delay="340"
					data-aos-duration="650"
				>
					<p className="text-[14px] font-extrabold md: leading-tight tracking-tight text-[#1a1a1a]">
						{t("exercise.name")}
					</p>
					<p className="text-[11px] font-semibold text-[var(--color-primary-500)]">
						{t("exercise.target")}
					</p>
				</div>
				<div
					className={`absolute top-[10px] flex gap-1.5 ${isRTL ? "left-[10px]" : "right-[10px]"}`}
					data-aos="fade-left"
					data-aos-delay="360"
					data-aos-duration="650"
				>
					{[ImageIcon, Video].map((Icon, i) => (
						<button
							key={i}
							aria-label={i === 0 ? "View image" : "Watch video"}
							className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-white/90 shadow-[0_2px_8px_rgba(0,0,0,0.12)] backdrop-blur-md transition-transform active:scale-90"
							data-aos="zoom-in"
							data-aos-delay={390 + i * 70}
							data-aos-duration="550"
						>
							<Icon size={13} className="text-[var(--color-primary-600)]" />
						</button>
					))}
				</div>
			</div>

			{/* Exercise controls */}
			<div
				dir={isRTL ? "rtl" : "ltr"}
				className="p-3"
				data-aos="fade-up"
				data-aos-delay="420"
				data-aos-duration="750"
			>
				{/* Action row */}
				<div
					className="mb-3 flex flex-wrap items-center justify-between gap-2"
					data-aos="fade-up"
					data-aos-delay="460"
					data-aos-duration="650"
				>
					<button className="theme-gradient-bg flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-bold text-white shadow-[0_4px_12px_rgba(99,102,241,0.3)] transition-transform active:scale-95">
						<Play size={11} fill="white" />
						{t("start")}
					</button>
					<div className="flex items-center gap-1 rounded-lg bg-[#f0f0f2] px-2 py-1.5">
						<Timer size={12} className="text-[#888] shrink-0" />
						<button
							onClick={() => setRestTime((r) => Math.max(15, r - 15))}
							aria-label="Decrease rest time"
							className="flex h-[20px] w-[20px] items-center justify-center rounded-lg bg-white"
						>
							<Minus size={10} className="text-[#555]" />
						</button>
						<span className="min-w-[34px] text-center text-[13px] font-extrabold text-[#1a1a1a] tabular-nums">
							{Math.floor(restTime / 60)}:{String(restTime % 60).padStart(2, "0")}
						</span>
						<button
							onClick={() => setRestTime((r) => r + 15)}
							aria-label="Increase rest time"
							className="flex h-[20px] w-[20px] items-center justify-center rounded-lg bg-white"
						>
							<Plus size={10} className="text-[#555]" />
						</button>
					</div>
				</div>

				{/* Sets table */}
				<div
					id="sets-table"
					className="mb-3 overflow-hidden rounded-lg border border-black/5 bg-[#f8f8fa]"
					data-aos="fade-up"
					data-aos-delay="520"
					data-aos-duration="700"
				>
					<div className="grid grid-cols-[32px_1fr_1fr] border-b border-black/[0.06] bg-[#f0f0f2] px-2 py-2">
						{[t("table.done"), t("table.weight"), t("table.reps")].map((h, i) => (
							<span
								key={i}
								className="text-center text-[9px] font-bold uppercase tracking-[0.08em] text-[#999]"
								data-aos="fade-down"
								data-aos-delay={560 + i * 60}
								data-aos-duration="500"
							>
								{h}
							</span>
						))}
					</div>
					{sets.map((set, i) => (
						<div
							key={i}
							className={[
								"grid grid-cols-[32px_1fr_1fr] items-center px-2 py-2 transition-colors duration-200",
								i < sets.length - 1 ? "border-b border-black/[0.04]" : "",
								set.done ? "bg-[var(--color-primary-50)]" : "bg-transparent",
							].join(" ")}
							data-aos="fade-up"
							data-aos-delay={620 + i * 90}
							data-aos-duration="600"
						>
							<div className="flex justify-center">
								<button
									onClick={() => toggle(i)}
									aria-label={set.done ? "Mark incomplete" : "Mark complete"}
									aria-pressed={set.done}
									className={[
										"flex h-5 w-5 items-center justify-center rounded-[6px] transition-all duration-200",
										set.done ? "theme-gradient-bg shadow-[0_2px_8px_rgba(99,102,241,0.35)]" : "bg-[#e0e0e6]",
									].join(" ")}
								>
									{set.done && <Check size={10} color="#fff" strokeWidth={3} />}
								</button>
							</div>
							<Counter
								value={set.weight}
								unit={locale === "ar" ? " كجم" : " kg"}
								onDec={() => update(i, "weight", Math.max(0, set.weight - 5))}
								onInc={() => update(i, "weight", set.weight + 5)}
							/>
							<Counter
								value={set.reps}
								onDec={() => update(i, "reps", Math.max(0, set.reps - 1))}
								onInc={() => update(i, "reps", set.reps + 1)}
							/>
						</div>
					))}
				</div>

				{/* Bottom buttons */}
				<div
					className="flex gap-2"
					data-aos="fade-up"
					data-aos-delay="760"
					data-aos-duration="650"
				>
					<button className="theme-gradient-bg flex-1 min-w-0 rounded-lg py-[9px] text-[12px] font-bold text-white shadow-[0_4px_12px_rgba(99,102,241,0.3)] transition-transform active:scale-[0.98]">
						{t("buttons.addSet")}
					</button>
					<button className="shrink-0 rounded-lg border border-[#e0e0e6] bg-white px-3 py-[9px] text-[12px] font-bold text-[#666] transition-transform active:scale-[0.98]">
						{t("buttons.save")}
					</button>
				</div>
			</div>
		</div>
	);
}

// ─── Phone Showcase ───────────────────────────────────────────────────────────
function PhoneShowcase({ locale }) {
	return (
		<div
			id="phone-showcase"
			className="relative w-full px-2 py-5 sm:px-6"
			data-aos="fade-up"
			data-aos-duration="900"
			data-aos-delay="180"
			data-aos-easing="ease-out-cubic"
		>
			{/* Radial glow */}
			<div
				aria-hidden="true"
				className="absolute -inset-5 z-0 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.2),transparent_70%)] blur-[32px] pointer-events-none"
			/>
			{/* Orbiting rings — desktop only */}
			<div
				aria-hidden="true"
				className="absolute left-1/2 top-1/2 hidden h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(99,102,241,0.15)] animate-[spin_22s_linear_infinite] lg:block"
			/>
			<div
				aria-hidden="true"
				className="absolute left-1/2 top-1/2 hidden h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(139,92,246,0.1)] animate-[spin_28s_linear_infinite_reverse] lg:block"
			/>
			<div
				aria-hidden="true"
				className="absolute left-1/2 top-1/2 hidden h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(168,85,247,0.07)] animate-[spin_35s_linear_infinite] lg:block"
			/>

			<div className="relative z-[1] animate-[float_6s_ease-in-out_infinite]">
				<IPhoneMockup>
					<StatusBar />
					<div className="flex-1 overflow-y-auto overscroll-contain">
						<AppHeader locale={locale} />
						<ExerciseCard locale={locale} />
					</div>
					<HomeIndicator />
				</IPhoneMockup>
			</div>
		</div>
	);
}

// ─── Trust Strip ──────────────────────────────────────────────────────────────

const AVATARS = [
  "from-violet-400 to-violet-600",
  "from-indigo-400 to-indigo-600",
  "from-pink-400 to-rose-600",
  "from-sky-400 to-blue-600",
  "from-emerald-400 to-teal-600",
];
 
function AvatarStack() {
  return (
    <div className="flex items-center" aria-label="Active community members">
      {AVATARS.map((gradient, i) => (
        <div
          key={i}
          style={{ zIndex: 50 - i * 10, marginLeft: i === 0 ? 0 : "-8px" }}
          className={`flex h-8 w-8 items-center justify-center rounded-full border-[2.5px] border-slate-900 bg-gradient-to-br ${gradient} shadow-[0_2px_8px_rgba(0,0,0,0.4)] transition-transform duration-200 hover:scale-110 hover:z-50`}
        >
          <User size={11} color="#fff" strokeWidth={2.5} />
        </div>
      ))}
      <div
        style={{ marginLeft: "-8px", zIndex: 0 }}
        className="flex h-8 w-8 items-center justify-center rounded-full border-[2.5px] border-slate-900 bg-slate-800 text-[9px] font-black text-white/60"
      >
        50K+
      </div>
    </div>
  );
}
 
export function TrustStrip({ t }) {
  return (
    <div
      id="trust-strip"
      data-aos="fade-up"
      data-aos-duration="700"
      data-aos-delay="400"
      className="w-full max-lg:!hidden"
    >
      {/* Outer glow ring */}
      <div className="relative rounded-2xl p-px bg-gradient-to-r from-[var(--color-primary-500)]/30 via-white/[0.08] to-[var(--color-secondary-500)]/20 shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
        <div className="relative overflow-hidden rounded-2xl bg-slate-900/90 backdrop-blur-xl">
 
          {/* Subtle inner shimmer */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-[var(--color-primary-500)]/[0.04]" />
 
          <div className="relative flex items-stretch">
 
            {/* ── Active Users ── */}
            <div
              className="group relative min-w-0 flex-1 cursor-default px-5 py-5 transition-colors duration-200 hover:bg-white/[0.03]"
              data-aos="fade-up"
              data-aos-delay="460"
              data-aos-duration="600"
            >
              <div className="flex items-baseline gap-1.5">
                <p className="text-2xl font-black md: leading-none tracking-tight text-white sm:text-3xl">
                  150
                </p>
                <span className="text-sm font-black text-[var(--color-primary-400)]">+</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <Users size={10} className="shrink-0 text-white/30" />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35 sm:text-[11px]">
                  {t("trust.activeUsers")}
                </p>
              </div>
              {/* Bottom accent line on hover */}
              <span className="absolute bottom-0 left-4 right-4 h-px scale-x-0 rounded-full bg-gradient-to-r from-transparent via-[var(--color-primary-400)]/60 to-transparent transition-transform duration-300 group-hover:scale-x-100" />
            </div>
 
            {/* Divider */}
            <div className="my-4 w-px bg-white/[0.07]" />
 
            {/* ── Rating ── */}
            <div
              className="group relative min-w-0 flex-1 cursor-default px-5 py-5 transition-colors duration-200 hover:bg-white/[0.03]"
              data-aos="fade-up"
              data-aos-delay="530"
              data-aos-duration="600"
            >
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black md: leading-none tracking-tight text-white sm:text-3xl">
                  4.9
                </p>
                <div className="flex -mt-0.5 gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={9}
                      className={i < 5 ? "fill-amber-400 text-amber-400" : "fill-white/20 text-white/20"}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-white/35 sm:text-[11px]">
                  {t("trust.rating")}
                </span>
              </div>
              <span className="absolute bottom-0 left-4 right-4 h-px scale-x-0 rounded-full bg-gradient-to-r from-transparent via-amber-400/50 to-transparent transition-transform duration-300 group-hover:scale-x-100" />
            </div>
 
            {/* Divider */}
            <div className="my-4 w-px bg-white/[0.07]" />
 
            {/* ── Community ── */}
            <div
              className="group relative shrink-0 cursor-default px-5 py-5 transition-colors duration-200 hover:bg-white/[0.03]"
              data-aos="fade-left"
              data-aos-delay="600"
              data-aos-duration="650"
            >
              <AvatarStack />
              <div className="mt-2 flex items-center gap-1.5">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.8)] animate-pulse" />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35 sm:text-[11px]">
                  {t("trust.community", { defaultValue: "Active Now" })}
                </p>
              </div>
              <span className="absolute bottom-0 left-4 right-4 h-px scale-x-0 rounded-full bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent transition-transform duration-300 group-hover:scale-x-100" />
            </div>
 
          </div>
        </div>
      </div>
    </div>
  );
}
 

// ─── CTA Buttons ──────────────────────────────────────────────────────────────
function CTAButtons({ t, isRTL }) {
	return (
		<div
			id="cta-buttons"
			data-aos="fade-up"
			data-aos-duration="600"
			data-aos-delay="280"
			className=" max-lg:hidden mb-7 flex flex-wrap items-center gap-3 justify-center "
		>
			<a href="#contact-section"
				className="theme-gradient-bg group relative flex items-center gap-2 overflow-hidden rounded-[14px] px-5 py-3 text-sm font-bold text-white shadow-[0_6px_20px_rgba(99,102,241,0.4)] transition-all duration-150 hover:-translate-y-px active:scale-[0.97] sm:px-7 sm:py-[14px] sm:text-[15px]"
				data-aos="zoom-in-right"
				data-aos-delay="320"
				data-aos-duration="650"
			>
				<span
					aria-hidden="true"
					className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 pointer-events-none group-hover:translate-x-full"
				/>
				<Zap size={16} fill="white" className="relative z-[1] shrink-0" />
				<span className="relative z-[1]">{t("cta.getStarted")}</span>
				<ArrowRight
					size={15}
					className={`relative z-[1] shrink-0 ${isRTL ? "rotate-180" : ""}`}
				/>
			</a>

			{/* <button
				className="flex items-center gap-2 rounded-[14px] border border-white/[0.12] bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white/80 backdrop-blur-lg transition-all duration-150 hover:border-white/[0.22] hover:bg-white/[0.1] active:scale-[0.97] sm:px-6 sm:py-[14px] sm:text-[15px]"
				data-aos="zoom-in-left"
				data-aos-delay="390"
				data-aos-duration="650"
			>
				<Play size={14} className="shrink-0" />
				{t("cta.watchDemo")}
			</button> */}
		</div>
	);
}

// ─── Main Export ─────────────────────────────────────────────────────────────
export default function ResponsiveHero() {
	const t = useTranslations("home.hero");
	const locale = useLocale();
	const isRTL = locale === "ar";

	return (
		<section
			id="hero"
			dir={isRTL ? "rtl" : "ltr"}
			aria-label="Hero section"
			className="relative flex min-h-screen flex-col overflow-hidden pt-20"
		>
			{/* Background glows — will-change for GPU compositing */}
			<div
				aria-hidden="true"
				className={[
					"absolute top-[5%] z-0 h-[240px] w-[240px] rounded-full blur-[80px] pointer-events-none will-change-transform",
					"bg-[radial-gradient(circle,var(--color-primary-500)_0%,transparent_70%)]",
					"animate-[pulseGlow_7s_ease-in-out_infinite]",
					"sm:h-[400px] sm:w-[400px] lg:h-[500px] lg:w-[500px]",
					isRTL ? "left-[5%]" : "right-[5%]",
				].join(" ")}
			/>
			<div
				aria-hidden="true"
				className={[
					"absolute bottom-0 z-0 h-[200px] w-[200px] rounded-full blur-[70px] pointer-events-none will-change-transform",
					"bg-[radial-gradient(circle,var(--color-secondary-500)_0%,transparent_70%)]",
					"animate-[pulseGlow_9s_ease-in-out_infinite_2s]",
					"sm:h-[320px] sm:w-[320px] lg:h-[400px] lg:w-[400px]",
					isRTL ? "right-[10%]" : "left-[10%]",
				].join(" ")}
			/>

			{/* Main grid */}
			<div className="relative z-[1] mx-auto flex w-full max-w-[1440px] flex-1 items-center px-4 py-10 pb-16 sm:px-6 sm:pb-20 lg:px-16">
				<div className="grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-16">
					{/* ── Left / Text Column ── */}
					<div
						id="hero-text-col"
						className="min-w-0 w-full"
						data-aos="fade-right"
						data-aos-delay="40"
						data-aos-duration="850"
					>
						{/* <HeroHeading t={t} isRTL={isRTL} /> */}

						<SectionHeader
							id="steps-heading"
							badge={t("badge")}
							title={t("title")}
							subtitle={t("description")}
						/>
 
						<div
							data-aos="fade-up"
							data-aos-duration="800"
							data-aos-delay="200"
							className="mb-7 block lg:hidden"
						>
							<div className="relative mx-auto max-w-[300px] sm:max-w-[380px]">
								<PhoneShowcase locale={locale} />
							</div>
						</div>

						{/* CTA buttons */}
						{/* <CTAButtons t={t} isRTL={isRTL} /> */}

						{/* Trust strip */}
						<TrustStrip t={t} />
					</div>

					{/* ── Right / Phone Column (desktop only) ── */}
					<div
						id="hero-phone-col"
						className="relative hidden min-h-[600px] items-center justify-center lg:flex"
						data-aos="fade-left"
						data-aos-delay="160"
						data-aos-duration="950"
					>
						<PhoneShowcase locale={locale} />
					</div>
				</div>
			</div>

			<style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-14px); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.28; transform: scale(1.15); }
        }
        @keyframes spin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>
		</section>
	);
}