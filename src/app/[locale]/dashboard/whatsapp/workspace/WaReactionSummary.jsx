'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatStoryViewTime } from '../wa-story-interactions';
import { Avatar } from './WaAvatar';

/**
 * WhatsApp-style reaction pill under a bubble: the top emojis + a total. Clicking it
 * opens "who reacted" with a tab per emoji; your own row removes your reaction.
 */
export function WaReactionSummary({ reactions, mine, locale, resolve, disabled = false, onRemoveMine }) {
	const ar = locale === 'ar';
	const [open, setOpen] = useState(false);
	const [tab, setTab] = useState('all');
	const [position, setPosition] = useState(null);
	const pillRef = useRef(null);
	const popRef = useRef(null);

	const groups = useMemo(() => {
		const map = new Map();
		for (const reaction of reactions) {
			if (!map.has(reaction.emoji)) map.set(reaction.emoji, []);
			map.get(reaction.emoji).push(reaction);
		}
		return [...map.entries()]
			.map(([emoji, list]) => ({ emoji, list }))
			.sort((a, b) => b.list.length - a.list.length);
	}, [reactions]);
	const people = useMemo(
		() =>
			reactions
				.map(reaction => ({ ...reaction, person: resolve(reaction) }))
				// You first, then newest first, like WhatsApp.
				.sort((a, b) => {
					if (a.actorKey === 'me') return -1;
					if (b.actorKey === 'me') return 1;
					return new Date(b.reactedAt || 0).getTime() - new Date(a.reactedAt || 0).getTime();
				}),
		[reactions, resolve],
	);
	const total = reactions.length;
	const iReacted = reactions.some(reaction => reaction.actorKey === 'me');
	const visiblePeople = tab === 'all' ? people : people.filter(item => item.emoji === tab);
	const hoverTitle = people
		.slice(0, 8)
		.map(item => `${item.emoji} ${item.person.name}`)
		.join('\n') + (people.length > 8 ? `\n+${people.length - 8}` : '');

	useEffect(() => {
		if (!open) return undefined;
		const place = () => {
			const rect = pillRef.current?.getBoundingClientRect();
			if (!rect) return;
			const width = Math.min(300, window.innerWidth - 16);
			const wanted = Math.min(380, 60 + people.length * 62);
			const below = window.innerHeight - rect.bottom - 12;
			const above = rect.top - 12;
			let left = mine ? rect.right - width : rect.left;
			left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
			if (below >= wanted || below >= above) {
				setPosition({ top: rect.bottom + 6, left, width, maxHeight: Math.max(160, Math.min(360, below)) });
			} else {
				setPosition({
					bottom: window.innerHeight - rect.top + 6,
					left,
					width,
					maxHeight: Math.max(160, Math.min(360, above)),
				});
			}
		};
		place();
		const onPointer = event => {
			if (pillRef.current?.contains(event.target) || popRef.current?.contains(event.target)) return;
			setOpen(false);
		};
		const onKey = event => {
			if (event.key === 'Escape') setOpen(false);
		};
		document.addEventListener('pointerdown', onPointer);
		document.addEventListener('keydown', onKey);
		window.addEventListener('resize', place);
		window.addEventListener('scroll', place, true);
		return () => {
			document.removeEventListener('pointerdown', onPointer);
			document.removeEventListener('keydown', onKey);
			window.removeEventListener('resize', place);
			window.removeEventListener('scroll', place, true);
		};
	}, [open, mine, people.length]);

	useEffect(() => {
		if (tab !== 'all' && !groups.some(group => group.emoji === tab)) setTab('all');
	}, [groups, tab]);

	if (!total) return null;

	return (
		<div className={`wa-message-reactions wa-rx ${mine ? 'is-outgoing' : 'is-incoming'}`}>
			<button
				ref={pillRef}
				type="button"
				className={`wa-rx__pill${iReacted ? ' is-mine' : ''}${open ? ' is-open' : ''}`}
				title={hoverTitle}
				aria-haspopup="dialog"
				aria-expanded={open}
				aria-label={ar ? `${total} تفاعل، اعرض مين تفاعل` : `${total} reactions, see who reacted`}
				onPointerDown={event => event.stopPropagation()}
				onClick={event => {
					event.preventDefault();
					event.stopPropagation();
					setTab('all');
					setOpen(current => !current);
				}}
			>
				<span className="wa-rx__emojis" aria-hidden="true">
					{groups.slice(0, 3).map(group => (
						<span key={group.emoji} className="wa-rx__emoji">
							{group.emoji}
						</span>
					))}
				</span>
				{total > 1 ? <span className="wa-rx__total">{total}</span> : null}
			</button>
			{open && position && typeof document !== 'undefined'
				? createPortal(
						<div
							ref={popRef}
							className="wa-rx-pop"
							role="dialog"
							aria-label={ar ? 'التفاعلات' : 'Reactions'}
							dir={ar ? 'rtl' : 'ltr'}
							style={{
								...(position.bottom != null ? { bottom: position.bottom } : { top: position.top }),
								left: position.left,
								width: position.width,
								maxHeight: position.maxHeight,
							}}
							onPointerDown={event => event.stopPropagation()}
							onClick={event => event.stopPropagation()}
						>
							<div className="wa-rx-pop__tabs" role="tablist">
								<button
									type="button"
									role="tab"
									aria-selected={tab === 'all'}
									className={`wa-rx-pop__tab${tab === 'all' ? ' is-active' : ''}`}
									onClick={() => setTab('all')}
								>
									{ar ? 'الكل' : 'All'}
									<span>{total}</span>
								</button>
								{groups.map(group => (
									<button
										key={group.emoji}
										type="button"
										role="tab"
										aria-selected={tab === group.emoji}
										className={`wa-rx-pop__tab${tab === group.emoji ? ' is-active' : ''}`}
										onClick={() => setTab(group.emoji)}
									>
										<span className="wa-rx-pop__tab-emoji">{group.emoji}</span>
										<span>{group.list.length}</span>
									</button>
								))}
							</div>
							<ul className="wa-rx-pop__list wa-ui-scroll nice-scroll">
								{visiblePeople.map(item => {
									const isMe = item.actorKey === 'me';
									const reactedLabel = formatStoryViewTime(item.reactedAt, locale);
									const row = (
										<>
											<Avatar label={item.person.name} size={9} src={item.person.avatar || ''} />
											<span className="wa-rx-pop__who">
												<span className="wa-rx-pop__name wa-privacy-identity" dir="auto">
													{item.person.name}
												</span>
												<span className="wa-rx-pop__sub" dir={item.person.sub && !isMe ? 'ltr' : undefined}>
													{isMe
														? ar
															? 'اضغط عشان تشيل تفاعلك'
															: 'Tap to remove'
														: item.person.sub || ''}
												</span>
												{reactedLabel ? (
													<time
														className="wa-rx-pop__time"
														dateTime={new Date(item.reactedAt).toISOString()}
														title={new Date(item.reactedAt).toLocaleString(ar ? 'ar-EG' : 'en-GB')}
													>
														{ar ? `تفاعل ${reactedLabel}` : `Reacted ${reactedLabel}`}
													</time>
												) : null}
											</span>
											<span className="wa-rx-pop__emoji" aria-hidden="true">
												{item.emoji}
											</span>
										</>
									);
									return (
										<li key={item.actorKey}>
											{isMe ? (
												<button
													type="button"
													className="wa-rx-pop__row is-me"
													disabled={disabled}
													onClick={() => {
														setOpen(false);
														onRemoveMine?.(item.emoji);
													}}
												>
													{row}
												</button>
											) : (
												<div className="wa-rx-pop__row">{row}</div>
											)}
										</li>
									);
								})}
							</ul>
						</div>,
						document.body,
					)
				: null}
		</div>
	);
}
