'use client';

/*
 * An English course's lecture = one day of practice:
 *   Watch & read · the video and its transcript; words you picked are coloured, hover (or tap)
 *                  one for its meaning, Arabic and an example; select text to add a new word.
 *   Words       · the day's words, flashcards, and the earlier days' vocabulary.
 *   Questions   · your own and AI questions about the topic, with your written answers.
 *   Speaking    · talk about the topic for N minutes; recordings stay on this device.
 *   Notes       · free notes (same editor as the other courses).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	BookA,
	BookOpenText,
	Check,
	ChevronLeft,
	ChevronRight,
	ExternalLink,
	Eye,
	EyeOff,
	HelpCircle,
	Loader2,
	Mic,
	NotebookPen,
	Pencil,
	Plus,
	RotateCcw,
	Shuffle,
	Sparkles,
	Square,
	Trash2,
	Upload,
	Video,
	Volume2,
	Wand2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/utils/axios';
import { Modal } from './learn-ui';
import { SPEAK_MINUTES, clock, enId, isLink, isWordSelection, markWords, markdownText, normalizeDay, parseInline, parseMarkdown, sentenceAround, totalSpokenSeconds, youtubeId, youtubeStart } from './english-model';
import { deleteClip, getClip, putClip, recorderMime, speak } from './english-audio';
import { shuffled } from './learn-model';
import './english.css';

const TABS = [
	['read', BookOpenText],
	['words', BookA],
	['questions', HelpCircle],
	['speak', Mic],
	['notes', NotebookPen],
];
const TAB_KEY = 'wa-learn:en-tab';

const readTab = () => {
	try {
		const v = window.sessionStorage.getItem(TAB_KEY);
		return TABS.some(([id]) => id === v) ? v : 'read';
	} catch {
		return 'read';
	}
};

const aiError = (error, c) => {
	const msg = error?.response?.data?.message;
	return typeof msg === 'string' && msg.length < 160 ? msg : c.en.aiFailed;
};

/* ───────── word dialog (add / edit, with AI fill) ───────── */

function WordDialog({ c, initial, onClose, onSave, onDelete }) {
	const [text, setText] = useState(initial.text || '');
	const [meaning, setMeaning] = useState(initial.meaning || '');
	const [translation, setTranslation] = useState(initial.translation || '');
	const [example, setExample] = useState(initial.example || '');
	const [busy, setBusy] = useState(false);
	const context = initial.context || initial.example || '';

	const fill = async () => {
		if (!text.trim() || busy) return;
		setBusy(true);
		try {
			const { data } = await api.post('/learn/english/ai', { task: 'word', word: text.trim(), context: context.slice(0, 600) });
			if (data.meaning) setMeaning(data.meaning);
			if (data.translation) setTranslation(data.translation);
			// the sentence from the transcript stays the example; AI's only fills an empty one
			setExample(e => e || data.example || '');
		} catch (error) {
			toast.error(aiError(error, c));
		} finally {
			setBusy(false);
		}
	};

	const submit = event => {
		event?.preventDefault?.();
		if (!text.trim()) return;
		onSave({ ...initial, text: text.trim(), meaning: meaning.trim(), translation: translation.trim(), example: example.trim() });
		onClose();
	};

	return (
		<Modal
			c={c}
			title={initial.id ? c.en.editWord : c.en.addWord}
			onClose={onClose}
			footer={
				<>
					{onDelete ? (
						<button
							type="button"
							className="lrn-btn is-ghost en-danger"
							onClick={() => {
								onDelete();
								onClose();
							}}
						>
							<Trash2 size={15} aria-hidden />
							{c.delete}
						</button>
					) : null}
					<span className="en-grow" />
					<button type="button" className="lrn-btn is-ghost" onClick={onClose}>
						{c.cancel}
					</button>
					<button type="submit" form="en-word-form" className="lrn-btn is-primary" disabled={!text.trim()}>
						{c.save}
					</button>
				</>
			}
		>
			<form id="en-word-form" className="lrn-form en-word-form" onSubmit={submit}>
				<label className="lrn-field">
					<span>{c.en.word}</span>
					<div className="en-word-row">
						<input dir="ltr" lang="en" autoFocus={!initial.text} maxLength={120} value={text} onChange={e => setText(e.target.value)} placeholder="e.g. look forward to" />
						<button type="button" className="lrn-icon-btn" onClick={() => speak(text)} title={c.en.listen} aria-label={c.en.listen} disabled={!text.trim()}>
							<Volume2 size={17} />
						</button>
					</div>
				</label>
				<button type="button" className="lrn-btn en-ai-btn" onClick={fill} disabled={!text.trim() || busy}>
					{busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Wand2 size={15} aria-hidden />}
					{c.en.aiFill}
				</button>
				<label className="lrn-field">
					<span>{c.en.meaning}</span>
					<textarea dir="ltr" lang="en" rows={2} maxLength={600} value={meaning} onChange={e => setMeaning(e.target.value)} placeholder={c.en.meaningHint} />
				</label>
				<label className="lrn-field">
					<span>{c.en.translation}</span>
					<input dir="rtl" lang="ar" maxLength={300} value={translation} onChange={e => setTranslation(e.target.value)} placeholder={c.en.translationHint} />
				</label>
				<label className="lrn-field">
					<span>{c.en.example}</span>
					<textarea dir="ltr" lang="en" rows={2} maxLength={800} value={example} onChange={e => setExample(e.target.value)} placeholder={c.en.exampleHint} />
				</label>
			</form>
		</Modal>
	);
}

/* ───────── word popover (hover / tap a coloured word) ───────── */

function WordPop({ c, pop, onEdit, onEnter, onLeave }) {
	const { word, rect } = pop;
	const w = Math.min(320, window.innerWidth - 24);
	const left = Math.max(12, Math.min(rect.left + rect.width / 2 - w / 2, window.innerWidth - w - 12));
	const above = rect.top > 230;
	const style = above ? { left, width: w, bottom: window.innerHeight - rect.top + 10 } : { left, width: w, top: rect.bottom + 10 };
	return (
		<div className={`en-pop${above ? ' is-above' : ''}`} style={style} role="tooltip" onMouseEnter={onEnter} onMouseLeave={onLeave}>
			<div className="en-pop__head">
				<b dir="ltr" lang="en">
					{word.text}
				</b>
				<button type="button" className="lrn-icon-btn" onClick={() => speak(word.text)} title={c.en.listen} aria-label={c.en.listen}>
					<Volume2 size={16} />
				</button>
				{word.day ? <span className="en-pop__day">{c.en.fromDay(word.day)}</span> : null}
				{onEdit ? (
					<button type="button" className="lrn-icon-btn" onClick={onEdit} title={c.en.editWord} aria-label={c.en.editWord}>
						<Pencil size={15} />
					</button>
				) : null}
			</div>
			{word.meaning ? (
				<p className="en-pop__meaning" dir="ltr" lang="en">
					{word.meaning}
				</p>
			) : (
				<p className="en-pop__empty">{c.en.noMeaning}</p>
			)}
			{word.translation ? (
				<p className="en-pop__tr" dir="rtl" lang="ar">
					{word.translation}
				</p>
			) : null}
			{word.example ? (
				<p className="en-pop__ex" dir="ltr" lang="en">
					<button type="button" onClick={() => speak(word.example)} aria-label={c.en.listen}>
						<Volume2 size={13} />
					</button>
					{word.example}
				</p>
			) : null}
			{word.context && word.context !== word.example ? (
				<p className="en-pop__ctx" dir="ltr" lang="en">
					<small>{c.en.fromVideo}</small>
					{word.context}
				</p>
			) : null}
		</div>
	);
}

/* ───────── add a word: small popover next to the selection, translated automatically ───────── */

const wordCache = new Map(); // "word|sentence" → AI answer, for this session

function placeNear(rect, w, h = 260) {
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	const left = Math.max(10, Math.min(rect.left + rect.width / 2 - w / 2, vw - w - 10));
	const below = vh - rect.bottom > h || rect.top < h;
	return below ? { left, width: w, top: rect.bottom + 10 } : { left, width: w, bottom: vh - rect.top + 10 };
}

function AddWordPop({ c, pick, existing, onSave, onClose }) {
	const [text, setText] = useState(existing?.text || pick.text);
	const [res, setRes] = useState(null);
	const [state, setState] = useState(existing ? 'ready' : 'loading'); // loading | ready | error
	const ref = useRef(null);
	const context = pick.context || '';

	useEffect(() => {
		if (existing) return undefined;
		const word = text.trim();
		if (!word) return undefined;
		const key = `${word.toLowerCase()}|${context}`;
		if (wordCache.has(key)) {
			setRes(wordCache.get(key));
			setState('ready');
			return undefined;
		}
		let live = true;
		setState('loading');
		const t = window.setTimeout(() => {
			api
				.post('/learn/english/ai', { task: 'word', word, context: context.slice(0, 600) })
				.then(({ data }) => {
					wordCache.set(key, data);
					if (live) {
						setRes(data);
						setState('ready');
					}
				})
				.catch(() => live && setState('error'));
		}, 350);
		return () => {
			live = false;
			window.clearTimeout(t);
		};
	}, [text, context, existing]);

	useEffect(() => {
		const away = e => {
			if (!ref.current?.contains(e.target)) onClose();
		};
		const esc = e => e.key === 'Escape' && onClose();
		const t = window.setTimeout(() => document.addEventListener('pointerdown', away), 0);
		document.addEventListener('keydown', esc);
		return () => {
			window.clearTimeout(t);
			document.removeEventListener('pointerdown', away);
			document.removeEventListener('keydown', esc);
		};
	}, [onClose]);

	const data = existing || res || {};
	const examples = existing ? [existing.example].filter(Boolean) : res?.examples?.length ? res.examples : [res?.example].filter(Boolean);
	const save = () => {
		onSave({
			text: text.trim(),
			translation: data.translation || '',
			meaning: data.meaning || '',
			example: examples[0] || '',
			context,
		});
		onClose();
	};

	return (
		<div className="en-add" ref={ref} style={placeNear(pick.rect, Math.min(340, window.innerWidth - 20))} role="dialog" aria-label={c.en.addWord}>
			<div className="en-add__head">
				<input
					dir="ltr"
					lang="en"
					value={text}
					maxLength={120}
					onChange={e => setText(e.target.value)}
					onKeyDown={e => e.key === 'Enter' && !existing && state === 'ready' && save()}
					aria-label={c.en.word}
					readOnly={Boolean(existing)}
				/>
				<button type="button" className="lrn-icon-btn" onClick={() => speak(text)} aria-label={c.en.listen} title={c.en.listen}>
					<Volume2 size={16} />
				</button>
			</div>
			{state === 'loading' ? (
				<div className="en-add__loading" aria-live="polite">
					<Loader2 size={15} className="animate-spin" aria-hidden />
					{c.en.translating}
					<i />
					<i />
				</div>
			) : state === 'error' ? (
				<p className="en-add__err">{c.en.translateFailed}</p>
			) : (
				<div className="en-add__body">
					{data.translation ? (
						<p className="en-add__tr" dir="rtl" lang="ar">
							{data.translation}
						</p>
					) : null}
					{data.meaning ? (
						<p className="en-add__meaning" dir="ltr" lang="en">
							{data.meaning}
						</p>
					) : null}
					{examples.length ? (
						<ul className="en-add__ex" dir="ltr" lang="en">
							{examples.map(ex => (
								<li key={ex}>
									<button type="button" onClick={() => speak(ex)} aria-label={c.en.listen}>
										<Volume2 size={12} />
									</button>
									{ex}
								</li>
							))}
						</ul>
					) : null}
				</div>
			)}
			{context ? (
				<p className="en-add__ctx" dir="ltr" lang="en">
					<small>{c.en.fromVideo}</small>
					{context}
				</p>
			) : null}
			<div className="en-add__foot">
				{existing ? (
					<span className="en-add__saved">
						<Check size={15} aria-hidden />
						{c.en.savedWord}
					</span>
				) : (
					<button type="button" className="lrn-btn is-primary" onClick={save} disabled={!text.trim() || state === 'loading'}>
						<Plus size={15} aria-hidden />
						{c.en.saveWord}
					</button>
				)}
				<button type="button" className="lrn-btn is-ghost" onClick={onClose}>
					{c.close}
				</button>
			</div>
		</div>
	);
}

/* ───────── watch & read ───────── */

function VideoBlock({ c, url, onUrl }) {
	const [draft, setDraft] = useState(url);
	const [editing, setEditing] = useState(!url);
	useEffect(() => setDraft(url), [url]);
	const id = youtubeId(url);
	const commit = () => {
		const v = draft.trim();
		if (v !== url) onUrl(v);
		setEditing(!v);
	};
	return (
		<section className="en-video">
			{id && !editing ? (
				<div className="en-video__frame">
					<iframe
						src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&start=${youtubeStart(url)}`}
						title="YouTube video"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowFullScreen
						loading="lazy"
					/>
				</div>
			) : url && !editing ? (
				<a className="en-video__link" href={/^https?:/i.test(url) ? url : `https://${url}`} target="_blank" rel="noreferrer noopener">
					<Video size={18} aria-hidden />
					<span dir="ltr">{url}</span>
					<ExternalLink size={15} aria-hidden />
				</a>
			) : null}
			{editing ? (
				<form
					className="en-video__form"
					onSubmit={e => {
						e.preventDefault();
						commit();
					}}
				>
					<Video size={17} aria-hidden />
					<input dir="ltr" value={draft} onChange={e => setDraft(e.target.value)} placeholder={c.en.videoHint} aria-label={c.en.video} />
					<button type="submit" className="lrn-btn is-primary" disabled={draft.trim() && !isLink(draft)}>
						{c.save}
					</button>
				</form>
			) : (
				<button type="button" className="en-link-btn" onClick={() => setEditing(true)}>
					<Pencil size={13} aria-hidden />
					{c.en.changeVideo}
				</button>
			)}
		</section>
	);
}

function Transcript({ c, day, others, onTranscript, onSaveWord, onEditWord }) {
	const [mode, setMode] = useState(day.transcript.trim() ? 'read' : 'edit');
	// Pasting the first transcript: the button says "Start reading"; later edits say "Done".
	const firstTime = useRef(!day.transcript.trim());
	useEffect(() => {
		if (mode === 'read') firstTime.current = false;
	}, [mode]);
	const [draft, setDraft] = useState(day.transcript);
	const [pick, setPick] = useState(null); // { text, context, rect }
	const closePick = useCallback(() => setPick(null), []);
	const [pop, setPop] = useState(null); // { word, rect, pinned }
	const box = useRef(null);
	const hideTimer = useRef(0);
	useEffect(() => {
		if (mode === 'edit') setDraft(day.transcript);
	}, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

	const all = useMemo(() => [...day.words.map(w => ({ ...w, mine: true })), ...others.filter(o => !day.words.some(w => w.text.toLowerCase() === o.text.toLowerCase()))], [day.words, others]);
	const blocks = useMemo(() => parseMarkdown(day.transcript), [day.transcript]);

	// select a word or phrase → "add word" button next to it
	const onSelect = () => {
		window.setTimeout(() => {
			const sel = window.getSelection();
			const text = sel?.toString().trim();
			if (!sel || !text || !isWordSelection(text) || !box.current?.contains(sel.anchorNode)) {
				setPick(null);
				return;
			}
			const rect = sel.getRangeAt(0).getBoundingClientRect();
			const para = sel.anchorNode?.parentElement?.closest('p, li, h1, h2, h3, blockquote')?.textContent || markdownText(day.transcript);
			setPick({ text: text.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''), context: sentenceAround(para, text), rect });
		}, 0);
	};

	const showPop = (el, word, pinned = false) => {
		window.clearTimeout(hideTimer.current);
		const r = el.getBoundingClientRect();
		setPop({ word, rect: { left: r.left, top: r.top, bottom: r.bottom, width: r.width }, pinned });
	};
	const hidePop = () => {
		hideTimer.current = window.setTimeout(() => setPop(p => (p?.pinned ? p : null)), 180);
	};
	useEffect(() => {
		if (!pop?.pinned) return undefined;
		const close = e => {
			if (!e.target.closest?.('.en-pop, .en-w')) setPop(null);
		};
		document.addEventListener('pointerdown', close);
		return () => document.removeEventListener('pointerdown', close);
	}, [pop?.pinned]);
	useEffect(() => {
		const off = () => setPop(p => (p?.pinned ? null : p));
		const scroller = box.current?.closest('.lrn-sec-scroll');
		scroller?.addEventListener('scroll', off, { passive: true });
		return () => scroller?.removeEventListener('scroll', off);
	}, []);

	// Markdown → elements; the plain text runs get the coloured words.
	const renderText = (text, key) =>
		markWords(text, all).map((part, j) =>
			part.word ? (
				<mark
					key={`${key}.${j}`}
					className={`en-w${part.word.mine ? ' is-day' : ' is-old'}`}
					tabIndex={0}
					onMouseEnter={e => showPop(e.currentTarget, part.word)}
					onMouseLeave={hidePop}
					onFocus={e => showPop(e.currentTarget, part.word)}
					onBlur={hidePop}
					onClick={e => showPop(e.currentTarget, part.word, true)}
				>
					{part.text}
				</mark>
			) : (
				<span key={`${key}.${j}`}>{part.text}</span>
			),
		);
	const renderInline = (src, key) =>
		parseInline(src).map((run, k) => {
			if (run.code) return <code key={`${key}-${k}`}>{run.text}</code>;
			let node = renderText(run.text, `${key}-${k}`);
			if (run.i) node = <em key={`${key}-${k}i`}>{node}</em>;
			if (run.b) node = <strong key={`${key}-${k}b`}>{node}</strong>;
			return node;
		});
	const renderBlock = (b, i) => {
		if (b.type === 'hr') return <hr key={i} />;
		if (b.type === 'code') return <pre key={i}>{b.text}</pre>;
		if (b.type === 'ul' || b.type === 'ol') {
			const List = b.type;
			return (
				<List key={i}>
					{b.items.map((it, j) => (
						<li key={j}>{renderInline(it, `${i}.${j}`)}</li>
					))}
				</List>
			);
		}
		if (b.type === 'quote') return <blockquote key={i}>{renderInline(b.text, i)}</blockquote>;
		const Tag = b.type === 'p' ? 'p' : b.type;
		return <Tag key={i}>{renderInline(b.text, i)}</Tag>;
	};

	// A .md / .txt file instead of pasting.
	const readFile = async e => {
		const file = e.target.files?.[0];
		e.target.value = '';
		if (!file) return;
		if (file.size > 400_000) {
			toast.error(c.en.fileTooBig);
			return;
		}
		const text = (await file.text()).slice(0, 200_000);
		setDraft(text);
		onTranscript(text, true);
		setMode('read');
	};

	if (mode === 'edit') {
		return (
			<section className="en-tr">
				<div className="en-tr__bar">
					<h3>{c.en.transcript}</h3>
					<label className="lrn-btn is-ghost en-upload">
						<Upload size={15} aria-hidden />
						{c.en.uploadFile}
						<input type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" onChange={readFile} hidden />
					</label>
					{draft.trim() ? (
						<button
							type="button"
							className="lrn-btn is-primary"
							onClick={() => {
								onTranscript(draft, true);
								setMode('read');
							}}
						>
							{firstTime.current ? <BookOpenText size={15} aria-hidden /> : <Check size={15} aria-hidden />}
							{firstTime.current ? c.en.startReading : c.en.doneEditing}
						</button>
					) : null}
				</div>
				<textarea
					className="en-tr__edit"
					dir="ltr"
					lang="en"
					value={draft}
					placeholder={c.en.transcriptHint}
					onChange={e => {
						setDraft(e.target.value);
						onTranscript(e.target.value);
					}}
					onBlur={() => draft.trim() && onTranscript(draft, true)}
				/>
			</section>
		);
	}

	return (
		<section className="en-tr">
			<div className="en-tr__bar">
				<h3>{c.en.transcript}</h3>
				<span className="en-tr__hint">{c.en.selectHint}</span>
				<button type="button" className="lrn-icon-btn" onClick={() => setMode('edit')} title={c.en.editTranscript} aria-label={c.en.editTranscript}>
					<Pencil size={16} />
				</button>
			</div>
			<div className="en-tr__text" ref={box} dir="ltr" lang="en" onMouseUp={onSelect} onTouchEnd={onSelect} onKeyUp={onSelect}>
				{blocks.map((block, i) => renderBlock(block, i))}
			</div>
			{pick ? (
				<AddWordPop
					key={`${pick.text}|${pick.rect.top}|${pick.rect.left}`}
					c={c}
					pick={pick}
					existing={day.words.find(w => w.text.toLowerCase() === pick.text.toLowerCase()) || null}
					onSave={w => {
						onSaveWord(w);
						window.getSelection()?.removeAllRanges();
					}}
					onClose={closePick}
				/>
			) : null}
			{pop ? (
				<WordPop
					c={c}
					pop={pop}
					onEnter={() => window.clearTimeout(hideTimer.current)}
					onLeave={hidePop}
					onEdit={
						pop.word.mine
							? () => {
									onEditWord(pop.word);
									setPop(null);
								}
							: null
					}
				/>
			) : null}
		</section>
	);
}

/* ───────── words ───────── */

function WordsTab({ c, day, others, onAdd, onEdit }) {
	const [practice, setPractice] = useState(null); // { deck, i, open }
	const [showOld, setShowOld] = useState(false);
	if (practice) {
		const w = practice.deck[practice.i];
		return (
			<section className="en-cards">
				<div className="lrn-qa__bar">
					<span className="lrn-qa__count">{c.qa.card(practice.i + 1, practice.deck.length)}</span>
					<button type="button" className="lrn-btn is-ghost" onClick={() => setPractice({ deck: shuffled(practice.deck), i: 0, open: false })}>
						<Shuffle size={15} aria-hidden />
						{c.qa.shuffle}
					</button>
					<button type="button" className="lrn-btn is-ghost" onClick={() => setPractice(null)}>
						{c.en.endPractice}
					</button>
				</div>
				<div className={`en-card${practice.open ? ' is-open' : ''}`}>
					<b dir="ltr" lang="en">
						{w.text}
					</b>
					<button type="button" className="lrn-icon-btn" onClick={() => speak(w.text)} aria-label={c.en.listen}>
						<Volume2 size={18} />
					</button>
					{practice.open ? (
						<div className="en-card__back">
							{w.meaning ? <p dir="ltr">{w.meaning}</p> : null}
							{w.translation ? <p dir="rtl" className="en-card__tr">{w.translation}</p> : null}
							{w.example ? <p dir="ltr" className="en-card__ex">{w.example}</p> : null}
						</div>
					) : (
						<p className="en-card__ask">{c.en.sayMeaning}</p>
					)}
					<button type="button" className="lrn-btn is-primary" onClick={() => setPractice(p => ({ ...p, open: !p.open }))}>
						{practice.open ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
						{practice.open ? c.qa.hide : c.qa.reveal}
					</button>
				</div>
				<div className="lrn-qa__nav">
					<button type="button" className="lrn-btn" disabled={practice.i === 0} onClick={() => setPractice(p => ({ ...p, i: p.i - 1, open: false }))}>
						<ChevronLeft size={16} className="lrn-flip-rtl" aria-hidden />
						{c.qa.prevCard}
					</button>
					<button type="button" className="lrn-btn" disabled={practice.i >= practice.deck.length - 1} onClick={() => setPractice(p => ({ ...p, i: p.i + 1, open: false }))}>
						{c.qa.nextCard}
						<ChevronRight size={16} className="lrn-flip-rtl" aria-hidden />
					</button>
				</div>
			</section>
		);
	}
	const list = (words, mine) => (
		<ul className="en-words">
			{words.map(w => (
				<li key={`${w.lectureId || 'day'}:${w.id}`} className={`en-wcard${mine ? '' : ' is-old'}`}>
					<div className="en-wcard__head">
						<b dir="ltr" lang="en">
							{w.text}
						</b>
						<button type="button" className="lrn-icon-btn" onClick={() => speak(w.text)} aria-label={c.en.listen} title={c.en.listen}>
							<Volume2 size={15} />
						</button>
						{w.translation ? (
							<span className="en-wcard__tr" dir="rtl" lang="ar">
								{w.translation}
							</span>
						) : null}
						{mine ? (
							<button type="button" className="lrn-icon-btn en-wcard__edit" onClick={() => onEdit(w)} aria-label={c.en.editWord} title={c.en.editWord}>
								<Pencil size={14} />
							</button>
						) : (
							<span className="en-pop__day">{c.en.fromDay(w.day)}</span>
						)}
					</div>
					{w.meaning ? (
						<p dir="ltr" lang="en">
							{w.meaning}
						</p>
					) : null}
					{w.example ? (
						<p className="en-wcard__ex" dir="ltr" lang="en">
							“{w.example}”
						</p>
					) : null}
				</li>
			))}
		</ul>
	);
	const deck = [...day.words, ...(showOld ? others : [])];
	return (
		<section className="en-words-tab">
			<div className="lrn-qa__bar">
				<span className="lrn-qa__count">{c.en.wordsCount(day.words.length)}</span>
				<button type="button" className="lrn-btn is-ghost" disabled={!deck.length} onClick={() => setPractice({ deck: shuffled(deck), i: 0, open: false })}>
					<RotateCcw size={15} aria-hidden />
					{c.qa.practice}
				</button>
				<button type="button" className="lrn-btn" onClick={() => onAdd('', '')}>
					<Plus size={15} aria-hidden />
					{c.en.addWord}
				</button>
			</div>
			{day.words.length ? list(day.words, true) : <p className="lrn-qa__empty">{c.en.noWords}</p>}
			{others.length ? (
				<>
					<button type="button" className="en-link-btn en-old-toggle" onClick={() => setShowOld(v => !v)} aria-expanded={showOld}>
						{showOld ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
						{c.en.oldWords(others.length)}
					</button>
					{showOld ? list(others, false) : null}
				</>
			) : null}
		</section>
	);
}

/* ───────── questions ───────── */

function QuestionsTab({ c, day, topic, onQuestions, onSpeak }) {
	const [busy, setBusy] = useState(false);
	const generate = async () => {
		setBusy(true);
		try {
			const { data } = await api.post('/learn/english/ai', {
				task: 'questions',
				topic: topic.slice(0, 200),
				transcript: markdownText(day.transcript).slice(0, 6000),
				words: day.words.map(w => w.text).slice(0, 60),
				existing: day.questions.map(q => q.q).slice(0, 40),
				count: 6,
			});
			const now = Date.now();
			onQuestions([...day.questions, ...(data.questions || []).map((q, i) => ({ id: enId('q'), q, a: '', source: 'ai', createdAt: now + i }))], true);
		} catch (error) {
			toast.error(aiError(error, c));
		} finally {
			setBusy(false);
		}
	};
	const update = (id, patch) => onQuestions(day.questions.map(q => (q.id === id ? { ...q, ...patch } : q)));
	return (
		<section className="en-qs">
			<div className="lrn-qa__bar">
				<span className="lrn-qa__count">{c.qaCount(day.questions.length)}</span>
				<button type="button" className="lrn-btn en-ai-btn" onClick={generate} disabled={busy || !topic.trim()}>
					{busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Sparkles size={15} aria-hidden />}
					{c.en.generate}
				</button>
				<button type="button" className="lrn-btn" onClick={() => onQuestions([...day.questions, { id: enId('q'), q: '', a: '', source: 'own', createdAt: Date.now() }], true)}>
					<Plus size={15} aria-hidden />
					{c.qa.add}
				</button>
			</div>
			{!day.questions.length ? <p className="lrn-qa__empty">{c.en.noQuestions}</p> : null}
			<ol className="en-qlist">
				{day.questions.map((q, i) => (
					<li key={q.id} className="en-q" dir="ltr">
						<div className="en-q__head">
							<span className="en-q__no">{i + 1}</span>
							<textarea
								className="en-q__q"
								dir="ltr"
								lang="en"
								rows={1}
								maxLength={1000}
								value={q.q}
								placeholder={c.en.questionHint}
								onChange={e => update(q.id, { q: e.target.value })}
							/>
							{q.source === 'ai' ? (
								<span className="en-q__ai" title="AI">
									<Sparkles size={12} />
								</span>
							) : null}
							<button type="button" className="lrn-icon-btn" onClick={() => speak(q.q)} aria-label={c.en.listen} title={c.en.listen} disabled={!q.q.trim()}>
								<Volume2 size={15} />
							</button>
							<button type="button" className="lrn-icon-btn" onClick={() => onSpeak(q.q)} aria-label={c.en.answerAloud} title={c.en.answerAloud} disabled={!q.q.trim()}>
								<Mic size={15} />
							</button>
							<button type="button" className="lrn-icon-btn is-danger" onClick={() => onQuestions(day.questions.filter(x => x.id !== q.id), true)} aria-label={c.qa.remove} title={c.qa.remove}>
								<Trash2 size={15} />
							</button>
						</div>
						<textarea className="en-q__a" dir="ltr" lang="en" rows={3} maxLength={6000} value={q.a} placeholder={c.en.answerHint} onChange={e => update(q.id, { a: e.target.value })} />
					</li>
				))}
			</ol>
		</section>
	);
}

/* ───────── speaking ───────── */

const closeCtx = x => {
	const ctx = x?.ctx;
	if (ctx && ctx.state !== 'closed') ctx.close().catch(() => undefined);
};

/** The browser's speech-to-text (Chrome, Edge, Safari, Android); null where it does not exist. */
const SpeechRec = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition || null : null;

/** What you said, with the parts the AI corrected underlined in red. */
function markFixes(text, fixes) {
	const src = String(text || '');
	const spans = [];
	const lower = src.toLowerCase();
	(fixes || []).forEach(f => {
		const w = String(f.wrong || '').trim().toLowerCase();
		if (!w) return;
		const at = lower.indexOf(w);
		if (at >= 0 && !spans.some(s => at < s.end && at + w.length > s.start)) spans.push({ start: at, end: at + w.length, fix: f });
	});
	spans.sort((a, b) => a.start - b.start);
	const out = [];
	let last = 0;
	spans.forEach(s => {
		if (s.start > last) out.push({ text: src.slice(last, s.start) });
		out.push({ text: src.slice(s.start, s.end), fix: s.fix });
		last = s.end;
	});
	if (last < src.length) out.push({ text: src.slice(last) });
	return out;
}

function SpokenText({ c, s, topic, onUpdate }) {
	const [editing, setEditing] = useState(!s.text);
	const [draft, setDraft] = useState(s.text || '');
	const [busy, setBusy] = useState(false);
	const [showCorrected, setShowCorrected] = useState(false);
	useEffect(() => setDraft(s.text || ''), [s.text]);
	const fixes = s.fixes || [];
	const check = async () => {
		const text = (editing ? draft : s.text || '').trim();
		if (!text) return;
		setBusy(true);
		try {
			const { data } = await api.post('/learn/english/ai', { task: 'correct', text: text.slice(0, 8000), topic: (s.prompt || topic).slice(0, 200) });
			onUpdate({ text, corrected: data.corrected || '', fixes: (data.fixes || []).map((f, i) => ({ id: `f${i}`, ...f, done: false })) });
			setEditing(false);
			if (!data.fixes?.length) toast.success(c.en.noFixes);
		} catch (error) {
			toast.error(aiError(error, c));
		} finally {
			setBusy(false);
		}
	};
	return (
		<div className="en-said">
			<div className="en-said__bar">
				<b>{c.en.whatYouSaid}</b>
				{!editing ? (
					<button type="button" className="lrn-icon-btn" onClick={() => setEditing(true)} aria-label={c.en.editText} title={c.en.editText}>
						<Pencil size={14} />
					</button>
				) : null}
			</div>
			{editing ? (
				<textarea
					className="en-said__edit"
					dir="ltr"
					lang="en"
					rows={4}
					maxLength={20000}
					value={draft}
					placeholder={c.en.saidHint}
					onChange={e => setDraft(e.target.value)}
					onBlur={() => {
						if (draft !== (s.text || '')) onUpdate({ text: draft, corrected: '', fixes: [] });
						if (draft.trim()) setEditing(false);
					}}
				/>
			) : (
				<p className="en-said__text" dir="ltr" lang="en">
					{markFixes(s.text, fixes).map((part, i) =>
						part.fix ? (
							<mark key={i} className={`en-said__bad${part.fix.done ? ' is-done' : ''}`} title={`→ ${part.fix.right}`}>
								{part.text}
							</mark>
						) : (
							<span key={i}>{part.text}</span>
						),
					)}
				</p>
			)}
			<div className="en-said__tools">
				<button type="button" className="lrn-btn en-ai-btn" onClick={check} disabled={busy || !(editing ? draft : s.text || '').trim()}>
					{busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Sparkles size={15} aria-hidden />}
					{fixes.length || s.corrected ? c.en.checkAgain : c.en.checkEnglish}
				</button>
				{s.corrected ? (
					<button type="button" className="en-link-btn" onClick={() => setShowCorrected(v => !v)} aria-expanded={showCorrected}>
						{showCorrected ? <EyeOff size={13} aria-hidden /> : <Eye size={13} aria-hidden />}
						{c.en.correctedVersion}
					</button>
				) : null}
			</div>
			{showCorrected && s.corrected ? (
				<p className="en-said__corrected" dir="ltr" lang="en">
					<button type="button" onClick={() => speak(s.corrected)} aria-label={c.en.listen}>
						<Volume2 size={13} />
					</button>
					{s.corrected}
				</p>
			) : null}
			{fixes.length ? (
				<ul className="en-fixes">
					{fixes.map(f => (
						<li key={f.id} className={f.done ? 'is-done' : ''}>
							<button
								type="button"
								className="en-fix__check"
								role="checkbox"
								aria-checked={f.done}
								aria-label={c.en.gotIt}
								title={c.en.gotIt}
								onClick={() => onUpdate({ fixes: fixes.map(x => (x.id === f.id ? { ...x, done: !x.done } : x)) })}
							>
								{f.done ? <Check size={13} /> : null}
							</button>
							<div className="en-fix__main" dir="ltr" lang="en">
								<span className="en-fix__wrong">{f.wrong}</span>
								<span className="en-fix__arrow" aria-hidden>
									→
								</span>
								<span className="en-fix__right">{f.right}</span>
								<button type="button" className="en-fix__say" onClick={() => speak(f.right)} aria-label={c.en.listen}>
									<Volume2 size={12} />
								</button>
								{f.why ? <small>{f.why}</small> : null}
							</div>
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
}

function Clip({ c, s, topic, onDelete, onUpdate }) {
	const [url, setUrl] = useState(null);
	const [missing, setMissing] = useState(false);
	useEffect(() => {
		let live = true;
		let made = null;
		getClip(s.id).then(blob => {
			if (!live) return;
			if (blob) {
				made = URL.createObjectURL(blob);
				setUrl(made);
			} else setMissing(true);
		});
		return () => {
			live = false;
			if (made) URL.revokeObjectURL(made);
		};
	}, [s.id]);
	return (
		<li className="en-clip">
			<div className="en-clip__meta">
				<b>{clock(s.seconds)}</b>
				<span>{new Date(s.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
				<button type="button" className="lrn-icon-btn is-danger" onClick={onDelete} aria-label={c.delete} title={c.delete}>
					<Trash2 size={14} />
				</button>
			</div>
			{s.prompt ? (
				<p className="en-clip__prompt" dir="ltr">
					{s.prompt}
				</p>
			) : null}
			{url ? <audio controls preload="metadata" src={url} /> : missing ? <p className="en-clip__missing">{c.en.otherDevice}</p> : null}
			<SpokenText c={c} s={s} topic={topic} onUpdate={onUpdate} />
		</li>
	);
}

function SpeakTab({ c, day, topic, prompt, onPrompt, onSession, onDeleteSession, onUpdateSession }) {
	const [minutes, setMinutes] = useState(5);
	const [rec, setRec] = useState(null); // { started, elapsed }
	const [live, setLive] = useState(''); // speech-to-text while recording
	const [used, setUsed] = useState(() => new Set());
	const r = useRef({});
	const level = useRef(null);

	const stop = useCallback(() => {
		const x = r.current;
		x.listening = false;
		try {
			x.sr?.stop();
		} catch {
			/* already stopped */
		}
		if (x.recorder && x.recorder.state !== 'inactive') x.recorder.stop();
		window.clearInterval(x.timer);
		window.cancelAnimationFrame(x.raf);
	}, []);
	useEffect(() => () => {
		stop();
		r.current.stream?.getTracks().forEach(t => t.stop());
		closeCtx(r.current);
	}, [stop]);

	const start = async () => {
		if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
			toast.error(c.en.noMic);
			return;
		}
		let stream;
		try {
			stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
		} catch {
			toast.error(c.en.micDenied);
			return;
		}
		const mime = recorderMime();
		const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
		const chunks = [];
		const id = enId('s');
		const started = Date.now();
		const limit = minutes * 60;
		const saidPrompt = prompt || topic;
		recorder.ondataavailable = e => e.data?.size && chunks.push(e.data);
		recorder.onstop = async () => {
			stream.getTracks().forEach(t => t.stop());
			closeCtx(r.current);
			const seconds = Math.min(limit, Math.round((Date.now() - started) / 1000));
			setRec(null);
			// give the recogniser a moment to deliver its last words
			await new Promise(res => window.setTimeout(res, 600));
			const text = `${r.current.finalText || ''} ${r.current.interim || ''}`.replace(/\s+/g, ' ').trim();
			setLive('');
			if (seconds < 2 || !chunks.length) return;
			try {
				await putClip(id, new Blob(chunks, { type: recorder.mimeType || mime || 'audio/webm' }));
			} catch {
				/* the session still counts even if the audio could not be kept */
			}
			onSession({ id, at: started, seconds, prompt: saidPrompt.slice(0, 600), text: text.slice(0, 20000), corrected: '', fixes: [] });
			toast.success(c.en.saved(clock(seconds)));
		};
		// live level meter
		try {
			const ctx = new (window.AudioContext || window.webkitAudioContext)();
			const an = ctx.createAnalyser();
			an.fftSize = 256;
			ctx.createMediaStreamSource(stream).connect(an);
			const buf = new Uint8Array(an.frequencyBinCount);
			const loop = () => {
				an.getByteTimeDomainData(buf);
				let peak = 0;
				for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
				level.current?.style.setProperty('--lvl', String(Math.min(1, peak / 64)));
				r.current.raf = window.requestAnimationFrame(loop);
			};
			r.current.ctx = ctx;
			r.current.raf = window.requestAnimationFrame(loop);
		} catch {
			/* meter is optional */
		}
		recorder.start(1000);
		r.current = { ...r.current, recorder, stream, timer: 0, finalText: '', interim: '', listening: true, sr: null };
		// live speech-to-text (Chrome stops it after a pause: restart it while still recording)
		if (SpeechRec) {
			const listen = () => {
				const sr = new SpeechRec();
				sr.lang = 'en-US';
				sr.continuous = true;
				sr.interimResults = true;
				sr.onresult = e => {
					let interim = '';
					for (let i = e.resultIndex; i < e.results.length; i += 1) {
						const t = e.results[i][0]?.transcript || '';
						if (e.results[i].isFinal) r.current.finalText = `${r.current.finalText} ${t}`.trim();
						else interim += t;
					}
					r.current.interim = interim;
					setLive(`${r.current.finalText} ${interim}`.trim());
				};
				sr.onerror = ev => {
					if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') r.current.listening = false;
				};
				sr.onend = () => {
					if (r.current.interim) r.current.finalText = `${r.current.finalText} ${r.current.interim}`.trim();
					r.current.interim = '';
					if (r.current.listening) window.setTimeout(() => r.current.listening && listen(), 150);
				};
				r.current.sr = sr;
				try {
					sr.start();
				} catch {
					/* no speech service */
				}
			};
			listen();
		}
		setRec({ started, elapsed: 0 });
		r.current.timer = window.setInterval(() => {
			const elapsed = (Date.now() - started) / 1000;
			setRec(x => (x ? { ...x, elapsed } : x));
			if (elapsed >= limit) stop();
		}, 250);
	};

	const spoken = totalSpokenSeconds(day);
	const limit = minutes * 60;
	const left = rec ? Math.max(0, limit - rec.elapsed) : limit;
	const pickPrompt = () => {
		const qs = day.questions.map(q => q.q).filter(Boolean);
		if (!qs.length) return;
		const others = qs.filter(q => q !== prompt);
		onPrompt((others.length ? others : qs)[Math.floor(Math.random() * (others.length || qs.length))]);
	};

	return (
		<section className="en-speak">
			<div className="en-speak__card">
				<span className="en-speak__label">{c.en.talkAbout}</span>
				<p className="en-speak__prompt" dir="ltr" lang="en">
					{prompt || topic}
				</p>
				<div className="en-speak__tools">
					<button type="button" className="en-link-btn" onClick={pickPrompt} disabled={!day.questions.length || Boolean(rec)}>
						<Shuffle size={13} aria-hidden />
						{c.en.anotherQuestion}
					</button>
					{prompt ? (
						<button type="button" className="en-link-btn" onClick={() => onPrompt('')} disabled={Boolean(rec)}>
							{c.en.backToTopic}
						</button>
					) : null}
				</div>
				{day.words.length ? (
					<div className="en-speak__words">
						<span>{c.en.tryWords}</span>
						{day.words.map(w => (
							<button
								key={w.id}
								type="button"
								dir="ltr"
								className={`en-chip${used.has(w.id) ? ' is-on' : ''}`}
								onClick={() =>
									setUsed(s => {
										const n = new Set(s);
										if (n.has(w.id)) n.delete(w.id);
										else n.add(w.id);
										return n;
									})
								}
								title={w.meaning || w.translation || ''}
							>
								{used.has(w.id) ? <Check size={12} aria-hidden /> : null}
								{w.text}
							</button>
						))}
					</div>
				) : null}
			</div>

			<div className={`en-rec${rec ? ' is-on' : ''}`} ref={level}>
				<div className="en-rec__mins" role="radiogroup" aria-label={c.en.minutes}>
					{SPEAK_MINUTES.map(m => (
						<button key={m} type="button" role="radio" aria-checked={minutes === m} className={minutes === m ? 'is-on' : ''} disabled={Boolean(rec)} onClick={() => setMinutes(m)}>
							{c.en.min(m)}
						</button>
					))}
				</div>
				<button type="button" className="en-rec__btn" onClick={rec ? stop : start} aria-label={rec ? c.en.stop : c.en.start}>
					<span className="en-rec__ring" style={{ '--p': rec ? Math.min(1, rec.elapsed / limit) : 0 }} aria-hidden />
					{rec ? <Square size={26} fill="currentColor" /> : <Mic size={30} />}
				</button>
				<b className="en-rec__time">{clock(left)}</b>
				<span className="en-rec__hint">{rec ? c.en.recording : c.en.tapToStart}</span>
				{rec ? (
					<p className={`en-live${live ? '' : ' is-empty'}`} dir="ltr" lang="en" aria-live="polite">
						{live || (SpeechRec ? c.en.listening : c.en.noSpeechApi)}
					</p>
				) : !SpeechRec ? (
					<p className="en-live is-empty">{c.en.noSpeechApi}</p>
				) : null}
			</div>

			<div className="en-speak__sum">
				<span>{c.en.spokenToday(clock(spoken))}</span>
			</div>
			{day.speaking.length ? (
				<ul className="en-clips">
					{[...day.speaking].reverse().map(s => (
						<Clip
							key={s.id}
							c={c}
							s={s}
							topic={topic}
							onUpdate={patch => onUpdateSession(s.id, patch)}
							onDelete={() => {
								void deleteClip(s.id);
								onDeleteSession(s.id);
							}}
						/>
					))}
				</ul>
			) : (
				<p className="lrn-qa__empty">{c.en.noSessions}</p>
			)}
		</section>
	);
}

/* ───────── the day ───────── */

export default function EnglishDay({ c, lecture, course, onChange, renderNotes }) {
	const day = useMemo(() => normalizeDay(lecture.english), [lecture.english]);
	const [tab, setTab] = useState(readTab);
	const [dialog, setDialog] = useState(null); // word being added / edited
	const [prompt, setPrompt] = useState('');
	const [courseWords, setCourseWords] = useState([]);
	const dayRef = useRef(day);
	dayRef.current = day;

	useEffect(() => {
		try {
			window.sessionStorage.setItem(TAB_KEY, tab);
		} catch {
			/* ignore */
		}
	}, [tab]);

	// earlier days' words (coloured too, in a quieter colour)
	useEffect(() => {
		let live = true;
		api
			.get(`/learn/courses/${course.id}/english/words`)
			.then(({ data }) => live && setCourseWords(Array.isArray(data?.words) ? data.words : []))
			.catch(() => {});
		return () => {
			live = false;
		};
	}, [course.id]);
	const others = useMemo(() => courseWords.filter(w => w.lectureId !== lecture.id), [courseWords, lecture.id]);

	const change = useCallback((patch, immediate = false) => onChange({ ...dayRef.current, ...patch }, immediate), [onChange]);
	const saveWord = w => {
		const words = dayRef.current.words;
		if (w.id && words.some(x => x.id === w.id)) change({ words: words.map(x => (x.id === w.id ? { ...x, ...w } : x)) }, true);
		else change({ words: [...words, { ...w, context: w.context || '', id: enId('w'), createdAt: Date.now() }] }, true);
		toast.success(c.en.savedWordToast(w.text));
	};
	const addWord = (text, context) => {
		const existing = dayRef.current.words.find(x => x.text.toLowerCase() === String(text).toLowerCase());
		setDialog(existing || { text, context });
	};
	const topic = [lecture.title, lecture.description].filter(Boolean).join(' — ');

	return (
		<>
			<div className="lrn-lbar">
				<nav className="lrn-tabs" role="tablist" aria-label={c.sectionsLabel}>
					{TABS.map(([id, Icon]) => {
						const count = id === 'words' ? day.words.length : id === 'questions' ? day.questions.length : id === 'speak' ? day.speaking.length : 0;
						return (
							<button key={id} type="button" role="tab" aria-selected={tab === id} className={`lrn-tab${tab === id ? ' is-on' : ''}`} onClick={() => setTab(id)}>
								<Icon size={15} aria-hidden />
								<span className="lrn-tab__label">{c.en.tabs[id]}</span>
								{count ? <span className="en-tab-count">{count}</span> : null}
							</button>
						);
					})}
				</nav>
			</div>
			<div className={`lrn-lecture__body is-en-${tab}`}>
				{/* The scroller spans the whole width (scrollbar at the page edge); the content is centred inside. */}
				<div className="lrn-sec-scroll en-scroll">
				<div className="en-day">
					{tab === 'read' ? (
						<>
							<VideoBlock c={c} url={day.videoUrl} onUrl={videoUrl => change({ videoUrl }, true)} />
							<Transcript c={c} day={day} others={others} onTranscript={(transcript, now) => change({ transcript }, now)} onSaveWord={saveWord} onEditWord={w => setDialog(w)} />
						</>
					) : tab === 'words' ? (
						<WordsTab c={c} day={day} others={others} onAdd={addWord} onEdit={w => setDialog(w)} />
					) : tab === 'questions' ? (
						<QuestionsTab
							c={c}
							day={day}
							topic={topic}
							onQuestions={(questions, now) => change({ questions }, now)}
							onSpeak={q => {
								setPrompt(q);
								setTab('speak');
							}}
						/>
					) : tab === 'speak' ? (
						<SpeakTab
							c={c}
							day={day}
							topic={topic}
							prompt={prompt}
							onPrompt={setPrompt}
							onSession={s => change({ speaking: [...dayRef.current.speaking, s] }, true)}
							onDeleteSession={id => change({ speaking: dayRef.current.speaking.filter(s => s.id !== id) }, true)}
							onUpdateSession={(id, patch) => change({ speaking: dayRef.current.speaking.map(s => (s.id === id ? { ...s, ...patch } : s)) }, true)}
						/>
					) : (
						renderNotes()
					)}
				</div>
				</div>
			</div>
			{dialog ? (
				<WordDialog
					c={c}
					initial={dialog}
					onClose={() => setDialog(null)}
					onSave={saveWord}
					onDelete={dialog.id && day.words.some(w => w.id === dialog.id) ? () => change({ words: dayRef.current.words.filter(w => w.id !== dialog.id) }, true) : null}
				/>
			) : null}
		</>
	);
}
