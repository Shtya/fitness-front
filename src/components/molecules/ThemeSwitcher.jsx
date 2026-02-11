

'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Check, Sparkles, Search, X, Wand2, Zap, Star, Layers, Grid3x3, ChevronDown, Paintbrush } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useTheme, COLOR_PALETTES } from '@/app/[locale]/theme';
import { cn } from '@/lib/utils';

// ============================================================================
// ANIMATION CONFIGS
// ============================================================================

const spring = { type: 'spring', stiffness: 400, damping: 30, mass: 0.8 };
const fastSpring = { type: 'spring', stiffness: 500, damping: 35, mass: 0.6 };


const slideUp = {
	initial: { opacity: 0, y: 20 },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: -10 },
};

// ============================================================================
// FLOATING PARTICLES BACKGROUND
// ============================================================================

function FloatingParticles({ colors }) {
	const particles = useMemo(() => {
		return Array.from({ length: 20 }, (_, i) => ({
			id: i,
			size: Math.random() * 4 + 2,
			x: Math.random() * 100,
			y: Math.random() * 100,
			duration: Math.random() * 10 + 15,
			delay: Math.random() * 5,
			opacity: Math.random() * 0.4 + 0.1,
		}));
	}, []);

	return (
		<div className='absolute inset-0 overflow-hidden pointer-events-none'>
			{particles.map(p => (
				<motion.div
					key={p.id}
					className='absolute rounded-full blur-sm'
					style={{
						width: p.size,
						height: p.size,
						left: `${p.x}%`,
						top: `${p.y}%`,
						background: colors[Math.floor(Math.random() * colors.length)],
						opacity: p.opacity,
					}}
					animate={{
						y: [0, -30, 0],
						x: [0, Math.random() * 20 - 10, 0],
						scale: [1, 1.2, 1],
					}}
					transition={{
						duration: p.duration,
						delay: p.delay,
						repeat: Infinity,
						ease: 'easeInOut',
					}}
				/>
			))}
		</div>
	);
}


function ThemeCard({ themeKey, palette, isActive, onClick }) {
	const t = useTranslations('themeSwitcher');

	return (
		<motion.button
			layout
			whileHover={{ scale: 1.03, y: -2 }}
			whileTap={{ scale: 0.98 }}
			onClick={onClick}
			className={cn(
				'group w-full border border-slate-100 relative rounded-md text-left transition-all duration-300 overflow-hidden',
				'p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
				isActive ? 'ring-2 ring-offset-2 shadow-2xl' : 'shadow-lg hover:shadow-2xl',
			)}
			style={{
				backgroundColor: 'white',
				ringColor: isActive ? palette.primary[500] : 'transparent',
			}}>
			<div
				className='absolute inset-0 opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-500'
				style={{
					background: `radial-gradient(circle at 30% 20%, ${palette.gradient.from}88, transparent 70%), radial-gradient(circle at 70% 80%, ${palette.gradient.to}88, transparent 70%)`,
				}}
			/>
			<div
				className='absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500'
				style={{
					background: `linear-gradient(135deg, ${palette.gradient.from}22, ${palette.gradient.to}22)`,
					padding: '1px',
					WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
					WebkitMaskComposite: 'xor',
					maskComposite: 'exclude',
				}}
			/>

			<div className='relative  z-10'>
				{/* Top gradient bar with shimmer */}
				<div className='relative overflow-hidden rounded-md  h-14 shadow-lg ring-1 ring-black/5'>
					<div
						className='absolute inset-0'
						style={{
							background: `linear-gradient(135deg, ${palette.gradient.from}, ${palette.gradient.to})`,
						}}
					/>

					{/* Shimmer effect */}
					<motion.div
						className='absolute inset-0'
						animate={{
							backgroundPosition: ['-200% 0', '200% 0'],
						}}
						transition={{
							duration: 3,
							repeat: Infinity,
							ease: 'linear',
						}}
						style={{
							background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
							backgroundSize: '200% 100%',
						}}
					/>

					{/* Floating sparkles */}
					<div className='absolute  top-1/2 -translate-y-1/2  rtl:!left-[20px] ltr:!right-[20px] flex items-center justify-center opacity-70'>
						<Sparkles className='w-6 h-6 text-white' strokeWidth={2} />
					</div>
				</div>

				{/* Color swatches with 3D effect */}
				<div className='flex items-center absolute bottom-[5px] ltr:left-[5px] rtl:right-[5px] gap-2 '>
					{[palette.primary[500], palette.secondary[500], palette.primary[300]].map((color, idx) => (
						<motion.div
							key={idx}
							whileHover={{ scale: 1.15, rotate: 5 }}
							className='relative'
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: idx * 0.05 }}>
							<div
								className='w-5 h-5 rounded-sm ring-2 ring-white shadow-lg relative overflow-hidden'
								style={{ backgroundColor: color }}>
								{/* Gloss effect */}
								<div className='absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent' />
							</div>
						</motion.div>
					))}

				</div>

				{/* Hover glow effect */}
				<div
					className='absolute -inset-2 rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 -z-10'
					style={{
						background: `radial-gradient(circle at 50% 50%, ${palette.gradient.from}33, ${palette.gradient.to}33, transparent 70%)`,
					}}
				/>
			</div>
		</motion.button>
	);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ThemeSwitcher({ collapsed = false }) {
	const t = useTranslations('themeSwitcher');
	const [open, setOpen] = useState(false);
	const { theme: currentTheme, setTheme } = useTheme();

	const triggerRef = useRef(null);
	const panelRef = useRef(null);

	const themeEntries = useMemo(() => Object.entries(COLOR_PALETTES), []);
	const currentPalette = COLOR_PALETTES[currentTheme];

	const particleColors = useMemo(() => {
		if (!currentPalette) return [];
		return [currentPalette.primary[300], currentPalette.secondary[300], currentPalette.primary[200]];
	}, [currentPalette]);

	useEffect(() => {
		const onKeyDown = (e) => {
			if (e.key === 'Escape') setOpen(false);
		};
		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	}, []);

	useEffect(() => {
		if (!open) return;
		const onClick = (e) => {
			const target = e.target;
			if (panelRef.current?.contains(target)) return;
			if (triggerRef.current?.contains(target)) return;
			setOpen(false);
		};
		document.addEventListener('mousedown', onClick);
		return () => document.removeEventListener('mousedown', onClick);
	}, [open]);

	return (
		<div className="relative z-[1000]">
			<motion.button
				ref={triggerRef}
				whileHover={{ scale: 1.04, y: -1 }}
				whileTap={{ scale: 0.96 }}
				onClick={() => setOpen((v) => !v)}
				aria-haspopup="dialog"
				aria-expanded={open}
				className={cn(
					'group relative overflow-hidden transition-all duration-300',
					'outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2',
					collapsed ? 'w-14 h-14 rounded-2xl' : 'w-full h-14 rounded-2xl px-5'
				)}
				style={{
					background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
					boxShadow: '0 10px 40px -10px var(--color-primary-500)',
				}}>
				<motion.div
					className="absolute inset-0"
					animate={{
						background: [
							'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%)',
							'radial-gradient(circle at 80% 50%, rgba(255,255,255,0.3) 0%, transparent 50%)',
							'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%)',
						],
					}}
					transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
				/>

				<motion.div
					className="absolute inset-0 opacity-40"
					animate={{
						backgroundPosition: ['-200% 0', '200% 0'],
					}}
					transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
					style={{
						background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
						backgroundSize: '200% 100%',
					}}
				/>

				<div className="relative z-10 flex items-center justify-center gap-3 text-white h-full">
					<motion.div animate={{ rotate: open ? 180 : 0 }} transition={spring} className="relative">
						<motion.div
							className="absolute inset-0 rounded-full bg-white/30 blur-md"
							animate={{
								scale: [1, 1.3, 1],
								opacity: [0.3, 0.6, 0.3],
							}}
							transition={{ duration: 2, repeat: Infinity }}
						/>
						<Palette className="w-6 h-6 relative" strokeWidth={2.5} />
					</motion.div>

					{!collapsed && (
						<>
							<motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex-1 text-left">
								<div className="font-black text-sm tracking-tight">{t('trigger')}</div>
								{currentPalette?.name && <div className="text-xs opacity-90 font-semibold">{currentPalette.name}</div>}
							</motion.div>
						</>
					)}
				</div>
			</motion.button>

			<AnimatePresence>
				{open && (
					<motion.div
						ref={panelRef}
						role="dialog"
						aria-label={t('ariaLabel')}
						{...slideUp}
						transition={spring}
						className={cn('  absolute z-[9999] bottom-full mb-4', collapsed ? 'rtl:right-0 ltr:left-0' : 'rtl:right-0 ltr:left-0 ')}
						style={{
							filter: 'drop-shadow(0 25px 50px rgba(15, 23, 42, 0.35))',
						}}>
						<motion.div
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{ delay: 0.1, ...fastSpring }}
							className={cn('absolute -bottom-[10px] z-[-1]', collapsed ? 'rtl:right-5  ltr:left-6' : ' rtl:right-12 ltr:left-10')}
							style={{
								filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))',
							}}>
							<div
								className="w-6 h-6 rotate-45 border-l border-b border-white/20"
								style={{
									background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.98))',
									backdropFilter: 'blur(20px)',
								}}
							/>
						</motion.div>

						<div
							className="  min-w-[380px] max-w-[480px] overflow-hidden rounded-3xl border border-white/40"
							style={{
								background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.98))',
								backdropFilter: 'blur(20px)',
							}}>
							<FloatingParticles colors={particleColors} />

							<div className="relative px-6 pt-6 pb-5 border-b border-slate-200/50">
								<div className="flex items-center gap-4">
									<motion.div
										initial={{ scale: 0, rotate: -180 }}
										animate={{ scale: 1, rotate: 0 }}
										transition={spring}
										className="relative shrink-0">
										<motion.div
											className="absolute inset-0 rounded-2xl blur-lg"
											animate={{
												scale: [1, 1.2, 1],
												opacity: [0.5, 0.8, 0.5],
											}}
											transition={{ duration: 2, repeat: Infinity }}
											style={{
												background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
											}}
										/>

										<div
											className="relative w-10 h-10 rounded-2xl grid place-content-center text-white shadow-2xl"
											style={{
												background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
											}}>
											<Paintbrush className="w-5 h-5" strokeWidth={2.5} />
										</div>
									</motion.div>

									<div className="flex-1 min-w-0">
										<motion.h3
											initial={{ opacity: 0, x: -20 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ delay: 0.1 }}
											className="font-black text-xl text-slate-900 leading-tight">
											{t('title')}
										</motion.h3>
									</div>
								</div>
							</div>

							<div className="relative p-5 max-h-[500px] overflow-y-auto custom-scrollbar">
								<motion.div
									variants={{
										hidden: { opacity: 0 },
										show: {
											opacity: 1,
											transition: { staggerChildren: 0.03 },
										},
									}}
									initial="hidden"
									animate="show"
									className="grid grid-cols-2 gap-3">
									{themeEntries.map(([key, palette]) => (
										<motion.div
											key={key}
											variants={{
												hidden: { opacity: 0, y: 20 },
												show: { opacity: 1, y: 0 },
											}}>
											<ThemeCard
												themeKey={key}
												palette={palette}
												isActive={currentTheme === key}
												onClick={() => {
													setTheme(key);
													setTimeout(() => setOpen(false), 300);
												}}
											/>
										</motion.div>
									))}
								</motion.div>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			<style jsx>{`
				.custom-scrollbar::-webkit-scrollbar {
					width: 6px;
				}
				.custom-scrollbar::-webkit-scrollbar-track {
					background: transparent;
				}
				.custom-scrollbar::-webkit-scrollbar-thumb {
					background: rgba(148, 163, 184, 0.3);
					border-radius: 10px;
				}
				.custom-scrollbar::-webkit-scrollbar-thumb:hover {
					background: rgba(148, 163, 184, 0.5);
				}
			`}</style>
		</div>
	);
}