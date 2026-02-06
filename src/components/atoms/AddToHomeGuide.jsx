'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Check, Smartphone, Chrome, Globe } from 'lucide-react';
import Select from './Select';
import CheckBox from './CheckBox';
import MultiLangText from './MultiLangText';

const spring = { type: 'spring', stiffness: 400, damping: 30 };

export default function AddToHomeGuide({
	storageKey = 'a2hs_guide_dismissed_v1',
	autoShowDelayMs = 1200,
}) {
	const t = useTranslations('AddToHomeGuide');
	const [visible, setVisible] = useState(false);
	const [dontShowAgain, setDontShowAgain] = useState(false);
	const [browserKey, setBrowserKey] = useState('auto');
	const [deferredPrompt, setDeferredPrompt] = useState(null);
	const [installing, setInstalling] = useState(false);
	const [installed, setInstalled] = useState(false);

	const [browserInfo, setBrowserInfo] = useState({
		isAndroid: false,
		isIOS: false,
		isSamsung: false,
		isEdge: false,
		isChrome: false,
		isFirefox: false,
		isSafari: false,
		isIOSAltBrowser: false,
	});

	const isStandalone = () =>
		typeof window !== 'undefined' &&
		(window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator?.standalone === true);

	// Detect browser info only on the client
	useEffect(() => {
		if (typeof navigator === 'undefined' || typeof window === 'undefined') return;

		const ua = navigator.userAgent.toLowerCase();
		const isAndroid = /android/.test(ua);
		const isIOS = /iphone|ipad|ipod/.test(ua) || (/macintosh/.test(ua) && 'ontouchend' in window);
		const isSamsung = /samsungbrowser/.test(ua);
		const isEdge = /edg\//.test(ua);
		const isChrome = /chrome\//.test(ua) && !isEdge && !isSamsung;
		const isFirefox = /firefox\//.test(ua);
		const isSafari = !/chrome|crios|fxios|edg/i.test(ua) && (/safari/i.test(ua) || /iphone|ipad|ipod/i.test(ua));
		const isIOSAltBrowser = isIOS && !isSafari;

		setBrowserInfo({
			isAndroid,
			isIOS,
			isSamsung,
			isEdge,
			isChrome,
			isFirefox,
			isSafari,
			isIOSAltBrowser,
		});
	}, []);

	const autoKey = useMemo(() => {
		const { isAndroid, isSamsung, isChrome, isEdge, isFirefox, isIOS, isSafari, isIOSAltBrowser } = browserInfo;

		if (isAndroid && isSamsung) return 'samsung';
		if (isAndroid && isChrome) return 'chrome';
		if (isAndroid && isEdge) return 'edge';
		if (isAndroid && isFirefox) return 'firefox';
		if (isIOS && isSafari) return 'safari';
		if (isIOSAltBrowser) return 'ios_other';
		return 'generic';
	}, [browserInfo]);

	const effectiveKey = browserKey === 'auto' ? autoKey : browserKey;

	// Handle visibility timing
	useEffect(() => {
		if (typeof window === 'undefined') return;
		if (isStandalone()) return;

		const saved = localStorage.getItem(storageKey);
		if (saved === '1') return;

		const timer = setTimeout(() => setVisible(true), autoShowDelayMs);
		return () => clearTimeout(timer);
	}, [storageKey, autoShowDelayMs]);

	// Handle PWA install events
	useEffect(() => {
		if (typeof window === 'undefined') return;
		const onBIP = (e) => {
			e.preventDefault();
			setDeferredPrompt(e);
		};
		const onInstalled = () => {
			setInstalled(true);
			setVisible(false);
			localStorage.setItem(storageKey, '1');
		};
		window.addEventListener('beforeinstallprompt', onBIP);
		window.addEventListener('appinstalled', onInstalled);
		return () => {
			window.removeEventListener('beforeinstallprompt', onBIP);
			window.removeEventListener('appinstalled', onInstalled);
		};
	}, [storageKey]);

	const triggerInstall = async () => {
		if (!deferredPrompt) return;
		try {
			setInstalling(true);
			deferredPrompt.prompt();
			await deferredPrompt.userChoice;
			setDeferredPrompt(null);
		} finally {
			setInstalling(false);
		}
	};

	const closeGuide = () => {
		setVisible(false);
		if (dontShowAgain) localStorage.setItem(storageKey, '1');
	};

	if (!visible || installed) return null;

	const steps = t.raw(`steps.${effectiveKey}`);

	return (
		<AnimatePresence>
			<div dir="rtl" className="fixed inset-0 z-[60] flex items-center justify-center p-4">
				{/* Backdrop */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="absolute inset-0 bg-black/50 backdrop-blur-md"
					onClick={closeGuide}
				/>

				{/* Modal */}
				<motion.div
					initial={{ opacity: 0, scale: 0.95, y: 20 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.95, y: 20 }}
					transition={spring}
					className="relative w-full max-w-lg rounded-3xl border-2 shadow-2xl overflow-hidden"
					style={{
						borderColor: 'var(--color-primary-200)',
						boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.3)',
					}}>
					{/* Floating particles background */}
					<div className="absolute inset-0 overflow-hidden pointer-events-none">
						<motion.div
							className="absolute w-32 h-32 rounded-full blur-3xl opacity-30"
							style={{
								background: 'var(--color-gradient-from)',
								top: '-10%',
								right: '10%',
							}}
							animate={{
								scale: [1, 1.2, 1],
								opacity: [0.3, 0.5, 0.3],
							}}
							transition={{
								duration: 4,
								repeat: Infinity,
								ease: 'easeInOut',
							}}
						/>
						<motion.div
							className="absolute w-32 h-32 rounded-full blur-3xl opacity-30"
							style={{
								background: 'var(--color-gradient-to)',
								bottom: '-10%',
								left: '10%',
							}}
							animate={{
								scale: [1, 1.2, 1],
								opacity: [0.3, 0.5, 0.3],
							}}
							transition={{
								duration: 4,
								repeat: Infinity,
								ease: 'easeInOut',
								delay: 2,
							}}
						/>
					</div>

					{/* Header */}
					<div
						className="relative p-6 sm:p-8 text-white overflow-hidden"
						style={{
							background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-via), var(--color-gradient-to))`,
						}}>
						{/* Shimmer effect */}
						<motion.div
							className="absolute inset-0 opacity-30"
							animate={{
								backgroundPosition: ['-200% 0', '200% 0'],
							}}
							transition={{
								duration: 3,
								repeat: Infinity,
								ease: 'linear',
							}}
							style={{
								background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
								backgroundSize: '200% 100%',
							}}
						/>

						{/* Close button */}
						<motion.button
							whileHover={{ scale: 1.1, rotate: 90 }}
							whileTap={{ scale: 0.9 }}
							onClick={closeGuide}
							className="absolute top-4 ltr:right-4 rtl:left-4 w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm border-2 border-white/30 grid place-content-center transition-colors hover:bg-white/30"
							aria-label="Close">
							<X className="w-5 h-5" strokeWidth={2.5} />
						</motion.button>

						<div className="relative z-10">
							{/* Icon */}
							<motion.div
								initial={{ scale: 0, rotate: -180 }}
								animate={{ scale: 1, rotate: 0 }}
								transition={{ delay: 0.2, ...spring }}
								className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 mb-4">
								<Smartphone className="w-8 h-8" strokeWidth={2.5} />
							</motion.div>

							{/* Title */}
							<motion.h3
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.3 }}
								className="text-2xl sm:text-3xl font-black">
								{t('title')}
							</motion.h3>

							{/* Subtitle */}
							<motion.p
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.4 }}
								className="text-white/90 text-base mt-2 leading-relaxed">
								{t('subtitle')}
							</motion.p>

							{/* Browser selector */}
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.5 }}
								className="mt-4">
								<Select
									className="bg-white/10 backdrop-blur-sm border-2 border-white/20 text-white rounded-xl"
									options={Object.entries(t.raw('browserOptions')).map(([key, label]) => ({
										label: <MultiLangText>{label}</MultiLangText>,
										id: key,
									}))}
									value={browserKey}
									onChange={(val) => setBrowserKey(val)}
								/>
							</motion.div>
						</div>
					</div>

					{/* Content */}
					<div className="relative bg-white/95 backdrop-blur-xl px-6 sm:px-8 py-6 space-y-6">
						{/* Install button for Android */}
						{browserInfo.isAndroid && deferredPrompt && (
							<motion.button
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={triggerInstall}
								disabled={installing}
								className="w-full rounded-xl py-3.5 font-bold text-white shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
								style={{
									background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
									boxShadow: '0 8px 24px -8px var(--color-primary-500)',
								}}>
								{installing && (
									<motion.div
										className="absolute inset-0"
										animate={{
											backgroundPosition: ['-200% 0', '200% 0'],
										}}
										transition={{
											duration: 2,
											repeat: Infinity,
											ease: 'linear',
										}}
										style={{
											background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
											backgroundSize: '200% 100%',
										}}
									/>
								)}
								<span className="relative z-10 flex items-center justify-center gap-2">
									{installing ? (
										<motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
											<Download className="w-5 h-5" />
										</motion.div>
									) : (
										<Download className="w-5 h-5" />
									)}
									{installing ? t('installing') : t('installButton')}
								</span>
							</motion.button>
						)}

						{/* Steps */}
						<div>
							<h4 className="font-black text-slate-900 text-lg mb-4 flex items-center gap-2">
								<span
									className="w-8 h-8 rounded-lg grid place-content-center"
									style={{
										background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
									}}>
									<Chrome className="w-4 h-4 text-white" strokeWidth={2.5} />
								</span>
								{t('stepsTitle')}
							</h4>

							<ol className="space-y-3">
								{steps.map((line, i) => (
									<motion.li
										key={i}
										initial={{ opacity: 0, x: -20 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ delay: 0.6 + i * 0.1 }}
										className="flex gap-3 items-start group">
										{/* Step number */}
										<span
											className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white text-sm font-black shadow-lg transition-all duration-200 group-hover:scale-110"
											style={{
												background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
											}}>
											{i + 1}
										</span>

										{/* Step text */}
										<p className="text-sm text-slate-700 leading-relaxed font-medium pt-1">{line}</p>
									</motion.li>
								))}
							</ol>
						</div>

						{/* Footer */}
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.8 }}
							className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t-2"
							style={{ borderColor: 'var(--color-primary-100)' }}>
							{/* Checkbox */}
							<div className="flex-1">
								<CheckBox
									label={t('dontShowAgain')}
									initialChecked={dontShowAgain}
									onChange={(checked) => setDontShowAgain(checked)}
								/>
							</div>

							{/* Close button */}
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={closeGuide}
								className="rounded-xl px-6 py-2.5 font-bold border-2 transition-all duration-200"
								style={{
									borderColor: 'var(--color-primary-200)',
									backgroundColor: 'var(--color-primary-50)',
									color: 'var(--color-primary-700)',
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.backgroundColor = 'var(--color-primary-100)';
									e.currentTarget.style.borderColor = 'var(--color-primary-300)';
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor = 'var(--color-primary-50)';
									e.currentTarget.style.borderColor = 'var(--color-primary-200)';
								}}>
								{t('close')}
							</motion.button>
						</motion.div>
					</div>
				</motion.div>
			</div>
		</AnimatePresence>
	);
}