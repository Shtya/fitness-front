'use client';

import { useEffect, useMemo, useState } from 'react';
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
	Copy,
	ExternalLink,
	GripVertical,
	ListPlus,
	Loader2,
	MessageSquareText,
	Pencil,
	Plus,
	RotateCcw,
	Search,
	Send,
	Trash2,
	Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fbEngagementApi } from '@/lib/facebook-engagement/fb-engagement-api';
import { Link } from '@/i18n/navigation';
import { MAX_COMMENT_LENGTH, splitBulkText } from './DraftCommentsEditor';
import { FB_BASE } from './FbShell';
import { useFbComments, useFbMutation } from './fb-hooks';
import { useFbT } from './fb-i18n';
import {
	ConfirmDialog,
	EmptyState,
	ErrorState,
	FbDialog,
	Field,
	ghostButtonClass,
	inputClass,
	outlineButtonClass,
	PageAvatar,
	Pagination,
	SkeletonList,
	StatusBadge,
	Tag,
	textareaClass,
	useFbFormat,
} from './fb-ui';

const EDITABLE = new Set(['draft', 'failed', 'cancelled']);
const STATUSES = ['draft', 'pending', 'processing', 'published', 'failed', 'cancelled'];
const PAGE_SIZE = 50;

function useDebounced(value, delay = 300) {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(timer);
	}, [value, delay]);
	return debounced;
}

function CommentRow({ comment, selected, onToggle, sortable, showCampaign, onEdit, onDuplicate, onRetry, onDelete, busy }) {
	const t = useFbT();
	const format = useFbFormat();
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: comment.id,
		disabled: !sortable,
	});
	const editable = EDITABLE.has(comment.status);

	return (
		<li
			ref={setNodeRef}
			style={{ transform: CSS.Transform.toString(transform), transition }}
			className={cn(
				'group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40',
				selected && 'bg-[var(--color-primary-50)]/60 dark:bg-[var(--color-primary-500)]/10',
				isDragging && 'relative z-10 bg-white shadow-lg dark:bg-slate-900',
			)}
		>
			<div className="flex flex-col items-center gap-1 pt-0.5">
				<input
					type="checkbox"
					checked={selected}
					onChange={() => onToggle(comment.id)}
					className="size-4 accent-[var(--color-primary-600)]"
					aria-label={t('selectComment', { n: comment.position + 1 })}
				/>
				{sortable && (
					<button
						type="button"
						className="cursor-grab touch-none rounded p-0.5 text-slate-400 hover:text-slate-700 active:cursor-grabbing dark:hover:text-slate-200"
						aria-label={t('dragToReorder')}
						{...attributes}
						{...listeners}
					>
						<GripVertical className="size-4" aria-hidden />
					</button>
				)}
			</div>

			<div className="min-w-0 flex-1">
				<p className="line-clamp-3 whitespace-pre-line break-words text-sm leading-6 text-slate-800 dark:text-slate-200" dir="auto">
					{comment.message}
				</p>
				<div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
					<StatusBadge status={comment.status} />
					{comment.account && (
						<span className="inline-flex items-center gap-1.5">
							<PageAvatar account={comment.account} className="size-5 text-[10px]" />
							{comment.account.name}
						</span>
					)}
					{showCampaign && comment.campaign && (
						<Link
							href={`${FB_BASE}/campaigns/${comment.campaign.id}`}
							className="font-medium text-[var(--color-primary-700)] hover:underline dark:text-[var(--color-primary-300)]"
						>
							{comment.campaign.name}
						</Link>
					)}
					{comment.isDuplicate && <Tag tone="amber">{t('duplicateComment')}</Tag>}
					{comment.attempts > 0 && <span className="tabular-nums">{t('attemptsN', { n: comment.attempts })}</span>}
					{comment.publishedAt && <span>{format.relative(comment.publishedAt)}</span>}
					{comment.externalCommentId && (
						<a
							href={`https://www.facebook.com/${comment.externalCommentId}`}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1 font-medium text-[#1877F2] hover:underline"
						>
							<ExternalLink className="size-3" aria-hidden />
							{t('viewOnFacebook')}
						</a>
					)}
				</div>
				{comment.lastError && comment.status !== 'published' && (
					<p className="mt-1.5 text-xs leading-5 text-rose-600 dark:text-rose-400">
						{comment.lastErrorCode && <span className="font-mono text-[11px] opacity-80">[{comment.lastErrorCode}] </span>}
						{comment.lastError}
					</p>
				)}
			</div>

			<div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-60 sm:group-hover:opacity-100 sm:hover:opacity-100">
				{comment.status === 'failed' && (
					<Button size="icon-sm" variant="ghost" className={ghostButtonClass} onClick={() => onRetry(comment)} disabled={busy} aria-label={t('retry')} title={t('retry')}>
						<RotateCcw aria-hidden />
					</Button>
				)}
				{editable && (
					<Button size="icon-sm" variant="ghost" className={ghostButtonClass} onClick={() => onEdit(comment)} aria-label={t('edit')} title={t('edit')}>
						<Pencil aria-hidden />
					</Button>
				)}
				<Button size="icon-sm" variant="ghost" className={ghostButtonClass} onClick={() => onDuplicate(comment)} disabled={busy} aria-label={t('duplicate')} title={t('duplicate')}>
					<Copy aria-hidden />
				</Button>
				{editable && (
					<Button
						size="icon-sm"
						variant="ghost"
						className={cn(ghostButtonClass, 'hover:text-rose-600 dark:hover:text-rose-400')}
						onClick={() => onDelete(comment)}
						aria-label={t('delete')}
						title={t('delete')}
					>
						<Trash2 aria-hidden />
					</Button>
				)}
			</div>
		</li>
	);
}

export default function CommentsTable({ campaign, accounts = [] }) {
	const t = useFbT();
	const campaignId = campaign?.id;
	const publishers = campaign?.eligiblePublishers ?? [];

	const [page, setPage] = useState(1);
	const [searchInput, setSearchInput] = useState('');
	const [status, setStatus] = useState('');
	const [accountId, setAccountId] = useState('');
	const [selected, setSelected] = useState(() => new Set());
	const [editing, setEditing] = useState(null);
	const [editMessage, setEditMessage] = useState('');
	const [editAccount, setEditAccount] = useState('');
	const [composer, setComposer] = useState(null);
	const [composerText, setComposerText] = useState('');
	const [byBlankLine, setByBlankLine] = useState(false);
	const [bulkEditOpen, setBulkEditOpen] = useState(false);
	const [bulkEdit, setBulkEdit] = useState({ accountId: '', find: '', replace: '' });
	const [confirm, setConfirm] = useState(null);
	const [localOrder, setLocalOrder] = useState(null);
	const search = useDebounced(searchInput.trim());

	const params = useMemo(
		() => ({
			campaignId,
			status: status || undefined,
			accountId: accountId || undefined,
			search: search || undefined,
			page,
			limit: campaignId ? 100 : PAGE_SIZE,
		}),
		[campaignId, status, accountId, search, page],
	);
	const query = useFbComments(params);
	const rows = query.data?.items ?? [];

	useEffect(() => setLocalOrder(null), [query.data]);

	useEffect(() => {
		setPage(1);
		setSelected(new Set());
	}, [status, accountId, search]);

	const ordered = localOrder ? localOrder.map((id) => rows.find((row) => row.id === id)).filter(Boolean) : rows;
	const sortable = Boolean(campaignId) && !status && !accountId && !search && (query.data?.total ?? 0) <= 100;
	const selectedRows = rows.filter((row) => selected.has(row.id));
	const selectedFailed = selectedRows.filter((row) => row.status === 'failed');
	const selectedEditable = selectedRows.filter((row) => EDITABLE.has(row.status));
	const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));
	const clearSelection = () => setSelected(new Set());

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	const reorder = useFbMutation((ids) => fbEngagementApi.reorderComments(campaignId, ids));
	const updateComment = useFbMutation(({ id, body }) => fbEngagementApi.updateComment(id, body), {
		success: t('commentSaved'),
		onSuccess: () => setEditing(null),
	});
	const duplicateComment = useFbMutation((id) => fbEngagementApi.duplicateComment(id), { success: t('commentDuplicated') });
	const deleteComment = useFbMutation((id) => fbEngagementApi.deleteComment(id), { success: t('commentDeleted') });
	const bulkDelete = useFbMutation((ids) => fbEngagementApi.bulkDeleteComments(ids), {
		success: (result) => t('bulkDeleted', { n: result.deleted, skipped: result.skipped }),
		onSuccess: clearSelection,
	});
	const bulkRetry = useFbMutation((ids) => fbEngagementApi.bulkRetryComments(ids), {
		success: (result) => t('retryQueued', { n: result.queued }),
		onSuccess: clearSelection,
	});
	const bulkUpdate = useFbMutation((body) => fbEngagementApi.bulkUpdateComments(body), {
		success: (result) => t('bulkUpdated', { n: result.updated }),
		onSuccess: () => {
			setBulkEditOpen(false);
			setBulkEdit({ accountId: '', find: '', replace: '' });
			clearSelection();
		},
	});
	const publishSelected = useFbMutation((ids) => fbEngagementApi.publishCampaign(campaignId, ids), {
		success: (result) => t('publishQueued', { n: result.queued, skipped: result.skipped.length }),
		onSuccess: clearSelection,
	});
	const addOne = useFbMutation((message) => fbEngagementApi.addComment(campaignId, { message }), {
		success: t('commentAdded'),
		onSuccess: () => {
			setComposer(null);
			setComposerText('');
		},
	});
	const addBulk = useFbMutation((messages) => fbEngagementApi.bulkAddComments(campaignId, { messages }), {
		success: (result) => t('bulkAdded', { n: result.added, skipped: result.skippedDuplicates }),
		onSuccess: () => {
			setComposer(null);
			setComposerText('');
		},
	});

	const toggle = (id) =>
		setSelected((current) => {
			const next = new Set(current);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});

	const openEdit = (comment) => {
		setEditing(comment);
		setEditMessage(comment.message);
		setEditAccount(comment.accountId || '');
	};

	const onDragEnd = ({ active, over }) => {
		if (!over || active.id === over.id) return;
		const ids = ordered.map((row) => row.id);
		const next = arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id));
		setLocalOrder(next);
		reorder.mutate(next);
	};

	const bulkComposerItems = splitBulkText(composerText, byBlankLine);
	const busy = duplicateComment.isPending || bulkRetry.isPending;

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center gap-2">
				<div className="relative min-w-[200px] flex-1">
					<Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
					<input
						type="search"
						value={searchInput}
						onChange={(event) => setSearchInput(event.target.value)}
						placeholder={t('searchComments')}
						className={cn(inputClass, 'ps-9')}
						aria-label={t('searchComments')}
					/>
				</div>
				<select value={status} onChange={(event) => setStatus(event.target.value)} className={cn(inputClass, 'w-auto')} aria-label={t('filterStatus')}>
					<option value="">{t('allStatuses')}</option>
					{STATUSES.map((value) => (
						<option key={value} value={value}>
							{t(`status_${value}`)}
						</option>
					))}
				</select>
				{accounts.length > 1 && (
					<select value={accountId} onChange={(event) => setAccountId(event.target.value)} className={cn(inputClass, 'w-auto max-w-[200px]')} aria-label={t('filterPage')}>
						<option value="">{t('allPages')}</option>
						{accounts.map((account) => (
							<option key={account.id} value={account.id}>
								{account.name}
							</option>
						))}
					</select>
				)}
				{campaignId && (
					<>
						<Button variant="outline" className={outlineButtonClass} onClick={() => setComposer('bulk')}>
							<ListPlus aria-hidden />
							{t('bulkAdd')}
						</Button>
						<Button onClick={() => setComposer('single')}>
							<Plus aria-hidden />
							{t('addComment')}
						</Button>
					</>
				)}
			</div>

			{selected.size > 0 && (
				<div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] px-3 py-2 text-[13px] dark:border-[var(--color-primary-500)]/30 dark:bg-[var(--color-primary-500)]/10">
					<span className="font-medium text-slate-700 dark:text-slate-200">{t('selectedCount', { n: selected.size })}</span>
					<span className="flex-1" />
					{campaignId && selectedEditable.length > 0 && (
						<Button size="sm" onClick={() => publishSelected.mutate(selectedEditable.map((row) => row.id))} disabled={publishSelected.isPending}>
							{publishSelected.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
							{t('publishSelected')}
						</Button>
					)}
					{selectedFailed.length > 0 && (
						<Button size="sm" variant="outline" className={outlineButtonClass} onClick={() => bulkRetry.mutate(selectedFailed.map((row) => row.id))} disabled={bulkRetry.isPending}>
							<RotateCcw aria-hidden />
							{t('retryFailedN', { n: selectedFailed.length })}
						</Button>
					)}
					{selectedEditable.length > 0 && (
						<Button size="sm" variant="outline" className={outlineButtonClass} onClick={() => setBulkEditOpen(true)}>
							<Wand2 aria-hidden />
							{t('bulkEdit')}
						</Button>
					)}
					{selectedEditable.length > 0 && (
						<Button
							size="sm"
							variant="ghost"
							className={cn(ghostButtonClass, 'text-rose-600 dark:text-rose-400')}
							onClick={() => setConfirm({ type: 'bulk', ids: selectedEditable.map((row) => row.id) })}
						>
							<Trash2 aria-hidden />
							{t('deleteN', { n: selectedEditable.length })}
						</Button>
					)}
					<Button size="sm" variant="ghost" className={ghostButtonClass} onClick={clearSelection}>
						{t('clear')}
					</Button>
				</div>
			)}

			<div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900/60">
				{query.isLoading ? (
					<SkeletonList rows={5} className="p-4" />
				) : query.isError ? (
					<ErrorState error={query.error} onRetry={() => query.refetch()} className="m-4" />
				) : rows.length === 0 ? (
					<EmptyState
						icon={MessageSquareText}
						title={search || status || accountId ? t('noMatchingComments') : t('noCommentsYet')}
						description={search || status || accountId ? t('tryOtherFilters') : campaignId ? t('noCommentsYetHint') : t('noCommentsGlobalHint')}
					/>
				) : (
					<>
						<div className="flex items-center gap-3 border-b border-slate-100 px-4 py-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
							<input
								type="checkbox"
								checked={allSelected}
								onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)))}
								className="size-4 accent-[var(--color-primary-600)]"
								aria-label={t('selectAll')}
							/>
							<span>{t('showingN', { n: rows.length, total: query.data.total })}</span>
							{sortable && <span className="ms-auto hidden sm:inline">{t('dragHint')}</span>}
							{query.isFetching && <Loader2 className="ms-auto size-3.5 animate-spin" aria-hidden />}
						</div>
						<DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
							<SortableContext items={ordered.map((row) => row.id)} strategy={verticalListSortingStrategy}>
								<ul className="divide-y divide-slate-100 dark:divide-slate-800">
									{ordered.map((comment) => (
										<CommentRow
											key={comment.id}
											comment={comment}
											selected={selected.has(comment.id)}
											onToggle={toggle}
											sortable={sortable}
											showCampaign={!campaignId}
											onEdit={openEdit}
											onDuplicate={(row) => duplicateComment.mutate(row.id)}
											onRetry={(row) => bulkRetry.mutate([row.id])}
											onDelete={(row) => setConfirm({ type: 'single', id: row.id })}
											busy={busy}
										/>
									))}
								</ul>
							</SortableContext>
						</DndContext>
					</>
				)}
			</div>
			{query.data && <Pagination page={page} limit={params.limit} total={query.data.total} onChange={setPage} />}

			<FbDialog
				open={Boolean(editing)}
				onOpenChange={(open) => !open && setEditing(null)}
				title={t('editComment')}
				footer={
					<>
						<Button variant="ghost" className={ghostButtonClass} onClick={() => setEditing(null)}>
							{t('cancel')}
						</Button>
						<Button
							onClick={() =>
								updateComment.mutate({
									id: editing.id,
									body: {
										message: editMessage.trim(),
										...(publishers.length > 1 && editAccount ? { accountId: editAccount } : {}),
									},
								})
							}
							disabled={!editMessage.trim() || updateComment.isPending}
						>
							{updateComment.isPending && <Loader2 className="animate-spin" aria-hidden />}
							{t('save')}
						</Button>
					</>
				}
			>
				<div className="space-y-3">
					<textarea
						value={editMessage}
						onChange={(event) => setEditMessage(event.target.value)}
						rows={6}
						maxLength={MAX_COMMENT_LENGTH}
						className={textareaClass}
						aria-label={t('editComment')}
						dir="auto"
					/>
					{publishers.length > 1 && (
						<Field label={t('publishAs')}>
							<select value={editAccount} onChange={(event) => setEditAccount(event.target.value)} className={inputClass}>
								<option value="">{t('campaignDefaultPage')}</option>
								{publishers.map((account) => (
									<option key={account.id} value={account.id}>
										{account.name}
									</option>
								))}
							</select>
						</Field>
					)}
					{editing?.status !== 'draft' && <p className="text-xs text-slate-500 dark:text-slate-400">{t('editResetsToDraft')}</p>}
				</div>
			</FbDialog>

			<FbDialog
				open={Boolean(composer)}
				onOpenChange={(open) => !open && setComposer(null)}
				title={composer === 'bulk' ? t('bulkAddTitle') : t('addComment')}
				description={composer === 'bulk' ? t('bulkAddHint') : undefined}
				size={composer === 'bulk' ? 'lg' : 'md'}
				footer={
					<>
						<Button variant="ghost" className={ghostButtonClass} onClick={() => setComposer(null)}>
							{t('cancel')}
						</Button>
						{composer === 'bulk' ? (
							<Button onClick={() => addBulk.mutate(bulkComposerItems)} disabled={!bulkComposerItems.length || addBulk.isPending}>
								{addBulk.isPending && <Loader2 className="animate-spin" aria-hidden />}
								{t('addNComments', { n: bulkComposerItems.length })}
							</Button>
						) : (
							<Button onClick={() => addOne.mutate(composerText.trim())} disabled={!composerText.trim() || addOne.isPending}>
								{addOne.isPending && <Loader2 className="animate-spin" aria-hidden />}
								{t('addComment')}
							</Button>
						)}
					</>
				}
			>
				<div className="space-y-3">
					<textarea
						value={composerText}
						onChange={(event) => setComposerText(event.target.value)}
						rows={composer === 'bulk' ? 10 : 5}
						maxLength={composer === 'bulk' ? undefined : MAX_COMMENT_LENGTH}
						className={textareaClass}
						placeholder={composer === 'bulk' ? t('bulkPlaceholder') : t('writeComment')}
						aria-label={t('writeComment')}
						dir="auto"
					/>
					{composer === 'bulk' && (
						<label className="inline-flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-300">
							<input
								type="checkbox"
								checked={byBlankLine}
								onChange={(event) => setByBlankLine(event.target.checked)}
								className="size-4 accent-[var(--color-primary-600)]"
							/>
							{t('splitByBlankLine')}
						</label>
					)}
				</div>
			</FbDialog>

			<FbDialog
				open={bulkEditOpen}
				onOpenChange={setBulkEditOpen}
				title={t('bulkEditTitle', { n: selectedEditable.length })}
				description={t('bulkEditHint')}
				footer={
					<>
						<Button variant="ghost" className={ghostButtonClass} onClick={() => setBulkEditOpen(false)}>
							{t('cancel')}
						</Button>
						<Button
							onClick={() =>
								bulkUpdate.mutate({
									ids: selectedEditable.map((row) => row.id),
									...(bulkEdit.accountId ? { accountId: bulkEdit.accountId } : {}),
									...(bulkEdit.find ? { find: bulkEdit.find, replace: bulkEdit.replace } : {}),
								})
							}
							disabled={(!bulkEdit.accountId && !bulkEdit.find) || bulkUpdate.isPending}
						>
							{bulkUpdate.isPending && <Loader2 className="animate-spin" aria-hidden />}
							{t('apply')}
						</Button>
					</>
				}
			>
				<div className="space-y-4">
					{publishers.length > 1 && (
						<Field label={t('publishAs')}>
							<select value={bulkEdit.accountId} onChange={(event) => setBulkEdit((value) => ({ ...value, accountId: event.target.value }))} className={inputClass}>
								<option value="">{t('keepCurrent')}</option>
								{publishers.map((account) => (
									<option key={account.id} value={account.id}>
										{account.name}
									</option>
								))}
							</select>
						</Field>
					)}
					<div className="grid gap-3 sm:grid-cols-2">
						<Field label={t('findText')}>
							<input value={bulkEdit.find} onChange={(event) => setBulkEdit((value) => ({ ...value, find: event.target.value }))} className={inputClass} dir="auto" />
						</Field>
						<Field label={t('replaceWith')}>
							<input value={bulkEdit.replace} onChange={(event) => setBulkEdit((value) => ({ ...value, replace: event.target.value }))} className={inputClass} dir="auto" />
						</Field>
					</div>
				</div>
			</FbDialog>

			<ConfirmDialog
				open={Boolean(confirm)}
				onOpenChange={(open) => !open && setConfirm(null)}
				title={confirm?.type === 'bulk' ? t('deleteCommentsTitle', { n: confirm.ids.length }) : t('deleteCommentTitle')}
				description={t('deleteCommentHint')}
				confirmLabel={t('delete')}
				loading={deleteComment.isPending || bulkDelete.isPending}
				onConfirm={() => {
					const done = { onSettled: () => setConfirm(null) };
					if (confirm.type === 'bulk') bulkDelete.mutate(confirm.ids, done);
					else deleteComment.mutate(confirm.id, done);
				}}
			/>
		</div>
	);
}
