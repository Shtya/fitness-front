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
	FiChevronDown,
	FiChevronUp,
	FiEdit2,
	FiFileText,
	FiPlus,
	FiTrash2,
	FiX,
	FiCopy,
	FiSearch,
} from 'react-icons/fi';

import api from '@/utils/axios';
import Button from '@/components/atoms/Button';
import Input from '@/components/atoms/Input';
import Select from '@/components/atoms/Select';
import CheckBox from '@/components/atoms/CheckBox';
import MultiLangText from '@/components/atoms/MultiLangText';

import { Modal } from '@/components/dashboard/ui/UI';
import { GradientStatsHeader } from '@/components/molecules/GradientStatsHeader';
import { Notification } from '@/config/Notification';
import {
	PencilLine,
	Trash2 as LucideTrash2,
	Files,
	Sparkles,
	Layers,
	Link as LinkIcon,
	Zap,
	Check,
	AlertCircle,
	Database,
	ChevronRight,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import ActionButtons from '@/components/atoms/Actions';

// ─── Constants ───────────────────────────────────────────────
const FIELD_TYPE_OPTIONS = [
	{ id: 'text', labelKey: 'types.text', icon: '📝' },
	{ id: 'email', labelKey: 'types.email', icon: '📧' },
	{ id: 'number', labelKey: 'types.number', icon: '🔢' },
	{ id: 'phone', labelKey: 'types.phone', icon: '📱' },
	{ id: 'date', labelKey: 'types.date', icon: '📅' },
	{ id: 'textarea', labelKey: 'types.textarea', icon: '📄' },
	{ id: 'select', labelKey: 'types.select', icon: '📋' },
	{ id: 'radio', labelKey: 'types.radio', icon: '🔘' },
	{ id: 'checkbox', labelKey: 'types.checkbox', icon: '☑️' },
	{ id: 'checklist', labelKey: 'types.checklist', icon: '✅' },
	{ id: 'file', labelKey: 'types.file', icon: '📎' },
];

// ─── Helpers ──────────────────────────────────────────────────
function genKey12() {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let s = '';
	for (let i = 0; i < 12; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
	return s;
}

// ─────────────────────────────────────────────────────────────
//  DESIGN TOKENS & REUSABLE PRIMITIVES
// ─────────────────────────────────────────────────────────────

/**
 * Surface card — consistent elevation + optional accent bar
 */
function Card({ children, className = '', glow = false, accent = false, hover = false }) {
	return (
		<motion.div
			whileHover={hover ? { y: -1 } : {}}
			transition={{ type: 'spring', stiffness: 400, damping: 30 }}
			className={`relative overflow-hidden rounded-2xl border bg-white ${className}`}
			style={{
				borderColor: glow ? 'var(--color-primary-300)' : 'var(--color-primary-100)',
				boxShadow: glow
					? '0 0 0 1px var(--color-primary-200), 0 8px 32px -8px rgba(99,102,241,0.15)'
					: '0 1px 3px rgba(15,23,42,0.05), 0 4px 12px rgba(15,23,42,0.03)',
			}}
		>
			{accent && (
				<div
					className="absolute inset-x-0 top-0 h-0.5"
					style={{ background: 'linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-to))' }}
				/>
			)}
			{children}
		</motion.div>
	);
}

/**
 * Icon container with gradient or semantic variant
 */
function IconBox({ children, active = false, variant = 'primary', size = 'md' }) {
	const sizes = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-11 w-11', xl: 'h-14 w-14' };
	const iconSizes = { sm: 'text-sm', md: 'text-base', lg: 'text-lg', xl: 'text-xl' };

	let style = {};
	if (variant === 'danger') style = { background: 'linear-gradient(135deg,#fef2f2,#fee2e2)', color: '#dc2626' };
	else if (variant === 'success') style = { background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', color: '#16a34a' };
	else if (variant === 'warning') style = { background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', color: '#d97706' };
	else if (active) style = {
		background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
		boxShadow: '0 4px 16px -4px var(--color-primary-500)',
		color: 'white',
	};
	else style = {
		background: 'linear-gradient(135deg, var(--color-primary-50), var(--color-primary-100))',
		color: 'var(--color-primary-600)',
	};

	return (
		<div className={`grid place-items-center rounded-xl flex-shrink-0 ${sizes[size]} ${iconSizes[size]}`} style={style}>
			{children}
		</div>
	);
}

/**
 * Badge — tiny semantic label pill
 */
function Badge({ children, variant = 'primary', icon }) {
	const styles = {
		primary: { bg: 'var(--color-primary-50)', border: 'var(--color-primary-200)', text: 'var(--color-primary-700)' },
		warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
		success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
		danger: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' },
	};
	const s = styles[variant] || styles.primary;
	return (
		<span
			className="inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-semibold leading-tight"
			style={{ background: s.bg, borderColor: s.border, color: s.text }}
		>
			{icon && <span className="text-[9px] leading-none">{icon}</span>}
			{children}
		</span>
	);
}

/**
 * Small icon action button (square, with tooltip)
 */
function IconBtn({ tooltip, onClick, children, variant = 'ghost', disabled = false, size = 'md' }) {
	const [show, setShow] = useState(false);
	const sizes = { sm: 'h-7 w-7', md: 'h-8 w-8', lg: 'h-9 w-9' };
	const styles = {
		ghost: { bg: 'white', border: 'var(--color-primary-200)', color: 'var(--color-primary-600)', shadow: '0 1px 3px rgba(15,23,42,0.07)' },
		primary: { bg: 'linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))', border: 'transparent', color: 'white', shadow: '0 3px 10px -3px var(--color-primary-500)' },
		danger: { bg: '#fef2f2', border: '#fecaca', color: '#dc2626', shadow: '0 1px 3px rgba(239,68,68,0.1)' },
	};
	const s = styles[variant] || styles.ghost;

	return (
		<div className="relative">
			<motion.button
				type="button"
				aria-label={tooltip}
				title={tooltip}
				onClick={onClick}
				disabled={disabled}
				onMouseEnter={() => setShow(true)}
				onMouseLeave={() => setShow(false)}
				whileHover={{ scale: disabled ? 1 : 1.08 }}
				whileTap={{ scale: disabled ? 1 : 0.92 }}
				className={`inline-flex items-center justify-center rounded-xl border transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-300)] ${sizes[size]}`}
				style={{ background: s.bg, borderColor: s.border, color: s.color, boxShadow: disabled ? 'none' : s.shadow }}
			>
				{children}
			</motion.button>

			<AnimatePresence>
				{show && !disabled && (
					<motion.div
						initial={{ opacity: 0, y: 4, scale: 0.95 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 4, scale: 0.95 }}
						transition={{ duration: 0.1 }}
						className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-white"
						style={{ background: '#0f172a', boxShadow: '0 8px 24px rgba(15,23,42,0.3)' }}
					>
						{tooltip}
						<div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent" style={{ borderTopColor: '#0f172a', marginTop: '-1px' }} />
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

/**
 * Labeled action button (with tooltip)
 */
function ActionBtn({ tooltip, onClick, children, variant = 'ghost', disabled = false }) {
	const styles = {
		ghost: { bg: 'white', border: 'var(--color-primary-200)', color: 'var(--color-primary-700)', shadow: '0 1px 3px rgba(15,23,42,0.06)' },
		primary: { bg: 'linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))', border: 'transparent', color: 'white', shadow: '0 4px 14px -4px var(--color-primary-500)' },
		danger: { bg: '#fef2f2', border: '#fecaca', color: '#dc2626', shadow: '0 1px 3px rgba(239,68,68,0.1)' },
	};
	const s = styles[variant] || styles.ghost;

	return (
		<motion.button
			type="button"
			onClick={onClick}
			disabled={disabled}
			title={tooltip}
			whileHover={{ scale: disabled ? 1 : 1.02 }}
			whileTap={{ scale: disabled ? 1 : 0.97 }}
			className="inline-flex h-9 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-300)]"
			style={{ background: s.bg, borderColor: s.border, color: s.color, boxShadow: disabled ? 'none' : s.shadow }}
		>
			{children}
		</motion.button>
	);
}

/**
 * OptionTag — removable tag in InputList
 */
function OptionTag({ label, onRemove, disabled }) {
	return (
		<motion.span
			initial={{ scale: 0.8, opacity: 0 }}
			animate={{ scale: 1, opacity: 1 }}
			exit={{ scale: 0.8, opacity: 0 }}
			transition={{ type: 'spring', stiffness: 320, damping: 24 }}
			className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold"
			style={{ borderColor: 'var(--color-primary-200)', background: 'var(--color-primary-50)', color: 'var(--color-primary-800)' }}
		>
			{label}
			{!disabled && (
				<motion.button
					type="button"
					onClick={onRemove}
					whileHover={{ scale: 1.2 }}
					whileTap={{ scale: 0.9 }}
					className="rounded opacity-50 hover:opacity-100 transition-opacity"
				>
					<FiX className="h-3 w-3" />
				</motion.button>
			)}
		</motion.span>
	);
}

/**
 * InputList — tag-style option input
 */
function InputList({ label, value = [], onChange, placeholder, disabled = false }) {
	const [items, setItems] = useState(Array.isArray(value) ? value : []);
	const [draft, setDraft] = useState('');

	useEffect(() => { setItems(Array.isArray(value) ? value : []); }, [value]);

	const emit = useCallback(next => { setItems(next); onChange?.(next); }, [onChange]);

	const commitDraft = useCallback(text => {
		const raw = (text ?? '').trim();
		if (!raw) return;
		const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
		let next = [...items];
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
		<div>
			{label && <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>}
			<div
				className="min-h-[52px] rounded-xl border p-3 transition-colors"
				style={{ borderColor: 'var(--color-primary-200)', background: 'var(--color-primary-50)' }}
			>
				<div className="mb-2 flex flex-wrap gap-1.5">
					<AnimatePresence mode="popLayout">
						{items.map((opt, i) => (
							<OptionTag key={`${opt}-${i}`} label={opt} onRemove={() => emit(items.filter((_, j) => j !== i))} disabled={disabled} />
						))}
					</AnimatePresence>
				</div>
				<input
					type="text"
					value={draft}
					onChange={e => setDraft(e.target.value)}
					onKeyDown={handleKeyDown}
					onBlur={() => commitDraft(draft)}
					placeholder={placeholder}
					disabled={disabled}
					className="w-full border-0 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
				/>
			</div>
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

	const fieldIcon = FIELD_TYPE_OPTIONS.find(o => o.id === field.type)?.icon || '📝';
	const hasOptions = ['select', 'radio', 'checklist'].includes(field.type);

	return (
		<motion.div
			ref={isNew ? newFieldRef : null}
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.97 }}
			transition={{ type: 'spring', stiffness: 300, damping: 26 }}
			className="group relative"
		>
			<div
				className={`relative overflow-hidden rounded-2xl border transition-all duration-200 ${editing
					? 'border-[color:var(--color-primary-300)] shadow-md shadow-[color:var(--color-primary-100)]'
					: 'border-[color:var(--color-primary-100)] hover:border-[color:var(--color-primary-200)] hover:shadow-sm'
					} bg-white`}
			>
				{/* Active accent bar */}
				{editing && (
					<div
						className="absolute inset-y-0 ltr:left-0 rtl:right-0 w-1 rounded-l-2xl"
						style={{ background: 'linear-gradient(180deg, var(--color-gradient-from), var(--color-gradient-to))' }}
					/>
				)}

				<div className={`px-4 py-2 ${editing ? 'ltr:pl-5 rtl:pr-5' : ''}`}>
					{!editing ? (
						/* ── View mode ── */
						<div className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-3 flex-1 min-w-0">
								{/* Index chip */}
								<span
									className="h-6 w-6 flex-shrink-0 grid place-items-center rounded-lg text-[11px] font-bold"
									style={{ background: 'var(--color-primary-100)', color: 'var(--color-primary-600)' }}
								>
									{index + 1}
								</span>

								<span className="text-lg leading-none flex-shrink-0">{fieldIcon}</span>

								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 flex-wrap">
										<MultiLangText className="truncate text-sm font-semibold text-slate-900">
											{field.label || t('labels.no_label')}
										</MultiLangText>
										<Badge variant="primary">{t(`types_map.${field.type}`)}</Badge>
										{field.required && <Badge variant="warning">⚠ {t('labels.required')}</Badge>}
									</div>

									<p className="mt-0.5 text-[11px] font-mono text-slate-400">{field.key}</p>

									{hasOptions && field.options?.length > 0 && (
										<div className="mt-2 flex flex-wrap gap-1">
											{field.options.slice(0, 3).map((opt, i) => <Badge key={i} variant="primary">{opt}</Badge>)}
											{field.options.length > 3 && <Badge variant="primary">+{field.options.length - 3}</Badge>}
										</div>
									)}
								</div>
							</div>

							{/* Actions — visible on hover */}
							<div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
								<IconBtn tooltip={t('actions.move_up')} onClick={() => moveField(index, -1)} disabled={!canMoveUp} size="sm">
									<FiChevronUp className="h-3.5 w-3.5" />
								</IconBtn>
								<IconBtn tooltip={t('actions.move_down')} onClick={() => moveField(index, +1)} disabled={!canMoveDown} size="sm">
									<FiChevronDown className="h-3.5 w-3.5" />
								</IconBtn>
								<IconBtn tooltip={t('actions.edit_field')} onClick={() => toggleEditField(index, true)} variant="primary" size="sm">
									<FiEdit2 className="h-3 w-3" />
								</IconBtn>
								<IconBtn tooltip={t('actions.remove_field')} onClick={() => removeField(index)} variant="danger" size="sm">
									<FiTrash2 className="h-3 w-3" />
								</IconBtn>
							</div>
						</div>
					) : (
						/* ── Edit mode ── */
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 flex items-center  gap-4">


							<div className={`flex-1 grid grid-cols-1 gap-4 ${hasOptions ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
								<div className="md:col-span-1">
									<Input
										label={t('editor.label')}
										placeholder={t('editor.placeholders.label')}
										value={labelDraft}
										onChange={v => setLabelDraft(v)}
										onBlur={commitDrafts}
									/>
								</div>
								<div className="md:col-span-1">
									<Select
										clearable={false}
										searchable={false}
										label={t('editor.type')}
										value={field.type}
										onChange={v => updateFieldProp(index, 'type', v)}
										options={typeOptions}
									/>
								</div>
								{hasOptions && (
									<InputList
										label={t('editor.options')}
										value={field.options || []}
										onChange={arr => updateFieldProp(index, 'options', arr)}
										placeholder={t('editor.placeholders.option')}
									/>
								)}
								<div className=" mt-[30px] ">
									<CheckBox
										label={t('editor.required')}
										initialChecked={!!field.required}
										onChange={val => updateFieldProp(index, 'required', !!val)}
									/>
								</div>

							</div>


							<div className="flex justify-end ">
								<motion.button
									type="button"
									onClick={() => { commitDrafts(); toggleEditField(index, false); }}
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.97 }}
									className="inline-flex h-9 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-300)]"
									style={{
										background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
										boxShadow: '0 4px 14px -4px var(--color-primary-500)',
									}}
								>
									<Check className="h-3.5 w-3.5" />
									{t('actions.done')}
								</motion.button>
							</div>
						</motion.div>
					)}
				</div>
			</div>
		</motion.div>
	);
});

// ─────────────────────────────────────────────────────────────
//  SKELETON LOADER
// ─────────────────────────────────────────────────────────────
function SkeletonRow() {
	return (
		<div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3">
			<div className="h-8 w-8 animate-pulse rounded-xl bg-slate-100" />
			<div className="flex-1 space-y-2">
				<div className="h-3 w-1/3 animate-pulse rounded-full bg-slate-100" />
				<div className="h-2.5 w-1/4 animate-pulse rounded-full bg-slate-100" />
			</div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────
//  MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function FormsManagementPage() {
	const t = useTranslations('forms');
	const user = useUser();

	const [forms, setForms] = useState([]);
	const [query, setQuery] = useState('');
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

	const typeOptions = useMemo(
		() => FIELD_TYPE_OPTIONS.map(o => ({ id: o.id, label: t(`types_map.${o.id}`) })),
		[t]
	);

	// ── Fetch ──
	const fetchForms = useCallback(async () => {
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
			if (list.length && !selectedForm) setSelectedForm(list[0]);
		} catch {
			Notification(t('messages.load_failed'), 'error');
		} finally {
			setIsLoading(false);
		}
	}, [selectedForm, t]);

	useEffect(() => { fetchForms(); }, [fetchForms]);

	const deferredQuery = useDeferredValue(query);
	const filtered = useMemo(() => {
		const q = (deferredQuery || '').trim().toLowerCase();
		return q ? forms.filter(f => (f.title || '').toLowerCase().includes(q)) : forms;
	}, [forms, deferredQuery]);

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

	const addInlineField = useCallback(() => {
		const idx = formFields.length;
		setFormFields(prev => [...prev, { _uid: crypto.randomUUID(), label: '', key: genKey12(), type: 'text', placeholder: '', required: false, options: [], order: idx }]);
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

	const canEdit = form => !form?.adminId || form?.adminId === user?.id;
	const isCoachRole = user?.role === 'coach';

	// ─────────────────────────────────────────────────────────────────
	return (
		<div className="min-h-screen pb-20">

			{/* ── Page header ── */}
			<GradientStatsHeader
				onClick={openCreateFormModal}
				btnName={t('header.new')}
				title={t('header.title')}
				desc={t('header.desc')}
				icon={Sparkles}
			/>

			<div className="mt-8">
				{isLoading ? (
					/* ── Skeleton ── */
					<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
						<div className="lg:col-span-4">
							<Card className="p-4 space-y-3">
								{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
							</Card>
						</div>
						<div className="lg:col-span-8">
							<Card className="p-6 space-y-3">
								<div className="h-10 w-2/3 animate-pulse rounded-xl bg-slate-100" />
								{Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
							</Card>
						</div>
					</div>
				) : (
					<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

						{/* ══════════════════════════════════════════
                LEFT SIDEBAR
            ══════════════════════════════════════════ */}
						<aside className="lg:col-span-4">
							<div className="sticky top-6">
								<Card glow accent>
									{/* Sidebar header */}
									<div className="border-b border-[color:var(--color-primary-100)] px-5 pb-4 pt-5">
										<div className="mb-4 flex items-center justify-between">
											<div className="flex items-center gap-3">
												<IconBox active size="md">
													<Database className="h-5 w-5" />
												</IconBox>
												<div>
													<p className="text-sm font-bold leading-tight text-slate-900">{t('header.title')}</p>
													<p className="mt-0.5 text-xs font-medium text-slate-400">
														{forms.length} {t('labels.forms')}
													</p>
												</div>
											</div>

											{/* Count pill */}
											<span
												className="rounded-full px-2.5 py-1 text-xs font-bold"
												style={{ background: 'var(--color-primary-100)', color: 'var(--color-primary-700)' }}
											>
												{filtered.length}/{forms.length}
											</span>
										</div>

										{/* Search */}
										<div className="relative">
											<FiSearch
												className="pointer-events-none absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3 h-3.5 w-3.5"
												style={{ color: 'var(--color-primary-400)' }}
											/>
											<input
												type="text"
												value={query}
												onChange={e => setQuery(e.target.value)}
												placeholder={t('labels.search', { default: 'Search forms…' })}
												className="h-9 w-full rounded-xl border bg-white text-sm font-medium outline-none transition-all ltr:pl-9 rtl:pr-9 ltr:pr-3 rtl:pl-3 placeholder:text-slate-400 focus:ring-2 focus:ring-[color:var(--color-primary-200)]"
												style={{ borderColor: 'var(--color-primary-200)', color: 'var(--color-primary-900)' }}
											/>
										</div>
									</div>

									{/* List */}
									{filtered.length === 0 ? (
										<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 py-14 text-center">
											<IconBox size="lg" className="mx-auto mb-3">
												<FiFileText className="h-6 w-6" style={{ color: 'var(--color-primary-400)' }} />
											</IconBox>
											<p className="text-sm font-semibold text-slate-700">{t('empty.title')}</p>
											<p className="mt-1 text-xs text-slate-400">{t('empty.subtitle')}</p>
										</motion.div>
									) : (
										<div className="max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200">
											<ul className="space-y-1.5 p-2.5">
												<AnimatePresence mode="popLayout">
													{filtered.map((form, index) => {
														const isActive = selectedForm?.id === form.id;
														return (
															<motion.li
																key={form.id}
																initial={{ opacity: 0, x: -10 }}
																animate={{ opacity: 1, x: 0 }}
																exit={{ opacity: 0, x: 10 }}
																transition={{ delay: index * 0.035 }}
															>
																<div
																	className="overflow-hidden rounded-xl border transition-all group cursor-pointer"
																	style={{
																		borderColor: isActive ? 'var(--color-primary-300)' : 'transparent',
																		background: isActive
																			? 'linear-gradient(135deg, var(--color-primary-50), white)'
																			: 'transparent',
																	}}
																>
																	{/* Main row */}
																	<motion.button
																		type="button"
																		onClick={() => setSelectedForm(form)}
																		whileHover={{ x: 2 }}
																		className="w-full px-3 py-3 text-left"
																	>
																		<div className="flex items-center gap-2.5">
																			<div
																				className="h-8 w-8 flex-shrink-0 grid place-items-center rounded-lg transition-colors"
																				style={{
																					background: isActive
																						? 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))'
																						: 'var(--color-primary-100)',
																				}}
																			>
																				<FiFileText
																					className="h-4 w-4"
																					style={{ color: isActive ? 'white' : 'var(--color-primary-500)' }}
																				/>
																			</div>

																			<div className="min-w-0 flex flex-col gap-2 flex-1">
																				<MultiLangText
																					className="block rtl:text-right ltr:text-left truncate text-sm font-semibold"
																					style={{ color: isActive ? 'var(--color-primary-900)' : '#1e293b' }}
																				>
																					{form.title}
																				</MultiLangText>

																				<ActionButtons
																					row={form}
																					gap="gap-1"
																					actions={[
																						{
																							icon: <LinkIcon />,
																							tooltip: t('actions.copy_link'),
																							variant: 'blue',
																							size: 'sm',
																							onClick: row => copyLink(row.id),
																						},
																						{
																							icon: <Files />,
																							tooltip: t('actions.duplicate'),
																							variant: 'purple',
																							size: 'sm',
																							onClick: row => handleDuplicateForm(row),
																						},
																						{
																							icon: <PencilLine />,
																							tooltip: t('actions.edit'),
																							variant: 'amber',
																							size: 'sm',
																							hidden: !canEdit(form),
																							onClick: row => openEditFormModal(row, true),
																						},
																						{
																							icon: <LucideTrash2 />,
																							tooltip: t('actions.delete'),
																							variant: 'red',
																							size: 'sm',
																							hidden: !canEdit(form),
																							onClick: row => {
																								setDeletingId(row.id);
																								setShowDeleteModal(true);
																							},
																						},
																					]}
																				/>
																			</div>
																			<div className="mt-0.5 flex items-center gap-1.5">
																				<span className="text-[11px] font-medium text-slate-400">
																					{form.fields?.length ?? 0} {t('labels.fields')}
																				</span>
																				{form.adminId === user?.id
																					? <Badge variant="success">own</Badge>
																					: <Badge variant="warning">shared</Badge>}
																			</div>
																		</div>
																	</motion.button>
																</div>
															</motion.li>
														);
													})}
												</AnimatePresence>
											</ul>
										</div>
									)}
								</Card>
							</div>
						</aside>

						{/* ══════════════════════════════════════════
                RIGHT PANEL
            ══════════════════════════════════════════ */}
						<section className="lg:col-span-8">
							<AnimatePresence mode="wait">
								{!selectedForm ? (
									/* ── Empty state ── */
									<motion.div
										key="empty"
										initial={{ opacity: 0, scale: 0.98 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0.98 }}
									>
										<Card className="min-h-[520px] flex items-center justify-center p-12 text-center">
											<div>
												<motion.div
													animate={{ y: [0, -7, 0] }}
													transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
													className="mx-auto mb-5 inline-block"
												>
													<IconBox active size="xl">
														<Sparkles className="h-7 w-7" />
													</IconBox>
												</motion.div>
												<p className="text-lg font-bold text-slate-800">{t('empty.select_hint')}</p>
												<p className="mt-1.5 text-sm text-slate-400">{t('empty.select_hint_sub')}</p>
											</div>
										</Card>
									</motion.div>
								) : (
									/* ── Form detail ── */
									<motion.div
										key={selectedForm.id}
										initial={{ opacity: 0, y: 8 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -8 }}
										transition={{ type: 'spring', stiffness: 300, damping: 28 }}
									>
										<Card glow accent>
											{/* Detail header */}
											<div className="border-b border-[color:var(--color-primary-100)] px-6 py-5">
												<div className="mb-4 flex items-start justify-between gap-4">
													<div className="flex min-w-0 flex-1 items-start gap-4 pt-0.5">
														<IconBox active size="lg">
															<FiFileText className="h-5 w-5" />
														</IconBox>
														<div className="min-w-0 flex-1">
															<MultiLangText
																className="mb-2 block text-2xl font-bold tracking-tight rtl:text-right"
																style={{
																	background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
																	WebkitBackgroundClip: 'text',
																	backgroundClip: 'text',
																	WebkitTextFillColor: 'transparent',
																}}
															>
																{selectedForm.title}
															</MultiLangText>
															<div className="flex flex-wrap items-center gap-2">
																<Badge variant="primary" icon="📊">
																	{selectedForm.fields?.length || 0} {t('labels.fields')}
																</Badge>
																{isCoachRole && selectedForm.adminId && selectedForm.adminId !== user?.id && (
																	<Badge variant="warning" icon="👤">{t('labels.shared_form')}</Badge>
																)}
															</div>
														</div>
													</div>
												</div>

												{/* Action bar */}
												<div className="flex flex-wrap gap-2">
													<ActionBtn tooltip={t('actions.copy_link')} onClick={() => copyLink(selectedForm.id)} variant="ghost">
														<LinkIcon className="h-4 w-4" />
														<span className="hidden sm:inline">{t('actions.copy_link')}</span>
													</ActionBtn>
													<ActionBtn tooltip={t('actions.duplicate')} onClick={() => handleDuplicateForm(selectedForm)} variant="ghost">
														<Files className="h-4 w-4" />
														<span className="hidden sm:inline">{t('actions.duplicate')}</span>
													</ActionBtn>
													{canEdit(selectedForm) && (
														<>
															<ActionBtn tooltip={t('actions.edit')} onClick={() => openEditFormModal(selectedForm, true)} variant="primary">
																<PencilLine className="h-4 w-4" />
																<span className="hidden sm:inline">{t('actions.edit')}</span>
															</ActionBtn>
															<ActionBtn
																tooltip={t('actions.delete')}
																onClick={() => { setDeletingId(selectedForm.id); setShowDeleteModal(true); }}
																variant="danger"
															>
																<LucideTrash2 className="h-4 w-4" />
																<span className="hidden sm:inline">{t('actions.delete')}</span>
															</ActionBtn>
														</>
													)}
												</div>
											</div>

											{/* Fields preview */}
											<div className="p-6">
												{selectedFormFields.length ? (
													<div className="max-h-[calc(100vh-380px)] space-y-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200">
														<AnimatePresence mode="popLayout">
															{selectedFormFields.map(field => {
																const fieldIcon = FIELD_TYPE_OPTIONS.find(o => o.id === field.type)?.icon || '📝';
																return (
																	<motion.div
																		key={field.id}
																		initial={{ opacity: 0, y: 6 }}
																		animate={{ opacity: 1, y: 0 }}
																		exit={{ opacity: 0, scale: 0.97 }}
																		className="flex items-start gap-3 rounded-xl border p-3.5 transition-colors hover:border-[color:var(--color-primary-200)]"
																		style={{ borderColor: 'var(--color-primary-100)', background: 'rgba(255,255,255,0.8)' }}
																	>
																		<div className="flex flex-shrink-0 items-center gap-2">
																			<span
																				className="grid h-5 w-5 place-items-center rounded-md text-[10px] font-bold"
																				style={{ background: 'var(--color-primary-100)', color: 'var(--color-primary-600)' }}
																			>
																				{field.order ?? 1}
																			</span>
																			<span className="text-base leading-none">{fieldIcon}</span>
																		</div>

																		<div className="flex-1 min-w-0">
																			<MultiLangText className="mb-1.5 text-sm font-semibold text-slate-900">
																				{field.label}
																			</MultiLangText>
																			<div className="flex flex-wrap gap-1.5">
																				<Badge variant="primary">{t(`types_map.${field.type}`)}</Badge>
																				{field.required && <Badge variant="warning">⚠ {t('labels.required')}</Badge>}
																				{['select', 'radio', 'checklist'].includes(field.type) &&
																					(field.options || []).map((opt, i) => <Badge key={i} variant="primary">{opt}</Badge>)}
																			</div>
																		</div>
																	</motion.div>
																);
															})}
														</AnimatePresence>
													</div>
												) : (
													<motion.div
														initial={{ opacity: 0 }}
														animate={{ opacity: 1 }}
														className="rounded-2xl border border-dashed p-16 text-center"
														style={{ borderColor: 'var(--color-primary-200)', background: 'var(--color-primary-50)' }}
													>
														<IconBox size="xl" className="mx-auto mb-3">
															<Layers className="h-7 w-7" style={{ color: 'var(--color-primary-400)' }} />
														</IconBox>
														<p className="text-sm font-semibold text-slate-600">{t('empty.no_fields')}</p>
													</motion.div>
												)}
											</div>
										</Card>
									</motion.div>
								)}
							</AnimatePresence>
						</section>
					</div>
				)}
			</div>

			{/* ═══════════════════════════════════════════════
          DELETE MODAL
      ═══════════════════════════════════════════════ */}
			<Modal
				open={showDeleteModal}
				onClose={() => { if (!isDeleting) { setShowDeleteModal(false); setDeletingId(null); } }}
				title={t('delete.title')}
				maxW="max-w-md"
			>
				<div className="space-y-5 pt-2">
					<div
						className="flex items-start gap-4 rounded-2xl border p-4"
						style={{ borderColor: '#fecaca', background: '#fef2f2' }}
					>
						<IconBox variant="danger" size="md">
							<AlertCircle className="h-5 w-5" />
						</IconBox>
						<p className="flex-1 text-sm leading-relaxed text-slate-700">{t('delete.message')}</p>
					</div>

					<div className="flex justify-end gap-2.5">
						<Button
							name={t('actions.cancel')}
							className="!w-fit"
							onClick={() => { if (!isDeleting) { setShowDeleteModal(false); setDeletingId(null); } }}
						/>
						<Button
							name={isDeleting ? t('actions.deleting') : t('delete.confirm')}
							className="!w-fit"
							color="danger"
							onClick={() => deletingId && deleteForm(deletingId)}
							disabled={isDeleting}
						/>
					</div>
				</div>
			</Modal>

			{/* ═══════════════════════════════════════════════
          CREATE / EDIT MODAL
      ═══════════════════════════════════════════════ */}
			<Modal
				open={showFormModal}
				onClose={() => setShowFormModal(false)}
				title={isEditing ? t('edit.title') : t('create.title')}
				maxW="max-w-5xl"
			>
				<form
					className="space-y-5 pt-4"
					onSubmit={e => { e.preventDefault(); (isEditing ? updateForm : createForm)(); }}
				>
					{/* Title input */}
					<div
						className="rounded-2xl border p-4"
						style={{ borderColor: 'var(--color-primary-200)', background: 'var(--color-primary-50)' }}
					>
						<Input
							placeholder={t('editor.placeholders.form_title')}
							value={formTitle}
							onChange={setFormTitle}
						/>
					</div>

					{/* Fields builder */}
					<div>
						<div className="mb-3 flex items-center justify-between">
							<div className="flex items-center gap-2.5">
								<IconBox active size="sm">
									<Layers className="h-4 w-4" />
								</IconBox>
								<h3 className="text-sm font-bold text-slate-900">{t('editor.fields')}</h3>
								<span
									className="rounded-full px-2 py-0.5 text-[11px] font-bold"
									style={{ background: 'var(--color-primary-100)', color: 'var(--color-primary-700)' }}
								>
									{formFields.length}
								</span>
							</div>

							<motion.button
								type="button"
								onClick={addInlineField}
								whileHover={{ scale: 1.03 }}
								whileTap={{ scale: 0.97 }}
								className="inline-flex h-9 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-300)]"
								style={{
									background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
									boxShadow: '0 4px 14px -4px var(--color-primary-500)',
								}}
							>
								<FiPlus className="h-4 w-4" />
								{t('editor.add_field')}
							</motion.button>
						</div>

						{formFields.length ? (
							<div
								ref={fieldsContainerRef}
								className="max-h-[480px] space-y-2.5 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200"
							>
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
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								className="rounded-2xl border border-dashed p-12 text-center"
								style={{ borderColor: 'var(--color-primary-200)', background: 'var(--color-primary-50)' }}
							>
								<IconBox size="xl" className="mx-auto mb-3">
									<Layers className="h-7 w-7" style={{ color: 'var(--color-primary-400)' }} />
								</IconBox>
								<p className="text-sm font-semibold text-slate-600">{t('empty.no_fields')}</p>
							</motion.div>
						)}
					</div>

					{/* Modal footer */}
					<div
						className="flex justify-end gap-2.5 border-t pt-4"
						style={{ borderColor: 'var(--color-primary-100)' }}
					>
						<motion.button
							type="button"
							onClick={() => setShowFormModal(false)}
							whileHover={{ scale: 1.01 }}
							whileTap={{ scale: 0.98 }}
							className="inline-flex h-10 items-center rounded-xl border px-5 text-sm font-semibold text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-300)]"
							style={{ borderColor: 'var(--color-primary-200)', background: 'white' }}
						>
							{t('actions.cancel')}
						</motion.button>

						<motion.button
							type="submit"
							disabled={loading}
							whileHover={{ scale: loading ? 1 : 1.02 }}
							whileTap={{ scale: loading ? 1 : 0.97 }}
							className="inline-flex h-10 items-center gap-2 rounded-xl px-6 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-300)]"
							style={{
								background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
								boxShadow: '0 4px 16px -4px var(--color-primary-500)',
								opacity: loading ? 0.72 : 1,
								cursor: loading ? 'not-allowed' : 'pointer',
							}}
						>
							{loading ? (
								<motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
									<Zap className="h-4 w-4" />
								</motion.span>
							) : (
								<>
									{isEditing ? <FiEdit2 className="h-4 w-4" /> : <FiPlus className="h-4 w-4" />}
									{isEditing ? t('edit.cta') : t('create.cta')}
								</>
							)}
						</motion.button>
					</div>
				</form>
			</Modal>
		</div>
	);
}