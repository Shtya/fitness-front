"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
	Target,
	Calendar,
	TrendingUp,
	Sparkles,
	ArrowRight,
	CheckCircle2,
	Zap,
	Award,
	Activity,
	Clock,
	BarChart3,
	Heart,
	User,
	Dumbbell,
	Trophy,
	Rocket,
} from "lucide-react";
import { useTheme } from "@/app/[locale]/theme";

const PARTICLE_DATA = Array.from({ length: 18 }, (_, i) => ({
	left: `${(i * 37 + 11) % 100}%`,
	top: `${(i * 53 + 7) % 100}%`,
	dur: 4 + (i % 3),
	del: (i * 0.3) % 3,
	dx: ((i % 7) - 3) * 6,
	even: i % 2 === 0,
}));

const POSITIONS = [
	{ top: "5%", left: "5%" },
	{ top: "5%", right: "5%" },
	{ bottom: "5%", left: "15%" },
];

export default function HowItWorks() {
	const [hoveredStep, setHoveredStep] = useState(null);
	const [activeStep, setActiveStep] = useState(null);
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
			illustration: {
				primary: Target,
				secondary: [CheckCircle2, Heart, Zap],
			},
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
			illustration: {
				primary: Calendar,
				secondary: [Clock, Dumbbell, CheckCircle2],
			},
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
			illustration: {
				primary: TrendingUp,
				secondary: [BarChart3, Award, Trophy],
			},
		},
	];

	return (
		<section className="relative overflow-hidden py-20 sm:py-24 md:py-28 lg:py-32">
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<motion.div
					className="absolute top-20 h-[500px] w-[500px] rounded-full blur-3xl ltr:right-20 rtl:left-20"
					style={{
						background: `radial-gradient(circle, ${colors.primary[400]}, transparent)`,
					}}
					animate={{
						scale: [1, 1.3, 1],
						opacity: [0.18, 0.32, 0.18],
						x: [0, 40, 0],
						y: [0, 25, 0],
					}}
					transition={{ duration: 10, repeat: Infinity }}
				/>

				<motion.div
					className="absolute bottom-20 h-[500px] w-[500px] rounded-full blur-3xl ltr:left-20 rtl:right-20"
					style={{
						background: `radial-gradient(circle, ${colors.secondary[400]}, transparent)`,
					}}
					animate={{
						scale: [1.3, 1, 1.3],
						opacity: [0.3, 0.16, 0.3],
						x: [0, -40, 0],
						y: [0, -25, 0],
					}}
					transition={{ duration: 12, repeat: Infinity, delay: 1 }}
				/>

				<motion.div
					className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
					style={{
						background: `radial-gradient(circle, ${colors.primary[300]}, transparent)`,
					}}
					animate={{
						scale: [1, 1.4, 1],
						opacity: [0.12, 0.22, 0.12],
						rotate: [0, 180, 360],
					}}
					transition={{ duration: 15, repeat: Infinity, delay: 2 }}
				/>

				{PARTICLE_DATA.map((p, i) => (
					<motion.div
						key={i}
						className="absolute h-1.5 w-1.5 rounded-full"
						style={{
							background: p.even ? colors.primary[400] : colors.secondary[400],
							left: p.left,
							top: p.top,
						}}
						animate={{
							y: [0, -28, 0],
							x: [0, p.dx, 0],
							opacity: [0, 0.6, 0],
							scale: [0, 1.4, 0],
						}}
						transition={{
							duration: p.dur,
							repeat: Infinity,
							delay: p.del,
							ease: "easeInOut",
						}}
					/>
				))}

				<div
					className="absolute inset-0 opacity-[0.025]
          bg-[linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)]
          bg-[size:50px_50px]
          [mask-image:radial-gradient(ellipse_at_50%_50%,black_30%,transparent_80%)]"
				/>
			</div>

			<div className="relative z-10 mx-auto max-w-[1440px] px-6 lg:px-16">
				<motion.div
					className="mb-16 text-center md:mb-24"
					initial={{ opacity: 0, y: -28 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
				>
					<motion.div
						className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-[var(--color-primary-500)]/30 bg-[var(--color-primary-500)]/[0.08] px-5 py-2.5 backdrop-blur-xl"
						animate={{ y: [0, -4, 0] }}
						transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
					>
						<motion.div
							animate={{ rotate: 360, scale: [1, 1.25, 1] }}
							transition={{
								rotate: { duration: 18, repeat: Infinity, ease: "linear" },
								scale: { duration: 2, repeat: Infinity },
							}}
						>
							<Sparkles className="h-4 w-4 text-[var(--color-primary-400)]" />
						</motion.div>

						<span className="font-body text-sm font-black uppercase tracking-[0.14em] text-[var(--color-primary-300)]">
							{t("badge")}
						</span>
					</motion.div>

					<h2 className="font-display mb-6 px-4 text-5xl leading-none tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
						<span className="theme-gradient-text">{t("title")}</span>
					</h2>

					<p className="font-body mx-auto max-w-3xl px-4 text-lg leading-relaxed text-white/60 md:text-xl">
						{t("description")}
					</p>
				</motion.div>

				<div className="mx-auto mb-16 grid max-w-6xl gap-6 md:grid-cols-3 lg:gap-10">
					{steps.map((step, index) => {
						const Icon = step.icon;
						const PrimaryIllustration = step.illustration.primary;
						const isHovered = hoveredStep === index;
						const isActive = activeStep === index;
						const lit = isHovered || isActive;

						return (
							<motion.div
								key={index}
								className="relative"
								initial={{ opacity: 0, y: 36 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{
									delay: index * 0.14,
									duration: 0.65,
									ease: [0.22, 1, 0.36, 1],
								}}
								onMouseEnter={() => setHoveredStep(index)}
								onMouseLeave={() => setHoveredStep(null)}
								onClick={() => setActiveStep(lit && isActive ? null : index)}
							>
								{index < steps.length - 1 && (
									<div className="absolute top-32 z-0 hidden h-px w-full ltr:left-full ltr:-translate-x-4 rtl:right-full rtl:translate-x-4 md:block">
										<motion.div
											className="h-px w-full"
											style={{
												background: `linear-gradient(to right, ${colors.primary[500]}, ${colors.secondary[500]})`,
												opacity: 0.25,
											}}
											initial={{ scaleX: 0 }}
											whileInView={{ scaleX: 1 }}
											viewport={{ once: true }}
											transition={{ delay: 0.8 + index * 0.2, duration: 0.7 }}
										/>

										<motion.div
											className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
											initial={{ opacity: 0, scale: 0 }}
											whileInView={{ opacity: 1, scale: 1 }}
											viewport={{ once: true }}
											transition={{ delay: 1.2 + index * 0.2, type: "spring" }}
										>
											<motion.div
												className="theme-gradient-bg flex h-9 w-9 items-center justify-center rounded-lg shadow-xl"
												animate={{ rotate: 360 }}
												transition={{
													duration: 4,
													repeat: Infinity,
													ease: "linear",
												}}
											>
												<ArrowRight
													className="h-4 w-4 text-white rtl:scale-x-[-1]"
													strokeWidth={2.5}
												/>
											</motion.div>
										</motion.div>
									</div>
								)}

								<motion.div
									className="group relative cursor-pointer overflow-hidden rounded-lg border-2 bg-slate-800/40 p-7 backdrop-blur-2xl transition-colors duration-300"
									style={{
										borderColor: lit
											? colors.primary[500]
											: `${colors.primary[500]}18`,
										boxShadow: lit
											? `0 28px 56px -10px ${colors.primary[500]}35, 0 0 0 1px ${colors.primary[500]}20`
											: "0 8px 24px -4px rgba(0,0,0,0.35)",
									}}
									whileHover={{ y: -8, scale: 1.015 }}
									whileTap={{ scale: 0.985 }}
								>
									<motion.div
										className="absolute -inset-3 -z-10 rounded-lg blur-2xl"
										style={{
											background: `linear-gradient(135deg, ${colors.primary[500]}, ${colors.secondary[500]})`,
										}}
										animate={{ opacity: lit ? 0.35 : 0, scale: lit ? 1 : 0.85 }}
										transition={{ duration: 0.4 }}
									/>

									<motion.div
										className="pointer-events-none absolute inset-0"
										style={{
											background:
												"linear-gradient(110deg,transparent 25%,rgba(255,255,255,0.08) 50%,transparent 75%)",
											backgroundSize: "200% 100%",
										}}
										animate={
											isHovered
												? { backgroundPosition: ["200% 0", "-200% 0"] }
												: {}
										}
										transition={{
											duration: 1.6,
											repeat: isHovered ? Infinity : 0,
										}}
									/>

									<div className="relative z-10">
										<motion.div
											className="absolute -top-5 h-16 w-16 ltr:-right-5 rtl:-left-5"
											initial={{ scale: 0, rotate: -180 }}
											whileInView={{ scale: 1, rotate: 0 }}
											viewport={{ once: true }}
											transition={{
												delay: index * 0.14 + 0.4,
												type: "spring",
												stiffness: 200,
												damping: 16,
											}}
										>
											<motion.div
												className="theme-gradient-bg relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg shadow-2xl"
												whileHover={{ rotate: 15, scale: 1.1 }}
												transition={{ duration: 0.4 }}
											>
												<motion.div
													className="absolute inset-0 bg-white/20"
													animate={
														isHovered
															? { scale: [1, 1.6, 1], opacity: [0.3, 0, 0.3] }
															: {}
													}
													transition={{ duration: 1.8, repeat: Infinity }}
												/>
												<span className="font-display relative z-10 text-2xl leading-none text-white">
													{step.number}
												</span>
											</motion.div>
										</motion.div>

										<div className="relative mb-7 flex h-52 items-center justify-center">
											<motion.div
												className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.08]"
												style={{
													background: `radial-gradient(circle, ${colors.primary[500]}, transparent)`,
												}}
												animate={
													isHovered
														? { scale: [1, 1.35, 1], rotate: [0, 360] }
														: { scale: 1 }
												}
												transition={{
													duration: 4,
													repeat: isHovered ? Infinity : 0,
												}}
											/>

											<motion.div
												className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.14]"
												style={{
													background: `radial-gradient(circle, ${colors.secondary[500]}, transparent)`,
												}}
												animate={
													isHovered
														? { scale: [1.3, 1, 1.3], rotate: [360, 0] }
														: { scale: 1.3 }
												}
												transition={{
													duration: 3,
													repeat: isHovered ? Infinity : 0,
												}}
											/>

											<motion.div
												className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border opacity-[0.18]"
												style={{ borderColor: colors.primary[400] }}
												animate={isHovered ? { rotate: 360 } : {}}
												transition={{
													duration: 7,
													repeat: isHovered ? Infinity : 0,
													ease: "linear",
												}}
											/>

											<motion.div
												className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed opacity-[0.10]"
												style={{ borderColor: colors.secondary[400] }}
												animate={isHovered ? { rotate: -360 } : {}}
												transition={{
													duration: 12,
													repeat: isHovered ? Infinity : 0,
													ease: "linear",
												}}
											/>

											<motion.div
												className="relative z-10"
												whileHover={{ scale: 1.12, rotate: [0, -8, 8, -6, 0] }}
												transition={{ duration: 0.5 }}
											>
												<motion.div
													className="theme-gradient-bg relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg shadow-2xl"
													animate={
														isHovered
															? {
																boxShadow: [
																	`0 16px 48px ${colors.primary[500]}40`,
																	`0 22px 64px ${colors.secondary[500]}55`,
																	`0 16px 48px ${colors.primary[500]}40`,
																],
															}
															: {}
													}
													transition={{ duration: 2, repeat: Infinity }}
												>
													<motion.div
														className="absolute inset-0"
														style={{
															background: `radial-gradient(circle at 30% 30%, ${colors.primary[300]}, transparent)`,
														}}
														animate={
															isHovered
																? {
																	scale: [1, 1.6, 1],
																	opacity: [0.25, 0.55, 0.25],
																}
																: {}
														}
														transition={{ duration: 2, repeat: Infinity }}
													/>
													<PrimaryIllustration
														className="relative z-10 h-12 w-12 text-white"
														strokeWidth={2}
													/>
												</motion.div>
											</motion.div>

											{step.illustration.secondary.map((SecIcon, idx) => (
												<motion.div
													key={idx}
													className="absolute"
													style={POSITIONS[idx]}
													initial={{ opacity: 0, scale: 0 }}
													whileInView={{ opacity: 1, scale: 1 }}
													viewport={{ once: true }}
													animate={{
														opacity: isHovered ? 1 : 0.55,
														scale: isHovered ? 1.08 : 0.88,
														y: isHovered ? [0, -14, 0] : 0,
														rotate: isHovered ? [0, 8, -8, 0] : 0,
													}}
													transition={{
														delay: 0.5 + idx * 0.12,
														y: { repeat: Infinity, duration: 2.5 + idx * 0.5 },
														rotate: {
															repeat: Infinity,
															duration: 3 + idx * 0.5,
														},
													}}
													whileHover={{ scale: 1.25, rotate: 20 }}
												>
													<div
														className="flex h-12 w-12 items-center justify-center rounded-lg border shadow-xl backdrop-blur-xl"
														style={{
															backgroundColor: `${colors.primary[900]}55`,
															borderColor: `${colors.primary[500]}28`,
														}}
													>
														<SecIcon
															className="h-6 w-6"
															style={{ color: colors.primary[300] }}
														/>
													</div>
												</motion.div>
											))}
										</div>

										<div className="space-y-4">
											<div className="flex items-center gap-3">
												<motion.div
													className="theme-gradient-bg flex h-12 w-12 shrink-0 items-center justify-center rounded-lg shadow-lg"
													whileHover={{ rotate: 15, scale: 1.1 }}
													transition={{ duration: 0.4 }}
												>
													<Icon className="h-6 w-6 text-white" strokeWidth={2} />
												</motion.div>

												<h3 className="font-body text-xl font-black leading-tight text-white">
													{step.title}
												</h3>
											</div>

											<p className="font-body text-sm leading-relaxed text-white/55">
												{step.description}
											</p>

											<div className="space-y-2 border-t border-white/[0.07] pt-4">
												<AnimatePresence>
													{lit &&
														step.features.map((feat, idx) => {
															const FeatIcon = feat.icon;

															return (
																<motion.div
																	key={idx}
																	className="flex cursor-default items-center gap-3 rounded-lg p-2.5 transition-colors duration-200"
																	style={{
																		backgroundColor: `${colors.primary[900]}18`,
																	}}
																	initial={{ opacity: 0, x: -16 }}
																	animate={{ opacity: 1, x: 0 }}
																	exit={{ opacity: 0, x: -16 }}
																	transition={{
																		delay: idx * 0.08,
																		type: "spring",
																		stiffness: 220,
																		damping: 22,
																	}}
																	whileHover={{
																		x: 4,
																		backgroundColor: `${colors.primary[900]}35`,
																	}}
																>
																	<div
																		className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
																		style={{
																			background: `linear-gradient(135deg, ${colors.primary[500]}, ${colors.secondary[500]})`,
																		}}
																	>
																		<FeatIcon
																			className="h-4 w-4 text-white"
																			strokeWidth={2.5}
																		/>
																	</div>

																	<span className="font-body flex-1 text-xs font-semibold leading-snug text-white/75">
																		{feat.text}
																	</span>

																	<CheckCircle2
																		className="h-4 w-4 shrink-0 opacity-50"
																		style={{ color: colors.primary[400] }}
																	/>
																</motion.div>
															);
														})}
												</AnimatePresence>
											</div>
										</div>

										<motion.div
											className="theme-gradient-bg absolute bottom-0 left-0 right-0 h-[3px] rounded-b-2xl"
											initial={{ scaleX: 0 }}
											animate={{ scaleX: lit ? 1 : 0 }}
											transition={{ duration: 0.35 }}
										/>

										<AnimatePresence>
											{isHovered && (
												<motion.div
													className="absolute top-4 ltr:left-4 rtl:right-4"
													initial={{ opacity: 0, scale: 0 }}
													animate={{ opacity: 1, scale: 1 }}
													exit={{ opacity: 0, scale: 0 }}
												>
													<motion.div
														className="h-2.5 w-2.5 rounded-full"
														style={{
															backgroundColor: colors.primary[400],
															boxShadow: `0 0 14px ${colors.primary[400]}`,
														}}
														animate={{
															scale: [1, 1.6, 1],
															opacity: [1, 0.4, 1],
														}}
														transition={{ duration: 1.4, repeat: Infinity }}
													/>
												</motion.div>
											)}
										</AnimatePresence>
									</div>
								</motion.div>
							</motion.div>
						);
					})}
				</div>

				<motion.div
					className="text-center"
					initial={{ opacity: 0, y: 24 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ delay: 0.6, duration: 0.7 }}
				>
					<motion.button
						className="theme-gradient-bg group relative inline-flex items-center gap-3 overflow-hidden rounded-lg px-10 py-5 font-body text-lg font-black text-white shadow-2xl"
						style={{ boxShadow: `0 18px 54px ${colors.primary[500]}35` }}
						whileHover={{ scale: 1.04, y: -4 }}
						whileTap={{ scale: 0.96 }}
					>
						<motion.div
							className="absolute inset-0 bg-white/20"
							initial={{ x: "-100%" }}
							whileHover={{ x: "100%" }}
							transition={{ duration: 0.55 }}
						/>
						<span className="relative z-10">{t("cta")}</span>
						<motion.div
							className="relative z-10"
							animate={{ x: [0, 5, 0] }}
							transition={{ duration: 1.4, repeat: Infinity }}
						>
							<Rocket className="h-5 w-5" />
						</motion.div>
					</motion.button>
				</motion.div>
			</div>
		</section>
	);
}