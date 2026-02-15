/* 
 - when finish task go to down 
 - fix reorder not working 
 - 
*/

'use client';

import { useState, useRef, useEffect } from 'react';
import {
	Plus,
	X,
	Folder,
	Calendar,
	Clock,
	Star,
	StarOff,
	Trash2,
	CheckCircle,
	Circle,
	Repeat,
	Flag,
	Inbox,
	Sun,
	Zap,
	ListTodo,
	GripVertical,
	FolderPlus,
	FileText,
	Menu,
	Volume2,
	VolumeX,
	Settings,
	TrendingUp,
	ChevronDown,
	Filter,
	Check,
	Eye,
	Image,
	Paperclip,
	Download,
	ArrowUp,
	ArrowDown,
	Home,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import {
	DndContext,
	DragOverlay,
	closestCorners,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	arrayMove,
	SortableContext,
	verticalListSortingStrategy,
	useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ✅ API helper
import api from '@/utils/axios';

// Import shadcn components
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { isArabic } from '@/utils/isArabic';

/**
 * ==========================================================
 * ✅ Reorder persistence (easy way): localStorage
 * - We store an "order array" of taskIds per folder scope.
 * - On load (after API fetch), we apply the saved order.
 * - On drag end (manual sort), we persist new order.
 *
 * If you want backend persistence later:
 * - Add a `position` or `order` field in DB, OR
 * - Add endpoint PATCH /todos/reorder { folderId, orderedIds }
 * - Then call it after local save (see commented section).
 * ==========================================================
 */

const LS_ORDER_KEY = 'todo_task_order_v1';

// Helpers for localStorage order map: { [folderId]: string[] }
function safeParseJSON(str, fallback) {
	try {
		return JSON.parse(str);
	} catch {
		return fallback;
	}
}

function loadOrderMap() {
	if (typeof window === 'undefined') return {};
	const raw = window.localStorage.getItem(LS_ORDER_KEY);
	return raw ? safeParseJSON(raw, {}) : {};
}

function saveOrderMap(map) {
	if (typeof window === 'undefined') return;
	window.localStorage.setItem(LS_ORDER_KEY, JSON.stringify(map));
}

function getFolderScopeId(selectedFolder) {
	// reorder should be persisted for "real" folder scopes only:
	// - today/starred views are derived, so we store to inbox
	// - inbox stays inbox
	if (selectedFolder === 'today' || selectedFolder === 'starred') return 'inbox';
	return selectedFolder || 'inbox';
}

// Apply order array to a list of tasks (only within a folder)
function applyOrderToTasks(allTasks, folderId, orderIds) {
	if (!Array.isArray(orderIds) || orderIds.length === 0) return allTasks;

	const folderTasks = allTasks.filter((t) => t.folderId === folderId);
	const otherTasks = allTasks.filter((t) => t.folderId !== folderId);

	const byId = new Map(folderTasks.map((t) => [t.id, t]));
	const ordered = [];

	// first: tasks that exist in order list
	for (const id of orderIds) {
		const task = byId.get(id);
		if (task) ordered.push(task);
	}

	// then: tasks not in order list (new tasks) appended at end
	for (const t of folderTasks) {
		if (!orderIds.includes(t.id)) ordered.push(t);
	}

	return [...ordered, ...otherTasks];
}

// Update folder order array based on current folder tasks order
function computeFolderOrder(allTasks, folderId) {
	return allTasks.filter((t) => t.folderId === folderId).map((t) => t.id);
}

function CustomCheckbox({ checked, onCheckedChange, className = '' }) {
	return (
		<button
			onClick={() => onCheckedChange(!checked)}
			className={`
				group relative w-6 h-6 rounded-lg border-2 
				transition-all duration-500 ease-out
				${checked
					? 'bg-linear-to-br from-(--color-gradient-from) via-(--color-gradient-via) to-(--color-gradient-to) border-transparent shadow-lg scale-110 rotate-360'
					: 'border-gray-300 bg-white hover:border-(--color-primary-400) hover:scale-105 hover:shadow-md active:scale-95'
				} 
				${className}
			`}
			style={{ transformOrigin: 'center' }}
		>
			{checked && (
				<>
					<div
						className="absolute -inset-1 rounded-lg opacity-0 animate-ping"
						style={{
							background:
								'linear-gradient(135deg, var(--color-primary-400), var(--color-secondary-400))',
							animationDuration: '1s',
							animationIterationCount: '1',
						}}
					/>
					<div className="absolute inset-0 rounded-lg overflow-hidden">
						<div
							className="absolute inset-0 -translate-x-full animate-shimmer"
							style={{
								background:
									'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
								backgroundSize: '200% 100%',
								animation: 'shimmer 2s ease-in-out infinite',
							}}
						/>
					</div>
					<div className="absolute inset-0">
						{[...Array(6)].map((_, i) => (
							<div
								key={i}
								className="absolute w-1 h-1 rounded-full animate-particle-burst"
								style={{
									background:
										'linear-gradient(135deg, var(--color-primary-300), var(--color-secondary-300))',
									top: '50%',
									left: '50%',
									transform: `rotate(${i * 60}deg) translateY(-12px)`,
									animation: `particle-burst 0.6s ease-out ${i * 0.05}s`,
									opacity: 0,
								}}
							/>
						))}
					</div>
				</>
			)}

			{checked && (
				<div className="relative w-full h-full flex items-center justify-center">
					<div className="absolute inset-0 flex items-center justify-center">
						<div
							className="w-3 h-3 rounded-full blur-sm opacity-60 animate-pulse"
							style={{ background: 'rgba(255, 255, 255, 0.5)' }}
						/>
					</div>
					<Check
						className="w-4 h-4 text-white relative z-10 drop-shadow-md"
						style={{
							animation:
								'check-draw 0.5s ease-out forwards, check-bounce 0.6s ease-out 0.3s',
						}}
					/>
				</div>
			)}

			{!checked && (
				<div
					className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
					style={{
						background:
							'radial-gradient(circle, var(--color-primary-100) 0%, transparent 70%)',
					}}
				/>
			)}
		</button>
	);
}

const styles = `
@keyframes shimmer { 0% { transform: translateX(-100%);} 100% { transform: translateX(100%);} }
@keyframes particle-burst { 0% { opacity: 1; transform: rotate(var(--rotation, 0deg)) translateY(-12px) scale(1);} 100% { opacity: 0; transform: rotate(var(--rotation, 0deg)) translateY(-24px) scale(0.5);} }
@keyframes check-draw { 0% { stroke-dasharray: 100; stroke-dashoffset: 100; opacity: 0; transform: scale(0.5) rotate(-45deg);} 50% { opacity: 1;} 100% { stroke-dashoffset: 0; opacity: 1; transform: scale(1) rotate(0deg);} }
@keyframes check-bounce { 0%, 100% { transform: scale(1);} 50% { transform: scale(1.2);} }
@keyframes slide-in-right { from { transform: translateX(100%); opacity: 0;} to { transform: translateX(0); opacity: 1;} }
@keyframes slide-in-left { from { transform: translateX(-100%); opacity: 0;} to { transform: translateX(0); opacity: 1;} }
`;
export { styles as checkboxStyles };

// Sound effects
const playSound = (type, soundEnabled) => {
	if (!soundEnabled) return;

	const audioContext = new (window.AudioContext || window.webkitAudioContext)();
	const oscillator = audioContext.createOscillator();
	const gainNode = audioContext.createGain();

	oscillator.connect(gainNode);
	gainNode.connect(audioContext.destination);

	if (type === 'check') {
		oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
		oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
		oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2);
		oscillator.type = 'sine';
		gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
		gainNode.gain.exponentialRampToValueAtTime(
			0.01,
			audioContext.currentTime + 0.5
		);
		oscillator.start(audioContext.currentTime);
		oscillator.stop(audioContext.currentTime + 0.5);
	} else if (type === 'uncheck') {
		oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime);
		oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
		oscillator.type = 'sine';
		gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
		gainNode.gain.exponentialRampToValueAtTime(
			0.01,
			audioContext.currentTime + 0.3
		);
		oscillator.start(audioContext.currentTime);
		oscillator.stop(audioContext.currentTime + 0.3);
	}
};

const priorityLevels = [
	{ id: 'none', label: 'none', color: 'var(--color-primary-300)', icon: Circle },
	{ id: 'low', label: 'low', color: 'var(--color-primary-500)', icon: Flag },
	{ id: 'medium', label: 'medium', color: '#f59e0b', icon: Flag },
	{ id: 'high', label: 'high', color: '#ef4444', icon: Flag },
	{ id: 'urgent', label: 'urgent', color: '#dc2626', icon: Zap },
];

const repeatOptions = [
	{ id: 'none', label: 'none' },
	{ id: 'daily', label: 'daily' },
	{ id: 'every-2-days', label: 'every2days' },
	{ id: 'every-3-days', label: 'every3days' },
	{ id: 'weekly', label: 'weekly' },
	{ id: 'bi-weekly', label: 'biweekly' },
	{ id: 'monthly', label: 'monthly' },
	{ id: 'custom', label: 'custom' },
];

const statusOptions = [
	{ id: 'todo', label: 'todo', color: 'var(--color-primary-600)' },
	{ id: 'in-progress', label: 'inProgress', color: '#f59e0b' },
	{ id: 'completed', label: 'completed', color: '#10b981' },
	{ id: 'cancelled', label: 'cancelled', color: '#ef4444' },
];

const TAB_OPTIONS = [
	{ value: 'boards', label: 'kanbanBoard', icon: Home },
	{ value: 'calendar', label: 'calendar', icon: Calendar },
	{ value: 'tasks', label: 'todos', icon: ListTodo },
];

// ===== Helpers to normalize backend response =====
const normalizeFolder = (f) => ({
	id: String(f.id ?? f._id ?? f.uuid ?? f.folderId ?? ''),
	uuid: f.uuid ?? f.id ?? f._id ?? null,   // ✅ keep uuid
	name: f.name ?? '',
	color: f.color ?? 'var(--color-primary-600)',
	icon: Folder,
	isSystem: !!f.isSystem,
});


const normalizeSubtask = (st) => ({
	id: String(st.id ?? st._id ?? st.uuid ?? ''),
	title: st.title ?? '',
	completed: !!st.completed,
	orderIndex: typeof st.orderIndex === 'number' ? st.orderIndex : 0,
});


const normalizeTask = (t) => ({
	id: String(t.id ?? t._id ?? t.uuid ?? ''),
	title: t.title ?? '',
	folderId: t.folderId == null ? 'inbox' : String(t.folderId ?? t.folder_id ?? 'inbox'),
	completed: !!t.completed,
	status: t.status ?? (t.completed ? 'completed' : 'todo'),
	priority: t.priority ?? 'none',
	dueDate: t.dueDate ?? t.due_date ?? null,
	dueTime: t.dueTime ?? t.due_time ?? null,
	repeat: t.repeat ?? 'none',
	customRepeatDays: t.customRepeatDays ?? null,
	tags: Array.isArray(t.tags) ? t.tags : [],
	isStarred: !!(t.isStarred ?? t.starred),
	notes: t.notes ?? '',
	attachments: Array.isArray(t.attachments) ? t.attachments : [],
	subtasks: Array.isArray(t.subtasks) ? t.subtasks.map(normalizeSubtask) : [],

	createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
	updatedAt: t.updatedAt ? new Date(t.updatedAt) : new Date(),
});

async function uploadFilesToAssets(files) {
	return files.map((file) => ({
		name: file.name,
		url: URL.createObjectURL(file),
		type: file.type,
	}));
}

// Sortable Subtask Item
function SortableSubtaskItem({
	subtask,
	onToggle,
	onDelete,
	onEdit,
	isRTL,
	editingSubtaskId,
	editSubtaskTitle,
	setEditSubtaskTitle,
	onSaveEdit,
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
		useSortable({ id: subtask.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	const isEditing = editingSubtaskId === subtask.id;

	const handleCheckboxClick = () => onToggle();

	const handleSpanClick = () => {
		if (!isEditing) onEdit();
	};

	return (
		<div ref={setNodeRef} style={style} className="rtl:mr-[-39px] relative group/subtask">
			<div
				className={`flex items-center gap-2.5 transition-all duration-200 ${isRTL
					? 'group-hover/subtask:-translate-x-0.5'
					: 'group-hover/subtask:translate-x-0.5'
					}`}
			>
				<div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1">
					<GripVertical className="w-3 h-3 text-gray-400" />
				</div>

				<CustomCheckbox checked={subtask.completed} onCheckedChange={handleCheckboxClick} className="w-4 h-4 shrink-0" />

				{isEditing ? (
					<input
						type="text"
						value={editSubtaskTitle}
						onChange={(e) => setEditSubtaskTitle(e.target.value)}
						onBlur={onSaveEdit}
						onKeyDown={(e) => {
							if (e.key === 'Enter') onSaveEdit();
							if (e.key === 'Escape') onSaveEdit();
						}}
						className="w-full text-base font-bold bg-transparent border-none focus:outline-none focus:ring-0 px-0"
						autoFocus
					/>
				) : (
					<span
						className={`text-sm font-medium flex-1 transition-colors cursor-pointer px-2 py-1 rounded hover:bg-white/30 ${subtask.completed ? 'line-through text-gray-400' : 'text-gray-700'
							}`}
						onClick={handleSpanClick}
					>
						{subtask.title}
					</span>
				)}

				<Button
					size="icon"
					variant="ghost"
					onClick={() => onDelete()}
					className="h-6 w-6 opacity-0 group-hover/subtask:opacity-100 transition-opacity"
				>
					<X className="w-3 h-3 text-red-600" />
				</Button>

				<div
					className="w-1 h-5 rounded-full opacity-0 group-hover/subtask:opacity-100 transition-all duration-200 shrink-0"
					style={{
						background:
							'linear-gradient(to bottom, var(--color-primary-400), var(--color-secondary-500))',
					}}
				/>
			</div>
		</div>
	);
}

function SortableTaskItem({
	task,
	onToggle,
	onSelect,
	onQuickDelete,
	onAddSubtask,
	onToggleStar,
	onToggleSubtask,
	onUpdateTask,
	onDeleteSubtask,
	t,
	onReorderSubtasks
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

	const [showSubtaskInput, setShowSubtaskInput] = useState(false);
	const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
	const [editingTask, setEditingTask] = useState(false);
	const [editTitle, setEditTitle] = useState(task.title);
	const [editingSubtaskId, setEditingSubtaskId] = useState(null);
	const [editSubtaskTitle, setEditSubtaskTitle] = useState('');
	const fileInputRef = useRef(null);
	const [activeSubtaskId, setActiveSubtaskId] = useState(null);

	useEffect(() => {
		setEditTitle(task.title);
	}, [task.title]);

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	const handleAddSubtask = (e) => {
		e.preventDefault();
		if (newSubtaskTitle.trim()) {
			onAddSubtask(task.id, newSubtaskTitle.trim());
			setNewSubtaskTitle('');
		}
	};

	const handleSaveEdit = () => {
		if (editTitle.trim() && editTitle !== task.title) {
			onUpdateTask(task.id, { title: editTitle.trim() });
		}
		setEditingTask(false);
	};

	const handleFileChange = async (e) => {
		const files = Array.from(e.target.files || []);
		if (!files.length) return;

		const newAttachments = await uploadFilesToAssets(files);
		onUpdateTask(task.id, {
			attachments: [...(task.attachments || []), ...newAttachments],
		});
	};

	const handlePaste = async (e) => {
		const items = e.clipboardData?.items;
		if (!items) return;

		const files = [];
		for (let i = 0; i < items.length; i++) {
			if (items[i].type.indexOf('image') !== -1) {
				const blob = items[i].getAsFile();
				if (blob) files.push(blob);
			}
		}
		if (!files.length) return;

		const newAttachments = await uploadFilesToAssets(files);
		onUpdateTask(task.id, {
			attachments: [...(task.attachments || []), ...newAttachments],
		});
	};

	const handleSubtaskDragEnd = (event) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = task.subtasks.findIndex((st) => st.id === active.id);
		const newIndex = task.subtasks.findIndex((st) => st.id === over.id);

		const reorderedSubtasks = arrayMove(task.subtasks, oldIndex, newIndex);
		onReorderSubtasks(task.id, reorderedSubtasks);
	};

	const handleEditSubtask = (subtaskId) => {
		const subtask = task.subtasks.find((st) => st.id === subtaskId);
		if (subtask) {
			setEditingSubtaskId(subtaskId);
			setEditSubtaskTitle(subtask.title);
		}
	};

	const handleSaveSubtaskEdit = () => {
		if (editSubtaskTitle.trim() && editingSubtaskId) {
			const updatedSubtasks = task.subtasks.map((st) =>
				st.id === editingSubtaskId ? { ...st, title: editSubtaskTitle.trim() } : st
			);
			onUpdateTask(task.id, { subtasks: updatedSubtasks });
		}
		setEditingSubtaskId(null);
		setEditSubtaskTitle('');
	};

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
	);

	const isRTL = document.dir === 'rtl' || document.documentElement.dir === 'rtl';

	const handleTaskClick = (e) => {
		if (
			e.target.closest('button') ||
			e.target.closest('input') ||
			e.target.closest('textarea') ||
			e.target.tagName === 'INPUT' ||
			e.target.tagName === 'BUTTON'
		) {
			return;
		}
		onSelect(task);
	};

	const handleTitleClick = () => setEditingTask(true);

	return (
		<div
			ref={setNodeRef}
			style={style}
			className="group bg-white border border-gray-200 transition-all duration-300 overflow-hidden hover:bg-gray-50"
		>
			<div className="py-3 px-5" onClick={handleTaskClick}>
				<div className="flex items-start gap-4">
					<div
						{...attributes}
						{...listeners}
						className="shrink-0 cursor-grab active:cursor-grabbing hover:bg-linear-to-br hover:from-(--color-primary-100) hover:to-(--color-secondary-100) rounded-lg p-1.5 transition-all"
					>
						<GripVertical className="w-4 h-4 text-gray-400" />
					</div>

					<CustomCheckbox
						checked={task.completed}
						onCheckedChange={() => onToggle(task.id)}
						className="shrink-0 mt-1"
					/>

					<div className="flex-1 min-w-0 mt-1">
						<div className="flex items-start gap-3">
							<div className="flex-1 min-w-0">
								<div className="flex-1">
									{editingTask ? (
										<div className="space-y-2">
											<input
												type="text"
												value={editTitle}
												onChange={(e) => setEditTitle(e.target.value)}
												onBlur={handleSaveEdit}
												onPaste={handlePaste}
												onKeyDown={(e) => {
													if (e.key === 'Enter') handleSaveEdit();
													if (e.key === 'Escape') setEditingTask(false);
												}}
												className="w-full text-base font-bold bg-transparent border-none focus:outline-none focus:ring-0 px-0"
												autoFocus
											/>
											<div className="flex items-center gap-2">
												<input
													ref={fileInputRef}
													type="file"
													accept="image/*"
													multiple
													onChange={handleFileChange}
													className="hidden"
												/>
												<Button
													type="button"
													size="sm"
													variant="outline"
													onClick={() => fileInputRef.current?.click()}
												>
													<Image className="w-3.5 h-3.5 mr-1" />
													{t('attachImage')}
												</Button>
											</div>
										</div>
									) : (
										<h3
											onClick={handleTitleClick}
											className={`font-bold font-en text-base leading-tight cursor-pointer hover:text-(--color-primary-600) transition-colors ${task.completed ? 'line-through text-gray-400' : 'text-gray-900'
												}`}
										>
											{task.title}
										</h3>
									)}
								</div>

								{task.attachments && task.attachments.length > 0 && (
									<div className="flex flex-wrap gap-2 mb-2 mt-2">
										{task.attachments.map((att, idx) => (
											<div
												key={idx}
												className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200 group/img"
											>
												<img src={att.url} alt={att.name} className="w-full h-full object-cover" />
												<div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
													<Paperclip className="w-4 h-4 text-white" />
												</div>
											</div>
										))}
									</div>
								)}

								{task.subtasks && task.subtasks.length > 0 && (
									<div className="mt-4 relative">
										<DndContext
											sensors={sensors}
											collisionDetection={closestCorners}
											onDragStart={(event) => setActiveSubtaskId(event.active.id)}
											onDragEnd={(event) => {
												handleSubtaskDragEnd(event);
												setActiveSubtaskId(null);
											}}
										>
											<SortableContext
												items={task.subtasks.map((st) => st.id)}
												strategy={verticalListSortingStrategy}
											>
												<div className="space-y-2">
													{task.subtasks.map((subtask) => (
														<SortableSubtaskItem
															key={subtask.id}
															subtask={subtask}
															onToggle={() => onToggleSubtask(task.id, subtask.id)}
															onDelete={() => onDeleteSubtask(task.id, subtask.id)}
															onEdit={() => handleEditSubtask(subtask.id)}
															isRTL={isRTL}
															editingSubtaskId={editingSubtaskId}
															editSubtaskTitle={editSubtaskTitle}
															setEditSubtaskTitle={setEditSubtaskTitle}
															onSaveEdit={handleSaveSubtaskEdit}
														/>
													))}
												</div>
											</SortableContext>

											<DragOverlay>
												{activeSubtaskId ? (
													<div className="bg-white border-2 border-(--color-primary-500) shadow-2xl p-3 opacity-90 rounded">
														<span className="text-sm font-medium">
															{task.subtasks.find((st) => st.id === activeSubtaskId)?.title}
														</span>
													</div>
												) : null}
											</DragOverlay>
										</DndContext>
									</div>
								)}
							</div>
						</div>
					</div>

					<div className="flex items-center gap-2 transition-all duration-300">
						<button onClick={() => onToggleStar(task.id)} className="group/action relative">
							<div
								className={`
								relative h-8 w-8 rounded-lg flex items-center justify-center
								transition-all duration-500 ease-out
								${task.isStarred
										? 'bg-linear-to-br from-yellow-400 via-yellow-500 to-amber-600 shadow-lg shadow-yellow-500/50 scale-105'
										: 'bg-white/80 backdrop-blur-sm border-2 border-gray-200 hover:border-yellow-400 hover:shadow-lg hover:shadow-yellow-500/30 hover:scale-105'
									}
							`}
							>
								{task.isStarred && (
									<div className="absolute inset-0 rounded-lg bg-linear-to-br from-yellow-300 to-amber-500 blur-md opacity-60 animate-pulse" />
								)}

								<div className="relative z-10">
									{task.isStarred ? (
										<Star className="w-4 h-4 text-white fill-white drop-shadow-md" />
									) : (
										<Star className="w-4 h-4 text-gray-400 group-hover/action:text-yellow-500 transition-colors duration-300" />
									)}
								</div>

								<div className="absolute inset-0 rounded-lg overflow-hidden opacity-0 group-hover/action:opacity-100 transition-opacity duration-500">
									<div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/action:translate-x-full transition-transform duration-1000" />
								</div>
							</div>
						</button>

						{!task.completed && (
							<button
								onClick={() => setShowSubtaskInput(!showSubtaskInput)}
								className="group/action relative"
							>
								<div
									className={`
									relative h-8 w-8 rounded-lg flex items-center justify-center
									transition-all duration-500 ease-out
									${showSubtaskInput
											? 'bg-linear-to-br from-green-400 via-emerald-500 to-teal-600 shadow-lg shadow-green-500/50 scale-105'
											: 'bg-white/80 backdrop-blur-sm border-2 border-gray-200 hover:border-green-400 hover:shadow-lg hover:shadow-green-500/30 hover:scale-105'
										}
								`}
								>
									{showSubtaskInput && (
										<div className="absolute inset-0 rounded-lg bg-linear-to-br from-green-300 to-teal-500 blur-md opacity-60 animate-pulse" />
									)}

									<div
										className={`relative z-10 transition-transform duration-500 ${showSubtaskInput ? 'rotate-180' : 'rotate-0'
											}`}
									>
										{showSubtaskInput ? (
											<X className="w-4 h-4 text-white drop-shadow-md" />
										) : (
											<Plus className="w-4 h-4 text-gray-400 group-hover/action:text-green-500 transition-colors duration-300" />
										)}
									</div>

									<div className="absolute inset-0 rounded-lg overflow-hidden opacity-0 group-hover/action:opacity-100 transition-opacity duration-500">
										<div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/action:translate-x-full transition-transform duration-1000" />
									</div>
								</div>
							</button>
						)}

						<button onClick={() => onQuickDelete(task.id)} className="group/action relative">
							<div className="relative h-8 w-8 rounded-lg flex items-center justify-center bg-white/80 backdrop-blur-sm border-2 border-gray-200 hover:border-red-400 transition-all duration-500 ease-out hover:shadow-lg hover:shadow-red-500/30 hover:scale-105">
								<div className="absolute inset-0 rounded-lg bg-linear-to-br from-red-300 to-rose-500 blur-md opacity-0 group-hover/action:opacity-60 transition-opacity duration-500" />
								<div className="relative z-10">
									<Trash2 className="w-4 h-4 text-gray-400 group-hover/action:text-red-500 transition-all duration-300 group-hover/action:scale-110" />
								</div>
								<div className="absolute inset-0 rounded-lg overflow-hidden opacity-0 group-hover/action:opacity-100 transition-opacity duration-500">
									<div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/action:translate-x-full transition-transform duration-1000" />
								</div>
							</div>
						</button>
					</div>
				</div>

				{!task.completed && showSubtaskInput && (
					<div className="mt-4 pt-4 border-t border-gray-200 ml-14">
						<form onSubmit={handleAddSubtask} className="flex gap-2">
							<Input
								type="text"
								value={newSubtaskTitle}
								onChange={(e) => setNewSubtaskTitle(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter' && e.shiftKey) {
										e.preventDefault();
										handleAddSubtask(e);
									}
								}}
								placeholder={t('subtaskPlaceholder')}
								className="text-sm bg-white border-2 border-(--color-primary-200) focus:border-(--color-primary-400)"
								autoFocus
							/>
							<Button
								type="submit"
								size="sm"
								className="bg-linear-to-r from-(--color-gradient-from) to-(--color-gradient-to)"
							>
								<Check className="w-4 h-4" />
							</Button>
							<Button type="button" size="sm" variant="ghost" onClick={() => setShowSubtaskInput(false)}>
								<X className="w-4 h-4" />
							</Button>
						</form>
					</div>
				)}
			</div>
		</div>
	);
}




export default function TodoTab() {
	const t = useTranslations('todo');
	const t_navbar = useTranslations('navbar');
	const locale = useLocale();
	const isRTL = locale === 'ar';
	const router = useRouter();
	const searchParams = useSearchParams();

	const currentTab = searchParams.get('tab') || 'tasks';

	const handleTabChange = (tab) => {
		const params = new URLSearchParams(searchParams);
		params.set('tab', tab);
		router.push(`?${params.toString()}`);
	};

	const [settings, setSettings] = useState({
		soundEnabled: true,
		showCompleted: true,
		addTaskPosition: 'top',
	});

	// ✅ Start empty; load from API
	const [folders, setFolders] = useState([]);
	const [tasks, setTasks] = useState([]);

	const [loading, setLoading] = useState(true);

	const [selectedFolder, setSelectedFolder] = useState('inbox');
	const [selectedTask, setSelectedTask] = useState(null);
	const [showAddFolder, setShowAddFolder] = useState(false);
	const [newFolderName, setNewFolderName] = useState('');
	const [newFolderColor, setNewFolderColor] = useState('var(--color-primary-600)');
	const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
	const [filterPriority, setFilterPriority] = useState('all');
	const [sortBy, setSortBy] = useState('manual');
	const [activeId, setActiveId] = useState(null);
	const [showSettings, setShowSettings] = useState(false);
	const [showTaskSidebar, setShowTaskSidebar] = useState(false);
	const [showDeleteFolderConfirm, setShowDeleteFolderConfirm] = useState(false);
	const [folderToDelete, setFolderToDelete] = useState(null);
	const [keepAddingTasks, setKeepAddingTasks] = useState(true);

	// localStorage order map cached
	const orderMapRef = useRef({}); // { [folderId]: string[] }

	const handleReorderSubtasks = async (taskId, reorderedSubtasks) => {
		const task = tasks.find((t) => t.id === taskId);
		if (!task) return;

		// optimistic reorder locally
		setTasks((prev) =>
			prev.map((t) => (t.id === taskId ? { ...t, subtasks: reorderedSubtasks } : t))
		);
		if (selectedTask?.id === taskId) setSelectedTask((prev) => ({ ...prev, subtasks: reorderedSubtasks }));

		try {
			// only send real ids to server (skip tmp)
			const real = reorderedSubtasks.filter((st) => !String(st.id).startsWith('tmpst-'));

			await api.post('/tasks/subtasks/reorder', {
				taskId,
				items: real.map((st, idx) => ({ id: st.id, orderIndex: idx })),
			});
		} catch (e) {
			console.error('Reorder subtasks failed', e);
			// rollback
			setTasks((prev) => prev.map((t) => (t.id === taskId ? task : t)));
			if (selectedTask?.id === taskId) setSelectedTask(task);
		}
	};

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 8 },
		})
	);

	// ✅ Load folders + tasks from API
	useEffect(() => {
		let mounted = true;

		// load order map once on client
		orderMapRef.current = loadOrderMap();

		const load = async () => {
			setLoading(true);
			try {
				const [foldersRes, tasksRes] = await Promise.all([
					api.get('/todo/folders'),
					api.get('/todos'),
				]);

				const foldersArr = Array.isArray(foldersRes) ? foldersRes : foldersRes?.data || [];
				const tasksArr = Array.isArray(tasksRes) ? tasksRes : tasksRes?.data || [];

				const normalizedFolders = foldersArr.map(normalizeFolder);
				let normalizedTasks = tasksArr.map(normalizeTask);

				// Always ensure system folders exist in UI
				const system = [
					{ id: 'inbox', name: 'inbox', color: 'var(--color-primary-600)', icon: Inbox, isSystem: true },
					{ id: 'today', name: 'today', color: '#f59e0b', icon: Sun, isSystem: true },
					{ id: 'starred', name: 'starred', color: '#eab308', icon: Star, isSystem: true },
				];

				const mergedFolders = [
					...system,
					...normalizedFolders
						.filter((f) => !['inbox', 'today', 'starred'].includes(f.id))
						.map((f) => ({ ...f, icon: Folder, isSystem: false })),
				];

				// ✅ apply saved order for each folder (including inbox)
				const map = orderMapRef.current || {};
				for (const folderId of Object.keys(map)) {
					normalizedTasks = applyOrderToTasks(normalizedTasks, folderId, map[folderId]);
				}

				if (!mounted) return;
				setFolders(mergedFolders);
				setTasks(normalizedTasks);

				const hasSelected = mergedFolders.some((f) => f.id === selectedFolder);
				if (!hasSelected) setSelectedFolder('inbox');
			} catch (e) {
				console.error('Failed to load todo data', e);

				if (!mounted) return;
				setFolders([
					{ id: 'inbox', name: 'inbox', color: 'var(--color-primary-600)', icon: Inbox, isSystem: true },
					{ id: 'today', name: 'today', color: '#f59e0b', icon: Sun, isSystem: true },
					{ id: 'starred', name: 'starred', color: '#eab308', icon: Star, isSystem: true },
				]);
				setTasks([]);
			} finally {
				if (mounted) setLoading(false);
			}
		};

		load();
		return () => {
			mounted = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// ======================
	// API-backed CRUD
	// ======================

	const handleAddTask = async (title, attachments = []) => {
		if (!title.trim()) return;

		const folderId =
			selectedFolder === 'today' || selectedFolder === 'starred'
				? 'inbox'
				: selectedFolder;

		// Find folder UUID if needed
		let folderUUID = folderId;
		if (!/^[0-9a-fA-F-]{36}$/.test(folderId)) {
			const found = folders.find((f) => f.id === folderId);
			if (found && found.uuid) folderUUID = found.uuid;
		}

		const payload = {
			title: title.trim(),
			folderId: folderUUID,
			completed: false,
			status: 'todo',
			priority: 'none',
			dueDate: selectedFolder === 'today' ? new Date().toISOString().split('T')[0] : null,
			dueTime: null,
			repeat: 'none',
			customRepeatDays: null,
			tags: [],
			isStarred: selectedFolder === 'starred',
			notes: '',
			attachments,
		};

		const tempId = `tmp-${Date.now()}`;
		const optimistic = {
			id: tempId,
			...payload,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		setTasks((prev) => {
			const next =
				settings.addTaskPosition === 'top' ? [optimistic, ...prev] : [...prev, optimistic];

			// ✅ update local order immediately for this folder
			const scopeFolderId = folderId;
			const current = orderMapRef.current || {};
			const folderOrder = (current[scopeFolderId] || []).filter((id) => id !== tempId);
			const nextOrder =
				settings.addTaskPosition === 'top'
					? [tempId, ...folderOrder]
					: [...folderOrder, tempId];

			current[scopeFolderId] = nextOrder;
			orderMapRef.current = current;
			saveOrderMap(current);

			return next;
		});

		try {
			const res = await api.post('/todos', payload);
			const created = normalizeTask(res?.data ?? res);

			setTasks((prev) => prev.map((t) => (t.id === tempId ? created : t)));

			// ✅ replace tempId in order with real id
			const scopeFolderId = folderId;
			const current = orderMapRef.current || {};
			if (Array.isArray(current[scopeFolderId])) {
				current[scopeFolderId] = current[scopeFolderId].map((id) => (id === tempId ? created.id : id));
				orderMapRef.current = current;
				saveOrderMap(current);
			}
		} catch (e) {
			console.error('Create task failed', e);
			setTasks((prev) => prev.filter((t) => t.id !== tempId));

			// remove tempId from order
			const scopeFolderId = folderId;
			const current = orderMapRef.current || {};
			if (Array.isArray(current[scopeFolderId])) {
				current[scopeFolderId] = current[scopeFolderId].filter((id) => id !== tempId);
				orderMapRef.current = current;
				saveOrderMap(current);
			}
		}
	};

	const handleToggleTask = async (taskId) => {
		const task = tasks.find((t) => t.id === taskId);
		if (!task) return;

		playSound(task.completed ? 'uncheck' : 'check', settings.soundEnabled);

		const updates = {
			completed: !task.completed,
			status: !task.completed ? 'completed' : 'todo',
			updatedAt: new Date(),
		};

		setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)));
		if (selectedTask?.id === taskId) setSelectedTask((prev) => ({ ...prev, ...updates }));

		try {
			if (String(taskId).startsWith('tmp-')) return;
			await api.patch(`/todos/${taskId}`, {
				...task,
				...updates,
				updatedAt: new Date().toISOString(),
				createdAt: task.createdAt instanceof Date ? task.createdAt.toISOString() : task.createdAt,
			});
		} catch (e) {
			console.error('Toggle task failed', e);
			setTasks((prev) => prev.map((t) => (t.id === taskId ? task : t)));
			if (selectedTask?.id === taskId) setSelectedTask(task);
		}
	};

	const handleUpdateTask = async (taskId, updates) => {
		const task = tasks.find((t) => t.id === taskId);
		if (!task) return;

		const merged = { ...task, ...updates, updatedAt: new Date() };

		setTasks((prev) => prev.map((t) => (t.id === taskId ? merged : t)));
		if (selectedTask?.id === taskId) setSelectedTask(merged);

		try {
			if (String(taskId).startsWith('tmp-')) return;

			const payload = {
				...merged,
				createdAt: merged.createdAt instanceof Date ? merged.createdAt.toISOString() : merged.createdAt,
				updatedAt: new Date().toISOString(),
			};

			const res = await api.patch(`/todos/${taskId}`, payload);
			const saved = normalizeTask(res?.data ?? res);

			setTasks((prev) => prev.map((t) => (t.id === taskId ? saved : t)));
			if (selectedTask?.id === taskId) setSelectedTask(saved);
		} catch (e) {
			console.error('Update task failed', e);
			setTasks((prev) => prev.map((t) => (t.id === taskId ? task : t)));
			if (selectedTask?.id === taskId) setSelectedTask(task);
		}
	};

	const handleDeleteTask = async (taskId) => {
		const prev = tasks;

		// remove from local order map (for the task's folder)
		const task = tasks.find((t) => t.id === taskId);
		if (task) {
			const current = orderMapRef.current || {};
			const folderId = task.folderId || 'inbox';
			if (Array.isArray(current[folderId])) {
				current[folderId] = current[folderId].filter((id) => id !== taskId);
				orderMapRef.current = current;
				saveOrderMap(current);
			}
		}

		setTasks((p) => p.filter((t) => t.id !== taskId));
		if (selectedTask?.id === taskId) {
			setSelectedTask(null);
			setShowTaskSidebar(false);
		}

		try {
			if (String(taskId).startsWith('tmp-')) return;
			await api.delete(`/todos/${taskId}`);
		} catch (e) {
			console.error('Delete task failed', e);
			setTasks(prev);
		}
	};

	const handleSelectTask = (task) => {
		setSelectedTask(task);
		setShowTaskSidebar(true);
	};

	const handleAddSubtask = async (taskId, subtaskTitle) => {
		const task = tasks.find((t) => t.id === taskId);
		if (!task) return;

		// optimistic UI subtask (tmp id)
		const tmpId = `tmpst-${Date.now()}`;
		const optimistic = { id: tmpId, title: subtaskTitle, completed: false, orderIndex: (task.subtasks?.length || 0) };

		setTasks((prev) =>
			prev.map((t) => (t.id === taskId ? { ...t, subtasks: [...(t.subtasks || []), optimistic] } : t))
		);
		if (selectedTask?.id === taskId) {
			setSelectedTask((prev) => ({ ...prev, subtasks: [...(prev.subtasks || []), optimistic] }));
		}

		try {
			if (String(taskId).startsWith('tmp-')) return; // task not saved yet

			const res = await api.post(`/tasks/${taskId}/subtasks`, { title: subtaskTitle, completed: false });
			const created = normalizeSubtask(res?.data ?? res);

			setTasks((prev) =>
				prev.map((t) =>
					t.id === taskId
						? { ...t, subtasks: (t.subtasks || []).map((st) => (st.id === tmpId ? created : st)) }
						: t
				)
			);
			if (selectedTask?.id === taskId) {
				setSelectedTask((prev) => ({
					...prev,
					subtasks: (prev.subtasks || []).map((st) => (st.id === tmpId ? created : st)),
				}));
			}
		} catch (e) {
			console.error('Add subtask failed', e);
			// rollback
			setTasks((prev) =>
				prev.map((t) =>
					t.id === taskId ? { ...t, subtasks: (t.subtasks || []).filter((st) => st.id !== tmpId) } : t
				)
			);
			if (selectedTask?.id === taskId) {
				setSelectedTask((prev) => ({
					...prev,
					subtasks: (prev.subtasks || []).filter((st) => st.id !== tmpId),
				}));
			}
		}
	};


	const handleToggleSubtask = async (taskId, subtaskId) => {
		const task = tasks.find((t) => t.id === taskId);
		if (!task) return;

		const st = task.subtasks?.find((x) => x.id === subtaskId);
		if (!st) return;

		playSound(st.completed ? 'uncheck' : 'check', settings.soundEnabled);

		// optimistic toggle
		setTasks((prev) =>
			prev.map((t) =>
				t.id === taskId
					? { ...t, subtasks: (t.subtasks || []).map((x) => (x.id === subtaskId ? { ...x, completed: !x.completed } : x)) }
					: t
			)
		);
		if (selectedTask?.id === taskId) {
			setSelectedTask((prev) => ({
				...prev,
				subtasks: (prev.subtasks || []).map((x) => (x.id === subtaskId ? { ...x, completed: !x.completed } : x)),
			}));
		}

		try {
			// tmp subtasks (client-only) can't be toggled on server
			if (String(subtaskId).startsWith('tmpst-')) return;

			await api.post(`/tasks/${taskId}/subtasks/${subtaskId}/toggle`);
		} catch (e) {
			console.error('Toggle subtask failed', e);
			// rollback
			setTasks((prev) =>
				prev.map((t) =>
					t.id === taskId
						? { ...t, subtasks: (t.subtasks || []).map((x) => (x.id === subtaskId ? st : x)) }
						: t
				)
			);
			if (selectedTask?.id === taskId) {
				setSelectedTask((prev) => ({
					...prev,
					subtasks: (prev.subtasks || []).map((x) => (x.id === subtaskId ? st : x)),
				}));
			}
		}
	};


	const handleDeleteSubtask = async (taskId, subtaskId) => {
		const task = tasks.find((t) => t.id === taskId);
		if (!task) return;

		const prevSubtasks = task.subtasks || [];

		// optimistic delete
		setTasks((prev) =>
			prev.map((t) =>
				t.id === taskId ? { ...t, subtasks: (t.subtasks || []).filter((st) => st.id !== subtaskId) } : t
			)
		);
		if (selectedTask?.id === taskId) {
			setSelectedTask((prev) => ({
				...prev,
				subtasks: (prev.subtasks || []).filter((st) => st.id !== subtaskId),
			}));
		}

		try {
			if (String(subtaskId).startsWith('tmpst-')) return;
			await api.delete(`/tasks/${taskId}/subtasks/${subtaskId}`);
		} catch (e) {
			console.error('Delete subtask failed', e);
			// rollback
			setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, subtasks: prevSubtasks } : t)));
			if (selectedTask?.id === taskId) setSelectedTask((prev) => ({ ...prev, subtasks: prevSubtasks }));
		}
	};


	const handleToggleStar = (taskId) => {
		const task = tasks.find((t) => t.id === taskId);
		if (!task) return;
		handleUpdateTask(taskId, { isStarred: !task.isStarred });
	};

	const handleAddFolder = async () => {
		if (!newFolderName.trim()) return;

		const payload = {
			name: newFolderName.trim(),
			color: newFolderColor,
			isSystem: false,
		};

		const tempId = `tmpf-${Date.now()}`;
		const optimistic = {
			id: tempId,
			name: payload.name,
			color: payload.color,
			icon: Folder,
			isSystem: false,
		};

		setFolders((prev) => [...prev, optimistic]);
		setNewFolderName('');
		setNewFolderColor('var(--color-primary-600)');
		setShowAddFolder(false);
		setSelectedFolder(tempId);

		try {
			const res = await api.post('/todo-folders', payload);
			const created = normalizeFolder(res?.data ?? res);
			created.icon = Folder;
			created.isSystem = false;

			setFolders((prev) => prev.map((f) => (f.id === tempId ? created : f)));
			setSelectedFolder(created.id);
		} catch (e) {
			console.error('Create folder failed', e);
			setFolders((prev) => prev.filter((f) => f.id !== tempId));
			setSelectedFolder('inbox');
		}
	};

	const handleDeleteFolder = async (folderId) => {
		const prevFolders = folders;
		const prevTasks = tasks;

		// remove order scope for that folder
		const current = orderMapRef.current || {};
		if (current[folderId]) {
			delete current[folderId];
			orderMapRef.current = current;
			saveOrderMap(current);
		}

		setTasks((prev) => prev.map((t) => (t.folderId === folderId ? { ...t, folderId: 'inbox' } : t)));
		setFolders((prev) => prev.filter((f) => f.id !== folderId));
		setSelectedFolder('inbox');
		setShowDeleteFolderConfirm(false);
		setFolderToDelete(null);

		try {
			if (String(folderId).startsWith('tmpf-')) return;
			await api.delete(`/todo-folders/${folderId}`);
		} catch (e) {
			console.error('Delete folder failed', e);
			setFolders(prevFolders);
			setTasks(prevTasks);
		}
	};

	// Drag reorder
	const handleDragStart = (event) => setActiveId(event.active.id);

	const handleDragEnd = (event) => {
		const { active, over } = event;
		setActiveId(null);
		if (!over || active.id === over.id) return;

		// ✅ allow reorder only in manual sort mode
		if (sortBy !== 'manual') return;

		const scopeFolderId = getFolderScopeId(selectedFolder);

		setTasks((prev) => {
			// reorder inside visible list, but persist for the folder list
			const visible = getFilteredTasks(prev);
			const oldIndex = visible.findIndex((t) => t.id === active.id);
			const newIndex = visible.findIndex((t) => t.id === over.id);
			if (oldIndex === -1 || newIndex === -1) return prev;

			const movedVisible = arrayMove(visible, oldIndex, newIndex);
			const movedIds = new Set(movedVisible.map((t) => t.id));

			const rest = prev.filter((t) => !movedIds.has(t.id));
			const next = [...movedVisible, ...rest];

			// ✅ Persist order for this folder scope
			const current = orderMapRef.current || {};
			current[scopeFolderId] = computeFolderOrder(next, scopeFolderId);
			orderMapRef.current = current;
			saveOrderMap(current);

			// OPTIONAL: backend persistence (if you create endpoint)
			// api.patch('/todos/reorder', { folderId: scopeFolderId, orderedIds: current[scopeFolderId] }).catch(console.error);

			return next;
		});
	};

	const getFilteredTasks = (inputTasks = tasks) => {
		let filtered = [...inputTasks];

		if (selectedFolder === 'today') {
			const today = new Date().toISOString().split('T')[0];
			filtered = filtered.filter((t) => {
				if (t.dueDate === today) return true;
				if (t.repeat === 'daily') return true;
				return false;
			});
		} else if (selectedFolder === 'starred') {
			filtered = filtered.filter((t) => t.isStarred);
		} else if (selectedFolder !== 'inbox') {
			filtered = filtered.filter((t) => t.folderId === selectedFolder);
		}

		if (!settings.showCompleted) filtered = filtered.filter((t) => !t.completed);

		if (filterPriority && filterPriority !== 'all') {
			filtered = filtered.filter((t) => t.priority === filterPriority);
		}

		if (sortBy === 'dueDate') {
			filtered.sort((a, b) => {
				if (!a.dueDate) return 1;
				if (!b.dueDate) return -1;
				return new Date(a.dueDate) - new Date(b.dueDate);
			});
		} else if (sortBy === 'priority') {
			const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };
			filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
		} else if (sortBy === 'alphabetical') {
			filtered.sort((a, b) => a.title.localeCompare(b.title));
		}
		// sortBy === 'manual' means: keep current array order (we persist it)

		return filtered;
	};

	const filteredTasks = getFilteredTasks();
	const currentFolder = folders.find((f) => f.id === selectedFolder);
	const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

	return (
		<div className="flex mt-[-20px] w-[calc(100%+50px)] relative ltr:right-[25px] rtl:left-[25px] overflow-hidden">
			{/* Left Sidebar */}
			<div
				className={`bg-white border-${isRTL ? 'l' : 'r'}-2 border-gray-100 transition-all duration-300 flex-shrink-0 ${sidebarCollapsed ? 'w-20' : 'w-80'
					}`}
			>
				<div className="h-full flex flex-col">
					<div className="p-4 border-b-2 border-gray-100 flex items-center justify-between">
						{!sidebarCollapsed && (
							<div className="flex-none w-[150px] flex items-center gap-2">
								<Button
									onClick={() =>
										setSettings({ ...settings, soundEnabled: !settings.soundEnabled })
									}
									variant={settings.soundEnabled ? 'default' : 'outline'}
									size="sm"
									className="flex-1 !h-[35px]"
								>
									{settings.soundEnabled ? (
										<Volume2 className="w-4 h-4" />
									) : (
										<VolumeX className="w-4 h-4" />
									)}
								</Button>
								<Button
									onClick={() => setShowSettings(true)}
									variant="outline"
									size="sm"
									className="flex-1 !h-[35px]"
								>
									<Settings className="w-4 h-4" />
								</Button>
							</div>
						)}
						<button
							onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
							className="p-2.5 hover:bg-gray-100 rounded-lg transition-all hover:scale-110"
						>
							<Menu className="w-5 h-5 text-gray-600" />
						</button>
					</div>

					<div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin">
						<div className="mb-6">
							{folders
								.filter((f) => f.isSystem)
								.map((folder) => {
									const Icon = folder.icon;
									const count =
										folder.id === 'inbox'
											? tasks.filter(
												(t) =>
													t.folderId === 'inbox' &&
													(!t.completed || settings.showCompleted)
											).length
											: folder.id === 'today'
												? getFilteredTasks().filter(
													(t) => !t.completed || settings.showCompleted
												).length
												: folder.id === 'starred'
													? tasks.filter(
														(t) =>
															t.isStarred && (!t.completed || settings.showCompleted)
													).length
													: 0;

									return (
										<button
											key={folder.id}
											onClick={() => setSelectedFolder(folder.id)}
											className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all group mb-1 ${selectedFolder === folder.id
												? 'bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white shadow-lg scale-[1.02]'
												: 'hover:bg-gray-50 text-gray-700'
												}`}
										>
											<Icon
												className={`w-5 h-5 flex-shrink-0 ${selectedFolder === folder.id ? 'text-white' : ''
													}`}
												style={{
													color:
														selectedFolder !== folder.id ? folder.color : undefined,
												}}
											/>
											{!sidebarCollapsed && (
												<>
													<span className="flex-1 text-left font-bold text-sm">
														{t.has(`folders.${folder.name}`)
															? t(`folders.${folder.name}`)
															: folder.name}
													</span>
													{count > 0 && (
														<span
															className={`px-2.5 py-1 rounded-lg text-xs font-black ${selectedFolder === folder.id
																? 'bg-white/20 text-white'
																: 'bg-gray-100 text-gray-700'
																}`}
														>
															{count}
														</span>
													)}
												</>
											)}
										</button>
									);
								})}
						</div>

						<div>
							{!sidebarCollapsed && (
								<div className="flex items-center justify-between mb-3 px-3">
									<h3 className="text-xs font-black text-gray-500 uppercase tracking-wider">
										{t('myFolders')}
									</h3>
									<button
										onClick={() => setShowAddFolder(true)}
										className="flex items-center gap-2 px-3 py-2 bg-[var(--color-primary-100)] hover:bg-[var(--color-primary-200)] rounded-lg transition-all hover:scale-110 shadow-sm"
									>
										<FolderPlus className="w-4 h-4 text-[var(--color-primary-700)]" />
										<span className="text-sm font-medium text-[var(--color-primary-700)]">
											{t('addFolder')}
										</span>
									</button>
								</div>
							)}

							{folders
								.filter((f) => !f.isSystem)
								.map((folder) => {
									const Icon = folder.icon;
									const count = tasks.filter(
										(t) =>
											t.folderId === folder.id &&
											(!t.completed || settings.showCompleted)
									).length;

									return (
										<button
											onClick={() => setSelectedFolder(folder.id)}
											className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all ${selectedFolder === folder.id
												? 'bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white shadow-lg scale-[1.02]'
												: 'hover:bg-gray-50 text-gray-700'
												}`}
											key={folder.id}
										>
											<Icon
												className={`w-5 h-5 flex-shrink-0 ${selectedFolder === folder.id ? 'text-white' : ''
													}`}
												style={{
													color:
														selectedFolder !== folder.id ? folder.color : undefined,
												}}
											/>
											{!sidebarCollapsed && (
												<>
													<span className="flex-1 text-left font-bold text-sm truncate">
														{t.has(`folders.${folder.name}`)
															? t(`folders.${folder.name}`)
															: folder.name}
													</span>
													{count > 0 && (
														<span
															className={`px-2.5 py-1 rounded-lg text-xs font-black ${selectedFolder === folder.id
																? 'bg-white/20 text-white'
																: 'bg-gray-100 text-gray-700'
																}`}
														>
															{count}
														</span>
													)}
												</>
											)}

											{!sidebarCollapsed && !folder.isSystem && (
												<button
													onClick={(e) => {
														e.stopPropagation();
														setFolderToDelete(folder.id);
														setShowDeleteFolderConfirm(true);
													}}
													className="p-1.5 bg-red-500 hover:bg-red-600 rounded-lg transition-all shadow-lg hover:scale-110"
												>
													<Trash2 className="w-3 h-3 text-white" />
												</button>
											)}
										</button>
									);
								})}
						</div>

						{showAddFolder && !sidebarCollapsed && (
							<div className="mt-4 p-5 bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-secondary-50)] rounded-lg border-2 border-[var(--color-primary-200)] shadow-lg">
								<Input
									type="text"
									value={newFolderName}
									onChange={(e) => setNewFolderName(e.target.value)}
									onKeyDown={(e) => e.key === 'Enter' && handleAddFolder()}
									placeholder={t('folderNamePlaceholder')}
									className="mb-4"
									autoFocus
								/>
								<div className="flex items-center gap-3 mb-4">
									<input
										type="color"
										value={newFolderColor}
										onChange={(e) => setNewFolderColor(e.target.value)}
										className="w-14 h-14 rounded-lg cursor-pointer border-2 border-gray-200 shadow-sm"
									/>
									<span className="text-sm text-gray-700 font-bold">
										{t('pickColor')}
									</span>
								</div>
								<div className="flex gap-2">
									<Button
										onClick={handleAddFolder}
										className="flex-1 bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)]"
									>
										{t('add')}
									</Button>
									<Button onClick={() => setShowAddFolder(false)} variant="outline">
										{t('cancel')}
									</Button>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="flex-1 flex flex-col overflow-hidden">
				<div className="bg-white border-b-2 border-gray-100 p-6 shadow-sm">
					<div className="flex items-center justify-between mb-6">
						<div className="flex items-center gap-4">
							{currentFolder && (
								<>
									{(() => {
										const Icon = currentFolder.icon;
										return (
											<div
												className="p-4 rounded-lg border border-[var(--color-primary-100)]"
												style={{ backgroundColor: `${currentFolder.color}15` }}
											>
												<Icon className="w-8 h-8" style={{ color: currentFolder.color }} />
											</div>
										);
									})()}
									<div>
										<h2 className="text-4xl font-black text-gray-900">
											{t.has(`folders.${currentFolder.name}`)
												? t(`folders.${currentFolder.name}`)
												: currentFolder.name}
										</h2>
										<p className="text-sm text-gray-600 mt-2 font-semibold">
											{filteredTasks.filter((t) => !t.completed).length} {t('active')} ·{' '}
											{filteredTasks.filter((t) => t.completed).length} {t('completed')}
										</p>
									</div>
								</>
							)}
						</div>

						<div className="flex items-center gap-3">
							<Select value={currentTab} onValueChange={handleTabChange}>
								<SelectTrigger className="w-[150px] !h-[36px] bg-white transition-all border-1 border-[var(--color-primary-300)] rounded-lg font-bold">
									<SelectValue>
										<div className="flex items-center gap-2">
											<span className="text-[var(--color-primary-900)]">
												{t_navbar(TAB_OPTIONS.find((tab) => tab.value === currentTab)?.label)}
											</span>
											{TAB_OPTIONS.find((tab) => tab.value === currentTab)?.icon &&
												(() => {
													const Icon = TAB_OPTIONS.find((tab) => tab.value === currentTab)?.icon;
													return Icon ? <Icon className="h-4 w-4 stroke-[var(--color-primary-900)]" /> : null;
												})()}
										</div>
									</SelectValue>
								</SelectTrigger>
								<SelectContent className="rounded-lg shadow-2xl border-2">
									{TAB_OPTIONS.map((tab) => (
										<SelectItem key={tab.value} value={tab.value} className="rounded-lg my-1">
											<div className="flex items-center gap-2">
												{t_navbar(tab.label)}
												<tab.icon className="h-4 w-4" />
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							<FilterSelect value={filterPriority} onChange={setFilterPriority} t={t} />
							<SortSelect value={sortBy} onChange={setSortBy} t={t} />
						</div>
					</div>
				</div>

				<QuickAddTask onAdd={handleAddTask} t={t} keepAdding={keepAddingTasks} />

				<div className="max-w-6xl w-full px-2 mx-auto mt-2 flex-1 overflow-y-auto scrollbar-thin">
					{loading ? (
						<div className="py-16 text-center text-gray-600 font-semibold">
							Loading...
						</div>
					) : filteredTasks.length === 0 ? (
						<EmptyState selectedFolder={selectedFolder} t={t} />
					) : (
						<DndContext
							sensors={sensors}
							collisionDetection={closestCorners}
							onDragStart={handleDragStart}
							onDragEnd={handleDragEnd}
						>
							<SortableContext items={filteredTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
								<div className="space-y-1">
									{filteredTasks.map((task) => (
										<SortableTaskItem
											onReorderSubtasks={handleReorderSubtasks}

											key={task.id}
											task={task}
											onToggle={handleToggleTask}
											onSelect={handleSelectTask}
											onQuickDelete={handleDeleteTask}
											onAddSubtask={handleAddSubtask}
											onToggleStar={handleToggleStar}
											onToggleSubtask={handleToggleSubtask}
											onDeleteSubtask={handleDeleteSubtask}
											onUpdateTask={handleUpdateTask}
											isSelected={selectedTask?.id === task.id}
											t={t}
											soundEnabled={settings.soundEnabled}
										/>
									))}
								</div>
							</SortableContext>

							<DragOverlay>
								{activeTask ? (
									<div className="bg-white border-2 border-[var(--color-primary-500)] shadow-2xl p-5 opacity-90 rotate-2">
										<h3 className="font-bold text-gray-800">{activeTask.title}</h3>
									</div>
								) : null}
							</DragOverlay>
						</DndContext>
					)}
				</div>
			</div>

			{showTaskSidebar && selectedTask && (
				<>
					<div
						className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
						onClick={() => setShowTaskSidebar(false)}
					/>
					<TaskDetailSidebar
						task={selectedTask}
						onUpdate={handleUpdateTask}
						onDelete={handleDeleteTask}
						onClose={() => setShowTaskSidebar(false)}
						onToggleSubtask={handleToggleSubtask}
						onDeleteSubtask={handleDeleteSubtask}
						soundEnabled={settings.soundEnabled}
						isRTL={isRTL}
						t={t}
						locale={locale}
					/>
				</>
			)}

			<SettingsDialog
				open={showSettings}
				onClose={() => setShowSettings(false)}
				settings={settings}
				onUpdateSettings={setSettings}
				t={t}
			/>

			<Dialog
				open={showDeleteFolderConfirm}
				onOpenChange={() => {
					setShowDeleteFolderConfirm(false);
					setFolderToDelete(null);
				}}
			>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle className="text-xl font-bold">{t('deleteFolder')}</DialogTitle>
						<DialogDescription className="text-sm text-gray-600 mt-2">
							{t('deleteFolderDescription')}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="gap-2 mt-4">
						<Button
							variant="outline"
							onClick={() => {
								setShowDeleteFolderConfirm(false);
								setFolderToDelete(null);
							}}
						>
							{t('cancel')}
						</Button>
						<Button variant="destructive" onClick={() => handleDeleteFolder(folderToDelete)}>
							{t('confirm')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// Quick Add Task Component
function QuickAddTask({ onAdd, t, keepAdding }) {
	const [tasks, setTasks] = useState([{ id: '1', title: '', attachments: [] }]);
	const fileInputRefs = useRef({});

	const handleSubmit = async (taskId, e) => {
		e?.preventDefault();
		const task = tasks.find((t) => t.id === taskId);
		if (task && task.title.trim()) {
			await onAdd(task.title, task.attachments);

			if (keepAdding) {
				setTasks([
					...tasks.filter((t) => t.id !== taskId),
					{ id: Date.now().toString(), title: '', attachments: [] },
				]);
			} else {
				setTasks(tasks.map((t) => (t.id === taskId ? { ...t, title: '', attachments: [] } : t)));
			}
		}
	};

	const handleKeyDown = (taskId, e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit(taskId, e);
		}
	};

	const updateTask = (taskId, updates) => {
		setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)));
	};

	const handleFileChange = async (taskId, e) => {
		const files = Array.from(e.target.files || []);
		if (!files.length) return;

		const newAttachments = await uploadFilesToAssets(files);
		const task = tasks.find((t) => t.id === taskId);
		updateTask(taskId, { attachments: [...task.attachments, ...newAttachments] });
	};

	const handlePaste = async (taskId, e) => {
		const items = e.clipboardData?.items;
		if (!items) return;

		const files = [];
		for (let i = 0; i < items.length; i++) {
			if (items[i].type.indexOf('image') !== -1) {
				const blob = items[i].getAsFile();
				if (blob) files.push(blob);
			}
		}
		if (!files.length) return;

		const newAttachments = await uploadFilesToAssets(files);
		const task = tasks.find((t) => t.id === taskId);
		updateTask(taskId, { attachments: [...task.attachments, ...newAttachments] });
	};

	const removeAttachment = (taskId, index) => {
		const task = tasks.find((t) => t.id === taskId);
		updateTask(taskId, { attachments: task.attachments.filter((_, i) => i !== index) });
	};

	const removeTask = (taskId) => {
		if (tasks.length > 1) setTasks(tasks.filter((t) => t.id !== taskId));
		else setTasks([{ id: Date.now().toString(), title: '', attachments: [] }]);
	};

	return (
		<div className="space-y-0 max-w-6xl w-full px-2 mx-auto mt-8">
			{tasks.map((task) => (
				<form key={task.id} onSubmit={(e) => handleSubmit(task.id, e)} className="mb-0">
					<div className="p-4 bg-gradient-to-r from-[var(--color-primary-50)] to-[var(--color-secondary-50)] rounded-lg border-2 border-dashed border-[var(--color-primary-300)] hover:border-[var(--color-primary-500)] transition-all">
						{task.attachments.length > 0 && (
							<div className="flex flex-wrap gap-2 mb-3">
								{task.attachments.map((att, idx) => (
									<div key={idx} className="relative group">
										<img
											src={att.url}
											alt={att.name}
											className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200"
										/>
										<button
											type="button"
											onClick={() => removeAttachment(task.id, idx)}
											className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg"
										>
											<X className="w-3 h-3 text-white" />
										</button>
									</div>
								))}
							</div>
						)}

						<div className="flex items-center gap-3">
							<div className="p-2.5 bg-gradient-to-br from-[var(--color-primary-100)] to-[var(--color-secondary-100)] rounded-lg">
								<Plus className="w-5 h-5 text-[var(--color-primary-700)] flex-shrink-0" />
							</div>
							<textarea
								value={task.title}
								onChange={(e) => updateTask(task.id, { title: e.target.value })}
								onPaste={(e) => handlePaste(task.id, e)}
								onKeyDown={(e) => handleKeyDown(task.id, e)}
								dir={isArabic(task.title).dir}
								placeholder={t('addTaskPlaceholder')}
								className="flex-1  bg-transparent border-none focus:outline-none text-gray-800 placeholder-gray-500 font-semibold resize-none"
								rows={1}
								style={{ minHeight: "24px", maxHeight: "120px", fontFamily : isArabic(task.title).fontFamily }}
							/>
							<input
								ref={(el) => (fileInputRefs.current[task.id] = el)}
								type="file"
								accept="image/*"
								multiple
								onChange={(e) => handleFileChange(task.id, e)}
								className="hidden"
							/>
							<button
								type="button"
								onClick={() => fileInputRefs.current[task.id]?.click()}
								className="p-2.5 hover:bg-[var(--color-primary-100)] rounded-lg transition-all"
								title={t('attachImage')}
							>
								<Image className="w-5 h-5 text-gray-600" />
							</button>
							{tasks.length > 1 && (
								<button
									type="button"
									onClick={() => removeTask(task.id)}
									className="p-2.5 hover:bg-red-100 rounded-lg transition-all"
								>
									<X className="w-5 h-5 text-red-600" />
								</button>
							)}
						</div>
					</div>
				</form>
			))}
		</div>
	);
}

// Task Detail Sidebar
function TaskDetailSidebar({ task, onUpdate, onDelete, onClose, onToggleSubtask, onDeleteSubtask, isRTL, t, locale }) {
	const [editingTitle, setEditingTitle] = useState(false);
	const [title, setTitle] = useState(task.title);
	const fileInputRef = useRef(null);

	useEffect(() => setTitle(task.title), [task.title]);

	const handleSaveTitle = () => {
		if (title.trim() && title !== task.title) onUpdate(task.id, { title: title.trim() });
		setEditingTitle(false);
	};

	const handleFileChange = async (e) => {
		const files = Array.from(e.target.files || []);
		if (!files.length) return;

		const newAttachments = await uploadFilesToAssets(files);
		onUpdate(task.id, { attachments: [...(task.attachments || []), ...newAttachments] });
	};

	const removeAttachment = (index) => {
		const updated = task.attachments.filter((_, i) => i !== index);
		onUpdate(task.id, { attachments: updated });
	};

	return (
		<div
			className={`fixed ${isRTL ? 'left-0' : 'right-0'} top-0 h-screen w-[500px] bg-white border-${isRTL ? 'r' : 'l'}-2 border-gray-100 shadow-2xl z-50 overflow-y-auto scrollbar-thin`}
			style={{ animation: isRTL ? 'slide-in-left 0.3s ease-out' : 'slide-in-right 0.3s ease-out' }}
		>
			<div className="sticky top-0 bg-gradient-to-br from-[var(--color-primary-50)] via-white to-[var(--color-secondary-50)] border-b-2 border-gray-100 p-6 z-10">
				<div className="flex items-center justify-between mb-5">
					<h2 className="text-xl font-black text-gray-900">{t('taskDetails')}</h2>
					<div className="flex items-center gap-2">
						<Button
							onClick={() => onUpdate(task.id, { isStarred: !task.isStarred })}
							variant="ghost"
							size="icon"
							className={`rounded-lg transition-all hover:scale-110 ${task.isStarred ? 'bg-gradient-to-br from-yellow-100 to-yellow-200' : ''}`}
						>
							{task.isStarred ? (
								<Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
							) : (
								<StarOff className="w-5 h-5 text-gray-600" />
							)}
						</Button>
						<Button onClick={() => onDelete(task.id)} variant="ghost" size="icon" className="rounded-lg hover:bg-gradient-to-br hover:from-red-100 hover:to-red-200 transition-all hover:scale-110">
							<Trash2 className="w-5 h-5 text-red-600" />
						</Button>
						<Button onClick={onClose} variant="ghost" size="icon" className="rounded-lg hover:bg-gray-100 transition-all hover:scale-110">
							<X className="w-5 h-5" />
						</Button>
					</div>
				</div>

				{editingTitle ? (
					<Input
						type="text"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						onBlur={handleSaveTitle}
						onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
						className="text-xl font-black"
						autoFocus
					/>
				) : (
					<h3
						onClick={() => setEditingTitle(true)}
						className="text-xl font-black text-gray-900 cursor-pointer hover:text-[var(--color-primary-600)] transition-colors px-4 py-3 hover:bg-white rounded-lg"
					>
						{task.title}
					</h3>
				)}
			</div>

			<div className="p-6 space-y-6">
				<div className="flex items-center gap-2 flex-wrap">
					<StatusBadge task={task} onUpdate={onUpdate} t={t} />
					<PriorityBadge task={task} onUpdate={onUpdate} t={t} />
					<RepeatBadge task={task} onUpdate={onUpdate} t={t} />
				</div>

				<div>
					<Label className="text-sm font-black mb-3 flex items-center justify-between">
						<span className="flex items-center gap-2">
							<Paperclip className="w-4 h-4" />
							{t('attachments')}
						</span>
						<Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
							<Plus className="w-3.5 h-3.5 mr-1.5" />
							{t('add')}
						</Button>
					</Label>
					<input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
					{task.attachments && task.attachments.length > 0 && (
						<div className="grid grid-cols-3 gap-3">
							{task.attachments.map((att, idx) => (
								<div key={idx} className="relative group">
									<img src={att.url} alt={att.name} className="w-full h-24 object-cover rounded-lg border-2 border-gray-200" />
									<button
										onClick={() => removeAttachment(idx)}
										className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
									>
										<X className="w-3.5 h-3.5 text-white" />
									</button>
									<a
										href={att.url}
										download={att.name}
										className="absolute bottom-2 right-2 p-1.5 bg-white/90 hover:bg-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
									>
										<Download className="w-3.5 h-3.5 text-gray-700" />
									</a>
								</div>
							))}
						</div>
					)}
				</div>

				<TaskDateTimeSection task={task} onUpdate={onUpdate} t={t} locale={locale} />
				<TaskSubtasksSection task={task} onUpdate={onUpdate} onToggleSubtask={onToggleSubtask} onDeleteSubtask={onDeleteSubtask} t={t} />
				<TaskNotesSection task={task} onUpdate={onUpdate} t={t} />
			</div>
		</div>
	);
}

// Badge Components
function StatusBadge({ task, onUpdate, t }) {
	const [isOpen, setIsOpen] = useState(false);
	const status = statusOptions.find((s) => s.id === task.status) || statusOptions[0];

	return (
		<div className="relative">
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-md hover:shadow-lg transition-all"
				style={{ backgroundColor: status.color }}
			>
				<div className="w-2 h-2 rounded-full bg-white" />
				{t(`status.${status.label}`)}
				<ChevronDown className="w-3 h-3" />
			</button>
			{isOpen && (
				<div className="absolute z-50 mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-2xl overflow-hidden min-w-[150px]">
					{statusOptions.map((s) => (
						<button
							key={s.id}
							onClick={() => {
								onUpdate(task.id, { status: s.id });
								setIsOpen(false);
							}}
							className="w-full px-4 py-2 hover:bg-gray-50 text-left flex items-center gap-2"
						>
							<div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
							<span className="text-sm font-bold">{t(`status.${s.label}`)}</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}

function PriorityBadge({ task, onUpdate, t }) {
	const [isOpen, setIsOpen] = useState(false);
	const priority = priorityLevels.find((p) => p.id === task.priority);

	if (!priority || task.priority === 'none') return null;

	const Icon = priority.icon;

	return (
		<div className="relative">
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-md hover:shadow-lg transition-all"
				style={{ backgroundColor: priority.color }}
			>
				<Icon className="w-3 h-3" />
				{t(`priorities.${priority.label}`)}
				<ChevronDown className="w-3 h-3" />
			</button>
			{isOpen && (
				<div className="absolute z-50 mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-2xl overflow-hidden min-w-[150px]">
					{priorityLevels.slice(1).map((p) => (
						<button
							key={p.id}
							onClick={() => {
								onUpdate(task.id, { priority: p.id });
								setIsOpen(false);
							}}
							className="w-full px-4 py-2 hover:bg-gray-50 text-left flex items-center gap-2"
						>
							<div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
							<span className="text-sm font-bold">{t(`priorities.${p.label}`)}</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}

function RepeatBadge({ task, onUpdate, t }) {
	const [isOpen, setIsOpen] = useState(false);
	const repeat = repeatOptions.find((r) => r.id === task.repeat);

	if (!repeat || task.repeat === 'none') return null;

	return (
		<div className="relative">
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all"
			>
				<Repeat className="w-3 h-3" />
				{t(`repeat.${repeat.label}`)}
				<ChevronDown className="w-3 h-3" />
			</button>
			{isOpen && (
				<div className="absolute z-50 mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-2xl overflow-hidden min-w-[150px]">
					{repeatOptions.map((r) => (
						<button
							key={r.id}
							onClick={() => {
								onUpdate(task.id, { repeat: r.id });
								setIsOpen(false);
							}}
							className="w-full px-4 py-2 hover:bg-gray-50 text-left"
						>
							<span className="text-sm font-bold">{t(`repeat.${r.label}`)}</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}

// Task Detail Sections
function TaskDateTimeSection({ task, onUpdate, t, locale }) {
	return (
		<div className="grid grid-cols-2 gap-4">
			<div>
				<Label className="text-sm font-black mb-3 flex items-center gap-2">
					<Calendar className="w-4 h-4" />
					{t('dueDate')}
				</Label>
				<Flatpickr
					value={task.dueDate || ''}
					onChange={([date]) => onUpdate(task.id, { dueDate: date ? date.toISOString().split('T')[0] : null })}
					options={{ dateFormat: 'Y-m-d', locale }}
					className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[var(--color-primary-500)] focus:ring-2 focus:ring-[var(--color-primary-100)] font-medium"
					placeholder={t('selectDate')}
				/>
			</div>
			<div>
				<Label className="text-sm font-black mb-3 flex items-center gap-2">
					<Clock className="w-4 h-4" />
					{t('time')}
				</Label>
				<Flatpickr
					value={task.dueTime || ''}
					onChange={([date]) => {
						if (date) {
							const hours = String(date.getHours()).padStart(2, '0');
							const minutes = String(date.getMinutes()).padStart(2, '0');
							onUpdate(task.id, { dueTime: `${hours}:${minutes}` });
						}
					}}
					options={{ enableTime: true, noCalendar: true, dateFormat: 'H:i', time_24hr: true }}
					className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[var(--color-primary-500)] focus:ring-2 focus:ring-[var(--color-primary-100)] font-medium"
					placeholder={t('selectTime')}
				/>
			</div>
		</div>
	);
}

function TaskSubtasksSection({ task, onUpdate, onToggleSubtask, onDeleteSubtask, t }) {
	const [showInput, setShowInput] = useState(false);
	const [newTitle, setNewTitle] = useState('');

	const handleAdd = async (e) => {
		e.preventDefault();
		if (newTitle.trim()) {
			await api.post(`/tasks/${task.id}/subtasks`, { title: newTitle.trim(), completed: false });
			const refreshed = await api.get(`/todos/${task.id}`);
			onUpdate(task.id, normalizeTask(refreshed?.data ?? refreshed));

			setNewTitle('');
			setShowInput(false);
		}
	};

	return (
		<div>
			<Label className="text-sm font-black mb-3 flex items-center justify-between">
				<span className="flex items-center gap-2">
					<CheckCircle className="w-4 h-4" />
					{t('subtasks')}
				</span>
				<button onClick={() => setShowInput(true)} className="text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] text-sm font-black">
					+ {t('add')}
				</button>
			</Label>

			<div className="space-y-3 mb-3">
				{task.subtasks?.map((subtask) => (
					<div
						key={subtask.id}
						className="flex items-center gap-3 p-3 hover:bg-gradient-to-r hover:from-[var(--color-primary-50)] hover:to-transparent rounded-lg group transition-all border-2 border-transparent hover:border-[var(--color-primary-200)]"
					>
						<CustomCheckbox checked={subtask.completed} onCheckedChange={() => onToggleSubtask(task.id, subtask.id)} />
						<span className={`flex-1 text-sm font-semibold ${subtask.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
							{subtask.title}
						</span>
						<Button size="icon" variant="ghost" onClick={() => onDeleteSubtask(task.id, subtask.id)} className="opacity-0 group-hover:opacity-100 h-8 w-8 transition-opacity">
							<X className="w-4 h-4 text-red-600" />
						</Button>
					</div>
				))}
			</div>

			{showInput && (
				<form onSubmit={handleAdd} className="flex gap-2">
					<Input
						type="text"
						className="w-full text-base font-bold bg-transparent border-none focus:outline-none focus:ring-0 px-0"
						value={newTitle}
						onChange={(e) => setNewTitle(e.target.value)}
						placeholder={t('subtaskPlaceholder')}
						autoFocus
					/>
					<Button type="submit">
						<Check className="w-4 h-4" />
					</Button>
					<Button type="button" variant="ghost" onClick={() => setShowInput(false)}>
						<X className="w-4 h-4" />
					</Button>
				</form>
			)}
		</div>
	);
}

function TaskNotesSection({ task, onUpdate, t }) {
	return (
		<div>
			<Label className="text-sm font-black mb-3 flex items-center gap-2">
				<FileText className="w-4 h-4" />
				{t('notes')}
			</Label>
			<Textarea value={task.notes || ''} onChange={(e) => onUpdate(task.id, { notes: e.target.value })} placeholder={t('notesPlaceholder')} rows={3} />
		</div>
	);
}

// Settings Dialog
function SettingsDialog({ open, onClose, settings, onUpdateSettings, t }) {
	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="text-2xl font-black">{t('settings')}</DialogTitle>
				</DialogHeader>

				<div className="space-y-6 mt-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<Volume2 className="w-5 h-5 text-gray-600" />
							<div>
								<Label className="font-black">{t('soundEffects')}</Label>
								<p className="text-xs text-gray-500">{t('soundEffectsDesc')}</p>
							</div>
						</div>
						<Switch checked={settings.soundEnabled} onCheckedChange={(checked) => onUpdateSettings({ ...settings, soundEnabled: checked })} />
					</div>

					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<Eye className="w-5 h-5 text-gray-600" />
							<div>
								<Label className="font-black">{t('showCompleted')}</Label>
								<p className="text-xs text-gray-500">{t('showCompletedDesc')}</p>
							</div>
						</div>
						<Switch checked={settings.showCompleted} onCheckedChange={(checked) => onUpdateSettings({ ...settings, showCompleted: checked })} />
					</div>

					<div>
						<Label className="font-black mb-3 block">{t('addTaskPosition')}</Label>
						<div className="grid grid-cols-2 gap-2">
							<Button
								variant={settings.addTaskPosition === 'top' ? 'default' : 'outline'}
								onClick={() => onUpdateSettings({ ...settings, addTaskPosition: 'top' })}
								className="justify-start gap-2"
							>
								<ArrowUp className="w-4 h-4" />
								{t('addToTop')}
							</Button>
							<Button
								variant={settings.addTaskPosition === 'bottom' ? 'default' : 'outline'}
								onClick={() => onUpdateSettings({ ...settings, addTaskPosition: 'bottom' })}
								className="justify-start gap-2"
							>
								<ArrowDown className="w-4 h-4" />
								{t('addToBottom')}
							</Button>
						</div>
					</div>
				</div>

				<div className="flex justify-end gap-2 mt-6">
					<Button onClick={onClose} className="bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)]">
						{t('done')}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

// Filter and Sort Selects
function FilterSelect({ value, onChange, t }) {
	const [isOpen, setIsOpen] = useState(false);
	const selectRef = useRef(null);

	useEffect(() => {
		const handleClickOutside = (e) => {
			if (selectRef.current && !selectRef.current.contains(e.target)) setIsOpen(false);
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const selectedPriority = value === 'all' ? { label: 'all' } : priorityLevels.find((p) => p.id === value);

	return (
		<div ref={selectRef} className="relative">
			<Button onClick={() => setIsOpen(!isOpen)} variant="outline" className="gap-2">
				<Filter className="w-4 h-4" />
				{t(`priorities.${selectedPriority?.label}`)}
				<ChevronDown className="w-4 h-4" />
			</Button>
			{isOpen && (
				<div className="absolute rtl:left-0 ltr:right-0 z-50 mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-2xl overflow-hidden min-w-[180px]">
					<div className="py-2">
						<div
							onClick={() => {
								onChange('all');
								setIsOpen(false);
							}}
							className="px-4 py-3 hover:bg-[var(--color-primary-50)] cursor-pointer transition-colors text-sm font-bold"
						>
							{t('priorities.all')}
						</div>
						{priorityLevels.slice(1).map((priority) => (
							<div
								key={priority.id}
								onClick={() => {
									onChange(priority.id);
									setIsOpen(false);
								}}
								className="px-4 py-3 hover:bg-[var(--color-primary-50)] cursor-pointer transition-colors flex items-center gap-2"
							>
								<div className="w-3 h-3 rounded-full" style={{ backgroundColor: priority.color }} />
								<span className="text-sm font-bold">{t(`priorities.${priority.label}`)}</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function SortSelect({ value, onChange, t }) {
	const [isOpen, setIsOpen] = useState(false);
	const selectRef = useRef(null);

	useEffect(() => {
		const handleClickOutside = (e) => {
			if (selectRef.current && !selectRef.current.contains(e.target)) setIsOpen(false);
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const sortOptions = [
		{ id: 'manual', label: 'manual' },
		{ id: 'dueDate', label: 'dueDate' },
		{ id: 'priority', label: 'priority' },
		{ id: 'alphabetical', label: 'alphabetical' },
	];

	const selectedSort = sortOptions.find((s) => s.id === value) || sortOptions[0];

	return (
		<div ref={selectRef} className="relative">
			<Button onClick={() => setIsOpen(!isOpen)} variant="outline" className="gap-2">
				<TrendingUp className="w-4 h-4" />
				{t(`sort.${selectedSort?.label}`)}
				<ChevronDown className="w-4 h-4" />
			</Button>
			{isOpen && (
				<div className="absolute z-50 rtl:left-0 ltr:right-0 mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-2xl overflow-hidden min-w-[160px]">
					<div className="py-2">
						{sortOptions.map((option) => (
							<div
								key={option.id}
								onClick={() => {
									onChange(option.id);
									setIsOpen(false);
								}}
								className="px-4 py-3 hover:bg-[var(--color-primary-50)] cursor-pointer transition-colors text-sm font-bold"
							>
								{t(`sort.${option.label}`)}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

// Empty State
function EmptyState({ t }) {
	return (
		<div className="text-center py-20">
			<div className="w-40 h-40 mx-auto mb-8 rounded-full bg-gradient-to-br from-[var(--color-primary-100)] to-[var(--color-secondary-100)] flex items-center justify-center shadow-lg">
				<ListTodo className="w-20 h-20 text-[var(--color-primary-600)]" />
			</div>
			<h3 className="text-3xl font-black text-gray-900 mb-3">{t('noTasks')}</h3>
			<p className="text-gray-600 text-lg font-semibold">{t('addFirstTask')}</p>
		</div>
	);
}
