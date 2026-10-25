'use client';

import StudioApp from '@/components/ai-reading/StudioApp';
import '@/lib/ai-reading/ai-reading-theme.css';
import '@/lib/ai-reading/reading-fonts.css';

/** The full reading room (Home · Studio · Library · Import · Review), opened in place inside WhatsApp. */
export default function WhatsAppReadingTab() {
	return <StudioApp embedded />;
}
