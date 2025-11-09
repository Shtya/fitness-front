
export const WEEK_DAYS = [
	{ key: "SU", label: "sun" },
	{ key: "MO", label: "mon" },
	{ key: "TU", label: "tue" },
	{ key: "WE", label: "wed" },
	{ key: "TH", label: "thu" },
	{ key: "FR", label: "fri" },
	{ key: "SA", label: "sat" },
];

export const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

export const SOUND_SAMPLES = {
	chime: "data:audio/mp3;base64,//uQZAAA...",
	drop: "data:audio/mp3;base64,//uQZAAA...",
	soft: "data:audio/mp3;base64,//uQZAAA...",
};

export function safeT(t, key, fallback) {
	try {
		const res = t(key, { fallback });
		return res || fallback || key;
	} catch {
		return fallback || key;
	}
}

export function toISODateOnly(input) {
	const d = new Date(input);
	if (Number.isNaN(d.getTime())) return null;
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}
export function toISODate(d) {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}
export function sameDay(a, b) {
	return a.getFullYear() === b.getFullYear()
		&& a.getMonth() === b.getMonth()
		&& a.getDate() === b.getDate();
}
export function plusDays(d, n) {
	const x = new Date(d);
	x.setDate(x.getDate() + n);
	return x;
}
export function humanDateTime(d) {
	try {
		return new Intl.DateTimeFormat("ar-EG", {
			dateStyle: "medium",
			timeStyle: "short",
			hourCycle: "h12",
		}).format(d);
	} catch {
		return d.toLocaleString();
	}
}
export function formatTime12(hhmm) {
	if (!hhmm) return "—";
	const [h0, m] = hhmm.split(":").map(Number);
	const h12 = ((h0 + 11) % 12) + 1;
	const ampm = h0 < 12 ? "AM" : "PM";
	return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}
export function defaultSettings() {
	return {
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Cairo",
		city: "Cairo",
		country: "Egypt",
		defaultSnooze: 10,
		quietHours: { start: "10:00 PM", end: "07:00 AM" },
		priorityDefault: "normal",
		soundDefault: "chime",
	};
}
export function defaultSchedule() {
	return {
		mode: "daily",
		times: ["08:00"],
		daysOfWeek: [],
		interval: null,
		rrule: "",
		exdates: [],
		prayer: null,
		startDate: toISODate(new Date()),
		endDate: null,
		timezone: "Africa/Cairo",
	};
}
export function generateDefaultTitle() {
	const seed = Math.floor(Date.now() / 1000).toString(36).toUpperCase();
	return `Alert ${seed.slice(-4)}`;
}
export function defaultReminder(patch = {}) {
	const now = new Date().toISOString();
	return {
		id: null,
		type: "custom",
		title: generateDefaultTitle(),
		notes: "",
		schedule: defaultSchedule(),
		sound: {
			id: "chime",
			name: "Chime",
			previewUrl: SOUND_SAMPLES.chime,
			volume: 0.8,
		},
		priority: "normal",
		metrics: { streak: 0, doneCount: 0, skipCount: 0, lastAckAt: null },
		active: true,
		createdAt: now,
		updatedAt: now,
		...patch,
	};
}
export function normalizeSchedule(s) {
	const base = defaultSchedule();
	const merged = { ...base, ...(s || {}) };
	if (!Array.isArray(merged.times) || merged.times.length === 0) merged.times = ["08:00"];
	if (merged.mode === "prayer" && !merged.prayer)
		merged.prayer = { name: "Fajr", offsetMin: 10, direction: "before" };
	if (!merged.startDate) merged.startDate = base.startDate;
	return merged;
}
function isHHmm(s) { return typeof s === "string" && /^\d{2}:\d{2}$/.test(s); }

// -------------------------------
// API mapping
// -------------------------------
import api from "@/utils/axios";

export function uiToApiReminder(ui) {
	const s = ui?.schedule || {};
	const times = (Array.isArray(s.times) ? s.times : [])
		.map((t) => String(t).trim())
		.filter(isHHmm);

	const startDate = toISODateOnly(s.startDate) || toISODateOnly(new Date());

	return {
		title: ui.title?.trim() || "",
		description: ui.notes || "",
		type: "custom",
		isActive: ui.active ?? true,
		isCompleted: !!ui.isCompleted,
		reminderTime:
			s.mode === "once" && startDate && times[0]
				? new Date(`${startDate}T${times[0]}:00`).toISOString()
				: undefined,
		soundSettings: {
			id: ui?.sound?.id || "chime",
			volume: ui?.sound?.volume ?? 0.8,
		},
		schedule: {
			mode: s.mode || "daily",
			times: times.length ? times : ["08:00"],
			daysOfWeek: s.daysOfWeek || [],
			interval: s.interval || null,
			prayer: s.prayer || null,
			startDate,
			endDate: s.endDate ? toISODateOnly(s.endDate) : null,
			timezone: s.timezone || "Africa/Cairo",
			exdates: Array.isArray(s.exdates) ? s.exdates : [],
			rrule: s.rrule || "",
		},
	};
}

export function apiToUiReminder(apiRem) {
	const soundId = apiRem?.soundSettings?.id || "chime";
	const soundName =
		soundId === "drop" ? "Water Drop" : soundId === "soft" ? "Soft Bell" : "Chime";
	return {
		id: apiRem.id,
		title: apiRem.title,
		notes: apiRem.description || "",
		type: "custom",
		active: apiRem.isActive,
		isCompleted: apiRem.isCompleted,
		sound: {
			id: soundId,
			name: soundName,
			previewUrl: null,
			volume: Number.isFinite(apiRem?.soundSettings?.volume)
				? apiRem.soundSettings.volume
				: 0.8,
		},
		schedule: {
			mode: apiRem.schedule?.mode || "daily",
			times: apiRem.schedule?.times || ["08:00"],
			daysOfWeek: apiRem.schedule?.daysOfWeek || [],
			interval: apiRem.schedule?.interval || null,
			prayer: apiRem.schedule?.prayer || null,
			startDate: apiRem.schedule?.startDate,
			endDate: apiRem.schedule?.endDate || null,
			timezone: apiRem.schedule?.timezone || "Africa/Cairo",
			exdates: apiRem.schedule?.exdates || [],
			rrule: apiRem.schedule?.rrule || "",
		},
		metrics: apiRem.metrics || { streak: 0, doneCount: 0, skipCount: 0, lastAckAt: null },
		createdAt: apiRem.createdAt,
		updatedAt: apiRem.updatedAt,
	};
}

// Endpoints
export async function listReminders(filters = {}) {
	const params = {};
	if (filters.isCompleted !== undefined) params.completed = !!filters.isCompleted;
	if (filters.isActive !== undefined) params.active = !!filters.isActive;
	if (filters.type) params.type = filters.type;
	if (filters.fromDate) params.fromDate = filters.fromDate;
	if (filters.toDate) params.toDate = filters.toDate;
	const { data } = await api.get("/reminders", { params });
	return (data || []).map(apiToUiReminder);
}
export async function createReminderApi(uiReminder) {
	const payload = uiToApiReminder(uiReminder);
	const { data } = await api.post("/reminders", payload);
	return apiToUiReminder(data);
}
export async function updateReminderApi(id, uiPatch) {
	const payload = uiToApiReminder(uiPatch);
	const { data } = await api.put(`/reminders/${id}`, payload);
	return apiToUiReminder(data);
}
export async function deleteReminderApi(id) { await api.delete(`/reminders/${id}`); }
export async function toggleActiveApi(id) {
	const { data } = await api.put(`/reminders/${id}/toggle`);
	return apiToUiReminder(data);
}
export async function snoozeReminderApi(id, minutes) {
	const { data } = await api.put(`/reminders/${id}/snooze`, { minutes });
	return apiToUiReminder(data);
}
export async function markCompletedApi(id) {
	const { data } = await api.put(`/reminders/${id}/complete`);
	return apiToUiReminder(data);
}
export async function getUserSettingsApi() {
	const { data } = await api.get("/reminders/settings/user");
	return data;
}
export async function updateUserSettingsApi(patch) {
	const { data } = await api.put("/reminders/settings/user", patch);
	return data;
}
export async function getVapidPublicKey() {
	const { data } = await api.get("/reminders/push/vapid-key");
	return data?.publicKey;
}
export async function subscribePushOnServer(subscription) {
	const { data } = await api.post("/reminders/push/subscribe", subscription);
	return data;
}
export async function sendReminderNow() {
	const payload = {
		title: "اختبار الإشعارات",
		body: "دي رسالة تجريبية من نفس الموديول",
		icon: "/icons/bell.png",
		url: "/app/reminders",
		requireInteraction: true,
		data: { source: "ui-test" }
	};
	const { data } = await api.post("/reminders/send-now", payload);
	return data;
}

// -------------------------------
// Web Push + SW helpers
// -------------------------------
export async function ensureServiceWorker() {
	if (!("serviceWorker" in navigator)) return null;
	const swExists = await fetch("/sw.js").then((r) => r.ok).catch(() => false);
	if (!swExists) return null;
	const reg = await navigator.serviceWorker.register("/sw.js");
	return reg;
}

export function urlBase64ToUint8Array(base64String) {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
	const raw = typeof window !== "undefined"
		? window.atob(base64)
		: Buffer.from(base64, "base64").toString("binary");
	const arr = new Uint8Array(raw.length);
	for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
	return arr;
}

function toBase64Url(bytes) {
	let str = "";
	const arr = new Uint8Array(bytes);
	for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i]);
	const b64 = (typeof window !== 'undefined'
		? window.btoa(str)
		: Buffer.from(str, 'binary').toString('base64'));
	return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function enableWebPush() {
	if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
	const reg = await ensureServiceWorker();
	if (!reg) throw new Error("Service worker missing. Add /public/sw.js.");
	const vapidKey = await getVapidPublicKey();
	if (!vapidKey) throw new Error("Missing VAPID public key from server.");

	const sub = await reg.pushManager.subscribe({
		userVisibleOnly: true,
		applicationServerKey: urlBase64ToUint8Array(vapidKey),
	});

	await subscribePushOnServer({
		endpoint: sub.endpoint,
		keys: {
			p256dh: toBase64Url(sub.getKey('p256dh')),
			auth: toBase64Url(sub.getKey('auth')),
		},
	});

	return sub;
}

// -------------------------------
// Scheduling helpers
// -------------------------------
function nextTimeTodayOrFuture(s, from) {
	const todayISO = toISODate(from);
	const times = (s.times || [])
		.map((t) => new Date(`${todayISO}T${t}:00`))
		.sort((a, b) => a - b);
	for (const t of times) if (t >= from) return t;
	return null;
}
function firstTimeOnDate(s, date) {
	const iso = toISODate(date);
	const t = (s.times && s.times[0]) || "08:00";
	return new Date(`${iso}T${t}:00`);
}
function intervalToMs(n, unit = "hour") {
	const nn = Number(n) || 1;
	if (unit === "minute") return nn * 60 * 1000;
	if (unit === "day") return nn * 24 * 60 * 60 * 1000;
	return nn * 60 * 60 * 1000;
}

export function computeNextOccurrence(rem, settings) {
	if (!rem?.active) return null;
	const s = rem.schedule || defaultSchedule();
	const now = new Date();
	const start = s.startDate ? new Date(`${s.startDate}T00:00:00`) : new Date();
	const end = s.endDate ? new Date(`${s.endDate}T23:59:59`) : null;
	if (end && now > end) return null;

	const isExcluded = (d) =>
		(s.exdates || []).some((x) => Math.abs(new Date(x).getTime() - d.getTime()) < 60 * 1000);

	if (s.mode === "once") {
		const first = firstTimeOnDate(s, start);
		return first && first >= now ? first : null;
	}
	if (s.mode === "daily" || s.mode === "monthly") {
		const todayNext = nextTimeTodayOrFuture(s, now);
		let candidate = todayNext || firstTimeOnDate(s, plusDays(now, 1));
		if (!candidate) return null;
		if (isExcluded(candidate)) return plusDays(candidate, 1);
		return candidate;
	}
	if (s.mode === "weekly") {
		for (let offset = 0; offset < 21; offset++) {
			const d = plusDays(now, offset);
			const dayCode = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][d.getDay()];
			if ((s.daysOfWeek || []).includes(dayCode)) {
				const candidate = offset === 0 ? nextTimeTodayOrFuture(s, now) : firstTimeOnDate(s, d);
				if (candidate && !isExcluded(candidate)) return candidate;
			}
		}
		return null;
	}
	if (s.mode === "interval" && s.interval) {
		const base = new Date(`${s.startDate || toISODate(new Date())}T${(s.times && s.times[0]) || "08:00"}:00`);
		if (now <= base) return base;
		const ms = intervalToMs(s.interval.every, s.interval.unit);
		const elapsed = now.getTime() - base.getTime();
		const steps = Math.ceil(elapsed / ms);
		const candidate = new Date(base.getTime() + steps * ms);
		if (isExcluded(candidate)) return new Date(candidate.getTime() + ms);
		return candidate;
	}
	return null;
}

// Prayer helpers (client-only; simple fetch)
export async function fetchTodayPrayerTimes(settings) {
	const d = new Date();
	const cacheKey = `pt_${settings.city}_${settings.country}_${toISODate(d)}`;
	const cached = typeof window !== "undefined" ? localStorage.getItem(cacheKey) : null;
	if (cached) return JSON.parse(cached);
	const { city, country } = settings;
	const dateStr = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
	const url = `https://api.aladhan.com/v1/timingsByCity/${dateStr}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=5`;
	const res = await fetch(url);
	const json = await res.json();
	const t = json?.data?.timings || {};
	const map = { Fajr: t.Fajr, Dhuhr: t.Dhuhr, Asr: t.Asr, Maghrib: t.Maghrib, Isha: t.Isha };
	localStorage.setItem(cacheKey, JSON.stringify(map));
	return map;
}
export async function getPrayerDateTime(prayerName, dateObj, settings) {
	const d = dateObj;
	const dateStr = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
	const cacheKey = `pt_${settings.city}_${settings.country}_${dateStr}`;
	let map = typeof window !== "undefined" ? localStorage.getItem(cacheKey) : null;
	if (!map) {
		const url = `https://api.aladhan.com/v1/timingsByCity/${dateStr}?city=${encodeURIComponent(settings.city)}&country=${encodeURIComponent(settings.country)}&method=5`;
		const res = await fetch(url);
		const json = await res.json();
		const t = json?.data?.timings || {};
		map = JSON.stringify({ Fajr: t.Fajr, Dhuhr: t.Dhuhr, Asr: t.Asr, Maghrib: t.Maghrib, Isha: t.Isha });
		if (typeof window !== "undefined") localStorage.setItem(cacheKey, map);
	}
	const times = JSON.parse(map);
	const timeStr = times[prayerName];
	if (!timeStr) return null;
	const [hh, mm] = timeStr.split(":");
	const iso = `${toISODate(d)}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;
	return new Date(iso);
}
export function applyOffset(date, direction, minutes) {
	if (!date) return null;
	const ms = (minutes || 0) * 60 * 1000;
	return new Date(date.getTime() + (direction === "before" ? -ms : ms));
}

// -------------------------------
// Ticker hook: plays sound + push + optional onDue(reminder)
// -------------------------------
import { useEffect } from "react";

export function useReminderTicker(reminders, setReminders, settings, onDue) {
	useEffect(() => {
		const id = setInterval(() => {
			const now = new Date();
			reminders.forEach(async (r) => {
				if (!r.active || r.isCompleted) return;
				const s = r.schedule || defaultSchedule();

				let next = computeNextOccurrence(r, settings || {});
				if (s.mode === "prayer" && settings) {
					const { name, offsetMin = 0, direction = "before" } = s.prayer || {};
					const today = await getPrayerDateTime(name, now, settings);
					let candidate = applyOffset(today, direction, offsetMin);
					if (!candidate || candidate < now) {
						const tmr = plusDays(now, 1);
						const nextTime = await getPrayerDateTime(name, tmr, settings);
						candidate = applyOffset(nextTime, direction, offsetMin);
					}
					next = candidate;
				}

				const snoozed = r._snoozedUntil ? new Date(r._snoozedUntil) : null;
				const effectiveNext = snoozed && snoozed > now ? snoozed : next;
				if (!effectiveNext) return;

				if (Math.abs(effectiveNext.getTime() - now.getTime()) < 30 * 1000) {
					try {
						// Local sound
						const audio = new Audio(r?.sound?.previewUrl || SOUND_SAMPLES.chime);
						audio.volume = Number.isFinite(r?.sound?.volume) ? r.sound.volume : 0.8;
						audio.play().catch(() => { });
					} catch { }

					// Browser Push via SW (even لو التبويب بالخلفية)
					if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
						try {
							const reg = await navigator.serviceWorker.getRegistration();
							if (reg) {
								await reg.showNotification(r.title || 'تذكير', {
									body: r.notes || '',
									icon: '/icons/bell.png',
									badge: '/icons/badge.png',
									requireInteraction: true,
									data: { url: '/app/reminders', reminderId: r.id }
								});
							}
						} catch { }
					}

					// لو الموقع مفتوح: افتح Popup Actionable
					if (typeof onDue === "function") {
						onDue(r);
					}

					// reset snooze marker
					setReminders(prev => prev.map(x => (x.id === r.id ? { ...x, _snoozedUntil: null } : x)));
				}
			});
		}, 15 * 1000);
		return () => clearInterval(id);
	}, [reminders, setReminders, settings, onDue]);
}
