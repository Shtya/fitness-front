"use client";

import { useTranslations, useLocale } from "next-intl";
import { Dumbbell, Menu, X, ChevronDown, Zap, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import LanguageToggle from "@/components/atoms/LanguageToggle";
import { Link } from "@/i18n/navigation";

export default function PowerfulNavbar() {
  const t = useTranslations("home.hero");
  const locale = useLocale();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      setIsScrolled(currentScrollY > 50);

      if (currentScrollY < lastScrollY || currentScrollY < 100) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
        setIsMobileMenuOpen(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const navItems = [
    { label: t("nav.home"), href: "#home", icon: "🏠" },
    { label: t("nav.about"), href: "#about", icon: "ℹ️" },
    { label: t("nav.community"), href: "#community", icon: "👥" },
    { label: t("nav.pricing"), href: "#pricing", icon: "💰" },
  ];

  return (
    <nav
      className={[
        "fixed left-0 right-0 top-0 z-50",
        "transition-all duration-500",
        isVisible ? "translate-y-0" : "-translate-y-full",
        isScrolled
          ? "bg-slate-900/95 backdrop-blur-2xl shadow-2xl shadow-black/30 border-b border-white/10"
          : "bg-transparent border-b border-transparent",
      ].join(" ")}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <div className="group flex cursor-pointer items-center gap-4">
            <div className="relative">
              {/* Glow ring */}
              <div className="absolute inset-0 rounded-2xl blur-xl opacity-60 transition-opacity duration-300 animate-pulse group-hover:opacity-100 theme-gradient-bg" />

              {/* Logo container */}
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl shadow-2xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 theme-gradient-bg">
                <Dumbbell className="h-7 w-7 text-white" strokeWidth={2.5} />
                <div className="absolute inset-0 rounded-2xl bg-white/15 blur-sm" />
              </div>

              {/* sparkle */}
              <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-yellow-400 opacity-0 transition-opacity group-hover:opacity-100 group-hover:animate-ping" />
            </div>

            <div>
              <span className="text-2xl font-black tracking-tight text-white">
                So7baFit
              </span> 
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden items-center gap-1 lg:flex">
            {navItems.slice(0, 4).map((item, index) => (
              <a
                key={index}
                href={item.href}
                className="group relative rounded-xl px-5 py-2.5 text-sm font-bold text-gray-300 transition-all duration-300 hover:text-white"
              >
                {/* Hover BG */}
                <div className="absolute inset-0 rounded-xl bg-white/0 transition-all duration-300 group-hover:bg-white/5" />
                {/* Text */}
                <span className="relative">{item.label}</span>
                {/* Bottom Indicator */}
                <div className="absolute bottom-0 left-1/2 h-0.5 w-0 -translate-x-1/2 rounded-full transition-all duration-300 group-hover:w-8 theme-gradient-bg" />
              </a>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            <LanguageToggle className="scale-[1.2]" />

            {/* Desktop CTA */}
            <Link href={"/auth"} className="group relative hidden items-center gap-2 overflow-hidden rounded-lg px-6 py-3 text-sm font-bold text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl md:flex">
              {/* Gradient bg */}
              <div className="absolute inset-0 theme-gradient-bg" />
              <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[linear-gradient(135deg,var(--color-primary-600),var(--color-secondary-600))]" />
              {/* Shimmer */}
              <div className="absolute inset-0 translate-x-[-100%] transition-transform duration-1000 group-hover:translate-x-[100%] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.30),transparent)]" />

              <Zap
                className="relative h-4 w-4 transition-transform duration-300 group-hover:rotate-12"
                fill="white"
              />
              <span className="relative">{t("nav.joinNow")}</span>
              <svg
                className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 rtl:scale-x-[-1]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              className={[
                "relative flex h-12 w-12 items-center justify-center rounded-xl",
                "border border-slate-700/50 bg-slate-800/80 transition-all duration-300",
                "hover:bg-slate-700/80 hover:border-white/20 lg:hidden",
                "group",
              ].join(" ")}
            >
              <div className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.00))]" />
              {isMobileMenuOpen ? (
                <X className="relative h-6 w-6 text-white" strokeWidth={2.5} />
              ) : (
                <Menu className="relative h-6 w-6 text-white" strokeWidth={2.5} />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={[
            "lg:hidden overflow-hidden transition-all duration-500 ease-in-out",
            isMobileMenuOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0",
          ].join(" ")}
        >
          <div className="mt-2 space-y-3 border-t border-slate-700/50 py-6">
            {navItems.map((item, index) => (
              <a
                key={index}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="group flex items-center gap-4 rounded-xl border border-slate-700/30 bg-slate-800/50 px-4 py-3.5 transition-all duration-300 hover:bg-slate-700/50 hover:border-white/20"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-xl transition-transform duration-300 group-hover:scale-110">
                  {item.icon}
                </div>

                <span className="flex-1 font-bold text-gray-300 transition-colors group-hover:text-white">
                  {item.label}
                </span>

                <svg
                  className="h-5 w-5 text-gray-500 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white/70 rtl:scale-x-[-1]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </a>
            ))}
 
            {/* Mobile CTA */}
            <Link href={"/auth"} className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-6 py-4 font-bold text-white shadow-xl transition-all duration-300 hover:shadow-2xl">
              <div className="absolute inset-0 theme-gradient-bg" />
              <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[linear-gradient(135deg,var(--color-primary-600),var(--color-secondary-600))]" />
              <div className="absolute inset-0 translate-x-[-100%] transition-transform duration-1000 group-hover:translate-x-[100%] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.30),transparent)]" />

              <Zap
                className="relative h-5 w-5 transition-transform duration-300 group-hover:rotate-12"
                fill="white"
              />
              <span className="relative text-lg">{t("nav.joinNow")}</span>
              <svg
                className="relative h-5 w-5 transition-transform duration-300 group-hover:translate-x-1 rtl:scale-x-[-1]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom line when scrolled */}
      {isScrolled && (
        <div className="absolute bottom-0 left-0 right-0 h-px opacity-60 theme-gradient-bg" />
      )}
    </nav>
  );
}
