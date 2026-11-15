'use client';

import api from '@/utils/axios';

const AVATAR_PLACEHOLDER_STYLES = [
	{
		background: '#FFE4E8',
		color: '#A64D63',
	},
	{
		background: '#DDF4FF',
		color: '#317DA7',
	},
	{
		background: '#E8FFE3',
		color: '#4F8D47',
	},
];

/**
 * Up to two letters from a contact name, so people are told apart before any photo loads.
 * Phone-number-only titles keep the silhouette: digits identify no one at a glance.
 */
function avatarInitials(label = '') {
	const words = String(label || '')
		.trim()
		.split(/\s+/)
		.map(word => word.replace(/^[^\p{L}]+/u, ''))
		.filter(word => /^\p{L}/u.test(word));
	if (!words.length) return '';
	// Two isolated Arabic letters read like a stray word, so Arabic names get one.
	const count = /^\p{Script=Arabic}/u.test(words[0]) ? 1 : 2;
	const letters = words.slice(0, count).map(word => Array.from(word)[0]);
	return letters.join('').toLocaleUpperCase();
}

function avatarPlaceholderStyle(seed = '') {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
	}
	return AVATAR_PLACEHOLDER_STYLES[hash % AVATAR_PLACEHOLDER_STYLES.length];
}

const waAvatarRefreshInFlight = new Set();

function requestWhatsAppAvatarRefresh(conversationId, onFreshUrl) {
	const id = String(conversationId || '').trim();
	if (!id || waAvatarRefreshInFlight.has(id)) return;
	waAvatarRefreshInFlight.add(id);
	api
		.post(`/whatsapp/conversations/${id}/avatar/refresh`)
		.then(({ data }) => {
			const next = String(data?.avatarUrl || '').trim();
			if (next) onFreshUrl?.(next);
		})
		.catch(() => undefined)
		.finally(() => {
			setTimeout(() => waAvatarRefreshInFlight.delete(id), 12_000);
		});
}

export function Avatar({
	label = '?',
	size = 10,
	className = '',
	isGroup = false,
	src = '',
	videoSrc = '',
	priority = false,
	conversationId = '',
	onAvatarRefreshed,
}) {
	const placeholderStyle = avatarPlaceholderStyle(label);
	const initials = isGroup ? '' : avatarInitials(label);
	return (
		<div
			className={`wa-avatar-3d relative grid shrink-0 place-items-center overflow-hidden rounded-full ring-2 ring-white dark:ring-slate-900 ${className}`}
			style={{
				width: `${size * 4}px`,
				height: `${size * 4}px`,
				fontSize: `${size * 1.4}px`,
				...placeholderStyle,
			}}
		>
			{isGroup ? (
				<svg width="52%" height="52%" viewBox="0 0 20 20" aria-hidden="true">
					<path fill="currentColor" d="M7 8a3 3 0 1 0 0-6a3 3 0 0 0 0 6m7.5 1a2.5 2.5 0 1 0 0-5a2.5 2.5 0 0 0 0 5M1.615 16.428a1.22 1.22 0 0 1-.569-1.175a6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.95 9.95 0 0 1 7 18a9.95 9.95 0 0 1-5.385-1.572M14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755a4.5 4.5 0 0 1 5.874 2.636a.82.82 0 0 1-.36.98A7.47 7.47 0 0 1 14.5 16" />
				</svg>
			) : initials ? (
				<span className="wa-avatar-initials" aria-hidden="true">
					{initials}
				</span>
			) : (
				<svg width="52%" height="52%" viewBox="0 0 24 24" aria-hidden="true">
					<path fill="currentColor" d="M19.652 19.405c.552-.115.882-.693.607-1.187c-.606-1.087-1.56-2.043-2.78-2.771C15.907 14.509 13.98 14 12 14s-3.907.508-5.479 1.447c-1.22.728-2.174 1.684-2.78 2.771c-.275.494.055 1.072.607 1.187a37.5 37.5 0 0 0 15.303 0" />
					<circle cx="12" cy="8" r="5" fill="currentColor" />
				</svg>
			)}
			{src && (
				<img
					src={src}
					alt=""
					loading={priority ? 'eager' : 'lazy'}
					decoding={priority ? 'sync' : 'async'}
					fetchPriority={priority ? 'high' : 'auto'}
					referrerPolicy="no-referrer"
					onError={event => {
						event.currentTarget.style.display = 'none';
						if (!conversationId) return;
						requestWhatsAppAvatarRefresh(conversationId, nextUrl => {
							onAvatarRefreshed?.(nextUrl);
						});
					}}
					className="absolute inset-0 h-full w-full rounded-full object-cover"
				/>
			)}
			{videoSrc && (
				<video
					src={`${videoSrc}#t=0.001`}
					muted
					playsInline
					preload="metadata"
					className="absolute inset-0 h-full w-full rounded-full object-cover"
				/>
			)}
		</div>
	);
}
