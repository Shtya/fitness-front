'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { motion } from 'framer-motion';
import { Loader2, Mic2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { DEPTHS, READING_TIMES, STYLES } from '@/lib/ai-reading/schemas';
import { aiReadingApi } from '@/lib/ai-reading/client-api';
import { listPrompts, upsertBook } from '@/lib/ai-reading/storage';
import { interpolate } from '@/lib/ai-reading/prompts';
import CustomSelect from '@/components/ai-reading/CustomSelect';

const emptyTranscript = () => ({ id: Math.random().toString(36).slice(2, 9), title: '', text: '' });

export default function GenerateForm() {
	const t = useTranslations('aiReading');
	const locale = useLocale();
	const router = useRouter();
	const [mode, setMode] = useState('topic'); // topic | transcripts
	const [topic, setTopic] = useState('');
	const [style, setStyle] = useState('narrative');
	const [depth, setDepth] = useState('standard');
	const [language, setLanguage] = useState(locale === 'ar' ? 'ar' : 'en');
	const [readingTimeMinutes, setReadingTimeMinutes] = useState(10);
	const [promptId, setPromptId] = useState('');
	const [prompts, setPrompts] = useState([]);
	const [customPrompt, setCustomPrompt] = useState('');
	const [transcripts, setTranscripts] = useState([emptyTranscript(), emptyTranscript()]);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [aiStatus, setAiStatus] = useState(null);

	useEffect(() => {
		setPrompts(listPrompts());
		aiReadingApi
			.getStatus()
			.then(data => setAiStatus(data.ai || null))
			.catch(() => setAiStatus({ configured: false, label: 'Local fallback' }));
	}, []);

	const selected = prompts.find(p => p.id === promptId);

	const submit = async e => {
		e.preventDefault();
		setBusy(true);
		setError('');
		try {
			const promptTemplate =
				mode === 'transcripts'
					? customPrompt.trim() || undefined
					: selected
						? interpolate(selected.body, {
								topic,
								style,
								depth,
								language,
								readingTime: String(readingTimeMinutes),
							})
						: undefined;

			const payload =
				mode === 'transcripts'
					? {
							mode: 'transcripts',
							topic: topic.trim() || undefined,
							title: topic.trim() || undefined,
							language,
							readingTimeMinutes,
							promptTemplate,
							transcripts: transcripts
								.map(tr => ({ title: tr.title.trim(), text: tr.text.trim() }))
								.filter(tr => tr.text.length > 40),
						}
					: {
							mode: 'topic',
							topic: topic.trim(),
							style,
							depth,
							language,
							readingTimeMinutes,
							promptTemplate,
						};

			if (mode === 'topic' && !topic.trim()) {
				setError(t('generate.topicRequired'));
				setBusy(false);
				return;
			}
			if (mode === 'transcripts' && !payload.transcripts.length) {
				setError(t('generate.transcriptRequired'));
				setBusy(false);
				return;
			}

			const data = await aiReadingApi.generate(payload);
			if (data.ai) setAiStatus(data.ai);
			upsertBook(data.book);
			router.push(`/ai-studio/read/${data.book.id}`);
		} catch (err) {
			setError(err.message || t('errors.generate'));
		} finally {
			setBusy(false);
		}
	};

	return (
		<form onSubmit={submit} className="space-y-6">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h2 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold tracking-tight text-[var(--ar-heading)]">
						{t('generate.title')}
					</h2>
					<p className="mt-1.5 text-sm text-[var(--ar-muted)]">{t('generate.subtitle')}</p>
				</div>
				<div className="rounded-2xl border border-[color:var(--ar-border)]/10 bg-white/70 px-3.5 py-2.5 text-end">
					<p className="text-[10px] font-bold uppercase tracking-wider text-[var(--ar-muted)]">{t('generate.poweredBy')}</p>
					<p className="mt-0.5 text-sm font-semibold text-[var(--ar-heading)]">
						{aiStatus?.label || t('generate.checkingAi')}
					</p>
				</div>
			</div>

			<div className="flex gap-2">
				{[
					['topic', t('generate.modeTopic')],
					['transcripts', t('generate.modeTranscripts')],
				].map(([id, label]) => (
					<button
						key={id}
						type="button"
						onClick={() => {
							setMode(id);
							if (id === 'transcripts') setReadingTimeMinutes(15);
						}}
						className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold ${
							mode === id ? 'bg-[var(--ar-accent)] text-white' : 'bg-white/70 text-[var(--ar-muted)]'
						}`}
					>
						{id === 'transcripts' ? <Mic2 size={12} /> : <Sparkles size={12} />}
						{label}
					</button>
				))}
			</div>

			{mode === 'topic' ? (
				<label className="block">
					<span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ar-muted)]">{t('generate.topic')}</span>
					<textarea
						value={topic}
						onChange={e => setTopic(e.target.value)}
						rows={3}
						placeholder={t('generate.topicPlaceholder')}
						className="w-full rounded-2xl border border-[color:var(--ar-border)]/15 bg-white/70 px-4 py-3 text-sm text-[var(--ar-heading)] outline-none ring-[var(--ar-accent)]/30 focus:ring-2"
					/>
				</label>
			) : (
				<div className="space-y-4">
					<label className="block">
						<span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ar-muted)]">{t('generate.articleTitle')}</span>
						<input
							value={topic}
							onChange={e => setTopic(e.target.value)}
							placeholder={t('generate.articleTitlePlaceholder')}
							className="w-full rounded-xl border border-[color:var(--ar-border)]/15 bg-white/70 px-3 py-2.5 text-sm outline-none"
						/>
					</label>

					<label className="block">
						<span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ar-muted)]">{t('generate.transcriptPrompt')}</span>
						<textarea
							value={customPrompt}
							onChange={e => setCustomPrompt(e.target.value)}
							rows={4}
							placeholder={t('generate.transcriptPromptPlaceholder')}
							className="w-full rounded-2xl border border-[color:var(--ar-border)]/15 bg-white/70 px-4 py-3 text-sm outline-none ring-[var(--ar-accent)]/30 focus:ring-2"
						/>
					</label>

					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold uppercase tracking-wide text-[var(--ar-muted)]">{t('generate.transcripts')}</span>
							<button
								type="button"
								onClick={() => setTranscripts(list => [...list, emptyTranscript()])}
								className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--ar-accent)]"
							>
								<Plus size={12} /> {t('generate.addTranscript')}
							</button>
						</div>
						{transcripts.map((tr, idx) => (
							<div key={tr.id} className="rounded-2xl border border-[color:var(--ar-border)]/10 bg-white/60 p-3">
								<div className="mb-2 flex items-center gap-2">
									<input
										value={tr.title}
										onChange={e =>
											setTranscripts(list => list.map(x => (x.id === tr.id ? { ...x, title: e.target.value } : x)))
										}
										placeholder={t('generate.transcriptTitle', { n: idx + 1 })}
										className="flex-1 rounded-lg border border-[color:var(--ar-border)]/10 bg-white px-3 py-2 text-sm outline-none"
									/>
									{transcripts.length > 1 && (
										<button
											type="button"
											onClick={() => setTranscripts(list => list.filter(x => x.id !== tr.id))}
											className="rounded-lg p-2 text-rose-400 hover:bg-rose-50"
										>
											<Trash2 size={14} />
										</button>
									)}
								</div>
								<textarea
									value={tr.text}
									onChange={e =>
										setTranscripts(list => list.map(x => (x.id === tr.id ? { ...x, text: e.target.value } : x)))
									}
									rows={8}
									placeholder={t('generate.transcriptPaste')}
									className="w-full rounded-xl border border-[color:var(--ar-border)]/10 bg-white px-3 py-2 font-mono text-[12px] leading-relaxed outline-none"
								/>
							</div>
						))}
					</div>
				</div>
			)}

			<div className="grid gap-4 sm:grid-cols-2">
				{mode === 'topic' && (
					<>
						<label className="block">
							<span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ar-muted)]">{t('generate.style')}</span>
							<CustomSelect
								value={style}
								onChange={setStyle}
								options={STYLES.map(s => ({ value: s, label: t(`styles.${s}`) }))}
							/>
						</label>
						<label className="block">
							<span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ar-muted)]">{t('generate.depth')}</span>
							<CustomSelect
								value={depth}
								onChange={setDepth}
								options={DEPTHS.map(d => ({ value: d, label: t(`depths.${d}`) }))}
							/>
						</label>
					</>
				)}
				<label className="block">
					<span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ar-muted)]">{t('generate.language')}</span>
					<CustomSelect
						value={language}
						onChange={setLanguage}
						options={[
							{ value: 'en', label: 'English' },
							{ value: 'ar', label: 'العربية' },
						]}
					/>
				</label>
				<label className="block">
					<span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ar-muted)]">{t('generate.time')}</span>
					<CustomSelect
						value={readingTimeMinutes}
						onChange={v => setReadingTimeMinutes(Number(v))}
						options={READING_TIMES.map(m => ({ value: m, label: `${m} ${t('generate.minutes')}` }))}
					/>
				</label>
			</div>

			{mode === 'topic' && (
				<label className="block">
					<span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ar-muted)]">{t('generate.savedPrompt')}</span>
					<CustomSelect
						value={promptId}
						onChange={setPromptId}
						placeholder={t('generate.defaultPrompt')}
						options={[
							{ value: '', label: t('generate.defaultPrompt') },
							...prompts.map(p => ({ value: p.id, label: `${p.favorite ? '★ ' : ''}${p.title}` })),
						]}
					/>
					{selected && (
						<p className="mt-2 rounded-xl bg-white/50 px-3 py-2 text-xs text-[var(--ar-muted)] whitespace-pre-wrap">{selected.body}</p>
					)}
				</label>
			)}

			{error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

			<motion.button
				type="submit"
				disabled={busy}
				whileHover={{ scale: 1.01 }}
				whileTap={{ scale: 0.98 }}
				className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
				style={{ background: 'linear-gradient(135deg, var(--ar-heading), var(--ar-accent))' }}
			>
				{busy ? <Loader2 size={16} className="animate-spin" /> : mode === 'transcripts' ? <Mic2 size={16} /> : <Sparkles size={16} />}
				{busy ? t('generate.generating') : mode === 'transcripts' ? t('generate.ctaTranscript') : t('generate.cta')}
			</motion.button>
		</form>
	);
}
