"use client";

import { useLocale, useTranslations } from "next-intl";

function displayFont(locale) {
	return locale === "ar"
		? "var(--font-arabic), sans-serif"
		: "var(--font-space-grotesk), var(--font-open-sans), sans-serif";
}

export default function Testimonials() {
	const t = useTranslations("home.testimonials");
	const locale = useLocale();
	const font = displayFont(locale);
	const items = [0, 1, 2, 3];

	return (
		<section
			id="voices"
			aria-labelledby="voices-heading"
			className="bg-[#f3efe6] px-5 py-20 text-[#1c1916] sm:px-8 sm:py-28 lg:px-12"
		>
			<div className="mx-auto max-w-[1180px]">
				<div className="grid gap-8 lg:grid-cols-12 lg:items-end">
					<h2
						id="voices-heading"
						className="text-[clamp(2rem,4vw,3.25rem)] leading-[1.02] text-[#1c1916] lg:col-span-7 ltr:tracking-[-0.04em]"
						style={{ fontFamily: font }}
					>
						{t("title")}
					</h2>
					<p className="text-[15px] leading-relaxed text-[#5c5348] lg:col-span-5">{t("description")}</p>
				</div>

				<div className="mt-14 border-t border-black/10">
					{items.map((i) => (
						<article
							key={i}
							className="grid gap-4 border-b border-black/10 py-8 sm:py-10 lg:grid-cols-12 lg:gap-8"
						>
							<div className="flex items-center gap-3 lg:col-span-3">
								<span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-primary-500)] text-[15px] font-semibold text-white">
									{t(`items.${i}.name`).slice(0, 1)}
								</span>
								<div>
									<p className="text-[15px] font-semibold text-[#1c1916]">{t(`items.${i}.name`)}</p>
									<p className="mt-0.5 text-[13px] text-[#6d655c]">{t(`items.${i}.role`)}</p>
								</div>
							</div>
							<blockquote
								className={[
									"text-[#1c1916] lg:col-span-6",
									i === 0
										? "text-[1.35rem] leading-snug sm:text-[1.65rem] ltr:tracking-[-0.03em]"
										: "text-[1.05rem] leading-relaxed",
								].join(" ")}
								style={i === 0 ? { fontFamily: font } : undefined}
							>
								{t(`items.${i}.text`)}
							</blockquote>
							<p className="text-[13px] leading-relaxed text-[var(--color-primary-700)] lg:col-span-3 lg:text-end">
								{t(`items.${i}.achievement`)}
							</p>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}
