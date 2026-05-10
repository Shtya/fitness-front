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
import { AlertCircle, Eye, EyeOff, Lock, Mail, Dumbbell, ChevronRight, ChevronLeft } from "lucide-react";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { loginPersist } from "@/app/role-access";

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

function getPostLoginPath(role) {
  const r = (role || "").toString().toLowerCase();
  if (r === "admin" || r === "coach") return "/dashboard/users";
  if (r === "client") return "/dashboard/my/workouts";
  return "/dashboard/users";
}

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
   LOGIN CARD
───────────────────────────────────────────────────────────────────────── */
function LoginCard({ onLoggedIn }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const isRtl = locale === "ar";
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("AuthContext missing");
  const { setLoading, setError, loading } = auth;
  const [showPwd, setShowPwd] = useState(false);

  const { register, handleSubmit, formState: { errors }, setError: setRHError } = useForm({
    resolver: yupResolver(loginSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = useCallback(async (data) => {
    setLoading(true); setError(null);
    try {
      const res = await axiosInstance.post("/auth/login", data);
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
    <div className="sf-card">

      {/* top accent bar */}
      <div className="sf-card-bar" />

      {/* header */}
      <div className="sf-card-header">
        <div className="sf-logo-mark">
          <Dumbbell size={20} strokeWidth={2} />
        </div>
        <div>
          <h1 className="sf-heading">{t("signIn")}</h1>
          <p className="sf-subheading">{t("subtitle")}</p>
        </div>
      </div>

      {/* divider */}
      <div className="sf-divider" />

      {/* form */}
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
              {showPwd ? <EyeOff size={14} strokeWidth={1.75} /> : <Eye size={14} strokeWidth={1.75} />}
            </button>
          }
        />

        <button type="submit" disabled={loading} className="sf-submit">
          <span className="sf-submit-shine" />
          <span className="sf-submit-content">
            {loading ? (
              <>
                <span className="sf-spinner" />
                {t("loading.signingIn")}
              </>
            ) : (
              <>
                {t("signInButton")}
                <ArrowIcon size={16} strokeWidth={2} className="sf-arrow" />
              </>
            )}
          </span>
        </button>
      </form>

      {/* lang switcher */}
      <div className="sf-lang-row">
        <span className="sf-lang-label">{t("language")}</span>
        <div className="sf-lang-pills">
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

  const token = searchParams?.get("accessToken");
  const redirectUrl = searchParams?.get("redirect") || "/dashboard/my/workouts";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        if (typeof window !== "undefined") localStorage.setItem("accessToken", token);
        const { data: user } = await axiosInstance.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (typeof window !== "undefined") localStorage.setItem("user", JSON.stringify(user || {}));
        toast.success(t("success.signedIn"));
        router.push(getPostLoginPath(user?.role) || redirectUrl);
      } catch (e) {
        console.error("OAuth login failed", e);
        toast.error(t("errors.loginFailed"));
      }
    })();
  }, [token, redirectUrl, router, t]);

  const handleLoggedIn = useCallback((user) => {
    router.push(getPostLoginPath(user?.role) || "/dashboard/users");
  }, [router]);

  const ctxVal = useMemo(() => ({ loading, setLoading, error, setError }), [loading, error]);

  return (
    <AuthContext.Provider value={ctxVal}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;500;600;700;800&display=swap');

        /* ── Reset & base ── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .sf-root {
          font-family: 'Outfit', sans-serif;
          min-height: 100svh;
          width: 100vw;
          background: #05030f;
          overflow: hidden;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ── Background image ── */
        .sf-bg-img {
          position: absolute; inset: 0; z-index: 0;
          width: 100%; height: 100%;
          object-fit: cover; object-position: center;
          opacity: 0.055;
          filter: saturate(0.3) brightness(0.6);
        }

        /* ── Noise grain ── */
        @keyframes grain { 0%,100%{transform:translate(0,0)} 10%{transform:translate(-2%,-3%)} 30%{transform:translate(2%,-4%)} 50%{transform:translate(3%,-1%)} 70%{transform:translate(1%,-3%)} 90%{transform:translate(4%,-2%)} }
        .sf-grain {
          position: fixed; inset: -50%; width: 200%; height: 200%; z-index: 2; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
          background-size: 200px;
          opacity: 0.032;
          animation: grain 8s steps(1) infinite;
        }

        /* ── Orbs ── */
        .sf-orb {
          position: absolute; border-radius: 9999px; pointer-events: none; z-index: 1;
        }
        .sf-orb-1 {
          width: 900px; height: 900px;
          top: -30%; left: -20%;
          background: radial-gradient(circle at 40% 40%, rgba(99,102,241,0.18) 0%, transparent 65%);
          filter: blur(40px);
        }
        .sf-orb-2 {
          width: 600px; height: 600px;
          bottom: -20%; right: -15%;
          background: radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 65%);
          filter: blur(40px);
        }
        .sf-orb-3 {
          width: 280px; height: 280px;
          top: 20%; right: 30%;
          background: radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%);
          filter: blur(20px);
        }

        /* ── Grid lines background ── */
        .sf-grid {
          position: absolute; inset: 0; z-index: 1; pointer-events: none;
          background-image:
            linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
        }

        /* ── Layout ── */
        .sf-layout {
          position: relative; z-index: 10;
          display: flex;
          width: 100%;
          min-height: 100svh;
          align-items: stretch;
        }

        /* ── Left hero panel ── */
        .sf-hero {
          display: none;
          flex: 1;
          flex-direction: column;
          justify-content: space-between;
          padding: 52px 56px;
          position: relative;
          overflow: hidden;
        }
        @media (min-width: 900px) { .sf-hero { display: flex; } }

        .sf-hero-img-wrap {
          position: absolute; inset: 0; z-index: 0;
        }
        .sf-hero-img {
          width: 100%; height: 100%;
          object-fit: cover; object-position: center;
          opacity: 0.28;
          filter: saturate(0.5);
        }
        .sf-hero-img-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(135deg,
            rgba(5,3,15,0.85) 0%,
            rgba(5,3,15,0.55) 50%,
            rgba(5,3,15,0.75) 100%
          );
        }
        .sf-hero-img-overlay-2 {
          position: absolute; inset: 0;
          background: linear-gradient(to right, rgba(5,3,15,0.6) 0%, transparent 100%);
        }

        .sf-hero-content { position: relative; z-index: 2; }

        /* Hero brand */
        .sf-brand {
          display: flex; align-items: center; gap: 12px;
          animation: sf-fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both;
        }
        .sf-brand-icon {
          width: 44px; height: 44px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to));
          box-shadow: 0 8px 28px rgba(99,102,241,0.45);
          color: #fff;
        }
        .sf-brand-name {
          font-family: 'Instrument Serif', serif;
          font-size: 22px; font-weight: 400;
          color: rgba(255,255,255,0.92);
          letter-spacing: -0.02em;
        }

        /* Hero main text */
        .sf-hero-main { margin-top: auto; padding-bottom: 64px; }
        .sf-hero-tag {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 5px 12px; border-radius: 100px; margin-bottom: 24px;
          background: rgba(99,102,241,0.12);
          border: 1px solid rgba(99,102,241,0.25);
          animation: sf-fade-up 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both;
        }
        .sf-hero-tag-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--color-primary-400);
          box-shadow: 0 0 8px var(--color-primary-400);
          animation: sf-pulse 2s ease-in-out infinite;
        }
        @keyframes sf-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.85)} }
        .sf-hero-tag-text {
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.16em; text-transform: uppercase;
          color: var(--color-primary-300);
        }
        .sf-hero-title {
          font-family: 'Instrument Serif', serif;
          font-size: clamp(44px, 5vw, 68px);
          font-weight: 400; line-height: 1.04;
          color: #fff;
          letter-spacing: -0.03em;
          animation: sf-fade-up 0.75s cubic-bezier(0.22,1,0.36,1) 0.18s both;
        }
        .sf-hero-title em {
          font-style: italic;
          background: linear-gradient(135deg, var(--color-primary-300) 0%, var(--color-secondary-300) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .sf-hero-sub {
          margin-top: 20px;
          font-size: 15px; font-weight: 300; line-height: 1.65;
          color: rgba(255,255,255,0.38);
          max-width: 380px;
          animation: sf-fade-up 0.75s cubic-bezier(0.22,1,0.36,1) 0.26s both;
        }

        /* Stats */
        .sf-stats {
          display: flex; gap: 0;
          margin-top: 40px;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px; overflow: hidden;
          animation: sf-fade-up 0.75s cubic-bezier(0.22,1,0.36,1) 0.34s both;
          backdrop-filter: blur(12px);
        }
        .sf-stat {
          flex: 1; padding: 20px 24px;
          background: rgba(255,255,255,0.03);
          position: relative;
        }
        .sf-stat + .sf-stat { border-left: 1px solid rgba(255,255,255,0.07); }
        .sf-stat-val {
          font-family: 'Instrument Serif', serif;
          font-size: 30px; font-weight: 400;
          color: #fff; letter-spacing: -0.03em;
          line-height: 1;
        }
        .sf-stat-label {
          margin-top: 4px; font-size: 11px; font-weight: 500;
          letter-spacing: 0.06em; text-transform: uppercase;
          color: rgba(255,255,255,0.3);
        }

        /* ── Right form panel ── */
        .sf-form-panel {
          width: 100%;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 32px 20px;
          overflow-y: auto;
        }
        @media (min-width: 900px) {
          .sf-form-panel {
            width: 460px; flex-shrink: 0;
            padding: 48px 40px;
          }
        }
        @media (min-width: 1200px) { .sf-form-panel { width: 500px; } }

        /* Card */
        .sf-card {
          width: 100%; max-width: 400px;
          background: rgba(10,8,24,0.7);
          backdrop-filter: blur(40px) saturate(1.5);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          overflow: hidden;
          animation: sf-fade-up 0.75s cubic-bezier(0.22,1,0.36,1) both;
          box-shadow:
            0 0 0 1px rgba(99,102,241,0.08) inset,
            0 40px 80px rgba(0,0,0,0.6),
            0 0 120px rgba(99,102,241,0.06);
        }
        .sf-card-bar {
          height: 3px;
          background: linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-via), var(--color-gradient-to));
        }

        .sf-card-header {
          padding: 28px 32px 0;
          display: flex; align-items: flex-start; gap: 16px;
        }
        .sf-logo-mark {
          width: 48px; height: 48px; flex-shrink: 0;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, rgba(99,102,241,0.22), rgba(168,85,247,0.12));
          border: 1px solid rgba(99,102,241,0.28);
          color: var(--color-primary-300);
          box-shadow: 0 4px 16px rgba(99,102,241,0.2);
        }
        .sf-heading {
          font-family: 'Instrument Serif', serif;
          font-size: 28px; font-weight: 400;
          color: #fff; letter-spacing: -0.03em; line-height: 1.1;
          margin-top: 2px;
        }
        .sf-subheading {
          margin-top: 5px; font-size: 13px; font-weight: 400;
          color: rgba(255,255,255,0.32); line-height: 1.5;
        }

        .sf-divider {
          margin: 24px 32px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(99,102,241,0.2) 40%, rgba(168,85,247,0.15) 60%, transparent);
        }

        /* Form */
        .sf-form {
          padding: 0 32px;
          display: flex; flex-direction: column; gap: 18px;
        }

        /* Field */
        .sf-field { display: flex; flex-direction: column; gap: 8px; }
        .sf-label {
          font-size: 10.5px; font-weight: 700;
          letter-spacing: 0.16em; text-transform: uppercase;
          color: rgba(165,180,252,0.5);
          transition: color 0.15s;
        }
        .sf-label[data-error="true"] { color: rgba(252,165,165,0.7); }
        .sf-input-wrap {
          position: relative; display: flex; align-items: center;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          transition: all 0.2s;
        }
        .sf-input-wrap:hover { border-color: rgba(255,255,255,0.13); background: rgba(255,255,255,0.055); }
        .sf-input-wrap.focused {
          border-color: rgba(99,102,241,0.55);
          background: rgba(99,102,241,0.07);
          box-shadow: 0 0 0 4px rgba(99,102,241,0.12), 0 0 20px rgba(99,102,241,0.08);
        }
        .sf-input-wrap.errored {
          border-color: rgba(239,68,68,0.45);
          background: rgba(239,68,68,0.05);
          box-shadow: 0 0 0 4px rgba(239,68,68,0.08);
        }
        .sf-icon {
          width: 44px; height: 44px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.2);
          transition: color 0.2s;
        }
        .sf-input-wrap.focused .sf-icon { color: var(--color-primary-400); }
        .sf-input-wrap.errored .sf-icon { color: rgba(252,165,165,0.6); }
        .sf-input {
          flex: 1; height: 44px;
          background: transparent; border: none; outline: none;
          font-family: 'Outfit', sans-serif;
          font-size: 14px; font-weight: 400;
          color: #fff;
          padding-inline-end: 12px;
        }
        .sf-input::placeholder { color: rgba(255,255,255,0.18); }
        .sf-suffix { flex-shrink: 0; padding-inline-end: 6px; }
        .sf-eye-btn {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 8px;
          background: transparent; border: none; cursor: pointer;
          color: rgba(255,255,255,0.25);
          transition: all 0.15s;
        }
        .sf-eye-btn:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.55); }
        .sf-error-msg {
          display: flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 600;
          color: rgba(252,165,165,0.85);
        }

        /* Submit */
        .sf-submit {
          position: relative; overflow: hidden;
          width: 100%; height: 48px;
          border: none; border-radius: 12px; cursor: pointer;
          background: linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-via) 55%, var(--color-gradient-to));
          box-shadow: 0 8px 28px rgba(99,102,241,0.38), 0 0 0 1px rgba(255,255,255,0.08) inset;
          transition: all 0.25s;
          margin-top: 4px;
        }
        .sf-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 14px 36px rgba(99,102,241,0.48), 0 0 0 1px rgba(255,255,255,0.12) inset;
        }
        .sf-submit:active:not(:disabled) { transform: scale(0.985); }
        .sf-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .sf-submit-shine {
          position: absolute; inset: 0;
          background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%);
          transform: translateX(-100%);
          transition: transform 0.6s ease;
        }
        .sf-submit:hover .sf-submit-shine { transform: translateX(100%); }
        .sf-submit-content {
          position: relative; z-index: 1;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          font-family: 'Outfit', sans-serif;
          font-size: 13px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: #fff;
        }
        .sf-spinner {
          width: 15px; height: 15px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          animation: sf-spin 0.7s linear infinite;
        }
        @keyframes sf-spin { to { transform: rotate(360deg); } }
        .sf-arrow { transition: transform 0.2s; }
        .sf-submit:hover .sf-arrow { transform: translateX(3px); }
        [dir="rtl"] .sf-submit:hover .sf-arrow { transform: translateX(-3px); }

        /* Lang switcher */
        .sf-lang-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 32px 28px;
          margin-top: 8px;
        }
        .sf-lang-label {
          font-size: 10px; font-weight: 600;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: rgba(255,255,255,0.2);
        }
        .sf-lang-pills { display: flex; gap: 4px; }
        .sf-lang-pill {
          padding: 5px 12px; border-radius: 8px;
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.08em;
          text-decoration: none;
          color: rgba(255,255,255,0.25);
          border: 1px solid transparent;
          transition: all 0.15s;
        }
        .sf-lang-pill:hover { color: rgba(255,255,255,0.55); background: rgba(255,255,255,0.06); }
        .sf-lang-pill.active {
          color: var(--color-primary-300);
          background: rgba(99,102,241,0.14);
          border-color: rgba(99,102,241,0.28);
        }

        /* Mobile brand shown above card on small screens */
        .sf-mobile-brand {
          display: flex; align-items: center; gap: 10px; margin-bottom: 28px;
        }
        @media (min-width: 900px) { .sf-mobile-brand { display: none; } }
        .sf-mobile-brand-icon {
          width: 38px; height: 38px; border-radius: 11px;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to));
          box-shadow: 0 6px 20px rgba(99,102,241,0.4);
          color: #fff;
        }
        .sf-mobile-brand-name {
          font-family: 'Instrument Serif', serif;
          font-size: 20px; font-weight: 400;
          color: rgba(255,255,255,0.9);
          letter-spacing: -0.02em;
        }

        /* Animations */
        @keyframes sf-fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* RTL input padding */
        [dir="rtl"] .sf-input { padding-inline-end: 12px; padding-inline-start: 0; }

        /* Scrollbar hide */
        .sf-form-panel::-webkit-scrollbar { display: none; }
        .sf-form-panel { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="sf-root" aria-label={t("pageAriaLabel")} dir={isRtl ? "rtl" : "ltr"}>

        {/* Background */}
        <img
          src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1800&q=70&auto=format&fit=crop"
          alt="" className="sf-bg-img"
        />

        {/* Grain + orbs + grid */}
        <div className="sf-grain" />
        <div className="sf-orb sf-orb-1" />
        <div className="sf-orb sf-orb-2" />
        <div className="sf-orb sf-orb-3" />
        <div className="sf-grid" />

        {/* Layout */}
        <div className="sf-layout">

          {/* ── LEFT HERO ── */}
          <div className="sf-hero">
            {/* bg image */}
            <div className="sf-hero-img-wrap">
              <img
                src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80&auto=format&fit=crop"
                alt="" className="sf-hero-img"
              />
              <div className="sf-hero-img-overlay" />
              <div className="sf-hero-img-overlay-2" />
            </div>

            {/* brand */}
            <div className="sf-hero-content">
              <div className="sf-brand">
                <div className="sf-brand-icon">
                  <Dumbbell size={20} strokeWidth={2} />
                </div>
                <span className="sf-brand-name">So7baFit</span>
              </div>
            </div>

            {/* main copy */}
            <div className="sf-hero-main">
              <div className="sf-hero-tag">
                <div className="sf-hero-tag-dot" />
                <span className="sf-hero-tag-text">{t("hero.tagline")}</span>
              </div>
              <h2 className="sf-hero-title">
                {t("hero.titleLine1")}<br />
                <em>{t("hero.titleLine2")}</em>
              </h2>
              <p className="sf-hero-sub">{t("hero.subtitle")}</p>

              {/* Stats */}
              <div className="sf-stats">
                {[
                  { val: t("hero.stat1Val"), label: t("hero.stat1Label") },
                  { val: t("hero.stat2Val"), label: t("hero.stat2Label") },
                  { val: t("hero.stat3Val"), label: t("hero.stat3Label") },
                ].map(({ val, label }) => (
                  <div key={label} className="sf-stat">
                    <div className="sf-stat-val">{val}</div>
                    <div className="sf-stat-label">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT FORM ── */}
          <div className="sf-form-panel">
            {/* mobile brand */}
            <div className="sf-mobile-brand">
              <div className="sf-mobile-brand-icon">
                <Dumbbell size={16} strokeWidth={2} />
              </div>
              <span className="sf-mobile-brand-name">So7baFit</span>
            </div>

            <LoginCard onLoggedIn={handleLoggedIn} />
          </div>

        </div>
      </div>
    </AuthContext.Provider>
  );
}