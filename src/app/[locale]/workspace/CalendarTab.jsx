'use client';

import { useState, useRef } from 'react';
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
	Flame,
	Target,
	Zap,
	Heart,
	Coffee,
	Dumbbell,
	Book,
	Briefcase,
	ShoppingCart,
	Users,
	Star,
	Edit2,
	Trash2,
	Search,
	Menu,
	Volume2,
	VolumeX,
	Settings,
	Circle,
	CreditCard,
	Banknote,
	CalendarDays,
	ListTodo,
	Grid3x3,
	List,
	Palette,
	Sparkles,
	TrendingUp,
	MapPin,
	FileText,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
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
	}
};

// Default Event Types
const defaultEventTypes = [
	{ id: 'habit', label: 'Habit', color: '#6366f1', icon: 'Repeat', bgColor: 'bg-indigo-50', textColor: 'text-indigo-700', isDefault: true },
	{ id: 'event', label: 'Event', color: '#8b5cf6', icon: 'CalendarDays', bgColor: 'bg-purple-50', textColor: 'text-purple-700', isDefault: true },
	{ id: 'billing', label: 'Billing', color: '#10b981', icon: 'CreditCard', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700', isDefault: true },
	{ id: 'reminder', label: 'Reminder', color: '#f59e0b', icon: 'Bell', bgColor: 'bg-amber-50', textColor: 'text-amber-700', isDefault: true },
];

// Habit icons mapping
const iconComponents = {
	Repeat, CalendarDays, CreditCard, Bell, Flame, Coffee, Dumbbell, Book, 
	Briefcase, ShoppingCart, Users, Star, Target, Zap, Heart, Sparkles, 
	TrendingUp, MapPin, FileText, Circle
};

// Available icons for selection
const availableIcons = [
	{ id: 'Repeat', label: 'Repeat', icon: Repeat },
	{ id: 'Flame', label: 'Flame', icon: Flame },
	{ id: 'Coffee', label: 'Coffee', icon: Coffee },
	{ id: 'Dumbbell', label: 'Exercise', icon: Dumbbell },
	{ id: 'Book', label: 'Book', icon: Book },
	{ id: 'Heart', label: 'Health', icon: Heart },
	{ id: 'Target', label: 'Target', icon: Target },
	{ id: 'Zap', label: 'Energy', icon: Zap },
	{ id: 'Star', label: 'Star', icon: Star },
	{ id: 'Briefcase', label: 'Work', icon: Briefcase },
	{ id: 'ShoppingCart', label: 'Shopping', icon: ShoppingCart },
	{ id: 'Users', label: 'People', icon: Users },
	{ id: 'CalendarDays', label: 'Calendar', icon: CalendarDays },
	{ id: 'Bell', label: 'Bell', icon: Bell },
	{ id: 'CreditCard', label: 'Payment', icon: CreditCard },
	{ id: 'Sparkles', label: 'Sparkles', icon: Sparkles },
];

// Repeat frequencies
const frequencies = [
	{ id: 'once', label: 'Once (One-time)', days: null },
	{ id: 'daily', label: 'Every day', days: 1 },
	{ id: 'every-2-days', label: 'Every 2 days', days: 2 },
	{ id: 'every-3-days', label: 'Every 3 days', days: 3 },
	{ id: 'weekly', label: 'Weekly', days: 7 },
	{ id: 'bi-weekly', label: 'Every 2 weeks', days: 14 },
	{ id: 'monthly', label: 'Monthly', days: 30 },
	{ id: 'custom', label: 'Custom...', days: null },
];

// Helper functions
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
const formatDate = (date) => date.toISOString().split('T')[0];

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
	if (!freq || !freq.days) return item.frequency === 'custom' && item.customDays;
	
	const diffTime = current - start;
	const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
	
	if (item.frequency === 'custom' && item.customDays) {
		return diffDays % item.customDays === 0;
	}
	
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
	const [showAddTypeForm, setShowAddTypeForm] = useState(false);
	const [selectedItem, setSelectedItem] = useState(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [viewMode, setViewMode] = useState('month'); // 'month' or 'list'
	const [showDaySidebar, setShowDaySidebar] = useState(true);

	// Event types state
	const [eventTypes, setEventTypes] = useState(defaultEventTypes);

	// Items state
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
			icon: 'Dumbbell',
			color: '#6366f1',
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
			icon: 'CreditCard',
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
			icon: 'Book',
			color: '#8b5cf6',
			reminder: true,
			reminderBefore: 30,
			streak: 8,
			completed: {},
			notes: '',
		},
	]);

	// Get items for date
	const getItemsForDate = (date) => {
		return items.filter(item => shouldShowOnDate(item, date));
	};

	// Get items for month
	const getItemsForMonth = () => {
		const year = currentDate.getFullYear();
		const month = currentDate.getMonth();
		const daysInMonth = getDaysInMonth(year, month);
		
		const monthItems = {};
		
		for (let day = 1; day <= daysInMonth; day++) {
			const date = new Date(year, month, day);
			const dateStr = formatDate(date);
			monthItems[dateStr] = getItemsForDate(date);
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

	// Add new event type
	const handleAddEventType = (newType) => {
		setEventTypes([...eventTypes, { ...newType, id: Date.now().toString(), isDefault: false }]);
		setShowAddTypeForm(false);
	};

	// Delete event type
	const handleDeleteEventType = (typeId) => {
		// Move items of this type to 'event'
		setItems(items.map(item => 
			item.type === typeId ? { ...item, type: 'event' } : item
		));
		setEventTypes(eventTypes.filter(t => t.id !== typeId));
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
	const totalItems = items.length;
	const todayItems = getItemsForDate(today);
	const todayCompleted = todayItems.filter(i => i.completed[formatDate(today)]).length;

	// Filtered items for list view
	const getFilteredItems = () => {
		let filtered = items;
		
		if (selectedType !== 'all') {
			filtered = filtered.filter(i => i.type === selectedType);
		}
		
		if (searchTerm) {
			filtered = filtered.filter(i =>
				i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
				i.description?.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}
		
		return filtered;
	};

	return (
		<div className="flex h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 overflow-hidden">
			{/* Left Sidebar */}
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

					{/* Filter Types */}
					<div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin">
						<div className="mb-6">
							{!sidebarCollapsed && (
								<div className="flex items-center justify-between mb-3 px-3">
									<h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
										{t ? t('types') : 'Types'}
									</h3>
									<button
										onClick={() => setShowAddTypeForm(true)}
										className="p-1 hover:bg-primary/10 rounded-lg transition-colors"
										title="Add Type"
									>
										<Plus className="w-4 h-4 text-primary" />
									</button>
								</div>
							)}
							
							<button
								onClick={() => setSelectedType('all')}
								className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
									selectedType === 'all'
										? 'bg-gradient-to-r from-primary to-secondary-600 text-white shadow-lg scale-[1.02]'
										: 'hover:bg-gray-50 text-gray-700'
								}`}
							>
								<ListTodo className="w-5 h-5 flex-shrink-0" />
								{!sidebarCollapsed && (
									<>
										<span className="flex-1 text-left font-semibold text-sm">{t ? t('all') : 'All'}</span>
										<span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
											selectedType === 'all'
												? 'bg-white/20 text-white'
												: 'bg-gray-100 text-gray-700'
										}`}>
											{items.length}
										</span>
									</>
								)}
							</button>

							{eventTypes.map((type) => {
								const Icon = iconComponents[type.icon] || Circle;
								const count = items.filter(i => i.type === type.id).length;

								return (
									<div key={type.id} className="relative group/type">
										<button
											onClick={() => setSelectedType(type.id)}
											className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
												selectedType === type.id
													? 'bg-gradient-to-r from-primary to-secondary-600 text-white shadow-lg scale-[1.02]'
													: 'hover:bg-gray-50 text-gray-700'
											}`}
										>
											<Icon 
												className="w-5 h-5 flex-shrink-0"
												style={{ color: selectedType !== type.id ? type.color : undefined }}
											/>
											{!sidebarCollapsed && (
												<>
													<span className="flex-1 text-left font-semibold text-sm">{type.label}</span>
													{count > 0 && (
														<span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
															selectedType === type.id
																? 'bg-white/20 text-white'
																: 'bg-gray-100 text-gray-700'
														}`}>
															{count}
														</span>
													)}
												</>
											)}
										</button>
										
										{!type.isDefault && !sidebarCollapsed && (
											<button
												onClick={(e) => {
													e.stopPropagation();
													if (confirm('Delete this type? All items will be moved to Events.')) {
														handleDeleteEventType(type.id);
													}
												}}
												className="absolute ltr:right-2 rtl:left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/type:opacity-100 p-1.5 bg-red-500 hover:bg-red-600 rounded-lg transition-all shadow-lg"
											>
												<Trash2 className="w-3.5 h-3.5 text-white" />
											</button>
										)}
									</div>
								);
							})}
						</div>
					</div>

					{/* Stats */}
					{!sidebarCollapsed && (
						<div className="p-4 border-t border-gray-200 bg-gradient-to-br from-primary/5 to-secondary-600/5">
							<div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm mb-3">
								<div className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary-600 bg-clip-text text-transparent">
									{totalItems}
								</div>
								<div className="text-xs text-gray-600 font-medium mt-1">{t ? t('totalItems') : 'Total Items'}</div>
							</div>
							
							{todayItems.length > 0 && (
								<div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
									<div className="text-sm font-bold text-gray-700 mb-2">
										{t ? t('todayProgress') : 'Today'}
									</div>
									<div className="flex items-center gap-2">
										<div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
											<div 
												className="h-full bg-gradient-to-r from-primary to-secondary-600 transition-all"
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
				<div className="bg-white border-b border-gray-200 p-6 shadow-sm">
					<div className="flex items-center justify-between mb-5">
						<div className="flex items-center gap-4">
							<button
								onClick={goToPreviousMonth}
								className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors"
							>
								<ChevronLeft className="w-5 h-5 text-gray-600" />
							</button>
							
							<div className="text-center min-w-[220px]">
								<h2 className="text-3xl font-bold text-gray-900">
									{currentDate.toLocaleDateString('en-US', { month: 'long' })}
								</h2>
								<p className="text-sm text-gray-600 mt-1">
									{currentDate.toLocaleDateString('en-US', { year: 'numeric' })}
								</p>
							</div>
							
							<button
								onClick={goToNextMonth}
								className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors"
							>
								<ChevronRight className="w-5 h-5 text-gray-600" />
							</button>
							
							<button
								onClick={goToToday}
								className="px-5 py-2.5 bg-gradient-to-r from-primary to-secondary-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all text-sm"
							>
								{t ? t('today') : 'Today'}
							</button>
						</div>
						
						<div className="flex items-center gap-3">
							{/* View Mode Toggle */}
							<div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
								<button
									onClick={() => setViewMode('month')}
									className={`p-2 rounded-md transition-all ${
										viewMode === 'month'
											? 'bg-white text-primary shadow-sm'
											: 'text-gray-600 hover:text-gray-900'
									}`}
								>
									<Grid3x3 className="w-4 h-4" />
								</button>
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
							</div>

							<button
								onClick={() => setShowAddForm(true)}
								className="px-5 py-2.5 bg-gradient-to-r from-primary to-secondary-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2"
							>
								<Plus className="w-5 h-5" />
								{t ? t('addNew') : 'Add New'}
							</button>
						</div>
					</div>

					{/* Search */}
					<div className="relative">
						<Search className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
						<input
							type="text"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							placeholder={t ? t('searchPlaceholder') : "Search events, habits, billings..."}
							className="w-full ltr:pl-12 rtl:pr-12 ltr:pr-4 rtl:pl-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
						/>
					</div>
				</div>

				{/* Content Area */}
				<div className="flex-1 overflow-y-auto p-6">
					{viewMode === 'month' ? (
						<CalendarGrid
							currentDate={currentDate}
							selectedDate={selectedDate}
							onSelectDate={setSelectedDate}
							monthItems={monthItems}
							selectedType={selectedType}
							onToggleComplete={handleToggleComplete}
							eventTypes={eventTypes}
						/>
					) : (
						<ListView
							items={getFilteredItems()}
							onToggleComplete={(itemId) => handleToggleComplete(itemId, new Date())}
							onSelectItem={setSelectedItem}
							onDeleteItem={handleDeleteItem}
							eventTypes={eventTypes}
							t={t}
						/>
					)}
				</div>
			</div>

			{/* Right Sidebar - Always Visible */}
			{showDaySidebar && (
				<DayView
					date={selectedDate}
					items={selectedDateItems}
					onToggleComplete={handleToggleComplete}
					onSelectItem={setSelectedItem}
					onDeleteItem={handleDeleteItem}
					onClose={() => setShowDaySidebar(false)}
					soundEnabled={soundEnabled}
					eventTypes={eventTypes}
					t={t}
				/>
			)}

			{/* Floating button to show sidebar if hidden */}
			{!showDaySidebar && (
				<button
					onClick={() => setShowDaySidebar(true)}
					className="fixed ltr:right-6 rtl:left-6 bottom-6 p-4 bg-gradient-to-r from-primary to-secondary-600 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all hover:scale-110"
				>
					<CalendarDays className="w-6 h-6" />
				</button>
			)}

			{/* Add/Edit Form Modal */}
			{showAddForm && (
				<AddEditForm
					onClose={() => setShowAddForm(false)}
					onSave={handleAddItem}
					eventTypes={eventTypes}
					t={t}
				/>
			)}

			{/* Add Type Form */}
			{showAddTypeForm && (
				<AddTypeForm
					onClose={() => setShowAddTypeForm(false)}
					onSave={handleAddEventType}
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
					eventTypes={eventTypes}
					t={t}
				/>
			)}
		</div>
	);
}

// Calendar Grid Component
function CalendarGrid({ currentDate, selectedDate, onSelectDate, monthItems, selectedType, onToggleComplete, eventTypes }) {
	const year = currentDate.getFullYear();
	const month = currentDate.getMonth();
	const daysInMonth = getDaysInMonth(year, month);
	const firstDay = getFirstDayOfMonth(year, month);
	
	const days = [];
	const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	
	// Empty cells
	for (let i = 0; i < firstDay; i++) {
		days.push(<div key={`empty-${i}`} className="min-h-[140px] bg-gray-50/30 rounded-lg" />);
	}
	
	// Days
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
				className={`min-h-[140px] border-2 rounded-xl p-3 cursor-pointer transition-all hover:shadow-lg ${
					isSelected 
						? 'border-primary bg-primary/5 shadow-xl ring-4 ring-primary/10' 
						: isToday 
						? 'border-primary/40 bg-primary/5' 
						: 'border-gray-200 hover:border-gray-300 bg-white'
				}`}
			>
				<div className={`text-sm font-bold mb-2 ${
					isToday ? 'text-primary' : 'text-gray-700'
				}`}>
					{day}
					{isToday && (
						<span className="ltr:ml-2 rtl:mr-2 text-xs px-2 py-0.5 bg-primary text-white rounded-full">
							Today
						</span>
					)}
				</div>
				
				<div className="space-y-1.5">
					{filteredItems.slice(0, 3).map((item) => {
						const type = eventTypes.find(t => t.id === item.type);
						const Icon = iconComponents[type?.icon] || Circle;
						const isCompleted = item.completed[dateStr];
						
						return (
							<div
								key={item.id}
								onClick={(e) => {
									e.stopPropagation();
									onToggleComplete(item.id, date);
								}}
								className={`text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 hover:scale-105 transition-transform cursor-pointer ${
									isCompleted ? 'opacity-50 line-through' : ''
								} ${type?.bgColor || 'bg-gray-100'}`}
								style={{ borderLeft: `3px solid ${item.color}` }}
							>
								{isCompleted && <Check className="w-3 h-3 text-green-600 flex-shrink-0" />}
								<Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: item.color }} />
								<span className="truncate font-semibold flex-1">{item.title}</span>
							</div>
						);
					})}
					{filteredItems.length > 3 && (
						<div className="text-xs text-gray-500 font-semibold px-2.5">
							+{filteredItems.length - 3} more
						</div>
					)}
				</div>
			</div>
		);
	}
	
	return (
		<div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
			{/* Day headers */}
			<div className="grid grid-cols-7 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
				{dayNames.map((name) => (
					<div key={name} className="p-4 text-center font-bold text-gray-700">
						{name}
					</div>
				))}
			</div>
			
			{/* Calendar days */}
			<div className="grid grid-cols-7 gap-2 p-2 bg-gray-50">
				{days}
			</div>
		</div>
	);
}

// List View Component
function ListView({ items, onToggleComplete, onSelectItem, onDeleteItem, eventTypes, t }) {
	if (items.length === 0) {
		return (
			<div className="text-center py-20">
				<CalendarIcon className="w-20 h-20 mx-auto text-gray-300 mb-4" />
				<h3 className="text-xl font-bold text-gray-900 mb-2">No items found</h3>
				<p className="text-gray-600">Try adjusting your filters or add a new item</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{items.map((item) => {
				const type = eventTypes.find(t => t.id === item.type);
				const Icon = iconComponents[item.icon] || Circle;
				
				return (
					<div
						key={item.id}
						className="bg-white rounded-xl border-2 border-gray-200 hover:border-primary/30 transition-all p-5 group hover:shadow-lg"
					>
						<div className="flex items-start gap-4">
							<Checkbox
								checked={false}
								onCheckedChange={() => onToggleComplete(item.id)}
								className="data-[state=checked]:bg-primary data-[state=checked]:border-primary mt-1 flex-shrink-0"
							/>

							<div className="flex-1 min-w-0" onClick={() => onSelectItem(item)}>
								<div className="flex items-center gap-3 mb-2">
									<Icon className="w-5 h-5 flex-shrink-0" style={{ color: item.color }} />
									<h4 className="font-bold text-gray-900 cursor-pointer hover:text-primary transition-colors">
										{item.title}
									</h4>
								</div>
								
								{item.description && (
									<p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
								)}
								
								<div className="flex items-center gap-2 flex-wrap">
									<span className={`px-3 py-1 rounded-lg text-xs font-semibold ${type?.bgColor} ${type?.textColor}`}>
										{type?.label}
									</span>
									
									{item.startDate && (
										<span className="flex items-center gap-1 text-xs text-gray-600">
											<CalendarIcon className="w-3.5 h-3.5" />
											{new Date(item.startDate).toLocaleDateString()}
										</span>
									)}
									
									{item.time && (
										<span className="flex items-center gap-1 text-xs text-gray-600">
											<Clock className="w-3.5 h-3.5" />
											{item.time}
										</span>
									)}
									
									{item.frequency && item.frequency !== 'once' && (
										<span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-md font-semibold">
											<Repeat className="w-3.5 h-3.5" />
											{frequencies.find(f => f.id === item.frequency)?.label || item.frequency}
										</span>
									)}
								</div>
							</div>

							<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
								<button
									onClick={() => onSelectItem(item)}
									className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
								>
									<Edit2 className="w-4 h-4 text-primary" />
								</button>
								<button
									onClick={() => {
										if (confirm('Delete this item?')) {
											onDeleteItem(item.id);
										}
									}}
									className="p-2 hover:bg-red-100 rounded-lg transition-colors"
								>
									<Trash2 className="w-4 h-4 text-red-600" />
								</button>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}

// Day View Component (Right Sidebar)
function DayView({ date, items, onToggleComplete, onSelectItem, onDeleteItem, onClose, soundEnabled, eventTypes, t }) {
	const dateStr = formatDate(date);
	const isToday = formatDate(new Date()) === dateStr;
	
	return (
		<div className="w-[420px] bg-white border-l border-gray-200 flex flex-col h-screen overflow-hidden ltr:animate-slide-in-right rtl:animate-slide-in-left shadow-2xl">
			{/* Header */}
			<div className="p-6 border-b border-gray-200 bg-gradient-to-br from-primary/5 to-secondary-600/5 flex-shrink-0">
				<div className="flex items-center justify-between mb-4">
					<div>
						<div className="text-sm font-semibold text-gray-600 mb-1">
							{date.toLocaleDateString('en-US', { weekday: 'long' })}
						</div>
						<div className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary-600 bg-clip-text text-transparent">
							{date.toLocaleDateString('en-US', { day: 'numeric' })}
						</div>
						<div className="text-sm text-gray-600 mt-1">
							{date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
						</div>
					</div>
					
					<button
						onClick={onClose}
						className="p-2 hover:bg-white rounded-lg transition-colors"
					>
						<X className="w-5 h-5 text-gray-600" />
					</button>
				</div>
				
				{isToday && (
					<div className="px-4 py-2 bg-gradient-to-r from-primary to-secondary-600 text-white rounded-xl text-sm font-bold inline-block shadow-md">
						{t ? t('today') : 'Today'}
					</div>
				)}
			</div>

			{/* Items List */}
			<div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
				{items.length === 0 ? (
					<div className="text-center py-20">
						<div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-secondary-600/20 flex items-center justify-center">
							<CalendarIcon className="w-10 h-10 text-primary" />
						</div>
						<p className="text-gray-600 font-medium">
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
							eventTypes={eventTypes}
							t={t}
						/>
					))
				)}
			</div>
		</div>
	);
}

// Day View Item Component
function DayViewItem({ item, date, onToggle, onSelect, onDelete, soundEnabled, eventTypes, t }) {
	const type = eventTypes.find(t => t.id === item.type);
	const Icon = iconComponents[item.icon] || Circle;
	const dateStr = formatDate(date);
	const isCompleted = item.completed[dateStr];
	
	return (
		<div className="bg-white rounded-xl border-2 border-gray-200 hover:border-primary/30 transition-all p-4 group hover:shadow-md">
			<div className="flex items-start gap-3">
				<Checkbox
					checked={isCompleted}
					onCheckedChange={onToggle}
					className="data-[state=checked]:bg-primary data-[state=checked]:border-primary mt-1 flex-shrink-0"
				/>

				<div className="flex-1 min-w-0" onClick={onSelect}>
					<div className="flex items-center gap-2 mb-1">
						<Icon className="w-4 h-4 flex-shrink-0" style={{ color: item.color }} />
						<h4 className={`font-bold text-gray-900 cursor-pointer hover:text-primary transition-colors text-sm ${
							isCompleted ? 'line-through opacity-60' : ''
						}`}>
							{item.title}
						</h4>
					</div>
					
					{item.description && (
						<p className="text-sm text-gray-600 mb-2 line-clamp-1">{item.description}</p>
					)}
					
					<div className="flex items-center gap-2 text-xs flex-wrap">
						<span className={`px-2 py-1 rounded-md font-semibold ${type?.bgColor} ${type?.textColor}`}>
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

// Add Type Form Component
function AddTypeForm({ onClose, onSave, t }) {
	const [formData, setFormData] = useState({
		label: '',
		icon: 'Circle',
		color: '#6366f1',
		bgColor: 'bg-indigo-50',
		textColor: 'text-indigo-700',
	});

	const handleSubmit = (e) => {
		e.preventDefault();
		if (!formData.label.trim()) return;
		
		onSave(formData);
	};

	return (
		<div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
			<div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
				<form onSubmit={handleSubmit}>
					<div className="p-6 border-b border-gray-200">
						<div className="flex items-center justify-between">
							<h2 className="text-xl font-bold text-gray-900">Add New Type</h2>
							<button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
								<X className="w-5 h-5" />
							</button>
						</div>
					</div>

					<div className="p-6 space-y-4">
						<div>
							<label className="text-sm font-bold text-gray-700 mb-2 block">Type Name</label>
							<input
								type="text"
								value={formData.label}
								onChange={(e) => setFormData({ ...formData, label: e.target.value })}
								placeholder="e.g., Workout, Study, Meeting"
								className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
								required
							/>
						</div>

						<div>
							<label className="text-sm font-bold text-gray-700 mb-3 block">Icon</label>
							<div className="grid grid-cols-6 gap-2">
								{availableIcons.slice(0, 12).map((icon) => {
									const Icon = icon.icon;
									return (
										<button
											key={icon.id}
											type="button"
											onClick={() => setFormData({ ...formData, icon: icon.id })}
											className={`p-3 rounded-lg transition-all ${
												formData.icon === icon.id
													? 'bg-gradient-to-r from-primary to-secondary-600 text-white shadow-md'
													: 'bg-gray-100 text-gray-600 hover:bg-gray-200'
											}`}
										>
											<Icon className="w-5 h-5 mx-auto" />
										</button>
									);
								})}
							</div>
						</div>

						<div>
							<label className="text-sm font-bold text-gray-700 mb-2 block">Color</label>
							<div className="flex items-center gap-3">
								<input
									type="color"
									value={formData.color}
									onChange={(e) => setFormData({ ...formData, color: e.target.value })}
									className="w-16 h-16 rounded-xl cursor-pointer border-2 border-gray-200"
								/>
								<span className="text-sm text-gray-600">Pick a color</span>
							</div>
						</div>
					</div>

					<div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-all"
						>
							Cancel
						</button>
						<button
							type="submit"
							className="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-secondary-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
						>
							Create Type
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

// Add/Edit Form Component (simplified for space)
function AddEditForm({ onClose, onSave, item, eventTypes, t }) {
	const [formData, setFormData] = useState({
		type: item?.type || 'habit',
		title: item?.title || '',
		description: item?.description || '',
		startDate: item?.startDate || formatDate(new Date()),
		time: item?.time || '09:00',
		frequency: item?.frequency || 'daily',
		customDays: item?.customDays || 1,
		icon: item?.icon || 'Target',
		color: item?.color || '#6366f1',
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

	return (
		<div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
			<div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
				<form onSubmit={handleSubmit}>
					<div className="p-6 border-b border-gray-200 bg-gradient-to-r from-primary/5 to-secondary-600/5 sticky top-0">
						<div className="flex items-center justify-between">
							<h2 className="text-2xl font-bold text-gray-900">
								{item ? 'Edit Item' : 'Add New Item'}
							</h2>
							<button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
								<X className="w-5 h-5" />
							</button>
						</div>
					</div>

					<div className="p-6 space-y-6">
						{/* Type Selection */}
						<div>
							<label className="text-sm font-bold text-gray-700 mb-3 block">Type</label>
							<div className="grid grid-cols-4 gap-3">
								{eventTypes.slice(0, 4).map((type) => {
									const Icon = iconComponents[type.icon] || Circle;
									return (
										<button
											key={type.id}
											type="button"
											onClick={() => setFormData({ ...formData, type: type.id })}
											className={`p-4 rounded-xl font-semibold text-sm transition-all flex flex-col items-center gap-2 ${
												formData.type === type.id
													? 'bg-gradient-to-r from-primary to-secondary-600 text-white shadow-lg scale-105'
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
							<label className="text-sm font-bold text-gray-700 mb-2 block">Title</label>
							<input
								type="text"
								value={formData.title}
								onChange={(e) => setFormData({ ...formData, title: e.target.value })}
								placeholder="Enter title..."
								className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
								required
							/>
						</div>

						{/* Description */}
						<div>
							<label className="text-sm font-bold text-gray-700 mb-2 block">Description</label>
							<textarea
								value={formData.description}
								onChange={(e) => setFormData({ ...formData, description: e.target.value })}
								placeholder="Add description..."
								className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 resize-none min-h-[80px]"
							/>
						</div>

						{/* Date and Time */}
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="text-sm font-bold text-gray-700 mb-2 block">Start Date</label>
								<input
									type="date"
									value={formData.startDate}
									onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
									className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
								/>
							</div>
							<div>
								<label className="text-sm font-bold text-gray-700 mb-2 block">Time</label>
								<input
									type="time"
									value={formData.time}
									onChange={(e) => setFormData({ ...formData, time: e.target.value })}
									className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
								/>
							</div>
						</div>

						{/* Frequency */}
						<div>
							<label className="text-sm font-bold text-gray-700 mb-2 block">Frequency</label>
							<Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{frequencies.map((freq) => (
										<SelectItem key={freq.id} value={freq.id}>{freq.label}</SelectItem>
									))}
								</SelectContent>
							</Select>
							
							{formData.frequency === 'custom' && (
								<div className="mt-2 flex items-center gap-2">
									<input
										type="number"
										min="1"
										value={formData.customDays}
										onChange={(e) => setFormData({ ...formData, customDays: parseInt(e.target.value) })}
										className="w-20 px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary"
									/>
									<span className="text-sm text-gray-600 font-medium">days</span>
								</div>
							)}
						</div>

						{/* Icon Selection */}
						<div>
							<label className="text-sm font-bold text-gray-700 mb-3 block">Icon</label>
							<div className="grid grid-cols-8 gap-2">
								{availableIcons.slice(0, 16).map((icon) => {
									const Icon = icon.icon;
									return (
										<button
											key={icon.id}
											type="button"
											onClick={() => setFormData({ ...formData, icon: icon.id })}
											className={`p-3 rounded-lg transition-all ${
												formData.icon === icon.id
													? 'bg-gradient-to-r from-primary to-secondary-600 text-white shadow-md'
													: 'bg-gray-100 text-gray-600 hover:bg-gray-200'
											}`}
										>
											<Icon className="w-5 h-5 mx-auto" />
										</button>
									);
								})}
							</div>
						</div>

						{/* Amount (for billing) */}
						{formData.type === 'billing' && (
							<div className="grid grid-cols-3 gap-4">
								<div className="col-span-2">
									<label className="text-sm font-bold text-gray-700 mb-2 block">Amount</label>
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
									<label className="text-sm font-bold text-gray-700 mb-2 block">Currency</label>
									<Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="USD">USD</SelectItem>
											<SelectItem value="EUR">EUR</SelectItem>
											<SelectItem value="GBP">GBP</SelectItem>
											<SelectItem value="EGP">EGP</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						)}

						{/* Color */}
						<div>
							<label className="text-sm font-bold text-gray-700 mb-2 block">Color</label>
							<div className="flex items-center gap-3">
								<input
									type="color"
									value={formData.color}
									onChange={(e) => setFormData({ ...formData, color: e.target.value })}
									className="w-16 h-16 rounded-xl cursor-pointer border-2 border-gray-200"
								/>
								<span className="text-sm text-gray-600">Pick a color</span>
							</div>
						</div>

						{/* Reminder */}
						<div>
							<div className="flex items-center gap-3 mb-2">
								<Checkbox
									checked={formData.reminder}
									onCheckedChange={(checked) => setFormData({ ...formData, reminder: checked })}
									className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
								/>
								<label className="text-sm font-bold text-gray-700">Enable Reminder</label>
							</div>
							
							{formData.reminder && (
								<Select value={formData.reminderBefore.toString()} onValueChange={(value) => setFormData({ ...formData, reminderBefore: parseInt(value) })}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="5">5 minutes before</SelectItem>
										<SelectItem value="15">15 minutes before</SelectItem>
										<SelectItem value="30">30 minutes before</SelectItem>
										<SelectItem value="60">1 hour before</SelectItem>
										<SelectItem value="1440">1 day before</SelectItem>
									</SelectContent>
								</Select>
							)}
						</div>
					</div>

					<div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-all"
						>
							Cancel
						</button>
						<button
							type="submit"
							className="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-secondary-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
						>
							{item ? 'Update' : 'Create'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

// Item Detail Panel (simplified)
function ItemDetailPanel({ item, onUpdate, onDelete, onClose, eventTypes, t }) {
	return (
		<div className="fixed ltr:right-0 rtl:left-0 top-0 h-screen w-[500px] bg-white border-l border-gray-200 shadow-2xl ltr:animate-slide-in-right rtl:animate-slide-in-left z-40 overflow-y-auto">
			<div className="p-6 border-b border-gray-200 bg-gradient-to-br from-primary/5 to-secondary-600/5">
				<div className="flex items-center justify-between">
					<h2 className="text-xl font-bold text-gray-900">{item.title}</h2>
					<button onClick={onClose} className="p-2 hover:bg-white rounded-lg">
						<X className="w-5 h-5" />
					</button>
				</div>
			</div>
			
			<div className="p-6 space-y-4">
				{item.description && (
					<div>
						<h3 className="text-sm font-bold text-gray-700 mb-2">Description</h3>
						<p className="text-gray-600">{item.description}</p>
					</div>
				)}
				
				{item.notes && (
					<div>
						<h3 className="text-sm font-bold text-gray-700 mb-2">Notes</h3>
						<p className="text-gray-600">{item.notes}</p>
					</div>
				)}
				
				<button
					onClick={() => {
						if (confirm('Delete this item?')) {
							onDelete(item.id);
						}
					}}
					className="w-full p-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
				>
					<Trash2 className="w-5 h-5" />
					Delete Item
				</button>
			</div>
		</div>
	);
}