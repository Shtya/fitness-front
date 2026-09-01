'use client';

import { Trash2 } from 'lucide-react';
import { deletedWhatsAppMessageLabel } from './whatsapp-utils';

export default function DeletedMessageNotice({ locale = 'en', className = '' }) {
	return (
		<div className={`wa-message-deleted-notice${className ? ` ${className}` : ''}`}>
			<Trash2 size={14} strokeWidth={2} className="wa-message-deleted-icon" aria-hidden="true" />
			<p className="wa-message-deleted-label">{deletedWhatsAppMessageLabel(locale)}</p>
		</div>
	);
}
