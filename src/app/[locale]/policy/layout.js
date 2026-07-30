import { hasLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import { LEGAL_META } from '../privacy/legal-content';

export async function generateMetadata({ params }) {
	const { locale: raw } = await params;
	const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
	const m = LEGAL_META.policy[locale] || LEGAL_META.policy.en;
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

export default function PolicyLayout({ children }) {
	return children;
}
