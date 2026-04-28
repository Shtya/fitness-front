"use client";

import React, {
	memo, useState, useCallback, useMemo, useEffect, useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import {
	Table as ShadTable,
	TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
	Search, Download, ChevronDown,
	ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
	Image as ImageIcon, X, Maximize2, SlidersHorizontal,
	Package, Filter, ArrowUpDown, ZoomIn, ZoomOut,
} from "lucide-react";
import { baseImg } from "@/utils/axios";
import { useTranslations } from "next-intl";

// ─── constants ────────────────────────────────────────────────────────────────
const ACTION_KEYS = new Set(["actions", "options"]);
const PER_PAGE_OPTS = [10, 20, 30, 50];

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

function useIsRTL() {
	const [rtl, setRtl] = useState(false);
	useEffect(() => { setRtl(document.documentElement.dir === "rtl"); }, []);
	return rtl;
}

// ─── FilterField ──────────────────────────────────────────────────────────────
export function FilterField({ label, children, className }) {
	return (
		<div className={cn("flex flex-col gap-1.5", className)}>
			{label && (
				<span
					className="text-[10px] font-bold uppercase tracking-widest"
					style={{ color: "var(--color-primary-500)" }}
				>
					{label}
				</span>
			)}
			{children}
		</div>
	);
}

// ─── Search Input ─────────────────────────────────────────────────────────────
const SearchInput = memo(function SearchInput({ value, onChange, onKeyDown, placeholder }) {
	const [focused, setFocused] = useState(false);
	const ref = useRef(null);
	const active = focused || (value && value.length > 0);

	return (
		<div
			onClick={() => ref.current?.focus()}
			className="relative flex items-center h-10 rounded-xl cursor-text bg-white w-full max-w-[340px] transition-all duration-300"
			style={{
				border: focused
					? "1.5px solid var(--color-primary-400)"
					: "1.5px solid #e2e8f0",
				boxShadow: focused
					? "0 0 0 4px color-mix(in oklab, var(--color-primary-400) 12%, transparent), 0 2px 8px color-mix(in oklab, var(--color-primary-400) 15%, transparent)"
					: "0 1px 3px rgba(0,0,0,0.04)",
			}}
		>
			{/* animated search icon bg */}
			<div
				className="absolute start-2.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300"
				style={{
					background: focused
						? "color-mix(in oklab, var(--color-primary-500) 12%, transparent)"
						: "transparent",
				}}
			>
				<Search
					size={13}
					className="transition-colors duration-300"
					style={{ color: focused ? "var(--color-primary-500)" : "#94a3b8" }}
				/>
			</div>

			<label
				className={cn(
					"absolute start-10 pointer-events-none select-none font-medium transition-all duration-200",
					active
						? "top-0 -translate-y-1/2 text-[9px] px-1.5 rounded-md font-bold"
						: "top-1/2 -translate-y-1/2 text-sm"
				)}
				style={
					active
						? { background: "white", color: "var(--color-primary-600)" }
						: { color: "#94a3b8" }
				}
			>
				{placeholder}
			</label>

			<input
				ref={ref}
				value={value}
				onChange={(e) => onChange?.(e.target.value)}
				onKeyDown={onKeyDown}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				placeholder=""
				className="absolute inset-0 w-full h-full bg-transparent outline-none ps-10 pe-9 text-sm text-slate-800 rounded-xl"
			/>

			<AnimatePresence>
				{value && (
					<motion.button
						initial={{ opacity: 0, scale: 0.6, rotate: -45 }}
						animate={{ opacity: 1, scale: 1, rotate: 0 }}
						exit={{ opacity: 0, scale: 0.6, rotate: 45 }}
						transition={{ type: "spring", stiffness: 400, damping: 25 }}
						type="button"
						onClick={(e) => { e.stopPropagation(); onChange?.(""); }}
						className="absolute end-2.5 w-5 h-5 rounded-lg flex items-center justify-center transition-all hover:bg-rose-50 hover:text-rose-400"
						style={{ color: "#94a3b8" }}
					>
						<X size={11} />
					</motion.button>
				)}
			</AnimatePresence>
		</div>
	);
});

// ─── Toolbar Button ───────────────────────────────────────────────────────────
const ToolbarButton = memo(function ToolbarButton({ action }) {
	const styleMap = {
		primary: {
			background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))",
			borderColor: "transparent",
			color: "white",
			boxShadow: "0 4px 16px color-mix(in oklab, var(--color-primary-500) 30%, transparent)",
		},
		secondary: {
			background: "linear-gradient(135deg, var(--color-secondary-500), var(--color-secondary-700))",
			borderColor: "transparent",
			color: "white",
			boxShadow: "0 4px 16px color-mix(in oklab, var(--color-secondary-500) 30%, transparent)",
		},
		emerald: { background: "#059669", borderColor: "transparent", color: "white", boxShadow: "0 4px 12px rgba(5,150,105,0.3)" },
		rose: { background: "#e11d48", borderColor: "transparent", color: "white", boxShadow: "0 4px 12px rgba(225,29,72,0.3)" },
	};

	const style = styleMap[action.color] ?? { background: "white", borderColor: "#e2e8f0", color: "#475569" };

	return (
		<motion.button
			whileHover={{ scale: 1.02, y: -1.5 }}
			whileTap={{ scale: 0.96 }}
			onClick={action.onClick}
			type="button"
			disabled={action.disabled}
			className="relative h-10 px-4 rounded-xl border text-sm font-semibold flex items-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
			style={style}
		>
			{/* shimmer on hover */}
			{action.color && (
				<span
					className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
					style={{
						background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)",
						backgroundSize: "200% 100%",
					}}
				/>
			)}
			{/* top gloss */}
			<span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent rounded-t-xl pointer-events-none" />
			<span className="relative flex items-center gap-2">
				{action.icon}
				{action.label}
			</span>
		</motion.button>
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
		<div className="flex items-center gap-3 flex-wrap">
			<div className="flex-1 min-w-[240px]">
				<SearchInput
					value={searchValue}
					onChange={onSearchChange}
					onKeyDown={(e) => e.key === "Enter" && onSearch?.()}
					placeholder={searchPlaceholder}
				/>
			</div>

			<div className="flex items-center gap-2 flex-wrap ms-auto">
				{actions.map((action) => (
					<ToolbarButton key={action.key} action={action} />
				))}

				{onToggleFilters && (
					<motion.button
						whileHover={{ scale: 1.02, y: -1.5 }}
						whileTap={{ scale: 0.96 }}
						onClick={onToggleFilters}
						type="button"
						className="relative h-10 px-4 rounded-xl border text-sm font-semibold flex items-center gap-2 transition-all duration-200 overflow-hidden"
						style={
							isFiltersOpen
								? {
									background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))",
									borderColor: "transparent",
									color: "white",
									boxShadow: "0 4px 16px color-mix(in oklab, var(--color-primary-500) 35%, transparent)",
								}
								: {
									background: "white",
									borderColor: "#e2e8f0",
									color: "#475569",
									boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
								}
						}
					>
						{isFiltersOpen && (
							<span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent rounded-t-xl pointer-events-none" />
						)}
						<SlidersHorizontal size={13} />
						<span className="relative">{filterLabel}</span>

						{hasActiveFilters && !isFiltersOpen && (
							<motion.span
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								className="absolute -top-1.5 -end-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white ring-2 ring-white"
								style={{ background: "var(--color-secondary-500)" }}
							>
								✦
							</motion.span>
						)}
						<motion.span
							animate={{ rotate: isFiltersOpen ? 180 : 0 }}
							transition={{ duration: 0.25, ease: "easeInOut" }}
							className="flex"
						>
							<ChevronDown size={12} />
						</motion.span>
					</motion.button>
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
			transition={{ duration: 0.26, ease: "easeInOut" }}
		>
			<div
				className="mt-3 rounded-xl overflow-hidden"
				style={{
					border: "1.5px solid var(--color-primary-100)",
					background: "color-mix(in oklab, var(--color-primary-50) 50%, white)",
					boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8), 0 4px 16px color-mix(in oklab, var(--color-primary-200) 20%, transparent)",
				}}
			>
				<div
					className="h-[3px] w-full"
					style={{ background: "linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-via), var(--color-gradient-to))" }}
				/>
				<div className="p-4 flex items-end gap-4">
					<div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
						{children}
					</div>
					{onApply && (
						<motion.button
							whileHover={{ scale: 1.02, y: -1 }}
							whileTap={{ scale: 0.96 }}
							onClick={onApply}
							type="button"
							className="relative h-10 px-4 rounded-xl text-white text-sm font-semibold flex items-center gap-2 flex-shrink-0 overflow-hidden"
							style={{
								background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))",
								boxShadow: "0 4px 16px color-mix(in oklab, var(--color-primary-500) 30%, transparent)",
							}}
						>
							<span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent rounded-t-xl pointer-events-none" />
							<Filter size={13} />
							<span className="relative">{applyLabel}</span>
						</motion.button>
					)}
				</div>
			</div>
		</motion.div>
	);
});

// ─── Pagination ───────────────────────────────────────────────────────────────
export const TablePagination = memo(function TablePagination({
	pagination, onPageChange, isLoading = false,
	pageParamName = "page", limitParamName = "limit",
	perPageOptions = PER_PAGE_OPTS,
}) {
	const t = useTranslations("table.pagination");

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
		const start = Math.max(2, cur - 2);
		const end = Math.min(tot - 1, cur + 2);
		if (start > 2) items.push("…");
		for (let p = start; p <= end; p++) items.push(p);
		if (end < tot - 1) items.push("…");
		items.push(tot);
		return items;
	}, [totalPages, currentPage]);

	const goTo = (p) => {
		if (!onPageChange) return;
		const clamped = Math.min(Math.max(1, p), totalPages);
		onPageChange({ page: clamped, per_page: perPage, [pageParamName]: clamped, [limitParamName]: perPage });
	};

	const changeLimit = (lim) => {
		if (!onPageChange) return;
		onPageChange({ page: 1, per_page: lim, [pageParamName]: 1, [limitParamName]: lim });
	};

	const from = pagination?.total_records ? (currentPage - 1) * perPage + 1 : 0;
	const to = Math.min(currentPage * perPage, pagination?.total_records ?? 0);
	const total = pagination?.total_records ?? 0;

	const NavBtn = ({ onClick, disabled, children, title }) => (
		<motion.button
			type="button"
			whileHover={!disabled ? { scale: 1.1, y: -1 } : {}}
			whileTap={!disabled ? { scale: 0.9 } : {}}
			onClick={onClick}
			disabled={isLoading || disabled}
			title={title}
			className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
			style={{
				background: "white",
				borderColor: "#e2e8f0",
				color: "#64748b",
				boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
			}}
			onMouseEnter={(e) => {
				if (!disabled && !isLoading) {
					e.currentTarget.style.borderColor = "var(--color-primary-300)";
					e.currentTarget.style.color = "var(--color-primary-600)";
					e.currentTarget.style.background = "var(--color-primary-50)";
					e.currentTarget.style.boxShadow = "0 2px 8px color-mix(in oklab, var(--color-primary-400) 20%, transparent)";
				}
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.borderColor = "#e2e8f0";
				e.currentTarget.style.color = "#64748b";
				e.currentTarget.style.background = "white";
				e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
			}}
		>
			{children}
		</motion.button>
	);

	return (
		<div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4">
			{/* range */}
			<p className="text-xs text-slate-500 flex-shrink-0 flex items-center gap-1.5">
				<span
					className="w-1.5 h-1.5 rounded-full"
					style={{ background: "var(--color-primary-400)" }}
				/>
				{t("showing")}{" "}
				<span className="font-bold text-slate-700 tabular-nums">{from}–{to}</span>
				{" "}{t("of")}{" "}
				<span
					className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-black tabular-nums"
					style={{
						background: "var(--color-primary-50)",
						border: "1px solid var(--color-primary-200)",
						color: "var(--color-primary-600)",
					}}
				>
					{total}
				</span>
				{" "}{t("records")}
			</p>

			{/* pages */}
			<div className="flex items-center gap-1">
				<NavBtn onClick={() => goTo(1)} disabled={currentPage <= 1} title={t("firstPage")}>
					<ChevronsRight size={13} />
				</NavBtn>
				<NavBtn onClick={() => goTo(currentPage - 1)} disabled={currentPage <= 1} title={t("prevPage")}>
					<ChevronRight size={13} />
				</NavBtn>

				<div className="flex items-center gap-1 mx-1">
					{pageItems.map((p, idx) =>
						p === "…" ? (
							<span key={`d-${idx}`} className="w-7 text-center text-slate-300 text-xs select-none">···</span>
						) : (
							<motion.button
								key={p}
								type="button"
								whileHover={p !== currentPage ? { scale: 1.1, y: -1 } : {}}
								whileTap={{ scale: 0.9 }}
								onClick={() => goTo(p)}
								disabled={isLoading}
								className="relative w-9 h-9 rounded-xl text-xs font-bold border transition-all duration-150 overflow-hidden"
								style={
									p === currentPage
										? {
											background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))",
											borderColor: "transparent",
											color: "white",
											boxShadow: "0 4px 14px color-mix(in oklab, var(--color-primary-500) 45%, transparent)",
										}
										: {
											background: "white",
											borderColor: "#e2e8f0",
											color: "#64748b",
											boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
										}
								}
							>
								{p === currentPage && (
									<>
										<span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent rounded-t-xl" />
										<motion.span
											className="absolute inset-0 rounded-xl"
											animate={{ opacity: [0.5, 0, 0.5] }}
											transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
											style={{ boxShadow: "0 0 12px color-mix(in oklab, var(--color-primary-400) 40%, transparent)" }}
										/>
									</>
								)}
								<span className="relative">{p}</span>
							</motion.button>
						)
					)}
				</div>

				<NavBtn onClick={() => goTo(currentPage + 1)} disabled={currentPage >= totalPages} title={t("nextPage")}>
					<ChevronLeft size={13} />
				</NavBtn>
				<NavBtn onClick={() => goTo(totalPages)} disabled={currentPage >= totalPages} title={t("lastPage")}>
					<ChevronsLeft size={13} />
				</NavBtn>
			</div>

			{/* per-page */}
			<div className="flex items-center gap-2 flex-shrink-0">
				<span className="text-xs hidden sm:block" style={{ color: "#94a3b8" }}>{t("perPage")}</span>
				<div
					className="flex items-center gap-0.5 p-1 rounded-xl"
					style={{
						border: "1.5px solid #e2e8f0",
						background: "white",
						boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
					}}
				>
					{perPageOptions.map((lim) => (
						<motion.button
							key={lim}
							type="button"
							whileHover={perPage !== lim ? { scale: 1.05 } : {}}
							whileTap={{ scale: 0.95 }}
							onClick={() => changeLimit(lim)}
							disabled={isLoading}
							className="relative w-9 h-7 rounded-lg text-[11px] font-bold transition-all duration-200 overflow-hidden"
							style={
								perPage === lim
									? {
										background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))",
										color: "white",
										boxShadow: "0 2px 8px color-mix(in oklab, var(--color-primary-500) 35%, transparent)",
									}
									: { color: "#94a3b8" }
							}
						>
							{perPage === lim && (
								<span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-lg" />
							)}
							<span className="relative">{lim}</span>
						</motion.button>
					))}
				</div>
			</div>
		</div>
	);
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const TableSkeleton = memo(function TableSkeleton({ columns, rows = 6, compact }) {
	return (
		<>
			{Array.from({ length: rows }).map((_, ri) => (
				<TableRow
					key={ri}
					className="border-b"
					style={{ borderColor: "var(--color-primary-50)" }}
				>
					{columns.map((col, ci) => (
						<TableCell key={ci} className={cn("!px-5", compact ? "py-2.5" : "py-4")}>
							<motion.div
								className="rounded-lg"
								animate={{ opacity: [0.4, 0.8, 0.4] }}
								transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: (ri * 0.07 + ci * 0.05) % 0.5 }}
								style={{
									height: 14,
									width: col.type === "img" ? 40 : `${45 + ((ri * 13 + ci * 7) % 40)}%`,
									background: "linear-gradient(90deg, var(--color-primary-100), color-mix(in oklab, var(--color-primary-100) 60%, white), var(--color-primary-100))",
									backgroundSize: "200% 100%",
								}}
							/>
						</TableCell>
					))}
				</TableRow>
			))}
		</>
	);
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
		<span
			className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-black"
			style={{
				background: "var(--color-primary-50)",
				color: "var(--color-primary-400)",
				border: "1px solid var(--color-primary-100)",
			}}
		>
			{index}
		</span>
	);
}

// ─── Column header with sort animation ───────────────────────────────────────
const ColumnHeader = memo(function ColumnHeader({ col, idx }) {
	return (
		<motion.span
			initial={{ opacity: 0, y: -6 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: idx * 0.03, ease: [0.16, 1, 0.3, 1] }}
			className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.1em] group/head"
			style={{ color: "var(--color-primary-400)" }}
		>
			{col.header}
			{col.sortable && (
				<motion.span
					whileHover={{ scale: 1.2, color: "var(--color-primary-500)" }}
					className="opacity-50 group-hover/head:opacity-100 transition-opacity"
				>
					<ArrowUpDown size={10} style={{ color: "var(--color-primary-300)" }} />
				</motion.span>
			)}
		</motion.span>
	);
});

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
	title, subtitle, headerExtra,
	showRowIndex = false,
}) {
	const isRTL = useIsRTL();
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [imgModal, setImgModal] = useState({ open: false, src: "", alt: "" });
	const [hoveredRow, setHoveredRow] = useState(null);

	const openImage = useCallback((src, alt = "") => setImgModal({ open: true, src, alt }), []);
	const closeImage = useCallback(() => setImgModal({ open: false, src: "", alt: "" }), []);
	const helpers = useMemo(() => ({ openImage }), [openImage]);

	const hasFilters = Boolean(filters);
	const stickyEnd = isRTL ? "left-0" : "right-0";
	const stickyShadow = isRTL
		? "shadow-[8px_0_16px_-10px_rgba(99,102,241,0.14)]"
		: "shadow-[-8px_0_16px_-10px_rgba(99,102,241,0.14)]";

	const allColumns = useMemo(() => {
		if (!showRowIndex) return columns;
		return [
			{ key: "__idx__", header: "#", headClassName: "w-10", cell: (_, i) => <RowIndexBadge index={i + 1} /> },
			...columns,
		];
	}, [columns, showRowIndex]);

	return (
		<div className={cn("w-full ", className)}>
			<motion.div
				initial={{ opacity: 0, y: 16 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
				className="relative overflow-hidden"
				style={{
					background: "white",
					border: "1.5px solid var(--color-primary-100)",
					boxShadow: "0 1px 4px color-mix(in oklab, var(--color-primary-500) 5%, transparent), 0 12px 40px color-mix(in oklab, var(--color-primary-500) 8%, transparent)",
				}}
			>
				{/* top gradient line */}
				<div
					className="h-[3px] w-full"
					style={{ background: "linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-via), var(--color-gradient-to))" }}
				/>

				{/* ── Header ──────────────────────────────────── */}
				<div
					className="px-5 pt-4 pb-4"
					style={{ borderBottom: "1px solid var(--color-primary-50)" }}
				>
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
				</div>

				{/* ── Table ───────────────────────────────────── */}
				<div className="relative overflow-x-auto">
					<ShadTable>
						<TableHeader
							className="border-b"
							style={{
								background: "color-mix(in oklab, var(--color-primary-50) 65%, white)",
								borderColor: "var(--color-primary-100)",
							}}
						>
							<TableRow className="hover:bg-transparent">
								{allColumns.map((col, idx) => (
									<TableHead
										key={col.key}
										className={cn(
											"!px-5 whitespace-nowrap ltr:text-left rtl:text-right",
											compact ? "py-2.5" : "py-3.5",
											col.headClassName,
											ACTION_KEYS.has(col.key) && cn("sticky z-30", stickyEnd, stickyShadow),
										)}
										style={
											ACTION_KEYS.has(col.key)
												? { background: "color-mix(in oklab, var(--color-primary-50) 65%, white)" }
												: {}
										}
									>
										<ColumnHeader col={col} idx={idx} />
									</TableHead>
								))}
							</TableRow>
						</TableHeader>

						<TableBody>
							<AnimatePresence initial={false}>
								{isLoading ? (
									<TableSkeleton
										key="skel"
										columns={allColumns}
										rows={Number(pagination?.per_page ?? 10)}
										compact={compact}
									/>
								) : data.length === 0 ? (
									<TableRow key="empty">
										<TableCell colSpan={allColumns.length} className="py-20">
											<motion.div
												initial={{ opacity: 0, scale: 0.88 }}
												animate={{ opacity: 1, scale: 1 }}
												transition={{ type: "spring", stiffness: 280, damping: 24 }}
												className="flex flex-col items-center gap-5"
											>
												<div className="relative">
													<div
														className="absolute inset-0 blur-3xl rounded-full scale-[3]"
														style={{ background: "color-mix(in oklab, var(--color-primary-200) 30%, transparent)" }}
													/>
													<motion.div
														animate={{ rotate: [0, -6, 6, -3, 3, 0] }}
														transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
														className="relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm"
														style={{
															background: "linear-gradient(135deg, var(--color-primary-50), white)",
															border: "1.5px solid var(--color-primary-200)",
															boxShadow: "0 4px 16px color-mix(in oklab, var(--color-primary-300) 20%, transparent)",
														}}
													>
														<Package size={24} style={{ color: "var(--color-primary-300)" }} />
													</motion.div>
												</div>
												<div className="text-center space-y-1.5">
													<p className="text-sm font-bold text-slate-600">
														{emptyState ?? labels.emptyTitle ?? "No results found"}
													</p>
													<p className="text-xs" style={{ color: "var(--color-primary-400)" }}>
														{labels.emptySubtitle ?? "Try adjusting your search or filters"}
													</p>
												</div>
											</motion.div>
										</TableCell>
									</TableRow>
								) : (
									data.map((row, i) => {
										const key = rowKey(row, i);
										const isHovered = hoveredRow === key;
										return (
											<motion.tr
												key={key}
												initial={{ opacity: 0, x: isRTL ? 6 : -6 }}
												animate={{ opacity: 1, x: 0 }}
												exit={{ opacity: 0, x: isRTL ? -6 : 6 }}
												transition={{ delay: Math.min(i * 0.018, 0.22), ease: [0.16, 1, 0.3, 1] }}
												className={cn(
													"group border-b relative transition-colors duration-150",
													striped && i % 2 === 1 && "bg-[color-mix(in_oklab,var(--color-primary-50)_35%,white)]",
												)}
												style={{
													borderColor: "var(--color-primary-50)",
													boxShadow: hoverable && isHovered
														? `inset ${isRTL ? "-3px" : "3px"} 0 0 0 var(--color-primary-500)`
														: undefined,
												}}
												onMouseEnter={() => hoverable && setHoveredRow(key)}
												onMouseLeave={() => hoverable && setHoveredRow(null)}
											>
												{allColumns.map((col) => {
													const cellStyle = isHovered && hoverable
														? { background: "color-mix(in oklab, var(--color-primary-50) 45%, white)" }
														: {};

													if (col.type === "img") return (
														<TableCell
															key={col.key}
															className={cn("!px-5", compact ? "py-2.5" : "py-3.5", col.className)}
															style={cellStyle}
														>
															<ImgCell src={row[col.key]} alt={col.header ?? ""} onOpen={openImage} />
														</TableCell>
													);

													if (col.type === "imgs") {
														const imgs = normalizeImages(row[col.key], col.header ?? "");
														return (
															<TableCell
																key={col.key}
																className={cn("!px-5", compact ? "py-2.5" : "py-3.5", col.className)}
																style={cellStyle}
															>
																<ImgsCell images={imgs} onOpen={openImage} />
															</TableCell>
														);
													}

													return (
														<TableCell
															key={col.key}
															className={cn(
																"!px-5 text-sm whitespace-nowrap ltr:text-left rtl:text-right transition-colors duration-150",
																compact ? "py-2.5" : "py-3.5",
																col.className,
																ACTION_KEYS.has(col.key) && cn("sticky z-20", stickyEnd, stickyShadow),
															)}
															style={
																ACTION_KEYS.has(col.key)
																	? {
																		background: isHovered
																			? "color-mix(in oklab, var(--color-primary-50) 45%, white)"
																			: "rgba(255,255,255,0.98)",
																	}
																	: cellStyle
															}
														>
															{typeof col.cell === "function" ? col.cell(row, i, helpers) : row[col.key]}
														</TableCell>
													);
												})}
											</motion.tr>
										);
									})
								)}
							</AnimatePresence>
						</TableBody>
					</ShadTable>
				</div>

				{/* ── Pagination ──────────────────────────────── */}
				{pagination && (
					<>
						<div
							className="h-px"
							style={{ background: "linear-gradient(90deg, transparent, var(--color-primary-100), transparent)" }}
						/>
						<TablePagination
							pagination={pagination}
							onPageChange={onPageChange}
							isLoading={isLoading}
							pageParamName={pageParamName}
							limitParamName={limitParamName}
							perPageOptions={perPageOptions}
						/>
					</>
				)}

				{/* subtle inner border glow on bottom */}
				<div
					className="h-[2px] w-full"
					style={{ background: "linear-gradient(90deg, transparent, color-mix(in oklab, var(--color-primary-100) 80%, transparent), transparent)" }}
				/>
			</motion.div>

			<ImageModal
				open={imgModal.open}
				src={imgModal.src}
				alt={imgModal.alt}
				onClose={closeImage}
				labels={labels}
			/>
		</div>
	);
}