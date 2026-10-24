'use client';

import { useId } from 'react';
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

/* ─── progress on a note ─── */

/** Points of the step path: evenly spread, riding a gentle wave (0–100 box, x mirrored in RTL). */
function stepPoints(steps, rtl) {
	return Array.from({ length: steps }, (_, i) => {
		const t = steps > 1 ? i / (steps - 1) : 0.5;
		const x = 8 + t * 84;
		const y = 50 + 18 * Math.sin(t * Math.PI * 1.25 + 0.4);
		return [rtl ? 100 - x : x, y];
	});
}

/** Smooth curve through the points (Catmull-Rom as cubic Béziers). */
function curveThrough(points) {
	if (!points.length) return '';
	const all = points;
	let d = `M ${all[0][0]} ${all[0][1]}`;
	for (let i = 0; i < all.length - 1; i += 1) {
		const p0 = all[Math.max(0, i - 1)];
		const p1 = all[i];
		const p2 = all[i + 1];
		const p3 = all[Math.min(all.length - 1, i + 2)];
		const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
		const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
		d += ` C ${c1[0].toFixed(2)} ${c1[1].toFixed(2)}, ${c2[0].toFixed(2)} ${c2[1].toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
	}
	return d;
}

/**
 * The steps as a path across the note: the finished part is a glowing brush stroke ending on its
 * last checked step, the rest is a faint dashed trail with an empty dot per step to come.
 */
export function StepPath({ steps, progress, rtl = false }) {
	if (steps < 2) return null;
	const points = stepPoints(steps, rtl);
	const done = Math.max(0, Math.min(steps, progress));
	const full = curveThrough(points);
	const finished = done > 1 ? curveThrough(points.slice(0, done)) : '';
	return (
		<span className="tw-steps" aria-hidden>
			<svg viewBox="0 0 100 100" preserveAspectRatio="none">
				<path className="tw-steps__trail" d={full} vectorEffect="non-scaling-stroke" />
				{finished ? (
					<>
						<path className="tw-steps__glow" d={finished} vectorEffect="non-scaling-stroke" />
						<path className="tw-steps__done" d={finished} vectorEffect="non-scaling-stroke" key={done} pathLength="1" />
					</>
				) : null}
			</svg>
			{points.map(([x, y], i) => (
				<span
					key={i}
					className={`tw-steps__dot${i < done ? ' is-done' : ''}${i === done ? ' is-next' : ''}`}
					style={{ left: `${x}%`, top: `${y}%` }}
				>
					{i < done ? (
						<svg viewBox="0 0 16 16">
							<path d="M4 8.4 L6.9 11.2 L12 5.4" />
						</svg>
					) : null}
				</span>
			))}
		</span>
	);
}

/** Step counter: one ring segment per step, the count in the middle ("1" bold, "/4" small). */
export function ProgressRing({ steps, progress, size = 46, stroke = 4 }) {
	const r = (size - stroke) / 2;
	const len = 2 * Math.PI * r;
	const gap = steps > 1 ? Math.min(5, len / steps / 3) : 0;
	const seg = len / steps - gap;
	const filled = [];
	for (let i = 0; i < progress; i += 1) filled.push(seg, gap);
	filled.push(0, len);
	const c = size / 2;
	return (
		<span className="tw-ring" style={{ width: size, height: size }} aria-hidden>
			<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
				<circle className="tw-ring__track" cx={c} cy={c} r={r} strokeWidth={stroke} strokeDasharray={`${seg} ${gap}`} />
				<circle className="tw-ring__fill" cx={c} cy={c} r={r} strokeWidth={stroke} strokeDasharray={filled.join(' ')} />
			</svg>
			<span className="tw-ring__n" key={progress}>
				<b>{progress}</b>
				<small>/{steps}</small>
			</span>
		</span>
	);
}

/** Four-point sparkle, drawn in the note's gold. */
function Sparkle({ className }) {
	return (
		<svg viewBox="0 0 20 20" className={`tw-spark ${className}`}>
			<path d="M10 1 C10.8 7 13 9.2 19 10 C13 10.8 10.8 13 10 19 C9.2 13 7 10.8 1 10 C7 9.2 9.2 7 10 1 Z" fill="currentColor" />
		</svg>
	);
}

/** A single leaf drifting on the paper. */
function Leaf({ className }) {
	return (
		<svg viewBox="0 0 24 14" className={`tw-leaf ${className}`}>
			<path d="M1 7 C6 0 16 0 23 7 C16 14 6 14 1 7 Z" fill="currentColor" />
		</svg>
	);
}

/**
 * The illustration, two soft hills of the paper's own colour with a thin gold line along the
 * front one, a few sparkles and drifting leaves. All faint: the title stays the subject.
 */
export function NoteArt({ art }) {
	const Art = ARTS[art];
	return (
		<span className={`tw-art-layer is-${art}`} aria-hidden>
			<svg className="tw-hill is-back" viewBox="0 0 200 60" preserveAspectRatio="none">
				<path d="M0 30 C36 18 64 40 104 30 C144 20 170 12 200 20 V60 H0 Z" fill="currentColor" />
			</svg>
			<svg className="tw-hill is-front" viewBox="0 0 200 60" preserveAspectRatio="none">
				<path d="M0 46 C40 32 74 54 112 42 C150 30 174 30 200 36 V60 H0 Z" fill="currentColor" />
				<path className="tw-hill__line" d="M0 46 C40 32 74 54 112 42 C150 30 174 30 200 36" vectorEffect="non-scaling-stroke" />
			</svg>
			{Art ? <Art /> : null}
			{art === 'leaves' ? (
				<span className="tw-art-mirror">
					<Art />
				</span>
			) : null}
			<Sparkle className="is-a" />
			<Sparkle className="is-b" />
			<Leaf className="is-a" />
			<Leaf className="is-b" />
		</span>
	);
}

/** Hand-drawn brush stroke under the title. */
export function BrushLine() {
	return (
		<svg className="tw-brush" viewBox="0 0 200 16" preserveAspectRatio="none" aria-hidden>
			<path d="M3 11 C42 6 96 3 197 5 C150 8 92 10 46 13 C30 14 14 14 3 11 Z" fill="currentColor" />
		</svg>
	);
}

/**
 * The bottom corner curling up off the board: a flap whose crease follows the paper's cut and
 * whose free edge curves back over the note, lighter (the paper's back) toward its tip.
 */
export function PageCurl() {
	const id = `twcurl${useId().replace(/:/g, '')}`;
	return (
		<svg className="tw-curl" viewBox="0 0 100 100" aria-hidden>
			<defs>
				<linearGradient id={id} x1="1" y1="1" x2="0.25" y2="0.25">
					<stop offset="0" stopColor="var(--tw-flap)" />
					<stop offset="0.55" stopColor="var(--tw-back)" />
					<stop offset="1" stopColor="#ffffff" />
				</linearGradient>
			</defs>
			<path d="M0 100 L100 0 C78 20 56 30 30 34 C24 58 14 80 0 100 Z" fill={`url(#${id})`} />
			<path d="M0 100 L100 0" className="tw-curl__crease" />
		</svg>
	);
}
