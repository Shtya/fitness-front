'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import Select from './Select';
import CheckBox from './CheckBox';
import MultiLangText from './MultiLangText';

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
    (window.matchMedia?.('(display-mode: standalone)')?.matches ||
      window.navigator?.standalone === true);

  // ✅ Detect browser info only on the client
  useEffect(() => {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') return;

    const ua = navigator.userAgent.toLowerCase();
    const isAndroid = /android/.test(ua);
    const isIOS =
      /iphone|ipad|ipod/.test(ua) ||
      (/macintosh/.test(ua) && 'ontouchend' in window);
    const isSamsung = /samsungbrowser/.test(ua);
    const isEdge = /edg\//.test(ua);
    const isChrome = /chrome\//.test(ua) && !isEdge && !isSamsung;
    const isFirefox = /firefox\//.test(ua);
    const isSafari =
      !/chrome|crios|fxios|edg/i.test(ua) &&
      (/safari/i.test(ua) || /iphone|ipad|ipod/i.test(ua));
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
    const {
      isAndroid,
      isSamsung,
      isChrome,
      isEdge,
      isFirefox,
      isIOS,
      isSafari,
      isIOSAltBrowser,
    } = browserInfo;

    if (isAndroid && isSamsung) return 'samsung';
    if (isAndroid && isChrome) return 'chrome';
    if (isAndroid && isEdge) return 'edge';
    if (isAndroid && isFirefox) return 'firefox';
    if (isIOS && isSafari) return 'safari';
    if (isIOSAltBrowser) return 'ios_other';
    return 'generic';
  }, [browserInfo]);

  const effectiveKey = browserKey === 'auto' ? autoKey : browserKey;

  // ✅ Handle visibility timing
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isStandalone()) return;

    const saved = localStorage.getItem(storageKey);
    if (saved === '1') return;

    const timer = setTimeout(() => setVisible(true), autoShowDelayMs);
    return () => clearTimeout(timer);
  }, [storageKey, autoShowDelayMs]);

  // ✅ Handle PWA install events
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
    <div dir='rtl' className='fixed inset-0 z-[60] flex items-center justify-center'>
      <div
        className='absolute inset-0 bg-slate-900/40 backdrop-blur-sm'
        onClick={closeGuide}
      />
      <div className='relative w-[92%] sm:max-w-lg rounded-3xl border border-indigo-200/60 shadow-2xl overflow-hidden'>
        {/* Header */}
        <div className='relative p-5 sm:p-6 bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-600 text-white'>
          <div className='relative'>
            <h3 className='text-lg sm:text-xl font-semibold'>{t('title')}</h3>
            <p className='text-white/90 text-sm mt-1'>{t('subtitle')}</p>

            <Select
              className='mt-3'
              options={Object.entries(t.raw('browserOptions')).map(
                ([key, label]) => ({
                  label: <MultiLangText>{label}</MultiLangText>,
                  id: key,
                })
              )}
              value={browserKey}
              onChange={(val) => setBrowserKey(val)}
            />
          </div>
        </div>

        <div className='bg-white/80 backdrop-blur-2xl px-5 sm:px-6 pt-1 pb-3'>
          {browserInfo.isAndroid && deferredPrompt && (
            <button
              onClick={triggerInstall}
              disabled={installing}
              className='w-full rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium py-2.5'
            >
              {installing ? t('installing') : t('installButton')}
            </button>
          )}

          <h4 className='font-semibold text-slate-800 mt-5 mb-3'>
            {t('stepsTitle')}
          </h4>
          <ol className='space-y-2'>
            {steps.map((line, i) => (
              <li key={i} className='flex gap-3 items-start'>
                <span className='mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-semibold'>
                  {i + 1}
                </span>
                <p className='text-sm text-slate-700 leading-relaxed'>{line}</p>
              </li>
            ))}
          </ol>

          <div className='mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3'>
            <CheckBox
              label={t('dontShowAgain')}
              initialChecked={dontShowAgain}
              onChange={(checked) => setDontShowAgain(checked)}
              className='mt-3'
            />

            <button
              onClick={closeGuide}
              className='sm:ml-auto rounded-lg px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition'
            >
              {t('close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
 