"use client";

import { useTranslations, useLocale } from "next-intl";
import {
  Dumbbell, Menu, X, Zap, LogOut, LayoutDashboard,
  User, Crown, Shield, ChevronDown, Star,
  Building2, Wallet, CalendarDays,
} from "lucide-react";
import { useState, useEffect, useRef, useTransition, useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// ─── CSS Variables ─────────────────────────────────────────────────────────────
const CSS_VARS = `
  :root {
    --color-primary-50:#eef2ff;--color-primary-100:#e0e7ff;--color-primary-200:#c7d2fe;
    --color-primary-300:#a5b4fc;--color-primary-400:#818cf8;--color-primary-500:#6366f1;
    --color-primary-600:#4f46e5;--color-primary-700:#4338ca;--color-primary-800:#3730a3;
    --color-primary-900:#312e81;--color-secondary-50:#faf5ff;--color-secondary-100:#f3e8ff;
    --color-secondary-200:#e9d5ff;--color-secondary-300:#d8b4fe;--color-secondary-400:#c084fc;
    --color-secondary-500:#a855f7;--color-secondary-600:#9333ea;--color-secondary-700:#7e22ce;
    --color-secondary-800:#6b21a8;--color-secondary-900:#581c87;
    --color-gradient-from:#6366f1;--color-gradient-via:#8b5cf6;--color-gradient-to:#a855f7;
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setDocumentLangDir(nextLocale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = nextLocale;
  document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
}

function setLocaleCookie(nextLocale) {
  if (typeof document === "undefined") return;
  document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;
}

function showGlobalLoader(label) {
  if (typeof document === "undefined") return;
  const existing = document.getElementById("lang-switch-loader");
  if (existing) existing.remove();
  const root = document.createElement("div");
  root.id = "lang-switch-loader";
  root.style.cssText =
    "position:fixed;inset:0;z-index:9999;display:grid;place-items:center;backdrop-filter:blur(6px);background:rgba(8,8,18,0.75)";
  root.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:16px;">
      <div style="position:relative;height:56px;width:56px;">
        <div style="position:absolute;inset:0;border-radius:50%;border:3px solid rgba(99,102,241,0.2);border-top-color:#6366f1;animation:nspin 0.8s linear infinite;"></div>
        <div style="position:absolute;inset:6px;border-radius:50%;border:3px solid rgba(168,85,247,0.2);border-bottom-color:#a855f7;animation:nspin 1.2s linear infinite reverse;"></div>
        <div style="position:absolute;inset:0;display:grid;place-items:center;">
          <div style="height:8px;width:8px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#a855f7);animation:npulse 1s ease-in-out infinite;"></div>
        </div>
      </div>
      <span style="font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;background:linear-gradient(135deg,#818cf8,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${label}</span>
    </div>
    <style>
      @keyframes nspin{to{transform:rotate(360deg)}}
      @keyframes npulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.6;transform:scale(0.8)}}
    </style>`;
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

// ─── Lang Switch ──────────────────────────────────────────────────────────────


function LangSwitch() {
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
      showGlobalLoader(
        isEN ? t("langSwitch.switchingToAr") : t("langSwitch.switchingToEn")
      );
      setLocaleCookie(nextLocale);
      setDocumentLangDir(nextLocale);
      router.replace(nextHref);
      router.refresh();
    });
  }

  useEffect(() => { setDocumentLangDir(locale); }, [locale]);

  return (
    <>
      {/* Scoped keyframes — injected once */}
      <style>{`
        @keyframes ls-slide-ltr {
          from { transform: translateX(0%); }
          to   { transform: translateX(100%); }
        }
        @keyframes ls-slide-rtl {
          from { transform: translateX(100%); }
          to   { transform: translateX(0%); }
        }
        @keyframes ls-spin {
          to { transform: rotate(360deg); }
        }
        .ls-root {
          position: relative;
          display: inline-flex;
          align-items: center;
          height: 36px;
          border-radius: 10px;
          padding: 3px;
          cursor: pointer;
          border: none;
          background: rgba(255,255,255,0.06);
          box-shadow:
            inset 0 1px 3px rgba(0,0,0,0.35),
            0 0 0 1px rgba(255,255,255,0.08);
          transition: box-shadow 0.25s ease, opacity 0.2s;
          gap: 0;
        }
        .ls-root:hover {
          box-shadow:
            inset 0 1px 3px rgba(0,0,0,0.35),
            0 0 0 1px rgba(99,102,241,0.45),
            0 0 18px rgba(99,102,241,0.18);
        }
        .ls-root:disabled {
          opacity: 0.5;
          cursor: wait;
        }
        /* The sliding thumb */
        .ls-thumb {
          position: absolute;
          top: 3px;
          bottom: 3px;
          width: calc(50% - 3px);
          border-radius: 7px;
          background: linear-gradient(
            135deg,
            var(--color-gradient-from, #6366f1),
            var(--color-gradient-to,   #a855f7)
          );
          box-shadow:
            0 2px 10px rgba(99,102,241,0.55),
            inset 0 1px 0 rgba(255,255,255,0.2);
          transition: left 0.28s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
          z-index: 1;
        }
        /* Label common */
        .ls-label {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          width: 52px;
          height: 100%;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          border-radius: 7px;
          transition: color 0.22s ease;
          user-select: none;
        }
        /* Flag emoji — crisp sizing */
        .ls-flag {
          font-size: 13px;
          line-height: 1;
          display: inline-block;
        }
        /* Pending spinner overlay */
        .ls-spinner {
          position: absolute;
          inset: 0;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          background: rgba(8,8,18,0.6);
          backdrop-filter: blur(2px);
        }
        .ls-spinner-ring {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid rgba(99,102,241,0.3);
          border-top-color: #818cf8;
          animation: ls-spin 0.7s linear infinite;
        }
      `}</style>

      <button
        onClick={toggle}
        disabled={isPending}
        aria-label={isEN ? t("langSwitch.ariaToAr") : t("langSwitch.ariaToEn")}
        className="ls-root"
      >
        {/* Sliding gradient thumb */}
        <span
          className="ls-thumb"
          style={{
            left: isEN
              ? "3px"                    /* EN side (left) */
              : "calc(50% + 0px)",       /* AR side (right) */
          }}
        />

        {/* EN option */}
        <span
          className="ls-label"
          style={{ color: isEN ? "#fff" : "rgba(255,255,255,0.38)" }}
        >
          <span className="ls-flag">🇬🇧</span>
          EN
        </span>

        {/* AR option */}
        <span
          className="ls-label"
          style={{ color: !isEN ? "#fff" : "rgba(255,255,255,0.38)" }}
        >
          <span className="ls-flag">🇸🇦</span>
          ع
        </span>

        {/* Loading overlay */}
        {isPending && (
          <span className="ls-spinner">
            <span className="ls-spinner-ring" />
          </span>
        )}
      </button>
    </>
  );
}

// ─── Role Helpers ─────────────────────────────────────────────────────────────

function getDashboardPath(role) {
  switch (role) {
    case "admin":
    case "coach": return "/dashboard/users";
    case "super_admin": return "/dashboard/super-admin/users";
    default: return "/dashboard/my/workouts";
  }
}

function getRoleIcon(role) {
  switch (role) {
    case "super_admin": return <Crown style={{ height: "11px", width: "11px" }} />;
    case "admin":       return <Shield style={{ height: "11px", width: "11px" }} />;
    case "coach":       return <Star style={{ height: "11px", width: "11px" }} />;
    default:            return <User style={{ height: "11px", width: "11px" }} />;
  }
}

function getRoleGradient(role) {
  switch (role) {
    case "super_admin": return "linear-gradient(135deg,#f59e0b,#f97316)";
    case "admin":       return "linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))";
    case "coach":       return "linear-gradient(135deg,var(--color-primary-400),var(--color-secondary-400))";
    default:            return "linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))";
  }
}

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Role-based quick links ───────────────────────────────────────────────────

function getRoleQuickLinks(role, t) {
  const isAdmin = role === "admin" || role === "super_admin" || role === "coach";
  const isClient = role === "client";

  if (isAdmin) {
    return [
      {
        href: "/dashboard/workspace",
        icon: <Building2 style={{ height: "14px", width: "14px" }} />,
        label: t("quickLinks.workspace"),
        color: "rgba(99,102,241,0.15)",
        iconColor: "#818cf8",
      },
			{
        href: "/workspace?tab=calendar",
        icon: <CalendarDays style={{ height: "14px", width: "14px" }} />,
        label: t("quickLinks.myCalendar"),
        color: "rgba(168,85,247,0.12)",
        iconColor: "#c084fc",
      },
      {
        href: "/money",
        icon: <Wallet style={{ height: "14px", width: "14px" }} />,
        label: t("quickLinks.money"),
        color: "rgba(16,185,129,0.12)",
        iconColor: "#10b981",
      },
    ];
  }

  if (isClient) {
    return [
      {
        href: "/dashboard/my/workouts",
        icon: <Dumbbell style={{ height: "14px", width: "14px" }} />,
        label: t("quickLinks.myExercise"),
        color: "rgba(99,102,241,0.15)",
        iconColor: "#818cf8",
      },
      {
        href: "/workspace?tab=calendar",
        icon: <CalendarDays style={{ height: "14px", width: "14px" }} />,
        label: t("quickLinks.myCalendar"),
        color: "rgba(168,85,247,0.12)",
        iconColor: "#c084fc",
      },
      {
        href: "/money",
        icon: <Wallet style={{ height: "14px", width: "14px" }} />,
        label: t("quickLinks.money"),
        color: "rgba(16,185,129,0.12)",
        iconColor: "#10b981",
      },
    ];
  }

  return [];
}

 
 
function UserDropdown({ user, onClose, isRTL }) {
  const t = useTranslations("home.navbar");
  const dashboardPath = getDashboardPath(user.role);
  const roleGradient  = getRoleGradient(user.role);
  const quickLinks    = getRoleQuickLinks(user.role, t);

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const actions = [
    {
      href: dashboardPath,
      icon: <LayoutDashboard className="h-[15px] w-[15px]" />,
      label: t("dropdown.dashboard"),
      useRoleGrad: true,
    },
    {
      href: "/profile",
      icon: <User className="h-[15px] w-[15px]" />,
      label: t("dropdown.myProfile"),
      useRoleGrad: false,
    },
  ];
 
  const gradStyle = { "--role-grad": roleGradient } 

  return (
    <div
      style={gradStyle}
      className={[
        "absolute top-[calc(100%+14px)] z-50",
        isRTL ? "left-0 right-auto" : "right-0 left-auto",
        isRTL ? "direction-rtl" : "direction-ltr",
        "w-[300px] rounded-[20px]",
        "border border-indigo-500/20",
        "bg-[rgba(10,10,20,0.97)] backdrop-blur-2xl",
        "shadow-[0_24px_60px_rgba(0,0,0,0.7),0_0_0_1px_rgba(99,102,241,0.1)]",
        "overflow-hidden",
        "animate-ud-in",
      ].join(" ")}
    >
      <style>{`
        @keyframes ud-in {
          from { opacity:0; transform:translateY(-8px) scale(0.97); }
          to   { opacity:1; transform:translateY(0)    scale(1);    }
        }
        .animate-ud-in { animation: ud-in 0.22s cubic-bezier(0.34,1.56,0.64,1) both; }

        @keyframes ud-dot-pulse {
          0%,100% { box-shadow: 0 0 0 0   rgba(16,185,129,0.55); }
          50%      { box-shadow: 0 0 0 5px rgba(16,185,129,0);    }
        }
        .ud-dot { animation: ud-dot-pulse 2.2s ease infinite; }

        /* role gradient helper — reads --role-grad CSS var */
        .ud-role-grad { background: var(--role-grad); }

        .ud-action-arrow { opacity:0; transition: opacity 0.15s, transform 0.15s; }
        .ud-action-row:hover .ud-action-arrow { opacity:1; transform: translateX(${isRTL ? "-2px" : "2px"}); }

        .ud-quick-chip { transition: transform 0.15s, box-shadow 0.15s; }
        .ud-quick-chip:hover { transform: translateY(-1px); }
      `}</style>

      {/* ── Top gradient bar ── */}
      <div className="ud-role-grad h-[3px] w-full" />

      {/* ── Background radial glow ── */}
      <div className="pointer-events-none absolute -top-10 left-1/2 h-24 w-48 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-2xl" />

      {/* ══ User info ══ */}
      <div className="border-b border-white/[0.06] px-4 pb-3 pt-4">
        <div className="flex items-center gap-3">

          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="ud-role-grad flex h-[52px] w-[52px] items-center justify-center rounded-[14px] text-lg font-black text-white shadow-[0_4px_16px_rgba(99,102,241,0.4)]">
              {getInitials(user.name)}
            </div>
            <span
              className={[
                "ud-dot absolute -bottom-0.5 block h-3.5 w-3.5 rounded-full",
                "bg-emerald-400 border-[2.5px] border-[#0a0a14]",
                isRTL ? "-left-0.5" : "-right-0.5",
              ].join(" ")}
            />
          </div>

          {/* Name / email / role badge */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold leading-tight text-white">
              {user.name}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-white/40">
              {user.email}
            </p>
            <div className="ud-role-grad mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white">
              {getRoleIcon(user.role)}
              {t(`roles.${user.role}`)}
            </div>
          </div>
        </div>

        {/* Points + status */}
        {user.points != null && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-indigo-500/[0.15] bg-indigo-500/[0.08] px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-[13px] font-black text-white">
                {user.points.toLocaleString()}
              </span>
              <span className="text-[11px] text-white/40">{t("dropdown.points")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={[
                "h-1.5 w-1.5 rounded-full",
                user.status === "active"
                  ? "bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]"
                  : "bg-white/20",
              ].join(" ")} />
              <span className={[
                "text-[11px] font-semibold",
                user.status === "active" ? "text-emerald-400" : "text-white/40",
              ].join(" ")}>
                {t(`status.${user.status}`)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ══ Quick role links ══ */}
      {quickLinks.length > 0 && (
        <>
          <div className="px-3 pb-1 pt-3">
            <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em] text-white/25">
              {t("quickLinks.sectionLabel")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onClose}
                  className="ud-quick-chip inline-flex items-center gap-1.5 rounded-[9px] px-2.5 py-1.5 text-[11px] font-bold no-underline"
                  style={{
                    background: link.color,
                    border: `1px solid ${link.iconColor}35`,
                    color: link.iconColor,
                  }}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="mx-3 mt-2 h-px bg-white/[0.05]" />
        </>
      )}

      {/* ══ Main action links ══ */}
      <div className="space-y-0.5 p-2">
        {actions.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            onClick={onClose}
            className="ud-action-row group flex items-center gap-2.5 rounded-xl px-3 py-2.5 no-underline transition-colors duration-150 hover:bg-indigo-500/10"
          >
            <div className={[
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-white",
              item.useRoleGrad ? "ud-role-grad shadow-sm" : "bg-white/[0.06]",
            ].join(" ")}>
              {item.icon}
            </div>
            <span className="flex-1 text-[13px] font-semibold text-white/70 transition-colors group-hover:text-white">
              {item.label}
            </span>
            <svg
              className={[
                "ud-action-arrow h-3.5 w-3.5 text-white/30",
                isRTL ? "scale-x-[-1]" : "",
              ].join(" ")}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>

      {/* ══ Sign out ══ */}
      <div className="border-t border-white/[0.05] p-2">
        <button
          onClick={handleLogout}
          className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors duration-150 hover:bg-red-500/10"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-red-500/10 text-red-400 transition-colors group-hover:bg-red-500/20">
            <LogOut className="h-[15px] w-[15px]" />
          </div>
          <span className="flex-1 text-left text-[13px] font-semibold text-red-400 transition-colors group-hover:text-red-300">
            {t("dropdown.signOut")}
          </span>
        </button>
      </div>
    </div>
  );
}

 
function AvatarButton({ user, isRTL }) {
  const t = useTranslations("home.navbar");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const roleGradient = getRoleGradient(user.role);
  const firstName = user.name?.split(" ")[0] ?? user.name;

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <>
      <style>{`
        @keyframes ab-pulse {
          0%,100% { box-shadow: 0 0 0 0   rgba(16,185,129,0.55); }
          50%      { box-shadow: 0 0 0 4px rgba(16,185,129,0);    }
        }
        @keyframes ab-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }

        .ab-btn {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 4px 10px 4px 4px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03);
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
          outline: none;
          position: relative;
          overflow: hidden;
        }

        /* Shimmer sweep on hover */
        .ab-btn::before {
          content: "";
          position: absolute; inset: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255,255,255,0.05) 50%,
            transparent 100%
          );
          background-size: 200% 100%;
          opacity: 0;
          transition: opacity 0.2s;
          pointer-events: none;
        }
        .ab-btn:hover::before {
          opacity: 1;
          animation: ab-shimmer 1.4s ease infinite;
        }

        /* Hover state */
        .ab-btn:hover {
          border-color: rgba(99,102,241,0.4);
          background: rgba(99,102,241,0.07);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.08), 0 4px 20px rgba(0,0,0,0.3);
        }

        /* Open state */
        .ab-btn--open {
          border-color: rgba(99,102,241,0.55) !important;
          background: rgba(99,102,241,0.1) !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12), 0 0 24px rgba(99,102,241,0.2) !important;
        }

        /* Avatar hover lift */
        .ab-avatar-inner {
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .ab-btn:hover .ab-avatar-inner,
        .ab-btn--open .ab-avatar-inner {
          transform: scale(1.06);
          box-shadow: 0 4px 14px rgba(99,102,241,0.5);
        }

        /* Glow ring behind avatar */
        .ab-avatar-glow {
          position: absolute; inset: -3px;
          border-radius: 13px;
          filter: blur(8px);
          opacity: 0;
          transition: opacity 0.25s;
          z-index: 0;
          pointer-events: none;
        }
        .ab-btn:hover .ab-avatar-glow,
        .ab-btn--open .ab-avatar-glow { opacity: 0.45; }

        /* Pulsing online dot */
        .ab-dot {
          animation: ab-pulse 2.4s ease infinite;
        }

        /* Chevron */
        .ab-chevron {
          transition: transform 0.28s cubic-bezier(0.4,0,0.2,1), color 0.2s;
        }
        .ab-btn:hover .ab-chevron { color: rgba(255,255,255,0.7) !important; }
        .ab-btn--open .ab-chevron {
          transform: rotate(180deg);
          color: #a5b4fc !important;
        }

        /* Focus ring */
        .ab-btn:focus-visible {
          box-shadow: 0 0 0 2px #6366f1;
        }
      `}</style>

      <div ref={ref} style={{ position: "relative" }}>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={t("dropdown.openMenu")}
          aria-expanded={open}
          aria-haspopup="true"
          className={`ab-btn${open ? " ab-btn--open" : ""}`}
        >
          {/* ── Avatar ── */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            {/* Blurred glow ring */}
            <div
              className="ab-avatar-glow"
              style={{ background: roleGradient }}
            />
            {/* Avatar square */}
            <div
              className="ab-avatar-inner"
              style={{
                width: "30px", height: "30px",
                borderRadius: "10px",
                background: roleGradient,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 900, fontSize: "13px",
                letterSpacing: "-0.02em",
                position: "relative", zIndex: 1,
              }}
            >
              {getInitials(user.name)}
            </div>
            {/* Online dot — flips side for RTL */}
            <span
              className="ab-dot"
              style={{
                position: "absolute",
                bottom: "-2px",
                ...(isRTL ? { left: "-2px" } : { right: "-2px" }),
                width: "10px", height: "10px",
                borderRadius: "50%",
                background: "#10b981",
                border: "2px solid #080812",
                display: "block",
                zIndex: 2,
              }}
            />
          </div>

          {/* ── Name + role (hidden on xs, shown sm+) ── */}
          <div
            className="navbar-avatar-name"
            style={{ display: "none", flexDirection: "column", gap: "1px", minWidth: 0 }}
          >
            <span style={{
              fontSize: "12px", fontWeight: 800,
              color: "#fff", lineHeight: 1.2,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              maxWidth: "80px",
            }}>
              {firstName}
            </span> 
          </div>

          {/* ── Chevron ── */}
          <svg
            className="ab-chevron"
            style={{
              width: "14px", height: "14px",
              color: "rgba(255,255,255,0.35)",
              flexShrink: 0,
            }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && <UserDropdown user={user} onClose={() => setOpen(false)} isRTL={isRTL} />}
      </div>
    </>
  );
}
 
function MobileOverlay({ isOpen, onClose, navItems, user, onLogout, isRTL }) {
  const t = useTranslations("home.navbar");
  const roleGradient = user
    ? getRoleGradient(user.role)
    : "linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))";

  // Slide in from the leading edge (left in LTR, right in RTL)
  const drawerEdge = isRTL
    ? { right: 0, left: "auto", borderLeft: "1px solid rgba(99,102,241,0.15)", boxShadow: "-8px 0 60px rgba(0,0,0,0.8)" }
    : { left: 0, right: "auto", borderRight: "1px solid rgba(99,102,241,0.15)", boxShadow: "8px 0 60px rgba(0,0,0,0.8)" };

  const slideOut = isRTL ? "translateX(100%)" : "translateX(-100%)";
  const arrowFlip = { height: "14px", width: "14px", opacity: 0.35, flexShrink: 0, transform: isRTL ? "scaleX(-1)" : "none" };

  return (
    <>
      <style>{`
        @keyframes noverlayIn{from{opacity:0}to{opacity:1}}
        @keyframes nslideItem{from{opacity:0;transform:translateX(${isRTL ? "24px" : "-24px"})}to{opacity:1;transform:translateX(0)}}
        .mnav-item{animation:nslideItem 0.4s cubic-bezier(0.34,1.56,0.64,1) both;}
        .mnav-item:nth-child(1){animation-delay:.05s}.mnav-item:nth-child(2){animation-delay:.1s}
        .mnav-item:nth-child(3){animation-delay:.15s}.mnav-item:nth-child(4){animation-delay:.2s}
        .mnav-item:nth-child(5){animation-delay:.25s}.mnav-item:nth-child(6){animation-delay:.3s}
      `}</style>

      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
        animation: "noverlayIn 0.3s ease",
        display: isOpen ? "block" : "none",
      }} />

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, bottom: 0,
        width: "min(320px,85vw)", zIndex: 201,
        background: "rgba(8,8,18,0.98)", backdropFilter: "blur(32px)",
        ...drawerEdge,
        transform: isOpen ? "translateX(0)" : slideOut,
        transition: "transform 0.4s cubic-bezier(0.4,0,0.2,1)",
        display: "flex", flexDirection: "column", overflowY: "auto",
        direction: isRTL ? "rtl" : "ltr",
      }}>
        {/* Top gradient line */}
        <div style={{ height: "3px", background: "linear-gradient(90deg,var(--color-gradient-from),var(--color-gradient-via),var(--color-gradient-to))", flexShrink: 0 }} />

        {/* Header */}
        <div style={{ padding: "20px", borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                height: "38px", width: "38px", borderRadius: "11px",
                background: "linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
              }}>
                <Dumbbell style={{ height: "20px", width: "20px", color: "#fff" }} strokeWidth={2.5} />
              </div>
              <div>
                <span style={{ fontSize: "15px", fontWeight: 900, color: "#fff" }}>{t("brand.name")}</span>
                <p style={{ fontSize: "9px", fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.15em" }}>
                  {t("brand.tagline")}
                </p>
              </div>
            </div>
            <button onClick={onClose} aria-label={t("mobile.close")} style={{
              height: "36px", width: "36px", borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "rgba(255,255,255,0.6)",
            }}>
              <X style={{ height: "16px", width: "16px" }} />
            </button>
          </div>
        </div>

        {/* User card */}
        {user && (
          <div style={{ padding: "16px", borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
            <div style={{ borderRadius: "16px", background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.15)", overflow: "hidden" }}>
              <div style={{ height: "2px", background: roleGradient }} />
              <div style={{ padding: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div style={{
                      height: "44px", width: "44px", borderRadius: "12px",
                      background: roleGradient,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontWeight: 900, fontSize: "15px",
                    }}>
                      {getInitials(user.name)}
                    </div>
                    <span style={{
                      position: "absolute", bottom: "-1px",
                      ...(isRTL ? { left: "-1px" } : { right: "-1px" }),
                      height: "12px", width: "12px", borderRadius: "50%",
                      background: "#10b981", border: "2px solid #080812",
                    }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 800, color: "#fff", fontSize: "14px" }}>{user.name}</p>
                    <div style={{
                      marginTop: "4px", display: "inline-flex", alignItems: "center", gap: "3px",
                      borderRadius: "20px", padding: "2px 7px",
                      background: roleGradient, fontSize: "9px", fontWeight: 800,
                      textTransform: "uppercase", letterSpacing: "0.1em", color: "#fff",
                    }}>
                      {getRoleIcon(user.role)}
                      {t(`roles.${user.role}`)}
                    </div>
                  </div>
                  {user.points != null && (
                    <div style={{
                      display: "flex", flexDirection: "column", alignItems: "center",
                      background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)",
                      borderRadius: "10px", padding: "5px 8px", flexShrink: 0,
                    }}>
                      <Star style={{ height: "11px", width: "11px", color: "#fbbf24", fill: "#fbbf24" }} />
                      <span style={{ fontSize: "12px", fontWeight: 900, color: "#fff", lineHeight: 1.1 }}>{user.points}</span>
                      <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>
                        {t("dropdown.pts")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nav section */}
        <nav style={{ padding: "12px", flex: 1 }}>
          <p style={{ fontSize: "9px", fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.15em", padding: "4px 10px 10px" }}>
            {t("mobile.sectionNav")}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {navItems.map((item, index) => (
              <a key={index} href={item.href} onClick={onClose} className="mnav-item" style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "12px 14px", borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.02)",
                color: "rgba(255,255,255,0.65)", fontWeight: 600, fontSize: "14px",
                textDecoration: "none", transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.1)"; e.currentTarget.style.border = "1px solid rgba(99,102,241,0.2)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.border = "1px solid rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.65)"; }}
              >
                <div style={{
                  height: "36px", width: "36px", borderRadius: "10px",
                  background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "17px", flexShrink: 0,
                }}>
                  {item.icon}
                </div>
                <span style={{ flex: 1 }}>{item.label}</span>
                <svg style={arrowFlip} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            ))}
          </div>

          {/* Account section */}
          {user && (
            <>
              <p style={{ fontSize: "9px", fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.15em", padding: "16px 10px 10px" }}>
                {t("mobile.sectionAccount")}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <Link href={getDashboardPath(user.role)} onClick={onClose} style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "12px 14px", borderRadius: "12px",
                  background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
                  color: "#c4b5fd", fontWeight: 700, fontSize: "14px",
                  textDecoration: "none", transition: "all 0.2s",
                }}>
                  <div style={{ height: "36px", width: "36px", borderRadius: "10px", background: roleGradient, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <LayoutDashboard style={{ height: "16px", width: "16px", color: "#fff" }} />
                  </div>
                  {t("dropdown.dashboard")}
                </Link>

                {/* Role quick links in mobile */}
                {getRoleQuickLinks(user.role, t).map((link) => (
                  <Link key={link.href} href={link.href} onClick={onClose} style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "12px 14px", borderRadius: "12px",
                    background: link.color,
                    border: `1px solid ${link.iconColor}25`,
                    color: link.iconColor, fontWeight: 700, fontSize: "14px",
                    textDecoration: "none", transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                  >
                    <div style={{
                      height: "36px", width: "36px", borderRadius: "10px", flexShrink: 0,
                      background: `${link.iconColor}18`,
                      border: `1px solid ${link.iconColor}30`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: link.iconColor,
                    }}>
                      {link.icon}
                    </div>
                    {link.label}
                  </Link>
                ))}

                <button onClick={() => { onLogout(); onClose(); }} style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "12px 14px", borderRadius: "12px",
                  background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
                  color: "#f87171", fontWeight: 700, fontSize: "14px",
                  cursor: "pointer", width: "100%", transition: "all 0.2s",
                }}>
                  <div style={{ height: "36px", width: "36px", borderRadius: "10px", background: "rgba(239,68,68,0.12)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <LogOut style={{ height: "16px", width: "16px" }} />
                  </div>
                  {t("dropdown.signOut")}
                </button>
              </div>
            </>
          )}
        </nav>

        {/* Guest CTA */}
        {!user && (
          <div style={{ padding: "16px", flexShrink: 0 }}>
            <Link href="/auth" onClick={onClose} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              padding: "14px", borderRadius: "14px",
              background: "linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))",
              color: "#fff", fontWeight: 800, fontSize: "14px",
              textDecoration: "none", boxShadow: "0 4px 24px rgba(99,102,241,0.45)",
            }}>
              <Zap style={{ height: "15px", width: "15px" }} fill="white" />
              {t("mobile.joinCta")}
            </Link>
          </div>
        )}

        {/* Bottom fade */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "80px", background: "linear-gradient(to top,rgba(8,8,18,0.95),transparent)", pointerEvents: "none" }} />
      </div>
    </>
  );
}

// ─── Main Navbar ───────────────────────────────────────────────────────────────

export default function PowerfulNavbar() {
  const t = useTranslations("home.navbar");
  const locale = useLocale();
  const isRTL = locale === "ar";

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) setUser(JSON.parse(raw));
    } catch (_) {}
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setIsScrolled(y > 50);
      setIsVisible(y < lastScrollY || y < 100);
      if (y > lastScrollY && y > 100) setIsMobileMenuOpen(false);
      setLastScrollY(y);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobileMenuOpen]);

  const navItems = [
    { label: t("nav.home"),      href: "#home",      icon: "🏠" },
    { label: t("nav.about"),     href: "#about",     icon: "ℹ️" },
    { label: t("nav.community"), href: "#community", icon: "👥" },
    { label: t("nav.pricing"),   href: "#pricing",   icon: "💰" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <>
      <style>{CSS_VARS}</style>
      <style>{`
        @keyframes nnavGlow{0%,100%{opacity:0.5}50%{opacity:0.85}}
        .navbar-logo-glow{animation:nnavGlow 3s ease-in-out infinite;}
        .navbar-avatar-name{display:none;}
        @media(min-width:640px){.navbar-avatar-name{display:block !important;}}
        @media(min-width:1024px){.lg-flex{display:flex !important;}.lg-hide{display:none !important;}}
        @media(min-width:768px){.md-block{display:block !important;}.md-flex{display:flex !important;}}
      `}</style>

      <nav style={{
        position: "fixed", left: 0, right: 0, top: 0, zIndex: 50,
        transition: "transform 0.5s cubic-bezier(0.4,0,0.2,1),background 0.3s ease,box-shadow 0.3s ease",
        transform: isVisible ? "translateY(0)" : "translateY(-100%)",
        background: isScrolled
          ? "rgba(8,8,18,0.97)"
          : "linear-gradient(to bottom,rgba(8,8,18,0.75),transparent)",
        backdropFilter: "blur(24px)",
        borderBottom: isScrolled ? "1px solid rgba(99,102,241,0.12)" : "1px solid transparent",
        boxShadow: isScrolled ? "0 4px 40px rgba(0,0,0,0.5)" : "none",
        direction: isRTL ? "rtl" : "ltr",
      }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", height: "72px", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>

            {/* Logo */}
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none", flexShrink: 0 }}>
              <div style={{ position: "relative" }}>
                <div className="navbar-logo-glow" style={{
                  position: "absolute", inset: 0, borderRadius: "12px",
                  background: "linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))",
                  filter: "blur(16px)", pointerEvents: "none",
                }} />
                <div style={{
                  position: "relative", height: "46px", width: "46px", borderRadius: "13px",
                  background: "linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 4px 20px rgba(99,102,241,0.45),inset 0 1px 0 rgba(255,255,255,0.2)",
                }}>
                  <Dumbbell style={{ height: "24px", width: "24px", color: "#fff" }} strokeWidth={2.5} />
                </div>
              </div>
              <div>
                <span style={{ fontSize: "20px", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1 }}>
                  {t("brand.name")}
                </span>
                <p style={{ fontSize: "9px", fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.2em", marginTop: "2px" }}>
                  {t("brand.tagline")}
                </p>
              </div>
            </Link>

            {/* Desktop nav */}
            <div style={{ display: "none", alignItems: "center", gap: "2px" }} className="lg-flex">
              {navItems.map((item, i) => (
                <a key={i} href={item.href} style={{
                  padding: "8px 16px", borderRadius: "12px",
                  fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.55)",
                  textDecoration: "none", transition: "all 0.25s", letterSpacing: "0.01em",
                }}
                onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(99,102,241,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.55)"; e.currentTarget.style.background = "transparent"; }}
                >
                  {item.label}
                </a>
              ))}
            </div>

            {/* Right side actions */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
              <LangSwitch />

              {user ? (
                <div style={{ display: "none" }} className="md-block">
                  <AvatarButton user={user} isRTL={isRTL} />
                </div>
              ) : (
                <Link href="/auth" style={{
                  display: "none", alignItems: "center", gap: "7px",
                  padding: "9px 18px", borderRadius: "12px",
                  background: "linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))",
                  color: "#fff", fontWeight: 700, fontSize: "13px",
                  textDecoration: "none",
                  boxShadow: "0 2px 16px rgba(99,102,241,0.4),inset 0 1px 0 rgba(255,255,255,0.15)",
                  transition: "all 0.25s", letterSpacing: "0.01em",
                }} className="md-flex"
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(99,102,241,0.5)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 16px rgba(99,102,241,0.4),inset 0 1px 0 rgba(255,255,255,0.15)"; }}
                >
                  <Zap style={{ height: "14px", width: "14px" }} fill="white" />
                  {t("nav.joinNow")}
                </Link>
              )}

              {/* Hamburger */}
              <button
                onClick={() => setIsMobileMenuOpen((v) => !v)}
                aria-label={isMobileMenuOpen ? t("mobile.close") : t("mobile.open")}
                style={{
                  display: "flex", height: "40px", width: "40px",
                  alignItems: "center", justifyContent: "center", borderRadius: "11px",
                  border: isMobileMenuOpen ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(255,255,255,0.08)",
                  background: isMobileMenuOpen ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.04)",
                  cursor: "pointer", transition: "all 0.25s", color: "#fff",
                }}
                className="lg-hide"
              >
                <div style={{ transition: "transform 0.3s", transform: isMobileMenuOpen ? "rotate(90deg)" : "rotate(0deg)" }}>
                  {isMobileMenuOpen
                    ? <X style={{ height: "18px", width: "18px" }} strokeWidth={2.5} />
                    : <Menu style={{ height: "18px", width: "18px" }} strokeWidth={2.5} />}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Scrolled accent line */}
        {isScrolled && (
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: "1px",
            background: "linear-gradient(90deg,transparent,var(--color-gradient-from) 30%,var(--color-gradient-to) 70%,transparent)",
            opacity: 0.5,
          }} />
        )}
      </nav>

      <MobileOverlay
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        navItems={navItems}
        user={user}
        onLogout={handleLogout}
        isRTL={isRTL}
      />
    </>
  );
}