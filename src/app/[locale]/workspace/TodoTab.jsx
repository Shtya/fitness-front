/* 
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
	Edit2,
	CheckCircle,
	Circle,
	Repeat,
	Bell,
	Flag,
	Inbox,
	Sun,
	Sparkles,
	Zap,
	Target,
	ListTodo,
	GripVertical,
	FolderPlus,
	Hash,
	FileText,
	MapPin,
	AlignLeft,
	Menu,
	Volume2,
	VolumeX,
	Settings,
	Grid3x3,
	List,
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
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
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

// Import shadcn components
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

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
		gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
		oscillator.start(audioContext.currentTime);
		oscillator.stop(audioContext.currentTime + 0.5);
	} else if (type === 'uncheck') {
		oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime);
		oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
		oscillator.type = 'sine';
		gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
		gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
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

function SortableTaskItem({ 
	task, 
	onToggle, 
	onSelect, 
	onQuickDelete, 
	isSelected, 
	viewMode,
	onAddSubtask,
	onToggleStar,
	compactView,
	t
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: task.id });

	const [showSubtaskInput, setShowSubtaskInput] = useState(false);
	const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	const priority = priorityLevels.find(p => p.id === task.priority);
	const PriorityIcon = priority?.icon || Circle;
	
	const completedSubtasks = task.subtasks?.filter(st => st.completed).length || 0;
	const totalSubtasks = task.subtasks?.length || 0;

	const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;

	const handleAddSubtask = (e) => {
		e.preventDefault();
		e.stopPropagation();
		if (newSubtaskTitle.trim()) {
			onAddSubtask(task.id, newSubtaskTitle.trim());
			setNewSubtaskTitle('');
			setShowSubtaskInput(false);
		}
	};

	if (compactView) {
		return (
			<div
				ref={setNodeRef}
				style={style}
				className={`group bg-white rounded-xl border-2 transition-all hover:shadow-lg ${
					isSelected
						? 'border-[var(--color-gradient-from)] shadow-lg ring-2 ring-[var(--color-primary-100)]'
						: 'border-gray-200 hover:border-[var(--color-primary-300)]'
				}`}
			>
				<div className="flex items-center gap-3 p-3">
					<div
						{...attributes}
						{...listeners}
						className="flex-shrink-0 cursor-grab active:cursor-grabbing "
					>
						<GripVertical className="w-3.5 h-3.5 text-gray-400" />
					</div>

					<Checkbox
						checked={task.completed}
						onCheckedChange={() => onToggle(task.id)}
						className="flex-shrink-0"
					/>

					<div className="flex-1 min-w-0" onClick={() => onSelect(task)}>
						<h3 className={`font-bold text-sm leading-tight cursor-pointer ${
							task.completed ? 'line-through text-gray-400' : 'text-gray-900'
						}`}>
							{task.title}
						</h3>
					</div>

					<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
						<button
							onClick={(e) => {
								e.stopPropagation();
								onToggleStar(task.id);
							}}
							className="p-1.5 hover:bg-yellow-50 rounded-lg transition-all"
						>
							<Star className={`w-3.5 h-3.5 ${task.isStarred ? 'fill-yellow-500 text-yellow-500' : 'text-gray-400'}`} />
						</button>
						<button
							onClick={(e) => {
								e.stopPropagation();
								setShowSubtaskInput(!showSubtaskInput);
							}}
							className="p-1.5 hover:bg-green-50 rounded-lg transition-all"
						>
							<Plus className="w-3.5 h-3.5 text-green-600" />
						</button>
						<button
							onClick={(e) => {
								e.stopPropagation();
								if (confirm(t('confirmDelete'))) {
									onQuickDelete(task.id);
								}
							}}
							className="p-1.5 hover:bg-red-50 rounded-lg transition-all"
						>
							<Trash2 className="w-3.5 h-3.5 text-red-600" />
						</button>
					</div>
				</div>

				{showSubtaskInput && (
					<div className="px-3 pb-3 pt-0" onClick={(e) => e.stopPropagation()}>
						<form onSubmit={handleAddSubtask} className="flex gap-2">
							<Input
								type="text"
								value={newSubtaskTitle}
								onChange={(e) => setNewSubtaskTitle(e.target.value)}
								placeholder={t('subtaskPlaceholder')}
								className="text-xs h-7"
								autoFocus
							/>
							<Button type="submit" size="sm" className="h-7 px-2">
								<Check className="w-3 h-3" />
							</Button>
							<Button type="button" size="sm" variant="ghost" onClick={() => setShowSubtaskInput(false)} className="h-7 px-2">
								<X className="w-3 h-3" />
							</Button>
						</form>
					</div>
				)}
			</div>
		);
	}

	if (viewMode === 'grid') {
		return (
			<div
				ref={setNodeRef}
				style={style}
				className={`group bg-white rounded-2xl border-2 transition-all hover:shadow-2xl hover:scale-[1.02] ${
					isSelected
						? 'border-[var(--color-gradient-from)] shadow-2xl ring-4 ring-[var(--color-primary-100)]'
						: 'border-gray-200 hover:border-[var(--color-primary-300)]'
				}`}
			>
				<div className="p-6">
					<div className="flex items-start justify-between mb-4">
						<div
							{...attributes}
							{...listeners}
							className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded-lg"
						>
							<GripVertical className="w-4 h-4 text-gray-400" />
						</div>
						{task.isStarred && (
							<div className="p-2 bg-yellow-50 rounded-lg">
								<Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
							</div>
						)}
					</div>

					<div className="mb-5">
						<Checkbox
							checked={task.completed}
							onCheckedChange={() => onToggle(task.id)}
							className="w-6 h-6"
						/>
					</div>

					<div onClick={() => onSelect(task)} className="cursor-pointer">
						<h3 className={`font-bold text-base mb-3 leading-tight ${
							task.completed ? 'line-through text-gray-400' : 'text-gray-900'
						}`}>
							{task.title}
						</h3>

						{task.attachments && task.attachments.length > 0 && (
							<div className="mb-3 flex flex-wrap gap-2">
								{task.attachments.map((att, idx) => (
									<div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-gray-200">
										<img src={att.url} alt={att.name} className="w-full h-full object-cover" />
									</div>
								))}
							</div>
						)}

						<div className="space-y-2.5">
							{task.priority !== 'none' && (
								<div
									className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm"
									style={{ backgroundColor: priority.color }}
								>
									<PriorityIcon className="w-3.5 h-3.5" />
									{t(`priorities.${priority.label}`)}
								</div>
							)}

							{task.dueDate && (
								<div className={`flex items-center gap-2 text-xs font-semibold ${
									isOverdue ? 'text-red-600' : 'text-gray-700'
								}`}>
									<Calendar className="w-4 h-4" />
									{new Date(task.dueDate).toLocaleDateString()}
								</div>
							)}

							{totalSubtasks > 0 && (
								<div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
									<CheckCircle className="w-4 h-4" />
									{completedSubtasks}/{totalSubtasks}
								</div>
							)}
						</div>
					</div>

					{!task.completed && (
						<div className="mt-4 pt-4 border-t border-gray-100">
							{!showSubtaskInput ? (
								<button
									onClick={(e) => {
										e.stopPropagation();
										setShowSubtaskInput(true);
									}}
									className="text-xs text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] font-bold flex items-center gap-1"
								>
									<Plus className="w-3.5 h-3.5" />
									{t('addSubtask')}
								</button>
							) : (
								<form onSubmit={handleAddSubtask} className="flex gap-2" onClick={(e) => e.stopPropagation()}>
									<Input
										type="text"
										value={newSubtaskTitle}
										onChange={(e) => setNewSubtaskTitle(e.target.value)}
										placeholder={t('subtaskPlaceholder')}
										className="text-xs h-8"
										autoFocus
									/>
									<Button type="submit" size="sm" className="h-8 px-2">
										<Check className="w-3.5 h-3.5" />
									</Button>
									<Button type="button" size="sm" variant="ghost" onClick={() => setShowSubtaskInput(false)} className="h-8 px-2">
										<X className="w-3.5 h-3.5" />
									</Button>
								</form>
							)}
						</div>
					)}
				</div>
			</div>
		);
	}

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`group bg-white rounded-2xl border-2 transition-all hover:shadow-xl ${
				isSelected
					? 'border-[var(--color-gradient-from)] shadow-xl ring-4 ring-[var(--color-primary-100)]'
					: 'border-gray-200 hover:border-[var(--color-primary-300)]'
			}`}
		>
			<div className="p-5">
				<div className="flex items-center gap-4">
					<div
						{...attributes}
						{...listeners}
						className="flex-shrink-0 cursor-grab active:cursor-grabbing  hover:bg-gray-100 rounded-lg"
					>
						<GripVertical className="w-4 h-4 text-gray-400" />
					</div>

					<Checkbox
						checked={task.completed}
						onCheckedChange={() => onToggle(task.id)}
						className="flex-shrink-0 w-6 h-6"
					/>

					<div className="flex-1 min-w-0" onClick={() => onSelect(task)}>
						<div className="flex items-start gap-3">
							<div className="flex-1 min-w-0">
								<h3 className={`font-bold text-base mb-1 leading-tight ${
									task.completed ? 'line-through text-gray-400' : 'text-gray-900'
								}`}>
									{task.title}
								</h3>

								{task.attachments && task.attachments.length > 0 && (
									<div className="  flex flex-wrap gap-2">
										{task.attachments.map((att, idx) => (
											<div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200 group/img">
												<img src={att.url} alt={att.name} className="w-full h-full object-cover" />
												<div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
													<Paperclip className="w-4 h-4 text-white" />
												</div>
											</div>
										))}
									</div>
								)}
							</div>
							
							{task.isStarred && (
								<div className="p-1.5 bg-yellow-50 rounded-lg">
									<Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
								</div>
							)}
						</div>

						<div className="flex items-center gap-2 mt-3 flex-wrap">
							{task.priority !== 'none' && (
								<span
									className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-sm"
									style={{ backgroundColor: priority.color }}
								>
									<PriorityIcon className="w-3 h-3" />
									{t(`priorities.${priority.label}`)}
								</span>
							)}

							{task.dueDate && (
								<span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
									isOverdue
										? 'bg-red-50 text-red-700 border border-red-200'
										: 'bg-gray-50 text-gray-700 border border-gray-200'
								}`}>
									<Calendar className="w-3.5 h-3.5" />
									{new Date(task.dueDate).toLocaleDateString()}
								</span>
							)}

							{task.repeat !== 'none' && (
								<span className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold">
									<Repeat className="w-3.5 h-3.5" />
								</span>
							)}

							{totalSubtasks > 0 && (
								<span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
									completedSubtasks === totalSubtasks
										? 'bg-green-50 text-green-700 border border-green-200'
										: 'bg-gray-50 text-gray-700 border border-gray-200'
								}`}>
									<CheckCircle className="w-3.5 h-3.5" />
									{completedSubtasks}/{totalSubtasks}
								</span>
							)}

							{task.tags && task.tags.length > 0 && (
								<span className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold">
									<Hash className="w-3.5 h-3.5" />
									{task.tags.length}
								</span>
							)}
						</div>
					</div>

					<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
						<Button
							size="icon"
							variant="ghost"
							onClick={(e) => {
								e.stopPropagation();
								if (confirm(t('confirmDelete'))) {
									onQuickDelete(task.id);
								}
							}}
							className="h-9 w-9"
						>
							<Trash2 className="w-4 h-4 text-red-600" />
						</Button>
					</div>
				</div>

				{!task.completed && (
					<div className="mt-4 pt-4 border-t border-gray-100 ml-14">
						{!showSubtaskInput ? (
							<button
								onClick={(e) => {
									e.stopPropagation();
									setShowSubtaskInput(true);
								}}
								className="text-sm text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] font-bold flex items-center gap-1.5"
							>
								<Plus className="w-4 h-4" />
								{t('addSubtask')}
							</button>
						) : (
							<form onSubmit={handleAddSubtask} className="flex gap-2" onClick={(e) => e.stopPropagation()}>
								<Input
									type="text"
									value={newSubtaskTitle}
									onChange={(e) => setNewSubtaskTitle(e.target.value)}
									placeholder={t('subtaskPlaceholder')}
									className="text-sm"
									autoFocus
								/>
								<Button type="submit" size="sm">
									<Check className="w-4 h-4" />
								</Button>
								<Button type="button" size="sm" variant="ghost" onClick={() => setShowSubtaskInput(false)}>
									<X className="w-4 h-4" />
								</Button>
							</form>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

export default function TodoTab() {
	const t = useTranslations('todo');
	const locale = useLocale();
	const isRTL = locale === 'ar';

	const [settings, setSettings] = useState({
		soundEnabled: true,
		showCompleted: true,
		compactView: false,
		autoArchive: false,
		defaultView: 'list',
		addTaskPosition: 'top',
	});

	const [folders, setFolders] = useState([
		{ id: 'inbox', name: 'inbox', color: 'var(--color-primary-600)', icon: Inbox, isSystem: true },
		{ id: 'today', name: 'today', color: '#f59e0b', icon: Sun, isSystem: true },
		{ id: 'starred', name: 'starred', color: '#eab308', icon: Star, isSystem: true },
		{ id: 'personal', name: 'personal', color: '#8b5cf6', icon: Target, isSystem: false },
		{ id: 'work', name: 'work', color: '#06b6d4', icon: Sparkles, isSystem: false },
		{ id: 'shopping', name: 'shopping', color: '#ec4899', icon: Zap, isSystem: false },
	]);

	const [tasks, setTasks] = useState([
		{
			id: '1',
			title: 'Complete project proposal',
			folderId: 'work',
			completed: false,
			status: 'in-progress',
			priority: 'high',
			dueDate: '2024-02-15',
			dueTime: '14:00',
			repeat: 'none',
			customRepeatDays: null,
			hasReminder: true,
			reminderTime: '2024-02-15T09:00',
			tags: ['urgent', 'client', 'proposal'],
			isStarred: true,
			location: 'Office - Meeting Room A',
			notes: 'Remember to include the budget section',
			attachments: [],
			subtasks: [
				{ id: 's1', title: 'Research competitor solutions', completed: true },
				{ id: 's2', title: 'Create presentation deck', completed: false },
				{ id: 's3', title: 'Review with team', completed: false },
			],
			createdAt: new Date('2024-02-01'),
			updatedAt: new Date(),
		},
	]);

	const [selectedFolder, setSelectedFolder] = useState('inbox');
	const [selectedTask, setSelectedTask] = useState(null);
	const [showAddFolder, setShowAddFolder] = useState(false);
	const [newFolderName, setNewFolderName] = useState('');
	const [newFolderColor, setNewFolderColor] = useState('var(--color-primary-600)');
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [filterPriority, setFilterPriority] = useState('all');
	const [sortBy, setSortBy] = useState('manual');
	const [activeId, setActiveId] = useState(null);
	const [viewMode, setViewMode] = useState(settings.defaultView);
	const [showSettings, setShowSettings] = useState(false);
	const [showTaskSidebar, setShowTaskSidebar] = useState(false);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		})
	);

	useEffect(() => {
		setViewMode(settings.defaultView);
	}, [settings.defaultView]);

	const handleAddTask = (title, attachments = []) => {
		if (!title.trim()) return;

		const newTask = {
			id: Date.now().toString(),
			title: title.trim(),
			folderId: selectedFolder === 'today' || selectedFolder === 'starred' ? 'inbox' : selectedFolder,
			completed: false,
			status: 'todo',
			priority: 'none',
			dueDate: selectedFolder === 'today' ? new Date().toISOString().split('T')[0] : null,
			dueTime: null,
			repeat: 'none',
			customRepeatDays: null,
			hasReminder: false,
			reminderTime: null,
			tags: [],
			isStarred: selectedFolder === 'starred',
			location: '',
			notes: '',
			attachments: attachments,
			subtasks: [],
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		if (settings.addTaskPosition === 'top') {
			setTasks([newTask, ...tasks]);
		} else {
			setTasks([...tasks, newTask]);
		}
	};

	const handleToggleTask = (taskId) => {
		playSound(tasks.find(t => t.id === taskId)?.completed ? 'uncheck' : 'check', settings.soundEnabled);
		
		setTasks(tasks.map(t => 
			t.id === taskId 
				? { 
					...t, 
					completed: !t.completed,
					status: !t.completed ? 'completed' : 'todo',
					updatedAt: new Date()
				} 
				: t
		));
	};

	const handleUpdateTask = (taskId, updates) => {
		setTasks(tasks.map(t => 
			t.id === taskId 
				? { ...t, ...updates, updatedAt: new Date() }
				: t
		));
		
		if (selectedTask?.id === taskId) {
			setSelectedTask({ ...selectedTask, ...updates, updatedAt: new Date() });
		}
	};

	const handleDeleteTask = (taskId) => {
		setTasks(tasks.filter(t => t.id !== taskId));
		if (selectedTask?.id === taskId) {
			setSelectedTask(null);
			setShowTaskSidebar(false);
		}
	};

	const handleSelectTask = (task) => {
		setSelectedTask(task);
		setShowTaskSidebar(true);
	};

	const handleAddSubtask = (taskId, subtaskTitle) => {
		const task = tasks.find(t => t.id === taskId);
		if (!task) return;
		
		const newSubtask = {
			id: Date.now().toString(),
			title: subtaskTitle,
			completed: false,
		};
		
		handleUpdateTask(taskId, {
			subtasks: [...(task.subtasks || []), newSubtask]
		});
	};

	const handleToggleStar = (taskId) => {
		const task = tasks.find(t => t.id === taskId);
		if (task) {
			handleUpdateTask(taskId, { isStarred: !task.isStarred });
		}
	};

	const handleAddFolder = () => {
		if (!newFolderName.trim()) return;

		const newFolder = {
			id: Date.now().toString(),
			name: newFolderName.trim(),
			color: newFolderColor,
			icon: Folder,
			isSystem: false,
		};

		setFolders([...folders, newFolder]);
		setNewFolderName('');
		setNewFolderColor('var(--color-primary-600)');
		setShowAddFolder(false);
		setSelectedFolder(newFolder.id);
	};

	const handleDeleteFolder = (folderId) => {
		setTasks(tasks.map(t => 
			t.folderId === folderId ? { ...t, folderId: 'inbox' } : t
		));
		setFolders(folders.filter(f => f.id !== folderId));
		setSelectedFolder('inbox');
	};

	const handleDragStart = (event) => {
		setActiveId(event.active.id);
	};

	const handleDragEnd = (event) => {
		const { active, over } = event;
		
		setActiveId(null);

		if (!over || active.id === over.id) return;

		setTasks((tasks) => {
			const oldIndex = tasks.findIndex((t) => t.id === active.id);
			const newIndex = tasks.findIndex((t) => t.id === over.id);

			return arrayMove(tasks, oldIndex, newIndex);
		});
	};

	const getFilteredTasks = () => {
		let filtered = tasks;

		if (selectedFolder === 'today') {
			const today = new Date().toISOString().split('T')[0];
			filtered = filtered.filter(t => {
				if (t.dueDate === today) return true;
				if (t.repeat === 'daily') return true;
				return false;
			});
		} else if (selectedFolder === 'starred') {
			filtered = filtered.filter(t => t.isStarred);
		} else if (selectedFolder !== 'inbox') {
			filtered = filtered.filter(t => t.folderId === selectedFolder);
		}

		if (!settings.showCompleted) {
			filtered = filtered.filter(t => !t.completed);
		}

		if (filterPriority && filterPriority !== 'all') {
			filtered = filtered.filter(t => t.priority === filterPriority);
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

		return filtered;
	};

	const filteredTasks = getFilteredTasks();
	const currentFolder = folders.find(f => f.id === selectedFolder);
	const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

	return (
		<div className="flex h-screen bg-gradient-to-br from-gray-50 via-white to-[var(--color-primary-50)] overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
			{/* Left Sidebar */}
			<div 
				className={`bg-white border-${isRTL ? 'l' : 'r'}-2 border-gray-100 transition-all duration-300 flex-shrink-0 ${
					sidebarCollapsed ? 'w-20' : 'w-80'
				}`}
			>
				<div className="h-full flex flex-col">
					<div className="p-6 border-b-2 border-gray-100">
						<div className="flex items-center justify-between mb-6">
							{!sidebarCollapsed && (
								<h1 className="text-3xl font-black bg-gradient-to-r from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)] bg-clip-text text-transparent">
									{t('title')}
								</h1>
							)}
							<button
								onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
								className="p-2.5 hover:bg-gray-100 rounded-xl transition-all hover:scale-110"
							>
								<Menu className="w-5 h-5 text-gray-600" />
							</button>
						</div>

						{!sidebarCollapsed && (
							<div className="flex items-center gap-2">
								<Button
									onClick={() => setSettings({ ...settings, soundEnabled: !settings.soundEnabled })}
									variant={settings.soundEnabled ? "default" : "outline"}
									size="sm"
									className="flex-1"
								>
									{settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
								</Button>
								<Button
									onClick={() => setShowSettings(true)}
									variant="outline"
									size="sm"
									className="flex-1"
								>
									<Settings className="w-4 h-4" />
								</Button>
							</div>
						)}
					</div>

					<div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin">
						<div className="mb-6">
							{!sidebarCollapsed && (
								<h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3 px-3">
									{t('system')}
								</h3>
							)}
							{folders.filter(f => f.isSystem).map((folder) => {
								const Icon = folder.icon;
								const count = folder.id === 'inbox' 
									? tasks.filter(t => t.folderId === 'inbox' && (!t.completed || settings.showCompleted)).length
									: folder.id === 'today'
									? getFilteredTasks().filter(t => !t.completed || settings.showCompleted).length
									: folder.id === 'starred'
									? tasks.filter(t => t.isStarred && (!t.completed || settings.showCompleted)).length
									: 0;

								return (
									<button
										key={folder.id}
										onClick={() => setSelectedFolder(folder.id)}
										className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group mb-1 ${
											selectedFolder === folder.id
												? 'bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white shadow-lg scale-[1.02]'
												: 'hover:bg-gray-50 text-gray-700'
										}`}
									>
										<Icon 
											className={`w-5 h-5 flex-shrink-0 ${
												selectedFolder === folder.id ? 'text-white' : ''
											}`}
											style={{ color: selectedFolder !== folder.id ? folder.color : undefined }}
										/>
										{!sidebarCollapsed && (
											<>
												<span className="flex-1 text-left font-bold text-sm">{t(`folders.${folder.name}`)}</span>
												{count > 0 && (
													<span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
														selectedFolder === folder.id
															? 'bg-white/20 text-white'
															: 'bg-gray-100 text-gray-700'
													}`}>
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
										className="p-2.5 bg-[var(--color-primary-100)] hover:bg-[var(--color-primary-200)] rounded-xl transition-all hover:scale-110 shadow-sm"
										title={t('addFolder')}
									>
										<FolderPlus className="w-4 h-4 text-[var(--color-primary-700)]" />
									</button>
								</div>
							)}
							
							{folders.filter(f => !f.isSystem).map((folder) => {
								const Icon = folder.icon;
								const count = tasks.filter(t => t.folderId === folder.id && (!t.completed || settings.showCompleted)).length;

								return (
									<div key={folder.id} className="relative group/folder mb-1">
										<button
											onClick={() => setSelectedFolder(folder.id)}
											className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
												selectedFolder === folder.id
													? 'bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white shadow-lg scale-[1.02]'
													: 'hover:bg-gray-50 text-gray-700'
											}`}
										>
											<Icon 
												className={`w-5 h-5 flex-shrink-0 ${
													selectedFolder === folder.id ? 'text-white' : ''
												}`}
												style={{ color: selectedFolder !== folder.id ? folder.color : undefined }}
											/>
											{!sidebarCollapsed && (
												<>
													<span className="flex-1 text-left font-bold text-sm truncate">{t(`folders.${folder.name}`)}</span>
													{count > 0 && (
														<span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
															selectedFolder === folder.id
																? 'bg-white/20 text-white'
																: 'bg-gray-100 text-gray-700'
														}`}>
															{count}
														</span>
													)}
												</>
											)}
										</button>
										
										{!sidebarCollapsed && !folder.isSystem && selectedFolder === folder.id && (
											<button
												onClick={(e) => {
													e.stopPropagation();
													if (confirm(t('confirmDeleteFolder'))) {
														handleDeleteFolder(folder.id);
													}
												}}
												className={`absolute ${isRTL ? 'left-2' : 'right-2'} top-1/2 -translate-y-1/2 opacity-0 group-hover/folder:opacity-100 p-2 bg-red-500 hover:bg-red-600 rounded-xl transition-all shadow-lg hover:scale-110`}
											>
												<Trash2 className="w-3.5 h-3.5 text-white" />
											</button>
										)}
									</div>
								);
							})}
						</div>

						{showAddFolder && !sidebarCollapsed && (
							<div className="mt-4 p-5 bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-secondary-50)] rounded-2xl border-2 border-[var(--color-primary-200)] shadow-lg">
								<Input
									type="text"
									value={newFolderName}
									onChange={(e) => setNewFolderName(e.target.value)}
									onKeyPress={(e) => e.key === 'Enter' && handleAddFolder()}
									placeholder={t('folderNamePlaceholder')}
									className="mb-4"
									autoFocus
								/>
								<div className="flex items-center gap-3 mb-4">
									<input
										type="color"
										value={newFolderColor}
										onChange={(e) => setNewFolderColor(e.target.value)}
										className="w-14 h-14 rounded-xl cursor-pointer border-2 border-gray-200 shadow-sm"
									/>
									<span className="text-sm text-gray-700 font-bold">{t('pickColor')}</span>
								</div>
								<div className="flex gap-2">
									<Button onClick={handleAddFolder} className="flex-1 bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)]">
										{t('add')}
									</Button>
									<Button onClick={() => setShowAddFolder(false)} variant="outline">
										{t('cancel')}
									</Button>
								</div>
							</div>
						)}
					</div>

					{!sidebarCollapsed && (
						<div className="p-5 border-t-2 border-gray-100 bg-gradient-to-br from-[var(--color-primary-50)] to-white">
							<div className="grid grid-cols-2 gap-3">
								<div className="bg-white rounded-2xl p-5 border-2 border-gray-100 shadow-sm">
									<div className="text-4xl font-black bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] bg-clip-text text-transparent">
										{tasks.filter(t => !t.completed).length}
									</div>
									<div className="text-xs text-gray-600 font-bold mt-1.5">{t('active')}</div>
								</div>
								<div className="bg-white rounded-2xl p-5 border-2 border-gray-100 shadow-sm">
									<div className="text-4xl font-black text-green-600">
										{tasks.filter(t => t.completed).length}
									</div>
									<div className="text-xs text-gray-600 font-bold mt-1.5">{t('done')}</div>
								</div>
							</div>
						</div>
					)}
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
												className="p-4 rounded-2xl shadow-md"
												style={{ backgroundColor: `${currentFolder.color}15` }}
											>
												<Icon className="w-8 h-8" style={{ color: currentFolder.color }} />
											</div>
										);
									})()}
									<div>
										<h2 className="text-4xl font-black text-gray-900">{t(`folders.${currentFolder.name}`)}</h2>
										<p className="text-sm text-gray-600 mt-2 font-semibold">
											{filteredTasks.filter(t => !t.completed).length} {t('active')} · {filteredTasks.filter(t => t.completed).length} {t('completed')}
										</p>
									</div>
								</>
							)}
						</div>
						
						<div className="flex items-center gap-3">
							<div className="flex items-center gap-1.5 bg-gray-100 rounded-lg p-1 shadow-sm">
								<button
									onClick={() => setViewMode('list')}
									className={`p-1.5 rounded-lg transition-all ${
										viewMode === 'list'
											? 'bg-white text-[var(--color-primary-600)] shadow-sm'
											: 'text-gray-600 hover:text-gray-900'
									}`}
								>
									<List className="w-5 h-5" />
								</button>
								<button
									onClick={() => setViewMode('grid')}
									className={`p-1.5 rounded-lg transition-all ${
										viewMode === 'grid'
											? 'bg-white text-[var(--color-primary-600)] shadow-sm'
											: 'text-gray-600 hover:text-gray-900'
									}`}
								>
									<Grid3x3 className="w-5 h-5" />
								</button>
							</div>

							<FilterSelect value={filterPriority} onChange={setFilterPriority} t={t} />
							<SortSelect value={sortBy} onChange={setSortBy} t={t} />
						</div>
					</div>

					<QuickAddTask onAdd={handleAddTask} t={t} />
				</div>

				<div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
					{filteredTasks.length === 0 ? (
						<EmptyState selectedFolder={selectedFolder} t={t} />
					) : (
						<DndContext
							sensors={sensors}
							collisionDetection={closestCorners}
							onDragStart={handleDragStart}
							onDragEnd={handleDragEnd}
						>
							<SortableContext items={filteredTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
								<div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-3'}>
									{filteredTasks.map((task) => (
										<SortableTaskItem
											key={task.id}
											task={task}
											onToggle={handleToggleTask}
											onSelect={handleSelectTask}
											onQuickDelete={handleDeleteTask}
											onAddSubtask={handleAddSubtask}
											onToggleStar={handleToggleStar}
											isSelected={selectedTask?.id === task.id}
											viewMode={viewMode}
											compactView={settings.compactView}
											t={t}
										/>
									))}
								</div>
							</SortableContext>

							<DragOverlay>
								{activeTask ? (
									<div className="bg-white rounded-2xl border-2 border-[var(--color-primary-500)] shadow-2xl p-5 opacity-90 rotate-2">
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
		</div>
	);
}

// Quick Add Task Component with image upload
function QuickAddTask({ onAdd, t }) {
	const [title, setTitle] = useState('');
	const [attachments, setAttachments] = useState([]);
	const fileInputRef = useRef(null);

	const handleSubmit = (e) => {
		e.preventDefault();
		if (title.trim()) {
			onAdd(title, attachments);
			setTitle('');
			setAttachments([]);
		}
	};

	const handleFileChange = (e) => {
		const files = Array.from(e.target.files);
		const newAttachments = files.map(file => ({
			name: file.name,
			url: URL.createObjectURL(file),
			type: file.type,
		}));
		setAttachments([...attachments, ...newAttachments]);
	};

	const handlePaste = (e) => {
		const items = e.clipboardData?.items;
		if (!items) return;

		for (let i = 0; i < items.length; i++) {
			if (items[i].type.indexOf('image') !== -1) {
				const blob = items[i].getAsFile();
				const url = URL.createObjectURL(blob);
				setAttachments([...attachments, {
					name: `pasted-image-${Date.now()}.png`,
					url: url,
					type: 'image/png',
				}]);
			}
		}
	};

	const removeAttachment = (index) => {
		setAttachments(attachments.filter((_, i) => i !== index));
	};

	return (
		<form onSubmit={handleSubmit}>
			<div className="p-4 bg-gradient-to-r from-[var(--color-primary-50)] to-[var(--color-secondary-50)] rounded-2xl border-2 border-dashed border-[var(--color-primary-300)] hover:border-[var(--color-primary-500)] transition-all">
				{attachments.length > 0 && (
					<div className="flex flex-wrap gap-2 mb-3">
						{attachments.map((att, idx) => (
							<div key={idx} className="relative group">
								<img src={att.url} alt={att.name} className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200" />
								<button
									type="button"
									onClick={() => removeAttachment(idx)}
									className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
								>
									<X className="w-3 h-3 text-white" />
								</button>
							</div>
						))}
					</div>
				)}
				
				<div className="flex items-center gap-3">
					<div className="p-2.5 bg-[var(--color-primary-100)] rounded-xl">
						<Plus className="w-5 h-5 text-[var(--color-primary-700)] flex-shrink-0" />
					</div>
					<input
						type="text"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						onPaste={handlePaste}
						placeholder={t('addTaskPlaceholder')}
						className="flex-1 bg-transparent border-none focus:outline-none text-gray-800 placeholder-gray-500 font-semibold"
					/>
					<input
						ref={fileInputRef}
						type="file"
						accept="image/*"
						multiple
						onChange={handleFileChange}
						className="hidden"
					/>
					<button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						className="p-2.5 hover:bg-[var(--color-primary-100)] rounded-xl transition-all"
						title="Attach image"
					>
						<Image className="w-5 h-5 text-gray-600" />
					</button>
				</div>
			</div>
		</form>
	);
}

// ... (Continue in next part due to character limit)

// Task Detail Sidebar Component
function TaskDetailSidebar({ task, onUpdate, onDelete, onClose, soundEnabled, isRTL, t, locale }) {
	const [editingTitle, setEditingTitle] = useState(false);
	const [title, setTitle] = useState(task.title);
	const fileInputRef = useRef(null);

	const handleSaveTitle = () => {
		if (title.trim() && title !== task.title) {
			onUpdate(task.id, { title: title.trim() });
		}
		setEditingTitle(false);
	};

	const handleToggleSubtask = (subtaskId) => {
		playSound(
			task.subtasks.find(st => st.id === subtaskId)?.completed ? 'uncheck' : 'check',
			soundEnabled
		);
		
		const updatedSubtasks = task.subtasks.map(st =>
			st.id === subtaskId ? { ...st, completed: !st.completed } : st
		);
		onUpdate(task.id, { subtasks: updatedSubtasks });
	};

	const handleDeleteSubtask = (subtaskId) => {
		const updatedSubtasks = task.subtasks.filter(st => st.id !== subtaskId);
		onUpdate(task.id, { subtasks: updatedSubtasks });
	};

	const handleFileChange = (e) => {
		const files = Array.from(e.target.files);
		const newAttachments = files.map(file => ({
			name: file.name,
			url: URL.createObjectURL(file),
			type: file.type,
		}));
		onUpdate(task.id, { attachments: [...(task.attachments || []), ...newAttachments] });
	};

	const removeAttachment = (index) => {
		const updatedAttachments = task.attachments.filter((_, i) => i !== index);
		onUpdate(task.id, { attachments: updatedAttachments });
	};

	return (
		<div className={`fixed ${isRTL ? 'left-0' : 'right-0'} top-0 h-screen w-[500px] bg-white border-${isRTL ? 'r' : 'l'}-2 border-gray-100 shadow-2xl z-50 overflow-y-auto scrollbar-thin animate-slide-in-${isRTL ? 'left' : 'right'}`}>
			<div className="sticky top-0 bg-gradient-to-br from-[var(--color-primary-50)] via-white to-[var(--color-secondary-50)] border-b-2 border-gray-100 p-6 z-10">
				<div className="flex items-center justify-between mb-5">
					<h2 className="text-xl font-black text-gray-900">
						{t('taskDetails')}
					</h2>
					<Button
						onClick={onClose}
						variant="ghost"
						size="icon"
						className="rounded-xl"
					>
						<X className="w-5 h-5" />
					</Button>
				</div>

				{editingTitle ? (
					<Input
						type="text"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						onBlur={handleSaveTitle}
						onKeyPress={(e) => e.key === 'Enter' && handleSaveTitle()}
						className="text-xl font-black"
						autoFocus
					/>
				) : (
					<h3
						onClick={() => setEditingTitle(true)}
						className="text-xl font-black text-gray-900 cursor-pointer hover:text-[var(--color-primary-600)] transition-colors px-4 py-3 hover:bg-white rounded-xl"
					>
						{task.title}
					</h3>
				)}
			</div>

			<div className="p-6 space-y-6">
				{/* Attachments Section */}
				<div>
					<Label className="text-sm font-black mb-3 flex items-center justify-between">
						<span className="flex items-center gap-2">
							<Paperclip className="w-4 h-4" />
							{t('attachments')}
						</span>
						<Button
							size="sm"
							variant="outline"
							onClick={() => fileInputRef.current?.click()}
						>
							<Plus className="w-3.5 h-3.5 mr-1.5" />
							{t('add')}
						</Button>
					</Label>
					<input
						ref={fileInputRef}
						type="file"
						accept="image/*"
						multiple
						onChange={handleFileChange}
						className="hidden"
					/>
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

				<TaskStatusSection task={task} onUpdate={onUpdate} t={t} />
				<TaskPrioritySection task={task} onUpdate={onUpdate} t={t} />
				<TaskDateTimeSection task={task} onUpdate={onUpdate} t={t} locale={locale} />
				<TaskRepeatSection task={task} onUpdate={onUpdate} t={t} />
				<TaskReminderSection task={task} onUpdate={onUpdate} t={t} locale={locale} />
				<TaskSubtasksSection 
					task={task} 
					onUpdate={onUpdate}
					onToggleSubtask={handleToggleSubtask}
					onDeleteSubtask={handleDeleteSubtask}
					t={t}
				/>
				<TaskLocationSection task={task} onUpdate={onUpdate} t={t} />
				<TaskNotesSection task={task} onUpdate={onUpdate} t={t} />
				<TaskStarSection task={task} onUpdate={onUpdate} t={t} />
			</div>

			<div className="sticky bottom-0 p-6 border-t-2 border-gray-100 bg-gray-50">
				<Button
					onClick={() => {
						if (confirm(t('confirmDelete'))) {
							onDelete(task.id);
						}
					}}
					variant="destructive"
					className="w-full font-black"
					size="lg"
				>
					<Trash2 className="w-5 h-5 mr-2" />
					{t('deleteTask')}
				</Button>
			</div>
		</div>
	);
}

// Task Detail Sections
function TaskStatusSection({ task, onUpdate, t }) {
	return (
		<div>
			<Label className="text-sm font-black mb-3 block">{t('status')}</Label>
			<div className="grid grid-cols-2 gap-2">
				{statusOptions.map((status) => (
					<Button
						key={status.id}
						onClick={() => onUpdate(task.id, { status: status.id })}
						variant={task.status === status.id ? "default" : "outline"}
						className="justify-start gap-2"
						style={{
							backgroundColor: task.status === status.id ? status.color : undefined,
							borderColor: status.color,
						}}
					>
						<div
							className="w-2.5 h-2.5 rounded-full"
							style={{ backgroundColor: task.status === status.id ? 'white' : status.color }}
						/>
						{t(`status.${status.label}`)}
					</Button>
				))}
			</div>
		</div>
	);
}

function TaskPrioritySection({ task, onUpdate, t }) {
	return (
		<div>
			<Label className="text-sm font-black mb-3 flex items-center gap-2">
				<Flag className="w-4 h-4" />
				{t('priority')}
			</Label>
			<div className="grid grid-cols-2 gap-2">
				{priorityLevels.map((priority) => {
					const Icon = priority.icon;
					return (
						<Button
							key={priority.id}
							onClick={() => onUpdate(task.id, { priority: priority.id })}
							variant={task.priority === priority.id ? "default" : "outline"}
							className="justify-start gap-2"
							style={{
								backgroundColor: task.priority === priority.id ? priority.color : undefined,
								borderColor: priority.color,
							}}
						>
							<Icon className="w-4 h-4" />
							{t(`priorities.${priority.label}`)}
						</Button>
					);
				})}
			</div>
		</div>
	);
}

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
					options={{
						dateFormat: 'Y-m-d',
						locale: locale,
					}}
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
					options={{
						enableTime: true,
						noCalendar: true,
						dateFormat: 'H:i',
						time_24hr: true,
					}}
					className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[var(--color-primary-500)] focus:ring-2 focus:ring-[var(--color-primary-100)] font-medium"
					placeholder={t('selectTime')}
				/>
			</div>
		</div>
	);
}

function TaskRepeatSection({ task, onUpdate, t }) {
	const [customDays, setCustomDays] = useState(task.customRepeatDays || 1);
	
	return (
		<div>
			<Label className="text-sm font-black mb-3 flex items-center gap-2">
				<Repeat className="w-4 h-4" />
				{t('repeat')}
			</Label>
			<select
				value={task.repeat}
				onChange={(e) => onUpdate(task.id, { repeat: e.target.value })}
				className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary-500)] font-semibold bg-white"
			>
				{repeatOptions.map((option) => (
					<option key={option.id} value={option.id}>{t(`repeat.${option.label}`)}</option>
				))}
			</select>
			
			{task.repeat === 'custom' && (
				<div className="flex items-center gap-3 mt-3">
					<Input
						type="number"
						min="1"
						value={customDays}
						onChange={(e) => setCustomDays(parseInt(e.target.value))}
						onBlur={() => onUpdate(task.id, { customRepeatDays: customDays })}
						className="w-24"
					/>
					<span className="text-sm text-gray-700 font-bold">{t('days')}</span>
				</div>
			)}
		</div>
	);
}

function TaskReminderSection({ task, onUpdate, t, locale }) {
	return (
		<div>
			<Label className="text-sm font-black mb-3 flex items-center gap-2">
				<Bell className="w-4 h-4" />
				{t('reminder')}
			</Label>
			<div className="flex items-center gap-3 mb-3">
				<Switch
					checked={task.hasReminder}
					onCheckedChange={(checked) => onUpdate(task.id, { hasReminder: checked })}
				/>
				<span className="text-sm text-gray-700 font-bold">{t('enableReminder')}</span>
			</div>
			{task.hasReminder && (
				<Flatpickr
					value={task.reminderTime || ''}
					onChange={([date]) => onUpdate(task.id, { reminderTime: date ? date.toISOString() : null })}
					options={{
						enableTime: true,
						dateFormat: 'Y-m-d H:i',
						time_24hr: true,
						locale: locale,
					}}
					className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary-500)] font-medium bg-white"
					placeholder={t('selectDateTime')}
				/>
			)}
		</div>
	);
}

function TaskSubtasksSection({ task, onUpdate, onToggleSubtask, onDeleteSubtask, t }) {
	const [showInput, setShowInput] = useState(false);
	const [newTitle, setNewTitle] = useState('');

	const handleAdd = (e) => {
		e.preventDefault();
		if (newTitle.trim()) {
			const newSubtask = {
				id: Date.now().toString(),
				title: newTitle.trim(),
				completed: false,
			};
			onUpdate(task.id, {
				subtasks: [...(task.subtasks || []), newSubtask]
			});
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
				<button
					onClick={() => setShowInput(true)}
					className="text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] text-sm font-black"
				>
					+ {t('add')}
				</button>
			</Label>

			<div className="space-y-2 mb-3">
				{task.subtasks?.map((subtask) => (
					<div key={subtask.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl group transition-all border border-transparent hover:border-gray-200">
						<Checkbox
							checked={subtask.completed}
							onCheckedChange={() => onToggleSubtask(subtask.id)}
						/>
						<span className={`flex-1 text-sm font-semibold ${subtask.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
							{subtask.title}
						</span>
						<Button
							size="icon"
							variant="ghost"
							onClick={() => onDeleteSubtask(subtask.id)}
							className="opacity-0 group-hover:opacity-100 h-8 w-8"
						>
							<X className="w-4 h-4 text-red-600" />
						</Button>
					</div>
				))}
			</div>

			{showInput && (
				<form onSubmit={handleAdd} className="flex gap-2">
					<Input
						type="text"
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

function TaskLocationSection({ task, onUpdate, t }) {
	return (
		<div>
			<Label className="text-sm font-black mb-3 flex items-center gap-2">
				<MapPin className="w-4 h-4" />
				{t('location')}
			</Label>
			<Input
				type="text"
				value={task.location || ''}
				onChange={(e) => onUpdate(task.id, { location: e.target.value })}
				placeholder={t('locationPlaceholder')}
			/>
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
			<Textarea
				value={task.notes || ''}
				onChange={(e) => onUpdate(task.id, { notes: e.target.value })}
				placeholder={t('notesPlaceholder')}
				rows={3}
			/>
		</div>
	);
}

function TaskStarSection({ task, onUpdate, t }) {
	return (
		<Button
			onClick={() => onUpdate(task.id, { isStarred: !task.isStarred })}
			variant={task.isStarred ? "default" : "outline"}
			className="w-full gap-2 font-black"
			size="lg"
			style={{
				background: task.isStarred ? 'linear-gradient(to right, var(--color-gradient-from), var(--color-gradient-to))' : undefined,
			}}
		>
			{task.isStarred ? <Star className="w-5 h-5 fill-white" /> : <StarOff className="w-5 h-5" />}
			{task.isStarred ? t('starred') : t('addToStarred')}
		</Button>
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
						<Switch
							checked={settings.soundEnabled}
							onCheckedChange={(checked) => onUpdateSettings({ ...settings, soundEnabled: checked })}
						/>
					</div>

					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<Eye className="w-5 h-5 text-gray-600" />
							<div>
								<Label className="font-black">{t('showCompleted')}</Label>
								<p className="text-xs text-gray-500">{t('showCompletedDesc')}</p>
							</div>
						</div>
						<Switch
							checked={settings.showCompleted}
							onCheckedChange={(checked) => onUpdateSettings({ ...settings, showCompleted: checked })}
						/>
					</div>

					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<List className="w-5 h-5 text-gray-600" />
							<div>
								<Label className="font-black">{t('compactView')}</Label>
								<p className="text-xs text-gray-500">{t('compactViewDesc')}</p>
							</div>
						</div>
						<Switch
							checked={settings.compactView}
							onCheckedChange={(checked) => onUpdateSettings({ ...settings, compactView: checked })}
						/>
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

					<div>
						<Label className="font-black mb-3 block">{t('defaultView')}</Label>
						<div className="grid grid-cols-2 gap-2">
							<Button
								variant={settings.defaultView === 'list' ? 'default' : 'outline'}
								onClick={() => onUpdateSettings({ ...settings, defaultView: 'list' })}
								className="justify-start gap-2"
							>
								<List className="w-4 h-4" />
								{t('listView')}
							</Button>
							<Button
								variant={settings.defaultView === 'grid' ? 'default' : 'outline'}
								onClick={() => onUpdateSettings({ ...settings, defaultView: 'grid' })}
								className="justify-start gap-2"
							>
								<Grid3x3 className="w-4 h-4" />
								{t('gridView')}
							</Button>
						</div>
					</div>
				</div>

				<div className="flex justify-end gap-2 mt-6">
					<Button onClick={onClose} className="bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)]">{t('done')}</Button>
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
			if (selectRef.current && !selectRef.current.contains(e.target)) {
				setIsOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const selectedPriority = value === 'all' ? { label: 'all' } : priorityLevels.find(p => p.id === value);

	return (
		<div ref={selectRef} className="relative">
			<Button
				onClick={() => setIsOpen(!isOpen)}
				variant="outline"
				className="gap-2"
			>
				<Filter className="w-4 h-4" />
				{t(`priorities.${selectedPriority?.label}`)}
				<ChevronDown className="w-4 h-4" />
			</Button>
			{isOpen && (
				<div className="absolute z-50 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl overflow-hidden min-w-[180px]">
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
								<div
									className="w-3 h-3 rounded-full"
									style={{ backgroundColor: priority.color }}
								/>
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
			if (selectRef.current && !selectRef.current.contains(e.target)) {
				setIsOpen(false);
			}
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

	const selectedSort = sortOptions.find(s => s.id === value);

	return (
		<div ref={selectRef} className="relative">
			<Button
				onClick={() => setIsOpen(!isOpen)}
				variant="outline"
				className="gap-2"
			>
				<TrendingUp className="w-4 h-4" />
				{t(`sort.${selectedSort?.label}`)}
				<ChevronDown className="w-4 h-4" />
			</Button>
			{isOpen && (
				<div className="absolute z-50 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl overflow-hidden min-w-[160px]">
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
function EmptyState({ selectedFolder, t }) {
	return (
		<div className="text-center py-20">
			<div className="w-40 h-40 mx-auto mb-8 rounded-full bg-gradient-to-br from-[var(--color-primary-100)] to-[var(--color-secondary-100)] flex items-center justify-center shadow-lg">
				<ListTodo className="w-20 h-20 text-[var(--color-primary-600)]" />
			</div>
			<h3 className="text-3xl font-black text-gray-900 mb-3">
				{t('noTasks')}
			</h3>
			<p className="text-gray-600 text-lg font-semibold">
				{t('addFirstTask')}
			</p>
		</div>
	);
}