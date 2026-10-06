'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
	AlertCircle, AlignLeft, Camera, Check, ChevronDown, Dumbbell, EyeOff, FileText, FolderPlus, Hash, List, Lock, PencilLine, Plus,
	RotateCcw, Ruler, Star, ToggleRight, Trash2, Type, Utensils, X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import Button from '@/components/atoms/Button';
import FloatingInput from '@/components/atoms/FloatingInput';
import FloatingSelect from '@/components/atoms/FloatingSelect';
import Badge from '@/components/atoms/GmBadge';
import { GmCheck, GmSwitch } from '@/components/atoms/GmFormParts';
import { ConfirmRemove, DragHandle, ICON_BTN, RemoveButton, SortableList, useSortableRow } from '@/components/atoms/GmSortable';
import { Modal } from '@/components/dashboard/ui/UI';
import { BUILTIN_FIELD_KEYS, BUILTIN_FIELD_LABEL_KEYS, FIELD_TYPES, isBuiltinGroup, newCustomField } from './reportConfigModel';

const SECTION_ICONS = { diet: Utensils, training: Dumbbell, measurements: Ruler, photos: Camera };
const TYPE_ICONS = { boolean: ToggleRight, text: Type, number: Hash, textarea: AlignLeft, select: List, rating: Star };
const GRADIENT = { background: 'linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))' };
const PRIMARY_HOVER = 'hover:bg-[color-mix(in_srgb,var(--color-primary-100)_60%,transparent)] hover:text-(--color-primary-600)';

/* ─────────────────────────── Options editor ─────────────────────────── */
function OptionsEditor({ label, placeholder, value, onChange }) {
	const [draft, setDraft] = useState('');
	const items = Array.isArray(value) ? value : [];

	const commit = text => {
		const parts = String(text ?? '').split(',').map(s => s.trim()).filter(Boolean);
		if (!parts.length) return;
		onChange([...items, ...parts.filter(p => !items.includes(p))]);
		setDraft('');
	};

	const onKeyDown = e => {
		if ((e.key === 'Enter' || e.key === ',') && !e.nativeEvent.isComposing) {
			e.preventDefault();
			commit(draft);
		} else if (e.key === 'Backspace' && !draft && items.length) {
			e.preventDefault();
			onChange(items.slice(0, -1));
		}
	};

	return (
		<div
			className='relative flex min-h-11 flex-wrap items-center gap-1.5 rounded-[11px] border border-(--gm-line) px-3 py-2 transition-colors focus-within:border-(--color-primary-500) focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary-500)_12%,transparent)]'
			style={{ background: 'color-mix(in srgb, var(--gm-paper) 62%, transparent)' }}
		>
			<span className='pointer-events-none absolute start-3 top-0 -translate-y-1/2 rounded-md bg-(--gm-paper) px-1 text-[11px] font-medium gm-muted'>{label}</span>
			{items.map(opt => (
				<span key={opt} className='gm-plan__chip text-(--color-primary-700)!'>
					<bdi>{opt}</bdi>
					<button type='button' aria-label={`${opt} ×`} onClick={() => onChange(items.filter(o => o !== opt))} className='opacity-60 transition-opacity hover:opacity-100'>
						<X className='size-3' />
					</button>
				</span>
			))}
			<input
				dir='auto'
				value={draft}
				onChange={e => setDraft(e.target.value)}
				onKeyDown={onKeyDown}
				onBlur={() => commit(draft)}
				placeholder={placeholder}
				className='min-w-[140px] flex-1 bg-transparent text-[13px] gm-ink outline-none placeholder:text-(--gm-faint)'
			/>
		</div>
	);
}

/* ─────────────────────────── Field row ─────────────────────────── */
const FieldRow = memo(function FieldRow({ groupId, field, fieldKey, label, builtin, index, row, initialEditing, actions }) {
	const t = useTranslations('reportConfig');
	const selfRef = useRef(null);
	const [editing, setEditing] = useState(Boolean(initialEditing));

	useEffect(() => {
		if (initialEditing) selfRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	}, [initialEditing]);

	const enabled = field?.enabled !== false;
	const required = Boolean(field?.required);
	const type = builtin ? null : field?.type || 'text';
	const Icon = builtin ? Lock : TYPE_ICONS[type] || Type;
	const missingOptions = type === 'select' && !(field?.options || []).length;

	const patch = useCallback(p => {
		if (builtin) actions.patchBuiltinField(groupId, fieldKey, p);
		else actions.patchCustomField(groupId, field.id, p);
	}, [actions, builtin, groupId, fieldKey, field?.id]);

	const remove = () => (builtin ? actions.removeBuiltinField(groupId, fieldKey) : actions.removeCustomField(groupId, field.id));
	const typeOptions = useMemo(() => FIELD_TYPES.map(id => ({ id, label: t(`coachConfig.fieldTypes.${id}`) })), [t]);
	const displayLabel = builtin ? label : field?.label;

	return (
		<div
			ref={el => { row?.ref(el); selfRef.current = el; }}
			style={row?.style}
			className={`gm-field ${editing ? 'is-editing' : ''} ${row?.isDragging ? 'shadow-(--gm-shadow-3)' : ''} ${enabled ? '' : 'opacity-70'}`}
		>
			<div className='flex flex-wrap items-center gap-x-2.5 gap-y-1.5 px-2.5 py-2'>
				<div className='flex min-w-0 flex-1 basis-[220px] items-center gap-2.5'>
					{row ? (
						<DragHandle handle={row.handle} label={t('coachConfig.groups.dragHandle')} />
					) : (
						<span className='gm-field__num w-6!' title={t('coachConfig.fields.builtinLocked')}>{index + 1}</span>
					)}
					<span className='gm-field__icon size-8! rounded-[10px]!'>
						<Icon className='size-4' strokeWidth={1.9} />
					</span>
					<button
						type='button'
						onClick={() => !builtin && setEditing(v => !v)}
						disabled={builtin}
						className='min-w-0 flex-1 text-start disabled:cursor-default'
					>
						<span className='flex items-center gap-1.5'>
							<span dir='auto' className={`truncate text-[13px] font-semibold ${displayLabel ? 'gm-ink' : 'italic gm-faint'}`}>
								{displayLabel || t('coachConfig.fields.noQuestionText')}
							</span>
							{required && <span className='text-[13px] font-bold text-(--gm-danger)'>*</span>}
						</span>
						<span className='mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] gm-muted'>
							{builtin ? t('coachConfig.groups.builtin') : t(`coachConfig.fieldTypes.${type}`)}
							{!enabled && (
								<>
									<span className='gm-faint'>·</span>
									<span>{t('coachConfig.fields.inactive')}</span>
								</>
							)}
							{missingOptions && (
								<>
									<span className='gm-faint'>·</span>
									<span className='text-(--gm-warn)'>{t('coachConfig.fields.optionsEmpty')}</span>
								</>
							)}
						</span>
					</button>
				</div>

				<div className='ms-auto flex shrink-0 items-center gap-0.5'>
					<GmSwitch
						checked={enabled}
						label={enabled ? t('coachConfig.fields.active') : t('coachConfig.fields.inactive')}
						onChange={v => patch(v ? { enabled: true } : { enabled: false, required: false })}
					/>
					<GmCheck checked={required} disabled={!enabled} label={t('coachConfig.fields.required')} onChange={v => patch({ required: v })} />
					{!builtin && (
						<button
							type='button'
							onClick={() => setEditing(v => !v)}
							aria-label={editing ? t('common.done') : t('coachConfig.fields.edit')}
							title={editing ? t('common.done') : t('coachConfig.fields.edit')}
							aria-expanded={editing}
							className={editing ? 'grid size-8 shrink-0 place-items-center rounded-[9px] text-white transition hover:-translate-y-px' : `${ICON_BTN} ${PRIMARY_HOVER}`}
							style={editing ? GRADIENT : undefined}
						>
							{editing ? <Check className='size-4' strokeWidth={2.6} /> : <PencilLine className='size-4' />}
						</button>
					)}
					<ConfirmRemove onConfirm={remove} label={t('coachConfig.fields.remove')} confirmLabel={t('coachConfig.fields.confirmRemove')} />
				</div>
			</div>

			<AnimatePresence initial={false}>
				{editing && !builtin && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.18 }}
						className='overflow-hidden'
					>
						<div className='grid grid-cols-1 gap-3 border-t border-(--gm-line) px-3 pb-3 pt-4 sm:grid-cols-[minmax(0,1fr)_200px] sm:ps-[84px]'>
							<FloatingInput label={t('coachConfig.fields.questionLabel')} value={field?.label || ''} onChange={v => patch({ label: v })} required />
							<FloatingSelect label={t('coachConfig.fields.typeLabel')} value={type} options={typeOptions} onChange={v => v && patch({ type: v })} />
							<FloatingInput className='sm:col-span-2' label={t('coachConfig.fields.helperText')} value={field?.placeholder || ''} onChange={v => patch({ placeholder: v })} />
							{type === 'select' && (
								<div className='sm:col-span-2'>
									<OptionsEditor
										label={t('coachConfig.fields.optionsChips')}
										placeholder={t('coachConfig.fields.optionPlaceholder')}
										value={field?.options}
										onChange={options => patch({ options })}
									/>
								</div>
							)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
});

function SortableFieldRow(props) {
	const row = useSortableRow(props.field.id);
	return <FieldRow {...props} row={row} />;
}

/* ─────────────────────────── Group card ─────────────────────────── */
const GroupCard = memo(function GroupCard({ id, group, autoFocus, actions, onRequestDelete }) {
	const t = useTranslations('reportConfig');
	const builtin = isBuiltinGroup(id);
	const row = useSortableRow(id);
	const selfRef = useRef(null);
	const [open, setOpen] = useState(true);
	const [renaming, setRenaming] = useState(false);
	const [nameDraft, setNameDraft] = useState('');
	const [lastAddedId, setLastAddedId] = useState(null);

	useEffect(() => {
		if (autoFocus) selfRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}, [autoFocus]);

	const enabled = group.enabled !== false;
	const title = builtin ? t(`weekly.${id}.title`) : group.label || t('coachConfig.groups.untitled');
	const Icon = SECTION_ICONS[id] || FileText;

	const builtinRows = useMemo(
		() => (builtin ? BUILTIN_FIELD_KEYS[id].filter(k => !group.fields?.[k]?.removed).map(k => ({ key: k, field: group.fields?.[k] || {} })) : []),
		[builtin, id, group.fields],
	);
	const removedCount = builtin ? BUILTIN_FIELD_KEYS[id].length - builtinRows.length : 0;
	const customFields = useMemo(() => (builtin ? group.customFields : group.fields) || [], [builtin, group.customFields, group.fields]);
	const customIds = useMemo(() => customFields.map(f => f.id), [customFields]);

	const total = builtinRows.length + customFields.length;
	const active = builtinRows.filter(r => r.field.enabled !== false).length + customFields.filter(f => f.enabled !== false).length;

	const addField = () => {
		const field = newCustomField();
		setLastAddedId(field.id);
		setOpen(true);
		actions.addField(id, field);
		if (!enabled) actions.setGroupEnabled(id, true);
	};

	const startRename = () => { setNameDraft(group.label || ''); setRenaming(true); };
	const commitRename = () => {
		const next = nameDraft.trim();
		if (next) actions.renameGroup(id, next);
		setRenaming(false);
	};

	return (
		<div
			ref={el => { row.ref(el); selfRef.current = el; }}
			style={row.style}
			className={`gm-panel overflow-hidden ${row.isDragging ? 'opacity-80' : ''}`}
		>
			<div className='flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-(--gm-line) px-3 py-3 sm:px-4' style={{ background: 'color-mix(in srgb, var(--color-primary-50) 55%, transparent)' }}>
				<div className='flex min-w-0 flex-1 basis-[240px] items-center gap-2.5'>
					<DragHandle handle={row.handle} label={t('coachConfig.groups.dragHandle')} />
					<span className='grid size-9 shrink-0 place-items-center rounded-[11px] text-white shadow-[0_6px_14px_-6px_color-mix(in_srgb,var(--color-primary-600)_60%,transparent)]' style={GRADIENT}>
						<Icon className='size-4' />
					</span>
					<div className='min-w-0 flex-1'>
						{renaming ? (
							<div className='flex items-center gap-1.5'>
								<input
									autoFocus
									dir='auto'
									value={nameDraft}
									aria-label={t('coachConfig.groups.nameLabel')}
									onChange={e => setNameDraft(e.target.value)}
									onKeyDown={e => {
										if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
										if (e.key === 'Escape') { e.stopPropagation(); setRenaming(false); }
									}}
									className='gm-builder-title h-9! text-[14px]!'
								/>
								<button type='button' onClick={commitRename} aria-label={t('common.confirm')} title={t('common.confirm')} className='grid size-8 shrink-0 place-items-center rounded-[9px] text-white' style={GRADIENT}>
									<Check className='size-4' strokeWidth={2.6} />
								</button>
								<button type='button' onClick={() => setRenaming(false)} aria-label={t('common.cancel')} title={t('common.cancel')} className={`${ICON_BTN} ${PRIMARY_HOVER}`}>
									<X className='size-4' />
								</button>
							</div>
						) : (
							<>
								<div className='flex min-w-0 items-center gap-1.5'>
									<span dir='auto' className='truncate text-[14px] font-bold gm-ink'>{title}</span>
									{builtin ? (
										<Badge color='slate' icon={<Lock className='size-3' />}>{t('coachConfig.groups.builtin')}</Badge>
									) : (
										<button type='button' onClick={startRename} aria-label={t('coachConfig.groups.rename')} title={t('coachConfig.groups.rename')} className={`${ICON_BTN} size-7! ${PRIMARY_HOVER}`}>
											<PencilLine className='size-3.5' />
										</button>
									)}
								</div>
								<span className='mt-0.5 block font-en text-[11.5px] tabular-nums gm-muted'>{t('coachConfig.groups.activeCount', { active, total })}</span>
							</>
						)}
					</div>
				</div>

				<div className='ms-auto flex shrink-0 items-center gap-1'>
					<button type='button' onClick={addField} className='gm-btn-ghost gm-btn-compact inline-flex items-center gap-1'>
						<Plus className='size-3.5' />
						<span>{t('coachConfig.groups.addField')}</span>
					</button>
					<GmSwitch checked={enabled} hideLabel label={t('coachConfig.groups.enabled')} onChange={v => actions.setGroupEnabled(id, v)} />
					<RemoveButton onClick={() => onRequestDelete(id, title)} label={t('coachConfig.groups.delete')} />
					<button
						type='button'
						onClick={() => setOpen(v => !v)}
						aria-expanded={open}
						aria-label={open ? t('coachConfig.groups.collapse') : t('coachConfig.groups.expand')}
						title={open ? t('coachConfig.groups.collapse') : t('coachConfig.groups.expand')}
						className={`${ICON_BTN} ${PRIMARY_HOVER}`}
					>
						<ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
					</button>
				</div>
			</div>

			<AnimatePresence initial={false}>
				{open && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.2, ease: [0.2, 0.75, 0.25, 1] }}
						className='overflow-hidden'
					>
						<div className='space-y-2 p-3 sm:p-4'>
							{!enabled ? (
								<div className='flex flex-col items-center gap-2 rounded-[14px] border border-dashed border-(--gm-line) px-4 py-8 text-center'>
									<span className='gm-plan__icon size-10! rounded-[12px]!'><EyeOff className='size-4.5' /></span>
									<p className='text-[13px] font-semibold gm-ink-soft'>{t('coachConfig.groups.disabledMessage')}</p>
									<button type='button' onClick={() => actions.setGroupEnabled(id, true)} className='gm-btn-ghost gm-btn-compact mt-1 inline-flex items-center gap-1.5'>
										<ToggleRight className='size-3.5' />
										{t('coachConfig.groups.enableGroup')}
									</button>
								</div>
							) : total === 0 ? (
								<button type='button' onClick={addField} className='gm-builder-add'>
									<Plus className='size-4' />
									{t('coachConfig.groups.addFirstField')}
								</button>
							) : (
								<>
									{builtinRows.map((r, i) => (
										<FieldRow
											key={r.key}
											groupId={id}
											fieldKey={r.key}
											field={r.field}
											label={t(BUILTIN_FIELD_LABEL_KEYS[r.key])}
											builtin
											index={i}
											actions={actions}
										/>
									))}
									{customFields.length > 0 && (
										<SortableList ids={customIds} onMove={(from, to) => actions.moveCustomField(id, from, to)}>
											<div className='space-y-2'>
												{customFields.map((f, i) => (
													<SortableFieldRow
														key={f.id}
														groupId={id}
														field={f}
														index={builtinRows.length + i}
														initialEditing={f.id === lastAddedId}
														actions={actions}
													/>
												))}
											</div>
										</SortableList>
									)}
								</>
							)}
							{enabled && removedCount > 0 && (
								<button type='button' onClick={() => actions.restoreBuiltinFields(id)} className='inline-flex items-center gap-1.5 rounded-[9px] px-2 py-1.5 text-[12px] font-semibold text-(--color-primary-600) transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary-100)_55%,transparent)]'>
									<RotateCcw className='size-3.5' />
									{t('coachConfig.groups.restoreFields', { count: removedCount })}
								</button>
							)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
});

/* ─────────────────────────── Builder ─────────────────────────── */
export default function ReportFieldsBuilder({ config, actions, focusGroupId, onAddGroup }) {
	const t = useTranslations('reportConfig');
	const [pendingDelete, setPendingDelete] = useState(null);

	const groups = useMemo(
		() => config.groupOrder
			.map(id => ({ id, group: isBuiltinGroup(id) ? config.sections[id] : config.customGroups.find(g => g.id === id) }))
			.filter(g => g.group),
		[config.groupOrder, config.sections, config.customGroups],
	);
	const groupIds = useMemo(() => groups.map(g => g.id), [groups]);
	const removedSections = useMemo(() => Object.keys(SECTION_ICONS).filter(id => !config.groupOrder.includes(id)), [config.groupOrder]);

	const requestDelete = useCallback((id, title) => setPendingDelete({ id, title }), []);
	const confirmDelete = () => {
		if (pendingDelete) actions.removeGroup(pendingDelete.id);
		setPendingDelete(null);
	};

	return (
		<div className='space-y-4'>
			{groups.length ? (
				<SortableList ids={groupIds} onMove={actions.moveGroup}>
					<div className='space-y-4'>
						{groups.map(({ id, group }) => (
							<GroupCard key={id} id={id} group={group} autoFocus={id === focusGroupId} actions={actions} onRequestDelete={requestDelete} />
						))}
					</div>
				</SortableList>
			) : (
				<div className='flex flex-col items-center gap-3 rounded-[16px] border border-dashed border-(--gm-line) px-6 py-12 text-center' style={{ background: 'color-mix(in srgb, var(--gm-paper) 45%, transparent)' }}>
					<span className='gm-plan__icon size-12!'><FolderPlus className='size-6' /></span>
					<p className='text-[13.5px] font-semibold gm-ink-soft'>{t('coachConfig.groups.emptyTitle')}</p>
					<p className='max-w-sm text-[12px] gm-faint'>{t('coachConfig.groups.emptyDesc')}</p>
				</div>
			)}

			<button type='button' onClick={onAddGroup} className='gm-builder-add'>
				<FolderPlus className='size-4' />
				{t('coachConfig.groups.addGroup')}
			</button>

			{removedSections.length > 0 && (
				<div className='flex flex-wrap items-center gap-2 rounded-[14px] border border-(--gm-line) px-3.5 py-3' style={{ background: 'color-mix(in srgb, var(--gm-paper) 55%, transparent)' }}>
					<span className='text-[12px] font-semibold gm-muted'>{t('coachConfig.groups.removedSections')}</span>
					{removedSections.map(id => {
						const Icon = SECTION_ICONS[id];
						return (
							<button
								key={id}
								type='button'
								onClick={() => actions.restoreGroup(id)}
								title={t('coachConfig.groups.restoreSection')}
								className='inline-flex h-8 items-center gap-1.5 rounded-full border border-(--gm-line) bg-(--gm-paper) px-3 text-[12px] font-semibold gm-ink-soft transition-colors hover:border-(--color-primary-300) hover:text-(--color-primary-700)'
							>
								<Icon className='size-3.5' />
								{t(`weekly.${id}.title`)}
								<RotateCcw className='size-3 opacity-70' />
							</button>
						);
					})}
				</div>
			)}

			<Modal cn='gm-modal-root' panelClassName='gm-modal' open={!!pendingDelete} onClose={() => setPendingDelete(null)} title={t('coachConfig.groups.deleteTitle')} maxW='max-w-md'>
				<div
					className='flex items-start gap-3 rounded-[14px] border p-4'
					style={{ borderColor: 'color-mix(in srgb, var(--gm-danger) 25%, transparent)', background: 'color-mix(in srgb, var(--gm-danger) 8%, var(--gm-paper))' }}
				>
					<span className='grid size-9 shrink-0 place-items-center rounded-[11px]' style={{ color: 'var(--gm-danger)', background: 'color-mix(in srgb, var(--gm-danger) 14%, var(--gm-paper))' }}>
						<AlertCircle className='size-[18px]' />
					</span>
					<div className='min-w-0 flex-1'>
						<p dir='auto' className='truncate text-[13.5px] font-bold gm-ink'>{pendingDelete?.title}</p>
						<p className='mt-1 text-[13px] leading-relaxed gm-ink-soft'>
							{isBuiltinGroup(pendingDelete?.id) ? t('coachConfig.groups.deleteBuiltinMsg') : t('coachConfig.groups.deleteMsg')}
						</p>
					</div>
				</div>
				<div className='mt-5 flex justify-end gap-2.5 border-t pt-4' style={{ borderColor: 'var(--gm-line)' }}>
					<Button color='neutral' name={t('common.cancel')} onClick={() => setPendingDelete(null)} />
					<Button color='red' name={t('common.delete')} onClick={confirmDelete} icon={<Trash2 className='size-4' />} />
				</div>
			</Modal>
		</div>
	);
}
