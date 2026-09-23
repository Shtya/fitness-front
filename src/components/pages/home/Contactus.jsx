"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import api from "@/utils/axios";
import { Check, ChevronDown, User, Users, AlertCircle, Loader2 } from "lucide-react";
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
	const [submitted, setSubmitted] = useState(false);
	const [submitError, setSubmitError] = useState(null);
	const dropdownRef = useRef(null);
	const locale = useLocale();
	const font = locale === "ar" ? "var(--font-arabic), sans-serif" : "var(--font-space-grotesk), var(--font-open-sans), sans-serif";
	const brand = useTranslations("home.navbar");
	const voices = useTranslations("home.testimonials");

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
			className="bg-[#f3efe6] px-5 py-20 text-[#1c1916] sm:px-8 sm:py-28 lg:px-12"
		>
			<div className="mx-auto max-w-[1180px]">
				<div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">

					{/* ── Left: Form column ── */}
					<div
						className="space-y-8"
						data-aos="fade-right"
						data-aos-duration="700"
					>

						<div>
							<h2
								id="contact-heading"
								className="text-[clamp(2rem,4vw,3.25rem)] leading-[1.02] text-[#1c1916] ltr:tracking-[-0.04em]"
								style={{ fontFamily: font }}
							>
								{t("title")}
							</h2>
							<p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#5c5348]">{t("description")}</p>
						</div> 

						{/* ── Success state ── */}
						{submitted ? (
							<div className="flex flex-col items-center gap-5 rounded-[28px] bg-[#161616] py-16 text-center shadow-[0_24px_60px_rgba(28,25,22,0.18)]">
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
								className="space-y-6 rounded-[28px] bg-[#161616] p-6 shadow-[0_24px_60px_rgba(28,25,22,0.18)] sm:p-8"
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
														"flex w-full items-start gap-4 rounded-xl border p-4 text-start transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)]",
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
														<p className="mt-0.5 text-xs leading-relaxed text-white/55">
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
									className="w-full rounded-full bg-white px-8 py-3.5 text-[15px] font-semibold text-[#12110f] transition-transform duration-200 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0c] disabled:cursor-not-allowed disabled:opacity-50"
								>
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

					<aside className="lg:sticky lg:top-28 lg:self-start lg:pt-4">
						<blockquote className="border-t border-black/10 pt-6">
							<p
								className="text-[1.35rem] leading-snug text-[#1c1916] ltr:tracking-[-0.03em]"
								style={{ fontFamily: font }}
							>
								{voices("items.1.text")}
							</p>
							<footer className="mt-6 text-[13px] text-[#6d655c]">
								<span className="font-semibold text-[#1c1916]">{voices("items.1.name")}</span>
								<span className="mx-2 text-black/20">/</span>
								{voices("items.1.role")}
							</footer>
						</blockquote>
						<p className="mt-8 text-[13px] leading-relaxed text-[#6d655c]">{brand("brand.tagline")}</p>
					</aside>
				</div>
			</div>
		</section>
	);
}
