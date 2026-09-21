'use client';

export default function BodyPoseGuide({ variant = 'front', className = '' }) {
	const front = variant === 'front';
	return (
		<svg
			viewBox="0 0 200 360"
			className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
			aria-hidden="true"
		>
			<ellipse cx="100" cy="42" rx="22" ry="26" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.4" />
			{front ? (
				<>
					<path
						d="M62 88 C62 72 138 72 138 88 L148 168 C150 188 142 198 132 206 L132 250 L122 250 L122 340 L78 340 L78 250 L68 250 L68 206 C58 198 50 188 52 168 Z"
						fill="rgba(255,255,255,0.08)"
						stroke="rgba(255,255,255,0.9)"
						strokeWidth="2.2"
					/>
					<path d="M62 96 L28 168" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
					<path d="M138 96 L172 168" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
					<line x1="78" y1="250" x2="78" y2="340" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
					<line x1="122" y1="250" x2="122" y2="340" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
				</>
			) : (
				<>
					<path
						d="M108 78 C128 78 138 96 136 130 L132 200 C130 220 124 232 118 240 L118 340"
						fill="none"
						stroke="rgba(255,255,255,0.9)"
						strokeWidth="2.2"
					/>
					<path
						d="M108 78 C90 82 86 110 90 150 L96 230 C98 250 102 270 108 340"
						fill="rgba(255,255,255,0.08)"
						stroke="rgba(255,255,255,0.85)"
						strokeWidth="2.2"
					/>
					<path d="M118 110 L150 168" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
				</>
			)}
			<rect x="36" y="18" width="128" height="324" rx="18" fill="none" stroke="rgba(255,255,255,0.35)" strokeDasharray="7 8" />
		</svg>
	);
}
