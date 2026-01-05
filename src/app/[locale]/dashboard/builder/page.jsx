"use client"

import React, { useEffect, useLayoutEffect, useRef, useState, useMemo } from "react"
import { createPortal } from "react-dom"
import { Monitor, Smartphone, Eye, Trash2, Copy, Undo2, Redo2, Settings, X, Image, Sparkles, LayoutGrid, Package, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AnimatePresence, motion } from "framer-motion"
import { BUILDER_TYPES, BUILDER_TYPE_ICONS, REGISTRY, migrateDoc } from "./registry"
import { applyThemeColors, THEME_TEMPLATES } from "./themes"

import { usePathname, useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { DynamicBlockEditor, ThemeEditor } from "./editors"
import AssetsLibrary from "./AssetsLibrary"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

function uid(prefix = "b") {
	return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

function safeJsonParse(v) {
	try {
		return JSON.parse(v)
	} catch {
		return null
	}
}

const STORAGE_PREFIX = "landing:v3:"

function docKey(tenant) {
	return `${STORAGE_PREFIX}${tenant}:doc`
}

function draftKey(tenant) {
	return `${STORAGE_PREFIX}${tenant}:draft`
}

function publishedKey(tenant) {
	return `${STORAGE_PREFIX}${tenant}:published`
}

function settingsKey(tenant) {
	return `${STORAGE_PREFIX}${tenant}:settings`
}


function deepFindById(list, id) {
	for (const item of list) {
		if (item.id === id) return item
		if (item.children?.length) {
			const found = deepFindById(item.children, id)
			if (found) return found
		}
	}
	return null
}

function deepUpdateById(list, id, patch) {
	return list.map((item) => {
		if (item.id === id) return { ...item, ...patch }
		if (item.children?.length) return { ...item, children: deepUpdateById(item.children, id, patch) }
		return item
	})
}

function deepRemoveById(list, id) {
	const next = []
	for (const item of list) {
		if (item.id === id) continue
		if (item.children?.length) next.push({ ...item, children: deepRemoveById(item.children, id) })
		else next.push(item)
	}
	return next
}

function reorderBlocksByIds(blocks, orderedIds) {
	const map = new Map(blocks.map((b) => [b.id, b]))
	return orderedIds.map((id) => map.get(id)).filter(Boolean)
}


function deepCloneWithNewIds(node) {
	const next = { ...node, id: uid(node.type) }
	if (node.children?.length) next.children = node.children.map((c) => deepCloneWithNewIds(c))
	return next
}

function defaultDoc(tenant) {
	return {
		version: 3,
		tenant,
		meta: {
			title: `${tenant} | Landing Page Builder`,
			description: "Build your landing page with the most powerful builder.",
		},
		theme: {
			brandName: tenant,
			...THEME_TEMPLATES[0].colors,
			font: "inter",
			radius: 12,
		},
		blocks: [],
		updatedAt: Date.now(),
	}
}

function useHistoryState(initial) {
	const [past, setPast] = useState([])
	const [present, setPresent] = useState(initial)
	const [future, setFuture] = useState([])

	const set = (next, { replace } = {}) => {
		setPresent((curr) => {
			const resolved = typeof next === "function" ? next(curr) : next
			if (replace) return resolved
			setPast((p) => [...p, curr])
			setFuture([])
			return resolved
		})
	}

	const undo = () => {
		setPast((p) => {
			if (!p.length) return p
			setPresent((curr) => {
				const prev = p[p.length - 1]
				setFuture((f) => [curr, ...f])
				return prev
			})
			return p.slice(0, -1)
		})
	}

	const redo = () => {
		setFuture((f) => {
			if (!f.length) return f
			const next = f[0]
			setPresent((curr) => {
				setPast((p) => [...p, curr])
				return next
			})
			return f.slice(1)
		})
	}

	return { past, present, future, set, undo, redo }
}

function parsePath(path) {
	// "items.0.title" => ["items", 0, "title"]
	return String(path)
		.split(".")
		.map((p) => (/^\d+$/.test(p) ? Number(p) : p))
}

function setByPath(obj, path, value) {
	const keys = parsePath(path)
	const root = Array.isArray(obj) ? [...obj] : { ...obj }

	let curr = root
	for (let i = 0; i < keys.length; i++) {
		const k = keys[i]
		if (i === keys.length - 1) {
			curr[k] = value
			break
		}
		const nextVal = curr[k]
		const cloned = Array.isArray(nextVal) ? [...nextVal] : { ...(nextVal || {}) }
		curr[k] = cloned
		curr = cloned
	}
	return root
}


export default function BuilderPage() {
	const [tenant] = useState("default")
	const [previewDevice, setPreviewDevice] = useState("desktop")
	const [selectedId, setSelectedId] = useState(null)
	const [rightPanelOpen, setRightPanelOpen] = useState(true)
	const [hoverElemType, setHoverElemType] = useState(null)
	const [hoverElemRect, setHoverElemRect] = useState(null)
	const [hoverElemBlock, setHoverElemBlock] = useState(null)
	const hoverCloseTimer = useRef(null)
	const popoverRef = useRef(null)
	const [popoverTop, setPopoverTop] = useState(12)
	const elementsSidebarRef = useRef(null)
	const previewIframeRef = useRef(null)
	const [previewReady, setPreviewReady] = useState(false)
	const [leftRailWide, setLeftRailWide] = useState(false) // 60/130
	const [leftPanel, setLeftPanel] = useState("elements") // elements | templates | themes | settings
	const [leftPanelOpen, setLeftPanelOpen] = useState(true)
	const [activeThemeId, setActiveThemeId] = useState(() => {
		if (typeof window === "undefined") return "blank"
		return localStorage.getItem("builder_active_theme") || "blank"
	})
	const router = useRouter()
	const pathname = usePathname()
	const [assetsOpen, setAssetsOpen] = useState(false)
	const [selectedType, setSelectedType] = useState("navbar")


	const [siteSettings, setSiteSettings] = useState({
		domain: "",
		metaTitle: "",
		metaDescription: "",
	})


	const autosaveTimer = useRef(null)
	const initial = useMemo(() => defaultDoc("default"), [])
	const history = useHistoryState(initial)
	const doc = history.present
	const ALL_DEFS = useMemo(() => Object.values(REGISTRY), [])
	const typeDefs = useMemo(() => {
		return ALL_DEFS.filter((d) => d?.type === selectedType)
	}, [ALL_DEFS, selectedType])

	useEffect(() => {
		if (typeof window === "undefined") return

		const saved = safeJsonParse(localStorage.getItem(draftKey(tenant)))
		if (saved && saved.blocks?.length > 0) {
			const migrated = migrateDoc(saved)
			history.set(migrated, { replace: true })
			setSelectedId(migrated.blocks[0]?.id || null)
		} else { }
	}, [tenant])


	useEffect(() => {
		if (typeof window === "undefined") return
		if (autosaveTimer.current) clearTimeout(autosaveTimer.current)

		autosaveTimer.current = setTimeout(() => {
			const withStamp = { ...doc, updatedAt: Date.now() }
			localStorage.setItem(draftKey(tenant), JSON.stringify(withStamp))
			localStorage.setItem(docKey(tenant), JSON.stringify(withStamp))
		}, 450)

		return () => autosaveTimer.current && clearTimeout(autosaveTimer.current)
	}, [doc, tenant])

	useEffect(() => {
		try {
			const raw = localStorage.getItem(settingsKey(tenant))
			if (raw) setSiteSettings(JSON.parse(raw))
		} catch { }
	}, [tenant])



	function saveSettings(next) {
		setSiteSettings(next)
		try {
			localStorage.setItem(settingsKey(tenant), JSON.stringify(next))
		} catch { }
	}
	function handlePreviewPage() {
		router.push(`/en/${tenant}?mode=preview`)
	}

	function handlePublish() {
		const payload = { ...doc, updatedAt: Date.now() }
		try {
			localStorage.setItem(publishedKey(tenant), JSON.stringify(payload))
			localStorage.setItem(settingsKey(tenant), JSON.stringify(siteSettings))
			toast.success("Published!")
		} catch {
			toast.error("Failed to publish")
		}
	}

	const selected = selectedId ? deepFindById(doc.blocks, selectedId) : null
	function updateTheme(patch) {
		history.set((d) => ({ ...d, theme: { ...d.theme, ...patch } }))
	}

	function updateBlock(id, patch) {
		history.set((d) => ({ ...d, blocks: deepUpdateById(d.blocks, id, patch) }))
	}

	function scrollToBlock(blockId) {
		const iframe = previewIframeRef.current
		if (!iframe || !previewReady) return
		iframe.contentWindow?.postMessage(
			{ type: "BUILDER_DOC", doc, selectedId },
			"*"
		)
	}

	function addElement(designId) {
		const def = REGISTRY[designId]
		if (!def) return

		const newBlock = def.makeDefault({ uid })

		history.set((d) => ({ ...d, blocks: [...d.blocks, newBlock] }))
		setSelectedId(newBlock.id)
		setRightPanelOpen(true)

		// ✅ scroll to the new block in preview
		scrollToBlock(newBlock.id)
	}

	function duplicateBlock(id) {
		const block = deepFindById(doc.blocks, id)
		if (!block) return
		const cloned = deepCloneWithNewIds(block)
		history.set((d) => ({ ...d, blocks: [...d.blocks, cloned] }))
	}

	function deleteBlock(id) {
		history.set((d) => ({ ...d, blocks: deepRemoveById(d.blocks, id) }))
		if (selectedId === id) setSelectedId(null)
	}

	function openElementHoverPreview(designId, rect) {
		if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current)

		const def = REGISTRY[designId]
		if (!def) return

		setHoverElemType(designId)
		setHoverElemRect(rect)
		setHoverElemBlock(def.makeDefault({ uid })) // preview-only
	}

	function closeElementHoverPreview() {
		if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current)
		hoverCloseTimer.current = setTimeout(() => {
			setHoverElemType(null)
			setHoverElemRect(null)
			setHoverElemBlock(null)
		}, 80)
	}



	useLayoutEffect(() => {
		if (!hoverElemRect || !hoverElemType) return

		const padding = 12
		const desiredTop = hoverElemRect.top - 6

		// لو الـ popover لسه ما اترسمش
		const el = popoverRef.current
		const popH = el ? el.offsetHeight : 0
		const vh = window.innerHeight

		// clamp top داخل الشاشة
		const maxTop = Math.max(padding, vh - popH - padding)
		const nextTop = Math.min(Math.max(padding, desiredTop), maxTop)

		setPopoverTop(nextTop)
	}, [hoverElemRect, hoverElemType, hoverElemBlock])

	useEffect(() => {
		function onMessage(e) {
			if (!e.data) return

			if (e.data.type === "PREVIEW_READY") {
				setPreviewReady(true)
			}

			if (e.data.type === "BLOCK_CLICKED" && e.data.blockId) {
				setSelectedId(e.data.blockId)
				setRightPanelOpen(true) // لو مقفول
			}

			if (e.data.type === "DELETE_BLOCK" && e.data.blockId) {
				deleteBlock(e.data.blockId)
			}

			if (e.data.type === "SET_BLOCK_ORDER" && Array.isArray(e.data.orderedIds)) {
				const orderedIds = e.data.orderedIds
				history.set((d) => ({
					...d,
					blocks: reorderBlocksByIds(d.blocks, orderedIds),
				}))
			}

			if (e.data.type === "INLINE_EDIT") {
				const { blockId, path, value } = e.data || {}
				if (!blockId || !path) return
				history.set((d) => ({
					...d,
					blocks: deepUpdateById(d.blocks, blockId, setByPath(deepFindById(d.blocks, blockId) || {}, path, value)),
				}))
			}


		}

		window.addEventListener("message", onMessage)
		return () => window.removeEventListener("message", onMessage)
	}, [])

	useEffect(() => {
		const iframe = previewIframeRef.current
		if (!iframe) return

		// ابعت حتى لو مش ready (مش مشكلة) بس الأفضل نستنى
		if (!previewReady) return

		iframe.contentWindow?.postMessage(
			{ type: "BUILDER_DOC", doc, selectedId },
			"*",
		)

	}, [doc, selectedId, previewReady])


	const hoverTheme = { ...doc.theme, ...(hoverElemBlock?.colors || {}) }
	return (
		<div className="builder-scope flex fixed inset-0 z-[10000] h-screen overflow-hidden bg-gray-50">


			{/* LEFT: Rail + Panel */}
			<div className="flex h-full" ref={elementsSidebarRef}>
				<motion.aside
					className="border-r bg-white flex flex-col"
					animate={{ width: leftRailWide ? 208 : 72 }}
					transition={{ type: "spring", stiffness: 520, damping: 40 }}
				>
					{/* Header */}
					<div className="p-2 py-3 border-b flex items-center justify-between">
						{leftRailWide ? (
							<div className="px-2">
								<div className="text-xs font-semibold text-gray-500">BUILDER</div>
							</div>
						) : (
							<div />
						)}


						<Button
							variant="outline"
							size="lg"
							className={`${!leftRailWide && "w-full"} rounded-md `}
							onClick={() => setLeftRailWide((v) => !v)}
							title={leftRailWide ? "Collapse" : "Expand"}
						>
							<ChevronRight className={`${leftRailWide ? "rotate-[-180deg]" : ""} h-6 w-6 duration-500`} />
						</Button>
					</div>

					{/* Items */}
					<div className="py-2 flex flex-col gap-1">
						<RailItem
							wide={leftRailWide}
							active={leftPanel === "elements"}
							label="Elements"
							onClick={() => {
								setLeftPanel("elements")
								setLeftPanelOpen(true)
							}}
							Icon={LayoutGrid}
						/>


						<RailItem
							wide={leftRailWide}
							active={leftPanel === "themes"}
							label="Themes"
							onClick={() => {
								setLeftPanel("themes")
								setLeftPanelOpen(true)
							}}
							Icon={Sparkles}
						/>

						<RailItem
							wide={leftRailWide}
							active={leftPanel === "themePanel"}
							label="Theme Panel"
							onClick={() => {
								setLeftPanel("themePanel")
								setLeftPanelOpen(true)
							}}
							Icon={Sparkles}
						/>

						<RailItem
							wide={leftRailWide}
							active={false}
							label="Assets"
							Icon={Image}
							onClick={() => {
								setAssetsOpen(true)
							}}
						/>

						<RailItem
							wide={leftRailWide}
							active={leftPanel === "settings"}
							label="Settings"
							onClick={() => {
								setLeftPanel("settings")
								setLeftPanelOpen(true)
							}}
							Icon={Settings}
						/>

						<div className="mt-2 pt-2 border-t" />

						<RailItem
							wide={leftRailWide}
							active={false}
							label="Close panel"
							onClick={() => setLeftPanelOpen(false)}
							Icon={X}
						/>
					</div>

				</motion.aside>


				{/* Big Panel (like old Elements sidebar) */}
				{leftPanelOpen ? (
					<aside className="w-[250px] flex-none border-r bg-white flex flex-col">
						{leftPanel === "elements" ? (
							<ElementsPanel
								ALL_DEFS={ALL_DEFS}
								selectedType={selectedType}
								setSelectedType={setSelectedType}
								defs={typeDefs}
								addElement={addElement}
								elementsSidebarRef={elementsSidebarRef}
								openElementHoverPreview={openElementHoverPreview}
								closeElementHoverPreview={closeElementHoverPreview}
							/>

						) : null}

						{leftPanel === "themePanel" ? (
							<LeftPanelTheme
								theme={doc.theme}
								updateTheme={updateTheme}
							/>
						) : null}


						{leftPanel === "themes" ? (
							<ThemesPanel
								activeThemeId={activeThemeId}
								setActiveThemeId={setActiveThemeId}
								doc={doc}
								history={history}
							/>
						) : null}

						{leftPanel === "settings" ? (
							<SettingsPanel
								siteSettings={siteSettings}
								saveSettings={saveSettings}
								close={() => setLeftPanel(null)}
							/>
						) : null}
					</aside>
				) : null}
			</div>





			<main className="flex-1 flex flex-col">
				{/* Top Toolbar */}
				<header className="border-b bg-white px-4 py-3 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Button variant="ghost" size="sm" onClick={() => history.undo()} disabled={!history.past.length}>
							<Undo2 className="h-4 w-4" />
						</Button>
						<Button variant="ghost" size="sm" onClick={() => history.redo()} disabled={!history.future.length}>
							<Redo2 className="h-4 w-4" />
						</Button>

						<div className="flex gap-1 bg-gray-100 rounded-md p-1">
							<Button
								variant={previewDevice === "desktop" ? "default" : "ghost"}
								size="sm"
								onClick={() => setPreviewDevice("desktop")}
							>
								<Monitor className="h-4 w-4" />
							</Button>
							<Button
								variant={previewDevice === "mobile" ? "default" : "ghost"}
								size="sm"
								onClick={() => setPreviewDevice("mobile")}
							>
								<Smartphone className="h-4 w-4" />
							</Button>
						</div>
					</div>

					<div className="flex items-center gap-1">

						<Button variant="outline" size="sm" onClick={handlePreviewPage}>
							<Eye className="h-4 w-4 " />
						</Button>

						<Button size="sm" onClick={handlePublish}>
							Publish
						</Button>
					</div>

				</header>

				<div className="flex-1 overflow-auto bg-gray-100 p-4">
					<div
						className="mx-auto shadow-lg transition-all overflow-hidden h-[calc(100vh-120px)]"
						style={{
							width: previewDevice === "mobile" ? "375px" : "100%",
							maxWidth: previewDevice === "desktop" ? "1200px" : "375px",
						}}
					>
						<iframe
							ref={previewIframeRef}
							src={`${pathname}/preview`}
							title="Preview"
							className="w-full h-full "
							style={{
								width: "100%",
								border: "0",
							}}
						/>
					</div>
				</div>

			</main>

			{rightPanelOpen && (
				<aside className="w-[320px] border-l bg-white flex flex-col">
					<div className="p-4 border-b flex items-center justify-between">
						<h2 className="font-bold">Properties</h2>
						<Button variant="ghost" size="sm" onClick={() => setRightPanelOpen(false)}>
							<X className="h-4 w-4" />
						</Button>
					</div>

					<ScrollArea className="flex-1">
						<div className="p-4">
							{selected ? (
								<RegistryPropertiesEditor
									block={selected}
									updateBlock={updateBlock}
									deleteBlock={deleteBlock}
									duplicateBlock={duplicateBlock}
									docTheme={doc.theme}
								/>

							) : (
								<div className="flex flex-col items-center justify-center text-center py-14 px-6 border border-dashed border-gray-300 rounded-md bg-gray-50/50 text-gray-500 transition-all duration-200 hover:bg-gray-50">

									<div className="flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
										<Settings className="h-8 w-8 opacity-60" />
									</div>

									<h3 className="text-sm font-medium text-gray-700 mb-1">
										No block selected
									</h3>

									<p className="text-sm text-gray-400 max-w-xs">
										Select a block from the canvas to edit its properties and customize its content.
									</p>
								</div>

							)}
						</div>
					</ScrollArea>
				</aside>
			)}


			{/* Elements Hover Preview Popover */}
			{typeof document !== "undefined" &&
				createPortal(
					<AnimatePresence>
						{hoverElemType && hoverElemRect && hoverElemBlock ? (
							<>
								<motion.div
									key="elements-hover-overlay"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									transition={{ duration: 0.15, ease: "easeOut" }}
									className="fixed top-0 bottom-0 right-0 z-[99990]"
									style={{
										left: hoverElemRect.sidebarRight ?? hoverElemRect.right, // fallback لو لسه عندك right
										background: "rgba(0,0,0,0.18)",
										backdropFilter: "blur(2px)",
										pointerEvents: "none", // ✅ ما يمنعش hover
									}}
								/>

								<motion.div
									ref={popoverRef}
									key="elements-hover-popover"
									initial={{ opacity: 0, x: -6, scale: 0.98 }}
									animate={{ opacity: 1, x: 0, scale: 1 }}
									exit={{ opacity: 0, x: -6, scale: 0.98 }}
									transition={{ duration: 0.16, ease: "easeOut" }}
									onMouseEnter={() => {
										if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current)
									}}
									onMouseLeave={closeElementHoverPreview}
									className="fixed z-[99999]"
									style={{
										top: popoverTop,
										left: (hoverElemRect.sidebarRight ?? hoverElemRect.right) + 10,
										width: "600px",
									}}
								>
									<div className="rounded-md border bg-white shadow-xl overflow-hidden">
										<div className="px-3 py-2 border-b text-xs font-semibold text-gray-600">
											{REGISTRY[hoverElemType]?.label || hoverElemType}

										</div>

										{/* Preview frame */}
										<div className="p-3 bg-gray-50">
											<div className="rounded-md bg-white border overflow-hidden">
												<div
													style={{
														transform: "scale(0.85)",
														transformOrigin: "top left",
														width: "117%",
													}}
												>
													{REGISTRY[hoverElemType]?.render({ block: hoverElemBlock, theme: hoverTheme })}

												</div>
											</div>
										</div>
									</div>
								</motion.div>
							</>
						) : null}
					</AnimatePresence>,
					document.body,
				)}


			<AssetsLibrary
				open={assetsOpen}
				onOpenChange={setAssetsOpen}
			/>

		</div>
	)
}
function RegistryPropertiesEditor({ block, updateBlock, deleteBlock, duplicateBlock, docTheme }) {
	const def = REGISTRY[block.designId]
	const Editor = def?.Editor

	return (
		<div className=" w-[calc(100%+30px)] px-2 rtl:mr-[-15px] ltr:ml-[-15px] h-[calc(100vh-80px)] overflow-y-auto">
			<div className="space-y-4 pb-10">
				<div className=" z-10 -mx-2 px-2 py-2 backdrop-blur bg-background/80 border-b">
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-2 min-w-0">
							<span className="text-sm font-semibold">{def?.label || block.type}</span>
						</div>

						<div className="flex items-center gap-1">
							<Button size="icon" variant="ghost" className="h-9 w-9 rounded-md" onClick={() => duplicateBlock(block.id)}>
								<Copy className="h-4 w-4" />
							</Button>
							<Button size="icon" variant="ghost" className="h-9 w-9 rounded-md hover:bg-red-50" onClick={() => deleteBlock(block.id)}>
								<Trash2 className="h-4 w-4 text-red-500" />
							</Button>
						</div>
					</div>
				</div>

				{def?.schema ? (
					<DynamicBlockEditor
						schema={def.schema}
						block={block}
						updateBlock={updateBlock}
						docTheme={docTheme} />
				) : Editor ? (
					<Editor block={block} updateBlock={updateBlock} />
				) : (
					<div className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
						No editor for this designId: <code className="font-mono">{block.designId}</code>
					</div>
				)}
			</div>
		</div>
	)
}


function LeftPanelTheme({ theme, updateTheme }) {
	return (
		<>
			<div className="p-[18px] border-b">
				<h2 className="font-bold text-lg">Theme Settings</h2>
			</div>
			<div className="flex-1">
				<ThemeEditor theme={theme} updateTheme={updateTheme} />
			</div>
		</>
	)
}


function SettingsPanel({ siteSettings, saveSettings }) {
	return (
		<>
			<div className="p-[18px] border-b">
				<h2 className="font-bold text-lg">Settings</h2>
			</div>

			<div className="p-4 space-y-4">
				<div className="space-y-2">
					<Label>Domain / Subdomain</Label>
					<Input
						value={siteSettings.domain}
						onChange={(e) => saveSettings({ ...siteSettings, domain: e.target.value })}
						placeholder="e.g. acme (or acme.yoursite.com)"
						className="rounded-md"
					/>
				</div>

				<div className="space-y-2">
					<Label>Meta Title</Label>
					<Input
						value={siteSettings.metaTitle}
						onChange={(e) => saveSettings({ ...siteSettings, metaTitle: e.target.value })}
						placeholder="Title for SEO"
						className="rounded-md"
					/>
				</div>

				<div className="space-y-2">
					<Label>Meta Description</Label>
					<Textarea
						value={siteSettings.metaDescription}
						onChange={(e) => saveSettings({ ...siteSettings, metaDescription: e.target.value })}
						placeholder="Description for SEO"
						rows={3}
						className="rounded-md"
					/>
				</div>
			</div>
		</>
	)
}

function RailTooltipPortal({ anchorEl, open, label }) {
	const [pos, setPos] = useState({ top: 0, left: 0 })
	const [mounted, setMounted] = useState(false)

	useEffect(() => setMounted(true), [])

	const update = () => {
		if (!anchorEl) return
		const r = anchorEl.getBoundingClientRect()
		setPos({
			top: r.top + r.height / 2,
			left: r.right + 10,
		})
	}

	// useLayoutEffect عشان الموضع ينحسب قبل ما يظهر (يقلل flicker)
	useLayoutEffect(() => {
		if (!open || !anchorEl) return
		update()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, anchorEl])

	useEffect(() => {
		if (!open || !anchorEl) return

		const onScroll = () => update()
		const onResize = () => update()

		window.addEventListener("scroll", onScroll, true)
		window.addEventListener("resize", onResize)

		return () => {
			window.removeEventListener("scroll", onScroll, true)
			window.removeEventListener("resize", onResize)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, anchorEl])

	if (!mounted || !open || !anchorEl) return null

	return createPortal(
		<div
			style={{
				position: "fixed",
				top: pos.top,
				left: pos.left,
				transform: "translateY(-50%)",
				zIndex: 999999, // أعلى شوية للتأكد
				pointerEvents: "none",
			}}
			className="bg-gray-900 text-white text-xs px-2 py-1 rounded-md shadow whitespace-nowrap"
			role="tooltip"
		>
			{label}
		</div>,
		document.body
	)
}

export function RailItem({ wide, active, label, onClick, Icon, badge }) {
	const [anchorEl, setAnchorEl] = useState(null)
	const [hovered, setHovered] = useState(false)

	const showTooltip = !wide && hovered

	return (
		<>
			<button
				ref={setAnchorEl} // ✅ callback ref (يثير re-render لما يصير element)
				type="button"
				onClick={onClick}
				onPointerEnter={() => setHovered(true)}
				onPointerLeave={() => setHovered(false)}
				onFocus={() => setHovered(true)}
				onBlur={() => setHovered(false)}
				className={[
					"group relative mx-2 rounded-md transition",
					"flex items-center gap-3 px-2.5 py-2",
					"outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20",
					active
						? "bg-gray-900 text-white shadow-sm"
						: "bg-white text-gray-700 hover:bg-gray-50 hover:shadow-sm border border-transparent hover:border-gray-200",
				].join(" ")}
				title={undefined}
				style={{ justifyContent: wide ? "flex-start" : "center" }}
			>
				<span
					className={[
						"absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full transition",
						active ? "bg-white/90" : "bg-transparent group-hover:bg-gray-200",
					].join(" ")}
				/>

				<span
					className={[
						"grid place-items-center rounded-md transition",
						"h-9 w-9",
						active ? "bg-white/10" : "bg-gray-100 group-hover:bg-gray-200",
					].join(" ")}
				>
					<Icon className={["h-5 w-5 transition", active ? "text-white" : "text-gray-700"].join(" ")} />
				</span>

				{wide ? (
					<div className="min-w-0 flex-1 flex items-center justify-between gap-2">
						<span className="text-sm font-medium truncate">{label}</span>
						{badge ? (
							<span
								className={[
									"text-[11px] px-2 py-0.5 rounded-full",
									active ? "bg-white/15 text-white" : "bg-gray-100 text-gray-700",
								].join(" ")}
							>
								{badge}
							</span>
						) : null}
					</div>
				) : null}
			</button>

			<RailTooltipPortal anchorEl={anchorEl} open={showTooltip} label={label} />
		</>
	)
}

function ThemesPanel({ activeThemeId, setActiveThemeId, doc, history }) {
	const getColorList = (colors) => {
		if (!colors) return []
		return Object.values(colors).filter(
			(v) => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v)
		)
	}

	return (
		<>
			<div className="p-[18px] border-b">
				<h2 className="font-bold text-lg">Themes</h2>
			</div>

			<ScrollArea className="flex-1">
				<div className="p-3 space-y-2 overflow-auto h-[calc(100vh-65px)]">
					{THEME_TEMPLATES.map((t) => {
						const isActive = t.id === activeThemeId
						const colors = getColorList(t.colors)

						return (
							<button
								key={t.id}
								onClick={() => {
									setActiveThemeId(t.id)
									localStorage.setItem("builder_active_theme", t.id)
									history.set(applyThemeColors(doc, t.id))
								}}
								className={`w-full rounded-md border px-3 py-3 text-left transition ${isActive
									? "border-gray-900 bg-gray-900 text-white"
									: "border-gray-200 hover:bg-gray-50"
									}`}
							>
								<div className="text-sm font-semibold">{t.name}</div>
								<div className="mt-2 flex flex-wrap gap-1.5">
									{colors.map((c, idx) => (
										<span
											key={c + idx}
											className="h-4 w-4 rounded-full border"
											style={{
												backgroundColor: c,
												borderColor: isActive ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.12)",
											}}
											title={c}
										/>
									))}
								</div>
							</button>
						)
					})}
				</div>
			</ScrollArea>
		</>
	)
}


function ElementsPanel({
	ALL_DEFS,
	selectedType,
	setSelectedType,
	defs,
	addElement,
	elementsSidebarRef,
	openElementHoverPreview,
	closeElementHoverPreview,
}) {




	return (
		<>
			<div className="p-[18px] border-b">
				<h2 className="font-bold text-lg">Elements</h2>
			</div>

			<ScrollArea className="flex-1">
				<div className="h-[calc(100vh-64px)] overflow-y-auto bg-gradient-to-b from-white via-white to-gray-50/60">
					<div className="p-3">
						<Accordion
							type="single"
							collapsible
							value={selectedType}
							onValueChange={(v) => v && setSelectedType(v)}
							className="space-y-2"
						>
							{BUILDER_TYPES.map((t) => {
								const Icon = BUILDER_TYPE_ICONS[t]
								return (<AccordionItem
									key={t}
									value={t}
									className="rounded-md border border-gray-200 bg-white overflow-hidden"
								>
									<AccordionTrigger className="px-3 py-2 hover:no-underline">
										<div className="flex items-center justify-between w-full">
											<div className="flex items-center gap-2">
												{Icon && <Icon className="h-4 w-4 text-gray-500" />}
												<span className="text-sm font-semibold capitalize">{t}</span>
											</div>

											{/* count for that type */}
											<span className="text-[11px] text-gray-600 rounded-full bg-gray-50 px-2 py-0.5 border border-gray-200">
												{ALL_DEFS.filter((d) => d?.type === t).length}
											</span>
										</div>
									</AccordionTrigger>

									<AccordionContent className="px-3 pb-3">
										<div className=" space-y-1 pt-1 ">
											{ALL_DEFS
												.filter((d) => d?.type === t)
												.map((def) => {
													const Icon = def.Icon || Package
													return (
														<button
															key={def.id}
															onClick={() => addElement(def.id)}
															onMouseEnter={(e) => {
																const btnRect = e.currentTarget.getBoundingClientRect()
																const sidebarRect = elementsSidebarRef.current?.getBoundingClientRect()
																openElementHoverPreview(def.id, {
																	top: btnRect.top,
																	right: btnRect.right,
																	sidebarRight: sidebarRect?.right ?? btnRect.right,
																})
															}}
															onMouseLeave={closeElementHoverPreview}
															className=" flex items-center gap-2 w-[190px] group relative overflow-hidden rounded-md border border-gray-200/70 bg-white px-2 py-2 text-center text-xs transition hover:-translate-y-[1px] hover:border-gray-300 hover:shadow-md"
														>
															<span className="relative flex-none flex h-8 w-8 items-center justify-center mx-auto rounded-md border border-gray-200/70 bg-gray-50 text-gray-700">
																<Icon className="h-5 w-5" />
															</span>
															<span className="relative text-left font-medium text-gray-900 truncate w-full block">
																{def.label}
															</span>
														</button>
													)
												})}
										</div>
									</AccordionContent>
								</AccordionItem>)
							})}
						</Accordion>
					</div>
				</div>
			</ScrollArea>
		</>

	)
}
