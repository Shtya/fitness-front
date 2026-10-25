'use client';

import { Check, Minus, Plus, SlidersHorizontal } from 'lucide-react';
import { QUICK_THEMES, THEME_LABELS, THEME_STYLES } from '@/lib/ai-reading/themes';

const SIZE_MIN = 14;
const SIZE_MAX = 30;

/* Each choice maps onto the existing reading prefs, so the full settings panel stays in sync. */
const SPACING = [
	{ v: 1.6, ar: 'متقارب', en: 'Tight' },
	{ v: 1.85, ar: 'مريح', en: 'Comfy' },
	{ v: 2.1, ar: 'واسع', en: 'Airy' },
];
const WIDTHS = [
	{ v: 600, ar: 'ضيق', en: 'Narrow' },
	{ v: 680, ar: 'متوسط', en: 'Medium' },
	{ v: 780, ar: 'عريض', en: 'Wide' },
];
const FONTS = {
	ar: [
		{ v: 'auto', label: 'نسخ', sample: 'أ', family: '"Noto Naskh Arabic", serif' },
		{ v: 'amiri', label: 'أميري', sample: 'أ', family: 'Amiri, serif' },
		{ v: 'arabic', label: 'حديث', sample: 'أ', family: 'var(--font-arabic), Tajawal, sans-serif' },
	],
	en: [
		{ v: 'auto', label: 'Literata', sample: 'Aa', family: 'Literata, Georgia, serif' },
		{ v: 'georgia', label: 'Georgia', sample: 'Aa', family: 'Georgia, serif' },
		{ v: 'sans', label: 'Sans', sample: 'Aa', family: 'var(--font-dm-sans), system-ui, sans-serif' },
	],
};

function nearest(list, value) {
	return list.reduce((best, item) => (Math.abs(item.v - value) < Math.abs(best.v - value) ? item : best), list[0]);
}

/**
 * The quick "Aa" sheet: the handful of things a reader actually changes mid-chapter.
 * Everything else lives in the full settings panel behind "More settings".
 */
export default function ReaderAppearance({ prefs, updatePrefs, theme, uiAr, contentAr, onOpenAll }) {
	const L = (a, e) => (uiAr ? a : e);
	const size = Number(prefs.fontSize) || 19;
	const spacing = nearest(SPACING, Number(prefs.lineHeight) || 1.8);
	const width = nearest(WIDTHS, Number(prefs.maxWidth) || 680);
	const fonts = FONTS[contentAr ? 'ar' : 'en'];
	const fontPreset = fonts.some(f => f.v === prefs.fontPreset) ? prefs.fontPreset : null;
	const line = `color-mix(in srgb, ${theme.ink} 9%, transparent)`;
	const sunken = `color-mix(in srgb, ${theme.ink} 5%, transparent)`;

	const seg = (items, active, onPick, render) => (
		<div className="grid gap-1 rounded-xl p-1" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, background: sunken }}>
			{items.map(item => {
				const on = active === item.v;
				return (
					<button
						key={item.v}
						type="button"
						onClick={() => onPick(item.v)}
						aria-pressed={on}
						className="min-w-0 truncate rounded-lg px-2 py-2 text-[12.5px] font-semibold transition"
						style={on ? { background: theme.paper, color: theme.ink, boxShadow: `0 1px 2px rgba(0,0,0,.08), 0 0 0 1px ${line}` } : { color: theme.muted }}
					>
						{render ? render(item) : uiAr ? item.ar : item.en}
					</button>
				);
			})}
		</div>
	);

	const label = text => <p className="mb-2 text-[11.5px] font-semibold" style={{ color: theme.muted }}>{text}</p>;

	return (
		<div className="space-y-5" dir={uiAr ? 'rtl' : 'ltr'}>
			<div>
				{label(L('حجم الخط', 'Text size'))}
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={() => updatePrefs({ fontSize: Math.max(SIZE_MIN, size - 1) })}
						disabled={size <= SIZE_MIN}
						className="grid size-10 shrink-0 place-items-center rounded-full transition disabled:opacity-30"
						style={{ background: sunken }}
						aria-label={L('تصغير الخط', 'Smaller text')}
					>
						<Minus size={16} />
					</button>
					<input
						type="range"
						min={SIZE_MIN}
						max={SIZE_MAX}
						value={size}
						onChange={e => updatePrefs({ fontSize: Number(e.target.value) })}
						className="min-w-0 flex-1"
						style={{ accentColor: theme.accent }}
						aria-label={L('حجم الخط', 'Text size')}
					/>
					<button
						type="button"
						onClick={() => updatePrefs({ fontSize: Math.min(SIZE_MAX, size + 1) })}
						disabled={size >= SIZE_MAX}
						className="grid size-10 shrink-0 place-items-center rounded-full transition disabled:opacity-30"
						style={{ background: sunken }}
						aria-label={L('تكبير الخط', 'Larger text')}
					>
						<Plus size={16} />
					</button>
					<span className="w-7 shrink-0 text-center text-[13px] font-semibold tabular-nums">{size}</span>
				</div>
			</div>

			<div>
				{label(L('الخلفية', 'Page'))}
				<div className="grid grid-cols-6 gap-2">
					{QUICK_THEMES.map(id => {
						const sw = THEME_STYLES[id];
						const on = prefs.theme === id;
						return (
							<button key={id} type="button" onClick={() => updatePrefs({ theme: id })} className="flex min-w-0 flex-col items-center gap-1.5" aria-pressed={on} aria-label={THEME_LABELS[id][uiAr ? 0 : 1]}>
								<span
									className="grid aspect-square w-full max-w-11 place-items-center rounded-full text-[13px] font-semibold transition"
									style={{
										background: sw.bg,
										color: sw.ink,
										boxShadow: on ? `0 0 0 2px ${theme.paper}, 0 0 0 4px ${theme.accent}` : `inset 0 0 0 1px ${line}`,
										fontFamily: contentAr ? '"Noto Naskh Arabic", serif' : 'Literata, Georgia, serif',
									}}
								>
									{on ? <Check size={15} /> : contentAr ? 'أ' : 'Aa'}
								</span>
								<span className="w-full truncate text-center text-[10.5px]" style={{ color: on ? theme.ink : theme.muted }}>
									{THEME_LABELS[id][uiAr ? 0 : 1]}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			<div>
				{label(L('الخط', 'Typeface'))}
				{seg(fonts, fontPreset, v => updatePrefs({ fontPreset: v }), item => (
					<span className="flex items-baseline justify-center gap-1.5">
						<span style={{ fontFamily: item.family, fontSize: 15 }}>{item.sample}</span>
						<span>{item.label}</span>
					</span>
				))}
			</div>

			<div className="grid grid-cols-2 gap-3">
				<div>
					{label(L('المسافات', 'Spacing'))}
					{seg(SPACING, spacing.v, v => updatePrefs({ lineHeight: v }))}
				</div>
				<div>
					{label(L('عرض السطر', 'Line width'))}
					{seg(WIDTHS, width.v, v => updatePrefs({ maxWidth: v }))}
				</div>
			</div>

			<div>
				{label(L('طريقة القراءة', 'Layout'))}
				{seg(
					[
						{ v: 'pages', ar: 'صفحات', en: 'Pages' },
						{ v: 'scroll', ar: 'تمرير متصل', en: 'Continuous' },
					],
					prefs.pageMode === 'scroll' ? 'scroll' : 'pages',
					v => updatePrefs({ pageMode: v }),
				)}
			</div>

			<button
				type="button"
				onClick={onOpenAll}
				className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold transition"
				style={{ color: theme.accent, background: `color-mix(in srgb, ${theme.accent} 8%, transparent)` }}
			>
				<SlidersHorizontal size={15} /> {L('كل إعدادات القراءة', 'All reading settings')}
			</button>
		</div>
	);
}
