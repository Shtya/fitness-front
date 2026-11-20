'use client';

import { useTranslations } from 'next-intl';
import { Heart } from 'lucide-react';
import { ITEM_FITS, MATERIALS, PALETTE, PATTERNS, SEASONS, STYLE_TAGS, SUBCATEGORIES, WARDROBE_CATEGORIES } from '../config/outfit-config.js';
import { normalizeHex } from '../engine/color.js';
import { colorName, isArabic } from '../outfit-ui.js';
import { Chips, Swatch } from '../ui/primitives.jsx';

const LOW = 0.6;

/** Editable item attributes; low-confidence AI fields are highlighted. */
export default function ItemEditor({ item, onChange, locale, colorBlind, compact = false }) {
	const t = useTranslations('outfitMatcher.wardrobe');
	const lang = isArabic(locale) ? 'ar' : 'en';
	const conf = item.confidence || {};
	const low = key => (conf[key] != null && conf[key] < LOW ? true : undefined);
	const set = (key, value) => onChange({ ...item, [key]: value, confidence: { ...conf, [key === 'colors' ? 'color' : key]: 1 } });
	const subs = Object.entries(SUBCATEGORIES)
		.filter(([, value]) => value.category === item.category)
		.map(([id]) => id);
	const primary = item.colors?.primary?.hex || '#808080';
	const setPrimary = hex => {
		const clean = normalizeHex(hex);
		if (clean) set('colors', { ...item.colors, primary: { hex: clean } });
	};

	return (
		<div className="wa-of-editor">
			<Field label={t('category')} low={low('category')} lowLabel={t('checkThis')}>
				<Chips
					value={item.category}
					options={WARDROBE_CATEGORIES}
					size="sm"
					label={t('category')}
					render={id => t(`categories.${id}`)}
					onChange={category => {
						const first = Object.entries(SUBCATEGORIES).find(([, v]) => v.category === category)?.[0];
						onChange({ ...item, category, subcategory: first, formality: SUBCATEGORIES[first]?.formality ?? item.formality, confidence: { ...conf, category: 1, subcategory: 1 } });
					}}
				/>
			</Field>
			{subs.length > 1 ? (
				<Field label={t('type')} low={low('subcategory')} lowLabel={t('checkThis')}>
					<Chips value={item.subcategory} options={subs} size="sm" label={t('type')} render={id => t(`sub.${id}`)} onChange={value => onChange({ ...item, subcategory: value, formality: SUBCATEGORIES[value]?.formality ?? item.formality, confidence: { ...conf, subcategory: 1 } })} />
				</Field>
			) : null}
			<Field label={t('color')} low={low('color')} lowLabel={t('checkThis')}>
				<div className="wa-of-row-gap wa-of-wrap">
					<label className="wa-of-color-input">
						<span className="wa-of-sr">{t('color')}</span>
						<input type="color" value={primary.toLowerCase()} onChange={event => setPrimary(event.target.value)} />
					</label>
					<span className="wa-of-colorlabel">
						<span>{colorName(primary, locale)}</span>
						<span className="wa-of-mono" dir="ltr">
							{primary}
						</span>
					</span>
					{item.verifiedByPixels ? <span className="wa-of-tag wa-of-tag-ok">{t('verifiedByPixels')}</span> : null}
				</div>
				{item.colorCandidates?.length > 1 ? (
					<div className="wa-of-row-gap wa-of-wrap" aria-label={t('detectedColors')}>
						{item.colorCandidates.map(c => (
							<button key={c.hex} type="button" className="wa-of-chip wa-of-chip-sm" data-active={c.hex === primary || undefined} onClick={() => setPrimary(c.hex)}>
								<Swatch hex={c.hex} size="sm" colorBlind={colorBlind} />
								{colorName(c.hex, locale)}
							</button>
						))}
					</div>
				) : null}
				{!compact ? (
					<details className="wa-of-details-inline">
						<summary>{t('allColors')}</summary>
						<div className="wa-of-mini-palette">
							{PALETTE.map(color => (
								<button key={color.id} type="button" className="wa-of-mini-swatch" data-active={color.hex === primary || undefined} onClick={() => setPrimary(color.hex)} aria-label={color.names[lang]} title={color.names[lang]}>
									<Swatch hex={color.hex} family={color.family} colorBlind={colorBlind} size="sm" />
								</button>
							))}
						</div>
					</details>
				) : null}
			</Field>
			<div className="wa-of-grid-2">
				<Field label={t('pattern')} low={low('pattern')} lowLabel={t('checkThis')}>
					<Select value={item.pattern || 'solid'} options={PATTERNS} onChange={v => set('pattern', v)} render={id => t(`patterns.${id}`)} />
				</Field>
				<Field label={t('fabric')} low={low('fabric')} lowLabel={t('checkThis')}>
					<Select value={item.fabric || 'cotton'} options={MATERIALS} onChange={v => set('fabric', v)} render={id => t(`fabrics.${id}`)} />
				</Field>
				<Field label={t('fit')} low={low('fit')} lowLabel={t('checkThis')}>
					<Select value={item.fit || 'regular'} options={ITEM_FITS} onChange={v => set('fit', v)} render={id => t(`fits.${id}`)} />
				</Field>
				<Field label={t('formality')} low={low('formality')} lowLabel={t('checkThis')}>
					<Select value={String(item.formality || 2)} options={['1', '2', '3', '4', '5']} onChange={v => set('formality', Number(v))} render={id => t(`formality5.${id}`)} />
				</Field>
			</div>
			<Field label={t('seasons')} low={low('seasons')} lowLabel={t('checkThis')}>
				<Chips multiple value={item.seasons || []} options={SEASONS} size="sm" label={t('seasons')} render={id => t(`seasonNames.${id}`)} onChange={v => set('seasons', v)} />
			</Field>
			{!compact ? (
				<>
					<Field label={t('style')}>
						<Chips multiple value={item.styleTags || []} options={STYLE_TAGS} size="sm" label={t('style')} render={id => t(`styles.${id}`)} onChange={v => set('styleTags', v)} />
					</Field>
					<div className="wa-of-grid-2">
						<TextField label={t('nickname')} value={item.nickname} onChange={v => set('nickname', v)} max={40} />
						<TextField label={t('brand')} value={item.brand} onChange={v => set('brand', v)} max={40} />
						<TextField label={t('price')} value={item.price ?? ''} onChange={v => set('price', v === '' ? null : Math.max(0, Number(v) || 0))} type="number" />
						<TextField label={t('purchaseDate')} value={item.purchaseDate || ''} onChange={v => set('purchaseDate', v || null)} type="date" />
					</div>
					<TextField label={t('notes')} value={item.notes} onChange={v => set('notes', v)} max={300} multiline />
					<label className="wa-of-toggle">
						<input type="checkbox" checked={Boolean(item.favorite)} onChange={event => set('favorite', event.target.checked)} />
						<span className="wa-of-toggle-title">
							<Heart size={15} aria-hidden="true" /> {t('favorite')}
						</span>
					</label>
				</>
			) : null}
		</div>
	);
}

function Field({ label, low, lowLabel, children }) {
	return (
		<div className="wa-of-field" data-low={low}>
			<span className="wa-of-label">
				{label}
				{low ? <span className="wa-of-low"> · {lowLabel}</span> : null}
			</span>
			{children}
		</div>
	);
}

function Select({ value, options, onChange, render }) {
	return (
		<select className="wa-of-input wa-of-select" value={value} onChange={event => onChange(event.target.value)}>
			{options.map(option => (
				<option key={option} value={option}>
					{render(option)}
				</option>
			))}
		</select>
	);
}

/** Text input; strips angle brackets and caps length (sanitised before storage). */
function TextField({ label, value, onChange, type = 'text', max = 80, multiline = false }) {
	const clean = v => (type === 'text' || multiline ? String(v).replace(/[<>]/g, '').slice(0, max) : v);
	return (
		<label className="wa-of-field">
			<span className="wa-of-label">{label}</span>
			{multiline ? (
				<textarea className="wa-of-input wa-of-textarea" rows={2} value={value || ''} maxLength={max} onChange={event => onChange(clean(event.target.value))} />
			) : (
				<input className="wa-of-input" type={type} value={value ?? ''} maxLength={type === 'text' ? max : undefined} inputMode={type === 'number' ? 'decimal' : undefined} min={type === 'number' ? 0 : undefined} onChange={event => onChange(clean(event.target.value))} />
			)}
		</label>
	);
}
