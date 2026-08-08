'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BookOpenText, X } from 'lucide-react';
import { rulesGroupedForGuide } from './tajweed';

export default function TajweedGuideModal({
	open,
	onClose,
	isAr = true,
	labels = {},
}) {
	useEffect(() => {
		if (!open) return undefined;
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		const onKey = (e) => {
			if (e.key === 'Escape') onClose?.();
		};
		window.addEventListener('keydown', onKey);
		return () => {
			document.body.style.overflow = prev;
			window.removeEventListener('keydown', onKey);
		};
	}, [open, onClose]);

	if (!open || typeof document === 'undefined') return null;

	const groups = rulesGroupedForGuide(isAr);

	return createPortal(
		<div className="qr-tw-modal-root" role="presentation">
			<button
				type="button"
				className="qr-tw-modal-backdrop"
				aria-label={labels.close}
				onClick={onClose}
			/>
			<div
				className="qr-tw-modal"
				role="dialog"
				aria-modal="true"
				aria-labelledby="qr-tw-modal-title"
				dir={isAr ? 'rtl' : 'ltr'}
			>
				<header className="qr-tw-modal-head">
					<div className="qr-tw-modal-brand">
						<span className="qr-tw-modal-icon" aria-hidden>
							<BookOpenText size={18} strokeWidth={2.25} />
						</span>
						<div>
							<h2 id="qr-tw-modal-title">{labels.title}</h2>
							<p>{labels.intro}</p>
						</div>
					</div>
					<button type="button" className="qr-tw-modal-x" onClick={onClose} aria-label={labels.close}>
						<X size={16} strokeWidth={2.4} />
					</button>
				</header>

				<div className="qr-tw-modal-hint">
					<strong>{labels.howTitle}</strong>
					<span>{labels.howBody}</span>
				</div>

				<div className="qr-tw-modal-body">
					{groups.map(group => (
						<section key={group.id} className="qr-tw-modal-section">
							<h3>{group.title}</h3>
							{group.blurb ? <p className="qr-tw-modal-blurb">{group.blurb}</p> : null}
							<ul className="qr-tw-modal-grid">
								{group.rules.map(rule => (
									<li key={rule.code} className="qr-tw-modal-card">
										<header>
											<span className="qr-tw-swatch is-lg" style={{ background: rule.color }} aria-hidden />
											<strong>{rule.name}</strong>
										</header>
										<div className="qr-tw-tip-box">
											<span className="qr-tw-tip-label">{labels.meaning}</span>
											<p>{rule.meaning}</p>
										</div>
										<div className="qr-tw-tip-box is-soft">
											<span className="qr-tw-tip-label">{labels.why}</span>
											<p>{rule.why}</p>
										</div>
										{rule.tip ? (
											<div className="qr-tw-tip-box is-fun">
												<span className="qr-tw-tip-label">{labels.tip}</span>
												<p>{rule.tip}</p>
											</div>
										) : null}
										{rule.example ? (
											<div className="qr-tw-modal-example" dir="rtl">
												<span>{labels.example}</span>
												<em>{rule.example}</em>
											</div>
										) : null}
									</li>
								))}
							</ul>
						</section>
					))}
				</div>

				<footer className="qr-tw-modal-foot">
					<p>{labels.footer}</p>
					<button type="button" className="qr-tw-modal-done" onClick={onClose}>
						{labels.close}
					</button>
				</footer>
			</div>
		</div>,
		document.body,
	);
}
