'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone } from 'lucide-react';
import Select from './Select';
import CheckBox from './CheckBox';
import MultiLangText from './MultiLangText';

const spring = { type: 'spring', stiffness: 420, damping: 32 };

function isBlockedRoute(pathname) {
	if (!pathname) return false;
	return (
		pathname.startsWith('/auth') ||
		pathname.startsWith('/open') ||
		pathname.startsWith('/thank-you') ||
		pathname.startsWith('/form') ||
		pathname === '/'
	);
}

export default function AddToHomeGuide({
	storageKey = 'a2hs_guide_dismissed_v1',
	autoShowDelayMs = 1200,
}) {
	const t = useTranslations('AddToHomeGuide');
	const pathname = usePathname();
	const blocked = isBlockedRoute(pathname);

	const [visible, setVisible] = useState(false);
	const [dontShowAgain, setDontShowAgain] = useState(false);
	const [browserKey, setBrowserKey] = useState('auto');
	const [deferredPrompt, setDeferredPrompt] = useState(null);
	const [installing, setInstalling] = useState(false);
	const [installed, setInstalled] = useState(false);
	const [portalReady, setPortalReady] = useState(false);

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

	useEffect(() => {
		setPortalReady(true);
	}, []);

	useEffect(() => {
		if (blocked) setVisible(false);
	}, [blocked]);

	useEffect(() => {
		if (typeof window === 'undefined') return undefined;
		const mq = window.matchMedia('(max-width: 767px)');
		const apply = () => {
			if (!mq.matches) setVisible(false);
		};
		apply();
		mq.addEventListener?.('change', apply);
		return () => mq.removeEventListener?.('change', apply);
	}, []);

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

	useEffect(() => {
		if (typeof window === 'undefined') return;
		if (blocked) return;
		if (isStandalone()) return;
		if (!window.matchMedia('(max-width: 767px)').matches) return;

		const saved = localStorage.getItem(storageKey);
		if (saved === '1') return;

		const timer = setTimeout(() => setVisible(true), autoShowDelayMs);
		return () => clearTimeout(timer);
	}, [storageKey, autoShowDelayMs, blocked, pathname]);

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

	if (!portalReady || blocked || !visible || installed) return null;

	const steps = t.raw(`steps.${effectiveKey}`);
	const browserOptions = Object.entries(t.raw('browserOptions')).map(([key, label]) => ({
		label: <MultiLangText>{label}</MultiLangText>,
		id: key,
	}));

	return createPortal(
		<AnimatePresence>
			{visible ? (
				<div
					dir="rtl"
					className="fixed inset-0 z-[250000] flex items-center justify-center p-4"
					role="dialog"
					aria-modal="true"
					aria-label={t('title')}
				>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="absolute inset-0 bg-black/40"
						onClick={closeGuide}
						onPointerDown={closeGuide}
					/>

					<motion.div
						initial={{ opacity: 0, scale: 0.96 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.96 }}
						transition={spring}
						className="relative z-10 w-full max-w-[20rem] rounded-2xl border shadow-2xl overflow-hidden max-h-[min(78dvh,32rem)] flex flex-col bg-white"
						style={{
							borderColor: 'var(--color-primary-200)',
							boxShadow: '0 18px 48px -12px rgba(15, 23, 42, 0.35)',
						}}
						onClick={(e) => e.stopPropagation()}
						onPointerDown={(e) => e.stopPropagation()}
					>
						{/* Compact header row — no absolute X overlapping content */}
						<div
							className="shrink-0 flex items-center gap-2.5 px-3 py-2.5 text-white"
							style={{
								background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-via), var(--color-gradient-to))`,
							}}
						>
							<span className="inline-flex shrink-0 items-center justify-center w-8 h-8 rounded-lg bg-white/20 border border-white/25">
								<Smartphone className="w-4 h-4" strokeWidth={2.4} />
							</span>
							<div className="min-w-0 flex-1">
								<h3 className="text-[0.84rem] font-black leading-snug tracking-tight">
									{t('title')}
								</h3>
								<p className="text-white/85 text-[0.65rem] leading-snug mt-0.5 line-clamp-2">
									{t('subtitle')}
								</p>
							</div>
							<button
								type="button"
								onClick={closeGuide}
								onPointerDown={(e) => {
									e.stopPropagation();
									closeGuide();
								}}
								className="shrink-0 w-8 h-8 rounded-lg bg-white/20 border border-white/25 grid place-content-center"
								aria-label="Close"
							>
								<X className="w-4 h-4 pointer-events-none" strokeWidth={2.5} />
							</button>
						</div>

						<div className="relative bg-white px-3 py-2.5 space-y-2.5 overflow-y-auto overscroll-contain">
							<Select
								searchable={false}
								clearable={false}
								cnInputParent="!h-8 !min-h-8 !rounded-lg !text-[0.72rem] !font-semibold !bg-slate-50 !border-slate-200 !px-2.5"
								options={browserOptions}
								value={browserKey}
								onChange={(val) => setBrowserKey(val)}
							/>

							{browserInfo.isAndroid && deferredPrompt ? (
								<button
									type="button"
									onClick={triggerInstall}
									disabled={installing}
									className="w-full rounded-xl py-2 text-[0.78rem] font-bold text-white shadow-md disabled:opacity-50"
									style={{
										background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
									}}
								>
									<span className="inline-flex items-center justify-center gap-1.5">
										<Download className="w-3.5 h-3.5" />
										{installing ? t('installing') : t('installButton')}
									</span>
								</button>
							) : null}

							<ol className="space-y-1.5">
								{(Array.isArray(steps) ? steps : []).map((line, i) => (
									<li key={i} className="flex gap-2 items-start">
										<span
											className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white text-[0.65rem] font-black"
											style={{
												background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
											}}
										>
											{i + 1}
										</span>
										<p className="text-[0.74rem] text-slate-700 leading-snug font-medium pt-0.5">
											{line}
										</p>
									</li>
								))}
							</ol>

							<div
								className="flex flex-col gap-2 pt-2 border-t"
								style={{ borderColor: 'var(--color-primary-100)' }}
							>
								<CheckBox
									label={t('dontShowAgain')}
									initialChecked={dontShowAgain}
									onChange={(checked) => setDontShowAgain(checked)}
								/>

								<button
									type="button"
									onClick={closeGuide}
									className="w-full rounded-xl px-4 py-2 text-[0.78rem] font-bold border"
									style={{
										borderColor: 'var(--color-primary-200)',
										backgroundColor: 'var(--color-primary-50)',
										color: 'var(--color-primary-700)',
									}}
								>
									{t('close')}
								</button>
							</div>
						</div>
					</motion.div>
				</div>
			) : null}
		</AnimatePresence>,
		document.body,
	);
}
