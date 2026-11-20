'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Check, Eye, Send, Share2, ThumbsDown, ThumbsUp } from 'lucide-react';
import { SUBCATEGORIES } from '../config/outfit-config.js';
import { itemHex, outfitItemList } from '../engine/stylist.js';
import { colorName } from '../outfit-ui.js';
import { ItemImage, ScoreRing } from './primitives.jsx';

/** Turns engine explanations ({ key, params }) into localised sentences. */
export function useExplain(locale) {
	const t = useTranslations('outfitMatcher');
	return useCallback(
		entry => {
			const params = { ...(entry.params || {}) };
			if (params.top) params.top = colorName(params.top, locale);
			if (params.pants) params.pants = colorName(params.pants, locale);
			if (params.occasion) params.occasion = t(`context.occasions.${params.occasion}`);
			if (params.weather) params.weather = t(`context.weathers.${params.weather}`);
			if (params.hem) params.hem = t(`advice.hem.lengths.${params.hem}`);
			try {
				return t(entry.key, params);
			} catch {
				return '';
			}
		},
		[t, locale],
	);
}

export function useItemName(locale) {
	const t = useTranslations('outfitMatcher');
	return useCallback(
		item => {
			if (!item) return '';
			if (item.nickname) return item.nickname;
			const sub = SUBCATEGORIES[item.subcategory] ? t(`wardrobe.sub.${item.subcategory}`) : t(`wardrobe.categories.${item.category}`);
			return `${sub} · ${colorName(itemHex(item), locale)}`;
		},
		[t, locale],
	);
}

/** A visual collage of an owned outfit with score, why it works, watch-outs and actions. */
export default function OutfitCard({ outfit, locale, colorBlind, onWear, worn, onPreview, onFeedback, feedback, onShare, onSend, compact = false, rank }) {
	const t = useTranslations('outfitMatcher');
	const explain = useExplain(locale);
	const nameOf = useItemName(locale);
	const pieces = outfitItemList(outfit);
	const main = pieces.filter(piece => ['outerwear', 'onepiece', 'top', 'bottom', 'shoes'].includes(piece.category));
	const extras = pieces.filter(piece => !main.includes(piece));
	return (
		<article className="wa-of-ocard" data-compact={compact || undefined}>
			<div className="wa-of-ocard-collage" data-count={Math.min(main.length, 4)}>
				{main.slice(0, 4).map(piece => (
					<figure key={piece.id} className="wa-of-ocard-piece">
						<ItemImage item={piece} colorBlind={colorBlind} />
						<figcaption>{nameOf(piece)}</figcaption>
					</figure>
				))}
			</div>
			<div className="wa-of-ocard-body">
				<div className="wa-of-ocard-head">
					<ScoreRing score={outfit.score} label={t('suggestions.scoreLabel', { score: outfit.score })} />
					<div className="wa-of-grow">
						{rank ? <p className="wa-of-eyebrow">{t('stylist.option', { number: rank })}</p> : null}
						<p className="wa-of-ocard-title">{main.map(piece => nameOf(piece)).join(' + ')}</p>
						{extras.length ? <p className="wa-of-muted">{extras.map(piece => nameOf(piece)).join(' · ')}</p> : null}
					</div>
				</div>
				{outfit.why?.length ? (
					<ul className="wa-of-why">
						{outfit.why.slice(0, compact ? 2 : 4).map(entry => {
							const text = explain(entry);
							return text ? (
								<li key={entry.key + JSON.stringify(entry.params || {})}>
									<Check size={14} aria-hidden="true" />
									<span>{text}</span>
								</li>
							) : null;
						})}
					</ul>
				) : null}
				{outfit.watchOut?.length ? (
					<ul className="wa-of-why wa-of-watch">
						{outfit.watchOut.slice(0, compact ? 1 : 3).map(entry => (
							<li key={entry.key}>
								<AlertTriangle size={14} aria-hidden="true" />
								<span>{explain(entry)}</span>
							</li>
						))}
					</ul>
				) : null}
				<div className="wa-of-ocard-actions">
					{onWear ? (
						<button type="button" className="wa-of-btn wa-of-btn-primary wa-of-btn-sm" onClick={() => onWear(outfit)} disabled={worn}>
							<Check size={16} aria-hidden="true" />
							{worn ? t('stylist.woreIt') : t('stylist.wearThis')}
						</button>
					) : null}
					{onPreview ? (
						<button type="button" className="wa-of-icon-btn" onClick={() => onPreview(outfit)} aria-label={t('stylist.preview')} title={t('stylist.preview')}>
							<Eye size={18} aria-hidden="true" />
						</button>
					) : null}
					{onFeedback ? (
						<>
							<button type="button" className="wa-of-icon-btn" data-active={feedback === 'up' || undefined} aria-pressed={feedback === 'up'} onClick={() => onFeedback(outfit, true)} aria-label={t('stylist.like')} title={t('stylist.like')}>
								<ThumbsUp size={18} aria-hidden="true" />
							</button>
							<button type="button" className="wa-of-icon-btn" data-active={feedback === 'down' || undefined} aria-pressed={feedback === 'down'} onClick={() => onFeedback(outfit, false)} aria-label={t('stylist.dislike')} title={t('stylist.dislike')}>
								<ThumbsDown size={18} aria-hidden="true" />
							</button>
						</>
					) : null}
					{onShare ? (
						<button type="button" className="wa-of-icon-btn" onClick={() => onShare(outfit)} aria-label={t('suggestions.share')} title={t('suggestions.share')}>
							<Share2 size={18} aria-hidden="true" />
						</button>
					) : null}
					{onSend ? (
						<button type="button" className="wa-of-icon-btn" onClick={() => onSend(outfit)} aria-label={t('share.sendMe')} title={t('share.sendMe')}>
							<Send size={18} aria-hidden="true" />
						</button>
					) : null}
				</div>
			</div>
		</article>
	);
}
