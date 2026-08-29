'use client';

const CHANNEL = 'so7ba-whatsapp-tab-v1';
const HEARTBEAT_MS = 4000;
const STALE_MS = 10000;

/**
 * Elect a single browser tab as notification/leader to avoid duplicate desktop
 * notifications when multiple WhatsApp workspace tabs are open.
 */
export function createWhatsAppTabLeader(options = {}) {
	const id = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
	let isLeader = false;
	let lastLeaderSeen = 0;
	let channel = null;
	let heartbeatTimer = null;
	const onChange = typeof options.onChange === 'function' ? options.onChange : () => {};

	const publish = (type) => {
		try {
			channel?.postMessage({ type, id, at: Date.now() });
		} catch {
			/* ignore */
		}
	};

	const becomeLeader = () => {
		if (isLeader) return;
		isLeader = true;
		onChange(true);
		publish('leader');
	};

	const resign = () => {
		if (!isLeader) return;
		isLeader = false;
		onChange(false);
	};

	const tick = () => {
		const now = Date.now();
		if (isLeader) {
			publish('heartbeat');
			return;
		}
		if (!lastLeaderSeen || now - lastLeaderSeen > STALE_MS) {
			becomeLeader();
		}
	};

	try {
		if (typeof BroadcastChannel !== 'undefined') {
			channel = new BroadcastChannel(CHANNEL);
			channel.onmessage = (event) => {
				const data = event?.data || {};
				if (!data?.id || data.id === id) return;
				if (data.type === 'leader' || data.type === 'heartbeat') {
					lastLeaderSeen = Date.now();
					if (isLeader && String(data.id) < id) {
						resign();
					}
				}
			};
		}
	} catch {
		channel = null;
	}

	becomeLeader();
	heartbeatTimer = setInterval(tick, HEARTBEAT_MS);

	return {
		get isLeader() {
			return isLeader || !channel;
		},
		dispose() {
			if (heartbeatTimer) clearInterval(heartbeatTimer);
			heartbeatTimer = null;
			if (isLeader) publish('resign');
			try {
				channel?.close();
			} catch {
				/* ignore */
			}
			channel = null;
		},
	};
}
