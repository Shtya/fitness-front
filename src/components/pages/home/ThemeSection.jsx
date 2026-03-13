"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
	Palette,
	Sparkles,
	Check,
	ChevronRight,
	Droplet,
	Zap,
	Sun,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme, COLOR_PALETTES } from "@/app/[locale]/theme";
import AOS from "aos";
import "aos/dist/aos.css";
import SectionHeader from "./SectionHeader";

// ─── Swatch bar ───────────────────────────────────────────────────────────────
function SwatchBar({ shades }) {
	return (
		<div className="flex h-5 w-full overflow-hidden rounded-md">
			{shades.map(({ color, label }) => (
				<div
					key={label}
					className="flex-1"
					style={{ backgroundColor: color }}
					title={label}
				/>
			))}
		</div>
	);
}

// ─── Theme card ───────────────────────────────────────────────────────────────
function ThemeCard({ themeKey, palette, isActive, onClick, index }) {
	return (
		<button
			id={`theme-card-${themeKey}`}
			onClick={onClick}

			aria-pressed={isActive}
			aria-label={`Select ${palette.name} theme`}
			className={[
				"group relative w-full overflow-hidden rounded-2xl border-2 text-left",
				"transition-all duration-300 focus:outline-none",
				"focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)] focus-visible:ring-offset-2",
				isActive
					? "border-[var(--color-primary-500)]/60 bg-slate-800/80 shadow-lg shadow-[var(--color-primary-500)]/10"
					: "border-white/[0.07] bg-slate-900/50 hover:border-white/15 hover:bg-slate-800/60",
			].join(" ")}
		>
			<div
				className="relative h-16 w-full overflow-hidden"
				style={{
					background: `linear-gradient(135deg, ${palette.gradient.from}, ${palette.gradient.via ?? palette.gradient.to}, ${palette.gradient.to})`,
				}}
			>
				<span
					className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-full"
					aria-hidden="true"
				/>
				{isActive && (
					<span className="absolute end-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow">
						<Check
							className="h-3 w-3"
							strokeWidth={3}
							style={{ color: palette.primary[600] }}
						/>
					</span>
				)}
			</div>

			<div className="px-3 py-2.5">
				<div className="mb-2 flex items-center justify-between">
					<span className="text-[12px] font-bold text-white">{palette.name}</span>
					<ChevronRight
						className={[
							"h-3 w-3 transition-all duration-200 rtl:-scale-x-100",
							isActive
								? "text-[var(--color-primary-400)]"
								: "text-white/20 group-hover:text-white/50",
						].join(" ")}
					/>
				</div>

				<div className="flex items-center gap-1" aria-hidden="true">
					{[
						palette.primary[600],
						palette.primary[400],
						palette.primary[200],
						palette.secondary[500],
						palette.secondary[300],
					].map((color, i) => (
						<span
							key={i}
							className="h-2.5 w-2.5 rounded-full ring-1 ring-black/20"
							style={{ backgroundColor: color }}
						/>
					))}
				</div>
			</div>
		</button>
	);
}

// ─── Preview panel ────────────────────────────────────────────────────────────
function PreviewPanel({ currentPalette, t }) {
	const [activeEl, setActiveEl] = useState(null);

	const demos = [
		{
			id: "button",
			Icon: Zap,
			label: t("preview.button"),
			desc: t("preview.buttonDesc"),
		},
		{
			id: "card",
			Icon: Droplet,
			label: t("preview.card"),
			desc: t("preview.cardDesc"),
		},
		{
			id: "badge",
			Icon: Sparkles,
			label: t("preview.badge"),
			desc: t("preview.badgeDesc"),
		},
	];

	const primaryShades = [900, 800, 700, 600, 500, 400, 300, 200, 100].map(
		(s) => ({ color: currentPalette.primary[s], label: `primary-${s}` })
	);

	const secondaryShades = [900, 800, 700, 600, 500, 400, 300, 200, 100].map(
		(s) => ({ color: currentPalette.secondary[s], label: `secondary-${s}` })
	);

	return (
		<div id="preview-panel" className="flex h-full flex-col gap-5">
			<div className="flex items-center gap-3">
				<div
					className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-md"
					style={{
						background: `linear-gradient(135deg, ${currentPalette.gradient.from}, ${currentPalette.gradient.to})`,
					}}
				>
					<Palette className="h-4 w-4 text-white" />
				</div>
				<div>
					<p className="text-sm font-bold text-white">{t("preview.heading")}</p>
					<p className="text-[11px] text-white/35">{t("preview.subheading")}</p>
				</div>
			</div>

			<div className="grid grid-cols-3 gap-2">
				{[
					{ label: "Primary", color: currentPalette.primary[500] },
					{ label: "Secondary", color: currentPalette.secondary[500] },
					{ label: "Gradient", color: currentPalette.gradient.from },
				].map(({ label, color }) => (
					<div
						key={label}
						className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-slate-800/50 px-2.5 py-2"
					>
						<span
							className="h-3 w-3 shrink-0 rounded-full"
							style={{ backgroundColor: color }}
						/>
						<span className="truncate text-[10px] font-semibold text-white/50">
							{label}
						</span>
					</div>
				))}
			</div>

			<div className="flex flex-col gap-2" role="list">
				{demos.map((el) => {
					const { Icon } = el;
					const open = activeEl === el.id;

					return (
						<div key={el.id} role="listitem">
							<button
								id={`demo-${el.id}`}
								onClick={() => setActiveEl(open ? null : el.id)}
								aria-expanded={open}
								className={[
									"relative w-full overflow-hidden rounded-xl border text-left transition-all duration-200",
									open
										? "border-white/15 bg-slate-800/70"
										: "border-white/[0.06] bg-slate-800/30 hover:border-white/10 hover:bg-slate-800/50",
								].join(" ")}
							>
								{open && (
									<span
										className="absolute bottom-0 start-0 top-0 w-[3px] rounded-s-xl"
										style={{
											background: `linear-gradient(180deg, ${currentPalette.gradient.from}, ${currentPalette.gradient.to})`,
										}}
										aria-hidden="true"
									/>
								)}

								<div className="flex items-center gap-3 px-3.5 py-3">
									<div
										className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
										style={{
											background: `linear-gradient(135deg, ${currentPalette.gradient.from}, ${currentPalette.gradient.to})`,
										}}
									>
										<Icon className="h-3.5 w-3.5 text-white" />
									</div>

									<div className="min-w-0 flex-1">
										<p className="text-[13px] font-bold text-white">{el.label}</p>
										<p className="text-[11px] text-white/35">{el.desc}</p>
									</div>

									<ChevronRight
										className={[
											"h-3.5 w-3.5 shrink-0 transition-transform duration-200 rtl:-scale-x-100",
											open
												? "rotate-90 text-[var(--color-primary-400)]"
												: "text-white/20",
										].join(" ")}
									/>
								</div>

								{open && (
									<div className="mx-3.5 mb-3.5 overflow-hidden rounded-lg border border-white/[0.06] bg-slate-950/50 p-3">
										{el.id === "button" && (
											<div className="flex flex-wrap gap-2">
												<button
													className="rounded-lg px-4 py-2 text-xs font-bold text-white transition-transform duration-150 hover:scale-105 active:scale-95"
													style={{
														background: `linear-gradient(135deg, ${currentPalette.gradient.from}, ${currentPalette.gradient.to})`,
													}}
												>
													{t("preview.sampleButton")}
												</button>
												<button
													className="rounded-lg border px-4 py-2 text-xs font-semibold transition-transform duration-150 hover:scale-105 active:scale-95"
													style={{
														borderColor: `${currentPalette.primary[500]}50`,
														color: currentPalette.primary[400],
														background: `${currentPalette.primary[500]}12`,
													}}
												>
													{t("preview.secondaryButton")}
												</button>
											</div>
										)}

										{el.id === "card" && (
											<div
												className="rounded-lg border p-3"
												style={{
													borderColor: `${currentPalette.primary[500]}20`,
													background: `linear-gradient(135deg, ${currentPalette.primary[500]}0e, ${currentPalette.secondary[500]}08)`,
												}}
											>
												<div className="flex items-center gap-3">
													<div
														className="h-8 w-8 shrink-0 rounded-lg"
														style={{
															background: `linear-gradient(135deg, ${currentPalette.gradient.from}, ${currentPalette.gradient.to})`,
														}}
													/>
													<div className="flex-1 space-y-1.5">
														<div
															className="h-2 w-3/5 rounded-full"
															style={{
																backgroundColor: `${currentPalette.primary[500]}35`,
															}}
														/>
														<div
															className="h-1.5 w-2/5 rounded-full"
															style={{
																backgroundColor: `${currentPalette.primary[500]}20`,
															}}
														/>
													</div>
												</div>
											</div>
										)}

										{el.id === "badge" && (
											<div className="flex flex-wrap gap-2">
												{[
													t("preview.badges.admin"),
													t("preview.badges.active"),
													t("preview.badges.featured"),
												].map((badge, bi) => (
													<span
														key={badge}
														className="rounded-full px-2.5 py-1 text-[11px] font-bold"
														style={{
															background: `${currentPalette.primary[500]}${["1e", "14", "0c"][bi]
																}`,
															color: currentPalette.primary[400],
															border: `1px solid ${currentPalette.primary[500]}30`,
														}}
													>
														{badge}
													</span>
												))}
											</div>
										)}
									</div>
								)}
							</button>
						</div>
					);
				})}
			</div>

			<div className="mt-auto space-y-2.5 border-t border-white/[0.06] pt-4">
				<div>
					<p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/25">
						{t("preview.scalePrimary")}
					</p>
					<SwatchBar shades={primaryShades} />
				</div>
				<div>
					<p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/25">
						{t("preview.scaleSecondary")}
					</p>
					<SwatchBar shades={secondaryShades} />
				</div>
			</div>
		</div>
	);
}

// ─── Main section ─────────────────────────────────────────────────────────────
export default function ThemeShowcaseSection() {
	const t = useTranslations("home.theme.themeShowcase");
	const { theme: currentTheme, setTheme, colors } = useTheme();
	const themeEntries = useMemo(() => Object.entries(COLOR_PALETTES), []);
	const currentPalette = colors;

	useEffect(() => {
		AOS.init({
			duration: 500,
			once: true,
			easing: "ease-out-cubic",
			offset: 40,
		});
	}, []);

	return (
		<section
			id="theme-showcase-section"
			aria-labelledby="theme-showcase-heading"
			className="relative overflow-hidden py-16 sm:py-20 lg:py-24"
		>
			<span
				className="pointer-events-none absolute -start-20 -top-20 h-72 w-72 rounded-full blur-[90px]"
				style={{
					background: `radial-gradient(circle, ${currentPalette.primary[400]}18, transparent)`,
				}}
				aria-hidden="true"
			/>
			<span
				className="pointer-events-none absolute -bottom-20 -end-20 h-72 w-72 rounded-full blur-[90px]"
				style={{
					background: `radial-gradient(circle, ${currentPalette.secondary[400]}14, transparent)`,
				}}
				aria-hidden="true"
			/>

			<div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-10">
				<SectionHeader
					id="theme-showcase-heading"
					badge={t("badge")}
					title={t("title")}
					subtitle={t("description")}
				/>

				<div id="theme-selector" data-aos="fade-right" data-aos-duration="600">
					<div className="mb-4 flex items-center justify-between">
						<p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/30">
							{t("selectorTitle")}
						</p>
						<div className="flex items-center gap-2">
							<span
								className="h-1.5 w-1.5 animate-pulse rounded-full"
								style={{ backgroundColor: currentPalette.primary[400] }}
								aria-hidden="true"
							/>
							<span className="text-[11px] font-semibold text-white/45">
								{currentPalette.name}
							</span>
						</div>
					</div>

					<div
						id="theme-cards-grid"
						className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
						data-aos="fade-up" 
					>
						{themeEntries.map(([key, palette], index) => (
							<ThemeCard
								key={key}
								themeKey={key}
								palette={palette}
								isActive={currentTheme === key}
								onClick={() => setTheme(key)}
								index={index}
							/>
						))}
					</div>

					<div
						className="mt-5 overflow-hidden rounded-2xl border border-white/[0.07]"
						data-aos="fade-up"
						data-aos-delay="200"
					>
						<div
							className="flex items-center gap-4 px-5 py-4"
							style={{
								background: `linear-gradient(135deg, ${currentPalette.primary[500]}12, ${currentPalette.secondary[500]}08)`,
							}}
						>
							<div
								className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
								style={{
									background: `linear-gradient(135deg, ${currentPalette.gradient.from}, ${currentPalette.gradient.to})`,
								}}
							>
								<Sun className="h-5 w-5 text-white" />
							</div>
							<div className="min-w-0 flex-1">
								<p className="text-sm font-bold text-white">{currentPalette.name}</p>
								<p className="text-[11px] text-white/40">{t("hint")}</p>
							</div>
							<div className="flex items-center gap-1.5" aria-hidden="true">
								{[
									currentPalette.primary[400],
									currentPalette.primary[300],
									currentPalette.secondary[400],
								].map((c, i) => (
									<span
										key={i}
										className="h-4 w-4 rounded-full ring-2 ring-black/20"
										style={{ backgroundColor: c }}
									/>
								))}
							</div>
						</div>
					</div>
				</div>

				{/* Optional preview panel usage */}
				{/* <PreviewPanel currentPalette={currentPalette} t={t} /> */}
			</div>
		</section>
	);
}