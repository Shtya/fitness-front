'use client';

import { useState, useRef, useEffect } from 'react';
import {
	Plus,
	X,
	Check,
	ChevronRight,
	ChevronDown,
	Folder,
	FolderOpen,
	Calendar,
	Clock,
	Star,
	StarOff,
	Tag,
	MoreHorizontal,
	Trash2,
	Edit2,
	Copy,
	CheckCircle,
	Circle,
	Repeat,
	Bell,
	Flag,
	Inbox,
	Sun,
	Moon,
	Sparkles,
	Zap,
	Target,
	ListTodo,
	Search,
	Filter,
	SortAsc,
	Archive,
	Share2,
	Settings,
	Volume2,
	VolumeX,
	Hash,
	Palette,
	FileText,
	Paperclip,
	User,
	Users,
	MapPin,
	Link,
	Type,
	AlignLeft,
	Menu,
	Home,
	TrendingUp,
	BarChart3,
	GripVertical,
	FolderPlus,
	ListPlus,
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

// Priority levels
const priorityLevels = [
	{ id: 'none', label: 'None', color: '#9ca3af', icon: Circle },
	{ id: 'low', label: 'Low', color: '#3b82f6', icon: Flag },
	{ id: 'medium', label: 'Medium', color: '#f59e0b', icon: Flag },
	{ id: 'high', label: 'High', color: '#ef4444', icon: Flag },
	{ id: 'urgent', label: 'Urgent', color: '#dc2626', icon: Zap },
];

// Repeat options
const repeatOptions = [
	{ id: 'none', label: 'Does not repeat', interval: null },
	{ id: 'daily', label: 'Daily', interval: 1 },
	{ id: 'every-2-days', label: 'Every 2 days', interval: 2 },
	{ id: 'every-3-days', label: 'Every 3 days', interval: 3 },
	{ id: 'weekly', label: 'Weekly', interval: 7 },
	{ id: 'bi-weekly', label: 'Every 2 weeks', interval: 14 },
	{ id: 'monthly', label: 'Monthly', interval: 30 },
	{ id: 'custom', label: 'Custom...', interval: null },
];

// Task status options
const statusOptions = [
	{ id: 'todo', label: 'To Do', color: '#6366f1' },
	{ id: 'in-progress', label: 'In Progress', color: '#f59e0b' },
	{ id: 'completed', label: 'Completed', color: '#10b981' },
	{ id: 'cancelled', label: 'Cancelled', color: '#ef4444' },
];

// Sortable Task Item Component
function SortableTaskItem({ task, onToggle, onSelect, onQuickEdit, onQuickDelete, onQuickAddSubtask, isSelected, soundEnabled, t }) {
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

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`group bg-white rounded-xl border-2 transition-all ${
				isSelected
					? 'border-primary shadow-lg ring-4 ring-primary/10'
					: 'border-gray-100 hover:border-gray-200 hover:shadow-md'
			}`}
		>
			<div className="flex items-start gap-3 p-4">
				{/* Drag Handle */}
				<div
					{...attributes}
					{...listeners}
					className="flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
				>
					<GripVertical className="w-4 h-4 text-gray-400" />
				</div>

				{/* Checkbox */}
				<button
					onClick={(e) => {
						e.stopPropagation();
						onToggle(task.id);
					}}
					className="flex-shrink-0 mt-1 w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center hover:scale-110 active:scale-95"
					style={{
						borderColor: task.completed ? 'var(--color-primary-500)' : '#d1d5db',
						backgroundColor: task.completed ? 'var(--color-primary-500)' : 'transparent',
					}}
				>
					{task.completed && <Check className="w-4 h-4 text-white" />}
				</button>

				{/* Content */}
				<div className="flex-1 min-w-0" onClick={onSelect}>
					<div className="flex items-start gap-2 mb-1">
						<h3 className={`flex-1 font-semibold transition-colors cursor-pointer ${
							task.completed ? 'line-through text-gray-400' : 'text-gray-800'
						}`}>
							{task.title}
						</h3>
						
						{task.isStarred && (
							<Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
						)}
					</div>

					{task.description && !task.completed && (
						<p className="text-sm text-gray-600 mb-2 line-clamp-1">{task.description}</p>
					)}

					{/* Meta */}
					<div className="flex items-center gap-2 flex-wrap">
						{task.priority !== 'none' && (
							<span
								className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-white"
								style={{ backgroundColor: priority.color }}
							>
								<PriorityIcon className="w-3 h-3" />
								{priority.label}
							</span>
						)}

						{task.dueDate && (
							<span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
								isOverdue
									? 'bg-red-100 text-red-700'
									: 'bg-gray-100 text-gray-700'
							}`}>
								<Calendar className="w-3 h-3" />
								{new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
							</span>
						)}

						{task.repeat !== 'none' && (
							<span className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">
								<Repeat className="w-3 h-3" />
							</span>
						)}

						{totalSubtasks > 0 && (
							<span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
								completedSubtasks === totalSubtasks
									? 'bg-green-100 text-green-700'
									: 'bg-gray-100 text-gray-700'
							}`}>
								<CheckCircle className="w-3 h-3" />
								{completedSubtasks}/{totalSubtasks}
							</span>
						)}

						{task.tags && task.tags.length > 0 && (
							<span className="flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium">
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
			color: 'var(--color-primary-500)', 
			icon: Inbox,
			isSystem: true
		},
		{ 
			id: 'today', 
			name: t ? t('folders.today') : 'Today', 
			color: 'var(--color-secondary-500)', 
			icon: Sun,
			isSystem: true
		},
		{ 
			id: 'starred', 
			name: t ? t('folders.starred') : 'Starred', 
			color: '#f59e0b', 
			icon: Star,
			isSystem: true
		},
		{ 
			id: 'personal', 
			name: t ? t('folders.personal') : 'Personal', 
			color: 'var(--color-primary-400)', 
			icon: Target,
			isSystem: false
		},
		{ 
			id: 'work', 
			name: t ? t('folders.work') : 'Work', 
			color: 'var(--color-secondary-600)', 
			icon: Sparkles,
			isSystem: false
		},
		{ 
			id: 'shopping', 
			name: t ? t('folders.shopping') : 'Shopping', 
			color: 'var(--color-primary-600)', 
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
			assignees: ['John Doe', 'Jane Smith'],
			location: 'Office - Meeting Room A',
			attachments: [],
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
			assignees: [],
			location: 'Home Gym',
			attachments: [],
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
			repeat: 'every-2-days',
			customRepeatDays: null,
			hasReminder: false,
			reminderTime: null,
			tags: ['errands'],
			isStarred: false,
			assignees: [],
			location: 'Whole Foods Market',
			attachments: [],
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
	const [newFolderColor, setNewFolderColor] = useState('var(--color-primary-500)');
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [showFilters, setShowFilters] = useState(false);
	const [filterPriority, setFilterPriority] = useState(null);
	const [sortBy, setSortBy] = useState('manual');
	const [activeId, setActiveId] = useState(null);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		})
	);

	// Add new task (without opening sidebar)
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
			assignees: [],
			location: '',
			attachments: [],
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
		setNewFolderColor('var(--color-primary-500)');
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
				if (t.repeat === 'every-2-days' || t.repeat === 'every-3-days') {
					return true;
				}
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

		if (filterPriority) {
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
		<div className="flex h-screen bg-white overflow-hidden">
			{/* Left Sidebar - Folders */}
			<div 
				className={`bg-gradient-to-b from-gray-50 to-white border-r-2 border-gray-100 transition-all duration-300 flex-shrink-0 ${
					sidebarCollapsed ? 'w-20' : 'w-72'
				}`}
			>
				<div className="h-full flex flex-col">
					{/* Header */}
					<div className="p-6 border-b border-gray-200">
						<div className="flex items-center justify-between mb-6">
							{!sidebarCollapsed && (
								<h1 className="text-2xl font-bold theme-gradient-text">
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
									className={`p-2 rounded-lg transition-all ${
										soundEnabled
											? 'bg-gradient-to-r from-primary to-secondary-500 text-white'
											: 'bg-gray-100 text-gray-600'
									}`}
								>
									{soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
								</button>
								<button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex-1">
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
								<h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-3">
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
										className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
											selectedFolder === folder.id
												? 'theme-gradient-bg text-white shadow-lg'
												: 'hover:bg-gray-100 text-gray-700'
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
												<span className="flex-1 text-left font-medium">{folder.name}</span>
												{count > 0 && (
													<span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
														selectedFolder === folder.id
															? 'bg-white/20 text-white'
															: 'bg-gray-200 text-gray-700'
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
								<div className="flex items-center justify-between mb-2 px-3">
									<h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
										{t ? t('myFolders') : 'My Folders'}
									</h3>
									<button
										onClick={() => setShowAddFolder(true)}
										className="p-1 hover:bg-primary/10 rounded-lg transition-colors group"
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
									<div key={folder.id} className="relative group">
										<button
											onClick={() => setSelectedFolder(folder.id)}
											className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
												selectedFolder === folder.id
													? 'theme-gradient-bg text-white shadow-lg'
													: 'hover:bg-gray-100 text-gray-700'
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
													<span className="flex-1 text-left font-medium truncate">{folder.name}</span>
													{count > 0 && (
														<span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
															selectedFolder === folder.id
																? 'bg-white/20 text-white'
																: 'bg-gray-200 text-gray-700'
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
												className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 bg-red-500 hover:bg-red-600 rounded-lg transition-all"
											>
												<Trash2 className="w-3 h-3 text-white" />
											</button>
										)}
									</div>
								);
							})}
						</div>

						{/* Add folder form */}
						{showAddFolder && !sidebarCollapsed && (
							<div className="mt-4 p-3 bg-white rounded-xl border-2 border-primary shadow-lg">
								<input
									type="text"
									value={newFolderName}
									onChange={(e) => setNewFolderName(e.target.value)}
									onKeyPress={(e) => e.key === 'Enter' && handleAddFolder()}
									placeholder={t ? t('folderNamePlaceholder') : "Folder name..."}
									className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary text-sm mb-2"
									autoFocus
								/>
								<div className="flex items-center gap-2 mb-3">
									<input
										type="color"
										value={newFolderColor}
										onChange={(e) => setNewFolderColor(e.target.value)}
										className="w-10 h-10 rounded-lg cursor-pointer border-2 border-gray-200"
									/>
									<span className="text-xs text-gray-600">{t ? t('pickColor') : 'Pick a color'}</span>
								</div>
								<div className="flex gap-2">
									<button
										onClick={handleAddFolder}
										className="flex-1 px-3 py-2 theme-gradient-bg text-white rounded-lg text-sm font-bold hover:shadow-lg transition-all"
									>
										{t ? t('add') : 'Add'}
									</button>
									<button
										onClick={() => setShowAddFolder(false)}
										className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-all"
									>
										{t ? t('cancel') : 'Cancel'}
									</button>
								</div>
							</div>
						)}
					</div>

					{/* Stats */}
					{!sidebarCollapsed && (
						<div className="p-4 border-t border-gray-200 bg-gradient-to-r from-primary/5 to-secondary-500/5">
							<div className="grid grid-cols-2 gap-3">
								<div className="bg-white rounded-lg p-3 border border-gray-200">
									<div className="text-2xl font-bold theme-primary-text">
										{tasks.filter(t => !t.completed).length}
									</div>
									<div className="text-xs text-gray-600">{t ? t('activeTasks') : 'Active'}</div>
								</div>
								<div className="bg-white rounded-lg p-3 border border-gray-200">
									<div className="text-2xl font-bold text-green-600">
										{tasks.filter(t => t.completed).length}
									</div>
									<div className="text-xs text-gray-600">{t ? t('completed') : 'Done'}</div>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Main Content - Task List */}
			<div className="flex-1 flex flex-col overflow-hidden">
				{/* Header */}
				<div className="bg-white border-b-2 border-gray-100 p-6">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-3">
							{currentFolder && (
								<>
									{(() => {
										const Icon = currentFolder.icon;
										return <Icon className="w-8 h-8" style={{ color: currentFolder.color }} />;
									})()}
									<h2 className="text-3xl font-bold text-gray-800">{currentFolder.name}</h2>
								</>
							)}
						</div>
						
						<div className="flex items-center gap-2">
							<button
								onClick={() => setShowFilters(!showFilters)}
								className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
									showFilters || filterPriority
										? 'theme-gradient-bg text-white shadow-lg'
										: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
								}`}
							>
								<Filter className="w-4 h-4" />
								{t ? t('filter') : 'Filter'}
							</button>
							
							<select
								value={sortBy}
								onChange={(e) => setSortBy(e.target.value)}
								className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary text-sm bg-white hover:border-primary transition-all font-medium"
							>
								<option value="manual">{t ? t('sortManual') : 'Manual'}</option>
								<option value="dueDate">{t ? t('sortDueDate') : 'Due Date'}</option>
								<option value="priority">{t ? t('sortPriority') : 'Priority'}</option>
								<option value="alphabetical">{t ? t('sortAlphabetical') : 'A-Z'}</option>
							</select>
						</div>
					</div>

					{/* Search */}
					<div className="relative mb-4">
						<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
						<input
							type="text"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							placeholder={t ? t('searchPlaceholder') : "Search tasks..."}
							className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
						/>
					</div>

					{/* Filters */}
					{showFilters && (
						<div className="p-4 bg-gray-50 rounded-xl border border-gray-200 animate-fade-in-up">
							<label className="text-xs font-bold text-gray-700 mb-2 block uppercase">
								{t ? t('filterByPriority') : 'Priority'}
							</label>
							<div className="flex items-center gap-2 flex-wrap">
								<button
									onClick={() => setFilterPriority(null)}
									className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
										!filterPriority
											? 'theme-gradient-bg text-white'
											: 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
									}`}
								>
									{t ? t('all') : 'All'}
								</button>
								{priorityLevels.slice(1).map((priority) => {
									const Icon = priority.icon;
									return (
										<button
											key={priority.id}
											onClick={() => setFilterPriority(filterPriority === priority.id ? null : priority.id)}
											className={`px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
												filterPriority === priority.id
													? 'text-white'
													: 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
											}`}
											style={{
												backgroundColor: filterPriority === priority.id ? priority.color : undefined
											}}
										>
											<Icon className="w-4 h-4" />
											{priority.label}
										</button>
									);
								})}
							</div>
						</div>
					)}

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
								<div className="space-y-2">
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
											t={t}
										/>
									))}
								</div>
							</SortableContext>

							<DragOverlay>
								{activeTask ? (
									<div className="bg-white rounded-xl border-2 border-primary shadow-2xl p-4 opacity-90 rotate-3">
										<h3 className="font-semibold text-gray-800">{activeTask.title}</h3>
									</div>
								) : null}
							</DragOverlay>
						</DndContext>
					)}
				</div>
			</div>

			{/* Right Sidebar - Task Details (Smooth Slide In) */}
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
			<div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/5 to-secondary-500/5 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary transition-all">
				<Plus className="w-5 h-5 text-primary flex-shrink-0" />
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

// Task Detail Panel Component (with smooth slide-in animation)
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
		<div className="w-[500px] bg-white border-l-2 border-gray-100 flex flex-col h-screen overflow-hidden animate-slide-in-right shadow-2xl">
			{/* Header */}
			<div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex-shrink-0">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-bold text-gray-800">
						{t ? t('taskDetails') : 'Task Details'}
					</h2>
					<button
						onClick={onClose}
						className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
						className="text-xl font-bold text-gray-800 cursor-pointer hover:text-primary transition-colors px-4 py-3 hover:bg-gray-50 rounded-xl"
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
					<select
						value={task.status}
						onChange={(e) => onUpdate(task.id, { status: e.target.value })}
						className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-all"
					>
						{statusOptions.map((status) => (
							<option key={status.id} value={status.id}>
								{status.label}
							</option>
						))}
					</select>
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
											? 'text-white'
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
							className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary"
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
							className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary"
						/>
					</div>
				</div>

				{/* Repeat */}
				<div>
					<label className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
						<Repeat className="w-4 h-4" />
						{t ? t('repeat') : 'Repeat'}
					</label>
					<select
						value={task.repeat}
						onChange={(e) => onUpdate(task.id, { repeat: e.target.value })}
						className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary mb-2"
					>
						{repeatOptions.map((option) => (
							<option key={option.id} value={option.id}>
								{option.label}
							</option>
						))}
					</select>
					
					{task.repeat === 'custom' && (
						<div className="flex items-center gap-2">
							<input
								type="number"
								min="1"
								value={customRepeatDays}
								onChange={(e) => setCustomRepeatDays(parseInt(e.target.value))}
								onBlur={() => onUpdate(task.id, { customRepeatDays })}
								className="w-20 px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary"
							/>
							<span className="text-sm text-gray-600">
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
					<div className="flex items-center gap-2 mb-2">
						<input
							type="checkbox"
							checked={task.hasReminder}
							onChange={(e) => onUpdate(task.id, { hasReminder: e.target.checked })}
							className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary/20"
						/>
						<span className="text-sm text-gray-700">
							{t ? t('enableReminder') : 'Enable reminder'}
						</span>
					</div>
					{task.hasReminder && (
						<input
							type="datetime-local"
							value={task.reminderTime || ''}
							onChange={(e) => onUpdate(task.id, { reminderTime: e.target.value })}
							className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary"
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
								className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium flex items-center gap-2"
							>
								#{tag}
								<button
									onClick={() => handleRemoveTag(tag)}
									className="hover:text-indigo-900"
								>
									<X className="w-3 h-3" />
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
							className="px-4 py-2 theme-gradient-bg text-white rounded-lg font-bold hover:shadow-lg transition-all"
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
							<div key={subtask.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg group">
								<button
									onClick={() => handleToggleSubtask(subtask.id)}
									className="flex-shrink-0 w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center hover:scale-110"
									style={{
										borderColor: subtask.completed ? 'var(--color-primary-500)' : '#d1d5db',
										backgroundColor: subtask.completed ? 'var(--color-primary-500)' : 'transparent',
									}}
								>
									{subtask.completed && <Check className="w-3 h-3 text-white" />}
								</button>
								<span className={`flex-1 text-sm ${subtask.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
									{subtask.title}
								</span>
								<button
									onClick={() => handleDeleteSubtask(subtask.id)}
									className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
								>
									<X className="w-3 h-3 text-red-600" />
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
								className="px-4 py-2 theme-gradient-bg text-white rounded-lg font-bold hover:shadow-lg transition-all"
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
						className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary"
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

			{/* Footer - Actions (Fixed) */}
			<div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
				<button
					onClick={() => {
						if (confirm(t ? t('confirmDelete') : 'Delete this task?')) {
							onDelete(task.id);
						}
					}}
					className="w-full p-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
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
			<div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-secondary-500/20 flex items-center justify-center">
				<ListTodo className="w-12 h-12 text-primary" />
			</div>
			<h3 className="text-2xl font-bold text-gray-800 mb-2">
				{searchTerm 
					? (t ? t('noTasksFound') : 'No tasks found')
					: (t ? t('noTasks') : 'No tasks yet')
				}
			</h3>
			<p className="text-gray-600">
				{searchTerm
					? (t ? t('tryDifferentSearch') : 'Try a different search term')
					: (t ? t('addFirstTask') : 'Add your first task to get started!')
				}
			</p>
		</div>
	);
}