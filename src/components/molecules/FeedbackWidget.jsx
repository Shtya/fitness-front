'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MessageSquarePlus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import api from '@/utils/axios';

function FeedbackWidget({ collapsed }) {
	const t = useTranslations('feedback');

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
			{/* Trigger (row-friendly) */}
			<motion.button
				type="button"
				whileHover={{ scale: 1.04 }}
				whileTap={{ scale: 0.96 }}
				onClick={() => setOpen(true)}
				aria-label={t('floatingButtonAria')}
				className={
					collapsed
						? `
              flex items-center justify-center
              w-12 h-12 rounded-2xl
              bg-gradient-to-br from-indigo-600 to-violet-600
              text-white
              shadow-xl shadow-indigo-500/40
              hover:shadow-2xl hover:from-indigo-700 hover:to-violet-700
              transition-all duration-300
            `
						: `
              flex items-center gap-3
              h-12 px-5 rounded-2xl font-bold
              bg-gradient-to-br from-indigo-600 to-violet-600
              text-white
              shadow-xl shadow-indigo-500/40
              hover:shadow-2xl hover:from-indigo-700 hover:to-violet-700
              transition-all duration-300
            `
				}
			>
				<motion.div whileHover={{ rotate: 10 }} className="flex items-center justify-center w-5 h-5">
					<MessageSquarePlus className="w-5 h-5" strokeWidth={2.2} />
				</motion.div>

				{!collapsed && <span className="text-xs font-bold tracking-wide">{t('panelTitle')}</span>}
			</motion.button>

			{/* Overlay + Panel */}
			<AnimatePresence>
				{open && (
					<motion.div
						className="fixed inset-0 z-40 flex items-center justify-center"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					>
						{/* overlay */}
						<div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />

						{/* panel */}
						<motion.div
							initial={{ y: 18, opacity: 0, scale: 0.98 }}
							animate={{ y: 0, opacity: 1, scale: 1 }}
							exit={{ y: 18, opacity: 0, scale: 0.98 }}
							transition={{ duration: 0.18, ease: 'easeOut' }}
							className="
                relative z-50 w-full max-w-md mx-4
                rounded-2xl border bg-background
                shadow-2xl p-4 sm:p-6
              "
							onClick={(e) => e.stopPropagation()}
							role="dialog"
							aria-modal="true"
						>
							<div className="flex items-start justify-between gap-3 mb-4">
								<div>
									<h2 className="text-lg font-semibold">{t('panelTitle')}</h2>
									<p className="text-xs text-muted-foreground mt-1">{t('panelDescription')}</p>
								</div>

								<Button
									variant="ghost"
									size="icon"
									className="h-9 w-9 rounded-full"
									onClick={() => setOpen(false)}
									aria-label={t('close')}
								>
									<X className="h-4 w-4" />
								</Button>
							</div>

							<form onSubmit={handleSubmit} className="space-y-4">
								<div className="grid gap-2">
									<Label htmlFor="type">{t('typeLabel')}</Label>
									<Select value={type} onValueChange={setType}>
										<SelectTrigger id="type">
											<SelectValue placeholder={t('typePlaceholder')} />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="enhancement">{t('typeEnhancement')}</SelectItem>
											<SelectItem value="issue">{t('typeIssue')}</SelectItem>
											<SelectItem value="other">{t('typeOther')}</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div className="grid gap-2">
									<Label htmlFor="title">
										{t('titleLabel')} <span className="text-red-500">*</span>
									</Label>
									<Input
										id="title"
										placeholder={t('titlePlaceholder')}
										value={title}
										onChange={(e) => setTitle(e.target.value)}
									/>
								</div>

								<div className="grid gap-2">
									<Label htmlFor="description">
										{t('detailsLabel')} <span className="text-red-500">*</span>
									</Label>
									<Textarea
										id="description"
										rows={5}
										placeholder={t('detailsPlaceholder')}
										value={description}
										onChange={(e) => setDescription(e.target.value)}
									/>
								</div>

								<div className="grid gap-2">
									<Label htmlFor="email">
										{t('emailLabel')}{' '}
										<span className="text-xs text-muted-foreground">({t('emailOptional')})</span>
									</Label>
									<Input
										id="email"
										type="email"
										placeholder={t('emailPlaceholder')}
										value={email}
										onChange={(e) => setEmail(e.target.value)}
									/>
								</div>

								{error && <p className="text-sm text-red-500">{error}</p>}
								{message && <p className="text-sm text-emerald-600">{message}</p>}

								<div className="flex justify-end pt-1">
									<Button
										type="submit"
										disabled={isSubmitting}
										className="w-full sm:w-auto bg-[#7a83ff] hover:bg-[#4f46e5] text-white"
									>
										{isSubmitting ? t('submitting') : t('submit')}
									</Button>
								</div>
							</form>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}

export default FeedbackWidget;
