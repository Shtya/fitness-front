'use client';

import { useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bot, Loader2, MapPin, Send, Shirt, Sparkles, Wand2, X } from 'lucide-react';
import { MOODS, OCCASIONS, SEASONS } from '../config/outfit-config.js';
import { buildOutfits, itemHex, outfitId } from '../engine/stylist.js';
import { colorName } from '../outfit-ui.js';
import { useOutfit } from '../OutfitContext.jsx';
import { askStylist } from '../wardrobe/ai-client.js';
import { useKv } from '../wardrobe/db.js';
import OutfitCard from '../ui/OutfitCard.jsx';
import { Chips, EmptyState, ItemImage, Segmented, Sheet } from '../ui/primitives.jsx';

const KNOWN_ERRORS = new Set(['ai_not_configured', 'quota', 'ai_busy', 'offline', 'ai_failed', 'ai_refused', 'ai_invalid', 'unauthorized', 'too_large', 'invalid_request']);

/** Open-Meteo current weather → our weather buckets (coordinates rounded to ~1 km). */
async function fetchWeather() {
	const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10_000, maximumAge: 30 * 60_000 }));
	const lat = pos.coords.latitude.toFixed(2);
	const lon = pos.coords.longitude.toFixed(2);
	const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,weather_code`);
	if (!res.ok) throw new Error('weather');
	const data = await res.json();
	const temp = data?.current?.temperature_2m;
	const rain = Number(data?.current?.precipitation) > 0.2 || [51, 53, 55, 61, 63, 65, 80, 81, 82, 95].includes(data?.current?.weather_code);
	return { weather: rain ? 'rain' : temp >= 27 ? 'hot' : temp <= 15 ? 'cold' : 'mild', temp: Math.round(temp) };
}

export default function Stylist() {
	const t = useTranslations('outfitMatcher');
	const [mode, setMode] = useState('today');
	const { items, setSection } = useOutfit();
	const wearable = items.filter(item => item.status !== 'archived');
	const hasCore = wearable.some(i => i.category === 'top') && wearable.some(i => i.category === 'bottom');

	if (!hasCore) {
		return (
			<EmptyState
				icon={Wand2}
				title={t('stylist.emptyTitle')}
				text={t('stylist.emptyText')}
				action={
					<button type="button" className="wa-of-btn wa-of-btn-primary" onClick={() => setSection('closet')}>
						<Shirt size={18} aria-hidden="true" /> {t('stylist.goCloset')}
					</button>
				}
			/>
		);
	}
	return (
		<div className="wa-of-stack-lg">
			<Segmented
				value={mode}
				onChange={setMode}
				label={t('nav.stylist')}
				options={[
					{ id: 'today', label: t('stylist.tabs.today'), icon: Sparkles },
					{ id: 'match', label: t('stylist.tabs.match'), icon: Wand2 },
					{ id: 'ask', label: t('stylist.tabs.ask'), icon: Bot },
				]}
			/>
			{mode === 'today' ? <Today /> : mode === 'match' ? <MatchThese /> : <AskStylist />}
		</div>
	);
}

function useCardActions() {
	const { wear, rate, share, send, canSendToMe, previewOutfit, feedback } = useOutfit();
	const [wornIds, setWornIds] = useState(() => new Set());
	return {
		onWear: async outfit => {
			await wear(outfit);
			setWornIds(prev => new Set(prev).add(outfit.id));
		},
		isWorn: outfit => wornIds.has(outfit.id),
		onPreview: previewOutfit,
		onFeedback: rate,
		feedbackFor: outfit => feedback?.outfits?.[outfit.id],
		onShare: share,
		onSend: canSendToMe ? send : undefined,
	};
}

function Today() {
	const t = useTranslations('outfitMatcher');
	const { items, locale, colorBlind, scoringProfile, feedback } = useOutfit();
	const [occasion, setOccasion] = useState('casual');
	const [weather, setWeather] = useState('mild');
	const [mood, setMood] = useState(null);
	const [avoidRecent, setAvoidRecent] = useState(true);
	const [weatherInfo, setWeatherInfo] = useState(null);
	const [locating, setLocating] = useState(false);
	const actions = useCardActions();
	const outfits = useMemo(
		() => buildOutfits(items, { occasion, weather, mood, profile: scoringProfile, feedback, avoidRecent }, { limit: 3 }),
		[items, occasion, weather, mood, scoringProfile, feedback, avoidRecent],
	);
	const locate = async () => {
		setLocating(true);
		try {
			const info = await fetchWeather();
			setWeather(info.weather);
			setWeatherInfo(info);
		} catch {
			setWeatherInfo({ error: true });
		} finally {
			setLocating(false);
		}
	};
	return (
		<div className="wa-of-stack-lg">
			<section className="wa-of-card wa-of-card-tight">
				<p className="wa-of-label">{t('context.occasion')}</p>
				<Chips value={occasion} options={OCCASIONS} onChange={setOccasion} label={t('context.occasion')} render={id => t(`context.occasions.${id}`)} size="sm" />
				<div className="wa-of-row-gap wa-of-wrap wa-of-space">
					<div className="wa-of-grow">
						<p className="wa-of-label">{t('context.weather')}</p>
						<Chips value={weather} options={SEASONS} onChange={setWeather} label={t('context.weather')} render={id => t(`wardrobe.seasonNames.${id}`)} size="sm" />
					</div>
					<button type="button" className="wa-of-btn wa-of-btn-sm" onClick={locate} disabled={locating}>
						{locating ? <Loader2 size={16} className="wa-of-spin" aria-hidden="true" /> : <MapPin size={16} aria-hidden="true" />}
						{weatherInfo?.temp != null ? t('stylist.weatherNow', { temp: weatherInfo.temp }) : t('stylist.useMyWeather')}
					</button>
				</div>
				{weatherInfo?.error ? <p className="wa-of-hint wa-of-hint-error">{t('stylist.weatherFailed')}</p> : null}
				<p className="wa-of-label">{t('stylist.mood')}</p>
				<Chips value={mood} options={MOODS} onChange={value => setMood(value === mood ? null : value)} label={t('stylist.mood')} render={id => t(`stylist.moods.${id}`)} size="sm" />
				<label className="wa-of-toggle">
					<input type="checkbox" checked={avoidRecent} onChange={event => setAvoidRecent(event.target.checked)} />
					<span className="wa-of-toggle-title">{t('stylist.avoidRecent')}</span>
				</label>
			</section>
			{!outfits.length ? (
				<EmptyState icon={Sparkles} title={t('stylist.noneClean')} text={t('stylist.noneCleanHint')} />
			) : (
				<div className="wa-of-cards">
					{outfits.map((outfit, i) => (
						<OutfitCard key={outfit.id} rank={i + 1} outfit={outfit} locale={locale} colorBlind={colorBlind} onWear={actions.onWear} worn={actions.isWorn(outfit)} onPreview={actions.onPreview} onFeedback={actions.onFeedback} feedback={actions.feedbackFor(outfit)} onShare={actions.onShare} onSend={actions.onSend} />
					))}
				</div>
			)}
		</div>
	);
}

function MatchThese() {
	const t = useTranslations('outfitMatcher');
	const { items, locale, colorBlind, nameOf, scoringProfile, feedback } = useOutfit();
	const [anchors, setAnchors] = useState([]);
	const [picking, setPicking] = useState(false);
	const [occasion, setOccasion] = useState('casual');
	const actions = useCardActions();
	const anchorItems = anchors.map(id => items.find(i => i.id === id)).filter(Boolean);
	const outfits = useMemo(
		() => (anchorItems.length ? buildOutfits(items, { occasion, weather: 'mild', profile: scoringProfile, feedback }, { anchors: anchorItems, limit: 4, requireClean: false }) : []),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[items, anchors.join(','), occasion, scoringProfile, feedback],
	);
	const toggle = id =>
		setAnchors(prev => {
			if (prev.includes(id)) return prev.filter(x => x !== id);
			const item = items.find(i => i.id === id);
			// One anchor per category (you can't wear two pairs of pants).
			const rest = prev.filter(x => items.find(i => i.id === x)?.category !== item?.category);
			return [...rest, id].slice(-3);
		});
	const candidates = items.filter(i => i.status !== 'archived' && ['top', 'bottom', 'outerwear', 'onepiece', 'shoes'].includes(i.category));
	return (
		<div className="wa-of-stack-lg">
			<section className="wa-of-card wa-of-card-tight">
				<div className="wa-of-card-head">
					<h2 className="wa-of-card-title">{t('stylist.matchTitle')}</h2>
					<button type="button" className="wa-of-btn wa-of-btn-sm wa-of-btn-primary" onClick={() => setPicking(true)}>
						{anchors.length ? t('stylist.changePieces') : t('stylist.choosePieces')}
					</button>
				</div>
				{anchorItems.length ? (
					<ul className="wa-of-anchor-row">
						{anchorItems.map(item => (
							<li key={item.id}>
								<ItemImage item={item} colorBlind={colorBlind} />
								<span>{nameOf(item)}</span>
								<button type="button" className="wa-of-icon-btn" onClick={() => toggle(item.id)} aria-label={t('stylist.removePiece')}>
									<X size={16} aria-hidden="true" />
								</button>
							</li>
						))}
					</ul>
				) : (
					<p className="wa-of-muted">{t('stylist.matchHint')}</p>
				)}
				<Chips value={occasion} options={OCCASIONS} onChange={setOccasion} label={t('context.occasion')} render={id => t(`context.occasions.${id}`)} size="sm" />
			</section>
			{anchorItems.length && !outfits.length ? <p className="wa-of-muted">{t('stylist.noMatch')}</p> : null}
			<div className="wa-of-cards">
				{outfits.map((outfit, i) => (
					<OutfitCard key={outfit.id} rank={i + 1} outfit={outfit} locale={locale} colorBlind={colorBlind} onWear={actions.onWear} worn={actions.isWorn(outfit)} onPreview={actions.onPreview} onFeedback={actions.onFeedback} feedback={actions.feedbackFor(outfit)} onShare={actions.onShare} onSend={actions.onSend} />
				))}
			</div>
			<Sheet open={picking} onClose={() => setPicking(false)} title={t('stylist.choosePieces')} size="lg"
				footer={<button type="button" className="wa-of-btn wa-of-btn-primary wa-of-btn-block" onClick={() => setPicking(false)}>{t('stylist.matchCount', { count: anchors.length })}</button>}
			>
				<div className="wa-of-pick-grid">
					{candidates.map(item => (
						<button key={item.id} type="button" className="wa-of-pick-item" data-active={anchors.includes(item.id) || undefined} aria-pressed={anchors.includes(item.id)} onClick={() => toggle(item.id)}>
							<ItemImage item={item} colorBlind={colorBlind} />
							<span>{nameOf(item)}</span>
						</button>
					))}
				</div>
			</Sheet>
		</div>
	);
}

/** Compact wardrobe summary for the chat route (ids + attributes, never images). */
function wardrobeSummary(items, nameOf) {
	return items
		.filter(i => i.status !== 'archived')
		.slice(0, 400)
		.map(i => ({
			id: i.id,
			c: i.category,
			s: i.subcategory || i.category,
			col: colorName(itemHex(i), 'en'),
			hex: itemHex(i),
			pat: i.pattern || 'solid',
			fit: i.fit || 'regular',
			f: Number(i.formality) || 2,
			sea: (i.seasons || []).slice(0, 4),
			st: i.status || 'clean',
			n: i.nickname ? String(i.nickname).slice(0, 40) : undefined,
		}));
}

function AskStylist() {
	const t = useTranslations('outfitMatcher');
	const { items, locale, colorBlind, nameOf, scoringProfile, prefs } = useOutfit();
	const [consent] = useKv('aiConsent', null);
	const [messages, setMessages] = useState([]);
	const [text, setText] = useState('');
	const [busy, setBusy] = useState(false);
	const [usage, setUsage] = useState(null);
	const listRef = useRef(null);
	const actions = useCardActions();
	const byId = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);
	const blocked = prefs.onDeviceOnly || consent === 'declined';

	const ask = async question => {
		const q = String(question || '').trim().slice(0, 600);
		if (!q || busy) return;
		const history = messages.slice(-6).map(m => ({ role: m.role, text: m.role === 'user' ? m.text : m.answer || '' })).filter(m => m.text);
		setMessages(prev => [...prev, { role: 'user', text: q }]);
		setText('');
		setBusy(true);
		try {
			const data = await askStylist({ question: q, locale: locale === 'ar' ? 'ar' : 'en', wardrobe: wardrobeSummary(items, nameOf), history });
			if (data.usedToday != null) setUsage({ used: data.usedToday, limit: data.limitToday });
			// Re-score the AI's outfits with the local engine so every score is deterministic.
			const outfits = (data.outfits || []).map(o => {
				const pieces = o.itemIds.map(id => byId.get(id)).filter(Boolean);
				const group = {};
				for (const piece of pieces) group[piece.category] ||= piece;
				const [scored] = buildOutfits(pieces, { profile: scoringProfile }, { anchors: Object.values(group), limit: 1, requireClean: false });
				return scored ? { ...scored, id: `${outfitId(group)}-${Math.random().toString(36).slice(2, 6)}`, title: o.title, aiReason: o.reason } : null;
			}).filter(Boolean);
			setMessages(prev => [...prev, { role: 'assistant', answer: data.answer, tips: data.tips || [], outfits }]);
		} catch (error) {
			setMessages(prev => [...prev, { role: 'assistant', error: error.code || 'ai_failed' }]);
		} finally {
			setBusy(false);
			requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }));
		}
	};

	if (blocked) return <EmptyState icon={Bot} title={t('chat.offTitle')} text={t('chat.offText')} />;
	return (
		<section className="wa-of-chat" aria-label={t('stylist.tabs.ask')}>
			<div className="wa-of-chat-list" ref={listRef} aria-live="polite">
				{!messages.length ? (
					<div className="wa-of-chat-empty">
						<Bot size={26} aria-hidden="true" />
						<p className="wa-of-muted">{t('chat.intro')}</p>
						<div className="wa-of-chips">
							{['q1', 'q2', 'q3'].map(k => (
								<button key={k} type="button" className="wa-of-chip" onClick={() => ask(t(`chat.examples.${k}`))}>
									{t(`chat.examples.${k}`)}
								</button>
							))}
						</div>
					</div>
				) : null}
				{messages.map((m, i) =>
					m.role === 'user' ? (
						<p key={i} className="wa-of-bubble wa-of-bubble-me">{m.text}</p>
					) : m.error ? (
						<p key={i} className="wa-of-bubble wa-of-bubble-error">{t(`add.aiErrors.${KNOWN_ERRORS.has(m.error) ? m.error : 'ai_failed'}`)}</p>
					) : (
						<div key={i} className="wa-of-bubble wa-of-bubble-ai">
							{m.answer ? <p>{m.answer}</p> : null}
							{m.outfits.map((o, j) => (
								<div key={o.id} className="wa-of-chat-outfit">
									{o.title ? <p className="wa-of-subtitle">{o.title}</p> : null}
									{o.aiReason ? <p className="wa-of-muted">{o.aiReason}</p> : null}
									<OutfitCard outfit={o} rank={j + 1} compact locale={locale} colorBlind={colorBlind} onWear={actions.onWear} worn={actions.isWorn(o)} onPreview={actions.onPreview} onShare={actions.onShare} />
								</div>
							))}
							{m.tips?.length ? (
								<ul className="wa-of-bullets">
									{m.tips.map(tip => (
										<li key={tip}>{tip}</li>
									))}
								</ul>
							) : null}
						</div>
					),
				)}
				{busy ? (
					<p className="wa-of-bubble wa-of-bubble-ai wa-of-typing">
						<Loader2 size={16} className="wa-of-spin" aria-hidden="true" /> {t('chat.thinking')}
					</p>
				) : null}
			</div>
			<form className="wa-of-chat-input" onSubmit={event => { event.preventDefault(); void ask(text); }}>
				<input className="wa-of-input" value={text} onChange={event => setText(event.target.value.slice(0, 600))} placeholder={t('chat.placeholder')} aria-label={t('chat.placeholder')} />
				<button type="submit" className="wa-of-btn wa-of-btn-primary wa-of-btn-round" disabled={busy || !text.trim()} aria-label={t('chat.send')}>
					<Send size={18} aria-hidden="true" />
				</button>
			</form>
			<p className="wa-of-hint wa-of-center">{usage ? t('add.usage', { used: usage.used, limit: usage.limit }) : t('chat.privacy')}</p>
		</section>
	);
}
