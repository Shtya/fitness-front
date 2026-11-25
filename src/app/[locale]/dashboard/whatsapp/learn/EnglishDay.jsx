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

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
	PenLine,
	Pause,
	Play,
	Pencil,
	Plus,
	RotateCcw,
	Shuffle,
	Sparkles,
	Square,
	Star,
	Trash2,
	Upload,
	Video,
	Volume2,
	Wand2,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import api from '@/utils/axios';
import { Modal } from './learn-ui';
import { SPEAK_MINUTES, clock, dropLine, rowKey, enId, isLink, isWordSelection, markWords, markdownText, normalizeDay, parseInline, parseMarkdown, sentenceAround, totalSpokenSeconds, youtubeId, youtubeStart } from './english-model';
import { deleteClip, getClip, putClip, recorderMime, speak } from './english-audio';
import { shuffled } from './learn-model';
import VideoLoop from './VideoLoop';
import { lookupWord, translateLine } from './word-lookup';
import { transcribeClip } from './speech-transcribe';
import './english.css';
import './speak-rec.css';
import './english-md.css';
import './words-table.css';

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
			const data = await lookupWord(text.trim(), context);
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

/** A small "ع" button at the end of an English sentence: shows its Arabic under it, tap again to hide. */
function LineTr({ c, text }) {
	const [state, setState] = useState(null); // null | 'loading' | { ar } | 'error'
	const [open, setOpen] = useState(false);
	const toggle = async e => {
		e.stopPropagation();
		if (open) return setOpen(false);
		setOpen(true);
		if (state && state !== 'error') return undefined;
		setState('loading');
		try {
			setState({ ar: await translateLine(text) });
		} catch {
			setState('error');
		}
		return undefined;
	};
	return (
		<>
			<button type="button" className={`en-ltr-btn${open ? ' is-on' : ''}`} onClick={toggle} title={open ? c.en.hideArabic : c.en.showArabic} aria-label={open ? c.en.hideArabic : c.en.showArabic} aria-expanded={open}>
				{state === 'loading' && open ? <Loader2 size={11} className="animate-spin" /> : 'ع'}
			</button>
			{open && state && state !== 'loading' ? (
				<span className={`en-ltr${state === 'error' ? ' is-err' : ''}`} dir="rtl" lang="ar">
					{state === 'error' ? c.en.lineFailed : state.ar}
				</span>
			) : null}
		</>
	);
}

/** "**التركيب:** `…`" / "**Structure:** …" — a grammar pattern line. */
const isFormula = b => b?.type === 'p' && /^\*\*\s*(التركيب|الصيغة|Structure|Form|Pattern)\s*:?\s*:?\*\*/i.test(b.text.trim());

/**
 * The lesson's ## sections: "⏱ الجزء 1 (0:00 – 5:00)" becomes a part with its time;
 * the rest keep their title. Emoji at the start are dropped from the label.
 */
function lessonOutline(blocks) {
	const out = [];
	blocks.forEach((b, i) => {
		if (b.type !== 'h2') return;
		const plain = parseInline(b.text)
			.map(r => r.text)
			.join('')
			.replace(/^[^\p{L}\p{N}]+/u, '')
			.trim();
		const time = plain.match(/\(([^)]*\d+:\d\d[^)]*)\)\s*$/);
		const isPart = /^(الجزء|جزء|part|section)\s*\d+/i.test(plain);
		out.push({
			i,
			id: `md-sec-${i}`,
			part: isPart,
			label: (time ? plain.slice(0, time.index) : plain).trim(),
			time: time ? time[1].replace(/\s*[–-]\s*/, ' – ') : '',
		});
	});
	return out;
}

/**
 * Your own sentence with a word, an expression or a grammar point. Saved when you leave the box;
 * the ✨ button asks the AI whether it is right and shows the fix.
 */
function MySentence({ c, value, onSave, word = '', big = false }) {
	const [draft, setDraft] = useState(value);
	const [check, setCheck] = useState(null); // null | 'busy' | { ok, corrected, why }
	const ref = useRef(null);
	useEffect(() => setDraft(value), [value]);
	const grow = () => {
		const el = ref.current;
		if (!el) return;
		el.style.height = 'auto';
		el.style.height = `${el.scrollHeight}px`;
	};
	useEffect(grow, [draft]);
	const used = word && draft.trim() ? draft.toLowerCase().includes(word.toLowerCase()) : true;
	const ask = async () => {
		const text = draft.trim();
		if (!text) return;
		if (text !== value) onSave(text);
		setCheck('busy');
		try {
			const { data } = await api.post('/learn/english/ai', { task: 'correct', text: text.slice(0, 1000), topic: word ? `A sentence using "${word}"` : 'A practice sentence' });
			const fixes = data.fixes || [];
			setCheck({ ok: !fixes.length, corrected: data.corrected || '', why: fixes.map(f => f.why).filter(Boolean)[0] || '' });
		} catch (error) {
			setCheck(null);
			toast.error(aiError(error, c));
		}
	};
	return (
		<div className={`en-mine${big ? ' is-big' : ''}`}>
			<div className="en-mine__row">
				<textarea
					ref={ref}
					rows={1}
					dir="ltr"
					lang="en"
					value={draft}
					maxLength={800}
					placeholder={word ? c.en.mySentenceHint(word) : c.en.myGrammarHint}
					onChange={e => {
						setDraft(e.target.value);
						setCheck(null);
					}}
					onBlur={() => draft.trim() !== value && onSave(draft)}
					onKeyDown={e => {
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault();
							e.currentTarget.blur();
						}
					}}
				/>
				{draft.trim() ? (
					<span className="en-mine__tools">
						<button type="button" onClick={() => speak(draft)} aria-label={c.en.listen} title={c.en.listen}>
							<Volume2 size={13} />
						</button>
						<button type="button" className="is-ai" onClick={ask} disabled={check === 'busy' || draft.trim().split(/\s+/).length < 3} aria-label={c.en.checkSentence} title={c.en.checkSentence}>
							{check === 'busy' ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
						</button>
					</span>
				) : null}
			</div>
			{!used ? <small className="en-mine__warn">{c.en.useTheWord(word)}</small> : null}
			{check && check !== 'busy' ? (
				check.ok ? (
					<small className="en-mine__ok">
						<Check size={12} aria-hidden />
						{c.en.sentenceOk}
					</small>
				) : (
					<small className="en-mine__fix" dir="ltr" lang="en">
						<b>{check.corrected}</b>
						{check.why ? <span>{check.why}</span> : null}
						<button type="button" onClick={() => (setDraft(check.corrected), onSave(check.corrected), setCheck(null))}>
							{c.en.useFix}
						</button>
					</small>
				)
			) : null}
		</div>
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
					<LineTr c={c} text={word.meaning} />
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
					<LineTr c={c} text={word.example} />
				</p>
			) : null}
			{word.context && word.context !== word.example ? (
				<p className="en-pop__ctx" dir="ltr" lang="en">
					<small>{c.en.fromVideo}</small>
					{word.context}
					<LineTr c={c} text={word.context} />
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
			lookupWord(word, context)
				.then(data => {
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
							<LineTr c={c} text={data.meaning} />
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
									<LineTr c={c} text={ex} />
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
					<LineTr c={c} text={context} />
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
	const frame = useRef(null);
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
						ref={frame}
						src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&enablejsapi=1&start=${youtubeStart(url)}`}
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
				<div className="en-video__bar">
					<button type="button" className="en-link-btn" onClick={() => setEditing(true)}>
						<Pencil size={13} aria-hidden />
						{c.en.changeVideo}
					</button>
					{id ? <VideoLoop key={id} c={c} iframeRef={frame} videoId={id} /> : null}
				</div>
			)}
		</section>
	);
}

function Transcript({ c, day, others, onTranscript, onPatch, onSaveWord, onEditWord }) {
	const [mode, setMode] = useState(day.transcript.trim() ? 'read' : 'edit');
	// Pasting the first transcript: the button says "Start reading"; later edits say "Done".
	const firstTime = useRef(!day.transcript.trim());
	useEffect(() => {
		if (mode === 'read') firstTime.current = false;
	}, [mode]);
	const [draft, setDraft] = useState(day.transcript);
	// keep the editor in step with changes made while reading (a deleted table row)
	useEffect(() => {
		if (mode === 'read') setDraft(day.transcript);
	}, [day.transcript, mode]);
	const [hideLearned, setHideLearned] = useState(false);
	// tables: Arabic hidden until you hover (or tap) it — remembered on this device
	const [hideAr, setHideAr] = useState(() => {
		try {
			return window.localStorage.getItem('wa-learn:hide-ar') !== '0'; // hidden unless you chose to show it
		} catch {
			return true;
		}
	});
	const toggleHideAr = () =>
		setHideAr(v => {
			try {
				window.localStorage.setItem('wa-learn:hide-ar', v ? '0' : '1');
			} catch {
				/* private mode */
			}
			return !v;
		});
	const learnedSet = useMemo(() => new Set(day.learned || []), [day.learned]);
	const mine = day.mine || {};
	const saveMine = (key, text) => {
		const next = { ...mine };
		if (text.trim()) next[key] = text.trim();
		else delete next[key];
		onPatch({ mine: next });
	};
	const toggleLearned = key => {
		const next = learnedSet.has(key) ? (day.learned || []).filter(x => x !== key) : [...(day.learned || []), key];
		onPatch({ learned: next });
	};
	const deleteRow = (line, key) => {
		const before = { transcript: day.transcript, learned: day.learned || [] };
		onPatch({ transcript: dropLine(day.transcript, line), learned: before.learned.filter(x => x !== key) });
		toast(
			tt => (
				<span className="en-undo">
					{c.en.rowDeleted(key)}
					<button
						type="button"
						onClick={() => {
							onPatch(before);
							toast.dismiss(tt.id);
						}}
					>
						{c.en.undo}
					</button>
				</span>
			),
			{ duration: 6000 },
		);
	};
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
	// the lesson's sections (## headings): a bar to jump between them
	const outline = useMemo(() => lessonOutline(blocks), [blocks]);
	const [here, setHere] = useState(null);
	useEffect(() => {
		if (outline.length < 3) return undefined;
		const scroller = box.current?.closest('.lrn-sec-scroll');
		if (!scroller) return undefined;
		const spy = () => {
			const top = scroller.getBoundingClientRect().top + 90;
			let cur = outline[0].id;
			for (const o of outline) {
				const el = document.getElementById(o.id);
				if (el && el.getBoundingClientRect().top <= top) cur = o.id;
			}
			// at the very bottom the last sections can't reach the top: the last one you can see wins
			if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4) {
				const bottom = scroller.getBoundingClientRect().bottom;
				for (const o of outline) {
					const el = document.getElementById(o.id);
					if (el && el.getBoundingClientRect().top < bottom - 40) cur = o.id;
				}
			}
			setHere(cur);
		};
		spy();
		scroller.addEventListener('scroll', spy, { passive: true });
		return () => scroller.removeEventListener('scroll', spy);
	}, [outline]);
	const jump = id => {
		const el = document.getElementById(id);
		const scroller = box.current?.closest('.lrn-sec-scroll');
		if (!el || !scroller) return;
		scroller.scrollTo({ top: scroller.scrollTop + el.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 64, behavior: 'smooth' });
	};

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
			if (run.code)
				return (
					<code key={`${key}-${k}`} dir="auto">
						{run.text}
					</code>
				);
			let node = renderText(run.text, `${key}-${k}`);
			if (run.i) node = <em key={`${key}-${k}i`}>{node}</em>;
			if (run.b) node = <strong key={`${key}-${k}b`}>{node}</strong>;
			return node;
		});
	// "Your sentence" under a grammar point (keyed by its #### title)
	const grammarBox = i => {
		let title = '';
		for (let k = i; k >= 0; k -= 1) {
			if (/^h[2-5]$/.test(blocks[k].type)) {
				title = parseInline(blocks[k].text).map(r => r.text).join('').trim();
				break;
			}
		}
		const key = `g:${title.toLowerCase().slice(0, 180) || i}`;
		return (
			<div className="en-md-mine">
				<span className="en-md-mine__label">
					<PenLine size={14} aria-hidden />
					{c.en.myGrammarSentence}
				</span>
				<MySentence c={c} value={mine[key] || ''} onSave={text => saveMine(key, text)} big />
			</div>
		);
	};
	const renderBlock = (b, i) => {
		if (b.type === 'hr') return <hr key={i} />;
		if (b.type === 'code') return <pre key={i}>{b.text}</pre>;
		if (b.type === 'table') {
			const cols = Math.max(b.head?.length || 0, ...b.rows.map(r => r.length));
			// the English part of a cell ("disclaimer (ديسكليمَر)" → "disclaimer"), when it starts in English
			const englishOf = src => {
				const plain = parseInline(src || '').map(r => r.text).join('');
				if (!/^[\s"'“(]*[a-z]/i.test(plain)) return '';
				return plain.replace(/\([^)]*[؀-ۿ][^)]*\)/g, '').replace(/[؀-ۿ]+/g, '').replace(/\s+/g, ' ').trim();
			};
			const cells = (row, Cell, key) =>
				Array.from({ length: cols }, (_, k) => {
					const say = Cell === 'td' ? englishOf(row[k]) : '';
					// a cell that is mostly Arabic (the meaning) — the one that hides
					const txt = row[k] || '';
					const isAr = Cell === 'td' && (txt.match(/[\u0600-\u06ff]/g) || []).length > (txt.match(/[a-z]/gi) || []).length;
					return (
						<Cell
							key={k}
							dir="auto"
							className={Cell === 'th' ? (englishOf(b.rows[0]?.[k]) ? 'is-en' : undefined) : isAr ? 'is-ar' : undefined}
							onClick={isAr ? e => e.currentTarget.classList.toggle('is-open') : undefined}
							title={isAr && hideAr ? c.en.showArabicCell : undefined}
						>
							{say ? (
								<button type="button" className="en-cell-say" onClick={() => speak(say)} title={`${c.en.listen}: ${say}`} aria-label={`${c.en.listen}: ${say}`}>
									<Volume2 size={13} />
								</button>
							) : null}
							{renderInline(row[k] || '', `${key}.${k}`)}
						</Cell>
					);
				});
			const rows = b.rows.map((row, j) => ({ row, j, key: rowKey(row), line: b.lines?.[j] }));
			const done = rows.filter(r => learnedSet.has(r.key)).length;
			const shown = hideLearned ? rows.filter(r => !learnedSet.has(r.key)) : rows;
			// English on the left, Arabic on the right (each cell aligns to its own language)
			return (
				<div key={i} className={`en-tbl${hideAr ? ' is-hide-ar' : ''}`} dir="ltr">
					<div className="en-tbl__bar">
						<span className="en-tbl__count">
							<b>{done}</b> / {rows.length} {c.en.learnedOf}
						</span>
						<i className="en-tbl__meter" aria-hidden>
							<i style={{ width: `${rows.length ? (done / rows.length) * 100 : 0}%` }} />
						</i>
						<button type="button" className={`en-tbl__hide${hideAr ? ' is-on' : ''}`} onClick={toggleHideAr} aria-pressed={hideAr}>
							{hideAr ? <Eye size={13} aria-hidden /> : <EyeOff size={13} aria-hidden />}
							{hideAr ? c.en.showArabicAll : c.en.hideArabicAll}
						</button>
						{done ? (
							<button type="button" className={`en-tbl__hide${hideLearned ? ' is-on' : ''}`} onClick={() => setHideLearned(v => !v)} aria-pressed={hideLearned}>
								{hideLearned ? <Eye size={13} aria-hidden /> : <EyeOff size={13} aria-hidden />}
								{hideLearned ? c.en.showLearned : c.en.hideLearned}
							</button>
						) : null}
					</div>
					<div className="en-tr__table">
						<table>
							{b.head ? (
								<thead>
									<tr>
										<th className="en-tbl__chk" aria-label={c.en.learned} title={c.en.learned}>
											<Check size={13} aria-hidden />
										</th>
										{cells(b.head, 'th', `${i}h`)}
										<th className="en-tbl__mine">{c.en.mySentence}</th>
										<th className="en-tbl__del" aria-hidden />
									</tr>
								</thead>
							) : null}
							<tbody>
								{shown.map(({ row, j, key, line }) => {
									const on = learnedSet.has(key);
									return (
										<tr key={`${j}-${key}`} className={on ? 'is-learned' : undefined}>
											<td className="en-tbl__chk">
												<button type="button" role="checkbox" aria-checked={on} className="en-tbl__box" onClick={() => key && toggleLearned(key)} title={on ? c.en.notLearned : c.en.markLearned} aria-label={`${on ? c.en.notLearned : c.en.markLearned}: ${key}`}>
													{on ? <Check size={13} strokeWidth={3} /> : null}
												</button>
											</td>
											{cells(row, 'td', `${i}.${j}`)}
											<td className="en-tbl__mine">
												{key ? <MySentence c={c} value={mine[`w:${key}`] || ''} word={key} onSave={text => saveMine(`w:${key}`, text)} /> : null}
											</td>
											<td className="en-tbl__del">
												{line != null ? (
													<button type="button" className="en-tbl__x" onClick={() => deleteRow(line, key)} title={c.en.deleteRow} aria-label={`${c.en.deleteRow}: ${key}`}>
														<Trash2 size={14} />
													</button>
												) : null}
											</td>
										</tr>
									);
								})}
								{!shown.length ? (
									<tr>
										<td className="en-tbl__all" colSpan={cols + 3}>
											{c.en.allLearned}
										</td>
									</tr>
								) : null}
							</tbody>
						</table>
					</div>
				</div>
			);
		}
		if (b.type === 'ul' || b.type === 'ol') {
			const List = b.type;
			// examples right after a "Structure:" line read as example sentences
			const examples = isFormula(blocks[i - 1]);
			if (examples)
				return (
					<Fragment key={i}>
						<List dir="auto" className="en-md-examples">
							{b.items.map((it, j) => (
								<li key={j} dir="auto">
									{renderInline(it, `${i}.${j}`)}
								</li>
							))}
						</List>
						{grammarBox(i)}
					</Fragment>
				);
			return (
				<List key={i} dir="auto">
					{b.items.map((it, j) => (
						<li key={j} dir="auto">
							{renderInline(it, `${i}.${j}`)}
						</li>
					))}
				</List>
			);
		}
		if (b.type === 'quote')
			return (
				<blockquote key={i} dir="auto">
					{renderInline(b.text, i)}
				</blockquote>
			);
		if (isFormula(b)) {
			const hasExamples = (blocks[i + 1]?.type === 'ul' || blocks[i + 1]?.type === 'ol');
			return (
				<Fragment key={i}>
					<p dir="auto" className="en-md-formula">
						{renderInline(b.text, i)}
					</p>
					{hasExamples ? null : grammarBox(i)}
				</Fragment>
			);
		}
		const Tag = b.type === 'p' ? 'p' : b.type;
		const sec = b.type === 'h2' ? outline.find(o => o.i === i) : null;
		return (
			<Tag key={i} dir="auto" id={sec ? sec.id : undefined} className={sec?.part ? 'is-part' : undefined}>
				{sec?.part ? (
					<>
						<span className="en-md-part__n">{sec.label}</span>
						{sec.time ? <span className="en-md-part__t">{sec.time}</span> : null}
					</>
				) : (
					renderInline(b.text, i)
				)}
			</Tag>
		);
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
				{outline.length >= 3 ? (
					<nav className="en-md-toc" aria-label={c.en.sections}>
						{outline.map((o, k) => {
							// parts are small numbered circles (their time in the tooltip); other sections keep their title
							const n = o.part ? (o.label.match(/\d+/) || [k + 1])[0] : null;
							const firstPart = o.part && !outline.slice(0, k).some(x => x.part);
							return (
								<span key={o.id} className="en-md-toc__item">
									{firstPart ? <span className="en-md-toc__label">{c.en.parts}</span> : null}
									<button
										type="button"
										className={`${o.part ? 'is-part' : ''}${here === o.id ? ' is-here' : ''}`}
										onClick={() => jump(o.id)}
										dir="auto"
										title={o.time ? `${o.label} · ${o.time}` : o.label}
										aria-label={o.time ? `${o.label} · ${o.time}` : o.label}
									>
										{o.part ? n : o.label}
									</button>
								</span>
							);
						})}
					</nav>
				) : null}
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

function WordsTab({ c, day, others, onAdd, onEdit, onFav }) {
	const [practice, setPractice] = useState(null); // { deck, i, open }
	const [view, setView] = useState('day'); // day | fav
	const [showOld, setShowOld] = useState(false);
	const [showAr, setShowAr] = useState(false); // all Arabic visible
	const [seen, setSeen] = useState(() => new Set()); // Arabic revealed by a tap
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
							{w.translation ? (
								<p dir="rtl" className="en-card__tr">
									{w.translation}
								</p>
							) : null}
							{w.example ? (
								<p dir="ltr" className="en-card__ex">
									{w.example}
								</p>
							) : null}
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

	const favs = [...day.words.filter(w => w.fav), ...others.filter(w => w.fav)];
	const rows = view === 'fav' ? favs : day.words;
	const reveal = key =>
		setSeen(s => {
			const n = new Set(s);
			if (n.has(key)) n.delete(key);
			else n.add(key);
			return n;
		});

	const table = (words, mine) => (
		<div className="en-wt">
			<table>
				<thead>
					<tr>
						<th className="en-wt__star" aria-label={c.en.favorites}>
							<Star size={13} aria-hidden />
						</th>
						<th>{c.en.colWord}</th>
						<th className="en-wt__arh">{c.en.colArabic}</th>
						<th>{c.en.colSentences}</th>
						<th className="en-wt__act" aria-hidden />
					</tr>
				</thead>
				<tbody>
					{words.map(w => {
						const own = mine || w.lectureId == null;
						const key = `${w.lectureId || 'day'}:${w.id}`;
						const open = showAr || seen.has(key);
						const sentences = [w.example, w.context && w.context !== w.example ? w.context : ''].filter(Boolean);
						return (
							<tr key={key} className={w.fav ? 'is-fav' : undefined}>
								<td className="en-wt__star">
									{own ? (
										<button type="button" className={`en-wt__fav${w.fav ? ' is-on' : ''}`} onClick={() => onFav(w.id)} aria-pressed={Boolean(w.fav)} title={w.fav ? c.en.unfav : c.en.fav} aria-label={`${w.fav ? c.en.unfav : c.en.fav}: ${w.text}`}>
											<Star size={16} fill={w.fav ? 'currentColor' : 'none'} />
										</button>
									) : (
										<span className="en-wt__fav is-on is-ro" title={c.en.fromDay(w.day)}>
											<Star size={16} fill="currentColor" />
										</span>
									)}
								</td>
								<td className="en-wt__word">
									<div>
										<b dir="ltr" lang="en">
											{w.text}
										</b>
										<button type="button" className="en-cell-say" onClick={() => speak(w.text)} aria-label={`${c.en.listen}: ${w.text}`} title={c.en.listen}>
											<Volume2 size={13} />
										</button>
									</div>
									{!own ? <span className="en-pop__day">{c.en.fromDay(w.day)}</span> : null}
								</td>
								<td className="en-wt__ar">
									{w.translation ? (
										<button type="button" className={`en-wt__reveal${open ? ' is-open' : ''}`} dir="rtl" lang="ar" onClick={() => reveal(key)} title={open ? c.en.hideArabicCell : c.en.showArabicCell}>
											{w.translation}
										</button>
									) : (
										<span className="en-wt__none">—</span>
									)}
								</td>
								<td className="en-wt__sent" dir="ltr" lang="en">
									{w.meaning ? <p className="en-wt__meaning">{w.meaning}</p> : null}
									{sentences.map((x, i) => (
										<p key={i} className={`en-wt__ex${i ? ' is-ctx' : ''}`}>
											<button type="button" className="en-wt__say" onClick={() => speak(x)} aria-label={c.en.listen}>
												<Volume2 size={12} />
											</button>
											<span>
												{i ? <small>{c.en.fromVideo}</small> : null}
												{highlight(x, w.text)}
											</span>
											<LineTr c={c} text={x} />
										</p>
									))}
									{!w.meaning && !sentences.length ? <span className="en-wt__none">—</span> : null}
								</td>
								<td className="en-wt__act">
									{own ? (
										<button type="button" className="lrn-icon-btn" onClick={() => onEdit(w)} aria-label={c.en.editWord} title={c.en.editWord}>
											<Pencil size={14} />
										</button>
									) : null}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);

	const deck = view === 'fav' ? favs : [...day.words, ...(showOld ? others : [])];
	return (
		<section className="en-words-tab">
			<div className="en-wt__bar">
				<div className="en-wt__views" role="tablist">
					<button type="button" role="tab" aria-selected={view === 'day'} className={view === 'day' ? 'is-on' : ''} onClick={() => setView('day')}>
						{c.en.todayWords}
						<em>{day.words.length}</em>
					</button>
					<button type="button" role="tab" aria-selected={view === 'fav'} className={view === 'fav' ? 'is-on' : ''} onClick={() => setView('fav')}>
						<Star size={13} fill={view === 'fav' ? 'currentColor' : 'none'} aria-hidden />
						{c.en.favorites}
						<em>{favs.length}</em>
					</button>
				</div>
				<button type="button" className={`en-wt__toggle${showAr ? ' is-on' : ''}`} onClick={() => setShowAr(v => !v)} aria-pressed={showAr}>
					{showAr ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
					{showAr ? c.en.hideArabicAll : c.en.showArabicAll}
				</button>
				<span className="en-grow" />
				<button type="button" className="lrn-btn is-ghost" disabled={!deck.length} onClick={() => setPractice({ deck: shuffled(deck), i: 0, open: false })}>
					<RotateCcw size={15} aria-hidden />
					{c.qa.practice}
				</button>
				<button type="button" className="lrn-btn" onClick={() => onAdd('', '')}>
					<Plus size={15} aria-hidden />
					{c.en.addWord}
				</button>
			</div>
			{rows.length ? table(rows, view === 'day') : <p className="lrn-qa__empty">{view === 'fav' ? c.en.noFavs : c.en.noWords}</p>}
			{view === 'day' && others.length ? (
				<>
					<button type="button" className="en-link-btn en-old-toggle" onClick={() => setShowOld(v => !v)} aria-expanded={showOld}>
						{showOld ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
						{c.en.oldWords(others.length)}
					</button>
					{showOld ? table(others, false) : null}
				</>
			) : null}
		</section>
	);
}

/** The word inside its sentence, in bold. */
function highlight(sentence, word) {
	const w = String(word || '').trim();
	if (!w) return sentence;
	const at = sentence.toLowerCase().indexOf(w.toLowerCase());
	if (at < 0) return sentence;
	return (
		<>
			{sentence.slice(0, at)}
			<b>{sentence.slice(at, at + w.length)}</b>
			{sentence.slice(at + w.length)}
		</>
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

/**
 * What you said in one recording, and later tries at it. The original stays as it was;
 * "New version" adds another try. Each one can be analysed by the AI: the mistakes with their
 * grammar point and rule, a corrected text, an overall look, your level and tips.
 */
function SpokenText({ c, s, topic, writing, onTranscribe, onUpdate }) {
	const versions = useMemo(
		() => [
			{ id: 'orig', text: s.text || '', corrected: s.corrected || '', fixes: s.fixes || [], analysis: s.analysis || null, original: true },
			...(s.versions || []).map(v => ({ ...v, fixes: v.fixes || [], analysis: v.analysis || null })),
		],
		[s.text, s.corrected, s.fixes, s.analysis, s.versions],
	);
	const [active, setActive] = useState('orig');
	const cur = versions.find(v => v.id === active) || versions[0];
	const [editing, setEditing] = useState(!s.text);
	const [draft, setDraft] = useState(cur.text);
	const [adding, setAdding] = useState(null); // new version text, while writing it
	const [busy, setBusy] = useState(false);
	const [showCorrected, setShowCorrected] = useState(false);
	useEffect(() => {
		setDraft(cur.text);
		// text written out after recording: show it ready to read
		if (cur.text) setEditing(false);
	}, [cur.text, cur.id]);

	const patchVersion = (vid, patch) => {
		if (vid === 'orig') onUpdate(patch);
		else onUpdate({ versions: (s.versions || []).map(v => (v.id === vid ? { ...v, ...patch } : v)) });
	};
	const analyse = async () => {
		const text = (editing ? draft : cur.text).trim();
		if (!text) return;
		setBusy(true);
		try {
			const { data } = await api.post('/learn/english/ai', { task: 'correct', text: text.slice(0, 8000), topic: (s.prompt || topic).slice(0, 200) });
			patchVersion(cur.id, { text, corrected: data.corrected || '', fixes: (data.fixes || []).map((f, i) => ({ id: `f${i}`, ...f, done: false })), analysis: data.analysis || null });
			setEditing(false);
			if (!data.fixes?.length) toast.success(c.en.noFixes);
		} catch (error) {
			toast.error(aiError(error, c));
		} finally {
			setBusy(false);
		}
	};
	const saveNew = () => {
		const text = (adding || '').trim();
		if (!text) return setAdding(null);
		const v = { id: enId('v'), at: Date.now(), text, corrected: '', fixes: [], analysis: null };
		onUpdate({ versions: [...(s.versions || []), v] });
		setAdding(null);
		setActive(v.id);
		return undefined;
	};
	const removeVersion = vid => {
		onUpdate({ versions: (s.versions || []).filter(v => v.id !== vid) });
		setActive('orig');
	};
	const fixes = cur.fixes;
	const a = cur.analysis;
	const label = (v, i) => (v.original ? c.en.original : c.en.versionN(i + 1));

	return (
		<div className="en-said">
			<div className="en-said__bar">
				<b>{c.en.whatYouSaid}</b>
				{versions.length > 1 || adding != null ? (
					<div className="en-vtabs" role="tablist">
						{versions.map((v, i) => (
							<span key={v.id} className={`en-vtab${v.id === cur.id && adding == null ? ' is-on' : ''}`}>
								<button type="button" role="tab" aria-selected={v.id === cur.id} onClick={() => (setAdding(null), setActive(v.id))}>
									{label(v, i)}
									{v.analysis?.level ? <em>{v.analysis.level}</em> : null}
								</button>
								{!v.original ? (
									<button type="button" className="en-vtab__x" onClick={() => removeVersion(v.id)} aria-label={c.en.deleteVersion} title={c.en.deleteVersion}>
										×
									</button>
								) : null}
							</span>
						))}
						{adding != null ? <span className="en-vtab is-on is-new">{c.en.versionN(versions.length + 1)}</span> : null}
					</div>
				) : null}
				{!editing && adding == null && cur.original ? (
					<button type="button" className="lrn-icon-btn" onClick={() => setEditing(true)} aria-label={c.en.editText} title={c.en.editText}>
						<Pencil size={14} />
					</button>
				) : null}
			</div>

			{adding != null ? (
				<div className="en-said__new">
					<textarea className="en-said__edit" dir="ltr" lang="en" rows={4} maxLength={20000} value={adding} placeholder={c.en.newVersionHint} onChange={e => setAdding(e.target.value)} autoFocus />
					<div className="en-said__tools">
						<button type="button" className="lrn-btn is-primary" onClick={saveNew} disabled={!adding.trim()}>
							<Check size={15} aria-hidden />
							{c.en.saveVersion}
						</button>
						{cur.corrected ? (
							<button type="button" className="en-link-btn" onClick={() => setAdding(cur.corrected)}>
								<Wand2 size={13} aria-hidden />
								{c.en.startFromCorrected}
							</button>
						) : null}
						<button type="button" className="lrn-btn is-ghost" onClick={() => setAdding(null)}>
							{c.cancel || c.close}
						</button>
					</div>
				</div>
			) : (
				<>
					{writing && cur.original ? (
						<p className="en-said__writing" aria-live="polite">
							<Loader2 size={15} className="animate-spin" aria-hidden />
							{c.en.writingText}
						</p>
					) : editing && cur.original ? (
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
								if (draft !== (s.text || '')) onUpdate({ text: draft, corrected: '', fixes: [], analysis: null });
								if (draft.trim()) setEditing(false);
							}}
						/>
					) : (
						<p className="en-said__text" dir="ltr" lang="en">
							{markFixes(cur.text, fixes).map((part, i) =>
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
						{!writing && onTranscribe && cur.original && !(editing ? draft : cur.text || '').trim() ? (
							<button type="button" className="lrn-btn en-write-btn" onClick={onTranscribe}>
								<Wand2 size={15} aria-hidden />
								{c.en.writeForMe}
							</button>
						) : null}
						<button type="button" className="lrn-btn en-ai-btn" onClick={analyse} disabled={writing || busy || !(editing ? draft : cur.text || '').trim()}>
							{busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Sparkles size={15} aria-hidden />}
							{busy ? c.en.analysing : fixes.length || cur.corrected || a ? c.en.analyseAgain : c.en.analyse}
						</button>
						<button type="button" className="lrn-btn is-ghost en-new-btn" onClick={() => setAdding('')} disabled={!versions.some(v => v.text.trim())}>
							<Plus size={15} aria-hidden />
							{c.en.newVersion}
						</button>
					</div>

					{a ? (
						<div className="en-ana">
							<div className="en-ana__head">
								<Sparkles size={15} aria-hidden />
								<b>{c.en.aiLook}</b>
								{a.level ? (
									<span className="en-ana__level" title={c.en.levelHint}>
										{c.en.level} <em>{a.level}</em>
									</span>
								) : null}
								<span className="en-ana__count">{c.en.mistakes(fixes.length)}</span>
							</div>
							{a.summary ? (
								<p className="en-ana__sum" dir="ltr" lang="en">
									{a.summary}
									<LineTr c={c} text={a.summary} />
								</p>
							) : null}
							{a.tips?.length ? (
								<ul className="en-ana__tips" dir="ltr" lang="en">
									{a.tips.map(t => (
										<li key={t}>{t}</li>
									))}
								</ul>
							) : null}
						</div>
					) : null}

					{cur.corrected ? (
						<button type="button" className="en-link-btn" onClick={() => setShowCorrected(v => !v)} aria-expanded={showCorrected}>
							{showCorrected ? <EyeOff size={13} aria-hidden /> : <Eye size={13} aria-hidden />}
							{c.en.correctedVersion}
						</button>
					) : null}
					{showCorrected && cur.corrected ? (
						<p className="en-said__corrected" dir="ltr" lang="en">
							<button type="button" onClick={() => speak(cur.corrected)} aria-label={c.en.listen}>
								<Volume2 size={13} />
							</button>
							{cur.corrected}
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
										onClick={() => patchVersion(cur.id, { fixes: fixes.map(x => (x.id === f.id ? { ...x, done: !x.done } : x)) })}
									>
										{f.done ? <Check size={13} /> : null}
									</button>
									<div className="en-fix__main" dir="ltr" lang="en">
										{f.kind ? <span className="en-fix__kind">{f.kind}</span> : null}
										<span className="en-fix__wrong">{f.wrong}</span>
										<span className="en-fix__arrow" aria-hidden>
											→
										</span>
										<span className="en-fix__right">{f.right}</span>
										<button type="button" className="en-fix__say" onClick={() => speak(f.right)} aria-label={c.en.listen}>
											<Volume2 size={12} />
										</button>
										{f.why ? (
											<small>
												{f.why}
												<LineTr c={c} text={f.why} />
											</small>
										) : null}
									</div>
								</li>
							))}
						</ul>
					) : null}
				</>
			)}
		</div>
	);
}

function Clip({ c, s, topic, writing, onTranscribe, onDelete, onUpdate }) {
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
			<SpokenText c={c} s={s} topic={topic} writing={writing} onTranscribe={missing ? null : onTranscribe} onUpdate={onUpdate} />
		</li>
	);
}

/** Brave exposes the speech API but never returns words (no Google speech service). */
const liveTextWorks = () => Boolean(SpeechRec) && !(typeof navigator !== 'undefined' && navigator.brave);
const WAVE_BARS = 36;

function SpeakTab({ c, day, topic, prompt, onPrompt, onSession, onDeleteSession, onUpdateSession }) {
	const [minutes, setMinutes] = useState(5);
	const [rec, setRec] = useState(null); // { elapsed, paused }
	const [live, setLive] = useState(''); // speech-to-text while recording
	const [liveOn, setLiveOn] = useState(true); // false: the text is written after you finish
	const [writing, setWriting] = useState(() => new Set()); // session ids being transcribed
	const [used, setUsed] = useState(() => new Set());
	const r = useRef({});
	const level = useRef(null);
	const wave = useRef(null);
	useEffect(() => setLiveOn(liveTextWorks()), []);

	const elapsedNow = () => {
		const x = r.current;
		return (x.acc || 0) + (x.runFrom ? (Date.now() - x.runFrom) / 1000 : 0);
	};
	const stopListening = () => {
		r.current.listening = false;
		try {
			r.current.sr?.stop();
		} catch {
			/* already stopped */
		}
	};
	/** End the recording: saved (Done, or time's up) or thrown away. */
	const finish = useCallback((discard = false) => {
		const x = r.current;
		if (!x.recorder || x.recorder.state === 'inactive') return;
		x.discard = discard;
		x.acc = elapsedNow();
		x.runFrom = 0;
		stopListening();
		x.recorder.stop();
		window.clearInterval(x.timer);
		window.cancelAnimationFrame(x.raf);
	}, []);
	useEffect(
		() => () => {
			finish(false);
			r.current.stream?.getTracks().forEach(t => t.stop());
			closeCtx(r.current);
		},
		[finish],
	);

	const transcribe = useCallback(
		async (id, blob) => {
			setWriting(s => new Set(s).add(id));
			try {
				const audio = blob || (await getClip(id));
				const text = audio ? await transcribeClip(audio) : '';
				if (text) onUpdateSession(id, { text, corrected: '', fixes: [] });
				else toast(c.en.heardNothing);
			} catch {
				toast.error(c.en.transcribeFailed);
			} finally {
				setWriting(s => {
					const n = new Set(s);
					n.delete(id);
					return n;
				});
			}
		},
		[c, onUpdateSession],
	);

	const listen = () => {
		const x = r.current;
		if (!liveTextWorks() || x.srDead) return;
		x.listening = true;
		const sr = new SpeechRec();
		sr.lang = 'en-US';
		sr.continuous = true;
		sr.interimResults = true;
		sr.onresult = e => {
			let interim = '';
			for (let i = e.resultIndex; i < e.results.length; i += 1) {
				const t = e.results[i][0]?.transcript || '';
				if (e.results[i].isFinal) x.finalText = `${x.finalText} ${t}`.trim();
				else interim += t;
			}
			x.interim = interim;
			setLive(`${x.finalText} ${interim}`.trim());
		};
		sr.onerror = ev => {
			// no speech service here (Brave, offline, blocked): write the text after recording instead
			if (['network', 'not-allowed', 'service-not-allowed', 'language-not-supported', 'audio-capture'].includes(ev.error)) {
				x.srDead = true;
				x.listening = false;
				setLiveOn(false);
			}
		};
		sr.onend = () => {
			if (x.interim) x.finalText = `${x.finalText} ${x.interim}`.trim();
			x.interim = '';
			// Chrome ends recognition after a pause: start it again while still recording
			if (x.listening) window.setTimeout(() => x.listening && listen(), 150);
		};
		x.sr = sr;
		try {
			sr.start();
		} catch {
			x.srDead = true;
			setLiveOn(false);
		}
	};

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
		const startedAt = Date.now();
		const limit = minutes * 60;
		const saidPrompt = prompt || topic;
		recorder.ondataavailable = e => e.data?.size && chunks.push(e.data);
		recorder.onstop = async () => {
			stream.getTracks().forEach(t => t.stop());
			closeCtx(r.current);
			const x = r.current;
			const seconds = Math.min(limit, Math.round(x.acc || 0));
			setRec(null);
			if (x.discard) {
				setLive('');
				toast(c.en.recDiscarded);
				return;
			}
			// give the recogniser a moment to deliver its last words
			await new Promise(res => window.setTimeout(res, 600));
			const text = `${x.finalText || ''} ${x.interim || ''}`.replace(/\s+/g, ' ').trim();
			setLive('');
			if (seconds < 2 || !chunks.length) return;
			const blob = new Blob(chunks, { type: recorder.mimeType || mime || 'audio/webm' });
			try {
				await putClip(id, blob);
			} catch {
				/* the session still counts even if the audio could not be kept */
			}
			onSession({ id, at: startedAt, seconds, prompt: saidPrompt.slice(0, 600), text: text.slice(0, 20000), corrected: '', fixes: [] });
			toast.success(c.en.saved(clock(seconds)));
			if (!text) void transcribe(id, blob);
		};
		// live level: the glow and the waveform
		try {
			const ctx = new (window.AudioContext || window.webkitAudioContext)();
			const an = ctx.createAnalyser();
			an.fftSize = 256;
			ctx.createMediaStreamSource(stream).connect(an);
			const buf = new Uint8Array(an.frequencyBinCount);
			const hist = new Array(WAVE_BARS).fill(0);
			let frame = 0;
			const loop = () => {
				an.getByteTimeDomainData(buf);
				let peak = 0;
				for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
				const lvl = r.current.recorder?.state === 'paused' ? 0 : Math.min(1, peak / 56);
				level.current?.style.setProperty('--lvl', String(lvl));
				frame += 1;
				if (frame % 4 === 0 && wave.current) {
					hist.shift();
					hist.push(lvl);
					const bars = wave.current.children;
					for (let i = 0; i < bars.length; i += 1) bars[i].style.transform = `scaleY(${Math.max(0.08, hist[i] || 0)})`;
				}
				r.current.raf = window.requestAnimationFrame(loop);
			};
			r.current.ctx = ctx;
			r.current.raf = window.requestAnimationFrame(loop);
		} catch {
			/* meter is optional */
		}
		recorder.start(1000);
		r.current = { ...r.current, recorder, stream, timer: 0, finalText: '', interim: '', listening: false, sr: null, srDead: false, discard: false, acc: 0, runFrom: Date.now() };
		setLiveOn(liveTextWorks());
		listen();
		setRec({ elapsed: 0, paused: false });
		r.current.timer = window.setInterval(() => {
			const elapsed = elapsedNow();
			setRec(v => (v ? { ...v, elapsed } : v));
			if (elapsed >= limit) finish(false);
		}, 250);
	};

	const pause = () => {
		const x = r.current;
		if (x.recorder?.state !== 'recording') return;
		x.recorder.pause();
		x.acc = elapsedNow();
		x.runFrom = 0;
		stopListening();
		setRec(v => (v ? { ...v, paused: true, elapsed: x.acc } : v));
	};
	const resume = () => {
		const x = r.current;
		if (x.recorder?.state !== 'paused') return;
		x.recorder.resume();
		x.runFrom = Date.now();
		listen();
		setRec(v => (v ? { ...v, paused: false } : v));
	};

	const spoken = totalSpokenSeconds(day);
	const limit = minutes * 60;
	const elapsed = rec ? rec.elapsed : 0;
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

			<div className={`en-rc${rec ? ' is-on' : ''}${rec?.paused ? ' is-paused' : ''}`} ref={level}>
				{!rec ? (
					<>
						<div className="en-rc__mins" role="radiogroup" aria-label={c.en.minutes}>
							{SPEAK_MINUTES.map(m => (
								<button key={m} type="button" role="radio" aria-checked={minutes === m} className={minutes === m ? 'is-on' : ''} onClick={() => setMinutes(m)}>
									{c.en.min(m)}
								</button>
							))}
						</div>
						<button type="button" className="en-rc__mic" onClick={start} aria-label={c.en.start}>
							<span className="en-rc__halo" aria-hidden />
							<Mic size={30} strokeWidth={2.2} />
						</button>
						<span className="en-rc__hint">{c.en.tapToStart}</span>
						{!liveOn ? <p className="en-rc__note">{c.en.liveLater}</p> : null}
					</>
				) : (
					<>
						<div className="en-rc__status">
							<span className="en-rc__dot" aria-hidden />
							<b>{rec.paused ? c.en.recPaused : c.en.recNow}</b>
							<span className="en-rc__left" dir="ltr">
								{c.en.recLeft(clock(Math.max(0, limit - elapsed)))}
							</span>
						</div>
						<b className="en-rc__time" dir="ltr">
							{clock(elapsed)}
						</b>
						<div className="en-rc__wave" ref={wave} aria-hidden>
							{Array.from({ length: WAVE_BARS }, (_, i) => (
								<i key={i} />
							))}
						</div>
						<i className="en-rc__progress" aria-hidden>
							<i style={{ width: `${Math.min(100, (elapsed / limit) * 100)}%` }} />
						</i>
						<div className="en-rc__ctrls">
							<button type="button" className="en-rc__ctl is-ghost" onClick={() => finish(true)} title={c.en.recDiscard}>
								<Trash2 size={17} aria-hidden />
								<span>{c.en.recDiscard}</span>
							</button>
							<button type="button" className="en-rc__ctl is-pause" onClick={rec.paused ? resume : pause}>
								{rec.paused ? <Play size={18} fill="currentColor" aria-hidden /> : <Pause size={18} fill="currentColor" aria-hidden />}
								<span>{rec.paused ? c.en.recResume : c.en.recPause}</span>
							</button>
							<button type="button" className="en-rc__ctl is-done" onClick={() => finish(false)}>
								<Check size={18} strokeWidth={2.6} aria-hidden />
								<span>{c.en.recDone}</span>
							</button>
						</div>
						<p className={`en-live${live ? '' : ' is-empty'}`} dir={live ? 'ltr' : undefined} lang={live ? 'en' : undefined} aria-live="polite">
							{live || (rec.paused ? c.en.recPausedHint : liveOn ? c.en.listening : c.en.liveLater)}
						</p>
					</>
				)}
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
							writing={writing.has(s.id)}
							onTranscribe={() => transcribe(s.id)}
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

export default function EnglishDay({ c, lecture, course, onChange, renderNotes, tabsHost = null }) {
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
			{(() => {
				const nav = (
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
				);
				// in the lecture header when there is room for it, else in its own bar
				return tabsHost ? createPortal(nav, tabsHost) : <div className="lrn-lbar">{nav}</div>;
			})()}
			<div className={`lrn-lecture__body is-en-${tab}`}>
				{/* The scroller spans the whole width (scrollbar at the page edge); the content is centred inside. */}
				<div className="lrn-sec-scroll en-scroll">
				<div className="en-day">
					{tab === 'read' ? (
						<>
							<VideoBlock c={c} url={day.videoUrl} onUrl={videoUrl => change({ videoUrl }, true)} />
							<Transcript c={c} day={day} others={others} onTranscript={(transcript, now) => change({ transcript }, now)} onPatch={patch => change(patch, true)} onSaveWord={saveWord} onEditWord={w => setDialog(w)} />
						</>
					) : tab === 'words' ? (
						<WordsTab c={c} day={day} others={others} onAdd={addWord} onEdit={w => setDialog(w)} onFav={id => change({ words: dayRef.current.words.map(x => (x.id === id ? { ...x, fav: !x.fav } : x)) }, true)} />
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
