const fs = require('fs');

function deepMerge(a, b) {
	const out = { ...a };
	for (const [k, v] of Object.entries(b)) {
		if (v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object') out[k] = deepMerge(a[k], v);
		else out[k] = v;
	}
	return out;
}

const en = {
	nav: {
		home: 'Home',
		studio: 'Studio',
		library: 'Library',
		import: 'Import',
		review: 'Review',
		fitness: 'Fitness AI',
	},
	studioSub: {
		chat: 'Chat',
		topics: 'Topics',
		journey: 'Journey',
		prompts: 'Prompts',
		generate: 'Generate',
	},
	library: {
		renamePrompt: 'Rename book',
	},
	import: {
		modePaste: 'Paste text',
		modeLink: 'Share link',
		linkLabel: 'ChatGPT / Claude / Gemini link',
		linkHint: 'Paste a public share link. We extract headings and paragraphs into a readable book.',
		linkHintShort: 'Paste a share link or raw text',
		invalidUrl: 'Please enter a valid http(s) link',
		subtitle: 'Paste text or a share link from any AI — we turn it into a beautiful reading document.',
	},
};

const ar = {
	nav: {
		home: 'الرئيسية',
		studio: 'الاستوديو',
		library: 'مكتبتي',
		import: 'استيراد',
		review: 'مراجعة',
		fitness: 'لياقة AI',
	},
	studioSub: {
		chat: 'محادثة',
		topics: 'مواضيع',
		journey: 'رحلة',
		prompts: 'مطالبات',
		generate: 'توليد',
	},
	library: {
		renamePrompt: 'إعادة تسمية الكتاب',
	},
	import: {
		modePaste: 'لصق نص',
		modeLink: 'رابط مشاركة',
		linkLabel: 'رابط ChatGPT / Claude / Gemini',
		linkHint: 'الصق رابط مشاركة عام. نستخرج العناوين والفقرات إلى كتاب قابل للقراءة.',
		linkHintShort: 'الصق رابط مشاركة أو نصاً',
		invalidUrl: 'أدخل رابطاً صالحاً يبدأ بـ http',
		subtitle: 'الصق نصاً أو رابط مشاركة من أي ذكاء اصطناعي — نحوّله إلى مستند قراءة جميل.',
	},
};

for (const [file, patch] of [
	['messages/en.json', en],
	['messages/ar.json', ar],
]) {
	const j = JSON.parse(fs.readFileSync(file, 'utf8'));
	j.aiReading = deepMerge(j.aiReading || {}, patch);
	fs.writeFileSync(file, JSON.stringify(j, null, '\t') + '\n');
	console.log('ok', file);
}
