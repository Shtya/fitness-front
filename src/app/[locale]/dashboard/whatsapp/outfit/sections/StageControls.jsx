'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Lock, Shuffle, X } from 'lucide-react';
import { PALETTE } from '../config/outfit-config.js';
import { colorName, isArabic } from '../outfit-ui.js';
import { ScoreRing, Swatch } from '../ui/primitives.jsx';

/**
 * Controls drawn on top of the 3D stage:
 *  - a column of piece buttons (top, pants, shoes, watch, jacket): tap → pick that piece's colour;
 *    the colour is locked and every other piece regenerates to match.
 *  - a style slider (‹ 2 / 8 ›) to flip through the matching outfits, plus shuffle.
 */
export default function StageControls({ outfit, topSlot, locks, onLock, onUnlock, suggestions, index, onIndex, onShuffle, locale, colorBlind }) {
	const t = useTranslations('outfitMatcher');
	const [editing, setEditing] = useState(null);
	const lang = isArabic(locale) ? 'ar' : 'en';
	const slots = [topSlot, 'pants', 'shoes', 'strap', ...(outfit?.slots?.jacket || locks.jacket ? ['jacket'] : [])];
	const current = suggestions[index];
	const total = suggestions.length;
	const step = delta => onIndex((index + delta + total) % total);
	const slotName = slot => (slot === 'strap' ? t('studio.stage.watch') : t(`slots.names.${slot}`));

	return (
		<>
			<div className="wa-of-piece-rail" role="toolbar" aria-label={t('studio.stage.pieces')}>
				{slots.map(slot => {
					const hex = locks[slot] || outfit?.slots?.[slot]?.hex;
					return (
						<button
							key={slot}
							type="button"
							className="wa-of-piece-btn"
							data-active={editing === slot || undefined}
							data-locked={locks[slot] ? true : undefined}
							onClick={() => setEditing(editing === slot ? null : slot)}
							aria-label={t('studio.stage.pieceColor', { slot: slotName(slot) })}
							aria-expanded={editing === slot}
						>
							<Swatch hex={hex} size="md" colorBlind={colorBlind} />
							{locks[slot] ? (
								<span className="wa-of-piece-lock" aria-hidden="true">
									<Lock size={9} />
								</span>
							) : null}
							<span className="wa-of-piece-name">{slotName(slot)}</span>
						</button>
					);
				})}
			</div>

			{editing ? (
				<div className="wa-of-stage3d-panel wa-of-color-panel" role="dialog" aria-label={t('studio.stage.pieceColor', { slot: slotName(editing) })}>
					<div className="wa-of-panel-head">
						<p className="wa-of-panel-title">{t('studio.stage.pieceColor', { slot: slotName(editing) })}</p>
						<button type="button" className="wa-of-icon-btn" onClick={() => setEditing(null)} aria-label={t('common.close')}>
							<X size={18} aria-hidden="true" />
						</button>
					</div>
					<p className="wa-of-hint">{t('studio.stage.pickHint')}</p>
					<button
						type="button"
						className="wa-of-chip wa-of-chip-sm"
						data-active={!locks[editing] || undefined}
						onClick={() => {
							onUnlock(editing);
							setEditing(null);
						}}
					>
						{t('studio.stage.auto')}
					</button>
					<div className="wa-of-color-grid" role="listbox" aria-label={slotName(editing)}>
						{PALETTE.map(color => (
							<button
								key={color.id}
								type="button"
								role="option"
								aria-selected={locks[editing] === color.hex}
								className="wa-of-color-cell"
								data-active={locks[editing] === color.hex || undefined}
								onClick={() => {
									onLock(editing, color.hex);
									setEditing(null);
								}}
								title={color.names[lang]}
								aria-label={color.names[lang]}
							>
								<Swatch hex={color.hex} family={color.family} colorBlind={colorBlind} size="md" />
								<span>{color.names[lang]}</span>
							</button>
						))}
					</div>
				</div>
			) : null}

			<div className="wa-of-style-slider" aria-live="polite">
				{total ? (
					<>
						<button type="button" className="wa-of-fab" onClick={() => step(-1)} aria-label={t('studio.stage.prev')} title={t('studio.stage.prev')}>
							<ChevronLeft size={18} className="wa-of-flip-rtl" aria-hidden="true" />
						</button>
						<div className="wa-of-style-info">
							<span className="wa-of-style-count">{t('studio.stage.style', { index: index + 1, total })}</span>
							<span className="wa-of-style-name">
								{colorName(current?.slots[current.topSlot]?.id, locale)} + {colorName(current?.slots.pants?.id, locale)}
							</span>
						</div>
						{current ? <ScoreRing score={current.score} size="xs" label={t('suggestions.scoreLabel', { score: current.score })} /> : null}
						<button type="button" className="wa-of-fab" onClick={() => step(1)} aria-label={t('studio.stage.next')} title={t('studio.stage.next')}>
							<ChevronRight size={18} className="wa-of-flip-rtl" aria-hidden="true" />
						</button>
						<button type="button" className="wa-of-fab" onClick={onShuffle} aria-label={t('studio.stage.shuffle')} title={t('studio.stage.shuffle')}>
							<Shuffle size={17} aria-hidden="true" />
						</button>
					</>
				) : (
					<span className="wa-of-style-empty">{t('studio.stage.tapPiece')}</span>
				)}
			</div>
		</>
	);
}
