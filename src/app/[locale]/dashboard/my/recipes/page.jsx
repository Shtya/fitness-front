"use client";
import { useState } from "react";
import { initialMeals, categories } from "../../recipes/data";

const categoryColor = (cat) => {
  const map = { Breakfast: "#E8956D", Lunch: "#5B8A5F", Dinner: "#6B5EA8", Snack: "#C4943A", Drink: "#4A90B8", Dessert: "#C4627A" };
  return map[cat] || "#888";
};

const macroBar = (val, max, color) => (
  <div style={{ height: 4, background: "#EDE7D9", borderRadius: 2, overflow: "hidden" }}>
    <div style={{ width: `${Math.min(100, (val / max) * 100)}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.6s ease" }} />
  </div>
);

export default function LibraryPage() {
  const [meals] = useState(initialMeals);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [sortBy, setSortBy] = useState("name");

  const filtered = meals
    .filter(m =>
      (activeCategory === "All" || m.category === activeCategory) &&
      (m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.ingredients.some(i => i.name.toLowerCase().includes(search.toLowerCase())))
    )
    .sort((a, b) => {
      if (sortBy === "calories") return a.calories - b.calories;
      if (sortBy === "time") return a.time - b.time;
      if (sortBy === "protein") return b.macros.protein - a.macros.protein;
      return a.name.localeCompare(b.name);
    });

  const allCats = ["All", ...categories];

  return (
    <div style={{ minHeight: "100vh", background: "#FAF7F2", fontFamily: "Georgia, serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .meal-card { transition: all 0.25s ease; cursor: pointer; }
        .meal-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0,0,0,0.13) !important; }
        .cat-pill { transition: all 0.2s ease; cursor: pointer; }
        .cat-pill:hover { transform: scale(1.04); }
        .modal-overlay { position: fixed; inset: 0; background: rgba(44,36,22,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(3px); animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #EDE7D9; }
        ::-webkit-scrollbar-thumb { background: #C4943A; border-radius: 3px; }
        .close-btn:hover { background: #C4627A !important; color: #fff !important; }
      `}</style>

      {/* Hero Header */}
      <header style={{ background: "#2C2416", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 30% 50%, #4A3520 0%, transparent 60%)" }} />
        <div style={{ position: "absolute", top: -40, right: -40, width: 280, height: 280, background: "#C4943A10", borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: -60, right: 60, width: 180, height: 180, background: "#C4943A08", borderRadius: "50%" }} />
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, background: "#C4943A", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🍳</div>
                <span style={{ color: "#A89880", fontSize: 12, letterSpacing: 3, textTransform: "uppercase" }}>Your Nutrition Plan</span>
              </div>
              <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 48, color: "#FAF7F2", fontWeight: 700, lineHeight: 1.1, marginBottom: 12 }}>
                Meal <span style={{ color: "#C4943A", fontStyle: "italic" }}>Library</span>
              </h1>
              <p style={{ color: "#A89880", fontSize: 16, fontStyle: "italic", maxWidth: 400, lineHeight: 1.6 }}>
                Curated recipes from your coach — browse ingredients, macros, and discover your next meal.
              </p>
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              {[["🥗", meals.length, "Total Meals"], ["🔥", Math.round(meals.reduce((s, m) => s + m.calories, 0) / meals.length), "Avg Calories"], ["💪", Math.round(meals.reduce((s, m) => s + m.macros.protein, 0) / meals.length) + "g", "Avg Protein"]].map(([icon, val, label]) => (
                <div key={label} style={{ textAlign: "center", background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "16px 20px", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
                  <div style={{ color: "#C4943A", fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700 }}>{val}</div>
                  <div style={{ color: "#A89880", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px" }}>
        {/* Search & Sort */}
        <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240, position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "#A89880" }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search meals or ingredients..."
              style={{ width: "100%", padding: "12px 16px 12px 42px", border: "1.5px solid #DDD4C4", borderRadius: 10, background: "#fff", fontFamily: "Georgia, serif", fontSize: 14, color: "#2C2416", outline: "none" }} />
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ padding: "12px 20px", border: "1.5px solid #DDD4C4", borderRadius: 10, background: "#fff", fontFamily: "Georgia, serif", fontSize: 14, color: "#2C2416", cursor: "pointer", outline: "none" }}>
            <option value="name">Sort: A–Z</option>
            <option value="calories">Sort: Calories</option>
            <option value="time">Sort: Prep Time</option>
            <option value="protein">Sort: Protein</option>
          </select>
        </div>

        {/* Category Pills */}
        <div style={{ display: "flex", gap: 10, marginBottom: 32, flexWrap: "wrap" }}>
          {allCats.map(cat => {
            const active = activeCategory === cat;
            const col = cat === "All" ? "#2C2416" : categoryColor(cat);
            return (
              <button key={cat} className="cat-pill" onClick={() => setActiveCategory(cat)}
                style={{
                  padding: "8px 20px", border: `2px solid ${active ? col : "#DDD4C4"}`,
                  borderRadius: 24, background: active ? col : "#fff",
                  color: active ? "#fff" : "#6B5840",
                  fontFamily: "Georgia, serif", fontSize: 13, fontWeight: active ? 700 : 400,
                  cursor: "pointer",
                }}>
                {cat}
                {cat !== "All" && <span style={{ marginLeft: 6, opacity: 0.7, fontSize: 11 }}>({meals.filter(m => m.category === cat).length})</span>}
              </button>
            );
          })}
        </div>

        {/* Results count */}
        <p style={{ color: "#A89880", fontSize: 13, fontStyle: "italic", marginBottom: 20, fontFamily: "Georgia, serif" }}>
          {filtered.length} meal{filtered.length !== 1 ? "s" : ""} found{search ? ` for "${search}"` : ""}
        </p>

        {/* Meal Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24, animation: "fadeUp 0.3s ease" }}>
          {filtered.map(meal => (
            <div key={meal.id} className="meal-card" onClick={() => setSelected(meal)}
              style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.07)", border: "1px solid #EDE7D9" }}>
              {/* Image */}
              <div style={{ position: "relative", height: 190, overflow: "hidden" }}>
                <img src={meal.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80"} alt={meal.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s ease" }}
                  onMouseOver={e => e.target.style.transform = "scale(1.05)"}
                  onMouseOut={e => e.target.style.transform = "scale(1)"} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(44,36,22,0.6) 0%, transparent 50%)" }} />
                <div style={{ position: "absolute", top: 14, left: 14 }}>
                  <span style={{ background: categoryColor(meal.category), color: "#fff", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {meal.category}
                  </span>
                </div>
                <div style={{ position: "absolute", bottom: 14, left: 16, right: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, color: "#FAF7F2", fontWeight: 700, lineHeight: 1.2 }}>{meal.name}</h3>
                  <span style={{ color: "#C4943A", fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 700, background: "rgba(44,36,22,0.7)", padding: "2px 8px", borderRadius: 6 }}>{meal.calories}</span>
                </div>
              </div>

              <div style={{ padding: "18px 20px 20px" }}>
                {/* Meta */}
                <div style={{ display: "flex", gap: 16, marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid #EDE7D9" }}>
                  {[["⏱", `${meal.time} min`], ["👤", `${meal.servings} serving`], ["📊", meal.satiety]].map(([icon, val]) => (
                    <span key={val} style={{ color: "#A89880", fontSize: 12, fontFamily: "Georgia, serif" }}>{icon} {val}</span>
                  ))}
                </div>

                {/* Macros */}
                <div style={{ marginBottom: 16 }}>
                  <p style={{ color: "#A89880", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Macros per serving</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[["Carbs", meal.macros.carbs, 80, "#E8956D"], ["Protein", meal.macros.protein, 60, "#5B8A5F"], ["Fats", meal.macros.fats, 40, "#6B5EA8"]].map(([label, val, max, col]) => (
                      <div key={label}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ color: "#6B5840", fontSize: 12 }}>{label}</span>
                          <span style={{ color: col, fontSize: 12, fontWeight: 700 }}>{val}g</span>
                        </div>
                        {macroBar(val, max, col)}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ingredients */}
                <div>
                  <p style={{ color: "#A89880", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>
                    Key Ingredients
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {meal.ingredients.slice(0, 4).map((ing, i) => (
                      <span key={i} style={{ background: "#FAF7F2", border: "1px solid #EDE7D9", borderRadius: 6, padding: "3px 10px", fontSize: 12, color: "#6B5840", fontFamily: "Georgia, serif" }}>
                        {ing.name}
                      </span>
                    ))}
                    {meal.ingredients.length > 4 && (
                      <span style={{ background: "#C4943A15", border: "1px solid #C4943A30", borderRadius: 6, padding: "3px 10px", fontSize: 12, color: "#C4943A", fontFamily: "Georgia, serif" }}>
                        +{meal.ingredients.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 40px", color: "#A89880", fontFamily: "Georgia, serif" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🍽️</div>
            <p style={{ fontSize: 18, fontStyle: "italic", fontFamily: "'Playfair Display', Georgia, serif", color: "#6B5840" }}>No meals found</p>
            <p style={{ fontSize: 14, marginTop: 8 }}>Try a different search term or category</p>
          </div>
        )}
      </div>

      {/* Modal Detail */}
      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div style={{ background: "#FAF7F2", borderRadius: 20, maxWidth: 780, width: "100%", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.3)", animation: "slideUp 0.3s ease" }}>
            {/* Modal Image */}
            <div style={{ position: "relative", height: 240, flexShrink: 0 }}>
              <img src={selected.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80"} alt={selected.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(44,36,22,0.8) 0%, transparent 50%)" }} />
              <button className="close-btn" onClick={() => setSelected(null)}
                style={{ position: "absolute", top: 16, right: 16, width: 36, height: 36, border: "none", background: "rgba(44,36,22,0.7)", color: "#FAF7F2", borderRadius: "50%", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                ×
              </button>
              <div style={{ position: "absolute", top: 16, left: 16 }}>
                <span style={{ background: categoryColor(selected.category), color: "#fff", padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {selected.category}
                </span>
              </div>
              <div style={{ position: "absolute", bottom: 20, left: 24, right: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, color: "#FAF7F2", fontWeight: 700, marginBottom: 4 }}>{selected.name}</h2>
                  <div style={{ display: "flex", gap: 16 }}>
                    {[`⏱ ${selected.time} min`, `👤 ${selected.servings} serving`, `📊 ${selected.satiety} satiety`].map(t => (
                      <span key={t} style={{ color: "rgba(250,247,242,0.75)", fontSize: 13, fontFamily: "Georgia, serif" }}>{t}</span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#C4943A", fontFamily: "'Playfair Display', Georgia, serif", fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{selected.calories}</div>
                  <div style={{ color: "rgba(250,247,242,0.6)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>kcal</div>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ overflowY: "auto", padding: "28px 32px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                {/* Ingredients */}
                <div>
                  <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, color: "#2C2416", fontWeight: 700, marginBottom: 16 }}>
                    Ingredients
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {selected.ingredients.map((ing, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#fff", borderRadius: 8, border: "1px solid #EDE7D9" }}>
                        <span style={{ color: "#2C2416", fontSize: 14, fontFamily: "Georgia, serif" }}>{ing.name}</span>
                        <span style={{ color: "#C4943A", fontSize: 14, fontFamily: "Georgia, serif", fontWeight: 700 }}>{ing.amount} {ing.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Macros + Tips */}
                <div>
                  <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, color: "#2C2416", fontWeight: 700, marginBottom: 16 }}>
                    Nutrition Facts
                  </h3>
                  <div style={{ background: "#2C2416", borderRadius: 12, padding: 20, marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                      <span style={{ color: "#A89880", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>Calories</span>
                      <span style={{ color: "#C4943A", fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 700 }}>{selected.calories}</span>
                    </div>
                    <div style={{ height: 1, background: "#4A3520", marginBottom: 12 }} />
                    {[["Carbohydrates", selected.macros.carbs + "g", "#E8956D"], ["Protein", selected.macros.protein + "g", "#5B8A5F"], ["Fats", selected.macros.fats + "g", "#6B5EA8"]].map(([label, val, col]) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ color: "#A89880", fontSize: 13, fontFamily: "Georgia, serif" }}>{label}</span>
                        <span style={{ color: col, fontSize: 13, fontWeight: 700, fontFamily: "Georgia, serif" }}>{val}</span>
                      </div>
                    ))}
                  </div>
                  {selected.tips && (
                    <div style={{ background: "#C4943A15", border: "1.5px solid #C4943A30", borderRadius: 12, padding: 16 }}>
                      <p style={{ color: "#C4943A", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, fontFamily: "Georgia, serif" }}>💡 Coach Tip</p>
                      <p style={{ color: "#6B5840", fontSize: 14, fontFamily: "Georgia, serif", fontStyle: "italic", lineHeight: 1.6 }}>{selected.tips}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}