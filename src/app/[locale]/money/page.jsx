"use client"
import { useState, useEffect } from "react";
import {
  TrendingUp, TrendingDown, Wallet, Bell, Plus, X, ChevronDown,
  Calendar, DollarSign, RefreshCw, Users, Shield, Heart,
  PiggyBank, BarChart3, CheckCircle2, Clock, AlertCircle, Layers,
  ArrowUpRight, ArrowDownRight, Receipt, Building2, Landmark,
  Briefcase, Info, Flame, Target, CreditCard, Lock,
  AlignLeft, CalendarDays, Banknote, Hash, SquarePlus
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   DESIGN TOKENS + GLOBAL STYLES
───────────────────────────────────────────────────────────── */
const G = `
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

:root {
  --p50:#eef2ff; --p100:#e0e7ff; --p200:#c7d2fe; --p300:#a5b4fc;
  --p400:#818cf8; --p500:#6366f1; --p600:#4f46e5; --p700:#4338ca;
  --p800:#3730a3; --p900:#312e81;
  --s50:#faf5ff;  --s100:#f3e8ff; --s200:#e9d5ff; --s300:#d8b4fe;
  --s400:#c084fc; --s500:#a855f7; --s600:#9333ea; --s700:#7e22ce;
  --s800:#6b21a8; --s900:#581c87;

  --bg:       #f5f4f9;
  --surf:     #ffffff;
  --surf2:    #f8f7fc;
  --bd:       rgba(0,0,0,.065);
  --bd-p:     rgba(99,102,241,.14);

  --tx:       #17161f;
  --tx2:      #56536e;
  --tx3:      #9b98b3;

  --green:    #059669; --green-l: #d1fae5; --green-b: #a7f3d0;
  --red:      #dc2626; --red-l:   #fee2e2; --red-b:   #fecaca;
  --amber:    #d97706; --amber-l: #fef3c7; --amber-b: #fde68a;
  --blue:     #2563eb; --blue-l:  #dbeafe; --blue-b:  #bfdbfe;
  --pink:     #db2777; --pink-l:  #fce7f3; --pink-b:  #fbcfe8;
  --violet:   var(--p600);

  --r-sm: 8px; --r-md: 12px; --r-lg: 16px; --r-xl: 20px; --r-2xl: 24px;

  --sh-sm: 0 1px 3px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04);
  --sh-md: 0 4px 14px rgba(0,0,0,.09),0 2px 5px rgba(0,0,0,.05);
  --sh-lg: 0 8px 28px rgba(0,0,0,.11),0 3px 8px rgba(0,0,0,.06);
  --sh-xl: 0 16px 48px rgba(0,0,0,.13),0 6px 16px rgba(0,0,0,.07);
  --sh-p:  0 6px 22px rgba(99,102,241,.24);
  --glow:  0 0 0 3px rgba(99,102,241,.14);
}
 
  
.sb-hide{scrollbar-width:none}
.sb-hide::-webkit-scrollbar{display:none}

/* mono */
.mono{font-family:'IBM Plex Mono',monospace}

/* section label */
.sl{font-size:10.5px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;color:var(--tx3);font-family:'IBM Plex Mono',monospace}

/* progress */
.pt{width:100%;height:5px;background:var(--surf2);border-radius:99px;overflow:hidden}
.pf{height:100%;border-radius:99px;transform-origin:left;animation:growBar .75s cubic-bezier(.34,1.2,.64,1) both}

/* divider */
.dv{height:1px;background:var(--bd);margin:14px 0}

/* tag */
.tag{display:inline-flex;align-items:center;gap:3px;padding:3px 9px;border-radius:99px;font-size:11px;font-weight:700;white-space:nowrap}

/* grid */
.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media(min-width:640px){.stat-grid{grid-template-columns:repeat(4,1fr)}}

/* animations */
@keyframes fadeUp{from{opacity:0;transform:translateY(13px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes sheetUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@keyframes growBar{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes pulseDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.65)}}

.au{animation:fadeUp .38s cubic-bezier(.22,.68,0,1.1) both}
.fi{animation:fadeIn .2s ease both}
.su{animation:sheetUp .3s cubic-bezier(.22,.68,0,1.2) both}

.d0{animation-delay:0ms}.d1{animation-delay:55ms}.d2{animation-delay:110ms}
.d3{animation-delay:165ms}.d4{animation-delay:220ms}.d5{animation-delay:275ms}

/* overlay */
.ov{position:fixed;inset:0;z-index:60;background:rgba(20,19,28,.46);backdrop-filter:blur(10px) saturate(1.4)}

/* bottom-sheet modal */
.bsh{
  position:fixed;bottom:0;left:0;right:0;z-index:70;
  background:var(--surf);
  border-radius:24px 24px 0 0;
  box-shadow:var(--sh-xl);
  max-height:92dvh;
  overflow-y:auto;
  padding:20px 18px 32px;
}
@media(min-width:600px){
  .bsh{
    position:fixed;top:50%;left:50%;right:auto;bottom:auto;
    transform:translate(-50%,-50%);
    border-radius:24px;
    width:100%;max-width:480px;
    max-height:88dvh;
  }
}

/* drag handle */
.dh{width:36px;height:4px;background:#e2e0eb;border-radius:99px;margin:0 auto 18px}

/* card */
.card{background:var(--surf);border:1.5px solid var(--bd);border-radius:var(--r-xl);box-shadow:var(--sh-sm)}
.card-hov{transition:box-shadow .18s,transform .18s,border-color .18s}
.card-hov:hover{box-shadow:var(--sh-md);transform:translateY(-1px);border-color:var(--p200) !important}

/* inline add form */
.iform{border-radius:var(--r-xl);padding:18px;border:1.5px dashed var(--p300);background:linear-gradient(135deg,var(--p50) 0%,var(--s50) 100%);animation:fadeUp .25s ease both}

/* field */
.fi-input,.fi-sel{
  width:100%;background:var(--surf);border:1.5px solid var(--bd);
  border-radius:var(--r-md);padding:10px 13px;
  font-family:'Tajawal',sans-serif;font-size:14px;font-weight:500;
  color:var(--tx);outline:none;
  transition:border-color .16s,box-shadow .16s;
  direction:rtl;
}
.fi-input::placeholder{color:var(--tx3);font-weight:400}
.fi-input:focus,.fi-sel:focus{border-color:var(--p400);box-shadow:var(--glow)}
.fi-sel{-webkit-appearance:none;appearance:none;cursor:pointer}

/* buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;font-family:'Tajawal',sans-serif;font-weight:700;border:none;cursor:pointer;transition:all .17s;white-space:nowrap;outline:none;-webkit-tap-highlight-color:transparent}
.btn:disabled{opacity:.5;cursor:not-allowed}
.btn-p{background:linear-gradient(135deg,var(--p600) 0%,var(--s600) 100%);color:#fff;box-shadow:var(--sh-p);border-radius:var(--r-md);padding:10px 20px;font-size:13.5px}
.btn-p:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.06);box-shadow:0 10px 28px rgba(99,102,241,.30)}
.btn-g{background:var(--surf2);color:var(--tx2);border:1.5px solid var(--bd);border-radius:var(--r-md);padding:9px 16px;font-size:13px}
.btn-g:hover:not(:disabled){background:var(--p50);border-color:var(--p200);color:var(--p600)}
.btn-ic{border-radius:var(--r-md);width:38px;height:38px;padding:0;background:var(--surf);border:1.5px solid var(--bd);color:var(--tx2)}
.btn-ic:hover:not(:disabled){background:var(--p50);border-color:var(--p200);color:var(--p600)}
.btn-sm{padding:7px 14px;font-size:12.5px;border-radius:10px}

/* toggle */
.tgl-t{position:relative;width:42px;height:24px;border-radius:99px;cursor:pointer;transition:background .2s,border-color .2s}
.tgl-th{position:absolute;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.18);transition:all .22s cubic-bezier(.34,1.2,.64,1)}

/* tooltip */
.tipw{position:relative;display:inline-flex}
.tipw .tip{position:absolute;bottom:calc(100% + 7px);left:50%;transform:translateX(-50%);background:var(--tx);color:#fff;font-size:11px;font-weight:600;padding:5px 10px;border-radius:8px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .14s}
.tipw:hover .tip{opacity:1}

/* tab row */
.tab-row{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px}
.tab-row::-webkit-scrollbar{display:none}

/* header */
.hdr{position:sticky;top:0;z-index:40;height:58px;background:rgba(245,244,249,.88);backdrop-filter:blur(20px) saturate(1.6);border-bottom:1px solid var(--bd-p);display:flex;align-items:center;justify-content:space-between;padding:0 16px}

/* page */
.pg{max-width:900px;margin:0 auto;padding:16px 14px 100px}
@media(min-width:700px){.pg{padding:24px 20px 100px}}

/* pulse */
.pdot{display:inline-block;width:7px;height:7px;border-radius:50%;animation:pulseDot 1.7s ease-in-out infinite}

/* range */
input[type=range]{-webkit-appearance:none;width:100%;height:4px;border-radius:4px;cursor:pointer}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:var(--amber);border:3px solid #fff;box-shadow:var(--sh-sm);cursor:pointer;transition:transform .15s}
input[type=range]::-webkit-slider-thumb:hover{transform:scale(1.15)}
`;

/* ─────────────────────────────────────────────────────────────
   DATA
───────────────────────────────────────────────────────────── */
const today = new Date().toISOString().split("T")[0];
const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

const HIST = {
  "يناير":  {income:18500,expenses:6900},
  "فبراير": {income:19200,expenses:7400},
  "مارس":   {income:22000,expenses:7750},
  "أبريل":  {income:18000,expenses:6200},
  "مايو":   {income:20500,expenses:8100},
  "يونيو":  {income:18000,expenses:7000},
};

const INIT_INC = [
  {id:1,source:"شركة الأمل للتقنية",amount:18000,date:"2024-03-01",recurring:true},
  {id:2,source:"مشروع فريلانس",amount:3000,date:"2024-03-10",recurring:false},
  {id:3,source:"مكافأة أداء",amount:1000,date:"2024-03-15",recurring:false},
];
const INIT_EXP = [
  {id:1,desc:"سوبرماركت كارفور",amount:2200,date:"2024-03-05"},
  {id:2,desc:"أوبر — مواصلات",amount:800,date:"2024-03-06"},
  {id:3,desc:"فاتورة الكهرباء والنت",amount:950,date:"2024-03-07"},
  {id:4,desc:"صيدلية — دواء",amount:400,date:"2024-03-12"},
  {id:5,desc:"سينما مع العيلة",amount:600,date:"2024-03-14"},
  {id:6,desc:"ملابس عرب مول",amount:1800,date:"2024-03-18"},
];
const INIT_COMMIT = [
  {id:1,name:"إيجار الشقة",amount:3500,dueDate:"2024-04-01",priority:"high",status:"paid",type:"التزام"},
  {id:2,name:"Netflix",amount:89,dueDate:"2024-04-05",priority:"low",status:"pending",type:"اشتراك"},
  {id:3,name:"انترنت منزلي",amount:350,dueDate:"2024-04-01",priority:"medium",status:"paid",type:"اشتراك"},
  {id:4,name:"قسط موبايل",amount:450,dueDate:"2024-04-10",priority:"medium",status:"pending",type:"التزام"},
  {id:5,name:"جمعية الشغل",amount:2000,dueDate:"2024-04-01",priority:"high",status:"paid",type:"جمعية",jamiaMembers:10,jamiaMyTurn:3,jamiaPaidMonths:3,jamiaEndDate:"2024-10-01"},
  {id:6,name:"Spotify",amount:45,dueDate:"2024-04-08",priority:"low",status:"pending",type:"اشتراك"},
  {id:7,name:"صندوق الطوارئ",amount:500,dueDate:"2024-04-30",priority:"high",status:"pending",type:"ادخار",savingTarget:30000,savingCurrent:12000},
  {id:8,name:"رحلة أوروبا",amount:300,dueDate:"2024-08-01",priority:"medium",status:"pending",type:"ادخار",savingTarget:8000,savingCurrent:3200},
];
const INIT_ZLOG = [
  {id:1,amount:200,desc:"صدقة لمريض",date:"2024-03-05"},
  {id:2,amount:120,desc:"إفطار صائم",date:"2024-03-15"},
  {id:3,amount:500,desc:"زكاة المال",date:"2024-03-01"},
];
const NOTIFS = [
  {id:1,text:"Netflix بتتجدد بعد 3 أيام",type:"warn",time:"منذ ساعة"},
  {id:2,text:"تم استلام المرتب — 18,000 ج",type:"ok",time:"منذ يومين"},
  {id:3,text:"تجاوزت 80% ميزانية المشتريات",type:"alert",time:"منذ 3 أيام"},
];

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
const N = v => new Intl.NumberFormat("ar-EG").format(Math.round(v||0));
const fmtD = d => {
  if(!d) return "";
  const [y,m,day] = d.split("-");
  return `${day} ${MONTHS_AR[parseInt(m,10)-1]}`;
};

/* ─────────────────────────────────────────────────────────────
   ATOMS
───────────────────────────────────────────────────────────── */
function Prog({pct,color="var(--p500)",colorEnd}){
  const bg = colorEnd ? `linear-gradient(90deg,${color},${colorEnd})` : color;
  return <div className="pt"><div className="pf" style={{width:`${Math.min(pct||0,100)}%`,background:bg}}/></div>;
}

function Spark({vals,color="var(--p500)",h=28,w=60}){
  if(!vals||vals.length<2) return null;
  const mx=Math.max(...vals),mn=Math.min(...vals),range=(mx-mn)||1;
  const pts=vals.map((v,i)=>`${(i/(vals.length-1))*w},${h-((v-mn)/range)*(h-4)-2}`).join(" ");
  const lx=w,ly=h-((vals.at(-1)-mn)/range)*(h-4)-2;
  return(
    <svg width={w} height={h} style={{flexShrink:0,overflow:"visible"}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={lx} cy={ly} r="3" fill={color}/>
    </svg>
  );
}

function Field({label,placeholder,type="text",value,onChange,icon,className=""}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:6}} className={className}>
      {label&&<label className="sl">{label}</label>}
      <div style={{position:"relative"}}>
        {icon&&<span style={{position:"absolute",right:11,top:"50%",transform:"translateY(-50%)",color:"var(--tx3)",display:"flex",pointerEvents:"none"}}>{icon}</span>}
        <input type={type} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}
          className="fi-input" style={{paddingRight:icon?36:13}}/>
      </div>
    </div>
  );
}

function FSelect({label,value,onChange,options,icon,className=""}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:6}} className={className}>
      {label&&<label className="sl">{label}</label>}
      <div style={{position:"relative"}}>
        {icon&&<span style={{position:"absolute",right:11,top:"50%",transform:"translateY(-50%)",color:"var(--tx3)",display:"flex",pointerEvents:"none"}}>{icon}</span>}
        <select value={value} onChange={e=>onChange(e.target.value)} className="fi-sel"
          style={{paddingRight:icon?36:13}}>
          {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={13} style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"var(--tx3)",pointerEvents:"none"}}/>
      </div>
    </div>
  );
}

function Toggle({checked,onChange,label}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>onChange(!checked)}>
      <div className="tgl-t" style={{background:checked?"var(--p500)":"var(--surf2)",border:`1.5px solid ${checked?"var(--p400)":"var(--bd)"}`}}>
        <div className="tgl-th" style={{right:checked?3:"auto",left:checked?"auto":3}}/>
      </div>
      {label&&<span style={{fontSize:13.5,fontWeight:600,color:"var(--tx2)"}}>{label}</span>}
    </div>
  );
}

function Tag({children,color,bg,border}){
  return(
    <span className="tag" style={{color,background:bg||`${color}18`,border:`1px solid ${border||color+"2e"}`}}>
      {children}
    </span>
  );
}

function SCard({children,style={},hover=false,className=""}){
  return(
    <div className={`card${hover?" card-hov":""} ${className}`} style={style}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MODAL
───────────────────────────────────────────────────────────── */
function Modal({open,onClose,title,icon:Icon,iconBg,children}){
  useEffect(()=>{
    if(open) document.body.style.overflow="hidden";
    else document.body.style.overflow="";
    return ()=>{document.body.style.overflow="";};
  },[open]);
  if(!open) return null;
  return(
    <>
      <div className="ov fi" onMouseDown={e=>e.target===e.currentTarget&&onClose()}/>
      <div className="bsh su">
        <div className="dh"/>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
          <div style={{display:"flex",alignItems:"center",gap:11}}>
            <div style={{width:38,height:38,borderRadius:12,background:iconBg||"linear-gradient(135deg,var(--p600),var(--s600))",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"var(--sh-p)"}}>
              {Icon&&<Icon size={18} color="white"/>}
            </div>
            <h3 style={{fontWeight:900,fontSize:17,color:"var(--tx)",letterSpacing:"-0.2px"}}>{title}</h3>
          </div>
          <button className="btn btn-ic" onClick={onClose}><X size={16}/></button>
        </div>
        {children}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   STAT CARDS
───────────────────────────────────────────────────────────── */
function StatCards({inc,exp,pInc,pExp}){
  const net=inc-exp, bal=14250+net;
  const icChg=pInc?Math.round(((inc-pInc)/pInc)*100):0;
  const cards=[
    {l:"الرصيد",v:N(bal),u:"ج",Icon:Wallet,c:"var(--p600)",spark:[11200,12400,10900,13200,bal]},
    {l:"الدخل",v:N(inc),u:"ج",Icon:TrendingUp,c:"var(--green)",spark:[15000,17000,pInc||19000,inc],chg:icChg},
    {l:"المصروفات",v:N(exp),u:"ج",Icon:TrendingDown,c:"var(--red)",spark:[8500,7800,pExp||8000,exp]},
    {l:"الصافي",v:(net>=0?"+":"")+N(net),u:"ج",Icon:BarChart3,c:net>=0?"var(--green)":"var(--red)",spark:[5500,9600,11200,net]},
  ];
  return(
    <div className="stat-grid">
      {cards.map((c,i)=>(
        <SCard key={i} hover className={`au d${i}`} style={{padding:"16px 16px 14px",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,right:0,left:0,height:2.5,background:`linear-gradient(90deg,${c.c},var(--s500))`,borderRadius:"var(--r-xl) var(--r-xl) 0 0"}}/>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:14}}>
            <div style={{width:34,height:34,borderRadius:10,background:`${c.c}18`,border:`1.5px solid ${c.c}2e`,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <c.Icon size={16} style={{color:c.c}}/>
            </div>
            {c.chg!==undefined&&(
              <span style={{display:"flex",alignItems:"center",gap:3,fontSize:10.5,fontWeight:800,fontFamily:"'IBM Plex Mono',monospace",padding:"3px 8px",borderRadius:99,background:c.chg>=0?"var(--green-l)":"var(--red-l)",color:c.chg>=0?"var(--green)":"var(--red)"}}>
                {c.chg>=0?<ArrowUpRight size={11}/>:<ArrowDownRight size={11}/>}{Math.abs(c.chg)}%
              </span>
            )}
          </div>
          <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:6}}>
            <div>
              <div className="mono" style={{fontSize:22,fontWeight:600,color:c.c,lineHeight:1,letterSpacing:"-0.5px"}}>{c.v}</div>
              <div style={{fontSize:10.5,color:"var(--tx3)",marginTop:3}}>{c.u}</div>
            </div>
            <Spark vals={c.spark} color={c.c}/>
          </div>
          <div style={{marginTop:10,fontSize:11.5,fontWeight:700,color:"var(--tx3)"}}>{c.l}</div>
        </SCard>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MONTH PREVIEW
───────────────────────────────────────────────────────────── */
function MonthPreview({sel,onSel}){
  const months=Object.keys(HIST);
  const d=HIST[sel]||HIST["مارس"];
  const net=d.income-d.expenses;
  const mx=Math.max(...months.map(m=>Math.max(HIST[m].income,HIST[m].expenses)));
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Month pills */}
      <div className="tab-row sb-hide">
        {months.map(m=>{
          const on=m===sel;
          return(
            <button key={m} onClick={()=>onSel(m)} className="btn"
              style={{flexShrink:0,padding:"7px 14px",borderRadius:10,fontSize:12.5,fontWeight:on?800:600,background:on?"var(--p600)":"var(--surf)",color:on?"#fff":"var(--tx2)",border:`1.5px solid ${on?"var(--p600)":"var(--bd)"}`,boxShadow:on?"var(--sh-p)":"var(--sh-sm)"}}>
              {m}
            </button>
          );
        })}
      </div>
      {/* 3-col summary */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {[
          {l:"الدخل",v:N(d.income),c:"var(--green)",bg:"var(--green-l)",bo:"var(--green-b)"},
          {l:"المصروف",v:N(d.expenses),c:"var(--red)",bg:"var(--red-l)",bo:"var(--red-b)"},
          {l:"الصافي",v:(net>=0?"+":"")+N(net),c:net>=0?"var(--green)":"var(--red)",bg:net>=0?"var(--green-l)":"var(--red-l)",bo:net>=0?"var(--green-b)":"var(--red-b)"},
        ].map((s,i)=>(
          <div key={i} style={{background:s.bg,border:`1px solid ${s.bo}`,borderRadius:14,padding:"12px 10px",textAlign:"center"}}>
            <div className="sl" style={{marginBottom:5}}>{s.l}</div>
            <div className="mono" style={{fontSize:15,fontWeight:600,color:s.c}}>{s.v}</div>
          </div>
        ))}
      </div>
      {/* Bar chart */}
      <SCard style={{padding:18}}>
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:16}}>
          <BarChart3 size={14} style={{color:"var(--p500)"}}/>
          <span style={{fontWeight:800,fontSize:13,color:"var(--tx)"}}>مقارنة شهرية</span>
        </div>
        <div style={{display:"flex",alignItems:"flex-end",gap:5,height:88}}>
          {months.map(m=>{
            const md=HIST[m],on=m===sel;
            const hI=Math.round((md.income/mx)*74);
            const hE=Math.round((md.expenses/mx)*74);
            return(
              <div key={m} onClick={()=>onSel(m)}
                style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:5,cursor:"pointer"}}>
                <div style={{width:"100%",display:"flex",gap:2,alignItems:"flex-end",height:74}}>
                  <div style={{flex:1,height:hI,borderRadius:"4px 4px 0 0",background:on?"var(--green)":"var(--green-l)",transition:"height .6s cubic-bezier(.34,1.2,.64,1)"}}/>
                  <div style={{flex:1,height:hE,borderRadius:"4px 4px 0 0",background:on?"var(--red)":"var(--red-l)",transition:"height .6s cubic-bezier(.34,1.2,.64,1)"}}/>
                </div>
                <div style={{fontSize:9.5,fontFamily:"'IBM Plex Mono',monospace",fontWeight:600,color:on?"var(--p600)":"var(--tx3)"}}>
                  {m.slice(0,3)}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",gap:16,marginTop:12}}>
          {[{bg:"var(--green)",l:"الدخل"},{bg:"var(--red)",l:"المصروف"}].map((lg,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:11.5,color:"var(--tx3)"}}>
              <span style={{width:10,height:10,borderRadius:3,background:lg.bg,display:"inline-block"}}/>
              {lg.l}
            </div>
          ))}
        </div>
      </SCard>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   INCOME TAB
───────────────────────────────────────────────────────────── */
function IncomeTab({data,onUpdate}){
  const [form,setForm]=useState({source:"",amount:"",date:today,recurring:true,open:false});
  function save(){
    if(!form.source||!form.amount) return;
    onUpdate([...data,{id:Date.now(),source:form.source,amount:Number(form.amount),date:form.date,recurring:form.recurring}]);
    setForm(p=>({...p,source:"",amount:"",date:today,recurring:true,open:false}));
  }
  const total=data.reduce((s,i)=>s+i.amount,0);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div>
          <div className="sl" style={{marginBottom:4}}>إجمالي الدخل — مارس 2024</div>
          <div style={{display:"flex",alignItems:"baseline",gap:6}}>
            <span className="mono" style={{fontSize:30,fontWeight:600,color:"var(--green)",letterSpacing:"-1px"}}>{N(total)}</span>
            <span style={{fontSize:13,color:"var(--tx3)",fontWeight:600}}>جنيه</span>
          </div>
        </div>
        {!form.open&&(
          <button onClick={()=>setForm(p=>({...p,open:true}))} className="btn btn-g btn-sm" style={{display:"flex",alignItems:"center",gap:5}}>
            <Plus size={13}/>إضافة
          </button>
        )}
      </div>
      {form.open&&(
        <div className="iform">
          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:14}}>
            <Briefcase size={14} style={{color:"var(--p500)"}}/>
            <span style={{fontWeight:800,fontSize:13.5}}>مصدر دخل جديد</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Field label="اسم الجهة / الشركة" placeholder="شركة الأمل..."
              value={form.source} onChange={v=>setForm(p=>({...p,source:v}))}
              icon={<Building2 size={13}/>}
              className="col-span-2"/>
            <Field label="المبلغ (جنيه)" type="number" placeholder="0"
              value={form.amount} onChange={v=>setForm(p=>({...p,amount:v}))}
              icon={<DollarSign size={13}/>}/>
            <Field label="التاريخ" type="date" value={form.date}
              onChange={v=>setForm(p=>({...p,date:v}))} icon={<CalendarDays size={13}/>}/>
          </div>
          <div style={{marginTop:12}}><Toggle checked={form.recurring} onChange={v=>setForm(p=>({...p,recurring:v}))} label="يتكرر كل شهر"/></div>
          <div style={{display:"flex",gap:8,marginTop:14}}>
            <button onClick={save} className="btn btn-p" style={{flex:1}}><CheckCircle2 size={14}/>حفظ</button>
            <button onClick={()=>setForm(p=>({...p,open:false}))} className="btn btn-ic"><X size={15}/></button>
          </div>
        </div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {data.map((item,i)=>(
          <SCard key={item.id} hover className={`au d${Math.min(i,5)}`} style={{padding:"14px 16px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:38,height:38,borderRadius:11,background:"var(--green-l)",border:"1.5px solid var(--green-b)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Briefcase size={16} style={{color:"var(--green)"}}/>
                </div>
                <div>
                  <div style={{fontWeight:800,fontSize:14,color:"var(--tx)"}}>{item.source}</div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4,flexWrap:"wrap"}}>
                    {item.recurring&&<Tag color="var(--p600)" bg="var(--p100)" border="var(--p200)"><RefreshCw size={9}/>شهري</Tag>}
                    <span style={{fontSize:11,color:"var(--tx3)",fontFamily:"'IBM Plex Mono',monospace"}}>{fmtD(item.date)}</span>
                  </div>
                </div>
              </div>
              <div className="mono" style={{fontSize:17,fontWeight:600,color:"var(--green)",whiteSpace:"nowrap"}}>+{N(item.amount)}</div>
            </div>
          </SCard>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   EXPENSES TAB
───────────────────────────────────────────────────────────── */
function ExpensesTab({data,onUpdate}){
  const [form,setForm]=useState({desc:"",amount:"",date:today,open:false});
  function save(){
    if(!form.desc||!form.amount) return;
    onUpdate([...data,{id:Date.now(),desc:form.desc,amount:Number(form.amount),date:form.date}]);
    setForm(p=>({...p,desc:"",amount:"",date:today,open:false}));
  }
  const total=data.reduce((s,e)=>s+e.amount,0);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div>
          <div className="sl" style={{marginBottom:4}}>إجمالي المصروفات — مارس 2024</div>
          <div style={{display:"flex",alignItems:"baseline",gap:6}}>
            <span className="mono" style={{fontSize:30,fontWeight:600,color:"var(--red)",letterSpacing:"-1px"}}>{N(total)}</span>
            <span style={{fontSize:13,color:"var(--tx3)",fontWeight:600}}>جنيه</span>
          </div>
        </div>
        {!form.open&&(
          <button onClick={()=>setForm(p=>({...p,open:true}))} className="btn btn-g btn-sm" style={{display:"flex",alignItems:"center",gap:5}}>
            <Plus size={13}/>إضافة
          </button>
        )}
      </div>
      {form.open&&(
        <div className="iform" style={{borderColor:"var(--red-b)",background:"linear-gradient(135deg,var(--red-l) 0%,#fff9f9 100%)"}}>
          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:14}}>
            <Receipt size={14} style={{color:"var(--red)"}}/>
            <span style={{fontWeight:800,fontSize:13.5}}>مصروف جديد</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Field label="صرفت فين؟" placeholder="سوبرماركت، أوبر..."
              value={form.desc} onChange={v=>setForm(p=>({...p,desc:v}))}
              icon={<AlignLeft size={13}/>} className="col-span-2"/>
            <Field label="المبلغ (جنيه)" type="number" placeholder="0"
              value={form.amount} onChange={v=>setForm(p=>({...p,amount:v}))}
              icon={<DollarSign size={13}/>}/>
            <Field label="التاريخ" type="date" value={form.date}
              onChange={v=>setForm(p=>({...p,date:v}))} icon={<CalendarDays size={13}/>}/>
          </div>
          <div style={{display:"flex",gap:8,marginTop:14}}>
            <button onClick={save} className="btn btn-p" style={{flex:1,background:"linear-gradient(135deg,var(--red),#ef4444)"}}>
              <CheckCircle2 size={14}/>حفظ
            </button>
            <button onClick={()=>setForm(p=>({...p,open:false}))} className="btn btn-ic"><X size={15}/></button>
          </div>
        </div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {data.map((item,i)=>(
          <SCard key={item.id} hover className={`au d${Math.min(i,5)}`} style={{padding:"14px 16px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:38,height:38,borderRadius:11,background:"var(--red-l)",border:"1.5px solid var(--red-b)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Receipt size={16} style={{color:"var(--red)"}}/>
                </div>
                <div>
                  <div style={{fontWeight:800,fontSize:14,color:"var(--tx)"}}>{item.desc}</div>
                  <div style={{fontSize:11,color:"var(--tx3)",marginTop:3,fontFamily:"'IBM Plex Mono',monospace"}}>{fmtD(item.date)}</div>
                </div>
              </div>
              <div className="mono" style={{fontSize:17,fontWeight:600,color:"var(--red)",whiteSpace:"nowrap"}}>−{N(item.amount)}</div>
            </div>
          </SCard>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   COMMITMENTS TAB
───────────────────────────────────────────────────────────── */
const CTYPES=[
  {value:"التزام",label:"التزام ثابت",Icon:Lock,c:"var(--blue)",bg:"var(--blue-l)",bo:"var(--blue-b)"},
  {value:"اشتراك",label:"اشتراك",Icon:RefreshCw,c:"var(--s600)",bg:"var(--s100)",bo:"var(--s200)"},
  {value:"جمعية",label:"جمعية",Icon:Users,c:"var(--p600)",bg:"var(--p100)",bo:"var(--p200)"},
  {value:"ادخار",label:"ادخار",Icon:PiggyBank,c:"var(--green)",bg:"var(--green-l)",bo:"var(--green-b)"},
];
const PCFG={
  high:  {label:"عالي",  c:"var(--red)",  bg:"var(--red-l)",  bo:"var(--red-b)"},
  medium:{label:"متوسط", c:"var(--amber)",bg:"var(--amber-l)",bo:"var(--amber-b)"},
  low:   {label:"منخفض", c:"var(--green)",bg:"var(--green-l)",bo:"var(--green-b)"},
};
function tcfg(t){return CTYPES.find(x=>x.value===t)||CTYPES[0];}

function CommitmentsTab({data,onUpdate}){
  const [filter,setFilter]=useState("الكل");
  const [type,setType]=useState("التزام");
  const [form,setForm]=useState({name:"",amount:"",dueDate:today,priority:"medium",jamiaMembers:10,jamiaMyTurn:1,jamiaEndDate:"",savingTarget:"",open:false});
  const filters=["الكل",...CTYPES.map(t=>t.value)];
  const filtered=filter==="الكل"?data:data.filter(d=>d.type===filter);
  const pend=data.filter(d=>d.status!=="paid").reduce((s,d)=>s+d.amount,0);
  const paid=data.filter(d=>d.status==="paid").reduce((s,d)=>s+d.amount,0);
  function save(){
    if(!form.name||!form.amount) return;
    const base={id:Date.now(),name:form.name,amount:Number(form.amount),dueDate:form.dueDate,priority:form.priority,status:"pending",type};
    const ext=type==="جمعية"?{jamiaMembers:Number(form.jamiaMembers),jamiaMyTurn:Number(form.jamiaMyTurn),jamiaPaidMonths:0,jamiaEndDate:form.jamiaEndDate}
      :type==="ادخار"?{savingTarget:Number(form.savingTarget),savingCurrent:0}:{};
    onUpdate([...data,{...base,...ext}]);
    setForm(p=>({...p,name:"",amount:"",dueDate:today,open:false}));
  }
  function toggle(id){onUpdate(data.map(d=>d.id===id?{...d,status:d.status==="paid"?"pending":"paid"}:d));}

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* summary */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {[
          {l:"مستحق",v:N(pend),c:"var(--amber)",bg:"var(--amber-l)",bo:"var(--amber-b)"},
          {l:"مدفوع",v:N(paid),c:"var(--green)",bg:"var(--green-l)",bo:"var(--green-b)"},
        ].map((s,i)=>(
          <div key={i} style={{background:s.bg,border:`1.5px solid ${s.bo}`,borderRadius:14,padding:"13px 16px"}}>
            <div className="sl" style={{marginBottom:5}}>{s.l}</div>
            <div className="mono" style={{fontSize:19,fontWeight:600,color:s.c}}>{s.v}<span style={{fontSize:11,marginRight:4,fontFamily:"Tajawal,sans-serif"}}>ج</span></div>
          </div>
        ))}
      </div>
      {/* filters + add */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
        <div className="tab-row sb-hide" style={{flex:1,gap:5}}>
          {filters.map(f=>{
            const on=f===filter;
            return(
              <button key={f} onClick={()=>setFilter(f)} className="btn"
                style={{flexShrink:0,padding:"6px 13px",fontSize:12,borderRadius:9,background:on?"var(--p600)":"var(--surf2)",color:on?"#fff":"var(--tx2)",border:`1.5px solid ${on?"var(--p600)":"var(--bd)"}`,fontWeight:on?800:600}}>
                {f}
              </button>
            );
          })}
        </div>
        {!form.open&&(
          <button onClick={()=>setForm(p=>({...p,open:true}))} className="btn btn-g btn-sm" style={{flexShrink:0,display:"flex",alignItems:"center",gap:5}}>
            <Plus size={13}/>إضافة
          </button>
        )}
      </div>
      {/* form */}
      {form.open&&(
        <div className="iform">
          {/* type selector */}
          <div style={{marginBottom:14}}>
            <div className="sl" style={{marginBottom:8}}>نوع العملية</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {CTYPES.map(t=>{
                const on=type===t.value;
                return(
                  <button key={t.value} onClick={()=>setType(t.value)} className="btn"
                    style={{flexDirection:"column",gap:6,padding:"10px 6px",borderRadius:11,border:`2px solid ${on?t.c:"var(--bd)"}`,background:on?t.bg:"var(--surf)",color:on?t.c:"var(--tx3)",fontSize:11,fontWeight:800,alignItems:"center"}}>
                    <t.Icon size={16}/>
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Field label="الاسم" placeholder="اسم الالتزام..." value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} icon={<Layers size={13}/>}/>
            <Field label="المبلغ (ج)" type="number" placeholder="0" value={form.amount} onChange={v=>setForm(p=>({...p,amount:v}))} icon={<DollarSign size={13}/>}/>
            <Field label={type==="ادخار"?"موعد الهدف":"تاريخ الاستحقاق"} type="date" value={form.dueDate} onChange={v=>setForm(p=>({...p,dueDate:v}))} icon={<CalendarDays size={13}/>}/>
            <FSelect label="الأولوية" value={form.priority} onChange={v=>setForm(p=>({...p,priority:v}))} icon={<Flame size={13}/>}
              options={[{value:"high",label:"عالي"},{value:"medium",label:"متوسط"},{value:"low",label:"منخفض"}]}/>
            {type==="جمعية"&&<>
              <Field label="عدد الأعضاء" type="number" value={form.jamiaMembers} onChange={v=>setForm(p=>({...p,jamiaMembers:v}))} icon={<Users size={13}/>}/>
              <Field label="رقم دوري" type="number" value={form.jamiaMyTurn} onChange={v=>setForm(p=>({...p,jamiaMyTurn:v}))} icon={<Hash size={13}/>}/>
              <Field label="تاريخ الانتهاء" type="date" value={form.jamiaEndDate} onChange={v=>setForm(p=>({...p,jamiaEndDate:v}))} icon={<CalendarDays size={13}/>} className="col-span-2"/>
            </>}
            {type==="ادخار"&&<Field label="المبلغ المستهدف" type="number" placeholder="10,000" value={form.savingTarget} onChange={v=>setForm(p=>({...p,savingTarget:v}))} icon={<Target size={13}/>}/>}
          </div>
          <div style={{display:"flex",gap:8,marginTop:14}}>
            <button onClick={save} className="btn btn-p" style={{flex:1}}><CheckCircle2 size={14}/>حفظ</button>
            <button onClick={()=>setForm(p=>({...p,open:false}))} className="btn btn-ic"><X size={15}/></button>
          </div>
        </div>
      )}
      {/* list */}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map((item,idx)=>{
          const tc=tcfg(item.type);
          const pc=PCFG[item.priority]||PCFG.medium;
          const paid2=item.status==="paid";
          const isJ=item.type==="جمعية", isS=item.type==="ادخار";
          const spct=isS?Math.round((item.savingCurrent/item.savingTarget)*100):0;
          const jpct=isJ?Math.round((item.jamiaPaidMonths/item.jamiaMembers)*100):0;
          return(
            <SCard key={item.id} hover className={`au d${Math.min(idx,5)}`} style={{padding:"14px 16px",opacity:paid2?.82:1}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                {/* priority stripe */}
                <div style={{width:3.5,alignSelf:"stretch",borderRadius:99,background:pc.c,flexShrink:0,minHeight:44}}/>
                <div style={{width:36,height:36,borderRadius:10,flexShrink:0,background:tc.bg,border:`1.5px solid ${tc.bo}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <tc.Icon size={15} style={{color:tc.c}}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span style={{fontWeight:800,fontSize:14,color:paid2?"var(--tx3)":"var(--tx)",textDecoration:paid2?"line-through":"none"}}>{item.name}</span>
                      <Tag color={tc.c} bg={tc.bg} border={tc.bo}>{item.type}</Tag>
                      <Tag color={pc.c} bg={pc.bg} border={pc.bo}>{pc.label}</Tag>
                    </div>
                    <div className="mono" style={{fontSize:16,fontWeight:600,color:tc.c,flexShrink:0}}>{N(item.amount)}</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginTop:8,flexWrap:"wrap"}}>
                    <span style={{fontSize:11,color:"var(--tx3)",fontFamily:"'IBM Plex Mono',monospace",display:"flex",alignItems:"center",gap:4}}>
                      <CalendarDays size={10}/>{fmtD(item.dueDate)}
                    </span>
                    <button onClick={()=>toggle(item.id)} className="btn"
                      style={{padding:"3px 10px",borderRadius:99,fontSize:11.5,fontWeight:700,background:paid2?"var(--green-l)":"var(--amber-l)",color:paid2?"var(--green)":"var(--amber)",border:`1px solid ${paid2?"var(--green-b)":"var(--amber-b)"}`,gap:4}}>
                      {paid2?<><CheckCircle2 size={10}/>مدفوع</>:<><Clock size={10}/>مستحق</>}
                    </button>
                  </div>
                  {isJ&&(
                    <div style={{marginTop:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:11.5,marginBottom:6,color:"var(--tx3)"}}>
                        <span>{item.jamiaPaidMonths}/{item.jamiaMembers} شهر</span>
                        <span className="mono" style={{color:"var(--p600)",fontWeight:600}}>دوري: {item.jamiaMyTurn} · {jpct}%</span>
                      </div>
                      <Prog pct={jpct} color="var(--p500)"/>
                    </div>
                  )}
                  {isS&&(
                    <div style={{marginTop:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:11.5,marginBottom:6,color:"var(--tx3)"}}>
                        <span>الهدف {N(item.savingTarget)} ج</span>
                        <span className="mono" style={{color:"var(--green)",fontWeight:600}}>{N(item.savingCurrent)} · {spct}%</span>
                      </div>
                      <Prog pct={spct} color="var(--green)"/>
                    </div>
                  )}
                </div>
              </div>
            </SCard>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ZAKAT TAB
───────────────────────────────────────────────────────────── */
function ZakatTab({inc,exp,log,onLog}){
  const [mode,setMode]=useState("net");
  const [custom,setCustom]=useState("");
  const [pct,setPct]=useState(2.5);
  const [lf,setLf]=useState({desc:"",amount:"",date:today,open:false});
  const [info,setInfo]=useState(false);

  const base=mode==="net"?Math.max(inc-exp,0):mode==="total"?inc:Number(custom)||0;
  const due=Math.round((base*pct)/100);
  const paid2=log.reduce((s,l)=>s+l.amount,0);
  const rem=Math.max(due-paid2,0);
  const progress=due>0?Math.min(Math.round((paid2/due)*100),100):0;

  function saveLog(){
    if(!lf.desc||!lf.amount) return;
    onLog([...log,{id:Date.now(),desc:lf.desc,amount:Number(lf.amount),date:lf.date}]);
    setLf(p=>({...p,desc:"",amount:"",date:today,open:false}));
  }

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Calculator */}
      <SCard style={{padding:20,overflow:"hidden",position:"relative"}}>
        <div style={{position:"absolute",top:-30,left:-30,width:130,height:130,background:"radial-gradient(circle,rgba(217,119,6,.07) 0%,transparent 70%)",borderRadius:"50%",pointerEvents:"none"}}/>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:11,background:"linear-gradient(135deg,var(--amber),#f59e0b)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 12px rgba(217,119,6,.22)"}}>
              <Landmark size={16} color="white"/>
            </div>
            <span style={{fontWeight:900,fontSize:15}}>حساب الزكاة</span>
          </div>
          <button onClick={()=>setInfo(!info)} className="btn" style={{background:"transparent",border:"none",color:"var(--tx3)",padding:4}}>
            <Info size={15}/>
          </button>
        </div>
        {info&&(
          <div style={{background:"var(--amber-l)",border:"1px solid var(--amber-b)",borderRadius:12,padding:"12px 14px",marginBottom:16,fontSize:12.5,color:"var(--amber)",lineHeight:1.7}}>
            💡 زكاة المال 2.5% على المال الذي بلغ النصاب وحال عليه الحول. زكاة الزروع والثمار 10% بدون مؤونة، 5% بمؤونة. اختر الأساس المناسب لحسابك.
          </div>
        )}
        {/* mode */}
        <div style={{marginBottom:18}}>
          <div className="sl" style={{marginBottom:10}}>احسب على أساس</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {[
              {k:"net",l:"الصافي",hint:"دخل − مصروف",v:N(Math.max(inc-exp,0))},
              {k:"total",l:"الإجمالي",hint:"كل الدخل",v:N(inc)},
              {k:"custom",l:"مخصص",hint:"أنت بتحدد",v:custom?N(Number(custom)):"—"},
            ].map(o=>{
              const on=mode===o.k;
              return(
                <button key={o.k} onClick={()=>setMode(o.k)} className="btn"
                  style={{flexDirection:"column",gap:4,padding:"11px 8px",borderRadius:12,border:`2px solid ${on?"var(--amber)":"var(--bd)"}`,background:on?"var(--amber-l)":"var(--surf2)",alignItems:"center"}}>
                  <span style={{fontSize:11.5,fontWeight:700,color:on?"var(--amber)":"var(--tx2)"}}>{o.l}</span>
                  <span className="mono" style={{fontSize:12,fontWeight:600,color:on?"var(--amber)":"var(--tx3)"}}>{o.v}</span>
                  <span style={{fontSize:10,color:"var(--tx3)"}}>{o.hint}</span>
                </button>
              );
            })}
          </div>
          {mode==="custom"&&(
            <div style={{marginTop:10}}>
              <Field placeholder="أدخل المبلغ..." type="number" value={custom} onChange={setCustom} icon={<DollarSign size={13}/>}/>
            </div>
          )}
        </div>
        {/* pct slider */}
        <div style={{marginBottom:18}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div className="sl">نسبة الزكاة</div>
            <span className="mono" style={{fontSize:15,fontWeight:700,color:"var(--amber)"}}>{pct}%</span>
          </div>
          <input type="range" min={2} max={10} step={0.5} value={pct}
            onChange={e=>setPct(Number(e.target.value))}
            style={{background:`linear-gradient(to right,var(--amber) 0%,var(--amber) ${((pct-2)/8)*100}%,var(--amber-l) ${((pct-2)/8)*100}%,var(--amber-l) 100%)`}}/>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10.5,color:"var(--tx3)",marginTop:5}}>
            <span>2% مال</span><span>5% نصف عُشر</span><span>10% عُشر</span>
          </div>
        </div>
        {/* result */}
        <div style={{background:"var(--amber-l)",border:"1.5px solid var(--amber-b)",borderRadius:16,padding:"16px 18px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
            {[
              {l:"المطلوب",v:N(due),c:"var(--amber)"},
              {l:"مدفوع",v:N(paid2),c:"var(--green)"},
              {l:"متبقي",v:N(rem),c:rem>0?"var(--red)":"var(--green)"},
            ].map((s,i)=>(
              <div key={i} style={{textAlign:"center"}}>
                <div className="sl" style={{marginBottom:5,color:s.c}}>{s.l}</div>
                <div className="mono" style={{fontSize:18,fontWeight:700,color:s.c}}>{s.v}</div>
              </div>
            ))}
          </div>
          <Prog pct={progress} color="var(--amber)" colorEnd="#f59e0b"/>
          <div style={{textAlign:"center",marginTop:8,fontSize:12,color:"var(--amber)",fontWeight:700}}>{progress}% تم إخراجه</div>
        </div>
      </SCard>
      {/* Log */}
      <SCard style={{padding:20}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:10,background:"var(--pink-l)",border:"1.5px solid var(--pink-b)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Heart size={14} style={{color:"var(--pink)"}}/>
            </div>
            <span style={{fontWeight:800,fontSize:15}}>سجل الصدقات والزكاة</span>
          </div>
          {!lf.open&&(
            <button onClick={()=>setLf(p=>({...p,open:true}))} className="btn btn-g btn-sm" style={{display:"flex",alignItems:"center",gap:5}}>
              <Plus size={13}/>تسجيل
            </button>
          )}
        </div>
        {lf.open&&(
          <div className="iform" style={{borderColor:"var(--pink-b)",background:"linear-gradient(135deg,var(--pink-l) 0%,#fff 100%)",marginBottom:14}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Field label="أخرجت لمين؟" placeholder="صدقة، زكاة مال..." value={lf.desc} onChange={v=>setLf(p=>({...p,desc:v}))} icon={<Heart size={13}/>}/>
              <Field label="المبلغ (ج)" type="number" placeholder="0" value={lf.amount} onChange={v=>setLf(p=>({...p,amount:v}))} icon={<DollarSign size={13}/>}/>
              <Field label="التاريخ" type="date" value={lf.date} onChange={v=>setLf(p=>({...p,date:v}))} icon={<CalendarDays size={13}/>} className="col-span-2"/>
            </div>
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <button onClick={saveLog} className="btn btn-p" style={{flex:1,background:"linear-gradient(135deg,var(--pink),#ec4899)"}}>
                <Heart size={14}/>حفظ
              </button>
              <button onClick={()=>setLf(p=>({...p,open:false}))} className="btn btn-ic"><X size={15}/></button>
            </div>
          </div>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {log.map(item=>(
            <div key={item.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",borderRadius:12,background:"var(--pink-l)",border:"1px solid var(--pink-b)"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:32,height:32,borderRadius:9,background:"var(--pink)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Heart size={13} color="white"/>
                </div>
                <div>
                  <div style={{fontWeight:700,fontSize:13.5}}>{item.desc}</div>
                  <div style={{fontSize:10.5,color:"var(--tx3)",marginTop:2,fontFamily:"'IBM Plex Mono',monospace"}}>{fmtD(item.date)}</div>
                </div>
              </div>
              <div className="mono" style={{fontWeight:700,color:"var(--pink)",fontSize:15}}>{N(item.amount)}</div>
            </div>
          ))}
        </div>
      </SCard>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ADD MONEY MODAL
───────────────────────────────────────────────────────────── */
const ADD_CATS=[
  {key:"income",   label:"دخل جديد",      sub:"مرتب، فريلانس...",     Icon:TrendingUp,  c:"var(--green)",  bg:"var(--green-l)", bo:"var(--green-b)"},
  {key:"expense",  label:"مصروف جديد",    sub:"صرفت فين...",           Icon:TrendingDown,c:"var(--red)",    bg:"var(--red-l)",   bo:"var(--red-b)"},
  {key:"التزام",   label:"التزام ثابت",   sub:"إيجار، قسط...",        Icon:Lock,        c:"var(--blue)",   bg:"var(--blue-l)",  bo:"var(--blue-b)"},
  {key:"اشتراك",  label:"اشتراك",         sub:"Netflix, Spotify...",  Icon:RefreshCw,   c:"var(--s600)",   bg:"var(--s100)",    bo:"var(--s200)"},
  {key:"جمعية",   label:"جمعية",          sub:"جمعية شهرية...",       Icon:Users,       c:"var(--p600)",   bg:"var(--p100)",    bo:"var(--p200)"},
  {key:"ادخار",   label:"هدف ادخار",      sub:"طوارئ، رحلة...",       Icon:PiggyBank,   c:"var(--green)",  bg:"var(--green-l)", bo:"var(--green-b)"},
  {key:"صدقة",    label:"صدقة / زكاة",   sub:"لله وحده ☀️",            Icon:Heart,       c:"var(--pink)",   bg:"var(--pink-l)",  bo:"var(--pink-b)"},
];

function AddModal({open,onClose,onGoTo}){
  return(
    <Modal open={open} onClose={onClose} title="إضافة عملية" icon={SquarePlus} iconBg="linear-gradient(135deg,var(--p600),var(--s600))">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
        {ADD_CATS.map(t=>(
          <button key={t.key} onClick={()=>{onClose();onGoTo(t.key);}} className="btn"
            style={{flexDirection:"row",alignItems:"center",justifyContent:"flex-start",gap:11,padding:"13px 14px",borderRadius:14,textAlign:"right",background:t.bg,border:`1.5px solid ${t.bo}`,transition:"all .17s"}}
            onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.02)";e.currentTarget.style.boxShadow="var(--sh-md)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>
            <div style={{width:36,height:36,borderRadius:10,background:t.c,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <t.Icon size={17} color="white"/>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontWeight:800,fontSize:13,color:t.c}}>{t.label}</div>
              <div style={{fontSize:10.5,color:"var(--tx3)",marginTop:2}}>{t.sub}</div>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────
   NOTIF MODAL
───────────────────────────────────────────────────────────── */
function NotifModal({open,onClose}){
  const cfg={
    warn:{c:"var(--amber)",bg:"var(--amber-l)",bo:"var(--amber-b)",Icon:AlertCircle},
    ok:  {c:"var(--green)",bg:"var(--green-l)",bo:"var(--green-b)",Icon:CheckCircle2},
    alert:{c:"var(--red)",bg:"var(--red-l)",bo:"var(--red-b)",Icon:AlertCircle},
  };
  return(
    <Modal open={open} onClose={onClose} title="التنبيهات" icon={Bell} iconBg="linear-gradient(135deg,var(--p500),var(--s500))">
      <div style={{display:"flex",flexDirection:"column",gap:9}}>
        {NOTIFS.map(n=>{
          const c=cfg[n.type];
          return(
            <div key={n.id} style={{display:"flex",alignItems:"flex-start",gap:11,padding:"13px 14px",borderRadius:13,background:c.bg,border:`1px solid ${c.bo}`}}>
              <c.Icon size={17} style={{color:c.c,flexShrink:0,marginTop:1}}/>
              <div>
                <div style={{fontWeight:700,fontSize:13.5}}>{n.text}</div>
                <div style={{fontSize:11,color:"var(--tx3)",marginTop:3,fontFamily:"'IBM Plex Mono',monospace"}}>{n.time}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────
   TABS
───────────────────────────────────────────────────────────── */
const TABS=[
  {key:"preview",    label:"الشهور",     Icon:CalendarDays, c:"var(--p600)"},
  {key:"income",     label:"الدخل",      Icon:TrendingUp,   c:"var(--green)"},
  {key:"expenses",   label:"المصروفات",  Icon:TrendingDown, c:"var(--red)"},
  {key:"commits",    label:"الالتزامات", Icon:Layers,       c:"var(--blue)"},
  {key:"zakat",      label:"الزكاة",     Icon:Landmark,     c:"var(--amber)"},
];

/* ─────────────────────────────────────────────────────────────
   ROOT
───────────────────────────────────────────────────────────── */
export default function App(){
  const [tab,setTab]=useState("preview");
  const [selMonth,setSelMonth]=useState("مارس");
  const [notifOpen,setNotifOpen]=useState(false);
  const [addOpen,setAddOpen]=useState(false);
  const [incData,setIncData]=useState(INIT_INC);
  const [expData,setExpData]=useState(INIT_EXP);
  const [commits,setCommits]=useState(INIT_COMMIT);
  const [zlog,setZlog]=useState(INIT_ZLOG);

  const totalInc=incData.reduce((s,i)=>s+i.amount,0);
  const totalExp=expData.reduce((s,e)=>s+e.amount,0);
  const curTab=TABS.find(t=>t.key===tab);

  function handleGoTo(key){
    if(key==="income") setTab("income");
    else if(key==="expense") setTab("expenses");
    else if(["التزام","اشتراك","جمعية","ادخار"].includes(key)) setTab("commits");
    else if(key==="صدقة") setTab("zakat");
  }

  return(
    <>
      <style>{G}</style>

      <NotifModal open={notifOpen} onClose={()=>setNotifOpen(false)}/>
      <AddModal open={addOpen} onClose={()=>setAddOpen(false)} onGoTo={handleGoTo}/>

      {/* bg radial hints */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,backgroundImage:"radial-gradient(circle at 18% 18%,rgba(99,102,241,.04) 0%,transparent 52%),radial-gradient(circle at 82% 82%,rgba(168,85,247,.04) 0%,transparent 52%)"}}/>

      {/* ─── HEADER ─── */}
      <header className="hdr">
        <div style={{display:"flex",alignItems:"center",gap:11}}>
          <div style={{width:36,height:36,borderRadius:11,flexShrink:0,background:"linear-gradient(135deg,var(--p600) 0%,var(--s600) 100%)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"var(--sh-p)"}}>
            <Wallet size={17} color="white"/>
          </div>
          <div>
            <div style={{fontWeight:900,fontSize:15.5,color:"var(--tx)",letterSpacing:"-0.3px",lineHeight:1.2}}>ملخص فلوسي</div>
            <div style={{fontSize:10.5,color:"var(--tx3)",fontFamily:"'IBM Plex Mono',monospace",marginTop:1}}>مارس 2024</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {/* notif */}
          <div className="tipw">
            <button onClick={()=>setNotifOpen(true)} className="btn btn-ic" style={{position:"relative"}}>
              <Bell size={16}/>
              <span className="pdot" style={{position:"absolute",top:7,right:7,width:7,height:7,background:"var(--red)",border:"2px solid var(--bg)"}}/>
            </button>
            <span className="tip">التنبيهات</span>
          </div>
          {/* add */}
          <button onClick={()=>setAddOpen(true)} className="btn btn-p" style={{padding:"9px 17px",fontSize:13,gap:7}}>
            <Plus size={15}/>إضافة
          </button>
        </div>
      </header>

      {/* ─── PAGE ─── */}
      <main style={{position:"relative",zIndex:1}}>
        <div className="pg">
          {/* stat cards */}
          <div style={{marginBottom:16}}>
            <StatCards inc={totalInc} exp={totalExp} pInc={HIST["فبراير"]?.income} pExp={HIST["فبراير"]?.expenses}/>
          </div>

          {/* tabs */}
          <div style={{marginBottom:12}}>
            <div className="tab-row sb-hide">
              {TABS.map(t=>{
                const on=tab===t.key;
                return(
                  <button key={t.key} onClick={()=>setTab(t.key)} className="btn"
                    style={{flexShrink:0,gap:7,padding:"8px 16px",fontSize:13,borderRadius:11,background:on?t.c:"var(--surf)",color:on?"#fff":"var(--tx2)",border:`1.5px solid ${on?t.c:"var(--bd)"}`,fontWeight:on?800:600,boxShadow:on?`0 4px 14px ${t.c}3a`:"var(--sh-sm)"}}>
                    <t.Icon size={14}/>{t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* content */}
          <SCard key={tab} className="au" style={{padding:"20px 18px",minHeight:240,position:"relative",zIndex:1}}>
            {/* card heading */}
            <div style={{display:"flex",alignItems:"center",gap:11,paddingBottom:16,marginBottom:16,borderBottom:"1px solid var(--bd)"}}>
              <div style={{width:34,height:34,borderRadius:10,flexShrink:0,background:`${curTab?.c}18`,border:`1.5px solid ${curTab?.c}2e`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                {curTab&&<curTab.Icon size={16} style={{color:curTab.c}}/>}
              </div>
              <div>
                <div style={{fontWeight:900,fontSize:15,letterSpacing:"-0.2px"}}>{curTab?.label}</div>
                {tab==="preview"&&<div style={{fontSize:11,color:"var(--tx3)",marginTop:2,fontFamily:"'IBM Plex Mono',monospace"}}>{selMonth} 2024</div>}
              </div>
            </div>
            {tab==="preview"  &&<MonthPreview sel={selMonth} onSel={setSelMonth}/>}
            {tab==="income"   &&<IncomeTab data={incData} onUpdate={setIncData}/>}
            {tab==="expenses" &&<ExpensesTab data={expData} onUpdate={setExpData}/>}
            {tab==="commits"  &&<CommitmentsTab data={commits} onUpdate={setCommits}/>}
            {tab==="zakat"    &&<ZakatTab inc={totalInc} exp={totalExp} log={zlog} onLog={setZlog}/>}
          </SCard>
        </div>
      </main>

      {/* ─── MOBILE NAV ─── */}
      <nav style={{position:"fixed",bottom:0,left:0,right:0,zIndex:30,background:"rgba(245,244,249,.92)",backdropFilter:"blur(18px) saturate(1.5)",borderTop:"1px solid var(--bd-p)",height:62,display:"flex",alignItems:"center",justifyContent:"space-around",padding:"0 6px"}}>
        {TABS.map(t=>{
          const on=tab===t.key;
          return(
            <button key={t.key} onClick={()=>setTab(t.key)} className="btn"
              style={{flexDirection:"column",gap:4,padding:"6px 12px",background:"transparent",border:"none",borderRadius:12,position:"relative"}}>
              <t.Icon size={19} style={{color:on?t.c:"var(--tx3)",transition:"color .18s"}}/>
              <span style={{fontSize:10,fontWeight:on?800:600,color:on?t.c:"var(--tx3)",transition:"color .18s"}}>{t.label}</span>
              {on&&<span style={{position:"absolute",bottom:3,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:t.c}}/>}
            </button>
          );
        })}
      </nav>
    </>
  );
}