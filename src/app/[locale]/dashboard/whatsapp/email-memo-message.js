/**
 * Parses AI Memo Email message bodies produced by EmailMemoAiService.formatWhatsApp.
 * Returns null when the text is not an email memo payload (e.g. welcome message).
 */

const SECTION_START =
	/^(📧\s*New Email|Inbox:|Received:|From:|Subject:|📝\s*Memo:|⚡\s*Action:|⏰\s*Deadline:|🔗\s*Open Email:|—{3,}|-{3,}|📌)/i;

export function isEmailMemoMessageText(text) {
	const raw = String(text || '');
	if (!raw.trim()) return false;
	return (
		/📧\s*New Email/i.test(raw) ||
		(/From:\s*.+/i.test(raw) && /Subject:\s*.+/i.test(raw)) ||
		/📝\s*Memo:/i.test(raw)
	);
}

function takePrefixed(line, prefix) {
	const re = new RegExp(`^${prefix}\\s*(.*)$`, 'i');
	const match = line.match(re);
	return match ? String(match[1] || '').trim() : null;
}

function parseSender(fromLabel) {
	const raw = String(fromLabel || '').trim();
	if (!raw) return { name: '', email: '' };

	const angle = raw.match(/^(.*?)\s*<\s*([^>\s]+@[^>\s]+)\s*>$/);
	if (angle) {
		const name = angle[1].replace(/^["']|["']$/g, '').trim();
		return { name: name || angle[2], email: angle[2] };
	}

	const spacedEmail = raw.match(/^(.+?)\s+(\S+@\S+)$/);
	if (spacedEmail && spacedEmail[1].trim() && !spacedEmail[1].includes('@')) {
		return { name: spacedEmail[1].trim(), email: spacedEmail[2].trim() };
	}

	if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
		return { name: raw.split('@')[0], email: raw };
	}

	return { name: raw, email: '' };
}

function extractBlock(lines, startIndex) {
	const out = [];
	let i = startIndex;
	while (i < lines.length) {
		const line = lines[i];
		if (i > startIndex && SECTION_START.test(line.trim())) break;
		out.push(line);
		i += 1;
	}
	while (out.length && !String(out[0]).trim()) out.shift();
	while (out.length && !String(out[out.length - 1]).trim()) out.pop();
	return { text: out.join('\n').trim(), nextIndex: i };
}

export function parseEmailMemoPayload(text) {
	if (!isEmailMemoMessageText(text)) return null;

	const lines = String(text)
		.replace(/\r\n/g, '\n')
		.split('\n');

	let inbox = '';
	let receivedLabel = '';
	let fromLabel = '';
	let subject = '';
	let memo = '';
	let action = '';
	let deadline = '';
	let gmailUrl = '';
	let arabicSummary = '';

	for (let i = 0; i < lines.length; i += 1) {
		const line = lines[i].trim();
		if (!line) continue;

		const inboxValue = takePrefixed(line, 'Inbox:');
		if (inboxValue != null) {
			inbox = inboxValue;
			continue;
		}
		const receivedValue = takePrefixed(line, 'Received:');
		if (receivedValue != null) {
			receivedLabel = receivedValue;
			continue;
		}
		const fromValue = takePrefixed(line, 'From:');
		if (fromValue != null) {
			fromLabel = fromValue;
			continue;
		}
		const subjectValue = takePrefixed(line, 'Subject:');
		if (subjectValue != null) {
			subject = subjectValue;
			continue;
		}

		if (/^📝\s*Memo:\s*$/i.test(line) || /^📝\s*Memo:\s+/i.test(line)) {
			const inline = line.replace(/^📝\s*Memo:\s*/i, '').trim();
			if (inline) {
				memo = inline;
				continue;
			}
			const block = extractBlock(lines, i + 1);
			memo = block.text;
			i = block.nextIndex - 1;
			continue;
		}

		const actionInline = line.match(/^⚡\s*Action:\s*(.*)$/i);
		if (actionInline) {
			if (actionInline[1]?.trim()) {
				action = actionInline[1].trim();
				continue;
			}
			const block = extractBlock(lines, i + 1);
			action = block.text;
			i = block.nextIndex - 1;
			continue;
		}

		const deadlineInline = line.match(/^⏰\s*Deadline:\s*(.*)$/i);
		if (deadlineInline) {
			deadline = String(deadlineInline[1] || '').trim();
			continue;
		}

		if (/^🔗\s*Open Email:\s*$/i.test(line) || /^🔗\s*Open Email:/i.test(line)) {
			const inline = line.replace(/^🔗\s*Open Email:\s*/i, '').trim();
			if (inline && /^https?:\/\//i.test(inline)) {
				gmailUrl = inline;
				continue;
			}
			for (let j = i + 1; j < lines.length; j += 1) {
				const candidate = lines[j].trim();
				if (!candidate) continue;
				if (/^https?:\/\//i.test(candidate)) {
					gmailUrl = candidate;
					i = j;
					break;
				}
				if (SECTION_START.test(candidate)) break;
			}
			continue;
		}

		if (/^📌/.test(line) || /ملخص سريع/.test(line)) {
			const block = extractBlock(lines, /ملخص سريع/.test(line) && !line.replace(/📌|ملخص سريع/g, '').trim() ? i + 1 : i);
			const cleaned = block.text
				.replace(/^📌\s*/g, '')
				.replace(/^ملخص سريع\s*/i, '')
				.trim();
			arabicSummary = cleaned || arabicSummary;
			i = block.nextIndex - 1;
			continue;
		}

		if (/^https?:\/\/mail\.google\.com/i.test(line) && !gmailUrl) {
			gmailUrl = line;
		}
	}

	if (!fromLabel && !subject && !memo && !gmailUrl) return null;

	const sender = parseSender(fromLabel);
	let sourceHost = '';
	try {
		if (gmailUrl) sourceHost = new URL(gmailUrl).hostname;
	} catch {
		sourceHost = '';
	}

	return {
		inbox: inbox || '',
		receivedLabel: receivedLabel || '',
		fromLabel: fromLabel || '',
		senderName: sender.name || fromLabel || '',
		senderEmail: sender.email || '',
		subject: subject || '',
		memo: memo || '',
		action: action || '',
		deadline: deadline || '',
		gmailUrl: gmailUrl || '',
		sourceHost,
		arabicSummary: arabicSummary || '',
	};
}

export function formatEmailMemoDate(value) {
	const date = value ? new Date(value) : null;
	if (!date || Number.isNaN(date.getTime())) return '';
	const day = date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
	const time = date.toLocaleTimeString('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
	});
	return `${day} · ${time}`;
}
