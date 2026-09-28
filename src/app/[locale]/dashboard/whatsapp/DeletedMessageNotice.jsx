'use client';

import { Trash2 } from 'lucide-react';
import { deletedWhatsAppMessageLabel } from './whatsapp-utils';

export default function DeletedMessageNotice({ locale = 'en', className = '', kept = false }) {
	if (kept) {
		return (
			<div
				role="note"
				className={`wa-message-deleted-notice wa-message-deleted-notice--kept${className ? ` ${className}` : ''}`}
			>
				<span className="wa-message-deleted-badge" aria-hidden="true">
					<Trash2 size={12} strokeWidth={2.25} />
				</span>
				<span className="min-w-0">
					<span className="wa-message-deleted-label">{deletedWhatsAppMessageLabel(locale)}</span>
					<span className="wa-message-deleted-hint">
						{locale === 'ar' ? 'حُذفت على واتساب · نسخة محفوظة هنا' : 'Deleted on WhatsApp · saved copy'}
					</span>
				</span>
			</div>
		);
	}
	return (
		<div className={`wa-message-deleted-notice${className ? ` ${className}` : ''}`}>
			<Trash2 size={14} strokeWidth={2} className="wa-message-deleted-icon" aria-hidden="true" />
			<p className="wa-message-deleted-label">{deletedWhatsAppMessageLabel(locale)}</p>
		</div>
	);
}
