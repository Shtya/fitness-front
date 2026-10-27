/**
 * Claude public share conversations (claude.ai/share/<uuid>).
 * The share page is client-rendered; its messages come from the chat_snapshots JSON endpoint.
 */

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const SHARE_PATH = new RegExp(`^/share/(${UUID})/?$`, 'i');

/** @returns {string | null} snapshot id */
export function claudeShareId(url) {
	try {
		const u = new URL(url);
		if (!/^(www\.)?claude\.ai$/i.test(u.hostname)) return null;
		return SHARE_PATH.exec(u.pathname)?.[1]?.toLowerCase() || null;
	} catch {
		return null;
	}
}

export function claudeSnapshotUrl(id) {
	return `https://claude.ai/api/chat_snapshots/${id}?rendering_mode=messages&render_all_tools=true`;
}

function messageText(msg) {
	if (Array.isArray(msg?.content)) {
		const text = msg.content
			.filter(block => block?.type === 'text' && typeof block.text === 'string')
			.map(block => block.text)
			.join('\n\n')
			.trim();
		if (text) return text;
	}
	return typeof msg?.text === 'string' ? msg.text.trim() : '';
}

/**
 * @returns {{ title: string, messages: Array<{id:string,role:string,text:string,preview:string}>, via: string } | null}
 */
export function extractClaudeSnapshot(snapshot) {
	const list = Array.isArray(snapshot?.chat_messages) ? snapshot.chat_messages : [];
	const messages = [];
	for (const msg of list) {
		const role = msg?.sender === 'human' ? 'user' : msg?.sender === 'assistant' ? 'assistant' : null;
		if (!role) continue;
		const text = messageText(msg);
		if (!text) continue;
		messages.push({
			id: String(msg.uuid || `msg_${messages.length}`),
			role,
			text,
			preview: text.replace(/\s+/g, ' ').slice(0, 160),
		});
	}
	if (!messages.length) return null;
	const title = String(snapshot.snapshot_name || snapshot.name || '').trim() || 'Claude share';
	return { title, messages, via: 'claude-share' };
}
