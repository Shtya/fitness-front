// --- File: registry/index.jsx ---
import React from "react"
import { Navigation, Rocket, BarChart3, Sparkles, CreditCard, MessageCircle, Megaphone, FileText, HelpCircle, ArrowDown, Flag, Type, Heading, MousePointerClick, Image as ImgIcon, Video, LayoutGrid, MoveVertical, Minus, Code, RectangleHorizontal, ImageIcon, PanelBottom, Images, } from "lucide-react"
import { RenderNavbar, RenderHero, RenderStats, RenderFeatures, RenderPricing, RenderTestimonials, RenderCTA, RenderForm, RenderFAQ, RenderFooter, RenderText, RenderHeading, RenderButton, RenderImage, RenderVideo, RenderGallery, RenderBanner, RenderSpacer, RenderDivider, RenderHTML, } from "./sections"
import { NavbarEditor, HeroEditor, StatsEditor, FeaturesEditor, PricingEditor, TestimonialsEditor, CTAEditor, FormEditor, FAQEditor, FooterEditor, BannerEditor, TextEditor, HeadingEditor, ButtonEditor, ImageEditor, VideoEditor, GalleryEditor, SpacerEditor, DividerEditor, HTMLEditor, } from "./editors"

const commonStyle = {
	style: { padding: [0, 0, 0, 0], margin: [0, 0, 0, 0], background: "", shadow: "none", radius: null },
}

// -------------------- SCHEMA HELPERS --------------------
const schemaCommon = {
	style: {
		key: "style",
		title: "Style",
		description: "Spacing & shape",
		fields: [
			{ label: "Radius", type: "slider", path: "style.radius", min: 0, max: 24, step: 2, defaultValue: 12 },
		],
	},
	colors: {
		key: "colors",
		title: "Inner Colors",
		description: "Override global theme for this section",
		fields: [
			{ label: "Primary", type: "color", path: "colors.primary", fallbackFromThemeKey: "primary" },
			{ label: "Secondary", type: "color", path: "colors.secondary", fallbackFromThemeKey: "secondary" },
			{ label: "Page Background", type: "color", path: "colors.pageBackground", fallbackFromThemeKey: "pageBackground" },
			{
				label: "Section Background",
				type: "color",
				path: "colors.sectionBackground",
				fallbackFromThemeKey: "sectionBackground",
			},
			{ label: "Title Text", type: "color", path: "colors.titleText", fallbackFromThemeKey: "titleText" },
			{ label: "Body Text", type: "color", path: "colors.bodyText", fallbackFromThemeKey: "bodyText" },
			{ label: "Button Text", type: "color", path: "colors.buttonText", fallbackFromThemeKey: "buttonText" },
			{ label: "Outline", type: "color", path: "colors.outline", fallbackFromThemeKey: "outline" },
		],
	},
}

function makeSchema(sections) {
	return { sections }
}

function schemaNavbar() {
	return makeSchema([
		{
			key: "content",
			title: "Content",
			description: "Brand & links",
			fields: [
				{ label: "Brand Name", type: "input", path: "brandName", placeholder: "Brand" },
				{ label: "Logo URL", type: "input", path: "logo", placeholder: "https://..." },
				{ label: "CTA Text", type: "input", path: "ctaText", placeholder: "Get Started" },
				{ label: "CTA Href", type: "input", path: "ctaHref", placeholder: "#contact" },
				{ label: "Sticky", type: "switch", path: "sticky" },
			],
		},
		schemaCommon.style,
		schemaCommon.colors,
	])
}

function schemaHero() {
	return makeSchema([
		{
			key: "content",
			title: "Content",
			description: "Text & media",
			fields: [
				{ label: "Anchor", type: "input", path: "anchor", placeholder: "home" },
				{ label: "TopHeadline", type: "input", path: "topheadline" },
				{ label: "Headline", type: "textarea", path: "headline" },
				{ label: "Subheadline", type: "textarea", path: "subheadline" },
				{ label: "Image URL", type: "input", path: "imageUrl", placeholder: "https://..." },
				{ label: "Primary CTA Text", type: "input", path: "primaryCtaText" },
				{ label: "Primary CTA Href", type: "input", path: "primaryCtaHref" },
				{ label: "Secondary CTA Text", type: "input", path: "secondaryCtaText" },
				{ label: "Secondary CTA Href", type: "input", path: "secondaryCtaHref" },
			],
		},
		schemaCommon.style,
		schemaCommon.colors,
	])
}

function schemaStats() {
	return makeSchema([
		{
			key: "content",
			title: "Content",
			description: "Title & items",
			fields: [
				{ label: "Anchor", type: "input", path: "anchor", placeholder: "stats" },
				{ label: "Title", type: "input", path: "title", placeholder: "Trusted by..." },
			],
		},
		schemaCommon.style,
		schemaCommon.colors,
	])
}

function schemaFeatures() {
	return makeSchema([
		{
			key: "content",
			title: "Content",
			description: "Title & items",
			fields: [
				{ label: "Anchor", type: "input", path: "anchor", placeholder: "features" },
				{ label: "Title", type: "input", path: "title" },
				{ label: "Subtitle", type: "input", path: "subtitle" },
			],
		},
		schemaCommon.style,
		schemaCommon.colors,
	])
}

function schemaPricing() {
	return makeSchema([
		{
			key: "content",
			title: "Content",
			description: "Title & plans",
			fields: [
				{ label: "Anchor", type: "input", path: "anchor", placeholder: "pricing" },
				{ label: "Title", type: "input", path: "title" },
				{ label: "Subtitle", type: "input", path: "subtitle" },
			],
		},
		schemaCommon.style,
		schemaCommon.colors,
	])
}

function schemaTestimonials() {
	return makeSchema([
		{
			key: "content",
			title: "Content",
			description: "Title & quotes",
			fields: [
				{ label: "Anchor", type: "input", path: "anchor", placeholder: "testimonials" },
				{ label: "Title", type: "input", path: "title" },
			],
		},
		schemaCommon.style,
		schemaCommon.colors,
	])
}

function schemaCTA() {
	return makeSchema([
		{
			key: "content",
			title: "Content",
			description: "Call to action",
			fields: [
				{ label: "Anchor", type: "input", path: "anchor", placeholder: "cta" },
				{ label: "Title", type: "textarea", path: "title" },
				{ label: "Subtitle", type: "textarea", path: "subtitle" },
				{ label: "CTA Text", type: "input", path: "ctaText" },
				{ label: "CTA Href", type: "input", path: "ctaHref" },
			],
		},
		schemaCommon.style,
		schemaCommon.colors,
	])
}

function schemaForm() {
	return makeSchema([
		{
			key: "content",
			title: "Content",
			description: "Form content",
			fields: [
				{ label: "Anchor", type: "input", path: "anchor", placeholder: "contact" },
				{ label: "Title", type: "input", path: "title" },
				{ label: "Subtitle", type: "input", path: "subtitle" },
				{ label: "Submit Text", type: "input", path: "submitText" },
			],
		},
		schemaCommon.style,
		schemaCommon.colors,
	])
}

function schemaFAQ() {
	return makeSchema([
		{
			key: "content",
			title: "Content",
			description: "FAQ content",
			fields: [
				{ label: "Anchor", type: "input", path: "anchor", placeholder: "faq" },
				{ label: "Title", type: "input", path: "title" },
			],
		},
		schemaCommon.style,
		schemaCommon.colors,
	])
}

function schemaFooter() {
	return makeSchema([
		{
			key: "content",
			title: "Content",
			description: "Footer content",
			fields: [
				{ label: "Brand Name", type: "input", path: "brandName" },
				{ label: "Tagline", type: "input", path: "tagline" },
				{ label: "Copyright", type: "input", path: "copyright" },
			],
		},
		schemaCommon.style,
		schemaCommon.colors,
	])
}

function schemaBanner() {
	return makeSchema([
		{
			key: "content",
			title: "Content",
			description: "Banner message",
			fields: [
				{ label: "Message", type: "input", path: "message" },
				{ label: "CTA Text", type: "input", path: "ctaText" },
				{ label: "CTA Href", type: "input", path: "ctaHref" },
			],
		},
		schemaCommon.style,
		schemaCommon.colors,
	])
}

function schemaText() {
	return makeSchema([
		{
			key: "content",
			title: "Content",
			description: "Text settings",
			fields: [
				{ label: "Content", type: "textarea", path: "content" },
				{
					label: "Align",
					type: "select",
					path: "align",
					options: [
						{ label: "Left", value: "left" },
						{ label: "Center", value: "center" },
						{ label: "Right", value: "right" },
					],
				},
				{
					label: "Size",
					type: "select",
					path: "size",
					options: [
						{ label: "Small", value: "sm" },
						{ label: "Base", value: "base" },
						{ label: "Large", value: "lg" },
					],
				},
			],
		},
		schemaCommon.style,
		schemaCommon.colors,
	])
}

function schemaHeading() {
	return makeSchema([
		{
			key: "content",
			title: "Content",
			description: "Heading settings",
			fields: [
				{ label: "Text", type: "input", path: "text" },
				{
					label: "Level",
					type: "select",
					path: "level",
					options: [
						{ label: "H1", value: "1" },
						{ label: "H2", value: "2" },
						{ label: "H3", value: "3" },
						{ label: "H4", value: "4" },
					],
				},
				{
					label: "Align",
					type: "select",
					path: "align",
					options: [
						{ label: "Left", value: "left" },
						{ label: "Center", value: "center" },
						{ label: "Right", value: "right" },
					],
				},
			],
		},
		schemaCommon.style,
		schemaCommon.colors,
	])
}

function schemaButton() {
	return makeSchema([
		{
			key: "content",
			title: "Content",
			description: "Button settings",
			fields: [
				{ label: "Text", type: "input", path: "text" },
				{ label: "Href", type: "input", path: "href", placeholder: "#section" },
				{
					label: "Variant",
					type: "select",
					path: "variant",
					options: [
						{ label: "Primary", value: "primary" },
						{ label: "Secondary", value: "secondary" },
					],
				},
			],
		},
		schemaCommon.style,
		schemaCommon.colors,
	])
}

function schemaImage() {
	return makeSchema([
		{
			key: "content",
			title: "Content",
			description: "Image settings",
			fields: [
				{ label: "URL", type: "input", path: "url", placeholder: "https://..." },
				{ label: "Alt", type: "input", path: "alt" },
				{ label: "Height", type: "input", path: "height", placeholder: "280" },
			],
		},
		schemaCommon.style,
		schemaCommon.colors,
	])
}

function schemaVideo() {
	return makeSchema([
		{
			key: "content",
			title: "Content",
			description: "Video settings",
			fields: [
				{ label: "Title", type: "input", path: "title" },
				{ label: "Embed URL", type: "input", path: "embedUrl", placeholder: "https://www.youtube.com/embed/..." },
				{
					label: "Ratio",
					type: "select",
					path: "ratio",
					options: [
						{ label: "16:9", value: "16:9" },
						{ label: "4:3", value: "4:3" },
					],
				},
			],
		},
		schemaCommon.style,
		schemaCommon.colors,
	])
}

function schemaGallery() {
	return makeSchema([
		{
			key: "content",
			title: "Content",
			description: "Gallery settings",
			fields: [
				{ label: "Title", type: "input", path: "title" },
				{ label: "Columns", type: "input", path: "columns", placeholder: "3" },
			],
		},
		schemaCommon.style,
		schemaCommon.colors,
	])
}

function schemaSpacer() {
	return makeSchema([
		{
			key: "content",
			title: "Content",
			description: "Spacer",
			fields: [{ label: "Height", type: "slider", path: "height", min: 10, max: 200, step: 10, defaultValue: 40 }],
		},
	])
}

function schemaDivider() {
	return makeSchema([
		{
			key: "content",
			title: "Content",
			description: "Divider",
			fields: [{ label: "Thickness", type: "slider", path: "thickness", min: 1, max: 10, step: 1, defaultValue: 1 }],
		},
		schemaCommon.colors,
	])
}

function schemaHTML() {
	return makeSchema([
		{
			key: "content",
			title: "Content",
			description: "Custom HTML",
			fields: [{ label: "HTML", type: "textarea", path: "html", placeholder: "<div>Custom HTML</div>" }],
		},
	])
}

// -------------------- REGISTRY --------------------
export const REGISTRY = {
	// ==================== SECTIONS ====================

	"section.navbar.v1": {
		id: "section.navbar.v1",
		type: "navbar",
		label: "Navbar (Classic)",
		category: "sections",
		Icon: Navigation,
		fieldsSummary: ["brandName", "links[]", "ctaText", "ctaHref", "sticky"],
		makeDefault: ({ uid }) => ({
			id: uid("navbar"),
			type: "navbar",
			designId: "section.navbar.v1",
			variant: "classic",
			brandName: "Brand",
			logo: "",
			links: [
				{ text: "Home", href: "#" },
				{ text: "Features", href: "#features" },
				{ text: "Pricing", href: "#pricing" },
				{ text: "Contact", href: "#contact" },
			],
			ctaText: "Get Started",
			ctaHref: "#contact",
			sticky: true,
			...commonStyle,
		}),
		render: ({ block, theme }) => <RenderNavbar block={block} theme={theme} />,
		Editor: NavbarEditor,
		schema: schemaNavbar(),
	},

	"section.navbar.dark.v1": {
		id: "section.navbar.dark.v1",
		type: "navbar",
		label: "Navbar (Dark)",
		category: "sections",
		Icon: Navigation,
		fieldsSummary: ["brandName", "links[]", "ctaText", "ctaHref", "sticky"],
		makeDefault: ({ uid }) => ({
			id: uid("navbar"),
			type: "navbar",
			designId: "section.navbar.dark.v1",
			variant: "dark",
			brandName: "DarkLaunch",
			logo: "",
			links: [
				{ text: "Overview", href: "#overview" },
				{ text: "Metrics", href: "#metrics" },
				{ text: "Stories", href: "#stories" },
				{ text: "Join", href: "#join" },
			],
			ctaText: "Get Early Access",
			ctaHref: "#join",
			sticky: true,
			colors: { sectionBackground: "#0b1020" },
			...commonStyle,
		}),
		render: ({ block, theme }) => <RenderNavbar block={block} theme={theme} />,
		Editor: NavbarEditor,
		schema: schemaNavbar(),
	},


	"section.hero.v1": {
		id: "section.hero.v1",
		type: "hero",
		label: "Hero (Centered Neon)",
		category: "sections",
		Icon: Rocket,
		fieldsSummary: ["neno", "headline", "subheadline", "primaryCtaText", "primaryCtaHref", "imageUrl", "anchor"],
		makeDefault: ({ uid }) => ({
			id: uid("hero"),
			type: "hero",
			topheadline: "Neon Kit",
			designId: "section.hero.v1",
			variant: "centeredNeon",
			anchor: "why",
			headline: "Neon-fast workflows for modern teams",
			subheadline: "A bright UI kit that converts. Ship pages, launch products, and scale faster.",
			primaryCtaText: "Start Free",
			primaryCtaHref: "#contact",
			secondaryCtaText: "See Features",
			secondaryCtaHref: "#features",
			imageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1400&q=80",
			colors: { sectionBackground: "#0b1020", titleText: "#ffffff", bodyText: "#cbd5e1" },
			...commonStyle,
		}),
		render: ({ block, theme }) => <RenderHero block={block} theme={theme} />,
		Editor: HeroEditor,
		schema: schemaHero(),
	},

	"section.hero.v2": {
		id: "section.hero.v2",
		type: "hero",
		label: "Hero (Showcase Split)",
		category: "sections",
		Icon: Rocket,
		fieldsSummary: ["headline", "subheadline", "primaryCtaText", "primaryCtaHref", "imageUrl", "anchor"],
		makeDefault: ({ uid }) => ({
			id: uid("hero"),
			type: "hero",
			designId: "section.hero.v2",
			variant: "showcaseSplit",
			layout: "imageRight",
			anchor: "work",
			headline: "Design systems that feel expensive",
			subheadline: "Portfolio-driven landing pages for studios, agencies, and freelancers.",
			primaryCtaText: "View Work",
			primaryCtaHref: "#work",
			secondaryCtaText: "Get Proposal",
			secondaryCtaHref: "#contact",
			imageUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=80",
			...commonStyle,
		}),
		render: ({ block, theme }) => <RenderHero block={block} theme={theme} />,
		Editor: HeroEditor,
		schema: schemaHero(),
	},

	"section.hero.v3": {
		id: "section.hero.v3",
		type: "hero",
		label: "Hero (Dark Glow)",
		category: "sections",
		Icon: Rocket,
		fieldsSummary: ["headline", "subheadline", "primaryCtaText", "primaryCtaHref", "imageUrl", "anchor"],
		makeDefault: ({ uid }) => ({
			id: uid("hero"),
			type: "hero",
			designId: "section.hero.v3",
			variant: "darkGlow",
			anchor: "overview",
			headline: "Launch night, every night.",
			subheadline: "A dark startup kit with glow accents and high-contrast CTAs.",
			primaryCtaText: "Get Early Access",
			primaryCtaHref: "#join",
			secondaryCtaText: "See Metrics",
			secondaryCtaHref: "#metrics",
			imageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1400&q=80",
			colors: { sectionBackground: "#070a14", titleText: "#ffffff", bodyText: "#cbd5e1" },
			...commonStyle,
		}),
		render: ({ block, theme }) => <RenderHero block={block} theme={theme} />,
		Editor: HeroEditor,
		schema: schemaHero(),
	},

	// Features Designs (unique per template)
	"section.features.v1": {
		id: "section.features.v1",
		type: "features",
		label: "Features (Bento)",
		category: "sections",
		Icon: Sparkles,
		fieldsSummary: ["title", "subtitle", "items[]", "anchor"],
		makeDefault: ({ uid }) => ({
			id: uid("features"),
			type: "features",
			designId: "section.features.v1",
			variant: "bento",
			anchor: "features",
			title: "Built for speed",
			subtitle: "Bento layout that feels premium",
			items: [
				{ title: "Instant pages", desc: "Compose sections in seconds.", icon: "⚡" },
				{ title: "Smart styling", desc: "Theme-first, override when needed.", icon: "🎛️" },
				{ title: "Conversion-ready", desc: "Patterns tuned for CTR.", icon: "🧲" },
				{ title: "Fast editing", desc: "Inline edits + sidebar schema.", icon: "✍️" },
				{ title: "Reusable blocks", desc: "Save and re-use your best sections.", icon: "🧩" },
				{ title: "Deploy anywhere", desc: "Works great with Next.js.", icon: "🚀" },
			],
			colors: { sectionBackground: "#0b1020", titleText: "#ffffff", bodyText: "#cbd5e1" },
			...commonStyle,
		}),
		render: ({ block, theme }) => <RenderFeatures block={block} theme={theme} />,
		Editor: FeaturesEditor,
		schema: schemaFeatures(),
	},

	"section.features.v2": {
		id: "section.features.v2",
		type: "features",
		label: "Features (ZigZag)",
		category: "sections",
		Icon: Sparkles,
		fieldsSummary: ["title", "subtitle", "items[]", "anchor"],
		makeDefault: ({ uid }) => ({
			id: uid("features"),
			type: "features",
			designId: "section.features.v2",
			variant: "zigzag",
			anchor: "services",
			title: "Services that ship",
			subtitle: "Clear offers, confident results",
			items: [
				{ title: "Landing systems", desc: "Design + build kits with sections.", icon: "🧱" },
				{ title: "Brand refresh", desc: "Typography, color, and UI direction.", icon: "🎨" },
				{ title: "Conversion audits", desc: "Find leaks, fix funnels, raise CTR.", icon: "📈" },
			],
			...commonStyle,
		}),
		render: ({ block, theme }) => <RenderFeatures block={block} theme={theme} />,
		Editor: FeaturesEditor,
		schema: schemaFeatures(),
	},

	"section.features.v3": {
		id: "section.features.v3",
		type: "features",
		label: "Features (Steps)",
		category: "sections",
		Icon: Sparkles,
		fieldsSummary: ["title", "subtitle", "items[]", "anchor"],
		makeDefault: ({ uid }) => ({
			id: uid("features"),
			type: "features",
			designId: "section.features.v3",
			variant: "steps",
			anchor: "outcomes",
			title: "You’ll build real projects",
			subtitle: "A step-by-step path with outcomes",
			items: [
				{ title: "Week 1", desc: "Foundations + layout patterns", icon: "1" },
				{ title: "Week 2", desc: "Real sections + design systems", icon: "2" },
				{ title: "Week 3", desc: "Launch page + pricing + CTA", icon: "3" },
				{ title: "Week 4", desc: "Portfolio, polishing, and deploy", icon: "4" },
			],
			...commonStyle,
		}),
		render: ({ block, theme }) => <RenderFeatures block={block} theme={theme} />,
		Editor: FeaturesEditor,
		schema: schemaFeatures(),
	},

	// Stats Designs (unique per template)
	"section.stats.v1": {
		id: "section.stats.v1",
		type: "stats",
		label: "Stats (Cards)",
		category: "sections",
		Icon: BarChart3,
		fieldsSummary: ["title", "items[]", "anchor"],
		makeDefault: ({ uid }) => ({
			id: uid("stats"),
			type: "stats",
			designId: "section.stats.v1",
			variant: "cards",
			anchor: "docs",
			title: "Numbers that matter",
			items: [
				{ label: "Time to publish", value: "3 min" },
				{ label: "Avg. CTR lift", value: "+22%" },
				{ label: "Templates", value: "60+" },
			],
			colors: { sectionBackground: "#0b1020", titleText: "#ffffff", bodyText: "#cbd5e1" },
			...commonStyle,
		}),
		render: ({ block, theme }) => <RenderStats block={block} theme={theme} />,
		Editor: StatsEditor,
		schema: schemaStats(),
	},

	"section.stats.v2": {
		id: "section.stats.v2",
		type: "stats",
		label: "Stats (Marquee)",
		category: "sections",
		Icon: BarChart3,
		fieldsSummary: ["title", "items[]", "anchor"],
		makeDefault: ({ uid }) => ({
			id: uid("stats"),
			type: "stats",
			designId: "section.stats.v2",
			variant: "marquee",
			anchor: "metrics",
			title: "Live startup metrics",
			items: [
				{ label: "Waitlist", value: "12,480" },
				{ label: "Daily active", value: "3,210" },
				{ label: "NPS", value: "62" },
				{ label: "Uptime", value: "99.99%" },
			],
			colors: { sectionBackground: "#070a14", titleText: "#ffffff", bodyText: "#cbd5e1" },
			...commonStyle,
		}),
		render: ({ block, theme }) => <RenderStats block={block} theme={theme} />,
		Editor: StatsEditor,
		schema: schemaStats(),
	},

	// Pricing Designs (unique per template)
	"section.pricing.v1": {
		id: "section.pricing.v1",
		type: "pricing",
		label: "Pricing (Compact)",
		category: "sections",
		Icon: CreditCard,
		fieldsSummary: ["title", "subtitle", "plans[]", "anchor"],
		makeDefault: ({ uid }) => ({
			id: uid("pricing"),
			type: "pricing",
			designId: "section.pricing.v1",
			variant: "compact",
			anchor: "pricing",
			title: "Simple packages",
			subtitle: "For agencies & studios",
			plans: [
				{
					name: "Starter",
					price: "$499",
					period: "/project",
					bullets: ["One landing page", "2 revisions", "Delivery in 5 days"],
					ctaText: "Request",
					ctaHref: "#contact",
					highlight: false,
				},
				{
					name: "Pro",
					price: "$1,499",
					period: "/project",
					bullets: ["Full kit", "Priority delivery", "Conversion review", "Polish pass"],
					ctaText: "Book Call",
					ctaHref: "#contact",
					highlight: true,
				},
			],
			...commonStyle,
		}),
		render: ({ block, theme }) => <RenderPricing block={block} theme={theme} />,
		Editor: PricingEditor,
		schema: schemaPricing(),
	},

	"section.pricing.v2": {
		id: "section.pricing.v2",
		type: "pricing",
		label: "Pricing (Comparison)",
		category: "sections",
		Icon: CreditCard,
		fieldsSummary: ["title", "subtitle", "plans[]", "anchor"],
		makeDefault: ({ uid }) => ({
			id: uid("pricing"),
			type: "pricing",
			designId: "section.pricing.v2",
			variant: "comparison",
			anchor: "pricing",
			title: "Pick your track",
			subtitle: "Learn at your pace",
			plans: [
				{
					name: "Self-paced",
					price: "$99",
					period: " one-time",
					bullets: ["All lessons", "Templates", "Community access"],
					ctaText: "Buy",
					ctaHref: "#pricing",
					highlight: false,
				},
				{
					name: "Cohort",
					price: "$399",
					period: " /cohort",
					bullets: ["Live sessions", "Mentor feedback", "Portfolio review", "Priority support"],
					ctaText: "Enroll",
					ctaHref: "#pricing",
					highlight: true,
				},
				{
					name: "Team",
					price: "$1,499",
					period: " /team",
					bullets: ["Team onboarding", "Private Q&A", "Custom workshops"],
					ctaText: "Contact",
					ctaHref: "#contact",
					highlight: false,
				},
			],
			...commonStyle,
		}),
		render: ({ block, theme }) => <RenderPricing block={block} theme={theme} />,
		Editor: PricingEditor,
		schema: schemaPricing(),
	},

	// Testimonials Designs (unique per template)
	"section.testimonials.v1": {
		id: "section.testimonials.v1",
		type: "testimonials",
		label: "Testimonials (Wall)",
		category: "sections",
		Icon: MessageCircle,
		fieldsSummary: ["title", "quotes[]", "anchor"],
		makeDefault: ({ uid }) => ({
			id: uid("testimonials"),
			type: "testimonials",
			designId: "section.testimonials.v1",
			variant: "wall",
			anchor: "support",
			title: "Loved by customers",
			quotes: [
				{ name: "Amina", role: "Buyer", quote: "Quality feels premium. Shipping was fast.", avatar: "🛍️" },
				{ name: "Omar", role: "Buyer", quote: "Fits great, looks even better.", avatar: "✨" },
				{ name: "Layla", role: "Buyer", quote: "Minimal and clean. My new favorite.", avatar: "🧵" },
				{ name: "Youssef", role: "Buyer", quote: "Worth it. Great finish.", avatar: "🔥" },
				{ name: "Nour", role: "Buyer", quote: "Comfort all day.", avatar: "💎" },
				{ name: "Hassan", role: "Buyer", quote: "I’m buying another color.", avatar: "🎁" },
			],
			...commonStyle,
		}),
		render: ({ block, theme }) => <RenderTestimonials block={block} theme={theme} />,
		Editor: TestimonialsEditor,
		schema: schemaTestimonials(),
	},

	"section.testimonials.v2": {
		id: "section.testimonials.v2",
		type: "testimonials",
		label: "Testimonials (Quote Cards)",
		category: "sections",
		Icon: MessageCircle,
		fieldsSummary: ["title", "quotes[]", "anchor"],
		makeDefault: ({ uid }) => ({
			id: uid("testimonials"),
			type: "testimonials",
			designId: "section.testimonials.v2",
			variant: "quoteCards",
			anchor: "stories",
			title: "Founder stories",
			quotes: [
				{ name: "Maya", role: "Founder", quote: "This kit made our launch page feel world-class.", avatar: "🗣️" },
				{ name: "Ziad", role: "PM", quote: "We shipped faster with fewer meetings.", avatar: "🧠" },
				{ name: "Rana", role: "Designer", quote: "The sections are clean and consistent.", avatar: "🧩" },
			],
			colors: { sectionBackground: "#070a14", titleText: "#ffffff", bodyText: "#cbd5e1" },
			...commonStyle,
		}),
		render: ({ block, theme }) => <RenderTestimonials block={block} theme={theme} />,
		Editor: TestimonialsEditor,
		schema: schemaTestimonials(),
	},

	// CTA Designs (unique per template)
	"section.cta.v1": {
		id: "section.cta.v1",
		type: "cta",
		label: "CTA (Gradient)",
		category: "sections",
		Icon: Megaphone,
		fieldsSummary: ["title", "subtitle", "ctaText", "ctaHref", "anchor"],
		makeDefault: ({ uid }) => ({
			id: uid("cta"),
			type: "cta",
			designId: "section.cta.v1",
			variant: "gradient",
			anchor: "contact",
			title: "Ready to build a neon landing?",
			subtitle: "Launch in minutes. Edit in seconds.",
			ctaText: "Start Free",
			ctaHref: "#contact",
			colors: { primary: "#7c3aed", secondary: "#22d3ee", buttonText: "#0b1020" },
			...commonStyle,
		}),
		render: ({ block, theme }) => <RenderCTA block={block} theme={theme} />,
		Editor: CTAEditor,
		schema: schemaCTA(),
	},

	"section.form.v1": {
		id: "section.form.v1",
		type: "form",
		label: "Form (Lead Magnet)",
		category: "sections",
		Icon: FileText,
		fieldsSummary: ["title", "subtitle", "fields[]", "submitText", "anchor"],
		makeDefault: ({ uid }) => ({
			id: uid("form"),
			type: "form",
			designId: "section.form.v1",
			variant: "leadMagnet",
			anchor: "contact",
			title: "Get the free checklist",
			subtitle: "A downloadable guide for shipping better pages.",
			fields: [
				{ label: "Name", type: "text", placeholder: "Your name", required: true },
				{ label: "Email", type: "email", placeholder: "you@email.com", required: true },
			],
			submitText: "Send it",
			...commonStyle,
		}),
		render: ({ block, theme }) => <RenderForm block={block} theme={theme} />,
		Editor: FormEditor,
		schema: schemaForm(),
	},


	"section.faq.v1": {
		id: "section.faq.v1",
		type: "faq",
		label: "FAQ (Cards)",
		category: "sections",
		Icon: HelpCircle,
		fieldsSummary: ["title", "items[]", "anchor"],
		makeDefault: ({ uid }) => ({
			id: uid("faq"),
			type: "faq",
			designId: "section.faq.v1",
			variant: "cards",
			anchor: "faq",
			title: "FAQ",
			items: [
				{ q: "How long is access?", a: "Lifetime access to the course materials." },
				{ q: "Do I get templates?", a: "Yes — templates and sections included." },
				{ q: "Any prerequisites?", a: "Basic HTML/CSS helps, but not required." },
				{ q: "Refund policy?", a: "7 days money-back guarantee." },
			],
			...commonStyle,
		}),
		render: ({ block, theme }) => <RenderFAQ block={block} theme={theme} />,
		Editor: FAQEditor,
		schema: schemaFAQ(),
	},

	// Footer Designs (unique per template)
	"section.footer.v1": {
		id: "section.footer.v1",
		type: "footer",
		label: "Footer (Minimal A)",
		category: "sections",
		Icon: ArrowDown,
		fieldsSummary: ["brandName", "tagline", "columns[]", "social[]"],
		makeDefault: ({ uid }) => ({
			id: uid("footer"),
			type: "footer",
			designId: "section.footer.v1",
			variant: "minimalA",
			brandName: "NeonStack",
			tagline: "Build bright. Ship fast.",
			copyright: `© ${new Date().getFullYear()} NeonStack. All rights reserved.`,
			columns: [
				{ title: "Product", links: [{ text: "Features", href: "#features" }, { text: "Docs", href: "#docs" }] },
				{ title: "Company", links: [{ text: "About", href: "#" }, { text: "Contact", href: "#contact" }] },
			],
			social: [{ icon: "🐦", url: "#" }, { icon: "💬", url: "#" }],
			colors: { sectionBackground: "#0b1020", titleText: "#ffffff", bodyText: "#cbd5e1" },
			...commonStyle,
		}),
		render: ({ block, theme }) => <RenderFooter block={block} theme={theme} />,
		Editor: FooterEditor,
		schema: schemaFooter(),
	},

	"section.footer.v2": {
		id: "section.footer.v2",
		type: "footer",
		label: "Footer (Shop Rich)",
		category: "sections",
		Icon: ArrowDown,
		fieldsSummary: ["brandName", "tagline", "columns[]", "social[]"],
		makeDefault: ({ uid }) => ({
			id: uid("footer"),
			type: "footer",
			designId: "section.footer.v2",
			variant: "shopRich",
			brandName: "ShopBold",
			tagline: "Premium essentials. Limited drops.",
			copyright: `© ${new Date().getFullYear()} ShopBold. All rights reserved.`,
			columns: [
				{ title: "Shop", links: [{ text: "New", href: "#new" }, { text: "Best sellers", href: "#bestsellers" }] },
				{ title: "Help", links: [{ text: "Support", href: "#support" }, { text: "Shipping", href: "#" }] },
				{ title: "Company", links: [{ text: "About", href: "#" }, { text: "Careers", href: "#" }] },
			],
			social: [{ icon: "📸", url: "#" }, { icon: "🐦", url: "#" }, { icon: "🎥", url: "#" }],
			...commonStyle,
		}),
		render: ({ block, theme }) => <RenderFooter block={block} theme={theme} />,
		Editor: FooterEditor,
		schema: schemaFooter(),
	},

	// ==================== BASICS ====================
	"basic.text.v1": {
		id: "basic.text.v1",
		type: "text",
		label: "Text",
		category: "basics",
		Icon: Type,
		fieldsSummary: ["content", "align", "size"],
		makeDefault: ({ uid }) => ({
			id: uid("text"),
			type: "text",
			designId: "basic.text.v1",
			content: "Write something…",
			align: "left",
			size: "base",
			...commonStyle,
		}),
		render: ({ block, theme }) => <RenderText block={block} theme={theme} />,
		Editor: TextEditor,
		schema: schemaText(),
	},

	"basic.heading.v1": {
		id: "basic.heading.v1",
		type: "heading",
		label: "Heading",
		category: "basics",
		Icon: Heading,
		fieldsSummary: ["text", "level", "align"],
		makeDefault: ({ uid }) => ({
			id: uid("heading"),
			type: "heading",
			designId: "basic.heading.v1",
			text: "Heading",
			level: 2,
			align: "left",
			...commonStyle,
		}),
		render: ({ block, theme }) => <RenderHeading block={block} theme={theme} />,
		Editor: HeadingEditor,
		schema: schemaHeading(),
	},

	"basic.button.v1": {
		id: "basic.button.v1",
		type: "button",
		label: "Button",
		category: "basics",
		Icon: MousePointerClick,
		fieldsSummary: ["text", "href", "variant"],
		makeDefault: ({ uid }) => ({
			id: uid("button"),
			type: "button",
			designId: "basic.button.v1",
			text: "Click me",
			href: "#",
			variant: "primary",
			...commonStyle,
		}),
		render: ({ block, theme }) => <RenderButton block={block} theme={theme} />,
		Editor: ButtonEditor,
		schema: schemaButton(),
	},

	"basic.image.v1": {
		id: "basic.image.v1",
		type: "image",
		label: "Image",
		category: "basics",
		Icon: ImgIcon,
		fieldsSummary: ["url", "alt", "height"],
		makeDefault: ({ uid }) => ({
			id: uid("image"),
			type: "image",
			designId: "basic.image.v1",
			url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=80",
			alt: "Image",
			height: 280,
			...commonStyle,
		}),
		render: ({ block }) => <RenderImage block={block} />,
		Editor: ImageEditor,
		schema: schemaImage(),
	},

	// ==================== MEDIA ====================
	"media.video.v1": {
		id: "media.video.v1",
		type: "video",
		label: "Video",
		category: "media",
		Icon: Video,
		fieldsSummary: ["title", "embedUrl", "ratio"],
		makeDefault: ({ uid }) => ({
			id: uid("video"),
			type: "video",
			designId: "media.video.v1",
			title: "Video",
			embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
			ratio: "16:9",
			...commonStyle,
		}),
		render: ({ block }) => <RenderVideo block={block} />,
		Editor: VideoEditor,
		schema: schemaVideo(),
	},

	"media.gallery.v1": {
		id: "media.gallery.v1",
		type: "gallery",
		label: "Gallery",
		category: "media",
		Icon: LayoutGrid,
		fieldsSummary: ["title", "columns", "images[]"],
		makeDefault: ({ uid }) => ({
			id: uid("gallery"),
			type: "gallery",
			designId: "media.gallery.v1",
			title: "Gallery",
			columns: 3,
			images: [
				{ url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80", alt: "1" },
				{ url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80", alt: "2" },
				{ url: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=900&q=80", alt: "3" },
			],
			...commonStyle,
		}),
		render: ({ block }) => <RenderGallery block={block} />,
		Editor: GalleryEditor,
		schema: schemaGallery(),
	},

	// ==================== MISC ====================
	"misc.spacer.v1": {
		id: "misc.spacer.v1",
		type: "spacer",
		label: "Spacer",
		category: "misc",
		Icon: MoveVertical,
		fieldsSummary: ["height"],
		makeDefault: ({ uid }) => ({
			id: uid("spacer"),
			type: "spacer",
			designId: "misc.spacer.v1",
			height: 40,
			...commonStyle,
		}),
		render: ({ block }) => <RenderSpacer block={block} />,
		Editor: SpacerEditor,
		schema: schemaSpacer(),
	},

	"misc.divider.v1": {
		id: "misc.divider.v1",
		type: "divider",
		label: "Divider",
		category: "misc",
		Icon: Minus,
		fieldsSummary: ["thickness"],
		makeDefault: ({ uid }) => ({
			id: uid("divider"),
			type: "divider",
			designId: "misc.divider.v1",
			thickness: 1,
			...commonStyle,
		}),
		render: ({ block, theme }) => <RenderDivider block={block} theme={theme} />,
		Editor: DividerEditor,
		schema: schemaDivider(),
	},

	"misc.html.v1": {
		id: "misc.html.v1",
		type: "html",
		label: "Custom HTML",
		category: "misc",
		Icon: Code,
		fieldsSummary: ["html"],
		makeDefault: ({ uid }) => ({
			id: uid("html"),
			type: "html",
			designId: "misc.html.v1",
			html: "<div>Custom HTML here</div>",
			...commonStyle,
		}),
		render: ({ block }) => <RenderHTML block={block} />,
		Editor: HTMLEditor,
		schema: schemaHTML(),
	},
}

export const BUILDER_TYPES = [
	"navbar", "hero", "features", "stats", "pricing", "testimonials", "cta", "form", "faq", "footer", "banner",
	"text", "heading", "button", "image",
	"video", "gallery",
	"spacer", "divider", "html",
]

export const BUILDER_TYPE_ICONS = {
	navbar: Navigation,
	hero: Rocket,
	features: LayoutGrid,
	stats: BarChart3,
	pricing: CreditCard,
	testimonials: MessageCircle,
	cta: MousePointerClick,
	form: FileText,
	faq: HelpCircle,
	footer: PanelBottom,
	banner: Megaphone,

	text: Type,
	heading: Heading,
	button: RectangleHorizontal,
	image: ImageIcon,

	video: Video,
	gallery: Images,

	spacer: MoveVertical,
	divider: Minus,
	html: Code,
}


export function migrateDoc(doc) {
	if (!doc) return doc
	const blocks = Array.isArray(doc.blocks) ? doc.blocks : []
	const nextBlocks = blocks.map((b) => {
		if (b?.designId) return b
		const designId = DEFAULT_DESIGN_BY_TYPE[b?.type] || null
		if (!designId) return b
		return { ...b, designId }
	})
	return { ...doc, blocks: nextBlocks }
}

