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
import {
	AlertCircle, Eye, EyeOff, ArrowRight, ArrowLeft,
	Dumbbell, Lock, Mail,
} from "lucide-react";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { loginPersist } from "@/app/role-access";

/* ─────────────────────────────────────────────────────────────────────────
	 AXIOS
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
	 CONTEXT / SCHEMA
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
	 PHONE INPUT FIELD
───────────────────────────────────────────────────────────────────────── */
const PhoneInputField = React.memo(({
	id, label, type = "text", placeholder,
	autoComplete, registration, error, icon: Icon, suffix,
}) => {
	const [focused, setFocused] = useState(false);
	return (
		<div className="flex flex-col gap-1.5">
			<label
				htmlFor={id}
				className="text-[11px] font-semibold uppercase tracking-[0.15em]"
				style={{ color: "color-mix(in srgb, var(--color-primary-300) 65%, transparent)" }}
			>
				{label}
			</label>
			<div className="relative">
				<div
					className="pointer-events-none absolute inset-y-0 ltr:left-0 rtl:right-0 flex w-[46px] items-center justify-center transition-colors duration-200"
					style={{
						color: error
							? "rgba(248,113,113,0.75)"
							: focused
								? "var(--color-primary-400)"
								: "rgba(255,255,255,0.25)",
					}}
				>
					<Icon size={15} strokeWidth={2} />
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
					style={
						error
							? { borderColor: "rgba(239,68,68,0.45)", background: "rgba(239,68,68,0.06)" }
							: focused
								? {
									borderColor: "color-mix(in srgb, var(--color-primary-500) 75%, transparent)",
									background: "color-mix(in srgb, var(--color-primary-600) 9%, transparent)",
									boxShadow: "0 0 0 4px color-mix(in srgb, var(--color-primary-500) 14%, transparent)",
								}
								: {}
					}
					className={[
						"w-full rounded-2xl border border-white/[0.09] bg-white/[0.045] py-4",
						"text-[13px] font-medium text-white outline-none",
						"placeholder:text-white/20 transition-all duration-200",
						"ltr:pl-[46px] rtl:pr-[46px] ltr:pr-4 rtl:pl-4",
						"hover:border-white/[0.16] hover:bg-white/[0.07]",
					].join(" ")}
				/>
				{suffix && (
					<span className="absolute inset-y-0 ltr:right-0 rtl:left-0 flex items-center ltr:pr-2 rtl:pl-2">
						{suffix}
					</span>
				)}
			</div>
			{error && (
				<p id={`${id}-err`} role="alert" className="flex items-center gap-1.5 text-[10px] font-semibold text-red-400">
					<AlertCircle size={10} strokeWidth={2.5} className="shrink-0" />
					{error}
				</p>
			)}
		</div>
	);
});
PhoneInputField.displayName = "PhoneInputField";

/* ─────────────────────────────────────────────────────────────────────────
	 PHONE LOGIN SCREEN
───────────────────────────────────────────────────────────────────────── */
function PhoneLoginScreen({ onLoggedIn }) {
	const t = useTranslations("auth");
	const locale = useLocale();
	const isRtl = locale === "ar";
	const auth = useContext(AuthContext);

	const [time, setTime] = useState("");

	useEffect(() => {
		const updateTime = () => {
			const now = new Date();
			const formatted = now.toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
				hour12: false,
			});
			setTime(formatted);
		};

		updateTime();
		const interval = setInterval(updateTime, 1000);

		return () => clearInterval(interval);
	}, []);

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
			setError(msg); toast.error(msg);
		} finally { setLoading(false); }
	}, [setLoading, setError, setRHError, onLoggedIn, t]);

	const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

	return (
		<div className="relative mx-auto flex-shrink-0" style={{ width: "360px" }}>

			{/* ── Glow halos beneath phone ── */}
			<div
				className="absolute -bottom-8 left-1/2 -translate-x-1/2 rounded-full blur-3xl pointer-events-none"
				style={{ width: "300px", height: "55px", background: "var(--color-primary-600)", opacity: 0.48 }}
			/>
			<div
				className="absolute -bottom-14 left-1/2 -translate-x-1/2 rounded-full blur-3xl pointer-events-none"
				style={{ width: "200px", height: "36px", background: "var(--color-secondary-600)", opacity: 0.26 }}
			/>

			<div className="absolute ltr:-left-[3px] rtl:-right-[3px] rounded-l-sm bg-white/[0.12]" style={{ top: "108px", width: "3px", height: "34px" }} />
			<div className="absolute ltr:-left-[3px] rtl:-right-[3px] rounded-l-sm bg-white/[0.12]" style={{ top: "150px", width: "3px", height: "34px" }} />
			<div className="absolute ltr:-right-[3px] rtl:-left-[3px] rounded-r-sm bg-white/[0.12]" style={{ top: "126px", width: "3px", height: "58px" }} />

			{/* ── Phone outer shell ── */}
			<div
				className="relative rounded-[48px] p-[3px]"
				style={{
					background: [
						"linear-gradient(145deg,",
						"  rgba(255,255,255,0.16) 0%,",
						"  rgba(255,255,255,0.04) 50%,",
						"  color-mix(in srgb, var(--color-secondary-500) 28%, transparent) 100%",
						")",
					].join(""),
					boxShadow: [
						"0 64px 128px rgba(0,0,0,0.9)",
						"0 24px 48px rgba(0,0,0,0.55)",
						"0 0 0 1px rgba(255,255,255,0.07) inset",
						"0 0 80px color-mix(in srgb, var(--color-primary-700) 20%, transparent)",
					].join(", "),
				}}
			>
				{/* ── Phone bezel ── */}
				<div className="relative overflow-hidden rounded-[46px]" style={{ background: "#07050f" }}>

					{/* ════════════════════════════════
              HERO — gym photo
          ════════════════════════════════ */}
					<div className="relative w-full overflow-hidden" style={{ height: "280px" }}>

						{/* Photo */}
						<img
							src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=90&auto=format&fit=crop"
							alt="Gym"
							className="absolute inset-0 h-full w-full object-cover object-center"
							draggable={false}
						/>

						{/* Overlay 1 — dark tint */}
						<div className="absolute inset-0" style={{ background: "rgba(4,2,12,0.48)" }} />

						{/* Overlay 2 — branded color wash top-left */}
						<div
							className="absolute inset-0"
							style={{
								background: "linear-gradient(150deg, color-mix(in srgb, var(--color-primary-900) 60%, transparent) 0%, transparent 55%)",
							}}
						/>

						{/* Overlay 3 — bottom fade into form */}
						<div
							className="absolute inset-x-0 bottom-0"
							style={{
								height: "62%",
								background: "linear-gradient(to top, #0d0b1a 0%, #0d0b1a 16%, rgba(13,11,26,0.82) 48%, transparent 100%)",
							}}
						/>

						{/* Overlay 4 — radial vignette */}
						<div
							className="absolute inset-0"
							style={{ background: "radial-gradient(ellipse at center, transparent 38%, rgba(0,0,0,0.52) 100%)" }}
						/>

						{/* Status bar */}
						<div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-7 pt-4">
							<span className="text-[13px] font-bold text-white/70">{time}</span>
							<div className="flex h-7 w-28 items-center justify-center rounded-full" style={{ background: "#000" }}>
								<div className="h-[9px] w-[9px] rounded-full" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)" }} />
								<div className="mx-1.5 h-3 w-3 rounded-full" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)" }} />
							</div>
							<div className="flex items-center gap-2">
								<div className="flex items-end gap-[2.5px]">
									{[5, 8, 11, 14].map((h, i) => (
										<div key={i} className="w-[3px] rounded-sm bg-white/55" style={{ height: `${h}px` }} />
									))}
								</div>
								<div className="flex items-center gap-0.5">
									<div className="relative h-[11px] w-[22px] rounded-[3px]" style={{ border: "1px solid rgba(255,255,255,0.45)" }}>
										<div className="absolute ltr:left-[1px] rtl:right-[1px] top-[1px] h-[7px] w-[14px] rounded-[1px] bg-white/70" />
									</div>
									<div className="h-[5px] w-[2px] rounded-r-sm bg-white/40" />
								</div>
							</div>
						</div>

						{/* Brand badge */}
						<div
							className="absolute top-14 ltr:right-5 rtl:left-5 z-20 flex items-center gap-1.5 rounded-full px-2.5 py-1"
							style={{
								background: "rgba(0,0,0,0.38)",
								backdropFilter: "blur(12px)",
								border: "1px solid color-mix(in srgb, var(--color-primary-500) 40%, transparent)",
							}}
						>
							<Dumbbell size={10} strokeWidth={2} style={{ color: "var(--color-primary-400)" }} />
							<span className="text-[10px] font-black tracking-tight" style={{ color: "rgba(255,255,255,0.88)" }}>So7baFit</span>
						</div>

						{/* Curved wave divider */}
						<div className="absolute inset-x-0 bottom-0 z-10">
							<svg viewBox="0 0 360 52" width="100%" height="52" preserveAspectRatio="none">
								<path d="M0,52 L0,24 C60,5 120,0 180,15 C240,30 300,32 360,12 L360,52 Z" fill="#0d0b1a" />
							</svg>
						</div>
					</div>

					{/* ════════════════════════════════
              FORM PANEL
          ════════════════════════════════ */}
					<div className="relative flex flex-col px-6 pb-8 pt-1" style={{ background: "#0d0b1a" }}>

						{/* Shimmer line */}
						<div
							className="absolute inset-x-0 top-0 h-px pointer-events-none"
							style={{ background: "linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-primary-400) 55%, transparent), transparent)" }}
						/>

						{/* Dumbbell accent icon */}
						<div
							className="absolute ltr:right-6 rtl:left-6 -top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full"
							style={{
								background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))",
								boxShadow: "0 8px 24px color-mix(in srgb, var(--color-primary-600) 62%, transparent), 0 0 0 3px #0d0b1a",
							}}
						>
							<Dumbbell size={18} strokeWidth={2} className="text-white" />
						</div>

						{/* Welcome copy */}
						<div className="mb-6 mt-2">
							<h1 className="text-[26px] font-black leading-tight tracking-[-0.04em] text-white">
								{t("signIn")}
							</h1>
							<p className="mt-1.5 text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.36)" }}>
								{t("subtitle")}
							</p>
						</div>

						{/* Form */}
						<form
							noValidate
							onSubmit={handleSubmit(onSubmit)}
							className="flex flex-col gap-4"
							aria-label={t("formAriaLabel")}
						>
							{/* Email */}
							<PhoneInputField
								id="phone-email"
								label={t("email")}
								type="email"
								placeholder={t("enterEmail")}
								autoComplete="email"
								icon={Mail}
								registration={register("email")}
								error={errors.email?.message ? t(String(errors.email.message)) : undefined}
							/>

							{/* Password */}
							<PhoneInputField
								id="phone-password"
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
										className="p-2 transition-colors hover:text-white/60 focus-visible:outline-none"
										style={{ color: "rgba(255,255,255,0.28)" }}
									>
										{showPwd ? <EyeOff size={15} strokeWidth={2} /> : <Eye size={15} strokeWidth={2} />}
									</button>
								}
							/>

							{/* Forgot password */}
							{/* <div className="flex justify-end -mt-1">
								<button
									type="button"
									className="text-[12px] font-semibold transition-colors focus-visible:outline-none"
									style={{ color: "var(--color-primary-400)" }}
									onMouseEnter={e => e.currentTarget.style.color = "var(--color-primary-300)"}
									onMouseLeave={e => e.currentTarget.style.color = "var(--color-primary-400)"}
								>
									{t("forgotPassword")}
								</button>
							</div> */}

							{/* Submit */}
							<button
								type="submit"
								disabled={loading}
								className="group relative mt-1 w-full overflow-hidden rounded-2xl py-4 text-[14px] font-bold tracking-wide text-white transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none"
								style={{
									background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-via), var(--color-gradient-to))",
									boxShadow: "0 10px 36px color-mix(in srgb, var(--color-primary-600) 55%, transparent)",
								}}
							>
								<span
									aria-hidden="true"
									className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full"
								/>
								<span className="relative flex items-center justify-center gap-2.5">
									{loading ? (
										<>
											<span aria-hidden="true" className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
											{t("loading.signingIn")}
										</>
									) : (
										<>
											{t("signInButton")}
											<ArrowIcon
												size={16}
												strokeWidth={2.5}
												className="transition-transform duration-200 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
											/>
										</>
									)}
								</span>
							</button>
						</form>

						{/* Sign-up link */}
						{/* <div className="mt-6 text-center">
							<span className="text-[12px]" style={{ color: "rgba(255,255,255,0.28)" }}>
								{t("noAccount") || "Don't have an account?"}{" "}
							</span>
							<button
								type="button"
								className="text-[12px] font-bold transition-colors focus-visible:outline-none"
								style={{ color: "var(--color-primary-400)" }}
								onMouseEnter={e => e.currentTarget.style.color = "var(--color-primary-300)"}
								onMouseLeave={e => e.currentTarget.style.color = "var(--color-primary-400)"}
							>
								{t("signUp") || "Sign up"}
							</button>
						</div> */}

						{/* Language toggle */}
						<div className="mt-4 flex items-center justify-center gap-2">
							{["en", "ar"].map((lang) => (
								<a
									key={lang}
									href={`/${lang}/auth`}
									className="rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-all duration-150"
									style={
										locale === lang
											? {
												background: "color-mix(in srgb, var(--color-primary-700) 28%, transparent)",
												color: "var(--color-primary-400)",
											}
											: { color: "rgba(255,255,255,0.22)" }
									}
								>
									{lang.toUpperCase()}
								</a>
							))}
						</div>
					</div>

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
        @media (max-height: 720px) {
          #auth-scroll { overflow-y: auto !important; align-items: flex-start !important; padding: 28px 16px !important; }
        }
        #auth-scroll::-webkit-scrollbar { display: none; }
        #auth-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

			<main
				id="auth-page"
				dir={locale === "ar" ? "rtl" : "ltr"}
				className="relative h-screen w-screen overflow-hidden"
				aria-label={t("pageAriaLabel")}
			>
				{/* Full-page background: blurred gym photo + brand overlays */}
				<div className="absolute inset-0 z-0" aria-hidden="true">
					<img
						src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1600&q=70&auto=format&fit=crop"
						alt=""
						className="h-full w-full object-cover object-center"
						style={{ filter: "blur(2px) brightness(0.15) saturate(0.55)" }}
					/>
					<div
						className="absolute inset-0"
						style={{
							background: [
								"radial-gradient(ellipse 70% 55% at 50% 0%, color-mix(in srgb, var(--color-primary-800) 48%, transparent) 0%, transparent 72%)",
								"radial-gradient(ellipse 55% 45% at 88% 100%, color-mix(in srgb, var(--color-secondary-800) 38%, transparent) 0%, transparent 62%)",
								"radial-gradient(ellipse 48% 42% at 8% 55%,  color-mix(in srgb, var(--color-primary-900) 32%, transparent) 0%, transparent 58%)",
							].join(", "),
						}}
					/>
					<div
						className="absolute inset-0 opacity-[0.016]"
						style={{
							backgroundImage: "radial-gradient(rgba(255,255,255,0.85) 1px, transparent 1px)",
							backgroundSize: "22px 22px",
						}}
					/>
				</div>

				{/* Single centered phone */}
				<div
					id="auth-scroll"
					className="relative z-10 flex h-full w-full items-center justify-center"
					style={{ padding: "24px 16px" }}
				>
					<PhoneLoginScreen onLoggedIn={handleLoggedIn} />
				</div>
			</main>
		</AuthContext.Provider>
	);
}