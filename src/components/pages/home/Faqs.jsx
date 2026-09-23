"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, Search } from "lucide-react";

function displayFont(locale) {
	return locale === "ar"
		? "var(--font-arabic), sans-serif"
		: "var(--font-space-grotesk), var(--font-open-sans), sans-serif";
}

export default function FAQs() {
	const [searchQuery, setSearchQuery] = useState("");
	const [activeCategory, setActiveCategory] = useState("all");
	const [openIndex, setOpenIndex] = useState(null);
	const t = useTranslations("home.faqs");
	const locale = useLocale();
	const font = displayFont(locale);

	const categories = [
		{ id: "all", label: t("categories.all") },
		{ id: "general", label: t("categories.general") },
		{ id: "membership", label: t("categories.membership") },
		{ id: "training", label: t("categories.training") },
		{ id: "billing", label: t("categories.billing") },
		{ id: "technical", label: t("categories.technical") },
	];

	const faqs = [
		{ category: "general", question: t("questions.general.0.question"), answer: t("questions.general.0.answer") },
		{ category: "general", question: t("questions.general.1.question"), answer: t("questions.general.1.answer") },
		{ category: "general", question: t("questions.general.2.question"), answer: t("questions.general.2.answer") },
		{ category: "membership", question: t("questions.membership.0.question"), answer: t("questions.membership.0.answer") },
		{ category: "membership", question: t("questions.membership.1.question"), answer: t("questions.membership.1.answer") },
		{ category: "training", question: t("questions.training.0.question"), answer: t("questions.training.0.answer") },
		{ category: "billing", question: t("questions.billing.0.question"), answer: t("questions.billing.0.answer") },
		{ category: "technical", question: t("questions.technical.0.question"), answer: t("questions.technical.0.answer") },
	];

	const filtered = faqs.filter((item) => {
		const inCategory = activeCategory === "all" || item.category === activeCategory;
		const q = searchQuery.trim().toLowerCase();
		const inSearch = !q || item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q);
		return inCategory && inSearch;
	});

	return (
		<section
			id="faqs-section"
			aria-labelledby="faqs-heading"
			className="bg-[#f7f4ee] px-5 py-20 text-[#1c1916] sm:px-8 sm:py-28 lg:px-12"
		>
			<div className="mx-auto max-w-[1180px]">
				<div className="grid gap-8 lg:grid-cols-12 lg:items-end">
					<div className="lg:col-span-7">
						<h2
							id="faqs-heading"
							className="text-[clamp(2rem,4vw,3.25rem)] leading-[1.02] text-[#1c1916] ltr:tracking-[-0.04em]"
							style={{ fontFamily: font }}
						>
							{t("title")}
						</h2>
						<p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[#5c5348]">{t("description")}</p>
					</div>
					<label className="relative block lg:col-span-5">
						<span className="sr-only">{t("searchPlaceholder")}</span>
						<Search aria-hidden="true" className="pointer-events-none absolute start-0 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a8176]" />
						<input
							type="search"
							value={searchQuery}
							onChange={(event) => {
								setSearchQuery(event.target.value);
								setOpenIndex(null);
							}}
							placeholder={t("searchPlaceholder")}
							className="w-full border-b border-black/15 bg-transparent py-3 ps-7 text-[15px] text-[#1c1916] outline-none placeholder:text-[#8a8176] focus:border-[var(--color-primary-600)]"
						/>
					</label>
				</div>

				<div className="mt-8 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={t("badge")}>
					{categories.map((category) => {
						const on = activeCategory === category.id;
						return (
							<button
								key={category.id}
								type="button"
								role="tab"
								aria-selected={on}
								onClick={() => {
									setActiveCategory(category.id);
									setOpenIndex(null);
								}}
								className={[
									"shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)]",
									on ? "bg-[#1c1916] text-white" : "text-[#6d655c] hover:text-[#1c1916]",
								].join(" ")}
							>
								{category.label}
							</button>
						);
					})}
				</div>

				<div className="mt-4 border-t border-black/10" role="list">
					{filtered.length === 0 && (
						<div className="py-16">
							<h3 className="text-lg font-semibold text-[#1c1916]">{t("noResults.title")}</h3>
							<p className="mt-2 max-w-md text-[14px] text-[#6d655c]">{t("noResults.description")}</p>
						</div>
					)}

					{filtered.map((faq, index) => {
						const isOpen = openIndex === index;
						return (
							<div key={`${faq.category}-${faq.question}`} role="listitem" className="border-b border-black/10">
								<button
									type="button"
									aria-expanded={isOpen}
									aria-controls={`faq-answer-${index}`}
									id={`faq-trigger-${index}`}
									onClick={() => setOpenIndex(isOpen ? null : index)}
									className="flex w-full items-center justify-between gap-6 py-5 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary-400)]"
								>
									<h3 className="text-[1.05rem] font-medium leading-snug text-[#1c1916] sm:text-[1.15rem]">{faq.question}</h3>
									<ChevronDown
										aria-hidden="true"
										className={["h-4 w-4 shrink-0 text-[#8a8176] transition-transform duration-200", isOpen ? "rotate-180" : ""].join(" ")}
									/>
								</button>
								<div
									id={`faq-answer-${index}`}
									role="region"
									aria-labelledby={`faq-trigger-${index}`}
									className={["overflow-hidden transition-[max-height,opacity] duration-300", isOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"].join(" ")}
								>
									<p className="max-w-3xl pb-6 text-[15px] leading-relaxed text-[#5c5348]">{faq.answer}</p>
								</div>
							</div>
						);
					})}
				</div>

				<div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p className="text-[15px] font-semibold text-[#1c1916]">{t("cta.title")}</p>
						<p className="mt-1 text-[14px] text-[#6d655c]">{t("cta.description")}</p>
					</div>
					<a
						href="#contact-section"
						className="inline-flex h-11 items-center rounded-full bg-[#1c1916] px-5 text-[14px] font-semibold text-white no-underline"
					>
						{t("cta.email")}
					</a>
				</div>
			</div>
		</section>
	);
}
