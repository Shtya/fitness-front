/**
 * Why a message did not send, in plain words, and what to do about it. Reads what we know about a
 * failed message: `sendError` (the server's message, or "The request timed out" / "No connection
 * to the server") and `sendErrorCode` (the HTTP status, 'timeout' or 'offline'). A message that
 * WhatsApp itself marked failed carries neither.
 *
 * Returns { kind, title, fix, detail } in the given language; `detail` is the raw text to show
 * under the explanation (null when it would only repeat the title).
 */

const COPY = {
	offline: {
		en: ['Could not reach the server', 'Check your internet connection, then retry.'],
		ar: ['مقدرناش نوصل للسيرفر', 'اتأكد إن النت شغال، وبعدين جرّب تاني.'],
	},
	unreachable: {
		en: ['The server did not answer', 'Your internet looks fine, so the server may be down or restarting. Retry in a minute; if it keeps failing, the server needs a look.'],
		ar: ['السيرفر ما ردّش', 'النت عندك شغال، فممكن السيرفر يكون واقع أو بيعمل ريستارت. جرّب تاني بعد دقيقة، ولو فضلت تفشل يبقى السيرفر محتاج حد يبص عليه.'],
	},
	timeout: {
		en: ['The server took too long to answer', 'WhatsApp may be slow right now. Retry in a moment.'],
		ar: ['السيرفر اتأخر في الرد', 'ممكن واتساب يكون بطيء دلوقتي. جرّب تاني بعد شوية.'],
	},
	disconnected: {
		en: ['This WhatsApp number is not connected', 'Open Accounts and reconnect the number (scan the QR code), then retry.'],
		ar: ['رقم الواتساب ده مش متوصل', 'افتح الحسابات ووصّل الرقم تاني (امسح كود الـ QR)، وبعدين جرّب تاني.'],
	},
	auth: {
		en: ['You are not allowed to send from here', 'Your session may have expired, or this chat is not yours. Sign in again or ask an admin for access.'],
		ar: ['مش مسموح لك تبعت من هنا', 'ممكن الجلسة تكون خلصت، أو الشات ده مش متسند ليك. سجّل دخول تاني أو اطلب صلاحية من الأدمن.'],
	},
	notFound: {
		en: ['The chat or account was not found', 'It may have been removed. Reload the page and open the chat again.'],
		ar: ['الشات أو الحساب مش موجود', 'ممكن يكون اتمسح. اعمل ريلود للصفحة وافتح الشات تاني.'],
	},
	tooLarge: {
		en: ['The file is too large', 'Send a smaller file, or compress it first.'],
		ar: ['الملف كبير قوي', 'ابعت ملف أصغر، أو اضغطه الأول.'],
	},
	rateLimited: {
		en: ['Too many messages too fast', 'Wait a minute before sending again, so WhatsApp does not flag the number.'],
		ar: ['رسايل كتير ورا بعض بسرعة', 'استنى دقيقة قبل ما تبعت تاني، عشان واتساب ما يعلّمش على الرقم.'],
	},
	invalid: {
		en: ['The message was rejected', 'Something in it was not accepted. Check the text or attachment, then retry.'],
		ar: ['الرسالة اترفضت', 'في حاجة فيها ما اتقبلتش. راجع النص أو المرفق وجرّب تاني.'],
	},
	server: {
		en: ['Something went wrong on the server', 'Retry in a moment. If it keeps happening, share the details below with support.'],
		ar: ['حصلت مشكلة في السيرفر', 'جرّب تاني بعد شوية. لو فضلت تحصل، ابعت التفاصيل اللي تحت للدعم.'],
	},
	rejected: {
		en: ['WhatsApp did not deliver this message', 'Usually the phone lost its connection, the number is not on WhatsApp, or the contact blocked you. Check the account is connected, then retry.'],
		ar: ['واتساب ما وصّلش الرسالة دي', 'غالبًا الموبايل فصل، أو الرقم مش على واتساب، أو الشخص عامل بلوك. اتأكد إن الحساب متوصل وجرّب تاني.'],
	},
	unknown: {
		en: ['The message was not sent', 'Retry. If it fails again, the details below say why.'],
		ar: ['الرسالة ما اتبعتتش', 'جرّب تاني. لو فشلت تاني، التفاصيل اللي تحت بتقول السبب.'],
	},
};

const DISCONNECTED = /not\s+connected|disconnected|no\s+active\s+session|session\s+(closed|expired|not)|qr|logged\s*out|connection\s+closed|not\s+ready|socket/i;

export function sendFailureKind(message) {
	const code = message?.sendErrorCode ?? null;
	const reason = String(message?.sendError || '');
	if (code === 'offline') return 'offline';
	if (code === 'unreachable' || /^no connection to the server/i.test(reason)) return 'unreachable';
	if (code === 'timeout' || /timed?\s*out/i.test(reason)) return 'timeout';
	if (DISCONNECTED.test(reason)) return 'disconnected';
	const status = Number(code) || 0;
	if (status === 401 || status === 403) return 'auth';
	if (status === 404) return 'notFound';
	if (status === 413 || /too\s+large|file\s+size/i.test(reason)) return 'tooLarge';
	if (status === 429 || /rate|too\s+many/i.test(reason)) return 'rateLimited';
	if (status === 409 || status === 423 || status === 503) return 'disconnected';
	if (status >= 500) return 'server';
	if (status >= 400) return 'invalid';
	if (!reason && !code) return 'rejected';
	return 'unknown';
}

export function explainSendFailure(message, ar = false) {
	const kind = sendFailureKind(message);
	const [title, fix] = COPY[kind][ar ? 'ar' : 'en'];
	const raw = String(message?.sendError || '').trim();
	// the plain-language title already says it for these two
	const detail = raw && !['offline', 'unreachable', 'timeout'].includes(kind) ? raw : null;
	const code = message?.sendErrorCode;
	return { kind, title, fix, detail, code: typeof code === 'number' ? code : null };
}
