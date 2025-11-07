/* 
	- add real rings 
*/

"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
	Search as SearchIcon,
	Plus,
	Settings,
	Calendar as CalendarIcon,
	Bell,
	Clock,
	X,
	ChevronLeft,
	ChevronRight,
	CheckCircle2,
	Pencil,
	Power,
	PowerOff,
	Trash2,
	Info,
	BellRing,
	FileText,
	CalendarX,
	CalendarPlus,
	Timer,
	CalendarRange,
	CalendarDays,
	Sun,
	Bolt,
	SunMoon,
	Zap,
	SprayCanIcon,
} from "lucide-react";

// UI kit (assumed existing)
import { Modal, TabsPill } from "@/components/dashboard/ui/UI";
import { Switcher } from "@/components/atoms/Switcher";
import Select from "@/components/atoms/Select";
import { TimeField } from "@/components/atoms/InputTime";
import InputDate from "@/components/atoms/InputDate";
import Input from "@/components/atoms/Input";
import Textarea from "@/components/atoms/Textarea";

// Forms & Validation
import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

// Axios instance (already configured with auth + lang)
import api from "@/utils/axios";
import MultiLangText from "@/components/atoms/MultiLangText";

/* ======================================================================
	 0) Small API LAYER (inline, one-file) + push helpers
====================================================================== */

/* ---------- UI <-> API mappers ---------- */
function toISODateOnly(input) {
	const d = new Date(input);
	if (Number.isNaN(d.getTime())) return null;
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

function isHHmm(s) {
	return typeof s === "string" && /^\d{2}:\d{2}$/.test(s);
}

function uiToApiReminder(ui) {
	const s = ui?.schedule || {};
	const times = (Array.isArray(s.times) ? s.times : [])
		.map((t) => String(t).trim())
		.filter(isHHmm);

	const startDate = toISODateOnly(s.startDate) || toISODateOnly(new Date());

	return {
		title: ui.title?.trim() || "",
		description: ui.notes || "",
		// always custom
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

function apiToUiReminder(apiRem) {
	const soundId = apiRem?.soundSettings?.id || "chime";
	const soundName =
		soundId === "drop" ? "Water Drop" : soundId === "soft" ? "Soft Bell" : "Chime";
	return {
		id: apiRem.id,
		title: apiRem.title,
		notes: apiRem.description || "",
		type: "custom", // normalized
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

/* ---------- Endpoints ---------- */
async function listReminders(filters = {}) {
	const params = {};
	if (filters.isCompleted !== undefined) params.completed = !!filters.isCompleted;
	if (filters.isActive !== undefined) params.active = !!filters.isActive;
	if (filters.type) params.type = filters.type;
	if (filters.fromDate) params.fromDate = filters.fromDate;
	if (filters.toDate) params.toDate = filters.toDate;
	const { data } = await api.get("/reminders", { params });
	return (data || []).map(apiToUiReminder);
}
async function createReminderApi(uiReminder) {
	const payload = uiToApiReminder(uiReminder);
	const { data } = await api.post("/reminders", payload);
	return apiToUiReminder(data);
}
async function updateReminderApi(id, uiPatch) {
	const payload = uiToApiReminder(uiPatch);
	const { data } = await api.put(`/reminders/${id}`, payload);
	return apiToUiReminder(data);
}
async function deleteReminderApi(id) {
	await api.delete(`/reminders/${id}`);
}
async function toggleActiveApi(id) {
	const { data } = await api.put(`/reminders/${id}/toggle`);
	return apiToUiReminder(data);
}
async function snoozeReminderApi(id, minutes) {
	const { data } = await api.put(`/reminders/${id}/snooze`, { minutes });
	return apiToUiReminder(data);
}
async function markCompletedApi(id) {
	const { data } = await api.put(`/reminders/${id}/complete`);
	return apiToUiReminder(data);
}
async function getUserSettingsApi() {
	const { data } = await api.get("/reminders/settings/user");
	return data;
}
async function updateUserSettingsApi(patch) {
	const { data } = await api.put("/reminders/settings/user", patch);
	return data;
}
async function getVapidPublicKey() {
	const { data } = await api.get("/reminders/push/vapid-key");
	return data?.publicKey;
}
async function subscribePushOnServer(subscription) {
	const { data } = await api.post("/reminders/push/subscribe", subscription);
	return data;
}

/* ---------- Web Push helpers (optional) ---------- */
async function ensureServiceWorker() {
	if (!("serviceWorker" in navigator)) return null;
	const swExists = await fetch("/sw.js").then((r) => r.ok).catch(() => false);
	if (!swExists) return null;
	const reg = await navigator.serviceWorker.register("/sw.js");
	return reg;
}
async function enableWebPush() {
	if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
	const reg = await ensureServiceWorker();
	if (!reg) throw new Error("Service worker missing. Add /public/sw.js.");
	const vapidKey = await getVapidPublicKey();
	if (!vapidKey) throw new Error("Missing VAPID public key from server.");

	function toBase64Url(bytes) {
		let str = '';
		const arr = new Uint8Array(bytes);
		for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i]);
		const b64 = (typeof window !== 'undefined' ? window.btoa(str) : Buffer.from(str, 'binary').toString('base64'));
		return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
	}

	// ثم عند الاشتراك:
	const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) });
	await subscribePushOnServer({
		endpoint: sub.endpoint,
		keys: {
			p256dh: toBase64Url(sub.getKey('p256dh')),
			auth: toBase64Url(sub.getKey('auth')),
		},
	});


	return sub;
}
function urlBase64ToUint8Array(base64String) {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
	const raw =
		typeof window !== "undefined"
			? window.atob(base64)
			: Buffer.from(base64, "base64").toString("binary");
	const arr = new Uint8Array(raw.length);
	for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
	return arr;
}
function arrayBufferToBase64(buf) {
	const bytes = new Uint8Array(buf);
	let str = "";
	for (let i = 0; i < bytes.byteLength; i++) str += String.fromCharCode(bytes[i]);
	return typeof window !== "undefined"
		? window.btoa(str)
		: Buffer.from(str, "binary").toString("base64");
}

/* ======================================================================
	 1) Constants & helpers
====================================================================== */

const WEEK_DAYS = [
	{ key: "SU", label: "sun" },
	{ key: "MO", label: "mon" },
	{ key: "TU", label: "tue" },
	{ key: "WE", label: "wed" },
	{ key: "TH", label: "thu" },
	{ key: "FR", label: "fri" },
	{ key: "SA", label: "sat" },
];
const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
const SOUND_SAMPLES = {
	chime: "data:audio/mp3;base64,//uQZAAA...",
	drop: "data:audio/mp3;base64,//uQZAAA...",
	soft: "data:audio/mp3;base64,//uQZAAA...",
};
const REPEAT_HOURLY_OPTIONS = [
	{ id: "2", label: "every.2h" },
	{ id: "3", label: "every.3h" },
	{ id: "4", label: "every.4h" },
	{ id: "5", label: "every.5h" },
	{ id: "6", label: "every.6h" },
];

function arPrayer(p) {
	return (
		{
			Fajr: "prayer.fajr",
			Dhuhr: "prayer.dhuhr",
			Asr: "prayer.asr",
			Maghrib: "prayer.maghrib",
			Isha: "prayer.isha",
		}[p] || p
	);
}
function toISODate(d) {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}
function sameDay(a, b) {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}
function plusDays(d, n) {
	const x = new Date(d);
	x.setDate(x.getDate() + n);
	return x;
}
function humanDateTime(d) {
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
function formatTime12(hhmm) {
	if (!hhmm) return "—";
	const [h, m] = hhmm.split(":").map(Number);
	const h12 = ((h + 11) % 12) + 1;
	const ampm = h < 12 ? "AM" : "PM";
	return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function defaultSchedule() {
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
function generateDefaultTitle() {
	const seed = Math.floor(Date.now() / 1000).toString(36).toUpperCase();
	return `Alert ${seed.slice(-4)}`;
}
function defaultReminder(patch = {}) {
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
function normalizeSchedule(s) {
	const base = defaultSchedule();
	const merged = { ...base, ...(s || {}) };
	if (!Array.isArray(merged.times) || merged.times.length === 0)
		merged.times = ["08:00"];
	if (merged.mode === "prayer" && !merged.prayer)
		merged.prayer = { name: "Fajr", offsetMin: 10, direction: "before" };
	if (!merged.startDate) merged.startDate = base.startDate;
	return merged;
}

/* ----- occurrence helpers ----- */
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
function betweenTimes24(t, start, end) {
	const toMin = (x) => {
		const [h, m] = x.split(":").map(Number);
		return h * 60 + m;
	};
	const tt = toMin(t);
	const s = toMin(start);
	const e = toMin(end);
	return s < e ? tt >= s && tt < e : tt >= s || tt < e;
}
function to24h(s) {
	if (!s) return "00:00";
	const m = s.trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
	if (!m) return s;
	let h = Number(m[1]);
	const mm = m[2];
	const ap = m[3].toUpperCase();
	if (ap === "PM" && h < 12) h += 12;
	if (ap === "AM" && h === 12) h = 0;
	return `${String(h).padStart(2, "0")}:${mm}`;
}
function currentTime24() {
	const d = new Date();
	const h = String(d.getHours()).padStart(2, "0");
	const m = String(d.getMinutes()).padStart(2, "0");
	return `${h}:${m}`;
}
function inQuietHours(now, qh) {
	const t = currentTime24();
	const start = to24h(qh.start);
	const end = to24h(qh.end);
	return betweenTimes24(t, start, end);
}
function computeNextOccurrence(rem, settings) {
	if (!rem?.active) return null;
	const s = rem.schedule || defaultSchedule();
	const now = new Date();
	const start = s.startDate ? new Date(`${s.startDate}T00:00:00`) : new Date();
	const end = s.endDate ? new Date(`${s.endDate}T23:59:59`) : null;
	if (end && now > end) return null;

	const isExcluded = (d) =>
		(s.exdates || []).some(
			(x) => Math.abs(new Date(x).getTime() - d.getTime()) < 60 * 1000
		);

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
				const candidate =
					offset === 0 ? nextTimeTodayOrFuture(s, now) : firstTimeOnDate(s, d);
				if (candidate && !isExcluded(candidate)) return candidate;
			}
		}
		return null;
	}
	if (s.mode === "interval" && s.interval) {
		const base = new Date(
			`${s.startDate || toISODate(new Date())}T${(s.times && s.times[0]) || "08:00"}:00`
		);
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

/* --- Prayer API (client-only preview) --- */
async function fetchTodayPrayerTimes(settings) {
	const d = new Date();
	const cacheKey = `pt_${settings.city}_${settings.country}_${toISODate(d)}`;
	const cached =
		typeof window !== "undefined" ? localStorage.getItem(cacheKey) : null;
	if (cached) return JSON.parse(cached);
	const { city, country } = settings;
	const dateStr = `${String(d.getDate()).padStart(2, "0")}-${String(
		d.getMonth() + 1
	).padStart(2, "0")}-${d.getFullYear()}`;
	const url = `https://api.aladhan.com/v1/timingsByCity/${dateStr}?city=${encodeURIComponent(
		city
	)}&country=${encodeURIComponent(country)}&method=5`;
	const res = await fetch(url);
	const json = await res.json();
	const t = json?.data?.timings || {};
	const map = {
		Fajr: t.Fajr,
		Dhuhr: t.Dhuhr,
		Asr: t.Asr,
		Maghrib: t.Maghrib,
		Isha: t.Isha,
	};
	localStorage.setItem(cacheKey, JSON.stringify(map));
	return map;
}
async function getPrayerDateTime(prayerName, dateObj, settings) {
	const d = dateObj;
	const dateStr = `${String(d.getDate()).padStart(2, "0")}-${String(
		d.getMonth() + 1
	).padStart(2, "0")}-${d.getFullYear()}`;
	const cacheKey = `pt_${settings.city}_${settings.country}_${dateStr}`;
	let map = typeof window !== "undefined" ? localStorage.getItem(cacheKey) : null;
	if (!map) {
		const url = `https://api.aladhan.com/v1/timingsByCity/${dateStr}?city=${encodeURIComponent(
			settings.city
		)}&country=${encodeURIComponent(settings.country)}&method=5`;
		const res = await fetch(url);
		const json = await res.json();
		const t = json?.data?.timings || {};
		map = JSON.stringify({
			Fajr: t.Fajr,
			Dhuhr: t.Dhuhr,
			Asr: t.Asr,
			Maghrib: t.Maghrib,
			Isha: t.Isha,
		});
		if (typeof window !== "undefined") localStorage.setItem(cacheKey, map);
	}
	const times = JSON.parse(map);
	const timeStr = times[prayerName];
	if (!timeStr) return null;
	const [hh, mm] = timeStr.split(":");
	const iso = `${toISODate(d)}T${String(hh).padStart(2, "0")}:${String(mm).padStart(
		2,
		"0"
	)}:00`;
	return new Date(iso);
}
function applyOffset(date, direction, minutes) {
	if (!date) return null;
	const ms = (minutes || 0) * 60 * 1000;
	return new Date(date.getTime() + (direction === "before" ? -ms : ms));
}


// 
// anywhere in your page/component
async function sendReminderNow() {
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


/* ---------- UI Ticker (client sound preview only) ---------- */
function useReminderTicker(reminders, setReminders, settings) {
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

				// if (settings?.quietHours && inQuietHours(now, settings.quietHours)) return;

				// بدّل الجزء داخل useReminderTicker عند لحظة الاستحقاق:
				if (Math.abs(effectiveNext.getTime() - now.getTime()) < 30 * 1000) {
					// 1) صوت محلي (اختياري)
					const audio = new Audio(r?.sound?.previewUrl || SOUND_SAMPLES.chime);
					audio.volume = Number.isFinite(r?.sound?.volume) ? r.sound.volume : 0.8;
					audio.play().catch(() => { });

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
					setReminders(prev => prev.map(x => (x.id === r.id ? { ...x, _snoozedUntil: null } : x)));
				}

			});
		}, 15 * 1000);
		return () => clearInterval(id);
	}, [reminders, setReminders, settings]);
}

/* ======================================================================
	 2) Page
====================================================================== */

export default function RemindersPage() {
	const t = useTranslations("reminders");
	const router = useRouter();

	const [reminders, setReminders] = useState([]);
	const [settings, setSettings] = useState(null);
	const [loading, setLoading] = useState(true);
	const [pushAvailable, setPushAvailable] = useState(false);
	const [pushEnabled, setPushEnabled] = useState(
		typeof Notification !== "undefined" ? Notification.permission === "granted" : false
	);

	// Modals
	const [openForm, setOpenForm] = useState(false);
	const [editing, setEditing] = useState(null);
	const [openSettings, setOpenSettings] = useState(false);
	const [openCalendar, setOpenCalendar] = useState(false);

	// Search
	const [query, setQuery] = useState("");

	// Day tabs
	const today = new Date();
	const todayKey = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][today.getDay()];
	const [selectedDay, setSelectedDay] = useState(todayKey);
	const dayTabs = useMemo(
		() =>
			WEEK_DAYS.map((d) => ({
				key: d.key,
				label: safeT(t, `weekday.${d.label}`, d.label),
			})),
		[t]
	);
	const changeDay = useCallback((k) => setSelectedDay(k), []);

	// Initial load (data + push detect + auto-ask notification)
	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const [rs, st] = await Promise.all([listReminders(), getUserSettingsApi()]);
				if (!mounted) return;

				const withAudio = (rs || []).map((r) => ({
					...r,
					sound: {
						...r.sound,
						previewUrl:
							r.sound?.id === "drop"
								? SOUND_SAMPLES.drop
								: r.sound?.id === "soft"
									? SOUND_SAMPLES.soft
									: SOUND_SAMPLES.chime,
					},
				}));

				setReminders(withAudio);
				setSettings(st);

				if (typeof window !== "undefined" && "serviceWorker" in navigator) {
					const ok = await fetch("/sw.js").then((r) => r.ok).catch(() => false);
					setPushAvailable(ok);
				}

				// Ask for notifications on first load
				if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
					try {
						const perm = await Notification.requestPermission();
						if (perm === "granted") {
							setPushEnabled(true);
							// try to subscribe if possible
							if (pushAvailable) {
								try {
									await enableWebPush();
								} catch { }
							}
						}
					} catch { }
				} else if (typeof Notification !== "undefined") {
					setPushEnabled(Notification.permission === "granted");
				}
			} finally {
				if (mounted) setLoading(false);
			}
		})();
		return () => {
			mounted = false;
		};
	}, [pushAvailable]);

	// Filtered list
	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		const list = reminders
			.filter((r) => {
				if (!q) return true;
				const tt = (r.title || "").toLowerCase();
				const translated = safeT(t, r.title || "", r.title || "").toLowerCase();
				const inText =
					translated.includes(q) ||
					tt.includes(q) ||
					(r.notes || "").toLowerCase().includes(q);
				return inText;
			})
			.filter((r) => {
				const s = r.schedule || {};
				if (s.mode === "weekly" && Array.isArray(s.daysOfWeek) && s.daysOfWeek.length) {
					return s.daysOfWeek.includes(selectedDay);
				}
				if (["daily", "interval", "prayer", "monthly", "once"].includes(s.mode)) return true;
				return true;
			})
			.sort(
				(a, b) =>
					(computeNextOccurrence(a, settings || {})?.getTime() || 0) -
					(computeNextOccurrence(b, settings || {})?.getTime() || 0)
			);
		return list;
	}, [reminders, query, selectedDay, settings, t]);

	// Ticker
	useReminderTicker(
		reminders,
		setReminders,
		settings || { quietHours: { start: "22:00", end: "07:00" } }
	);

	/* ---------- CRUD handlers ---------- */

	const onCreate = () => {
		setEditing(null);
		setOpenForm(true);
	};

	const onEdit = (rem) => {
		setEditing(rem);
		setOpenForm(true);
	};

	const onSave = async (draft) => {
		const schedule = normalizeSchedule(draft.schedule);
		const payload = {
			...draft,
			title: draft.title?.trim() || generateDefaultTitle(),
			// enforce custom type
			type: "custom",
			schedule: { ...schedule, exdates: (schedule.exdates || []).filter(Boolean) },
		};
		setOpenForm(false);

		if (draft.id) {
			const before = reminders;
			const idx = before.findIndex((r) => r.id === draft.id);
			const optimistic = [...before];
			optimistic[idx] = { ...before[idx], ...payload, updatedAt: new Date().toISOString() };
			setReminders(optimistic);
			try {
				const saved = await updateReminderApi(draft.id, payload);
				saved.sound.previewUrl =
					saved.sound?.id === "drop"
						? SOUND_SAMPLES.drop
						: saved.sound?.id === "soft"
							? SOUND_SAMPLES.soft
							: SOUND_SAMPLES.chime;
				setReminders((list) => list.map((r) => (r.id === saved.id ? saved : r)));
			} catch {
				setReminders(before);
			}
		} else {
			try {
				const created = await createReminderApi(payload);
				created.sound.previewUrl =
					created.sound?.id === "drop"
						? SOUND_SAMPLES.drop
						: created.sound?.id === "soft"
							? SOUND_SAMPLES.soft
							: SOUND_SAMPLES.chime;
				setReminders((list) => [created, ...list]);
			} catch {
				// toast here if available
			}
		}
	};

	const onDelete = async (id) => {
		const before = reminders;
		setReminders(before.filter((r) => r.id !== id));
		try {
			await deleteReminderApi(id);
		} catch {
			setReminders(before);
		}
	};

	const onToggleActive = async (id) => {
		const before = reminders;
		setReminders(before.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));
		try {
			const saved = await toggleActiveApi(id);
			saved.sound.previewUrl =
				saved.sound?.id === "drop"
					? SOUND_SAMPLES.drop
					: saved.sound?.id === "soft"
						? SOUND_SAMPLES.soft
						: SOUND_SAMPLES.chime;
			setReminders((list) => list.map((r) => (r.id === id ? saved : r)));
		} catch {
			setReminders(before);
		}
	};

	const onSnooze = async (rem, minutes) => {
		const m = minutes ?? settings?.defaultSnooze ?? 10;
		const until = new Date(Date.now() + m * 60 * 1000).toISOString();
		setReminders((list) =>
			list.map((r) => (r.id === rem.id ? { ...r, _snoozedUntil: until } : r))
		);
		try {
			const saved = await snoozeReminderApi(rem.id, m);
			saved.sound.previewUrl =
				saved.sound?.id === "drop"
					? SOUND_SAMPLES.drop
					: saved.sound?.id === "soft"
						? SOUND_SAMPLES.soft
						: SOUND_SAMPLES.chime;
			setReminders((list) =>
				list.map((r) => (r.id === rem.id ? { ...saved, _snoozedUntil: until } : r))
			);
		} catch {
			setReminders((list) => list.map((r) => (r.id === rem.id ? { ...r, _snoozedUntil: null } : r)));
		}
	};

	const onAck = async (rem) => {
		try {
			const saved = await markCompletedApi(rem.id);
			saved.sound.previewUrl =
				saved.sound?.id === "drop"
					? SOUND_SAMPLES.drop
					: saved.sound?.id === "soft"
						? SOUND_SAMPLES.soft
						: SOUND_SAMPLES.chime;
			setReminders((list) => list.map((r) => (r.id === rem.id ? saved : r)));
		} catch { }
	};

	// Quick create (after X minutes)
	const quickCreate = async (mins) => {
		const n = Number(mins);
		if (Number.isNaN(n) || n <= 0) return;
		const now = new Date();
		const future = new Date(now.getTime() + n * 60 * 1000);
		const payload = defaultReminder({
			title: generateDefaultTitle(),
			schedule: {
				mode: "once",
				times: [String(future).slice(16, 21) || "08:00"], // hh:mm from toString()
				startDate: toISODate(future),
				endDate: null,
				daysOfWeek: [],
				timezone: settings?.timezone || "Africa/Cairo",
			},
		});
		try {
			const created = await createReminderApi(payload);
			created.sound.previewUrl =
				created.sound?.id === "drop"
					? SOUND_SAMPLES.drop
					: created.sound?.id === "soft"
						? SOUND_SAMPLES.soft
						: SOUND_SAMPLES.chime;
			setReminders((list) => [created, ...list]);
		} catch { }
	};

	if (loading) {
		return (
			<main className="mx-auto max-w-6xl px-3 md:px-4 py-6">
				<div className="animate-pulse h-40 rounded-2xl bg-slate-100" />
				<div className="mt-4 grid gap-3">
					<div className="h-24 rounded-xl bg-slate-100" />
					<div className="h-24 rounded-xl bg-slate-100" />
				</div>
			</main>
		);
	}

	return (
		<main className="mx-auto max-w-6xl px-3 md:px-4 py-4 md:py-6">
			<div className="relative z-[1] rounded-lg border border-indigo-100/60 bg-white/60 shadow-sm backdrop-blur">
				<div className="absolute  rounded-lg  inset-0 overflow-hidden">
					<div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 opacity-95" />
					<div
						className="absolute inset-0 opacity-15"
						style={{
							backgroundImage:
								"linear-gradient(rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.22) 1px, transparent 1px)",
							backgroundSize: "22px 22px",
							backgroundPosition: "-1px -1px",
						}}
					/>
					<div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
					<div className="absolute -bottom-16 -right-8 h-60 w-60 rounded-full bg-blue-300/30 blur-3xl" />
				</div>

				<div className="relative p-3 md:p-5 text-white">
					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
						<div>
							<h1 className="text-xl md:text-4xl font-semibold">
								{safeT(t, "title", "Reminders")}
							</h1>
							<p className="text-white/85 mt-1 hidden md:block">
								{safeT(t, "subtitle", "Manage your personal reminders")}
							</p>
						</div>

						<div className="flex flex-wrap items-center gap-2">
							{pushAvailable && (
								<button
									type="button"
									onClick={async () => {
										try {
											if (!pushEnabled) {
												if (
													typeof Notification !== "undefined" &&
													Notification.permission !== "granted"
												) {
													const perm = await Notification.requestPermission();
													if (perm !== "granted") return;
												}
												await enableWebPush().catch(() => { });
												setPushEnabled(true);
											}
										} catch { }
									}}
									className={`rounded-lg border px-3 py-2 text-sm ${pushEnabled
										? "border-blue-100 bg-indigo-100/50 text-white/90 cursor-default"
										: "border-white/30 bg-white/10 hover:bg-white/20"
										}`}
									aria-label={safeT(t, "actions.enablePush", "Enable notifications")}
									title={safeT(t, "actions.enablePush", "Enable notifications")}
									disabled={pushEnabled}
								>
									<Bell className="inline-block w-4 h-4 mr-1 -mt-0.5" />
									{pushEnabled
										? safeT(t, "actions.pushEnabled", "Notifications Enabled")
										: safeT(t, "actions.enablePush", "Enable Push")}
								</button>
							)}

							{/* Quick create */}
							<QuickCreate t={t} onPick={quickCreate} />

							<button
								type="button"

								onClick={() => sendReminderNow()}
								className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
							>
								<SprayCanIcon className="inline-block w-4 h-4 " />
							</button>
							<button
								type="button"
								onClick={() => setOpenCalendar(true)}
								className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
								aria-label={safeT(t, "calendar.open", "Open calendar")}
								title={safeT(t, "calendar.open", "Open calendar")}
							>
								<CalendarIcon className="inline-block w-4 h-4 " />
							</button>
							<button
								type="button"
								onClick={() => setOpenSettings(true)}
								className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
								aria-label={safeT(t, "settings.open", "Open settings")}
								title={safeT(t, "settings.open", "Open settings")}
							>
								<Settings className="inline-block w-4 h-4" />
							</button>
							<button
								type="button"
								onClick={onCreate}
								className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
								aria-label={safeT(t, "actions.new", "New")}
								title={safeT(t, "actions.new", "New")}
							>
								<Plus className="inline-block w-4 h-4" />
							</button>
						</div>
					</div>

					<div className="mt-2 md:mt-4 flex items-center justify-between gap-2">
						<TabsPill
							hiddenArrow
							sliceInPhone={false}
							isLoading={false}
							className="!rounded-lg flex-1 md:flex-none"
							slice={3}
							id="day-tabs"
							tabs={dayTabs}
							active={selectedDay}
							onChange={changeDay}
						/>

						<div className=" max-md:hidden relative w-full md:w-64">
							<SearchIcon className="absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/80" />
							<input
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder={safeT(t, "search.placeholder", "Search reminders…")}
								className="w-full rounded-lg border border-white/20 bg-white/10 px-9 py-2 text-sm placeholder:text-white/70 outline-none focus:bg-white/20"
							/>
						</div>
					</div>
				</div>
			</div>


			{/* List */}
			<section className="mt-6 grid grid-cols-1 gap-4">
				{filtered.length === 0 ? (
					<div className="rounded-3xl border border-dashed border-slate-200 p-10 text-center">
						<p className="text-slate-600">
							{safeT(t, "empty.day", "No reminders for this day")}
						</p>
					</div>
				) : (
					filtered.map((r) => (
						<ReminderCard
							key={r.id}
							t={t}
							reminder={r}
							settings={settings || { quietHours: { start: "22:00", end: "07:00" } }}
							onEdit={() => setEditing(r) || setOpenForm(true)}
							onDelete={() => onDelete(r.id)}
							onToggleActive={() => onToggleActive(r.id)}
							onSnooze={(m) => onSnooze(r, m)}
							onAck={() => onAck(r)}
						/>
					))
				)}
			</section>

			{/* Modals */}
			<Modal
				open={openForm}
				onClose={() => setOpenForm(false)}
				title={
					editing
						? safeT(t, "form.editTitle", "Edit reminder")
						: safeT(t, "form.newTitle", "New reminder")
				}
				maxW="max-w-3xl"
			>
				<ReminderForm
					t={t}
					initial={editing || defaultReminder()}
					onCancel={() => setOpenForm(false)}
					onSave={onSave}
					settings={settings || defaultSettings()}
				/>
			</Modal>

			<Modal
				open={openSettings}
				onClose={() => setOpenSettings(false)}
				title={safeT(t, "settings.title", "Settings")}
				maxW="max-w-2xl"
			>
				<SettingsPanel
					t={t}
					value={settings || defaultSettings()}
					onChange={async (val) => {
						try {
							const saved = await updateUserSettingsApi(val);
							setSettings(saved);
						} catch { }
					}}
				/>
			</Modal>

			<Modal
				open={openCalendar}
				onClose={() => setOpenCalendar(false)}
				title={safeT(t, "calendar.title", "Calendar")}
				maxW="max-w-4xl"
			>
				<CalendarView
					t={t}
					reminders={reminders}
					settings={settings || defaultSettings()}
				/>
			</Modal>
		</main>
	);
}

/* ---------- small i18n helper ---------- */
function safeT(t, key, fallback) {
	try {
		const res = t(key, { fallback });
		return res || fallback || key;
	} catch {
		return fallback || key;
	}
}

/* ---------- Fallback default settings ---------- */
function defaultSettings() {
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

/* ======================================================================
	 3) Cards / Form / Calendar
====================================================================== */

function ReminderCard({ t, reminder, onEdit, onDelete, onToggleActive, onSnooze, onAck, settings }) {
	const next = computeNextOccurrence(reminder, settings || {});
	const due = next && next <= new Date();
	const muted = !reminder.active;

	return (
		<div
			className={`rounded-lg border border-slate-200 bg-white/70 p-4 md:p-5 shadow-sm backdrop-blur transition ${muted ? "opacity-60" : due ? "ring-2 ring-emerald-400" : ""}`}
		>
			<div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
				<div className="min-w-0">
					<div className="text-xs mb-1 flex flex-wrap items-center gap-2 text-slate-600">
						<span className="inline-flex items-center gap-1 text-xs">
							<Clock className="w-4 h-4" /> <span  >{formatSchedule(t, reminder)}</span>
						</span>
						{safeT(t, "next", "Next")}: {next ? humanDateTime(next) : "—"}
					</div>
					<MultiLangText className="truncate text-base font-semibold text-slate-800">{reminder.title}</MultiLangText>
					{reminder.notes && (
						<p className="mt-1 line-clamp-2 text-sm text-slate-600">
							{reminder.notes}
						</p>
					)}
				</div>

				<div className="flex flex-wrap md:flex-nowrap items-center gap-1">
					<IconButton
						icon={<CheckCircle2 size={14} />}
						label={safeT(t, "actions.done", "Done")}
						onClick={onAck}
					/>
					<SnoozeSelect t={t} onPick={(m) => onSnooze(reminder, m)} />
					<IconButton
						icon={<Pencil size={14} />}
						label={safeT(t, "actions.edit", "Edit")}
						onClick={onEdit}
					/>
					<IconButton
						icon={reminder.active ? <Power size={14} /> : <PowerOff size={14} />}
						label={
							reminder.active
								? safeT(t, "actions.disable", "Disable")
								: safeT(t, "actions.enable", "Enable")
						}
						onClick={onToggleActive}
					/>
					<IconButton
						danger
						icon={<Trash2 size={14} />}
						label={safeT(t, "actions.delete", "Delete")}
						onClick={onDelete}
					/>
				</div>
			</div>
		</div>
	);
}

function IconButton({ icon, onClick, label, danger }) {
	return (
		<button
			onClick={onClick}
			aria-label={label}
			title={label}
			className={` rounded-lg border px-2.5 py-2 text-sm transition ${danger
				? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
				: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
				}`}
		>
			{icon}
		</button>
	);
}

/* ---------- Form ---------- */

// schema: type is enforced to "custom" implicitly; we keep it in schema but don't render the field.
const schema = yup.object().shape({
	title: yup.string().trim().required(),
	type: yup.mixed().oneOf(["custom"]).default("custom"),
	schedule: yup.object({
		mode: yup.string().oneOf(["once", "daily", "weekly", "monthly", "interval", "prayer"]).required(),
		startDate: yup.string().required(),
	}),
});

function ReminderForm({ t, initial, onCancel, onSave, settings }) {
	const {
		register,
		handleSubmit,
		control,
		watch,
		setValue,
		formState: { errors },
	} = useForm({
		resolver: yupResolver(schema),
		defaultValues: {
			id: initial?.id || null,
			title: initial?.title || generateDefaultTitle(),
			type: "custom",
			notes: initial?.notes || "",
			active: initial?.active ?? true,
			schedule: normalizeSchedule(initial?.schedule || {}),
			sound:
				initial?.sound || {
					id: "chime",
					name: "Chime",
					previewUrl: SOUND_SAMPLES.chime,
					volume: 0.8,
				},
			priority: initial?.priority || "normal",
			rrule: initial?.schedule?.rrule || "",
			exdates: initial?.schedule?.exdates || [],
		},
	});

	const mode = watch("schedule.mode");
	const times = watch("schedule.times");

	const [showNotes, setShowNotes] = useState(Boolean(initial?.notes));
	const [showEndDate, setShowEndDate] = useState(Boolean(initial?.schedule?.endDate));
	const [activeTab, setActiveTab] = useState("details");

	const onSubmit = (data) => {
		onSave({
			...data,
			type: "custom",
			title: data.title?.trim() || generateDefaultTitle(),
			schedule: normalizeSchedule({ ...data.schedule, rrule: data.rrule, exdates: data.exdates }),
		});
	};

	const addTime = () => setValue("schedule.times", [...(times || []), "12:00"]);
	const removeTime = (idx) =>
		setValue(
			"schedule.times",
			(times || []).filter((_, i) => i !== idx)
		);

	const [todayTimes, setTodayTimes] = useState(null);
	useEffect(() => {
		let mounted = true;
		fetchTodayPrayerTimes(settings)
			.then((tms) => {
				if (mounted) setTodayTimes(tms);
			})
			.catch(() => { });
		return () => {
			mounted = false;
		};
	}, [settings.city, settings.country]);

	const tabs = useMemo(
		() => [
			{ key: "details", label: safeT(t, "tabs.details", "Details") },
			{ key: "settings", label: safeT(t, "tabs.settings", "Settings") },
		],
		[t]
	);

	const MODE_OPTIONS = [
		{ id: "once", label: safeT(t, "mode.once", "Once") },
		{ id: "daily", label: safeT(t, "mode.daily", "Daily") },
		{ id: "weekly", label: safeT(t, "mode.weekly", "Weekly") },
		{ id: "monthly", label: safeT(t, "mode.monthly", "Monthly") },
		{ id: "interval", label: safeT(t, "mode.interval", "Interval") },
		{ id: "prayer", label: safeT(t, "mode.prayer", "Prayer") },
	];

	return (
		<form className="grid gap-5" onSubmit={handleSubmit(onSubmit)}>
			<TabsPill
				sliceInPhone={true}
				slice={false}
				hiddenArrow
				id="reminder-form-tabs"
				tabs={tabs}
				active={activeTab}
				onChange={setActiveTab}
				className="!rounded-lg"
			/>

			{activeTab === "details" && (
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div>
						<div className="flex items-end gap-2">
							<div className="flex-1">
								<Input
									label={safeT(t, "form.title", "Title")}
									placeholder={safeT(t, "form.titlePh", "Reminder title")}
									error={
										errors?.title && safeT(t, "errors.title", "Title is required")
									}
									{...register("title")}
									onChange={(v) => setValue("title", v)}
								/>
							</div>
							<button
								type="button"
								onClick={() => setShowNotes((v) => !v)}
								className="flex items-center gap-2 h-[40px] rounded-lg bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 hover:via-indigo-600 hover:to-blue-700 text-white px-3 text-sm"
							>
								{showNotes ? <X className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
							</button>
						</div>

						{showNotes && (
							<div className="mt-2">
								<Textarea
									label={safeT(t, "form.note", "Note")}
									placeholder={safeT(t, "form.notePh", "Optional note")}
									{...register("notes")}
									defaultValue={""}
								/>
							</div>
						)}
					</div>

					{/* Type is hidden (always custom) */}
					<input type="hidden" value="custom" {...register("type")} />

					{/* Dates */}
					<div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:col-span-2">
						<div className="flex items-end gap-2">
							<div className="flex-1">
								<label className="mb-1.5 block text-sm font-medium text-slate-700">
									{safeT(t, "form.startDate", "Start date")}
								</label>
								<InputDate
									value={watch("schedule.startDate") || toISODate(new Date())}
									onChange={(v) => setValue("schedule.startDate", v)}
								/>
							</div>
							<button
								type="button"
								onClick={() => setShowEndDate((v) => !v)}
								className="flex items-center justify-center h-[40px] w-[40px] rounded-lg bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 hover:via-indigo-600 hover:to-blue-700 text-white"
								title={
									showEndDate
										? safeT(t, "form.endHide", "Remove end date")
										: safeT(t, "form.endAdd", "Add end date")
								}
							>
								{showEndDate ? <CalendarX className="w-4 h-4" /> : <CalendarPlus className="w-4 h-4" />}
							</button>
						</div>

						{showEndDate && (
							<div>
								<label className="mb-1.5 block text-sm font-medium text-slate-700">
									{safeT(t, "form.endDate", "End date")}
								</label>
								<InputDate
									value={watch("schedule.endDate") || ""}
									onChange={(v) => setValue("schedule.endDate", v || null)}
								/>
							</div>
						)}
					</div>

					{/* Mode as Select */}
					<div className="md:col-span-2">
						<div className="mb-1.5 flex items-center gap-1.5">
							<label className="block text-sm font-medium text-slate-700">
								{safeT(t, "form.mode", "Mode")}
							</label>
							<Info className="w-3.5 h-3.5 text-slate-400" />
						</div>

						<Controller
							control={control}
							name="schedule.mode"
							render={({ field }) => (
								<Select
									options={MODE_OPTIONS}
									value={field.value || "daily"}
									onChange={(val) => field.onChange(val)}
									placeholder={safeT(t, "form.modePh", "Select mode")}
									className="min-w-[220px]"
								/>
							)}
						/>
						{errors?.schedule?.mode && (
							<p className="mt-1.5 text-xs text-rose-600">
								{safeT(t, "errors.mode", "Select a mode")}
							</p>
						)}
					</div>

					{/* Weekly */}
					{mode === "weekly" && (
						<WeeklyDaysSelector
							t={t}
							initial={initial}
							getDays={() => watch("schedule.daysOfWeek")}
							setDays={(arr) => setValue("schedule.daysOfWeek", arr)}
						/>
					)}

					{/* Interval */}
					{mode === "interval" && (
						<div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3">
							<div>
								<label className="mb-1.5 block text-sm font-medium text-slate-700">
									{safeT(t, "form.intervalStart", "Start time")}
								</label>
								<TimeField
									showLabel={false}
									value={(times && times[0]) || "09:00"}
									onChange={(val) => setValue("schedule.times", [val])}
								/>
							</div>
							<Controller
								control={control}
								name="schedule.interval.every"
								render={({ field }) => (
									<div>
										<label className="mb-1.5 block text-sm font-medium text-slate-700">
											{safeT(t, "form.intervalEvery", "Repeat every")}
										</label>
										<Select
											options={REPEAT_HOURLY_OPTIONS.map((o) => ({
												...o,
												label: safeT(t, o.label, o.id),
											}))}
											value={String(field.value || 2)}
											onChange={(val) => field.onChange(Number(val))}
											placeholder={safeT(t, "form.intervalEveryPh", "Every … hours")}
										/>
									</div>
								)}
							/>
						</div>
					)}

					{/* Prayer */}
					{mode === "prayer" && (
						<div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:col-span-2">
							<Controller
								control={control}
								name="schedule.prayer.name"
								render={({ field }) => (
									<div>
										<label className="mb-1.5 block text-sm font-medium text-slate-700">
											{safeT(t, "form.prayer", "Prayer")}
										</label>
										<Select
											options={PRAYERS.map((p) => ({
												id: p,
												label: safeT(t, arPrayer(p), p),
											}))}
											value={field.value || "Fajr"}
											onChange={(val) => field.onChange(val)}
											placeholder={safeT(t, "form.prayerPh", "Select prayer")}
										/>
									</div>
								)}
							/>
							<Controller
								control={control}
								name="schedule.prayer.direction"
								render={({ field }) => (
									<div>
										<label className="mb-1.5 block text-sm font-medium text-slate-700">
											{safeT(t, "form.beforeAfter", "Before/After")}
										</label>
										<Select
											options={[
												{ id: "before", label: safeT(t, "before", "Before") },
												{ id: "after", label: safeT(t, "after", "After") },
											]}
											value={field.value || "before"}
											onChange={(val) => field.onChange(val)}
											placeholder={safeT(t, "form.beforeAfterPh", "Before or after")}
										/>
									</div>
								)}
							/>
							<Controller
								control={control}
								name="schedule.prayer.offsetMin"
								render={({ field }) => (
									<Input
										label={safeT(t, "form.minutes", "Minutes")}
										type="number"
										value={field.value ?? 10}
										onChange={(v) => field.onChange(Number(v) || 0)}
										cnInputParent="h-[40px]"
									/>
								)}
							/>
							{todayTimes && (
								<div className="md:col-span-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
									<div className="mb-1 font-medium text-slate-700">
										{safeT(t, "form.todayTimes", "Today’s times")} – {settings.city},{" "}
										{settings.country}
									</div>
									<div className="grid grid-cols-2 gap-2 md:grid-cols-5">
										{PRAYERS.map((p) => (
											<span key={p}>
												{safeT(t, arPrayer(p), p)}: {todayTimes[p] || "—"}
											</span>
										))}
									</div>
								</div>
							)}
						</div>
					)}

					{/* Times */}
					{mode !== "prayer" && mode !== "interval" && (
						<div className="md:col-span-2">
							<label className="mb-1.5 block text-sm font-medium text-slate-700">
								{safeT(t, "form.times", "Times")}
							</label>
							<div className="flex flex-wrap gap-2">
								{(times || []).map((tVal, i) => (
									<div
										key={i}
										className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2"
									>
										<TimeField
											showLabel={false}
											value={tVal}
											onChange={(val) => {
												const next = (times || []).map((x, idx) =>
													idx === i ? val : x
												);
												setValue("schedule.times", next);
											}}
										/>
										<IconButton
											danger
											icon={<X className="w-4 h-5" />}
											onClick={() => removeTime(i)}
										/>
									</div>
								))}
								<button
									type="button"
									onClick={addTime}
									className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
								>
									{safeT(t, "form.addTime", "Add time")}
								</button>
							</div>
						</div>
					)}
				</div>
			)}

			{activeTab === "settings" && (
				<div className="grid gap-4">
					{/* Snooze & sound preview */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
						<div>
							<label className="mb-1.5 block text-sm font-medium text-slate-700">
								{safeT(t, "settings.defaultSnooze", "Default snooze (min)")}
							</label>
							<Controller
								control={control}
								name="defaultSnooze"
								render={() => (
									<Input
										type="number"
										cnInputParent="h-[40px]"
										value={watch("defaultSnooze") ?? 10}
										onChange={(x) => setValue("defaultSnooze", Number(x) || 10)}
										placeholder={safeT(t, "settings.defaultSnoozePh", "Default snooze")}
									/>
								)}
							/>
							<p className="mt-1 text-xs text-slate-500">
								{safeT(
									t,
									"settings.defaultSnoozeHint",
									"Used when you click Snooze without choosing."
								)}
							</p>
						</div>

						<div className="flex w-full">
							<span className="w-full ">
								<Controller
									control={control}
									name="sound.id"
									render={({ field }) => (
										<Select
											options={[
												{ id: "chime", label: "Chime" },
												{ id: "drop", label: "Water Drop" },
												{ id: "soft", label: "Soft Bell" },
											]}
											label={safeT(t, "settings.sound", "Sound")}
											value={field.value || "chime"}
											onChange={(val) => {
												const map = {
													chime: { id: "chime", name: "Chime", previewUrl: SOUND_SAMPLES.chime },
													drop: { id: "drop", name: "Water Drop", previewUrl: SOUND_SAMPLES.drop },
													soft: { id: "soft", name: "Soft Bell", previewUrl: SOUND_SAMPLES.soft },
												};
												const vol = watch("sound.volume") ?? 0.8;
												setValue("sound", { ...(map[val] || map.chime), volume: vol });
											}}
											placeholder={safeT(t, "settings.soundPh", "Select tone")}
										/>
									)}
								/>
							</span>

							<span className="mx-1 mt-[27px]">
								<IconButton
									icon={<BellRing className="w-5 h-5" />}
									label={safeT(t, "settings.preview", "Preview")}
									onClick={() => {
										const audio = new Audio(
											(watch("sound") || {}).previewUrl || SOUND_SAMPLES.chime
										);
										audio.volume = Number.isFinite(watch("sound.volume"))
											? watch("sound.volume")
											: 0.8;
										audio.play().catch(() => { });
									}}
								/>
							</span>
						</div>
					</div>

					{/* Quiet hours */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
						<div>
							<label className="mb-1 block text-sm text-slate-600">
								{safeT(t, "settings.quietFrom", "Quiet from")}
							</label>
							<Input
								placeholder="10:00 PM"
								value={watch("quietHours.start") ?? "10:00 PM"}
								onChange={(x) =>
									setValue("quietHours", { ...(watch("quietHours") || {}), start: x })
								}
							/>
						</div>
						<div>
							<label className="mb-1 block text-sm text-slate-600">
								{safeT(t, "settings.quietTo", "Quiet to")}
							</label>
							<Input
								placeholder="07:00 AM"
								value={watch("quietHours.end") ?? "07:00 AM"}
								onChange={(x) =>
									setValue("quietHours", { ...(watch("quietHours") || {}), end: x })
								}
							/>
						</div>
						<div>
							<label className="mb-1 block text-sm text-slate-600">
								{safeT(t, "settings.timezone", "Timezone")}
							</label>
							<Input
								value={watch("timezone") ?? "Africa/Cairo"}
								onChange={(x) => setValue("timezone", x)}
							/>
						</div>
					</div>
				</div>
			)}

			<div className="mt-2 flex items-center justify-end gap-2">
				<button
					type="button"
					onClick={onCancel}
					className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
				>
					{safeT(t, "actions.cancel", "Cancel")}
				</button>
				<button
					type="submit"
					className="rounded-lg bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 hover:via-indigo-600 hover:to-blue-700 text-white px-4 py-2"
				>
					{safeT(t, "actions.save", "Save")}
				</button>
			</div>
		</form>
	);
}

/* ---------- Weekdays ---------- */
function WeeklyDaysSelector({ t, initial, getDays, setDays }) {
	const days = getDays() || initial?.schedule?.daysOfWeek || [];
	const isRTL =
		typeof document !== "undefined" && document?.dir === "rtl";

	const orderedDays = WEEK_DAYS;

	const isSelected = (k) => (days || []).includes(k);
	const setSorted = (arr) => setDays(Array.from(new Set(arr)));

	const toggle = (k) => {
		const cur = new Set(days || []);
		cur.has(k) ? cur.delete(k) : cur.add(k);
		setSorted([...cur]);
	};

	const setAll = () => setSorted(WEEK_DAYS.map((d) => d.key));
	const setNone = () => setDays([]);
	const setWeekdays = () => setSorted(["MO", "TU", "WE", "TH", "FR"]);
	const setWeekend = () => setSorted(["SU", "SA"]);

	const onKey = (e, idx, k) => {
		const prevKey = isRTL ? "ArrowRight" : "ArrowLeft";
		const nextKey = isRTL ? "ArrowLeft" : "ArrowRight";
		const btns =
			e.currentTarget.parentElement?.querySelectorAll('[data-day-btn="1"]');
		if (e.key === nextKey || e.key === "ArrowDown") {
			e.preventDefault();
			btns?.[(idx + 1) % orderedDays.length]?.focus();
		}
		if (e.key === prevKey || e.key === "ArrowUp") {
			e.preventDefault();
			btns?.[(idx - 1 + orderedDays.length) % orderedDays.length]?.focus();
		}
		if (e.key === " " || e.key === "Enter") {
			e.preventDefault();
			toggle(k);
		}
	};

	return (
		<div className="md:col-span-2">
			<label className="mb-1.5 block text-sm font-medium text-slate-700">
				{safeT(t, "form.weekdays", "Week days")}
			</label>

			<div className="mb-2 flex items-center gap-2">
				<div className="flex flex-wrap items-center gap-2">
					<button
						type="button"
						onClick={setAll}
						className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 text-slate-700 px-3 h-8 text-sm hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-blue-400/50"
					>
						<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
							<path d="M4 12l6 6L20 6" />
							<path d="M9 12l3 3" />
						</svg>
						{safeT(t, "week.quick.all", "All")}
					</button>

					<button
						type="button"
						onClick={setNone}
						className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 text-slate-700 px-3 h-8 text-sm hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-blue-400/50"
					>
						<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
							<rect x="4" y="4" width="16" height="16" rx="2" />
						</svg>
						{safeT(t, "week.quick.none", "None")}
					</button>
				</div>
			</div>

			<div className="flex flex-wrap gap-2">
				{orderedDays.map((d, idx) => {
					const selected = isSelected(d.key);
					return (
						<button
							key={d.key}
							type="button"
							role="checkbox"
							aria-checked={selected}
							data-day-btn="1"
							title={safeT(t, `weekday.${d.label}`, d.label)}
							onClick={() => toggle(d.key)}
							onKeyDown={(e) => onKey(e, idx, d.key)}
							className={[
								"h-9 min-w-9 px-3 rounded-lg text-sm font-medium transition-all select-none",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50",
								selected
									? "bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 text-white shadow-sm"
									: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
							].join(" ")}
						>
							{safeT(t, `weekday.${d.label}`, d.label)}
						</button>
					);
				})}
			</div>
		</div>
	);
}

function formatSchedule(t, rem) {
	const s = rem.schedule || defaultSchedule();
	const times = (s.times || []).map(formatTime12).join("، ");
	if (s.mode === "prayer" && s.prayer) {
		const dir =
			s.prayer.direction === "before"
				? safeT(t, "before", "Before")
				: safeT(t, "after", "After");
		return `${safeT(t, arPrayer(s.prayer.name), s.prayer.name)} • ${dir} ${s.prayer.offsetMin
			} ${safeT(t, "minutesShort", "min")}`;
	}
	const labelByMode = {
		once: `${safeT(t, "mode.once", "Once")} (${times})`,
		daily: `${safeT(t, "mode.daily", "Daily")} (${times})`,
		weekly: `${safeT(t, "mode.weekly", "Weekly")} ${(s.daysOfWeek || [])
			.map((k) => safeWeekdayShort(t, k))
			.join("، ") || "—"} (${times})`,
		monthly: `${safeT(t, "mode.monthly", "Monthly")} (${times})`,
		interval: s.interval
			? `${safeT(t, "mode.intervalEvery", "Every")} ${s.interval.every} ${safeT(
				t,
				`unit.${s.interval.unit}`,
				s.interval.unit
			)} (${safeT(t, "form.from", "from")} ${formatTime12(
				s.times?.[0] || "—"
			)})`
			: safeT(t, "mode.interval", "Interval"),
	};
	return labelByMode[s.mode] || labelByMode.daily;
}

function safeWeekdayShort(t, k) {
	const map = {
		SU: "weekdayShort.SU",
		MO: "weekdayShort.MO",
		TU: "weekdayShort.TU",
		WE: "weekdayShort.WE",
		TH: "weekdayShort.TH",
		FR: "weekdayShort.FR",
		SA: "weekdayShort.SA",
	};
	return safeT(t, map[k] || k, k);
}

/* ---------- Snooze Select ---------- */

function SnoozeSelect({ t, onPick }) {
	const [open, setOpen] = useState(false);
	const [custom, setCustom] = useState("");

	const options = [
		{ id: "5", label: safeT(t, "snooze.5", "5 min") },
		{ id: "10", label: safeT(t, "snooze.10", "10 min") },
		{ id: "30", label: safeT(t, "snooze.30", "30 min") },
		{ id: "60", label: safeT(t, "snooze.60", "60 min") },
		{ id: "custom", label: safeT(t, "snooze.custom", "Custom…") },
	];

	return (
		<div className="relative flex items-center gap-1">
			<Select
				options={options}
				value={null}
				onChange={(val) => {
					if (val === "custom") setOpen(true);
					else {
						const n = Number(val);
						if (!Number.isNaN(n)) onPick(n);
					}
				}}
				placeholder={safeT(t, "snooze.placeholder", "Snooze")}
				clearable={false}
				cnInputParent={"!h-[32px] !border-slate-200 "}
				className="min-w-[90px]  "
			/>
			<AnimatePresence>
				{open && (
					<motion.div
						className="absolute right-0 top-full z-50 mt-2 rounded-lg border border-slate-200 bg-white p-3 shadow-xl"
						initial={{ opacity: 0, y: -4 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -4 }}
					>
						<div className="text-sm text-slate-700 mb-2">
							{safeT(t, "snooze.customLabel", "Minutes")}
						</div>
						<div className="flex items-center gap-2">
							<input
								type="number"
								min={1}
								className="h-[36px] w-[120px] rounded-lg border border-slate-300 px-2 text-sm"
								value={custom}
								onChange={(e) => setCustom(e.target.value)}
							/>
							<button
								className="rounded-lg bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 hover:via-indigo-600 hover:to-blue-700 text-white px-3 py-2 text-xs"
								onClick={() => {
									const n = Number(custom);
									if (!Number.isNaN(n) && n > 0) onPick(n);
									setOpen(false);
									setCustom("");
								}}
							>
								{safeT(t, "actions.confirm", "Confirm")}
							</button>
							<button
								className="rounded-lg px-3 py-2 text-xs"
								onClick={() => setOpen(false)}
							>
								{safeT(t, "actions.cancel", "Cancel")}
							</button>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

/* ---------- Settings panel ---------- */

function SettingsPanel({ t, value, onChange }) {
	const [v, setV] = useState(value);
	const set = (patch) => setV((s) => ({ ...s, ...patch }));
	const save = async () => {
		try {
			const saved = await updateUserSettingsApi(v);
			onChange(saved);
		} catch { }
	};

	return (
		<div className="grid gap-4">
			<div className="grid grid-cols-1 gap-3 md:grid-cols-3">
				<Input
					label={safeT(t, "settings.timezone", "Timezone")}
					cnInputParent="h-[40px]"
					value={v.timezone}
					onChange={(x) => set({ timezone: x })}
				/>
				<Input
					label={safeT(t, "settings.city", "City")}
					cnInputParent="h-[40px]"
					value={v.city}
					onChange={(x) => set({ city: x })}
				/>
				<Input
					label={safeT(t, "settings.country", "Country")}
					cnInputParent="h-[40px]"
					value={v.country}
					onChange={(x) => set({ country: x })}
				/>
			</div>
			<div className="grid grid-cols-1 gap-3 md:grid-cols-3">
				<div>
					<label className="mb-1 block text-sm text-slate-600">
						{safeT(t, "settings.quietFrom", "Quiet from")}
					</label>
					<Input
						value={v.quietHours.start}
						onChange={(x) => set({ quietHours: { ...v.quietHours, start: x } })}
						placeholder="10:00 PM"
					/>
				</div>
				<div>
					<label className="mb-1 block text-sm text-slate-600">
						{safeT(t, "settings.quietTo", "Quiet to")}
					</label>
					<Input
						value={v.quietHours.end}
						onChange={(x) => set({ quietHours: { ...v.quietHours, end: x } })}
						placeholder="07:00 AM"
					/>
				</div>
				<Input
					label={safeT(t, "settings.defaultSnooze", "Default snooze (min)")}
					type="number"
					cnInputParent="h-[40px]"
					value={v.defaultSnooze}
					onChange={(x) => set({ defaultSnooze: Number(x) || 10 })}
				/>
			</div>
			<div className="flex justify-end">
				<button
					onClick={save}
					className="rounded-lg bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 hover:via-indigo-600 hover:to-blue-700 text-white px-4 py-2"
				>
					{safeT(t, "actions.save", "Save")}
				</button>
			</div>
		</div>
	);
}

/* ---------- Calendar ---------- */

function CalendarView({ t, reminders, settings }) {
	const [cursor, setCursor] = useState(new Date());
	const [selectedDate, setSelectedDate] = useState(null);

	const y = cursor.getFullYear();
	const m = cursor.getMonth();

	const first = new Date(y, m, 1);
	const startWeekday = (first.getDay() + 6) % 7; // Monday-first grid
	const daysInMonth = new Date(y, m + 1, 0).getDate();

	const daySlots = [];
	for (let i = 0; i < startWeekday; i++) daySlots.push(null);
	for (let d = 1; d <= daysInMonth; d++) daySlots.push(new Date(y, m, d));

	const byDay = new Map();
	reminders.forEach((r) => {
		const s = r.schedule || {};
		if (s.mode === "once") {
			const dt = new Date(`${s.startDate}T00:00:00`);
			const key = toISODate(dt);
			byDay.set(key, [...(byDay.get(key) || []), r]);
			return;
		}
		for (let d = 1; d <= daysInMonth; d++) {
			const day = new Date(y, m, d);
			const key = toISODate(day);
			if (s.mode === "weekly") {
				const code = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][day.getDay()];
				if ((s.daysOfWeek || []).includes(code))
					byDay.set(key, [...(byDay.get(key) || []), r]);
			} else {
				byDay.set(key, [...(byDay.get(key) || []), r]);
			}
		}
	});

	const selectedKey = selectedDate ? toISODate(selectedDate) : null;
	const selectedList = selectedKey ? byDay.get(selectedKey) || [] : [];

	return (
		<div className="grid gap-4 md:grid-cols-5">
			<div className="md:col-span-3">
				<div className="mb-3 flex items-center justify-between">
					<button
						className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
						onClick={() => setCursor(new Date(y, m - 1, 1))}
						aria-label={safeT(t, "calendar.prev", "Previous month")}
						title={safeT(t, "calendar.prev", "Previous month")}
					>
						<ChevronRight className="w-4 h-4" />
					</button>
					<div className="text-slate-800 font-medium">
						{cursor.toLocaleDateString("ar-EG", { month: "long", year: "numeric" })}
					</div>
					<button
						className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
						onClick={() => setCursor(new Date(y, m + 1, 1))}
						aria-label={safeT(t, "calendar.next", "Next month")}
						title={safeT(t, "calendar.next", "Next month")}
					>
						<ChevronLeft className="w-4 h-4" />
					</button>
				</div>

				<div className="grid grid-cols-7 gap-2 text-center text-[13px] text-slate-500">
					{["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => (
						<div key={d} className="py-1">
							{safeT(t, `weekday.header.${d}`, d)}
						</div>
					))}
				</div>
				<div className="mt-2 grid grid-cols-7 gap-2">
					{daySlots.map((d, i) => {
						if (!d) return <div key={i} className="rounded-lg border border-transparent p-3" />;
						const key = toISODate(d);
						const list = byDay.get(key) || [];
						const count = list.length;
						const isToday = sameDay(d, new Date());
						const isSelected = selectedDate && sameDay(d, selectedDate);
						return (
							<button
								key={i}
								onClick={() => setSelectedDate(d)}
								className={`text-left rounded-lg border p-3 min-h-[70px] text-sm transition ${isSelected
									? "border-blue-600 bg-blue-50/60"
									: isToday
										? "border-emerald-400 bg-emerald-50/40"
										: "border-slate-200 bg-white hover:bg-slate-50"
									}`}
								aria-label={safeT(t, "calendar.dayDetails", "Day details")}
								title={safeT(t, "calendar.dayDetails", "Day details")}
							>
								<div className="flex items-center justify-between">
									<span className="text-slate-700">{d.getDate()}</span>
									{count > 0 && (
										<span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-white">
											{count}
										</span>
									)}
								</div>
								<div className="mt-2 flex gap-1 flex-wrap">
									{Array.from({ length: Math.min(count, 5) }).map((_, idx) => (
										<span key={idx} className="h-1.5 w-1.5 rounded-full bg-slate-400" />
									))}
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Right pane */}
			<div className="md:col-span-2">
				<div className="rounded-lg border border-slate-200 bg-white p-3">
					<div className="mb-2 text-slate-700 font-medium">
						{selectedDate
							? safeT(t, "calendar.remindersOf", "Reminders of") +
							" " +
							selectedDate.toLocaleDateString("ar-EG", {
								weekday: "long",
								day: "numeric",
								month: "long",
							})
							: safeT(t, "calendar.pickDay", "Pick a day")}
					</div>
					<div className="space-y-2">
						{selectedList.length === 0 ? (
							<p className="text-sm text-slate-500">
								{safeT(t, "calendar.none", "No reminders")}
							</p>
						) : (
							selectedList.map((r, idx) => (
								<div key={idx} className="rounded-lg border border-slate-200 p-2">
									<div className="text-sm font-medium text-slate-800">
										{safeT(
											t,
											r.title || "untitled",
											r.title || safeT(t, "untitled", "Untitled")
										)}
									</div>
									<div className="text-xs text-slate-600">{formatSchedule(t, r)}</div>
								</div>
							))
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

/* ---------- Quick Create component ---------- */
function QuickCreate({ t, onPick }) {
	const [open, setOpen] = useState(false);
	const options = [
		{ id: "5", label: "5" },
		{ id: "10", label: "10" },
		{ id: "15", label: "15" },
		{ id: "30", label: "30" },
		{ id: "50", label: "50" },
		{ id: "custom", label: safeT(t, "quick.custom", "Custom…") },
	];
	const [custom, setCustom] = useState("");

	return (
		<div className="relative">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className=" flex gap-1 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
				aria-label={safeT(t, "quick.title", "Quick reminder")}
				title={safeT(t, "quick.title", "Quick reminder")}
			>
				<Zap className="inline-block w-4 h-4 mt-[2px] " />
				{safeT(t, "quick.after", "After X min")}
			</button>

			<AnimatePresence>
				{open && (
					<motion.div
						className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-xl z-50"
						initial={{ opacity: 0, y: -4 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -4 }}
					>
						<div className="grid gap-1 max-h-[105px] overflow-y-auto ">
							{options.slice(0, 4).map((o) => (
								<button
									key={o.id}
									className=" rtl:text-right text-left rounded-md text-slate-800 px-3 py-2 text-sm hover:bg-slate-50"
									onClick={() => {
										onPick(Number(o.id));
										setOpen(false);
									}}
								>
									{safeT(t, "quick.createIn", "Create in")} {o.id} {safeT(t, "minutesShort", "min")}
								</button>
							))}
							<div className="border-t border-slate-100 my-1" />
							<div className="flex items-center gap-2 px-2">
								<input
									type="number"
									min={1}
									placeholder={safeT(t, "quick.custom", "Custom…")}
									className=" text-slate-800 h-[36px] w-full rounded-lg border border-slate-300 px-2 text-sm"
									value={custom}
									onChange={(e) => setCustom(e.target.value)}
								/>
								<button
									className="rounded-lg bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 hover:via-indigo-600 hover:to-blue-700 text-white px-3 py-2 text-xs"
									onClick={() => {
										const n = Number(custom);
										if (!Number.isNaN(n) && n > 0) onPick(n);
										setCustom("");
										setOpen(false);
									}}
								>
									{safeT(t, "actions.add", "Add")}
								</button>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

/* ========================= END OF FILE ========================= */
