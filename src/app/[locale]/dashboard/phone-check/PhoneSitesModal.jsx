'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Globe2, LoaderCircle, Plus, Trash2, X } from 'lucide-react';
import { phoneIntelApi } from './phone-intel-api';

const emptyForm = {
	name: '',
	urlTemplate: 'https://www.google.com/search?q=site%3Aexample.com+{quotedLocal}',
	domain: '',
	mode: 'engine',
	enabled: true,
	needsLogin: false,
	notes: '',
};

export default function PhoneSitesModal({ open, onClose, isAr, canManage, copy }) {
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [sites, setSites] = useState([]);
	const [form, setForm] = useState(emptyForm);
	const [editingId, setEditingId] = useState(null);

	const load = async () => {
		setLoading(true);
		setError('');
		try {
			const list = await phoneIntelApi.listSearchSites();
			setSites(Array.isArray(list) ? list : []);
		} catch (err) {
			setError(err?.response?.data?.message || copy.loadError);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (!open) return;
		setForm(emptyForm);
		setEditingId(null);
		void load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const onSave = async () => {
		if (!canManage) return;
		setSaving(true);
		setError('');
		try {
			const payload = {
				...form,
				domain: form.domain || null,
				notes: form.notes || null,
			};
			if (editingId) await phoneIntelApi.updateSearchSite(editingId, payload);
			else await phoneIntelApi.createSearchSite(payload);
			setForm(emptyForm);
			setEditingId(null);
			await load();
		} catch (err) {
			setError(err?.response?.data?.message || copy.saveError);
		} finally {
			setSaving(false);
		}
	};

	const onToggle = async site => {
		if (!canManage) return;
		try {
			await phoneIntelApi.updateSearchSite(site.id, {
				name: site.name,
				urlTemplate: site.urlTemplate,
				domain: site.domain,
				mode: site.mode,
				enabled: !site.enabled,
				needsLogin: site.needsLogin,
				notes: site.notes,
				sortOrder: site.sortOrder,
			});
			await load();
		} catch (err) {
			setError(err?.response?.data?.message || copy.saveError);
		}
	};

	const onEdit = site => {
		setEditingId(site.id);
		setForm({
			name: site.name || '',
			urlTemplate: site.urlTemplate || '',
			domain: site.domain || '',
			mode: site.mode || 'engine',
			enabled: site.enabled !== false,
			needsLogin: Boolean(site.needsLogin),
			notes: site.notes || '',
		});
	};

	const onRemove = async id => {
		if (!canManage || !window.confirm(copy.removeConfirm)) return;
		try {
			await phoneIntelApi.removeSearchSite(id);
			if (editingId === id) {
				setEditingId(null);
				setForm(emptyForm);
			}
			await load();
		} catch (err) {
			setError(err?.response?.data?.message || copy.saveError);
		}
	};

	return (
		<AnimatePresence>
			{open && (
				<motion.div
					className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-4 sm:items-center"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					onClick={onClose}
				>
					<motion.div
						initial={{ y: 28, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						exit={{ y: 16, opacity: 0 }}
						onClick={e => e.stopPropagation()}
						className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
					>
						<div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
							<div>
								<h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
									<Globe2 className="h-5 w-5 text-sky-600" />
									{copy.title}
								</h3>
								<p className="mt-1 text-sm text-slate-500">{copy.subtitle}</p>
							</div>
							<button
								type="button"
								onClick={onClose}
								className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
							>
								<X className="h-5 w-5" />
							</button>
						</div>

						<div className="flex-1 space-y-4 overflow-y-auto p-5">
							{error && (
								<div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
									{error}
								</div>
							)}
							<p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
								{copy.placeholders}
							</p>

							{loading ? (
								<div className="flex items-center gap-2 text-sm text-slate-500">
									<LoaderCircle className="h-4 w-4 animate-spin" />
									{copy.loading}
								</div>
							) : (
								<ul className="space-y-2">
									{sites.map(site => (
										<li
											key={site.id}
											className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
										>
											<button
												type="button"
												onClick={() => onEdit(site)}
												className="min-w-0 flex-1 text-start"
											>
												<div className="truncate text-sm font-semibold text-slate-900">
													{site.name}
												</div>
												<div className="truncate text-xs text-slate-500">
													{site.mode}
													{site.needsLogin ? ` · ${copy.needsLogin}` : ''}
													{site.domain ? ` · ${site.domain}` : ''}
												</div>
											</button>
											<div className="flex items-center gap-2">
												<button
													type="button"
													disabled={!canManage}
													onClick={() => onToggle(site)}
													className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
														site.enabled
															? 'bg-emerald-100 text-emerald-800'
															: 'bg-slate-200 text-slate-600'
													}`}
												>
													{site.enabled ? copy.enabled : copy.disabled}
												</button>
												{canManage && (
													<button
														type="button"
														onClick={() => onRemove(site.id)}
														className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
													>
														<Trash2 className="h-4 w-4" />
													</button>
												)}
											</div>
										</li>
									))}
								</ul>
							)}

							{canManage && (
								<div className="space-y-2 rounded-xl border border-slate-200 p-3">
									<div className="text-sm font-semibold text-slate-800">
										{editingId ? copy.edit : copy.add}
									</div>
									<input
										value={form.name}
										onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
										placeholder={copy.namePh}
										className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
									/>
									<input
										value={form.urlTemplate}
										onChange={e => setForm(f => ({ ...f, urlTemplate: e.target.value }))}
										placeholder={copy.urlPh}
										className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
									/>
									<input
										value={form.domain}
										onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
										placeholder={copy.domainPh}
										className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
									/>
									<select
										value={form.mode}
										onChange={e => setForm(f => ({ ...f, mode: e.target.value }))}
										className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
									>
										<option value="engine">{copy.modeEngine}</option>
										<option value="url">{copy.modeUrl}</option>
										<option value="manual">{copy.modeManual}</option>
									</select>
									<label className="flex items-center gap-2 text-sm text-slate-700">
										<input
											type="checkbox"
											checked={form.needsLogin}
											onChange={e =>
												setForm(f => ({ ...f, needsLogin: e.target.checked }))
											}
										/>
										{copy.needsLogin}
									</label>
									<textarea
										value={form.notes}
										onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
										rows={2}
										placeholder={copy.notesPh}
										className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
									/>
									<button
										type="button"
										disabled={saving || !form.name.trim() || !form.urlTemplate.trim()}
										onClick={onSave}
										className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
									>
										{saving ? (
											<LoaderCircle className="h-4 w-4 animate-spin" />
										) : (
											<Plus className="h-4 w-4" />
										)}
										{editingId ? copy.save : copy.add}
									</button>
								</div>
							)}

							{!canManage && (
								<p className="text-xs text-slate-500">{copy.readOnly}</p>
							)}
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
