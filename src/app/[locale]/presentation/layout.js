import { hasLocale } from 'next-intl';
import { routing } from '@/i18n/routing';

const META = {
	ar: {
		title: 'So7baFit — منصة إدارة التدريب والتغذية للصالات والمدربين',
		description:
			'منصة SaaS متكاملة لإدارة العملاء وخطط التمارين والتغذية وواتساب والتقارير والفوترة — بديل احترافي لواتساب والإكسل والملفات المتفرقة.',
		ogTitle: 'So7baFit — نظام تشغيل كامل لأعمال اللياقة',
		ogDescription:
			'إدارة العملاء والخطط والتغذية وواتساب والتقارير والمدفوعات في منصة واحدة. احجز عرضًا تجريبيًا.',
		twTitle: 'So7baFit — منصة اللياقة للصالات والمدربين',
		twDescription: 'خطط، تغذية، واتساب، تقارير، فوترة — في نظام واحد.',
		locale: 'ar_SA',
	},
	en: {
		title: 'So7baFit — Fitness coaching platform for gyms & coaches',
		description:
			'All-in-one SaaS for clients, workout plans, nutrition, WhatsApp CRM, reports, and billing — a professional alternative to WhatsApp, Excel, and PDFs.',
		ogTitle: 'So7baFit — The operating system for fitness businesses',
		ogDescription:
			'Manage clients, plans, nutrition, WhatsApp, reports, and payments in one platform. Book a demo.',
		twTitle: 'So7baFit — Fitness platform for gyms & coaches',
		twDescription: 'Plans, nutrition, WhatsApp, reports, billing — in one system.',
		locale: 'en_US',
	},
};

export async function generateMetadata({ params }) {
	const { locale: raw } = await params;
	const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
	const m = META[locale] || META.ar;

	return {
		title: m.title,
		description: m.description,
		keywords:
			'So7baFit, fitness CRM, workout plans, nutrition, WhatsApp coaching, gym software, online coaching',
		alternates: {
			languages: {
				ar: 'https://so7bafit.com/ar/presentation',
				en: 'https://so7bafit.com/en/presentation',
			},
		},
		openGraph: {
			title: m.ogTitle,
			description: m.ogDescription,
			url: `https://so7bafit.com/${locale}/presentation`,
			siteName: 'So7baFit',
			locale: m.locale,
			type: 'website',
			images: [{ url: '/meta.png', width: 1200, height: 630, alt: 'So7baFit' }],
		},
		twitter: {
			card: 'summary_large_image',
			title: m.twTitle,
			description: m.twDescription,
			images: ['/meta.png'],
		},
		robots: { index: true, follow: true },
	};
}

export default function PresentationLayout({ children }) {
	return children;
}
