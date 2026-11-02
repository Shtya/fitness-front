import api from '@/utils/axios';

/**
 * "Rest is over" notification while the user is in another app.
 *
 * The page cannot alert from the background (the phone freezes it), so the server sends a Web
 * Push at the end time (POST /notifications/rest-timer). Push needs the installed app on iOS
 * (16.4+) and a granted notification permission; without them the timer still works and
 * rings when the user comes back.
 */

let subscribed = null;

function urlBase64ToBytes(base64) {
	const padding = '='.repeat((4 - (base64.length % 4)) % 4);
	const binary = window.atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
	return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function pushSupported() {
	return (
		typeof window !== 'undefined' &&
		process.env.NODE_ENV === 'production' &&
		'serviceWorker' in navigator &&
		'PushManager' in window &&
		'Notification' in window
	);
}

/**
 * Asks for permission (must run inside the Start tap on iOS) and makes sure this device's push
 * subscription is on the server. Safe to call on every start: it does the work once per page.
 */
export function ensureRestPush() {
	if (!pushSupported()) return Promise.resolve(false);
	if (subscribed) return subscribed;
	// Requested synchronously, while the tap still counts as a user gesture.
	const permission =
		Notification.permission === 'default' ? Notification.requestPermission() : Promise.resolve(Notification.permission);
	subscribed = (async () => {
		if ((await permission) !== 'granted') return false;
		const registration = await Promise.race([
			navigator.serviceWorker.ready,
			new Promise((_, reject) => setTimeout(() => reject(new Error('no worker')), 8000)),
		]);
		let subscription = await registration.pushManager.getSubscription();
		if (!subscription) {
			const { data } = await api.get('/reminders/push/vapid-key');
			if (!data?.publicKey) return false;
			subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToBytes(data.publicKey),
			});
		}
		await api.post('/reminders/push/subscribe', subscription.toJSON());
		return true;
	})().catch(() => {
		subscribed = null;
		return false;
	});
	return subscribed;
}

export async function scheduleRestPush(endAt, { title, body } = {}) {
	if (!endAt || !(await ensureRestPush())) return;
	try {
		await api.post('/notifications/rest-timer', { endsAt: new Date(endAt).toISOString(), title, body });
	} catch {
		/* offline: the in-app chime still rings when the user comes back */
	}
}

export function cancelRestPush() {
	if (!pushSupported() || Notification.permission !== 'granted') return;
	api.delete('/notifications/rest-timer').catch(() => {});
}
