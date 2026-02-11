'use client';

import { useState, useRef } from 'react';
import {
	Plus,
	X,
	Check,
	ChevronRight,
	Folder,
	Calendar,
	Clock,
	Star,
	StarOff,
	Tag,
	MoreHorizontal,
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
	Search,
	Filter,
	GripVertical,
	FolderPlus,
	ListPlus,
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
} from 'lucide-react';
import { useTranslations } from 'next-intl';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

// Priority levels with beautiful colors
const priorityLevels = [
	{ id: 'none', label: 'None', color: '#94a3b8', icon: Circle },
	{ id: 'low', label: 'Low', color: '#3b82f6', icon: Flag },
	{ id: 'medium', label: 'Medium', color: '#f59e0b', icon: Flag },
	{ id: 'high', label: 'High', color: '#ef4444', icon: Flag },
	{ id: 'urgent', label: 'Urgent', color: '#dc2626', icon: Zap },
];

// Repeat options
const repeatOptions = [
	{ id: 'none', label: 'Does not repeat' },
	{ id: 'daily', label: 'Daily' },
	{ id: 'every-2-days', label: 'Every 2 days' },
	{ id: 'every-3-days', label: 'Every 3 days' },
	{ id: 'weekly', label: 'Weekly' },
	{ id: 'bi-weekly', label: 'Every 2 weeks' },
	{ id: 'monthly', label: 'Monthly' },
	{ id: 'custom', label: 'Custom...' },
];

// Status options
const statusOptions = [
	{ id: 'todo', label: 'To Do', color: '#6366f1' },
	{ id: 'in-progress', label: 'In Progress', color: '#f59e0b' },
	{ id: 'completed', label: 'Completed', color: '#10b981' },
	{ id: 'cancelled', label: 'Cancelled', color: '#ef4444' },
];

// Sortable Task Item Component
function SortableTaskItem({ task, onToggle, onSelect, onQuickEdit, onQuickDelete, onQuickAddSubtask, isSelected, soundEnabled, viewMode, t }) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: task.id });

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

	if (viewMode === 'grid') {
		return (
			<div
				ref={setNodeRef}
				style={style}
				className={`group bg-white rounded-2xl border transition-all hover:shadow-lg ${
					isSelected
						? 'border-primary shadow-xl ring-4 ring-primary/10'
						: 'border-gray-200 hover:border-gray-300'
				}`}
			>
				<div className="p-5">
					{/* Drag Handle */}
					<div className="flex items-start justify-between mb-3">
						<div
							{...attributes}
							{...listeners}
							className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
						>
							<GripVertical className="w-4 h-4 text-gray-400" />
						</div>
						{task.isStarred && (
							<Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
						)}
					</div>

					{/* Checkbox */}
					<div className="mb-4">
						<Checkbox
							checked={task.completed}
							onCheckedChange={() => onToggle(task.id)}
							className="data-[state=checked]:bg-primary data-[state=checked]:border-primary w-6 h-6"
						/>
					</div>

					{/* Content */}
					<div onClick={onSelect} className="cursor-pointer">
						<h3 className={`font-semibold text-base mb-2 ${
							task.completed ? 'line-through text-gray-400' : 'text-gray-900'
						}`}>
							{task.title}
						</h3>

						{task.description && !task.completed && (
							<p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
						)}

						{/* Meta */}
						<div className="space-y-2">
							{task.priority !== 'none' && (
								<div
									className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-white"
									style={{ backgroundColor: priority.color }}
								>
									<PriorityIcon className="w-3 h-3" />
									{priority.label}
								</div>
							)}

							{task.dueDate && (
								<div className={`flex items-center gap-1.5 text-xs font-medium ${
									isOverdue ? 'text-red-600' : 'text-gray-600'
								}`}>
									<Calendar className="w-3.5 h-3.5" />
									{new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
								</div>
							)}

							{totalSubtasks > 0 && (
								<div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
									<CheckCircle className="w-3.5 h-3.5" />
									{completedSubtasks}/{totalSubtasks} tasks
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		);
	}

	// List view
	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`group bg-white rounded-xl border transition-all ${
				isSelected
					? 'border-primary shadow-lg ring-4 ring-primary/10'
					: 'border-gray-200 hover:border-gray-300 hover:shadow-md'
			}`}
		>
			<div className="flex items-center gap-4 p-4">
				{/* Drag Handle */}
				<div
					{...attributes}
					{...listeners}
					className="flex-shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
				>
					<GripVertical className="w-4 h-4 text-gray-400" />
				</div>

				{/* Checkbox */}
				<Checkbox
					checked={task.completed}
					onCheckedChange={() => onToggle(task.id)}
					className="data-[state=checked]:bg-primary data-[state=checked]:border-primary flex-shrink-0"
				/>

				{/* Content */}
				<div className="flex-1 min-w-0" onClick={onSelect}>
					<div className="flex items-start gap-3">
						<div className="flex-1 min-w-0">
							<h3 className={`font-semibold text-sm mb-1 ${
								task.completed ? 'line-through text-gray-400' : 'text-gray-900'
							}`}>
								{task.title}
							</h3>

							{task.description && !task.completed && (
								<p className="text-sm text-gray-600 line-clamp-1">{task.description}</p>
							)}
						</div>
						
						{task.isStarred && (
							<Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
						)}
					</div>

					{/* Meta */}
					<div className="flex items-center gap-2 mt-2 flex-wrap">
						{task.priority !== 'none' && (
							<span
								className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold text-white"
								style={{ backgroundColor: priority.color }}
							>
								<PriorityIcon className="w-3 h-3" />
								{priority.label}
							</span>
						)}

						{task.dueDate && (
							<span className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
								isOverdue
									? 'bg-red-100 text-red-700'
									: 'bg-gray-100 text-gray-700'
							}`}>
								<Calendar className="w-3 h-3" />
								{new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
							</span>
						)}

						{task.repeat !== 'none' && (
							<span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md text-xs font-medium">
								<Repeat className="w-3 h-3" />
							</span>
						)}

						{totalSubtasks > 0 && (
							<span className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
								completedSubtasks === totalSubtasks
									? 'bg-green-100 text-green-700'
									: 'bg-gray-100 text-gray-700'
							}`}>
								<CheckCircle className="w-3 h-3" />
								{completedSubtasks}/{totalSubtasks}
							</span>
						)}

						{task.tags && task.tags.length > 0 && (
							<span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-xs font-medium">
								<Hash className="w-3 h-3" />
								{task.tags.length}
							</span>
						)}
					</div>
				</div>

				{/* Quick Actions */}
				<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
					<button
						onClick={(e) => {
							e.stopPropagation();
							onQuickEdit(task);
						}}
						className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
						title={t ? t('quickEdit') : 'Edit'}
					>
						<Edit2 className="w-4 h-4 text-primary" />
					</button>
					<button
						onClick={(e) => {
							e.stopPropagation();
							onQuickAddSubtask(task);
						}}
						className="p-2 hover:bg-green-100 rounded-lg transition-colors"
						title={t ? t('addSubtask') : 'Add Subtask'}
					>
						<ListPlus className="w-4 h-4 text-green-600" />
					</button>
					<button
						onClick={(e) => {
							e.stopPropagation();
							if (confirm(t ? t('confirmDelete') : 'Delete this task?')) {
								onQuickDelete(task.id);
							}
						}}
						className="p-2 hover:bg-red-100 rounded-lg transition-colors"
						title={t ? t('delete') : 'Delete'}
					>
						<Trash2 className="w-4 h-4 text-red-600" />
					</button>
				</div>
			</div>
		</div>
	);
}

// Main Todo Component
export default function TodoTab() {
	const t = useTranslations('todo');

	// State
	const [folders, setFolders] = useState([
		{ 
			id: 'inbox', 
			name: t ? t('folders.inbox') : 'Inbox', 
			color: '#6366f1', 
			icon: Inbox,
			isSystem: true
		},
		{ 
			id: 'today', 
			name: t ? t('folders.today') : 'Today', 
			color: '#f59e0b', 
			icon: Sun,
			isSystem: true
		},
		{ 
			id: 'starred', 
			name: t ? t('folders.starred') : 'Starred', 
			color: '#eab308', 
			icon: Star,
			isSystem: true
		},
		{ 
			id: 'personal', 
			name: t ? t('folders.personal') : 'Personal', 
			color: '#8b5cf6', 
			icon: Target,
			isSystem: false
		},
		{ 
			id: 'work', 
			name: t ? t('folders.work') : 'Work', 
			color: '#06b6d4', 
			icon: Sparkles,
			isSystem: false
		},
		{ 
			id: 'shopping', 
			name: t ? t('folders.shopping') : 'Shopping', 
			color: '#ec4899', 
			icon: Zap,
			isSystem: false
		},
	]);

	const [tasks, setTasks] = useState([
		{
			id: '1',
			title: 'Complete project proposal',
			description: 'Finish the Q1 proposal for the new client with detailed breakdown',
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
			subtasks: [
				{ id: 's1', title: 'Research competitor solutions', completed: true, dueDate: '2024-02-10' },
				{ id: 's2', title: 'Create presentation deck', completed: false, dueDate: '2024-02-12' },
				{ id: 's3', title: 'Review with team', completed: false, dueDate: '2024-02-14' },
			],
			createdAt: new Date('2024-02-01'),
			updatedAt: new Date(),
		},
		{
			id: '2',
			title: 'Morning workout',
			description: '30 min cardio + stretching routine',
			folderId: 'personal',
			completed: false,
			status: 'todo',
			priority: 'medium',
			dueDate: null,
			dueTime: '07:00',
			repeat: 'daily',
			customRepeatDays: null,
			hasReminder: true,
			reminderTime: '06:45',
			tags: ['health', 'fitness'],
			isStarred: true,
			location: 'Home Gym',
			notes: '',
			subtasks: [
				{ id: 's4', title: 'Warm up - 5 min', completed: false },
				{ id: 's5', title: 'Cardio - 20 min', completed: false },
				{ id: 's6', title: 'Stretching - 5 min', completed: false },
			],
			createdAt: new Date('2024-01-15'),
			updatedAt: new Date(),
		},
		{
			id: '3',
			title: 'Buy groceries',
			description: 'Weekly grocery shopping',
			folderId: 'shopping',
			completed: false,
			status: 'todo',
			priority: 'low',
			dueDate: '2024-02-12',
			dueTime: null,
			repeat: 'none',
			customRepeatDays: null,
			hasReminder: false,
			reminderTime: null,
			tags: ['errands'],
			isStarred: false,
			location: 'Whole Foods Market',
			notes: 'Check if we need milk',
			subtasks: [
				{ id: 's7', title: 'Fruits and vegetables', completed: false },
				{ id: 's8', title: 'Dairy products', completed: false },
				{ id: 's9', title: 'Pantry items', completed: false },
			],
			createdAt: new Date('2024-02-01'),
			updatedAt: new Date(),
		},
	]);

	const [selectedFolder, setSelectedFolder] = useState('inbox');
	const [selectedTask, setSelectedTask] = useState(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [soundEnabled, setSoundEnabled] = useState(true);
	const [showAddFolder, setShowAddFolder] = useState(false);
	const [newFolderName, setNewFolderName] = useState('');
	const [newFolderColor, setNewFolderColor] = useState('#6366f1');
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [filterPriority, setFilterPriority] = useState('all');
	const [sortBy, setSortBy] = useState('manual');
	const [activeId, setActiveId] = useState(null);
	const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		})
	);

	// Add new task
	const handleAddTask = (title) => {
		if (!title.trim()) return;

		const newTask = {
			id: Date.now().toString(),
			title: title.trim(),
			description: '',
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
			subtasks: [],
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		setTasks([...tasks, newTask]);
	};

	// Toggle task completion
	const handleToggleTask = (taskId) => {
		playSound(tasks.find(t => t.id === taskId)?.completed ? 'uncheck' : 'check', soundEnabled);
		
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

	// Update task
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

	// Delete task
	const handleDeleteTask = (taskId) => {
		setTasks(tasks.filter(t => t.id !== taskId));
		if (selectedTask?.id === taskId) {
			setSelectedTask(null);
		}
	};

	// Quick actions
	const handleQuickEdit = (task) => {
		setSelectedTask(task);
	};

	const handleQuickAddSubtask = (task) => {
		const newSubtask = {
			id: Date.now().toString(),
			title: 'New subtask',
			completed: false,
		};
		handleUpdateTask(task.id, {
			subtasks: [...(task.subtasks || []), newSubtask]
		});
		setSelectedTask(tasks.find(t => t.id === task.id));
	};

	// Add folder
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
		setNewFolderColor('#6366f1');
		setShowAddFolder(false);
		setSelectedFolder(newFolder.id);
	};

	// Delete folder
	const handleDeleteFolder = (folderId) => {
		setTasks(tasks.map(t => 
			t.folderId === folderId ? { ...t, folderId: 'inbox' } : t
		));
		setFolders(folders.filter(f => f.id !== folderId));
		setSelectedFolder('inbox');
	};

	// Drag and drop handlers
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

	// Get filtered tasks
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

		if (searchTerm) {
			filtered = filtered.filter(t =>
				t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
				t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				t.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
			);
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
		<div className="flex h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 overflow-hidden">
			{/* Left Sidebar - Folders */}
			<div 
				className={`bg-white border-r border-gray-200 transition-all duration-300 flex-shrink-0 ${
					sidebarCollapsed ? 'w-20' : 'w-80'
				}`}
			>
				<div className="h-full flex flex-col">
					{/* Header */}
					<div className="p-6 border-b border-gray-200">
						<div className="flex items-center justify-between mb-6">
							{!sidebarCollapsed && (
								<h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary-600 bg-clip-text text-transparent">
									{t ? t('title') : 'Todos'}
								</h1>
							)}
							<button
								onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
								className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
							>
								<Menu className="w-5 h-5 text-gray-600" />
							</button>
						</div>

						{!sidebarCollapsed && (
							<div className="flex items-center gap-2">
								<button
									onClick={() => setSoundEnabled(!soundEnabled)}
									className={`p-2.5 rounded-lg transition-all flex-1 ${
										soundEnabled
											? 'bg-gradient-to-r from-primary to-secondary-600 text-white shadow-md'
											: 'bg-gray-100 text-gray-600 hover:bg-gray-200'
									}`}
								>
									{soundEnabled ? <Volume2 className="w-4 h-4 mx-auto" /> : <VolumeX className="w-4 h-4 mx-auto" />}
								</button>
								<button className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex-1">
									<Settings className="w-4 h-4 text-gray-600 mx-auto" />
								</button>
							</div>
						)}
					</div>

					{/* Folders */}
					<div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin">
						{/* System folders */}
						<div className="mb-6">
							{!sidebarCollapsed && (
								<h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-3">
									{t ? t('systemFolders') : 'System'}
								</h3>
							)}
							{folders.filter(f => f.isSystem).map((folder) => {
								const Icon = folder.icon;
								const count = folder.id === 'inbox' 
									? tasks.filter(t => t.folderId === 'inbox' && !t.completed).length
									: folder.id === 'today'
									? getFilteredTasks().filter(t => !t.completed).length
									: folder.id === 'starred'
									? tasks.filter(t => t.isStarred && !t.completed).length
									: 0;

								return (
									<button
										key={folder.id}
										onClick={() => setSelectedFolder(folder.id)}
										className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
											selectedFolder === folder.id
												? 'bg-gradient-to-r from-primary to-secondary-600 text-white shadow-lg scale-[1.02]'
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
												<span className="flex-1 text-left font-semibold text-sm">{folder.name}</span>
												{count > 0 && (
													<span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
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

						{/* Custom folders */}
						<div>
							{!sidebarCollapsed && (
								<div className="flex items-center justify-between mb-3 px-3">
									<h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
										{t ? t('myFolders') : 'My Folders'}
									</h3>
									<button
										onClick={() => setShowAddFolder(true)}
										className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors group"
										title={t ? t('addFolder') : 'Add Folder'}
									>
										<FolderPlus className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
									</button>
								</div>
							)}
							
							{folders.filter(f => !f.isSystem).map((folder) => {
								const Icon = folder.icon;
								const count = tasks.filter(t => t.folderId === folder.id && !t.completed).length;

								return (
									<div key={folder.id} className="relative group/folder">
										<button
											onClick={() => setSelectedFolder(folder.id)}
											className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
												selectedFolder === folder.id
													? 'bg-gradient-to-r from-primary to-secondary-600 text-white shadow-lg scale-[1.02]'
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
													<span className="flex-1 text-left font-semibold text-sm truncate">{folder.name}</span>
													{count > 0 && (
														<span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
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
													if (confirm(t ? t('confirmDeleteFolder') : 'Delete this folder?')) {
														handleDeleteFolder(folder.id);
													}
												}}
												className="absolute ltr:right-2 rtl:left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/folder:opacity-100 p-1.5 bg-red-500 hover:bg-red-600 rounded-lg transition-all shadow-lg"
											>
												<Trash2 className="w-3.5 h-3.5 text-white" />
											</button>
										)}
									</div>
								);
							})}
						</div>

						{/* Add folder form */}
						{showAddFolder && !sidebarCollapsed && (
							<div className="mt-4 p-4 bg-gradient-to-br from-primary/5 to-secondary-600/5 rounded-xl border-2 border-primary/20">
								<input
									type="text"
									value={newFolderName}
									onChange={(e) => setNewFolderName(e.target.value)}
									onKeyPress={(e) => e.key === 'Enter' && handleAddFolder()}
									placeholder={t ? t('folderNamePlaceholder') : "Folder name..."}
									className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm mb-3"
									autoFocus
								/>
								<div className="flex items-center gap-3 mb-3">
									<input
										type="color"
										value={newFolderColor}
										onChange={(e) => setNewFolderColor(e.target.value)}
										className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200"
									/>
									<span className="text-sm text-gray-600 font-medium">{t ? t('pickColor') : 'Pick a color'}</span>
								</div>
								<div className="flex gap-2">
									<button
										onClick={handleAddFolder}
										className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary to-secondary-600 text-white rounded-lg text-sm font-bold hover:shadow-lg transition-all"
									>
										{t ? t('add') : 'Add'}
									</button>
									<button
										onClick={() => setShowAddFolder(false)}
										className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold transition-all"
									>
										{t ? t('cancel') : 'Cancel'}
									</button>
								</div>
							</div>
						)}
					</div>

					{/* Stats */}
					{!sidebarCollapsed && (
						<div className="p-4 border-t border-gray-200 bg-gradient-to-br from-primary/5 to-secondary-600/5">
							<div className="grid grid-cols-2 gap-3">
								<div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
									<div className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary-600 bg-clip-text text-transparent">
										{tasks.filter(t => !t.completed).length}
									</div>
									<div className="text-xs text-gray-600 font-medium mt-1">{t ? t('activeTasks') : 'Active'}</div>
								</div>
								<div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
									<div className="text-3xl font-bold text-green-600">
										{tasks.filter(t => t.completed).length}
									</div>
									<div className="text-xs text-gray-600 font-medium mt-1">{t ? t('completed') : 'Done'}</div>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Main Content - Task List */}
			<div className="flex-1 flex flex-col overflow-hidden">
				{/* Header */}
				<div className="bg-white border-b border-gray-200 p-6 shadow-sm">
					<div className="flex items-center justify-between mb-5">
						<div className="flex items-center gap-4">
							{currentFolder && (
								<>
									{(() => {
										const Icon = currentFolder.icon;
										return (
											<div 
												className="p-3 rounded-2xl shadow-md"
												style={{ backgroundColor: `${currentFolder.color}15` }}
											>
												<Icon className="w-7 h-7" style={{ color: currentFolder.color }} />
											</div>
										);
									})()}
									<div>
										<h2 className="text-3xl font-bold text-gray-900">{currentFolder.name}</h2>
										<p className="text-sm text-gray-600 mt-1">
											{filteredTasks.filter(t => !t.completed).length} active tasks
										</p>
									</div>
								</>
							)}
						</div>
						
						<div className="flex items-center gap-3">
							{/* View Mode Toggle */}
							<div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
								<button
									onClick={() => setViewMode('list')}
									className={`p-2 rounded-md transition-all ${
										viewMode === 'list'
											? 'bg-white text-primary shadow-sm'
											: 'text-gray-600 hover:text-gray-900'
									}`}
								>
									<List className="w-4 h-4" />
								</button>
								<button
									onClick={() => setViewMode('grid')}
									className={`p-2 rounded-md transition-all ${
										viewMode === 'grid'
											? 'bg-white text-primary shadow-sm'
											: 'text-gray-600 hover:text-gray-900'
									}`}
								>
									<Grid3x3 className="w-4 h-4" />
								</button>
							</div>

							{/* Priority Filter */}
							<Select value={filterPriority} onValueChange={setFilterPriority}>
								<SelectTrigger className="w-[140px] h-10">
									<SelectValue placeholder="Priority" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Priorities</SelectItem>
									{priorityLevels.slice(1).map((priority) => (
										<SelectItem key={priority.id} value={priority.id}>
											<div className="flex items-center gap-2">
												<div
													className="w-3 h-3 rounded-full"
													style={{ backgroundColor: priority.color }}
												/>
												{priority.label}
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							
							{/* Sort */}
							<Select value={sortBy} onValueChange={setSortBy}>
								<SelectTrigger className="w-[140px] h-10">
									<SelectValue placeholder="Sort by" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="manual">Manual</SelectItem>
									<SelectItem value="dueDate">Due Date</SelectItem>
									<SelectItem value="priority">Priority</SelectItem>
									<SelectItem value="alphabetical">A-Z</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Search */}
					<div className="relative">
						<Search className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
						<input
							type="text"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							placeholder={t ? t('searchPlaceholder') : "Search tasks..."}
							className="w-full ltr:pl-12 rtl:pr-12 ltr:pr-4 rtl:pl-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
						/>
					</div>

					{/* Quick add task */}
					<QuickAddTask onAdd={handleAddTask} t={t} />
				</div>

				{/* Task List with Drag and Drop */}
				<div className="flex-1 overflow-y-auto p-6">
					{filteredTasks.length === 0 ? (
						<EmptyState selectedFolder={selectedFolder} searchTerm={searchTerm} t={t} />
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
											onSelect={() => setSelectedTask(task)}
											onQuickEdit={handleQuickEdit}
											onQuickDelete={handleDeleteTask}
											onQuickAddSubtask={handleQuickAddSubtask}
											isSelected={selectedTask?.id === task.id}
											soundEnabled={soundEnabled}
											viewMode={viewMode}
											t={t}
										/>
									))}
								</div>
							</SortableContext>

							<DragOverlay>
								{activeTask ? (
									<div className="bg-white rounded-xl border-2 border-primary shadow-2xl p-4 opacity-90 rotate-2">
										<h3 className="font-semibold text-gray-800">{activeTask.title}</h3>
									</div>
								) : null}
							</DragOverlay>
						</DndContext>
					)}
				</div>
			</div>

			{/* Right Sidebar - Task Details */}
			{selectedTask && (
				<TaskDetailPanel
					task={selectedTask}
					onUpdate={handleUpdateTask}
					onDelete={handleDeleteTask}
					onClose={() => setSelectedTask(null)}
					soundEnabled={soundEnabled}
					t={t}
				/>
			)}
		</div>
	);
}

// Quick Add Task Component
function QuickAddTask({ onAdd, t }) {
	const [title, setTitle] = useState('');

	const handleSubmit = (e) => {
		e.preventDefault();
		if (title.trim()) {
			onAdd(title);
			setTitle('');
		}
	};

	return (
		<form onSubmit={handleSubmit} className="mt-4">
			<div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/5 to-secondary-600/5 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary transition-all">
				<div className="p-2 bg-primary/10 rounded-lg">
					<Plus className="w-5 h-5 text-primary flex-shrink-0" />
				</div>
				<input
					type="text"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					placeholder={t ? t('addTaskPlaceholder') : "Add a new task..."}
					className="flex-1 bg-transparent border-none focus:outline-none text-gray-800 placeholder-gray-500 font-medium"
				/>
			</div>
		</form>
	);
}

// Task Detail Panel Component
function TaskDetailPanel({ task, onUpdate, onDelete, onClose, soundEnabled, t }) {
	const [editingTitle, setEditingTitle] = useState(false);
	const [title, setTitle] = useState(task.title);
	const [description, setDescription] = useState(task.description || '');
	const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
	const [showSubtaskInput, setShowSubtaskInput] = useState(false);
	const [newTag, setNewTag] = useState('');
	const [customRepeatDays, setCustomRepeatDays] = useState(task.customRepeatDays || 1);

	const handleSaveTitle = () => {
		if (title.trim() && title !== task.title) {
			onUpdate(task.id, { title: title.trim() });
		}
		setEditingTitle(false);
	};

	const handleAddSubtask = () => {
		if (newSubtaskTitle.trim()) {
			const newSubtask = {
				id: Date.now().toString(),
				title: newSubtaskTitle.trim(),
				completed: false,
			};
			onUpdate(task.id, {
				subtasks: [...(task.subtasks || []), newSubtask]
			});
			setNewSubtaskTitle('');
			setShowSubtaskInput(false);
		}
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

	const handleAddTag = () => {
		if (newTag.trim() && !task.tags?.includes(newTag.trim())) {
			onUpdate(task.id, {
				tags: [...(task.tags || []), newTag.trim()]
			});
			setNewTag('');
		}
	};

	const handleRemoveTag = (tagToRemove) => {
		onUpdate(task.id, {
			tags: task.tags.filter(tag => tag !== tagToRemove)
		});
	};

	return (
		<div className="w-[500px] bg-white border-l border-gray-200 flex flex-col h-screen overflow-hidden ltr:animate-slide-in-right rtl:animate-slide-in-left shadow-2xl">
			{/* Header */}
			<div className="p-6 border-b border-gray-200 bg-gradient-to-br from-primary/5 to-secondary-600/5 flex-shrink-0">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-bold text-gray-900">
						{t ? t('taskDetails') : 'Task Details'}
					</h2>
					<button
						onClick={onClose}
						className="p-2 hover:bg-white rounded-lg transition-colors"
					>
						<X className="w-5 h-5 text-gray-600" />
					</button>
				</div>

				{/* Title */}
				{editingTitle ? (
					<input
						type="text"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						onBlur={handleSaveTitle}
						onKeyPress={(e) => e.key === 'Enter' && handleSaveTitle()}
						className="w-full px-4 py-3 border-2 border-primary rounded-xl focus:outline-none text-xl font-bold"
						autoFocus
					/>
				) : (
					<h3
						onClick={() => setEditingTitle(true)}
						className="text-xl font-bold text-gray-900 cursor-pointer hover:text-primary transition-colors px-4 py-3 hover:bg-white rounded-xl"
					>
						{task.title}
					</h3>
				)}
			</div>

			{/* Content - Scrollable */}
			<div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
				{/* Status */}
				<div>
					<label className="text-sm font-bold text-gray-700 mb-2 block">
						{t ? t('status') : 'Status'}
					</label>
					<Select value={task.status} onValueChange={(value) => onUpdate(task.id, { status: value })}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{statusOptions.map((status) => (
								<SelectItem key={status.id} value={status.id}>
									<div className="flex items-center gap-2">
										<div
											className="w-3 h-3 rounded-full"
											style={{ backgroundColor: status.color }}
										/>
										{status.label}
									</div>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Description */}
				<div>
					<label className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
						<AlignLeft className="w-4 h-4" />
						{t ? t('description') : 'Description'}
					</label>
					<textarea
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						onBlur={() => onUpdate(task.id, { description })}
						placeholder={t ? t('descriptionPlaceholder') : "Add a description..."}
						className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 resize-none min-h-[100px]"
					/>
				</div>

				{/* Priority */}
				<div>
					<label className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
						<Flag className="w-4 h-4" />
						{t ? t('priority') : 'Priority'}
					</label>
					<div className="grid grid-cols-2 gap-2">
						{priorityLevels.map((priority) => {
							const Icon = priority.icon;
							return (
								<button
									key={priority.id}
									onClick={() => onUpdate(task.id, { priority: priority.id })}
									className={`p-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
										task.priority === priority.id
											? 'text-white shadow-md scale-105'
											: 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-gray-200'
									}`}
									style={{
										backgroundColor: task.priority === priority.id ? priority.color : undefined
									}}
								>
									<Icon className="w-4 h-4" />
									{priority.label}
								</button>
							);
						})}
					</div>
				</div>

				{/* Due Date & Time */}
				<div className="grid grid-cols-2 gap-4">
					<div>
						<label className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
							<Calendar className="w-4 h-4" />
							{t ? t('dueDate') : 'Due Date'}
						</label>
						<input
							type="date"
							value={task.dueDate || ''}
							onChange={(e) => onUpdate(task.id, { dueDate: e.target.value })}
							className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
						/>
					</div>
					<div>
						<label className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
							<Clock className="w-4 h-4" />
							{t ? t('time') : 'Time'}
						</label>
						<input
							type="time"
							value={task.dueTime || ''}
							onChange={(e) => onUpdate(task.id, { dueTime: e.target.value })}
							className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
						/>
					</div>
				</div>

				{/* Repeat */}
				<div>
					<label className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
						<Repeat className="w-4 h-4" />
						{t ? t('repeat') : 'Repeat'}
					</label>
					<Select value={task.repeat} onValueChange={(value) => onUpdate(task.id, { repeat: value })}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{repeatOptions.map((option) => (
								<SelectItem key={option.id} value={option.id}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					
					{task.repeat === 'custom' && (
						<div className="flex items-center gap-2 mt-2">
							<input
								type="number"
								min="1"
								value={customRepeatDays}
								onChange={(e) => setCustomRepeatDays(parseInt(e.target.value))}
								onBlur={() => onUpdate(task.id, { customRepeatDays })}
								className="w-20 px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary"
							/>
							<span className="text-sm text-gray-600 font-medium">
								{t ? t('days') : 'days'}
							</span>
						</div>
					)}
				</div>

				{/* Reminder */}
				<div>
					<label className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
						<Bell className="w-4 h-4" />
						{t ? t('reminder') : 'Reminder'}
					</label>
					<div className="flex items-center gap-3 mb-2">
						<Checkbox
							checked={task.hasReminder}
							onCheckedChange={(checked) => onUpdate(task.id, { hasReminder: checked })}
							className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
						/>
						<span className="text-sm text-gray-700 font-medium">
							{t ? t('enableReminder') : 'Enable reminder'}
						</span>
					</div>
					{task.hasReminder && (
						<input
							type="datetime-local"
							value={task.reminderTime || ''}
							onChange={(e) => onUpdate(task.id, { reminderTime: e.target.value })}
							className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
						/>
					)}
				</div>

				{/* Tags */}
				<div>
					<label className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
						<Hash className="w-4 h-4" />
						{t ? t('tags') : 'Tags'}
					</label>
					<div className="flex flex-wrap gap-2 mb-2">
						{task.tags?.map((tag, idx) => (
							<span
								key={idx}
								className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-semibold flex items-center gap-2"
							>
								#{tag}
								<button
									onClick={() => handleRemoveTag(tag)}
									className="hover:text-indigo-900"
								>
									<X className="w-3.5 h-3.5" />
								</button>
							</span>
						))}
					</div>
					<div className="flex gap-2">
						<input
							type="text"
							value={newTag}
							onChange={(e) => setNewTag(e.target.value)}
							onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
							placeholder={t ? t('addTagPlaceholder') : "Add tag..."}
							className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary text-sm"
						/>
						<button
							onClick={handleAddTag}
							className="px-4 py-2 bg-gradient-to-r from-primary to-secondary-600 text-white rounded-lg font-bold hover:shadow-lg transition-all"
						>
							{t ? t('add') : 'Add'}
						</button>
					</div>
				</div>

				{/* Subtasks */}
				<div>
					<label className="text-sm font-bold text-gray-700 mb-3 flex items-center justify-between">
						<span className="flex items-center gap-2">
							<CheckCircle className="w-4 h-4" />
							{t ? t('subtasks') : 'Subtasks'}
						</span>
						<button
							onClick={() => setShowSubtaskInput(true)}
							className="text-primary hover:text-primary/80 text-sm font-bold"
						>
							+ {t ? t('add') : 'Add'}
						</button>
					</label>

					<div className="space-y-2 mb-3">
						{task.subtasks?.map((subtask) => (
							<div key={subtask.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg group transition-colors">
								<Checkbox
									checked={subtask.completed}
									onCheckedChange={() => handleToggleSubtask(subtask.id)}
									className="data-[state=checked]:bg-primary data-[state=checked]:border-primary flex-shrink-0"
								/>
								<span className={`flex-1 text-sm ${subtask.completed ? 'line-through text-gray-400' : 'text-gray-700 font-medium'}`}>
									{subtask.title}
								</span>
								<button
									onClick={() => handleDeleteSubtask(subtask.id)}
									className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 rounded-lg transition-all"
								>
									<X className="w-3.5 h-3.5 text-red-600" />
								</button>
							</div>
						))}
					</div>

					{showSubtaskInput && (
						<div className="flex gap-2">
							<input
								type="text"
								value={newSubtaskTitle}
								onChange={(e) => setNewSubtaskTitle(e.target.value)}
								onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
								placeholder={t ? t('subtaskPlaceholder') : "Subtask title..."}
								className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary text-sm"
								autoFocus
							/>
							<button
								onClick={handleAddSubtask}
								className="px-4 py-2 bg-gradient-to-r from-primary to-secondary-600 text-white rounded-lg font-bold hover:shadow-lg transition-all"
							>
								{t ? t('add') : 'Add'}
							</button>
							<button
								onClick={() => setShowSubtaskInput(false)}
								className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
							>
								<X className="w-5 h-5 text-gray-600" />
							</button>
						</div>
					)}
				</div>

				{/* Location */}
				<div>
					<label className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
						<MapPin className="w-4 h-4" />
						{t ? t('location') : 'Location'}
					</label>
					<input
						type="text"
						value={task.location || ''}
						onChange={(e) => onUpdate(task.id, { location: e.target.value })}
						placeholder={t ? t('locationPlaceholder') : "Add location..."}
						className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
					/>
				</div>

				{/* Notes */}
				<div>
					<label className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
						<FileText className="w-4 h-4" />
						{t ? t('notes') : 'Notes'}
					</label>
					<textarea
						value={task.notes || ''}
						onChange={(e) => onUpdate(task.id, { notes: e.target.value })}
						placeholder={t ? t('notesPlaceholder') : "Add notes..."}
						className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 resize-none min-h-[80px]"
					/>
				</div>

				{/* Star */}
				<div>
					<button
						onClick={() => onUpdate(task.id, { isStarred: !task.isStarred })}
						className={`w-full p-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
							task.isStarred
								? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg'
								: 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-gray-200'
						}`}
					>
						{task.isStarred ? <Star className="w-5 h-5 fill-white" /> : <StarOff className="w-5 h-5" />}
						{task.isStarred ? (t ? t('starred') : 'Starred') : (t ? t('addToStarred') : 'Add to Starred')}
					</button>
				</div>
			</div>

			{/* Footer - Actions */}
			<div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
				<button
					onClick={() => {
						if (confirm(t ? t('confirmDelete') : 'Delete this task?')) {
							onDelete(task.id);
						}
					}}
					className="w-full p-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
				>
					<Trash2 className="w-5 h-5" />
					{t ? t('deleteTask') : 'Delete Task'}
				</button>
			</div>
		</div>
	);
}

// Empty State Component
function EmptyState({ selectedFolder, searchTerm, t }) {
	return (
		<div className="text-center py-20">
			<div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-secondary-600/20 flex items-center justify-center">
				<ListTodo className="w-16 h-16 text-primary" />
			</div>
			<h3 className="text-2xl font-bold text-gray-900 mb-2">
				{searchTerm 
					? (t ? t('noTasksFound') : 'No tasks found')
					: (t ? t('noTasks') : 'No tasks yet')
				}
			</h3>
			<p className="text-gray-600 text-lg">
				{searchTerm
					? (t ? t('tryDifferentSearch') : 'Try a different search term')
					: (t ? t('addFirstTask') : 'Add your first task to get started!')
				}
			</p>
		</div>
	);
}