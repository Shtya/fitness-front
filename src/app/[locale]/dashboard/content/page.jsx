"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import DataTable from "@/components/dashboard/ui/DataTable";
import {
  PageHeader, TabsPill, ToolbarButton, Modal, EmptyState, SearchInput, Select, Badge,
  FileDropzone, TagChips, spring
} from "@/components/dashboard/ui/UI";
import {
  NotebookPen, Salad, Dumbbell, Images, FileText, Plus, Pencil, Trash2, Download, Eye, Copy, Send
} from "lucide-react";

/* ================= Mock Data ================= */
const seedRecipes = [
  { id:"R-1", name:"Grilled Chicken Bowl", calories:520, protein:45, carbs:50, fat:14, tags:["high-protein","lunch"], updatedAt:"2025-08-20T12:00:00Z" },
  { id:"R-2", name:"Overnight Oats",      calories:380, protein:22, carbs:55, fat:9,  tags:["breakfast","prep"], updatedAt:"2025-08-22T10:00:00Z" },
  { id:"R-3", name:"Greek Salad",         calories:270, protein:12, carbs:16, fat:18, tags:["vegetarian","dinner"], updatedAt:"2025-08-25T17:30:00Z" },
];

const seedTemplates = [
  { id:"T-100", kind:"workout", name:"Beginner Full-Body (3d/w)", level:"Beginner", goal:"General Fitness", blocks:6, updatedAt:"2025-08-15T09:00:00Z" },
  { id:"T-101", kind:"plan",    name:"Fat Loss 12-Week",          level:"All",      goal:"Fat Loss",       blocks:12, updatedAt:"2025-08-10T09:00:00Z" },
];

const seedDocs = [
  { id:"D-1", name:"Liability Waiver", status:"active", versions:[{ n:1, at:"2025-07-01" }], requireSign:true, signedCount:86 },
  { id:"D-2", name:"Privacy Policy",   status:"active", versions:[{ n:3, at:"2025-06-12" }], requireSign:false, signedCount:0 },
];

const seedMedia = [
  { id:"M-1", name:"Studio-A.jpg", type:"image", size: 256000, url:"", tags:["studio","marketing"], uploadedAt:"2025-08-20T11:00:00Z" },
  { id:"M-2", name:"Promo-Sept.mp4", type:"video", size: 10485760, url:"", tags:["promo"], uploadedAt:"2025-08-22T15:00:00Z" },
  { id:"M-3", name:"Diet-Tips.pdf", type:"file", size: 85000, url:"", tags:["nutrition","handout"], uploadedAt:"2025-08-25T08:00:00Z" },
];

/* ================= Page ================= */
export default function ContentAndResourcesPage() {
  const [tab, setTab] = useState("recipes"); // recipes | templates | media | documents
  const [loading, setLoading] = useState(true);

  // state
  const [recipes, setRecipes] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [docs, setDocs] = useState([]);
  const [media, setMedia] = useState([]);

  // filters
  const [q, setQ] = useState("");
  const [tagFilter, setTagFilter] = useState([]);

  // modals/forms
  const [openRecipe, setOpenRecipe] = useState(false);
  const [recipeForm, setRecipeForm] = useState({ id:null, name:"", calories:0, protein:0, carbs:0, fat:0, tags:[], instructions:"", ingredients:"" });

  const [openTpl, setOpenTpl] = useState(false);
  const [tplForm, setTplForm] = useState({ id:null, kind:"workout", name:"", level:"Beginner", goal:"", blocks:4, notes:"" });

  const [openDoc, setOpenDoc] = useState(false);
  const [docForm, setDocForm] = useState({ id:null, name:"", requireSign:true });

  const [openSend, setOpenSend] = useState(false);
  const [sendForm, setSendForm] = useState({ docId:"", emails:"" });

  const [preview, setPreview] = useState(null); // media/doc preview

  useEffect(() => {
    setLoading(true);
    setTimeout(()=>{
      setRecipes(seedRecipes);
      setTemplates(seedTemplates);
      setDocs(seedDocs);
      setMedia(seedMedia);
      setLoading(false);
    }, 500);
  }, []);

  /* ================= Derived ================= */
  const allTags = useMemo(() => {
    const fromRecipes = recipes.flatMap(r=>r.tags||[]);
    const fromMedia = media.flatMap(m=>m.tags||[]);
    return Array.from(new Set([...fromRecipes, ...fromMedia]));
  }, [recipes, media]);

  const recipesFiltered = useMemo(() => {
    let list = recipes.slice();
    if (q) {
      const s = q.toLowerCase();
      list = list.filter(r => [r.name, ...(r.tags||[])].join(" ").toLowerCase().includes(s));
    }
    if (tagFilter.length) list = list.filter(r => (r.tags||[]).some(t => tagFilter.includes(t)));
    return list.sort((a,b)=> b.updatedAt.localeCompare(a.updatedAt));
  }, [recipes, q, tagFilter]);

  const mediaFiltered = useMemo(() => {
    let list = media.slice();
    if (q) {
      const s = q.toLowerCase();
      list = list.filter(m => [m.name, ...(m.tags||[])].join(" ").toLowerCase().includes(s));
    }
    if (tagFilter.length) list = list.filter(m => (m.tags||[]).some(t => tagFilter.includes(t)));
    return list.sort((a,b)=> b.uploadedAt.localeCompare(a.uploadedAt));
  }, [media, q, tagFilter]);

  const tplCols = [
    { header:"Type", accessor:"kind", cell:r=> <Badge color={r.kind==="workout"?"indigo":"blue"}>{r.kind}</Badge> },
    { header:"Name", accessor:"name" },
    { header:"Level", accessor:"level" },
    { header:"Goal", accessor:"goal" },
    { header:"Blocks", accessor:"blocks" },
    { header:"Updated", accessor:"updatedAt", cell:r=> new Date(r.updatedAt).toLocaleString() },
    { header:"Actions", accessor:"_", cell:r=>(
      <div className="flex items-center gap-2">
        <button className="btn-sm" onClick={()=>duplicateTpl(r)} title="Duplicate"><Copy className="w-4 h-4" /></button>
        <button className="btn-sm" onClick={()=>editTpl(r)}><Pencil className="w-4 h-4" /></button>
        <button className="btn-sm" onClick={()=>removeTpl(r.id)}><Trash2 className="w-4 h-4" /></button>
      </div>
    )},
  ];

  const docCols = [
    { header:"Document", accessor:"name" },
    { header:"Status", accessor:"status", cell:r=> <Badge color={r.status==="active"?"emerald":"slate"}>{r.status}</Badge> },
    { header:"Requires E-sign", accessor:"requireSign", cell:r=> r.requireSign ? "Yes" : "No" },
    { header:"Versions", accessor:"versions", cell:r=> r.versions?.length || 0 },
    { header:"Signed", accessor:"signedCount" },
    { header:"Actions", accessor:"_", cell:r=>(
      <div className="flex items-center gap-2">
        <button className="btn-sm" onClick={()=>setPreview({ type:"doc", data:r })}><Eye className="w-4 h-4" /></button>
        <button className="btn-sm" onClick={()=>addVersion(r.id)} title="New Version">+V</button>
        <button className="btn-sm" onClick={()=>{ setSendForm({ docId:r.id, emails:"" }); setOpenSend(true); }} title="Send for e-sign"><Send className="w-4 h-4" /></button>
        <button className="btn-sm" onClick={()=>removeDoc(r.id)}><Trash2 className="w-4 h-4" /></button>
      </div>
    )},
  ];

  /* ================= Actions ================= */
  function toggleTag(t){ setTagFilter(v => v.includes(t) ? v.filter(x=>x!==t) : [...v, t]); }

  // Recipes
  function saveRecipe(e){
    e.preventDefault();
    const rec = { ...recipeForm, id: recipeForm.id || "R-"+Date.now(), updatedAt: new Date().toISOString() };
    setRecipes(list => recipeForm.id ? list.map(x=>x.id===rec.id ? rec : x) : [rec, ...list]);
    setOpenRecipe(false); setRecipeForm({ id:null, name:"", calories:0, protein:0, carbs:0, fat:0, tags:[], instructions:"", ingredients:"" });
  }
  function editRecipe(r){ setRecipeForm({ ...r, instructions:r.instructions||"", ingredients:r.ingredients||"" }); setOpenRecipe(true); }
  function removeRecipe(id){ setRecipes(list => list.filter(x => x.id!==id)); }

  // Templates
  function saveTpl(e){
    e.preventDefault();
    const rec = { ...tplForm, id: tplForm.id || "T-"+Date.now(), updatedAt: new Date().toISOString() };
    setTemplates(list => tplForm.id ? list.map(x=>x.id===rec.id ? rec : x) : [rec, ...list]);
    setOpenTpl(false); setTplForm({ id:null, kind:"workout", name:"", level:"Beginner", goal:"", blocks:4, notes:"" });
  }
  function editTpl(t){ setTplForm({ ...t }); setOpenTpl(true); }
  function duplicateTpl(t){ const copy = { ...t, id:"T-"+Date.now(), name: t.name + " (Copy)", updatedAt:new Date().toISOString() }; setTemplates(arr => [copy, ...arr]); }
  function removeTpl(id){ setTemplates(list => list.filter(x => x.id!==id)); }

  // Docs
  function saveDoc(e){
    e.preventDefault();
    const rec = docForm.id
      ? { ...docs.find(d=>d.id===docForm.id), name:docForm.name, requireSign:docForm.requireSign }
      : { id:"D-"+Date.now(), name:docForm.name, status:"active", versions:[{ n:1, at: new Date().toISOString().slice(0,10)}], requireSign: docForm.requireSign, signedCount:0 };
    setDocs(list => docForm.id ? list.map(d => d.id===rec.id ? rec : d) : [rec, ...list]);
    setOpenDoc(false); setDocForm({ id:null, name:"", requireSign:true });
  }
  function addVersion(id){
    setDocs(list => list.map(d => {
      if (d.id!==id) return d;
      const n = (d.versions?.[d.versions.length-1]?.n || 0) + 1;
      return { ...d, versions: [...(d.versions||[]), { n, at:new Date().toISOString().slice(0,10) }] };
    }));
  }
  function removeDoc(id){ setDocs(list => list.filter(x => x.id!==id)); }
  function sendForSign(e){
    e.preventDefault();
    // Here you’d call your backend provider (DocuSign/HelloSign/etc.)
    alert(`E-sign sent for ${sendForm.docId} to: ${sendForm.emails}`);
    setOpenSend(false); setSendForm({ docId:"", emails:"" });
  }

  // Media
  function onUpload(files){
    const mapped = files.map(f => ({
      id: "M-"+(Date.now()+Math.random()),
      name: f.name,
      type: f.type.startsWith("image") ? "image" : f.type.startsWith("video") ? "video" : "file",
      size: f.size,
      url: URL.createObjectURL(f),
      tags: [],
      uploadedAt: new Date().toISOString()
    }));
    setMedia(list => [...mapped, ...list]);
  }
  function removeMedia(id){ setMedia(list => list.filter(m => m.id!==id)); }
  function tagMedia(id, t){
    setMedia(list => list.map(m => m.id===id ? { ...m, tags: Array.from(new Set([...(m.tags||[]), t])) } : m));
  }

  /* ================= Render ================= */
  return (
    <div className="space-y-6">
      <PageHeader
        icon={NotebookPen}
        title="Content & Resources"
        subtitle="Recipes, templates, media library, and documents/waivers."
        actions={
          <div className="flex items-center gap-2">
            {tab==="recipes"   && <ToolbarButton icon={Plus} onClick={()=>{ setRecipeForm({ id:null, name:"", calories:0, protein:0, carbs:0, fat:0, tags:[], instructions:"", ingredients:"" }); setOpenRecipe(true); }}>New Recipe</ToolbarButton>}
            {tab==="templates" && <ToolbarButton icon={Plus} onClick={()=>{ setTplForm({ id:null, kind:"workout", name:"", level:"Beginner", goal:"", blocks:4, notes:"" }); setOpenTpl(true); }}>New Template</ToolbarButton>}
            {tab==="documents" && <ToolbarButton icon={Plus} onClick={()=>{ setDocForm({ id:null, name:"", requireSign:true }); setOpenDoc(true); }}>New Document</ToolbarButton>}
          </div>
        }
      />

      <TabsPill
        id="content-tabs"
        tabs={[
          { key:"recipes",   label:"Recipes",   icon: Salad },
          { key:"templates", label:"Templates", icon: Dumbbell },
          { key:"media",     label:"Media",     icon: Images },
          { key:"documents", label:"Documents", icon: FileText },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* ====== RECIPES ====== */}
      {tab==="recipes" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="space-y-4">
          <div className="card-glow p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="flex items-center gap-2">
                <SearchInput value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search recipes…" />
              </div>
              <TagChips tags={allTags} selected={tagFilter} onToggle={toggleTag} />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({length:6}).map((_,i)=> <div key={i} className="h-36 rounded-2xl bg-slate-100 animate-pulse" />)}
            </div>
          ) : recipesFiltered.length ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recipesFiltered.map(r => (
                <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{r.name}</div>
                      <div className="text-xs text-slate-500">Updated {new Date(r.updatedAt).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right text-sm">
                      <div><strong>{r.calories}</strong> kcal</div>
                      <div className="text-xs text-slate-500">{r.protein}P / {r.carbs}C / {r.fat}F</div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(r.tags||[]).map(t => <span key={t} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]">#{t}</span>)}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button className="btn-sm" onClick={()=>editRecipe(r)}><Pencil className="w-4 h-4" /></button>
                    <button className="btn-sm" onClick={()=>removeRecipe(r.id)}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No recipes" subtitle="Create a new recipe or import from CSV." />
          )}
        </motion.div>
      )}

      {/* ====== TEMPLATES ====== */}
      {tab==="templates" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="card-glow p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SearchInput value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search templates…" />
              <Select label="Type" value={"All"} setValue={()=>{}} options={["All","workout","plan"]} />
            </div>
            <ToolbarButton icon={Download} variant="secondary" onClick={()=>exportCSV("templates", templates)}>Export CSV</ToolbarButton>
          </div>
          <div className="mt-3">
            <DataTable
              columns={tplCols}
              data={templates.filter(t => !q || t.name.toLowerCase().includes(q.toLowerCase()))}
              loading={loading}
              pagination
              itemsPerPage={8}
            />
            {!loading && !templates.length && <EmptyState title="No templates" subtitle="Create workout/plan templates to reuse." />}
          </div>
        </motion.div>
      )}

      {/* ====== MEDIA ====== */}
      {tab==="media" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 card-glow p-4">
              <FileDropzone onFiles={onUpload} />
              <div className="mt-3 flex items-center justify-between">
                <SearchInput value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search media…" />
                <TagChips tags={allTags} selected={tagFilter} onToggle={toggleTag} />
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                {mediaFiltered.map(m => (
                  <button key={m.id} onClick={()=>setPreview({ type:"media", data:m })} className="rounded-xl border border-slate-200 bg-white p-3 text-left hover:shadow">
                    <div className="aspect-video rounded-lg bg-slate-100 grid place-items-center text-slate-500">
                      {m.type==="image" ? "IMG" : m.type==="video" ? "VIDEO" : "FILE"}
                    </div>
                    <div className="mt-2 text-sm font-medium truncate" title={m.name}>{m.name}</div>
                    <div className="text-[11px] text-slate-500">{(m.size/1024).toFixed(0)} KB</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(m.tags||[]).slice(0,3).map(t => <span key={t} className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px]">#{t}</span>)}
                    </div>
                  </button>
                ))}
              </div>
              {!loading && !media.length && <EmptyState title="No media yet" subtitle="Upload images, videos, and PDFs." />}
            </div>
            <div className="card-glow p-4">
              <div className="font-semibold mb-2">Tips</div>
              <ul className="text-sm text-slate-600 list-disc pl-4 space-y-1">
                <li>Tag files (e.g., <em>marketing</em>, <em>coach</em>, <em>nutrition</em>) for quick filters.</li>
                <li>Use short, descriptive names.</li>
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* ====== DOCUMENTS ====== */}
      {tab==="documents" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="card-glow p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Documents & Waivers</div>
            <ToolbarButton icon={Download} variant="secondary" onClick={()=>exportCSV("documents", docs)}>Export CSV</ToolbarButton>
          </div>
          <div className="mt-3">
            <DataTable columns={docCols} data={docs} loading={loading} pagination itemsPerPage={8} />
            {!loading && !docs.length && <EmptyState title="No documents" subtitle="Create waivers and upload versions." />}
          </div>
        </motion.div>
      )}

      {/* ===== Modals ===== */}

      {/* Recipe editor */}
      <Modal open={openRecipe} onClose={()=>setOpenRecipe(false)} title={recipeForm.id ? "Edit Recipe" : "New Recipe"}>
        <form onSubmit={saveRecipe} className="space-y-3">
          <Field label="Name"><input className="inp" value={recipeForm.name} onChange={(e)=>setRecipeForm(f=>({ ...f, name:e.target.value }))} required /></Field>
          <div className="grid grid-cols-4 gap-2">
            <Field label="Calories"><input type="number" className="inp" value={recipeForm.calories} onChange={(e)=>setRecipeForm(f=>({ ...f, calories:+e.target.value }))} /></Field>
            <Field label="Protein (g)"><input type="number" className="inp" value={recipeForm.protein} onChange={(e)=>setRecipeForm(f=>({ ...f, protein:+e.target.value }))} /></Field>
            <Field label="Carbs (g)"><input type="number" className="inp" value={recipeForm.carbs} onChange={(e)=>setRecipeForm(f=>({ ...f, carbs:+e.target.value }))} /></Field>
            <Field label="Fat (g)"><input type="number" className="inp" value={recipeForm.fat} onChange={(e)=>setRecipeForm(f=>({ ...f, fat:+e.target.value }))} /></Field>
          </div>
          <Field label="Tags"><input className="inp" placeholder="comma,separated,tags" onChange={(e)=>setRecipeForm(f=>({ ...f, tags: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) }))} /></Field>
          <Field label="Ingredients"><textarea className="inp" rows={3} value={recipeForm.ingredients} onChange={(e)=>setRecipeForm(f=>({ ...f, ingredients:e.target.value }))} /></Field>
          <Field label="Instructions"><textarea className="inp" rows={5} value={recipeForm.instructions} onChange={(e)=>setRecipeForm(f=>({ ...f, instructions:e.target.value }))} /></Field>
          <div className="flex items-center justify-end"><button className="btn-primary">{recipeForm.id?"Save":"Create"}</button></div>
        </form>
      </Modal>

      {/* Template editor */}
      <Modal open={openTpl} onClose={()=>setOpenTpl(false)} title={tplForm.id ? "Edit Template" : "New Template"}>
        <form onSubmit={saveTpl} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Type">
              <select className="inp" value={tplForm.kind} onChange={(e)=>setTplForm(f=>({ ...f, kind:e.target.value }))}>
                <option value="workout">Workout</option>
                <option value="plan">Plan</option>
              </select>
            </Field>
            <Field label="Name"><input className="inp" value={tplForm.name} onChange={(e)=>setTplForm(f=>({ ...f, name:e.target.value }))} required /></Field>
            <Field label="Level">
              <select className="inp" value={tplForm.level} onChange={(e)=>setTplForm(f=>({ ...f, level:e.target.value }))}>
                {["Beginner","Intermediate","Advanced","All"].map(x => <option key={x}>{x}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Goal"><input className="inp" value={tplForm.goal} onChange={(e)=>setTplForm(f=>({ ...f, goal:e.target.value }))} /></Field>
            <Field label="Blocks (weeks)"><input type="number" className="inp" value={tplForm.blocks} onChange={(e)=>setTplForm(f=>({ ...f, blocks:+e.target.value }))} /></Field>
            <Field label="Notes"><input className="inp" value={tplForm.notes} onChange={(e)=>setTplForm(f=>({ ...f, notes:e.target.value }))} /></Field>
          </div>
          <div className="flex items-center justify-end"><button className="btn-primary">{tplForm.id?"Save":"Create"}</button></div>
        </form>
      </Modal>

      {/* Document editor */}
      <Modal open={openDoc} onClose={()=>setOpenDoc(false)} title={docForm.id ? "Edit Document" : "New Document"}>
        <form onSubmit={saveDoc} className="space-y-3">
          <Field label="Name"><input className="inp" value={docForm.name} onChange={(e)=>setDocForm(f=>({ ...f, name:e.target.value }))} required /></Field>
          <Field label="Requires E-sign">
            <select className="inp" value={String(docForm.requireSign)} onChange={(e)=>setDocForm(f=>({ ...f, requireSign: e.target.value==="true" }))}>
              <option value="true">Yes</option><option value="false">No</option>
            </select>
          </Field>
          <div className="flex items-center justify-end"><button className="btn-primary">{docForm.id?"Save":"Create"}</button></div>
        </form>
      </Modal>

      {/* Send for e-sign */}
      <Modal open={openSend} onClose={()=>setOpenSend(false)} title="Send for E-sign">
        <form onSubmit={sendForSign} className="space-y-3">
          <Field label="Document">
            <select className="inp" value={sendForm.docId} onChange={(e)=>setSendForm(f=>({ ...f, docId:e.target.value }))} required>
              <option value="">Select…</option>
              {docs.filter(d=>d.requireSign).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Recipient Emails (comma separated)">
            <textarea className="inp" rows={3} value={sendForm.emails} onChange={(e)=>setSendForm(f=>({ ...f, emails:e.target.value }))} />
          </Field>
          <div className="flex items-center justify-end"><button className="btn-primary">Send</button></div>
        </form>
      </Modal>

      {/* Preview modal */}
      <Modal open={!!preview} onClose={()=>setPreview(null)} title={preview?.type==="media" ? preview?.data?.name : preview?.data?.name || "Preview"}>
        {preview?.type==="media" ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 h-48 grid place-items-center text-slate-500">
              {preview.data.type.toUpperCase()} PREVIEW
            </div>
            <div className="text-sm text-slate-600">{(preview.data.size/1024).toFixed(0)} KB · tags: {(preview.data.tags||[]).join(", ")||"—"}</div>
            <div className="flex items-center gap-2">
              <button className="btn-sm" onClick={()=>tagMedia(preview.data.id, "featured")}>Add #featured</button>
              <button className="btn-sm" onClick={()=>removeMedia(preview.data.id)}><Trash2 className="w-4 h-4" /> Delete</button>
            </div>
          </div>
        ) : preview?.type==="doc" ? (
          <div className="space-y-3">
            <div className="text-sm text-slate-600">Status: <strong>{preview.data.status}</strong> · Versions: {preview.data.versions?.length||0}</div>
            <ul className="text-sm list-disc pl-5">
              {(preview.data.versions||[]).map(v => <li key={v.n}>v{v.n} — {v.at}</li>)}
            </ul>
          </div>
        ) : null}
      </Modal>

      {/* Local styles for inputs/buttons if not global */}
      <style jsx>{`
        .inp { @apply w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30; }
        .btn-primary { @apply px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white; }
        .btn-sm { @apply px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50; }
      `}</style>
    </div>
  );
}

/* ===== tiny helpers ===== */
function Field({ label, children }){ return (<div><label className="text-sm text-slate-600">{label}</label><div className="mt-1">{children}</div></div>); }
function exportCSV(name, rows){
  const keys = Object.keys(rows[0]||{});
  const csv = [keys, ...rows.map(r=>keys.map(k => Array.isArray(r[k]) ? r[k].join("|") : r[k]))]
    .map(r => r.map(x => `"${String(x??"").replace(/"/g,'""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type:"text/csv;charset=utf-8" }));
  const a=document.createElement("a"); a.href=url; a.download=`${name}.csv`; a.click(); URL.revokeObjectURL(url);
}
