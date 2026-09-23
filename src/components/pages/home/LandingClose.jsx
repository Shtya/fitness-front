"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BRAND_LOGO_SRC } from "@/lib/brand";

export default function LandingClose() {
	const t = useTranslations("home.footer");
	const nav = useTranslations("home.navbar");

	const links = [
		{ href: "#how-it-works-section", label: nav("nav.about") },
		{ href: "#role-tabs-section", label: nav("nav.community") },
		{ href: "#voices", label: t("links.product.testimonials") },
		{ href: "#faqs-section", label: nav("nav.faqs") },
		{ href: "#contact-section", label: nav("nav.contact") },
	];

	return (
		<footer className="bg-[#1c1916] px-5 py-12 sm:px-8 lg:px-12">
			<div className="mx-auto flex max-w-[1180px] flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
				<div className="max-w-sm">
					<Link href="/" className="inline-flex items-center gap-2.5">
						<img src={BRAND_LOGO_SRC} alt="" className="h-8 w-8 rounded-md object-contain" />
						<span className="text-[15px] font-semibold text-white">{nav("brand.name")}</span>
					</Link>
					<p className="mt-3 text-[13px] leading-relaxed text-white/45">{t("brand.description")}</p>
				</div>
				<nav aria-label={nav("mobile.sectionNav")} className="flex flex-wrap gap-x-5 gap-y-2">
					{links.map((item) => (
						<a
							key={item.href}
							href={item.href}
							className="text-[13px] text-white/55 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)]"
						>
							{item.label}
						</a>
					))}
				</nav>
			</div>
			<p className="mx-auto mt-10 max-w-[1180px] text-[12px] text-white/30">{t("copyright.text")}</p>
		</footer>
	);
}
