'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Loader2, Mic, RefreshCw, Sparkles } from 'lucide-react';
import {
	extractCloneVoiceCandidates,
	formatVoiceClock,
	summarizeCloneVoiceScan,
	voiceDurationSeconds,
} from './voice-clone-chat-samples';
import { timestampMs } from '../../transcript/transcription-client';

const copy = {
	en: {
		title: 'Contact voice notes',
		subtitle: 'Voice messages from the other person. Tap Sync to load older history without losing the list.',
		loading: 'Loading contact voice notes…',
		syncMore: 'Sync more',
		syncing: 'Syncing…',
		syncDone: 'Loaded more voice notes',
		syncIdle: 'Reached the end of loaded history',
		syncIdleOutbound:
			'No new contact voices in this batch · {outbound} voice notes from you are hidden',
		syncEndContactOnly:
			'{contact} contact voice notes found · {outbound} from you hidden for cloning',
		syncLoadedMessages:
			'Loaded {count} older messages · still scanning for contact voice notes',
		syncKeepTrying: 'Tap Sync again to keep loading older history',
		scanSummary: 'Scanned {messages} messages · {contact} from contact',
		scanSummaryHidden: ' · {outbound} from you hidden',
		empty: 'No contact voice notes in this chat yet. Try Sync more.',
		inbound: 'Contact',
		outbound: 'You',
		recommended: 'Recommended',
		addSelected: 'Add to clone samples',
		adding: 'Downloading…',
		noneSelected: 'Select at least one voice note.',
		added: 'Added to clone samples',
		selectAllRecommended: 'Select recommended',
		unknownDuration: 'Voice note',
		mediaUnavailable: 'Media unavailable',
		mediaWaitingWhatsApp: 'Waiting for WhatsApp',
		mediaChecking: 'Checking media…',
		noneReadySelected: 'Selected voice notes are not ready yet. Wait for WhatsApp or pick another clip.',
		partialAdd: 'Added {count} · {skipped} unavailable',
	},
	ar: {
		title: 'رسائل صوتية من الطرف الآخر',
		subtitle: 'رسائل صوتية من الشخص التاني. اضغط Sync عشان تجيب تاريخ أقدم من غير ما القائمة تختفي.',
		loading: 'بيحمّل رسائل صوتية الطرف الآخر…',
		syncMore: 'Sync أكتر',
		syncing: 'بيحمّل…',
		syncDone: 'تم تحميل رسائل صوتية إضافية',
		syncIdle: 'وصلنا لآخر التاريخ المحمّل',
		syncIdleOutbound:
			'مفيش رسائل صوتية جديدة من الطرف الآخر · {outbound} رسالة منك مخفية',
		syncEndContactOnly:
			'{contact} رسالة صوتية من الطرف الآخر · {outbound} منك مخفية للاستنساخ',
		syncLoadedMessages:
			'تم تحميل {count} رسالة أقدم · لسه بنبحث عن رسائل صوتية من الطرف الآخر',
		syncKeepTrying: 'اضغط Sync تاني عشان تحمّل تاريخ أقدم',
		scanSummary: 'تم فحص {messages} رسالة · {contact} من الطرف الآخر',
		scanSummaryHidden: ' · {outbound} منك مخفية',
		empty: 'مفيش رسائل صوتية من الطرف الآخر. جرّب Sync أكتر.',
		inbound: 'العميل',
		outbound: 'أنت',
		recommended: 'موصى به',
		addSelected: 'ضيف للعيّنات',
		adding: 'بيحمّل…',
		noneSelected: 'اختَر رسالة صوتية واحدة على الأقل.',
		added: 'تمت الإضافة للعيّنات',
		selectAllRecommended: 'اختَر الموصى بها',
		unknownDuration: 'رسالة صوتية',
		mediaUnavailable: 'الملف غير متاح',
		mediaWaitingWhatsApp: 'في انتظار WhatsApp',
		mediaChecking: 'جاري فحص الملف…',
		noneReadySelected: 'الرسائل المختارة مش جاهزة. استنى اتصال WhatsApp أو اختَر رسالة تانية.',
		partialAdd: 'تمت إضافة {count} · {skipped} غير متاح',
	},
};

function applyCandidatesFromMessages(
	messages,
	{ maxSamples, currentSampleCount, previousSelectedIds, whatsAppConnected = true },
) {
	const next = extractCloneVoiceCandidates(messages, { whatsAppConnected });
	const validIds = new Set(next.map(item => item.id));
	const selectedIds = new Set(
		[...previousSelectedIds].filter(id => {
			const item = next.find(entry => entry.id === id);
			return validIds.has(id) && item?.mediaReady;
		}),
	);
	const room = Math.max(0, maxSamples - currentSampleCount);
	if (!selectedIds.size && room > 0) {
		for (const item of next.filter(entry => entry.recommended && entry.mediaReady).slice(0, room)) {
			selectedIds.add(item.id);
		}
	}
	return { candidates: next, selectedIds };
}

function resolveCandidateMediaState(item, probeStates) {
	const probed = probeStates?.[item.id];
	if (probed === 'ready') return { mediaState: 'ready', mediaReady: true };
	if (probed === 'unavailable') return { mediaState: 'unavailable', mediaReady: false };
	if (probed === 'checking') return { mediaState: 'checking', mediaReady: false };
	if (item.mediaState === 'ready') return { mediaState: 'ready', mediaReady: true };
	if (item.mediaState === 'pending' || item.mediaState === 'checking') {
		return { mediaState: item.mediaState, mediaReady: false };
	}
	return { mediaState: item.mediaState, mediaReady: false };
}

export default function CloneChatVoicePanel({
	ar = false,
	chatTitle = '',
	conversationId,
	fetchChatMessages,
	syncMoreChatMessages,
	loadVoiceFile,
	probeVoiceMedia,
	onSamplesAdded,
	maxSamples = 10,
	currentSampleCount = 0,
	whatsAppConnected = true,
}) {
	const t = ar ? copy.ar : copy.en;
	const [initialLoading, setInitialLoading] = useState(false);
	const [syncingMore, setSyncingMore] = useState(false);
	const [adding, setAdding] = useState(false);
	const [candidates, setCandidates] = useState([]);
	const [selectedIds, setSelectedIds] = useState(() => new Set());
	const [scanStats, setScanStats] = useState(null);
	const [mediaProbeStates, setMediaProbeStates] = useState({});
	const probedIdsRef = useRef(new Set());

	const candidateRows = useMemo(
		() =>
			candidates.map(item => ({
				...item,
				...resolveCandidateMediaState(item, mediaProbeStates),
			})),
		[candidates, mediaProbeStates],
	);

	const selectableSelectedCount = useMemo(
		() => candidateRows.filter(item => selectedIds.has(item.id) && item.mediaReady).length,
		[candidateRows, selectedIds],
	);

	const formatTemplate = (template, values) =>
		String(template || '').replace(/\{(\w+)\}/g, (_, key) => String(values?.[key] ?? ''));

	const scanSummaryText = useMemo(() => {
		if (!scanStats?.scannedMessages) return '';
		let text = formatTemplate(t.scanSummary, {
			messages: scanStats.scannedMessages,
			contact: scanStats.contactVoices,
		});
		if (scanStats.outboundVoices > 0) {
			text += formatTemplate(t.scanSummaryHidden, {
				outbound: scanStats.outboundVoices,
			});
		}
		return text;
	}, [scanStats, t.scanSummary, t.scanSummaryHidden]);

	const recommendedIds = useMemo(
		() => candidateRows.filter(item => item.recommended && item.mediaReady).map(item => item.id),
		[candidateRows],
	);

	const formatCandidateLabel = item => {
		const duration =
			item.durationSec > 0 ? item.durationSec : voiceDurationSeconds(item.message);
		if (duration > 0) return formatVoiceClock(duration);
		const ms = timestampMs(item.timestamp);
		if (ms) {
			return new Date(ms).toLocaleString(ar ? 'ar-EG' : undefined, {
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			});
		}
		return t.unknownDuration;
	};

	useEffect(() => {
		if (!conversationId || !fetchChatMessages) {
			setCandidates([]);
			setSelectedIds(new Set());
			setScanStats(null);
			setMediaProbeStates({});
		probedIdsRef.current = new Set();
			return undefined;
		}
		let cancelled = false;
		setInitialLoading(true);
		setCandidates([]);
		setSelectedIds(new Set());
		setMediaProbeStates({});
		probedIdsRef.current = new Set();
		void fetchChatMessages(conversationId)
			.then(result => {
				if (cancelled) return;
				const messages = Array.isArray(result) ? result : result?.messages || [];
				setScanStats(summarizeCloneVoiceScan(messages));
				const { candidates: next, selectedIds: nextSelected } = applyCandidatesFromMessages(
					messages,
					{
						maxSamples,
						currentSampleCount,
						previousSelectedIds: new Set(),
						whatsAppConnected,
					},
				);
				setCandidates(next);
				setSelectedIds(nextSelected);
			})
			.catch(error => {
				if (cancelled) return;
				toast.error(error?.message || (ar ? 'تعذّر تحميل الرسائل' : 'Could not load messages'));
			})
			.finally(() => {
				if (!cancelled) setInitialLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [conversationId, fetchChatMessages, ar, maxSamples, currentSampleCount, whatsAppConnected]);

	useEffect(() => {
		if (!probeVoiceMedia || !whatsAppConnected || !candidates.length) return undefined;
		let cancelled = false;
		const pending = candidates.filter(item => {
			if (probedIdsRef.current.has(item.id)) return false;
			return item.mediaState === 'pending' || item.mediaState === 'checking';
		});
		if (!pending.length) return undefined;

		void (async () => {
			for (const item of pending) {
				if (cancelled) return;
				probedIdsRef.current.add(item.id);
				setMediaProbeStates(current => ({ ...current, [item.id]: 'checking' }));
				const ok = await probeVoiceMedia(item.message).catch(() => false);
				if (cancelled) return;
				setMediaProbeStates(current => ({
					...current,
					[item.id]: ok ? 'ready' : 'unavailable',
				}));
				if (!ok) {
					setSelectedIds(current => {
						if (!current.has(item.id)) return current;
						const next = new Set(current);
						next.delete(item.id);
						return next;
					});
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [candidates, probeVoiceMedia, whatsAppConnected]);

	const handleSyncMore = useCallback(async () => {
		if (!conversationId || !syncMoreChatMessages || syncingMore) return;
		setSyncingMore(true);
		try {
			const previousVoiceCount = candidates.length;
			const result = await syncMoreChatMessages(conversationId);
			const messages = result?.messages || [];
			const stats = summarizeCloneVoiceScan(messages);
			setScanStats(stats);
			const { candidates: next, selectedIds: nextSelected } = applyCandidatesFromMessages(
				messages,
				{
					maxSamples,
					currentSampleCount,
					previousSelectedIds: selectedIds,
					whatsAppConnected,
				},
			);
			setCandidates(next);
			setSelectedIds(nextSelected);
			setMediaProbeStates({});
			probedIdsRef.current = new Set();
			const addedMessages = Number(result?.addedMessages ?? result?.addedCount ?? 0);
			if (next.length > previousVoiceCount) {
				toast.success(t.syncDone);
			} else if (addedMessages > 0) {
				toast(formatTemplate(t.syncLoadedMessages, { count: addedMessages }), { icon: '↻' });
			} else if (!result?.hasMore) {
				if (stats.outboundVoices > stats.contactVoices) {
					toast(
						formatTemplate(t.syncEndContactOnly, {
							contact: stats.contactVoices,
							outbound: stats.outboundVoices,
						}),
						{ icon: 'ℹ️' },
					);
				} else if (stats.outboundVoices > 0) {
					toast(formatTemplate(t.syncIdleOutbound, { outbound: stats.outboundVoices }), {
						icon: 'ℹ️',
					});
				} else {
					toast(t.syncIdle, { icon: 'ℹ️' });
				}
			} else {
				toast(t.syncKeepTrying, { icon: '↻' });
			}
		} catch (error) {
			toast.error(error?.message || (ar ? 'تعذّر المزامنة' : 'Could not sync more messages'));
		} finally {
			setSyncingMore(false);
		}
	}, [
		ar,
		candidates.length,
		conversationId,
		currentSampleCount,
		maxSamples,
		selectedIds,
		syncMoreChatMessages,
		syncingMore,
		t.syncDone,
		t.syncEndContactOnly,
		t.syncIdle,
		t.syncIdleOutbound,
		t.syncKeepTrying,
		t.syncLoadedMessages,
		whatsAppConnected,
	]);

	const toggleId = (id, mediaReady) => {
		if (!mediaReady) return;
		setSelectedIds(current => {
			const next = new Set(current);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const selectRecommended = () => {
		const room = Math.max(0, maxSamples - currentSampleCount);
		setSelectedIds(
			new Set(
				candidateRows.filter(item => item.recommended && item.mediaReady).slice(0, room).map(item => item.id),
			),
		);
	};

	const mediaStateLabel = state => {
		if (state === 'waiting_whatsapp') return t.mediaWaitingWhatsApp;
		if (state === 'checking' || state === 'pending') return t.mediaChecking;
		if (state === 'unavailable') return t.mediaUnavailable;
		return '';
	};

	const addSelected = async () => {
		if (!selectedIds.size) {
			toast.error(t.noneSelected);
			return;
		}
		if (!loadVoiceFile) return;
		const room = maxSamples - currentSampleCount;
		if (room <= 0) return;
		const picked = candidateRows.filter(item => selectedIds.has(item.id) && item.mediaReady).slice(0, room);
		if (!picked.length) {
			toast.error(t.noneReadySelected);
			return;
		}
		setAdding(true);
		try {
			const files = [];
			let skipped = 0;
			for (const item of picked) {
				try {
					const file = await loadVoiceFile(item.message);
					if (file) files.push(file);
					else skipped += 1;
				} catch {
					skipped += 1;
					setMediaProbeStates(current => ({ ...current, [item.id]: 'unavailable' }));
					setSelectedIds(current => {
						if (!current.has(item.id)) return current;
						const next = new Set(current);
						next.delete(item.id);
						return next;
					});
				}
			}
			if (!files.length) {
				throw new Error(ar ? 'تعذّر تحميل الملفات' : 'Could not download voice files');
			}
			onSamplesAdded?.(files);
			setSelectedIds(new Set());
			if (skipped > 0) {
				toast(formatTemplate(t.partialAdd, { count: files.length, skipped }), { icon: 'ℹ️' });
			} else {
				toast.success(t.added);
			}
		} catch (error) {
			toast.error(error?.message || (ar ? 'فشل تحميل الرسائل الصوتية' : 'Could not add voice notes'));
		} finally {
			setAdding(false);
		}
	};

	const showInitialSpinner = initialLoading && candidates.length === 0;

	return (
		<div className="flex min-h-0 flex-1 flex-col bg-violet-50/30 dark:bg-violet-950/10">
			<div className="shrink-0 border-b border-violet-200/80 bg-white/90 px-4 py-3 dark:border-violet-900/40 dark:bg-slate-950/90">
				<div className="flex items-start gap-2">
					<span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-200">
						<Mic size={15} />
					</span>
					<div className="min-w-0 flex-1">
						<div className="flex items-start justify-between gap-2">
							<p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
								{chatTitle || t.title}
							</p>
							{syncMoreChatMessages ? (
								<button
									type="button"
									onClick={() => void handleSyncMore()}
									disabled={syncingMore || initialLoading}
									className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-2.5 text-[11px] font-bold text-violet-800 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-100"
								>
									{syncingMore ? (
										<Loader2 size={13} className="animate-spin" />
									) : (
										<RefreshCw size={13} />
									)}
									{syncingMore ? t.syncing : t.syncMore}
								</button>
							) : null}
						</div>
						<p className="mt-0.5 text-[11px] leading-4 text-slate-500">{t.subtitle}</p>
						{scanSummaryText ? (
							<p className="mt-1 text-[10px] font-semibold leading-4 text-violet-700 dark:text-violet-300">
								{scanSummaryText}
							</p>
						) : null}
					</div>
				</div>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto p-4 nice-scroll">
				{showInitialSpinner ? (
					<div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500">
						<Loader2 size={24} className="animate-spin text-violet-600" />
						<p className="text-sm font-semibold">{t.loading}</p>
					</div>
				) : candidates.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-slate-500">
						<Mic size={28} className="text-violet-300" />
						<p className="text-sm font-semibold">{t.empty}</p>
						{syncMoreChatMessages ? (
							<button
								type="button"
								onClick={() => void handleSyncMore()}
								disabled={syncingMore}
								className="inline-flex h-9 items-center gap-2 rounded-lg bg-violet-600 px-3 text-[12px] font-bold text-white disabled:opacity-50"
							>
								{syncingMore ? (
									<Loader2 size={14} className="animate-spin" />
								) : (
									<RefreshCw size={14} />
								)}
								{syncingMore ? t.syncing : t.syncMore}
							</button>
						) : null}
					</div>
				) : (
					<div className="mx-auto w-full max-w-lg space-y-3">
						<div className="flex items-center justify-between gap-2">
							<span className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">
								{candidates.length} {ar ? 'رسالة صوتية من الطرف الآخر' : 'contact voice notes'}
								{syncingMore ? (
									<span className="ms-2 inline-flex items-center gap-1 text-violet-600">
										<Loader2 size={12} className="animate-spin" />
										{t.syncing}
									</span>
								) : null}
							</span>
							{recommendedIds.length ? (
								<button
									type="button"
									onClick={selectRecommended}
									disabled={adding || syncingMore}
									className="text-[11px] font-bold text-violet-700 hover:underline disabled:opacity-50 dark:text-violet-300"
								>
									{t.selectAllRecommended}
								</button>
							) : null}
						</div>
						<ul className="space-y-2">
							{candidateRows.map(item => {
								const checked = selectedIds.has(item.id);
								const disabledRow = !item.mediaReady || adding || syncingMore;
								const stateLabel = mediaStateLabel(item.mediaState);
								return (
									<li key={item.id}>
										<label
											className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-[12px] transition ${
												disabledRow
													? 'cursor-not-allowed border-slate-200/80 bg-slate-50/90 opacity-60 dark:border-slate-700/80 dark:bg-slate-900/50'
													: checked
														? 'cursor-pointer border-emerald-300 bg-emerald-50/90 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/30'
														: 'cursor-pointer border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
											}`}
										>
											<input
												type="checkbox"
												checked={checked}
												onChange={() => toggleId(item.id, item.mediaReady)}
												disabled={disabledRow}
												className="h-4 w-4 accent-emerald-600 disabled:cursor-not-allowed"
											/>
											<span className="min-w-0 flex-1 font-semibold text-slate-700 dark:text-slate-200">
												{formatCandidateLabel(item)}
												<span className="mx-1.5 font-normal text-slate-400">·</span>
												{item.inbound ? t.inbound : t.outbound}
												{stateLabel ? (
													<>
														<span className="mx-1.5 font-normal text-slate-400">·</span>
														<span className="font-normal text-amber-700 dark:text-amber-300">
															{stateLabel}
														</span>
													</>
												) : null}
											</span>
											{item.recommended && item.mediaReady ? (
												<span
													title={ar ? item.reasonAr : item.reasonEn}
													className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-violet-800 dark:bg-violet-950/60 dark:text-violet-200"
												>
													<Sparkles size={10} />
													{t.recommended}
												</span>
											) : null}
											{checked ? <Check size={14} className="shrink-0 text-emerald-600" /> : null}
										</label>
									</li>
								);
							})}
						</ul>
					</div>
				)}
			</div>

			{candidates.length ? (
				<div className="shrink-0 border-t border-violet-200/80 bg-white p-3 dark:border-violet-900/40 dark:bg-slate-950">
					<button
						type="button"
						onClick={() => void addSelected()}
						disabled={
							adding ||
							syncingMore ||
							!selectableSelectedCount ||
							currentSampleCount >= maxSamples
						}
						className="mx-auto flex h-10 w-full max-w-lg items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-[13px] font-bold text-white disabled:opacity-50"
					>
						{adding ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
						{adding ? t.adding : t.addSelected}
					</button>
				</div>
			) : null}
		</div>
	);
}
