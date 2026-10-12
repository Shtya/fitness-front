'use client';

import { memo, useEffect, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import './wa-chat-idle.css';

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/*
 * One clock for the whole page. The scene's timeline is always seeked to this clock, so
 * a remount (list prefetch re-render, coming back from a chat) continues the story where
 * it was instead of restarting it. GSAP writes inline transforms every frame, so style
 * recalculations elsewhere on the page cannot restart it either (CSS animations can).
 */
const SCENE_EPOCH = typeof performance !== 'undefined' ? performance.now() : 0;
let lastUnmountAt = 0;
const elapsed = () => (performance.now() - SCENE_EPOCH) / 1000;

const LOOP = 15;

function buildStory(root) {
	const q = selector => root.querySelector(selector);
	const qa = selector => [...root.querySelectorAll(selector)];
	const card = q('.wa-idle-card');
	const slot = q('.wa-idle-msg--c');
	const field = q('.wa-idle-composer__field');

	// Where the reply starts its flight: the composer field, relative to its final slot.
	const slotBox = slot.getBoundingClientRect();
	const fieldBox = field.getBoundingClientRect();
	const flyX = fieldBox.left + fieldBox.width / 2 - (slotBox.left + slotBox.width / 2);
	const flyY = fieldBox.top + fieldBox.height / 2 - (slotBox.top + slotBox.height / 2);

	const tl = gsap.timeline({ paused: true, repeat: -1, defaults: { ease: 'power3.out' } });

	// Reset frame
	tl.set(qa('.wa-idle-msg, .wa-idle-msg__reaction, .wa-idle-burst span, .wa-idle-ripple'), {
		opacity: 0,
	})
		.set(qa('.wa-idle-tick'), { strokeDashoffset: 14 })
		.set(q('.wa-idle-ticks__read'), { opacity: 0 })
		.set(q('.wa-idle-composer__draft'), { scaleX: 0 })
		.set(q('.wa-idle-head__typing'), { opacity: 0, y: 4 })
		.set(q('.wa-idle-head__status'), { opacity: 1, y: 0 })
		.set(q('.wa-idle-chip__progress'), { clipPath: 'inset(0 100% 0 0)' })
		.set(q('.wa-idle-card__sheen'), { xPercent: -60, opacity: 0 }, 0);

	// 1. They are typing (header status turns into green dots)
	tl.to(q('.wa-idle-head__status'), { opacity: 0, y: -4, duration: 0.3 }, 0.4)
		.to(q('.wa-idle-head__typing'), { opacity: 1, y: 0, duration: 0.3 }, 0.5)
		.to(q('.wa-idle-head__typing'), { opacity: 0, y: -4, duration: 0.25 }, 2.5)
		.to(q('.wa-idle-head__status'), { opacity: 1, y: 0, duration: 0.3 }, 2.6);

	// 2. Two messages arrive, each with a soft ripple
	const arrive = (selector, at) => {
		tl.fromTo(
			q(selector),
			{ opacity: 0, y: 16, scale: 0.86, transformOrigin: 'bottom left' },
			{ opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'back.out(1.7)' },
			at,
		).fromTo(
			q(`${selector} .wa-idle-ripple`),
			{ opacity: 0.55, scale: 0.9 },
			{ opacity: 0, scale: 1.35, duration: 0.9, ease: 'power2.out' },
			at + 0.1,
		);
	};
	arrive('.wa-idle-msg--a', 1.3);
	arrive('.wa-idle-msg--b', 2.7);

	// 3. A reply types itself, then flies from the composer into the thread
	tl.to(q('.wa-idle-composer__draft'), { scaleX: 1, duration: 1.6, ease: 'steps(9)' }, 3.8)
		.to(q('.wa-idle-composer__send'), { scale: 1.18, duration: 0.18, ease: 'power2.out' }, 5.5)
		.to(q('.wa-idle-composer__send'), { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.45)' }, 5.68)
		.to(q('.wa-idle-composer__draft'), { scaleX: 0, duration: 0.18, ease: 'power2.in' }, 5.62)
		.fromTo(
			slot,
			{ opacity: 0, x: flyX, y: flyY, scale: 0.55, transformOrigin: 'bottom right' },
			{ opacity: 1, x: 0, y: 0, scale: 1, duration: 0.85, ease: 'expo.out' },
			5.66,
		)
		.fromTo(
			q('.wa-idle-card__sheen'),
			{ xPercent: -60, opacity: 0 },
			{ xPercent: 60, opacity: 1, duration: 1.1, ease: 'power2.inOut' },
			5.7,
		)
		.to(q('.wa-idle-card__sheen'), { opacity: 0, duration: 0.3 }, 6.5);

	// 4. Sent, delivered, read
	const [tickA, tickB] = qa('.wa-idle-tick');
	tl.to(tickA, { strokeDashoffset: 0, duration: 0.35, ease: 'power2.out' }, 6.6)
		.to(tickB, { strokeDashoffset: 0, duration: 0.35, ease: 'power2.out' }, 7.3)
		.to(q('.wa-idle-ticks__read'), { opacity: 1, duration: 0.4 }, 8.1);

	// 5. A heart lands on the first message, with a little burst
	tl.fromTo(
		q('.wa-idle-msg__reaction'),
		{ opacity: 0, scale: 0.2, y: 6 },
		{ opacity: 1, scale: 1, y: 0, duration: 0.6, ease: 'back.out(3)' },
		8.7,
	);
	qa('.wa-idle-burst span').forEach((heart, i) => {
		const angle = -90 + (i - 2) * 26;
		const rad = (angle * Math.PI) / 180;
		const at = 8.78 + i * 0.04;
		tl.set(heart, { opacity: 0, x: 0, y: 0, scale: 0.4, rotation: 0 }, at).to(
			heart,
			{
				keyframes: [
					{ opacity: 1, scale: 1, duration: 0.18, ease: 'power2.out' },
					{
						x: Math.cos(rad) * (26 + i * 3),
						y: Math.sin(rad) * (34 + (i % 2) * 8),
						rotation: (i - 2) * 14,
						opacity: 0,
						scale: 0.7,
						duration: 0.95,
						ease: 'power2.out',
					},
				],
			},
			at,
		);
	});

	// 6. The voice note plays
	tl.to(q('.wa-idle-chip__progress'), { clipPath: 'inset(0 0% 0 0)', duration: 3.2, ease: 'none' }, 9.6);

	// 7. Everything glides up and the next conversation begins
	tl.to(
		qa('.wa-idle-msg'),
		{ opacity: 0, y: -18, duration: 0.7, stagger: 0.08, ease: 'power2.in' },
		13.6,
	).to(q('.wa-idle-chip__progress'), { clipPath: 'inset(0 0% 0 100%)', duration: 0.6, ease: 'power2.in' }, 13.6);

	tl.set({}, {}, LOOP);
	return { tl, card };
}

function buildAmbient(root) {
	const q = selector => root.querySelector(selector);
	const ambient = gsap.timeline({ paused: true, repeat: -1 });
	const add = (target, vars, at = 0) => target && ambient.to(target, { ...vars, yoyo: true, repeat: 1 }, at);
	// Everything sits on one 12s cycle so it can be seeked to the page clock.
	add(q('.wa-idle-float'), { y: '-0.5em', rotationX: 2, rotationZ: -0.6, duration: 6, ease: 'sine.inOut' });
	add(q('.wa-idle-chip--voice .wa-idle-chip__inner'), { y: '-0.8em', x: '0.35em', rotation: 2, duration: 6, ease: 'sine.inOut' });
	add(q('.wa-idle-chip--photo .wa-idle-chip__inner'), { y: '0.7em', x: '-0.4em', rotation: -2.5, duration: 6, ease: 'sine.inOut' });
	add(q('.wa-idle-scene__glow'), { scale: 1.12, opacity: 0.95, duration: 6, ease: 'sine.inOut' });
	ambient.to(q('.wa-idle-scene__aurora'), { rotation: 360, duration: 12, ease: 'none' }, 0);
	root.querySelectorAll('.wa-idle-person').forEach((person, i) => {
		ambient.to(
			person,
			{ y: i % 2 ? '0.9em' : '-0.9em', x: i === 1 ? '-0.5em' : '0.5em', duration: 6, ease: 'sine.inOut', yoyo: true, repeat: 1 },
			0,
		);
	});
	return ambient;
}

/** The animated scene. Prop-free and memo-locked: parent re-renders never touch it. */
const IdleScene = memo(
	function IdleScene() {
		const rootRef = useRef(null);

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
					// A still frame of the finished conversation.
					story.tl.time(10.4).pause();
					return;
				}
				story.tl.totalTime(elapsed()).play();
				ambient.totalTime(elapsed() % ambient.duration()).play();
				if (!recentlyHere) {
					gsap.from(root, { opacity: 0, y: 18, scale: 0.97, duration: 1, ease: 'expo.out', clearProps: 'transform' });
				}
			}, root);

			// The reply's flight distance is measured in px: rebuild on resize, same clock.
			let resizeTimer = 0;
			const onResize = () => {
				window.clearTimeout(resizeTimer);
				resizeTimer = window.setTimeout(() => {
					if (reduce || !story) return;
					const playing = !story.tl.paused();
					story.tl.kill();
					ctx.add(() => {
						story = buildStory(root);
						story.tl.totalTime(elapsed());
						if (playing) story.tl.play();
					});
				}, 200);
			};
			window.addEventListener('resize', onResize);

			// Pause when the pane is not visible (another tab, collapsed panel).
			let observer;
			if (!reduce && 'IntersectionObserver' in window) {
				observer = new IntersectionObserver(([entry]) => {
					if (entry.isIntersecting) {
						story.tl.totalTime(elapsed()).play();
						ambient.totalTime(elapsed() % ambient.duration()).play();
					} else {
						story.tl.pause();
						ambient.pause();
					}
				});
				observer.observe(root);
			}

			// The card tilts toward the cursor; layers drift at different depths.
			const stage = root.closest('.wa-chat-idle');
			const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
			let cleanupPointer = () => {};
			if (!reduce && fine && stage) {
				const tilt = root.querySelector('.wa-idle-tilt');
				const layers = [...root.querySelectorAll('[data-depth]')];
				const rx = gsap.quickTo(tilt, 'rotationX', { duration: 0.9, ease: 'power3.out' });
				const ry = gsap.quickTo(tilt, 'rotationY', { duration: 0.9, ease: 'power3.out' });
				const movers = layers.map(layer => {
					const depth = Number(layer.dataset.depth) || 0;
					return {
						depth,
						x: gsap.quickTo(layer, 'x', { duration: 1.1, ease: 'power3.out' }),
						y: gsap.quickTo(layer, 'y', { duration: 1.1, ease: 'power3.out' }),
					};
				});
				const onMove = event => {
					const box = stage.getBoundingClientRect();
					const nx = ((event.clientX - box.left) / box.width - 0.5) * 2;
					const ny = ((event.clientY - box.top) / box.height - 0.5) * 2;
					rx(-ny * 7);
					ry(nx * 9);
					movers.forEach(m => {
						m.x(nx * 14 * m.depth);
						m.y(ny * 10 * m.depth);
					});
				};
				const onLeave = () => {
					rx(0);
					ry(0);
					movers.forEach(m => {
						m.x(0);
						m.y(0);
					});
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
				window.clearTimeout(resizeTimer);
				window.removeEventListener('resize', onResize);
				observer?.disconnect();
				cleanupPointer();
				ctx.revert();
			};
		}, []);

		return (
			<div ref={rootRef} className="wa-idle-scene" aria-hidden="true">
				<span className="wa-idle-scene__aurora" />
				<span className="wa-idle-scene__glow" />

				{/* People in the conversation, floating at different depths */}
				<span className="wa-idle-person wa-idle-person--1" data-depth="0.6" />
				<span className="wa-idle-person wa-idle-person--2" data-depth="1.2" />
				<span className="wa-idle-person wa-idle-person--3" data-depth="0.9" />

				<div className="wa-idle-tilt">
					<div className="wa-idle-float">
						<div className="wa-idle-card">
							<span className="wa-idle-card__sheen" />
							<div className="wa-idle-card__head">
								<span className="wa-idle-card__avatar">
									<span className="wa-idle-card__online" />
								</span>
								<span className="wa-idle-head">
									<span className="wa-idle-head__name" />
									<span className="wa-idle-head__sub">
										<span className="wa-idle-head__status" />
										<span className="wa-idle-head__typing">
											<span />
											<span />
											<span />
										</span>
									</span>
								</span>
							</div>

							<div className="wa-idle-card__thread">
								<span className="wa-idle-card__wallpaper" />

								<div className="wa-idle-msg wa-idle-msg--in wa-idle-msg--a">
									<span className="wa-idle-ripple" />
									<span className="wa-idle-msg__line" style={{ width: '92%' }} />
									<span className="wa-idle-msg__line" style={{ width: '58%' }} />
									<span className="wa-idle-msg__reaction">
										<svg viewBox="0 0 24 24">
											<path d="M12 20.5s-7.5-4.4-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.7-7.5 10.1-7.5 10.1Z" />
										</svg>
										<span className="wa-idle-burst">
											{[0, 1, 2, 3, 4].map(i => (
												<span key={i}>
													<svg viewBox="0 0 24 24">
														<path d="M12 20.5s-7.5-4.4-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.7-7.5 10.1-7.5 10.1Z" />
													</svg>
												</span>
											))}
										</span>
									</span>
								</div>

								<div className="wa-idle-msg wa-idle-msg--in wa-idle-msg--b">
									<span className="wa-idle-ripple" />
									<span className="wa-idle-msg__line" style={{ width: '70%' }} />
								</div>

								<div className="wa-idle-msg wa-idle-msg--out wa-idle-msg--c">
									<span className="wa-idle-msg__line" style={{ width: '86%' }} />
									<span className="wa-idle-msg__line" style={{ width: '64%' }} />
									<span className="wa-idle-ticks">
										<svg viewBox="0 0 18 12">
											<path className="wa-idle-tick" d="m1 6.5 3.2 3.2L10.5 2.5" pathLength="14" />
											<path className="wa-idle-tick" d="m7.4 9.4.3.3L14 2.5" pathLength="14" />
										</svg>
										<svg className="wa-idle-ticks__read" viewBox="0 0 18 12">
											<path d="m1 6.5 3.2 3.2L10.5 2.5" />
											<path d="m7.4 9.4.3.3L14 2.5" />
										</svg>
									</span>
								</div>
							</div>

							<div className="wa-idle-composer">
								<span className="wa-idle-composer__field">
									<span className="wa-idle-composer__draft" />
									<span className="wa-idle-composer__caret" />
								</span>
								<span className="wa-idle-composer__send">
									<svg viewBox="0 0 24 24">
										<path d="M4 12.5 20 5l-4.6 15-3.4-6.1L4 12.5Z" />
									</svg>
								</span>
							</div>
						</div>
					</div>
				</div>

				<div className="wa-idle-chip wa-idle-chip--voice" data-depth="1.5">
					<div className="wa-idle-chip__inner">
						<span className="wa-idle-chip__play">
							<svg viewBox="0 0 12 12">
								<path d="M3.5 2.2v7.6L9.6 6 3.5 2.2Z" />
							</svg>
						</span>
						<span className="wa-idle-chip__wave">
							<span className="wa-idle-chip__bars">
								{[0.42, 0.78, 0.55, 1, 0.62, 0.9, 0.38, 0.72, 0.5, 0.85, 0.6, 0.34].map((h, i) => (
									<span key={i} style={{ '--h': h }} />
								))}
							</span>
							<span className="wa-idle-chip__bars wa-idle-chip__progress">
								{[0.42, 0.78, 0.55, 1, 0.62, 0.9, 0.38, 0.72, 0.5, 0.85, 0.6, 0.34].map((h, i) => (
									<span key={i} style={{ '--h': h }} />
								))}
							</span>
						</span>
					</div>
				</div>

				<div className="wa-idle-chip wa-idle-chip--photo" data-depth="1.8">
					<div className="wa-idle-chip__inner">
						<svg viewBox="0 0 40 32">
							<circle cx="28" cy="10" r="4" />
							<path d="M3 28 14 15l8 9 5-5 10 9H3Z" />
						</svg>
					</div>
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
				<IdleScene />

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
