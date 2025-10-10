// components/MultiLangText.jsx
import React from 'react';
import { Cairo, Poppins } from 'next/font/google';

const arabicFont = Cairo({
  subsets: ['arabic'],
  display: 'swap',
});
const latinFont = Poppins({
  subsets: ['latin'],
  weight: ['400', '600'],
  display: 'swap',
});

// Helper: هل الحرف عربي؟
const isArabicChar = ch => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(ch);

// قسم النص إلى مقاطع (عربي/إنجليزي) متجاورة
function segmentByScript(text = '') {
  if (!text) return [];
  let segments = [];
  let currentIsArabic = isArabicChar(text[0]);
  let buffer = '';

  for (const ch of text) {
    const ar = isArabicChar(ch);
    if (ar === currentIsArabic) {
      buffer += ch;
    } else {
      segments.push({ text: buffer, arabic: currentIsArabic });
      buffer = ch;
      currentIsArabic = ar;
    }
  }
  if (buffer) segments.push({ text: buffer, arabic: currentIsArabic });
  return segments;
}

export default function MultiLangText({ text, children, as: Tag = 'span', className = '', dirAuto = false, ...rest }) {
  const content = typeof text === 'string' ? text : String(children ?? '');
  const segments = segmentByScript(content);

  // dir تلقائي: لو أول حرف عربي خليه rtl وإلا ltr
  const firstArabic = segments.find(s => s.text.trim())?.arabic ?? false;
  const dir = dirAuto ? (firstArabic ? 'rtl' : 'ltr') : undefined;
  const lang = firstArabic ? 'ar' : 'en';

  return (
    <Tag className={className} dir={dir} lang={lang} {...rest}>
      {segments.map((seg, i) => (
        <span key={i} className={seg.arabic ? arabicFont.className : latinFont.className} lang={seg.arabic ? 'ar' : 'en'}>
          {seg.text}
        </span>
      ))}
    </Tag>
  );
}
