/**
 * Shared server helpers for the wardrobe AI routes: auth (the dashboard's own JWT, checked
 * against the backend), per-user rate limits, request size limits, and the Anthropic client.
 * The API key is read from the server environment only and never reaches the browser.
 */
import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

export const WARDROBE_AI_MODEL = process.env.WARDROBE_AI_MODEL || 'claude-opus-5-5';
// Server-side refusal fallback is only accepted on these models.
const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-2', 'claude-fable-5-1', 'claude-sonnet-5-5']);

export function aiConfigured() {
	return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let client = null;
export function anthropic() {
	client ||= new Anthropic();
	return client;
}

/** Extra request fields for refusal fallbacks when the configured model supports them. */
export function fallbackParams(model = WARDROBE_AI_MODEL) {
	return FALLBACK_MODELS.has(model) ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {};
}

export function jsonError(status, code, extra = {}) {
	return NextResponse.json({ error: code, ...extra }, { status });
}

/* ---------- Auth: verify the bearer token with the backend (cached briefly) ---------- */
const authCache = new Map();
const AUTH_TTL_MS = 5 * 60_000;

function backendOrigin() {
	return String(process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
}

export async function requireUser(request) {
	const header = request.headers.get('authorization') || '';
	const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
	if (!token || token.length > 4096) return null;
	const cached = authCache.get(token);
	if (cached && cached.until > Date.now()) return cached.user;
	const origin = backendOrigin();
	if (!origin) return null;
	try {
		const res = await fetch(`${origin}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
		if (!res.ok) return null;
		const body = await res.json().catch(() => null);
		const user = body?.user || body?.data || body;
		const id = user?.id || user?._id || user?.userId;
		if (!id) return null;
		const value = { id: String(id) };
		authCache.set(token, { user: value, until: Date.now() + AUTH_TTL_MS });
		if (authCache.size > 2000) authCache.delete(authCache.keys().next().value);
		return value;
	} catch {
		return null;
	}
}

/* ---------- Rate limits: per user, per route, rolling hour + day (in memory) ---------- */
const buckets = new Map();
const LIMITS = {
	analyze: { hour: Number(process.env.WARDROBE_AI_ANALYZE_PER_HOUR) || 60, day: Number(process.env.WARDROBE_AI_ANALYZE_PER_DAY) || 200 },
	chat: { hour: Number(process.env.WARDROBE_AI_CHAT_PER_HOUR) || 40, day: Number(process.env.WARDROBE_AI_CHAT_PER_DAY) || 150 },
};

export function takeQuota(userId, route) {
	const key = `${route}:${userId}`;
	const now = Date.now();
	const list = (buckets.get(key) || []).filter(t => now - t < 86_400_000);
	const lastHour = list.filter(t => now - t < 3_600_000).length;
	const limit = LIMITS[route];
	if (lastHour >= limit.hour || list.length >= limit.day) {
		buckets.set(key, list);
		return { ok: false, usedToday: list.length, limitToday: limit.day };
	}
	list.push(now);
	buckets.set(key, list);
	return { ok: true, usedToday: list.length, limitToday: limit.day };
}

/** Reject bodies over `maxBytes` before parsing them. */
export async function readJson(request, maxBytes) {
	const length = Number(request.headers.get('content-length') || 0);
	if (length && length > maxBytes) return { tooLarge: true };
	const text = await request.text();
	if (text.length > maxBytes) return { tooLarge: true };
	try {
		return { body: JSON.parse(text) };
	} catch {
		return { invalid: true };
	}
}

/** Map SDK errors to friendly status codes (typed classes, most specific first). */
export function aiErrorResponse(error, route) {
	if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) return jsonError(503, 'ai_not_configured');
	if (error instanceof Anthropic.RateLimitError) return jsonError(429, 'ai_busy');
	if (error instanceof Anthropic.BadRequestError) {
		console.error(`[wardrobe/${route}] bad request`, error.message);
		return jsonError(502, 'ai_failed');
	}
	if (error instanceof Anthropic.APIError) {
		console.error(`[wardrobe/${route}] api error`, error.status, error.message);
		return jsonError(502, 'ai_failed');
	}
	console.error(`[wardrobe/${route}]`, error);
	return jsonError(500, 'ai_failed');
}
