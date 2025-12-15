'use client';

import { useEffect, useState } from 'react';

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);

    const update = () => setIsMobile(mq.matches);
    update();

    // modern + fallback
    mq.addEventListener?.('change', update);
    mq.addListener?.(update);

    return () => {
      mq.removeEventListener?.('change', update);
      mq.removeListener?.(update);
    };
  }, [breakpoint]);

  return isMobile;
}
