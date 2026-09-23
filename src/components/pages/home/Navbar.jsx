"use client";

import { useTranslations, useLocale } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
	Dumbbell, Menu, X, LogOut, LayoutDashboard,
	User, Crown, Shield, Star, ChevronDown,
	Building2, Wallet, CalendarDays, MessageCircle,
	Home, Info, Layers, CircleHelp, Mail,
} from "lucide-react";
import { useState, useEffect, useRef, useTransition, useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BRAND_LOGO_SRC } from "@/lib/brand";
import { resolvePostLoginPath } from "@/lib/nav-access";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setDocumentLangDir(locale) {
	if (typeof document === "undefined") return;
	document.documentElement.lang = locale;
	document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
}

function setLocaleCookie(locale) {
	if (typeof document === "undefined") return;
	document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${60 * 60 * 24 * 365}`;
}

function showGlobalLoader(label) {
	if (typeof document === "undefined") return;
	document.getElementById("lang-switch-loader")?.remove();
	const root = document.createElement("div");
	root.id = "lang-switch-loader";
	root.style.cssText = "position:fixed;inset:0;z-index:9999;display:grid;place-items:center;backdrop-filter:blur(8px);background:rgba(8,8,20,0.8)";
	root.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:14px;">
      <div style="position:relative;height:48px;width:48px;">
        <div style="position:absolute;inset:0;border-radius:50%;border:2.5px solid rgba(99,102,241,0.2);border-top-color:var(--color-gradient-from,#6366f1);animation:_sp 0.8s linear infinite;"></div>
        <div style="position:absolute;inset:7px;border-radius:50%;border:2px solid rgba(168,85,247,0.15);border-bottom-color:var(--color-gradient-to,#a855f7);animation:_sp 1.2s linear infinite reverse;"></div>
      </div>
      <span style="font-size:10px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:var(--color-primary-400,#818cf8);">${label}</span>
    </div>
    <style>@keyframes _sp{to{transform:rotate(360deg)}}</style>`;
	document.body.appendChild(root);
	setTimeout(() => root.remove(), 1100);
}

function swapLocaleInPath(pathname, nextLocale) {
	const segs = pathname.split("/").filter(Boolean);
	if (segs.length && (segs[0] === "en" || segs[0] === "ar")) {
		segs[0] = nextLocale;
		return "/" + segs.join("/");
	}
	return "/" + [nextLocale, ...segs].join("/");
}

function getInitials(name) {
	if (!name) return "?";
	return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getDashboardPath(userOrRole) {
	if (userOrRole && typeof userOrRole === "object") return resolvePostLoginPath(userOrRole);
	return resolvePostLoginPath({ role: userOrRole });
}

function getRoleIcon(role) {
	const s = { height: "10px", width: "10px" };
	if (role === "super_admin") return <Crown style={s} />;
	if (role === "admin") return <Shield style={s} />;
	if (role === "coach") return <Star style={s} />;
	return <User style={s} />;
}

function getRoleLabel(role, t) {
	try { return t(`roles.${role}`); } catch { return role; }
}

function getRoleQuickLinks(role, t) {
	const isAdmin = ["admin", "super_admin", "coach"].includes(role);
	const common = [
		{ href: "/workspace?tab=calendar", icon: <CalendarDays className="h-3.5 w-3.5" />, label: t("quickLinks.myCalendar") },
		{ href: "/dashboard/whatsapp", icon: <MessageCircle className="h-3.5 w-3.5" />, label: t("quickLinks.whatsapp") },
		{ href: "/money", icon: <Wallet className="h-3.5 w-3.5" />, label: t("quickLinks.money") },
	];
	if (isAdmin) return [{ href: "/dashboard/workspace", icon: <Building2 className="h-3.5 w-3.5" />, label: t("quickLinks.workspace") }, ...common];
	return [{ href: "/dashboard/my/workouts", icon: <Dumbbell className="h-3.5 w-3.5" />, label: t("quickLinks.myExercise") }, ...common];
}

// ─── LangSwitch ───────────────────────────────────────────────────────────────

export function LangSwitch({ tone = "surface" }) {
	const t = useTranslations("home.navbar");
	const locale = useLocale();
	const router = useRouter();
	const pathname = usePathname();
	const search = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const isEN = locale === "en";
	const nextLocale = isEN ? "ar" : "en";
	const nextHref = useMemo(() => {
		const base = swapLocaleInPath(pathname || "/", nextLocale);
		const qs = search?.toString();
		return qs ? `${base}?${qs}` : base;
	}, [pathname, search, nextLocale]);

	function toggle() {
		startTransition(() => {
			showGlobalLoader(isEN ? t("langSwitch.switchingToAr") : t("langSwitch.switchingToEn"));
			setLocaleCookie(nextLocale);
			setDocumentLangDir(nextLocale);
			router.replace(nextHref);
			router.refresh();
		});
	}

	useEffect(() => { setDocumentLangDir(locale); }, [locale]);

	const onPhoto = tone === "photo";

	return (
		<button
			type="button"
			onClick={toggle}
			disabled={isPending}
			aria-label={isEN ? t("langSwitch.ariaToAr") : t("langSwitch.ariaToEn")}
			className={[
				"inline-flex h-10 items-center justify-center rounded-full px-3 text-[13px] font-semibold transition-colors disabled:cursor-wait disabled:opacity-50",
				onPhoto ? "text-white hover:bg-white/15" : "text-[#161616] hover:bg-black/5",
			].join(" ")}
			style={isEN ? { fontFamily: "var(--font-arabic), sans-serif" } : undefined}
		>
			{isPending ? "…" : isEN ? "عربي" : "EN"}
		</button>
	);
}

// ─── UserDropdown ─────────────────────────────────────────────────────────────

function UserDropdown({ user, onClose, isRTL }) {
	const t = useTranslations("home.navbar");
	const quickLinks = getRoleQuickLinks(user.role, t);
	const lastIsOdd = quickLinks.length % 2 === 1;

	const handleLogout = () => { localStorage.removeItem("user"); window.location.href = "/"; };

	return (
		<>
			<style>{`
        @keyframes _onl { 0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0.5)} 50%{box-shadow:0 0 0 4px rgba(16,185,129,0)} }
        .ud-online { animation:_onl 2.4s ease infinite; }
        .ud-row:hover .ud-arr { opacity:1; transform:translateX(${isRTL ? "-2px" : "2px"}); }
        .ud-qlink { transition:transform 0.18s ease, background 0.18s ease, border-color 0.18s ease; }
        .ud-qlink:hover { transform:translateY(-2px); background:rgba(99,102,241,0.14) !important; border-color:rgba(99,102,241,0.4) !important; }
      `}</style>
			<motion.div
				role="menu"
				aria-label={t("dropdown.openMenu")}
				initial={{ opacity: 0, y: -10, scale: 0.95 }}
				animate={{ opacity: 1, y: 0, scale: 1 }}
				exit={{ opacity: 0, y: -8, scale: 0.96, transition: { duration: 0.14 } }}
				transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.7 }}
				className="absolute top-[calc(100%+14px)] z-50 w-[290px] rounded-[16px] overflow-hidden"
				style={{
					[isRTL ? "left" : "right"]: 0,
					direction: isRTL ? "rtl" : "ltr",
					transformOrigin: isRTL ? "top left" : "top right",
					background: "rgba(10,10,22,0.98)",
					border: "1px solid rgba(255,255,255,0.08)",
					backdropFilter: "blur(28px)",
					boxShadow: "0 24px 70px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.06)",
				}}
			>
				{/* Caret pointing to the avatar trigger */}
				<span
					aria-hidden="true"
					className="absolute -top-[6px] h-3 w-3 rotate-45"
					style={{
						[isRTL ? "left" : "right"]: 18,
						background: "rgba(10,10,22,0.98)",
						borderTop: "1px solid rgba(255,255,255,0.08)",
						[isRTL ? "borderLeft" : "borderRight"]: "1px solid rgba(255,255,255,0.08)",
					}}
				/>

				{/* Accent bar */}
				<div style={{ height: "2.5px", background: "linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-to))" }} />

				{/* User info */}
				<div className="px-4 pt-4 pb-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
					<div className="flex items-center gap-3">
						<div className="relative shrink-0">
							<div className="h-12 w-12 rounded-[13px] flex items-center justify-center text-[16px] font-black text-white"
								style={{ background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))", boxShadow: "0 6px 18px rgba(99,102,241,0.4)" }}>
								{getInitials(user.name)}
							</div>
							<span className={`ud-online absolute -bottom-0.5 ${isRTL ? "-left-0.5" : "-right-0.5"} h-3.5 w-3.5 rounded-full bg-emerald-400 border-[2.5px] border-[#0a0a16] block`} />
						</div>
						<div className="min-w-0 flex-1">
							<p className="text-[14px] font-bold text-white truncate md: leading-tight">{user.name}</p>
							<p className="text-[11px] text-white/40 truncate mt-0.5">{user.email}</p>
							<span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white"
								style={{ background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))" }}>
								{getRoleIcon(user.role)}{getRoleLabel(user.role, t)}
							</span>
						</div>
					</div> 
				</div>

				{/* Quick links */}
				{quickLinks.length > 0 && (
					<div className="px-3 pt-3 pb-1">
						<p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/25 mb-2 px-1">{t("quickLinks.sectionLabel")}</p>
						<div className="grid grid-cols-2 gap-1.5">
							{quickLinks.map((l, index) => (
								<Link
									key={l.href}
									href={l.href}
									onClick={onClose}
									role="menuitem"
									className={`ud-qlink flex items-center gap-2 px-2.5 py-2.5 rounded-[11px] text-[11px] font-bold no-underline ${lastIsOdd && index === quickLinks.length - 1 ? "col-span-2" : ""}`}
									style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.75)" }}
								>
									<span className="h-6 w-6 rounded-[7px] flex items-center justify-center shrink-0" style={{ background: "rgba(99,102,241,0.14)", color: "var(--color-primary-400)" }}>
										{l.icon}
									</span>
									<span className="truncate">{l.label}</span>
								</Link>
							))}
						</div>
						<div className="mt-3 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
					</div>
				)}

				{/* Actions */}
				<div className="p-1.5 space-y-px">
					{[
						{ href: getDashboardPath(user), icon: <LayoutDashboard className="h-[14px] w-[14px]" />, label: t("dropdown.dashboard"), accent: true },
						{ href: "/profile", icon: <User className="h-[14px] w-[14px]" />, label: t("dropdown.myProfile"), accent: false },
					].map((item) => (
						<Link
							key={item.label}
							href={item.href}
							onClick={onClose}
							role="menuitem"
							className="ud-row group flex items-center gap-2.5 px-2.5 py-2.5 rounded-[11px] no-underline transition-colors duration-150 hover:bg-white/[0.055]"
						>
							<div className="h-8 w-8 rounded-[9px] flex items-center justify-center text-white shrink-0 transition-transform duration-200 group-hover:scale-105"
								style={item.accent
									? { background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))" }
									: { background: "rgba(255,255,255,0.06)" }
								}>
								{item.icon}
							</div>
							<span className="flex-1 text-[12.5px] font-semibold text-white/65 group-hover:text-white transition-colors">{item.label}</span>
							<svg className="ud-arr h-3 w-3 text-white/25 opacity-0 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"
								style={isRTL ? { transform: "scaleX(-1)" } : {}}>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
							</svg>
						</Link>
					))}
				</div>

				{/* Sign out */}
				<div className="p-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
					<button onClick={handleLogout} role="menuitem"
						className="group flex w-full items-center gap-2.5 px-2.5 py-2.5 rounded-[11px] transition-colors duration-150 hover:bg-red-500/[0.1] cursor-pointer">
						<div className="h-8 w-8 rounded-[9px] flex items-center justify-center text-red-400 transition-colors shrink-0"
							style={{ background: "rgba(239,68,68,0.12)" }}>
							<LogOut className="h-[13px] w-[13px]" />
						</div>
						<span className="text-[12.5px] font-semibold text-red-400 group-hover:text-red-300 transition-colors">{t("dropdown.signOut")}</span>
					</button>
				</div>
			</motion.div>
		</>
	);
}

// ─── AvatarButton ─────────────────────────────────────────────────────────────

function AvatarButton({ user, isRTL }) {
	const t = useTranslations("home.navbar");
	const [open, setOpen] = useState(false);
	const ref = useRef(null);
	const firstName = user.name?.split(" ")[0] ?? user.name;

	useEffect(() => {
		function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
		document.addEventListener("mousedown", h);
		return () => document.removeEventListener("mousedown", h);
	}, []);
	useEffect(() => {
		function h(e) { if (e.key === "Escape") setOpen(false); }
		document.addEventListener("keydown", h);
		return () => document.removeEventListener("keydown", h);
	}, []);

	return (
		<div
			ref={ref}
			className="relative"
			data-aos="zoom-in"
			data-aos-delay="220"
			data-aos-duration="650"
		>
			<motion.button
				onClick={() => setOpen((v) => !v)}
				aria-label={t("dropdown.openMenu")}
				aria-haspopup="menu"
				aria-expanded={open}
				whileTap={{ scale: 0.96 }}
				className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-[12px] cursor-pointer outline-none transition-[background,border-color,box-shadow] duration-200"
				style={{
					border: open
						? "1px solid rgba(99,102,241,0.45)"
						: "1px solid rgba(255,255,255,0.08)",
					background: open
						? "rgba(99,102,241,0.12)"
						: "rgba(255,255,255,0.03)",
					boxShadow: open ? "0 0 0 3px rgba(99,102,241,0.12)" : "none",
				}}
			>
				<div className="relative shrink-0">
					<div className="h-[28px] w-[28px] rounded-[9px] flex items-center justify-center text-[12px] font-black text-white transition-transform duration-200"
						style={{
							background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))",
							boxShadow: open ? "0 0 0 2px rgba(99,102,241,0.35)" : "none",
						}}>
						{getInitials(user.name)}
					</div>
					<span className="absolute -bottom-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-[2px] border-[#08081a] block"
						style={isRTL ? { left: "-2px" } : { right: "-2px" }} />
				</div>
				<span className="hidden sm:block text-[12px] font-bold text-white max-w-[72px] truncate">{firstName}</span>
				<ChevronDown className={`h-[13px] w-[13px] shrink-0 transition-transform duration-250 ${open ? "rotate-180 text-white/60" : "text-white/30"}`} />
			</motion.button>
			<AnimatePresence>
				{open && <UserDropdown user={user} onClose={() => setOpen(false)} isRTL={isRTL} />}
			</AnimatePresence>
		</div>
	);
}

export default function PowerfulNavbar() {
	const t = useTranslations("home.navbar");
	const locale = useLocale();
	const isRTL = locale === "ar";

	const [mobileOpen, setMobileOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);
	const [activeId, setActiveId] = useState("hero");
	const [user, setUser] = useState(null);

	const navItems = [
		{ label: t("nav.home"), href: "#hero", id: "hero", icon: Home },
		{ label: t("nav.about"), href: "#how-it-works-section", id: "how-it-works-section", icon: Info },
		{ label: t("nav.community"), href: "#role-tabs-section", id: "role-tabs-section", icon: Layers },
		{ label: t("nav.faqs"), href: "#faqs-section", id: "faqs-section", icon: CircleHelp },
		{ label: t("nav.contact"), href: "#contact-section", id: "contact-section", icon: Mail },
	];

	useEffect(() => {
		try {
			const raw = localStorage.getItem("user");
			if (raw) setUser(JSON.parse(raw));
		} catch (_) {}
	}, []);

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 24);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	useEffect(() => {
		document.body.style.overflow = mobileOpen ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [mobileOpen]);

	useEffect(() => {
		const ids = ["hero", "how-it-works-section", "role-tabs-section", "faqs-section", "contact-section"];
		const nodes = ids.map((id) => document.getElementById(id)).filter(Boolean);
		if (!nodes.length) return undefined;
		const observer = new IntersectionObserver(
			(entries) => {
				const hit = entries
					.filter((entry) => entry.isIntersecting)
					.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
				if (hit?.target?.id) setActiveId(hit.target.id);
			},
			{ rootMargin: "-30% 0px -55% 0px", threshold: [0.15, 0.4] }
		);
		nodes.forEach((node) => observer.observe(node));
		return () => observer.disconnect();
	}, []);

	const solid = scrolled || mobileOpen;

	return (
		<header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4" dir={isRTL ? "rtl" : "ltr"}>
			{mobileOpen && (
				<button
					type="button"
					aria-label={t("mobile.close")}
					className="fixed inset-0 bg-black/50"
					onClick={() => setMobileOpen(false)}
				/>
			)}

			<div className="relative mx-auto max-w-[1180px]">
				<div
					className={[
						"flex h-14 items-center justify-between gap-2 rounded-full px-1.5 sm:px-2",
						solid
							? "bg-[#141414] shadow-[0_18px_50px_rgba(0,0,0,0.38)] ring-1 ring-white/10"
							: "bg-black/45 shadow-[0_10px_28px_rgba(0,0,0,0.22)] ring-1 ring-white/30 backdrop-blur-xl",
					].join(" ")}
				>
					<Link href="/" className="flex min-w-0 items-center gap-2 ps-1.5 no-underline">
						<img src={BRAND_LOGO_SRC} alt="" className="h-9 w-9 shrink-0 object-contain" />
						<span className="truncate text-[15px] font-semibold tracking-[-0.02em] text-white">{t("brand.name")}</span>
					</Link>

					<nav
						className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-0.5 lg:flex"
						aria-label={t("mobile.sectionNav")}
					>
						{navItems.map((item) => {
							const on = activeId === item.id;
							return (
								<a
									key={item.id}
									href={item.href}
									aria-current={on ? "true" : undefined}
									className={[
										"rounded-full px-3.5 py-2 text-[13px] font-semibold no-underline transition-colors",
										on ? "bg-white text-[#161616]" : "text-white/90 hover:bg-white/10 hover:text-white",
									].join(" ")}
								>
									{item.label}
								</a>
							);
						})}
					</nav>

					<div className="flex shrink-0 items-center">
						<LangSwitch tone="photo" />
						{user ? (
							<div className="hidden md:block">
								<AvatarButton user={user} isRTL={isRTL} />
							</div>
						) : (
							<Link
								href="/auth"
								className="ms-1 hidden h-10 items-center rounded-full bg-white px-4 text-[13px] font-semibold text-[#161616] no-underline md:inline-flex"
							>
								{t("nav.joinNow")}
							</Link>
						)}
						<button
							type="button"
							onClick={() => setMobileOpen((open) => !open)}
							aria-expanded={mobileOpen}
							aria-label={mobileOpen ? t("mobile.close") : t("mobile.open")}
							className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10 lg:hidden"
						>
							{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
						</button>
					</div>
				</div>

				<AnimatePresence>
					{mobileOpen && (
						<motion.div
							initial={{ opacity: 0, y: -8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -8 }}
							transition={{ duration: 0.18 }}
							className="mt-2 max-h-[min(72svh,560px)] overflow-y-auto rounded-3xl bg-[#141414] p-2 text-white shadow-[0_24px_60px_rgba(0,0,0,0.4)] ring-1 ring-white/10"
						>
							<nav className="flex flex-col" aria-label={t("mobile.sectionNav")}>
								{navItems.map((item) => {
									const Icon = item.icon;
									const on = activeId === item.id;
									return (
										<a
											key={item.id}
											href={item.href}
											onClick={() => setMobileOpen(false)}
											className={[
												"flex items-center gap-3 rounded-2xl px-4 py-3.5 text-[16px] font-semibold no-underline",
												on ? "bg-white text-[#161616]" : "text-white hover:bg-white/10",
											].join(" ")}
										>
											<Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
											{item.label}
										</a>
									);
								})}
							</nav>

							{user ? (
								<div className="mt-1 border-t border-white/10 pt-1">
									<Link
										href={getDashboardPath(user)}
										onClick={() => setMobileOpen(false)}
										className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-[15px] font-semibold text-white no-underline hover:bg-white/10"
									>
										<LayoutDashboard className="h-5 w-5" aria-hidden="true" />
										{t("dropdown.dashboard")}
									</Link>
									<button
										type="button"
										onClick={() => {
											localStorage.removeItem("user");
											setUser(null);
											setMobileOpen(false);
										}}
										className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-[15px] font-semibold text-red-300 hover:bg-white/10"
									>
										<LogOut className="h-5 w-5" aria-hidden="true" />
										{t("dropdown.signOut")}
									</button>
								</div>
							) : (
								<div className="p-2 pt-1">
									<Link
										href="/auth"
										onClick={() => setMobileOpen(false)}
										className="flex h-12 items-center justify-center rounded-full bg-white text-[15px] font-semibold text-[#161616] no-underline"
									>
										{t("nav.joinNow")}
									</Link>
								</div>
							)}
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</header>
	);
}
