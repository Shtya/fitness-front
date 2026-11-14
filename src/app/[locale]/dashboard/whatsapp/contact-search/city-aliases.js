/**
 * City / area aliases used by the contact finder.
 * Each entry lists Arabic + English spellings so one pick searches every common way
 * people write it (e.g. المحلة → "المحلة الكبرى" OR "El Mahalla El Kubra" OR "Mahalla").
 * First item in `ar` / `en` is the canonical display name.
 */
export const CITY_ALIASES = [
	// ---------------- Egypt — Greater Cairo
	{ id: 'cairo', cc: 'EG', ar: ['القاهرة', 'قاهرة'], en: ['Cairo', 'El Qahera'] },
	{ id: 'giza', cc: 'EG', ar: ['الجيزة', 'جيزة'], en: ['Giza', 'El Giza', 'Gizah'] },
	{ id: 'nasr-city', cc: 'EG', ar: ['مدينة نصر'], en: ['Nasr City', 'Madinet Nasr'], areaOf: 'cairo' },
	{ id: 'heliopolis', cc: 'EG', ar: ['مصر الجديدة'], en: ['Heliopolis', 'Masr El Gedida'], areaOf: 'cairo' },
	{ id: 'new-cairo', cc: 'EG', ar: ['القاهرة الجديدة', 'التجمع الخامس', 'التجمع'], en: ['New Cairo', 'Fifth Settlement', 'Tagamoa'], areaOf: 'cairo' },
	{ id: 'maadi', cc: 'EG', ar: ['المعادي'], en: ['Maadi', 'El Maadi'], areaOf: 'cairo' },
	{ id: 'helwan', cc: 'EG', ar: ['حلوان'], en: ['Helwan'], areaOf: 'cairo' },
	{ id: 'shubra', cc: 'EG', ar: ['شبرا'], en: ['Shubra', 'Shobra'], areaOf: 'cairo' },
	{ id: 'zamalek', cc: 'EG', ar: ['الزمالك'], en: ['Zamalek'], areaOf: 'cairo' },
	{ id: 'shorouk', cc: 'EG', ar: ['الشروق', 'مدينة الشروق'], en: ['El Shorouk', 'Shorouk City'], areaOf: 'cairo' },
	{ id: 'madinaty', cc: 'EG', ar: ['مدينتي'], en: ['Madinaty'], areaOf: 'cairo' },
	{ id: 'rehab', cc: 'EG', ar: ['الرحاب'], en: ['El Rehab', 'Rehab City'], areaOf: 'cairo' },
	{ id: 'obour', cc: 'EG', ar: ['العبور', 'مدينة العبور'], en: ['El Obour', 'Obour City'], areaOf: 'qalyubia' },
	{ id: 'october', cc: 'EG', ar: ['السادس من أكتوبر', '6 أكتوبر', 'أكتوبر'], en: ['6th of October', '6 October', 'October City'], areaOf: 'giza' },
	{ id: 'zayed', cc: 'EG', ar: ['الشيخ زايد', 'زايد'], en: ['Sheikh Zayed', 'Zayed City'], areaOf: 'giza' },
	{ id: 'mohandessin', cc: 'EG', ar: ['المهندسين'], en: ['Mohandessin', 'Mohandeseen'], areaOf: 'giza' },
	{ id: 'dokki', cc: 'EG', ar: ['الدقي'], en: ['Dokki', 'Doqqi'], areaOf: 'giza' },
	{ id: 'haram', cc: 'EG', ar: ['الهرم'], en: ['Haram', 'El Haram', 'Pyramids'], areaOf: 'giza' },
	{ id: 'faisal', cc: 'EG', ar: ['فيصل'], en: ['Faisal'], areaOf: 'giza' },
	{ id: 'imbaba', cc: 'EG', ar: ['إمبابة', 'امبابة'], en: ['Imbaba'], areaOf: 'giza' },

	// ---------------- Egypt — Delta
	{ id: 'alexandria', cc: 'EG', ar: ['الإسكندرية', 'اسكندرية', 'إسكندرية'], en: ['Alexandria', 'Alex', 'Eskendereya'] },
	{ id: 'mahalla', cc: 'EG', ar: ['المحلة الكبرى', 'المحلة', 'محلة'], en: ['El Mahalla El Kubra', 'Mahalla', 'El Mahalla', 'Al Mahallah al Kubra'], areaOf: 'gharbia' },
	{ id: 'tanta', cc: 'EG', ar: ['طنطا'], en: ['Tanta'], areaOf: 'gharbia' },
	{ id: 'kafr-zayat', cc: 'EG', ar: ['كفر الزيات'], en: ['Kafr El Zayat', 'Kafr Elzayat'], areaOf: 'gharbia' },
	{ id: 'zefta', cc: 'EG', ar: ['زفتى'], en: ['Zefta', 'Zifta'], areaOf: 'gharbia' },
	{ id: 'samanoud', cc: 'EG', ar: ['سمنود'], en: ['Samanoud', 'Samannud'], areaOf: 'gharbia' },
	{ id: 'gharbia', cc: 'EG', ar: ['الغربية', 'محافظة الغربية'], en: ['Gharbia', 'Gharbiya'] },
	{ id: 'mansoura', cc: 'EG', ar: ['المنصورة', 'منصورة'], en: ['Mansoura', 'El Mansoura', 'Al Mansurah'], areaOf: 'dakahlia' },
	{ id: 'mit-ghamr', cc: 'EG', ar: ['ميت غمر'], en: ['Mit Ghamr', 'Meet Ghamr'], areaOf: 'dakahlia' },
	{ id: 'talkha', cc: 'EG', ar: ['طلخا'], en: ['Talkha'], areaOf: 'dakahlia' },
	{ id: 'dakahlia', cc: 'EG', ar: ['الدقهلية'], en: ['Dakahlia', 'Daqahliya'] },
	{ id: 'zagazig', cc: 'EG', ar: ['الزقازيق', 'زقازيق'], en: ['Zagazig', 'El Zagazig'], areaOf: 'sharqia' },
	{ id: 'tenth-ramadan', cc: 'EG', ar: ['العاشر من رمضان', 'العاشر'], en: ['10th of Ramadan', 'Tenth of Ramadan'], areaOf: 'sharqia' },
	{ id: 'belbeis', cc: 'EG', ar: ['بلبيس'], en: ['Belbeis', 'Bilbeis'], areaOf: 'sharqia' },
	{ id: 'sharqia', cc: 'EG', ar: ['الشرقية'], en: ['Sharqia', 'Sharkia', 'Al Sharqiyah'] },
	{ id: 'banha', cc: 'EG', ar: ['بنها'], en: ['Banha', 'Benha'], areaOf: 'qalyubia' },
	{ id: 'qalyub', cc: 'EG', ar: ['قليوب'], en: ['Qalyub', 'Qalyoub'], areaOf: 'qalyubia' },
	{ id: 'shubra-kheima', cc: 'EG', ar: ['شبرا الخيمة'], en: ['Shubra El Kheima', 'Shubra Elkheima'], areaOf: 'qalyubia' },
	{ id: 'qalyubia', cc: 'EG', ar: ['القليوبية'], en: ['Qalyubia', 'Kalyubia'] },
	{ id: 'shebin', cc: 'EG', ar: ['شبين الكوم'], en: ['Shebin El Kom', 'Shibin El Kom'], areaOf: 'menoufia' },
	{ id: 'menouf', cc: 'EG', ar: ['منوف'], en: ['Menouf', 'Minuf'], areaOf: 'menoufia' },
	{ id: 'sadat', cc: 'EG', ar: ['مدينة السادات', 'السادات'], en: ['Sadat City', 'El Sadat'], areaOf: 'menoufia' },
	{ id: 'menoufia', cc: 'EG', ar: ['المنوفية'], en: ['Menoufia', 'Monufia'] },
	{ id: 'damanhour', cc: 'EG', ar: ['دمنهور'], en: ['Damanhour', 'Damanhur'], areaOf: 'beheira' },
	{ id: 'kafr-dawwar', cc: 'EG', ar: ['كفر الدوار'], en: ['Kafr El Dawwar', 'Kafr Eldawar'], areaOf: 'beheira' },
	{ id: 'beheira', cc: 'EG', ar: ['البحيرة'], en: ['Beheira', 'Buhayrah'] },
	{ id: 'kafr-sheikh', cc: 'EG', ar: ['كفر الشيخ'], en: ['Kafr El Sheikh', 'Kafr Elsheikh'] },
	{ id: 'desouk', cc: 'EG', ar: ['دسوق'], en: ['Desouk', 'Disuq'], areaOf: 'kafr-sheikh' },
	{ id: 'damietta', cc: 'EG', ar: ['دمياط'], en: ['Damietta', 'Domyat', 'Dumyat'] },
	{ id: 'new-damietta', cc: 'EG', ar: ['دمياط الجديدة'], en: ['New Damietta'], areaOf: 'damietta' },

	// ---------------- Egypt — Canal & Sinai & coast
	{ id: 'port-said', cc: 'EG', ar: ['بورسعيد', 'بور سعيد'], en: ['Port Said', 'Portsaid'] },
	{ id: 'ismailia', cc: 'EG', ar: ['الإسماعيلية', 'الاسماعيلية', 'اسماعيلية'], en: ['Ismailia', 'Ismailiya'] },
	{ id: 'suez', cc: 'EG', ar: ['السويس'], en: ['Suez', 'El Suez'] },
	{ id: 'arish', cc: 'EG', ar: ['العريش'], en: ['El Arish', 'Arish'] },
	{ id: 'sharm', cc: 'EG', ar: ['شرم الشيخ', 'شرم'], en: ['Sharm El Sheikh', 'Sharm'] },
	{ id: 'hurghada', cc: 'EG', ar: ['الغردقة'], en: ['Hurghada', 'Ghardaqa'] },
	{ id: 'matrouh', cc: 'EG', ar: ['مرسى مطروح', 'مطروح'], en: ['Marsa Matrouh', 'Matrouh'] },

	// ---------------- Egypt — Upper Egypt
	{ id: 'fayoum', cc: 'EG', ar: ['الفيوم', 'فيوم'], en: ['Fayoum', 'Faiyum', 'El Fayoum'] },
	{ id: 'beni-suef', cc: 'EG', ar: ['بني سويف'], en: ['Beni Suef', 'Bani Suef'] },
	{ id: 'minya', cc: 'EG', ar: ['المنيا', 'منيا'], en: ['Minya', 'El Minya', 'Menia'] },
	{ id: 'mallawi', cc: 'EG', ar: ['ملوي'], en: ['Mallawi'], areaOf: 'minya' },
	{ id: 'assiut', cc: 'EG', ar: ['أسيوط', 'اسيوط'], en: ['Assiut', 'Asyut', 'Asiut'] },
	{ id: 'sohag', cc: 'EG', ar: ['سوهاج'], en: ['Sohag', 'Suhag'] },
	{ id: 'qena', cc: 'EG', ar: ['قنا'], en: ['Qena', 'Kena'] },
	{ id: 'luxor', cc: 'EG', ar: ['الأقصر', 'الاقصر'], en: ['Luxor'] },
	{ id: 'aswan', cc: 'EG', ar: ['أسوان', 'اسوان'], en: ['Aswan'] },
	{ id: 'kharga', cc: 'EG', ar: ['الخارجة', 'الوادي الجديد'], en: ['Kharga', 'New Valley'] },

	// ---------------- Gulf & Levant
	{ id: 'riyadh', cc: 'SA', ar: ['الرياض'], en: ['Riyadh'] },
	{ id: 'jeddah', cc: 'SA', ar: ['جدة', 'جده'], en: ['Jeddah', 'Jidda'] },
	{ id: 'makkah', cc: 'SA', ar: ['مكة المكرمة', 'مكة'], en: ['Makkah', 'Mecca'] },
	{ id: 'madinah', cc: 'SA', ar: ['المدينة المنورة'], en: ['Madinah', 'Medina'] },
	{ id: 'dammam', cc: 'SA', ar: ['الدمام'], en: ['Dammam'] },
	{ id: 'khobar', cc: 'SA', ar: ['الخبر'], en: ['Al Khobar', 'Khobar'] },
	{ id: 'dubai', cc: 'AE', ar: ['دبي'], en: ['Dubai'] },
	{ id: 'abu-dhabi', cc: 'AE', ar: ['أبوظبي', 'ابو ظبي'], en: ['Abu Dhabi'] },
	{ id: 'sharjah', cc: 'AE', ar: ['الشارقة'], en: ['Sharjah'] },
	{ id: 'kuwait', cc: 'KW', ar: ['الكويت'], en: ['Kuwait City', 'Kuwait'] },
	{ id: 'doha', cc: 'QA', ar: ['الدوحة'], en: ['Doha'] },
	{ id: 'manama', cc: 'BH', ar: ['المنامة'], en: ['Manama'] },
	{ id: 'muscat', cc: 'OM', ar: ['مسقط'], en: ['Muscat'] },
	{ id: 'amman', cc: 'JO', ar: ['عمّان', 'عمان'], en: ['Amman'] },
];

const BY_ID = new Map(CITY_ALIASES.map((city) => [city.id, city]));

export function cityById(id) {
	return BY_ID.get(id) || null;
}

/* ------------------------------------------------------------------ */
/* Normalisation + fuzzy matching                                      */
/* ------------------------------------------------------------------ */

const AR_DIACRITICS = /[ً-ٰٟـ]/g;

export function isArabic(text) {
	return /[؀-ۿ]/.test(String(text || ''));
}

/** Loose key: removes "ال"/"El-"/"Al-", hamza forms, ta marbuta, doubled letters, spaces. */
export function normalizePlace(text) {
	let value = String(text || '').trim().toLowerCase();
	if (!value) return '';
	if (isArabic(value)) {
		value = value
			.replace(AR_DIACRITICS, '')
			.replace(/[أإآٱ]/g, 'ا')
			.replace(/ة/g, 'ه')
			.replace(/ى/g, 'ي')
			.replace(/ؤ/g, 'و')
			.replace(/ئ/g, 'ي')
			.split(/\s+/)
			.map((word) => word.replace(/^(ال|وال|بال)(?=..)/, ''))
			.join('');
		return value;
	}
	return value
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/\b(el|al|the)[\s-]+/g, '')
		.replace(/[^a-z0-9]/g, '')
		.replace(/(.)\1+/g, '$1')
		.replace(/ou/g, 'u')
		.replace(/ee/g, 'i');
}

function editDistance(a, b, max) {
	if (Math.abs(a.length - b.length) > max) return max + 1;
	let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
	for (let i = 1; i <= a.length; i += 1) {
		const cur = [i];
		let rowMin = i;
		for (let j = 1; j <= b.length; j += 1) {
			cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
			rowMin = Math.min(rowMin, cur[j]);
		}
		if (rowMin > max) return max + 1;
		prev = cur;
	}
	return prev[b.length];
}

/** Best city suggestions for what the user typed (Arabic or English, typos tolerated). */
export function suggestCities(input, { limit = 6, countryCode } = {}) {
	const key = normalizePlace(input);
	if (!key) return [];
	const scored = [];
	for (const city of CITY_ALIASES) {
		let best = 0;
		for (const alias of [...city.ar, ...city.en]) {
			const aliasKey = normalizePlace(alias);
			if (!aliasKey) continue;
			let score = 0;
			if (aliasKey === key) score = 100;
			else if (aliasKey.startsWith(key)) score = 80 - Math.min(20, aliasKey.length - key.length);
			else if (aliasKey.includes(key) && key.length >= 2) score = 55;
			else if (key.length >= 4) {
				const allowed = key.length >= 7 ? 2 : 1;
				const d = editDistance(key, aliasKey.slice(0, key.length + allowed), allowed);
				if (d <= allowed) score = 45 - d * 10;
			}
			if (score > best) best = score;
		}
		if (best > 0) {
			if (countryCode && city.cc === countryCode) best += 5;
			scored.push({ city, score: best });
		}
	}
	return scored
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
		.map((item) => item.city);
}

/** Up to `max` distinct spellings to OR together in a search query. */
export function citySearchTerms(city, max = 4) {
	if (!city) return [];
	const ordered = [city.ar[0], city.en[0], city.ar[1], city.en[1], ...city.ar.slice(2), ...city.en.slice(2)];
	const seen = new Set();
	const out = [];
	for (const term of ordered) {
		if (!term) continue;
		const k = normalizePlace(term);
		if (seen.has(k)) continue;
		seen.add(k);
		out.push(term);
		if (out.length >= max) break;
	}
	return out;
}

export function cityLabel(city, ar) {
	if (!city) return '';
	const parent = city.areaOf ? cityById(city.areaOf) : null;
	const main = ar ? city.ar[0] : city.en[0];
	const parentName = parent ? (ar ? parent.ar[0] : parent.en[0]) : '';
	return parentName ? `${main} · ${parentName}` : main;
}
