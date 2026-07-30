import { hasLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import { LEGAL_META } from './legal-content';

export async function generateMetadata({ params }) {
	const { locale: raw } = await params;
	const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
	const m = LEGAL_META.privacy[locale] || LEGAL_META.privacy.en;
	return {
		title: m.title,
		description: m.description,
		openGraph: {
			title: m.title,
			description: m.description,
			siteName: 'So7baFit',
			type: 'website',
		},
	};
}

export default function PrivacyLayout({ children }) {
	return children;
}
