'use client';

import { useEffect } from 'react';

const WHATSAPP_ICON = '/icons/whatsapp.svg';

/**
 * Swaps the browser tab favicon while WhatsApp is open (client navigations included).
 */
export default function WhatsAppTabIcon() {
	useEffect(() => {
		const head = document.head;
		const existing = Array.from(
			head.querySelectorAll("link[rel='icon'], link[rel='shortcut icon']"),
		);
		const snapshot = existing.map(link => ({
			el: link,
			href: link.getAttribute('href'),
			type: link.getAttribute('type'),
			sizes: link.getAttribute('sizes'),
		}));

		let link = existing[0];
		if (!link) {
			link = document.createElement('link');
			link.setAttribute('rel', 'icon');
			head.appendChild(link);
		}
		link.setAttribute('href', WHATSAPP_ICON);
		link.setAttribute('type', 'image/svg+xml');
		link.removeAttribute('sizes');

		existing.slice(1).forEach(extra => {
			extra.setAttribute('data-wa-favicon-hidden', '1');
			extra.remove();
		});

		return () => {
			snapshot.forEach(({ el, href, type, sizes }) => {
				if (!head.contains(el)) head.appendChild(el);
				if (href != null) el.setAttribute('href', href);
				else el.removeAttribute('href');
				if (type != null) el.setAttribute('type', type);
				else el.removeAttribute('type');
				if (sizes != null) el.setAttribute('sizes', sizes);
				else el.removeAttribute('sizes');
			});
			if (!snapshot.length && head.contains(link)) {
				link.remove();
			}
		};
	}, []);

	return null;
}
