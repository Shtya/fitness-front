import { createBlock, createBook, createChapter, createPage, estimateReadingMinutes, uid } from './schemas.js';

/**
 * Deterministic markdown / AI-paste → structured book.
 * Preserves meaning; improves presentation structure.
 */
export function transformRawToBook(raw, options = {}) {
	const text = String(raw || '').replace(/\r\n/g, '\n').trim();
	if (!text) {
		return createBook({
			title: options.title || 'Empty document',
			source: 'imported',
			language: options.language || 'en',
			chapters: [createChapter('Chapter 1', [createPage('', [createBlock('paragraph', '')])])],
		});
	}

	const lines = text.split('\n');
	let title = options.title || '';
	let subtitle = '';
	const chapters = [];
	let currentChapter = null;
	let currentPage = null;
	let paraBuf = [];

	const flushPara = () => {
		const joined = paraBuf.join(' ').trim();
		paraBuf = [];
		if (!joined) return;
		ensurePage();
		const classified = classifyParagraph(joined);
		currentPage.blocks.push(classified);
	};

	const ensureChapter = (name) => {
		flushPara();
		currentChapter = createChapter(name || `Chapter ${chapters.length + 1}`);
		currentChapter.order = chapters.length;
		chapters.push(currentChapter);
		currentPage = null;
	};

	const ensurePage = (name) => {
		if (!currentChapter) ensureChapter('Introduction');
		if (!currentPage || (name && currentPage.blocks.length > 12)) {
			flushPara();
			currentPage = createPage(name || '');
			currentPage.order = currentChapter.pages.length;
			currentChapter.pages.push(currentPage);
		} else if (name && !currentPage.title) {
			currentPage.title = name;
		}
	};

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();

		if (!trimmed) {
			flushPara();
			continue;
		}

		const h1 = trimmed.match(/^#\s+(.+)$/);
		const h2 = trimmed.match(/^##\s+(.+)$/);
		const h3 = trimmed.match(/^###\s+(.+)$/);
		const bullet = trimmed.match(/^[-*•]\s+(.+)$/);
		const numbered = trimmed.match(/^\d+[.)]\s+(.+)$/);
		const quote = trimmed.match(/^>\s+(.+)$/);
		const hr = /^(-{3,}|\*{3,}|_{3,})$/.test(trimmed);

		if (hr) {
			flushPara();
			continue;
		}

		if (h1) {
			flushPara();
			if (!title) {
				title = stripMd(h1[1]);
			} else {
				ensureChapter(stripMd(h1[1]));
			}
			continue;
		}

		if (h2) {
			flushPara();
			const name = stripMd(h2[1]);
			if (/^chapter\b/i.test(name) || /^الفصل\b/.test(name) || chapters.length === 0) {
				ensureChapter(name);
			} else {
				ensurePage(name);
				currentPage.blocks.push(createBlock('heading', name, { level: 2 }));
			}
			continue;
		}

		if (h3) {
			flushPara();
			ensurePage();
			currentPage.blocks.push(createBlock('heading', stripMd(h3[1]), { level: 3 }));
			continue;
		}

		if (quote) {
			flushPara();
			ensurePage();
			currentPage.blocks.push(createBlock('quote', stripMd(quote[1])));
			continue;
		}

		if (bullet || numbered) {
			flushPara();
			ensurePage();
			const items = [];
			let j = i;
			while (j < lines.length) {
				const t = lines[j].trim();
				const m = t.match(/^[-*•]\s+(.+)$/) || t.match(/^\d+[.)]\s+(.+)$/);
				if (!m) break;
				items.push(stripMd(m[1]));
				j++;
			}
			i = j - 1;
			currentPage.blocks.push(createBlock('list', '', { items }));
			continue;
		}

		// Bold-only label lines → callouts / key ideas
		const boldOnly = trimmed.match(/^\*\*(.+?)\*\*:?\s*(.*)$/);
		if (boldOnly && boldOnly[1].length < 80) {
			flushPara();
			ensurePage();
			const label = stripMd(boldOnly[1]).toLowerCase();
			let rest = stripMd(boldOnly[2] || '');
			if (!rest && i + 1 < lines.length) {
				const next = lines[i + 1].trim();
				if (next && !/^#/.test(next) && !/^\*\*/.test(next) && !/^[-*•]/.test(next) && !/^>/.test(next)) {
					rest = stripMd(next);
					i += 1;
				}
			}
			if (/key\s*(idea|concept|takeaway)|فكرة|مفهوم/.test(label)) {
				currentPage.blocks.push(createBlock('key_idea', rest || stripMd(boldOnly[1])));
			} else if (/action|تطبيق|خطوة/.test(label)) {
				currentPage.blocks.push(createBlock('callout', rest || stripMd(boldOnly[1]), { calloutType: 'action' }));
			} else if (/note|ملاحظة|important|مهم/.test(label)) {
				currentPage.blocks.push(createBlock('callout', rest || stripMd(boldOnly[1]), { calloutType: 'note' }));
			} else {
				currentPage.blocks.push(createBlock('heading', stripMd(boldOnly[1]), { level: 3 }));
				if (rest) currentPage.blocks.push(createBlock('paragraph', rest));
			}
			continue;
		}

		paraBuf.push(trimmed);
	}

	flushPara();

	if (!chapters.length) {
		ensureChapter('Reading');
		ensurePage();
		currentPage.blocks.push(createBlock('paragraph', text));
	}

	// Split oversized pages
	for (const ch of chapters) {
		const rebuilt = [];
		for (const page of ch.pages) {
			if (page.blocks.length <= 14) {
				rebuilt.push(page);
				continue;
			}
			for (let i = 0; i < page.blocks.length; i += 10) {
				const slice = page.blocks.slice(i, i + 10);
				const p = createPage(i === 0 ? page.title : '');
				p.blocks = slice;
				p.order = rebuilt.length;
				rebuilt.push(p);
			}
		}
		ch.pages = rebuilt;
	}

	if (!title) {
		const firstHeading = chapters[0]?.pages?.[0]?.blocks?.find(b => b.type === 'heading' || b.type === 'paragraph');
		title = firstHeading?.text?.slice(0, 80) || options.title || 'Imported reading';
	}

	const book = createBook({
		title,
		subtitle,
		source: 'imported',
		language: options.language || detectLanguage(text),
		tags: options.tags || [],
		author: options.author || 'Imported',
		style: options.style || 'narrative',
		chapters,
	});

	if (book.chapters[0]?.pages?.[0]) {
		book.progress = {
			chapterId: book.chapters[0].id,
			pageId: book.chapters[0].pages[0].id,
			percent: 0,
			scrollRatio: 0,
		};
	}

	book.readingTimeMinutes = estimateReadingMinutes(book);
	book.knowledge.tags = inferTags(book);
	return book;
}

function stripMd(s) {
	return String(s || '')
		.replace(/\*\*(.+?)\*\*/g, '$1')
		.replace(/\*(.+?)\*/g, '$1')
		.replace(/`(.+?)`/g, '$1')
		.replace(/\[(.+?)\]\(.+?\)/g, '$1')
		.trim();
}

function classifyParagraph(text) {
	const t = stripMd(text);
	if (
		(t.startsWith('"') && t.endsWith('"')) ||
		(t.startsWith('“') && t.endsWith('”')) ||
		(t.startsWith('«') && t.endsWith('»'))
	) {
		return createBlock('quote', t.replace(/^["“«]|["”»]$/g, '').trim());
	}
	if (/^(key\s*(idea|concept)|takeaway|الأفكار?\s*الأساسية|فكرة\s*مهمة)/i.test(t)) {
		return createBlock('key_idea', t.replace(/^[^:]+:\s*/, ''));
	}
	if (/^(note|important|remember|ملاحظة|مهم)\b/i.test(t)) {
		return createBlock('callout', t, { calloutType: 'note' });
	}
	if (t.length < 90 && /[:：]$/.test(t)) {
		return createBlock('heading', t.replace(/[:：]$/, ''), { level: 3 });
	}
	return createBlock('paragraph', t);
}

function detectLanguage(text) {
	const arabic = (text.match(/[\u0600-\u06FF]/g) || []).length;
	const latin = (text.match(/[A-Za-z]/g) || []).length;
	return arabic > latin ? 'ar' : 'en';
}

function inferTags(book) {
	const blob = `${book.title} ${book.subtitle}`.toLowerCase();
	const tags = [];
	const map = [
		[/money|مال|wealth|ثرو/, 'money'],
		[/mind|عقل|psychology|نفس/, 'mind'],
		[/habit|عادة|discipline|انضباط/, 'habits'],
		[/health|صحة|fitness|لياقة/, 'health'],
		[/work|عمل|career|مهنة/, 'work'],
		[/learn|تعلم|study|دراسة/, 'learning'],
	];
	for (const [re, tag] of map) {
		if (re.test(blob)) tags.push(tag);
	}
	return tags.slice(0, 4);
}

/** Normalize AI JSON book payload into our schema. */
export function normalizeAiBook(payload, options = {}) {
	const data = payload?.book || payload;
	const chapters = (data.chapters || []).map((ch, ci) => {
		const chapter = createChapter(ch.title || `Chapter ${ci + 1}`);
		chapter.order = ci;
		chapter.pages = (ch.pages || []).map((pg, pi) => {
			const page = createPage(pg.title || '');
			page.order = pi;
			page.blocks = (pg.blocks || []).map(b => {
				const type = ['paragraph', 'heading', 'quote', 'callout', 'key_idea', 'list'].includes(b.type)
					? b.type
					: 'paragraph';
				return createBlock(type, b.text || '', {
					level: b.level,
					items: b.items,
					calloutType: b.calloutType,
				});
			});
			if (!page.blocks.length && pg.content) {
				page.blocks = [createBlock('paragraph', pg.content)];
			}
			return page;
		});
		if (!chapter.pages.length) {
			chapter.pages = [createPage('', [createBlock('paragraph', ch.content || '')])];
		}
		return chapter;
	});

	const book = createBook({
		title: data.title || options.topic || 'Generated reading',
		subtitle: data.subtitle || '',
		author: data.author || 'AI Reading Room',
		language: data.language || options.language || 'en',
		tags: data.tags || [],
		source: options.source || 'generated',
		style: options.style || data.style || 'narrative',
		depth: options.depth || 'standard',
		readingTimeMinutes: options.readingTimeMinutes || data.readingTimeMinutes || 10,
		chapters,
		knowledge: {
			notes: [],
			highlights: [],
			keyIdeas: (data.keyIdeas || []).map(t => ({ id: uid('idea'), text: String(t), createdAt: new Date().toISOString() })),
			questions: (data.questions || []).map(t => ({ id: uid('q'), text: String(t), answer: '', createdAt: new Date().toISOString() })),
			actions: (data.actions || []).map(t => ({
				id: uid('act'),
				text: String(typeof t === 'string' ? t : t.text || ''),
				done: false,
				createdAt: new Date().toISOString(),
			})),
			tags: data.tags || [],
			review: null,
		},
	});

	if (book.chapters[0]?.pages?.[0]) {
		book.progress = {
			chapterId: book.chapters[0].id,
			pageId: book.chapters[0].pages[0].id,
			percent: 0,
			scrollRatio: 0,
		};
	}
	book.readingTimeMinutes = estimateReadingMinutes(book) || book.readingTimeMinutes;
	return book;
}

/** Offline / no-API fallback generator — still returns real structured content. */
export function generateFallbackBook({ topic, style = 'narrative', depth = 'standard', language = 'en', readingTimeMinutes = 10 }) {
	const isAr = language === 'ar';
	const t = topic || (isAr ? 'عادة القراءة' : 'The power of consistent reading');

	const sections = isAr
		? [
				{
					title: 'الفصل الأول — الفكرة الأساسية',
					blocks: [
						{ type: 'paragraph', text: `موضوعنا اليوم هو «${t}». الهدف ليس جمع المعلومات، بل تحويلها إلى فهم يمكن تطبيقه.` },
						{ type: 'key_idea', text: 'الفهم العميق يأتي من القراءة البطيئة والتأمل، لا من سرعة الإنهاء.' },
						{ type: 'paragraph', text: 'عندما تقرأ بقصد، تتحول كل فكرة إلى سؤال: كيف أستخدم هذا غداً؟' },
					],
				},
				{
					title: 'الفصل الثاني — أمثلة من الواقع',
					blocks: [
						{ type: 'heading', text: 'مثال عملي', level: 3 },
						{ type: 'paragraph', text: `تخيّل أنك تخصص عشرين دقيقة يومياً لموضوع «${t}». خلال شهر يصبح لديك خريطة ذهنية واضحة.` },
						{ type: 'quote', text: 'الثبات يتفوق على الحماس المتقطع.' },
						{ type: 'callout', text: 'اكتب فكرة واحدة فقط بعد كل جلسة قراءة.', calloutType: 'note' },
					],
				},
				{
					title: 'الفصل الثالث — التطبيق',
					blocks: [
						{ type: 'paragraph', text: 'المعرفة بلا تطبيق تبهت بسرعة. اربط كل فكرة بسلوك صغير قابل للقياس.' },
						{ type: 'list', text: '', items: ['حدد وقتاً ثابتاً للقراءة', 'ظلل فكرة واحدة مهمة', 'حوّلها إلى فعل ليوم غد'] },
						{ type: 'callout', text: 'اقرأ ٢٠ دقيقة كل صباح قبل فتح هاتفك.', calloutType: 'action' },
					],
				},
			]
		: [
				{
					title: 'Chapter 1 — The Core Idea',
					blocks: [
						{ type: 'paragraph', text: `This reading explores “${t}”. The goal is not to finish pages — it is to leave with something you can use.` },
						{ type: 'key_idea', text: 'Depth beats speed. One idea applied well is worth more than ten skimmed chapters.' },
						{ type: 'paragraph', text: `In a ${style} voice, we slow down enough to notice what actually matters about ${t}.` },
					],
				},
				{
					title: 'Chapter 2 — Real-world texture',
					blocks: [
						{ type: 'heading', text: 'A practical scene', level: 3 },
						{ type: 'paragraph', text: `Imagine spending focused minutes each day on ${t}. After a few weeks, patterns appear that skimming never reveals.` },
						{ type: 'quote', text: 'Consistency beats intensity.' },
						{ type: 'callout', text: 'After each session, capture one sentence you want to remember.', calloutType: 'note' },
					],
				},
				{
					title: 'Chapter 3 — From idea to action',
					blocks: [
						{ type: 'paragraph', text: `Knowledge fades unless it becomes behavior. Turn ${t} into a small, repeatable practice.` },
						{ type: 'list', text: '', items: ['Protect a daily reading window', 'Highlight one idea', 'Write one action for tomorrow'] },
						{ type: 'callout', text: 'Read for 20 minutes every morning before opening your phone.', calloutType: 'action' },
					],
				},
			];

	if (depth === 'deep') {
		sections.push(
			isAr
				? {
						title: 'الفصل الرابع — أسئلة للمراجعة',
						blocks: [
							{ type: 'paragraph', text: 'استخدم هذه الأسئلة لاحقاً في المراجعة المتباعدة.' },
							{ type: 'list', text: '', items: [`ما الفكرة الأهم في «${t}»؟`, 'ما الذي سأفعله غداً بسبب ما قرأت؟', 'ما الذي ما زال غير واضح؟'] },
						],
					}
				: {
						title: 'Chapter 4 — Review questions',
						blocks: [
							{ type: 'paragraph', text: 'Use these later in spaced review so the ideas stick.' },
							{ type: 'list', text: '', items: [`What is the one idea about ${t} you must not forget?`, 'What will you do tomorrow because of this?', 'What is still unclear?'] },
						],
					},
		);
	}

	const payload = {
		title: t,
		subtitle: isAr ? 'قراءة منظمة للتأمل والتطبيق' : 'A structured reading for reflection and application',
		language,
		style,
		tags: [style, depth],
		keyIdeas: isAr
			? ['الثبات أهم من الحماس', 'حوّل الفكرة إلى فعل صغير']
			: ['Consistency beats intensity', 'Turn every idea into one small action'],
		questions: isAr
			? [`كيف أطبّق «${t}» هذا الأسبوع؟`]
			: [`How will I apply “${t}” this week?`],
		actions: isAr
			? ['اقرأ ٢٠ دقيقة غداً صباحاً']
			: ['Read for 20 minutes tomorrow morning'],
		chapters: sections.map(s => ({
			title: s.title,
			pages: [{ title: '', blocks: s.blocks }],
		})),
	};

	return normalizeAiBook(payload, {
		topic: t,
		style,
		depth,
		language,
		readingTimeMinutes,
		source: 'generated',
	});
}
