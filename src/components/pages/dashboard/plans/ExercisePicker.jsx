// File: ExercisePicker.jsx
import React, { memo, useEffect, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Dumbbell, Search, X, Tag, Check, PlayCircle } from 'lucide-react';
import { PrettyPagination } from '@/components/dashboard/ui/Pagination';
import { TabsPill } from '@/components/dashboard/ui/UI';
import useDebounced from '@/hooks/useDebounced';
import { Notification } from '@/config/Notification';
import api from '@/utils/axios';
import Img from '@/components/atoms/Img';
import { useTranslations } from 'next-intl';
import MultiLangText from '@/components/atoms/MultiLangText';

const overlaySpring = { type: 'spring', stiffness: 200, damping: 24 };
const spring = { type: 'spring', stiffness: 360, damping: 30, mass: 0.7 };

export const ExercisePicker = memo(function ExercisePicker({ open, onClose, onDone, dayId, initialSelected = [] }) {
	const t = useTranslations('workoutPlans');

	const [categories, setCategories] = useState([]);
	const [activeCat, setActiveCat] = useState('all');

	const [searchText, setSearchText] = useState('');
	const debounced = useDebounced(searchText, 300);

	const [page, setPage] = useState(1);
	const [perPage, setPerPage] = useState(20);
	const [sortBy] = useState('created_at');
	const [sortOrder] = useState('DESC');

	const [items, setItems] = useState([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(false);

	const [selected, setSelected] = useState({});
	const selectedCount = useMemo(() => Object.keys(selected).length, [selected]);
	useEffect(() => {
		if (open && dayId) {
			const map = {};
			for (const ex of initialSelected) {
				map[ex.id] = {
					id: ex.id,
					name: ex.name,
					category: ex.category || null,
				};
			}
			setSelected(map);
		}
	}, [open, dayId, initialSelected]);

	const toggle = useCallback(
		ex => {
			setSelected(prev => {
				const next = { ...prev };
				if (next[ex.id]) {
					// already selected -> remove
					delete next[ex.id];
				} else {
					// not selected -> add
					next[ex.id] = {
						id: ex.id,
						name: ex.name,
						category: ex.category || null,
					};
				}
				return next;
			});
		},
		[setSelected],
	);

	const handleDone = useCallback(() => {
		onDone?.(Object.values(selected));
		onClose?.();
	}, [selected, onDone, onClose]);

	const totalPages = Math.max(1, Math.ceil(total / Math.max(1, perPage)));

	const tabs = useMemo(() => [{ key: 'all', label: t('picker.all') }, ...categories.map(c => ({ key: c, label: c }))], [categories, t]);

	const fetchCategories = useCallback(async () => {
		try {
			const res = await api.get('/plan-exercises/categories');
			setCategories((Array.isArray(res.data) ? res.data : []).filter(Boolean));
		} catch {
			setCategories([]);
		}
	}, []);

	const fetchList = useCallback(async () => {
		setLoading(true);
		try {
			const params = { page, limit: perPage, sortBy, sortOrder };
			if (debounced) params.search = debounced;
			if (activeCat !== 'all') params.category = activeCat;

			const res = await api.get('/plan-exercises', { params });
			const data = res.data || {};

			let records = [];
			let totalRecords = 0;
			let serverPer = perPage;

			if (Array.isArray(data.records)) {
				records = data.records;
				totalRecords = Number(data.total_records || data.records.length || 0);
				serverPer = Number(data.per_page || perPage);
			} else if (Array.isArray(data)) {
				records = data;
				totalRecords = data.length;
			}

			setItems(records);
			setTotal(totalRecords);
			setPerPage(serverPer);
		} catch (e) {
			Notification(e?.response?.data?.message || t('errors.loadExercises'), 'error');
		} finally {
			setLoading(false);
		}
	}, [page, perPage, sortBy, sortOrder, debounced, activeCat, t]);

	// Lifecycle
	useEffect(() => {
		if (open) fetchCategories();
	}, [open, fetchCategories]);

	useEffect(() => {
		if (open) setPage(1);
	}, [debounced, activeCat, open]);

	useEffect(() => {
		if (open) fetchList();
	}, [open, page, debounced, activeCat, perPage, fetchList]);

	// Close handlers (backdrop & ESC)
	useEffect(() => {
		if (!open) return;
		function onKey(e) {
			if (e.key === 'Escape') onClose?.();
		}
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, onClose]);

	const [showVideo, setShowVideo] = useState(null);

	if (typeof document === 'undefined') return null;
 
	return createPortal(
		<AnimatePresence>
			{open ? (
				<motion.div key='exercise-picker' className='fixed inset-0 z-[1000]' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
					<motion.div className='absolute inset-0 bg-slate-900/50 backdrop-blur-sm' onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />

					{/* Fullscreen Content */}
					<motion.div className='absolute inset-0 flex flex-col' initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }} aria-modal='true' role='dialog'>
						{/* Sticky Header */}
						<div className='sticky top-0 z-10 border-b border-white/10 text-white'>
							<div className='absolute z-[-1] inset-0 overflow-hidden'>
								<div className='absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 opacity-95' />
								<div
									className='absolute inset-0 opacity-15'
									style={{
										backgroundImage: 'linear-gradient(rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.22) 1px, transparent 1px)',
										backgroundSize: '22px 22px',
										backgroundPosition: '-1px -1px',
									}}
								/>
								<div className='absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/20 blur-3xl' />
								<div className='absolute -bottom-16 -right-8 h-60 w-60 rounded-full bg-blue-300/30 blur-3xl' />
							</div>
							<div className='mx-auto max-w-7xl  px-4 sm:px-6'>
								<div className='flex items-center justify-between py-4'>
									<div className='text-white flex items-center gap-3'>
										<div>
											<div className=' lg:text-xl text-base font-semibold '>{t('picker.title')}</div>
											<div className=' lg:text-lg text-xs opacity-90'>{t('picker.subtitle')}</div>
										</div>
									</div>

									<SearchComponent
										searchText={searchText}
										setSearchText={setSearchText}
										placeholder={t('picker.searchPlaceholder')}
										className='xl:hidden'
									/>
								</div>
							</div>

							{/* Filters row (sticky under header) */}
							<div className=' '>
								<div className='mx-auto flex items-center justify-between gap-2 flex-wrap max-w-7xl px-4 sm:px-6 py-3'>
									<SearchComponent
										searchText={searchText}
										setSearchText={setSearchText}
										placeholder={t('picker.searchPlaceholder')}
										className='max-xl:hidden'
									/>

									{/* Tabs */}
									{tabs.length > 1 && (
										<div className='overflow-x-auto '>
											<TabsPill hiddenArrow id='picker-cats' className='!bg-slate-100/80' tabs={tabs} active={activeCat} onChange={setActiveCat} />
										</div>
									)}
								</div>
							</div>
						</div>

						{/* Scrollable Body */}
						<div className='flex-1 overflow-auto'>
							<div className='mx-auto max-w-7xl px-4 sm:px-6 py-6'>
								{/* Cards */}
								{loading ? (
									<div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6'>
										{Array.from({ length: 12 }).map((_, i) => (
											<div key={i} className='relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'>
												<div className='aspect-[4/3] w-full overflow-hidden'>
													<div className='h-full w-full shimmer' />
												</div>
												<div className='p-3'>
													<div className='mb-2 h-3.5 w-4/5 rounded shimmer' />
													<div className='mb-2 h-3 w-2/3 rounded shimmer' />
													<div className='h-3 w-1/2 rounded shimmer' />
												</div>
											</div>
										))}
									</div>
								) : items.length ? (
									<div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6'>
										{items.map(e => {
											const checked = !!selected[e.id];

											return (
												<motion.button type='button' key={e.id} onClick={() => toggle(e)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className={['text-left rounded-lg border p-3 transition-all', checked ? 'border-indigo-400 ring-2 ring-indigo-200 bg-indigo-50/50 shadow-md' : 'border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:shadow-md'].join(' ')}>
													<div className='relative mb-2 overflow-hidden rounded-lg bg-slate-100'>
														<div className='aspect-[4/3] w-full'>
															{e.img ? (
																<div className='relative aspect-square '>
																	<Img src={e.img} alt={e.name} className='h-full w-full object-cover' loading='lazy' />
																	<button type='button' onClick={ev => setShowVideo(e.video)} className='absolute left-1.5 bottom-1.5 inline-flex items-center gap-1 rounded-md bg-black/65 px-1.5 py-[3px] text-[10px] text-white opacity-90 hover:opacity-100 active:scale-95 transition' aria-label={t('picker.previewVideo')}>
																		<PlayCircle className='h-3.5 w-3.5' />
																		<span className='hidden sm:inline'>{t('picker.preview')}</span>
																	</button>
																</div>
															) : (
																<div className='grid h-full w-full place-content-center text-slate-400'>
																	<Dumbbell className='h-7 w-7' />
																</div>
															)}
														</div>
														{checked && (
															<span className='absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2 py-0.5 text-[11px] font-medium text-white shadow-sm'>
																<Check className='h-3.5 w-3.5' />
																{t('picker.selected')}
															</span>
														)}
													</div>

													<MultiLangText className=' text-nowrap block truncate mb-0.5 text-sm font-semibold text-slate-900'>{e.name}</MultiLangText>

													<div className='mb-2 truncate text-[12px] text-slate-600'>
														{t('picker.sets')} {e.targetSets ?? 3} · {t('picker.reps')} {e.targetReps || '—'} · {t('picker.rest')} {e.rest ?? 90}s{e.tempo ? ` · ${e.tempo}` : ''}
													</div>

													{e.category && (
														<span className='inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[11px] text-indigo-700'>
															<Tag size={11} />
															<MultiLangText>{e.category}</MultiLangText>
														</span>
													)}
												</motion.button>
											);
										})}
									</div>
								) : (
									<div className='rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm'>
										<div className='mx-auto grid h-14 w-14 place-content-center rounded-lg bg-slate-100'>
											<Dumbbell className='h-7 w-7 text-slate-500' />
										</div>
										<h3 className='mt-4 text-base font-semibold text-slate-900'>{t('picker.noExercisesTitle')}</h3>
										<p className='mt-1 text-sm text-slate-600'>{t('picker.noExercisesDesc')}</p>
									</div>
								)}
							</div>
						</div>

						{/* Sticky Footer */}
						<div className='sticky bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60'>
							<div className='mx-auto max-w-7xl px-4 sm:px-6'>
								<div className='flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between'>
									<PrettyPagination page={page} totalPages={totalPages} onPageChange={setPage} className='order-2 sm:order-1' />

									<div className='order-1 flex items-center justify-end gap-2 sm:order-2'>
										<button type='button' onClick={onClose} className='inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 active:scale-[.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/30 transition'>
											{t('actions.close')}
										</button>
										<button type='button' onClick={handleDone} disabled={!selectedCount} className={['inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition', 'bg-[#4f39f6] text-white hover:bg-[#4f39f6]/90 active:scale-[.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/30', !selectedCount ? 'opacity-50 cursor-not-allowed' : ''].join(' ')}>
											{t('picker.addSelected', { count: selectedCount || 0 })}
										</button>
									</div>
								</div>
							</div>
						</div>

						{/* Video Modal */}
						<AnimatePresence>
							{showVideo && (
								<motion.div className='fixed inset-0 z-[1100] flex items-center justify-center p-4' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
									<div className='absolute inset-0 bg-black/70' onClick={() => setShowVideo(null)} />
									<motion.div initial={{ scale: 0.98, opacity: 0, y: 6 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0, y: 6 }} transition={overlaySpring} className='relative w-full max-w-3xl rounded-lg bg-black overflow-hidden shadow-2xl'>
										<button onClick={() => setShowVideo(null)} className='absolute right-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-95' aria-label={t('actions.close')}>
											<X className='h-5 w-5' />
										</button>

										<div className='w-full aspect-video bg-black'>
											<video src={showVideo} controls className='h-full w-full' preload='metadata' />
										</div>
									</motion.div>
								</motion.div>
							)}
						</AnimatePresence>
					</motion.div>
				</motion.div>
			) : null}
		</AnimatePresence>,
		document.body,
	);
});



// Move this outside the ExercisePicker component
const SearchComponent = memo(function SearchComponent({ searchText, setSearchText, placeholder, className }) {
	const t = useTranslations('workoutPlans');

	return (
		<div className={`relative flex-1 max-w-[240px] sm:min-w-[260px] ${className}`}>
			<Search className='absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none' />
			<input
				value={searchText}
				onChange={e => setSearchText(e.target.value)}
				placeholder={placeholder}
				className={[
					'h-11 w-full px-8 rounded-lg',
					'border border-slate-200 bg-white/90 text-slate-900',
					'shadow-sm hover:shadow transition',
					'focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200/40'
				].join(' ')}
			/>
			{!!searchText && (
				<button
					type='button'
					onClick={() => setSearchText('')}
					className='absolute rtl:left-2 ltr:right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100'
					aria-label={t('actions.clear')}
				>
					<X className='w-4 h-4' />
				</button>
			)}
		</div>
	);
});