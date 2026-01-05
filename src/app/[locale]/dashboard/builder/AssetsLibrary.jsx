"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

import {
	Upload,
	Trash2,
	Copy,
	Image as ImageIcon,
	Loader2,
	CloudUpload,
	X,
	Check,
} from "lucide-react"
import { toast } from "sonner"
import api, { baseImg } from "../../../../utils/axios"
import Img from "../../../../components/atoms/Img"

function getUserIdFromStorage() {
	try {
		const raw = localStorage.getItem("user")
		if (!raw) return undefined
		const u = JSON.parse(raw)
		return u?.id || u?._id || undefined
	} catch {
		return undefined
	}
}

function resolveAssetUrl(assetUrl) {
	if (!assetUrl) return ""
	if (/^https?:\/\//i.test(assetUrl)) return assetUrl
	const normalized = String(assetUrl).replaceAll("\\", "/").replace(/^\/+/, "")
	const base = (baseImg || "").replace(/\/+$/, "")
	if (!base) return "/" + normalized
	return `${base}/${normalized}`
}

function prettyBytes(bytes) {
	if (!bytes && bytes !== 0) return ""
	const units = ["B", "KB", "MB", "GB"]
	let v = bytes
	let i = 0
	while (v >= 1024 && i < units.length - 1) {
		v /= 1024
		i++
	}
	return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}

export default function AssetsLibrary({ open, onOpenChange }) {
	const queryClient = useQueryClient()

	// Local UI states
	const [queue, setQueue] = useState([])
	const [uploading, setUploading] = useState(false)
	const [uploadProgress, setUploadProgress] = useState(0)
	const [deletingId, setDeletingId] = useState(null)
	const [copiedId, setCopiedId] = useState(null)

	const fileInputRef = useRef(null)
	const dropRef = useRef(null)

	// -----------------------
	// Query: Assets (cached)
	// -----------------------
	const assetsQuery = useQuery({
		queryKey: ["assets"],
		enabled: open, // fetch only when dialog is open
		queryFn: async () => {
			const userId = getUserIdFromStorage()
			const res = await api.get("/assets", {
				params: { ...(userId ? { userId } : {}) },
			})

			const data = res.data
			const list = Array.isArray(data)
				? data
				: Array.isArray(data?.items)
					? data.items
					: Array.isArray(data?.assets)
						? data.assets
						: []

			return list
		},
		staleTime: 60_000, // 1 min fresh
		gcTime: 10 * 60_000, // 10 min in cache
		refetchOnWindowFocus: false,
		retry: 1,
	})

	const assets = assetsQuery.data || []
	const loading = assetsQuery.isLoading
	const error = assetsQuery.isError
		? assetsQuery.error?.response?.data?.message ||
		assetsQuery.error?.message ||
		"Failed to load assets"
		: ""

	// -----------------------
	// Helpers
	// -----------------------
	function addFiles(files) {
		const arr = Array.from(files || [])
		if (!arr.length) return

		const onlyImages = arr.filter((f) => f.type?.startsWith("image/"))
		if (onlyImages.length !== arr.length) {
			toast.message("Some files were skipped (only images allowed).")
		}

		setQueue((prev) => {
			const merged = [...prev]
			for (const f of onlyImages) {
				const exists = merged.some((x) => x.name === f.name && x.size === f.size)
				if (!exists) merged.push(f)
			}
			return merged
		})
	}

	function removeFromQueue(idx) {
		setQueue((prev) => prev.filter((_, i) => i !== idx))
	}

	async function copyLink(url, id) {
		if (!url) return
		try {
			await navigator.clipboard.writeText(url)
			setCopiedId(id)
			toast.success("Link copied")
			setTimeout(() => setCopiedId(null), 900)
		} catch {
			toast.error("Copy failed")
		}
	}

	// -----------------------
	// Mutation: Upload
	// -----------------------
	const uploadMutation = useMutation({
		mutationFn: async (files) => {
			const userId = getUserIdFromStorage()

			if (files.length === 1) {
				const fd = new FormData()
				fd.append("file", files[0])

				await api.post("/assets", fd, {
					params: { ...(userId ? { userId } : {}) },
					headers: { "Content-Type": "multipart/form-data" },
					onUploadProgress: (p) => {
						if (!p.total) return
						setUploadProgress(Math.round((p.loaded * 100) / p.total))
					},
				})
				return
			}

			const fd = new FormData()
			for (const f of files) fd.append("files", f)

			await api.post("/assets/bulk", fd, {
				params: { ...(userId ? { userId } : {}) },
				headers: { "Content-Type": "multipart/form-data" },
				onUploadProgress: (p) => {
					if (!p.total) return
					setUploadProgress(Math.round((p.loaded * 100) / p.total))
				},
			})
		},
		onMutate: () => {
			setUploading(true)
			setUploadProgress(0)
		},
		onSuccess: async () => {
			toast.success("Uploaded successfully")
			setQueue([])
			await queryClient.invalidateQueries({ queryKey: ["assets"] })
		},
		onError: (err) => {
			const msg = err?.response?.data?.message || err?.message || "Upload failed"
			toast.error(msg)
		},
		onSettled: () => {
			setUploading(false)
			setUploadProgress(0)
			if (fileInputRef.current) fileInputRef.current.value = ""
		},
	})

	async function uploadQueued() {
		if (!queue.length) return
		uploadMutation.mutate(queue)
	}

	// -----------------------
	// Mutation: Delete (optimistic)
	// -----------------------
	const deleteMutation = useMutation({
		mutationFn: async (id) => {
			await api.delete(`/assets/${id}`)
			return id
		},
		onMutate: async (id) => {
			setDeletingId(id)

			await queryClient.cancelQueries({ queryKey: ["assets"] })
			const prev = queryClient.getQueryData(["assets"])

			queryClient.setQueryData(["assets"], (old = []) =>
				old.filter((a) => (a.id || a._id) !== id)
			)

			return { prev }
		},
		onError: (_err, _id, ctx) => {
			if (ctx?.prev) queryClient.setQueryData(["assets"], ctx.prev)
			toast.error("Delete failed")
		},
		onSuccess: () => {
			toast.success("Deleted")
		},
		onSettled: () => {
			setDeletingId(null)
			queryClient.invalidateQueries({ queryKey: ["assets"] })
		},
	})

	function deleteAsset(id) {
		if (!id) return
		deleteMutation.mutate(id)
	}

	// -----------------------
	// DnD listeners
	// -----------------------
	useEffect(() => {
		const el = dropRef.current
		if (!el) return

		const onDragOver = (e) => {
			e.preventDefault()
			e.stopPropagation()
			el.classList.add("ring-2", "ring-primary/30")
		}
		const onDragLeave = (e) => {
			e.preventDefault()
			e.stopPropagation()
			el.classList.remove("ring-2", "ring-primary/30")
		}
		const onDrop = (e) => {
			e.preventDefault()
			e.stopPropagation()
			el.classList.remove("ring-2", "ring-primary/30")
			addFiles(e.dataTransfer?.files)
		}

		el.addEventListener("dragover", onDragOver)
		el.addEventListener("dragleave", onDragLeave)
		el.addEventListener("drop", onDrop)
		return () => {
			el.removeEventListener("dragover", onDragOver)
			el.removeEventListener("dragleave", onDragLeave)
			el.removeEventListener("drop", onDrop)
		}
	}, [])

	const filteredAssets = useMemo(() => assets, [assets])

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{open && (
				<div className="pointer-events-none fixed inset-0 z-[9999] bg-black/50 backdrop-blur-[3px]" />
			)}

			<DialogContent className="max-h-[90vh] max-w-6xl z-[10000] p-0 overflow-auto">
				<DialogHeader className="px-6 pt-6">
					<div className="flex items-start justify-between gap-4">
						<div>
							<DialogTitle className="text-xl">Assets Library</DialogTitle>
							<p className="text-sm text-muted-foreground mt-1">
								Upload, manage, and copy links to your images.
							</p>
						</div>
					</div>
				</DialogHeader>

				<div className="px-6 pb-6">
					{/* Drop area */}
					<div
						ref={dropRef}
						className={`${queue.length > 0 ? "mt-4 rounded-2xl border bg-muted/30 p-4 transition" : ""}`}
					>
						{queue.length > 0 && (
							<>
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
									{queue.map((f, idx) => (
										<div
											key={`${f.name}-${f.size}-${idx}`}
											className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2"
										>
											<div className="min-w-0">
												<div className="text-sm font-medium truncate">{f.name}</div>
												<div className="text-xs text-muted-foreground">{prettyBytes(f.size)}</div>
											</div>

											<Button
												variant="ghost"
												size="icon"
												onClick={() => removeFromQueue(idx)}
												disabled={uploading}
												title="Remove"
											>
												<X className="h-4 w-4" />
											</Button>
										</div>
									))}
								</div>

								<div className="flex items-center justify-end mt-4">
									<Button
										onClick={uploadQueued}
										disabled={uploading || queue.length === 0}
										className="gap-2"
									>
										{uploading ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<CloudUpload className="h-4 w-4" />
										)}
										Upload {queue.length ? `(${queue.length})` : ""}
										{uploading && uploadProgress ? (
											<span className="ml-1 text-xs opacity-80">{uploadProgress}%</span>
										) : null}
									</Button>
								</div>

								{/* uploadMutation errors already toasted, but keep inline if you want */}
								{uploadMutation.isError ? (
									<div className="mt-3 text-xs text-red-500">
										{uploadMutation.error?.response?.data?.message ||
											uploadMutation.error?.message ||
											"Upload failed"}
									</div>
								) : null}
							</>
						)}
					</div>

					{/* Assets */}
					<div className="mt-6">
						<div className="flex items-center justify-between">
							<div className="text-sm font-medium">
								Assets{" "}
								<span className="text-muted-foreground font-normal">
									({filteredAssets.length})
								</span>
							</div>
						</div>

						<div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-4">
							{/* Upload card */}
							<Card
								className="h-[120px] rounded-2xl border-dashed border-2 flex items-center justify-center cursor-pointer transition hover:border-primary hover:bg-muted/40 group"
								onClick={() => fileInputRef.current?.click()}
							>
								<input
									ref={fileInputRef}
									type="file"
									accept="image/*"
									multiple
									hidden
									onChange={(e) => addFiles(e.target.files)}
								/>
								<div className="flex flex-col items-center justify-center gap-2 text-muted-foreground group-hover:text-primary">
									{uploading ? (
										<>
											<Loader2 className="h-6 w-6 animate-spin" />
											<span className="text-xs">Uploading…</span>
										</>
									) : (
										<>
											<Upload className="h-6 w-6" />
											<span className="text-xs font-medium">Upload</span>
										</>
									)}
								</div>
							</Card>

							{loading
								? Array.from({ length: 3 }).map((_, i) => (
									<Card key={i} className="h-[120px] overflow-hidden rounded-2xl">
										<div className="h-[120px] animate-pulse bg-muted" />
									</Card>
								))
								: filteredAssets.map((asset) => {
									const id = asset.id || asset._id
									const url = resolveAssetUrl(asset.url || asset.src)
									const filename = asset.filename || "asset"

									return (
										<Card key={id} className="!h-[120px] group relative overflow-hidden rounded-2xl">
											<div className="h-full absolute inset-0 ">
												{url ? (
													<Img
														src={asset.url}
														alt={filename}
														className="h-[120px] w-full object-contain"
														loading="lazy"
													/>
												) : (
													<div className="h-full w-full flex items-center justify-center">
														<ImageIcon className="h-8 w-8 text-muted-foreground" />
													</div>
												)}

												{/* Enhanced overlay */}
												<div
													className="
                            absolute inset-0
                            rounded-2xl opacity-100
                            transition-all duration-200 ease-out
                            bg-gradient-to-t from-black/85 via-black/35 to-transparent
                             flex flex-col justify-between
                            p-2
                          "
												>
													{/* Top actions */}
													<div className="flex items-center justify-end gap-2">
														<Button
															size="sm"
															variant="secondary"
															className="bg-white/90 hover:bg-white text-black gap-2 shadow-sm"
															disabled={!url || copiedId === id}
															onClick={(e) => {
																e.stopPropagation()
																copyLink(url, id)
															}}
														>
															{copiedId === id ? (
																<>
																	<Check className="h-4 w-4" />
																</>
															) : (
																<>
																	<Copy className="h-4 w-4" />
 																</>
															)}
														</Button>

														<Button
															size="sm"
															variant="destructive"
															className="gap-2 shadow-sm"
															disabled={deletingId === id}
															onClick={(e) => {
																e.stopPropagation()
																deleteAsset(id)
															}}
														>
															{deletingId === id ? (
																<Loader2 className="h-4 w-4 animate-spin" />
															) : (
																<Trash2 className="h-4 w-4" />
															)}
														</Button>
													</div>

													{/* Bottom info */}
													<div className="px-1">
														<div className="text-white text-xs font-semibold truncate">
															{filename}
														</div>
														<div className="text-white/70 text-[11px]">
															{asset.size ? prettyBytes(asset.size) : ""}
														</div>
													</div>
												</div>
											</div>
										</Card>
									)
								})}
						</div>

						{/* Query error */}
						{assetsQuery.isError ? (
							<div className="mt-3 text-xs text-red-500">{error}</div>
						) : null}

						{!loading && filteredAssets.length === 0 && !assetsQuery.isError && (
							<div className="mt-8 text-sm text-muted-foreground">
								No assets found. Upload your first image.
							</div>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
