'use client';

import React, { useState, createContext, useContext, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { motion, AnimatePresence, LazyMotion, domAnimation, useMotionValue, useTransform } from 'framer-motion';
import axios from 'axios';
import { useTranslations } from 'next-intl';
import {
	AlertCircle, Eye, EyeOff, Shield, Zap, Lock,
	ArrowRight, CheckCircle2, Award, Users, Activity,
	Dumbbell, Heart, TrendingUp, Star,
	User,
} from 'lucide-react';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { loginPersist } from '@/app/role-access';
import { useTheme } from '@/app/[locale]/theme';

/* ── Axios ─────────────────────────────────────────────────────────────── */
const axiosInstance = axios.create({
	baseURL: process.env.NEXT_PUBLIC_BASE_URL + '/api/v1',
	headers: { 'Content-Type': 'application/json' },
});
axiosInstance.interceptors.request.use((cfg) => {
	if (typeof window !== 'undefined') {
		const tok = localStorage.getItem('accessToken');
		if (tok) cfg.headers.Authorization = `Bearer ${tok}`;
	}
	return cfg;
}, (e) => Promise.reject(e));
axiosInstance.interceptors.response.use((r) => r, async (error) => {
	const orig = error.config;
	const url = (orig?.url || '').toLowerCase();
	const SKIP = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];
	if (SKIP.some(p => url.includes(p))) return Promise.reject(error);
	if (error.response?.status === 401 && !orig?._retry) {
		const rt = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
		if (!rt) return Promise.reject(error);
		orig._retry = true;
		try {
			const { data } = await axiosInstance.post('/auth/refresh', { refreshToken: rt });
			const { accessToken: at, refreshToken: nrt } = data || {};
			if (typeof window !== 'undefined') {
				if (at) localStorage.setItem('accessToken', at);
				if (nrt) localStorage.setItem('refreshToken', nrt);
			}
			if (at) orig.headers.Authorization = `Bearer ${at}`;
			return axiosInstance(orig);
		} catch (re) {
			if (typeof window !== 'undefined') {
				['accessToken', 'refreshToken', 'user'].forEach(k => localStorage.removeItem(k));
				window.location.href = '/auth';
			}
			return Promise.reject(re);
		}
	}
	return Promise.reject(error);
});

/* ── Context / Schema ───────────────────────────────────────────────────── */
const AuthContext = createContext(null);
const loginSchema = yup.object().shape({
	email: yup.string().email('invalidEmail').required('invalidEmail'),
	password: yup.string().min(1, 'passwordRequired').required('passwordRequired'),
});
function getPostLoginPath(role) {
	const r = (role || '').toString().toLowerCase();
	if (r === 'admin' || r === 'coach' || r === 'cocach') return '/dashboard/users';
	if (r === 'client') return '/dashboard/my/workouts';
	return '/dashboard/users';
}

/* ── CSS-in-JS tokens ───────────────────────────────────────────────────── */
const C = {
	bg: '#f8f9fb',
	surface: '#ffffff',
	border: 'rgba(0,0,0,0.08)',
	textHi: '#0f172a',
	textMid: '#64748b',
	textLow: '#cbd5e1',
	error: '#dc2626',
};

/* ══════════════════════════════════════════════════════════════════════════
	 FIELD ERROR
══════════════════════════════════════════════════════════════════════════ */
const FieldError = React.memo(({ msg }) => {
	if (!msg) return null;
	return (
		<motion.p
			initial={{ opacity: 0, y: -4 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0 }}
			style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: C.error }}
		>
			<AlertCircle size={13} strokeWidth={2.5} style={{ flexShrink: 0 }} />
			{msg}
		</motion.p>
	);
});
FieldError.displayName = 'FieldError';

/* ══════════════════════════════════════════════════════════════════════════
	 LOGIN FORM
══════════════════════════════════════════════════════════════════════════ */
const LoginForm = React.memo(({ onLoggedIn }) => {
	const t = useTranslations('auth');
	const auth = useContext(AuthContext);
	const { colors } = useTheme();
	if (!auth) throw new Error('AuthContext missing');
	const { setLoading, setError, loading } = auth;
	const [showPwd, setShowPwd] = useState(false);
	const [focused, setFocused] = useState(null);

	const { register, handleSubmit, formState: { errors }, setError: setRHError } = useForm({
		resolver: yupResolver(loginSchema),
		defaultValues: { email: '', password: '' },
	});

	const onSubmit = useCallback(async (data) => {
		setLoading(true); setError(null);
		try {
			const res = await axiosInstance.post('/auth/login', data);
			const { accessToken, refreshToken, user } = res.data || {};
			if (!accessToken || !refreshToken) throw new Error('Missing tokens');
			if (typeof window !== 'undefined') {
				localStorage.setItem('accessToken', accessToken);
				localStorage.setItem('refreshToken', refreshToken);
				localStorage.setItem('user', JSON.stringify(user || {}));
			}
			await fetch('/api/auth/login', {
				method: 'POST', headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accessToken, refreshToken, user }),
			});
			loginPersist(user);
			toast.success(t('success.signedIn'));
			onLoggedIn?.(user);
		} catch (err) {
			let msg = err?.response?.data?.message || t('errors.loginFailed');
			if (err?.response?.status === 401) {
				const low = String(msg || '').toLowerCase();
				if (low.includes('pending')) msg = t('errors.accountPending');
				else if (low.includes('suspended')) msg = t('errors.accountSuspended');
			}
			const lm = String(msg).toLowerCase();
			if (lm.includes('email')) setRHError('email', { type: 'server', message: 'invalidEmail' });
			else if (lm.includes('password')) setRHError('password', { type: 'server', message: 'passwordRequired' });
			setError(msg); toast.error(msg);
		} finally { setLoading(false); }
	}, [setLoading, setError, setRHError, onLoggedIn, t]);

	const fieldStyle = (name) => ({
		background: 'transparent',
		border: 'none',
		borderBottom: `1px solid`,
		borderBottomColor: focused === name
			? colors.primary[400]
			: errors[name]
				? C.error
				: '#e2e8f0',
		borderRadius: 0,
		padding: '11px 36px 11px 0',
		width: '100%',
		fontSize: 14,
		fontWeight: 500,
		outline: 'none',
		color: '#0f172a',
		transition: 'border-color 0.2s',
		letterSpacing: '0.01em',
	});

	return (
		<LazyMotion features={domAnimation}>
			<motion.form
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.45, delay: 0.1 }}
				onSubmit={handleSubmit(onSubmit)}
				noValidate
				style={{ width: '100%' }}
			>
				{/* ── Email ── */}
				<div style={{ marginBottom: 28 }}>
					<label style={{
						display: 'block', fontSize: 10, fontWeight: 700,
						letterSpacing: '0.2em', textTransform: 'uppercase',
						color: '#64748b', marginBottom: 10,
					}}>
						{t('email')}
					</label>
					<div style={{ position: 'relative' }}>
						<input
							type="email" inputMode="email"
							placeholder={t('enterEmail')} autoComplete="email"
							style={fieldStyle('email')}
							onFocus={() => setFocused('email')}
							onBlur={() => setFocused(null)}
							className='!text-base'
							{...register('email')}
						/>
						<motion.div
							style={{
								position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
								background: `linear-gradient(90deg, ${colors.primary[500]}, ${colors.primary[300]})`,
								originX: 0,
							}}
							animate={{ scaleX: focused === 'email' ? 1 : 0 }}
							transition={{ duration: 0.28 }}
						/>

						<button
							type="button"
							style={{
								position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
								background: 'none', border: 'none', cursor: 'pointer',
								color: '#64748b', padding: '4px', display: 'flex', alignItems: 'center',
							}}
						>
							<User size={15} strokeWidth={2} />
						</button>

					</div>
					<AnimatePresence>{errors.email?.message && <FieldError msg={t(String(errors.email.message))} />}</AnimatePresence>
				</div>

				{/* ── Password ── */}
				<div style={{ marginBottom: 36 }}>
					<label style={{
						display: 'block', fontSize: 10, fontWeight: 700,
						letterSpacing: '0.2em', textTransform: 'uppercase',
						color: '#64748b', marginBottom: 10,
					}}>
						{t('password')}
					</label>
					<div style={{ position: 'relative' }}>
						<input
							type={showPwd ? 'text' : 'password'}
							placeholder={t('enterPassword')} autoComplete="current-password"
							style={fieldStyle('password')}
							onFocus={() => setFocused('password')}
							onBlur={() => setFocused(null)}
							className='!text-base'
							{...register('password')}
						/>
						<motion.div
							style={{
								position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
								background: `linear-gradient(90deg, ${colors.primary[500]}, ${colors.primary[300]})`,
								originX: 0,
							}}
							animate={{ scaleX: focused === 'password' ? 1 : 0 }}
							transition={{ duration: 0.28 }}
						/>
						<button
							type="button"
							onClick={() => setShowPwd(p => !p)}
							aria-label={showPwd ? t('a11y.hidePassword') : t('a11y.showPassword')}
							style={{
								position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
								background: 'none', border: 'none', cursor: 'pointer',
								color: '#64748b', padding: '4px', display: 'flex', alignItems: 'center',
							}}
						>
							{showPwd ? <EyeOff size={15} strokeWidth={2} /> : <Eye size={15} strokeWidth={2} />}
						</button>
					</div>
					<AnimatePresence>{errors.password?.message && <FieldError msg={t(String(errors.password.message))} />}</AnimatePresence>
				</div>

				{/* ── Submit ── */}
				<motion.button
					type="submit"
					disabled={loading}
					whileHover={!loading ? { scale: 1.01 } : {}}
					whileTap={!loading ? { scale: 0.99 } : {}}
					style={{
						position: 'relative', width: '100%', height: 50,
						borderRadius: 6, border: 'none',
						cursor: loading ? 'not-allowed' : 'pointer',
						overflow: 'hidden', opacity: loading ? 0.65 : 1,
						background: `linear-gradient(135deg, ${colors.gradient.from} 0%, ${colors.gradient.to} 100%)`,
						boxShadow: loading ? 'none' : `0 8px 32px -8px ${colors.primary[500]}60`,
					}}
				>
					{loading && (
						<motion.div
							style={{
								position: 'absolute', inset: 0,
								background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)',
							}}
							initial={{ x: '-100%' }}
							animate={{ x: '200%' }}
							transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
						/>
					)}
					<span style={{
						position: 'relative', zIndex: 1,
						display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
						color: 'white', fontWeight: 800, fontSize: 13,
						letterSpacing: '0.1em', textTransform: 'uppercase',

					}}>
						{loading ? (
							<>
								<motion.div
									style={{
										width: 15, height: 15, borderRadius: '50%',
										border: '2px solid rgba(255,255,255,0.25)',
										borderTopColor: 'white',
									}}
									animate={{ rotate: 360 }}
									transition={{ repeat: Infinity, duration: 0.75, ease: 'linear' }}
								/>
								{t('loading.signingIn')}
							</>
						) : (
							<>
								{t('signInButton')}
								<ArrowRight size={15} strokeWidth={2.5} className="rtl:scale-x-[-1]" />
							</>
						)}
					</span>
				</motion.button>

				{/* Security note */}
				<div style={{
					display: 'flex', alignItems: 'center', gap: 7,
					marginTop: 18, paddingTop: 18,
					borderTop: `1px solid ${'#e2e8f0'}`,
				}}>
					<Lock size={11} strokeWidth={2} style={{ color: '#94a3b8', flexShrink: 0 }} />
					<span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
						{t('trust.encrypted', { defaultValue: 'SSL secured · Data encrypted at rest' })}
					</span>
				</div>
			</motion.form>
		</LazyMotion>
	);
});
LoginForm.displayName = 'LoginForm';

/* ══════════════════════════════════════════════════════════════════════════
	 HERO SIDE  — dark editorial, diagonal slash, 3-D parallax tilt
══════════════════════════════════════════════════════════════════════════ */
const HeroSide = React.memo(() => {
	const t = useTranslations('auth');
	const { colors } = useTheme();
	const ref = useRef(null);
	const mx = useMotionValue(0.5);
	const my = useMotionValue(0.5);
	const rX = useTransform(my, [0, 1], [4, -4]);
	const rY = useTransform(mx, [0, 1], [-5, 5]);

	const onMove = useCallback((e) => {
		if (!ref.current) return;
		const { left, top, width, height } = ref.current.getBoundingClientRect();
		mx.set((e.clientX - left) / width);
		my.set((e.clientY - top) / height);
	}, [mx, my]);

	const features = useMemo(() => [
		{ icon: Dumbbell, label: t('hero.perkPersonalized', { defaultValue: 'Custom Programs' }), sub: t('hero.perkPersonalizedDetail', { defaultValue: 'Built for your body' }) },
		{ icon: TrendingUp, label: t('hero.perkProgress', { defaultValue: 'Progress Tracking' }), sub: t('hero.perkProgressDetail', { defaultValue: 'Real-time analytics' }) },
		{ icon: Users, label: t('hero.perkChat', { defaultValue: 'Expert Coaches' }), sub: t('hero.perkChatDetail', { defaultValue: 'Direct access, always' }) },
		{ icon: Heart, label: t('hero.perkPrivacy', { defaultValue: 'Privacy First' }), sub: t('hero.perkPrivacyDetail', { defaultValue: 'Your data stays yours' }) },
	], [t]);

	return (
		<div
			ref={ref}
			onMouseMove={onMove}
			style={{ position: 'relative', width: '100%', height: '100%', background: '#f0f4ff', overflow: 'hidden' }}
		>
			{/* ── Background layers ── */}
			{/* Bottom-right accent bloom */}
			<div style={{
				position: 'absolute', bottom: '-20%', right: '-15%',
				width: '75%', height: '75%',
				background: `radial-gradient(ellipse at center, ${colors.primary[300]}55, transparent 62%)`,
				pointerEvents: 'none',
			}} />
			{/* Top-left subtle glow */}
			<div style={{
				position: 'absolute', top: '-15%', left: '-10%',
				width: '50%', height: '50%',
				background: `radial-gradient(ellipse at center, ${colors.primary[200]}60, transparent 65%)`,
				pointerEvents: 'none',
			}} />
			{/* Fine dot matrix */}
			<div style={{
				position: 'absolute', inset: 0,
				backgroundImage: `radial-gradient(${colors.primary[300]}80 1px, transparent 1px)`,
				backgroundSize: '30px 30px',
				pointerEvents: 'none',
			}} />
			{/* Diagonal shard — the signature element */}
			<div style={{
				position: 'absolute', top: 0, right: 0,
				width: '42%', height: '100%',
				background: `linear-gradient(155deg, ${colors.primary[100]}cc, ${colors.primary[50]}99)`,
				clipPath: 'polygon(22% 0%, 100% 0%, 100% 100%, 0% 100%)',
				borderLeft: `1px solid ${colors.primary[200]}`,
				pointerEvents: 'none',
			}} />
			{/* Second smaller shard */}
			<div style={{
				position: 'absolute', top: 0, right: 0,
				width: '25%', height: '100%',
				background: `linear-gradient(155deg, ${colors.primary[200]}50, transparent)`,
				clipPath: 'polygon(30% 0%, 100% 0%, 100% 100%, 0% 100%)',
				pointerEvents: 'none',
			}} />

			{/* Giant background word — wallpaper texture */}
			<div style={{
				position: 'absolute', top: '44%', left: '-3%',
				transform: 'translateY(-50%) rotate(-8deg)',
				fontSize: 'clamp(110px, 16vw, 200px)',
				fontWeight: 900, letterSpacing: '-0.04em',
				color: `${colors.primary[200]}80`,
				userSelect: 'none', pointerEvents: 'none', lineHeight: 1,

				whiteSpace: 'nowrap',
			}}>
				FITNESS
			</div>

			{/* ── Content ── */}
			<div style={{
				position: 'relative', zIndex: 10, height: '100%',
				display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
				padding: 'clamp(36px, 4vh, 56px) clamp(36px, 4vw, 60px)',
			}}>

				{/* Brand mark */}
				<motion.div
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.45 }}
					style={{ display: 'flex', alignItems: 'center', gap: 11 }}
				>
					<div style={{
						width: 36, height: 36, borderRadius: 9,
						background: `linear-gradient(135deg, ${colors.primary[400]}, ${colors.primary[700]})`,
						display: 'flex', alignItems: 'center', justifyContent: 'center',
						boxShadow: `0 0 20px ${colors.primary[500]}45, 0 0 60px ${colors.primary[500]}15`,
					}}>
						<Dumbbell size={18} color="white" strokeWidth={2} />
					</div>
					<span style={{ color: '#1e293b', fontWeight: 700, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
						So7baFit
					</span>
				</motion.div>

				{/* ── Hero copy with subtle 3D tilt ── */}
				<motion.div style={{ perspective: 900 }}>
					<motion.div
						style={{ rotateX: rX, rotateY: rY, transformStyle: 'preserve-3d' }}
						transition={{ type: 'spring', stiffness: 80, damping: 25 }}
					>
						{/* Overline */}
						<motion.div
							initial={{ opacity: 0, x: -16 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: 0.18, duration: 0.5 }}
							style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}
						>
							<div style={{
								width: 28, height: 2, borderRadius: 2,
								background: `linear-gradient(90deg, ${colors.primary[400]}, transparent)`,
							}} />
							<span style={{
								fontSize: 9.5, fontWeight: 800, letterSpacing: '0.26em',
								textTransform: 'uppercase', color: colors.primary[400],
							}}>
								{t('hero.badge', { defaultValue: 'Premium Platform' })}
							</span>
						</motion.div>

						{/* Main headline */}
						<motion.h1
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.24, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
							style={{
								fontSize: 'clamp(2.2rem, 3.8vw, 3.6rem)',
								fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.0,
								color: '#0f172a', marginBottom: 16,

							}}
						>
							{t('hero.title')}
							<span style={{ color: colors.primary[400] }}>.</span>
						</motion.h1>

						<motion.p
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.34, duration: 0.5 }}
							style={{
								fontSize: 14, lineHeight: 1.75, color: '#4b5563',
								fontWeight: 500, maxWidth: 340, marginBottom: 36,
							}}
						>
							{t('hero.subtitle')}
						</motion.p>

						{/* Feature chips */}
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.46 }}
							style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}
						>
							{features.map((f, i) => {
								const Icon = f.icon;
								return (
									<motion.div
										key={i}
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: 0.48 + i * 0.07, duration: 0.35 }}
										style={{
											display: 'flex', alignItems: 'flex-start', gap: 10,
											padding: '12px 14px',
											borderRadius: 8,
											background: 'rgba(255,255,255,0.7)',
											border: `1px solid ${'#e2e8f0'}`,
											backdropFilter: 'blur(6px)',
										}}
									>
										<div style={{
											width: 28, height: 28, borderRadius: 6, flexShrink: 0,
											background: `${colors.primary[50]}`,
											border: `1px solid ${colors.primary[100]}`,
											display: 'flex', alignItems: 'center', justifyContent: 'center',
										}}>
											<Icon size={14} style={{ color: colors.primary[400] }} strokeWidth={2} />
										</div>
										<div>
											<div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>{f.label}</div>
											<div style={{ fontSize: 11, fontWeight: 500, color: '#64748b', marginTop: 2 }}>{f.sub}</div>
										</div>
									</motion.div>
								);
							})}
						</motion.div>
					</motion.div>
				</motion.div>

				{/* ── Stats row ── */}
				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.72, duration: 0.5 }}
					style={{
						display: 'flex', alignItems: 'center', gap: 0,
						paddingTop: 24, borderTop: `1px solid ${'#e2e8f0'}`,
					}}
				>
					{[
						{ val: '10K+', label: t('stats.users', { defaultValue: 'Athletes' }) },
						{ val: '95%', label: t('stats.satisfaction', { defaultValue: 'Satisfaction' }) },
						{ val: '24/7', label: t('stats.support', { defaultValue: 'Availability' }) },
					].map((s, i) => (
						<div key={i} style={{
							flex: 1,
							paddingRight: i < 2 ? 20 : 0,
							marginRight: i < 2 ? 20 : 0,
							borderRight: i < 2 ? `1px solid ${'#e2e8f0'}` : 'none',
						}}>
							<div style={{
								fontSize: 'clamp(1.2rem, 1.8vw, 1.6rem)',
								fontWeight: 900, color: '#0f172a',
								letterSpacing: '-0.03em', lineHeight: 1,

							}}>
								{s.val}
							</div>
							<div style={{
								fontSize: 10, color: '#64748b', fontWeight: 700,
								marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.12em',
							}}>
								{s.label}
							</div>
						</div>
					))}

					<div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
						<div style={{
							width: 6, height: 6, borderRadius: '50%',
							background: '#22c55e',
							boxShadow: '0 0 6px #22c55e80',
						}} />
						<span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
							{t('hero.secure', { defaultValue: 'SSL Live' })}
						</span>
					</div>
				</motion.div>

			</div>
		</div>
	);
});
HeroSide.displayName = 'HeroSide';

/* ══════════════════════════════════════════════════════════════════════════
	 FORM PANEL  — dark, tight, editorial
══════════════════════════════════════════════════════════════════════════ */
const FormPanel = React.memo(({ onLoggedIn }) => {
	const t = useTranslations('auth');
	const { colors } = useTheme();

	return (
		<div style={{
			position: 'relative', height: '100%',
			display: 'flex', flexDirection: 'column', justifyContent: 'center',
			background: '#ffffff',
			padding: 'clamp(32px, 5vh, 64px) clamp(32px, 5vw, 72px)',
		}}>
			{/* Corner glow */}
			<div style={{
				position: 'absolute', top: -40, right: -40,
				width: 220, height: 220,
				background: `radial-gradient(circle, ${colors.primary[100]}, transparent 65%)`,
				pointerEvents: 'none',
			}} />
			{/* Top rule */}
			<div style={{ position: 'absolute', top: 0, left: 40, right: 40, height: 1, background: '#f1f5f9' }} />
			{/* Bottom rule */}
			<div style={{ position: 'absolute', bottom: 0, left: 40, right: 40, height: 1, background: '#e2e8f0' }} />

			{/* Editorial page number */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.05 }}
				style={{
					position: 'absolute', top: 28, right: 'clamp(32px, 5vw, 72px)',
					fontSize: 10, fontWeight: 700, letterSpacing: '0.16em',
					textTransform: 'uppercase', color: '#94a3b8',
					userSelect: 'none',
				}}
			>
				01 — Auth
			</motion.div>

			<div style={{ maxWidth: 400, width: '100%' }}>
				{/* Heading block */}
				<motion.div
					initial={{ opacity: 0, y: 14 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
					style={{ marginBottom: 44 }}
				>
					{/* Glowing dot + overline */}
					<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
						<div style={{
							width: 7, height: 7, borderRadius: '50%',
							background: colors.primary[400],
							boxShadow: `0 0 10px ${colors.primary[400]}90, 0 0 22px ${colors.primary[400]}40`,
						}} />
						<span style={{
							fontSize: 9.5, fontWeight: 800, letterSpacing: '0.22em',
							textTransform: 'uppercase', color: colors.primary[400],
						}}>
							{t('welcome', { defaultValue: 'Welcome Back' })}
						</span>
					</div>

					<h1 style={{
						fontSize: 'clamp(1.8rem, 3vw, 2.7rem)',
						fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.0,
						color: '#0f172a', marginBottom: 10,

					}}>
						{t('signIn')}
					</h1>
					<p style={{ fontSize: 13, color: '#64748b', fontWeight: 500, lineHeight: 1.65 }}>
						{t('subtitle')}
					</p>
				</motion.div>

				<AnimatePresence mode="wait">
					<LoginForm onLoggedIn={onLoggedIn} />
				</AnimatePresence>
			</div>
		</div>
	);
});
FormPanel.displayName = 'FormPanel';

/* ══════════════════════════════════════════════════════════════════════════
	 MOBILE HERO STRIP
══════════════════════════════════════════════════════════════════════════ */
const MobileHero = React.memo(() => {
	const t = useTranslations('auth');
	const { colors } = useTheme();

	return (
		<div style={{
			position: 'relative', overflow: 'hidden',
			background: '#f0f4ff',
			padding: '44px 24px 56px',
			minHeight: '40vh',
			display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
		}}>
			{/* BG bloom */}
			<div style={{
				position: 'absolute', bottom: '-20%', right: '-15%',
				width: '70%', height: '70%',
				background: `radial-gradient(ellipse, ${colors.primary[300]}55, transparent 62%)`,
				pointerEvents: 'none',
			}} />
			{/* Dot matrix */}
			<div style={{
				position: 'absolute', inset: 0,
				backgroundImage: `radial-gradient(${colors.primary[300]}70 1px, transparent 1px)`,
				backgroundSize: '26px 26px', pointerEvents: 'none',
			}} />
			{/* Diagonal shard */}
			<div style={{
				position: 'absolute', top: 0, right: 0,
				width: '40%', height: '100%',
				background: `linear-gradient(155deg, ${colors.primary[100]}, transparent)`,
				clipPath: 'polygon(22% 0%, 100% 0%, 100% 100%, 0% 100%)',
				borderLeft: `1px solid ${colors.primary[200]}`,
				pointerEvents: 'none',
			}} />
			{/* BG word */}
			<div style={{
				position: 'absolute', bottom: -12, left: -6,
				fontSize: 100, fontWeight: 900, letterSpacing: '-0.04em',
				color: `${colors.primary[200]}80`, userSelect: 'none', pointerEvents: 'none',

			}}>FITNESS</div>

			{/* Brand */}
			<div  className='rtl:right-[34px] ltr:left-[34px]' style={{
				position: 'absolute', top: 36,  
				display: 'flex', alignItems: 'center', gap: 10,
			}}>
				<div style={{
					width: 30, height: 30, borderRadius: 7,
					background: `linear-gradient(135deg, ${colors.primary[400]}, ${colors.primary[700]})`,
					display: 'flex', alignItems: 'center', justifyContent: 'center',
					boxShadow: `0 0 14px ${colors.primary[500]}40`,
				}}>
					<Dumbbell size={14} color="white" strokeWidth={2} />
				</div>
				<span className=' !text-lg font-[Inter] ' style={{ color: '#1e293b', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
					So7baFit
				</span>
			</div>

			<div style={{ position: 'relative', zIndex: 10 }}>
				<div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.24em', textTransform: 'uppercase', color: colors.primary[400], marginBottom: 10 }}>
					{t('hero.badge', { defaultValue: 'Premium Fitness' })}
				</div>
				<h2 style={{
					fontSize: 'clamp(1.9rem, 7vw, 2.8rem)', fontWeight: 900,
					letterSpacing: '-0.04em', lineHeight: 1.0, color: '#0f172a',
					marginBottom: 10,
				}}>
					{t('hero.title')}<span style={{ color: colors.primary[400] }}>.</span>
				</h2>
				<p style={{ fontSize: 13, color: '#4b5563', fontWeight: 500, lineHeight: 1.6, maxWidth: 300, marginBottom: 22 }}>
					{t('hero.subtitle')}
				</p>

				{/* Compact stats row */}
				<div style={{ display: 'flex', gap: 20 }}>
					{[{ v: '10K+', l: 'Athletes' }, { v: '95%', l: 'Rating' }, { v: '24/7', l: 'Support' }].map((s, i) => (
						<div key={i}>
							<div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', fontFamily: "'Syne', sans-serif" }}>{s.v}</div>
							<div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.l}</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
});
MobileHero.displayName = 'MobileHero';

/* ══════════════════════════════════════════════════════════════════════════
	 MOBILE FORM SHEET
══════════════════════════════════════════════════════════════════════════ */
const MobileFormSheet = React.memo(({ onLoggedIn }) => {
	const t = useTranslations('auth');
	const { colors } = useTheme();

	return (
		<motion.div
			initial={{ y: 20, opacity: 0 }}
			animate={{ y: 0, opacity: 1 }}
			transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
			style={{
				background: '#ffffff',
				borderTopLeftRadius: 20, borderTopRightRadius: 20,
				marginTop: -20, position: 'relative', zIndex: 20,
				padding: '28px 24px 44px',
				boxShadow: '0 -20px 60px rgba(0,0,0,0.1)',
				flex: 1,
			}}
		>
			{/* Pull handle */}
			<div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
				<div style={{ width: 34, height: 3, borderRadius: 99, background: '#e2e8f0' }} />
			</div>



			{/* Heading */}
			<div style={{ marginBottom: 36 }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
					<div style={{
						width: 6, height: 6, borderRadius: '50%',
						background: colors.primary[400],
						boxShadow: `0 0 8px ${colors.primary[400]}80`,
					}} />
					<span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: colors.primary[400] }}>
						{t('welcome', { defaultValue: 'Welcome Back' })}
					</span>
				</div>
				<h2 style={{
					fontSize: 'clamp(1.7rem, 6vw, 2.1rem)', fontWeight: 900,
					letterSpacing: '-0.04em', lineHeight: 1.0, color: '#0f172a',
					marginBottom: 7,
				}}>
					{t('signIn')}
				</h2>
				<p style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{t('subtitle')}</p>
			</div>

			<AnimatePresence mode="wait">
				<LoginForm onLoggedIn={onLoggedIn} />
			</AnimatePresence>
		</motion.div>
	);
});
MobileFormSheet.displayName = 'MobileFormSheet';

/* ══════════════════════════════════════════════════════════════════════════
	 MAIN PAGE
══════════════════════════════════════════════════════════════════════════ */
export default function AuthPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const t = useTranslations('auth');
	const { colors } = useTheme();

	const token = searchParams?.get('accessToken');
	const redirectUrl = searchParams?.get('redirect') || '/dashboard/my/workouts';
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (!token) return;
		(async () => {
			try {
				if (typeof window !== 'undefined') localStorage.setItem('accessToken', token);
				const { data: user } = await axiosInstance.get('/auth/me', {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (typeof window !== 'undefined') localStorage.setItem('user', JSON.stringify(user || {}));
				toast.success(t('success.signedIn'));
				router.push(getPostLoginPath(user?.role) || redirectUrl);
			} catch (e) {
				console.error('OAuth login failed', e);
				toast.error(t('errors.loginFailed'));
			}
		})();
	}, [token, redirectUrl, router, t]);

	const handleLoggedIn = useCallback((user) => {
		router.push(getPostLoginPath(user?.role) || '/dashboard/users');
	}, [router]);

	const ctxVal = useMemo(() => ({ loading, setLoading, error, setError }), [loading, error]);

	return (
		<AuthContext.Provider value={ctxVal}>
			<style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .fit-auth input::placeholder { color: #94a3b8; }
        .fit-auth input { caret-color: ${colors.primary[400]}; }
        .fit-auth ::selection { background: ${colors.primary[600]}55; color: #1e293b; }

        /* ── Scrollbar ── */
        .fit-auth ::-webkit-scrollbar { width: 3px; }
        .fit-auth ::-webkit-scrollbar-track { background: #f8f9fb; }
        .fit-auth ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

        /* ── Responsive grid ── */
        .fit-desktop { display: none; }
        .fit-mobile  { display: flex; flex-direction: column; min-height: 100vh; }

        @media (min-width: 1024px) {
          .fit-desktop { display: grid; grid-template-columns: 1fr 1fr; min-height: 100vh; }
          .fit-mobile  { display: none; }
        }
      `}</style>

			<div className="fit-auth" style={{ background: '#f8f9fb', minHeight: '100vh' }}>

				{/* ── DESKTOP ── */}
				<div className="fit-desktop">
					<HeroSide />
					<div style={{ position: 'relative' }}>
						{/* Vertical divider between panels */}
						<div style={{
							position: 'absolute', top: 0, bottom: 0, left: 0, width: 1,
							background: 'linear-gradient(180deg, transparent 0%, #e2e8f0 15%, #e2e8f0 85%, transparent 100%)',
						}} />
						<FormPanel onLoggedIn={handleLoggedIn} />
					</div>
				</div>

				{/* ── MOBILE / TABLET ── */}
				<div className="fit-mobile">
					<MobileHero />
					<MobileFormSheet onLoggedIn={handleLoggedIn} />
				</div>

			</div>
		</AuthContext.Provider>
	);
}