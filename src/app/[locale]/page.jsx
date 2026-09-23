"use client";

/**
 * DESIGN DIRECTION: Photographic product.
 * VISUAL CONCEPT: A full-bleed gym photo carries the first screen, with the real session logger inside a phone. Below, warm paper and a brand-color band break the page so it is not one black field.
 * COMPOSITION: Photo hero + phone, then the six-stage client file, then role cards on the live theme gradient, then quotes, theme swatches, questions, and the existing contact form.
 * SIGNATURE MOMENT: Workout / meals / report swaps both the background photo and the phone.
 * TRADE-OFF: Pricing stays off. No invented user counts. Theme picker stays live.
 */

import FitnessHero from "@/components/pages/home/hero";
import Journey from "@/components/pages/home/Journey";
import RoleTabsDemo from "@/components/pages/home/RoleTabs";
import Testimonials from "@/components/pages/home/Testimonials";
import ContactUs from "@/components/pages/home/Contactus";
import FAQs from "@/components/pages/home/Faqs";
import Navbar from "@/components/pages/home/Navbar";
import ThemeShowcaseSection from "@/components/pages/home/ThemeSection";
import LandingClose from "@/components/pages/home/LandingClose";

export default function Page() {
	return (
		<div className="min-h-screen w-full overflow-x-hidden bg-[#0b0b0c] text-white antialiased">
			<Navbar />
			<main>
				<FitnessHero />
				<Journey />
				<RoleTabsDemo />
				<Testimonials />
				<ThemeShowcaseSection />
				<FAQs />
				<ContactUs />
			</main>
			<LandingClose />
		</div>
	);
}
