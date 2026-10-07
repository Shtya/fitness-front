'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bookmark, Check, History, Languages, Loader2, SlidersHorizontal, Star, Volume2, X } from 'lucide-react';
import { webTranslatorApi } from '@/lib/web-translator/web-translator-api';
import { detectLang, toSaveWordPayload } from '@/lib/web-translator/text-utils';

const REVIEWED_KEY = 'so7ba:smart-document:reviewed-words';
const REVIEW_KEY = 'so7ba:smart-document:review-options';
const MEANING_MODES = ['show', 'blur', 'hide'];

const FALLBACK = {
	lookupLoading: 'Looking up…',
	lookupError: 'Could not translate this.',
	translateSelection: 'Translate',
	contextSentence: 'Sentence',
	listen: 'Listen',
	reviewOptions: 'Review',
	meaningShow: 'Show meaning',
	meaningBlur: 'Blur until hover',
	meaningHide: 'Hide meaning',
	showAnswer: 'Show meaning',
	autoSpeak: 'Speak the word when it opens',
	hideExample: 'Hide the example',
	dueTab: 'To review',
	reviewedTab: 'Reviewed',
	reviewedEmpty: 'Checked words show up here. Uncheck one to review it again.',
	reviewedHint: 'Uncheck a word to put it back in the review list.',
	dueClear: 'Nothing left to review. Open Reviewed to bring a word back.',
	shuffle: 'Shuffle the words',
	coverWord: 'Cover the word until hover',
	speakSentence: 'Also speak the sentence',
	reviewSettings: 'Review settings',
	voices: 'Voices',
	voiceHint: 'Play each voice and keep the clearest one.',
	voiceEmpty: 'No extra voices on this device.',
	example: 'Example',
	pronunciation: 'Pronunciation',
	partOfSpeech: 'Part of speech',
	favorite: 'Save to review later',
	favorited: 'Saved',
	recentLookups: 'Recent',
	favorites: 'Favorites',
	favoritesEmpty: 'Saved words show up here.',
	recentEmpty: 'Words you look up show up here.',
	openShelf: 'Open review shelf',
	reviewed: 'Reviewed',
	showReviewed: 'Show reviewed',
	hideReviewed: 'Hide reviewed',
	langAr: 'Arabic',
	langEn: 'English',
	close: 'Close',
	shelfTitle: 'Words to review',
	shelfHint: 'Check a word once you have come back to it. It leaves this list.',
	shelfButton: 'Review words',
};

function labelsOf(labels) {
	return { ...FALLBACK, ...Object.fromEntries(Object.entries(labels || {}).filter(([, v]) => v)) };
}

function readReviewed() {
	try {
		const raw = JSON.parse(localStorage.getItem(REVIEWED_KEY) || '[]');
		return new Set(Array.isArray(raw) ? raw.filter(Boolean) : []);
	} catch {
		return new Set();
	}
}

function writeReviewed(set) {
	try { localStorage.setItem(REVIEWED_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
}

function readReview() {
	try {
		const raw = JSON.parse(localStorage.getItem(REVIEW_KEY) || '{}');
		const meaning = MEANING_MODES.includes(raw?.meaning) ? raw.meaning : 'show';
		return {
			meaning,
			autoSpeak: Boolean(raw?.autoSpeak),
			hideExample: Boolean(raw?.hideExample),
			voiceURI: typeof raw?.voiceURI === 'string' ? raw.voiceURI : '',
			shuffle: Boolean(raw?.shuffle),
			shuffleSeed: Number(raw?.shuffleSeed) || 0,
			coverWord: Boolean(raw?.coverWord),
			speakSentence: Boolean(raw?.speakSentence),
		};
	} catch {
		return {
			meaning: 'show',
			autoSpeak: false,
			hideExample: false,
			voiceURI: '',
			shuffle: false,
			shuffleSeed: 0,
			coverWord: false,
			speakSentence: false,
		};
	}
}

function writeReview(next) {
	try { localStorage.setItem(REVIEW_KEY, JSON.stringify(next)); } catch { /* ignore */ }
}

let speakTimer = 0;

function voiceScore(voice) {
	const name = String(voice?.name || '').toLowerCase();
	const lang = String(voice?.lang || '').toLowerCase();
	let score = 0;
	if (/natural|neural|premium|enhanced/.test(name)) score += 50;
	if (name.includes('google')) score += 40;
	if (name.includes('microsoft')) score += 24;
	if (/aria|jenny|guy|sonia|libby|samantha|daniel|karen|moira|rishi|zira/.test(name)) score += 18;
	if (lang.startsWith('en-us') || lang.startsWith('ar-')) score += 12;
	if (voice?.localService === false) score += 8;
	return score;
}

function rankedVoices(list, prefix) {
	return (list || [])
		.filter((voice) => String(voice.lang || '').toLowerCase().startsWith(prefix))
		.sort((a, b) => voiceScore(b) - voiceScore(a))
		.slice(0, prefix === 'en' ? 6 : 3);
}

function voiceFor(lang, voiceURI, voices) {
	const prefix = lang === 'ar' ? 'ar' : 'en';
	const selected = (voices || []).find((voice) => voice.voiceURI === voiceURI);
	if (selected && String(selected.lang || '').toLowerCase().startsWith(prefix)) return selected;
	return rankedVoices(voices, prefix)[0] || null;
}

function speakParts(parts) {
	const list = (parts || []).filter((part) => part?.text);
	if (!list.length || typeof window === 'undefined' || !window.speechSynthesis) return;
	const synth = window.speechSynthesis;
	window.clearTimeout(speakTimer);
	synth.cancel();
	speakTimer = window.setTimeout(() => {
		list.forEach((part) => {
			const utter = new SpeechSynthesisUtterance(part.text);
			if (part.voice) utter.voice = part.voice;
			utter.lang = part.voice?.lang || (part.lang === 'ar' ? 'ar-SA' : 'en-US');
			utter.rate = 0.84;
			utter.pitch = 1;
			utter.volume = 1;
			synth.speak(utter);
		});
		if (synth.paused) synth.resume();
	}, 70);
}

function speakText(text, lang, voice) {
	speakParts([{ text, lang, voice }]);
}

function orderWords(list, review) {
	if (!review?.shuffle) return list;
	const seed = String(review.shuffleSeed || '');
	return [...list].sort((a, b) => hashText(`${seed}:${a.id}`) - hashText(`${seed}:${b.id}`));
}

function hashText(value) {
	let hash = 0;
	const text = String(value || '');
	for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) | 0;
	return hash;
}

function meaningClass(mode) {
	if (mode === 'blur') return ' sd-mask is-blur';
	if (mode === 'hide') return ' sd-mask is-hide';
	return '';
}

const LOOKUP_MAX = 500;
const SENTENCE_SCAN = 400;
const BLOCK_SELECTOR = 'p, li, h1, h2, h3, h4, h5, h6, td, th, blockquote, pre, figcaption';
const SENTENCE_BOUNDARY = /[.!?؟\n]/;

export function cleanLookupText(raw) {
	const text = String(raw || '')
		.replace(/[`*_~#]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
	if (!text) return '';
	return text.slice(0, LOOKUP_MAX);
}

function wordCount(text) {
	return String(text || '').split(' ').filter(Boolean).length;
}

function sentenceAround(text, start, end) {
	const source = String(text || '');
	let from = Math.max(0, start);
	let back = 0;
	while (from > 0 && back < SENTENCE_SCAN && !SENTENCE_BOUNDARY.test(source[from - 1])) {
		from -= 1;
		back += 1;
	}
	if (back >= SENTENCE_SCAN) return null;
	while (from < start && /\s/.test(source[from])) from += 1;

	let to = Math.min(source.length, end);
	let forward = 0;
	while (to < source.length && forward < SENTENCE_SCAN && !SENTENCE_BOUNDARY.test(source[to])) {
		to += 1;
		forward += 1;
	}
	if (forward >= SENTENCE_SCAN && to < source.length && !SENTENCE_BOUNDARY.test(source[to])) return null;
	if (to < source.length && source[to] !== '\n') to += 1;

	const sentence = cleanLookupText(source.slice(from, to));
	if (!sentence || wordCount(sentence) < 2 || sentence === cleanLookupText(source.slice(start, end))) return null;
	return { from, to, sentence };
}

function offsetWithin(root, node, offset) {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	if (node?.nodeType === Node.TEXT_NODE) {
		let count = 0;
		let current = walker.nextNode();
		while (current) {
			if (current === node) return count + offset;
			count += current.textContent?.length || 0;
			current = walker.nextNode();
		}
		return count;
	}
	const child = node?.childNodes?.[offset] || null;
	let count = 0;
	let current = walker.nextNode();
	while (current) {
		if (child && (current === child || (child.nodeType === Node.ELEMENT_NODE && child.contains(current)))) return count;
		count += current.textContent?.length || 0;
		current = walker.nextNode();
	}
	return count;
}

function rangeFromOffsets(root, start, end) {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	const range = document.createRange();
	let count = 0;
	let startSet = false;
	let node = walker.nextNode();
	while (node) {
		const len = node.textContent?.length || 0;
		const next = count + len;
		if (!startSet && start <= next) {
			range.setStart(node, Math.min(len, Math.max(0, start - count)));
			startSet = true;
		}
		if (startSet && end <= next) {
			range.setEnd(node, Math.min(len, Math.max(0, end - count)));
			return range;
		}
		count = next;
		node = walker.nextNode();
	}
	return null;
}

function blockOf(node, host) {
	const el = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
	const block = el?.closest?.(BLOCK_SELECTOR);
	return block && host.contains(block) ? block : null;
}

function captureFromTextarea(textarea) {
	const start = textarea.selectionStart ?? 0;
	const end = textarea.selectionEnd ?? start;
	if (end <= start) return null;
	const word = cleanLookupText(textarea.value.slice(start, end));
	if (!word) return null;
	let sentence = '';
	if (wordCount(word) === 1) {
		const span = sentenceAround(textarea.value, start, end);
		if (span) {
			textarea.setSelectionRange(span.from, span.to);
			sentence = span.sentence;
		}
	}
	return { word, sentence, rect: null };
}

function captureFromDom(host) {
	const sel = window.getSelection?.();
	if (!sel?.rangeCount || sel.isCollapsed) return null;
	const range = sel.getRangeAt(0);
	if (!host.contains(range.commonAncestorContainer)) return null;
	const word = cleanLookupText(range.toString());
	if (!word) return null;
	let sentence = '';
	let rect = range.getBoundingClientRect();
	if (wordCount(word) === 1) {
		const startBlock = blockOf(range.startContainer, host);
		const endBlock = blockOf(range.endContainer, host);
		if (startBlock && startBlock === endBlock) {
			const text = startBlock.textContent || '';
			const start = offsetWithin(startBlock, range.startContainer, range.startOffset);
			const end = offsetWithin(startBlock, range.endContainer, range.endOffset);
			const span = sentenceAround(text, start, end);
			if (span) {
				const next = rangeFromOffsets(startBlock, span.from, span.to);
				if (next) {
					sel.removeAllRanges();
					sel.addRange(next);
					rect = next.getBoundingClientRect();
					sentence = span.sentence;
				}
			}
		}
	}
	return { word, sentence, rect };
}

export function captureLookup(host) {
	const textarea = host?.querySelector?.('textarea');
	if (textarea && document.activeElement === textarea) return captureFromTextarea(textarea);
	return captureFromDom(host);
}

export function readLookupWord(host) {
	return captureLookup(host)?.word || '';
}

function placePin(anchor) {
	const size = 34;
	const x = Number(anchor?.x) || window.innerWidth / 2;
	const topEdge = Number.isFinite(anchor?.top) ? anchor.top : Number(anchor?.y) || 0;
	const bottomEdge = Number.isFinite(anchor?.bottom) ? anchor.bottom : topEdge;
	const left = Math.min(Math.max(8, x - size / 2), Math.max(8, window.innerWidth - size - 8));
	let top = topEdge - size - 6;
	if (top < 8) top = bottomEdge + 6;
	return { top, left };
}

function placePopover(anchor, height) {
	const width = Math.min(460, window.innerWidth - 16);
	const x = Number(anchor?.x) || window.innerWidth / 2;
	const wordTop = Number.isFinite(anchor?.top) ? anchor.top : Number(anchor?.y) || 0;
	const wordBottom = Number.isFinite(anchor?.bottom) ? anchor.bottom : wordTop;
	const left = Math.min(Math.max(8, x - width / 2), Math.max(8, window.innerWidth - width - 8));
	const gap = 8;
	const card = Math.max(120, height || 168);
	let top = wordTop - card - gap;
	if (top < 8) top = Math.min(wordBottom + gap, Math.max(8, window.innerHeight - card - 8));
	return { top, left, width };
}

export default function WordLookup({ labels, peek, onClosePeek, offer, onOpenOffer, onClearOffer, shelfOpen, onShelfOpen }) {
	const L = labelsOf(labels);
	const [entry, setEntry] = useState(null);
	const [sentenceEntry, setSentenceEntry] = useState(null);
	const [sentenceBusy, setSentenceBusy] = useState(false);
	const [review, setReview] = useState(readReview);
	const [answerShown, setAnswerShown] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [voices, setVoices] = useState([]);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [tab, setTab] = useState('recent');
	const [recent, setRecent] = useState([]);
	const [favorites, setFavorites] = useState([]);
	const [reviewed, setReviewed] = useState(() => new Set());
	const [shelfTab, setShelfTab] = useState('due');
	const [saving, setSaving] = useState(false);
	const [localPeek, setLocalPeek] = useState(null);
	const [listsOpen, setListsOpen] = useState(false);
	const [cardHeight, setCardHeight] = useState(0);
	const cardRef = useRef(null);
	const voicesRef = useRef(voices);
	const spokenRef = useRef('');
	voicesRef.current = voices;
	const activePeek = peek || localPeek;

	useEffect(() => { setReviewed(readReviewed()); }, []);

	useEffect(() => {
		const synth = window.speechSynthesis;
		if (!synth) return undefined;
		const load = () => setVoices(synth.getVoices());
		load();
		synth.addEventListener('voiceschanged', load);
		return () => synth.removeEventListener('voiceschanged', load);
	}, []);

	const refreshLists = useCallback(async () => {
		const [recentRes, wordsRes] = await Promise.all([
			webTranslatorApi.recent(24).catch(() => null),
			webTranslatorApi.words({ limit: 80 }).catch(() => null),
		]);
		setRecent(recentRes?.data?.items || []);
		setFavorites(wordsRes?.data?.items || []);
	}, []);

	useEffect(() => {
		if (!peek && !shelfOpen) return undefined;
		refreshLists();
		return undefined;
	}, [peek, shelfOpen, refreshLists]);

	useEffect(() => {
		if (!peek?.word) return undefined;
		const controller = new AbortController();
		const word = peek.word;
		const sentence = peek.sentence && peek.sentence !== word ? peek.sentence : '';
		setLocalPeek(null);
		setListsOpen(false);
		setBusy(true);
		setSentenceBusy(Boolean(sentence));
		setError('');
		setEntry(null);
		setSentenceEntry(null);
		setAnswerShown(false);
		const sourceLang = detectLang(word);
		const targetLang = sourceLang === 'ar' ? 'en' : 'ar';
		const sourceUrl = typeof window !== 'undefined' ? window.location.pathname : undefined;
		webTranslatorApi.lookup({
			text: word,
			sourceLang,
			targetLang,
			fast: true,
			sourceUrl,
			sourceTitle: 'Document editor',
		}, controller.signal)
			.then(({ data }) => {
				if (controller.signal.aborted) return;
				if (!data?.translation) {
					setError(L.lookupError);
					return;
				}
				setEntry(data);
			})
			.catch((err) => {
				if (controller.signal.aborted) return;
				setError(err?.response?.data?.message || L.lookupError);
			})
			.finally(() => {
				if (!controller.signal.aborted) setBusy(false);
			});
		if (sentence) {
			webTranslatorApi.lookup({
				text: sentence,
				sourceLang: detectLang(sentence),
				targetLang: detectLang(sentence) === 'ar' ? 'en' : 'ar',
				plain: true,
				sourceUrl,
				sourceTitle: 'Document editor',
			}, controller.signal)
				.then((res) => {
					if (!controller.signal.aborted && res?.data?.translation) setSentenceEntry(res.data);
				})
				.catch(() => {})
				.finally(() => {
					if (!controller.signal.aborted) setSentenceBusy(false);
				});
		}
		return () => controller.abort();
	}, [peek?.word, peek?.sentence, peek?.at, L.lookupError]);

	useEffect(() => {
		if (!activePeek && !shelfOpen && !offer) return undefined;
		const onKey = (e) => {
			if (e.key !== 'Escape') return;
			setLocalPeek(null);
			onClosePeek?.();
			onClearOffer?.();
			onShelfOpen?.(false);
		};
		const onDown = (e) => {
			if (e.target.closest?.('.sd-lookup, .sd-shelf, .sd-lookup-launch, .sd-lookup-pin')) return;
			setLocalPeek(null);
			onClosePeek?.();
			onClearOffer?.();
		};
		document.addEventListener('keydown', onKey);
		document.addEventListener('mousedown', onDown);
		return () => {
			document.removeEventListener('keydown', onKey);
			document.removeEventListener('mousedown', onDown);
		};
	}, [activePeek, shelfOpen, offer, onClosePeek, onClearOffer, onShelfOpen]);

	const toggleFavorite = async () => {
		if (!entry || saving) return;
		setSaving(true);
		try {
			if (entry.saved && entry.savedId) {
				await webTranslatorApi.deleteWord(entry.savedId);
				setEntry({ ...entry, saved: false, savedId: null });
			} else {
				const sentence = activePeek?.sentence && activePeek.sentence !== entry.text ? activePeek.sentence : '';
				const payload = toSaveWordPayload({
					...entry,
					example: entry.example || sentence || undefined,
				}, window.location.pathname, 'Document editor');
				const { data } = await webTranslatorApi.saveWord(payload);
				setEntry({ ...entry, example: payload.example || entry.example, saved: true, savedId: data?.id || entry.savedId });
			}
			await refreshLists();
		} catch (err) {
			setError(err?.response?.data?.message || L.lookupError);
		} finally {
			setSaving(false);
		}
	};

	const markReviewed = (id, on) => {
		setReviewed((prev) => {
			const next = new Set(prev);
			if (on) next.add(id);
			else next.delete(id);
			writeReviewed(next);
			return next;
		});
	};

	const openSaved = (item) => {
		const savedId = item.wordId || (item.lookupCount != null ? item.id : null);
		setEntry({
			text: item.text,
			translation: item.translation,
			sourceLang: item.sourceLang,
			targetLang: item.targetLang,
			pronunciation: item.pronunciation,
			partOfSpeech: item.partOfSpeech,
			example: item.example,
			saved: Boolean(savedId),
			savedId,
		});
		setError('');
		setBusy(false);
		if (!peek) {
			setLocalPeek({
				word: item.text,
				x: Math.round(window.innerWidth * 0.5),
				y: Math.round(window.innerHeight * 0.42),
				at: Date.now(),
			});
		}
	};

	const patchReview = (partial) => {
		setReview((prev) => {
			const next = { ...prev, ...partial };
			writeReview(next);
			return next;
		});
	};

	const enVoices = useMemo(() => rankedVoices(voices, 'en'), [voices]);
	const arVoices = useMemo(() => rankedVoices(voices, 'ar'), [voices]);

	const openAt = peek?.at ?? localPeek?.at;
	useEffect(() => {
		if (!review.autoSpeak || !entry?.text || openAt == null) return undefined;
		const key = `${openAt}:${entry.text}`;
		if (spokenRef.current === key) return undefined;
		spokenRef.current = key;
		const lang = entry.sourceLang || detectLang(entry.text);
		const voice = voiceFor(lang, review.voiceURI, voicesRef.current);
		const sentence = (peek?.word === entry.text && peek?.sentence) || entry.example || '';
		const parts = [{ text: entry.text, lang, voice }];
		if (review.speakSentence && sentence && sentence !== entry.text) {
			const sentenceLang = detectLang(sentence);
			parts.push({
				text: sentence,
				lang: sentenceLang,
				voice: voiceFor(sentenceLang, review.voiceURI, voicesRef.current),
			});
		}
		speakParts(parts);
		return undefined;
	}, [review.autoSpeak, review.speakSentence, review.voiceURI, entry?.text, entry?.example, entry?.sourceLang, openAt, peek?.word, peek?.sentence]);

	const pending = useMemo(
		() => favorites.filter((item) => !reviewed.has(item.id)),
		[favorites, reviewed],
	);
	const done = useMemo(
		() => favorites.filter((item) => reviewed.has(item.id)),
		[favorites, reviewed],
	);
	const dueItems = useMemo(() => orderWords(pending, review), [pending, review]);
	const shelfItems = shelfTab === 'done' ? done : dueItems;

	const pos = activePeek ? placePopover(activePeek, cardHeight) : null;

	useLayoutEffect(() => {
		const next = cardRef.current?.offsetHeight || 0;
		if (next && next !== cardHeight) setCardHeight(next);
	}, [activePeek, entry, sentenceEntry, sentenceBusy, busy, error, listsOpen, tab, cardHeight, review, answerShown]);
	const lang = entry?.sourceLang || (activePeek?.word ? detectLang(activePeek.word) : 'en');
	const headline = entry?.text || activePeek?.word || '';
	const longHeadline = headline.length > 42 || headline.split(' ').filter(Boolean).length > 4;
	const pin = offer && !peek ? placePin(offer) : null;

	const popover = activePeek && pos && typeof document !== 'undefined'
		? createPortal(
			<div
				ref={cardRef}
				className="sd-lookup"
				role="dialog"
				aria-label={activePeek.word}
				style={{ top: pos.top, left: pos.left, width: pos.width }}
			>
				<div className="sd-lookup-head">
					<div className="min-w-0">
						<div className="sd-lookup-word-row">
							<div className={`sd-lookup-word${longHeadline ? ' is-long' : ''}`} dir="auto">{headline}</div>
							<button
								type="button"
								className="sd-lookup-speak"
								title={L.listen}
								aria-label={L.listen}
								onClick={() => speakText(headline, lang, voiceFor(lang, review.voiceURI, voices))}
							>
								<Volume2 size={16} />
							</button>
						</div>
						<span className="sd-lookup-lang">{lang === 'ar' ? L.langAr : L.langEn}</span>
					</div>
					<div className="sd-lookup-actions">
						<button
							type="button"
							className={`sd-lookup-star${entry?.saved ? ' is-on' : ''}`}
							disabled={!entry || saving}
							title={entry?.saved ? L.favorited : L.favorite}
							onClick={toggleFavorite}
						>
							<Star size={15} fill={entry?.saved ? 'currentColor' : 'none'} />
						</button>
						<button type="button" className="sd-lookup-x" title={L.close} onClick={() => { setLocalPeek(null); onClosePeek?.(); }}>
							<X size={14} />
						</button>
					</div>
				</div>

				{busy && (
					<p className="sd-lookup-status"><Loader2 size={14} className="sd-spin" /> {L.lookupLoading}</p>
				)}
				{error && <p className="sd-lookup-error">{error}</p>}
				{entry && !busy && (
					<div className="sd-lookup-body">
						{review.meaning === 'hide' && !answerShown ? (
							<button type="button" className="sd-lookup-reveal" onClick={() => setAnswerShown(true)}>{L.showAnswer}</button>
						) : (
							<p className={`sd-lookup-meaning${meaningClass(review.meaning)}`} dir="auto">{entry.translation}</p>
						)}
						{(entry.pronunciation || entry.partOfSpeech) && (
							<p className="sd-lookup-meta">
								{entry.partOfSpeech ? <span>{entry.partOfSpeech}</span> : null}
								{entry.pronunciation ? <span dir="ltr">{entry.pronunciation}</span> : null}
							</p>
						)}
						{entry.example && !review.hideExample && !activePeek?.sentence && (
							<p className="sd-lookup-example" dir="auto">
								<span>{L.example}</span>
								{entry.example}
							</p>
						)}
						{activePeek?.sentence && (
							<div className="sd-lookup-context">
								<span className="sd-lookup-kicker">{L.contextSentence}</span>
								<p className="sd-lookup-context-src" dir="auto">{activePeek.sentence}</p>
								{sentenceBusy && !sentenceEntry && (
									<p className="sd-lookup-status"><Loader2 size={14} className="sd-spin" /> {L.lookupLoading}</p>
								)}
								{sentenceEntry?.translation && review.meaning === 'hide' && !answerShown ? null : sentenceEntry?.translation && (
									<p className={`sd-lookup-meaning${meaningClass(review.meaning)}`} dir="auto">{sentenceEntry.translation}</p>
								)}
							</div>
						)}
					</div>
				)}

				<div className="sd-lookup-switch" role="tablist">
					<button type="button" role="tab" aria-selected={listsOpen && tab === 'recent'} className={listsOpen && tab === 'recent' ? 'is-on' : ''} onClick={() => { setTab('recent'); setListsOpen(open => tab === 'recent' ? !open : true); }}>
						<History size={12} /> {L.recentLookups}
					</button>
					<button type="button" role="tab" aria-selected={listsOpen && tab === 'favorites'} className={listsOpen && tab === 'favorites' ? 'is-on' : ''} onClick={() => { setTab('favorites'); setListsOpen(open => tab === 'favorites' ? !open : true); }}>
						<Star size={12} /> {L.favorites}
					</button>
				</div>

				{listsOpen && <ul className="sd-lookup-list">
					{(tab === 'recent' ? recent : pending).slice(0, 6).map((item) => (
						<li key={item.id}>
							<button type="button" onClick={() => openSaved(item)}>
								<strong dir="auto">{item.text}</strong>
								<em className={meaningClass(review.meaning)} dir="auto">{review.meaning === 'hide' ? '····' : item.translation}</em>
							</button>
						</li>
					))}
					{(tab === 'recent' ? recent : pending).length === 0 && (
						<li className="sd-lookup-empty">{tab === 'recent' ? L.recentEmpty : L.favoritesEmpty}</li>
					)}
				</ul>}
				{listsOpen && tab === 'favorites' && (
					<button type="button" className="sd-lookup-shelf-btn" onClick={() => onShelfOpen?.(true)}>
						<Bookmark size={13} /> {L.openShelf}
					</button>
				)}
			</div>,
			document.body,
		)
		: null;

	const shelf = shelfOpen && typeof document !== 'undefined'
		? createPortal(
			<aside className="sd-shelf" aria-label={L.shelfTitle}>
				<div className="sd-shelf-head">
					<div>
						<div className="sd-shelf-title"><Languages size={15} /> {L.shelfTitle}</div>
						<p>{shelfTab === 'done' ? L.reviewedHint : L.shelfHint}</p>
					</div>
					<div className="sd-shelf-tools">
						<button
							type="button"
							className={`sd-lookup-x${settingsOpen ? ' is-on' : ''}`}
							title={L.reviewSettings}
							aria-label={L.reviewSettings}
							aria-expanded={settingsOpen}
							onClick={() => setSettingsOpen((open) => !open)}
						>
							<SlidersHorizontal size={14} />
						</button>
						<button type="button" className="sd-lookup-x" title={L.close} onClick={() => onShelfOpen?.(false)}>
							<X size={14} />
						</button>
					</div>
				</div>
				{settingsOpen && (
					<div className="sd-review">
						<div className="sd-review-label">{L.reviewOptions}</div>
						<div className="sd-review-modes" role="radiogroup" aria-label={L.reviewOptions}>
							{MEANING_MODES.map((mode) => (
								<button
									key={mode}
									type="button"
									role="radio"
									aria-checked={review.meaning === mode}
									className={review.meaning === mode ? 'is-on' : ''}
									onClick={() => patchReview({ meaning: mode })}
								>
									{mode === 'show' ? L.meaningShow : mode === 'blur' ? L.meaningBlur : L.meaningHide}
								</button>
							))}
						</div>
						<label className="sd-review-check">
							<input type="checkbox" checked={review.autoSpeak} onChange={(e) => patchReview({ autoSpeak: e.target.checked })} />
							<span>{L.autoSpeak}</span>
						</label>
						<label className="sd-review-check">
							<input type="checkbox" checked={review.hideExample} onChange={(e) => patchReview({ hideExample: e.target.checked })} />
							<span>{L.hideExample}</span>
						</label>
						<label className="sd-review-check">
							<input type="checkbox" checked={review.coverWord} onChange={(e) => patchReview({ coverWord: e.target.checked })} />
							<span>{L.coverWord}</span>
						</label>
						<label className="sd-review-check">
							<input type="checkbox" checked={review.speakSentence} onChange={(e) => patchReview({ speakSentence: e.target.checked })} />
							<span>{L.speakSentence}</span>
						</label>
						<label className="sd-review-check">
							<input
								type="checkbox"
								checked={review.shuffle}
								onChange={(e) => patchReview({ shuffle: e.target.checked, shuffleSeed: e.target.checked ? Date.now() : review.shuffleSeed })}
							/>
							<span>{L.shuffle}</span>
						</label>
						<div className="sd-review-label sd-review-label--voices">{L.voices}</div>
						<p className="sd-voice-hint">{L.voiceHint}</p>
						{[
							['en', L.langEn, enVoices, 'Open. The file is open.'],
							['ar', L.langAr, arVoices, 'افتح. الملف مفتوح.'],
						].map(([code, label, list, sample]) => (
							<div key={code} className="sd-voice-group">
								<span>{label}</span>
								{list.length === 0 && <p className="sd-voice-hint">{L.voiceEmpty}</p>}
								{list.map((voice) => (
									<div key={voice.voiceURI} className={`sd-voice${review.voiceURI === voice.voiceURI ? ' is-on' : ''}`}>
										<button type="button" className="sd-voice-pick" onClick={() => patchReview({ voiceURI: voice.voiceURI })}>
											{voice.name}
										</button>
										<button
											type="button"
											className="sd-lookup-speak"
											title={L.listen}
											aria-label={L.listen}
											onClick={() => speakText(sample, code, voice)}
										>
											<Volume2 size={14} />
										</button>
									</div>
								))}
							</div>
						))}
					</div>
				)}
				<div className="sd-lookup-switch sd-shelf-tabs" role="tablist">
					<button type="button" role="tab" aria-selected={shelfTab === 'due'} className={shelfTab === 'due' ? 'is-on' : ''} onClick={() => setShelfTab('due')}>
						{L.dueTab} ({pending.length})
					</button>
					<button type="button" role="tab" aria-selected={shelfTab === 'done'} className={shelfTab === 'done' ? 'is-on' : ''} onClick={() => setShelfTab('done')}>
						{L.reviewedTab} ({done.length})
					</button>
				</div>
				<ul className="sd-shelf-list">
					{shelfItems.map((item) => {
						const itemLang = item.sourceLang || detectLang(item.text);
						const cover = review.coverWord && shelfTab === 'due';
						return (
						<li key={item.id}>
							<button type="button" className="sd-shelf-word" onClick={() => openSaved(item)}>
								<strong className={cover ? 'is-cover' : ''} dir="auto">{item.text}</strong>
								<em className={meaningClass(review.meaning)} dir="auto">{review.meaning === 'hide' ? '····' : item.translation}</em>
								{item.example && !review.hideExample && (
									<span className="sd-shelf-sentence" dir="auto">{item.example}</span>
								)}
							</button>
							<button
								type="button"
								className="sd-lookup-speak"
								title={L.listen}
								aria-label={L.listen}
								onClick={() => speakText(item.text, itemLang, voiceFor(itemLang, review.voiceURI, voices))}
							>
								<Volume2 size={14} />
							</button>
							<label className="sd-shelf-check">
								<input
									type="checkbox"
									checked={reviewed.has(item.id)}
									onChange={(e) => markReviewed(item.id, e.target.checked)}
								/>
								<Check size={12} />
								<span>{L.reviewed}</span>
							</label>
						</li>
						);
					})}
					{!shelfItems.length && (
						<li className="sd-lookup-empty">
							{shelfTab === 'done' ? L.reviewedEmpty : (done.length ? L.dueClear : L.favoritesEmpty)}
						</li>
					)}
				</ul>
			</aside>,
			document.body,
		)
		: null;

	const pinButton = pin && typeof document !== 'undefined'
		? createPortal(
			<button
				type="button"
				className="sd-lookup-pin"
				style={{ top: pin.top, left: pin.left }}
				title={L.translateSelection}
				aria-label={L.translateSelection}
				onMouseDown={(e) => {
					e.preventDefault();
					e.stopPropagation();
				}}
				onClick={() => onOpenOffer?.(offer)}
			>
				<Languages size={16} />
			</button>,
			document.body,
		)
		: null;

	return (
		<>
			{pinButton}
			{popover}
			{shelf}
		</>
	);
}
