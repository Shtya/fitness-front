export function getSubscriptionStatus(status) {
	const s = String(status || '').toLowerCase();
	if (s === 'active') return { key: 'active', label: 'Active' };
	if (s === 'canceled') return { key: 'canceled', label: 'Canceled' };
	if (s === 'expired') return { key: 'expired', label: 'Expired' };
	if (s === 'past_due') return { key: 'past_due', label: 'Past due' };
	if (s === 'trialing') return { key: 'trialing', label: 'Trialing' };
	return { key: 'pending', label: 'Pending' };
}
