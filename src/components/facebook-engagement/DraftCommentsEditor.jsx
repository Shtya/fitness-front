'use client';

import { useMemo, useState } from 'react';
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Copy, GripVertical, ListPlus, MessageSquarePlus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFbT } from './fb-i18n';
import {
	EmptyState,
	FbDialog,
	ghostButtonClass,
	inputClass,
	outlineButtonClass,
	Tag,
	textareaClass,
} from './fb-ui';

export const MAX_COMMENTS = 200;
export const MAX_COMMENT_LENGTH = 8000;

const newKey = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
export const normalizeMessage = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();

export function makeDraftComment(message, accountId = null) {
	return { key: newKey(), message, accountId };
}

export function splitBulkText(text, byBlankLine) {
	return String(text || '')
		.split(byBlankLine ? /\n\s*\n/ : /\n/)
		.map((item) => item.trim())
		.filter(Boolean);
}

function SortableRow({ comment, index, selected, duplicate, publishers, onToggle, onChange, onDuplicate, onRemove }) {
	const t = useFbT();
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: comment.key });
	return (
		<li
			ref={setNodeRef}
			style={{ transform: CSS.Transform.toString(transform), transition }}
			className={cn(
				'group rounded-xl border bg-white p-3 transition-shadow dark:bg-slate-900',
				selected ? 'border-[var(--color-primary-400)]' : 'border-slate-200 dark:border-slate-800',
				isDragging && 'relative z-10 shadow-lg ring-2 ring-[var(--color-primary-500)]/30',
			)}
		>
			<div className="flex items-start gap-2">
				<div className="flex flex-col items-center gap-1 pt-1">
					<input
						type="checkbox"
						checked={selected}
						onChange={() => onToggle(comment.key)}
						className="size-4 accent-[var(--color-primary-600)]"
						aria-label={t('selectComment', { n: index + 1 })}
					/>
					<button
						type="button"
						className="cursor-grab touch-none rounded p-0.5 text-slate-400 hover:text-slate-700 active:cursor-grabbing dark:hover:text-slate-200"
						aria-label={t('dragToReorder')}
						{...attributes}
						{...listeners}
					>
						<GripVertical className="size-4" aria-hidden />
					</button>
				</div>
				<div className="min-w-0 flex-1 space-y-2">
					<textarea
						value={comment.message}
						onChange={(event) => onChange(comment.key, { message: event.target.value })}
						rows={2}
						maxLength={MAX_COMMENT_LENGTH}
						className={cn(textareaClass, 'min-h-[64px]')}
						aria-label={t('commentN', { n: index + 1 })}
						dir="auto"
					/>
					<div className="flex flex-wrap items-center gap-2">
						<span className="text-xs font-medium text-slate-400 tabular-nums">#{index + 1}</span>
						{publishers.length > 1 ? (
							<select
								value={comment.accountId || ''}
								onChange={(event) => onChange(comment.key, { accountId: event.target.value || null })}
								className={cn(inputClass, 'h-8 w-auto max-w-[220px] text-xs')}
								aria-label={t('publishAs')}
							>
								<option value="">{t('campaignDefaultPage')}</option>
								{publishers.map((account) => (
									<option key={account.id} value={account.id}>
										{account.name}
									</option>
								))}
							</select>
						) : (
							publishers[0] && <Tag>{t('asPage', { name: publishers[0].name })}</Tag>
						)}
						{duplicate && <Tag tone="amber">{t('duplicateComment')}</Tag>}
						{!comment.message.trim() && <Tag tone="rose">{t('emptyComment')}</Tag>}
						<span className="ms-auto text-[11px] text-slate-400 tabular-nums">
							{comment.message.length}/{MAX_COMMENT_LENGTH}
						</span>
						<Button
							size="icon-sm"
							variant="ghost"
							className={ghostButtonClass}
							onClick={() => onDuplicate(comment.key)}
							aria-label={t('duplicate')}
							title={t('duplicate')}
						>
							<Copy aria-hidden />
						</Button>
						<Button
							size="icon-sm"
							variant="ghost"
							className={cn(ghostButtonClass, 'hover:text-rose-600 dark:hover:text-rose-400')}
							onClick={() => onRemove(comment.key)}
							aria-label={t('delete')}
							title={t('delete')}
						>
							<Trash2 aria-hidden />
						</Button>
					</div>
				</div>
			</div>
		</li>
	);
}

export default function DraftCommentsEditor({ comments, onChange, publishers }) {
	const t = useFbT();
	const [draft, setDraft] = useState('');
	const [selected, setSelected] = useState(() => new Set());
	const [bulkOpen, setBulkOpen] = useState(false);
	const [bulkText, setBulkText] = useState('');
	const [byBlankLine, setByBlankLine] = useState(false);
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	const duplicates = useMemo(() => {
		const counts = new Map();
		for (const comment of comments) {
			const key = normalizeMessage(comment.message);
			if (key) counts.set(key, (counts.get(key) || 0) + 1);
		}
		return new Set([...counts].filter(([, count]) => count > 1).map(([key]) => key));
	}, [comments]);

	const remaining = MAX_COMMENTS - comments.length;
	const bulkItems = splitBulkText(bulkText, byBlankLine);

	const add = () => {
		const message = draft.trim();
		if (!message || remaining <= 0) return;
		onChange([...comments, makeDraftComment(message)]);
		setDraft('');
	};

	const addBulk = () => {
		const next = bulkItems.slice(0, remaining).map((message) => makeDraftComment(message));
		onChange([...comments, ...next]);
		setBulkText('');
		setBulkOpen(false);
	};

	const update = (key, patch) => onChange(comments.map((comment) => (comment.key === key ? { ...comment, ...patch } : comment)));
	const remove = (key) => {
		onChange(comments.filter((comment) => comment.key !== key));
		setSelected((current) => {
			const next = new Set(current);
			next.delete(key);
			return next;
		});
	};
	const duplicate = (key) => {
		if (remaining <= 0) return;
		const index = comments.findIndex((comment) => comment.key === key);
		const copy = makeDraftComment(comments[index].message, comments[index].accountId);
		onChange([...comments.slice(0, index + 1), copy, ...comments.slice(index + 1)]);
	};
	const toggle = (key) =>
		setSelected((current) => {
			const next = new Set(current);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	const allSelected = comments.length > 0 && selected.size === comments.length;

	const onDragEnd = ({ active, over }) => {
		if (!over || active.id === over.id) return;
		const from = comments.findIndex((comment) => comment.key === active.id);
		const to = comments.findIndex((comment) => comment.key === over.id);
		onChange(arrayMove(comments, from, to));
	};

	return (
		<div className="space-y-4">
			<div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/40">
				<textarea
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
							event.preventDefault();
							add();
						}
					}}
					placeholder={t('writeComment')}
					maxLength={MAX_COMMENT_LENGTH}
					className={cn(textareaClass, 'min-h-[72px] bg-white dark:bg-slate-900')}
					aria-label={t('writeComment')}
					dir="auto"
				/>
				<div className="mt-2 flex flex-wrap items-center justify-between gap-2">
					<span className="text-xs text-slate-500 dark:text-slate-400">{t('addShortcut')}</span>
					<div className="flex gap-2">
						<Button variant="outline" size="sm" className={outlineButtonClass} onClick={() => setBulkOpen(true)} disabled={remaining <= 0}>
							<ListPlus aria-hidden />
							{t('bulkAdd')}
						</Button>
						<Button size="sm" onClick={add} disabled={!draft.trim() || remaining <= 0}>
							<Plus aria-hidden />
							{t('addComment')}
						</Button>
					</div>
				</div>
			</div>

			{comments.length > 0 && (
				<div className="flex flex-wrap items-center gap-2 text-[13px]">
					<label className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
						<input
							type="checkbox"
							checked={allSelected}
							onChange={() => setSelected(allSelected ? new Set() : new Set(comments.map((comment) => comment.key)))}
							className="size-4 accent-[var(--color-primary-600)]"
						/>
						{selected.size ? t('selectedCount', { n: selected.size }) : t('selectAll')}
					</label>
					{selected.size > 0 && (
						<>
							{publishers.length > 1 && (
								<select
									defaultValue=""
									onChange={(event) => {
										const value = event.target.value;
										if (!value) return;
										onChange(comments.map((comment) => (selected.has(comment.key) ? { ...comment, accountId: value } : comment)));
										event.target.value = '';
									}}
									className={cn(inputClass, 'h-8 w-auto text-xs')}
									aria-label={t('setPageForSelected')}
								>
									<option value="">{t('setPageForSelected')}</option>
									{publishers.map((account) => (
										<option key={account.id} value={account.id}>
											{account.name}
										</option>
									))}
								</select>
							)}
							<Button
								size="sm"
								variant="ghost"
								className={cn(ghostButtonClass, 'text-rose-600 dark:text-rose-400')}
								onClick={() => {
									onChange(comments.filter((comment) => !selected.has(comment.key)));
									setSelected(new Set());
								}}
							>
								<Trash2 aria-hidden />
								{t('deleteSelected')}
							</Button>
						</>
					)}
					<span className="ms-auto text-xs text-slate-500 tabular-nums dark:text-slate-400">
						{t('commentsOfMax', { n: comments.length, max: MAX_COMMENTS })}
					</span>
				</div>
			)}

			{comments.length === 0 ? (
				<EmptyState icon={MessageSquarePlus} title={t('noCommentsYet')} description={t('noCommentsYetHint')} className="py-8" />
			) : (
				<DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
					<SortableContext items={comments.map((comment) => comment.key)} strategy={verticalListSortingStrategy}>
						<ol className="space-y-2">
							{comments.map((comment, index) => (
								<SortableRow
									key={comment.key}
									comment={comment}
									index={index}
									selected={selected.has(comment.key)}
									duplicate={duplicates.has(normalizeMessage(comment.message))}
									publishers={publishers}
									onToggle={toggle}
									onChange={update}
									onDuplicate={duplicate}
									onRemove={remove}
								/>
							))}
						</ol>
					</SortableContext>
				</DndContext>
			)}

			<FbDialog
				open={bulkOpen}
				onOpenChange={setBulkOpen}
				title={t('bulkAddTitle')}
				description={t('bulkAddHint')}
				size="lg"
				footer={
					<>
						<Button variant="ghost" className={ghostButtonClass} onClick={() => setBulkOpen(false)}>
							{t('cancel')}
						</Button>
						<Button onClick={addBulk} disabled={!bulkItems.length}>
							{t('addNComments', { n: Math.min(bulkItems.length, remaining) })}
						</Button>
					</>
				}
			>
				<div className="space-y-3">
					<textarea
						value={bulkText}
						onChange={(event) => setBulkText(event.target.value)}
						rows={10}
						className={textareaClass}
						placeholder={t('bulkPlaceholder')}
						aria-label={t('bulkAddTitle')}
						dir="auto"
					/>
					<label className="inline-flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-300">
						<input
							type="checkbox"
							checked={byBlankLine}
							onChange={(event) => setByBlankLine(event.target.checked)}
							className="size-4 accent-[var(--color-primary-600)]"
						/>
						{t('splitByBlankLine')}
					</label>
					{bulkItems.length > remaining && (
						<p className="text-xs text-amber-600 dark:text-amber-400">{t('bulkOverLimit', { n: remaining })}</p>
					)}
				</div>
			</FbDialog>
		</div>
	);
}
