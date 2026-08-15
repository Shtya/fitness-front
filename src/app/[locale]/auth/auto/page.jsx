'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
	AlertTriangle,
	ArrowRight,
	Check,
	Eye,
	EyeOff,
	Link2,
	Loader2,
	Lock,
	LogIn,
	Mail,
	Shield,
	ShieldAlert,
	ShieldCheck,
	User,
	Users,
	Zap,
} from 'lucide-react';
import { BRAND_LOGO_SRC } from '@/lib/brand';
import { loginPersist } from '@/app/role-access';
import { resolvePostLoginPath, sanitizeReturnPath } from '@/lib/nav-access';
import { useTenantTheme } from '@/lib/tenant/TenantThemeProvider';

const axiosInstance = axios.create({
	baseURL: process.env.NEXT_PUBLIC_BASE_URL + '/api/v1',
	headers: { 'Content-Type': 'application/json' },
});

/**
 * Invite / shared-credentials login:
 * /auth/auto?email=...&password=...&next=/dashboard/...
 * Shows a confirm form (prefilled from URL). User can edit or keep, then sign in.
 */
export default function AutoLoginPage() {
	const t = useTranslations('auth');
	const locale = useLocale();
	const isAr = locale === 'ar' || String(locale).startsWith('ar');
	const router = useRouter();
	const searchParams = useSearchParams();
	const scrubbed = useRef(false);
	const { appName, assets } = useTenantTheme();
	const brand = appName || 'So7baFit';
	const logoSrc = assets?.logo || BRAND_LOGO_SRC;

	const urlEmail = useMemo(
		() => (searchParams?.get('email') || searchParams?.get('e') || '').trim(),
		[searchParams],
	);
	const urlPassword = useMemo(
		() => searchParams?.get('password') || searchParams?.get('pass') || searchParams?.get('p') || '',
		[searchParams],
	);
	const next = useMemo(
		() => searchParams?.get('next') || searchParams?.get('redirect') || '',
		[searchParams],
	);

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPwd, setShowPwd] = useState(false);
	const [hydrated, setHydrated] = useState(false);
	const [status, setStatus] = useState('form'); // form | working | error | done
	const [message, setMessage] = useState('');

	useEffect(() => {
		if (scrubbed.current) return;
		scrubbed.current = true;

		setEmail(urlEmail);
		setPassword(urlPassword);
		setHydrated(true);

		if (!urlEmail && !urlPassword) {
			setStatus('error');
			setMessage(
				isAr
					? 'رابط الدخول غير مكتمل (إيميل أو باسورد ناقص).'
					: 'Login link is incomplete (missing email or password).',
			);
		}

		try {
			const url = new URL(window.location.href);
			['password', 'pass', 'p', 'email', 'e'].forEach((k) => url.searchParams.delete(k));
			window.history.replaceState({}, '', `${url.pathname}${url.search}`);
		} catch { /* ignore */ }
	}, [urlEmail, urlPassword, isAr]);

	const signIn = async (e) => {
		e?.preventDefault?.();
		const em = email.trim();
		const pw = password;
		if (!em || !pw) {
			toast.error(isAr ? 'أدخل الإيميل وكلمة المرور' : 'Enter email and password');
			return;
		}

		setStatus('working');
		setMessage('');

		try {
			let discoveryToken = null;
			let tenantId = null;
			try {
				const cached = JSON.parse(localStorage.getItem('so7bafit_tenant_branding_v1') || 'null');
				discoveryToken = cached?.discoveryToken || null;
				tenantId = cached?.tenant?.id || null;
			} catch { /* ignore */ }

			const { data } = await axiosInstance.post('/auth/login', {
				email: em,
				password: pw,
				...(discoveryToken ? { discoveryToken } : {}),
				...(tenantId ? { tenantId } : {}),
			});

			const { accessToken, refreshToken, user } = data || {};
			if (!accessToken || !refreshToken) throw new Error('Missing tokens');

			localStorage.setItem('accessToken', accessToken);
			localStorage.setItem('refreshToken', refreshToken);
			localStorage.setItem('user', JSON.stringify(user || {}));

			await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accessToken, refreshToken, user }),
			});

			loginPersist(user);

			const dest = resolvePostLoginPath(user, sanitizeReturnPath(next) || next);
			setStatus('done');
			setMessage(isAr ? 'تم تسجيل الدخول — جاري التحويل…' : 'Signed in — redirecting…');
			toast.success(t('success.signedIn'));
			router.replace(`/${locale}${dest.startsWith('/') ? dest : `/${dest}`}`);
		} catch (err) {
			const msg =
				err?.response?.data?.message ||
				(isAr ? 'فشل تسجيل الدخول' : 'Sign-in failed');
			setStatus('error');
			setMessage(msg);
			toast.error(msg);
		}
	};

	const copy = {
		invited: isAr ? 'تم دعوتك' : "You've been invited",
		welcome: isAr ? 'أهلاً بيك في' : 'Welcome to',
		heroDesc: isAr
			? 'تم دعوتك لحسابك. أكّد تسجيل الدخول عشان تبدأ.'
			: "You've been invited to your workspace. Confirm your sign-in to get started.",
		featSecure: isAr ? 'دخول آمن' : 'Secure Access',
		featSecureDesc: isAr
			? 'بياناتك محمية بمعايير أمان احترافية.'
			: 'Your data is protected with enterprise-grade security.',
		featFast: isAr ? 'إعداد فوري' : 'Instant Setup',
		featFastDesc: isAr
			? 'ادخل وابدأ التدريب والمراجعة في ثواني.'
			: 'Get access and start in seconds.',
		featTeam: isAr ? 'منصة واحدة' : 'Built for you',
		featTeamDesc: isAr
			? 'تمرين، كوتش، ومراجعة قرآن في مكان واحد.'
			: 'Train, coach, and revise — all in one place.',
		title: isAr ? 'تأكيد الدخول' : 'Confirm sign-in',
		subtitle: isAr
			? 'البيانات جاهزة من رابط الدعوة — عدّلها أو كمّل زي ما هي'
			: 'Credentials from your invite link — edit or keep, then continue',
		email: isAr ? 'البريد الإلكتروني' : 'Email',
		password: isAr ? 'كلمة المرور' : 'Password',
		submit: isAr ? 'تسجيل الدخول' : 'Sign in',
		working: isAr ? 'جاري تسجيل الدخول…' : 'Signing you in…',
		retry: isAr ? 'حاول مرة أخرى' : 'Try again',
		goLogin: isAr ? 'الذهاب لتسجيل الدخول' : 'Go to login',
		hint: isAr
			? 'تقدر تغيّر الإيميل أو كلمة المرور قبل الدخول'
			: 'You can change the email or password before signing in',
		opens: isAr ? 'بعد الدخول هيفتح' : 'After login opens',
		secure: isAr ? 'اتشالَت البيانات الحساسة من الرابط' : 'Secrets removed from the URL',
	};

	const destPreview = sanitizeReturnPath(next) || next || '';

	return (
		<div className="sf-auto-root" dir={isAr ? 'rtl' : 'ltr'}>
			<style jsx global>{`
				html:has(.sf-auto-root),
				html:has(.sf-auto-root) body {
					height: 100dvh !important;
					max-height: 100dvh !important;
					overflow: hidden !important;
					overscroll-behavior: none;
				}
			`}</style>
			<style jsx>{`
				.sf-auto-root,
				.sf-auto-root :global(*) {
					box-sizing: border-box;
				}

				.sf-auto-root {
					height: 100%;
					max-height: 100dvh;
					overflow: hidden;
					font-family: ${isAr
						? 'Cairo, ui-sans-serif, system-ui, sans-serif'
						: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'};
					background:
						radial-gradient(circle at 82% 8%, rgba(65, 183, 255, 0.22), transparent 26%),
						radial-gradient(circle at 12% 88%, rgba(91, 111, 255, 0.12), transparent 28%),
						linear-gradient(135deg, #f5f9ff 0%, #edf3ff 100%);
					color: #101828;
					display: flex;
					padding: clamp(10px, 1.6vh, 18px) clamp(12px, 1.6vw, 22px);
				}

				.page {
					flex: 1;
					width: 100%;
					height: 100%;
					min-height: 0;
					display: grid;
					grid-template-columns: minmax(0, 1.08fr) minmax(320px, 0.92fr);
					position: relative;
					overflow: hidden;
				}

				.hero {
					position: relative;
					overflow: hidden;
					height: 100%;
					min-height: 0;
					display: flex;
					flex-direction: column;
					border-radius: ${isAr ? '0 22px 22px 0' : '22px 0 0 22px'};
					background:
						radial-gradient(circle at 92% 18%, rgba(46, 108, 255, 0.58), transparent 34%),
						radial-gradient(circle at 48% 86%, rgba(0, 89, 255, 0.28), transparent 36%),
						linear-gradient(145deg, #06132f, #071c4b 52%, #062a68);
					padding: clamp(18px, 3.2vh, 36px) clamp(24px, 3.6vw, 48px) clamp(16px, 2.6vh, 28px);
					color: white;
					box-shadow: 0 25px 60px rgba(24, 55, 100, 0.12);
				}

				.hero::before {
					content: '';
					position: absolute;
					width: min(640px, 90vw);
					height: min(640px, 90vw);
					border: 1px solid rgba(71, 137, 255, 0.28);
					border-radius: 50%;
					inset-inline-end: -42%;
					top: -22%;
					box-shadow:
						0 0 0 56px rgba(50, 116, 255, 0.04),
						0 0 0 112px rgba(50, 116, 255, 0.025);
					pointer-events: none;
				}

				.hero-grid {
					position: absolute;
					inset: 0;
					background-image: radial-gradient(rgba(125, 176, 255, 0.16) 1px, transparent 1px);
					background-size: 22px 22px;
					mask-image: radial-gradient(ellipse 70% 70% at 40% 40%, black 10%, transparent 75%);
					pointer-events: none;
				}

				.hero::after {
					content: '';
					position: absolute;
					width: 3px;
					height: 3px;
					background: #4da3ff;
					border-radius: 50%;
					inset-inline-start: 72%;
					top: 12%;
					box-shadow:
						-180px 220px 2px #2688ff,
						-260px 300px 2px #3b82f6,
						-90px 380px 2px #4da3ff,
						-310px 160px 2px #3182ff,
						40px 280px 2px #3182ff;
					pointer-events: none;
				}

				.brand {
					display: flex;
					align-items: center;
					gap: 12px;
					position: relative;
					z-index: 2;
					flex-shrink: 0;
				}

				.brand-logo {
					width: 40px;
					height: 40px;
					border-radius: 11px;
					border: 1px solid rgba(255,255,255,.16);
					background: rgba(255,255,255,.06);
					display: grid;
					place-items: center;
					box-shadow: inset 0 0 20px rgba(255,255,255,.05);
					overflow: hidden;
					flex-shrink: 0;
				}

				.brand-logo img {
					width: 72%;
					height: 72%;
					object-fit: contain;
				}

				.brand-name {
					font-size: 19px;
					font-weight: 750;
					letter-spacing: -0.4px;
				}

				.hero-content {
					position: relative;
					z-index: 2;
					flex: 1;
					min-height: 0;
					display: flex;
					flex-direction: column;
					margin-top: clamp(16px, 3.4vh, 40px);
				}

				.invite-pill {
					display: inline-flex;
					align-items: center;
					gap: 8px;
					width: fit-content;
					padding: 8px 13px;
					border-radius: 999px;
					background: #2563eb;
					border: 1px solid rgba(147, 197, 255, 0.35);
					color: #fff;
					font-size: 11px;
					font-weight: 750;
					letter-spacing: .42px;
					text-transform: uppercase;
					box-shadow: 0 10px 22px rgba(37, 99, 235, .28);
				}

				.hero h1 {
					margin-top: clamp(12px, 2.2vh, 22px);
					max-width: 470px;
					font-size: clamp(34px, 5.4vh, 58px);
					line-height: 1.04;
					letter-spacing: ${isAr ? '-1px' : '-2.4px'};
					font-weight: 800;
				}

				.hero h1 span {
					display: block;
					color: #3b82f6;
				}

				.hero-description {
					margin-top: clamp(10px, 1.8vh, 18px);
					max-width: 440px;
					color: #b6c4df;
					font-size: clamp(14px, 1.7vh, 16px);
					line-height: 1.55;
					flex-shrink: 0;
				}

				.illustration {
					position: relative;
					flex: 1;
					min-height: 112px;
					max-height: 250px;
					margin-top: clamp(4px, 1vh, 12px);
				}

				.platform {
					position: absolute;
					width: min(300px, 68%);
					height: 38%;
					inset-inline-start: 12%;
					bottom: 6%;
					transform: perspective(500px) rotateX(58deg) rotateZ(${isAr ? '1deg' : '-1deg'});
					border-radius: 22px;
					background: linear-gradient(135deg, rgba(71, 157, 255, .8), rgba(13, 85, 217, .42));
					border: 1px solid rgba(112, 187, 255, .85);
					box-shadow:
						0 22px 40px rgba(0, 95, 255, .32),
						inset 0 1px rgba(255,255,255,.45);
				}

				.platform::after {
					content: '';
					position: absolute;
					inset: 12px;
					border-radius: 14px;
					border: 1px solid rgba(255,255,255,.18);
				}

				.id-card {
					position: absolute;
					inset-inline-start: 20%;
					top: 8%;
					width: min(196px, 46%);
					height: 62%;
					border-radius: 18px;
					transform: rotate(${isAr ? '7deg' : '-7deg'});
					background: linear-gradient(145deg, #ffffff, #dcecff);
					border: 1px solid rgba(255,255,255,.9);
					box-shadow: 0 22px 36px rgba(0, 30, 100, .35);
					padding: 16px 18px;
					color: #23385e;
				}

				.id-avatar {
					width: 38px;
					height: 38px;
					border-radius: 50%;
					background: #e9f2ff;
					display: grid;
					place-items: center;
					color: #2876ee;
					margin-bottom: 8px;
				}

				.id-line {
					height: 6px;
					border-radius: 20px;
					background: #b8d0ef;
					margin: 6px 0;
				}

				.id-line.short { width: 55%; }

				.check {
					position: absolute;
					inset-inline-end: 14px;
					bottom: 14px;
					width: 36px;
					height: 36px;
					border-radius: 50%;
					display: grid;
					place-items: center;
					color: white;
					background: #2563eb;
					border: 3px solid #e8f3ff;
					box-shadow: 0 7px 18px rgba(35, 113, 239, .35);
				}

				.shield {
					position: absolute;
					inset-inline-start: 62%;
					top: 14%;
					width: 78px;
					height: 94px;
					clip-path: polygon(50% 0, 90% 16%, 90% 62%, 75% 82%, 50% 100%, 25% 82%, 10% 62%, 10% 16%);
					background: rgba(26, 105, 245, .16);
					border: 1px solid rgba(52, 133, 255, .42);
				}

				.shield-icon {
					position: absolute;
					inset-inline-start: 66%;
					top: 28%;
					color: #60a5fa;
					display: grid;
					place-items: center;
					filter: drop-shadow(0 8px 16px rgba(33, 117, 241, .35));
				}

				.features {
					position: relative;
					z-index: 2;
					flex-shrink: 0;
					display: grid;
					grid-template-columns: repeat(3, minmax(0, 1fr));
					gap: clamp(12px, 2vw, 24px);
					margin-top: clamp(10px, 1.8vh, 18px);
					padding-top: clamp(10px, 1.6vh, 16px);
					border-top: 1px solid rgba(99, 140, 210, 0.18);
				}

				.feature {
					display: flex;
					gap: 10px;
					min-width: 0;
				}

				.feature-icon {
					flex: 0 0 22px;
					color: #60a5fa;
					padding-top: 1px;
				}

				.feature h3 {
					font-size: 13px;
					margin: 0 0 4px;
					font-weight: 700;
				}

				.feature p {
					margin: 0;
					color: #8fa5c9;
					font-size: 11px;
					line-height: 1.45;
				}

				.right {
					position: relative;
					z-index: 3;
					height: calc(100% - clamp(24px, 5.4vh, 48px));
					align-self: center;
					min-height: 0;
					margin: 0;
					margin-inline-start: ${isAr ? '0' : '-44px'};
					margin-inline-end: ${isAr ? '-44px' : '0'};
					background: rgba(255,255,255,.97);
					border: 1px solid rgba(213,223,238,.85);
					border-radius: 24px;
					box-shadow:
						0 28px 64px rgba(29, 57, 99, .18),
						0 4px 14px rgba(29, 57, 99, .06);
					padding: clamp(22px, 4.2vh, 44px) clamp(28px, 4.4vw, 56px);
					display: flex;
					flex-direction: column;
					justify-content: center;
					overflow: hidden;
				}

				.form-header {
					display: flex;
					gap: 16px;
					align-items: flex-start;
					margin-bottom: clamp(14px, 2.4vh, 24px);
					flex-shrink: 0;
				}

				.header-icon {
					width: clamp(46px, 6vh, 58px);
					height: clamp(46px, 6vh, 58px);
					border-radius: 50%;
					background: #edf4ff;
					color: #1760e8;
					display: grid;
					place-items: center;
					flex-shrink: 0;
					box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.08);
				}

				.form-header h2 {
					margin: 4px 0 0;
					font-size: clamp(24px, 3.4vh, 32px);
					line-height: 1.1;
					letter-spacing: -1px;
					font-weight: 800;
					color: #101828;
				}

				.form-header p {
					margin: 8px 0 0;
					color: #66748b;
					line-height: 1.45;
					font-size: clamp(13px, 1.6vh, 15px);
					max-width: 420px;
				}

				.redirect-box {
					border: 1px solid #d7e4fa;
					background: linear-gradient(135deg, #f2f7ff, #edf4ff);
					border-radius: 14px;
					padding: 13px 16px;
					display: flex;
					gap: 12px;
					align-items: center;
					margin-bottom: clamp(14px, 2.4vh, 22px);
					flex-shrink: 0;
				}

				.redirect-icon { color: #216ff0; flex-shrink: 0; }

				.redirect-title {
					color: #2467df;
					font-size: 13px;
					font-weight: 700;
					margin-bottom: 3px;
				}

				.redirect-path {
					color: #17233c;
					font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
					font-size: 12px;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
				}

				.form-body {
					flex: 1;
					min-height: 0;
					display: flex;
					flex-direction: column;
					justify-content: center;
				}

				.field { margin-bottom: clamp(12px, 1.8vh, 18px); }

				.field label {
					display: block;
					font-size: 13px;
					font-weight: 700;
					color: #344054;
					margin-bottom: 7px;
				}

				.input-wrap { position: relative; }

				.input-icon {
					position: absolute;
					inset-inline-start: 16px;
					top: 50%;
					transform: translateY(-50%);
					color: #334155;
					pointer-events: none;
					display: grid;
					place-items: center;
				}

				.input {
					width: 100%;
					height: clamp(46px, 6vh, 52px);
					border: 1px solid #d5deea;
					background: #fbfcfe;
					border-radius: 13px;
					padding-inline: 48px;
					font-size: 15px;
					color: #172033;
					outline: none;
					transition: .2s ease;
					font-family: inherit;
				}

				.input:focus {
					border-color: #3980f4;
					box-shadow: 0 0 0 4px rgba(56,128,244,.10);
					background: white;
				}

				.password-toggle {
					position: absolute;
					inset-inline-end: 14px;
					top: 50%;
					transform: translateY(-50%);
					border: 0;
					background: transparent;
					color: #8a9ab2;
					cursor: pointer;
					display: grid;
					place-items: center;
					padding: 4px;
					border-radius: 8px;
				}

				.password-toggle:hover { color: #344054; }

				.notice {
					display: flex;
					gap: 8px;
					align-items: center;
					color: #66748b;
					font-size: 12px;
					margin: 0 0 clamp(12px, 2vh, 18px);
					flex-shrink: 0;
				}

				.notice-icon { color: #f5a400; flex-shrink: 0; }

				.primary-btn {
					width: 100%;
					height: clamp(48px, 6.4vh, 56px);
					border: 0;
					border-radius: 14px;
					background: linear-gradient(100deg, #3b82f6, #1d4ed8);
					color: white;
					font-size: 16px;
					font-weight: 750;
					cursor: pointer;
					box-shadow: 0 12px 24px rgba(39, 98, 230, .26);
					transition: .2s ease;
					display: inline-flex;
					align-items: center;
					justify-content: center;
					gap: 10px;
					font-family: inherit;
					flex-shrink: 0;
				}

				.primary-btn:hover:not(:disabled) {
					transform: translateY(-1px);
					box-shadow: 0 15px 28px rgba(39, 98, 230, .32);
				}

				.primary-btn:active:not(:disabled) { transform: translateY(1px); }
				.primary-btn:disabled { opacity: 0.7; cursor: wait; }

				.ghost-btn {
					width: 100%;
					height: 46px;
					margin-top: 12px;
					border-radius: 13px;
					border: 1px solid #d6deea;
					background: white;
					color: #475569;
					font-size: 15px;
					font-weight: 700;
					cursor: pointer;
					font-family: inherit;
				}

				.ghost-btn:hover { background: #f8fafc; }

				.status-box {
					text-align: center;
					padding: 12px 0 4px;
				}

				.status-box p {
					margin: 14px 0 0;
					font-size: 18px;
					font-weight: 800;
					color: #101828;
				}

				.status-box span {
					display: block;
					margin-top: 8px;
					font-size: 14px;
					color: #66748b;
				}

				.security-footer {
					margin-top: clamp(14px, 2.6vh, 28px);
					display: flex;
					justify-content: center;
					align-items: center;
					gap: 8px;
					color: #71809a;
					font-size: 12px;
					flex-shrink: 0;
				}

				.security-footer :global(svg) { color: #1769e8; }

				@media (max-height: 760px) {
					.illustration { max-height: 170px; }
					.feature p { display: none; }
				}

				@media (max-width: 1050px) {
					.sf-auto-root {
						padding: 16px;
						overflow: auto;
						height: 100%;
					}
					.page {
						grid-template-columns: 1fr;
						max-width: 640px;
						margin: 0 auto;
						height: auto;
						min-height: 100%;
						overflow: visible;
					}
					.hero { display: none; }
					.right {
						margin: 0;
						height: auto;
						min-height: calc(100dvh - 32px);
						padding: 36px 32px;
						border-radius: 22px;
						overflow: visible;
					}
				}

				@media (max-width: 600px) {
					.sf-auto-root { padding: 12px; }
					.right { padding: 24px 18px; min-height: calc(100dvh - 24px); }
					.form-header { gap: 12px; }
					.header-icon { width: 46px; height: 46px; }
					.form-header h2 { font-size: 24px; }
					.form-header p { font-size: 13px; }
					.redirect-box { padding: 12px; }
				}
			`}</style>

			<main className="page">
				<section className="hero" aria-hidden="true">
					<div className="hero-grid" />
					<div className="brand">
						<div className="brand-logo">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img src={logoSrc} alt="" />
						</div>
						<div className="brand-name">{brand}</div>
					</div>

					<div className="hero-content">
						<div className="invite-pill">
							<Link2 size={14} strokeWidth={2.25} />
							{copy.invited}
						</div>

						<h1>
							{copy.welcome}
							<span>{brand}</span>
						</h1>

						<p className="hero-description">{copy.heroDesc}</p>

						<div className="illustration">
							<div className="platform" />
							<div className="id-card">
								<div className="id-avatar">
									<User size={22} strokeWidth={2} />
								</div>
								<div className="id-line" />
								<div className="id-line short" />
								<div className="id-line" />
								<div className="id-line short" />
								<div className="check">
									<Check size={18} strokeWidth={3} />
								</div>
							</div>
							<div className="shield" />
							<div className="shield-icon">
								<Lock size={34} strokeWidth={2.2} />
							</div>
						</div>
					</div>

					<div className="features">
						<div className="feature">
							<div className="feature-icon">
								<Shield size={21} strokeWidth={2} />
							</div>
							<div>
								<h3>{copy.featSecure}</h3>
								<p>{copy.featSecureDesc}</p>
							</div>
						</div>
						<div className="feature">
							<div className="feature-icon">
								<Zap size={21} strokeWidth={2} />
							</div>
							<div>
								<h3>{copy.featFast}</h3>
								<p>{copy.featFastDesc}</p>
							</div>
						</div>
						<div className="feature">
							<div className="feature-icon">
								<Users size={21} strokeWidth={2} />
							</div>
							<div>
								<h3>{copy.featTeam}</h3>
								<p>{copy.featTeamDesc}</p>
							</div>
						</div>
					</div>
				</section>

				<section className="right">
					<div className="form-header">
						<div className="header-icon">
							<Mail size={28} strokeWidth={1.75} />
						</div>
						<div>
							<h2>{copy.title}</h2>
							<p>{copy.subtitle}</p>
						</div>
					</div>

					{destPreview ? (
						<div className="redirect-box">
							<div className="redirect-icon">
								<Link2 size={20} strokeWidth={2} />
							</div>
							<div className="min-w-0">
								<div className="redirect-title">{copy.opens}</div>
								<div className="redirect-path" title={destPreview}>{destPreview}</div>
							</div>
						</div>
					) : null}

					<div className="form-body">
					{status === 'working' && (
						<div className="status-box">
							<Loader2 className="w-10 h-10 mx-auto animate-spin text-[#2358df]" />
							<p>{copy.working}</p>
							<span>{email}</span>
						</div>
					)}

					{status === 'done' && (
						<div className="status-box">
							<Check className="w-10 h-10 mx-auto text-emerald-500" />
							<p>{message}</p>
						</div>
					)}

					{status === 'error' && (
						<div className="status-box">
							<ShieldAlert className="w-10 h-10 mx-auto text-amber-500" />
							<p>{message}</p>
							{hydrated && (email || password) ? (
								<button type="button" className="ghost-btn" onClick={() => setStatus('form')}>
									{copy.retry}
								</button>
							) : (
								<button
									type="button"
									className="primary-btn"
									style={{ marginTop: '1rem' }}
									onClick={() => router.replace(`/${locale}/auth${email ? `?email=${encodeURIComponent(email)}` : ''}`)}
								>
									{copy.goLogin}
								</button>
							)}
						</div>
					)}

					{status === 'form' && hydrated && (
						<form onSubmit={signIn}>
							<div className="field">
								<label htmlFor="auto-email">{copy.email}</label>
								<div className="input-wrap">
									<span className="input-icon">
										<Mail size={19} strokeWidth={1.85} />
									</span>
									<input
										id="auto-email"
										className="input"
										type="email"
										autoComplete="email"
										value={email}
										onChange={(ev) => setEmail(ev.target.value)}
										placeholder="name@example.com"
										required
									/>
								</div>
							</div>

							<div className="field">
								<label htmlFor="auto-password">{copy.password}</label>
								<div className="input-wrap">
									<span className="input-icon">
										<Lock size={19} strokeWidth={1.85} />
									</span>
									<input
										id="auto-password"
										className="input"
										type={showPwd ? 'text' : 'password'}
										autoComplete="current-password"
										value={password}
										onChange={(ev) => setPassword(ev.target.value)}
										placeholder="••••••••"
										required
									/>
									<button
										type="button"
										className="password-toggle"
										onClick={() => setShowPwd((v) => !v)}
										aria-label={showPwd
											? (isAr ? 'إخفاء كلمة المرور' : 'Hide password')
											: (isAr ? 'إظهار كلمة المرور' : 'Show password')}
									>
										{showPwd ? <EyeOff size={18} strokeWidth={1.85} /> : <Eye size={18} strokeWidth={1.85} />}
									</button>
								</div>
							</div>

							<div className="notice">
								<AlertTriangle size={16} className="notice-icon" strokeWidth={2} />
								<span>{copy.hint}</span>
							</div>

							<button type="submit" className="primary-btn" disabled={status === 'working'}>
								<LogIn size={18} strokeWidth={2.2} />
								{copy.submit}
								<ArrowRight size={16} strokeWidth={2.4} style={isAr ? { transform: 'scaleX(-1)' } : undefined} />
							</button>
						</form>
					)}
					</div>

					<div className="security-footer">
						<ShieldCheck size={17} strokeWidth={2.1} />
						{copy.secure}
					</div>
				</section>
			</main>
		</div>
	);
}
