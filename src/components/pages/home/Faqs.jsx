"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Plus, Search } from "lucide-react";

export default function FAQs() {
	const [searchQuery, setSearchQuery] = useState("");
	const [activeCategory, setActiveCategory] = useState("all");
	const [openKey, setOpenKey] = useState(null);
	const t = useTranslations("home.faqs");
	const reduced = useReducedMotion();
	const baseId = useId();

	const categories = ["all", "general", "membership", "training", "billing", "technical"].map(id => ({
		id,
		label: t(`categories.${id}`),
	}));

	const faqs = [
		["general", 0],
		["general", 1],
		["general", 2],
		["membership", 0],
		["membership", 1],
		["training", 0],
		["billing", 0],
		["technical", 0],
	].map(([category, i]) => ({
		key: `${category}-${i}`,
		category,
		question: t(`questions.${category}.${i}.question`),
		answer: t(`questions.${category}.${i}.answer`),
	}));

	const q = searchQuery.trim().toLowerCase();
	const filtered = faqs.filter(item => {
		const inCategory = activeCategory === "all" || item.category === activeCategory;
		const inSearch = !q || item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q);
		return inCategory && inSearch;
	});

	return (
		<section id="faqs-section" aria-labelledby="faqs-heading" className="hm-section hm-section--chalk">
			<div className="hm-container hm-faq">
				<div className="hm-faq__aside">
					<h2 id="faqs-heading" className="hm-h2">
						{t("title")}
					</h2>
					<p className="hm-lead mt-5">{t("description")}</p>

					<label className="hm-faq__search">
						<span className="sr-only">{t("searchPlaceholder")}</span>
						<Search aria-hidden="true" size={18} strokeWidth={2} />
						<input
							type="search"
							value={searchQuery}
							onChange={event => {
								setSearchQuery(event.target.value);
								setOpenKey(null);
							}}
							placeholder={t("searchPlaceholder")}
						/>
					</label>

					<div className="hm-faq__cats" role="group" aria-label={t("badge")}>
						{categories.map(category => (
							<button
								key={category.id}
								type="button"
								aria-pressed={activeCategory === category.id}
								onClick={() => {
									setActiveCategory(category.id);
									setOpenKey(null);
								}}
								className="hm-faq__cat hm-focus"
							>
								{category.label}
							</button>
						))}
					</div>

					<div className="hm-faq__more">
						<p className="font-semibold">{t("cta.title")}</p>
						<p className="hm-body mt-1">{t("cta.description")}</p>
						<a href="#contact-section" className="hm-link hm-focus mt-3 inline-block">
							{t("cta.email")}
						</a>
					</div>
				</div>

				<div className="hm-faq__list" aria-live="polite">
					{filtered.length === 0 ? (
						<div className="hm-faq__empty">
							<p className="text-lg font-semibold">{t("noResults.title")}</p>
							<p className="hm-body mt-2">{t("noResults.description")}</p>
						</div>
					) : (
						filtered.map(faq => {
							const isOpen = openKey === faq.key;
							const triggerId = `${baseId}-q-${faq.key}`;
							const panelId = `${baseId}-a-${faq.key}`;
							return (
								<div key={faq.key} className={`hm-faq__item${isOpen ? " is-open" : ""}`}>
									<h3 className="m-0">
										<button
											type="button"
											id={triggerId}
											aria-expanded={isOpen}
											aria-controls={panelId}
											onClick={() => setOpenKey(isOpen ? null : faq.key)}
											className="hm-faq__q hm-focus"
										>
											<span>{faq.question}</span>
											<span className="hm-faq__icon" aria-hidden="true">
												<Plus size={18} strokeWidth={2} />
											</span>
										</button>
									</h3>
									<AnimatePresence initial={false}>
										{isOpen ? (
											<motion.div
												id={panelId}
												role="region"
												aria-labelledby={triggerId}
												className="overflow-hidden"
												initial={reduced ? false : { height: 0, opacity: 0 }}
												animate={{ height: "auto", opacity: 1 }}
												exit={{ height: 0, opacity: 0 }}
												transition={{ duration: reduced ? 0 : 0.28, ease: [0.2, 0.8, 0.2, 1] }}
											>
												<p className="hm-faq__a">{faq.answer}</p>
											</motion.div>
										) : null}
									</AnimatePresence>
								</div>
							);
						})
					)}
				</div>
			</div>
		</section>
	);
}
