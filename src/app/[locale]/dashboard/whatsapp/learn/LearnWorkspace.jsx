'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
	AlertTriangle,
	ArrowLeft,
	BookmarkCheck,
	BookOpen,
	CheckCircle2,
	ChevronRight,
	Circle,
	FileText,
	GraduationCap,
	HelpCircle,
	Library,
	Loader2,
	MoreVertical,
	Pencil,
	Pin,
	PinOff,
	Plus,
	Search,
	Trash2,
	ArrowUp,
	ArrowDown,
	X,
	PlayCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/utils/axios';
import { FONT_VARIABLE_CLASSES } from '@/components/smart-document/typography';
import { useSortable } from '../tickets/tickets-ui';
import LearnLecture from './LearnLecture';
import {
	COPY,
	COURSE_COLORS,
	categoriesOf,
	continueCourse,
	courseStatus,
	filterCourses,
	filterLectures,
	libraryStats,
	moveId,
	progressOf,
} from './learn-model';
import { useLearnLibrary } from './use-learn-library';
import './learn.css';

const VIEW_KEY = 'wa-learn:view';
const FOCUS_KEY = 'wa-learn:focus';

function readStoredView() {
	try {
		const raw = window.sessionStorage.getItem(VIEW_KEY);
		const view = raw ? JSON.parse(raw) : null;
		return view && typeof view.name === 'string' ? view : { name: 'home' };
	} catch {
		return { name: 'home' };
	}
}

/**
 * Progress as a highlighter stroke over a pencil line: the one marked element of the tab.
 * `size` is 'sm' (rows) or 'lg' (the desk header).
 */
function HighlighterBar({ value, size = 'sm' }) {
	return (
		<span className={`lrn-hl is-${size}`} aria-hidden>
			<span className="lrn-hl__ink" style={{ '--hl-w': `${Math.max(0, Math.min(100, value))}%` }} />
		</span>
	);
}

/**
 * A small anchored menu of actions (closes on outside click / Escape / scroll).
 * Fixed to the viewport from its button: the shelf and lecture lists clip their rows (rounded
 * frame), so an absolutely placed menu was cut off at the list edge. Opens upward when there is
 * no room below.
 */
function RowMenu({ c, items }) {
	const [open, setOpen] = useState(false);
	const [place, setPlace] = useState(null); // { top, left, right, up }
	const root = useRef(null);
	const button = useRef(null);
	const list = useRef(null);

	useLayoutEffect(() => {
		if (!open || !button.current) return;
		const b = button.current.getBoundingClientRect();
		const h = list.current?.offsetHeight || 0;
		const up = b.bottom + 4 + h > window.innerHeight - 8 && b.top - 4 - h > 8;
		const rtl = getComputedStyle(button.current).direction === 'rtl';
		setPlace({
			top: up ? b.top - 4 - h : b.bottom + 4,
			// the menu's end edge lines up with the button's end edge
			...(rtl ? { left: Math.max(8, b.left) } : { right: Math.max(8, window.innerWidth - b.right) }),
		});
	}, [open]);

	useEffect(() => {
		if (!open) return undefined;
		const onDown = event => {
			if (!root.current?.contains(event.target)) setOpen(false);
		};
		const onKey = event => {
			if (event.key === 'Escape') setOpen(false);
		};
		const close = () => setOpen(false);
		document.addEventListener('pointerdown', onDown);
		document.addEventListener('keydown', onKey);
		window.addEventListener('scroll', close, true);
		window.addEventListener('resize', close);
		return () => {
			document.removeEventListener('pointerdown', onDown);
			document.removeEventListener('keydown', onKey);
			window.removeEventListener('scroll', close, true);
			window.removeEventListener('resize', close);
		};
	}, [open]);

	useEffect(() => {
		if (!open) setPlace(null);
	}, [open]);
	return (
		<span className="lrn-menu" ref={root}>
			<button
				ref={button}
				type="button"
				className={`lrn-icon-btn${open ? ' is-open' : ''}`}
				aria-haspopup="menu"
				aria-expanded={open}
				title={c.more}
				aria-label={c.more}
				onClick={event => {
					event.stopPropagation();
					setOpen(v => !v);
				}}
			>
				<MoreVertical size={17} />
			</button>
			{open ? (
				<span
					ref={list}
					className="lrn-menu__list"
					role="menu"
					// measured first (hidden), then placed
					style={place ? { top: place.top, left: place.left, right: place.right } : { visibility: 'hidden' }}
				>
					{items.filter(Boolean).map(item => (
						<button
							key={item.label}
							type="button"
							role="menuitem"
							className={item.danger ? 'is-danger' : ''}
							disabled={item.disabled}
							onClick={event => {
								event.stopPropagation();
								setOpen(false);
								item.onSelect();
							}}
						>
							<item.icon size={15} aria-hidden />
							{item.label}
						</button>
					))}
				</span>
			) : null}
		</span>
	);
}

function Modal({ title, onClose, children, footer, c }) {
	useEffect(() => {
		const onKey = event => {
			if (event.key === 'Escape') onClose();
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [onClose]);
	return (
		<div className="lrn-scrim" role="presentation" onClick={onClose}>
			<div className="lrn-modal" role="dialog" aria-modal="true" aria-label={title} onClick={event => event.stopPropagation()}>
				<header className="lrn-modal__head">
					<h3>{title}</h3>
					<button type="button" className="lrn-icon-btn" onClick={onClose} aria-label={c.close} title={c.close}>
						<X size={18} />
					</button>
				</header>
				<div className="lrn-modal__body">{children}</div>
				{footer ? <footer className="lrn-modal__foot">{footer}</footer> : null}
			</div>
		</div>
	);
}

function CourseDialog({ c, initial, categories, onClose, onSubmit }) {
	const [title, setTitle] = useState(initial?.title || '');
	const [description, setDescription] = useState(initial?.description || '');
	const [category, setCategory] = useState(initial?.category || '');
	const [color, setColor] = useState(initial?.color || 'green');
	const [busy, setBusy] = useState(false);
	const submit = async event => {
		event?.preventDefault?.();
		if (!title.trim() || busy) return;
		setBusy(true);
		try {
			await onSubmit({ title: title.trim(), description: description.trim(), category: category.trim(), color });
			onClose();
		} catch {
			toast.error(c.actionFailed);
			setBusy(false);
		}
	};
	return (
		<Modal
			c={c}
			title={initial ? c.editCourse : c.addCourse}
			onClose={onClose}
			footer={
				<>
					<button type="button" className="lrn-btn is-ghost" onClick={onClose}>
						{c.cancel}
					</button>
					<button type="submit" form="lrn-course-form" className="lrn-btn is-primary" disabled={!title.trim() || busy}>
						{busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}
						{initial ? c.save : c.create}
					</button>
				</>
			}
		>
			<form id="lrn-course-form" className="lrn-form" onSubmit={submit}>
				<label className="lrn-field">
					<span>{c.fields.title}</span>
					<input autoFocus dir="auto" maxLength={160} value={title} placeholder={c.fields.courseTitleHint} onChange={event => setTitle(event.target.value)} />
				</label>
				<label className="lrn-field">
					<span>{c.fields.description}</span>
					<textarea dir="auto" rows={3} maxLength={2000} value={description} placeholder={c.fields.descriptionHint} onChange={event => setDescription(event.target.value)} />
				</label>
				<label className="lrn-field">
					<span>{c.fields.category}</span>
					<input dir="auto" maxLength={60} list="lrn-categories" value={category} placeholder={c.fields.categoryHint} onChange={event => setCategory(event.target.value)} />
					<datalist id="lrn-categories">
						{categories.map(name => (
							<option key={name} value={name} />
						))}
					</datalist>
				</label>
				<fieldset className="lrn-field">
					<legend>{c.fields.color}</legend>
					<div className="lrn-swatches">
						{COURSE_COLORS.map(name => (
							<button
								key={name}
								type="button"
								className={`lrn-swatch${color === name ? ' is-on' : ''}`}
								data-color={name}
								aria-pressed={color === name}
								aria-label={name}
								onClick={() => setColor(name)}
							/>
						))}
					</div>
				</fieldset>
			</form>
		</Modal>
	);
}

function LectureDialog({ c, initial, onClose, onSubmit }) {
	const [title, setTitle] = useState(initial?.title || '');
	const [description, setDescription] = useState(initial?.description || '');
	const [busy, setBusy] = useState(false);
	const submit = async event => {
		event?.preventDefault?.();
		if (!title.trim() || busy) return;
		setBusy(true);
		try {
			await onSubmit({ title: title.trim(), description: description.trim() });
			onClose();
		} catch {
			toast.error(c.actionFailed);
			setBusy(false);
		}
	};
	return (
		<Modal
			c={c}
			title={initial ? c.editLecture : c.addLecture}
			onClose={onClose}
			footer={
				<>
					<button type="button" className="lrn-btn is-ghost" onClick={onClose}>
						{c.cancel}
					</button>
					<button type="submit" form="lrn-lecture-form" className="lrn-btn is-primary" disabled={!title.trim() || busy}>
						{busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}
						{initial ? c.save : c.create}
					</button>
				</>
			}
		>
			<form id="lrn-lecture-form" className="lrn-form" onSubmit={submit}>
				<label className="lrn-field">
					<span>{c.fields.title}</span>
					<input autoFocus dir="auto" maxLength={160} value={title} placeholder={c.fields.lectureTitleHint} onChange={event => setTitle(event.target.value)} />
				</label>
				<label className="lrn-field">
					<span>{c.fields.description}</span>
					<textarea dir="auto" rows={3} maxLength={2000} value={description} placeholder={c.fields.descriptionHint} onChange={event => setDescription(event.target.value)} />
				</label>
			</form>
		</Modal>
	);
}

function ConfirmDialog({ c, title, onClose, onConfirm }) {
	const [busy, setBusy] = useState(false);
	return (
		<Modal
			c={c}
			title={title}
			onClose={onClose}
			footer={
				<>
					<button type="button" className="lrn-btn is-ghost" onClick={onClose}>
						{c.cancel}
					</button>
					<button
						type="button"
						className="lrn-btn is-danger"
						disabled={busy}
						onClick={async () => {
							setBusy(true);
							try {
								await onConfirm();
								onClose();
							} catch {
								toast.error(c.actionFailed);
								setBusy(false);
							}
						}}
					>
						{busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Trash2 size={15} aria-hidden />}
						{c.delete}
					</button>
				</>
			}
		>
			<p className="lrn-confirm">{c.confirmHint}</p>
		</Modal>
	);
}

function EmptyState({ icon: Icon, title, text, action }) {
	return (
		<div className="lrn-empty">
			<span className="lrn-empty__icon" aria-hidden>
				<Icon size={26} />
			</span>
			{title ? <h3>{title}</h3> : null}
			{text ? <p>{text}</p> : null}
			{action || null}
		</div>
	);
}

/** One course on the shelf: an index-tab edge in the course colour, its title, and how far you got. */
function CourseRow({ course, c, onOpen, onEdit, onDelete, onPin }) {
	const progress = progressOf(course);
	const status = courseStatus(course);
	return (
		<li className={`lrn-course${status === 'done' ? ' is-complete' : ''}`} data-color={course.color || 'green'}>
			<button type="button" className="lrn-course__open" onClick={onOpen}>
				<span className="lrn-course__main">
					<span className="lrn-course__title" dir="auto">
						{course.pinned ? <Pin size={14} className="lrn-course__pin" aria-label={c.pin} /> : null}
						{course.title}
					</span>
					{course.description ? (
						<span className="lrn-course__desc" dir="auto">
							{course.description}
						</span>
					) : null}
					<span className="lrn-course__meta">
						<span>{course.category || c.uncategorized}</span>
						<span>{c.lecturesCount(course.lectures || 0)}</span>
						{course.revision ? (
							<span className="is-revision">
								<BookmarkCheck size={13} aria-hidden />
								{c.toRevise(course.revision)}
							</span>
						) : null}
					</span>
				</span>
				<span className="lrn-course__progress">
					<span className="lrn-course__pct">{status === 'empty' ? '—' : `${progress}%`}</span>
					<HighlighterBar value={progress} />
				</span>
			</button>
			<RowMenu
				c={c}
				items={[
					{ label: course.pinned ? c.unpin : c.pin, icon: course.pinned ? PinOff : Pin, onSelect: onPin },
					{ label: c.editCourse, icon: Pencil, onSelect: onEdit },
					{ label: c.deleteCourse, icon: Trash2, danger: true, onSelect: onDelete },
				]}
			/>
		</li>
	);
}

function HomeView({ c, library, onOpenCourse, onOpenRevision, onAddCourse, onEditCourse, onDeleteCourse }) {
	const [category, setCategory] = useState('');
	const [status, setStatus] = useState('all');
	const { courses } = library;
	const categories = useMemo(() => categoriesOf(courses), [courses]);
	const stats = useMemo(() => libraryStats(courses), [courses]);
	const shown = useMemo(() => filterCourses(courses, { category, status }), [courses, category, status]);
	const resume = useMemo(() => continueCourse(courses), [courses]);

	if (!courses.length) {
		return (
			<EmptyState
				icon={GraduationCap}
				title={c.emptyLibraryTitle}
				text={c.emptyLibraryText}
				action={
					<button type="button" className="lrn-btn is-primary" onClick={onAddCourse}>
						<Plus size={16} aria-hidden />
						{c.addCourse}
					</button>
				}
			/>
		);
	}

	return (
		<div className="lrn-home">
			<section className="lrn-desk" aria-label={c.library}>
				<h2 className="lrn-desk__line">{c.deskLine(stats.done, stats.lectures)}</h2>
				<HighlighterBar value={stats.progress} size="lg" />
				<p className="lrn-desk__meta">
					<span>{c.libraryLine(stats.courses, stats.completed)}</span>
					{stats.revision ? (
						<button type="button" className="lrn-link is-revision" onClick={onOpenRevision}>
							<BookmarkCheck size={14} aria-hidden />
							{c.toRevise(stats.revision)}
						</button>
					) : null}
				</p>
			</section>

			{resume ? (
				<button type="button" className="lrn-resume" data-color={resume.color || 'green'} onClick={() => onOpenCourse(resume.id)}>
					<PlayCircle size={22} className="lrn-resume__icon" aria-hidden />
					<span className="lrn-resume__text">
						<span className="lrn-resume__label">{c.continue}</span>
						<span className="lrn-resume__title" dir="auto">
							{resume.title}
						</span>
					</span>
					<span className="lrn-resume__sub">{c.doneOf(resume.done || 0, resume.lectures || 0)}</span>
				</button>
			) : null}

			<div className="lrn-filters">
				<div className="lrn-pills" role="group" aria-label={c.fields.category}>
					<button type="button" className={`lrn-pill${!category ? ' is-on' : ''}`} aria-pressed={!category} onClick={() => setCategory('')}>
						{c.allCategories}
					</button>
					{categories.map(name => (
						<button
							key={name}
							type="button"
							className={`lrn-pill${category === name ? ' is-on' : ''}`}
							aria-pressed={category === name}
							onClick={() => setCategory(current => (current === name ? '' : name))}
						>
							{name}
						</button>
					))}
				</div>
				<div className="lrn-seg" role="group">
					{['all', 'new', 'progress', 'done'].map(key => (
						<button key={key} type="button" className={status === key ? 'is-on' : ''} aria-pressed={status === key} onClick={() => setStatus(key)}>
							{c.status[key]}
						</button>
					))}
				</div>
			</div>

			{shown.length ? (
				<ul className="lrn-shelf">
					{shown.map(course => (
						<CourseRow
							key={course.id}
							course={course}
							c={c}
							onOpen={() => onOpenCourse(course.id)}
							onEdit={() => onEditCourse(course)}
							onDelete={() => onDeleteCourse(course)}
							onPin={() => void library.updateCourse(course.id, { pinned: !course.pinned }).catch(() => toast.error(c.actionFailed))}
						/>
					))}
				</ul>
			) : (
				<p className="lrn-muted">{c.emptyFiltered}</p>
			)}
		</div>
	);
}

function LectureRow({ lecture, index, c, onOpen, onToggleDone, onEdit, onDelete, onMove, canUp, canDown, dragging, onPointerDown }) {
	return (
		<li
			data-flip={lecture.id}
			className={`lrn-row${lecture.done ? ' is-done' : ''}${dragging ? ' is-dragging' : ''}`}
			onPointerDown={event => onPointerDown(event, lecture.id)}
			title={c.dragHint}
		>
			<button
				type="button"
				className={`lrn-row__check${lecture.done ? ' is-on' : ''}`}
				aria-pressed={lecture.done}
				aria-label={lecture.done ? c.markedDone : c.markDone}
				title={lecture.done ? c.markedDone : c.markDone}
				onClick={onToggleDone}
			>
				{lecture.done ? <CheckCircle2 size={22} /> : <Circle size={22} />}
			</button>
			<button type="button" className="lrn-row__open" onClick={onOpen}>
				<span className="lrn-row__no">{index + 1}</span>
				<span className="lrn-row__text">
					<span className="lrn-row__title" dir="auto">
						<span className="lrn-mark">{lecture.title}</span>
					</span>
					{lecture.description ? (
						<span className="lrn-row__desc" dir="auto">
							{lecture.description}
						</span>
					) : null}
					<span className="lrn-row__tags">
						{lecture.hasContent ? (
							<span className="lrn-tag">
								<FileText size={12} aria-hidden />
								{c.hasContent}
							</span>
						) : null}
						{lecture.qaCount ? (
							<span className="lrn-tag">
								<HelpCircle size={12} aria-hidden />
								{c.qaCount(lecture.qaCount)}
							</span>
						) : null}
						{lecture.needsRevision ? (
							<span className="lrn-tag is-revision">
								<BookmarkCheck size={12} aria-hidden />
								{c.needsRevision}
							</span>
						) : null}
					</span>
				</span>
				<ChevronRight size={18} className="lrn-row__go lrn-flip-rtl" aria-hidden />
			</button>
			<RowMenu
				c={c}
				items={[
					{ label: c.moveUp, icon: ArrowUp, disabled: !canUp, onSelect: () => onMove(-1) },
					{ label: c.moveDown, icon: ArrowDown, disabled: !canDown, onSelect: () => onMove(1) },
					{ label: c.editLecture, icon: Pencil, onSelect: onEdit },
					{ label: c.deleteLecture, icon: Trash2, danger: true, onSelect: onDelete },
				]}
			/>
		</li>
	);
}

function CourseView({ c, ar, course, library, onOpenLecture, onEditCourse, onDeleteCourse }) {
	const [filter, setFilter] = useState('all');
	const [loadState, setLoadState] = useState(library.lectures[course.id] ? 'ready' : 'loading');
	const [dialog, setDialog] = useState(null); // { kind: 'add' | 'edit' | 'delete', lecture }
	const listRef = useRef(null);
	const lectures = library.lectures[course.id] || [];
	const shown = filterLectures(lectures, filter);
	const progress = progressOf(course);
	const { loadLectures } = library;

	useEffect(() => {
		let alive = true;
		loadLectures(course.id)
			.then(() => alive && setLoadState('ready'))
			.catch(() => alive && setLoadState(current => (current === 'ready' ? current : 'error')));
		return () => {
			alive = false;
		};
	}, [course.id, loadLectures]);

	const ids = useMemo(() => shown.map(l => l.id), [shown]);
	const sortable = useSortable({
		containerRef: listRef,
		ids,
		isPinned: () => false,
		onCommit: next => void library.reorderLectures(course.id, filter === 'all' ? next : mergeShown(lectures, next)).catch(() => toast.error(c.actionFailed)),
		axis: 'y',
		rtl: ar,
		enabled: true,
		floatClass: 'lrn-float',
	});
	const byId = new Map(shown.map(l => [l.id, l]));
	const ordered = sortable.order.map(id => byId.get(id)).filter(Boolean);

	const toggleDone = lecture => {
		library.applyLectureSummary(course.id, { id: lecture.id, done: !lecture.done });
		api.patch(`/learn/lectures/${lecture.id}`, { done: !lecture.done }).catch(() => {
			library.applyLectureSummary(course.id, { id: lecture.id, done: lecture.done });
			toast.error(c.actionFailed);
		});
	};

	return (
		<div className="lrn-coursepage" data-color={course.color || 'green'}>
			<header className="lrn-hero">
				<p className="lrn-hero__category">{course.category || c.uncategorized}</p>
				<h2 dir="auto">{course.title}</h2>
				{course.description ? <p className="lrn-hero__desc" dir="auto">{course.description}</p> : null}
				<div className="lrn-hero__progress">
					<HighlighterBar value={progress} size="lg" />
					<span>
						<b>{progress}%</b> {c.doneOf(course.done || 0, course.lectures || 0)}
					</span>
				</div>
				<div className="lrn-hero__actions">
					<button type="button" className="lrn-btn is-primary" onClick={() => setDialog({ kind: 'add' })}>
						<Plus size={16} aria-hidden />
						{c.addLecture}
					</button>
					<RowMenu
						c={c}
						items={[
							{ label: c.editCourse, icon: Pencil, onSelect: onEditCourse },
							{ label: c.deleteCourse, icon: Trash2, danger: true, onSelect: onDeleteCourse },
						]}
					/>
				</div>
			</header>

			{lectures.length ? (
				<div className="lrn-seg lrn-course__filter" role="group">
					{['all', 'todo', 'done', 'revision'].map(key => (
						<button key={key} type="button" className={filter === key ? 'is-on' : ''} aria-pressed={filter === key} onClick={() => setFilter(key)}>
							{c.lectureFilter[key]}
							<span className="lrn-seg__n">{filterLectures(lectures, key).length}</span>
						</button>
					))}
				</div>
			) : null}

			{loadState === 'loading' && !lectures.length ? (
				<div className="lrn-empty">
					<Loader2 size={22} className="animate-spin" aria-hidden />
				</div>
			) : loadState === 'error' && !lectures.length ? (
				<EmptyState icon={AlertTriangle} text={c.loadFailed} />
			) : !lectures.length ? (
				<EmptyState
					icon={BookOpen}
					title={c.emptyCourseTitle}
					text={c.emptyCourseText}
					action={
						<button type="button" className="lrn-btn is-primary" onClick={() => setDialog({ kind: 'add' })}>
							<Plus size={16} aria-hidden />
							{c.addLecture}
						</button>
					}
				/>
			) : !shown.length ? (
				<p className="lrn-muted">{c.emptyLectures}</p>
			) : (
				<ol className="lrn-rows" ref={listRef}>
					{ordered.map(lecture => {
						const at = lectures.findIndex(l => l.id === lecture.id);
						const pos = ids.indexOf(lecture.id);
						return (
							<LectureRow
								key={lecture.id}
								lecture={lecture}
								index={at}
								c={c}
								dragging={sortable.dragId === lecture.id}
								onPointerDown={sortable.onPointerDown}
								onOpen={() => onOpenLecture(lecture.id)}
								onToggleDone={() => toggleDone(lecture)}
								onEdit={() => setDialog({ kind: 'edit', lecture })}
								onDelete={() => setDialog({ kind: 'delete', lecture })}
								canUp={pos > 0}
								canDown={pos < ids.length - 1}
								onMove={delta => {
									const next = moveId(ids, lecture.id, delta);
									if (next) void library.reorderLectures(course.id, filter === 'all' ? next : mergeShown(lectures, next)).catch(() => toast.error(c.actionFailed));
								}}
							/>
						);
					})}
				</ol>
			)}

			{dialog?.kind === 'add' ? (
				<LectureDialog
					c={c}
					onClose={() => setDialog(null)}
					onSubmit={async fields => {
						const created = await library.createLecture(course.id, fields);
						onOpenLecture(created.id);
					}}
				/>
			) : null}
			{dialog?.kind === 'edit' ? (
				<LectureDialog
					c={c}
					initial={dialog.lecture}
					onClose={() => setDialog(null)}
					onSubmit={async fields => {
						const { data } = await api.patch(`/learn/lectures/${dialog.lecture.id}`, fields);
						library.applyLectureSummary(course.id, data);
					}}
				/>
			) : null}
			{dialog?.kind === 'delete' ? (
				<ConfirmDialog
					c={c}
					title={c.confirmDeleteLecture(dialog.lecture.title)}
					onClose={() => setDialog(null)}
					onConfirm={() => library.removeLecture(course.id, dialog.lecture.id)}
				/>
			) : null}
		</div>
	);
}

/** A reorder inside a filtered list: the shown lectures move, the hidden ones keep their slots. */
function mergeShown(all, shownOrder) {
	const shownSet = new Set(shownOrder);
	let next = 0;
	return all.map(l => (shownSet.has(l.id) ? shownOrder[next++] : l.id));
}

function RevisionView({ c, onOpenLecture }) {
	const [state, setState] = useState({ status: 'loading', lectures: [] });
	const load = useCallback(async () => {
		setState(current => ({ ...current, status: 'loading' }));
		try {
			const { data } = await api.get('/learn/revision');
			setState({ status: 'ready', lectures: Array.isArray(data?.lectures) ? data.lectures : [] });
		} catch {
			setState(current => ({ ...current, status: 'error' }));
		}
	}, []);
	useEffect(() => {
		void load();
	}, [load]);

	if (state.status === 'loading' && !state.lectures.length) {
		return (
			<div className="lrn-empty">
				<Loader2 size={22} className="animate-spin" aria-hidden />
			</div>
		);
	}
	if (state.status === 'error') {
		return (
			<EmptyState
				icon={AlertTriangle}
				text={c.loadFailed}
				action={
					<button type="button" className="lrn-btn" onClick={() => void load()}>
						{c.tryAgain}
					</button>
				}
			/>
		);
	}
	if (!state.lectures.length) return <EmptyState icon={BookmarkCheck} title={c.emptyRevisionTitle} text={c.emptyRevisionText} />;
	return (
		<div className="lrn-revision">
			<h2 className="lrn-h2">
				<BookmarkCheck size={20} aria-hidden />
				{c.revision}
				<span className="lrn-count">{state.lectures.length}</span>
			</h2>
			<ul className="lrn-results">
				{state.lectures.map(lecture => (
					<li key={lecture.id}>
						<button type="button" className="lrn-result" onClick={() => onOpenLecture(lecture.courseId, lecture.id)}>
							<span className="lrn-result__title" dir="auto">
								{lecture.title}
							</span>
							<span className="lrn-result__sub" dir="auto">
								{lecture.courseTitle}
								{lecture.qaCount ? ` · ${c.qaCount(lecture.qaCount)}` : ''}
							</span>
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}

function SearchResults({ c, query, onOpenCourse, onOpenLecture }) {
	const [state, setState] = useState({ status: 'idle', courses: [], lectures: [] });
	const q = query.trim();
	useEffect(() => {
		if (q.length < 2) {
			setState({ status: 'idle', courses: [], lectures: [] });
			return undefined;
		}
		let alive = true;
		setState(current => ({ ...current, status: 'loading' }));
		const timer = window.setTimeout(async () => {
			try {
				const { data } = await api.get('/learn/search', { params: { q } });
				if (alive) setState({ status: 'ready', courses: data?.courses || [], lectures: data?.lectures || [] });
			} catch {
				if (alive) setState({ status: 'error', courses: [], lectures: [] });
			}
		}, 280);
		return () => {
			alive = false;
			window.clearTimeout(timer);
		};
	}, [q]);

	if (q.length < 2) return <p className="lrn-muted">{c.searchHint}</p>;
	if (state.status === 'loading' && !state.courses.length && !state.lectures.length) {
		return (
			<p className="lrn-muted">
				<Loader2 size={15} className="animate-spin" aria-hidden /> {c.searching}
			</p>
		);
	}
	if (state.status === 'error') return <p className="lrn-muted">{c.loadFailed}</p>;
	if (!state.courses.length && !state.lectures.length) return <EmptyState icon={Search} text={c.noResults} />;
	return (
		<div className="lrn-search-results">
			{state.courses.length ? (
				<section>
					<h3 className="lrn-h3">{c.resultsCourses}</h3>
					<ul className="lrn-results">
						{state.courses.map(course => (
							<li key={course.id}>
								<button type="button" className="lrn-result" data-color={course.color || 'green'} onClick={() => onOpenCourse(course.id)}>
									<span className="lrn-result__title" dir="auto">
										{course.title}
									</span>
									<span className="lrn-result__sub" dir="auto">
										{course.category || c.uncategorized}
									</span>
								</button>
							</li>
						))}
					</ul>
				</section>
			) : null}
			{state.lectures.length ? (
				<section>
					<h3 className="lrn-h3">{c.resultsLectures}</h3>
					<ul className="lrn-results">
						{state.lectures.map(lecture => (
							<li key={lecture.id}>
								<button type="button" className="lrn-result" onClick={() => onOpenLecture(lecture.courseId, lecture.id, lecture.field)}>
									<span className="lrn-result__title" dir="auto">
										{lecture.title}
									</span>
									<span className="lrn-result__sub" dir="auto">
										{c.inCourse(lecture.courseTitle)}
										{lecture.field && lecture.field !== 'title' ? <span className="lrn-tag">{c.field[lecture.field] || lecture.field}</span> : null}
									</span>
									{lecture.snippet ? (
										<span className="lrn-result__snippet" dir="auto">
											<Highlight text={lecture.snippet} query={q} />
										</span>
									) : null}
								</button>
							</li>
						))}
					</ul>
				</section>
			) : null}
		</div>
	);
}

function Highlight({ text, query }) {
	const at = text.toLowerCase().indexOf(query.toLowerCase());
	if (at < 0) return text;
	return (
		<>
			{text.slice(0, at)}
			<mark>{text.slice(at, at + query.length)}</mark>
			{text.slice(at + query.length)}
		</>
	);
}

/**
 * Learn tab: a personal library of courses → lectures → content and study notes.
 * Desktop: courses sidebar + main pane. Phone: one screen at a time with a back button.
 */
export default function LearnWorkspace({ locale = 'en', onExit }) {
	const ar = String(locale).startsWith('ar');
	const c = COPY[ar ? 'ar' : 'en'];
	const library = useLearnLibrary();
	const [view, setViewState] = useState({ name: 'home' });
	const [query, setQuery] = useState('');
	const [dialog, setDialog] = useState(null); // { kind: 'course-add' | 'course-edit' | 'course-delete', course }
	// Focus mode: a lecture alone on the page — no shelf, no top bar.
	const [focus, setFocus] = useState(false);
	const searchRef = useRef(null);

	useEffect(() => {
		setViewState(readStoredView());
		try {
			setFocus(window.localStorage.getItem(FOCUS_KEY) === '1');
		} catch {
			/* starts without focus mode */
		}
	}, []);
	const toggleFocus = useCallback(() => {
		setFocus(current => {
			const next = !current;
			try {
				window.localStorage.setItem(FOCUS_KEY, next ? '1' : '0');
			} catch {
				/* applies to this visit only */
			}
			return next;
		});
	}, []);
	const setView = useCallback(next => {
		setViewState(next);
		try {
			window.sessionStorage.setItem(VIEW_KEY, JSON.stringify(next));
		} catch {
			/* the view still changes for this visit */
		}
	}, []);

	const coursesById = useMemo(() => new Map(library.courses.map(course => [course.id, course])), [library.courses]);
	const course = view.courseId ? coursesById.get(view.courseId) : null;
	const categories = useMemo(() => categoriesOf(library.courses), [library.courses]);
	const stats = useMemo(() => libraryStats(library.courses), [library.courses]);
	const searching = query.trim().length > 0;

	// A course that was deleted (or never loaded) cannot stay open.
	useEffect(() => {
		if (library.status === 'ready' && view.courseId && !coursesById.has(view.courseId)) setView({ name: 'home' });
	}, [library.status, view.courseId, coursesById, setView]);

	const openCourse = id => {
		setQuery('');
		setView({ name: 'course', courseId: id });
	};
	const openLecture = (courseId, lectureId, section) => {
		setQuery('');
		library.touchCourse(courseId);
		setView({ name: 'lecture', courseId, lectureId, section: section && section !== 'title' && section !== 'description' ? section : 'content' });
	};
	// From inside a lecture: back to the library with the search field ready.
	const openSearch = () => {
		setView({ name: 'home' });
		window.requestAnimationFrame(() => searchRef.current?.focus());
	};
	const goBack = () => {
		if (searching) return setQuery('');
		if (view.name === 'lecture') return setView({ name: 'course', courseId: view.courseId });
		if (view.name === 'course' || view.name === 'revision') return setView({ name: 'home' });
		return onExit?.();
	};

	const lectureSection = useCallback(
		section => {
			setViewState(current => {
				if (current.name !== 'lecture' || current.section === section) return current;
				const next = { ...current, section };
				try {
					window.sessionStorage.setItem(VIEW_KEY, JSON.stringify(next));
				} catch {
					/* ignore */
				}
				return next;
			});
		},
		[],
	);

	const crumbs = [];
	if (!searching && course) crumbs.push({ label: course.title, onClick: view.name === 'lecture' ? () => openCourse(course.id) : null });

	let main;
	if (library.status === 'loading' && !library.courses.length) {
		main = (
			<div className="lrn-empty">
				<Loader2 size={24} className="animate-spin" aria-hidden />
			</div>
		);
	} else if (library.status === 'error' && !library.courses.length) {
		main = (
			<EmptyState
				icon={AlertTriangle}
				text={c.loadFailed}
				action={
					<button type="button" className="lrn-btn" onClick={() => void library.reload()}>
						{c.tryAgain}
					</button>
				}
			/>
		);
	} else if (searching) {
		main = <SearchResults c={c} query={query} onOpenCourse={openCourse} onOpenLecture={openLecture} />;
	} else if (view.name === 'revision') {
		main = <RevisionView c={c} onOpenLecture={openLecture} />;
	} else if (view.name === 'lecture' && course) {
		main = (
			<LearnLecture
				key={view.lectureId}
				c={c}
				lectureId={view.lectureId}
				course={course}
				lectures={library.lectures[course.id] || []}
				initialSection={view.section}
				onSectionChange={lectureSection}
				focus={focus}
				onToggleFocus={toggleFocus}
				onBack={() => setView({ name: 'course', courseId: course.id })}
				onSearch={openSearch}
				onOpenLecture={(id, section) => openLecture(course.id, id, section)}
				onSummary={summary => library.applyLectureSummary(course.id, summary)}
			/>
		);
	} else if (view.name === 'course' && course) {
		main = (
			<CourseView
				key={course.id}
				c={c}
				ar={ar}
				course={course}
				library={library}
				onOpenLecture={id => openLecture(course.id, id)}
				onEditCourse={() => setDialog({ kind: 'course-edit', course })}
				onDeleteCourse={() => setDialog({ kind: 'course-delete', course })}
			/>
		);
	} else {
		main = (
			<HomeView
				c={c}
				library={library}
				onOpenCourse={openCourse}
				onOpenRevision={() => setView({ name: 'revision' })}
				onAddCourse={() => setDialog({ kind: 'course-add' })}
				onEditCourse={item => setDialog({ kind: 'course-edit', course: item })}
				onDeleteCourse={item => setDialog({ kind: 'course-delete', course: item })}
			/>
		);
	}

	// The lecture loads its own data; make sure its course's lecture list is there for prev/next.
	const { loadLectures } = library;
	const lectureCourseId = view.name === 'lecture' ? view.courseId : null;
	const lecturesLoaded = Boolean(lectureCourseId && library.lectures[lectureCourseId]);
	useEffect(() => {
		if (lectureCourseId && !lecturesLoaded) void loadLectures(lectureCourseId).catch(() => undefined);
	}, [lectureCourseId, lecturesLoaded, loadLectures]);

	const sidebarCourses = useMemo(() => filterCourses(library.courses), [library.courses]);
	const atRoot = !searching && view.name === 'home';

	return (
		<div
			className={`lrn ${FONT_VARIABLE_CLASSES} is-view-${searching ? 'search' : view.name}${focus && view.name === 'lecture' && !searching ? ' is-focus' : ''}`}
			dir={ar ? 'rtl' : 'ltr'}
		>
			<aside className="lrn-side" aria-label={c.courses}>
				<div className="lrn-side__brand">
					<GraduationCap size={20} className="lrn-side__logo" aria-hidden />
					<p className="lrn-side__title">{c.title}</p>
				</div>
				<nav className="lrn-side__nav">
					<button type="button" className={`lrn-nav${!searching && view.name === 'home' ? ' is-on' : ''}`} onClick={() => { setQuery(''); setView({ name: 'home' }); }}>
						<Library size={17} aria-hidden />
						<span>{c.library}</span>
					</button>
					<button type="button" className={`lrn-nav${!searching && view.name === 'revision' ? ' is-on' : ''}`} onClick={() => { setQuery(''); setView({ name: 'revision' }); }}>
						<BookmarkCheck size={17} aria-hidden />
						<span>{c.revision}</span>
						{stats.revision ? <span className="lrn-count">{stats.revision}</span> : null}
					</button>
				</nav>
				<div className="lrn-side__head">
					<span>{c.courses}</span>
					<button type="button" className="lrn-icon-btn" title={c.addCourse} aria-label={c.addCourse} onClick={() => setDialog({ kind: 'course-add' })}>
						<Plus size={17} />
					</button>
				</div>
				<ul className="lrn-side__list">
					{sidebarCourses.map(item => (
						<li key={item.id}>
							<button
								type="button"
								data-color={item.color || 'green'}
								className={`lrn-side__course${!searching && view.courseId === item.id ? ' is-on' : ''}`}
								onClick={() => openCourse(item.id)}
							>
								<span className="lrn-side__course-title" dir="auto">
									{item.title}
								</span>
								<span className="lrn-side__course-n">{item.lectures ? `${progressOf(item)}%` : ''}</span>
							</button>
						</li>
					))}
				</ul>
			</aside>

			<section className="lrn-main">
				<header className="lrn-top">
					<button type="button" className={`lrn-icon-btn lrn-top__back${atRoot ? ' is-root' : ''}`} onClick={goBack} title={atRoot ? c.exit : c.back} aria-label={atRoot ? c.exit : c.back}>
						<ArrowLeft size={19} className="lrn-flip-rtl" />
					</button>
					<div className="lrn-top__title">
						<h1>
							{searching ? c.title : view.name === 'revision' ? c.revision : crumbs.length ? (
								<>
									{crumbs.map(crumb =>
										crumb.onClick ? (
											<button key={crumb.label} type="button" className="lrn-crumb" onClick={crumb.onClick} dir="auto">
												{crumb.label}
											</button>
										) : (
											<span key={crumb.label} dir="auto">
												{crumb.label}
											</span>
										),
									)}
								</>
							) : (
								c.title
							)}
						</h1>
						{atRoot ? <p>{c.subtitle}</p> : null}
					</div>
					<label className="lrn-search">
						<Search size={16} aria-hidden />
						<input
							ref={searchRef}
							type="search"
							value={query}
							dir="auto"
							placeholder={c.searchPlaceholder}
							aria-label={c.searchPlaceholder}
							onChange={event => setQuery(event.target.value)}
							onKeyDown={event => {
								if (event.key === 'Escape') setQuery('');
							}}
						/>
						{query ? (
							<button type="button" className="lrn-search__clear" onClick={() => { setQuery(''); searchRef.current?.focus(); }} aria-label={c.clearSearch} title={c.clearSearch}>
								<X size={15} />
							</button>
						) : null}
					</label>
					{atRoot && library.courses.length ? (
						<button type="button" className="lrn-btn is-primary lrn-top__add" onClick={() => setDialog({ kind: 'course-add' })}>
							<Plus size={16} aria-hidden />
							<span>{c.addCourse}</span>
						</button>
					) : null}
				</header>
				<div className={`lrn-scroll${view.name === 'lecture' && !searching ? ' is-lecture' : ''}`}>{main}</div>
			</section>

			{dialog?.kind === 'course-add' ? (
				<CourseDialog
					c={c}
					categories={categories}
					onClose={() => setDialog(null)}
					onSubmit={async fields => {
						const created = await library.createCourse(fields);
						openCourse(created.id);
					}}
				/>
			) : null}
			{dialog?.kind === 'course-edit' ? (
				<CourseDialog c={c} initial={dialog.course} categories={categories} onClose={() => setDialog(null)} onSubmit={fields => library.updateCourse(dialog.course.id, fields)} />
			) : null}
			{dialog?.kind === 'course-delete' ? (
				<ConfirmDialog
					c={c}
					title={c.confirmDeleteCourse(dialog.course.title)}
					onClose={() => setDialog(null)}
					onConfirm={async () => {
						await library.removeCourse(dialog.course.id);
						if (view.courseId === dialog.course.id) setView({ name: 'home' });
					}}
				/>
			) : null}
		</div>
	);
}
