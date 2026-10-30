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
function SectionEditor({ value, placeholder, onChange, onBlur }) {
	const [dir] = useState(() => detectDominantDir(value || ''));
	return (
		<div className={`sd-shell sd-shell--md is-ready lrn-sec-shell ${FONT_VARIABLE_CLASSES}`}>
			<div className="lrn-sec-paper">
				<MarkdownVisualEditor markdown={value || ''} onChange={onChange} onBlur={onBlur} placeholder={placeholder} dir={dir} autoFocus={!String(value || '').trim()} />
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

/**
 * One lecture: its content in the Documents editor, the study sections, and its done /
 * revision state. Loads the full lecture on open; every edit is saved by itself.
 */
export default function LearnLecture({ c, lectureId, course, lectures, initialSection = 'content', onOpenLecture, onSummary, onSectionChange, focus = false, onToggleFocus, onBack }) {
	const tDoc = useTranslations('documentEditor');
	const editorLabels = useDocumentEditorLabels();
	const [lecture, setLecture] = useState(null);
	const [loadState, setLoadState] = useState('loading');
	const [section, setSection] = useState(SECTIONS.includes(initialSection) ? initialSection : 'content');
	const [titleDraft, setTitleDraft] = useState('');
	const [descDraft, setDescDraft] = useState('');
	const onSummaryRef = useRef(onSummary);
	onSummaryRef.current = onSummary;

	const saver = useLectureSaver(lectureId, data => onSummaryRef.current?.(data));

	const load = useCallback(async () => {
		setLoadState('loading');
		try {
			const { data } = await api.get(`/learn/lectures/${lectureId}`);
			setLecture(data);
			setTitleDraft(data.title || '');
			setDescDraft(data.description || '');
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
	const commitDescription = () => {
		const value = descDraft.trim();
		if (value !== (lecture.description || '')) patchLocal({ description: value }, { immediate: true });
	};

	return (
		<div className="lrn-lecture" data-color={course?.color || 'green'}>
			<header className="lrn-lecture__head">
				<div className="lrn-lecture__meta">
					{focus ? (
						<button type="button" className="lrn-icon-btn lrn-lecture__back" onClick={onBack} title={c.back} aria-label={c.back}>
							<ArrowLeft size={18} className="lrn-flip-rtl" />
						</button>
					) : null}
					<span className="lrn-lecture__pos">
						{focus && course ? (
							<span className="lrn-lecture__course" dir="auto">
								{course.title}
							</span>
						) : null}
						{position >= 0 ? c.lectureOf(position + 1, lectures.length) : course?.title}
					</span>
					<SaveState state={saver.state} c={c} onRetry={saver.retry} />
					<button
						type="button"
						className={`lrn-focus-btn${focus ? ' is-on' : ''}`}
						aria-pressed={focus}
						onClick={onToggleFocus}
						title={focus ? c.exitFocus : c.focus}
					>
						{focus ? <Minimize2 size={15} aria-hidden /> : <Maximize2 size={15} aria-hidden />}
						<span>{focus ? c.exitFocus : c.focus}</span>
					</button>
				</div>
				<input
					className="lrn-lecture__title"
					value={titleDraft}
					dir="auto"
					maxLength={160}
					aria-label={c.fields.title}
					onChange={event => setTitleDraft(event.target.value)}
					onBlur={commitTitle}
					onKeyDown={event => {
						if (event.key === 'Enter') event.currentTarget.blur();
						if (event.key === 'Escape') {
							setTitleDraft(lecture.title);
							event.currentTarget.blur();
						}
					}}
				/>
				<input
					className="lrn-lecture__desc"
					value={descDraft}
					dir="auto"
					maxLength={2000}
					placeholder={c.fields.descriptionHint}
					aria-label={c.fields.description}
					onChange={event => setDescDraft(event.target.value)}
					onBlur={commitDescription}
					onKeyDown={event => {
						if (event.key === 'Enter') event.currentTarget.blur();
					}}
				/>
				<div className="lrn-lecture__actions">
					<button
						type="button"
						className={`lrn-toggle is-done${lecture.done ? ' is-on' : ''}`}
						aria-pressed={lecture.done}
						onClick={() => patchLocal({ done: !lecture.done }, { immediate: true })}
					>
						{lecture.done ? <CheckCircle2 size={17} aria-hidden /> : <Circle size={17} aria-hidden />}
						{lecture.done ? c.markedDone : c.markDone}
					</button>
					<button
						type="button"
						className={`lrn-toggle is-revision${lecture.needsRevision ? ' is-on' : ''}`}
						aria-pressed={lecture.needsRevision}
						onClick={() => patchLocal({ needsRevision: !lecture.needsRevision }, { immediate: true })}
					>
						<BookmarkCheck size={17} aria-hidden />
						{lecture.needsRevision ? c.needsRevision : c.markRevision}
					</button>
					<span className="lrn-lecture__step">
						<button type="button" className="lrn-icon-btn" disabled={!prev} title={c.prev} aria-label={c.prev} onClick={() => prev && onOpenLecture(prev.id, section)}>
							<ChevronLeft size={18} className="lrn-flip-rtl" />
						</button>
						<button type="button" className="lrn-icon-btn" disabled={!next} title={c.next} aria-label={c.next} onClick={() => next && onOpenLecture(next.id, section)}>
							<ChevronRight size={18} className="lrn-flip-rtl" />
						</button>
					</span>
				</div>
				<nav className="lrn-tabs" role="tablist" aria-label={c.sections.content}>
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
								onClick={() => setSection(key)}
							>
								<Icon size={15} aria-hidden />
								<span>{c.sections[key]}</span>
								{filled ? <span className="lrn-tab__dot" aria-hidden /> : null}
							</button>
						);
					})}
				</nav>
			</header>

			<div className={`lrn-lecture__body is-${section}`}>
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
