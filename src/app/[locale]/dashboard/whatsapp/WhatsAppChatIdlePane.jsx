'use client';

/**
 * Empty chat-thread pane (no conversation selected).
 * Visual source: WhatsApp Session Restore reference HTML.
 */
export default function WhatsAppChatIdlePane({
	title,
	hint,
	unreadLabel,
	steps,
}) {
	const stepList = Array.isArray(steps) && steps.length ? steps : [];

	return (
		<div className="wa-chat-idle" role="status" aria-live="polite">
			<div className="wa-chat-idle__ambient" aria-hidden="true" />
			<div className="wa-chat-idle__dots" aria-hidden="true" />
			<div className="wa-chat-idle__dots wa-chat-idle__dots--end" aria-hidden="true" />

			<div className="wa-chat-idle__stage">
				<section className="wa-chat-idle__visual" aria-hidden="true">
					<div className="wa-chat-idle__orbit-dotted" />
					<div className="wa-chat-idle__orbit-main" />
					<div className="wa-chat-idle__progress-arc" />
					<div className="wa-chat-idle__core-glow" />

					<div className="wa-chat-idle__float wa-chat-idle__float--sync">
						<svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
							<path
								d="M25.5 12.5A10.5 10.5 0 0 0 7 9.8L5 12"
								stroke="currentColor"
								strokeWidth="2.5"
								strokeLinecap="round"
							/>
							<path
								d="m4.5 7.5.5 5 5-.5"
								stroke="currentColor"
								strokeWidth="2.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
							<path
								d="M6.5 19.5A10.5 10.5 0 0 0 25 22.2L27 20"
								stroke="currentColor"
								strokeWidth="2.5"
								strokeLinecap="round"
							/>
							<path
								d="m27.5 24.5-.5-5-5 .5"
								stroke="currentColor"
								strokeWidth="2.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</div>

					<div className="wa-chat-idle__float wa-chat-idle__float--lock">
						<svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
							<rect
								x="8"
								y="14"
								width="16"
								height="13"
								rx="2.5"
								stroke="currentColor"
								strokeWidth="2.3"
							/>
							<path
								d="M12 14V10a4 4 0 0 1 8 0v4"
								stroke="currentColor"
								strokeWidth="2.3"
							/>
							<circle cx="16" cy="20.5" r="1.5" fill="currentColor" />
						</svg>
					</div>

					<div className="wa-chat-idle__float wa-chat-idle__float--message">
						<svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
							<path
								d="M7 8.5h18v13H13l-5 4v-17Z"
								stroke="currentColor"
								strokeWidth="2.2"
								strokeLinejoin="round"
							/>
							<path
								d="M12 13h8M12 17h5"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
							/>
						</svg>
					</div>

					<div className="wa-chat-idle__float wa-chat-idle__float--phone">
						<svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
							<rect
								x="9"
								y="4.5"
								width="14"
								height="23"
								rx="2.4"
								stroke="currentColor"
								strokeWidth="2.2"
							/>
							<path
								d="M14 24h4"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
							/>
						</svg>
					</div>

					<div className="wa-chat-idle__core">
						<svg className="wa-chat-idle__whatsapp" viewBox="0 0 104 104" fill="none">
							<path
								d="M52 10.5C29.1 10.5 10.5 28.9 10.5 51.6c0 8.1 2.4 15.7 6.9 22.1L12 94l20.9-5.3c5.8 3.2 12.3 4.9 19.1 4.9 22.9 0 41.5-18.4 41.5-41.9C93.5 28.9 74.9 10.5 52 10.5Z"
								stroke="#08bf83"
								strokeWidth="6.8"
							/>
							<path
								d="M39.7 35.1c-.9-2.1-1.8-2.2-2.7-2.2h-2.3c-.8 0-2 .3-3.1 1.5-1.1 1.2-4.1 4-4.1 9.7s4.2 11.3 4.8 12.1c.6.8 8.1 13 20 17.7 9.9 3.9 11.9 3.1 14 2.9 2.1-.2 6.8-2.8 7.8-5.5 1-2.7 1-5  .7-5.5-.3-.5-1.1-.8-2.3-1.4-1.2-.6-6.8-3.4-7.9-3.8-1.1-.4-1.9-.6-2.7.6-.8 1.2-3 3.8-3.7 4.6-.7.8-1.4.9-2.6.3-1.2-.6-4.9-1.8-9.3-5.7-3.4-3-5.7-6.7-6.4-7.9-.7-1.2-.1-1.8.5-2.4.5-.5 1.2-1.4 1.8-2.1.6-.7.8-1.2 1.2-2 .4-.8.2-1.5-.1-2.1l-3.6-8.8Z"
								fill="#08bf83"
							/>
						</svg>
					</div>

					<span className="wa-chat-idle__dot wa-chat-idle__dot--1" />
					<span className="wa-chat-idle__dot wa-chat-idle__dot--2" />
					<span className="wa-chat-idle__dot wa-chat-idle__dot--3" />
					<span className="wa-chat-idle__dot wa-chat-idle__dot--4" />
					<span className="wa-chat-idle__ring-dot" />
					<span className="wa-chat-idle__plus">+</span>
				</section>

				<section className="wa-chat-idle__copy">
					<h2 className="wa-chat-idle__title">{title}</h2>
					{hint ? <p className="wa-chat-idle__hint">{hint}</p> : null}
					{unreadLabel ? (
						<div className="wa-chat-idle__unread">
							<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
								<path
									d="m13 2-7 11h5l-1 9 7-12h-5l1-8Z"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinejoin="round"
								/>
							</svg>
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
