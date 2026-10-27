/** Build markdown from selected chat messages, preserving headings already in text. */
export function messagesToMarkdown(messages, { includeRoles = true, assistantLabel = 'ChatGPT' } = {}) {
	const blocks = [];
	for (const m of messages) {
		const roleLabel = m.role === 'user' ? 'You' : m.role === 'assistant' ? assistantLabel : m.role;
		blocks.push(includeRoles ? `## ${roleLabel}\n\n${m.text}` : m.text);
	}
	return blocks.join('\n\n---\n\n').trim();
}
