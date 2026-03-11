"use client";

import { useTranslations, useLocale } from "next-intl";
import {
	Dumbbell, Menu, X, Zap, LogOut, LayoutDashboard,
	User, Crown, Shield, Star, ChevronDown,
	Building2, Wallet, CalendarDays,
} from "lucide-react";
import { useState, useEffect, useRef, useTransition, useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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

function getDashboardPath(role) {
	if (role === "admin" || role === "coach") return "/dashboard/users";
	if (role === "super_admin") return "/dashboard/super-admin/users";
	return "/dashboard/my/workouts";
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
		{ href: "/money", icon: <Wallet className="h-3.5 w-3.5" />, label: t("quickLinks.money") },
	];
	if (isAdmin) return [{ href: "/dashboard/workspace", icon: <Building2 className="h-3.5 w-3.5" />, label: t("quickLinks.workspace") }, ...common];
	return [{ href: "/dashboard/my/workouts", icon: <Dumbbell className="h-3.5 w-3.5" />, label: t("quickLinks.myExercise") }, ...common];
}

// ─── LangSwitch ───────────────────────────────────────────────────────────────

export function LangSwitch() {
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

	return (
		<>
			<style>{`
        .ls-wrap {
          position:relative; display:inline-flex; align-items:center;
          height:34px; border-radius:10px; padding:3px; cursor:pointer;
          background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.18);
          transition:border-color 0.2s, box-shadow 0.2s; gap:0;
        }
        .ls-wrap:hover { border-color:rgba(99,102,241,0.4); box-shadow:0 0 14px rgba(99,102,241,0.15); }
        .ls-wrap:disabled { opacity:0.5; cursor:wait; }
        .ls-thumb {
          position:absolute; top:3px; bottom:3px; width:calc(50% - 3px); border-radius:7px;
          background:linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to));
          box-shadow:0 2px 8px rgba(99,102,241,0.4);
          transition:left 0.26s cubic-bezier(0.4,0,0.2,1); pointer-events:none; z-index:1;
        }
        .ls-seg {
          position:relative; z-index:2; display:flex; align-items:center; justify-content:center; gap:3px;
          width:48px; height:100%; font-size:10px; font-weight:800; letter-spacing:0.06em;
          text-transform:uppercase; border-radius:7px; transition:color 0.2s; user-select:none;
        }
        .ls-spin { position:absolute; inset:0; border-radius:10px; display:flex; align-items:center; justify-content:center; z-index:10; background:rgba(8,8,20,0.55); }
        .ls-ring { width:14px; height:14px; border-radius:50%; border:2px solid rgba(99,102,241,0.25); border-top-color:var(--color-primary-400,#818cf8); animation:_sp 0.7s linear infinite; }
      `}</style>
			<button onClick={toggle} disabled={isPending} className="ls-wrap" aria-label={isEN ? t("langSwitch.ariaToAr") : t("langSwitch.ariaToEn")}>
				<span className="ls-thumb" style={{ left: isEN ? "3px" : "calc(50% + 0px)" }} />
				<span className="ls-seg" style={{ color: isEN ? "#fff" : "rgba(255,255,255,0.35)" }}>
					<span style={{ fontSize: "12px" }}>🇬🇧</span>EN
				</span>
				<span className="ls-seg" style={{ color: !isEN ? "#fff" : "rgba(255,255,255,0.35)" }}>
					<span style={{ fontSize: "12px" }}>🇸🇦</span>ع
				</span>
				{isPending && <span className="ls-spin"><span className="ls-ring" /></span>}
			</button>
		</>
	);
}

// ─── UserDropdown ─────────────────────────────────────────────────────────────

function UserDropdown({ user, onClose, isRTL }) {
	const t = useTranslations("home.navbar");
	const quickLinks = getRoleQuickLinks(user.role, t);

	const handleLogout = () => { localStorage.removeItem("user"); window.location.href = "/"; };

	return (
		<>
			<style>{`
        @keyframes _udin { from{opacity:0;transform:translateY(-6px) scale(0.975)} to{opacity:1;transform:translateY(0) scale(1)} }
        .ud-wrap { animation:_udin 0.2s cubic-bezier(0.34,1.56,0.64,1) both; }
        @keyframes _onl { 0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0.5)} 50%{box-shadow:0 0 0 4px rgba(16,185,129,0)} }
        .ud-online { animation:_onl 2.4s ease infinite; }
        .ud-row:hover .ud-arr { opacity:1; transform:translateX(${isRTL ? "-2px" : "2px"}); }
      `}</style>
			<div
				className="ud-wrap absolute top-[calc(100%+12px)] z-50 w-[280px] rounded-2xl overflow-hidden"
				style={{
					[isRTL ? "left" : "right"]: 0,
					direction: isRTL ? "rtl" : "ltr",
					background: "rgba(9,9,20,0.98)",
					border: "1px solid rgba(255,255,255,0.07)",
					backdropFilter: "blur(28px)",
					boxShadow: "0 20px 60px rgba(0,0,0,0.65)",
				}}
			>
				{/* Accent bar */}
				<div style={{ height: "2px", background: "linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-to))" }} />

				{/* User info */}
				<div className="px-3.5 pt-3.5 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
					<div className="flex items-center gap-2.5">
						<div className="relative shrink-0">
							<div className="h-11 w-11 rounded-[11px] flex items-center justify-center text-[15px] font-black text-white"
								style={{ background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))", boxShadow: "0 4px 14px rgba(99,102,241,0.35)" }}>
								{getInitials(user.name)}
							</div>
							<span className={`ud-online absolute -bottom-0.5 ${isRTL ? "-left-0.5" : "-right-0.5"} h-3 w-3 rounded-full bg-emerald-400 border-2 border-[#09091a] block`} />
						</div>
						<div className="min-w-0 flex-1">
							<p className="text-[13px] font-bold text-white truncate leading-tight">{user.name}</p>
							<p className="text-[10px] text-white/35 truncate mt-0.5">{user.email}</p>
							<span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white"
								style={{ background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))" }}>
								{getRoleIcon(user.role)}{getRoleLabel(user.role, t)}
							</span>
						</div>
					</div>

					{user.points != null && (
						<div className="mt-2.5 flex items-center justify-between rounded-xl px-3 py-2"
							style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.14)" }}>
							<div className="flex items-center gap-1.5">
								<Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
								<span className="text-[13px] font-black text-white">{user.points.toLocaleString()}</span>
								<span className="text-[10px] text-white/35">{t("dropdown.points")}</span>
							</div>
							<div className="flex items-center gap-1.5">
								<span className={`h-1.5 w-1.5 rounded-full ${user.status === "active" ? "bg-emerald-400" : "bg-white/20"}`} />
								<span className={`text-[10px] font-semibold ${user.status === "active" ? "text-emerald-400" : "text-white/35"}`}>
									{t(`status.${user.status}`)}
								</span>
							</div>
						</div>
					)}
				</div>

				{/* Quick chips */}
				{quickLinks.length > 0 && (
					<div className="px-3 pt-2.5 pb-1">
						<p className="text-[9px] font-bold uppercase tracking-[0.13em] text-white/20 mb-2">{t("quickLinks.sectionLabel")}</p>
						<div className="flex flex-wrap gap-1">
							{quickLinks.map((l) => (
								<Link key={l.href} href={l.href} onClick={onClose}
									className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[10px] font-bold no-underline transition-all hover:-translate-y-px"
									style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.18)", color: "var(--color-primary-400)" }}>
									{l.icon}{l.label}
								</Link>
							))}
						</div>
						<div className="mt-2.5 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
					</div>
				)}

				{/* Actions */}
				<div className="p-1.5 space-y-px">
					{[
						{ href: getDashboardPath(user.role), icon: <LayoutDashboard className="h-[14px] w-[14px]" />, label: t("dropdown.dashboard"), accent: true },
						{ href: "/profile", icon: <User className="h-[14px] w-[14px]" />, label: t("dropdown.myProfile"), accent: false },
					].map((item) => (
						<Link key={item.label} href={item.href} onClick={onClose}
							className="ud-row group flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] no-underline transition-colors hover:bg-white/[0.05]">
							<div className="h-7 w-7 rounded-[8px] flex items-center justify-center text-white shrink-0"
								style={item.accent
									? { background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))" }
									: { background: "rgba(255,255,255,0.06)" }
								}>
								{item.icon}
							</div>
							<span className="flex-1 text-[12px] font-semibold text-white/60 group-hover:text-white transition-colors">{item.label}</span>
							<svg className="ud-arr h-3 w-3 text-white/25 opacity-0 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"
								style={isRTL ? { transform: "scaleX(-1)" } : {}}>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
							</svg>
						</Link>
					))}
				</div>

				{/* Sign out */}
				<div className="p-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
					<button onClick={handleLogout}
						className="group flex w-full items-center gap-2.5 px-2.5 py-2 rounded-[10px] transition-colors hover:bg-red-500/[0.09] cursor-pointer">
						<div className="h-7 w-7 rounded-[8px] flex items-center justify-center text-red-400 group-hover:bg-red-500/18 transition-colors shrink-0"
							style={{ background: "rgba(239,68,68,0.1)" }}>
							<LogOut className="h-[13px] w-[13px]" />
						</div>
						<span className="text-[12px] font-semibold text-red-400 group-hover:text-red-300 transition-colors">{t("dropdown.signOut")}</span>
					</button>
				</div>
			</div>
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
		<div ref={ref} className="relative">
			<button
				onClick={() => setOpen((v) => !v)}
				aria-label={t("dropdown.openMenu")}
				aria-expanded={open}
				className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-[12px] cursor-pointer outline-none transition-all duration-200"
				style={{
					border: open
						? "1px solid rgba(99,102,241,0.4)"
						: "1px solid rgba(255,255,255,0.08)",
					background: open
						? "rgba(99,102,241,0.1)"
						: "rgba(255,255,255,0.03)",
					boxShadow: open ? "0 0 0 3px rgba(99,102,241,0.1)" : "none",
				}}
			>
				<div className="relative shrink-0">
					<div className="h-[28px] w-[28px] rounded-[9px] flex items-center justify-center text-[12px] font-black text-white"
						style={{ background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))" }}>
						{getInitials(user.name)}
					</div>
					<span className="absolute -bottom-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-[2px] border-[#08081a] block"
						style={isRTL ? { left: "-2px" } : { right: "-2px" }} />
				</div>
				<span className="hidden sm:block text-[12px] font-bold text-white max-w-[72px] truncate">{firstName}</span>
				<ChevronDown className={`h-[13px] w-[13px] text-white/30 shrink-0 transition-transform duration-250 ${open ? "rotate-180" : ""}`} />
			</button>
			{open && <UserDropdown user={user} onClose={() => setOpen(false)} isRTL={isRTL} />}
		</div>
	);
}

// ─── MobileDrawer ─────────────────────────────────────────────────────────────

function MobileDrawer({ isOpen, onClose, navItems, user, onLogout, isRTL }) {
	const t = useTranslations("home.navbar");

	return (
		<>
			<style>{`
        @keyframes _bdin { from{opacity:0} to{opacity:1} }
        @keyframes _itmIn { from{opacity:0;transform:translateX(${isRTL ? "16px" : "-16px"})} to{opacity:1;transform:translateX(0)} }
        .drw-item { animation:_itmIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both; }
        .drw-item:nth-child(1){animation-delay:0.03s}.drw-item:nth-child(2){animation-delay:0.07s}
        .drw-item:nth-child(3){animation-delay:0.11s}.drw-item:nth-child(4){animation-delay:0.15s}
        .drw-item:nth-child(5){animation-delay:0.19s}.drw-item:nth-child(6){animation-delay:0.23s}
      `}</style>

			{/* Backdrop */}
			{isOpen && (
				<div onClick={onClose} className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-[3px]"
					style={{ animation: "_bdin 0.25s ease" }} />
			)}

			{/* Drawer — compact: 272px on mobile, 310px on sm+ */}
			<div
				className={`fixed top-0 bottom-0 z-[201] flex flex-col overflow-y-auto transition-transform duration-[380ms] ease-[cubic-bezier(0.4,0,0.2,1)]
          w-[272px] sm:w-[310px]
          ${isRTL ? "right-0 left-auto" : "left-0 right-auto"}
          ${isOpen ? "translate-x-0" : isRTL ? "translate-x-full" : "-translate-x-full"}
        `}
				style={{
					direction: isRTL ? "rtl" : "ltr",
					background: "rgba(7,7,17,0.99)",
					backdropFilter: "blur(28px)",
					borderLeft: isRTL ? "none" : undefined,
					borderRight: isRTL ? undefined : "none",
					border: isRTL ? "0 0 0 1px rgba(255,255,255,0.06)" : "0 1px 0 0 rgba(255,255,255,0.06)",
					boxShadow: isRTL ? "-10px 0 48px rgba(0,0,0,0.7)" : "10px 0 48px rgba(0,0,0,0.7)",
				}}
			>
				{/* Top accent */}
				<div className="h-[2px] shrink-0" style={{ background: "linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-via), var(--color-gradient-to))" }} />

				{/* Header */}
				<div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
					<div className="flex items-center gap-2.5">
						<div className="h-9 w-9 rounded-[10px] flex items-center justify-center shrink-0"
							style={{ background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))", boxShadow: "0 4px 14px rgba(99,102,241,0.35)" }}>
							<Dumbbell className="h-[18px] w-[18px] text-white" strokeWidth={2.5} />
						</div>
						<div>
							<p className="text-[14px] font-black text-white leading-none">{t("brand.name")}</p>
							<p className="text-[8px] font-semibold uppercase tracking-[0.18em] mt-0.5" style={{ color: "var(--color-primary-400)" }}>{t("brand.tagline")}</p>
						</div>
					</div>
					<button onClick={onClose} aria-label={t("mobile.close")}
						className="h-8 w-8 flex items-center justify-center rounded-[9px] cursor-pointer transition-colors"
						style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }}>
						<X className="h-[14px] w-[14px]" />
					</button>
				</div>

				{/* User card */}
				{user && (
					<div className="px-3 py-2.5 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
						<div className="rounded-[14px] overflow-hidden" style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.14)" }}>
							<div className="h-[2px]" style={{ background: "linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-to))" }} />
							<div className="p-3 flex items-center gap-2.5">
								<div className="relative shrink-0">
									<div className="h-10 w-10 rounded-[11px] flex items-center justify-center text-[14px] font-black text-white"
										style={{ background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))" }}>
										{getInitials(user.name)}
									</div>
									<span className={`absolute -bottom-0.5 ${isRTL ? "-left-0.5" : "-right-0.5"} h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[#07071a] block`} />
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-[13px] font-extrabold text-white truncate">{user.name}</p>
									<span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-[2px] rounded-full text-[8px] font-black uppercase tracking-wider text-white"
										style={{ background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))" }}>
										{getRoleIcon(user.role)}{getRoleLabel(user.role, t)}
									</span>
								</div>
								{user.points != null && (
									<div className="flex flex-col items-center shrink-0 px-2 py-1.5 rounded-[9px]"
										style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.18)" }}>
										<Star className="h-[10px] w-[10px] fill-yellow-400 text-yellow-400" />
										<span className="text-[11px] font-black text-white leading-none mt-0.5">{user.points}</span>
										<span className="text-[7px] text-white/30 uppercase">{t("dropdown.pts")}</span>
									</div>
								)}
							</div>
						</div>
					</div>
				)}

				{/* Nav */}
				<nav className="p-2.5 flex-1">


					{user && (
						<>
							<p className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/20 px-2 pb-2 pt-1">{t("mobile.sectionNav")}</p>
							<div className="flex flex-col gap-0.5">
								<Link href={getDashboardPath(user.role)} onClick={onClose}
									className="flex items-center gap-2.5 px-3 py-2.5 rounded-[11px] no-underline font-semibold text-[13px] transition-colors"
									style={{ background: "rgba(99,102,241,0.09)", border: "1px solid rgba(99,102,241,0.2)", color: "var(--color-primary-300)" }}>
									<div className="h-8 w-8 rounded-[9px] flex items-center justify-center text-white shrink-0"
										style={{ background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))" }}>
										<LayoutDashboard className="h-[14px] w-[14px]" />
									</div>
									{t("dropdown.dashboard")}
								</Link>

								{getRoleQuickLinks(user.role, t).map((link) => (
									<Link key={link.href} href={link.href} onClick={onClose}
										className="flex items-center gap-2.5 px-3 py-2.5 rounded-[11px] no-underline font-semibold text-[13px] transition-all hover:bg-white/[0.04]"
										style={{ border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)" }}>
										<div className="h-8 w-8 rounded-[9px] flex items-center justify-center shrink-0"
											style={{ background: "rgba(99,102,241,0.08)", color: "var(--color-primary-400)" }}>
											{link.icon}
										</div>
										{link.label}
									</Link>
								))}

								<button onClick={() => { onLogout(); onClose(); }}
									className="flex items-center gap-2.5 px-3 py-2.5 rounded-[11px] w-full cursor-pointer font-semibold text-[13px] transition-colors"
									style={{ border: "1px solid rgba(239,68,68,0.15)", background: "rgba(239,68,68,0.05)", color: "#f87171" }}
									onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.1)"}
									onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.05)"}>
									<div className="h-8 w-8 rounded-[9px] flex items-center justify-center shrink-0" style={{ background: "rgba(239,68,68,0.1)" }}>
										<LogOut className="h-[14px] w-[14px]" />
									</div>
									{t("dropdown.signOut")}
								</button>
							</div>
						</>
					)}
				</nav>

				{!user && (
					<div className="p-3 shrink-0">
						<Link href="/auth" onClick={onClose}
							className="flex items-center justify-center gap-2 py-3 rounded-[12px] text-white font-extrabold text-[13px] no-underline transition-all hover:-translate-y-0.5"
							style={{ background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))", boxShadow: "0 4px 20px rgba(99,102,241,0.4)" }}>
							<Zap className="h-[13px] w-[13px] fill-white" />
							{t("mobile.joinCta")}
						</Link>
					</div>
				)}

				<div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[rgba(7,7,17,0.9)] to-transparent" />
			</div>
		</>
	);
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

export default function PowerfulNavbar() {
	const t = useTranslations("home.navbar");
	const locale = useLocale();
	const isRTL = locale === "ar";

	const [mobileOpen, setMobileOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);
	const [visible, setVisible] = useState(true);
	const [lastY, setLastY] = useState(0);
	const [user, setUser] = useState(null);

	useEffect(() => {
		try { const r = localStorage.getItem("user"); if (r) setUser(JSON.parse(r)); } catch (_) { }
	}, []);

	useEffect(() => {
		const onScroll = () => {
			const y = window.scrollY;
			setScrolled(y > 40);
			setVisible(y < lastY || y < 80);
			if (y > lastY && y > 80) setMobileOpen(false);
			setLastY(y);
		};
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, [lastY]);

	useEffect(() => {
		document.body.style.overflow = mobileOpen ? "hidden" : "";
		return () => { document.body.style.overflow = ""; };
	}, [mobileOpen]);

	const navItems = [
		{ label: t("nav.home"), href: "#home", icon: "🏠" },
		{ label: t("nav.about"), href: "#about", icon: "ℹ️" },
		{ label: t("nav.community"), href: "#community", icon: "👥" },
		{ label: t("nav.pricing"), href: "#pricing", icon: "💰" },
	];

	const handleLogout = () => { localStorage.removeItem("user"); setUser(null); };

	return (
		<>
			<style>{`
        @keyframes _glw { 0%,100%{opacity:0.45} 50%{opacity:0.8} }
        .logo-glow { animation:_glw 3.5s ease-in-out infinite; }
        .nav-lnk { position:relative; }
        .nav-lnk::after {
          content:''; position:absolute; bottom:5px; left:50%;
          width:0; height:1.5px; border-radius:2px;
          background:linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-to));
          transform:translateX(-50%); transition:width 0.22s ease;
        }
        .nav-lnk:hover::after { width:55%; }
      `}</style>

			<nav
				className={`fixed left-0 right-0 top-0 z-50 transition-[transform,background,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${visible ? "translate-y-0" : "-translate-y-full"}
        `}
				style={{
					direction: isRTL ? "rtl" : "ltr",
					background: scrolled ? "rgba(7,7,17,0.97)" : "linear-gradient(to bottom, rgba(7,7,17,0.7), transparent)",
					borderBottom: scrolled ? "1px solid rgba(255,255,255,0.07)" : "1px solid transparent",
					backdropFilter: "blur(24px)",
					boxShadow: scrolled ? "0 2px 30px rgba(0,0,0,0.5)" : "none",
				}}
			>
				<div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex h-[62px] sm:h-[68px] items-center justify-between gap-3">

						{/* Logo */}
						<Link href="/" className="flex items-center gap-2.5 no-underline shrink-0 group">
							<div className="relative">
								<div className="logo-glow absolute inset-0 rounded-[12px] blur-[12px] pointer-events-none"
									style={{ background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))" }} />
								<div className="relative h-[40px] w-[40px] sm:h-[42px] sm:w-[42px] rounded-[12px] flex items-center justify-center transition-transform duration-200 group-hover:scale-[1.05]"
									style={{ background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))", boxShadow: "0 4px 16px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.18)" }}>
									<Dumbbell className="h-[20px] w-[20px] sm:h-[22px] sm:w-[22px] text-white" strokeWidth={2.5} />
								</div>
							</div>
							<div>
								<span className="text-[17px] sm:text-[19px] font-black text-white tracking-[-0.02em] leading-none">{t("brand.name")}</span>
								<p className="text-[8px] font-bold uppercase tracking-[0.2em] mt-[3px]" style={{ color: "var(--color-primary-400)" }}>{t("brand.tagline")}</p>
							</div>
						</Link>

						{/* Desktop links */}
						<div className="hidden lg:flex items-center gap-0.5">
							{navItems.map((item, i) => (
								<a key={i} href={item.href}
									className="nav-lnk px-4 py-2 rounded-[10px] text-[13px] font-semibold no-underline transition-all duration-200 tracking-[0.01em]"
									style={{ color: "rgba(255,255,255,0.5)" }}
									onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.9)"; e.currentTarget.style.background = "rgba(99,102,241,0.07)"; }}
									onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.background = ""; }}>
									{item.label}
								</a>
							))}
						</div>

						{/* Right side */}
						<div className="flex items-center gap-2 shrink-0">
							<LangSwitch />

							{user ? (
								<div className="hidden md:block">
									<AvatarButton user={user} isRTL={isRTL} />
								</div>
							) : (
								<Link href="/auth"
									className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-[11px] text-white font-bold text-[13px] no-underline transition-all duration-200 hover:-translate-y-px tracking-[0.01em]"
									style={{ background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))", boxShadow: "0 2px 14px rgba(99,102,241,0.38), inset 0 1px 0 rgba(255,255,255,0.14)" }}
									onMouseEnter={e => e.currentTarget.style.boxShadow = "0 6px 22px rgba(99,102,241,0.5), inset 0 1px 0 rgba(255,255,255,0.14)"}
									onMouseLeave={e => e.currentTarget.style.boxShadow = "0 2px 14px rgba(99,102,241,0.38), inset 0 1px 0 rgba(255,255,255,0.14)"}>
									<Zap className="h-[13px] w-[13px] fill-white" />
									{t("nav.joinNow")}
								</Link>
							)}

							{/* Hamburger */}
							<button
								onClick={() => setMobileOpen((v) => !v)}
								aria-label={mobileOpen ? t("mobile.close") : t("mobile.open")}
								className="lg:hidden flex h-9 w-9 items-center justify-center rounded-[10px] cursor-pointer transition-all duration-200"
								style={{
									border: mobileOpen ? "1px solid rgba(99,102,241,0.38)" : "1px solid rgba(255,255,255,0.08)",
									background: mobileOpen ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.03)",
									color: mobileOpen ? "var(--color-primary-300)" : "rgba(255,255,255,0.6)",
								}}
							>
								<div className={`transition-transform duration-300 ${mobileOpen ? "rotate-90" : ""}`}>
									{mobileOpen ? <X className="h-[15px] w-[15px]" strokeWidth={2.5} /> : <Menu className="h-[15px] w-[15px]" strokeWidth={2.5} />}
								</div>
							</button>
						</div>
					</div>
				</div>

				{/* Bottom shimmer when scrolled */}
				{scrolled && (
					<div className="absolute bottom-0 left-0 right-0 h-px opacity-45 pointer-events-none"
						style={{ background: "linear-gradient(90deg, transparent 0%, var(--color-gradient-from) 30%, var(--color-gradient-to) 70%, transparent 100%)" }} />
				)}
			</nav>

			<MobileDrawer
				isOpen={mobileOpen}
				onClose={() => setMobileOpen(false)}
				navItems={navItems}
				user={user}
				onLogout={handleLogout}
				isRTL={isRTL}
			/>
		</>
	);
}