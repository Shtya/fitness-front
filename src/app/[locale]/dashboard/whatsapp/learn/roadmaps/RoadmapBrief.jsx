'use client';

import { useEffect, useMemo, useState } from 'react';
import { Award, Check, Clock3, ExternalLink, FlaskConical, HardDrive, MemoryStick, Route, X } from 'lucide-react';
import { courseProgress, explainedCount, journeyMonths, levelProgress, roadmapProgress, topicKey } from './roadmap-model';
import './roadmap-brief.css';

function Station({ course, index, progress, colorIndex, active, onOpen, rc }) {
	const p = courseProgress(course, progress);
	const complete = p.total > 0 && p.done === p.total;
	return (
		<li className={`rb-stop${complete ? ' is-complete' : ''}${active ? ' is-active' : ''}${course.added_by_index ? ' is-added' : ''}`}>
			<button
				type="button"
				className="rb-stop__btn"
				onClick={onOpen}
				aria-label={`${course.title_ar || course.title}: ${rc.topicsDone(p.done, p.total)}`}
			>
				<span className={`rb-stop__dot is-c${colorIndex}`} style={{ '--p': p.percent }} aria-hidden>
					{complete ? <Check size={13} strokeWidth={3} /> : <span>{index + 1}</span>}
				</span>
				<span className="rb-stop__body">
					<span className="rb-stop__title" dir="auto">
						{course.title_ar || course.title}
					</span>
					{course.title_ar && course.title !== course.title_ar ? (
						<span className="rb-stop__en" dir="ltr">
							{course.title}
						</span>
					) : null}
					<span className="rb-stop__topics" aria-hidden>
						{course.topics.map(topic => (
							<span
								key={topic}
								className={`rb-pip${progress[topicKey(course.id, topic)] ? ' is-done' : ''}`}
								title={course.topic_benefits?.[topic] ? `${topic}
${course.topic_benefits[topic]}` : topic}
							/>
						))}
					</span>
					<span className="rb-stop__meta">
						{course.added_by_index ? <span className="rb-stop__added">{rc.addedByIndex}</span> : null}
						<span>{rc.topicsDone(p.done, p.total)}</span>
						{course.level ? <span>{rc.level[course.level] || course.level}</span> : null}
					</span>
				</span>
			</button>
		</li>
	);
}

/**
 * The roadmap at a glance, as a trip: a ticket with the whole journey in numbers, a metro map
 * where every level is a coloured line and every course a station (one pip per topic, lit when
 * done), and the plan and resources in a compact strip. A station opens everything about it.
 */
export default function RoadmapBrief({ data, progress, rc, renderCourse }) {
	const [openId, setOpenId] = useState(null);
	const levels = data.levels || [];
	const total = roadmapProgress(data, progress);
	const months = journeyMonths(data.recommended_timeline);
	const courses = levels.reduce((n, l) => n + (l.courses?.length || 0), 0);
	const daily = data.recommended_study_schedule?.daily_hours;
	const explained = explainedCount(data);
	const hasAdded = levels.some(l => (l.courses || []).some(c => c.added_by_index));
	const first = levels[0];
	const last = levels[levels.length - 1];

	const open = useMemo(() => {
		for (const [li, level] of levels.entries()) {
			const course = (level.courses || []).find(c => c.id === openId);
			if (course) return { level, course, li };
		}
		return null;
	}, [levels, openId]);

	useEffect(() => {
		if (!openId) return undefined;
		const onKey = event => {
			if (event.key === 'Escape') setOpenId(null);
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [openId]);

	const schedule = data.recommended_study_schedule?.study_distribution || [];
	const scheduleHours = schedule.reduce((n, item) => n + (item.hours || 0), 0) || 1;

	return (
		<div className="rb">
			{/* the ticket */}
			<section className="rb-ticket" aria-label={rc.brief}>
				<div className="rb-ticket__route">
					<div className="rb-ticket__end">
						<span className="rb-label">{rc.from}</span>
						<span className="rb-ticket__place" dir="auto">
							{first?.title_ar || first?.title}
						</span>
					</div>
					<span className="rb-ticket__line" aria-hidden>
						<Route size={18} />
					</span>
					<div className="rb-ticket__end is-to">
						<span className="rb-label">{rc.to}</span>
						<span className="rb-ticket__place" dir="auto">
							{last?.title_ar || last?.title}
						</span>
					</div>
				</div>
				<dl className="rb-ticket__facts">
					{months ? (
						<div>
							<dt>{rc.duration}</dt>
							<dd>{rc.monthsN(months)}</dd>
						</div>
					) : null}
					{daily ? (
						<div>
							<dt>{rc.perDay}</dt>
							<dd>{rc.hoursShort(daily)}</dd>
						</div>
					) : null}
					<div>
						<dt>{rc.lines}</dt>
						<dd>{levels.length}</dd>
					</div>
					<div>
						<dt>{rc.stations}</dt>
						<dd>{courses}</dd>
					</div>
					<div>
						<dt>{rc.topicsLabel}</dt>
						<dd>{total.total}</dd>
					</div>
					{explained ? (
						<div>
							<dt>{rc.explained}</dt>
							<dd>{explained}</dd>
						</div>
					) : null}
					<div className="is-progress">
						<dt>{rc.travelled}</dt>
						<dd>{total.percent}%</dd>
					</div>
				</dl>
				{data.target_role?.length ? (
					<div className="rb-ticket__dest">
						<span className="rb-label">{rc.destination}</span>
						<span className="rb-ticket__roles">
							{data.target_role.map(role => (
								<span key={role} dir="auto">
									{role}
								</span>
							))}
						</span>
					</div>
				) : null}
				<span className="rb-ticket__stub" aria-hidden>
					<span style={{ height: `${total.percent}%`, '--stub': `${total.percent}%` }} />
				</span>
			</section>

			{/* the metro map */}
			<section className="rb-map" aria-label={rc.map}>
				<p className="rb-hint">
					{rc.mapHint}
					{hasAdded ? <span className="rb-hint__added">{rc.legendAdded}</span> : null}
				</p>
				<ol className="rb-lines">
					{levels.map((level, li) => {
						const lp = levelProgress(level, progress);
						return (
							<li key={level.id} className={`rb-line is-c${li % 7}`}>
								<header className="rb-line__head">
									<span className={`rb-line__badge is-c${li % 7}`}>{li + 1}</span>
									<span className="rb-line__titles">
										<span className="rb-line__title" dir="auto">
											{level.title_ar || level.title}
										</span>
										<span className="rb-line__meta">
											{level.priority ? <span className={`rm-priority is-${level.priority}`}>{rc.priority[level.priority] || level.priority}</span> : null}
											<span>{lp.percent}%</span>
										</span>
									</span>
								</header>
								<ol className="rb-stops">
									{(level.courses || []).map((course, ci) => (
										<Station
											key={course.id}
											course={course}
											index={ci}
											progress={progress}
											colorIndex={li % 7}
											active={openId === course.id}
											rc={rc}
											onOpen={() => setOpenId(course.id)}
										/>
									))}
								</ol>
							</li>
						);
					})}
				</ol>
			</section>

			{/* plan + resources, compact */}
			<section className="rb-strip">
				{schedule.length ? (
					<div className="rb-tile is-day">
						<h3>
							<Clock3 size={16} aria-hidden />
							{rc.yourDay}
						</h3>
						<div className="rb-day" aria-hidden>
							{schedule.map((item, i) => (
								<span key={i} className={`rb-day__part is-${i % 4}`} style={{ flexGrow: item.hours || 1 }}>
									{item.hours ? rc.hoursShort(item.hours) : ''}
								</span>
							))}
						</div>
						<ul className="rb-day__legend">
							{schedule.map((item, i) => (
								<li key={i}>
									<span className={`rm-dot is-${i % 4}`} aria-hidden />
									<span dir="auto">{item.activity_ar || item.activity}</span>
									<span className="rb-muted">{Math.round(((item.hours || 0) / scheduleHours) * 100)}%</span>
								</li>
							))}
						</ul>
					</div>
				) : null}

				{data.recommended_timeline?.length ? (
					<div className="rb-tile is-time">
						<h3>
							<Route size={16} aria-hidden />
							{rc.timeline}
						</h3>
						<ol className="rb-months">
							{data.recommended_timeline.map((item, i) => (
								<li key={i}>
									<span className="rb-months__period" dir="auto">
										{item.period}
									</span>
									<span className="rb-months__focus" dir="auto">
										{item.focus}
									</span>
								</li>
							))}
						</ol>
					</div>
				) : null}

				{data.certifications?.length ? (
					<div className="rb-tile">
						<h3>
							<Award size={16} aria-hidden />
							{rc.toEarn}
						</h3>
						<ul className="rb-badges">
							{data.certifications.map(cert => (
								<li key={cert.name}>
									<a href={cert.url || undefined} target="_blank" rel="noopener noreferrer" className="rb-badge" title={cert.purpose}>
										<Award size={18} aria-hidden />
										<span dir="auto">{cert.name}</span>
										{cert.level ? <small>{rc.level[cert.level] || cert.level}</small> : null}
									</a>
								</li>
							))}
						</ul>
					</div>
				) : null}

				{data.recommended_labs?.length ? (
					<div className="rb-tile">
						<h3>
							<FlaskConical size={16} aria-hidden />
							{rc.practiceOn}
						</h3>
						<ul className="rb-chips">
							{data.recommended_labs.map(lab => (
								<li key={lab.name}>
									<a href={lab.url || undefined} target="_blank" rel="noopener noreferrer" title={lab.purpose} dir="auto">
										{lab.name}
										<ExternalLink size={12} aria-hidden />
									</a>
								</li>
							))}
						</ul>
					</div>
				) : null}

				{data.lab_environment ? (
					<div className="rb-tile">
						<h3>
							<HardDrive size={16} aria-hidden />
							{rc.yourLab}
						</h3>
						<ul className="rb-specs">
							{data.lab_environment.recommended_ram_gb ? (
								<li>
									<MemoryStick size={15} aria-hidden />
									<b>{data.lab_environment.recommended_ram_gb}</b>
									{data.lab_environment.preferred_ram_gb ? <span className="rb-muted">→ {data.lab_environment.preferred_ram_gb}</span> : null}
									<span className="rb-muted">GB RAM</span>
								</li>
							) : null}
							{data.lab_environment.recommended_storage_gb ? (
								<li>
									<HardDrive size={15} aria-hidden />
									<b>{data.lab_environment.recommended_storage_gb}</b>
									<span className="rb-muted">GB</span>
								</li>
							) : null}
						</ul>
						<ul className="rb-chips">
							{(data.lab_environment.software || []).map(item => (
								<li key={item.name}>
									<a href={item.url || undefined} target="_blank" rel="noopener noreferrer" dir="auto">
										{item.name}
									</a>
								</li>
							))}
						</ul>
					</div>
				) : null}
			</section>

			{/* a station, opened */}
			{open ? (
				<div className="rb-drawer-scrim" role="presentation" onClick={() => setOpenId(null)}>
					<aside className={`rb-drawer is-c${open.li % 7}`} role="dialog" aria-label={open.course.title_ar || open.course.title} onClick={event => event.stopPropagation()}>
						<header className="rb-drawer__head">
							<span className={`rb-line__badge is-c${open.li % 7}`}>{open.li + 1}</span>
							<span className="rb-drawer__line" dir="auto">
								{open.level.title_ar || open.level.title}
							</span>
							<button type="button" className="lrn-icon-btn" onClick={() => setOpenId(null)} aria-label={rc.close} title={rc.close}>
								<X size={18} />
							</button>
						</header>
						<div className="rb-drawer__body">{renderCourse(open.course)}</div>
					</aside>
				</div>
			) : null}
		</div>
	);
}
