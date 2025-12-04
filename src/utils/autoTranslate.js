import { useLocale } from 'next-intl';

export function useAutoTranslate() {
  const locale = useLocale();

  async function autoTranslate(text) {
    const isArabic = /[\u0600-\u06FF]/.test(text);

    let targetLang;
    if (locale === 'ar' && !isArabic) targetLang = 'ar';
    else if (locale === 'en' && isArabic) targetLang = 'en';
    else return text;

    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${isArabic ? 'ar|en' : 'en|ar'}`);

    const data = await res.json();
    return data.responseData.translatedText;
  }

  return { autoTranslate };
}
