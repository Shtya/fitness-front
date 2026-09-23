const fs = require('fs');

function deepMerge(a, b) {
	const out = { ...a };
	for (const [k, v] of Object.entries(b)) {
		if (v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object') {
			out[k] = deepMerge(a[k], v);
		} else {
			out[k] = v;
		}
	}
	return out;
}

const enPatch = {
	nav: {
		workspace: 'Workspace',
		topics: 'Topics',
		journeys: 'Journeys',
	},
	hub: {
		focus: 'Focus',
		journeyProgress: 'Journey progress',
		next: 'Next',
		startReading: 'Start Reading',
		openWorkspace: 'AI Workspace',
		highlights: 'Highlights',
		actions: 'Actions',
		reviewCta: 'Remember what you read',
		reviewSub: 'Spaced review in a few calm minutes',
		journey: 'Current journey',
		noJourney: 'No monthly journey yet',
		seeAll: 'See all',
		createJourney: 'Create a monthly theme',
		explore: 'Topics to explore',
		exploreSub: 'Saved ideas waiting for a short session',
	},
	workspace: {
		leftTitle: 'Libraries',
		newChat: 'New chat',
		savedPrompts: 'Saved prompts',
		topics: 'Topics',
		chatTitle: 'AI Chat',
		chatSub: 'Native workspace — no ChatGPT iframe. Prompts & topics fill the composer.',
		composerPlaceholder: 'Ask, outline, explain, or write a short reading…',
		thinking: 'Thinking…',
		emptyReply: 'Done.',
		bookAttached: 'Reading draft ready →',
		emptyRight: 'Generated books, outlines, and imports appear here.',
		generatedBook: 'Generated reading',
		chapters: 'chapters',
		openReading: 'Open in Reading Mode',
		roadmap: 'Learning index',
		saveJourney: 'Save as journey',
		importReady: 'Transformed “{title}” — open it from the right panel.',
		notesPlaceholder: 'Scratch notes while you research…',
		notesHint: 'Session notes stay here until you paste them into a reading.',
		importHint: 'Paste from ChatGPT, Claude, Gemini, or any AI — then transform.',
		tabs: { content: 'Content', notes: 'Notes', import: 'Import' },
		quick: {
			article: 'Article',
			outline: 'Outline',
			explain: 'Explain',
			actions: 'Actions',
		},
	},
	topics: {
		title: 'Topic library',
		subtitle: 'Save curious questions for later — then turn them into 10-minute readings.',
		suggest: 'Suggest topics',
		search: 'Search topics…',
		addPlaceholder: 'Why do people…',
		generateReading: 'Generate reading',
		empty: 'No topics match. Add one or ask AI for suggestions.',
		folders: {
			all: 'All',
			favorites: 'Favorites',
			inbox: 'Inbox',
			psychology: 'Psychology',
			habits: 'Habits',
			money: 'Money',
			work: 'Work',
			health: 'Health',
			monthly: 'Monthly',
		},
	},
	journeys: {
		title: 'Monthly themes & journeys',
		subtitle: 'Pick a focus for the month. AI builds a short-session roadmap.',
		themePlaceholder: 'e.g. Understanding Psychology / Discipline',
		create: 'Generate roadmap',
		sessions: 'sessions',
		notFound: 'Journey not found',
		complete: 'complete',
		done: 'done',
		read: 'Read',
		start: 'Start',
	},
	knowledge: {
		bookmarkPage: 'Bookmark this page',
		ideaToActionPlaceholder: 'Turn into an action (e.g. phone outside bedroom for 7 days)',
		turnIntoAction: 'Make it an action',
	},
	errors: {
		chat: 'Chat failed. Try again.',
	},
	prompts: {
		filters: {
			outline: 'Outline',
		},
	},
};

const arPatch = {
	nav: {
		workspace: 'مساحة العمل',
		topics: 'المواضيع',
		journeys: 'الرحلات',
	},
	hub: {
		focus: 'التركيز',
		journeyProgress: 'تقدم الرحلة',
		next: 'التالي',
		startReading: 'ابدأ القراءة',
		openWorkspace: 'مساحة الذكاء',
		highlights: 'التظليلات',
		actions: 'الأفعال',
		reviewCta: 'تذكّر ما قرأت',
		reviewSub: 'مراجعة متباعدة في دقائق هادئة',
		journey: 'الرحلة الحالية',
		noJourney: 'لا توجد رحلة شهرية بعد',
		seeAll: 'عرض الكل',
		createJourney: 'أنشئ موضوعاً شهرياً',
		explore: 'مواضيع للاستكشاف',
		exploreSub: 'أفكار محفوظة بانتظار جلسة قصيرة',
	},
	workspace: {
		leftTitle: 'المكتبات',
		newChat: 'محادثة جديدة',
		savedPrompts: 'مطالبات محفوظة',
		topics: 'المواضيع',
		chatTitle: 'محادثة الذكاء',
		chatSub: 'واجهة أصلية — بدون تضمين ChatGPT. المطالبات والمواضيع تملأ المحرر.',
		composerPlaceholder: 'اسأل، أو ضع فهرساً، أو اشرح، أو اكتب قراءة قصيرة…',
		thinking: 'يفكّر…',
		emptyReply: 'تم.',
		bookAttached: 'مسودة قراءة جاهزة ←',
		emptyRight: 'تظهر هنا الكتب والفهرس والاستيرادات.',
		generatedBook: 'قراءة مولَّدة',
		chapters: 'فصول',
		openReading: 'افتح وضع القراءة',
		roadmap: 'فهرس التعلم',
		saveJourney: 'احفظ كرحلة',
		importReady: 'تم تحويل «{title}» — افتحه من اللوحة اليمنى.',
		notesPlaceholder: 'ملاحظات سريعة أثناء البحث…',
		notesHint: 'تبقى ملاحظات الجلسة هنا حتى تلصقها في قراءة.',
		importHint: 'الصق من ChatGPT أو Claude أو Gemini أو أي AI — ثم حوّل.',
		tabs: { content: 'المحتوى', notes: 'ملاحظات', import: 'استيراد' },
		quick: {
			article: 'مقال',
			outline: 'فهرس',
			explain: 'شرح',
			actions: 'أفعال',
		},
	},
	topics: {
		title: 'مكتبة المواضيع',
		subtitle: 'احفظ أسئلة مثيرة لاحقاً — ثم حوّلها إلى قراءات من 10 دقائق.',
		suggest: 'اقترح مواضيع',
		search: 'ابحث في المواضيع…',
		addPlaceholder: 'لماذا يؤجل الناس…',
		generateReading: 'ولّد قراءة',
		empty: 'لا مواضيع مطابقة. أضف واحداً أو اطلب اقتراحات.',
		folders: {
			all: 'الكل',
			favorites: 'المفضلة',
			inbox: 'الوارد',
			psychology: 'علم النفس',
			habits: 'العادات',
			money: 'المال',
			work: 'العمل',
			health: 'الصحة',
			monthly: 'شهري',
		},
	},
	journeys: {
		title: 'المواضيع الشهرية والرحلات',
		subtitle: 'اختر تركيز الشهر. يبني الذكاء الاصطناعي خارطة جلسات قصيرة.',
		themePlaceholder: 'مثال: فهم علم النفس / الانضباط',
		create: 'توليد الخارطة',
		sessions: 'جلسات',
		notFound: 'الرحلة غير موجودة',
		complete: 'مكتمل',
		done: 'تم',
		read: 'اقرأ',
		start: 'ابدأ',
	},
	knowledge: {
		bookmarkPage: 'ضع إشارة على هذه الصفحة',
		ideaToActionPlaceholder: 'حوّلها إلى فعل (مثال: الهاتف خارج غرفة النوم 7 أيام)',
		turnIntoAction: 'اجعلها فعلاً',
	},
	errors: {
		chat: 'فشل المحادثة. حاول مجدداً.',
	},
	prompts: {
		filters: {
			outline: 'فهرس',
		},
	},
};

for (const [file, patch] of [
	['messages/en.json', enPatch],
	['messages/ar.json', arPatch],
]) {
	const j = JSON.parse(fs.readFileSync(file, 'utf8'));
	if (!j.aiReading) throw new Error('missing aiReading in ' + file);
	j.aiReading = deepMerge(j.aiReading, patch);
	fs.writeFileSync(file, JSON.stringify(j, null, '\t') + '\n');
	console.log('patched', file);
}
