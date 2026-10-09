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
import { AlertCircle, ArrowLeft, ArrowRight, Building2, Check, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { animate } from "framer-motion";
import { BRAND_LOGO_SRC } from "@/lib/brand";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { loginPersist } from "@/app/role-access";
import { useTenantTheme } from "@/lib/tenant/TenantThemeProvider";
import { resolvePostLoginPath } from "@/lib/nav-access";
import { readLastRoute } from "@/lib/last-route";
import Link from "next/link";
import { useParams } from "next/navigation";
import { archivo } from "@/components/pages/home/fonts";
import "./auth.css";

import AuthBarbell from "./AuthBarbell";

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

/* ─────────────────────────────────────────────────────────────────────────
   INPUT FIELD
───────────────────────────────────────────────────────────────────────── */
const InputField = React.memo(({ id, label, type = "text", placeholder, autoComplete, inputMode, registration, error, icon: Icon, suffix, done }) => (
  <div className="au-field">
    <label htmlFor={id}>{label}</label>
    <div className={`au-input${error ? " is-error" : ""}${done && !error ? " is-done" : ""}`}>
      <span className="au-input__icon" aria-hidden="true">
        <Icon size={18} strokeWidth={1.9} />
      </span>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        {...registration}
      />
      {suffix}
      <span className="au-input__done" aria-hidden="true">
        <Check size={14} strokeWidth={3} />
      </span>
    </div>
    {error ? (
      <p id={`${id}-err`} role="alert" className="au-error">
        <AlertCircle size={14} strokeWidth={2.2} aria-hidden="true" />
        {error}
      </p>
    ) : null}
  </div>
));
InputField.displayName = "InputField";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ─────────────────────────────────────────────────────────────────────────
   LOGIN FORM — fills the bar as you go
───────────────────────────────────────────────────────────────────────── */
function LoginCard({ onLoggedIn }) {
  const t = useTranslations("auth");
  const tv = useTranslations("auth.v3");
  const locale = useLocale();
  const isRtl = locale === "ar";
  const searchParams = useSearchParams();
  const prefillEmail = searchParams?.get("email") || "";
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("AuthContext missing");
  const { setLoading, setError, loading, error, setPlates, setMode, mode } = auth;
  const [showPwd, setShowPwd] = useState(false);
  const [shaking, setShaking] = useState(false);

  const { register, handleSubmit, formState: { errors }, setError: setRHError, setValue, watch } = useForm({
    resolver: yupResolver(loginSchema),
    mode: "onTouched",
    defaultValues: { email: prefillEmail, password: "" },
  });

  useEffect(() => {
    if (prefillEmail) setValue("email", prefillEmail);
  }, [prefillEmail, setValue]);

  const email = watch("email");
  const password = watch("password");
  const emailOk = EMAIL_RE.test(String(email || "").trim());
  const passwordOk = String(password || "").length > 0;
  const plates = emailOk ? (passwordOk ? 2 : 1) : 0;

  useEffect(() => {
    setPlates(plates);
    // Typing again after a missed lift resets the bar's pose.
    if (mode === "error") setMode("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plates, email, password]);

  const onSubmit = useCallback(async (data) => {
    setLoading(true); setError(null); setMode("loading");
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
      setMode("success");
      // Let the lift finish before leaving (skipped for reduced motion).
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.setTimeout(() => onLoggedIn?.(user), calm ? 0 : 850);
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
      // Shown inline above the button (role="alert"), so no duplicate toast.
      setError(msg);
      setMode("error");
      setShaking(true);
    } finally { setLoading(false); }
  }, [setLoading, setError, setRHError, setMode, onLoggedIn, t]);

  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;
  const steps = [
    { key: "email", label: t("email"), done: emailOk },
    { key: "password", label: t("password"), done: passwordOk },
  ];

  return (
    <div className="au-card">
      <header className="au-card__head">
        <h1 className="au-form-title">{t("v2.formTitle")}</h1>
        <p className="au-form-lead">{t("v2.formLead")}</p>
        <ol className="au-steps" aria-hidden="true">
          {steps.map((step, i) => (
            <li key={step.key} className={step.done ? "is-done" : ""}>
              <span>{step.done ? <Check size={12} strokeWidth={3} /> : i + 1}</span>
              {step.label}
            </li>
          ))}
        </ol>
      </header>

      <form
        noValidate
        onSubmit={handleSubmit(onSubmit, () => {
          setShaking(true);
          setMode("error");
        })}
        aria-label={t("formAriaLabel")}
        className={`au-form${shaking ? " is-shaking" : ""}`}
        onAnimationEnd={event => {
          if (event.target === event.currentTarget) setShaking(false);
        }}
      >
        <InputField
          id="au-email"
          label={t("email")}
          type="email"
          inputMode="email"
          placeholder={t("enterEmail")}
          autoComplete="email"
          icon={Mail}
          done={emailOk}
          registration={register("email")}
          error={errors.email?.message ? t(String(errors.email.message)) : undefined}
        />
        <InputField
          id="au-password"
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
              aria-pressed={showPwd}
              className="au-eye"
            >
              {showPwd ? <EyeOff size={18} strokeWidth={1.9} /> : <Eye size={18} strokeWidth={1.9} />}
            </button>
          }
        />

        {error ? (
          <p role="alert" className="au-alert">
            <AlertCircle size={16} strokeWidth={2.2} aria-hidden="true" />
            <span>{error}</span>
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading || mode === "success"}
          className={`au-submit${plates === 2 ? " is-ready" : ""}`}
          aria-busy={loading}
        >
          {loading ? (
            <>
              <span className="au-spinner" aria-hidden="true" />
              {t("loading.signingIn")}
            </>
          ) : mode === "success" ? (
            <>
              <Check size={18} strokeWidth={2.6} aria-hidden="true" />
              {tv("status.success")}
            </>
          ) : (
            <>
              {t("signInButton")}
              <ArrowIcon size={18} strokeWidth={2.2} className="au-submit__arrow" aria-hidden="true" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

/* Scoreboard-style readout of what is on the bar, with a plain-language status. */
function BarReadout({ plates, mode }) {
  const tv = useTranslations("auth.v3");
  const target = plates === 2 ? 80 : plates === 1 ? 40 : 20;
  const [shown, setShown] = useState(target);
  useEffect(() => {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (calm) {
      setShown(target);
      return undefined;
    }
    const controls = animate(shown, target, {
      duration: 0.6,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: value => setShown(Math.round(value)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const status =
    mode === "loading"
      ? tv("status.loading")
      : mode === "success"
        ? tv("status.success")
        : mode === "error"
          ? tv("status.error")
          : plates === 2
            ? tv("status.ready")
            : plates === 1
              ? tv("status.email")
              : tv("status.empty");

  return (
    <div className={`au-readout is-${mode}`}>
      <div className="au-readout__weight" aria-hidden="true">
        <span className="au-readout__num">{shown}</span>
        <span className="au-readout__unit">{tv("kg")}</span>
      </div>
      <div className="au-readout__meta">
        <span className="au-readout__label">{tv("readoutLabel")}</span>
        <span className="au-readout__ticks" aria-hidden="true">
          {[0, 1, 2].map(i => (
            <i key={i} className={i <= plates ? "is-on" : ""} />
          ))}
        </span>
        <p className="au-readout__status" aria-live="polite">
          {status}
        </p>
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
  const tv = useTranslations("auth.v3");
  const locale = useLocale();
  const isRtl = locale === "ar";
  const { appName, assets, clearTenant } = useTenantTheme();
  const params = useParams();
  const localeParam = params?.locale || locale;

  const token = searchParams?.get("accessToken");
  const intendedReturn = readIntendedReturnPath(searchParams);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [plates, setPlates] = useState(0);
  const [mode, setMode] = useState("idle");

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
        if (typeof window !== "undefined") loginPersist(user || {});
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

  const ctxVal = useMemo(
    () => ({ loading, setLoading, error, setError, plates, setPlates, mode, setMode }),
    [loading, error, plates, mode],
  );
  const logoSrc = assets?.logo || BRAND_LOGO_SRC;
  const brandName = appName || "So7baFit";
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;
  const query = searchParams?.toString();

  return (
    <AuthContext.Provider value={ctxVal}>
      <div className={`au ${archivo.variable}`} aria-label={t("pageAriaLabel")} dir={isRtl ? "rtl" : "ltr"} lang={locale}>
        <div className="au-mesh" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="au-grain" aria-hidden="true" />
        <div className="au-floor" aria-hidden="true" />

        <div className="au-frame">
          <header className="au-top">
            <Link href={`/${localeParam}`} className="au-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoSrc} alt="" className="au-brand__mark" />
              <span className="au-brand__name">{brandName}</span>
            </Link>
            <div className="au-top__end">
              <nav className="au-lang" aria-label={t("language")}>
                {[
                  { code: "en", label: "EN" },
                  { code: "ar", label: "ع" },
                ].map(({ code, label }) => (
                  <a
                    key={code}
                    href={`/${code}/auth${query ? `?${query}` : ""}`}
                    aria-current={locale === code ? "true" : undefined}
                    lang={code}
                  >
                    {label}
                  </a>
                ))}
              </nav>
              <Link href={`/${localeParam}`} className="au-home">
                <BackIcon size={16} strokeWidth={2} aria-hidden="true" />
                <span>{t("v2.home")}</span>
              </Link>
            </div>
          </header>

          <main className="au-main">
            <section className="au-scene" aria-labelledby="au-scene-title">
              <h2 id="au-scene-title" className="au-title">
                {tv("title")}
              </h2>
              <p className="au-lead">{tv("lead")}</p>
              <div className="au-rack">
                <AuthBarbell plates={plates} mode={mode} />
                <BarReadout plates={plates} mode={mode} />
              </div>
            </section>

            <section className="au-side">
              <LoginCard onLoggedIn={handleLoggedIn} />
              <Link
                href={`/${localeParam}/auth/discover`}
                onClick={() => clearTenant()}
                className="au-org"
              >
                <Building2 size={16} strokeWidth={2} aria-hidden="true" />
                {isRtl ? "تغيير المؤسسة" : "Change organization"}
              </Link>
            </section>
          </main>
        </div>
      </div>
    </AuthContext.Provider>
  );
}
