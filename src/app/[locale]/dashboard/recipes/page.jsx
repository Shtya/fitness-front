"use client"
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
	Search, Plus, Pencil, Trash2, X, Clock, Users, BarChart2,
	ChefHat, Flame, Beef, Wheat, Droplets, BookOpen, Lightbulb,
	ArrowRight, LayoutGrid, SlidersHorizontal
} from "lucide-react";
import { useTranslations } from "next-intl";

/* ─── constants ─── */
const categories = ["Breakfast", "Lunch", "Dinner", "Snack", "Drink", "Dessert"];
const units = ["g", "ml", "pcs", "pc", "tsp", "tbsp", "slices", "cups", "cloves", "pinch"];
const satietyLevels = ["Low", "Medium", "High"];

const CAT_META = {
	Breakfast: { color: "#E8956D", bg: "#FEF3EC", icon: "🌅" },
	Lunch: { color: "#5B8A5F", bg: "#EEF6EF", icon: "☀️" },
	Dinner: { color: "#6B5EA8", bg: "#F0EEF9", icon: "🌙" },
	Snack: { color: "#C4943A", bg: "#FBF3E3", icon: "🍎" },
	Drink: { color: "#4A90B8", bg: "#EBF4FA", icon: "🥤" },
	Dessert: { color: "#C4627A", bg: "#FCEEF1", icon: "🍮" },
};

const SEED = [
	{ id: 1, name: "Avocado Toast", category: "Breakfast", servings: 1, time: 10, calories: 320, satiety: "Medium", image: "https://images.unsplash.com/photo-1603046891744-1f057bd8a0ff?w=600&q=80", ingredients: [{ name: "Sourdough bread", amount: "2", unit: "slices" }, { name: "Avocado", amount: "1", unit: "pc" }, { name: "Lemon juice", amount: "1", unit: "tsp" }, { name: "Sea salt", amount: "1", unit: "pinch" }], macros: { carbs: 38, protein: 8, fats: 18 }, tips: "Add a poached egg for extra protein." },
	{ id: 2, name: "Grilled Salmon Bowl", category: "Lunch", servings: 1, time: 25, calories: 520, satiety: "High", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80", ingredients: [{ name: "Salmon fillet", amount: "180", unit: "g" }, { name: "Brown rice", amount: "150", unit: "g" }, { name: "Spinach", amount: "60", unit: "g" }, { name: "Sesame oil", amount: "1", unit: "tbsp" }], macros: { carbs: 45, protein: 38, fats: 16 }, tips: "Marinate salmon in miso for 20 minutes beforehand." },
	{ id: 3, name: "Berry Protein Smoothie", category: "Drink", servings: 1, time: 5, calories: 280, satiety: "Medium", image: "https://images.unsplash.com/photo-1570696516188-ade861b84a49?w=600&q=80", ingredients: [{ name: "Mixed berries", amount: "150", unit: "g" }, { name: "Greek yogurt", amount: "100", unit: "g" }, { name: "Almond milk", amount: "200", unit: "ml" }, { name: "Protein powder", amount: "30", unit: "g" }], macros: { carbs: 32, protein: 28, fats: 4 }, tips: "Freeze berries overnight for a thicker texture." },
	{ id: 4, name: "Chicken & Quinoa", category: "Dinner", servings: 2, time: 35, calories: 480, satiety: "High", image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&q=80", ingredients: [{ name: "Chicken breast", amount: "300", unit: "g" }, { name: "Quinoa", amount: "120", unit: "g" }, { name: "Cherry tomatoes", amount: "100", unit: "g" }, { name: "Olive oil", amount: "2", unit: "tbsp" }], macros: { carbs: 42, protein: 44, fats: 14 }, tips: "Rest chicken 5 min before slicing to keep juicy." },
	{ id: 5, name: "Greek Yogurt Parfait", category: "Snack", servings: 1, time: 5, calories: 210, satiety: "Medium", image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80", ingredients: [{ name: "Greek yogurt", amount: "200", unit: "g" }, { name: "Granola", amount: "40", unit: "g" }, { name: "Honey", amount: "1", unit: "tbsp" }, { name: "Blueberries", amount: "60", unit: "g" }], macros: { carbs: 28, protein: 18, fats: 5 }, tips: "Layer ingredients just before eating to keep granola crunchy." },
	{ id: 6, name: "Dark Chocolate Mousse", category: "Dessert", servings: 2, time: 15, calories: 340, satiety: "Low", image: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=600&q=80", ingredients: [{ name: "Dark chocolate 70%", amount: "100", unit: "g" }, { name: "Coconut cream", amount: "150", unit: "ml" }, { name: "Maple syrup", amount: "2", unit: "tbsp" }, { name: "Vanilla extract", amount: "1", unit: "tsp" }], macros: { carbs: 30, protein: 4, fats: 22 }, tips: "Chill for at least 2 hours for the best texture." },
];

const emptyMeal = { name: "", category: "Breakfast", servings: 1, time: 10, calories: 0, satiety: "Medium", image: "", ingredients: [{ name: "", amount: "", unit: "g" }], macros: { carbs: 0, protein: 0, fats: 0 }, tips: "" };

/* ─── helpers ─── */
const catColor = (c) => CAT_META[c]?.color || "#888";
const catBg = (c) => CAT_META[c]?.bg || "#f5f5f5";
const catIcon = (c) => CAT_META[c]?.icon || "🍽️";

function MacroBar({ val, max, color }) {
	return (
		<div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-primary-100)" }}>
			<div className="h-full rounded-full transition-all duration-500"
				style={{ width: `${Math.min(100, (val / max) * 100)}%`, background: color }} />
		</div>
	);
}

function StatPill({ icon: Icon, label, value, color }) {
	return (
		<div className="flex items-center gap-2 rounded-xl px-3 py-2 border"
			style={{ borderColor: "var(--color-primary-200)", background: "var(--color-primary-50)" }}>
			<Icon className="w-3.5 h-3.5" style={{ color }} />
			<span className="text-xs font-semibold" style={{ color: "var(--color-primary-700)" }}>{label}:</span>
			<span className="text-xs font-bold" style={{ color }}>{value}</span>
		</div>
	);
}

function Toast({ toast }) {
	if (!toast) return null;
	return (
		<div className="fixed top-5 end-5 z-[9999] flex items-center gap-3 rounded-xl px-5 py-3.5 text-sm font-semibold shadow-2xl"
			style={{
				background: toast.type === "error"
					? "linear-gradient(135deg, #C4627A, #a84d66)"
					: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))",
				color: "white",
				animation: "slideIn 0.25s ease",
				boxShadow: "0 8px 32px rgba(15,23,42,0.25)",
			}}>
			{toast.type === "error" ? <X className="w-4 h-4" /> : <ChefHat className="w-4 h-4" />}
			{toast.msg}
		</div>
	);
}

/* ═══════════════════════════════════════════════════════════
	 ADMIN PAGE
═══════════════════════════════════════════════════════════ */
export default function AdminPage() {
	const t = useTranslations("");

	const [meals, setMeals] = useState(SEED);
	const [form, setForm] = useState({ ...emptyMeal, ingredients: [{ name: "", amount: "", unit: "g" }] });
	const [editId, setEditId] = useState(null);
	const [activeTab, setActiveTab] = useState("list");
	const [search, setSearch] = useState("");
	const [filterCat, setFilterCat] = useState("All");
	const [toast, setToast] = useState(null);

	const showToast = (msg, type = "success") => {
		setToast({ msg, type });
		setTimeout(() => setToast(null), 2800);
	};

	const filtered = meals.filter(m =>
		(filterCat === "All" || m.category === filterCat) &&
		m.name.toLowerCase().includes(search.toLowerCase())
	);

	const handleIngredient = (i, field, val) => {
		const ing = [...form.ingredients];
		ing[i] = { ...ing[i], [field]: val };
		setForm(f => ({ ...f, ingredients: ing }));
	};

	const addIngredient = () => setForm(f => ({ ...f, ingredients: [...f.ingredients, { name: "", amount: "", unit: "g" }] }));
	const removeIngredient = (i) => setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, idx) => idx !== i) }));

	const handleSubmit = () => {
		if (!form.name.trim()) return showToast(t("library-admin.toast.name_required"), "error");
		if (editId !== null) {
			setMeals(m => m.map(x => x.id === editId ? { ...form, id: editId } : x));
			showToast(t("library-admin.toast.updated"));
		} else {
			setMeals(m => [...m, { ...form, id: Date.now() }]);
			showToast(t("library-admin.toast.added"));
		}
		setForm({ ...emptyMeal, ingredients: [{ name: "", amount: "", unit: "g" }] });
		setEditId(null);
		setActiveTab("list");
	};

	const startEdit = (meal) => { setForm({ ...meal }); setEditId(meal.id); setActiveTab("form"); };
	const deleteMeal = (id) => { setMeals(m => m.filter(x => x.id !== id)); showToast(t("library-admin.toast.removed")); };

	const resetForm = () => setForm({ ...emptyMeal, ingredients: [{ name: "", amount: "", unit: "g" }] });

	return (
		<div className="min-h-screen"  >
			<style>{`
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeUp  { from { transform: translateY(14px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

			<Toast toast={toast} />

 

			<div className="max-w-6xl mx-auto px-6 py-10">
				{/* ── Title ── */}
				<div className="mb-8">
					<p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-primary-500)" }}>
						{t("library-admin.title.eyebrow")}
					</p>
					<h1 className="text-4xl font-bold mb-1" style={{ color: "var(--color-primary-900)" }}>
						{t("library-admin.title.plain")}{" "}
						<span style={{
							background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))",
							WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent"
						}}>{t("library-admin.title.accent")}</span>
					</h1>
					<div className="h-0.5 w-12 rounded-full mt-3"
						style={{ background: "linear-gradient(to right, var(--color-gradient-from), var(--color-gradient-to))" }} />
				</div>

				{/* ── Tabs ── */}
				<div className="flex gap-1 mb-8 p-1 rounded-xl w-fit"
					style={{ background: "var(--color-primary-100)", border: "1px solid var(--color-primary-200)" }}>
					{[
						{ key: "list", label: t("library-admin.tabs.list", { count: meals.length }), icon: LayoutGrid },
						{ key: "form", label: editId ? t("library-admin.tabs.edit") : t("library-admin.tabs.add"), icon: editId ? Pencil : Plus },
					].map(({ key, label, icon: Icon }) => {
						const active = activeTab === key;
						return (
							<button key={key}
								onClick={() => {
									setActiveTab(key);
									if (key === "form" && editId === null) resetForm();
								}}
								className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
								style={{
									background: active ? "white" : "transparent",
									color: active ? "var(--color-primary-900)" : "var(--color-primary-500)",
									boxShadow: active ? "0 1px 4px rgba(15,23,42,0.1)" : "none",
								}}>
								<Icon className="w-3.5 h-3.5" />
								{label}
							</button>
						);
					})}
				</div>

				{/* ═══ LIST TAB ═══ */}
				{activeTab === "list" && (
					<div style={{ animation: "fadeUp 0.3s ease" }}>
						<div className="flex gap-3 mb-6 flex-wrap">
							<div className="relative flex-1 min-w-56">
								<Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--color-primary-400)" }} />
								<Input value={search} onChange={e => setSearch(e.target.value)}
									placeholder={t("library-admin.list.search_placeholder")}
									className="ps-9 h-10 rounded-xl border text-sm"
									style={{ borderColor: "var(--color-primary-200)" }} />
							</div>

							<Select value={filterCat} onValueChange={setFilterCat}>
								<SelectTrigger className="w-44 h-10 rounded-xl border text-sm" style={{ borderColor: "var(--color-primary-200)" }}>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="All">{t("library.categories.all")}</SelectItem>
									{categories.map(c => (
										<SelectItem key={c} value={c}>{catIcon(c)} {t(`library.categories.${c.toLowerCase()}`)}</SelectItem>
									))}
								</SelectContent>
							</Select>

							<Button
								onClick={() => { setActiveTab("form"); setEditId(null); resetForm(); }}
								className="h-10 px-5 rounded-xl text-sm font-semibold text-white"
								style={{ background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))" }}>
								<Plus className="w-4 h-4 me-1.5" /> {t("library-admin.list.new_meal")}
							</Button>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
							{filtered.map(meal => (
								<Card key={meal.id} className="overflow-hidden border group hover:-translate-y-1 transition-all duration-200"
									style={{ borderColor: "var(--color-primary-150, var(--color-primary-200))", boxShadow: "0 2px 12px rgba(15,23,42,0.06)" }}>
									<div className="relative h-44 overflow-hidden">
										<img src={meal.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80"}
											alt={meal.name}
											className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
										<div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(15,23,42,0.55) 0%, transparent 55%)" }} />
										<div className="absolute top-3 start-3">
											<span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"
												style={{ background: catColor(meal.category), color: "white" }}>
												{catIcon(meal.category)} {t(`library.categories.${meal.category.toLowerCase()}`)}
											</span>
										</div>
										<div className="absolute top-3 end-3 rounded-lg px-2.5 py-1" style={{ background: "rgba(15,23,42,0.75)" }}>
											<span className="text-sm font-bold" style={{ color: "var(--color-gradient-from)" }}>
												{meal.calories} {t("library.card.kcal")}
											</span>
										</div>
										<div className="absolute bottom-3 start-4 end-4">
											<h3 className="text-white text-base font-bold leading-tight drop-shadow">{meal.name}</h3>
										</div>
									</div>

									<CardContent className="p-4 space-y-4">
										<div className="flex flex-wrap gap-1.5">
											<StatPill icon={Clock} label={t("library-admin.card.time")} value={`${meal.time}${t("library.card.min_short", { defaultValue: "m" })}`} color="var(--color-primary-600)" />
											<StatPill icon={Users} label={t("library-admin.card.serves")} value={meal.servings} color="var(--color-primary-600)" />
											<StatPill icon={BarChart2} label={t("library-admin.card.satiety")} value={t(`library.satiety.${meal.satiety.toLowerCase()}`)} color={catColor(meal.category)} />
										</div>

										<div className="grid grid-cols-3 gap-2">
											{[
												[t("library-admin.card.macro_c"), meal.macros.carbs, "#E8956D"],
												[t("library-admin.card.macro_p"), meal.macros.protein, "#5B8A5F"],
												[t("library-admin.card.macro_f"), meal.macros.fats, "#6B5EA8"],
											].map(([l, v, c]) => (
												<div key={l} className="rounded-lg p-2 text-center"
													style={{ background: c + "18", border: `1px solid ${c}30` }}>
													<div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: c }}>{l}</div>
													<div className="text-sm font-bold" style={{ color: "var(--color-primary-900)" }}>{v}g</div>
												</div>
											))}
										</div>

										<div>
											<p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--color-primary-400)" }}>
												{t("library.card.key_ingredients")} · {meal.ingredients.length}
											</p>
											<p className="text-xs leading-relaxed" style={{ color: "var(--color-primary-600)" }}>
												{meal.ingredients.slice(0, 3).map(i => i.name).join(", ")}
												{meal.ingredients.length > 3 && (
													<span style={{ color: "var(--color-gradient-from)" }}>
														{" "}+{meal.ingredients.length - 3} {t("library.card.more")}
													</span>
												)}
											</p>
										</div>

										<Separator style={{ borderColor: "var(--color-primary-100)" }} />

										<div className="flex gap-2">
											<Button variant="outline" size="sm" onClick={() => startEdit(meal)}
												className="flex-1 h-9 rounded-lg text-xs font-bold border transition-colors"
												style={{ borderColor: "var(--color-gradient-from)", color: "var(--color-gradient-from)" }}
												onMouseOver={e => { e.currentTarget.style.background = "var(--color-gradient-from)"; e.currentTarget.style.color = "white"; }}
												onMouseOut={e => { e.currentTarget.style.background = ""; e.currentTarget.style.color = "var(--color-gradient-from)"; }}>
												<Pencil className="w-3.5 h-3.5 me-1.5" /> {t("library-admin.card.edit")}
											</Button>
											<Button variant="outline" size="sm" onClick={() => deleteMeal(meal.id)}
												className="flex-1 h-9 rounded-lg text-xs font-bold border transition-colors hover:text-white hover:bg-rose-500 hover:border-rose-500"
												style={{ borderColor: "#fecaca", color: "#dc2626" }}>
												<Trash2 className="w-3.5 h-3.5 me-1.5" /> {t("library-admin.card.remove")}
											</Button>
										</div>
									</CardContent>
								</Card>
							))}

							{filtered.length === 0 && (
								<div className="col-span-full flex flex-col items-center py-20 gap-3">
									<div className="w-14 h-14 rounded-2xl grid place-items-center text-2xl"
										style={{ background: "var(--color-primary-100)" }}>🍽️</div>
									<p className="text-sm font-medium" style={{ color: "var(--color-primary-500)" }}>
										{t("library.empty.title")}
									</p>
								</div>
							)}
						</div>
					</div>
				)}

				{/* ═══ FORM TAB ═══ */}
				{activeTab === "form" && (
					<div style={{ animation: "fadeUp 0.3s ease" }}>
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-7">

							{/* ── Left column ── */}
							<div className="space-y-5">
								{/* Basic Info */}
								<Card className="border" style={{ borderColor: "var(--color-primary-200)", boxShadow: "0 2px 12px rgba(15,23,42,0.05)" }}>
									<CardHeader className="pb-3 border-b" style={{ borderColor: "var(--color-primary-100)" }}>
										<CardTitle className="text-base font-bold flex items-center gap-2" style={{ color: "var(--color-primary-900)" }}>
											<ChefHat className="w-4 h-4" style={{ color: "var(--color-gradient-from)" }} />
											{t("library-admin.form.basic_info")}
										</CardTitle>
									</CardHeader>
									<CardContent className="pt-5 space-y-4">
										<div>
											<Label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--color-primary-600)" }}>
												{t("library-admin.form.meal_name")}
											</Label>
											<Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
												placeholder={t("library-admin.form.meal_name_placeholder")}
												className="h-10 rounded-xl text-sm" style={{ borderColor: "var(--color-primary-200)" }} />
										</div>

										<div>
											<Label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--color-primary-600)" }}>
												{t("library-admin.form.image_url")}
											</Label>
											<Input value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
												placeholder="https://…"
												className="h-10 rounded-xl text-sm font-mono" style={{ borderColor: "var(--color-primary-200)" }} />
										</div>

										{form.image && (
											<div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--color-primary-200)" }}>
												<img src={form.image} alt="Preview" className="w-full h-32 object-cover"
													onError={e => e.target.style.display = "none"} />
												<p className="px-3 py-1.5 text-xs" style={{ color: "var(--color-primary-500)" }}>
													{t("library-admin.form.image_preview")}
												</p>
											</div>
										)}

										<div className="grid grid-cols-2 gap-3">
											<div>
												<Label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--color-primary-600)" }}>
													{t("library-admin.form.category")}
												</Label>
												<Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
													<SelectTrigger className="h-10 rounded-xl text-sm" style={{ borderColor: "var(--color-primary-200)" }}>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{categories.map(c => (
															<SelectItem key={c} value={c}>{catIcon(c)} {t(`library.categories.${c.toLowerCase()}`)}</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
											<div>
												<Label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--color-primary-600)" }}>
													{t("library-admin.form.satiety")}
												</Label>
												<Select value={form.satiety} onValueChange={v => setForm(f => ({ ...f, satiety: v }))}>
													<SelectTrigger className="h-10 rounded-xl text-sm" style={{ borderColor: "var(--color-primary-200)" }}>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{satietyLevels.map(s => (
															<SelectItem key={s} value={s}>{t(`library.satiety.${s.toLowerCase()}`)}</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
										</div>

										<div className="grid grid-cols-3 gap-3">
											{[
												[t("library-admin.form.calories"), "calories"],
												[t("library-admin.form.time"), "time"],
												[t("library-admin.form.servings"), "servings"],
											].map(([label, field]) => (
												<div key={field}>
													<Label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--color-primary-600)" }}>
														{label}
													</Label>
													<Input type="number" value={form[field]}
														onChange={e => setForm(f => ({ ...f, [field]: Number(e.target.value) }))}
														className="h-10 rounded-xl text-sm text-center"
														style={{ borderColor: "var(--color-primary-200)" }} />
												</div>
											))}
										</div>
									</CardContent>
								</Card>

								{/* Macros */}
								<Card className="border" style={{ borderColor: "var(--color-primary-200)", boxShadow: "0 2px 12px rgba(15,23,42,0.05)" }}>
									<CardHeader className="pb-3 border-b" style={{ borderColor: "var(--color-primary-100)" }}>
										<CardTitle className="text-base font-bold flex items-center gap-2" style={{ color: "var(--color-primary-900)" }}>
											<Flame className="w-4 h-4" style={{ color: "#E8956D" }} />
											{t("library-admin.form.macros_title")}
										</CardTitle>
									</CardHeader>
									<CardContent className="pt-5">
										<div className="grid grid-cols-3 gap-3">
											{[
												[t("library-admin.form.carbs"), "carbs", "#E8956D", Wheat],
												[t("library-admin.form.protein"), "protein", "#5B8A5F", Beef],
												[t("library-admin.form.fats"), "fats", "#6B5EA8", Droplets],
											].map(([label, field, col, Icon]) => (
												<div key={field}>
													<Label className="text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1" style={{ color: col }}>
														<Icon className="w-3 h-3" /> {label}
													</Label>
													<Input type="number" value={form.macros[field]}
														onChange={e => setForm(f => ({ ...f, macros: { ...f.macros, [field]: Number(e.target.value) } }))}
														className="h-10 rounded-xl text-sm text-center"
														style={{ borderColor: col + "55", background: col + "0a" }} />
												</div>
											))}
										</div>
									</CardContent>
								</Card>

								{/* Tips */}
								<Card className="border" style={{ borderColor: "var(--color-primary-200)", boxShadow: "0 2px 12px rgba(15,23,42,0.05)" }}>
									<CardHeader className="pb-3 border-b" style={{ borderColor: "var(--color-primary-100)" }}>
										<CardTitle className="text-base font-bold flex items-center gap-2" style={{ color: "var(--color-primary-900)" }}>
											<Lightbulb className="w-4 h-4" style={{ color: "#C4943A" }} />
											{t("library-admin.form.tips_title")}
										</CardTitle>
									</CardHeader>
									<CardContent className="pt-5">
										<Textarea value={form.tips} onChange={e => setForm(f => ({ ...f, tips: e.target.value }))}
											placeholder={t("library-admin.form.tips_placeholder")}
											rows={3} className="rounded-xl text-sm resize-none"
											style={{ borderColor: "var(--color-primary-200)" }} />
									</CardContent>
								</Card>
							</div>

							{/* ── Right column: Ingredients ── */}
							<div className="space-y-5">
								<Card className="border" style={{ borderColor: "var(--color-primary-200)", boxShadow: "0 2px 12px rgba(15,23,42,0.05)" }}>
									<CardHeader className="pb-3 border-b" style={{ borderColor: "var(--color-primary-100)" }}>
										<div className="flex items-center justify-between">
											<CardTitle className="text-base font-bold flex items-center gap-2" style={{ color: "var(--color-primary-900)" }}>
												<BookOpen className="w-4 h-4" style={{ color: "var(--color-gradient-from)" }} />
												{t("library.modal.ingredients")}
												<Badge variant="secondary" className="text-xs ms-1">{form.ingredients.length}</Badge>
											</CardTitle>
											<Button size="sm" onClick={addIngredient}
												className="h-8 px-3 rounded-lg text-xs font-bold text-white"
												style={{ background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))" }}>
												<Plus className="w-3.5 h-3.5 me-1" /> {t("library-admin.form.add_ingredient")}
											</Button>
										</div>
									</CardHeader>
									<CardContent className="pt-4">
										<div className="grid grid-cols-[1fr_72px_72px_32px] gap-2 mb-2 px-1">
											{[
												t("library-admin.form.col_ingredient"),
												t("library-admin.form.col_amount"),
												t("library-admin.form.col_unit"),
												"",
											].map((h, i) => (
												<span key={i} className="text-[10px] font-bold uppercase tracking-wider"
													style={{ color: "var(--color-primary-400)" }}>{h}</span>
											))}
										</div>

										<div className="space-y-2 max-h-[420px] overflow-y-auto pe-1" style={{ scrollbarWidth: "thin" }}>
											{form.ingredients.map((ing, i) => (
												<div key={i} className="grid grid-cols-[1fr_72px_72px_32px] gap-2 items-center p-2.5 rounded-xl transition-colors"
													style={{ background: "var(--color-primary-50)", border: "1px solid var(--color-primary-100)" }}>
													<Input value={ing.name} onChange={e => handleIngredient(i, "name", e.target.value)}
														placeholder={t("library-admin.form.ing_name_placeholder")}
														className="h-8 rounded-lg text-xs border" style={{ borderColor: "var(--color-primary-200)" }} />
													<Input value={ing.amount} onChange={e => handleIngredient(i, "amount", e.target.value)}
														placeholder={t("library-admin.form.ing_qty_placeholder")}
														className="h-8 rounded-lg text-xs text-center border" style={{ borderColor: "var(--color-primary-200)" }} />
													<Select value={ing.unit} onValueChange={v => handleIngredient(i, "unit", v)}>
														<SelectTrigger className="h-8 rounded-lg text-xs border" style={{ borderColor: "var(--color-primary-200)" }}>
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
														</SelectContent>
													</Select>
													<button onClick={() => removeIngredient(i)} disabled={form.ingredients.length === 1}
														aria-label={t("library-admin.form.remove_ingredient")}
														className="w-8 h-8 rounded-lg grid place-items-center transition-colors disabled:opacity-30"
														style={{ background: "#fee2e2", color: "#dc2626" }}
														onMouseOver={e => { if (form.ingredients.length > 1) { e.currentTarget.style.background = "#dc2626"; e.currentTarget.style.color = "white"; } }}
														onMouseOut={e => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.color = "#dc2626"; }}>
														<X className="w-3.5 h-3.5" />
													</button>
												</div>
											))}
										</div>
									</CardContent>
								</Card>

								<Button onClick={handleSubmit}
									className="w-full h-12 rounded-xl text-base font-bold text-white flex items-center justify-center gap-2"
									style={{ background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))", boxShadow: "0 4px 20px rgba(99,102,241,0.3)" }}>
									{editId ? <Pencil className="w-4 h-4" /> : <ChefHat className="w-4 h-4" />}
									{editId ? t("library-admin.form.submit_update") : t("library-admin.form.submit_save")}
									<ArrowRight className="w-4 h-4 ms-1" />
								</Button>

								{editId && (
									<Button variant="outline"
										onClick={() => { setEditId(null); setActiveTab("list"); resetForm(); }}
										className="w-full h-10 rounded-xl text-sm"
										style={{ borderColor: "var(--color-primary-200)", color: "var(--color-primary-500)" }}>
										{t("library-admin.form.cancel_edit")}
									</Button>
								)}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
