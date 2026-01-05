"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import React, { createContext, useContext, useMemo, useRef, useState } from "react" 

const InlineEditCtx = createContext({
	enabled: false,
	mode: "full",
	onEdit: null,
})

export function InlineEditProvider({ enabled, mode, onEdit, children }) {
	const value = useMemo(() => ({ enabled, mode, onEdit }), [enabled, mode, onEdit])
	return <InlineEditCtx.Provider value={value}>{children}</InlineEditCtx.Provider>
}
 

function withOverrides(theme, block) {
	const o = block && block.colors ? block.colors : {}
	return {
		...theme,
		primary: o.primary || theme.primary,
		secondary: o.secondary || theme.secondary,
		pageBackground: o.pageBackground || theme.pageBackground,
		sectionBackground: o.sectionBackground || theme.sectionBackground,
		titleText: o.titleText || theme.titleText,
		bodyText: o.bodyText || theme.bodyText,
		buttonText: o.buttonText || theme.buttonText,
		outline: o.outline || theme.outline,
	}
}

function radiusStyle(block, theme) {
	const tRadius = typeof theme.radius === "number" ? theme.radius : 12
	const r =
		block && block.style && typeof block.style.radius === "number"
			? block.style.radius
			: block && block.style && block.style.radius === 0
				? 0
				: null
	const finalRadius = typeof r === "number" ? r : tRadius
	return { borderRadius: `${finalRadius}px` }
}

// -------------------- NAVBAR --------------------
export function RenderNavbar({ block, theme }) {
	const t = withOverrides(theme, block)
	const links = Array.isArray(block.links) ? block.links : []
	const v = block.variant || "classic"

	const baseStyle =
		v === "transparent"
			? { backgroundColor: "transparent", borderColor: "transparent" }
			: v === "neon"
				? {
						backgroundColor: "rgba(255,255,255,0.06)",
						borderColor: "rgba(255,255,255,0.10)",
						backdropFilter: "blur(10px)",
					}
				: v === "dark"
					? { backgroundColor: t.sectionBackground, borderColor: "rgba(255,255,255,0.08)" }
					: { backgroundColor: t.pageBackground, borderColor: t.outline }

	return (
		<nav className={`${block.sticky !== false ? "sticky top-0 z-50" : ""} border-b`} style={baseStyle}>
			<div className="container mx-auto px-4 py-4 flex items-center justify-between">
				<div className={`flex items-center gap-3 ${v === "centeredMinimal" ? "flex-1 justify-center" : ""}`}>
					{block.logo && <img src={block.logo || "/placeholder.svg"} alt="Logo" className="h-8 w-auto" />}
					<span className="font-bold text-xl" style={{ color: t.titleText }}>
						{block.brandName || "Brand"}
					</span>
				</div>

				<div className={`hidden md:flex items-center gap-6 ${v === "centeredMinimal" ? "flex-1 justify-center" : ""}`}>
					{links.map((link, i) => (
						<Link
							key={i}
							href={link.href || "#"}
							className="hover:opacity-70 transition-opacity"
							style={{ color: v === "neon" || v === "dark" ? "rgba(255,255,255,0.85)" : t.bodyText }}
						>
							{link.text}
						</Link>
					))}
				</div>

				<div className={`hidden md:flex items-center ${v === "centeredMinimal" ? "flex-1 justify-end" : ""}`}>
					{block.ctaText && (
						<Link href={block.ctaHref || "#"}>
							<Button
								style={
									v === "neon"
										? { backgroundColor: t.secondary, color: "#0b1020" }
										: v === "transparent"
											? { backgroundColor: t.primary, color: t.buttonText }
											: { backgroundColor: t.primary, color: t.buttonText }
								}
							>
								{block.ctaText}
							</Button>
						</Link>
					)}
				</div>
			</div>
		</nav>
	)
}

// -------------------- HERO (router) --------------------
export function RenderHero({ block, theme }) {
	const t = withOverrides(theme, block)
	const v = block.variant || "v1"

	if (v === "centeredNeon") return <RenderHeroCenteredNeon block={block} theme={t} />
	if (v === "productShowcase") return <RenderHeroProductShowcase block={block} theme={t} />
	if (v === "showcaseSplit") return <RenderHeroShowcaseSplit block={block} theme={t} />
	if (v === "darkGlow") return <RenderHeroDarkGlow block={block} theme={t} />
	if (v === "lesson") return <RenderHeroLesson block={block} theme={t} />
	if (v === "minimal") return <RenderHeroMinimal block={block} theme={t} />

	return <RenderHeroV1 block={block} theme={t} />
}

// ---------- Hero Variants ----------
function RenderHeroV1({ block, theme }) {
	return (
		<section id={block.anchor || "hero"} className="relative py-20 lg:py-32" style={{ backgroundColor: theme.sectionBackground }}>
			{block.imageUrl && <div className="absolute inset-0 bg-cover bg-center opacity-10" style={{ backgroundImage: `url(${block.imageUrl})` }} />}
			<div className="container mx-auto px-4 relative z-10">
				<div className="max-w-3xl mx-auto text-center space-y-6">
					<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight" style={{ color: theme.titleText }}>
						{block.headline || "Transform Your Business"}
					</h1>
					<p className="text-lg md:text-xl" style={{ color: theme.bodyText }}>
						{block.subheadline || "The most powerful platform to grow online"}
					</p>
					<div className="flex flex-wrap gap-4 justify-center pt-4">
						{block.primaryCtaText && (
							<Link href={block.primaryCtaHref || "#"}>
								<Button size="lg" style={{ backgroundColor: theme.primary, color: theme.buttonText }}>
									{block.primaryCtaText}
								</Button>
							</Link>
						)}
						{block.secondaryCtaText && (
							<Link href={block.secondaryCtaHref || "#"}>
								<Button size="lg" variant="outline" style={{ borderColor: theme.primary, color: theme.primary }}>
									{block.secondaryCtaText}
								</Button>
							</Link>
						)}
					</div>
				</div>
			</div>
		</section>
	)
}

function RenderHeroCenteredNeon({ block, theme }) {
	return (
		<section id={block.anchor || "hero"} className="relative py-20 lg:py-28 overflow-hidden" style={{ backgroundColor: theme.sectionBackground }}>
			<div className="absolute -top-24 -left-24 h-72 w-72 rounded-full opacity-20" style={{ backgroundColor: theme.secondary }} />
			<div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full opacity-20" style={{ backgroundColor: theme.primary }} />

			<div className="container mx-auto px-4 relative z-10">
				<div className="max-w-3xl mx-auto text-center space-y-6">
					<div
						className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
						style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)" }}
					>
						<span>⚡</span>
						<span>{block.topheadline}</span>
					</div>

					<h1 className="text-4xl md:text-6xl font-extrabold leading-tight" style={{ color: theme.titleText }}>
						{block.headline}
					</h1>
					<p className="text-lg md:text-xl" style={{ color: theme.bodyText }}>
						{block.subheadline}
					</p>

					<div className="flex flex-wrap gap-3 justify-center pt-2">
						{block.primaryCtaText && (
							<Link href={block.primaryCtaHref || "#"}>
								<Button size="lg" style={{ backgroundColor: theme.secondary, color: "#0b1020" }}>
									{block.primaryCtaText}
								</Button>
							</Link>
						)}
						{block.secondaryCtaText && (
							<Link href={block.secondaryCtaHref || "#"}>
								<Button size="lg" variant="outline" style={{ borderColor: "rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.9)" }}>
									{block.secondaryCtaText}
								</Button>
							</Link>
						)}
					</div>

					{block.imageUrl ? (
						<div className="mt-10 border overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.12)", ...radiusStyle(block, theme) }}>
							<img src={block.imageUrl} alt="Hero" className="w-full h-[320px] lg:h-[420px] object-cover opacity-90" />
						</div>
					) : null}
				</div>
			</div>
		</section>
	)
}

function RenderHeroProductShowcase({ block, theme }) {
	return (
		<section id={block.anchor || "hero"} className="py-16 lg:py-24" style={{ backgroundColor: theme.pageBackground }}>
			<div className="container mx-auto px-4">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
					<div className="space-y-6">
						<div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm" style={{ borderColor: theme.outline, color: theme.bodyText }}>
							<span>NEW</span>
							<span>Limited drop</span>
						</div>
						<h1 className="text-4xl md:text-6xl font-extrabold leading-tight" style={{ color: theme.titleText }}>
							{block.headline}
						</h1>
						<p className="text-lg" style={{ color: theme.bodyText }}>
							{block.subheadline}
						</p>
						<div className="flex flex-wrap gap-3">
							{block.primaryCtaText && (
								<Link href={block.primaryCtaHref || "#"}>
									<Button size="lg" style={{ backgroundColor: theme.primary, color: theme.buttonText }}>
										{block.primaryCtaText}
									</Button>
								</Link>
							)}
							{block.secondaryCtaText && (
								<Link href={block.secondaryCtaHref || "#"}>
									<Button size="lg" variant="outline" style={{ borderColor: theme.outline, color: theme.titleText }}>
										{block.secondaryCtaText}
									</Button>
								</Link>
							)}
						</div>
					</div>

					<div className="border overflow-hidden" style={{ borderColor: theme.outline, ...radiusStyle(block, theme) }}>
						<img src={block.imageUrl || "/placeholder.svg"} alt="Product" className="w-full h-[360px] lg:h-[460px] object-cover" />
					</div>
				</div>
			</div>
		</section>
	)
}

function RenderHeroShowcaseSplit({ block, theme }) {
	const imageRight = (block.layout || "imageRight") === "imageRight"
	return (
		<section id={block.anchor || "hero"} className="py-16 lg:py-24" style={{ backgroundColor: theme.sectionBackground }}>
			<div className="container mx-auto px-4">
				<div className={`grid grid-cols-1 lg:grid-cols-2 gap-10 items-center ${imageRight ? "" : "lg:[&>div:first-child]:order-2"}`}>
					<div className="space-y-6">
						<h1 className="text-4xl md:text-5xl font-bold leading-tight" style={{ color: theme.titleText }}>
							{block.headline}
						</h1>
						<p className="text-lg" style={{ color: theme.bodyText }}>
							{block.subheadline}
						</p>
						<div className="flex flex-wrap gap-3">
							{block.primaryCtaText && (
								<Link href={block.primaryCtaHref || "#"}>
									<Button size="lg" style={{ backgroundColor: theme.primary, color: theme.buttonText }}>
										{block.primaryCtaText}
									</Button>
								</Link>
							)}
							{block.secondaryCtaText && (
								<Link href={block.secondaryCtaHref || "#"}>
									<Button size="lg" variant="outline" style={{ borderColor: theme.primary, color: theme.primary }}>
										{block.secondaryCtaText}
									</Button>
								</Link>
							)}
						</div>
					</div>

					<div className="border overflow-hidden" style={{ borderColor: theme.outline, ...radiusStyle(block, theme) }}>
						<img src={block.imageUrl || "/placeholder.svg"} alt="Showcase" className="w-full h-[320px] lg:h-[420px] object-cover" />
					</div>
				</div>
			</div>
		</section>
	)
}

function RenderHeroDarkGlow({ block, theme }) {
	return (
		<section id={block.anchor || "hero"} className="relative py-20 lg:py-28 overflow-hidden" style={{ backgroundColor: theme.sectionBackground }}>
			<div
				className="absolute inset-0 opacity-20"
				style={{
					background: `radial-gradient(circle at 30% 30%, ${theme.secondary} 0%, transparent 55%), radial-gradient(circle at 70% 60%, ${theme.primary} 0%, transparent 55%)`,
				}}
			/>
			<div className="container mx-auto px-4 relative z-10">
				<div className="max-w-3xl">
					<div
						className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
						style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)" }}
					>
						<span>🌙</span>
						<span>Dark Launch</span>
					</div>

					<h1 className="mt-5 text-4xl md:text-6xl font-extrabold leading-tight" style={{ color: theme.titleText }}>
						{block.headline}
					</h1>
					<p className="mt-4 text-lg md:text-xl" style={{ color: theme.bodyText }}>
						{block.subheadline}
					</p>

					<div className="mt-7 flex flex-wrap gap-3">
						{block.primaryCtaText && (
							<Link href={block.primaryCtaHref || "#"}>
								<Button size="lg" style={{ backgroundColor: theme.secondary, color: "#0b1020" }}>
									{block.primaryCtaText}
								</Button>
							</Link>
						)}
						{block.secondaryCtaText && (
							<Link href={block.secondaryCtaHref || "#"}>
								<Button size="lg" variant="outline" style={{ borderColor: "rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.9)" }}>
									{block.secondaryCtaText}
								</Button>
							</Link>
						)}
					</div>

					{block.imageUrl ? (
						<div className="mt-10 border overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.10)", ...radiusStyle(block, theme) }}>
							<img src={block.imageUrl} alt="Hero" className="w-full h-[260px] md:h-[340px] object-cover opacity-90" />
						</div>
					) : null}
				</div>
			</div>
		</section>
	)
}

function RenderHeroLesson({ block, theme }) {
	return (
		<section id={block.anchor || "hero"} className="py-16 lg:py-24" style={{ backgroundColor: theme.sectionBackground }}>
			<div className="container mx-auto px-4">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
					<div className="space-y-6">
						<div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm" style={{ borderColor: theme.outline, color: theme.bodyText }}>
							<span>🎓</span>
							<span>Course</span>
						</div>
						<h1 className="text-4xl md:text-5xl font-bold leading-tight" style={{ color: theme.titleText }}>
							{block.headline}
						</h1>
						<p className="text-lg" style={{ color: theme.bodyText }}>
							{block.subheadline}
						</p>
						<div className="flex flex-wrap gap-3">
							{block.primaryCtaText && (
								<Link href={block.primaryCtaHref || "#"}>
									<Button size="lg" style={{ backgroundColor: theme.primary, color: theme.buttonText }}>
										{block.primaryCtaText}
									</Button>
								</Link>
							)}
							{block.secondaryCtaText && (
								<Link href={block.secondaryCtaHref || "#"}>
									<Button size="lg" variant="outline" style={{ borderColor: theme.primary, color: theme.primary }}>
										{block.secondaryCtaText}
									</Button>
								</Link>
							)}
						</div>
					</div>

					{block.imageUrl ? (
						<div className="border overflow-hidden" style={{ borderColor: theme.outline, ...radiusStyle(block, theme) }}>
							<img src={block.imageUrl} alt="Course" className="w-full h-[320px] lg:h-[420px] object-cover" />
						</div>
					) : null}
				</div>
			</div>
		</section>
	)
}

function RenderHeroMinimal({ block, theme }) {
	return (
		<section id={block.anchor || "hero"} className="py-20" style={{ backgroundColor: theme.pageBackground }}>
			<div className="container mx-auto px-4">
				<div className="max-w-3xl mx-auto text-center space-y-6">
					<h1 className="text-5xl md:text-6xl font-bold tracking-tight" style={{ color: theme.titleText }}>
						{block.headline}
					</h1>
					<p className="text-lg md:text-xl" style={{ color: theme.bodyText }}>
						{block.subheadline}
					</p>
					<div className="flex flex-wrap justify-center gap-3 pt-2">
						{block.primaryCtaText && (
							<Link href={block.primaryCtaHref || "#"}>
								<Button size="lg" style={{ backgroundColor: theme.primary, color: theme.buttonText }}>
									{block.primaryCtaText}
								</Button>
							</Link>
						)}
						{block.secondaryCtaText && (
							<Link href={block.secondaryCtaHref || "#"}>
								<Button size="lg" variant="outline" style={{ borderColor: theme.outline, color: theme.titleText }}>
									{block.secondaryCtaText}
								</Button>
							</Link>
						)}
					</div>
				</div>
			</div>
		</section>
	)
}

// -------------------- STATS --------------------
export function RenderStats({ block, theme }) {
	const t = withOverrides(theme, block)
	const items = Array.isArray(block.items) ? block.items : []
	const v = block.variant || "simple"

	if (v === "cards") {
		return (
			<section id={block.anchor || "stats"} className="py-16" style={{ backgroundColor: t.sectionBackground }}>
				<div className="container mx-auto px-4">
					{block.title && (
						<h2 className="text-3xl font-bold text-center mb-10" style={{ color: t.titleText }}>
							{block.title}
						</h2>
					)}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{items.map((item, i) => (
							<div
								key={i}
								className="p-6 border"
								style={{
									borderColor: "rgba(255,255,255,0.12)",
									backgroundColor: "rgba(255,255,255,0.06)",
									...radiusStyle(block, t),
								}}
							>
								<div className="text-3xl font-bold" style={{ color: t.secondary }}>
									{item.value}
								</div>
								<div className="mt-2 text-sm" style={{ color: t.bodyText }}>
									{item.label}
								</div>
							</div>
						))}
					</div>
				</div>
			</section>
		)
	}

	if (v === "marquee") {
		return (
			<section id={block.anchor || "stats"} className="py-14" style={{ backgroundColor: t.sectionBackground }}>
				<div className="container mx-auto px-4">
					{block.title && (
						<h2 className="text-3xl font-bold text-center mb-8" style={{ color: t.titleText }}>
							{block.title}
						</h2>
					)}
					<div className="flex flex-wrap justify-center gap-3">
						{items.map((item, i) => (
							<div
								key={i}
								className="px-4 py-3 border"
								style={{
									borderColor: "rgba(255,255,255,0.10)",
									backgroundColor: "rgba(255,255,255,0.04)",
									...radiusStyle(block, t),
								}}
							>
								<span className="font-semibold" style={{ color: t.secondary }}>
									{item.value}
								</span>
								<span className="ml-2 text-sm" style={{ color: t.bodyText }}>
									{item.label}
								</span>
							</div>
						))}
					</div>
				</div>
			</section>
		)
	}

	if (v === "kpiBar") {
		return (
			<section id={block.anchor || "stats"} className="py-10 border-y" style={{ backgroundColor: t.pageBackground, borderColor: t.outline }}>
				<div className="container mx-auto px-4">
					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
						{block.title ? (
							<h3 className="text-xl font-semibold" style={{ color: t.titleText }}>
								{block.title}
							</h3>
						) : (
							<span />
						)}
						<div className="flex flex-wrap gap-3">
							{items.map((item, i) => (
								<div
									key={i}
									className="px-3 py-2 border"
									style={{ borderColor: t.outline, backgroundColor: t.sectionBackground, ...radiusStyle(block, t) }}
								>
									<div className="text-xs" style={{ color: t.bodyText }}>
										{item.label}
									</div>
									<div className="text-sm font-semibold" style={{ color: t.titleText }}>
										{item.value}
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</section>
		)
	}

	return (
		<section id={block.anchor || "stats"} className="py-16" style={{ backgroundColor: t.pageBackground }}>
			<div className="container mx-auto px-4">
				{block.title && (
					<h2 className="text-3xl font-bold text-center mb-12" style={{ color: t.titleText }}>
						{block.title}
					</h2>
				)}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
					{items.map((item, i) => (
						<div key={i} className="text-center">
							<div className="text-4xl font-bold mb-2" style={{ color: t.primary }}>
								{item.value}
							</div>
							<div className="text-lg" style={{ color: t.bodyText }}>
								{item.label}
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}

// -------------------- FEATURES --------------------
export function RenderFeatures({ block, theme }) {
	const t = withOverrides(theme, block)
	const items = Array.isArray(block.items) ? block.items : []
	const v = block.variant || "grid"

	if (v === "bento") {
		return (
			<section id={block.anchor || "features"} className="py-20" style={{ backgroundColor: t.sectionBackground }}>
				<div className="container mx-auto px-4">
					<div className="text-center mb-12 max-w-2xl mx-auto">
						{block.title && (
							<h2 className="text-4xl font-bold mb-3" style={{ color: t.titleText }}>
								{block.title}
							</h2>
						)}
						{block.subtitle && (
							<p className="text-lg" style={{ color: t.bodyText }}>
								{block.subtitle}
							</p>
						)}
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{items.map((item, i) => (
							<div
								key={i}
								className="p-6 border"
								style={{
									borderColor: "rgba(255,255,255,0.12)",
									backgroundColor: "rgba(255,255,255,0.05)",
									...radiusStyle(block, t),
								}}
							>
								<div className="text-3xl mb-3">{item.icon || "⭐"}</div>
								<div className="text-lg font-semibold" style={{ color: t.titleText }}>
									{item.title}
								</div>
								<div className="mt-1 text-sm" style={{ color: t.bodyText }}>
									{item.desc}
								</div>
							</div>
						))}
					</div>
				</div>
			</section>
		)
	}

	if (v === "zigzag") {
		return (
			<section id={block.anchor || "features"} className="py-20" style={{ backgroundColor: t.sectionBackground }}>
				<div className="container mx-auto px-4">
					<div className="text-center mb-12 max-w-2xl mx-auto">
						{block.title && (
							<h2 className="text-4xl font-bold mb-3" style={{ color: t.titleText }}>
								{block.title}
							</h2>
						)}
						{block.subtitle && (
							<p className="text-lg" style={{ color: t.bodyText }}>
								{block.subtitle}
							</p>
						)}
					</div>

					<div className="space-y-6 max-w-4xl mx-auto">
						{items.map((item, i) => {
							const flip = i % 2 === 1
							return (
								<div
									key={i}
									className={`grid grid-cols-1 md:grid-cols-2 gap-6 items-center border p-6 ${flip ? "md:[&>div:first-child]:order-2" : ""}`}
									style={{ borderColor: t.outline, backgroundColor: t.pageBackground, ...radiusStyle(block, t) }}
								>
									<div className="space-y-2">
										<div className="inline-flex items-center gap-2">
											<span className="text-2xl">{item.icon || "✨"}</span>
											<h3 className="text-xl font-semibold" style={{ color: t.titleText }}>
												{item.title}
											</h3>
										</div>
										<p className="text-sm" style={{ color: t.bodyText }}>
											{item.desc}
										</p>
									</div>

									<div className="border p-4" style={{ borderColor: t.outline, backgroundColor: t.sectionBackground, ...radiusStyle(block, t) }}>
										<div className="text-sm" style={{ color: t.bodyText }}>
											{item.desc || "Describe the service here."}
										</div>
										<div className="mt-3">
											<Badge variant="outline" style={{ borderColor: t.outline, color: t.titleText }}>
												{item.title || "Item"}
											</Badge>
										</div>
									</div>
								</div>
							)
						})}
					</div>
				</div>
			</section>
		)
	}

	if (v === "steps") {
		return (
			<section id={block.anchor || "features"} className="py-20" style={{ backgroundColor: t.sectionBackground }}>
				<div className="container mx-auto px-4">
					<div className="text-center mb-12 max-w-2xl mx-auto">
						{block.title && (
							<h2 className="text-4xl font-bold mb-3" style={{ color: t.titleText }}>
								{block.title}
							</h2>
						)}
						{block.subtitle && (
							<p className="text-lg" style={{ color: t.bodyText }}>
								{block.subtitle}
							</p>
						)}
					</div>

					<div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
						{items.map((item, i) => (
							<div key={i} className="border p-6" style={{ borderColor: t.outline, backgroundColor: t.pageBackground, ...radiusStyle(block, t) }}>
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 flex items-center justify-center font-bold border" style={{ borderColor: t.outline, color: t.titleText, ...radiusStyle(block, t) }}>
										{item.icon || i + 1}
									</div>
									<h3 className="text-xl font-semibold" style={{ color: t.titleText }}>
										{item.title}
									</h3>
								</div>
								<p className="mt-3 text-sm" style={{ color: t.bodyText }}>
									{item.desc}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>
		)
	}

	if (v === "iconStrip") {
		return (
			<section id={block.anchor || "features"} className="py-16" style={{ backgroundColor: t.pageBackground }}>
				<div className="container mx-auto px-4">
					<div className="text-center mb-10 max-w-2xl mx-auto">
						{block.title && (
							<h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: t.titleText }}>
								{block.title}
							</h2>
						)}
						{block.subtitle && (
							<p className="text-lg" style={{ color: t.bodyText }}>
								{block.subtitle}
							</p>
						)}
					</div>

					<div className="max-w-4xl mx-auto divide-y border" style={{ borderColor: t.outline, ...radiusStyle(block, t) }}>
						{items.map((item, i) => (
							<div key={i} className="flex items-start gap-4 p-6" style={{ backgroundColor: t.sectionBackground }}>
								<div className="text-2xl">{item.icon || "✅"}</div>
								<div className="flex-1">
									<div className="font-semibold" style={{ color: t.titleText }}>
										{item.title}
									</div>
									<div className="text-sm mt-1" style={{ color: t.bodyText }}>
										{item.desc}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>
		)
	}

	// default simple grid
	return (
		<section id={block.anchor || "features"} className="py-20" style={{ backgroundColor: t.sectionBackground }}>
			<div className="container mx-auto px-4">
				<div className="text-center mb-12 max-w-2xl mx-auto">
					{block.title && (
						<h2 className="text-4xl font-bold mb-3" style={{ color: t.titleText }}>
							{block.title}
						</h2>
					)}
					{block.subtitle && (
						<p className="text-lg" style={{ color: t.bodyText }}>
							{block.subtitle}
						</p>
					)}
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{items.map((item, i) => (
						<div key={i} className="border p-6" style={{ borderColor: t.outline, backgroundColor: t.pageBackground, ...radiusStyle(block, t) }}>
							<div className="text-2xl mb-3">{item.icon || "⭐"}</div>
							<div className="font-semibold" style={{ color: t.titleText }}>
								{item.title}
							</div>
							<div className="text-sm mt-1" style={{ color: t.bodyText }}>
								{item.desc}
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}

// -------------------- PRICING --------------------
export function RenderPricing({ block, theme }) {
	const t = withOverrides(theme, block)
	const plans = Array.isArray(block.plans) ? block.plans : []
	const v = block.variant || "compact"

	if (v === "comparison") {
		return (
			<section id={block.anchor || "pricing"} className="py-20" style={{ backgroundColor: t.sectionBackground }}>
				<div className="container mx-auto px-4">
					<div className="text-center mb-12 max-w-2xl mx-auto">
						{block.title && (
							<h2 className="text-4xl font-bold mb-3" style={{ color: t.titleText }}>
								{block.title}
							</h2>
						)}
						{block.subtitle && (
							<p className="text-lg" style={{ color: t.bodyText }}>
								{block.subtitle}
							</p>
						)}
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{plans.map((p, i) => (
							<div
								key={i}
								className={`border p-6 ${p.highlight ? "ring-2" : ""}`}
								style={{
									borderColor: p.highlight ? t.primary : t.outline,
									backgroundColor: t.pageBackground,
									ringColor: t.primary,
									...radiusStyle(block, t),
								}}
							>
								<div className="flex items-center justify-between">
									<h3 className="text-xl font-semibold" style={{ color: t.titleText }}>
										{p.name}
									</h3>
									{p.highlight ? (
										<Badge style={{ backgroundColor: t.primary, color: t.buttonText }}>Popular</Badge>
									) : null}
								</div>

								<div className="mt-4">
									<div className="text-4xl font-bold" style={{ color: t.titleText }}>
										{p.price}
										<span className="text-base font-normal ml-2" style={{ color: t.bodyText }}>
											{p.period}
										</span>
									</div>
								</div>

								<ul className="mt-5 space-y-2">
									{(p.bullets || []).map((b, bi) => (
										<li key={bi} className="text-sm" style={{ color: t.bodyText }}>
											• {b}
										</li>
									))}
								</ul>

								<div className="mt-6">
									<Link href={p.ctaHref || "#"}>
										<Button
											className="w-full"
											variant={p.highlight ? "default" : "outline"}
											style={
												p.highlight
													? { backgroundColor: t.primary, color: t.buttonText }
													: { borderColor: t.outline, color: t.titleText }
											}
										>
											{p.ctaText || "Get Started"}
										</Button>
									</Link>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>
		)
	}

	// compact
	return (
		<section id={block.anchor || "pricing"} className="py-20" style={{ backgroundColor: t.sectionBackground }}>
			<div className="container mx-auto px-4">
				<div className="text-center mb-12 max-w-2xl mx-auto">
					{block.title && (
						<h2 className="text-4xl font-bold mb-3" style={{ color: t.titleText }}>
							{block.title}
						</h2>
					)}
					{block.subtitle && (
						<p className="text-lg" style={{ color: t.bodyText }}>
							{block.subtitle}
						</p>
					)}
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
					{plans.map((p, i) => (
						<div
							key={i}
							className="border p-8"
							style={{ borderColor: p.highlight ? t.primary : t.outline, backgroundColor: t.pageBackground, ...radiusStyle(block, t) }}
						>
							<div className="flex items-center justify-between">
								<h3 className="text-2xl font-semibold" style={{ color: t.titleText }}>
									{p.name}
								</h3>
								{p.highlight ? <Badge style={{ backgroundColor: t.primary, color: t.buttonText }}>Best</Badge> : null}
							</div>

							<div className="mt-3 text-4xl font-bold" style={{ color: t.titleText }}>
								{p.price}
								<span className="text-base font-normal ml-2" style={{ color: t.bodyText }}>
									{p.period}
								</span>
							</div>

							<ul className="mt-5 space-y-2">
								{(p.bullets || []).map((b, bi) => (
									<li key={bi} className="text-sm" style={{ color: t.bodyText }}>
										• {b}
									</li>
								))}
							</ul>

							<div className="mt-7">
								<Link href={p.ctaHref || "#"}>
									<Button className="w-full" style={{ backgroundColor: p.highlight ? t.primary : t.secondary, color: t.buttonText }}>
										{p.ctaText || "Choose"}
									</Button>
								</Link>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}

// -------------------- TESTIMONIALS --------------------
export function RenderTestimonials({ block, theme }) {
	const t = withOverrides(theme, block)
	const quotes = Array.isArray(block.quotes) ? block.quotes : []
	const v = block.variant || "wall"

	if (v === "quoteCards") {
		return (
			<section id={block.anchor || "testimonials"} className="py-20" style={{ backgroundColor: t.sectionBackground }}>
				<div className="container mx-auto px-4">
					<div className="text-center mb-12 max-w-2xl mx-auto">
						{block.title && (
							<h2 className="text-4xl font-bold mb-3" style={{ color: t.titleText }}>
								{block.title}
							</h2>
						)}
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{quotes.map((q, i) => (
							<div key={i} className="border p-6" style={{ borderColor: t.outline, backgroundColor: t.pageBackground, ...radiusStyle(block, t) }}>
								<div className="text-3xl">{q.avatar || "💬"}</div>
								<p className="mt-4 text-sm" style={{ color: t.bodyText }}>
									“{q.quote}”
								</p>
								<div className="mt-4">
									<div className="font-semibold" style={{ color: t.titleText }}>
										{q.name}
									</div>
									<div className="text-xs" style={{ color: t.bodyText }}>
										{q.role}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>
		)
	}

	// wall
	return (
		<section id={block.anchor || "testimonials"} className="py-20" style={{ backgroundColor: t.sectionBackground }}>
			<div className="container mx-auto px-4">
				<div className="text-center mb-12 max-w-2xl mx-auto">
					{block.title && (
						<h2 className="text-4xl font-bold mb-3" style={{ color: t.titleText }}>
							{block.title}
						</h2>
					)}
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{quotes.map((q, i) => (
						<div
							key={i}
							className="border p-6"
							style={{
								borderColor: "rgba(255,255,255,0.12)",
								backgroundColor: "rgba(255,255,255,0.05)",
								...radiusStyle(block, t),
							}}
						>
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 border flex items-center justify-center" style={{ borderColor: "rgba(255,255,255,0.14)", ...radiusStyle(block, t) }}>
									<span className="text-lg">{q.avatar || "⭐"}</span>
								</div>
								<div>
									<div className="font-semibold" style={{ color: t.titleText }}>
										{q.name}
									</div>
									<div className="text-xs" style={{ color: t.bodyText }}>
										{q.role}
									</div>
								</div>
							</div>

							<p className="mt-4 text-sm" style={{ color: t.bodyText }}>
								“{q.quote}”
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}

// -------------------- CTA --------------------
export function RenderCTA({ block, theme }) {
	const t = withOverrides(theme, block)
	const v = block.variant || "clean"

	if (v === "gradient") {
		return (
			<section id={block.anchor || "cta"} className="py-20" style={{ backgroundColor: t.sectionBackground }}>
				<div className="container mx-auto px-4">
					<div
						className="p-10 md:p-14 border overflow-hidden relative"
						style={{
							borderColor: "rgba(255,255,255,0.12)",
							background: `linear-gradient(135deg, ${t.primary} 0%, ${t.secondary} 100%)`,
							...radiusStyle(block, t),
						}}
					>
						<div className="relative z-10 max-w-2xl">
							<h2 className="text-4xl font-extrabold" style={{ color: "#ffffff" }}>
								{block.title}
							</h2>
							<p className="mt-3 text-lg" style={{ color: "rgba(255,255,255,0.9)" }}>
								{block.subtitle}
							</p>

							{block.ctaText && (
								<div className="mt-7">
									<Link href={block.ctaHref || "#"}>
										<Button size="lg" style={{ backgroundColor: "rgba(255,255,255,0.92)", color: "#0b1020" }}>
											{block.ctaText}
										</Button>
									</Link>
								</div>
							)}
						</div>

						<div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(circle at 20% 20%, #fff 0%, transparent 55%)" }} />
					</div>
				</div>
			</section>
		)
	}

	if (v === "splitPanel") {
		return (
			<section id={block.anchor || "cta"} className="py-20" style={{ backgroundColor: t.sectionBackground }}>
				<div className="container mx-auto px-4">
					<div className="grid grid-cols-1 md:grid-cols-2 border overflow-hidden" style={{ borderColor: t.outline, ...radiusStyle(block, t) }}>
						<div className="p-10" style={{ backgroundColor: t.pageBackground }}>
							<h2 className="text-3xl font-bold" style={{ color: t.titleText }}>
								{block.title}
							</h2>
							<p className="mt-3 text-sm" style={{ color: t.bodyText }}>
								{block.subtitle}
							</p>
						</div>

						<div className="p-10 flex items-center" style={{ backgroundColor: t.sectionBackground }}>
							{block.ctaText ? (
								<Link href={block.ctaHref || "#"}>
									<Button size="lg" style={{ backgroundColor: t.primary, color: t.buttonText }}>
										{block.ctaText}
									</Button>
								</Link>
							) : null}
						</div>
					</div>
				</div>
			</section>
		)
	}

	// clean
	return (
		<section id={block.anchor || "cta"} className="py-20" style={{ backgroundColor: t.pageBackground }}>
			<div className="container mx-auto px-4">
				<div className="border p-10 md:p-14 text-center" style={{ borderColor: t.outline, backgroundColor: t.sectionBackground, ...radiusStyle(block, t) }}>
					<h2 className="text-3xl md:text-4xl font-bold" style={{ color: t.titleText }}>
						{block.title}
					</h2>
					<p className="mt-3 text-lg" style={{ color: t.bodyText }}>
						{block.subtitle}
					</p>

					{block.ctaText ? (
						<div className="mt-7">
							<Link href={block.ctaHref || "#"}>
								<Button size="lg" style={{ backgroundColor: t.primary, color: t.buttonText }}>
									{block.ctaText}
								</Button>
							</Link>
						</div>
					) : null}
				</div>
			</div>
		</section>
	)
}

// -------------------- FORM --------------------
export function RenderForm({ block, theme }) {
	const t = withOverrides(theme, block)
	const fields = Array.isArray(block.fields) ? block.fields : []

	return (
		<section id={block.anchor || "contact"} className="py-20" style={{ backgroundColor: t.sectionBackground }}>
			<div className="container mx-auto px-4">
				<div className="max-w-xl mx-auto border p-8" style={{ borderColor: t.outline, backgroundColor: t.pageBackground, ...radiusStyle(block, t) }}>
					{block.title && (
						<h2 className="text-3xl font-bold" style={{ color: t.titleText }}>
							{block.title}
						</h2>
					)}
					{block.subtitle && (
						<p className="mt-2 text-sm" style={{ color: t.bodyText }}>
							{block.subtitle}
						</p>
					)}

					<form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
						{fields.map((f, i) => {
							const type = f.type || "text"
							if (type === "textarea") {
								return (
									<div key={i} className="space-y-2">
										<label className="text-sm font-medium" style={{ color: t.titleText }}>
											{f.label || "Message"}
											{f.required ? " *" : ""}
										</label>
										<Textarea placeholder={f.placeholder || ""} />
									</div>
								)
							}
							return (
								<div key={i} className="space-y-2">
									<label className="text-sm font-medium" style={{ color: t.titleText }}>
										{f.label || "Field"}
										{f.required ? " *" : ""}
									</label>
									<Input type={type} placeholder={f.placeholder || ""} />
								</div>
							)
						})}

						<Button type="submit" className="w-full" style={{ backgroundColor: t.primary, color: t.buttonText }}>
							{block.submitText || "Submit"}
						</Button>

						<p className="text-xs text-center mt-2" style={{ color: t.bodyText }}>
							* Demo form (no backend attached)
						</p>
					</form>
				</div>
			</div>
		</section>
	)
}

// -------------------- FAQ --------------------
export function RenderFAQ({ block, theme }) {
	const t = withOverrides(theme, block)
	const items = Array.isArray(block.items) ? block.items : []
	const v = block.variant || "cards"

	if (v === "twoColumn") {
		return (
			<section id={block.anchor || "faq"} className="py-20" style={{ backgroundColor: t.sectionBackground }}>
				<div className="container mx-auto px-4">
					<div className="text-center mb-10 max-w-2xl mx-auto">
						{block.title && (
							<h2 className="text-4xl font-bold" style={{ color: t.titleText }}>
								{block.title}
							</h2>
						)}
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
						{items.map((it, i) => (
							<div key={i} className="border p-6" style={{ borderColor: t.outline, backgroundColor: t.pageBackground, ...radiusStyle(block, t) }}>
								<div className="font-semibold" style={{ color: t.titleText }}>
									{it.q}
								</div>
								<div className="mt-2 text-sm" style={{ color: t.bodyText }}>
									{it.a}
								</div>
							</div>
						))}
					</div>
				</div>
			</section>
		)
	}

	// cards
	return (
		<section id={block.anchor || "faq"} className="py-20" style={{ backgroundColor: t.sectionBackground }}>
			<div className="container mx-auto px-4">
				<div className="text-center mb-10 max-w-2xl mx-auto">
					{block.title && (
						<h2 className="text-4xl font-bold" style={{ color: t.titleText }}>
							{block.title}
						</h2>
					)}
				</div>

				<div className="max-w-3xl mx-auto space-y-4">
					{items.map((it, i) => (
						<div key={i} className="border p-6" style={{ borderColor: t.outline, backgroundColor: t.pageBackground, ...radiusStyle(block, t) }}>
							<div className="font-semibold" style={{ color: t.titleText }}>
								{it.q}
							</div>
							<div className="mt-2 text-sm" style={{ color: t.bodyText }}>
								{it.a}
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}

// -------------------- FOOTER --------------------
export function RenderFooter({ block, theme }) {
	const t = withOverrides(theme, block)
	const columns = Array.isArray(block.columns) ? block.columns : []
	const social = Array.isArray(block.social) ? block.social : []

	return (
		<footer className="py-14" style={{ backgroundColor: t.sectionBackground }}>
			<div className="container mx-auto px-4">
				<div className="grid grid-cols-1 md:grid-cols-4 gap-10">
					<div className="md:col-span-1">
						<div className="text-xl font-bold" style={{ color: t.titleText }}>
							{block.brandName || "Brand"}
						</div>
						{block.tagline && (
							<p className="mt-2 text-sm" style={{ color: t.bodyText }}>
								{block.tagline}
							</p>
						)}

						{social.length ? (
							<div className="mt-4 flex gap-2">
								{social.map((s, i) => (
									<a key={i} href={s.url || "#"} className="border px-3 py-2 text-sm" style={{ borderColor: t.outline, color: t.titleText, ...radiusStyle(block, t) }}>
										{s.icon || "🔗"}
									</a>
								))}
							</div>
						) : null}
					</div>

					<div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-8">
						{columns.map((col, i) => (
							<div key={i}>
								<div className="font-semibold" style={{ color: t.titleText }}>
									{col.title}
								</div>
								<ul className="mt-3 space-y-2">
									{(col.links || []).map((l, li) => (
										<li key={li}>
											<Link href={l.href || "#"} className="text-sm hover:opacity-80" style={{ color: t.bodyText }}>
												{l.text}
											</Link>
										</li>
									))}
								</ul>
							</div>
						))}
					</div>
				</div>

				<div className="mt-10 pt-6 border-t flex flex-col md:flex-row items-center justify-between gap-3" style={{ borderColor: t.outline }}>
					<div className="text-xs" style={{ color: t.bodyText }}>
						{block.copyright || `© ${new Date().getFullYear()} ${block.brandName || "Brand"}.`}
					</div>
					<div className="text-xs" style={{ color: t.bodyText }}>
						Built with Landing Builder
					</div>
				</div>
			</div>
		</footer>
	)
}

// -------------------- BANNER --------------------
export function RenderBanner({ block, theme }) {
	const t = withOverrides(theme, block)
	return (
		<div className="w-full border-b" style={{ backgroundColor: t.sectionBackground, borderColor: t.outline }}>
			<div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
				<div className="text-sm" style={{ color: t.titleText }}>
					{block.message || "Announcement"}
				</div>
				{block.ctaText ? (
					<Link href={block.ctaHref || "#"} className="text-sm underline" style={{ color: t.primary }}>
						{block.ctaText}
					</Link>
				) : null}
			</div>
		</div>
	)
}

// -------------------- BASICS --------------------
export function RenderText({ block, theme }) {
	const t = withOverrides(theme, block)
	const align = block.align || "left"
	const size = block.size || "base"
	const sizeClass = size === "sm" ? "text-sm" : size === "lg" ? "text-lg" : "text-base"

	return (
		<section className="py-6" style={{ backgroundColor: "transparent" }}>
			<div className="container mx-auto px-4">
				<div className={`${sizeClass}`} style={{ color: t.bodyText, textAlign: align }}>
					{block.content || ""}
				</div>
			</div>
		</section>
	)
}

export function RenderHeading({ block, theme }) {
	const t = withOverrides(theme, block)
	const align = block.align || "left"
	const level = Number(block.level || 2)

	const Tag = level === 1 ? "h1" : level === 3 ? "h3" : level === 4 ? "h4" : "h2"
	const cls = level === 1 ? "text-5xl md:text-6xl" : level === 3 ? "text-2xl" : level === 4 ? "text-xl" : "text-3xl"

	return (
		<section className="py-6" style={{ backgroundColor: "transparent" }}>
			<div className="container mx-auto px-4">
				<Tag className={`${cls} font-bold`} style={{ color: t.titleText, textAlign: align }}>
					{block.text || "Heading"}
				</Tag>
			</div>
		</section>
	)
}

export function RenderButton({ block, theme }) {
	const t = withOverrides(theme, block)
	const variant = block.variant || "primary"
	const style =
		variant === "secondary"
			? { backgroundColor: t.secondary, color: t.buttonText }
			: { backgroundColor: t.primary, color: t.buttonText }

	return (
		<section className="py-6">
			<div className="container mx-auto px-4">
				<Link href={block.href || "#"}>
					<Button style={style}>{block.text || "Click"}</Button>
				</Link>
			</div>
		</section>
	)
}

export function RenderImage({ block }) {
	return (
		<section className="py-6">
			<div className="container mx-auto px-4">
				<img
					src={block.url || "/placeholder.svg"}
					alt={block.alt || "Image"}
					className="w-full object-cover"
					style={{ height: `${Number(block.height || 280)}px` }}
				/>
			</div>
		</section>
	)
}

// -------------------- MEDIA --------------------
export function RenderVideo({ block }) {
	const ratio = block.ratio || "16:9"
	const paddingTop = ratio === "4:3" ? "75%" : "56.25%" // 4:3 or 16:9

	return (
		<section className="py-10">
			<div className="container mx-auto px-4">
				{block.title ? <div className="mb-3 font-semibold">{block.title}</div> : null}
				<div className="relative w-full overflow-hidden border" style={{ paddingTop }}>
					<iframe
						title={block.title || "video"}
						src={block.embedUrl || ""}
						className="absolute inset-0 w-full h-full"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowFullScreen
					/>
				</div>
			</div>
		</section>
	)
}

export function RenderGallery({ block }) {
	const cols = Number(block.columns || 3)
	const images = Array.isArray(block.images) ? block.images : []
	const gridClass =
		cols === 2 ? "md:grid-cols-2" : cols === 4 ? "md:grid-cols-4" : cols === 1 ? "md:grid-cols-1" : "md:grid-cols-3"

	return (
		<section className="py-16">
			<div className="container mx-auto px-4">
				{block.title ? <h3 className="text-2xl font-bold mb-6">{block.title}</h3> : null}
				<div className={`grid grid-cols-1 ${gridClass} gap-4`}>
					{images.map((img, i) => (
						<img key={i} src={img.url || "/placeholder.svg"} alt={img.alt || `Image ${i + 1}`} className="w-full h-64 object-cover border" />
					))}
				</div>
			</div>
		</section>
	)
}

// -------------------- MISC --------------------
export function RenderSpacer({ block }) {
	const h = Number(block.height || 40)
	return <div style={{ height: `${h}px` }} />
}

export function RenderDivider({ block, theme }) {
	const t = withOverrides(theme, block)
	const thickness = Number(block.thickness || 1)

	return (
		<div className="container mx-auto px-4 py-6">
			<div style={{ height: `${thickness}px`, backgroundColor: t.outline, width: "100%" }} />
		</div>
	)
}

export function RenderHTML({ block }) {
	return (
		<section className="py-6">
			<div className="container mx-auto px-4">
				<div dangerouslySetInnerHTML={{ __html: block.html || "" }} />
			</div>
		</section>
	)
}
