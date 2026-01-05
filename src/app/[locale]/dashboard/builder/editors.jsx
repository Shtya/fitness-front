// --- File: builder/editors.jsx ---
"use client"

import React, { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { GripVertical, Trash2, Plus, Minus, BadgeCheck, Link2, ChevronDown, ArrowUp, ArrowDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"




export function FormSection({ title, description, right, children }) {
	return (
		<Card className="rounded-md border bg-background p-4 sm:p-5 shadow-sm">
			<div className="flex items-start justify-between gap-3">
				<div className="space-y-1">
					<div className="text-sm font-semibold leading-none">{title}</div>
					{description ? <div className="text-xs text-muted-foreground">{description}</div> : null}
				</div>
				{right ? <div className="shrink-0">{right}</div> : null}
			</div>

			<Separator className="my-2" />

			<div className="space-y-4">{children}</div>
		</Card>
	)
}

export function FormSection2({ title, description, right, children, defaultOpen = true }) {
	const [open, setOpen] = useState(defaultOpen)

	return (
		<Card className=" !gap-0  rounded-md border bg-background p-3 shadow-none border-slate-200 ">
			<div
				className=" flex items-start justify-between gap-3 cursor-pointer select-none"
				onClick={() => setOpen(!open)}
			>
				<div className="space-y-1">
					<div className="text-sm font-semibold leading-none">{title}</div>
					{description ? (
						<div className="text-xs text-muted-foreground">{description}</div>
					) : null}
				</div>

				<div className="flex items-center gap-2 shrink-0">
					{right ? <div onClick={(e) => e.stopPropagation()}>{right}</div> : null}

					<ChevronDown
						className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""
							}`}
					/>
				</div>
			</div>

			{/* Content */}
			<div className={`  overflow-hidden transition-all duration-200 ${open ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"}`} >
				<Separator className=" my-4  " />
				<div className="space-y-4 px-[3px]">{children}</div>
			</div>
		</Card>
	)
}


export function Field({ label, hint, required, helper, children }) {
	return (
		<div className="space-y-[3px]">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<Label className="text-xs">{label}</Label>
					{required ? (
						<Badge variant="secondary" className="h-5 px-2 rounded-full text-[10px]">
							Required
						</Badge>
					) : null}
				</div>
				{hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
			</div>

			{children}

			{helper ? <div className="text-xs text-muted-foreground">{helper}</div> : null}
		</div>
	)
}

export function Row2({ children }) {
	return <div className="grid gap-3 sm:grid-cols-2">{children}</div>
}

export function ListItemCard({ title, subtitle, onDelete, leftIcon, children }) {
	return (
		<div className="rounded-md border bg-background p-3 sm:p-4 space-y-3 shadow-sm">
			<div className="flex items-start justify-between gap-3">
				<div className="flex items-start gap-2">
					<div className="mt-0.5 text-muted-foreground">
						{leftIcon ? leftIcon : <GripVertical className="h-4 w-4 opacity-60" />}
					</div>
					<div className="space-y-0.5">
						<div className="text-xs font-semibold text-muted-foreground">{title}</div>
						{subtitle ? <div className="text-[11px] text-muted-foreground">{subtitle}</div> : null}
					</div>
				</div>

				{onDelete ? (
					<Button size="icon" variant="ghost" onClick={onDelete} className="h-8 w-8 rounded-md">
						<Trash2 className="h-4 w-4 text-red-500" />
					</Button>
				) : null}
			</div>

			{children}
		</div>
	)
}

function normalizeLinks(links) {
	if (!Array.isArray(links)) return []
	return links.map((l) => ({
		text: typeof (l && l.text) === "string" ? l.text : "",
		href: typeof (l && l.href) === "string" ? l.href : "#",
	}))
}

function isValidAnchorOrUrl(href) {
	return (
		typeof href === "string" &&
		(href.startsWith("#") ||
			href.startsWith("/") ||
			href.startsWith("https://") ||
			href.startsWith("http://") ||
			href.startsWith("mailto:") ||
			href.startsWith("tel:"))
	)
}

export function NavbarEditor({ block, updateBlock }) {
	const links = useMemo(() => normalizeLinks(block.links), [block.links])

	// safe defaults (won't break old docs)
	const sticky = block.sticky !== false
	const mobileMenu = block.mobileMenu || "drawer"
	const showMobileCta = block.mobileCta !== false
	const showMobileLogo = block.mobileLogo !== false

	return (
		<div className="space-y-6">
			<FormSection
				title="Basics"
				description="Brand, logo, and behavior"
				right={
					<Badge variant="secondary" className="rounded-full">
						Navbar
					</Badge>
				}
			>
				<Field label="Brand Name" required>
					<Input
						value={block.brandName || ""}
						onChange={(e) => updateBlock(block.id, { brandName: e.target.value })}
						placeholder="Your brand"
						className="rounded-md"
					/>
				</Field>

				<Field label="Logo URL" hint="Optional" helper="Tip: use an SVG for the sharpest logo.">
					<Input
						value={block.logo || ""}
						onChange={(e) => updateBlock(block.id, { logo: e.target.value })}
						placeholder="https://..."
						className="rounded-md"
					/>
				</Field>

				<div className="flex items-center justify-between rounded-md border px-3 py-3">
					<div className="space-y-0.5">
						<div className="text-sm font-medium">Sticky navigation</div>
						<div className="text-xs text-muted-foreground">Stays visible while scrolling</div>
					</div>
					<Switch checked={sticky} onCheckedChange={(checked) => updateBlock(block.id, { sticky: checked })} />
				</div>
			</FormSection>

			<FormSection
				title="Mobile menu"
				description="Burger icon behavior on small screens"
				right={
					<div className="flex items-center gap-2">
						<Badge variant="secondary" className="rounded-full">
							🍔
						</Badge>
						<Badge variant="outline" className="rounded-full">
							{mobileMenu === "drawer" ? "Drawer" : "Dropdown"}
						</Badge>
					</div>
				}
			>
				<Row2>
					<Field label="Menu style" helper="Drawer looks more premium on mobile.">
						<div className="flex gap-2">
							<Button
								type="button"
								variant={mobileMenu === "drawer" ? "default" : "outline"}
								className="flex-1 rounded-md"
								onClick={() => updateBlock(block.id, { mobileMenu: "drawer" })}
							>
								Drawer
							</Button>
							<Button
								type="button"
								variant={mobileMenu === "dropdown" ? "default" : "outline"}
								className="flex-1 rounded-md"
								onClick={() => updateBlock(block.id, { mobileMenu: "dropdown" })}
							>
								Dropdown
							</Button>
						</div>
					</Field>

					<Field label="Show logo on mobile">
						<div className="flex items-center justify-between rounded-md border px-3 py-3">
							<div className="text-xs text-muted-foreground">Display brand/logo in mobile header</div>
							<Switch
								checked={showMobileLogo}
								onCheckedChange={(checked) => updateBlock(block.id, { mobileLogo: checked })}
							/>
						</div>
					</Field>
				</Row2>

				<Field label="Show CTA button in mobile menu" helper="Recommended: improves conversions.">
					<div className="flex items-center justify-between rounded-md border px-3 py-3">
						<div className="text-xs text-muted-foreground">Include the CTA inside the burger menu</div>
						<Switch
							checked={showMobileCta}
							onCheckedChange={(checked) => updateBlock(block.id, { mobileCta: checked })}
						/>
					</div>
				</Field>
			</FormSection>

			<FormSection
				title="Navigation links"
				description="Shown in the navbar and mobile menu"
				right={
					<Button
						size="sm"
						className="rounded-md"
						onClick={() => updateBlock(block.id, { links: [...links, { text: "Link", href: "#" }] })}
					>
						<Plus className="h-4 w-4 mr-1" /> Add
					</Button>
				}
			>
				{links.length === 0 ? (
					<div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
						No links yet — add your first one.
					</div>
				) : null}

				<div className="space-y-3">
					{links.map((link, idx) => {
						const hrefOk = isValidAnchorOrUrl(link.href)

						return (
							<ListItemCard
								key={idx}
								title={`Link #${idx + 1}`}
								subtitle={hrefOk ? "Valid link" : "Invalid link format"}
								leftIcon={hrefOk ? <BadgeCheck className="h-4 w-4 text-green-600" /> : <Link2 className="h-4 w-4 opacity-60" />}
								onDelete={() => updateBlock(block.id, { links: links.filter((_, i) => i !== idx) })}
							>
								<Row2>
									<Input
										value={link.text || ""}
										onChange={(e) => {
											const next = [...links]
											next[idx] = { ...next[idx], text: e.target.value }
											updateBlock(block.id, { links: next })
										}}
										placeholder="Link text"
										className="rounded-md"
									/>

									<Input
										value={link.href || ""}
										onChange={(e) => {
											const next = [...links]
											next[idx] = { ...next[idx], href: e.target.value }
											updateBlock(block.id, { links: next })
										}}
										placeholder="#features or /pricing or https://..."
										className="rounded-md"
									/>
								</Row2>

								{!hrefOk ? (
									<div className="text-xs text-red-500">
										Allowed: <code className="font-mono">#anchor</code>, <code className="font-mono">/path</code>,{" "}
										<code className="font-mono">https://</code>, <code className="font-mono">mailto:</code>,{" "}
										<code className="font-mono">tel:</code>
									</div>
								) : null}
							</ListItemCard>
						)
					})}
				</div>
			</FormSection>

			<FormSection title="CTA button" description="Primary action in the navbar & mobile menu">
				<Row2>
					<Field label="CTA Text">
						<Input
							value={block.ctaText || ""}
							onChange={(e) => updateBlock(block.id, { ctaText: e.target.value })}
							placeholder="Get Started"
							className="rounded-md"
						/>
					</Field>

					<Field label="CTA Link">
						<Input
							value={block.ctaHref || ""}
							onChange={(e) => updateBlock(block.id, { ctaHref: e.target.value })}
							placeholder="#contact"
							className="rounded-md"
						/>
					</Field>
				</Row2>
			</FormSection>
		</div>
	)
}

export function HeroEditor({ block, updateBlock }) {
	return (
		<div className="space-y-4">
			<div>
				<Label>Anchor ID</Label>
				<Input
					value={block.anchor || ""}
					onChange={(e) => updateBlock(block.id, { anchor: e.target.value })}
					placeholder="hero"
				/>
			</div>

			<div>
				<Label>Headline</Label>
				<Textarea
					value={block.headline || ""}
					onChange={(e) => updateBlock(block.id, { headline: e.target.value })}
					rows={2}
				/>
			</div>

			<div>
				<Label>Subheadline</Label>
				<Textarea
					value={block.subheadline || ""}
					onChange={(e) => updateBlock(block.id, { subheadline: e.target.value })}
					rows={2}
				/>
			</div>

			<div>
				<Label>Background Image URL</Label>
				<Input
					value={block.imageUrl || ""}
					onChange={(e) => updateBlock(block.id, { imageUrl: e.target.value })}
					placeholder="https://..."
				/>
			</div>

			<Separator />

			<div>
				<Label>Primary CTA</Label>
				<div className="grid grid-cols-[1fr_100px] gap-2 mt-2">
					<Input
						value={block.primaryCtaText || ""}
						onChange={(e) => updateBlock(block.id, { primaryCtaText: e.target.value })}
						placeholder="Button text"
					/>
					<Input
						value={block.primaryCtaHref || ""}
						onChange={(e) => updateBlock(block.id, { primaryCtaHref: e.target.value })}
						placeholder="#"
					/>
				</div>
			</div>

			<div>
				<Label>Secondary CTA</Label>
				<div className="grid grid-cols-[1fr_100px] gap-2 mt-2">
					<Input
						value={block.secondaryCtaText || ""}
						onChange={(e) => updateBlock(block.id, { secondaryCtaText: e.target.value })}
						placeholder="Button text"
					/>
					<Input
						value={block.secondaryCtaHref || ""}
						onChange={(e) => updateBlock(block.id, { secondaryCtaHref: e.target.value })}
						placeholder="#"
					/>
				</div>
			</div>
		</div>
	)
}

export function StatsEditor({ block, updateBlock }) {
	const items = Array.isArray(block.items) ? block.items : []

	return (
		<div className="space-y-4">
			<div>
				<Label>Title</Label>
				<Input value={block.title || ""} onChange={(e) => updateBlock(block.id, { title: e.target.value })} />
			</div>

			<div>
				<Label>Anchor ID</Label>
				<Input
					value={block.anchor || ""}
					onChange={(e) => updateBlock(block.id, { anchor: e.target.value })}
					placeholder="stats"
				/>
			</div>

			<Separator />

			<div>
				<div className="flex items-center justify-between mb-3">
					<Label>Stats Items</Label>
					<Button
						size="sm"
						onClick={() => updateBlock(block.id, { items: [...items, { label: "Metric", value: "0" }] })}
					>
						<Plus className="h-3 w-3 mr-1" /> Add
					</Button>
				</div>

				<div className="space-y-2">
					{items.map((item, idx) => (
						<div key={idx} className="border rounded p-3 space-y-2">
							<div className="flex items-center justify-between">
								<span className="text-xs font-semibold text-gray-500">Stat #{idx + 1}</span>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => updateBlock(block.id, { items: items.filter((_, i) => i !== idx) })}
								>
									<Trash2 className="h-3 w-3 text-red-500" />
								</Button>
							</div>
							<Input
								value={item.value || ""}
								onChange={(e) => {
									const next = [...items]
									next[idx] = { ...next[idx], value: e.target.value }
									updateBlock(block.id, { items: next })
								}}
								placeholder="10K+"
							/>
							<Input
								value={item.label || ""}
								onChange={(e) => {
									const next = [...items]
									next[idx] = { ...next[idx], label: e.target.value }
									updateBlock(block.id, { items: next })
								}}
								placeholder="Active Users"
							/>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

export function FeaturesEditor({ block, updateBlock }) {
	const items = Array.isArray(block.items) ? block.items : []

	return (
		<div className="space-y-4">
			<div>
				<Label>Title</Label>
				<Input value={block.title || ""} onChange={(e) => updateBlock(block.id, { title: e.target.value })} />
			</div>

			<div>
				<Label>Subtitle</Label>
				<Input value={block.subtitle || ""} onChange={(e) => updateBlock(block.id, { subtitle: e.target.value })} />
			</div>

			<div>
				<Label>Anchor ID</Label>
				<Input
					value={block.anchor || ""}
					onChange={(e) => updateBlock(block.id, { anchor: e.target.value })}
					placeholder="features"
				/>
			</div>

			<Separator />

			<div>
				<div className="flex items-center justify-between mb-3">
					<Label>Feature Items</Label>
					<Button
						size="sm"
						onClick={() =>
							updateBlock(block.id, { items: [...items, { title: "Feature", desc: "Description", icon: "⭐" }] })
						}
					>
						<Plus className="h-3 w-3 mr-1" /> Add
					</Button>
				</div>

				<div className="space-y-3">
					{items.map((item, idx) => (
						<div key={idx} className="border rounded p-3 space-y-2">
							<div className="flex items-center justify-between">
								<span className="text-xs font-semibold text-gray-500">Feature #{idx + 1}</span>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => updateBlock(block.id, { items: items.filter((_, i) => i !== idx) })}
								>
									<Trash2 className="h-3 w-3 text-red-500" />
								</Button>
							</div>
							<div className="grid grid-cols-[50px_1fr] gap-2">
								<Input
									value={item.icon || ""}
									onChange={(e) => {
										const next = [...items]
										next[idx] = { ...next[idx], icon: e.target.value }
										updateBlock(block.id, { items: next })
									}}
									placeholder="⭐"
									className="text-center"
								/>
								<Input
									value={item.title || ""}
									onChange={(e) => {
										const next = [...items]
										next[idx] = { ...next[idx], title: e.target.value }
										updateBlock(block.id, { items: next })
									}}
									placeholder="Title"
								/>
							</div>
							<Textarea
								value={item.desc || ""}
								onChange={(e) => {
									const next = [...items]
									next[idx] = { ...next[idx], desc: e.target.value }
									updateBlock(block.id, { items: next })
								}}
								placeholder="Description"
								rows={2}
							/>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

export function PricingEditor({ block, updateBlock }) {
	const plans = Array.isArray(block.plans) ? block.plans : []

	return (
		<div className="space-y-4">
			<div>
				<Label>Title</Label>
				<Input value={block.title || ""} onChange={(e) => updateBlock(block.id, { title: e.target.value })} />
			</div>

			<div>
				<Label>Subtitle</Label>
				<Input value={block.subtitle || ""} onChange={(e) => updateBlock(block.id, { subtitle: e.target.value })} />
			</div>

			<div>
				<Label>Anchor ID</Label>
				<Input
					value={block.anchor || ""}
					onChange={(e) => updateBlock(block.id, { anchor: e.target.value })}
					placeholder="pricing"
				/>
			</div>

			<Separator />

			<div>
				<div className="flex items-center justify-between mb-3">
					<Label>Pricing Plans</Label>
					<Button
						size="sm"
						onClick={() =>
							updateBlock(block.id, {
								plans: [
									...plans,
									{
										name: "Plan",
										price: "$0",
										period: "/mo",
										bullets: ["Feature 1"],
										ctaText: "Get Started",
										ctaHref: "#",
										highlight: false,
									},
								],
							})
						}
					>
						<Plus className="h-3 w-3 mr-1" /> Add Plan
					</Button>
				</div>

				<div className="space-y-4">
					{plans.map((plan, idx) => (
						<div key={idx} className="border rounded p-3 space-y-3">
							<div className="flex items-center justify-between">
								<Input
									value={plan.name || ""}
									onChange={(e) => {
										const next = [...plans]
										next[idx] = { ...next[idx], name: e.target.value }
										updateBlock(block.id, { plans: next })
									}}
									placeholder="Plan name"
								/>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => updateBlock(block.id, { plans: plans.filter((_, i) => i !== idx) })}
								>
									<Trash2 className="h-3 w-3 text-red-500" />
								</Button>
							</div>

							<div className="grid grid-cols-2 gap-2">
								<Input
									value={plan.price || ""}
									onChange={(e) => {
										const next = [...plans]
										next[idx] = { ...next[idx], price: e.target.value }
										updateBlock(block.id, { plans: next })
									}}
									placeholder="$29"
								/>
								<Input
									value={plan.period || ""}
									onChange={(e) => {
										const next = [...plans]
										next[idx] = { ...next[idx], period: e.target.value }
										updateBlock(block.id, { plans: next })
									}}
									placeholder="/month"
								/>
							</div>

							<div className="flex items-center gap-2">
								<Switch
									checked={plan.highlight || false}
									onCheckedChange={(checked) => {
										const next = [...plans]
										next[idx] = { ...next[idx], highlight: checked }
										updateBlock(block.id, { plans: next })
									}}
								/>
								<Label className="text-xs">Highlight</Label>
							</div>

							<div className="grid grid-cols-[1fr_100px] gap-2">
								<Input
									value={plan.ctaText || ""}
									onChange={(e) => {
										const next = [...plans]
										next[idx] = { ...next[idx], ctaText: e.target.value }
										updateBlock(block.id, { plans: next })
									}}
									placeholder="CTA"
								/>
								<Input
									value={plan.ctaHref || ""}
									onChange={(e) => {
										const next = [...plans]
										next[idx] = { ...next[idx], ctaHref: e.target.value }
										updateBlock(block.id, { plans: next })
									}}
									placeholder="#"
								/>
							</div>

							<div>
								<div className="flex items-center justify-between mb-2">
									<Label className="text-xs">Features</Label>
									<Button
										size="sm"
										variant="ghost"
										onClick={() => {
											const next = [...plans]
											next[idx].bullets = [...(next[idx].bullets || []), "New feature"]
											updateBlock(block.id, { plans: next })
										}}
									>
										<Plus className="h-3 w-3" />
									</Button>
								</div>
								<div className="space-y-1">
									{(plan.bullets || []).map((bullet, bIdx) => (
										<div key={bIdx} className="flex gap-1">
											<Input
												value={bullet}
												onChange={(e) => {
													const next = [...plans]
													next[idx].bullets[bIdx] = e.target.value
													updateBlock(block.id, { plans: next })
												}}
												className="text-xs"
											/>
											<Button
												size="sm"
												variant="ghost"
												onClick={() => {
													const next = [...plans]
													next[idx].bullets = next[idx].bullets.filter((_, i) => i !== bIdx)
													updateBlock(block.id, { plans: next })
												}}
											>
												<Minus className="h-3 w-3" />
											</Button>
										</div>
									))}
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

export function TestimonialsEditor({ block, updateBlock }) {
	const quotes = Array.isArray(block.quotes) ? block.quotes : []

	return (
		<div className="space-y-4">
			<div>
				<Label>Title</Label>
				<Input value={block.title || ""} onChange={(e) => updateBlock(block.id, { title: e.target.value })} />
			</div>

			<div>
				<Label>Anchor ID</Label>
				<Input
					value={block.anchor || ""}
					onChange={(e) => updateBlock(block.id, { anchor: e.target.value })}
					placeholder="testimonials"
				/>
			</div>

			<Separator />

			<div>
				<div className="flex items-center justify-between mb-3">
					<Label>Testimonials</Label>
					<Button
						size="sm"
						onClick={() =>
							updateBlock(block.id, {
								quotes: [...quotes, { name: "Name", role: "Role", quote: "Quote", avatar: "👤" }],
							})
						}
					>
						<Plus className="h-3 w-3 mr-1" /> Add
					</Button>
				</div>

				<div className="space-y-3">
					{quotes.map((q, idx) => (
						<div key={idx} className="border rounded p-3 space-y-2">
							<div className="flex items-center justify-between">
								<span className="text-xs font-semibold text-gray-500">Testimonial #{idx + 1}</span>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => updateBlock(block.id, { quotes: quotes.filter((_, i) => i !== idx) })}
								>
									<Trash2 className="h-3 w-3 text-red-500" />
								</Button>
							</div>
							<div className="grid grid-cols-[50px_1fr] gap-2">
								<Input
									value={q.avatar || ""}
									onChange={(e) => {
										const next = [...quotes]
										next[idx] = { ...next[idx], avatar: e.target.value }
										updateBlock(block.id, { quotes: next })
									}}
									placeholder="👤"
									className="text-center"
								/>
								<Input
									value={q.name || ""}
									onChange={(e) => {
										const next = [...quotes]
										next[idx] = { ...next[idx], name: e.target.value }
										updateBlock(block.id, { quotes: next })
									}}
									placeholder="Name"
								/>
							</div>
							<Input
								value={q.role || ""}
								onChange={(e) => {
									const next = [...quotes]
									next[idx] = { ...next[idx], role: e.target.value }
									updateBlock(block.id, { quotes: next })
								}}
								placeholder="Role"
							/>
							<Textarea
								value={q.quote || ""}
								onChange={(e) => {
									const next = [...quotes]
									next[idx] = { ...next[idx], quote: e.target.value }
									updateBlock(block.id, { quotes: next })
								}}
								placeholder="Quote"
								rows={3}
							/>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

export function CTAEditor({ block, updateBlock }) {
	return (
		<div className="space-y-4">
			<div>
				<Label>Anchor ID</Label>
				<Input
					value={block.anchor || ""}
					onChange={(e) => updateBlock(block.id, { anchor: e.target.value })}
					placeholder="cta"
				/>
			</div>

			<div>
				<Label>Title</Label>
				<Input value={block.title || ""} onChange={(e) => updateBlock(block.id, { title: e.target.value })} />
			</div>

			<div>
				<Label>Subtitle</Label>
				<Input value={block.subtitle || ""} onChange={(e) => updateBlock(block.id, { subtitle: e.target.value })} />
			</div>

			<Separator />

			<div>
				<Label>CTA Button</Label>
				<div className="grid grid-cols-[1fr_100px] gap-2 mt-2">
					<Input
						value={block.ctaText || ""}
						onChange={(e) => updateBlock(block.id, { ctaText: e.target.value })}
						placeholder="Button text"
					/>
					<Input
						value={block.ctaHref || ""}
						onChange={(e) => updateBlock(block.id, { ctaHref: e.target.value })}
						placeholder="#"
					/>
				</div>
			</div>
		</div>
	)
}

export function FormEditor({ block, updateBlock }) {
	const fields = Array.isArray(block.fields) ? block.fields : []

	return (
		<div className="space-y-4">
			<div>
				<Label>Title</Label>
				<Input value={block.title || ""} onChange={(e) => updateBlock(block.id, { title: e.target.value })} />
			</div>

			<div>
				<Label>Subtitle</Label>
				<Input value={block.subtitle || ""} onChange={(e) => updateBlock(block.id, { subtitle: e.target.value })} />
			</div>

			<div>
				<Label>Anchor ID</Label>
				<Input
					value={block.anchor || ""}
					onChange={(e) => updateBlock(block.id, { anchor: e.target.value })}
					placeholder="contact"
				/>
			</div>

			<div>
				<Label>Submit Button Text</Label>
				<Input value={block.submitText || ""} onChange={(e) => updateBlock(block.id, { submitText: e.target.value })} />
			</div>

			<Separator />

			<div>
				<div className="flex items-center justify-between mb-3">
					<Label>Form Fields</Label>
					<Button
						size="sm"
						onClick={() =>
							updateBlock(block.id, {
								fields: [...fields, { label: "Field", type: "text", placeholder: "", required: false }],
							})
						}
					>
						<Plus className="h-3 w-3 mr-1" /> Add
					</Button>
				</div>

				<div className="space-y-3">
					{fields.map((field, idx) => (
						<div key={idx} className="border rounded p-3 space-y-2">
							<div className="flex items-center justify-between">
								<span className="text-xs font-semibold text-gray-500">Field #{idx + 1}</span>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => updateBlock(block.id, { fields: fields.filter((_, i) => i !== idx) })}
								>
									<Trash2 className="h-3 w-3 text-red-500" />
								</Button>
							</div>
							<Input
								value={field.label || ""}
								onChange={(e) => {
									const next = [...fields]
									next[idx] = { ...next[idx], label: e.target.value }
									updateBlock(block.id, { fields: next })
								}}
								placeholder="Label"
							/>
							<Select
								value={field.type || "text"}
								onValueChange={(value) => {
									const next = [...fields]
									next[idx] = { ...next[idx], type: value }
									updateBlock(block.id, { fields: next })
								}}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="text">Text</SelectItem>
									<SelectItem value="email">Email</SelectItem>
									<SelectItem value="tel">Phone</SelectItem>
									<SelectItem value="textarea">Textarea</SelectItem>
								</SelectContent>
							</Select>
							<Input
								value={field.placeholder || ""}
								onChange={(e) => {
									const next = [...fields]
									next[idx] = { ...next[idx], placeholder: e.target.value }
									updateBlock(block.id, { fields: next })
								}}
								placeholder="Placeholder"
							/>
							<div className="flex items-center gap-2">
								<Switch
									checked={field.required || false}
									onCheckedChange={(checked) => {
										const next = [...fields]
										next[idx] = { ...next[idx], required: checked }
										updateBlock(block.id, { fields: next })
									}}
								/>
								<Label className="text-xs">Required</Label>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

export function FAQEditor({ block, updateBlock }) {
	const items = Array.isArray(block.items) ? block.items : []

	return (
		<div className="space-y-4">
			<div>
				<Label>Title</Label>
				<Input value={block.title || ""} onChange={(e) => updateBlock(block.id, { title: e.target.value })} />
			</div>

			<div>
				<Label>Anchor ID</Label>
				<Input
					value={block.anchor || ""}
					onChange={(e) => updateBlock(block.id, { anchor: e.target.value })}
					placeholder="faq"
				/>
			</div>

			<Separator />

			<div>
				<div className="flex items-center justify-between mb-3">
					<Label>FAQ Items</Label>
					<Button
						size="sm"
						onClick={() => updateBlock(block.id, { items: [...items, { q: "Question?", a: "Answer" }] })}
					>
						<Plus className="h-3 w-3 mr-1" /> Add
					</Button>
				</div>

				<div className="space-y-3">
					{items.map((item, idx) => (
						<div key={idx} className="border rounded p-3 space-y-2">
							<div className="flex items-center justify-between">
								<span className="text-xs font-semibold text-gray-500">Question #{idx + 1}</span>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => updateBlock(block.id, { items: items.filter((_, i) => i !== idx) })}
								>
									<Trash2 className="h-3 w-3 text-red-500" />
								</Button>
							</div>
							<Input
								value={item.q || ""}
								onChange={(e) => {
									const next = [...items]
									next[idx] = { ...next[idx], q: e.target.value }
									updateBlock(block.id, { items: next })
								}}
								placeholder="Question?"
							/>
							<Textarea
								value={item.a || ""}
								onChange={(e) => {
									const next = [...items]
									next[idx] = { ...next[idx], a: e.target.value }
									updateBlock(block.id, { items: next })
								}}
								placeholder="Answer"
								rows={2}
							/>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

export function FooterEditor({ block, updateBlock }) {
	const columns = Array.isArray(block.columns) ? block.columns : []
	const social = Array.isArray(block.social) ? block.social : []

	return (
		<div className="space-y-4">
			<div>
				<Label>Brand Name</Label>
				<Input value={block.brandName || ""} onChange={(e) => updateBlock(block.id, { brandName: e.target.value })} />
			</div>

			<div>
				<Label>Tagline</Label>
				<Input value={block.tagline || ""} onChange={(e) => updateBlock(block.id, { tagline: e.target.value })} />
			</div>

			<div>
				<Label>Copyright</Label>
				<Input value={block.copyright || ""} onChange={(e) => updateBlock(block.id, { copyright: e.target.value })} />
			</div>

			<Separator />

			<div>
				<div className="flex items-center justify-between mb-3">
					<Label>Footer Columns</Label>
					<Button
						size="sm"
						onClick={() =>
							updateBlock(block.id, {
								columns: [...columns, { title: "Column", links: [{ text: "Link", href: "#" }] }],
							})
						}
					>
						<Plus className="h-3 w-3 mr-1" /> Add Column
					</Button>
				</div>

				<div className="space-y-3">
					{columns.map((col, colIdx) => (
						<div key={colIdx} className="border rounded p-3 space-y-2">
							<div className="flex items-center justify-between">
								<Input
									value={col.title || ""}
									onChange={(e) => {
										const next = [...columns]
										next[colIdx] = { ...next[colIdx], title: e.target.value }
										updateBlock(block.id, { columns: next })
									}}
									placeholder="Column title"
									className="flex-1 mr-2"
								/>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => updateBlock(block.id, { columns: columns.filter((_, i) => i !== colIdx) })}
								>
									<Trash2 className="h-3 w-3 text-red-500" />
								</Button>
							</div>

							<div className="pl-2 space-y-1">
								{(col.links || []).map((link, linkIdx) => (
									<div key={linkIdx} className="flex gap-1">
										<Input
											value={link.text || ""}
											onChange={(e) => {
												const next = [...columns]
												next[colIdx].links[linkIdx] = { ...next[colIdx].links[linkIdx], text: e.target.value }
												updateBlock(block.id, { columns: next })
											}}
											placeholder="Link"
											className="text-xs"
										/>
										<Input
											value={link.href || ""}
											onChange={(e) => {
												const next = [...columns]
												next[colIdx].links[linkIdx] = { ...next[colIdx].links[linkIdx], href: e.target.value }
												updateBlock(block.id, { columns: next })
											}}
											placeholder="#"
											className="w-16 text-xs"
										/>
										<Button
											size="sm"
											variant="ghost"
											onClick={() => {
												const next = [...columns]
												next[colIdx].links = next[colIdx].links.filter((_, i) => i !== linkIdx)
												updateBlock(block.id, { columns: next })
											}}
										>
											<Minus className="h-3 w-3" />
										</Button>
									</div>
								))}
								<Button
									size="sm"
									variant="ghost"
									onClick={() => {
										const next = [...columns]
										next[colIdx].links = [...(next[colIdx].links || []), { text: "Link", href: "#" }]
										updateBlock(block.id, { columns: next })
									}}
									className="w-full"
								>
									<Plus className="h-3 w-3 mr-1" /> Add Link
								</Button>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

export function BannerEditor({ block, updateBlock }) {
	return (
		<div className="space-y-4">
			<div>
				<Label>Message</Label>
				<Input value={block.message || ""} onChange={(e) => updateBlock(block.id, { message: e.target.value })} />
			</div>

			<div>
				<Label>CTA Button (optional)</Label>
				<div className="grid grid-cols-[1fr_100px] gap-2 mt-2">
					<Input
						value={block.ctaText || ""}
						onChange={(e) => updateBlock(block.id, { ctaText: e.target.value })}
						placeholder="Button text"
					/>
					<Input
						value={block.ctaHref || ""}
						onChange={(e) => updateBlock(block.id, { ctaHref: e.target.value })}
						placeholder="#"
					/>
				</div>
			</div>
		</div>
	)
}

export function TextEditor({ block, updateBlock }) {
	return (
		<div className="space-y-4">
			<div>
				<Label>Content</Label>
				<Textarea
					value={block.content || ""}
					onChange={(e) => updateBlock(block.id, { content: e.target.value })}
					rows={4}
				/>
			</div>

			<div>
				<Label>Alignment</Label>
				<Select value={block.align || "left"} onValueChange={(value) => updateBlock(block.id, { align: value })}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="left">Left</SelectItem>
						<SelectItem value="center">Center</SelectItem>
						<SelectItem value="right">Right</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div>
				<Label>Size</Label>
				<Select value={block.size || "base"} onValueChange={(value) => updateBlock(block.id, { size: value })}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="sm">Small</SelectItem>
						<SelectItem value="base">Base</SelectItem>
						<SelectItem value="lg">Large</SelectItem>
					</SelectContent>
				</Select>
			</div>
		</div>
	)
}

export function HeadingEditor({ block, updateBlock }) {
	return (
		<div className="space-y-4">
			<div>
				<Label>Text</Label>
				<Input value={block.text || ""} onChange={(e) => updateBlock(block.id, { text: e.target.value })} />
			</div>

			<div>
				<Label>Level</Label>
				<Select
					value={String(block.level || 2)}
					onValueChange={(value) => updateBlock(block.id, { level: Number(value) })}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="1">H1</SelectItem>
						<SelectItem value="2">H2</SelectItem>
						<SelectItem value="3">H3</SelectItem>
						<SelectItem value="4">H4</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div>
				<Label>Alignment</Label>
				<Select value={block.align || "left"} onValueChange={(value) => updateBlock(block.id, { align: value })}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="left">Left</SelectItem>
						<SelectItem value="center">Center</SelectItem>
						<SelectItem value="right">Right</SelectItem>
					</SelectContent>
				</Select>
			</div>
		</div>
	)
}

export function ButtonEditor({ block, updateBlock }) {
	return (
		<div className="space-y-4">
			<div>
				<Label>Button Text</Label>
				<Input value={block.text || ""} onChange={(e) => updateBlock(block.id, { text: e.target.value })} />
			</div>

			<div>
				<Label>Link (href)</Label>
				<Input
					value={block.href || ""}
					onChange={(e) => updateBlock(block.id, { href: e.target.value })}
					placeholder="#"
				/>
			</div>

			<div>
				<Label>Variant</Label>
				<Select value={block.variant || "primary"} onValueChange={(value) => updateBlock(block.id, { variant: value })}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="primary">Primary</SelectItem>
						<SelectItem value="secondary">Secondary</SelectItem>
					</SelectContent>
				</Select>
			</div>
		</div>
	)
}

export function ImageEditor({ block, updateBlock }) {
	return (
		<div className="space-y-4">
			<div>
				<Label>Image URL</Label>
				<Input
					value={block.url || ""}
					onChange={(e) => updateBlock(block.id, { url: e.target.value })}
					placeholder="https://..."
				/>
			</div>

			<div>
				<Label>Alt Text</Label>
				<Input value={block.alt || ""} onChange={(e) => updateBlock(block.id, { alt: e.target.value })} />
			</div>

			<div>
				<Label>Height (px)</Label>
				<Input
					type="number"
					value={block.height || ""}
					onChange={(e) => updateBlock(block.id, { height: Number(e.target.value) })}
				/>
			</div>
		</div>
	)
}

export function VideoEditor({ block, updateBlock }) {
	return (
		<div className="space-y-4">
			<div>
				<Label>Title</Label>
				<Input value={block.title || ""} onChange={(e) => updateBlock(block.id, { title: e.target.value })} />
			</div>

			<div>
				<Label>Embed URL</Label>
				<Input
					value={block.embedUrl || ""}
					onChange={(e) => updateBlock(block.id, { embedUrl: e.target.value })}
					placeholder="https://www.youtube.com/embed/..."
				/>
			</div>

			<div>
				<Label>Aspect Ratio</Label>
				<Select value={block.ratio || "16:9"} onValueChange={(value) => updateBlock(block.id, { ratio: value })}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="16:9">16:9</SelectItem>
						<SelectItem value="4:3">4:3</SelectItem>
					</SelectContent>
				</Select>
			</div>
		</div>
	)
}

export function GalleryEditor({ block, updateBlock }) {
	const images = Array.isArray(block.images) ? block.images : []

	return (
		<div className="space-y-4">
			<div>
				<Label>Title</Label>
				<Input value={block.title || ""} onChange={(e) => updateBlock(block.id, { title: e.target.value })} />
			</div>

			<div>
				<Label>Columns</Label>
				<Input
					type="number"
					value={block.columns || 3}
					onChange={(e) => updateBlock(block.id, { columns: Number(e.target.value) })}
				/>
			</div>

			<Separator />

			<div>
				<div className="flex items-center justify-between mb-3">
					<Label>Gallery Images</Label>
					<Button size="sm" onClick={() => updateBlock(block.id, { images: [...images, { url: "", alt: "Image" }] })}>
						<Plus className="h-3 w-3 mr-1" /> Add
					</Button>
				</div>

				<div className="space-y-2">
					{images.map((img, idx) => (
						<div key={idx} className="border rounded p-3 space-y-2">
							<div className="flex items-center justify-between">
								<span className="text-xs font-semibold text-gray-500">Image #{idx + 1}</span>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => updateBlock(block.id, { images: images.filter((_, i) => i !== idx) })}
								>
									<Trash2 className="h-3 w-3 text-red-500" />
								</Button>
							</div>
							<Input
								value={img.url || ""}
								onChange={(e) => {
									const next = [...images]
									next[idx] = { ...next[idx], url: e.target.value }
									updateBlock(block.id, { images: next })
								}}
								placeholder="Image URL"
							/>
							<Input
								value={img.alt || ""}
								onChange={(e) => {
									const next = [...images]
									next[idx] = { ...next[idx], alt: e.target.value }
									updateBlock(block.id, { images: next })
								}}
								placeholder="Alt text"
							/>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

export function SpacerEditor({ block, updateBlock }) {
	return (
		<div className="space-y-4">
			<div>
				<Label>Height (px)</Label>
				<Slider
					value={[block.height || 40]}
					onValueChange={([value]) => updateBlock(block.id, { height: value })}
					min={10}
					max={200}
					step={10}
				/>
				<div className="text-xs text-gray-500 mt-1">{block.height || 40}px</div>
			</div>
		</div>
	)
}

export function DividerEditor({ block, updateBlock }) {
	return (
		<div className="space-y-4">
			<div>
				<Label>Thickness (px)</Label>
				<Slider
					value={[block.thickness || 1]}
					onValueChange={([value]) => updateBlock(block.id, { thickness: value })}
					min={1}
					max={10}
					step={1}
				/>
				<div className="text-xs text-gray-500 mt-1">{block.thickness || 1}px</div>
			</div>
		</div>
	)
}

export function HTMLEditor({ block, updateBlock }) {
	return (
		<div className="space-y-4">
			<div>
				<Label>Custom HTML</Label>
				<Textarea
					value={block.html || ""}
					onChange={(e) => updateBlock(block.id, { html: e.target.value })}
					rows={8}
					className="font-mono text-xs"
					placeholder="<div>Your HTML here</div>"
				/>
			</div>
		</div>
	)
}


export function ColorRow({ label, value, fallback, onChange }) {
	const color = value || fallback
	const safeColor = /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback

	return (
		<div className="flex items-center justify-between gap-4">
			<Label className="text-[12px] text-gray-700">{label}</Label>

			{/* The pretty pill is the UI. The native color input sits on top (transparent) */}
			<div className="relative">
				<div
					className="group flex items-center gap-3 rounded-sm border p-[1px] hover:bg-gray-50 transition select-none" >
					<div
						className="h-6 w-6 rounded-sm border shadow-sm"
						style={{ backgroundColor: safeColor }}
					/>
				</div>

				<input
					type="color"
					value={safeColor}
					onChange={(e) => onChange(e.target.value)}
					className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
					aria-label={`${label} color picker`}
				/>
			</div>
		</div>
	)
}


export function ThemeEditor({ theme, updateTheme }) {
	const defaults = {
		brandName: "",
		primary: "#6366f1",
		secondary: "#8b5cf6",
		pageBackground: "#ffffff",
		sectionBackground: "#f9fafb",
		titleText: "#111827",
		bodyText: "#6b7280",
		buttonText: "#ffffff",
		radius: 12,
	}

	const t = { ...defaults, ...(theme || {}) }
	const set = (key) => (value) => updateTheme({ [key]: value })

	return (
		<div className="h-[calc(100vh-145px)] overflow-y-auto ">
			<Card className=" shadow-none rounded-none p-0 py-2 m-0 border-none">

				<CardContent>
					<Accordion type="multiple" defaultValue={["brand", "colors"]}>
						<AccordionItem value="brand">
							<AccordionTrigger>Brand</AccordionTrigger>
							<AccordionContent className="space-y-3 px-1 ">
								<Input
									value={t.brandName}
									onChange={(e) =>
										updateTheme({ brandName: e.target.value })
									}
									placeholder="Your brand name"
								/>
							</AccordionContent>
						</AccordionItem>

						<AccordionItem value="colors">
							<AccordionTrigger>Colors</AccordionTrigger>
							<AccordionContent className="space-y-3">
								<ColorRow
									label="Primary"
									value={t.primary}
									fallback={defaults.primary}
									onChange={set("primary")}
								/>
								<ColorRow
									label="Secondary"
									value={t.secondary}
									fallback={defaults.secondary}
									onChange={set("secondary")}
								/>
								<ColorRow
									label="Page Background"
									value={t.pageBackground}
									fallback={defaults.pageBackground}
									onChange={set("pageBackground")}
								/>
								<ColorRow
									label="Section Background"
									value={t.sectionBackground}
									fallback={defaults.sectionBackground}
									onChange={set("sectionBackground")}
								/>
							</AccordionContent>
						</AccordionItem>

						<AccordionItem value="text">
							<AccordionTrigger>Text</AccordionTrigger>
							<AccordionContent className="space-y-3">
								<ColorRow
									label="Title Text"
									value={t.titleText}
									fallback={defaults.titleText}
									onChange={set("titleText")}
								/>
								<ColorRow
									label="Body Text"
									value={t.bodyText}
									fallback={defaults.bodyText}
									onChange={set("bodyText")}
								/>
								<ColorRow
									label="Button Text"
									value={t.buttonText}
									fallback={defaults.buttonText}
									onChange={set("buttonText")}
								/>
							</AccordionContent>
						</AccordionItem>

						<AccordionItem value="shape">
							<AccordionTrigger>Shape</AccordionTrigger>
							<AccordionContent className="space-y-4">
								<div className="flex items-center justify-between">
									<Label className="text-sm">Border Radius</Label>
									<span className="text-xs font-medium border rounded-full px-2 py-1">
										{t.radius}px
									</span>
								</div>

								<Slider
									value={[t.radius]}
									min={0}
									max={24}
									step={2}
									onValueChange={([v]) =>
										updateTheme({ radius: v })
									}
								/>
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				</CardContent>
			</Card>
		</div>
	)
}





// dynamic editors
export function DynamicBlockEditor({ schema, block, updateBlock, docTheme }) {
	const sections = (schema && schema.sections) ? schema.sections : []

	const set = (path, value) => {
		const parts = path.split(".")
		const patch = {}
		let cur = patch
		for (let i = 0; i < parts.length - 1; i++) {
			cur[parts[i]] = cur[parts[i]] || {}
			cur = cur[parts[i]]
		}
		cur[parts[parts.length - 1]] = value
		updateBlock(block.id, patch)
	}

	const get = (path) => {
		const parts = path.split(".")
		let cur = block
		for (const p of parts) {
			if (!cur) return undefined
			cur = cur[p]
		}
		return cur
	}

	return (
		<div className="space-y-4">
			{sections.map((sec) => (
				<FormSection2 key={sec.key} title={sec.title} description={sec.description}>
					{(sec.fields || []).map((f, idx) => (
						<DynamicField
							key={sec.key + "_" + idx}
							field={f}
							value={get(f.path)}
							onChange={(v) => set(f.path, v)}
							docTheme={docTheme}
						/>
					))}
				</FormSection2>
			))}
		</div>
	)
}


function moveItem(arr, from, to) {
	if (!Array.isArray(arr)) return arr
	if (from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr
	const next = [...arr]
	const [item] = next.splice(from, 1)
	next.splice(to, 0, item)
	return next
}

function normalizeListValue(value, defaultItem) {
	if (!Array.isArray(value)) return []
	return value.map((x) => (x && typeof x === "object" ? { ...defaultItem, ...x } : { ...defaultItem }))
}

function DynamicField({ field, value, onChange, docTheme }) {
	const { label, type, placeholder, options, min, max, step } = field

	if (type === "textarea") {
		return (
			<Field label={label}>
				<Textarea value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || ""} className="rounded-md" rows={3} />
			</Field>
		)
	}

	if (type === "number") {
		const v = typeof value === "number" ? value : (value === "" || value == null ? "" : Number(value))
		return (
			<Field label={label}>
				<Input
					type="number"
					value={v}
					onChange={(e) => {
						const raw = e.target.value
						if (raw === "") return onChange("")
						const n = Number(raw)
						onChange(Number.isFinite(n) ? n : value)
					}}
					placeholder={placeholder || ""}
					className="rounded-md"
				/>
			</Field>
		)
	}

	if (type === "list") {
		const itemLabel = field.itemLabel || "Item"
		const defaultItem = field.defaultItem && typeof field.defaultItem === "object" ? field.defaultItem : {}
		const itemFields = Array.isArray(field.fields) ? field.fields : []

		const items = normalizeListValue(value, defaultItem)

		const setItems = (next) => onChange(Array.isArray(next) ? next : [])

		const addItem = () => setItems([...(items || []), { ...defaultItem }])
		const deleteItem = (idx) => setItems(items.filter((_, i) => i !== idx))
		const updateItem = (idx, patch) => {
			const next = [...items]
			next[idx] = { ...(next[idx] || {}), ...(patch || {}) }
			setItems(next)
		}

		const moveUp = (idx) => setItems(moveItem(items, idx, idx - 1))
		const moveDown = (idx) => setItems(moveItem(items, idx, idx + 1))

		return (
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<div className="text-xs font-medium text-muted-foreground">{label}</div>
					<Button type="button" size="sm" className="rounded-md" onClick={addItem}>
						<Plus className="h-4 w-4 mr-1" /> Add
					</Button>
				</div>

				{items.length === 0 ? (
					<div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
						No {itemLabel}s yet — click “Add”.
					</div>
				) : null}

				<div className="space-y-3">
					{items.map((it, idx) => (
						<ListItemCard
							key={idx}
							title={`${itemLabel} ${idx + 1}`}
							subtitle=""
							leftIcon={null}
							onDelete={() => deleteItem(idx)}
						>
							<Row2>
								{itemFields.map((f, fi) => {
									// support only input/textarea/select/switch/number inside list for now
									const v = it?.[f.path]
									if (f.type === "switch") {
										return (
											<div key={fi} className="flex items-center justify-between rounded-md border px-3 py-3">
												<div className="text-sm font-medium">{f.label}</div>
												<Switch
													checked={!!v}
													onCheckedChange={(nv) => updateItem(idx, { [f.path]: nv })}
												/>
											</div>
										)
									}

									if (f.type === "select") {
										return (
											<Field key={fi} label={f.label}>
												<Select value={v || ""} onValueChange={(nv) => updateItem(idx, { [f.path]: nv })}>
													<SelectTrigger className="rounded-md">
														<SelectValue />
													</SelectTrigger>
													<SelectContent className="z-[9999999]" position="popper" sideOffset={6} align="start">
														{(f.options || []).map((o) => (
															<SelectItem key={o.value} value={o.value}>
																{o.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</Field>
										)
									}

									if (f.type === "textarea") {
										return (
											<Field key={fi} label={f.label}>
												<Textarea
													value={v || ""}
													onChange={(e) => updateItem(idx, { [f.path]: e.target.value })}
													placeholder={f.placeholder || ""}
													className="rounded-md"
													rows={3}
												/>
											</Field>
										)
									}

									if (f.type === "number") {
										return (
											<Field key={fi} label={f.label}>
												<Input
													type="number"
													value={typeof v === "number" ? v : (v ?? "")}
													onChange={(e) => {
														const raw = e.target.value
														if (raw === "") return updateItem(idx, { [f.path]: "" })
														const n = Number(raw)
														if (Number.isFinite(n)) updateItem(idx, { [f.path]: n })
													}}
													placeholder={f.placeholder || ""}
													className="rounded-md"
												/>
											</Field>
										)
									}

									// default input
									return (
										<Field key={fi} label={f.label}>
											<Input
												value={v || ""}
												onChange={(e) => updateItem(idx, { [f.path]: e.target.value })}
												placeholder={f.placeholder || ""}
												className="rounded-md"
											/>
										</Field>
									)
								})}
							</Row2>

							<div className="flex items-center justify-end gap-2 pt-2">
								<Button
									type="button"
									variant="outline"
									size="icon"
									className="h-8 w-8 rounded-md"
									disabled={idx === 0}
									onClick={() => moveUp(idx)}
									aria-label="Move up"
								>
									<ArrowUp className="h-4 w-4" />
								</Button>
								<Button
									type="button"
									variant="outline"
									size="icon"
									className="h-8 w-8 rounded-md"
									disabled={idx === items.length - 1}
									onClick={() => moveDown(idx)}
									aria-label="Move down"
								>
									<ArrowDown className="h-4 w-4" />
								</Button>
							</div>
						</ListItemCard>
					))}
				</div>
			</div>
		)
	}

	if (type === "select") {
		return (
			<Field label={label}>
				<Select value={value || ""} onValueChange={(v) => onChange(v)}>
					<SelectTrigger className={"z-[10000]"} ><SelectValue /></SelectTrigger>
					<SelectContent>
						{(options || []).map((o) => (
							<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
						))}
					</SelectContent>
				</Select>
			</Field>
		)
	}

	if (type === "switch") {
		return (
			<div className="flex items-center justify-between rounded-md border px-3 py-3">
				<div className="text-sm font-medium">{label}</div>
				<Switch checked={!!value} onCheckedChange={(v) => onChange(v)} />
			</div>
		)
	}

	if (type === "color") {
		const fallback = field.fallbackFromThemeKey ? (docTheme?.[field.fallbackFromThemeKey] || "#000000") : "#000000"
		const c = value || fallback
		return (
			<ColorRow
				label={label}
				value={c}
				fallback={fallback}
				onChange={(v) => onChange(v)}
			/>
		)
	}

	if (type === "slider") {
		const v = typeof value === "number" ? value : (field.defaultValue || 0)
		return (
			<Field label={label}>
				<Slider value={[v]} min={min || 0} max={max || 100} step={step || 1} onValueChange={([nv]) => onChange(nv)} />
				<div className="text-xs text-muted-foreground mt-1">{v}</div>
			</Field>
		)
	}

	// default input
	return (
		<Field label={label}>
			<Input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || ""} className="rounded-md" />
		</Field>
	)
}


export {
	FormSection, Field, Row2, ListItemCard,
	NavbarEditor, HeroEditor, StatsEditor, FeaturesEditor, PricingEditor,
	TestimonialsEditor, CTAEditor, FormEditor, FAQEditor, FooterEditor,
	BannerEditor, TextEditor, HeadingEditor, ButtonEditor, ImageEditor,
	VideoEditor, GalleryEditor, SpacerEditor, DividerEditor, HTMLEditor
}
