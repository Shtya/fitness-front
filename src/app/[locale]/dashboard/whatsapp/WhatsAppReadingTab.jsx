'use client';

import StudioApp from '@/components/ai-reading/StudioApp';
import '@/lib/ai-reading/ai-reading-theme.css';
import '@/lib/ai-reading/reading-fonts.css';

/**
 * The full reading room (Home · Library · Add · Review), opened in place inside WhatsApp.
 * On phones the WhatsApp tab bar is hidden here; `onExit` backs the room's own back button.
 */
export default function WhatsAppReadingTab({ onExit }) {
	return <StudioApp embedded onExit={onExit} />;
}
