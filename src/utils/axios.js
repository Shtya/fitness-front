// lib/axios.js
import axios from 'axios';

/** Trim so trailing spaces in .env cannot produce Invalid URL (local-only footgun). */
const API_ORIGIN = String(process.env.NEXT_PUBLIC_BASE_URL || '')
	.trim()
	.replace(/\/$/, '');

/**
 * Production owns Baileys sessions. Local API often has WHATSAPP_SESSIONS_ENABLED=false
 * (shared prod DB via tunnel). Socket already uses this origin; live REST must match
 * or Sync now / story media hit a machine with no linked phone.
 */
const WHATSAPP_LIVE_ORIGIN = String(
	process.env.NEXT_PUBLIC_WHATSAPP_SOCKET_URL || process.env.NEXT_PUBLIC_BASE_URL || '',
)
	.trim()
	.replace(/\/$/, '');

export const baseImg = API_ORIGIN;
export const whatsappLiveOrigin = WHATSAPP_LIVE_ORIGIN || API_ORIGIN;

function detectLangFromURL() {
	if (typeof window === 'undefined') return 'en';
	const path = window.location.pathname; // e.g. "/ar/dashboard/nutrition"
	const firstSegment = path.split('/')[1]; // "ar"
	// Adjust if your supported locales list differs
	return ['ar', 'en'].includes(firstSegment) ? firstSegment : 'en';
}

function attachAuthInterceptors(client) {
	client.interceptors.request.use(
		config => {
			const accessToken = localStorage.getItem('accessToken');
			if (accessToken) {
				config.headers.Authorization = `Bearer ${accessToken}`;
			}
			const lang = detectLangFromURL();
			config.params = {
				...(config.params || {}),
				lang: config.params?.lang || lang,
			};
			return config;
		},
		error => Promise.reject(error),
	);

	client.interceptors.response.use(
		response => response,
		error => {
			// Background badge/polls can opt out so a single 401 does not hard-logout the session.
			if (error.response?.status === 401 && !error.config?.skipAuthRedirect) {
				localStorage.removeItem('accessToken');
				localStorage.removeItem('user');
				window.location.href = '/auth';
			}
			return Promise.reject(error);
		},
	);
	return client;
}

const api = attachAuthInterceptors(
	axios.create({
		baseURL: `${API_ORIGIN}/api/v1`,
		timeout: 120000,
	}),
);

/** Session-bound WhatsApp calls (stories sync/media, live provider). */
export const whatsappLiveApi = attachAuthInterceptors(
	axios.create({
		baseURL: `${whatsappLiveOrigin}/api/v1`,
		timeout: 120000,
	}),
);

export default api;
