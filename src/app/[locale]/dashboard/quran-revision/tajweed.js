/**
 * AlQuran Cloud `quran-tajweed` markers → colored words.
 * Format: [h:1[ٱ]  /  [a:21[دًى م]  /  [g[مّ]
 * Docs: https://alquran.cloud/tajweed-guide
 */

export const TAJWEED_RULES = {
	h: {
		id: 'ham_wasl',
		color: '#8B8B8B',
		nameAr: 'همزة الوصل',
		nameEn: 'Hamzat ul-Wasl',
		meaningAr: 'همزة في أول الكلمة… أحيانًا ننطقها، وأحيانًا نعدّيها ونكمّل.',
		meaningEn: 'A hamza at the start of a word — sometimes said, sometimes skipped.',
		whyAr: 'لو بدأت القراءة من الكلمة دي: انطقها. لو جاية وسط الكلام بعد كلمة قبلها: متوقفش عليها وعدّي.',
		whyEn: 'Say it when you start from that word; skip it when you join from a previous word.',
		tipAr: 'فكّرها زي باب البيت: لو داخل من بره تفتحه، لو جوه البيت أصلاً… الباب مش محتاج يتفتح.',
		tipEn: 'Think of a door: open it when you start from outside; skip it when you’re already inside the sentence.',
		exampleAr: 'ٱلْحَمْدُ · ٱلرَّحْمَٰنِ',
		exampleEn: 'ٱلْحَمْدُ · ٱلرَّحْمَٰنِ',
		group: 'silent',
	},
	s: {
		id: 'slnt',
		color: '#8B8B8B',
		nameAr: 'حرف ساكن',
		nameEn: 'Silent letter',
		meaningAr: 'حرف أو علامة مكتوبة، لكن مش بننطقها في التلاوة.',
		meaningEn: 'Written on the page, but not pronounced when reciting.',
		whyAr: 'السبب: ده حرف وصلي أو علامة سكون/عدم نطق… فاللون الرمادي يقولك: عدّي من غير صوت.',
		whyEn: 'It is a joining mark or silent letter — grey means: pass without sound.',
		tipAr: 'الرمادي = «اتفرّج ومتتكلمش». مكتوب عشان الرسم، مش عشان الصوت.',
		tipEn: 'Grey = “look, don’t speak.” It’s written for the script, not the sound.',
		exampleAr: 'أولَٰٓئِكَ (الواو الساكنة غير المنطوقة)',
		exampleEn: 'أُولَٰٓئِكَ (silent wāw mark)',
		group: 'silent',
	},
	l: {
		id: 'laam_shamsiyah',
		color: '#8B8B8B',
		nameAr: 'لام شمسية',
		nameEn: 'Laam Shamsiyyah',
		meaningAr: 'لام «الـ» اللي مش بننطقها… بنروح على الحرف اللي بعدها مباشرة.',
		meaningEn: 'The lām in «الـ» that you do not say — jump straight to the next letter.',
		whyAr: 'مثال قريب: «الشمس» → نقول «أشْشَمس» مش «الْشمس». اللام اختفت واتدمجت.',
		whyEn: 'Like in «الشمس»: you say the shīn strongly, not a clear «al-».',
		tipAr: 'لو الحرف اللي بعد «ال» من الحروف الشمسية… اللام بتختفي زي ما الشمس بتخفي النجوم.',
		tipEn: 'If the letter after «ال» is a sun letter, the lām disappears — like sunlight hiding the stars.',
		exampleAr: 'ٱلشَّمْس · ٱلرَّحِيم',
		exampleEn: 'ٱلشَّمْس · ٱلرَّحِيم',
		group: 'silent',
	},
	n: {
		id: 'madda_normal',
		color: '#537FFF',
		nameAr: 'مد طبيعي',
		nameEn: 'Normal Madd',
		meaningAr: 'نمطّ الصوت شوية… بمقدار حركتين (زي ما تقول: آآ).',
		meaningEn: 'Stretch the sound a little — about two counts (like “aa”).',
		whyAr: 'لأن فيه حرف مد (ا / و / ي) من غير همزة بعده تغيّر الحكم. مدد بسيط وطبيعي.',
		whyEn: 'There is a madd letter (ا / و / ي) without a special following hamza — keep a short stretch.',
		tipAr: 'عدّ على صوابعك: واحد… اتنين. متطوّلش أكتر من كده في المد الطبيعي.',
		tipEn: 'Count on your fingers: one… two. Don’t overstretch a normal madd.',
		exampleAr: 'قَالَ · نُوحٍ · فِي',
		exampleEn: 'قَالَ · نُوحٍ · فِي',
		group: 'madd',
	},
	p: {
		id: 'madda_permissible',
		color: '#4050FF',
		nameAr: 'مد جائز منفصل',
		nameEn: 'Permissible Madd',
		meaningAr: 'نمطّ أكتر من الطبيعي… تقدر تطوّل ٢ أو ٤ أو ٦ حركات.',
		meaningEn: 'A longer stretch you may hold for 2, 4, or 6 counts.',
		whyAr: 'حرف المد في كلمة، والهمزة في الكلمة اللي بعدها. زي: «في أنفسهم» → المد في «في» والهمزة في «أنفسهم».',
		whyEn: 'The madd letter ends one word, and a hamza starts the next — stretch is allowed longer.',
		tipAr: 'كلمة… وبعدين همزة في كلمة تانية = مد منفصل. زي جسر بين كلمتين.',
		tipEn: 'Madd at the end of one word + hamza in the next = separate madd. Like a bridge between words.',
		exampleAr: 'فِي أَنْفُسِهِمْ · يَا أَيُّهَا',
		exampleEn: 'فِي أَنْفُسِهِمْ · يَا أَيُّهَا',
		group: 'madd',
	},
	m: {
		id: 'madda_necessary',
		color: '#000EBC',
		nameAr: 'مد لازم',
		nameEn: 'Necessary Madd',
		meaningAr: 'مد طويل ثابت: ست حركات… ومش اختياري.',
		meaningEn: 'A required long stretch — six counts, not optional.',
		whyAr: 'لأن حرف المد بعده حرف مشدّد (ساكن لازم). فالتطويل هنا واجب عشان النطق يكون صح.',
		whyEn: 'A madd letter is followed by a shaddah/required sukūn — stretch fully (six counts).',
		tipAr: 'اللون الغامق = خُد نفسك ومدّ ست عدّات. مفيش اختصار هنا.',
		tipEn: 'Deep blue = take a breath and hold six counts. No shortcuts here.',
		exampleAr: 'ٱلْحَآقَّة · ٱلضَّآلِّين',
		exampleEn: 'ٱلْحَآقَّة · ٱلضَّآلِّين',
		group: 'madd',
	},
	o: {
		id: 'madda_obligatory',
		color: '#2144C1',
		nameAr: 'مد واجب متصل',
		nameEn: 'Obligatory Madd',
		meaningAr: 'نمطّ ٤ إلى ٥ حركات… وهذا المد واجب.',
		meaningEn: 'Stretch for about 4–5 counts — this one is required.',
		whyAr: 'حرف المد والهمزة في نفس الكلمة. زي: «السماء». لازم نطوّل قبل الهمزة.',
		whyEn: 'Madd letter and hamza are in the same word (e.g. السماء) — stretch before the hamza.',
		tipAr: 'مد + همزة جوه نفس الكلمة = لازم تطوّل. متعدّيش الهمزة على السريع.',
		tipEn: 'Madd + hamza inside one word = must stretch. Don’t rush into the hamza.',
		exampleAr: 'ٱلسَّمَاء · جَاء',
		exampleEn: 'ٱلسَّمَاء · جَاء',
		group: 'madd',
	},
	q: {
		id: 'qlq',
		color: '#DD0008',
		nameAr: 'قلقلة',
		nameEn: 'Qalqalah',
		meaningAr: 'صوت «نطّة» خفيفة من الحرف… كأنه بيرجع ويرنّ شوية.',
		meaningEn: 'A light bounce/echo on the letter — it “pops” a little.',
		whyAr: 'الحروف دي: ق · ط · ب · ج · د… لو عليها سكون (ساكنة)، متعملهاش سكون ميت؛ اعملها قلقلة.',
		whyEn: 'On ق ط ب ج د with sukūn: do not freeze the letter — give it a small bounce.',
		tipAr: 'احفظ: «قطب جد». لو ساكنين… خلّيهم يطنّوا شوية زي كرة صغيرة ارتدّت.',
		tipEn: 'Remember «قطب جد». When they have sukūn, let them bounce lightly like a tiny ball.',
		exampleAr: 'يَجْعَل · قَدْ · أَحَطت',
		exampleEn: 'يَجْعَل · قَدْ · أَحَطت',
		group: 'qalqalah',
	},
	c: {
		id: 'ikhf_shfw',
		color: '#D500B7',
		nameAr: 'إخفاء شفوي',
		nameEn: 'Ikhfa Shafawi',
		meaningAr: 'الميم الساكنة قبل الباء… منخفيهاش تمامًا ولا نظهرها قوي؛ وبينهم غنة من الأنف.',
		meaningEn: 'Silent mīm before bāʾ — hide it softly with a nasal sound.',
		whyAr: 'لما تشوف ميم ساكنة وبعدها باء (م + ب)، خفّف الميم وطلع صوت خفيف من الخيشوم.',
		whyEn: 'When silent mīm meets bāʾ, soften the mīm and add a light nasal tone.',
		tipAr: 'م قبل ب = الشفاه بتتقرب والنفَس من الأنف. متقفليش الميم قوية.',
		tipEn: 'mīm before bāʾ = lips almost meet, sound from the nose. Don’t slam the mīm shut.',
		exampleAr: 'تَرْمِيهِم بِحِجَارَة',
		exampleEn: 'تَرْمِيهِم بِحِجَارَة',
		group: 'meem',
	},
	f: {
		id: 'ikhf',
		color: '#9400A8',
		nameAr: 'إخفاء حقيقي',
		nameEn: 'Ikhfa',
		meaningAr: 'النون الساكنة أو التنوين… منخفيها بين الإظهار والإدغام، مع غنة لطيفة.',
		meaningEn: 'Silent nūn or tanwīn is softly hidden — between clear and merged — with nasalization.',
		whyAr: 'لو بعدها حرف من حروف الإخفاء (مش حروف الإدغام ولا الإظهار)، متظهرش النون قوية ومتدغمشها؛ خفّيها مع غنة.',
		whyEn: 'Before the ikhfa letters: do not make nūn fully clear or fully merged — hide it with ghunnah.',
		tipAr: 'الإخفاء زي الهمس: النون موجودة… بس مخفية ورا غنة حلوة.',
		tipEn: 'Ikhfa is like a whisper: the nūn is there — softly hidden behind a gentle ghunnah.',
		exampleAr: 'مِن تَحْتِهَا · عَنْك',
		exampleEn: 'مِن تَحْتِهَا · عَنْك',
		group: 'noon',
	},
	w: {
		id: 'idghm_shfw',
		color: '#58B800',
		nameAr: 'إدغام شفوي',
		nameEn: 'Idgham Shafawi',
		meaningAr: 'ميم ساكنة وبعدها ميم… الاتنين بيتلمّوا ويبقوا ميم واحدة مشدّدة مع غنة.',
		meaningEn: 'Silent mīm + mīm → merge into one strong mīm with nasalization.',
		whyAr: 'قاعدة سهلة: م + م = مّ (بغنة). زي ما تسمع صوت أنف خفيف مع التشديد.',
		whyEn: 'Rule of thumb: mīm + mīm becomes a shaddah mīm with a soft nasal sound.',
		tipAr: 'ميم قابلت ميم = حضن واحد كبير (مّ) مع غنة.',
		tipEn: 'mīm meets mīm = one big hug (مّ) with ghunnah.',
		exampleAr: 'لَكُم مَّا · هُم مُّعْرِضُون',
		exampleEn: 'لَكُم مَّا · هُم مُّعْرِضُون',
		group: 'meem',
	},
	i: {
		id: 'iqlb',
		color: '#26BFFD',
		nameAr: 'إقلاب',
		nameEn: 'Iqlab',
		meaningAr: 'النون الساكنة أو التنوين قبل الباء… بنقلبها لميم مخفاة مع غنة.',
		meaningEn: 'Silent nūn/tanwīn before bāʾ turns into a soft hidden mīm with nasalization.',
		whyAr: 'لما تشوف نون/تنوين + باء، متقولش «نْب»؛ قولها أقرب لـ «مْب» بغنة خفيفة.',
		whyEn: 'Do not say a hard “n-b”; shift toward a soft “m-b” with ghunnah.',
		tipAr: 'الإقلاب = قلب النون لميم قبل الباء. اللون السماوي يقولك: غيّر الصوت بهدوء.',
		tipEn: 'Iqlab = flip nūn into mīm before bāʾ. Sky-blue means: gently change the sound.',
		exampleAr: 'مِن بَعْد · سَمِيعٌ بَصِير',
		exampleEn: 'مِن بَعْد · سَمِيعٌ بَصِير',
		group: 'noon',
	},
	a: {
		id: 'idgh_ghn',
		color: '#169777',
		nameAr: 'إدغام بغنة',
		nameEn: 'Idgham with Ghunnah',
		meaningAr: 'يعني: ندغم (نِلمّ) الحرفين في بعض، ومع الإدغام صوت غنة من الأنف.',
		meaningEn: 'Merge the two sounds together, and keep a nasal tone (ghunnah).',
		whyAr: 'نون ساكنة أو تنوين، وبعدها واحد من حروف: ي · ن · م · و (يجمعها «ينمو»). مثال: «مِن نَّعم» → النون بتختفي جوه النون اللي بعدها مع غنة.',
		whyEn: 'Silent nūn/tanwīn before ي ن م و (yanmū). Example: the first nūn blends into the next with a nasal sound.',
		tipAr: 'احفظ كلمة «ينمو». أي حرف منهم بعد النون/التنوين = إدغام… ومعاه غنة لذيذة من الأنف.',
		tipEn: 'Remember «ينمو» (yanmū). Any of those after nūn/tanwīn = merge — with a nice nasal tone.',
		exampleAr: 'مِن نِّعْمَة · مَن يَعْمَل',
		exampleEn: 'مِن نِّعْمَة · مَن يَعْمَل',
		group: 'noon',
	},
	u: {
		id: 'idgh_w_ghn',
		color: '#169200',
		nameAr: 'إدغام بلا غنة',
		nameEn: 'Idgham without Ghunnah',
		meaningAr: 'كمان ندغم الحرفين… لكن من غير غنة من الأنف.',
		meaningEn: 'Merge the sounds — but without the nasal tone.',
		whyAr: 'نون ساكنة أو تنوين وبعدها ل أو ر. زي: «مِن رَّب» → النون بتختفي جوه الراء بسرعة ومن غير غنة.',
		whyEn: 'Silent nūn/tanwīn before ل or ر — merge quickly with no ghunnah.',
		tipAr: 'ل و ر = إدغام سريع ونضيف… من غير صوت أنف. زي ما تلمّ الحرف وتكمّل.',
		tipEn: 'ل and ر = a quick clean merge — no nasal sound. Blend and move on.',
		exampleAr: 'مِن رَّبِّهِم · مِن لَّدُن',
		exampleEn: 'مِن رَّبِّهِم · مِن لَّدُن',
		group: 'noon',
	},
	d: {
		id: 'idgh_mus',
		color: '#7A7A7A',
		nameAr: 'إدغام متجانسين',
		nameEn: 'Idgham Mutajanisayn',
		meaningAr: 'حرفين طالعين من نفس المكان تقريبًا… فالتاني بيبلع الأول.',
		meaningEn: 'Two letters from nearly the same place — the second absorbs the first.',
		whyAr: 'مش لازم تحفظ مصطلح صعب: لو حسّيت حرفين قريبين جدًا واتلمّوا، غالبًا ده إدغام متجانسين. اقرأ الثاني مشدّدًا.',
		whyEn: 'When two very similar letters meet, merge into the second with a shaddah feel.',
		tipAr: 'متجانسين = «توأم في المخرج». التوأم التاني بياخد الدور كله.',
		tipEn: 'Mutajanisayn = twins of articulation. The second twin takes the whole role.',
		exampleAr: 'قَد تَّبَيَّن · إذ ظَّلَموا',
		exampleEn: 'قَد تَّبَيَّن',
		group: 'other',
	},
	b: {
		id: 'idgh_mqr',
		color: '#7A7A7A',
		nameAr: 'إدغام متقاربين',
		nameEn: 'Idgham Mutaqaribayn',
		meaningAr: 'حرفين قريبين من بعض في المخرج… فبندمجهم عشان النطق أسلس.',
		meaningEn: 'Two letters with nearby articulation points — merge them for smoother reading.',
		whyAr: 'زي ما تقرّب فمك لصوت واحد بدل اتنين متتاليين صعبين. التاني بياخد الشدة غالبًا.',
		whyEn: 'Instead of forcing two close sounds, blend into the second letter (often with shaddah).',
		tipAr: 'متقاربين = جيران في الفم. الجيران بيزوروا بعض… فيصيروا صوت واحد.',
		tipEn: 'Mutaqaribayn = neighbors in the mouth. Neighbors visit — and become one sound.',
		exampleAr: 'بَل رَّفَعَه · قُل رَّب',
		exampleEn: 'بَل رَّفَعَه · قُل رَّب',
		group: 'other',
	},
	g: {
		id: 'ghn',
		color: '#FF7E1E',
		nameAr: 'غنة',
		nameEn: 'Ghunnah',
		meaningAr: 'صوت خفيف من الأنف (الخيشوم)… مدّه حركتين.',
		meaningEn: 'A soft nasal sound from the nose — hold it for two counts.',
		whyAr: 'تظهر بوضوح على النون أو الميم المشدّدة (نّ / مّ). متستعجلش؛ سيّب الغنة تطلع شوية.',
		whyEn: 'Clearest on nūn/mīm with shaddah (نّ / مّ) — do not rush; let the nasal tone sound.',
		tipAr: 'اللون البرتقالي = «ريحّ من أنفك شوية». حركتين بس… متستعجلش ومتطوّلش زيادة.',
		tipEn: 'Orange = breathe a soft nasal tone for two counts. Don’t rush — and don’t overdo it.',
		exampleAr: 'إِنَّ · ثُمَّ · مِنَّا',
		exampleEn: 'إِنَّ · ثُمَّ · مِنَّا',
		group: 'ghunnah',
	},
};

/** Legend / guide order (unique visual rules). */
export const TAJWEED_LEGEND = [
	'a', 'u', 'i', 'f', 'g', 'w', 'c', 'q',
	'n', 'p', 'o', 'm', 'h', 'l', 's', 'd', 'b',
];

export const TAJWEED_GROUPS = [
	{
		id: 'noon',
		codes: ['a', 'u', 'i', 'f'],
		titleAr: 'أحكام النون الساكنة والتنوين',
		titleEn: 'Nūn sākinah & tanwīn',
		blurbAr: 'أهم عائلة في التجويد للمبتدئ: إمّا نِلمّ، أو نقلب، أو نخفّي… حسب الحرف اللي بعد النون.',
		blurbEn: 'The beginner’s core family: merge, flip, or hide — depending on the letter after nūn.',
	},
	{
		id: 'ghunnah',
		codes: ['g'],
		titleAr: 'الغنة',
		titleEn: 'Ghunnah',
		blurbAr: 'صوت الأنف الجميل اللي بيظهر مع النون والميم المشدّدتين.',
		blurbEn: 'The soft nasal tone that shines on nūn/mīm with shaddah.',
	},
	{
		id: 'meem',
		codes: ['w', 'c'],
		titleAr: 'أحكام الميم الساكنة',
		titleEn: 'Silent mīm rules',
		blurbAr: 'الميم الساكنة ليها قصة لوحدها: إمّا تدغم في ميم، أو تتخفّى قبل باء.',
		blurbEn: 'Silent mīm has its own story: merge into mīm, or hide before bāʾ.',
	},
	{
		id: 'qalqalah',
		codes: ['q'],
		titleAr: 'القلقلة',
		titleEn: 'Qalqalah',
		blurbAr: 'نطّة خفيفة تخلي الحرف الساكن حيّ… مش ميت.',
		blurbEn: 'A light bounce that keeps a silent letter alive — not dead.',
	},
	{
		id: 'madd',
		codes: ['n', 'p', 'o', 'm'],
		titleAr: 'المدود',
		titleEn: 'Madd (elongation)',
		blurbAr: 'كل ما اللون أغمق… غالبًا المد أطول وأوجب. الطبيعي قصير، واللازم أطولهم.',
		blurbEn: 'Deeper blue usually means a longer/required stretch. Normal is short; necessary is longest.',
	},
	{
		id: 'silent',
		codes: ['h', 'l', 's'],
		titleAr: 'حروف رمادية (مش منطوقة)',
		titleEn: 'Grey / silent marks',
		blurbAr: 'الرمادي معناه: مكتوب… بس متعملش عليه صوت.',
		blurbEn: 'Grey means: written on the page — but don’t give it a sound.',
	},
	{
		id: 'other',
		codes: ['d', 'b'],
		titleAr: 'إدغام خاص',
		titleEn: 'Special assimilation',
		blurbAr: 'لما حرفين قريبين جدًا يتقابلوا… بنِلمّهم عشان القراءة تبقى أسلس.',
		blurbEn: 'When two very close letters meet — merge them for smoother reading.',
	},
];

const MARKER_RE = /^\[([a-z])(?::(\d+))?\[/;
/** Arabic/Quran combining marks (harakat, superscript alef, pause marks, …) */
const LEADING_MARKS_RE = /^(\p{M}+)/u;

/**
 * Tajweed API sometimes uses rare alef forms missing from web fonts,
 * which then fall back to a dotted-circle placeholder.
 */
function normalizeTajweedGlyphs(text) {
	return String(text || '')
		.replace(/\u0672/g, '\u0627') // ALEF WITH WAVY HAMZA ABOVE → ALEF
		.replace(/\u0673/g, '\u0627') // ALEF WITH WAVY HAMZA BELOW → ALEF
		.replace(/\u0675/g, '\u0627'); // ALEF WITH HAMZA BELOW → ALEF
}

/**
 * If a span starts with a combining mark (e.g. َا / َٲ / ِۦ), browsers draw
 * a dotted circle ◌ because the mark has no base letter in that span.
 * Prefer attaching marks to the previous token; otherwise reorder onto the
 * first base character inside the same token.
 */
function reorderLeadingMarks(text) {
	const t = String(text || '');
	const lead = t.match(LEADING_MARKS_RE);
	if (!lead) return t;
	const marks = lead[1];
	const rest = t.slice(marks.length);
	const base = rest.match(/^(\P{M})(.*)$/u);
	if (!base) return rest; // orphan marks only — drop (avoid ◌)
	return base[1] + marks + base[2];
}

/**
 * Fix span boundaries that would otherwise produce ◌ dotted circles.
 */
function fixShapingTokens(tokens) {
	const out = tokens.map(t => ({
		...t,
		text: normalizeTajweedGlyphs(t.text),
	}));

	for (let i = 0; i < out.length; i += 1) {
		const lead = out[i].text.match(LEADING_MARKS_RE);
		if (!lead) continue;
		const marks = lead[1];
		const rest = out[i].text.slice(marks.length);
		const prev = i > 0 ? out[i - 1] : null;
		const canAttachPrev = prev && prev.text && !/\s$/.test(prev.text);
		if (canAttachPrev) {
			// …و + [n[َا → وَ + ا  (fatha belongs on the previous letter)
			prev.text += marks;
			out[i].text = rest;
		} else {
			out[i].text = reorderLeadingMarks(out[i].text);
		}
	}

	for (const t of out) {
		t.text = reorderLeadingMarks(t.text);
	}

	return out.filter(t => t.text);
}

/**
 * @returns {{ type: 'text'|'rule', text: string, code?: string, rule?: object }[]}
 */
export function parseTajweedTokens(raw) {
	const s = String(raw || '');
	const tokens = [];
	let i = 0;
	while (i < s.length) {
		if (s[i] === '[') {
			const m = s.slice(i).match(MARKER_RE);
			if (m) {
				i += m[0].length;
				const end = s.indexOf(']', i);
				if (end === -1) {
					tokens.push({ type: 'text', text: s.slice(i - m[0].length) });
					break;
				}
				const code = m[1];
				const rule = TAJWEED_RULES[code];
				tokens.push({
					type: 'rule',
					code,
					text: s.slice(i, end),
					rule,
				});
				i = end + 1;
				continue;
			}
		}
		let j = i + 1;
		while (j < s.length) {
			if (s[j] === '[' && MARKER_RE.test(s.slice(j))) break;
			j += 1;
		}
		tokens.push({ type: 'text', text: s.slice(i, j) });
		i = j;
	}
	return fixShapingTokens(tokens);
}

/**
 * Group tokens into hoverable words. Rules that span spaces
 * (e.g. idgham across word boundary) attach to each word piece.
 *
 * @returns {{ parts: { text: string, code?: string, color?: string }[], rules: string[] }[]}
 */
export function parseTajweedToWords(raw) {
	const tokens = parseTajweedTokens(raw);
	const words = [];
	let parts = [];
	let ruleCodes = new Set();

	const flush = () => {
		if (!parts.length) return;
		words.push({
			parts,
			rules: [...ruleCodes],
		});
		parts = [];
		ruleCodes = new Set();
	};

	const pushPiece = (text, code, color) => {
		let fixed = normalizeTajweedGlyphs(text);
		if (!fixed) return;
		const lead = fixed.match(LEADING_MARKS_RE);
		if (lead && parts.length) {
			const prev = parts[parts.length - 1];
			prev.text += lead[1];
			fixed = fixed.slice(lead[1].length);
			if (!fixed) {
				if (code) ruleCodes.add(code);
				return;
			}
		} else {
			fixed = reorderLeadingMarks(fixed);
		}
		if (!fixed) return;
		parts.push(code ? { text: fixed, code, color } : { text: fixed });
		if (code) ruleCodes.add(code);
	};

	for (const tok of tokens) {
		const chunks = String(tok.text || '').split(/(\s+)/);
		for (const chunk of chunks) {
			if (!chunk) continue;
			if (/^\s+$/.test(chunk)) {
				flush();
				continue;
			}
			if (tok.type === 'rule' && tok.rule) {
				pushPiece(chunk, tok.code, tok.rule.color);
			} else {
				pushPiece(chunk);
			}
		}
	}
	flush();
	return words;
}

export function maskTajweedWords(words, hideParts) {
	const parts = new Set(Array.isArray(hideParts) ? hideParts : []);
	if (!parts.size || !words?.length) return words;
	if (words.length === 1) {
		return parts.size ? [{ parts: [{ text: '••••' }], rules: [] }] : words;
	}
	const n = words.length;
	return words.map((w, i) => {
		const bucket = Math.min(2, Math.floor((i * 3) / n));
		const zone = bucket === 0 ? 'start' : bucket === 1 ? 'middle' : 'end';
		if (parts.has(zone)) return { parts: [{ text: '••••' }], rules: [] };
		return w;
	});
}

function mapRule(code, isAr) {
	const r = TAJWEED_RULES[code];
	if (!r) return null;
	return {
		code,
		color: r.color,
		name: isAr ? r.nameAr : r.nameEn,
		meaning: isAr ? r.meaningAr : r.meaningEn,
		why: isAr ? r.whyAr : r.whyEn,
		tip: isAr ? r.tipAr : r.tipEn,
		example: isAr ? r.exampleAr : r.exampleEn,
	};
}

export function rulesForLegend(isAr) {
	return TAJWEED_LEGEND.map(code => mapRule(code, isAr)).filter(Boolean);
}

export function rulesGroupedForGuide(isAr) {
	return TAJWEED_GROUPS.map(g => ({
		id: g.id,
		title: isAr ? g.titleAr : g.titleEn,
		blurb: isAr ? g.blurbAr : g.blurbEn,
		rules: g.codes.map(code => mapRule(code, isAr)).filter(Boolean),
	}));
}
