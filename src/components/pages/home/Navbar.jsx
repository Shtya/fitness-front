"use client";

import { useTranslations, useLocale } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
	Dumbbell, Menu, X, LogOut, LayoutDashboard,
	User, Crown, Shield, Star, ChevronDown,
	Building2, Wallet, CalendarDays, MessageCircle,
	Home, Info, Layers, CircleHelp, Mail, Sun, Moon, ArrowLeft, ArrowRight,
} from "lucide-react";
import { useState, useEffect, useRef, useTransition, useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BRAND_LOGO_SRC } from "@/lib/brand";
import { resolvePostLoginPath } from "@/lib/nav-access";
import { clearClientSession } from "@/lib/session-cleanup";
import { useTheme } from "@/app/[locale]/theme";

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
	const link = (key, href, Icon, tone) => ({ href, icon: <Icon />, label: t(`quickLinks.${key}`), hint: t(`quickLinks.hints.${key}`), tone });
	const common = [
		link("myCalendar", "/workspace?tab=calendar", CalendarDays, "sky"),
		link("whatsapp", "/dashboard/whatsapp", MessageCircle, "wa"),
		link("money", "/money", Wallet, "amber"),
	];
	if (isAdmin) return [link("workspace", "/dashboard/workspace", Building2, "accent"), ...common];
	return [link("myExercise", "/dashboard/my/workouts", Dumbbell, "accent"), ...common];
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
				onPhoto ? "text-white hover:bg-white/15" : "text-[var(--hm-ink,#161616)] hover:bg-[var(--hm-chalk,rgba(0,0,0,0.05))]",
			].join(" ")}
			style={isEN ? { fontFamily: "var(--font-arabic), sans-serif" } : undefined}
		>
			{isPending ? "…" : isEN ? "عربي" : "EN"}
		</button>
	);
}

// ─── Account menu ─────────────────────────────────────────────────────────────

function AccountMenu({ user, onClose, onSignOut, triggerRef }) {
	const t = useTranslations("home.navbar");
	const locale = useLocale();
	const { mode, setMode } = useTheme();
	const menuRef = useRef(null);
	const quickLinks = getRoleQuickLinks(user.role, t);
	const lastIsOdd = quickLinks.length % 2 === 1;
	const isDark = mode === "dark";
	const Forward = locale === "ar" ? ArrowLeft : ArrowRight;

	// Focus the first item on open; arrows / Home / End move between items.
	useEffect(() => {
		menuRef.current?.querySelector("[data-um-item]")?.focus({ preventScroll: true });
	}, []);

	const onKeyDown = event => {
		const items = [...(menuRef.current?.querySelectorAll("[data-um-item]") || [])];
		const index = items.indexOf(document.activeElement);
		const go = next => {
			event.preventDefault();
			items[(next + items.length) % items.length]?.focus();
		};
		if (event.key === "ArrowDown") go(index + 1);
		else if (event.key === "ArrowUp") go(index - 1);
		else if (event.key === "Home") go(0);
		else if (event.key === "End") go(items.length - 1);
		else if (event.key === "Escape") {
			event.preventDefault();
			onClose();
			triggerRef.current?.focus();
		} else if (event.key === "Tab") onClose();
	};

	return (
		<motion.div
			ref={menuRef}
			role="menu"
			aria-label={t("dropdown.openMenu")}
			onKeyDown={onKeyDown}
			initial={{ opacity: 0, y: -8, scale: 0.97 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
			transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
			className="hm-um"
		>
			{/* Identity card in the organisation's colours */}
			<div className="hm-um__card">
				<div className="hm-um__card-top">
					<span className="hm-um__avatar is-lg" aria-hidden="true">
						{getInitials(user.name)}
						<i className="hm-um__online" />
					</span>
					<div className="hm-um__who">
						<p className="hm-um__name" dir="auto">{user.name}</p>
						{user.email ? <p className="hm-um__email" dir="ltr">{user.email}</p> : null}
					</div>
				</div>
				<div className="hm-um__chips">
					<span className="hm-um__chip">
						{getRoleIcon(user.role)}
						{getRoleLabel(user.role, t)}
					</span>
					<span className="hm-um__chip is-status">
						<i aria-hidden="true" />
						{t("dropdown.online")}
					</span>
				</div>
				<Link href={getDashboardPath(user)} onClick={onClose} role="menuitem" data-um-item className="hm-um__cta">
					<LayoutDashboard aria-hidden="true" />
					<span>{t("dropdown.openDashboard")}</span>
					<Forward className="hm-um__cta-arrow" aria-hidden="true" />
				</Link>
			</div>

			{quickLinks.length > 0 && (
				<div className="hm-um__section">
					<p className="hm-um__label">{t("quickLinks.sectionLabel")}</p>
					<div className="hm-um__grid">
						{quickLinks.map((l, index) => (
							<Link
								key={l.href}
								href={l.href}
								onClick={onClose}
								role="menuitem"
								data-um-item
								className={`hm-um__tile is-${l.tone}${lastIsOdd && index === quickLinks.length - 1 ? " is-wide" : ""}`}
							>
								<span className="hm-um__tile-icon" aria-hidden="true">{l.icon}</span>
								<span className="hm-um__tile-text">
									<b>{l.label}</b>
									<small>{l.hint}</small>
								</span>
							</Link>
						))}
					</div>
				</div>
			)}

			<div className="hm-um__section is-list">
				<Link href="/profile" onClick={onClose} role="menuitem" data-um-item className="hm-um__row">
					<span className="hm-um__row-icon" aria-hidden="true"><User /></span>
					<span className="flex-1">{t("dropdown.myProfile")}</span>
					<Forward className="hm-um__row-arrow" aria-hidden="true" />
				</Link>
				<button
					type="button"
					role="menuitemcheckbox"
					aria-checked={isDark}
					data-um-item
					onClick={() => setMode(isDark ? "light" : "dark")}
					className="hm-um__row"
				>
					<span className="hm-um__row-icon" aria-hidden="true">{isDark ? <Moon /> : <Sun />}</span>
					<span className="flex-1">{t("dropdown.darkMode")}</span>
					<span className={`hm-um__switch${isDark ? " is-on" : ""}`} aria-hidden="true"><i /></span>
				</button>
			</div>

			<div className="hm-um__section is-list">
				<button type="button" role="menuitem" data-um-item onClick={onSignOut} className="hm-um__row is-danger">
					<span className="hm-um__row-icon" aria-hidden="true"><LogOut /></span>
					<span className="flex-1">{t("dropdown.signOut")}</span>
				</button>
			</div>
		</motion.div>
	);
}

function AvatarButton({ user, onSignOut }) {
	const t = useTranslations("home.navbar");
	const [open, setOpen] = useState(false);
	const ref = useRef(null);
	const triggerRef = useRef(null);
	const firstName = user.name?.split(" ")[0] ?? user.name;

	useEffect(() => {
		if (!open) return undefined;
		const onDown = e => {
			if (ref.current && !ref.current.contains(e.target)) setOpen(false);
		};
		document.addEventListener("pointerdown", onDown);
		return () => document.removeEventListener("pointerdown", onDown);
	}, [open]);

	return (
		<div ref={ref} className="relative">
			<button
				ref={triggerRef}
				type="button"
				onClick={() => setOpen(v => !v)}
				onKeyDown={e => {
					if (e.key === "ArrowDown" && !open) {
						e.preventDefault();
						setOpen(true);
					}
				}}
				aria-label={t("dropdown.openMenu")}
				aria-haspopup="menu"
				aria-expanded={open}
				className={`hm-um-trigger hm-focus${open ? " is-open" : ""}`}
			>
				<span className="hm-um__avatar" aria-hidden="true">
					{getInitials(user.name)}
					<i className="hm-um__online" />
				</span>
				<span className="hm-um-trigger__name" dir="auto">{firstName}</span>
				<ChevronDown className="hm-um-trigger__chev" aria-hidden="true" />
			</button>
			<AnimatePresence>
				{open && (
					<AccountMenu
						user={user}
						triggerRef={triggerRef}
						onClose={() => setOpen(false)}
						onSignOut={() => {
							setOpen(false);
							onSignOut();
						}}
					/>
				)}
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
		{ label: t("nav.workflow"), href: "#how-it-works-section", id: "how-it-works-section", icon: Info },
		{ label: t("nav.inbox"), href: "#inbox-section", id: "inbox-section", icon: MessageCircle },
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
		const onScroll = () => setScrolled(window.scrollY > 12);
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
		if (!mobileOpen) return undefined;
		const onKey = event => {
			if (event.key === "Escape") setMobileOpen(false);
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [mobileOpen]);

	useEffect(() => {
		const ids = ["hero", ...navItems.map(item => item.id)];
		const nodes = ids.map(id => document.getElementById(id)).filter(Boolean);
		if (!nodes.length) return undefined;
		const observer = new IntersectionObserver(
			entries => {
				const hit = entries
					.filter(entry => entry.isIntersecting)
					.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
				if (hit?.target?.id) setActiveId(hit.target.id);
			},
			{ rootMargin: "-30% 0px -55% 0px", threshold: [0.15, 0.4] },
		);
		nodes.forEach(node => observer.observe(node));
		return () => observer.disconnect();
		// navItems are static per locale.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// End the server session too, not just the cached user.
	const signOut = async () => {
		try {
			await fetch("/api/auth/logout", { method: "POST" });
		} catch {
			/* still clear this device */
		}
		await clearClientSession();
		setUser(null);
	};

	const solid = scrolled || mobileOpen;

	return (
		<header className={`hm-nav${solid ? " is-solid" : ""}`} dir={isRTL ? "rtl" : "ltr"}>
			<a href="#hero-title" className="hm-skip">
				{t("mobile.skipToContent")}
			</a>
			<div className="hm-container hm-nav__bar">
				<Link href="/" className="hm-nav__brand hm-focus">
					<img src={BRAND_LOGO_SRC} alt="" className="hm-logo h-9 w-9 shrink-0 object-contain" />
					<span>{t("brand.name")}</span>
				</Link>

				<nav className="hm-nav__links" aria-label={t("mobile.sectionNav")}>
					{navItems.map(item => {
						const on = activeId === item.id;
						return (
							<a
								key={item.id}
								href={item.href}
								aria-current={on ? "true" : undefined}
								className="hm-nav__link hm-focus"
							>
								{item.label}
							</a>
						);
					})}
				</nav>

				<div className="hm-nav__actions">
					<LangSwitch />
					{user ? (
						<div className="hidden md:block">
							<AvatarButton user={user} onSignOut={signOut} />
						</div>
					) : (
						<Link href="/auth" className="hm-btn hm-btn--primary hm-nav__cta">
							{t("nav.joinNow")}
						</Link>
					)}
					<button
						type="button"
						onClick={() => setMobileOpen(open => !open)}
						aria-expanded={mobileOpen}
						aria-controls="hm-mobile-menu"
						aria-label={mobileOpen ? t("mobile.close") : t("mobile.open")}
						className="hm-nav__burger hm-focus"
					>
						{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
					</button>
				</div>
			</div>

			<AnimatePresence>
				{mobileOpen && (
					<motion.div
						id="hm-mobile-menu"
						initial={{ opacity: 0, y: -6 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
						transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
						className="hm-nav__sheet"
					>
						<nav className="hm-container flex flex-col" aria-label={t("mobile.sectionNav")}>
							{navItems.map(item => {
								const Icon = item.icon;
								const on = activeId === item.id;
								return (
									<a
										key={item.id}
										href={item.href}
										onClick={() => setMobileOpen(false)}
										aria-current={on ? "true" : undefined}
										className="hm-nav__sheet-link hm-focus"
									>
										<Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
										{item.label}
									</a>
								);
							})}
							<div className="mt-3 border-t border-[var(--hm-line)] pt-4">
								{user ? (
									<div className="flex flex-col gap-1">
										<Link
											href={getDashboardPath(user)}
											onClick={() => setMobileOpen(false)}
											className="hm-nav__sheet-link hm-focus"
										>
											<LayoutDashboard className="h-5 w-5" aria-hidden="true" />
											{t("dropdown.dashboard")}
										</Link>
										<button
											type="button"
											onClick={() => {
												setMobileOpen(false);
												signOut();
											}}
											className="hm-nav__sheet-link is-danger hm-focus"
										>
											<LogOut className="h-5 w-5" aria-hidden="true" />
											{t("dropdown.signOut")}
										</button>
									</div>
								) : (
									<Link
										href="/auth"
										onClick={() => setMobileOpen(false)}
										className="hm-btn hm-btn--primary w-full"
									>
										{t("nav.joinNow")}
									</Link>
								)}
							</div>
						</nav>
					</motion.div>
				)}
			</AnimatePresence>
		</header>
	);
}
