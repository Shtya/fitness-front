'use client';

import { motion, useReducedMotion } from 'framer-motion';

export default function ScanSilhouette({ scanning = false, className = '' }) {
	const reduce = useReducedMotion();
	return (
		<div className={`relative mx-auto aspect-[3/4] w-full max-w-[180px] ${className}`}>
			<svg viewBox="0 0 200 360" className="h-full w-full" aria-hidden="true">
				<defs>
					<linearGradient id="scanFill" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="white" stopOpacity="0.22" />
						<stop offset="100%" stopColor="white" stopOpacity="0.06" />
					</linearGradient>
				</defs>
				<ellipse cx="100" cy="46" rx="24" ry="28" fill="url(#scanFill)" stroke="white" strokeOpacity="0.85" strokeWidth="2.4" />
				<path
					d="M60 92 C60 74 140 74 140 92 L152 172 C154 194 144 206 132 214 L132 258 L122 258 L122 338 L78 338 L78 258 L68 258 L68 214 C56 206 46 194 48 172 Z"
					fill="url(#scanFill)"
					stroke="white"
					strokeOpacity="0.9"
					strokeWidth="2.2"
				/>
				<path d="M60 100 L24 176" fill="none" stroke="white" strokeOpacity="0.75" strokeWidth="2.1" />
				<path d="M140 100 L176 176" fill="none" stroke="white" strokeOpacity="0.75" strokeWidth="2.1" />
			</svg>
			{scanning && !reduce && (
				<motion.div
					className="pointer-events-none absolute inset-x-[12%] h-0.5 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.9)]"
					animate={{ top: ['10%', '88%', '10%'] }}
					transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
				/>
			)}
		</div>
	);
}
