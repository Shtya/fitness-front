"use client";

import React, {
  useState, createContext, useContext,
  useEffect, useMemo, useCallback,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import axios from "axios";
import { useTranslations, useLocale } from "next-intl";
import { AlertCircle, Eye, EyeOff, Lock, Mail, ChevronRight, ChevronLeft } from "lucide-react";
import { BRAND_LOGO_SRC } from "@/lib/brand";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { loginPersist } from "@/app/role-access";
import { useTenantTheme } from "@/lib/tenant/TenantThemeProvider";
import { resolvePostLoginPath } from "@/lib/nav-access";
import { readLastRoute } from "@/lib/last-route";
import Link from "next/link";
import { useParams } from "next/navigation";

/* ─────────────────────────────────────────────────────────────────────────
   AXIOS INSTANCE
───────────────────────────────────────────────────────────────────────── */
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL + "/api/v1",
  headers: { "Content-Type": "application/json" },
});
axiosInstance.interceptors.request.use((cfg) => {
  if (typeof window !== "undefined") {
    const tok = localStorage.getItem("accessToken");
    if (tok) cfg.headers.Authorization = `Bearer ${tok}`;
  }
  return cfg;
}, (e) => Promise.reject(e));
axiosInstance.interceptors.response.use((r) => r, async (error) => {
  const orig = error.config;
  const url = (orig?.url || "").toLowerCase();
  const SKIP = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];
  if (SKIP.some((p) => url.includes(p))) return Promise.reject(error);
  if (error.response?.status === 401 && !orig?._retry) {
    const rt = typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;
    if (!rt) return Promise.reject(error);
    orig._retry = true;
    try {
      const { data } = await axiosInstance.post("/auth/refresh", { refreshToken: rt });
      const { accessToken: at, refreshToken: nrt } = data || {};
      if (typeof window !== "undefined") {
        if (at) localStorage.setItem("accessToken", at);
        if (nrt) localStorage.setItem("refreshToken", nrt);
      }
      if (at) orig.headers.Authorization = `Bearer ${at}`;
      return axiosInstance(orig);
    } catch (re) {
      if (typeof window !== "undefined") {
        ["accessToken", "refreshToken", "user"].forEach((k) => localStorage.removeItem(k));
        window.location.href = "/auth";
      }
      return Promise.reject(re);
    }
  }
  return Promise.reject(error);
});

/* ─────────────────────────────────────────────────────────────────────────
   CONTEXT / SCHEMA / HELPERS
───────────────────────────────────────────────────────────────────────── */
const AuthContext = createContext(null);

const loginSchema = yup.object({
  email: yup.string().email("invalidEmail").required("invalidEmail"),
  password: yup.string().min(1, "passwordRequired").required("passwordRequired"),
});

function getPostLoginPath(userOrRole, intendedPath) {
  if (userOrRole && typeof userOrRole === "object") {
    return resolvePostLoginPath(userOrRole, intendedPath);
  }
  return resolvePostLoginPath({ role: userOrRole }, intendedPath);
}

/** Prefer ?next= (middleware deep-link) then ?redirect= then last saved app route */
function readIntendedReturnPath(searchParams) {
  const fromQuery = searchParams?.get("next") || searchParams?.get("redirect") || null;
  if (fromQuery) return fromQuery;
  try {
    const saved = readLastRoute();
    if (saved?.path) return `${saved.path}${saved.search || ""}`;
  } catch {
    /* ignore */
  }
  return null;
}

/* Premium fitness atmosphere — no people (editorial / brand-safe) */
const HERO_IMG =
  "https://images.unsplash.com/photo-1593079831268-3381b210c8bd?auto=format&fit=crop&w=1800&q=80";
const FEATURE_IMG =
  "/auth.png";

/* ─────────────────────────────────────────────────────────────────────────
   INPUT FIELD
───────────────────────────────────────────────────────────────────────── */
const InputField = React.memo(({ id, label, type = "text", placeholder, autoComplete, registration, error, icon: Icon, suffix }) => {
  const [focused, setFocused] = useState(false);

  return (
    <div className="sf-field">
      <label htmlFor={id} className="sf-label" data-error={!!error}>
        {label}
      </label>
      <div className={`sf-input-wrap ${focused ? "focused" : ""} ${error ? "errored" : ""}`}>
        <div className="sf-icon">
          <Icon size={15} strokeWidth={1.75} />
        </div>
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...registration}
          className="sf-input"
        />
        {suffix && <div className="sf-suffix">{suffix}</div>}
      </div>
      {error && (
        <p id={`${id}-err`} role="alert" className="sf-error-msg">
          <AlertCircle size={10} strokeWidth={2.5} />
          {error}
        </p>
      )}
    </div>
  );
});
InputField.displayName = "InputField";

/* ─────────────────────────────────────────────────────────────────────────
   LOGIN FORM
───────────────────────────────────────────────────────────────────────── */
function LoginCard({ onLoggedIn }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const isRtl = locale === "ar";
  const searchParams = useSearchParams();
  const prefillEmail = searchParams?.get("email") || "";
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("AuthContext missing");
  const { setLoading, setError, loading } = auth;
  const [showPwd, setShowPwd] = useState(false);

  const { register, handleSubmit, formState: { errors }, setError: setRHError, setValue } = useForm({
    resolver: yupResolver(loginSchema),
    mode: "onTouched",
    defaultValues: { email: prefillEmail, password: "" },
  });

  useEffect(() => {
    if (prefillEmail) setValue("email", prefillEmail);
  }, [prefillEmail, setValue]);

  const onSubmit = useCallback(async (data) => {
    setLoading(true); setError(null);
    try {
      let discoveryToken = null;
      let tenantId = null;
      try {
        const cached = JSON.parse(localStorage.getItem("so7bafit_tenant_branding_v1") || "null");
        discoveryToken = cached?.discoveryToken || null;
        tenantId = cached?.tenant?.id || null;
      } catch {}
      const res = await axiosInstance.post("/auth/login", {
        ...data,
        ...(discoveryToken ? { discoveryToken } : {}),
        ...(tenantId ? { tenantId } : {}),
      });
      const { accessToken, refreshToken, user } = res.data || {};
      if (!accessToken || !refreshToken) throw new Error("Missing tokens");
      if (typeof window !== "undefined") {
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        localStorage.setItem("user", JSON.stringify(user || {}));
      }
      await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, refreshToken, user }),
      });
      loginPersist(user);
      toast.success(t("success.signedIn"));
      onLoggedIn?.(user);
    } catch (err) {
      let msg = err?.response?.data?.message || t("errors.loginFailed");
      if (err?.response?.status === 401) {
        const low = String(msg || "").toLowerCase();
        if (low.includes("pending")) msg = t("errors.accountPending");
        else if (low.includes("suspended")) msg = t("errors.accountSuspended");
      }
      const lm = String(msg).toLowerCase();
      if (lm.includes("email")) setRHError("email", { type: "server", message: "invalidEmail" });
      else if (lm.includes("password")) setRHError("password", { type: "server", message: "passwordRequired" });
      setError(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  }, [setLoading, setError, setRHError, onLoggedIn, t]);

  const ArrowIcon = isRtl ? ChevronLeft : ChevronRight;

  return (
    <div className="sf-form-block">
      <header className="sf-form-head">
        <h1 className="sf-heading">{t("signIn")}</h1>
        <p className="sf-subheading">{t("subtitle")}</p>
      </header>

      <form noValidate onSubmit={handleSubmit(onSubmit)} aria-label={t("formAriaLabel")} className="sf-form">
        <InputField
          id="sf-email"
          label={t("email")}
          type="email"
          placeholder={t("enterEmail")}
          autoComplete="email"
          icon={Mail}
          registration={register("email")}
          error={errors.email?.message ? t(String(errors.email.message)) : undefined}
        />
        <InputField
          id="sf-password"
          label={t("password")}
          type={showPwd ? "text" : "password"}
          placeholder={t("enterPassword")}
          autoComplete="current-password"
          icon={Lock}
          registration={register("password")}
          error={errors.password?.message ? t(String(errors.password.message)) : undefined}
          suffix={
            <button
              type="button"
              onClick={() => setShowPwd(p => !p)}
              aria-label={showPwd ? t("a11y.hidePassword") : t("a11y.showPassword")}
              className="sf-eye-btn"
            >
              {showPwd ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
            </button>
          }
        />

        <button type="submit" disabled={loading} className="sf-submit">
          <span className="sf-submit-content">
            {loading ? (
              <>
                <span className="sf-spinner" />
                {t("loading.signingIn")}
              </>
            ) : (
              <>
                {t("signInButton")}
                <ArrowIcon size={17} strokeWidth={2.25} className="sf-arrow" />
              </>
            )}
          </span>
        </button>
      </form>

      <div className="sf-lang-row">
        <span className="sf-lang-label">{t("language")}</span>
        <div className="sf-lang-pills" role="group" aria-label={t("language")}>
          {[
            { code: "en", label: "EN" },
            { code: "ar", label: "ع" },
          ].map(({ code, label }) => (
            <a key={code} href={`/${code}/auth`} className={`sf-lang-pill ${locale === code ? "active" : ""}`}>
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   PAGE ROOT
───────────────────────────────────────────────────────────────────────── */
export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const locale = useLocale();
  const isRtl = locale === "ar";
  const { appName, assets, clearTenant, colors } = useTenantTheme();
  const params = useParams();
  const localeParam = params?.locale || locale;

  const token = searchParams?.get("accessToken");
  const intendedReturn = readIntendedReturnPath(searchParams);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        if (typeof window !== "undefined") {
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete("accessToken");
          window.history.replaceState({}, "", `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
        }
        if (typeof window !== "undefined") localStorage.setItem("accessToken", token);
        const { data: user } = await axiosInstance.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (typeof window !== "undefined") localStorage.setItem("user", JSON.stringify(user || {}));
        await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: token }),
        });
        toast.success(t("success.signedIn"));
        const dest = getPostLoginPath(user, intendedReturn);
        router.replace(`/${localeParam}${dest.startsWith("/") ? dest : `/${dest}`}`);
      } catch (e) {
        console.error("OAuth login failed", e);
        toast.error(t("errors.loginFailed"));
      }
    })();
  }, [token, intendedReturn, router, t, localeParam]);

  const handleLoggedIn = useCallback((user) => {
    const dest = getPostLoginPath(user, intendedReturn);
    router.replace(`/${localeParam}${dest.startsWith("/") ? dest : `/${dest}`}`);
  }, [router, intendedReturn, localeParam]);

  const ctxVal = useMemo(() => ({ loading, setLoading, error, setError }), [loading, error]);
  const primary = colors?.primary || "#0d9488";
  const secondary = colors?.secondary || "#115e59";
  const logoSrc = assets?.logo || BRAND_LOGO_SRC;

  return (
    <AuthContext.Provider value={ctxVal}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Sora:wght@400;500;600;700;800&display=swap');

        .sf-root, .sf-root * { box-sizing: border-box; }
        .sf-root {
          --sf-ink: #0b1220;
          --sf-paper: #f7f4ef;
          --sf-paper-2: #fffdf9;
          --sf-mute: #5c6574;
          --sf-line: rgba(11, 18, 32, 0.1);
          --sf-primary: ${primary};
          --sf-secondary: ${secondary};
          font-family: 'Sora', 'Cairo', system-ui, sans-serif;
          height: 100dvh;
          width: 100%;
          max-width: 100%;
          overflow: hidden;
          position: relative;
          color: var(--sf-ink);
          background: var(--sf-ink);
        }
        [dir="rtl"] .sf-root { font-family: 'Cairo', 'Sora', system-ui, sans-serif; }

        .sf-stage {
          position: absolute; inset: 0;
          overflow: hidden;
          background: #0b1220;
        }
        @media (min-width: 900px) {
          /* Desktop: visual panel owns the photo — hide global stage wash */
          .sf-stage { opacity: 0; pointer-events: none; }
        }
        .sf-stage img {
          width: 100%; height: 100%;
          object-fit: cover; object-position: center 35%;
          transform: scale(1.04);
          filter: saturate(1.05) contrast(1.03);
          animation: sf-ken 18s ease-in-out infinite alternate;
        }
        @keyframes sf-ken {
          from { transform: scale(1.04) translate3d(0, 0, 0); }
          to { transform: scale(1.1) translate3d(-1.2%, -0.8%, 0); }
        }
        .sf-veil {
          position: absolute; inset: 0;
          background:
            linear-gradient(180deg, rgba(11,18,32,0.55) 0%, rgba(11,18,32,0.28) 42%, rgba(11,18,32,0.72) 100%);
        }
        .sf-glow {
          position: absolute;
          width: min(52vw, 520px); height: min(52vw, 520px);
          border-radius: 50%;
          right: -8%; bottom: -18%;
          background: radial-gradient(circle, color-mix(in srgb, var(--sf-primary) 35%, transparent), transparent 70%);
          filter: blur(8px);
          pointer-events: none;
          animation: sf-breathe 7s ease-in-out infinite;
        }
        [dir="rtl"] .sf-glow { right: auto; left: -8%; }
        @keyframes sf-breathe {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.06); }
        }

        .sf-shell {
          position: relative; z-index: 2;
          height: 100%;
          width: 100%;
          display: grid;
          grid-template-rows: minmax(0, 1fr) minmax(0, 1.05fr);
          overflow: hidden;
        }
        @media (min-width: 900px) {
          .sf-shell {
            grid-template-rows: 1fr;
            grid-template-columns: 1.2fr 0.8fr;
          }
          [dir="rtl"] .sf-shell {
            grid-template-columns: 0.8fr 1.2fr;
          }
        }

        .sf-visual {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: clamp(16px, 3vh, 32px) clamp(16px, 4vw, 48px);
          min-height: 0;
          color: #fff;
          overflow: hidden;
        }
        @media (min-width: 900px) {
          .sf-visual {
            padding: clamp(36px, 6vh, 64px) clamp(40px, 5vw, 72px);
          }
          [dir="rtl"] .sf-visual { order: 2; }
        }

        .sf-visual-media {
          position: absolute; inset: 0;
          z-index: 0;
          overflow: hidden;
        }
        .sf-visual-media img {
          width: 100%; height: 100%;
          object-fit: cover;
          object-position: center 35%;
          transform: scale(1.05);
          filter: saturate(1.05) contrast(1.03);
          animation: sf-ken 20s ease-in-out infinite alternate;
        }
        .sf-visual-media .sf-veil {
          background:
            linear-gradient(180deg, rgba(11,18,32,0.62) 0%, rgba(11,18,32,0.22) 38%, rgba(11,18,32,0.78) 100%),
            linear-gradient(90deg, rgba(11,18,32,0.35) 0%, transparent 55%);
        }
        @media (max-width: 899.98px) {
          .sf-visual-media { display: none; }
        }

        .sf-brand, .sf-feature, .sf-copy {
          position: relative;
          z-index: 1;
        }

        .sf-brand {
          display: flex; align-items: center; gap: 12px;
          animation: sf-rise 0.7s cubic-bezier(0.22,1,0.36,1) both;
        }
        .sf-brand-mark {
          width: clamp(44px, 7vw, 56px);
          height: clamp(44px, 7vw, 56px);
          border-radius: 16px;
          overflow: hidden;
          background: color-mix(in srgb, var(--sf-primary) 88%, #000);
          box-shadow: 0 10px 30px rgba(0,0,0,0.28);
          flex-shrink: 0;
        }
        .sf-brand-mark img {
          width: 100%; height: 100%; object-fit: contain;
          transform: scale(1.35);
        }
        .sf-brand-name {
          font-size: clamp(1.65rem, 5.5vw, 2.55rem);
          font-weight: 800;
          letter-spacing: -0.04em;
          line-height: 1;
          text-shadow: 0 8px 28px rgba(0,0,0,0.35);
        }
        [dir="rtl"] .sf-brand-name { letter-spacing: 0; }

        /* Mid visual — fills the empty band */
        .sf-feature {
          flex: 1 1 auto;
          min-height: 0;
          display: grid;
          place-items: center;
          margin: clamp(6px, 1.4vh, 14px) 0;
          animation: sf-rise 0.8s cubic-bezier(0.22,1,0.36,1) 0.1s both;
        }
        .sf-feature-orbit {
          position: relative;
          width: min(78%, 360px);
          max-height: 100%;
          aspect-ratio: 5 / 4;
        }
        @media (min-width: 900px) {
          .sf-feature-orbit {
            width: min(72%, 380px);
            aspect-ratio: 4 / 5;
            max-height: min(48vh, 440px);
          }
        }
        .sf-feature-ring {
          position: absolute;
          inset: -8%;
          border-radius: 32px;
          border: 1px solid color-mix(in srgb, var(--sf-primary) 35%, transparent);
          opacity: 0.55;
          animation: sf-ring 5.5s ease-in-out infinite;
          pointer-events: none;
        }
        .sf-feature-ring.is-2 {
          inset: -16%;
          opacity: 0.28;
          animation-delay: 0.6s;
          border-radius: 40px;
        }
        @keyframes sf-ring {
          0%, 100% { transform: scale(1); opacity: 0.45; }
          50% { transform: scale(1.03); opacity: 0.7; }
        }
        .sf-feature-frame {
          position: absolute;
          inset: 0;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.18);
          box-shadow:
            0 28px 50px rgba(0,0,0,0.45),
            0 0 0 1px rgba(255,255,255,0.06) inset;
          animation: sf-float 7s ease-in-out infinite;
          background: #122033;
        }
        .sf-feature-frame img {
          width: 100%; height: 100%;
          object-fit: cover;
          object-position: center 45%;
          filter: saturate(1.05) contrast(1.04);
          transform: scale(1.04);
        }
        .sf-feature-shade {
          position: absolute; inset: 0;
          background:
            linear-gradient(180deg, transparent 42%, rgba(11,18,32,0.55) 100%),
            linear-gradient(0deg, transparent 70%, rgba(11,18,32,0.25) 100%);
          pointer-events: none;
        }
        .sf-feature-chip {
          position: absolute;
          left: 12px; bottom: 12px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 11px;
          border-radius: 999px;
          background: rgba(11,18,32,0.55);
          border: 1px solid rgba(255,255,255,0.14);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          font-size: 0.7rem;
          font-weight: 700;
          color: rgba(255,255,255,0.92);
          letter-spacing: 0.01em;
        }
        [dir="rtl"] .sf-feature-chip { left: auto; right: 12px; }
        .sf-feature-chip i {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--sf-primary);
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--sf-primary) 25%, transparent);
          animation: sf-breathe 2.4s ease-in-out infinite;
        }
        @keyframes sf-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @media (max-height: 700px) {
          .sf-feature-orbit { max-height: 34vh; }
          .sf-feature-chip { display: none; }
        }
        @media (max-height: 620px) {
          .sf-feature { display: none; }
        }

        .sf-copy {
          margin-top: 0;
          max-width: 28rem;
          animation: sf-rise 0.75s cubic-bezier(0.22,1,0.36,1) 0.14s both;
        }
        .sf-copy h2 {
          margin: 0;
          font-size: clamp(1.15rem, 3.4vw, 2rem);
          font-weight: 700;
          line-height: 1.2;
          letter-spacing: -0.02em;
          text-shadow: 0 6px 24px rgba(0,0,0,0.35);
        }
        .sf-copy p {
          margin: 8px 0 0;
          font-size: clamp(0.82rem, 2vw, 0.98rem);
          line-height: 1.55;
          color: rgba(255,255,255,0.78);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        @media (max-height: 720px) {
          .sf-copy p { display: none; }
        }
        @media (min-width: 900px) {
          .sf-copy p {
            -webkit-line-clamp: 3;
            display: -webkit-box;
          }
        }

        .sf-panel {
          min-height: 0;
          display: flex;
          flex-direction: column;
          background: var(--sf-paper);
          border-radius: 28px 28px 0 0;
          padding: clamp(18px, 2.8vh, 28px) clamp(18px, 4vw, 36px) max(14px, env(safe-area-inset-bottom));
          box-shadow: 0 -18px 50px rgba(0,0,0,0.28);
          animation: sf-sheet 0.65s cubic-bezier(0.22,1,0.36,1) 0.05s both;
        }
        @media (min-width: 900px) {
          .sf-panel {
            border-radius: 0;
            justify-content: center;
            padding: clamp(28px, 5vh, 56px) clamp(36px, 5vw, 64px);
            background:
              linear-gradient(180deg, var(--sf-paper-2) 0%, var(--sf-paper) 100%);
            box-shadow: none;
          }
          [dir="rtl"] .sf-panel { order: 1; }
        }

        .sf-panel-inner {
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: clamp(12px, 2vh, 18px);
          min-height: 0;
          flex: 1;
          justify-content: center;
        }
        @media (min-width: 900px) {
          .sf-panel-inner { flex: 0; margin: 0; max-width: 420px; }
          [dir="rtl"] .sf-panel-inner { margin-inline-start: auto; }
        }

        .sf-form-block { display: flex; flex-direction: column; gap: clamp(12px, 2vh, 18px); }
        .sf-form-head { display: flex; flex-direction: column; gap: 4px; }
        .sf-heading {
          margin: 0;
          font-size: clamp(1.35rem, 3.5vw, 1.75rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--sf-ink);
        }
        [dir="rtl"] .sf-heading { letter-spacing: 0; }
        .sf-subheading {
          margin: 0;
          font-size: 0.9rem;
          color: var(--sf-mute);
          line-height: 1.4;
        }

        .sf-form { display: flex; flex-direction: column; gap: clamp(10px, 1.6vh, 14px); }
        .sf-field { display: flex; flex-direction: column; gap: 6px; }
        .sf-label {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #6b7380;
        }
        .sf-label[data-error="true"] { color: #b42318; }
        .sf-input-wrap {
          display: flex; align-items: center;
          min-height: 48px;
          border-radius: 14px;
          border: 1px solid var(--sf-line);
          background: #fff;
          transition: border-color 0.18s, box-shadow 0.18s;
        }
        .sf-input-wrap.focused {
          border-color: color-mix(in srgb, var(--sf-primary) 65%, #fff);
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--sf-primary) 16%, transparent);
        }
        .sf-input-wrap.errored {
          border-color: #f04438;
          box-shadow: 0 0 0 4px rgba(240,68,56,0.12);
        }
        .sf-icon {
          width: 42px; height: 48px;
          display: grid; place-items: center;
          color: #8b93a1;
          flex-shrink: 0;
        }
        .sf-input-wrap.focused .sf-icon { color: var(--sf-primary); }
        .sf-input {
          flex: 1; min-width: 0;
          height: 48px;
          border: 0; outline: none; background: transparent;
          font: inherit;
          font-size: 0.95rem;
          color: var(--sf-ink);
          padding-inline-end: 12px;
        }
        .sf-input::placeholder { color: #9aa3b2; }
        .sf-suffix { padding-inline-end: 8px; }
        .sf-eye-btn {
          width: 34px; height: 34px;
          border: 0; border-radius: 10px;
          background: transparent;
          color: #8b93a1;
          display: grid; place-items: center;
          cursor: pointer;
        }
        .sf-eye-btn:hover { background: rgba(11,18,32,0.05); color: var(--sf-ink); }
        .sf-error-msg {
          display: flex; align-items: center; gap: 5px;
          margin: 0;
          font-size: 0.75rem;
          font-weight: 600;
          color: #b42318;
        }

        .sf-submit {
          margin-top: 2px;
          width: 100%;
          min-height: 50px;
          border: 0;
          border-radius: 14px;
          cursor: pointer;
          background: linear-gradient(135deg, var(--sf-primary), var(--sf-secondary));
          color: #fff;
          box-shadow: 0 12px 28px color-mix(in srgb, var(--sf-primary) 30%, transparent);
          transition: transform 0.18s, filter 0.18s;
        }
        .sf-submit:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.04); }
        .sf-submit:active:not(:disabled) { transform: scale(0.985); }
        .sf-submit:disabled { opacity: 0.55; cursor: not-allowed; }
        .sf-submit-content {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          font-size: 0.95rem; font-weight: 700;
        }
        .sf-spinner {
          width: 15px; height: 15px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          animation: sf-spin 0.7s linear infinite;
        }
        @keyframes sf-spin { to { transform: rotate(360deg); } }
        .sf-arrow { transition: transform 0.18s; }
        .sf-submit:hover .sf-arrow { transform: translateX(3px); }
        [dir="rtl"] .sf-submit:hover .sf-arrow { transform: translateX(-3px); }

        .sf-lang-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px;
          padding-top: 2px;
        }
        .sf-lang-label {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #8b93a1;
        }
        .sf-lang-pills { display: inline-flex; gap: 6px; }
        .sf-lang-pill {
          min-width: 40px;
          padding: 7px 10px;
          border-radius: 10px;
          text-decoration: none;
          font-size: 0.78rem;
          font-weight: 700;
          color: #6b7380;
          border: 1px solid transparent;
          background: rgba(11,18,32,0.04);
        }
        .sf-lang-pill.active {
          color: var(--sf-primary);
          border-color: color-mix(in srgb, var(--sf-primary) 35%, transparent);
          background: color-mix(in srgb, var(--sf-primary) 10%, #fff);
        }

        .sf-org {
          text-align: center;
          font-size: 0.8rem;
          font-weight: 600;
          color: #6b7380;
          text-decoration: none;
          padding: 4px 0;
        }
        .sf-org:hover { color: var(--sf-ink); text-decoration: underline; }

        @keyframes sf-rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sf-sheet {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-height: 640px) {
          .sf-brand-name { font-size: 1.45rem; }
          .sf-brand-mark { width: 40px; height: 40px; border-radius: 12px; }
          .sf-copy h2 { font-size: 1rem; }
          .sf-input-wrap, .sf-input, .sf-icon { min-height: 44px; height: 44px; }
          .sf-submit { min-height: 46px; }
        }
      `}</style>

      <div className="sf-root" aria-label={t("pageAriaLabel")} dir={isRtl ? "rtl" : "ltr"}>
        <div className="sf-stage" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HERO_IMG} alt="" />
          <div className="sf-veil" />
          <div className="sf-glow" />
        </div>

        <div className="sf-shell">
          <section className="sf-visual">
            <div className="sf-visual-media" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={HERO_IMG} alt="" />
              <div className="sf-veil" />
              <div className="sf-glow" />
            </div>

            <div className="sf-brand">
              <div className="sf-brand-mark">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoSrc} alt="" />
              </div>
              <span className="sf-brand-name">{appName || "So7baFit"}</span>
            </div>

            <div className="sf-feature" aria-hidden="true">
              <div className="sf-feature-orbit">
                <span className="sf-feature-ring" />
                <span className="sf-feature-ring is-2" />
                <div className="sf-feature-frame">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={FEATURE_IMG} alt="" />
                  <div className="sf-feature-shade" />
                  <span className="sf-feature-chip">
                    <i />
                    {isRtl ? "جاهز للتمرين" : "Ready to train"}
                  </span>
                </div>
              </div>
            </div>

            <div className="sf-copy">
              <h2>
                {t("hero.titleLine1")}{" "}
                <span style={{ color: "color-mix(in srgb, var(--sf-primary) 70%, white)" }}>
                  {t("hero.titleLine2")}
                </span>
              </h2>
              <p>{t("hero.subtitle")}</p>
            </div>
          </section>

          <section className="sf-panel">
            <div className="sf-panel-inner">
              <LoginCard onLoggedIn={handleLoggedIn} />
              <Link
                href={`/${localeParam}/auth/discover`}
                onClick={() => clearTenant()}
                className="sf-org"
              >
                {isRtl ? "تغيير المؤسسة" : "Change organization"}
              </Link>
            </div>
          </section>
        </div>
      </div>
    </AuthContext.Provider>
  );
}
