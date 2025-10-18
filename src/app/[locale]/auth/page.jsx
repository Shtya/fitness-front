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
import { AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

/* ================== Axios (with refresh) ================== */

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

const AuthContext = createContext(null);

const loginSchema = z.object({
  email: z.string().email('invalidEmail'),
  password: z.string().min(1, 'passwordRequired'),
});

/* ================== Tiny UI Helpers ================== */

function getPostLoginPath(role) {
  const r = (role || '').toString().toLowerCase();
  if (r === 'admin') return '/dashboard';
  if (r === 'coach' || r === 'cocach') return '/dashboard/assign/users';
  if (r === 'client') return '/dashboard/my/workouts';
  return '/dashboard'; // fallback
}

function TitleLogin() {
  const t = useTranslations('auth');
  return (
    <motion.div className='mb-6 text-left' initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <h1 className='text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 drop-shadow-sm'>{t('signIn')}</h1>
      <p className='mt-2 font-[600] text-gray-800 md:text-lg'>{t('subtitle') }</p>
      <p className=' text-gray-600 md:text-base'>{t('subtitle2') }</p>
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

      {/* Submit */}
      <div className='pt-2'>
        <button disabled={loading} className='relative w-full inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl px-6 py-3 font-semibold text-white bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 hover:from-indigo-700 hover:via-indigo-600 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-indigo-300/50 transition-all duration-300 shadow-md hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed'>
          <span className='relative z-10 flex items-center gap-2'>
            {loading ? (
              <>
                <motion.span className='relative flex items-center justify-center' initial={{ rotate: 0 }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                  <svg  className=' stroke-white   w-5 h-5 text-white drop-shadow-sm' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                    <defs>
                      <linearGradient id='spinner-gradient' x1='0%' y1='0%' x2='100%' y2='100%'>
                        <stop offset='0%' stopColor='#6366f1' />
                        <stop offset='50%' stopColor='#4f46e5' />
                        <stop offset='100%' stopColor='#2563eb' />
                      </linearGradient>
                    </defs>
                    <circle className='opacity-25' cx='12' cy='12' r='10' stroke='url(#spinner-gradient)' strokeWidth='4'></circle>
                    <path fill='url(#spinner-gradient)' d='M4 12a8 8 0 018-8v3.5a4.5 4.5 0 00-4.5 4.5H4z'></path>
                  </svg>
                </motion.span>
                <motion.span className='text-sm tracking-wide text-white/90' initial={{ opacity: 0 }} animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.2 }}>
                  Signing in...
                </motion.span>
              </>
            ) : (
              <>
                <motion.span className='flex items-center justify-center' initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }}>
                  {t('signInButton')}
                </motion.span>
              </>
            )}
          </span>

          {/* Glowing overlay */}
          <span className='absolute inset-0 bg-gradient-to-br from-white/20 via-white/5 to-transparent opacity-0 hover:opacity-20 transition-opacity duration-300 rounded-xl'></span>
        </button>
      </div>

      {/* Divider */}
      <div className=' md:hidden flex items-center gap-3 pt-2'>
        <div className='h-px flex-1 bg-gray-200' />
        <div className='h-px flex-1 bg-gray-200' />
      </div>

 
    </motion.form>
  );
};

/* ================== Decorative Background (Left on Desktop) ================== */

function HeroSide() {
  // Desktop-only perks/bullets are kept, but hidden on small screens.
  const perks = ['Personalized workout plans', 'Progress charts & streaks', 'Coach chat & feedback', 'Safe & private data'];
  return (
    <div className='relative w-full h-full text-white overflow-hidden hidden lg:block'>
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

      {/* Content (bullets kept for desktop only) */}
      <div className='relative z-10 max-w-2xl mx-auto h-full flex items-center px-10 lg:px-14 py-16'>
        <div className='backdrop-blur-sm/0'>
          <motion.h1 className='text-4xl md:text-5xl font-extrabold mb-3 drop-shadow' initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            Start your fitness journey now!
          </motion.h1>
          <motion.p className='text-lg md:text-xl text-white/90 mb-6 max-w-xl' initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            Track workouts, beat your PRs, and stay consistent with a platform built for real results.
          </motion.p>
          <div className='space-y-2 text-base'>
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
        const path = getPostLoginPath(user?.role) || redirectUrl;
        router.push(path);
      } catch (e) {
        console.error('Failed to complete OAuth login', e);
        toast.error(t('errors.loginFailed'));
      }
    };
    handleOAuthLogin();
  }, [token]);

  const handleLoggedIn = user => {
    const path = getPostLoginPath(user?.role) || '/dashboard';
    router.push(path);
  };

  return (
    <AuthContext.Provider value={{ loading, setLoading, error, setError }}>
       <div className='relative min-h-screen '>
         <img src='/auth-2.png' alt='' className='absolute inset-0 -z-10 h-full w-full object-cover object-center lg:hidden' />
         <div
          className='absolute inset-0 -z-10 lg:hidden'
          style={{
            background: 'linear-gradient(180deg, rgba(8,11,15,0.55) 0%, rgba(8,11,15,0.35) 30%, rgba(8,11,15,0.25) 70%, rgba(8,11,15,0.45) 100%)',
          }}
        />

        {/* Desktop layout: split with sticky hero on the left */}
        <div className='hidden lg:flex lg:min-h-screen'>
          <div className='relative lg:w-1/2'>
            <HeroSide />
          </div>
          <div className='flex-1 flex items-center justify-center px-6 lg:px-10 py-12'>
            <motion.div initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45 }} className='w-full max-w-[520px]'>
              <div className='bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-lg'>
                <TitleLogin />
                <AnimatePresence mode='wait'>
                  <motion.div key='login-only-desktop' initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                    <LoginForm onLoggedIn={handleLoggedIn} />
                  </motion.div>
                </AnimatePresence>
                {!!error && (
                  <div className='mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
                    <AlertCircle className='w-4 h-4 mt-0.5 shrink-0' />
                    <p>{error}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Mobile/Tablet layout: form sits above the image */}
        <div className=' bg-gray-50 h-screen lg:hidden flex items-center justify-center px-4 sm:px-6 py-8'>
          <img src='/auth-2.png' alt='' className='absolute inset-0 h-full w-full object-cover object-center' />
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className='w-full max-w-[520px]'>
            <div className='rounded-xl border border-slate-200 bg-white/80 backdrop-blur-xl shadow-xl p-5 sm:p-6'>
              <TitleLogin />
              <AnimatePresence mode='wait'>
                <motion.div key='login-only-mobile' initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                  <LoginForm onLoggedIn={handleLoggedIn} />
                </motion.div>
              </AnimatePresence>
              {!!error && (
                <div className='mt-4 flex items-start gap-2 rounded-lg border border-red-200/70 bg-red-50/80 p-3 text-sm text-red-700'>
                  <AlertCircle className='w-4 h-4 mt-0.5 shrink-0' />
                  <p>{error}</p>
                </div>
              )}
            </div>
            <p className='mt-4 text-center text-xs text-white/90'>Protected by industry‑standard encryption.</p>
          </motion.div>
        </div>
      </div>
    </AuthContext.Provider>
  );
}
