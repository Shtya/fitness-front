'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, Send } from 'lucide-react';
import { conversationTitle, conversationAvatarUrl, foldWhatsAppSearchText, shouldAutoFocusTextEntry } from '../whatsapp-utils';
import { Avatar } from './WaAvatar';

/** Searchable chat list used by "Send to", story share and contact share. */
export function WaChatPicker({
	items,
	locale,
	onPick,
	busyId = '',
	emptyText,
	actionIcon,
	limit = 300,
	autoFocus = false,
}) {
	const [query, setQuery] = useState('');
	const [desktopFocus] = useState(() => shouldAutoFocusTextEntry(typeof window === 'undefined' ? null : window));
	const ar = locale === 'ar';

	useEffect(() => {
		if (desktopFocus || typeof document === 'undefined') return;
		const active = document.activeElement;
		if (active instanceof HTMLElement && (active.matches('input, textarea') || active.isContentEditable)) {
			active.blur();
		}
	}, [desktopFocus]);
	const term = foldWhatsAppSearchText(query);
	const rows = useMemo(() => {
		const list = items || [];
		if (!term) return list.slice(0, limit);
		return list
			.filter(item => {
				const title = foldWhatsAppSearchText(conversationTitle(item));
				const phone = foldWhatsAppSearchText(
					item.phoneNumber || item.contactPhone || item.contact?.phoneNumber || item.providerChatId || '',
				);
				return title.includes(term) || phone.includes(term);
			})
			.slice(0, limit);
	}, [items, term, limit]);
	const busy = Boolean(busyId);

	return (
		<>
			<div className="wa-dx__search-wrap">
				<label className="wa-dx__search">
					<Search size={16} strokeWidth={2.2} aria-hidden="true" />
					<input
						type="search"
						value={query}
						autoFocus={autoFocus && desktopFocus}
						onChange={event => setQuery(event.target.value)}
						placeholder={ar ? 'ابحث باسم أو رقم' : 'Search name or number'}
						aria-label={ar ? 'ابحث عن محادثة' : 'Search chats'}
					/>
				</label>
			</div>
			<div className="wa-dx__list wa-ui-scroll nice-scroll">
				{rows.length ? (
					rows.map(item => {
						const title = conversationTitle(item);
						const isGroup = item.type === 'group' || String(item.providerChatId || '').endsWith('@g.us');
						const phone = String(item.contact?.phoneNumber || item.phoneNumber || '').trim();
						const sub = isGroup ? (ar ? 'جروب' : 'Group') : phone && !title.includes(phone) ? phone : '';
						const sending = busyId && busyId === item.id;
						return (
							<button
								key={item.id}
								type="button"
								disabled={busy}
								onClick={() => onPick(item)}
								className={`wa-dx__row${sending ? ' is-busy' : ''}`}
							>
								<Avatar label={title} size={10} src={conversationAvatarUrl(item)} isGroup={isGroup} />
								<span className="wa-dx__row-copy">
									<span className="wa-dx__row-title wa-privacy-identity" dir="auto">
										{title}
									</span>
									{sub ? (
										<span className="wa-dx__row-sub wa-privacy-identity" dir={isGroup ? 'auto' : 'ltr'}>
											{sub}
										</span>
									) : null}
								</span>
								<span className="wa-dx__row-action" aria-hidden="true">
									{sending ? (
										<Loader2 size={17} className="animate-spin" />
									) : (
										actionIcon || <Send size={16} strokeWidth={2.2} />
									)}
								</span>
							</button>
						);
					})
				) : (
					<div className="wa-dx__empty">
						<Search size={22} strokeWidth={1.8} aria-hidden="true" />
						<p>{term ? (ar ? 'لا نتائج لهذا البحث' : 'No chats match your search') : emptyText}</p>
					</div>
				)}
			</div>
		</>
	);
}
