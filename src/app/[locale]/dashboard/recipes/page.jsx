"use client";
import { useState } from "react";
import { initialMeals, categories } from "./data";

const emptyMeal = {
	name: "",
	category: "Breakfast",
	servings: 1,
	time: 10,
	calories: 0,
	satiety: "Medium",
	image: "",
	ingredients: [{ name: "", amount: "", unit: "g" }],
	macros: { carbs: 0, protein: 0, fats: 0 },
	tips: "",
};

const units = ["g", "ml", "pcs", "pc", "tsp", "tbsp", "slices", "cups", "cloves", "pinch"];
const satietyLevels = ["Low", "Medium", "High"];

export default function AdminPage() {
	const [meals, setMeals] = useState(initialMeals);
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
		if (!form.name.trim()) return showToast("Meal name is required", "error");
		if (editId !== null) {
			setMeals(m => m.map(x => x.id === editId ? { ...form, id: editId } : x));
			showToast("Meal updated successfully");
		} else {
			setMeals(m => [...m, { ...form, id: Date.now() }]);
			showToast("Meal added to library");
		}
		setForm({ ...emptyMeal, ingredients: [{ name: "", amount: "", unit: "g" }] });
		setEditId(null);
		setActiveTab("list");
	};

	const startEdit = (meal) => {
		setForm({ ...meal });
		setEditId(meal.id);
		setActiveTab("form");
	};

	const deleteMeal = (id) => {
		setMeals(m => m.filter(x => x.id !== id));
		showToast("Meal removed");
	};

	const categoryColor = (cat) => {
		const map = { Breakfast: "#E8956D", Lunch: "#5B8A5F", Dinner: "#6B5EA8", Snack: "#C4943A", Drink: "#4A90B8", Dessert: "#C4627A" };
		return map[cat] || "#888";
	};

	return (
		<div style={{ minHeight: "100vh", background: "#FAF7F2", fontFamily: "'Georgia', serif" }}>
			{/* Toast */}
			{toast && (
				<div style={{
					position: "fixed", top: 24, right: 24, zIndex: 9999,
					background: toast.type === "error" ? "#C4627A" : "#5B8A5F",
					color: "#fff", padding: "12px 24px", borderRadius: 8,
					fontFamily: "Georgia, serif", fontSize: 14, fontStyle: "italic",
					boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
					animation: "slideIn 0.3s ease"
				}}>
					{toast.msg}
				</div>
			)}

			<style>{`
				@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
				* { box-sizing: border-box; margin: 0; padding: 0; }
				input, select, textarea { outline: none; }
				input:focus, select:focus, textarea:focus { border-color: #C4943A !important; }
				@keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
				@keyframes fadeUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
				.meal-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.1) !important; }
				.meal-card { transition: all 0.2s ease; }
				.ing-row:hover { background: #F5F0E8 !important; }
				.del-btn:hover { background: #C4627A !important; color: #fff !important; }
				.edit-btn:hover { background: #C4943A !important; color: #fff !important; }
			`}</style>

			{/* Header */}
			<header style={{ background: "#2C2416", padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
				<div style={{ display: "flex", alignItems: "center", gap: 14 }}>
					<div style={{ width: 32, height: 32, background: "#C4943A", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
						<span style={{ color: "#fff", fontSize: 16 }}>🍳</span>
					</div>
					<span style={{ color: "#FAF7F2", fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 700, letterSpacing: 0.5 }}>
						NutriCoach <span style={{ color: "#C4943A", fontStyle: "italic", fontWeight: 400 }}>Studio</span>
					</span>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
					<div style={{ width: 8, height: 8, background: "#5B8A5F", borderRadius: "50%" }} />
					<span style={{ color: "#A89880", fontSize: 13, fontFamily: "Georgia, serif", fontStyle: "italic" }}>Coach Dashboard</span>
				</div>
			</header>

			<div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
				{/* Page Title */}
				<div style={{ marginBottom: 36 }}>
					<p style={{ color: "#A89880", fontSize: 12, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Georgia, serif", marginBottom: 8 }}>
						Meal Management
					</p>
					<h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 38, color: "#2C2416", fontWeight: 700, lineHeight: 1.15 }}>
						Recipe <span style={{ color: "#C4943A", fontStyle: "italic" }}>Library</span>
					</h1>
					<div style={{ width: 48, height: 3, background: "#C4943A", marginTop: 12, borderRadius: 2 }} />
				</div>

				{/* Tabs */}
				<div style={{ display: "flex", gap: 4, marginBottom: 32, background: "#EDE7D9", borderRadius: 10, padding: 4, width: "fit-content" }}>
					{["list", "form"].map(tab => (
						<button key={tab} onClick={() => { setActiveTab(tab); if (tab === "form" && editId === null) setForm({ ...emptyMeal, ingredients: [{ name: "", amount: "", unit: "g" }] }); }}
							style={{
								padding: "10px 28px", borderRadius: 8, border: "none", cursor: "pointer",
								fontFamily: "Georgia, serif", fontSize: 14,
								background: activeTab === tab ? "#2C2416" : "transparent",
								color: activeTab === tab ? "#FAF7F2" : "#6B5840",
								fontWeight: activeTab === tab ? 700 : 400,
								transition: "all 0.2s ease"
							}}>
							{tab === "list" ? `All Meals (${meals.length})` : editId ? "✏️ Edit Meal" : "+ Add Meal"}
						</button>
					))}
				</div>

				{/* LIST TAB */}
				{activeTab === "list" && (
					<div style={{ animation: "fadeUp 0.3s ease" }}>
						{/* Controls */}
						<div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
							<input
								value={search} onChange={e => setSearch(e.target.value)}
								placeholder="Search meals..."
								style={{ flex: 1, minWidth: 200, padding: "10px 16px", border: "1.5px solid #DDD4C4", borderRadius: 8, background: "#fff", fontFamily: "Georgia, serif", fontSize: 14, color: "#2C2416" }}
							/>
							<select value={filterCat} onChange={e => setFilterCat(e.target.value)}
								style={{ padding: "10px 16px", border: "1.5px solid #DDD4C4", borderRadius: 8, background: "#fff", fontFamily: "Georgia, serif", fontSize: 14, color: "#2C2416", cursor: "pointer" }}>
								<option>All</option>
								{categories.map(c => <option key={c}>{c}</option>)}
							</select>
							<button onClick={() => { setActiveTab("form"); setEditId(null); setForm({ ...emptyMeal, ingredients: [{ name: "", amount: "", unit: "g" }] }); }}
								style={{ padding: "10px 24px", background: "#C4943A", color: "#fff", border: "none", borderRadius: 8, fontFamily: "Georgia, serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
								+ New Meal
							</button>
						</div>

						<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
							{filtered.map(meal => (
								<div key={meal.id} className="meal-card" style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.07)", border: "1px solid #EDE7D9" }}>
									<div style={{ position: "relative", height: 160, overflow: "hidden" }}>
										<img src={meal.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80"} alt={meal.name}
											style={{ width: "100%", height: "100%", objectFit: "cover" }} />
										<div style={{ position: "absolute", top: 12, left: 12 }}>
											<span style={{ background: categoryColor(meal.category), color: "#fff", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontFamily: "Georgia, serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
												{meal.category}
											</span>
										</div>
										<div style={{ position: "absolute", top: 12, right: 12, background: "rgba(44,36,22,0.85)", borderRadius: 8, padding: "4px 10px" }}>
											<span style={{ color: "#C4943A", fontFamily: "Georgia, serif", fontSize: 13, fontWeight: 700 }}>{meal.calories} kcal</span>
										</div>
									</div>
									<div style={{ padding: 20 }}>
										<h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, color: "#2C2416", fontWeight: 700, marginBottom: 6 }}>{meal.name}</h3>
										<div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
											<span style={{ color: "#A89880", fontSize: 12, fontFamily: "Georgia, serif" }}>⏱ {meal.time} min</span>
											<span style={{ color: "#A89880", fontSize: 12, fontFamily: "Georgia, serif" }}>👤 {meal.servings} serving{meal.servings > 1 ? "s" : ""}</span>
											<span style={{ color: "#A89880", fontSize: 12, fontFamily: "Georgia, serif" }}>📊 {meal.satiety} satiety</span>
										</div>
										{/* Macros */}
										<div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
											{[["C", meal.macros.carbs, "#E8956D"], ["P", meal.macros.protein, "#5B8A5F"], ["F", meal.macros.fats, "#6B5EA8"]].map(([label, val, col]) => (
												<div key={label} style={{ flex: 1, background: col + "15", borderRadius: 8, padding: "6px 8px", textAlign: "center" }}>
													<div style={{ color: col, fontSize: 11, fontFamily: "Georgia, serif", fontWeight: 700 }}>{label}</div>
													<div style={{ color: "#2C2416", fontSize: 13, fontFamily: "Georgia, serif", fontWeight: 700 }}>{val}g</div>
												</div>
											))}
										</div>
										{/* Ingredients preview */}
										<div style={{ marginBottom: 16 }}>
											<p style={{ color: "#A89880", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, fontFamily: "Georgia, serif", marginBottom: 6 }}>
												Ingredients ({meal.ingredients.length})
											</p>
											<p style={{ color: "#6B5840", fontSize: 13, fontFamily: "Georgia, serif", fontStyle: "italic", lineHeight: 1.6 }}>
												{meal.ingredients.slice(0, 3).map(i => i.name).join(", ")}{meal.ingredients.length > 3 ? ` +${meal.ingredients.length - 3} more` : ""}
											</p>
										</div>
										<div style={{ display: "flex", gap: 8 }}>
											<button className="edit-btn" onClick={() => startEdit(meal)}
												style={{ flex: 1, padding: "9px 0", border: "1.5px solid #C4943A", background: "transparent", borderRadius: 7, color: "#C4943A", fontFamily: "Georgia, serif", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
												Edit
											</button>
											<button className="del-btn" onClick={() => deleteMeal(meal.id)}
												style={{ flex: 1, padding: "9px 0", border: "1.5px solid #C4627A", background: "transparent", borderRadius: 7, color: "#C4627A", fontFamily: "Georgia, serif", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
												Remove
											</button>
										</div>
									</div>
								</div>
							))}
							{filtered.length === 0 && (
								<div style={{ gridColumn: "1/-1", textAlign: "center", padding: 60, color: "#A89880", fontFamily: "Georgia, serif", fontStyle: "italic" }}>
									No meals found. Try a different search or add a new meal.
								</div>
							)}
						</div>
					</div>
				)}

				{/* FORM TAB */}
				{activeTab === "form" && (
					<div style={{ animation: "fadeUp 0.3s ease" }}>
						<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
							{/* Left Column */}
							<div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
								<div style={{ background: "#fff", borderRadius: 14, padding: 28, border: "1px solid #EDE7D9", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
									<h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, color: "#2C2416", marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid #EDE7D9" }}>
										Basic Info
									</h2>
									{[
										["Meal Name", "text", "name", "e.g. Creamy Egg Sandwich"],
										["Image URL", "url", "image", "https://..."],
									].map(([label, type, field, ph]) => (
										<div key={field} style={{ marginBottom: 16 }}>
											<label style={{ display: "block", color: "#6B5840", fontSize: 12, fontFamily: "Georgia, serif", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{label}</label>
											<input type={type} value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
												placeholder={ph}
												style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #DDD4C4", borderRadius: 8, fontFamily: "Georgia, serif", fontSize: 14, color: "#2C2416", background: "#FAF7F2" }} />
										</div>
									))}
									<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
										<div>
											<label style={{ display: "block", color: "#6B5840", fontSize: 12, fontFamily: "Georgia, serif", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Category</label>
											<select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
												style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #DDD4C4", borderRadius: 8, fontFamily: "Georgia, serif", fontSize: 14, color: "#2C2416", background: "#FAF7F2", cursor: "pointer" }}>
												{categories.map(c => <option key={c}>{c}</option>)}
											</select>
										</div>
										<div>
											<label style={{ display: "block", color: "#6B5840", fontSize: 12, fontFamily: "Georgia, serif", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Satiety</label>
											<select value={form.satiety} onChange={e => setForm(f => ({ ...f, satiety: e.target.value }))}
												style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #DDD4C4", borderRadius: 8, fontFamily: "Georgia, serif", fontSize: 14, color: "#2C2416", background: "#FAF7F2", cursor: "pointer" }}>
												{satietyLevels.map(s => <option key={s}>{s}</option>)}
											</select>
										</div>
									</div>
									<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
										{[["Calories", "calories"], ["Time (min)", "time"], ["Servings", "servings"]].map(([label, field]) => (
											<div key={field}>
												<label style={{ display: "block", color: "#6B5840", fontSize: 12, fontFamily: "Georgia, serif", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{label}</label>
												<input type="number" value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: Number(e.target.value) }))}
													style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #DDD4C4", borderRadius: 8, fontFamily: "Georgia, serif", fontSize: 14, color: "#2C2416", background: "#FAF7F2" }} />
											</div>
										))}
									</div>
								</div>

								<div style={{ background: "#fff", borderRadius: 14, padding: 28, border: "1px solid #EDE7D9", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
									<h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, color: "#2C2416", marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid #EDE7D9" }}>
										Macros
									</h2>
									<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
										{[["Carbs (g)", "carbs", "#E8956D"], ["Protein (g)", "protein", "#5B8A5F"], ["Fats (g)", "fats", "#6B5EA8"]].map(([label, field, col]) => (
											<div key={field}>
												<label style={{ display: "block", color: col, fontSize: 12, fontFamily: "Georgia, serif", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{label}</label>
												<input type="number" value={form.macros[field]}
													onChange={e => setForm(f => ({ ...f, macros: { ...f.macros, [field]: Number(e.target.value) } }))}
													style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${col}44`, borderRadius: 8, fontFamily: "Georgia, serif", fontSize: 14, color: "#2C2416", background: col + "08" }} />
											</div>
										))}
									</div>
								</div>

								<div style={{ background: "#fff", borderRadius: 14, padding: 28, border: "1px solid #EDE7D9", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
									<h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, color: "#2C2416", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #EDE7D9" }}>
										Coach Tips
									</h2>
									<textarea value={form.tips} onChange={e => setForm(f => ({ ...f, tips: e.target.value }))}
										placeholder="Helpful tips for clients..."
										rows={3}
										style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #DDD4C4", borderRadius: 8, fontFamily: "Georgia, serif", fontSize: 14, color: "#2C2416", background: "#FAF7F2", resize: "vertical" }} />
								</div>
							</div>

							{/* Right Column - Ingredients */}
							<div>
								<div style={{ background: "#fff", borderRadius: 14, padding: 28, border: "1px solid #EDE7D9", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
									<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid #EDE7D9" }}>
										<h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, color: "#2C2416" }}>
											Ingredients <span style={{ color: "#A89880", fontSize: 14, fontWeight: 400 }}>({form.ingredients.length})</span>
										</h2>
										<button onClick={addIngredient}
											style={{ padding: "7px 16px", background: "#5B8A5F", color: "#fff", border: "none", borderRadius: 7, fontFamily: "Georgia, serif", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>
											+ Add
										</button>
									</div>
									<div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 460, overflowY: "auto", paddingRight: 4 }}>
										{form.ingredients.map((ing, i) => (
											<div key={i} className="ing-row" style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 36px", gap: 8, alignItems: "center", padding: "10px 12px", background: "#FAF7F2", borderRadius: 8, border: "1px solid #EDE7D9", transition: "background 0.15s" }}>
												<input value={ing.name} onChange={e => handleIngredient(i, "name", e.target.value)}
													placeholder="Ingredient name"
													style={{ padding: "7px 10px", border: "1.5px solid #DDD4C4", borderRadius: 6, fontFamily: "Georgia, serif", fontSize: 13, color: "#2C2416", background: "#fff" }} />
												<input value={ing.amount} onChange={e => handleIngredient(i, "amount", e.target.value)}
													placeholder="Amount"
													style={{ padding: "7px 10px", border: "1.5px solid #DDD4C4", borderRadius: 6, fontFamily: "Georgia, serif", fontSize: 13, color: "#2C2416", background: "#fff", textAlign: "center" }} />
												<select value={ing.unit} onChange={e => handleIngredient(i, "unit", e.target.value)}
													style={{ padding: "7px 6px", border: "1.5px solid #DDD4C4", borderRadius: 6, fontFamily: "Georgia, serif", fontSize: 13, color: "#2C2416", background: "#fff", cursor: "pointer" }}>
													{units.map(u => <option key={u}>{u}</option>)}
												</select>
												<button onClick={() => removeIngredient(i)} disabled={form.ingredients.length === 1}
													style={{ width: 36, height: 36, border: "none", background: form.ingredients.length === 1 ? "#EDE7D9" : "#C4627A20", borderRadius: 6, color: form.ingredients.length === 1 ? "#C8B89A" : "#C4627A", fontSize: 16, cursor: form.ingredients.length === 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
													×
												</button>
											</div>
										))}
									</div>
								</div>

								{/* Preview card */}
								{form.image && (
									<div style={{ marginTop: 20, background: "#fff", borderRadius: 14, overflow: "hidden", border: "1px solid #EDE7D9", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
										<img src={form.image} alt="Preview" style={{ width: "100%", height: 140, objectFit: "cover" }}
											onError={e => e.target.style.display = "none"} />
										<div style={{ padding: "12px 16px" }}>
											<p style={{ color: "#A89880", fontSize: 11, fontFamily: "Georgia, serif", fontStyle: "italic" }}>Image preview</p>
										</div>
									</div>
								)}

								<button onClick={handleSubmit}
									style={{ width: "100%", marginTop: 20, padding: "16px 0", background: "#2C2416", color: "#FAF7F2", border: "none", borderRadius: 12, fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 700, cursor: "pointer", letterSpacing: 0.5, transition: "all 0.2s ease" }}
									onMouseOver={e => e.target.style.background = "#C4943A"}
									onMouseOut={e => e.target.style.background = "#2C2416"}>
									{editId ? "Update Meal" : "Save to Library"} →
								</button>
								{editId && (
									<button onClick={() => { setEditId(null); setActiveTab("list"); setForm({ ...emptyMeal, ingredients: [{ name: "", amount: "", unit: "g" }] }); }}
										style={{ width: "100%", marginTop: 10, padding: "12px 0", background: "transparent", color: "#A89880", border: "1.5px solid #DDD4C4", borderRadius: 12, fontFamily: "Georgia, serif", fontSize: 14, cursor: "pointer" }}>
										Cancel Edit
									</button>
								)}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}