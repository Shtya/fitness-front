'use client';

import { useEffect, useState } from 'react';

export default function PWAInstallPrompt() {
  const [deferredEvt, setDeferredEvt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onPrompt = (e) => {
       e.preventDefault();
      setDeferredEvt(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const install = async () => {
    if (!deferredEvt) return;
    setVisible(false);
    setDeferredEvt(null);
  };

  if (!visible) return null;

  return (
    <div className=" max-md:flex hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="rounded-xl bg-white/90 backdrop-blur px-4 py-2 shadow-lg border">
        <div className="flex items-center gap-3">
          <span className="text-sm">ثبّت التطبيق على جهازك للتشغيل السريع والأوفلاين</span>
          <button
            onClick={install}
            className="text-sm px-3 py-1 rounded-lg border border-indigo-300 hover:bg-indigo-50"
          >
            تثبيت
          </button>
        </div>
      </div>
    </div>
  );
}
