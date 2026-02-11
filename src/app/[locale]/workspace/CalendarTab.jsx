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
	CalendarDays,
	ListTodo,
	Grid3x3,
	List,
	Sparkles,
	TrendingUp,
	MapPin,
	FileText,
	ChevronDown,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

// Import shadcn components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

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
	{ id: 'habit', label: 'habit', color: 'var(--color-primary-600)', icon: 'Repeat', bgColor: 'bg-indigo-50', textColor: 'text-indigo-700', isDefault: true },
	{ id: 'event', label: 'event', color: 'var(--color-secondary-600)', icon: 'CalendarDays', bgColor: 'bg-purple-50', textColor: 'text-purple-700', isDefault: true },
	{ id: 'billing', label: 'billing', color: '#10b981', icon: 'CreditCard', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700', isDefault: true },
	{ id: 'reminder', label: 'reminder', color: '#f59e0b', icon: 'Bell', bgColor: 'bg-amber-50', textColor: 'text-amber-700', isDefault: true },
];

// Icons mapping
const iconComponents = {
	Repeat, CalendarDays, CreditCard, Bell, Flame, Coffee, Dumbbell, Book, 
	Briefcase, ShoppingCart, Users, Star, Target, Zap, Heart, Sparkles, 
	TrendingUp, MapPin, FileText, Circle
};

// Available icons
const availableIcons = [
	{ id: 'Repeat', icon: Repeat },
	{ id: 'Flame', icon: Flame },
	{ id: 'Coffee', icon: Coffee },
	{ id: 'Dumbbell', icon: Dumbbell },
	{ id: 'Book', icon: Book },
	{ id: 'Heart', icon: Heart },
	{ id: 'Target', icon: Target },
	{ id: 'Zap', icon: Zap },
	{ id: 'Star', icon: Star },
	{ id: 'Briefcase', icon: Briefcase },
	{ id: 'ShoppingCart', icon: ShoppingCart },
	{ id: 'Users', icon: Users },
	{ id: 'CalendarDays', icon: CalendarDays },
	{ id: 'Bell', icon: Bell },
	{ id: 'CreditCard', icon: CreditCard },
	{ id: 'Sparkles', icon: Sparkles },
];

// Repeat frequencies
const frequencies = [
	{ id: 'once', label: 'once' },
	{ id: 'daily', label: 'daily', days: 1 },
	{ id: 'every-2-days', label: 'every2days', days: 2 },
	{ id: 'every-3-days', label: 'every3days', days: 3 },
	{ id: 'weekly', label: 'weekly', days: 7 },
	{ id: 'bi-weekly', label: 'biweekly', days: 14 },
	{ id: 'monthly', label: 'monthly', days: 30 },
	{ id: 'custom', label: 'custom' },
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
	const locale = useLocale();
	const isRTL = locale === 'ar';
	const today = new Date();
	
	const [currentDate, setCurrentDate] = useState(today);
	const [selectedDate, setSelectedDate] = useState(null);
	const [soundEnabled, setSoundEnabled] = useState(true);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [selectedType, setSelectedType] = useState('all');
	const [showAddForm, setShowAddForm] = useState(false);
	const [showAddTypeForm, setShowAddTypeForm] = useState(false);
	const [selectedItem, setSelectedItem] = useState(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [viewMode, setViewMode] = useState('month');
	const [showDaySidebar, setShowDaySidebar] = useState(false);

	const [eventTypes, setEventTypes] = useState(defaultEventTypes);

	const [items, setItems] = useState([
		{
			id: '1',
			type: 'habit',
			title: 'Morning Workout',
			startDate: '2024-02-01',
			time: '06:00',
			frequency: 'daily',
			customDays: null,
			icon: 'Dumbbell',
			color: 'var(--color-primary-600)',
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
			startDate: '2024-02-01',
			time: '21:00',
			frequency: 'every-2-days',
			customDays: null,
			icon: 'Book',
			color: 'var(--color-secondary-600)',
			reminder: true,
			reminderBefore: 30,
			streak: 8,
			completed: {},
			notes: '',
		},
	]);

	const getItemsForDate = (date) => {
		return items.filter(item => shouldShowOnDate(item, date));
	};

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

	const handleAddItem = (newItem) => {
		setItems([...items, { ...newItem, id: Date.now().toString(), completed: {}, streak: 0 }]);
		setShowAddForm(false);
	};

	const handleUpdateItem = (itemId, updates) => {
		setItems(items.map(item => item.id === itemId ? { ...item, ...updates } : item));
		if (selectedItem?.id === itemId) {
			setSelectedItem({ ...selectedItem, ...updates });
		}
	};

	const handleDeleteItem = (itemId) => {
		setItems(items.filter(item => item.id !== itemId));
		if (selectedItem?.id === itemId) {
			setSelectedItem(null);
		}
		setShowDaySidebar(false);
	};

	const handleAddEventType = (newType) => {
		setEventTypes([...eventTypes, { ...newType, id: Date.now().toString(), isDefault: false }]);
		setShowAddTypeForm(false);
	};

	const handleDeleteEventType = (typeId) => {
		setItems(items.map(item => 
			item.type === typeId ? { ...item, type: 'event' } : item
		));
		setEventTypes(eventTypes.filter(t => t.id !== typeId));
	};

	const goToPreviousMonth = () => {
		setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
	};

	const goToNextMonth = () => {
		setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
	};

	const goToToday = () => {
		setCurrentDate(new Date());
		setSelectedDate(new Date());
		setShowDaySidebar(true);
	};

	const handleDateClick = (date) => {
		setSelectedDate(date);
		setShowDaySidebar(true);
	};

	const monthItems = getItemsForMonth();
	const selectedDateItems = selectedDate ? getItemsForDate(selectedDate) : [];

	const totalItems = items.length;
	const todayItems = getItemsForDate(today);
	const todayCompleted = todayItems.filter(i => i.completed[formatDate(today)]).length;

	const getFilteredItems = () => {
		let filtered = items;
		
		if (selectedType !== 'all') {
			filtered = filtered.filter(i => i.type === selectedType);
		}
		
		if (searchTerm) {
			filtered = filtered.filter(i =>
				i.title.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}
		
		return filtered;
	};

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
								<button
									onClick={() => setSoundEnabled(!soundEnabled)}
									className={`p-3 rounded-xl transition-all flex-1 font-bold text-sm shadow-sm ${
										soundEnabled
											? 'bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white'
											: 'bg-gray-100 text-gray-600 hover:bg-gray-200'
									}`}
								>
									{soundEnabled ? <Volume2 className="w-4 h-4 mx-auto" /> : <VolumeX className="w-4 h-4 mx-auto" />}
								</button>
								<button className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all flex-1 shadow-sm">
									<Settings className="w-4 h-4 text-gray-600 mx-auto" />
								</button>
							</div>
						)}
					</div>

					<div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin">
						<div className="mb-6">
							{!sidebarCollapsed && (
								<div className="flex items-center justify-between mb-3 px-3">
									<h3 className="text-xs font-black text-gray-500 uppercase tracking-wider">
										{t('types')}
									</h3>
									<button
										onClick={() => setShowAddTypeForm(true)}
										className="p-2 hover:bg-[var(--color-primary-100)] rounded-xl transition-all hover:scale-110"
										title={t('addType')}
									>
										<Plus className="w-4 h-4 text-[var(--color-primary-600)]" />
									</button>
								</div>
							)}
							
							<button
								onClick={() => setSelectedType('all')}
								className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all mb-1 ${
									selectedType === 'all'
										? 'bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white shadow-lg scale-[1.02]'
										: 'hover:bg-gray-50 text-gray-700'
								}`}
							>
								<ListTodo className="w-5 h-5 flex-shrink-0" />
								{!sidebarCollapsed && (
									<>
										<span className="flex-1 text-left font-bold text-sm">{t('all')}</span>
										<span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
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
									<div key={type.id} className="relative group/type mb-1">
										<button
											onClick={() => setSelectedType(type.id)}
											className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
												selectedType === type.id
													? 'bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white shadow-lg scale-[1.02]'
													: 'hover:bg-gray-50 text-gray-700'
											}`}
										>
											<Icon 
												className="w-5 h-5 flex-shrink-0"
												style={{ color: selectedType !== type.id ? type.color : undefined }}
											/>
											{!sidebarCollapsed && (
												<>
													<span className="flex-1 text-left font-bold text-sm">{t(`types.${type.label}`)}</span>
													{count > 0 && (
														<span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
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
													if (confirm(t('confirmDeleteType'))) {
														handleDeleteEventType(type.id);
													}
												}}
												className={`absolute ${isRTL ? 'left-2' : 'right-2'} top-1/2 -translate-y-1/2 opacity-0 group-hover/type:opacity-100 p-2 bg-red-500 hover:bg-red-600 rounded-xl transition-all shadow-lg hover:scale-110`}
											>
												<Trash2 className="w-3.5 h-3.5 text-white" />
											</button>
										)}
									</div>
								);
							})}
						</div>
					</div>

					{!sidebarCollapsed && (
						<div className="p-5 border-t-2 border-gray-100 bg-gradient-to-br from-[var(--color-primary-50)] to-white">
							<div className="bg-white rounded-2xl p-5 border-2 border-gray-100 shadow-sm mb-3">
								<div className="text-4xl font-black bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] bg-clip-text text-transparent">
									{totalItems}
								</div>
								<div className="text-xs text-gray-600 font-bold mt-1.5">{t('totalItems')}</div>
							</div>
							
							{todayItems.length > 0 && (
								<div className="bg-white rounded-2xl p-5 border-2 border-gray-100 shadow-sm">
									<div className="text-sm font-black text-gray-700 mb-3">
										{t('todayProgress')}
									</div>
									<div className="flex items-center gap-3">
										<div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
											<div 
												className="h-full bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] transition-all duration-500"
												style={{ width: `${(todayCompleted / todayItems.length) * 100}%` }}
											/>
										</div>
										<span className="text-xs font-black text-gray-600">
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
				<div className="bg-white border-b-2 border-gray-100 p-6 shadow-sm">
					<div className="flex items-center justify-between mb-6">
						<div className="flex items-center gap-4">
							<button
								onClick={goToPreviousMonth}
								className="p-3 hover:bg-gray-100 rounded-xl transition-all hover:scale-110"
							>
								{isRTL ? <ChevronRight className="w-5 h-5 text-gray-600" /> : <ChevronLeft className="w-5 h-5 text-gray-600" />}
							</button>
							
							<div className="text-center min-w-[240px]">
								<h2 className="text-4xl font-black text-gray-900">
									{currentDate.toLocaleDateString(locale, { month: 'long' })}
								</h2>
								<p className="text-sm text-gray-600 mt-2 font-semibold">
									{currentDate.toLocaleDateString(locale, { year: 'numeric' })}
								</p>
							</div>
							
							<button
								onClick={goToNextMonth}
								className="p-3 hover:bg-gray-100 rounded-xl transition-all hover:scale-110"
							>
								{isRTL ? <ChevronLeft className="w-5 h-5 text-gray-600" /> : <ChevronRight className="w-5 h-5 text-gray-600" />}
							</button>
							
							<Button
								onClick={goToToday}
								className="bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white font-black hover:shadow-xl"
							>
								{t('today')}
							</Button>
						</div>
						
						<div className="flex items-center gap-3">
							<div className="flex items-center gap-1.5 bg-gray-100 rounded-xl p-1.5 shadow-sm">
								<button
									onClick={() => setViewMode('month')}
									className={`p-2.5 rounded-lg transition-all ${
										viewMode === 'month'
											? 'bg-white text-[var(--color-primary-600)] shadow-sm'
											: 'text-gray-600 hover:text-gray-900'
									}`}
								>
									<Grid3x3 className="w-4 h-4" />
								</button>
								<button
									onClick={() => setViewMode('list')}
									className={`p-2.5 rounded-lg transition-all ${
										viewMode === 'list'
											? 'bg-white text-[var(--color-primary-600)] shadow-sm'
											: 'text-gray-600 hover:text-gray-900'
									}`}
								>
									<List className="w-4 h-4" />
								</button>
							</div>

							<Button
								onClick={() => setShowAddForm(true)}
								className="bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white font-black hover:shadow-xl"
							>
								<Plus className="w-5 h-5 mr-2" />
								{t('addNew')}
							</Button>
						</div>
					</div>
 
				</div>

				<div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
					{viewMode === 'month' ? (
						<CalendarGrid
							currentDate={currentDate}
							selectedDate={selectedDate}
							onSelectDate={handleDateClick}
							monthItems={monthItems}
							selectedType={selectedType}
							onToggleComplete={handleToggleComplete}
							eventTypes={eventTypes}
							locale={locale}
							t={t}
						/>
					) : (
						<ListView
							items={getFilteredItems()}
							onToggleComplete={(itemId) => handleToggleComplete(itemId, new Date())}
							onSelectItem={(item) => {
								setSelectedItem(item);
								setSelectedDate(new Date(item.startDate));
								setShowDaySidebar(true);
							}}
							onDeleteItem={handleDeleteItem}
							eventTypes={eventTypes}
							locale={locale}
							t={t}
						/>
					)}
				</div>
			</div>

			{/* Day Sidebar with blur overlay */}
			{showDaySidebar && selectedDate && (
				<>
					{/* Blur Overlay */}
					<div 
						className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300"
						onClick={() => setShowDaySidebar(false)}
					/>
					
					{/* Sidebar */}
					<DayView
						date={selectedDate}
						items={selectedDateItems}
						onToggleComplete={handleToggleComplete}
						onSelectItem={setSelectedItem}
						onDeleteItem={handleDeleteItem}
						onClose={() => setShowDaySidebar(false)}
						soundEnabled={soundEnabled}
						eventTypes={eventTypes}
						isRTL={isRTL}
						locale={locale}
						t={t}
					/>
				</>
			)}

			{showAddForm && (
				<AddEditForm
					open={showAddForm}
					onClose={() => setShowAddForm(false)}
					onSave={handleAddItem}
					eventTypes={eventTypes}
					t={t}
					locale={locale}
				/>
			)}

			{showAddTypeForm && (
				<AddTypeForm
					open={showAddTypeForm}
					onClose={() => setShowAddTypeForm(false)}
					onSave={handleAddEventType}
					t={t}
				/>
			)}

			{selectedItem && (
				<ItemDetailDialog
					open={!!selectedItem}
					item={selectedItem}
					onClose={() => setSelectedItem(null)}
					onUpdate={handleUpdateItem}
					onDelete={handleDeleteItem}
					eventTypes={eventTypes}
					t={t}
				/>
			)}
		</div>
	);
}

// Calendar Grid Component
function CalendarGrid({ currentDate, selectedDate, onSelectDate, monthItems, selectedType, onToggleComplete, eventTypes, locale, t }) {
	const year = currentDate.getFullYear();
	const month = currentDate.getMonth();
	const daysInMonth = getDaysInMonth(year, month);
	const firstDay = getFirstDayOfMonth(year, month);
	
	const days = [];
	const dayNames = t('dayNames').split(',');
	
	for (let i = 0; i < firstDay; i++) {
		days.push(<div key={`empty-${i}`} className="min-h-[140px] bg-gray-50/50 rounded-2xl border-2 border-transparent" />);
	}
	
	for (let day = 1; day <= daysInMonth; day++) {
		const date = new Date(year, month, day);
		const dateStr = formatDate(date);
		const dayItems = monthItems[dateStr] || [];
		const filteredItems = selectedType === 'all' ? dayItems : dayItems.filter(i => i.type === selectedType);
		
		const isToday = formatDate(new Date()) === dateStr;
		const isSelected = selectedDate && formatDate(selectedDate) === dateStr;
		
		days.push(
			<div
				key={day}
				onClick={() => onSelectDate(date)}
				className={`min-h-[140px] border-2 rounded-2xl p-4 cursor-pointer transition-all duration-200 ${
					isSelected 
						? 'border-[var(--color-gradient-from)] bg-gradient-to-br from-[var(--color-primary-50)] to-white shadow-2xl ring-4 ring-[var(--color-primary-100)] scale-[1.03]' 
						: isToday 
						? 'border-[var(--color-primary-400)] bg-gradient-to-br from-[var(--color-primary-50)] to-white shadow-lg hover:shadow-xl' 
						: 'border-gray-200 bg-white hover:border-[var(--color-primary-300)] hover:shadow-lg hover:scale-[1.01]'
				}`}
			>
				<div className={`text-base font-black mb-3 flex items-center justify-between ${
					isToday ? 'text-[var(--color-primary-600)]' : 'text-gray-700'
				}`}>
					<span className="text-lg">{day}</span>
					{isToday && (
						<span className="text-[10px] px-2 py-0.5 bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white rounded-full font-black shadow-sm">
							{t('today')}
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
								className={`text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer border-l-[3px] ${
									isCompleted ? 'opacity-50 line-through' : 'hover:scale-[1.02]'
								} ${type?.bgColor || 'bg-gray-100'} shadow-sm hover:shadow-md`}
								style={{ borderLeftColor: item.color }}
							>
								{isCompleted && <Check className="w-3 h-3 text-green-600 flex-shrink-0" />}
								<Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: item.color }} />
								<span className="truncate font-bold flex-1">{item.title}</span>
							</div>
						);
					})}
					{filteredItems.length > 3 && (
						<div className="text-[10px] text-gray-600 font-black px-2.5 py-1 bg-gray-100 rounded-lg inline-block">
							+{filteredItems.length - 3} {t('more')}
						</div>
					)}
				</div>
			</div>
		);
	}
	
	return (
		<div className="bg-white rounded-3xl shadow-xl border-2 border-gray-100 overflow-hidden">
			<div className="grid grid-cols-7 bg-gradient-to-r from-gray-50 to-white border-b-2 border-gray-100">
				{dayNames.map((name) => (
					<div key={name} className="p-4 text-center font-black text-gray-700 text-sm">
						{name}
					</div>
				))}
			</div>
			
			<div className="grid grid-cols-7 gap-2 p-2 bg-gradient-to-br from-gray-50 to-white">
				{days}
			</div>
		</div>
	);
}

// List View Component
function ListView({ items, onToggleComplete, onSelectItem, onDeleteItem, eventTypes, locale, t }) {
	if (items.length === 0) {
		return (
			<div className="text-center py-20">
				<div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-[var(--color-primary-100)] to-[var(--color-secondary-100)] flex items-center justify-center shadow-lg">
					<CalendarIcon className="w-16 h-16 text-[var(--color-primary-600)]" />
				</div>
				<h3 className="text-3xl font-black text-gray-900 mb-3">{t('noItemsFound')}</h3>
				<p className="text-gray-600 text-lg font-semibold">{t('tryAdjustingFilters')}</p>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{items.map((item) => {
				const type = eventTypes.find(t => t.id === item.type);
				const Icon = iconComponents[item.icon] || Circle;
				
				return (
					<div
						key={item.id}
						onClick={() => onSelectItem(item)}
						className="bg-white rounded-2xl border-2 border-gray-200 hover:border-[var(--color-primary-300)] transition-all p-5 cursor-pointer hover:shadow-xl hover:scale-[1.02] group"
					>
						<div className="flex items-start justify-between mb-4">
							<div className="flex items-center gap-3">
								<div className="p-3 rounded-xl" style={{ backgroundColor: `${item.color}15` }}>
									<Icon className="w-6 h-6" style={{ color: item.color }} />
								</div>
								<div>
									<h4 className="font-black text-gray-900 text-lg mb-1">
										{item.title}
									</h4>
									<span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${type?.bgColor} ${type?.textColor}`}>
										{t(`types.${type?.label}`)}
									</span>
								</div>
							</div>
						</div>
						
						<div className="flex items-center gap-3 text-sm text-gray-600 font-semibold">
							{item.startDate && (
								<span className="flex items-center gap-1.5">
									<CalendarIcon className="w-4 h-4" />
									{new Date(item.startDate).toLocaleDateString(locale)}
								</span>
							)}
							
							{item.time && (
								<span className="flex items-center gap-1.5">
									<Clock className="w-4 h-4" />
									{item.time}
								</span>
							)}
						</div>

						{item.type === 'habit' && item.streak > 0 && (
							<div className="mt-3 flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-lg">
								<Flame className="w-4 h-4 text-orange-600" />
								<span className="text-sm font-black text-orange-600">
									{item.streak} {t('daysStreak')}
								</span>
							</div>
						)}

						{item.type === 'billing' && item.amount && (
							<div className="mt-3 flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
								<DollarSign className="w-4 h-4 text-green-600" />
								<span className="text-sm font-black text-green-600">
									{item.amount} {item.currency}
								</span>
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}

// Day View Sidebar
function DayView({ date, items, onToggleComplete, onSelectItem, onDeleteItem, onClose, soundEnabled, eventTypes, isRTL, locale, t }) {
	const dateStr = formatDate(date);
	const isToday = formatDate(new Date()) === dateStr;
	
	return (
		<div 
			className={`fixed ${isRTL ? 'left-0' : 'right-0'} top-0 h-screen w-[420px] bg-white border-${isRTL ? 'r' : 'l'}-2 border-gray-100 shadow-2xl z-50 overflow-y-auto scrollbar-thin animate-slide-in-${isRTL ? 'left' : 'right'}`}
		>
			<div className="sticky top-0 bg-gradient-to-br from-[var(--color-primary-50)] via-white to-[var(--color-secondary-50)] border-b-2 border-gray-100 p-6 z-10">
				<div className="flex items-start justify-between mb-6">
					<div>
						<div className="text-sm font-bold text-gray-600 mb-2">
							{date.toLocaleDateString(locale, { weekday: 'long' })}
						</div>
						<div className="text-6xl font-black bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] bg-clip-text text-transparent mb-2">
							{date.toLocaleDateString(locale, { day: 'numeric' })}
						</div>
						<div className="text-sm text-gray-600 font-semibold">
							{date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
						</div>
					</div>
					
					<Button
						onClick={onClose}
						variant="ghost"
						size="icon"
						className="rounded-xl"
					>
						<X className="w-5 h-5" />
					</Button>
				</div>
				
				{isToday && (
					<div className="px-5 py-2.5 bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white rounded-xl text-sm font-black inline-block shadow-md">
						{t('today')}
					</div>
				)}
			</div>

			<div className="p-5 space-y-3">
				{items.length === 0 ? (
					<div className="text-center py-16">
						<div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[var(--color-primary-100)] to-[var(--color-secondary-100)] flex items-center justify-center shadow-lg">
							<CalendarIcon className="w-12 h-12 text-[var(--color-primary-600)]" />
						</div>
						<p className="text-gray-600 font-bold text-lg">
							{t('noItemsThisDay')}
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
								if (confirm(t('confirmDelete'))) {
									onDeleteItem(item.id);
								}
							}}
							eventTypes={eventTypes}
							t={t}
						/>
					))
				)}
			</div>
		</div>
	);
}

// Day View Item
function DayViewItem({ item, date, onToggle, onSelect, onDelete, eventTypes, t }) {
	const type = eventTypes.find(t => t.id === item.type);
	const Icon = iconComponents[item.icon] || Circle;
	const dateStr = formatDate(date);
	const isCompleted = item.completed[dateStr];
	
	return (
		<div className="bg-white rounded-2xl border-2 border-gray-200 hover:border-[var(--color-primary-300)] transition-all p-5 group hover:shadow-xl">
			<div className="flex items-start gap-4">
				<Checkbox
					checked={isCompleted}
					onCheckedChange={onToggle}
					className="mt-1"
				/>

				<div className="flex-1 min-w-0" onClick={onSelect}>
					<div className="flex items-center gap-2.5 mb-3">
						<div className="p-2.5 rounded-xl" style={{ backgroundColor: `${item.color}15` }}>
							<Icon className="w-5 h-5" style={{ color: item.color }} />
						</div>
						<h4 className={`font-black text-gray-900 cursor-pointer hover:text-[var(--color-primary-600)] transition-colors text-base ${
							isCompleted ? 'line-through opacity-60' : ''
						}`}>
							{item.title}
						</h4>
					</div>
					
					<div className="flex items-center gap-2 flex-wrap mb-3">
						<span className={`px-3 py-1.5 rounded-lg font-bold text-xs ${type?.bgColor} ${type?.textColor} shadow-sm`}>
							{t(`types.${type?.label}`)}
						</span>
						
						{item.time && (
							<span className="flex items-center gap-1.5 text-xs text-gray-600 font-semibold px-3 py-1.5 bg-gray-100 rounded-lg">
								<Clock className="w-3.5 h-3.5" />
								{item.time}
							</span>
						)}
					</div>

					{item.type === 'billing' && item.amount && (
						<div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg mb-2">
							<DollarSign className="w-4 h-4 text-green-600" />
							<span className="text-sm font-black text-green-600">
								{item.amount} {item.currency}
							</span>
						</div>
					)}
					
					{item.type === 'habit' && item.streak > 0 && (
						<div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-lg">
							<Flame className="w-4 h-4 text-orange-600" />
							<span className="text-sm font-black text-orange-600">
								{item.streak} {t('daysStreak')}
							</span>
						</div>
					)}
				</div>

				<div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
					<Button
						onClick={onSelect}
						variant="ghost"
						size="icon"
						className="h-9 w-9"
					>
						<Edit2 className="w-4 h-4 text-[var(--color-primary-600)]" />
					</Button>
					<Button
						onClick={onDelete}
						variant="ghost"
						size="icon"
						className="h-9 w-9"
					>
						<Trash2 className="w-4 h-4 text-red-600" />
					</Button>
				</div>
			</div>
		</div>
	);
}

// Add Type Form Dialog
function AddTypeForm({ open, onClose, onSave, t }) {
	const [formData, setFormData] = useState({
		label: '',
		icon: 'Circle',
		color: 'var(--color-primary-600)',
		bgColor: 'bg-indigo-50',
		textColor: 'text-indigo-700',
	});

	const handleSubmit = (e) => {
		e.preventDefault();
		if (!formData.label.trim()) return;
		onSave(formData);
		setFormData({
			label: '',
			icon: 'Circle',
			color: 'var(--color-primary-600)',
			bgColor: 'bg-indigo-50',
			textColor: 'text-indigo-700',
		});
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="text-2xl font-black">{t('addNewType')}</DialogTitle>
				</DialogHeader>
				
				<form onSubmit={handleSubmit} className="space-y-6 mt-4">
					<div>
						<Label className="text-sm font-black mb-3 block">{t('typeName')}</Label>
						<Input
							type="text"
							value={formData.label}
							onChange={(e) => setFormData({ ...formData, label: e.target.value })}
							placeholder={t('typeNamePlaceholder')}
							required
						/>
					</div>

					<div>
						<Label className="text-sm font-black mb-3 block">{t('icon')}</Label>
						<div className="grid grid-cols-6 gap-2">
							{availableIcons.slice(0, 12).map((icon) => {
								const Icon = icon.icon;
								return (
									<button
										key={icon.id}
										type="button"
										onClick={() => setFormData({ ...formData, icon: icon.id })}
										className={`p-3 rounded-xl transition-all ${
											formData.icon === icon.id
												? 'bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white shadow-md scale-110'
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
						<Label className="text-sm font-black mb-3 block">{t('color')}</Label>
						<div className="flex items-center gap-3">
							<input
								type="color"
								value={formData.color}
								onChange={(e) => setFormData({ ...formData, color: e.target.value })}
								className="w-16 h-16 rounded-xl cursor-pointer border-2 border-gray-200 shadow-sm"
							/>
							<span className="text-sm text-gray-600 font-bold">{t('pickColor')}</span>
						</div>
					</div>

					<div className="flex gap-3 pt-4">
						<Button type="button" onClick={onClose} variant="outline" className="flex-1 font-black">
							{t('cancel')}
						</Button>
						<Button type="submit" className="flex-1 bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] font-black">
							{t('create')}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// Add/Edit Form Dialog with Flatpickr
function AddEditForm({ open, onClose, onSave, item, eventTypes, t, locale }) {
	const [formData, setFormData] = useState({
		type: item?.type || 'habit',
		title: item?.title || '',
		startDate: item?.startDate || formatDate(new Date()),
		time: item?.time || '09:00',
		frequency: item?.frequency || 'daily',
		customDays: item?.customDays || 1,
		icon: item?.icon || 'Target',
		color: item?.color || 'var(--color-primary-600)',
		reminder: item?.reminder ?? true,
		reminderBefore: item?.reminderBefore || 15,
		amount: item?.amount || '',
		currency: item?.currency || 'USD',
		notes: item?.notes || '',
	});

	const dateInputRef = useRef(null);
	const timeInputRef = useRef(null);

	useEffect(() => {
		if (open && dateInputRef.current) {
			flatpickr(dateInputRef.current, {
				dateFormat: 'Y-m-d',
				defaultDate: formData.startDate,
				onChange: (selectedDates, dateStr) => {
					setFormData({ ...formData, startDate: dateStr });
				},
			});
		}

		if (open && timeInputRef.current) {
			flatpickr(timeInputRef.current, {
				enableTime: true,
				noCalendar: true,
				dateFormat: 'H:i',
				time_24hr: true,
				defaultDate: formData.time,
				onChange: (selectedDates, timeStr) => {
					setFormData({ ...formData, time: timeStr });
				},
			});
		}
	}, [open]);

	const handleSubmit = (e) => {
		e.preventDefault();
		if (!formData.title.trim()) return;
		onSave(formData);
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="text-2xl font-black">
						{item ? t('editItem') : t('addNewItem')}
					</DialogTitle>
				</DialogHeader>
				
				<form onSubmit={handleSubmit} className="space-y-6 mt-4">
					<div>
						<Label className="text-sm font-black mb-3 block">{t('type')}</Label>
						<div className="grid grid-cols-4 gap-3">
							{eventTypes.slice(0, 4).map((type) => {
								const Icon = iconComponents[type.icon] || Circle;
								return (
									<button
										key={type.id}
										type="button"
										onClick={() => setFormData({ ...formData, type: type.id })}
										className={`p-4 rounded-xl font-bold text-sm transition-all flex flex-col items-center gap-2 ${
											formData.type === type.id
												? 'bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white shadow-lg scale-105'
												: 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-gray-200'
										}`}
									>
										<Icon className="w-6 h-6" />
										{t(`types.${type.label}`)}
									</button>
								);
							})}
						</div>
					</div>

					<div>
						<Label className="text-sm font-black mb-3 block">{t('title')}</Label>
						<Input
							type="text"
							value={formData.title}
							onChange={(e) => setFormData({ ...formData, title: e.target.value })}
							placeholder={t('titlePlaceholder')}
							required
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label className="text-sm font-black mb-3 block">{t('startDate')}</Label>
							<Input
								ref={dateInputRef}
								type="text"
								placeholder={t('selectDate')}
								readOnly
							/>
						</div>
						<div>
							<Label className="text-sm font-black mb-3 block">{t('time')}</Label>
							<Input
								ref={timeInputRef}
								type="text"
								placeholder={t('selectTime')}
								readOnly
							/>
						</div>
					</div>

					<div>
						<Label className="text-sm font-black mb-3 block">{t('frequency')}</Label>
						<Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{frequencies.map((freq) => (
									<SelectItem key={freq.id} value={freq.id}>{t(`frequencies.${freq.label}`)}</SelectItem>
								))}
							</SelectContent>
						</Select>
						
						{formData.frequency === 'custom' && (
							<div className="mt-3 flex items-center gap-2">
								<Input
									type="number"
									min="1"
									value={formData.customDays}
									onChange={(e) => setFormData({ ...formData, customDays: parseInt(e.target.value) })}
									className="w-24"
								/>
								<span className="text-sm text-gray-600 font-medium">{t('days')}</span>
							</div>
						)}
					</div>

					<div>
						<Label className="text-sm font-black mb-3 block">{t('icon')}</Label>
						<div className="grid grid-cols-8 gap-2">
							{availableIcons.slice(0, 16).map((icon) => {
								const Icon = icon.icon;
								return (
									<button
										key={icon.id}
										type="button"
										onClick={() => setFormData({ ...formData, icon: icon.id })}
										className={`p-3 rounded-xl transition-all ${
											formData.icon === icon.id
												? 'bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] text-white shadow-md scale-110'
												: 'bg-gray-100 text-gray-600 hover:bg-gray-200'
										}`}
									>
										<Icon className="w-5 h-5 mx-auto" />
									</button>
								);
							})}
						</div>
					</div>

					{formData.type === 'billing' && (
						<div className="grid grid-cols-3 gap-4">
							<div className="col-span-2">
								<Label className="text-sm font-black mb-3 block">{t('amount')}</Label>
								<Input
									type="number"
									step="0.01"
									value={formData.amount}
									onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
									placeholder="0.00"
								/>
							</div>
							<div>
								<Label className="text-sm font-black mb-3 block">{t('currency')}</Label>
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

					<div>
						<Label className="text-sm font-black mb-3 block">{t('color')}</Label>
						<div className="flex items-center gap-3">
							<input
								type="color"
								value={formData.color}
								onChange={(e) => setFormData({ ...formData, color: e.target.value })}
								className="w-16 h-16 rounded-xl cursor-pointer border-2 border-gray-200 shadow-sm"
							/>
							<span className="text-sm text-gray-600 font-bold">{t('pickColor')}</span>
						</div>
					</div>

					<div>
						<Label className="text-sm font-black mb-3 block">{t('notes')}</Label>
						<Textarea
							value={formData.notes}
							onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
							placeholder={t('notesPlaceholder')}
							rows={3}
						/>
					</div>

					<div className="flex gap-3 pt-4">
						<Button type="button" onClick={onClose} variant="outline" className="flex-1 font-black">
							{t('cancel')}
						</Button>
						<Button type="submit" className="flex-1 bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] font-black">
							{item ? t('update') : t('create')}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// Item Detail Dialog
function ItemDetailDialog({ open, item, onClose, onUpdate, onDelete, eventTypes, t }) {
	const type = eventTypes.find(t => t.id === item.type);
	const Icon = iconComponents[item.icon] || Circle;

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<div className="flex items-center gap-3">
						<div className="p-3 rounded-xl" style={{ backgroundColor: `${item.color}15` }}>
							<Icon className="w-6 h-6" style={{ color: item.color }} />
						</div>
						<DialogTitle className="text-2xl font-black">{item.title}</DialogTitle>
					</div>
				</DialogHeader>
				
				<div className="space-y-5 mt-6">
					<div>
						<Label className="text-sm font-black mb-2 block">{t('type')}</Label>
						<span className={`px-3 py-2 rounded-lg font-bold text-sm ${type?.bgColor} ${type?.textColor} inline-block`}>
							{t(`types.${type?.label}`)}
						</span>
					</div>

					{item.startDate && (
						<div>
							<Label className="text-sm font-black mb-2 block">{t('startDate')}</Label>
							<p className="text-gray-700 font-semibold">
								{new Date(item.startDate).toLocaleDateString()}
							</p>
						</div>
					)}

					{item.time && (
						<div>
							<Label className="text-sm font-black mb-2 block">{t('time')}</Label>
							<p className="text-gray-700 font-semibold">{item.time}</p>
						</div>
					)}

					{item.frequency && (
						<div>
							<Label className="text-sm font-black mb-2 block">{t('frequency')}</Label>
							<p className="text-gray-700 font-semibold">
								{t(`frequencies.${frequencies.find(f => f.id === item.frequency)?.label || item.frequency}`)}
							</p>
						</div>
					)}

					{item.notes && (
						<div>
							<Label className="text-sm font-black mb-2 block">{t('notes')}</Label>
							<p className="text-gray-700 font-medium">{item.notes}</p>
						</div>
					)}

					{item.type === 'habit' && item.streak > 0 && (
						<div className="flex items-center gap-2 px-4 py-3 bg-orange-50 rounded-xl">
							<Flame className="w-5 h-5 text-orange-600" />
							<span className="text-base font-black text-orange-600">
								{item.streak} {t('daysStreak')}
							</span>
						</div>
					)}

					{item.type === 'billing' && item.amount && (
						<div className="flex items-center gap-2 px-4 py-3 bg-green-50 rounded-xl">
							<DollarSign className="w-5 h-5 text-green-600" />
							<span className="text-base font-black text-green-600">
								{item.amount} {item.currency}
							</span>
						</div>
					)}
					
					<Button
						onClick={() => {
							if (confirm(t('confirmDelete'))) {
								onDelete(item.id);
							}
						}}
						variant="destructive"
						className="w-full font-black"
					>
						<Trash2 className="w-5 h-5 mr-2" />
						{t('deleteItem')}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}