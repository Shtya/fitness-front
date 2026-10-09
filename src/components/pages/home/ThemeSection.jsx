"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Dumbbell, Flame, Utensils } from "lucide-react";
import { COLOR_PALETTES, useTheme } from "@/app/[locale]/theme";
import { SectionHead } from "./ui";

/**
 * White-label demo. Picking a palette re-skins this whole page, not just the
 * preview, because every accent on the homepage reads --color-primary-*.
 */
function ThemePreview() {
	const tRoles = useTranslations("home.roles");
	const tPreview = useTranslations("home.theme.themeShowcase.preview");
	const tBoard = useTranslations("home.hero.board");
	const locale = useLocale();
	const kg = locale === "ar" ? "كجم" : "kg";

	return (
		<div className="hm-theme-preview" aria-hidden="true">
			<div className="hm-theme-preview__top">
				<span className="hm-theme-preview__avatar">SA</span>
				<span className="min-w-0 flex-1">
					<b>{tBoard("client")}</b>
					<small>{tBoard("clientGoal")}</small>
				</span>
				<span className="hm-chip">{tPreview("badges.active")}</span>
			</div>
			<div className="hm-theme-preview__progress">
				<span style={{ width: "50%" }} />
			</div>
			<ul className="hm-theme-preview__rows">
				<li className="is-done">
					<span className="hm-theme-preview__check">
						<Check size={13} strokeWidth={3} />
					</span>
					<Dumbbell size={16} strokeWidth={2} />
					<span className="flex-1">{tBoard("exercise")}</span>
					<b>
						72.5 {kg}
					</b>
				</li>
				<li>
					<span className="hm-theme-preview__check" />
					<Utensils size={16} strokeWidth={2} />
					<span className="flex-1">{tRoles("client.features.nutrition.title")}</span>
					<b>1,850</b>
				</li>
				<li>
					<span className="hm-theme-preview__check" />
					<Flame size={16} strokeWidth={2} />
					<span className="flex-1">{tRoles("client.features.progress.title")}</span>
					<b>6/12</b>
				</li>
			</ul>
			<div className="hm-theme-preview__actions">
				<span className="hm-theme-preview__btn">{tPreview("sampleButton")}</span>
				<span className="hm-theme-preview__btn is-secondary">{tPreview("secondaryButton")}</span>
			</div>
		</div>
	);
}

export default function ThemeShowcaseSection() {
	const t = useTranslations("home.theme.themeShowcase");
	const { theme: currentTheme, setTheme } = useTheme();
	const entries = useMemo(() => Object.entries(COLOR_PALETTES), []);
	const current = COLOR_PALETTES[currentTheme] || entries[0][1];

	/**
	 * The new palette washes over the whole page from the swatch that was picked.
	 * Palette variables are written inside the view-transition callback so the
	 * "after" snapshot already has them; the provider then persists the choice.
	 */
	const pick = (key, origin) => {
		if (key === currentTheme) return;
		const palette = COLOR_PALETTES[key];
		const root = document.documentElement;
		const apply = () => {
			Object.entries(palette.primary).forEach(([shade, color]) => root.style.setProperty(`--color-primary-${shade}`, color));
			Object.entries(palette.secondary).forEach(([shade, color]) => root.style.setProperty(`--color-secondary-${shade}`, color));
			root.style.setProperty("--color-gradient-from", palette.gradient.from);
			root.style.setProperty("--color-gradient-via", palette.gradient.via);
			root.style.setProperty("--color-gradient-to", palette.gradient.to);
			setTheme(key);
		};
		const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (calm || typeof document.startViewTransition !== "function") {
			apply();
			return;
		}
		const rect = origin?.getBoundingClientRect();
		root.style.setProperty("--wipe-x", `${rect ? rect.left + rect.width / 2 : window.innerWidth / 2}px`);
		root.style.setProperty("--wipe-y", `${rect ? rect.top + rect.height / 2 : window.innerHeight / 2}px`);
		root.classList.add("hm-wiping");
		const transition = document.startViewTransition(apply);
		transition.finished.finally(() => root.classList.remove("hm-wiping"));
	};

	const move = delta => {
		const index = entries.findIndex(([key]) => key === currentTheme);
		const next = entries[(index + delta + entries.length) % entries.length][0];
		const el = document.getElementById(`theme-swatch-${next}`);
		pick(next, el);
		el?.focus();
	};

	// Preview card leans toward the pointer.
	const tilt = event => {
		const card = event.currentTarget.querySelector(".hm-theme-preview");
		if (!card || !window.matchMedia("(hover: hover)").matches) return;
		const rect = card.getBoundingClientRect();
		const x = (event.clientX - rect.left) / rect.width - 0.5;
		const y = (event.clientY - rect.top) / rect.height - 0.5;
		card.style.setProperty("--tilt-x", `${(-y * 10).toFixed(2)}deg`);
		card.style.setProperty("--tilt-y", `${(x * 12).toFixed(2)}deg`);
	};
	const untilt = event => {
		const card = event.currentTarget.querySelector(".hm-theme-preview");
		card?.style.setProperty("--tilt-x", "0deg");
		card?.style.setProperty("--tilt-y", "0deg");
	};

	return (
		<section
			id="theme-showcase-section"
			aria-labelledby="theme-showcase-heading"
			className="hm-section hm-night hm-theme-section"
		>
			<div className="hm-mesh is-soft" aria-hidden="true">
				<span />
				<span />
				<span />
			</div>
			<div className="hm-grain" aria-hidden="true" />
			<div className="hm-container">
				<div className="hm-theme">
					<div>
						<SectionHead id="theme-showcase-heading" title={t("title")} lead={t("description")} />
						<div className="mt-10">
							<p id="theme-swatches-label" className="hm-theme__label">
								{t("selectorTitle")}
								<span>{current.name}</span>
							</p>
							<div
								role="radiogroup"
								aria-labelledby="theme-swatches-label"
								className="hm-theme__swatches"
								onKeyDown={event => {
									const rtl = document.documentElement.dir === "rtl";
									if (event.key === (rtl ? "ArrowLeft" : "ArrowRight") || event.key === "ArrowDown") {
										event.preventDefault();
										move(1);
									}
									if (event.key === (rtl ? "ArrowRight" : "ArrowLeft") || event.key === "ArrowUp") {
										event.preventDefault();
										move(-1);
									}
								}}
							>
								{entries.map(([key, palette]) => {
									const on = currentTheme === key;
									return (
										<button
											key={key}
											id={`theme-swatch-${key}`}
											type="button"
											role="radio"
											aria-checked={on}
											aria-label={palette.name}
											title={palette.name}
											tabIndex={on ? 0 : -1}
											onClick={event => pick(key, event.currentTarget)}
											className="hm-theme__swatch"
											style={{
												"--swatch-a": palette.primary[500],
												"--swatch-b": palette.primary[700],
											}}
										>
											{on ? <Check size={16} strokeWidth={3} aria-hidden="true" /> : null}
										</button>
									);
								})}
							</div>
							<p className="hm-body mt-4">{t("hint")}</p>
						</div>
					</div>
					<div className="hm-theme__stage" onPointerMove={tilt} onPointerLeave={untilt}>
						<ThemePreview />
					</div>
				</div>
			</div>
		</section>
	);
}
