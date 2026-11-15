'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Loader2, MessageCircle, RefreshCw, Search, ShieldCheck, Star, Users } from 'lucide-react';
import { conversationTitle, conversationAvatarUrl, inboxAvatarForWaId, foldWhatsAppSearchText } from '../whatsapp-utils';
import { Avatar } from './WaAvatar';

/** Group-info member list: admins first, search when the group is large. */
export function WaInfoMemberList({ participants, locale, resolve }) {
	const [query, setQuery] = useState('');
	const rows = useMemo(
		() =>
			(participants || [])
				.map(participant => ({
					participant,
					admin: Boolean(participant.isAdmin || participant.isSuperAdmin),
					owner: Boolean(participant.isSuperAdmin),
					...resolve(participant),
				}))
				.sort((a, b) => Number(b.owner) - Number(a.owner) || Number(b.admin) - Number(a.admin)),
		[participants, resolve],
	);
	const term = query.trim().toLowerCase();
	const visible = term
		? rows.filter(row => `${row.title} ${row.phoneHint}`.toLowerCase().includes(term.replace(/^\+/, '')))
		: rows;
	const ar = locale === 'ar';

	if (!rows.length) {
		return <p className="wa-gi__empty">{ar ? 'لا يوجد أعضاء محمّلون بعد' : 'No members loaded yet'}</p>;
	}

	return (
		<>
			{rows.length > 6 ? (
				<label className="wa-gi__search">
					<Search size={15} strokeWidth={2.2} aria-hidden="true" />
					<input
						type="search"
						value={query}
						onChange={event => setQuery(event.target.value)}
						placeholder={ar ? 'ابحث عن عضو' : 'Search members'}
						aria-label={ar ? 'ابحث عن عضو' : 'Search members'}
					/>
				</label>
			) : null}
			<ul className="wa-gi__list">
				{visible.map(({ participant, title, phoneHint, avatarSrc, admin, owner }) => (
					<li key={participant.id || participant.waId} className="wa-gi__member">
						<Avatar label={title} size={10} src={avatarSrc} />
						<div className="min-w-0 flex-1">
							<p className="wa-gi__member-name wa-privacy-identity" dir="auto">
								{title}
							</p>
							{phoneHint && !String(title).includes(phoneHint) ? (
								<p className="wa-gi__member-phone wa-privacy-identity" dir="ltr">
									+{phoneHint}
								</p>
							) : null}
						</div>
						{admin ? (
							<span className={`wa-gi__role${owner ? ' is-owner' : ''}`}>
								{owner ? (ar ? 'المالك' : 'Owner') : ar ? 'مشرف' : 'Admin'}
							</span>
						) : null}
					</li>
				))}
				{term && !visible.length ? (
					<li className="wa-gi__empty">{ar ? 'لا نتائج' : 'No matching members'}</li>
				) : null}
			</ul>
		</>
	);
}

/** Groups tab: searchable group list + details (info cards, admins-first member list). */
export function WaGroupsBrowser({
	groups,
	selectedGroup,
	loadingGroup,
	conversations,
	locale,
	t,
	onSelect,
	onRefresh,
	onOpenChat,
	onCloseDetails,
}) {
	const [query, setQuery] = useState('');
	const ar = locale === 'ar';
	const term = foldWhatsAppSearchText(query);
	const conversationById = useMemo(() => {
		const map = new Map();
		for (const item of conversations || []) map.set(item.id, item);
		return map;
	}, [conversations]);
	const groupAvatar = group => {
		const conversation = group?.conversationId ? conversationById.get(group.conversationId) : null;
		return conversation ? conversationAvatarUrl(conversation) : '';
	};
	const memberCount = group => group?.participantCount || group?.participants?.length || 0;
	const visible = useMemo(
		() =>
			term
				? (groups || []).filter(group => foldWhatsAppSearchText(group.subject || '').includes(term))
				: groups || [],
		[groups, term],
	);
	const totalMembers = (groups || []).reduce((sum, group) => sum + memberCount(group), 0);
	const participants = selectedGroup?.participants || [];
	const admins = participants.filter(item => item.isAdmin || item.isSuperAdmin).length;
	const ownerDigits = String(selectedGroup?.ownerWaId || '')
		.replace(/@.*$/, '')
		.split(':')[0];
	const owner =
		(ownerDigits &&
			participants.find(item => String(item.waId || '').replace(/@.*$/, '').split(':')[0] === ownerDigits)) ||
		participants.find(item => item.isSuperAdmin);
	const resolveMember = useCallback(
		participant => {
			const phoneHint = String(participant.waId || '')
				.replace(/@.*$/, '')
				.split(':')[0]
				.replace(/\D/g, '');
			const fromInbox = (conversations || []).find(item => {
				if (item?.type === 'group') return false;
				const contactId = String(item?.contact?.waId || item?.providerChatId || '');
				const digits = String(item?.contact?.phoneNumber || '').replace(/\D/g, '');
				return (
					contactId === participant.waId ||
					(phoneHint && (digits === phoneHint || contactId.replace(/@.*$/, '').replace(/\D/g, '') === phoneHint))
				);
			});
			const title =
				String(participant.displayName || '').trim() ||
				String(fromInbox?.contact?.name || '').trim() ||
				(fromInbox ? conversationTitle(fromInbox) : '') ||
				(phoneHint ? `+${phoneHint}` : '') ||
				String(participant.waId || '—');
			const avatarSrc = fromInbox ? conversationAvatarUrl(fromInbox) : inboxAvatarForWaId(conversations, participant.waId);
			return { title, phoneHint, avatarSrc };
		},
		[conversations],
	);

	// The tab header steps aside for a pushed group page (wa-mobile.css). An attribute rather
	// than :has() on the shell, which was re-evaluated for every row inserted anywhere under it.
	const groupSelected = Boolean(selectedGroup);
	useEffect(() => {
		const shell = document.querySelector('.wa-mobile-shell');
		if (!shell || !groupSelected) return undefined;
		shell.setAttribute('data-grp-selected', '');
		return () => shell.removeAttribute('data-grp-selected');
	}, [groupSelected]);

	return (
		<div className={`wa-grp${selectedGroup ? ' has-selection' : ''}`}>
			<aside className="wa-grp-side">
				<header className="wa-grp-side__head">
					<div className="min-w-0">
						<h2 className="wa-grp-side__title">
							{t.groups}
							<span className="wa-grp-badge">{(groups || []).length}</span>
						</h2>
						<p className="wa-grp-side__sub">
							{ar
								? `${totalMembers.toLocaleString()} عضو في كل الجروبات`
								: `${totalMembers.toLocaleString()} members across all groups`}
						</p>
					</div>
					<button
						type="button"
						aria-label={t.refresh}
						title={t.refresh}
						onClick={onRefresh}
						className="wa-ui-icon-btn wa-grp-refresh"
					>
						<RefreshCw size={16} strokeWidth={2} />
					</button>
				</header>
				<div className="wa-grp-search-wrap">
					<label className="wa-dx__search">
						<Search size={16} strokeWidth={2.2} aria-hidden="true" />
						<input
							type="search"
							value={query}
							onChange={event => setQuery(event.target.value)}
							placeholder={ar ? 'ابحث عن جروب' : 'Search groups'}
							aria-label={ar ? 'ابحث عن جروب' : 'Search groups'}
						/>
					</label>
				</div>
				<div className="wa-grp-list wa-ui-scroll nice-scroll" role="listbox" aria-label={t.groups}>
					{visible.length ? (
						visible.map(group => {
							const active = selectedGroup?.id === group.id;
							const count = memberCount(group);
							return (
								<button
									type="button"
									key={group.id}
									role="option"
									aria-selected={active}
									onClick={() => onSelect(group)}
									className={`wa-grp-row${active ? ' is-active' : ''}`}
								>
									<Avatar label={group.subject} size={11} src={groupAvatar(group)} isGroup />
									<span className="wa-grp-row__copy">
										<span className="wa-grp-row__name wa-privacy-identity" dir="auto">
											{group.subject || (ar ? 'جروب بدون اسم' : 'Untitled group')}
										</span>
										<span className="wa-grp-row__sub">
											<Users size={12} strokeWidth={2.2} aria-hidden="true" />
											{count} {ar ? 'عضو' : count === 1 ? 'member' : 'members'}
										</span>
									</span>
									{group.conversationId ? null : (
										<span className="wa-grp-row__tag" title={ar ? 'مفيش شات محفوظ للجروب ده' : 'No saved chat for this group'}>
											{ar ? 'بدون شات' : 'No chat'}
										</span>
									)}
								</button>
							);
						})
					) : (
						<div className="wa-dx__empty">
							<Users size={22} strokeWidth={1.8} aria-hidden="true" />
							<p>{term ? (ar ? 'لا نتائج لهذا البحث' : 'No groups match your search') : t.noGroups}</p>
						</div>
					)}
				</div>
			</aside>

			<section className="wa-grp-main wa-ui-scroll nice-scroll">
				{/* Phones show the list and the details one at a time; this returns to the list. */}
				{selectedGroup && onCloseDetails ? (
					<div className="wa-grp-back-bar">
						<button type="button" className="wa-grp-back" onClick={onCloseDetails}>
							<ChevronLeft size={26} strokeWidth={2.4} className="rtl:rotate-180" aria-hidden="true" />
							{t.groups}
						</button>
						<span className="wa-grp-back-bar__title">{ar ? 'معلومات الجروب' : 'Group info'}</span>
					</div>
				) : null}
				{!selectedGroup ? (
					<div className="wa-grp-empty">
						<span className="wa-grp-empty__icon" aria-hidden="true">
							<Users size={28} strokeWidth={1.8} />
						</span>
						<h3>{t.groupDetails}</h3>
						<p>
							{ar
								? 'اختار جروب من القايمة عشان تشوف الأعضاء والمشرفين والوصف.'
								: 'Pick a group from the list to see its members, admins and description.'}
						</p>
					</div>
				) : (
					<>
						<div className="wa-grp-hero">
							<div className="wa-grp-hero__id">
								<Avatar label={selectedGroup.subject} size={16} src={groupAvatar(selectedGroup)} isGroup />
								<div className="min-w-0">
									<h2 className="wa-grp-hero__name wa-privacy-identity" dir="auto">
										{selectedGroup.subject}
									</h2>
									<p className="wa-grp-hero__meta">
										<span className="wa-gi__chip is-group">
											<Users size={13} strokeWidth={2.2} />
											{ar ? 'جروب' : 'Group'}
										</span>
										{memberCount(selectedGroup)} {ar ? 'عضو' : 'members'}
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => onOpenChat(selectedGroup)}
								disabled={!selectedGroup.conversationId}
								title={selectedGroup.conversationId ? undefined : ar ? 'مفيش شات محفوظ للجروب ده' : 'No saved chat for this group'}
								className="wa-ui-btn wa-ui-btn--primary"
							>
								<MessageCircle size={16} strokeWidth={2.2} />
								{t.openGroupChat}
							</button>
						</div>

						{loadingGroup ? (
							<div className="wa-acc-card wa-dx__loading">
								<Loader2 size={24} className="animate-spin" />
							</div>
						) : (
							<>
								<dl className="wa-grp-stats">
									<div className="wa-acc-detail">
										<dt>
											<span className="wa-acc-detail__icon is-ok">
												<Users size={16} />
											</span>
											{ar ? 'الأعضاء' : 'Members'}
										</dt>
										<dd>{memberCount(selectedGroup).toLocaleString()}</dd>
									</div>
									<div className="wa-acc-detail">
										<dt>
											<span className="wa-acc-detail__icon">
												<ShieldCheck size={16} />
											</span>
											{t.groupAdmins}
										</dt>
										<dd>{participants.length ? admins : '—'}</dd>
									</div>
									<div className="wa-acc-detail">
										<dt>
											<span className="wa-acc-detail__icon">
												<Star size={16} />
											</span>
											{t.groupOwner}
										</dt>
										<dd className="wa-privacy-identity" dir="auto" title={ownerDigits ? `+${ownerDigits}` : undefined}>
											{owner ? resolveMember(owner).title : ownerDigits ? `+${ownerDigits}` : '—'}
										</dd>
									</div>
								</dl>

								<div className="wa-acc-card">
									<h3 className="wa-acc-card__title">{t.groupDescription}</h3>
									{selectedGroup.description ? (
										<p className="wa-grp-desc" dir="auto">
											{selectedGroup.description}
										</p>
									) : (
										<p className="wa-grp-desc is-empty">{ar ? 'مفيش وصف للجروب ده.' : 'This group has no description.'}</p>
									)}
								</div>

								<div className="wa-acc-card">
									<header className="wa-gi__members-head">
										<h4>
											<Users size={16} strokeWidth={2.2} />
											{t.groupParticipants}
										</h4>
										{participants.length ? <span className="wa-gi__count">{participants.length}</span> : null}
									</header>
									<WaInfoMemberList participants={participants} locale={locale} resolve={resolveMember} />
								</div>
							</>
						)}
					</>
				)}
			</section>
		</div>
	);
}
