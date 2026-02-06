'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/app/[locale]/theme';
/* ---------------- helpers: lang & cookie & dir ---------------- */
function setDocumentLangDir(nextLocale) {
	if (typeof document === 'undefined') return;
	document.documentElement.lang = nextLocale;
	document.documentElement.dir = nextLocale === 'ar' ? 'rtl' : 'ltr';
}

function setLocaleCookie(nextLocale) {
	if (typeof document === 'undefined') return;
	document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;
}

function showGlobalLoader(durationMs = 1200) {
	if (typeof document === 'undefined') return;
	const existing = document.getElementById('lang-switch-loader');
	if (existing) existing.remove();

	const root = document.createElement('div');
	root.id = 'lang-switch-loader';
	root.className = 'fixed inset-0 z-[9999] grid place-items-center backdrop-blur-sm bg-black/40';
	root.innerHTML = `
		<div class="relative">
			<div class="h-16 w-16 rounded-full border-4 border-white/30 border-t-white animate-spin"></div>
			<div class="absolute inset-0 rounded-full animate-ping bg-white/10"></div>
		</div>
	`;
	document.body.appendChild(root);
	setTimeout(() => root.remove(), durationMs);
}

function swapLocaleInPath(pathname, nextLocale) {
	const segs = pathname.split('/').filter(Boolean);
	if (segs.length && (segs[0] === 'en' || segs[0] === 'ar')) {
		segs[0] = nextLocale;
		return '/' + segs.join('/');
	}
	return '/' + [nextLocale, ...segs].join('/');
}

export default function LanguageToggle({ className = '', size = 35 }) {
	const locale = useLocale();
	const router = useRouter();
	const pathname = usePathname();
	const search = useSearchParams();
	const [isPending, startTransition] = useTransition();
	const [focused, setFocused] = useState(false);
	const { colors } = useTheme();

	const isEN = locale === 'en';
	const W = Math.max(72, Math.floor(size * 2.0));
	const H = Math.max(28, Math.floor(size));
	const knob = H - 6;

	const nextLocale = isEN ? 'ar' : 'en';
	const nextHref = useMemo(() => {
		const base = swapLocaleInPath(pathname || '/', nextLocale);
		const qs = search?.toString();
		return qs ? `${base}?${qs}` : base;
	}, [pathname, search, nextLocale]);

	function toggle() {
		startTransition(() => {
			showGlobalLoader(1100);
			setLocaleCookie(nextLocale);
			setDocumentLangDir(nextLocale);
			router.replace(nextHref);
			router.refresh();
		});
	}

	useEffect(() => {
		setDocumentLangDir(locale);
	}, [locale]);

	return (
		<motion.button
			type='button'
			onClick={toggle}
			onFocus={() => setFocused(true)}
			onBlur={() => setFocused(false)}
			aria-label={isEN ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
			className={[
				'relative inline-flex select-none items-center rounded-md',
				'border-2 shadow-sm hover:shadow-md',
				'active:scale-[0.98] transition-all',
				'focus:outline-none',
				className
			].join(' ')}
			style={{ 
				height: H, 
				width: W,
				background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
				borderColor: 'var(--color-primary-400)',
				boxShadow: `0 4px 12px -2px var(--color-primary-500)`
			}}
			whileTap={{ scale: 0.96 }}
			whileHover={{ scale: 1.02 }}
		>
			{/* Shimmer effect */}
			<span className='pointer-events-none absolute inset-0 overflow-hidden rounded-xl'>
				<motion.span 
					className='absolute -top-1/2 left-0 right-0 h-full translate-y-1/2 rotate-12 bg-white/20'
					animate={{
						x: ['-100%', '100%']
					}}
					transition={{
						duration: 3,
						repeat: Infinity,
						ease: "linear"
					}}
				/>
				<AnimatePresence>
					{focused && (
						<motion.span
							className='absolute inset-0 rounded-xl ring-2 ring-white/60'
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
						/>
					)}
				</AnimatePresence>
			</span>

			{/* Labels */}
			<div dir='ltr' className='relative z-10 flex w-full items-center justify-between px-2 text-[12px] font-black text-white tracking-wide'>
				<motion.span
					aria-hidden
					className={`${isEN ? 'opacity-60' : 'opacity-100 text-slate-900'} font-en mt-1`}
					animate={{ 
						opacity: isEN ? 0.6 : 1,
						scale: isEN ? 0.9 : 1
					}}
					transition={{ duration: 0.2 }}
				>
					AR
				</motion.span>
				<motion.span
					aria-hidden
					className={`${!isEN ? 'opacity-60' : 'opacity-100 text-slate-900'} font-en mt-1`}
					animate={{ 
						opacity: !isEN ? 0.6 : 1,
						scale: !isEN ? 0.9 : 1
					}}
					transition={{ duration: 0.2 }}
				>
					EN
				</motion.span>
			</div>

			{/* Knob */}
			<motion.span
				layout
				className='absolute rounded-sm bg-white shadow-lg'
				style={{
					width: knob,
					height: knob,
					top: 1,
					left: isEN ? W - knob - 5 : 1,
				}}
				transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.7 }}
			>
				<span className='pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-white/70 to-white/40' />
				
				{/* Animated glow on knob */}
				<motion.span
					className='absolute inset-0 rounded-xl'
					animate={{
						boxShadow: [
							'0 0 0 0 rgba(255,255,255,0.4)',
							'0 0 0 4px rgba(255,255,255,0)',
						]
					}}
					transition={{
						duration: 1.5,
						repeat: Infinity,
						ease: "easeInOut"
					}}
				/>
			</motion.span>

			{/* Loading overlay */}
			<AnimatePresence>
				{isPending && (
					<motion.span
						className='pointer-events-none absolute inset-0 z-10 rounded-xl bg-white/20 backdrop-blur-sm grid place-items-center'
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					>
						<motion.div
							animate={{ rotate: 360 }}
							transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
							className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
						/>
					</motion.span>
				)}
			</AnimatePresence>
		</motion.button>
	);
}