'use client';

import { useState, useRef, useEffect } from 'react';
import {
	Plus,
	X,
	Check,
	ChevronLeft,
	ChevronRight,
	Calendar as CalendarIcon,
	Clock,
	Repeat,
	Bell,
	DollarSign,
	TrendingUp,
	Flame,
	Target,
	Zap,
	Heart,
	Coffee,
	Dumbbell,
	Book,
	Briefcase,
	Home,
	ShoppingCart,
	Users,
	Star,
	Edit2,
	Trash2,
	MoreHorizontal,
	Filter,
	Search,
	Menu,
	Volume2,
	VolumeX,
	Settings,
	CheckCircle,
	Circle,
	AlertCircle,
	CreditCard,
	Receipt,
	Banknote,
	CalendarDays,
	CalendarClock,
	ListTodo,
	Hash,
	MapPin,
	FileText,
	Copy,
	Share2,
	Download,
	ChevronDown,
	GripVertical,
	Sparkles,
	Activity,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

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
	}
};

// Event/Habit Types
const eventTypes = [
	{ id: 'habit', label: 'Habit', color: 'var(--color-primary-500)', icon: Repeat, bgColor: 'bg-primary/10', textColor: 'text-primary' },
	{ id: 'event', label: 'Event', color: 'var(--color-secondary-500)', icon: CalendarDays, bgColor: 'bg-secondary-500/10', textColor: 'text-secondary-600' },
	{ id: 'billing', label: 'Billing', color: '#10b981', icon: CreditCard, bgColor: 'bg-green-50', textColor: 'text-green-700' },
	{ id: 'reminder', label: 'Reminder', color: '#f59e0b', icon: Bell, bgColor: 'bg-amber-50', textColor: 'text-amber-700' },
];

// Habit icons
const habitIcons = [
	{ id: 'flame', icon: Flame, label: 'Streak' },
	{ id: 'coffee', icon: Coffee, label: 'Coffee' },
	{ id: 'dumbbell', icon: Dumbbell, label: 'Exercise' },
	{ id: 'book', icon: Book, label: 'Reading' },
	{ id: 'heart', icon: Heart, label: 'Health' },
	{ id: 'target', icon: Target, label: 'Goal' },
	{ id: 'zap', icon: Zap, label: 'Energy' },
	{ id: 'star', icon: Star, label: 'Important' },
];

// Repeat frequencies
const frequencies = [
	{ id: 'daily', label: 'Every day', days: 1 },
	{ id: 'every-2-days', label: 'Every 2 days', days: 2 },
	{ id: 'every-3-days', label: 'Every 3 days', days: 3 },
	{ id: 'weekly', label: 'Weekly', days: 7 },
	{ id: 'bi-weekly', label: 'Every 2 weeks', days: 14 },
	{ id: 'monthly', label: 'Monthly', days: 30 },
	{ id: 'custom', label: 'Custom...', days: null },
];

// Get days in month
const getDaysInMonth = (year, month) => {
	return new Date(year, month + 1, 0).getDate();
};

// Get first day of month
const getFirstDayOfMonth = (year, month) => {
	return new Date(year, month, 1).getDay();
};

// Format date
const formatDate = (date) => {
	return date.toISOString().split('T')[0];
};

// Check if date matches frequency
const shouldShowOnDate = (item, date) => {
	if (!item.startDate) return false;
	
	const start = new Date(item.startDate);
	const current = new Date(date);
	current.setHours(0, 0, 0, 0);
	start.setHours(0, 0, 0, 0);
	
	if (current < start) return false;
	
	if (!item.frequency || item.frequency === 'once') {
		return formatDate(start) === formatDate(current);
	}
	
	const freq = frequencies.find(f => f.id === item.frequency);
	if (!freq || !freq.days) return false;
	
	const diffTime = current - start;
	const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
	
	return diffDays % freq.days === 0;
};

// Main Calendar Component
export default function CalendarTab() {
	const t = useTranslations('calendar');
	const today = new Date();
	
	const [currentDate, setCurrentDate] = useState(today);
	const [selectedDate, setSelectedDate] = useState(today);
	const [soundEnabled, setSoundEnabled] = useState(true);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [selectedType, setSelectedType] = useState('all');
	const [showAddForm, setShowAddForm] = useState(false);
	const [selectedItem, setSelectedItem] = useState(null);
	const [searchTerm, setSearchTerm] = useState('');

	// Items (habits, events, billings)
	const [items, setItems] = useState([
		{
			id: '1',
			type: 'habit',
			title: 'Morning Workout',
			description: '30 minutes cardio and stretching',
			startDate: '2024-02-01',
			time: '06:00',
			frequency: 'daily',
			customDays: null,
			icon: 'dumbbell',
			color: 'var(--color-primary-500)',
			reminder: true,
			reminderBefore: 15,
			streak: 12,
			completed: {},
			notes: '',
		},
		{
			id: '2',
			type: 'billing',
			title: 'Netflix Subscription',
			description: 'Monthly subscription payment',
			startDate: '2024-02-15',
			time: '12:00',
			frequency: 'monthly',
			customDays: null,
			amount: 15.99,
			currency: 'USD',
			icon: 'credit-card',
			color: '#10b981',
			reminder: true,
			reminderBefore: 1440,
			completed: {},
			notes: 'Auto-payment from credit card',
		},
		{
			id: '3',
			type: 'habit',
			title: 'Read Book',
			description: 'Read for 30 minutes',
			startDate: '2024-02-01',
			time: '21:00',
			frequency: 'every-2-days',
			customDays: null,
			icon: 'book',
			color: 'var(--color-secondary-500)',
			reminder: true,
			reminderBefore: 30,
			streak: 8,
			completed: {},
			notes: '',
		},
		{
			id: '4',
			type: 'event',
			title: 'Team Meeting',
			description: 'Quarterly planning session',
			startDate: '2024-02-20',
			time: '14:00',
			frequency: 'once',
			customDays: null,
			icon: 'users',
			color: '#3b82f6',
			reminder: true,
			reminderBefore: 60,
			location: 'Conference Room A',
			completed: {},
			notes: 'Bring Q1 reports',
		},
		{
			id: '5',
			type: 'billing',
			title: 'Electricity Bill',
			description: 'Monthly electricity payment',
			startDate: '2024-02-10',
			time: '09:00',
			frequency: 'monthly',
			customDays: null,
			amount: 85.50,
			currency: 'USD',
			icon: 'banknote',
			color: '#f59e0b',
			reminder: true,
			reminderBefore: 2880,
			completed: {},
			notes: '',
		},
	]);

	// Get items for selected date
	const getItemsForDate = (date) => {
		const dateStr = formatDate(date);
		return items.filter(item => shouldShowOnDate(item, date));
	};

	// Get items for month view
	const getItemsForMonth = () => {
		const year = currentDate.getFullYear();
		const month = currentDate.getMonth();
		const daysInMonth = getDaysInMonth(year, month);
		
		const monthItems = {};
		
		for (let day = 1; day <= daysInMonth; day++) {
			const date = new Date(year, month, day);
			const dateStr = formatDate(date);
			monthItems[dateStr] = items.filter(item => shouldShowOnDate(item, date));
		}
		
		return monthItems;
	};

	// Toggle completion
	const handleToggleComplete = (itemId, date) => {
		const dateStr = formatDate(date);
		playSound('check', soundEnabled);
		
		setItems(items.map(item => {
			if (item.id === itemId) {
				const newCompleted = { ...item.completed };
				if (newCompleted[dateStr]) {
					delete newCompleted[dateStr];
					return { ...item, completed: newCompleted, streak: Math.max(0, (item.streak || 0) - 1) };
				} else {
					newCompleted[dateStr] = true;
					return { ...item, completed: newCompleted, streak: (item.streak || 0) + 1 };
				}
			}
			return item;
		}));
	};

	// Add new item
	const handleAddItem = (newItem) => {
		setItems([...items, { ...newItem, id: Date.now().toString(), completed: {}, streak: 0 }]);
		setShowAddForm(false);
	};

	// Update item
	const handleUpdateItem = (itemId, updates) => {
		setItems(items.map(item => item.id === itemId ? { ...item, ...updates } : item));
		if (selectedItem?.id === itemId) {
			setSelectedItem({ ...selectedItem, ...updates });
		}
	};

	// Delete item
	const handleDeleteItem = (itemId) => {
		setItems(items.filter(item => item.id !== itemId));
		if (selectedItem?.id === itemId) {
			setSelectedItem(null);
		}
	};

	// Navigation
	const goToPreviousMonth = () => {
		setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
	};

	const goToNextMonth = () => {
		setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
	};

	const goToToday = () => {
		setCurrentDate(new Date());
		setSelectedDate(new Date());
	};

	const monthItems = getItemsForMonth();
	const selectedDateItems = getItemsForDate(selectedDate);

	// Stats
	const totalHabits = items.filter(i => i.type === 'habit').length;
	const totalBillings = items.filter(i => i.type === 'billing').length;
	const todayItems = getItemsForDate(today);
	const todayCompleted = todayItems.filter(i => i.completed[formatDate(today)]).length;

	return (
		<div className="flex h-screen bg-white overflow-hidden">
			{/* Left Sidebar */}
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
									{t ? t('title') : 'Calendar'}
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
											? 'theme-gradient-bg text-white'
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

					{/* Filter Types */}
					<div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin">
						<div className="mb-6">
							{!sidebarCollapsed && (
								<h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-3">
									{t ? t('types') : 'Types'}
								</h3>
							)}
							
							<button
								onClick={() => setSelectedType('all')}
								className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
									selectedType === 'all'
										? 'theme-gradient-bg text-white shadow-lg'
										: 'hover:bg-gray-100 text-gray-700'
								}`}
							>
								<ListTodo className="w-5 h-5 flex-shrink-0" />
								{!sidebarCollapsed && (
									<>
										<span className="flex-1 text-left font-medium">{t ? t('all') : 'All'}</span>
										<span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
											selectedType === 'all'
												? 'bg-white/20 text-white'
												: 'bg-gray-200 text-gray-700'
										}`}>
											{items.length}
										</span>
									</>
								)}
							</button>

							{eventTypes.map((type) => {
								const Icon = type.icon;
								const count = items.filter(i => i.type === type.id).length;

								return (
									<button
										key={type.id}
										onClick={() => setSelectedType(type.id)}
										className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
											selectedType === type.id
												? 'theme-gradient-bg text-white shadow-lg'
												: 'hover:bg-gray-100 text-gray-700'
										}`}
									>
										<Icon 
											className="w-5 h-5 flex-shrink-0"
											style={{ color: selectedType !== type.id ? type.color : undefined }}
										/>
										{!sidebarCollapsed && (
											<>
												<span className="flex-1 text-left font-medium">{type.label}</span>
												{count > 0 && (
													<span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
														selectedType === type.id
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
					</div>

					{/* Stats */}
					{!sidebarCollapsed && (
						<div className="p-4 border-t border-gray-200 bg-gradient-to-r from-primary/5 to-secondary-500/5">
							<div className="grid grid-cols-2 gap-3">
								<div className="bg-white rounded-lg p-3 border border-gray-200">
									<div className="text-2xl font-bold theme-primary-text">
										{totalHabits}
									</div>
									<div className="text-xs text-gray-600">{t ? t('habits') : 'Habits'}</div>
								</div>
								<div className="bg-white rounded-lg p-3 border border-gray-200">
									<div className="text-2xl font-bold text-green-600">
										{totalBillings}
									</div>
									<div className="text-xs text-gray-600">{t ? t('billings') : 'Bills'}</div>
								</div>
							</div>
							
							{todayItems.length > 0 && (
								<div className="mt-3 bg-white rounded-lg p-3 border border-gray-200">
									<div className="text-sm font-bold text-gray-700 mb-2">
										{t ? t('todayProgress') : 'Today'}
									</div>
									<div className="flex items-center gap-2">
										<div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
											<div 
												className="h-full theme-gradient-bg transition-all"
												style={{ width: `${(todayCompleted / todayItems.length) * 100}%` }}
											/>
										</div>
										<span className="text-xs font-bold text-gray-600">
											{todayCompleted}/{todayItems.length}
										</span>
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Main Content */}
			<div className="flex-1 flex flex-col overflow-hidden">
				{/* Header */}
				<div className="bg-white border-b-2 border-gray-100 p-6">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-4">
							<button
								onClick={goToPreviousMonth}
								className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
							>
								<ChevronLeft className="w-5 h-5 text-gray-600" />
							</button>
							
							<h2 className="text-2xl font-bold text-gray-800 min-w-[200px] text-center">
								{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
							</h2>
							
							<button
								onClick={goToNextMonth}
								className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
							>
								<ChevronRight className="w-5 h-5 text-gray-600" />
							</button>
							
							<button
								onClick={goToToday}
								className="px-4 py-2 theme-gradient-bg text-white rounded-xl font-bold hover:shadow-lg transition-all text-sm"
							>
								{t ? t('today') : 'Today'}
							</button>
						</div>
						
						<button
							onClick={() => setShowAddForm(true)}
							className="px-5 py-2.5 theme-gradient-bg text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2"
						>
							<Plus className="w-5 h-5" />
							{t ? t('addNew') : 'Add New'}
						</button>
					</div>

					{/* Search */}
					<div className="relative">
						<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
						<input
							type="text"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							placeholder={t ? t('searchPlaceholder') : "Search events, habits, billings..."}
							className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
						/>
					</div>
				</div>

				{/* Calendar Grid */}
				<div className="flex-1 overflow-y-auto p-6">
					<CalendarGrid
						currentDate={currentDate}
						selectedDate={selectedDate}
						onSelectDate={setSelectedDate}
						monthItems={monthItems}
						selectedType={selectedType}
						onToggleComplete={handleToggleComplete}
					/>
				</div>
			</div>

			{/* Right Sidebar - Day View */}
			{selectedDate && (
				<DayView
					date={selectedDate}
					items={selectedDateItems}
					onToggleComplete={handleToggleComplete}
					onSelectItem={setSelectedItem}
					onDeleteItem={handleDeleteItem}
					soundEnabled={soundEnabled}
					t={t}
				/>
			)}

			{/* Add/Edit Form Modal */}
			{showAddForm && (
				<AddEditForm
					onClose={() => setShowAddForm(false)}
					onSave={handleAddItem}
					t={t}
				/>
			)}

			{/* Item Detail Panel */}
			{selectedItem && (
				<ItemDetailPanel
					item={selectedItem}
					onUpdate={handleUpdateItem}
					onDelete={handleDeleteItem}
					onClose={() => setSelectedItem(null)}
					t={t}
				/>
			)}
		</div>
	);
}

// Calendar Grid Component
function CalendarGrid({ currentDate, selectedDate, onSelectDate, monthItems, selectedType, onToggleComplete }) {
	const year = currentDate.getFullYear();
	const month = currentDate.getMonth();
	const daysInMonth = getDaysInMonth(year, month);
	const firstDay = getFirstDayOfMonth(year, month);
	
	const days = [];
	const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	
	// Empty cells for days before month starts
	for (let i = 0; i < firstDay; i++) {
		days.push(<div key={`empty-${i}`} className="min-h-[120px] bg-gray-50/50" />);
	}
	
	// Days of month
	for (let day = 1; day <= daysInMonth; day++) {
		const date = new Date(year, month, day);
		const dateStr = formatDate(date);
		const dayItems = monthItems[dateStr] || [];
		const filteredItems = selectedType === 'all' ? dayItems : dayItems.filter(i => i.type === selectedType);
		
		const isToday = formatDate(new Date()) === dateStr;
		const isSelected = formatDate(selectedDate) === dateStr;
		
		days.push(
			<div
				key={day}
				onClick={() => onSelectDate(date)}
				className={`min-h-[120px] border-2 p-2 cursor-pointer transition-all hover:shadow-md ${
					isSelected 
						? 'border-primary bg-primary/5 shadow-lg' 
						: isToday 
						? 'border-primary/30 bg-primary/5' 
						: 'border-gray-100 hover:border-gray-200'
				}`}
			>
				<div className={`text-sm font-bold mb-1 ${
					isToday ? 'text-primary' : 'text-gray-700'
				}`}>
					{day}
				</div>
				
				<div className="space-y-1">
					{filteredItems.slice(0, 3).map((item) => {
						const type = eventTypes.find(t => t.id === item.type);
						const Icon = type?.icon || Circle;
						const isCompleted = item.completed[dateStr];
						
						return (
							<div
								key={item.id}
								onClick={(e) => {
									e.stopPropagation();
									onToggleComplete(item.id, date);
								}}
								className={`text-xs px-2 py-1 rounded flex items-center gap-1 hover:scale-105 transition-transform ${
									isCompleted ? 'opacity-50 line-through' : ''
								} ${type?.bgColor}`}
								style={{ borderLeft: `3px solid ${item.color}` }}
							>
								{isCompleted && <Check className="w-3 h-3 text-green-600" />}
								<Icon className="w-3 h-3 flex-shrink-0" style={{ color: item.color }} />
								<span className="truncate font-medium">{item.title}</span>
							</div>
						);
					})}
					{filteredItems.length > 3 && (
						<div className="text-xs text-gray-500 font-medium px-2">
							+{filteredItems.length - 3} more
						</div>
					)}
				</div>
			</div>
		);
	}
	
	return (
		<div className="bg-white rounded-xl shadow-sm border-2 border-gray-100 overflow-hidden">
			{/* Day headers */}
			<div className="grid grid-cols-7 bg-gray-50 border-b-2 border-gray-100">
				{dayNames.map((name) => (
					<div key={name} className="p-3 text-center font-bold text-gray-700 text-sm">
						{name}
					</div>
				))}
			</div>
			
			{/* Calendar days */}
			<div className="grid grid-cols-7">
				{days}
			</div>
		</div>
	);
}

// Day View Component
function DayView({ date, items, onToggleComplete, onSelectItem, onDeleteItem, soundEnabled, t }) {
	const dateStr = formatDate(date);
	const isToday = formatDate(new Date()) === dateStr;
	
	return (
		<div className="w-96 bg-white border-l-2 border-gray-100 flex flex-col h-screen overflow-hidden shadow-2xl">
			{/* Header */}
			<div className="p-6 border-b-2 border-gray-100 bg-gradient-to-r from-primary/5 to-secondary-500/5 flex-shrink-0">
				<div className="text-sm font-bold text-gray-600 mb-1">
					{date.toLocaleDateString('en-US', { weekday: 'long' })}
				</div>
				<div className="text-3xl font-bold theme-gradient-text mb-1">
					{date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
				</div>
				<div className="text-sm text-gray-600">
					{date.toLocaleDateString('en-US', { year: 'numeric' })}
				</div>
				
				{isToday && (
					<div className="mt-3 px-3 py-1 theme-gradient-bg text-white rounded-full text-xs font-bold inline-block">
						{t ? t('today') : 'Today'}
					</div>
				)}
			</div>

			{/* Items List */}
			<div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
				{items.length === 0 ? (
					<div className="text-center py-20">
						<CalendarIcon className="w-16 h-16 mx-auto text-gray-300 mb-3" />
						<p className="text-gray-500 text-sm">
							{t ? t('noItems') : 'No items for this day'}
						</p>
					</div>
				) : (
					items.map((item) => (
						<DayViewItem
							key={item.id}
							item={item}
							date={date}
							onToggle={() => onToggleComplete(item.id, date)}
							onSelect={() => onSelectItem(item)}
							onDelete={() => {
								if (confirm(t ? t('confirmDelete') : 'Delete this item?')) {
									onDeleteItem(item.id);
								}
							}}
							soundEnabled={soundEnabled}
							t={t}
						/>
					))
				)}
			</div>
		</div>
	);
}

// Day View Item Component  
function DayViewItem({ item, date, onToggle, onSelect, onDelete, soundEnabled, t }) {
	const type = eventTypes.find(t => t.id === item.type);
	const Icon = type?.icon || Circle;
	const dateStr = formatDate(date);
	const isCompleted = item.completed[dateStr];
	
	let habitIcon = habitIcons.find(h => h.id === item.icon);
	if (!habitIcon && item.icon === 'credit-card') habitIcon = { icon: CreditCard };
	if (!habitIcon && item.icon === 'banknote') habitIcon = { icon: Banknote };
	if (!habitIcon && item.icon === 'users') habitIcon = { icon: Users };
	const ItemIcon = habitIcon?.icon || Icon;
	
	return (
		<div className="bg-white rounded-xl border-2 border-gray-100 hover:border-primary/30 transition-all p-4 group">
			<div className="flex items-start gap-3">
				{/* Checkbox/Complete */}
				<button
					onClick={onToggle}
					className="flex-shrink-0 mt-1 w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center hover:scale-110"
					style={{
						borderColor: isCompleted ? item.color : '#d1d5db',
						backgroundColor: isCompleted ? item.color : 'transparent',
					}}
				>
					{isCompleted && <Check className="w-4 h-4 text-white" />}
				</button>

				{/* Content */}
				<div className="flex-1 min-w-0" onClick={onSelect}>
					<div className="flex items-center gap-2 mb-1">
						<ItemIcon className="w-4 h-4 flex-shrink-0" style={{ color: item.color }} />
						<h4 className={`font-bold text-gray-800 cursor-pointer hover:text-primary transition-colors ${
							isCompleted ? 'line-through opacity-60' : ''
						}`}>
							{item.title}
						</h4>
					</div>
					
					{item.description && (
						<p className="text-sm text-gray-600 mb-2 line-clamp-1">{item.description}</p>
					)}
					
					<div className="flex items-center gap-2 text-xs flex-wrap">
						<span className={`px-2 py-1 rounded-lg font-medium ${type?.bgColor} ${type?.textColor}`}>
							{type?.label}
						</span>
						
						{item.time && (
							<span className="flex items-center gap-1 text-gray-600">
								<Clock className="w-3 h-3" />
								{item.time}
							</span>
						)}
						
						{item.type === 'billing' && item.amount && (
							<span className="flex items-center gap-1 text-green-700 font-bold">
								<DollarSign className="w-3 h-3" />
								{item.amount}
							</span>
						)}
						
						{item.type === 'habit' && item.streak > 0 && (
							<span className="flex items-center gap-1 text-orange-600 font-bold">
								<Flame className="w-3 h-3" />
								{item.streak}
							</span>
						)}
					</div>
				</div>

				{/* Quick Actions */}
				<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
					<button
						onClick={onSelect}
						className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors"
					>
						<Edit2 className="w-4 h-4 text-primary" />
					</button>
					<button
						onClick={onDelete}
						className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
					>
						<Trash2 className="w-4 h-4 text-red-600" />
					</button>
				</div>
			</div>
		</div>
	);
}

// Add/Edit Form Component
function AddEditForm({ onClose, onSave, item, t }) {
	const [formData, setFormData] = useState({
		type: item?.type || 'habit',
		title: item?.title || '',
		description: item?.description || '',
		startDate: item?.startDate || formatDate(new Date()),
		time: item?.time || '09:00',
		frequency: item?.frequency || 'daily',
		customDays: item?.customDays || 1,
		icon: item?.icon || 'target',
		color: item?.color || 'var(--color-primary-500)',
		reminder: item?.reminder ?? true,
		reminderBefore: item?.reminderBefore || 15,
		amount: item?.amount || '',
		currency: item?.currency || 'USD',
		location: item?.location || '',
		notes: item?.notes || '',
	});

	const handleSubmit = (e) => {
		e.preventDefault();
		if (!formData.title.trim()) return;
		
		onSave(formData);
	};

	const currentType = eventTypes.find(t => t.id === formData.type);

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
			<div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
				<form onSubmit={handleSubmit}>
					{/* Header */}
					<div className="p-6 border-b border-gray-200 bg-gradient-to-r from-primary/5 to-secondary-500/5 sticky top-0">
						<div className="flex items-center justify-between">
							<h2 className="text-2xl font-bold text-gray-800">
								{item ? (t ? t('editItem') : 'Edit Item') : (t ? t('addNew') : 'Add New')}
							</h2>
							<button
								type="button"
								onClick={onClose}
								className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
							>
								<X className="w-5 h-5 text-gray-600" />
							</button>
						</div>
					</div>

					{/* Content */}
					<div className="p-6 space-y-6">
						{/* Type Selection */}
						<div>
							<label className="text-sm font-bold text-gray-700 mb-3 block">
								{t ? t('type') : 'Type'}
							</label>
							<div className="grid grid-cols-4 gap-3">
								{eventTypes.map((type) => {
									const Icon = type.icon;
									return (
										<button
											key={type.id}
											type="button"
											onClick={() => setFormData({ ...formData, type: type.id })}
											className={`p-4 rounded-xl font-bold text-sm transition-all flex flex-col items-center gap-2 ${
												formData.type === type.id
													? 'theme-gradient-bg text-white shadow-lg'
													: 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-gray-200'
											}`}
										>
											<Icon className="w-6 h-6" />
											{type.label}
										</button>
									);
								})}
							</div>
						</div>

						{/* Title */}
						<div>
							<label className="text-sm font-bold text-gray-700 mb-2 block">
								{t ? t('title') : 'Title'}
							</label>
							<input
								type="text"
								value={formData.title}
								onChange={(e) => setFormData({ ...formData, title: e.target.value })}
								placeholder={t ? t('titlePlaceholder') : "Enter title..."}
								className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
								required
							/>
						</div>

						{/* Description */}
						<div>
							<label className="text-sm font-bold text-gray-700 mb-2 block">
								{t ? t('description') : 'Description'}
							</label>
							<textarea
								value={formData.description}
								onChange={(e) => setFormData({ ...formData, description: e.target.value })}
								placeholder={t ? t('descriptionPlaceholder') : "Add description..."}
								className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 resize-none min-h-[80px]"
							/>
						</div>

						{/* Date and Time */}
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="text-sm font-bold text-gray-700 mb-2 block">
									{t ? t('startDate') : 'Start Date'}
								</label>
								<input
									type="date"
									value={formData.startDate}
									onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
									className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary"
								/>
							</div>
							<div>
								<label className="text-sm font-bold text-gray-700 mb-2 block">
									{t ? t('time') : 'Time'}
								</label>
								<input
									type="time"
									value={formData.time}
									onChange={(e) => setFormData({ ...formData, time: e.target.value })}
									className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary"
								/>
							</div>
						</div>

						{/* Frequency */}
						<div>
							<label className="text-sm font-bold text-gray-700 mb-2 block">
								{t ? t('frequency') : 'Frequency'}
							</label>
							<select
								value={formData.frequency}
								onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
								className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary"
							>
								<option value="once">{t ? t('once') : 'Once (One-time event)'}</option>
								{frequencies.map((freq) => (
									<option key={freq.id} value={freq.id}>{freq.label}</option>
								))}
							</select>
							
							{formData.frequency === 'custom' && (
								<div className="mt-2 flex items-center gap-2">
									<input
										type="number"
										min="1"
										value={formData.customDays}
										onChange={(e) => setFormData({ ...formData, customDays: parseInt(e.target.value) })}
										className="w-20 px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary"
									/>
									<span className="text-sm text-gray-600">{t ? t('days') : 'days'}</span>
								</div>
							)}
						</div>

						{/* Icon Selection (for habits) */}
						{formData.type === 'habit' && (
							<div>
								<label className="text-sm font-bold text-gray-700 mb-3 block">
									{t ? t('icon') : 'Icon'}
								</label>
								<div className="grid grid-cols-8 gap-2">
									{habitIcons.map((icon) => {
										const Icon = icon.icon;
										return (
											<button
												key={icon.id}
												type="button"
												onClick={() => setFormData({ ...formData, icon: icon.id })}
												className={`p-3 rounded-lg transition-all ${
													formData.icon === icon.id
														? 'theme-gradient-bg text-white shadow-lg'
														: 'bg-gray-100 text-gray-600 hover:bg-gray-200'
												}`}
											>
												<Icon className="w-5 h-5 mx-auto" />
											</button>
										);
									})}
								</div>
							</div>
						)}

						{/* Amount (for billing) */}
						{formData.type === 'billing' && (
							<div className="grid grid-cols-3 gap-4">
								<div className="col-span-2">
									<label className="text-sm font-bold text-gray-700 mb-2 block">
										{t ? t('amount') : 'Amount'}
									</label>
									<input
										type="number"
										step="0.01"
										value={formData.amount}
										onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
										placeholder="0.00"
										className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary"
									/>
								</div>
								<div>
									<label className="text-sm font-bold text-gray-700 mb-2 block">
										{t ? t('currency') : 'Currency'}
									</label>
									<select
										value={formData.currency}
										onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
										className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary"
									>
										<option value="USD">USD</option>
										<option value="EUR">EUR</option>
										<option value="GBP">GBP</option>
										<option value="EGP">EGP</option>
									</select>
								</div>
							</div>
						)}

						{/* Location (for events) */}
						{formData.type === 'event' && (
							<div>
								<label className="text-sm font-bold text-gray-700 mb-2 block">
									{t ? t('location') : 'Location'}
								</label>
								<input
									type="text"
									value={formData.location}
									onChange={(e) => setFormData({ ...formData, location: e.target.value })}
									placeholder={t ? t('locationPlaceholder') : "Add location..."}
									className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary"
								/>
							</div>
						)}

						{/* Color */}
						<div>
							<label className="text-sm font-bold text-gray-700 mb-2 block">
								{t ? t('color') : 'Color'}
							</label>
							<div className="flex items-center gap-3">
								<input
									type="color"
									value={formData.color}
									onChange={(e) => setFormData({ ...formData, color: e.target.value })}
									className="w-16 h-16 rounded-xl cursor-pointer border-2 border-gray-200"
								/>
								<span className="text-sm text-gray-600">{t ? t('pickColor') : 'Pick a color'}</span>
							</div>
						</div>

						{/* Reminder */}
						<div>
							<div className="flex items-center gap-2 mb-2">
								<input
									type="checkbox"
									checked={formData.reminder}
									onChange={(e) => setFormData({ ...formData, reminder: e.target.checked })}
									className="w-5 h-5 text-primary rounded"
								/>
								<label className="text-sm font-bold text-gray-700">
									{t ? t('enableReminder') : 'Enable Reminder'}
								</label>
							</div>
							
							{formData.reminder && (
								<select
									value={formData.reminderBefore}
									onChange={(e) => setFormData({ ...formData, reminderBefore: parseInt(e.target.value) })}
									className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary"
								>
									<option value="5">5 minutes before</option>
									<option value="15">15 minutes before</option>
									<option value="30">30 minutes before</option>
									<option value="60">1 hour before</option>
									<option value="1440">1 day before</option>
									<option value="2880">2 days before</option>
								</select>
							)}
						</div>

						{/* Notes */}
						<div>
							<label className="text-sm font-bold text-gray-700 mb-2 block">
								{t ? t('notes') : 'Notes'}
							</label>
							<textarea
								value={formData.notes}
								onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
								placeholder={t ? t('notesPlaceholder') : "Add notes..."}
								className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 resize-none min-h-[80px]"
							/>
						</div>
					</div>

					{/* Footer */}
					<div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-all"
						>
							{t ? t('cancel') : 'Cancel'}
						</button>
						<button
							type="submit"
							className="flex-1 px-6 py-3 theme-gradient-bg text-white rounded-xl font-bold hover:shadow-lg transition-all"
						>
							{item ? (t ? t('update') : 'Update') : (t ? t('create') : 'Create')}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

// Item Detail Panel (placeholder - can be expanded)
function ItemDetailPanel({ item, onUpdate, onDelete, onClose, t }) {
	return (
		<div className="fixed right-0 top-0 h-screen w-[500px] bg-white border-l-2 border-gray-100 shadow-2xl animate-slide-in-right z-40">
			<div className="p-6">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-bold">{item.title}</h2>
					<button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
						<X className="w-5 h-5" />
					</button>
				</div>
				{/* Add more details here */}
				<p className="text-gray-600">{item.description}</p>
			</div>
		</div>
	);
}