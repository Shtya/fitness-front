"use client";

/**
 * So7baFit homepage — "Night session".
 *
 * Rhythm: night hero (the coaching desk) → ruled-paper workflow (pinned, sideways)
 * → night inbox (pinned, the conversation plays) → accent feature band → paper roles
 * → night theme (palette wipe) → voices → FAQ → contact → night close.
 * The accent is always the live theme colour (--color-primary-*). Reduced motion
 * turns off smooth scroll, pins and scrubs; everything stays readable and usable.
 */

import { useLocale } from "next-intl";
import Navbar from "@/components/pages/home/Navbar";
import Hero from "@/components/pages/home/hero";
import Journey from "@/components/pages/home/Journey";
import InboxShowcase from "@/components/pages/home/InboxShowcase";
import RoleTabs from "@/components/pages/home/RoleTabs";
import ThemeShowcaseSection from "@/components/pages/home/ThemeSection";
import Testimonials from "@/components/pages/home/Testimonials";
import FAQs from "@/components/pages/home/Faqs";
import ContactUs from "@/components/pages/home/Contactus";
import LandingClose from "@/components/pages/home/LandingClose";
import FeatureMarquee from "@/components/pages/home/FeatureMarquee";
import SmoothScroll from "@/components/pages/home/motion/SmoothScroll";
import MagneticLayer from "@/components/pages/home/motion/MagneticLayer";
import { archivo } from "@/components/pages/home/fonts";
import "@/components/pages/home/home.css";

export default function Page() {
	const locale = useLocale();
	return (
		<div
			className={`hm ${archivo.variable} min-h-screen w-full overflow-x-clip`}
			lang={locale}
			dir={locale === "ar" ? "rtl" : "ltr"}
		>
			<SmoothScroll />
			<MagneticLayer />
			<Navbar />
			<main>
				<Hero />
				<Journey />
				<InboxShowcase />
				<FeatureMarquee />
				<RoleTabs />
				<ThemeShowcaseSection />
				<Testimonials />
				<FAQs />
				<ContactUs />
			</main>
			<LandingClose />
		</div>
	);
}
