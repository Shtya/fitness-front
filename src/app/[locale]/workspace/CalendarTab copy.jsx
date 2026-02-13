
"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslations, useLocale } from "next-intl";
import {
	ChevronLeft,
	ChevronRight,
	Calendar as CalendarIcon,
	Clock,
	Check,
	Pencil,
	Trash2,
	X,
	Plus,
	Settings,
	Volume2,
	VolumeX,
	Repeat,
	CheckCircle2,
	Circle,
	Target,
	CheckSquare,
	Users,
	Bell,
	DollarSign,
	Phone,
	Music,
	Book,
	Heart,
	Star,
	Mail,
	ShoppingCart,
	Dumbbell,
	Lightbulb,
	Flame,
	ChevronDown,
	LayoutGrid,
	Calendar
} from "lucide-react";
import { Play, Pause, RotateCcw, Zap, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Icon components mapping
const ICON_COMPONENTS = {
	Target,
	CheckSquare,
	Users,
	Bell,
	DollarSign,
	Phone,
	Music,
	Book,
	Heart,
	Star,
	Mail,
	ShoppingCart,
	Dumbbell,
	Lightbulb,
	Flame,
	LayoutGrid
};

// Color options for custom types (names are localized in UI)
const COLOR_OPTIONS = [
	{ value: "bg-gradient-to-br from-red-300 to-rose-200", text: "text-red-700", border: "border-red-200", ring: "ring-red-500", nameKey: "colors.red" },
	{ value: "bg-gradient-to-br from-blue-300 to-cyan-200", text: "text-blue-700", border: "border-blue-200", ring: "ring-blue-500", nameKey: "colors.blue" },
	{ value: "bg-gradient-to-br from-emerald-300 to-teal-200", text: "text-emerald-700", border: "border-emerald-200", ring: "ring-emerald-500", nameKey: "colors.green" },
	{ value: "bg-gradient-to-br from-purple-300 to-pink-200", text: "text-purple-700", border: "border-purple-200", ring: "ring-purple-500", nameKey: "colors.purple" },
	{ value: "bg-gradient-to-br from-amber-300 to-orange-200", text: "text-amber-700", border: "border-amber-200", ring: "ring-amber-500", nameKey: "colors.orange" },
	{ value: "bg-gradient-to-br from-indigo-300 to-violet-200", text: "text-indigo-700", border: "border-indigo-200", ring: "ring-indigo-500", nameKey: "colors.indigo" }
];

// Default event types (names localized at render-time)
const DEFAULT_TYPES = [
	{ id: "all", nameKey: "types.all", color: "bg-gray-50", textColor: "text-gray-700", border: "border-gray-200", ring: "ring-gray-500", icon: "LayoutGrid" },
	{ id: "habit", nameKey: "types.habit", color: "bg-emerald-50", textColor: "text-emerald-700", border: "border-emerald-200", ring: "ring-emerald-500", icon: "Target" },
	{ id: "task", nameKey: "types.task", color: "bg-blue-50", textColor: "text-blue-700", border: "border-blue-200", ring: "ring-blue-500", icon: "CheckSquare" },
	{ id: "meeting", nameKey: "types.meeting", color: "bg-purple-50", textColor: "text-purple-700", border: "border-purple-200", ring: "ring-purple-500", icon: "Users" },
	{ id: "reminder", nameKey: "types.reminder", color: "bg-amber-50", textColor: "text-amber-700", border: "border-amber-200", ring: "ring-amber-500", icon: "Bell" },
	{ id: "billing", nameKey: "types.billing", color: "bg-rose-50", textColor: "text-rose-700", border: "border-rose-200", ring: "ring-rose-500", icon: "DollarSign" }
];


export default function CalendarPage() {
	const t = useTranslations("calendar");
	const locale = useLocale();
	const isRTL = locale === "ar";

	// State management
	const [currentDate, setCurrentDate] = useState(new Date());
	const [selectedDate, setSelectedDate] = useState(null);
	const [items, setItems] = useState([]);
	const [eventTypes, setEventTypes] = useState(DEFAULT_TYPES);
	const [selectedType, setSelectedType] = useState("all");
	const [completions, setCompletions] = useState({});

	// UI state
	const [soundEnabled, setSoundEnabled] = useState(true);
	const [showAddTypeDrawer, setShowAddTypeDrawer] = useState(false);
	const [showDaySlidePanel, setShowDaySlidePanel] = useState(false);

	// custom type form
	const [newTypeName, setNewTypeName] = useState("");
	const [newTypeColor, setNewTypeColor] = useState(COLOR_OPTIONS[5].value);
	const [newTypeIcon, setNewTypeIcon] = useState("Target");

	// Dialogs
	const [showSettingsDialog, setShowSettingsDialog] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [itemToDelete, setItemToDelete] = useState(null);

	// Add new item popover (top)
	const [showAddPopover, setShowAddPopover] = useState(false);

	// Edit popover (per-item)
	const [editingPopoverId, setEditingPopoverId] = useState(null);
	const [editingItem, setEditingItem] = useState(null);

	// Settings
	const [settings, setSettings] = useState({
		showWeekNumbers: false, // default OFF (because you don't want week rows/column)
		highlightWeekend: true,
		weekendDays: [5, 6],
		startOfWeek: 6,
		confirmBeforeDelete: true
	});

	// Form state
	const [itemForm, setItemForm] = useState({
		id: "",
		title: "",
		type: "task",
		startDate: "",
		startTime: "",
		recurrence: "none",
		recurrenceInterval: 1,
		recurrenceDays: []
	});

	// Load from localStorage
	useEffect(() => {
		const savedItems = localStorage.getItem("calendarItems");
		const savedTypes = localStorage.getItem("eventTypes");
		const savedCompletions = localStorage.getItem("completions");
		const savedSettings = localStorage.getItem("calendarSettings");
		const savedSound = localStorage.getItem("soundEnabled");

		if (savedItems) setItems(JSON.parse(savedItems));
		if (savedTypes) setEventTypes(JSON.parse(savedTypes));
		if (savedCompletions) setCompletions(JSON.parse(savedCompletions));
		if (savedSettings) setSettings(JSON.parse(savedSettings));
		if (savedSound) setSoundEnabled(JSON.parse(savedSound));
	}, []);

	// Save to localStorage
	useEffect(() => {
		localStorage.setItem("calendarItems", JSON.stringify(items));
	}, [items]);

	useEffect(() => {
		localStorage.setItem("eventTypes", JSON.stringify(eventTypes));
	}, [eventTypes]);

	useEffect(() => {
		localStorage.setItem("completions", JSON.stringify(completions));
	}, [completions]);

	useEffect(() => {
		localStorage.setItem("calendarSettings", JSON.stringify(settings));
	}, [settings]);

	useEffect(() => {
		localStorage.setItem("soundEnabled", JSON.stringify(soundEnabled));
	}, [soundEnabled]);

	// Play sound
	const playSound = () => {
		if (!soundEnabled) return;
		const audio = new Audio(
			"data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBCuBzvLZiTUIGmm98OScTgwOUKjk8bllHAU2kdny0HssBS16yPLaizsKEl+16+uoVRQKRp/h8r5sIQQrgc/y2Yk1CBppvfDknE4MDlCo5PG5ZRwFN5HZ8tB7LAUtesjy2os7ChJftevrqFUUCkaf4fK+bCEEK4HP8tmJNQgaaL3w5JxODA5QqOTxuWUcBTeR2fLQeywFLXrI8tqLOwoSX7Xr66hVFApGn+HyvmwhBCuBz/LZiTUIGmi98OScTgwOUKjk8bllHAU3kdny0HssBS16yPLaizsKEl+16+uoVRQKRp/h8r5sIQQrgc/y2Yk1CBpovfDknE4MDlCo5PG5ZRwFN5HZ8tB7LAUtesjy2os7ChJftevrqFUUCkaf4fK+bCEEK4HP8tmJNQgaaL3w5JxODA5QqOTxuWUcBTeR2fLQeywFLXrI8tqLOwoSX7Xr66hVFApGn+HyvmwhBCuBz/LZiTUIGmi98OScTgwOUKjk8bllHAU3kdny0HssBS16yPLaizsK"
		);
		audio.play().catch(() => { });
	};

	// Helpers
	const monthNames = useMemo(
		() => [
			t("january"),
			t("february"),
			t("march"),
			t("april"),
			t("may"),
			t("june"),
			t("july"),
			t("august"),
			t("september"),
			t("october"),
			t("november"),
			t("december")
		],
		[t]
	);

	const dayNames = useMemo(
		() => [t("sunday"), t("monday"), t("tuesday"), t("wednesday"), t("thursday"), t("friday"), t("saturday")],
		[t]
	);

	const getWeekNumber = (date) => {
		const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
		const dayNum = d.getUTCDay() || 7;
		d.setUTCDate(d.getUTCDate() + 4 - dayNum);
		const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
		return Math.ceil((((+d - +yearStart) / 86400000) + 1) / 7);
	};

	const getDateString = (date) => date.toISOString().split("T")[0];

	// Force 24h display
	const formatTime = (timeStr) => {
		if (!timeStr) return "";

		// if already HH:mm
		const m24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
		if (m24) {
			let h = parseInt(m24[1], 10);
			const min = m24[2];
			const ampm = h >= 12 ? "PM" : "AM";
			h = h % 12;
			if (h === 0) h = 12;
			return `${h}:${min} ${ampm}`;
		}

		// if "h:mm AM/PM" already
		const m12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
		if (m12) return `${parseInt(m12[1], 10)}:${m12[2]} ${m12[3].toUpperCase()}`;

		return timeStr;
	};

	const isWeekend = (date) => settings.weekendDays.includes(date.getDay());

	const getCompletionKey = (itemId, date) => `${itemId}_${getDateString(date)}`;
	const isItemCompleted = (itemId, date) => completions[getCompletionKey(itemId, date)] || false;

	const toggleCompletion = (itemId, date) => {
		const key = getCompletionKey(itemId, date);
		setCompletions((prev) => ({ ...prev, [key]: !prev[key] }));
		playSound();
	};

	const getItemsForDate = (date) => {
		const dateStr = getDateString(date);

		return items.filter((item) => {
			if (item.recurrence === "none") return item.startDate === dateStr;

			const startDate = new Date(item.startDate);
			if (date < startDate) return false;

			const diffDays = Math.floor((+date - +startDate) / (1000 * 60 * 60 * 24));

			switch (item.recurrence) {
				case "daily":
					return diffDays % item.recurrenceInterval === 0;
				case "weekly":
					return diffDays % (7 * item.recurrenceInterval) === 0;
				case "monthly":
					return (
						date.getDate() === startDate.getDate() &&
						(date.getMonth() - startDate.getMonth() + 12 * (date.getFullYear() - startDate.getFullYear())) %
						item.recurrenceInterval ===
						0
					);
				case "custom":
					return item.recurrenceDays.includes(date.getDay()) && diffDays >= 0;
				case "every_x_days":
					return diffDays % item.recurrenceInterval === 0;
				default:
					return false;
			}
		});
	};

	const getItemCountByType = (typeId) => {
		if (typeId === "all") return items.length;
		return items.filter((item) => item.type === typeId).length;
	};

	const getProgressForDate = (date) => {
		const itemsForDate = getItemsForDate(date);
		if (itemsForDate.length === 0) return { completed: 0, total: 0, percentage: 0 };

		const completed = itemsForDate.filter((it) => isItemCompleted(it.id, date)).length;
		return { completed, total: itemsForDate.length, percentage: Math.round((completed / itemsForDate.length) * 100) };
	};

	const getTypeLabel = (type) => {
		if (!type) return t("types.all");
		if (type.custom) return type.name || "";
		return type.nameKey ? t(type.nameKey) : (type.name || "");
	};

	// CRUD
	const resetItemForm = () => {
		setItemForm({
			id: "",
			title: "",
			type: "task",
			startDate: "",
			startTime: "",
			recurrence: "none",
			recurrenceInterval: 1,
			recurrenceDays: []
		});
		setEditingItem(null);
	};

	const handleSaveItem = () => {
		if (!itemForm.title || !itemForm.startDate) return;

		if (editingItem) {
			setItems((prev) => prev.map((it) => (it.id === editingItem.id ? { ...itemForm, id: editingItem.id } : it)));
		} else {
			setItems((prev) => [...prev, { ...itemForm, id: Date.now().toString() }]);
		}

		setShowAddPopover(false);
		setEditingPopoverId(null);
		resetItemForm();
		playSound();
	};

	const openEditPopover = (item) => {
		setEditingItem(item);
		setItemForm(item);
		setEditingPopoverId(item.id);
	};

	const handleDeleteItem = (item) => {
		if (settings.confirmBeforeDelete) {
			setItemToDelete(item);
			setShowDeleteConfirm(true);
		} else {
			confirmDelete(item);
		}
	};

	const confirmDelete = (item = itemToDelete) => {
		if (!item) return;
		setItems((prev) => prev.filter((i) => i.id !== item.id));
		setShowDeleteConfirm(false);
		setItemToDelete(null);
		playSound();
	};

	const handleAddType = () => {
		if (!newTypeName.trim()) return;

		const selectedColor = COLOR_OPTIONS.find((c) => c.value === newTypeColor);
		const newType = {
			id: `custom_${Date.now()}`,
			name: newTypeName,
			color: newTypeColor,
			textColor: selectedColor?.text || "text-gray-700",
			border: selectedColor?.border || "border-gray-200",
			ring: selectedColor?.ring || "ring-gray-500",
			icon: newTypeIcon,
			custom: true
		};

		setEventTypes((prev) => [...prev, newType]);
		setNewTypeName("");
		setNewTypeColor(COLOR_OPTIONS[5].value);
		setNewTypeIcon("Target");
		setShowAddTypeDrawer(false);
		playSound();
	};

	const handleDeleteType = (typeId) => {
		const type = eventTypes.find((tt) => tt.id === typeId);
		if (type && type.custom) {
			setEventTypes((prev) => prev.filter((tt) => tt.id !== typeId));
			setItems((prev) => prev.filter((it) => it.type !== typeId));
			playSound();
		}
	};

	// Render icon
	const renderIcon = (iconName, className = "h-4 w-4") => {
		const IconComponent = (iconName && ICON_COMPONENTS[iconName]) || CalendarIcon;
		return <IconComponent className={className} />;
	};

	const adjustedDayNames = useMemo(() => {
		const arr = [];
		for (let i = 0; i < 7; i++) arr.push(dayNames[(i + settings.startOfWeek) % 7]);
		return arr;
	}, [dayNames, settings.startOfWeek]);

	// Shared form content (used for Add New + Edit beside item)
	const ItemFormContent = ({ onClose }) => (
		<div className="p-6 space-y-4">
			<div className="flex items-center justify-between border-b pb-3">
				<h3 className="text-lg font-bold text-gray-900">{editingItem ? t("editItem") : t("addNewItem")}</h3>
				<Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
					<X className="h-4 w-4" />
				</Button>
			</div>

			<div className="space-y-4">
				<div className="space-y-2">
					<Label>{t("title")}</Label>
					<Input
						value={itemForm.title}
						onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
						placeholder={t("enterTitle")}
						className="border-2 focus:ring-2"
					/>
				</div>

				<div className="grid grid-cols-2 gap-3">
					<div className="space-y-2">
						<Label>{t("type")}</Label>
						<Select value={itemForm.type} onValueChange={(value) => setItemForm({ ...itemForm, type: value })}>
							<SelectTrigger className="border-2">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{eventTypes.filter((tt) => tt.id !== "all").map((type) => (
									<SelectItem key={type.id} value={type.id}>
										<div className="flex items-center gap-2">
											{renderIcon(type.icon, "h-4 w-4")}
											{getTypeLabel(type)}
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label>{t("recurrence")}</Label>
						<Select
							value={itemForm.recurrence}
							onValueChange={(value) => setItemForm({ ...itemForm, recurrence: value })}
						>
							<SelectTrigger className="border-2">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">{t("none")}</SelectItem>
								<SelectItem value="daily">{t("daily")}</SelectItem>
								<SelectItem value="weekly">{t("weekly")}</SelectItem>
								<SelectItem value="monthly">{t("monthly")}</SelectItem>
								<SelectItem value="every_x_days">{t("everyXDays")}</SelectItem>
								<SelectItem value="custom">{t("custom")}</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				{itemForm.recurrence === "every_x_days" && (
					<div className="space-y-2">
						<Label>{t("repeatEveryDays")}</Label>
						<Input
							type="number"
							min="1"
							value={itemForm.recurrenceInterval}
							onChange={(e) => setItemForm({ ...itemForm, recurrenceInterval: parseInt(e.target.value) || 1 })}
							placeholder="3"
							className="border-2"
						/>
					</div>
				)}

				<div className="grid grid-cols-2 gap-3">
					<div className="space-y-2">
						<Label>{t("startDate")}</Label>
						<Input
							type="date"
							value={itemForm.startDate}
							onChange={(e) => setItemForm({ ...itemForm, startDate: e.target.value })}
							className="border-2"
						/>
					</div>

					<div className="space-y-2">
						<Label>
							{t("startTime")} ({t("optional")})
						</Label>
						<Input
							type="time"
							value={itemForm.startTime || ""}
							onChange={(e) => setItemForm({ ...itemForm, startTime: e.target.value })}
							className="border-2"
						/>
					</div>
				</div>

				{itemForm.recurrence === "custom" && (
					<div className="space-y-2">
						<Label>{t("selectDays")}</Label>
						<div className="flex gap-2 flex-wrap">
							{dayNames.map((day, idx) => (
								<Button
									key={idx}
									type="button"
									variant={itemForm.recurrenceDays.includes(idx) ? "default" : "outline"}
									size="sm"
									onClick={() => {
										const days = itemForm.recurrenceDays.includes(idx)
											? itemForm.recurrenceDays.filter((d) => d !== idx)
											: [...itemForm.recurrenceDays, idx];
										setItemForm({ ...itemForm, recurrenceDays: days });
									}}
								>
									{day.slice(0, 3)}
								</Button>
							))}
						</div>
					</div>
				)}
			</div>

			<div className="flex gap-2 pt-3 border-t">
				<Button variant="outline" onClick={onClose} className="flex-1">
					{t("cancel")}
				</Button>
				<Button
					onClick={handleSaveItem}
					disabled={!itemForm.title || !itemForm.startDate}
					className="flex-1"
					style={{
						background: !itemForm.title || !itemForm.startDate ? undefined : `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`
					}}
				>
					{editingItem ? t("save") : t("add")}
				</Button>
			</div>
		</div>
	);

	// Month view (ONLY current month weeks; pad only to end of last week)
	const renderMonthView = () => {
		const year = currentDate.getFullYear();
		const month = currentDate.getMonth();

		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);

		const startingDayOfWeek = (firstDay.getDay() - settings.startOfWeek + 7) % 7;
		const daysInMonth = lastDay.getDate();

		const days = [];

		// leading empty
		for (let i = 0; i < startingDayOfWeek; i++) days.push({ date: null });

		// month days
		for (let i = 1; i <= daysInMonth; i++) days.push({ date: new Date(year, month, i) });

		// trailing empty ONLY to complete last week (not 42 cells)
		const tail = (7 - (days.length % 7)) % 7;
		for (let i = 0; i < tail; i++) days.push({ date: null });

		const weeks = [];
		for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

		return (
			<div className="space-y-0">
				{/* Day names */}
				<div className={cn("grid border-b border-gray-200", settings.showWeekNumbers ? "grid-cols-8" : "grid-cols-7")}>
					{settings.showWeekNumbers && (
						<div className="bg-gray-50 text-center text-xs font-bold text-gray-500 py-4 border-r border-gray-200">
							{t("week")}
						</div>
					)}

					{adjustedDayNames.map((day, idx) => (
						<div
							key={idx}
							className={cn(
								"bg-gray-50 text-center text-sm font-bold py-4 text-gray-700 border-r border-gray-200",
								idx === 6 && "border-r-0"
							)}
						>
							{day}
						</div>
					))}
				</div>

				{/* Grid */}
				<div className="border border-gray-200 border-t-0">
					{weeks.map((week, weekIdx) => (
						<div
							key={weekIdx}
							className={cn(
								"grid",
								settings.showWeekNumbers ? "grid-cols-8" : "grid-cols-7",
								weekIdx < weeks.length - 1 && "border-b border-gray-200"
							)}
						>
							{settings.showWeekNumbers && (
								<div className="bg-gray-50 flex items-center justify-center text-xs text-gray-500 font-bold border-r border-gray-200">
									{week[0].date && getWeekNumber(week[0].date)}
								</div>
							)}

							{week.map(({ date }, dayIdx) => {
								// empty cell
								if (!date) {
									return (
										<div
											key={dayIdx}
											className={cn("bg-gray-50/30 min-h-[160px] border-r border-gray-200", dayIdx === 6 && "border-r-0")}
										/>
									);
								}

								const dateStr = getDateString(date);
								const itemsForDate = getItemsForDate(date);
								const filteredItems =
									selectedType === "all" ? itemsForDate : itemsForDate.filter((it) => it.type === selectedType);

								const today = new Date();
								today.setHours(0, 0, 0, 0);
								const isToday = dateStr === getDateString(today);
								const isSelected = selectedDate && dateStr === getDateString(selectedDate);
								const progress = getProgressForDate(date);
								const isWeekendDay = isWeekend(date);

								return (
									<div
										key={dayIdx}
										className={cn(
											"bg-white min-h-[160px] p-3 cursor-pointer transition-all hover:bg-gray-50 group relative border-r border-gray-200",
											dayIdx === 6 && "border-r-0",
											isToday && "ring-2 ring-inset shadow-md",
											isSelected && "ring-2 ring-inset shadow-md",
											isWeekendDay && settings.highlightWeekend && !isToday && !isSelected && "bg-gradient-to-br from-rose-50/30 to-pink-50/30"
										)}
										style={{
											...(isToday && {
												ringColor: `var(--color-primary-500)`,
												background: `linear-gradient(135deg, var(--color-primary-50) 0%, white 100%)`
											}),
											...(isSelected && {
												ringColor: `var(--color-secondary-500)`,
												background: `linear-gradient(135deg, var(--color-secondary-50) 0%, white 100%)`
											})
										}}
										onClick={() => {
											setSelectedDate(date);
											setShowDaySlidePanel(true);
										}}
									>
										{/* header */}
										<div className="flex items-start justify-between mb-2">
											<div
												className={cn(
													"text-base font-bold transition-all",
													isToday && "rounded-full w-8 h-8 flex items-center justify-center text-white shadow-md text-sm"
												)}
												style={
													isToday
														? { background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))` }
														: {}
												}
											>
												{date.getDate()}
											</div>

											{progress.total > 0 && (
												<div className="relative w-9 h-9">
													<svg className="w-9 h-9 transform -rotate-90">
														<circle cx="18" cy="18" r="15" stroke="currentColor" strokeWidth="2.5" fill="none" className="text-gray-200" />
														<circle
															cx="18"
															cy="18"
															r="15"
															stroke="currentColor"
															strokeWidth="2.5"
															fill="none"
															strokeDasharray={`${2 * Math.PI * 15}`}
															strokeDashoffset={`${2 * Math.PI * 15 * (1 - progress.percentage / 100)}`}
															className="transition-all duration-500"
															strokeLinecap="round"
															style={{ color: `var(--color-gradient-from)` }}
														/>
													</svg>
													<div className="absolute inset-0 flex items-center justify-center">
														<span className="text-[9px] font-bold text-gray-700">
															{progress.completed}/{progress.total}
														</span>
													</div>
												</div>
											)}
										</div>

										{/* items */}
										<div className="space-y-1.5">
											{filteredItems.slice(0, 2).map((item) => {
												const type = eventTypes.find((tt) => tt.id === item.type);
												const isCompleted = isItemCompleted(item.id, date);

												return (
													<div
														key={item.id}
														className={cn(
															"text-xs p-2 rounded-md flex items-center gap-1.5 transition-all border-l-2 shadow-sm hover:shadow-md group/item relative overflow-hidden",
															type?.color || "bg-gray-50",
															type?.border,
															isCompleted && "opacity-50"
														)}
														onClick={(e) => e.stopPropagation()}
													>
														<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity" />

														<Button
															variant="ghost"
															size="icon"
															className="h-3.5 w-3.5 p-0 hover:bg-transparent z-10 flex-shrink-0"
															onClick={(e) => {
																e.stopPropagation();
																toggleCompletion(item.id, date);
															}}
														>
															{isCompleted ? (
																<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
															) : (
																<Circle className="h-3.5 w-3.5 text-gray-400" />
															)}
														</Button>

														{renderIcon(type?.icon, "h-3 w-3 flex-shrink-0 z-10")}

														<span
															className={cn(
																"flex-1 font-medium text-[11px] z-10 leading-tight line-clamp-1",
																type?.textColor,
																isCompleted && "line-through"
															)}
														>
															{item.title}
														</span>

														{/* Edit beside item */}
														<div className="opacity-0 group-hover/item:opacity-100 transition-opacity flex gap-0.5 z-10 flex-shrink-0">
															<Popover
																open={editingPopoverId === item.id}
																onOpenChange={(open) => {
																	if (!open) {
																		setEditingPopoverId(null);
																		setEditingItem(null);
																	}
																}}
															>
																<PopoverTrigger asChild>
																	<Button
																		variant="ghost"
																		size="icon"
																		className="h-4 w-4 hover:bg-white/80 rounded-sm"
																		onClick={(e) => {
																			e.stopPropagation();
																			openEditPopover(item);
																		}}
																	>
																		<Pencil className="h-2.5 w-2.5" />
																	</Button>
																</PopoverTrigger>
																<PopoverContent
																	className="w-96 p-0"
																	side={isRTL ? "left" : "right"}
																	align="start"
																	sideOffset={10}
																	onOpenAutoFocus={(e) => e.preventDefault()}
																>
																	<ItemFormContent
																		onClose={() => {
																			setEditingPopoverId(null);
																			setEditingItem(null);
																		}}
																	/>
																</PopoverContent>
															</Popover>

															<Button
																variant="ghost"
																size="icon"
																className="h-4 w-4 text-red-600 hover:bg-red-100 rounded-sm"
																onClick={(e) => {
																	e.stopPropagation();
																	handleDeleteItem(item);
																}}
															>
																<Trash2 className="h-2.5 w-2.5" />
															</Button>
														</div>
													</div>
												);
											})}

											{filteredItems.length > 2 && (
												<div className="text-[10px] text-gray-600 text-center py-1 bg-gradient-to-r from-gray-100 to-gray-50 rounded-md font-medium shadow-sm border border-gray-200">
													+{filteredItems.length - 2} {t("more")}
												</div>
											)}
										</div>
									</div>
								);
							})}
						</div>
					))}
				</div>
			</div>
		);
	};

	// Icon options (localized labels)
	const ICON_OPTIONS = useMemo(
		() => [
			{ value: "Target", label: t("icons.target"), Icon: Target },
			{ value: "CheckSquare", label: t("icons.check"), Icon: CheckSquare },
			{ value: "DollarSign", label: t("icons.money"), Icon: DollarSign },
			{ value: "Bell", label: t("icons.bell"), Icon: Bell },
			{ value: "Star", label: t("icons.star"), Icon: Star },
			{ value: "Book", label: t("icons.book"), Icon: Book },
			{ value: "Phone", label: t("icons.phone"), Icon: Phone },
			{ value: "Music", label: t("icons.music"), Icon: Music },
			{ value: "Heart", label: t("icons.health"), Icon: Heart },
			{ value: "Mail", label: t("icons.email"), Icon: Mail },
			{ value: "ShoppingCart", label: t("icons.shopping"), Icon: ShoppingCart },
			{ value: "Dumbbell", label: t("icons.fitness"), Icon: Dumbbell },
			{ value: "Lightbulb", label: t("icons.ideas"), Icon: Lightbulb },
			{ value: "Flame", label: t("icons.important"), Icon: Flame }
		],
		[t]
	);

	const selectedTypeObj = eventTypes.find((tt) => tt.id === selectedType);

	return (
		<div dir={isRTL ? "rtl" : "ltr"}>
			{(showAddTypeDrawer || showDaySlidePanel) && (
				<div
					className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-all"
					onClick={() => {
						setShowAddTypeDrawer(false);
						setShowDaySlidePanel(false);
						setEditingPopoverId(null);
						setEditingItem(null);
					}}
				/>
			)}

			<div className="flex flex-col w-[calc(100%+40px)] relative rtl:left-[20px] ltr:right-[20px] mt-[-20px]">
				{/* Top Bar */}
				<div className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-6 py-4 flex items-center justify-between shadow-sm">
					<div className="flex items-center gap-4">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
							className="hover:bg-white/50 rounded-full shadow-sm"
						>
							{isRTL ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
						</Button>

						<div>
							<h2
								className="text-3xl font-bold bg-clip-text text-transparent"
								style={{ backgroundImage: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))` }}
							>
								{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
							</h2>
							<p className="text-sm text-gray-500 font-medium">
								{t("viewing")} {selectedType === "all" ? t("allItems") : getTypeLabel(selectedTypeObj)}
							</p>
						</div>

						<Button
							variant="ghost"
							size="icon"
							onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
							className="hover:bg-white/50 rounded-full shadow-sm"
						>
							{isRTL ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
						</Button>
					</div>
					<CountdownTimer />

					<div className="flex items-center gap-2">
						<Popover>
							<PopoverTrigger asChild>
								<Button variant="outline" className="flex items-center gap-2 bg-white shadow-sm hover:shadow-md transition-all border-gray-200">
									{renderIcon(selectedTypeObj?.icon || "LayoutGrid", "h-4 w-4")}
									<span className="font-medium font-en">{getTypeLabel(selectedTypeObj)}</span>
									<ChevronDown className="h-4 w-4 text-gray-400" />
								</Button>
							</PopoverTrigger>

							<PopoverContent className="w-64 p-2" align="end">
								<div className="space-y-1">
									{eventTypes.map((type) => (
										<Button
											key={type.id}
											variant="ghost"
											className={cn("w-full justify-start gap-3", selectedType === type.id && "bg-gray-100")}
											onClick={() => setSelectedType(type.id)}
										>
											{renderIcon(type.icon, "h-4 w-4")}
											<span className="flex-1 text-left font-en">{getTypeLabel(type)}</span>
											<span className="font-en text-xs bg-gray-200 px-2 py-0.5 rounded-full font-semibold">{getItemCountByType(type.id)}</span>
										</Button>
									))}

									<div className="border-t pt-2 mt-2">
										<Button variant="ghost" className="w-full justify-start gap-2 text-blue-600" onClick={() => setShowAddTypeDrawer(true)}>
											<Plus className="h-4 w-4" />
											{t("addNewType")}
										</Button>
									</div>
								</div>
							</PopoverContent>
						</Popover>

						{/* Actions */}
						<div className="flex items-center gap-2">
							{/* Add new item popover (top bar) */}
							<Popover
								open={showAddPopover}
								onOpenChange={(open) => {
									setShowAddPopover(open);
									if (open) {
										setEditingItem(null);
										setEditingPopoverId(null);
										resetItemForm();
									}
								}}
							>
								<PopoverTrigger asChild>
									<Button
										className="shadow-lg hover:shadow-xl transition-all"
										style={{ background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))` }}
										onClick={() => {
											setEditingItem(null);
											setEditingPopoverId(null);
											resetItemForm();
										}}
									>
										<Plus className="h-4 w-4 mr-2" />
										{t("addNew")}
									</Button>
								</PopoverTrigger>

								<PopoverContent className="w-96 p-0 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2" align="end" sideOffset={5}>
									<ItemFormContent onClose={() => setShowAddPopover(false)} />
								</PopoverContent>
							</Popover>

							<Button
								variant="outline"
								size="icon"
								onClick={() => setSoundEnabled(!soundEnabled)}
								className={cn("transition-colors shadow-sm", soundEnabled && "bg-emerald-50 text-emerald-600 border-emerald-200")}
							>
								{soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
							</Button>

							<Button variant="outline" size="icon" onClick={() => setShowSettingsDialog(true)} className="shadow-sm">
								<Settings className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</div>



				{/* Add Type Drawer */}
				<div
					className={cn(
						"bg-white transition-all duration-300 w-96 flex flex-col fixed top-0 bottom-0 z-50 shadow-2xl",
						isRTL ? "border-r right-0" : "border-l left-0",
						showAddTypeDrawer ? "translate-x-0" : isRTL ? "translate-x-full" : "-translate-x-full"
					)}
				>
					<div className="p-6 border-b border-gray-200">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-xl font-bold text-gray-900">{t("manageTypes")}</h2>
							<Button variant="ghost" size="icon" onClick={() => setShowAddTypeDrawer(false)}>
								<X className="h-5 w-5" />
							</Button>
						</div>
					</div>

					<div className="flex-1 overflow-y-auto p-6">
						<div className="space-y-2 mb-6">
							<h3 className="text-sm font-semibold text-gray-700 mb-3">{t("allTypes")}</h3>

							{eventTypes.map((type) => (
								<div key={type.id} className="flex items-center gap-2 group">
									<Button
										variant="ghost"
										className={cn("flex-1 justify-start", selectedType === type.id && "bg-gray-100")}
										onClick={() => {
											setSelectedType(type.id);
											setShowAddTypeDrawer(false);
										}}
									>
										{renderIcon(type.icon, "h-4 w-4 mr-2")}
										<span className="flex-1 text-left font-en">{getTypeLabel(type)}</span>
										<span className="font-en text-xs bg-gray-100 px-2 py-0.5 rounded-full">{getItemCountByType(type.id)}</span>
									</Button>

									{type.custom && (
										<Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteType(type.id)}>
											<Trash2 className="h-4 w-4 text-red-500" />
										</Button>
									)}
								</div>
							))}
						</div>

						{/* Add New Type Form */}
						<Card className="p-4 space-y-1 border-1 shadow-inner border-dashed border-gray-300">
							<h3 className="text-sm font-semibold text-gray-700">{t("createNewType")}</h3>

							<Input placeholder={t("typeName")} value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} />

							{/* Icon Selection */}
							<div>
								<Label className="text-xs mb-2 block">{t("selectIcon")}</Label>
								<div className="grid grid-cols-7 gap-2">
									{ICON_OPTIONS.map((iconOption) => (
										<button
											key={iconOption.value}
											type="button"
											onClick={() => setNewTypeIcon(iconOption.value)}
											className={cn("p-2 rounded hover:bg-gray-100 transition-colors flex items-center justify-center", newTypeIcon === iconOption.value && "bg-blue-100 ring-2 ring-blue-500")}
											aria-label={iconOption.label}
											title={iconOption.label}
										>
											<iconOption.Icon className="h-5 w-5" />
										</button>
									))}
								</div>
							</div>

							{/* Color Selection */}
							<div>
								<Label className="text-xs mb-2 block">{t("selectColor")}</Label>
								<div className="grid grid-cols-6 gap-2">
									{COLOR_OPTIONS.map((color) => (
										<button
											key={color.value}
											type="button"
											onClick={() => setNewTypeColor(color.value)}
											className={cn("w-10 h-10 rounded-full transition-all", color.value, newTypeColor === color.value && "ring-2 ring-offset-2 ring-gray-900 scale-110")}
											aria-label={t(color.nameKey)}
											title={t(color.nameKey)}
										/>
									))}
								</div>
							</div>

							<Button
								onClick={handleAddType}
								className="w-full"
								disabled={!newTypeName.trim()}
								style={{
									background: !newTypeName.trim() ? undefined : `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`
								}}
							>
								<Check className="h-4 w-4 mr-2" />
								{t("add")}
							</Button>
						</Card>
					</div>
				</div>

				{/* Day Slide Panel */}
				<div
					className={cn(
						"bg-gradient-to-b from-white to-gray-50 transition-all duration-300 w-[550px] flex flex-col fixed top-0 bottom-0 z-50 shadow-2xl border-l-2",
						isRTL ? "border-r-2 border-l-0 left-0" : "right-0",
						showDaySlidePanel ? "translate-x-0" : isRTL ? "-translate-x-full" : "translate-x-full"
					)}
					style={{ borderColor: `var(--color-primary-200)` }}
				>
					{selectedDate && (
						<>
							{/* Header */}
							<div className="relative p-8 pb-6 overflow-hidden" style={{ background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))` }}>
								<div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
								<div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24 blur-2xl" />

								<div className="relative z-10">
									<div className="flex items-start justify-between mb-6">
										<div className="flex items-center gap-4">
											<div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
												<h2 className="text-5xl font-bold text-white">{selectedDate.getDate()}</h2>
											</div>
											<div>
												<p className="text-white/90 text-sm font-medium mb-1">{dayNames[selectedDate.getDay()]}</p>
												<p className="text-white text-lg font-bold">
													{monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
												</p>
											</div>
										</div>

										<Button variant="ghost" size="icon" onClick={() => setShowDaySlidePanel(false)} className="rounded-full hover:bg-white/20 text-white h-10 w-10">
											<X className="h-5 w-5" />
										</Button>
									</div>

									{/* Progress */}
									{(() => {
										const progress = getProgressForDate(selectedDate);
										if (progress.total <= 0) return null;

										return (
											<div className="bg-white/75 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-white/20">
												<div className="flex items-center gap-4">
													<div className="relative w-16 h-16 flex-shrink-0">
														<svg className="w-16 h-16 transform -rotate-90">
															<circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="5" fill="none" className="text-gray-200" />
															<circle
																cx="32"
																cy="32"
																r="28"
																stroke="currentColor"
																strokeWidth="5"
																fill="none"
																strokeDasharray={`${2 * Math.PI * 28}`}
																strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress.percentage / 100)}`}
																className="transition-all duration-500"
																strokeLinecap="round"
																style={{ color: `var(--color-gradient-from)`, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))" }}
															/>
														</svg>
														<div className="absolute inset-0 flex items-center justify-center">
															<span className="text-lg font-bold bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))` }}>
																{progress.percentage}%
															</span>
														</div>
													</div>

													<div className="flex-1">
														<div className="flex items-center justify-between mb-2">
															<span className="text-sm font-semibold text-gray-700">{t("progress")}</span>
															<span
																className="text-sm font-bold px-3 py-1 rounded-full"
																style={{ background: `linear-gradient(135deg, var(--color-primary-100), var(--color-primary-200))`, color: `var(--color-primary-700)` }}
															>
																{progress.completed}/{progress.total}
															</span>
														</div>

														<div className="text-xs text-gray-600 font-medium">
															{progress.completed === progress.total ? t("allCompleted") : t("remainingCount", { count: progress.total - progress.completed })}
														</div>
													</div>
												</div>
											</div>
										);
									})()}
								</div>
							</div>

							{/* Items list */}
							<div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
								{(() => {
									const itemsForDate = getItemsForDate(selectedDate);
									const filtered = selectedType === "all" ? itemsForDate : itemsForDate.filter((it) => it.type === selectedType);

									if (filtered.length === 0) {
										return (
											<div className="flex items-center justify-center h-full py-12">
												<div className="text-center max-w-md px-6">
													<div className="relative inline-block mb-8">
														<div className="absolute inset-0 animate-pulse">
															<div
																className="w-32 h-32 mx-auto rounded-full opacity-20 blur-3xl"
																style={{ background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))` }}
															/>
														</div>

														<div
															className="relative w-32 h-32 mx-auto rounded-3xl flex items-center justify-center"
															style={{ background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))` }}
														>
															<CalendarIcon className="h-16 w-16 text-white drop-shadow-lg" />
														</div>
													</div>

													<h3 className="text-2xl font-bold mb-3 bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))` }}>
														{t("noTasksTitle")}
													</h3>
													<p className="text-gray-600 mb-8 text-sm leading-relaxed">{t("noTasksDesc")}</p>

													<Button
														size="lg"
														className="shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 font-semibold px-8"
														onClick={() => {
															resetItemForm();
															setItemForm((prev) => ({ ...prev, startDate: getDateString(selectedDate) }));
															setShowAddPopover(true);
														}}
														style={{ background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))` }}
													>
														<Plus className="h-5 w-5 mr-2" />
														{t("createFirstTask")}
													</Button>
												</div>
											</div>
										);
									}

									return (
										<div className="space-y-3">
											{filtered.map((item, index) => {
												const type = eventTypes.find((tt) => tt.id === item.type);
												const isCompleted = isItemCompleted(item.id, selectedDate);

												const recurrenceLabel =
													item.recurrence === "none"
														? ""
														: item.recurrence === "every_x_days"
															? t("everyXDaysLabel", { count: item.recurrenceInterval })
															: t(`recurrenceLabels.${item.recurrence}`);

												return (
													<div
														key={item.id}
														className={cn("group relative overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-lg hover:scale-[1.02]", isCompleted && "opacity-60")}
														style={{ animation: `slideIn 0.4s ease-out ${index * 0.08}s both` }}
													>
														<div className={cn("absolute inset-0", type?.color)} />

														<div className="relative p-4">
															<div className="flex items-center gap-3">
																<button onClick={() => toggleCompletion(item.id, selectedDate)} className="flex-shrink-0 transition-transform hover:scale-110">
																	{isCompleted ? (
																		<div className="relative">
																			<CheckCircle2 className="h-7 w-7 text-emerald-600" />
																			<div className="absolute inset-0 bg-emerald-400/30 rounded-full blur-md" />
																		</div>
																	) : (
																		<div className={cn("h-7 w-7 rounded-full border-3 transition-colors", "border-gray-300 hover:border-gray-400")} />
																	)}
																</button>

																<div className="flex-1 flex items-center gap-3 min-w-0">
																	<div className={cn("p-2.5 rounded-xl shadow-sm flex-shrink-0", type?.color, "ring-1 ring-black/5")}>
																		{renderIcon(type?.icon, cn("h-4 w-4", type?.textColor))}
																	</div>

																	<div className="flex-1 min-w-0">
																		<h4 className={cn("font-bold text-base mb-1.5", type?.textColor, isCompleted && "line-through opacity-60")}>{item.title}</h4>

																		{(item.startTime || item.recurrence !== "none") && (
																			<div className="flex items-center gap-2 flex-wrap">
																				{item.startTime && (
																					<div className="font-en inline-flex items-center gap-1 text-xs font-semibold bg-white/60 backdrop-blur-sm px-2 py-1 rounded-md">
																						<Clock className="h-3 w-3" />
																						{formatTime(item.startTime)}
																					</div>
																				)}

																				{item.recurrence !== "none" && (
																					<div className=" inline-flex items-center gap-1 text-xs font-semibold bg-white/60 backdrop-blur-sm px-2 py-1 rounded-md">
																						<Repeat className="h-3 w-3" />
																						{recurrenceLabel}
																					</div>
																				)}
																			</div>
																		)}
																	</div>
																</div>

																{/* Actions (edit beside item) */}
																<div className="flex items-center gap-1">
																	<Popover
																		open={editingPopoverId === item.id}
																		onOpenChange={(open) => {
																			if (!open) {
																				setEditingPopoverId(null);
																				setEditingItem(null);
																			}
																		}}
																	>
																		<PopoverTrigger asChild>
																			<Button
																				variant="ghost"
																				size="icon"
																				className="h-8 w-8 rounded-lg bg-white/80 hover:bg-white shadow-sm"
																				onClick={() => openEditPopover(item)}
																			>
																				<Pencil className="h-3.5 w-3.5 text-blue-600" />
																			</Button>
																		</PopoverTrigger>

																		<PopoverContent
																			className="w-96 p-0"
																			side={isRTL ? "left" : "right"}
																			align="start"
																			sideOffset={10}
																			onOpenAutoFocus={(e) => e.preventDefault()}
																		>
																			<ItemFormContent
																				onClose={() => {
																					setEditingPopoverId(null);
																					setEditingItem(null);
																				}}
																			/>
																		</PopoverContent>
																	</Popover>

																	<Button
																		variant="ghost"
																		size="icon"
																		className="h-8 w-8 rounded-lg bg-white/80 hover:bg-white shadow-sm"
																		onClick={() => handleDeleteItem(item)}
																	>
																		<Trash2 className="h-3.5 w-3.5 text-red-600" />
																	</Button>
																</div>
															</div>
														</div>

														<div
															className={cn("h-1 w-full", isCompleted ? "bg-emerald-400" : "bg-gradient-to-r", !isCompleted && type?.border)}
															style={!isCompleted ? { backgroundImage: `linear-gradient(90deg, var(--color-gradient-from), var(--color-gradient-to))` } : {}}
														/>
													</div>
												);
											})}
										</div>
									);
								})()}
							</div>
						</>
					)}
				</div>

				{/* Main Content */}
				<div className="flex-1 overflow-auto">
					<div className="mt-2">{renderMonthView()}</div>
				</div>
			</div>

			{/* Settings Dialog */}
			<Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
				<DialogContent className="max-w-md" dir={isRTL ? "rtl" : "ltr"}>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Settings className="h-5 w-5" />
							{t("settings")}
						</DialogTitle>
					</DialogHeader>

					<div className="space-y-6">
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label className="text-base">{t("showWeekNumbers")}</Label>
								<p className="text-sm text-gray-500">{t("showWeekNumbersDesc")}</p>
							</div>
							<Switch checked={settings.showWeekNumbers} onCheckedChange={(checked) => setSettings({ ...settings, showWeekNumbers: checked })} />
						</div>

						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label className="text-base">{t("highlightWeekend")}</Label>
								<p className="text-sm text-gray-500">{t("highlightWeekendDesc")}</p>
							</div>
							<Switch checked={settings.highlightWeekend} onCheckedChange={(checked) => setSettings({ ...settings, highlightWeekend: checked })} />
						</div>

						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label className="text-base">{t("confirmBeforeDelete")}</Label>
								<p className="text-sm text-gray-500">{t("confirmBeforeDeleteDesc")}</p>
							</div>
							<Switch checked={settings.confirmBeforeDelete} onCheckedChange={(checked) => setSettings({ ...settings, confirmBeforeDelete: checked })} />
						</div>

						<div className="space-y-2">
							<Label className="text-base">{t("startOfWeek")}</Label>
							<p className="text-sm text-gray-500 mb-2">{t("startOfWeekDesc")}</p>
							<Select value={settings.startOfWeek.toString()} onValueChange={(value) => setSettings({ ...settings, startOfWeek: parseInt(value) })}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="0">{t("sunday")}</SelectItem>
									<SelectItem value="1">{t("monday")}</SelectItem>
									<SelectItem value="6">{t("saturday")}</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<DialogFooter>
						<Button onClick={() => setShowSettingsDialog(false)} className="w-full">
							{t("close")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
				<DialogContent dir={isRTL ? "rtl" : "ltr"}>
					<DialogHeader>
						<DialogTitle>{t("confirmDelete")}</DialogTitle>
					</DialogHeader>

					<p className="text-gray-600">
						{t("areYouSureDelete")} "{itemToDelete?.title}"?
					</p>

					<DialogFooter>
						<Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
							{t("cancel")}
						</Button>
						<Button variant="destructive" onClick={() => confirmDelete()}>
							{t("delete")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}


function CountdownTimer() {
	const t = useTranslations("commitment");
	const locale = useLocale();
	const isRTL = locale === "ar";

	const [startTime, setStartTime] = useState(null);
	const [isRunning, setIsRunning] = useState(false);
	const [elapsed, setElapsed] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [selectedDate, setSelectedDate] = useState('');

	// Load saved state from localStorage
	useEffect(() => {
		const savedStart = localStorage.getItem('commitmentStartTime');
		const savedRunning = localStorage.getItem('commitmentIsRunning');

		if (savedStart) {
			setStartTime(parseInt(savedStart));
			setIsRunning(savedRunning === 'true');
		}
	}, []);

	// Initialize selected date to now
	useEffect(() => {
		const now = new Date();
		setSelectedDate(now.toISOString().slice(0, 16));
	}, []);

	// Save state to localStorage
	useEffect(() => {
		if (startTime) {
			localStorage.setItem('commitmentStartTime', startTime.toString());
		}
		localStorage.setItem('commitmentIsRunning', isRunning.toString());
	}, [startTime, isRunning]);

	useEffect(() => {
		if (!isRunning || !startTime) return;

		const interval = setInterval(() => {
			const now = new Date().getTime();
			const distance = now - startTime;

			setElapsed({
				days: Math.floor(distance / (1000 * 60 * 60 * 24)),
				hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
				minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
				seconds: Math.floor((distance % (1000 * 60)) / 1000)
			});
		}, 1000);

		return () => clearInterval(interval);
	}, [isRunning, startTime]);

	const handleStart = () => {
		setShowDatePicker(true);
	};

	const handleStartFromNow = () => {
		const now = new Date().getTime();
		setStartTime(now);
		setIsRunning(true);
		setShowDatePicker(false);
	};

	const handleStartFromDate = () => {
		if (!selectedDate) return;
		const chosenTime = new Date(selectedDate).getTime();
		setStartTime(chosenTime);
		setIsRunning(true);
		setShowDatePicker(false);
	};

	const handlePause = () => {
		setIsRunning(false);
	};

	const handleReset = () => {
		setStartTime(null);
		setIsRunning(false);
		setElapsed({ days: 0, hours: 0, minutes: 0, seconds: 0 });
		localStorage.removeItem('commitmentStartTime');
		localStorage.removeItem('commitmentIsRunning');
	};

	const formatTime = (num) => String(num).padStart(2, '0');

	// Calculate milestone achievements
	const getMilestone = () => {
		const totalMinutes = elapsed.days * 24 * 60 + elapsed.hours * 60 + elapsed.minutes;
		if (totalMinutes >= 60 * 24 * 30) return { icon: Trophy, text: t("milestone.month"), color: "from-yellow-400 to-orange-500" };
		if (totalMinutes >= 60 * 24 * 7) return { icon: Target, text: t("milestone.week"), color: "from-purple-400 to-pink-500" };
		if (totalMinutes >= 60 * 24) return { icon: Zap, text: t("milestone.day"), color: "from-blue-400 to-cyan-500" };
		return null;
	};

	const milestone = getMilestone();

	return (
		<div className="relative group" dir={isRTL ? "rtl" : "ltr"}>
			{/* Enhanced Glow Effect with Animation */}
			<div
				className="absolute inset-0 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity animate-pulse"
				style={{
					background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
					animationDuration: '3s'
				}}
			/>

			{/* Main Container */}
			<div
				className="relative rounded-2xl px-3 py-2 shadow-lg overflow-hidden"
				style={{
					background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`
				}}
			>
				{/* Animated Background Pattern */}
				<div className="absolute inset-0 opacity-10">
					<div className="absolute top-0 right-0 w-20 h-20 bg-white rounded-full blur-2xl animate-pulse"
						style={{ animationDelay: '0s', animationDuration: '4s' }}
					/>
					<div className="absolute bottom-0 left-0 w-16 h-16 bg-white rounded-full blur-xl animate-pulse"
						style={{ animationDelay: '2s', animationDuration: '5s' }}
					/>
				</div>

				<div className="relative flex items-center gap-2">
					{/* Control Buttons */}
					{!startTime ? (
						<button
							onClick={handleStart}
							className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg"
							title={t("startCommitment")}
						>
							<Play className="h-4 w-4 text-white drop-shadow-lg ml-0.5" />
						</button>
					) : (
						<div className="flex items-center gap-1">
							<button
								onClick={isRunning ? handlePause : () => setIsRunning(true)}
								className="flex-shrink-0 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-md"
								title={isRunning ? t("pause") : t("resume")}
							>
								{isRunning ? (
									<Pause className="h-3 w-3 text-white drop-shadow-lg" />
								) : (
									<Play className="h-3 w-3 text-white drop-shadow-lg ml-0.5" />
								)}
							</button>
							<button
								onClick={handleReset}
								className="flex-shrink-0 w-7 h-7 rounded-full bg-white/20 hover:bg-red-400/30 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-md"
								title={t("reset")}
							>
								<RotateCcw className="h-3 w-3 text-white drop-shadow-lg" />
							</button>
						</div>
					)}

					{/* Time Display - Circular Progress */}
					{startTime && (
						<div className="flex items-center gap-1">
							{/* Days Circle */}
							{elapsed.days > 0 && (
								<div className="flex flex-col items-center group/circle">
									<div className="relative w-10 h-10">
										{/* Outer Glow Ring */}
										<div className="absolute inset-0 rounded-full bg-white/20 blur-sm group-hover/circle:bg-white/30 transition-colors" />

										<svg className="w-10 h-10 transform -rotate-90 relative z-10">
											<circle
												cx="20"
												cy="20"
												r="16"
												stroke="currentColor"
												strokeWidth="2"
												fill="none"
												className="text-white/30"
											/>
											<circle
												cx="20"
												cy="20"
												r="16"
												stroke="currentColor"
												strokeWidth="2.5"
												fill="none"
												strokeDasharray={`${2 * Math.PI * 16}`}
												strokeDashoffset={`${2 * Math.PI * 16 * (1 - (elapsed.days % 365) / 365)}`}
												className="text-white transition-all duration-1000 drop-shadow-lg"
												strokeLinecap="round"
											/>
										</svg>
										<div className="absolute inset-0 flex items-center justify-center">
											<span className="text-xs font-black text-white font-en drop-shadow-lg">
												{formatTime(elapsed.days)}
											</span>
										</div>
									</div>
									<span className="text-[8px] text-white/90 font-bold mt-0.5 tracking-wider">{t("days")}</span>
								</div>
							)}

							{/* Hours Circle */}
							<div className="flex flex-col items-center group/circle">
								<div className="relative w-10 h-10">
									{/* Outer Glow Ring */}
									<div className="absolute inset-0 rounded-full bg-white/20 blur-sm group-hover/circle:bg-white/30 transition-colors" />

									<svg className="w-10 h-10 transform -rotate-90 relative z-10">
										<circle
											cx="20"
											cy="20"
											r="16"
											stroke="currentColor"
											strokeWidth="2"
											fill="none"
											className="text-white/30"
										/>
										<circle
											cx="20"
											cy="20"
											r="16"
											stroke="currentColor"
											strokeWidth="2.5"
											fill="none"
											strokeDasharray={`${2 * Math.PI * 16}`}
											strokeDashoffset={`${2 * Math.PI * 16 * (1 - elapsed.hours / 24)}`}
											className="text-white transition-all duration-1000 drop-shadow-lg"
											strokeLinecap="round"
										/>
									</svg>
									<div className="absolute inset-0 flex items-center justify-center">
										<span className="text-xs font-black text-white font-en drop-shadow-lg">
											{formatTime(elapsed.hours)}
										</span>
									</div>
								</div>
								<span className="text-[8px] text-white/90 font-bold mt-0.5 tracking-wider">{t("hours")}</span>
							</div>

							{/* Minutes Circle */}
							<div className="flex flex-col items-center group/circle">
								<div className="relative w-10 h-10">
									{/* Outer Glow Ring */}
									<div className="absolute inset-0 rounded-full bg-white/20 blur-sm group-hover/circle:bg-white/30 transition-colors" />

									<svg className="w-10 h-10 transform -rotate-90 relative z-10">
										<circle
											cx="20"
											cy="20"
											r="16"
											stroke="currentColor"
											strokeWidth="2"
											fill="none"
											className="text-white/30"
										/>
										<circle
											cx="20"
											cy="20"
											r="16"
											stroke="currentColor"
											strokeWidth="2.5"
											fill="none"
											strokeDasharray={`${2 * Math.PI * 16}`}
											strokeDashoffset={`${2 * Math.PI * 16 * (1 - elapsed.minutes / 60)}`}
											className="text-white transition-all duration-1000 drop-shadow-lg"
											strokeLinecap="round"
										/>
									</svg>
									<div className="absolute inset-0 flex items-center justify-center">
										<span className="text-xs font-black text-white font-en drop-shadow-lg">
											{formatTime(elapsed.minutes)}
										</span>
									</div>
								</div>
								<span className="text-[8px] text-white/90 font-bold mt-0.5 tracking-wider">{t("minutes")}</span>
							</div>

							{/* Milestone Badge */}
							{milestone && (
								<div className="relative ml-1">
									<div
										className="absolute inset-0 blur-md opacity-50"
										style={{ background: `linear-gradient(135deg, ${milestone.color})` }}
									/>
									<div
										className="relative w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
										style={{ background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))` }}
										title={milestone.text}
									>
										<milestone.icon className="h-4 w-4 text-white drop-shadow-lg animate-pulse" />
									</div>
								</div>
							)}
						</div>
					)}

					{/* Initial State Message */}
					{!startTime && (
						<div className="flex items-center gap-2 px-2">
							<Zap className="h-3.5 w-3.5 text-white/90 animate-pulse" />
							<span className="text-xs font-bold text-white/90">
								{t("startCommitment")}
							</span>
						</div>
					)}
				</div>
			</div>

			{/* Date Picker Dialog */}
			{showDatePicker && createPortal(
				<>
					{/* Backdrop */}
					<div
						className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] animate-in fade-in duration-200"
						onClick={() => setShowDatePicker(false)}
					/>

					{/* Dialog */}
					<div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] animate-in zoom-in-95 fade-in duration-300">
						<div
							className="bg-white rounded-3xl shadow-2xl p-8 w-[440px] border-2 relative overflow-hidden"
							style={{ borderColor: `var(--color-primary-200)` }}
							dir={isRTL ? "rtl" : "ltr"}
						>
							{/* Decorative Background Elements */}
							<div className="absolute top-0 right-0 w-64 h-64 opacity-5"
								style={{ background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))` }}
							/>

							{/* Header */}
							<div className="relative flex items-center gap-4 mb-8">
								<div className="relative">
									<div
										className="absolute inset-0 rounded-2xl blur-lg opacity-50"
										style={{ background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))` }}
									/>
									<div
										className="relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
										style={{ background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))` }}
									>
										<Calendar className="h-8 w-8 text-white drop-shadow-lg" />
									</div>
								</div>
								<div className="flex-1">
									<h3 className="text-2xl font-black text-gray-900 mb-1">{t("dialog.title")}</h3>
									<p className="text-sm text-gray-500 font-medium">{t("dialog.subtitle")}</p>
								</div>
							</div>

							{/* Quick Actions */}
							<div className="space-y-4 mb-8">
								{/* Start Now Button */}
								<button
									onClick={handleStartFromNow}
									className="w-full p-5 rounded-2xl border-2 transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden"
									style={{
										borderColor: `var(--color-primary-200)`,
										background: `linear-gradient(135deg, var(--color-primary-50), white)`
									}}
								>
									{/* Shimmer Effect */}
									<div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000">
										<div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12" />
									</div>

									<div className="relative flex items-center justify-between">
										<div className="text-left">
											<div className="font-black text-gray-900 mb-1.5 text-lg">{t("dialog.startNow")}</div>
											<div className="text-sm text-gray-600 font-medium">{t("dialog.startNowDesc")}</div>
										</div>
										<div className="relative">
											<div
												className="absolute inset-0 blur-md opacity-50 group-hover:opacity-75 transition-opacity"
												style={{ background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))` }}
											/>
											<div
												className="relative w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg"
												style={{ background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))` }}
											>
												<Play className="h-6 w-6 text-white ml-0.5 drop-shadow-lg" />
											</div>
										</div>
									</div>
								</button>

								{/* Divider */}
								<div className="relative">
									<div className="absolute inset-0 flex items-center">
										<div className="w-full border-t-2 border-gray-200"></div>
									</div>
									<div className="relative flex justify-center">
										<span className="px-4 bg-white text-sm font-bold text-gray-400 uppercase tracking-wider">
											{t("dialog.or")}
										</span>
									</div>
								</div>

								{/* Custom Date/Time */}
								<div className="space-y-4">
									<label className="block">
										<div className="flex items-center gap-2 mb-3">
											<Calendar className="h-4 w-4 text-gray-600" />
											<span className="text-sm font-bold text-gray-700">
												{t("dialog.customDate")}
											</span>
										</div>
										<input
											type="datetime-local"
											value={selectedDate}
											onChange={(e) => setSelectedDate(e.target.value)}
											max={new Date().toISOString().slice(0, 16)}
											className="w-full px-4 py-3.5 border-2 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 transition-all shadow-sm hover:shadow-md"
											style={{
												borderColor: `var(--color-primary-200)`,
												'--tw-ring-color': 'var(--color-primary-500)'
											}}
										/>
									</label>

									<button
										onClick={handleStartFromDate}
										disabled={!selectedDate}
										className="w-full py-4 rounded-xl font-black text-white transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-base relative overflow-hidden group"
										style={{
											background: selectedDate
												? `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`
												: '#d1d5db'
										}}
									>
										{/* Shimmer Effect */}
										{selectedDate && (
											<div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000">
												<div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12" />
											</div>
										)}
										<span className="relative flex items-center justify-center gap-2">
											<Zap className="h-5 w-5" />
											{t("dialog.startFromDate")}
										</span>
									</button>
								</div>
							</div>

							{/* Cancel Button */}
							<button
								onClick={() => setShowDatePicker(false)}
								className="w-full py-3 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors rounded-xl hover:bg-gray-50"
							>
								{t("dialog.cancel")}
							</button>
						</div>
					</div>
				</>,
				document.body
			)}
		</div>
	);
}