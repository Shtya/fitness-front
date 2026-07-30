'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
	Check,
	ExternalLink,
	KeyRound,
	LoaderCircle,
	Trash2,
	X,
} from 'lucide-react';
import { phoneIntelApi } from './phone-intel-api';

export default function PhoneKeysModal({
	open,
	onClose,
	isAr,
	canManage,
	copy,
	onSaved,
}) {
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [removing, setRemoving] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [data, setData] = useState(null);
	const [activeId, setActiveId] = useState(null);
	const [fields, setFields] = useState({});

	const load = async () => {
		setLoading(true);
		setError('');
		try {
			const res = await phoneIntelApi.credentials();
			setData(res);
			const first = res?.catalog?.[0]?.id || null;
			setActiveId(current => current || first);
		} catch (err) {
			setError(err?.response?.data?.message || copy.loadError);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (!open) return;
		setSuccess('');
		setError('');
		setFields({});
		void load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const catalog = data?.catalog || [];
	const statuses = useMemo(() => {
		const map = {};
		for (const p of data?.providers || []) map[p.provider] = p;
		return map;
	}, [data]);

	const active = catalog.find(c => c.id === activeId) || catalog[0];
	const activeStatus = active ? statuses[active.id] : null;

	useEffect(() => {
		setFields({});
		setSuccess('');
		setError('');
	}, [activeId]);

	const onSave = async () => {
		if (!active || !canManage) return;
		setSaving(true);
		setError('');
		setSuccess('');
		try {
			const status = await phoneIntelApi.saveCredential(active.id, fields);
			setSuccess(copy.saved);
			setFields({});
			setData(prev => {
				if (!prev) return prev;
				const providers = (prev.providers || []).map(p =>
					p.provider === status.provider ? status : p,
				);
				if (!providers.some(p => p.provider === status.provider)) providers.push(status);
				return { ...prev, providers };
			});
			onSaved?.(status);
		} catch (err) {
			setError(err?.response?.data?.message || copy.saveError);
		} finally {
			setSaving(false);
		}
	};

	const onRemove = async () => {
		if (!active || !canManage) return;
		if (!window.confirm(copy.removeConfirm)) return;
		setRemoving(true);
		setError('');
		setSuccess('');
		try {
			const status = await phoneIntelApi.removeCredential(active.id);
			setSuccess(copy.removed);
			setData(prev => {
				if (!prev) return prev;
				return {
					...prev,
					providers: (prev.providers || []).map(p =>
						p.provider === status.provider ? status : p,
					),
				};
			});
			onSaved?.(status);
		} catch (err) {
			setError(err?.response?.data?.message || copy.saveError);
		} finally {
			setRemoving(false);
		}
	};

	if (!open) return null;

	return (
		<AnimatePresence>
			<motion.div
				className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:items-center"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				onMouseDown={e => {
					if (e.target === e.currentTarget) onClose();
				}}
			>
				<motion.div
					role="dialog"
					aria-modal="true"
					aria-labelledby="phone-keys-title"
					initial={{ y: 28, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: 16, opacity: 0 }}
					className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
					onMouseDown={e => e.stopPropagation()}
				>
					<div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
						<div>
							<h2 id="phone-keys-title" className="flex items-center gap-2 text-lg font-bold text-slate-900">
								<KeyRound className="h-5 w-5 text-sky-600" />
								{copy.title}
							</h2>
							<p className="mt-1 text-sm text-slate-500">{copy.subtitle}</p>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
							aria-label={copy.close}
						>
							<X className="h-5 w-5" />
						</button>
					</div>

					<div className="grid min-h-0 flex-1 md:grid-cols-[220px_1fr]">
						<aside className="overflow-y-auto border-b border-slate-100 bg-slate-50/80 p-3 md:border-b-0 md:border-e">
							{loading && (
								<div className="flex items-center gap-2 px-2 py-3 text-sm text-slate-500">
									<LoaderCircle className="h-4 w-4 animate-spin" />
									{copy.loading}
								</div>
							)}
							{!loading &&
								catalog.map(item => {
									const st = statuses[item.id];
									const on = Boolean(st?.configured);
									return (
										<button
											key={item.id}
											type="button"
											onClick={() => setActiveId(item.id)}
											className={`mb-1 flex w-full flex-col rounded-xl px-3 py-2.5 text-start transition ${
												active?.id === item.id
													? 'bg-white shadow-sm ring-1 ring-sky-200'
													: 'hover:bg-white/80'
											}`}
										>
											<span className="text-sm font-semibold text-slate-900">{item.name}</span>
											<span
												className={`mt-1 text-[11px] font-medium ${
													on ? 'text-emerald-700' : 'text-slate-400'
												}`}
											>
												{on
													? `${copy.configured}${st?.lastFour ? ` · ••••${st.lastFour}` : ''}`
													: copy.missing}
											</span>
										</button>
									);
								})}
						</aside>

						<div className="overflow-y-auto p-5">
							{active && (
								<>
									<div className="mb-3">
										<h3 className="text-base font-bold text-slate-900">{active.name}</h3>
										<p className="mt-1 text-sm text-slate-600">
											{isAr ? active.purposeAr : active.purposeEn}
										</p>
										{activeStatus?.source && (
											<p className="mt-1 text-xs text-slate-400">
												{copy.source}: {activeStatus.source}
												{activeStatus.lastFour ? ` · ••••${activeStatus.lastFour}` : ''}
											</p>
										)}
									</div>

									<div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
										<p className="text-sm font-bold">{copy.stepsTitle}</p>
										<ol className="mt-2 list-decimal space-y-1 ps-5 text-xs leading-5">
											{(isAr ? active.stepsAr : active.stepsEn).map((step, i) => (
												<li key={i}>{step}</li>
											))}
										</ol>
										<div className="mt-3 flex flex-wrap gap-2">
											<a
												href={active.signupUrl}
												target="_blank"
												rel="noreferrer"
												className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100"
											>
												<ExternalLink className="h-3.5 w-3.5" />
												{copy.getKey}
											</a>
											<a
												href={active.docsUrl}
												target="_blank"
												rel="noreferrer"
												className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100"
											>
												<ExternalLink className="h-3.5 w-3.5" />
												{copy.docs}
											</a>
										</div>
									</div>

									{!canManage && (
										<p className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
											{copy.readOnly}
										</p>
									)}

									{(active.fields || []).map(field => (
										<div key={field.key} className="mb-3">
											<label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
												{isAr ? field.labelAr : field.labelEn}
											</label>
											<input
												type={field.secret ? 'password' : 'text'}
												value={fields[field.key] || ''}
												disabled={!canManage || saving}
												onChange={e =>
													setFields(prev => ({ ...prev, [field.key]: e.target.value }))
												}
												placeholder={
													activeStatus?.configured
														? `••••••••${activeStatus.lastFour || ''}`
														: field.placeholder
												}
												autoComplete="off"
												className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-sky-400 focus:bg-white disabled:opacity-60"
											/>
										</div>
									))}

									{error && (
										<p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
											{error}
										</p>
									)}
									{success && (
										<p className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
											<Check className="h-4 w-4" />
											{success}
										</p>
									)}

									{canManage && (
										<div className="mt-2 flex flex-wrap gap-2">
											<button
												type="button"
												disabled={
													saving ||
													!(active.fields || []).every(f => String(fields[f.key] || '').trim())
												}
												onClick={onSave}
												className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
											>
												{saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
												{copy.save}
											</button>
											{activeStatus?.source === 'database' && (
												<button
													type="button"
													disabled={removing}
													onClick={onRemove}
													className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
												>
													{removing ? (
														<LoaderCircle className="h-4 w-4 animate-spin" />
													) : (
														<Trash2 className="h-4 w-4" />
													)}
													{copy.remove}
												</button>
											)}
										</div>
									)}
								</>
							)}
						</div>
					</div>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	);
}
