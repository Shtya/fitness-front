import WhatsAppWorkspace from './whatsapp-workspace';
import WhatsAppTabIcon from './WhatsAppTabIcon';

export const metadata = {
	title: 'WhatsApp | So7baFit',
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
