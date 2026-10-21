'use client';

import { BookOpen, Dumbbell, Gamepad2, GraduationCap, Laptop, NotebookPen, Settings, Sparkles } from 'lucide-react';

/*
 * What a wall note looks like follows what it is about: a category read from the ticket's own
 * title picks the paper colour, the pin, the small icon and a faint illustration at the bottom.
 * Nothing here is stored; renaming a ticket re-reads it.
 */

const RULES = [
	{ id: 'quran', words: ['quran', 'qur', 'surah', 'juz', 'قرآن', 'القرآن', 'سورة', 'جزء', 'ربع', 'حفظ'] },
	{ id: 'dhikr', words: ['allah', 'dhikr', 'zikr', 'pray', 'prayer', 'salah', 'dua', 'tasbih', 'الله', 'ذكر', 'أذكار', 'صلاة', 'دعاء', 'تسبيح', 'استغفار'] },
	{ id: 'sport', words: ['sport', 'gym', 'run', 'walk', 'workout', 'exercise', 'football', 'swim', 'play', 'playing', 'game', 'games', 'رياضة', 'تمرين', 'جيم', 'مشي', 'جري', 'كورة', 'لعب'] },
	{ id: 'tech', words: ['software', 'code', 'coding', 'app', 'website', 'web', 'api', 'bug', 'deploy', 'frontend', 'backend', 'برمجة', 'كود', 'تطبيق', 'موقع', 'سوفتوير'] },
	{ id: 'learn', words: ['learn', 'learning', 'course', 'study', 'read', 'campaign', 'class', 'lesson', 'تعلم', 'تعليم', 'كورس', 'مذاكرة', 'قراءة', 'حملة', 'درس'] },
	{ id: 'work', words: ['work', 'workin', 'workign', 'project', 'meeting', 'client', 'task', 'report', 'qsc', 'شغل', 'عمل', 'مشروع', 'اجتماع', 'عميل', 'تقرير'] },
];

/** Paper tone, pin colour and icon for each category. */
export const NOTE_THEMES = {
	quran: { tone: 'green', pin: '#1f9d55', Icon: BookOpen, art: 'leaves' },
	dhikr: { tone: 'yellow', pin: '#f08c1a', Icon: Sparkles, art: 'mosque' },
	sport: { tone: 'pink', pin: '#e0337a', Icon: Dumbbell, art: 'dumbbell' },
	tech: { tone: 'blue', pin: '#2f6fe0', Icon: Laptop, art: 'laptop' },
	learn: { tone: 'green', pin: '#1f9d55', Icon: GraduationCap, art: 'chart' },
	work: { tone: 'blue', pin: '#2f6fe0', Icon: Settings, art: 'wave' },
	note: { tone: 'yellow', pin: '#f08c1a', Icon: NotebookPen, art: 'wave' },
	done: { tone: 'lavender', pin: '#8b45d9', Icon: null, art: 'docs' },
};

const FALLBACK_TONES = ['yellow', 'blue', 'pink', 'green'];
const FALLBACK_PINS = { yellow: '#f08c1a', blue: '#2f6fe0', pink: '#e0337a', green: '#1f9d55' };

function hash(str) {
	let h = 0;
	for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) | 0;
	return Math.abs(h);
}

/** The category a title is about, matched on whole words (Arabic and English). */
export function noteCategory(title) {
	const text = ` ${String(title || '').toLowerCase()} `;
	const words = text.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
	for (const rule of RULES) {
		if (rule.words.some(word => words.some(w => w === word || (word.length > 4 && w.startsWith(word))))) return rule.id;
	}
	return 'note';
}

/** Everything a note needs to look like itself. Done notes all share the lavender "filed" look. */
export function noteTheme(ticket) {
	if (ticket.done) return { category: 'done', ...NOTE_THEMES.done };
	const category = noteCategory(ticket.title);
	if (category !== 'note') {
		const theme = NOTE_THEMES[category];
		// sport titles about playing get the controller, the rest the dumbbell
		const Icon = category === 'sport' && /\b(play|game)|لعب/i.test(ticket.title) ? Gamepad2 : theme.Icon;
		return { category, ...theme, Icon };
	}
	const tone = FALLBACK_TONES[hash(ticket.id) % FALLBACK_TONES.length];
	return { category, ...NOTE_THEMES.note, tone, pin: FALLBACK_PINS[tone] };
}

/** Long numbers ("500 times") get a marker stroke behind them; the rest of the title is plain. */
export function markNumbers(title) {
	const parts = String(title || '').split(/(\d{3,})/);
	if (parts.length === 1) return title;
	return parts.map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part));
}

/* ─── faint illustrations (currentColor, so each paper tints its own) ─── */

function Leaves() {
	return (
		<svg viewBox="0 0 80 70" className="tw-art is-start">
			<path d="M14 68 C16 48 22 32 34 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
			<path d="M18 54 C6 52 1 42 2 34 C12 36 19 44 18 54 Z" fill="currentColor" />
			<path d="M22 44 C24 32 32 26 40 26 C38 36 32 43 22 44 Z" fill="currentColor" opacity="0.85" />
			<path d="M26 34 C18 30 15 20 17 13 C25 17 29 25 26 34 Z" fill="currentColor" opacity="0.9" />
			<path d="M31 25 C33 16 40 11 47 11 C44 19 39 24 31 25 Z" fill="currentColor" opacity="0.75" />
			<path d="M40 70 C46 60 56 56 66 58 C60 66 50 70 40 70 Z" fill="currentColor" opacity="0.55" />
		</svg>
	);
}

function Mosque() {
	return (
		<svg viewBox="0 0 110 70" className="tw-art is-start">
			<rect x="6" y="18" width="7" height="52" rx="2" fill="currentColor" opacity="0.8" />
			<path d="M9.5 6 L13 18 H6 Z" fill="currentColor" opacity="0.8" />
			<path d="M24 70 V48 C24 34 36 26 48 22 C60 26 72 34 72 48 V70 Z" fill="currentColor" />
			<path d="M48 22 V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
			<circle cx="48" cy="10" r="2.4" fill="currentColor" />
			<path d="M72 70 V56 C72 49 78 45 84 43 C90 45 96 49 96 56 V70 Z" fill="currentColor" opacity="0.75" />
			<path d="M40 70 V58 C40 53 44 50 48 50 C52 50 56 53 56 58 V70 Z" fill="#fff" opacity="0.35" />
		</svg>
	);
}

function DumbbellArt() {
	return (
		<svg viewBox="0 0 80 60" className="tw-art is-start">
			<g transform="rotate(-24 40 30)" fill="currentColor">
				<rect x="6" y="20" width="9" height="22" rx="3" />
				<rect x="15" y="16" width="9" height="30" rx="3" opacity="0.9" />
				<rect x="24" y="28" width="32" height="6" rx="3" opacity="0.75" />
				<rect x="56" y="16" width="9" height="30" rx="3" opacity="0.9" />
				<rect x="65" y="20" width="9" height="22" rx="3" />
			</g>
		</svg>
	);
}

function LaptopArt() {
	return (
		<svg viewBox="0 0 110 70" className="tw-art is-start">
			<path d="M18 10 H82 C85 10 87 12 87 15 V50 H13 V15 C13 12 15 10 18 10 Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
			<rect x="19" y="16" width="62" height="28" rx="2" fill="currentColor" opacity="0.25" />
			<path d="M4 54 H96 L92 62 H8 Z" fill="currentColor" opacity="0.8" />
		</svg>
	);
}

function ChartArt() {
	return (
		<svg viewBox="0 0 70 60" className="tw-art is-end">
			<rect x="8" y="36" width="12" height="24" rx="3" fill="currentColor" opacity="0.6" />
			<rect x="26" y="24" width="12" height="36" rx="3" fill="currentColor" opacity="0.8" />
			<rect x="44" y="10" width="12" height="50" rx="3" fill="currentColor" />
			<path d="M50 2 L58 10 H42 Z" fill="currentColor" />
		</svg>
	);
}

function Docs() {
	return (
		<svg viewBox="0 0 70 70" className="tw-art is-end">
			<rect x="16" y="6" width="44" height="54" rx="5" fill="currentColor" opacity="0.45" />
			<rect x="8" y="14" width="44" height="54" rx="5" fill="currentColor" opacity="0.8" />
			<rect x="15" y="26" width="28" height="4" rx="2" fill="#fff" opacity="0.7" />
			<rect x="15" y="35" width="22" height="4" rx="2" fill="#fff" opacity="0.6" />
			<rect x="15" y="44" width="26" height="4" rx="2" fill="#fff" opacity="0.5" />
		</svg>
	);
}

const ARTS = { leaves: Leaves, mosque: Mosque, dumbbell: DumbbellArt, laptop: LaptopArt, chart: ChartArt, docs: Docs };

/** The illustration plus a soft hill/wave of the paper's own colour along the bottom. */
export function NoteArt({ art }) {
	const Art = ARTS[art];
	return (
		<span className={`tw-art-layer is-${art}`} aria-hidden>
			<svg className="tw-hill" viewBox="0 0 200 60" preserveAspectRatio="none">
				<path d="M0 44 C40 30 70 54 110 42 C150 30 172 22 200 30 V60 H0 Z" fill="currentColor" />
			</svg>
			{Art ? <Art /> : null}
		</span>
	);
}
