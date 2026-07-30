'use client';

import { useLocale } from 'next-intl';
import LegalShell from './LegalShell';
import { PRIVACY_CONTENT } from './legal-content';

export default function PrivacyPage() {
	const locale = useLocale();
	const content = PRIVACY_CONTENT[locale] || PRIVACY_CONTENT.en;
	return <LegalShell content={content} />;
}
