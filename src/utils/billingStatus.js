export function getPaymentStatus(status) {
	const s = String(status || '').toLowerCase();
	if (s === 'succeeded' || s === 'paid') return { key: 'succeeded', label: 'Completed' };
	if (s === 'failed') return { key: 'failed', label: 'Failed' };
	if (s === 'refunded') return { key: 'refunded', label: 'Refunded' };
	return { key: 'pending', label: 'Pending' };
}

export function getInvoiceStatus(status) {
	const s = String(status || '').toLowerCase();
	if (s === 'paid') return { key: 'paid', label: 'Paid' };
	if (s === 'open') return { key: 'open', label: 'Open' };
	if (s === 'void') return { key: 'void', label: 'Void' };
	return { key: 'draft', label: 'Draft' };
}
