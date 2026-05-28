"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function SectionHeader({
  badge = null,
  badgeIcon = null,
  title,
  highlight = null,
  subtitle = null,
  align = "center",
  className = "",
  id,
}) {
  const reduced = useReducedMotion();

  const alignClass = {
    center: "items-center text-center",
    start:  "items-start text-start",
    end:    "items-end text-end",
  }[align] ?? "items-center text-center";

  const justifyClass = {
    center: "justify-center",
    start:  "justify-start",
    end:    "justify-end",
  }[align] ?? "justify-center";

  const renderTitle = () => {
    if (!highlight || !title?.toString().includes(highlight)) {
      return <span className="theme-gradient-text">{title}</span>;
    }
    const parts = title.toString().split(highlight);
    return (
      <>
        {parts[0]}
        <span className="theme-gradient-text">{highlight}</span>
        {parts[1]}
      </>
    );
  };

  const ease = [0.22, 1, 0.36, 1];

  return (
    <motion.div
      id={id}
      className={`relative flex flex-col gap-5 max-md:gap-3 mb-16 max-md:!items-center max-md:!text-center ${alignClass} ${className}`}
      initial={{ opacity: 0, y: reduced ? 0 : -24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, ease }}
    >
      {/* ── Ambient glow ──────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2
          h-40 w-[min(600px,90vw)] rounded-full
          bg-[var(--color-primary-500)]/10 blur-[72px]"
      />

      {/* ── Badge ─────────────────────────────────────────────────────────── */}
      {badge && (
        <motion.div
          initial={{ opacity: 0, scale: reduced ? 1 : 0.85, y: reduced ? 0 : 8 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.05, ease }}
          className={`flex ${justifyClass}`}
        >
          <span className=" max-md:hidden relative inline-flex items-center gap-2 overflow-hidden rounded-full
            border border-[var(--color-primary-500)]/30
            bg-[var(--color-primary-500)]/[0.08] px-4 py-[7px] backdrop-blur-sm
            before:absolute before:inset-0 before:-translate-x-full
            before:animate-[shimmer_2.4s_ease-in-out_infinite]
            before:bg-gradient-to-r before:from-transparent
            before:via-[var(--color-primary-400)]/10 before:to-transparent">
            <span className="relative animate-pulse text-[var(--color-primary-400)]">
              {badgeIcon ?? <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
            </span>
            <span className="relative font-body max-md:text-[8px] text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-primary-300)]">
              {badge}
            </span>
          </span>
        </motion.div>
      )}
 
      <motion.h2
        className="font-display m-0 w-full max-w-full px-1 md: leading-[1.05] tracking-tight text-white
           text-[1.75rem] md:text-[2.5rem] lg:text-[3rem]"
        initial={{ opacity: 0, y: reduced ? 0 : 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1, ease }}
      >
        {renderTitle()}
      </motion.h2>

      {/* ── Decorative rule ───────────────────────────────────────────────── */}
      <motion.div
        aria-hidden="true"
        className={`flex max-md:hidden items-center gap-1.5 ${justifyClass}`}
        initial={{ opacity: 0, scaleX: 0 }}
        whileInView={{ opacity: 1, scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55, delay: 0.2, ease }}
        style={{ originX: align === "end" ? 1 : align === "center" ? 0.5 : 0 }}
      >
        <span className="theme-gradient-bg h-1 w-1 rounded-full opacity-40" />
        <span className="theme-gradient-bg h-1 w-1 rounded-full opacity-60" />
        <span className="theme-gradient-bg h-[3px] w-12 rounded-full" />
        <span className="theme-gradient-bg h-[3px] w-5 rounded-full opacity-55" />
        <span className="theme-gradient-bg h-[3px] w-2 rounded-full opacity-25" />
        <span className="theme-gradient-bg h-1 w-1 rounded-full opacity-20" />
      </motion.div>

      {/* ── Subtitle ──────────────────────────────────────────────────────── */}
      {subtitle && (
        <motion.p
          className="font-body m-0 max-w-3xl px-1 md: leading-relaxed text-white/50  text-[1rem] md:text-[1.5rem]"
          initial={{ opacity: 0, y: reduced ? 0 : 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.26, ease }}
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}

/*
  Add to your global CSS (e.g. globals.css):

  @keyframes shimmer {
    0%   { transform: translateX(-100%); }
    60%  { transform: translateX(100%); }
    100% { transform: translateX(100%); }
  }
*/