'use client';

import React, { useState, createContext, useContext, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import OtpInput from 'react-otp-input';
import toast from 'react-hot-toast';
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useTranslations } from 'next-intl';
import { SubmitButton } from '@/components/pages/auth/SubmitButton';
import { Input } from '@/components/pages/auth/Input';
import { SelectInput } from '@/components/pages/auth/SelectInput';

// Configure axios base URL
const API_BASE_URL = 'http://localhost:8081/api/v1';
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
axiosInstance.interceptors.request.use(
  config => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

// Add response interceptor to handle token refresh
axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axiosInstance.post('/auth/refresh', {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Redirect to login if refresh fails
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/auth?tab=login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

// Context for authentication
const AuthContext = createContext(null);

// Updated schemas to match backend
const loginSchema = z.object({
  email: z.string().email('invalidEmail'),
  password: z.string().min(1, 'passwordRequired'),
});

const registerSchema = z.object({
  name: z.string().min(3, 'nameMin').max(30, 'nameMax'),
  email: z.string().email('invalidEmail'),
  password: z.string().min(8, 'passwordMin'),
  role: z.enum(['client', 'coach', 'admin']).default('client'),
  defaultRestSeconds: z.number().default(90),
});

const forgetPasswordSchema = z.object({
  email: z.string().email('invalidEmail'),
});

const passwordResetFormSchema = z.object({
  newPassword: z.string().min(8, 'passwordMin'),
  confirmNewPassword: z.string(),
  otp: z.string().min(6, 'otpRequired'),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: 'passwordsMatch',
  path: ['confirmNewPassword'],
});

// UI Components
export function TitleByTab({ activeTab }) {
  const t = useTranslations('auth');

  const TITLES = {
    login: {
      title: t('signIn'),
      subtitle: t('signInSubtitle'),
    },
    register: {
      title: t('signUp'),
      subtitle: t('createAccount'),
    },
    'forgot-password': {
      title: t('forgotPassword'),
      subtitle: t('resetPassword'),
    },
  };

  const content = TITLES[activeTab] || TITLES.login;

  return (
    <motion.div className='mb-6 text-center' data-aos='fade-down'>
      <h1 className='text-2xl font-extrabold tracking-tight text-gray-900 drop-shadow-sm'>{content.title}</h1>
      {content.subtitle && <p className='mt-2 text-sm text-gray-600 leading-relaxed'>{content.subtitle}</p>}
    </motion.div>
  );
}

const TABS = [
  { key: 'login', label: 'signIn' },
  { key: 'register', label: 'signUp' },
  { key: 'forgot-password', label: 'forgotPassword' },
];

export function AuthTabs({ activeTab, setActiveTab }) {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hoveredTab, setHoveredTab] = useState(null);

  const pillTarget = hoveredTab || activeTab;

  const handleClick = key => {
    setActiveTab(key);
    router.push(`/auth?tab=${key}`);
  };

  return (
    <LayoutGroup id='auth-tabs'>
      <div role='tablist' aria-label='Authentication' className='mb-6 grid grid-cols-3 gap-2 rounded-2xl bg-gray-100/80 p-1 text-sm font-medium ring-1 ring-black/5 shadow-sm backdrop-blur' data-aos='fade-up'>
        {TABS.map(tab => {
          const isPreviewed = pillTarget === tab.key;
          const isActive = activeTab === tab.key;

          return (
            <motion.button 
              key={tab.key} 
              role='tab' 
              aria-selected={isActive} 
              aria-controls={`panel-${tab.key}`} 
              id={`tab-${tab.key}`} 
              onClick={() => handleClick(tab.key)} 
              onMouseEnter={() => setHoveredTab(tab.key)} 
              onMouseLeave={() => setHoveredTab(null)} 
              whileHover={{ y: -1 }} 
              whileTap={{ scale: 0.98 }} 
              className='cursor-pointer relative select-none rounded-xl px-3 py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500/60'
            >
              {isPreviewed && <motion.span layoutId='active-pill' className='absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-400 shadow-lg' transition={{ type: 'spring', stiffness: 350, damping: 30 }} />}

              <span className={`relative z-10 transition-colors ${isPreviewed ? 'text-white drop-shadow-sm' : 'text-gray-700'}`}>
                {t(tab.label)}
              </span>
            </motion.button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

// Form Components
const LoginForm = ({ onLoggedIn }) => {
  const t = useTranslations('auth');
  const { setLoading, setError, loading } = useContext(AuthContext);
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
      let msg = err.response?.data?.message || t('errors.loginFailed');
      
      // Handle backend-specific error messages
      if (err.response?.status === 401) {
        if (msg.includes('pending approval')) {
          msg = t('errors.accountPending');
        } else if (msg.includes('suspended')) {
          msg = t('errors.accountSuspended');
        }
      }
      
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.3 }} 
      onSubmit={handleSubmit(onSubmit)} 
      className='w-full space-y-4'
    >
      <Input 
        label={t('email')} 
        placeholder={t('enterEmail')} 
        type='email' 
        register={register('email')} 
        error={errors.email?.message && t(errors.email.message)} 
      />
      <Input 
        label={t('password')} 
        placeholder={t('enterPassword')} 
        type='password' 
        register={register('password')} 
        error={errors.password?.message && t(errors.password.message)} 
      />

      <div className='pt-2'>
        <SubmitButton isLoading={loading} fullWidth>
          {t('signInButton')}
        </SubmitButton>
      </div>

      <div className='text-center pt-4'>
        <button
          type='button'
          onClick={() => window.location.href = '/auth?tab=forgot-password'}
          className='text-sm text-indigo-600 hover:text-indigo-700 hover:underline'
        >
          {t('forgotPassword')}
        </button>
      </div>
    </motion.form>
  );
};

const RegisterForm = ({ onSuccess }) => {
  const t = useTranslations('auth');
  const { setLoading, setError, loading } = useContext(AuthContext);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { 
      name: '', 
      email: '', 
      password: '', 
      role: 'client', 
      defaultRestSeconds: 90 
    },
  });

  const onSubmit = async data => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.post('/auth/register', data);
      toast.success(response.data.message || t('success.registrationPending'));
      onSuccess?.();
    } catch (err) {
      const msg = err.response?.data?.message || t('errors.registrationFailed');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.3 }} 
      onSubmit={handleSubmit(onSubmit)} 
      className='w-full space-y-4'
    >
      <Input 
        label={t('name')} 
        placeholder={t('enterName')} 
        type='text' 
        register={register('name')} 
        error={errors.name?.message && t(errors.name.message)} 
      />
      <Input 
        label={t('email')} 
        placeholder={t('enterEmail')} 
        type='email' 
        register={register('email')} 
        error={errors.email?.message && t(errors.email.message)} 
      />
      <Input 
        label={t('password')} 
        placeholder={t('enterPassword')} 
        type='password' 
        register={register('password')} 
        error={errors.password?.message && t(errors.password.message)} 
      />

      <SelectInput
        label={t('role.selectRole')}
        register={register('role')}
        options={[
          { value: 'client', label: t('role.client') },
          { value: 'coach', label: t('role.coach') },
        ]}
      />

      <Input 
        label={t('defaultRestSeconds')} 
        placeholder={t('enterRestSeconds')} 
        type='number' 
        register={register('defaultRestSeconds', { valueAsNumber: true })} 
        error={errors.defaultRestSeconds?.message && t(errors.defaultRestSeconds.message)} 
      />

      <div className='pt-2'>
        <SubmitButton isLoading={loading} fullWidth>
          {t('createAccountButton')}
        </SubmitButton>
      </div>
    </motion.form>
  );
};

const ForgotPasswordForm = ({ onOtp }) => {
  const t = useTranslations('auth');
  const { setLoading, setSuccess, setError, loading } = useContext(AuthContext);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgetPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async data => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await axiosInstance.post('/auth/forgot-password', data);
      sessionStorage.setItem('resetEmail', data.email);
      setSuccess(true);
      toast.success(t('success.otpSent'));
      onOtp?.(data.email);
    } catch (err) {
      const msg = err.response?.data?.message || t('errors.resetEmailFailed');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.3 }} 
      onSubmit={handleSubmit(onSubmit)} 
      className='w-full space-y-4'
    >
      <Input 
        label={t('email')} 
        placeholder={t('enterEmail')} 
        type='email' 
        register={register('email')} 
        error={errors.email?.message && t(errors.email.message)} 
      />

      <div className='pt-2'>
        <SubmitButton isLoading={loading} fullWidth>
          {t('sendOtpButton')}
        </SubmitButton>
      </div>

      <div className='text-center pt-4'>
        <button
          type='button'
          onClick={() => window.location.href = '/auth?tab=login'}
          className='text-sm text-gray-600 hover:text-gray-700 hover:underline'
        >
          {t('backToLogin')}
        </button>
      </div>
    </motion.form>
  );
};

const ResetPasswordForm = ({ email, otp }) => {
  const t = useTranslations('auth');
  const { setLoading, setSuccess, setError, loading } = useContext(AuthContext);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: zodResolver(passwordResetFormSchema),
    defaultValues: { 
      newPassword: '', 
      confirmNewPassword: '', 
      otp: otp || '' 
    },
  });

  useEffect(() => {
    if (otp) {
      setValue('otp', otp);
    }
  }, [otp, setValue]);

  const onSubmit = async data => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await axiosInstance.post('/auth/reset-password', {
        email,
        newPassword: data.newPassword,
        otp: data.otp,
      });
      setSuccess(true);
      toast.success(t('success.passwordReset'));
      // Redirect to login after successful reset
      setTimeout(() => {
        window.location.href = '/auth?tab=login';
      }, 2000);
    } catch (err) {
      const msg = err.response?.data?.message || t('errors.passwordResetFailed');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.3 }} 
      onSubmit={handleSubmit(onSubmit)} 
      className='w-full space-y-4'
    >
      <Input 
        label={t('email')} 
        type='text' 
        value={email} 
        disabled 
        cnInput='cursor-not-allowed' 
      />
      <Input 
        label={t('otpCode')} 
        placeholder={t('enterOtp')} 
        type='text' 
        register={register('otp')} 
        error={errors.otp?.message && t(errors.otp.message)} 
      />
      <Input 
        label={t('newPassword')} 
        placeholder={t('enterNewPassword')} 
        type='password' 
        register={register('newPassword')} 
        error={errors.newPassword?.message && t(errors.newPassword.message)} 
      />
      <Input 
        label={t('confirmPassword')} 
        placeholder={t('confirmNewPassword')} 
        type='password' 
        register={register('confirmNewPassword')} 
        error={errors.confirmNewPassword?.message && t(errors.confirmNewPassword.message)} 
      />

      <div className='pt-2'>
        <SubmitButton isLoading={loading} fullWidth>
          {t('resetPasswordButton')}
        </SubmitButton>
      </div>
    </motion.form>
  );
};

// Main Auth Page Component
export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab') || 'login';
  const token = searchParams?.get('accessToken');
  const redirectUrl = searchParams?.get('redirect') || '/dashboard/my';

  const [activeTab, setActiveTab] = useState(tabParam);
  const [view, setView] = useState('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [emailForOTP, setEmailForOTP] = useState('');
  const [otpForReset, setOtpForReset] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Handle access token from query params (OAuth login)
  useEffect(() => {
    const handleOAuthLogin = async () => {
      if (token) {
        try {
          localStorage.setItem('accessToken', token);

          // Get user info using the token
          const response = await axiosInstance.get('/auth/me', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const user = response.data;
          localStorage.setItem('user', JSON.stringify(user));
          setCurrentUser(user);

          toast.success('Logged in successfully!');
          router.push(redirectUrl);
        } catch (error) {
          console.error('Failed to get user info:', error);
          toast.error('Failed to complete login');
        }
      }
    };

    handleOAuthLogin();
  }, [token, router, redirectUrl]);

  useEffect(() => {
    setActiveTab(tabParam);
    setView('form');
    setError(null);
    setSuccess(false);
  }, [tabParam]);

  // Load logged user (if any)
  useEffect(() => {
    try {
      const u = localStorage.getItem('user');
      if (u) {
        const userData = JSON.parse(u);
        setCurrentUser(userData);

        // If user is already logged in, redirect to dashboard/my page
        if (userData && window.location.pathname === '/auth') {
          router.push('/dashboard/my');
        }
      }
    } catch {}
  }, []);

  const handleResetOTP = otp => {
    setOtpForReset(otp);
    setView('reset');
  };

  const handleLoggedIn = user => {
    setCurrentUser(user);
    router.push('/dashboard/my');
  };

  const renderContent = () => {
    if (activeTab === 'forgot-password' && view === 'reset') {
      return <ResetPasswordForm email={emailForOTP} otp={otpForReset} />;
    }

    switch (activeTab) {
      case 'login':
        return <LoginForm onLoggedIn={handleLoggedIn} />;
      case 'register':
        if (view === 'registrationSuccess') {
          return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className='text-center'>
              <div className='w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center'>
                <svg className='w-8 h-8 text-green-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                </svg>
              </div>
              <h3 className='text-lg font-semibold text-gray-900 mb-2'>Registration Submitted</h3>
              <p className='text-gray-600 mb-6'>Your account is pending approval. You will be notified once approved.</p>
              <button
                onClick={() => window.location.href = '/auth?tab=login'}
                className='px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors'
              >
                Back to Login
              </button>
            </motion.div>
          );
        }
        return <RegisterForm onSuccess={() => setView('registrationSuccess')} />;
      case 'forgot-password':
        return <ForgotPasswordForm onOtp={handleResetOTP} />;
      default:
        return <LoginForm onLoggedIn={handleLoggedIn} />;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        loading,
        setLoading,
        error,
        setError,
        success,
        setSuccess,
      }}>
      <div className='min-h-screen max-lg:flex-col container !px-0 flex'>
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

        {/* Right panel: form */}
        <div className='w-full max-w-[500px] max-lg:max-w-full flex items-center justify-center lg:px-10 p-6'>
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className='w-full max-lg:mt-[-60px] max-lg:z-[10] max-lg:max-w-[500px] max-lg:bg-slate-50 max-lg:border max-lg:border-slate-200 max-lg:rounded-2xl max-lg:p-8 max-lg:py-10 max-sm:py-8'>
            <TitleByTab activeTab={activeTab} />
            <AuthTabs activeTab={activeTab} setActiveTab={setActiveTab} />

            <AnimatePresence mode='wait'>
              <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </AuthContext.Provider>
  );
}