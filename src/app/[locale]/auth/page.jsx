'use client';

import React, { useState, createContext, useContext, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useTranslations } from 'next-intl';
import { SubmitButton } from '@/components/pages/auth/SubmitButton';
// If your shared <Input /> supports only basic props, we’ll use our own fields to enable the eye toggle cleanly.
import { AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

/* ================== Axios (with refresh) ================== */

// const API_BASE_URL = 'http://localhost:8081/api/v1';
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL + '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

axiosInstance.interceptors.request.use(
  config => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    const url = (originalRequest?.url || '').toLowerCase();
    const AUTH_SKIP = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];
    const isAuthEndpoint = AUTH_SKIP.some(p => url.includes(p));
    if (isAuthEndpoint) {
      return Promise.reject(error); // <-- don't refresh, don't retry
    }

    // only attempt refresh on 401 once, and only if we have a refresh token
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
        return axiosInstance(originalRequest); // retry the ORIGINAL non-auth request
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
  },
);

/* ================== Auth Context ================== */

const AuthContext = createContext(null);

/* ================== Schemas ================== */

const loginSchema = z.object({
  email: z.string().email('invalidEmail'),
  password: z.string().min(1, 'passwordRequired'),
});

/* ================== Tiny UI Helpers ================== */

function TitleLogin() {
  const t = useTranslations('auth');
  return (
    <motion.div className='mb-6 text-left' initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <h1 className='text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 drop-shadow-sm'>{t('signIn')}</h1>
      <p className='mt-2 text-gray-600 md:text-lg'>{t('subtitle') || 'Welcome back! Log in to continue your progress.'}</p>
    </motion.div>
  );
}

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <div className='mt-1 flex items-center gap-1.5 text-sm text-red-600'>
      <AlertCircle className='w-4 h-4' />
      <span>{msg}</span>
    </div>
  );
}

/* ================== Login Form ================== */

const LoginForm = ({ onLoggedIn }) => {
  const t = useTranslations('auth');
  const { setLoading, setError, loading } = useContext(AuthContext);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError: setRHError,
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async data => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.post('/auth/login', data);
      const { accessToken, refreshToken, user } = response.data || {};

      if (!accessToken || !refreshToken) {
        throw new Error('Missing tokens');
      }

      // Respect "Remember me": persist or session-only
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user || {}));
      }

      toast.success(t('success.signedIn'));
      onLoggedIn?.(user);
    } catch (err) {
      let msg = err?.response?.data?.message || t('errors.loginFailed');
      if (err?.response?.status === 401) {
        const low = String(msg || '').toLowerCase();
        if (low.includes('pending')) msg = t('errors.accountPending');
        else if (low.includes('suspended')) msg = t('errors.accountSuspended');
      }
      // push to RHF field if recognizable:
      if (String(msg).toLowerCase().includes('email')) {
        setRHError('email', { type: 'server', message: msg });
      } else if (String(msg).toLowerCase().includes('password')) {
        setRHError('password', { type: 'server', message: msg });
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} onSubmit={handleSubmit(onSubmit)} className='w-full space-y-4' noValidate>
      {/* Email */}
      <div className='space-y-1.5'>
        <label className='block text-sm font-medium text-gray-700'>{t('email')}</label>
        <input type='email' inputMode='email' placeholder={t('enterEmail')} autoComplete='email' className='w-full h-11 rounded-lg border border-gray-200 bg-white px-3.5 outline-none ring-0 focus:border-gray-300 focus:ring-4 focus:ring-gray-100 transition' {...register('email')} />
        <FieldError msg={errors.email?.message} />
      </div>

      {/* Password with toggle */}
      <div className='space-y-1.5'>
        <label className='block text-sm font-medium text-gray-700'>{t('password')}</label>
        <div className='relative'>
          <input type={showPassword ? 'text' : 'password'} placeholder={t('enterPassword')} autoComplete='current-password' className='w-full h-11 rounded-lg border border-gray-200 bg-white px-3.5 pr-11 outline-none ring-0 focus:border-gray-300 focus:ring-4 focus:ring-gray-100 transition' {...register('password')} />
          <button type='button' aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(s => !s)} className='absolute inset-y-0 right-2.5 my-auto grid place-items-center rounded-lg p-2 hover:bg-gray-50 active:scale-95 transition'>
            {showPassword ? <EyeOff className='w-5 h-5 text-gray-500' /> : <Eye className='w-5 h-5 text-gray-500' />}
          </button>
        </div>
        <FieldError msg={errors.password?.message && t(errors.password.message)} />
      </div>

      <div className='pt-2'>
        <button disabled={loading} className=' w-full relative inline-flex items-center justify-center overflow-hidden rounded-lg px-6 py-3 font-semibold text-white bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 hover:from-blue-600 hover:via-indigo-600 hover:to-violet-600 focus:outline-none focus:ring-4 focus:ring-indigo-300/50 transition-all duration-300 shadow-md hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed '>
          <span className='relative z-10 flex items-center gap-2'>
            {loading && (
              <svg className='w-5 h-5 animate-spin text-white' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z'></path>
              </svg>
            )}
            {t('signInButton')}
          </span>
        </button>
      </div>

      {/* Divider */}
      <div className='flex items-center gap-3 pt-2'>
        <div className='h-px flex-1 bg-gray-200' />
        <span className='text-xs text-gray-500'>{t('or') || 'OR'}</span>
        <div className='h-px flex-1 bg-gray-200' />
      </div>

      {/* “Quick value” bullets for trust */}
      <ul className='grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700 pt-1'>
        {[t('bullet.personalized') || 'Personalized workout plans', t('bullet.progress') || 'Visual progress tracking', t('bullet.collab') || 'Coach collaboration', t('bullet.secure') || 'Secure authentication'].map((text, i) => (
          <li key={i} className='flex items-center gap-2'>
            <CheckCircle2 className='w-4 h-4 text-emerald-600' />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </motion.form>
  );
};

/* ================== Decorative Background (Left) ================== */

function HeroSide() {
  // Replace /auth-2.png with your asset
  const perks = ['Personalized workout plans', 'Progress charts & streaks', 'Coach chat & feedback', 'Safe & private data'];
  return (
    <div className='relative w-full h-full text-white overflow-hidden'>
      {/* Background image */}
      <img src='/auth-2.png' alt='' className='absolute inset-0 h-full w-full object-cover object-center' />
      {/* Gradient scrim */}
      <div
        className='absolute inset-0'
        style={{
          background: 'linear-gradient(270deg, rgba(0,0,0,0.1) 0%, rgba(8,11,15,0.55) 45%, rgba(8,11,15,0.85) 100%)',
        }}
      />
      {/* Animated blobs */}
      <motion.div className='absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-400/30 blur-3xl' animate={{ y: [0, 10, 0], x: [0, 8, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className='absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-teal-400/30 blur-3xl' animate={{ y: [0, -12, 0], x: [0, -8, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }} />

      {/* Content */}
      <div className='relative z-10 max-w-2xl mx-auto h-full flex items-center px-6 py-16 md:px-10 lg:px-14'>
        <div className='backdrop-blur-sm/0'>
          <motion.h1 className='text-3xl md:text-5xl font-extrabold mb-3 drop-shadow' initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            Start your fitness journey now!
          </motion.h1>
          <motion.p className='text-base md:text-xl text-white/90 mb-6 max-w-xl' initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            Track workouts, beat your PRs, and stay consistent with a platform built for real results.
          </motion.p>
          <div className='space-y-3 md:space-y-2 text-sm md:text-base'>
            {perks.map((text, i) => (
              <motion.p key={i} className='flex gap-2 items-center' initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.2 + i * 0.08 }}>
                <span className='w-6 h-6 grid place-items-center rounded-full bg-white/25 text-white text-xs'>✓</span>
                {text}
              </motion.p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================== Page ================== */

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('auth');

  const token = searchParams?.get('accessToken');
  const redirectUrl = searchParams?.get('redirect') || '/dashboard/my';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // OAuth handoff (if you ever pass ?accessToken=...)
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
        router.push(redirectUrl);
      } catch (e) {
        console.error('Failed to complete OAuth login', e);
        toast.error(t('errors.loginFailed'));
      }
    };
    handleOAuthLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleLoggedIn = user => {
    // role-based redirect can be done here
    router.push('/dashboard/my');
  };

  return (
    <AuthContext.Provider value={{ loading, setLoading, error, setError }}>
      <div className='min-h-screen flex flex-col lg:flex-row'>
        {/* Left visual panel */}
        <div className='relative lg:w-1/2'>
          <HeroSide />
        </div>

        {/* Right panel (login) */}
        <div className='flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-10 py-10'>
          <motion.div initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45 }} className='w-full max-w-[520px]'>
            {/* Card */}
            <div className='bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg p-6 sm:p-8 shadow-sm'>
              <TitleLogin />

              <AnimatePresence mode='wait'>
                <motion.div key='login-only' initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                  <LoginForm onLoggedIn={handleLoggedIn} />
                </motion.div>
              </AnimatePresence>

              {!!error && (
                <div className='mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
                  <AlertCircle className='w-4 h-4 mt-0.5 shrink-0' />
                  <p>{error}</p>
                </div>
              )}

              {/* Footer small help */}
              <div className='mt-6 text-xs text-gray-500 leading-relaxed'>
                <p>{t('securityNote') || 'We use industry-standard encryption and token-based authentication. Keep your credentials safe.'}</p>
              </div>
            </div>

            {/* Micro trust row */}
            <div className='mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs text-gray-600'>
              <div className='rounded-lg border border-gray-200 py-2 bg-white'>99.9% Uptime</div>
              <div className='rounded-lg border border-gray-200 py-2 bg-white'>JWT Secure</div>
              <div className='rounded-lg border border-gray-200 py-2 bg-white'>Coach Ready</div>
              <div className='rounded-lg border border-gray-200 py-2 bg-white'>Mobile Friendly</div>
            </div>
          </motion.div>
        </div>
      </div>
    </AuthContext.Provider>
  );
}
