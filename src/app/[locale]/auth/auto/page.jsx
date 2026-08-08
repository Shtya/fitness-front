'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
	Loader2, ShieldAlert, CheckCircle2, Mail, Lock, Eye, EyeOff,
	LogIn, Sparkles, ArrowRight, Link2,
} from 'lucide-react';
import { BRAND_LOGO_SRC } from '@/lib/brand';
import { loginPersist } from '@/app/role-access';
import { resolvePostLoginPath, sanitizeReturnPath } from '@/lib/nav-access';

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

	// Prefill once from URL, then scrub secrets from the address bar
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
		title: isAr ? 'تأكيد الدخول' : 'Confirm sign-in',
		subtitle: isAr
			? 'البيانات جاهزة من الرابط — عدّلها أو اضغط دخول'
			: 'Credentials from your invite link — edit or keep, then continue',
		email: isAr ? 'البريد الإلكتروني' : 'Email',
		password: isAr ? 'كلمة المرور' : 'Password',
		submit: isAr ? 'تسجيل الدخول' : 'Sign in',
		working: isAr ? 'جاري تسجيل الدخول…' : 'Signing you in…',
		retry: isAr ? 'حاول مرة أخرى' : 'Try again',
		goLogin: isAr ? 'الذهاب لتسجيل الدخول' : 'Go to login',
		hint: isAr
			? 'يمكنك تغيير الإيميل أو كلمة المرور قبل الدخول'
			: 'You can change the email or password before signing in',
		opens: isAr ? 'بعد الدخول سيفتح' : 'After login opens',
		secure: isAr ? 'تم إزالة البيانات الحساسة من الرابط' : 'Secrets removed from the URL',
	};

	const destPreview = sanitizeReturnPath(next) || next || '';

	return (
		<div className="sf-auto-root" dir={isAr ? 'rtl' : 'ltr'}>
			<style jsx>{`
				.sf-auto-root {
					min-height: 100dvh;
					display: grid;
					place-items: center;
					padding: 1.25rem;
					position: relative;
					overflow: hidden;
					background:
						radial-gradient(900px 480px at 8% -8%, color-mix(in srgb, var(--color-primary-300, #93c5fd) 45%, transparent), transparent 70%),
						radial-gradient(700px 420px at 95% 10%, color-mix(in srgb, var(--color-secondary-300, #a5b4fc) 35%, transparent), transparent 65%),
						radial-gradient(600px 360px at 50% 110%, color-mix(in srgb, var(--color-primary-200, #bfdbfe) 40%, transparent), transparent 60%),
						linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
				}
				.sf-auto-root::before {
					content: '';
					position: absolute;
					inset: 0;
					background-image:
						linear-gradient(color-mix(in srgb, var(--color-primary-500, #6366f1) 6%, transparent) 1px, transparent 1px),
						linear-gradient(90deg, color-mix(in srgb, var(--color-primary-500, #6366f1) 6%, transparent) 1px, transparent 1px);
					background-size: 48px 48px;
					mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 75%);
					pointer-events: none;
				}
				.sf-auto-card {
					position: relative;
					width: 100%;
					max-width: 420px;
					border-radius: 1.25rem;
					border: 1px solid rgba(148, 163, 184, 0.28);
					background: rgba(255, 255, 255, 0.92);
					backdrop-filter: blur(16px);
					box-shadow:
						0 1px 0 rgba(255,255,255,0.8) inset,
						0 24px 48px -20px rgba(15, 23, 42, 0.22),
						0 8px 16px -8px rgba(15, 23, 42, 0.08);
					overflow: hidden;
					animation: sf-auto-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
				}
				@keyframes sf-auto-in {
					from { opacity: 0; transform: translateY(14px) scale(0.98); }
					to { opacity: 1; transform: translateY(0) scale(1); }
				}
				.sf-auto-accent {
					height: 4px;
					background: linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-via, var(--color-primary-400)), var(--color-gradient-to));
				}
				.sf-auto-body { padding: 1.5rem 1.5rem 1.35rem; }
				.sf-auto-brand {
					display: flex;
					align-items: center;
					gap: 0.75rem;
					margin-bottom: 1.25rem;
				}
				.sf-auto-logo {
					width: 2.75rem;
					height: 2.75rem;
					border-radius: 0.85rem;
					display: grid;
					place-items: center;
					background: linear-gradient(145deg, #fff, #f1f5f9);
					border: 1px solid rgba(148, 163, 184, 0.35);
					box-shadow: 0 6px 14px -8px rgba(15, 23, 42, 0.35);
					overflow: hidden;
					flex-shrink: 0;
				}
				.sf-auto-logo img { width: 70%; height: 70%; object-fit: contain; }
				.sf-auto-badge {
					display: inline-flex;
					align-items: center;
					gap: 0.3rem;
					font-size: 10px;
					font-weight: 700;
					letter-spacing: 0.04em;
					text-transform: uppercase;
					color: var(--color-primary-600, #4f46e5);
					background: color-mix(in srgb, var(--color-primary-100, #e0e7ff) 80%, #fff);
					padding: 0.2rem 0.5rem;
					border-radius: 999px;
					margin-bottom: 0.25rem;
				}
				.sf-auto-title {
					margin: 0;
					font-size: 1.2rem;
					font-weight: 800;
					letter-spacing: -0.02em;
					color: #0f172a;
					line-height: 1.25;
				}
				.sf-auto-sub {
					margin: 0.35rem 0 0;
					font-size: 0.78rem;
					color: #64748b;
					line-height: 1.45;
				}
				.sf-auto-field { margin-bottom: 0.85rem; }
				.sf-auto-label {
					display: block;
					font-size: 0.72rem;
					font-weight: 700;
					color: #475569;
					margin-bottom: 0.35rem;
				}
				.sf-auto-input-wrap {
					display: flex;
					align-items: center;
					gap: 0.5rem;
					height: 2.75rem;
					padding: 0 0.75rem;
					border-radius: 0.75rem;
					border: 1.5px solid #e2e8f0;
					background: #f8fafc;
					transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
				}
				.sf-auto-input-wrap:focus-within {
					border-color: var(--color-primary-400, #818cf8);
					background: #fff;
					box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary-400, #818cf8) 22%, transparent);
				}
				.sf-auto-input-wrap svg { color: #94a3b8; flex-shrink: 0; }
				.sf-auto-input-wrap:focus-within svg { color: var(--color-primary-500, #6366f1); }
				.sf-auto-input {
					flex: 1;
					min-width: 0;
					border: 0;
					outline: none;
					background: transparent;
					font-size: 0.9rem;
					font-weight: 500;
					color: #0f172a;
				}
				.sf-auto-eye {
					border: 0;
					background: transparent;
					padding: 0.25rem;
					border-radius: 0.4rem;
					color: #94a3b8;
					cursor: pointer;
					display: grid;
					place-items: center;
				}
				.sf-auto-eye:hover { color: #475569; background: #e2e8f0; }
				.sf-auto-hint {
					display: flex;
					align-items: flex-start;
					gap: 0.4rem;
					font-size: 0.68rem;
					color: #64748b;
					margin: 0 0 1rem;
					line-height: 1.4;
				}
				.sf-auto-meta {
					display: flex;
					align-items: center;
					gap: 0.4rem;
					padding: 0.55rem 0.7rem;
					border-radius: 0.65rem;
					background: #f1f5f9;
					border: 1px solid #e2e8f0;
					font-size: 0.68rem;
					color: #475569;
					margin-bottom: 1rem;
					overflow: hidden;
				}
				.sf-auto-meta code {
					font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
					font-size: 0.65rem;
					color: #334155;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
				}
				.sf-auto-btn {
					width: 100%;
					height: 2.85rem;
					border: 0;
					border-radius: 0.8rem;
					display: inline-flex;
					align-items: center;
					justify-content: center;
					gap: 0.45rem;
					font-size: 0.9rem;
					font-weight: 800;
					color: #fff;
					cursor: pointer;
					background: linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to));
					box-shadow: 0 10px 22px -12px color-mix(in srgb, var(--color-primary-600, #4f46e5) 70%, transparent);
					transition: transform 0.15s, filter 0.15s, opacity 0.15s;
				}
				.sf-auto-btn:hover:not(:disabled) { filter: brightness(1.05); transform: translateY(-1px); }
				.sf-auto-btn:disabled { opacity: 0.65; cursor: wait; }
				.sf-auto-foot {
					margin-top: 0.85rem;
					text-align: center;
					font-size: 0.68rem;
					color: #94a3b8;
				}
				.sf-auto-status {
					text-align: center;
					padding: 1.25rem 0 0.5rem;
				}
				.sf-auto-status p {
					margin: 0.5rem 0 0;
					font-size: 0.9rem;
					font-weight: 700;
					color: #0f172a;
				}
				.sf-auto-status span {
					display: block;
					margin-top: 0.35rem;
					font-size: 0.75rem;
					font-weight: 500;
					color: #64748b;
				}
				.sf-auto-ghost {
					margin-top: 1rem;
					width: 100%;
					height: 2.5rem;
					border-radius: 0.75rem;
					border: 1px solid #e2e8f0;
					background: #fff;
					font-size: 0.8rem;
					font-weight: 700;
					color: #475569;
					cursor: pointer;
				}
				.sf-auto-ghost:hover { background: #f8fafc; }
			`}</style>

			<div className="sf-auto-card">
				<div className="sf-auto-accent" />
				<div className="sf-auto-body">
					<div className="sf-auto-brand">
						<div className="sf-auto-logo">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img src={BRAND_LOGO_SRC} alt="" />
						</div>
						<div className="min-w-0">
							<span className="sf-auto-badge">
								<Sparkles size={10} />
								{isAr ? 'دعوة دخول' : 'Invite login'}
							</span>
							<h1 className="sf-auto-title">{copy.title}</h1>
							<p className="sf-auto-sub">{copy.subtitle}</p>
						</div>
					</div>

					{status === 'working' && (
						<div className="sf-auto-status">
							<Loader2 className="w-9 h-9 mx-auto animate-spin text-[var(--color-primary-500)]" />
							<p>{copy.working}</p>
							<span>{email}</span>
						</div>
					)}

					{status === 'done' && (
						<div className="sf-auto-status">
							<CheckCircle2 className="w-9 h-9 mx-auto text-emerald-500" />
							<p>{message}</p>
						</div>
					)}

					{status === 'error' && (
						<div className="sf-auto-status">
							<ShieldAlert className="w-9 h-9 mx-auto text-amber-500" />
							<p>{message}</p>
							{hydrated && (email || password) ? (
								<button type="button" className="sf-auto-ghost" onClick={() => setStatus('form')}>
									{copy.retry}
								</button>
							) : (
								<button
									type="button"
									className="sf-auto-btn"
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
							{destPreview ? (
								<div className="sf-auto-meta">
									<Link2 size={13} className="shrink-0 text-[var(--color-primary-500)]" />
									<span className="shrink-0">{copy.opens}</span>
									<code title={destPreview}>{destPreview}</code>
								</div>
							) : null}

							<div className="sf-auto-field">
								<label className="sf-auto-label" htmlFor="auto-email">{copy.email}</label>
								<div className="sf-auto-input-wrap">
									<Mail size={15} />
									<input
										id="auto-email"
										className="sf-auto-input"
										type="email"
										autoComplete="username"
										value={email}
										onChange={(ev) => setEmail(ev.target.value)}
										placeholder="name@example.com"
										required
									/>
								</div>
							</div>

							<div className="sf-auto-field">
								<label className="sf-auto-label" htmlFor="auto-password">{copy.password}</label>
								<div className="sf-auto-input-wrap">
									<Lock size={15} />
									<input
										id="auto-password"
										className="sf-auto-input"
										type={showPwd ? 'text' : 'password'}
										autoComplete="current-password"
										value={password}
										onChange={(ev) => setPassword(ev.target.value)}
										placeholder="••••••••"
										required
									/>
									<button
										type="button"
										className="sf-auto-eye"
										onClick={() => setShowPwd((v) => !v)}
										aria-label={showPwd ? 'Hide password' : 'Show password'}
									>
										{showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
									</button>
								</div>
							</div>

							<p className="sf-auto-hint">
								<ShieldAlert size={12} className="shrink-0 mt-0.5 text-amber-500" />
								{copy.hint}
							</p>

							<button type="submit" className="sf-auto-btn" disabled={status === 'working'}>
								<LogIn size={16} />
								{copy.submit}
								<ArrowRight size={14} style={isAr ? { transform: 'scaleX(-1)' } : undefined} />
							</button>

							<p className="sf-auto-foot">{copy.secure}</p>
						</form>
					)}
				</div>
			</div>
		</div>
	);
}
