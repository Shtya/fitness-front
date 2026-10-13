/**
 * One-click presentation data: a demo profile whose chats cover every bubble the
 * workspace can render (text, photo album, video, voice, document, location,
 * live location, sticker, contact card, group senders, replies, reactions,
 * forwarded / edited / deleted / failed messages) plus live typing events.
 *
 * Everything is generated: names, numbers (+20 100 000 01xx test range), avatars,
 * stickers, PDFs and voice notes. Photos and clips come from the app's own public
 * assets, never from a real account. Voice notes are synthesized because download
 * managers (e.g. IDM) answer browser .mp3 requests with an empty 204.
 */

const MINUTE = 60 * 1000;

export const SHOWCASE_RANDOM_SEED = 'showcase';

const ASSETS = {
	photoDashboard: { kind: 'url', url: '/screens/web/dashboard.png', mime: 'image/png', name: 'dashboard.png' },
	photoReports: { kind: 'url', url: '/screens/web/weekly-reports.png', mime: 'image/png', name: 'weekly-reports.png' },
	photoNutrition: { kind: 'url', url: '/screens/web/nutrition-plans.png', mime: 'image/png', name: 'nutrition-plan.png' },
	photoMobile: { kind: 'url', url: '/screens/mobile/workouts.png', mime: 'image/png', name: 'mobile-workouts.png' },
	photoMenu: { kind: 'url', url: '/screens/mobile/recipes.png', mime: 'image/png', name: 'menu.png' },
	videoSitUp: {
		kind: 'url',
		url: '/uploads/exercises/00011201-3-4-Sit-up_Waist-FIX_.mp4',
		mime: 'video/mp4',
		name: 'workout.mp4',
	},
	videoBench: {
		kind: 'url',
		url: '/uploads/exercises/00251201-Barbell-Bench-Press_Chest-FIX2_.mp4',
		mime: 'video/mp4',
		name: 'bench-press.mp4',
	},
	voiceA: { kind: 'voice', seconds: 6, pitch: 125, seed: 7 },
	voiceB: { kind: 'voice', seconds: 9, pitch: 205, seed: 11 },
	stickerStrong: { kind: 'sticker', emoji: '💪', background: '#DCF8C6' },
	stickerParty: { kind: 'sticker', emoji: '🎉', background: '#FFF4C2' },
};

function pick(ar, en) {
	return ar ? en.ar : en.en;
}

function pdfAsset(name, lines) {
	return { kind: 'pdf', name, lines };
}

/**
 * Pure description of the presentation profile. Times are minutes before `now`;
 * `reply` points at an earlier message index inside the same chat.
 */
export function buildShowcaseScript(locale = 'en') {
	const ar = String(locale).toLowerCase().startsWith('ar');
	const t = value => pick(ar, value);

	const groupMembers = {
		karim: { name: t({ ar: 'كريم', en: 'Karim' }), waId: '201000000121' },
		nourhan: { name: t({ ar: 'نورهان', en: 'Nourhan' }), waId: '201000000122' },
		hossam: { name: t({ ar: 'حسام', en: 'Hossam' }), waId: '201000000123' },
	};

	const contacts = [
		{
			key: 'ahmed',
			name: t({ ar: 'أحمد سمير', en: 'Ahmed Samir' }),
			phone: '+201000000101',
			about: t({ ar: 'متاح', en: 'Available' }),
			avatarColor: '#25D366',
			presenceStatus: 'online',
			conversation: { pinned: true, unreadCount: 2 },
			messages: [
				{ dir: 'in', at: 180, text: t({ ar: 'صباح الخير 👋', en: 'Good morning 👋' }) },
				{ dir: 'out', at: 178, text: t({ ar: 'صباح النور، عامل إيه؟', en: 'Morning! How are you?' }) },
				{
					dir: 'in',
					at: 176,
					text: t({ ar: 'تمام الحمد لله. دي صور الداشبورد الجديد', en: 'All good. Here are the new dashboard shots' }),
				},
				{ dir: 'in', at: 175, type: 'image', media: 'photoDashboard', text: t({ ar: 'الشاشة الرئيسية', en: 'Home screen' }) },
				{ dir: 'in', at: 175, type: 'image', media: 'photoReports' },
				{
					dir: 'out',
					at: 170,
					reply: 3,
					text: t({ ar: 'شكلها جامد جداً 🔥', en: 'Looks amazing 🔥' }),
					reactions: ['❤️'],
				},
				{
					dir: 'in',
					at: 160,
					type: 'video',
					media: 'videoSitUp',
					text: t({ ar: 'وده فيديو التمرين اللي اتكلمنا عليه', en: 'And this is the workout clip we talked about' }),
				},
				{ dir: 'out', at: 150, type: 'ptt', media: 'voiceA', status: 'played' },
				{ dir: 'in', at: 140, type: 'ptt', media: 'voiceB' },
				{
					dir: 'in',
					at: 120,
					type: 'location',
					location: {
						latitude: 30.0444,
						longitude: 31.2357,
						name: t({ ar: 'ميدان التحرير', en: 'Tahrir Square' }),
						address: t({ ar: 'وسط البلد، القاهرة', en: 'Downtown, Cairo' }),
					},
				},
				{
					dir: 'out',
					at: 110,
					edited: true,
					text: t({ ar: 'هكون هناك الساعة 7 إن شاء الله', en: "I'll be there at 7" }),
				},
				{
					dir: 'in',
					at: 100,
					type: 'document',
					media: 'pdfQuote',
					text: t({ ar: 'عرض السعر', en: 'Quotation' }),
				},
				{ dir: 'out', at: 90, text: t({ ar: 'وصل، هراجعه وأرد عليك', en: "Got it, I'll review and get back to you" }) },
				{ dir: 'in', at: 60, deleted: true },
				{ dir: 'in', at: 20, type: 'sticker', media: 'stickerStrong' },
				{
					dir: 'in',
					at: 5,
					unread: true,
					text: t({ ar: 'شوف اللينك ده https://so7bafit.com', en: 'Check this link https://so7bafit.com' }),
				},
				{ dir: 'in', at: 2, unread: true, text: t({ ar: 'مستنيك بكره 🙏', en: 'See you tomorrow 🙏' }) },
			],
		},
		{
			key: 'sales',
			name: t({ ar: 'فريق المبيعات', en: 'Sales Team' }),
			phone: '+201000000120',
			about: t({ ar: 'جروب الفريق', en: 'Team group' }),
			avatarColor: '#7C5CFC',
			presenceStatus: 'offline',
			conversation: { pinned: true, unreadCount: 3, group: true },
			messages: [
				{
					dir: 'in',
					at: 300,
					sender: groupMembers.karim,
					text: t({ ar: 'يا جماعة الاجتماع بكره الساعة 11', en: "Team, tomorrow's meeting is at 11" }),
				},
				{ dir: 'in', at: 295, sender: groupMembers.nourhan, text: t({ ar: 'تمام 👍', en: 'Sounds good 👍' }) },
				{ dir: 'out', at: 290, text: t({ ar: 'هبعت الأجندة دلوقتي', en: "I'll send the agenda now" }) },
				{ dir: 'out', at: 289, type: 'document', media: 'pdfAgenda' },
				{
					dir: 'in',
					at: 250,
					sender: groupMembers.hossam,
					type: 'image',
					media: 'photoMobile',
					text: t({ ar: 'التصميم الجديد للموبايل', en: 'The new mobile design' }),
				},
				{
					dir: 'in',
					at: 240,
					sender: groupMembers.karim,
					reply: 4,
					text: t({ ar: 'ممتاز يا حسام 👏', en: 'Great work Hossam 👏' }),
					reactions: ['👏', '🔥'],
				},
				{
					dir: 'in',
					at: 200,
					sender: groupMembers.nourhan,
					type: 'contacts',
					text: t({ ar: 'د. هالة - تغذية', en: 'Dr. Hala - Nutrition' }),
					sharedContact: {
						displayName: t({ ar: 'د. هالة - تغذية', en: 'Dr. Hala - Nutrition' }),
						phones: [{ phone: '+201000000131', waId: '201000000131', formatted: '+20 100 000 0131' }],
					},
				},
				{
					dir: 'in',
					at: 30,
					unread: true,
					sender: groupMembers.hossam,
					type: 'live_location',
					location: {
						latitude: 30.0131,
						longitude: 31.2089,
						name: t({ ar: 'موقعي المباشر', en: 'Live location' }),
						isLive: true,
					},
				},
				{
					dir: 'in',
					at: 10,
					unread: true,
					sender: groupMembers.karim,
					text: t({ ar: 'متنسوش التقرير الأسبوعي', en: "Don't forget the weekly report" }),
				},
			],
		},
		{
			key: 'layla',
			name: t({ ar: 'ليلى محمود', en: 'Layla Mahmoud' }),
			phone: '+201000000109',
			about: t({ ar: 'في الجيم 🏋️', en: 'At the gym 🏋️' }),
			avatarColor: '#E91E63',
			presenceStatus: 'online',
			conversation: {},
			messages: [
				{ dir: 'in', at: 40, text: t({ ar: 'إنت فين؟ 😅', en: 'Where are you? 😅' }) },
				{ dir: 'out', at: 38, status: 'delivered', text: t({ ar: 'جاي في الطريق 🚗', en: 'On my way 🚗' }) },
			],
		},
		{
			key: 'mona',
			name: t({ ar: 'منى خالد', en: 'Mona Khaled' }),
			phone: '+201000000102',
			about: t({ ar: 'الصحة أولاً 🥗', en: 'Health first 🥗' }),
			avatarColor: '#FF9800',
			presenceStatus: 'offline',
			lastSeenMinutes: 30,
			conversation: {},
			messages: [
				{ dir: 'out', at: 1500, text: t({ ar: 'أهلاً يا منى، خطة التغذية بتاعتك جاهزة', en: 'Hi Mona, your nutrition plan is ready' }) },
				{
					dir: 'out',
					at: 1499,
					type: 'image',
					media: 'photoNutrition',
					text: t({ ar: 'خطة الأسبوع الأول', en: 'Week one plan' }),
					reactions: ['😍'],
				},
				{ dir: 'in', at: 1480, text: t({ ar: 'الله! شكراً جداً', en: 'Wow, thank you so much!' }) },
				{ dir: 'in', at: 1470, type: 'ptt', media: 'voiceA' },
				{ dir: 'out', at: 1460, text: t({ ar: 'العفو، أي سؤال أنا موجود', en: "You're welcome, I'm here for any questions" }) },
				{
					dir: 'out',
					at: 1450,
					forwarded: true,
					text: t({ ar: '⚡ نصيحة اليوم: اشرب 3 لتر مياه', en: '⚡ Tip of the day: drink 3 litres of water' }),
				},
			],
		},
		{
			key: 'youssef',
			name: t({ ar: 'كابتن يوسف', en: 'Coach Youssef' }),
			phone: '+201000000104',
			about: t({ ar: 'مدرب شخصي', en: 'Personal trainer' }),
			avatarColor: '#2196F3',
			presenceStatus: 'offline',
			lastSeenMinutes: 120,
			conversation: {},
			messages: [
				{
					dir: 'in',
					at: 2900,
					type: 'video',
					media: 'videoBench',
					text: t({ ar: 'التكنيك الصح للبنش', en: 'The right bench press technique' }),
				},
				{ dir: 'out', at: 2890, text: t({ ar: 'شكراً يا كابتن 💪', en: 'Thanks coach 💪' }) },
				{ dir: 'in', at: 2880, type: 'sticker', media: 'stickerParty' },
			],
		},
		{
			key: 'sara',
			name: t({ ar: 'سارة علي', en: 'Sara Ali' }),
			phone: '+201000000105',
			about: t({ ar: 'مشغولة', en: 'Busy' }),
			avatarColor: '#9C27B0',
			presenceStatus: 'offline',
			lastSeenMinutes: 300,
			conversation: {},
			messages: [
				{ dir: 'in', at: 4300, text: t({ ar: 'ممكن تبعتلي الفاتورة؟', en: 'Could you send me the invoice?' }) },
				{ dir: 'out', at: 4290, type: 'document', media: 'pdfInvoice' },
				{
					dir: 'out',
					at: 4280,
					status: 'failed',
					text: t({ ar: 'لو في أي مشكلة كلميني', en: 'Call me if anything is wrong' }),
				},
			],
		},
		{
			key: 'restaurant',
			name: t({ ar: 'مطعم الريحان', en: 'Al Rayhan Restaurant' }),
			phone: '+201000000106',
			about: t({ ar: 'حساب تجاري', en: 'Business account' }),
			avatarColor: '#4CAF50',
			verified: true,
			presenceStatus: 'offline',
			conversation: {},
			messages: [
				{ dir: 'in', at: 5800, type: 'image', media: 'photoMenu', text: t({ ar: 'منيو اليوم 🍽️', en: "Today's menu 🍽️" }) },
				{
					dir: 'in',
					at: 5799,
					type: 'location',
					location: {
						latitude: 30.0626,
						longitude: 31.2197,
						name: t({ ar: 'مطعم الريحان', en: 'Al Rayhan Restaurant' }),
						address: t({ ar: 'الزمالك، القاهرة', en: 'Zamalek, Cairo' }),
					},
				},
				{
					dir: 'out',
					at: 5790,
					status: 'delivered',
					text: t({ ar: 'عايز أحجز ترابيزة لـ 4 الساعة 9', en: "I'd like a table for 4 at 9 pm" }),
				},
				{ dir: 'in', at: 5780, text: t({ ar: 'تم الحجز ✅ مستنيينك', en: 'Booked ✅ See you then' }) },
			],
		},
		{
			key: 'omar',
			name: t({ ar: 'عمر حسن', en: 'Omar Hassan' }),
			phone: '+201000000107',
			about: t({ ar: 'مرحباً! أنا أستخدم واتساب', en: 'Hey there! I am using WhatsApp' }),
			avatarColor: '#795548',
			presenceStatus: 'offline',
			lastSeenMinutes: 900,
			conversation: { muted: true },
			messages: [
				{
					dir: 'in',
					at: 7200,
					type: 'contacts',
					text: t({ ar: 'محمد - المحاسب', en: 'Mohamed - Accountant' }),
					sharedContact: {
						displayName: t({ ar: 'محمد - المحاسب', en: 'Mohamed - Accountant' }),
						phones: [{ phone: '+201000000132', waId: '201000000132', formatted: '+20 100 000 0132' }],
					},
				},
				{ dir: 'out', at: 7190, text: t({ ar: 'شكراً يا عمر', en: 'Thanks Omar' }) },
			],
		},
		{
			key: 'support',
			name: t({ ar: 'دعم العملاء', en: 'Customer Support' }),
			phone: '+201000000108',
			about: t({ ar: 'متاح 24 ساعة', en: 'Available 24/7' }),
			avatarColor: '#607D8B',
			verified: true,
			presenceStatus: 'offline',
			conversation: { archived: true },
			messages: [
				{
					dir: 'in',
					at: 10000,
					text: t({ ar: 'تم حل المشكلة. شكراً لتواصلك معانا 🙏', en: 'Your issue is resolved. Thanks for reaching out 🙏' }),
				},
			],
		},
	];

	const assets = {
		...ASSETS,
		pdfQuote: pdfAsset(t({ ar: 'عرض-السعر.pdf', en: 'quotation.pdf' }), [
			'So7baFit - Quotation #1024',
			'Annual coaching plan ........ 12 months',
			'Nutrition follow-up ......... weekly',
			'Sample document for presentation only',
		]),
		pdfAgenda: pdfAsset(t({ ar: 'أجندة-الاجتماع.pdf', en: 'meeting-agenda.pdf' }), [
			'Sales Team - Weekly Meeting',
			'1. Pipeline review',
			'2. New mobile design',
			'3. Weekly report',
		]),
		pdfInvoice: pdfAsset(t({ ar: 'فاتورة-1024.pdf', en: 'invoice-1024.pdf' }), [
			'So7baFit - Invoice #1024',
			'Sample document for presentation only',
		]),
	};

	const events = [
		{
			contact: 'layla',
			eventType: 'typing',
			delayMs: 4000,
			durationMs: 6000,
			payload: { active: true },
		},
		{
			contact: 'ahmed',
			eventType: 'incoming_message',
			delayMs: 15000,
			durationMs: 2500,
			payload: {
				text: t({ ar: 'على فكرة الاجتماع اتأجل لـ 8 ⏰', en: 'By the way, the meeting moved to 8 ⏰' }),
				status: 'delivered',
				unreadCount: 3,
				notification: false,
				moveToTop: true,
				typingBefore: true,
			},
		},
		{
			contact: 'mona',
			eventType: 'recording',
			delayMs: 25000,
			durationMs: 5000,
			payload: { active: true },
		},
	];

	return {
		profile: {
			name: t({ ar: 'عرض تقديمي (بيانات وهمية)', en: 'Presentation (sample data)' }),
			locale: ar ? 'ar' : 'en',
			randomSeed: SHOWCASE_RANDOM_SEED,
		},
		contacts,
		assets,
		events,
	};
}

/** Minimal valid single-page PDF; ASCII lines only so byte offsets equal string offsets. */
export function buildDemoPdf(lines = []) {
	const escape = value => String(value).replace(/[^\x20-\x7e]/g, '?').replace(/([\\()])/g, '\\$1');
	const stream = [
		'BT',
		'/F1 20 Tf',
		'60 760 Td',
		...lines.flatMap((line, index) => [
			index === 0 ? '' : '0 -32 Td',
			index === 1 ? '/F1 13 Tf' : '',
			`(${escape(line)}) Tj`,
		]).filter(Boolean),
		'ET',
	].join('\n');
	const objects = [
		'<< /Type /Catalog /Pages 2 0 R >>',
		'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
		'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
		`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
		'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
	];
	let body = '%PDF-1.4\n';
	const offsets = [];
	objects.forEach((object, index) => {
		offsets.push(body.length);
		body += `${index + 1} 0 obj\n${object}\nendobj\n`;
	});
	const xrefOffset = body.length;
	body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
	offsets.forEach(offset => {
		body += `${String(offset).padStart(10, '0')} 00000 n \n`;
	});
	body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
	return body;
}

function seededRandom(seed) {
	let value = seed >>> 0 || 1;
	return () => {
		value = (value + 0x6d2b79f5) >>> 0;
		let t = value;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Speech-like mono 16-bit WAV: a voiced buzz shaped into syllables with pauses. */
export function buildVoiceWav({ seconds = 6, pitch = 140, seed = 1, sampleRate = 16000 } = {}) {
	const random = seededRandom(seed);
	const total = Math.round(seconds * sampleRate);
	const samples = new Float32Array(total);
	const syllables = [];
	for (let at = 0.15 * sampleRate; at < total - 0.2 * sampleRate; ) {
		const length = (0.12 + random() * 0.22) * sampleRate;
		syllables.push({ start: at, end: Math.min(total, at + length), lift: 0.85 + random() * 0.35 });
		at += length + (random() < 0.18 ? 0.35 + random() * 0.3 : 0.04 + random() * 0.09) * sampleRate;
	}
	let phase = 0;
	let syllableIndex = 0;
	for (let i = 0; i < total; i += 1) {
		while (syllableIndex < syllables.length && syllables[syllableIndex].end <= i) syllableIndex += 1;
		const syllable = syllables[syllableIndex];
		let envelope = 0;
		if (syllable && i >= syllable.start) {
			const progress = (i - syllable.start) / (syllable.end - syllable.start);
			envelope = Math.sin(Math.PI * progress) ** 0.6;
		}
		const time = i / sampleRate;
		const f0 = pitch * (syllable?.lift || 1) * (1 + 0.06 * Math.sin(2 * Math.PI * 0.7 * time));
		phase += (2 * Math.PI * f0) / sampleRate;
		let voiced = 0;
		for (let harmonic = 1; harmonic <= 12; harmonic += 1) {
			const frequency = f0 * harmonic;
			const formant = Math.exp(-(((frequency - 550) / 260) ** 2)) + 0.6 * Math.exp(-(((frequency - 1500) / 380) ** 2));
			voiced += (Math.sin(phase * harmonic) * (0.25 + formant)) / harmonic;
		}
		samples[i] = envelope * (voiced + (random() - 0.5) * 0.08);
	}
	let peak = 0;
	for (const value of samples) peak = Math.max(peak, Math.abs(value));
	const gain = peak ? 0.7 / peak : 0;
	const bytes = new Uint8Array(44 + total * 2);
	const view = new DataView(bytes.buffer);
	const ascii = (offset, text) => [...text].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
	ascii(0, 'RIFF');
	view.setUint32(4, 36 + total * 2, true);
	ascii(8, 'WAVE');
	ascii(12, 'fmt ');
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, 1, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * 2, true);
	view.setUint16(32, 2, true);
	view.setUint16(34, 16, true);
	ascii(36, 'data');
	view.setUint32(40, total * 2, true);
	for (let i = 0; i < total; i += 1) {
		view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i] * gain)) * 0x7fff, true);
	}
	return bytes;
}

const MEDIA_FALLBACK_TEXT = {
	image: { ar: '📷 صورة', en: '📷 Photo' },
	video: { ar: '🎥 فيديو', en: '🎥 Video' },
	ptt: { ar: '🎤 رسالة صوتية', en: '🎤 Voice message' },
	document: { ar: '📄 ملف', en: '📄 Document' },
	sticker: { ar: '⭐', en: '⭐' },
};

function initialsOf(name) {
	const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
	return parts.slice(0, 2).map(part => Array.from(part)[0]).join('') || '?';
}

function canvasBlob(canvas, type) {
	return new Promise((resolve, reject) => {
		canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Canvas export failed'))), type, 0.92);
	});
}

/** Browser-only: turns an asset description into an uploadable File. */
export async function createBrowserAssetFile(asset) {
	if (asset.kind === 'url') {
		// The PWA worker serves .mp3/.mp4 cache-first with range support, which can hand back a
		// partial clip; the query string keeps the request off those routes.
		const response = await fetch(`${asset.url}?showcase=1`, { cache: 'no-store' });
		const blob = response.status === 200 ? await response.blob() : null;
		if (!blob?.size) throw new Error(`Could not load ${asset.url}`);
		return new File([blob], asset.name, { type: asset.mime });
	}
	if (asset.kind === 'pdf') {
		return new File([buildDemoPdf(asset.lines)], asset.name, { type: 'application/pdf' });
	}
	if (asset.kind === 'voice') {
		return new File([buildVoiceWav(asset)], 'voice-note.wav', { type: 'audio/wav' });
	}
	const canvas = document.createElement('canvas');
	const size = asset.kind === 'sticker' ? 512 : 320;
	canvas.width = size;
	canvas.height = size;
	const context = canvas.getContext('2d');
	if (asset.kind === 'avatar') {
		const gradient = context.createLinearGradient(0, 0, size, size);
		gradient.addColorStop(0, asset.color || '#25D366');
		gradient.addColorStop(1, '#075E54');
		context.fillStyle = gradient;
		context.fillRect(0, 0, size, size);
		context.fillStyle = '#ffffff';
		context.font = `600 ${Math.round(size * 0.38)}px system-ui, "Segoe UI", Tahoma, sans-serif`;
		context.textAlign = 'center';
		context.textBaseline = 'middle';
		context.fillText(initialsOf(asset.name), size / 2, size / 2 + size * 0.02);
		const blob = await canvasBlob(canvas, 'image/png');
		return new File([blob], 'avatar.png', { type: 'image/png' });
	}
	context.clearRect(0, 0, size, size);
	context.fillStyle = asset.background || '#ffffff';
	context.beginPath();
	context.arc(size / 2, size / 2, size * 0.44, 0, Math.PI * 2);
	context.fill();
	context.lineWidth = size * 0.035;
	context.strokeStyle = '#ffffff';
	context.stroke();
	context.font = `${Math.round(size * 0.5)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
	context.textAlign = 'center';
	context.textBaseline = 'middle';
	context.fillText(asset.emoji || '⭐', size / 2, size / 2 + size * 0.03);
	const webp = await canvasBlob(canvas, 'image/webp');
	if (webp.type === 'image/webp') return new File([webp], 'sticker.webp', { type: 'image/webp' });
	const png = await canvasBlob(canvas, 'image/png');
	return new File([png], 'sticker.png', { type: 'image/png' });
}

function idOf(payload) {
	return payload?.id ?? payload?.data?.id ?? payload?.item?.id ?? null;
}

function requireId(payload, what) {
	const id = idOf(payload);
	if (!id) throw new Error(`Demo API returned no id for ${what}`);
	return String(id);
}

/** Message payload for the demo API (pure, exported for tests). */
export function showcaseMessagePayload(spec, { now, index, attachmentIds = [], replyToId = null }) {
	const inbound = spec.dir === 'in';
	const timestamp = new Date(now - spec.at * MINUTE + index * 1000).toISOString();
	const metadata = {};
	if (spec.sender) {
		metadata.senderName = spec.sender.name;
		metadata.senderWaId = spec.sender.waId;
	}
	if (spec.sharedContact) metadata.sharedContact = spec.sharedContact;
	const payload = {
		direction: inbound ? 'inbound' : 'outbound',
		type: spec.deleted ? 'text' : spec.type || 'text',
		text: spec.deleted ? null : spec.text ?? null,
		timestamp,
		status: spec.status || (inbound ? (spec.unread ? 'delivered' : 'read') : 'read'),
		showReadReceipt: true,
		forwarded: Boolean(spec.forwarded),
		deletedMode: spec.deleted ? 'for_everyone' : 'none',
		attachmentIds,
	};
	if (replyToId) payload.replyToId = replyToId;
	if (spec.edited) payload.editedAt = new Date(now - spec.at * MINUTE + index * 1000 + 2 * MINUTE).toISOString();
	if (spec.location) payload.location = spec.location;
	if (Object.keys(metadata).length) payload.metadata = metadata;
	if (spec.reactions?.length) {
		payload.reactions = spec.reactions.map((emoji, reactionIndex) => ({
			emoji,
			actorKey: inbound ? (reactionIndex === 0 ? 'me' : `member-${reactionIndex}`) : 'contact',
		}));
	}
	return payload;
}

/**
 * Creates the whole presentation profile through the regular demo endpoints.
 * On any failure the half-built profile is deleted so nothing partial is left.
 */
export async function seedShowcaseProfile({
	api,
	locale = 'en',
	now = Date.now(),
	makeFile = createBrowserAssetFile,
	onProgress,
} = {}) {
	if (!api) throw new Error('seedShowcaseProfile requires the demo API');
	const script = buildShowcaseScript(locale);
	const messageCount = script.contacts.reduce((sum, contact) => sum + contact.messages.length, 0);
	const total = script.contacts.length * 2 + messageCount + script.events.length;
	let done = 0;
	const step = label => {
		done += 1;
		onProgress?.({ done, total, label });
	};

	const profileId = requireId(await api.createProfile(script.profile), 'profile');
	let skippedMedia = 0;
	try {
		// A file the browser cannot load degrades that one message to text; API errors still abort.
		const upload = async asset => {
			let file = null;
			try {
				file = await makeFile(asset);
			} catch {
				file = null;
			}
			if (!file) {
				skippedMedia += 1;
				return null;
			}
			return requireId(await api.uploadMedia(profileId, file), 'media');
		};
		const conversationIds = {};
		for (const contact of script.contacts) {
			const photoAttachmentId =
				(await upload({ kind: 'avatar', name: contact.name, color: contact.avatarColor })) || undefined;
			const contactId = requireId(
				await api.createContact(profileId, {
					name: contact.name,
					phone: contact.phone,
					about: contact.about,
					avatarColor: contact.avatarColor,
					verified: Boolean(contact.verified),
					presenceStatus: contact.presenceStatus || 'offline',
					lastSeenAt: contact.lastSeenMinutes
						? new Date(now - contact.lastSeenMinutes * MINUTE).toISOString()
						: undefined,
					photoAttachmentId,
				}),
				'contact',
			);
			step(contact.name);
			const settings = contact.conversation || {};
			const conversationId = requireId(
				await api.createConversation(profileId, {
					sourceType: 'fake',
					contactId,
					pinned: Boolean(settings.pinned),
					archived: Boolean(settings.archived),
					unreadCount: settings.unreadCount || 0,
					mutedUntil: settings.muted ? new Date(now + 365 * 24 * 60 * MINUTE).toISOString() : undefined,
					overrides: settings.group ? { type: 'group' } : {},
				}),
				'conversation',
			);
			conversationIds[contact.key] = conversationId;
			step(contact.name);

			const messageIds = [];
			for (const [index, spec] of contact.messages.entries()) {
				const attachmentId = spec.media ? await upload(script.assets[spec.media]) : null;
				const sent =
					spec.media && !attachmentId
						? {
								...spec,
								type: 'text',
								text: [pick(script.profile.locale === 'ar', MEDIA_FALLBACK_TEXT[spec.type] || MEDIA_FALLBACK_TEXT.document), spec.text]
									.filter(Boolean)
									.join('\n'),
							}
						: spec;
				const replyToId = Number.isInteger(spec.reply) ? messageIds[spec.reply] || null : null;
				const created = await api.createMessage(
					conversationId,
					showcaseMessagePayload(sent, {
						now,
						index,
						attachmentIds: attachmentId ? [attachmentId] : [],
						replyToId,
					}),
				);
				messageIds.push(requireId(created, 'message'));
				step(contact.name);
			}
		}

		for (const [sequence, event] of script.events.entries()) {
			await api.createEvent(profileId, {
				eventType: event.eventType,
				conversationId: conversationIds[event.contact],
				delayMs: event.delayMs,
				durationMs: event.durationMs,
				enabled: true,
				sequence,
				payload: event.payload,
			});
			step(event.eventType);
		}
	} catch (error) {
		await api.deleteProfile(profileId).catch(() => undefined);
		throw error;
	}
	return { profileId, total, skippedMedia };
}
