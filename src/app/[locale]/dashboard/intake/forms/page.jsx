'use client';

import React, {
	useCallback,
	useEffect,
	useMemo,
	useState,
	useRef,
	useDeferredValue,
} from 'react';
import { useTranslations } from 'use-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
	AlertCircle,
	AlignLeft,
	ArrowDown,
	ArrowUp,
	CalendarDays,
	Check,
	ChevronsUpDown,
	CircleDot,
	CopyPlus,
	Eye,
	FileText,
	Hash,
	Layers,
	Link as LinkIcon,
	ListChecks,
	Mail,
	Paperclip,
	PencilLine,
	Phone,
	Plus,
	RefreshCw,
	Share2,
	SquareCheck,
	Trash2,
	Type,
	UserCheck,
	X,
} from 'lucide-react';

import api from '@/utils/axios';
import MultiLangText from '@/components/atoms/MultiLangText';
import FloatingInput from '@/components/atoms/FloatingInput';
import FloatingSelect from '@/components/atoms/FloatingSelect';
import Badge from '@/components/atoms/GmBadge';
import GmStatCard from '@/components/molecules/GmStatCard';
import GmRowActions from '@/components/atoms/GmRowActions';
import DataTable from '@/components/atoms/Datatable';
import { Modal } from '@/components/dashboard/ui/UI';
import { Notification } from '@/config/Notification';
import { useUser } from '@/hooks/useUser';
import { IntakeHero, IntakeToolbar } from '@/components/pages/dashboard/intake/IntakeChrome';
import { getStoredPerPage, setStoredPerPage } from '@/lib/table-prefs';

// ─── Constants ───────────────────────────────────────────────
const FIELD_TYPE_OPTIONS = [
	{ id: 'text', icon: Type },
	{ id: 'email', icon: Mail },
	{ id: 'number', icon: Hash },
	{ id: 'phone', icon: Phone },
	{ id: 'date', icon: CalendarDays },
	{ id: 'textarea', icon: AlignLeft },
	{ id: 'select', icon: ChevronsUpDown },
	{ id: 'radio', icon: CircleDot },
	{ id: 'checkbox', icon: SquareCheck },
	{ id: 'checklist', icon: ListChecks },
	{ id: 'file', icon: Paperclip },
];
const OPTION_TYPES = ['select', 'radio', 'checklist'];
const GM_MODAL = 'gm-modal';

const fieldIconOf = type => FIELD_TYPE_OPTIONS.find(o => o.id === type)?.icon || Type;

// ─── Helpers ──────────────────────────────────────────────────
function genKey12() {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let s = '';
	for (let i = 0; i < 12; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
	return s;
}

// ─────────────────────────────────────────────────────────────
//  PRIMITIVES
// ─────────────────────────────────────────────────────────────
function IconBtn({ label, onClick, children, danger = false, disabled = false }) {
	return (
		<button
			type="button"
			aria-label={label}
			title={label}
			onClick={onClick}
			disabled={disabled}
			className={`grid size-8 place-items-center rounded-lg gm-ink-soft transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${danger
				? 'hover:bg-[color-mix(in_srgb,var(--gm-danger)_10%,transparent)] hover:text-[var(--gm-danger)]'
				: 'hover:bg-[color-mix(in_srgb,var(--color-primary-100)_70%,transparent)] hover:text-[var(--color-primary-600)]'
				}`}
		>
			{children}
		</button>
	);
}

function Switch({ label, checked, onChange }) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			onClick={() => onChange(!checked)}
			className={`inline-flex items-center gap-2.5 whitespace-nowrap rounded-[10px] px-1.5 py-1 text-[12.5px] font-semibold transition-colors ${checked ? 'text-(--color-primary-700)' : 'gm-ink-soft'}`}
		>
			<span
				className="relative h-[22px] w-10 shrink-0 rounded-full transition-colors"
				style={{
					background: checked
						? 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))'
						: 'color-mix(in srgb, var(--color-primary-200) 60%, transparent)',
				}}
			>
				<span className={`absolute top-[3px] size-4 rounded-full bg-white shadow-sm transition-all ${checked ? 'start-[21px]' : 'start-[3px]'}`} />
			</span>
			{label}
		</button>
	);
}

function InputList({ label, value = [], onChange, placeholder, disabled = false }) {
	const [items, setItems] = useState(Array.isArray(value) ? value : []);
	const [draft, setDraft] = useState('');

	useEffect(() => { setItems(Array.isArray(value) ? value : []); }, [value]);

	const emit = useCallback(next => { setItems(next); onChange?.(next); }, [onChange]);

	const commitDraft = useCallback(text => {
		const raw = (text ?? '').trim();
		if (!raw) return;
		const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
		const next = [...items];
		for (const p of parts) if (!next.includes(p)) next.push(p);
		emit(next);
		setDraft('');
	}, [items, emit]);

	const handleKeyDown = e => {
		if (disabled) return;
		if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commitDraft(draft); }
		if (e.key === 'Backspace' && draft === '' && items.length > 0) { e.preventDefault(); emit(items.slice(0, -1)); }
	};

	return (
		<div
			className="relative flex min-h-11 flex-wrap items-center gap-1.5 rounded-[11px] border border-[var(--gm-line)] px-3 py-2 transition-colors focus-within:border-[var(--color-primary-500)] focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary-500)_12%,transparent)]"
			style={{ background: 'color-mix(in srgb, var(--gm-paper) 62%, transparent)' }}
		>
			{label && (
				<span className="pointer-events-none absolute start-3 top-0 -translate-y-1/2 rounded-md bg-[var(--gm-paper)] px-1 text-[11px] font-medium gm-muted">
					{label}
				</span>
			)}
			<AnimatePresence mode="popLayout">
				{items.map((opt, i) => (
					<motion.span
						key={`${opt}-${i}`}
						layout
						initial={{ scale: 0.85, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0.85, opacity: 0 }}
						className="gm-plan__chip text-[var(--color-primary-700)]!"
					>
						{opt}
						{!disabled && (
							<button
								type="button"
								aria-label={`Remove ${opt}`}
								onClick={() => emit(items.filter((_, j) => j !== i))}
								className="opacity-60 transition-opacity hover:opacity-100"
							>
								<X className="size-3" />
							</button>
						)}
					</motion.span>
				))}
			</AnimatePresence>
			<input
				type="text"
				value={draft}
				onChange={e => setDraft(e.target.value)}
				onKeyDown={handleKeyDown}
				onBlur={() => commitDraft(draft)}
				placeholder={placeholder}
				disabled={disabled}
				className="min-w-[140px] flex-1 bg-transparent text-[13px] gm-ink outline-none placeholder:text-[var(--gm-faint)]"
			/>
		</div>
	);
}

function EmptyBox({ text }) {
	return (
		<div
			className="flex flex-col items-center gap-3 rounded-[16px] border border-dashed px-6 py-12 text-center"
			style={{ borderColor: 'var(--gm-line)', background: 'color-mix(in srgb, var(--gm-paper) 45%, transparent)' }}
		>
			<span className="gm-plan__icon size-12!">
				<Layers className="size-6" />
			</span>
			<p className="text-[13px] font-medium gm-muted">{text}</p>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────
//  FIELD ROW
// ─────────────────────────────────────────────────────────────
const FieldRow = React.memo(function FieldRow({
	field, index, isNew, editing, t, typeOptions,
	formFieldsLength, newFieldRef,
	updateFieldProp, toggleEditField, moveField, removeField,
}) {
	const canMoveUp = index > 0;
	const canMoveDown = index < formFieldsLength - 1;

	const [labelDraft, setLabelDraft] = React.useState(field.label || '');
	React.useEffect(() => { if (editing) setLabelDraft(field.label || ''); }, [editing, field.label]);

	const commitDrafts = useCallback(() => {
		const next = (labelDraft ?? '').toString();
		if (next !== field.label) {
			updateFieldProp(index, 'label', next);
			updateFieldProp(index, 'placeholder', next);
			if (!field.key) updateFieldProp(index, 'key', genKey12());
		}
	}, [labelDraft, field.label, field.key, index, updateFieldProp]);

	const FieldIcon = fieldIconOf(field.type);
	const hasOptions = OPTION_TYPES.includes(field.type);

	const finish = () => { commitDrafts(); toggleEditField(index, false); };

	return (
		<motion.div
			ref={isNew ? newFieldRef : null}
			layout
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.97 }}
			transition={{ type: 'spring', stiffness: 300, damping: 26 }}
			className={`gm-field group ${editing ? 'is-editing' : ''}`}
		>
			<div className="flex items-center gap-3 px-3 py-2.5">
				<span className="gm-field__num">{index + 1}</span>
				<span className="gm-field__icon">
					<FieldIcon className="size-4" strokeWidth={1.9} />
				</span>

				{editing ? (
					<div className="grid min-w-0 flex-1 grid-cols-1 items-center gap-2.5 sm:grid-cols-[minmax(0,1fr)_170px_auto]">
						<FloatingInput
							label={t('editor.label')}
							value={labelDraft}
							onChange={v => setLabelDraft(v)}
							onBlur={commitDrafts}
							required
						/>
						<FloatingSelect
							label={t('editor.type')}
							value={field.type}
							onChange={v => v && updateFieldProp(index, 'type', v)}
							options={typeOptions}
						/>
						<Switch
							label={t('editor.required')}
							checked={!!field.required}
							onChange={val => updateFieldProp(index, 'required', !!val)}
						/>
					</div>
				) : (
					<button
						type="button"
						onClick={() => toggleEditField(index, true)}
						className="min-w-0 flex-1 text-start"
						aria-label={t('actions.edit_field')}
					>
						<span className="flex items-center gap-1.5">
							<MultiLangText className={`truncate text-[13.5px] font-semibold ${field.label ? 'gm-ink' : 'italic gm-faint'}`}>
								{field.label || t('labels.no_label')}
							</MultiLangText>
							{field.required && <span className="text-[13px] font-bold text-(--gm-danger)">*</span>}
						</span>
						<span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] gm-muted">
							{t(`types_map.${field.type}`)}
							{hasOptions && field.options?.length > 0 && (
								<>
									<span className="gm-faint">·</span>
									<span className="truncate">{field.options.slice(0, 3).join(' / ')}{field.options.length > 3 ? ` +${field.options.length - 3}` : ''}</span>
								</>
							)}
						</span>
					</button>
				)}

				<div className={`flex shrink-0 items-center gap-0.5 ${editing ? 'self-start pt-1.5 sm:self-center sm:pt-0' : 'opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 max-sm:opacity-100'}`}>
					{editing ? (
						<button
							type="button"
							onClick={finish}
							aria-label={t('actions.done')}
							title={t('actions.done')}
							className="grid size-8 place-items-center rounded-lg text-white shadow-[0_4px_10px_-3px_color-mix(in_srgb,var(--color-primary-600)_60%,transparent)] transition hover:-translate-y-px"
							style={{ background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' }}
						>
							<Check className="size-4" strokeWidth={2.6} />
						</button>
					) : (
						<>
							<IconBtn label={t('actions.move_up')} onClick={() => moveField(index, -1)} disabled={!canMoveUp}>
								<ArrowUp className="size-4" />
							</IconBtn>
							<IconBtn label={t('actions.move_down')} onClick={() => moveField(index, +1)} disabled={!canMoveDown}>
								<ArrowDown className="size-4" />
							</IconBtn>
						</>
					)}
					<IconBtn label={t('actions.remove_field')} onClick={() => removeField(index)} danger>
						<Trash2 className="size-4" />
					</IconBtn>
				</div>
			</div>

			{editing && hasOptions && (
				<div className="px-3 pb-3 sm:ps-[88px]">
					<InputList
						label={t('editor.options')}
						value={field.options || []}
						onChange={arr => updateFieldProp(index, 'options', arr)}
						placeholder={t('editor.placeholders.option')}
					/>
				</div>
			)}
		</motion.div>
	);
});

// ─────────────────────────────────────────────────────────────
//  MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function FormsManagementPage() {
	const t = useTranslations('forms');
	const user = useUser();
	const [showDetailsModal, setShowDetailsModal] = useState(false);
	const [forms, setForms] = useState([]);
	const [query, setQuery] = useState('');
	const [ownerFilter, setOwnerFilter] = useState('all');
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(() => getStoredPerPage(10));
	const [selectedForm, setSelectedForm] = useState(null);
	const [isLoading, setIsLoading] = useState(true);

	// Modals
	const [showFormModal, setShowFormModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [deletingId, setDeletingId] = useState(null);
	const [isDeleting, setIsDeleting] = useState(false);

	// Form builder state
	const [formTitle, setFormTitle] = useState('');
	const [formFields, setFormFields] = useState([]);
	const [editingMap, setEditingMap] = useState({});
	const [isEditing, setIsEditing] = useState(false);
	const [loading, setLoading] = useState(false);

	const fieldsContainerRef = useRef(null);
	const newFieldRef = useRef(null);
	const openDetailsModal = useCallback((form) => {
		setSelectedForm(form);
		setShowDetailsModal(true);
	}, []);
	const typeOptions = useMemo(
		() => FIELD_TYPE_OPTIONS.map(o => ({ id: o.id, label: t(`types_map.${o.id}`) })),
		[t]
	);

	// ── Fetch ──
	const fetchForms = useCallback(async () => {
		setIsLoading(true);
		try {
			const res = await api.get('/forms');
			const list = (res?.data?.data || res?.data || []).map(form => ({
				...form,
				fields: (form.fields || []).map(f => ({
					...f,
					_uid: f._uid ?? f.id ?? crypto.randomUUID(),
				})),
			}));
			setForms(list);
		} catch {
			Notification(t('messages.load_failed'), 'error');
		} finally {
			setIsLoading(false);
		}
	}, [t]);

	useEffect(() => { fetchForms(); }, [fetchForms]);

	const deferredQuery = useDeferredValue(query);
	const filtered = useMemo(() => {
		const q = (deferredQuery || '').trim().toLowerCase();
		return forms.filter(f => {
			const own = f.adminId === user?.id;
			if (ownerFilter === 'own' && !own) return false;
			if (ownerFilter === 'shared' && own) return false;
			if (q && !(f.title || '').toLowerCase().includes(q)) return false;
			return true;
		});
	}, [forms, deferredQuery, ownerFilter, user?.id]);

	useEffect(() => { setPage(1); }, [deferredQuery, ownerFilter, limit]);

	const tableRows = useMemo(() => {
		const start = (page - 1) * limit;
		return filtered.slice(start, start + limit).map((form) => ({
			id: form.id,
			title: form.title,
			fieldsCount: form.fields?.length ?? 0,
			requiredCount: (form.fields || []).filter(fld => fld.required).length,
			ownerType: form.adminId === user?.id ? 'own' : 'shared',
			raw: form,
		}));
	}, [filtered, page, limit, user?.id]);

	const resetFormState = useCallback(() => {
		setFormTitle(''); setFormFields([]); setEditingMap({});
	}, []);

	const scrollToNewField = useCallback(() => {
		setTimeout(() => newFieldRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
	}, []);

	// ── Modals ──
	const openCreateFormModal = useCallback(() => {
		setIsEditing(false);
		setSelectedForm(null);
		setFormTitle('');
		setFormFields([{ _uid: crypto.randomUUID(), label: '', key: genKey12(), type: 'text', placeholder: '', required: false, options: [], order: 0 }]);
		setEditingMap({ 0: true });
		setShowFormModal(true);
	}, []);

	const openEditFormModal = useCallback((form, isEdit) => {
		if (!isEdit || !form) { openCreateFormModal(); return; }
		setIsEditing(true);
		setSelectedForm(form);
		setFormTitle(form?.title || '');
		const normalized = (form?.fields || []).slice().sort((a, b) => (a?.order ?? 1) - (b?.order ?? 1));
		setFormFields(normalized.map(f => ({ ...f, _uid: f._uid ?? f.id ?? crypto.randomUUID() })));
		setEditingMap({});
		setShowFormModal(true);
	}, [openCreateFormModal]);

	const handleDuplicateForm = useCallback(form => {
		if (!form) return;
		setIsEditing(false);
		setSelectedForm(null);
		const suffix = t('labels.copy_suffix', { default: ' (Copy)' });
		setFormTitle(`${form.title || ''}${suffix}`);
		setFormFields(
			(form.fields || []).slice().sort((a, b) => (a?.order ?? 1) - (b?.order ?? 1))
				.map((f, idx) => ({
					_uid: crypto.randomUUID(),
					label: f.label || '',
					key: genKey12(),
					type: f.type,
					placeholder: f.label || '',
					required: !!f.required,
					options: f.options || [],
					order: idx,
				}))
		);
		setEditingMap({});
		setShowFormModal(true);
	}, [t]);

	const getShareableLink = useCallback(
		id => `${window.location.origin}/form/${id}/submit?report_to=${user?.id}`,
		[user?.id]
	);

	const copyLink = useCallback(id => {
		navigator.clipboard.writeText(getShareableLink(id));
		Notification(t('messages.link_copied'), 'success');
	}, [getShareableLink, t]);

	// ── CRUD ──
	const createForm = useCallback(async () => {
		const title = (formTitle || '').trim();
		if (!title) { Notification(t('errors.title_required'), 'error'); return; }
		if ((formFields || []).find(f => !(f.label || '').trim())) { Notification(t('errors.required'), 'error'); return; }
		setLoading(true);
		try {
			await api.post('/forms', {
				title,
				fields: formFields.map((f, idx) => {
					const label = (f.label || '').trim();
					return { label, key: f.key, placeholder: label, type: f.type, required: !!f.required, options: f.options || [], order: idx + 1 };
				}),
			});
			Notification(t('messages.created'), 'success');
			setShowFormModal(false);
			resetFormState();
			fetchForms();
		} catch (e) {
			const msg = e?.response?.data?.message;
			Notification(Array.isArray(msg) ? msg.join(', ') : t('errors.create_failed'), 'error');
		}
		setLoading(false);
	}, [fetchForms, formFields, formTitle, resetFormState, t]);

	const updateForm = useCallback(async () => {
		if (!selectedForm?.id) return;
		const title = (formTitle || '').trim();
		if (!title) { Notification(t('errors.title_required'), 'error'); return; }
		setLoading(true);
		try {
			const ordered = formFields.map((f, idx) => ({ ...f, order: idx }));
			setFormFields(ordered);
			const existing = ordered.filter(f => !!f.id);
			const newlyAdded = ordered.filter(f => !f.id);
			await api.patch('/forms', {
				id: selectedForm.id,
				title,
				fields: existing.map(f => {
					const label = (f.label || '').trim();
					return { id: f.id, label, key: f.key, placeholder: label, type: f.type, required: !!f.required, options: f.options || [], order: f.order };
				}),
			});
			if (newlyAdded.length) {
				await api.post(`/forms/${selectedForm.id}/fields`, {
					fields: newlyAdded.map(f => {
						const label = (f.label || '').trim();
						return { label, key: f.key, placeholder: label, type: f.type, required: !!f.required, options: f.options || [], order: f.order };
					}),
				});
			}
			if (existing.length) {
				await api.patch('/forms/re-order', { fields: existing.map(f => ({ id: f.id, order: f.order })) });
			}
			Notification(t('messages.updated'), 'success');
			setShowFormModal(false);
			resetFormState();
			fetchForms();
		} catch (e) {
			const msg = e?.response?.data?.message;
			Notification(Array.isArray(msg) ? msg.join(', ') : t('errors.update_failed'), 'error');
		}
		setLoading(false);
	}, [fetchForms, formFields, formTitle, resetFormState, selectedForm?.id, t]);

	const deleteForm = useCallback(async formId => {
		try {
			setIsDeleting(true);
			await api.delete(`/forms/${formId}`);
			Notification(t('messages.deleted'), 'success');
			if (selectedForm?.id === formId) setSelectedForm(null);
			await fetchForms();
		} catch {
			Notification(t('errors.delete_failed'), 'error');
		} finally {
			setIsDeleting(false);
			setShowDeleteModal(false);
			setDeletingId(null);
		}
	}, [fetchForms, selectedForm?.id, t]);

	// ── Field editor helpers ──
	const toggleEditField = useCallback((index, on) => {
		setEditingMap(m => ({ ...m, [index]: typeof on === 'boolean' ? on : !m[index] }));
	}, []);

	const updateFieldProp = useCallback((index, prop, val) => {
		setFormFields(prev => prev.map((f, i) => i === index ? { ...f, [prop]: val } : f));
	}, []);

	const addInlineField = useCallback((type = 'text') => {
		const idx = formFields.length;
		setFormFields(prev => [...prev, { _uid: crypto.randomUUID(), label: '', key: genKey12(), type, placeholder: '', required: false, options: [], order: idx }]);
		setEditingMap(m => ({ ...m, [idx]: true }));
		setTimeout(scrollToNewField, 100);
	}, [formFields.length, scrollToNewField]);

	const removeField = useCallback(index => {
		setFormFields(prev => prev.filter((_, i) => i !== index).map((f, i) => ({ ...f, order: i })));
		setEditingMap(m => {
			const newMap = {};
			Object.keys(m).forEach(k => {
				const n = parseInt(k, 10);
				if (n < index) newMap[n] = m[k];
				else if (n > index) newMap[n - 1] = m[k];
			});
			return newMap;
		});
	}, []);

	const moveField = useCallback((index, dir) => {
		setFormFields(prev => {
			const next = index + dir;
			if (next < 0 || next >= prev.length) return prev;
			const clone = [...prev];
			[clone[index], clone[next]] = [clone[next], clone[index]];
			return clone.map((f, i) => ({ ...f, order: i }));
		});
		setEditingMap(m => {
			const newMap = {};
			Object.keys(m).forEach(k => {
				const n = parseInt(k, 10);
				if (n === index) newMap[index + dir] = m[k];
				else if (n === index + dir) newMap[index] = m[k];
				else newMap[n] = m[k];
			});
			return newMap;
		});
	}, []);

	const selectedFormFields = useMemo(
		() => (selectedForm?.fields || []).slice().sort((a, b) => (a?.order ?? 1) - (b?.order ?? 1)),
		[selectedForm?.fields]
	);

	const requiredCount = useMemo(() => formFields.filter(f => f.required).length, [formFields]);

	const canEdit = form => !form?.adminId || form?.adminId === user?.id;

	const stats = useMemo(() => {
		const own = forms.filter(f => f.adminId === user?.id).length;
		const fields = forms.reduce((sum, f) => sum + (f.fields?.length ?? 0), 0);
		return { total: forms.length, own, shared: forms.length - own, fields };
	}, [forms, user?.id]);

	const statCards = [
		{
			key: 'total', title: t('stats.total'), value: stats.total, icon: FileText,
			hint: t('stats.totalHint'), tone: 'gm-chip',
			stroke: 'var(--color-primary-500)', fill: 'var(--color-primary-400)', seed: 0.4, max: stats.total,
		},
		{
			key: 'own', title: t('stats.own'), value: stats.own, icon: UserCheck,
			hint: t('stats.ownHint'), tone: 'gm-chip-ok',
			stroke: 'var(--gm-ok)', fill: 'var(--gm-ok)', seed: 0.9, max: stats.total,
		},
		{
			key: 'shared', title: t('stats.shared'), value: stats.shared, icon: Share2,
			hint: t('stats.sharedHint'), tone: 'gm-chip-warn',
			stroke: 'var(--gm-warn)', fill: 'var(--gm-warn)', seed: 1.4, max: stats.total,
		},
		{
			key: 'fields', title: t('stats.fields'), value: stats.fields, icon: Layers,
			hint: t('stats.fieldsHint'), tone: 'gm-chip-secondary',
			stroke: 'var(--color-secondary-500)', fill: 'var(--color-secondary-400)', seed: 1.9, max: stats.fields,
		},
	];

	const buildRowActions = form => [
		{ icon: Eye, tone: 'primary', label: t('actions.view'), onClick: () => openDetailsModal(form) },
		{ icon: LinkIcon, tone: 'cyan', label: t('actions.copy_link'), onClick: () => copyLink(form.id) },
		{ icon: CopyPlus, tone: 'violet', label: t('actions.duplicate'), onClick: () => handleDuplicateForm(form) },
		{ icon: PencilLine, tone: 'amber', label: t('actions.edit'), hide: !canEdit(form), onClick: () => openEditFormModal(form, true) },
		{
			icon: Trash2, tone: 'danger', label: t('actions.delete'), hide: !canEdit(form),
			onClick: () => { setDeletingId(form.id); setShowDeleteModal(true); },
		},
	];

	const tableColumns = [
		{
			key: 'title',
			header: t('table.title'),
			className: 'gm-wrap',
			cell: (row) => (
				<button
					type="button"
					onClick={() => openDetailsModal(row.raw)}
					className="flex w-full min-w-0 items-center gap-3 text-start"
				>
					<span className="gm-plan__icon size-10! shrink-0">
						<FileText className="size-[18px]" strokeWidth={1.8} />
					</span>
					<span className="min-w-0">
						<span dir="auto" className="block truncate text-[13px] font-semibold gm-ink">
							{row.title}
						</span>
						{row.requiredCount > 0 && (
							<span className="mt-0.5 block text-[11px] gm-muted">
								{t('editor.summary', { fields: row.fieldsCount, required: row.requiredCount })}
							</span>
						)}
					</span>
				</button>
			),
		},
		{
			key: 'fieldsCount',
			header: t('table.fields'),
			cell: (row) => (
				<span className="gm-plan__chip">
					<Layers className="size-3.5" />
					{row.fieldsCount}
				</span>
			),
		},
		{
			key: 'ownerType',
			header: t('table.owner'),
			cell: (row) =>
				row.ownerType === 'own'
					? <Badge color="green" dot>{t('labels.own')}</Badge>
					: <Badge color="amber" dot>{t('labels.shared')}</Badge>,
		},
		{
			key: 'actions',
			header: t('table.actions'),
			headClassName: 'gm-col-end',
			className: 'gm-col-end',
			cell: (row) => <GmRowActions options={buildRowActions(row.raw)} />,
		},
	];

	const closeDelete = () => { if (!isDeleting) { setShowDeleteModal(false); setDeletingId(null); } };

	const ownerSegments = [
		{ id: 'all', name: t('roster.all'), short: t('roster.all'), icon: Layers },
		{ id: 'own', name: t('roster.own'), short: t('roster.own'), icon: UserCheck },
		{ id: 'shared', name: t('roster.shared'), short: t('roster.shared'), icon: Share2 },
	];
	const queryTrim = query.trim();
	const chips = [
		queryTrim && { key: 'q', label: t('roster.searchLabel'), value: `“${queryTrim}”`, onRemove: () => setQuery('') },
		ownerFilter !== 'all' && {
			key: 'owner',
			label: t('roster.owner'),
			value: ownerSegments.find(s => s.id === ownerFilter)?.name,
			onRemove: () => setOwnerFilter('all'),
		},
	].filter(Boolean);

	// ─────────────────────────────────────────────────────────────────
	return (
		<div className="gm-surface rs-scope app-stack pb-4">
			<div className="rs-summary">
				<IntakeHero
					icon={FileText}
					title={t('header.title')}
					subtitle={t('header.desc')}
					ctaLabel={<><Plus className="size-4" strokeWidth={2} aria-hidden /><span>{t('header.new')}</span></>}
					onCta={openCreateFormModal}
				/>
				<section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
					{statCards.map((card, index) => (
						<GmStatCard key={card.key} card={card} index={index} />
					))}
				</section>
			</div>

			<DataTable
				hideToolbar
				compact
				toolbar={(
					<IntakeToolbar
						search={query}
						onSearch={(v) => { setQuery(v); setPage(1); }}
						searching={query !== deferredQuery}
						searchPlaceholder={t('search')}
						searchLabel={t('labels.search')}
						clearSearchLabel={t('roster.clearAll')}
						segments={ownerSegments}
						segment={ownerFilter}
						onSegment={(id) => { setOwnerFilter(id); setPage(1); }}
						segmentLabel={t('roster.owner')}
						layoutId="intake-forms-seg"
						result={t.rich('roster.resultCount', {
							count: filtered.length,
							strong: (chunks) => <strong>{chunks}</strong>,
						})}
						chips={chips}
						onClearAll={() => { setQuery(''); setOwnerFilter('all'); setPage(1); }}
						clearAllLabel={t('roster.clearAll')}
						activeFiltersLabel={t('roster.activeFilters')}
					/>
				)}
				columns={tableColumns}
				data={tableRows}
				isLoading={isLoading}
				rowKey={(row) => row.id}
				labels={{
					emptyTitle: t('empty.title'),
					emptySubtitle: chips.length ? t('roster.emptyHint') : t('empty.subtitle'),
				}}
				pagination={{
					current_page: page,
					per_page: limit,
					total_records: filtered.length,
				}}
				onPageChange={({ page: nextPage, per_page }) => {
					const nextLimit = Number(per_page ?? limit);
					setStoredPerPage(nextLimit);
					setLimit(nextLimit);
					setPage(Number(nextPage ?? 1));
				}}
				perPageOptions={[10, 20, 30, 50]}
				hoverable
			/>

			{/* ═══════════════ DELETE MODAL ═══════════════ */}
			<Modal
				cn="gm-modal-root"
				panelClassName={GM_MODAL}
				open={showDeleteModal}
				onClose={closeDelete}
				title={t('delete.title')}
				maxW="max-w-md"
			>
				<div className="space-y-5">
					<div
						className="flex items-start gap-3 rounded-[14px] border p-4"
						style={{
							borderColor: 'color-mix(in srgb, var(--gm-danger) 25%, transparent)',
							background: 'color-mix(in srgb, var(--gm-danger) 8%, var(--gm-paper))',
						}}
					>
						<span
							className="grid size-9 shrink-0 place-items-center rounded-[11px]"
							style={{ color: 'var(--gm-danger)', background: 'color-mix(in srgb, var(--gm-danger) 14%, var(--gm-paper))' }}
						>
							<AlertCircle className="size-[18px]" />
						</span>
						<p className="flex-1 text-[13px] leading-relaxed gm-ink-soft">{t('delete.message')}</p>
					</div>

					<div className="gm-modal-foot">
						<button
							type="button"
							onClick={closeDelete}
							className="gm-btn-ghost rounded-[11px] px-4 py-2 text-[13px] font-medium"
						>
							{t('actions.cancel')}
						</button>
						<button
							type="button"
							onClick={() => deletingId && deleteForm(deletingId)}
							disabled={isDeleting}
							className="inline-flex h-10 items-center gap-2 rounded-[11px] px-5 text-[13px] font-semibold text-white transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
							style={{ background: 'var(--gm-danger)', boxShadow: '0 6px 14px color-mix(in srgb, var(--gm-danger) 25%, transparent)' }}
						>
							{isDeleting ? <RefreshCw className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
							{isDeleting ? t('actions.deleting') : t('delete.confirm')}
						</button>
					</div>
				</div>
			</Modal>

			{/* ═══════════════ DETAILS MODAL ═══════════════ */}
			<Modal
				cn="gm-modal-root"
				panelClassName={GM_MODAL}
				open={showDetailsModal}
				onClose={() => setShowDetailsModal(false)}
				title={selectedForm?.title || t('header.title')}
				maxW="max-w-3xl"
			>
				{selectedForm ? (
					<div className="space-y-4">
						<div className="flex flex-wrap items-center gap-2">
							<Badge color="primary" icon={<Layers className="size-3.5" />}>
								{selectedFormFields.length} {t('labels.fields')}
							</Badge>
							{selectedForm.adminId === user?.id
								? <Badge color="green" dot>{t('labels.own')}</Badge>
								: <Badge color="amber" dot>{t('labels.shared_form')}</Badge>}
						</div>

						{selectedFormFields.length ? (
							<div className="space-y-2">
								{selectedFormFields.map((field, i) => {
									const FieldIcon = fieldIconOf(field.type);
									return (
										<div key={field.id ?? field._uid} className="gm-cred justify-start!">
											<span className="gm-cred__icon shrink-0">
												<FieldIcon className="size-4" strokeWidth={1.9} />
											</span>
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2">
													<span className="text-[11px] font-bold gm-faint">{i + 1}.</span>
													<MultiLangText className="truncate gm-cred__value">{field.label}</MultiLangText>
												</div>
												<div className="mt-1.5 flex flex-wrap gap-1.5">
													<Badge color="primary">{t(`types_map.${field.type}`)}</Badge>
													{field.required && <Badge color="amber" dot>{t('labels.required')}</Badge>}
													{OPTION_TYPES.includes(field.type) &&
														(field.options || []).map((opt, j) => <Badge key={j} color="slate">{opt}</Badge>)}
												</div>
											</div>
										</div>
									);
								})}
							</div>
						) : (
							<EmptyBox text={t('empty.no_fields')} />
						)}

						<div className="gm-modal-foot">
							<button
								type="button"
								onClick={() => copyLink(selectedForm.id)}
								className="gm-btn-ghost inline-flex items-center gap-2 rounded-[11px] px-4 py-2 text-[13px] font-medium"
							>
								<LinkIcon className="size-4" />
								{t('actions.copy_link')}
							</button>
							{canEdit(selectedForm) ? (
								<button
									type="button"
									onClick={() => { setShowDetailsModal(false); openEditFormModal(selectedForm, true); }}
									className="gm-btn-primary"
								>
									<PencilLine className="size-4" />
									{t('actions.edit')}
								</button>
							) : null}
						</div>
					</div>
				) : null}
			</Modal>

			{/* ═══════════════ CREATE / EDIT MODAL ═══════════════ */}
			<Modal
				cn="gm-modal-root"
				panelClassName={GM_MODAL}
				open={showFormModal}
				onClose={() => setShowFormModal(false)}
				title={isEditing ? t('edit.title') : t('create.title')}
				maxW="max-w-5xl"
			>
				<form
					className="space-y-5"
					onSubmit={e => { e.preventDefault(); (isEditing ? updateForm : createForm)(); }}
				>
					<div className="gm-builder-head">
						<span className="gm-builder-head__mark">
							<FileText className="size-5" strokeWidth={1.8} />
						</span>
						<div className="min-w-0 flex-1">
							<input
								dir="auto"
								value={formTitle}
								onChange={e => setFormTitle(e.target.value)}
								placeholder={t('editor.placeholders.form_title')}
								aria-label={t('editor.placeholders.form_title')}
								className="gm-builder-title"
							/>
							<p className="mt-1.5 px-1 text-[12px] font-medium gm-muted">
								{t('editor.summary', { fields: formFields.length, required: requiredCount })}
							</p>
						</div>
					</div>

					<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_232px]">
						<div className="relative min-w-0 lg:min-h-[320px]">
							<div className="flex flex-col gap-2.5 lg:absolute lg:inset-0">
							{formFields.length ? (
								<div ref={fieldsContainerRef} className="space-y-2.5 overflow-y-auto p-0.5 max-lg:max-h-[50vh] lg:min-h-0 lg:flex-1">
									<AnimatePresence mode="popLayout">
										{formFields.map((f, idx) => (
											<FieldRow
												key={f._uid}
												field={f}
												index={idx}
												isNew={idx === formFields.length - 1 && !!editingMap[idx]}
												editing={!!editingMap[idx]}
												t={t}
												typeOptions={typeOptions}
												formFieldsLength={formFields.length}
												newFieldRef={newFieldRef}
												updateFieldProp={updateFieldProp}
												toggleEditField={toggleEditField}
												moveField={moveField}
												removeField={removeField}
											/>
										))}
									</AnimatePresence>
								</div>
							) : (
								<div className="lg:flex-1">
									<EmptyBox text={t('empty.no_fields')} />
								</div>
							)}

							<button type="button" onClick={() => addInlineField('text')} className="gm-builder-add shrink-0">
								<Plus className="size-4" strokeWidth={2.2} />
								{t('editor.add_field')}
							</button>
							</div>
						</div>

						<aside className="gm-builder-palette">
							<p className="text-[12px] font-bold gm-ink">{t('editor.palette')}</p>
							<p className="mb-3 mt-0.5 text-[11.5px] gm-muted">{t('editor.palette_hint')}</p>
							<div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-2">
								{FIELD_TYPE_OPTIONS.map(({ id, icon: Icon }) => (
									<button key={id} type="button" onClick={() => addInlineField(id)} className="gm-type-tile">
										<span className="gm-type-tile__icon">
											<Icon className="size-4" strokeWidth={1.9} />
										</span>
										<span className="truncate">{t(`types_map.${id}`)}</span>
									</button>
								))}
							</div>
						</aside>
					</div>

					<div className="gm-modal-foot">
						<button
							type="button"
							onClick={() => setShowFormModal(false)}
							className="gm-btn-ghost rounded-[11px] px-4 py-2 text-[13px] font-medium"
						>
							{t('actions.cancel')}
						</button>
						<button
							type="submit"
							disabled={loading}
							className="gm-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
						>
							{loading
								? <RefreshCw className="size-4 animate-spin" />
								: isEditing ? <PencilLine className="size-4" /> : <Plus className="size-4" />}
							{isEditing ? t('edit.cta') : t('create.cta')}
						</button>
					</div>
				</form>
			</Modal>
		</div>
	);
}

