"use client";

import React, {
	memo, useState, useCallback, useMemo, useEffect, useRef, useId,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
	Search, Download, ChevronDown,
	ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
	Image as ImageIcon, X, Maximize2, SlidersHorizontal,
	Inbox, Filter, ArrowUpDown, ZoomIn, ZoomOut, Check, Minus,
} from "lucide-react";
import { baseImg } from "@/utils/axios";
import { useLocale, useTranslations } from "next-intl";
import { ActionButton } from "./Actions";
import { setStoredPerPage } from "@/lib/table-prefs";
import "./datatable.css";

// ─── constants ────────────────────────────────────────────────────────────────
const ACTION_KEYS = new Set(["actions", "options"]);
const PER_PAGE_OPTS = [10, 20, 30, 50];
const MAX_CUSTOM_LIMIT = 1000;
const MAX_SKELETON_ROWS = 10;

// ─── helpers ──────────────────────────────────────────────────────────────────
function toFullSrc(src) {
	if (!src) return "";
	return src.startsWith("http") ? src : baseImg + src;
}

function normalizeImages(value, fallbackAlt = "") {
	if (!value) return [];
	if (typeof value === "string") return [{ src: value, alt: fallbackAlt }];
	if (Array.isArray(value)) {
		return value.map((v) => {
			if (!v) return null;
			if (typeof v === "string") return { src: v, alt: fallbackAlt };
			if (typeof v === "object") {
				const src = v.url ?? v.src;
				return src ? { src, alt: v.alt ?? fallbackAlt } : null;
			}
			return null;
		}).filter(Boolean);
	}
	if (typeof value === "object") {
		const src = value.url ?? value.src;
		if (src) return [{ src, alt: value.alt ?? fallbackAlt }];
	}
	return [];
}

function parseLimit(raw) {
	const n = Number.parseInt(String(raw).trim(), 10);
	if (!Number.isFinite(n) || n < 1) return null;
	return Math.min(MAX_CUSTOM_LIMIT, n);
}

// ─── FilterField ──────────────────────────────────────────────────────────────
export function FilterField({ label, children, className }) {
	return (
		<div className={cn("flex flex-col gap-1.5", className)}>
			{label && <span className="dt-field-label">{label}</span>}
			{children}
		</div>
	);
}

// ─── Search Input ─────────────────────────────────────────────────────────────
const SearchInput = memo(function SearchInput({ value, onChange, onKeyDown, placeholder }) {
	return (
		<label className="dt-search">
			<Search size={15} className="dt-search__icon" aria-hidden />
			<input
				value={value}
				onChange={(e) => onChange?.(e.target.value)}
				onKeyDown={onKeyDown}
				placeholder={placeholder}
				aria-label={placeholder}
				className="dt-search__input"
			/>
			{value ? (
				<button
					type="button"
					aria-label="Clear"
					onClick={(e) => { e.preventDefault(); onChange?.(""); }}
					className="dt-search__clear"
				>
					<X size={13} />
				</button>
			) : null}
		</label>
	);
});

// ─── Toolbar ──────────────────────────────────────────────────────────────────
export const TableToolbar = memo(function TableToolbar({
	searchValue = "",
	onSearchChange,
	onSearch,
	searchPlaceholder = "Search…",
	isFiltersOpen = false,
	onToggleFilters,
	hasActiveFilters = false,
	filterLabel = "Filters",
	actions = [],
}) {
	return (
		<div className="dt-toolbar">
			<div className="min-w-[240px] flex-1">
				<SearchInput
					value={searchValue}
					onChange={onSearchChange}
					onKeyDown={(e) => e.key === "Enter" && onSearch?.()}
					placeholder={searchPlaceholder}
				/>
			</div>

			<div className="ms-auto flex flex-wrap items-center gap-2">
				{actions.map((action) => (
					<button
						key={action.key}
						type="button"
						onClick={action.onClick}
						disabled={action.disabled}
						className={cn("dt-btn", action.color && `dt-btn--${action.color}`)}
					>
						{action.icon}
						{action.label}
					</button>
				))}

				{onToggleFilters && (
					<button
						type="button"
						onClick={onToggleFilters}
						aria-expanded={isFiltersOpen}
						className={cn("dt-btn", isFiltersOpen && "is-on")}
					>
						<SlidersHorizontal size={14} />
						<span>{filterLabel}</span>
						{hasActiveFilters && !isFiltersOpen ? <span className="dt-btn__dot" aria-hidden /> : null}
						<ChevronDown size={13} className="dt-btn__chev" />
					</button>
				)}
			</div>
		</div>
	);
});

// ─── Filters Panel ────────────────────────────────────────────────────────────
export const TableFilters = memo(function TableFilters({ children, onApply, applyLabel = "Apply" }) {
	return (
		<motion.div
			initial={{ height: 0, opacity: 0 }}
			animate={{ height: "auto", opacity: 1 }}
			exit={{ height: 0, opacity: 0 }}
			transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
			className="overflow-hidden"
		>
			<div className="dt-filters flex items-end gap-4">
				<div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{children}
				</div>
				{onApply && (
					<button type="button" onClick={onApply} className="dt-btn dt-btn--primary shrink-0">
						<Filter size={13} />
						{applyLabel}
					</button>
				)}
			</div>
		</motion.div>
	);
});

// ─── Per-page select ──────────────────────────────────────────────────────────
const PerPageSelect = memo(function PerPageSelect({ value, options, onChange, disabled, t }) {
	const uid = useId();
	const btnRef = useRef(null);
	const menuRef = useRef(null);
	const [open, setOpen] = useState(false);
	const [pos, setPos] = useState({ top: 0, left: 0, width: 196 });
	const [custom, setCustom] = useState("");

	const isPreset = options.includes(value);

	const place = useCallback(() => {
		const el = btnRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const menuH = menuRef.current?.offsetHeight || 280;
		const pad = 8;
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const width = 196;
		const rtl = document.documentElement.dir === "rtl";
		const left = rtl
			? Math.min(Math.max(pad, rect.left), vw - width - pad)
			: Math.min(Math.max(pad, rect.right - width), vw - width - pad);
		let top = rect.top - 8 - menuH;
		if (top < pad) top = Math.min(rect.bottom + 8, vh - menuH - pad);
		setPos({ top: Math.max(pad, top), left, width });
	}, []);

	useEffect(() => {
		if (!open) return;
		setCustom(isPreset ? "" : String(value));
		place();
		const id = requestAnimationFrame(place);
		const onWin = () => place();
		window.addEventListener("resize", onWin);
		window.addEventListener("scroll", onWin, true);
		return () => {
			cancelAnimationFrame(id);
			window.removeEventListener("resize", onWin);
			window.removeEventListener("scroll", onWin, true);
		};
	}, [open, place, isPreset, value]);

	useEffect(() => {
		if (!open) return;
		const onDoc = (e) => {
			if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
			setOpen(false);
		};
		const onKey = (e) => e.key === "Escape" && setOpen(false);
		document.addEventListener("mousedown", onDoc);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDoc);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

	const pick = (lim) => {
		onChange(lim);
		setOpen(false);
	};

	const applyCustom = () => {
		const n = parseLimit(custom);
		if (!n) return;
		onChange(n);
		setOpen(false);
	};

	return (
		<div className="dt-perpage">
			<span>{t("perPage")}</span>
			<button
				ref={btnRef}
				id={uid}
				type="button"
				disabled={disabled}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={`${uid}-menu`}
				onClick={() => setOpen((v) => !v)}
				className={cn("dt-perpage__btn", open && "is-open")}
			>
				{value}
				<ChevronDown size={13} />
			</button>

			{open && typeof document !== "undefined" && createPortal(
				<div
					ref={menuRef}
					id={`${uid}-menu`}
					role="listbox"
					aria-labelledby={uid}
					className="dt-menu"
					style={{ top: pos.top, left: pos.left, width: pos.width }}
				>
					{options.map((lim) => {
						const active = value === lim;
						return (
							<button
								key={lim}
								type="button"
								role="option"
								aria-selected={active}
								onClick={() => pick(lim)}
								className={cn("dt-menu__opt", active && "is-active")}
							>
								{lim}
								{active && <Check size={13} strokeWidth={2.6} />}
							</button>
						);
					})}

					<div className="dt-menu__custom">
						<p className="dt-menu__label">{t("customLimit")}</p>
						<div className="dt-menu__row">
							<input
								type="number"
								min={1}
								max={MAX_CUSTOM_LIMIT}
								inputMode="numeric"
								placeholder={t("customLimitHint")}
								value={custom}
								onChange={(e) => setCustom(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										applyCustom();
									}
								}}
								className="dt-menu__input"
							/>
							<button type="button" onClick={applyCustom} disabled={!parseLimit(custom)} className="dt-menu__apply">
								{t("applyLimit")}
							</button>
						</div>
					</div>
				</div>,
				document.body,
			)}
		</div>
	);
});

// ─── Pagination ───────────────────────────────────────────────────────────────
export const TablePagination = memo(function TablePagination({
	pagination, onPageChange, isLoading = false,
	pageParamName = "page", limitParamName = "limit",
	perPageOptions = PER_PAGE_OPTS,
	persistLimit = true,
}) {
	const t = useTranslations("table.pagination");
	const locale = useLocale();
	const isRtl = String(locale || "").toLowerCase().startsWith("ar");

	const totalPages = useMemo(() => {
		const total = Number(pagination?.total_records ?? 0);
		const per = Number(pagination?.per_page ?? 10);
		return Math.max(1, Math.ceil(total / per));
	}, [pagination]);

	const currentPage = Number(pagination?.current_page ?? 1);
	const perPage = Number(pagination?.per_page ?? 10);

	const pageItems = useMemo(() => {
		const tot = totalPages;
		const cur = Math.min(Math.max(1, currentPage), tot);
		if (tot <= 7) return Array.from({ length: tot }, (_, i) => i + 1);
		const items = [1];
		const start = Math.max(2, cur - 1);
		const end = Math.min(tot - 1, cur + 1);
		if (start > 2) items.push("…");
		for (let p = start; p <= end; p++) items.push(p);
		if (end < tot - 1) items.push("…");
		items.push(tot);
		return items;
	}, [totalPages, currentPage]);

	const goTo = (p) => {
		if (!onPageChange) return;
		const clamped = Math.min(Math.max(1, p), totalPages);
		if (clamped === currentPage) return;
		onPageChange({ page: clamped, per_page: perPage, [pageParamName]: clamped, [limitParamName]: perPage });
	};

	const changeLimit = (lim) => {
		if (!onPageChange) return;
		if (persistLimit) setStoredPerPage(lim);
		onPageChange({ page: 1, per_page: lim, [pageParamName]: 1, [limitParamName]: lim });
	};

	const total = Number(pagination?.total_records ?? 0);
	const from = total ? (currentPage - 1) * perPage + 1 : 0;
	const to = Math.min(currentPage * perPage, total);

	const FirstIcon = isRtl ? ChevronsRight : ChevronsLeft;
	const PrevIcon = isRtl ? ChevronRight : ChevronLeft;
	const NextIcon = isRtl ? ChevronLeft : ChevronRight;
	const LastIcon = isRtl ? ChevronsLeft : ChevronsRight;
	const atStart = currentPage <= 1;
	const atEnd = currentPage >= totalPages;

	return (
		<div className="dt-foot">
			<p className="dt-range">
				<span className="dt-range__now">{from}–{to}</span>
				<span>{t("ofTotal", { total })}</span>
			</p>

			<nav className="dt-pager" aria-label="Pagination">
				<button type="button" className="dt-pager__btn dt-pager__edge" onClick={() => goTo(1)} disabled={isLoading || atStart} title={t("firstPage")} aria-label={t("firstPage")}>
					<FirstIcon size={14} />
				</button>
				<button type="button" className="dt-pager__btn" onClick={() => goTo(currentPage - 1)} disabled={isLoading || atStart} title={t("prevPage")} aria-label={t("prevPage")}>
					<PrevIcon size={14} />
				</button>
				<span className="dt-pager__sep" aria-hidden />
				{pageItems.map((p, idx) =>
					p === "…" ? (
						<span key={`gap-${idx}`} className="dt-pager__gap" aria-hidden>···</span>
					) : (
						<button
							key={p}
							type="button"
							onClick={() => goTo(p)}
							disabled={isLoading}
							aria-current={p === currentPage ? "page" : undefined}
							className={cn("dt-pager__btn dt-pager__num", p === currentPage && "is-current")}
						>
							{p}
						</button>
					),
				)}
				<span className="dt-pager__compact">{currentPage} / {totalPages}</span>
				<span className="dt-pager__sep" aria-hidden />
				<button type="button" className="dt-pager__btn" onClick={() => goTo(currentPage + 1)} disabled={isLoading || atEnd} title={t("nextPage")} aria-label={t("nextPage")}>
					<NextIcon size={14} />
				</button>
				<button type="button" className="dt-pager__btn dt-pager__edge" onClick={() => goTo(totalPages)} disabled={isLoading || atEnd} title={t("lastPage")} aria-label={t("lastPage")}>
					<LastIcon size={14} />
				</button>
			</nav>

			<PerPageSelect value={perPage} options={perPageOptions} onChange={changeLimit} disabled={isLoading} t={t} />
		</div>
	);
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const TableSkeleton = memo(function TableSkeleton({ columns, rows = 6 }) {
	const firstDataIdx = columns.findIndex((c) => !String(c.key).startsWith("__"));
	return Array.from({ length: Math.min(rows, MAX_SKELETON_ROWS) }).map((_, ri) => (
		<tr key={ri} className="dt-row" aria-hidden>
			{columns.map((col, ci) => (
				<td key={ci} className={cn("dt-td", col.key === "__select__" && "dt-col-select")}>
					{col.key === "__select__" ? (
						<span className="dt-skel block" style={{ width: 18, height: 18, borderRadius: 6 }} />
					) : ci === firstDataIdx ? (
						<span className="dt-skel-stack">
							<span className="dt-skel dt-skel--avatar" />
							<span className="dt-skel-lines">
								<span className="dt-skel block" style={{ width: `${55 + ((ri * 17) % 30)}%` }} />
								<span className="dt-skel block" style={{ width: `${35 + ((ri * 11) % 25)}%`, height: 9 }} />
							</span>
						</span>
					) : (
						<span
							className="dt-skel block"
							style={{ width: col.type === "img" ? 40 : `${40 + ((ri * 13 + ci * 7) % 45)}%`, height: col.type === "img" ? 40 : 12 }}
						/>
					)}
				</td>
			))}
		</tr>
	));
});

// ─── Image cells ──────────────────────────────────────────────────────────────
const ImgCell = memo(function ImgCell({ src, alt, onOpen }) {
	const full = toFullSrc(src);
	const [loaded, setLoaded] = useState(false);

	if (!full) return <span className="text-slate-300 text-sm">—</span>;

	return (
		<motion.button
			whileHover={{ scale: 1.08, y: -1 }}
			whileTap={{ scale: 0.95 }}
			type="button"
			onClick={() => onOpen(full, alt)}
			className="group/img relative w-10 h-10 rounded-xl overflow-hidden block"
			style={{
				border: "2px solid var(--color-primary-100)",
				boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
				transition: "all 0.2s ease",
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.borderColor = "var(--color-primary-400)";
				e.currentTarget.style.boxShadow = "0 6px 20px color-mix(in oklab, var(--color-primary-400) 35%, transparent)";
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.borderColor = "var(--color-primary-100)";
				e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
			}}
		>
			{!loaded && (
				<div
					className="absolute inset-0 animate-pulse"
					style={{ background: "var(--color-primary-100)" }}
				/>
			)}
			<img
				src={full}
				alt={alt}
				className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-110"
				loading="lazy"
				onLoad={() => setLoaded(true)}
			/>
			<div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-all duration-200 flex items-end justify-center pb-1">
				<Maximize2 size={10} className="text-white drop-shadow" />
			</div>
		</motion.button>
	);
});

const ImgsCell = memo(function ImgsCell({ images, onOpen }) {
	if (!images.length) return <span className="text-slate-300 text-sm">—</span>;
	return (
		<div className="flex items-center">
			{images.map((img, idx) => {
				const full = toFullSrc(img.src);
				return (
					<motion.button
						key={`${img.src}-${idx}`}
						type="button"
						onClick={() => onOpen(full, img.alt)} 
						whileHover={{ scale: 1.15, zIndex: 50, y: -3 }}
						whileTap={{ scale: 0.95 }}
						transition={{ type: "spring", stiffness: 400, damping: 28 }}
						className="relative w-10 h-10 rounded-xl overflow-hidden cursor-pointer"
						style={{
							zIndex: images.length - idx, marginInlineStart: idx === 0 ? 0 : -12,
							border: "2.5px solid white",
							boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
						}}
					>
						<img src={full} alt={img.alt} className="w-full h-full object-cover" loading="lazy" />
					</motion.button>
				);
			})}
			{images.length > 1 && (
				<span
					className="ms-2 text-[10px] font-bold px-1.5 py-0.5 rounded-lg"
					style={{
						background: "var(--color-primary-50)",
						color: "var(--color-primary-500)",
						border: "1px solid var(--color-primary-200)",
					}}
				>
					{images.length}
				</span>
			)}
		</div>
	);
});

// ─── Image Modal ──────────────────────────────────────────────────────────────
const ImageModal = memo(function ImageModal({ src, alt, open, onClose, labels = {} }) {
	const [zoomed, setZoomed] = useState(false);
	useEffect(() => { if (!open) setZoomed(false); }, [open]);

	const download = useCallback(() => {
		const a = Object.assign(document.createElement("a"), {
			href: src, target: "_blank", download: alt || "image",
		});
		document.body.appendChild(a); a.click(); document.body.removeChild(a);
	}, [src, alt]);

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent
				showCloseButton={false}
				className="max-w-3xl !p-0 overflow-hidden rounded-2xl bg-white shadow-2xl"
				style={{
					border: "1.5px solid var(--color-primary-100)",
					boxShadow: "0 25px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.5)",
				}}
			>
				<div
					className="h-[3px] w-full"
					style={{ background: "linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-via), var(--color-gradient-to))" }}
				/>
				<div
					className="flex items-center justify-between gap-4 px-5 py-4 border-b"
					style={{ borderColor: "var(--color-primary-100)" }}
				>
					<div className="flex items-center gap-3">
						<div
							className="w-9 h-9 rounded-xl flex items-center justify-center"
							style={{
								background: "var(--color-primary-50)",
								border: "1.5px solid var(--color-primary-200)",
							}}
						>
							<ImageIcon size={15} style={{ color: "var(--color-primary-600)" }} />
						</div>
						<div>
							<p className="text-sm font-bold text-slate-800">{labels.preview ?? "Image Preview"}</p>
							{alt && <p className="text-xs mt-0.5" style={{ color: "var(--color-primary-400)" }}>{alt}</p>}
						</div>
					</div>
					<div className="flex items-center gap-1.5">
						<motion.button
							whileHover={{ scale: 1.08 }}
							whileTap={{ scale: 0.92 }}
							onClick={() => setZoomed((z) => !z)}
							className="w-8 h-8 rounded-xl flex items-center justify-center border transition-all"
							style={{ borderColor: "#e2e8f0", color: "#64748b" }}
							title={zoomed ? "Zoom out" : "Zoom in"}
						>
							{zoomed ? <ZoomOut size={13} /> : <ZoomIn size={13} />}
						</motion.button>
						<motion.button
							whileHover={{ scale: 1.08 }}
							whileTap={{ scale: 0.92 }}
							onClick={download}
							className="relative w-8 h-8 rounded-xl flex items-center justify-center text-white overflow-hidden"
							style={{
								background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))",
								boxShadow: "0 2px 8px color-mix(in oklab, var(--color-primary-500) 30%, transparent)",
							}}
						>
							<span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-xl pointer-events-none" />
							<Download size={13} />
						</motion.button>
						<motion.button
							whileHover={{ scale: 1.08, rotate: 90 }}
							whileTap={{ scale: 0.92 }}
							onClick={onClose}
							className="w-8 h-8 rounded-xl border flex items-center justify-center text-slate-500 transition-all hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200"
							style={{ borderColor: "#e2e8f0" }}
						>
							<X size={13} />
						</motion.button>
					</div>
				</div>
				<div
					className="p-8 flex items-center justify-center min-h-[360px] relative"
					style={{
						background: "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--color-primary-100) 60%, white), var(--color-primary-50))",
					}}
				>
					{/* decorative corner dots */}
					{[["top-4 start-4"], ["top-4 end-4"], ["bottom-4 start-4"], ["bottom-4 end-4"]].map(([pos], i) => (
						<span
							key={i}
							className={`absolute ${pos} w-1.5 h-1.5 rounded-full opacity-30`}
							style={{ background: "var(--color-primary-400)" }}
						/>
					))}
					<motion.div
						animate={{ scale: zoomed ? 1.6 : 1 }}
						transition={{ type: "spring", stiffness: 260, damping: 28 }}
						onClick={() => setZoomed((z) => !z)}
						className="cursor-zoom-in"
						style={{ cursor: zoomed ? "zoom-out" : "zoom-in" }}
					>
						<motion.img
							src={src}
							alt={alt}
							className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-2xl"
							style={{ border: "4px solid white", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
						/>
					</motion.div>
				</div>
			</DialogContent>
		</Dialog>
	);
});

// ─── Row index badge ──────────────────────────────────────────────────────────
function RowIndexBadge({ index }) {
	return (
		<span className="inline-grid size-6 place-items-center rounded-lg text-[11px] font-semibold tabular-nums" style={{ color: "var(--dt-muted)", background: "var(--dt-tint)" }}>
			{index}
		</span>
	);
}

// ─── Row / header checkbox ────────────────────────────────────────────────────
const RowCheckbox = memo(function RowCheckbox({ checked, indeterminate = false, onChange, label }) {
	const ref = useRef(null);
	useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
	const on = checked || indeterminate;

	return (
		<label className={cn("dt-check", on && "is-on")} onClick={(e) => e.stopPropagation()}>
			<input ref={ref} type="checkbox" checked={checked} onChange={onChange} className="sr-only" aria-label={label} />
			<span className="dt-check__box">
				{checked ? <Check size={12} strokeWidth={3.2} /> : indeterminate ? <Minus size={12} strokeWidth={3.2} /> : null}
			</span>
		</label>
	);
});

function ColumnHeader({ col }) {
	return (
		<span className="dt-th__label">
			{col.header}
			{col.sortable && <ArrowUpDown size={11} className="dt-th__sort" aria-hidden />}
		</span>
	);
}

// ─── Main DataTable ───────────────────────────────────────────────────────────
export default function DataTable({
	searchValue = "", onSearchChange, onSearch,
	actions = [], filters, hasActiveFilters = false, onApplyFilters,
	labels = {}, columns = [], data = [], isLoading = false,
	rowKey = (row, i) => row?.id ?? i,
	emptyState, striped = false, compact = false, hoverable = true,
	pagination = null, onPageChange,
	pageParamName = "page", limitParamName = "limit",
	perPageOptions = PER_PAGE_OPTS, className = "",
	hideToolbar = false,
	toolbar = null,
	calm = false,
	showRowIndex = false,
	selectable = false, bulkActions = [], onSelectionChange,
}) {
	columns = columns.map((col) => (col?.key || col?.accessor == null ? col : { ...col, key: col.accessor }));
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [imgModal, setImgModal] = useState({ open: false, src: "", alt: "" });
	const [selected, setSelected] = useState(() => new Set());

	const openImage = useCallback((src, alt = "") => setImgModal({ open: true, src, alt }), []);
	const closeImage = useCallback(() => setImgModal({ open: false, src: "", alt: "" }), []);

	// Clear selection whenever the dataset changes (page, search, filter, refetch).
	useEffect(() => { setSelected(new Set()); }, [data]);

	const toggleRow = useCallback((key) => {
		setSelected((prev) => {
			const next = new Set(prev);
			next.has(key) ? next.delete(key) : next.add(key);
			onSelectionChange?.(Array.from(next));
			return next;
		});
	}, [onSelectionChange]);

	const pageKeys = useMemo(() => data.map((row, i) => rowKey(row, i)), [data, rowKey]);
	const allSelectedOnPage = pageKeys.length > 0 && pageKeys.every((k) => selected.has(k));
	const someSelectedOnPage = !allSelectedOnPage && pageKeys.some((k) => selected.has(k));

	const toggleAll = useCallback(() => {
		setSelected((prev) => {
			const allSelected = pageKeys.length > 0 && pageKeys.every((k) => prev.has(k));
			const next = allSelected ? new Set() : new Set(pageKeys);
			onSelectionChange?.(Array.from(next));
			return next;
		});
	}, [pageKeys, onSelectionChange]);

	const clearSelection = useCallback(() => {
		setSelected(new Set());
		onSelectionChange?.([]);
	}, [onSelectionChange]);

	const helpers = useMemo(() => ({ openImage, isSelected: (key) => selected.has(key), toggleRow }), [openImage, selected, toggleRow]);

	const hasFilters = Boolean(filters);

	const allColumns = useMemo(() => {
		let cols = columns;
		if (showRowIndex) {
			cols = [
				{ key: "__idx__", header: "#", headClassName: "w-10", cell: (_, i) => <RowIndexBadge index={i + 1} /> },
				...cols,
			];
		}
		if (selectable) {
			cols = [
				{
					key: "__select__",
					header: <RowCheckbox checked={allSelectedOnPage} indeterminate={someSelectedOnPage} onChange={toggleAll} label="Select all" />,
					headClassName: "dt-col-select",
					className: "dt-col-select",
					cell: (row, i, h) => {
						const key = rowKey(row, i);
						return <RowCheckbox checked={h.isSelected(key)} onChange={() => h.toggleRow(key)} label="Select row" />;
					},
				},
				...cols,
			];
		}
		return cols;
	}, [columns, showRowIndex, selectable, allSelectedOnPage, someSelectedOnPage, toggleAll, rowKey]);

	const showHead = !hideToolbar || toolbar || (selectable && selected.size > 0);

	return (
		<div className={cn("dt", compact && "is-compact", striped && "is-striped", hoverable && "is-hoverable", !calm && "is-animated", className)}>
			<div className="dt-card">
				{showHead && (
					<div className="dt-head">
						<AnimatePresence initial={false}>
							{selectable && selected.size > 0 && (
								<motion.div
									initial={{ height: 0, opacity: 0 }}
									animate={{ height: "auto", opacity: 1 }}
									exit={{ height: 0, opacity: 0 }}
									transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
									className="overflow-hidden"
								>
									<div className="dt-selbar">
										<span className="dt-selbar__count">
											<span className="dt-selbar__num">{selected.size}</span>
											{(labels.selectedCount ?? "{count} selected").replace("{count}", "").trim()}
										</span>
										<button type="button" onClick={clearSelection} className="dt-selbar__clear">
											{labels.clearSelection ?? "Clear"}
										</button>
										{bulkActions.length > 0 && (
											<div className="ms-auto flex items-center gap-2">
												{bulkActions.map((action) => (
													<ActionButton
														key={action.key}
														icon={action.icon}
														label={action.label}
														variant={action.variant || "red"}
														disabled={action.disabled}
														loading={action.loading}
														confirm={
															action.confirm
																? {
																	...action.confirm,
																	message: typeof action.confirm.message === "function"
																		? action.confirm.message(selected.size)
																		: action.confirm.message,
																}
																: undefined
														}
														onClick={() => {
															const keys = Array.from(selected);
															const rows = data.filter((row, i) => selected.has(rowKey(row, i)));
															action.onClick?.(keys, rows);
														}}
													/>
												))}
											</div>
										)}
									</div>
								</motion.div>
							)}
						</AnimatePresence>

						{toolbar ? toolbar : !hideToolbar ? (
							<>
								<TableToolbar
									searchValue={searchValue}
									onSearchChange={onSearchChange}
									onSearch={onSearch}
									searchPlaceholder={labels.searchPlaceholder}
									isFiltersOpen={filtersOpen}
									onToggleFilters={hasFilters ? () => setFiltersOpen((v) => !v) : undefined}
									hasActiveFilters={hasActiveFilters}
									filterLabel={labels.filter}
									actions={actions}
								/>
								<AnimatePresence>
									{filtersOpen && hasFilters && (
										<TableFilters onApply={onApplyFilters} applyLabel={labels.apply}>
											{filters}
										</TableFilters>
									)}
								</AnimatePresence>
							</>
						) : null}
					</div>
				)}

				<div className="dt-scroll">
					<table className="dt-table" aria-busy={isLoading || undefined}>
						<thead>
							<tr>
								{allColumns.map((col) => (
									<th
										key={col.key}
										scope="col"
										className={cn("dt-th", col.headClassName, ACTION_KEYS.has(col.key) && "dt-sticky-end")}
									>
										<ColumnHeader col={col} />
									</th>
								))}
							</tr>
						</thead>

						<tbody>
							{isLoading ? (
								<TableSkeleton columns={allColumns} rows={Number(pagination?.per_page ?? 8)} />
							) : data.length === 0 ? (
								<tr>
									<td colSpan={allColumns.length} className="dt-td" style={{ maxWidth: "none", borderBottom: 0 }}>
										<div className="dt-empty">
											<span className="dt-empty__icon">
												<Inbox size={22} strokeWidth={1.8} />
											</span>
											<p className="dt-empty__title">{emptyState ?? labels.emptyTitle ?? "No results found"}</p>
											<p className="dt-empty__sub">{labels.emptySubtitle ?? "Try adjusting your search or filters"}</p>
										</div>
									</td>
								</tr>
							) : (
								data.map((row, i) => {
									const key = rowKey(row, i);
									const isSelected = selectable && selected.has(key);
									return (
										<tr
											key={key}
											className={cn("dt-row", isSelected && "is-selected")}
											style={{ "--dt-i": Math.min(i, 12) }}
											aria-selected={selectable ? isSelected : undefined}
										>
											{allColumns.map((col) => {
												const cls = cn("dt-td", col.className, ACTION_KEYS.has(col.key) && "dt-sticky-end");
												if (col.type === "img") {
													return (
														<td key={col.key} className={cls}>
															<ImgCell src={row[col.key]} alt={col.header ?? ""} onOpen={openImage} />
														</td>
													);
												}
												if (col.type === "imgs") {
													return (
														<td key={col.key} className={cls}>
															<ImgsCell images={normalizeImages(row[col.key], col.header ?? "")} onOpen={openImage} />
														</td>
													);
												}
												return (
													<td key={col.key} className={cls}>
														{typeof col.cell === "function" ? col.cell(row, i, helpers) : (
															<span className="block max-w-[220px] truncate" title={row[col.key] != null ? String(row[col.key]) : undefined}>
																{row[col.key]}
															</span>
														)}
													</td>
												);
											})}
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>

				{pagination && (
					<TablePagination
						pagination={pagination}
						onPageChange={onPageChange}
						isLoading={isLoading}
						pageParamName={pageParamName}
						limitParamName={limitParamName}
						perPageOptions={perPageOptions}
					/>
				)}
			</div>

			<ImageModal open={imgModal.open} src={imgModal.src} alt={imgModal.alt} onClose={closeImage} labels={labels} />
		</div>
	);
}
