'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	AlertTriangle,
	Award,
	CalendarRange,
	Check,
	CheckCheck,
	ChevronDown,
	Clock3,
	ExternalLink,
	FlaskConical,
	HardDrive,
	Info,
	ListTree,
	Map as MapIcon,
	MemoryStick,
	Pencil,
	PlayCircle,
	Plus,
	ShieldCheck,
	Target,
	Ticket,
	Trash2,
	Upload,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/utils/axios';
import { ConfirmDialog, EmptyState, HighlighterBar, Modal, RowMenu } from '../learn-ui';
import RoadmapBrief from './RoadmapBrief';
import preset from './presets/cybersecurity-ethical-hacking.json';
import presetIndex from './presets/cybersecurity-topics-index.json';
import { ROADMAP_COPY, courseProgress, levelProgress, nextCourse, precheckRoadmapJson, precheckTopicsIndex, roadmapProgress, topicKey } from './roadmap-model';
import './roadmaps.css';

// The bundled roadmap is added together with its topics index (one file, merged on the server).
const PRESET_JSON = JSON.stringify({ ...preset, ...presetIndex }, null, 2);
const PRESET_TITLE = preset.roadmap.title;
const INDEX_PRESET_JSON = JSON.stringify(presetIndex, null, 2);
const INDEX_PRESET_FOR = preset.roadmap.title;

export function roadmapCopy(ar) {
	return ROADMAP_COPY[ar ? 'ar' : 'en'];
}

/** Paste / load / pick the bundled roadmap, see whether it parses, then add or save. */
function RoadmapJsonDialog({ c, rc, initialJson = '', editing = false, onClose, onSubmit }) {
	const [text, setText] = useState(initialJson);
	const [busy, setBusy] = useState(false);
	const [serverError, setServerError] = useState('');
	const fileRef = useRef(null);
	const check = useMemo(() => (text.trim() ? precheckRoadmapJson(text) : null), [text]);

	const submit = async () => {
		if (!check?.ok || busy) return;
		setBusy(true);
		setServerError('');
		try {
			await onSubmit(text);
			onClose();
		} catch (error) {
			const message = error?.response?.data?.message;
			setServerError(Array.isArray(message) ? message.join(' · ') : message || rc.failed);
			setBusy(false);
		}
	};

	return (
		<Modal
			c={c}
			title={editing ? rc.editJson : rc.addRoadmap}
			onClose={onClose}
			footer={
				<>
					<button type="button" className="lrn-btn is-ghost" onClick={onClose}>
						{c.cancel}
					</button>
					<button type="button" className="lrn-btn is-primary" disabled={!check?.ok || busy} onClick={() => void submit()}>
						{editing ? rc.saveChanges : rc.add}
					</button>
				</>
			}
		>
			<div className="rm-json">
				{!editing ? (
					<button type="button" className="rm-preset" onClick={() => setText(PRESET_JSON)}>
						<MapIcon size={18} aria-hidden />
						<span>
							<span className="rm-preset__label">{rc.presetTitle}</span>
							<span className="rm-preset__title" dir="ltr">
								{PRESET_TITLE}
							</span>
						</span>
						<span className="rm-preset__cta">{rc.usePreset}</span>
					</button>
				) : null}
				<label className="lrn-field">
					<span>{rc.jsonLabel}</span>
					<textarea
						className="rm-json__input"
						dir="ltr"
						spellCheck={false}
						rows={12}
						value={text}
						placeholder='{ "roadmap": { "title": "…", "levels": [ … ] } }'
						onChange={event => {
							setText(event.target.value);
							setServerError('');
						}}
					/>
				</label>
				<div className="rm-json__bar">
					<button type="button" className="lrn-btn is-ghost" onClick={() => fileRef.current?.click()}>
						<Upload size={15} aria-hidden />
						{rc.loadFile}
					</button>
					<input
						ref={fileRef}
						type="file"
						accept="application/json,.json"
						hidden
						onChange={async event => {
							const file = event.target.files?.[0];
							event.target.value = '';
							if (file) setText(await file.text());
						}}
					/>
					{check ? (
						<span className={`rm-json__status${check.ok ? ' is-ok' : ' is-error'}`} role="status">
							{check.ok ? <Check size={14} aria-hidden /> : <AlertTriangle size={14} aria-hidden />}
							{check.ok ? rc.looksGood(check.levels, check.courses, check.topics) : check.indexOnly ? rc.indexOnly : check.error}
						</span>
					) : (
						<span className="rm-json__status">{rc.jsonHint}</span>
					)}
				</div>
				{serverError ? (
					<p className="rm-json__error" role="alert">
						<AlertTriangle size={14} aria-hidden /> {serverError}
					</p>
				) : null}
			</div>
		</Modal>
	);
}

/** Learn → Roadmaps: every roadmap with its progress. */
export function RoadmapsList({ c, ar, onOpen }) {
	const rc = roadmapCopy(ar);
	const [state, setState] = useState({ status: 'loading', roadmaps: [] });
	const [dialog, setDialog] = useState(null); // { kind: 'add' | 'edit' | 'delete', roadmap }

	const load = useCallback(async () => {
		try {
			const { data } = await api.get('/learn/roadmaps');
			setState({ status: 'ready', roadmaps: Array.isArray(data?.roadmaps) ? data.roadmaps : [] });
		} catch {
			setState(current => ({ ...current, status: current.roadmaps.length ? 'ready' : 'error' }));
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const addButton = (
		<button type="button" className="lrn-btn is-primary" onClick={() => setDialog({ kind: 'add' })}>
			<Plus size={16} aria-hidden />
			{rc.addRoadmap}
		</button>
	);

	let body;
	if (state.status === 'loading') body = <div className="lrn-empty" />;
	else if (state.status === 'error')
		body = (
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
	else if (!state.roadmaps.length) body = <EmptyState icon={MapIcon} title={rc.empty} text={rc.emptyText} action={addButton} />;
	else
		body = (
			<ul className="rm-list">
				{state.roadmaps.map(roadmap => {
					const percent = roadmap.topics ? Math.round((roadmap.done / roadmap.topics) * 100) : 0;
					return (
						<li key={roadmap.id} className="rm-card">
							<button type="button" className="rm-card__open" onClick={() => onOpen(roadmap.id)}>
								<span className="rm-card__icon" aria-hidden>
									<MapIcon size={20} />
								</span>
								<span className="rm-card__main">
									<span className="rm-card__title" dir="auto">
										{roadmap.title}
									</span>
									{roadmap.description ? (
										<span className="rm-card__desc" dir="auto">
											{roadmap.description}
										</span>
									) : null}
									<span className="rm-card__meta">
										<span>{rc.levelsCount(roadmap.levels)}</span>
										<span>{rc.coursesCount(roadmap.courses)}</span>
										<span>{rc.topicsDone(roadmap.done, roadmap.topics)}</span>
									</span>
								</span>
								<span className="rm-card__progress">
									<span className="rm-card__pct">{percent}%</span>
									<HighlighterBar value={percent} />
								</span>
							</button>
							<RowMenu
								c={c}
								items={[
									{
										label: rc.editJson,
										icon: Pencil,
										onSelect: async () => {
											try {
												const { data } = await api.get(`/learn/roadmaps/${roadmap.id}`);
												setDialog({ kind: 'edit', roadmap, json: JSON.stringify({ roadmap: data.data }, null, 2) });
											} catch {
												toast.error(rc.loadFailed);
											}
										},
									},
									{ label: rc.deleteRoadmap, icon: Trash2, danger: true, onSelect: () => setDialog({ kind: 'delete', roadmap }) },
								]}
							/>
						</li>
					);
				})}
			</ul>
		);

	return (
		<div className="rm-page">
			<header className="rm-head">
				<div>
					<h2 className="rm-head__title">{rc.roadmaps}</h2>
					<p className="rm-head__sub">{rc.subtitle}</p>
				</div>
				{state.roadmaps.length ? addButton : null}
			</header>
			{body}
			{dialog?.kind === 'add' ? (
				<RoadmapJsonDialog
					c={c}
					rc={rc}
					onClose={() => setDialog(null)}
					onSubmit={async json => {
						const { data } = await api.post('/learn/roadmaps', { json });
						await load();
						onOpen(data.id);
					}}
				/>
			) : null}
			{dialog?.kind === 'edit' ? (
				<RoadmapJsonDialog
					c={c}
					rc={rc}
					editing
					initialJson={dialog.json}
					onClose={() => setDialog(null)}
					onSubmit={async json => {
						await api.put(`/learn/roadmaps/${dialog.roadmap.id}`, { json });
						await load();
					}}
				/>
			) : null}
			{dialog?.kind === 'delete' ? (
				<ConfirmDialog
					c={{ ...c, confirmHint: rc.confirmHint }}
					title={rc.confirmDelete(dialog.roadmap.title)}
					onClose={() => setDialog(null)}
					onConfirm={async () => {
						await api.delete(`/learn/roadmaps/${dialog.roadmap.id}`);
						await load();
					}}
				/>
			) : null}
		</div>
	);
}

/** Paste / load / pick the bundled topics index for this roadmap, see what it adds, then import. */
function TopicsIndexDialog({ c, rc, data, onClose, onSubmit }) {
	const [text, setText] = useState('');
	const [busy, setBusy] = useState(false);
	const [serverError, setServerError] = useState('');
	const fileRef = useRef(null);
	const check = useMemo(() => (text.trim() ? precheckTopicsIndex(text, data) : null), [text, data]);
	const presetFits = INDEX_PRESET_FOR === String(data?.title || '').trim();

	const submit = async () => {
		if (!check?.ok || busy) return;
		setBusy(true);
		setServerError('');
		try {
			await onSubmit(text);
			onClose();
		} catch (error) {
			const message = error?.response?.data?.message;
			setServerError(Array.isArray(message) ? message.join(' · ') : message || rc.failed);
			setBusy(false);
		}
	};

	return (
		<Modal
			c={c}
			title={rc.importIndex}
			onClose={onClose}
			footer={
				<>
					<button type="button" className="lrn-btn is-ghost" onClick={onClose}>
						{c.cancel}
					</button>
					<button type="button" className="lrn-btn is-primary" disabled={!check?.ok || busy} onClick={() => void submit()}>
						{rc.importCta}
					</button>
				</>
			}
		>
			<div className="rm-json">
				{presetFits ? (
					<button type="button" className="rm-preset" onClick={() => setText(INDEX_PRESET_JSON)}>
						<ListTree size={18} aria-hidden />
						<span>
							<span className="rm-preset__label">{rc.presetTitle}</span>
							<span className="rm-preset__title" dir="auto">
								{rc.importIndex}
							</span>
						</span>
						<span className="rm-preset__cta">{rc.usePreset}</span>
					</button>
				) : null}
				<label className="lrn-field">
					<span>{rc.indexLabel}</span>
					<textarea
						className="rm-json__input"
						dir="ltr"
						spellCheck={false}
						rows={12}
						value={text}
						placeholder='{ "roadmap_topics_index": { "levels": [ … ] } }'
						onChange={event => {
							setText(event.target.value);
							setServerError('');
						}}
					/>
				</label>
				<div className="rm-json__bar">
					<button type="button" className="lrn-btn is-ghost" onClick={() => fileRef.current?.click()}>
						<Upload size={15} aria-hidden />
						{rc.loadFile}
					</button>
					<input
						ref={fileRef}
						type="file"
						accept="application/json,.json"
						hidden
						onChange={async event => {
							const file = event.target.files?.[0];
							event.target.value = '';
							if (file) setText(await file.text());
						}}
					/>
					{check ? (
						<span className={`rm-json__status${check.ok ? ' is-ok' : ' is-error'}`} role="status">
							{check.ok ? <Check size={14} aria-hidden /> : <AlertTriangle size={14} aria-hidden />}
							{check.ok ? rc.indexLooksGood(check.courses, check.benefits, check.added.length) : check.error}
						</span>
					) : (
						<span className="rm-json__status">{rc.indexHint}</span>
					)}
				</div>
				{check?.ok && check.added.length ? (
					<div className="rm-json__added">
						<span>{rc.newCourses}</span>
						{check.added.map(name => (
							<span key={name} className="rm-tag is-added" dir="auto">
								{name}
							</span>
						))}
					</div>
				) : null}
				{serverError ? (
					<p className="rm-json__error" role="alert">
						<AlertTriangle size={14} aria-hidden /> {serverError}
					</p>
				) : null}
			</div>
		</Modal>
	);
}

function TopicChip({ label, done, onToggle }) {
	return (
		<li>
			<button type="button" className={`rm-topic${done ? ' is-done' : ''}`} aria-pressed={done} onClick={onToggle}>
				<span className="rm-topic__box" aria-hidden>
					{done ? <Check size={12} strokeWidth={3} /> : null}
				</span>
				<span className="rm-topic__label" dir="auto">
					{label}
				</span>
			</button>
		</li>
	);
}

function CourseBlock({ course, progress, rc, remainingOnly, onToggle, onToggleMany }) {
	const p = courseProgress(course, progress);
	const complete = p.total > 0 && p.done === p.total;
	const topics = remainingOnly ? course.topics.filter(t => !progress[topicKey(course.id, t)]) : course.topics;
	if (remainingOnly && !topics.length) return null;
	const benefits = course.topic_benefits || {};
	const explained = topics.some(t => benefits[t]);
	return (
		<article className={`rm-course${complete ? ' is-complete' : ''}${course.added_by_index ? ' is-added' : ''}`} id={`rm-${course.id}`}>
			<header className="rm-course__head">
				<div className="rm-course__titles">
					<h4 dir="auto">{course.title_ar || course.title}</h4>
					{course.title_ar && course.title !== course.title_ar ? (
						<p className="rm-course__en" dir="ltr">
							{course.title}
						</p>
					) : null}
				</div>
				<div className="rm-course__side">
					{course.added_by_index ? <span className="rm-tag is-added">{rc.addedByIndex}</span> : null}
					{course.level ? <span className="rm-tag">{rc.level[course.level] || course.level}</span> : null}
					<span className="rm-course__count">
						{p.done}/{p.total}
					</span>
				</div>
			</header>
			<HighlighterBar value={p.percent} />
			{explained ? (
				// with a topics index: every topic with what it is good for later
				<ol className="rm-topiclist">
					{topics.map(topic => {
						const key = topicKey(course.id, topic);
						const done = Boolean(progress[key]);
						return (
							<li key={topic}>
								<button type="button" className={`rm-topicrow${done ? ' is-done' : ''}`} aria-pressed={done} onClick={() => onToggle(key, !done)}>
									<span className="rm-topic__box" aria-hidden>
										{done ? <Check size={12} strokeWidth={3} /> : null}
									</span>
									<span className="rm-topicrow__text">
										<span className="rm-topicrow__name" dir="auto">
											{topic}
										</span>
										{benefits[topic] ? (
											<span className="rm-topicrow__why" dir="auto">
												{benefits[topic]}
											</span>
										) : null}
									</span>
								</button>
							</li>
						);
					})}
				</ol>
			) : (
				<ul className="rm-topics">
					{topics.map(topic => (
						<TopicChip key={topic} label={topic} done={Boolean(progress[topicKey(course.id, topic)])} onToggle={() => onToggle(topicKey(course.id, topic), !progress[topicKey(course.id, topic)])} />
					))}
				</ul>
			)}
			{course.expected_outcome || course.practical_result ? (
				<dl className="rm-course__notes">
					{course.expected_outcome ? (
						<div>
							<dt>
								<Target size={14} aria-hidden />
								{rc.expected}
							</dt>
							<dd dir="auto">{course.expected_outcome}</dd>
						</div>
					) : null}
					{course.practical_result ? (
						<div>
							<dt>
								<FlaskConical size={14} aria-hidden />
								{rc.practical}
							</dt>
							<dd dir="auto">{course.practical_result}</dd>
						</div>
					) : null}
				</dl>
			) : null}
			<footer className="rm-course__actions">
				{course.url ? (
					<a className="lrn-btn is-ghost" href={course.url} target="_blank" rel="noopener noreferrer">
						<PlayCircle size={15} aria-hidden />
						{rc.watch}
						<ExternalLink size={13} aria-hidden />
					</a>
				) : null}
				<button
					type="button"
					className="lrn-btn is-ghost"
					onClick={() => onToggleMany(course.topics.map(t => topicKey(course.id, t)), !complete)}
				>
					<CheckCheck size={15} aria-hidden />
					{complete ? rc.unmarkAll : rc.markAll}
				</button>
			</footer>
		</article>
	);
}

/**
 * One roadmap: the path (levels → courses → topics you tick off), the plan (daily schedule and
 * timeline) and the resources (certifications, labs, lab setup). Ticks save one by one, in order.
 */
export function RoadmapView({ c, ar, id, onDeleted }) {
	const rc = roadmapCopy(ar);
	const [roadmap, setRoadmap] = useState(null);
	const [status, setStatus] = useState('loading');
	const [section, setSection] = useState('brief');
	const [remainingOnly, setRemainingOnly] = useState(false);
	const [collapsed, setCollapsed] = useState(() => new Set());
	const [dialog, setDialog] = useState(null);
	const chain = useRef(Promise.resolve());

	const load = useCallback(async () => {
		try {
			const { data } = await api.get(`/learn/roadmaps/${id}`);
			setRoadmap(data);
			setStatus('ready');
		} catch {
			setStatus('error');
		}
	}, [id]);

	useEffect(() => {
		void load();
	}, [load]);

	// Optimistic ticks, sent one after another so the server's answers never arrive out of order.
	const toggleMany = useCallback(
		(keys, done) => {
			setRoadmap(current => {
				if (!current) return current;
				const progress = { ...current.progress };
				for (const key of keys) {
					if (done) progress[key] = progress[key] || new Date().toISOString();
					else delete progress[key];
				}
				return { ...current, progress };
			});
			chain.current = chain.current
				.catch(() => undefined)
				.then(async () => {
					try {
						await api.patch(`/learn/roadmaps/${id}/topics`, { keys, done });
					} catch {
						toast.error(rc.failed);
						await load();
					}
				});
		},
		[id, load, rc.failed],
	);

	if (status === 'loading') return <div className="lrn-empty" />;
	if (status === 'error' || !roadmap) {
		return (
			<EmptyState
				icon={AlertTriangle}
				text={rc.loadFailed}
				action={
					<button type="button" className="lrn-btn" onClick={() => void load()}>
						{c.tryAgain}
					</button>
				}
			/>
		);
	}

	const data = roadmap.data || {};
	const progress = roadmap.progress || {};
	const total = roadmapProgress(data, progress);
	const next = nextCourse(data, progress);
	// The frame follows the interface language (labels, numbers, layout); the roadmap's own text
	// keeps its direction inside each item (dir=auto). Explicit, because the stylesheet keys sides on it.
	const contentDir = ar ? 'rtl' : 'ltr';
	const policy = Object.entries(data.learning_policy || {}).filter(([, value]) => value);
	const schedule = data.recommended_study_schedule;

	return (
		<div className="rm-page rm-detail" dir={contentDir}>
			<header className="rm-hero">
				<div className="rm-hero__top">
					<h2 className="rm-hero__title" dir="auto">
						{data.title || roadmap.title}
					</h2>
					<RowMenu
						c={c}
						items={[
							{ label: rc.importIndex, icon: ListTree, onSelect: () => setDialog({ kind: 'index' }) },
							{ label: rc.editJson, icon: Pencil, onSelect: () => setDialog({ kind: 'edit' }) },
							{ label: rc.deleteRoadmap, icon: Trash2, danger: true, onSelect: () => setDialog({ kind: 'delete' }) },
						]}
					/>
				</div>
				{data.description ? (
					<p className="rm-hero__desc" dir="auto">
						{data.description}
					</p>
				) : null}
				{data.topics_index_note ? (
					<aside className="rm-note">
						<Info size={16} aria-hidden />
						<span>
							<span className="rm-note__label">{rc.indexNote}</span>
							<span className="rm-note__text" dir="auto">
								{data.topics_index_note}
							</span>
						</span>
					</aside>
				) : null}
				<div className="rm-hero__progress">
					<HighlighterBar value={total.percent} size="lg" />
					<span>
						<b>{total.percent}%</b> {rc.topicsDone(total.done, total.total)}
					</span>
				</div>
				{data.target_role?.length ? (
					<div className="rm-roles">
						<span className="rm-roles__label">{rc.roles}</span>
						{data.target_role.map(role => (
							<span key={role} className="rm-tag" dir="auto">
								{role}
							</span>
						))}
					</div>
				) : null}
				{policy.length ? (
					<ul className="rm-policy">
						{policy.map(([key]) => (
							<li key={key}>
								<ShieldCheck size={14} aria-hidden />
								{rc.policy[key] || key.replace(/_/g, ' ')}
							</li>
						))}
					</ul>
				) : null}
				{next ? (
					<button
						type="button"
						className="rm-next"
						onClick={() => {
							setSection('path');
							setRemainingOnly(false);
							setCollapsed(current => {
								const nextSet = new Set(current);
								nextSet.delete(next.level.id);
								return nextSet;
							});
							window.requestAnimationFrame(() => document.getElementById(`rm-${next.course.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
						}}
					>
						<PlayCircle size={18} aria-hidden />
						<span className="rm-next__label">{rc.continue}</span>
						<span className="rm-next__title" dir="auto">
							{next.course.title_ar || next.course.title}
						</span>
					</button>
				) : total.total ? (
					<p className="rm-next is-done">
						<CheckCheck size={18} aria-hidden /> {rc.allDone}
					</p>
				) : null}
			</header>

			<div className="rm-bar">
				<div className="lrn-seg" role="tablist">
					{[
						['brief', Ticket, rc.brief],
						['path', MapIcon, rc.path],
						['plan', CalendarRange, rc.plan],
						['resources', Award, rc.resources],
					].map(([key, Icon, label]) => (
						<button key={key} type="button" role="tab" aria-selected={section === key} className={section === key ? 'is-on' : ''} onClick={() => setSection(key)}>
							<Icon size={15} aria-hidden />
							{label}
						</button>
					))}
				</div>
				{section === 'path' ? (
					<label className="rm-switch">
						<input type="checkbox" checked={remainingOnly} onChange={event => setRemainingOnly(event.target.checked)} />
						<span>{rc.remainingOnly}</span>
					</label>
				) : null}
			</div>

			{section === 'brief' ? (
				<RoadmapBrief
					data={data}
					progress={progress}
					rc={rc}
					renderCourse={course => (
						<CourseBlock course={course} progress={progress} rc={rc} remainingOnly={false} onToggle={(key, done) => toggleMany([key], done)} onToggleMany={toggleMany} />
					)}
				/>
			) : null}

			{section === 'path' ? (
				<ol className="rm-levels">
					{(data.levels || []).map((level, index) => {
						const lp = levelProgress(level, progress);
						const open = !collapsed.has(level.id);
						const complete = lp.total > 0 && lp.done === lp.total;
						return (
							<li key={level.id} className={`rm-level${complete ? ' is-complete' : ''}${open ? ' is-open' : ''}`}>
								<span className="rm-level__node" aria-hidden style={{ '--p': lp.percent }}>
									{complete ? <Check size={16} strokeWidth={3} /> : index + 1}
								</span>
								<button
									type="button"
									className="rm-level__head"
									aria-expanded={open}
									onClick={() =>
										setCollapsed(current => {
											const nextSet = new Set(current);
											if (nextSet.has(level.id)) nextSet.delete(level.id);
											else nextSet.add(level.id);
											return nextSet;
										})
									}
								>
									<span className="rm-level__titles">
										<span className="rm-level__kicker">
											{rc.levelN(index + 1)}
											{level.priority ? <span className={`rm-priority is-${level.priority}`}>{rc.priority[level.priority] || level.priority}</span> : null}
										</span>
										<span className="rm-level__title" dir="auto">
											{level.title_ar || level.title}
										</span>
										{level.description ? (
											<span className="rm-level__desc" dir="auto">
												{level.description}
											</span>
										) : null}
									</span>
									<span className="rm-level__stats">
										<span>{rc.topicsDone(lp.done, lp.total)}</span>
										<ChevronDown size={18} className="rm-level__chev" aria-hidden />
									</span>
								</button>
								{open ? (
									<div className="rm-level__courses">
										{(level.courses || []).map(course => (
											<CourseBlock
												key={course.id}
												course={course}
												progress={progress}
												rc={rc}
												remainingOnly={remainingOnly}
												onToggle={(key, done) => toggleMany([key], done)}
												onToggleMany={toggleMany}
											/>
										))}
									</div>
								) : null}
							</li>
						);
					})}
				</ol>
			) : null}

			{section === 'plan' ? (
				<div className="rm-grid">
					{schedule?.study_distribution?.length ? (
						<section className="rm-panel">
							<h3>
								<Clock3 size={17} aria-hidden />
								{rc.schedule}
								{schedule.daily_hours ? <span className="rm-panel__aside">{rc.dailyHours(schedule.daily_hours)}</span> : null}
							</h3>
							<div className="rm-split" aria-hidden>
								{schedule.study_distribution.map((item, i) => (
									<span key={i} className={`rm-split__part is-${i % 4}`} style={{ flexGrow: item.hours || 1 }} />
								))}
							</div>
							<ul className="rm-sched">
								{schedule.study_distribution.map((item, i) => (
									<li key={i}>
										<span className={`rm-dot is-${i % 4}`} aria-hidden />
										<span className="rm-sched__name" dir="auto">
											{(ar ? item.activity_ar : item.activity) || item.activity || item.activity_ar}
										</span>
										<span className="rm-sched__hours">{item.hours != null ? rc.hoursShort(item.hours) : ''}</span>
									</li>
								))}
							</ul>
						</section>
					) : null}
					{data.recommended_timeline?.length ? (
						<section className="rm-panel">
							<h3>
								<CalendarRange size={17} aria-hidden />
								{rc.timeline}
							</h3>
							<ol className="rm-timeline">
								{data.recommended_timeline.map((item, i) => (
									<li key={i}>
										<span className="rm-timeline__period" dir="auto">
											{item.period}
										</span>
										<span className="rm-timeline__focus" dir="auto">
											{item.focus}
										</span>
									</li>
								))}
							</ol>
						</section>
					) : null}
				</div>
			) : null}

			{section === 'resources' ? (
				<div className="rm-grid">
					{data.certifications?.length ? (
						<section className="rm-panel">
							<h3>
								<Award size={17} aria-hidden />
								{rc.certifications}
							</h3>
							<ul className="rm-links">
								{data.certifications.map(item => (
									<li key={item.name}>
										<LinkRow name={item.name} url={item.url} note={item.purpose} tag={item.level ? rc.level[item.level] || item.level : ''} />
									</li>
								))}
							</ul>
						</section>
					) : null}
					{data.recommended_labs?.length ? (
						<section className="rm-panel">
							<h3>
								<FlaskConical size={17} aria-hidden />
								{rc.labs}
							</h3>
							<ul className="rm-links">
								{data.recommended_labs.map(item => (
									<li key={item.name}>
										<LinkRow name={item.name} url={item.url} note={item.purpose} />
									</li>
								))}
							</ul>
						</section>
					) : null}
					{data.lab_environment ? (
						<section className="rm-panel">
							<h3>
								<HardDrive size={17} aria-hidden />
								{rc.labEnv}
							</h3>
							<ul className="rm-specs">
								{data.lab_environment.recommended_ram_gb ? (
									<li>
										<MemoryStick size={15} aria-hidden />
										{rc.ram(data.lab_environment.recommended_ram_gb, data.lab_environment.preferred_ram_gb)}
									</li>
								) : null}
								{data.lab_environment.recommended_storage_gb ? (
									<li>
										<HardDrive size={15} aria-hidden />
										{rc.storage(data.lab_environment.recommended_storage_gb)}
									</li>
								) : null}
							</ul>
							<ul className="rm-links">
								{(data.lab_environment.software || []).map(item => (
									<li key={item.name}>
										<LinkRow name={item.name} url={item.url} />
									</li>
								))}
							</ul>
						</section>
					) : null}
				</div>
			) : null}

			{dialog?.kind === 'edit' ? (
				<RoadmapJsonDialog
					c={c}
					rc={rc}
					editing
					initialJson={JSON.stringify({ roadmap: roadmap.data }, null, 2)}
					onClose={() => setDialog(null)}
					onSubmit={async json => {
						const { data: updated } = await api.put(`/learn/roadmaps/${id}`, { json });
						setRoadmap(updated);
					}}
				/>
			) : null}
			{dialog?.kind === 'index' ? (
				<TopicsIndexDialog
					c={c}
					rc={rc}
					data={data}
					onClose={() => setDialog(null)}
					onSubmit={async json => {
						const { data: updated } = await api.post(`/learn/roadmaps/${id}/topics-index`, { json });
						setRoadmap(updated);
					}}
				/>
			) : null}
			{dialog?.kind === 'delete' ? (
				<ConfirmDialog
					c={{ ...c, confirmHint: rc.confirmHint }}
					title={rc.confirmDelete(roadmap.title)}
					onClose={() => setDialog(null)}
					onConfirm={async () => {
						await api.delete(`/learn/roadmaps/${id}`);
						onDeleted?.();
					}}
				/>
			) : null}
		</div>
	);
}

function LinkRow({ name, url, note, tag }) {
	const inner = (
		<>
			<span className="rm-link__name" dir="auto">
				{name}
				{tag ? <span className="rm-tag">{tag}</span> : null}
			</span>
			{note ? (
				<span className="rm-link__note" dir="auto">
					{note}
				</span>
			) : null}
		</>
	);
	return url ? (
		<a className="rm-link" href={url} target="_blank" rel="noopener noreferrer">
			<span className="rm-link__text">{inner}</span>
			<ExternalLink size={14} className="rm-link__go" aria-hidden />
		</a>
	) : (
		<span className="rm-link">
			<span className="rm-link__text">{inner}</span>
		</span>
	);
}

