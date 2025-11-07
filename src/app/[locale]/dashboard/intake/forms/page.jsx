'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'use-intl';
import { FiChevronDown, FiChevronUp, FiEdit2, FiFileText, FiPlus, FiShare2, FiTrash2, FiRefreshCw, FiKey } from 'react-icons/fi';

import { useRouter } from 'next/navigation';

import api from '@/utils/axios';
import Button from '@/components/atoms/Button';
import Input from '@/components/atoms/Input';
import { Input as Input2 } from '@/components/atoms/Input2';
import Select from '@/components/atoms/Select';
import CheckBox from '@/components/atoms/CheckBox';
import MultiLangText from '@/components/atoms/MultiLangText';

import { Modal } from '@/components/dashboard/ui/UI';
import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';
import { Notification } from '@/config/Notification';

// -------- constants (i18n labels تُقرأ من ar.json) --------
const FIELD_TYPE_OPTIONS = [
	{ id: 'text', labelKey: 'types.text' },
	{ id: 'email', labelKey: 'types.email' },
	{ id: 'number', labelKey: 'types.number' },
	{ id: 'phone', labelKey: 'types.phone' },
	{ id: 'date', labelKey: 'types.date' },
	{ id: 'textarea', labelKey: 'types.textarea' },
	{ id: 'select', labelKey: 'types.select' },
	{ id: 'radio', labelKey: 'types.radio' },
	{ id: 'checkbox', labelKey: 'types.checkbox' },
	{ id: 'checklist', labelKey: 'types.checklist' },
	{ id: 'file', labelKey: 'types.file' },
];

// -------- helpers --------
function genKey12() {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let s = '';
	for (let i = 0; i < 12; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
	return s;
}

function InputList({
	label,
	value = [],
	onChange,
	placeholder = 'Add option and press Enter',
	className = '',
	disabled = false,
	maxItems,
	commitOnBlur = true,
}) {
	const [items, setItems] = useState(Array.isArray(value) ? value : []);
	const [draft, setDraft] = useState('');

	useEffect(() => {
		setItems(Array.isArray(value) ? value : []);
	}, [value]);

	const emit = useCallback((next) => {
		setItems(next);
		onChange?.(next);
	}, [onChange]);

	const commitDraft = useCallback((text) => {
		const raw = (text ?? '').trim();
		if (!raw) return;

		// دعم اللصق بقيم متعددة مفصولة بفواصل
		const parts = raw
			.split(',')
			.map(s => s.trim())
			.filter(Boolean);

		let next = [...items];
		for (const p of parts) {
			if (!next.includes(p)) next.push(p);
		}

		if (typeof maxItems === 'number') {
			next = next.slice(0, maxItems);
		}

		emit(next);
		setDraft('');
	}, [items, emit, maxItems]);

	const handleKeyDown = (e) => {
		if (disabled) return;

		// Enter يضيف
		if (e.key === 'Enter') {
			e.preventDefault();
			commitDraft(draft);
		}

		// اختيارية: الكوما تفصل قيم أثناء الكتابة
		if (e.key === ',') {
			e.preventDefault();
			commitDraft(draft);
		}

		// Backspace على draft فاضي + فيه عناصر => امسح آخر عنصر
		if (e.key === 'Backspace' && draft === '' && items.length > 0) {
			e.preventDefault();
			const next = items.slice(0, -1);
			emit(next);
		}
	};

	const removeAt = (idx) => {
		if (disabled) return;
		const next = items.filter((_, i) => i !== idx);
		emit(next);
	};

	return (
		<div className={className}>
			{label && (
				<div className="text-sm font-medium text-slate-800 mb-1">
					{label}
				</div>
			)}

			<div className={`rounded-lg border ${disabled ? 'bg-slate-50' : 'bg-white'} border-slate-200 p-2`}>
				{/* Tags */}
				<div className="flex flex-wrap gap-2 mb-2">
					{items.map((opt, i) => (
						<span
							key={`${opt}-${i}`}
							className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700"
						>
							{opt}
							{!disabled && (
								<button
									type="button"
									onClick={() => removeAt(i)}
									className="ml-1 rounded hover:bg-slate-200 px-1"
									aria-label="remove option"
									title="remove"
								>
									×
								</button>
							)}
						</span>
					))}
				</div>

				{/* Input */}
				<input
					type="text"
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					onKeyDown={handleKeyDown}
					onBlur={() => { if (commitOnBlur) commitDraft(draft); }}
					placeholder={placeholder}
					disabled={disabled}
					className="w-full border-0 outline-none text-sm placeholder:text-slate-400 disabled:bg-transparent"
				/>
			</div>

		</div>
	);
}

export default function FormsManagementPage() {
	const t = useTranslations('forms'); // Namespace: forms
	const router = useRouter();

	// list state
	const [forms, setForms] = useState([]);
	const [filtered, setFiltered] = useState([]);
	const [query, setQuery] = useState('');

	const [selectedForm, setSelectedForm] = useState(null);
	const [isLoading, setIsLoading] = useState(true);

	// form modal
	const [showFormModal, setShowFormModal] = useState(false);

	// delete modal
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [deletingId, setDeletingId] = useState(null);
	const [isDeleting, setIsDeleting] = useState(false);

	// form states
	const [formTitle, setFormTitle] = useState('');
	const [formFields, setFormFields] = useState([]);

	// inline field editing state (index -> true/false)
	const [editingMap, setEditingMap] = useState({});

	const isEditing = !!selectedForm;

	// fetch
	const fetchForms = useCallback(async () => {
		setIsLoading(true);
		try {
			const res = await api.get('/forms');
			const list = res?.data?.data || res?.data || [];
			setForms(list);
			setFiltered(list);
			if (list.length && !selectedForm) setSelectedForm(list[0]);
		} catch (e) {
			Notification(t('messages.load_failed'), 'error');
		} finally {
			setIsLoading(false);
		}
	}, [selectedForm, t]);

	useEffect(() => {
		fetchForms();
	}, [fetchForms]);

	useEffect(() => {
		const q = query.trim().toLowerCase();
		if (!q) setFiltered(forms);
		else setFiltered(forms.filter(f => (f.title || '').toLowerCase().includes(q)));
	}, [query, forms]);

	const resetFormState = () => {
		setFormTitle('');
		setFormFields([]);
		setEditingMap({});
		setSelectedForm(null);
	};

	const openCreateFormModal = () => {
		resetFormState();
		setShowFormModal(true);
	};

	const openEditFormModal = (form) => {
		setSelectedForm(form);
		setFormTitle(form?.title || '');
		const normalized = (form?.fields || [])
			.slice()
			.sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0))
			.map(f => ({ ...f, _uid: f._uid ?? f.id ?? crypto.randomUUID() })); // ensure stable
		setFormFields(normalized);
		// no popups for adding fields—inline only
		setEditingMap({});
		setShowFormModal(true);
	};

	const getShareableLink = (formId) => `${window.location.origin}/form/${formId}/submit`;

	const copyLink = (id) => {
		const link = getShareableLink(id);
		navigator.clipboard.writeText(link);
		Notification(t('messages.link_copied'), 'success');
	};

	// -------- CRUD --------
	const createForm = async () => {
		const title = (formTitle || '').trim();
		if (!title) {
			Notification(t('errors.title_required'), 'error');
			return;
		}
		try {
			const payload = {
				title,
				fields: (formFields || []).map((f, idx) => ({
					label: f.label,
					key: f.key,
					placeholder: f.placeholder || '',
					type: f.type,
					required: !!f.required,
					options: f.options || [],
					order: idx,
				})),
			};
			await api.post('/forms', payload);
			Notification(t('messages.created'), 'success');
			setShowFormModal(false);
			resetFormState();
			fetchForms();
		} catch (e) {
			const msg = e?.response?.data?.message;
			Notification(Array.isArray(msg) ? msg.join(', ') : t('errors.create_failed'), 'error');
		}
	};

	const updateForm = async () => {
		if (!selectedForm?.id) return;
		const title = (formTitle || '').trim();
		if (!title) {
			Notification(t('errors.title_required'), 'error');
			return;
		}
		try {
			const ordered = formFields.map((f, idx) => ({ ...f, order: idx }));
			setFormFields(ordered);

			const existing = ordered.filter(f => !!f.id);
			const newlyAdded = ordered.filter(f => !f.id);

			// 1) patch title + existing fields
			await api.patch('/forms', {
				id: selectedForm.id,
				title,
				fields: existing.map(f => ({
					id: f.id,
					label: f.label,
					key: f.key,
					placeholder: f.placeholder || '',
					type: f.type,
					required: !!f.required,
					options: f.options || [],
					order: f.order,
				})),
			});

			// 2) add new fields
			if (newlyAdded.length) {
				await api.post(`/forms/${selectedForm.id}/fields`, {
					fields: newlyAdded.map(f => ({
						label: f.label,
						key: f.key,
						placeholder: f.placeholder || '',
						type: f.type,
						required: !!f.required,
						options: f.options || [],
						order: f.order,
					})),
				});
			}

			// 3) re-order (optional sync)
			if (existing.length) {
				await api.patch('/forms/re-order', {
					fields: existing.map(f => ({ id: f.id, order: f.order })),
				});
			}

			Notification(t('messages.updated'), 'success');
			setShowFormModal(false);
			resetFormState();
			fetchForms();
		} catch (e) {
			const msg = e?.response?.data?.message;
			Notification(Array.isArray(msg) ? msg.join(', ') : t('errors.update_failed'), 'error');
		}
	};

	const deleteForm = async (formId) => {
		try {
			setIsDeleting(true);
			await api.delete(`/forms/${formId}`);
			Notification(t('messages.deleted'), 'success');
			if (selectedForm?.id === formId) setSelectedForm(null);
			await fetchForms();
		} catch (e) {
			Notification(t('errors.delete_failed'), 'error');
		} finally {
			setIsDeleting(false);
			setShowDeleteModal(false);
			setDeletingId(null);
		}
	};

	// -------- fields manipulation (inline) --------
	const toggleEditField = (index, on = undefined) => {
		setEditingMap(m => ({
			...m,
			[index]: typeof on === 'boolean' ? on : !m[index],
		}));
	};

	const updateFieldProp = (index, prop, val) => {
		setFormFields(prev => prev.map((f, i) => (i === index ? { ...f, [prop]: val } : f)));
	};

	const addInlineField = () => {
		const idx = formFields.length;
		setFormFields(prev => {
			return [
				...prev,
				{
					_uid: crypto.randomUUID(),    // stable UI identity
					label: '',
					key: genKey12(),              // business key (can be edited later)
					type: 'text',
					placeholder: '',
					required: false,
					options: [],
					order: idx,
				},
			];
		});

		setEditingMap(m => ({ ...m, [idx]: true }));
	};

	const removeField = (index) => {
		setFormFields(prev => prev.filter((_, i) => i !== index).map((f, i) => ({ ...f, order: i })));
		setEditingMap(m => {
			const copy = { ...m };
			delete copy[index];
			// Reindex the editing map
			const newMap = {};
			Object.keys(copy).forEach(oldIndex => {
				const numIndex = parseInt(oldIndex);
				if (numIndex > index) {
					newMap[numIndex - 1] = copy[oldIndex];
				} else if (numIndex < index) {
					newMap[numIndex] = copy[oldIndex];
				}
			});
			return newMap;
		});
	};

	const moveField = (index, dir) => {
		const newIndex = index + dir;
		if (newIndex < 0 || newIndex >= formFields.length) return;
		setFormFields(prev => {
			const clone = prev.slice();
			const tmp = clone[index];
			clone[index] = clone[newIndex];
			clone[newIndex] = tmp;
			return clone.map((f, i) => ({ ...f, order: i }));
		});

		// Update editing map to reflect the moved field
		setEditingMap(m => {
			const newMap = {};
			Object.keys(m).forEach(key => {
				const numKey = parseInt(key);
				if (numKey === index) {
					newMap[newIndex] = m[key];
				} else if (numKey === newIndex) {
					newMap[index] = m[key];
				} else {
					newMap[numKey] = m[key];
				}
			});
			return newMap;
		});
	};

	// -------- UI Bits --------
	const Pill = ({ children, tone = 'slate' }) => (
		<span
			className={
				tone === 'amber'
					? 'inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-xs text-amber-800'
					: 'inline-flex items-center rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-700'
			}
		>
			{children}
		</span>
	);

	const FieldRow = ({ field, index }) => {
		const typeOptions = FIELD_TYPE_OPTIONS.map(opt => ({
			id: opt.id,
			label: t(`types_map.${opt.id}`),
		}));

		const editing = !!editingMap[index];
		const canMoveUp = index > 0;
		const canMoveDown = index < formFields.length - 1;

		return (
			<div className='group flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 hover:border-slate-300 transition'>
				{!editing ? (
					<div className='flex items-start justify-between gap-3'>
						<div className='min-w-0 pr-3'>
							<div className='flex items-center gap-2 flex-wrap'>
								<MultiLangText className='font-medium text-slate-900 break-all'>{field.label || t('labels.no_label')}</MultiLangText>
								<Pill>{t(`types_map.${field.type}`)}</Pill>
								{field.required && <Pill tone='amber'>{t('labels.required')}</Pill>}
							</div>
							<div className='mt-1 text-xs text-slate-500 break-all'>
								{t('labels.key')}: {field.key}
							</div>
							{field.placeholder && (
								<MultiLangText className='mt-1 text-xs text-slate-500 break-all'>
									{t('labels.placeholder')}: {field.placeholder}
								</MultiLangText>
							)}
							{(field.type === 'select' || field.type === 'radio' || field.type === 'checklist') && field.options && field.options.length > 0 && (
								<div className='mt-1 text-xs text-slate-500 break-all'>
									{t('editor.options')}: {field.options.join(', ')}
								</div>
							)}
						</div>

						<div className='flex items-center gap-1'>
							<button
								type='button'
								title={t('actions.move_up')}
								aria-label={t('actions.move_up')}
								disabled={!canMoveUp}
								onClick={() => moveField(index, -1)}
								className='inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-40 disabled:cursor-not-allowed'
							>
								<FiChevronUp className='w-4 h-4' />
							</button>

							<button
								type='button'
								title={t('actions.move_down')}
								aria-label={t('actions.move_down')}
								disabled={!canMoveDown}
								onClick={() => moveField(index, +1)}
								className='inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-40 disabled:cursor-not-allowed'
							>
								<FiChevronDown className='w-4 h-4' />
							</button>

							<button
								type='button'
								title={t('actions.edit_field')}
								aria-label={t('actions.edit_field')}
								onClick={() => toggleEditField(index, true)}
								className='inline-flex items-center gap-1 h-8 px-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400'
							>
								<FiEdit2 className='w-4 h-4' />
							</button>

							<button
								type='button'
								title={t('actions.remove_field')}
								aria-label={t('actions.remove_field')}
								onClick={() => removeField(index)}
								className='inline-flex items-center gap-1 h-8 px-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400'
							>
								<FiTrash2 className='w-4 h-4' />
							</button>
						</div>
					</div>
				) : (
					<div className='space-y-3'>
						<div className='grid grid-cols-1 md:grid-cols-[1fr_1fr_200px] gap-3'>
							<Input
								label={t('editor.label')}
								placeholder={t('editor.placeholders.label')}
								value={field.label}
								onChange={(v) => {
									updateFieldProp(index, 'label', v);
								}}
								onBlur={() => {
									if (!field.key) updateFieldProp(index, 'key', genKey12());
								}}
							/>
							<Input
								label={t('editor.placeholder')}
								placeholder={t('editor.placeholders.placeholder')}
								value={field.placeholder}
								onChange={(v) => updateFieldProp(index, 'placeholder', v)}
							/>

							<Select
								label={t('editor.type')}
								value={field.type}
								onChange={(v) => updateFieldProp(index, 'type', v)}
								options={typeOptions}
							/>

							<div className='md:col-span-2'>
								<CheckBox
									label={t('editor.required')}
									initialChecked={!!field.required}
									onChange={(val) => updateFieldProp(index, 'required', !!val)}
								/>
							</div>

							{(field.type === 'select' || field.type === 'radio' || field.type === 'checklist') && (
								<div className='md:col-span-3'>
									<InputList
										label={t('editor.options')}
										value={field.options || []}
										onChange={(arr) => updateFieldProp(index, 'options', arr)}
										placeholder={t('editor.placeholders.option')}
									/>
								</div>
							)}
						</div>

						<div className='flex items-center justify-end gap-2'>
							<button
								type='button'
								onClick={() => toggleEditField(index, false)}
								className='inline-flex items-center justify-center h-9 px-4 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-slate-300'
							>
								{t('actions.done')}
							</button>
						</div>
					</div>
				)}
			</div>
		);
	};

	// -------- skeleton while loading --------
	if (isLoading) {
		return (
			<div className='min-h-screen bg-slate-50'>
				<div className='container !px-0'>
					<div className='rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm'>
						<div className='h-32 bg-gradient-to-r from-indigo-50 to-slate-50 shimmer' />
						<div className='p-4 grid grid-cols-2 md:grid-cols-4 gap-3'>
							{Array.from({ length: 4 }).map((_, i) => (
								<div key={i} className='h-16 rounded-lg border border-slate-100 bg-white shimmer' />
							))}
						</div>
					</div>

					<div className='grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6'>
						<aside className='lg:col-span-4'>
							<div className='rounded-lg border border-slate-200 bg-white p-4 space-y-3'>
								{Array.from({ length: 5 }).map((_, i) => (
									<div key={i} className='h-16 rounded-lg border border-slate-100 bg-white shimmer' />
								))}
							</div>
						</aside>
						<section className='lg:col-span-8'>
							<div className='rounded-lg border border-slate-200 bg-white p-6 space-y-3'>
								{Array.from({ length: 5 }).map((_, i) => (
									<div key={i} className='h-20 rounded-lg border border-slate-100 bg-slate-50 shimmer' />
								))}
							</div>
						</section>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-slate-50'>
			<div className='container !px-0'>
				<GradientStatsHeader
					onClick={openCreateFormModal}
					btnName={t('header.new')}
					title={t('header.title')}
					desc={t('header.desc')}
				/>

				<div className='grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6'>
					{/* Left: list */}
					<aside className='lg:col-span-4'>
						<div className='rounded-lg border border-slate-200 bg-white'>
							{filtered.length === 0 ? (
								<div className='p-8 text-center'>
									<FiFileText className='h-10 w-10 text-slate-500 mx-auto mb-3' />
									<div className='font-medium text-slate-900 mb-1'>{t('empty.title')}</div>
									<div className='text-slate-600 text-sm mb-4'>{t('empty.subtitle')}</div>
								</div>
							) : (
								<ul className='divide-y divide-slate-100'>
									{filtered.map(f => {
										const isActive = selectedForm?.id === f.id;
										return (
											<li
												key={f.id}
												className={`p-4 cursor-pointer transition rounded-lg border ${isActive ? 'bg-indigo-50/70 border-indigo-200' : 'hover:bg-slate-50 border-transparent'}`}
												onClick={() => setSelectedForm(f)}
											>
												<div className='flex items-center gap-3'>
													<div className='p-2 bg-indigo-100 rounded-lg shrink-0'>
														<FiFileText className='h-5 w-5 text-indigo-600' />
													</div>
													<div className='min-w-0 flex-1'>
														<div className='flex items-start justify-between gap-3'>
															<div className='min-w-0'>
																<MultiLangText className='font-semibold text-slate-900 truncate' as='h2'>{f.title}</MultiLangText>
																<p className='text-sm text-slate-600'>
																	{(f.fields?.length ?? 0)} {t('labels.fields')}
																</p>
															</div>
															<div className='flex gap-2'>
																<button
																	type='button'
																	title={t('actions.copy_link')}
																	aria-label={t('actions.copy_link')}
																	className='inline-flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition focus:outline-none focus:ring-2 focus:ring-emerald-400'
																	onClick={e => { e.stopPropagation(); copyLink(f.id); }}
																>
																	<FiShare2 className='w-4 h-4' />
																</button>
																<button
																	className='flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition focus:outline-none focus:ring-2 focus:ring-indigo-400'
																	onClick={e => { e.stopPropagation(); openEditFormModal(f); }}
																>
																	<FiEdit2 className='w-4 h-4' />
																</button>
																<button
																	className='flex items-center justify-center w-9 h-9 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition focus:outline-none focus:ring-2 focus:ring-red-400'
																	onClick={e => {
																		e.stopPropagation();
																		setDeletingId(f.id);
																		setShowDeleteModal(true);
																	}}
																>
																	<FiTrash2 className='w-4 h-4' />
																</button>
															</div>
														</div>
													</div>
												</div>
											</li>
										);
									})}
								</ul>
							)}
						</div>
					</aside>

					{/* Right: details */}
					<section className='lg:col-span-8'>
						{!selectedForm ? (
							<div className=' min-h-[183px] flex items-center justify-center rounded-lg border border-dashed border-slate-300 p-10 text-center bg-white'>
								<div className='text-slate-600'>{t('empty.select_hint')}</div>
							</div>
						) : (
							<div className='rounded-lg border border-slate-200 bg-white p-6 shadow-sm'>
								<div className='flex items-center justify-between gap-3 flex-wrap'>
									<div className='flex items-center w-full justify-between flex-wrap gap-3 min-w-0'>
										<div className='flex items-center gap-2'>
											<div className='p-2 bg-indigo-100 rounded-lg shrink-0'>
												<FiFileText className='h-6 w-6 text-indigo-600' />
											</div>
											<MultiLangText className='text-xl font-semibold text-slate-900 truncate'>{selectedForm.title}</MultiLangText>
										</div>
										<div className='text-xs font-[600] text-slate-600 '>
											{t('labels.created_at')} {selectedForm.created_at ? new Date(selectedForm.created_at).toLocaleString() : ''}
										</div>
									</div>
								</div>

								{/* Fields */}
								<div className='mt-6'>
									<div className='flex items-center justify-between mb-3'>
										<h3 className='font-medium text-slate-900'>{t('labels.fields')}</h3>
										{/* open edit modal for full edit */}
										<button
											type='button'
											className='inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-400'
											onClick={() => openEditFormModal(selectedForm)}
										>
											<FiEdit2 className='w-4 h-4' />
											<span className='text-sm font-medium'>{t('actions.edit_form')}</span>
										</button>
									</div>

									{selectedForm.fields?.length ? (
										<div className='grid gap-3 overflow-y-auto max-h-[400px] px-6  w-[calc(100%+44px)] ltr:ml-[-22px] rtl:mr-[-22px] '>
											{(selectedForm.fields || [])
												.slice()
												.sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0))
												.map(field => (
													<div key={field.id} className='rounded-lg border border-slate-200 bg-slate-50 p-3'>
														<div className='flex items-start justify-between gap-3'>
															<div className='min-w-0'>
																<div className='flex items-center gap-2 flex-wrap'>
																	<MultiLangText className='font-medium text-slate-900 break-all'>{field.label}</MultiLangText>
																	<span className='inline-flex items-center rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-700'>{t(`types_map.${field.type}`)}</span>
																	{field.required && (
																		<span className='inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 border border-amber-200'>
																			{t('labels.required')}
																		</span>
																	)}
																</div>
																<div className='mt-1 text-xs text-slate-500 break-all'>
																	{t('labels.key')}: {field.key}
																</div>
															</div>
															<div className='text-xs text-slate-500 shrink-0'>
																{t('labels.order')}: {field.order ?? 0}
															</div>
														</div>
													</div>
												))}
										</div>
									) : (
										<div className='rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-600'>
											{t('empty.no_fields')}
										</div>
									)}
								</div>
							</div>
						)}
					</section>
				</div>
			</div>

			{/* Delete confirm */}
			<Modal
				open={showDeleteModal}
				onClose={() => {
					if (!isDeleting) {
						setShowDeleteModal(false);
						setDeletingId(null);
					}
				}}
				title={t('delete.title')}
				maxW='max-w-md'
			>
				<div className='space-y-4'>
					<p className='text-slate-700'>{t('delete.message')}</p>
					<div className='flex justify-end gap-2 pt-2'>
						<Button
							name={t('actions.cancel')}
							className='!w-fit'
							onClick={() => {
								if (!isDeleting) {
									setShowDeleteModal(false);
									setDeletingId(null);
								}
							}}
						/>
						<Button
							name={isDeleting ? t('actions.deleting') : t('delete.confirm')}
							className='!w-fit'
							color='danger'
							onClick={() => deletingId && deleteForm(deletingId)}
							disabled={isDeleting}
						/>
					</div>
				</div>
			</Modal>

			{/* Create/Edit Form Modal (inline field editor) */}
			<Modal
				open={showFormModal}
				onClose={() => setShowFormModal(false)}
				title={isEditing ? t('edit.title') : t('create.title')}
				maxW='max-w-4xl'
			>
				<form
					className='space-y-6 pt-2'
					onSubmit={(e) => {
						e.preventDefault();
						(isEditing ? updateForm : createForm)();
					}}
				>
					<Input2
						label={t('editor.form_title')}
						placeholder={t('editor.placeholders.form_title')}
						value={formTitle}
						onChange={setFormTitle}
						className='max-w-[300px] w-full'
					/>

					<div>
						<div className='flex items-center justify-between mb-3'>
							<h3 className='font-medium text-slate-900'>{t('editor.fields')}</h3>

							<button
								type='button'
								className='inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-400'
								onClick={addInlineField}
							>
								<FiPlus className='w-4 h-4' />
								<span className='text-sm font-medium'>{t('editor.add_field')}</span>
							</button>
						</div>

						{formFields.length ? (
							<div className='grid gap-3'>
								{formFields.map((f, idx) => (
									<FieldRow key={f._uid} field={f} index={idx} />
								))}
							</div>
						) : (
							<div className='rounded-lg bg-white border border-dashed border-slate-300 p-6 text-center text-slate-600'>
								{t('empty.no_fields')}
							</div>
						)}
					</div>

					<div className='flex justify-end gap-2 pt-2'>
						<button
							type='button'
							onClick={() => setShowFormModal(false)}
							className='inline-flex items-center justify-center h-9 px-4 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-slate-300'
						>
							{t('actions.cancel')}
						</button>
						<button
							type='submit'
							className={`inline-flex items-center gap-2 h-9 px-4 rounded-lg text-white font-medium text-sm transition focus:outline-none focus:ring-2 ${isEditing ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-400' : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-400'
								}`}
						>
							{isEditing ? <FiEdit2 className='w-4 h-4' /> : <FiPlus className='w-4 h-4' />}
							<span>{isEditing ? t('edit.cta') : t('create.cta')}</span>
						</button>
					</div>
				</form>
			</Modal>
		</div>
	);
}