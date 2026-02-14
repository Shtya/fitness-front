/* 
	fix the two side scroll 
	- fix when i click on the edit action on the sidebar open also the edit modal in the calendar 

	- in hte edit when click on the dropdown close the popover
	- add action to detle the types that not global 

	- handle the color of the card ( text , background )

	- add note when i create eth item 
*/

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
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
	Calendar,
	Sparkles,
	TrendingUp,
	ListTodo,
	Home,
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
import api from "@/utils/axios";
import MultiLangText from "@/components/atoms/MultiLangText";

// -----------------------------
// Axios helpers
// -----------------------------
async function apiGet(endpoint, config) {
	const res = await api.get(endpoint, config);
	return res.data;
}
async function apiPost(endpoint, data, config) {
	const res = await api.post(endpoint, data, config);
	return res.data;
}
async function apiPut(endpoint, data, config) {
	const res = await api.put(endpoint, data, config);
	return res.data;
}
async function apiPatch(endpoint, data, config) {
	const res = await api.patch(endpoint, data, config);
	return res.data;
}
async function apiDelete(endpoint, config) {
	const res = await api.delete(endpoint, config);
	return res.data;
}

// -----------------------------
// Icon components mapping
// -----------------------------
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
	LayoutGrid,
};

// -----------------------------
// Enhanced Color options with theme
// -----------------------------
const COLOR_OPTIONS = [
	{
		value: "bg-gradient-to-br from-rose-400 via-pink-400 to-rose-500",
		text: "text-rose-800",
		border: "border-rose-300",
		ring: "ring-rose-500",
		nameKey: "colors.red",
		shadow: "shadow-rose-200",
		glow: "from-rose-400 to-pink-500"
	},
	{
		value: "bg-gradient-to-br from-blue-400 via-cyan-400 to-blue-500",
		text: "text-blue-800",
		border: "border-blue-300",
		ring: "ring-blue-500",
		nameKey: "colors.blue",
		shadow: "shadow-blue-200",
		glow: "from-blue-400 to-cyan-500"
	},
	{
		value: "bg-gradient-to-br from-emerald-400 via-teal-400 to-emerald-500",
		text: "text-emerald-800",
		border: "border-emerald-300",
		ring: "ring-emerald-500",
		nameKey: "colors.green",
		shadow: "shadow-emerald-200",
		glow: "from-emerald-400 to-teal-500"
	},
	{
		value: "theme-gradient-bg",
		text: "theme-primary-text",
		border: "theme-soft-border",
		ring: "ring-primary-500",
		nameKey: "colors.purple",
		shadow: "shadow-primary-200",
		glow: "var(--color-gradient-from) var(--color-gradient-to)",
		isTheme: true
	},
	{
		value: "bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500",
		text: "text-amber-800",
		border: "border-amber-300",
		ring: "ring-amber-500",
		nameKey: "colors.orange",
		shadow: "shadow-amber-200",
		glow: "from-amber-400 to-orange-500"
	},
	{
		value: "bg-gradient-to-br from-indigo-400 via-violet-400 to-indigo-500",
		text: "text-indigo-800",
		border: "border-indigo-300",
		ring: "ring-indigo-500",
		nameKey: "colors.indigo",
		shadow: "shadow-indigo-200",
		glow: "from-indigo-400 to-violet-500"
	},
];

// -----------------------------
// Default event types with theme colors
// -----------------------------
const DEFAULT_TYPES = [
	{ id: "all", nameKey: "types.all", color: "bg-gradient-to-br from-gray-100 to-gray-200", textColor: "text-gray-800", border: "border-gray-300", ring: "ring-gray-500", icon: "LayoutGrid", shadow: "shadow-gray-200", glow: "from-gray-400 to-gray-500" },
	{ id: "habit", nameKey: "types.habit", color: "bg-gradient-to-br from-emerald-400 via-teal-400 to-emerald-500", textColor: "text-emerald-900", border: "border-emerald-300", ring: "ring-emerald-500", icon: "Target", shadow: "shadow-emerald-200", glow: "from-emerald-400 to-teal-500" },
	{ id: "task", nameKey: "types.task", color: "theme-gradient-bg", textColor: "theme-primary-text", border: "theme-soft-border", ring: "ring-primary-500", icon: "CheckSquare", shadow: "shadow-primary-200", glow: "var(--color-gradient-from) var(--color-gradient-to)" },
	{ id: "meeting", nameKey: "types.meeting", color: "bg-gradient-to-br from-purple-400 via-fuchsia-400 to-purple-500", textColor: "text-purple-900", border: "border-purple-300", ring: "ring-purple-500", icon: "Users", shadow: "shadow-purple-200", glow: "from-purple-400 to-fuchsia-500" },
	{ id: "reminder", nameKey: "types.reminder", color: "bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500", textColor: "text-amber-900", border: "border-amber-300", ring: "ring-amber-500", icon: "Bell", shadow: "shadow-amber-200", glow: "from-amber-400 to-orange-500" },
	{ id: "billing", nameKey: "types.billing", color: "bg-gradient-to-br from-rose-400 via-pink-400 to-rose-500", textColor: "text-rose-900", border: "border-rose-300", ring: "ring-rose-500", icon: "DollarSign", shadow: "shadow-rose-200", glow: "from-rose-400 to-pink-500" },
];

// -----------------------------
// Backend endpoints
// -----------------------------
const ENDPOINTS = {
	state: "/calendar/state",
	items: "/calendar/items",
	itemById: (id) => `/calendar/items/${id}`,
	types: "/calendar/types",
	typeById: (id) => `/calendar/types/${id}`,
	completions: "/calendar/completions",
	settings: "/calendar/settings",
	sound: "/calendar/sound",
};

// -----------------------------
// Tab options for navigation
// -----------------------------
const TAB_OPTIONS = [
	{ value: "boards", label: "kanbanBoard", icon: Home },
	{ value: "calendar", label: "calendar", icon: CalendarIcon },
	{ value: "tasks", label: "todos", icon: ListTodo },
];

// -----------------------------
// Stable Form Component
// -----------------------------
function ItemFormContent({
	t,
	isRTL,
	editingItem,
	itemForm,
	setItemForm,
	handleSaveItem,
	onClose,
	dayNames,
	eventTypes,
	renderIcon,
	getTypeLabel,
}) {
	return (
		<div className="p-6 space-y-5 bg-gradient-to-b from-white via-gray-50 to-white">
			<div className="flex items-center justify-between border-b-2 pb-4 theme-soft-border">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-md  theme-gradient-bg flex items-center justify-center shadow-lg">
						<Sparkles className="h-5 w-5 text-white" />
					</div>
					<h3 className="text-xl font-black text-gray-900">{editingItem ? t("editItem") : t("addNewItem")}</h3>
				</div>
				<Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 rounded-md  hover:bg-gray-100">
					<X className="h-5 w-5" />
				</Button>
			</div>

			<div className="space-y-5">
				<div className="space-y-2">
					<Label className="text-sm font-bold text-gray-700 flex items-center gap-2">
						<Pencil className="h-3.5 w-3.5" />
						{t("title")}
					</Label>
					<Input
						value={itemForm.title}
						onChange={(e) => setItemForm((prev) => ({ ...prev, title: e.target.value }))}
						placeholder={t("enterTitle")}
						className="border-2 focus:ring-2 rounded-md  h-12 text-base font-medium shadow-sm hover:shadow-md transition-shadow"
						autoFocus
					/>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label className="text-sm font-bold text-gray-700">{t("type")}</Label>
						<Select value={itemForm.type} onValueChange={(value) => setItemForm((prev) => ({ ...prev, type: value }))}>
							<SelectTrigger className="border-2 rounded-md  h-12 shadow-sm hover:shadow-md transition-shadow">
								<SelectValue />
							</SelectTrigger>
							<SelectContent className="rounded-md ">
								{eventTypes
									.filter((tt) => tt.id !== "all")
									.map((type) => (
										<SelectItem key={type.id} value={type.id} className="rounded-lg my-1">
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
						<Label className="text-sm font-bold text-gray-700">{t("recurrence")}</Label>
						<Select value={itemForm.recurrence} onValueChange={(value) => setItemForm((prev) => ({ ...prev, recurrence: value }))}>
							<SelectTrigger className="border-2 rounded-md  h-12 shadow-sm hover:shadow-md transition-shadow">
								<SelectValue />
							</SelectTrigger>
							<SelectContent className="rounded-md ">
								<SelectItem value="none" className="rounded-lg my-1">{t("none")}</SelectItem>
								<SelectItem value="daily" className="rounded-lg my-1">{t("daily")}</SelectItem>
								<SelectItem value="weekly" className="rounded-lg my-1">{t("weekly")}</SelectItem>
								<SelectItem value="monthly" className="rounded-lg my-1">{t("monthly")}</SelectItem>
								<SelectItem value="every_x_days" className="rounded-lg my-1">{t("everyXDays")}</SelectItem>
								<SelectItem value="custom" className="rounded-lg my-1">{t("custom")}</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				{itemForm.recurrence === "every_x_days" && (
					<div className="space-y-2 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-md  border-2 border-blue-200">
						<Label className="text-sm font-bold text-blue-900">{t("repeatEveryDays")}</Label>
						<Input
							type="number"
							min="1"
							value={itemForm.recurrenceInterval}
							onChange={(e) => setItemForm((prev) => ({ ...prev, recurrenceInterval: parseInt(e.target.value, 10) || 1 }))}
							placeholder="3"
							className="border-2 rounded-md  h-11"
						/>
					</div>
				)}

				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label className="text-sm font-bold text-gray-700">{t("startDate")}</Label>
						<Input
							type="date"
							value={itemForm.startDate}
							onChange={(e) => setItemForm((prev) => ({ ...prev, startDate: e.target.value }))}
							className="border-2 rounded-md  h-12 shadow-sm hover:shadow-md transition-shadow"
						/>
					</div>

					<div className="space-y-2">
						<Label className="text-sm font-bold text-gray-700">
							{t("startTime")} ({t("optional")})
						</Label>
						<Input
							type="time"
							value={itemForm.startTime || ""}
							onChange={(e) => setItemForm((prev) => ({ ...prev, startTime: e.target.value }))}
							className="border-2 rounded-md  h-12 shadow-sm hover:shadow-md transition-shadow"
						/>
					</div>
				</div>

				{itemForm.recurrence === "custom" && (
					<div className="space-y-3 p-4 bg-[var(--color-primary-50)] rounded-md  border-2 theme-soft-border">
						<Label className="text-sm font-bold theme-primary-text">{t("selectDays")}</Label>
						<div className="flex gap-2 flex-wrap">
							{dayNames.map((day, idx) => (
								<Button
									key={idx}
									type="button"
									variant={itemForm.recurrenceDays.includes(idx) ? "default" : "outline"}
									size="sm"
									className={cn(
										"rounded-md  transition-all",
										itemForm.recurrenceDays.includes(idx) && "theme-gradient-bg shadow-lg"
									)}
									onClick={() => {
										setItemForm((prev) => {
											const days = prev.recurrenceDays.includes(idx)
												? prev.recurrenceDays.filter((d) => d !== idx)
												: [...prev.recurrenceDays, idx];
											return { ...prev, recurrenceDays: days };
										});
									}}
								>
									{day.slice(0, 3)}
								</Button>
							))}
						</div>
					</div>
				)}
			</div>

			<div className="flex gap-3 pt-4 border-t-2 border-gray-100">
				<Button variant="outline" onClick={onClose} className="flex-1 rounded-md  h-12 font-bold border-2 hover:bg-gray-50">
					{t("cancel")}
				</Button>
				<Button
					onClick={handleSaveItem}
					disabled={!itemForm.title || !itemForm.startDate}
					className="flex-1 rounded-md  h-12 font-bold shadow-lg hover:shadow-xl transition-all theme-gradient-bg text-white"
				>
					<Check className="h-5 w-5 mr-2" />
					{editingItem ? t("save") : t("add")}
				</Button>
			</div>
		</div>
	);
}

export default function CalendarPage() {
	const t = useTranslations("calendar");
	const t_navbar = useTranslations('nav.items');
	const locale = useLocale();
	const isRTL = locale === "ar";
	const router = useRouter();
	const searchParams = useSearchParams();

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
	const [newTypeColor, setNewTypeColor] = useState(COLOR_OPTIONS[3].value);
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
		showWeekNumbers: false,
		highlightWeekend: true,
		weekendDays: [5, 6],
		startOfWeek: 6,
		confirmBeforeDelete: true,
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
		recurrenceDays: [],
	});

	// Current tab from URL
	const currentTab = searchParams.get("tab") || "calendar";

	// Handle tab change
	const handleTabChange = (tab) => {
		const params = new URLSearchParams(searchParams);
		params.set("tab", tab);
		router.push(`?${params.toString()}`);
	};

	// -----------------------------
	// LocalStorage sync (fallback)
	// -----------------------------
	useEffect(() => {
		try {
			localStorage.setItem("calendarItems", JSON.stringify(items));
		} catch { }
	}, [items]);

	useEffect(() => {
		try {
			localStorage.setItem("eventTypes", JSON.stringify(eventTypes));
		} catch { }
	}, [eventTypes]);

	useEffect(() => {
		try {
			localStorage.setItem("completions", JSON.stringify(completions));
		} catch { }
	}, [completions]);

	useEffect(() => {
		try {
			localStorage.setItem("calendarSettings", JSON.stringify(settings));
		} catch { }
	}, [settings]);

	useEffect(() => {
		try {
			localStorage.setItem("soundEnabled", JSON.stringify(soundEnabled));
		} catch { }
	}, [soundEnabled]);

	// -----------------------------
	// Load initial data from API (fallback to localStorage)
	// -----------------------------
	useEffect(() => {
		let mounted = true;

		const loadFromLocal = () => {
			try {
				const savedItems = localStorage.getItem("calendarItems");
				const savedTypes = localStorage.getItem("eventTypes");
				const savedCompletions = localStorage.getItem("completions");
				const savedSettings = localStorage.getItem("calendarSettings");
				const savedSound = localStorage.getItem("soundEnabled");

				if (!mounted) return;

				if (savedItems) setItems(JSON.parse(savedItems));
				if (savedTypes) setEventTypes(JSON.parse(savedTypes));
				if (savedCompletions) setCompletions(JSON.parse(savedCompletions));
				if (savedSettings) setSettings(JSON.parse(savedSettings));
				if (savedSound) setSoundEnabled(JSON.parse(savedSound));
			} catch { }
		};

		const load = async () => {
			try {
				const state = await apiGet(ENDPOINTS.state);
				if (!mounted) return;

				if (Array.isArray(state?.items)) setItems(state.items);
				if (Array.isArray(state?.eventTypes)) setEventTypes(state.eventTypes);
				if (state?.completions && typeof state.completions === "object") setCompletions(state.completions);
				if (state?.settings && typeof state.settings === "object") setSettings(state.settings);
				if (typeof state?.soundEnabled === "boolean") setSoundEnabled(state.soundEnabled);
				return;
			} catch (e) {
				try {
					const [itemsRes, typesRes, completionsRes, settingsRes, soundRes] = await Promise.allSettled([
						apiGet(ENDPOINTS.items),
						apiGet(ENDPOINTS.types),
						apiGet(ENDPOINTS.completions),
						apiGet(ENDPOINTS.settings),
						apiGet(ENDPOINTS.sound),
					]);

					if (!mounted) return;

					if (itemsRes.status === "fulfilled") setItems(itemsRes.value?.items || itemsRes.value || []);
					if (typesRes.status === "fulfilled") setEventTypes(typesRes.value?.eventTypes || typesRes.value || DEFAULT_TYPES);
					if (completionsRes.status === "fulfilled") setCompletions(completionsRes.value?.completions || completionsRes.value || {});
					if (settingsRes.status === "fulfilled") setSettings(settingsRes.value?.settings || settingsRes.value || settings);
					if (soundRes.status === "fulfilled" && typeof (soundRes.value?.soundEnabled) === "boolean") setSoundEnabled(soundRes.value.soundEnabled);

					if (
						itemsRes.status === "rejected" &&
						typesRes.status === "rejected" &&
						completionsRes.status === "rejected" &&
						settingsRes.status === "rejected" &&
						soundRes.status === "rejected"
					) {
						loadFromLocal();
					}
				} catch {
					loadFromLocal();
				}
			}
		};

		load();

		return () => {
			mounted = false;
		};
	}, []);

	// -----------------------------
	// Play sound
	// -----------------------------
	const playSound = () => {
		if (!soundEnabled) return;
		const audio = new Audio(
			"data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBCuBzvLZiTUIGmm98OScTgwOUKjk8bllHAU2kdny0HssBS16yPLaizsKEl+16+uoVRQKRp/h8r5sIQQrgc/y2Yk1CBppvfDknE4MDlCo5PG5ZRwFN5HZ8tB7LAUtesjy2os7ChJftevrqFUUCkaf4fK+bCEEK4HP8tmJNQgaaL3w5JxODA5QqOTxuWUcBTeR2fLQeywFLXrI8tqLOwoSX7Xr66hVFApGn+HyvmwhBCuBz/LZiTUIGmi98OScTgwOUKjk8bllHAU3kdny0HssBS16yPLaizsKEl+16+uoVRQKRp/h8r5sIQQrgc/y2Yk1CBpovfDknE4MDlCo5PG5ZRwFN5HZ8tB7LAUtesjy2os7ChJftevrqFUUCkaf4fK+bCEEK4HP8tmJNQgaaL3w5JxODA5QqOTxuWUcBTeR2fLQeywFLXrI8tqLOwoSX7Xr66hVFApGn+HyvmwhBCuBz/LZiTUIGmi98OScTgwOUKjk8bllHAU3kdny0HssBS16yPLaizsK"
		);
		audio.play().catch(() => { });
	};

	// -----------------------------
	// Helpers
	// -----------------------------
	const monthNames = useMemo(
		() => [t("january"), t("february"), t("march"), t("april"), t("may"), t("june"), t("july"), t("august"), t("september"), t("october"), t("november"), t("december")],
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

	const formatTime = (timeStr) => {
		if (!timeStr) return "";
		const m24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
		if (m24) {
			let h = parseInt(m24[1], 10);
			const min = m24[2];
			const ampm = h >= 12 ? "PM" : "AM";
			h = h % 12;
			if (h === 0) h = 12;
			return `${h}:${min} ${ampm}`;
		}
		const m12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
		if (m12) return `${parseInt(m12[1], 10)}:${m12[2]} ${m12[3].toUpperCase()}`;
		return timeStr;
	};

	const isWeekend = (date) => settings.weekendDays.includes(date.getDay());

	const getCompletionKey = (itemId, date) => `${itemId}_${getDateString(date)}`;
	const isItemCompleted = (itemId, date) => !!completions[getCompletionKey(itemId, date)];

	const renderIcon = (iconName, className = "h-4 w-4") => {
		const IconComponent = (iconName && ICON_COMPONENTS[iconName]) || CalendarIcon;
		return <IconComponent className={className} />;
	};

	const getTypeLabel = (type) => {
		if (!type) return t("types.all");
		if (type.custom) return type.name || "";
		return type.nameKey ? t(type.nameKey) : type.name || "";
	};

	const adjustedDayNames = useMemo(() => {
		const arr = [];
		for (let i = 0; i < 7; i++) arr.push(dayNames[(i + settings.startOfWeek) % 7]);
		return arr;
	}, [dayNames, settings.startOfWeek]);

	// -----------------------------
	// Domain logic
	// -----------------------------
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
						(date.getMonth() - startDate.getMonth() + 12 * (date.getFullYear() - startDate.getFullYear())) % item.recurrenceInterval === 0
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

	const getItemPopoverKey = (itemId, dateStr) => `${itemId}_${dateStr}`;

	// -----------------------------
	// CRUD
	// -----------------------------
	const resetItemForm = () => {
		const today = new Date();
		const dateStr = today.toISOString().split("T")[0];

		setItemForm({
			id: "",
			title: "",
			type: "task",
			startDate: dateStr,
			startTime: "",
			recurrence: "none",
			recurrenceInterval: 1,
			recurrenceDays: [],
		});
		setEditingItem(null);
		setEditingPopoverId(null);
	};

	const openEditPopover = (item, dateStr) => {
		setShowAddPopover(false);

		setEditingItem(item);
		setItemForm({
			...item,
			recurrenceDays: item.recurrenceDays || [],
			recurrenceInterval: item.recurrenceInterval || 1,
		});
		setEditingPopoverId(getItemPopoverKey(item.id, dateStr));
	};

	const toggleCompletion = async (itemId, date) => {
		const key = getCompletionKey(itemId, date);
		const dateStr = getDateString(date);

		let nextVal = false;
		setCompletions((prev) => {
			nextVal = !prev[key];
			return { ...prev, [key]: nextVal };
		});

		playSound();

		try {
			await apiPatch(ENDPOINTS.completions, { key, itemId, date: dateStr, completed: nextVal });
		} catch {
			setCompletions((prev) => ({ ...prev, [key]: !nextVal }));
		}
	};

	const handleSaveItem = useCallback(async () => {
		if (!itemForm.title || !itemForm.startDate) return;

		if (editingItem) {
			const updated = { ...itemForm, id: editingItem.id };

			setItems((prev) => prev.map((it) => (it.id === editingItem.id ? updated : it)));

			try {
				await apiPut(ENDPOINTS.itemById(editingItem.id), updated);
			} catch {
				try {
					const fresh = await apiGet(ENDPOINTS.items);
					setItems(fresh?.items || fresh || []);
				} catch { }
			}
		} else {
			const tempId = `tmp_${Date.now()}`;
			const createdLocal = { ...itemForm, id: tempId };

			setItems((prev) => [...prev, createdLocal]);

			try {
				const createdFromServer = await apiPost(ENDPOINTS.items, createdLocal);
				const serverItem = createdFromServer?.item || createdFromServer;
				if (serverItem?.id && serverItem.id !== tempId) {
					setItems((prev) => prev.map((it) => (it.id === tempId ? serverItem : it)));
				}
			} catch { }
		}

		setShowAddPopover(false);
		setEditingPopoverId(null);
		resetItemForm();
		playSound();
	}, [itemForm, editingItem]);

	const handleDeleteItem = (item) => {
		if (settings.confirmBeforeDelete) {
			setItemToDelete(item);
			setShowDeleteConfirm(true);
		} else {
			confirmDelete(item);
		}
	};

	const confirmDelete = async (item = itemToDelete) => {
		if (!item) return;

		const prevItems = items;
		setItems((prev) => prev.filter((i) => i.id !== item.id));
		setShowDeleteConfirm(false);
		setItemToDelete(null);
		playSound();

		try {
			await apiDelete(ENDPOINTS.itemById(item.id));
		} catch {
			setItems(prevItems);
		}
	};

	const handleAddType = async () => {
		if (!newTypeName.trim()) return;

		const selectedColor = COLOR_OPTIONS.find((c) => c.value === newTypeColor);
		const newType = {
			id: `custom_${Date.now()}`,
			name: newTypeName,
			color: newTypeColor,
			textColor: selectedColor?.text || "text-gray-700",
			border: selectedColor?.border || "border-gray-200",
			ring: selectedColor?.ring || "ring-gray-500",
			shadow: selectedColor?.shadow || "shadow-gray-200",
			glow: selectedColor?.glow || "from-gray-400 to-gray-500",
			icon: newTypeIcon,
			custom: true,
		};

		setEventTypes((prev) => [...prev, newType]);

		try {
			const created = await apiPost(ENDPOINTS.types, newType);
			const serverType = created?.type || created;
			if (serverType?.id && serverType.id !== newType.id) {
				setEventTypes((prev) => prev.map((tt) => (tt.id === newType.id ? serverType : tt)));
			}
		} catch { }

		setNewTypeName("");
		setNewTypeColor(COLOR_OPTIONS[3].value);
		setNewTypeIcon("Target");
		setShowAddTypeDrawer(false);
		playSound();
	};

	const handleDeleteType = async (typeId) => {
		const type = eventTypes.find((tt) => tt.id === typeId);
		if (!type || !type.custom) return;

		const prevTypes = eventTypes;
		const prevItems = items;

		setEventTypes((prev) => prev.filter((tt) => tt.id !== typeId));
		setItems((prev) => prev.filter((it) => it.type !== typeId));
		playSound();

		try {
			await apiDelete(ENDPOINTS.typeById(typeId));
		} catch {
			setEventTypes(prevTypes);
			setItems(prevItems);
		}
	};

	useEffect(() => {
		apiPut(ENDPOINTS.settings, { settings }).catch(() => { });
	}, [settings]);

	useEffect(() => {
		apiPut(ENDPOINTS.sound, { soundEnabled }).catch(() => { });
	}, [soundEnabled]);

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
			{ value: "Flame", label: t("icons.important"), Icon: Flame },
		],
		[t]
	);

	const selectedTypeObj = eventTypes.find((tt) => tt.id === selectedType);

	// Month view
	const renderMonthView = () => {
		const year = currentDate.getFullYear();
		const month = currentDate.getMonth();

		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);

		const startingDayOfWeek = (firstDay.getDay() - settings.startOfWeek + 7) % 7;
		const daysInMonth = lastDay.getDate();

		const days = [];
		for (let i = 0; i < startingDayOfWeek; i++) days.push({ date: null });
		for (let i = 1; i <= daysInMonth; i++) days.push({ date: new Date(year, month, i) });
		const tail = (7 - (days.length % 7)) % 7;
		for (let i = 0; i < tail; i++) days.push({ date: null });

		const weeks = [];
		for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

		return (
			<div className="space-y-0">
				{/* Day names */}
				<div className={cn("grid border-b-2 border-gray-200/50", settings.showWeekNumbers ? "grid-cols-8" : "grid-cols-7")}>
					{settings.showWeekNumbers && (
						<div className="bg-gradient-to-br from-gray-50 to-gray-100 text-center text-xs font-black text-gray-600 py-5 border-r-2 border-gray-200/50">
							{t("week")}
						</div>
					)}

					{adjustedDayNames.map((day, idx) => (
						<div
							key={idx}
							className={cn(
								"bg-gradient-to-br from-gray-50 via-white to-gray-50 text-center text-sm font-black py-5 text-gray-700 border-r-2 border-gray-200/50",
								idx === 6 && "border-r-0"
							)}
						>
							{day}
						</div>
					))}
				</div>

				{/* Grid */}
				<div className="border-2 border-gray-200/50 border-t-0 rounded-b-2xl overflow-hidden shadow-xl">
					{weeks.map((week, weekIdx) => (
						<div
							key={weekIdx}
							className={cn(
								"grid",
								settings.showWeekNumbers ? "grid-cols-8" : "grid-cols-7",
								weekIdx < weeks.length - 1 && "border-b-2 border-gray-200/50"
							)}
						>
							{settings.showWeekNumbers && (
								<div className="bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center text-xs text-gray-600 font-black border-r-2 border-gray-200/50">
									{week[0].date && getWeekNumber(week[0].date)}
								</div>
							)}

							{week.map(({ date }, dayIdx) => {
								if (!date) {
									return (
										<div
											key={dayIdx}
											className={cn("bg-gradient-to-br from-gray-100/30 to-gray-50/30 min-h-[130px] border-r-2 border-gray-200/50", dayIdx === 6 && "border-r-0")}
										/>
									);
								}

								const dateStr = getDateString(date);
								const itemsForDate = getItemsForDate(date);
								const filteredItems = selectedType === "all" ? itemsForDate : itemsForDate.filter((it) => it.type === selectedType);

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
											"bg-white min-h-[130px] rounded-lg p-2 cursor-pointer transition-all hover:bg-gradient-to-br hover:from-blue-50/30 hover:to-purple-50/30 group relative border-r-2 border-gray-200/50",
											dayIdx === 6 && "border-r-0",
											isToday && "ring-2 ring-inset ring-[var(--color-primary-500)] shadow-2xl",
											isSelected && "ring-2 ring-inset ring-[var(--color-primary-300)]  shadow-2xl",
											isWeekendDay && settings.highlightWeekend && !isToday && !isSelected && "bg-gradient-to-br from-rose-50/40 via-pink-50/40 to-orange-50/30"
										)}
										style={{
											...(isToday && {
												ringColor: `var(--color-primary-400)`,
												background: `linear-gradient(135deg, var(--color-primary-100) 0%, var(--color-primary-50) 50%, white 100%)`,
											}),
											...(isSelected && {
												ringColor: `var(--color-secondary-400)`,
												background: `linear-gradient(135deg, var(--color-secondary-100) 0%, var(--color-secondary-50) 50%, white 100%)`,
											}),
										}}
										onClick={() => {
											setSelectedDate(date);
											setShowDaySlidePanel(true);
										}}
									>
										{/* Decorative gradient overlay on hover */}
										<div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary-100)]/0 via-[var(--color-secondary-100)]/0 to-blue-100/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

										{/* header */}
										<div className="flex items-start justify-between mb-2 relative z-10">
											<div
												className={cn(
													"text-lg font-black transition-all relative",
													isToday && "rounded-md  w-10 h-10 flex items-center justify-center text-white shadow-2xl text-base"
												)}
												style={
													isToday
														? {
															background: `linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))`,
															boxShadow: '0 8px 20px rgba(99, 102, 241, 0.4), 0 0 20px rgba(168, 85, 247, 0.3)'
														}
														: {}
												}
											>
												{isToday && (
													<div className="absolute inset-0 rounded-md  theme-gradient-bg animate-pulse opacity-50 blur-md" />
												)}
												<span className="relative z-10">{date.getDate()}</span>
											</div>

											{progress.total > 0 && (
												<div className="relative w-11 h-11">
													<div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary-200)] to-[var(--color-secondary-200)] rounded-full blur-sm opacity-40" />
													<svg className="w-11 h-11 transform -rotate-90 relative z-10">
														<circle cx="22" cy="22" r="18" stroke="currentColor" strokeWidth="3" fill="none" className="text-gray-200" />
														<circle
															cx="22"
															cy="22"
															r="18"
															stroke="url(#progress-gradient)"
															strokeWidth="3.5"
															fill="none"
															strokeDasharray={`${2 * Math.PI * 18}`}
															strokeDashoffset={`${2 * Math.PI * 18 * (1 - progress.percentage / 100)}`}
															className="transition-all duration-700 filter drop-shadow-lg"
															strokeLinecap="round"
														/>
														<defs>
															<linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
																<stop offset="0%" stopColor="var(--color-gradient-from)" />
																<stop offset="50%" stopColor="var(--color-gradient-via)" />
																<stop offset="100%" stopColor="var(--color-gradient-to)" />
															</linearGradient>
														</defs>
													</svg>
													<div className="absolute inset-0 flex items-center justify-center">
														<span className="text-[10px] font-black text-gray-700">
															{progress.completed}/{progress.total}
														</span>
													</div>
												</div>
											)}
										</div>

										{/* items */}
										<div className="space-y-1 relative z-10">
											{filteredItems.slice(0, 2).map((item) => {
												const type = eventTypes.find((tt) => tt.id === item.type);
												const completed = isItemCompleted(item.id, date);
												const popoverKey = getItemPopoverKey(item.id, dateStr);

												return (
													<div
														key={item.id}
														className={cn(
															"text-xs px-2 py-2.5 rounded-sm flex items-center gap-2 transition-all border-2 group/item relative overflow-hidden shadow-md hover:shadow-xl hover:scale-105",
															type?.color || "bg-gradient-to-br from-gray-100 to-gray-200",
															type?.border,
															completed && "opacity-60"
														)}
														onClick={(e) => e.stopPropagation()}
													>
 														<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover/item:translate-x-full transition-transform duration-1000" />

														<Button
															variant="ghost"
															size="icon"
															className="h-4 w-4 p-0 hover:bg-transparent z-10 flex-shrink-0"
															onClick={(e) => {
																e.stopPropagation();
																toggleCompletion(item.id, date);
															}}
														>
															{completed ? (
																<div className="relative">
																	<CheckCircle2 className="h-4 w-4 text-emerald-600" />
																	<div className="absolute inset-0 bg-emerald-400 rounded-full blur-md animate-pulse opacity-50" />
																</div>
															) : (
																<Circle className="h-4 w-4 text-gray-400 group-hover/item:text-gray-600 transition-colors" />
															)}
														</Button>

														<MultiLangText
															className={cn(
																"flex-1  font-bold text-[9px] z-10 leading-tight",
																type?.textColor,
																completed && "line-through"
															)}
														>
															{item.title}
														</MultiLangText>

														<div className="opacity-0 group-hover/item:opacity-100 transition-opacity flex gap-1 z-10 flex-shrink-0">
															<Popover
																open={editingPopoverId === popoverKey}
																onOpenChange={(open) => {
																	if (!open) {
																		setEditingPopoverId(null);
																		setEditingItem(null);
																		resetItemForm();
																	}
																}}
															>
																<PopoverTrigger asChild>
																	<Button
																		variant="ghost"
																		size="icon"
																		className="h-3 w-3 hover:bg-white/90 rounded-lg shadow-sm"
																		onClick={(e) => {
																			e.stopPropagation();
																			openEditPopover(item, dateStr);
																		}}
																	>
																		<Pencil size={8} className=" scale-[.7] text-blue-600"  />
																	</Button>
																</PopoverTrigger>
																<PopoverContent
																	className="w-96 p-0 rounded-md  shadow-2xl border-2"
																	side={isRTL ? "left" : "right"}
																	align="start"
																	sideOffset={10}
																	onOpenAutoFocus={(e) => e.preventDefault()}
																>
																	<ItemFormContent
																		t={t}
																		isRTL={isRTL}
																		editingItem={editingItem}
																		itemForm={itemForm}
																		setItemForm={setItemForm}
																		handleSaveItem={handleSaveItem}
																		dayNames={dayNames}
																		eventTypes={eventTypes}
																		renderIcon={renderIcon}
																		getTypeLabel={getTypeLabel}
																		onClose={() => {
																			setEditingPopoverId(null);
																			setEditingItem(null);
																			resetItemForm();
																		}}
																	/>
																</PopoverContent>
															</Popover>

															<Button
																variant="ghost"
																size="icon"
																className="h-3 w-3 text-red-600 hover:bg-red-100 rounded-lg shadow-sm"
																onClick={(e) => {
																	e.stopPropagation();
																	handleDeleteItem(item);
																}}
															>
																<Trash2 size={8} className=" scale-[.7] " />
															</Button>
														</div>
													</div>
												);
											})}

											{filteredItems.length > 2 && (
												<div className="text-[10px] text-gray-700 text-center py-2 bg-gradient-to-r from-[var(--color-primary-100)] via-[var(--color-secondary-100)] to-blue-100 rounded-md  font-black shadow-md border-2 theme-soft-border">
													<Sparkles className="h-3 w-3 inline mr-1" />
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

	return (
		<div dir={isRTL ? "rtl" : "ltr"} className="overflow-x-hidden mt-[-25px] w-[calc(100%+50px)] relative rtl:left-[25px] ">
			{(showAddTypeDrawer || showDaySlidePanel) && (
				<div
					className="fixed inset-0 bg-black/50 backdrop-blur-md z-40 transition-all"
					onClick={() => {
						setShowAddTypeDrawer(false);
						setShowDaySlidePanel(false);
						setEditingPopoverId(null);
						setEditingItem(null);
					}}
				/>
			)}

			<div className="flex flex-col ">
				{/* Top Bar */}
				<div className="bg-gradient-to-r from-white via-[var(--color-primary-50)]/30 to-[var(--color-secondary-50)]/30 backdrop-blur-xl border-b-2 theme-soft-border px-6 py-5 flex items-center justify-between shadow-lg">
					<div className="flex items-center gap-4">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
							className="hover:bg-white/70 rounded-md  shadow-md hover:shadow-xl transition-all h-11 w-11"
						>
							{isRTL ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
						</Button>

						<div>
							<h2 className="text-4xl font-black theme-gradient-text mb-1">
								{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
							</h2>
							<p className="text-sm text-gray-600 font-bold flex items-center gap-2">
								<TrendingUp className="h-4 w-4" />
								{t("viewing")} {selectedType === "all" ? t("allItems") : getTypeLabel(selectedTypeObj)}
							</p>
						</div>

						<Button
							variant="ghost"
							size="icon"
							onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
							className="hover:bg-white/70 rounded-md  shadow-md hover:shadow-xl transition-all h-11 w-11"
						>
							{isRTL ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
						</Button>
					</div>

					<CountdownTimer />

					<div className="flex items-center gap-3">
						{/* Tab Selector Dropdown */}
						<Select value={currentTab} onValueChange={handleTabChange}>
							<SelectTrigger className="w-fit bg-white shadow-lg hover:shadow-xl transition-all border-2 border-[var(--color-primary-300)] rounded-md  h-11 font-bold">
								<SelectValue>
									<div className="flex items-center gap-2">
										<span className="text-[var(--color-primary-900)] " >{t_navbar(TAB_OPTIONS.find(tab => tab.value === currentTab)?.label)}</span>
										{TAB_OPTIONS.find(tab => tab.value === currentTab)?.icon && (
											<>
												{(() => {
													const Icon = TAB_OPTIONS.find(tab => tab.value === currentTab)?.icon;
													return Icon ? <Icon className="h-4 w-4 stroke-[var(--color-primary-900)]" /> : null;
												})()}
											</>
										)}
									</div>
								</SelectValue>
							</SelectTrigger>
							<SelectContent className="rounded-md  shadow-2xl border-2">
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

						<Popover>
							<PopoverTrigger asChild>
								<Button variant="outline" className="flex items-center gap-2 bg-white shadow-lg hover:shadow-xl transition-all border-2 rounded-md  h-11 font-bold">
									{renderIcon(selectedTypeObj?.icon || "LayoutGrid", "h-5 w-5")}
									<span className="font-black ">{getTypeLabel(selectedTypeObj)}</span>
									<ChevronDown className="h-4 w-4 text-gray-400" />
								</Button>
							</PopoverTrigger>

							<PopoverContent className="w-72 p-3 rounded-md  shadow-2xl border-2" align="end">
								<div className="space-y-1">
									{eventTypes.map((type) => (
										<Button
											key={type.id}
											variant="ghost"
											className={cn(
												"w-full justify-start gap-3 rounded-md  h-12 font-bold transition-all",
												selectedType === type.id && "bg-gradient-to-r from-[var(--color-primary-100)] to-[var(--color-secondary-100)] shadow-md"
											)}
											onClick={() => setSelectedType(type.id)}
										>
											{renderIcon(type.icon, "h-5 w-5")}
											<span className="flex-1 text-left">{getTypeLabel(type)}</span>
											<span className="font-en text-xs theme-gradient-bg text-white px-3 py-1 rounded-full font-black shadow-md">
												{getItemCountByType(type.id)}
											</span>
										</Button>
									))}

									<div className="border-t-2 pt-3 mt-3">
										<Button
											variant="ghost"
											className="w-full justify-start gap-2 theme-primary-text rounded-md  h-12 font-black hover:bg-[var(--color-primary-50)]"
											onClick={() => setShowAddTypeDrawer(true)}
										>
											<Plus className="h-5 w-5" />
											{t("addNewType")}
										</Button>
									</div>
								</div>
							</PopoverContent>
						</Popover>

						<div className="flex items-center gap-2">
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
										className=" w-[45px] flex-none shadow-xl hover:shadow-2xl transition-all theme-gradient-bg text-white rounded-md  h-11 font-black relative overflow-hidden group"
										onClick={() => {
											setEditingItem(null);
											setEditingPopoverId(null);
											resetItemForm();
										}}
									>
										<div className=" absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
										<Plus className="h-5 w-5 relative z-10" />
										{/* <span className="relative z-10">{t("addNew")}</span> */}
									</Button>
								</PopoverTrigger>

								<PopoverContent className="w-96 p-0 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 rounded-md  shadow-2xl border-2" align="end" sideOffset={5}>
									<ItemFormContent
										t={t}
										isRTL={isRTL}
										editingItem={editingItem}
										itemForm={itemForm}
										setItemForm={setItemForm}
										handleSaveItem={handleSaveItem}
										dayNames={dayNames}
										eventTypes={eventTypes}
										renderIcon={renderIcon}
										getTypeLabel={getTypeLabel}
										onClose={() => setShowAddPopover(false)}
									/>
								</PopoverContent>
							</Popover>

							<Button
								variant="outline"
								size="icon"
								onClick={() => setSoundEnabled(!soundEnabled)}
								className={cn(
									"transition-all shadow-lg rounded-md  h-11 w-11 border-2",
									soundEnabled && "bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 border-emerald-300"
								)}
							>
								{soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
							</Button>

							<Button
								variant="outline"
								size="icon"
								onClick={() => setShowSettingsDialog(true)}
								className="shadow-lg rounded-md  h-11 w-11 border-2 hover:bg-gradient-to-br hover:from-gray-100 hover:to-gray-200"
							>
								<Settings className="h-5 w-5" />
							</Button>
						</div>
					</div>
				</div>

				{/* Add Type Drawer */}
				<div
					className={cn(
						"bg-gradient-to-b from-white via-[var(--color-primary-50)]/20 to-white transition-all duration-300 w-96 flex flex-col fixed top-0 bottom-0 z-50 shadow-2xl",
						isRTL ? "border-r-2 right-0" : "border-l-2 left-0",
						showAddTypeDrawer ? "translate-x-0" : isRTL ? "translate-x-full" : "-translate-x-full"
					)}
				>
					<div className="p-6 border-b-2 theme-soft-border bg-gradient-to-r from-[var(--color-primary-100)]/50 to-[var(--color-secondary-100)]/50">
						<div className="flex items-center justify-between mb-4">
							<h2 className=" text-2xl font-black text-gray-900 flex items-center gap-2">
								<LayoutGrid className="h-6 w-6" />
								{t("manageTypes")}
							</h2>
							<Button variant="ghost" size="icon" onClick={() => setShowAddTypeDrawer(false)} className="rounded-md ">
								<X className="h-5 w-5" />
							</Button>
						</div>
					</div>

					<div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
						<div className="space-y-2 mb-6">
							<h3 className="text-sm font-black text-gray-700 mb-3 flex items-center gap-2">
								<Star className="h-4 w-4 text-yellow-500" />
								{t("allTypes")}
							</h3>

							{eventTypes.map((type) => (
								<div key={type.id} className="flex items-center gap-2 group">
									<Button
										variant="ghost"
										className={cn(
											"flex-1 justify-start rounded-md  transition-all h-12",
											selectedType === type.id && "bg-gradient-to-r from-[var(--color-primary-100)] to-[var(--color-secondary-100)] shadow-md font-black"
										)}
										onClick={() => {
											setSelectedType(type.id);
											setShowAddTypeDrawer(false);
										}}
									>
										{renderIcon(type.icon, "h-5 w-5 mr-2")}
										<span className="flex-1 text-left font-bold">{getTypeLabel(type)}</span>
										<span className="font-en text-xs theme-gradient-bg text-white px-2 py-1 rounded-full font-black">
											{getItemCountByType(type.id)}
										</span>
									</Button>

									{type.custom && (
										<Button
											variant="ghost"
											size="icon"
											className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md "
											onClick={() => handleDeleteType(type.id)}
										>
											<Trash2 className="h-4 w-4 text-red-500" />
										</Button>
									)}
								</div>
							))}
						</div>

						<Card className="p-5 space-y-4 border-2 shadow-xl border-dashed theme-soft-border bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-secondary-50)] rounded-md ">
							<h3 className="text-sm font-black theme-primary-text flex items-center gap-2">
								<Plus className="h-4 w-4" />
								{t("createNewType")}
							</h3>

							<Input
								placeholder={t("typeName")}
								value={newTypeName}
								onChange={(e) => setNewTypeName(e.target.value)}
								className="rounded-md  border-2 h-11 font-medium"
							/>

							<div>
								<Label className="text-xs mb-2 block font-bold text-gray-700">{t("selectIcon")}</Label>
								<div className="grid grid-cols-7 gap-2">
									{ICON_OPTIONS.map((iconOption) => (
										<button
											key={iconOption.value}
											type="button"
											onClick={() => setNewTypeIcon(iconOption.value)}
											className={cn(
												"p-2 rounded-md  hover:bg-[var(--color-primary-100)] transition-all flex items-center justify-center border-2",
												newTypeIcon === iconOption.value && "theme-gradient-bg theme-ring shadow-lg"
											)}
											aria-label={iconOption.label}
											title={iconOption.label}
										>
											<iconOption.Icon className={cn("h-5 w-5", newTypeIcon === iconOption.value && "text-white")} />
										</button>
									))}
								</div>
							</div>

							<div>
								<Label className="text-xs mb-2 block font-bold text-gray-700">{t("selectColor")}</Label>
								<div className="grid grid-cols-6 gap-2">
									{COLOR_OPTIONS.map((color) => (
										<button
											key={color.value}
											type="button"
											onClick={() => setNewTypeColor(color.value)}
											className={cn(
												"w-12 h-12 rounded-md  transition-all shadow-md hover:shadow-xl",
												color.value,
												newTypeColor === color.value && "ring-4 ring-offset-2 theme-ring scale-110"
											)}
											aria-label={t(color.nameKey)}
											title={t(color.nameKey)}
										/>
									))}
								</div>
							</div>

							<Button
								onClick={handleAddType}
								className="w-full theme-gradient-bg text-white rounded-md  h-12 font-black shadow-lg hover:shadow-xl transition-all"
								disabled={!newTypeName.trim()}
							>
								<Check className="h-5 w-5 mr-2" />
								{t("add")}
							</Button>
						</Card>
					</div>
				</div>

				{/* Day Slide Panel */}
				<div
					className={cn(
						"bg-gradient-to-b from-white via-[var(--color-primary-50)]/30 to-white transition-all duration-300 w-[550px] flex flex-col fixed top-0 bottom-0 z-50 shadow-2xl border-l-2",
						isRTL ? "border-r-2 border-l-0 left-0" : "right-0",
						showDaySlidePanel ? "translate-x-0" : isRTL ? "-translate-x-full" : "translate-x-full"
					)}
					style={{ borderColor: `var(--color-primary-300)` }}
				>
					{selectedDate && (
						<>
							{/* Header */}
							<div className="relative p-8 pb-6 overflow-hidden theme-gradient-bg shadow-2xl">
								<div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
								<div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24 blur-2xl" />
								<div className="absolute top-1/2 left-1/2 w-32 h-32 bg-yellow-300/20 rounded-full blur-2xl animate-pulse" />

								<div className="relative z-10">
									<div className="flex items-start justify-between mb-6">
										<div className="flex items-center gap-4">
											<div className="bg-white/20 backdrop-blur-md rounded-md  p-5 shadow-2xl border-2 border-white/30">
												<h2 className="text-6xl font-black text-white drop-shadow-2xl">{selectedDate.getDate()}</h2>
											</div>
											<div>
												<p className="text-white/90 text-sm font-bold mb-1">{dayNames[selectedDate.getDay()]}</p>
												<p className="text-white text-xl font-black drop-shadow-lg">
													{monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
												</p>
											</div>
										</div>

										<Button
											variant="ghost"
											size="icon"
											onClick={() => setShowDaySlidePanel(false)}
											className="rounded-md  hover:bg-white/20 text-white h-11 w-11 backdrop-blur-sm"
										>
											<X className="h-6 w-6" />
										</Button>
									</div>

									{/* Progress */}
									{(() => {
										const progress = getProgressForDate(selectedDate);
										if (progress.total <= 0) return null;

										return (
											<div className="bg-white/90 backdrop-blur-xl rounded-md  p-5 shadow-2xl border-2 border-white/40">
												<div className="flex items-center gap-4">
													<div className="relative w-20 h-20 flex-shrink-0">
														<div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary-200)] to-[var(--color-secondary-200)] rounded-full blur-lg opacity-60 animate-pulse" />
														<svg className="w-20 h-20 transform -rotate-90 relative z-10">
															<circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="6" fill="none" className="text-[var(--color-primary-200)]" />
															<circle
																cx="40"
																cy="40"
																r="34"
																stroke="url(#side-progress-gradient)"
																strokeWidth="7"
																fill="none"
																strokeDasharray={`${2 * Math.PI * 34}`}
																strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress.percentage / 100)}`}
																className="transition-all duration-500 filter drop-shadow-lg"
																strokeLinecap="round"
															/>
															<defs>
																<linearGradient id="side-progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
																	<stop offset="0%" stopColor="var(--color-gradient-from)" />
																	<stop offset="50%" stopColor="var(--color-gradient-via)" />
																	<stop offset="100%" stopColor="var(--color-gradient-to)" />
																</linearGradient>
															</defs>
														</svg>
														<div className="absolute inset-0 flex items-center justify-center">
															<span className="text-2xl font-black theme-gradient-text">
																{progress.percentage}%
															</span>
														</div>
													</div>

													<div className="flex-1">
														<div className="flex items-center justify-between mb-2">
															<span className="text-sm font-black text-gray-700">{t("progress")}</span>
															<span className="text-sm font-black px-4 py-1.5 rounded-full shadow-md bg-gradient-to-r from-[var(--color-primary-200)] to-[var(--color-secondary-200)] theme-primary-text">
																{progress.completed}/{progress.total}
															</span>
														</div>

														<div className="text-xs text-gray-600 font-bold">
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
							<div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 scrollbar-thin">
								{(() => {
									const itemsForDate = getItemsForDate(selectedDate);
									const filtered = selectedType === "all" ? itemsForDate : itemsForDate.filter((it) => it.type === selectedType);
									const dateStr = getDateString(selectedDate);

									if (filtered.length === 0) {
										return (
											<div className="flex items-center justify-center h-full py-12">
												<div className="text-center max-w-md px-6">
													<div className="relative inline-block mb-8">
														<div className="absolute inset-0 animate-pulse">
															<div className="w-36 h-36 mx-auto rounded-full opacity-20 blur-3xl theme-gradient-bg" />
														</div>

														<div className="relative w-36 h-36 mx-auto rounded-md  flex items-center justify-center shadow-2xl theme-gradient-bg">
															<CalendarIcon className="h-20 w-20 text-white drop-shadow-2xl" />
														</div>
													</div>

													<h3 className="text-3xl font-black mb-3 theme-gradient-text">
														{t("noTasksTitle")}
													</h3>
													<p className="text-gray-600 mb-8 text-sm leading-relaxed font-medium">{t("noTasksDesc")}</p>

													<Button
														size="lg"
														className="shadow-2xl hover:shadow-3xl transition-all hover:-translate-y-1 font-black px-8 rounded-md  theme-gradient-bg text-white h-14 text-base"
														onClick={() => {
															resetItemForm();
															setItemForm((prev) => ({ ...prev, startDate: dateStr }));
															setShowAddPopover(true);
														}}
													>
														<Plus className="h-6 w-6 mr-2" />
														{t("createFirstTask")}
													</Button>
												</div>
											</div>
										);
									}

									return (
										<div className="space-y-4">
											{filtered.map((item, index) => {
												const type = eventTypes.find((tt) => tt.id === item.type);
												const completed = isItemCompleted(item.id, selectedDate);
												const popoverKey = getItemPopoverKey(item.id, dateStr);

												const recurrenceLabel =
													item.recurrence === "none"
														? ""
														: item.recurrence === "every_x_days"
															? t("everyXDaysLabel", { count: item.recurrenceInterval })
															: t(`recurrenceLabels.${item.recurrence}`);

												return (
													<div
														key={item.id}
														className={cn(
															"group relative overflow-hidden rounded-md  transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] border-2",
															completed && "opacity-60",
															type?.border
														)}
														style={{
															animation: `slideIn 0.4s ease-out ${index * 0.08}s both`,
														}}
													>
														<div className={cn("absolute inset-0", type?.color)} />

														<div className="relative p-5">
															<div className="flex items-center gap-4">
																<button
																	onClick={() => toggleCompletion(item.id, selectedDate)}
																	className="flex-shrink-0 transition-transform hover:scale-110"
																>
																	{completed ? (
																		<div className="relative">
																			<CheckCircle2 className="h-8 w-8 text-emerald-600 drop-shadow-lg" />
																			<div className="absolute inset-0 bg-emerald-400/40 rounded-full blur-lg animate-pulse" />
																		</div>
																	) : (
																		<div className={cn("h-8 w-8 rounded-full border-4 transition-all shadow-lg", "border-gray-300 hover:border-[var(--color-primary-400)]")} />
																	)}
																</button>

																<div className="flex-1 flex items-center gap-3 min-w-0">
																	<div className={cn("p-3 rounded-md  shadow-md flex-shrink-0", type?.color, "ring-2 ring-white/50")}>
																		{renderIcon(type?.icon, cn("h-5 w-5", type?.textColor))}
																	</div>

																	<div className="flex-1 min-w-0">
																		<MultiLangText className={cn("font-black text-lg mb-2", type?.textColor, completed && "line-through opacity-60")}>
																			{item.title}
																		</MultiLangText>

																		{(item.startTime || item.recurrence !== "none") && (
																			<div className="flex items-center gap-2 flex-wrap">
																				{item.startTime && (
																					<div className="font-en inline-flex items-center gap-1.5 text-xs font-black bg-white/70 backdrop-blur-sm px-3 py-1.5 rounded-md  shadow-md">
																						<Clock className="h-3.5 w-3.5" />
																						{formatTime(item.startTime)}
																					</div>
																				)}

																				{item.recurrence !== "none" && (
																					<div className="inline-flex items-center gap-1.5 text-xs font-black bg-white/70 backdrop-blur-sm px-3 py-1.5 rounded-md  shadow-md">
																						<Repeat className="h-3.5 w-3.5" />
																						{recurrenceLabel}
																					</div>
																				)}
																			</div>
																		)}
																	</div>
																</div>

																{/* Actions */}
																<div className="flex items-center gap-2">
																	<Popover
																		open={editingPopoverId === popoverKey}
																		onOpenChange={(open) => {
																			if (!open) {
																				setEditingPopoverId(null);
																				setEditingItem(null);
																				resetItemForm();
																			}
																		}}
																	>
																		<PopoverTrigger asChild>
																			<Button
																				variant="ghost"
																				size="icon"
																				className="h-10 w-10 rounded-md  bg-white/90 hover:bg-white shadow-lg backdrop-blur-sm"
																				onClick={() => openEditPopover(item, dateStr)}
																			>
																				<Pencil className="h-4 w-4 text-blue-600" />
																			</Button>
																		</PopoverTrigger>

																		<PopoverContent
																			className="w-96 p-0 rounded-md  shadow-2xl border-2"
																			side={isRTL ? "left" : "right"}
																			align="start"
																			sideOffset={10}
																			onOpenAutoFocus={(e) => e.preventDefault()}
																		>
																			<ItemFormContent
																				t={t}
																				isRTL={isRTL}
																				editingItem={editingItem}
																				itemForm={itemForm}
																				setItemForm={setItemForm}
																				handleSaveItem={handleSaveItem}
																				dayNames={dayNames}
																				eventTypes={eventTypes}
																				renderIcon={renderIcon}
																				getTypeLabel={getTypeLabel}
																				onClose={() => {
																					setEditingPopoverId(null);
																					setEditingItem(null);
																					resetItemForm();
																				}}
																			/>
																		</PopoverContent>
																	</Popover>

																	<Button
																		variant="ghost"
																		size="icon"
																		className="h-10 w-10 rounded-md  bg-white/90 hover:bg-white shadow-lg backdrop-blur-sm"
																		onClick={() => handleDeleteItem(item)}
																	>
																		<Trash2 className="h-4 w-4 text-red-600" />
																	</Button>
																</div>
															</div>
														</div>

														<div className={cn("h-1.5 w-full", completed ? "bg-emerald-400" : "theme-gradient-bg")} />
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
					<div className="mt-4 px-4">{renderMonthView()}</div>
				</div>
			</div>

			{/* Settings Dialog */}
			<Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
				<DialogContent className="max-w-md rounded-md  border-2" dir={isRTL ? "rtl" : "ltr"}>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-2xl font-black">
							<Settings className="h-6 w-6" />
							{t("settings")}
						</DialogTitle>
					</DialogHeader>

					<div className="space-y-6">
						<div className="flex items-center justify-between p-4 bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-secondary-50)] rounded-md  border-2 theme-soft-border">
							<div className="space-y-0.5">
								<Label className="text-base font-bold">{t("showWeekNumbers")}</Label>
								<p className="text-sm text-gray-600 font-medium">{t("showWeekNumbersDesc")}</p>
							</div>
							<Switch checked={settings.showWeekNumbers} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, showWeekNumbers: checked }))} />
						</div>

						<div className="flex items-center justify-between p-4 bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-secondary-50)] rounded-md  border-2 theme-soft-border">
							<div className="space-y-0.5">
								<Label className="text-base font-bold">{t("highlightWeekend")}</Label>
								<p className="text-sm text-gray-600 font-medium">{t("highlightWeekendDesc")}</p>
							</div>
							<Switch checked={settings.highlightWeekend} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, highlightWeekend: checked }))} />
						</div>

						<div className="flex items-center justify-between p-4 bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-secondary-50)] rounded-md  border-2 theme-soft-border">
							<div className="space-y-0.5">
								<Label className="text-base font-bold">{t("confirmBeforeDelete")}</Label>
								<p className="text-sm text-gray-600 font-medium">{t("confirmBeforeDeleteDesc")}</p>
							</div>
							<Switch checked={settings.confirmBeforeDelete} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, confirmBeforeDelete: checked }))} />
						</div>

						<div className="space-y-3 p-4 bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-secondary-50)] rounded-md  border-2 theme-soft-border">
							<Label className="text-base font-bold">{t("startOfWeek")}</Label>
							<p className="text-sm text-gray-600 mb-2 font-medium">{t("startOfWeekDesc")}</p>
							<Select value={settings.startOfWeek.toString()} onValueChange={(value) => setSettings((prev) => ({ ...prev, startOfWeek: parseInt(value, 10) }))}>
								<SelectTrigger className="rounded-md  border-2">
									<SelectValue />
								</SelectTrigger>
								<SelectContent className="rounded-md ">
									<SelectItem value="0" className="rounded-lg my-1">{t("sunday")}</SelectItem>
									<SelectItem value="1" className="rounded-lg my-1">{t("monday")}</SelectItem>
									<SelectItem value="6" className="rounded-lg my-1">{t("saturday")}</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<DialogFooter>
						<Button
							onClick={() => setShowSettingsDialog(false)}
							className="w-full theme-gradient-bg text-white rounded-md  h-12 font-black shadow-lg"
						>
							{t("close")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
				<DialogContent dir={isRTL ? "rtl" : "ltr"} className="rounded-md  border-2">
					<DialogHeader>
						<DialogTitle className="text-2xl font-black">{t("confirmDelete")}</DialogTitle>
					</DialogHeader>

					<p className="text-gray-700 font-medium text-lg">
						{t("areYouSureDelete")} "<span className="font-black">{itemToDelete?.title}</span>"?
					</p>

					<DialogFooter className="gap-2">
						<Button
							variant="outline"
							onClick={() => setShowDeleteConfirm(false)}
							className="rounded-md  h-12 font-bold border-2"
						>
							{t("cancel")}
						</Button>
						<Button
							variant="destructive"
							onClick={() => confirmDelete()}
							className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 rounded-md  h-12 font-black shadow-lg"
						>
							{t("delete")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
		</div>
	);
}

// CountdownTimer component (using theme colors)
function CountdownTimer() {
	const t = useTranslations("commitment");
	const locale = useLocale();
	const isRTL = locale === "ar";

	const [startTime, setStartTime] = useState(null);
	const [isRunning, setIsRunning] = useState(false);
	const [elapsed, setElapsed] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [selectedDate, setSelectedDate] = useState("");

	useEffect(() => {
		const savedStart = localStorage.getItem("commitmentStartTime");
		const savedRunning = localStorage.getItem("commitmentIsRunning");

		if (savedStart) {
			setStartTime(parseInt(savedStart, 10));
			setIsRunning(savedRunning === "true");
		}
	}, []);

	useEffect(() => {
		const now = new Date();
		setSelectedDate(now.toISOString().slice(0, 16));
	}, []);

	useEffect(() => {
		if (startTime) localStorage.setItem("commitmentStartTime", startTime.toString());
		localStorage.setItem("commitmentIsRunning", isRunning.toString());
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
				seconds: Math.floor((distance % (1000 * 60)) / 1000),
			});
		}, 1000);

		return () => clearInterval(interval);
	}, [isRunning, startTime]);

	const handleStart = () => setShowDatePicker(true);

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

	const handlePause = () => setIsRunning(false);

	const handleReset = () => {
		setStartTime(null);
		setIsRunning(false);
		setElapsed({ days: 0, hours: 0, minutes: 0, seconds: 0 });
		localStorage.removeItem("commitmentStartTime");
		localStorage.removeItem("commitmentIsRunning");
	};

	const formatTime = (num) => String(num).padStart(2, "0");

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
			<div className=" opacity-30 absolute inset-0 rounded-md  blur-xl  group-hover:opacity-80 transition-opacity animate-pulse theme-gradient-bg" style={{ animationDuration: "3s" }} />

			<div className="relative rounded-md  px-4 py-3 shadow-2xl overflow-hidden theme-gradient-bg">
				<div className="absolute inset-0 opacity-20">
					<div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: "0s", animationDuration: "4s" }} />
					<div className="absolute bottom-0 left-0 w-20 h-20 bg-white rounded-full blur-2xl animate-pulse" style={{ animationDelay: "2s", animationDuration: "5s" }} />
				</div>

				<div className="relative flex items-center gap-3">
					{!startTime ? (
						<button
							onClick={handleStart}
							className="flex-shrink-0 w-10 h-10 rounded-md  bg-white/25 hover:bg-white/35 backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-xl border-2 border-white/30"
							title={t("startCommitment")}
						>
							<Play className="h-5 w-5 text-white drop-shadow-2xl ml-0.5" />
						</button>
					) : (
						<div className="flex items-center gap-2">
							<button
								onClick={isRunning ? handlePause : () => setIsRunning(true)}
								className="flex-shrink-0 w-9 h-9 rounded-md  bg-white/25 hover:bg-white/35 backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-xl border-2 border-white/30"
								title={isRunning ? t("pause") : t("resume")}
							>
								{isRunning ? <Pause className="h-4 w-4 text-white drop-shadow-2xl" /> : <Play className="h-4 w-4 text-white drop-shadow-2xl ml-0.5" />}
							</button>

							<button
								onClick={handleReset}
								className="flex-shrink-0 w-9 h-9 rounded-md  bg-white/25 hover:bg-red-400/40 backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-xl border-2 border-white/30"
								title={t("reset")}
							>
								<RotateCcw className="h-4 w-4 text-white drop-shadow-2xl" />
							</button>
						</div>
					)}

					{startTime && (
						<div className="flex items-center gap-2">
							{elapsed.days > 0 && (
								<div className="flex flex-col items-center group/circle">
									<div className="relative w-11 h-11">
										<div className="absolute inset-0 rounded-full bg-white/30 blur-md group-hover/circle:bg-white/40 transition-colors" />
										<svg className="w-11 h-11 transform -rotate-90 relative z-10">
											<circle cx="22" cy="22" r="18" stroke="currentColor" strokeWidth="2.5" fill="none" className="text-white/40" />
											<circle
												cx="22"
												cy="22"
												r="18"
												stroke="currentColor"
												strokeWidth="3"
												fill="none"
												strokeDasharray={`${2 * Math.PI * 18}`}
												strokeDashoffset={`${2 * Math.PI * 18 * (1 - (elapsed.days % 365) / 365)}`}
												className="text-white transition-all duration-1000 drop-shadow-2xl"
												strokeLinecap="round"
											/>
										</svg>
										<div className="absolute inset-0 flex gap-[2px]  items-center justify-center">
											<span className="text-sm font-black text-white font-en drop-shadow-2xl">{formatTime(elapsed.days)}</span>
											<span className="text-[6px] text-white/95 font-black mt-1 tracking-wider drop-shadow-lg">{t("days")}</span>
										</div>
									</div>
								</div>
							)}

							<div className="flex flex-col items-center group/circle">
								<div className="relative w-11 h-11">
									<div className="absolute inset-0 rounded-full bg-white/30 blur-md group-hover/circle:bg-white/40 transition-colors" />
									<svg className="w-11 h-11 transform -rotate-90 relative z-10">
										<circle cx="22" cy="22" r="18" stroke="currentColor" strokeWidth="2.5" fill="none" className="text-white/40" />
										<circle
											cx="22"
											cy="22"
											r="18"
											stroke="currentColor"
											strokeWidth="3"
											fill="none"
											strokeDasharray={`${2 * Math.PI * 18}`}
											strokeDashoffset={`${2 * Math.PI * 18 * (1 - elapsed.hours / 24)}`}
											className="text-white transition-all duration-1000 drop-shadow-2xl"
											strokeLinecap="round"
										/>
									</svg>
									<div className="absolute inset-0 flex gap-[2px] items-center justify-center">
										<span className="text-sm font-black text-white font-en drop-shadow-2xl">{formatTime(elapsed.hours)}</span>
										<span className="text-[6px] text-white/95 font-black mt-1 tracking-wider drop-shadow-lg">{t("hours")}</span>
									</div>
								</div>
							</div>

							<div className="flex flex-col items-center group/circle">
								<div className="relative w-11 h-11">
									<div className="absolute inset-0 rounded-full bg-white/30 blur-md group-hover/circle:bg-white/40 transition-colors" />
									<svg className="w-11 h-11 transform -rotate-90 relative z-10">
										<circle cx="22" cy="22" r="18" stroke="currentColor" strokeWidth="2.5" fill="none" className="text-white/40" />
										<circle
											cx="22"
											cy="22"
											r="18"
											stroke="currentColor"
											strokeWidth="3"
											fill="none"
											strokeDasharray={`${2 * Math.PI * 18}`}
											strokeDashoffset={`${2 * Math.PI * 18 * (1 - elapsed.minutes / 60)}`}
											className="text-white transition-all duration-1000 drop-shadow-2xl"
											strokeLinecap="round"
										/>
									</svg>
									<div className="absolute inset-0 gap-[2px]  flex items-center justify-center">
										<span className="text-sm font-black text-white font-en drop-shadow-2xl">{formatTime(elapsed.minutes)}</span>
										<span className="text-[6px] text-white/95 font-black mt-1 tracking-wider drop-shadow-lg">{t("minutes")}</span>
									</div>
								</div>
							</div>

							{milestone && (
								<div className="relative ml-1">
									<div className="absolute inset-0 blur-lg opacity-60" style={{ background: `linear-gradient(135deg, ${milestone.color})` }} />
									<div
										className="relative w-10 h-10 rounded-md  flex items-center justify-center shadow-2xl border-2 border-white/40"
										style={{ background: `linear-gradient(135deg, #FBBF24, #F59E0B)` }}
										title={milestone.text}
									>
										<milestone.icon className="h-5 w-5 text-white drop-shadow-2xl animate-pulse" />
									</div>
								</div>
							)}
						</div>
					)}

					{!startTime && (
						<div className="flex items-center gap-2 px-3">
							<Zap className="h-4 w-4 text-white/95 animate-pulse drop-shadow-lg" />
							<span className="text-sm font-black text-white/95 drop-shadow-lg">{t("startCommitment")}</span>
						</div>
					)}
				</div>
			</div>

			{showDatePicker &&
				createPortal(
					<>
						<div className="fixed inset-0 bg-black/60 backdrop-blur-lg z-[9999] animate-in fade-in duration-200" onClick={() => setShowDatePicker(false)} />
						<div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] animate-in zoom-in-95 fade-in duration-300">
							<div className="bg-white rounded-md  shadow-2xl p-8 w-[440px] border-2 relative overflow-hidden theme-soft-border" dir={isRTL ? "rtl" : "ltr"}>
								<div className="absolute top-0 right-0 w-64 h-64 opacity-10 theme-gradient-bg" />

								<div className="relative flex items-center gap-4 mb-8">
									<div className="relative">
										<div className="absolute inset-0 rounded-md  blur-xl opacity-60 theme-gradient-bg" />
										<div className="relative w-16 h-16 rounded-md  flex items-center justify-center shadow-2xl theme-gradient-bg">
											<Calendar className="h-8 w-8 text-white drop-shadow-2xl" />
										</div>
									</div>
									<div className="flex-1">
										<h3 className="text-2xl font-black text-gray-900 mb-1">{t("dialog.title")}</h3>
										<p className="text-sm text-gray-600 font-bold">{t("dialog.subtitle")}</p>
									</div>
								</div>

								<div className="space-y-4 mb-8">
									<button
										onClick={handleStartFromNow}
										className="w-full p-5 rounded-md  border-2 transition-all hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden theme-soft-border bg-gradient-to-r from-[var(--color-primary-50)] to-white"
									>
										<div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000">
											<div className="h-full w-1/2 bg-gradient-to-r from-transparent via-[var(--color-primary-200)]/60 to-transparent skew-x-12" />
										</div>

										<div className="relative flex items-center justify-between">
											<div className="text-left">
												<div className="font-black text-gray-900 mb-1.5 text-lg">{t("dialog.startNow")}</div>
												<div className="text-sm text-gray-600 font-bold">{t("dialog.startNowDesc")}</div>
											</div>
											<div className="relative">
												<div className="absolute inset-0 blur-lg opacity-50 group-hover:opacity-75 transition-opacity theme-gradient-bg" />
												<div className="relative w-14 h-14 rounded-md  flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl theme-gradient-bg">
													<Play className="h-7 w-7 text-white ml-0.5 drop-shadow-2xl" />
												</div>
											</div>
										</div>
									</button>

									<div className="relative">
										<div className="absolute inset-0 flex items-center">
											<div className="w-full border-t-2 border-gray-200"></div>
										</div>
										<div className="relative flex justify-center">
											<span className="px-4 bg-white text-sm font-black text-gray-400 uppercase tracking-wider">{t("dialog.or")}</span>
										</div>
									</div>

									<div className="space-y-4">
										<label className="block">
											<div className="flex items-center gap-2 mb-3">
												<Calendar className="h-4 w-4 text-gray-600" />
												<span className="text-sm font-black text-gray-700">{t("dialog.customDate")}</span>
											</div>
											<input
												type="datetime-local"
												value={selectedDate}
												onChange={(e) => setSelectedDate(e.target.value)}
												max={new Date().toISOString().slice(0, 16)}
												className="w-full px-4 py-4 border-2 rounded-md  text-sm font-bold focus:outline-none focus:ring-4 transition-all shadow-md hover:shadow-lg theme-soft-border"
												style={{ "--tw-ring-color": "var(--color-primary-300)" }}
											/>
										</label>

										<button
											onClick={handleStartFromDate}
											disabled={!selectedDate}
											className="w-full py-4 rounded-md  font-black text-white transition-all hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-base relative overflow-hidden group theme-gradient-bg"
										>
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

								<button onClick={() => setShowDatePicker(false)} className="w-full py-3 text-sm font-black text-gray-500 hover:text-gray-900 transition-colors rounded-md  hover:bg-gray-50">
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