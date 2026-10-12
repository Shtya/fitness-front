'use client';

import { memo, useEffect, useId, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import './wa-chat-idle.css';

if (typeof window !== 'undefined') gsap.registerPlugin(MotionPathPlugin);

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/*
 * "Relay": a living map of conversations. People sit on an ellipse with you at the
 * bottom; messages travel between them through the centre, and every arrival shows its
 * receipt (✓✓ turning blue). The story is deterministic and always seeked to one page
 * clock, so remounts or style recalculations elsewhere can never restart it.
 */
const SCENE_EPOCH = typeof performance !== 'undefined' ? performance.now() : 0;
let lastUnmountAt = 0;
const elapsed = () => (performance.now() - SCENE_EPOCH) / 1000;

const CENTER = { x: 300, y: 196 };
// Index 0 is "you".
const PEOPLE = [
	{ x: 300, y: 352, r: 25, tone: 0 },
	{ x: 84, y: 250, r: 21, tone: 1 },
	{ x: 168, y: 78, r: 19, tone: 2 },
	{ x: 432, y: 78, r: 19, tone: 3 },
	{ x: 516, y: 250, r: 21, tone: 4 },
];
// [from, to] — twelve messages, then a short quiet beat before the loop.
const SENDS = [
	[0, 2], [3, 0], [1, 4], [0, 3], [4, 0], [2, 1],
	[0, 4], [1, 0], [3, 2], [0, 1], [2, 0], [4, 3],
];
const STEP = 1.75;
const LOOP = SENDS.length * STEP + 1.5;

const routePath = (a, b) => {
	const p = PEOPLE[a];
	const q = PEOPLE[b];
	const mx = (p.x + q.x) / 2;
	const my = (p.y + q.y) / 2;
	// Pull the curve toward the centre so every message passes the chat glyph.
	const cx = mx + (CENTER.x - mx) * 0.72;
	const cy = my + (CENTER.y - my) * 0.72;
	return `M ${p.x} ${p.y} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${q.x} ${q.y}`;
};

const PAIRS = [...new Set(SENDS.map(([a, b]) => [Math.min(a, b), Math.max(a, b)].join('-')))].map(k =>
	k.split('-').map(Number),
);

function buildStory(root) {
	const q = selector => root.querySelector(selector);
	const tl = gsap.timeline({ paused: true, repeat: -1, defaults: { ease: 'power3.out' } });

	// Reset frame
	tl.set(root.querySelectorAll('.wa-relay-msg, .wa-relay-typing, .wa-relay-ticks, .wa-relay-heart, .wa-relay-ripple'), {
		opacity: 0,
	})
		.set(root.querySelectorAll('.wa-relay-trail'), { strokeDashoffset: 100, opacity: 1 })
		.set(root.querySelectorAll('.wa-relay-ticks__read'), { opacity: 0 }, 0);

	SENDS.forEach(([from, to], i) => {
		const t = i * STEP;
		const sender = `[data-person="${from}"]`;
		const recipient = `[data-person="${to}"]`;
		const msg = q(`[data-msg="${i}"]`);
		const trail = q(`[data-trail="${i}"]`);
		const path = q(`[data-route="${i}"]`);

		// Typing…
		tl.fromTo(
			q(`${sender} .wa-relay-typing`),
			{ opacity: 0, scale: 0.4, transformOrigin: '50% 100%' },
			{ opacity: 1, scale: 1, duration: 0.28, ease: 'back.out(2)' },
			t,
		).to(q(`${sender} .wa-relay-typing`), { opacity: 0, scale: 0.6, duration: 0.2, ease: 'power2.in' }, t + 0.66);

		// Sent: the message travels its route, leaving a trail
		tl.to(trail, { strokeDashoffset: 0, duration: 1.05, ease: 'power2.inOut' }, t + 0.7)
			.to(trail, { opacity: 0, duration: 0.6, ease: 'power1.out' }, t + 1.75)
			.set(trail, { strokeDashoffset: 100, opacity: 1 }, t + 2.4)
			.fromTo(
				msg,
				{ opacity: 0, scale: 0.45 },
				{
					opacity: 1,
					scale: 1,
					duration: 0.45,
					ease: 'back.out(1.8)',
					transformOrigin: '50% 50%',
				},
				t + 0.7,
			)
			.to(
				msg,
				{
					motionPath: { path, align: path, alignOrigin: [0.5, 0.5] },
					duration: 1.05,
					ease: 'power2.inOut',
					immediateRender: true,
				},
				t + 0.7,
			)
			.to(msg, { opacity: 0, scale: 0.5, duration: 0.22, ease: 'power2.in' }, t + 1.55);

		// It passes the centre
		tl.fromTo(
			root.querySelectorAll('.wa-relay-core__dot'),
			{ y: 0 },
			{ y: -5, duration: 0.18, stagger: 0.06, yoyo: true, repeat: 1, ease: 'sine.inOut' },
			t + 1.1,
		);

		// Delivered → read
		tl.fromTo(
			q(`${recipient} .wa-relay-ripple`),
			{ opacity: 0.55, scale: 1, transformOrigin: '50% 50%' },
			{ opacity: 0, scale: 2.1, duration: 0.9, ease: 'power2.out', immediateRender: false },
			t + 1.72,
		)
			.fromTo(
				q(`${recipient} .wa-relay-face`),
				{ scale: 1, transformOrigin: '50% 50%' },
				{ keyframes: [{ scale: 1.14, duration: 0.14, ease: 'power2.out' }, { scale: 1, duration: 0.55, ease: 'elastic.out(1, 0.4)' }] },
				t + 1.72,
			)
			.fromTo(
				q(`${recipient} .wa-relay-ticks`),
				{ opacity: 0, x: -4 },
				{ opacity: 1, x: 0, duration: 0.25 },
				t + 1.8,
			)
			.to(q(`${recipient} .wa-relay-ticks__read`), { opacity: 1, duration: 0.25 }, t + 2.3)
			.to(q(`${recipient} .wa-relay-ticks`), { opacity: 0, duration: 0.3 }, t + 3.1)
			.set(q(`${recipient} .wa-relay-ticks__read`), { opacity: 0 }, t + 3.45);

		// Some messages get a reaction
		if (i % 4 === 2) {
			tl.fromTo(
				q(`${recipient} .wa-relay-heart`),
				{ opacity: 0, scale: 0.3, y: 6, transformOrigin: '50% 100%' },
				{ opacity: 1, scale: 1, y: 0, duration: 0.45, ease: 'back.out(3)' },
				t + 2.05,
			).to(q(`${recipient} .wa-relay-heart`), { opacity: 0, y: -14, duration: 0.6, ease: 'power2.in' }, t + 2.95);
		}
	});

	tl.set({}, {}, LOOP);
	return tl;
}

function buildAmbient(root) {
	// One 6s yoyo cycle so it can be seeked to the page clock.
	const ambient = gsap.timeline({ paused: true, repeat: -1, yoyo: true });
	root.querySelectorAll('.wa-relay-person').forEach((person, i) => {
		ambient.to(person, { y: i % 2 ? 5 : -5, duration: 6, ease: 'sine.inOut' }, 0);
	});
	ambient.to(root.querySelector('.wa-relay-core__glow'), { scale: 1.14, opacity: 0.9, duration: 6, ease: 'sine.inOut', transformOrigin: '50% 50%' }, 0);
	return ambient;
}

const Face = () => (
	<g className="wa-relay-face__glyph">
		<circle cx="0" cy="-4.5" r="5.6" />
		<path d="M-9.5 10.5c1.4-5.2 5.1-8 9.5-8s8.1 2.8 9.5 8" />
	</g>
);

/** The animated map. Prop-free and memo-locked: parent re-renders never touch it. */
const RelayScene = memo(
	function RelayScene() {
		const rootRef = useRef(null);
		const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

		useIsoLayoutEffect(() => {
			const root = rootRef.current;
			if (!root) return undefined;
			const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
			const recentlyHere = performance.now() - lastUnmountAt < 1500;
			let story;
			let ambient;

			const ctx = gsap.context(() => {
				story = buildStory(root);
				ambient = buildAmbient(root);
				if (reduce) {
					// A still frame with one message mid-route and a read receipt.
					story.time(STEP * 2 + 1.25).pause();
					return;
				}
				story.totalTime(elapsed()).play();
				ambient.totalTime(elapsed()).play();
				if (!recentlyHere) {
					gsap.from(root.querySelectorAll('.wa-relay-person'), {
						opacity: 0,
						scale: 0.6,
						transformOrigin: '50% 50%',
						duration: 0.8,
						stagger: 0.07,
						ease: 'back.out(1.6)',
					});
					gsap.from(root.querySelectorAll('.wa-relay-route'), { opacity: 0, duration: 1.2, ease: 'power1.out', delay: 0.2 });
					gsap.from(root.querySelector('.wa-relay-core'), {
						opacity: 0,
						scale: 0.7,
						transformOrigin: '50% 50%',
						duration: 0.9,
						ease: 'expo.out',
					});
				}
			}, root);

			let observer;
			if (!reduce && 'IntersectionObserver' in window) {
				observer = new IntersectionObserver(([entry]) => {
					if (entry.isIntersecting) {
						story.totalTime(elapsed()).play();
						ambient.totalTime(elapsed()).play();
					} else {
						story.pause();
						ambient.pause();
					}
				});
				observer.observe(root);
			}

			// The map tilts toward the cursor; people move more than the centre (depth).
			const stage = root.closest('.wa-chat-idle');
			const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
			let cleanupPointer = () => {};
			if (!reduce && fine && stage) {
				const tilt = root.querySelector('.wa-relay-tilt');
				const rx = gsap.quickTo(tilt, 'rotationX', { duration: 1, ease: 'power3.out' });
				const ry = gsap.quickTo(tilt, 'rotationY', { duration: 1, ease: 'power3.out' });
				const px = gsap.quickTo(root.querySelector('.wa-relay-people'), 'x', { duration: 1.2, ease: 'power3.out' });
				const py = gsap.quickTo(root.querySelector('.wa-relay-people'), 'y', { duration: 1.2, ease: 'power3.out' });
				const onMove = event => {
					const box = stage.getBoundingClientRect();
					const nx = ((event.clientX - box.left) / box.width - 0.5) * 2;
					const ny = ((event.clientY - box.top) / box.height - 0.5) * 2;
					rx(-ny * 6);
					ry(nx * 8);
					px(nx * 10);
					py(ny * 7);
				};
				const onLeave = () => {
					rx(0);
					ry(0);
					px(0);
					py(0);
				};
				stage.addEventListener('pointermove', onMove);
				stage.addEventListener('pointerleave', onLeave);
				cleanupPointer = () => {
					stage.removeEventListener('pointermove', onMove);
					stage.removeEventListener('pointerleave', onLeave);
				};
			}

			return () => {
				lastUnmountAt = performance.now();
				observer?.disconnect();
				cleanupPointer();
				ctx.revert();
			};
		}, []);

		const grad = tone => `${uid}-tone${tone}`;

		return (
			<div ref={rootRef} className="wa-relay" aria-hidden="true">
				<span className="wa-relay__wallpaper" />
				<div className="wa-relay-tilt">
					<svg className="wa-relay-svg" viewBox="0 0 600 420" focusable="false">
						<defs>
							{[0, 1, 2, 3, 4].map(tone => (
								<linearGradient key={tone} id={grad(tone)} x1="0" y1="0" x2="1" y2="1">
									<stop offset="0" className={`wa-relay-stop wa-relay-stop--${tone}a`} />
									<stop offset="1" className={`wa-relay-stop wa-relay-stop--${tone}b`} />
								</linearGradient>
							))}
							<radialGradient id={`${uid}-glow`}>
								<stop offset="0" className="wa-relay-stop--glow" />
								<stop offset="1" className="wa-relay-stop--glow-out" />
							</radialGradient>
						</defs>

						{/* Routes: faint dotted lines between the people who talk */}
						<g className="wa-relay-routes">
							{PAIRS.map(([a, b]) => (
								<path key={`${a}-${b}`} className="wa-relay-route" d={routePath(a, b)} />
							))}
						</g>

						{/* Motion paths and their glowing trails, one per message */}
						<g className="wa-relay-trails">
							{SENDS.map(([a, b], i) => (
								<g key={i}>
									<path data-route={i} className="wa-relay-path" d={routePath(a, b)} />
									<path
										data-trail={i}
										className={`wa-relay-trail${a === 0 ? ' is-mine' : ''}`}
										d={routePath(a, b)}
										pathLength="100"
									/>
								</g>
							))}
						</g>

						{/* Centre: the conversation itself */}
						<g className="wa-relay-core" transform={`translate(${CENTER.x} ${CENTER.y})`}>
							<circle className="wa-relay-core__glow" r="74" fill={`url(#${uid}-glow)`} />
							<path
								className="wa-relay-core__bubble"
								d="M0 -30c18.8 0 32 11.6 32 27.5S18.8 25 0 25c-3.6 0-7-.4-10.2-1.2L-24 30l3.4-11.4C-27.3 13.6-32 6.8-32 -2.5-32 -18.4-18.8 -30 0 -30Z"
							/>
							{[-11, 0, 11].map(x => (
								<circle key={x} className="wa-relay-core__dot" cx={x} cy="-2.5" r="3.4" />
							))}
						</g>

						{/* People */}
						<g className="wa-relay-people">
							{PEOPLE.map((p, i) => (
								<g key={i} className={`wa-relay-person${i === 0 ? ' is-me' : ''}`} data-person={i}>
									<g transform={`translate(${p.x} ${p.y})`}>
										<circle className="wa-relay-ripple" r={p.r} />
										<g className="wa-relay-face" style={{ '--r': p.r }}>
											{i === 0 ? <circle className="wa-relay-me-ring" r={p.r + 5} /> : null}
											<circle r={p.r} fill={`url(#${grad(p.tone)})`} className="wa-relay-disc" />
											<g transform={`scale(${p.r / 21})`}>
												<Face />
											</g>
											{i !== 2 ? (
												<circle className="wa-relay-online" cx={p.r * 0.72} cy={p.r * 0.72} r="5" />
											) : null}
										</g>

										{/* typing… */}
										<g transform={`translate(0 ${-p.r - 18})`}>
										<g className="wa-relay-typing">
											<rect x="-17" y="-10" width="34" height="20" rx="10" />
											{[-7, 0, 7].map(x => (
												<circle key={x} className="wa-relay-typing__dot" cx={x} cy="0" r="2.6" />
											))}
										</g>
										</g>

										{/* ✓✓ → blue */}
										<g transform={`translate(${p.r + 8} ${-4})`}>
										<g className="wa-relay-ticks">
											<rect x="-3" y="-8" width="27" height="17" rx="8.5" />
											<g className="wa-relay-ticks__grey">
												<path d="M2 1.2 4.8 4 10.4-2.4" />
												<path d="M8.2 3.4l.6.6L14.4-2.4" />
											</g>
											<g className="wa-relay-ticks__read">
												<path d="M2 1.2 4.8 4 10.4-2.4" />
												<path d="M8.2 3.4l.6.6L14.4-2.4" />
											</g>
										</g>
										</g>

										{/* reaction */}
										<g transform={`translate(${-p.r - 4} ${-p.r + 2})`}>
										<g className="wa-relay-heart">
											<circle r="11" />
											<path d="M0 6.2S-6.2 2.6-6.2-1.8A3.5 3.5 0 0 1 0-3.9a3.5 3.5 0 0 1 6.2 2.1C6.2 2.6 0 6.2 0 6.2Z" />
										</g>
										</g>
									</g>
								</g>
							))}
						</g>

						{/* Messages in flight */}
						<g className="wa-relay-msgs">
							{SENDS.map(([a], i) => (
								<g key={i} data-msg={i} className={`wa-relay-msg${a === 0 ? ' is-mine' : ''}`}>
									<rect x="-23" y="-13" width="46" height="26" rx="13" />
									<rect className="wa-relay-msg__line" x="-14" y="-5" width="28" height="3.6" rx="1.8" />
									<rect className="wa-relay-msg__line" x="-14" y="1.6" width="17" height="3.6" rx="1.8" />
								</g>
							))}
						</g>
					</svg>
				</div>
			</div>
		);
	},
	() => true,
);

function WhatsAppChatIdlePane({ title, hint, unreadLabel, steps }) {
	const stepList = Array.isArray(steps) && steps.length ? steps : [];

	return (
		<div className="wa-chat-idle" role="status" aria-live="polite">
			<div className="wa-chat-idle__stage">
				<RelayScene />

				<section className="wa-chat-idle__copy">
					<h2 className="wa-chat-idle__title">{title}</h2>
					{hint ? <p className="wa-chat-idle__hint">{hint}</p> : null}
					{unreadLabel ? (
						<div className="wa-chat-idle__unread">
							<span className="wa-chat-idle__unread-dot" aria-hidden="true" />
							<span>{unreadLabel}</span>
						</div>
					) : null}
				</section>

				{stepList.length > 0 ? (
					<section className="wa-chat-idle__steps" aria-label="Restoration progress">
						{stepList.map(step => (
							<article key={step.id} className="wa-chat-idle__step">
								<div className="wa-chat-idle__step-icon" aria-hidden="true">
									{step.icon === 'sync' ? (
										<svg viewBox="0 0 32 32" fill="none">
											<path
												d="M25 12a10 10 0 0 0-17.7-3.1L5 11"
												stroke="currentColor"
												strokeWidth="2.3"
												strokeLinecap="round"
											/>
											<path
												d="m4.7 6.8.3 4.7 4.8-.5M7 20a10 10 0 0 0 17.7 3.1L27 21"
												stroke="currentColor"
												strokeWidth="2.3"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
											<path
												d="m27.3 25.2-.3-4.7-4.8.5"
												stroke="currentColor"
												strokeWidth="2.3"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									) : step.icon === 'shield' ? (
										<svg viewBox="0 0 32 32" fill="none">
											<path
												d="M16 4 26 8v7c0 6.2-4.2 10.5-10 13-5.8-2.5-10-6.8-10-13V8l10-4Z"
												stroke="currentColor"
												strokeWidth="2.2"
												strokeLinejoin="round"
											/>
											<path
												d="m11 16 3.2 3.2L21.5 12"
												stroke="currentColor"
												strokeWidth="2.2"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									) : (
										<svg viewBox="0 0 32 32" fill="none">
											<path
												d="m18 3-9 14h7l-2 12 9-15h-7l2-11Z"
												stroke="currentColor"
												strokeWidth="2.3"
												strokeLinejoin="round"
											/>
										</svg>
									)}
								</div>
								<div className="wa-chat-idle__step-title">{step.title}</div>
								<div className="wa-chat-idle__step-desc">{step.desc}</div>
							</article>
						))}
					</section>
				) : null}
			</div>
		</div>
	);
}

export default memo(WhatsAppChatIdlePane);
