
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import DataTable from "@/components/dashboard/ui/DataTable";
import {
  PageHeader, TabsPill, ToolbarButton, EmptyState, Modal,
  RingProgress, ProgressBar, PhotoGrid, Lightbox, MiniLine, spring
} from "@/components/dashboard/ui/UI";
import { LineChart as LineIcon, Camera, CalendarRange, CheckCircle2, Upload, Download, Scale, PercentCircle, Image as ImageIcon, ClipboardList } from "lucide-react";

/* ================= Mock seed (replace with API) ================= */
const seedMeasurements = [
  { date:"2025-05-01", weight:85, bodyFat:22, chest:105, waist:92, arms:34, thighs:58 },
  { date:"2025-06-01", weight:82, bodyFat:20, chest:104, waist:89, arms:34.5, thighs:57 },
  { date:"2025-07-01", weight:80, bodyFat:18, chest:103, waist:86, arms:35, thighs:56 },
  { date:"2025-08-01", weight:78, bodyFat:16, chest:102, waist:84, arms:35.5, thighs:55 },
];

const seedCheckins = [
  { id:"CI-1", date:"2025-08-07", weight:79.2, bodyFat:16.8, notes:"Great sleep, diet on point", photos: [] },
  { id:"CI-2", date:"2025-08-21", weight:78.4, bodyFat:16.1, notes:"Deload week", photos: [] },
];

const seedPhotos = [
  // demo URLs; will be replaced by user uploads
];

export default function MyProgressPage(){
  const [tab, setTab] = useState("overview"); // overview | measurements | photos | checkins
  const [loading, setLoading] = useState(true);

  const [measurements, setMeasurements] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [photos, setPhotos] = useState([]);

  useEffect(()=>{
    setLoading(true);
    setTimeout(()=>{
      setMeasurements(seedMeasurements);
      setCheckins(seedCheckins);
      setPhotos(seedPhotos);
      setLoading(false);
    }, 400);
  },[]);

  const latest = measurements[measurements.length-1];
  const first  = measurements[0];

  const delta = (k) => latest && first ? +(latest[k] - first[k]).toFixed(1) : 0;
  const pct   = (val, tgt) => Math.min(100, Math.round((val/Math.max(1,tgt))*100));

  /* ============== Charts data ============== */
  const weightSeries = useMemo(()=> measurements.map(m => ({ date:m.date, value:m.weight })), [measurements]);
  const bodyFatSeries= useMemo(()=> measurements.map(m => ({ date:m.date, value:m.bodyFat })), [measurements]);

  /* ============== Photos Lightbox ============== */
  const [openLB, setOpenLB] = useState(false);
  const [idxLB, setIdxLB]   = useState(0);

  /* ============== Check‑in modal ============== */
  const [openCI, setOpenCI] = useState(false);
  const [ciForm, setCiForm] = useState({ date: todayISO(), weight: "", bodyFat: "", chest:"", waist:"", arms:"", thighs:"", notes:"", files: [] });

  function onFiles(files){
    const arr = Array.from(files||[]).slice(0,6);
    setCiForm(f => ({ ...f, files: arr }));
  }

  function submitCheckin(e){
    e.preventDefault();
    // persist locally; replace with API
    const newPhotos = ciForm.files.map((file,i) => ({ id: "P-"+Date.now()+"-"+i, url: URL.createObjectURL(file), date: ciForm.date, label: file.name }));
    setPhotos(p => [...newPhotos, ...p]);

    // measurement row from check‑in if provided
    const meas = {
      date: ciForm.date,
      weight: numOr(latest?.weight, ciForm.weight),
      bodyFat: numOr(latest?.bodyFat, ciForm.bodyFat),
      chest: numOr(latest?.chest, ciForm.chest),
      waist: numOr(latest?.waist, ciForm.waist),
      arms: numOr(latest?.arms, ciForm.arms),
      thighs: numOr(latest?.thighs, ciForm.thighs),
    };
    setMeasurements(list => [...list, meas].sort((a,b)=> a.date.localeCompare(b.date)));

    const record = { id: "CI-"+Date.now(), date: ciForm.date, weight: meas.weight, bodyFat: meas.bodyFat, notes: ciForm.notes, photos: newPhotos.map(p=>p.id) };
    setCheckins(list => [record, ...list]);

    setOpenCI(false);
    setCiForm({ date: todayISO(), weight: "", bodyFat: "", chest:"", waist:"", arms:"", thighs:"", notes:"", files: [] });
  }

  /* ============== Tables columns ============== */
  const measCols = [
    { header:"Date", accessor:"date" },
    { header:"Weight (kg)", accessor:"weight", cell:r=> numFmt(r.weight) },
    { header:"Body Fat (%)", accessor:"bodyFat", cell:r=> numFmt(r.bodyFat) },
    { header:"Chest (cm)", accessor:"chest" },
    { header:"Waist (cm)", accessor:"waist" },
    { header:"Arms (cm)", accessor:"arms" },
    { header:"Thighs (cm)", accessor:"thighs" },
  ];

  const ciCols = [
    { header:"Date", accessor:"date" },
    { header:"Weight", accessor:"weight", cell:r=> r.weight?`${r.weight} kg`:"—" },
    { header:"Body Fat", accessor:"bodyFat", cell:r=> r.bodyFat?`${r.bodyFat}%`:"—" },
    { header:"Notes", accessor:"notes" },
    { header:"Photos", accessor:"photos", cell:r=> r.photos?.length || 0 },
  ];

  /* ============== Render ============== */
  return (
    <div className="space-y-6">
      <PageHeader
        icon={LineIcon}
        title="Progress & Check‑ins"
        subtitle="Track measurements, submit weekly check‑ins, and maintain a photo gallery."
        actions={
          <div className="flex items-center gap-2">
            <ToolbarButton icon={Upload} variant="secondary" onClick={()=>setOpenCI(true)}>New Check‑in</ToolbarButton>
            <ToolbarButton icon={Download} variant="secondary" onClick={()=>exportCSV('measurements', measurements)}>Export CSV</ToolbarButton>
          </div>
        }
      />

      <TabsPill
        id="progress-tabs"
        tabs={[
          { key:"overview",     label:"Overview",    icon: LineIcon },
          { key:"measurements", label:"Measurements",icon: Scale },
          { key:"photos",       label:"Photos",      icon: ImageIcon },
          { key:"checkins",     label:"Check‑ins",   icon: ClipboardList },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* ===== Overview ===== */}
      {tab==="overview" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPI title="Weight change" value={latest?`${latest.weight} kg`:"—"} delta={delta('weight')} unit="kg" />
            <KPI title="Body fat change" value={latest?`${latest.bodyFat}%`:"—"} delta={delta('bodyFat')} unit="%" goodDown />
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-600">Check‑ins</div>
              <div className="mt-2 flex items-center gap-3">
                <RingProgress value={pct(checkins.length, 12)}>
                  <div className="text-center">
                    <div className="text-[10px] text-slate-500">This quarter</div>
                    <div className="text-sm font-semibold">{checkins.length}</div>
                  </div>
                </RingProgress>
                <div className="text-sm text-slate-600">{checkins.length} submitted</div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Weight trend</div>
              </div>
              <div className="mt-2 overflow-x-auto"><MiniLine data={weightSeries} /></div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Body fat trend</div>
              </div>
              <div className="mt-2 overflow-x-auto"><MiniLine data={bodyFatSeries} /></div>
            </div>
          </div>

          {/* Recent photos strip */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Recent photos</div>
              <ToolbarButton icon={Camera} variant="secondary" onClick={()=>setTab('photos')}>Open gallery</ToolbarButton>
            </div>
            <div className="mt-3">
              {photos.length ? (
                <PhotoGrid photos={photos.slice(0,12)} onOpen={(i)=>{ setIdxLB(i); setOpenLB(true); }} />
              ) : (
                <EmptyState title="No photos" subtitle="Add photos from the Check‑in tab." />
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ===== Measurements ===== */}
      {tab==="measurements" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Measurements</div>
          </div>
          <div className="mt-3">
            <DataTable columns={measCols} data={[...measurements].sort((a,b)=> (b.date).localeCompare(a.date))} loading={loading} pagination itemsPerPage={10} />
            {!loading && !measurements.length && <EmptyState title="No measurements" subtitle="Submit a check‑in to add your first record." />}
          </div>
        </motion.div>
      )}

      {/* ===== Photos ===== */}
      {tab==="photos" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Photo gallery</div>
            <ToolbarButton icon={Upload} variant="secondary" onClick={()=>setOpenCI(true)}>Add photos</ToolbarButton>
          </div>
          <div className="mt-3">
            <PhotoGrid photos={photos} onOpen={(i)=>{ setIdxLB(i); setOpenLB(true); }} />
          </div>
          <Lightbox open={openLB} setOpen={setOpenLB} photos={photos} index={idxLB} setIndex={setIdxLB} />
        </motion.div>
      )}

      {/* ===== Check‑ins ===== */}
      {tab==="checkins" && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Weekly Check‑ins</div>
            <ToolbarButton icon={Upload} onClick={()=>setOpenCI(true)}>New Check‑in</ToolbarButton>
          </div>
          <div className="mt-3">
            <DataTable columns={ciCols} data={checkins} loading={loading} pagination itemsPerPage={8} />
            {!loading && !checkins.length && <EmptyState title="No check‑ins" subtitle="Use the New Check‑in button to submit one." />}
          </div>
        </motion.div>
      )}

      {/* ===== New Check‑in modal (with photo upload) ===== */}
      <Modal open={openCI} onClose={()=>setOpenCI(false)} title="New Check‑in">
        <form onSubmit={submitCheckin} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Date"><input type="date" className="inp" value={ciForm.date} onChange={e=>setCiForm(f=>({ ...f, date:e.target.value }))} /></Field>
            <Field label="Weight (kg)"><input type="number" step="0.1" className="inp" value={ciForm.weight} onChange={e=>setCiForm(f=>({ ...f, weight:e.target.value }))} /></Field>
            <Field label="Body Fat (%)"><input type="number" step="0.1" className="inp" value={ciForm.bodyFat} onChange={e=>setCiForm(f=>({ ...f, bodyFat:e.target.value }))} /></Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Field label="Chest (cm)"><input type="number" step="0.1" className="inp" value={ciForm.chest} onChange={e=>setCiForm(f=>({ ...f, chest:e.target.value }))} /></Field>
            <Field label="Waist (cm)"><input type="number" step="0.1" className="inp" value={ciForm.waist} onChange={e=>setCiForm(f=>({ ...f, waist:e.target.value }))} /></Field>
            <Field label="Arms (cm)"><input type="number" step="0.1" className="inp" value={ciForm.arms} onChange={e=>setCiForm(f=>({ ...f, arms:e.target.value }))} /></Field>
            <Field label="Thighs (cm)"><input type="number" step="0.1" className="inp" value={ciForm.thighs} onChange={e=>setCiForm(f=>({ ...f, thighs:e.target.value }))} /></Field>
          </div>

          <Field label="Notes"><textarea className="inp" rows={4} value={ciForm.notes} onChange={e=>setCiForm(f=>({ ...f, notes:e.target.value }))} placeholder="How did the week go?" /></Field>

          <Field label="Progress photos">
            <div className="rounded-xl border border-dashed border-slate-300 p-4 bg-slate-50/50">
              <input type="file" accept="image/*" multiple onChange={e=>onFiles(e.target.files)} />
              {ciForm.files?.length ? (
                <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {Array.from(ciForm.files).map((f,i)=> (
                    <div key={i} className="aspect-square rounded-lg overflow-hidden border border-slate-200">
                      <img src={URL.createObjectURL(f)} alt={f.name} className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-xs text-slate-500">Up to 6 photos: front / side / back, good light.</div>
              )}
            </div>
          </Field>

          <div className="flex items-center justify-end"><button className="btn-primary">Submit</button></div>
        </form>
      </Modal>

      <style jsx>{`
        .inp { @apply w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30; }
        .btn-primary { @apply px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white; }
      `}</style>
    </div>
  );
}

/* ===== small presentational bits ===== */
function KPI({ title, value, delta, unit, goodDown=false }){
  const sign = delta>0?"+":delta<0?"-":"";
  const good = goodDown ? delta<0 : delta>0; // green if moving in desired direction
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-sm text-slate-600">{title}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      {delta!=null && (
        <div className={`text-xs ${good?"text-emerald-600":"text-rose-600"}`}>{sign}{Math.abs(delta)} {unit}</div>
      )}
    </div>
  );
}
function Field({ label, children }){ return (<div><label className="text-sm text-slate-600">{label}</label><div className="mt-1">{children}</div></div>); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function numFmt(n){ return n==null?"—":Number(n).toFixed(1); }
function numOr(fallback, input){ return input===""||input==null ? Number(fallback||0) : Number(input); }
function exportCSV(name, rows){
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys, ...rows.map(r => keys.map(k => Array.isArray(r[k])? r[k].join("|") : r[k]))]
    .map(r => r.map(x => `"${String(x??"").replace(/"/g,'""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type:"text/csv;charset=utf-8" }));
  const a=document.createElement("a"); a.href=url; a.download=`${name}.csv`; a.click(); URL.revokeObjectURL(url);
}
