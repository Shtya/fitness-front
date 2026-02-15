'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MessageSquarePlus, X, Send, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import api from '@/utils/axios';
import { useTheme } from '@/app/[locale]/theme';
const spring = { type: 'spring', stiffness: 500, damping: 32, mass: 0.6 };

function FeedbackWidget({ collapsed }) {
	const t = useTranslations('feedback');
	const { colors } = useTheme();

	const [open, setOpen] = useState(false);
	const [type, setType] = useState('enhancement');
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [email, setEmail] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [message, setMessage] = useState(null);
	const [error, setError] = useState(null);

	async function handleSubmit(e) {
		e.preventDefault();
		setError(null);
		setMessage(null);

		if (!title.trim() || !description.trim()) {
			setError(t('errorRequired'));
			return;
		}

		setIsSubmitting(true);

		try {
			const res = await api.post('/feedback', {
				type,
				title: title.trim(),
				description: description.trim(),
				email: email.trim() || null,
			});

			if (res.data.success) {
				setMessage(t('success'));
				setTitle('');
				setDescription('');
				setEmail('');
				setType('enhancement');

				setTimeout(() => {
					setOpen(false);
					setMessage(null);
				}, 1200);
			}
		} catch (err) {
			const errorMessage = err.response?.data?.message || err.message || t('genericError');
			setError(errorMessage);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<>
			{/* Trigger Button */}
			<motion.button
				type="button"
				whileHover={{ scale: 1.04 }}
				whileTap={{ scale: 0.96 }}
				onClick={() => setOpen(true)}
				aria-label={t('floatingButtonAria')}
				className={
					collapsed
						? 'flex items-center justify-center w-12 h-12 rounded-lg text-white shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden'
						: 'flex items-center gap-3 h-12 px-5 rounded-lg font-bold text-white shadow-xl hover:shadow-2xl transition-all duration-300 w-full justify-center relative overflow-hidden'
				}
				style={{
					background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
					boxShadow: `0 10px 30px -10px var(--color-primary-500)`
				}}
			>
				{/* Animated shimmer */}
				<motion.div
					className="absolute inset-0 opacity-30"
					animate={{
						background: [
							'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
							'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
						],
						backgroundPosition: ['-200% 0', '200% 0'],
					}}
					transition={{
						duration: 3,
						repeat: Infinity,
						ease: 'linear',
					}}
				/>

				<motion.div 
					whileHover={{ rotate: 10 }} 
					className="flex items-center justify-center w-5 h-5 relative z-10"
				>
					<MessageSquarePlus className="w-5 h-5" strokeWidth={2.5} />
				</motion.div>

				{!collapsed && (
					<span className="text-sm font-bold tracking-wide relative z-10">
						{t('panelTitle')}
					</span>
				)}

				{/* Glow effect */}
				<div
					className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl"
					style={{
						background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
					}}
				/>
			</motion.button>

			{/* Modal */}
			<AnimatePresence>
				{open && (
					<>
						{/* Backdrop */}
						<motion.div
							className="fixed w-screen inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setOpen(false)}
						/>

						{/* Panel */}
						<motion.div
							initial={{ y: 20, opacity: 0, scale: 0.96 }}
							animate={{ y: 0, opacity: 1, scale: 1 }}
							exit={{ y: 20, opacity: 0, scale: 0.96 }}
							transition={spring}
							className="fixed w-screen inset-0 z-[9999] flex items-center justify-center p-4"
							onClick={(e) => e.stopPropagation()}
						>
							<div 
								className="relative w-full max-w-md rounded-lg border-2 bg-white shadow-2xl overflow-hidden"
								style={{
									borderColor: 'var(--color-primary-200)',
									boxShadow: '0 25px 50px -12px var(--color-primary-500)'
								}}
								onClick={(e) => e.stopPropagation()}
								role="dialog"
								aria-modal="true"
							>
								{/* Decorative gradient */}
								<div 
									className="absolute top-0 left-0 right-0 h-32 opacity-30 pointer-events-none"
									style={{
										background: `linear-gradient(180deg, var(--color-primary-50), transparent)`
									}}
								/>

								{/* Header */}
								<div className="relative px-6 pt-6 pb-4">
									<div className="flex items-start justify-between gap-3">
										<div className="flex items-start gap-3">
											<div
												className=" flex-none w-12 h-12 rounded-lg grid place-content-center text-white shadow-lg"
												style={{
													background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
													boxShadow: `0 4px 12px -2px var(--color-primary-500)`
												}}
											>
												<MessageSquarePlus className="w-6 h-6" strokeWidth={2.5} />
											</div>
											<div>
												<h2 className="text-xl font-black text-slate-900">
													{t('panelTitle')}
												</h2>
												<p className="text-sm text-slate-600 mt-1">
													{t('panelDescription')}
												</p>
											</div>
										</div>

										<motion.button
											whileHover={{ scale: 1.1, rotate: 90 }}
											whileTap={{ scale: 0.9 }}
											onClick={() => setOpen(false)}
											className="h-10 w-10 flex-none rounded-lg border-2 border-slate-200 hover:bg-slate-50 grid place-content-center transition-all"
											aria-label={t('close')}
										>
											<X className="h-5 w-5 text-slate-600" strokeWidth={2.5} />
										</motion.button>
									</div>
								</div>

								{/* Form */}
								<form onSubmit={handleSubmit} className="relative px-6 pb-6 space-y-5">
									{/* Type Select */}
									<div className="space-y-2">
										<Label htmlFor="type" className="text-sm font-semibold text-slate-700">
											{t('typeLabel')}
										</Label>
										<Select value={type} onValueChange={setType}>
											<SelectTrigger 
												id="type" 
												className="h-11 rounded-lg border-2 transition-all focus:ring-2"
												style={{
													borderColor: 'var(--color-primary-200)',
													'--tw-ring-color': 'var(--color-primary-300)'
												}}
											>
												<SelectValue placeholder={t('typePlaceholder')} />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="enhancement">
													<span className="flex items-center gap-2">
														<Sparkles className="w-4 h-4" />
														{t('typeEnhancement')}
													</span>
												</SelectItem>
												<SelectItem value="issue">
													<span className="flex items-center gap-2">
														<X className="w-4 h-4" />
														{t('typeIssue')}
													</span>
												</SelectItem>
												<SelectItem value="other">
													<span className="flex items-center gap-2">
														<MessageSquarePlus className="w-4 h-4" />
														{t('typeOther')}
													</span>
												</SelectItem>
											</SelectContent>
										</Select>
									</div>

									{/* Title */}
									<div className="space-y-2">
										<Label htmlFor="title" className="text-sm font-semibold text-slate-700">
											{t('titleLabel')} <span className="text-red-500">*</span>
										</Label>
										<Input
											id="title"
											placeholder={t('titlePlaceholder')}
											value={title}
											onChange={(e) => setTitle(e.target.value)}
											className="h-11 rounded-lg border-2 transition-all focus:ring-2"
											style={{
												borderColor: 'var(--color-primary-200)',
												'--tw-ring-color': 'var(--color-primary-300)'
											}}
										/>
									</div>

									{/* Description */}
									<div className="space-y-2">
										<Label htmlFor="description" className="text-sm font-semibold text-slate-700">
											{t('detailsLabel')} <span className="text-red-500">*</span>
										</Label>
										<Textarea
											id="description"
											rows={5}
											placeholder={t('detailsPlaceholder')}
											value={description}
											onChange={(e) => setDescription(e.target.value)}
											className="rounded-lg border-2 transition-all focus:ring-2 resize-none"
											style={{
												borderColor: 'var(--color-primary-200)',
												'--tw-ring-color': 'var(--color-primary-300)'
											}}
										/>
									</div>

									{/* Email */}
									<div className="space-y-2">
										<Label htmlFor="email" className="text-sm font-semibold text-slate-700">
											{t('emailLabel')}{' '}
											<span className="text-sm text-slate-500 font-normal">
												({t('emailOptional')})
											</span>
										</Label>
										<Input
											id="email"
											type="email"
											placeholder={t('emailPlaceholder')}
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											className="h-11 rounded-lg border-2 transition-all focus:ring-2"
											style={{
												borderColor: 'var(--color-primary-200)',
												'--tw-ring-color': 'var(--color-primary-300)'
											}}
										/>
									</div>

									{/* Messages */}
									<AnimatePresence>
										{error && (
											<motion.div
												initial={{ opacity: 0, y: -10 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0, y: -10 }}
												className="p-3 rounded-lg bg-red-50 border-2 border-red-200"
											>
												<p className="text-sm font-semibold text-red-700">{error}</p>
											</motion.div>
										)}
										{message && (
											<motion.div
												initial={{ opacity: 0, y: -10 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0, y: -10 }}
												className="p-3 rounded-lg border-2"
												style={{
													backgroundColor: 'var(--color-primary-50)',
													borderColor: 'var(--color-primary-200)'
												}}
											>
												<p 
													className="text-sm font-semibold"
													style={{ color: 'var(--color-primary-700)' }}
												>
													{message}
												</p>
											</motion.div>
										)}
									</AnimatePresence>

									{/* Submit Button */}
									<motion.button
										type="submit"
										disabled={isSubmitting}
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										className="w-full h-12 rounded-lg font-bold text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
										style={{
											background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
											boxShadow: `0 4px 12px -2px var(--color-primary-500)`
										}}
									>
										{isSubmitting ? (
											<>
												<motion.div
													animate={{ rotate: 360 }}
													transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
												>
													<Sparkles className="w-5 h-5" />
												</motion.div>
												{t('submitting')}
											</>
										) : (
											<>
												<Send className="w-5 h-5" />
												{t('submit')}
											</>
										)}
									</motion.button>
								</form>
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</>
	);
}

export default FeedbackWidget;