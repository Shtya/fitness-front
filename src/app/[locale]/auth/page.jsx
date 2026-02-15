'use client';

import React, { useState, createContext, useContext, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { motion, AnimatePresence, LazyMotion, domAnimation } from 'framer-motion';
import axios from 'axios';
import { useTranslations } from 'next-intl';
import {
	AlertCircle,
	Eye,
	EyeOff,
	Star,
	Shield,
	Zap,
	Lock,
	ArrowRight,
	CheckCircle2,
	Award,
	Users,
	Activity,
	Dumbbell,
	Heart,
} from 'lucide-react';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { loginPersist } from '@/app/role-access';
import { useTheme } from '@/app/[locale]/theme';

/* ================== ANIMATION CONFIGS ================== */
const spring = { type: 'spring', stiffness: 400, damping: 30, mass: 0.8 };
const smoothSpring = { type: 'spring', stiffness: 300, damping: 28, mass: 0.9 };

/* ================== Axios Instance ================== */
const axiosInstance = axios.create({
	baseURL: process.env.NEXT_PUBLIC_BASE_URL + '/api/v1',
	headers: { 'Content-Type': 'application/json' },
});

axiosInstance.interceptors.request.use(
	(config) => {
		if (typeof window !== 'undefined') {
			const token = localStorage.getItem('accessToken');
			if (token) config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config;
		const url = (originalRequest?.url || '').toLowerCase();
		const AUTH_SKIP = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];
		const isAuthEndpoint = AUTH_SKIP.some((p) => url.includes(p));
		
		if (isAuthEndpoint) {
			return Promise.reject(error);
		}

		if (error.response?.status === 401 && !originalRequest?._retry) {
			const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
			if (!refreshToken) return Promise.reject(error);

			originalRequest._retry = true;
			try {
				const { data } = await axiosInstance.post('/auth/refresh', { refreshToken });
				const { accessToken, refreshToken: newRefreshToken } = data || {};
				if (typeof window !== 'undefined') {
					if (accessToken) localStorage.setItem('accessToken', accessToken);
					if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);
				}
				if (accessToken) originalRequest.headers.Authorization = `Bearer ${accessToken}`;
				return axiosInstance(originalRequest);
			} catch (refreshError) {
				if (typeof window !== 'undefined') {
					localStorage.removeItem('accessToken');
					localStorage.removeItem('refreshToken');
					localStorage.removeItem('user');
					window.location.href = '/auth';
				}
				return Promise.reject(refreshError);
			}
		}
		return Promise.reject(error);
	}
);

const AuthContext = createContext(null);

const loginSchema = yup.object().shape({
	email: yup.string().email('invalidEmail').required('invalidEmail'),
	password: yup.string().min(1, 'passwordRequired').required('passwordRequired'),
});

/* ================== Helper Functions ================== */
function getPostLoginPath(role) {
	const r = (role || '').toString().toLowerCase();
	if (r === 'admin') return '/dashboard/users';
	if (r === 'coach' || r === 'cocach') return '/dashboard/users';
	if (r === 'client') return '/dashboard/my/workouts';
	return '/dashboard/users';
}

/* ================== FLOATING PARTICLES - OPTIMIZED ================== */
const FloatingParticles = React.memo(() => {
	const { colors } = useTheme();
	const particles = useMemo(() => 
		Array.from({ length: 20 }, (_, i) => ({
			id: i,
			size: Math.random() * 5 + 2,
			x: Math.random() * 100,
			y: Math.random() * 100,
			duration: Math.random() * 8 + 12,
			delay: Math.random() * 5,
			opacity: Math.random() * 0.35 + 0.1,
		})), []
	);

	return (
		<div className="absolute inset-0 overflow-hidden pointer-events-none">
			{particles.map((p) => (
				<motion.div
					key={p.id}
					className="absolute rounded-full will-change-transform"
					style={{
						width: p.size,
						height: p.size,
						left: `${p.x}%`,
						top: `${p.y}%`,
						background: p.id % 2 === 0 ? colors.primary[400] : colors.secondary[400],
						opacity: p.opacity,
						boxShadow: `0 0 ${p.size * 2}px ${p.id % 2 === 0 ? colors.primary[400] : colors.secondary[400]}`,
					}}
					animate={{
						y: [0, -40, 0],
						x: [0, Math.random() * 30 - 15, 0],
						scale: [1, 1.4, 1],
						opacity: [p.opacity, p.opacity * 1.5, p.opacity],
					}}
					transition={{
						duration: p.duration,
						delay: p.delay,
						repeat: Infinity,
						ease: 'easeInOut',
					}}
				/>
			))}
		</div>
	);
});

FloatingParticles.displayName = 'FloatingParticles';

/* ================== TITLE COMPONENT - ENHANCED ================== */
const TitleLogin = React.memo(() => {
	const t = useTranslations('auth');
	const { colors } = useTheme();

	return (
		<motion.div 
			className="mb-8 text-center" 
			initial={{ opacity: 0, y: 30 }} 
			animate={{ opacity: 1, y: 0 }} 
			transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
		>
			{/* Badge */}
			<motion.div
				initial={{ opacity: 0, scale: 0.8 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
				className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-6 border-2 backdrop-blur-xl relative overflow-hidden"
				style={{
					backgroundColor: `${colors.primary[50]}`,
					borderColor: `${colors.primary[200]}`,
				}}>
				<motion.div
					animate={{ rotate: 360 }}
					transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
				>
					<Star className="w-4 h-4" style={{ color: colors.primary[600] }} />
				</motion.div>
				<span className="text-xs font-black uppercase tracking-wider" style={{ color: colors.primary[700] }}>
					{t('welcome', { defaultValue: 'Welcome Back' })}
				</span>
			</motion.div>

			{/* Title with enhanced gradient */}
			<motion.h1
				className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-3 leading-tight"
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.2, duration: 0.6 }}
				style={{
					color: `${colors.gradient.from}` 
				}}>
				{t('signIn')}
			</motion.h1>

			<motion.p 
				className="text-sm sm:text-base font-bold text-slate-600"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.3 }}
			>
				{t('subtitle')}
			</motion.p>

			{/* Decorative line */}
			<motion.div
				className="mt-5 h-1 w-20 mx-auto rounded-full"
				style={{
					background: `linear-gradient(90deg, ${colors.gradient.from}, ${colors.gradient.to})`,
				}}
				initial={{ scaleX: 0 }}
				animate={{ scaleX: 1 }}
				transition={{ delay: 0.4, duration: 0.6 }}
			/>
		</motion.div>
	);
});

TitleLogin.displayName = 'TitleLogin';

/* ================== FIELD ERROR ================== */
const FieldError = React.memo(({ msg }) => {
	if (!msg) return null;
	return (
		<motion.div
			initial={{ opacity: 0, y: -5, scale: 0.95 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			exit={{ opacity: 0, scale: 0.95 }}
			className="mt-3 flex items-center gap-2 text-sm text-red-600 font-bold bg-red-50 px-4 py-2.5 rounded-lg border-2 border-red-200">
			<AlertCircle className="w-4 h-4 flex-shrink-0" strokeWidth={2.5} />
			<span>{msg}</span>
		</motion.div>
	);
});

FieldError.displayName = 'FieldError';

/* ================== LOGIN FORM - ENHANCED ================== */
const LoginForm = React.memo(({ onLoggedIn }) => {
	const t = useTranslations('auth');
	const auth = useContext(AuthContext);
	const { colors } = useTheme();

	if (!auth) {
		throw new Error('AuthContext is not provided');
	}

	const { setLoading, setError, loading } = auth;
	const [showPassword, setShowPassword] = useState(false);
	const [focusedField, setFocusedField] = useState(null);

	const {
		register,
		handleSubmit,
		formState: { errors },
		setError: setRHError,
	} = useForm({
		resolver: yupResolver(loginSchema),
		defaultValues: { email: '', password: '' },
	});

	const onSubmit = useCallback(async (data) => {
		setLoading(true);
		setError(null);

		try {
			const response = await axiosInstance.post('/auth/login', data);
			const { accessToken, refreshToken, user } = response.data || {};

			if (!accessToken || !refreshToken) throw new Error('Missing tokens');

			if (typeof window !== 'undefined') {
				localStorage.setItem('accessToken', accessToken);
				localStorage.setItem('refreshToken', refreshToken);
				localStorage.setItem('user', JSON.stringify(user || {}));
			}

			await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
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

			const lowerMsg = String(msg).toLowerCase();
			if (lowerMsg.includes('email')) {
				setRHError('email', { type: 'server', message: 'invalidEmail' });
			} else if (lowerMsg.includes('password')) {
				setRHError('password', { type: 'server', message: 'passwordRequired' });
			}

			setError(msg);
			if (msg === 'Incorrect email or password') return toast.error(t(msg));
			toast.error(msg);
		} finally {
			setLoading(false);
		}
	}, [setLoading, setError, setRHError, onLoggedIn, t]);

	const togglePasswordVisibility = useCallback(() => {
		setShowPassword(prev => !prev);
	}, []);

	return (
		<LazyMotion features={domAnimation}>
			<motion.form 
				initial={{ opacity: 0, y: 20 }} 
				animate={{ opacity: 1, y: 0 }} 
				transition={{ duration: 0.5, delay: 0.1 }} 
				onSubmit={handleSubmit(onSubmit)} 
				className="w-full space-y-5" 
				noValidate
			>
				{/* Email */}
				<div className="space-y-2.5">
					<label className="block text-sm font-black text-slate-800 px-1">{t('email')}</label>
					<div className="relative group">
						<motion.div
							className="absolute inset-0 rounded-lg blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity -z-10"
							style={{
								background: `linear-gradient(135deg, ${colors.primary[300]}, ${colors.secondary[300]})`,
							}}
						/>
						<input
							type="email"
							inputMode="email"
							placeholder={t('enterEmail')}
							autoComplete="email"
							className="w-full h-14 rounded-lg border-2 bg-white px-4 text-base font-semibold outline-none transition-all duration-300"
							style={{
								borderColor: focusedField === 'email' ? colors.primary[400] : colors.primary[200],
								boxShadow: focusedField === 'email' ? `0 0 0 4px ${colors.primary[500]}15, 0 10px 30px -10px ${colors.primary[500]}30` : 'none',
							}}
							onFocus={() => setFocusedField('email')}
							onBlur={() => setFocusedField(null)}
							{...register('email')}
						/> 
					</div>
					<AnimatePresence>
						{errors.email?.message && <FieldError msg={t(String(errors.email.message))} />}
					</AnimatePresence>
				</div>

				{/* Password */}
				<div className="space-y-2.5">
					<label className="block text-sm font-black text-slate-800 px-1">{t('password')}</label>
					<div className="relative group">
						<motion.div
							className="absolute inset-0 rounded-lg blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity -z-10"
							style={{
								background: `linear-gradient(135deg, ${colors.primary[300]}, ${colors.secondary[300]})`,
							}}
						/>
						<input
							type={showPassword ? 'text' : 'password'}
							placeholder={t('enterPassword')}
							autoComplete="current-password"
							className="w-full h-14 rounded-lg border-2 bg-white px-4 ltr:pr-14 rtl:pl-14 text-base font-semibold outline-none transition-all duration-300"
							style={{
								borderColor: focusedField === 'password' ? colors.primary[400] : colors.primary[200],
								boxShadow: focusedField === 'password' ? `0 0 0 4px ${colors.primary[500]}15, 0 10px 30px -10px ${colors.primary[500]}30` : 'none',
							}}
							onFocus={() => setFocusedField('password')}
							onBlur={() => setFocusedField(null)}
							{...register('password')}
						/>
						<motion.button
							type="button"
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							aria-label={showPassword ? t('a11y.hidePassword') : t('a11y.showPassword')}
							onClick={togglePasswordVisibility}
							className="absolute inset-y-0 ltr:right-2 rtl:left-2 my-auto h-10 w-10 grid place-items-center rounded-lg transition-all duration-300"
							style={{
								backgroundColor: showPassword ? `${colors.primary[500]}20` : colors.primary[50],
								color: colors.primary[600],
							}}>
							{showPassword ? <EyeOff className="w-5 h-5" strokeWidth={2.5} /> : <Eye className="w-5 h-5" strokeWidth={2.5} />}
						</motion.button>
						 
					</div>
					<AnimatePresence>
						{errors.password?.message && <FieldError msg={t(String(errors.password.message))} />}
					</AnimatePresence>
				</div>

				{/* Submit Button */}
				<div className="pt-3">
					<motion.button
						disabled={loading}
						whileHover={{ scale: loading ? 1 : 1.02, y: loading ? 0 : -2 }}
						whileTap={{ scale: loading ? 1 : 0.98 }}
						className="relative w-full inline-flex items-center justify-center gap-3 overflow-hidden rounded-lg px-6 py-4 font-black text-base text-white transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed group shadow-2xl"
						style={{
							background: `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.via}, ${colors.gradient.to})`,
							boxShadow: `0 20px 40px -10px ${colors.primary[500]}60`,
						}}>
						<motion.div
							className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
							initial={{ x: '-100%' }}
							animate={{ x: loading ? '200%' : '-100%' }}
							transition={{
								repeat: loading ? Infinity : 0,
								duration: 1.5,
								ease: 'linear',
							}}
						/>

						<motion.div
							className="absolute inset-0"
							style={{
								background: `radial-gradient(circle, ${colors.primary[300]}40, transparent)`,
							}}
							animate={loading ? {
								scale: [1, 1.5, 1],
								opacity: [0.5, 0, 0.5],
							} : {}}
							transition={{
								duration: 2,
								repeat: Infinity,
							}}
						/>

						<span className="relative z-10 flex items-center gap-2.5">
							{loading ? (
								<>
									<span className="tracking-wide">{t('loading.signingIn')}</span>
									<motion.div 
										animate={{ rotate: 360 }} 
										transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} 
										className="w-5 h-5"
									>
										<Zap className="w-5 h-5" strokeWidth={2.5} />
									</motion.div>
								</>
							) : (
								<>
									<span className="tracking-wide">{t('signInButton')}</span>
									<motion.div 
										className="w-5 h-5" 
										animate={{ x: [0, 5, 0] }} 
										transition={{ repeat: Infinity, duration: 1.5 }}
									>
										<ArrowRight className="w-5 h-5 rtl:scale-x-[-1]" strokeWidth={2.5} />
									</motion.div>
								</>
							)}
						</span>

						<div className="absolute inset-0 rounded-lg bg-gradient-to-r from-white/0 via-white/30 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
					</motion.button>
				</div>
			</motion.form>
		</LazyMotion>
	);
});

LoginForm.displayName = 'LoginForm';

/* ================== HERO SIDE - OPTIMIZED ================== */
const HeroSide = React.memo(() => {
	const t = useTranslations('auth');
	const { colors } = useTheme();

	const features = useMemo(() => [
		{ icon: Dumbbell, text: t('hero.perkPersonalized', { defaultValue: 'Personalized Workouts' }) },
		{ icon: Activity, text: t('hero.perkProgress', { defaultValue: 'Track Progress' }) },
		{ icon: Users, text: t('hero.perkChat', { defaultValue: 'Coach Support' }) },
		{ icon: Heart, text: t('hero.perkPrivacy', { defaultValue: 'Privacy First' }) },
	], [t]);

	const stats = useMemo(() => [
		{ value: '10K+', label: t('stats.users', { defaultValue: 'Active Users' }), icon: Users },
		{ value: '95%', label: t('stats.satisfaction', { defaultValue: 'Satisfaction' }), icon: Award },
		{ value: '24/7', label: t('stats.support', { defaultValue: 'Support' }), icon: Shield },
	], [t]);

	return (
		<div className="relative w-full h-full overflow-hidden">
			<div
				className="absolute inset-0"
				style={{
					background: `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.via}, ${colors.gradient.to})`,
				}}
			/>

			<motion.div
				className="absolute -top-32 ltr:-left-32 rtl:-right-32 h-96 w-96 rounded-full opacity-30 blur-3xl will-change-transform"
				style={{
					background: `radial-gradient(circle, ${colors.primary[300]}, transparent)`,
				}}
				animate={{
					y: [0, 30, 0],
					x: [0, 20, 0],
					scale: [1, 1.2, 1],
				}}
				transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
			/>
			<motion.div
				className="absolute bottom-0 ltr:right-0 rtl:left-0 h-96 w-96 rounded-full opacity-30 blur-3xl will-change-transform"
				style={{
					background: `radial-gradient(circle, ${colors.secondary[300]}, transparent)`,
				}}
				animate={{
					y: [0, -30, 0],
					x: [0, -20, 0],
					scale: [1, 1.3, 1],
				}}
				transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
			/>

			<FloatingParticles />

			<div
				className="absolute inset-0 opacity-[0.03]"
				style={{
					backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`,
					backgroundSize: '50px 50px',
				}}
			/>

			<div className="relative z-10 max-w-2xl mx-auto h-full flex items-center px-8 lg:px-12 py-16">
				<div className="w-full">
					<motion.div
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/20 mb-6">
						<Star className="w-4 h-4 text-yellow-400" strokeWidth={2.5} />
						<span className="text-sm font-bold text-white">{t('hero.badge', { defaultValue: 'Premium Fitness Platform' })}</span>
					</motion.div>

					<motion.h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-5 text-white drop-shadow-2xl leading-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
						{t('hero.title')}
					</motion.h1>

					<motion.p className="text-lg md:text-xl text-white/95 mb-8 font-semibold leading-relaxed" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
						{t('hero.subtitle')}
					</motion.p>

					<div className="space-y-3 mb-8">
						{features.map((feature, i) => {
							const Icon = feature.icon;
							return (
								<motion.div
									key={i}
									className="flex gap-3 items-center group"
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}>
									<div className="w-12 h-12 rounded-lg flex items-center justify-center bg-white/10 backdrop-blur-sm border-2 border-white/20 shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:bg-white/20">
										<Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
									</div>
									<span className="text-base font-bold text-white group-hover:translate-x-1 transition-transform">{feature.text}</span>
								</motion.div>
							);
						})}
					</div>

					<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.8 }} className="grid grid-cols-3 gap-3">
						{stats.map((stat, i) => {
							const Icon = stat.icon;
							return (
								<motion.div
									key={i}
									whileHover={{ y: -5 }}
									className="text-center p-3 rounded-lg bg-white/10 backdrop-blur-sm border-2 border-white/20">
									<Icon className="w-5 h-5 text-white mx-auto mb-2" strokeWidth={2.5} />
									<div className="text-2xl font-black text-white mb-1">{stat.value}</div>
									<div className="text-xs font-semibold text-white/90">{stat.label}</div>
								</motion.div>
							);
						})}
					</motion.div>

					<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 1 }} className="mt-8 flex items-center gap-3">
						<div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
						<CheckCircle2 className="w-4 h-4 text-emerald-400" strokeWidth={2.5} />
						<span className="text-sm font-bold text-white/90">{t('hero.secure', { defaultValue: 'Secure & Encrypted' })}</span>
						<div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
					</motion.div>
				</div>
			</div>
		</div>
	);
});

HeroSide.displayName = 'HeroSide';

/* ================== TRUST INDICATORS ================== */
const TrustIndicators = React.memo(() => {
	const t = useTranslations('auth');
	const { colors } = useTheme();

	const indicators = useMemo(() => [
		{ icon: Shield, label: t('trust.secure', { defaultValue: 'Secure' }) },
		{ icon: Lock, label: t('trust.encrypted', { defaultValue: 'Encrypted' }) },
		{ icon: CheckCircle2, label: t('trust.verified', { defaultValue: 'Verified' }) },
	], [t]);

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ delay: 0.5 }}
			className="mt-6 pt-5 border-t-2"
			style={{ borderColor: colors.primary[100] }}>
			<div className="flex items-center justify-center gap-4 sm:gap-6 text-xs font-black flex-wrap">
				{indicators.map((item, i) => {
					const Icon = item.icon;
					return (
						<React.Fragment key={i}>
							{i > 0 && <div className="hidden sm:block w-px h-10" style={{ backgroundColor: colors.primary[200] }} />}
							<div className="flex flex-col sm:flex-row items-center gap-2" style={{ color: colors.primary[700] }}>
								<div 
									className="w-9 h-9 rounded-lg flex items-center justify-center"
									style={{ backgroundColor: colors.primary[100] }}
								>
									<Icon className="w-5 h-5" strokeWidth={2.5} />
								</div>
								<span>{item.label}</span>
							</div>
						</React.Fragment>
					);
				})}
			</div>
		</motion.div>
	);
});

TrustIndicators.displayName = 'TrustIndicators';

/* ================== MAIN PAGE ================== */
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
		const handleOAuthLogin = async () => {
			if (!token) return;
			try {
				if (typeof window !== 'undefined') {
					localStorage.setItem('accessToken', token);
				}
				const { data: user } = await axiosInstance.get('/auth/me', {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (typeof window !== 'undefined') {
					localStorage.setItem('user', JSON.stringify(user || {}));
				}
				toast.success(t('success.signedIn'));
				const path = getPostLoginPath(user?.role) || redirectUrl;
				router.push(path);
			} catch (e) {
				console.error('Failed to complete OAuth login', e);
				toast.error(t('errors.loginFailed'));
			}
		};
		handleOAuthLogin();
	}, [token, redirectUrl, router, t]);

	const handleLoggedIn = useCallback((user) => {
		const path = getPostLoginPath(user?.role) || '/dashboard/users';
		router.push(path);
	}, [router]);

	const authContextValue = useMemo(() => ({ loading, setLoading, error, setError }), [loading, error]);

	return (
		<AuthContext.Provider value={authContextValue}>
			<div className="relative min-h-screen overflow-hidden">
				{/* Desktop layout */}
				<div className="hidden lg:flex lg:min-h-screen">
					<div className="relative lg:w-1/2">
						<HeroSide />
					</div>
					<div
						className="flex-1 flex items-center justify-center px-6 lg:px-10 py-12 relative"
						style={{
							background: `linear-gradient(135deg, ${colors.primary[50]}, white, ${colors.secondary[50]})`,
						}}>
						<FloatingParticles />

						<motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="w-full max-w-[520px] relative z-10">
							<div className="bg-white/95 backdrop-blur-xl border-2 rounded-lg p-8 lg:p-10 shadow-2xl relative overflow-hidden" style={{ borderColor: colors.primary[200] }}>
								<div
									className="absolute top-0 left-0 right-0 h-2 rounded-t-3xl"
									style={{
										background: `linear-gradient(90deg, ${colors.gradient.from}, ${colors.gradient.via}, ${colors.gradient.to})`,
									}}
								/>

								<TitleLogin />
								<AnimatePresence mode="wait">
									<motion.div key="login-desktop" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
										<LoginForm onLoggedIn={handleLoggedIn} />
									</motion.div>
								</AnimatePresence>

								<TrustIndicators />
							</div>
						</motion.div>
					</div>
				</div>

				{/* Mobile/Tablet layout */}
				<div
					className="min-h-screen lg:hidden flex items-center justify-center px-4 sm:px-6 py-8 relative overflow-hidden"
					style={{
						background: `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.via}, ${colors.gradient.to})`,
					}}>
					
					<motion.div
						className="absolute -top-40 ltr:-left-40 rtl:-right-40 h-[500px] w-[500px] rounded-full opacity-30 blur-3xl will-change-transform"
						style={{
							background: `radial-gradient(circle, ${colors.primary[300]}, transparent)`,
						}}
						animate={{
							y: [0, 30, 0],
							x: [0, 20, 0],
							scale: [1, 1.3, 1],
						}}
						transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
					/>
					<motion.div
						className="absolute -bottom-40 ltr:-right-40 rtl:-left-40 h-[500px] w-[500px] rounded-full opacity-25 blur-3xl will-change-transform"
						style={{
							background: `radial-gradient(circle, ${colors.secondary[300]}, transparent)`,
						}}
						animate={{
							y: [0, -30, 0],
							x: [0, -20, 0],
							scale: [1, 1.4, 1],
						}}
						transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
					/>
					<motion.div
						className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full opacity-20 blur-3xl will-change-transform"
						style={{
							background: `radial-gradient(circle, ${colors.primary[400]}, transparent)`,
						}}
						animate={{
							scale: [1, 1.2, 1],
							opacity: [0.2, 0.3, 0.2],
							rotate: [0, 180, 360],
						}}
						transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
					/>

					<FloatingParticles />

					<div
						className="absolute inset-0 opacity-[0.03]"
						style={{
							backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
							backgroundSize: '40px 40px',
						}}
					/>

					<motion.div 
						initial={{ opacity: 0, y: 30 }} 
						animate={{ opacity: 1, y: 0 }} 
						transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} 
						className="w-full max-w-[440px]  relative z-10"
					>
						<div 
							className="rounded-lg border-2 bg-white/95 backdrop-blur-xl shadow-2xl p-6 sm:p-8 relative overflow-hidden"
							style={{
								borderColor: `${colors.primary[200]}60`,
								boxShadow: `0 30px 60px -10px ${colors.primary[900]}20, 0 0 0 1px ${colors.primary[200]}40`,
							}}
						>
							<div
								className="absolute top-0 left-0 right-0 h-2 rounded-t-3xl"
								style={{
									background: `linear-gradient(90deg, ${colors.gradient.from}, ${colors.gradient.via}, ${colors.gradient.to})`,
								}}
							/>

							<motion.div
								className="absolute top-4 ltr:right-4 rtl:left-4 w-16 h-16 rounded-lg opacity-10"
								style={{
									background: `linear-gradient(135deg, ${colors.primary[500]}, ${colors.secondary[500]})`,
								}}
								animate={{
									rotate: [0, 90, 0],
									scale: [1, 1.1, 1],
								}}
								transition={{ duration: 8, repeat: Infinity }}
							/>

							<TitleLogin />
							<AnimatePresence mode="wait">
								<motion.div key="login-mobile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
									<LoginForm onLoggedIn={handleLoggedIn} />
								</motion.div>
							</AnimatePresence>

							{/* <TrustIndicators /> */}
						</div>
					</motion.div>
				</div>
			</div>
		</AuthContext.Provider>
	);
}