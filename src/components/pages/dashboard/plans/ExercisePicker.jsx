'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Check, Clock, Dumbbell, ListChecks, PlayCircle, RefreshCw, Search, Tag, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import api from '@/utils/axios';
import Button from '@/components/atoms/Button';
import FloatingInput from '@/components/atoms/FloatingInput';
import Img from '@/components/atoms/Img';
import MultiLangText from '@/components/atoms/MultiLangText';
import { TablePagination } from '@/components/atoms/Datatable';
import useDebounced from '@/hooks/useDebounced';
import { categoryLabel, exerciseVideoSrc } from '@/lib/exercise-categories';

const PER_PAGE_OPTIONS = [12, 20, 40];
const GLASS = { background: 'color-mix(in srgb, var(--gm-paper) 82%, transparent)' };

const PickerCard = memo(function PickerCard({ exercise: e, checked, onToggle, onVideo, locale, t }) {
	return (
		<motion.div
			layout='position'
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.18 }}
			className='gm-media-card group'
			style={checked ? { borderColor: 'var(--color-primary-500)', boxShadow: '0 0 0 3px color-mix(in srgb, var(--color-primary-500) 18%, transparent)' } : undefined}
		>
			<button
				type='button'
				onClick={() => onToggle(e)}
				aria-pressed={checked}
				className='flex flex-1 flex-col text-start focus-visible:outline-none'
			>
				<div className='gm-media-card__media aspect-4/3!'>
					{e.img ? (
						<Img src={e.img} alt='' showBlur={false} loading='lazy' className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105' />
					) : (
						<span className='grid h-full place-items-center text-(--color-primary-300)'><Dumbbell className='size-8' strokeWidth={1.5} /></span>
					)}
					<span className='gm-media-card__shade' />
					<span
						className={`absolute end-2 top-2 grid size-6 place-items-center rounded-full border transition-all ${checked ? 'scale-100 border-transparent text-white' : 'border-white/70 bg-black/20 text-transparent backdrop-blur-sm'}`}
						style={checked ? { background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' } : undefined}
						aria-hidden
					>
						<Check className='size-3.5' strokeWidth={2.75} />
					</span>
					{e.category && (
						<span className='gm-media-badge absolute bottom-2 start-2 max-w-[calc(100%-1rem)]'>
							<Tag className='size-3 shrink-0' />
							<span className='truncate'>{categoryLabel(e.category, locale)}</span>
						</span>
					)}
				</div>
				<div className='p-3'>
					<MultiLangText className='block truncate text-[13px] font-bold gm-ink'>{e.name}</MultiLangText>
					<p className='mt-1 flex items-center gap-2 font-en text-[11.5px] tabular-nums gm-muted' dir='ltr'>
						<span>{e.targetSets ?? 3} × {e.targetReps || '—'}</span>
						<span className='inline-flex items-center gap-1'><Clock className='size-3' />{e.rest ?? 90}{t('builder.secondsShort')}</span>
					</p>
				</div>
			</button>
			{e.video && (
				<button
					type='button'
					onClick={() => onVideo(e)}
					aria-label={t('picker.previewVideo')}
					title={t('picker.previewVideo')}
					className='gm-media-icon absolute start-2 top-2 size-7! transition hover:scale-105'
				>
					<PlayCircle className='size-3.5' />
				</button>
			)}
		</motion.div>
	);
});

export const ExercisePicker = memo(function ExercisePicker({ open, onClose, onDone, dayId, initialSelected = [] }) {
	const t = useTranslations('workoutPlans');
	const locale = useLocale();
	const closeRef = useRef(null);

	const [categories, setCategories] = useState([]);
	const [activeCat, setActiveCat] = useState('all');
	const [search, setSearch] = useState('');
	const debounced = useDebounced(search, 300);
	const [page, setPage] = useState(1);
	const [perPage, setPerPage] = useState(20);

	const [items, setItems] = useState([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(false);
	const [err, setErr] = useState(null);
	const [selected, setSelected] = useState({});
	const [video, setVideo] = useState(null);

	const reqId = useRef(0);
	const abortRef = useRef(null);
	const selectedCount = Object.keys(selected).length;

	useEffect(() => {
		if (!open) return;
		const map = {};
		for (const ex of initialSelected) map[ex.id] = ex;
		setSelected(map);
	}, [open, dayId, initialSelected]);

	const fetchCategories = useCallback(async () => {
		try {
			const res = await api.get('/plan-exercises/categories');
			setCategories((Array.isArray(res.data) ? res.data : []).filter(Boolean));
		} catch {
			setCategories([]);
		}
	}, []);

	const fetchList = useCallback(async () => {
		abortRef.current?.abort();
		const ctrl = new AbortController();
		abortRef.current = ctrl;
		const myId = ++reqId.current;
		setLoading(true);
		setErr(null);
		try {
			const params = { page, limit: perPage, sortBy: 'created_at', sortOrder: 'DESC' };
			if (debounced.trim()) params.search = debounced.trim();
			if (activeCat !== 'all') params.category = activeCat;
			const res = await api.get('/plan-exercises', { params, signal: ctrl.signal });
			if (myId !== reqId.current) return;
			const data = res.data || {};
			const records = Array.isArray(data.records) ? data.records : Array.isArray(data) ? data : [];
			setItems(records);
			setTotal(Number(data.total_records ?? records.length) || 0);
		} catch (e) {
			if (e?.name === 'CanceledError' || myId !== reqId.current) return;
			setItems([]);
			setTotal(0);
			setErr(e?.response ? e.response.data?.message || t('errors.loadExercises') : t('errors.serverUnreachable'));
		} finally {
			if (myId === reqId.current) setLoading(false);
		}
	}, [page, perPage, debounced, activeCat, t]);

	useEffect(() => { if (open) fetchCategories(); }, [open, fetchCategories]);
	useEffect(() => { if (open) fetchList(); }, [open, fetchList]);
	useEffect(() => () => abortRef.current?.abort(), []);

	useEffect(() => {
		if (!open) return undefined;
		const focus = setTimeout(() => closeRef.current?.focus(), 0);
		const onKey = e => {
			if (e.key !== 'Escape') return;
			e.stopPropagation();
			if (video) setVideo(null);
			else onClose?.();
		};
		window.addEventListener('keydown', onKey, true);
		return () => {
			clearTimeout(focus);
			window.removeEventListener('keydown', onKey, true);
		};
	}, [open, video, onClose]);

	const tabs = useMemo(() => [
		{ id: 'all', label: t('filters.all') },
		...categories.map(c => ({ id: c, label: categoryLabel(c, locale) })),
	], [categories, t, locale]);

	const toggle = useCallback(ex => {
		setSelected(prev => {
			const next = { ...prev };
			if (next[ex.id]) delete next[ex.id];
			else next[ex.id] = ex;
			return next;
		});
	}, []);

	const onSearch = v => { setSearch(v); setPage(1); };
	const onTab = id => { setActiveCat(id); setPage(1); };
	const onPageChange = ({ page: nextPage, per_page }) => {
		const lim = Number(per_page || perPage);
		if (lim !== perPage) { setPerPage(lim); setPage(1); }
		else setPage(Number(nextPage || 1));
	};
	const handleDone = () => {
		onDone?.(Object.values(selected));
		onClose?.();
	};

	if (typeof document === 'undefined') return null;

	return createPortal(
		<AnimatePresence>
			{open ? (
				<motion.div
					key='exercise-picker'
					role='dialog'
					aria-modal='true'
					aria-label={t('picker.dialogAria')}
					className='dashboard-icy gm-surface fixed inset-0 z-1000000000 flex flex-col'
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 12 }}
					transition={{ duration: 0.2, ease: [0.2, 0.75, 0.25, 1] }}
				>
					<header className='border-b border-(--gm-line) backdrop-blur-xl' style={GLASS}>
						<div className='mx-auto max-w-7xl space-y-3.5 px-4 py-4 sm:px-6'>
							<div className='flex flex-wrap items-center gap-3'>
								<span className='gm-plan__icon shrink-0'><ListChecks className='size-5' /></span>
								<div className='min-w-0 flex-1'>
									<h2 className='gm-display text-[20px] font-bold leading-tight gm-ink md:text-[24px]'>{t('picker.title')}</h2>
									<p className='mt-0.5 text-[12.5px] gm-muted'>{t('picker.subtitle')}</p>
								</div>
								<button
									ref={closeRef}
									type='button'
									onClick={onClose}
									aria-label={t('actions.close')}
									className='grid size-10 shrink-0 place-items-center rounded-[11px] border border-(--gm-line) gm-ink-soft transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary-50)_80%,transparent)] sm:order-last'
								>
									<X className='size-4.5' />
								</button>
								<FloatingInput
									className='w-full sm:w-[320px]'
									label={t('picker.searchPlaceholder')}
									value={search}
									onChange={onSearch}
									icon={<Search className='size-4' />}
								/>
							</div>
							{tabs.length > 1 && (
								<div role='tablist' aria-label={t('picker.title')} className='gm-tabs'>
									{tabs.map(tab => (
										<button
											key={tab.id}
											type='button'
											role='tab'
											aria-selected={activeCat === tab.id}
											onClick={() => onTab(tab.id)}
											className={`gm-tab ${activeCat === tab.id ? 'is-on' : ''}`}
										>
											{tab.label}
										</button>
									))}
								</div>
							)}
						</div>
					</header>

					<main className='flex-1 overflow-y-auto'>
						<div className='mx-auto max-w-7xl px-4 py-5 sm:px-6'>
							{err ? (
								<div className='flex flex-wrap items-center gap-2 rounded-[14px] border border-rose-200/60 bg-[color-mix(in_srgb,var(--gm-danger)_8%,var(--gm-paper))] px-3.5 py-3 text-sm text-rose-700'>
									<AlertCircle className='size-4 shrink-0' />
									<span className='min-w-0 flex-1'>{err}</span>
									<button type='button' onClick={fetchList} disabled={loading} className='gm-btn-ghost gm-btn-compact inline-flex items-center gap-1.5 disabled:opacity-60'>
										<RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
										{t('actions.retry')}
									</button>
								</div>
							) : loading ? (
								<div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
									{Array.from({ length: 10 }).map((_, i) => (
										<div key={i} className='gm-media-card'>
											<div className='gm-skel aspect-4/3 rounded-none!' />
											<div className='space-y-2 p-3'>
												<span className='gm-skel block h-3.5 w-4/5' />
												<span className='gm-skel block h-3 w-1/2' />
											</div>
										</div>
									))}
								</div>
							) : items.length ? (
								<div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
									{items.map(e => (
										<PickerCard key={e.id} exercise={e} checked={!!selected[e.id]} onToggle={toggle} onVideo={setVideo} locale={locale} t={t} />
									))}
								</div>
							) : (
								<div className='mx-auto flex max-w-sm flex-col items-center gap-2 rounded-2xl border border-dashed border-(--gm-line) px-6 py-12 text-center' style={GLASS}>
									<span className='gm-plan__icon'><Dumbbell className='size-5' /></span>
									<h3 className='text-[14px] font-bold gm-ink'>{t('picker.noExercisesTitle')}</h3>
									<p className='text-[12.5px] gm-muted'>{t('picker.noExercisesDesc')}</p>
								</div>
							)}
						</div>
					</main>

					<footer className='border-t border-(--gm-line) backdrop-blur-xl' style={GLASS}>
						<div className='mx-auto flex max-w-7xl flex-col-reverse items-stretch gap-2 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-6'>
							<div className='min-w-0 [&>div]:px-0 [&>div]:py-2'>
								{total > 0 && !err && (
									<TablePagination
										pagination={{ current_page: page, per_page: perPage, total_records: total }}
										onPageChange={onPageChange}
										isLoading={loading}
										perPageOptions={PER_PAGE_OPTIONS}
										persistLimit={false}
									/>
								)}
							</div>
							<div className='flex items-center justify-end gap-2.5 py-1'>
								{selectedCount > 0 && (
									<button type='button' onClick={() => setSelected({})} className='me-auto text-[12px] font-semibold text-(--color-primary-600) hover:underline sm:me-0'>
										{t('actions.clear')}
									</button>
								)}
								<Button color='neutral' name={t('actions.close')} onClick={onClose} />
								<Button
									color='primary'
									name={t('picker.addSelected', { count: selectedCount })}
									onClick={handleDone}
									disabled={!selectedCount}
									icon={<Check className='size-4' />}
								/>
							</div>
						</div>
					</footer>

					<AnimatePresence>
						{video && (
							<motion.div
								className='fixed inset-0 z-10 grid place-items-center bg-black/75 p-4 backdrop-blur-sm'
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								onClick={() => setVideo(null)}
							>
								<motion.div
									initial={{ scale: 0.97, y: 8 }}
									animate={{ scale: 1, y: 0 }}
									exit={{ scale: 0.98, y: 6 }}
									className='relative w-full max-w-3xl overflow-hidden rounded-2xl bg-black shadow-2xl'
									onClick={e => e.stopPropagation()}
								>
									<div className='flex items-center gap-2 px-4 py-2.5 text-white'>
										<PlayCircle className='size-4 shrink-0' />
										<MultiLangText className='min-w-0 flex-1 truncate text-[13px] font-semibold'>{video.name}</MultiLangText>
										<button
											type='button'
											onClick={() => setVideo(null)}
											aria-label={t('actions.close')}
											className='grid size-8 place-items-center rounded-full bg-white/10 transition hover:bg-white/20'
										>
											<X className='size-4' />
										</button>
									</div>
									<video src={exerciseVideoSrc(video.video)} controls autoPlay className='aspect-video w-full bg-black' preload='metadata' />
								</motion.div>
							</motion.div>
						)}
					</AnimatePresence>
				</motion.div>
			) : null}
		</AnimatePresence>,
		document.body,
	);
});
