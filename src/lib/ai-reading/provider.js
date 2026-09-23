/**
 * Abstract AI provider for the Reading Library.
 * Server-only — never import from client components.
 *
 * Pipeline (preferred → fallback):
 *   1) Direct free providers (LLM7 / Pollinations) using the model selected in reading AI settings
 *   2) Workspace Nest AI (/ai-free or /ai/generate) when JWT is present (Gemini / paid)
 *   3) Legacy env OpenAI-compatible keys (AI_READING_* / OPENAI_* / MSE_AI_*)
 *
 * Free models do NOT need an API key — selecting LLM7 / Llama in settings is enough.
 */

import {
	DEFAULT_READING_MODEL_KEY,
	DEFAULT_READING_PROVIDER,
	READING_AI_FEATURE,
} from './ai-defaults.js';

export { DEFAULT_READING_MODEL_KEY, DEFAULT_READING_PROVIDER, READING_AI_FEATURE };

const FREE_PROVIDERS = new Set(['llm7-free', 'pollinations-free', 'browser-chatgpt', 'ai-free']);

function config() {
	const base =
		process.env.AI_READING_BASE_URL ||
		process.env.OPENAI_BASE_URL ||
		process.env.MSE_AI_BASE_URL ||
		'https://api.openai.com/v1';
	const key =
		process.env.AI_READING_API_KEY ||
		process.env.OPENAI_API_KEY ||
		process.env.MSE_AI_API_KEY ||
		'';
	const model =
		process.env.AI_READING_MODEL ||
		process.env.OPENAI_MODEL ||
		process.env.MSE_AI_MODEL ||
		'gpt-4o-mini';
	const memorizeModel =
		process.env.AI_READING_MEMORIZE_MODEL ||
		process.env.AI_READING_STRONG_MODEL ||
		model;
	return {
		base: String(base).replace(/\/$/, ''),
		key: String(key).trim(),
		model: String(model).trim(),
		memorizeModel: String(memorizeModel).trim(),
	};
}

function nestApiBase() {
	const raw =
		process.env.AI_READING_NEST_BASE_URL ||
		process.env.BACKEND_INTERNAL_URL ||
		process.env.NEXT_PUBLIC_BASE_URL ||
		'';
	return String(raw).trim().replace(/\/$/, '');
}

export function resolveProvider(provider, modelKey) {
	const p = String(provider || '').trim();
	if (p) return p;
	const key = String(modelKey || '').trim();
	if (!key || key === 'auto') return DEFAULT_READING_PROVIDER;
	if (key.startsWith('gemini')) return 'gemini';
	if (key === 'pollinations') return 'pollinations-free';
	if (key === 'chatgpt') return 'browser-chatgpt';
	if (key.includes('llama') || key.includes('gpt-oss') || key.includes(':') || /llm\s*7|llm7/i.test(key)) {
		return 'llm7-free';
	}
	return DEFAULT_READING_PROVIDER;
}

export function isFreeReadingProvider(provider, modelKey) {
	return FREE_PROVIDERS.has(resolveProvider(provider, modelKey));
}

/**
 * Reading AI is configured when:
 * - a free model is selected (LLM7 / Pollinations — no key needed), OR
 * - user JWT can reach Nest, OR
 * - legacy OpenAI-compatible env key exists
 */
export function isAiConfigured(opts = {}) {
	if (opts?.authHeader || opts?.authorization) return true;
	if (config().key) return true;
	if (isFreeReadingProvider(opts.provider, opts.modelKey)) return true;
	// Default reading model is free — always allow the try
	return true;
}

/** Public status for UI — never expose the key. */
export function getAiStatus() {
	const { base, key, model } = config();
	let host = 'openai';
	try {
		host = new URL(base).hostname.replace(/^www\./, '');
	} catch {
		/* keep default */
	}
	const nest = nestApiBase();
	return {
		configured: true,
		model,
		host,
		label: `System free AI · ${DEFAULT_READING_MODEL_KEY}`,
		defaultModelKey: DEFAULT_READING_MODEL_KEY,
		defaultProvider: DEFAULT_READING_PROVIDER,
		feature: READING_AI_FEATURE,
		provider: nest ? 'system' : key ? 'env' : 'free-direct',
		hasEnvKey: Boolean(key),
		hasNest: Boolean(nest),
	};
}

function extractJson(raw) {
	if (raw == null) throw new Error('Empty AI response');
	if (typeof raw === 'object') return raw;
	let text = String(raw).trim();
	text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
	const start = text.indexOf('{');
	const end = text.lastIndexOf('}');
	if (start >= 0 && end > start) text = text.slice(start, end + 1);
	return JSON.parse(text);
}

function clip(text, max = 7500) {
	const s = String(text || '');
	return s.length <= max ? s : s.slice(0, max);
}

async function completeViaLlm7({ messages, modelKey, maxTokens, temperature }) {
	const baseUrl = (process.env.AI_FREE_LLM7_BASE_URL || 'https://api.llm7.io/v1').replace(/\/$/, '');
	const apiKey = process.env.AI_FREE_LLM7_API_KEY || 'unused';
	const model =
		(modelKey && modelKey !== 'auto' ? modelKey : '') ||
		process.env.AI_FREE_LLM7_MODEL ||
		DEFAULT_READING_MODEL_KEY;

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 90_000);
	try {
		const res = await fetch(`${baseUrl}/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model,
				messages,
				max_tokens: Math.min(Math.max(Number(maxTokens) || 2048, 64), 8192),
				temperature: temperature ?? 0.3,
			}),
			signal: controller.signal,
		});
		const raw = await res.text();
		if (!res.ok) {
			throw new Error(`LLM7 unavailable (${res.status}): ${raw.slice(0, 180)}`);
		}
		let parsed;
		try {
			parsed = JSON.parse(raw);
		} catch {
			throw new Error('LLM7 returned invalid JSON');
		}
		const message = parsed?.choices?.[0]?.message;
		const text = String(
			message?.content || message?.reasoning || message?.reasoning_content || '',
		).trim();
		if (!text) throw new Error('LLM7 returned an empty response');
		return {
			raw: text,
			provider: 'llm7-free',
			model: parsed?.model ? String(parsed.model) : model,
			via: 'llm7-direct',
		};
	} finally {
		clearTimeout(timer);
	}
}

async function completeViaPollinations({ messages }) {
	const system = messages
		.filter(m => m.role === 'system')
		.map(m => m.content)
		.join('\n')
		.trim();
	const dialogue = messages
		.filter(m => m.role !== 'system')
		.map(m => `${m.role.toUpperCase()}: ${m.content}`)
		.join('\n');
	const prompt = [system ? `SYSTEM: ${system}` : '', dialogue].filter(Boolean).join('\n\n').slice(0, 3500);
	const baseUrl = (process.env.AI_FREE_POLLINATIONS_BASE_URL || 'https://text.pollinations.ai').replace(
		/\/$/,
		'',
	);
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 90_000);
	try {
		const res = await fetch(`${baseUrl}/${encodeURIComponent(prompt)}`, {
			method: 'GET',
			headers: { Accept: 'text/plain' },
			signal: controller.signal,
		});
		const text = String(await res.text()).trim();
		if (!res.ok) throw new Error(`Pollinations unavailable (${res.status})`);
		if (!text) throw new Error('Pollinations returned an empty response');
		return { raw: text, provider: 'pollinations-free', model: 'pollinations', via: 'pollinations-direct' };
	} finally {
		clearTimeout(timer);
	}
}

async function completeViaFreeDirect({ messages, modelKey, provider, maxTokens, temperature }) {
	const resolved = resolveProvider(provider, modelKey);
	const errors = [];

	const order =
		resolved === 'pollinations-free'
			? ['pollinations-free', 'llm7-free']
			: ['llm7-free', 'pollinations-free'];

	for (const name of order) {
		try {
			if (name === 'llm7-free') {
				return await completeViaLlm7({ messages, modelKey, maxTokens, temperature });
			}
			return await completeViaPollinations({ messages });
		} catch (e) {
			errors.push(`${name}: ${e.message || e}`);
		}
	}
	const err = new Error(errors[0] || 'All free AI providers failed');
	err.code = 'FREE_AI_FAILED';
	err.errors = errors;
	throw err;
}

async function completeViaSystemAi({ system, user, temperature, modelKey, provider, authHeader, maxTokens }) {
	const nest = nestApiBase();
	if (!nest) {
		const err = new Error('SYSTEM_AI_UNAVAILABLE');
		err.code = 'SYSTEM_AI_UNAVAILABLE';
		throw err;
	}
	const auth = String(authHeader || '').trim();
	if (!auth) {
		const err = new Error('AI_AUTH_REQUIRED');
		err.code = 'AI_AUTH_REQUIRED';
		throw err;
	}

	const resolvedProvider = resolveProvider(provider, modelKey);
	const useFree = FREE_PROVIDERS.has(resolvedProvider);
	const headers = {
		'Content-Type': 'application/json',
		Authorization: auth.startsWith('Bearer ') ? auth : `Bearer ${auth}`,
	};

	if (useFree) {
		const freeProvider = resolvedProvider === 'ai-free' ? DEFAULT_READING_PROVIDER : resolvedProvider;
		const res = await fetch(`${nest}/api/v1/ai-free/chat`, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				messages: [
					{ role: 'system', content: clip(system, 7500) },
					{ role: 'user', content: clip(user, 7500) },
				],
				provider: freeProvider === 'browser-chatgpt' ? 'llm7-free' : freeProvider,
				model: modelKey && modelKey !== 'auto' ? modelKey : undefined,
				feature: READING_AI_FEATURE,
				allowFallback: true,
				useProjectKnowledge: false,
				excludeProviders: ['browser-chatgpt'],
				maxTokens: maxTokens || 4096,
				httpTimeoutMs: 90_000,
			}),
		});
		const data = await res.json().catch(() => ({}));
		if (!res.ok) {
			throw new Error(
				(Array.isArray(data.message) ? data.message[0] : data.message) ||
					data.error ||
					`System AI free error ${res.status}`,
			);
		}
		return {
			raw: data.reply,
			provider: data.provider || freeProvider,
			model: data.actualModel || modelKey || DEFAULT_READING_MODEL_KEY,
			via: 'ai-free',
		};
	}

	const res = await fetch(`${nest}/api/v1/ai/generate/text`, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			system: clip(system, 8000),
			prompt: clip(user, 16000),
			model: modelKey || undefined,
			feature: READING_AI_FEATURE,
			temperature: temperature ?? 0.4,
			maxTokens: maxTokens || 4096,
		}),
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(
			(Array.isArray(data.message) ? data.message[0] : data.message) ||
				data.error ||
				`System AI error ${res.status}`,
		);
	}
	const text = data.text || data.payload?.text || '';
	return {
		raw: text,
		provider: resolvedProvider,
		model: data.model || modelKey,
		via: 'ai',
	};
}

function packResult(result, json) {
	if (!json) return { raw: result.raw, data: result, provider: result.provider, model: result.model };
	return {
		json: extractJson(result.raw),
		raw: result.raw,
		data: result,
		provider: result.provider,
		model: result.model,
	};
}

/**
 * @param {{ messages: Array<{role:string,content:string}>, temperature?: number, json?: boolean, model?: string, modelKey?: string, provider?: string, authHeader?: string, maxTokens?: number }} opts
 */
export async function chatCompletion({
	messages,
	temperature = 0.5,
	json = true,
	model: modelOverride,
	modelKey,
	provider,
	authHeader,
	authorization,
	maxTokens,
}) {
	const auth = authHeader || authorization;
	const key = modelKey || modelOverride;
	const resolved = resolveProvider(provider, key);
	const errors = [];

	const system = messages
		.filter(m => m.role === 'system')
		.map(m => m.content)
		.join('\n\n');
	const userJoined = messages
		.filter(m => m.role !== 'system')
		.map(m => (m.role === 'user' ? m.content : `${m.role}: ${m.content}`))
		.join('\n\n');

	// 1) Free models → call LLM7 / Pollinations directly (no Nest, no API key)
	if (FREE_PROVIDERS.has(resolved)) {
		try {
			const result = await completeViaFreeDirect({
				messages: messages.map(m => ({
					role: m.role,
					content: clip(m.content, m.role === 'system' ? 7500 : 7500),
				})),
				modelKey: key,
				provider: resolved,
				maxTokens,
				temperature,
			});
			return packResult(result, json);
		} catch (e) {
			errors.push(e.message || String(e));
			/* continue to Nest / env */
		}
	}

	// 2) Nest workspace AI (needed for Gemini / paid, also backup for free)
	if (auth && nestApiBase()) {
		try {
			const result = await completeViaSystemAi({
				system: system || 'You are a helpful reading assistant. Return JSON when asked.',
				user: userJoined || messages.map(m => m.content).join('\n'),
				temperature,
				modelKey: key,
				provider: resolved,
				authHeader: auth,
				maxTokens,
			});
			return packResult(result, json);
		} catch (e) {
			errors.push(e.message || String(e));
		}
	}

	// 3) Legacy env OpenAI-compatible
	const { base, key: apiKey, model } = config();
	if (apiKey) {
		const url = `${base}/chat/completions`;
		const body = {
			model: key || model,
			messages,
			temperature,
		};
		if (json) body.response_format = { type: 'json_object' };

		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify(body),
		});

		if (!res.ok) {
			const detail = await res.text().catch(() => '');
			errors.push(`AI provider error ${res.status}: ${detail.slice(0, 240)}`);
		} else {
			const data = await res.json();
			const content = data?.choices?.[0]?.message?.content;
			if (!json) return { raw: content, data, provider: 'env', model: key || model };
			return { json: extractJson(content), raw: content, data, provider: 'env', model: key || model };
		}
	}

	const err = new Error(errors[0] || 'AI_NOT_CONFIGURED');
	err.code = errors.length ? 'AI_ALL_FAILED' : 'AI_NOT_CONFIGURED';
	err.errors = errors;
	throw err;
}

export async function completeJson(system, user, temperature = 0.45, opts = {}) {
	const { json, provider, model } = await chatCompletion({
		messages: [
			{ role: 'system', content: system },
			{ role: 'user', content: user },
		],
		temperature,
		json: true,
		model: opts.model,
		modelKey: opts.modelKey || opts.model,
		provider: opts.provider,
		authHeader: opts.authHeader || opts.authorization,
		maxTokens: opts.maxTokens,
	});
	if (json && typeof json === 'object') {
		json.__provider = provider;
		json.__model = model;
	}
	return json;
}

/** Prefer stronger model for reading compression / translation when configured. */
export function getMemorizeModel() {
	return config().memorizeModel;
}

/** Extract auth + model routing from a Next.js Request + JSON body. */
export function readingAiOpts(request, body = {}) {
	const authHeader = request?.headers?.get?.('authorization') || body.authorization || '';
	const modelKey = String(body.modelKey || body.model || '').trim() || DEFAULT_READING_MODEL_KEY;
	const provider = String(body.provider || '').trim() || resolveProvider('', modelKey);
	return {
		authHeader,
		modelKey,
		provider,
		feature: READING_AI_FEATURE,
		maxTokens: Number(body.maxTokens) > 0 ? Number(body.maxTokens) : 4096,
	};
}
