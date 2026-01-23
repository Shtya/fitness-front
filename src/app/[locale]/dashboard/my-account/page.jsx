'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { motion, AnimatePresence } from 'framer-motion';
import {
	User, Mail, Phone, Lock, Save, Eye, EyeOff, Activity, Utensils,
	AlertCircle, CheckCircle2, Dumbbell, Calendar, Crown, Shield,
	Award, Info
} from 'lucide-react';

import api from '@/utils/axios';
import { Notification } from '@/config/Notification';
import Input from '@/components/atoms/Input';
import Button from '@/components/atoms/Button';
import PhoneField from '@/components/atoms/PhoneField';
import { ToggleGroup } from '@/app/[locale]/dashboard/users/page';

const spring = { type: 'spring', stiffness: 400, damping: 30 };

// Validation schemas
const profileSchema = yup.object({
	name: yup.string().trim().min(2, 'errors.nameMin').required('errors.nameRequired'),
	phone: yup.string().matches(/^\+?[\d\s\-\(\)]{10,}$/, 'errors.phoneInvalid').optional().nullable(),
	gender: yup.mixed().oneOf(['male', 'female', null]).nullable().optional(),
});

const passwordSchema = yup.object({
	currentPassword: yup.string().required('errors.currentPasswordRequired'),
	newPassword: yup.string().min(8, 'errors.passwordMin').required('errors.newPasswordRequired'),
	confirmPassword: yup.string()
		.oneOf([yup.ref('newPassword')], 'errors.passwordsMustMatch')
		.required('errors.confirmPasswordRequired'),
});

function Card({ children, className = '' }) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={spring}
			className={`rounded-lg border border-slate-200 bg-white/90 backdrop-blur p-6 shadow-sm ${className}`}
		>
			{children}
		</motion.div>
	);
}

function SectionTitle({ icon: Icon, title, subtitle }) {
	return (
		<div className="mb-6">
			<div className="flex items-center gap-2 mb-1">
				{Icon && <Icon className="w-5 h-5 text-indigo-600" />}
				<h2 className="text-xl font-semibold text-slate-900">{title}</h2>
			</div>
			{subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
		</div>
	);
}

function InfoBadge({ icon: Icon, label, value, color = 'slate' }) {
	const colorMap = {
		indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-600/10',
		green: 'bg-green-50 text-green-700 ring-green-600/10',
		amber: 'bg-amber-50 text-amber-700 ring-amber-600/10',
		slate: 'bg-slate-50 text-slate-700 ring-slate-600/10',
	};

	return (
		<div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ring-1 ${colorMap[color]}`}>
			{Icon && <Icon className="w-4 h-4" />}
			<span className="text-xs opacity-80">{label}:</span>
			<span className="font-semibold">{value}</span>
		</div>
	);
}

export default function ProfilePage() {
	const t = useTranslations('profile');
	const [loading, setLoading] = useState(true);
	const [user, setUser] = useState(null);
	const [saving, setSaving] = useState(false);
	const [changingPassword, setChangingPassword] = useState(false);
	const [showCurrentPassword, setShowCurrentPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	// Profile form
	const {
		control: profileControl,
		handleSubmit: handleProfileSubmit,
		formState: { errors: profileErrors },
		reset: resetProfile,
		setValue: setProfileValue,
		setError: setProfileError,
		clearErrors: clearProfileErrors,
	} = useForm({
		resolver: yupResolver(profileSchema),
		mode: 'onBlur',
	});

	// Password form
	const {
		control: passwordControl,
		handleSubmit: handlePasswordSubmit,
		formState: { errors: passwordErrors },
		reset: resetPassword,
	} = useForm({
		resolver: yupResolver(passwordSchema),
		mode: 'onBlur',
	});

	useEffect(() => {
		fetchProfile();
	}, []);

	const fetchProfile = async () => {
		setLoading(true);
		try {
			const { data: meData } = await api.get('/auth/me');
			const userId = meData.id;

			const { data } = await api.get(`/auth/profile/${userId}`);
			setUser(data);

			resetProfile({
				name: data.name || '',
				phone: data.phone || '',
				gender: data.gender || null 
			});
		} catch (e) {
			Notification(e?.response?.data?.message || t('alerts.loadFailed'), 'error');
		} finally {
			setLoading(false);
		}
	};

	const onProfileSubmit = async (data) => {
		setSaving(true);
		try {
			await api.put(`/auth/profile/${user.id}`, {
				name: data.name,
				phone: data.phone || null,
				gender: data.gender || null 
			});

			Notification(t('alerts.profileUpdated'), 'success');
			fetchProfile();
		} catch (e) {
			Notification(e?.response?.data?.message || t('alerts.updateFailed'), 'error');
		} finally {
			setSaving(false);
		}
	};

	const onPasswordSubmit = async (data) => {
		setChangingPassword(true);
		try {
			await api.put(`/auth/profile/${user.id}/password`, {
				currentPassword: data.currentPassword,
				newPassword: data.newPassword,
			});

			Notification(t('alerts.passwordChanged'), 'success');
			resetPassword();
		} catch (e) {
			Notification(e?.response?.data?.message || t('alerts.passwordChangeFailed'), 'error');
		} finally {
			setChangingPassword(false);
		}
	};


	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="inline-flex items-center gap-3 text-slate-500">
					<span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
					<span>{t('common.loading')}</span>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6  ">
			{/* Header */}
			<motion.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={spring}
				className="relative overflow-hidden rounded-lg border border-indigo-100/60 bg-white/60 shadow-sm backdrop-blur"
			>
				<div className="absolute inset-0 overflow-hidden">
					<div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 opacity-95" />
					<div
						className="absolute inset-0 opacity-15"
						style={{
							backgroundImage: 'linear-gradient(rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.22) 1px, transparent 1px)',
							backgroundSize: '22px 22px',
						}}
					/>
				</div>

				<div className="relative p-6 text-white">
					<div className="flex items-center gap-4 mb-4">
						<div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur grid place-items-center">
							<User className="w-8 h-8" />
						</div>
						<div>
							<h1 className="text-3xl font-bold">{user?.name}</h1>
							<p className="text-white/90 mt-1">{user?.email}</p>
						</div>
					</div>

					<div className="flex flex-wrap gap-2">
						<InfoBadge icon={Shield} label={t('header.role')} value={t(`roles.${user?.role}`)} color="indigo" />
						<InfoBadge icon={Crown} label={t('header.membership')} value={user?.membership || '-'} color="amber" />

					</div>
				</div>
			</motion.div>

			{/* Profile Information */}
			<Card>
				<SectionTitle
					icon={User}
					title={t('sections.personalInfo.title')}
				/>

				<form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Controller
							name="name"
							control={profileControl}
							render={({ field }) => (
								<Input
									label={t('fields.name')}
									placeholder={t('placeholders.name')}
									error={profileErrors.name?.message ? t(profileErrors.name.message) : ''}
									icon={<User className="w-4 h-4" />}
									{...field}
								/>
							)}
						/>

						<div className="relative">
							<label className="mb-1.5 block text-sm font-medium text-slate-700">{t('fields.email')}</label>
							<div className="relative">
								<Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
								<input
									type="email"
									value={user?.email}
									disabled
									className="h-[43px] w-full rounded-lg px-10 py-2.5 text-sm text-slate-500 bg-slate-50 border border-slate-200 cursor-not-allowed"
								/>
							</div>
							<p className="mt-1 text-xs text-slate-500">{t('fields.emailReadonly')}</p>
						</div>

						<Controller
							name="phone"
							control={profileControl}
							render={({ field }) => (
								<PhoneField
									label={t('fields.phone')}
									value={field.value || ''}
									onChange={field.onChange}
									error={profileErrors.phone?.message ? t(profileErrors.phone.message) : ''}
									name={field.name}
									setError={setProfileError}
									clearErrors={clearProfileErrors}
									t={t}
								/>
							)}
						/>

						<Controller
							name="gender"
							control={profileControl}
							render={({ field }) => (
								<ToggleGroup
									label={t('fields.gender')}
									value={field.value}
									onChange={field.onChange}
									options={[
										{ id: 'male', label: t('gender.male') },
										{ id: 'female', label: t('gender.female') },
									]}
									error={profileErrors.gender?.message ? t(profileErrors.gender.message) : ''}
								/>
							)}
						/>
					</div>

					<div className="flex justify-end pt-4">
						<Button
							type="submit"
							color="primary"
							name={t('buttons.saveChanges')}
							icon={<Save className="w-4 h-4" />}
							loading={saving}
							disabled={saving}
						/>
					</div>
				</form>
			</Card>

			<Card>
				<SectionTitle
					icon={Lock}
					title={t('sections.security.title')}
					subtitle={t('sections.security.subtitle')}
				/>

				<form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
					<Controller
						name="currentPassword"
						control={passwordControl}
						render={({ field }) => (
							<div className="relative">
								<Input
									label={t('fields.currentPassword')}
									type={showCurrentPassword ? 'text' : 'password'}
									placeholder="••••••••"
									error={passwordErrors.currentPassword?.message ? t(passwordErrors.currentPassword.message) : ''}
									icon={<Lock className="w-4 h-4" />}
									{...field}
								/>
								<button
									type="button"
									onClick={() => setShowCurrentPassword(!showCurrentPassword)}
									className="absolute rtl:left-3 ltr:right-3 top-9 text-slate-400 hover:text-slate-600"
								>
									{showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
								</button>
							</div>
						)}
					/>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Controller
							name="newPassword"
							control={passwordControl}
							render={({ field }) => (
								<div className="relative">
									<Input
										label={t('fields.newPassword')}
										type={showNewPassword ? 'text' : 'password'}
										placeholder="••••••••"
										error={passwordErrors.newPassword?.message ? t(passwordErrors.newPassword.message) : ''}
										icon={<Lock className="w-4 h-4" />}
										{...field}
									/>
									<button
										type="button"
										onClick={() => setShowNewPassword(!showNewPassword)}
										className="absolute rtl:left-3 ltr:right-3 top-9 text-slate-400 hover:text-slate-600"
									>
										{showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
									</button>
								</div>
							)}
						/>

						<Controller
							name="confirmPassword"
							control={passwordControl}
							render={({ field }) => (
								<div className="relative">
									<Input
										label={t('fields.confirmPassword')}
										type={showConfirmPassword ? 'text' : 'password'}
										placeholder="••••••••"
										error={passwordErrors.confirmPassword?.message ? t(passwordErrors.confirmPassword.message) : ''}
										icon={<Lock className="w-4 h-4" />}
										{...field}
									/>
									<button
										type="button"
										onClick={() => setShowConfirmPassword(!showConfirmPassword)}
										className="absolute rtl:left-3 ltr:right-3 top-9 text-slate-400 hover:text-slate-600"
									>
										{showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
									</button>
								</div>
							)}
						/>
					</div>

					<div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
						<Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
						<p className="text-xs text-amber-800">{t('sections.security.hint')}</p>
					</div>

					<div className="flex justify-end pt-4">
						<Button
							type="submit"
							color="primary"
							name={t('buttons.changePassword')}
							icon={<Lock className="w-4 h-4" />}
							loading={changingPassword}
							disabled={changingPassword}
						/>
					</div>
				</form>
			</Card>

			{/* Subscription Info (Read-only) */}
			{user?.subscriptionStart && user?.subscriptionEnd && (
				<Card>
					<SectionTitle
						icon={Calendar}
						title={t('sections.subscription.title')}
						subtitle={t('sections.subscription.subtitle')}
					/>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
							<div className="text-xs text-slate-600 mb-1">{t('subscription.start')}</div>
							<div className="text-lg font-semibold text-slate-900">
								{new Date(user.subscriptionStart).toLocaleDateString()}
							</div>
						</div>

						<div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
							<div className="text-xs text-slate-600 mb-1">{t('subscription.end')}</div>
							<div className="text-lg font-semibold text-slate-900">
								{new Date(user.subscriptionEnd).toLocaleDateString()}
							</div>
						</div>
					</div>
				</Card>
			)}
		</div>
	);
}