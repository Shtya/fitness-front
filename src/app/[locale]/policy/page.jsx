'use client';

import { useLocale } from 'next-intl';
import LegalShell from '../privacy/LegalShell';
import { POLICY_CONTENT } from '../privacy/legal-content';

export default function PolicyPage() {
	const locale = useLocale();
	const content = POLICY_CONTENT[locale] || POLICY_CONTENT.en;
	return <LegalShell content={content} />;
}
