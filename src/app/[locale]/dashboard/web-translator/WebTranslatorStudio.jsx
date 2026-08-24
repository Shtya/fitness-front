'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import {
	Bookmark,
	Copy,
	ExternalLink,
	Languages,
	Puzzle,
	Search,
	Settings,
	Trash2,
} from 'lucide-react';
import { webTranslatorApi } from '@/lib/web-translator/web-translator-api';
import { STUDIO } from '../ai-content-studio/components/studio-theme';
import { CustomSelect } from '../ai-content-studio/components/CustomSelect';

const TABS = ['overview', 'words', 'extension', 'settings'];

function TranslatorLogo({ size = 40 }) {
	return (
		<span
			className="relative inline-flex shrink-0 items-center justify-center text-white"
			style={{
				width: size,
				height: size,
				borderRadius: 12,
				background: STUDIO.gradientBr,
				boxShadow: STUDIO.shadow3dPrimary,
			}}
		>
			<Languages size={Math.round(size * 0.48)} />
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
				primary ? 'border-transparent text-white' : 'bg-white text-[#111827] hover:bg-slate-50'
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

function Card({ children, className = '' }) {
	return (
		<div className={`rounded-[20px] bg-white p-4 sm:p-5 ${className}`} style={{ boxShadow: STUDIO.shadowCard }}>
			{children}
		</div>
	);
}

export default function WebTranslatorStudio() {
	const t = useTranslations('webTranslator');
	const locale = useLocale();
	const isRtl = locale === 'ar';
	const [tab, setTab] = useState('overview');
	const [loading, setLoading] = useState(true);
	const [me, setMe] = useState(null);
	const [settings, setSettings] = useState(null);
	const [words, setWords] = useState([]);
	const [recent, setRecent] = useState([]);
	const [query, setQuery] = useState('');
	const [lookupText, setLookupText] = useState('');
	const [lookup, setLookup] = useState(null);
	const [busy, setBusy] = useState('');
	const [pairing, setPairing] = useState(null);

	const langOptions = useMemo(
		() => [
			{ value: 'auto', label: t('auto') },
			{ value: 'en', label: t('english') },
			{ value: 'ar', label: t('arabic') },
		],
		[t],
	);
	const targetOptions = useMemo(
		() => [
			{ value: 'ar', label: t('arabic') },
			{ value: 'en', label: t('english') },
		],
		[t],
	);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const [meRes, wordsRes, recentRes] = await Promise.all([
				webTranslatorApi.me(),
				webTranslatorApi.words({ limit: 50 }),
				webTranslatorApi.recent(12),
			]);
			setMe(meRes.data);
			setSettings(meRes.data?.settings || null);
			setWords(wordsRes.data?.items || []);
			setRecent(recentRes.data?.items || []);
		} catch (err) {
			toast.error(err?.response?.data?.message || err.message || t('loadError'));
		} finally {
			setLoading(false);
		}
	}, [t]);

	useEffect(() => {
		load();
	}, [load]);

	const runLookup = async (event) => {
		event?.preventDefault?.();
		const text = lookupText.trim();
		if (!text) return;
		setBusy('lookup');
		try {
			const { data } = await webTranslatorApi.lookup({
				text,
				sourceLang: settings?.sourceLang,
				targetLang: settings?.targetLang,
			});
			setLookup(data);
			load();
		} catch (err) {
			toast.error(err?.response?.data?.message || t('lookupError'));
		} finally {
			setBusy('');
		}
	};

	const saveCurrent = async (payload) => {
		setBusy('save');
		try {
			const { data } = await webTranslatorApi.saveWord(payload);
			setLookup((prev) => (prev ? { ...prev, saved: true, savedId: data.id, websitePath: data.websitePath } : prev));
			toast.success(t('saved'));
			load();
		} catch (err) {
			toast.error(err?.response?.data?.message || t('saveError'));
		} finally {
			setBusy('');
		}
	};

	const removeWord = async (id) => {
		setBusy(`del-${id}`);
		try {
			await webTranslatorApi.deleteWord(id);
			toast.success(t('deleted'));
			load();
		} catch (err) {
			toast.error(err?.response?.data?.message || t('saveError'));
		} finally {
			setBusy('');
		}
	};

	const saveSettings = async (patch) => {
		const next = { ...settings, ...patch };
		setSettings(next);
		try {
			const { data } = await webTranslatorApi.saveSettings(patch);
			setSettings(data);
			toast.success(t('settingsSaved'));
		} catch (err) {
			toast.error(err?.response?.data?.message || t('saveError'));
		}
	};

	const makePairing = async () => {
		setBusy('pair');
		try {
			const { data } = await webTranslatorApi.createPairing();
			setPairing(data);
		} catch (err) {
			toast.error(err?.response?.data?.message || t('saveError'));
		} finally {
			setBusy('');
		}
	};

	const copyCode = async () => {
		if (!pairing?.code) return;
		await navigator.clipboard.writeText(pairing.code);
		toast.success(t('copied'));
	};

	const filteredWords = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return words;
		return words.filter((w) => `${w.text} ${w.translation}`.toLowerCase().includes(q));
	}, [words, query]);

	return (
		<div dir={isRtl ? 'rtl' : 'ltr'} className="relative min-h-full p-4 sm:p-6" style={{ background: STUDIO.page }}>
			<header className="mb-5 flex flex-wrap items-center gap-3 rounded-[20px] bg-white px-5 py-3" style={{ boxShadow: STUDIO.shadowCard }}>
				<TranslatorLogo />
				<div className="min-w-0 flex-1">
					<h1 className="truncate text-[16px] font-bold text-[#111827]">{t('title')}</h1>
					<p className="truncate text-[12px] text-[#6B7280]">{t('subtitle')}</p>
				</div>
				<div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
					{TABS.map((id) => (
						<button
							key={id}
							type="button"
							onClick={() => setTab(id)}
							className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold ${tab === id ? 'bg-white text-[#111827]' : 'text-slate-500'}`}
							style={tab === id ? { boxShadow: STUDIO.shadow3d } : undefined}
						>
							{t(`tabs.${id}`)}
						</button>
					))}
				</div>
			</header>

			{loading ? (
				<div className="grid gap-4 md:grid-cols-3">
					{[1, 2, 3].map((n) => (
						<div key={n} className="h-40 animate-pulse rounded-[20px] bg-white" />
					))}
				</div>
			) : (
				<>
					{tab === 'overview' && (
						<div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
							<div className="space-y-4">
								<Card>
									<div className="mb-3 flex items-center justify-between gap-3">
										<p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{t('tryLookup')}</p>
										<StudioButton primary disabled={busy === 'lookup'} onClick={runLookup}>
											{t('translate')}
										</StudioButton>
									</div>
									<form onSubmit={runLookup}>
										<input
											value={lookupText}
											onChange={(e) => setLookupText(e.target.value)}
											placeholder={t('lookupPlaceholder')}
											className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-300"
										/>
									</form>
									{lookup && (
										<div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
											<p className="text-sm font-semibold text-slate-900" dir="auto">{lookup.text}</p>
											<p className="mt-1 text-lg font-bold text-[#4F46E5]" dir="auto">{lookup.translation}</p>
											<div className="mt-3 grid gap-2 text-[12px] text-slate-600">
												{lookup.pronunciation && <p>{t('pronunciation')}: {lookup.pronunciation}</p>}
												{lookup.partOfSpeech && <p>{t('partOfSpeech')}: {lookup.partOfSpeech}</p>}
												{lookup.example && <p>{t('example')}: {lookup.example}</p>}
											</div>
											<div className="mt-3 flex flex-wrap gap-2">
												<StudioButton
													primary
													disabled={lookup.saved || busy === 'save'}
													onClick={() => saveCurrent(lookup)}
												>
													<Bookmark size={13} /> {lookup.saved ? t('saved') : t('save')}
												</StudioButton>
												{lookup.savedId && (
													<Link href={`/${locale}${lookup.websitePath || `/dashboard/web-translator/words/${lookup.savedId}`}`}>
														<StudioButton>
															<ExternalLink size={13} /> {t('openWebsite')}
														</StudioButton>
													</Link>
												)}
											</div>
										</div>
									)}
								</Card>
								<Card>
									<p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-slate-500">{t('recent')}</p>
									{recent.length === 0 ? (
										<p className="text-sm text-slate-500">{t('emptyRecent')}</p>
									) : (
										<div className="space-y-2">
											{recent.map((item) => (
												<div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2">
													<div className="min-w-0">
														<p className="truncate text-sm font-semibold" dir="auto">{item.text}</p>
														<p className="truncate text-[12px] text-indigo-600" dir="auto">{item.translation}</p>
													</div>
													<StudioButton onClick={() => saveCurrent(item)}>{t('save')}</StudioButton>
												</div>
											))}
										</div>
									)}
								</Card>
							</div>
							<div className="space-y-4">
								<Card>
									<p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500">{t('account')}</p>
									<p className="text-sm font-bold text-slate-900">{me?.user?.name}</p>
									<p className="text-[12px] text-slate-500">{t('signedInAs')} {me?.user?.email}</p>
									<div className="mt-3 flex gap-2 text-[12px] font-semibold">
										<span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{t('savedCount', { count: words.length })}</span>
										<span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700">{t('recentCount', { count: recent.length })}</span>
									</div>
								</Card>
								<Card>
									<p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-slate-500">{t('languages')}</p>
									<div className="grid gap-3">
										<div>
											<p className="mb-1 text-[11px] font-semibold text-slate-500">{t('source')}</p>
											<CustomSelect
												value={settings?.sourceLang || 'auto'}
												onChange={(v) => saveSettings({ sourceLang: v })}
												options={langOptions}
											/>
										</div>
										<div>
											<p className="mb-1 text-[11px] font-semibold text-slate-500">{t('target')}</p>
											<CustomSelect
												value={settings?.targetLang || 'ar'}
												onChange={(v) => saveSettings({ targetLang: v })}
												options={targetOptions}
											/>
										</div>
									</div>
								</Card>
							</div>
						</div>
					)}

					{tab === 'words' && (
						<Card>
							<div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 px-3">
								<Search size={15} className="text-slate-400" />
								<input
									value={query}
									onChange={(e) => setQuery(e.target.value)}
									placeholder={t('search')}
									className="h-10 w-full bg-transparent text-sm outline-none"
								/>
							</div>
							{filteredWords.length === 0 ? (
								<p className="text-sm text-slate-500">{t('emptyWords')}</p>
							) : (
								<div className="space-y-2">
									{filteredWords.map((word) => (
										<div key={word.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 px-4 py-3">
											<div className="min-w-0">
												<p className="font-semibold text-slate-900" dir="auto">{word.text}</p>
												<p className="text-sm text-indigo-600" dir="auto">{word.translation}</p>
												{(word.partOfSpeech || word.pronunciation) && (
													<p className="mt-1 text-[11px] text-slate-500">
														{[word.partOfSpeech, word.pronunciation].filter(Boolean).join(' · ')}
													</p>
												)}
											</div>
											<div className="flex gap-2">
												<Link href={`/${locale}${word.websitePath}`}>
													<StudioButton><ExternalLink size={13} /> {t('openWebsite')}</StudioButton>
												</Link>
												<StudioButton disabled={busy === `del-${word.id}`} onClick={() => removeWord(word.id)}>
													<Trash2 size={13} /> {t('delete')}
												</StudioButton>
											</div>
										</div>
									))}
								</div>
							)}
						</Card>
					)}

					{tab === 'extension' && (
						<div className="grid gap-4 lg:grid-cols-2">
							<Card>
								<div className="mb-3 flex items-center gap-2">
									<Puzzle size={16} className="text-indigo-600" />
									<p className="text-[13px] font-bold">{t('pairing')}</p>
								</div>
								<p className="mb-4 text-sm text-slate-500">{t('pairingHint')}</p>
								<StudioButton primary disabled={busy === 'pair'} onClick={makePairing}>
									{t('generateCode')}
								</StudioButton>
								{pairing?.code && (
									<div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
										<p className="font-mono text-2xl font-black tracking-[0.3em] text-slate-900">{pairing.code}</p>
										<StudioButton onClick={copyCode}><Copy size={13} /> {t('copy')}</StudioButton>
									</div>
								)}
							</Card>
							<Card>
								<p className="mb-3 text-[13px] font-bold">{t('installTitle')}</p>
								<ul className="space-y-3 text-sm leading-6 text-slate-600">
									<li>{t('installChrome')}</li>
									<li>{t('installFirefox')}</li>
									<li>{t('doubleClick')}</li>
									<li>{t('contextMenu')}</li>
									<li>{t('shortcut')}</li>
								</ul>
							</Card>
						</div>
					)}

					{tab === 'settings' && (
						<Card className="max-w-xl">
							<div className="mb-4 flex items-center gap-2">
								<Settings size={16} className="text-indigo-600" />
								<p className="text-[13px] font-bold">{t('tabs.settings')}</p>
							</div>
							<div className="space-y-4">
								<div>
									<p className="mb-1 text-[11px] font-semibold text-slate-500">{t('uiLanguage')}</p>
									<CustomSelect
										value={settings?.locale || locale}
										onChange={(v) => saveSettings({ locale: v })}
										options={[{ value: 'en', label: t('english') }, { value: 'ar', label: t('arabic') }]}
									/>
								</div>
								<label className="flex items-center justify-between gap-3 text-sm">
									<span>{t('doubleClickEnabled')}</span>
									<input
										type="checkbox"
										checked={settings?.doubleClickEnabled !== false}
										onChange={(e) => saveSettings({ doubleClickEnabled: e.target.checked })}
									/>
								</label>
								<label className="flex items-center justify-between gap-3 text-sm">
									<span>{t('selectionEnabled')}</span>
									<input
										type="checkbox"
										checked={settings?.selectionEnabled !== false}
										onChange={(e) => saveSettings({ selectionEnabled: e.target.checked })}
									/>
								</label>
							</div>
						</Card>
					)}
				</>
			)}
		</div>
	);
}
