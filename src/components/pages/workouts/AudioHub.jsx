'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
	Activity,
	Pause,
	Play,
	Radio,
	Volume2,
	VolumeX,
	Eye,
	EyeOff,
	X,
	ExternalLink,
	Headphones,
	Search,
	Loader2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

/* ------------------------------ utilities  ------------------------------ */
function clsx(...a) {
	return a.filter(Boolean).join(' ');
}

function useLS(key, initialValue) {
	// Always call useState first, unconditionally
	const [val, setVal] = useState(initialValue);

	// Initialize from localStorage only once
	useEffect(() => {
		try {
			if (typeof window !== 'undefined') {
				const stored = window.localStorage.getItem(key);
				if (stored !== null) {
					setVal(JSON.parse(stored));
				}
			}
		} catch {
			// Ignore errors
		}
	}, [key]);

	// Save to localStorage
	useEffect(() => {
		try {
			if (typeof window !== 'undefined') {
				window.localStorage.setItem(key, JSON.stringify(val));
			}
		} catch {
			// Ignore errors
		}
	}, [key, val]);

	return [val, setVal];
}

/* -------------------------- YouTube helpers/API ------------------------- */
const getYouTubeId = u => {
	try {
		const url = new URL(u);
		if (url.hostname.includes('youtube.com')) return url.searchParams.get('v');
		if (url.hostname.includes('youtu.be')) return url.pathname.slice(1);
	} catch { }
	return null;
};

const normalizeYouTube = (arr, t) =>
	(arr || []).map((item, idx) => {
		const id = getYouTubeId(item) || `yt_${idx}`;
		return {
			id,
			url: item,
			title: t('podcastTitle', { n: idx + 1 }),
			embed: id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1` : '',
			thumb: id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '',
		};
	});

let YT_API_LOADING = false;
let YT_API_READY = false;
const ensureYTApi = () =>
	new Promise(resolve => {
		if (YT_API_READY && window.YT && window.YT.Player) return resolve(true);
		if (YT_API_LOADING) {
			const check = setInterval(() => {
				if (YT_API_READY && window.YT && window.YT.Player) {
					clearInterval(check);
					resolve(true);
				}
			}, 50);
			return;
		}
		YT_API_LOADING = true;
		const tag = document.createElement('script');
		tag.src = 'https://www.youtube.com/iframe_api';
		window.onYouTubeIframeAPIReady = () => {
			YT_API_READY = true;
			resolve(true);
		};
		document.head.appendChild(tag);
	});

function YouTubePlayer({ videoId, onReadyQuality = 'hd720', className }) {
	const containerRef = useRef(null);
	const playerRef = useRef(null);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			await ensureYTApi();
			if (cancelled) return;

			if (!playerRef.current && containerRef.current && window.YT && window.YT.Player) {
				playerRef.current = new window.YT.Player(containerRef.current, {
					videoId,
					playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
					events: {
						onReady: ev => {
							try {
								ev.target.setPlaybackQuality(onReadyQuality);
							} catch { }
						},
					},
				});
			} else if (playerRef.current) {
				try {
					playerRef.current.loadVideoById({ videoId, suggestedQuality: onReadyQuality });
				} catch { }
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [videoId, onReadyQuality]);

	return <div ref={containerRef} className={className} />;
}

/* ------------------------------ data seeds ----------------------------- */
const STATIONS = [
	{ name: 'Al-Muaiqly', url: 'https://qurango.net/radio/maher_almuaiqly', tag: 'Recitation' },
	{ name: 'Al-Ajmy', url: 'https://qurango.net/radio/ahmad_alajmy', tag: 'Recitation' },
	{ name: 'Sudais', url: 'https://qurango.net/radio/abdulrahman_alsudaes', tag: 'Recitation' },
	{ name: 'Yasser Al-Dosari', url: 'https://qurango.net/radio/yasser_aldosari', tag: 'Recitation' },
];

const PODCAST_SEED = [
	'https://www.youtube.com/watch?v=kEEpRIMK6Y0&t=1597s',
	'https://www.youtube.com/watch?v=_v05Yc7AdOQ',
	'https://www.youtube.com/watch?v=-W6ijtUgXiU',
	'https://www.youtube.com/watch?v=agFMbV32JIc&t=1516s',
	'https://www.youtube.com/watch?v=_85D3CqkoxA',
	'https://www.youtube.com/watch?v=DdxrQV_bkkY',
	'https://www.youtube.com/watch?v=f8croUJLd3Y&t=152s&pp=0gcJCeAJAYcqIYzv',
	'https://www.youtube.com/watch?v=c6cJ9bbEQa0',
	'https://www.youtube.com/watch?v=2faCQ0oQCG4',
	'https://www.youtube.com/watch?v=63_AOCldyXo&t=3036s',
	'https://www.youtube.com/watch?v=nkil1U1GxdA',
	'https://www.youtube.com/watch?v=zaA_bsanOWw',
	'https://www.youtube.com/watch?v=RvZLqmV9_SI&t=309s&pp=0gcJCeAJAYcqIYzv',
	'https://www.youtube.com/watch?v=yiDqY3YB9RU',
	'https://www.youtube.com/watch?v=5F6sCVhg0uc',
	'https://www.youtube.com/watch?v=b8O3yLCbwTg',
	'https://www.youtube.com/watch?v=bGW1NecvGGc',
	'https://www.youtube.com/watch?v=PEu6zGl7qN4',
	'https://www.youtube.com/watch?v=dxYI6cluroI',
	'https://www.youtube.com/watch?v=y2ShgKJn1NA',
	'https://www.youtube.com/watch?v=RFRLVUb2GUM',
];

/* --------------------------- audio helpers (fix) ------------------------ */
function waitForReady(el, timeout = 7000) {
	return new Promise((resolve, reject) => {
		if (!el) return reject(new Error('no-audio'));
		const done = () => {
			cleanup();
			resolve();
		};
		const tryState = () => {
			if (el.readyState >= 3) done();
		};
		const onCanPlay = () => done();
		const onPlaying = () => done();
		const onLoaded = () => tryState();

		const to = setTimeout(() => {
			cleanup();
			reject(new Error('ready-timeout'));
		}, timeout);

		const cleanup = () => {
			clearTimeout(to);
			el.removeEventListener('canplay', onCanPlay);
			el.removeEventListener('playing', onPlaying);
			el.removeEventListener('loadedmetadata', onLoaded);
			el.removeEventListener('loadeddata', onLoaded);
			el.removeEventListener('canplaythrough', onCanPlay);
		};

		el.addEventListener('canplay', onCanPlay, { once: true });
		el.addEventListener('playing', onPlaying, { once: true });
		el.addEventListener('loadedmetadata', onLoaded);
		el.addEventListener('loadeddata', onLoaded);
		el.addEventListener('canplaythrough', onCanPlay, { once: true });

		tryState();
	});
}

/* =============================== Component ============================== */
export const AudioHubInline = React.memo(function AudioHubInline({ open, onClose, alerting, hidden, setHidden }) {
	const t = useTranslations('audioHub');

	const audioRef = useRef(null);
	const watchdogRef = useRef(null);
	const switchingRef = useRef(false);
	const lastUrlRef = useRef(null);
	const wasPlayingBeforeAlert = useRef(false);

	// persisted UI state
	const [tab, setTab] = useLS('audio.tab', 'stations');
	const [currentStationUrl, setCurrentStationUrl] = useLS('audio.station', STATIONS[0]?.url || '');
	const [volume, setVolume] = useLS('audio.volume', 0.9);
	const [muted, setMuted] = useLS('audio.muted', false);

	// runtime
	const [playing, setPlaying] = useState(false);
	const [loading, setLoading] = useState(false);
	const [errorMsg, setErrorMsg] = useState(null);

	// stations filter (mobile-friendly)
	const [stationQuery, setStationQuery] = useState('');

	// podcasts
	const [podcastsLoading, setPodcastsLoading] = useState(true);
	const [podcastList, setPodcastList] = useState([]);
	const [currentPodcastIdx, setCurrentPodcastIdx] = useState(0);
	const [userWantsEmbed, setUserWantsEmbed] = useState(false);

	// volume apply
	useEffect(() => {
		if (audioRef.current) audioRef.current.volume = muted ? 0 : Number(volume || 0);
	}, [volume, muted]);

	// init podcasts
	useEffect(() => {
		setPodcastsLoading(true);
		const tt = setTimeout(() => {
			setPodcastList(normalizeYouTube(PODCAST_SEED, t));
			setPodcastsLoading(false);
		}, 250);
		return () => clearTimeout(tt);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// pause/resume when alerting state toggles
	useEffect(() => {
		const el = audioRef.current;
		if (!el) return;
		if (alerting) {
			wasPlayingBeforeAlert.current = playing;
			try {
				el.pause();
			} catch { }
			setPlaying(false);
		} else if (wasPlayingBeforeAlert.current) {
			(async () => {
				try {
					setLoading(true);
					await el.play();
					setPlaying(true);
				} catch {
					setPlaying(false);
				} finally {
					setLoading(false);
				}
			})();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [alerting]);

	const clearWatchdog = () => {
		if (watchdogRef.current) {
			clearTimeout(watchdogRef.current);
			watchdogRef.current = null;
		}
	};
	const armWatchdog = (ms = 10000) => {
		clearWatchdog();
		watchdogRef.current = setTimeout(() => {
			setLoading(false);
			setErrorMsg(t('errors.bufferTooLong'));
		}, ms);
	};

	const resetAudio = el => {
		try {
			el.pause();
		} catch { }
		try {
			el.removeAttribute('src');
			el.load();
		} catch { }
	};

	const setSourceAndPlay = async (url, { autoplay = true, bust = false } = {}) => {
		const el = audioRef.current;
		if (!el || switchingRef.current) return;

		switchingRef.current = true;
		setErrorMsg(null);
		setLoading(true);
		setPlaying(false);

		resetAudio(el);

		const finalUrl = bust ? `${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}` : url;
		lastUrlRef.current = finalUrl;

		try {
			el.src = finalUrl;
			await new Promise(r => setTimeout(r, 30));
			el.load();

			armWatchdog(12000);
			await waitForReady(el, 8000).catch(() => { });
			if (autoplay) {
				try {
					await el.play();
					setPlaying(true);
				} catch {
					setPlaying(false);
					setErrorMsg(null);
				}
			}
		} catch {
			setPlaying(false);
			setErrorMsg(t('errors.streamErrorTryAnother'));
		} finally {
			setLoading(false);
			clearWatchdog();
			switchingRef.current = false;
		}
	};

	// when panel closes, stop audio (but keep choice)
	useEffect(() => {
		if (!open && audioRef.current) {
			try {
				audioRef.current.pause();
			} catch { }
			setPlaying(false);
			setLoading(false);
			setErrorMsg(null);
		}
	}, [open]);

	// keep element’s volume in sync
	useEffect(() => {
		if (audioRef.current) audioRef.current.volume = muted ? 0 : Number(volume || 0);
	}, [muted, volume]);

	// initialize the element with the persisted station but do NOT autoplay
	useEffect(() => {
		if (!open) return;
		const el = audioRef.current;
		if (!el) return;
		if (!el.src) {
			setSourceAndPlay(currentStationUrl, { autoplay: false });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	// choose station (user gesture → autoplay allowed)
	const chooseStation = async url => {
		setCurrentStationUrl(url);
		await setSourceAndPlay(url, { autoplay: true });
	};

	// play/pause toggle
	const togglePlay = async () => {
		const el = audioRef.current;
		if (!el) return;
		setErrorMsg(null);

		if (playing) {
			try {
				el.pause();
			} catch { }
			setPlaying(false);
			setLoading(false);
			return;
		}

		if (!el.src) {
			await setSourceAndPlay(currentStationUrl, { autoplay: true });
			return;
		}

		try {
			setLoading(true);
			armWatchdog(9000);
			if (el.readyState < 3) {
				try {
					el.load();
				} catch { }
				await waitForReady(el, 6000).catch(() => { });
			}
			await el.play();
			setPlaying(true);
		} catch {
			try {
				await setSourceAndPlay(currentStationUrl, { autoplay: true, bust: true });
			} catch {
				setPlaying(false);
				setErrorMsg(t('errors.autoplayBlocked'));
			}
		} finally {
			setLoading(false);
			clearWatchdog();
		}
	};
	const activeStation = STATIONS.find(s => s.url === currentStationUrl);
	const filteredStations = useMemo(() => {
		const q = stationQuery.trim().toLowerCase();
		if (!q) return STATIONS;
		return STATIONS.filter(s => (s.name + ' ' + (s.tag || '')).toLowerCase().includes(q));
	}, [stationQuery]);

	const currentPodcast = podcastList[currentPodcastIdx];

	if (!open) return null;


	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0, y: -6 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: -6 }}
				className={clsx('w-full', hidden && 'hidden')}
			>
				<div className='mt-2 -mb-2 rounded-lg border border-slate-200 bg-white/70 backdrop-blur-sm shadow-[0_4px_30px_rgba(0,0,0,0.05)] overflow-hidden'>
					{/* Header */}
					<div className='px-3 py-2 flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-indigo-50/60 to-white'>
						<div className='flex items-center gap-2 font-semibold text-sm text-slate-800'>
							<Headphones size={16} className={clsx('transition', playing ? 'text-indigo-600 animate-pulse' : 'text-indigo-600')} />
							<span>{t('audio')}</span>
							{playing && (
								<span className='ml-1 inline-flex items-center gap-1 text-[10px] font-medium text-indigo-700'>
									<Activity size={12} className='animate-pulse' /> {t('live')}
								</span>
							)}
						</div>

						<div className='flex items-center gap-1'>
							<button
								onClick={() => setHidden(h => !h)}
								className='p-2 rounded-lg hover:bg-slate-100 active:scale-[0.98]'
								title={hidden ? t('actions.showPanelTitle') : t('actions.hidePanelTitle')}
								aria-label={hidden ? t('actions.showPanelAria') : t('actions.hidePanelAria')}
							>
								{hidden ? <Eye size={16} /> : <EyeOff size={16} />}
							</button>

							<button
								onClick={() => {
									try {
										audioRef.current?.pause();
									} catch { }
									setPlaying(false);
									onClose?.();
								}}
								className='p-2 rounded-lg hover:bg-slate-100 active:scale-[0.98]'
								aria-label={t('actions.close')}
								title={t('actions.close')}
							>
								<X size={16} />
							</button>
						</div>
					</div>

					{/* Tabs */}
					<div className='px-3 pt-2'>
						<div className='inline-flex rounded-lg bg-slate-100 p-1 w-full sm:w-auto'>
							{[
								{ key: 'stations', label: t('tabs.stations') },
								{ key: 'podcasts', label: t('tabs.podcasts') },
							].map(tt => {
								const active = tab === tt.key;
								return (
									<button
										key={tt.key}
										onClick={() => setTab(tt.key)}
										className={clsx(
											'relative flex-1 sm:flex-none px-3 py-2 text-xs rounded-lg transition flex items-center justify-center font-medium min-h-[40px]',
											active ? 'text-indigo-700' : 'text-slate-600 hover:text-slate-800'
										)}
										aria-pressed={active}
									>
										{tt.label}
										{active && (
											<motion.span
												layoutId='audTab'
												className='absolute inset-0 -z-10 rounded-lg bg-white shadow'
												transition={{ type: 'spring', stiffness: 400, damping: 32 }}
											/>
										)}
									</button>
								);
							})}
						</div>
					</div>

					{/* Stations */}
					{tab === 'stations' && (
						<div className='p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]'>
							<div className='grid grid-cols-1 md:grid-cols-[320px_1fr] gap-3'>
								{/* Now playing (mobile first) */}
								<div className='order-1 md:order-2 relative w-full rounded-lg overflow-hidden border border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-indigo-100'>
									<div className='pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(60%_60%_at_50%_40%,black,transparent)]'>
										<svg aria-hidden className='absolute inset-0 h-full w-full' viewBox='0 0 400 400'>
											<defs>
												<pattern id='grid' width='24' height='24' patternUnits='userSpaceOnUse'>
													<path d='M 24 0 L 0 0 0 24' fill='none' stroke='currentColor' strokeWidth='0.5' className='text-indigo-200' />
												</pattern>
											</defs>
											<rect width='100%' height='100%' fill='url(#grid)' />
										</svg>
									</div>

									<div className='relative z-10 flex flex-col min-h-[280px] sm:min-h-[320px] md:h-[420px]'>
										<div className='flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200/70 backdrop-blur-sm bg-white/60'>
											<div className='min-w-0'>
												<div className='text-xs text-slate-500'>{t('nowPlaying')}</div>
												<div className='text-sm font-semibold text-slate-900 truncate' title={activeStation?.name || t('stationFallback')}>
													{activeStation?.name || t('stationFallback')}
												</div>
											</div>

											<div className='flex items-center gap-2'>
												<button
													onClick={togglePlay}
													className={clsx(
														'inline-flex items-center justify-center gap-2 rounded-lg px-4 h-11 text-xs font-medium border shadow-sm transition active:scale-[0.99]',
														loading ? 'border-slate-200 bg-white/70 text-slate-500' : 'border-slate-200 bg-white/85 hover:bg-white'
													)}
													aria-busy={loading ? 'true' : 'false'}
													aria-label={loading ? t('states.loading') : playing ? t('actions.pause') : t('actions.play')}
												>
													{loading ? (
														<Loader2 className='w-4 h-4 animate-spin' />
													) : playing ? (
														<>
															<Pause size={14} /> {t('actions.pause')}
														</>
													) : (
														<>
															<Play size={14} /> {t('actions.play')}
														</>
													)}
												</button>

												<button
													onClick={() => setMuted(m => !m)}
													className='inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white/85 hover:bg-white h-11 w-11 active:scale-[0.99]'
													aria-label={muted ? t('actions.unmute') : t('actions.mute')}
													title={muted ? t('actions.unmute') : t('actions.mute')}
												>
													{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
												</button>
											</div>
										</div>

										<div className='flex-1 relative px-4 py-4'>
											<div className='absolute inset-0 grid place-items-center'>
												<div className={clsx('relative flex flex-col items-center justify-center rounded-full', 'h-36 w-36 sm:h-40 sm:w-40 md:h-48 md:w-48', 'bg-white/75 backdrop-blur border border-slate-200 shadow-lg')}>
													<div className='text-[11px] uppercase tracking-wide text-slate-500'>
														{loading ? t('states.buffering') : playing ? t('states.live') : t('states.ready')}
													</div>
													<div className={clsx('mt-2 text-xs font-semibold', playing ? 'text-indigo-700' : 'text-slate-700')}>
														{activeStation?.name || t('stationFallback')}
													</div>

													<button
														onClick={togglePlay}
														className={clsx(
															'mt-4 z-[10] inline-flex items-center justify-center rounded-full h-12 w-12 border shadow-sm transition active:scale-[0.99]',
															loading
																? 'border-slate-200 bg-white/70 text-slate-400'
																: playing
																	? 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
																	: 'border-slate-200 bg-white hover:bg-slate-50 text-slate-900'
														)}
														aria-label={loading ? t('states.loading') : playing ? t('actions.pause') : t('actions.play')}
													>
														{loading ? <Loader2 className='w-5 h-5 animate-spin' /> : playing ? <Pause size={18} /> : <Play size={18} />}
													</button>
												</div>
											</div>

											<div className='h-full flex items-end gap-1 sm:gap-[6px]'>
												{Array.from({ length: 40 }).map((_, i) => {
													const base = 6 + ((i * 19) % 28);
													const h = playing ? base + 12 : base;
													return (
														<span
															key={i}
															className={clsx('flex-1 max-w-[10px] rounded-t', playing ? 'bg-indigo-500/80' : 'bg-slate-300/70', loading && 'animate-pulse')}
															style={{ height: `${h}px` }}
															aria-hidden
														/>
													);
												})}
											</div>
										</div>

										<div className='px-4 pb-4 pt-2 border-t border-slate-200/70 bg-white/70 backdrop-blur-sm'>
											<div className='flex items-center gap-3'>
												<div className='text-xs w-16 shrink-0 text-slate-600'>{t('volume')}</div>
												<input
													type='range'
													min='0'
													max='1'
													step='0.01'
													value={muted ? 0 : Number(volume) || 0}
													onChange={e => setVolume(Number(e.target.value))}
													className='w-full accent-indigo-600'
													title={t('volume')}
													aria-label={t('volume')}
												/>
												<div className='text-[11px] w-10 text-right text-slate-500 tabular-nums'>
													{Math.round((muted ? 0 : Number(volume) || 0) * 100)}%
												</div>
											</div>

											{errorMsg ? (
												<div className='mt-3 text-[11px] text-rose-700 bg-rose-50/90 border border-rose-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2' role='alert' aria-live='polite'>
													<span className='truncate'>{errorMsg}</span>
													<button
														onClick={() => setSourceAndPlay(currentStationUrl, { autoplay: true, bust: true })}
														className='shrink-0 inline-flex items-center gap-1 text-rose-700 hover:text-rose-800 underline decoration-dotted'
													>
														{t('actions.retry')}
													</button>
												</div>
											) : null}
										</div>
									</div>
								</div>

								{/* Stations list */}
								<div className='order-2 md:order-1 rounded-lg border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-indigo-50/60 p-3'>
									<div className='mb-2 flex items-center justify-between'>
										<div className='text-sm font-semibold text-slate-800'>{t('quranStations')}</div>
										<div className='text-[11px] text-slate-600'>{playing ? t('states.playing') : t('states.idle')}</div>
									</div>

									<div className='relative mb-2'>
										<Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
										<input
											className='w-full pl-9 pr-3 py-2.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20'
											placeholder={t('filterPlaceholder')}
											value={stationQuery}
											onChange={e => setStationQuery(e.target.value)}
											aria-label={t('filterAria')}
										/>
									</div>

									<div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-1 gap-2 md:gap-1.5 max-h-[320px] md:max-h-[420px] overflow-auto scrollbar-custom'>
										{filteredStations.length ? (
											filteredStations.map(s => {
												const active = currentStationUrl === s.url;
												return (
													<button
														key={s.url}
														onClick={() => chooseStation(s.url)}
														className={clsx(
															'relative text-left p-3 md:p-2 rounded-lg border transition group active:scale-[0.99]',
															active ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-100' : 'bg-white border-slate-200 hover:bg-slate-50'
														)}
														title={s.name}
													>
														{active && (
															<span className='absolute right-2 top-2 inline-flex items-center gap-1 text-[10px] text-indigo-700'>
																<Radio size={12} className='text-indigo-600' /> {t('live')}
															</span>
														)}
														<div className='text-xs font-medium truncate flex items-center gap-1 pr-8'>{s.name}</div>
														<div className='text-[10px] text-slate-500 truncate'>{s.tag || t('stationTagFallback')}</div>
													</button>
												);
											})
										) : (
											<div className='col-span-full text-xs text-slate-600 bg-white/70 border border-slate-200 rounded-lg p-3'>
												{t('noStationsMatch')}
											</div>
										)}
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Podcasts */}
					{tab === 'podcasts' && (
						<div className='p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]'>
							<div className='grid grid-cols-1 md:grid-cols-[260px_1fr] gap-3'>
								{/* Mobile: horizontal playlist */}
								<div className='md:hidden rounded-lg border border-slate-200 p-2'>
									<div className='text-xs font-semibold text-slate-700 px-1 mb-2'>{t('playlist')}</div>
									<div className='flex gap-2 overflow-x-auto scrollbar-custom pb-1'>
										{podcastsLoading
											? Array.from({ length: 6 }).map((_, i) => (
												<div key={i} className='shrink-0 w-44 flex gap-2 p-2 rounded-lg border border-slate-200'>
													<div className='w-16 h-10 bg-slate-100 animate-pulse rounded-lg' />
													<div className='flex-1 space-y-1'>
														<div className='h-3 w-24 bg-slate-100 animate-pulse rounded' />
														<div className='h-3 w-16 bg-slate-100 animate-pulse rounded' />
													</div>
												</div>
											))
											: podcastList.map((p, i) => (
												<button
													key={p.id}
													onClick={() => {
														setCurrentPodcastIdx(i);
														setUserWantsEmbed(false);
													}}
													className={clsx(
														'shrink-0 w-44 flex gap-2 p-2 rounded-lg text-left border transition active:scale-[0.99]',
														i === currentPodcastIdx ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'
													)}
												>
													<img src={p.thumb} alt='' className='w-16 h-10 object-cover rounded-lg' />
													<div className='min-w-0'>
														<div className='text-xs font-medium text-slate-800 truncate'>{p.title}</div>
														<div className='text-[11px] text-slate-500'>YouTube</div>
													</div>
												</button>
											))}
									</div>
								</div>

								{/* Desktop: sidebar playlist */}
								<div className='hidden md:block rounded-lg border border-slate-200 p-2'>
									<div className='text-xs font-semibold text-slate-700 px-1 mb-2'>{t('playlist')}</div>
									<div className='space-y-1 max-h-[420px] overflow-auto scrollbar-custom'>
										{podcastsLoading
											? Array.from({ length: 6 }).map((_, i) => (
												<div key={i} className='flex gap-2 p-2 rounded-lg border border-slate-200'>
													<div className='w-16 h-10 bg-slate-100 animate-pulse rounded-lg' />
													<div className='flex-1 space-y-1'>
														<div className='h-3 w-24 bg-slate-100 animate-pulse rounded' />
														<div className='h-3 w-16 bg-slate-100 animate-pulse rounded' />
													</div>
												</div>
											))
											: podcastList.map((p, i) => (
												<button
													key={p.id}
													onClick={() => {
														setCurrentPodcastIdx(i);
														setUserWantsEmbed(false);
													}}
													className={clsx(
														'flex gap-2 p-2 rounded-lg w-full text-left border transition active:scale-[0.99]',
														i === currentPodcastIdx ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'
													)}
												>
													<img src={p.thumb} alt='' className='w-16 h-10 object-cover rounded-lg' />
													<div className='min-w-0'>
														<div className='text-xs font-medium text-slate-800 truncate'>{p.title}</div>
														<div className='text-[11px] text-slate-500'>YouTube</div>
													</div>
												</button>
											))}
									</div>
								</div>

								{/* Player */}
								<div className='rounded-lg border border-slate-200 p-2'>
									{podcastsLoading ? (
										<div className='aspect-video w-full rounded-lg overflow-hidden border border-slate-200'>
											<div className='h-full w-full animate-pulse bg-slate-100' />
										</div>
									) : podcastList.length > 0 ? (
										<div className='relative aspect-video w-full rounded-lg overflow-hidden border border-slate-200'>
											{!userWantsEmbed ? (
												<button
													onClick={() => setUserWantsEmbed(true)}
													className='absolute inset-0 z-10 grid place-items-center bg-black/30 text-white text-xs'
													title={t('tapToLoadTitle')}
												>
													{t('tapToLoad')}
												</button>
											) : null}

											{userWantsEmbed ? (
												<YouTubePlayer videoId={currentPodcast.id} onReadyQuality='hd720' className='w-full h-full' />
											) : (
												<img src={currentPodcast.thumb} alt='' className='w-full h-full object-cover' />
											)}

											<a
												href={currentPodcast.url}
												target='_blank'
												rel='noopener noreferrer'
												className='absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-[11px] border border-slate-200 hover:bg-white'
												title={t('openInYouTube')}
											>
												<ExternalLink size={12} /> {t('openInYouTube')}
											</a>
										</div>
									) : (
										<div className='text-xs text-slate-500'>{t('noYouTubeLinksYet')}</div>
									)}
								</div>
							</div>
						</div>
					)}

					{/* Audio element */}
					<audio
						ref={audioRef}
						preload='auto'
						crossOrigin='anonymous'
						onLoadStart={() => {
							setErrorMsg(null);
							setLoading(true);
							armWatchdog(12000);
						}}
						onWaiting={() => {
							setLoading(true);
							armWatchdog(12000);
						}}
						onStalled={() => {
							setLoading(true);
							armWatchdog(12000);
						}}
						onCanPlay={() => {
							clearWatchdog();
							setLoading(false);
						}}
						onCanPlayThrough={() => {
							clearWatchdog();
							setLoading(false);
						}}
						onLoadedMetadata={() => {
							clearWatchdog();
							setLoading(false);
						}}
						onLoadedData={() => {
							clearWatchdog();
							setLoading(false);
						}}
						onPlaying={() => {
							clearWatchdog();
							setLoading(false);
							setPlaying(true);
						}}
						onPause={() => {
							clearWatchdog();
							setPlaying(false);
							setLoading(false);
						}}
						onEnded={() => {
							clearWatchdog();
							setPlaying(false);
							setLoading(false);
						}}
						onError={() => {
							clearWatchdog();
							setLoading(false);
							setPlaying(false);
							setErrorMsg(t('errors.streamErrorTryAnother'));
							try {
								resetAudio(audioRef.current);
							} catch { }
						}}
					/>
				</div>
			</motion.div>
		</AnimatePresence>
	);
});
