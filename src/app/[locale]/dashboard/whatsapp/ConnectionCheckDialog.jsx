'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, CheckCheck, Loader2, RefreshCw, Wifi, WifiOff, X } from 'lucide-react';
import api from '@/utils/axios';

function ago(iso, ar) {
	if (!iso) return '';
	const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
	if (minutes < 1) return ar ? 'دلوقتي' : 'just now';
	if (minutes < 60) return ar ? `من ${minutes} دقيقة` : `${minutes} min ago`;
	const hours = Math.round(minutes / 60);
	if (hours < 48) return ar ? `من ${hours} ساعة` : `${hours} h ago`;
	return ar ? `من ${Math.round(hours / 24)} يوم` : `${Math.round(hours / 24)} days ago`;
}

const VERDICTS = {
	online: {
		tone: 'emerald',
		Icon: Wifi,
		ar: ['متصل دلوقتي', 'فاتح واتساب حالًا — ابعت وهتوصله على طول.'],
		en: ['Online now', 'They have WhatsApp open right now — send away.'],
	},
	reachable: {
		tone: 'emerald',
		Icon: CheckCheck,
		ar: ['رسايلك بتوصله', 'آخر رسالة ليك وصلت علامتين ✓✓، يعني تليفونه بيستقبل.'],
		en: ['Your messages reach them', 'Your last message got two ticks ✓✓ — their phone is receiving.'],
	},
	one_tick: {
		tone: 'amber',
		Icon: WifiOff,
		ar: ['استنى شوية', 'آخر رسالة ليك لسه علامة واحدة ✓ — تليفونه غالبًا مقفول أو مفيهوش نت.'],
		en: ['Hold off for now', 'Your last message is still on one tick ✓ — their phone is likely off or offline.'],
	},
	not_on_whatsapp: {
		tone: 'rose',
		Icon: X,
		ar: ['الرقم مش على واتساب', 'الرقم ده مالوش حساب واتساب دلوقتي.'],
		en: ['Not on WhatsApp', 'This number has no WhatsApp account right now.'],
	},
	session_offline: {
		tone: 'slate',
		Icon: WifiOff,
		ar: ['حسابك مش متصل', 'وصّل حساب الواتساب الأول عشان نقدر نختبر.'],
		en: ['Your account is offline', 'Reconnect this WhatsApp account to run the check.'],
	},
	unknown: {
		tone: 'slate',
		Icon: Wifi,
		ar: ['مش واضح', 'مش ظاهر متصل (ممكن يكون مخبي آخر ظهور) ومفيش رسالة منك نحكم بيها. ابعت رسالة قصيرة وشوف علاماتها.'],
		en: ['Not clear yet', 'Not shown online (last seen may be hidden) and no recent message of yours to judge by. Send a short one and watch its ticks.'],
	},
};

const TONES = {
	emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
	amber: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
	rose: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30',
	slate: 'bg-slate-50 text-slate-700 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10',
};

function Ticks({ status }) {
	if (['delivered', 'read', 'played'].includes(status)) {
		return <CheckCheck size={16} className={status === 'delivered' ? 'text-slate-400' : 'text-sky-500'} aria-hidden />;
	}
	if (status === 'sent') return <Check size={16} className="text-slate-400" aria-hidden />;
	return null;
}

/** "Check connection" from a chat's menu: online now, and the ticks on your last message. */
export default function ConnectionCheckDialog({ conversationId, title, ar, onClose }) {
	const [result, setResult] = useState(null);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const run = useCallback(async () => {
		if (!conversationId) return;
		setLoading(true);
		setError('');
		try {
			const { data } = await api.get(`/whatsapp/conversations/${conversationId}/reachability`, { timeout: 30_000 });
			setResult(data);
		} catch (err) {
			setError(err?.response?.data?.message || (ar ? 'تعذر الاختبار' : 'Could not run the check'));
		} finally {
			setLoading(false);
		}
	}, [ar, conversationId]);

	useEffect(() => {
		void run();
	}, [run]);

	useEffect(() => {
		const onKey = event => event.key === 'Escape' && onClose();
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [onClose]);

	if (typeof document === 'undefined') return null;
	const verdict = result ? VERDICTS[result.verdict] || VERDICTS.unknown : null;
	const [headline, detail] = verdict ? (ar ? verdict.ar : verdict.en) : ['', ''];
	const VerdictIcon = verdict?.Icon;
	const last = result?.lastMessage;
	const presence = result?.presence;

	const rows = result
		? [
				{
					label: ar ? 'متصل دلوقتي؟' : 'Online now?',
					value: presence?.online
						? ar ? 'أيوه، أونلاين' : 'Yes, online'
						: presence?.lastSeen
							? ar ? `آخر ظهور ${ago(new Date(presence.lastSeen).toISOString(), ar)}` : `Last seen ${ago(new Date(presence.lastSeen).toISOString(), ar)}`
							: ar ? 'مش ظاهر (ممكن يكون مخبيه)' : 'Not shown (may be hidden)',
				},
				{
					label: ar ? 'آخر رسالة منك' : 'Your last message',
					value: last ? (
						<span className="inline-flex items-center gap-1.5">
							<Ticks status={last.status} />
							{['delivered', 'read', 'played'].includes(last.status)
								? ar ? 'علامتين — وصلت' : 'Two ticks — delivered'
								: last.status === 'sent'
									? ar ? 'علامة واحدة — لسه موصلتش' : 'One tick — not delivered yet'
									: last.status || '—'}
							<span className="text-slate-400">· {ago(last.sentAt, ar)}</span>
						</span>
					) : ar ? 'مبعتلوش رسايل' : 'You have not messaged them',
				},
				...(result.lastDeliveredAt && last?.status === 'sent'
					? [{ label: ar ? 'آخر مرة وصلته رسالة' : 'Last delivered', value: ago(result.lastDeliveredAt, ar) }]
					: []),
				{
					label: ar ? 'على واتساب' : 'On WhatsApp',
					value: result.onWhatsApp == null ? '—' : result.onWhatsApp ? (ar ? 'أيوه' : 'Yes') : ar ? 'لأ' : 'No',
				},
			]
		: [];

	return createPortal(
		<div
			// Above the chat menus (z 1600) it is opened from.
			className="fixed inset-0 z-[1700] grid place-items-center bg-black/30 p-4"
			dir={ar ? 'rtl' : 'ltr'}
			onMouseDown={event => event.target === event.currentTarget && onClose()}
		>
			<section
				role="dialog"
				aria-modal="true"
				aria-labelledby="wa-conn-title"
				className="w-full max-w-[400px] overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#111b21]"
			>
				<header className="flex items-center gap-3 border-b border-black/[0.06] px-5 py-4 dark:border-white/10">
					<div className="min-w-0 flex-1">
						<h2 id="wa-conn-title" className="text-[16px] font-semibold text-[#111b21] dark:text-[#e9edef]">
							{ar ? 'اختبار الاتصال' : 'Check connection'}
						</h2>
						<p className="truncate text-[12.5px] text-[#667781]" dir="auto">
							{title}
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label={ar ? 'إغلاق' : 'Close'}
						className="grid h-9 w-9 place-items-center rounded-full text-[#54656f] hover:bg-black/5 dark:hover:bg-white/10"
					>
						<X size={18} />
					</button>
				</header>

				<div className="space-y-4 px-5 py-5">
					{loading && !result ? (
						<div className="flex flex-col items-center gap-2 py-6 text-[13.5px] text-[#667781]">
							<Loader2 size={24} className="animate-spin text-[#00a884]" />
							{ar ? 'بنسأل واتساب… ثواني' : 'Asking WhatsApp… a few seconds'}
						</div>
					) : error ? (
						<p className="rounded-xl bg-rose-50 px-4 py-3 text-[13.5px] font-medium text-rose-700">{error}</p>
					) : result ? (
						<>
							<div className={`flex items-start gap-3 rounded-xl px-4 py-3 ring-1 ${TONES[verdict.tone]}`}>
								<VerdictIcon size={20} className="mt-0.5 shrink-0" aria-hidden />
								<div>
									<p className="text-[15px] font-bold">{headline}</p>
									<p className="mt-0.5 text-[13px] leading-relaxed opacity-90">{detail}</p>
								</div>
							</div>
							<dl className="divide-y divide-black/[0.06] text-[13.5px] dark:divide-white/10">
								{rows.map(row => (
									<div key={row.label} className="flex items-center justify-between gap-3 py-2.5">
										<dt className="text-[#667781]">{row.label}</dt>
										<dd className="text-end font-medium text-[#111b21] dark:text-[#e9edef]">{row.value}</dd>
									</div>
								))}
							</dl>
						</>
					) : null}
				</div>

				<footer className="flex justify-end border-t border-black/[0.06] px-5 py-3 dark:border-white/10">
					<button
						type="button"
						onClick={() => void run()}
						disabled={loading}
						className="inline-flex items-center gap-2 rounded-full bg-[#00a884] px-4 py-2 text-[13.5px] font-semibold text-white hover:bg-[#008f72] disabled:opacity-60"
					>
						{loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
						{ar ? 'اختبر تاني' : 'Check again'}
					</button>
				</footer>
			</section>
		</div>,
		document.body,
	);
}
