'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
	AlertTriangle,
	ArrowLeft,
	Maximize2,
	Minimize2,
	BookmarkCheck,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	Circle,
	Eye,
	EyeOff,
	FileText,
	HelpCircle,
	Info,
	Search,
	Lightbulb,
	ListChecks,
	Loader2,
	NotebookPen,
	Plus,
	RotateCcw,
	Shuffle,
	Trash2,
	Check,
} from 'lucide-react';
import api from '@/utils/axios';
import SmartDocumentEditor from '@/components/smart-document/SmartDocumentEditor';
import MarkdownVisualEditor from '@/components/smart-document/MarkdownVisualEditor';
import { useDocumentEditorLabels } from '@/components/smart-document/DocumentEditorWorkspace';
import { FONT_VARIABLE_CLASSES } from '@/components/smart-document/typography';
import { detectDominantDir } from '@/lib/smart-document/structure';
import { normalizeDirection } from '@/components/smart-document/bidi';
import { SECTIONS, qaId, shuffled } from './learn-model';
import { useLectureSaver } from './use-learn-library';

const SECTION_ICONS = { content: FileText, notes: NotebookPen, keyPoints: Lightbulb, summary: ListChecks, qa: HelpCircle };
/** Same storage key as the Documents tab: Learn shares its typography settings. */
const EDITOR_STORAGE_KEY = 'so7ba:smart-document:super-admin';

function SaveState({ state, c, onRetry }) {
	if (state === 'saving' || state === 'pending') {
		return (
			<span className="lrn-save is-saving" role="status">
				<Loader2 size={13} className="animate-spin" aria-hidden />
				{c.saving}
			</span>
		);
	}
	if (state === 'error') {
		return (
			<span className="lrn-save is-error" role="alert">
				<AlertTriangle size={13} aria-hidden />
				{c.saveFailed}
				<button type="button" onClick={onRetry}>
					{c.retry}
				</button>
			</span>
		);
	}
	if (state === 'saved') {
		return (
			<span className="lrn-save is-saved" role="status">
				<Check size={13} aria-hidden />
				{c.saved}
			</span>
		);
	}
	return null;
}

/** Notes / key points / summary: the Documents tab's visual editor on a single field. */
function SectionEditor({ value, placeholder, direction, onChange, onBlur }) {
	const [dir] = useState(() => detectDominantDir(value || ''));
	return (
		<div className={`sd-shell sd-shell--md is-ready lrn-sec-shell ${FONT_VARIABLE_CLASSES}`}>
			<div className="lrn-sec-paper">
				<MarkdownVisualEditor markdown={value || ''} onChange={onChange} onBlur={onBlur} placeholder={placeholder} dir={dir} direction={direction} autoFocus={!String(value || '').trim()} />
			</div>
		</div>
	);
}

function QaSection({ items, c, onChange }) {
	const [mode, setMode] = useState('edit'); // edit | practice
	const [deck, setDeck] = useState([]);
	const [index, setIndex] = useState(0);
	const [revealed, setRevealed] = useState(false);
	const ready = items.filter(item => item.q.trim());

	const startPractice = (order = ready) => {
		setDeck(order);
		setIndex(0);
		setRevealed(false);
		setMode('practice');
	};

	const update = (id, patch) => onChange(items.map(item => (item.id === id ? { ...item, ...patch } : item)));

	if (mode === 'practice' && deck.length) {
		const card = deck[Math.min(index, deck.length - 1)];
		return (
			<div className="lrn-qa">
				<div className="lrn-qa__bar">
					<span className="lrn-qa__count">{c.qa.card(index + 1, deck.length)}</span>
					<button type="button" className="lrn-btn is-ghost" onClick={() => startPractice(shuffled(ready))}>
						<Shuffle size={15} aria-hidden />
						{c.qa.shuffle}
					</button>
					<button type="button" className="lrn-btn is-ghost" onClick={() => setMode('edit')}>
						{c.qa.edit}
					</button>
				</div>
				<div className={`lrn-flash${revealed ? ' is-revealed' : ''}`}>
					<p className="lrn-flash__label">{c.qa.question}</p>
					<p className="lrn-flash__q" dir="auto">
						{card.q}
					</p>
					{revealed ? (
						<>
							<p className="lrn-flash__label">{c.qa.answer}</p>
							<p className="lrn-flash__a" dir="auto">
								{card.a || '—'}
							</p>
						</>
					) : null}
					<button type="button" className="lrn-btn is-primary lrn-flash__reveal" onClick={() => setRevealed(v => !v)}>
						{revealed ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
						{revealed ? c.qa.hide : c.qa.reveal}
					</button>
				</div>
				<div className="lrn-qa__nav">
					<button
						type="button"
						className="lrn-btn"
						disabled={index === 0}
						onClick={() => {
							setIndex(i => Math.max(0, i - 1));
							setRevealed(false);
						}}
					>
						<ChevronLeft size={16} className="lrn-flip-rtl" aria-hidden />
						{c.qa.prevCard}
					</button>
					<button
						type="button"
						className="lrn-btn"
						disabled={index >= deck.length - 1}
						onClick={() => {
							setIndex(i => Math.min(deck.length - 1, i + 1));
							setRevealed(false);
						}}
					>
						{c.qa.nextCard}
						<ChevronRight size={16} className="lrn-flip-rtl" aria-hidden />
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="lrn-qa">
			<div className="lrn-qa__bar">
				<span className="lrn-qa__count">{c.qaCount(items.length)}</span>
				<button type="button" className="lrn-btn is-ghost" disabled={!ready.length} onClick={() => startPractice()}>
					<RotateCcw size={15} aria-hidden />
					{c.qa.practice}
				</button>
			</div>
			{!items.length ? <p className="lrn-qa__empty">{c.qa.empty}</p> : null}
			<ol className="lrn-qa__list">
				{items.map((item, i) => (
					<li key={item.id} className="lrn-qa__item">
						<span className="lrn-qa__no" aria-hidden>
							{i + 1}
						</span>
						<div className="lrn-qa__fields">
							<label>
								<span className="lrn-sr">{c.qa.question}</span>
								<textarea
									className="lrn-qa__q"
									rows={1}
									dir="auto"
									value={item.q}
									placeholder={c.qa.qHint}
									maxLength={4000}
									onChange={event => update(item.id, { q: event.target.value })}
								/>
							</label>
							<label>
								<span className="lrn-sr">{c.qa.answer}</span>
								<textarea
									className="lrn-qa__a"
									rows={2}
									dir="auto"
									value={item.a}
									placeholder={c.qa.aHint}
									maxLength={4000}
									onChange={event => update(item.id, { a: event.target.value })}
								/>
							</label>
						</div>
						<button
							type="button"
							className="lrn-icon-btn is-danger"
							title={c.qa.remove}
							aria-label={c.qa.remove}
							onClick={() => onChange(items.filter(x => x.id !== item.id))}
						>
							<Trash2 size={15} />
						</button>
					</li>
				))}
			</ol>
			<button type="button" className="lrn-btn lrn-qa__add" onClick={() => onChange([...items, { id: qaId(), q: '', a: '' }])}>
				<Plus size={16} aria-hidden />
				{c.qa.add}
			</button>
		</div>
	);
}

function readDirection() {
	try {
		return normalizeDirection(window.localStorage.getItem(`${EDITOR_STORAGE_KEY}:direction`));
	} catch {
		return 'auto';
	}
}

/** Lecture details that don't need a permanent place on screen: course, position, length, description. */
function LectureInfo({ c, course, position, total, stats, description, onDescription }) {
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState(description || '');
	const root = useRef(null);
	useEffect(() => setDraft(description || ''), [description]);
	useEffect(() => {
		if (!open) return undefined;
		const onDown = event => {
			if (!root.current?.contains(event.target)) setOpen(false);
		};
		const onKey = event => {
			if (event.key === 'Escape') {
				event.stopPropagation();
				setOpen(false);
			}
		};
		document.addEventListener('pointerdown', onDown);
		document.addEventListener('keydown', onKey, true);
		return () => {
			document.removeEventListener('pointerdown', onDown);
			document.removeEventListener('keydown', onKey, true);
		};
	}, [open]);
	const commit = () => {
		if (draft.trim() !== (description || '')) onDescription(draft.trim());
	};
	return (
		<span className="lrn-info" ref={root}>
			<button type="button" className={`lrn-icon-btn${open ? ' is-open' : ''}`} aria-expanded={open} title={c.details} aria-label={c.details} onClick={() => setOpen(v => !v)}>
				<Info size={16} />
			</button>
			{open ? (
				<span className="lrn-info__panel" role="dialog" aria-label={c.details}>
					<span className="lrn-info__course" dir="auto">
						{course?.title}
					</span>
					<span className="lrn-info__meta">
						{position >= 0 ? <span>{c.lectureOf(position + 1, total)}</span> : null}
						{stats ? <span>{c.readingTime(stats.words, stats.readMins)}</span> : null}
					</span>
					<label className="lrn-info__field">
						<span>{c.fields.description}</span>
						<textarea
							rows={3}
							dir="auto"
							maxLength={2000}
							value={draft}
							placeholder={c.fields.descriptionHint}
							onChange={event => setDraft(event.target.value)}
							onBlur={commit}
						/>
					</label>
				</span>
			) : null}
		</span>
	);
}

/**
 * One lecture, laid out for reading: a single slim header (back, title, details, done / revision,
 * prev / next, search, focus), one row of section tabs that also carries the editor's tools, and
 * the content taking everything else. Scrolling down tucks the header away; focus mode leaves
 * only the text and a thin reading-progress line (Esc, the corner button or the top edge bring
 * the controls back). Loads the full lecture on open; every edit is saved by itself.
 */
export default function LearnLecture({ c, lectureId, course, lectures, initialSection = 'content', onOpenLecture, onSummary, onSectionChange, focus = false, onToggleFocus, onBack, onSearch }) {
	const tDoc = useTranslations('documentEditor');
	const editorLabels = useDocumentEditorLabels();
	const [lecture, setLecture] = useState(null);
	const [loadState, setLoadState] = useState('loading');
	const [section, setSection] = useState(SECTIONS.includes(initialSection) ? initialSection : 'content');
	const [titleDraft, setTitleDraft] = useState('');
	const [stats, setStats] = useState(null);
	const [direction] = useState(readDirection);
	const onSummaryRef = useRef(onSummary);
	onSummaryRef.current = onSummary;
	const rootRef = useRef(null);
	const lastScroll = useRef(0);

	const saver = useLectureSaver(lectureId, data => onSummaryRef.current?.(data));

	const load = useCallback(async () => {
		setLoadState('loading');
		try {
			const { data } = await api.get(`/learn/lectures/${lectureId}`);
			setLecture(data);
			setTitleDraft(data.title || '');
			setLoadState('ready');
		} catch {
			setLoadState('error');
		}
	}, [lectureId]);

	useEffect(() => {
		void load();
	}, [load]);

	useEffect(() => {
		onSectionChange?.(section);
	}, [section, onSectionChange]);

	// Focus mode: Esc leaves it; the pointer at the top edge brings the controls back for a moment.
	useEffect(() => {
		if (!focus) return undefined;
		const root = rootRef.current;
		const onKey = event => {
			if (event.key === 'Escape' && !event.defaultPrevented && !document.querySelector('.sd-typo-panel, .lrn-scrim')) onToggleFocus?.();
		};
		const onMove = event => {
			if (!root) return;
			const top = root.getBoundingClientRect().top;
			if (event.clientY - top < 14) root.classList.add('is-peek');
			else if (event.clientY - top > 140) root.classList.remove('is-peek');
		};
		document.addEventListener('keydown', onKey);
		document.addEventListener('mousemove', onMove);
		return () => {
			document.removeEventListener('keydown', onKey);
			document.removeEventListener('mousemove', onMove);
			root?.classList.remove('is-peek');
		};
	}, [focus, onToggleFocus]);

	// Header tuck-away and reading progress, straight on the DOM so scrolling never re-renders the editor.
	const onBodyScroll = useCallback(event => {
		const el = event.target;
		const root = rootRef.current;
		if (!root || !(el instanceof HTMLElement) || el.scrollHeight <= el.clientHeight) return;
		const y = el.scrollTop;
		const max = el.scrollHeight - el.clientHeight;
		root.style.setProperty('--read', String(max > 0 ? Math.min(1, y / max) : 0));
		const dy = y - lastScroll.current;
		lastScroll.current = y;
		if (y < 48) root.classList.remove('is-head-hidden');
		else if (dy > 6) root.classList.add('is-head-hidden');
		else if (dy < -6) root.classList.remove('is-head-hidden');
	}, []);

	const patchLocal = useCallback(
		(fields, options) => {
			setLecture(current => (current ? { ...current, ...fields } : current));
			saver.save(fields, options);
			// The list row follows at once (done, revision, title…), not after the round trip.
			if ('done' in fields || 'needsRevision' in fields || 'title' in fields || 'description' in fields) {
				onSummaryRef.current?.({ id: lectureId, ...fields });
			}
		},
		[lectureId, saver],
	);

	const position = useMemo(() => lectures.findIndex(l => l.id === lectureId), [lectures, lectureId]);
	const prev = position > 0 ? lectures[position - 1] : null;
	const next = position >= 0 && position < lectures.length - 1 ? lectures[position + 1] : null;

	if (loadState !== 'ready' || !lecture) {
		return (
			<div className="lrn-lecture is-loading">
				{loadState === 'error' ? (
					<div className="lrn-empty">
						<AlertTriangle size={22} aria-hidden />
						<p>{c.loadFailed}</p>
						<button type="button" className="lrn-btn" onClick={() => void load()}>
							{c.tryAgain}
						</button>
					</div>
				) : (
					<div className="lrn-empty">
						<Loader2 size={22} className="animate-spin" aria-hidden />
					</div>
				)}
			</div>
		);
	}

	const commitTitle = () => {
		const value = titleDraft.trim();
		if (!value) {
			setTitleDraft(lecture.title);
			return;
		}
		if (value !== lecture.title) patchLocal({ title: value }, { immediate: true });
	};

	const tabs = (
		<nav className="lrn-tabs" role="tablist" aria-label={c.sectionsLabel}>
			{SECTIONS.map(key => {
				const Icon = SECTION_ICONS[key];
				const filled = key === 'qa' ? lecture.qa?.length > 0 : String(lecture[key] || '').trim().length > 0;
				return (
					<button
						key={key}
						type="button"
						role="tab"
						aria-selected={section === key}
						className={`lrn-tab${section === key ? ' is-on' : ''}`}
						title={c.sections[key]}
						onClick={() => setSection(key)}
					>
						<Icon size={15} aria-hidden />
						<span className="lrn-tab__label">{c.sections[key]}</span>
						{filled ? <span className="lrn-tab__dot" aria-hidden /> : null}
					</button>
				);
			})}
		</nav>
	);

	return (
		<div ref={rootRef} className={`lrn-lecture${focus ? ' is-focus' : ''}`} data-color={course?.color || 'green'}>
			<span className="lrn-readbar" aria-hidden />
			{focus ? (
				<button type="button" className="lrn-focus-exit" onClick={onToggleFocus} title={c.exitFocus} aria-label={c.exitFocus}>
					<Minimize2 size={16} aria-hidden />
				</button>
			) : null}

			<header className="lrn-lhead">
				<button type="button" className="lrn-icon-btn" onClick={onBack} title={c.back} aria-label={c.back}>
					<ArrowLeft size={18} className="lrn-flip-rtl" />
				</button>
				<input
					className="lrn-lhead__title"
					value={titleDraft}
					dir="auto"
					maxLength={160}
					aria-label={c.fields.title}
					onChange={event => setTitleDraft(event.target.value)}
					onBlur={commitTitle}
					onKeyDown={event => {
						if (event.key === 'Enter') event.currentTarget.blur();
						if (event.key === 'Escape') {
							event.preventDefault();
							setTitleDraft(lecture.title);
							event.currentTarget.blur();
						}
					}}
				/>
				<LectureInfo
					c={c}
					course={course}
					position={position}
					total={lectures.length}
					stats={section === 'content' ? stats : null}
					description={lecture.description}
					onDescription={value => patchLocal({ description: value }, { immediate: true })}
				/>
				<SaveState state={saver.state} c={c} onRetry={saver.retry} />

				<span className="lrn-lhead__end">
					<button
						type="button"
						className={`lrn-toggle is-done${lecture.done ? ' is-on' : ''}`}
						aria-pressed={lecture.done}
						title={lecture.done ? c.markedDone : c.markDone}
						onClick={() => patchLocal({ done: !lecture.done }, { immediate: true })}
					>
						{lecture.done ? <CheckCircle2 size={16} aria-hidden /> : <Circle size={16} aria-hidden />}
						<span className="lrn-toggle__label">{lecture.done ? c.markedDone : c.markDone}</span>
					</button>
					<button
						type="button"
						className={`lrn-icon-btn lrn-rev-btn${lecture.needsRevision ? ' is-on' : ''}`}
						aria-pressed={lecture.needsRevision}
						title={lecture.needsRevision ? c.needsRevision : c.markRevision}
						aria-label={lecture.needsRevision ? c.needsRevision : c.markRevision}
						onClick={() => patchLocal({ needsRevision: !lecture.needsRevision }, { immediate: true })}
					>
						<BookmarkCheck size={17} />
					</button>
					<span className="lrn-lhead__sep" aria-hidden />
					<button type="button" className="lrn-icon-btn" disabled={!prev} title={c.prev} aria-label={c.prev} onClick={() => prev && onOpenLecture(prev.id, section)}>
						<ChevronLeft size={18} className="lrn-flip-rtl" />
					</button>
					<button type="button" className="lrn-icon-btn" disabled={!next} title={c.next} aria-label={c.next} onClick={() => next && onOpenLecture(next.id, section)}>
						<ChevronRight size={18} className="lrn-flip-rtl" />
					</button>
					<span className="lrn-lhead__sep" aria-hidden />
					<button type="button" className="lrn-icon-btn" title={c.searchPlaceholder} aria-label={c.searchPlaceholder} onClick={onSearch}>
						<Search size={17} />
					</button>
					<button type="button" className={`lrn-icon-btn${focus ? ' is-open' : ''}`} aria-pressed={focus} title={focus ? c.exitFocus : c.focus} aria-label={focus ? c.exitFocus : c.focus} onClick={onToggleFocus}>
						{focus ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
					</button>
				</span>
			</header>

			{section === 'content' ? null : <div className="lrn-lbar">{tabs}</div>}

			<div className={`lrn-lecture__body is-${section}`} onScrollCapture={onBodyScroll}>
				{section === 'content' ? (
					<div className="lrn-doc">
						<SmartDocumentEditor
							key={lecture.id}
							doc={{ id: lecture.id, title: lecture.title, content: lecture.content || '' }}
							onDocChange={content => {
								setLecture(current => (current ? { ...current, content } : current));
								saver.save({ content }, { immediate: true });
							}}
							showHistory={false}
							showShare={false}
							compactChrome
							toolbarStart={tabs}
							onStats={setStats}
							// Opening a lecture is for reading: formatted view when there is something to read.
							initialMode={String(lecture.content || '').trim() ? 'preview' : 'edit'}
							storageKey={EDITOR_STORAGE_KEY}
							placeholder={tDoc.raw('placeholder')}
							labels={{ ...editorLabels, badge: course?.title || c.title }}
						/>
					</div>
				) : section === 'qa' ? (
					<div className="lrn-sec-scroll">
						<QaSection items={lecture.qa || []} c={c} onChange={qa => patchLocal({ qa })} />
					</div>
				) : (
					<div className="lrn-sec-scroll">
						<SectionEditor
							key={`${lecture.id}:${section}`}
							value={lecture[section]}
							direction={direction}
							placeholder={c.sectionHints[section]}
							onChange={value => patchLocal({ [section]: value })}
							onBlur={() => void saver.flush().catch(() => undefined)}
						/>
					</div>
				)}
			</div>
		</div>
	);
}
