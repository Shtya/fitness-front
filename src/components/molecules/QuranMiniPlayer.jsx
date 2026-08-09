'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
	Play, Pause, X, Volume2, VolumeX, ChevronUp, BookOpen, Mic2,
} from 'lucide-react';
import {
	subscribe,
	getSnapshot,
	togglePlay,
	stop,
	setHidden,
	setVolume,
	setMuted,
	setReciter,
} from '@/lib/quran-bg-player';

function useQuranBg() {
	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Floating mini bar — continues Quran audio after leaving /quran-revision.
 */
export default function QuranMiniPlayer() {
	const snap = useQuranBg();
	const pathname = usePathname() || '';
	const locale = useLocale();
	const isAr = locale === 'ar' || String(locale).startsWith('ar');
	const [reciterOpen, setReciterOpen] = useState(false);

	const onQuranPage = pathname.includes('/quran-revision');
	const show =
		snap.active &&
		!snap.studioMounted &&
		!onQuranPage &&
		!snap.hidden;

	useEffect(() => {
		if (!show) setReciterOpen(false);
	}, [show]);

	if (snap.active && !snap.studioMounted && !onQuranPage && snap.hidden) {
		return (
			<button
				type="button"
				onClick={() => setHidden(false)}
				className="fixed bottom-4 end-4 z-[190000] inline-flex items-center gap-2 rounded-full px-3.5 py-2.5 text-white text-xs font-bold shadow-lg"
				style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
				title={isAr ? 'إظهار مشغّل القرآن' : 'Show Quran player'}
			>
				<BookOpen size={14} />
				{isAr ? 'قرآن' : 'Quran'}
				{snap.playing ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" /> : null}
			</button>
		);
	}

	if (!show) return null;

	const surahName = isAr ? snap.surahNameAr : snap.surahNameEn;
	const reciterName = isAr ? snap.reciterNameAr : snap.reciterNameEn;

	return (
		<div
			className="fixed inset-x-0 bottom-0 z-[190000] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none"
			dir={isAr ? 'rtl' : 'ltr'}
		>
			<div
				className="pointer-events-auto mx-auto max-w-lg rounded-2xl border border-white/20 shadow-2xl backdrop-blur-xl text-white overflow-hidden"
				style={{
					background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-gradient-from) 92%, #0f172a), color-mix(in srgb, var(--color-gradient-to) 88%, #0f172a))',
				}}
			>
				<div className="flex items-center gap-2.5 px-3 py-2.5">
					<span className="w-9 h-9 rounded-xl grid place-items-center bg-white/15 shrink-0">
						<BookOpen size={16} />
					</span>
					<div className="min-w-0 flex-1">
						<p className="text-xs font-black truncate">
							{surahName || (isAr ? 'القرآن' : 'Quran')}
							{snap.ayahN != null ? (
								<span className="opacity-75 font-semibold"> · {isAr ? 'آية' : 'Ayah'} {snap.ayahN}</span>
							) : null}
						</p>
						<p className="text-[10px] font-semibold opacity-80 truncate flex items-center gap-1">
							<Mic2 size={10} />
							{reciterName}
						</p>
					</div>

					<button
						type="button"
						onClick={togglePlay}
						className="w-9 h-9 rounded-full bg-white text-slate-900 grid place-items-center shrink-0 shadow"
						aria-label={snap.playing ? 'Pause' : 'Play'}
					>
						{snap.playing ? <Pause size={16} /> : <Play size={16} className="ms-0.5" />}
					</button>

					<button
						type="button"
						onClick={() => setMuted(!snap.muted)}
						className="w-8 h-8 rounded-lg bg-white/10 grid place-items-center shrink-0"
						aria-label="Mute"
					>
						{snap.muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
					</button>

					<button
						type="button"
						onClick={() => setReciterOpen(v => !v)}
						className="h-8 px-2 rounded-lg bg-white/10 text-[10px] font-bold shrink-0 max-w-[5.5rem] truncate"
						title={isAr ? 'تغيير القارئ' : 'Change reciter'}
					>
						{isAr ? 'قارئ' : 'Reciter'}
					</button>

					<button
						type="button"
						onClick={() => setHidden(true)}
						className="w-8 h-8 rounded-lg bg-white/10 grid place-items-center shrink-0"
						title={isAr ? 'إخفاء' : 'Hide'}
						aria-label="Hide"
					>
						<ChevronUp size={15} />
					</button>

					<button
						type="button"
						onClick={stop}
						className="w-8 h-8 rounded-lg bg-white/10 grid place-items-center shrink-0 hover:bg-red-500/40"
						title={isAr ? 'إيقاف' : 'Stop'}
						aria-label="Stop"
					>
						<X size={15} />
					</button>
				</div>

				<div className="px-3 pb-2.5 flex items-center gap-2">
					<input
						type="range"
						min={0}
						max={1}
						step={0.01}
						value={snap.muted ? 0 : snap.volume}
						onChange={e => {
							setMuted(false);
							setVolume(Number(e.target.value));
						}}
						className="flex-1 h-1 accent-white cursor-pointer"
						aria-label="Volume"
					/>
				</div>

				{reciterOpen ? (
					<div className="max-h-40 overflow-y-auto border-t border-white/15 bg-black/20 px-2 py-1.5">
						{snap.reciters.map(r => (
							<button
								key={r.id}
								type="button"
								onClick={() => {
									setReciter(r.id);
									setReciterOpen(false);
								}}
								className={`w-full text-start px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
									r.id === snap.reciterId
										? 'bg-white/20 text-white'
										: 'text-white/80 hover:bg-white/10'
								}`}
							>
								{isAr ? r.nameAr : r.nameEn}
							</button>
						))}
					</div>
				) : null}
			</div>
		</div>
	);
}
