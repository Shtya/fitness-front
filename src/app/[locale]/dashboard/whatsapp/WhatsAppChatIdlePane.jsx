'use client';

import { memo, useEffect, useRef } from 'react';
import './wa-chat-idle.css';

/**
 * Empty chat-thread pane (no conversation selected).
 *
 * The animated scene is intentionally prop-free and memo-locked so parent
 * re-renders (chat-list scroll / hover prefetch) never restart the loop.
 */
const IdleScene = memo(
	function IdleScene() {
		return (
			<div className="wa-idle-scene" aria-hidden="true">
				<span className="wa-idle-scene__aurora" />
				<span className="wa-idle-scene__glow" />
				<span className="wa-idle-scene__orb wa-idle-scene__orb--a" />
				<span className="wa-idle-scene__orb wa-idle-scene__orb--b" />

				<div className="wa-idle-card">
					<span className="wa-idle-card__sheen" />
					<div className="wa-idle-card__head">
						<span className="wa-idle-card__avatar">
							<span className="wa-idle-card__online" />
						</span>
						<span className="wa-idle-card__lines">
							<span />
							<span />
						</span>
					</div>

					<div className="wa-idle-card__thread">
						<span className="wa-idle-card__wallpaper" />

						<div className="wa-idle-msg wa-idle-msg--in wa-idle-msg--a">
							<span className="wa-idle-msg__line" style={{ width: '92%' }} />
							<span className="wa-idle-msg__line" style={{ width: '58%' }} />
							<span className="wa-idle-msg__reaction">
								<svg viewBox="0 0 24 24">
									<path d="M12 20.5s-7.5-4.4-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.7-7.5 10.1-7.5 10.1Z" />
								</svg>
							</span>
						</div>

						<div className="wa-idle-msg wa-idle-msg--in wa-idle-msg--b">
							<span className="wa-idle-msg__line" style={{ width: '70%' }} />
						</div>

						<div className="wa-idle-typing">
							<span />
							<span />
							<span />
						</div>

						<div className="wa-idle-msg wa-idle-msg--out wa-idle-msg--c">
							<span className="wa-idle-msg__line" style={{ width: '86%' }} />
							<span className="wa-idle-msg__line" style={{ width: '64%' }} />
							<span className="wa-idle-msg__ticks">
								<svg viewBox="0 0 18 12">
									<path d="m1 6.5 3.2 3.2L10.5 2.5" />
									<path d="m7.4 9.4.3.3L14 2.5" />
								</svg>
							</span>
						</div>
					</div>
				</div>

				<div className="wa-idle-chip wa-idle-chip--voice">
					<span className="wa-idle-chip__play">
						<svg viewBox="0 0 12 12">
							<path d="M3.5 2.2v7.6L9.6 6 3.5 2.2Z" />
						</svg>
					</span>
					<span className="wa-idle-chip__wave">
						{[0.42, 0.78, 0.55, 1, 0.62, 0.9, 0.38, 0.72, 0.5, 0.85].map((h, i) => (
							<span key={i} style={{ '--h': h, '--i': i }} />
						))}
					</span>
				</div>

				<div className="wa-idle-chip wa-idle-chip--photo">
					<span className="wa-idle-chip__photo-glow" />
					<svg viewBox="0 0 40 32">
						<circle cx="28" cy="10" r="4" />
						<path d="M3 28 14 15l8 9 5-5 10 9H3Z" />
					</svg>
				</div>
			</div>
		);
	},
	() => true,
);

function WhatsAppChatIdlePane({ title, hint, unreadLabel, steps }) {
	const rootRef = useRef(null);
	const stepList = Array.isArray(steps) && steps.length ? steps : [];

	useEffect(() => {
		const node = rootRef.current;
		if (!node) return undefined;
		const id = window.requestAnimationFrame(() => {
			node.classList.add('is-ready');
		});
		return () => window.cancelAnimationFrame(id);
	}, []);

	return (
		<div ref={rootRef} className="wa-chat-idle" role="status" aria-live="polite">
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
