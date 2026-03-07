'use client';

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
	Plus, TrendingUp, Sparkles, ChevronDown,
	ArrowUpRight, ArrowDownRight,
	LayoutDashboard, Users, DollarSign, Activity, ShoppingCart
} from "lucide-react";

/* ─── CSS Variables ─── */
const CSS_VARS = `
  :root {
    --color-primary-50:  #eef2ff;
    --color-primary-100: #e0e7ff;
    --color-primary-200: #c7d2fe;
    --color-primary-300: #a5b4fc;
    --color-primary-400: #818cf8;
    --color-primary-500: #6366f1;
    --color-primary-600: #4f46e5;
    --color-primary-700: #4338ca;
    --color-primary-800: #3730a3;
    --color-primary-900: #312e81;

    --color-secondary-50:  #faf5ff;
    --color-secondary-100: #f3e8ff;
    --color-secondary-200: #e9d5ff;
    --color-secondary-300: #d8b4fe;
    --color-secondary-400: #c084fc;
    --color-secondary-500: #a855f7;
    --color-secondary-600: #9333ea;
    --color-secondary-700: #7e22ce;
    --color-secondary-800: #6b21a8;
    --color-secondary-900: #581c87;

    --color-gradient-from: #6366f1;
    --color-gradient-via:  #8b5cf6;
    --color-gradient-to:   #a855f7;
  }
`;

const GLOBAL = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; }

  @keyframes orb-a {
    0%,100% { transform: translate(0,0) scale(1); }
    33%     { transform: translate(24px,-20px) scale(1.1); }
    66%     { transform: translate(-14px,16px) scale(0.95); }
  }
  @keyframes orb-b {
    0%,100% { transform: translate(0,0) scale(1); }
    40%     { transform: translate(-20px,18px) scale(1.08); }
    70%     { transform: translate(18px,-12px) scale(1.04); }
  }
  @keyframes shimmer-sweep {
    0%   { transform: translateX(-130%) skewX(-14deg); }
    100% { transform: translateX(130%) skewX(-14deg); }
  }
  @keyframes ring-pulse {
    0%,100% { transform: scale(1); opacity: .45; }
    50%     { transform: scale(1.08); opacity: .14; }
  }
  @keyframes float-icon {
    0%,100% { transform: translateY(0px); }
    50%     { transform: translateY(-5px); }
  }
  @keyframes dot-grid-drift {
    0%,100% { opacity: .06; }
    50%     { opacity: .1; }
  }

  /* shimmer card pseudo */
  .gsh-shimmer::after {
    content: '';
    position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,.1) 50%, transparent 70%);
    animation: shimmer-sweep 4.5s linear infinite;
  }

  /* KPI hover */
  .kpi {
    transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
  }
  .kpi:hover {
    transform: translateY(-4px) scale(1.022);
    box-shadow: 0 14px 40px rgba(0,0,0,.28) !important;
    border-color: rgba(255,255,255,.24) !important;
  }
  .kpi:hover .kpi-ico {
    transform: rotate(8deg) scale(1.1);
  }
  .kpi-ico {
    transition: transform .32s cubic-bezier(.34,1.56,.64,1);
  }

  /* header action button */
  .hdr-btn {
    transition: box-shadow .18s ease, transform .14s ease, background .18s ease;
  }
  .hdr-btn:hover {
    transform: translateY(-2px);
    background: rgba(255,255,255,.22) !important;
    box-shadow: 0 0 0 1.5px rgba(255,255,255,.22), 0 8px 28px rgba(0,0,0,.3);
  }
  .hdr-btn:active { transform: scale(.97); }
`;

/* ─── Springs ─── */
const sp = { type: "spring", stiffness: 420, damping: 32, mass: .75 };
const sm = { type: "spring", stiffness: 280, damping: 26, mass: 1 };
const en = { type: "spring", stiffness: 220, damping: 24, mass: 1.1 };

/* ═══════════════════════════════════════════════
	 GRADIENT STATS HEADER
═══════════════════════════════════════════════ */
export function GradientStatsHeader({
	someThing, hiddenStats, innerCn = "", className = "",
	children, loadingStats, title, desc,
	onClick, btnName, icon: Icon, statsCollapsible = false,
}) {
	const [open, setOpen] = useState(true);

	return (
		<motion.div
			initial={{ opacity: 0, y: 28, scale: .972 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			transition={en}
			className={`gsh-shimmer ${className}`}
			style={{
				position: "relative", overflow: "hidden",
				borderRadius: 10,
				border: "1px solid rgba(255,255,255,.16)",
			}}
		>
			{/* ── BACKGROUND STACK ── */}
			<div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "inherit" }}>

				{/* 1. Base gradient — same palette as sidebar */}
				<div style={{
					position: "absolute", inset: 0,
					background: "linear-gradient(135deg, var(--color-primary-900) 0%, var(--color-primary-800) 40%, var(--color-secondary-900) 100%)",
				}} />

				{/* 2. Vivid top-accent gradient layer */}
				<div style={{
					position: "absolute", inset: 0,
					background: "linear-gradient(125deg, var(--color-gradient-from) 0%, var(--color-gradient-via) 52%, var(--color-gradient-to) 100%)",
					opacity: .82,
				}} />

				{/* 3. Depth overlay — keeps bottom darker */}
				<div style={{
					position: "absolute", inset: 0,
					background: "linear-gradient(180deg, rgba(0,0,0,.04) 0%, rgba(0,0,0,.26) 100%)",
				}} />

				{/* 4. Orb A — top-left */}
				<div style={{
					position: "absolute", top: -150, left: -110,
					width: 480, height: 480, borderRadius: "50%",
					background: "radial-gradient(circle, var(--color-primary-300) 0%, transparent 68%)",
					opacity: .28, animation: "orb-a 11s ease-in-out infinite",
				}} />

				{/* 5. Orb B — bottom-right */}
				<div style={{
					position: "absolute", bottom: -130, right: -90,
					width: 420, height: 420, borderRadius: "50%",
					background: "radial-gradient(circle, var(--color-secondary-400) 0%, transparent 65%)",
					opacity: .2, animation: "orb-b 14s ease-in-out infinite",
				}} />

				{/* 6. Dot-grid */}
				<div style={{
					position: "absolute", inset: 0,
					backgroundImage: "radial-gradient(rgba(255,255,255,.1) 1px, transparent 1px)",
					backgroundSize: "26px 26px",
					animation: "dot-grid-drift 8s ease-in-out infinite",
				}} />

				{/* 7. Top highlight edge */}
				<div style={{
					position: "absolute", top: 0, left: "4%", right: "4%", height: "1px",
					background: "linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent)",
				}} />

				{/* 8. Bottom edge line */}
				<div style={{
					position: "absolute", bottom: 0, left: 0, right: 0, height: "1px",
					background: "linear-gradient(90deg, transparent, rgba(255,255,255,.18) 40%, rgba(255,255,255,.18) 60%, transparent)",
				}} />
			</div>

			{/* ── CONTENT ── */}
			<div style={{ position: "relative", padding: "30px 34px 28px", color: "#fff" }}>

				{/* TOP ROW */}
				<div
					style={{
						display: "flex", flexWrap: "wrap",
						alignItems: "center", justifyContent: "space-between",
						gap: 16,
					}}
					className={innerCn}
				>
					{/* LEFT — icon + title + desc */}
					<div style={{ display: "flex", alignItems: "center", gap: 20, flex: 1, minWidth: 0 }}>

						{Icon && (
							<motion.div
								whileHover={{ scale: 1.08, rotate: 6 }}
								transition={sp}
								style={{
									position: "relative", flexShrink: 0,
									width: 66, height: 66, borderRadius: 16,
									background: "rgba(255,255,255,.16)",
									backdropFilter: "blur(14px)",
									border: "1.5px solid rgba(255,255,255,.26)",
									display: "grid", placeContent: "center",
									boxShadow: "0 6px 28px rgba(0,0,0,.28), 0 1px 0 rgba(255,255,255,.2) inset",
									animation: "float-icon 4.2s ease-in-out infinite",
								}}
							>
								{/* pulsing ring */}
								<div style={{
									position: "absolute", inset: -8, borderRadius: 22,
									border: "1.5px solid rgba(255,255,255,.2)",
									animation: "ring-pulse 3.2s ease-in-out infinite",
								}} />
								<Icon style={{ width: 28, height: 28, color: "#fff", strokeWidth: 2.2 }} />
							</motion.div>
						)}

						<div style={{ flex: 1, minWidth: 0 }}>
							{/* title */}
							<motion.h1
								initial={{ opacity: 0, x: -18 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: .07, ...sm }}
								style={{
									fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
									fontWeight: 700, color: "#fff",
									letterSpacing: "-.02em", lineHeight: 1.16,
									margin: 0, marginBottom: 7,
									display: "flex", alignItems: "center", gap: 10,
								}}
							>
								{title}
								<motion.span
									animate={{ rotate: [0, 12, -8, 0], scale: [1, 1.2, 1] }}
									transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
									style={{ display: "inline-flex" }}
								>
									<Sparkles style={{ width: 20, height: 20, color: "#fde68a" }} />
								</motion.span>
							</motion.h1>

							{desc && (
								<motion.p
									initial={{ opacity: 0, x: -18 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: .14, ...sm }}
									style={{
										color: "rgba(255,255,255,.62)",
										fontSize: 13, fontWeight: 400,
										lineHeight: 1.65, maxWidth: 520,
										margin: 0,
									}}
								>
									{desc}
								</motion.p>
							)}
						</div>
					</div>

					{/* RIGHT — slot + CTA button */}
					<div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
						{someThing}
						{btnName && (
							<button
								onClick={onClick}
								className="hdr-btn"
								style={{
									position: "relative", overflow: "hidden",
									display: "inline-flex", alignItems: "center", gap: 8,
									padding: "10px 20px", borderRadius: 11,
									fontSize: 13, fontWeight: 700, color: "#fff",
									background: "rgba(255,255,255,.14)",
									backdropFilter: "blur(14px)",
									border: "1.5px solid rgba(255,255,255,.24)",
									boxShadow: "0 2px 14px rgba(0,0,0,.22), 0 1px 0 rgba(255,255,255,.16) inset",
									cursor: "pointer", letterSpacing: ".012em", whiteSpace: "nowrap",
								}}
							>
								<Plus style={{ width: 15, height: 15, strokeWidth: 2.8 }} />
								{btnName}
							</button>
						)}
					</div>
				</div>

				{/* STATS SECTION */}
				{children && (
					<div style={{ marginTop: 26 }}>

						{/* Collapsible toggle */}
						{statsCollapsible && (
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: .97 }}
								onClick={() => setOpen(v => !v)}
								style={{
									display: "inline-flex", alignItems: "center", gap: 7,
									background: "rgba(255,255,255,.1)",
									backdropFilter: "blur(10px)",
									border: "1px solid rgba(255,255,255,.18)",
									borderRadius: 99,
									padding: "5px 14px 5px 10px",
									fontSize: 10.5, fontWeight: 800,
									letterSpacing: ".08em", color: "rgba(255,255,255,.82)",
									textTransform: "uppercase", cursor: "pointer", marginBottom: 16,
								}}
							>
								<TrendingUp style={{ width: 12, height: 12 }} />
								{open ? "Hide" : "Show"} Stats
								<motion.span
									animate={{ rotate: open ? 180 : 0 }}
									transition={sp}
									style={{ display: "flex" }}
								>
									<ChevronDown style={{ width: 12, height: 12 }} />
								</motion.span>
							</motion.button>
						)}

						<AnimatePresence>
							{(!statsCollapsible || open) && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: "auto" }}
									exit={{ opacity: 0, height: 0 }}
									transition={sm}
									style={{ overflow: "hidden" }}
								>
									<div
										style={{ display: "grid", gap: 12 }}
										className={
											(hiddenStats ? "max-md:hidden " : "") +
											"grid-cols-[repeat(auto-fit,minmax(200px,315px))]"
										}
									>
										{loadingStats ? <KpiSkeleton /> : children}
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				)}
			</div>
		</motion.div>
	);
}

/* ─── KPI SKELETON ─── */
function KpiSkeleton() {
	return Array.from({ length: 4 }).map((_, i) => (
		<div key={i} style={{
			borderRadius: 14,
			border: "1px solid rgba(255,255,255,.1)",
			background: "rgba(255,255,255,.07)",
			padding: "17px 18px",
			display: "flex", alignItems: "center", gap: 13,
		}}>
			<div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(255,255,255,.14)", flexShrink: 0 }} />
			<div style={{ flex: 1 }}>
				<div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,.14)", width: "52%", marginBottom: 9 }} />
				<div style={{ height: 16, borderRadius: 99, background: "rgba(255,255,255,.2)", width: "36%" }} />
			</div>
		</div>
	));
}

/* ─── KPI CARD ─── */
export function KpiCard({ icon: Icon, label, value, trend, trendValue, loading }) {
	if (loading) return (
		<div style={{
			borderRadius: 14, border: "1px solid rgba(255,255,255,.1)",
			background: "rgba(255,255,255,.07)", padding: "17px 18px",
			display: "flex", alignItems: "center", gap: 13,
		}}>
			<div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(255,255,255,.14)", flexShrink: 0 }} />
			<div style={{ flex: 1 }}>
				<div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,.14)", width: "52%", marginBottom: 9 }} />
				<div style={{ height: 16, borderRadius: 99, background: "rgba(255,255,255,.2)", width: "36%" }} />
			</div>
		</div>
	);

	const up = trend === "up";

	return (
		<div
			className="kpi"
			style={{
				position: "relative", overflow: "hidden",
				borderRadius: 14, cursor: "pointer",
				border: "1px solid rgba(255,255,255,.12)",
				background: "rgba(255,255,255,.09)",
				backdropFilter: "blur(16px)",
				padding: "17px 18px",
				boxShadow: "0 4px 20px rgba(0,0,0,.18)",
			}}
		>
			{/* Top accent stripe */}
			<div style={{
				position: "absolute", top: 0, left: 0, right: 0, height: 2,
				background: up
					? "linear-gradient(90deg, rgba(165,180,252,.8), rgba(129,140,248,.9))"
					: "linear-gradient(90deg, rgba(192,132,252,.8), rgba(168,85,247,.9))",
				borderRadius: "14px 14px 0 0",
			}} />

			{/* Inner side glow */}
			<div style={{
				position: "absolute", inset: 0, borderRadius: 14, pointerEvents: "none",
				background: up
					? "linear-gradient(135deg, rgba(165,180,252,.06) 0%, transparent 60%)"
					: "linear-gradient(135deg, rgba(192,132,252,.06) 0%, transparent 60%)",
			}} />

			<div style={{ display: "flex", alignItems: "center", gap: 14 }}>
				{Icon && (
					<div
						className="kpi-ico"
						style={{
							flexShrink: 0, width: 44, height: 44, borderRadius: 10,
							background: "rgba(255,255,255,.13)",
							border: "1px solid rgba(255,255,255,.2)",
							display: "grid", placeContent: "center",
							boxShadow: "0 2px 10px rgba(0,0,0,.2)",
						}}
					>
						<Icon style={{ width: 19, height: 19, color: "#fff", strokeWidth: 2.2 }} />
					</div>
				)}

				<div style={{ flex: 1, minWidth: 0 }}>
					<div style={{
						fontSize: 9.5, fontWeight: 800, letterSpacing: ".1em",
						textTransform: "uppercase", color: "rgba(255,255,255,.48)",
						marginBottom: 6,
					}}>
						{label}
					</div>

					<div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
						<span style={{
							fontSize: 23, fontWeight: 700, color: "#fff",
							letterSpacing: "-.022em", lineHeight: 1,
						}}>
							{value}
						</span>

						{trend && trendValue && (
							<div style={{
								display: "inline-flex", alignItems: "center", gap: 3,
								fontSize: 10, fontWeight: 800,
								padding: "2px 7px", borderRadius: 99,
								background: up ? "rgba(165,180,252,.15)" : "rgba(192,132,252,.15)",
								border: up
									? "1px solid rgba(165,180,252,.3)"
									: "1px solid rgba(192,132,252,.3)",
								color: up
									? "rgba(199,210,254,.95)"
									: "rgba(216,180,254,.95)",
								letterSpacing: ".02em",
							}}>
								{up
									? <ArrowUpRight style={{ width: 10, height: 10, strokeWidth: 2.8 }} />
									: <ArrowDownRight style={{ width: 10, height: 10, strokeWidth: 2.8 }} />
								}
								{trendValue}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Bottom edge line */}
			<div style={{
				position: "absolute", bottom: 0, left: "10%", right: "10%", height: "1px",
				background: "linear-gradient(90deg, transparent, rgba(255,255,255,.1), transparent)",
			}} />
		</div>
	);
}

