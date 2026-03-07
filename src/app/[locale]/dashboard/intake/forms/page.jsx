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
	FiGrid,
	FiList,
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
	BarChart3,
	Database,
	Eye,
	Filter,
	Calendar,
	ChevronRight,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';

// -------- constants --------
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

// -------- helpers --------
function genKey12() {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let s = '';
	for (let i = 0; i < 12; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
	return s;
}

/* ==================== PREMIUM UI COMPONENTS ==================== */

function PremiumCard({ children, className = '', hover = true, glow = false, accent = false }) {
	return (
		<motion.div
			whileHover={hover ? { y: -1, boxShadow: '0 12px 40px rgba(15, 23, 42, 0.12)' } : {}}
			transition={{ type: 'spring', stiffness: 400, damping: 30 }}
			className={`relative rounded-xl border overflow-hidden ${className}`}
			style={{
				background: 'rgba(255, 255, 255, 0.97)',
				borderColor: glow ? 'var(--color-primary-300)' : 'var(--color-primary-100)',
				boxShadow: glow
					? '0 0 0 1px var(--color-primary-200), 0 16px 48px rgba(99, 102, 241, 0.1)'
					: '0 1px 4px rgba(15, 23, 42, 0.06), 0 4px 16px rgba(15, 23, 42, 0.04)',
			}}
		>
			{accent && (
				<div
					className="absolute top-0 left-0 right-0 h-0.5"
					style={{
						background: 'linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-via, var(--color-gradient-to)), var(--color-gradient-to))',
					}}
				/>
			)}
			{children}
		</motion.div>
	);
}

function IconWrapper({ children, active = false, size = 'md', variant = 'primary' }) {
	const sizes = {
		sm: 'w-8 h-8',
		md: 'w-10 h-10',
		lg: 'w-12 h-12',
		xl: 'w-14 h-14',
	};

	const getStyle = () => {
		if (variant === 'danger') return { background: 'linear-gradient(135deg, #fef2f2, #fee2e2)', color: '#dc2626' };
		if (variant === 'success') return { background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', color: '#16a34a' };
		if (variant === 'warning') return { background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', color: '#d97706' };
		if (active) return {
			background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
			boxShadow: '0 6px 20px rgba(99, 102, 241, 0.3)',
			color: 'white',
		};
		return {
			background: 'linear-gradient(135deg, var(--color-primary-50), var(--color-primary-100))',
			color: 'var(--color-primary-700)',
		};
	};

	return (
		<div
			className={`grid place-items-center rounded-xl flex-shrink-0 ${sizes[size]}`}
			style={getStyle()}
		>
			{children}
		</div>
	);
}

function PremiumButton({ title, onClick, children, variant = 'ghost', disabled = false, size = 'md' }) {
	const sizes = {
		sm: 'h-8 w-8 text-xs',
		md: 'h-9 w-9 text-sm',
		lg: 'h-10 w-10 text-base',
	};

	const variants = {
		ghost: {
			bg: 'white',
			border: 'var(--color-primary-200)',
			color: 'var(--color-primary-600)',
			shadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
			hoverBorder: 'var(--color-primary-400)',
		},
		primary: {
			bg: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
			border: 'transparent',
			color: 'white',
			shadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
		},
		danger: {
			bg: '#fef2f2',
			border: '#fecaca',
			color: '#dc2626',
			shadow: '0 1px 3px rgba(239, 68, 68, 0.1)',
		},
	};

	const style = variants[variant] || variants.ghost;

	return (
		<motion.button
			type="button"
			title={title}
			aria-label={title}
			onClick={onClick}
			disabled={disabled}
			whileHover={{ scale: disabled ? 1 : 1.05 }}
			whileTap={{ scale: disabled ? 1 : 0.94 }}
			className={`inline-flex items-center justify-center rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${sizes[size]}`}
			style={{
				background: style.bg,
				borderColor: style.border,
				color: style.color,
				boxShadow: disabled ? 'none' : style.shadow,
			}}
		>
			{children}
		</motion.button>
	);
}

function Badge({ children, variant = 'primary', icon = null }) {
	const variants = {
		primary: {
			bg: 'var(--color-primary-50)',
			border: 'var(--color-primary-200)',
			text: 'var(--color-primary-700)',
		},
		warning: {
			bg: '#fffbeb',
			border: '#fde68a',
			text: '#92400e',
		},
		success: {
			bg: '#f0fdf4',
			border: '#bbf7d0',
			text: '#166534',
		},
		danger: {
			bg: '#fef2f2',
			border: '#fecaca',
			text: '#991b1b',
		},
	};

	const style = variants[variant] || variants.primary;

	return (
		<span
			className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold tracking-tight"
			style={{
				background: style.bg,
				borderColor: style.border,
				color: style.text,
			}}
		>
			{icon && <span className="text-[10px] leading-none">{icon}</span>}
			{children}
		</span>
	);
}

function OptionTag({ label, onRemove, disabled = false }) {
	return (
		<motion.span
			initial={{ scale: 0.8, opacity: 0 }}
			animate={{ scale: 1, opacity: 1 }}
			exit={{ scale: 0.8, opacity: 0 }}
			transition={{ type: 'spring', stiffness: 300, damping: 22 }}
			className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold"
			style={{
				borderColor: 'var(--color-primary-200)',
				background: 'var(--color-primary-50)',
				color: 'var(--color-primary-800)',
			}}
		>
			{label}
			{!disabled && (
				<motion.button
					type="button"
					onClick={onRemove}
					whileHover={{ scale: 1.2 }}
					whileTap={{ scale: 0.9 }}
					className="rounded-sm opacity-60 hover:opacity-100 transition-opacity"
					style={{ color: 'var(--color-primary-600)' }}
				>
					<FiX className="w-3 h-3" />
				</motion.button>
			)}
		</motion.span>
	);
}

function TooltipButton({ tooltip, onClick, children, variant = 'ghost', disabled = false }) {
	const [showTooltip, setShowTooltip] = useState(false);

	const variants = {
		ghost: {
			bg: 'white',
			border: 'var(--color-primary-200)',
			color: 'var(--color-primary-700)',
			shadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
		},
		primary: {
			bg: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
			border: 'transparent',
			color: 'white',
			shadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
		},
		danger: {
			bg: '#fef2f2',
			border: '#fecaca',
			color: '#dc2626',
			shadow: '0 1px 3px rgba(239, 68, 68, 0.1)',
		},
	};

	const style = variants[variant] || variants.ghost;

	return (
		<div className="relative inline-block">
			<motion.button
				type="button"
				onClick={onClick}
				disabled={disabled}
				onMouseEnter={() => setShowTooltip(true)}
				onMouseLeave={() => setShowTooltip(false)}
				whileHover={{ scale: disabled ? 1 : 1.02 }}
				whileTap={{ scale: disabled ? 1 : 0.97 }}
				className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold"
				style={{
					background: style.bg,
					borderColor: style.border,
					color: style.color,
					boxShadow: disabled ? 'none' : style.shadow,
				}}
			>
				{children}
			</motion.button>

			<AnimatePresence>
				{showTooltip && !disabled && (
					<motion.div
						initial={{ opacity: 0, y: 4, scale: 0.96 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 4, scale: 0.96 }}
						transition={{ duration: 0.12 }}
						className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap pointer-events-none z-50"
						style={{
							background: '#1e293b',
							color: '#f8fafc',
							boxShadow: '0 8px 24px rgba(15, 23, 42, 0.35)',
						}}
					>
						{tooltip}
						<div
							className="absolute left-1/2 -translate-x-1/2 top-full w-1.5 h-1.5 rotate-45"
							style={{ background: '#1e293b', marginTop: '-3px' }}
						/>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

function QuickActionIcon({ tooltip, onClick, icon, variant = 'ghost', disabled = false }) {
	const [showTooltip, setShowTooltip] = useState(false);

	const variants = {
		ghost: { bg: 'white', border: 'var(--color-primary-200)', color: 'var(--color-primary-600)' },
		primary: {
			bg: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
			border: 'transparent',
			color: 'white',
		},
		danger: { bg: '#fef2f2', border: '#fecaca', color: '#dc2626' },
	};

	const style = variants[variant] || variants.ghost;

	return (
		<div className="relative inline-block">
			<motion.button
				type="button"
				onClick={onClick}
				disabled={disabled}
				onMouseEnter={() => setShowTooltip(true)}
				onMouseLeave={() => setShowTooltip(false)}
				whileHover={{ scale: disabled ? 1 : 1.1 }}
				whileTap={{ scale: disabled ? 1 : 0.93 }}
				className="inline-flex items-center justify-center w-7 h-7 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
				style={{
					background: style.bg,
					borderColor: style.border,
					color: style.color,
					boxShadow: '0 1px 3px rgba(15, 23, 42, 0.07)',
				}}
			>
				{icon}
			</motion.button>

			<AnimatePresence>
				{showTooltip && !disabled && (
					<motion.div
						initial={{ opacity: 0, y: 4 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 4 }}
						transition={{ duration: 0.12 }}
						className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap pointer-events-none z-50"
						style={{
							background: '#1e293b',
							color: '#f8fafc',
							boxShadow: '0 8px 24px rgba(15, 23, 42, 0.35)',
						}}
					>
						{tooltip}
						<div
							className="absolute left-1/2 -translate-x-1/2 top-full w-1.5 h-1.5 rotate-45"
							style={{ background: '#1e293b', marginTop: '-3px' }}
						/>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

function InputList({
	label,
	value = [],
	onChange,
	placeholder = 'Add option and press Enter',
	disabled = false,
}) {
	const [items, setItems] = useState(Array.isArray(value) ? value : []);
	const [draft, setDraft] = useState('');

	useEffect(() => {
		setItems(Array.isArray(value) ? value : []);
	}, [value]);

	const emit = useCallback(
		(next) => {
			setItems(next);
			onChange?.(next);
		},
		[onChange]
	);

	const commitDraft = useCallback(
		(text) => {
			const raw = (text ?? '').trim();
			if (!raw) return;
			const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
			let next = [...items];
			for (const p of parts) {
				if (!next.includes(p)) next.push(p);
			}
			emit(next);
			setDraft('');
		},
		[items, emit]
	);

	const handleKeyDown = (e) => {
		if (disabled) return;
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			commitDraft(draft);
		}
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
		<div>
			{label && <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">{label}</div>}
			<div
				className="rounded-xl border p-3 min-h-[60px]"
				style={{
					borderColor: 'var(--color-primary-200)',
					background: 'var(--color-primary-50)',
				}}
			>
				<div className="flex flex-wrap gap-1.5 mb-2">
					<AnimatePresence mode="popLayout">
						{items.map((opt, i) => (
							<OptionTag key={`${opt}-${i}`} label={opt} onRemove={() => removeAt(i)} disabled={disabled} />
						))}
					</AnimatePresence>
				</div>
				<input
					type="text"
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					onKeyDown={handleKeyDown}
					onBlur={() => commitDraft(draft)}
					placeholder={placeholder}
					disabled={disabled}
					className="w-full border-0 outline-none text-sm bg-transparent font-medium placeholder-slate-400"
					style={{ color: 'var(--color-primary-900)' }}
				/>
			</div>
		</div>
	);
}

/* ==================== FIELD ROW COMPONENT ==================== */

const FieldRow = React.memo(function FieldRow({
	field,
	index,
	isNew,
	editing,
	t,
	typeOptions,
	formFieldsLength,
	newFieldRef,
	updateFieldProp,
	toggleEditField,
	moveField,
	removeField,
}) {
	const canMoveUp = index > 0;
	const canMoveDown = index < formFieldsLength - 1;

	const [labelDraft, setLabelDraft] = React.useState(field.label || '');

	React.useEffect(() => {
		if (editing) setLabelDraft(field.label || '');
	}, [editing, field.label]);

	const commitDrafts = useCallback(() => {
		const nextLabel = (labelDraft ?? '').toString();
		if (nextLabel !== field.label) {
			updateFieldProp(index, 'label', nextLabel);
			updateFieldProp(index, 'placeholder', nextLabel);
			if (!field.key) updateFieldProp(index, 'key', genKey12());
		}
	}, [labelDraft, field.label, field.key, index, updateFieldProp]);

	const fieldIcon = FIELD_TYPE_OPTIONS.find((opt) => opt.id === field.type)?.icon || '📝';

	return (
		<motion.div
			ref={isNew ? newFieldRef : null}
			initial={{ opacity: 0, y: 16 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.97 }}
			transition={{ type: 'spring', stiffness: 280, damping: 24 }}
			className="group relative"
		>
			<PremiumCard hover={!editing} glow={editing} accent={editing}>
				<div className="p-4">
					{!editing ? (
						<div className="flex items-center justify-between gap-3">
							{/* Left: drag handle visual + icon + info */}
							<div className="flex items-center gap-3 flex-1 min-w-0">
								{/* Order indicator */}
								<div
									className="flex-shrink-0 w-6 h-6 rounded-md grid place-items-center text-xs font-bold"
									style={{
										background: 'var(--color-primary-100)',
										color: 'var(--color-primary-600)',
									}}
								>
									{index + 1}
								</div>

								<div className="text-xl leading-none flex-shrink-0">{fieldIcon}</div>

								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 flex-wrap">
										<MultiLangText className="font-semibold text-slate-900 text-sm truncate">
											{field.label || t('labels.no_label')}
										</MultiLangText>
										<Badge variant="primary">{t(`types_map.${field.type}`)}</Badge>
										{field.required && <Badge variant="warning">⚠️ {t('labels.required')}</Badge>}
									</div>

									<div className="flex items-center gap-2 mt-1">
										<span className="text-xs text-slate-400 font-mono">{field.key}</span>
									</div>

									{(field.type === 'select' || field.type === 'radio' || field.type === 'checklist') &&
										field.options && field.options.length > 0 && (
											<div className="flex flex-wrap gap-1 mt-2">
												{field.options.slice(0, 3).map((opt, i) => (
													<Badge key={i} variant="primary">{opt}</Badge>
												))}
												{field.options.length > 3 && (
													<Badge variant="primary">+{field.options.length - 3}</Badge>
												)}
											</div>
										)}
								</div>
							</div>

							{/* Right: actions */}
							<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
								<PremiumButton title={t('actions.move_up')} onClick={() => moveField(index, -1)} disabled={!canMoveUp} size="sm">
									<FiChevronUp className="w-3.5 h-3.5" />
								</PremiumButton>
								<PremiumButton title={t('actions.move_down')} onClick={() => moveField(index, +1)} disabled={!canMoveDown} size="sm">
									<FiChevronDown className="w-3.5 h-3.5" />
								</PremiumButton>
								<PremiumButton title={t('actions.edit_field')} onClick={() => toggleEditField(index, true)} variant="primary" size="sm">
									<FiEdit2 className="w-3.5 h-3.5" />
								</PremiumButton>
								<PremiumButton title={t('actions.remove_field')} onClick={() => removeField(index)} variant="danger" size="sm">
									<FiTrash2 className="w-3.5 h-3.5" />
								</PremiumButton>
							</div>
						</div>
					) : (
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
							{/* Editing mode header */}
							<div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: 'var(--color-primary-100)' }}>
								<div className="text-xl">{fieldIcon}</div>
								<span className="text-sm font-semibold text-slate-600">{t('editor.editing_field', { default: 'Editing field' })} #{index + 1}</span>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="md:col-span-1">
									<Input
										label={t('editor.label')}
										placeholder={t('editor.placeholders.label')}
										value={labelDraft}
										onChange={(v) => setLabelDraft(v)}
										onBlur={commitDrafts}
									/>
								</div>
								<div className="md:col-span-1">
									<Select
										clearable={false}
										searchable={false}
										label={t('editor.type')}
										value={field.type}
										onChange={(v) => updateFieldProp(index, 'type', v)}
										options={typeOptions}
									/>
								</div>
								<div className="flex items-end pb-2">
									<CheckBox
										label={t('editor.required')}
										initialChecked={!!field.required}
										onChange={(val) => updateFieldProp(index, 'required', !!val)}
									/>
								</div>
							</div>

							{(field.type === 'select' || field.type === 'radio' || field.type === 'checklist') && (
								<InputList
									label={t('editor.options')}
									value={field.options || []}
									onChange={(arr) => updateFieldProp(index, 'options', arr)}
									placeholder={t('editor.placeholders.option')}
								/>
							)}

							<div className="flex justify-end pt-2">
								<motion.button
									type="button"
									onClick={() => {
										commitDrafts();
										toggleEditField(index, false);
									}}
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.97 }}
									className="inline-flex items-center gap-2 h-9 px-5 rounded-lg text-white text-sm font-semibold"
									style={{
										background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
										boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
									}}
								>
									<Check className="w-4 h-4" />
									{t('actions.done')}
								</motion.button>
							</div>
						</motion.div>
					)}
				</div>
			</PremiumCard>
		</motion.div>
	);
});

/* ==================== MAIN COMPONENT ==================== */

export default function FormsManagementPage() {
	const t = useTranslations('forms');
	const user = useUser();

	const [forms, setForms] = useState([]);
	const [query, setQuery] = useState('');
	const [viewMode, setViewMode] = useState('grid');

	const [selectedForm, setSelectedForm] = useState(null);
	const [isLoading, setIsLoading] = useState(true);

	// Modals
	const [showFormModal, setShowFormModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [deletingId, setDeletingId] = useState(null);
	const [isDeleting, setIsDeleting] = useState(false);

	// Form states
	const [formTitle, setFormTitle] = useState('');
	const [formFields, setFormFields] = useState([]);
	const [editingMap, setEditingMap] = useState({});
	const [isEditing, setIsEditing] = useState(false);

	// Refs
	const fieldsContainerRef = useRef(null);
	const newFieldRef = useRef(null);

	const typeOptions = useMemo(() => {
		return FIELD_TYPE_OPTIONS.map((opt) => ({
			id: opt.id,
			label: t(`types_map.${opt.id}`),
		}));
	}, [t]);

	// Fetch forms
	const fetchForms = useCallback(async () => {
		try {
			const res = await api.get('/forms');
			const list = (res?.data?.data || res?.data || []).map((form) => ({
				...form,
				fields: (form.fields || []).map((f) => ({
					...f,
					_uid: f._uid ?? f.id ?? crypto.randomUUID(),
				})),
			}));
			setForms(list);
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

	const deferredQuery = useDeferredValue(query);
	const filtered = useMemo(() => {
		const q = (deferredQuery || '').trim().toLowerCase();
		if (!q) return forms;
		return forms.filter((f) => (f.title || '').toLowerCase().includes(q));
	}, [forms, deferredQuery]);

	const resetFormState = useCallback(() => {
		setFormTitle('');
		setFormFields([]);
		setEditingMap({});
	}, []);

	const scrollToNewField = useCallback(() => {
		if (newFieldRef.current && fieldsContainerRef.current) {
			setTimeout(() => {
				newFieldRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}, 100);
		}
	}, []);

	const openCreateFormModal = useCallback(() => {
		setIsEditing(false);
		setSelectedForm(null);
		setFormTitle('');
		setFormFields([
			{
				_uid: crypto.randomUUID(),
				label: '',
				key: genKey12(),
				type: 'text',
				placeholder: '',
				required: false,
				options: [],
				order: 0,
			},
		]);
		setEditingMap({ 0: true });
		setShowFormModal(true);
	}, []);

	const openEditFormModal = useCallback(
		(form, isEdit) => {
			if (isEdit && form) {
				setIsEditing(true);
				setSelectedForm(form);
				setFormTitle(form?.title || '');
				const normalized = (form?.fields || []).slice().sort((a, b) => (a?.order ?? 1) - (b?.order ?? 1));
				setFormFields(normalized.map((f) => ({ ...f, _uid: f._uid ?? f.id ?? crypto.randomUUID() })));
				setEditingMap({});
			} else {
				openCreateFormModal();
				return;
			}
			setShowFormModal(true);
		},
		[openCreateFormModal]
	);

	const handleDuplicateForm = useCallback(
		(form) => {
			if (!form) return;
			setIsEditing(false);
			setSelectedForm(null);
			const suffix = t('labels.copy_suffix', { default: ' (Copy)' });
			setFormTitle(`${form.title || ''}${suffix}`);
			const cloned = (form.fields || [])
				.slice()
				.sort((a, b) => (a?.order ?? 1) - (b?.order ?? 1))
				.map((f, idx) => {
					const label = f.label || '';
					return {
						_uid: crypto.randomUUID(),
						label,
						key: genKey12(),
						type: f.type,
						placeholder: label,
						required: !!f.required,
						options: f.options || [],
						order: idx,
					};
				});
			setFormFields(cloned);
			setEditingMap({});
			setShowFormModal(true);
		},
		[t]
	);

	const getShareableLink = useCallback(
		(formId) => `${window.location.origin}/form/${formId}/submit?report_to=${user?.id}`,
		[user?.id]
	);

	const copyLink = useCallback(
		(id) => {
			const link = getShareableLink(id);
			navigator.clipboard.writeText(link);
			Notification(t('messages.link_copied'), 'success');
		},
		[getShareableLink, t]
	);

	const [loading, setLoading] = useState(false);

	const createForm = useCallback(async () => {
		const title = (formTitle || '').trim();
		if (!title) { Notification(t('errors.title_required'), 'error'); return; }
		const invalidField = (formFields || []).find((f) => !(f.label || '').trim());
		if (invalidField) { Notification(t('errors.required'), 'error'); return; }
		setLoading(true);
		try {
			const payload = {
				title,
				fields: (formFields || []).map((f, idx) => {
					const label = (f.label || '').trim();
					return { label, key: f.key, placeholder: label, type: f.type, required: !!f.required, options: f.options || [], order: idx + 1 };
				}),
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
			const existing = ordered.filter((f) => !!f.id);
			const newlyAdded = ordered.filter((f) => !f.id);
			await api.patch('/forms', {
				id: selectedForm.id,
				title,
				fields: existing.map((f) => {
					const label = (f.label || '').trim();
					return { id: f.id, label, key: f.key, placeholder: label, type: f.type, required: !!f.required, options: f.options || [], order: f.order };
				}),
			});
			if (newlyAdded.length) {
				await api.post(`/forms/${selectedForm.id}/fields`, {
					fields: newlyAdded.map((f) => {
						const label = (f.label || '').trim();
						return { label, key: f.key, placeholder: label, type: f.type, required: !!f.required, options: f.options || [], order: f.order };
					}),
				});
			}
			if (existing.length) {
				await api.patch('/forms/re-order', { fields: existing.map((f) => ({ id: f.id, order: f.order })) });
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

	const deleteForm = useCallback(
		async (formId) => {
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
		},
		[fetchForms, selectedForm?.id, t]
	);

	const toggleEditField = useCallback((index, on = undefined) => {
		setEditingMap((m) => ({ ...m, [index]: typeof on === 'boolean' ? on : !m[index] }));
	}, []);

	const updateFieldProp = useCallback((index, prop, val) => {
		setFormFields((prev) => prev.map((f, i) => (i === index ? { ...f, [prop]: val } : f)));
	}, []);

	const addInlineField = useCallback(() => {
		setFormFields((prev) => {
			const idx = prev.length;
			return [
				...prev,
				{ _uid: crypto.randomUUID(), label: '', key: genKey12(), type: 'text', placeholder: '', required: false, options: [], order: idx },
			];
		});
		setEditingMap((m) => {
			const idx = formFields.length;
			return { ...m, [idx]: true };
		});
		setTimeout(scrollToNewField, 100);
	}, [formFields.length, scrollToNewField]);

	const removeField = useCallback((index) => {
		setFormFields((prev) => prev.filter((_, i) => i !== index).map((f, i) => ({ ...f, order: i })));
		setEditingMap((m) => {
			const copy = { ...m };
			delete copy[index];
			const newMap = {};
			Object.keys(copy).forEach((oldIndex) => {
				const numIndex = parseInt(oldIndex, 10);
				if (numIndex > index) newMap[numIndex - 1] = copy[oldIndex];
				else if (numIndex < index) newMap[numIndex] = copy[oldIndex];
			});
			return newMap;
		});
	}, []);

	const moveField = useCallback((index, dir) => {
		setFormFields((prev) => {
			const newIndex = index + dir;
			if (newIndex < 0 || newIndex >= prev.length) return prev;
			const clone = prev.slice();
			const tmp = clone[index];
			clone[index] = clone[newIndex];
			clone[newIndex] = tmp;
			return clone.map((f, i) => ({ ...f, order: i }));
		});
		setEditingMap((m) => {
			const newIndex = index + dir;
			const newMap = {};
			Object.keys(m).forEach((k) => {
				const numKey = parseInt(k, 10);
				if (numKey === index) newMap[newIndex] = m[k];
				else if (numKey === newIndex) newMap[index] = m[k];
				else newMap[numKey] = m[k];
			});
			return newMap;
		});
	}, []);

	const selectedFormSortedFields = useMemo(() => {
		const fields = selectedForm?.fields || [];
		return fields.slice().sort((a, b) => (a?.order ?? 1) - (b?.order ?? 1));
	}, [selectedForm?.fields]);

	const isCoachRole = user?.role === 'coach';
	const canEdit = (form) => !form?.adminId || form?.adminId === user?.id;

	return (
		<div className="min-h-screen pb-16">
			<div className="relative">
				<GradientStatsHeader
					onClick={openCreateFormModal}
					btnName={t('header.new')}
					title={t('header.title')}
					desc={t('header.desc')}
					icon={Sparkles}
				/>

				<div className="mt-8">
					{isLoading ? (
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
							<div className="lg:col-span-4">
								<div className="h-[600px] rounded-xl animate-pulse" style={{ background: 'linear-gradient(180deg, #f1f5f9, #e2e8f0)' }} />
							</div>
							<div className="lg:col-span-8">
								<div className="h-[600px] rounded-xl animate-pulse" style={{ background: 'linear-gradient(180deg, #f1f5f9, #e2e8f0)' }} />
							</div>
						</div>
					) : (
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

							{/* ── LEFT SIDEBAR ── */}
							<aside className="lg:col-span-4">
								<div className="sticky top-6">
									<PremiumCard glow accent>
										{/* Sidebar header */}
										<div
											className="px-5 pt-5 pb-4"
											style={{ borderBottom: '1px solid var(--color-primary-100)' }}
										>
											<div className="flex items-center justify-between mb-4">
												<div className="flex items-center gap-3">
													<IconWrapper active size="md">
														<Database className="w-5 h-5" style={{ color: 'white' }} />
													</IconWrapper>
													<div>
														<div className="text-base font-bold text-slate-900 leading-tight">{t('header.title')}</div>
														<div className="text-xs text-slate-500 font-medium mt-0.5">
															{forms.length} {t('labels.forms')}
														</div>
													</div>
												</div>

												{/* Count pill */}
												<div
													className="text-xs font-bold px-2.5 py-1 rounded-full"
													style={{
														background: 'var(--color-primary-100)',
														color: 'var(--color-primary-700)',
													}}
												>
													{filtered.length}/{forms.length}
												</div>
											</div>

											{/* Search */}
											<div className="relative">
												<FiSearch
													className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
													style={{ color: 'var(--color-primary-400)' }}
												/>
												<input
													type="text"
													value={query}
													onChange={(e) => setQuery(e.target.value)}
													placeholder={t('labels.search', { default: 'Search forms…' })}
													className="w-full pl-9 pr-3 h-9 rounded-lg border text-sm font-medium outline-none transition-colors"
													style={{
														borderColor: 'var(--color-primary-200)',
														background: 'white',
														color: 'var(--color-primary-900)',
													}}
													onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary-400)')}
													onBlur={(e) => (e.target.style.borderColor = 'var(--color-primary-200)')}
												/>
											</div>
										</div>

										{/* Forms list */}
										{filtered.length === 0 ? (
											<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10 text-center">
												<IconWrapper size="lg">
													<FiFileText className="w-6 h-6" style={{ color: 'var(--color-primary-500)' }} />
												</IconWrapper>
												<div className="mt-3 font-semibold text-slate-700 text-sm">{t('empty.title')}</div>
												<div className="text-slate-500 text-xs mt-1">{t('empty.subtitle')}</div>
											</motion.div>
										) : (
											<div className="max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200">
												<ul className="p-2.5 space-y-1.5">
													<AnimatePresence mode="popLayout">
														{filtered.map((form, index) => {
															const isActive = selectedForm?.id === form.id;

															return (
																<motion.li
																	key={form.id}
																	initial={{ opacity: 0, x: -12 }}
																	animate={{ opacity: 1, x: 0 }}
																	exit={{ opacity: 0, x: 12 }}
																	transition={{ delay: index * 0.04 }}
																>
																	<div
																		className="rounded-xl border overflow-hidden transition-all group"
																		style={{
																			borderColor: isActive ? 'var(--color-primary-300)' : 'transparent',
																			background: isActive
																				? 'linear-gradient(135deg, var(--color-primary-50), white)'
																				: 'transparent',
																			boxShadow: isActive ? '0 2px 8px rgba(99,102,241,0.1)' : 'none',
																		}}
																	>
																		<motion.button
																			type="button"
																			onClick={() => setSelectedForm(form)}
																			whileHover={{ x: 2 }}
																			className="w-full text-left px-3 py-3"
																		>
																			<div className="flex items-center gap-2.5">
																				<div
																					className="w-8 h-8 rounded-lg grid place-items-center flex-shrink-0 transition-colors"
																					style={{
																						background: isActive
																							? 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))'
																							: 'var(--color-primary-100)',
																					}}
																				>
																					<FiFileText
																						className="w-4 h-4"
																						style={{ color: isActive ? 'white' : 'var(--color-primary-600)' }}
																					/>
																				</div>

																				<div className="min-w-0 flex-1">
																					<MultiLangText
																						className="font-semibold text-sm truncate block"
																						style={{ color: isActive ? 'var(--color-primary-900)' : '#1e293b' }}
																					>
																						{form.title}
																					</MultiLangText>
																					<div className="flex items-center gap-1.5 mt-0.5">
																						<span className="text-xs text-slate-400 font-medium">
																							{form.fields?.length ?? 0} {t('labels.fields')}
																						</span>
																						{form.adminId === user?.id ? (
																							<Badge variant="success">own</Badge>
																						) : (
																							<Badge variant="warning">shared</Badge>
																						)}
																					</div>
																				</div>

																				<ChevronRight
																					className={`rtl:scale-x-[-1] w-4 h-4 flex-shrink-0 transition-all ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`}
																					style={{ color: 'var(--color-primary-500)' }}
																				/>
																			</div>
																		</motion.button>

																		{/* Quick actions — show on hover or active */}
																		<div
																			className={`px-3 pb-2.5 flex items-center justify-between gap-2 transition-all ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
																		>
																			<div className="flex items-center gap-1">
																				<QuickActionIcon tooltip={t('actions.copy_link')} onClick={(e) => { e.stopPropagation(); copyLink(form.id); }} icon={<LinkIcon className="w-3 h-3" />} />
																				<QuickActionIcon tooltip={t('actions.duplicate')} onClick={(e) => { e.stopPropagation(); handleDuplicateForm(form); }} icon={<Files className="w-3 h-3" />} />
																				{canEdit(form) && (
																					<>
																						<QuickActionIcon tooltip={t('actions.edit')} onClick={(e) => { e.stopPropagation(); openEditFormModal(form, true); }} icon={<PencilLine className="w-3 h-3" />} variant="primary" />
																						<QuickActionIcon tooltip={t('actions.delete')} onClick={(e) => { e.stopPropagation(); setDeletingId(form.id); setShowDeleteModal(true); }} icon={<LucideTrash2 className="w-3 h-3" />} variant="danger" />
																					</>
																				)}
																			</div>
																		</div>
																	</div>
																</motion.li>
															);
														})}
													</AnimatePresence>
												</ul>
											</div>
										)}
									</PremiumCard>
								</div>
							</aside>

							{/* ── RIGHT MAIN PANEL ── */}
							<section className="lg:col-span-8">
								{!selectedForm ? (
									<PremiumCard>
										<motion.div
											initial={{ opacity: 0, scale: 0.97 }}
											animate={{ opacity: 1, scale: 1 }}
											className="min-h-[500px] flex items-center justify-center p-12 text-center"
										>
											<div>
												<motion.div
													animate={{ y: [0, -8, 0] }}
													transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
												>
													<IconWrapper size="xl" active>
														<Sparkles className="w-7 h-7 text-white" />
													</IconWrapper>
												</motion.div>
												<div className="mt-5 text-xl font-bold text-slate-800">{t('empty.select_hint')}</div>
												<div className="text-slate-500 text-sm mt-1.5">{t('empty.select_hint_sub')}</div>
											</div>
										</motion.div>
									</PremiumCard>
								) : (
									<PremiumCard glow accent>
										{/* Detail header */}
										<div
											className="px-6 py-5"
											style={{ borderBottom: '1px solid var(--color-primary-100)' }}
										>
											<div className="flex items-start justify-between gap-4 mb-4">
												<div className="flex items-start gap-4 min-w-0 flex-1">
													<IconWrapper active size="lg">
														<FiFileText className="w-6 h-6 text-white" />
													</IconWrapper>
													<div className="min-w-0 flex-1 pt-0.5">
														<MultiLangText
															className="rtl:text-right text-2xl font-bold tracking-tight mb-2 block"
															style={{
																background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
																WebkitBackgroundClip: 'text',
																backgroundClip: 'text',
																WebkitTextFillColor: 'transparent',
															}}
														>
															{selectedForm.title}
														</MultiLangText>
														<div className="flex items-center gap-2 flex-wrap">
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

											{/* Action row */}
											<div className="flex flex-wrap gap-2">
												<TooltipButton tooltip={t('actions.copy_link')} onClick={() => copyLink(selectedForm.id)} variant="ghost">
													<LinkIcon className="w-4 h-4" />
													<span className="hidden sm:inline">{t('actions.copy_link')}</span>
												</TooltipButton>
												<TooltipButton tooltip={t('actions.duplicate')} onClick={() => handleDuplicateForm(selectedForm)} variant="ghost">
													<Files className="w-4 h-4" />
													<span className="hidden sm:inline">{t('actions.duplicate')}</span>
												</TooltipButton>
												{canEdit(selectedForm) && (
													<>
														<TooltipButton tooltip={t('actions.edit')} onClick={() => openEditFormModal(selectedForm, true)} variant="primary">
															<PencilLine className="w-4 h-4" />
															<span className="hidden sm:inline">{t('actions.edit')}</span>
														</TooltipButton>
														<TooltipButton tooltip={t('actions.delete')} onClick={() => { setDeletingId(selectedForm.id); setShowDeleteModal(true); }} variant="danger">
															<LucideTrash2 className="w-4 h-4" />
															<span className="hidden sm:inline">{t('actions.delete')}</span>
														</TooltipButton>
													</>
												)}
											</div>
										</div>

										{/* Fields */}
										<div className="p-6">
											{selectedFormSortedFields.length ? (
												<div className="space-y-2.5 max-h-[calc(100vh-380px)] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200 pr-1">
													<AnimatePresence mode="popLayout">
														{selectedFormSortedFields.map((field) => {
															const fieldIcon = FIELD_TYPE_OPTIONS.find((opt) => opt.id === field.type)?.icon || '📝';
															return (
																<motion.div
																	key={field.id}
																	initial={{ opacity: 0, y: 8 }}
																	animate={{ opacity: 1, y: 0 }}
																	exit={{ opacity: 0, scale: 0.97 }}
																>
																	<div
																		className="rounded-xl border p-4 flex items-start gap-3 transition-colors hover:border-[var(--color-primary-200)]"
																		style={{
																			borderColor: 'var(--color-primary-100)',
																			background: 'rgba(255,255,255,0.8)',
																		}}
																	>
																		{/* Order + icon */}
																		<div className="flex items-center gap-2 flex-shrink-0">
																			<div
																				className="w-5 h-5 rounded-md grid place-items-center text-[10px] font-bold"
																				style={{ background: 'var(--color-primary-100)', color: 'var(--color-primary-600)' }}
																			>
																				{field.order ?? 1}
																			</div>
																			<div className="text-lg leading-none">{fieldIcon}</div>
																		</div>

																		<div className="flex-1 min-w-0">
																			<MultiLangText className="font-semibold text-slate-900 text-sm mb-1.5">
																				{field.label}
																			</MultiLangText>
																			<div className="flex flex-wrap gap-1.5">
																				<Badge variant="primary">{t(`types_map.${field.type}`)}</Badge>
																				{field.required && <Badge variant="warning">⚠️ {t('labels.required')}</Badge>}
																				{(field.type === 'select' || field.type === 'radio' || field.type === 'checklist') &&
																					field.options && field.options.length > 0 && field.options.map((opt, i) => (
																						<Badge key={i} variant="primary">{opt}</Badge>
																					))}
																			</div>
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
													className="rounded-xl border border-dashed p-16 text-center"
													style={{ borderColor: 'var(--color-primary-200)', background: 'var(--color-primary-50)' }}
												>
													<IconWrapper size="xl" active={false}>
														<Layers className="w-7 h-7" style={{ color: 'var(--color-primary-500)' }} />
													</IconWrapper>
													<div className="mt-3 text-slate-600 font-semibold text-sm">{t('empty.no_fields')}</div>
												</motion.div>
											)}
										</div>
									</PremiumCard>
								)}
							</section>
						</div>
					)}
				</div>
			</div>

			{/* ── DELETE MODAL ── */}
			<Modal
				open={showDeleteModal}
				onClose={() => { if (!isDeleting) { setShowDeleteModal(false); setDeletingId(null); } }}
				title={t('delete.title')}
				maxW="max-w-md"
			>
				<div className="space-y-5 pt-2">
					<div
						className="flex items-start gap-4 p-4 rounded-xl border"
						style={{ borderColor: '#fecaca', background: '#fef2f2' }}
					>
						<IconWrapper variant="danger" size="md">
							<AlertCircle className="w-5 h-5 text-rose-600" />
						</IconWrapper>
						<p className="text-slate-700 text-sm leading-relaxed flex-1">{t('delete.message')}</p>
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

			{/* ── CREATE / EDIT MODAL ── */}
			<Modal
				open={showFormModal}
				onClose={() => setShowFormModal(false)}
				title={isEditing ? t('edit.title') : t('create.title')}
				maxW="max-w-5xl"
			>
				<form
					className="space-y-5 pt-4"
					onSubmit={(e) => { e.preventDefault(); (isEditing ? updateForm : createForm)(); }}
				>
					{/* Title */}
					<div
						className="rounded-xl border p-4"
						style={{ borderColor: 'var(--color-primary-200)', background: 'var(--color-primary-50)' }}
					>
						<Input
							placeholder={t('editor.placeholders.form_title')}
							value={formTitle}
							onChange={setFormTitle}
							className="max-w-full"
						/>
					</div>

					{/* Fields section */}
					<div>
						<div className="flex items-center justify-between mb-3">
							<div className="flex items-center gap-2.5">
								<IconWrapper active size="sm">
									<Layers className="w-4 h-4 text-white" />
								</IconWrapper>
								<h3 className="font-bold text-slate-900 text-base">{t('editor.fields')}</h3>
								<div
									className="text-xs font-bold px-2 py-0.5 rounded-full"
									style={{ background: 'var(--color-primary-100)', color: 'var(--color-primary-700)' }}
								>
									{formFields.length}
								</div>
							</div>

							<motion.button
								type="button"
								onClick={addInlineField}
								whileHover={{ scale: 1.03 }}
								whileTap={{ scale: 0.97 }}
								className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-white text-sm font-semibold"
								style={{
									background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
									boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
								}}
							>
								<FiPlus className="w-4 h-4" />
								{t('editor.add_field')}
							</motion.button>
						</div>

						{formFields.length ? (
							<div
								ref={fieldsContainerRef}
								className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200"
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
								className="rounded-xl border border-dashed p-12 text-center"
								style={{ borderColor: 'var(--color-primary-200)', background: 'var(--color-primary-50)' }}
							>
								<IconWrapper size="xl">
									<Layers className="w-7 h-7" style={{ color: 'var(--color-primary-500)' }} />
								</IconWrapper>
								<div className="mt-3 text-slate-600 font-semibold text-sm">{t('empty.no_fields')}</div>
							</motion.div>
						)}
					</div>

					{/* Footer */}
					<div
						className="flex justify-end gap-2.5 pt-4 border-t"
						style={{ borderColor: 'var(--color-primary-100)' }}
					>
						<motion.button
							type="button"
							onClick={() => setShowFormModal(false)}
							whileHover={{ scale: 1.01 }}
							whileTap={{ scale: 0.98 }}
							className="inline-flex items-center h-10 px-5 rounded-lg border text-sm font-semibold text-slate-700"
							style={{ borderColor: 'var(--color-primary-200)', background: 'white' }}
						>
							{t('actions.cancel')}
						</motion.button>

						<motion.button
							type="submit"
							disabled={loading}
							whileHover={{ scale: loading ? 1 : 1.02 }}
							whileTap={{ scale: loading ? 1 : 0.97 }}
							className="inline-flex items-center gap-2 h-10 px-6 rounded-lg text-white text-sm font-semibold"
							style={{
								background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
								boxShadow: '0 4px 16px rgba(99, 102, 241, 0.35)',
								opacity: loading ? 0.75 : 1,
								cursor: loading ? 'not-allowed' : 'pointer',
							}}
						>
							{loading ? (
								<motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
									<Zap className="w-4 h-4" />
								</motion.div>
							) : (
								<>
									{isEditing ? <FiEdit2 className="w-4 h-4" /> : <FiPlus className="w-4 h-4" />}
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