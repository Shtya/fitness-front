'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { AlertTriangle, Ban, BookOpen, Camera, Check, CloudSun, ImagePlus, Palette, Plus, Shirt, Sparkles, Sun, X } from 'lucide-react';
import { OCCASIONS, PANTS_FITS, PANTS_TYPES, SLOTS, SUBCATEGORIES, WEATHERS } from '../config/outfit-config.js';
import ColorCapture from '../components/ColorCapture.jsx';
import StageControls from './StageControls.jsx';
import { accessoryAdvice, fabricAdvice, hemAdvice, topAdvice } from '../engine/advice.js';
import { describeColor } from '../engine/color.js';
import { avoidCombos, suggestOutfits } from '../engine/match.js';
import { itemHex } from '../engine/stylist.js';
import { colorName } from '../outfit-ui.js';
import { useOutfit } from '../OutfitContext.jsx';
import { Chips, Disclosure, ItemImage, PillSelect, ScoreRing, Sheet, Swatch } from '../ui/primitives.jsx';

function StageLoading() {
	const t = useTranslations('outfitMatcher.viewer');
	return (
		<div className="wa-of-stage3d wa-of-stage3d-loading" role="status">
			<span className="wa-of-spinner" aria-hidden="true" />
			<span>{t('loading')}</span>
		</div>
	);
}
const MannequinViewer = dynamic(() => import('../3d/MannequinViewer.jsx'), { ssr: false, loading: () => <StageLoading /> });

const DEFAULT_CTX = { occasion: 'casual', weather: 'mild', pantsType: 'jeans', fit: 'slim', shoeType: 'whiteSneakers', topSlot: null };
// A calm starting outfit so the stage never looks empty.
const STARTER = { slots: { pants: { hex: '#2F4A6D', id: 'denim' }, shirt: { hex: '#F7F7F5', id: 'white' }, shoes: { hex: '#F5F5F5', id: 'white' }, socks: { hex: '#2F4A6D', id: 'denim' } }, topSlot: 'shirt' };
const SLOT_FROM_SUB = sub => SUBCATEGORIES[sub]?.slot || null;

function slotsFromLocks(locks) {
	const slots = {};
	for (const [slot, hex] of Object.entries(locks)) if (hex) slots[slot] = { hex, id: describeColor(hex)?.id };
	return slots;
}

export default function MatchStudio() {
	const t = useTranslations('outfitMatcher');
	const { locale, colorBlind, body, setBody, scoringProfile, preview, setPreview, items, nameOf } = useOutfit();
	const [locks, setLocks] = useState({});
	const [ctx, setCtx] = useState(DEFAULT_CTX);
	const [active, setActive] = useState(0);
	const [compareOn, setCompareOn] = useState(false);
	const [compareIndex, setCompareIndex] = useState(null);
	const [hemOverride, setHemOverride] = useState(null);
	const [picker, setPicker] = useState(null); // { mode } | { closet: true }
	const [detected, setDetected] = useState(null);
	const [target, setTarget] = useState('pants');
	const viewerApi = useRef(null);
	const stripRef = useRef(null);

	const top = topAdvice({ pantsType: ctx.pantsType, occasion: ctx.occasion, weather: ctx.weather, fit: ctx.fit });
	const topSlot = ctx.topSlot || (top.verdict === 'tshirt' ? 'tshirt' : 'shirt');
	const options = useMemo(
		() => ({ locks, occasion: ctx.occasion, weather: ctx.weather, profile: scoringProfile, shoeType: ctx.shoeType, pantsType: ctx.pantsType, topSlot }),
		[locks, ctx, scoringProfile, topSlot],
	);
	const suggestions = useMemo(() => suggestOutfits(options), [options]);
	const avoid = useMemo(() => avoidCombos(options), [options]);
	useEffect(() => {
		setActive(0);
		setCompareIndex(null);
	}, [suggestions]);

	// A preview sent from the closet / stylist takes over the stage until you change something here.
	useEffect(() => {
		if (!preview) return;
		setCtx(prev => ({ ...prev, fit: preview.fit || prev.fit, shoeType: preview.shoeType || prev.shoeType, pantsType: preview.pantsType || prev.pantsType }));
		setHemOverride(null);
	}, [preview]);
	useEffect(() => setHemOverride(null), [ctx.shoeType, ctx.fit]);

	const hem = hemAdvice({ shoeType: ctx.shoeType, fit: ctx.fit, hem: hemOverride || undefined });
	const selected = suggestions[active] || null;
	const stageOutfit = preview || selected || (Object.keys(locks).length ? { slots: slotsFromLocks(locks), topSlot } : STARTER);
	const compare = compareOn ? suggestions[compareIndex ?? (active + 1 < suggestions.length ? active + 1 : -1)] || null : null;
	const tuck = top.tuck === 'tuck';

	const lock = (slot, hex) => {
		setPreview(null);
		setLocks(prev => ({ ...prev, [slot]: hex }));
		if (slot === 'shirt' || slot === 'tshirt') setCtx(prev => ({ ...prev, topSlot: slot }));
	};
	const unlock = slot => {
		setPreview(null);
		setLocks(prev => {
			const next = { ...prev };
			delete next[slot];
			return next;
		});
	};
	const setC = key => value => {
		setPreview(null);
		setCtx(prev => ({ ...prev, [key]: value }));
	};
	const onDetected = useCallback((hex, warning) => setDetected({ hex, warning }), []);

	const viewerLabel = useMemo(() => {
		const parts = Object.entries(stageOutfit?.slots || {}).map(([slot, value]) => `${t(`slots.names.${slot}`)} ${colorName(value.id || value.hex, locale)}`);
		return t('viewer.label', { outfit: parts.join(', ') });
	}, [stageOutfit, locale, t]);

	const lockedEntries = Object.entries(locks);
	const ownedPickable = items.filter(item => item.status !== 'archived' && SLOT_FROM_SUB(item.subcategory));

	return (
		<div className="wa-of-studio">
			<div className="wa-of-studio-stage">
				<MannequinViewer
					outfit={stageOutfit}
					compareOutfit={compare}
					compareOn={compareOn}
					onToggleCompare={
						suggestions.length > 1
							? () => {
									setCompareOn(v => !v);
									setCompareIndex(null);
								}
							: undefined
					}
					body={body}
					onBody={setBody}
					hem={hem.chosen}
					onHem={setHemOverride}
					hemStatus={hem.status}
					fit={ctx.fit}
					shoeType={ctx.shoeType}
					onShoeType={setC('shoeType')}
					pantsType={ctx.pantsType}
					tuck={tuck}
					topLoose={preview?.topLoose}
					label={viewerLabel}
					apiRef={viewerApi}
					overlay={
						<StageControls
							outfit={stageOutfit}
							topSlot={topSlot}
							locks={locks}
							onLock={lock}
							onUnlock={unlock}
							suggestions={preview ? [] : suggestions}
							index={Math.min(active, Math.max(0, suggestions.length - 1))}
							onIndex={index => {
								setPreview(null);
								setActive(index);
							}}
							onShuffle={() => {
								if (suggestions.length < 2) return;
								let next = active;
								while (next === active) next = Math.floor(Math.random() * suggestions.length);
								setActive(next);
							}}
							locale={locale}
							colorBlind={colorBlind}
						/>
					}
				/>
				{preview?.owned ? (
					<div className="wa-of-stage-note">
						<Sparkles size={15} aria-hidden="true" />
						<span>{t('studio.previewingOwned')}</span>
						<button type="button" className="wa-of-link" onClick={() => setPreview(null)}>
							{t('studio.backToIdeas')}
						</button>
					</div>
				) : null}
			</div>

			<div className="wa-of-studio-panel">
				{/* Step 1 — your pieces */}
				<section className="wa-of-card" aria-labelledby="wa-of-start">
					<div className="wa-of-card-head">
						<h2 id="wa-of-start" className="wa-of-card-title">
							<span className="wa-of-step">1</span>
							{lockedEntries.length ? t('studio.yourPieces') : t('studio.startTitle')}
						</h2>
						{lockedEntries.length ? (
							<button type="button" className="wa-of-btn wa-of-btn-sm" onClick={() => setPicker({ mode: 'photo' })}>
								<Plus size={16} aria-hidden="true" />
								{t('studio.addPiece')}
							</button>
						) : null}
					</div>
					{lockedEntries.length ? (
						<ul className="wa-of-locks">
							{lockedEntries.map(([slot, hex]) => (
								<li key={slot}>
									<Swatch hex={hex} colorBlind={colorBlind} size="md" />
									<span className="wa-of-lock-text">
										<span className="wa-of-lock-slot">{t(`slots.names.${slot}`)}</span>
										<span className="wa-of-lock-color">
											{colorName(hex, locale)}{' '}
											<span className="wa-of-mono" dir="ltr">
												{hex}
											</span>
										</span>
									</span>
									<button type="button" className="wa-of-icon-btn" onClick={() => unlock(slot)} aria-label={t('slots.clear', { slot: t(`slots.names.${slot}`) })}>
										<X size={17} aria-hidden="true" />
									</button>
								</li>
							))}
						</ul>
					) : (
						<>
							<p className="wa-of-muted">{t('studio.startText')}</p>
							<div className="wa-of-tiles">
								<button type="button" className="wa-of-tile" onClick={() => setPicker({ mode: 'camera' })}>
									<Camera size={22} aria-hidden="true" />
									<span>{t('input.modes.camera')}</span>
								</button>
								<button type="button" className="wa-of-tile" onClick={() => setPicker({ mode: 'photo' })}>
									<ImagePlus size={22} aria-hidden="true" />
									<span>{t('input.modes.photo')}</span>
								</button>
								<button type="button" className="wa-of-tile" onClick={() => setPicker({ mode: 'manual' })}>
									<Palette size={22} aria-hidden="true" />
									<span>{t('studio.pickColor')}</span>
								</button>
								<button type="button" className="wa-of-tile" onClick={() => setPicker({ closet: true })} disabled={!ownedPickable.length} title={!ownedPickable.length ? t('studio.closetEmpty') : undefined}>
									<Shirt size={22} aria-hidden="true" />
									<span>{t('studio.fromCloset')}</span>
								</button>
							</div>
						</>
					)}
				</section>

				{/* Step 2 — details (compact) */}
				<section className="wa-of-card wa-of-card-tight" aria-labelledby="wa-of-details">
					<h2 id="wa-of-details" className="wa-of-card-title">
						<span className="wa-of-step">2</span>
						{t('studio.detailsTitle')}
					</h2>
					<div className="wa-of-pills">
						<PillSelect icon={Sun} label={t('context.occasion')} value={ctx.occasion} options={OCCASIONS} onChange={setC('occasion')} render={id => t(`context.occasions.${id}`)} />
						<PillSelect icon={CloudSun} label={t('context.weather')} value={ctx.weather} options={WEATHERS} onChange={setC('weather')} render={id => t(`context.weathers.${id}`)} />
						<PillSelect label={t('context.topSlot')} value={topSlot} options={['shirt', 'tshirt']} onChange={setC('topSlot')} render={id => t(`slots.names.${id}`)} />
						<PillSelect label={t('context.pantsType')} value={ctx.pantsType} options={PANTS_TYPES} onChange={setC('pantsType')} render={id => t(`context.pantsTypes.${id}`)} />
						<PillSelect label={t('context.fit')} value={ctx.fit} options={PANTS_FITS} onChange={setC('fit')} render={id => t(`context.fits.${id}`)} />
					</div>
				</section>

				{/* Step 3 — outfit ideas */}
				<section className="wa-of-card" aria-labelledby="wa-of-ideas">
					<div className="wa-of-card-head">
						<h2 id="wa-of-ideas" className="wa-of-card-title">
							<span className="wa-of-step">3</span>
							{t('suggestions.title')}
						</h2>
						{suggestions.length ? <span className="wa-of-badge">{t('suggestions.count', { count: suggestions.length })}</span> : null}
					</div>
					{!suggestions.length ? (
						<p className="wa-of-muted">{t('suggestions.empty')}</p>
					) : (
						<>
							<div className="wa-of-strip-scroll" ref={stripRef} role="listbox" aria-label={t('suggestions.title')}>
								{suggestions.map((outfit, index) => {
									const topValue = outfit.slots[outfit.topSlot];
									const isActive = index === active && !preview;
									const isCompare = compareOn && index === (compareIndex ?? active + 1);
									return (
										<button
											key={outfit.id}
											type="button"
											role="option"
											aria-selected={isActive}
											className="wa-of-idea"
											data-active={isActive || undefined}
											data-compare={isCompare || undefined}
											onClick={() => {
												setPreview(null);
												if (compareOn && index !== active) setCompareIndex(index);
												else setActive(index);
											}}
										>
											<span className="wa-of-idea-stack" aria-hidden="true">
												{['jacket', outfit.topSlot, 'pants', 'shoes'].map(slot =>
													outfit.slots[slot] ? <Swatch key={slot} hex={outfit.slots[slot].hex} colorBlind={colorBlind} size="bar" /> : null,
												)}
											</span>
											<span className="wa-of-idea-text">
												<span className="wa-of-idea-name">{colorName(topValue.id, locale)}</span>
												<span className="wa-of-muted">+ {colorName(outfit.slots.pants.id, locale)}</span>
											</span>
											<ScoreRing score={outfit.score} size="sm" label={t('suggestions.scoreLabel', { score: outfit.score })} />
										</button>
									);
								})}
							</div>
							{compareOn ? <p className="wa-of-hint">{t('viewer.compareHint')}</p> : null}
							{selected && !preview ? <IdeaDetail outfit={selected} hem={hem} top={top} ctx={ctx} locale={locale} t={t} /> : null}
						</>
					)}
				</section>

				<Disclosure title={t('studio.guideTitle')} icon={BookOpen}>
					<StyleGuide top={top} hem={hem} ctx={ctx} avoid={avoid} t={t} locale={locale} colorBlind={colorBlind} />
				</Disclosure>
			</div>

			<Sheet
				open={Boolean(picker)}
				onClose={() => {
					setPicker(null);
					setDetected(null);
				}}
				title={picker?.closet ? t('studio.fromCloset') : t('input.title')}
				size="lg"
				footer={
					picker && !picker.closet && detected ? (
						<button
							type="button"
							className="wa-of-btn wa-of-btn-primary wa-of-btn-block"
							onClick={() => {
								lock(target, detected.hex);
								setPicker(null);
								setDetected(null);
								toast.success(t('input.detected.assigned', { slot: t(`slots.names.${target}`) }));
							}}
						>
							<Check size={18} aria-hidden="true" />
							{t('input.detected.assign', { slot: t(`slots.names.${target}`) })}
						</button>
					) : null
				}
			>
				{picker?.closet ? (
					<div className="wa-of-pick-grid">
						{ownedPickable.map(item => (
							<button
								key={item.id}
								type="button"
								className="wa-of-pick-item"
								onClick={() => {
									lock(SLOT_FROM_SUB(item.subcategory), itemHex(item));
									setPicker(null);
								}}
							>
								<ItemImage item={item} colorBlind={colorBlind} />
								<span>{nameOf(item)}</span>
							</button>
						))}
					</div>
				) : picker ? (
					<div className="wa-of-stack">
						<ColorCapture bare initialMode={picker.mode} locale={locale} colorBlind={colorBlind} onDetected={onDetected} />
						{detected ? (
							<div className="wa-of-detected-row">
								<Swatch hex={detected.hex} colorBlind={colorBlind} size="xl" />
								<div className="wa-of-grow">
									<p className="wa-of-detected-name">{colorName(detected.hex, locale)}</p>
									<p className="wa-of-mono" dir="ltr">
										{detected.hex}
									</p>
									<p className="wa-of-muted">
										{t(`families.${describeColor(detected.hex).family}`)} · {t(`lightness.${describeColor(detected.hex).lightness}`)}
									</p>
								</div>
							</div>
						) : null}
						{detected ? (
							<>
								<p className="wa-of-label">{t('input.target')}</p>
								<Chips value={target} options={SLOTS} onChange={setTarget} label={t('input.target')} render={slot => t(`slots.names.${slot}`)} size="sm" />
							</>
						) : null}
					</div>
				) : null}
			</Sheet>
		</div>
	);
}

function IdeaDetail({ outfit, hem, top, ctx, locale, t }) {
	const params = { top: colorName(outfit.reasonParams.top, locale), pants: colorName(outfit.reasonParams.pants, locale) };
	const notes = accessoryAdvice(outfit, { shoeType: ctx.shoeType });
	return (
		<div className="wa-of-idea-detail" aria-live="polite">
			<p className="wa-of-idea-reason">
				<span className="wa-of-tag">{t(`strategies.${outfit.reason}`)}</span> {t(`reasons.${outfit.reason}`, params)}
			</p>
			{outfit.warnings.length ? (
				<ul className="wa-of-why wa-of-watch">
					{outfit.warnings.map(w => (
						<li key={w}>
							<AlertTriangle size={14} aria-hidden="true" />
							<span>{t(`warnings.${w}`)}</span>
						</li>
					))}
				</ul>
			) : null}
			<ul className="wa-of-quick">
				<li>
					<span className="wa-of-label">{t('advice.top.title')}</span>
					<span>
						{t(`advice.top.verdicts.${top.verdict}`)} · {t(`advice.top.tucks.${top.tuck}`)}
					</span>
				</li>
				<li>
					<span className="wa-of-label">{t('advice.hem.title')}</span>
					<span>{t(`advice.hem.lengths.${hem.best}`)}</span>
				</li>
				<li>
					<span className="wa-of-label">{t('advice.accessories.title')}</span>
					<span>{t(`advice.accessories.${notes[0]}`)}</span>
				</li>
			</ul>
		</div>
	);
}

function StyleGuide({ top, hem, ctx, avoid, t, locale, colorBlind }) {
	return (
		<div className="wa-of-guide">
			<div>
				<p className="wa-of-guide-title">{t('advice.top.title')}</p>
				<p className="wa-of-verdict">{t(`advice.top.verdicts.${top.verdict}`)}</p>
				<ul className="wa-of-bullets">
					{top.reasons.map(reason => (
						<li key={reason}>{t(`advice.top.reasons.${reason}`)}</li>
					))}
					<li>
						{t(`advice.top.tucks.${top.tuck}`)} · {t(`advice.top.sleeveStyles.${top.sleeves}`)}
					</li>
				</ul>
				<p className="wa-of-muted">
					{t('advice.top.alternatives')}: {top.alternatives.map(item => t(`advice.top.alternativeItems.${item}`)).join(' · ')}
				</p>
			</div>
			<div>
				<p className="wa-of-guide-title">{t('advice.hem.title')}</p>
				<p className="wa-of-muted">
					{t(`context.shoeTypes.${ctx.shoeType}`)} · {t(`context.fits.${ctx.fit}`)}
				</p>
				<p>{t(`advice.hem.reasons.${hem.reason}`)}</p>
				<dl className="wa-of-hem-table">
					<div data-kind="best">
						<dt>{t('advice.hem.best')}</dt>
						<dd>{t(`advice.hem.lengths.${hem.best}`)}</dd>
					</div>
					<div data-kind="ok">
						<dt>{t('advice.hem.ok')}</dt>
						<dd>{hem.ok.map(id => t(`advice.hem.lengths.${id}`)).join(' · ') || '—'}</dd>
					</div>
					<div data-kind="avoid">
						<dt>{t('advice.hem.avoid')}</dt>
						<dd>{hem.avoid.map(id => t(`advice.hem.lengths.${id}`)).join(' · ') || '—'}</dd>
					</div>
				</dl>
				{hem.never.map(key => (
					<p key={key} className="wa-of-alert">
						<AlertTriangle size={16} aria-hidden="true" />
						<span>{t(`advice.hem.never.${key}`)}</span>
					</p>
				))}
			</div>
			<div>
				<p className="wa-of-guide-title">{t('advice.fabrics.title')}</p>
				<div className="wa-of-tags">
					{fabricAdvice(ctx.weather).map(item => (
						<span key={item} className="wa-of-tag">
							{t(`advice.fabrics.items.${item}`)}
						</span>
					))}
				</div>
			</div>
			<div>
				<p className="wa-of-guide-title">
					<Ban size={15} aria-hidden="true" /> {t('advice.avoid.title')}
				</p>
				{!avoid.length ? (
					<p className="wa-of-muted">{t('advice.avoid.empty')}</p>
				) : (
					<ul className="wa-of-avoid">
						{avoid.map(item => (
							<li key={item.top}>
								<Swatch hex={item.hex} colorBlind={colorBlind} />
								<span>
									<strong>{t('advice.avoid.item', { top: colorName(item.top, locale), pants: colorName(item.pants, locale) })}</strong>
									<span className="wa-of-muted"> — {t(`warnings.${item.warning}`)}</span>
								</span>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
