'use client';

/*
 * Staunton-style chess pieces drawn for this app (100×100 viewBox).
 * Body shapes use a soft vertical gradient, details are drawn in a contrasting line colour.
 */

const STYLE = {
	w: { from: '#ffffff', to: '#d5d9cc', stroke: '#262b28', detail: '#262b28' },
	b: { from: '#5b625d', to: '#16191a', stroke: '#0b0d0c', detail: 'rgba(255,255,255,0.78)' },
};

const BASE = 'M22 90h56a5 5 0 0 0 5-5v-1a6 6 0 0 0-6-6H23a6 6 0 0 0-6 6v1a5 5 0 0 0 5 5z';

const SHAPES = {
	P: {
		body: [
			'M33 78c1-12 7-20 10-26h14c3 6 9 14 10 26z',
			'M37 53h26a3.5 3.5 0 0 0 0-7H37a3.5 3.5 0 0 0 0 7z',
			'M50 46a13 13 0 1 0 0-26 13 13 0 0 0 0 26z',
		],
		detail: [],
	},
	R: {
		body: [
			'M31 78l4-32h30l4 32z',
			'M29 47h42a3 3 0 0 0 3-3v-1a3 3 0 0 0-3-3H29a3 3 0 0 0-3 3v1a3 3 0 0 0 3 3z',
			'M29 41V18h9v8h8v-8h8v8h8v-8h9v23z',
		],
		detail: ['M34 70h32', 'M33 33h34'],
	},
	B: {
		body: [
			'M34 78c2-10 6-17 8-21h16c2 4 6 11 8 21z',
			'M36 58h28a3.5 3.5 0 0 0 0-7H36a3.5 3.5 0 0 0 0 7z',
			'M50 15C37 25 33 37 37 46c2 4 7 6 13 6s11-2 13-6c4-9 0-21-13-31z',
			'M50 16a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11z',
		],
		detail: ['M55 26l-8 12', 'M40 70h20'],
	},
	N: {
		body: [
			'M34 78c1-11 6-19 12-26-5 3-11 5-16 3-5-1-9-5-8-10 0-4 4-8 8-12 6-6 11-12 16-16l2-8 6 7c11 2 21 14 21 30 0 13-4 22-4 32z',
		],
		detail: ['M60 22c8 9 12 22 10 42', 'M38 70h28'],
		dots: [
			[42, 31, 2.8],
			[27.5, 45.5, 1.6],
		],
	},
	Q: {
		body: [
			'M31 78c2-10 5-17 6-22h26c1 5 4 12 6 22z',
			'M33 57h34a3.5 3.5 0 0 0 0-7H33a3.5 3.5 0 0 0 0 7z',
			'M31 51l-11-27 14 14 2-20 9 18 5-22 5 22 9-18 2 20 14-14-11 27z',
		],
		detail: ['M38 70h24'],
		dots: [
			[20, 22, 4.2],
			[36, 16, 4.2],
			[50, 11, 4.6],
			[64, 16, 4.2],
			[80, 22, 4.2],
		],
	},
	K: {
		body: [
			'M31 78c2-10 5-17 6-22h26c1 5 4 12 6 22z',
			'M33 57h34a3.5 3.5 0 0 0 0-7H33a3.5 3.5 0 0 0 0 7z',
			'M33 51c-7-9-9-19 0-22 8-2 13 4 17 9 4-5 9-11 17-9 9 3 7 13 0 22z',
			'M47 31V21h-6v-6h6V7h6v8h6v6h-6v10z',
		],
		detail: ['M38 70h24', 'M50 38v12'],
	},
};

export function ChessPieceDefs() {
	return (
		<svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden focusable="false">
			<defs>
				{Object.entries(STYLE).map(([c, s]) => (
					<linearGradient key={c} id={`wg-piece-${c}`} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor={s.from} />
						<stop offset="1" stopColor={s.to} />
					</linearGradient>
				))}
			</defs>
		</svg>
	);
}

/** `p` is 'wK', 'bN', … */
export function ChessPiece({ p, className = '' }) {
	const color = p[0];
	const shape = SHAPES[p[1]];
	const s = STYLE[color];
	return (
		<svg viewBox="0 0 100 100" className={`wg-svgpc ${className}`} aria-hidden focusable="false">
			<g fill={`url(#wg-piece-${color})`} stroke={s.stroke} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
				{shape.body.map(d => (
					<path key={d} d={d} />
				))}
				<path d={BASE} />
				{(shape.dots || []).map(([cx, cy, r]) => (
					<circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} strokeWidth={p[1] === 'N' ? 0 : 2.6} fill={p[1] === 'N' ? s.detail : `url(#wg-piece-${color})`} />
				))}
			</g>
			<g fill="none" stroke={s.detail} strokeWidth="2.6" strokeLinecap="round">
				{shape.detail.map(d => (
					<path key={d} d={d} />
				))}
			</g>
		</svg>
	);
}
