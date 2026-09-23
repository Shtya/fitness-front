"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarRange, ClipboardList, Dumbbell, LineChart, Search, UserRound } from "lucide-react";
import ClientFile, { STAGE_IDS } from "./ClientFile";

function displayFont(locale) {
	return locale === "ar"
		? "var(--font-arabic), sans-serif"
		: "var(--font-space-grotesk), var(--font-open-sans), sans-serif";
}

export default function Journey() {
	const [stage, setStage] = useState("intake");
	const locale = useLocale();
	const t = useTranslations("home.steps");
	const tHow = useTranslations("home.howItWorks");
	const font = displayFont(locale);
	const active = STAGE_IDS.includes(stage) ? stage : "intake";
	const icons = {
		intake: ClipboardList,
		review: Search,
		account: UserRound,
		plans: CalendarRange,
		assignment: Dumbbell,
		followup: LineChart,
	};

	return (
		<section
			id="how-it-works-section"
			aria-labelledby="journey-heading"
			className="bg-[#f3efe6] px-5 py-20 text-[#1c1916] sm:px-8 sm:py-28 lg:px-12"
		>
			<div className="mx-auto max-w-[1180px]">
				<div className="max-w-xl">
					<p className="text-[12px] font-semibold text-[#8a5a32] ltr:uppercase ltr:tracking-[0.18em]">{t("badge")}</p>
					<h2
						id="journey-heading"
						className="mt-4 text-[clamp(2rem,4vw,3.4rem)] leading-[1.02] text-[#1c1916] ltr:tracking-[-0.04em]"
						style={{ fontFamily: font }}
					>
						{tHow("title")}
					</h2>
					<p className="mt-4 text-[15px] leading-relaxed text-[#5c5348]">{t("description")}</p>
				</div>

				<div className="mt-8 flex gap-2 overflow-x-auto pb-1 lg:hidden">
						{STAGE_IDS.map((id, i) => {
							const on = active === id;
							const Icon = icons[id];
							return (
								<button
									key={id}
									type="button"
									aria-pressed={on}
									onClick={() => setStage(id)}
									className={[
										"flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)]",
										on ? "bg-[#1c1916] text-white" : "bg-white text-[#5c5348]",
									].join(" ")}
								>
									<Icon className="h-4 w-4" aria-hidden="true" />
									<span className="tabular-nums opacity-50">{String(i + 1).padStart(2, "0")}</span>
									{t(`steps.${id}.title`)}
								</button>
							);
						})}
				</div>

				<div className="mt-10 grid items-start gap-10 lg:grid-cols-12 lg:gap-16">
				<div className="lg:col-span-5 lg:sticky lg:top-24 lg:self-start">
					<div className="lg:hidden">
						<p className="mb-4 text-[15px] leading-relaxed text-[#5c5348]">{t(`steps.${active}.description`)}</p>
					</div>
					<ClientFile stage={active} />
				</div>

				<div className="hidden lg:col-span-7 lg:block">
					<ol className="border-t border-black/10">
						{STAGE_IDS.map((id, i) => {
							const on = active === id;
							const Icon = icons[id];
							return (
								<li key={id}>
									<button
										type="button"
										aria-expanded={on}
										aria-controls={`journey-panel-${id}`}
										onClick={() => setStage(id)}
										className="group grid w-full grid-cols-[3rem_1fr] gap-3 border-b border-black/10 py-5 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary-400)] sm:py-6"
									>
										<span
											className={[
												"flex h-12 w-12 items-center justify-center rounded-2xl",
												on ? "bg-[var(--color-primary-600)] text-white" : "bg-white text-[#5c5348]",
											].join(" ")}
										>
											<Icon className="h-5 w-5" aria-hidden="true" />
										</span>
										<span className="min-w-0">
											<span className="block text-[12px] tabular-nums text-[#8a8176]">{String(i + 1).padStart(2, "0")}</span>
											<span
												className={[
													"mt-1 block text-[1.35rem] leading-tight ltr:tracking-[-0.03em]",
													on ? "text-[#1c1916]" : "text-[#8a8176] group-hover:text-[#1c1916]",
												].join(" ")}
												style={{ fontFamily: font }}
											>
												{t(`steps.${id}.title`)}
											</span>
											<span
												id={`journey-panel-${id}`}
												className={[
													"block overflow-hidden text-[14px] leading-relaxed text-[#5c5348] transition-[max-height,margin,opacity] duration-300",
													on ? "mt-2 max-h-40 opacity-100" : "max-h-0 opacity-0",
												].join(" ")}
											>
												{t(`steps.${id}.description`)}
											</span>
										</span>
									</button>
								</li>
							);
						})}
					</ol>
				</div>
				</div>
			</div>
		</section>
	);
}
