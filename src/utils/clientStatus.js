import { daysLeft } from './formatters';

export function getClientStatus(client) {
	const left = daysLeft(client?.renewalDate || client?.subscriptionEnd);
	if (left == null) return { key: 'pending', label: 'No subscription' };
	if (left <= 0) return { key: 'expired', label: 'Expired' };
	if (left <= 7) return { key: 'expiring', label: 'Expiring in 7d' };
	if (left <= 30) return { key: 'renewal_due', label: 'Renewal due' };
	return { key: 'active', label: 'Active' };
}
