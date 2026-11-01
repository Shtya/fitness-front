'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { Share, SquarePlus } from 'lucide-react';
import { useTenantTheme } from '@/lib/tenant/TenantThemeProvider';
import './add-to-home.css';

const STATE_KEY = 'so7ba.install.v2';
const LEGACY_DISMISS_KEY = 'a2hs_guide_dismissed_v1';
const DAY = 24 * 60 * 60 * 1000;
// "Not now" backs off: 3 days, then 2 weeks, then 2 months.
const SNOOZE_STEPS = [3 * DAY, 14 * DAY, 60 * DAY];

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

function isStandalone() {
	return (
		typeof window !== 'undefined' &&
		(window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator?.standalone === true)
	);
}

function readState() {
	try {
		const saved = JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
		if (saved && typeof saved === 'object') return saved;
		// The old guide's "don't show again" becomes one long snooze for the new sheet.
		if (localStorage.getItem(LEGACY_DISMISS_KEY) === '1') {
			return { snoozes: 1, snoozeUntil: Date.now() + SNOOZE_STEPS[1], installed: false };
		}
	} catch {
		/* storage blocked: show normally */
	}
	return { snoozes: 0, snoozeUntil: 0, installed: false };
}

function writeState(next) {
	try {
		localStorage.setItem(STATE_KEY, JSON.stringify(next));
	} catch {
		/* ignore */
	}
}

function detectPlatform() {
	if (typeof navigator === 'undefined') return { ios: false, iosSafari: false, browserKey: 'generic' };
	const ua = navigator.userAgent.toLowerCase();
	const android = /android/.test(ua);
	const ios = /iphone|ipad|ipod/.test(ua) || (/macintosh/.test(ua) && 'ontouchend' in window);
	const samsung = /samsungbrowser/.test(ua);
	const edge = /edg\//.test(ua);
	const firefox = /firefox\//.test(ua);
	const chrome = /chrome\//.test(ua) && !edge && !samsung;
	const iosSafari = ios && !/crios|fxios|edgios|opios/.test(ua);
	const browserKey = android && samsung ? 'samsung'
		: android && chrome ? 'chrome'
			: android && edge ? 'edge'
				: android && firefox ? 'firefox'
					: 'generic';
	return { ios, iosSafari, browserKey };
}

/**
 * "Add to home screen" bottom sheet (phones only).
 * - Chromium: the Install button opens the browser's own prompt (beforeinstallprompt).
 * - iOS has no prompt: Install turns the sheet into the two Safari steps (Share → Add to Home Screen).
 * - Other browsers: Install shows the menu steps for that browser.
 * Hidden once installed; "Not now" snoozes with a growing delay.
 */
export default function AddToHomeGuide({ autoShowDelayMs = 1600 }) {
	const t = useTranslations('AddToHomeGuide');
	const locale = useLocale();
	const isRtl = locale === 'ar';
	const pathname = usePathname();
	const blocked = isBlockedRoute(pathname);
	const { appName, assets } = useTenantTheme();

	const [mounted, setMounted] = useState(false);
	const [open, setOpen] = useState(false);
	const [leaving, setLeaving] = useState(false);
	const [view, setView] = useState('offer'); // 'offer' | 'ios' | 'manual'
	const [deferredPrompt, setDeferredPrompt] = useState(null);
	const [platform, setPlatform] = useState({ ios: false, iosSafari: false, browserKey: 'generic' });

	const name = appName && appName !== 'So7baFit' ? appName : isRtl ? 'صحبة فت' : 'So7baFit';
	const iconSrc = assets?.icon || '/icons/icon-192.png';

	useEffect(() => {
		setMounted(true);
		setPlatform(detectPlatform());
	}, []);

	// The browser fires the install prompt once, often before hydration: the root layout's
	// inline script keeps it on window.__so7baInstallPrompt and announces it.
	useEffect(() => {
		const adopt = () => {
			if (window.__so7baInstallPrompt) setDeferredPrompt(window.__so7baInstallPrompt);
		};
		const onBeforeInstall = event => {
			event.preventDefault();
			window.__so7baInstallPrompt = event;
			setDeferredPrompt(event);
		};
		const onInstalled = () => {
			window.__so7baInstallPrompt = null;
			writeState({ ...readState(), installed: true });
			setOpen(false);
		};
		adopt();
		window.addEventListener('so7ba:installprompt', adopt);
		window.addEventListener('beforeinstallprompt', onBeforeInstall);
		window.addEventListener('appinstalled', onInstalled);
		return () => {
			window.removeEventListener('so7ba:installprompt', adopt);
			window.removeEventListener('beforeinstallprompt', onBeforeInstall);
			window.removeEventListener('appinstalled', onInstalled);
		};
	}, []);

	useEffect(() => {
		if (!mounted || blocked || isStandalone()) {
			setOpen(false);
			return undefined;
		}
		const phone = window.matchMedia('(max-width: 767px)');
		if (!phone.matches) return undefined;
		const state = readState();
		if (state.installed || Date.now() < (state.snoozeUntil || 0)) return undefined;
		const timer = window.setTimeout(() => {
			setView('offer');
			setOpen(true);
		}, autoShowDelayMs);
		return () => window.clearTimeout(timer);
	}, [mounted, blocked, autoShowDelayMs]);

	const close = useCallback(() => {
		setLeaving(true);
		window.setTimeout(() => {
			setOpen(false);
			setLeaving(false);
		}, 220);
	}, []);

	const notNow = useCallback(() => {
		const state = readState();
		const snoozes = (state.snoozes || 0) + 1;
		const delay = SNOOZE_STEPS[Math.min(snoozes, SNOOZE_STEPS.length) - 1];
		writeState({ ...state, snoozes, snoozeUntil: Date.now() + delay });
		close();
	}, [close]);

	const install = useCallback(async () => {
		if (deferredPrompt) {
			deferredPrompt.prompt();
			const choice = await deferredPrompt.userChoice.catch(() => null);
			// A prompt can be shown only once.
			window.__so7baInstallPrompt = null;
			setDeferredPrompt(null);
			if (choice?.outcome === 'accepted') {
				writeState({ ...readState(), installed: true });
				close();
			} else {
				notNow();
			}
			return;
		}
		setView(platform.ios ? 'ios' : 'manual');
	}, [deferredPrompt, platform.ios, close, notNow]);

	useEffect(() => {
		if (!open) return undefined;
		const onKey = event => {
			if (event.key === 'Escape') notNow();
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [open, notNow]);

	const manualSteps = useMemo(() => {
		if (view !== 'manual') return [];
		const steps = t.raw(`steps.${platform.browserKey}`);
		return Array.isArray(steps) ? steps : [];
	}, [view, platform.browserKey, t]);

	if (!mounted || !open) return null;

	return createPortal(
		<div className="a2h-layer" dir={isRtl ? 'rtl' : 'ltr'} lang={locale}>
			<section
				className={`a2h-sheet${leaving ? ' is-leaving' : ''}`}
				role="dialog"
				aria-modal="false"
				aria-labelledby="a2h-title"
				aria-describedby="a2h-lead"
			>
				<span className="a2h-grabber" aria-hidden="true" />

				<div className="a2h-head">
					{/* The icon settles into an empty slot of a tiny home screen. */}
					<span className="a2h-home" aria-hidden="true">
						<i />
						<i />
						<i />
						<i />
						<i />
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img className="a2h-icon" src={iconSrc} alt="" width={48} height={48} />
					</span>
					<div className="a2h-copy">
						<h2 id="a2h-title" className="a2h-title">
							{view === 'ios' ? t('iosTitle') : view === 'manual' ? t('manualTitle') : t('sheetTitle', { app: name })}
						</h2>
						<p id="a2h-lead" className="a2h-lead">
							{t('sheetLead')}
						</p>
					</div>
				</div>

				{view === 'ios' ? (
					platform.iosSafari ? (
						<ol className="a2h-steps">
							<li>
								<span className="a2h-step-icon" aria-hidden="true">
									<Share size={16} strokeWidth={2.2} />
								</span>
								{t('iosStep1')}
							</li>
							<li>
								<span className="a2h-step-icon" aria-hidden="true">
									<SquarePlus size={16} strokeWidth={2.2} />
								</span>
								{t('iosStep2')}
							</li>
						</ol>
					) : (
						<p className="a2h-note">{t('iosNotSafari')}</p>
					)
				) : null}

				{view === 'manual' ? (
					<ol className="a2h-steps">
						{manualSteps.map((line, index) => (
							<li key={index}>
								<span className="a2h-step-num" aria-hidden="true">
									{index + 1}
								</span>
								{line}
							</li>
						))}
					</ol>
				) : null}

				<div className="a2h-actions">
					{view === 'offer' ? (
						<>
							<button type="button" className="a2h-btn is-ghost" onClick={notNow}>
								{t('notNow')}
							</button>
							<button type="button" className="a2h-btn is-primary" onClick={install}>
								{t('install')}
							</button>
						</>
					) : (
						<>
							<button type="button" className="a2h-btn is-ghost" onClick={notNow}>
								{t('notNow')}
							</button>
							<button type="button" className="a2h-btn is-primary" onClick={notNow}>
								{t('gotIt')}
							</button>
						</>
					)}
				</div>

				{view === 'ios' && platform.iosSafari ? <span className="a2h-pointer" aria-hidden="true" /> : null}
			</section>
		</div>,
		document.body,
	);
}
