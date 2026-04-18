export const WHATSAPP_TEMPLATES = {
	renewal: ({ name = '', endDate = '' }) =>
		`Hi ${name}, your subscription ends on ${endDate}. Reply here to renew.`,
	inactiveFollowup: ({ name = '' }) =>
		`Hi ${name}, we noticed you were inactive recently. Need help getting back on track?`,
	packageOffer: ({ name = '', packageName = '' }) =>
		`Hi ${name}, we have a package that fits your goals: ${packageName}.`,
	reminder: ({ name = '', text = '' }) =>
		`Hi ${name}, quick reminder: ${text}`,
};

export function buildWhatsAppLink(phone, message) {
	const to = String(phone || '').replace(/[^0-9]/g, '');
	if (!to) return null;
	return `https://wa.me/${to}?text=${encodeURIComponent(message || '')}`;
}
