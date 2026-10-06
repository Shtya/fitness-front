'use client';

import { motion, useMotionValue, useSpring } from 'framer-motion';

function sparkPath(value, max, seed = 0) {
	const ratio = Math.min(1, Math.max(0.12, Number(value || 0) / Math.max(1, Number(max || 1))));
	const endY = 48 - ratio * 38;
	const yAt = (t) => {
		const trend = 48 - (48 - endY) * t;
		const wave = Math.sin((t * 3.15 + seed * 1.7) * Math.PI) * (7.2 * (1 - t * 0.32));
		return Math.max(7, Math.min(48, trend + wave));
	};
	const ts = [0, 0.16, 0.32, 0.48, 0.64, 0.8, 1];
	const pts = ts.map((t) => [2 + t * 97, t === 1 ? endY : yAt(t)]);
	let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
	for (let i = 1; i < pts.length; i++) {
		const [x, y] = pts[i];
		const [px, py] = pts[i - 1];
		const mx = ((px + x) / 2).toFixed(1);
		d += ` C${mx} ${py.toFixed(1)},${mx} ${y.toFixed(1)},${x.toFixed(1)} ${y.toFixed(1)}`;
	}
	return d;
}

function Sparkline({ value, max, color, fill, seed }) {
	const d = sparkPath(value, max, seed);
	const id = `gm-spark-${String(seed).replace('.', '')}`;
	return (
		<svg viewBox='0 0 100 55' className='hidden h-11 w-[68px] shrink-0 overflow-visible lg:block' aria-hidden>
			<defs>
				<linearGradient id={id} x1='0' y1='0' x2='0' y2='1'>
					<stop offset='0' stopColor={fill} stopOpacity='0.32' />
					<stop offset='1' stopColor={fill} stopOpacity='0' />
				</linearGradient>
			</defs>
			<path d={`${d} L99 55 L2 55 Z`} fill={`url(#${id})`} />
			<motion.path
				d={d}
				fill='none'
				stroke={color}
				strokeWidth='2.4'
				strokeLinecap='round'
				initial={{ pathLength: 0 }}
				animate={{ pathLength: 1 }}
				transition={{ duration: 1.05, ease: 'easeOut', delay: 0.12 + Number(seed) * 0.12 }}
			/>
		</svg>
	);
}

export default function GmStatCard({ card, index }) {
	const Icon = card.icon;
	const Tag = card.onClick ? motion.button : motion.article;
	const rx = useMotionValue(0);
	const ry = useMotionValue(0);
	const lift = useMotionValue(0);
	const rotateX = useSpring(rx, { stiffness: 180, damping: 18, mass: 0.55 });
	const rotateY = useSpring(ry, { stiffness: 180, damping: 18, mass: 0.55 });
	const y = useSpring(lift, { stiffness: 220, damping: 20 });

	const reset = () => { rx.set(0); ry.set(0); lift.set(0); };
	const onMove = (e) => {
		if (typeof window === 'undefined') return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		if (window.matchMedia('(hover: none)').matches) return;
		const el = e.currentTarget;
		const r = el.getBoundingClientRect();
		const px = (e.clientX - r.left) / r.width - 0.5;
		const py = (e.clientY - r.top) / r.height - 0.5;
		rx.set(py * -8);
		ry.set(px * 10);
		lift.set(-5);
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 18 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.04 + index * 0.07, type: 'spring', stiffness: 170, damping: 20 }}
			style={{ perspective: 920 }}
		>
			<Tag
				type={card.onClick ? 'button' : undefined}
				onClick={card.onClick}
				onMouseMove={onMove}
				onMouseLeave={reset}
				style={{ rotateX, rotateY, y }}
				className={`gm-stat w-full text-start ${card.onClick ? 'cursor-pointer' : ''}`}
			>
				<div className={`grid size-12 shrink-0 place-items-center rounded-[15px] border border-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_14px_color-mix(in_srgb,var(--color-primary-600)_10%,transparent)] ${card.tone}`}>
					<Icon className='size-6' strokeWidth={1.75} />
				</div>
				<div className='min-w-0 flex-1 overflow-visible'>
					<div className='whitespace-nowrap text-[12px] font-semibold gm-muted'>{card.title}</div>
					<div className='gm-display mt-1.5 text-[28px] font-bold leading-none gm-ink'>{card.value ?? 0}</div>
					{card.hint ? <div className='mt-1 whitespace-nowrap text-[10.5px] font-medium leading-snug gm-faint'>{card.hint}</div> : null}
				</div>
				<Sparkline value={card.value} max={card.max} color={card.stroke} fill={card.fill} seed={card.seed} />
			</Tag>
		</motion.div>
	);
}
