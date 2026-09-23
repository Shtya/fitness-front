"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { COLOR_PALETTES, useTheme } from "@/app/[locale]/theme";

function displayFont(locale) {
	return locale === "ar"
		? "var(--font-arabic), sans-serif"
		: "var(--font-space-grotesk), var(--font-open-sans), sans-serif";
}

export default function ThemeShowcaseSection() {
	const t = useTranslations("home.theme.themeShowcase");
	const locale = useLocale();
	const { theme: currentTheme, setTheme } = useTheme();
	const font = displayFont(locale);
	const entries = useMemo(() => Object.entries(COLOR_PALETTES), []);

	return (
		<section
			id="theme-showcase-section"
			aria-labelledby="theme-showcase-heading"
			className="bg-white px-5 py-16 text-[#1c1916] sm:px-8 sm:py-20 lg:px-12"
		>
			<div className="mx-auto max-w-[1180px]">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div className="max-w-xl">
						<h2
							id="theme-showcase-heading"
							className="text-[clamp(1.7rem,3vw,2.4rem)] leading-tight text-[#1c1916] ltr:tracking-[-0.035em]"
							style={{ fontFamily: font }}
						>
							{t("title")}
						</h2>
						<p className="mt-3 text-[15px] leading-relaxed text-[#5c5348]">{t("description")}</p>
					</div>
					<p className="text-[13px] text-[#6d655c]">{t("hint")}</p>
				</div>

				<div
					role="listbox"
					aria-label={t("selectorTitle")}
					className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8"
				>
					{entries.map(([key, palette]) => {
						const on = currentTheme === key;
						return (
							<button
								key={key}
								type="button"
								role="option"
								aria-selected={on}
								onClick={() => setTheme(key)}
								className={[
									"rounded-lg p-2 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-300)]",
									on ? "bg-[#f3efe6]" : "hover:bg-[#f7f4ee]",
								].join(" ")}
							>
								<span
									aria-hidden="true"
									className="block h-14 w-full rounded-md"
									style={{
										background: `linear-gradient(90deg, ${palette.gradient.from}, ${palette.gradient.to})`,
									}}
								/>
								<span className={["mt-2 block truncate text-[12px]", on ? "font-semibold text-[#1c1916]" : "text-[#6d655c]"].join(" ")}>
									{palette.name}
								</span>
							</button>
						);
					})}
				</div>
			</div>
		</section>
	);
}
