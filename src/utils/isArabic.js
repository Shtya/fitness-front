import { useLocale } from 'next-intl';

const ARABIC_RE = /[\u0600-\u06FF]/;
const STRONG_RE = /[\u0600-\u06FF]|[A-Za-z]/;

export function isArabic(text = '') {
  const locale = useLocale();
  const trimmed = text.trim();

  // default based on current UI locale (until user types)
  let isArabic = locale === 'ar';

  if (trimmed) {
    const strong = trimmed.match(STRONG_RE)?.[0];
    if (strong) isArabic = ARABIC_RE.test(strong);
  }

  return {
    dir: isArabic ? 'rtl' : 'ltr',
    fontFamily: isArabic ? ' var(--font-arabic), sans-serif' : 'var(--font-open-sans), sans-serif',
  };
}
