'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe } from 'lucide-react';

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

export default function LanguageToggle({ collapsed = false , cn }) {
	const locale = useLocale();
	const router = useRouter();
	const pathname = usePathname();
	const search = useSearchParams();
	const [isPending, startTransition] = useTransition();
	const [focused, setFocused] = useState(false);

	const isEN = locale === 'en';
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

	if (collapsed) {
		return (
			<motion.button
				type='button'
				onClick={toggle}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				aria-label={isEN ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
				className={`relative w-full h-11 rounded-lg border-2 shadow-sm hover:shadow-md active:scale-[0.98] transition-all focus:outline-none overflow-hidden group ${cn}`}
				style={{ 
					background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
					borderColor: 'var(--color-primary-400)',
					boxShadow: `0 4px 12px -2px var(--color-primary-500)`
				}}
				whileTap={{ scale: 0.96 }}
				whileHover={{ scale: 1.02 }}
			>
				{/* Shimmer effect */}
				<motion.span 
					className='pointer-events-none absolute -top-1/2 left-0 right-0 h-full translate-y-1/2 rotate-12 bg-white/20'
					animate={{
						x: ['-100%', '100%']
					}}
					transition={{
						duration: 3,
						repeat: Infinity,
						ease: "linear"
					}}
				/>

				{/* Focus ring */}
				<AnimatePresence>
					{focused && (
						<motion.span
							className='absolute inset-0 rounded-lg ring-2 ring-white/60'
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
						/>
					)}
				</AnimatePresence>

				{/* Globe icon with current locale */}
				<div className={`relative z-10 flex flex-col items-center justify-center h-full text-white `}>
					<Globe className={`w-5 h-5 mb-0.5 ${cn && "hidden"}`} strokeWidth={2.5} />
					<motion.span
						className="text-[10px] font-black tracking-wider"
						animate={{ 
							scale: [1, 1.1, 1]
						}}
						transition={{
							duration: 2,
							repeat: Infinity,
							ease: "easeInOut"
						}}
					>
						{locale.toUpperCase()}
					</motion.span>
				</div>

				{/* Loading overlay */}
				<AnimatePresence>
					{isPending && (
						<motion.span
							className='pointer-events-none absolute inset-0 z-20 rounded-lg bg-white/20 backdrop-blur-sm grid place-items-center'
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
						>
							<motion.div
								animate={{ rotate: 360 }}
								transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
								className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
							/>
						</motion.span>
					)}
				</AnimatePresence>
			</motion.button>
		);
	}

	// Expanded state - full width toggle
	return (
		<motion.button
			type='button'
			onClick={toggle}
			onFocus={() => setFocused(true)}
			onBlur={() => setFocused(false)}
			aria-label={isEN ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
			className="relative w-full h-11 rounded-lg border-2 shadow-sm hover:shadow-md active:scale-[0.98] transition-all focus:outline-none overflow-hidden"
			style={{ 
				background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
				borderColor: 'var(--color-primary-400)',
				boxShadow: `0 4px 12px -2px var(--color-primary-500)`
			}}
			whileTap={{ scale: 0.98 }}
			whileHover={{ scale: 1.01 }}
		>
			{/* Shimmer effect */}
			<motion.span 
				className='pointer-events-none absolute -top-1/2 left-0 right-0 h-full translate-y-1/2 rotate-12 bg-white/20'
				animate={{
					x: ['-100%', '100%']
				}}
				transition={{
					duration: 3,
					repeat: Infinity,
					ease: "linear"
				}}
			/>

			{/* Focus ring */}
			<AnimatePresence>
				{focused && (
					<motion.span
						className='absolute inset-0 rounded-lg ring-2 ring-white/60'
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					/>
				)}
			</AnimatePresence>

			{/* Container for labels and knob */}
			<div className="relative z-10 h-full flex items-center px-2">
				{/* Left side - AR */}
				<motion.div
					className="flex-1 flex items-center justify-center gap-2"
					animate={{ 
						opacity: isEN ? 0.6 : 1,
						scale: isEN ? 0.95 : 1
					}}
					transition={{ duration: 0.2 }}
				>
					<Globe className={`w-4 h-4 text-white ${isEN ? 'stroke-white' : 'stroke-slate-900'}`} strokeWidth={2.5} />
					<span className={`text-sm font-black tracking-wide ${isEN ? 'text-white' : 'text-slate-900'}`}>
						العربية
					</span>
				</motion.div>

				{/* Divider */}
				<div className="h-6 w-px bg-white/30" />

				{/* Right side - EN */}
				<motion.div
					className="flex-1 flex items-center justify-center gap-2"
					animate={{ 
						opacity: !isEN ? 0.6 : 1,
						scale: !isEN ? 0.95 : 1
					}}
					transition={{ duration: 0.2 }}
				>
					<Globe className={`w-4 h-4 text-white ${!isEN ? 'stroke-white' : 'stroke-slate-900'}`} strokeWidth={2.5} />
					<span className={`text-sm font-black tracking-wide ${!isEN ? 'text-white ' : 'text-slate-900'}`}>
						English
					</span>
				</motion.div>

				{/* Sliding background indicator */}
				<motion.div
					className="absolute top-1 bottom-1 rounded-lg bg-[var(--primary-color-50)/30] shadow-lg"
					initial={false}
					animate={{
						left: isEN ? 'calc(50% + 1px)' : '4px',
						right: isEN ? '4px' : 'calc(50% + 1px)',
					}}
					transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.7 }}
				>
					<span className='pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-br from-white/70 to-white/40' />
					
					{/* Animated glow */}
					<motion.span
						className='absolute inset-0 rounded-lg'
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
				</motion.div>
			</div>

			{/* Loading overlay */}
			<AnimatePresence>
				{isPending && (
					<motion.span
						className='pointer-events-none absolute inset-0 z-20 rounded-lg bg-white/20 backdrop-blur-sm grid place-items-center'
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					>
						<motion.div
							animate={{ rotate: 360 }}
							transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
							className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
						/>
					</motion.span>
				)}
			</AnimatePresence>
		</motion.button>
	);
}