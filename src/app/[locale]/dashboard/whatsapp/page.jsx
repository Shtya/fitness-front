import WhatsAppWorkspace from './whatsapp-workspace-client';
import WhatsAppTabIcon from './WhatsAppTabIcon';

export const viewport = {
	/* Single colour — app theme toggles this at runtime. Do not key off
	   prefers-color-scheme or iOS keeps a dark status bar while the UI is light. */
	themeColor: '#ffffff',
	colorScheme: 'light dark',
	viewportFit: 'cover',
	// Android: the keyboard shrinks the layout so 100dvh ends at the keyboard. iOS ignores
	// this; mobile-viewport.js handles it there.
	interactiveWidget: 'resizes-content',
};

export const metadata = {
	title: 'WhatsApp | So7baFit',
	appleWebApp: {
		capable: true,
		title: 'WhatsApp',
		statusBarStyle: 'default',
	},
	icons: {
		icon: [{ url: '/icons/whatsapp.svg', type: 'image/svg+xml' }],
		shortcut: ['/icons/whatsapp.svg'],
	},
};

export default function WhatsAppPage() {
	return (
		<>
			<WhatsAppTabIcon />
			<WhatsAppWorkspace />
		</>
	);
}
