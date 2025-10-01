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
import { Input } from '@/components/pages/auth/Input';

/* ================== Axios (with refresh) ================== */

const API_BASE_URL = 'http://localhost:8081/api/v1';
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
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
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
        const { data } = await axiosInstance.post('/auth/refresh', { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = data;
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
        }
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/auth'; // back to login
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

/* ================== UI Bits ================== */

function TitleLogin() {
  const t = useTranslations('auth');
  return (
    <motion.div className='mb-6 text-left' data-aos='fade-down'>
      <h1 className='text-5xl font-extrabold tracking-tight text-gray-900 drop-shadow-sm'>{t('signIn')}</h1>
     </motion.div>
  );
}

/* ================== Login Form ================== */

const LoginForm = ({ onLoggedIn }) => {
  const t = useTranslations('auth');
  const ctx = useContext(AuthContext);
  const { setLoading, setError, loading } = ctx;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async data => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.post('/auth/login', data);
      const { accessToken, refreshToken, user } = response.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      toast.success(t('success.signedIn'));
      onLoggedIn?.(user);
    } catch (err) {
      let msg = err?.response?.data?.message || t('errors.loginFailed');
      if (err?.response?.status === 401) {
        if (String(msg).toLowerCase().includes('pending')) msg = t('errors.accountPending');
        else if (String(msg).toLowerCase().includes('suspended')) msg = t('errors.accountSuspended');
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} onSubmit={handleSubmit(onSubmit)} className='w-full space-y-4'>
      <Input label={t('email')} placeholder={t('enterEmail')} type='email' register={register('email')} error={errors.email?.message && t(errors.email.message)} />
      <Input label={t('password')} placeholder={t('enterPassword')} type='password' register={register('password')} error={errors.password?.message && t(errors.password.message)} />

      <div className='pt-2'>
        <SubmitButton isLoading={loading} fullWidth>
          {t('signInButton')}
        </SubmitButton>
      </div>
    </motion.form>
  );
};

/* ================== Page ================== */

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('auth');

  const token = searchParams?.get('accessToken');
  const redirectUrl = searchParams?.get('redirect') || '/dashboard/my';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null)

  // OAuth handoff (if you ever pass ?accessToken=...)
  useEffect(() => {
    const handleOAuthLogin = async () => {
      if (!token) return;
      try {
        localStorage.setItem('accessToken', token);
        const { data: user } = await axiosInstance.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        localStorage.setItem('user', JSON.stringify(user));
        toast.success(t('success.signedIn'));
        router.push(redirectUrl);
      } catch (e) {
        console.error('Failed to complete OAuth login', e);
        toast.error(t('errors.loginFailed'));
      }
    };
    handleOAuthLogin();
  }, [token, router, redirectUrl, t]);

  // useEffect(() => {
  //   try {
  //     const u = localStorage.getItem('user');
  //     if (u) router.push('/dashboard/my');
  //   } catch {}
  // }, [router]);

  const handleLoggedIn = user => {
    // role-based redirect is possible here if you want
    router.push('/dashboard/my');
  };

  return (
    <AuthContext.Provider value={{ loading, setLoading, error, setError }}>
      <div className='min-h-screen max-lg:flex-col container !px-0 flex'>
        {/* Left visual panel */}
        <div className='w-full flex max-lg:py-20 p-12 text-white relative overflow-hidden'>
          <div
            className='absolute inset-0 w-full h-full z-[10]'
            style={{
              background: 'linear-gradient(269.99deg, rgba(0, 0, 0, 0) 15.21%, rgba(0, 0, 0, 0.48) 33.9%, rgba(0, 0, 0, 0.8) 132.88%)',
            }}
          />
          <img src='/images/auth.jpeg' alt='' className='absolute inset-0 object-cover w-full h-full object-right' />
          <div className='relative z-10 max-w-2xl mx-auto my-auto'>
            <motion.h1 className='max-md:text-2xl text-4xl font-extrabold mb-3 drop-shadow' initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              Start your fitness journey now!
            </motion.h1>
            <motion.p className='max-md:text-lg text-2xl font-normal mb-6 drop-shadow' initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
              Track your workouts, set personal records, and achieve your fitness goals with our comprehensive workout platform.
            </motion.p>
            <div className='space-y-4 max-md:space-y-2 text-lg'>
              {['Personalized workout plans', 'Progress tracking', 'Coach collaboration', 'Secure authentication'].map((text, i) => (
                <motion.p key={i} className='flex gap-2 max-md:text-base items-center' initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}>
                  <span className='w-6 h-6 max-md:w-4 max-md:h-4 max-md:text-[10px] bg-white/20 rounded-full flex items-center justify-center'>✓</span>
                  {text}
                </motion.p>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel (login only) */}
        <div className='w-full max-w-[500px] max-lg:max-w-full flex items-center justify-center lg:px-10 p-6'>
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className='w-full max-lg:mt-[-60px] max-lg:z-[10] max-lg:max-w-[500px] max-lg:bg-slate-50 max-lg:border max-lg:border-slate-200 max-lg:rounded-2xl max-lg:p-8 max-lg:py-10 max-sm:py-8'>
            <TitleLogin />

            <AnimatePresence mode='wait'>
              <motion.div key='login-only' initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <LoginForm onLoggedIn={handleLoggedIn} />
              </motion.div>
            </AnimatePresence>

            {/* Optional: show API/form errors under the form */}
            {!!error && <p className='mt-4 text-center text-sm text-red-600'>{error}</p>}
          </motion.div>
        </div>
      </div>
    </AuthContext.Provider>
  );
}
