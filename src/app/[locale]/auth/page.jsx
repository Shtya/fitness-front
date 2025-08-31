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
import { SocialButton } from '@/components/pages/auth/SocialButton';
import { SubmitButton } from '@/components/pages/auth/SubmitButton';
import { Input } from '@/components/pages/auth/Input';
import { SelectInput } from '@/components/pages/auth/SelectInput';

// Configure axios base URL
const API_BASE_URL = 'http://localhost:8081/api/v1/';
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
        // window.location.href = '/auth?tab=login';
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
  username: z
    .string()
    .min(3, 'usernameMin')
    .max(30, 'usernameMax')
    .regex(/^[a-zA-Z0-9_ ]+$/, 'usernameInvalid')
    .transform(val => val.trim())
    .refine(val => val.length >= 3, 'usernameMin')
    .refine(val => !val.includes('  '), 'usernameSpaces'),
  email: z.string().email('invalidEmail'),
  password: z.string().min(8, 'passwordMin'),
  role: z.enum(['buyer', 'seller']).default('buyer'),
  type: z.enum(['Business', 'Individual']).default('Individual'), // Changed from userType to type
  ref: z.string().optional().nullable(),
});

const forgetPasswordSchema = z.object({
  email: z.string().email('invalidEmail'),
});

const passwordResetFormSchema = z
  .object({
    newPassword: z.string().min(8, 'passwordMin'),
    confirmNewPassword: z.string(),
    otp: z.string().min(6, 'otpRequired'),
  })
  .refine(data => data.newPassword === data.confirmNewPassword, {
    message: 'passwordsMatch',
    path: ['confirmNewPassword'],
  });

const phoneLoginSchema = z.object({
  phone: z.string().min(10, 'phoneMin'),
});

// UI Components
export function TitleByTab({ activeTab, view }) {
  const t = useTranslations('auth');

  const TITLES = {
    login: {
      options: {
        title: t('signIn'),
        subtitle: t('chooseMethod'),
      },
      email: {
        title: t('signIn'),
        subtitle: t('emailMethod'),
      },
      phone: {
        title: t('signIn'),
        subtitle: t('phoneMethod'),
      },
      otp: {
        title: t('signIn'),
        subtitle: t('otpMethod'),
      },
    },
    register: {
      options: {
        title: t('signUp'),
        subtitle: t('chooseMethod'),
      },
      email: {
        title: t('signUp'),
        subtitle: t('createAccount'),
      },
      phone: {
        title: t('signUp'),
        subtitle: t('phoneSignUp'),
      },
      otp: {
        title: t('verifyEmail'),
        subtitle: t('verifyEmail'),
      },
    },
    'forgot-password': {
      email: {
        title: t('forgotPassword'),
        subtitle: t('resetPassword'),
      },
      otp: {
        title: t('verifyIdentity'),
        subtitle: t('verifyIdentity'),
      },
      reset: {
        title: t('setNewPassword'),
        subtitle: t('passwordRequirements'),
      },
    },
  };

  const tabData = TITLES[activeTab] || TITLES.login;
  const content = tabData[view] || tabData.options || { title: '', subtitle: '' };

  return (
    <motion.div key={`${activeTab}-${view}`} className='mb-6 text-center md:text-left' data-aos='fade-down'>
      <h1 className='text-center mt-2 text-xl md:text-2xl font-extrabold tracking-tight text-gray-900 drop-shadow-sm'>{content.title}</h1>
      {content.subtitle && <p className='text-center mt-1 text-base text-gray-600 leading-relaxed'>{content.subtitle}</p>}
    </motion.div>
  );
}

const TABS = [
  { key: 'login', label: 'signIn' },
  { key: 'register', label: 'signUp' },
  { key: 'forgot-password', label: 'forgotPassword' },
];

export function AuthTabs({ setView, activeTab, setActiveTab }) {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hoveredTab, setHoveredTab] = useState(null);

  const pillTarget = hoveredTab || activeTab;

  const handleClick = key => {
    setActiveTab(key);
    router.push(`/auth?tab=${key}`);
    if (key === 'login' || key === 'register') setView('options');
    if (key === 'forgot-password') setView('email');
  };

  return (
    <LayoutGroup id='auth-tabs'>
      <div role='tablist' aria-label='Authentication' className='mb-10 grid grid-cols-3 gap-2 rounded-2xl bg-gray-100/80 pb-[3px] p-1 text-sm font-medium ring-1 ring-black/5 shadow-sm backdrop-blur' data-aos='fade-up'>
        {TABS.map(tab => {
          const isPreviewed = pillTarget === tab.key;
          const isActive = activeTab === tab.key;

          return (
            <motion.button key={tab.key} role='tab' aria-selected={isActive} aria-controls={`panel-${tab.key}`} id={`tab-${tab.key}`} onClick={() => handleClick(tab.key)} onMouseEnter={() => setHoveredTab(tab.key)} onMouseLeave={() => setHoveredTab(null)} whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} className='cursor-pointer relative select-none rounded-xl px-3 py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/60'>
              {isPreviewed && <motion.span layoutId='active-pill' className='absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-lg' transition={{ type: 'spring', stiffness: 350, damping: 30 }} />}

              <span className={`relative z-10 transition-colors ${isPreviewed ? 'text-white drop-shadow-sm' : 'text-gray-700'}`}>{t(tab.label)}</span>
            </motion.button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

export const ContinueWithGoogleButton = ({ referralCode }) => {
  const t = useTranslations('auth');
  const redirectUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleGoogleLogin = async () => {
    let url = `${API_BASE_URL}auth/google`;
    const params = new URLSearchParams();

    if (redirectUrl) params.append('redirect', redirectUrl);
    if (referralCode) params.append('ref', referralCode);

    if (params.toString()) url += `?${params.toString()}`;

    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
        } else {
          console.error('No redirect URL found in response.');
          toast.error(t('errors.googleLoginFailed'));
        }
      } else {
        console.error('Failed to fetch Google OAuth URL.');
        toast.error(t('errors.googleLoginFailed'));
      }
    } catch (error) {
      console.error('Error fetching Google OAuth URL:', error);
      toast.error(t('errors.googleLoginFailed'));
    }
  };

  return <SocialButton icon='/images/google-icon.png' text={t('continueWithGoogle')} onClick={handleGoogleLogin} />;
};

export const ContinueWithAppleButton = ({ referralCode }) => {
  const t = useTranslations('auth');
  const redirectUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleAppleLogin = async () => {
    let url = `${API_BASE_URL}auth/apple`;
    const params = new URLSearchParams();
    if (redirectUrl) params.append('redirect', redirectUrl);
    if (referralCode) params.append('ref', referralCode);
    if (params.toString()) url += `?${params.toString()}`;

    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.redirectUrl;
      } else {
        console.error('Failed to fetch Apple OAuth URL.');
        toast.error(t('errors.appleLoginFailed'));
      }
    } catch (error) {
      console.error('Error fetching Apple OAuth URL:', error);
      toast.error(t('errors.appleLoginFailed'));
    }
  };

  return <SocialButton icon='/images/apple-icon.png' text={t('continueWithApple')} onClick={handleAppleLogin} />;
};

export const ContinueWithEmailButton = ({ onClick }) => {
  const t = useTranslations('auth');
  return <SocialButton icon='/images/email-icon.png' text={t('continueWithEmail')} onClick={onClick} />;
};

export const ContinueWithPhoneButton = ({ onClick }) => {
  const t = useTranslations('auth');
  return <SocialButton icon='/images/phone-icon.png' text={t('continueWithPhone')} onClick={onClick} />;
};

// User Type Selection Component
const UserTypeSelection = ({ onSelect, loading }) => {
  const t = useTranslations('auth');
  const [selectedType, setSelectedType] = useState(null);

  const handleSelect = type => {
    setSelectedType(type);
  };

  const handleSubmit = () => {
    if (selectedType) {
      onSelect(selectedType);
    } else {
      toast.error(t('selectUserType'));
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className='w-full'>
      <h2 className='text-xl font-bold text-center mb-6'>{t('selectUserType')}</h2>
      <p className='text-gray-600 text-center mb-8'>{t('selectUserTypeDescription')}</p>

      <div className='grid grid-cols-2 gap-4 mb-8'>
        <button type='button' onClick={() => handleSelect('Business')} className={`p-6 rounded-lg border-2 transition-all ${selectedType === 'Business' ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-gray-300 hover:border-emerald-300'}`}>
          <div className='flex flex-col items-center'>
            <div className='w-12 h-12 mb-3 bg-emerald-100 rounded-full flex items-center justify-center'>
              <svg className='w-6 h-6 text-emerald-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' />
              </svg>
            </div>
            <h3 className='font-semibold text-gray-900'>{t('business')}</h3>
            <p className='text-sm text-gray-600 mt-1 text-center'>{t('businessDescription')}</p>
          </div>
        </button>

        <button type='button' onClick={() => handleSelect('Individual')} className={`p-6 rounded-lg border-2 transition-all ${selectedType === 'Individual' ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-gray-300 hover:border-emerald-300'}`}>
          <div className='flex flex-col items-center'>
            <div className='w-12 h-12 mb-3 bg-emerald-100 rounded-full flex items-center justify-center'>
              <svg className='w-6 h-6 text-emerald-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' />
              </svg>
            </div>
            <h3 className='font-semibold text-gray-900'>{t('individual')}</h3>
            <p className='text-sm text-gray-600 mt-1 text-center'>{t('individualDescription')}</p>
          </div>
        </button>
      </div>

      <SubmitButton isLoading={loading} onClick={handleSubmit} disabled={!selectedType}>
        {t('continueToExplore')}
      </SubmitButton>
    </motion.div>
  );
};

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
      const msg = err.response?.data?.message || t('errors.loginFailed');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} onSubmit={handleSubmit(onSubmit)} className='w-full'>
      <Input label={t('email')} placeholder={t('enterEmail')} type='email' register={register('email')} error={errors.email?.message && t(errors.email.message)} />
      <Input label={t('password')} placeholder={t('enterPassword')} type='password' register={register('password')} error={errors.password?.message && t(errors.password.message)} />

      <SubmitButton isLoading={loading}>{t('signInButton')}</SubmitButton>
    </motion.form>
  );
};

const RegisterForm = ({ onOtp }) => {
  const t = useTranslations('auth');
  const { setLoading, setError, loading } = useContext(AuthContext);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', email: '', password: '', role: 'buyer', type: 'Individual', ref: '' },
  });

  const onSubmit = async data => {
    setLoading(true);
    setError(null);
    try {
 
      await axiosInstance.post('/auth/register', data);
      sessionStorage.setItem('registerEmail', data.email);
      toast.success(t('success.otpSent'));
      onOtp?.(data.email);
    } catch (err) {
      const msg = err.response?.data?.message || t('errors.registrationFailed');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} onSubmit={handleSubmit(onSubmit)} className='w-full'>
      <Input label={t('username')} placeholder={t('chooseUsername')} type='text' register={register('username')} error={errors.username?.message && t(errors.username.message)} />
      <Input label={t('email')} placeholder={t('enterEmail')} type='email' register={register('email')} error={errors.email?.message && t(errors.email.message)} />
      <Input label={t('password')} placeholder={t('enterPassword')} type='password' register={register('password')} error={errors.password?.message && t(errors.password.message)} />

      <SelectInput
        label={t('role.selectRole')}
        register={register('role')}
        options={[
          { value: 'buyer', label: t('role.buyer') },
          { value: 'seller', label: t('role.seller') },
        ]}
      />
      <SelectInput
        label={t('userType')}
        register={register('type')} // Changed from userType to type
        options={[
          { value: 'Business', label: t('business') },
          { value: 'Individual', label: t('individual') },
        ]}
      />

      <Input label={t('referralCode')} placeholder={t('enterReferral')} type='text' register={register('ref')} error={errors.ref?.message && t(errors.ref.message)} />

      <SubmitButton isLoading={loading}>{t('createAccountButton')}</SubmitButton>
    </motion.form>
  );
};

const PhoneLoginForm = () => {
  const t = useTranslations('auth');
  const { setLoading, setError, loading } = useContext(AuthContext);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(phoneLoginSchema),
    defaultValues: { phone: '' },
  });

  const onSubmit = async data => {
    setLoading(true);
    setError(null);
    try {
      // This would be implemented when phone authentication is available
      await new Promise(r => setTimeout(r, 600));
      toast.success(t('success.codeSent'));
    } catch (err) {
      const msg = t('errors.codeSendFailed');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} onSubmit={handleSubmit(onSubmit)} className='w-full'>
      <Input label={t('phoneNumber')} placeholder={t('enterPhone')} type='tel' register={register('phone')} error={errors.phone?.message && t(errors.phone.message)} />
      <SubmitButton isLoading={loading}>{t('sendCodeButton')}</SubmitButton>
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
    <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} onSubmit={handleSubmit(onSubmit)} className='w-full'>
      <Input label={t('email')} placeholder={t('enterEmail')} type='email' register={register('email')} error={errors.email?.message && t(errors.email.message)} />
      <SubmitButton isLoading={loading}>{t('sendOtpButton')}</SubmitButton>
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
    defaultValues: { newPassword: '', confirmNewPassword: '', otp: otp || '' },
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
    } catch (err) {
      const msg = err.response?.data?.message || t('errors.passwordResetFailed');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} onSubmit={handleSubmit(onSubmit)} className='w-full'>
      <Input label={t('email')} type='text' value={email} disabled cnInput='cursor-not-allowed' />
      <Input label={t('otpCode')} placeholder={t('enterOtp')} type='text' register={register('otp')} error={errors.otp?.message && t(errors.otp.message)} />
      <Input label={t('newPassword')} placeholder={t('enterNewPassword')} type='password' register={register('newPassword')} error={errors.newPassword?.message && t(errors.newPassword.message)} />
      <Input label={t('confirmPassword')} placeholder={t('confirmNewPassword')} type='password' register={register('confirmNewPassword')} error={errors.confirmNewPassword?.message && t(errors.confirmNewPassword.message)} />
      <SubmitButton isLoading={loading}>{t('resetPasswordButton')}</SubmitButton>
    </motion.form>
  );
};

const OTPForm = ({ email, onVerified, purpose = 'verify' }) => {
  const t = useTranslations('auth');
  const { setLoading, setError, loading } = useContext(AuthContext);
  const [otp, setOtp] = useState('');
  const [resending, setResending] = useState(false);
  const [seconds, setSeconds] = useState(30);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const onSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (otp.length !== 6) throw new Error('otpLength');

      if (purpose === 'verify') {
        await axiosInstance.post('/auth/verify-email', { email, code: otp });
        toast.success(t('success.emailVerified'));
        onVerified?.();
      } else if (purpose === 'reset') {
        onVerified?.(otp);
      }
    } catch (err) {
      const msg = err.response?.data?.message || t('errors.otpInvalid');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      setResending(true);
      if (purpose === 'verify') {
        await axiosInstance.post('/auth/resend-verification-email', { email });
      } else {
        await axiosInstance.post('/auth/forgot-password', { email });
      }
      setSeconds(30);
      toast.success(t('success.codeResent'));
    } catch {
      toast.error(t('errors.resendFailed'));
    } finally {
      setResending(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className='w-full'>
      <p className='text-gray-600 mb-6'>{t('otpSentTo')}</p>

      <Input label={t('email')} type='text' value={email} disabled cnInput='cursor-not-allowed' />

      <form onSubmit={onSubmit}>
        <div className='mb-6'>
          <label className='block text-sm font-medium text-gray-700 mb-2'>{t('otpCode')}</label>
          <OtpInput value={otp} onChange={setOtp} numInputs={6} renderSeparator={<span className='mx-1'>-</span>} renderInput={props => <input {...props} className='!w-10 h-10 flex-none border border-gray-300 rounded-lg text-center text-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent' />} containerStyle='flex justify-center' />
        </div>

        <SubmitButton isLoading={loading}>{t('verifyCodeButton')}</SubmitButton>
      </form>

      <p className='text-center text-gray-600 mt-4'>
        {t('didntReceiveCode')}{' '}
        <button type='button' disabled={resending || seconds > 0} className={`text-blue-600 hover:underline disabled:opacity-50 ${seconds > 0 ? 'cursor-not-allowed' : ''}`} onClick={resend}>
          {seconds > 0 ? t('resendIn', { seconds }) : t('resendCode')}
        </button>
      </p>
    </motion.div>
  );
};

const AuthOptions = ({ onEmailClick, onPhoneClick, referralCode, isLogin = true }) => {
  const t = useTranslations('auth');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className='w-full h-full flex flex-col'>
      <div className='flex-1 flex flex-col items-center justify-center gap-4 py-6'>
        <ContinueWithEmailButton onClick={onEmailClick} />
        <ContinueWithGoogleButton referralCode={referralCode} />
        <ContinueWithAppleButton referralCode={referralCode} />
        <ContinueWithPhoneButton onClick={onPhoneClick} />
      </div>

      <p className='text-sm text-gray-500 border-t border-slate-200 mt-6 pt-6'>{t('terms')}</p>
    </motion.div>
  );
};

// Main Auth Page Component
export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab') || 'login';
  const token = searchParams?.get('accessToken');
  const redirectUrl = searchParams?.get('redirect') || '/explore';
  const referralCode = searchParams?.get('ref');

  const [activeTab, setActiveTab] = useState(tabParam);
  const [view, setView] = useState('options');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [emailForOTP, setEmailForOTP] = useState('');
  const [otpForReset, setOtpForReset] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [needsUserTypeSelection, setNeedsUserTypeSelection] = useState(false);
  const [oauthUser, setOauthUser] = useState(null);

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

          // Check if user needs to select a type
          if (!user.type) {
            setOauthUser(user);
            setNeedsUserTypeSelection(true);
          } else {
            toast.success('Logged in successfully!');
            router.push(redirectUrl);
          }
        } catch (error) {
          console.error('Failed to get user info:', error);
          toast.error('Failed to complete login');
        }
      }
    };

    handleOAuthLogin();
  }, [token, router, redirectUrl]);

  // Handle user type selection
  const handleUserTypeSelect = async userType => {
    setLoading(true);
    try {
      // Update user type in backend
      await axiosInstance.put('/auth/profile', { type: userType });

      // Update local user data
      const updatedUser = { ...oauthUser, type: userType };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);

      toast.success('User type updated successfully!');
      router.push(redirectUrl);
    } catch (error) {
      console.error('Failed to update user type:', error);
      toast.error('Failed to update user type');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setActiveTab(tabParam);
    if (tabParam === 'forgot-password') setView('email');
    else if (tabParam === 'login' && view !== 'email') setView('options');

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

        // If user is already logged in, redirect to explore page
        if (userData && window.location.pathname === '/auth') {
          router.push('/explore');
        }
      }
    } catch {}
  }, []);

  const handleEmailClick = () => setView('email');
  const handlePhoneClick = () => setView('phone');

  const handleOTPRequest = email => {
    setEmailForOTP(email);
    setView('otp');
  };

  const handleResetOTP = otp => {
    setOtpForReset(otp);
    setView('reset');
  };

  const onOtpVerifiedGoToLogin = async () => {
    router.push('/auth?tab=login');
    setView('email');
  };

  const handleLoggedIn = user => {
    setCurrentUser(user);
    router.push('/explore');
  };

  const renderContent = () => {
    // Show user type selection if needed
    if (needsUserTypeSelection) {
      return <UserTypeSelection onSelect={handleUserTypeSelect} loading={loading} />;
    }

    if (activeTab === 'forgot-password' && view === 'reset') {
      return <ResetPasswordForm email={emailForOTP} otp={otpForReset} />;
    }

    switch (view) {
      case 'email':
        if (activeTab === 'login') return <LoginForm onLoggedIn={handleLoggedIn} />;
        if (activeTab === 'register') return <RegisterForm onOtp={handleOTPRequest} />;
        return <ForgotPasswordForm onOtp={handleOTPRequest} />;

      case 'phone':
        return <PhoneLoginForm />;

      case 'otp':
        if (activeTab === 'forgot-password') {
          return <OTPForm email={emailForOTP} onVerified={handleResetOTP} purpose='reset' />;
        }
        return <OTPForm email={emailForOTP} onVerified={onOtpVerifiedGoToLogin} purpose='verify' />;

      default:
        return <AuthOptions onEmailClick={handleEmailClick} onPhoneClick={handlePhoneClick} referralCode={referralCode} isLogin={activeTab === 'login'} />;
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
              Start your success now!
            </motion.h1>
            <motion.p className='max-md:text-lg text-2xl font-normal mb-6 drop-shadow' initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
              Talented freelancers for any project. Best freelancers for every project. High-quality services for every budget. Trusted by 4+ million clients worldwide.
            </motion.p>
            <div className='space-y-4 max-md:space-y-2 text-lg'>
              {['Fast, delightful onboarding', 'Secure, privacy-friendly sessions', 'Beautiful, accessible UI', 'Reliable authentication flow'].map((text, i) => (
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
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className='w-full max-lg:mt-[-60px] max-lg:z-[10] max-lg:max-w-[500px] max-lg:bg-slate-50 max-lg:border max-lg:border-slate-200 max-lg:rounded-2xl max-lg:p-8 max-lg:py-20 max-sm:py-8'>
            <TitleByTab view={view} activeTab={activeTab} />
            <AuthTabs setView={setView} activeTab={activeTab} setActiveTab={setActiveTab} />

            <AnimatePresence mode='wait'>
              <motion.div key={`${activeTab}-${view}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className='flex flex-col items-center justify-center'>
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </AuthContext.Provider>
  );
}