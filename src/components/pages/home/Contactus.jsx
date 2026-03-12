"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/utils/axios";
import {
	Check,
	ChevronDown,
	Dumbbell,
	Heart,
	TrendingUp,
	Award,
	User,
	Users,
} from "lucide-react";

const inputCls = (filled) =>
	[
		"w-full bg-transparent px-0 py-3",
		"border-b-2 transition-colors duration-200 outline-none",
		"font-body text-sm text-white placeholder:text-white/30",
		filled
			? "border-[var(--color-primary-500)]"
			: "border-white/[0.15] focus:border-[var(--color-primary-500)]/70",
	].join(" ");

const labelCls =
	"mb-2 block font-body text-xs font-bold uppercase tracking-[0.12em] text-white/45";

export default function ContactUs() {
	const t = useTranslations("home.contact");

	const [formData, setFormData] = useState({
		username: "",
		email: "",
		phone: "",
		countryCode: "+20",
		teamSize: "",
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState(null);
	const [showCountryDropdown, setShowCountryDropdown] = useState(false);
	const [currentTestimonial, setCurrentTestimonial] = useState(0);
	const [submitted, setSubmitted] = useState(false);

	const countryCodes = useMemo(
		() => [
			{ code: "+20", flag: "🇪🇬", country: "Egypt" },
			{ code: "+1", flag: "🇺🇸", country: "USA" },
			{ code: "+44", flag: "🇬🇧", country: "UK" },
			{ code: "+971", flag: "🇦🇪", country: "UAE" },
			{ code: "+966", flag: "🇸🇦", country: "Saudi Arabia" },
		],
		[]
	);

	const teamSizeOptions = useMemo(
		() => [
			{
				id: "solo",
				label: t("form.teamSize.solo"),
				description: t("form.teamSize.soloDesc"),
				icon: User,
			},
			{
				id: "team",
				label: t("form.teamSize.team"),
				description: t("form.teamSize.teamDesc"),
				icon: Users,
			},
		],
		[t]
	);

	const testimonials = useMemo(
		() => [
			{
				text: t("testimonials.0.text"),
				author: t("testimonials.0.author"),
				role: t("testimonials.0.role"),
				company: t("testimonials.0.company"),
				icon: TrendingUp,
			},
			{
				text: t("testimonials.1.text"),
				author: t("testimonials.1.author"),
				role: t("testimonials.1.role"),
				company: t("testimonials.1.company"),
				icon: Heart,
			},
			{
				text: t("testimonials.2.text"),
				author: t("testimonials.2.author"),
				role: t("testimonials.2.role"),
				company: t("testimonials.2.company"),
				icon: Award,
			},
		],
		[t]
	);

	useEffect(() => {
		const id = setInterval(
			() => setCurrentTestimonial((p) => (p + 1) % testimonials.length),
			5000
		);
		return () => clearInterval(id);
	}, [testimonials.length]);

	useEffect(() => {
		if (!showCountryDropdown) return;
		const fn = () => setShowCountryDropdown(false);
		document.addEventListener("click", fn);
		return () => document.removeEventListener("click", fn);
	}, [showCountryDropdown]);

	const selectedCountry = countryCodes.find(
		(c) => c.code === formData.countryCode
	);

	const handleChange = (e) =>
		setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (isSubmitting) return;

		setError(null);
		setIsSubmitting(true);

		try {
			const payload = {
				type: "other",
				name: formData.username,
				title: `${t("title")} – ${formData.username || ""}`.trim(),
				description: [
					`${t("form.fields.username")}: ${formData.username}`,
					`${t("form.fields.email")}: ${formData.email}`,
					`${t("form.fields.phone")}: ${formData.countryCode} ${formData.phone}`.trim(),
					formData.teamSize
						? `${t("form.fields.teamSize")}: ${formData.teamSize}`
						: null,
				]
					.filter(Boolean)
					.join("\n"),
				email: formData.email,
				phone: `${formData.countryCode} ${formData.phone}`.trim(),
				category: "contact",
			};

			await api.post("/feedback", payload);
			setSubmitted(true);
		} catch (err) {
			const message =
				err?.response?.data?.message ||
				err?.message ||
				t("form.errorGeneric");
			setError(message);
		} finally {
			setIsSubmitting(false);
		}
	};

	const item = testimonials[currentTestimonial];

	return (
		<section className="relative overflow-hidden py-20 sm:py-24 md:py-28">
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<motion.div
					className="absolute top-20 h-[600px] w-[600px] rounded-full blur-[120px] opacity-[0.18] ltr:right-20 rtl:left-20
          bg-[radial-gradient(circle,var(--color-primary-500),transparent)]"
					animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.28, 0.15] }}
					transition={{ duration: 8, repeat: Infinity }}
				/>
				<motion.div
					className="absolute bottom-20 h-[600px] w-[600px] rounded-full blur-[120px] opacity-[0.18] ltr:left-20 rtl:right-20
          bg-[radial-gradient(circle,var(--color-secondary-500),transparent)]"
					animate={{ scale: [1.2, 1, 1.2], opacity: [0.28, 0.15, 0.28] }}
					transition={{ duration: 8, repeat: Infinity, delay: 1 }}
				/>
				<div
					className="absolute inset-0 opacity-[0.02]
          bg-[linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)]
          bg-[size:60px_60px]
          [mask-image:radial-gradient(ellipse_at_50%_50%,black_30%,transparent_80%)]"
				/>
			</div>

			<div className="relative z-10 mx-auto max-w-[1440px] px-6 lg:px-16">
				<div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
					<motion.div
						className="space-y-8"
						initial={{ opacity: 0, x: -28 }}
						whileInView={{ opacity: 1, x: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.65 }}
					>
						<div className="space-y-3">
							<h2 className="font-display text-4xl leading-tight text-white sm:text-5xl md:text-6xl">
								<span className="theme-gradient-text">{t("title")}</span>
							</h2>
							<p className="font-body max-w-md text-base leading-relaxed text-white/50 md:text-lg">
								{t("description")}
							</p>
						</div>

						<AnimatePresence mode="wait">
							{submitted ? (
								<motion.div
									key="success"
									initial={{ opacity: 0, scale: 0.95 }}
									animate={{ opacity: 1, scale: 1 }}
									className="flex flex-col items-center gap-5 rounded-lg border border-[var(--color-primary-500)]/25 bg-[var(--color-primary-500)]/[0.06] py-16 text-center backdrop-blur-sm"
								>
									<motion.div
										className="theme-gradient-bg flex h-16 w-16 items-center justify-center rounded-full shadow-xl"
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										transition={{ type: "spring", stiffness: 220 }}
									>
										<Check className="h-8 w-8 text-white" strokeWidth={3} />
									</motion.div>
									<div>
										<h3 className="font-body mb-1 text-2xl font-black text-white">
											{t("form.successTitle")}
										</h3>
										<p className="font-body text-sm text-white/50">
											{t("form.successDesc")}
										</p>
									</div>
								</motion.div>
							) : (
								<motion.form
									key="form"
									onSubmit={handleSubmit}
									className="space-y-6"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
								>
									<div className="grid grid-cols-2 gap-5">
										<div>
											<label className={labelCls}>
												{t("form.fields.username")}
											</label>
											<input
												type="text"
												name="username"
												value={formData.username}
												onChange={handleChange}
												required
												className={inputCls(!!formData.username)}
											/>
										</div> 
									<div>
										<label className={labelCls}>{t("form.fields.email")}</label>
										<input
											type="email"
											name="email"
											value={formData.email}
											onChange={handleChange}
											required
											className={inputCls(!!formData.email)}
										/>
									</div>
									</div>
									{error && (
										<p className="mt-2 font-body text-xs text-red-400">
											{error}
										</p>
									)}
									<div>
										<label className={labelCls}>{t("form.fields.phone")}</label>
										<div className="flex items-end gap-3">
											<div className="relative shrink-0">
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														setShowCountryDropdown((v) => !v);
													}}
													className="flex items-center gap-1.5 border-b-2 border-white/[0.15] pb-3 font-body text-sm text-white outline-none transition-colors duration-200 hover:border-[var(--color-primary-500)]/60"
												>
													<span className="text-lg">{selectedCountry?.flag}</span>
													<span>{formData.countryCode}</span>
													<motion.div
														animate={{ rotate: showCountryDropdown ? 180 : 0 }}
														transition={{ duration: 0.2 }}
													>
														<ChevronDown className="h-4 w-4 text-white/40" />
													</motion.div>
												</button>

												<AnimatePresence>
													{showCountryDropdown && (
														<motion.div
															initial={{ opacity: 0, y: -8, scale: 0.97 }}
															animate={{ opacity: 1, y: 0, scale: 1 }}
															exit={{ opacity: 0, y: -8, scale: 0.97 }}
															transition={{ duration: 0.15 }}
															className="absolute top-full z-50 mt-2 w-56 overflow-hidden rounded-lg border border-white/[0.08] bg-slate-800 shadow-2xl ltr:left-0 rtl:right-0"
															onClick={(e) => e.stopPropagation()}
														>
															{countryCodes.map((c) => (
																<button
																	key={c.code}
																	type="button"
																	onClick={() => {
																		setFormData((p) => ({
																			...p,
																			countryCode: c.code,
																		}));
																		setShowCountryDropdown(false);
																	}}
																	className="flex w-full items-center gap-3 px-4 py-3 text-left font-body text-sm transition-colors duration-150 hover:bg-white/[0.06]"
																>
																	<span className="text-lg">{c.flag}</span>
																	<span className="font-bold text-white">
																		{c.code}
																	</span>
																	<span className="text-white/45">
																		{c.country}
																	</span>
																</button>
															))}
														</motion.div>
													)}
												</AnimatePresence>
											</div>

											<input
												type="tel"
												name="phone"
												value={formData.phone}
												onChange={handleChange}
												placeholder="000 000 0000"
												required
												className={`flex-1 ${inputCls(!!formData.phone)}`}
											/>
										</div>
									</div>

									<div>
										<label className={labelCls}>
											{t("form.fields.teamSize")}
										</label>
										<div className="mt-1 space-y-3">
											{teamSizeOptions.map((option) => {
												const Icon = option.icon;
												const isSelected = formData.teamSize === option.id;

												return (
													<motion.button
														key={option.id}
														type="button"
														onClick={() =>
															setFormData((p) => ({ ...p, teamSize: option.id }))
														}
														className={[
															"flex w-full items-start gap-4 rounded-lg border-2 p-4 text-left transition-all duration-200",
															isSelected
																? "border-[var(--color-primary-500)]/70 bg-[var(--color-primary-500)]/[0.07]"
																: "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.18]",
														].join(" ")}
														whileHover={{ scale: 1.01 }}
														whileTap={{ scale: 0.99 }}
													>
														<div
															className={[
																"flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
																isSelected
																	? "theme-gradient-bg"
																	: "bg-white/[0.06]",
															].join(" ")}
														>
															<Icon
																className={`h-5 w-5 ${isSelected ? "text-white" : "text-white/40"
																	}`}
															/>
														</div>

														<div className="min-w-0 flex-1">
															<div className="flex items-center justify-between gap-2">
																<h4
																	className={`font-body text-sm font-bold ${isSelected ? "text-white" : "text-white/70"
																		}`}
																>
																	{option.label}
																</h4>
																{isSelected && (
																	<motion.div
																		initial={{ scale: 0 }}
																		animate={{ scale: 1 }}
																		className="theme-gradient-bg flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
																	>
																		<Check
																			className="h-3 w-3 text-white"
																			strokeWidth={3}
																		/>
																	</motion.div>
																)}
															</div>
															<p className="mt-0.5 font-body text-xs leading-relaxed text-white/35">
																{option.description}
															</p>
														</div>
													</motion.button>
												);
											})}
										</div>
									</div>

									<motion.button
										type="submit"
										disabled={isSubmitting}
										className="theme-gradient-bg group relative w-full overflow-hidden rounded-lg px-8 py-4 font-body text-base font-bold text-white shadow-[0_8px_32px_rgba(99,102,241,0.3)] transition-shadow duration-200 hover:shadow-[0_12px_40px_rgba(99,102,241,0.45)] disabled:cursor-not-allowed disabled:opacity-50"
										whileHover={{
											scale: isSubmitting ? 1 : 1.01,
											y: isSubmitting ? 0 : -2,
										}}
										whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
									>
										<motion.div
											className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent"
											whileHover={{ x: "200%" }}
											transition={{ duration: 0.75 }}
										/>
										<span className="relative flex items-center justify-center gap-2">
											{isSubmitting ? (
												<>
													<motion.div
														className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white"
														animate={{ rotate: 360 }}
														transition={{
															duration: 1,
															repeat: Infinity,
															ease: "linear",
														}}
													/>
													{t("form.submitting")}
												</>
											) : (
												t("form.submit")
											)}
										</span>
									</motion.button>
								</motion.form>
							)}
						</AnimatePresence>
					</motion.div>

					<motion.div
						className="relative lg:sticky lg:top-8 lg:self-start"
						initial={{ opacity: 0, x: 28 }}
						whileInView={{ opacity: 1, x: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.65, delay: 0.15 }}
					>
						<AnimatePresence mode="wait">
							<motion.div
								key={currentTestimonial}
								initial={{ opacity: 0, scale: 0.97, y: 10 }}
								animate={{ opacity: 1, scale: 1, y: 0 }}
								exit={{ opacity: 0, scale: 0.97, y: -10 }}
								transition={{ duration: 0.4 }}
								className="relative overflow-hidden rounded-lg border border-white/[0.08] bg-gradient-to-br from-slate-800/90 to-slate-900/90 shadow-[0_24px_56px_rgba(0,0,0,0.45)] backdrop-blur-xl"
							>
								<motion.div
									className="theme-gradient-bg pointer-events-none absolute inset-0"
									animate={{ opacity: [0.06, 0.12, 0.06] }}
									transition={{ duration: 3, repeat: Infinity }}
								/>

								<div className="relative border-b border-white/[0.07] p-7">
									<div className="flex items-center gap-4">
										<motion.div
											className="theme-gradient-bg flex h-14 w-14 shrink-0 items-center justify-center rounded-lg shadow-xl"
											whileHover={{
												rotate: [0, -10, 10, -8, 0],
												scale: 1.06,
											}}
											transition={{ duration: 0.5 }}
										>
											<Dumbbell className="h-7 w-7 text-white" />
										</motion.div>
										<div>
											<h3 className="font-display text-2xl leading-none text-white">
												FitnessHub
											</h3>
											<p className="mt-1 font-body text-sm text-white/45">
												{t("testimonials.subtitle")}
											</p>
										</div>
									</div>
								</div>

								<div className="relative h-72 overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 sm:h-80">
									<motion.div
										className="absolute inset-0 opacity-20"
										animate={{ x: [0, 22, 0] }}
										transition={{
											duration: 5,
											repeat: Infinity,
											ease: "easeInOut",
										}}
									>
										<div className="h-full w-full bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.05)_10px,rgba(255,255,255,0.05)_20px)]" />
									</motion.div>

									<div className="absolute inset-0 grid place-items-center">
										<motion.div
											key={currentTestimonial}
											initial={{ scale: 0, rotate: -160 }}
											animate={{ scale: 1, rotate: 0 }}
											transition={{
												type: "spring",
												stiffness: 200,
												damping: 15,
											}}
											className="theme-gradient-bg flex h-40 w-40 items-center justify-center rounded-full shadow-2xl"
										>
											<item.icon className="h-20 w-20 text-white" strokeWidth={1.5} />
										</motion.div>
									</div>

									<div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
									<div className="theme-gradient-bg absolute inset-0 opacity-15" />
								</div>

								<div className="relative space-y-5 p-7">
									<div className="-mb-3 select-none font-display text-5xl leading-none text-[var(--color-primary-500)]/25">
										"
									</div>

									<motion.p
										className="font-body text-base italic leading-relaxed text-white/80 md:text-lg"
										initial={{ opacity: 0, y: 8 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: 0.18 }}
									>
										{item.text}
									</motion.p>

									<div className="flex items-center justify-between border-t border-white/[0.07] pt-4">
										<motion.div
											initial={{ opacity: 0, x: -8 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ delay: 0.28 }}
										>
											<p className="font-body text-base font-black leading-tight text-white">
												{item.author}
											</p>
											<p className="mt-0.5 font-body text-xs text-white/40">
												{item.role}
											</p>
										</motion.div>

										<motion.div
											className="flex items-center gap-2"
											initial={{ opacity: 0, x: 8 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ delay: 0.36 }}
										>
											<div className="theme-gradient-bg h-2 w-2 rounded-full" />
											<span className="font-body text-sm font-bold text-white/70">
												{item.company}
											</span>
										</motion.div>
									</div>
								</div>

								<div className="flex justify-center gap-2 pb-5">
									{testimonials.map((_, i) => (
										<button
											key={i}
											type="button"
											onClick={() => setCurrentTestimonial(i)}
											className="group"
										>
											<motion.div
												className={[
													"h-1.5 rounded-full transition-all duration-300",
													i === currentTestimonial
														? "w-8 bg-[var(--color-primary-400)]"
														: "w-1.5 bg-white/20 group-hover:bg-white/40",
												].join(" ")}
												whileTap={{ scale: 0.9 }}
											/>
										</button>
									))}
								</div>
							</motion.div>
						</AnimatePresence>
					</motion.div>
				</div>
			</div>
		</section>
	);
}