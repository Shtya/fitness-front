'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Bell, BellOff, BellRing, Loader2, Mic, PenLine, Radio, Search, ShieldQuestion, WifiOff } from 'lucide-react';
import api from '@/utils/axios';

const RECENT_WINDOW_MS = 30 * 60_000;

function useNow(intervalMs = 30_000) {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const id = window.setInterval(() => setNow(Date.now()), intervalMs);
		return () => window.clearInterval(id);
	}, [intervalMs]);
	return now;
}

function ago(ms, ar) {
	const m = Math.max(0, Math.round(ms / 60_000));
	if (m < 1) return ar ? 'الآن' : 'just now';
	if (m < 60) return ar ? `منذ ${m} د` : `${m} min ago`;
	const h = Math.floor(m / 60);
	return ar ? `منذ ${h} س` : `${h} h ago`;
}

function initials(name = '') {
	const parts = String(name).trim().split(/\s+/).filter(Boolean);
	return (parts[0]?.[0] || '?') + (parts[1]?.[0] || '');
}

/**
 * Who is on WhatsApp right now, from the linked device's presence events only.
 * Lists what WhatsApp actually reported: people who hide their status never appear as online,
 * and "left recently" only shows a time WhatsApp (or our own observation) gave us.
 */
export default function WhatsAppOnlineTab({
	accountId,
	contacts = [],
	resolveIdentity,
	onOpenChat,
	onRefresh,
	locale = 'en',
	pushPermission,
	onEnablePush,
}) {
	const ar = String(locale).toLowerCase().startsWith('ar');
	const L = (a, e) => (ar ? a : e);
	const now = useNow();
	const [query, setQuery] = useState('');
	const [watched, setWatched] = useState(() => new Set());
	const [watchLoaded, setWatchLoaded] = useState(false);
	const [busyId, setBusyId] = useState(null);
	const [diag, setDiag] = useState(null);

	/* Why the list looks the way it does — account link, who holds the session, device availability. */
	useEffect(() => {
		if (!accountId) return undefined;
		let alive = true;
		const load = () =>
			api
				.get('/whatsapp/presence/diagnostics', { params: { accountId } })
				.then(({ data }) => alive && setDiag(data))
				.catch(() => alive && setDiag(null));
		load();
		const id = window.setInterval(load, 30_000);
		return () => {
			alive = false;
			window.clearInterval(id);
		};
	}, [accountId]);

	/* Online status changes fast; refresh this view more often than the inbox does. */
	useEffect(() => {
		if (!onRefresh) return undefined;
		const id = window.setInterval(() => {
			if (document.visibilityState === 'visible') void onRefresh();
		}, 10_000);
		return () => window.clearInterval(id);
	}, [onRefresh]);
	/* When each person was first seen live in this session — the "online for" clock. */
	const liveSince = useRef(new Map());

	useEffect(() => {
		if (!accountId) return undefined;
		let alive = true;
		setWatchLoaded(false);
		api
			.get('/whatsapp/presence/watch', { params: { accountId } })
			.then(({ data }) => {
				if (alive) setWatched(new Set((data?.conversationIds || []).map(String)));
			})
			.catch(() => {})
			.finally(() => alive && setWatchLoaded(true));
		return () => {
			alive = false;
		};
	}, [accountId]);

	useEffect(() => {
		void onRefresh?.();
	}, [onRefresh]);

	const rows = useMemo(() => {
		const seen = liveSince.current;
		const list = (Array.isArray(contacts) ? contacts : []).map(item => {
			const identity = resolveIdentity?.(item.conversationId) || {};
			const live = Boolean(item.online || item.typing || item.recording);
			if (live && !seen.has(item.conversationId)) seen.set(item.conversationId, Number(item.updatedAt) || Date.now());
			if (!live) seen.delete(item.conversationId);
			return {
				...item,
				name: identity.name || item.name || item.phoneNumber || 'Contact',
				avatarUrl: identity.avatarUrl || item.avatarUrl || null,
				phoneNumber: item.phoneNumber || identity.phoneNumber || null,
				live,
				since: live ? seen.get(item.conversationId) : null,
			};
		});
		const q = query.trim().toLowerCase();
		return q ? list.filter(r => `${r.name} ${r.phoneNumber || ''}`.toLowerCase().includes(q)) : list;
	}, [contacts, resolveIdentity, query]);

	const byId = useMemo(() => new Map(rows.map(r => [r.conversationId, r])), [rows]);
	const online = rows.filter(r => r.live).sort((a, b) => (b.since || 0) - (a.since || 0));
	const recent = rows
		.filter(r => !r.live && r.lastSeen > 0 && now - r.lastSeen < RECENT_WINDOW_MS)
		.sort((a, b) => b.lastSeen - a.lastSeen);
	const following = [...watched]
		.map(id => byId.get(id) || { conversationId: id, ...(resolveIdentity?.(id) || {}), live: false, lastSeen: 0 })
		.filter(r => !query.trim() || `${r.name || ''} ${r.phoneNumber || ''}`.toLowerCase().includes(query.trim().toLowerCase()))
		.sort((a, b) => Number(b.live) - Number(a.live));

	const toggleWatch = useCallback(
		async (conversationId, name) => {
			const next = !watched.has(conversationId);
			setBusyId(conversationId);
			setWatched(current => {
				const copy = new Set(current);
				if (next) copy.add(conversationId);
				else copy.delete(conversationId);
				return copy;
			});
			try {
				const { data } = await api.put('/whatsapp/presence/watch', { accountId, conversationId, watch: next });
				setWatched(new Set((data?.conversationIds || []).map(String)));
				if (next) {
					toast.success(L(`هنبلّغك أول ما ${name} يتصل`, `We'll tell you when ${name} comes online`));
					if (pushPermission !== 'granted' && pushPermission !== 'unsupported') void onEnablePush?.();
				}
			} catch (error) {
				setWatched(current => {
					const copy = new Set(current);
					if (next) copy.delete(conversationId);
					else copy.add(conversationId);
					return copy;
				});
				toast.error(error?.response?.data?.message || L('مقدرناش نحفظ المتابعة', 'Could not save that'));
			} finally {
				setBusyId(null);
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps -- L is a pure label picker
		[accountId, watched, pushPermission, onEnablePush, ar],
	);

	/* One honest sentence about the data source, from the backend diagnostics. */
	const sourceNote = (() => {
		if (!diag) return null;
		const owner = String(diag.presence?.sessionOwner || '');
		const ownerHere = owner === 'this server';
		const ownerElsewhere = owner.startsWith('another server');
		const status = String(diag.accountStatus || '');
		if (!ownerHere && !ownerElsewhere) {
			if (status === 'qr_pending' || status === 'connecting') {
				return { tone: 'warn', text: L('الحساب ده لسه مش مربوط بواتساب (مستني مسح QR) — مفيش مصدر لحالة الاتصال لحد ما يترِبط.', 'This account is not linked to WhatsApp yet (waiting for a QR scan) — there is no presence source until it is linked.') };
			}
			return { tone: 'warn', text: L('مفيش جهاز واتساب مربوط شغال للحساب ده دلوقتي، فمفيش حالة اتصال تتعرض. اربط الحساب من "الحسابات".', 'No linked WhatsApp device is running for this account right now, so there is no presence to show. Link it from Accounts.') };
		}
		if (ownerHere && diag.device && diag.device.deviceAvailable === false) {
			const reason = diag.device.availabilityError ? ` (${diag.device.availabilityError})` : '';
			return { tone: 'warn', text: L(`الجهاز المربوط مش معلَن "متاح"، وواتساب مش بيبعت حالة الناس لجهاز مش متاح${reason}.`, `The linked device is not marked available, and WhatsApp does not share contacts' presence with an unavailable device${reason}.`) };
		}
		if (ownerElsewhere) {
			return { tone: 'info', text: L('الجلسة شغالة على سيرفر تاني؛ الحالة بتتقري منه لحظيًا كل ثواني.', 'The session runs on another server; presence is read from it every few seconds.') };
		}
		return null;
	})();

	const statusLine = r => {
		if (r.recording) return { tone: 'live', icon: Mic, text: L('بيسجّل صوت…', 'recording audio…') };
		if (r.typing) return { tone: 'live', icon: PenLine, text: L('بيكتب…', 'typing…') };
		if (r.live) return { tone: 'live', text: r.since ? L(`متصل ${ago(now - r.since, true).replace('منذ', 'من')}`, `online · ${ago(now - r.since, false).replace(' ago', '')}`) : L('متصل الآن', 'online now') };
		if (r.lastSeen > 0) return { tone: 'muted', text: L(`آخر ظهور ${ago(now - r.lastSeen, true)}`, `last seen ${ago(now - r.lastSeen, false)}`) };
		return { tone: 'unknown', text: L('الحالة مش ظاهرة (ممكن مخفية من الخصوصية)', 'Status not shared (may be hidden by privacy)') };
	};

	const Row = ({ r }) => {
		const s = statusLine(r);
		const isWatched = watched.has(r.conversationId);
		const Icon = s.icon;
		return (
			<li className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-black/[0.03] dark:hover:bg-white/[0.04] sm:px-4">
				<button type="button" onClick={() => onOpenChat?.(r.conversationId)} className="flex min-w-0 flex-1 items-center gap-3 text-start">
					<span className="relative shrink-0">
						{r.avatarUrl ? (
							<img src={r.avatarUrl} alt="" className="size-11 rounded-full object-cover" />
						) : (
							<span className="grid size-11 place-items-center rounded-full bg-[#dfe5e7] text-[14px] font-semibold uppercase text-[#54656f] dark:bg-[#2a3942] dark:text-[#aebac1]">
								{initials(r.name)}
							</span>
						)}
						{r.live ? (
							<span className="absolute -bottom-0.5 -end-0.5 size-3.5 rounded-full border-2 border-white bg-[#25d366] dark:border-[#111b21]" aria-hidden />
						) : null}
					</span>
					<span className="min-w-0 flex-1">
						<span className="block truncate text-[15px] font-medium text-[#111b21] dark:text-[#e9edef]" dir="auto">{r.name}</span>
						<span
							className={`mt-0.5 flex items-center gap-1 truncate text-[13px] ${
								s.tone === 'live' ? 'text-[#008069] dark:text-[#25d366]' : 'text-[#667781] dark:text-[#8696a0]'
							}`}
						>
							{Icon ? <Icon size={13} className="shrink-0" aria-hidden /> : null}
							<span className="truncate">{s.text}</span>
						</span>
					</span>
				</button>
				<button
					type="button"
					disabled={busyId === r.conversationId || !watchLoaded}
					onClick={() => toggleWatch(r.conversationId, r.name)}
					aria-pressed={isWatched}
					aria-label={isWatched ? L(`إلغاء متابعة ${r.name}`, `Stop following ${r.name}`) : L(`نبهني لما ${r.name} يتصل`, `Notify me when ${r.name} is online`)}
					title={isWatched ? L('إلغاء التنبيه', 'Stop alerts') : L('نبهني لما يتصل', 'Notify me when online')}
					className={`grid size-10 shrink-0 place-items-center rounded-full transition disabled:opacity-50 ${
						isWatched
							? 'bg-[#d9fdd3] text-[#008069] dark:bg-[#005c4b]/40 dark:text-[#25d366]'
							: 'text-[#8696a0] hover:bg-black/5 hover:text-[#54656f] dark:hover:bg-white/5'
					}`}
				>
					{busyId === r.conversationId ? <Loader2 size={18} className="animate-spin" /> : isWatched ? <BellRing size={18} /> : <Bell size={18} />}
				</button>
			</li>
		);
	};

	const Section = ({ title, count, children, empty }) => (
		<section className="mt-2">
			<h3 className="flex items-center justify-between px-4 pb-1 pt-3 text-[13px] font-medium text-[#008069] dark:text-[#00a884]">
				<span>{title}</span>
				{count ? <span className="tabular-nums text-[#667781] dark:text-[#8696a0]">{count}</span> : null}
			</h3>
			{children || <p className="px-4 py-3 text-[13px] text-[#667781] dark:text-[#8696a0]">{empty}</p>}
		</section>
	);

	return (
		<div className="flex h-full min-h-0 flex-col bg-white dark:bg-[#111b21]" dir={ar ? 'rtl' : 'ltr'}>
			<div className="shrink-0 border-b border-[#e9edef] px-4 pb-3 pt-4 dark:border-[#222d34]">
				<div className="flex items-baseline justify-between gap-3 max-[768px]:justify-end">
					<h2 className="hidden text-[19px] font-semibold min-[769px]:block text-[#111b21] dark:text-[#e9edef]">{L('المتصلون', 'Online')}</h2>
					<span className="flex items-center gap-1.5 text-[13px] text-[#667781] dark:text-[#8696a0]">
						<span className="size-2 rounded-full bg-[#25d366]" aria-hidden />
						<span className="tabular-nums">{online.length}</span> {L('متصل الآن', 'online now')}
					</span>
				</div>
				<label className="relative mt-3 block">
					<Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[#8696a0]" />
					<input
						type="search"
						value={query}
						onChange={e => setQuery(e.target.value)}
						placeholder={L('دوّر على اسم أو رقم', 'Search name or number')}
						className="h-9 w-full rounded-lg bg-[#f0f2f5] pe-3 ps-9 text-[14px] text-[#111b21] outline-none placeholder:text-[#8696a0] focus:ring-2 focus:ring-[#00a884]/40 dark:bg-[#202c33] dark:text-[#e9edef]"
					/>
				</label>
				{watched.size > 0 && pushPermission && pushPermission !== 'granted' && pushPermission !== 'unsupported' && pushPermission !== 'checking' ? (
					<button
						type="button"
						onClick={() => onEnablePush?.()}
						className="mt-3 flex w-full items-center gap-2 rounded-lg bg-[#fff8e1] px-3 py-2 text-start text-[12.5px] text-[#7a5b00] dark:bg-[#3b3000]/60 dark:text-[#ffd666]"
					>
						<BellOff size={15} className="shrink-0" />
						{pushPermission === 'denied'
							? L('الإشعارات مقفولة من المتصفح — هتشوف التنبيه جوه الصفحة بس.', 'Browser notifications are blocked — alerts will show inside the page only.')
							: L('فعّل إشعارات المتصفح عشان يوصلك التنبيه حتى لو الصفحة مقفولة.', 'Turn on browser notifications to get alerts even when this page is closed.')}
					</button>
				) : null}
			</div>

			{sourceNote ? (
				<div
					className={`mx-4 mt-3 flex gap-2 rounded-lg px-3 py-2.5 text-[12.5px] leading-relaxed ${
						sourceNote.tone === 'warn'
							? 'bg-[#fff8e1] text-[#7a5b00] dark:bg-[#3b3000]/60 dark:text-[#ffd666]'
							: 'bg-[#e7f6f1] text-[#0b6b55] dark:bg-[#0b3b31]/60 dark:text-[#7fe0c3]'
					}`}
					role="status"
				>
					{sourceNote.tone === 'warn' ? <WifiOff size={15} className="mt-0.5 shrink-0" /> : <Radio size={15} className="mt-0.5 shrink-0" />}
					<span>{sourceNote.text}</span>
				</div>
			) : null}

			<div className="min-h-0 flex-1 overflow-y-auto pb-6">
				{following.length > 0 && (
					<Section title={L('بتتابعهم', 'Following')} count={following.length}>
						<ul>{following.map(r => <Row key={`f-${r.conversationId}`} r={r} />)}</ul>
					</Section>
				)}
				<Section
					title={L('متصل الآن', 'Online now')}
					count={online.length}
					empty={L('مفيش حد ظاهر متصل دلوقتي.', 'Nobody is showing as online right now.')}
				>
					{online.length ? <ul>{online.map(r => <Row key={`o-${r.conversationId}`} r={r} />)}</ul> : null}
				</Section>
				{recent.length > 0 && (
					<Section title={L('خرجوا من شوية', 'Left recently')} count={recent.length}>
						<ul>{recent.map(r => <Row key={`r-${r.conversationId}`} r={r} />)}</ul>
					</Section>
				)}
				<p className="mx-4 mt-6 flex gap-2 rounded-lg bg-[#f0f2f5] p-3 text-[12px] leading-relaxed text-[#667781] dark:bg-[#202c33] dark:text-[#8696a0]">
					<ShieldQuestion size={16} className="mt-0.5 shrink-0" />
					{L(
						'الحالة بتيجي من واتساب نفسه على الجهاز المربوط. اللي مخبّي "آخر ظهور والاتصال" في الخصوصية مش هيظهر متصل هنا، ومش بنخمّن حالة محدش.',
						'Status comes from WhatsApp on the linked device. People who hide "Last seen & online" in their privacy settings will not show here — nothing is guessed.',
					)}
				</p>
			</div>
		</div>
	);
}
