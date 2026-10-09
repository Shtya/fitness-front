"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import api from "@/utils/axios";
import { AlertCircle, Check, ChevronDown, Loader2, User, Users } from "lucide-react";

const COUNTRY_CODES = [
	{ code: "+20", country: "Egypt" },
	{ code: "+966", country: "Saudi Arabia" },
	{ code: "+971", country: "UAE" },
	{ code: "+1", country: "USA" },
	{ code: "+44", country: "UK" },
];

function FieldError({ id, message }) {
	if (!message) return null;
	return (
		<p id={id} role="alert" className="hm-field__error">
			<AlertCircle aria-hidden="true" size={14} />
			{message}
		</p>
	);
}

export default function ContactUs() {
	const t = useTranslations("home.contact");
	const tHow = useTranslations("home.howItWorks");
	const reduced = useReducedMotion();
	const [countryCode, setCountryCode] = useState("+20");
	const [submitted, setSubmitted] = useState(false);
	const [submitError, setSubmitError] = useState(null);

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
		[t],
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

	const teamSize = watch("teamSize");
	const teamSizeOptions = [
		{ id: "solo", label: t("form.teamSize.solo"), description: t("form.teamSize.soloDesc"), icon: User },
		{ id: "team", label: t("form.teamSize.team"), description: t("form.teamSize.teamDesc"), icon: Users },
	];

	const onSubmit = async data => {
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
			setSubmitError(err?.response?.data?.message || err?.message || t("form.errorGeneric"));
		}
	};

	return (
		<section id="contact-section" aria-labelledby="contact-heading" className="hm-section">
			<div className="hm-container hm-contact">
				<div className="hm-contact__intro">
					<h2 id="contact-heading" className="hm-h2">
						{t("title")}
					</h2>
					<p className="hm-lead mt-5">{t("description")}</p>

					{/* What happens after they get in touch: the real onboarding order. */}
					<ol className="hm-contact__steps">
						{[0, 1, 2].map(i => (
							<li key={i}>
								<span className="hm-contact__step-num" aria-hidden="true">
									{i + 1}
								</span>
								<span>
									<b>{tHow(`steps.${i}.title`)}</b>
									<span className="hm-body block">{tHow(`steps.${i}.description`)}</span>
								</span>
							</li>
						))}
					</ol>
				</div>

				<div className="hm-contact__panel hm-surface">
					<AnimatePresence mode="wait" initial={false}>
						{submitted ? (
							<motion.div
								key="done"
								className="hm-contact__done"
								role="status"
								initial={reduced ? false : { opacity: 0, scale: 0.98 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.3 }}
							>
								<span className="hm-contact__done-icon" aria-hidden="true">
									<Check size={28} strokeWidth={3} />
								</span>
								<h3 className="hm-h3">{t("form.successTitle")}</h3>
								<p className="hm-body">{t("form.successDesc")}</p>
							</motion.div>
						) : (
							<motion.form
								key="form"
								noValidate
								onSubmit={handleSubmit(onSubmit)}
								className="hm-contact__form"
								aria-label={t("form.ariaLabel") || "Contact form"}
								exit={reduced ? undefined : { opacity: 0, transition: { duration: 0.15 } }}
							>
								<div className="grid gap-5 sm:grid-cols-2">
									<div className="hm-field">
										<label htmlFor="contact-username">{t("form.fields.username")}</label>
										<input
											id="contact-username"
											type="text"
											autoComplete="name"
											placeholder={t("form.placeholders.username") || "John Doe"}
											aria-invalid={!!errors.username}
											aria-describedby={errors.username ? "err-username" : undefined}
											{...register("username")}
										/>
										<FieldError id="err-username" message={errors.username?.message} />
									</div>
									<div className="hm-field">
										<label htmlFor="contact-email">{t("form.fields.email")}</label>
										<input
											id="contact-email"
											type="email"
											autoComplete="email"
											inputMode="email"
											placeholder={t("form.placeholders.email") || "you@example.com"}
											aria-invalid={!!errors.email}
											aria-describedby={errors.email ? "err-email" : undefined}
											{...register("email")}
										/>
										<FieldError id="err-email" message={errors.email?.message} />
									</div>
								</div>

								<div className="hm-field">
									<label htmlFor="contact-phone">{t("form.fields.phone")}</label>
									<div className="hm-field__phone" dir="ltr">
										<span className="hm-field__select">
											<select
												value={countryCode}
												onChange={event => setCountryCode(event.target.value)}
												aria-label={t("form.fields.phone")}
											>
												{COUNTRY_CODES.map(item => (
													<option key={item.code} value={item.code}>
														{item.code} {item.country}
													</option>
												))}
											</select>
											<span aria-hidden="true">{countryCode}</span>
											<ChevronDown size={16} aria-hidden="true" />
										</span>
										<input
											id="contact-phone"
											type="tel"
											autoComplete="tel-national"
											inputMode="tel"
											placeholder="10 1234 5678"
											aria-invalid={!!errors.phone}
											aria-describedby={errors.phone ? "err-phone" : undefined}
											{...register("phone")}
										/>
									</div>
									<FieldError id="err-phone" message={errors.phone?.message} />
								</div>

								<fieldset className="hm-field">
									<legend>{t("form.fields.teamSize")}</legend>
									<div
										role="radiogroup"
										aria-describedby={errors.teamSize ? "err-teamsize" : undefined}
										className="grid gap-3 sm:grid-cols-2"
									>
										{teamSizeOptions.map(option => {
											const Icon = option.icon;
											const selected = teamSize === option.id;
											return (
												<button
													key={option.id}
													type="button"
													role="radio"
													aria-checked={selected}
													onClick={() => setValue("teamSize", option.id, { shouldValidate: true })}
													className={`hm-choice hm-focus${errors.teamSize && !selected ? " is-error" : ""}`}
												>
													<span className="hm-choice__icon" aria-hidden="true">
														<Icon size={18} strokeWidth={2} />
													</span>
													<span className="min-w-0 flex-1">
														<span className="hm-choice__title">{option.label}</span>
														<span className="hm-choice__desc">{option.description}</span>
													</span>
													<span className="hm-choice__radio" aria-hidden="true" />
												</button>
											);
										})}
									</div>
									<FieldError id="err-teamsize" message={errors.teamSize?.message} />
								</fieldset>

								{submitError ? <FieldError id="err-submit" message={submitError} /> : null}

								<button type="submit" disabled={isSubmitting} className="hm-btn hm-btn--primary w-full" data-magnetic="0.15">
									{isSubmitting ? (
										<>
											<Loader2 aria-hidden="true" size={18} className="animate-spin" />
											{t("form.submitting")}
										</>
									) : (
										t("form.submit")
									)}
								</button>
							</motion.form>
						)}
					</AnimatePresence>
				</div>
			</div>
		</section>
	);
}
