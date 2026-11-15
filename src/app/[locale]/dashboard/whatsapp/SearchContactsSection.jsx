'use client';

import { useEffect, useState } from 'react';
import { Loader2, MessageCirclePlus } from 'lucide-react';
import api from '@/utils/axios';

function initial(name) {
	return String(name || '?').replace(/^\+/, '').trim().slice(0, 1).toUpperCase() || '?';
}

/**
 * "Contacts" under the chat-list search, like WhatsApp: people matching the search that have no
 * chat in the results (never messaged, or the chat is elsewhere). Clicking one opens or starts
 * the chat. With nothing to show it renders `fallback` (the "No chats match" message).
 */
export default function SearchContactsSection({
	accountId,
	query,
	ar,
	excludeConversationIds,
	onOpen,
	fallback = null,
}) {
	const [state, setState] = useState({ query: '', items: [], loading: false });
	const [openingId, setOpeningId] = useState('');
	const text = String(query || '').trim();

	useEffect(() => {
		if (!accountId || text.length < 2) {
			setState({ query: text, items: [], loading: false });
			return undefined;
		}
		let alive = true;
		setState(current => ({ ...current, loading: true }));
		const timer = window.setTimeout(async () => {
			try {
				const { data } = await api.get(`/whatsapp/accounts/${accountId}/contacts`, {
					params: { search: text, scope: 'all', limit: 8 },
				});
				if (alive) setState({ query: text, items: Array.isArray(data?.items) ? data.items : [], loading: false });
			} catch {
				if (alive) setState({ query: text, items: [], loading: false });
			}
		}, 300);
		return () => {
			alive = false;
			window.clearTimeout(timer);
		};
	}, [accountId, text]);

	const items = state.items.filter(
		contact => !(contact.conversationId && excludeConversationIds?.has(contact.conversationId)),
	);

	if (!items.length) {
		if (state.loading && text.length >= 2) {
			return (
				<div className="wa-search-contacts__loading">
					<Loader2 size={16} className="animate-spin" aria-hidden="true" />
					{ar ? 'بندوّر في جهات الاتصال…' : 'Searching contacts…'}
				</div>
			);
		}
		return fallback;
	}

	return (
		<section className="wa-search-contacts" aria-label={ar ? 'جهات الاتصال' : 'Contacts'}>
			<p className="wa-search-contacts__head">{ar ? 'جهات الاتصال' : 'Contacts'}</p>
			<ul>
				{items.map(contact => {
					const name = contact.displayName || contact.localName || contact.phone?.international || '—';
					const phone = contact.phone?.international || contact.phone?.e164 || '';
					return (
						<li key={contact.id}>
							<button
								type="button"
								className="wa-search-contacts__row"
								disabled={Boolean(openingId)}
								onClick={async () => {
									setOpeningId(contact.id);
									try {
										await onOpen(contact);
									} finally {
										setOpeningId('');
									}
								}}
							>
								<span className="wa-search-contacts__avatar">
									{contact.avatarUrl ? <img src={contact.avatarUrl} alt="" /> : initial(name)}
								</span>
								<span className="min-w-0 flex-1">
									<span className="wa-search-contacts__name" dir="auto">
										{name}
									</span>
									{phone && phone !== name ? (
										<bdi dir="ltr" className="wa-search-contacts__phone">
											{phone}
										</bdi>
									) : null}
								</span>
								<span className="wa-search-contacts__action">
									{openingId === contact.id ? (
										<Loader2 size={15} className="animate-spin" aria-hidden="true" />
									) : (
										<MessageCirclePlus size={16} aria-hidden="true" />
									)}
									{contact.conversationId ? (ar ? 'افتح' : 'Open') : ar ? 'ابدأ شات' : 'Message'}
								</span>
							</button>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
