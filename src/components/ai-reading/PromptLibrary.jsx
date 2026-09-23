'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import { createPrompt, uid } from '@/lib/ai-reading/schemas';
import { deletePrompt, listPrompts, upsertPrompt, ensureDefaultMemorizePrompt } from '@/lib/ai-reading/storage';
import { extractVariables } from '@/lib/ai-reading/prompts';
import { aiReadingApi } from '@/lib/ai-reading/client-api';

export default function PromptLibrary() {
	const t = useTranslations('aiReading');
	const [prompts, setPrompts] = useState([]);
	const [editing, setEditing] = useState(null);
	const [copiedId, setCopiedId] = useState(null);

	const refresh = () => setPrompts(ensureDefaultMemorizePrompt());

	useEffect(() => {
		refresh();
		const onChange = e => {
			if (e?.detail?.key?.includes?.('prompts')) refresh();
		};
		window.addEventListener('ai-reading:changed', onChange);
		return () => window.removeEventListener('ai-reading:changed', onChange);
	}, []);

	const save = prompt => {
		const next = upsertPrompt({
			...prompt,
			category: 'custom',
			variables: extractVariables(prompt.body),
		});
		aiReadingApi.savePrompt(next).catch(() => {});
		setEditing(null);
		refresh();
	};

	const remove = id => {
		deletePrompt(id);
		aiReadingApi.deletePrompt(id).catch(() => {});
		refresh();
	};

	const toggleFav = p => {
		save({ ...p, favorite: !p.favorite });
	};

	const copyPrompt = async p => {
		try {
			await navigator.clipboard.writeText(p.body);
			setCopiedId(p.id);
			setTimeout(() => setCopiedId(null), 1600);
		} catch {
			/* ignore */
		}
	};

	const openNew = () =>
		setEditing(
			createPrompt({
				id: uid('prompt'),
				title: '',
				body: '',
				category: 'custom',
			}),
		);

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold tracking-tight text-[#1a2e28]">
						{t('prompts.title')}
					</h1>
					<p className="mt-1.5 text-sm text-[#5c6b63]">{t('prompts.subtitle')}</p>
				</div>
				<button
					type="button"
					onClick={openNew}
					className="inline-flex items-center gap-2 rounded-full bg-[#1a2e28] px-4 py-2 text-sm font-semibold text-[#f6f1e8]"
				>
					<Plus size={14} /> {t('prompts.create')}
				</button>
			</div>

			{prompts.length === 0 ? (
				<div className="rounded-3xl border border-dashed border-[#2d4a3e]/20 bg-white/40 px-6 py-16 text-center">
					<p className="text-sm text-[#5c6b63]">{t('prompts.empty')}</p>
					<button
						type="button"
						onClick={openNew}
						className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1a2e28] px-4 py-2 text-sm font-semibold text-[#f6f1e8]"
					>
						<Plus size={14} /> {t('prompts.create')}
					</button>
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2">
					{prompts.map(p => (
						<motion.article
							key={p.id}
							layout
							className="group relative flex flex-col rounded-2xl border border-[#2d4a3e]/10 bg-white/80 p-4 shadow-sm transition hover:border-[#2d4a3e]/20 hover:shadow-md"
						>
							<div className="mb-3 flex items-start justify-between gap-2">
								<h3 className="min-w-0 font-[family-name:var(--font-space-grotesk)] text-base font-bold text-[#1a2e28]">
									{p.title || t('prompts.untitled')}
								</h3>
								<div className="flex shrink-0 gap-0.5">
									<button
										type="button"
										title={t('prompts.copy')}
										onClick={() => copyPrompt(p)}
										className="rounded-lg p-1.5 hover:bg-[#1a2e28]/[0.06]"
									>
										{copiedId === p.id ? (
											<Check size={14} className="text-emerald-600" />
										) : (
											<Copy size={14} className="text-[#5c6b63]" />
										)}
									</button>
									<button type="button" onClick={() => toggleFav(p)} className="rounded-lg p-1.5 hover:bg-black/5">
										<Star size={14} className={p.favorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'} />
									</button>
									<button type="button" onClick={() => setEditing(p)} className="rounded-lg p-1.5 hover:bg-black/5">
										<Pencil size={14} className="text-slate-500" />
									</button>
									<button type="button" onClick={() => remove(p.id)} className="rounded-lg p-1.5 hover:bg-rose-50">
										<Trash2 size={14} className="text-rose-400" />
									</button>
								</div>
							</div>
							<p className="flex-1 whitespace-pre-wrap text-[13px] leading-relaxed text-[#3d4a42] line-clamp-6">{p.body}</p>
							{copiedId === p.id && (
								<span className="absolute bottom-3 end-3 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
									{t('prompts.copied')}
								</span>
							)}
						</motion.article>
					))}
				</div>
			)}

			<AnimatePresence>
				{editing && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
					>
						<motion.div
							initial={{ y: 16, opacity: 0 }}
							animate={{ y: 0, opacity: 1 }}
							className="w-full max-w-lg rounded-3xl bg-[#f6f1e8] p-5 shadow-2xl"
						>
							<div className="mb-4 flex items-center justify-between">
								<h2 className="font-bold text-[#1a2e28]">
									{editing.title || editing.body ? t('prompts.edit') : t('prompts.create')}
								</h2>
								<button type="button" onClick={() => setEditing(null)}>
									<X size={16} />
								</button>
							</div>
							<div className="space-y-3">
								<input
									value={editing.title}
									onChange={e => setEditing({ ...editing, title: e.target.value })}
									className="w-full rounded-xl border border-[#2d4a3e]/15 bg-white px-3 py-2.5 text-sm outline-none"
									placeholder={t('prompts.titleField')}
									autoFocus
								/>
								<textarea
									value={editing.body}
									onChange={e => setEditing({ ...editing, body: e.target.value })}
									rows={9}
									className="w-full rounded-xl border border-[#2d4a3e]/15 bg-white px-3 py-2.5 text-sm leading-relaxed outline-none"
									placeholder={t('prompts.bodyHint')}
								/>
								<button
									type="button"
									disabled={!editing.title?.trim() || !editing.body?.trim()}
									onClick={() => save(editing)}
									className="rounded-full bg-[#1a2e28] px-5 py-2.5 text-sm font-semibold text-[#f6f1e8] disabled:opacity-40"
								>
									{t('common.save')}
								</button>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
