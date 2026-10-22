const MAX_DIFF_CELLS = 250_000;

function tokenize(text) {
	return String(text || '').match(/\s+|[^\s]+/g) || [];
}

function pushPart(parts, type, value) {
	if (!value) return;
	const last = parts[parts.length - 1];
	if (last && last.type === type) last.value += value;
	else parts.push({ type, value });
}

/**
 * Word-level diff (LCS) between two message texts.
 * Returns [{ type: 'same' | 'removed' | 'added', value }] in reading order.
 */
export function diffWhatsAppEditWords(previousText, nextText) {
	const a = tokenize(previousText);
	const b = tokenize(nextText);
	const parts = [];
	if (a.length * b.length > MAX_DIFF_CELLS) {
		pushPart(parts, 'removed', a.join(''));
		pushPart(parts, 'added', b.join(''));
		return parts;
	}
	const cols = b.length + 1;
	const lcs = new Uint32Array((a.length + 1) * cols);
	for (let i = a.length - 1; i >= 0; i -= 1) {
		for (let j = b.length - 1; j >= 0; j -= 1) {
			lcs[i * cols + j] =
				a[i] === b[j]
					? lcs[(i + 1) * cols + j + 1] + 1
					: Math.max(lcs[(i + 1) * cols + j], lcs[i * cols + j + 1]);
		}
	}
	let i = 0;
	let j = 0;
	while (i < a.length && j < b.length) {
		if (a[i] === b[j]) {
			pushPart(parts, 'same', a[i]);
			i += 1;
			j += 1;
		} else if (lcs[(i + 1) * cols + j] >= lcs[i * cols + j + 1]) {
			pushPart(parts, 'removed', a[i]);
			i += 1;
		} else {
			pushPart(parts, 'added', b[j]);
			j += 1;
		}
	}
	while (i < a.length) pushPart(parts, 'removed', a[i++]);
	while (j < b.length) pushPart(parts, 'added', b[j++]);
	return parts;
}

/** Valid stored edits, oldest first. */
export function normalizeWhatsAppEditHistory(value) {
	if (!Array.isArray(value)) return [];
	return value.filter(
		entry => entry && typeof entry.text === 'string' && typeof entry.previousText === 'string',
	);
}

export function whatsAppEditAuthorLabel(by, locale = 'en') {
	const ar = locale === 'ar';
	if (by === 'contact') return ar ? 'العميل عدّل الرسالة' : 'Contact edited this message';
	if (by === 'staff') return ar ? 'اتعدّلت من السيستم' : 'Edited from the CRM';
	return ar ? 'اتعدّلت من الموبايل' : 'Edited from the phone';
}
