"use client";

import { useTranslations } from "next-intl";
import {
	Target,
	Calendar,
	TrendingUp,
	Sparkles,
	Rocket,
	CheckCircle2,
	User,
	Activity,
	Clock,
	Dumbbell,
	BarChart3,
	Trophy,
	Award,
} from "lucide-react";
import { useTheme } from "@/app/[locale]/theme";
import SectionHeader from "./SectionHeader";

export default function HowItWorks() {
	const t = useTranslations("home.howItWorks");
	const { colors } = useTheme();

	const steps = [
		{
			number: "01",
			icon: Target,
			title: t("steps.0.title"),
			description: t("steps.0.description"),
			features: [
				{ icon: User, text: t("steps.0.features.0") },
				{ icon: Target, text: t("steps.0.features.1") },
				{ icon: Activity, text: t("steps.0.features.2") },
			],
		},
		{
			number: "02",
			icon: Calendar,
			title: t("steps.1.title"),
			description: t("steps.1.description"),
			features: [
				{ icon: Calendar, text: t("steps.1.features.0") },
				{ icon: Clock, text: t("steps.1.features.1") },
				{ icon: Dumbbell, text: t("steps.1.features.2") },
			],
		},
		{
			number: "03",
			icon: TrendingUp,
			title: t("steps.2.title"),
			description: t("steps.2.description"),
			features: [
				{ icon: BarChart3, text: t("steps.2.features.0") },
				{ icon: TrendingUp, text: t("steps.2.features.1") },
				{ icon: Trophy, text: t("steps.2.features.2") },
			],
		},
	];

	return (
		<section
			id="how-it-works-section"
			aria-labelledby="how-it-works-heading"
			className="relative overflow-hidden py-16 sm:py-20 lg:py-24"
		>
			{/* Subtle ambient blobs — static, no animation */}
			<span
				className="pointer-events-none absolute -end-24 top-0 h-80 w-80 rounded-full blur-[100px]"
				style={{ background: `radial-gradient(circle, ${colors.primary[500]}18, transparent)` }}
				aria-hidden="true"
			/>
			<span
				className="pointer-events-none absolute -start-24 bottom-0 h-80 w-80 rounded-full blur-[100px]"
				style={{ background: `radial-gradient(circle, ${colors.secondary[500]}15, transparent)` }}
				aria-hidden="true"
			/>

			<div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-10">

				{/* ── Header ── */}
				<SectionHeader id="how-it-works-header" badge={t("badge")} title={t("title")} subtitle={t("description")} />
				 

				<div
					id="how-it-works-steps"
					className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6"
				>
					{steps.map((step, index) => {
						const Icon = step.icon;

						return (
							<article
								key={index}
								id={`step-${step.number}`}
								data-aos="fade-up"
								data-aos-delay={index * 80}
								data-aos-duration="550"
								className="relative flex h-full flex-col overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.04] p-5 group-hover:border-[var(--color-primary-500)]/30 group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)] md:p-6 group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900/60 backdrop-blur-xl transition-shadow duration-300 hover:shadow-lg"
								style={{
									boxShadow: `0 0 0 0 transparent`,
								}}
							>
								<div
									className="theme-gradient-bg absolute -inset-[1px] -z-10 rounded-lg opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-20"
								/>

								<div
									className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent transition-transform duration-700 group-hover:translate-x-full"
								/>


								<div className="flex flex-1 flex-col p-5 sm:p-6">
									{/* Number + Icon row */}
									<div className="mb-5 flex items-center justify-between">
										<span
											className="text-5xl font-black md: leading-none tabular-nums"
											style={{
												color: `${colors.primary[500]}30`,
												fontVariantNumeric: "tabular-nums",
											}}
											aria-hidden="true"
										>
											{step.number}
										</span>

										<div
											className="flex h-11 w-11 items-center justify-center rounded-xl shadow-md"
											style={{
												background: `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.to})`,
											}}
										>
											<Icon className="h-5 w-5 text-white" strokeWidth={2} />
										</div>
									</div>

									{/* Title + description */}
									<h3 className="mb-2 text-base font-bold md: leading-snug text-white sm:text-[17px]">
										{step.title}
									</h3>

									<p className="mb-5 text-[13px] md: leading-relaxed text-white/45">
										{step.description}
									</p>

									{/* Feature list — always visible */}
									<ul
										className="mt-auto space-y-2 border-t border-white/[0.07] pt-4"
										aria-label={`${step.title} features`}
									>
										{step.features.map((feat, idx) => {
											const FeatIcon = feat.icon;
											return (
												<li
													key={idx}
													data-aos="fade-left"
													data-aos-delay={index * 80 + idx * 50 + 200}
													className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors duration-150 hover:bg-white/[0.04]"
												>




													<span
														className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
														style={{
															background: `linear-gradient(135deg, ${colors.primary[500]}22, ${colors.secondary[500]}18)`,
														}}
													>
														<FeatIcon
															className="h-3.5 w-3.5"
															style={{ color: colors.primary[400] }}
															strokeWidth={2.5}
														/>
													</span>

													<span className="flex-1 text-[12px] font-medium md: leading-snug text-white/65">
														{feat.text}
													</span>

													<CheckCircle2
														className="h-3.5 w-3.5 shrink-0"
														style={{ color: `${colors.primary[400]}70` }}
													/>
												</li>
											);
										})}
									</ul>
								</div>
							</article>
						);
					})}
				</div>
 

			</div>
		</section>
	);
}