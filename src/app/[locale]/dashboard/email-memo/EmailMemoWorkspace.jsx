'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import {
	ArrowDown,
	Ban,
	Bot,
	Check,
	Copy,
	ExternalLink,
	Eye,
	EyeOff,
	Loader2,
	Mails,
	MessageCircle,
	RefreshCw,
	Settings,
	Sparkles,
	X,
} from 'lucide-react';
import { emailMemoApi } from '@/lib/email-memo/email-memo-api';
import { ReadyCheck, STUDIO, StudioSparkleLogo } from '../ai-content-studio/components/studio-theme';

const FOCUS =
	'w-full rounded-[14px] border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-sm text-[#1a1a1a] outline-none transition focus:border-[#6366F1] focus:ring-2 focus:ring-[#E0E7FF] dark:border-slate-700 dark:bg-slate-900 dark:text-white';

const emptyOverview = {
	gmail: { connected: false, status: 'disconnected', email: null, count: 0 },
	gmailAccounts: [],
	whatsapp: { connected: false, status: 'disconnected', qr: null, pairingCode: null, online: false },
	ai: { provider: 'ai-free', label: 'AI Free', configured: true, providers: [], preview: '' },
	googleOAuth: {
		configured: false,
		verified: false,
		easyConnect: false,
		readyToConnect: false,
		source: 'env',
		redirectUri: '',
		clientIdMasked: '',
		hasClientSecret: false,
		maxAccounts: 5,
	},
	googleOAuthConfigured: false,
	googleOAuthVerified: false,
	settings: {},
	usage: { emailsProcessedToday: 0, aiRequestsToday: 0, whatsappSentToday: 0 },
};

function timeAgo(value, locale) {
	if (!value) return '—';
	const date = new Date(value);
	const diff = Date.now() - date.getTime();
	const mins = Math.round(diff / 60000);
	if (mins < 1) return locale === 'ar' ? 'الآن' : 'just now';
	if (mins < 60) return locale === 'ar' ? `${mins} د` : `${mins} min ago`;
	const hours = Math.round(mins / 60);
	if (hours < 24) return locale === 'ar' ? `${hours} س` : `${hours}h ago`;
	return date.toLocaleString(locale === 'ar' ? 'ar' : 'en');
}

function csvOf(list) {
	return Array.isArray(list) ? list.join(', ') : '';
}

function parseCsv(value) {
	return String(value || '')
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
}

function StatusPill({ status, t }) {
	const map = {
		SENT: { label: t('sent'), className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
		FAILED: { label: t('failed'), className: 'bg-rose-50 text-rose-700 border-rose-200' },
		SKIPPED: { label: t('notConnected'), className: 'bg-slate-50 text-slate-600 border-slate-200' },
		PROCESSING: { label: t('processing'), className: 'bg-amber-50 text-amber-800 border-amber-200' },
		SENDING: { label: t('processing'), className: 'bg-amber-50 text-amber-800 border-amber-200' },
		AI_COMPLETED: { label: t('aiMemo'), className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
		RECEIVED: { label: t('received'), className: 'bg-sky-50 text-sky-700 border-sky-200' },
	};
	const meta = map[status] || { label: status, className: 'bg-slate-50 text-slate-600 border-slate-200' };
	return (
		<span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}>
			{status === 'SENT' ? <Check size={12} /> : null}
			{meta.label}
		</span>
	);
}

function StudioButton({ children, onClick, disabled, primary, className = '', type = 'button' }) {
	return (
		<button
			type={type}
			disabled={disabled}
			onClick={onClick}
			className={`inline-flex h-9 items-center justify-center gap-1.5 border px-3.5 text-[12px] font-semibold disabled:opacity-50 ${
				primary ? 'border-transparent text-white' : 'bg-white text-[#111827] hover:bg-slate-50 dark:bg-slate-900 dark:text-white'
			} ${className}`}
			style={
				primary
					? { background: STUDIO.gradient, borderRadius: STUDIO.btnRadius, boxShadow: STUDIO.shadow3dPrimary }
					: { borderColor: STUDIO.border, borderRadius: STUDIO.btnRadius, boxShadow: STUDIO.shadow3d }
			}
		>
			{children}
		</button>
	);
}

export default function EmailMemoWorkspace() {
	const t = useTranslations('emailMemo');
	const locale = useLocale();
	const isRtl = locale === 'ar';
	const searchParams = useSearchParams();
	const [overview, setOverview] = useState(emptyOverview);
	const [messages, setMessages] = useState([]);
	const [chats, setChats] = useState([]);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState('');
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [settingsTab, setSettingsTab] = useState('email');
	const [settings, setSettings] = useState(null);
	const [detail, setDetail] = useState(null);
	const [detailLoading, setDetailLoading] = useState(false);
	const [clientId, setClientId] = useState('');
	const [clientSecret, setClientSecret] = useState('');
	const [showSecret, setShowSecret] = useState(false);
	const [editKeys, setEditKeys] = useState(false);
	const [advancedOpen, setAdvancedOpen] = useState(false);
	const [senders, setSenders] = useState([]);
	const [excludeDraft, setExcludeDraft] = useState('');

	const load = useCallback(async () => {
		const [overviewRes, messagesRes, sendersRes] = await Promise.all([
			emailMemoApi.overview(),
			emailMemoApi.messages(50),
			emailMemoApi.senders().catch(() => ({ data: { items: [] } })),
		]);
		setOverview(overviewRes.data || emptyOverview);
		setMessages(messagesRes.data?.items || []);
		setSettings(overviewRes.data?.settings || null);
		setSenders(sendersRes.data?.items || []);
		if (overviewRes.data?.whatsapp?.connected) {
			try {
				const chatsRes = await emailMemoApi.whatsappChats();
				setChats(chatsRes.data?.items || []);
			} catch {
				setChats([]);
			}
		}
	}, []);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				await load();
			} catch (error) {
				if (!cancelled) toast.error(error.response?.data?.message || error.message);
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [load]);

	useEffect(() => {
		const gmail = searchParams.get('gmail');
		if (gmail === 'connected') toast.success(t('gmailConnected'));
		if (gmail === 'error') toast.error(searchParams.get('error') || t('gmailError'));
	}, [searchParams, t]);

	useEffect(() => {
		const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
		if (!token) return undefined;
		const socket = io(`${process.env.NEXT_PUBLIC_BASE_URL}/email-memo`, {
			auth: { token },
			transports: ['websocket', 'polling'],
		});
		socket.on('email-memo:whatsapp', (payload) => {
			setOverview((prev) => ({
				...prev,
				whatsapp: { ...prev.whatsapp, ...payload, connected: payload.status === 'connected' },
			}));
		});
		socket.on('email-memo:message', () => {
			load().catch(() => {});
		});
		return () => socket.disconnect();
	}, [load]);

	const waStatus = overview.whatsapp?.status;
	useEffect(() => {
		if (!['qr_pending', 'connecting'].includes(waStatus)) return undefined;
		const timer = setInterval(() => {
			emailMemoApi.whatsappQr().then((res) => {
				setOverview((prev) => ({
					...prev,
					whatsapp: {
						...prev.whatsapp,
						qr: res.data?.qr || prev.whatsapp.qr,
						pairingCode: res.data?.pairingCode || prev.whatsapp.pairingCode,
						status: res.data?.status || prev.whatsapp.status,
						connected: res.data?.status === 'connected',
					},
				}));
			}).catch(() => {});
		}, 2500);
		return () => clearInterval(timer);
	}, [waStatus]);

	const gmailAccounts = overview.gmailAccounts || [];
	const gmailOk = gmailAccounts.some((item) => item.connected) || Boolean(overview.gmail?.connected);
	const waOk = Boolean(overview.whatsapp?.connected);
	const oauth = overview.googleOAuth || {};
	const envOAuthReady = Boolean(
		oauth.easyConnect ||
			oauth.source === 'env' ||
			overview.googleOAuthEasy ||
			(oauth.configured && oauth.source !== 'user'),
	);
	const oauthReady = Boolean(
		envOAuthReady ||
			oauth.readyToConnect ||
			oauth.verified ||
			overview.googleOAuthVerified,
	);

	async function run(key, fn, okMessage) {
		setBusy(key);
		try {
			await fn();
			await load();
			if (okMessage) toast.success(okMessage);
		} catch (error) {
			toast.error(error.response?.data?.message || error.message);
		} finally {
			setBusy('');
		}
	}

	const testGmailKeys = () =>
		run('gmail-test', async () => {
			await emailMemoApi.testGmailCredentials({
				clientId: clientId.trim() || undefined,
				clientSecret: clientSecret.trim() || undefined,
			});
			setClientSecret('');
			setEditKeys(false);
			setAdvancedOpen(false);
		}, t('testOk'));

	const connectGmail = (connectionId) => {
		run('gmail', async () => {
			const res = await emailMemoApi.gmailAuthUrl(locale, connectionId);
			const url = res.data?.url;
			if (!url) throw new Error(t('oauthMissing'));
			window.location.href = url;
		});
	};

	const connectWhatsApp = () =>
		run('wa', async () => {
			const res = await emailMemoApi.connectWhatsApp();
			setOverview((prev) => ({
				...prev,
				whatsapp: {
					...prev.whatsapp,
					status: res.data?.status || 'qr_pending',
					qr: res.data?.qr || prev.whatsapp.qr,
					pairingCode: res.data?.pairingCode || prev.whatsapp.pairingCode,
					accountId: res.data?.accountId,
					connected: res.data?.status === 'connected',
				},
			}));
		});

	const copyText = async (value) => {
		if (!value) return;
		await navigator.clipboard?.writeText(value);
		toast.success(t('copied'));
	};

	const openDetail = async (id) => {
		setDetailLoading(true);
		try {
			const res = await emailMemoApi.message(id);
			setDetail(res.data);
		} catch (error) {
			toast.error(error.response?.data?.message || error.message);
		} finally {
			setDetailLoading(false);
		}
	};

	const saveSettings = () =>
		run('settings', () => emailMemoApi.saveSettings(settings), t('saved'));

	const card = 'rounded-[20px] border border-[#E5E7EB] bg-white/95 p-5 dark:border-slate-800 dark:bg-slate-900/95';
	const cardShadow = { boxShadow: STUDIO.shadowCard };
	const showSetup = advancedOpen || editKeys;
	const waLinking = ['qr_pending', 'connecting'].includes(overview.whatsapp?.status);
	const maxAccounts = oauth.maxAccounts || 5;
	const canAddGmail = oauthReady && gmailAccounts.filter((item) => item.connected).length < maxAccounts;

	if (loading) {
		return (
			<div className="space-y-4 p-5 sm:p-7">
				<div className="h-[72px] animate-pulse rounded-[20px] bg-white" />
				<div className="grid gap-4 md:grid-cols-3">
					{[1, 2, 3].map((n) => (
						<div key={n} className="h-52 animate-pulse rounded-[20px] bg-white" />
					))}
				</div>
			</div>
		);
	}

	return (
		<div dir={isRtl ? 'rtl' : 'ltr'} className="relative flex min-h-full flex-col overflow-hidden">
			<div
				className="pointer-events-none absolute left-[8%] top-[-80px] h-[380px] w-[520px] rounded-full blur-3xl"
				style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.16) 0%, rgba(59,130,246,0.08) 45%, transparent 70%)' }}
			/>
			<div
				className="pointer-events-none absolute right-[6%] top-[18%] h-[320px] w-[420px] rounded-full blur-3xl"
				style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)' }}
			/>
			<div
				className="pointer-events-none absolute left-0 top-8 h-80 w-72 opacity-[0.32]"
				style={{
					backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.7) 1px, transparent 0)',
					backgroundSize: '18px 18px',
					maskImage: 'linear-gradient(135deg, black 0%, transparent 75%)',
					WebkitMaskImage: 'linear-gradient(135deg, black 0%, transparent 75%)',
				}}
			/>
			<div
				className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 opacity-[0.28]"
				style={{
					backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.65) 1px, transparent 0)',
					backgroundSize: '18px 18px',
					maskImage: 'linear-gradient(315deg, black 0%, transparent 72%)',
					WebkitMaskImage: 'linear-gradient(315deg, black 0%, transparent 72%)',
				}}
			/>
			<svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.2]" aria-hidden>
				<path d="M-80 70 C 160 -10, 280 190, 560 70 S 980 -40, 1400 90" fill="none" stroke="#C4B5FD" strokeWidth="1.5" />
				<path d="M-40 200 C 220 120, 400 300, 720 160 S 1140 80, 1500 210" fill="none" stroke="#93C5FD" strokeWidth="1.3" />
			</svg>

			<header
				className="relative z-20 mx-5 mt-5 flex min-h-[72px] shrink-0 flex-wrap items-center gap-2 rounded-[20px] bg-white px-5 py-2.5 sm:mx-7 sm:px-6"
				style={{ boxShadow: STUDIO.shadow }}
			>
				<div className="flex min-w-0 flex-1 items-center gap-3">
					<StudioSparkleLogo size={40} />
					<div className="min-w-0">
						<h1 className="truncate text-[15px] font-bold leading-tight tracking-tight text-[#111827]">{t('title')}</h1>
						<p className="mt-0.5 truncate text-[11px] leading-none text-[#6B7280]">{t('subtitle')}</p>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<span className="hidden text-[12px] text-[#6B7280] sm:inline">{t('promise')}</span>
					<StudioButton onClick={() => setSettingsOpen(true)}>
						<Settings size={13} /> {t('settings')}
					</StudioButton>
					<StudioButton onClick={() => load()}>
						<RefreshCw size={13} /> {t('syncNow')}
					</StudioButton>
				</div>
			</header>

			<div className="relative z-10 mx-auto w-full max-w-6xl space-y-5 px-5 py-5 pb-16 sm:px-7">
				<div className="flex flex-wrap items-center justify-center gap-3 rounded-[20px] border border-[#E5E7EB] bg-white/90 px-4 py-4" style={cardShadow}>
					<FlowNode ok={gmailOk} label={t('gmail')} icon={Mails} />
					<ArrowDown className="hidden rotate-[-90deg] text-slate-400 md:block" size={18} />
					<FlowNode ok label={t('aiFree')} icon={Bot} />
					<ArrowDown className="hidden rotate-[-90deg] text-slate-400 md:block" size={18} />
					<FlowNode ok={waOk} label={t('whatsapp')} icon={MessageCircle} />
				</div>

				<section className="grid gap-4 lg:grid-cols-3">
					<article className={card} style={cardShadow}>
						<div className="mb-4 flex items-center justify-between">
							<div className="flex items-center gap-2 font-bold text-[#111827] dark:text-white">
								<Mails size={18} className="text-[#6366F1]" />
								{t('gmail')}
							</div>
							<span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#6B7280]">
								{gmailOk ? <ReadyCheck size={14} /> : <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />}
								{gmailOk ? t('connected') : t('notConnected')}
							</span>
						</div>

						<p className="mb-4 text-[13px] leading-relaxed text-[#6B7280]">{t('gmailEasyHint')}</p>

						<div className="space-y-2">
							{gmailAccounts.filter((item) => item.connected).map((account) => (
								<div key={account.id} className="rounded-[14px] border border-[#E5E7EB] px-3 py-2">
									<p className="truncate text-sm font-medium text-[#111827]">{account.email}</p>
									<div className="mt-2 flex flex-wrap gap-2">
										<StudioButton primary disabled={busy === `sync-${account.id}`} onClick={() => run(`sync-${account.id}`, () => emailMemoApi.syncGmail(account.id))}>
											{busy === `sync-${account.id}` ? <Loader2 className="animate-spin" size={14} /> : t('syncNow')}
										</StudioButton>
										<StudioButton onClick={() => run(`gmail-off-${account.id}`, () => emailMemoApi.disconnectGmail(account.id), t('disconnected'))}>
											{t('disconnect')}
										</StudioButton>
									</div>
								</div>
							))}
						</div>

						<div className="mt-4 flex flex-wrap gap-2">
							<button
								type="button"
								disabled={busy === 'gmail' || (gmailOk && !canAddGmail)}
								onClick={() => connectGmail()}
								className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#E5E7EB] bg-white px-4 text-[13px] font-semibold text-[#111827] hover:bg-slate-50 disabled:opacity-50"
								style={{ boxShadow: STUDIO.shadow3d }}
							>
								{busy === 'gmail' ? (
									<Loader2 className="animate-spin" size={16} />
								) : (
									<svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
										<path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.5-.4-3.9z" />
										<path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
										<path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
										<path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.1 7.4l6.2 5.2C38.4 38.2 44 33 44 24c0-1.3-.1-2.5-.4-3.9z" />
									</svg>
								)}
								{gmailOk ? t('addGmail') : t('connectWithGoogle')}
							</button>
							{gmailOk ? (
								<StudioButton disabled={busy === 'sync'} onClick={() => run('sync', () => emailMemoApi.syncGmail())}>
									{busy === 'sync' ? <Loader2 className="animate-spin" size={14} /> : t('syncNow')}
								</StudioButton>
							) : null}
						</div>
						{!canAddGmail && gmailOk ? (
							<p className="mt-2 text-[11px] text-[#6B7280]">{t('maxGmail')}</p>
						) : null}

						{!envOAuthReady ? (
							<>
						<button
							type="button"
							onClick={() => {
								const next = !showSetup;
								setAdvancedOpen(next);
								setEditKeys(next);
							}}
							className="mt-4 text-[12px] font-semibold text-[#6366F1]"
						>
							{showSetup ? t('hideAdvancedKeys') : t('advancedKeys')}
						</button>

						{showSetup ? (
							<div className="mt-3 space-y-4 rounded-[16px] border border-[#E5E7EB] bg-slate-50/80 p-4">
								<p className="text-[12px] leading-relaxed text-[#6B7280]">{t('cantCopyFromGmail')}</p>
								<div>
									<p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#71717a]">{t('gmailStepsTitle')}</p>
									<ol className="space-y-2">
										{[t('gmailStep1'), t('gmailStep2'), t('gmailStep3'), t('gmailStep4'), t('gmailStep5')].map((step, i) => (
											<li key={i} className="flex gap-2 text-[12px] leading-snug text-[#6B7280]">
												<span
													className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white"
													style={{ background: STUDIO.gradient }}
												>
													{i + 1}
												</span>
												<span>{step}</span>
											</li>
										))}
									</ol>
									<a
										href="https://console.cloud.google.com/apis/credentials"
										target="_blank"
										rel="noreferrer"
										className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-[#6366F1]"
									>
										{t('openConsole')} <ExternalLink size={12} />
									</a>
								</div>

								{oauth.redirectUri ? (
									<label className="block">
										<div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#71717a]">{t('redirectUri')}</div>
										<div className="flex gap-2">
											<input readOnly dir="ltr" className={FOCUS} value={oauth.redirectUri} />
											<StudioButton onClick={() => copyText(oauth.redirectUri)}>
												<Copy size={13} />
											</StudioButton>
										</div>
									</label>
								) : null}

								<label className="block">
									<div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#71717a]">{t('clientId')}</div>
									<input
										dir="ltr"
										className={FOCUS}
										value={clientId}
										onChange={(e) => setClientId(e.target.value)}
										placeholder={oauth.clientIdMasked || 'xxxx.apps.googleusercontent.com'}
										autoComplete="off"
									/>
								</label>
								<label className="block">
									<div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#71717a]">{t('clientSecret')}</div>
									<div className="relative">
										<input
											dir="ltr"
											className={`${FOCUS} pe-10`}
											type={showSecret ? 'text' : 'password'}
											value={clientSecret}
											onChange={(e) => setClientSecret(e.target.value)}
											placeholder={oauth.hasClientSecret ? '••••••••' : ''}
											autoComplete="off"
										/>
										<button
											type="button"
											className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400"
											onClick={() => setShowSecret((v) => !v)}
										>
											{showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
										</button>
									</div>
								</label>
								<p className="text-[11px] text-[#6B7280]">{t('testBeforeConnect')}</p>
								<div className="flex flex-wrap gap-2">
									<StudioButton
										primary
										disabled={busy === 'gmail-test' || (!clientId.trim() && !oauth.configured)}
										onClick={testGmailKeys}
									>
										{busy === 'gmail-test' ? <Loader2 className="animate-spin" size={14} /> : t('testKeys')}
									</StudioButton>
								</div>
							</div>
						) : null}
							</>
						) : null}
					</article>

					<article className={card} style={cardShadow}>
						<div className="mb-4 flex items-center justify-between">
							<div className="flex items-center gap-2 font-bold text-[#111827] dark:text-white">
								<MessageCircle size={18} className="text-emerald-500" />
								{t('whatsapp')}
							</div>
							<span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#6B7280]">
								{waOk ? <ReadyCheck size={14} /> : <span className={`h-2.5 w-2.5 rounded-full ${waLinking ? 'animate-pulse bg-amber-500' : 'bg-slate-300'}`} />}
								{waOk ? t('connected') : t('notConnected')}
							</span>
						</div>

						{waOk ? (
							<>
								<p className="text-sm font-medium text-[#111827] dark:text-slate-100">
									✓ {overview.whatsapp.deviceName || t('whatsappDevice')}
								</p>
								<p className="text-xs text-[#6B7280]">
									{t('device')}: {overview.whatsapp.phoneNumber || '—'} · {overview.whatsapp.online ? t('online') : t('offline')}
								</p>
								<div className="mt-4 flex flex-wrap gap-2">
									<StudioButton primary onClick={() => run('wa-test', () => emailMemoApi.testWhatsApp(), t('testSent'))}>
										{t('sendTest')}
									</StudioButton>
									<StudioButton onClick={() => run('wa-off', () => emailMemoApi.disconnectWhatsApp(), t('disconnected'))}>
										{t('disconnect')}
									</StudioButton>
								</div>
							</>
						) : (
							<>
								<StudioButton primary disabled={busy === 'wa'} onClick={connectWhatsApp}>
									{busy === 'wa' ? <Loader2 className="animate-spin" size={14} /> : t('connectWhatsApp')}
								</StudioButton>
								{waLinking && !overview.whatsapp.qr && !overview.whatsapp.pairingCode ? (
									<div className="mx-auto mt-4 flex max-w-sm items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-slate-50 px-4 py-6 text-sm font-semibold text-slate-500">
										<Loader2 size={16} className="animate-spin text-[#6366F1]" />
										{t('generatingQr')}
									</div>
								) : null}
								{overview.whatsapp.qr ? (
									<div className="mx-auto mt-5 max-w-sm text-center">
										<div className="mb-4 flex items-center justify-center gap-2">
											<span className="relative flex h-2 w-2">
												<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
												<span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
											</span>
											<p className="text-sm font-black">{t('scanQrTitle')}</p>
										</div>
										<div className="relative mx-auto w-fit rounded-2xl bg-white p-4 shadow-[0_20px_50px_-15px_rgba(37,211,102,0.35)]">
											<span className="absolute -start-1.5 -top-1.5 h-6 w-6 rounded-tl-xl border-s-4 border-t-4 border-[#6366F1]" />
											<span className="absolute -end-1.5 -top-1.5 h-6 w-6 rounded-tr-xl border-e-4 border-t-4 border-[#6366F1]" />
											<span className="absolute -start-1.5 -bottom-1.5 h-6 w-6 rounded-bl-xl border-b-4 border-s-4 border-[#A855F7]" />
											<span className="absolute -end-1.5 -bottom-1.5 h-6 w-6 rounded-br-xl border-b-4 border-e-4 border-[#A855F7]" />
											{String(overview.whatsapp.qr).startsWith('data:image') ? (
												<img src={overview.whatsapp.qr} alt="WhatsApp QR" className="aspect-square w-52 rounded-lg" />
											) : (
												<p className="max-w-52 break-all text-xs">{overview.whatsapp.qr}</p>
											)}
										</div>
										<p className="mx-auto mt-4 max-w-xs text-xs text-slate-500">{t('scanPath')}</p>
									</div>
								) : null}
								{overview.whatsapp.pairingCode ? (
									<div className="mx-auto mt-4 max-w-sm text-center">
										<p className="mb-2 text-sm font-black">{t('pairingCodeTitle')}</p>
										<button
											type="button"
											onClick={() => copyText(overview.whatsapp.pairingCode)}
											className="mx-auto flex items-center gap-3 rounded-2xl bg-white px-6 py-4 font-mono text-2xl font-black tracking-[0.3em] shadow-[0_20px_50px_-15px_rgba(37,211,102,0.35)]"
										>
											{overview.whatsapp.pairingCode}
										</button>
									</div>
								) : null}
							</>
						)}
					</article>

					<article className={card} style={cardShadow}>
						<div className="mb-4 flex items-center justify-between">
							<div className="flex items-center gap-2 font-bold text-[#111827] dark:text-white">
								<Sparkles size={18} className="text-[#6366F1]" />
								{t('aiMemo')}
							</div>
							<span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
								<ReadyCheck size={14} /> {t('freeActive')}
							</span>
						</div>
						<p className="text-sm font-bold">{overview.ai.label || t('aiFree')}</p>
						<p className="mt-1 text-xs text-[#6B7280]">{t('aiFreeHint')}</p>
						<div className="mt-3 flex flex-wrap gap-1.5">
							{(overview.ai.providers || [{ id: 'ai-free', label: t('aiFree') }]).map((provider) => (
								<button
									key={provider.id}
									type="button"
									onClick={() => settings && setSettings({ ...settings, aiProvider: provider.id })}
									className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
										(settings?.aiProvider || overview.ai.provider) === provider.id
											? 'border-indigo-200 bg-indigo-50 text-indigo-700'
											: 'border-[#E5E7EB] text-[#6B7280]'
									}`}
								>
									{provider.label}
								</button>
							))}
						</div>
						{settings ? (
							<div className="mt-3">
								<p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#71717a]">{t('memoLength')}</p>
								<div className="flex flex-wrap gap-1.5">
									{['short', 'medium', 'detailed'].map((len) => (
										<button
											key={len}
											type="button"
											onClick={() => setSettings({ ...settings, memoLength: len })}
											className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
												settings.memoLength === len ? 'text-white' : 'bg-slate-100 text-slate-600'
											}`}
											style={settings.memoLength === len ? { background: STUDIO.gradient } : undefined}
										>
											{t(len)}
										</button>
									))}
								</div>
								<div className="mt-3 flex flex-wrap gap-1.5">
									{[
										['includeSender', t('includeSender')],
										['includeSubject', t('includeSubject')],
										['includeSummary', t('includeSummary')],
										['includeAction', t('includeAction')],
										['includeDeadline', t('includeDeadline')],
									].map(([field, label]) => (
										<button
											key={field}
											type="button"
											onClick={() => setSettings({ ...settings, [field]: !settings[field] })}
											className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
												settings[field] ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-[#E5E7EB] text-[#9CA3AF] line-through'
											}`}
										>
											{label}
										</button>
									))}
								</div>
								<StudioButton className="mt-3" onClick={saveSettings} disabled={busy === 'settings'}>
									{busy === 'settings' ? <Loader2 className="animate-spin" size={14} /> : t('save')}
								</StudioButton>
							</div>
						) : null}
						{overview.ai.preview ? (
							<pre className="mt-3 max-h-36 overflow-auto whitespace-pre-wrap rounded-[14px] bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-700">
								{overview.ai.preview}
							</pre>
						) : null}
						<div className="mt-4 grid grid-cols-3 gap-2 text-center">
							<UsageStat label={t('emailsToday')} value={overview.usage?.emailsProcessedToday || 0} />
							<UsageStat label={t('aiToday')} value={overview.usage?.aiRequestsToday || 0} />
							<UsageStat label={t('waToday')} value={overview.usage?.whatsappSentToday || 0} />
						</div>
					</article>
				</section>

				<section className={card} style={cardShadow}>
					<div className="mb-1 flex items-center justify-between gap-2">
						<h2 className="text-lg font-bold text-[#111827] dark:text-white">{t('senders')}</h2>
					</div>
					<p className="mb-4 text-sm text-[#6B7280]">{t('sendersHint')}</p>
					<form
						className="mb-4 flex flex-wrap gap-2"
						onSubmit={(e) => {
							e.preventDefault();
							const email = excludeDraft.trim();
							if (!email) return;
							run('exclude', async () => {
								const res = await emailMemoApi.excludeSender(email);
								setSenders(res.data?.items || []);
								setExcludeDraft('');
							});
						}}
					>
						<input
							dir="ltr"
							className={`max-w-xs ${FOCUS}`}
							value={excludeDraft}
							onChange={(e) => setExcludeDraft(e.target.value)}
							placeholder={t('excludePlaceholder')}
						/>
						<StudioButton type="submit" disabled={busy === 'exclude' || !excludeDraft.trim()}>
							<Ban size={13} /> {t('addExclude')}
						</StudioButton>
					</form>
					{senders.length === 0 ? (
						<p className="text-sm text-[#6B7280]">{t('noSenders')}</p>
					) : (
						<div className="max-h-72 space-y-2 overflow-auto">
							{senders.map((sender) => (
								<div key={sender.email} className="flex items-center justify-between gap-3 rounded-[14px] border border-[#E5E7EB] px-3 py-2">
									<div className="min-w-0">
										<p className="truncate text-sm font-semibold text-[#111827]">{sender.name || sender.email}</p>
										<p className="truncate text-[11px] text-[#6B7280]">{sender.email} · {sender.count}</p>
									</div>
									{sender.excluded ? (
										<button
											type="button"
											className="shrink-0 text-[12px] font-semibold text-[#6366F1]"
											onClick={() => run(`inc-${sender.email}`, async () => {
												const res = await emailMemoApi.includeSender(sender.email);
												setSenders(res.data?.items || []);
											})}
										>
											{t('includeBack')}
										</button>
									) : (
										<button
											type="button"
											className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-rose-600"
											onClick={() => run(`exc-${sender.email}`, async () => {
												const res = await emailMemoApi.excludeSender(sender.email);
												setSenders(res.data?.items || []);
											})}
										>
											<Ban size={12} /> {t('exclude')}
										</button>
									)}
								</div>
							))}
						</div>
					)}
				</section>

				<section className={card} style={cardShadow}>
					<div className="mb-4 flex items-center justify-between">
						<h2 className="text-lg font-bold text-[#111827] dark:text-white">{t('activity')}</h2>
						<button type="button" onClick={() => load()} className="inline-flex items-center gap-1 text-xs font-semibold text-[#6B7280]">
							<RefreshCw size={12} />
							{t('syncNow')}
						</button>
					</div>
					{messages.length === 0 ? (
						<div className="rounded-xl border border-dashed border-[#E5E7EB] px-6 py-12 text-center">
							<Mails className="mx-auto mb-3 text-slate-300" />
							<p className="font-semibold">{t('emptyTitle')}</p>
							<p className="mt-1 text-sm text-[#6B7280]">{t('emptyBody')}</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full min-w-[720px] text-left text-sm">
								<thead className="text-[11px] uppercase tracking-wide text-[#6B7280]">
									<tr>
										<th className="pb-2">{t('status')}</th>
										<th className="pb-2">{t('inbox')}</th>
										<th className="pb-2">{t('sender')}</th>
										<th className="pb-2">{t('subject')}</th>
										<th className="pb-2">{t('aiMemoCol')}</th>
										<th className="pb-2">{t('whatsappStatus')}</th>
										<th className="pb-2">{t('received')}</th>
										<th className="pb-2">{t('actions')}</th>
									</tr>
								</thead>
								<tbody>
									{messages.map((row) => (
										<tr key={row.id} className="border-t border-slate-100 dark:border-slate-800">
											<td className="py-3"><StatusPill status={row.status} t={t} /></td>
											<td className="max-w-[140px] truncate py-3 text-[11px] text-[#6B7280]">{row.inboxEmail || '—'}</td>
											<td className="py-3">
												<div className="font-medium">{row.senderName || '—'}</div>
												<div className="text-[11px] text-[#6B7280]">{row.senderEmail}</div>
											</td>
											<td className="max-w-[180px] truncate py-3">{row.subject}</td>
											<td className="max-w-[240px] truncate py-3 text-slate-600">{row.memo || '—'}</td>
											<td className="py-3">{row.whatsappStatus === 'sent' ? `✓ ${t('whatsapp')}` : row.whatsappStatus || '—'}</td>
											<td className="py-3 text-[#6B7280]">{timeAgo(row.receivedAt, locale)}</td>
											<td className="py-3">
												<div className="flex gap-2">
													<button type="button" onClick={() => openDetail(row.id)} className="text-xs font-semibold text-[#6366F1]">{t('open')}</button>
													{row.status === 'FAILED' && (
														<button type="button" onClick={() => run(`retry-${row.id}`, () => emailMemoApi.retry(row.id))} className="text-xs font-semibold text-slate-600">{t('retry')}</button>
													)}
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</section>
			</div>

			{detail || detailLoading ? (
				<div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 backdrop-blur-[1px]" onClick={() => setDetail(null)}>
					<aside className="h-full w-full max-w-lg overflow-auto rounded-s-[24px] bg-white p-6 dark:bg-slate-950" onClick={(e) => e.stopPropagation()}>
						<div className="mb-4 flex items-center justify-between">
							<h3 className="text-lg font-bold">{t('detailTitle')}</h3>
							<button type="button" onClick={() => setDetail(null)}><X size={18} /></button>
						</div>
						{detailLoading || !detail ? (
							<div className="h-40 animate-pulse rounded-xl bg-slate-100" />
						) : (
							<div className="space-y-4 text-sm">
								<StatusPill status={detail.status} t={t} />
								<section>
									<h4 className="mb-1 font-semibold">{t('original')}</h4>
									<p>From: {detail.senderName} &lt;{detail.senderEmail}&gt;</p>
									<p>Subject: {detail.subject}</p>
									<pre className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-900">{detail.bodyText}</pre>
								</section>
								<section>
									<h4 className="mb-1 font-semibold">{t('generatedMemo')}</h4>
									<pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-900">{detail.formattedMessage || detail.memo}</pre>
								</section>
								<p>{t('delivery')}: {detail.whatsappStatus || '—'}</p>
								<p>{t('processedAt')}: {detail.processedAt ? new Date(detail.processedAt).toLocaleString() : '—'}</p>
								{detail.gmailUrl ? (
									<a href={detail.gmailUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#6366F1]">
										{t('openGmail')} <ExternalLink size={14} />
									</a>
								) : null}
							</div>
						)}
					</aside>
				</div>
			) : null}

			{settingsOpen && settings ? (
				<div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-slate-950/30 p-4 backdrop-blur-[1px]" onClick={() => setSettingsOpen(false)}>
					<div className="w-full max-w-2xl rounded-[24px] border border-[#E5E7EB] bg-white p-5 dark:bg-slate-950" onClick={(e) => e.stopPropagation()} style={{ boxShadow: STUDIO.shadow }}>
						<div className="mb-4 flex items-center justify-between">
							<h3 className="text-lg font-bold">{t('settingsTitle')}</h3>
							<button type="button" onClick={() => setSettingsOpen(false)}><X size={18} /></button>
						</div>
						<div className="mb-4 flex gap-2 text-sm">
							{[
								['email', t('emailProcessing')],
								['ai', t('aiSettings')],
								['wa', t('whatsappSettings')],
							].map(([id, label]) => (
								<button
									key={id}
									type="button"
									onClick={() => setSettingsTab(id)}
									className={`rounded-full px-3 py-1 font-semibold ${settingsTab === id ? 'text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800'}`}
									style={settingsTab === id ? { background: STUDIO.gradient } : undefined}
								>
									{label}
								</button>
							))}
						</div>

						{settingsTab === 'email' && (
							<div className="space-y-3 text-sm">
								<Toggle row={settings} set={setSettings} field="processAllIncoming" label={t('processAll')} />
								<Toggle row={settings} set={setSettings} field="onlyUnread" label={t('onlyUnread')} />
								<Toggle row={settings} set={setSettings} field="ignorePromotional" label={t('ignorePromo')} />
								<Toggle row={settings} set={setSettings} field="ignoreNewsletters" label={t('ignoreNews')} />
								<label className="block">
									<div className="mb-1 font-semibold">{t('gmailQuery')}</div>
									<input className={FOCUS} value={settings.gmailQuery || ''} onChange={(e) => setSettings({ ...settings, gmailQuery: e.target.value })} placeholder={t('gmailQueryHint')} />
								</label>
								<CsvField label={t('includedSenders')} value={csvOf(settings.senderInclude)} onChange={(v) => setSettings({ ...settings, senderInclude: parseCsv(v) })} hint={t('commaHint')} />
								<CsvField label={t('excludedSenders')} value={csvOf(settings.senderExclude)} onChange={(v) => setSettings({ ...settings, senderExclude: parseCsv(v) })} hint={t('commaHint')} />
								<CsvField label={t('subjectFilters')} value={csvOf(settings.subjectInclude)} onChange={(v) => setSettings({ ...settings, subjectInclude: parseCsv(v) })} hint={t('commaHint')} />
								<CsvField label={t('gmailLabels')} value={csvOf(settings.gmailLabels)} onChange={(v) => setSettings({ ...settings, gmailLabels: parseCsv(v) })} />
								<label className="block">
									<div className="mb-1 font-semibold">{t('minPriority')}</div>
									<select className={FOCUS} value={settings.minPriority} onChange={(e) => setSettings({ ...settings, minPriority: e.target.value })}>
										<option value="low">{t('priorityLow')}</option>
										<option value="medium">{t('priorityMedium')}</option>
										<option value="high">{t('priorityHigh')}</option>
									</select>
								</label>
							</div>
						)}

						{settingsTab === 'ai' && (
							<div className="space-y-3 text-sm">
								<label className="block">
									<div className="mb-1 font-semibold">{t('aiFree')}</div>
									<select className={FOCUS} value={settings.aiProvider || 'ai-free'} onChange={(e) => setSettings({ ...settings, aiProvider: e.target.value })}>
										{(overview.ai.providers || [{ id: 'ai-free', label: t('aiFree') }]).map((provider) => (
											<option key={provider.id} value={provider.id}>{provider.label}</option>
										))}
									</select>
									<p className="mt-1 text-[11px] text-[#6B7280]">{t('aiFreeHint')}</p>
								</label>
								<div className="font-semibold">{t('memoLength')}</div>
								<div className="flex gap-3">
									{['short', 'medium', 'detailed'].map((len) => (
										<label key={len} className="flex items-center gap-2">
											<input type="radio" checked={settings.memoLength === len} onChange={() => setSettings({ ...settings, memoLength: len })} />
											{t(len)}
										</label>
									))}
								</div>
								<div className="font-semibold">{t('include')}</div>
								{[
									['includeSender', t('includeSender')],
									['includeSubject', t('includeSubject')],
									['includeSummary', t('includeSummary')],
									['includeAction', t('includeAction')],
									['includeDeadline', t('includeDeadline')],
									['includeGmailLink', t('includeGmailLink')],
								].map(([field, label]) => (
									<label key={field} className="flex items-center gap-2">
										<input type="checkbox" checked={Boolean(settings[field])} onChange={(e) => setSettings({ ...settings, [field]: e.target.checked })} />
										{label}
									</label>
								))}
								<label className="block">
									<div className="mb-1 font-semibold">{t('customInstructions')}</div>
									<textarea className={`min-h-24 ${FOCUS}`} value={settings.customInstructions || ''} onChange={(e) => setSettings({ ...settings, customInstructions: e.target.value })} placeholder={t('customHint')} />
								</label>
							</div>
						)}

						{settingsTab === 'wa' && (
							<div className="space-y-3 text-sm">
								<label className="block">
									<div className="mb-1 font-semibold">{t('targetChat')}</div>
									<select className={FOCUS} value={settings.targetChatId || ''} onChange={(e) => {
										const chat = chats.find((item) => item.id === e.target.value);
										setSettings({ ...settings, targetChatId: e.target.value || null, targetChatName: chat?.name || t('selfChat') });
									}}>
										<option value="">{t('selfChat')}</option>
										{chats.map((chat) => (
											<option key={chat.id} value={chat.id}>{chat.name}</option>
										))}
									</select>
								</label>
								<Toggle row={settings} set={setSettings} field="whatsappEnabled" label={t('enableNotif')} />
								<Toggle row={settings} set={setSettings} field="onlyImportant" label={t('onlyImportant')} />
								<div className="font-semibold">{t('notificationMode')}</div>
								{[
									['immediate', t('sendImmediate')],
									['batch30', t('batch30')],
									['digest', t('digest')],
								].map(([id, label]) => (
									<label key={id} className="flex items-center gap-2">
										<input type="radio" checked={settings.notificationMode === id} onChange={() => setSettings({ ...settings, notificationMode: id })} />
										{label}
									</label>
								))}
							</div>
						)}

						<StudioButton primary className="mt-5" disabled={busy === 'settings'} onClick={saveSettings}>
							{busy === 'settings' ? <Loader2 className="animate-spin" size={16} /> : t('save')}
						</StudioButton>
					</div>
				</div>
			) : null}
		</div>
	);
}

function FlowNode({ ok, label, icon: Icon }) {
	return (
		<div className="flex min-w-[120px] items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2">
			{ok ? <ReadyCheck size={14} /> : <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />}
			<Icon size={16} className="text-[#6366F1]" />
			<span className="text-sm font-semibold">{label}</span>
		</div>
	);
}

function UsageStat({ label, value }) {
	return (
		<div className="rounded-xl bg-slate-50 px-2 py-3 dark:bg-slate-800/60">
			<div className="text-lg font-black">{value}</div>
			<div className="text-[10px] leading-tight text-[#6B7280]">{label}</div>
		</div>
	);
}

function Toggle({ row, set, field, label }) {
	return (
		<label className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
			<span>{label}</span>
			<input type="checkbox" checked={Boolean(row[field])} onChange={(e) => set({ ...row, [field]: e.target.checked })} />
		</label>
	);
}

function CsvField({ label, value, onChange, hint }) {
	return (
		<label className="block">
			<div className="mb-1 font-semibold">{label}</div>
			<input className={FOCUS} value={value} onChange={(e) => onChange(e.target.value)} />
			{hint ? <p className="mt-1 text-[11px] text-[#6B7280]">{hint}</p> : null}
		</label>
	);
}
