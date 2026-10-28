/**
 * Rail icons for the core tabs. Outline when idle, a soft fill when active (the way
 * WhatsApp Desktop marks the open tab), drawn on one 24px grid so they read as a set.
 */

function RailSvg({ size = 22, children }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.9}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			focusable="false"
		>
			{children}
		</svg>
	);
}

const fillFor = active => (active ? 'currentColor' : 'none');
const fillOpacity = active => (active ? 0.18 : 0);

/** Chats: a speech bubble with a typing row. */
export function RailChatsIcon({ active = false, size }) {
	return (
		<RailSvg size={size}>
			<path
				d="M12 3.6c-4.75 0-8.6 3.38-8.6 7.55 0 2.15 1.03 4.1 2.68 5.47l-.62 3.28 3.4-1.66c.99.3 2.05.46 3.14.46 4.75 0 8.6-3.38 8.6-7.55S16.75 3.6 12 3.6Z"
				fill={fillFor(active)}
				fillOpacity={fillOpacity(active)}
			/>
			<circle cx="8.4" cy="11.2" r="1.05" fill="currentColor" stroke="none" />
			<circle cx="12" cy="11.2" r="1.05" fill="currentColor" stroke="none" />
			<circle cx="15.6" cy="11.2" r="1.05" fill="currentColor" stroke="none" />
		</RailSvg>
	);
}

/** Online: a person with a live green signal. */
export function RailOnlineIcon({ active = false, size }) {
	return (
		<RailSvg size={size}>
			<circle cx="9.5" cy="8.2" r="3.6" fill={fillFor(active)} fillOpacity={fillOpacity(active)} />
			<path
				d="M3.2 19.6c.55-3.4 3.15-5.75 6.3-5.75s5.75 2.35 6.3 5.75"
				fill={fillFor(active)}
				fillOpacity={fillOpacity(active)}
			/>
			<path d="M18.1 4.3a4.6 4.6 0 0 1 2.7 2.7" strokeWidth={1.7} />
			<circle cx="17.6" cy="8.7" r="2.15" fill="#25d366" stroke="none" />
		</RailSvg>
	);
}

/** Updates: the WhatsApp status ring — a broken circle around a dot. */
export function RailUpdatesIcon({ active = false, size }) {
	return (
		<RailSvg size={size}>
			<path d="M12 3.2a8.8 8.8 0 0 1 7.62 4.4" />
			<path d="M20.75 11.1a8.8 8.8 0 0 1-2.72 7.32" />
			<path d="M15.6 20.03a8.8 8.8 0 0 1-7.2 0" />
			<path d="M5.97 18.42A8.8 8.8 0 0 1 3.25 11.1" />
			<path d="M4.38 7.6A8.8 8.8 0 0 1 9.4 3.6" />
			<circle cx="12" cy="12" r="3.9" fill="currentColor" fillOpacity={active ? 1 : 0.22} stroke={active ? 'none' : 'currentColor'} />
		</RailSvg>
	);
}

/** Reading: an open book with a bookmark ribbon. */
export function RailReadingIcon({ active = false, size }) {
	return (
		<RailSvg size={size}>
			<path
				d="M12 6.6C10.4 5.35 8.1 4.6 5.6 4.6H3.4v13.1h2.2c2.4 0 4.75.72 6.4 2 1.65-1.28 4-2 6.4-2h2.2V4.6h-2.2c-2.5 0-4.8.75-6.4 2Z"
				fill={fillFor(active)}
				fillOpacity={fillOpacity(active)}
			/>
			<path d="M12 6.6v13.1" />
			<path d="M15.4 5.05v5.1l1.55-1.05 1.55 1.05V4.65" fill={active ? 'currentColor' : 'none'} />
		</RailSvg>
	);
}
