"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { REGISTRY, migrateDoc } from "../registry"
import { Sparkles, MousePointerClick, LayoutGrid, Trash2, GripVertical } from "lucide-react"
import { motion, Reorder, useDragControls } from "framer-motion"
import { InlineEditProvider } from "../sections"


function mergeTheme(globalTheme, block) {
	const override = block?.colors && typeof block.colors === "object" ? block.colors : {}
	return { ...globalTheme, ...override }
}

export default function BuilderPreviewFrame() {
	const [doc, setDoc] = useState(null)
	const [selectedId, setSelectedId] = useState(null)
	const [hoveredId, setHoveredId] = useState(null)
	const [orderIds, setOrderIds] = useState([])
	const [editMode, setEditMode] = useState("full")
	useEffect(() => {
		function onMessage(e) {
			const data = e.data
			if (!data) return

			if (data.type === "BUILDER_DOC") {
				const nextDoc = migrateDoc(data.doc)
				setDoc(nextDoc)
				setSelectedId(data.selectedId || null)
				setEditMode(data.editMode || "full")

				const ids = Array.isArray(nextDoc?.blocks) ? nextDoc.blocks.map((b) => b.id) : []
				setOrderIds(ids)
				return
			}


			if (data.type === "SCROLL_TO_BLOCK" && data.blockId) {
				const tryScroll = () => {
					const el = document.querySelector(`[data-block-id="${data.blockId}"]`)
					if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
				}
				tryScroll()
				setTimeout(tryScroll, 50)
			}
		}

		window.addEventListener("message", onMessage)
		window.parent?.postMessage({ type: "PREVIEW_READY" }, "*")
		return () => window.removeEventListener("message", onMessage)
	}, [])

	const theme = doc?.theme || {
		primary: "#6366f1",
		secondary: "#8b5cf6",
		pageBackground: "#ffffff",
		sectionBackground: "#f9fafb",
		titleText: "#111827",
		bodyText: "#6b7280",
		buttonText: "#ffffff",
		outline: "#d1d5db",
	}

	const pageStyle = useMemo(
		() => ({
			backgroundColor: theme.pageBackground,
			minHeight: "100vh",
		}),
		[theme.pageBackground],
	)

	const blocks = Array.isArray(doc?.blocks) ? doc.blocks : []

	// ✅ رتّب البلوكات حسب orderIds المحلي
	const orderedBlocks = useMemo(() => {
		if (!orderIds?.length) return blocks
		const map = new Map(blocks.map((b) => [b.id, b]))
		return orderIds.map((id) => map.get(id)).filter(Boolean)
	}, [blocks, orderIds])

	function sendOrderToParent(nextIds) {
		window.parent?.postMessage({ type: "SET_BLOCK_ORDER", orderedIds: nextIds }, "*")
	}

	function deleteLocallyAndNotify(blockId) {
		setOrderIds((curr) => curr.filter((id) => id !== blockId))
		setDoc((curr) => {
			if (!curr) return curr
			const nextBlocks = (curr.blocks || []).filter((b) => b.id !== blockId)
			return { ...curr, blocks: nextBlocks }
		})
		window.parent?.postMessage({ type: "DELETE_BLOCK", blockId }, "*")
	}


	const scrollRef = useRef(null)
	const rafRef = useRef(null)

	function autoScrollDuringDrag(clientY) {
		const el = scrollRef.current || document.scrollingElement
		if (!el) return


		const rect = el.getBoundingClientRect()
		const edge = 80 // px: منطقة حساسة أعلى/أسفل
		const maxSpeed = 22 // سرعة السكرول

		// distance from edges
		const topDist = clientY - rect.top
		const bottomDist = rect.bottom - clientY

		let delta = 0
		if (topDist < edge) {
			const p = Math.max(0, (edge - topDist) / edge) // 0..1
			delta = -Math.ceil(maxSpeed * p)
		} else if (bottomDist < edge) {
			const p = Math.max(0, (edge - bottomDist) / edge)
			delta = Math.ceil(maxSpeed * p)
		}

		if (delta !== 0) el.scrollTop += delta
	}



	return (
		<div style={pageStyle} className="builder-scope z-[1000]">
			<InlineEditProvider
				enabled={true}
				mode={editMode}
				onEdit={({ blockId, path, value }) => {
					window.parent?.postMessage({ type: "INLINE_EDIT", blockId, path, value }, "*")
				}}
			>
				{orderedBlocks.length === 0 ? (
					<div className="min-h-[70vh] flex items-center justify-center px-6 py-10">
						<div className="w-full max-w-xl">
							<div className="rounded-3xl border border-gray-200/70 bg-white shadow-sm overflow-hidden">
								<div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
									<div className="flex items-center gap-3">
										<span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200/70 bg-white shadow-sm">
											<Sparkles className="h-5 w-5 text-gray-700" />
										</span>
										<div className="min-w-0">
											<div className="text-sm font-semibold text-gray-900">Your canvas is empty</div>
											<div className="text-xs text-gray-500">Add elements from the left sidebar to start building.</div>
										</div>
									</div>
								</div>

								<div className="p-6 space-y-4">
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<div className="rounded-2xl border border-gray-200/70 bg-gray-50/60 p-4">
											<div className="flex items-start gap-3">
												<span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200/70 bg-white">
													<LayoutGrid className="h-4 w-4 text-gray-700" />
												</span>
												<div>
													<div className="text-sm font-semibold text-gray-900">Pick an element</div>
													<div className="text-xs text-gray-500">
														Choose any block from <span className="font-medium">Elements</span>.
													</div>
												</div>
											</div>
										</div>

										<div className="rounded-2xl border border-gray-200/70 bg-gray-50/60 p-4">
											<div className="flex items-start gap-3">
												<span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200/70 bg-white">
													<MousePointerClick className="h-4 w-4 text-gray-700" />
												</span>
												<div>
													<div className="text-sm font-semibold text-gray-900">Click to edit</div>
													<div className="text-xs text-gray-500">Select blocks here to edit their properties.</div>
												</div>
											</div>
										</div>
									</div>

									<div className="rounded-2xl border border-gray-200/70 bg-white p-4">
										<div className="text-xs text-gray-600">Tip: After adding a block, it will auto-scroll into view.</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				) : (
					<div ref={scrollRef} className="  h-screen overflow-y-auto overflow-x-hidden ">
						<Reorder.Group
							axis="y"
							values={orderIds}
							onReorder={(nextIds) => {
								setOrderIds(nextIds)
								sendOrderToParent(nextIds)
							}}
							className=" "
						>
							{orderedBlocks.map((b) => (
								<PreviewBlockItem
									key={b.id}
									block={b}
									theme={theme}
									isActive={selectedId === b.id}
									isHover={hoveredId === b.id}
									onHover={(val) => setHoveredId(val ? b.id : null)}
									onSelect={() => window.parent?.postMessage({ type: "BLOCK_CLICKED", blockId: b.id }, "*")}
									onDelete={() => deleteLocallyAndNotify(b.id)}
									onDragScroll={(y) => {
										// RAF مهم عشان ما يتهنجش
										if (rafRef.current) cancelAnimationFrame(rafRef.current)
										rafRef.current = requestAnimationFrame(() => autoScrollDuringDrag(y))
									}}
									onDragStop={() => {
										if (rafRef.current) cancelAnimationFrame(rafRef.current)
										rafRef.current = null
									}}
								/>

							))}
						</Reorder.Group>
					</div>
				)}
			</InlineEditProvider>
		</div>
	)
}

function PreviewBlockItem({ block, theme, isActive, isHover, onHover, onSelect, onDelete, onDragScroll, onDragStop }) {
	const def = REGISTRY[block.designId]
	const dragControls = useDragControls()
	const finalTheme = mergeTheme(theme, block)



	return (
		<Reorder.Item
			value={block.id}
			onDrag={(e, info) => {
				const y = info?.point?.y
				if (typeof y === "number") onDragScroll(y)
			}}
			onDragEnd={() => onDragStop()}

			dragListener={false}
			dragControls={dragControls}
			whileDrag={{ scale: .9, rotate: 2 }}
			transition={{ type: "spring", stiffness: 550, damping: 45 }}
			style={{ touchAction: "none" }}
			className="relative"
			onMouseEnter={() => onHover(true)}
			onMouseLeave={() => onHover(false)}
		>
			<div
				data-block-id={block.id}
				onClick={(e) => {
					e.preventDefault()
					e.stopPropagation()
					onSelect()
				}}
				style={{
					cursor: "pointer",
					border: isActive ? `3px solid ${theme.primary}` : "3px solid transparent",
					outlineOffset: "4px",
				}}
			>
				{def ? def.render({ block, theme: finalTheme }) : <div>Unknown designId: {block.designId}</div>}
			</div>

			{(isHover || isActive) && (
				<motion.div
					initial={{ opacity: 0, y: -6, scale: 0.98 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					transition={{ duration: 0.15 }}
					className="absolute top-2 right-2 z-50 flex items-center gap-2"
					onClick={(e) => {
						e.preventDefault()
						e.stopPropagation()
					}}
				>
					<motion.button
						whileHover={{ scale: 1.04 }}
						whileTap={{ scale: 0.96 }}
						className="h-7 w-7 rounded-md border bg-white shadow-sm flex items-center justify-center"
						style={{ borderColor: theme.outline }}
						onClick={onDelete}
						title="Delete"
					>
						<Trash2 className="h-4 w-4 text-red-500" />
					</motion.button>

					<motion.button
						whileHover={{ scale: 1.04 }}
						whileTap={{ scale: 0.96 }}
						className="h-7 w-7 rounded-md border bg-white shadow-sm flex items-center justify-center cursor-grab active:cursor-grabbing"
						style={{ borderColor: theme.outline }}
						onPointerDown={(e) => dragControls.start(e)}
						title="Drag to reorder"
					>
						<GripVertical className="h-4 w-4 text-gray-600" />
					</motion.button>
				</motion.div>
			)}
		</Reorder.Item>
	)
}
