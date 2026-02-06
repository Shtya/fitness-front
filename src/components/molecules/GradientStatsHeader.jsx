'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, TrendingUp, Sparkles, Zap, ChevronDown } from 'lucide-react';
import { useTheme } from '@/app/[locale]/theme';


const spring = { type: 'spring', stiffness: 400, damping: 30, mass: 0.8 };
const smoothSpring = { type: 'spring', stiffness: 300, damping: 28, mass: 0.9 };

export function GradientStatsHeader({
	someThing,
	hiddenStats,
	innerCn,
	className = '',
	children,
	loadingStats,
	title,
	desc,
	onClick,
	btnName,
	icon: Icon,
	statsCollapsible = false,
}) {
	const { colors } = useTheme();
	const [statsExpanded, setStatsExpanded] = React.useState(true);

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={smoothSpring}
			className={`relative overflow-hidden rounded-3xl border-2 shadow-md backdrop-blur-xl ${className}`}
			style={{
				borderColor: 'var(--color-primary-300)',
			}}
		>

			<div className='absolute inset-0 overflow-hidden'>

				<div
					className='absolute inset-0 opacity-95'
					style={{
						background: `linear-gradient(135deg, var(--color-gradient-from) 0%, var(--color-gradient-via) 50%, var(--color-gradient-to) 100%)`,
					}}
				/>


				<motion.div
					className='absolute inset-0'
					animate={{
						background: [
							`radial-gradient(circle at 20% 20%, var(--color-primary-400) 0%, transparent 50%)`,
							`radial-gradient(circle at 80% 80%, var(--color-secondary-400) 0%, transparent 50%)`,
							`radial-gradient(circle at 20% 20%, var(--color-primary-400) 0%, transparent 50%)`,
						],
					}}
					transition={{
						duration: 8,
						repeat: Infinity,
						ease: 'linear',
					}}
					style={{ opacity: 0.2 }}
				/>


				<div
					className='absolute inset-0 opacity-[0.08]'
					style={{
						backgroundImage:
							'linear-gradient(rgba(255,255,255,.15) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(255,255,255,.15) 1.5px, transparent 1.5px)',
						backgroundSize: '28px 28px',
						backgroundPosition: '-1px -1px',
					}}
				/>


				<motion.div
					className='absolute -top-32 -left-32 h-96 w-96 rounded-full bg-white/15 blur-3xl'
					animate={{
						x: [0, 30, 0],
						y: [0, -20, 0],
						scale: [1, 1.1, 1],
					}}
					transition={{
						duration: 8,
						repeat: Infinity,
						ease: 'easeInOut',
					}}
				/>
				<motion.div
					className='absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-white/10 blur-3xl'
					animate={{
						x: [0, -20, 0],
						y: [0, 20, 0],
						scale: [1, 1.15, 1],
					}}
					transition={{
						duration: 10,
						repeat: Infinity,
						ease: 'easeInOut',
					}}
				/>


				<motion.div
					className='absolute inset-0 opacity-20'
					animate={{
						backgroundPosition: ['0% 0%', '100% 100%'],
					}}
					transition={{
						duration: 3,
						repeat: Infinity,
						ease: 'linear',
					}}
					style={{
						background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
						backgroundSize: '200% 200%',
					}}
				/>
			</div>


			<div className='relative px-6 py-6 sm:px-8 sm:py-8 text-white'>

				<div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${innerCn}`}>
					<div className='flex items-start gap-4'>

						{Icon && (
							<motion.div
								whileHover={{ scale: 1.1, rotate: 5 }}
								className='flex-shrink-0 w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm grid place-content-center shadow-xl border-2 border-white/30'
							>
								<Icon className='w-8 h-8 text-white' strokeWidth={2.5} />
							</motion.div>
						)}


						<div className='flex-1 min-w-0'>
							<motion.h1
								initial={{ opacity: 0, x: -20 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: 0.1 }}
								className='text-2xl md:text-4xl font-black text-white mb-2 flex items-center gap-3'
							>
								{title}
								<motion.div
									animate={{
										rotate: [0, 5, -5, 0],
										scale: [1, 1.1, 1],
									}}
									transition={{
										duration: 2,
										repeat: Infinity,
										ease: 'easeInOut',
									}}
								>
									<Sparkles className='w-6 h-6 md:w-8 md:h-8 text-yellow-300' />
								</motion.div>
							</motion.h1>
							{desc && (
								<motion.p
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: 0.2 }}
									className='text-white/90 text-sm md:text-base font-medium max-w-2xl'
								>
									{desc}
								</motion.p>
							)}
						</div>
					</div>


					<div className='flex items-center gap-3'>
						{someThing}
						{btnName && (
							<motion.button
								whileHover={{ scale: 1.05, y: -2 }}
								whileTap={{ scale: 0.95 }}
								onClick={onClick}
								className='group relative inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white border-2 border-white/30 bg-white/20 hover:bg-white/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all overflow-hidden'
							>

								<motion.div
									className='absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent'
									animate={{
										x: ['-100%', '100%'],
									}}
									transition={{
										duration: 2,
										repeat: Infinity,
										ease: 'linear',
									}}
								/>

								<motion.div
									whileHover={{ rotate: 90 }}
									transition={spring}
									className='relative z-10'
								>
									<Plus size={18} strokeWidth={3} />
								</motion.div>
								<span className='relative z-10'>{btnName}</span>


								<div className='absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl bg-white/30' />
							</motion.button>
						)}
					</div>
				</div>


				{children && (
					<div className='mt-6'>

						{statsCollapsible && (
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={() => setStatsExpanded(!statsExpanded)}
								className='mb-4 inline-flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white transition-colors'
							>
								<TrendingUp className='w-4 h-4' />
								<span>{statsExpanded ? 'Hide' : 'Show'} Statistics</span>
								<motion.div
									animate={{ rotate: statsExpanded ? 180 : 0 }}
									transition={spring}
								>
									<ChevronDown className='w-4 h-4' />
								</motion.div>
							</motion.button>
						)}

						<AnimatePresence>
							{(!statsCollapsible || statsExpanded) && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: 'auto' }}
									exit={{ opacity: 0, height: 0 }}
									transition={smoothSpring}
									className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${hiddenStats && 'max-md:hidden'}`}
								>
									{loadingStats ? <KpiSkeleton /> : children}
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				)}
			</div>


			<div className='absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent' />
		</motion.div>
	);
}

// Enhanced KPI Skeleton with theme colors
function KpiSkeleton() {
	return (
		<>
			{Array.from({ length: 4 }).map((_, i) => (
				<motion.div
					key={i}
					initial={{ opacity: 0, scale: 0.9 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: i * 0.1, ...smoothSpring }}
					className='relative overflow-hidden rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur-sm p-5'
				>

					<motion.div
						className='absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent'
						animate={{
							x: ['-100%', '100%'],
						}}
						transition={{
							duration: 1.5,
							repeat: Infinity,
							ease: 'linear',
							delay: i * 0.2,
						}}
					/>

					<div className='relative flex items-center gap-4'>

						<div className='flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 animate-pulse' />


						<div className='flex-1'>
							<div className='h-3 bg-white/20 rounded-full w-20 mb-2 animate-pulse' />
							<div className='h-5 bg-white/30 rounded-full w-16 animate-pulse' />
						</div>
					</div>
				</motion.div>
			))}
		</>
	);
}

// Enhanced KPI Card Component (for use with GradientStatsHeader)
export function KpiCard({ icon: Icon, label, value, trend, trendValue, loading }) {
	const { colors } = useTheme();

	if (loading) {
		return (
			<div className='relative overflow-hidden rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur-sm p-5'>
				<motion.div
					className='absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent'
					animate={{ x: ['-100%', '100%'] }}
					transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
				/>
				<div className='relative flex items-center gap-4'>
					<div className='w-12 h-12 rounded-xl bg-white/20 animate-pulse' />
					<div className='flex-1'>
						<div className='h-3 bg-white/20 rounded-full w-20 mb-2 animate-pulse' />
						<div className='h-5 bg-white/30 rounded-full w-16 animate-pulse' />
					</div>
				</div>
			</div>
		);
	}

	return (
		<motion.div
			whileHover={{ scale: 1.03, y: -4 }}
			whileTap={{ scale: 0.98 }}
			className='group relative overflow-hidden rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur-sm p-5 cursor-pointer transition-all hover:border-white/40 hover:shadow-2xl'
		>

			<div className='absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />


			<motion.div
				className='absolute top-2 right-2 opacity-0 group-hover:opacity-100'
				initial={{ scale: 0, rotate: 0 }}
				whileHover={{ scale: 1, rotate: 180 }}
				transition={spring}
			>
				<Zap className='w-4 h-4 text-yellow-300' />
			</motion.div>

			<div className='relative flex items-center gap-4'>

				{Icon && (
					<motion.div
						whileHover={{ rotate: 360 }}
						transition={{ duration: 0.6, ease: 'easeInOut' }}
						className='flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 grid place-content-center shadow-lg'
					>
						<Icon className='w-6 h-6 text-white' strokeWidth={2.5} />
					</motion.div>
				)}


				<div className='flex-1 min-w-0'>
					<div className='text-xs font-semibold text-white/80 uppercase tracking-wider mb-1'>
						{label}
					</div>
					<div className='flex items-baseline gap-2'>
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							className='text-2xl font-black text-white'
						>
							{value}
						</motion.div>
						{trend && trendValue && (
							<motion.div
								initial={{ opacity: 0, scale: 0 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ delay: 0.2, ...spring }}
								className={`text-xs font-bold px-2 py-0.5 rounded-full ${trend === 'up'
										? 'bg-green-400/30 text-green-100'
										: 'bg-red-400/30 text-red-100'
									}`}
							>
								{trend === 'up' ? '↑' : '↓'} {trendValue}
							</motion.div>
						)}
					</div>
				</div>
			</div>


			<div className='absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent' />
		</motion.div>
	);
}