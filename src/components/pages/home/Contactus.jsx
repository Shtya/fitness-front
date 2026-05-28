"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
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
	AlertCircle,
	Loader2,
} from "lucide-react";
import SectionHeader from "./SectionHeader";

// ─── AOS Init Hook ────────────────────────────────────────────────────────────
function useAOS() {
	useEffect(() => {
		if (typeof window === "undefined") return;
		import("aos").then((AOS) => {
			AOS.init({ duration: 600, easing: "ease-out-cubic", once: true, offset: 50 });
		});
	}, []);
}

// ─── Shared class helpers ─────────────────────────────────────────────────────
const inputCls = (filled, hasError) =>
	[
		"w-full bg-transparent px-0 py-3",
		"border-b-2 transition-colors duration-200 outline-none",
		"font-body text-sm text-white placeholder:text-white/30",
		hasError
			? "border-red-500/70 focus:border-red-500"
			: filled
				? "border-[var(--color-primary-500)]"
				: "border-white/[0.15] focus:border-[var(--color-primary-500)]/70",
	].join(" ");

const labelCls =
	"mb-2 block font-body text-xs font-bold uppercase tracking-[0.12em] text-white/45";

const errorCls =
	"mt-1.5 flex items-center gap-1.5 font-body text-[11px] font-semibold text-red-400";

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ContactUs() {
	const t = useTranslations("home.contact");
	useAOS();

	const [countryCode, setCountryCode] = useState("+20");
	const [showCountryDropdown, setShowCountryDropdown] = useState(false);
	const [currentTestimonial, setCurrentTestimonial] = useState(0);
	const [submitted, setSubmitted] = useState(false);
	const [submitError, setSubmitError] = useState(null);
	const [testimonialVisible, setTestimonialVisible] = useState(true);
	const dropdownRef = useRef(null);

	// ── Validation schema ───────────────────────────────────────────────────
	const schema = useMemo(
		() =>
			yup.object({
				username: yup
					.string()
					.trim()
					.min(2, t("form.errors.usernameTooShort") || "Name must be at least 2 characters")
					.required(t("form.errors.usernameRequired") || "Name is required"),
				email: yup
					.string()
					.email(t("form.errors.emailInvalid") || "Enter a valid email address")
					.required(t("form.errors.emailRequired") || "Email is required"),
				phone: yup
					.string()
					.matches(/^\d[\d\s\-()]{5,}$/, t("form.errors.phoneInvalid") || "Enter a valid phone number")
					.required(t("form.errors.phoneRequired") || "Phone number is required"),
				teamSize: yup
					.string()
					.oneOf(["solo", "team"], t("form.errors.teamSizeRequired") || "Please select a team size")
					.required(t("form.errors.teamSizeRequired") || "Please select a team size"),
			}),
		[t]
	);

	const {
		register,
		handleSubmit,
		watch,
		setValue,
		formState: { errors, isSubmitting },
	} = useForm({
		resolver: yupResolver(schema),
		mode: "onTouched",
		defaultValues: { username: "", email: "", phone: "", teamSize: "" },
	});

	const watchedValues = watch();

	// ── Static data ─────────────────────────────────────────────────────────
	const countryCodes = useMemo(() => [
		{ code: "+20", flag: "🇪🇬", country: "Egypt" },
		{ code: "+1", flag: "🇺🇸", country: "USA" },
		{ code: "+44", flag: "🇬🇧", country: "UK" },
		{ code: "+971", flag: "🇦🇪", country: "UAE" },
		{ code: "+966", flag: "🇸🇦", country: "Saudi Arabia" },
	], []);

	const teamSizeOptions = useMemo(() => [
		{ id: "solo", label: t("form.teamSize.solo"), description: t("form.teamSize.soloDesc"), icon: User },
		{ id: "team", label: t("form.teamSize.team"), description: t("form.teamSize.teamDesc"), icon: Users },
	], [t]);

	const testimonials = useMemo(() => [
		{ text: t("testimonials.0.text"), author: t("testimonials.0.author"), role: t("testimonials.0.role"), company: t("testimonials.0.company"), icon: TrendingUp },
		{ text: t("testimonials.1.text"), author: t("testimonials.1.author"), role: t("testimonials.1.role"), company: t("testimonials.1.company"), icon: Heart },
		{ text: t("testimonials.2.text"), author: t("testimonials.2.author"), role: t("testimonials.2.role"), company: t("testimonials.2.company"), icon: Award },
	], [t]);

	// ── Testimonial auto-rotate ──────────────────────────────────────────────
	useEffect(() => {
		const id = setInterval(() => {
			setTestimonialVisible(false);
			setTimeout(() => {
				setCurrentTestimonial((p) => (p + 1) % testimonials.length);
				setTestimonialVisible(true);
			}, 280);
		}, 5000);
		return () => clearInterval(id);
	}, [testimonials.length]);

	// ── Close country dropdown on outside click ──────────────────────────────
	useEffect(() => {
		if (!showCountryDropdown) return;
		const fn = (e) => {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target))
				setShowCountryDropdown(false);
		};
		document.addEventListener("mousedown", fn);
		return () => document.removeEventListener("mousedown", fn);
	}, [showCountryDropdown]);

	const selectedCountry = countryCodes.find((c) => c.code === countryCode);
	const item = testimonials[currentTestimonial];

	// ── Submit handler ───────────────────────────────────────────────────────
	const onSubmit = async (data) => {
		setSubmitError(null);
		try {
			const payload = {
				type: "other",
				name: data.username,
				title: `${t("title")} – ${data.username}`.trim(),
				description: [
					`${t("form.fields.username")}: ${data.username}`,
					`${t("form.fields.email")}: ${data.email}`,
					`${t("form.fields.phone")}: ${countryCode} ${data.phone}`.trim(),
					data.teamSize ? `${t("form.fields.teamSize")}: ${data.teamSize}` : null,
				]
					.filter(Boolean)
					.join("\n"),
				email: data.email,
				phone: `${countryCode} ${data.phone}`.trim(),
				category: "contact",
			};
			await api.post("/feedback", payload);
			setSubmitted(true);
		} catch (err) {
			setSubmitError(
				err?.response?.data?.message || err?.message || t("form.errorGeneric")
			);
		}
	};

	return (
		<section
			id="contact-section"
			aria-labelledby="contact-heading"
			className="relative overflow-hidden py-20 sm:py-24 md:py-28"
		>


			<div className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-16">
				<div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">

					{/* ── Left: Form column ── */}
					<div
						className="space-y-8"
						data-aos="fade-right"
						data-aos-duration="700"
					>

						<SectionHeader
							align="start"
							id="contact-heading"
							title={t("title")}
							subtitle={t("description")}
						/> 

						{/* ── Success state ── */}
						{submitted ? (
							<div className="flex flex-col items-center gap-5 rounded-xl border border-[var(--color-primary-500)]/25 bg-[var(--color-primary-500)]/[0.06] py-16 text-center backdrop-blur-sm">
								<div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)] shadow-xl">
									<Check aria-hidden="true" className="h-8 w-8 text-white" strokeWidth={3} />
								</div>
								<div>
									<h3 className="font-body mb-1 text-2xl font-black text-white">
										{t("form.successTitle")}
									</h3>
									<p className="font-body text-sm text-white/50">
										{t("form.successDesc")}
									</p>
								</div>
							</div>
						) : (
							/* ── Form ── */
							<form
								noValidate
								onSubmit={handleSubmit(onSubmit)}
								className="space-y-6"
								aria-label={t("form.ariaLabel") || "Contact form"}
							>
								{/* Name + Email row */}
								<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
									{/* Username */}
									<div>
										<label htmlFor="contact-username" className={labelCls}>
											{t("form.fields.username")}
										</label>
										<input
											id="contact-username"
											type="text"
											autoComplete="name"
											placeholder={t("form.placeholders.username") || "John Doe"}
											aria-invalid={!!errors.username}
											aria-describedby={errors.username ? "err-username" : undefined}
											{...register("username")}
											className={inputCls(!!watchedValues.username, !!errors.username)}
										/>
										{errors.username && (
											<p id="err-username" role="alert" className={errorCls}>
												<AlertCircle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
												{errors.username.message}
											</p>
										)}
									</div>

									{/* Email */}
									<div>
										<label htmlFor="contact-email" className={labelCls}>
											{t("form.fields.email")}
										</label>
										<input
											id="contact-email"
											type="email"
											autoComplete="email"
											placeholder={t("form.placeholders.email") || "you@example.com"}
											aria-invalid={!!errors.email}
											aria-describedby={errors.email ? "err-email" : undefined}
											{...register("email")}
											className={inputCls(!!watchedValues.email, !!errors.email)}
										/>
										{errors.email && (
											<p id="err-email" role="alert" className={errorCls}>
												<AlertCircle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
												{errors.email.message}
											</p>
										)}
									</div>
								</div>

								{/* Global submit error */}
								{submitError && (
									<p role="alert" className={errorCls}>
										<AlertCircle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
										{submitError}
									</p>
								)}

								{/* Phone */}
								<div>
									<label htmlFor="contact-phone" className={labelCls}>
										{t("form.fields.phone")}
									</label>
									<div className="flex items-end gap-3">
										{/* Country code picker */}
										<div className="relative shrink-0" ref={dropdownRef}>
											<button
												type="button"
												aria-haspopup="listbox"
												aria-expanded={showCountryDropdown}
												aria-label="Select country code"
												onClick={() => setShowCountryDropdown((v) => !v)}
												className="flex items-center gap-1.5 border-b-2 border-white/[0.15] pb-3 font-body text-sm text-white outline-none transition-colors duration-200 hover:border-[var(--color-primary-500)]/60 focus-visible:border-[var(--color-primary-500)]"
											>
												<span className="text-lg" aria-hidden="true">{selectedCountry?.flag}</span>
												<span>{countryCode}</span>
												<ChevronDown
													aria-hidden="true"
													className={[
														"h-4 w-4 text-white/40 transition-transform duration-200",
														showCountryDropdown ? "rotate-180" : "rotate-0",
													].join(" ")}
												/>
											</button>

											{/* Dropdown */}
											<div
												role="listbox"
												aria-label="Country codes"
												className={[
													"absolute top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-white/[0.08] bg-slate-800 shadow-2xl transition-all duration-200 ltr:left-0 rtl:right-0",
													showCountryDropdown
														? "pointer-events-auto translate-y-0 opacity-100 scale-100"
														: "pointer-events-none -translate-y-2 opacity-0 scale-[0.97]",
												].join(" ")}
											>
												{countryCodes.map((c) => (
													<button
														key={c.code}
														type="button"
														role="option"
														aria-selected={countryCode === c.code}
														onClick={() => {
															setCountryCode(c.code);
															setShowCountryDropdown(false);
														}}
														className={[
															"flex w-full items-center gap-3 px-4 py-3 text-start font-body text-sm transition-colors duration-150",
															countryCode === c.code
																? "bg-[var(--color-primary-500)]/[0.12] text-[var(--color-primary-300)]"
																: "hover:bg-white/[0.06] text-white",
														].join(" ")}
													>
														<span className="text-lg" aria-hidden="true">{c.flag}</span>
														<span className="font-bold">{c.code}</span>
														<span className="text-white/45">{c.country}</span>
													</button>
												))}
											</div>
										</div>

										{/* Phone number input */}
										<div className="flex-1">
											<input
												id="contact-phone"
												type="tel"
												autoComplete="tel"
												placeholder="000 000 0000"
												aria-invalid={!!errors.phone}
												aria-describedby={errors.phone ? "err-phone" : undefined}
												{...register("phone")}
												className={inputCls(!!watchedValues.phone, !!errors.phone)}
											/>
										</div>
									</div>
									{errors.phone && (
										<p id="err-phone" role="alert" className={errorCls}>
											<AlertCircle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
											{errors.phone.message}
										</p>
									)}
								</div>

								{/* Team size */}
								<div>
									<p id="teamsize-label" className={labelCls}>
										{t("form.fields.teamSize")}
									</p>
									<div
										role="radiogroup"
										aria-labelledby="teamsize-label"
										aria-describedby={errors.teamSize ? "err-teamsize" : undefined}
										className="mt-1 space-y-3"
									>
										{teamSizeOptions.map((option) => {
											const Icon = option.icon;
											const isSelected = watchedValues.teamSize === option.id;

											return (
												<button
													key={option.id}
													type="button"
													role="radio"
													aria-checked={isSelected}
													onClick={() => setValue("teamSize", option.id, { shouldValidate: true })}
													className={[
														"flex w-full items-start gap-4 rounded-xl border-2 p-4 text-start transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)] hover:-translate-y-0.5 active:scale-[0.99]",
														isSelected
															? "border-[var(--color-primary-500)]/70 bg-[var(--color-primary-500)]/[0.07]"
															: errors.teamSize
																? "border-red-500/40 bg-white/[0.02] hover:border-red-500/60"
																: "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.18]",
													].join(" ")}
												>
													<div
														className={[
															"flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
															isSelected
																? "bg-gradient-to-br from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)]"
																: "bg-white/[0.06]",
														].join(" ")}
														aria-hidden="true"
													>
														<Icon className={["h-5 w-5", isSelected ? "text-white" : "text-white/40"].join(" ")} />
													</div>

													<div className="min-w-0 flex-1">
														<div className="flex items-center justify-between gap-2">
															<h4 className={["font-body text-sm font-bold", isSelected ? "text-white" : "text-white/70"].join(" ")}>
																{option.label}
															</h4>
															{isSelected && (
																<span
																	aria-hidden="true"
																	className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)]"
																>
																	<Check className="h-3 w-3 text-white" strokeWidth={3} />
																</span>
															)}
														</div>
														<p className="mt-0.5 font-body text-xs md: leading-relaxed text-white/35">
															{option.description}
														</p>
													</div>
												</button>
											);
										})}
									</div>
									{errors.teamSize && (
										<p id="err-teamsize" role="alert" className={errorCls}>
											<AlertCircle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
											{errors.teamSize.message}
										</p>
									)}
								</div>

								{/* Submit button */}
								<button
									type="submit"
									disabled={isSubmitting}
									className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)] px-8 py-4 font-body text-base font-bold text-white shadow-[0_8px_32px_rgba(99,102,241,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(99,102,241,0.45)] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)] disabled:cursor-not-allowed disabled:opacity-50"
								>
									<span
										aria-hidden="true"
										className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
									/>
									<span className="relative flex items-center justify-center gap-2">
										{isSubmitting ? (
											<>
												<Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
												{t("form.submitting")}
											</>
										) : (
											t("form.submit")
										)}
									</span>
								</button>
							</form>
						)}
					</div>

					{/* ── Right: Testimonial sidebar ── */}
					<aside
						className="max-lg:hidden relative lg:sticky lg:top-8 lg:self-start"
						aria-label="Customer testimonials"
						data-aos="fade-left"
						data-aos-delay="150"
						data-aos-duration="700"
					>
						<div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-br from-slate-800/90 to-slate-900/90 shadow-[0_24px_56px_rgba(0,0,0,0.4)] backdrop-blur-xl">
							{/* Gradient wash */}
							<div
								aria-hidden="true"
								className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--color-gradient-from)]/[0.07] to-transparent animate-[pulse_3s_ease-in-out_infinite]"
							/>

							{/* Brand header */}
							<div className="relative border-b border-white/[0.07] p-7">
								<div className="flex items-center gap-4">
									<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)] shadow-xl transition-transform duration-300 hover:rotate-6">
										<Dumbbell aria-hidden="true" className="h-7 w-7 text-white" />
									</div>
									<div>
										<h3 className="font-display text-2xl md: leading-none text-white">FitnessHub</h3>
										<p className="mt-1 font-body text-sm text-white/45">{t("testimonials.subtitle")}</p>
									</div>
								</div>
							</div>

							{/* Illustration area */}
							<div className="relative h-72 overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 sm:h-80">
								{/* Moving stripe pattern */}
								<div
									aria-hidden="true"
									className="absolute inset-0 opacity-20 animate-[shiftRight_5s_ease-in-out_infinite]"
								>
									<div className="h-full w-full bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.05)_10px,rgba(255,255,255,0.05)_20px)]" />
								</div>

								{/* Center icon — transitions on testimonial change */}
								<div className="absolute inset-0 grid place-items-center">
									<div
										className={[
											"flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)] shadow-2xl transition-all duration-300",
											testimonialVisible ? "scale-100 opacity-100 rotate-0" : "scale-75 opacity-0 -rotate-12",
										].join(" ")}
									>
										<item.icon aria-hidden="true" className="h-20 w-20 text-white" strokeWidth={1.5} />
									</div>
								</div>

								<div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
								<div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-[var(--color-gradient-from)]/15 to-transparent" />
							</div>

							{/* Testimonial text area */}
							<div
								className={[
									"relative space-y-5 p-7 transition-all duration-280",
									testimonialVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
								].join(" ")}
								aria-live="polite"
								aria-atomic="true"
							>
								<div aria-hidden="true" className="-mb-3 select-none font-display text-5xl md: leading-none text-[var(--color-primary-500)]/25">"</div>

								<p className="font-body text-base italic md: leading-relaxed text-white/80 md:text-lg">
									{item.text}
								</p>

								<div className="flex items-center justify-between border-t border-white/[0.07] pt-4">
									<div>
										<p className="font-body text-base font-black md: leading-tight text-white">{item.author}</p>
										<p className="mt-0.5 font-body text-xs text-white/40">{item.role}</p>
									</div>
									<div className="flex items-center gap-2">
										<div aria-hidden="true" className="h-2 w-2 rounded-full bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)]" />
										<span className="font-body text-sm font-bold text-white/70">{item.company}</span>
									</div>
								</div>
							</div>

							{/* Dot navigation */}
							<div className="flex justify-center gap-2 pb-5" role="tablist" aria-label="Testimonial navigation">
								{testimonials.map((_, i) => (
									<button
										key={i}
										type="button"
										role="tab"
										aria-selected={i === currentTestimonial}
										aria-label={`Testimonial ${i + 1}`}
										onClick={() => {
											setTestimonialVisible(false);
											setTimeout(() => {
												setCurrentTestimonial(i);
												setTestimonialVisible(true);
											}, 280);
										}}
										className={[
											"h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary-400)]",
											i === currentTestimonial
												? "w-8 bg-[var(--color-primary-400)]"
												: "w-1.5 bg-white/20 hover:bg-white/40",
										].join(" ")}
									/>
								))}
							</div>
						</div>
					</aside>
				</div>
			</div>

			{/* ── Keyframes ── */}
			<style>{`
        @keyframes shiftRight {
          0%, 100% { transform: translateX(0);   }
          50%       { transform: translateX(22px); }
        }
      `}</style>
		</section>
	);
}