import { NextResponse } from 'next/server';
import { isAiConfigured, completeJson, readingAiOpts } from '@/lib/ai-reading/provider';
import { buildImportEnhanceSystem } from '@/lib/ai-reading/prompts';
import { normalizeAiBook, transformRawToBook } from '@/lib/ai-reading/transform';
import { enqueueReviewItems } from '@/lib/ai-reading/spaced-review';
import {
	extractChatGptShare,
	isChatGptShareUrl,
	messagesToMarkdown,
} from '@/lib/ai-reading/chatgpt-share';
import { claudeShareId, claudeSnapshotUrl, extractClaudeSnapshot } from '@/lib/ai-reading/claude-share';

export const runtime = 'nodejs';
export const maxDuration = 120;

const BROWSER_UA =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function fetchText(url, { timeoutMs = 20000, accept = 'text/html,application/xhtml+xml', headers = {} } = {}) {
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), timeoutMs);
	try {
		const res = await fetch(url, {
			headers: {
				'User-Agent': BROWSER_UA,
				Accept: accept,
				...headers,
			},
			redirect: 'follow',
			signal: ctrl.signal,
		});
		const text = await res.text();
		return { ok: res.ok, status: res.status, text };
	} finally {
		clearTimeout(timer);
	}
}

function decodeEntities(html) {
	return String(html || '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&#x27;/g, "'")
		.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripTags(html) {
	return decodeEntities(String(html || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

export function htmlToStructuredMarkdown(html) {
	let text = String(html || '');
	text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
	text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
	text = text.replace(/<br\s*\/?>/gi, '\n');
	text = text.replace(/<\/(p|div|li|tr|section|article)>/gi, '\n\n');
	text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, inner) => `\n\n# ${stripTags(inner)}\n\n`);
	text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, inner) => `\n\n## ${stripTags(inner)}\n\n`);
	text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, inner) => `\n\n### ${stripTags(inner)}\n\n`);
	text = text.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, inner) => `\n\n#### ${stripTags(inner)}\n\n`);
	text = text.replace(/<(blockquote)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, inner) => `\n\n> ${stripTags(inner)}\n\n`);
	text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, inner) => `- ${stripTags(inner)}\n`);
	text = text.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, inner) => `**${stripTags(inner)}**`);
	text = text.replace(/<[^>]+>/g, '');
	text = decodeEntities(text);
	text = text.replace(/\n{3,}/g, '\n\n').trim();
	return text;
}

function extractGenericHtml(html, pageUrl) {
	const titleMatch =
		html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
		html.match(/<title[^>]*>([^<]+)<\/title>/i);
	let title = titleMatch ? stripTags(titleMatch[1]) : '';
	title = title.replace(/^ChatGPT\s*[-–—]\s*/i, '').trim();

	const articleMatch =
		html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) || html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
	const bodyHtml = articleMatch ? articleMatch[1] : html;
	const markdown = htmlToStructuredMarkdown(bodyHtml);
	return {
		title: title || 'Imported page',
		markdown,
		via: 'html',
	};
}

async function buildBookFromMarkdown(markdown, { title, language, enhance, ai }) {
	let book = transformRawToBook(markdown, {
		title: title || undefined,
		author: 'Imported link',
		language,
	});
	let provider = 'url-parser';

	if (enhance !== false && isAiConfigured(ai || {}) && markdown.length < 100000) {
		try {
			const json = await Promise.race([
				completeJson(
					buildImportEnhanceSystem(),
					`Refine into a polished reading book JSON with clear H1/H2/H3 hierarchy, lists, and sections.\nPreserve the author's meaning. Treat chat turns as source material.\n\nSOURCE:\n${markdown.slice(0, 14000)}`,
					0.25,
					ai || {},
				),
				new Promise((_, reject) => setTimeout(() => reject(new Error('AI enhance timeout')), 55000)),
			]);
			book = normalizeAiBook(json, { source: 'imported', language: book.language });
			if (title) book.title = title;
			provider = json.__provider ? `url+${json.__provider}` : 'url+ai';
		} catch {
			/* keep parser book */
		}
	}

	enqueueReviewItems(book);
	return { book, provider };
}

export async function POST(request) {
	try {
		const body = await request.json();
		const url = String(body.url || '').trim();
		const action = body.action === 'import' ? 'import' : 'preview';
		const ai = readingAiOpts(request, body);

		if (!/^https?:\/\//i.test(url)) {
			return NextResponse.json({ error: 'Valid http(s) URL required' }, { status: 400 });
		}

		const claudeId = claudeShareId(url);
		if (claudeId) {
			const snap = await fetchText(claudeSnapshotUrl(claudeId), {
				timeoutMs: 20000,
				accept: 'application/json',
				headers: { Referer: url },
			});
			if (snap.status === 401 || snap.status === 403 || snap.status === 404) {
				return NextResponse.json(
					{
						error:
							'Claude did not allow reading this share from the server (it may be private or require sign-in). Open the link, copy the conversation and use Text instead.',
						code: 'CLAUDE_SHARE_BLOCKED',
					},
					{ status: 422 },
				);
			}
			if (!snap.ok) {
				return NextResponse.json({ error: `Could not fetch Claude share (${snap.status})` }, { status: 400 });
			}
			let snapshot = null;
			try {
				snapshot = JSON.parse(snap.text);
			} catch {
				snapshot = null;
			}
			return respondWithChatShare(extractClaudeSnapshot(snapshot), { provider: 'claude', action, body, ai });
		}

		const res = await fetchText(url, { timeoutMs: 20000 });
		if (!res.ok) {
			return NextResponse.json({ error: `Could not fetch link (${res.status})` }, { status: 400 });
		}

		const html = res.text;

		if (isChatGptShareUrl(url)) {
			return respondWithChatShare(extractChatGptShare(html), { provider: 'chatgpt', action, body, ai });
		}

		/* ── Generic URL / other AI shares ── */
		let extracted = extractGenericHtml(html, url);
		if (!extracted.markdown || extracted.markdown.length < 40) {
			return NextResponse.json(
				{
					error: 'Could not extract readable content from this link. Try pasting the text instead.',
					code: 'EXTRACT_EMPTY',
				},
				{ status: 422 },
			);
		}

		if (action === 'preview') {
			return NextResponse.json({
				kind: 'document',
				title: extracted.title,
				via: extracted.via,
				preview: extracted.markdown.slice(0, 500),
				chars: extracted.markdown.length,
			});
		}

		const { book, provider } = await buildBookFromMarkdown(extracted.markdown, {
			title: body.title || extracted.title,
			language: body.language,
			enhance: body.enhance,
			ai,
		});
		return NextResponse.json({ book, provider, extractedTitle: extracted.title });
	} catch (error) {
		const aborted = error?.name === 'AbortError';
		console.error('[ai-reading/import-url]', error);
		return NextResponse.json(
			{ error: aborted ? 'Link fetch timed out. Try Paste text instead.' : error.message || 'Import URL failed' },
			{ status: aborted ? 504 : 500 },
		);
	}
}

const CHAT_SHARE_LABELS = { chatgpt: 'ChatGPT', claude: 'Claude' };

/** Preview lists the messages; import re-fetches and keeps only the selected ids (no huge client payload). */
async function respondWithChatShare(share, { provider, action, body, ai }) {
	const label = CHAT_SHARE_LABELS[provider];
	if (!share?.messages?.length) {
		return NextResponse.json(
			{
				error: `Could not read messages from this ${label} share. Make sure the link is public, then try again — or paste the text.`,
				code: 'CHAT_SHARE_PARSE_EMPTY',
			},
			{ status: 422 },
		);
	}

	if (action === 'preview') {
		return NextResponse.json({
			kind: 'chat-share',
			provider,
			title: share.title,
			via: share.via,
			messages: share.messages.map(m => ({
				id: m.id,
				role: m.role,
				preview: m.preview,
				chars: m.text.length,
				selectedDefault: m.role === 'assistant' || m.role === 'user',
			})),
		});
	}

	const selectedIds = new Set((body.messageIds || []).map(String));
	const picked = share.messages.filter(m => selectedIds.size === 0 || selectedIds.has(m.id));
	if (!picked.length) {
		return NextResponse.json({ error: 'Select at least one message' }, { status: 400 });
	}

	const markdown = messagesToMarkdown(picked, { includeRoles: body.includeRoles !== false, assistantLabel: label });
	const { book, provider: bookProvider } = await buildBookFromMarkdown(markdown, {
		title: body.title || share.title,
		language: body.language,
		enhance: body.enhance,
		ai,
	});
	return NextResponse.json({
		book,
		provider: bookProvider,
		extractedTitle: share.title,
		importedCount: picked.length,
	});
}
