"use client";

import React, {
	useState, useRef, useEffect, useLayoutEffect,
	useCallback, useId,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import { MoreHorizontal, Loader2, AlertTriangle, Check, X } from "lucide-react";
import { useTranslations } from "next-intl";

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────
const VARIANTS = {
	purple: {
		base: "border-purple-200 bg-purple-50 text-purple-600 dark:border-purple-800/60 dark:bg-purple-950/20 dark:text-purple-400",
		hover: "hover:bg-purple-500 hover:border-purple-500 hover:text-white hover:shadow-lg",
		active: "bg-purple-500 border-purple-500 text-white shadow-lg",
		ring: "focus-visible:ring-purple-400",
		tooltip: { bg: "#7c3aed", shadow: "rgba(124,58,237,0.35)" },
		confirm: { bg: "#7c3aed", glow: "rgba(124,58,237,0.25)" },
	},
	blue: {
		base: "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-800/60 dark:bg-blue-950/20 dark:text-blue-400",
		hover: "hover:bg-blue-500 hover:border-blue-500 hover:text-white hover:shadow-lg",
		active: "bg-blue-500 border-blue-500 text-white shadow-lg",
		ring: "focus-visible:ring-blue-400",
		tooltip: { bg: "#2563eb", shadow: "rgba(37,99,235,0.35)" },
		confirm: { bg: "#2563eb", glow: "rgba(37,99,235,0.25)" },
	},
	red: {
		base: "border-red-200 bg-red-50 text-red-600 dark:border-red-800/60 dark:bg-red-950/20 dark:text-red-400",
		hover: "hover:bg-red-500 hover:border-red-500 hover:text-white hover:shadow-lg",
		active: "bg-red-500 border-red-500 text-white shadow-lg",
		ring: "focus-visible:ring-red-400",
		tooltip: { bg: "#dc2626", shadow: "rgba(220,38,38,0.35)" },
		confirm: { bg: "#dc2626", glow: "rgba(220,38,38,0.25)" },
	},
	emerald: {
		base: "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800/60 dark:bg-emerald-950/20 dark:text-emerald-400",
		hover: "hover:bg-emerald-500 hover:border-emerald-500 hover:text-white hover:shadow-lg",
		active: "bg-emerald-500 border-emerald-500 text-white shadow-lg",
		ring: "focus-visible:ring-emerald-400",
		tooltip: { bg: "#059669", shadow: "rgba(5,150,105,0.35)" },
		confirm: { bg: "#059669", glow: "rgba(5,150,105,0.25)" },
	},
	orange: {
		base: "border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-800/60 dark:bg-orange-950/20 dark:text-orange-400",
		hover: "hover:bg-orange-500 hover:border-orange-500 hover:text-white hover:shadow-lg",
		active: "bg-orange-500 border-orange-500 text-white shadow-lg",
		ring: "focus-visible:ring-orange-400",
		tooltip: { bg: "#ea580c", shadow: "rgba(234,88,12,0.35)" },
		confirm: { bg: "#ea580c", glow: "rgba(234,88,12,0.25)" },
	},
	amber: {
		base: "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-800/60 dark:bg-amber-950/20 dark:text-amber-400",
		hover: "hover:bg-amber-500 hover:border-amber-500 hover:text-white hover:shadow-lg",
		active: "bg-amber-500 border-amber-500 text-white shadow-lg",
		ring: "focus-visible:ring-amber-400",
		tooltip: { bg: "#d97706", shadow: "rgba(217,119,6,0.35)" },
		confirm: { bg: "#d97706", glow: "rgba(217,119,6,0.25)" },
	},
	slate: {
		base: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400",
		hover: "hover:bg-slate-600 hover:border-slate-600 hover:text-white hover:shadow-lg",
		active: "bg-slate-600 border-slate-600 text-white shadow-lg",
		ring: "focus-visible:ring-slate-400",
		tooltip: { bg: "#475569", shadow: "rgba(71,85,105,0.35)" },
		confirm: { bg: "#475569", glow: "rgba(71,85,105,0.25)" },
	},
};

const SIZE_MAP = {
	sm: { btn: "w-7 h-7", icon: 12, labelText: "text-[10px]", radius: "rounded-lg" },
	md: { btn: "w-8 h-8", icon: 14, labelText: "text-[11px]", radius: "rounded-lg" },
	lg: { btn: "w-10 h-10", icon: 17, labelText: "text-xs", radius: "rounded-lg" },
};

// ─────────────────────────────────────────────────────────────
// PORTAL TOOLTIP  (upgraded: smarter layout, no flicker)
// ─────────────────────────────────────────────────────────────
function Tooltip({ children, label, color }) {
	const [visible, setVisible] = useState(false);
	const [mounted, setMounted] = useState(false);
	const [pos, setPos] = useState({ left: 0, top: 0, arrowLeft: 0, placement: "top", dir: "ltr" });
	const triggerRef = useRef(null);
	const tooltipRef = useRef(null);

	useEffect(() => setMounted(true), []);

	const compute = useCallback(() => {
		const tr = triggerRef.current;
		const tt = tooltipRef.current;
		if (!tr || !tt) return;
		const trRect = tr.getBoundingClientRect();
		const ttRect = tt.getBoundingClientRect();
		const GAP = 9, PAD = 8, ARR = 8;
		const dir = tr.closest("[dir]")?.getAttribute("dir") || document.documentElement.getAttribute("dir") || "ltr";
		const cx = trRect.left + trRect.width / 2;
		let left = Math.max(PAD, Math.min(cx - ttRect.width / 2, window.innerWidth - ttRect.width - PAD));
		let top = trRect.top - ttRect.height - GAP;
		let placement = "top";
		if (top < PAD) { top = trRect.bottom + GAP; placement = "bottom"; }
		const rawArrow = cx - left;
		const arrowLeft = Math.max(ARR + 4, Math.min(ttRect.width - ARR - 4, rawArrow));
		setPos({ left, top, arrowLeft, placement, dir: dir === "rtl" ? "rtl" : "ltr" });
	}, []);

	useLayoutEffect(() => { if (visible) compute(); }, [visible, label, compute]);
	useEffect(() => {
		if (!visible) return;
		window.addEventListener("resize", compute);
		window.addEventListener("scroll", compute, true);
		return () => { window.removeEventListener("resize", compute); window.removeEventListener("scroll", compute, true); };
	}, [visible, compute]);

	const bg = color?.bg ?? "#0f172a";
	const shd = color?.shadow ?? "rgba(0,0,0,0.25)";

	return (
		<>
			<span ref={triggerRef} onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}
				onFocus={() => setVisible(true)} onBlur={() => setVisible(false)} className="inline-flex">
				{children}
			</span>
			{mounted && createPortal(
				<AnimatePresence>
					{visible && (
						<motion.div key="tt" ref={tooltipRef}
							initial={{ opacity: 0, y: pos.placement === "top" ? 5 : -5, scale: 0.94 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: pos.placement === "top" ? 5 : -5, scale: 0.94 }}
							transition={{ duration: 0.13, ease: "easeOut" }}
							dir={pos.dir}
							style={{ position: "fixed", left: pos.left, top: pos.top, zIndex: 99999, pointerEvents: "none" }}
						>
							<div className="relative px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap text-white"
								style={{ background: bg, boxShadow: `0 4px 16px ${shd}, 0 1px 4px rgba(0,0,0,0.1)`, letterSpacing: "0.015em", direction: pos.dir }}>
								{label}
								<span style={{
									position: "absolute", left: pos.arrowLeft, transform: "translateX(-50%)",
									width: 0, height: 0, display: "block",
									...(pos.placement === "top"
										? { bottom: -4, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: `4px solid ${bg}` }
										: { top: -4, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderBottom: `4px solid ${bg}` }),
								}} />
							</div>
						</motion.div>
					)}
				</AnimatePresence>,
				document.body
			)}
		</>
	);
}

// ─────────────────────────────────────────────────────────────
// INLINE CONFIRMATION POPOVER
// ─────────────────────────────────────────────────────────────
function ConfirmPopover({ triggerRef, open, onConfirm, onCancel, message, confirmColor }) {
	const t = useTranslations("ActionButtons");
	const [mounted, setMounted] = useState(false);
	const [pos, setPos] = useState({ left: 0, top: 0 });
	const popRef = useRef(null);

	useEffect(() => setMounted(true), []);

	const compute = useCallback(() => {
		const tr = triggerRef.current;
		if (!tr) return;
		const rect = tr.getBoundingClientRect();
		const popW = 240;
		let left = rect.left + rect.width / 2 - popW / 2;
		left = Math.max(8, Math.min(left, window.innerWidth - popW - 8));
		const top = rect.bottom + 10;
		setPos({ left, top });
	}, [triggerRef]);

	useLayoutEffect(() => { if (open) compute(); }, [open, compute]);

	// close on outside click
	useEffect(() => {
		if (!open) return;
		const handler = (e) => {
			if (popRef.current && !popRef.current.contains(e.target) &&
				triggerRef.current && !triggerRef.current.contains(e.target)) {
				onCancel();
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [open, onCancel, triggerRef]);

	const bg = confirmColor?.bg ?? "#dc2626";
	const glow = confirmColor?.glow ?? "rgba(220,38,38,0.2)";

	if (!mounted) return null;

	return createPortal(
		<AnimatePresence>
			{open && (
				<motion.div ref={popRef}
					initial={{ opacity: 0, y: -6, scale: 0.96 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					exit={{ opacity: 0, y: -6, scale: 0.96 }}
					transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
					style={{ position: "fixed", left: pos.left, top: pos.top, zIndex: 99998, width: 240 }}
				>
					{/* Arrow */}
					<div className="absolute -top-[7px] left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 rounded-sm"
						style={{ background: "#fff", boxShadow: "-1px -1px 3px rgba(0,0,0,0.07)" }} />

					<div className="relative rounded-lg bg-white border border-slate-200/80 overflow-hidden"
						style={{ boxShadow: `0 12px 40px rgba(15,23,42,0.14), 0 2px 8px rgba(15,23,42,0.06), 0 0 0 1px rgba(15,23,42,0.04)` }}>
						{/* Top accent strip */}
						<div className="h-0.5 w-full" style={{ background: bg }} />

						<div className="px-4 py-3.5">
							<div className="flex items-start gap-2.5 mb-3.5">
								<div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
									style={{ background: `${glow}`, border: `1px solid ${bg}25` }}>
									<AlertTriangle size={13} style={{ color: bg }} />
								</div>
								<p className="text-[12px] font-semibold leading-snug text-slate-700">
									{message ?? t("confirm.defaultMessage")}
								</p>
							</div>

							<div className="flex gap-2">
								{/* Cancel */}
								<motion.button type="button" onClick={onCancel}
									whileTap={{ scale: 0.95 }}
									className="flex-1 h-7 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 hover:bg-slate-100 transition-colors">
									{t("confirm.cancel")}
								</motion.button>
								{/* Confirm */}
								<motion.button type="button" onClick={onConfirm}
									whileTap={{ scale: 0.95 }}
									className="flex-1 h-7 rounded-lg text-[11px] font-bold text-white transition-all hover:opacity-90"
									style={{ background: bg, boxShadow: `0 3px 10px ${glow}` }}>
									{t("confirm.confirm")}
								</motion.button>
							</div>
						</div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>,
		document.body
	);
}

// ─────────────────────────────────────────────────────────────
// OVERFLOW "MORE" DROPDOWN MENU
// ─────────────────────────────────────────────────────────────
function OverflowMenu({ actions, row, triggerRef, open, onClose }) {
	const [mounted, setMounted] = useState(false);
	const [pos, setPos] = useState({ left: 0, top: 0 });
	const menuRef = useRef(null);

	useEffect(() => setMounted(true), []);

	const compute = useCallback(() => {
		const tr = triggerRef.current;
		if (!tr) return;
		const rect = tr.getBoundingClientRect();
		const menuW = 200;
		let left = rect.right - menuW;
		left = Math.max(8, Math.min(left, window.innerWidth - menuW - 8));
		const top = rect.bottom + 6;
		setPos({ left, top });
	}, [triggerRef]);

	useLayoutEffect(() => { if (open) compute(); }, [open, compute]);

	useEffect(() => {
		if (!open) return;
		const handler = (e) => {
			if (menuRef.current && !menuRef.current.contains(e.target) &&
				triggerRef.current && !triggerRef.current.contains(e.target)) onClose();
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [open, onClose, triggerRef]);

	if (!mounted) return null;

	return createPortal(
		<AnimatePresence>
			{open && (
				<motion.div ref={menuRef}
					initial={{ opacity: 0, y: -8, scale: 0.95 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					exit={{ opacity: 0, y: -8, scale: 0.95 }}
					transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
					style={{ position: "fixed", left: pos.left, top: pos.top, zIndex: 99998, width: 200 }}
				>
					<div className="rounded-lg bg-white border border-slate-200/80 overflow-hidden py-1.5"
						style={{ boxShadow: "0 12px 40px rgba(15,23,42,0.14), 0 2px 8px rgba(15,23,42,0.06)" }}>
						{actions.map((action, i) => {
							const v = VARIANTS[action.variant || "slate"];
							// separator
							if (action.separator) {
								return <div key={i} className="my-1 mx-3 border-t border-slate-100" />;
							}
							return (
								<motion.button key={i} type="button"
									whileHover={{ x: 2 }}
									transition={{ duration: 0.12 }}
									disabled={action.disabled}
									onClick={(e) => { e.stopPropagation(); action.onClick?.(row, e); onClose(); }}
									className={cn(
										"w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-[12px] font-semibold transition-colors",
										action.disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-slate-50 cursor-pointer",
									)}
									style={{ color: v.tooltip.bg }}
								>
									{action.icon && (
										<span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
											style={{ background: `${v.tooltip.bg}14` }}>
											{React.isValidElement(action.icon) ? React.cloneElement(action.icon, { size: 12 }) : action.icon}
										</span>
									)}
									<span className="text-slate-700">{action.tooltip || action.label}</span>
									{action.badge && (
										<span className="ml-auto px-1.5 py-0.5 rounded-lg text-[10px] font-bold"
											style={{ background: `${v.tooltip.bg}14`, color: v.tooltip.bg }}>
											{action.badge}
										</span>
									)}
								</motion.button>
							);
						})}
					</div>
				</motion.div>
			)}
		</AnimatePresence>,
		document.body
	);
}

// ─────────────────────────────────────────────────────────────
// SINGLE ACTION BUTTON  (upgraded)
//
//  New props:
//   label        — show text label beside icon (pill style)
//   loading      — show spinner, blocks click
//   confirm      — { message?, enabled? } — show confirm popover before firing onClick
//   badge        — small count badge on top-right corner
//   active       — force active/pressed style
// ─────────────────────────────────────────────────────────────
export function ActionButton({
	icon,
	tooltip,
	label,
	onClick,
	variant = "slate",
	size = "md",
	disabled = false,
	hidden = false,
	loading = false,
	confirm: confirmOpts,
	badge,
	active = false,
	className,
}) {
	const [confirming, setConfirming] = useState(false);
	const [done, setDone] = useState(false);
	const btnRef = useRef(null);
	const t = useTranslations("ActionButtons");
	if (hidden) return null;

	const v = VARIANTS[variant] || VARIANTS.slate;
	const sz = SIZE_MAP[size] || SIZE_MAP.md;
	const isBlocked = disabled || loading;

	const handleClick = (e) => {
		e.stopPropagation();
		if (isBlocked) return;
		if (confirmOpts?.enabled !== false && confirmOpts) {
			setConfirming(true);
			return;
		}
		fireClick(e);
	};

	const fireClick = (e) => {
		onClick?.(e);
		// brief "done" flash
		setDone(true);
		setTimeout(() => setDone(false), 800);
	};

	const hasLabel = !!label;

	const btn = (
		<div className="relative inline-flex" ref={btnRef}>
			<motion.button
				type="button"
				onClick={handleClick}
				whileHover={isBlocked ? {} : { scale: hasLabel ? 1.02 : 1.09, y: -1 }}
				whileTap={isBlocked ? {} : { scale: 0.93 }}
				transition={{ type: "spring", stiffness: 420, damping: 20 }}
				className={cn(
					"relative border flex items-center justify-center gap-1.5 font-semibold",
					"transition-all duration-150 shadow-sm focus:outline-none focus-visible:ring-2",
					sz.radius,
					v.ring,
					hasLabel
						? cn("px-3 h-8", sz.labelText)  // pill with label
						: sz.btn,                         // square icon-only
					(active || done)
						? v.active
						: cn(v.base, !isBlocked && v.hover),
					isBlocked && "opacity-40 cursor-not-allowed",
					className,
				)}
			>
				{/* Spinner overlay */}
				<AnimatePresence mode="wait">
					{loading ? (
						<motion.span key="spin"
							initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.12 }}>
							<Loader2 size={sz.icon} className="animate-spin" />
						</motion.span>
					) : done ? (
						<motion.span key="done"
							initial={{ opacity: 0, scale: 0.5, rotate: -30 }}
							animate={{ opacity: 1, scale: 1, rotate: 0 }}
							exit={{ opacity: 0, scale: 0.5 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}>
							<Check size={sz.icon} />
						</motion.span>
					) : (
						<motion.span key="icon"
							initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.1 }}>
							{React.isValidElement(icon) ? React.cloneElement(icon, { size: sz.icon }) : icon}
						</motion.span>
					)}
				</AnimatePresence>

				{hasLabel && (
					<span className="leading-none whitespace-nowrap select-none">{label}</span>
				)}
			</motion.button>

			{/* Badge */}
			{badge != null && (
				<motion.span
					initial={{ scale: 0 }} animate={{ scale: 1 }}
					className="pointer-events-none absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full border-2 border-white
                     flex items-center justify-center text-[9px] font-black text-white px-0.5 z-10"
					style={{ background: v.tooltip.bg }}
				>
					{badge}
				</motion.span>
			)}

			{/* Confirmation popover */}
			{confirmOpts && (
				<ConfirmPopover
					triggerRef={btnRef}
					open={confirming}
					message={confirmOpts.message}
					confirmColor={v.confirm}
					onCancel={() => setConfirming(false)}
					onConfirm={(e) => { setConfirming(false); fireClick(e); }}
				/>
			)}
		</div>
	);

	if (!tooltip || hasLabel) return btn;
	return <Tooltip label={tooltip} color={v.tooltip}>{btn}</Tooltip>;
}

// ─────────────────────────────────────────────────────────────
// ACTION BUTTONS GROUP  (upgraded)
//
//  New props:
//   maxVisible   — collapse extras into "More" overflow menu (default: Infinity)
//   grouped      — wrap in a pill container (like an icon toolbar)
//   stagger      — animate buttons in with staggered delay
//   size         — apply uniform size to all buttons (overrides per-action)
// ─────────────────────────────────────────────────────────────
export function ActionButtons({
	row,
	actions = [],
	gap = "gap-1.5",
	maxVisible = Infinity,
	grouped = false,
	stagger = false,
	size,
}) {
	const [moreOpen, setMoreOpen] = useState(false);
	const moreBtnRef = useRef(null);
	const id = useId();

	const visible = actions.filter((a) => !a.hidden);
	const shown = visible.slice(0, maxVisible);
	const overflow = visible.slice(maxVisible);
	const hasMore = overflow.length > 0;

	const container = (
		<div className={cn(
			"flex items-center",
			gap,
			grouped && cn(
				"rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
				"px-1.5 py-1 shadow-sm",
			),
		)}>
			{shown.map((action, i) => {
				const delay = stagger ? i * 0.045 : 0;
				const btn = (
					<ActionButton
						key={`${id}-${i}`}
						icon={action.icon}
						tooltip={action.tooltip}
						label={action.label}
						onClick={(e) => { e?.stopPropagation?.(); action.onClick?.(row, e); }}
						variant={action.variant || "slate"}
						size={size || action.size || "md"}
						disabled={action.disabled}
						hidden={action.hidden}
						loading={action.loading}
						confirm={action.confirm}
						badge={action.badge}
						active={action.active}
						className={action.className}
					/>
				);
				if (!stagger) return btn;
				return (
					<motion.div key={`${id}-${i}`}
						initial={{ opacity: 0, scale: 0.7, y: 4 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						transition={{ delay, type: "spring", stiffness: 460, damping: 22 }}>
						{React.cloneElement(btn, { key: undefined })}
					</motion.div>
				);
			})}

			{/* Overflow "More" trigger */}
			{hasMore && (
				<div className="relative" ref={moreBtnRef}>
					<Tooltip label={t("moreActions")} color={VARIANTS.slate.tooltip}>
						<motion.button type="button"
							onClick={(e) => { e.stopPropagation(); setMoreOpen(o => !o); }}
							whileHover={{ scale: 1.09, y: -1 }}
							whileTap={{ scale: 0.93 }}
							transition={{ type: "spring", stiffness: 420, damping: 20 }}
							className={cn(
								"w-8 h-8 rounded-lg border flex items-center justify-center",
								"transition-all duration-150 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
								moreOpen
									? VARIANTS.slate.active
									: cn(VARIANTS.slate.base, VARIANTS.slate.hover),
							)}
						>
							<MoreHorizontal size={14} />
						</motion.button>
					</Tooltip>

					<OverflowMenu
						actions={overflow}
						row={row}
						triggerRef={moreBtnRef}
						open={moreOpen}
						onClose={() => setMoreOpen(false)}
					/>
				</div>
			)}
		</div>
	);

	return container;
}

export default ActionButtons;

