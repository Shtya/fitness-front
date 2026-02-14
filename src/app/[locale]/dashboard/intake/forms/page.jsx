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

function PremiumCard({ children, className = '', hover = true, glow = false }) {
	return (
		<motion.div
			whileHover={hover ? { y: -2 } : {}}
			transition={{ type: 'spring', stiffness: 400, damping: 30 }}
			className={`relative rounded-2xl border backdrop-blur-xl ${className}`}
			style={{
				background: 'rgba(255, 255, 255, 0.95)',
				borderColor: 'var(--color-primary-200)',
				boxShadow: glow
					? '0 20px 60px rgba(99, 102, 241, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.8) inset'
					: '0 8px 32px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.8) inset',
			}}
		>
			{children}
		</motion.div>
	);
}

function IconWrapper({ children, active = false, size = 'md', variant = 'primary' }) {
	const sizes = {
		sm: 'w-8 h-8',
		md: 'w-10 h-10',
		lg: 'w-12 h-12',
		xl: 'w-16 h-16',
	};

	const variants = {
		primary: active
			? 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))'
			: 'linear-gradient(135deg, var(--color-primary-50), var(--color-primary-100))',
		danger: 'linear-gradient(135deg, #fee2e2, #fecaca)',
		success: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
		warning: 'linear-gradient(135deg, #fef3c7, #fde68a)',
	};

	return (
		<motion.div
			whileHover={{ scale: 1.1, rotate: 5 }}
			transition={{ type: 'spring', stiffness: 400 }}
			className={`grid place-items-center rounded-xl ${sizes[size]}`}
			style={{
				background: variants[variant],
				boxShadow: active ? '0 8px 24px rgba(99, 102, 241, 0.25)' : '0 4px 12px rgba(15, 23, 42, 0.08)',
			}}
		>
			{children}
		</motion.div>
	);
}

function PremiumButton({ title, onClick, children, variant = 'ghost', disabled = false, size = 'md' }) {
	const sizes = {
		sm: 'h-8 w-8 text-xs',
		md: 'h-10 w-10 text-sm',
		lg: 'h-12 w-12 text-base',
	};

	const variants = {
		ghost: {
			bg: 'rgba(255, 255, 255, 0.9)',
			border: 'var(--color-primary-200)',
			color: 'var(--color-primary-700)',
			shadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
		},
		primary: {
			bg: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
			border: 'transparent',
			color: 'white',
			shadow: '0 8px 20px rgba(99, 102, 241, 0.3)',
		},
		danger: {
			bg: 'linear-gradient(135deg, #fee2e2, #fca5a5)',
			border: 'transparent',
			color: '#991b1b',
			shadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
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
			whileHover={{ scale: disabled ? 1 : 1.08, y: disabled ? 0 : -2 }}
			whileTap={{ scale: disabled ? 1 : 0.95 }}
			className={`inline-flex items-center justify-center rounded-xl border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${sizes[size]}`}
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
			bg: 'linear-gradient(135deg, var(--color-primary-50), var(--color-primary-100))',
			border: 'var(--color-primary-300)',
			text: 'var(--color-primary-800)',
		},
		warning: {
			bg: 'linear-gradient(135deg, #fef3c7, #fde68a)',
			border: '#f59e0b',
			text: '#92400e',
		},
		success: {
			bg: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
			border: '#22c55e',
			text: '#166534',
		},
		danger: {
			bg: 'linear-gradient(135deg, #fee2e2, #fecaca)',
			border: '#ef4444',
			text: '#991b1b',
		},
	};

	const style = variants[variant] || variants.primary;

	return (
		<span
			className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold"
			style={{
				background: style.bg,
				borderColor: style.border,
				color: style.text,
			}}
		>
			{icon && <span className="text-sm">{icon}</span>}
			{children}
		</span>
	);
}

function OptionTag({ label, onRemove, disabled = false }) {
	return (
		<motion.span
			initial={{ scale: 0, opacity: 0 }}
			animate={{ scale: 1, opacity: 1 }}
			exit={{ scale: 0, opacity: 0 }}
			transition={{ type: 'spring', stiffness: 300 }}
			className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold"
			style={{
				borderColor: 'var(--color-primary-300)',
				background: 'linear-gradient(135deg, var(--color-primary-50), white)',
				color: 'var(--color-primary-800)',
			}}
		>
			{label}
			{!disabled && (
				<motion.button
					type="button"
					onClick={onRemove}
					whileHover={{ scale: 1.3, rotate: 90 }}
					whileTap={{ scale: 0.9 }}
					className="rounded-full p-0.5"
					style={{ color: 'var(--color-primary-700)' }}
				>
					<FiX className="w-3.5 h-3.5" />
				</motion.button>
			)}
		</motion.span>
	);
}

function TooltipButton({ tooltip, onClick, children, variant = 'ghost', disabled = false }) {
	const [showTooltip, setShowTooltip] = useState(false);

	const variants = {
		ghost: {
			bg: 'rgba(255, 255, 255, 0.9)',
			border: 'var(--color-primary-200)',
			color: 'var(--color-primary-700)',
			shadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
		},
		primary: {
			bg: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
			border: 'transparent',
			color: 'white',
			shadow: '0 8px 20px rgba(99, 102, 241, 0.3)',
		},
		danger: {
			bg: 'linear-gradient(135deg, #fee2e2, #fca5a5)',
			border: 'transparent',
			color: '#991b1b',
			shadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
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
				whileHover={{ scale: disabled ? 1 : 1.02, y: disabled ? 0 : -2 }}
				whileTap={{ scale: disabled ? 1 : 0.98 }}
				className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
						initial={{ opacity: 0, y: 5 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 5 }}
						transition={{ duration: 0.15 }}
						className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap pointer-events-none z-50"
						style={{
							background: 'linear-gradient(135deg, #1e293b, #334155)',
							color: 'white',
							boxShadow: '0 8px 24px rgba(15, 23, 42, 0.4)',
						}}
					>
						{tooltip}
						<div
							className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 rotate-45"
							style={{
								background: '#334155',
								marginTop: '-4px',
							}}
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
		ghost: {
			bg: 'rgba(255, 255, 255, 0.95)',
			border: 'var(--color-primary-200)',
			color: 'var(--color-primary-700)',
		},
		primary: {
			bg: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
			border: 'transparent',
			color: 'white',
		},
		danger: {
			bg: 'linear-gradient(135deg, #fee2e2, #fca5a5)',
			border: 'transparent',
			color: '#991b1b',
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
				whileHover={{ scale: disabled ? 1 : 1.1 }}
				whileTap={{ scale: disabled ? 1 : 0.95 }}
				className="inline-flex items-center justify-center w-7 h-7 rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
				style={{
					background: style.bg,
					borderColor: style.border,
					color: style.color,
					boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
				}}
			>
				{icon}
			</motion.button>

			<AnimatePresence>
				{showTooltip && !disabled && (
					<motion.div
						initial={{ opacity: 0, y: 5 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 5 }}
						transition={{ duration: 0.15 }}
						className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap pointer-events-none z-50"
						style={{
							background: 'linear-gradient(135deg, #1e293b, #334155)',
							color: 'white',
							boxShadow: '0 8px 24px rgba(15, 23, 42, 0.4)',
						}}
					>
						{tooltip}
						<div
							className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 rotate-45"
							style={{
								background: '#334155',
								marginTop: '-4px',
							}}
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

			const parts = raw
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);

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
			{label && <div className="text-sm font-bold text-slate-800 mb-2">{label}</div>}

			<div
				className="rounded-xl border p-3"
				style={{
					borderColor: 'var(--color-primary-200)',
					background: 'rgba(255, 255, 255, 0.95)',
					boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
				}}
			>
				<div className="flex flex-wrap gap-2 mb-2">
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
					className="w-full border-0 outline-none text-sm bg-transparent font-medium"
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
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.95 }}
			transition={{ type: 'spring', stiffness: 200, damping: 20 }}
			className="group relative"
		>
			<PremiumCard hover={!editing} glow={editing}>
				{editing && (
					<div
						className="absolute left-0 right-0 top-0 h-1 rounded-t-2xl"
						style={{
							background: 'linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-via), var(--color-gradient-to))',
						}}
					/>
				)}

				<div className="p-5">
					{!editing ? (
						<div className="flex items-start justify-between gap-4">
							<div className="flex items-start gap-3 flex-1 min-w-0">
								<div className="text-2xl mt-1">{fieldIcon}</div>

								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 flex-wrap mb-3">
										<MultiLangText className="font-bold text-slate-900 text-base">
											{field.label || t('labels.no_label')}
										</MultiLangText>
										<Badge variant="primary">{t(`types_map.${field.type}`)}</Badge>
										{field.required && <Badge variant="warning" icon="⚠️">{t('labels.required')}</Badge>}
									</div>

									<div className="flex flex-wrap items-center gap-2 mb-3">
										<Badge variant="primary" icon="🔑">
											{field.key}
										</Badge>
										<Badge variant="primary" icon="📊">
											{t('labels.order')}: {field.order ?? 1}
										</Badge>
									</div>

									{(field.type === 'select' || field.type === 'radio' || field.type === 'checklist') &&
										field.options &&
										field.options.length > 0 && (
											<div className="flex flex-wrap gap-2">
												{field.options.slice(0, 4).map((opt, i) => (
													<Badge key={i} variant="primary">
														{opt}
													</Badge>
												))}
												{field.options.length > 4 && (
													<Badge variant="primary">+{field.options.length - 4} more</Badge>
												)}
											</div>
										)}
								</div>
							</div>

							<div className="flex items-center gap-1.5">
								<PremiumButton
									title={t('actions.move_up')}
									onClick={() => moveField(index, -1)}
									disabled={!canMoveUp}
									size="sm"
								>
									<FiChevronUp className="w-4 h-4" />
								</PremiumButton>

								<PremiumButton
									title={t('actions.move_down')}
									onClick={() => moveField(index, +1)}
									disabled={!canMoveDown}
									size="sm"
								>
									<FiChevronDown className="w-4 h-4" />
								</PremiumButton>

								<PremiumButton
									title={t('actions.edit_field')}
									onClick={() => toggleEditField(index, true)}
									variant="primary"
									size="sm"
								>
									<FiEdit2 className="w-4 h-4" />
								</PremiumButton>

								<PremiumButton title={t('actions.remove_field')} onClick={() => removeField(index)} variant="danger" size="sm">
									<FiTrash2 className="w-4 h-4" />
								</PremiumButton>
							</div>
						</div>
					) : (
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pt-2">
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

							<div className="flex justify-end pt-4">
								<motion.button
									type="button"
									onClick={() => {
										commitDrafts();
										toggleEditField(index, false);
									}}
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
									className="inline-flex items-center gap-2 h-11 px-6 rounded-xl text-white font-bold"
									style={{
										background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
										boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
									}}
								>
									<Check className="w-5 h-5" />
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
	const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

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
				newFieldRef.current?.scrollIntoView({
					behavior: 'smooth',
					block: 'center',
				});
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

				setFormFields(
					normalized.map((f) => ({
						...f,
						_uid: f._uid ?? f.id ?? crypto.randomUUID(),
					}))
				);
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
		if (!title) {
			Notification(t('errors.title_required'), 'error');
			return;
		}

		const invalidField = (formFields || []).find((f) => !(f.label || '').trim());
		if (invalidField) {
			Notification(t('errors.required'), 'error');
			return;
		}

		setLoading(true);
		try {
			const payload = {
				title,
				fields: (formFields || []).map((f, idx) => {
					const label = (f.label || '').trim();
					return {
						label,
						key: f.key,
						placeholder: label,
						type: f.type,
						required: !!f.required,
						options: f.options || [],
						order: idx + 1,
					};
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
		if (!title) {
			Notification(t('errors.title_required'), 'error');
			return;
		}

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
					return {
						id: f.id,
						label,
						key: f.key,
						placeholder: label,
						type: f.type,
						required: !!f.required,
						options: f.options || [],
						order: f.order,
					};
				}),
			});

			if (newlyAdded.length) {
				await api.post(`/forms/${selectedForm.id}/fields`, {
					fields: newlyAdded.map((f) => {
						const label = (f.label || '').trim();
						return {
							label,
							key: f.key,
							placeholder: label,
							type: f.type,
							required: !!f.required,
							options: f.options || [],
							order: f.order,
						};
					}),
				});
			}

			if (existing.length) {
				await api.patch('/forms/re-order', {
					fields: existing.map((f) => ({ id: f.id, order: f.order })),
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
		setEditingMap((m) => ({
			...m,
			[index]: typeof on === 'boolean' ? on : !m[index],
		}));
	}, []);

	const updateFieldProp = useCallback((index, prop, val) => {
		setFormFields((prev) => prev.map((f, i) => (i === index ? { ...f, [prop]: val } : f)));
	}, []);

	const addInlineField = useCallback(() => {
		setFormFields((prev) => {
			const idx = prev.length;
			const next = [
				...prev,
				{
					_uid: crypto.randomUUID(),
					label: '',
					key: genKey12(),
					type: 'text',
					placeholder: '',
					required: false,
					options: [],
					order: idx,
				},
			];
			return next;
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
		<div
			className="min-h-screen pb-16"
			 
		>
			<div className="relative">
				<GradientStatsHeader
					onClick={openCreateFormModal}
					btnName={t('header.new')}
					title={t('header.title')}
					desc={t('header.desc')}
					icon={Sparkles}
				/>

				<div className="  mt-8">
					{isLoading ? (
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
							{/* Left skeleton */}
							<div className="lg:col-span-4">
								<div className="h-[600px] rounded-2xl animate-pulse" style={{ background: 'linear-gradient(135deg, #e2e8f0, #f1f5f9)' }} />
							</div>
							{/* Right skeleton */}
							<div className="lg:col-span-8">
								<div className="h-[600px] rounded-2xl animate-pulse" style={{ background: 'linear-gradient(135deg, #e2e8f0, #f1f5f9)' }} />
							</div>
						</div>
					) : (
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
							{/* LEFT SIDEBAR - Forms List */}
							<aside className="lg:col-span-4">
								<div className="sticky top-6">
									<PremiumCard glow>
										{/* Header */}
										<div
											className="p-5 border-b rounded-t-2xl"
											style={{
												borderColor: 'var(--color-primary-200)',
												background: 'linear-gradient(135deg, rgba(255,255,255,0.95), var(--color-primary-50))',
											}}
										>
											<div className="flex items-center gap-3 mb-4">
												<IconWrapper active size="md">
													<Database className="w-6 h-6 text-white" />
												</IconWrapper>
												<div>
													<div className="text-xl font-black text-slate-900">{t('header.title')}</div>
													<div className="text-sm text-slate-500 font-medium">
														{forms.length} {t('labels.forms')}
													</div>
												</div>
											</div>

										</div>

										{/* Forms List */}
										{filtered.length === 0 ? (
											<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10 text-center">
												<IconWrapper size="lg">
													<FiFileText className="w-8 h-8" style={{ color: 'var(--color-primary-700)' }} />
												</IconWrapper>
												<div className="mt-4 font-black text-slate-900 text-base">{t('empty.title')}</div>
												<div className="text-slate-600 text-sm mt-1">{t('empty.subtitle')}</div>
											</motion.div>
										) : (
											<div className="max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300">
												<ul className="p-3 space-y-2">
													<AnimatePresence mode="popLayout">
														{filtered.map((form, index) => {
															const isActive = selectedForm?.id === form.id;

															return (
																<motion.li
																	key={form.id}
																	initial={{ opacity: 0, x: -20 }}
																	animate={{ opacity: 1, x: 0 }}
																	exit={{ opacity: 0, x: 20 }}
																	transition={{ delay: index * 0.05 }}
																>
																	<div
																		className="w-full text-left rounded-xl border transition-all group relative"
																		style={{
																			borderColor: isActive ? 'var(--color-primary-400)' : 'var(--color-primary-200)',
																			background: isActive
																				? 'linear-gradient(135deg, var(--color-primary-50), rgba(255,255,255,0.95))'
																				: 'rgba(255,255,255,0.9)',
																			boxShadow: isActive ? '0 12px 35px rgba(15,23,42,0.12)' : '0 6px 20px rgba(15,23,42,0.06)',
																		}}
																	>
																		<motion.button
																			type="button"
																			onClick={() => setSelectedForm(form)}
																			whileHover={{ scale: 1.01 }}
																			whileTap={{ scale: 0.99 }}
																			className="w-full text-left p-4"
																		>
																			<div className="flex items-start gap-3 mb-3">
																				<IconWrapper active={isActive} size="sm">
																					<FiFileText
																						className="w-4 h-4"
																						style={{ color: isActive ? 'white' : 'var(--color-primary-800)' }}
																					/>
																				</IconWrapper>

																				<div className="min-w-0 flex-1">
																					<MultiLangText
																						className="rtl:text-right font-black text-base truncate block mb-1"
																						style={{ color: isActive ? 'var(--color-primary-900)' : '#0f172a' }}
																					>
																						{form.title}
																					</MultiLangText>

																					<div className="flex items-center gap-2 text-xs text-slate-600">
																						<Layers className="w-3 h-3" style={{ color: 'var(--color-primary-600)' }} />
																						<span className="font-bold">{form.fields?.length ?? 0}</span>
																						<span>{t('labels.fields')}</span>
																					</div>
																				</div>

																				<ChevronRight
																					className={` rtl:scale-x-[-1] w-5 h-5 transition-transform ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
																					style={{ color: 'var(--color-primary-600)' }}
																				/>
																			</div>
																		</motion.button>

																		{/* Quick Actions */}
																		<div className=' px-2 pb-2 flex items-center justify-between gap-2 ' >
																			<div className="px-4  flex items-center gap-1.5 ">
																				<QuickActionIcon
																					tooltip={t('actions.copy_link')}
																					onClick={(e) => {
																						e.stopPropagation();
																						copyLink(form.id);
																					}}
																					icon={<LinkIcon className="w-3.5 h-3.5" />}
																				/>

																				<QuickActionIcon
																					tooltip={t('actions.duplicate')}
																					onClick={(e) => {
																						e.stopPropagation();
																						handleDuplicateForm(form);
																					}}
																					icon={<Files className="w-3.5 h-3.5" />}
																				/>

																				{canEdit(form) && (
																					<>
																						<QuickActionIcon
																							tooltip={t('actions.edit')}
																							onClick={(e) => {
																								e.stopPropagation();
																								openEditFormModal(form, true);
																							}}
																							icon={<PencilLine className="w-3.5 h-3.5" />}
																							variant="primary"
																						/>

																						<QuickActionIcon
																							tooltip={t('actions.delete')}
																							onClick={(e) => {
																								e.stopPropagation();
																								setDeletingId(form.id);
																								setShowDeleteModal(true);
																							}}
																							icon={<LucideTrash2 className="w-3.5 h-3.5" />}
																							variant="danger"
																						/>
																					</>
																				)}
																			</div>

																			{form.adminId === user?.id ? (
																				<Badge variant="success" icon="✓">
																					{t('labels.own')}
																				</Badge>
																			) : (
																				<Badge variant="warning" icon="👤">
																					{t('labels.shared')}
																				</Badge>
																			)}
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

							{/* RIGHT SIDE - Selected Form Details */}
							<section className="lg:col-span-8">
								{!selectedForm ? (
									<PremiumCard>
										<motion.div
											initial={{ opacity: 0, scale: 0.95 }}
											animate={{ opacity: 1, scale: 1 }}
											className="min-h-[500px] flex items-center justify-center p-12 text-center"
										>
											<div>
												<motion.div
													animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
													transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
												>
													<IconWrapper size="xl">
														<Sparkles className="w-10 h-10" style={{ color: 'var(--color-primary-700)' }} />
													</IconWrapper>
												</motion.div>
												<div className="mt-6 text-2xl font-black text-slate-900">
													{t('empty.select_hint')}
												</div>
												<div className="text-slate-600 mt-2">
													{t('empty.select_hint_sub')}
												</div>
											</div>
										</motion.div>
									</PremiumCard>
								) : (
									<PremiumCard glow>
										{/* Header */}
										<div
											className="p-6 border-b rounded-t-2xl"
											style={{
												borderColor: 'var(--color-primary-200)',
												background: 'linear-gradient(135deg, var(--color-primary-50), rgba(255, 255, 255, 0.95))',
											}}
										>
											<div className="flex items-start justify-between gap-4 mb-4">
												<div className="flex items-center gap-4 min-w-0 flex-1">
													<IconWrapper active size="lg">
														<FiFileText className="w-8 h-8 text-white" />
													</IconWrapper>

													<div className="min-w-0 flex-1">
														<div
															className="rtl:text-right w-fit text-3xl font-black mb-3"
															style={{
																background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
																WebkitBackgroundClip: 'text',
																backgroundClip: 'text',
																WebkitTextFillColor: 'transparent',
															}}
														>
															{selectedForm.title}
														</div>

														<div className="flex items-center gap-3 flex-wrap">
															<Badge variant="primary" icon="📊">
																{selectedForm.fields?.length || 0} {t('labels.fields')}
															</Badge>
															{isCoachRole && selectedForm.adminId && selectedForm.adminId !== user?.id && (
																<Badge variant="warning" icon="👤">
																	{t('labels.shared_form')}
																</Badge>
															)}
														</div>
													</div>
												</div>
											</div>

											{/* Action Buttons */}
											<div className="flex flex-wrap gap-2">
												<TooltipButton
													tooltip={t('actions.copy_link')}
													onClick={() => copyLink(selectedForm.id)}
													variant="ghost"
												>
													<LinkIcon className="w-4 h-4" />
													<span className="hidden sm:inline text-sm">{t('actions.copy_link')}</span>
												</TooltipButton>

												<TooltipButton
													tooltip={t('actions.duplicate')}
													onClick={() => handleDuplicateForm(selectedForm)}
													variant="ghost"
												>
													<Files className="w-4 h-4" />
													<span className="hidden sm:inline text-sm">{t('actions.duplicate')}</span>
												</TooltipButton>

												{canEdit(selectedForm) && (
													<>
														<TooltipButton
															tooltip={t('actions.edit')}
															onClick={() => openEditFormModal(selectedForm, true)}
															variant="primary"
														>
															<PencilLine className="w-4 h-4" />
															<span className="hidden sm:inline text-sm">{t('actions.edit')}</span>
														</TooltipButton>

														<TooltipButton
															tooltip={t('actions.delete')}
															onClick={() => {
																setDeletingId(selectedForm.id);
																setShowDeleteModal(true);
															}}
															variant="danger"
														>
															<LucideTrash2 className="w-4 h-4" />
															<span className="hidden sm:inline text-sm">{t('actions.delete')}</span>
														</TooltipButton>
													</>
												)}
											</div>
										</div>

										{/* Fields Grid */}
										<div className="p-6">
											{selectedFormSortedFields.length ? (
												<div className="space-y-3 max-h-[calc(100vh-380px)] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300 pr-2">
													<AnimatePresence mode="popLayout">
														{selectedFormSortedFields.map((field) => {
															const fieldIcon = FIELD_TYPE_OPTIONS.find((opt) => opt.id === field.type)?.icon || '📝';

															return (
																<motion.div
																	key={field.id}
																	initial={{ opacity: 0, scale: 0.95 }}
																	animate={{ opacity: 1, scale: 1 }}
																	exit={{ opacity: 0, scale: 0.9 }}
																>
																	<PremiumCard hover>
																		<div className="p-5">
																			<div className="flex items-start gap-3">
																				<div className="text-2xl">{fieldIcon}</div>
																				<div className="flex-1 min-w-0">
																					<MultiLangText className="font-bold text-slate-900 text-base mb-2">
																						{field.label}
																					</MultiLangText>
																					<div className="flex flex-wrap gap-2 mb-3">
																						<Badge variant="primary">{t(`types_map.${field.type}`)}</Badge>
																						{field.required && <Badge variant="warning" icon="⚠️">{t('labels.required')}</Badge>}
																						<Badge variant="primary" icon="📊">
																							{t('labels.order')}: {field.order ?? 1}
																						</Badge>
																					</div>

																					{(field.type === 'select' || field.type === 'radio' || field.type === 'checklist') &&
																						field.options &&
																						field.options.length > 0 && (
																							<div className="flex flex-wrap gap-2 pt-3 border-t" style={{ borderColor: 'var(--color-primary-100)' }}>
																								{field.options.map((opt, i) => (
																									<Badge key={i} variant="primary">
																										{opt}
																									</Badge>
																								))}
																							</div>
																						)}
																				</div>
																			</div>
																		</div>
																	</PremiumCard>
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
													style={{
														borderColor: 'var(--color-primary-300)',
														background: 'rgba(255, 255, 255, 0.7)',
													}}
												>
													<IconWrapper size="xl">
														<Layers className="w-10 h-10" style={{ color: 'var(--color-primary-700)' }} />
													</IconWrapper>
													<div className="mt-4 text-slate-700 font-bold text-lg">{t('empty.no_fields')}</div>
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

			{/* Delete Modal */}
			<Modal
				open={showDeleteModal}
				onClose={() => {
					if (!isDeleting) {
						setShowDeleteModal(false);
						setDeletingId(null);
					}
				}}
				title={t('delete.title')}
				maxW="max-w-md"
			>
				<div className="space-y-6 pt-2">
					<PremiumCard>
						<div className="p-5 flex items-start gap-4">
							<IconWrapper variant="danger" size="md">
								<AlertCircle className="w-6 h-6 text-rose-600" />
							</IconWrapper>
							<p className="text-slate-700 leading-relaxed flex-1">{t('delete.message')}</p>
						</div>
					</PremiumCard>

					<div className="flex justify-end gap-3">
						<Button
							name={t('actions.cancel')}
							className="!w-fit"
							onClick={() => {
								if (!isDeleting) {
									setShowDeleteModal(false);
									setDeletingId(null);
								}
							}}
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

			{/* Create/Edit Form Modal */}
			<Modal open={showFormModal} onClose={() => setShowFormModal(false)} title={isEditing ? t('edit.title') : t('create.title')} maxW="max-w-5xl">
				<form
					className="space-y-6 pt-4"
					onSubmit={(e) => {
						e.preventDefault();
						(isEditing ? updateForm : createForm)();
					}}
				>
					<PremiumCard>
						<div className="p-5">
							<Input placeholder={t('editor.placeholders.form_title')} value={formTitle} onChange={setFormTitle} className="max-w-full" />
						</div>
					</PremiumCard>

					<div>
						<div className="flex items-center justify-between mb-4">
							<h3 className="font-black text-slate-900 text-2xl flex items-center gap-3">
								<IconWrapper active size="md">
									<Layers className="w-6 h-6 text-white" />
								</IconWrapper>
								{t('editor.fields')}
							</h3>

							<motion.button
								type="button"
								onClick={addInlineField}
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								className="inline-flex items-center gap-2 h-12 px-6 rounded-xl text-white font-bold"
								style={{
									background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
									boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
								}}
							>
								<FiPlus className="w-5 h-5" />
								<span>{t('editor.add_field')}</span>
							</motion.button>
						</div>

						{formFields.length ? (
							<div ref={fieldsContainerRef} className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300">
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
								className="rounded-xl border border-dashed p-16 text-center"
								style={{
									borderColor: 'var(--color-primary-300)',
									background: 'rgba(255, 255, 255, 0.7)',
								}}
							>
								<IconWrapper size="xl">
									<Layers className="w-8 h-8" style={{ color: 'var(--color-primary-700)' }} />
								</IconWrapper>
								<div className="mt-4 text-slate-700 font-bold text-lg">{t('empty.no_fields')}</div>
							</motion.div>
						)}
					</div>

					<div className="flex justify-end gap-3 pt-6 border-t-2" style={{ borderColor: 'var(--color-primary-200)' }}>
						<motion.button
							type="button"
							onClick={() => setShowFormModal(false)}
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							className="inline-flex items-center h-12 px-6 rounded-xl border bg-white text-slate-700 font-bold"
							style={{
								borderColor: 'var(--color-primary-200)',
								boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
							}}
						>
							{t('actions.cancel')}
						</motion.button>

						<motion.button
							type="submit"
							disabled={loading}
							whileHover={{ scale: loading ? 1 : 1.02 }}
							whileTap={{ scale: loading ? 1 : 0.98 }}
							className="inline-flex items-center gap-2 h-12 px-8 rounded-xl text-white font-bold"
							style={{
								background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))',
								boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
								opacity: loading ? 0.7 : 1,
								cursor: loading ? 'not-allowed' : 'pointer',
							}}
						>
							{loading ? (
								<motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
									<Zap className="w-5 h-5" />
								</motion.div>
							) : (
								<>
									{isEditing ? <FiEdit2 className="w-5 h-5" /> : <FiPlus className="w-5 h-5" />}
									<span>{isEditing ? t('edit.cta') : t('create.cta')}</span>
								</>
							)}
						</motion.button>
					</div>
				</form>
			</Modal>
		</div>
	);
}