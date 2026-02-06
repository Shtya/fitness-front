'use client';

import React, { useState, createContext, useContext, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useTranslations } from 'next-intl';
import {
	AlertCircle,
	Eye,
	EyeOff,
	Sparkles,
	Shield,
	Zap,
	Lock,
	ArrowRight,
	CheckCircle2,
	Star,
	TrendingUp,
	Award,
	Users,
	Activity,
	Dumbbell,
	Heart,
	Flame,
	Target,
	Trophy,
} from 'lucide-react';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { loginPersist } from '@/app/role-access';
import { useTheme } from '@/app/[locale]/theme';

/* ================== ANIMATION CONFIGS ================== */
const spring = { type: 'spring', stiffness: 400, damping: 30, mass: 0.8 };
const smoothSpring = { type: 'spring', stiffness: 300, damping: 28, mass: 0.9 };

/* ================== Axios (with refresh) ================== */

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

/* ================== FLOATING PARTICLES - ENHANCED ================== */

function FloatingParticles() {
	const { colors } = useTheme();
	const particles = Array.from({ length: 25 }, (_, i) => ({
		id: i,
		size: Math.random() * 6 + 2,
		x: Math.random() * 100,
		y: Math.random() * 100,
		duration: Math.random() * 8 + 12,
		delay: Math.random() * 5,
		opacity: Math.random() * 0.4 + 0.1,
	}));

	return (
		<div className="absolute inset-0 overflow-hidden pointer-events-none">
			{particles.map((p) => (
				<motion.div
					key={p.id}
					className="absolute rounded-full"
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
						scale: [1, 1.5, 1],
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
}

/* ================== TITLE COMPONENT - ENHANCED ================== */

function TitleLogin() {
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
				className="inline-flex items-center gap-2 px-5 py-3 rounded-full mb-6 border-2 backdrop-blur-xl relative overflow-hidden"
				style={{
					backgroundColor: `${colors.primary[50]}`,
					borderColor: `${colors.primary[200]}`,
				}}>
				<motion.div
					animate={{ rotate: 360 }}
					transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
				>
					<Star className="w-5 h-5" style={{ color: colors.primary[600] }} />
				</motion.div>
				<span className="text-sm font-black uppercase tracking-wider" style={{ color: colors.primary[700] }}>
					{t('welcome', { defaultValue: 'Welcome Back' })}
				</span>
			</motion.div>

			{/* Title with enhanced gradient */}
			<motion.h1
				className=" max-sm:hidden text-5xl lg:leading-[80px] text-xl  sm:text-6xl font-black tracking-tight mb-4"
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.2, duration: 0.6 }}
				style={{
					background: `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.via}, ${colors.gradient.to})`,
					WebkitBackgroundClip: 'text',
					WebkitTextFillColor: 'transparent',
					backgroundClip: 'text',
					backgroundSize: '200% 200%',
				}}>
				{t('signIn')}
			</motion.h1>

			<motion.p 
				className="text-base font-bold text-slate-600"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.3 }}
			>
				{t('subtitle')}
			</motion.p>

			{/* Decorative line */}
			<motion.div
				className="mt-6 h-1 w-24 mx-auto rounded-full"
				style={{
					background: `linear-gradient(90deg, ${colors.gradient.from}, ${colors.gradient.to})`,
				}}
				initial={{ scaleX: 0 }}
				animate={{ scaleX: 1 }}
				transition={{ delay: 0.4, duration: 0.6 }}
			/>
		</motion.div>
	);
}

/* ================== FIELD ERROR ================== */

function FieldError({ msg }) {
	if (!msg) return null;
	return (
		<motion.div
			initial={{ opacity: 0, y: -5, scale: 0.95 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			exit={{ opacity: 0, scale: 0.95 }}
			className="mt-3 flex items-center gap-2 text-sm text-red-600 font-bold bg-red-50 px-4 py-3 rounded-2xl border-2 border-red-200">
			<AlertCircle className="w-5 h-5 flex-shrink-0" strokeWidth={2.5} />
			<span>{msg}</span>
		</motion.div>
	);
}

/* ================== LOGIN FORM - ENHANCED ================== */

const LoginForm = ({ onLoggedIn }) => {
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

	const onSubmit = async (data) => {
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
			if (msg == 'Incorrect email or password') return toast.error(t(msg));
			toast.error(msg);
		} finally {
			setLoading(false);
		}
	};

	return (
		<motion.form 
			initial={{ opacity: 0, y: 20 }} 
			animate={{ opacity: 1, y: 0 }} 
			transition={{ duration: 0.5, delay: 0.1 }} 
			onSubmit={handleSubmit(onSubmit)} 
			className="w-full space-y-6" 
			noValidate
		>
			{/* Email */}
			<div className="space-y-3">
				<label className=" max-sm:hidden block text-sm font-black text-slate-800 ltr:ml-1 rtl:mr-1">{t('email')}</label>
				<div className="relative group">
					<motion.div
						className="absolute inset-0 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity -z-10"
						style={{
							background: `linear-gradient(135deg, ${colors.primary[300]}, ${colors.secondary[300]})`,
						}}
					/>
					<input
						type="email"
						inputMode="email"
						placeholder={t('enterEmail')}
						autoComplete="email"
						className="w-full h-16 rounded-2xl border-2 bg-white px-5 text-base font-semibold outline-none transition-all duration-300"
						style={{
							borderColor: focusedField === 'email' ? colors.primary[400] : colors.primary[200],
							boxShadow: focusedField === 'email' ? `0 0 0 4px ${colors.primary[500]}15, 0 10px 30px -10px ${colors.primary[500]}30` : 'none',
						}}
						onFocus={() => setFocusedField('email')}
						onBlur={() => setFocusedField(null)}
						{...register('email')}
					/>
					{/* Animated underline */}
					<motion.div
						className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl"
						style={{
							background: `linear-gradient(90deg, ${colors.gradient.from}, ${colors.gradient.to})`,
						}}
						initial={{ scaleX: 0 }}
						animate={{ scaleX: focusedField === 'email' ? 1 : 0 }}
						transition={{ duration: 0.3 }}
					/>
				</div>
				<AnimatePresence>
					{errors.email?.message && <FieldError msg={t(String(errors.email.message))} />}
				</AnimatePresence>
			</div>

			{/* Password */}
			<div className="space-y-3">
				<label className="max-sm:hidden block text-sm font-black text-slate-800 ltr:ml-1 rtl:mr-1">{t('password')}</label>
				<div className="relative group">
					<motion.div
						className="absolute inset-0 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity -z-10"
						style={{
							background: `linear-gradient(135deg, ${colors.primary[300]}, ${colors.secondary[300]})`,
						}}
					/>
					<input
						type={showPassword ? 'text' : 'password'}
						placeholder={t('enterPassword')}
						autoComplete="current-password"
						className="w-full h-16 rounded-2xl border-2 bg-white ltr:pr-16 rtl:pl-16 px-5 text-base font-semibold outline-none transition-all duration-300"
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
						onClick={() => setShowPassword((s) => !s)}
						className="absolute inset-y-0 ltr:right-3 rtl:left-3 my-auto h-12 w-12 grid place-items-center rounded-xl transition-all duration-300"
						style={{
							backgroundColor: showPassword ? `${colors.primary[500]}20` : colors.primary[50],
							color: colors.primary[600],
						}}>
						{showPassword ? <EyeOff className="w-6 h-6" strokeWidth={2.5} /> : <Eye className="w-6 h-6" strokeWidth={2.5} />}
					</motion.button>
					{/* Animated underline */}
					<motion.div
						className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl"
						style={{
							background: `linear-gradient(90deg, ${colors.gradient.from}, ${colors.gradient.to})`,
						}}
						initial={{ scaleX: 0 }}
						animate={{ scaleX: focusedField === 'password' ? 1 : 0 }}
						transition={{ duration: 0.3 }}
					/>
				</div>
				<AnimatePresence>
					{errors.password?.message && <FieldError msg={t(String(errors.password.message))} />}
				</AnimatePresence>
			</div>

			{/* Submit Button - Enhanced */}
			<div className="pt-4">
				<motion.button
					disabled={loading}
					whileHover={{ scale: loading ? 1 : 1.02, y: loading ? 0 : -2 }}
					whileTap={{ scale: loading ? 1 : 0.98 }}
					className="relative w-full inline-flex items-center justify-center gap-3 overflow-hidden rounded-2xl px-8 py-5 font-black text-lg text-white transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed group shadow-2xl"
					style={{
						background: `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.via}, ${colors.gradient.to})`,
						boxShadow: `0 20px 40px -10px ${colors.primary[500]}60`,
					}}>
					{/* Shimmer effect */}
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

					{/* Pulse effect */}
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

					<span className="relative z-10 flex items-center gap-3">
						{loading ? (
							<>
								<motion.div 
									animate={{ rotate: 360 }} 
									transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} 
									className="w-6 h-6"
								>
									<Zap className="w-6 h-6" strokeWidth={2.5} />
								</motion.div>
								<span className="tracking-wide">{t('loading.signingIn')}</span>
							</>
						) : (
							<>
								<span className="tracking-wide">{t('signInButton')}</span>
								<motion.div 
									className="w-6 h-6" 
									animate={{ x: [0, 5, 0] }} 
									transition={{ repeat: Infinity, duration: 1.5 }}
								>
									<ArrowRight className="w-6 h-6 rtl:scale-x-[-1]" strokeWidth={2.5} />
								</motion.div>
							</>
						)}
					</span>

					{/* Glow effect */}
					<div 
						className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/0 via-white/30 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" 
					/>
				</motion.button>
			</div>
		</motion.form>
	);
};

/* ================== HERO SIDE ================== */

function HeroSide() {
	const t = useTranslations('auth');
	const { colors } = useTheme();

	const features = [
		{ icon: Dumbbell, text: t('hero.perkPersonalized', { defaultValue: 'Personalized Workouts' }) },
		{ icon: Activity, text: t('hero.perkProgress', { defaultValue: 'Track Progress' }) },
		{ icon: Users, text: t('hero.perkChat', { defaultValue: 'Coach Support' }) },
		{ icon: Heart, text: t('hero.perkPrivacy', { defaultValue: 'Privacy First' }) },
	];

	const stats = [
		{ value: '10K+', label: t('stats.users', { defaultValue: 'Active Users' }), icon: Users },
		{ value: '95%', label: t('stats.satisfaction', { defaultValue: 'Satisfaction' }), icon: Award },
		{ value: '24/7', label: t('stats.support', { defaultValue: 'Support' }), icon: Shield },
	];

	return (
		<div className="relative w-full h-full overflow-hidden">
			{/* Dynamic gradient background */}
			<div
				className="absolute inset-0"
				style={{
					background: `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.via}, ${colors.gradient.to})`,
				}}
			/>

			{/* Animated gradient orbs */}
			<motion.div
				className="absolute -top-32 -left-32 h-96 w-96 rounded-full opacity-30 blur-3xl"
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
				className="absolute bottom-0 right-0 h-96 w-96 rounded-full opacity-30 blur-3xl"
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

			{/* Floating particles */}
			<FloatingParticles />

			{/* Grid pattern */}
			<div
				className="absolute inset-0 opacity-[0.03]"
				style={{
					backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`,
					backgroundSize: '50px 50px',
				}}
			/>

			{/* Content */}
			<div className="relative z-10 max-w-2xl mx-auto h-full flex items-center px-10 lg:px-14 py-16">
				<div className="w-full">
					{/* Badge */}
					<motion.div
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/20 mb-8">
						<Star className="w-5 h-5 text-yellow-400" strokeWidth={2.5} />
						<span className="text-sm font-bold text-white">{t('hero.badge', { defaultValue: 'Premium Fitness Platform' })}</span>
					</motion.div>

					{/* Title */}
					<motion.h1 className="text-5xl md:text-6xl lg:text-7xl  font-black mb-6 text-white drop-shadow-2xl leading-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
						{t('hero.title')}
					</motion.h1>

					{/* Subtitle */}
					<motion.p className="text-xl md:text-2xl text-white/95 mb-10 font-semibold leading-relaxed" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
						{t('hero.subtitle')}
					</motion.p>

					{/* Features */}
					<div className="space-y-4 mb-10">
						{features.map((feature, i) => {
							const Icon = feature.icon;
							return (
								<motion.div
									key={i}
									className="flex gap-4 items-center group"
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}>
									<div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/10 backdrop-blur-sm border-2 border-white/20 shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:bg-white/20">
										<Icon className="w-7 h-7 text-white" strokeWidth={2.5} />
									</div>
									<span className="text-lg font-bold text-white group-hover:translate-x-1 transition-transform">{feature.text}</span>
								</motion.div>
							);
						})}
					</div>

					{/* Stats */}
					<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.8 }} className=" grid grid-cols-3 gap-4">
						{stats.map((stat, i) => {
							const Icon = stat.icon;
							return (
								<motion.div
									key={i}
									whileHover={{ y: -5 }}
									className="text-center p-4 rounded-2xl bg-white/10 backdrop-blur-sm border-2 border-white/20">
									<Icon className="w-6 h-6 text-white mx-auto mb-2" strokeWidth={2.5} />
									<div className="text-3xl font-black text-white mb-1">{stat.value}</div>
									<div className="text-sm font-semibold text-white/90">{stat.label}</div>
								</motion.div>
							);
						})}
					</motion.div>

					{/* Decorative line */}
					<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 1 }} className="mt-10 flex items-center gap-4">
						<div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
						<CheckCircle2 className="w-5 h-5 text-emerald-400" strokeWidth={2.5} />
						<span className="text-sm font-bold text-white/90">{t('hero.secure', { defaultValue: 'Secure & Encrypted' })}</span>
						<div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
					</motion.div>
				</div>
			</div>
		</div>
	);
}

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

	const handleLoggedIn = (user) => {
		const path = getPostLoginPath(user?.role) || '/dashboard/users';
		router.push(path);
	};

	return (
		<AuthContext.Provider value={{ loading, setLoading, error, setError }}>
			<div className="relative min-h-screen overflow-hidden">
				{/* Desktop layout: split with hero on the left */}
				<div className="hidden lg:flex lg:min-h-screen">
					<div className="relative lg:w-1/2">
						<HeroSide />
					</div>
					<div
						className="flex-1 flex items-center justify-center px-6 lg:px-10 py-12 relative"
						style={{
							background: `linear-gradient(135deg, ${colors.primary[50]}, white, ${colors.secondary[50]})`,
						}}>
						{/* Floating particles */}
						<FloatingParticles />

						<motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="w-full max-w-[560px] relative z-10">
							<div className="bg-white/95 backdrop-blur-xl border-2 rounded-3xl p-10 shadow-2xl relative overflow-hidden" style={{ borderColor: colors.primary[200] }}>
								{/* Decorative gradient bar */}
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

								{/* Trust indicators */}
								<motion.div
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ delay: 0.5 }}
									className="mt-8 pt-6 border-t-2"
									style={{ borderColor: colors.primary[100] }}>
									<div className="flex items-center justify-center gap-6 text-xs font-bold text-gray-600">
										<div className="flex items-center gap-2">
											<div className="w-8 h-8 rounded-lg grid place-content-center" style={{ backgroundColor: colors.primary[100] }}>
												<Shield className="w-4 h-4" style={{ color: colors.primary[600] }} strokeWidth={2.5} />
											</div>
											<span>{t('trust.secure', { defaultValue: 'Secure' })}</span>
										</div>
										<div className="w-px h-5" style={{ backgroundColor: colors.primary[200] }} />
										<div className="flex items-center gap-2">
											<div className="w-8 h-8 rounded-lg grid place-content-center" style={{ backgroundColor: colors.primary[100] }}>
												<Lock className="w-4 h-4" style={{ color: colors.primary[600] }} strokeWidth={2.5} />
											</div>
											<span>{t('trust.encrypted', { defaultValue: 'Encrypted' })}</span>
										</div>
										<div className="w-px h-5" style={{ backgroundColor: colors.primary[200] }} />
										<div className="flex items-center gap-2">
											<div className="w-8 h-8 rounded-lg grid place-content-center" style={{ backgroundColor: colors.primary[100] }}>
												<CheckCircle2 className="w-4 h-4" style={{ color: colors.primary[600] }} strokeWidth={2.5} />
											</div>
											<span>{t('trust.verified', { defaultValue: 'Verified' })}</span>
										</div>
									</div>
								</motion.div>
							</div>
						</motion.div>
					</div>
				</div>

				{/* Mobile/Tablet layout - MASSIVELY ENHANCED */}
				<div
					className="min-h-screen lg:hidden flex items-center justify-center px-4 sm:px-6 py-8 relative overflow-hidden"
					style={{
						background: `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.via}, ${colors.gradient.to})`,
					}}>
					
					{/* Enhanced animated orbs */}
					<motion.div
						className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full opacity-30 blur-3xl"
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
						className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full opacity-25 blur-3xl"
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
						className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full opacity-20 blur-3xl"
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

					{/* Enhanced floating particles */}
					<FloatingParticles />

					{/* Grid pattern */}
					<div
						className="absolute inset-0 opacity-[0.03]"
						style={{
							backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
							backgroundSize: '40px 40px',
						}}
					/>

					{/* Main content container */}
					<motion.div 
						initial={{ opacity: 0, y: 30 }} 
						animate={{ opacity: 1, y: 0 }} 
						transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} 
						className="w-full max-w-[460px] relative z-10"
					>
						{/* Enhanced card */}
						<div 
							className="rounded-3xl border-2 bg-white/95 backdrop-blur-[100px]  shadow-2xl p-8 relative overflow-hidden"
							style={{
								borderColor: `${colors.primary[200]}60`,
								boxShadow: `0 30px 60px -10px ${colors.primary[900]}20, 0 0 0 1px ${colors.primary[200]}40`,
							}}
						>
							{/* Decorative gradient bar - enhanced */}
							<div
								className="absolute top-0 left-0 right-0 h-2 rounded-t-3xl"
								style={{
									background: `linear-gradient(90deg, ${colors.gradient.from}, ${colors.gradient.via}, ${colors.gradient.to})`,
								}}
							/>

							{/* Animated corner accent */}
							<motion.div
								className="absolute top-4 ltr:right-4 rtl:left-4 w-16 h-16 rounded-2xl opacity-10"
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

							{/* Enhanced trust indicators */}
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.5 }}
								className="mt-8 pt-6 border-t-2"
								style={{ borderColor: `${colors.primary[100]}` }}>
								<div className="flex items-center justify-center gap-6 text-xs font-black">
									<div className="flex flex-col items-center gap-2" style={{ color: colors.primary[700] }}>
										<div 
											className="w-10 h-10 rounded-xl flex items-center justify-center"
											style={{ backgroundColor: colors.primary[100] }}
										>
											<Shield className="w-5 h-5" strokeWidth={2.5} />
										</div>
										<span>{t('trust.secure', { defaultValue: 'Secure' })}</span>
									</div>
									<div className="w-px h-12" style={{ backgroundColor: colors.primary[200] }} />
									<div className="flex flex-col items-center gap-2" style={{ color: colors.primary[700] }}>
										<div 
											className="w-10 h-10 rounded-xl flex items-center justify-center"
											style={{ backgroundColor: colors.primary[100] }}
										>
											<Lock className="w-5 h-5" strokeWidth={2.5} />
										</div>
										<span>{t('trust.encrypted', { defaultValue: 'Encrypted' })}</span>
									</div>
									<div className="w-px h-12" style={{ backgroundColor: colors.primary[200] }} />
									<div className="flex flex-col items-center gap-2" style={{ color: colors.primary[700] }}>
										<div 
											className="w-10 h-10 rounded-xl flex items-center justify-center"
											style={{ backgroundColor: colors.primary[100] }}
										>
											<CheckCircle2 className="w-5 h-5" strokeWidth={2.5} />
										</div>
										<span>{t('trust.verified', { defaultValue: 'Verified' })}</span>
									</div>
								</div>
							</motion.div>
						</div>
 
					</motion.div>
				</div>
			</div>
		</AuthContext.Provider>
	);
}