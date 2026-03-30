import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { LayoutDashboard, Wallet, CalendarClock, CreditCard, Target, PiggyBank,
  Plus, Trash2, CheckCircle2, Circle, TrendingUp, AlertCircle, X, Scan,
  Calculator, Edit3, Save, MessageCircle, Send, DollarSign,
  Check, Sparkles, Bell, Settings, Activity, ToggleLeft, ToggleRight,
  ChevronRight, BarChart2, Menu, Calendar, Eye, EyeOff, HelpCircle, Search,
  Zap, FileText, Download, Clock, Moon, Sun, Lock,
  Filter, Database, RefreshCw, ChevronDown } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, BarChart, Bar, Cell, PieChart, Pie, ComposedChart } from "recharts";

// ── PWA: Register service worker ─────────────────────────────────────────────
if(typeof window!=="undefined"&&"serviceWorker" in navigator){
  window.addEventListener("load",()=>{
    navigator.serviceWorker.register("/sw.js",{scope:"/"})
      .then(r=>console.log("[SW] registered",r.scope))
      .catch(e=>console.log("[SW] failed",e));
  });
}

// ── Confetti burst — pure canvas, no library ──────────────────────────────────
function launchConfetti(){
  try{
    const canvas=document.createElement("canvas");
    canvas.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999;";
    document.body.appendChild(canvas);
    const ctx=canvas.getContext("2d");
    const W=canvas.width=window.innerWidth;
    const H=canvas.height=window.innerHeight;
    const COLORS=["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316"];
    const particles=Array.from({length:120},()=>({
      x:W*Math.random(),y:-10,
      vx:(Math.random()-0.5)*6,vy:Math.random()*4+2,
      w:Math.random()*12+4,h:Math.random()*6+3,
      color:COLORS[Math.floor(Math.random()*COLORS.length)],
      rot:Math.random()*360,rv:(Math.random()-0.5)*8,
      alpha:1,
    }));
    let frame=0;
    function draw(){
      ctx.clearRect(0,0,W,H);
      particles.forEach(p=>{
        p.x+=p.vx;p.y+=p.vy;p.vy+=0.12;p.rot+=p.rv;
        if(frame>60)p.alpha-=0.02;
        ctx.save();ctx.globalAlpha=Math.max(0,p.alpha);
        ctx.translate(p.x,p.y);ctx.rotate(p.rot*Math.PI/180);
        ctx.fillStyle=p.color;ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
        ctx.restore();
      });
      frame++;
      if(frame<120)requestAnimationFrame(draw);
      else document.body.removeChild(canvas);
    }
    draw();
  }catch(e){}
}

// 🔑 Replace with your Supabase project URL when ready
const SUPA_URL = "https://hlipxjbhksyyvrehedis.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsaXB4amJoa3N5eXZyZWhlZGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NTI3OTQsImV4cCI6MjA5MDQyODc5NH0.Q0MWnpmmpPg4fkwYuD2dAF28XT9Cab0h3Ywy-aN8Fvg";

async function supaFetch(path, opts={}) {
  const session = JSON.parse(localStorage.getItem("fv_session")||"null");
  const token = session?.access_token;
  const headers = {"Content-Type":"application/json","apikey":SUPA_KEY,...(token?{"Authorization":"Bearer "+token}:{}),...(opts.headers||{})};
  const res = await fetch(SUPA_URL+path, {...opts, headers});
  if(!res.ok){ const e=await res.json().catch(()=>({message:"Request failed"})); return {data:null,error:e}; }
  const data = await res.json().catch(()=>({}));
  return {data, error:null};
}
async function signUp(email, password) {
  try {
    const redirectTo = window.location.origin + window.location.pathname;
    const res = await fetch(SUPA_URL+"/auth/v1/signup", {
      method:"POST", headers:{"Content-Type":"application/json","apikey":SUPA_KEY},
      body: JSON.stringify({email, password, options:{emailRedirectTo: redirectTo}})
    });
    if(!res.ok && res.status===0) return {error:"network"};
    const r = await res.json();
    if(r.access_token) localStorage.setItem("fv_session", JSON.stringify(r));
    return r;
  } catch(e) { return {error:"network",message:e.message}; }
}
async function signIn(email, password) {
  try {
    const res = await fetch(SUPA_URL+"/auth/v1/token?grant_type=password", {
      method:"POST", headers:{"Content-Type":"application/json","apikey":SUPA_KEY},
      body: JSON.stringify({email, password})
    });
    if(!res.ok && res.status===0) return {error:"network"};
    const r = await res.json();
    if(r.access_token) localStorage.setItem("fv_session", JSON.stringify(r));
    return r;
  } catch(e) { return {error:"network",message:e.message}; }
}

const C = {
  bg:"#F0F2F8",       surface:"#FFFFFF",    surfaceAlt:"#F7F8FC",
  border:"#E2E5EE",   borderLight:"#ECEEF5",
  navy:"#0A1628",     navyMid:"#1A2E50",    navyLight:"#243B6B",
  accent:"#6366F1",   accentBg:"#EEF2FF",   accentMid:"#C7D2FE",
  green:"#059669",    greenBg:"#ECFDF5",    greenMid:"#6EE7B7",
  red:"#DC2626",      redBg:"#FEF2F2",      redMid:"#FCA5A5",
  amber:"#D97706",    amberBg:"#FFFBEB",    amberMid:"#FDE68A",
  purple:"#7C3AED",   purpleBg:"#F5F3FF",   purpleMid:"#DDD6FE",
  teal:"#0D9488",     tealBg:"#F0FDFA",     tealMid:"#5EEAD4",
  text:"#0A1628",     textMid:"#374151",    textLight:"#6B7280",  textFaint:"#9CA3AF",
  slate:"#6B7280",
};
const PIE_COLORS = [C.accent,C.green,C.amber,C.red,C.purple,C.teal,C.purple,C.amber,C.green,C.red];
const MF="'Manrope',sans-serif";
const IF="'Inter',sans-serif";
const MOS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FULL_MOS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const TODAY = new Date();

const PROFESSIONS = [
  { id:"healthcare", icon:"🏥", label:"Healthcare",
    subs:[{id:"nurse_rn",label:"RN"},{id:"nurse_np",label:"NP"},{id:"nurse_travel",label:"Travel Nurse"},
          {id:"doctor_md",label:"MD/DO"},{id:"pa",label:"PA"},{id:"crna",label:"CRNA"},
          {id:"paramedic",label:"Paramedic/EMT"},{id:"cna",label:"CNA"},{id:"rt",label:"Resp. Therapist"},
          {id:"pt",label:"PT/OT"},{id:"pharmacy",label:"Pharmacist"},{id:"health_admin",label:"Healthcare Admin"}],
    shiftTypes:{Regular:1,Overtime:1.5,"Double Time":2,Night:1.15,Weekend:1.25,Holiday:2},
    shiftLabel:"Shift", incomeLabel:"Healthcare Salary", notePlaceholder:"Unit, floor, specialty..." },
  { id:"education", icon:"📚", label:"Education",
    subs:[{id:"teacher_k12",label:"K-12 Teacher"},{id:"professor",label:"Professor"},
          {id:"admin_edu",label:"Administrator"},{id:"counselor_edu",label:"Counselor"},
          {id:"sub",label:"Substitute"},{id:"tutor",label:"Tutor"}],
    shiftTypes:{Regular:1,Substitute:1,"After School":1.25,"Summer":1},
    shiftLabel:"Day", incomeLabel:"Teaching Salary", notePlaceholder:"Grade, subject..." },
  { id:"trades", icon:"🔧", label:"Trades & Construction",
    subs:[{id:"electrician",label:"Electrician"},{id:"plumber",label:"Plumber"},
          {id:"carpenter",label:"Carpenter"},{id:"hvac",label:"HVAC"},{id:"welder",label:"Welder"},
          {id:"mechanic",label:"Mechanic"},{id:"contractor",label:"Contractor"}],
    shiftTypes:{Regular:1,Overtime:1.5,Weekend:1.25,Rush:2,Holiday:2},
    shiftLabel:"Job", incomeLabel:"Hourly/Contract Rate", notePlaceholder:"Client, project..." },
  { id:"tech", icon:"💻", label:"Technology",
    subs:[{id:"swe",label:"Software Engineer"},{id:"devops",label:"DevOps"},{id:"data",label:"Data Scientist"},
          {id:"pm",label:"Product Manager"},{id:"design",label:"Designer"},{id:"it",label:"IT Support"}],
    shiftTypes:{Regular:1,Overtime:1.5,"On-Call":1.5,Weekend:1.25},
    shiftLabel:"Session", incomeLabel:"Salary/Rate", notePlaceholder:"Sprint, project..." },
  { id:"transportation", icon:"🚗", label:"Transportation",
    subs:[{id:"rideshare",label:"Rideshare (Uber/Lyft)"},{id:"delivery",label:"Delivery Driver"},
          {id:"trucker",label:"Truck Driver (CDL)"},{id:"bus",label:"Bus/Transit Driver"}],
    shiftTypes:{Regular:1,Overtime:1.5,"Peak":1.25,Night:1.15,Holiday:2},
    shiftLabel:"Shift", incomeLabel:"Hourly/Per Mile", notePlaceholder:"Zone, route..." },
  { id:"retail_service", icon:"🛍️", label:"Retail & Service",
    subs:[{id:"retail",label:"Retail Associate"},{id:"retail_mgr",label:"Retail Manager"},
          {id:"server",label:"Server/Bartender"},{id:"cook",label:"Cook/Chef"},{id:"hotel",label:"Hotel Staff"}],
    shiftTypes:{Regular:1,Overtime:1.5,Holiday:2,Opening:1,Closing:1},
    shiftLabel:"Shift", incomeLabel:"Hourly Wage", notePlaceholder:"Location, role..." },
  { id:"military_public", icon:"🎖️", label:"Military & Public Safety",
    subs:[{id:"military",label:"Active Military"},{id:"reserve",label:"Reserve/Guard"},
          {id:"police",label:"Police Officer"},{id:"fire",label:"Firefighter"},
          {id:"corrections",label:"Corrections"},{id:"fed",label:"Federal Employee"}],
    shiftTypes:{Regular:1,Overtime:1.5,"Hazard":1.5,Holiday:2,"OT Night":1.65},
    shiftLabel:"Duty", incomeLabel:"Base Pay", notePlaceholder:"Unit, assignment..." },
  { id:"self_employed", icon:"🚀", label:"Self-Employed / Entrepreneur",
    subs:[{id:"freelancer",label:"Freelancer"},{id:"founder",label:"Founder"},
          {id:"creator",label:"Content Creator"},{id:"artist",label:"Artist/Musician"},
          {id:"photographer",label:"Photographer"},{id:"ecommerce",label:"eCommerce"}],
    shiftTypes:{Regular:1,Rush:2,Weekend:1.25,Project:1},
    shiftLabel:"Session", incomeLabel:"Revenue/Rate", notePlaceholder:"Client, project..." },
  { id:"finance_biz", icon:"💼", label:"Finance & Business",
    subs:[{id:"accountant",label:"Accountant/CPA"},{id:"advisor",label:"Financial Advisor"},
          {id:"banker",label:"Banker"},{id:"insurance",label:"Insurance Agent"},
          {id:"real_estate",label:"Real Estate Agent"},{id:"analyst",label:"Analyst"}],
    shiftTypes:{Regular:1,Overtime:1.5,Weekend:1.25},
    shiftLabel:"Session", incomeLabel:"Salary/Commission", notePlaceholder:"Client, deal..." },
  { id:"other", icon:"🧩", label:"Other",
    subs:[{id:"other_custom",label:"Other / Custom"}],
    shiftTypes:{Regular:1,Overtime:1.5,"Part-Time":1,Weekend:1.25},
    shiftLabel:"Session", incomeLabel:"Income", notePlaceholder:"Details..." },
];
const getProfession = id => PROFESSIONS.find(p=>p.id===id)||PROFESSIONS[PROFESSIONS.length-1];
const getProfSub = (pId,sId) => { const p=getProfession(pId); return p.subs.find(s=>s.id===sId)||p.subs[0]; };

const fmt    = n => { const v=Number(n); return "$"+(isNaN(v)?0:v).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}); };
const fmtK   = n => { const v=Number(n||0); return v>=1000?"$"+(v/1000).toFixed(1)+"k":fmt(v); };
const todayStr = () => new Date().toISOString().split("T")[0];
const dueIn  = d => { if(!d)return 999; const [ty,tm,tdy]=todayStr().split('-').map(Number); const [dy,dm,ddd]=d.split('-').map(Number); const today2=new Date(ty,tm-1,tdy); const due=new Date(dy,dm-1,ddd); return Math.ceil((due-today2)/86400000); };
const daysInMonth = () => { const t=new Date(); return new Date(t.getFullYear(),t.getMonth()+1,0).getDate(); };
const dayOfMonth  = () => new Date().getDate();
const fmtDate = s => { if(!s)return""; const d=new Date(s+"T00:00:00"); return FULL_MOS[d.getMonth()]+" "+d.getDate(); };
const getScope=()=>{try{const s=JSON.parse(localStorage.getItem("fv_session")||"null");if(s?.user?.id)return"fv6_"+s.user.id.slice(0,8)+":";let d=localStorage.getItem("fv_device_id");if(!d){d="d_"+Math.random().toString(36).slice(2,10);localStorage.setItem("fv_device_id",d);}return"fv6_"+d+":";}catch{return"fv6_local:";}};
// ── Supabase-aware storage helpers ──────────────────────────────────────────
// sg(): read from Supabase when logged in, fall back to localStorage
// ss(): write to Supabase when logged in AND to localStorage (offline fallback)
const _getSession = () => { try { return JSON.parse(localStorage.getItem("fv_session")||"null"); } catch { return null; } };
const _getUserId  = () => _getSession()?.user?.id || null;

async function sg(k) {
  const uid = _getUserId();
  const bare = k.replace("fv6:","");
  if (uid) {
    try {
      const res = await supaFetch(`/rest/v1/user_data?user_id=eq.${uid}&key=eq.${bare}&select=value`);
      if (Array.isArray(res?.data) && res.data.length > 0) return res.data[0].value;
    } catch {}
  }
  // localStorage fallback
  try {
    const scoped = localStorage.getItem(getScope()+bare);
    if (scoped !== null) return JSON.parse(scoped);
    const legacy = localStorage.getItem(k);
    return legacy ? JSON.parse(legacy) : null;
  } catch { return null; }
}

// Debounce buffer: {key -> {value, timer}}
const _ssBuffer = {};
async function _flushKey(uid, bare, v) {
  try {
    await supaFetch("/rest/v1/user_data", {
      method: "POST",
      headers: { "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify({ user_id: uid, key: bare, value: v, updated_at: new Date().toISOString() })
    });
    localStorage.setItem("fv_last_sync", String(Date.now()));
  } catch {}
}
async function ss(k, v) {
  const uid = _getUserId();
  const bare = k.replace("fv6:","");
  // Always write localStorage immediately (instant, works offline)
  try { localStorage.setItem(getScope()+bare, JSON.stringify(v)); } catch {}
  // Debounce Supabase writes: wait 1.5s after last change before posting
  if (uid) {
    if (_ssBuffer[bare]?.timer) clearTimeout(_ssBuffer[bare].timer);
    _ssBuffer[bare] = {
      value: v,
      timer: setTimeout(() => _flushKey(uid, bare, _ssBuffer[bare].value), 1500)
    };
  }
}

const notifSupported  = () => typeof window!=="undefined"&&"Notification" in window;
const notifPermission = () => notifSupported()?window.Notification.permission:"denied";
async function hashPIN(p) {
  try { const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(p+"fv_salt_2025")); return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join(""); }
  catch { return p; }
}
function advanceDueDate(dateStr, months=1) {
  if(!dateStr) return dateStr;
  const d = new Date(dateStr+"T00:00:00");
  d.setMonth(d.getMonth()+months);
  return d.toISOString().split("T")[0];
}

const DEF_CATS = [
  // Food & Dining
  {id:"groceries",name:"Groceries",icon:"🛒"},{id:"fast_food",name:"Fast Food",icon:"🍔"},
  {id:"restaurants",name:"Restaurants",icon:"🍽️"},{id:"coffee",name:"Coffee",icon:"☕"},
  // Home & Transport
  {id:"rent_mort",name:"Rent / Mortgage",icon:"🏠"},{id:"utilities",name:"Utilities",icon:"⚡"},
  {id:"gas",name:"Gas",icon:"⛽"},{id:"rideshare",name:"Rideshare",icon:"🚕"},
  {id:"car_pay",name:"Car Payment",icon:"🚗"},
  // Personal Care
  {id:"grooming",name:"Grooming / Haircuts",icon:"💈"},{id:"clothing",name:"Clothing",icon:"👗"},
  {id:"health_med",name:"Health / Medical",icon:"🏥"},{id:"gym",name:"Gym / Fitness",icon:"💪"},
  // Bills & Subscriptions
  {id:"phone",name:"Phone",icon:"📱"},{id:"subscriptions",name:"Subscriptions",icon:"🔄"},
  // Lifestyle
  {id:"entertainment",name:"Entertainment",icon:"🎮"},{id:"dining_out",name:"Dining Out",icon:"🍷"},
  {id:"travel",name:"Travel",icon:"✈️"},{id:"pets",name:"Pets",icon:"🐾"},
  // Catch-all
  {id:"shopping",name:"Shopping",icon:"🛍️"},{id:"misc",name:"Misc",icon:"📦"},
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Manrope:wght@600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{background:#F0F2F8;font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;overscroll-behavior:none}
::-webkit-scrollbar{display:none}
input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
input,select,button,textarea{font-family:'Inter',sans-serif}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
@keyframes pop{0%{transform:scale(.9);opacity:0}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
@keyframes shimmer{0%{background-position:-200px 0}100%{background-position:calc(200px + 100%) 0}}
@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}
.fu{animation:fadeUp .26s cubic-bezier(.22,1,.36,1) both}
.si{animation:slideIn .22s cubic-bezier(.22,1,.36,1) both}
.pop{animation:pop .28s cubic-bezier(.34,1.56,.64,1) both}
.ba{transition:all .15s cubic-bezier(.22,1,.36,1);cursor:pointer;-webkit-tap-highlight-color:transparent}
.ba:active{transform:scale(.96)!important;opacity:.8}
.hl:hover{box-shadow:0 8px 24px rgba(99,102,241,.14)!important;transform:translateY(-2px)!important}
.db{opacity:0;transition:opacity .15s}.rw:hover .db{opacity:1}
.blurred{filter:blur(8px);user-select:none;transition:filter .25s}
.unblurred{filter:none;transition:filter .25s}
.card{background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(10,22,40,.05),0 4px 12px rgba(10,22,40,.04);transition:box-shadow .2s,transform .15s}
.card:active{box-shadow:0 1px 2px rgba(10,22,40,.06)!important;transform:scale(.99)!important}
.glass{background:rgba(255,255,255,.8);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px)}
.swipe-row{position:relative;overflow:hidden}
.swipe-content{transition:transform .22s cubic-bezier(.22,1,.36,1)}
.swipe-actions{position:absolute;right:0;top:0;bottom:0;display:flex;align-items:center}
textarea:focus,input:focus,select:focus{outline:none}
input,select{-webkit-appearance:none}
button{-webkit-tap-highlight-color:transparent}
`;

class ErrorBoundary extends React.Component {
  constructor(p){super(p);this.state={err:null};}
  static getDerivedStateFromError(e){return{err:e};}
  componentDidCatch(e,info){console.error('Trackfi Error:',e?.message,info);}
  render(){
    if(this.state.err) return(
      <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{background:C.surface,borderRadius:18,padding:28,maxWidth:380,width:"100%",textAlign:"center",boxShadow:"0 4px 24px rgba(0,0,0,.1)"}}>
          <div style={{fontSize:40,marginBottom:12}}>⚠️</div>
          <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text,marginBottom:8}}>Something went wrong</div>
          <div style={{fontSize:13,color:C.textLight,marginBottom:20,lineHeight:1.5}}>{this.state.err?.message||"Unexpected error. Your data is safe."}</div>
          <button onClick={()=>window.location.reload()} style={{background:C.accent,border:"none",borderRadius:10,padding:"12px 24px",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",width:"100%",marginBottom:8}}>Reload App</button>
          <div style={{fontSize:11,color:C.textLight}}>Data stored separately — won't be affected</div>
        </div>
      </div>
    );
    return this.props.children;
  }
}

const iS = (focused,err) => ({width:"100%",background:focused?"#fff":C.surfaceAlt,border:`1.5px solid ${err?C.red:focused?C.accent:C.border}`,borderRadius:12,padding:"12px 14px",color:C.text,fontSize:14,outline:"none",transition:"all .18s cubic-bezier(.22,1,.36,1)",boxSizing:"border-box",boxShadow:focused&&!err?`0 0 0 3px ${C.accent}18`:"none"});

function FI({label,half,error,...p}){
  const[f,sf]=useState(false);
  return(
    <div style={{marginBottom:14,flex:half?"1 1 45%":"1 1 100%"}}>
      {label&&<div style={{fontSize:11,fontWeight:600,color:error?C.red:C.slate,letterSpacing:.5,textTransform:"uppercase",marginBottom:5}}>{label}{error&&<span style={{marginLeft:6,fontWeight:500,textTransform:"none"}}>— {error}</span>}</div>}
      <input {...p} style={iS(f,error)} onFocus={()=>sf(true)} onBlur={()=>sf(false)}/>
    </div>
  );
}
function FS({label,options,...p}){
  const[f,sf]=useState(false);
  return(
    <div style={{marginBottom:14}}>
      {label&&<div style={{fontSize:11,fontWeight:600,color:C.slate,letterSpacing:.5,textTransform:"uppercase",marginBottom:5}}>{label}</div>}
      <select {...p} style={{...iS(f),cursor:"pointer",appearance:"none"}} onFocus={()=>sf(true)} onBlur={()=>sf(false)}>
        <option value="">Select...</option>
        {(options||[]).map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
      </select>
    </div>
  );
}

function Modal({title,icon:Icon,onClose,onSubmit,submitLabel="Save",accent=C.accent,children,wide}){
  return(
    <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center",background:"rgba(10,22,40,.5)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",animation:"fadeIn .2s ease"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.surface,borderRadius:"24px 24px 0 0",width:"100%",maxWidth:wide?640:480,maxHeight:"94vh",overflowY:"auto",padding:"0 0 40px",animation:"slideUp .26s cubic-bezier(.22,1,.36,1)",boxShadow:"0 -4px 60px rgba(10,22,40,.22)"}}>
        <div style={{width:40,height:4,background:C.border,borderRadius:99,margin:"14px auto 4px"}}/>
        <div style={{padding:"16px 24px 20px",borderBottom:`1px solid ${C.borderLight}`,marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {Icon&&<div style={{background:accent+"14",borderRadius:12,padding:"9px 10px",display:"flex"}}><Icon size={20} color={accent}/></div>}
            <span style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text,letterSpacing:-.3}}>{title}</span>
          </div>
          <button onClick={onClose} className="ba" style={{background:C.surfaceAlt,border:"none",cursor:"pointer",color:C.textMid,padding:"7px 8px",borderRadius:10,display:"flex"}}><X size={15}/></button>
        </div>
        <div style={{padding:"0 24px"}}>
          {children}
          {onSubmit&&<button className="ba" onClick={onSubmit} style={{width:"100%",background:`linear-gradient(135deg,${accent},${accent}dd)`,border:"none",borderRadius:14,padding:"16px 0",color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",marginTop:16,boxShadow:`0 4px 20px ${accent}40`,letterSpacing:.4}}>{submitLabel}</button>}
        </div>
      </div>
    </div>
  );
}

function BarProg({pct,color=C.accent,h=5}){
  const p=Math.min(100,Math.max(0,pct));
  return(
    <div style={{height:h,background:C.borderLight,borderRadius:99,overflow:"hidden"}}>
      <div style={{height:"100%",width:`${p}%`,background:`linear-gradient(90deg,${color},${color}cc)`,borderRadius:99,transition:"width .6s cubic-bezier(.22,1,.36,1)"}}/>
    </div>
  );
}
function SH({title,sub,onAdd,addLabel="Add",right}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
      <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
        <div style={{width:3,height:sub?38:26,background:`linear-gradient(180deg,${C.accent},${C.purple}88)`,borderRadius:99,marginTop:2,flexShrink:0}}/>
        <div>
          <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.4,lineHeight:1.2}}>{title}</div>
          {sub&&<div style={{fontSize:12,color:C.textLight,marginTop:3,fontWeight:500}}>{sub}</div>}
        </div>
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0,marginTop:2}}>
        {right}
        {onAdd&&<button className="ba" onClick={onAdd} style={{display:"flex",alignItems:"center",gap:5,background:C.accent,border:"none",borderRadius:10,padding:"8px 16px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",boxShadow:`0 2px 8px ${C.accent}40`,letterSpacing:.2}}><Plus size={12}/>{addLabel}</button>}
      </div>
    </div>
  );
}

function Empty({text,icon:Icon=DollarSign,cta,onCta}){
  return(
    <div style={{textAlign:"center",padding:"52px 24px",animation:"fadeUp .3s ease"}}>
      <div style={{width:64,height:64,borderRadius:20,background:`linear-gradient(135deg,${C.accentBg},${C.purpleBg})`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",boxShadow:`0 4px 16px ${C.accent}18`}}><Icon size={26} color={C.accent}/></div>
      <div style={{fontSize:14,color:C.textMid,maxWidth:220,margin:"0 auto 0",lineHeight:1.6,fontWeight:500}}>{text}</div>
      {cta&&<button className="ba" onClick={onCta} style={{marginTop:16,background:C.accent,border:"none",borderRadius:10,padding:"10px 20px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",boxShadow:`0 2px 8px ${C.accent}40`}}>{cta}</button>}
    </div>
  );
}
function PINLock({onUnlock,appName,darkMode}){
  const[pin,setPin]=useState("");const[error,setError]=useState("");const[tries,setTries]=useState(0);
  const bg=darkMode?C.navy:C.bg;const surf=darkMode?C.navyMid:C.surface;
  const txt=darkMode?"rgba(255,255,255,.92)":C.text;const muted=darkMode?C.textLight:C.textLight;
  async function tryUnlock(){
    const h=await hashPIN(pin);
    if(h===localStorage.getItem("fv_pin_hash")){onUnlock();return;}
    setTries(t=>t+1);setError(tries>=2?"Too many attempts — wait 10s":"Wrong PIN");setPin("");
    if(tries>=2)setTimeout(()=>setTries(0),10000);
  }
  return(
    <div style={{minHeight:"100vh",background:bg,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:surf,borderRadius:24,padding:32,maxWidth:340,width:"100%",textAlign:"center",boxShadow:"0 8px 40px rgba(0,0,0,.15)"}}>
        <div style={{width:56,height:56,borderRadius:"50%",background:C.accentBg,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><Lock size={24} color={C.accent}/></div>
        <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:txt,marginBottom:4}}>{appName||"Finance App"}</div>
        <div style={{fontSize:13,color:muted,marginBottom:24}}>Enter your PIN to continue</div>
        <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:20}}>
          {[0,1,2,3].map(i=><div key={i} style={{width:14,height:14,borderRadius:"50%",background:pin.length>i?C.accent:"transparent",border:`2px solid ${pin.length>i?C.accent:C.border}`,transition:"all .15s"}}/>)}
        </div>
        <input type="password" inputMode="numeric" maxLength={4} value={pin}
          onChange={e=>{setPin(e.target.value.replace(/\D/g,""));setError("");}}
          onKeyDown={e=>e.key==="Enter"&&pin.length===4&&tries<3&&tryUnlock()}
          style={{width:"100%",background:darkMode?C.navyMid:C.bg,border:`1.5px solid ${error?C.red:C.border}`,borderRadius:12,padding:"12px 16px",textAlign:"center",fontSize:24,letterSpacing:8,color:txt,outline:"none",marginBottom:8}} placeholder="••••" autoFocus/>
        {error&&<div style={{fontSize:12,color:C.red,marginBottom:8}}>{error}</div>}
        <button onClick={tryUnlock} disabled={pin.length!==4||tries>=3}
          style={{width:"100%",background:pin.length===4&&tries<3?C.accent:C.border,border:"none",borderRadius:12,padding:"13px 0",color:pin.length===4&&tries<3?"#fff":C.textFaint,fontWeight:700,fontSize:16,cursor:pin.length===4&&tries<3?"pointer":"default"}}>
          Unlock
        </button>
      </div>
    </div>
  );
}

function PINSetup({onSave,onCancel,darkMode}){
  const[step,setStep]=useState("set");const[p1,setP1]=useState("");const[p2,setP2]=useState("");const[err,setErr]=useState("");
  const cur=step==="set"?p1:p2;const setCur=step==="set"?setP1:setP2;
  async function confirm(){if(p1!==p2){setErr("PINs don't match");setP2("");return;}localStorage.setItem("fv_pin_hash",await hashPIN(p1));onSave();}
  return(
    <div style={{background:darkMode?C.navyMid:C.surface,borderRadius:16,padding:20}}>
      <div style={{fontFamily:MF,fontWeight:700,fontSize:16,color:C.text,marginBottom:4}}>{step==="set"?"Set PIN":"Confirm PIN"}</div>
      <div style={{fontSize:13,color:C.textLight,marginBottom:14}}>{step==="set"?"Choose a 4-digit PIN":"Re-enter to confirm"}</div>
      <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:14}}>
        {[0,1,2,3].map(i=><div key={i} style={{width:12,height:12,borderRadius:"50%",background:cur.length>i?C.accent:"transparent",border:`2px solid ${cur.length>i?C.accent:C.border}`,transition:"all .15s"}}/>)}
      </div>
      <input type="password" inputMode="numeric" maxLength={4} value={cur}
        onChange={e=>{setCur(e.target.value.replace(/\D/g,""));setErr("");}}
        onKeyDown={e=>{if(e.key==="Enter"){if(step==="set"&&p1.length===4)setStep("confirm");else if(step==="confirm"&&p2.length===4)confirm();}}}
        style={{width:"100%",background:C.bg,border:`1.5px solid ${err?C.red:C.border}`,borderRadius:10,padding:"10px",textAlign:"center",fontSize:22,letterSpacing:6,color:C.text,outline:"none",marginBottom:10}} placeholder="••••" autoFocus/>
      {err&&<div style={{fontSize:12,color:C.red,marginBottom:8}}>{err}</div>}
      <div style={{display:"flex",gap:8}}>
        {step==="confirm"&&<button onClick={()=>{setStep("set");setP2("");setErr("");}} style={{flex:1,background:"transparent",border:"1px solid #d0d7de",borderRadius:10,padding:"10px",color:C.textLight,fontWeight:600,fontSize:13,cursor:"pointer"}}>Back</button>}
        <button onClick={()=>{if(step==="set"&&p1.length===4)setStep("confirm");else if(step==="confirm"&&p2.length===4)confirm();}} disabled={cur.length!==4}
          style={{flex:1,background:cur.length===4?C.accent:C.border,border:"none",borderRadius:10,padding:"10px",color:cur.length===4?"#fff":C.textFaint,fontWeight:700,fontSize:13,cursor:cur.length===4?"pointer":"default"}}>
          {step==="set"?"Next":"Set PIN"}
        </button>
        <button onClick={onCancel} style={{flex:1,background:"transparent",border:"1px solid #d0d7de",borderRadius:10,padding:"10px",color:C.textLight,fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancel</button>
      </div>
    </div>
  );
}

function OnboardingWizard({onComplete}){
  const[step,setStep]=useState(0);
  const[d,setD]=useState({name:"",appName:"Trackfi",profCategory:"healthcare",profSub:"nurse_rn",useCase:"personal",income:{primary:"",other:"",trading:"",rental:"",dividends:"",freelance:""},accounts:{checking:"",savings:"",cushion:"",investments:""}});
  const sel=getProfession(d.profCategory);
  const firstName=(d.name||"").split(" ")[0].replace(/[^a-zA-Z]/g,"")||"";

  const STEPS=[
    // ── STEP 1: Welcome ─────────────────────────────────────
    {title:null,body:(
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",padding:"8px 0 16px"}}>
        <div style={{fontFamily:MF,fontSize:42,fontWeight:900,color:C.navy,letterSpacing:-2,marginBottom:8}}>💰 Trackfi</div>
        <div style={{fontSize:17,color:C.textMid,lineHeight:1.7,marginBottom:24,maxWidth:340}}>The finance app that actually works for your life — not just for spreadsheet people.</div>
        <div style={{width:"100%",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
          {[["💸","Track every dollar","Know where it all goes"],["📅","Never miss a bill","Due dates + auto-pay tracking"],["💳","Crush debt faster","Avalanche & snowball plans"],["🎯","Build real savings","Goals with projected dates"],["📈","Log your trades","P&L, win rate, equity curve"],["🏆","Your health score","A–F grade on 5 pillars"]].map(([ic,t,s])=>(
            <div key={t} style={{background:C.surfaceAlt,borderRadius:14,padding:"12px 10px",textAlign:"left"}}>
              <div style={{fontSize:20,marginBottom:6}}>{ic}</div>
              <div style={{fontSize:13,fontWeight:700,color:C.text,lineHeight:1.3}}>{t}</div>
              <div style={{fontSize:11,color:C.textLight,marginTop:3,lineHeight:1.4}}>{s}</div>
            </div>
          ))}
        </div>
        <div style={{fontSize:11,color:C.textFaint}}>Your data stays on your device — sync to cloud anytime</div>
      </div>
    ),btnLabel:"Get Started →",canSkip:false},

    // ── STEP 2: Name + Profession ────────────────────────────
    {title:"A little about you",body:(
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Your Name</div>
          <input autoFocus placeholder="Victor B" value={d.name||""} onChange={e=>setD(p=>({...p,name:e.target.value}))}
            style={{width:"100%",background:C.surfaceAlt,border:`1.5px solid ${d.name?C.accent:C.border}`,borderRadius:12,padding:"12px 14px",fontSize:16,color:C.text,outline:"none",boxSizing:"border-box",transition:"border-color .15s"}}/>
          {firstName&&<div style={{marginTop:8,fontSize:13,color:C.accent,fontWeight:600}}>👋 Nice to meet you, {firstName}!</div>}
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>What do you do?</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
            {PROFESSIONS.map(p=>(
              <button key={p.id} onClick={()=>setD(x=>({...x,profCategory:p.id,profSub:p.subs[0].id}))}
                style={{display:"flex",alignItems:"center",gap:7,padding:"8px 14px",borderRadius:99,border:`1.5px solid ${d.profCategory===p.id?C.accent:C.border}`,background:d.profCategory===p.id?C.accentBg:"#fff",cursor:"pointer",transition:"all .15s"}}>
                <span style={{fontSize:16}}>{p.icon}</span>
                <span style={{fontSize:13,fontWeight:d.profCategory===p.id?700:500,color:d.profCategory===p.id?C.accent:C.text}}>{p.label}</span>
              </button>
            ))}
          </div>
          {sel.subs.length>1&&(
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Your Role — {sel.label}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {sel.subs.map(s=>(
                  <button key={s.id} onClick={()=>setD(x=>({...x,profSub:s.id}))}
                    style={{padding:"6px 12px",borderRadius:8,border:`1.5px solid ${d.profSub===s.id?C.accent:C.border}`,background:d.profSub===s.id?C.accentBg:"#fff",fontSize:12,fontWeight:d.profSub===s.id?700:400,color:d.profSub===s.id?C.accent:C.textMid,cursor:"pointer",transition:"all .12s"}}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    ),btnLabel:"Continue →",canSkip:false},

    // ── STEP 2b: How will you use Trackfi? ─────────────────────
    {title:"How will you use it?",body:(
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{fontSize:13,color:C.textLight,lineHeight:1.6,marginBottom:4}}>This helps us personalize your experience and set up the right defaults.</div>
        {[
          {id:"personal",icon:"🧑",title:"Just me",desc:"Track my own spending, bills, and goals"},
          {id:"couple",icon:"💑",title:"Couple / Partner",desc:"Share expenses with a partner — split bills, track together"},
          {id:"roommates",icon:"🏠",title:"Roommates",desc:"Split household costs with one or more housemates"},
          {id:"family",icon:"👨‍👩‍👧",title:"Family",desc:"Manage the whole household — kids, shared accounts"},
        ].map(opt=>(
          <button key={opt.id} onClick={()=>setD(p=>({...p,useCase:opt.id}))}
            style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderRadius:16,
              border:`2px solid ${d.useCase===opt.id?C.accent:C.border}`,
              background:d.useCase===opt.id?C.accentBg:"#fff",cursor:"pointer",textAlign:"left",
              transition:"all .15s"}}>
            <span style={{fontSize:28,flexShrink:0}}>{opt.icon}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:700,color:d.useCase===opt.id?C.accent:C.text,marginBottom:2}}>{opt.title}</div>
              <div style={{fontSize:12,color:C.textLight,lineHeight:1.4}}>{opt.desc}</div>
            </div>
            {d.useCase===opt.id&&<div style={{width:20,height:20,borderRadius:"50%",background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:11,color:"#fff",fontWeight:800}}>✓</span></div>}
          </button>
        ))}
        {(d.useCase==="couple"||d.useCase==="roommates"||d.useCase==="family")&&(
          <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:14,padding:"12px 14px",fontSize:13,color:C.accent,lineHeight:1.5}}>
            ✓ We'll enable <strong>Household Mode</strong> for you — you can add members and tag shared expenses after setup.
          </div>
        )}
      </div>
    ),btnLabel:"Continue →",canSkip:false},

    // ── STEP 3: Income ───────────────────────────────────────
    {title:firstName?"What do you bring home, "+firstName+"?":"Your take-home income",body:(
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{fontSize:13,color:C.textLight,lineHeight:1.6,marginBottom:10}}>Enter your take-home <strong>per paycheck</strong> — we calculate the rest.</div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>How often do you get paid?</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {["Weekly","Biweekly","Twice Monthly","Monthly"].map(f=>(
              <button key={f} onClick={()=>setD(p=>({...p,income:{...(p.income||{}),payFrequency:f}}))}
                style={{padding:"7px 14px",borderRadius:99,border:`1.5px solid ${(d.income?.payFrequency||"Biweekly")===f?C.accent:C.border}`,background:(d.income?.payFrequency||"Biweekly")===f?C.accentBg:"#fff",fontSize:13,fontWeight:(d.income?.payFrequency||"Biweekly")===f?700:500,color:(d.income?.payFrequency||"Biweekly")===f?C.accent:C.textMid,cursor:"pointer"}}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>{getProfession(d.profCategory).icon} Take-Home Per Paycheck</div>
          <input type="number" placeholder="e.g. 2,250" value={d.income?.primary||""}
            onChange={e=>setD(p=>({...p,income:{...(p.income||{}),primary:e.target.value}}))}
            style={{width:"100%",background:C.surfaceAlt,border:`1.5px solid ${parseFloat(d.income?.primary||0)>0?C.accent:C.border}`,borderRadius:12,padding:"12px 14px",fontSize:22,fontFamily:MF,fontWeight:700,color:C.text,outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Other Income (side jobs, rental, etc)</div>
          <input type="number" placeholder="0" value={d.income?.other||""}
            onChange={e=>setD(p=>({...p,income:{...(p.income||{}),other:e.target.value}}))}
            style={{width:"100%",background:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"11px 14px",fontSize:16,color:C.text,outline:"none",boxSizing:"border-box"}}/>
        </div>
        {parseFloat(d.income?.primary||0)>0&&(
          <div style={{background:C.greenBg,border:`1px solid ${C.greenMid}`,borderRadius:12,padding:"12px 14px"}}>
            <div style={{fontSize:12,color:C.green,fontWeight:600,marginBottom:2}}>Estimated annual ({d.income?.payFrequency||"Biweekly"} pay)</div>
            <div style={{fontFamily:MF,fontWeight:800,fontSize:20,color:C.green}}>${Math.round((parseFloat(d.income?.primary||0)*(d.income?.payFrequency==="Weekly"?52:d.income?.payFrequency==="Twice Monthly"?24:d.income?.payFrequency==="Monthly"?12:26))+(parseFloat(d.income?.other||0)*12)).toLocaleString()}</div>
          </div>
        )}
      </div>
    ),btnLabel:"Continue →",canSkip:true},

    // ── STEP 4: Starting Balances ────────────────────────────
    {title:"One last thing 🏦",body:(
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {d.name&&<div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"12px 14px",marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:600,color:C.accent,marginBottom:4}}>Welcome, {d.name.split(" ")[0]}! Here's what we've set up:</div>
        <div style={{display:"flex",flexDirection:"column",gap:3}}>
          <div style={{fontSize:12,color:C.textMid}}>✓ Profile — {getProfession(d.profCategory).icon} {getProfSub(d.profCategory,d.profSub).label}</div>
          {parseFloat(d.income?.primary||0)>0&&<div style={{fontSize:12,color:C.textMid}}>✓ Take-home — {fmt(parseFloat(d.income.primary))} / {(d.income?.payFrequency||"biweekly").toLowerCase()} paycheck</div>}
        </div>
      </div>}
      <div style={{fontSize:13,color:C.textLight,lineHeight:1.6,marginBottom:12}}>Last step — add your account balances to unlock net worth tracking and safe-to-spend. Totally optional, you can skip and add later.</div>
        <div style={{fontSize:13,color:C.accent,fontWeight:600,marginBottom:8}}>Core accounts (powers Safe-to-Spend)</div>
        {[{k:"checking",l:"Checking",ic:"🏦",ph:"2500",req:true},{k:"savings",l:"Savings",ic:"💰",ph:"5000",req:false},{k:"cushion",l:"Emergency Fund",ic:"🛡️",ph:"1000",req:false}].map(a=>(
          <div key={a.k} style={{display:"flex",alignItems:"center",gap:12,background:C.surfaceAlt,borderRadius:12,padding:"11px 14px"}}>
            <span style={{fontSize:20,flexShrink:0}}>{a.ic}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:C.text}}>{a.l}</div>
              {a.req&&<div style={{fontSize:10,color:C.accent,fontWeight:600}}>Used for safe-to-spend</div>}
            </div>
            <input type="number" placeholder={a.ph} value={d.accounts?.[a.k]||""}
              onChange={e=>setD(p=>({...p,accounts:{...(p.accounts||{}),[a.k]:e.target.value}}))}
              style={{width:110,background:"#fff",border:`1.5px solid ${parseFloat(d.accounts?.[a.k]||0)>0?C.accent:C.border}`,borderRadius:10,padding:"8px 10px",fontSize:15,fontFamily:MF,fontWeight:700,color:C.text,outline:"none",textAlign:"right"}}/>
          </div>
        ))}
        <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"10px 14px",fontSize:12,color:C.accent,display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:16}}>💡</span>
          <span>You can add 401k, Roth IRA, brokerage, and crypto in <strong>Accounts & Income</strong> after setup.</span>
        </div>
        {(parseFloat(d.accounts?.checking||0)+parseFloat(d.accounts?.savings||0)+parseFloat(d.accounts?.cushion||0))>0&&(
          <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"10px 14px",fontSize:13,color:C.accent,fontWeight:600}}>
            💰 Liquid total: ${(parseFloat(d.accounts?.checking||0)+parseFloat(d.accounts?.savings||0)+parseFloat(d.accounts?.cushion||0)).toLocaleString()}
          </div>
        )}
      </div>
    ),btnLabel:"Launch Trackfi 🚀",canSkip:true},
  ];

  const cur=STEPS[step];
  const isLast=step===STEPS.length-1;

  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg,${C.navy} 0%,${C.accent} 100%)`,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.surface,borderRadius:24,width:"100%",maxWidth:500,boxShadow:"0 20px 60px rgba(0,0,0,.25)",overflow:"hidden"}}>
        {step>0&&<div style={{height:4,background:C.borderLight}}><div style={{height:"100%",width:`${(step/(STEPS.length-1))*100}%`,background:`linear-gradient(90deg,${C.accent},${C.teal})`,transition:"width .4s",borderRadius:99}}/></div>}
        <div style={{padding:"28px 24px 32px",maxHeight:"90vh",overflowY:"auto"}}>
          {step>0&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <button onClick={()=>setStep(s=>s-1)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"5px 12px",fontSize:12,color:C.textMid,cursor:"pointer"}}>← Back</button>
            <span style={{fontSize:12,color:C.textLight,fontWeight:600}}>Step {step} of {STEPS.length-1}</span>
          </div>}
          {cur.title&&<div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,marginBottom:18,letterSpacing:-.3}}>{cur.title}</div>}
          {cur.body}
          <button onClick={()=>{if(isLast){onComplete({...d,isTrader:parseFloat(d.income?.trading||0)>0});}else{setStep(s=>s+1);}}}
            style={{width:"100%",marginTop:20,background:`linear-gradient(135deg,${C.accent},${C.green})`,border:"none",borderRadius:14,padding:"15px 0",color:"#fff",fontFamily:MF,fontWeight:800,fontSize:16,cursor:"pointer",letterSpacing:.2}}>
            {cur.btnLabel}
          </button>
          {cur.canSkip&&!isLast&&<button onClick={()=>setStep(s=>s+1)} style={{width:"100%",marginTop:10,background:"none",border:"none",color:C.textLight,fontSize:13,cursor:"pointer",padding:"4px 0"}}>Skip for now →</button>}
          {cur.canSkip&&isLast&&<button onClick={()=>onComplete({...d,isTrader:false})} style={{width:"100%",marginTop:10,background:"none",border:"none",color:C.textLight,fontSize:13,cursor:"pointer",padding:"4px 0"}}>Skip for now →</button>}
        </div>
      </div>
    </div>
  );
}
function parseMsg(text,categories,debts){
  const t=text.toLowerCase().trim();
  // Pre-process: split bill
  const splitM=t.match(/split\s*(\d+)/i);const splitBy=splitM?parseInt(splitM[1]):1;
  // Pre-process: tip/percentage
  const tipM=t.match(/(?:plus|\+|tip)\s*(\d+)%/i);const tipPct=tipM?parseFloat(tipM[1])/100:0;
  const am=text.match(/\$?([\d,]+(?:\.\d{1,2})?)/);
  const rawAmount=am?parseFloat(am[1].replace(/,/g,"")):null;
  const amount=rawAmount!=null?String(((rawAmount*(1+tipPct))/splitBy).toFixed(2)):null;
  const dt=new Date();let date=todayStr();
  if(t.includes("yesterday")){const d=new Date(dt);d.setDate(d.getDate()-1);date=d.toISOString().split("T")[0];}
  const DAYS=["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const lastDayM=t.match(/last\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
  if(lastDayM){const target=DAYS.indexOf(lastDayM[1].toLowerCase());const d=new Date(dt);const curr=d.getDay();const diff=curr>=target?curr-target:curr-target+7;d.setDate(d.getDate()-Math.max(diff,1));date=d.toISOString().split("T")[0];}
  // Transfer detection (moved/transferred X to savings/checking)
  if((t.includes("moved")||t.includes("transferred")||t.includes("transfer"))&&amount){
    if(t.includes("saving"))return{type:"account",key:"savings",amount,text:"Moved to savings"};
    if(t.includes("checking"))return{type:"account",key:"checking",amount,text:"Moved to checking"};
  }
  const dueM=t.match(/due(?:\s+the)?\s+(\d{1,2})(?:st|nd|rd|th)?/)||t.match(/on(?:\s+the)?\s+(\d{1,2})(?:st|nd|rd|th)/);
  let dueDate=null;
  if(dueM){const d=new Date(dt.getFullYear(),dt.getMonth(),parseInt(dueM[1]));if(d<dt)d.setMonth(d.getMonth()+1);dueDate=d.toISOString().split("T")[0];}
  if(t==="undo"||t.startsWith("undo last")||t.includes("undo that"))return{type:"undo"};
  const acctKeys={checking:["checking","check"],savings:["savings","saving"],cushion:["cushion","buffer"]};
  for(const[key,kws]of Object.entries(acctKeys)){if(kws.some(k=>t.includes(k))&&amount)return{type:"account",key,amount};}
  if((t.includes("primary income")||t.includes("salary set")||t.includes("income set"))&&amount)return{type:"income",key:"primary",amount};
  const tradeKws=["traded","long ","short ","es ","nq ","cl ","gc ","futures","position"];
  if(tradeKws.some(k=>t.includes(k))&&amount){
    const sym=(text.match(/\b(ES|NQ|CL|GC|SI|ZB|YM|MES|MNQ|RTY)\b/i)||[])[1]?.toUpperCase()||"FUTURE";
    const side=t.includes("short")?"Short":"Long";
    const pnl=t.includes("-")||t.includes("loss")||t.includes("lost")?"-"+amount:amount;
    return{type:"trade",symbol:sym,side,pnl,date,contracts:"1"};
  }
  const debtKws=["loan","debt","credit card","owe","balance update","pay off"];
  if(debtKws.some(k=>t.includes(k))&&amount){
    const match=debts.find(d=>d.name.toLowerCase().split(" ").some(w=>t.includes(w)&&w.length>3));
    const name=match?match.name:text.replace(/\$?[\d,]+(?:\.\d{1,2})?/g,"").replace(/loan|debt|owe|balance|update|credit card/gi,"").trim().split(" ").filter(Boolean).map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" ")||"Debt";
    const rateM=t.match(/(\d+(?:\.\d+)?)\s*%/);
    return{type:"debt",name,balance:amount,rate:rateM?rateM[1]:"",isUpdate:!!match,matchId:match?.id};
  }
  const billKws=["bill","rent","mortgage","electric","water","internet","phone","insurance","netflix","spotify","gym","hulu","due","subscription","car payment"];
  if((billKws.some(k=>t.includes(k))||dueDate)&&amount){
    let name=text.replace(/\$?[\d,]+(?:\.\d{1,2})?/g,"").replace(/bill|due(?:\s+the)?\s+\d{1,2}(?:st|nd|rd|th)?/gi,"").trim();
    name=name.split(" ").filter(Boolean).map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" ")||"Bill";
    return{type:"bill",name,amount,dueDate:dueDate||"",recurring:"Monthly",autoPay:false};
  }
  if(amount){
    const catMap={
      "Groceries":["grocery","groceries","publix","kroger","whole foods","trader joe","aldi","costco","walmart","food lion","safeway","wegmans","sprouts","market"],
      "Fast Food":["mcdonald","burger king","wendy","chick-fil","taco bell","subway","chipotle","popeyes","kfc","domino","pizza hut","panda","five guys","sonic","whataburger","jack in","in-n-out","cookout"],
      "Restaurants":["restaurant","dinner","lunch","sushi","thai","italian","steakhouse","dine","bistro","grill","eatery","doordash","ubereats","grubhub","postmates","dine in","ate out"],
      "Coffee":["starbucks","dunkin","coffee","latte","espresso","cappuccino","cold brew","dutch bros","caribou","peets","coffee shop","cafe"],
      "Gas":["gas","shell","bp","chevron","exxon","mobil","speedway","pilot","loves","quiktrip","fuel","gasoline","wawa","sheetz"],
      "Rideshare":["uber","lyft","taxi","cab","via","ride"],
      "Rent / Mortgage":["rent","mortgage","landlord","lease","apartment","housing"],
      "Utilities":["electric","electricity","water","gas bill","internet","cable","wifi","xfinity","comcast","duke energy","pg&e","utility","sewage","trash"],
      "Phone":["phone","verizon","att","t-mobile","sprint","cricket","straight talk","metro","boost","wireless"],
      "Subscriptions":["netflix","hulu","spotify","apple music","amazon prime","youtube premium","disney","hbo","paramount","peacock","crunchyroll","audible","icloud","dropbox","adobe","subscription","membership","annual"],
      "Health / Medical":["doctor","hospital","pharmacy","cvs","walgreens","rite aid","medicine","prescription","dental","dentist","therapy","therapist","copay","urgent care","clinic","optometrist","chiropractor"],
      "Gym / Fitness":["gym","planet fitness","la fitness","anytime fitness","equinox","ymca","fitness","crossfit","orangetheory","workout","yoga","pilates","peloton"],
      "Grooming / Haircuts":["haircut","barber","salon","great clips","supercuts","hair","nails","manicure","pedicure","wax","massage","spa","beauty","ulta","sephora"],
      "Clothing":["clothes","clothing","shoes","nike","adidas","h&m","zara","gap","old navy","forever21","shein","nordstrom","macy","fashion nova","foot locker"],
      "Entertainment":["movie","netflix","theater","amc","regal","game","steam","playstation","xbox","nintendo","concert","ticket","ticketmaster","event","bowling","arcade","club","bar","nightlife"],
      "Travel":["hotel","airbnb","vrbo","flight","airline","southwest","delta","united","american airlines","frontier","spirit","booking","expedia","hotel","motel","resort","vacation","travel"],
      "Pets":["pet","petco","petsmart","vet","veterinary","dog","cat","animal","pet food","grooming","pet supply"],
      "Shopping":["amazon","target","walmart","best buy","home depot","lowes","ikea","tj maxx","marshalls","ross","kohls","jcpenney","dollar tree","dollar general","shopping"],
      "Dining Out":["dinner out","brunch","happy hour","date night","anniversary","celebration dinner"],
      "Transport":["parking","toll","car wash","oil change","tire","mechanic","auto","midas","jiffy lube","advance auto","napa"],
    };
    let category="Misc",best=0;
    for(const[cat,kws]of Object.entries(catMap)){const s=kws.filter(k=>t.includes(k)).length;if(s>best){best=s;category=cat;}}
    if(best===0){for(const c of categories){if(t.includes(c.name.toLowerCase())){category=c.name;break;}}}
    let name=text.replace(/\$?[\d,]+(?:\.\d{1,2})?/g,"").replace(/\b(spent|bought|paid|got|for|on|the|a|my|at|to|today|yesterday)\b/gi,"").replace(/\s+/g," ").trim();
    name=name.split(" ").filter(Boolean).map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" ")||"Expense";
    return{type:"expense",name,amount,category,date};
  }
  return null;
}

function ChatView({categories,expenses,bills,debts,accounts,income,savingsGoals,trades,tradingAccount,setExpenses,setBills,setDebts,setSGoals,setAccounts,setIncome,setTrades,setBGoals}){
  const[msgs,setMsgs]=useState([{role:"a",text:"Hey! I can log anything:\
• \"lunch 12\", \"groceries 85\", \"gas 55\" → log expense\
• \"rent 1200 due 28th\" → add bill\
• \"checking 3200\" → update balance\
• \"moved 500 to savings\" → transfer\
• \"car loan 15000 at 6%\" → track debt\
• \"traded ES +250\" → log trade\
• \"undo\" → undo last entry\
Ask me anything:\
• \"can I afford $200?\"\
• \"what did I spend on groceries?\"\
• \"when\'s my next payday?\"\
• \"how am I doing this month?\"\
• \"what are my goals?\""}]);
  const[input,setInput]=useState("");const[pending,setPending]=useState(null);const[history,setHistory]=useState([]);
  const botRef=useRef();
  useEffect(()=>{botRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,pending]);
  const ti=useMemo(()=>(parseFloat(income.primary||0)*(income.payFrequency==="Weekly"?4.33:income.payFrequency==="Twice Monthly"?2:income.payFrequency==="Monthly"?1:2.17))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0)),[income]);
  const te=useMemo(()=>expenses.reduce((s,e)=>s+(parseFloat(e.amount)||0),0),[expenses]);
  const ck=parseFloat(accounts.checking||0);
  // Use real pay-frequency-aware safe-to-spend
  const chatPayFreq=income.payFrequency||"Biweekly";
  const chatPayDays=chatPayFreq==="Weekly"?7:chatPayFreq==="Biweekly"?14:chatPayFreq==="Twice Monthly"?15:30;
  const chatNow=new Date();const chatTod=chatNow.getDate();
  const chatNextPay=(()=>{if(chatPayFreq==="Twice Monthly"){return chatTod<15?new Date(chatNow.getFullYear(),chatNow.getMonth(),15):new Date(chatNow.getFullYear(),chatNow.getMonth()+1,1);}if(chatPayFreq==="Monthly"){return new Date(chatNow.getFullYear(),chatNow.getMonth()+1,1);}const d=new Date(chatNow);d.setDate(chatNow.getDate()+chatPayDays);return d;})();
  const chatNextPayStr=chatNextPay.toISOString().split("T")[0];
  const bs=bills.reduce((s,b)=>{if(b.paid)return s;const d=b.dueDate||"";return d&&d<=chatNextPayStr?s+(parseFloat(b.amount)||0):s;},0);
  const burn=dayOfMonth()>0?te/dayOfMonth():0;
  const chatProjected=burn*Math.max(1,Math.ceil((chatNextPay-chatNow)/86400000));
  const chatOtherMonthly=(parseFloat(income.other||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const chatOtherProRated=chatOtherMonthly*(Math.max(1,Math.ceil((chatNextPay-chatNow)/86400000))/30);
  const sts=Math.max(0,ck+chatOtherProRated-bs-chatProjected-200);
  // Pre-compute reusable values for handleQ
  const _thisMs=new Date().getFullYear()+"-"+String(new Date().getMonth()+1).padStart(2,"0");
  const _thisExp=expenses.filter(e=>e.date?.startsWith(_thisMs));
  const _thisTotal=_thisExp.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const _prevMs=(()=>{const d=new Date();d.setMonth(d.getMonth()-1);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");})();
  const _prevTotal=expenses.filter(e=>e.date?.startsWith(_prevMs)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const _catTotals=_thisExp.reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount)||0);return a},{});
  const _topCats=Object.entries(_catTotals).sort((a,b)=>b[1]-a[1]);

  function handleQ(t){
    if(t.includes("afford")||t.includes("safe to spend")||t.includes("safe to")){
      const m=t.match(/[\d,]+/);const a=m?parseFloat(m[0].replace(/,/g,"")):null;
      if(a)return a<=sts?"\u2705 Yes \u2014 "+fmt(a)+" fits. You have "+fmt(sts)+" safe to spend until "+chatNextPay.toLocaleDateString("en-US",{month:"short",day:"numeric"})+".":"\u274c No \u2014 "+fmt(a)+" exceeds your safe-to-spend of "+fmt(sts)+". Short by "+fmt(a-sts)+".";
      return"Safe to spend: "+fmt(sts)+"\nChecking: "+fmt(ck)+" \u00b7 Bills before payday: "+fmt(bs)+"\nNext pay: "+chatNextPay.toLocaleDateString("en-US",{month:"short",day:"numeric"});
    }
    if(t.includes("bill")||t.includes("due")||t.includes("upcoming")){
      const ov=bills.filter(b=>!b.paid&&dueIn(b.dueDate)<0);
      const soon=bills.filter(b=>!b.paid&&dueIn(b.dueDate)>=0&&dueIn(b.dueDate)<=14);
      const later=bills.filter(b=>!b.paid&&dueIn(b.dueDate)>14);
      let resp="";
      if(ov.length)resp+="\ud83d\udea8 OVERDUE ("+fmt(ov.reduce((s,b)=>s+(parseFloat(b.amount)||0),0))+"):\n"+ov.map(b=>"\u2022 "+b.name+" "+fmt(b.amount)+" \u2014 "+Math.abs(dueIn(b.dueDate))+"d overdue").join("\n")+"\n\n";
      if(soon.length)resp+="\ud83d\udcc5 Due soon:\n"+soon.map(b=>"\u2022 "+b.name+" "+fmt(b.amount)+" \u2014 "+dueIn(b.dueDate)+"d left").join("\n")+"\n\n";
      if(later.length)resp+="Later: "+later.map(b=>b.name+" "+fmt(b.amount)).join(", ");
      return resp.trim()||"\u2705 No bills due soon!";
    }
    if(t.includes("spend on")||t.includes("spent on")||t.includes("how much")||t.includes("categor")){
      const catMatch=categories.find(c=>t.includes(c.name.toLowerCase()));
      if(catMatch){
        const catAmt=_catTotals[catMatch.name]||0;
        const catTxns=_thisExp.filter(e=>e.category===catMatch.name);
        return catMatch.name+" this month: "+fmt(catAmt)+" ("+catTxns.length+" transactions)"+(catTxns.length>0?"\nRecent: "+catTxns.slice(-3).map(e=>e.name+" "+fmt(e.amount)).join(", "):"");
      }
      if(_topCats.length>0)return"Top spending this month:\n"+_topCats.slice(0,6).map(([cat,amt],i)=>(i+1)+". "+cat+": "+fmt(amt)).join("\n")+"\n\nTotal: "+fmt(_thisTotal);
      return"No spending logged this month yet.";
    }
    if(t.includes("how am i")||t.includes("doing this month")||t.includes("this month")||(t.includes("spend")&&!t.includes("spend on"))){
      const dom=new Date().getDate();const dim=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate();
      const projected=dom>0?(_thisTotal/dom)*dim:0;
      const diff=_prevTotal>0?((_thisTotal-_prevTotal)/_prevTotal*100):0;
      return"\ud83d\udcca "+FULL_MOS[new Date().getMonth()]+" so far: "+fmt(_thisTotal)+"\nBurn rate: "+fmt(dom>0?_thisTotal/dom:0)+"/day\nProjected month-end: "+fmt(projected)+(_prevTotal>0?"\n"+(diff>0?"\u2b06\ufe0f "+diff.toFixed(0)+"% more":"\u2b07\ufe0f "+Math.abs(diff).toFixed(0)+"% less")+" than last month":"");
    }
    if(t.includes("balance")||t.includes("checking")||(t.includes("account")&&!t.includes("health"))){
      const total=["checking","savings","cushion","investments","k401","roth_ira","brokerage","crypto","hsa"].reduce((s,k)=>s+(parseFloat(accounts[k]||0)),0);
      return"\ud83d\udcb3 Checking: "+fmt(accounts.checking)+"\n\ud83d\udcb0 Savings: "+fmt(accounts.savings)+(parseFloat(accounts.cushion||0)>0?"\n\ud83d\udee1\ufe0f Cushion: "+fmt(accounts.cushion):"")+(parseFloat(accounts.investments||0)>0?"\n\ud83d\udcc8 Investments: "+fmt(accounts.investments):"")+"\nTotal liquid: "+fmt(total);
    }
    if(t.includes("payday")||t.includes("paycheck")||t.includes("pay day")||t.includes("next pay")||t.includes("get paid")){
      const days=Math.max(0,Math.ceil((chatNextPay-chatNow)/86400000));
      return"\ud83d\udcb0 Next payday: "+chatNextPay.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})+(days===0?" (Today!)":" ("+days+" days)")+"\nExpected: "+fmt(parseFloat(income.primary||0))+"\nSafe to spend until then: "+fmt(sts);
    }
    if(t.includes("income")||t.includes("earn")||t.includes("salary")||(t.includes("make")&&t.includes("month"))){
      const sources=[];
      if(income.primary)sources.push("\ud83d\udcb5 Paycheck ("+income.payFrequency+"): "+fmt(income.primary));
      if(income.other)sources.push("\ud83d\udccb Other: "+fmt(income.other)+"/mo");
      if(income.rental)sources.push("\ud83c\udfe0 Rental: "+fmt(income.rental)+"/mo");
      if(income.dividends)sources.push("\ud83d\udcc8 Dividends: "+fmt(income.dividends)+"/mo");
      if(income.freelance)sources.push("\ud83d\udcbb Freelance: "+fmt(income.freelance)+"/mo");
      const mult=chatPayFreq==="Weekly"?4.33:chatPayFreq==="Twice Monthly"?2:chatPayFreq==="Monthly"?1:2.17;
      const monthly=(parseFloat(income.primary||0)*mult)+(parseFloat(income.other||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
      return(sources.length?sources.join("\n"):"No income set yet")+"\n\nMonthly total: "+fmt(monthly)+"\nAnnual est: "+fmt(monthly*12);
    }
    if(t.includes("goal")||t.includes("saving for")||t.includes("savings goal")){
      if(!savingsGoals.length)return"No savings goals set yet. Tap Goals in the menu to add one!";
      return"\ud83c\udfaf Savings Goals:\n"+savingsGoals.map(g=>{const pct=Math.min(100,(parseFloat(g.saved||0)/parseFloat(g.target||1))*100);const rem=Math.max(0,parseFloat(g.target||0)-parseFloat(g.saved||0));const mo=parseFloat(g.monthly||0);const months=mo>0?Math.ceil(rem/mo):null;return(g.icon||"\ud83c\udfaf")+" "+g.name+": "+fmt(g.saved||0)+" / "+fmt(g.target)+" ("+pct.toFixed(0)+"%)"+( months?" \u00b7 "+months+"mo to go":"");}).join("\n");
    }
    if(t.includes("debt")||t.includes("loan")||t.includes("credit card")||t.includes("owe")){
      const td=debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0);
      const monthlyInt=debts.reduce((s,d)=>s+(parseFloat(d.balance||0)*(parseFloat(d.rate||0)/100/12)),0);
      if(!debts.length)return"\u2705 No debts tracked! Add one with 'car loan 15000 at 6%'";
      return"\ud83d\udcb3 Total debt: "+fmt(td)+"\nMonthly interest: "+fmt(monthlyInt)+"\n\n"+debts.map(d=>"\u2022 "+d.name+": "+fmt(d.balance)+(d.rate?" @ "+d.rate+"%":"")).join("\n");
    }
    if(t.includes("net worth")||t.includes("worth")){
      const ta=["checking","savings","cushion","investments","k401","roth_ira","brokerage","crypto","hsa","property","vehicles"].reduce((s,k)=>s+(parseFloat(accounts[k]||0)),0);
      const td=debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0);
      return"\ud83d\udcca Net Worth: "+fmt(ta-td)+"\nAssets: "+fmt(ta)+" \u00b7 Debts: "+fmt(td);
    }
    if(t.includes("biggest")||t.includes("largest")||t.includes("most spent")){
      const top=_thisExp.slice().sort((a,b)=>parseFloat(b.amount)-parseFloat(a.amount))[0];
      const topCat=_topCats[0];
      return(top?"💸 Biggest: "+top.name+" "+fmt(top.amount)+" on "+top.date+"\n":"")+(topCat?"📦 Top category: "+topCat[0]+" "+fmt(topCat[1]):"");
    }
    if(t.includes("last week")||t.includes("this week")){
      const now2=new Date();const day=now2.getDay();
      const weekStart=new Date(now2);weekStart.setDate(now2.getDate()-(t.includes("last week")?day+7:day));weekStart.setHours(0,0,0,0);
      const weekEnd=new Date(weekStart);weekEnd.setDate(weekStart.getDate()+7);
      const weekExp=expenses.filter(e=>{const d=new Date((e.date||"")+"T00:00:00");return d>=weekStart&&d<weekEnd;});
      const weekTotal=weekExp.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
      const weekCats=Object.entries(weekExp.reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount)||0);return a},{})).sort((a,b)=>b[1]-a[1]);
      return(t.includes("last week")?"Last week":"This week")+": "+fmt(weekTotal)+" across "+weekExp.length+" transactions"+(weekCats.length?" · Top: "+weekCats[0][0]+" "+fmt(weekCats[0][1]):"");
    }
    if(t.includes("average")||t.includes("avg")||t.includes("typical")){
      const dom2=now.getDate();
      return"📊 Daily average: "+fmt(_thisTotal/Math.max(1,dom2))+" · At this pace: "+fmt((_thisTotal/Math.max(1,dom2))*new Date(now.getFullYear(),now.getMonth()+1,0).getDate())+" this month";
    }
    if(t.includes("savings rate")||t.includes("saving rate")){
      const mult=chatPayFreq==="Weekly"?4.33:chatPayFreq==="Twice Monthly"?2:chatPayFreq==="Monthly"?1:2.17;
      const monthly=(parseFloat(income.primary||0)*mult)+(parseFloat(income.other||0));
      const sr=monthly>0?Math.max(0,(monthly-_thisTotal)/monthly*100):0;
      return"\ud83d\udcbe Savings rate: "+sr.toFixed(1)+"%\nIncome: "+fmt(monthly)+"/mo \u00b7 Spent: "+fmt(_thisTotal)+" \u00b7 Saving: "+fmt(Math.max(0,monthly-_thisTotal));
    }
    if(t.includes("subscription")||t.includes("recurring charge")){
      const nameMap={};expenses.forEach(e=>{const k=e.name?.toLowerCase().trim();if(!k)return;if(!nameMap[k])nameMap[k]=[];nameMap[k].push(e);});
      const subs=Object.values(nameMap).filter(v=>v.length>=2&&v.map(x=>parseFloat(x.amount)).every((a,_,arr)=>Math.abs(a-arr[0])<1));
      return subs.length?"\ud83d\udd04 Detected "+subs.length+" recurring charges:\n"+subs.map(v=>"\u2022 "+v[0].name+": "+fmt(v[0].amount)+"/mo").join("\n")+"\nTotal: "+fmt(subs.reduce((s,v)=>s+parseFloat(v[0].amount),0))+"/mo":"No recurring charges detected yet.";
    }
    if(t.includes("health")||t.includes("score")||t.includes("grade")){
      const mult=chatPayFreq==="Weekly"?4.33:chatPayFreq==="Twice Monthly"?2:chatPayFreq==="Monthly"?1:2.17;
      const monthly=(parseFloat(income.primary||0)*mult)+(parseFloat(income.other||0));
      const sr=monthly>0?Math.max(0,(monthly-_thisTotal)/monthly*100):0;
      const liquid=parseFloat(accounts.savings||0)+parseFloat(accounts.cushion||0);
      const moExpH=_thisTotal||1;const ef=liquid/moExpH;
      const td=debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0);
      const s1=sr>=20?100:sr>=15?85:sr>=10?70:sr>=5?50:30;
      const s2=ef>=6?100:ef>=3?80:ef>=1?55:30;
      const s3=td===0?100:60;
      const overall=Math.round(((s1*.3)+(s2*.3)+(s3*.4))/10);
      const grade=overall>=9?"A+":overall>=8?"A":overall>=7?"B":overall>=6?"C":overall>=5?"D":"F";
      return"\u2764\ufe0f Health Score: "+overall+"/10 ("+grade+")\n\u2022 Savings rate: "+sr.toFixed(0)+"%\n\u2022 Emergency fund: "+ef.toFixed(1)+" months\n\u2022 Debt: "+(td===0?"Debt free \u2705":fmt(td)+" total")+"\nOpen Health Score tab for full breakdown.";
    }
    if(t.includes("compare")||t.includes("vs last")||t.includes("last month")&&t.includes("vs")){
      if(!_prevTotal)return"No data from last month yet.";
      const diff=_thisTotal-_prevTotal;const pct=Math.abs(diff/_prevTotal*100).toFixed(0);
      const top=_topCats[0];
      return(diff>0?"📈 Up "+pct+"% vs last month — spending "+fmt(diff)+" more.":"📉 Down "+pct+"% vs last month — "+fmt(Math.abs(diff))+" less. Nice!")+(top?"
Biggest category: "+top[0]+" "+fmt(top[1]):"");
    }
    if(t.includes("on track")||t.includes("pace")||t.includes("budget for")){
      const mult=chatPayFreq==="Weekly"?4.33:chatPayFreq==="Twice Monthly"?2:chatPayFreq==="Monthly"?1:2.17;
      const monthly=(parseFloat(income.primary||0)*mult)+(parseFloat(income.other||0));
      if(!monthly)return"Set your income first so I can check your pace.";
      const dom=new Date().getDate();const dim=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
      const pace=(monthly/dim)*dom;const diff=_thisTotal-pace;
      return diff<=0?"✅ On track — "+fmt(Math.abs(diff))+" under pace for the month.":"⚠️ "+fmt(diff)+" over pace. Projected: "+fmt((_thisTotal/Math.max(1,dom))*dim)+" vs "+fmt(monthly)+" income.";
    }
    if((t.includes("where")&&(t.includes("spend")||t.includes("most")))||(t.includes("what")&&t.includes("most"))){
      if(!_topCats.length)return"No spending logged yet this month.";
      return"💸 Where you're spending most:
"+_topCats.slice(0,5).map(([c,a],i)=>(i+1)+". "+c+": "+fmt(a)).join("
")+"
Total: "+fmt(_thisTotal);
    }
    if(t.includes("help")||t.includes("what can")||t.includes("commands")||t.includes("how do")){
      return"\ud83d\udcac I can help with:\n\u2022 \"lunch 12\", \"groceries 85\" \u2192 log expense\n\u2022 \"rent 1200 due 28th\" \u2192 add bill\n\u2022 \"checking 3200\" \u2192 update balance\n\u2022 \"can I afford $200?\"\n\u2022 \"how am I doing?\"\n\u2022 \"what did I spend on groceries?\"\n\u2022 \"when\'s my next payday?\"\n\u2022 \"what are my goals?\"\n\u2022 \"my income\" or \"my debt\"\n\u2022 \"undo\" \u2192 undo last entry";
    }
    return null;
  }
  function send(){const text=input.trim();if(!text)return;setInput("");setMsgs(p=>[...p,{role:"u",text}]);const t=text.toLowerCase();const isQ=t.includes("?")||/^(how|what|can|show|is|am|will|when|tell)/.test(t);if(isQ){const ans=handleQ(t);if(ans){setMsgs(p=>[...p,{role:"a",text:ans}]);return;}}const parsed=parseMsg(text,categories,debts);if(!parsed){setMsgs(p=>[...p,{role:"a",text:"Try: lunch 12 · groceries 85 · rent 1200 due 28th · checking 3200 · undo\nAsk: can I afford $200? · how am I doing? · my bills"}]);return;}
    if(parsed.type==="undo"){if(!history.length){setMsgs(p=>[...p,{role:"a",text:"Nothing to undo!"}]);return;}const last=history[history.length-1];if(last.type==="expense")setExpenses(p=>p.filter(x=>x.id!==last.id));else if(last.type==="bill")setBills(p=>p.filter(x=>x.id!==last.id));else if(last.type==="debt")setDebts(p=>p.filter(x=>x.id!==last.id));else if(last.type==="trade")setTrades(p=>p.filter(x=>x.id!==last.id));else if(last.type==="account")setAccounts(p=>({...p,[last.key]:last.oldVal}));setHistory(p=>p.slice(0,-1));setMsgs(p=>[...p,{role:"a",text:"↩️ Undone: "+last.label}]);return;}
    setPending(parsed);setMsgs(p=>[...p,{role:"a",text:"Confirm?"}]);}
  function confirm(){if(!pending)return;const id=Date.now();let lbl="";
    if(pending.type==="expense"){setExpenses(p=>[...p,{id,...pending,notes:""}]);setHistory(p=>[...p,{type:"expense",id,label:pending.name+" "+fmt(pending.amount)}]);lbl="✅ "+pending.name+" ("+fmt(pending.amount)+") logged!";}else if(pending.type==="bill"){setBills(p=>[...p,{id,...pending,paid:false,autoPay:false}]);setHistory(p=>[...p,{type:"bill",id,label:pending.name}]);lbl="✅ "+pending.name+" bill added!";}else if(pending.type==="debt"){if(pending.isUpdate){setDebts(p=>p.map(d=>d.id===pending.matchId?{...d,balance:pending.balance}:d));}else{setDebts(p=>[...p,{id,name:pending.name,balance:pending.balance,rate:pending.rate||"",minPayment:""}]);setHistory(p=>[...p,{type:"debt",id,label:pending.name}]);}lbl="✅ "+pending.name+" saved!";}else if(pending.type==="trade"){setTrades(p=>[{id,date:pending.date,symbol:pending.symbol,side:pending.side,contracts:"1",pnl:pending.pnl,entry:"",exit:"",note:""},...p]);setHistory(p=>[...p,{type:"trade",id,label:pending.symbol+" "+pending.side}]);lbl="✅ "+pending.symbol+" "+(parseFloat(pending.pnl)>=0?"+":"")+fmt(pending.pnl);}else if(pending.type==="account"){const oldVal=accounts[pending.key];setAccounts(p=>({...p,[pending.key]:pending.amount}));setHistory(p=>[...p,{type:"account",key:pending.key,oldVal,label:pending.key}]);lbl="✅ "+pending.key+": "+fmt(pending.amount);}
    setMsgs(p=>[...p,{role:"a",text:lbl||"✅ Saved!"}]);setPending(null);}
  const cr=(l,v)=><div style={{display:"flex",justifyContent:"space-between",padding:"6px 10px",background:C.bg,borderRadius:8,marginBottom:3}}><span style={{fontSize:12,color:C.textLight}}>{l}</span><span style={{fontSize:12,color:C.text,fontWeight:600}}>{v}</span></div>;
  return(<div style={{display:"flex",flexDirection:"column",height:"100%",minHeight:0}}>
    <div style={{background:sts>200?C.greenBg:C.redBg,border:`1px solid ${sts>200?C.greenMid:C.redMid}`,borderRadius:12,padding:"8px 14px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:11,color:sts>200?C.green:C.red,fontWeight:600}}>Safe to spend</span>
        <span style={{fontFamily:MF,fontSize:15,fontWeight:800,color:sts>200?C.green:C.red}}>{fmt(sts)}</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10,fontSize:11,color:C.textLight}}>
        <span>{fmt(burn)}/day</span>
        {history.length>0&&<span style={{color:C.accent,cursor:"pointer"}} onClick={()=>{const text="undo";setInput("");const fakeE={key:"Enter"};setMsgs(p=>[...p,{role:"u",text:"undo"}]);const last=history[history.length-1];if(!last)return;if(last.type==="expense")setExpenses(p=>p.filter(x=>x.id!==last.id));else if(last.type==="bill")setBills(p=>p.filter(x=>x.id!==last.id));else if(last.type==="account")setAccounts(p=>({...p,[last.key]:last.oldVal}));setHistory(p=>p.slice(0,-1));setMsgs(p=>[...p,{role:"a",text:"↩️ Undone: "+last.label}]);}}>↩ Undo</span>}
      </div>
    </div>
    <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:8,paddingBottom:10,minHeight:0}}>
      {msgs.map((m,i)=><div key={i} style={{display:"flex",justifyContent:m.role==="u"?"flex-end":"flex-start"}}><div style={{maxWidth:"86%",padding:"11px 14px",borderRadius:m.role==="u"?"18px 18px 4px 18px":"18px 18px 18px 4px",background:m.role==="u"?C.accent:"#fff",color:m.role==="u"?"#fff":C.text,fontSize:14,lineHeight:1.55,border:m.role==="a"?"1px solid "+C.border:"none",whiteSpace:"pre-wrap"}}>{m.text}</div></div>)}
      {pending&&<div style={{background:C.surface,border:"1.5px solid "+C.accentMid,borderRadius:16,padding:18}}><div style={{fontSize:11,fontWeight:700,color:C.accent,textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>Confirm</div>{pending.name&&cr("Name",pending.name)}{(pending.amount||pending.balance)&&cr("Amount",fmt(pending.amount||pending.balance))}{pending.category&&cr("Category",pending.category)}{pending.symbol&&cr("Trade",pending.symbol+" "+(parseFloat(pending.pnl)>=0?"+":"")+fmt(pending.pnl))}<div style={{display:"flex",gap:8,marginTop:12}}><button className="ba" onClick={confirm} style={{flex:1,background:C.green,border:"none",borderRadius:10,padding:"11px 0",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>✅ Save</button><button className="ba" onClick={()=>setPending(null)} style={{flex:1,background:C.bg,border:"1px solid "+C.border,borderRadius:10,padding:"11px 0",color:C.textMid,fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancel</button></div></div>}
      <div ref={botRef}/>
    </div>
    <div style={{display:"flex",gap:8,paddingTop:10,borderTop:"1px solid "+C.border,flexShrink:0}}>
      <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder='Try "lunch 12" or "can I afford $200?"' style={{flex:1,background:C.bg,border:"1.5px solid "+C.border,borderRadius:12,padding:"11px 14px",color:C.text,fontSize:14,outline:"none"}}/>
      <button className="ba" onClick={send} disabled={!input.trim()} style={{background:input.trim()?C.accent:C.border,border:"none",borderRadius:12,padding:"0 16px",cursor:input.trim()?"pointer":"default",display:"flex",alignItems:"center",color:input.trim()?"#fff":C.textLight}}><Send size={17}/></button>
    </div>
  </div>);
}

function SearchView({expenses,bills,debts,trades,categories,setEditItem,onNavigate}){
  const[q,setQ]=useState("");
  const[dq,setDq]=useState("");
  const _sqRef=React.useRef(null);
  React.useEffect(()=>{clearTimeout(_sqRef.current);_sqRef.current=setTimeout(()=>setDq(q),200);},[q]);const[filter,setFilter]=useState("all");
  const results=useMemo(()=>{
    if(!dq.trim())return[];
    const t=dq.toLowerCase();
    const res=[];
    if(filter==="all"||filter==="expenses")expenses.forEach(e=>{if(e.name?.toLowerCase().includes(t)||e.category?.toLowerCase().includes(t)||e.notes?.toLowerCase().includes(t))res.push({type:"expense",data:e,title:e.name,sub:e.date+" - "+e.category,val:"-"+fmt(e.amount),color:C.red,icon:"💸"});});
    if(filter==="all"||filter==="bills")bills.forEach(b=>{if(b.name?.toLowerCase().includes(t))res.push({type:"bill",data:b,title:b.name,sub:"Due "+fmtDate(b.dueDate)+(b.paid?" - Paid":""),val:fmt(b.amount),color:b.paid?C.green:C.amber,icon:"📅"});});
    if(filter==="all"||filter==="debts")debts.forEach(d=>{if(d.name?.toLowerCase().includes(t))res.push({type:"debt",data:d,title:d.name,sub:(d.type||"Debt")+" - "+d.rate+"%APR",val:fmt(d.balance),color:C.red,icon:"💳"});});
    if(filter==="all"||filter==="trades")trades.forEach(t2=>{if(t2.symbol?.toLowerCase().includes(t)||t2.note?.toLowerCase().includes(t))res.push({type:"trade",data:t2,title:t2.symbol+" "+t2.side,sub:t2.date+(t2.note?" - "+t2.note:""),val:(parseFloat(t2.pnl)>=0?"+":"")+fmt(t2.pnl),color:parseFloat(t2.pnl)>=0?C.green:C.red,icon:parseFloat(t2.pnl)>=0?"📈":"📉"});});
    return res.slice(0,50);
  },[dq,filter,expenses,bills,debts,trades]);
  return(
    <div className="fu">
      <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,marginBottom:4,letterSpacing:-.3}}>Search</div>
      <div style={{fontSize:13,color:C.textLight,marginBottom:14}}>Search across all your financial data</div>
      <div style={{position:"relative",marginBottom:12}}>
        <Search size={16} color={C.textLight} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)"}}/>
        <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search expenses, bills, debts, trades..." style={{width:"100%",background:C.surface,border:`1.5px solid ${q?C.accent:C.border}`,borderRadius:12,padding:"12px 14px 12px 38px",fontSize:14,color:C.text,outline:"none",boxSizing:"border-box"}}/>
        {q&&<button onClick={()=>setQ("")} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:C.textLight,display:"flex"}}><X size={16}/></button>}
      </div>
      <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto",paddingBottom:2}}>
        {[["all","All"],["expenses","Expenses"],["bills","Bills"],["debts","Debts"],["trades","Trades"]].map(([id,label])=>(
          <button key={id} onClick={()=>setFilter(id)} style={{flexShrink:0,padding:"7px 14px",borderRadius:99,border:`1.5px solid ${filter===id?C.accent:C.border}`,background:filter===id?C.accentBg:C.surface,color:filter===id?C.accent:C.textMid,fontWeight:filter===id?700:500,fontSize:13,cursor:"pointer"}}>{label}</button>
        ))}
      </div>
      {!q&&<div style={{textAlign:"center",padding:"40px 20px",color:C.textLight}}><Search size={32} color={C.border} style={{margin:"0 auto 12px",display:"block"}}/><div style={{fontSize:14,fontWeight:500}}>Start typing to search</div></div>}
      {q&&results.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:C.textLight}}><div style={{fontSize:32,marginBottom:12}}>🔍</div><div style={{fontSize:14,fontWeight:500}}>No results for "{q}"</div></div>}
      {results.map((r,i)=>(
        <div key={i} style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"13px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>{if((r.type==="expense"||r.type==="bill"||r.type==="debt")&&setEditItem)setEditItem({type:r.type,data:r.data});else if(r.type==="trade"&&onNavigate)onNavigate("trading");}}>
          <div style={{width:38,height:38,borderRadius:10,background:r.color+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{r.icon}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:600,color:C.text}}>{r.title}</div>
            <div style={{fontSize:12,color:C.textLight,marginTop:1}}>{r.sub}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:r.color}}>{r.val}</div><ChevronRight size={13} color={C.textLight}/></div>
        </div>
      ))}
      {results.length>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.textLight,marginTop:8,padding:"8px 0",borderTop:`1px solid ${C.border}`}}><span>{results.length} result{results.length!==1?"s":""} found</span><span>Total: {fmt(results.filter(r=>r.type==="expense").reduce((s,r)=>s+(parseFloat(r.data.amount)||0),0))}</span></div>}
    </div>
  );
}

function CategoryDrillView({category,expenses,income,onBack}){
  const now=new Date();
  const months=Array.from({length:6},(_,i)=>{
    const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);
    const ms=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
    const exps=expenses.filter(e=>e.category===category&&e.date?.startsWith(ms));
    return{month:FULL_MOS[d.getMonth()].slice(0,3),ms,exps,total:exps.reduce((s,e)=>s+(parseFloat(e.amount)||0),0),count:exps.length,isCurrent:i===5};
  });
  const thisMs=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
  const allExps=expenses.filter(e=>e.category===category).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const thisTotal=months[5].total;
  const maxMonth=Math.max(...months.map(m=>m.total))||1;
  const avgMonthly=months.filter(m=>m.total>0).reduce((s,m)=>s+m.total,0)/Math.max(1,months.filter(m=>m.total>0).length);
  const merchants=allExps.reduce((a,e)=>{const k=(e.name||"").toLowerCase().trim();a[k]=(a[k]||0)+(parseFloat(e.amount)||0);return a},{});
  const topMerchants=Object.entries(merchants).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const [selectedMonth,setSelectedMonth]=useState(null);
  const displayExps=selectedMonth?months.find(m=>m.ms===selectedMonth)?.exps||[]:allExps.slice(0,20);
  return(
    <div className="fu">
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
        <button onClick={onBack} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"7px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontWeight:600,fontSize:13,color:C.textMid}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>Insights</button>
        <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text}}>{category}</div>
      </div>
      {/* Header stats */}
      <div style={{background:`linear-gradient(135deg,${C.navy},${C.accent})`,borderRadius:18,padding:20,marginBottom:14,color:"#fff"}}>
        <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>This Month</div>
        <div style={{fontFamily:MF,fontSize:36,fontWeight:900,color:"#fff",letterSpacing:-1,marginBottom:4}}>{fmt(thisTotal)}</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,.5)"}}>Avg {fmt(avgMonthly)}/mo · {allExps.length} total transactions</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:14}}>
          {[["Avg/visit",fmt(allExps.length?allExps.reduce((s,e)=>s+(parseFloat(e.amount)||0),0)/allExps.length:0)],
            ["This month",String(months[5].count)+" visits"],
            ["vs avg",avgMonthly>0?((thisTotal-avgMonthly)/avgMonthly*100).toFixed(0)+"%":"—"]].map(([l,v])=>(
            <div key={l} style={{background:"rgba(255,255,255,.1)",borderRadius:10,padding:"9px 10px"}}>
              <div style={{fontSize:9,color:"rgba(255,255,255,.4)",fontWeight:600,textTransform:"uppercase",marginBottom:2}}>{l}</div>
              <div style={{fontFamily:MF,fontSize:13,fontWeight:700,color:thisTotal>avgMonthly&&l==="vs avg"?"#fca5a5":thisTotal<avgMonthly&&l==="vs avg"?C.greenMid:"#fff"}}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      {/* 6-month bar chart */}
      <div style={{background:C.surface,borderRadius:18,padding:18,marginBottom:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)"}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>6-Month History</div>
        <div style={{display:"flex",gap:4,alignItems:"flex-end",height:80,marginBottom:10}}>
          {months.map((m,i)=>{
            const h=Math.max(4,Math.round((m.total/maxMonth)*72));
            const isSelected=selectedMonth===m.ms;
            return(
              <div key={i} onClick={()=>setSelectedMonth(isSelected?null:m.ms)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"pointer"}}>
                <div style={{fontSize:8,color:C.textFaint}}>{m.total>0?fmt(m.total).replace("$","$").replace(".00",""):"—"}</div>
                <div style={{width:"100%",height:h,background:isSelected?C.accent:m.isCurrent?C.accent+"bb":C.accentBg,borderRadius:"4px 4px 0 0",transition:"height .3s",outline:isSelected?`2px solid ${C.accent}`:""}}/>
                <div style={{fontSize:9,color:m.isCurrent||isSelected?C.accent:C.textLight,fontWeight:m.isCurrent||isSelected?700:400}}>{m.month}</div>
              </div>
            );
          })}
        </div>
        {selectedMonth&&<div style={{fontSize:12,color:C.accent,fontWeight:600,textAlign:"center",marginBottom:4}}>Showing {FULL_MOS[months.find(m=>m.ms===selectedMonth)?.exps[0]?new Date(months.find(m=>m.ms===selectedMonth).ms+"-01").getMonth():now.getMonth()]} only — tap again to show all</div>}
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.textLight,paddingTop:8,borderTop:`1px solid ${C.border}`}}>
          <span>Avg: {fmt(avgMonthly)}/mo</span>
          <span>{months.reduce((s,m)=>s+m.count,0)} total visits</span>
        </div>
      </div>
      {/* Top merchants */}
      {topMerchants.length>0&&<div style={{background:C.surface,borderRadius:18,padding:18,marginBottom:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)"}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:12}}>Top Merchants</div>
        {topMerchants.map(([name,amt],i)=>{
          const count=allExps.filter(e=>(e.name||"").toLowerCase().trim()===name).length;
          return(
            <div key={name} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderBottom:i<topMerchants.length-1?`1px solid ${C.border}`:"none"}}>
              <div style={{width:30,height:30,borderRadius:8,background:C.accentBg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:MF,fontWeight:800,fontSize:12,color:C.accent,flexShrink:0}}>{i+1}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:C.text,textTransform:"capitalize"}}>{name}</div>
                <div style={{fontSize:11,color:C.textLight}}>{count} visit{count!==1?"s":""} · {fmt(amt/count)} avg</div>
              </div>
              <div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>{fmt(amt)}</div>
            </div>
          );
        })}
      </div>}
      {/* Transaction list */}
      <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:10}}>
        {selectedMonth?`Transactions — ${FULL_MOS[new Date(selectedMonth+"-01T00:00:00").getMonth()]}`:displayExps.length<allExps.length?`Recent (${displayExps.length} of ${allExps.length})`:"All Transactions"}
      </div>
      {displayExps.length===0&&<div style={{textAlign:"center",padding:30,color:C.textLight,fontSize:13}}>No transactions in this period</div>}
      {displayExps.map((e,i)=>(
        <div key={e.id||i} style={{background:C.surface,borderRadius:14,padding:"12px 14px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:"0 1px 3px rgba(10,22,40,.05)"}}>
          <div>
            <div style={{fontSize:14,fontWeight:600,color:C.text}}>{e.name}</div>
            <div style={{fontSize:11,color:C.textLight,marginTop:2}}>{e.date}{e.notes?" · "+e.notes:""}</div>
          </div>
          <div style={{fontFamily:MF,fontWeight:700,fontSize:15,color:C.red}}>{fmt(e.amount)}</div>
        </div>
      ))}
    </div>
  );
}

function InsightsView({expenses,income,bills,debts,budgetGoals,savingsGoals}){
  const[drillCat,setDrillCat]=useState(null);
  const now=new Date();
  // Render category drill-down if selected
  if(drillCat)return<CategoryDrillView category={drillCat} expenses={expenses} income={income} onBack={()=>setDrillCat(null)}/>;
  const thisMs=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
  const lastMs=new Date(now.getFullYear(),now.getMonth()-1,1).getFullYear()+"-"+String(new Date(now.getFullYear(),now.getMonth()-1,1).getMonth()+1).padStart(2,"0");
  const thisExp=expenses.filter(e=>e.date?.startsWith(thisMs));
  const lastExp=expenses.filter(e=>e.date?.startsWith(lastMs));
  const thisTotal=thisExp.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const lastTotal=lastExp.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const diff=lastTotal>0?((thisTotal-lastTotal)/lastTotal*100):0;
  const ti=(parseFloat(income.primary||0)*(income.payFrequency==="Weekly"?4.33:income.payFrequency==="Twice Monthly"?2:income.payFrequency==="Monthly"?1:2.17))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const catMap=thisExp.reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount)||0);return a},{});
  const catSorted=Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
  const lastCatMap=lastExp.reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount)||0);return a},{});
  const topMerchants=Object.entries(thisExp.reduce((a,e)=>{a[e.name]=(a[e.name]||0)+(parseFloat(e.amount)||0);return a},{})).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const dailyAvg=thisTotal/Math.max(1,now.getDate());
  const projectedMonth=dailyAvg*new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  return(
    <div className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.3}}>Spending Insights</div>

      </div>
      <div style={{fontSize:13,color:C.textLight,marginBottom:14}}>Deep dive into your spending patterns</div>

      {/* Smart insight callouts — personalized to real data */}
      {(()=>{
        const cards=[];
        const dom=now.getDate();const dim=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
        const pace=thisTotal/Math.max(1,dom);
        const projected=pace*dim;

        // Projection vs income
        if(ti>0&&projected>ti*1.1) cards.push({icon:"🔴",color:C.red,bg:C.redBg,title:"Overspend Alert",body:`At this pace you'll spend ${fmt(projected)} — ${fmt(projected-ti)} over your ${fmt(ti)} income this month.`});
        else if(ti>0&&projected<ti*0.8) cards.push({icon:"🟢",color:C.green,bg:C.greenBg,title:"Great pace!",body:`Projected to spend ${fmt(projected)} this month — ${fmt(ti-projected)} under your income. Solid savings rate.`});

        // Category spike vs last month
        const bigSpike=catSorted.find(([cat,amt])=>{const last=lastCatMap[cat]||0;return last>0&&amt>last*1.5&&amt>50;});
        if(bigSpike){const[cat,amt]=bigSpike;const last=lastCatMap[cat]||0;cards.push({icon:"📈",color:C.amber,bg:C.amberBg,title:`${cat} up ${(((amt-last)/last)*100).toFixed(0)}%`,body:`Spent ${fmt(amt)} on ${cat} vs ${fmt(last)} last month — ${fmt(amt-last)} more.`});}

        // Budget over limit
        const overBudget=budgetGoals.find(g=>{const spent=thisExp.filter(e=>e.category===g.category).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);return spent>parseFloat(g.limit||0);});
        if(overBudget){const spent=thisExp.filter(e=>e.category===overBudget.category).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);cards.push({icon:"⚠️",color:C.red,bg:C.redBg,title:`${overBudget.category} over budget`,body:`${fmt(spent)} spent vs ${fmt(overBudget.limit)} limit — ${fmt(spent-parseFloat(overBudget.limit))} over.`});}

        // Savings goal progress
        const nearGoal=savingsGoals.find(g=>{const pct=(parseFloat(g.saved||0)/parseFloat(g.target||1))*100;return pct>=80&&pct<100;});
        if(nearGoal){const pct=((parseFloat(nearGoal.saved||0)/parseFloat(nearGoal.target))*100).toFixed(0);const rem=parseFloat(nearGoal.target)-parseFloat(nearGoal.saved||0);cards.push({icon:"🎯",color:C.accent,bg:C.accentBg,title:`${nearGoal.name} almost done!`,body:`${pct}% there — only ${fmt(rem)} left to hit your ${fmt(nearGoal.target)} goal.`});}

        if(!cards.length)return null;
        return(
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
            {cards.slice(0,2).map((c,i)=>(
              <div key={i} style={{background:c.bg,border:`1px solid ${c.color}33`,borderRadius:14,padding:"12px 14px",display:"flex",gap:10,alignItems:"flex-start"}}>
                <span style={{fontSize:18,flexShrink:0}}>{c.icon}</span>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:c.color,marginBottom:2}}>{c.title}</div>
                  <div style={{fontSize:12,color:c.color,opacity:.85,lineHeight:1.5}}>{c.body}</div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      <div style={{background:C.navy,borderRadius:18,padding:20,marginBottom:14,color:"#fff"}}>
        <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>This Month vs Last Month</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:16}}>
          <div><div style={{fontFamily:MF,fontSize:32,fontWeight:800,color:"#fff"}}>{fmt(thisTotal)}</div><div style={{fontSize:12,color:"rgba(255,255,255,.4)",marginTop:2}}>{FULL_MOS[now.getMonth()]} spending</div></div>
          <div style={{textAlign:"right"}}><div style={{fontFamily:MF,fontSize:18,fontWeight:700,color:diff>0?C.redMid:C.greenMid}}>{diff>0?"+":""}{diff.toFixed(1)}%</div><div style={{fontSize:12,color:"rgba(255,255,255,.4)"}}>vs {FULL_MOS[new Date(now.getFullYear(),now.getMonth()-1,1).getMonth()]}</div></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>{[["Daily avg",fmt(dailyAvg),C.accentMid],["Projected",fmt(projectedMonth),C.amberMid],["Last month",fmt(lastTotal),C.textFaint]].map(([l,v,c])=><div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 8px"}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2}}>{l.toUpperCase()}</div><div style={{fontFamily:MF,fontSize:13,fontWeight:700,color:c}}>{v}</div></div>)}</div>
      </div>
      {catSorted.length>0&&<div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>By Category</div><div style={{fontSize:11,color:C.textLight}}>tap to drill down 📊</div></div>
        {catSorted.map(([cat,amt],i)=>{
          const lastAmt=lastCatMap[cat]||0;
          const catDiff=lastAmt>0?((amt-lastAmt)/lastAmt*100):0;
          const isOpen=drillCat===cat;
          const catTxns=thisExp.filter(e=>e.category===cat).sort((a,b)=>new Date(b.date)-new Date(a.date));
          return(<div key={cat} style={{marginBottom:8}}>
            <div onClick={()=>setDrillCat(cat)} style={{display:"flex",justifyContent:"space-between",marginBottom:5,cursor:"pointer",padding:"6px 8px",borderRadius:10,background:"transparent",border:"1px solid transparent",transition:"background .15s"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:"50%",background:PIE_COLORS[i%PIE_COLORS.length]}}/><span style={{fontSize:13,fontWeight:600,color:C.text}}>{cat}</span><span style={{fontSize:10,color:C.textLight,fontWeight:500}}>{catTxns.length} txn{catTxns.length!==1?"s":""}</span></div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {lastAmt>0&&<span style={{fontSize:11,color:catDiff>10?C.red:catDiff<-10?C.green:C.textLight,fontWeight:600}}>{catDiff>0?"+":""}{catDiff.toFixed(0)}%</span>}
                <span style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.text}}>{fmt(amt)}</span>
                <span style={{fontSize:10,color:PIE_COLORS[i%PIE_COLORS.length],fontWeight:700}}>{isOpen?"▲":"📊"}</span>
              </div>
            </div>
            <BarProg pct={thisTotal>0?amt/thisTotal*100:0} color={PIE_COLORS[i%PIE_COLORS.length]} h={6}/>
            {isOpen&&<div style={{marginTop:8,background:C.surfaceAlt,borderRadius:12,overflow:"hidden",border:`1px solid ${C.border}`}}>
              {catTxns.slice(0,8).map((e,ei)=>(<div key={e.id||ei} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",borderBottom:ei<Math.min(catTxns.length,8)-1?`1px solid ${C.border}`:"none"}}>
                <div><div style={{fontSize:13,fontWeight:600,color:C.text}}>{e.name}</div><div style={{fontSize:11,color:C.textLight}}>{e.date}</div></div>
                <div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>{fmt(e.amount)}</div>
              </div>))}
              {catTxns.length>8&&<div style={{padding:"8px 12px",fontSize:12,color:C.textLight,textAlign:"center"}}>+{catTxns.length-8} more — see Spending tab</div>}
            </div>}
          </div>);
        })}
      </div>}
      {topMerchants.length>0&&<div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:14}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Top Merchants</div>
        {topMerchants.map(([name,amt],i)=>(
          <div key={name} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderBottom:i<topMerchants.length-1?`1px solid ${C.border}`:"none"}}>
            <div style={{width:32,height:32,borderRadius:8,background:PIE_COLORS[i%PIE_COLORS.length]+"18",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:MF,fontWeight:800,fontSize:13,color:PIE_COLORS[i%PIE_COLORS.length]}}>{i+1}</div>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:C.text}}>{name}</div><div style={{fontSize:11,color:C.textLight}}>{thisExp.filter(e=>e.name===name).length} transactions</div></div>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.red}}>{fmt(amt)}</div>
          </div>
        ))}
      </div>}
      {(()=>{
        const nameCount={};
        expenses.forEach(e=>{if(!nameCount[e.name])nameCount[e.name]={count:0,total:0,amounts:[]};nameCount[e.name].count++;nameCount[e.name].total+=parseFloat(e.amount||0);nameCount[e.name].amounts.push(parseFloat(e.amount||0));});
        const subs=Object.entries(nameCount).filter(([n,v])=>v.count>=2&&v.amounts.every(a=>Math.abs(a-v.amounts[0])<1)).map(([name,v])=>({name,amount:v.amounts[0],count:v.count,annual:v.amounts[0]*12})).sort((a,b)=>b.annual-a.annual);
        if(!subs.length)return null;
        return(<div style={{background:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:18,padding:18,marginBottom:14}}>
          <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>Detected Subscriptions</div>
          <div style={{fontSize:12,color:C.textLight,marginBottom:12}}>Recurring charges found in your expenses</div>
          {subs.map(s=>(<div key={s.name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${C.borderLight}`}}><div><div style={{fontSize:13,fontWeight:600,color:C.text}}>{s.name}</div><div style={{fontSize:11,color:C.textLight}}>{s.count}x detected - {fmt(s.annual)}/yr</div></div><div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>{fmt(s.amount)}/mo</div></div>))}
          <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,marginTop:4,borderTop:`1px solid ${C.border}`}}><span style={{fontSize:13,fontWeight:600,color:C.text}}>Total subscriptions</span><span style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.red}}>{fmt(subs.reduce((s,x)=>s+x.amount,0))}/mo</span></div>
        </div>);
      })()}
      {budgetGoals.length>0&&<div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Budget Performance</div>
        {budgetGoals.map(g=>{
          const spent=thisExp.filter(e=>e.category===g.category).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
          const pct=parseFloat(g.limit)>0?(spent/parseFloat(g.limit)*100):0;
          const over=spent>parseFloat(g.limit);
          return(<div key={g.id} style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:13,fontWeight:600,color:C.text}}>{g.category}</span><span style={{fontSize:13,fontWeight:700,color:over?C.red:C.green}}>{fmt(spent)} / {fmt(g.limit)}</span></div>
            <BarProg pct={pct} color={over?C.red:pct>80?C.amber:C.green} h={6}/>
            {over&&<div style={{fontSize:11,color:C.red,marginTop:3,fontWeight:500}}>Over by {fmt(spent-parseFloat(g.limit))}</div>}
          </div>);
        })}
      </div>}
      {catSorted.length>0&&<div style={{background:C.surface,borderRadius:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"14px 14px 6px",marginBottom:14}}><div style={{fontSize:12,fontWeight:600,color:C.textLight,marginBottom:12}}>Top Spending This Month</div><ResponsiveContainer width="100%" height={Math.min(catSorted.length*38+20,220)}><BarChart data={catSorted.slice(0,5)} layout="vertical" barSize={16} margin={{left:4,right:50}}><XAxis type="number" hide/><YAxis type="category" dataKey="name" tick={{fontSize:11,fill:C.textMid}} width={80} axisLine={false} tickLine={false}/><Tooltip formatter={v=>[fmt(v),"Spent"]} contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,fontSize:12}}/><Bar dataKey="amt" radius={[0,6,6,0]}>{catSorted.slice(0,5).map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}</Bar></BarChart></ResponsiveContainer></div>}

      {/* 6-month spending trend */}
      {(()=>{
        const months=Array.from({length:6},(_,i)=>{
          const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);
          const ms=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
          const total=expenses.filter(e=>e.date?.startsWith(ms)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
          const cats=expenses.filter(e=>e.date?.startsWith(ms)).reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount)||0);return a},{});
          return{month:FULL_MOS[d.getMonth()].slice(0,3),total,cats,isCurrent:i===5};
        });
        if(!months.some(m=>m.total>0))return null;
        const maxVal=Math.max(...months.map(m=>m.total))||1;
        const avgSpend=months.filter(m=>m.total>0).reduce((s,m)=>s+m.total,0)/Math.max(1,months.filter(m=>m.total>0).length);
        return(
          <div style={{background:C.surface,borderRadius:18,padding:18,marginBottom:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
              <div>
                <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>6-Month Trend</div>
                <div style={{fontSize:12,color:C.textLight,marginTop:2}}>Avg: {fmt(avgSpend)}/mo</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:11,color:thisTotal>avgSpend?C.red:C.green,fontWeight:700,background:thisTotal>avgSpend?C.redBg:C.greenBg,borderRadius:99,padding:"2px 8px"}}>
                  {thisTotal>avgSpend?"↑ "+((thisTotal-avgSpend)/avgSpend*100).toFixed(0)+"% above avg":"↓ "+((avgSpend-thisTotal)/avgSpend*100).toFixed(0)+"% below avg"}
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={months} margin={{left:-10,right:4,top:4,bottom:0}} barSize={28}>
                <XAxis dataKey="month" tick={{fill:C.textLight,fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v>=1000?(v/1000).toFixed(0)+"k":v)} width={40}/>
                <Tooltip formatter={v=>[fmt(v),"Spent"]} contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,fontSize:12}}/>
                <Bar dataKey="total" radius={[5,5,0,0]}>{months.map((m,i)=><Cell key={i} fill={m.isCurrent?C.accent:m.total>avgSpend?C.red+"88":C.accent+"55"}/>)}</Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{display:"flex",gap:12,marginTop:8,fontSize:11,color:C.textLight,justifyContent:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:8,height:8,borderRadius:2,background:C.accent}}/> Current</div>
              <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:8,height:8,borderRadius:2,background:C.red+"88"}}/> Above average</div>
              <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:8,height:8,borderRadius:2,background:C.accent+"55"}}/> Below average</div>
            </div>
          </div>
        );
      })()}

      {/* Spending by day of week */}
      {expenses.length>=3&&(()=>{
        const DAYS=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
        const DAYS_SHORT=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
        const dow=Array.from({length:7},(_,d)=>{
          const exps=expenses.filter(e=>new Date((e.date||"")+"T00:00:00").getDay()===d);
          const total=exps.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
          const count=exps.length;
          return{day:DAYS_SHORT[d],total,count,avg:count>0?total/count:0};
        });
        const maxTotal=Math.max(...dow.map(d=>d.total))||1;
        const topDay=dow.reduce((a,b)=>a.total>b.total?a:b);
        return(
          <div style={{background:C.surface,borderRadius:18,padding:18,marginBottom:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)"}}>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>Spending by Day of Week</div>
            <div style={{fontSize:12,color:C.textLight,marginBottom:14}}>{topDay.day} is your biggest spending day — {fmt(topDay.total)} total</div>
            <div style={{display:"flex",gap:4,alignItems:"flex-end",height:90,marginBottom:8}}>
              {dow.map(({day,total,count,avg})=>{
                const h=Math.max(6,Math.round((total/maxTotal)*80));
                const isTop=total===Math.max(...dow.map(d=>d.total));
                return(
                  <div key={day} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                    <div style={{width:"100%",height:h,background:isTop?`linear-gradient(180deg,${C.accent},${C.purple})`:C.accentBg,borderRadius:"4px 4px 0 0",transition:"height .4s"}}/>
                    <div style={{fontSize:9,color:isTop?C.accent:C.textLight,fontWeight:isTop?700:400,lineHeight:1.2,textAlign:"center"}}>{day}</div>
                    <div style={{fontSize:8,color:C.textFaint,fontWeight:500}}>{count>0?fmt(avg).replace(".00",""):"—"}</div>
                  </div>
                );
              })}
            </div>
            <div style={{fontSize:10,color:C.textLight,textAlign:"center",marginTop:2}}>avg per visit shown below each bar</div>
          </div>
        );
      })()}

      {/* Spending velocity — how fast are you spending this month */}
      {thisTotal>0&&(()=>{
        const daysGone=now.getDate();
        const daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
        const daysLeft=daysInMonth-daysGone;
        const dailyRate=thisTotal/daysGone;
        const projected=dailyRate*daysInMonth;
        const paceVsLast=lastTotal>0?projected/lastTotal:null;
        const weeklyData=Array.from({length:Math.ceil(daysGone/7)},(_,w)=>{
          const start=w*7+1,end=Math.min((w+1)*7,daysGone);
          const wTotal=thisExp.filter(e=>{const d=parseInt((e.date||"").split("-")[2]||0);return d>=start&&d<=end;}).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
          return{week:"Wk "+(w+1),total:wTotal,days:end-start+1};
        });
        return(
          <div style={{background:C.surface,borderRadius:18,padding:18,marginBottom:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)"}}>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Spending Velocity</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
              {[
                ["Daily Rate",fmt(dailyRate)+"/day",dailyRate>thisTotal/daysInMonth*1.2?C.red:C.green],
                ["Projected",fmt(projected),projected>ti?C.red:projected>ti*.8?C.amber:C.green],
                ["Days Left",daysLeft+" days",C.textMid],
              ].map(([l,v,c])=>(
                <div key={l} style={{background:C.surfaceAlt,borderRadius:12,padding:"10px 12px",textAlign:"center"}}>
                  <div style={{fontSize:10,color:C.textLight,fontWeight:600,marginBottom:3,textTransform:"uppercase"}}>{l}</div>
                  <div style={{fontFamily:MF,fontWeight:800,fontSize:14,color:c}}>{v}</div>
                </div>
              ))}
            </div>
            {weeklyData.length>1&&<><div style={{fontSize:11,color:C.textLight,marginBottom:8}}>Weekly breakdown</div>
            <div style={{display:"flex",gap:6,alignItems:"flex-end",height:50}}>
              {weeklyData.map(({week,total,days},i)=>{
                const maxW=Math.max(...weeklyData.map(w=>w.total))||1;
                const h=Math.max(4,Math.round((total/maxW)*44));
                const dailyW=total/days;
                return(
                  <div key={week} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                    <div style={{fontSize:9,color:C.textFaint}}>{fmt(dailyW).replace("$","$").replace(".00","")}/d</div>
                    <div style={{width:"100%",height:h,background:i===weeklyData.length-1?C.accent:C.accentBg,borderRadius:"3px 3px 0 0"}}/>
                    <div style={{fontSize:9,color:C.textLight}}>{week}</div>
                  </div>
                );
              })}
            </div></>}
            {paceVsLast&&<div style={{marginTop:12,padding:"10px 14px",borderRadius:10,background:paceVsLast>1.1?C.redBg:paceVsLast<0.9?C.greenBg:C.accentBg,border:`1px solid ${paceVsLast>1.1?C.redMid:paceVsLast<0.9?C.greenMid:C.accentMid}`,fontSize:12,color:paceVsLast>1.1?C.red:paceVsLast<0.9?C.green:C.accent,fontWeight:500}}>
              {paceVsLast>1.1?"⚠️ Spending "+((paceVsLast-1)*100).toFixed(0)+"% faster than last month":paceVsLast<0.9?"✅ Spending "+((1-paceVsLast)*100).toFixed(0)+"% slower than last month":"📊 On pace with last month"}
            </div>}
          </div>
        );
      })()}
    </div>
  );
}

function PaycheckView({bills,income,setIncome,expenses,accounts,budgetGoals=[],onAdd}){
  const now=new Date();
  const ti=(parseFloat(income.primary||0)*(income.payFrequency==="Weekly"?4.33:income.payFrequency==="Twice Monthly"?2:income.payFrequency==="Monthly"?1:2.17))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const checking=parseFloat(accounts.checking||0);
  const payFreq=income.payFrequency||"Biweekly";
  // Pay per period based on frequency
  const payPerPeriod=payFreq==="Weekly"?ti/4.33:payFreq==="Biweekly"?ti/2:payFreq==="Twice Monthly"?ti/2:ti;
  const payPeriodLabel=payFreq==="Weekly"?"weekly":payFreq==="Biweekly"?"biweekly":payFreq==="Twice Monthly"?"semi-monthly":"monthly";
  // Next payday — uses lastPayDate anchor if set, else freq-based estimate
  const today=now.getDate();
  let nextPay,daysUntilPay;
  if(income.lastPayDate){
    const last=new Date(income.lastPayDate+"T00:00:00");
    const nxt=new Date(last);let safety=0;
    while(nxt<=now&&safety<60){
      if(payFreq==="Weekly")nxt.setDate(nxt.getDate()+7);
      else if(payFreq==="Twice Monthly"){nxt.getDate()<15?nxt.setDate(15):nxt.setMonth(nxt.getMonth()+1,1);}
      else if(payFreq==="Monthly")nxt.setMonth(nxt.getMonth()+1);
      else nxt.setDate(nxt.getDate()+14);
      safety++;
    }
    nextPay=nxt;daysUntilPay=Math.max(0,Math.ceil((nxt-now)/86400000));
  }else if(payFreq==="Twice Monthly"){
    if(today<15){nextPay=new Date(now.getFullYear(),now.getMonth(),15);daysUntilPay=15-today;}
    else{nextPay=new Date(now.getFullYear(),now.getMonth()+1,1);daysUntilPay=new Date(now.getFullYear(),now.getMonth()+1,0).getDate()-today+1;}
  }else if(payFreq==="Monthly"){
    nextPay=new Date(now.getFullYear(),now.getMonth()+1,1);daysUntilPay=new Date(now.getFullYear(),now.getMonth()+1,0).getDate()-today+1;
  }else if(payFreq==="Weekly"){
    nextPay=new Date(now);nextPay.setDate(now.getDate()+7);daysUntilPay=7;
  }else{
    nextPay=new Date(now);nextPay.setDate(now.getDate()+14);daysUntilPay=14;
  }
  const billsBeforePay=bills.filter(b=>{if(b.paid)return false;const d=new Date(b.dueDate+"T00:00:00");return d<=nextPay;});
  const beforeTotal=billsBeforePay.reduce((s,b)=>s+(parseFloat(b.amount)||0),0);
  const thisMs=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
  const spentSoFar=expenses.filter(e=>e.date?.startsWith(thisMs)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const mSpent=spentSoFar;const _pvMult=income.payFrequency==="Weekly"?4.33:income.payFrequency==="Twice Monthly"?2:income.payFrequency==="Monthly"?1:2.17;const ti2=(parseFloat(income.primary||0)*_pvMult)+(parseFloat(income.other||0));
  const dailyBurn=spentSoFar/Math.max(1,today);
  const projectedSpend=dailyBurn*daysUntilPay;
  // Match AppInner sts formula: checking + other income - bills before pay - projected - envelopes - buffer
  const _pvOtherMonthly=(parseFloat(income.other||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const _pvOtherProRated=_pvOtherMonthly*(daysUntilPay/30);
  const _pvEnvMs=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
  const _pvEnvReserve=budgetGoals.reduce((s,g)=>{
    const lim=parseFloat(g.limit||0);if(!lim)return s;
    const spentG=expenses.filter(e=>e.category===g.category&&(e.date||"").startsWith(_pvEnvMs)).reduce((a,e)=>a+(parseFloat(e.amount)||0),0);
    return s+(Math.max(0,lim-spentG)*Math.min(1,daysUntilPay/30));
  },0);
  const[editSched,setEditSched]=useState(false);
  const[localFreq,setLocalFreq]=useState(()=>income.payFrequency||"Biweekly");
  const[localDate,setLocalDate]=useState(()=>income.lastPayDate||"");
  const safeToSpend=Math.max(0,checking+_pvOtherProRated-beforeTotal-projectedSpend-_pvEnvReserve-200);
  return(
    <div className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.3}}>Paycheck Planner</div>
        <button className="ba" onClick={onAdd} style={{display:"flex",alignItems:"center",gap:5,background:C.accent,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer"}}><Plus size={13}/>Log Spending</button>
      </div>
      {(()=>{
        return(<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:editSched?10:16}}>
            <div style={{fontSize:13,color:C.textLight}}>
              {income.lastPayDate?<span>📅 Anchored to {new Date(income.lastPayDate+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>:<span>Plan your spending around your next paycheck</span>}
            </div>
            <button onClick={()=>setEditSched(e=>!e)} style={{background:C.surfaceAlt,border:`1px solid ${C.border}`,borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:700,color:C.textMid,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
              ⚙️ Pay Schedule
            </button>
          </div>
          {editSched&&<div style={{background:C.surface,border:`1.5px solid ${C.accentMid}`,borderRadius:14,padding:16,marginBottom:16}}>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.text,marginBottom:12}}>Pay Schedule</div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:700,color:C.textLight,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Frequency</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {["Weekly","Biweekly","Twice Monthly","Monthly"].map(f=>(
                  <button key={f} onClick={()=>setLocalFreq(f)} style={{padding:"6px 11px",borderRadius:99,border:`1.5px solid ${localFreq===f?C.accent:C.border}`,background:localFreq===f?C.accentBg:"transparent",fontSize:12,fontWeight:localFreq===f?700:500,color:localFreq===f?C.accent:C.textMid,cursor:"pointer"}}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:C.textLight,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Last Payday Date</div>
              <input type="date" value={localDate} onChange={e=>setLocalDate(e.target.value)}
                style={{width:"100%",background:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"10px 12px",fontSize:14,color:C.text,outline:"none",boxSizing:"border-box"}}/>
              <div style={{fontSize:11,color:C.textLight,marginTop:4}}>The app will calculate your exact next payday from this anchor date</div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{setIncome(p=>({...p,payFrequency:localFreq,lastPayDate:localDate}));setEditSched(false);}} style={{flex:1,padding:"10px",borderRadius:12,background:C.accent,border:"none",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>Save Schedule</button>
              <button onClick={()=>setEditSched(false)} style={{padding:"10px 14px",borderRadius:12,background:C.bg,border:`1px solid ${C.border}`,color:C.textMid,fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancel</button>
            </div>
          </div>}
        </>);
      })()}
      <div style={{background:`linear-gradient(135deg,${C.navy} 0%,${C.navyMid} 50%,${C.accent} 100%)`,borderRadius:18,padding:20,marginBottom:14,color:"#fff"}}>
        <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Next Payday</div>
        <div style={{fontFamily:MF,fontSize:32,fontWeight:800,color:"#fff",marginBottom:4}}>{daysUntilPay===0?"Today!":daysUntilPay+" days"}</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,.5)",marginBottom:16}}>{nextPay.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>{[["Expected "+payPeriodLabel,fmt(payPerPeriod),C.greenMid],["Bills due",fmt(beforeTotal),C.redMid],["Safe to spend",fmt(safeToSpend),safeToSpend>500?C.greenMid:safeToSpend>0?C.amberMid:C.redMid]].map(([l,v,c])=><div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 8px"}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2}}>{l.toUpperCase()}</div><div style={{fontFamily:MF,fontSize:13,fontWeight:700,color:c}}>{v}</div></div>)}</div>
      </div>
      <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:12}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>Bills Before Payday</div>
        <div style={{fontSize:12,color:C.textLight,marginBottom:12}}>Due before {nextPay.toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>
      <div style={{background:C.surface,borderRadius:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"12px 14px",marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{fontSize:12,fontWeight:600,color:C.textLight}}>Spending So Far This Month</div><div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>-{fmt(mSpent)}</div></div><BarProg pct={ti2>0?Math.min(100,mSpent/ti2*100):0} color={mSpent>ti2*0.8?C.red:mSpent>ti2*0.5?C.amber:C.green} h={8}/><div style={{display:"flex",justifyContent:"space-between",marginTop:6}}><span style={{fontSize:11,color:C.textLight}}>{ti2>0?Math.round(mSpent/ti2*100):0}% of income</span><span style={{fontSize:11,color:C.green}}>{fmt(Math.max(0,ti2-mSpent))} left</span></div></div>
        {billsBeforePay.length===0?<div style={{fontSize:13,color:C.green,fontWeight:500}}>✅ No bills due before payday</div>:billsBeforePay.map(b=>{const d=dueIn(b.dueDate);const col=d<0?C.red:d<=3?C.red:d<=7?C.amber:C.textLight;return(<div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${C.border}`}}><div><div style={{fontSize:13,fontWeight:600,color:C.text}}>{b.name}</div><div style={{fontSize:11,color:col,fontWeight:500}}>{d<0?Math.abs(d)+"d overdue":d===0?"Today":d+"d left"}</div></div><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:col}}>{fmt(b.amount)}</div></div>);})}
        {billsBeforePay.length>0&&<div style={{display:"flex",justifyContent:"space-between",paddingTop:10,marginTop:4,borderTop:`1px solid ${C.border}`}}><span style={{fontSize:13,fontWeight:600,color:C.text}}>Total</span><span style={{fontFamily:MF,fontWeight:800,fontSize:16,color:C.red}}>{fmt(beforeTotal)}</span></div>}
      </div>
      <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:12}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:12}}>Projected Spending</div>
        {[["Daily burn rate",fmt(dailyBurn)+"/day",C.textMid],["Days until pay",String(daysUntilPay)+" days",C.textMid],["Projected spend",fmt(projectedSpend),projectedSpend>payPerPeriod?C.red:C.amber],["Checking balance",fmt(checking),C.green],["Bills due","-"+fmt(beforeTotal),C.red],["Safe to spend",fmt(safeToSpend),safeToSpend>500?C.green:safeToSpend>0?C.amber:C.red]].map(([l,v,c])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:13,color:C.textMid}}>{l}</span><span style={{fontFamily:MF,fontWeight:700,fontSize:13,color:c}}>{v}</span></div>)}
      </div>
      {budgetGoals.length>0&&(()=>{
        const thisMs=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
        const envelopes=budgetGoals.map(g=>{
          const lim=parseFloat(g.limit||0);
          const reserve=lim*(Math.min(1,daysUntilPay/30));
          return{...g,lim,reserve};
        }).filter(g=>g.lim>0);
        if(!envelopes.length)return null;
        const totalReserve=envelopes.reduce((s,g)=>s+g.reserve,0);
        return(
          <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Envelope Reserves</div>
              <div style={{fontSize:12,color:C.purple,fontWeight:700,background:C.purpleBg,borderRadius:99,padding:"2px 8px"}}>{fmt(totalReserve)} reserved</div>
            </div>
            <div style={{fontSize:12,color:C.textLight,marginBottom:12}}>Variable budget portions reserved until payday</div>
            {envelopes.map(g=>(
              <div key={g.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${C.borderLight}`}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:C.text}}>{g.category}</div>
                  {g.note&&<div style={{fontSize:11,color:C.textLight}}>{g.note}</div>}
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.purple}}>{fmt(g.reserve)}</div>
                  <div style={{fontSize:10,color:C.textFaint}}>{fmt(g.lim)}/mo budget</div>
                </div>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,marginTop:4,borderTop:`1px solid ${C.border}`}}>
              <span style={{fontSize:13,fontWeight:600,color:C.text}}>Total reserved</span>
              <span style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.purple}}>{fmt(totalReserve)}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function NetWorthTrendView({balHist,debts,accounts,onNavigate}){
  const[nwGoal,setNwGoal]=useState(()=>{try{const v=localStorage.getItem("fv_nwgoal");return v?JSON.parse(v):null;}catch{return null;}});
  const[showGoalInput,setShowGoalInput]=useState(false);
  const[goalInput,setGoalInput]=useState("");
  function saveGoal(){const v=parseFloat(goalInput);if(v>0){const g={target:v,date:goalInput+"",created:Date.now()};localStorage.setItem("fv_nwgoal",JSON.stringify(g));setNwGoal(g);setShowGoalInput(false);}}

  const totalDebt=debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0);
  const totalOriginal=debts.reduce((s,d)=>s+(parseFloat(d.original||d.balance||0)),0);
  const totalPaidDown=Math.max(0,totalOriginal-totalDebt);
  const overallPct=totalOriginal>0?Math.round(totalPaidDown/totalOriginal*100):0;
  const totalAssets=(parseFloat(accounts.checking||0))+(parseFloat(accounts.savings||0))+(parseFloat(accounts.cushion||0))+(parseFloat(accounts.investments||0))+(parseFloat(accounts.k401||0))+(parseFloat(accounts.roth_ira||0))+(parseFloat(accounts.brokerage||0))+(parseFloat(accounts.crypto||0))+(parseFloat(accounts.hsa||0))+(parseFloat(accounts.property||0))+(parseFloat(accounts.vehicles||0));
  const currentNW=totalAssets-totalDebt;
  const chartData=balHist.map(h=>({date:h.date,assets:(h.checking||0)+(h.savings||0)+(h.cushion||0)+(h.investments||0)+(h.k401||0)+(h.roth_ira||0)+(h.brokerage||0)+(h.crypto||0),netWorth:((h.checking||0)+(h.savings||0)+(h.cushion||0)+(h.investments||0)+(h.k401||0)+(h.roth_ira||0)+(h.brokerage||0)+(h.crypto||0))-totalDebt})).slice(-52);
  const firstNW=chartData[0]?.netWorth||currentNW;
  const change=currentNW-firstNW;
  const fD=s=>{if(!s)return"";const d=new Date(s+"T00:00:00");return FULL_MOS[d.getMonth()]+" "+d.getDate();};
  const TT=({active,payload,label})=>{if(!active||!payload?.length)return null;return(<div style={{background:C.surface,borderRadius:12,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"10px 14px",fontSize:12}}><div style={{fontWeight:700,marginBottom:6}}>{fD(label)}</div>{payload.map(p=><div key={p.dataKey} style={{display:"flex",justifyContent:"space-between",gap:16,marginBottom:2}}><span style={{color:C.textLight}}>{p.name}</span><span style={{fontWeight:700}}>{fmt(p.value)}</span></div>)}</div>);};
  return(
    <div className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.3}}>Net Worth Trend</div>
        <button className="ba" onClick={()=>onNavigate("accounts")} style={{display:"flex",alignItems:"center",gap:5,background:C.accent,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer"}}><Plus size={13}/>Update</button>
      </div>
      <div style={{fontSize:13,color:C.textLight,marginBottom:16}}>Track your wealth over time</div>
      <div style={{background:`linear-gradient(135deg,${C.navy} 0%,${C.navyLight} 60%,${C.accent} 100%)`,borderRadius:18,padding:20,marginBottom:14,color:"#fff"}}>
        <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Current Net Worth</div>
        <div style={{fontFamily:MF,fontSize:36,fontWeight:800,color:currentNW>=0?C.green:C.red,lineHeight:1,marginBottom:8}}>{fmt(currentNW)}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>{[["Assets",fmt(totalAssets),C.greenMid],["Debt",fmt(totalDebt),C.redMid],["Change",`${change>=0?"+":""}${fmt(change)}`,change>=0?C.greenMid:C.redMid]].map(([l,v,c])=><div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 8px"}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2}}>{l.toUpperCase()}</div><div style={{fontFamily:MF,fontSize:12,fontWeight:700,color:c}}>{v}</div></div>)}</div>
      </div>
      {chartData.length>1?<div style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"18px 4px 12px",marginBottom:14}}>
        <div style={{paddingLeft:16,marginBottom:12,display:"flex",gap:16}}>{[[C.green,"Net Worth"],[C.accent,"Assets"]].map(([c,l])=><div key={l} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:10,borderRadius:3,background:c}}/><span style={{fontSize:12,color:C.textLight}}>{l}</span></div>)}</div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{left:8,right:8,top:4,bottom:0}}>
            <defs>
              <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.green} stopOpacity={.2}/><stop offset="95%" stopColor={C.green} stopOpacity={0}/></linearGradient>
              <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.accent} stopOpacity={.15}/><stop offset="95%" stopColor={C.accent} stopOpacity={0}/></linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={fD} interval="preserveStartEnd"/>
            <YAxis tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v>=1000?(v/1000).toFixed(0)+"k":v)} width={50}/>
            <Tooltip content={<TT/>}/>
            <Area type="monotone" dataKey="assets" name="Assets" stroke={C.accent} strokeWidth={2} fill="url(#aGrad)" dot={false}/>
            <Area type="monotone" dataKey="netWorth" name="Net Worth" stroke={C.green} strokeWidth={2.5} fill="url(#nwGrad)" dot={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>:<div style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:32,textAlign:"center",marginBottom:14}}><div style={{fontSize:32,marginBottom:10}}>📈</div><div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:4}}>Building your trend</div><div style={{fontSize:13,color:C.textLight}}>Update your balances regularly to see your net worth grow over time.</div></div>}
      {debts.length>0&&(()=>{
        // Liability vs asset breakdown stacked bar
        const assetBreakdown=[
          {name:"Liquid",value:parseFloat(accounts.checking||0)+parseFloat(accounts.savings||0)+parseFloat(accounts.cushion||0),color:C.teal},
          {name:"401k",value:parseFloat(accounts.k401||0),color:C.accent},
          {name:"Roth IRA",value:parseFloat(accounts.roth_ira||0),color:C.green},
          {name:"Brokerage",value:parseFloat(accounts.brokerage||0),color:"#06b6d4"},
          {name:"Crypto",value:parseFloat(accounts.crypto||0),color:C.amber},
          {name:"HSA",value:parseFloat(accounts.hsa||0),color:C.purple},
          {name:"Investments",value:parseFloat(accounts.investments||0),color:"#8b5cf6"},
          {name:"Property",value:parseFloat(accounts.property||0)+parseFloat(accounts.vehicles||0),color:"#64748b"},
        ].filter(a=>a.value>0);
        const debtBreakdown=debts.map((d,i)=>({name:d.name,value:parseFloat(d.balance||0),type:d.type||"Debt",color:["#ef4444","#f97316","#eab308","#ec4899","#f43f5e"][i%5]})).filter(d=>d.value>0);
        const maxBar=Math.max(totalAssets,totalDebt,1);
        return(
          <div style={{background:C.surface,borderRadius:18,padding:18,marginBottom:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)"}}>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Assets vs Liabilities</div>
            {/* Assets bar */}
            <div style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <span style={{fontSize:12,fontWeight:600,color:C.green}}>Assets</span>
                <span style={{fontFamily:MF,fontWeight:700,fontSize:12,color:C.green}}>{fmt(totalAssets)}</span>
              </div>
              <div style={{display:"flex",height:20,borderRadius:10,overflow:"hidden",gap:1}}>
                {assetBreakdown.map(a=>(
                  <div key={a.name} style={{width:((a.value/totalAssets)*100).toFixed(1)+"%",background:a.color,minWidth:a.value>0?4:0,transition:"width .4s"}}
                    title={a.name+": "+fmt(a.value)}/>
                ))}
              </div>
              <div style={{display:"flex",gap:8,marginTop:5,flexWrap:"wrap"}}>
                {assetBreakdown.map(a=>(<div key={a.name} style={{display:"flex",alignItems:"center",gap:3,fontSize:10,color:C.textLight}}>
                  <div style={{width:7,height:7,borderRadius:2,background:a.color}}/>{a.name} {fmt(a.value)}
                </div>))}
              </div>
            </div>
            {/* Debt bar */}
            <div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <span style={{fontSize:12,fontWeight:600,color:C.red}}>Liabilities</span>
                <span style={{fontFamily:MF,fontWeight:700,fontSize:12,color:C.red}}>{fmt(totalDebt)}</span>
              </div>
              <div style={{display:"flex",height:20,borderRadius:10,overflow:"hidden",gap:1}}>
                {debtBreakdown.map(d=>(
                  <div key={d.name} style={{width:((d.value/totalDebt)*100).toFixed(1)+"%",background:d.color,minWidth:d.value>0?4:0,transition:"width .4s"}}
                    title={d.name+": "+fmt(d.value)}/>
                ))}
              </div>
              <div style={{display:"flex",gap:8,marginTop:5,flexWrap:"wrap"}}>
                {debtBreakdown.map(d=>(<div key={d.name} style={{display:"flex",alignItems:"center",gap:3,fontSize:10,color:C.textLight}}>
                  <div style={{width:7,height:7,borderRadius:2,background:d.color}}/>{d.name} {fmt(d.value)}
                </div>))}
              </div>
            </div>
            {/* Net bar */}
            <div style={{marginTop:14,paddingTop:12,borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:12,fontWeight:700,color:C.text}}>Net Worth</span>
              <span style={{fontFamily:MF,fontWeight:800,fontSize:16,color:currentNW>=0?C.green:C.red}}>{currentNW>=0?"+":""}{fmt(currentNW)}</span>
            </div>
          </div>
        );
      })()}
      {nwGoal&&(()=>{const pct=Math.min(100,Math.max(0,(currentNW/nwGoal.target)*100));const rem=Math.max(0,nwGoal.target-currentNW);return(<div style={{background:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:16,padding:18,marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Net Worth Goal</div><div style={{display:"flex",gap:8,alignItems:"center"}}><div style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.accent}}>{fmt(nwGoal.target)}</div><button onClick={()=>{setNwGoal(null);localStorage.removeItem("fv_nwgoal");}} style={{background:"none",border:"none",cursor:"pointer",color:C.textFaint,padding:2}}><X size={13}/></button></div></div><div style={{height:10,background:C.borderLight,borderRadius:99,overflow:"hidden",marginBottom:8}}><div style={{height:"100%",width:pct.toFixed(1)+"%",background:pct>=100?C.green:`linear-gradient(90deg,${C.accent},${C.green})`,borderRadius:99,transition:"width .6s"}}/></div><div style={{display:"flex",justifyContent:"space-between",fontSize:12}}><span style={{color:C.textLight}}>{pct.toFixed(1)}% there · {fmt(currentNW)} now</span><span style={{fontWeight:600,color:pct>=100?C.green:C.text}}>{pct>=100?"🎉 Goal reached!":fmt(rem)+" to go"}</span></div></div>);})()}
      {!nwGoal&&<button onClick={()=>setShowGoalInput(true)} style={{width:"100%",background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"11px 0",color:C.accent,fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:14}}>🎯 Set a Net Worth Goal</button>}
      {showGoalInput&&<div style={{background:C.surface,border:`1px solid ${C.accentMid}`,borderRadius:14,padding:16,marginBottom:14}}><div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:8}}>Target Net Worth</div><div style={{display:"flex",gap:8}}><input type="number" autoFocus placeholder="100000" value={goalInput} onChange={e=>setGoalInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveGoal()} style={{flex:1,background:C.surfaceAlt,border:`1.5px solid ${C.accent}`,borderRadius:10,padding:"10px 13px",fontSize:14,color:C.text,outline:"none"}}/><button onClick={saveGoal} style={{background:C.accent,border:"none",borderRadius:10,padding:"0 16px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>Set</button><button onClick={()=>setShowGoalInput(false)} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"0 12px",color:C.textMid,fontWeight:600,fontSize:13,cursor:"pointer"}}>✕</button></div></div>}
      {(()=>{
        const MILESTONES=[1000,5000,10000,25000,50000,100000,250000,500000,1000000];
        const achieved=MILESTONES.filter(m=>currentNW>=m);
        const next=MILESTONES.find(m=>currentNW<m);
        const prev=achieved[achieved.length-1]||0;
        const pct=next?Math.min(100,((currentNW-prev)/(next-prev))*100):100;
        return(
          <div style={{background:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:18,padding:18,marginBottom:14}}>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Net Worth Milestones</div>
            {next&&<div style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:13,color:C.textMid}}>Next milestone</span><span style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.accent}}>{fmt(next)}</span></div>
              <div style={{height:10,background:C.borderLight,borderRadius:99,overflow:"hidden",marginBottom:4}}><div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${C.accent},${C.green})`,borderRadius:99,transition:"width .6s"}}/></div>
              <div style={{fontSize:11,color:C.textFaint}}>{fmt(Math.max(0,next-currentNW))} to go - {pct.toFixed(1)}% there</div>
            </div>}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {MILESTONES.map(m=>{const done=currentNW>=m;return(<div key={m} style={{padding:"10px 8px",borderRadius:12,background:done?C.greenBg:C.surfaceAlt,border:`1.5px solid ${done?C.greenMid:C.borderLight}`,textAlign:"center"}}><div style={{fontSize:done?16:14,marginBottom:2}}>{done?"✅":"🔒"}</div><div style={{fontFamily:MF,fontWeight:700,fontSize:11,color:done?C.green:C.textFaint}}>{m>=1000000?"$1M":m>=1000?"$"+(m/1000).toFixed(0)+"k":"$"+m}</div></div>);})}
            </div>
          </div>
        );
      })()}
      <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:12}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Asset Breakdown</div>
        {[{l:"Checking",v:accounts.checking,ic:"🏦"},{l:"Savings",v:accounts.savings,ic:"💰"},{l:"Cushion",v:accounts.cushion,ic:"🛡️"},{l:"Investments",v:accounts.investments,ic:"📈"},{l:"Property",v:accounts.property,ic:"🏠"},{l:"Vehicles",v:accounts.vehicles,ic:"🚗"}].filter(a=>parseFloat(a.v||0)>0).map(a=>{
          const val=parseFloat(a.v||0);const pct=totalAssets>0?(val/totalAssets*100):0;
          return(<div key={a.l} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><div style={{display:"flex",alignItems:"center",gap:6}}><span>{a.ic}</span><span style={{fontSize:13,fontWeight:600,color:C.text}}>{a.l}</span></div><div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:12,color:C.textLight}}>{pct.toFixed(0)}%</span><span style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.green}}>{fmt(val)}</span></div></div><BarProg pct={pct} color={C.green} h={5}/></div>);
        })}
        {totalAssets===0&&<div style={{fontSize:13,color:C.textLight,textAlign:"center",padding:"12px 0"}}>Add account balances in Settings to see your asset breakdown</div>}
      </div>
      {totalDebt>0&&(
        <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:12}}>
          <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>Liability Breakdown</div>
          <div style={{fontSize:12,color:C.textLight,marginBottom:14}}>What you owe — {debts.length} debt{debts.length!==1?"s":""}</div>
          {debts.map((d,i)=>{
            const bal=parseFloat(d.balance||0);
            const pct=totalDebt>0?(bal/totalDebt*100):0;
            const minPay=parseFloat(d.minPayment||0);
            const rate=parseFloat(d.rate||0);
            const monthlyInt=bal*(rate/100/12);
            return(
              <div key={d.id} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:PIE_COLORS[i%PIE_COLORS.length]}}/>
                    <span style={{fontSize:13,fontWeight:600,color:C.text}}>{d.name}</span>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <span style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>{fmt(bal)}</span>
                    {rate>0&&<span style={{fontSize:11,color:C.textLight,marginLeft:6}}>{rate}% APR</span>}
                  </div>
                </div>
                <BarProg pct={pct} color={PIE_COLORS[i%PIE_COLORS.length]} h={5}/>
                {(minPay>0||monthlyInt>0)&&<div style={{display:"flex",gap:12,marginTop:4,fontSize:11,color:C.textLight}}>
                  {minPay>0&&<span>Min: {fmt(minPay)}/mo</span>}
                  {monthlyInt>0&&<span style={{color:C.red}}>Interest: {fmt(monthlyInt)}/mo</span>}
                </div>}
              </div>
            );
          })}
          <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,marginTop:4,borderTop:`1px solid ${C.border}`}}>
            <span style={{fontSize:13,fontWeight:600,color:C.text}}>Total debt</span>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.red}}>{fmt(totalDebt)}</div>
              <div style={{fontSize:11,color:C.textLight}}>= {totalAssets>0?((totalDebt/totalAssets)*100).toFixed(0):100}% of assets</div>
            </div>
          </div>
        </div>
      )}

      {/* ── HYSA / Yield Calculator ─────────────────────────── */}
      <div style={{background:C.surface,borderRadius:18,padding:18,marginTop:14,boxShadow:"0 1px 3px rgba(10,22,40,.06)"}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:15,color:C.text,marginBottom:4}}>💰 Money Growth Calculator</div>
        <div style={{fontSize:12,color:C.textLight,marginBottom:14}}>What your balances earn at different rates</div>
        {(()=>{
          const liquid=(parseFloat(accounts.checking||0))+(parseFloat(accounts.savings||0))+(parseFloat(accounts.cushion||0));
          const SCENARIOS=[
            {label:"Traditional Savings",rate:0.5,icon:"🏦",desc:"Big bank",highlight:false},
            {label:"High-Yield Savings",rate:4.75,icon:"⚡",desc:"HYSA / online bank",highlight:true},
            {label:"Money Market",rate:5.1,icon:"📊",desc:"Money market fund",highlight:true},
            {label:"6-Month CD",rate:5.25,icon:"🔒",desc:"Certificate of deposit",highlight:true},
            {label:"S&P 500 avg",rate:10.0,icon:"📈",desc:"Historical avg, not guaranteed",highlight:false},
          ];
          if(liquid<=0)return(<div style={{fontSize:13,color:C.textLight,textAlign:"center",padding:"12px 0"}}>Add liquid balances to see projections</div>);
          return(
            <div>
              <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:10,padding:"9px 14px",marginBottom:12,fontSize:13,color:C.accent}}>
                Liquid balance: <strong style={{fontFamily:MF}}>{fmt(liquid)}</strong>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {SCENARIOS.map(s=>{
                  const yr1=liquid*(s.rate/100);
                  const yr5=liquid*(Math.pow(1+s.rate/100,5)-1);
                  const yr10=liquid*(Math.pow(1+s.rate/100,10)-1);
                  return(
                    <div key={s.label} style={{background:s.highlight?C.greenBg:C.surfaceAlt,border:`1px solid ${s.highlight?C.greenMid:C.border}`,borderRadius:12,padding:"11px 14px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:700,color:s.highlight?C.green:C.text}}>{s.icon} {s.label}</div>
                          <div style={{fontSize:11,color:C.textLight}}>{s.desc} · {s.rate}% APY</div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontFamily:MF,fontWeight:800,fontSize:15,color:s.highlight?C.green:C.text}}>{fmt(yr1)}/yr</div>
                          <div style={{fontSize:10,color:C.textLight}}>{fmt(yr1/12)}/mo</div>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:6}}>
                        {[["5yr gain",yr5],["10yr gain",yr10],["10yr total",liquid+yr10]].map(([l,v])=>(
                          <div key={l} style={{flex:1,background:"rgba(0,0,0,.04)",borderRadius:7,padding:"5px 7px"}}>
                            <div style={{fontSize:9,color:C.textLight,fontWeight:600,marginBottom:1,textTransform:"uppercase"}}>{l}</div>
                            <div style={{fontFamily:MF,fontWeight:700,fontSize:12,color:s.highlight?C.green:C.textMid}}>{fmt(v)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:10,padding:"10px 14px",fontSize:12,color:C.accent,lineHeight:1.5}}>
                  💡 Switching {fmt(liquid)} to a 4.75% HYSA earns <strong>{fmt(liquid*(4.75-0.5)/100)} extra/yr</strong> vs a standard 0.5% savings account — {fmt(liquid*(4.75-0.5)/100/12)}/mo for free.
                </div>
              </div>
            </div>
          );
        })()}
      </div>

    </div>
  );
}

function ExpenseRow({e,cat,onEdit,onDelete}){
  const[swipeX,setSwipeX]=React.useState(0);
  const[swiping,setSwiping]=React.useState(false);
  const startX=React.useRef(0);
  const threshold=60;
  function onTouchStart(ev){startX.current=ev.touches[0].clientX;setSwiping(true);}
  function onTouchMove(ev){if(!swiping)return;const dx=ev.touches[0].clientX-startX.current;setSwipeX(Math.min(0,Math.max(-threshold*1.5,dx)));}
  function onTouchEnd(){if(swipeX<-threshold){onDelete();}setSwipeX(0);setSwiping(false);}
  const revealed=swipeX<-20;
  return(
    <div style={{position:"relative",marginBottom:8,borderRadius:16,overflow:"hidden"}}>
      <div style={{position:"absolute",right:0,top:0,bottom:0,width:68,background:C.red,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"0 16px 16px 0"}}>
        <Trash2 size={18} color="#fff"/>
      </div>
      <div
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        onClick={swipeX===0?onEdit:undefined}
        style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",background:C.surface,border:"none",borderRadius:16,cursor:"pointer",transform:`translateX(${swipeX}px)`,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",transition:swiping?"none":"transform .2s ease",position:"relative",zIndex:1}}>
        <div style={{width:38,height:38,borderRadius:10,background:C.accentBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{cat?.icon||"💸"}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:600,color:C.text}}>{e.name}</div>
          <div style={{fontSize:11,color:C.textLight,marginTop:1}}>{e.date}{e.category?` · ${e.category}`:""}{e.notes?` · ${e.notes}`:""}</div>
        </div>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.red,flexShrink:0}}>-{fmt(e.amount)}</div>
      </div>
    </div>
  );
}
function SpendingView({expenses,setExpenses,budgetGoals,setBGoals,categories,setEditItem,onAdd,showToast,household}){
  const[showAdd,setShowAdd]=useState(false);const[bForm,setBForm]=useState({});
  const[dateFilter,setDateFilter]=useState("month");
  const[showChart,setShowChart]=useState(true);
  const[searchQ,setSearchQ]=useState("");
  const[editingBudget,setEditingBudget]=useState(null);
  const[catFilter,setCatFilter]=useState("all");
  const[tagFilter,setTagFilter]=useState("all");
  const[selectMode,setSelectMode]=useState(false);
  const[selected,setSelected]=useState(new Set());
  const now=new Date();
  const filteredExp=useMemo(()=>{
    let base=expenses;
    if(dateFilter==="month"){const m=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");base=base.filter(e=>e.date?.startsWith(m));}
    else if(dateFilter==="week"){const ago=new Date(now);ago.setDate(ago.getDate()-7);base=base.filter(e=>new Date(e.date)>=ago);}
    if(searchQ){const q=searchQ.toLowerCase();base=base.filter(e=>(e.name||"").toLowerCase().includes(q)||(e.category||"").toLowerCase().includes(q)||(e.notes||"").toLowerCase().includes(q));}
    if(catFilter!=="all"){base=base.filter(e=>e.category===catFilter);}
    if(tagFilter!=="all"){
      if(tagFilter.startsWith("owner_")){
        const ownerId=tagFilter.replace("owner_","");
        base=base.filter(e=>e.owner===ownerId||(ownerId==="shared"&&e.owner==="shared")||(ownerId==="me"&&!e.owner));
      }else{base=base.filter(e=>(e.tags||[]).includes(tagFilter));}
    }
    return base;
  },[expenses,dateFilter,searchQ,catFilter,tagFilter]);
  const totalExp=filteredExp.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const prevMonthTotal=useMemo(()=>{if(dateFilter!=="month")return 0;const prev=new Date(now.getFullYear(),now.getMonth()-1,1);const pm=prev.getFullYear()+"-"+String(prev.getMonth()+1).padStart(2,"0");return expenses.filter(e=>e.date?.startsWith(pm)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);},[expenses,dateFilter]);
  const momDiff=prevMonthTotal>0?((totalExp-prevMonthTotal)/prevMonthTotal*100):0;
  const catMap=filteredExp.reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount)||0);return a},{});
  const catSorted=Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
  return(
    <div className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}><div style={{display:"flex",gap:10,alignItems:"flex-start"}}><div style={{width:3,height:38,background:`linear-gradient(180deg,${C.accent},${C.purple}88)`,borderRadius:99,marginTop:2,flexShrink:0}}/><div><div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.4,lineHeight:1.2}}>Spending</div><div style={{fontSize:12,color:C.textLight,marginTop:3,fontWeight:500}}>Total: {fmt(totalExp)}</div></div></div><div style={{display:"flex",gap:6}}>{selectMode?<><button className="ba" onClick={()=>{if(selected.size>0){setExpenses(p=>p.filter(e=>!selected.has(e.id)));showToast("Deleted "+selected.size+" expense"+(selected.size!==1?"s":""),"error");setSelected(new Set());setSelectMode(false);}}} style={{background:selected.size>0?C.red:C.redBg,border:`1px solid ${C.redMid}`,borderRadius:10,padding:"8px 12px",color:selected.size>0?"#fff":C.red,fontWeight:700,fontSize:12,cursor:"pointer"}}>Delete {selected.size>0?"("+selected.size+")":""}</button><button className="ba" onClick={()=>{setSelectMode(false);setSelected(new Set());}} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 12px",color:C.textMid,fontWeight:600,fontSize:12,cursor:"pointer"}}>Cancel</button></>:<><button className="ba" onClick={()=>setSelectMode(true)} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 10px",color:C.textMid,fontWeight:600,fontSize:12,cursor:"pointer"}}>Select</button><button className="ba" onClick={onAdd} style={{display:"flex",alignItems:"center",gap:5,background:C.accent,border:"none",borderRadius:10,padding:"8px 16px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",boxShadow:`0 2px 8px ${C.accent}40`}}><Plus size={12}/>Expense</button></> }</div></div>
      <div style={{position:"relative",marginBottom:10}}>
        <Search size={14} color={C.textLight} style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)"}}/>
        <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search expenses..." style={{width:"100%",background:C.surface,border:"1.5px solid "+(searchQ?C.accent:C.border),borderRadius:10,padding:"9px 12px 9px 32px",fontSize:13,color:C.text,outline:"none",boxSizing:"border-box"}}/>
        {searchQ&&<button onClick={()=>setSearchQ("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:C.textLight,padding:2}}><X size={14}/></button>}
      </div>
      <div style={{display:"flex",gap:6,background:C.borderLight,borderRadius:10,padding:3,marginBottom:10}}>
        {[["month","This Month"],["week","7 Days"],["all","All Time"]].map(([id,label])=>(
          <button key={id} className="ba" onClick={()=>{setDateFilter(id);setCatFilter("all");}} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",background:dateFilter===id?"#fff":"transparent",color:dateFilter===id?C.accent:C.textLight,fontWeight:dateFilter===id?700:500,fontSize:12,cursor:"pointer",boxShadow:dateFilter===id?"0 1px 4px rgba(0,0,0,.08)":"none"}}>{label}</button>
        ))}
      </div>
      {/* ── Household member filter — visible when household enabled ── */}
      {household?.enabled&&household?.members?.length>1&&(
        <div style={{display:"flex",gap:6,marginBottom:10,overflowX:"auto",paddingBottom:2}}>
          <button onClick={()=>setTagFilter("all")} style={{flexShrink:0,padding:"6px 13px",borderRadius:99,border:"none",background:tagFilter==="all"?C.accent:C.surface,color:tagFilter==="all"?"#fff":C.textMid,fontWeight:tagFilter==="all"?700:500,fontSize:12,cursor:"pointer",boxShadow:"0 1px 3px rgba(10,22,40,.06)"}}>Everyone</button>
          {household.members.map(m=>(
            <button key={m.id} onClick={()=>setTagFilter("owner_"+m.id)} style={{flexShrink:0,display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:99,border:"none",background:tagFilter==="owner_"+m.id?m.color:C.surface,color:tagFilter==="owner_"+m.id?"#fff":C.textMid,fontWeight:tagFilter==="owner_"+m.id?700:500,fontSize:12,cursor:"pointer",boxShadow:"0 1px 3px rgba(10,22,40,.06)"}}>
              <span>{m.emoji}</span><span>{m.name}</span>
            </button>
          ))}
          <button onClick={()=>setTagFilter("owner_shared")} style={{flexShrink:0,padding:"6px 12px",borderRadius:99,border:"none",background:tagFilter==="owner_shared"?C.navy:C.surface,color:tagFilter==="owner_shared"?"#fff":C.textMid,fontWeight:tagFilter==="owner_shared"?700:500,fontSize:12,cursor:"pointer",boxShadow:"0 1px 3px rgba(10,22,40,.06)"}}>🏠 Shared</button>
        </div>
      )}
      {(()=>{const allTags=[...new Set(expenses.flatMap(e=>e.tags||[]))].filter(Boolean);if(allTags.length>0)return(<div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4,marginBottom:8}}>{[{id:"all",label:"All tags"},...allTags.map(t=>({id:t,label:"#"+t}))].map(({id,label})=>(<button key={id} className="ba" onClick={()=>setTagFilter(id)} style={{flexShrink:0,padding:"5px 10px",borderRadius:99,border:"none",background:tagFilter===id?C.purple:C.surface,color:tagFilter===id?"#fff":C.textLight,fontWeight:tagFilter===id?700:500,fontSize:11,cursor:"pointer",boxShadow:"0 1px 3px rgba(10,22,40,.06)"}}>{label}</button>))}</div>);return null;})()}
      {(()=>{const allCats=[...new Set(expenses.map(e=>e.category).filter(Boolean))].sort();if(allCats.length<2)return null;return(<div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4,marginBottom:12}}>{[{id:"all",label:"All"},...allCats.map(c=>({id:c,label:c}))].map(({id,label})=>(<button key={id} className="ba" onClick={()=>setCatFilter(id)} style={{flexShrink:0,padding:"6px 12px",borderRadius:99,border:"none",background:catFilter===id?C.accent:C.surface,color:catFilter===id?"#fff":C.textMid,fontWeight:catFilter===id?700:500,fontSize:12,cursor:"pointer",boxShadow:catFilter===id?`0 2px 8px ${C.accent}40`:"0 1px 3px rgba(10,22,40,.06)",transition:"all .15s"}}>{label}</button>))} </div>);})()}
      {searchQ&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"8px 12px",background:filteredExp.length>0?C.accentBg:C.redBg,borderRadius:10,border:"1px solid "+(filteredExp.length>0?C.accent:C.red)}}><Search size={13} color={filteredExp.length>0?C.accent:C.red}/><span style={{fontSize:13,fontWeight:600,color:filteredExp.length>0?C.accent:C.red}}>{filteredExp.length>0?filteredExp.length+" result"+(filteredExp.length!==1?"s":"")+" — "+fmt(totalExp):"No results for "+searchQ}</span></div>}
      {!searchQ&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><div style={{fontSize:12,color:C.textLight}}>{filteredExp.length} transaction{filteredExp.length!==1?"s":""}</div><div style={{display:"flex",alignItems:"center",gap:8}}>{dateFilter==="month"&&prevMonthTotal>0&&<div style={{fontSize:11,fontWeight:700,color:momDiff>0?C.red:C.green,background:momDiff>0?C.redBg:C.greenBg,borderRadius:99,padding:"3px 8px"}}>{momDiff>0?"+":""}{momDiff.toFixed(0)}% vs last mo</div>}<div style={{fontFamily:MF,fontWeight:800,fontSize:16,color:C.red}}>-{fmt(totalExp)}</div></div></div>}
      {!searchQ&&filteredExp.length>0&&(()=>{const catTotals=Object.entries(filteredExp.reduce((m,e)=>{const k=e.category||"Misc";m[k]=(m[k]||0)+(parseFloat(e.amount)||0);return m;},{})).sort((a,b)=>b[1]-a[1]).slice(0,4);const catMax=catTotals[0]?.[1]||1;return(<div style={{background:C.surface,borderRadius:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"12px 14px",marginBottom:14}}>{catTotals.map(([cat,amt])=><div key={cat} style={{marginBottom:7}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12,color:C.textMid,fontWeight:500}}>{cat}</span><span style={{fontSize:12,fontFamily:MF,fontWeight:700,color:C.red}}>-{fmt(amt)}</span></div><div style={{height:5,background:C.borderLight,borderRadius:3}}><div style={{height:5,width:`${(amt/catMax*100).toFixed(1)}%`,background:C.accent,borderRadius:3,transition:"width .4s"}}/></div></div>)}</div>);})()}
      {!searchQ&&(()=>{
        const ms_b=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
        const dom_b=now.getDate();
        const dim_b=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
        const daysLeft_b=dim_b-dom_b;
        const budgets=budgetGoals.map(g=>{
          const sp=expenses.filter(e=>e.category===g.category&&e.date?.startsWith(ms_b)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
          const lim=parseFloat(g.limit)||1;
          const pct=Math.min(100,(sp/lim)*100);
          const rem=Math.max(0,lim-sp);
          const over=sp>lim;
          const warn=!over&&pct>=80;
          const dailyAllow=daysLeft_b>0?rem/daysLeft_b:0;
          const status=over?"over":warn?"warn":"ok";
          return{...g,sp,lim,pct,rem,over,warn,status,dailyAllow};
        });
        const totalBudgeted=budgets.reduce((s,b)=>s+b.lim,0);
        const totalSpentB=budgets.reduce((s,b)=>s+b.sp,0);
        const overCount=budgets.filter(b=>b.over).length;
        const warnCount=budgets.filter(b=>b.warn).length;
        const allGreen=budgets.length>0&&overCount===0&&warnCount===0;
        return(
          <div style={{marginBottom:16}}>
            {/* Budget summary header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div>
                  <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Spending Envelopes — {FULL_MOS[now.getMonth()]}</div>
                  <div style={{fontSize:11,color:C.textLight,marginTop:2}}>Variable expenses: gas, haircuts, groceries...</div>
                </div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                {overCount>0&&<div style={{fontSize:11,fontWeight:700,color:C.red,background:C.redBg,borderRadius:99,padding:"2px 8px"}}>{overCount} over</div>}
                {warnCount>0&&<div style={{fontSize:11,fontWeight:700,color:C.amber,background:C.amberBg,borderRadius:99,padding:"2px 8px"}}>{warnCount} near limit</div>}
                {allGreen&&<div style={{fontSize:11,fontWeight:700,color:C.green,background:C.greenBg,borderRadius:99,padding:"2px 8px"}}>✓ All on track</div>}
                <button className="ba" onClick={()=>setShowAdd(true)} style={{background:C.accent,border:"none",borderRadius:8,padding:"5px 10px",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:3}}><Plus size={10}/>Add</button>
              </div>
            </div>
            {/* Summary bar */}
            {budgets.length>0&&<div style={{background:C.surface,borderRadius:14,padding:"12px 14px",marginBottom:12,boxShadow:"0 1px 4px rgba(10,22,40,.06)"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:12,color:C.textLight}}>Total spent <strong style={{color:C.text}}>{fmt(totalSpentB)}</strong> of <strong style={{color:C.textMid}}>{fmt(totalBudgeted)}</strong></span>
                <span style={{fontSize:12,fontWeight:700,color:totalSpentB>totalBudgeted?C.red:C.green}}>{totalBudgeted>0?((totalSpentB/totalBudgeted)*100).toFixed(0):0}%</span>
              </div>
              <div style={{height:8,background:C.borderLight,borderRadius:99,overflow:"hidden",marginBottom:6}}>
                <div style={{height:"100%",width:totalBudgeted>0?Math.min(100,(totalSpentB/totalBudgeted)*100).toFixed(1)+"%":"0%",background:totalSpentB>totalBudgeted?C.red:totalSpentB/totalBudgeted>0.8?C.amber:C.green,borderRadius:99,transition:"width .4s"}}/>
              </div>
              <div style={{fontSize:11,color:C.textLight}}>{daysLeft_b} days left in {FULL_MOS[now.getMonth()]}</div>
            </div>}
            {/* Per-category budget cards */}
            {budgets.map(g=>(
              <div key={g.id} style={{background:C.surface,border:`1.5px solid ${g.over?C.redMid:g.warn?C.amberMid:C.border}`,borderRadius:14,padding:"13px 14px",marginBottom:8,boxShadow:"0 1px 4px rgba(10,22,40,.04)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:2}}>{g.category}</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                      <span style={{fontSize:12,fontFamily:MF,fontWeight:800,color:g.over?C.red:C.text}}>{fmt(g.sp)}</span>
                      <span style={{fontSize:12,color:C.textLight}}>of</span>
                      {editingBudget===g.id
                        ?<input autoFocus type="number" defaultValue={g.lim} onBlur={e=>{const v=parseFloat(e.target.value);if(v>0){setBGoals(p=>p.map(x=>x.id===g.id?{...x,limit:String(v)}:x));showToast&&showToast("✓ Budget updated");}setEditingBudget(null);}} onKeyDown={e=>{if(e.key==="Enter")e.target.blur();if(e.key==="Escape")setEditingBudget(null);}} style={{width:72,background:C.surfaceAlt,border:`1.5px solid ${C.accent}`,borderRadius:6,padding:"2px 6px",fontSize:13,fontWeight:700,color:C.accent,outline:"none",textAlign:"right"}}/>
                        :<span onClick={()=>setEditingBudget(g.id)} style={{fontSize:12,color:C.textLight,cursor:"pointer",borderBottom:`1px dashed ${C.textLight}`,fontWeight:600}}>{fmt(g.lim)} ✎</span>
                      }
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
                    <div style={{fontSize:13,fontWeight:800,fontFamily:MF,color:g.over?C.red:g.warn?C.amber:C.green}}>{g.over?"Over by "+fmt(g.sp-g.lim):fmt(g.rem)+" left"}</div>
                    {!g.over&&g.dailyAllow>0&&<div style={{fontSize:10,color:C.textLight}}>{fmt(g.dailyAllow)}/day to stay on track</div>}
                    <button onClick={()=>{setBGoals(p=>p.filter(x=>x.id!==g.id));showToast&&showToast("Envelope removed","error");}} style={{background:"none",border:"none",cursor:"pointer",color:C.textFaint,padding:0}}><X size={11}/></button>
                  </div>
                </div>
                <div style={{height:7,background:C.borderLight,borderRadius:99,overflow:"hidden",marginBottom:g.over?4:0}}>
                  <div style={{height:"100%",width:g.pct.toFixed(1)+"%",background:g.over?C.red:g.pct>=80?C.amber:C.green,borderRadius:99,transition:"width .4s"}}/>
                </div>
                {g.over&&<div style={{fontSize:11,color:C.red,marginTop:4,fontWeight:600}}>⚠ {fmt(g.sp-g.lim)} over — {daysLeft_b} days to recover</div>}
                {g.warn&&!g.over&&<div style={{fontSize:11,color:C.amber,marginTop:4,fontWeight:500}}>Getting close — {fmt(g.rem)} remaining</div>}
              </div>
            ))}
            {budgets.length===0&&<button className="ba" onClick={()=>setShowAdd(true)} style={{display:"flex",alignItems:"center",gap:5,background:C.purpleBg,border:`1px solid ${C.purpleMid}`,borderRadius:10,padding:"10px 14px",color:C.purple,fontSize:13,cursor:"pointer",width:"100%",justifyContent:"center",marginBottom:8}}><Target size={13}/>+ Add Spending Envelope</button>}
          </div>
        );
      })()}
      {catSorted.length>0&&(
        <div style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:16,marginBottom:14}}>
          <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:12}}>By Category</div>
          {catSorted.map(([cat,amt],i)=>(
            <div key={cat} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{width:8,height:8,borderRadius:99,background:PIE_COLORS[i%PIE_COLORS.length],flexShrink:0}}/>
              <div style={{flex:1}}><div style={{fontSize:13,color:C.textMid}}>{cat}</div><BarProg pct={totalExp>0?amt/totalExp*100:0} color={PIE_COLORS[i%PIE_COLORS.length]} h={3}/></div>
              <div style={{fontSize:13,fontWeight:600,color:C.text}}>{fmt(amt)}</div>
            </div>
          ))}
        </div>
      )}
      {!searchQ&&filteredExp.length>=7&&(()=>{const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];const dow=[0,1,2,3,4,5,6].map(d=>filteredExp.filter(e=>new Date(e.date+"T00:00:00").getDay()===d).reduce((s,e)=>s+(parseFloat(e.amount)||0),0));const max=Math.max(...dow)||1;const topDay=dow.indexOf(max);return(<div style={{background:C.surface,borderRadius:16,padding:16,marginBottom:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)"}}><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:12}}>Spending by Day</div><div style={{display:"flex",gap:4,alignItems:"flex-end",height:60}}>{dow.map((amt,d)=>{const h=Math.max(4,Math.round((amt/max)*52));return(<div key={d} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><div style={{width:"100%",height:h,background:d===topDay?`linear-gradient(135deg,${C.accent},${C.purple})`:C.accentBg,borderRadius:"4px 4px 0 0",transition:"height .4s"}}/><div style={{fontSize:9,color:d===topDay?C.accent:C.textFaint,fontWeight:d===topDay?700:400}}>{DAYS[d]}</div></div>);})}</div><div style={{fontSize:11,color:C.textLight,marginTop:8}}>{DAYS[topDay]} is your highest spending day · {fmt(max)}</div></div>);})()}

      {!searchQ&&filteredExp.length>=3&&(()=>{
        const merchants=filteredExp.reduce((m,e)=>{const k=(e.name||'').toLowerCase().trim();if(!k)return m;m[k]=(m[k]||0)+(parseFloat(e.amount)||0);return m;},{});
        const top=Object.entries(merchants).sort((a,b)=>b[1]-a[1])[0];
        const dayOfMo=new Date().getDate();
        const dailyAvg=dayOfMo>0?(totalExp/dayOfMo):0;
        const daysInMo=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate();
        const forecast=totalExp+(dailyAvg*(daysInMo-dayOfMo));
        if(!top)return null;
        return(<div style={{background:C.surface,borderRadius:12,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:'12px 14px',marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontSize:11,color:C.textLight,fontWeight:600,marginBottom:2}}>TOP MERCHANT</div>
            <div style={{fontSize:13,fontWeight:700,color:C.text,textTransform:'capitalize'}}>{top[0]}</div>
            <div style={{fontSize:12,color:C.textLight}}>Month forecast: <span style={{fontWeight:700,color:forecast>totalExp*1.2?C.red:C.amber}}>{fmt(forecast)}</span></div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontFamily:MF,fontWeight:800,fontSize:18,color:C.red}}>{fmt(top[1])}</div>
            <div style={{fontSize:11,color:C.textLight}}>{filteredExp.filter(e=>(e.name||'').toLowerCase().trim()===top[0]).length} visits</div>
          </div>
        </div>);
      })()}
            <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:10}}>Transactions</div>
      {filteredExp.length===0&&<Empty text="No expenses yet — use AI Logger or the + button" icon={Wallet}/>}
      {filteredExp.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(e=>{
        const cat=categories.find(c=>c.name===e.category);
        if(selectMode){const isSel=selected.has(e.id);return(<div key={e.id} onClick={()=>setSelected(p=>{const n=new Set(p);if(n.has(e.id))n.delete(e.id);else n.add(e.id);return n;})} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",background:isSel?C.accentBg:C.surface,border:`1.5px solid ${isSel?C.accent:C.border}`,borderRadius:16,marginBottom:8,cursor:"pointer"}}><div style={{width:22,height:22,borderRadius:"50%",background:isSel?C.accent:C.bg,border:`2px solid ${isSel?C.accent:C.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{isSel&&<Check size={12} color="#fff"/>}</div><div style={{width:34,height:34,borderRadius:10,background:C.accentBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{cat?.icon||"💸"}</div><div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:600,color:C.text}}>{e.name}</div><div style={{fontSize:11,color:C.textLight}}>{e.date} · {e.category}</div></div><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.red,flexShrink:0}}>-{fmt(e.amount)}</div></div>);}
        return(
          <ExpenseRow key={e.id} e={e} cat={cat} onEdit={()=>setEditItem({type:"expense",data:e})} onDelete={()=>{setExpenses(p=>p.filter(x=>x.id!==e.id));showToast&&showToast("Deleted — "+e.name,"error");}}/>
        );
      })}
      {showAdd&&<Modal title="Spending Envelope" icon={Target} onClose={()=>setShowAdd(false)} onSubmit={()=>{if(!bForm.category||!bForm.limit)return;setBGoals(p=>[...p,{id:Date.now(),...bForm}]);setShowAdd(false);setBForm({});}} submitLabel="Add Envelope" accent={C.purple}><div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:C.accent,lineHeight:1.5}}>
        💡 Set a monthly budget for <strong>variable expenses</strong> like gas, haircuts, groceries, dining. These reserve money in your safe-to-spend before you even log them.
      </div>
      <FS label="Category" options={categories.map(c=>c.name)} value={bForm.category||""} onChange={e=>setBForm(p=>({...p,category:e.target.value}))}/><FI label="Note (optional)" placeholder="e.g. haircuts ~2x/month, gas varies" value={bForm.note||""} onChange={e=>setBForm(p=>({...p,note:e.target.value}))}/><FI label="Monthly Budget ($)" type="number" placeholder="e.g. 150" value={bForm.limit||""} onChange={e=>setBForm(p=>({...p,limit:e.target.value}))}/></Modal>}
    </div>
  );
}function BillsView({bills,setBills,setEditItem,onAdd,showToast,household}){
  const[billTab,setBillTab]=useState("upcoming");
  const overdue=bills.filter(b=>!b.paid&&dueIn(b.dueDate)<0);
  const unpaid=bills.filter(b=>!b.paid);
  const paid=bills.filter(b=>b.paid);
  const totalMonthly=bills.reduce((s,b)=>s+(parseFloat(b.amount)||0),0);
  const totalPaid=paid.reduce((s,b)=>s+(parseFloat(b.amount)||0),0);
  const pctPaid=totalMonthly>0?Math.round(totalPaid/totalMonthly*100):0;
  const soonAmt=bills.filter(b=>!b.paid&&dueIn(b.dueDate)>=0&&dueIn(b.dueDate)<=7).reduce((s,b)=>s+(parseFloat(b.amount)||0),0);
  return(
    <div className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div><div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.4}}>Bills</div><div style={{fontSize:13,color:C.textLight}}>{unpaid.length} unpaid · {overdue.length} overdue</div></div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>{overdue.length>0&&<button className="ba" onClick={()=>setBills(p=>p.map(b=>overdue.some(o=>o.id===b.id)?{...b,paid:true}:b))} style={{background:C.greenBg,border:`1px solid ${C.greenMid}`,borderRadius:10,padding:"7px 12px",color:C.green,fontWeight:700,fontSize:12,cursor:"pointer"}}>✓ Pay Overdue</button>}<button onClick={onAdd} style={{display:"flex",alignItems:"center",gap:5,background:C.accent,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}><Plus size={13}/>Add Bill</button></div>
      </div>
      {bills.length>0&&<div style={{background:C.surface,borderRadius:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"14px 16px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:12,color:C.textLight,marginBottom:2}}>Monthly Total</div>
          <div style={{fontFamily:MF,fontWeight:800,fontSize:20,color:C.text}}>{fmt(totalMonthly)}</div>
          <div style={{fontSize:12,color:C.green,marginTop:2}}>{fmt(totalPaid)} paid · {fmt(totalMonthly-totalPaid)} remaining</div>
        </div>
        <div style={{position:"relative",width:56,height:56}}>
          <svg width="56" height="56" style={{transform:"rotate(-90deg)"}}>
            <circle cx="28" cy="28" r="22" fill="none" stroke={pctPaid>0?C.greenBg:C.borderLight} strokeWidth="5" style={{transition:"stroke .4s"}}/>
            <circle cx="28" cy="28" r="22" fill="none" stroke={pctPaid>=80?C.green:pctPaid>=40?C.accent:C.red} strokeWidth="5" strokeDasharray={`${2*Math.PI*22}`} strokeDashoffset={`${2*Math.PI*22*(1-pctPaid/100)}`} strokeLinecap="round"/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:C.text}}>{pctPaid}%</div>
        </div>
      </div>}
      {soonAmt>0&&<div style={{background:C.amberBg,border:`1px solid ${C.amberMid}`,borderRadius:12,padding:"11px 15px",marginBottom:14,fontSize:13,color:C.amber,fontWeight:500}}>⚠️ <strong>{fmt(soonAmt)}</strong> due in the next 7 days</div>}
      {bills.length===0&&<Empty text='No bills yet. Use AI Logger — type "rent 1200 due 28th"' icon={CalendarClock}/>}
      {bills.length>0&&(()=>{
        const upcomingBills=[...bills.filter(b=>!b.paid)].sort((a,b2)=>new Date(a.dueDate)-new Date(b2.dueDate));
        const paidBills=[...bills.filter(b=>b.paid)].sort((a,b2)=>(b2.paidDate||b2.dueDate||"").localeCompare(a.paidDate||a.dueDate||""));
        return(
          <div>
            <div style={{display:"flex",background:C.borderLight,borderRadius:10,padding:3,marginBottom:14}}>
              {[["upcoming","Upcoming ("+upcomingBills.length+")"],["history","Paid History ("+paidBills.length+")"]].map(([id,l])=>(
                <button key={id} onClick={()=>setBillTab(id)} style={{flex:1,padding:"7px 0",borderRadius:8,border:"none",background:billTab===id?C.surface:"transparent",color:billTab===id?C.accent:C.textLight,fontWeight:billTab===id?700:500,fontSize:13,cursor:"pointer"}}>
                  {l}
                </button>
              ))}
            </div>
            {billTab==="upcoming"&&upcomingBills.length===0&&<div style={{textAlign:"center",padding:"20px 0",fontSize:13,color:C.textLight}}>🎉 All bills paid!</div>}
            {(billTab==="upcoming"?upcomingBills:paidBills).map(b=>{
        const d=dueIn(b.dueDate);
        const uc=b.paid?C.green:d<0?C.red:d<=3?C.red:d<=7?C.amber:C.textLight;
        const ul=b.paid?"Paid ✓":d<0?Math.abs(d)+"d overdue":d===0?"Due today!":d<=7?"Due in "+d+"d":"Due "+fmtDate(b.dueDate);
        return(
          <div key={b.id} style={{marginBottom:8}}>
            <div className="rw" style={{display:"flex",alignItems:"center",gap:12,padding:"14px 14px",background:C.surface,border:`1.5px solid ${b.paid?C.border:d<0?C.redMid:d<=7?C.amberMid:C.border}`,borderRadius:14}}>
              <button onClick={()=>{setBills(p=>p.map(x=>{if(x.id!==b.id)return x;const nowPaid=!x.paid;if(nowPaid){setTimeout(()=>showToast&&showToast("✓ Paid — "+x.name),0);try{navigator.vibrate&&navigator.vibrate([30,10,30]);}catch{}}if(nowPaid&&x.recurring&&x.recurring!=="One-time"){return{...x,paid:false,dueDate:(()=>{const d=new Date((x.dueDate||todayStr())+"T00:00:00");if(x.recurring==="Weekly"){d.setDate(d.getDate()+7);}else if(x.recurring==="Bi-weekly"){d.setDate(d.getDate()+14);}else if(x.recurring==="Quarterly"){d.setMonth(d.getMonth()+3);}else if(x.recurring==="Annual"){d.setFullYear(d.getFullYear()+1);}else{d.setMonth(d.getMonth()+1);}return d.toISOString().split("T")[0];})(),paidDate:todayStr()};}return{...x,paid:nowPaid};}));}} style={{background:"none",border:"none",cursor:"pointer",color:b.paid?C.green:C.border,padding:0,display:"flex",flexShrink:0}}>{b.paid?<CheckCircle2 size={22}/>:<Circle size={22}/>}</button>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600,color:b.paid?C.textLight:C.text,textDecoration:b.paid?"line-through":"none"}}>{b.name}</div>
                <div style={{fontSize:12,marginTop:2,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{color:uc,fontWeight:500}}>{ul}</span>
                  {b.recurring&&b.recurring!=="One-time"&&<span style={{color:C.textLight}}>{b.recurring}</span>}{b.notes&&<span style={{color:C.textFaint,fontSize:11}}>· {b.notes}</span>}
                  {b.autoPay&&<span style={{background:C.accentBg,color:C.accent,fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:99}}>AUTO-PAY</span>}{household?.enabled&&b.paidBy&&b.paidBy!=="shared"&&(()=>{const m=household.members.find(x=>x.id===b.paidBy);return m?<span style={{background:m.color+"18",color:m.color,fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:99,border:`1px solid ${m.color}33`}}>{m.emoji} {m.name}</span>:null;})()}
                </div>
              </div>
              <div style={{fontFamily:MF,fontWeight:700,fontSize:16,color:b.paid?C.textLight:C.text}}>{fmt(b.amount)}</div>
              <button className="ba" onClick={()=>setEditItem({type:"bill",data:b})} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,fontSize:11,fontWeight:600,padding:"4px 6px"}}>Edit</button>
              <button className="ba" onClick={()=>{setBills(p=>p.filter(x=>x.id!==b.id));showToast&&showToast("Bill removed","error");}} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,padding:"4px 3px",display:"flex"}}><Trash2 size={13}/></button>
            </div>
          </div>
        );
      })}
          </div>
        );
      })()}
    {bills.length>3&&(()=>{
      const now3=new Date();
      const last6=Array.from({length:6},(_,i)=>{const d=new Date(now3.getFullYear(),now3.getMonth()-5+i,1);const ms=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');const paid=bills.filter(b=>b.dueDate?.startsWith(ms)&&b.paid).reduce((s,b)=>s+(parseFloat(b.amount)||0),0);const total=bills.filter(b=>b.dueDate?.startsWith(ms)).reduce((s,b)=>s+(parseFloat(b.amount)||0),0);return{month:FULL_MOS[d.getMonth()].slice(0,3),paid,total,isCurrent:i===5};});
      if(!last6.some(m=>m.total>0))return null;
      const maxB=Math.max(...last6.map(m=>m.total))||1;
      return(<div style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:16,marginBottom:14}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:12}}>6-Month Bill History</div>
        <div style={{display:'flex',gap:4,alignItems:'flex-end',height:64}}>
          {last6.map((m,i)=>{const hTotal=Math.max(4,Math.round((m.total/maxB)*56));const hPaid=m.total>0?Math.round((m.paid/m.total)*hTotal):0;return(<div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
            <div style={{width:'100%',height:hTotal,background:C.borderLight,borderRadius:'3px 3px 0 0',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',bottom:0,width:'100%',height:hPaid,background:m.isCurrent?C.green:C.accent,borderRadius:'3px 3px 0 0'}}/>
            </div>
            <div style={{fontSize:9,color:m.isCurrent?C.accent:C.textFaint,fontWeight:m.isCurrent?700:400}}>{m.month}</div>
          </div>);})}
        </div>
        <div style={{display:'flex',gap:12,marginTop:8,fontSize:11}}>
          <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:8,height:8,borderRadius:2,background:C.accent}}/><span style={{color:C.textLight}}>Due</span></div>
          <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:8,height:8,borderRadius:2,background:C.green}}/><span style={{color:C.textLight}}>Paid</span></div>
        </div>
      </div>);
    })()}
    </div>
  );
}

function ExtraPayModal({debt,onConfirm,onClose}){
  const[amt,setAmt]=useState("");
  const bal=parseFloat(debt?.balance||0);
  const minPay=parseFloat(debt?.minPayment||0);
  const pay=parseFloat(amt)||0;
  const newBal=Math.max(0,bal-pay);
  const pctPaid=bal>0?Math.min(100,(pay/bal)*100):0;
  // Quick amount options
  const quickAmts=[minPay>0&&{l:"Min pmt",v:minPay},{l:"$100",v:100},{l:"$250",v:250},{l:"$500",v:500},{l:"Pay off",v:bal}].filter(Boolean);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",backdropFilter:"blur(6px)",WebkitBackdropFilter:"blur(6px)",zIndex:9999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:C.surface,borderRadius:"24px 24px 0 0",padding:"24px 24px 36px",width:"100%",maxWidth:480,boxShadow:"0 -4px 40px rgba(10,22,40,.2)"}} onClick={e=>e.stopPropagation()}>
        {/* Drag handle */}
        <div style={{width:36,height:4,background:C.border,borderRadius:99,margin:"0 auto 20px"}}/>
        <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text,marginBottom:2}}>Make a Payment</div>
        <div style={{fontSize:13,color:C.textLight,marginBottom:20}}>{debt?.name} · balance {fmt(bal)}</div>

        {/* Quick-tap amounts */}
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
          {quickAmts.map(q=>(
            <button key={q.l} onClick={()=>setAmt(String(q.v.toFixed(2)))}
              style={{padding:"7px 13px",borderRadius:99,border:`1.5px solid ${Math.abs(pay-q.v)<0.01?C.green:C.border}`,background:Math.abs(pay-q.v)<0.01?C.greenBg:"#fff",color:Math.abs(pay-q.v)<0.01?C.green:C.textMid,fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
              {q.l}{q.v===bal?"":" · "+fmt(q.v)}
            </button>
          ))}
        </div>

        {/* Amount input */}
        <div style={{position:"relative",marginBottom:14}}>
          <span style={{position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",fontWeight:800,color:pay>0?C.green:C.textMid,fontSize:18}}>$</span>
          <input autoFocus type="number" value={amt} onChange={e=>setAmt(e.target.value)}
            placeholder="Enter amount"
            style={{width:"100%",border:`2px solid ${pay>0?C.green:C.border}`,borderRadius:14,padding:"15px 16px 15px 36px",fontSize:22,fontFamily:MF,fontWeight:800,color:pay>0?C.green:C.text,outline:"none",boxSizing:"border-box",background:pay>0?C.greenBg:C.surface,transition:"all .15s"}}/>
        </div>

        {/* New balance preview */}
        {pay>0&&(
          <div style={{background:newBal===0?"#0A1628":C.greenBg,border:`1px solid ${newBal===0?"#6366F1":C.greenMid}`,borderRadius:12,padding:"12px 16px",marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:newBal>0?8:0}}>
              <span style={{fontSize:13,color:newBal===0?"rgba(255,255,255,.7)":C.green,fontWeight:600}}>
                {newBal===0?"🎉 PAID OFF!":"New balance after payment"}
              </span>
              <span style={{fontFamily:MF,fontWeight:800,fontSize:16,color:newBal===0?"#34D399":C.green}}>
                {fmt(newBal)}
              </span>
            </div>
            {newBal>0&&bal>0&&(
              <div style={{height:6,background:C.border,borderRadius:99,overflow:"hidden"}}>
                <div style={{height:"100%",width:pctPaid.toFixed(1)+"%",background:C.green,borderRadius:99,transition:"width .3s"}}/>
              </div>
            )}
            {pay>bal&&<div style={{fontSize:11,color:C.amber,marginTop:6}}>⚠ Payment exceeds balance — will pay off fully</div>}
          </div>
        )}

        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:"14px",borderRadius:14,border:`1.5px solid ${C.border}`,background:C.surface,color:C.textMid,fontWeight:700,fontSize:15,cursor:"pointer"}}>Cancel</button>
          <button onClick={()=>{if(pay<=0)return;onConfirm(Math.min(pay,bal));}}
            disabled={pay<=0}
            style={{flex:2,padding:"14px",borderRadius:14,border:"none",background:pay>0?C.green:C.borderLight,color:pay>0?"#fff":C.textFaint,fontWeight:800,fontSize:15,cursor:pay>0?"pointer":"default",fontFamily:MF,transition:"all .15s"}}>
            {newBal===0?"Pay Off Debt 🎉":"Confirm — "+fmt(Math.min(pay,bal))}
          </button>
        </div>
      </div>
    </div>
  );
}


function DebtView({debts,setDebts,setModal,setEditItem,showToast,extraPayDebt=0,setExtraPayDebt}){
  const[selectedDebt,setSelectedDebt]=useState(null);
  const[strategy,setStrategy]=useState("avalanche");
  const[payModal,setPayModal]=useState(null);
  const totalDebt=debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0);
  const totalOriginal=debts.reduce((s,d)=>s+(parseFloat(d.original||d.balance||0)),0);
  const totalPaidDown=Math.max(0,totalOriginal-totalDebt);
  const overallPct=totalOriginal>0?Math.round(totalPaidDown/totalOriginal*100):0;
  const pieData=debts.map((d,i)=>({name:d.name,value:parseFloat(d.balance)||0,color:PIE_COLORS[i%PIE_COLORS.length],debt:d}));
  function calcPayoff(d){
    const bal=parseFloat(d.balance)||0;
    const rate=(parseFloat(d.rate)||0)/100/12;
    const minPay=d.minPayment?parseFloat(d.minPayment):Math.max(25,bal*0.02);
    if(bal<=0)return{months:0,totalInterest:0,payoffDate:"Paid off"};
    if(minPay<=rate*bal)return{months:999,totalInterest:999999,payoffDate:"Never"};
    let b=bal,mo=0,interest=0;
    while(b>0.01&&mo<600){const i=b*rate;interest+=i;b=b+i-minPay;mo++;}
    const d2=new Date();d2.setMonth(d2.getMonth()+mo);
    return{months:mo,totalInterest:interest,payoffDate:d2.toLocaleDateString("en-US",{month:"long",year:"numeric"})};
  }
  const prioritized=[...debts].sort((a,b)=>strategy==="avalanche"?(parseFloat(b.rate)||0)-(parseFloat(a.rate)||0):(parseFloat(a.balance)||0)-(parseFloat(b.balance)||0));
  const renderLabel=({cx,cy,midAngle,innerRadius,outerRadius,index})=>{
    if(pieData[index].value/totalDebt<0.08)return null;
    const RADIAN=Math.PI/180;
    const r=innerRadius+(outerRadius-innerRadius)*0.55;
    const x=cx+r*Math.cos(-midAngle*RADIAN);
    const y=cy+r*Math.sin(-midAngle*RADIAN);
    return(<text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" style={{fontSize:11,fontWeight:700,pointerEvents:"none"}}>{(pieData[index].value/totalDebt*100).toFixed(0)}%</text>);
  };
  return(
    <div className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div><div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.4}}>Debt Tracker</div><div style={{fontSize:13,color:C.textLight}}>{fmt(totalDebt)} total across {debts.length} debt{debts.length!==1?"s":""}</div></div>

      {debts.length>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}><div style={{background:C.redBg,borderRadius:12,padding:"10px 12px",textAlign:"center"}}><div style={{fontSize:10,color:C.red,marginBottom:2,fontWeight:600,letterSpacing:.5}}>REMAINING</div><div style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.red}}>{fmt(totalDebt)}</div></div><div style={{background:C.greenBg,borderRadius:12,padding:"10px 12px",textAlign:"center"}}><div style={{fontSize:10,color:C.green,marginBottom:2,fontWeight:600,letterSpacing:.5}}>PAID DOWN</div><div style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.green}}>{fmt(totalPaidDown)}</div></div><div style={{background:C.accentBg,borderRadius:12,padding:"10px 12px",textAlign:"center"}}><div style={{fontSize:10,color:C.accent,marginBottom:2,fontWeight:600,letterSpacing:.5}}>PROGRESS</div><div style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.accent}}>{overallPct}%</div></div></div>}
        <div style={{display:"flex",gap:8}}>
          {debts.length>0&&<button className="ba" onClick={()=>setModal("simulator")} style={{display:"flex",alignItems:"center",gap:5,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 12px",color:C.textMid,fontWeight:600,fontSize:13,cursor:"pointer"}}><Calculator size={13}/>Sim</button>}
          <button className="ba" onClick={()=>setModal("debt")} style={{display:"flex",alignItems:"center",gap:5,background:C.accent,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}><Plus size={13}/>Add Debt</button>
        </div>
      </div>
      {debts.length===0&&<Empty text="No debts tracked. Add one to start your payoff plan!" icon={CreditCard}/>}
      {debts.length>0&&<>
        <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:20,marginBottom:14}}>
          <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>Debt Breakdown</div>
          <div style={{fontSize:12,color:C.textLight,marginBottom:12}}>Tap a slice to see details</div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <PieChart width={180} height={180}>
              <Pie data={pieData} cx={85} cy={85} innerRadius={48} outerRadius={82} dataKey="value" labelLine={false} label={renderLabel} onClick={(entry)=>setSelectedDebt(selectedDebt?.debt?.id===entry.debt?.id?null:entry)}>
                {pieData.map((entry,i)=>(<Cell key={i} fill={entry.color} stroke={selectedDebt?.debt?.id===entry.debt?.id?"#fff":"transparent"} strokeWidth={selectedDebt?.debt?.id===entry.debt?.id?3:0} style={{cursor:"pointer",opacity:selectedDebt&&selectedDebt.debt?.id!==entry.debt?.id?0.5:1}}/>))}
              </Pie>
            </PieChart>
            <div style={{flex:1,minWidth:0}}>
              {pieData.map((d,i)=>(
                <div key={i} onClick={()=>setSelectedDebt(selectedDebt?.debt?.id===d.debt?.id?null:d)} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",borderRadius:10,marginBottom:3,cursor:"pointer",background:selectedDebt?.debt?.id===d.debt?.id?d.color+"18":"transparent",border:selectedDebt?.debt?.id===d.debt?.id?`1.5px solid ${d.color}33`:"1.5px solid transparent"}}>
                  <div style={{width:10,height:10,borderRadius:3,background:d.color,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</div></div>
                  <div style={{fontFamily:MF,fontWeight:700,fontSize:12,color:C.red,flexShrink:0}}>{fmt(d.value)}</div>
                </div>
              ))}
            </div>
          </div>
          {selectedDebt&&(()=>{
            const d=selectedDebt.debt;
            const proj=calcPayoff(d);
            const bal=parseFloat(d.balance)||0;
            const orig=parseFloat(d.original)||bal;
            const pct=Math.min(100,((orig-bal)/orig)*100);
            return(
              <div style={{marginTop:14,background:selectedDebt.color+"12",border:`1.5px solid ${selectedDebt.color}33`,borderRadius:14,padding:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div><div style={{fontFamily:MF,fontSize:16,fontWeight:800,color:C.text}}>{d.name}</div>
                    <div style={{display:"flex",gap:6,marginTop:3,flexWrap:"wrap"}}>
                      {d.type&&<span style={{fontSize:11,fontWeight:600,background:selectedDebt.color+"20",color:selectedDebt.color,padding:"2px 8px",borderRadius:99}}>{d.type}</span>}
                      {d.rate&&<span style={{fontSize:11,color:C.textLight,fontWeight:500}}>{d.rate}% APR</span>}{(()=>{const po=calcPayoff(d);return po.months>0&&po.months<500?<span style={{fontSize:11,color:C.green,fontWeight:600}}> · payoff {po.months}mo</span>:null;})()}
                    </div>
                  </div>
                  <div style={{fontFamily:MF,fontSize:22,fontWeight:800,color:C.red}}>{fmt(bal)}</div>
                </div>
                {orig>bal&&<><BarProg pct={pct} color={selectedDebt.color} h={7}/><div style={{display:"flex",justifyContent:"space-between",marginTop:4,marginBottom:10,fontSize:12,color:C.textLight}}><span>{pct.toFixed(0)}% paid off</span><span>of {fmt(orig)}</span></div></>}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                  {[["Payoff",proj.payoffDate],["Time left",proj.months<600?proj.months+" months":"Too long"],["Total Int.",proj.totalInterest<999999?fmt(proj.totalInterest):"Reduce payment"],["Mo. Interest",fmt((parseFloat(d.rate)||0)/100/12*bal)]].map(([l,v])=>(
                    <div key={l} style={{background:"rgba(255,255,255,.6)",borderRadius:10,padding:"9px 10px"}}>
                      <div style={{fontSize:10,color:C.textLight,fontWeight:600,marginBottom:2}}>{l.toUpperCase()}</div>
                      <div style={{fontFamily:MF,fontSize:12,fontWeight:700,color:C.text}}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setPayModal(d)} style={{flex:1,padding:"10px",borderRadius:12,background:C.green,border:"none",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>+ Make Payment</button>
                  <button onClick={()=>setEditItem({type:"debt",data:d})} style={{padding:"10px 16px",borderRadius:12,background:C.surface,border:`1px solid ${C.border}`,color:C.textMid,fontWeight:600,fontSize:13,cursor:"pointer"}}>Edit</button>
                </div>
              </div>
            );
          })()}
        </div>
        {debts.length>0&&(()=>{
          const totalBal=debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0);
          const totalMin=debts.reduce((s,d)=>{const b=parseFloat(d.balance)||0;const r=(parseFloat(d.rate)||0)/100/12;return s+(parseFloat(d.minPayment)||Math.max(25,b*0.02+r*b));},0);
          function simPayoff(extraPerMo){
            let rem=prioritized.map(d=>{const b=parseFloat(d.balance)||0;const r=(parseFloat(d.rate)||0)/100/12;return{...d,bal:b,rate:r,min:parseFloat(d.minPayment)||Math.max(25,b*0.02+r*b)};});
            let mo=0,totalInt=0,extraPool=extraPerMo;
            while(rem.some(d=>d.bal>0.01)&&mo<600){mo++;let freed=0;rem=rem.map(d=>{if(d.bal<=0)return d;const i=d.bal*d.rate;totalInt+=i;const pay=Math.min(d.min,d.bal+i);freed+=Math.max(0,d.min-pay);return{...d,bal:Math.max(0,d.bal+i-pay)};});const focus=rem.find(d=>d.bal>0.01);if(focus){const idx=rem.indexOf(focus);rem[idx].bal=Math.max(0,rem[idx].bal-(freed+extraPool));}}
            return{months:mo,interest:totalInt};
          }
          const base=simPayoff(0);
          const withExtra=extraPayDebt>0?simPayoff(extraPayDebt):null;
          const moSaved=withExtra?Math.max(0,base.months-withExtra.months):0;
          const intSaved=withExtra?Math.max(0,base.interest-withExtra.interest):0;
          const dfDate=new Date();dfDate.setMonth(dfDate.getMonth()+base.months);
          const dfDateExtra=withExtra?new Date():null;if(dfDateExtra)dfDateExtra.setMonth(dfDateExtra.getMonth()+withExtra.months);
          const yrs=Math.floor(base.months/12);const mos2=base.months%12;
          const timeStr=yrs>0?yrs+"y "+(mos2>0?mos2+"mo":""):mos2+"mo";
          return(
            <div style={{background:`linear-gradient(135deg,${C.navy},${C.navyLight})`,borderRadius:18,padding:20,marginBottom:14,color:"#fff"}}>
              <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>🎯 Debt-Free Projection</div>
              <div style={{fontFamily:MF,fontSize:30,fontWeight:800,color:C.greenMid,marginBottom:2,letterSpacing:-.5}}>{base.months>=600?"Increase payments":dfDate.toLocaleDateString("en-US",{month:"long",year:"numeric"})}</div>
              <div style={{fontSize:13,color:"rgba(255,255,255,.5)",marginBottom:16}}>{base.months>=600?"Min payments don't cover interest":timeStr+" from today · min payments only"}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
                {[["Total Owed",fmt(totalBal),"#fca5a5"],["Min/mo",fmt(totalMin),"rgba(255,255,255,.8)"],["Total Interest",base.months<600?fmt(base.interest):"—","rgba(255,255,255,.6)"]].map(([l,v,c])=>(
                  <div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 8px"}}>
                    <div style={{fontSize:9,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2,textTransform:"uppercase"}}>{l}</div>
                    <div style={{fontFamily:MF,fontSize:12,fontWeight:700,color:c}}>{v}</div>
                  </div>
                ))}
              </div>
              {base.months>0&&base.months<500&&(()=>{
                // Build balance-over-time data for chart
                const chartData=[];
                let rem2=prioritized.map(d=>{const b=parseFloat(d.balance)||0;const r=(parseFloat(d.rate)||0)/100/12;return{bal:b,rate:r,min:parseFloat(d.minPayment)||Math.max(25,b*0.02+r*b)};});
                let rem3=withExtra?prioritized.map(d=>{const b=parseFloat(d.balance)||0;const r=(parseFloat(d.rate)||0)/100/12;return{bal:b,rate:r,min:parseFloat(d.minPayment)||Math.max(25,b*0.02+r*b)};}) : null;
                const step=Math.max(1,Math.floor(base.months/12));
                for(let mo=0;mo<=Math.min(base.months,600);mo+=step){
                  const bal2=rem2.reduce((s,d)=>s+Math.max(0,d.bal),0);
                  const bal3=rem3?rem3.reduce((s,d)=>s+Math.max(0,d.bal),0):null;
                  chartData.push({mo,base:parseFloat(bal2.toFixed(0)),extra:bal3!==null?parseFloat(bal3.toFixed(0)):undefined});
                  // Advance simulation
                  let freed2=0;
                  rem2=rem2.map(d=>{if(d.bal<=0)return d;const i=d.bal*d.rate;const pay=Math.min(d.min,d.bal+i);freed2+=Math.max(0,d.min-pay);return{...d,bal:Math.max(0,d.bal+i-pay)};});
                  const f2=rem2.find(d=>d.bal>0.01);if(f2){const fi=rem2.indexOf(f2);for(let s=0;s<step;s++)rem2[fi].bal=Math.max(0,rem2[fi].bal-(freed2));}
                  if(rem3){let freed3=0;rem3=rem3.map(d=>{if(d.bal<=0)return d;const i=d.bal*d.rate;const pay=Math.min(d.min,d.bal+i);freed3+=Math.max(0,d.min-pay);return{...d,bal:Math.max(0,d.bal+i-pay)};});const f3=rem3.find(d=>d.bal>0.01);if(f3){const fi3=rem3.indexOf(f3);for(let s=0;s<step;s++)rem3[fi3].bal=Math.max(0,rem3[fi3].bal-(freed3+extraPayDebt));}}
                }
                if(chartData[chartData.length-1]?.base>0)chartData.push({mo:base.months,base:0,extra:withExtra?0:undefined});
                return(
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,.6)",marginBottom:8}}>Payoff Timeline</div>
                    <ResponsiveContainer width="100%" height={120}>
                      <AreaChart data={chartData} margin={{left:-20,right:4,top:4,bottom:0}}>
                        <defs>
                          <linearGradient id="debtGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#fca5a5" stopOpacity={.3}/>
                            <stop offset="95%" stopColor="#fca5a5" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="debtGradX" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={C.green} stopOpacity={.3}/>
                            <stop offset="95%" stopColor={C.green} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="mo" tick={{fill:"rgba(255,255,255,.3)",fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>v+"mo"}/>
                        <YAxis tick={{fill:"rgba(255,255,255,.3)",fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v>=1000?(v/1000).toFixed(0)+"k":v)} width={40}/>
                        <Tooltip formatter={(v,n)=>[fmt(v),n==="base"?"Min payments":"With extra"]} contentStyle={{background:C.navy,border:"1px solid rgba(255,255,255,.15)",borderRadius:10,fontSize:11}} labelFormatter={v=>v+"mo"}/>
                        <Area type="monotone" dataKey="base" stroke="#fca5a5" strokeWidth={2} fill="url(#debtGrad)" dot={false} name="base"/>
                        {withExtra&&<Area type="monotone" dataKey="extra" stroke={C.greenMid} strokeWidth={2} fill="url(#debtGradX)" dot={false} name="extra"/>}
                      </AreaChart>
                    </ResponsiveContainer>
                    {withExtra&&<div style={{display:"flex",gap:12,justifyContent:"center",marginTop:4}}>
                      <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"rgba(255,255,255,.5)"}}><div style={{width:12,height:2,background:"#fca5a5",borderRadius:1}}/> Min payments</div>
                      <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"rgba(255,255,255,.5)"}}><div style={{width:12,height:2,background:C.greenMid,borderRadius:1}}/> With extra</div>
                    </div>}
                  </div>
                );
              })()}
              <div style={{background:"rgba(255,255,255,.06)",borderRadius:12,padding:"12px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,.7)"}}>What if you paid extra?</div>
                  <div style={{fontFamily:MF,fontWeight:800,fontSize:15,color:extraPayDebt>0?C.greenMid:"rgba(255,255,255,.4)"}}>+{fmt(extraPayDebt)}/mo</div>
                </div>
                {/* Quick amounts */}
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                  {[25,50,100,200,500,1000].map(amt=>(
                    <button key={amt} onClick={()=>setExtraPayDebt(amt)}
                      style={{padding:"5px 11px",borderRadius:99,border:`1.5px solid ${extraPayDebt===amt?"rgba(52,211,153,.8)":"rgba(255,255,255,.15)"}`,background:extraPayDebt===amt?"rgba(52,211,153,.15)":"rgba(255,255,255,.06)",color:extraPayDebt===amt?"#34D399":"rgba(255,255,255,.5)",fontSize:11,fontWeight:extraPayDebt===amt?700:500,cursor:"pointer",fontFamily:MF}}>
                      +${amt}
                    </button>
                  ))}
                </div>
                {/* Typed input */}
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:extraPayDebt>0?10:0}}>
                  <div style={{position:"relative",flex:1}}>
                    <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,.4)",fontWeight:700,fontSize:15}}>$</span>
                    <input type="number" value={extraPayDebt||""} onChange={e=>setExtraPayDebt(Math.max(0,parseInt(e.target.value)||0))}
                      placeholder="Custom amount"
                      style={{width:"100%",background:"rgba(255,255,255,.08)",border:`1.5px solid ${extraPayDebt>0?"rgba(52,211,153,.5)":"rgba(255,255,255,.15)"}`,borderRadius:10,padding:"10px 12px 10px 28px",fontSize:15,fontFamily:MF,fontWeight:700,color:extraPayDebt>0?"#34D399":"#fff",outline:"none",boxSizing:"border-box"}}/>
                  </div>
                  {extraPayDebt>0&&<button onClick={()=>setExtraPayDebt(0)} style={{background:"rgba(255,255,255,.08)",border:"none",borderRadius:8,padding:"10px 12px",color:"rgba(255,255,255,.4)",cursor:"pointer",fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>Clear</button>}
                </div>
                {extraPayDebt>0&&withExtra&&withExtra.months<base.months&&<div style={{background:"rgba(52,211,153,.15)",border:"1px solid rgba(52,211,153,.3)",borderRadius:10,padding:"10px 12px"}}>
                  <div style={{fontFamily:MF,fontWeight:800,fontSize:16,color:C.greenMid,marginBottom:2}}>{dfDateExtra.toLocaleDateString("en-US",{month:"long",year:"numeric"})}</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,.6)"}}>🎉 {moSaved} months sooner · save {fmt(intSaved)} in interest</div>
                </div>}
                {extraPayDebt>0&&withExtra&&withExtra.months>=base.months&&<div style={{fontSize:12,color:"rgba(255,255,255,.4)"}}>Already at minimum threshold</div>}
              </div>
            </div>
          );
        })()}
        <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:20,marginBottom:14}}>
          <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>Payoff Strategy</div>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            {[["avalanche","Avalanche","Highest APR first"],["snowball","Snowball","Lowest balance first"]].map(([id,label,desc])=>(
              <button key={id} onClick={()=>setStrategy(id)} style={{flex:1,padding:"10px 8px",borderRadius:12,border:`1.5px solid ${strategy===id?C.accent:C.border}`,background:strategy===id?C.accentBg:C.surface,cursor:"pointer",textAlign:"left"}}>
                <div style={{fontSize:13,fontWeight:700,color:strategy===id?C.accent:C.text,marginBottom:2}}>{label}</div>
                <div style={{fontSize:11,color:C.textLight,lineHeight:1.3}}>{desc}</div>
              </button>
            ))}
          </div>
          <div style={{fontSize:12,fontWeight:600,color:C.textLight,marginBottom:10,textTransform:"uppercase",letterSpacing:.5}}>Priority Order</div>
          {prioritized.map((d,i)=>{
            const proj=calcPayoff(d);
            const color=PIE_COLORS[debts.indexOf(d)%PIE_COLORS.length];
            return(
              <div key={d.id} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"12px 0",borderBottom:i<prioritized.length-1?`1px solid ${C.border}`:"none"}}>
                <div style={{width:28,height:28,borderRadius:8,background:color+"20",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:MF,fontWeight:800,fontSize:13,color,flexShrink:0}}>#{i+1}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:2}}>{d.name}</div>
                  <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                    <span style={{fontSize:12,color:C.red,fontWeight:600}}>{fmt(parseFloat(d.balance)||0)}</span>
                    {d.rate&&<span style={{fontSize:12,color:C.textLight}}>{d.rate}% APR</span>}
                    <span style={{fontSize:12,color:proj.months<600?C.green:C.red,fontWeight:500}}>{proj.months<600?"Paid off "+proj.payoffDate:"Increase pmt"}</span>
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:11,color:C.textLight}}>Interest cost</div>
                  <div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>{proj.totalInterest<999999?fmt(proj.totalInterest):"High"}</div>
                </div>
              </div>
            );
          })}
        </div>
        {prioritized.map(d=>{
          const bal=parseFloat(d.balance)||0,orig=parseFloat(d.original)||bal,pct=Math.min(100,((orig-bal)/orig)*100);
          const mi=(parseFloat(d.rate)||0)/100/12*bal;
          const color=PIE_COLORS[debts.indexOf(d)%PIE_COLORS.length];
          return(
            <div key={d.id} style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:16,marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:10,height:10,borderRadius:3,background:color,flexShrink:0,marginTop:3}}/>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:C.text}}>{d.name}</div>
                    <div style={{display:"flex",gap:6,marginTop:2,flexWrap:"wrap"}}>
                      {d.type&&<span style={{fontSize:11,fontWeight:600,background:C.accentBg,color:C.accent,padding:"2px 6px",borderRadius:99}}>{d.type}</span>}
                      {d.rate&&<span style={{fontSize:11,color:C.textLight}}>{d.rate}% APR</span>}
                      {mi>0&&<span style={{fontSize:11,color:C.red}}>~{fmt(mi)}/mo interest</span>}
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontFamily:MF,fontWeight:800,fontSize:16,color:C.red}}>{fmt(bal)}</span>
                  <button onClick={()=>setPayModal(d)} style={{background:C.greenBg,border:`1px solid ${C.greenMid}`,borderRadius:8,cursor:"pointer",color:C.green,fontSize:11,fontWeight:700,padding:"4px 8px"}}>💳 Pay</button>
                  <button onClick={()=>setEditItem({type:"debt",data:d})} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,fontSize:12,fontWeight:600,padding:"4px 6px"}}>Edit</button>
                  <button onClick={()=>{setDebts(p=>p.filter(x=>x.id!==d.id));showToast&&showToast("Debt removed","error");}} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,padding:"4px 3px",display:"flex"}}><Trash2 size={13}/></button>
                </div>
              </div>
              {d.original&&<><BarProg pct={pct} color={pct>60?C.green:pct>30?C.accent:C.red} h={6}/><div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:11,color:C.textLight}}><span>{pct.toFixed(0)}% paid off</span><span>of {fmt(orig)}</span></div></>}
            </div>
          );
        })}
      </>}
  
    {debts.length>0&&(()=>{
      const extra=50;
      const ordered=strategy==="avalanche"
        ?[...debts].sort((a,b)=>(parseFloat(b.rate)||0)-(parseFloat(a.rate)||0))
        :[...debts].sort((a,b)=>(parseFloat(a.balance)||0)-(parseFloat(b.balance)||0));
      let rolling=extra;
      const plan=ordered.map(d=>{
        const po=calcPayoff({...d,balance:String(parseFloat(d.balance||0))});
        const minPay=parseFloat(d.minPayment)||Math.max(25,parseFloat(d.balance||0)*0.02);
        const mo=po.months;
        const result2={name:d.name,months:mo,minPay,extra:rolling,interest:po.totalInterest,color:d.color||PIE_COLORS[0]};
        rolling+=minPay;
        return result2;
      });
      const maxMo=Math.max(...plan.map(p=>p.months).filter(m=>m<500));
      return(<div style={{background:C.surface,borderRadius:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:'14px',marginTop:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Payoff Schedule</div>
          <div style={{display:'flex',gap:4,background:C.borderLight,borderRadius:8,padding:2}}>
            {[['avalanche','⬆ Rate'],['snowball','⬇ Balance']].map(([s,l])=><button key={s} onClick={()=>setStrategy(s)} style={{padding:'5px 10px',borderRadius:6,border:'none',background:strategy===s?C.surface:'transparent',fontWeight:strategy===s?700:500,fontSize:11,cursor:'pointer',color:strategy===s?C.accent:C.textMid}}>{l}</button>)}
          </div>
        </div>
        <div style={{fontSize:11,color:C.textLight,marginBottom:10}}>+${extra}/mo snowball applied • {strategy==="avalanche"?"Highest rate first":"Smallest balance first"}</div>
        {plan.map((p,i)=><div key={p.name} style={{marginBottom:10}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
            <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:8,height:8,borderRadius:'50%',background:p.color}}/><span style={{fontSize:13,fontWeight:600,color:C.text}}>{p.name}</span>{i===0&&<span style={{fontSize:10,background:C.accentBg,color:C.accent,borderRadius:4,padding:'1px 5px',fontWeight:700}}>ATTACK</span>}</div>
            <span style={{fontSize:12,fontFamily:MF,fontWeight:700,color:p.months<500?C.text:C.red}}>{p.months<500?p.months+'mo':'∞'}</span>
          </div>
          <div style={{height:6,background:C.borderLight,borderRadius:3}}><div style={{height:6,width:p.months<500?((p.months/Math.max(maxMo,1))*100).toFixed(1)+'%':'100%',background:p.color,borderRadius:3}}/></div>
          <div style={{fontSize:11,color:C.textLight,marginTop:2}}>+${p.extra.toFixed(0)}/mo · {fmt(p.interest)} interest</div>
        </div>)}
        <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between'}}>
          <div style={{fontSize:12,color:C.textLight}}>Total interest: <span style={{fontWeight:700,color:C.red}}>{fmt(plan.reduce((s,p)=>s+(p.interest<999999?p.interest:0),0))}</span></div>
          <div style={{fontSize:12,color:C.textLight}}>Debt-free in: <span style={{fontWeight:700,color:C.green}}>{Math.max(...plan.map(p=>p.months).filter(m=>m<500))}mo</span></div>
        </div>
      </div>);
    })()}
        {payModal&&<ExtraPayModal debt={payModal} onConfirm={pay=>{setDebts(p=>p.map(x=>x.id===payModal.id?{...x,balance:String(Math.max(0,parseFloat(x.balance||0)-pay))}:x));showToast("Payment applied!");setSelectedDebt(null);setPayModal(null);}} onClose={()=>setPayModal(null)}/>}
    </div>
  );
}

function GoalRing({pct,size=80,color,icon,label,saved,target}){
  const r=30,c=2*Math.PI*r;
  const filled=Math.min(1,pct/100)*c;
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
      <div style={{position:"relative",width:size,height:size}}>
        <svg width={size} height={size} viewBox="0 0 80 80" style={{transform:"rotate(-90deg)"}}>
          <circle cx="40" cy="40" r={r} fill="none" stroke={C.borderLight} strokeWidth="8"/>
          <circle cx="40" cy="40" r={r} fill="none" stroke={color||C.accent} strokeWidth="8" strokeDasharray={`${filled} ${c}`} strokeLinecap="round" style={{transition:"stroke-dasharray .6s ease"}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
          <span style={{fontSize:18}}>{icon||"🎯"}</span>
          <span style={{fontSize:10,fontWeight:700,color:color||C.accent}}>{Math.round(pct)}%</span>
        </div>
      </div>
      <div style={{textAlign:"center",maxWidth:80}}>
        <div style={{fontSize:11,fontWeight:700,color:C.text,lineHeight:1.2}}>{label}</div>
        <div style={{fontSize:10,color:C.textLight,marginTop:1}}>{fmt(saved)}/{fmt(target)}</div>
      </div>
    </div>
  );
}

function SavingsGoalsView({goals,setGoals,income,accounts,accountRates={},setAccountRates,showToast}){
  const[view,setView]=useState("rings");
  const[editGoal,setEditGoal]=useState(null);
  const[editForm,setEditForm]=useState({});
  const[showAdd,setShowAdd]=useState(false);
  const[form,setForm]=useState({});
  const ff=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  function add(){if(!form.name||!form.target)return;setGoals(p=>[...p,{id:Date.now().toString(),name:form.name,target:parseFloat(form.target),saved:parseFloat(form.saved||0),monthly:parseFloat(form.monthly||0),icon:form.icon||"🎯",color:form.color||C.teal}]);showToast&&showToast("✓ Goal added — "+form.name);setForm({});setShowAdd(false);}
  function GoalRingInner({goal}){
    const pct=Math.min(100,(goal.saved/goal.target)*100);
    const r=44;const circ=2*Math.PI*r;const dash=circ*(pct/100);
    const mo=goal.monthly||0;const rem=Math.max(0,goal.target-goal.saved);
    const months=mo>0?Math.ceil(rem/mo):0;
    const targetDate=months>0?(()=>{const d=new Date();d.setMonth(d.getMonth()+months);return d.toLocaleDateString("en-US",{month:"short",year:"numeric"});})():null;
    return(
      <div style={{background:C.surface,borderRadius:20,padding:20,display:"flex",flexDirection:"column",alignItems:"center",position:"relative",boxShadow:"0 2px 8px rgba(10,22,40,.06),0 1px 3px rgba(10,22,40,.04)"}}>
        <div style={{position:"relative",width:120,height:120,marginBottom:12}}>
          <svg width="120" height="120" viewBox="0 0 120 120" style={{transform:"rotate(-90deg)"}}>
            <circle cx="60" cy="60" r={r} fill="none" stroke={C.borderLight} strokeWidth="10"/>
            <circle cx="60" cy="60" r={r} fill="none" stroke={goal.color||C.teal} strokeWidth="10" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{transition:"stroke-dasharray .6s ease"}}/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <div style={{fontSize:24}}>{goal.icon||"🎯"}</div>
            <div style={{fontFamily:MF,fontWeight:800,fontSize:16,color:C.text}}>{pct.toFixed(0)}%</div>
          </div>
        </div>
        <div onClick={()=>{setEditGoal(goal);setEditForm({name:goal.name,target:String(goal.target),monthly:String(goal.monthly||0),saved:String(goal.saved||0)});}} style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:2,textAlign:"center",cursor:"pointer"}}>{goal.name} <span style={{fontSize:11,color:C.textLight}}>✎</span></div>
        <div style={{fontSize:12,color:C.textLight,marginBottom:8,textAlign:"center"}}>{fmt(goal.saved)} of {fmt(goal.target)}</div>
        {months>0&&<div style={{fontSize:11,color:C.green,fontWeight:600,marginBottom:4}}>{months} mo · {targetDate}</div>}
        <div style={{display:"flex",gap:6,width:"100%"}}>
          <input type="number" placeholder="Deposit $" id={"dep-"+goal.id} onKeyDown={e=>{if(e.key==="Enter"&&e.target.value){const amt=parseFloat(e.target.value);if(amt>0){setGoals(p=>p.map(g=>g.id===goal.id?{...g,saved:Math.min(g.target,(g.saved||0)+amt)}:g));showToast&&showToast("+" + fmt(amt)+" added to "+goal.name);e.target.value="";}}}  } style={{flex:1,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"8px 10px",fontSize:13,color:C.text,outline:"none",background:C.surfaceAlt}}/>
          <button onClick={()=>{const inp=document.getElementById("dep-"+goal.id);const amt=parseFloat(inp?.value||0);if(amt>0){setGoals(p=>p.map(g=>{if(g.id!==goal.id)return g;const newSaved=Math.min(g.target,(g.saved||0)+amt);const oldPct=Math.floor(((g.saved||0)/g.target)*4)*25;const newPct=Math.floor((newSaved/g.target)*4)*25;if(newPct>oldPct){setTimeout(()=>showToast&&showToast(newSaved>=g.target?"🎉 Goal complete: "+g.name+"!":"🎯 "+newPct+"% reached — "+g.name),100);}else{showToast&&showToast("+"+fmt(amt)+" → "+g.name);}return{...g,saved:newSaved};}));if(inp)inp.value="";}}} style={{padding:"8px 12px",borderRadius:10,border:"none",background:C.green,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>+</button>
          <button onClick={()=>setGoals(p=>p.filter(g=>g.id!==goal.id))} style={{padding:"8px 10px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,cursor:"pointer",color:C.textLight}}>✕</button>
        </div>
      </div>
    );
  }
  const ICONS=["🎯","🏠","🚗","✈️","💍","📱","🎓","🐕","💪","🌴","🏖️","💰"];
  const COLORS=[C.accent,C.green,C.purple,C.amber,C.red,C.teal,C.purple];
  return(
    <div className="fu">
      <div style={{display:"flex",gap:6,background:C.borderLight,borderRadius:12,padding:4,marginBottom:16}}>
        {[["rings","Rings"],["list","List"],["earn","💰 Earn"]].map(([id,l])=>(<button key={id} onClick={()=>setView(id)} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",background:view===id?C.surface:"transparent",color:view===id?C.accent:C.textLight,fontWeight:view===id?700:500,fontSize:13,cursor:"pointer"}}>{l}</button>))}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:goals.length>0?10:16}}>
        <div><div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.3}}>Savings Goals</div><div style={{fontSize:13,color:C.textLight}}>{goals.length} goal{goals.length!==1?"s":""} · {fmt(goals.reduce((s,g)=>s+(parseFloat(g.saved||0)),0))} saved total</div></div>
        <button onClick={()=>setShowAdd(true)} style={{display:"flex",alignItems:"center",gap:5,background:C.accent,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer"}}><Plus size={13}/>Add Goal</button>
      </div>
      {goals.length>0&&(()=>{const totalTarget=goals.reduce((s,g)=>s+(parseFloat(g.target||0)),0);const totalSaved=goals.reduce((s,g)=>s+(parseFloat(g.saved||0)),0);const overallPct=totalTarget>0?Math.min(100,(totalSaved/totalTarget)*100):0;const complete=goals.filter(g=>parseFloat(g.saved||0)>=parseFloat(g.target||1)).length;return(<div style={{background:C.surface,borderRadius:14,padding:"12px 16px",marginBottom:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:13,fontWeight:600,color:C.text}}>Overall Progress</span><span style={{fontSize:13,fontWeight:700,color:C.green}}>{fmt(totalSaved)} / {fmt(totalTarget)}</span></div><div style={{height:8,background:C.borderLight,borderRadius:99,overflow:"hidden",marginBottom:5}}><div style={{height:"100%",width:overallPct.toFixed(1)+"%",background:`linear-gradient(90deg,${C.teal},${C.green})`,borderRadius:99,transition:"width .6s"}}/></div><div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.textLight}}><span>{overallPct.toFixed(0)}% of total goals</span><span>{complete}/{goals.length} complete</span></div></div>);})()}
      {goals.length>0&&(()=>{
        const totalTarget=goals.reduce((s,g)=>s+(parseFloat(g.target||0)),0);
        const totalSaved=goals.reduce((s,g)=>s+(parseFloat(g.saved||0)),0);
        if(!totalTarget)return null;
        const pct=Math.min(100,(totalSaved/totalTarget)*100);
        const complete=goals.filter(g=>parseFloat(g.saved||0)>=parseFloat(g.target||1)).length;
        const nearComplete=goals.filter(g=>{const p=parseFloat(g.target||1)>0?(parseFloat(g.saved||0)/parseFloat(g.target))*100:0;return p>=75&&p<100;});
        return(<div style={{background:`linear-gradient(135deg,${C.navy},${C.navyLight})`,borderRadius:16,padding:18,marginBottom:14,color:'#fff'}}>
          <div style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:.5,marginBottom:4}}>All Goals Progress</div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:10}}>
            <div><div style={{fontFamily:MF,fontWeight:800,fontSize:26,color:'#fff'}}>{fmt(totalSaved)}</div><div style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>of {fmt(totalTarget)} total</div></div>
            <div style={{textAlign:'right'}}><div style={{fontFamily:MF,fontWeight:800,fontSize:22,color:C.green}}>{pct.toFixed(0)}%</div><div style={{fontSize:11,color:'rgba(255,255,255,.5)'}}>{complete}/{goals.length} complete</div></div>
          </div>
          <div style={{height:8,background:'rgba(255,255,255,.15)',borderRadius:99,overflow:'hidden',marginBottom:10}}>
            <div style={{height:'100%',width:pct.toFixed(1)+'%',background:`linear-gradient(90deg,${C.teal},${C.green})`,borderRadius:99,transition:'width .6s'}}/>
          </div>
          {nearComplete.length>0&&<div style={{fontSize:12,color:C.amberMid}}>⚡ {nearComplete.map(g=>g.name).join(', ')} almost done!</div>}
        </div>);
      })()}
      {goals.length>0&&goals.some(g=>parseFloat(g.monthly||0)>0)&&(()=>{
        // Build projected savings chart — next 12 months
        const now2=new Date();
        const chartData=Array.from({length:13},(_,mo)=>{
          const point={month:mo===0?"Now":FULL_MOS[new Date(now2.getFullYear(),now2.getMonth()+mo,1).getMonth()].slice(0,3)};
          goals.forEach(g=>{
            const monthly2=parseFloat(g.monthly||0);
            const projected=Math.min(parseFloat(g.target||0),(parseFloat(g.saved||0))+(monthly2*mo));
            point[g.name]=parseFloat(projected.toFixed(0));
          });
          return point;
        });
        const GOAL_COLORS=[C.teal,C.accent,C.green,C.purple,C.amber];
        return(
          <div style={{background:C.surface,borderRadius:18,padding:18,marginBottom:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)"}}>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>12-Month Projection</div>
            <div style={{fontSize:12,color:C.textLight,marginBottom:14}}>Where each goal lands if you contribute monthly</div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{left:-10,right:4,top:4,bottom:0}}>
                <XAxis dataKey="month" tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:C.textLight,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v>=1000?(v/1000).toFixed(0)+"k":v)} width={38}/>
                <Tooltip formatter={(v,n)=>[fmt(v),n]} contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,fontSize:12}}/>
                {goals.filter(g=>parseFloat(g.monthly||0)>0).map((g,i)=>(
                  <Line key={g.id} type="monotone" dataKey={g.name} stroke={g.color||GOAL_COLORS[i%GOAL_COLORS.length]} strokeWidth={2.5} dot={false} strokeDasharray={i>0?"4 2":"none"}/>
                ))}
              </LineChart>
            </ResponsiveContainer>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>
              {goals.filter(g=>parseFloat(g.monthly||0)>0).map((g,i)=>{
                const rem=Math.max(0,parseFloat(g.target||0)-parseFloat(g.saved||0));
                const mo=parseFloat(g.monthly||0);
                const months2=mo>0?Math.ceil(rem/mo):0;
                return(<div key={g.id} style={{display:"flex",alignItems:"center",gap:5,fontSize:11}}>
                  <div style={{width:10,height:2,background:g.color||GOAL_COLORS[i%GOAL_COLORS.length],borderRadius:1}}/>
                  <span style={{color:C.textMid,fontWeight:500}}>{g.name}</span>
                  {months2>0&&<span style={{color:C.textLight}}>·{months2}mo</span>}
                </div>);
              })}
            </div>
          </div>
        );
      })()}
      {goals.length===0&&<div style={{textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:48,marginBottom:12}}>🎯</div><div style={{fontFamily:MF,fontSize:16,fontWeight:700,color:C.text,marginBottom:8}}>No savings goals yet</div><div style={{fontSize:13,color:C.textLight,marginBottom:20}}>Set a goal and watch your ring fill up</div><button onClick={()=>setShowAdd(true)} style={{padding:"12px 24px",borderRadius:14,background:C.accent,border:"none",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>Add First Goal</button></div>}
      {view==="rings"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        {goals.map(g=><div key={g.id} style={{position:"relative"}}><GoalRingInner goal={{...g,saved:parseFloat(g.saved||0),target:parseFloat(g.target||0),monthly:parseFloat(g.monthly||0)}}/><button onClick={()=>{setGoals(p=>p.filter(x=>x.id!==g.id));showToast&&showToast("Goal removed","error");}} style={{position:"absolute",top:4,right:4,background:"rgba(0,0,0,.06)",border:"none",borderRadius:"50%",width:24,height:24,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><X size={12} color={C.textLight}/></button></div>)}
      </div>}
      {view==="list"&&<div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
        {goals.map(g=>{
          const saved=parseFloat(g.saved||0),target=parseFloat(g.target||0),pct=target>0?Math.min(100,(saved/target)*100):0;
          const mo=parseFloat(g.monthly||0),rem=Math.max(0,target-saved),months=mo>0?Math.ceil(rem/mo):0;
          const targetDate=months>0?(()=>{const d=new Date();d.setMonth(d.getMonth()+months);return d.toLocaleDateString("en-US",{month:"short",year:"numeric"});})():null;
          return(<div key={g.id} style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:16}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
              <div style={{width:44,height:44,borderRadius:12,background:(g.color||C.teal)+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{g.icon||"🎯"}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:15,fontWeight:700,color:C.text}}>{g.name}</div>
                <div style={{fontSize:12,color:C.textLight}}>{fmt(saved)} of {fmt(target)}{months>0?" · "+months+" mo to go":pct>=100?" 🎉 Complete!":""}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontFamily:MF,fontWeight:800,fontSize:18,color:g.color||C.teal}}>{pct.toFixed(0)}%</div>
                {targetDate&&<div style={{fontSize:11,color:C.textLight}}>{targetDate}</div>}
              </div>
            </div>
            <div style={{height:8,background:C.borderLight,borderRadius:99,overflow:"hidden",marginBottom:12}}>
              <div style={{height:"100%",width:pct.toFixed(1)+"%",background:pct>=100?C.green:g.color||C.teal,borderRadius:99,transition:"width .6s"}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <input type="number" placeholder="Deposit $" id={"ldep-"+g.id} style={{flex:1,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"8px 10px",fontSize:13,color:C.text,outline:"none",background:C.surfaceAlt}}
                onKeyDown={e=>{if(e.key==="Enter"&&e.target.value){const a=parseFloat(e.target.value);if(a>0){setGoals(p=>p.map(x=>{if(x.id!==g.id)return x;const ns=Math.min(x.target,(x.saved||0)+a);if(ns>=x.target)setTimeout(()=>showToast&&showToast("🎉 Goal complete: "+x.name),100);else showToast&&showToast("+"+fmt(a)+" → "+x.name);return{...x,saved:ns};}));e.target.value='';}};}}/>
              <button onClick={()=>{const inp=document.getElementById("ldep-"+g.id);const a=parseFloat(inp?.value||0);if(a>0){setGoals(p=>p.map(x=>{if(x.id!==g.id)return x;const ns=Math.min(x.target,(x.saved||0)+a);if(ns>=x.target)setTimeout(()=>showToast&&showToast("🎉 Goal complete: "+x.name),100);else showToast&&showToast("+"+fmt(a)+" → "+x.name);return{...x,saved:ns};}));if(inp)inp.value="";}}} style={{padding:"8px 12px",borderRadius:10,border:"none",background:C.green,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>+</button>
              <button onClick={()=>{setEditGoal(g);setEditForm({name:g.name,target:String(g.target),monthly:String(g.monthly||0),saved:String(g.saved||0)});}} style={{padding:"8px 10px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,cursor:"pointer",fontSize:12,color:C.textMid,fontWeight:600}}>Edit</button>
              <button onClick={()=>{setGoals(p=>p.filter(x=>x.id!==g.id));showToast&&showToast("Goal removed","error");}} style={{padding:"8px 10px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,cursor:"pointer",color:C.textLight,display:"flex",alignItems:"center"}}><Trash2 size={14}/></button>
            </div>
          </div>);
        })}
      </div>}
      {view==="earn"&&(()=>{
        // Per-account APY configuration + earnings calculator
        const ACCT_CONFIG=[
          {key:"checking",  label:"Checking",    icon:"🏦", desc:"Most earn 0–0.1%. Online banks offer more."},
          {key:"savings",   label:"Savings",     icon:"💰", desc:"National avg ~0.5%. HYSA rates 4–5%."},
          {key:"cushion",   label:"Emergency Fund",icon:"🛡️",desc:"Keep liquid in HYSA for 4–5% return."},
          {key:"k401",      label:"401(k)",      icon:"🏢", desc:"Stock market returns avg ~7-10%/yr long-term."},
          {key:"roth_ira",  label:"Roth IRA",    icon:"🌱", desc:"Tax-free growth. Index funds avg ~7-10%."},
          {key:"brokerage", label:"Brokerage",   icon:"📊", desc:"Depends on holdings. S&P 500 avg ~10%."},
          {key:"hsa",       label:"HSA",         icon:"🏥", desc:"Invested HSAs earn market returns."},
        ].filter(a=>parseFloat(accounts?.[a.key]||0)>0);

        const totalYearlyEarnings=ACCT_CONFIG.reduce((s,a)=>{
          const bal=parseFloat(accounts?.[a.key]||0);
          const rate=parseFloat(accountRates[a.key]||0);
          return s+(bal*(rate/100));
        },0);

        // Benchmark: what they'd earn with optimal rates
        const OPTIMAL_RATES={checking:0.5,savings:4.75,cushion:4.75,k401:7,roth_ira:7,brokerage:7,hsa:6};
        const optimalEarnings=ACCT_CONFIG.reduce((s,a)=>{
          const bal=parseFloat(accounts?.[a.key]||0);
          const optimal=OPTIMAL_RATES[a.key]||4;
          return s+(bal*(optimal/100));
        },0);
        const leaveOnTable=Math.max(0,optimalEarnings-totalYearlyEarnings);

        // Tips based on their actual data
        const tips=[];
        ACCT_CONFIG.forEach(a=>{
          const bal=parseFloat(accounts?.[a.key]||0);
          const rate=parseFloat(accountRates[a.key]||0);
          const optimal=OPTIMAL_RATES[a.key]||4;
          if(rate<1&&["savings","cushion","checking"].includes(a.key)&&bal>500){
            const gain=bal*(optimal-Math.max(rate,0))/100;
            tips.push({icon:"⚡",color:C.green,title:`Move ${a.label} to a HYSA`,body:`Earn ~${optimal}% instead of ${rate||0}% — that's ${fmt(gain)} more per year (${fmt(gain/12)}/mo).`,urgency:"high"});
          }
          if(rate===0&&["k401","roth_ira","brokerage"].includes(a.key)&&bal>0){
            tips.push({icon:"📈",color:C.accent,title:`Set a return assumption for ${a.label}`,body:`Enter your expected annual return above so we can project your growth accurately. S&P 500 averages ~10%/yr historically.`,urgency:"low"});
          }
        });
        if(ACCT_CONFIG.length===0){
          tips.push({icon:"💡",color:C.accent,title:"Add your account balances first",body:"Go to Accounts & Income and enter your balances. Then come back here to see what they're earning.",urgency:"low"});
        }

        return(
          <div>
            {/* Earnings summary bar */}
            <div style={{background:"#0A1628",borderRadius:16,padding:18,marginBottom:14}}>
              <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.4)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Your Money Earns</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:10}}>
                <div>
                  <div style={{fontFamily:MF,fontWeight:900,fontSize:32,color:"#34D399",letterSpacing:-1}}>{fmt(totalYearlyEarnings)}/yr</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,.4)",marginTop:2}}>{fmt(totalYearlyEarnings/12)}/mo across all accounts</div>
                </div>
                {leaveOnTable>50&&<div style={{textAlign:"right"}}>
                  <div style={{fontSize:11,color:"rgba(255,255,255,.4)"}}>could earn</div>
                  <div style={{fontFamily:MF,fontWeight:800,fontSize:16,color:"#F59E0B"}}>{fmt(leaveOnTable)}/yr more</div>
                </div>}
              </div>
              {totalYearlyEarnings===0&&ACCT_CONFIG.length>0&&<div style={{fontSize:12,color:"rgba(255,255,255,.4)"}}>Enter APY rates below to see your earnings</div>}
            </div>

            {/* Per-account APY inputs */}
            <div style={{background:C.surface,borderRadius:16,padding:16,marginBottom:14,boxShadow:"0 1px 3px rgba(10,22,40,.06)"}}>
              <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>Your Account Rates</div>
              <div style={{fontSize:12,color:C.textLight,marginBottom:14}}>Enter the APY from your bank's website or statement</div>
              {ACCT_CONFIG.length===0&&<div style={{fontSize:13,color:C.textLight,padding:"8px 0"}}>No accounts with balances found. Add balances in Accounts & Income.</div>}
              {ACCT_CONFIG.map(a=>{
                const bal=parseFloat(accounts?.[a.key]||0);
                const rate=parseFloat(accountRates[a.key]||0);
                const earned=bal*(rate/100);
                return(
                  <div key={a.key} style={{marginBottom:14}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:18}}>{a.icon}</span>
                        <div>
                          <div style={{fontSize:13,fontWeight:700,color:C.text}}>{a.label}</div>
                          <div style={{fontSize:11,color:C.textLight}}>{fmt(bal)} balance</div>
                        </div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        {rate>0&&<div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.green}}>{fmt(earned)}/yr</div>}
                        {rate>0&&<div style={{fontSize:10,color:C.textLight}}>{fmt(earned/12)}/mo</div>}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <div style={{position:"relative",flex:1}}>
                        <input
                          type="number"
                          step="0.01"
                          value={accountRates[a.key]||""}
                          onChange={e=>setAccountRates&&setAccountRates(p=>({...p,[a.key]:parseFloat(e.target.value)||0}))}
                          placeholder="0.00"
                          style={{width:"100%",background:C.surfaceAlt,border:`1.5px solid ${rate>0?C.green:C.border}`,borderRadius:10,padding:"9px 36px 9px 12px",fontSize:14,fontFamily:MF,fontWeight:700,color:rate>0?C.green:C.text,outline:"none",boxSizing:"border-box"}}
                        />
                        <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:12,fontWeight:700,color:C.textLight}}>%</span>
                      </div>
                      {/* Quick preset rates */}
                      <div style={{display:"flex",gap:4}}>
                        {(["savings","cushion","checking"].includes(a.key)?[0.5,4.75,5.0]:["k401","roth_ira","brokerage"].includes(a.key)?[6,7,10]:[4,5,6]).map(r=>(
                          <button key={r} onClick={()=>setAccountRates&&setAccountRates(p=>({...p,[a.key]:r}))}
                            style={{padding:"6px 9px",borderRadius:8,border:`1px solid ${Math.abs(rate-r)<0.01?C.green:C.border}`,background:Math.abs(rate-r)<0.01?C.greenBg:C.surface,color:Math.abs(rate-r)<0.01?C.green:C.textMid,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                            {r}%
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{fontSize:11,color:C.textLight,marginTop:4}}>{a.desc}</div>
                  </div>
                );
              })}
            </div>

            {/* Smart tips */}
            {tips.length>0&&(
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
                <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:2}}>💡 Personalized Tips</div>
                {tips.map((tip,i)=>(
                  <div key={i} style={{background:tip.urgency==="high"?C.greenBg:C.accentBg,border:`1px solid ${tip.urgency==="high"?C.greenMid:C.accentMid}`,borderRadius:12,padding:"12px 14px"}}>
                    <div style={{fontSize:13,fontWeight:700,color:tip.urgency==="high"?C.green:C.accent,marginBottom:4}}>{tip.icon} {tip.title}</div>
                    <div style={{fontSize:12,color:tip.urgency==="high"?C.green:C.accent,opacity:.85,lineHeight:1.5}}>{tip.body}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Projection table with their real rates */}
            {totalYearlyEarnings>0&&ACCT_CONFIG.length>0&&(
              <div style={{background:C.surface,borderRadius:16,padding:16,boxShadow:"0 1px 3px rgba(10,22,40,.06)"}}>
                <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:12}}>Growth Projection</div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead>
                      <tr style={{borderBottom:`1px solid ${C.border}`}}>
                        {["Account","Balance","APY","1 Year","5 Years","10 Years"].map(h=>(
                          <td key={h} style={{padding:"4px 8px",fontWeight:700,color:C.textLight,fontSize:10,textTransform:"uppercase",letterSpacing:.4}}>{h}</td>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ACCT_CONFIG.map(a=>{
                        const bal=parseFloat(accounts?.[a.key]||0);
                        const rate=parseFloat(accountRates[a.key]||0)/100;
                        const yr1=rate>0?bal*rate:0;
                        const yr5=rate>0?bal*(Math.pow(1+rate,5)-1):0;
                        const yr10=rate>0?bal*(Math.pow(1+rate,10)-1):0;
                        return(
                          <tr key={a.key} style={{borderBottom:`1px solid ${C.borderLight}`}}>
                            <td style={{padding:"8px 8px",fontWeight:600,color:C.text}}>{a.icon} {a.label}</td>
                            <td style={{padding:"8px 8px",fontFamily:MF,color:C.textMid}}>{fmt(bal)}</td>
                            <td style={{padding:"8px 8px",fontFamily:MF,fontWeight:700,color:rate>0?C.green:C.textFaint}}>{rate>0?(rate*100).toFixed(2)+"%":"—"}</td>
                            <td style={{padding:"8px 8px",fontFamily:MF,color:C.green}}>{rate>0?"+"+fmt(yr1):"—"}</td>
                            <td style={{padding:"8px 8px",fontFamily:MF,color:C.green}}>{rate>0?"+"+fmt(yr5):"—"}</td>
                            <td style={{padding:"8px 8px",fontFamily:MF,fontWeight:700,color:C.green}}>{rate>0?"+"+fmt(yr10):"—"}</td>
                          </tr>
                        );
                      })}
                      <tr style={{borderTop:`2px solid ${C.border}`,background:C.surfaceAlt}}>
                        <td colSpan={3} style={{padding:"8px 8px",fontWeight:700,color:C.text,fontSize:12}}>Total Earnings</td>
                        <td style={{padding:"8px 8px",fontFamily:MF,fontWeight:700,color:C.green}}>{fmt(totalYearlyEarnings)}</td>
                        <td style={{padding:"8px 8px",fontFamily:MF,fontWeight:700,color:C.green}}>{fmt(ACCT_CONFIG.reduce((s,a)=>{const b=parseFloat(accounts?.[a.key]||0);const r=parseFloat(accountRates[a.key]||0)/100;return s+(r>0?b*(Math.pow(1+r,5)-1):0);},0))}</td>
                        <td style={{padding:"8px 8px",fontFamily:MF,fontWeight:700,color:C.green}}>{fmt(ACCT_CONFIG.reduce((s,a)=>{const b=parseFloat(accounts?.[a.key]||0);const r=parseFloat(accountRates[a.key]||0)/100;return s+(r>0?b*(Math.pow(1+r,10)-1):0);},0))}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}
      {editGoal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:9999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setEditGoal(null)}><div style={{background:"#fff",borderRadius:"24px 24px 0 0",padding:28,width:"100%",maxWidth:480}} onClick={e=>e.stopPropagation()}><div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text,marginBottom:16}}>Edit Goal</div><FI label="Goal Name" value={editForm.name||""} onChange={e=>setEditForm(p=>({...p,name:e.target.value}))}/><div style={{display:"flex",gap:10}}><FI half label="Target ($)" type="number" value={editForm.target||""} onChange={e=>setEditForm(p=>({...p,target:e.target.value}))}/><FI half label="Saved ($)" type="number" value={editForm.saved||""} onChange={e=>setEditForm(p=>({...p,saved:e.target.value}))}/></div><FI label="Monthly Contribution ($)" type="number" value={editForm.monthly||""} onChange={e=>setEditForm(p=>({...p,monthly:e.target.value}))}/><div style={{display:"flex",gap:10,marginTop:8}}><button onClick={()=>setEditGoal(null)} style={{flex:1,padding:"13px",borderRadius:14,border:`1.5px solid ${C.border}`,background:C.surface,color:C.textMid,fontWeight:700,fontSize:16,cursor:"pointer"}}>Cancel</button><button onClick={()=>{setGoals(p=>p.map(g=>g.id===editGoal.id?{...g,name:editForm.name||g.name,target:parseFloat(editForm.target)||g.target,saved:parseFloat(editForm.saved||0),monthly:parseFloat(editForm.monthly||0)}:g));showToast&&showToast("Goal updated!");setEditGoal(null);}} style={{flex:2,padding:"13px",borderRadius:14,border:"none",background:C.accent,color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:MF}}>Save Changes</button></div></div></div>}
            {showAdd&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:9999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowAdd(false)}>
          <div style={{background:"#fff",borderRadius:"24px 24px 0 0",padding:28,width:"100%",maxWidth:480}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text,marginBottom:16}}>New Savings Goal</div>
            <FI label="Goal Name" placeholder="Emergency Fund, New Car..." value={form.name||""} onChange={ff("name")} autoFocus/>
            <div style={{display:"flex",gap:10}}><FI half label="Target ($)" type="number" placeholder="5000" value={form.target||""} onChange={ff("target")}/><FI half label="Saved So Far ($)" type="number" placeholder="0" value={form.saved||""} onChange={ff("saved")}/></div>
            <FI label="Monthly Contribution ($)" type="number" placeholder="200" value={form.monthly||""} onChange={ff("monthly")}/>
            <div style={{marginBottom:12}}><div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Icon</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{ICONS.map(ic=><button key={ic} onClick={()=>setForm(p=>({...p,icon:ic}))} style={{fontSize:22,padding:6,borderRadius:10,border:`2px solid ${form.icon===ic?C.accent:C.border}`,background:form.icon===ic?C.accentBg:"#fff",cursor:"pointer"}}>{ic}</button>)}</div></div>
            <div style={{marginBottom:20}}><div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Color</div><div style={{display:"flex",gap:8}}>{COLORS.map(c=><button key={c} onClick={()=>setForm(p=>({...p,color:c}))} style={{width:32,height:32,borderRadius:"50%",background:c,border:`3px solid ${form.color===c?"#fff":c}`,outline:form.color===c?`2px solid ${c}`:"none",cursor:"pointer"}}/>)}</div></div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:"13px",borderRadius:14,border:`1.5px solid ${C.border}`,background:C.surface,color:C.textMid,fontWeight:700,fontSize:16,cursor:"pointer"}}>Cancel</button>
              <button onClick={add} style={{flex:2,padding:"13px",borderRadius:14,border:"none",background:C.accent,color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:MF}}>Add Goal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditModal({item,categories,household,onSave,onDelete,onClose}){
  const[form,setForm]=useState({...item.data});
  const ff=(k,v)=>setForm(p=>({...p,[k]:v}));
  const type=item.type;
  function save(){if(type==="expense"&&(!form.name||!form.amount))return;if(type==="bill"&&(!form.name||!form.amount))return;if(type==="debt"&&(!form.name||!form.balance))return;onSave(form);onClose();}
  const accent=type==="expense"?C.accent:type==="bill"?C.amber:C.red;
  const title=type==="expense"?"Edit Expense":type==="bill"?"Edit Bill":"Edit Debt";
  const Icon=type==="expense"?Wallet:type==="bill"?CalendarClock:CreditCard;
  return(
    <Modal title={title} icon={Icon} onClose={onClose} onSubmit={save} submitLabel="Save Changes" accent={accent} wide>
      {(type==="expense"||type==="bill")&&<FI label="Name" value={form.name||""} onChange={e=>ff("name",e.target.value)}/>}
      {type==="debt"&&<FI label="Debt Name" value={form.name||""} onChange={e=>ff("name",e.target.value)}/>}
      {type==="expense"&&<><div style={{display:"flex",gap:12}}><FI half label="Amount ($)" type="number" value={form.amount||""} onChange={e=>ff("amount",e.target.value)}/><FI half label="Date" type="date" value={form.date||todayStr()} onChange={e=>ff("date",e.target.value)}/></div><FS label="Category" options={categories.map(c=>c.name)} value={form.category||""} onChange={e=>ff("category",e.target.value)}/><FI label="Notes" value={form.notes||""} onChange={e=>ff("notes",e.target.value)}/>
          {household?.enabled&&household?.members?.length>1&&item?.data?.type!=="bill"&&<div style={{marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Assign to</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {[{id:"shared",name:"Shared",emoji:"🏠"},...(household.members||[])].map(m=>(
                <button key={m.id} onClick={()=>ff("owner",m.id)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:99,border:`1.5px solid ${(form.owner||item?.data?.owner||"shared")===m.id?C.accent:C.border}`,background:(form.owner||item?.data?.owner||"shared")===m.id?C.accentBg:"transparent",cursor:"pointer",fontSize:12,fontWeight:(form.owner||item?.data?.owner||"shared")===m.id?700:400,color:(form.owner||item?.data?.owner||"shared")===m.id?C.accent:C.textMid}}>
                  <span>{m.emoji}</span><span>{m.name}</span>
                </button>
              ))}
            </div>
          </div>}
          <div style={{marginBottom:12}}><div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Tags</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{["food","transport","health","work","personal","family","fun","recurring"].map(tag=>{const on=(form.tags||[]).includes(tag);return(<button key={tag} onClick={()=>ff("tags",on?(form.tags||[]).filter(t=>t!==tag):[...(form.tags||[]),tag])} style={{padding:"5px 12px",borderRadius:99,border:`1.5px solid ${on?C.accent:C.border}`,background:on?C.accentBg:C.surface,color:on?C.accent:C.textMid,fontSize:12,fontWeight:on?700:500,cursor:"pointer"}}>{tag}</button>);})}</div></div></>}
      {type==="bill"&&<><div style={{display:"flex",gap:12}}><FI half label="Amount ($)" type="number" value={form.amount||""} onChange={e=>ff("amount",e.target.value)}/><FI half label="Due Date" type="date" value={form.dueDate||""} onChange={e=>ff("dueDate",e.target.value)}/></div><FS label="Recurring" options={["Monthly","Bi-weekly","Quarterly","Annual","One-time"]} value={form.recurring||""} onChange={e=>ff("recurring",e.target.value)}/><FI label="Notes (optional)" value={form.notes||""} onChange={e=>ff("notes",e.target.value)}/><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderTop:`1px solid ${C.border}`,marginTop:4}}><div><div style={{fontSize:13,fontWeight:600,color:C.text}}>Auto-Pay</div><div style={{fontSize:12,color:C.textLight}}>Mark as automatically paid</div></div><button onClick={()=>ff("autoPay",!form.autoPay)} style={{background:"none",border:"none",cursor:"pointer",color:form.autoPay?C.accent:C.borderLight,padding:0,display:"flex"}}>{form.autoPay?<ToggleRight size={30}/>:<ToggleLeft size={30}/>}</button></div></>}
      {type==="debt"&&<><div style={{display:"flex",gap:12}}><FI half label="Balance ($)" type="number" value={form.balance||""} onChange={e=>ff("balance",e.target.value)}/><FI half label="Original ($)" type="number" value={form.original||""} onChange={e=>ff("original",e.target.value)}/></div><div style={{display:"flex",gap:12}}><FI half label="Rate %" type="number" value={form.rate||""} onChange={e=>ff("rate",e.target.value)}/><FI half label="Min Payment ($)" type="number" value={form.minPayment||""} onChange={e=>ff("minPayment",e.target.value)}/></div></>}
      <button className="ba" onClick={()=>{onDelete();onClose();}} style={{width:"100%",background:C.redBg,border:`1px solid ${C.redMid}`,borderRadius:12,padding:"13px 0",color:C.red,fontWeight:700,fontSize:14,cursor:"pointer",marginTop:6}}>🗑 Delete</button>
    </Modal>
  );
}

function TradingView({trades,setTrades,account,setAccount,showToast}){
  const[showAdd,setShowAdd]=useState(false);const[form,setForm]=useState({});const ff=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  function add(){if(!form.symbol||!form.pnl)return;setTrades(p=>[{id:Date.now(),date:form.date||todayStr(),symbol:form.symbol.toUpperCase(),side:form.side||"Long",contracts:form.contracts||"1",entry:form.entry||"",exit:form.exit||"",pnl:form.pnl,note:form.note||""},...p]);showToast&&showToast((parseFloat(form.pnl)>=0?"✅":"❌")+" Trade logged — "+form.symbol.toUpperCase());setForm({});setShowAdd(false);}
  const totalPnl=trades.reduce((s,t)=>s+(parseFloat(t.pnl)||0),0);const wins=trades.filter(t=>parseFloat(t.pnl)>0);const losses=trades.filter(t=>parseFloat(t.pnl)<0);
  const winRate=trades.length>0?((wins.length/trades.length)*100).toFixed(0):0;const avgWin=wins.length>0?wins.reduce((s,t)=>s+(parseFloat(t.pnl)||0),0)/wins.length:0;const avgLoss=losses.length>0?Math.abs(losses.reduce((s,t)=>s+(parseFloat(t.pnl)||0),0)/losses.length):0;
  const bal=parseFloat(account.balance||0),dep=parseFloat(account.deposit||0),ret=dep>0?((bal-dep)/dep*100).toFixed(1):0;
  const monthly=trades.reduce((a,t)=>{const m=t.date?FULL_MOS[new Date(t.date).getMonth()].slice(0,3):"?";a[m]=(a[m]||0)+(parseFloat(t.pnl)||0);return a},{});
  const chartData=Object.entries(monthly).map(([month,pnl])=>({month,pnl}));
  const equityData=useMemo(()=>{let run=parseFloat(account.deposit||0);return[...trades].sort((a,b)=>a.date?.localeCompare(b.date)).map((t,i)=>{run+=(parseFloat(t.pnl)||0);return{i:i+1,equity:parseFloat(run.toFixed(2)),pnl:parseFloat(t.pnl)||0};});},[trades,account.deposit]);
  return(<div className="fu">
    <SH title="Futures Trading" sub="P&L, win rate & performance" onAdd={()=>setShowAdd(true)} addLabel="Log Trade"/>
    <div style={{background:`linear-gradient(135deg,${C.navy} 0%,#1a3a6e 100%)`,borderRadius:18,padding:22,marginBottom:14,color:"#fff"}}>
      <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",letterSpacing:.5,textTransform:"uppercase",marginBottom:4}}>Trading Account</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}><div><div style={{fontFamily:MF,fontSize:30,fontWeight:800,color:"#fff",lineHeight:1}}>{fmt(bal)}</div><div style={{fontSize:13,color:"rgba(255,255,255,.5)",marginTop:4}}>Current Balance</div></div><div style={{textAlign:"right"}}><div style={{fontFamily:MF,fontSize:20,fontWeight:700,color:totalPnl>=0?C.green:C.red}}>{totalPnl>=0?"+":""}{fmt(totalPnl)}</div><div style={{fontSize:12,color:"rgba(255,255,255,.4)"}}>Total P&L</div></div></div>
      <div style={{display:"flex",gap:4}}>{[["Deposited",fmt(dep)],["Return",ret+"%"],["Trades",String(trades.length)]].map(([l,v])=><div key={l} style={{flex:1,background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 10px"}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2}}>{l}</div><div style={{fontFamily:MF,fontSize:14,fontWeight:700,color:"#fff"}}>{v}</div></div>)}</div>
    </div>
    <div style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:16,marginBottom:14}}><div style={{fontSize:12,fontWeight:600,color:C.slate,marginBottom:10}}>Update Balances</div><div style={{display:"flex",gap:10,marginBottom:10}}><div style={{flex:1}}><div style={{fontSize:11,color:C.textLight,marginBottom:4}}>Total Deposited</div><input type="number" placeholder="0.00" value={account.deposit||""} onChange={e=>setAccount(p=>({...p,deposit:e.target.value}))} onBlur={e=>{if(e.target.value)showToast("✓ Deposit saved");}} style={{...iS(false),padding:"9px 12px",fontSize:13}}/></div><div style={{flex:1}}><div style={{fontSize:11,color:C.textLight,marginBottom:4}}>Current Balance</div><input type="number" placeholder="0.00" value={account.balance||""} onChange={e=>setAccount(p=>({...p,balance:e.target.value}))} onBlur={e=>{if(e.target.value)showToast("✓ Balance saved");}} style={{...iS(false),padding:"9px 12px",fontSize:13}}/></div></div><div style={{display:"flex",justifyContent:"center"}}><div style={{fontSize:11,color:C.green,fontWeight:600,display:"flex",alignItems:"center",gap:5}}><div style={{width:6,height:6,borderRadius:"50%",background:C.green}}/>Changes save automatically</div></div></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>{[{l:"Win Rate",v:winRate+"%",c:parseFloat(winRate)>=50?C.green:C.red},{l:"Profit Factor",v:avgLoss>0?(avgWin/avgLoss).toFixed(2):"∞",c:C.accent},{l:"Avg Win",v:fmt(avgWin),c:C.green},{l:"Avg Loss",v:"-"+fmt(avgLoss),c:C.red}].map(s=><div key={s.l} style={{background:C.surface,borderRadius:12,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:14}}><div style={{fontSize:11,fontWeight:600,color:C.slate,textTransform:"uppercase",letterSpacing:.4,marginBottom:4}}>{s.l}</div><div style={{fontFamily:MF,fontSize:22,fontWeight:800,color:s.c}}>{s.v}</div></div>)}</div>
    {chartData.length>0&&<div style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:14}}><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Monthly P&L</div><ResponsiveContainer width="100%" height={160}><BarChart data={chartData} margin={{left:-20,right:4,top:4,bottom:0}}><XAxis dataKey="month" tick={{fill:C.textLight,fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:C.textLight,fontSize:11}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,fontSize:12}} formatter={v=>[fmt(v),"P&L"]}/><Bar dataKey="pnl" radius={[6,6,0,0]}>{chartData.map((d,i)=><Cell key={i} fill={d.pnl>=0?C.green:C.red}/>)}</Bar></BarChart></ResponsiveContainer></div>}
    {equityData.length>1&&<div style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:14}}><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>Equity Curve</div><div style={{fontSize:12,color:C.textLight,marginBottom:14}}>Cumulative account value per trade</div><ResponsiveContainer width="100%" height={160}><AreaChart data={equityData} margin={{left:-20,right:4,top:4,bottom:0}}><defs><linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={equityData[equityData.length-1]?.equity>=(parseFloat(account.deposit||0))?C.green:C.red} stopOpacity={.2}/><stop offset="95%" stopColor={equityData[equityData.length-1]?.equity>=(parseFloat(account.deposit||0))?C.green:C.red} stopOpacity={0}/></linearGradient></defs><XAxis dataKey="i" tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false}/><YAxis tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v>=1000?(v/1000).toFixed(1)+"k":v)} width={50}/><Tooltip formatter={(v,n)=>n==="equity"?[fmt(v),"Account Value"]:[fmt(v),"Trade P&L"]} contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,fontSize:12}}/><Area type="monotone" dataKey="equity" name="equity" stroke={equityData[equityData.length-1]?.equity>=(parseFloat(account.deposit||0))?C.green:C.red} strokeWidth={2.5} fill="url(#eqGrad)" dot={false}/></AreaChart></ResponsiveContainer></div>}
    <div style={{fontFamily:MF,fontWeight:700,fontSize:16,color:C.text,marginBottom:10}}>Trade Log</div>
    {trades.length===0&&<Empty text="No trades yet. Tap 'Log Trade' to start." icon={BarChart2}/>}
    {trades.map(t=>{const pnl=parseFloat(t.pnl)||0;return(<Row key={t.id} icon={pnl>=0?"📈":"📉"} title={t.symbol} sub={`${t.date} · ${t.side} · ${t.contracts} contract${t.contracts!=="1"?"s":""}${t.note?" · "+t.note:""}`} right={(pnl>=0?"+":"")+fmt(pnl)} rightColor={pnl>=0?C.green:C.red} rightSub={t.entry&&t.exit?t.entry+" - "+t.exit:""} onDelete={()=>{setTrades(p=>p.filter(x=>x.id!==t.id));showToast&&showToast("Trade removed","error");}} badge={pnl>=0?{label:"WIN",bg:C.greenBg,color:C.green}:{label:"LOSS",bg:C.redBg,color:C.red}}/>);})}
    {showAdd&&<Modal title="Log Trade" icon={BarChart2} onClose={()=>setShowAdd(false)} onSubmit={add} submitLabel="Log Trade" wide><div style={{display:"flex",gap:12,flexWrap:"wrap"}}><FI half label="Symbol" placeholder="ES, NQ, CL..." value={form.symbol||""} onChange={ff("symbol")}/><FI half label="Date" type="date" value={form.date||todayStr()} onChange={ff("date")}/></div><div style={{display:"flex",gap:10,marginBottom:14}}>{["Long","Short"].map(s=><button key={s} className="ba" onClick={()=>setForm(p=>({...p,side:s}))} style={{flex:1,padding:"10px",borderRadius:10,border:`1.5px solid ${form.side===s?C.accent:C.border}`,background:form.side===s?C.accentBg:C.surface,color:form.side===s?C.accent:C.textMid,fontWeight:700,fontSize:13,cursor:"pointer"}}>{s==="Long"?"📈 Long":"📉 Short"}</button>)}</div><div style={{display:"flex",gap:12,flexWrap:"wrap"}}><FI half label="Contracts" type="number" placeholder="1" value={form.contracts||""} onChange={ff("contracts")}/><FI half label="P&L ($)" type="number" placeholder="+250 or -150" value={form.pnl||""} onChange={ff("pnl")}/></div><div style={{display:"flex",gap:12,flexWrap:"wrap"}}><FI half label="Entry Price" type="number" value={form.entry||""} onChange={ff("entry")}/><FI half label="Exit Price" type="number" value={form.exit||""} onChange={ff("exit")}/></div><FI label="Note" placeholder="Setup, lesson..." value={form.note||""} onChange={ff("note")}/></Modal>}
  </div>);
}

function CalendarView({expenses,bills,calColors,setCalColors,setExpenses,onAdd}){
  const[viewDate,setViewDate]=useState(new Date(TODAY.getFullYear(),TODAY.getMonth(),1));
  const[selected,setSelected]=useState(null);
  const yr=viewDate.getFullYear(),mo=viewDate.getMonth();
  const ms=yr+'-'+String(mo+1).padStart(2,'0');
  const dim=new Date(yr,mo+1,0).getDate();
  const firstDay=viewDate.getDay();
  const monthExp=expenses.filter(e=>e.date?.startsWith(ms));
  const monthTotal=monthExp.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const dayMap=monthExp.reduce((a,e)=>{const d=parseInt(e.date?.split('-')[2]||0);a[d]=(a[d]||0)+(parseFloat(e.amount)||0);return a},{});
  const maxDay=Math.max(...Object.values(dayMap),1);
  const billMap=bills.reduce((a,b)=>{const d=b.dueDate?.split('-')[2];if(d){const di=parseInt(d);if(!a[di])a[di]=[];a[di].push(b);}return a},{});
  const selExp=selected?expenses.filter(e=>e.date===`${yr}-${String(mo+1).padStart(2,'0')}-${String(selected).padStart(2,'0')}`):[];
  const selAmt=selExp.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const todayD=new Date();
  const isToday=(d)=>d===todayD.getDate()&&mo===todayD.getMonth()&&yr===todayD.getFullYear();
  // Weekly bar data
  const weekBars=Array.from({length:5},(_,wi)=>{let wt=0;for(let d=wi*7+1;d<=Math.min(wi*7+7,dim);d++)wt+=dayMap[d]||0;return{w:'Wk '+(wi+1),amt:wt};});
  const maxW=Math.max(...weekBars.map(w=>w.amt),1);

  return(
    <div className="fu">
      {/* header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
        <button onClick={()=>setViewDate(new Date(yr,mo-1,1))} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:'6px 12px',cursor:'pointer',fontWeight:700,color:C.text}}>‹</button>
        <div style={{textAlign:'center'}}>
          <div style={{fontFamily:MF,fontWeight:800,fontSize:16,color:C.text}}>{FULL_MOS[mo]} {yr}</div>
          <div style={{fontSize:12,color:C.textLight}}>{fmt(monthTotal)} spent · {monthExp.length} transactions</div>
        </div>
        <button onClick={()=>setViewDate(new Date(yr,mo+1,1))} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:'6px 12px',cursor:'pointer',fontWeight:700,color:C.text}}>›</button>
      </div>
      {/* summary stats */}
      {monthTotal>0&&<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:12}}>
        {[['Total',fmt(monthTotal),C.red],['Per Day',fmt(monthTotal/Math.max(1,new Date().getDate())),C.textMid],['Transactions',String(monthExp.length),C.accent]].map(([l,v,c])=>(
          <div key={l} style={{background:C.surfaceAlt,borderRadius:10,padding:'8px',textAlign:'center'}}>
            <div style={{fontSize:9,color:C.textLight,fontWeight:600,marginBottom:2}}>{l}</div>
            <div style={{fontFamily:MF,fontWeight:800,fontSize:13,color:c}}>{v}</div>
          </div>
        ))}
      </div>}
      {/* weekly bars */}
      {monthTotal>0&&<div style={{background:C.surface,borderRadius:14,padding:'12px',marginBottom:12,boxShadow:'0 1px 4px rgba(10,22,40,.06)'}}>
        <div style={{fontSize:10,fontWeight:600,color:C.textLight,textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Spending by Week</div>
        <div style={{display:'flex',gap:4,alignItems:'flex-end',height:40}}>
          {weekBars.map((w,i)=>{const h=Math.max(3,Math.round((w.amt/maxW)*36));return(
            <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
              <div style={{width:'100%',height:h,background:C.accent,borderRadius:'3px 3px 0 0'}}/>
              <div style={{fontSize:8,color:C.textFaint}}>{w.w}</div>
            </div>
          );})}
        </div>
      </div>}
      {/* day-of-week headers */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:4}}>
        {DAYS.map(d=><div key={d} style={{textAlign:'center',fontSize:10,color:C.textLight,fontWeight:600,padding:'4px 0'}}>{d}</div>)}
      </div>
      {/* calendar grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:12}}>
        {Array.from({length:firstDay},(_,i)=><div key={'e'+i}/>)}
        {Array.from({length:dim},(_,i)=>{
          const d=i+1,amt=dayMap[d]||0,bs=billMap[d]||[];
          const intensity=amt>0?Math.max(0.15,amt/maxDay):0;
          const isSel=selected===d,isT=isToday(d);
          return(
            <div key={d} onClick={()=>setSelected(isSel?null:d)}
              style={{aspectRatio:'1',borderRadius:8,background:(()=>{if(isSel)return C.accent;if(isT)return C.accentBg;const billAmt=bs.reduce((s,b)=>s+(parseFloat(b.amount)||0),0);if(billAmt>0){const bi=Math.min(0.7,billAmt/500);return`rgba(245,158,11,${bi*0.3})`;}if(amt>0)return`rgba(99,102,241,${intensity*0.35})`;return'transparent';})(),border:`1px solid ${isSel?C.accent:isT?C.accentMid:C.border}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',padding:2,position:'relative'}}>
              <div style={{fontSize:12,fontWeight:isT||isSel?800:500,color:isSel?'#fff':isT?C.accent:C.text}}>{d}</div>
              {bs.length>0&&<div style={{position:'absolute',top:1,right:2,fontSize:6,fontWeight:800,color:bs.some(b=>!b.paid)?C.amber:C.green,lineHeight:1}}>{'$'+(bs.reduce((s,b)=>s+(parseFloat(b.amount)||0),0)>=1000?(bs.reduce((s,b)=>s+(parseFloat(b.amount)||0),0)/1000).toFixed(0)+'k':Math.round(bs.reduce((s,b)=>s+(parseFloat(b.amount)||0),0)))}</div>}
              {amt>0&&<div style={{fontSize:7,color:isSel?'rgba(255,255,255,.8)':C.accent,fontWeight:600}}>{fmt(amt)}</div>}
            </div>
          );
        })}
      </div>
      {/* selected day detail */}
      {selected&&<div style={{background:C.surface,borderRadius:14,padding:'14px',marginBottom:12,boxShadow:'0 1px 4px rgba(10,22,40,.06)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>{FULL_MOS[mo]} {selected}</div>
          {selAmt>0&&<div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.red}}>{fmt(selAmt)}</div>}
        </div>
        {selExp.length===0&&(billMap[selected]||[]).length===0&&<div style={{fontSize:13,color:C.textLight}}>Nothing logged this day.</div>}
        {selExp.map(e=><div key={e.id} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid ${C.border}`}}>
          <span style={{fontSize:13,color:C.text}}>{e.name}<span style={{fontSize:11,color:C.textLight,marginLeft:6}}>{e.category}</span></span>
          <span style={{fontSize:13,fontFamily:MF,fontWeight:700,color:C.red}}>{fmt(e.amount)}</span>
        </div>)}
        {(billMap[selected]||[]).map(b=><div key={b.id} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid ${C.border}`}}>
          <span style={{fontSize:13,color:C.text}}>📅 {b.name}<span style={{fontSize:11,color:b.paid?C.green:C.amber,marginLeft:6}}>{b.paid?'Paid':'Due'}</span></span>
          <span style={{fontSize:13,fontFamily:MF,fontWeight:700,color:b.paid?C.green:C.amber}}>{fmt(b.amount)}</span>
        </div>)}
        <button onClick={onAdd} style={{marginTop:10,width:'100%',background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:10,padding:'9px 0',color:C.accent,fontWeight:700,fontSize:13,cursor:'pointer'}}>+ Log expense for {FULL_MOS[mo]} {selected}</button>
      </div>}
    </div>
  );
}

function ShiftView({shifts,setShifts,income,profCategory,profSub,showToast}){
  const[showAdd,setShowAdd]=useState(false);const[form,setForm]=useState({date:todayStr(),type:"Regular",hours:"",rate:"",note:""});const ff=(k,v)=>setForm(p=>({...p,[k]:v}));
  const prof=getProfession(profCategory);const OT=prof.shiftTypes;
  const DEFAULT_RATE=parseFloat(income.primary||0)>0?(((parseFloat(income.primary)/4)/40).toFixed(2)):"35.00";
  function add(){if(!form.hours||!form.rate)return;const mult=OT[form.type]||1;const gross=(parseFloat(form.hours)*parseFloat(form.rate)*mult).toFixed(2);setShifts(p=>[{id:Date.now(),...form,gross,mult},...p]);showToast&&showToast("✓ Shift logged — "+fmt(gross));setForm({date:todayStr(),type:"Regular",hours:"",rate:form.rate,note:""});setShowAdd(false);}
  const now2=new Date();const thisMonth=now2.getFullYear()+"-"+String(now2.getMonth()+1).padStart(2,"0");const ms=shifts.filter(s=>s.date?.startsWith(thisMonth));
  const mh=ms.reduce((s,x)=>s+(parseFloat(x.hours)||0),0),mg=ms.reduce((s,x)=>s+(parseFloat(x.gross)||0),0),mot=ms.filter(s=>s.type!=="Regular").reduce((s,x)=>s+(parseFloat(x.gross)||0),0);
  const ytd=shifts.reduce((s,x)=>s+(parseFloat(x.gross)||0),0);
  const subRole=getProfSub(profCategory,profSub);
  const weeklyData=useMemo(()=>{const wk={};shifts.forEach(s=>{const d=new Date((s.date||todayStr())+"T00:00:00");d.setDate(d.getDate()-d.getDay());const k=d.toISOString().split("T")[0];if(!wk[k])wk[k]={week:k,gross:0};wk[k].gross+=parseFloat(s.gross||0);});return Object.values(wk).sort((a,b)=>a.week.localeCompare(b.week)).slice(-8).map(w=>({...w,label:w.week.slice(5)}));},[shifts]);
  return(<div className="fu">
    <SH title={prof.icon+" "+prof.shiftLabel+" Tracker"} sub={subRole.label+" · Log hours & calculate pay"} onAdd={()=>setShowAdd(true)} addLabel={"Log "+prof.shiftLabel}/>
    <div style={{background:`linear-gradient(135deg,${C.navy} 0%,#1a3a6e 100%)`,borderRadius:18,padding:20,marginBottom:14,color:"#fff"}}><div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>This Month</div><div style={{fontFamily:MF,fontSize:30,fontWeight:800,color:"#fff",marginBottom:14}}>{fmt(mg)}</div><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>{[["Shifts",String(ms.length)],["Hours",mh.toFixed(1)],["OT Pay",fmtK(mot)],["YTD",fmtK(ytd)]].map(([l,v])=><div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 8px"}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2}}>{l}</div><div style={{fontFamily:MF,fontSize:13,fontWeight:700,color:"#fff"}}>{v}</div></div>)}</div></div>
    {shifts.length===0&&<Empty text={`No ${prof.shiftLabel.toLowerCase()}s logged yet.`} icon={Clock}/>}
    {shifts.slice(0,30).map(s=>{const mult=OT[s.type]||1;const col={Regular:C.accent,Overtime:C.amber,"Double Time":C.red,Night:C.purple,Weekend:C.green,Holiday:C.red}[s.type]||C.accent;return(<div key={s.id} className="rw" style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"14px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12}}><div style={{width:40,height:40,borderRadius:12,background:col+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Clock size={18} color={col}/></div><div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:600,color:C.text}}>{s.type} {prof.shiftLabel}</div><div style={{fontSize:12,color:C.textLight,marginTop:2}}>{fmtDate(s.date)} · {s.hours}h @ ${s.rate}/hr{mult!==1&&<span style={{color:col,fontWeight:600}}> ×{mult}</span>}{s.note&&" · "+s.note}</div></div><div style={{textAlign:"right",flexShrink:0}}><div style={{fontFamily:MF,fontWeight:800,fontSize:16,color:C.green}}>{fmt(s.gross)}</div><button className="db" onClick={()=>{setShifts(p=>p.filter(x=>x.id!==s.id));showToast&&showToast("Shift removed","error");}} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,padding:2,display:"flex",marginLeft:"auto",marginTop:4}}><Trash2 size={13}/></button></div></div>);})}
    {weeklyData.length>1&&<div style={{background:C.surface,borderRadius:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"14px 14px 8px",marginBottom:14}}>
      <div style={{fontSize:12,fontWeight:600,color:C.textLight,marginBottom:10}}>Weekly Earnings</div>
      <ResponsiveContainer width="100%" height={100}><BarChart data={weeklyData} barSize={24}><XAxis dataKey="label" tick={{fontSize:10,fill:C.textLight}} axisLine={false} tickLine={false}/><Tooltip formatter={v=>[fmt(v),"Gross"]} contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,fontSize:12}}/><Bar dataKey="gross" fill={C.accent} radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>
    </div>}
    {showAdd&&<Modal title={`Log ${prof.shiftLabel}`} icon={Clock} onClose={()=>setShowAdd(false)} onSubmit={add} submitLabel={`Add ${prof.shiftLabel}`} accent={C.green}><FI label="Date" type="date" value={form.date} onChange={e=>ff("date",e.target.value)}/><FS label={`${prof.shiftLabel} Type`} options={Object.keys(OT)} value={form.type} onChange={e=>ff("type",e.target.value)}/><div style={{display:"flex",gap:12}}><FI half label="Hours Worked" type="number" placeholder="8" value={form.hours} onChange={e=>ff("hours",e.target.value)}/><FI half label="Hourly Rate ($)" type="number" placeholder={DEFAULT_RATE||"35.00"} value={form.rate} onChange={e=>ff("rate",e.target.value)}/></div>{form.hours&&form.rate&&<div style={{background:C.greenBg,border:`1px solid ${C.greenMid}`,borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:C.green,fontWeight:600}}>Gross pay: {fmt((parseFloat(form.hours)*parseFloat(form.rate)*(OT[form.type]||1)).toFixed(2))}</div>}<FI label="Note (optional)" placeholder={prof.notePlaceholder} value={form.note} onChange={e=>ff("note",e.target.value)}/></Modal>}
  </div>);
}






function TrendView({balHist,accounts,expenses,onNavigate}){
  const[range,setRange]=useState("1M");
  const[mode,setMode]=useState("total");
  const RANGES=[{id:"7D",days:7},{id:"1M",days:30},{id:"3M",days:90},{id:"6M",days:180},{id:"1Y",days:365},{id:"ALL",days:9999}];
  const days=RANGES.find(r=>r.id===range)?.days||30;
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-days);
  const cutStr=cutoff.toISOString().split("T")[0];
  const filtered=balHist.filter(s=>s.date>=cutStr);
  const cur=(parseFloat(accounts.checking||0))+(parseFloat(accounts.savings||0))+(parseFloat(accounts.cushion||0))+(parseFloat(accounts.investments||0));
  const chartData=useMemo(()=>filtered.length>0?filtered:[{date:todayStr(),checking:parseFloat(accounts.checking||0),savings:parseFloat(accounts.savings||0),cushion:parseFloat(accounts.cushion||0),total:cur}],[filtered.length,cur]);
  const first=chartData[0]?.total||cur;
  const last=chartData[chartData.length-1]?.total||cur;
  const high=chartData.length?Math.max(...chartData.map(d=>d.total)):cur;
  const low=chartData.length?Math.min(...chartData.map(d=>d.total)):cur;
  const change=last-first,changePct=first>0?((change/first)*100).toFixed(1):"0.0",isUp=change>=0,lineCol=isUp?C.green:C.red;
  const spendData=useMemo(()=>{
    const bd={};
    expenses.filter(e=>e.date>=cutStr).forEach(e=>{bd[e.date]=(bd[e.date]||0)+(parseFloat(e.amount)||0);});
    return Object.entries(bd).sort((a,b)=>a[0].localeCompare(b[0])).map(([date,amount])=>({date,amount}));
  },[expenses,cutStr]);
  const fD=s=>{if(!s)return"";const d=new Date(s+"T00:00:00");return FULL_MOS[d.getMonth()]+" "+d.getDate();};
  const hasData=chartData.length>1;
  return(
    <div className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
        <div>
          <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.3}}>Balance Trend</div>
          <div style={{fontSize:13,color:C.textLight,marginTop:1}}>Track how your money moves over time</div>
        </div>
        <button className="ba" onClick={()=>onNavigate("accounts")} style={{display:"flex",alignItems:"center",gap:5,background:C.accent,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer"}}><Plus size={13}/>Update</button>
      </div>
      <div style={{background:`linear-gradient(135deg,${C.navy} 0%,${C.navyLight} 60%,${C.accent} 100%)`,borderRadius:20,padding:"20px 22px",marginBottom:16,color:"#fff"}}>
        <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{mode==="spending"?"Total Spent":"Current Balance"} - {range}</div>
        <div style={{fontFamily:MF,fontSize:36,fontWeight:800,color:"#fff",lineHeight:1,marginBottom:12}}>{fmt(cur)}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
          {[["Change",(isUp?"+":"")+fmt(change),isUp?C.greenMid:C.redMid],["Change %",(isUp?"+":"")+changePct+"%",isUp?C.greenMid:C.redMid],["High",fmt(high),C.accentMid],["Low",fmt(low),C.amberMid]].map(([l,v,c])=>(
            <div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 8px"}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2}}>{l}</div>
              <div style={{fontFamily:MF,fontSize:13,fontWeight:700,color:c}}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{display:"flex",gap:6,background:C.borderLight,borderRadius:12,padding:4,marginBottom:12}}>
        {RANGES.map(r=>(<button key={r.id} className="ba" onClick={()=>setRange(r.id)} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",background:range===r.id?C.surface:"transparent",color:range===r.id?C.accent:C.textLight,fontWeight:range===r.id?700:500,fontSize:12,cursor:"pointer"}}>{r.id}</button>))}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        {[{id:"total",l:"Net Balance"},{id:"breakdown",l:"By Account"},{id:"spending",l:"Spending"}].map(m=>(
          <button key={m.id} className="ba" onClick={()=>setMode(m.id)} style={{flex:1,padding:"9px 0",borderRadius:10,border:`1.5px solid ${mode===m.id?C.accent:C.border}`,background:mode===m.id?C.accentBg:C.surface,color:mode===m.id?C.accent:C.textMid,fontWeight:mode===m.id?700:500,fontSize:12,cursor:"pointer"}}>{m.l}</button>
        ))}
      </div>
      <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"20px 4px 8px",marginBottom:16}}>
        {!hasData&&<div style={{height:200,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:C.textLight,padding:20,textAlign:"center"}}><div style={{fontSize:32,marginBottom:10}}>📈</div><div style={{fontSize:14,fontWeight:600,marginBottom:4}}>Building your trend</div><div style={{fontSize:13}}>Update your balances regularly.</div></div>}
        {hasData&&mode==="total"&&<ResponsiveContainer width="100%" height={200}><AreaChart data={chartData} margin={{left:8,right:8,top:4,bottom:0}}><defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={lineCol} stopOpacity={.2}/><stop offset="95%" stopColor={lineCol} stopOpacity={0}/></linearGradient></defs><XAxis dataKey="date" tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={fD} interval="preserveStartEnd"/><YAxis tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v>=1000?(v/1000).toFixed(1)+"k":v)} width={50}/><Tooltip formatter={(v)=>fmt(v)}/><Area type="monotone" dataKey="total" name="Balance" stroke={lineCol} strokeWidth={2.5} fill="url(#tg)" dot={false}/></AreaChart></ResponsiveContainer>}
        {hasData&&mode==="breakdown"&&<ResponsiveContainer width="100%" height={200}><AreaChart data={chartData} margin={{left:8,right:8,top:4,bottom:0}}><XAxis dataKey="date" tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={fD} interval="preserveStartEnd"/><YAxis tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v>=1000?(v/1000).toFixed(1)+"k":v)} width={50}/><Tooltip formatter={(v)=>fmt(v)}/><Area type="monotone" dataKey="checking" name="Checking" stroke={C.navy} strokeWidth={2} fill="transparent"/><Area type="monotone" dataKey="savings" name="Savings" stroke={C.green} strokeWidth={2} fill="transparent"/><Area type="monotone" dataKey="cushion" name="Cushion" stroke={C.accent} strokeWidth={2} fill="transparent"/></AreaChart></ResponsiveContainer>}
        {hasData&&mode==="spending"&&<ResponsiveContainer width="100%" height={200}><BarChart data={spendData} margin={{left:8,right:8,top:4,bottom:0}}><XAxis dataKey="date" tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={fD} interval="preserveStartEnd"/><YAxis tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v>=1000?(v/1000).toFixed(1)+"k":v)} width={50}/><Tooltip formatter={(v)=>fmt(v)}/><Bar dataKey="amount" name="Spent" fill={C.red} radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>}
      </div>
      {hasData&&(()=>{
        const avgBal=chartData.reduce((s,d)=>s+(d.total||0),0)/chartData.length;
        const trend=chartData.length>3?chartData.slice(-3).reduce((s,d)=>s+(d.total||0),0)/3:null;
        const isGrowing=trend&&trend>avgBal;
        const dailyChange=chartData.length>1?((last-first)/(chartData.length-1)):0;
        return(
          <div style={{background:C.surface,borderRadius:16,padding:14,marginBottom:14}}>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.text,marginBottom:10}}>Trend Insights</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:C.textMid}}>Avg balance ({range})</span><span style={{fontFamily:MF,fontWeight:700,color:C.text}}>{fmt(avgBal)}</span></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:C.textMid}}>Daily change</span><span style={{fontFamily:MF,fontWeight:700,color:dailyChange>=0?C.green:C.red}}>{dailyChange>=0?"+":""}{fmt(dailyChange)}/day</span></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:C.textMid}}>Trend (last 3 pts)</span><span style={{fontFamily:MF,fontWeight:700,color:isGrowing?C.green:C.red}}>{isGrowing?"↑ Growing":"↓ Declining"}</span></div>
              {change!==0&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:C.textMid}}>Total change</span><span style={{fontFamily:MF,fontWeight:700,color:change>=0?C.green:C.red}}>{change>=0?"+":""}{fmt(change)}</span></div>}
            </div>
          </div>
        );
      })()}
      <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"11px 14px",fontSize:12,color:C.accent}}>💡 Tip: Update balances weekly for the best trend line. The more data points you add, the sharper the picture.</div>
    </div>
  );
}

function StatementView({expenses,bills,income,accounts,debts,trades,appName,categories,onAdd}){
  const now=new Date();
  const[mo,setMo]=useState(now.getMonth());const[yr,setYr]=useState(now.getFullYear());const[ytdMode,setYtdMode]=useState(false);
  function nav(d){let m=mo+d,y=yr;if(m<0){m=11;y--;}else if(m>11){m=0;y++;}setMo(m);setYr(y);}
  const ms=yr+"-"+String(mo+1).padStart(2,"0");
  const prevMo=mo===0?11:mo-1,prevYr=mo===0?yr-1:yr;
  const prevMs=prevYr+"-"+String(prevMo+1).padStart(2,"0");
  const prevExp=expenses.filter(e=>e.date?.startsWith(prevMs));
  const totPrev=prevExp.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const mExp=ytdMode?expenses.filter(e=>e.date?.startsWith(String(yr))):expenses.filter(e=>e.date?.startsWith(ms));
  const mBills=bills.filter(b=>b.dueDate?.startsWith(ms));
  const mTrades=trades.filter(t=>t.date?.startsWith(ms));
  const totE=mExp.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const totB=mBills.reduce((s,b)=>s+(parseFloat(b.amount)||0),0);
  const tradePnl=mTrades.reduce((s,t)=>s+(parseFloat(t.pnl)||0),0);
  const ti=(parseFloat(income.primary||0)*(income.payFrequency==="Weekly"?4.33:income.payFrequency==="Twice Monthly"?2:income.payFrequency==="Monthly"?1:2.17))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const catMap=mExp.reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount)||0);return a},{});
  function exportHTML(){const rows=mExp.map(e=>"<tr><td>"+e.date+"</td><td>"+e.name+"</td><td>"+e.category+"</td><td>$"+parseFloat(e.amount).toFixed(2)+"</td></tr>").join("");const html="<html><head><title>"+FULL_MOS[mo]+" "+yr+" Statement</title></head><body><h1>"+(appName||"Finances")+" — "+FULL_MOS[mo]+" "+yr+"</h1><table border='1'><tr><th>Date</th><th>Name</th><th>Category</th><th>Amount</th></tr>"+rows+"<tr><td colspan='3'><b>Total</b></td><td><b>$"+totE.toFixed(2)+"</b></td></tr></table></body></html>";const b=new Blob([html],{type:"text/html"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=(appName||"finances")+"-"+FULL_MOS[mo]+"-"+yr+".html";a.click();URL.revokeObjectURL(u);}
  function exportCSV(){const hdr=["Date","Name","Category","Amount"];const rowData=mExp.map(e=>[e.date,e.name.replace(/,/g," "),e.category,parseFloat(e.amount).toFixed(2)]);const csv=[hdr,...rowData].map(r=>r.join(",")).join("\r\n");const b=new Blob([csv],{type:"text/csv"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=(appName||"trackfi")+"-"+FULL_MOS[mo]+"-"+yr+".csv";a.click();URL.revokeObjectURL(u);}
  return(<div className="fu">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
      <div><div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text}}>Monthly Statement</div><div style={{fontSize:13,color:C.textLight}}>{FULL_MOS[mo]} {yr}</div></div>
      <div style={{display:"flex",gap:8}}>
        <button className="ba" onClick={onAdd} style={{background:C.accent,border:"none",borderRadius:10,padding:"8px 12px",cursor:"pointer",color:"#fff",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",gap:4}}><Plus size={13}/>Add</button>
        <button className="ba" onClick={()=>setYtdMode(y=>!y)} style={{background:ytdMode?C.accentBg:C.bg,border:`1px solid ${ytdMode?C.accentMid:C.border}`,borderRadius:10,padding:"8px 12px",cursor:"pointer",color:ytdMode?C.accent:C.textMid,fontWeight:700,fontSize:12}}>YTD</button><button className="ba" onClick={()=>{setYtdMode(false);nav(-1);}} style={{background:C.bg,border:"1px solid "+C.border,borderRadius:10,padding:"8px 12px",cursor:"pointer",color:C.textMid,fontWeight:600}}>←</button>
        <button className="ba" onClick={()=>nav(1)} style={{background:C.bg,border:"1px solid "+C.border,borderRadius:10,padding:"8px 12px",cursor:"pointer",color:C.textMid,fontWeight:600}}>→</button>
        <button className="ba" onClick={exportCSV} style={{background:C.teal,border:"none",borderRadius:10,padding:"8px 12px",cursor:"pointer",color:"#fff",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",gap:4}}><Download size={13}/>CSV</button><button className="ba" onClick={exportHTML} style={{background:C.green,border:"none",borderRadius:10,padding:"8px 12px",cursor:"pointer",color:"#fff",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",gap:4}}><Download size={13}/>HTML</button>
      </div>
    </div>
    <div style={{background:C.navy,borderRadius:18,padding:20,marginBottom:16,color:"#fff"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {[["Income",fmt(ti),C.greenMid],["Expenses",fmt(totE),C.redMid],["Net",(ti-totE>=0?"+":"")+fmt(ti-totE),ti-totE>=0?C.greenMid:C.redMid]].map(([l,v,c])=><div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"11px 12px"}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:3}}>{l}</div><div style={{fontFamily:MF,fontSize:16,fontWeight:800,color:c}}>{v}</div></div>)}
      </div>
    </div>
    
      {(totE>0||totPrev>0)&&<div style={{background:C.surface,borderRadius:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"14px",marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:600,color:C.textLight}}>vs Last Month</div>
          <div style={{fontSize:13,fontWeight:700,color:totE<=totPrev?C.green:C.red}}>{totE<=totPrev?"↓ ":"+$"}{totE<=totPrev?fmt(totPrev-totE)+" less":""+fmt(totE-totPrev)+" more"}</div>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:6}}>
          <div style={{flex:1}}><div style={{fontSize:10,color:C.textLight,fontWeight:600,marginBottom:4}}>THIS MONTH</div><div style={{height:8,background:C.borderLight,borderRadius:4}}><div style={{height:8,width:totPrev>0?Math.min(100,totE/Math.max(totE,totPrev)*100).toFixed(1)+"%":"100%",background:totE<=totPrev?C.green:C.red,borderRadius:4}}/></div><div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.text,marginTop:3}}>{fmt(totE)}</div></div>
          <div style={{flex:1}}><div style={{fontSize:10,color:C.textLight,fontWeight:600,marginBottom:4}}>LAST MONTH</div><div style={{height:8,background:C.borderLight,borderRadius:4}}><div style={{height:8,width:totE>0?Math.min(100,totPrev/Math.max(totE,totPrev)*100).toFixed(1)+"%":"100%",background:C.textLight,borderRadius:4}}/></div><div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.textMid,marginTop:3}}>{fmt(totPrev)}</div></div>
        </div>
      </div>}
      {Object.entries(catMap).sort((a,b)=>b[1]-a[1]).map(([cat,amt],i)=><div key={cat} style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,fontWeight:600,color:C.text}}>{cat}</span><span style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>{fmt(amt)}</span></div><BarProg pct={totE>0?amt/totE*100:0} color={PIE_COLORS[i%PIE_COLORS.length]} h={5}/></div>)}
    {mTrades.length>0&&<div style={{background:C.surface,border:"1px solid "+C.border,borderRadius:14,padding:14,marginTop:12}}><div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.text,marginBottom:4}}>Trading P&L: <span style={{color:tradePnl>=0?C.green:C.red}}>{tradePnl>=0?"+":""}{fmt(tradePnl)}</span></div><div style={{fontSize:12,color:C.textLight}}>{mTrades.length} trades · {mTrades.filter(t=>parseFloat(t.pnl)>0).length} wins</div></div>}
    <div style={{marginTop:12}}>
      <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:10}}>Transactions ({mExp.length})</div>
      {mExp.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(e=>{const cat=categories.find(c=>c.name===e.category);return(<div key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid "+C.border}}><div style={{width:32,height:32,borderRadius:8,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{cat?.icon||"💸"}</div><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:C.text}}>{e.name}</div><div style={{fontSize:11,color:C.textLight}}>{e.date} · {e.category}</div></div><div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>{fmt(e.amount)}</div></div>);})}
      {mExp.length===0&&<Empty text={"No expenses in "+FULL_MOS[mo]+" "+yr} icon={FileText}/>}
    </div>
  </div>);
}

function FinancialPhysicalView({income,expenses,debts,accounts,bills,savingsGoals}){
  const ti=(parseFloat(income.primary||0)*(income.payFrequency==="Weekly"?4.33:income.payFrequency==="Twice Monthly"?2:income.payFrequency==="Monthly"?1:2.17))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const annualIncome=ti*12;
  const te=expenses.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const td=debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0);
  const tm=debts.reduce((s,d)=>s+(parseFloat(d.minPayment)||0),0);
  const liq=(parseFloat(accounts.savings||0))+(parseFloat(accounts.cushion||0));
  const ta=(parseFloat(accounts.checking||0))+(parseFloat(accounts.savings||0))+(parseFloat(accounts.cushion||0))+(parseFloat(accounts.investments||0))+(parseFloat(accounts.k401||0))+(parseFloat(accounts.roth_ira||0))+(parseFloat(accounts.brokerage||0))+(parseFloat(accounts.crypto||0))+(parseFloat(accounts.hsa||0))+(parseFloat(accounts.property||0))+(parseFloat(accounts.vehicles||0));
  const mAvg=te/Math.max(1,new Date().getMonth()+1);
  const efMo=mAvg>0?liq/mAvg:0;
  const sr=ti>0?Math.max(0,(ti-mAvg)/ti*100):0;
  const dti=ti>0?(tm/ti)*100:0;
  const nw=ta-td;
  const ov=bills.filter(b=>!b.paid&&dueIn(b.dueDate)<0).length;
  const mi=debts.reduce((s,d)=>s+(parseFloat(d.balance||0)*(parseFloat(d.rate||0)/100/12)),0);
  const priorities=[];
  if(ov)priorities.push({ic:"🚨",c:C.red,t:"Pay overdue bills",d:ov+" bill"+(ov!==1?"s":" ")+"past due"});
  if(liq<1000)priorities.push({ic:"🛡️",c:C.amber,t:"Build $1,000 emergency fund",d:"Have "+fmt(liq)+" — need "+fmt(Math.max(0,1000-liq))+" more"});
  if(dti>36)priorities.push({ic:"💳",c:C.red,t:"Reduce debt load",d:"DTI "+dti.toFixed(1)+"% — target under 28%"});
  if(sr<5&&ti>0)priorities.push({ic:"📉",c:C.amber,t:"Boost savings rate",d:"Currently "+sr.toFixed(1)+"% — target 15-20%"});
  if(efMo<3)priorities.push({ic:"💰",c:C.amber,t:"Grow emergency fund",d:efMo.toFixed(1)+" months saved — target 3-6"});
  if(mi>100)priorities.push({ic:"⚡",c:C.accent,t:"Tackle interest costs",d:"Paying "+fmt(mi)+"/mo in interest"});
  return(<div className="fu">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text}}>Financial Physical</div>
      <div style={{fontSize:12,color:C.textLight}}>Dave Ramsey framework</div>
    </div>
    <div style={{background:`linear-gradient(135deg,${C.navy} 0%,${C.navyLight} 50%,${C.accent}22 100%)`,borderRadius:18,padding:20,marginBottom:16,color:"#fff"}}>
      <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Financial Vitals</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
        {[["Net Worth",fmt(nw),nw>=0?C.greenMid:C.redMid,"Your assets minus all debts"],["Emergency Fund",efMo.toFixed(1)+" months",efMo>=6?C.greenMid:efMo>=3?C.amberMid:C.redMid,"Target: 3-6 months"],["Savings Rate",sr.toFixed(1)+"%",sr>=15?C.greenMid:sr>=5?C.amberMid:C.redMid,"Target: 15-20%"],["Debt-to-Income",dti.toFixed(1)+"%",dti<=28?C.greenMid:dti<=36?C.amberMid:C.redMid,"Target: under 28%"]].map(([l,v,c,tip])=>(
          <div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:12,padding:"12px 12px"}}>
            <div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:3,textTransform:"uppercase"}}>{l}</div>
            <div style={{fontFamily:MF,fontSize:17,fontWeight:800,color:c,marginBottom:3}}>{v}</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,.3)"}}>{tip}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
        {[["Monthly In",fmt(ti),C.greenMid],["Monthly Out",fmt(mAvg),C.redMid],["Net Cash",fmt(ti-mAvg),(ti-mAvg)>=0?C.greenMid:C.redMid]].map(([l,v,c])=>(
          <div key={l} style={{background:"rgba(255,255,255,.06)",borderRadius:10,padding:"9px 8px",textAlign:"center"}}>
            <div style={{fontSize:9,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2,textTransform:"uppercase"}}>{l}</div>
            <div style={{fontFamily:MF,fontSize:13,fontWeight:700,color:c}}>{v}</div>
          </div>
        ))}
      </div>
    </div>
    {priorities.length>0&&<div style={{marginBottom:16}}><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:10}}>Top Priorities</div>{priorities.slice(0,3).map((p,i)=><div key={i} style={{background:C.surface,border:"1.5px solid "+p.c+"22",borderRadius:14,padding:14,marginBottom:8,borderLeft:"4px solid "+p.c}}><div style={{display:"flex",gap:10,alignItems:"flex-start"}}><span style={{fontSize:20,flexShrink:0}}>{p.ic}</span><div><div style={{fontSize:13,fontWeight:700,color:C.text}}>{p.t}</div><div style={{fontSize:12,color:C.textMid,marginTop:3,lineHeight:1.5}}>{p.d}</div></div></div></div>)}</div>}
    <div style={{background:C.surface,border:"1px solid "+C.border,borderRadius:16,padding:18}}>
      <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:12}}>Dave Ramsey Steps</div>
      <div style={{fontSize:12,color:C.textLight,marginBottom:10}}>Based on your real numbers</div>
      {[[liq>=1000,"$1,000 emergency fund","Have: "+fmt(liq)+(liq<1000?" — need "+fmt(1000-liq)+" more":""),"baby-1"],[td===0,"Pay off all debt (except mortgage)","Total: "+fmt(td)+(td>0?" across "+debts.length+" account"+(debts.length!==1?"s":""):""),"baby-2"],[efMo>=3&&efMo<=6,"3-6 months emergency fund",efMo.toFixed(1)+" months — target 3-6","baby-3"],[parseFloat(accounts.investments||0)>=annualIncome*0.15,"Invest 15% for retirement","Balance: "+fmt(accounts.investments||0),"baby-4"],[savingsGoals.some(g=>g.name?.toLowerCase().includes("college")||g.name?.toLowerCase().includes("529")),"College funding (if applicable)","Check savings goals","baby-5"],[parseFloat(accounts.property||0)>0||nw>td*2,"Pay off home early","Property equity: "+fmt(accounts.property||0),"baby-6"],[nw>=500000||nw>=annualIncome*7,"Build wealth & give generously","Net worth: "+fmt(nw),"baby-7"]].map(([done,t,sub],i)=><div key={i} style={{display:"flex",gap:12,alignItems:"center",padding:"9px 0",borderBottom:i<3?"1px solid "+C.border:""}}><div style={{width:24,height:24,borderRadius:"50%",background:done?C.greenBg:C.bg,border:"2px solid "+(done?C.green:C.border),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:800,color:done?C.green:C.textLight}}>{done?"✓":i+1}</div><div><div style={{fontSize:13,fontWeight:600,color:done?C.textLight:C.text,textDecoration:done?"line-through":"none"}}>{t}</div><div style={{fontSize:11,color:C.textLight,marginTop:2}}>{sub}</div></div></div>)}
    </div>
  </div>);
}

function SettingsView({settings,setSettings,appName,setAppName,greetName,setGreetName,onResetAllData,darkMode,setDarkMode,pinEnabled,setPinEnabled,profCategory,setProfCategory,profSub,setProfSub,expenses,bills,debts,trades,accounts,income,shifts,savingsGoals,budgetGoals,setBills,setDebts,setTrades,setShifts,setSGoals,setBGoals,setAccounts,setIncome,setExpenses,categories,setCategories,onResetOnboarding,onSignOut,onSignIn,userEmail,showToast,household,navTo}){
  const[nm,setNm]=useState(appName||"");
  const[showPIN,setShowPIN]=useState(false);
  const[showEmailChange,setShowEmailChange]=useState(false);
  const[showPwChange,setShowPwChange]=useState(false);
  const[newEmail,setNewEmail]=useState("");
  const[newPw1,setNewPw1]=useState("");const[newPw2,setNewPw2]=useState("");
  const[acctMsg,setAcctMsg]=useState("");const[acctLoading,setAcctLoading]=useState(false);

  function exportData(){const d={exportedAt:new Date().toISOString(),appName,accounts,income,expenses,bills,debts,trades,shifts,savingsGoals,budgetGoals,version:"2.0"};const b=new Blob([JSON.stringify(d,null,2)],{type:"application/json"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`${(appName||"finances").replace(/\s+/g,"-")}-backup.json`;a.click();URL.revokeObjectURL(u);}
  async function importData(file){try{const t=await file.text();const d=JSON.parse(t);if(d.accounts)setAccounts(d.accounts);if(d.income)setIncome(d.income);if(d.expenses)setExpenses(d.expenses);if(d.bills)setBills(d.bills);if(d.debts)setDebts(d.debts);if(d.trades)setTrades(d.trades);if(d.shifts)setShifts(d.shifts);if(d.savingsGoals)setSGoals(d.savingsGoals);if(d.budgetGoals)setBGoals(d.budgetGoals);showToast&&showToast("✅ Data imported!");} catch(e){showToast&&showToast("❌ "+e.message,"error");}}

  const Tog=(k,l,d,ic)=>(<div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${C.border}`}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>{ic}</span><div><div style={{fontSize:14,fontWeight:600,color:C.text}}>{l}</div><div style={{fontSize:12,color:C.textLight}}>{d}</div></div></div><button onClick={()=>setSettings(p=>({...p,[k]:!p[k]}))} style={{background:"none",border:"none",cursor:"pointer",color:settings[k]?C.accent:C.borderLight,padding:0,flexShrink:0}}>{settings[k]?<ToggleRight size={28}/>:<ToggleLeft size={28}/>}</button></div>);

  return(<div className="fu">

    {/* ── Header ─────────────────────────────────── */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.4}}>Settings</div>
    </div>
    {userEmail&&<div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
      <div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:MF,fontWeight:800,fontSize:13,color:"#fff",flexShrink:0}}>{userEmail[0].toUpperCase()}</div>
      <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:C.accent}}>{userEmail}</div><div style={{fontSize:11,color:C.textLight}}>Signed in</div></div>
    </div>}

    {/* ── 1. PROFILE ─────────────────────────────── */}
    <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
        <span style={{fontSize:18}}>👤</span>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Profile</div>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        <div style={{flex:1}}>
          <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>Display Name</div>
          <input value={greetName||""} onChange={e=>setGreetName(e.target.value)} placeholder="Victor B" style={{width:"100%",background:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:14,outline:"none"}}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>App Name</div>
          <input value={nm} onChange={e=>setNm(e.target.value)} placeholder="Trackfi" style={{width:"100%",background:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:14,outline:"none"}}/>
        </div>
      </div>
      <button className="ba" onClick={()=>{if(nm.trim())setAppName(nm.trim());if(greetName?.trim())setGreetName(greetName.trim());showToast&&showToast("✓ Profile saved");}} style={{width:"100%",background:C.accent,border:"none",borderRadius:10,padding:"10px 0",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:14}}>Save Profile</button>
      <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Profession</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
        {PROFESSIONS.map(p=><button key={p.id} onClick={()=>{setProfCategory(p.id);setProfSub(p.subs[0].id);showToast&&showToast("✓ "+p.label);}} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:99,border:`1.5px solid ${profCategory===p.id?C.accent:C.border}`,background:profCategory===p.id?C.accentBg:"#fff",cursor:"pointer"}}><span style={{fontSize:14}}>{p.icon}</span><span style={{fontSize:12,fontWeight:profCategory===p.id?700:500,color:profCategory===p.id?C.accent:C.text}}>{p.label}</span></button>)}
      </div>
      {getProfession(profCategory).subs.length>1&&<div style={{display:"flex",flexWrap:"wrap",gap:6}}>
        {getProfession(profCategory).subs.map(s=><button key={s.id} onClick={()=>{setProfSub(s.id);showToast&&showToast("✓ Role updated");}} style={{padding:"5px 10px",borderRadius:8,border:`1.5px solid ${profSub===s.id?C.accent:C.border}`,background:profSub===s.id?C.accentBg:"#fff",fontSize:11,fontWeight:profSub===s.id?700:400,color:profSub===s.id?C.accent:C.textMid,cursor:"pointer"}}>{s.label}</button>)}
      </div>}
    </div>

    {/* ── 2. MONEY SETUP ─────────────────────────── */}
    <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
        <span style={{fontSize:18}}>💰</span>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Money Setup</div>
        <div style={{marginLeft:"auto",fontSize:11,color:C.green,fontWeight:600,display:"flex",alignItems:"center",gap:4}}><div style={{width:6,height:6,borderRadius:"50%",background:C.green}}/>Auto-saved</div>
      </div>
      <div style={{fontSize:12,fontWeight:700,color:C.textLight,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Pay Frequency</div>
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        {["Weekly","Biweekly","Twice Monthly","Monthly"].map(f=>(
          <button key={f} onClick={()=>{setIncome(p=>({...p,payFrequency:f}));showToast&&showToast("✓ Pay frequency updated");}}
            style={{padding:"7px 14px",borderRadius:99,border:`1.5px solid ${(income.payFrequency||"Biweekly")===f?C.accent:C.border}`,background:(income.payFrequency||"Biweekly")===f?C.accentBg:C.surfaceAlt,fontSize:13,fontWeight:(income.payFrequency||"Biweekly")===f?700:500,color:(income.payFrequency||"Biweekly")===f?C.accent:C.textMid,cursor:"pointer",transition:"all .15s"}}>
            {f}
          </button>
        ))}
      </div>
      <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:10,padding:"9px 12px",marginBottom:14,fontSize:12,color:C.accent}}>
        📅 Enter your <strong>take-home per paycheck</strong> below — the app will calculate your true safe-to-spend based on bills due before your next pay date.
      </div>
      <div style={{fontSize:12,fontWeight:700,color:C.textLight,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Income Per Paycheck</div>
      {[{k:"primary",l:`${getProfession(profCategory).icon} Primary take-home / paycheck`,ph:"2250"},{k:"other",l:"Other / Side Income",ph:"0"},{k:"trading",l:"Trading (avg/mo)",ph:"0"},{k:"rental",l:"Rental Income",ph:"0"},{k:"dividends",l:"Dividends",ph:"0"},{k:"freelance",l:"Freelance",ph:"0"}].map(i=>(
        <div key={i.k} style={{marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:600,color:C.slate,letterSpacing:.3,marginBottom:4}}>{i.l}</div>
          <input type="number" placeholder={i.ph} value={income[i.k]||""} onChange={e=>setIncome(p=>({...p,[i.k]:e.target.value}))} onBlur={e=>{if(e.target.value)showToast&&showToast("✓ Income saved");}} style={{width:"100%",background:C.surfaceAlt,border:`1.5px solid ${income[i.k]?C.accent:C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:14,outline:"none",transition:"border-color .15s"}}/>
        </div>
      ))}
      <div style={{fontSize:12,fontWeight:700,color:C.textLight,textTransform:"uppercase",letterSpacing:.5,marginBottom:8,marginTop:16}}>Account Balances</div>
      {[{k:"checking",l:"🏦 Checking",ph:"0"},{k:"savings",l:"💰 Savings",ph:"0"},{k:"cushion",l:"🛡️ Cushion / Emergency",ph:"0"},{k:"investments",l:"📈 Investments",ph:"0"},{k:"property",l:"🏠 Property",ph:"0"},{k:"vehicles",l:"🚗 Vehicles",ph:"0"}].map(a=>(
        <div key={a.k} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <div style={{flex:1,fontSize:13,color:C.textMid}}>{a.l}</div>
          <input type="number" placeholder={a.ph} value={accounts[a.k]||""} onChange={e=>setAccounts(p=>({...p,[a.k]:e.target.value}))} onBlur={e=>{if(e.target.value)showToast&&showToast("✓ Balance saved");}} style={{width:120,background:C.surfaceAlt,border:`1.5px solid ${accounts[a.k]?C.accent:C.border}`,borderRadius:10,padding:"8px 10px",fontSize:14,fontFamily:MF,fontWeight:700,color:C.text,outline:"none",textAlign:"right",transition:"border-color .15s"}}/>
        </div>
      ))}
    </div>

    {/* ── 3. APPEARANCE ──────────────────────────── */}
    <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
        <span style={{fontSize:18}}>🎨</span>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Appearance & Security</div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>{darkMode?"🌙":"☀️"}</span><div style={{fontSize:14,fontWeight:600,color:C.text}}>Dark Mode</div></div>
        <button onClick={()=>setDarkMode(d=>!d)} style={{background:"none",border:"none",cursor:"pointer",color:darkMode?C.accent:C.borderLight,padding:0}}>{darkMode?<ToggleRight size={28}/>:<ToggleLeft size={28}/>}</button>
      </div>
      <div style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>🔒</span><div><div style={{fontSize:14,fontWeight:600,color:C.text}}>PIN Lock</div><div style={{fontSize:12,color:C.textLight}}>{pinEnabled?"Enabled — tap to remove":"Disabled"}</div></div></div>
          <button onClick={()=>{if(pinEnabled){localStorage.removeItem("fv_pin_hash");setPinEnabled(false);showToast&&showToast("PIN removed");}else setShowPIN(true);}} style={{background:"none",border:"none",cursor:"pointer",color:pinEnabled?C.accent:C.borderLight,padding:0}}>{pinEnabled?<ToggleRight size={28}/>:<ToggleLeft size={28}/>}</button>
        </div>
        {showPIN&&<div style={{marginTop:10}}><PINSetup onSave={()=>{setPinEnabled(true);setShowPIN(false);showToast&&showToast("✓ PIN set");}} onCancel={()=>setShowPIN(false)} darkMode={darkMode}/></div>}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>📊</span><div><div style={{fontSize:14,fontWeight:600,color:C.text}}>Data Summary</div><div style={{fontSize:12,color:C.textLight}}>{expenses.length} expenses · {bills.length} bills · {debts.length} debts · {trades.length} trades</div></div></div>
      </div>
    </div>

    {/* ── 4. FEATURES ────────────────────────────── */}
    <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
        <span style={{fontSize:18}}>🔧</span>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Features</div>
      </div>
      {Tog("showTrading","Futures Trading","Track P&L, win rate, equity curve","📈")}
      {/* Household mode toggle in settings */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${C.border}`}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>🏠</span><div><div style={{fontSize:14,fontWeight:600,color:C.text}}>Household / Shared Mode</div><div style={{fontSize:12,color:C.textLight}}>Split expenses with a partner or roommate</div></div></div><button onClick={()=>{navTo&&navTo("household");}} style={{background:household?.enabled?C.accentBg:C.surfaceAlt,border:`1.5px solid ${household?.enabled?C.accent:C.border}`,borderRadius:99,padding:"6px 14px",cursor:"pointer",fontWeight:700,fontSize:12,color:household?.enabled?C.accent:C.textMid}}>{household?.enabled?"On — View →":"Set Up →"}</button></div>
      {Tog("showHealth","Health Score","A–F grade on your finances","🏆")}
      {Tog("showSavings","Savings Goals","Goal rings with projected dates","🎯")}
      {Tog("showForecast","Month Forecast","Burn rate + spending projection","🔮")}
    </div>

    {/* ── 5. DATA ────────────────────────────────── */}
    <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
        <span style={{fontSize:18}}>📦</span>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Data</div>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        <button className="ba" onClick={exportData} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:10,padding:"11px 0",color:C.accent,fontWeight:700,fontSize:13,cursor:"pointer"}}><Download size={14}/>Export JSON</button>
        <label className="ba" style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 0",color:C.textMid,fontWeight:700,fontSize:13,cursor:"pointer"}}><Database size={14}/>Import<input type="file" accept=".json" style={{display:"none"}} onChange={async e=>importData(e.target.files[0])}/></label>
      </div>
      {onResetOnboarding&&<button className="ba" onClick={onResetOnboarding} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 0",color:C.textMid,fontWeight:600,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:8}}><RefreshCw size={13}/>Re-run Setup Wizard</button>}
      {onResetAllData&&<button className="ba" onClick={onResetAllData} style={{width:"100%",background:C.redBg,border:`1px solid ${C.redMid}`,borderRadius:10,padding:"11px 0",color:C.red,fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:8}}><Trash2 size={13}/>Reset All Data</button>}
    </div>

    {/* ── Account ────────────────────────────────── */}
    <div style={{paddingTop:4,borderTop:`1px solid ${C.border}`}}>
      {userEmail&&(()=>{
        return(
          <div style={{marginBottom:8}}>
            {/* Account actions row */}
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <button className="ba" onClick={()=>{setShowEmailChange(e=>!e);setShowPwChange(false);setAcctMsg("");}}
                style={{flex:1,padding:"10px 0",borderRadius:12,border:`1.5px solid ${C.accentMid}`,background:showEmailChange?C.accentBg:"transparent",color:C.accent,fontWeight:700,fontSize:13,cursor:"pointer"}}>
                ✉️ Change Email
              </button>
              <button className="ba" onClick={()=>{setShowPwChange(p=>!p);setShowEmailChange(false);setAcctMsg("");}}
                style={{flex:1,padding:"10px 0",borderRadius:12,border:`1.5px solid ${C.border}`,background:showPwChange?C.surfaceAlt:"transparent",color:C.textMid,fontWeight:700,fontSize:13,cursor:"pointer"}}>
                🔑 Change Password
              </button>
            </div>
            {/* Change email form */}
            {showEmailChange&&<div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:14,padding:14,marginBottom:8}}>
              <div style={{fontSize:12,color:C.textLight,marginBottom:10}}>Current: <strong>{userEmail}</strong></div>
              <input type="email" value={newEmail} onChange={e=>{setNewEmail(e.target.value);setAcctMsg("");}} placeholder="New email address"
                style={{width:"100%",background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:10,padding:"10px 12px",fontSize:14,color:C.text,outline:"none",boxSizing:"border-box",marginBottom:8}}/>
              {acctMsg&&<div style={{fontSize:12,color:acctMsg.includes("✓")?C.green:C.red,marginBottom:8}}>{acctMsg}</div>}
              <button onClick={async()=>{
                if(!newEmail.includes("@")){setAcctMsg("Enter a valid email.");return;}
                setAcctLoading(true);
                try{
                  const r=await supaFetch("/auth/v1/user",{method:"PUT",body:JSON.stringify({email:newEmail})});
                  if(r.error){setAcctMsg("Failed: "+(r.error?.message||"try again"));setAcctLoading(false);return;}
                  setAcctMsg("✓ Confirmation sent to "+newEmail+" — check your inbox.");
                  setNewEmail("");
                }catch{setAcctMsg("Network error.");}
                setAcctLoading(false);
              }} disabled={acctLoading||!newEmail}
                style={{width:"100%",padding:"10px",borderRadius:10,border:"none",background:acctLoading||!newEmail?C.borderLight:C.accent,color:acctLoading||!newEmail?C.textFaint:"#fff",fontWeight:700,fontSize:13,cursor:acctLoading||!newEmail?"default":"pointer"}}>
                {acctLoading?"Sending...":"Send Confirmation"}
              </button>
            </div>}
            {/* Change password form */}
            {showPwChange&&<div style={{background:C.surfaceAlt,border:`1px solid ${C.border}`,borderRadius:14,padding:14,marginBottom:8}}>
              <input type="password" value={newPw1} onChange={e=>{setNewPw1(e.target.value);setAcctMsg("");}} placeholder="New password (min 6 chars)"
                style={{width:"100%",background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:10,padding:"10px 12px",fontSize:14,color:C.text,outline:"none",boxSizing:"border-box",marginBottom:8}}/>
              <input type="password" value={newPw2} onChange={e=>{setNewPw2(e.target.value);setAcctMsg("");}} placeholder="Confirm new password"
                style={{width:"100%",background:"#fff",border:`1.5px solid ${newPw2&&newPw1!==newPw2?C.red:C.border}`,borderRadius:10,padding:"10px 12px",fontSize:14,color:C.text,outline:"none",boxSizing:"border-box",marginBottom:8}}/>
              {acctMsg&&<div style={{fontSize:12,color:acctMsg.includes("✓")?C.green:C.red,marginBottom:8}}>{acctMsg}</div>}
              <button onClick={async()=>{
                if(newPw1.length<6){setAcctMsg("Must be at least 6 characters.");return;}
                if(newPw1!==newPw2){setAcctMsg("Passwords don't match.");return;}
                setAcctLoading(true);
                try{
                  const r=await supaFetch("/auth/v1/user",{method:"PUT",body:JSON.stringify({password:newPw1})});
                  if(r.error){setAcctMsg("Failed: "+(r.error?.message||"try again"));setAcctLoading(false);return;}
                  setAcctMsg("✓ Password updated!");setNewPw1("");setNewPw2("");
                  setTimeout(()=>{setShowPwChange(false);setAcctMsg("");},2000);
                }catch{setAcctMsg("Network error.");}
                setAcctLoading(false);
              }} disabled={acctLoading||newPw1.length<6||newPw1!==newPw2}
                style={{width:"100%",padding:"10px",borderRadius:10,border:"none",background:acctLoading||newPw1.length<6||newPw1!==newPw2?C.borderLight:C.green,color:acctLoading||newPw1.length<6||newPw1!==newPw2?C.textFaint:"#fff",fontWeight:700,fontSize:13,cursor:acctLoading||newPw1.length<6||newPw1!==newPw2?"default":"pointer"}}>
                {acctLoading?"Updating...":"Update Password"}
              </button>
            </div>}
          </div>
        );
      })()}
      {onSignOut&&<button className="ba" onClick={()=>onSignOut()} style={{width:"100%",marginBottom:8,background:C.redBg,border:`1px solid ${C.redMid}`,borderRadius:12,padding:"12px 0",color:C.red,fontWeight:700,fontSize:14,cursor:"pointer"}}>Sign Out</button>}
      {onSignIn&&<button className="ba" onClick={onSignIn} style={{width:"100%",background:`linear-gradient(135deg,${C.accent},${C.green})`,border:"none",borderRadius:12,padding:"12px 0",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>Sign In / Create Account</button>}
    </div>

  </div>);
}
function generateDemoData(){
  const now=new Date(),yr=now.getFullYear();
  const expenses=[],bills=[],debts=[],trades=[],shifts=[],savingsGoals=[],budgetGoals=[],balHist=[],recurrings=[],notifsSeed=[];

  // ── EXPENSES — uses all 21 real DEF_CATS category names ──────────────────
  const ET=[
    // Food & Dining
    ["Publix",           "Groceries",       [62,175]],
    ["Kroger",           "Groceries",       [45,130]],
    ["Whole Foods",      "Groceries",       [55,120]],
    ["Chipotle",         "Fast Food",       [11,16]],
    ["McDonald's",       "Fast Food",       [8,14]],
    ["Chick-fil-A",      "Fast Food",       [9,16]],
    ["Taco Bell",        "Fast Food",       [7,13]],
    ["Cheesecake Factory","Restaurants",    [48,85]],
    ["Sushi Den",        "Restaurants",     [35,70]],
    ["Local Bistro",     "Restaurants",     [28,65]],
    ["DoorDash",         "Restaurants",     [22,55]],
    ["Starbucks",        "Coffee",          [5,9]],
    ["Dunkin",           "Coffee",          [4,7]],
    ["Dutch Bros",       "Coffee",          [5,9]],
    // Home & Transport
    ["Shell",            "Gas",             [48,88]],
    ["BP Gas",           "Gas",             [45,82]],
    ["Uber",             "Rideshare",       [12,28]],
    ["Lyft",             "Rideshare",       [10,22]],
    // Personal Care
    ["Great Clips",      "Grooming / Haircuts",[28,38]],
    ["Barber Shop",      "Grooming / Haircuts",[30,40]],
    ["Target",           "Clothing",        [35,120]],
    ["Nike",             "Clothing",        [55,140]],
    ["Walgreens",        "Health / Medical", [15,60]],
    ["CVS Pharmacy",     "Health / Medical", [18,55]],
    ["Planet Fitness",   "Gym / Fitness",   [10,10]],
    // Bills & Subs (logged as expenses too sometimes)
    ["Amazon",           "Shopping",        [25,95]],
    ["Home Depot",       "Shopping",        [35,180]],
    ["Best Buy",         "Shopping",        [40,200]],
    ["Chewy",            "Pets",            [45,85]],
    ["Banfield Vet",     "Pets",            [55,150]],
    ["AMC Movies",       "Entertainment",   [14,28]],
    ["Steam",            "Entertainment",   [8,30]],
    ["Delta Airlines",   "Travel",          [180,420]],
    ["Airbnb",           "Travel",          [120,380]],
    ["Uber Eats",        "Dining Out",      [18,45]],
    ["Grubhub",          "Dining Out",      [16,40]],
    ["Car Wash",         "Misc",            [14,24]],
    ["USPS",             "Misc",            [8,18]],
  ];

  for(let mo=0;mo<12;mo++){
    const isFuture=mo>now.getMonth(),isCur=mo===now.getMonth();
    const dim=new Date(yr,mo+1,0).getDate();
    const maxDay=isFuture?0:isCur?Math.max(1,now.getDate()-1):dim;
    if(!maxDay)continue;
    const count=22+Math.floor(Math.random()*14);
    for(let i=0;i<count;i++){
      const[nm,cat,rng]=ET[Math.floor(Math.random()*ET.length)];
      const day=1+Math.floor(Math.random()*Math.max(1,maxDay-1));
      const amt=(rng[0]+Math.random()*(rng[1]-rng[0])).toFixed(2);
      const ownerId=Math.random()>0.6?"shared":Math.random()>0.5?"partner":"me";
      expenses.push({id:Date.now()+mo*10000+i+Math.floor(Math.random()*100),name:nm,category:cat,amount:amt,
        date:yr+"-"+String(mo+1).padStart(2,"0")+"-"+String(day).padStart(2,"0"),
        notes:"",owner:ownerId});
    }
    // Guaranteed subscriptions each month for SubsView detection
    const subDate=yr+"-"+String(mo+1).padStart(2,"0")+"-01";
    [["Netflix","Subscriptions","15.49"],["Spotify","Subscriptions","10.99"],
     ["Apple iCloud","Subscriptions","2.99"],["YouTube Premium","Subscriptions","13.99"],
     ["Disney+","Subscriptions","10.99"],["Gym Membership","Gym / Fitness","25.00"],
    ].forEach(([nm,cat,amt],si)=>{
      if(isFuture)return;
      expenses.push({id:Date.now()+mo*5000+si+9000,name:nm,category:cat,amount:amt,
        date:yr+"-"+String(mo+1).padStart(2,"0")+"-"+String(1+si).padStart(2,"0"),
        notes:"recurring",owner:"shared"});
    });
  }

  // ── BILLS — covers all recurring bill types ───────────────────────────────
  const BT=[
    ["Rent",           "1450","01","Monthly",false],
    ["Electric (FPL)", "94",  "15","Monthly",true],
    ["Internet (Xfinity)","65","22","Monthly",true],
    ["Phone (T-Mobile)","95", "08","Monthly",true],
    ["Renters Insurance","22", "01","Monthly",false],
    ["Car Insurance",  "148", "10","Monthly",false],
    ["Car Payment",    "385", "05","Monthly",false],
    ["Student Loan",   "320", "05","Monthly",false],
    ["Hulu",           "17",  "18","Monthly",true],
    ["Amazon Prime",   "15",  "23","Annual",  true],
    ["Life Insurance", "38",  "01","Monthly",false],
  ];
  const today2=new Date();
  BT.forEach(([nm,amt,day,rec,auto],idx)=>{
    for(let mo2=0;mo2<12;mo2++){
      const due=yr+"-"+String(mo2+1).padStart(2,"0")+"-"+day;
      bills.push({id:(idx+1)*100+mo2,name:nm,amount:amt,dueDate:due,
        paid:new Date(due+"T00:00:00")<today2,recurring:rec,autoPay:auto,notes:""});
    }
  });

  // ── DEBTS ─────────────────────────────────────────────────────────────────
  debts.push(
    {id:2001,name:"Student Loans",balance:"18400",original:"24000",rate:"5.75",minPayment:"320",type:"Student Loan"},
    {id:2002,name:"Car Loan (Honda)",balance:"9200",original:"15000",rate:"6.9",minPayment:"285",type:"Car Loan"},
    {id:2003,name:"Capital One Visa",balance:"2340",original:"3500",rate:"22.99",minPayment:"58",type:"Credit Card"},
    {id:2004,name:"Medical Bill",balance:"1200",original:"1200",rate:"0",minPayment:"100",type:"Medical"}
  );

  // ── TRADES ────────────────────────────────────────────────────────────────
  const syms=["ES","NQ","CL","GC","MES","MNQ","RTY"];
  for(let mo=0;mo<12;mo++){
    const n=5+Math.floor(Math.random()*9);
    for(let i=0;i<n;i++){
      const isWin=Math.random()>0.40;
      const pnl=isWin?(75+Math.random()*680).toFixed(0):"-"+(55+Math.random()*360).toFixed(0);
      const day=2+Math.floor(Math.random()*25);
      const sym=syms[Math.floor(Math.random()*syms.length)];
      const entry=(4500+Math.random()*200).toFixed(2);
      const exit=(parseFloat(entry)+(isWin?8:-6)*(1+Math.random()*4)).toFixed(2);
      trades.push({id:Date.now()+50000+mo*200+i,
        date:yr+"-"+String(mo+1).padStart(2,"0")+"-"+String(day).padStart(2,"0"),
        symbol:sym,side:Math.random()>0.5?"Long":"Short",contracts:"1",
        pnl,entry,exit,
        note:isWin?["Clean breakout","Trend continuation","Support bounce","Gap fill"][Math.floor(Math.random()*4)]:["Stopped out","Fakeout","Bad entry","News hit"][Math.floor(Math.random()*4)]});
    }
  }

  // ── SHIFTS — ICU/RN schedule with all shift types ─────────────────────────
  const ST=["Regular","Regular","Regular","Regular","Overtime","Night","Weekend","Holiday"];
  const mults={Regular:1,Overtime:1.5,Night:1.15,Weekend:1.25,Holiday:2};
  const notes=["ICU Floor 3","PACU","Float pool","Charge nurse","ED overflow","Step-down unit"];
  for(let mo=0;mo<12;mo++){
    for(let wk=0;wk<4;wk++){
      const day=Math.min(wk*7+1+Math.floor(Math.random()*5),28);
      const type=ST[Math.floor(Math.random()*ST.length)];
      const hours=(type==="Overtime"?12:type==="Night"?12:(8+Math.random()*4)).toFixed(1);
      const rate="42.50";
      shifts.push({id:Date.now()+80000+mo*100+wk,
        date:yr+"-"+String(mo+1).padStart(2,"0")+"-"+String(day).padStart(2,"0"),
        type,hours,rate,gross:(parseFloat(hours)*parseFloat(rate)*(mults[type]||1)).toFixed(2),
        note:notes[Math.floor(Math.random()*notes.length)]});
    }
  }

  // ── SAVINGS GOALS ─────────────────────────────────────────────────────────
  savingsGoals.push(
    {id:3001,name:"Emergency Fund",  icon:"🛡️",color:"#6366F1",target:"18000",saved:"11400",monthly:"400"},
    {id:3002,name:"New Car",         icon:"🚗",color:"#059669",target:"8000", saved:"3200", monthly:"300"},
    {id:3003,name:"Vacation — Italy",icon:"✈️",color:"#D97706",target:"5500", saved:"1850", monthly:"250"},
    {id:3004,name:"Trading Account", icon:"📈",color:"#7C3AED",target:"10000",saved:"5800", monthly:"200"},
    {id:3005,name:"Wedding Fund",    icon:"💍",color:"#EC4899",target:"25000",saved:"8200", monthly:"500"}
  );

  // ── BUDGET ENVELOPES — uses real DEF_CATS names ───────────────────────────
  budgetGoals.push(
    {id:4001,category:"Groceries",         limit:"600",note:"Weekly runs"},
    {id:4002,category:"Gas",               limit:"200",note:"Commute + errands"},
    {id:4003,category:"Dining Out",        limit:"180",note:"Date nights"},
    {id:4004,category:"Entertainment",     limit:"120",note:"Movies, games"},
    {id:4005,category:"Clothing",          limit:"150",note:"Seasonal refresh"},
    {id:4006,category:"Grooming / Haircuts",limit:"60",note:"Every 3 weeks"},
    {id:4007,category:"Pets",              limit:"200",note:"Vet + food"},
    {id:4008,category:"Subscriptions",     limit:"80", note:"Monthly subs cap"}
  );

  // ── BALANCE HISTORY — includes all account types, growing trend ───────────
  let checking=4280,savings=11400,cushion=1800,investments=14200,
      k401=28500,roth=12000,brokerage=8400,crypto=1800;
  for(let mo=0;mo<12;mo++){
    for(let wk=0;wk<4;wk++){
      const day=wk*7+1;if(day>28)continue;
      checking=Math.max(1800,checking+(Math.random()-.45)*600);
      savings=Math.max(8000,savings+280+(Math.random()-.3)*150);
      cushion=Math.max(1200,cushion+(Math.random()-.4)*80);
      investments=Math.max(10000,investments+180+(Math.random()-.35)*400);
      k401=Math.max(20000,k401+350+(Math.random()-.3)*200);
      roth=Math.max(8000,roth+150+(Math.random()-.3)*120);
      brokerage=Math.max(5000,brokerage+120+(Math.random()-.4)*300);
      crypto=Math.max(500,crypto+(Math.random()-.5)*200);
      balHist.push({
        date:yr+"-"+String(mo+1).padStart(2,"0")+"-"+String(day).padStart(2,"0"),
        checking:Math.round(checking),savings:Math.round(savings),
        cushion:Math.round(cushion),investments:Math.round(investments),
        k401:Math.round(k401),roth_ira:Math.round(roth),
        brokerage:Math.round(brokerage),crypto:Math.round(crypto),
        total:Math.round(checking+savings+cushion+investments+k401+roth+brokerage+crypto)
      });
    }
  }

  // ── MERCHANT CATEGORY MAP — for AI auto-suggest ───────────────────────────
  const merchantCats={
    "publix":"Groceries","kroger":"Groceries","whole foods":"Groceries",
    "chipotle":"Fast Food","mcdonald's":"Fast Food","chick-fil-a":"Fast Food","taco bell":"Fast Food",
    "cheesecake factory":"Restaurants","doordash":"Restaurants","grubhub":"Dining Out","uber eats":"Dining Out",
    "starbucks":"Coffee","dunkin":"Coffee","dutch bros":"Coffee",
    "shell":"Gas","bp gas":"Gas",
    "uber":"Rideshare","lyft":"Rideshare",
    "great clips":"Grooming / Haircuts","barber shop":"Grooming / Haircuts",
    "target":"Clothing","nike":"Clothing",
    "walgreens":"Health / Medical","cvs pharmacy":"Health / Medical",
    "planet fitness":"Gym / Fitness",
    "amazon":"Shopping","home depot":"Shopping","best buy":"Shopping",
    "chewy":"Pets","banfield vet":"Pets",
    "amc movies":"Entertainment","steam":"Entertainment",
    "delta airlines":"Travel","airbnb":"Travel",
    "netflix":"Subscriptions","spotify":"Subscriptions","apple icloud":"Subscriptions",
    "youtube premium":"Subscriptions","disney+":"Subscriptions",
    "gym membership":"Gym / Fitness",
  };

  return{expenses,bills,debts,trades,shifts,savingsGoals,budgetGoals,balHist,merchantCats};
}

function HealthScoreView({income,expenses,debts,accounts,bills,onNavigate}){
  const ti=(parseFloat(income.primary||0)*(income.payFrequency==="Weekly"?4.33:income.payFrequency==="Twice Monthly"?2:income.payFrequency==="Monthly"?1:2.17))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const te=expenses.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const td=debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0);
  const ta=(parseFloat(accounts.checking||0))+(parseFloat(accounts.savings||0))+(parseFloat(accounts.cushion||0))+(parseFloat(accounts.investments||0));
  const liquid=(parseFloat(accounts.savings||0))+(parseFloat(accounts.cushion||0));
  const _hsNow=new Date();const _hsMs=_hsNow.getFullYear()+"-"+String(_hsNow.getMonth()+1).padStart(2,"0");
  const moExpActual=expenses.filter(e=>e.date?.startsWith(_hsMs)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const _uniqueMonths=new Set(expenses.map(e=>e.date?.slice(0,7)).filter(Boolean)).size;
  const moExp=moExpActual>0?moExpActual:(te>0?te/Math.max(1,_uniqueMonths):1);
  const sr=ti>0?Math.max(0,(ti-moExp)/ti*100):0;
  const dti=ti>0?(debts.reduce((s,d)=>s+(parseFloat(d.minPayment)||0),0)/ti*100):0;
  const ef=liquid/Math.max(1,moExp);
  const unpaidBills=bills.filter(b=>!b.paid&&dueIn(b.dueDate)<0).length;
  const pillars=[
    {id:'savings',label:'Savings Rate',score:sr>=20?100:sr>=15?85:sr>=10?70:sr>=5?50:sr>0?30:0,val:sr.toFixed(1)+'%',target:'20%+ ideal',tip:sr<10?'Aim to save 10-20% of income each month':'Great savings discipline!',nav:'cashflow'},
    {id:'emergency',label:'Emergency Fund',score:ef>=6?100:ef>=3?80:ef>=1?55:ef>0?30:0,val:ef.toFixed(1)+'mo',target:'3-6 months',tip:ef<3?'Build to 3 months of expenses in savings/cushion':'Solid emergency cushion!',nav:'accounts'},
    {id:'debt',label:'Debt Load',score:td===0?100:dti<15?85:dti<25?65:dti<35?45:25,val:dti.toFixed(1)+'% DTI',target:'Under 25%',tip:dti>35?'High DTI — focus extra payments on highest-rate debt':td===0?'Debt free!':'On track — keep minimums and pay extra when possible',nav:'debt'},
    {id:'bills',label:'Bill Health',score:unpaidBills===0?100:unpaidBills<=1?60:20,val:unpaidBills+' overdue',target:'0 overdue',tip:unpaidBills>0?`${unpaidBills} overdue bill${unpaidBills!==1?'s':''} — pay immediately to avoid late fees`:'All bills current!',nav:'bills'},
    {id:'networth',label:'Net Worth',score:ta>td*2?100:ta>td?75:ta>0?50:ta===0?25:10,val:fmt(ta-td),target:'Assets > Debts',tip:ta>td?'Assets exceed debts — building wealth':'Focus on reducing debt and growing assets',nav:'networthtrend'},
  ];
  const overall=Math.round(pillars.reduce((s,p)=>s+p.score,0)/pillars.length/10);
  const gr=s=>s>=9?'A+':s>=8?'A':s>=7?'B':s>=6?'C':s>=5?'D':'F';
  const gc=s=>s>=8?C.green:s>=6?C.accent:s>=4?C.amber:C.red;
  const circ=2*Math.PI*38;
  const dash=circ*(overall/10);
  return(
    <div className="fu">
      <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.3,marginBottom:16}}>Financial Health</div>
      {/* score gauge */}
      <div style={{background:C.navy,borderRadius:18,padding:'24px',marginBottom:16,display:'flex',alignItems:'center',gap:20}}>
        <div style={{position:'relative',width:100,height:100,flexShrink:0}}>
          <svg viewBox="0 0 100 100" style={{transform:'rotate(-90deg)'}}>
            <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="10"/>
            <circle cx="50" cy="50" r="38" fill="none" stroke={gc(overall)} strokeWidth="10" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
          </svg>
          <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
            <div style={{fontFamily:MF,fontWeight:900,fontSize:28,color:'#fff',lineHeight:1}}>{gr(overall)}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.5)'}}>{overall}/10</div>
          </div>
        </div>
        <div style={{flex:1}}>
          <div style={{fontFamily:MF,fontWeight:800,fontSize:22,color:'#fff',marginBottom:4}}>
            {overall>=8?'Excellent 🏆':overall>=6?'Good 👍':overall>=4?'Fair ⚠️':'Needs Work 🔴'}
          </div>
          <div style={{fontSize:13,color:'rgba(255,255,255,.6)',lineHeight:1.5}}>
            {overall>=8?'Your finances are in great shape. Keep it up.':overall>=6?'Solid foundation — a few areas to improve.':overall>=4?'Some important areas need attention.':'Take action on the items below to improve your score.'}
          </div>
          <div style={{marginTop:10,display:'flex',gap:6,flexWrap:'wrap'}}>
            {pillars.map(p=><div key={p.id} style={{width:14,height:14,borderRadius:'50%',background:p.score>=80?C.green:p.score>=55?C.amber:C.red}}/>)}
          </div>
        </div>
      </div>
      {/* pillar cards */}
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {pillars.map(p=>{const col=p.score>=80?C.green:p.score>=55?C.amber:C.red;const bg=p.score>=80?C.greenBg:p.score>=55?C.amberBg:C.redBg;return(
          <div key={p.id} onClick={()=>onNavigate&&onNavigate(p.nav)} style={{background:C.surface,borderRadius:14,padding:'14px 16px',boxShadow:'0 1px 4px rgba(10,22,40,.06)',cursor:'pointer'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <div style={{fontSize:14,fontWeight:700,color:C.text}}>{p.label}</div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:col}}>{p.val}</div>
                <div style={{background:bg,color:col,fontWeight:700,fontSize:11,borderRadius:99,padding:'2px 8px'}}>{p.score>=80?'Good':p.score>=55?'Fair':'Low'}</div>
              </div>
            </div>
            <div style={{height:5,background:C.borderLight,borderRadius:99,overflow:'hidden',marginBottom:7}}>
              <div style={{height:'100%',width:p.score+'%',background:col,borderRadius:99,transition:'width .5s'}}/>
            </div>
            <div style={{fontSize:12,color:C.textMid,lineHeight:1.4}}>{p.tip}</div>
            <div style={{fontSize:11,color:C.textLight,marginTop:4}}>Target: {p.target} · tap to view →</div>
          </div>
        );})}
      </div>

      {/* Actionable next steps */}
      {(()=>{
        const nextSteps=pillars
          .filter(p=>p.score<80)
          .sort((a,b)=>a.score-b.score)
          .slice(0,3)
          .map(p=>({
            pillar:p.label,
            action:p.id==="savings"?"Set up auto-transfer on payday — even $50 helps":
                   p.id==="emergency"?"Move "+fmt(Math.max(0,(ti/12*3)-(parseFloat(accounts.savings||0)+parseFloat(accounts.cushion||0))))+" to savings to reach 3-month goal":
                   p.id==="debt"?"Add "+fmt(50)+" extra to highest-rate debt — saves hundreds in interest":
                   p.id==="bills"?"Pay overdue bills immediately to stop late fees compounding":
                   "Review and grow your asset accounts",
            impact:p.id==="savings"?"+15-20 pts":p.id==="emergency"?"+20 pts":p.id==="debt"?"+10 pts":"+25 pts",
            color:p.score<40?C.red:C.amber,
          }));
        if(!nextSteps.length)return(
          <div style={{background:C.greenBg,border:`1px solid ${C.greenMid}`,borderRadius:16,padding:18,textAlign:"center"}}>
            <div style={{fontSize:24,marginBottom:8}}>🏆</div>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:15,color:C.green}}>Excellent financial health!</div>
            <div style={{fontSize:13,color:C.green,opacity:.8,marginTop:4}}>All pillars are strong. Keep it up.</div>
          </div>
        );
        return(
          <div style={{background:C.surface,borderRadius:18,padding:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)"}}>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Your Next Steps</div>
            {nextSteps.map((step,i)=>(
              <div key={i} style={{display:"flex",gap:12,padding:"12px 0",borderBottom:i<nextSteps.length-1?`1px solid ${C.border}`:"none"}}>
                <div style={{width:32,height:32,borderRadius:8,background:step.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:MF,fontWeight:800,fontSize:13,color:step.color,flexShrink:0}}>{i+1}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:step.color,textTransform:"uppercase",letterSpacing:.4,marginBottom:3}}>{step.pillar}</div>
                  <div style={{fontSize:13,color:C.text,lineHeight:1.5}}>{step.action}</div>
                </div>
                <div style={{background:C.greenBg,border:`1px solid ${C.greenMid}`,borderRadius:99,padding:"3px 8px",fontSize:11,fontWeight:700,color:C.green,flexShrink:0,alignSelf:"flex-start"}}>{step.impact}</div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}


function IncomeSpendingView({expenses,income,trades,bills=[]}){
  const[range,setRange]=useState("1M");
  const now=new Date();
  const ti=useMemo(()=>(parseFloat(income.primary||0)*(income.payFrequency==="Weekly"?4.33:income.payFrequency==="Twice Monthly"?2:income.payFrequency==="Monthly"?1:2.17))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0)),[income]);
  const months=range==="1M"?1:range==="3M"?3:range==="6M"?6:12;
  const data=useMemo(()=>Array.from({length:months},(_,i)=>{
    const d=new Date(now.getFullYear(),now.getMonth()-months+1+i,1);
    const ms=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
    const sp=expenses.filter(e=>e.date?.startsWith(ms)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
    const tp=trades.filter(t=>t.date?.startsWith(ms)).reduce((s,t)=>s+(parseFloat(t.pnl)||0),0);
    const inc=ti+(tp>0?tp:0);
    return{month:FULL_MOS[d.getMonth()].slice(0,3),income:parseFloat(inc.toFixed(0)),spending:parseFloat(sp.toFixed(0)),saved:parseFloat(Math.max(0,inc-sp).toFixed(0))};
  }),[expenses,income,trades,months]);
  const TT=({active,payload,label})=>{if(!active||!payload?.length)return null;return(<div style={{background:C.surface,borderRadius:12,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"10px 14px",fontSize:12}}><div style={{fontWeight:700,marginBottom:6}}>{label}</div>{payload.map(p=><div key={p.dataKey} style={{display:"flex",justifyContent:"space-between",gap:12,marginBottom:2}}><span style={{color:C.textLight}}>{p.name}</span><span style={{fontWeight:700}}>{fmt(p.value)}</span></div>)}</div>);};
  return(
    <div className="fu">
      {(()=>{
        const sources=[{l:"Primary",v:parseFloat(income.primary||0),c:C.accent},{l:"Trading",v:parseFloat(income.trading||0),c:C.green},{l:"Freelance",v:parseFloat(income.freelance||0),c:C.purple},{l:"Rental",v:parseFloat(income.rental||0),c:C.amber},{l:"Dividends",v:parseFloat(income.dividends||0),c:C.teal},{l:"Other",v:parseFloat(income.other||0),c:C.textLight}].filter(s=>s.v>0);
        const total=sources.reduce((s,x)=>s+x.v,0);
        if(!total)return null;
        return(<div style={{background:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:18,padding:18,marginBottom:14}}>
          <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Income Breakdown</div>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <PieChart width={120} height={120}><Pie data={sources.map(s=>({name:s.l,value:s.v}))} cx={55} cy={55} innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={2}>{sources.map((s,i)=><Cell key={i} fill={s.c}/>)}</Pie></PieChart>
            <div style={{flex:1}}>{sources.map(s=>(<div key={s.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:s.c}}/><span style={{fontSize:12,color:C.textMid}}>{s.l}</span></div><div style={{textAlign:"right"}}><span style={{fontFamily:MF,fontWeight:700,fontSize:12,color:C.text}}>{fmt(s.v)}</span><span style={{fontSize:11,color:C.textFaint,marginLeft:4}}>{(s.v/total*100).toFixed(0)}%</span></div></div>))}</div>
          </div>
        </div>);
      })()}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.3}}>Income vs Spending</div>
        
      </div>
      <div style={{display:"flex",gap:6,background:C.borderLight,borderRadius:10,padding:3,marginBottom:16}}>
        {["1M","3M","6M","1Y"].map(r=><button key={r} className="ba" onClick={()=>setRange(r)} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",background:range===r?"#fff":"transparent",color:range===r?C.accent:C.textLight,fontWeight:range===r?700:500,fontSize:13,cursor:"pointer"}}>{r}</button>)}
      </div>
      <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"20px 4px 12px",marginBottom:14}}>
        <div style={{display:"flex",gap:16,paddingLeft:16,marginBottom:12,flexWrap:"wrap"}}>{[[C.green,"Income"],[C.red,"Spending"],[C.accent,"Saved"],[C.teal,"Savings %"]].map(([c,l])=><div key={l} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:10,borderRadius:3,background:c}}/><span style={{fontSize:12,color:C.textLight}}>{l}</span></div>)}</div>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={data.map(m=>({...m,savingsRate:m.income>0?Math.max(0,((m.income-m.spending)/m.income)*100):0}))} margin={{left:4,right:4,top:4,bottom:0}} barGap={3}>
            <XAxis dataKey="month" tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false}/>
            <YAxis yAxisId="left" tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v>=1000?(v/1000).toFixed(0)+"k":v)} width={40}/>
            <YAxis yAxisId="right" orientation="right" tick={{fill:C.teal,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>v.toFixed(0)+"%"} width={32}/>
            <Tooltip content={<TT/>}/>
            <Bar yAxisId="left" dataKey="income" name="Income" fill={C.green} radius={[4,4,0,0]}/>
            <Bar yAxisId="left" dataKey="spending" name="Spending" fill={C.red} radius={[4,4,0,0]}/>
            <Bar yAxisId="left" dataKey="saved" name="Saved" fill={C.accent} radius={[4,4,0,0]}/>
            <Line yAxisId="right" type="monotone" dataKey="savingsRate" name="Savings %" stroke={C.teal} strokeWidth={2.5} dot={{r:3,fill:C.teal}} activeDot={{r:5}}/>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {data.map(m=>{const rate=m.income>0?Math.max(0,(m.income-m.spending)/m.income*100):0;return(<div key={m.month} style={{background:C.surface,borderRadius:12,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"12px 14px",display:"flex",alignItems:"center",gap:12}}><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,width:32}}>{m.month}</div><div style={{flex:1}}><BarProg pct={m.income>0?m.spending/m.income*100:0} color={m.spending>m.income?C.red:C.green} h={5}/></div><div style={{textAlign:"right",minWidth:80}}><div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>{fmt(m.spending)}</div><div style={{fontSize:11,color:C.textLight}}>{rate.toFixed(0)}% saved</div></div></div>);})}
      </div>
    </div>
  );
}

function DashSettingsView({config,setConfig,showTrading}){
  const toggle=k=>setConfig(p=>({...p,[k]:!p[k]}));
  const items=[{k:"showIncomeChart",icon:"📊",label:"Income vs Spending Chart",desc:"3-month bar chart on home"},{k:"showMetrics",icon:"📐",label:"Key Metrics Grid",desc:"Net worth, health, emergency fund"},{k:"showAccounts",icon:"🏦",label:"Account Cards",desc:"Scrollable balance overview"},{k:"showForecast",icon:"🔮",label:"Month Forecast",desc:"Burn rate and projected spend"},{k:"showBills",icon:"📅",label:"Upcoming Bills",desc:"Next 3 bills with countdown"},{k:"showRecent",icon:"🕒",label:"Recent Transactions",desc:"Last 4 logged expenses"},...(showTrading?[{k:"showTradeCard",icon:"📈",label:"Trading Summary",desc:"P&L and record"}]:[])];
  return(
    <div className="fu">
      <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,marginBottom:4,letterSpacing:-.3}}>Customize Dashboard</div>
      <div style={{fontSize:13,color:C.textLight,marginBottom:18}}>Choose what shows on your home screen</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {items.map(item=>(
          <div key={item.k} style={{background:C.surface,border:`1.5px solid ${config[item.k]?C.accentMid:C.border}`,borderRadius:14,padding:"13px 16px",display:"flex",alignItems:"center",gap:14}}>
            <span style={{fontSize:22}}>{item.icon}</span>
            <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:C.text}}>{item.label}</div><div style={{fontSize:12,color:C.textLight,marginTop:2}}>{item.desc}</div></div>
            <button onClick={()=>toggle(item.k)} style={{background:"none",border:"none",cursor:"pointer",color:config[item.k]?C.accent:C.borderLight,padding:0}}>{config[item.k]?<ToggleRight size={28}/>:<ToggleLeft size={28}/>}</button>
          </div>
        ))}
      </div>
    </div>
  );
}function Row({icon,title,sub,right,rightColor,rightSub,onDelete,badge,onClick}){
  return(
    <div className="rw" style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"13px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12,cursor:onClick?"pointer":"default"}} onClick={onClick}>
      <div style={{width:38,height:38,borderRadius:10,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{icon}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
          <span style={{fontSize:14,fontWeight:600,color:C.text}}>{title}</span>
          {badge&&<span style={{fontSize:10,fontWeight:700,background:badge.bg,color:badge.color,padding:"2px 7px",borderRadius:99}}>{badge.label}</span>}
        </div>
        <div style={{fontSize:12,color:C.textLight,lineHeight:1.4}}>{sub}</div>
        {rightSub&&<div style={{fontSize:11,color:C.textLight,marginTop:2}}>{rightSub}</div>}
      </div>
      <div style={{textAlign:"right",flexShrink:0}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:rightColor||C.text}}>{right}</div>
      </div>
      {onDelete&&<button className="ba db" onClick={e=>{e.stopPropagation();onDelete();}} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,padding:4,display:"flex"}}><Trash2 size={14}/></button>}
    </div>
  );
}

function SwipeRow({children,onDelete}){
  const[swiped,setSwiped]=useState(false);
  const startX=useRef(0);
  return(
    <div style={{position:"relative",overflow:"hidden",marginBottom:8}}
      onTouchStart={e=>{startX.current=e.touches[0].clientX;}}
      onTouchEnd={e=>{const dx=startX.current-e.changedTouches[0].clientX;if(dx>60)setSwiped(true);else if(dx<-20)setSwiped(false);}}>
      <div style={{transform:swiped?"translateX(-72px)":"translateX(0)",transition:"transform .2s ease"}}>{children}</div>
      {swiped&&<div style={{position:"absolute",right:0,top:0,bottom:0,width:68,display:"flex",alignItems:"center",justifyContent:"center",background:C.red,borderRadius:"0 14px 14px 0",cursor:"pointer"}} onClick={()=>{onDelete();setSwiped(false);}}><Trash2 size={18} color="#fff"/></div>}
    </div>
  );
}

function ConfirmDialog({title,message,onConfirm,onCancel,danger=false}){
  return(
    <div style={{position:"fixed",inset:0,zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(10,22,40,.55)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",backdropFilter:"blur(4px)",padding:20,animation:"fadeIn .15s ease"}} onClick={e=>e.target===e.currentTarget&&onCancel()}>
      <div style={{background:C.surface,borderRadius:20,padding:24,width:"100%",maxWidth:340,boxShadow:"0 8px 40px rgba(0,0,0,.2)",animation:"slideUp .2s ease"}}>
        <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text,marginBottom:8}}>{title}</div>
        <div style={{fontSize:14,color:C.textLight,lineHeight:1.5,marginBottom:20}}>{message}</div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onCancel} style={{flex:1,background:C.bg,borderRadius:12,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"12px 0",color:C.textMid,fontWeight:600,fontSize:14,cursor:"pointer"}}>Cancel</button>
          <button onClick={onConfirm} style={{flex:1,background:danger?C.red:C.accent,border:"none",borderRadius:12,padding:"12px 0",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>{danger?"Delete":"Confirm"}</button>
        </div>
      </div>
    </div>
  );
}

function TaxView({expenses,income,trades,shifts,appName}){
  const now=new Date();const yr=now.getFullYear();
  const ti=(parseFloat(income.primary||0)*(income.payFrequency==="Weekly"?4.33:income.payFrequency==="Twice Monthly"?2:income.payFrequency==="Monthly"?1:2.17))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const annualIncome=ti*12;
  const tradePnl=trades.filter(t=>t.date?.startsWith(String(yr))).reduce((s,t)=>s+(parseFloat(t.pnl)||0),0);
  const shiftEarnings=shifts.filter(s=>s.date?.startsWith(String(yr))).reduce((s,x)=>s+(parseFloat(x.gross)||0),0);
  const catMap=expenses.filter(e=>e.date?.startsWith(String(yr))).reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount)||0);return a},{});
  const totalExp=Object.values(catMap).reduce((s,v)=>s+v,0);
  function exportCSV(){const hdr=["Date","Name","Category","Amount"];const rowData=expenses.filter(e=>e.date?.startsWith(String(yr))).map(e=>[e.date,e.name.replace(/,/g," "),e.category,parseFloat(e.amount).toFixed(2)]);const csv=[hdr,...rowData].map(r=>r.join(",")).join("\r\n");const b=new Blob([csv],{type:"text/csv"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=(appName||"trackfi")+"-ytd-"+yr+".csv";a.click();URL.revokeObjectURL(u);}
  return(
    <div className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text}}>Tax Summary {yr}</div>
        <button onClick={exportCSV} style={{display:"flex",alignItems:"center",gap:5,background:C.green,border:"none",borderRadius:10,padding:"8px 12px",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}}><Download size={13}/>CSV</button>
      </div>
      <div style={{fontSize:13,color:C.textLight,marginBottom:16}}>Year-to-date overview for tax preparation</div>
      <div style={{background:C.navy,borderRadius:18,padding:20,marginBottom:14,color:"#fff"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[["Annual Income",fmt(annualIncome),C.greenMid],["YTD Expenses",fmt(totalExp),C.redMid],["Trading P&L",(tradePnl>=0?"+":"")+fmt(tradePnl),tradePnl>=0?C.greenMid:C.redMid],["Shift Earnings",fmt(shiftEarnings),C.accentMid]].map(([l,v,c])=><div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"10px 12px"}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:3}}>{l.toUpperCase()}</div><div style={{fontFamily:MF,fontSize:16,fontWeight:800,color:c}}>{v}</div></div>)}
        </div>
      </div>
      <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"11px 14px",marginBottom:14,fontSize:13,color:C.accent}}>⚠️ For reference only. Consult a tax professional.</div>
      <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Expenses by Category</div>
      {annualIncome>0&&(()=>{
        const sources=[{name:"Salary",amt:parseFloat(income.primary||0)*12,color:C.accent},{name:"Other",amt:parseFloat(income.other||0)*12,color:C.green},{name:"Trading P&L",amt:tradePnl,color:tradePnl>=0?C.green:C.red},{name:"Shifts",amt:shiftEarnings,color:C.purple}].filter(s=>s.amt>0);
        const totalYTD=sources.reduce((s,x)=>s+x.amt,0);
        const bracket=totalYTD<11600?0.10:totalYTD<47150?0.12:totalYTD<100525?0.22:totalYTD<191950?0.24:0.32;
        const estTax=totalYTD*bracket;
        return(<div style={{background:C.surface,borderRadius:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"14px",marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:600,color:C.textLight}}>Estimated Tax Liability</div>
            <div style={{background:C.amberBg,border:`1px solid ${C.amberMid}`,borderRadius:8,padding:"3px 10px",fontSize:11,fontWeight:700,color:C.amber}}>~{Math.round(bracket*100)}% bracket</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
            <div style={{background:C.redBg,borderRadius:10,padding:"10px",textAlign:"center"}}><div style={{fontSize:10,color:C.red,fontWeight:600,marginBottom:2}}>ANNUAL EST.</div><div style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.red}}>{fmt(estTax)}</div></div>
            <div style={{background:C.amberBg,borderRadius:10,padding:"10px",textAlign:"center"}}><div style={{fontSize:10,color:C.amber,fontWeight:600,marginBottom:2}}>QUARTERLY</div><div style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.amber}}>{fmt(estTax/4)}</div></div>
            <div style={{background:C.greenBg,borderRadius:10,padding:"10px",textAlign:"center"}}><div style={{fontSize:10,color:C.green,fontWeight:600,marginBottom:2}}>EFFECTIVE</div><div style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.green}}>{Math.round(bracket*100)}%</div></div>
          </div>
          {sources.map(s=>{const w=totalYTD>0?Math.max(2,s.amt/totalYTD*100):0;return(<div key={s.name} style={{marginBottom:7}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:12,color:C.textMid}}>{s.name}</span><span style={{fontSize:12,fontFamily:MF,fontWeight:600}}>{fmt(s.amt)}</span></div><div style={{height:5,background:C.borderLight,borderRadius:3}}><div style={{height:5,width:w.toFixed(1)+"%",background:s.color||C.accent,borderRadius:3}}/></div></div>);})}
        </div>);
      })()}
        {Object.entries(catMap).sort((a,b)=>b[1]-a[1]).map(([cat,amt],i)=>(<div key={cat} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,fontWeight:600,color:C.text}}>{cat}</span><span style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>{fmt(amt)}</span></div><BarProg pct={totalExp>0?amt/totalExp*100:0} color={PIE_COLORS[i%PIE_COLORS.length]} h={5}/></div>))}
        <div style={{display:"flex",justifyContent:"space-between",paddingTop:12,marginTop:4,borderTop:`1px solid ${C.border}`}}><span style={{fontSize:13,fontWeight:700,color:C.text}}>Total YTD</span><span style={{fontFamily:MF,fontWeight:800,fontSize:16,color:C.red}}>{fmt(totalExp)}</span></div>
      </div>
    </div>
  );
}


function SubsView({detectedSubs,expenses,showToast}){
  const[dismissed,setDismissed]=useState(()=>{try{return JSON.parse(localStorage.getItem("fv_sub_dismissed")||"[]");}catch{return[];}});
  useEffect(()=>{try{localStorage.setItem("fv_sub_dismissed",JSON.stringify(dismissed));}catch{}},[dismissed]);
  const active=detectedSubs.filter(s=>!dismissed.includes(s.name));
  const monthly=active.filter(s=>s.interval==="Monthly");
  const other=active.filter(s=>s.interval!=="Monthly");
  const totalMo=monthly.reduce((s,x)=>s+(parseFloat(x.amount)||0),0);
  const totalAll=active.reduce((s,x)=>{const a=parseFloat(x.amount)||0;if(x.interval==="Monthly")return s+a;if(x.interval==="Weekly")return s+a*4.33;if(x.interval==="Annual")return s+a/12;return s+a;},0);
  const catMap=active.reduce((a,s)=>{a[s.category]=(a[s.category]||0)+(parseFloat(s.amount)||0);return a},{});
  const cats=Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
  const maxCat=cats[0]?.[1]||1;
  return(
    <div className="fu">
      <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.3,marginBottom:4}}>Subscriptions</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:13,color:C.textLight}}>Auto-detected from your expenses</div>
        {dismissed.length>0&&<button onClick={()=>{setDismissed([]);localStorage.removeItem("fv_sub_dismissed");}} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:C.accent,fontWeight:600,padding:0}}>Restore {dismissed.length} hidden</button>}
      </div>
      {active.length===0&&<div style={{textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:36,marginBottom:12}}>🔍</div><div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:4}}>No subscriptions detected yet</div><div style={{fontSize:13,color:C.textLight}}>Add more expenses and Trackfi will find recurring patterns.</div></div>}
      {active.length>0&&<>
        {/* summary card */}
        <div style={{background:C.navy,borderRadius:18,padding:20,marginBottom:14,color:'#fff'}}>
          <div style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:.5,marginBottom:4}}>Monthly Subscriptions</div>
          <div style={{fontFamily:MF,fontSize:32,fontWeight:800,color:'#fff',marginBottom:2}}>{fmt(totalMo)}<span style={{fontSize:14,fontWeight:500,color:'rgba(255,255,255,.5)'}}>/mo</span></div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:12}}>
            {[['Annual',fmt(totalMo*12),C.amberMid],['Per Day',fmt(totalMo/30.4),C.accentMid],['Count',String(active.length)+'  subs',C.greenMid]].map(([l,v,c])=>(
              <div key={l} style={{background:'rgba(255,255,255,.08)',borderRadius:10,padding:'9px 8px'}}>
                <div style={{fontSize:9,color:'rgba(255,255,255,.4)',fontWeight:600,marginBottom:2}}>{l.toUpperCase()}</div>
                <div style={{fontFamily:MF,fontSize:12,fontWeight:700,color:c}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        {/* category breakdown */}
        {cats.length>1&&<div style={{background:C.surface,borderRadius:14,padding:'14px',marginBottom:14,boxShadow:'0 1px 4px rgba(10,22,40,.06)'}}>
          <div style={{fontSize:12,fontWeight:700,color:C.textLight,textTransform:'uppercase',letterSpacing:.5,marginBottom:10}}>By Category</div>
          {cats.map(([cat,amt])=><div key={cat} style={{marginBottom:8}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
              <span style={{fontSize:13,color:C.text}}>{cat}</span>
              <span style={{fontSize:13,fontFamily:MF,fontWeight:700,color:C.red}}>{fmt(amt)}/mo</span>
            </div>
            <div style={{height:5,background:C.borderLight,borderRadius:99}}><div style={{height:'100%',width:(amt/maxCat*100).toFixed(1)+'%',background:C.accent,borderRadius:99}}/></div>
          </div>)}
        </div>}
        {/* subscription list */}
        {monthly.length>0&&<div style={{marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:C.textLight,textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Monthly</div>
          {monthly.map((s,i)=>(<div key={i} style={{background:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:14,padding:'12px 14px',marginBottom:8,display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:38,height:38,borderRadius:10,background:PIE_COLORS[i%PIE_COLORS.length]+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>🔄</div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:C.text}}>{s.name}</div>
              <div style={{fontSize:12,color:C.textLight,marginTop:1}}>{s.occurrences}x · Last: {s.lastDate} · {s.category}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontFamily:MF,fontWeight:700,fontSize:15,color:C.red}}>{fmt(s.amount)}</div>
              <div style={{fontSize:10,color:C.textLight}}>per month</div>
            </div>
            <button onClick={()=>{setDismissed(p=>[...p,s.name]);showToast&&showToast(s.name+' hidden');}} style={{background:'none',border:'none',cursor:'pointer',color:C.textLight,padding:4,display:'flex'}}><X size={14}/></button>
          </div>))}
        </div>}
        {other.length>0&&<div>
          <div style={{fontSize:12,fontWeight:700,color:C.textLight,textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Other Recurring</div>
          {other.map((s,i)=>(<div key={i} style={{background:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:14,padding:'12px 14px',marginBottom:8,display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:38,height:38,borderRadius:10,background:C.surfaceAlt,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>🔁</div>
            <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:C.text}}>{s.name}</div><div style={{fontSize:12,color:C.textLight}}>{s.interval} · {s.occurrences}x</div></div>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.red}}>{fmt(s.amount)}</div>
            <button onClick={()=>setDismissed(p=>[...p,s.name])} style={{background:'none',border:'none',cursor:'pointer',color:C.textLight,padding:4,display:'flex'}}><X size={14}/></button>
          </div>))}
        </div>}
      </>}
    </div>
  );
}
function AuthScreen({onAuth,onSkip}){
  const[mode,setMode]=useState("login");
  const[email,setEmail]=useState("");const[pass,setPass]=useState("");const[name,setName]=useState("");
  const[err,setErr]=useState("");const[loading,setLoading]=useState(false);
  const[confirmed,setConfirmed]=useState(false);const[showPass,setShowPass]=useState(false);
  const passStrength=pass.length===0?0:pass.length<6?1:pass.length<10&&!/[^a-zA-Z0-9]/.test(pass)?2:3;
  const strengthLabel=["","Weak","Fair","Strong"];const strengthColor=["",C.red,C.amber,C.green];
  async function submit(){
    if(!email.trim()||!pass.trim()){setErr("Please fill in all fields.");return;}
    if(mode==="signup"&&pass.length<6){setErr("Password must be at least 6 characters.");return;}
    setLoading(true);setErr("");
    try{
      if(mode==="login"){
        const r=await signIn(email.trim(),pass);
        if(r.error==="network"||r.message?.includes("Failed to fetch")||r.message?.includes("NetworkError")){setErr("Can't reach server — tap 'Try without account' to use offline.");setLoading(false);return;}
        if(r.error_description||r.msg||r.error){
          const msg=(r.error_description||r.msg||r.error||"").toLowerCase();
          if(msg.includes("invalid")||msg.includes("credentials")||msg.includes("password")){setErr("Wrong password. Try again or use 'Forgot password' below.");}
          else if(msg.includes("confirm")||msg.includes("email")){setErr("Please confirm your email first — check your inbox.");}
          else if(msg.includes("not found")||msg.includes("user")){setErr("No account found for that email. Sign up or continue without account.");}
          else{setErr("Sign in failed. Check your email and password.");}
          setLoading(false);return;
        }
        if(!r.access_token){setErr("Sign in failed — try again.");setLoading(false);return;}
        onAuth(r);
      }else{
        const r=await signUp(email.trim(),pass);
        if(r.access_token){onAuth(r);return;}
        if(r.error==="network"||r.message?.includes("Failed to fetch")){setErr("Can't reach server — tap 'Try without account' to use offline.");setLoading(false);return;}
        if(r.error_description||r.msg||r.error){
          const msg=(r.error_description||r.msg||r.error||"").toLowerCase();
          if(msg.includes("already")||msg.includes("registered")||msg.includes("exists")){setErr("");setMode("login");setTimeout(()=>setErr("Account found — enter your password to sign in."),100);}
          else{setErr(r.error_description||r.msg||"Sign up failed. Try again.");}
          setLoading(false);return;
        }
        setConfirmed(true);
      }
    }catch(e){setErr("Network error — check connection and try again.");}
    setLoading(false);
  }
  if(confirmed)return(
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg,${C.navy} 0%,#1a2a4a 50%,${C.accent} 100%)`,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <style>{CSS}</style>
      <div style={{background:"#fff",borderRadius:28,width:"100%",maxWidth:400,padding:"40px 32px",textAlign:"center",boxShadow:"0 32px 80px rgba(0,0,0,.35)"}}>
        <div style={{width:80,height:80,borderRadius:"50%",background:`linear-gradient(135deg,${C.accentBg},${C.purpleBg})`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:36}}>📧</div>
        <div style={{fontFamily:MF,fontSize:24,fontWeight:900,color:C.navy,marginBottom:8,letterSpacing:-.5}}>Check your inbox</div>
        <div style={{fontSize:14,color:C.textLight,marginBottom:6,lineHeight:1.6}}>Confirmation link sent to</div>
        <div style={{fontWeight:800,color:C.accent,fontSize:16,marginBottom:20,background:C.accentBg,padding:"8px 16px",borderRadius:10,display:"inline-block"}}>{email}</div>
        <div style={{background:C.accentBg,border:`1.5px solid ${C.accentMid}`,borderRadius:14,padding:"14px 18px",fontSize:13,color:C.accent,marginBottom:24,lineHeight:1.6,textAlign:"left"}}>
          <div style={{fontWeight:700,marginBottom:4}}>What to do:</div>
          <div>1. Open the email from Trackfi</div>
          <div>2. Click "Confirm your email"</div>
          <div>3. Come back here and sign in</div>
        </div>
        <button onClick={()=>{setConfirmed(false);setMode("login");setPass("");setErr("");}} style={{width:"100%",padding:"15px",borderRadius:14,border:"none",background:`linear-gradient(135deg,${C.accent},${C.green})`,color:"#fff",fontFamily:MF,fontWeight:800,fontSize:16,cursor:"pointer",marginBottom:12,letterSpacing:.2}}>✓ I confirmed — Sign In</button>
        <button onClick={async()=>{
          try{
            await fetch(SUPA_URL+"/auth/v1/resend",{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPA_KEY},body:JSON.stringify({type:"signup",email:email.trim()})});
            setErr("Confirmation email resent — check your inbox.");
          }catch{setErr("Couldn't resend — try signing up again.");}
        }} style={{width:"100%",padding:"12px",borderRadius:14,border:`1.5px solid ${C.accentMid}`,background:C.accentBg,color:C.accent,fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:12}}>
          ↻ Resend confirmation email
        </button>
        <button onClick={()=>setConfirmed(false)} style={{width:"100%",padding:"12px",borderRadius:14,border:`1.5px solid ${C.border}`,background:"transparent",color:C.textLight,fontWeight:600,fontSize:14,cursor:"pointer",marginBottom:12}}>← Back</button>
        {onSkip&&<button onClick={onSkip} style={{background:"none",border:"none",color:C.textFaint,fontSize:12,cursor:"pointer",fontWeight:500}}>Try without account →</button>}
      </div>
    </div>
  );
  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg,${C.navy} 0%,#1a2a4a 55%,${C.accent} 100%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,position:"relative",overflow:"hidden"}}>
      <style>{CSS}</style>
      {/* Background decoration */}
      <div style={{position:"absolute",top:-80,right:-80,width:300,height:300,borderRadius:"50%",background:"rgba(99,102,241,.12)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:-60,left:-60,width:240,height:240,borderRadius:"50%",background:"rgba(13,148,136,.1)",pointerEvents:"none"}}/>
      {/* Logo + tagline */}
      <div style={{textAlign:"center",marginBottom:28,zIndex:1}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:8}}>
          <div style={{width:48,height:48,borderRadius:14,background:`linear-gradient(135deg,${C.accent},${C.teal})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,boxShadow:"0 8px 24px rgba(99,102,241,.4)"}}>💰</div>
          <div style={{fontFamily:MF,fontSize:34,fontWeight:900,color:"#fff",letterSpacing:-1}}>Trackfi</div>
        </div>
        <div style={{fontSize:15,color:"rgba(255,255,255,.6)",fontWeight:500,letterSpacing:.2}}>Your money, finally making sense</div>
      </div>
      {/* Feature pills — signup only */}
      {mode==="signup"&&<div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap",justifyContent:"center",zIndex:1}}>
        {["📊 Live spending insights","💸 Smart safe-to-spend","🎯 Goals & debt payoff"].map(f=>(
          <div key={f} style={{background:"rgba(255,255,255,.1)",borderRadius:99,padding:"5px 12px",fontSize:11,color:"rgba(255,255,255,.8)",fontWeight:600,backdropFilter:"blur(8px)"}}>{f}</div>
        ))}
      </div>}
      {/* Card */}
      <div style={{background:"rgba(255,255,255,.97)",backdropFilter:"blur(20px)",borderRadius:24,width:"100%",maxWidth:400,padding:"28px 28px 24px",boxShadow:"0 32px 80px rgba(0,0,0,.3)",zIndex:1}}>
        {/* Mode toggle tabs */}
        <div style={{display:"flex",background:"#f0f2f8",borderRadius:12,padding:3,marginBottom:22}}>
          {[["login","Sign In"],["signup","Create Account"]].map(([m,l])=>(
            <button key={m} onClick={()=>{setMode(m);setErr("");setPass("");setName("");}} style={{flex:1,padding:"9px 0",borderRadius:10,border:"none",background:mode===m?"#fff":"transparent",color:mode===m?C.accent:C.textMid,fontWeight:mode===m?800:600,fontSize:13,cursor:"pointer",boxShadow:mode===m?"0 2px 8px rgba(0,0,0,.08)":"none",transition:"all .15s"}}>{l}</button>
          ))}
        </div>
        {/* Name field — signup only */}
        {mode==="signup"&&<div style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>First Name</div>
          <input type="text" value={name} onChange={e=>{setName(e.target.value);setErr("");}} placeholder="What should we call you?" style={{width:"100%",background:"#f8f9fc",border:`1.5px solid ${C.border}`,borderRadius:12,padding:"12px 14px",fontSize:15,color:C.text,outline:"none",boxSizing:"border-box"}} autoCapitalize="words" autoComplete="given-name"/>
        </div>}
        {/* Email */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Email</div>
          <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} placeholder="you@email.com" style={{width:"100%",background:"#f8f9fc",border:`1.5px solid ${err&&err.toLowerCase().includes("email")?C.red:C.border}`,borderRadius:12,padding:"12px 14px",fontSize:15,color:C.text,outline:"none",boxSizing:"border-box"}} autoCapitalize="none" autoComplete="email" onKeyDown={e=>e.key==="Enter"&&document.getElementById("pw-inp")?.focus()}/>
        </div>
        {/* Password */}
        <div style={{marginBottom:err?8:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5}}>Password</div>
            {mode==="login"&&<button onClick={async()=>{if(!email.trim()){setErr("Enter your email first.");return;}const redirectTo=window.location.origin+window.location.pathname;await fetch(SUPA_URL+"/auth/v1/recover",{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPA_KEY},body:JSON.stringify({email:email.trim(),options:{emailRedirectTo:redirectTo}})});setErr("✓ Reset link sent to "+email+" — check your inbox.");}} style={{background:"none",border:"none",color:C.accent,fontSize:12,fontWeight:600,cursor:"pointer"}}>Forgot?</button>}
          </div>
          <div style={{position:"relative"}}>
            <input id="pw-inp" type={showPass?"text":"password"} value={pass} onChange={e=>{setPass(e.target.value);setErr("");}} placeholder={mode==="login"?"Your password":"Min. 6 characters"} style={{width:"100%",background:"#f8f9fc",border:`1.5px solid ${err&&(err.toLowerCase().includes("password")||err.toLowerCase().includes("6 char"))?C.red:C.border}`,borderRadius:12,padding:"12px 44px 12px 14px",fontSize:15,color:C.text,outline:"none",boxSizing:"border-box"}} onKeyDown={e=>e.key==="Enter"&&!loading&&submit()}/>
            <button onClick={()=>setShowPass(p=>!p)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:C.textLight,fontSize:12,fontWeight:600,padding:4}}>{showPass?"Hide":"Show"}</button>
          </div>
          {/* Password strength bar — signup only */}
          {mode==="signup"&&pass.length>0&&<div style={{marginTop:6}}>
            <div style={{display:"flex",gap:3,marginBottom:3}}>
              {[1,2,3].map(n=><div key={n} style={{flex:1,height:3,borderRadius:99,background:n<=passStrength?strengthColor[passStrength]:C.borderLight,transition:"background .2s"}}/>)}
            </div>
            <div style={{fontSize:11,color:strengthColor[passStrength],fontWeight:600}}>{strengthLabel[passStrength]}</div>
          </div>}
        </div>
        {/* Error */}
        {err&&<div style={{background:err.includes("found")||err.includes("sent")?C.accentBg:C.redBg,border:`1px solid ${err.includes("found")||err.includes("sent")?C.accentMid:C.redMid}`,borderRadius:10,padding:"10px 14px",fontSize:13,color:err.includes("found")||err.includes("sent")?C.accent:C.red,marginBottom:14,lineHeight:1.5}}>{err}</div>}
        {/* Submit */}
        <button onClick={submit} disabled={loading||!email.trim()||!pass.trim()} style={{width:"100%",padding:"15px",borderRadius:14,border:"none",background:loading||!email.trim()||!pass.trim()?C.borderLight:`linear-gradient(135deg,${C.accent},${C.teal})`,color:loading||!email.trim()||!pass.trim()?C.textFaint:"#fff",fontFamily:MF,fontWeight:800,fontSize:16,cursor:loading||!email.trim()||!pass.trim()?"default":"pointer",marginBottom:14,letterSpacing:.2,transition:"all .2s",boxShadow:loading||!email.trim()||!pass.trim()?"none":`0 4px 16px ${C.accent}50`}}>{loading?"Just a sec...":(mode==="login"?"Sign In →":"Create Account →")}</button>
        {/* Skip */}
        {onSkip&&<div style={{borderTop:`1px solid ${C.border}`,paddingTop:16,textAlign:"center"}}>
          <button onClick={onSkip} style={{background:"none",border:"none",color:C.textLight,fontSize:13,fontWeight:600,cursor:"pointer",padding:"6px 0"}}>Try without account →</button>
          <div style={{fontSize:11,color:C.textFaint,marginTop:4}}>Data stays on your device</div>
        </div>}
      </div>
    </div>
  );
}

function RecurringView({expenses,setExpenses,categories,showToast,appReady}){
  const[showAdd,setShowAdd]=useState(false);
  const[form,setForm]=useState({name:"",amount:"",category:"Food",frequency:"Monthly",nextDate:todayStr(),icon:""});
  const[recurrings,setRecurrings]=useState(()=>{try{const r=localStorage.getItem("fv_recurring");return r?JSON.parse(r):[];}catch{return[];}});
  useEffect(()=>{try{localStorage.setItem("fv_recurring",JSON.stringify(recurrings));}catch{}},[recurrings]);
  useEffect(()=>{
    if(!appReady)return;
    const today=todayStr();
    const lastRun=localStorage.getItem("fv_recurring_last");
    if(lastRun===today)return; // already ran today — skip
    localStorage.setItem("fv_recurring_last",today);
    const updated=recurrings.map(r=>{
      if(r.nextDate<=today&&r.active!==false){
        setExpenses(p=>[...p,{id:Date.now()+Math.random(),name:r.name,amount:r.amount,category:r.category,date:today,notes:"Auto-logged"}]);
        if(showToast)showToast("🔄 Auto-logged: "+r.name+" "+r.amount);
        const d=new Date(r.nextDate+"T00:00:00");
        if(r.frequency==="Weekly")d.setDate(d.getDate()+7);
        else if(r.frequency==="Bi-weekly")d.setDate(d.getDate()+14);
        else if(r.frequency==="Monthly")d.setMonth(d.getMonth()+1);
        else if(r.frequency==="Quarterly")d.setMonth(d.getMonth()+3);
        else if(r.frequency==="Annual")d.setFullYear(d.getFullYear()+1);
        return{...r,nextDate:d.toISOString().split("T")[0],lastLogged:today};
      }
      return r;
    });
    setRecurrings(updated);
  },[appReady]);
  const FREQS=["Weekly","Bi-weekly","Monthly","Quarterly","Annual"];
  const ICONS=["🏠","🚗","📱","💪","🎮","📺","☕","🛒","💊","🐕","🎓","⚡","💧","🌐","🎵","🏋️","🍕","✈️","👶","🐱"];
  function add(){if(!form.name||!form.amount)return;setRecurrings(p=>[...p,{id:Date.now(),name:form.name,amount:form.amount,category:form.category,frequency:form.frequency,nextDate:form.nextDate,icon:form.icon||"🔄",active:true}]);setForm({name:"",amount:"",category:"Food",frequency:"Monthly",nextDate:todayStr(),icon:""});if(showToast)showToast("Recurring added — "+form.name);setShowAdd(false);}
  const active=recurrings.filter(r=>r.active!==false);
  const totalMonthly=active.reduce((s,r)=>{const amt=parseFloat(r.amount||0);if(r.frequency==="Weekly")return s+amt*4.33;if(r.frequency==="Bi-weekly")return s+amt*2.17;if(r.frequency==="Monthly")return s+amt;if(r.frequency==="Quarterly")return s+amt/3;if(r.frequency==="Annual")return s+amt/12;return s+amt;},0);
  const dueSoon=recurrings.filter(r=>r.active!==false&&r.nextDate&&Math.ceil((new Date(r.nextDate)-new Date(todayStr()))/86400000)<=7);
  return(
    <div className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div><div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text}}>Recurring Expenses</div><div style={{fontSize:13,color:C.textLight}}>{active.length} active · auto-logged when due</div></div>
        <button onClick={()=>setShowAdd(true)} style={{background:C.accent,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}><Plus size={13}/>Add</button>
      </div>
      <div style={{background:`linear-gradient(135deg,${C.navy},${C.navyLight})`,borderRadius:16,padding:18,marginBottom:14,color:"#fff"}}>
        <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Monthly Recurring Total</div>
        <div style={{fontFamily:MF,fontSize:32,fontWeight:800,color:"#fff"}}>{fmt(totalMonthly)}</div>
        <div style={{display:"flex",gap:8,marginTop:12}}>
          {[["Active",String(active.length),C.greenMid],["Due Soon",String(dueSoon.length),dueSoon.length>0?C.amberMid:C.greenMid],["Annual",fmt(totalMonthly*12),C.accentMid]].map(([l,v,c])=>(<div key={l} style={{flex:1,background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 8px"}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2}}>{l.toUpperCase()}</div><div style={{fontFamily:MF,fontSize:13,fontWeight:700,color:c}}>{v}</div></div>))}
        </div>
      </div>
      
      {active.length>1&&(()=>{const catData=Object.entries(active.reduce((m,r)=>{const k=r.category||"Other";const mo=parseFloat(r.amount||0)*(r.frequency==="Weekly"?4.33:r.frequency==="Bi-weekly"?2.17:r.frequency==="Quarterly"?0.33:r.frequency==="Annual"?0.083:1);m[k]=(m[k]||0)+mo;return m;},{})).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,amt])=>({name,amt}));const mx=catData[0]?.amt||1;return(<div style={{background:C.surface,borderRadius:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"14px 14px 8px",marginBottom:14}}><div style={{fontSize:12,fontWeight:600,color:C.textLight,marginBottom:10}}>Monthly by Category</div>{catData.map(({name,amt})=><div key={name} style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12,color:C.textMid}}>{name}</span><span style={{fontSize:12,fontFamily:MF,fontWeight:700,color:C.red}}>{fmt(amt)}/mo</span></div><div style={{height:5,background:C.borderLight,borderRadius:3}}><div style={{height:5,width:`${(amt/mx*100).toFixed(1)}%`,background:C.accent,borderRadius:3}}/></div></div>)}</div>);})()}{recurrings.length===0&&<Empty text="Add rent, subscriptions, or any regular expense — they log automatically when due." icon={RefreshCw} cta="Add First" onCta={()=>setShowAdd(true)}/>}
      {recurrings.map(r=>{
        const due=r.nextDate?Math.ceil((new Date(r.nextDate)-new Date(todayStr()))/86400000):0;
        const col=due<0?C.red:due<=3?C.red:due<=7?C.amber:C.textLight;
        return(<div key={r.id} style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"14px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12,opacity:r.active===false?.5:1}}>
          <div style={{width:40,height:40,borderRadius:12,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{r.icon||"🔄"}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:600,color:C.text}}>{r.name}</div>
            <div style={{fontSize:12,color:C.textLight,marginTop:2,display:"flex",gap:8,flexWrap:"wrap"}}>
              <span style={{background:C.surfaceAlt,borderRadius:99,padding:"1px 7px"}}>{r.frequency}</span>
              <span style={{color:col,fontWeight:600}}>{due<0?'⚠ '+Math.abs(due)+'d overdue':due===0?'📅 Due today':due===1?'Tomorrow':'In '+due+'d'}</span>
              {r.lastLogged&&<span style={{color:C.textFaint}}>Last: {fmtDate(r.lastLogged)}</span>}
            </div>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:16,color:C.text}}>{fmt(r.amount)}</div>
            <button onClick={()=>setRecurrings(p=>p.map(x=>x.id===r.id?{...x,active:x.active===false?true:false}:x))} style={{fontSize:11,color:r.active===false?C.green:C.textLight,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>{r.active===false?"Resume":"Pause"}</button>
          </div>
          <button onClick={()=>{setRecurrings(p=>p.filter(x=>x.id!==r.id));}} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,display:"flex"}}><Trash2 size={14}/></button>
        </div>);
      })}
      {showAdd&&<Modal title="Add Recurring" icon={RefreshCw} onClose={()=>setShowAdd(false)} onSubmit={add} submitLabel="Add Recurring">
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>{ICONS.map(ic=><button key={ic} onClick={()=>setForm(p=>({...p,icon:ic}))} style={{fontSize:20,background:form.icon===ic?C.accentBg:C.surfaceAlt,border:form.icon===ic?`2px solid ${C.accent}`:"2px solid transparent",borderRadius:8,padding:"4px 6px",cursor:"pointer"}}>{ic}</button>)}</div>
        <FI label="Name" placeholder="Rent, Netflix, Gym..." value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
        <div style={{display:"flex",gap:12}}><FI half label="Amount ($)" type="number" placeholder="0.00" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))}/><FI half label="Next Due Date" type="date" value={form.nextDate} onChange={e=>setForm(p=>({...p,nextDate:e.target.value}))}/></div>
        <FS label="Frequency" options={FREQS} value={form.frequency} onChange={e=>setForm(p=>({...p,frequency:e.target.value}))}/>
        <FS label="Category" options={categories.map(c=>c.name)} value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}/>
      </Modal>}
    </div>
  );
}

function EmojiPicker({value,onChange,customVal,onCustomChange}){
  return(
  <div style={{marginBottom:14}}>
    <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Pick an Icon</div>
    <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>
      {EMOJIS.map(e=><button key={e} onClick={()=>{onChange(e);onCustomChange("");}} style={{fontSize:20,background:value===e&&!customVal?C.accentBg:C.surfaceAlt,border:value===e&&!customVal?`2px solid ${C.accent}`:"2px solid transparent",borderRadius:8,padding:"4px 5px",cursor:"pointer",lineHeight:1}}>{e}</button>)}
    </div>
    <div style={{display:"flex",alignItems:"center",gap:8,background:C.surfaceAlt,borderRadius:10,padding:"8px 12px"}}>
      <span style={{fontSize:11,color:C.textLight,fontWeight:600,whiteSpace:"nowrap"}}>Or type any emoji:</span>
      <input value={customVal} onChange={e=>{onCustomChange(e.target.value);if(e.target.value)onChange("");}}
        placeholder="✂️ 🏊 🎪 ..." maxLength={4}
        style={{flex:1,background:"transparent",border:"none",outline:"none",fontSize:22,color:C.text,minWidth:0}}/>
      {customVal&&<span style={{fontSize:22,lineHeight:1}}>{customVal}</span>}
    </div>
  </div>
  );
}

function CategoriesView({categories,setCategories,showToast}){
  const[showAdd,setShowAdd]=useState(false);
  const[customEmoji,setCustomEmoji]=useState("");
  const[form,setForm]=useState({name:"",icon:""});
  const[editCat,setEditCat]=useState(null);
  const[editForm,setEditForm]=useState({});
  const[editCustomEmoji,setEditCustomEmoji]=useState("");
  const[searchCat,setSearchCat]=useState("");
  const EMOJIS=["🛒","🍔","🍽️","☕","🍕","🍺","🍷","🥗","🌮","🍜","🏠","⚡","🚿","📶","🔑",
    "⛽","🚕","🚗","🚌","✈️","🚂","💈","👗","👟","🛍️","💅","💊","🏥","💪","🧘",
    "📱","💻","🎮","🎵","🎬","📺","🐾","🐕","🐱","🏖️","🎯","🎁","📚","🎨","🔧",
    "💰","💳","📊","🏦","🎓","👶","🌿","⚽","🎸","🎤","🏋️","🧴","🪴","🧸","📦"];
  const DEFAULT_IDS=["groceries","fast_food","restaurants","coffee","rent_mort","utilities","gas","rideshare","car_pay","grooming","clothing","health_med","gym","phone","subscriptions","entertainment","dining_out","travel","pets","shopping","misc"];
  function add(){
    if(!form.name.trim())return;
    const icon=customEmoji.trim()||form.icon||"📦";
    const id="cat_"+Date.now();
    setCategories(p=>[...p,{id,name:form.name.trim(),icon}]);
    showToast&&showToast("✓ Category added — "+form.name.trim());
    setForm({name:"",icon:""});setCustomEmoji("");setShowAdd(false);
  }
  const filtered=categories.filter(c=>!searchCat||c.name.toLowerCase().includes(searchCat.toLowerCase()));
  const groups=[
    {label:"Food & Dining",ids:["groceries","fast_food","restaurants","coffee","dining_out"]},
    {label:"Home & Transport",ids:["rent_mort","utilities","gas","rideshare","car_pay"]},
    {label:"Personal Care",ids:["grooming","clothing","health_med","gym"]},
    {label:"Bills & Subs",ids:["phone","subscriptions"]},
    {label:"Lifestyle",ids:["entertainment","travel","pets","shopping","misc"]},
  ];
  const customCats=categories.filter(c=>!DEFAULT_IDS.includes(c.id));
  return(
    <div className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div>
          <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text}}>Categories</div>
          <div style={{fontSize:13,color:C.textLight}}>{categories.length} categories · {customCats.length} custom</div>
        </div>
        <button onClick={()=>setShowAdd(true)} style={{background:C.accent,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}><Plus size={13}/>Add</button>
      </div>
      {/* Search */}
      <div style={{position:"relative",marginBottom:14}}>
        <Search size={14} color={C.textLight} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)"}}/>
        <input value={searchCat} onChange={e=>setSearchCat(e.target.value)} placeholder="Search categories..." style={{width:"100%",background:C.surface,border:`1.5px solid ${searchCat?C.accent:C.border}`,borderRadius:10,padding:"8px 12px 8px 30px",fontSize:13,color:C.text,outline:"none",boxSizing:"border-box"}}/>
        {searchCat&&<button onClick={()=>setSearchCat("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:C.textLight}}><X size={13}/></button>}
      </div>
      {/* Custom categories first */}
      {customCats.length>0&&!searchCat&&(
        <div style={{marginBottom:18}}>
          <div style={{fontSize:11,fontWeight:700,color:C.accent,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>My Custom Categories</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {customCats.map(cat=>(
              <div key={cat.id} style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"11px 14px",display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:38,height:38,borderRadius:10,background:"rgba(99,102,241,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{cat.icon}</div>
                <div style={{flex:1,fontSize:14,fontWeight:600,color:C.text}}>{cat.name}</div>
                <button onClick={()=>{setEditCat(cat);setEditForm({name:cat.name,icon:cat.icon||""});setEditCustomEmoji("");}} style={{background:"none",border:"none",cursor:"pointer",color:C.accent,fontSize:12,fontWeight:600,padding:"4px 6px"}}>Edit</button>
                <button onClick={()=>{setCategories(p=>p.filter(c=>c.id!==cat.id));showToast&&showToast("Category removed","error");}} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,display:"flex",padding:"4px 3px"}}><Trash2 size={13}/></button>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Default categories grouped */}
      {!searchCat?groups.map(g=>{
        const groupCats=categories.filter(c=>g.ids.includes(c.id));
        if(!groupCats.length)return null;
        return(
          <div key={g.label} style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:C.textLight,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>{g.label}</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {groupCats.map(cat=>(
                <div key={cat.id} style={{background:C.surface,borderRadius:12,boxShadow:"0 1px 3px rgba(10,22,40,.05)",padding:"11px 14px",display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:38,height:38,borderRadius:10,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{cat.icon}</div>
                  <div style={{flex:1,fontSize:14,fontWeight:500,color:C.text}}>{cat.name}</div>
                  <span style={{fontSize:10,color:C.textFaint,fontWeight:500}}>Default</span>
                </div>
              ))}
            </div>
          </div>
        );
      }):(
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {filtered.map(cat=>(
            <div key={cat.id} style={{background:C.surface,borderRadius:12,padding:"11px 14px",display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:38,height:38,borderRadius:10,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{cat.icon}</div>
              <div style={{flex:1,fontSize:14,fontWeight:500,color:C.text}}>{cat.name}</div>
              {!DEFAULT_IDS.includes(cat.id)&&<><button onClick={()=>{setEditCat(cat);setEditForm({name:cat.name,icon:cat.icon||""});setEditCustomEmoji("");}} style={{background:"none",border:"none",cursor:"pointer",color:C.accent,fontSize:12,fontWeight:600}}>Edit</button><button onClick={()=>{setCategories(p=>p.filter(c=>c.id!==cat.id));showToast&&showToast("Removed","error");}} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,display:"flex"}}><Trash2 size={13}/></button></>}
            </div>
          ))}
          {filtered.length===0&&<div style={{textAlign:"center",padding:30,color:C.textLight,fontSize:13}}>No categories match "{searchCat}"</div>}
        </div>
      )}
      {/* Tip */}
      <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"11px 14px",marginTop:8,fontSize:12,color:C.accent,lineHeight:1.5}}>
        💡 <strong>Tip:</strong> Add custom categories for anything specific — "Date Night", "Kids", "Side Hustle". The AI logger and envelopes will automatically use your categories.
      </div>
      {/* Edit modal */}
      {editCat&&<Modal title="Edit Category" icon={Target} onClose={()=>setEditCat(null)} onSubmit={()=>{const icon=editCustomEmoji.trim()||editForm.icon||editCat.icon;setCategories(p=>p.map(c=>c.id===editCat.id?{...c,name:editForm.name||c.name,icon}:c));showToast&&showToast("✓ Category updated");setEditCat(null);}} submitLabel="Save">
        <EmojiPicker value={editForm.icon} onChange={v=>setEditForm(p=>({...p,icon:v}))} customVal={editCustomEmoji} onCustomChange={setEditCustomEmoji}/>
        <FI label="Category Name" value={editForm.name||""} onChange={e=>setEditForm(p=>({...p,name:e.target.value}))}/>
      </Modal>}
      {/* Add modal */}
      {showAdd&&<Modal title="New Category" icon={Target} onClose={()=>{setShowAdd(false);setForm({name:"",icon:""});setCustomEmoji("");}} onSubmit={add} submitLabel="Add Category">
        <EmojiPicker value={form.icon} onChange={v=>setForm(p=>({...p,icon:v}))} customVal={customEmoji} onCustomChange={setCustomEmoji}/>
        <FI label="Category Name" placeholder="e.g. Date Night, Kids, Side Hustle..." value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} autoFocus/>
      </Modal>}
    </div>
  );
}

function HouseholdView({household,setHousehold,expenses,bills=[],showToast,setBills}){
  const[tab,setTab]=useState("split");// split | settle | budget | members
  const[form,setForm]=useState({name:"",emoji:"😊",color:"#6366f1"});
  const[settlements,setSettlements]=useState(()=>{try{return JSON.parse(localStorage.getItem("fv_settlements")||"[]");}catch{return[];}});
  const[hhBudgets,setHhBudgets]=useState(()=>{try{return JSON.parse(localStorage.getItem("fv_hh_budgets")||"[]");}catch{return[];}});
  const EMOJIS_HH=["😊","😄","🧑","👩","👨","🧔","👱","🧑‍💼","👩‍💼","🧑‍⚕️","👩‍⚕️","⭐","🌟","🏠"];
  const COLORS_HH=["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899"];

  const now=new Date();
  const ms=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
  const thisMonthExp=expenses.filter(e=>e.date?.startsWith(ms));

  // ── Split math ────────────────────────────────────────────────────────────
  // Each member's personal spend + half of shared
  const sharedExp=thisMonthExp.filter(e=>e.owner==="shared");
  const sharedTotal=sharedExp.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const splitPer=household.members.length>0?sharedTotal/household.members.length:0;
  const memberStats=household.members.map(m=>{
    const personal=thisMonthExp.filter(e=>e.owner===m.id||(m.id==="me"&&(!e.owner||e.owner==="me")&&e.owner!=="shared"&&e.owner!=="partner"))
      .reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
    const share=splitPer;
    const totalOwed=personal+share;
    // Bills this member pays
    const memberBills=bills.filter(b=>b.paidBy===m.id&&!b.paid);
    const billTotal=memberBills.reduce((s,b)=>s+(parseFloat(b.amount)||0),0);
    return{...m,personal,share,totalOwed,memberBills,billTotal};
  });

  // ── Who owes whom (Splitwise-style) ──────────────────────────────────────
  const avgOwed=memberStats.length>0?memberStats.reduce((s,m)=>s+m.totalOwed,0)/memberStats.length:0;
  const balances=memberStats.map(m=>({...m,balance:m.totalOwed-avgOwed}));
  // Positive balance = paid more than fair share = others owe them
  // Negative balance = paid less = they owe others

  function markSettled(){
    const entry={date:new Date().toISOString().split("T")[0],month:ms,
      from:balances.filter(m=>m.balance<-0.5).map(m=>m.name).join(", "),
      to:balances.filter(m=>m.balance>0.5).map(m=>m.name).join(", "),
      amount:Math.abs(balances.filter(m=>m.balance<-0.5).reduce((s,m)=>s+m.balance,0)).toFixed(2)
    };
    const next=[entry,...settlements].slice(0,12);
    setSettlements(next);
    try{localStorage.setItem("fv_settlements",JSON.stringify(next));}catch{}
    showToast("✅ Settled up! Balances reset.");
  }

  function saveHhBudgets(next){
    setHhBudgets(next);
    try{localStorage.setItem("fv_hh_budgets",JSON.stringify(next));}catch{}
  }

  const TABS=[{id:"split",label:"Split"},{id:"settle",label:"Settle Up"},{id:"budget",label:"Budget"},{id:"members",label:"Members"}];

  return(
    <div className="fu">
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div>
          <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text}}>{household.name||"Household"}</div>
          <div style={{fontSize:13,color:C.textLight,marginTop:2}}>{household.members.length} members · {household.enabled?"Active":"Disabled"}</div>
        </div>
        <button onClick={()=>setHousehold(h=>({...h,enabled:!h.enabled}))} style={{background:household.enabled?C.accentBg:C.bg,border:`1.5px solid ${household.enabled?C.accent:C.border}`,borderRadius:99,padding:"7px 16px",cursor:"pointer",fontWeight:700,fontSize:13,color:household.enabled?C.accent:C.textMid}}>
          {household.enabled?"Active ✓":"Enable"}
        </button>
      </div>

      {/* Tab bar */}
      <div style={{display:"flex",background:C.surfaceAlt,borderRadius:12,padding:3,marginBottom:18,gap:3}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"8px 4px",borderRadius:9,border:"none",background:tab===t.id?"#fff":"transparent",color:tab===t.id?C.accent:C.textMid,fontWeight:tab===t.id?700:500,fontSize:12,cursor:"pointer",boxShadow:tab===t.id?"0 1px 4px rgba(0,0,0,.08)":"none",transition:"all .15s"}}>{t.label}</button>
        ))}
      </div>

      {/* ── TAB: SPLIT ── */}
      {tab==="split"&&(
        <div>
          {/* This month summary cards */}
          <div style={{display:"grid",gridTemplateColumns:`repeat(${household.members.length},1fr)`,gap:10,marginBottom:16}}>
            {memberStats.map(m=>(
              <div key={m.id} style={{background:C.surface,borderRadius:16,padding:"14px 12px",textAlign:"center",boxShadow:"0 1px 4px rgba(10,22,40,.07)"}}>
                <div style={{fontSize:24,marginBottom:4}}>{m.emoji}</div>
                <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:6}}>{m.name}</div>
                <div style={{fontFamily:MF,fontWeight:800,fontSize:18,color:C.red,marginBottom:4}}>{fmt(m.personal+m.share)}</div>
                <div style={{fontSize:10,color:C.textLight}}>personal</div>
                <div style={{fontSize:10,color:C.textLight}}>{fmt(m.personal)} + {fmt(m.share)} shared</div>
              </div>
            ))}
          </div>

          {/* Shared expense breakdown */}
          <div style={{background:C.surface,borderRadius:16,padding:16,marginBottom:14,boxShadow:"0 1px 3px rgba(10,22,40,.06)"}}>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:10}}>Shared Expenses — {now.toLocaleDateString("en-US",{month:"long"})}</div>
            {sharedExp.length===0
              ? <div style={{fontSize:13,color:C.textLight,textAlign:"center",padding:"12px 0"}}>No shared expenses this month yet. Tag expenses as "Shared" when logging.</div>
              : <>
                {sharedExp.sort((a,b)=>b.date?.localeCompare(a.date)).slice(0,8).map(e=>(
                  <div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${C.borderLight}`}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:C.text}}>{e.name}</div>
                      <div style={{fontSize:11,color:C.textLight}}>{e.date} · {e.category}</div>
                    </div>
                    <div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>{fmt(e.amount)}</div>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0 0",marginTop:4,borderTop:`1px solid ${C.border}`}}>
                  <span style={{fontSize:12,fontWeight:700,color:C.text}}>Total shared · each owes</span>
                  <span style={{fontFamily:MF,fontWeight:800,fontSize:13,color:C.accent}}>{fmt(sharedTotal)} · {fmt(splitPer)}</span>
                </div>
              </>
            }
          </div>

          {/* Bills by member */}
          {bills.length>0&&(
            <div style={{background:C.surface,borderRadius:16,padding:16,boxShadow:"0 1px 3px rgba(10,22,40,.06)"}}>
              <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:10}}>Bill Responsibility</div>
              {memberStats.map(m=>(
                <div key={m.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${C.borderLight}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:18}}>{m.emoji}</span>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:C.text}}>{m.name}</div>
                      <div style={{fontSize:11,color:C.textLight}}>{m.memberBills.length} unpaid bill{m.memberBills.length!==1?"s":""}</div>
                    </div>
                  </div>
                  <div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:m.billTotal>0?C.amber:C.textFaint}}>{fmt(m.billTotal)}</div>
                </div>
              ))}
              {(()=>{
                const unassigned=bills.filter(b=>(!b.paidBy||b.paidBy==="shared")&&!b.paid);
                const uTotal=unassigned.reduce((s,b)=>s+(parseFloat(b.amount||0)),0);
                if(!unassigned.length)return null;
                return(
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:18}}>🏠</span>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:C.text}}>Shared / Unassigned</div>
                        <div style={{fontSize:11,color:C.textLight}}>{unassigned.length} bill{unassigned.length!==1?"s":""} · {fmt(uTotal/Math.max(1,household.members.length))}/ea</div>
                      </div>
                    </div>
                    <div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.amber}}>{fmt(uTotal)}</div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: SETTLE UP ── */}
      {tab==="settle"&&(
        <div>
          <div style={{background:C.surface,borderRadius:16,padding:16,marginBottom:14,boxShadow:"0 1px 4px rgba(10,22,40,.07)"}}>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Current Balances</div>
            {balances.map(m=>{
              const isEven=Math.abs(m.balance)<0.5;
              const isOwed=m.balance>0.5;
              return(
                <div key={m.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.borderLight}`}}>
                  <div style={{width:40,height:40,borderRadius:"50%",background:m.color+"22",border:`2px solid ${m.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{m.emoji}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:C.text}}>{m.name}</div>
                    <div style={{fontSize:11,color:C.textLight}}>Paid {fmt(m.totalOwed)} · fair share {fmt(avgOwed)}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    {isEven
                      ? <span style={{fontSize:12,fontWeight:700,color:C.green,background:C.greenBg,borderRadius:99,padding:"4px 10px"}}>Even ✓</span>
                      : isOwed
                        ? <div><div style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.green}}>+{fmt(m.balance)}</div><div style={{fontSize:10,color:C.textLight}}>gets back</div></div>
                        : <div><div style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.red}}>{fmt(Math.abs(m.balance))}</div><div style={{fontSize:10,color:C.textLight}}>owes</div></div>
                    }
                  </div>
                </div>
              );
            })}
          </div>

          {/* Settle Up CTA */}
          {balances.some(m=>Math.abs(m.balance)>0.5)&&(
            <div style={{background:"#0A1628",borderRadius:16,padding:18,marginBottom:14}}>
              <div style={{fontFamily:MF,fontWeight:800,fontSize:15,color:"#fff",marginBottom:4}}>Ready to settle?</div>
              {(()=>{
                const payers=balances.filter(m=>m.balance<-0.5);
                const receivers=balances.filter(m=>m.balance>0.5);
                return payers.map(p=>(
                  receivers.map(r=>(
                    <div key={p.id+r.id} style={{fontSize:13,color:"rgba(255,255,255,.7)",marginBottom:4}}>
                      {p.emoji} <strong style={{color:"#fff"}}>{p.name}</strong> pays {r.emoji} <strong style={{color:"#fff"}}>{r.name}</strong> → <span style={{color:"#34D399",fontWeight:700}}>{fmt(Math.min(Math.abs(p.balance),r.balance))}</span>
                    </div>
                  ))
                ));
              })()}
              <button onClick={markSettled} style={{marginTop:12,width:"100%",background:"#6366F1",border:"none",borderRadius:12,padding:"12px 0",color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:MF}}>
                Mark as Settled ✓
              </button>
            </div>
          )}

          {/* Settlement history */}
          {settlements.length>0&&(
            <div style={{background:C.surface,borderRadius:16,padding:16,boxShadow:"0 1px 3px rgba(10,22,40,.06)"}}>
              <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:10}}>Settlement History</div>
              {settlements.map((s,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:i<settlements.length-1?`1px solid ${C.borderLight}`:"none"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:C.text}}>{s.from} → {s.to}</div>
                    <div style={{fontSize:11,color:C.textLight}}>{s.date}</div>
                  </div>
                  <div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.green}}>{fmt(s.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: BUDGET ── */}
      {tab==="budget"&&(
        <div>
          <div style={{fontSize:13,color:C.textLight,marginBottom:14,lineHeight:1.5}}>
            Set shared spending limits for household categories. These are separate from personal budgets.
          </div>
          {hhBudgets.map((b,i)=>{
            const spent=thisMonthExp.filter(e=>e.category===b.category&&(e.owner==="shared")).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
            const pct=parseFloat(b.limit)>0?Math.min(100,(spent/parseFloat(b.limit))*100):0;
            const over=spent>parseFloat(b.limit||0);
            return(
              <div key={i} style={{background:C.surface,borderRadius:14,padding:"14px 16px",marginBottom:10,boxShadow:"0 1px 3px rgba(10,22,40,.06)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.text}}>{b.category}</div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontFamily:MF,fontWeight:700,fontSize:13,color:over?C.red:C.text}}>{fmt(spent)}</span>
                    <span style={{fontSize:12,color:C.textLight}}>/ {fmt(b.limit)}</span>
                    <button onClick={()=>{const next=hhBudgets.filter((_,j)=>j!==i);saveHhBudgets(next);}} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,padding:2,display:"flex"}}><X size={13}/></button>
                  </div>
                </div>
                <div style={{height:6,background:C.borderLight,borderRadius:99,overflow:"hidden"}}>
                  <div style={{height:"100%",width:pct.toFixed(1)+"%",background:over?C.red:pct>75?C.amber:C.green,borderRadius:99,transition:"width .4s"}}/>
                </div>
                {over&&<div style={{fontSize:11,color:C.red,marginTop:4}}>Over by {fmt(spent-parseFloat(b.limit||0))}</div>}
              </div>
            );
          })}
          {/* Add budget */}
          <div style={{background:C.surfaceAlt,borderRadius:14,padding:14,border:`1.5px dashed ${C.border}`,marginTop:4}}>
            <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:8}}>Add Shared Budget</div>
            <div style={{display:"flex",gap:8}}>
                <input id="hh_cat" placeholder="Category (e.g. Groceries)" style={{flex:2,background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:10,padding:"9px 12px",fontSize:13,color:C.text,outline:"none"}}/>
                <input id="hh_amt" type="number" placeholder="Limit $" style={{flex:1,background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:10,padding:"9px 12px",fontSize:13,color:C.text,outline:"none"}}/>
                <button onClick={()=>{const cat=document.getElementById("hh_cat")?.value?.trim();const amt=document.getElementById("hh_amt")?.value;if(!cat||!amt)return;saveHhBudgets([...hhBudgets,{category:cat,limit:amt}]);document.getElementById("hh_cat").value="";document.getElementById("hh_amt").value="";}} style={{background:C.accent,border:"none",borderRadius:10,padding:"9px 14px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>Add</button>
              </div>
          </div>
        </div>
      )}

      {/* ── TAB: MEMBERS ── */}
      {tab==="members"&&(
        <div>
          {/* Household name */}
          <div style={{background:C.surface,borderRadius:14,padding:14,marginBottom:14,boxShadow:"0 1px 3px rgba(10,22,40,.05)"}}>
            <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Household Name</div>
            <input value={household.name} onChange={e=>setHousehold(h=>({...h,name:e.target.value}))}
              style={{width:"100%",background:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"10px 14px",fontSize:16,fontWeight:700,color:C.text,outline:"none",boxSizing:"border-box"}}/>
          </div>

          {/* Member list */}
          {household.members.map(m=>(
            <div key={m.id} style={{background:C.surface,borderRadius:14,padding:"12px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12,boxShadow:"0 1px 3px rgba(10,22,40,.05)"}}>
              <div style={{width:42,height:42,borderRadius:"50%",background:m.color+"22",border:`2px solid ${m.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{m.emoji}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:700,color:C.text}}>{m.name}{m.id==="me"&&" (You)"}</div>
                <div style={{fontSize:12,color:C.textLight,marginTop:1}}>This month: {fmt((memberStats.find(ms=>ms.id===m.id)||{totalOwed:0}).totalOwed)}</div>
              </div>
              {m.id!=="me"&&<button onClick={()=>setHousehold(h=>({...h,members:h.members.filter(x=>x.id!==m.id)}))} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,padding:4,display:"flex"}}><X size={14}/></button>}
            </div>
          ))}

          {/* Add member */}
          <div style={{background:C.surfaceAlt,borderRadius:14,padding:14,border:`1.5px dashed ${C.border}`,marginTop:4}}>
            <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:8}}>Add Member</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
              {EMOJIS_HH.map(e=>(<button key={e} onClick={()=>setForm(f=>({...f,emoji:e}))} style={{fontSize:18,background:form.emoji===e?C.accentBg:"#fff",border:form.emoji===e?`2px solid ${C.accent}`:"2px solid transparent",borderRadius:8,padding:"3px 5px",cursor:"pointer"}}>{e}</button>))}
            </div>
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              {COLORS_HH.map(c=>(<button key={c} onClick={()=>setForm(f=>({...f,color:c}))} style={{width:22,height:22,borderRadius:"50%",background:c,border:form.color===c?"3px solid "+C.text:"3px solid transparent",cursor:"pointer"}}/>))}
            </div>
            <div style={{display:"flex",gap:8}}>
              <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Partner, Roommate..." style={{flex:1,background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:10,padding:"9px 12px",fontSize:14,color:C.text,outline:"none"}}/>
              <button onClick={()=>{if(!form.name.trim())return;const id="member_"+Date.now();setHousehold(h=>({...h,members:[...h.members,{id,name:form.name.trim(),emoji:form.emoji,color:form.color}]}));setForm({name:"",emoji:"😊",color:"#6366f1"});showToast("✓ "+form.name+" added");}} style={{background:C.accent,border:"none",borderRadius:10,padding:"9px 16px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>Add</button>
            </div>
          </div>

          {/* Shared login info */}
          <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:14,padding:"14px 16px",marginTop:16,fontSize:13,color:C.accent,lineHeight:1.6}}>
            💡 <strong>Live household sync is active.</strong> Both Victor and Erin can log in from their own phones using the same Trackfi account — expenses, bills, and goals stay in sync automatically.
          </div>
        </div>
      )}
    </div>
  );
}


function BankImportModal({categories,expenses,setExpenses,household,showToast,onClose}){
  const[step,setStep]=useState("paste");// paste | preview | done
  const[rawText,setRawText]=useState("");
  const[parsed,setParsed]=useState([]);
  const[editCats,setEditCats]=useState({});
  const[editOwner,setEditOwner]=useState({});
  const[importing,setImporting]=useState(false);
  const[error,setError]=useState("");
  const[skipped,setSkipped]=useState({});

  const BANK_FORMATS=[
    // Chase: Date,Description,Amount (negative=debit)
    {name:"Chase",detect:h=>h.includes("Transaction Date")||h.includes("Post Date"),
     date:r=>r[0]||r[1],desc:r=>r[2],amt:r=>-parseFloat((r[3]||r[4]||"0").replace(/[^0-9.-]/g,""))},
    // BofA: Date,Description,Amount (negative=debit)
    {name:"Bank of America",detect:h=>h.toLowerCase().includes("posted date")||h.toLowerCase().includes("payee"),
     date:r=>r[0],desc:r=>r[2]||r[1],amt:r=>parseFloat((r[4]||r[3]||"0").replace(/[^0-9.-]/g,""))},
    // Wells Fargo: Date,Amount,*,*,Description
    {name:"Wells Fargo",detect:h=>/amount/i.test(h)&&!/transaction date/i.test(h),
     date:r=>r[0],desc:r=>r[4],amt:r=>parseFloat((r[1]||"0").replace(/[^0-9.-]/g,""))},
    // Capital One: Transaction Date,Post Date,Description,Category,Debit,Credit
    {name:"Capital One",detect:h=>h.toLowerCase().includes("transaction date")&&h.toLowerCase().includes("debit"),
     date:r=>r[0],desc:r=>r[2],amt:r=>{const d=parseFloat((r[4]||"").replace(/[^0-9.-]/g,""));const c=parseFloat((r[5]||"").replace(/[^0-9.-]/g,""));return d>0?d:-c;}},
    // Citi: Status,Date,Description,Debit,Credit
    {name:"Citi",detect:h=>h.toLowerCase().includes("status")&&h.toLowerCase().includes("debit")&&h.toLowerCase().includes("credit"),
     date:r=>r[1],desc:r=>r[2],amt:r=>{const d=parseFloat((r[3]||"").replace(/[^0-9.-]/g,""));const c=parseFloat((r[4]||"").replace(/[^0-9.-]/g,""));return d>0?d:-c;}},
    // Generic: first col=date, second=desc, third=amount
    {name:"Generic",detect:()=>true,
     date:r=>r[0],desc:r=>r[1],amt:r=>Math.abs(parseFloat((r[2]||r[3]||"0").replace(/[^0-9.-]/g,"")))}
  ];

  // Auto-categorize by merchant name
  const MC=window._merchantCats||{};
  const CAT_RULES=[
    {r:/grocery|groceries|publix|kroger|safeway|trader joe|whole foods|aldi|costco|walmart|wegmans|sprouts/i,c:"Groceries"},
    {r:/mcdonald|burger king|wendy|chick-fil|taco bell|subway|chipotle|popeyes|kfc|domino|sonic|five guys|sonic|whataburger/i,c:"Fast Food"},
    {r:/restaurant|doordash|grubhub|ubereats|postmates|dine|sushi|bistro|steakhouse|grill/i,c:"Restaurants"},
    {r:/starbucks|dunkin|coffee|latte|espresso|dutch bros|caribou|peet/i,c:"Coffee"},
    {r:/shell|bp|chevron|exxon|mobil|speedway|wawa|sheetz|pilot|loves|quiktrip|fuel|gas\s/i,c:"Gas"},
    {r:/uber|lyft|taxi|cab\b/i,c:"Rideshare"},
    {r:/netflix|hulu|spotify|apple music|disney|hbo|paramount|peacock|youtube premium|crunchyroll|adobe|dropbox|icloud/i,c:"Subscriptions"},
    {r:/cvs|walgreens|rite aid|pharmacy|medical|doctor|hospital|dental|dentist|urgent care|copay/i,c:"Health / Medical"},
    {r:/planet fitness|la fitness|anytime fitness|equinox|ymca|crossfit|orangetheory|peloton|gym/i,c:"Gym / Fitness"},
    {r:/barber|salon|great clips|supercuts|hair|nails|manicure|spa|massage|ulta|sephora|wax/i,c:"Grooming / Haircuts"},
    {r:/nike|adidas|h&m|zara|gap|old navy|nordstrom|target|forever 21|shein|clothing|clothes|shoes/i,c:"Clothing"},
    {r:/amazon|target|walmart|best buy|home depot|lowes|ikea|tj maxx|marshalls|ross|kohls/i,c:"Shopping"},
    {r:/petco|petsmart|vet|veterinary|pet food|chewy/i,c:"Pets"},
    {r:/movie|amc|regal|theater|concert|ticketmaster|steam|playstation|xbox|nintendo|bowling/i,c:"Entertainment"},
    {r:/hotel|airbnb|vrbo|flight|airline|southwest|delta|united|frontier|spirit|booking|expedia|vacation/i,c:"Travel"},
    {r:/rent|mortgage|landlord|lease|apartment/i,c:"Rent / Mortgage"},
    {r:/electric|utility|water|internet|cable|xfinity|comcast|att|verizon|t-mobile|phone/i,c:"Utilities"},
    {r:/bar|nightclub|happy hour|brunch|dining out/i,c:"Dining Out"},
  ];

  function autoCategory(desc){
    if(!desc)return "Misc";
    const dl=desc.toLowerCase().trim();
    if(MC[dl])return MC[dl];
    for(const {r,c} of CAT_RULES){if(r.test(dl))return c;}
    return "Misc";
  }

  function parseCSV(text){
    // Split into lines, handle quoted fields
    const lines=text.trim().split(/\r?\n/).filter(l=>l.trim());
    if(lines.length<2)return[];
    const parseRow=line=>{
      const cols=[];let cur="";let inQ=false;
      for(let i=0;i<line.length;i++){
        const ch=line[i];
        if(ch==='"'){inQ=!inQ;}
        else if(ch===","&&!inQ){cols.push(cur.trim().replace(/^"|"$/g,""));cur="";}
        else{cur+=ch;}
      }
      cols.push(cur.trim().replace(/^"|"$/g,""));
      return cols;
    };
    const header=lines[0].toLowerCase();
    const fmt=BANK_FORMATS.find(f=>f.detect(header))||BANK_FORMATS[BANK_FORMATS.length-1];
    const rows=[];
    for(let i=1;i<lines.length;i++){
      const r=parseRow(lines[i]);
      if(r.length<2)continue;
      const rawDate=fmt.date(r)||"";
      const desc=(fmt.desc(r)||"").trim();
      const rawAmt=fmt.amt(r);
      if(!desc||isNaN(rawAmt)||rawAmt<=0)continue;
      // Normalize date to YYYY-MM-DD
      let date="";
      const dm=rawDate.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if(dm){
        const yr=dm[3].length===2?"20"+dm[3]:dm[3];
        date=`${yr}-${dm[1].padStart(2,"0")}-${dm[2].padStart(2,"0")}`;
      }else if(/\d{4}-\d{2}-\d{2}/.test(rawDate)){date=rawDate.slice(0,10);}
      if(!date)continue;
      rows.push({id:`imp_${Date.now()}_${i}`,name:desc,amount:rawAmt.toFixed(2),date,category:autoCategory(desc),notes:"Imported",owner:"me"});
    }
    return rows;
  }

  function handleParse(){
    setError("");
    if(!rawText.trim()){setError("Paste your bank CSV data above.");return;}
    const rows=parseCSV(rawText);
    if(!rows.length){setError("Couldn't read this format. Make sure you're pasting CSV text exported from your bank's website.");return;}
    // Deduplicate against existing expenses
    const existing=new Set(expenses.map(e=>e.date+"_"+e.name+"_"+e.amount));
    const deduped=rows.filter(r=>!existing.has(r.date+"_"+r.name+"_"+r.amount));
    setParsed(deduped);
    setEditCats(Object.fromEntries(deduped.map(r=>[r.id,r.category])));
    setEditOwner(Object.fromEntries(deduped.map(r=>[r.id,"me"])));
    setSkipped({});
    setStep("preview");
  }

  function handleFile(file){
    const reader=new FileReader();
    reader.onload=e=>{setRawText(e.target.result);};
    reader.readAsText(file);
  }

  function doImport(){
    setImporting(true);
    const toAdd=parsed
      .filter(r=>!skipped[r.id])
      .map(r=>({...r,category:editCats[r.id]||r.category,owner:editOwner[r.id]||"me",notes:"Imported"}));
    setExpenses(p=>[...p,...toAdd]);
    const skippedCount=Object.values(skipped).filter(Boolean).length;
    showToast(`✅ Imported ${toAdd.length} transactions${skippedCount?` · ${skippedCount} skipped`:""}`);
    setStep("done");
    setImporting(false);
  }

  const totalAmt=parsed.filter(r=>!skipped[r.id]).reduce((s,r)=>s+(parseFloat(r.amount)||0),0);
  const catNames=categories.map(c=>c.name);

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(10,22,40,.55)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.surface,borderRadius:"24px 24px 0 0",width:"100%",maxWidth:560,maxHeight:"92vh",overflowY:"auto",padding:"0 0 40px",animation:"slideUp .26s cubic-bezier(.22,1,.36,1)",boxShadow:"0 -4px 60px rgba(10,22,40,.22)"}}>
        <div style={{width:40,height:4,background:C.border,borderRadius:99,margin:"14px auto 4px"}}/>
        <div style={{padding:"16px 24px 20px",borderBottom:`1px solid ${C.borderLight}`,marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{background:C.greenBg,borderRadius:12,padding:"9px 10px",display:"flex"}}><FileText size={20} color={C.green}/></div>
            <div>
              <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text,letterSpacing:-.3}}>Bank Import</div>
              <div style={{fontSize:12,color:C.textLight,marginTop:1}}>Paste CSV from your bank's website</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:C.surfaceAlt,border:"none",cursor:"pointer",color:C.textMid,padding:"7px 8px",borderRadius:10,display:"flex"}}><X size={15}/></button>
        </div>

        <div style={{padding:"0 24px"}}>

          {step==="paste"&&<>
            <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"12px 14px",marginBottom:16,fontSize:13,color:C.accent,lineHeight:1.6}}>
              <strong>How to get your CSV:</strong>
              <div style={{marginTop:6,display:"flex",flexDirection:"column",gap:3}}>
                {[["Chase","Accounts → Download account activity → CSV"],["Bank of America","Transactions → Download → Microsoft Excel"],["Wells Fargo","Account Activity → Download → CSV"],["Capital One","Transactions → Download → CSV"],["Other bank","Look for 'Download', 'Export', or 'Statement' → choose CSV"]].map(([bank,steps])=>(
                  <div key={bank} style={{fontSize:12}}><strong style={{color:C.accent}}>{bank}:</strong> {steps}</div>
                ))}
              </div>
            </div>

            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Option 1 — Upload CSV file</div>
              <label style={{display:"flex",alignItems:"center",gap:10,background:C.surfaceAlt,border:`1.5px dashed ${C.border}`,borderRadius:12,padding:"14px 16px",cursor:"pointer"}}>
                <FileText size={20} color={C.textLight}/>
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:C.text}}>Choose file</div>
                  <div style={{fontSize:12,color:C.textLight}}>Select the .csv file from your bank</div>
                </div>
                <input type="file" accept=".csv,.txt" style={{display:"none"}} onChange={e=>e.target.files[0]&&handleFile(e.target.files[0])}/>
              </label>
            </div>

            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Option 2 — Paste CSV text</div>
              <textarea
                value={rawText} onChange={e=>setRawText(e.target.value)}
                placeholder={"Date,Description,Amount\n01/15/2025,STARBUCKS #1234,-4.75\n01/14/2025,PUBLIX SUPERMARKET,-89.23\n..."}
                style={{width:"100%",height:140,background:C.surfaceAlt,border:`1.5px solid ${rawText?C.accent:C.border}`,borderRadius:12,padding:"12px 14px",fontSize:12,fontFamily:"'SF Mono',monospace",color:C.text,outline:"none",resize:"none",boxSizing:"border-box",lineHeight:1.5}}
              />
            </div>

            {error&&<div style={{background:C.redBg,border:`1px solid ${C.redMid}`,borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:13,color:C.red}}>{error}</div>}

            <button onClick={handleParse} disabled={!rawText.trim()} style={{width:"100%",background:rawText.trim()?C.green:C.border,border:"none",borderRadius:14,padding:"15px 0",color:rawText.trim()?"#fff":C.textFaint,fontWeight:800,fontSize:16,cursor:rawText.trim()?"pointer":"default",fontFamily:MF}}>
              Parse Transactions →
            </button>
          </>}

          {step==="preview"&&<>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div>
                <div style={{fontFamily:MF,fontWeight:700,fontSize:16,color:C.text}}>{parsed.filter(r=>!skipped[r.id]).length} transactions ready</div>
                <div style={{fontSize:12,color:C.textLight}}>Total: {fmt(totalAmt)} · tap rows to adjust</div>
              </div>
              <button onClick={()=>{setStep("paste");setParsed([]);}} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12,color:C.textMid,fontWeight:600}}>← Back</button>
            </div>

            <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:10,padding:"9px 14px",marginBottom:12,fontSize:12,color:C.accent}}>
              ✅ Auto-categorized by merchant. Tap any category pill to change it. Toggle 🚫 to skip a row.
            </div>

            <div style={{marginBottom:16,maxHeight:380,overflowY:"auto",borderRadius:12,border:`1px solid ${C.border}`}}>
              {parsed.map((r,i)=>{
                const isSkipped=skipped[r.id];
                return(
                  <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderBottom:i<parsed.length-1?`1px solid ${C.border}`:"none",background:isSkipped?"#f8f9fc":C.surface,opacity:isSkipped?.4:1}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</div>
                      <div style={{fontSize:11,color:C.textLight,marginTop:2}}>{r.date}</div>
                      <div style={{marginTop:4,display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
                        <select value={editCats[r.id]||r.category} onChange={e=>{setEditCats(p=>({...p,[r.id]:e.target.value}));}} disabled={isSkipped}
                          style={{fontSize:10,fontWeight:700,background:C.accentBg,color:C.accent,border:`1px solid ${C.accentMid}`,borderRadius:99,padding:"2px 8px",cursor:"pointer",outline:"none",appearance:"none"}}>
                          {catNames.map(c=><option key={c} value={c}>{c}</option>)}
                        </select>
                        {household?.enabled&&household?.members?.length>1&&(
                          <select value={editOwner[r.id]||"me"} onChange={e=>setEditOwner(p=>({...p,[r.id]:e.target.value}))} disabled={isSkipped}
                            style={{fontSize:10,fontWeight:700,background:C.surfaceAlt,color:C.textMid,border:`1px solid ${C.border}`,borderRadius:99,padding:"2px 8px",cursor:"pointer",outline:"none",appearance:"none"}}>
                            {[{id:"me",name:"Me"},...household.members.filter(m=>m.id!=="me"),{id:"shared",name:"Shared"}].map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                        )}
                      </div>
                    </div>
                    <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:isSkipped?C.textFaint:C.red,flexShrink:0}}>-{fmt(r.amount)}</div>
                    <button onClick={()=>setSkipped(p=>({...p,[r.id]:!p[r.id]}))}
                      title={isSkipped?"Include":"Skip"}
                      style={{background:"none",border:"none",cursor:"pointer",color:isSkipped?C.green:C.textFaint,padding:"4px",fontSize:16,flexShrink:0}}>
                      {isSkipped?"✓":"🚫"}
                    </button>
                  </div>
                );
              })}
            </div>

            <button onClick={doImport} disabled={importing||parsed.filter(r=>!skipped[r.id]).length===0}
              style={{width:"100%",background:C.green,border:"none",borderRadius:14,padding:"15px 0",color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:MF}}>
              Import {parsed.filter(r=>!skipped[r.id]).length} Transactions
            </button>
          </>}

          {step==="done"&&(
            <div style={{textAlign:"center",padding:"40px 20px"}}>
              <div style={{fontSize:48,marginBottom:12}}>✅</div>
              <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,marginBottom:8}}>Import Complete!</div>
              <div style={{fontSize:14,color:C.textLight,marginBottom:24}}>Your transactions are now in Trackfi.</div>
              <button onClick={onClose} style={{background:C.accent,border:"none",borderRadius:14,padding:"14px 32px",color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:MF}}>Done</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function ExportModal({expenses,bills,debts,accounts,income,savingsGoals,budgetGoals,trades,shifts,categories,appName,greetName,onClose}){
  const now=new Date();
  const yr=now.getFullYear();
  const ms=yr+"-"+String(now.getMonth()+1).padStart(2,"0");
  const monthName=now.toLocaleDateString("en-US",{month:"long",year:"numeric"});

  function dlBlob(data,filename,type="text/html"){
    if(type==="text/csv"){
      // CSV: standard blob download works everywhere
      const b=new Blob([data],{type:"text/csv;charset=utf-8;"});
      const u=URL.createObjectURL(b);
      const a=document.createElement("a");
      a.href=u;a.download=filename;a.click();
      setTimeout(()=>URL.revokeObjectURL(u),1000);
    }else{
      // HTML reports: open in new tab via document.write
      // avoids blob: URL CSP restrictions in sandboxed environments
      const w=window.open("","_blank");
      if(w){
        w.document.open();
        w.document.write(data);
        w.document.close();
        w.document.title=filename;
      }else{
        // Fallback if popup blocked: data URI download
        const encoded="data:text/html;charset=utf-8,"+encodeURIComponent(data);
        const a=document.createElement("a");
        a.href=encoded;a.download=filename;a.click();
      }
    }
  }

  const ta=(parseFloat(accounts.checking||0))+(parseFloat(accounts.savings||0))+(parseFloat(accounts.cushion||0))+(parseFloat(accounts.investments||0))+(parseFloat(accounts.k401||0))+(parseFloat(accounts.roth_ira||0))+(parseFloat(accounts.brokerage||0))+(parseFloat(accounts.crypto||0))+(parseFloat(accounts.hsa||0))+(parseFloat(accounts.property||0))+(parseFloat(accounts.vehicles||0));
  const td=debts.reduce((s,d)=>s+(parseFloat(d.balance||0)),0);
  const nw=ta-td;
  const mult=income.payFrequency==="Weekly"?4.33:income.payFrequency==="Twice Monthly"?2:income.payFrequency==="Monthly"?1:2.17;
  const ti=(parseFloat(income.primary||0)*mult)+(parseFloat(income.other||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const thisMonthExp=expenses.filter(e=>e.date?.startsWith(ms));
  const mExp=thisMonthExp.reduce((s,e)=>s+(parseFloat(e.amount||0)),0);
  const sr=ti>0?Math.max(0,(ti-mExp)/ti*100):0;
  const catMap=thisMonthExp.reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount||0));return a},{});
  const catSorted=Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
  const liquid=parseFloat(accounts.checking||0)+parseFloat(accounts.savings||0)+parseFloat(accounts.cushion||0);
  const unpaidBills=bills.filter(b=>!b.paid);
  const totalUnpaid=unpaidBills.reduce((s,b)=>s+(parseFloat(b.amount||0)),0);
  const reportDate=now.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});
  const userName=greetName||(appName||"Trackfi");

  // ── Shared CSS used by all reports ────────────────────────────────────────
  const BASE_CSS=`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Inter',system-ui,sans-serif;background:#F0F2F8;color:#0A1628;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    @page{margin:0.6in 0.7in;size:letter;}
    @media print{body{background:white;}.no-print{display:none!important;}}
    .page{max-width:780px;margin:0 auto;background:white;}

    /* Header */
    .hdr{background:#0A1628;padding:32px 40px 28px;display:flex;justify-content:space-between;align-items:flex-start;}
    .hdr-logo{font-size:24px;font-weight:900;color:white;letter-spacing:-0.5px;}
    .hdr-logo span{color:#6366F1;}
    .hdr-meta{text-align:right;}
    .hdr-meta .report-type{font-size:11px;font-weight:700;color:rgba(255,255,255,0.4);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:4px;}
    .hdr-meta .report-name{font-size:20px;font-weight:800;color:white;letter-spacing:-0.3px;}
    .hdr-meta .report-date{font-size:12px;color:rgba(255,255,255,0.45);margin-top:3px;}

    /* Statement bar */
    .stmt-bar{background:#6366F1;padding:14px 40px;display:flex;justify-content:space-between;align-items:center;}
    .stmt-bar .acct{font-size:13px;color:rgba(255,255,255,0.7);}
    .stmt-bar .acct strong{color:white;font-weight:700;}
    .stmt-bar .period{font-size:12px;color:rgba(255,255,255,0.6);text-align:right;}

    /* Body */
    .body{padding:32px 40px;}

    /* Summary grid */
    .summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:32px;}
    .metric{background:#F8F9FC;border-radius:10px;padding:16px 14px;border-left:3px solid #E2E5EE;}
    .metric.green{border-left-color:#059669;}
    .metric.red{border-left-color:#DC2626;}
    .metric.indigo{border-left-color:#6366F1;}
    .metric.amber{border-left-color:#D97706;}
    .metric .lbl{font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.09em;margin-bottom:6px;}
    .metric .val{font-size:22px;font-weight:800;letter-spacing:-0.5px;line-height:1;}
    .metric .val.green{color:#059669;}
    .metric .val.red{color:#DC2626;}
    .metric .val.indigo{color:#6366F1;}
    .metric .val.amber{color:#D97706;}
    .metric .sub{font-size:11px;color:#9CA3AF;margin-top:4px;}

    /* Section heading */
    .sec-hdr{display:flex;align-items:center;gap:10px;margin:28px 0 14px;padding-bottom:8px;border-bottom:1.5px solid #0A1628;}
    .sec-hdr .dot{width:10px;height:10px;border-radius:50%;background:#6366F1;flex-shrink:0;}
    .sec-hdr h2{font-size:13px;font-weight:800;color:#0A1628;text-transform:uppercase;letter-spacing:0.09em;}

    /* Transaction table */
    table{width:100%;border-collapse:collapse;font-size:13px;}
    thead tr{background:#F8F9FC;}
    th{text-align:left;padding:9px 12px;font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.09em;border-bottom:1px solid #E2E5EE;}
    th.r{text-align:right;}
    td{padding:10px 12px;border-bottom:1px solid #F0F2F8;vertical-align:middle;}
    td.r{text-align:right;}
    tbody tr:last-child td{border-bottom:none;}
    tbody tr:hover{background:#FAFBFF;}
    .debit{color:#DC2626;font-weight:700;}
    .credit{color:#059669;font-weight:700;}
    .cat-pill{display:inline-block;background:#EEF2FF;color:#6366F1;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;letter-spacing:0.04em;}
    tfoot td{font-weight:700;background:#F8F9FC;border-top:1.5px solid #E2E5EE;padding:12px;}

    /* Balance table */
    .bal-section{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px;}
    .bal-group{background:#F8F9FC;border-radius:12px;padding:18px 20px;}
    .bal-group h3{font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.09em;margin-bottom:14px;}
    .bal-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #ECEEF5;font-size:13px;}
    .bal-row:last-child{border-bottom:none;}
    .bal-row .nm{color:#374151;}
    .bal-row .amt{font-weight:700;font-family:'SF Mono',monospace;font-size:12px;}
    .bal-total{display:flex;justify-content:space-between;padding:10px 0 0;margin-top:6px;border-top:2px solid #0A1628;font-weight:800;font-size:14px;}

    /* Progress bar */
    .prog-wrap{height:6px;background:#E2E5EE;border-radius:99px;overflow:hidden;margin-top:5px;}
    .prog-fill{height:100%;border-radius:99px;}

    /* Goal cards */
    .goal-row{display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid #F0F2F8;}
    .goal-ring{position:relative;width:44px;height:44px;flex-shrink:0;}

    /* Net worth bar */
    .nw-bar{background:#0A1628;border-radius:12px;padding:20px 24px;margin-bottom:28px;display:flex;justify-content:space-between;align-items:center;}
    .nw-bar .lft .lbl{font-size:10px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.09em;margin-bottom:4px;}
    .nw-bar .lft .val{font-size:32px;font-weight:900;letter-spacing:-1px;}
    .nw-bar .stats{display:flex;gap:24px;}
    .nw-bar .stat .lbl{font-size:10px;color:rgba(255,255,255,0.4);font-weight:600;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.07em;}
    .nw-bar .stat .val{font-size:16px;font-weight:800;}

    /* Footer */
    .footer{background:#F8F9FC;padding:20px 40px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #E2E5EE;margin-top:8px;}
    .footer .left{font-size:11px;color:#9CA3AF;}
    .footer .right{font-size:11px;color:#9CA3AF;text-align:right;}
    .footer .brand{font-size:13px;font-weight:800;color:#6366F1;margin-bottom:2px;}

    /* Print button */
    .print-btn{position:fixed;bottom:24px;right:24px;background:#6366F1;color:white;border:none;border-radius:12px;padding:14px 24px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 20px rgba(99,102,241,0.4);display:flex;align-items:center;gap:8px;z-index:999;}
    @media print{.print-btn{display:none;}}
  `;

  // ── REPORT 1: Monthly Statement ───────────────────────────────────────────
  function exportMonthlyStatement(){
    const txRows=thisMonthExp.sort((a,b)=>b.date?.localeCompare(a.date)).map(e=>{
      const d=new Date(e.date+"T00:00:00");
      const dateStr=d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
      const amt=parseFloat(e.amount||0);
      return`<tr><td>${dateStr}</td><td><strong>${(e.name||"").replace(/</g,"&lt;")}</strong></td><td><span class="cat-pill">${e.category||""}</span></td><td class="r debit">-$${amt.toFixed(2)}</td></tr>`;
    }).join("");

    const catRowsHtml=catSorted.map(([cat,amt])=>{
      const pct=mExp>0?(amt/mExp*100):0;
      const bar=`<div class="prog-wrap"><div class="prog-fill" style="width:${pct.toFixed(1)}%;background:#6366F1;"></div></div>`;
      return`<tr><td>${cat}</td><td>${bar}</td><td class="r">${pct.toFixed(0)}%</td><td class="r debit">$${amt.toFixed(2)}</td></tr>`;
    }).join("");

    const html=`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Trackfi — ${monthName} Statement</title>
    <style>${BASE_CSS}</style></head><body>
    <div class="page">
    <div class="hdr">
      <div><div class="hdr-logo">💰 <span>trackfi</span></div><div style="font-size:12px;color:rgba(255,255,255,0.35);margin-top:6px;font-weight:500;">Personal Finance</div></div>
      <div class="hdr-meta"><div class="report-type">Monthly Statement</div><div class="report-name">${monthName}</div><div class="report-date">Prepared ${reportDate}</div></div>
    </div>
    <div class="stmt-bar">
      <div class="acct">Account holder: <strong>${userName}</strong></div>
      <div class="period">Statement period: ${new Date(yr,now.getMonth(),1).toLocaleDateString("en-US",{month:"short",day:"numeric"})} – ${reportDate}</div>
    </div>
    <div class="body">

    <div class="summary-grid">
      <div class="metric indigo"><div class="lbl">Monthly Income</div><div class="val indigo">$${ti.toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})}</div><div class="sub">${income.payFrequency||"Monthly"} pay</div></div>
      <div class="metric red"><div class="lbl">Total Spent</div><div class="val red">$${mExp.toFixed(0)}</div><div class="sub">${thisMonthExp.length} transactions</div></div>
      <div class="metric green"><div class="lbl">Remaining</div><div class="val green">$${Math.max(0,ti-mExp).toFixed(0)}</div><div class="sub">${sr.toFixed(0)}% savings rate</div></div>
      <div class="metric amber"><div class="lbl">Checking Balance</div><div class="val amber">$${parseFloat(accounts.checking||0).toLocaleString()}</div><div class="sub">as of today</div></div>
    </div>

    <div class="sec-hdr"><div class="dot"></div><h2>Spending by Category</h2></div>
    <table>
      <thead><tr><th>Category</th><th>Breakdown</th><th class="r">% of Spending</th><th class="r">Amount</th></tr></thead>
      <tbody>${catRowsHtml}</tbody>
      <tfoot><tr><td colspan="3"><strong>Total Spending</strong></td><td class="r debit"><strong>$${mExp.toFixed(2)}</strong></td></tr></tfoot>
    </table>

    <div class="sec-hdr"><div class="dot"></div><h2>Transaction Detail</h2></div>
    <table>
      <thead><tr><th>Date</th><th>Description</th><th>Category</th><th class="r">Amount</th></tr></thead>
      <tbody>${txRows||"<tr><td colspan='4' style='text-align:center;color:#9CA3AF;padding:24px'>No transactions this month</td></tr>"}</tbody>
      <tfoot><tr><td colspan="3"><strong>${thisMonthExp.length} transactions</strong></td><td class="r debit"><strong>$${mExp.toFixed(2)}</strong></td></tr></tfoot>
    </table>

    ${unpaidBills.length>0?`
    <div class="sec-hdr"><div class="dot"></div><h2>Outstanding Bills</h2></div>
    <table>
      <thead><tr><th>Bill</th><th>Due Date</th><th>Frequency</th><th class="r">Amount</th></tr></thead>
      <tbody>${unpaidBills.slice(0,10).map(b=>`<tr><td><strong>${(b.name||"").replace(/</g,"&lt;")}</strong></td><td>${b.dueDate||"—"}</td><td>${b.recurring||"Monthly"}</td><td class="r debit">$${parseFloat(b.amount||0).toFixed(2)}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td colspan="3"><strong>Total Outstanding</strong></td><td class="r debit"><strong>$${totalUnpaid.toFixed(2)}</strong></td></tr></tfoot>
    </table>`:""}

    </div>
    <div class="footer">
      <div class="left"><div class="brand">💰 trackfi</div><div>This document was generated on ${reportDate} and is for personal use only.</div></div>
      <div class="right"><div>Document ID: TF-${yr}${String(now.getMonth()+1).padStart(2,"0")}-${Math.random().toString(36).slice(2,8).toUpperCase()}</div><div>Confidential — not for distribution</div></div>
    </div>
    </div>
    <button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
    </body></html>`;
    dlBlob(html,(appName||"trackfi")+"-statement-"+ms+".html");
  }

  // ── REPORT 2: Net Worth Report ────────────────────────────────────────────
  function exportNetWorthReport(){
    const assetItems=[
      {l:"Checking",v:accounts.checking,ic:"🏦"},{l:"Savings",v:accounts.savings,ic:"💰"},
      {l:"Emergency Fund",v:accounts.cushion,ic:"🛡️"},{l:"401(k)",v:accounts.k401,ic:"🏢"},
      {l:"Roth IRA",v:accounts.roth_ira,ic:"🌱"},{l:"Brokerage",v:accounts.brokerage,ic:"📊"},
      {l:"HSA",v:accounts.hsa,ic:"🏥"},{l:"Crypto",v:accounts.crypto,ic:"₿"},
      {l:"Investments",v:accounts.investments,ic:"📈"},{l:"Property",v:accounts.property,ic:"🏠"},
      {l:"Vehicles",v:accounts.vehicles,ic:"🚗"},
    ].filter(a=>parseFloat(a.v||0)>0);

    const debtItems=debts.map(d=>({l:d.name,v:d.balance,rate:d.rate,type:d.type}));
    const goalProgress=savingsGoals.map(g=>{
      const pct=Math.min(100,parseFloat(g.target||1)>0?(parseFloat(g.saved||0)/parseFloat(g.target))*100:0);
      const deg=pct*3.6;
      const r=16,circ=2*Math.PI*r;
      const dash=circ*(pct/100);
      return`<div class="goal-row">
        <svg width="44" height="44" viewBox="0 0 44 44" style="flex-shrink:0">
          <circle cx="22" cy="22" r="${r}" fill="none" stroke="#E2E5EE" stroke-width="5"/>
          <circle cx="22" cy="22" r="${r}" fill="none" stroke="${g.color||"#6366F1"}" stroke-width="5"
            stroke-dasharray="${dash.toFixed(1)} ${circ.toFixed(1)}" stroke-linecap="round"
            transform="rotate(-90 22 22)"/>
          <text x="22" y="26" text-anchor="middle" font-size="9" font-weight="800" fill="${g.color||"#6366F1"}" font-family="Inter,sans-serif">${pct.toFixed(0)}%</text>
        </svg>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;color:#0A1628">${g.icon||"🎯"} ${(g.name||"").replace(/</g,"&lt;")}</div>
          <div style="font-size:11px;color:#9CA3AF;margin-top:2px">$${parseFloat(g.saved||0).toLocaleString()} of $${parseFloat(g.target||0).toLocaleString()} · ${g.monthly?("$"+parseFloat(g.monthly).toFixed(0)+"/mo"):""}</div>
          <div style="margin-top:5px"><div class="prog-wrap"><div class="prog-fill" style="width:${pct.toFixed(1)}%;background:${g.color||"#6366F1"};"></div></div></div>
        </div>
        <div style="font-size:15px;font-weight:800;color:${pct>=100?"#059669":"#6366F1"};flex-shrink:0">${pct>=100?"✓ Done":"$"+Math.max(0,parseFloat(g.target||0)-parseFloat(g.saved||0)).toLocaleString()+" left"}</div>
      </div>`;
    }).join("");

    const html=`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Trackfi — Net Worth Report</title>
    <style>${BASE_CSS}</style></head><body>
    <div class="page">
    <div class="hdr">
      <div><div class="hdr-logo">💰 <span>trackfi</span></div><div style="font-size:12px;color:rgba(255,255,255,0.35);margin-top:6px;font-weight:500;">Personal Finance</div></div>
      <div class="hdr-meta"><div class="report-type">Net Worth Report</div><div class="report-name">${userName}</div><div class="report-date">As of ${reportDate}</div></div>
    </div>
    <div class="stmt-bar">
      <div class="acct">Account holder: <strong>${userName}</strong></div>
      <div class="period">Report date: <strong>${reportDate}</strong></div>
    </div>
    <div class="body">

    <div class="nw-bar">
      <div class="lft"><div class="lbl">Net Worth</div><div class="val" style="color:${nw>=0?"#34D399":"#F87171"}">${nw>=0?"+":"-"}$${Math.abs(nw).toLocaleString("en-US",{minimumFractionDigits:0})}</div></div>
      <div class="stats">
        <div class="stat"><div class="lbl">Total Assets</div><div class="val" style="color:#34D399">$${ta.toLocaleString()}</div></div>
        <div class="stat"><div class="lbl">Total Debt</div><div class="val" style="color:#F87171">$${td.toLocaleString()}</div></div>
        <div class="stat"><div class="lbl">Liquid</div><div class="val" style="color:white">$${liquid.toLocaleString()}</div></div>
      </div>
    </div>

    <div class="bal-section">
      <div class="bal-group">
        <h3>Assets</h3>
        ${assetItems.map(a=>`<div class="bal-row"><span class="nm">${a.ic} ${a.l}</span><span class="amt" style="color:#059669">$${parseFloat(a.v||0).toLocaleString()}</span></div>`).join("")}
        <div class="bal-total"><span>Total Assets</span><span style="color:#059669">$${ta.toLocaleString()}</span></div>
      </div>
      <div class="bal-group">
        <h3>Liabilities</h3>
        ${debtItems.length?debtItems.map(d=>`<div class="bal-row"><span class="nm">💳 ${(d.l||"").replace(/</g,"&lt;")}${d.rate?" ("+d.rate+"%)":" "}</span><span class="amt" style="color:#DC2626">$${parseFloat(d.v||0).toLocaleString()}</span></div>`).join(""):"<div style='color:#9CA3AF;font-size:13px;padding:12px 0'>No debts — debt free! 🎉</div>"}
        ${td>0?`<div class="bal-total"><span>Total Debt</span><span style="color:#DC2626">$${td.toLocaleString()}</span></div>`:""}
      </div>
    </div>

    ${savingsGoals.length>0?`
    <div class="sec-hdr"><div class="dot"></div><h2>Savings Goals</h2></div>
    ${goalProgress}`:""}

    ${debts.length>0?`
    <div class="sec-hdr"><div class="dot"></div><h2>Debt Detail</h2></div>
    <table>
      <thead><tr><th>Name</th><th>Type</th><th class="r">Rate</th><th class="r">Min Payment</th><th class="r">Monthly Interest</th><th class="r">Balance</th></tr></thead>
      <tbody>${debts.map(d=>`<tr><td><strong>${(d.name||"").replace(/</g,"&lt;")}</strong></td><td>${d.type||"—"}</td><td class="r">${d.rate||0}% APR</td><td class="r">$${parseFloat(d.minPayment||0).toFixed(2)}</td><td class="r" style="color:#DC2626">$${(parseFloat(d.balance||0)*(parseFloat(d.rate||0)/100/12)).toFixed(2)}</td><td class="r debit">$${parseFloat(d.balance||0).toLocaleString()}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td colspan="4"><strong>Totals</strong></td><td class="r" style="color:#DC2626"><strong>$${debts.reduce((s,d)=>s+(parseFloat(d.balance||0)*(parseFloat(d.rate||0)/100/12)),0).toFixed(2)}/mo</strong></td><td class="r debit"><strong>$${td.toLocaleString()}</strong></td></tr></tfoot>
    </table>`:""}

    </div>
    <div class="footer">
      <div class="left"><div class="brand">💰 trackfi</div><div>Net worth snapshot as of ${reportDate}. Values reflect manually entered balances.</div></div>
      <div class="right"><div>Document ID: TF-NW-${Math.random().toString(36).slice(2,10).toUpperCase()}</div><div>Confidential — personal use only</div></div>
    </div>
    </div>
    <button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
    </body></html>`;
    dlBlob(html,(appName||"trackfi")+"-networth-"+now.toISOString().split("T")[0]+".html");
  }

  // ── REPORT 3: Annual Summary ──────────────────────────────────────────────
  function exportAnnualSummary(){
    const months=Array.from({length:now.getMonth()+1},(_,i)=>{
      const mStr=yr+"-"+String(i+1).padStart(2,"0");
      const mExps=expenses.filter(e=>e.date?.startsWith(mStr));
      const total=mExps.reduce((s,e)=>s+(parseFloat(e.amount||0)),0);
      const cats=mExps.reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount||0));return a},{});
      const top=Object.entries(cats).sort((a,b)=>b[1]-a[1])[0];
      const mn=new Date(yr,i,1).toLocaleDateString("en-US",{month:"short"});
      return{mn,total,count:mExps.length,top:top?.[0]||"—",topAmt:top?.[1]||0};
    });
    const ytdTotal=months.reduce((s,m)=>s+m.total,0);
    const ytdTxns=months.reduce((s,m)=>s+m.count,0);
    const avgMonth=months.length>0?ytdTotal/months.length:0;
    const maxMonth=Math.max(...months.map(m=>m.total),1);
    const ytdCatMap=expenses.filter(e=>e.date?.startsWith(String(yr))).reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount||0));return a},{});
    const ytdCats=Object.entries(ytdCatMap).sort((a,b)=>b[1]-a[1]);

    const monthBars=months.map(m=>{
      const h=Math.max(4,Math.round((m.total/maxMonth)*80));
      const isHigh=m.total>avgMonth*1.2;
      return`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
        <div style="font-size:10px;color:#9CA3AF;font-weight:600">$${m.total>=1000?(m.total/1000).toFixed(0)+"k":m.total.toFixed(0)}</div>
        <div style="width:100%;height:${h}px;background:${isHigh?"#DC2626":"#6366F1"};border-radius:4px 4px 0 0;opacity:${isHigh?1:0.75}"></div>
        <div style="font-size:10px;color:#374151;font-weight:600">${m.mn}</div>
      </div>`;
    }).join("");

    const html=`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Trackfi — ${yr} Annual Summary</title>
    <style>${BASE_CSS}.chart-wrap{display:flex;gap:6px;align-items:flex-end;height:120px;margin-bottom:8px;}</style></head><body>
    <div class="page">
    <div class="hdr">
      <div><div class="hdr-logo">💰 <span>trackfi</span></div><div style="font-size:12px;color:rgba(255,255,255,0.35);margin-top:6px;font-weight:500;">Personal Finance</div></div>
      <div class="hdr-meta"><div class="report-type">Annual Summary</div><div class="report-name">${yr} Year to Date</div><div class="report-date">Through ${reportDate}</div></div>
    </div>
    <div class="stmt-bar">
      <div class="acct">Account holder: <strong>${userName}</strong></div>
      <div class="period">Year: <strong>Jan – ${new Date(yr,now.getMonth(),1).toLocaleDateString("en-US",{month:"short"})} ${yr}</strong></div>
    </div>
    <div class="body">

    <div class="summary-grid">
      <div class="metric red"><div class="lbl">YTD Spending</div><div class="val red">$${ytdTotal.toFixed(0)}</div><div class="sub">${ytdTxns} transactions</div></div>
      <div class="metric indigo"><div class="lbl">Monthly Average</div><div class="val indigo">$${avgMonth.toFixed(0)}</div><div class="sub">across ${months.length} months</div></div>
      <div class="metric green"><div class="lbl">Savings Rate</div><div class="val green">${ti>0?Math.max(0,(ti-avgMonth)/ti*100).toFixed(0):0}%</div><div class="sub">avg monthly</div></div>
      <div class="metric amber"><div class="lbl">Net Worth</div><div class="val amber">${nw>=0?"$"+nw.toLocaleString():"-$"+Math.abs(nw).toLocaleString()}</div><div class="sub">as of today</div></div>
    </div>

    <div class="sec-hdr"><div class="dot"></div><h2>Monthly Spending — ${yr}</h2></div>
    <div style="background:#F8F9FC;border-radius:12px;padding:20px 20px 12px;">
      <div class="chart-wrap">${monthBars}</div>
      <div style="display:flex;gap:16px;font-size:11px;color:#9CA3AF;margin-top:4px">
        <span>● <span style="color:#6366F1">Normal</span></span>
        <span>● <span style="color:#DC2626">Above average</span></span>
        <span style="margin-left:auto">Avg: $${avgMonth.toFixed(0)}/mo</span>
      </div>
    </div>

    <div class="sec-hdr"><div class="dot"></div><h2>Top Spending Categories — YTD</h2></div>
    <table>
      <thead><tr><th>Category</th><th>Breakdown</th><th class="r">% of Spending</th><th class="r">YTD Total</th></tr></thead>
      <tbody>${ytdCats.map(([cat,amt])=>{const pct=ytdTotal>0?(amt/ytdTotal*100):0;return`<tr><td>${cat}</td><td><div class="prog-wrap"><div class="prog-fill" style="width:${pct.toFixed(1)}%;background:#6366F1;"></div></div></td><td class="r">${pct.toFixed(0)}%</td><td class="r debit">$${amt.toFixed(2)}</td></tr>`;}).join("")}</tbody>
      <tfoot><tr><td colspan="3"><strong>Total YTD</strong></td><td class="r debit"><strong>$${ytdTotal.toFixed(2)}</strong></td></tr></tfoot>
    </table>

    <div class="sec-hdr"><div class="dot"></div><h2>Month-by-Month Breakdown</h2></div>
    <table>
      <thead><tr><th>Month</th><th class="r">Transactions</th><th>Top Category</th><th class="r">vs Average</th><th class="r">Total</th></tr></thead>
      <tbody>${months.map(m=>{const diff=avgMonth>0?((m.total-avgMonth)/avgMonth*100):0;const col=diff>15?"#DC2626":diff<-15?"#059669":"#6366F1";return`<tr><td><strong>${m.mn} ${yr}</strong></td><td class="r">${m.count}</td><td><span class="cat-pill">${m.top}</span></td><td class="r" style="color:${col};font-weight:700">${diff>0?"+":""}${diff.toFixed(0)}%</td><td class="r debit">$${m.total.toFixed(2)}</td></tr>`;}).join("")}</tbody>
    </table>

    </div>
    <div class="footer">
      <div class="left"><div class="brand">💰 trackfi</div><div>Annual summary for ${yr}, generated ${reportDate}. All values manually tracked.</div></div>
      <div class="right"><div>Document ID: TF-YTD-${yr}-${Math.random().toString(36).slice(2,8).toUpperCase()}</div><div>Confidential — personal use only</div></div>
    </div>
    </div>
    <button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
    </body></html>`;
    dlBlob(html,(appName||"trackfi")+"-annual-"+yr+".html");
  }

  // ── REPORT 4: Raw data CSV (for accountant / spreadsheet) ─────────────────
  function exportRawCSV(){
    const hdr=["Date","Description","Category","Amount","Type","Notes","Owner"];
    const expRows=[...expenses].sort((a,b)=>b.date?.localeCompare(a.date)).map(e=>[
      e.date,(e.name||"").replace(/,/g," "),e.category||"","-"+parseFloat(e.amount||0).toFixed(2),"Expense",(e.notes||"").replace(/,/g," "),e.owner||"me"
    ]);
    const billRows=bills.filter(b=>b.paid).map(b=>[
      b.dueDate||"",(b.name||"").replace(/,/g," "),"Bill","-"+parseFloat(b.amount||0).toFixed(2),"Bill Payment","",b.paidBy||"me"
    ]);
    const allRows=[...expRows,...billRows].sort((a,b)=>b[0].localeCompare(a[0]));
    const csv=[hdr,...allRows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\r\n");
    dlBlob(csv,(appName||"trackfi")+"-transactions-"+yr+".csv","text/csv");
  }

  const EXPORTS=[
    {icon:"📄",label:"Monthly Statement",desc:monthName+" — transactions, categories, bills",action:exportMonthlyStatement,color:C.accent,bg:C.accentBg,tag:"HTML"},
    {icon:"💎",label:"Net Worth Report",desc:"Full balance sheet — assets, debts, goals",action:exportNetWorthReport,color:C.purple,bg:C.purpleBg,tag:"HTML"},
    {icon:"📊",label:"Annual Summary",desc:yr+" year-to-date — trends & category breakdown",action:exportAnnualSummary,color:C.green,bg:C.greenBg,tag:"HTML"},
    {icon:"📋",label:"Raw Transaction Data",desc:"All transactions — for accountants & spreadsheets",action:exportRawCSV,color:C.textMid,bg:C.surfaceAlt,tag:"CSV"},
  ];

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(10,22,40,.55)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.surface,borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto",padding:"0 0 40px",animation:"slideUp .26s cubic-bezier(.22,1,.36,1)",boxShadow:"0 -4px 60px rgba(10,22,40,.22)"}}>
        <div style={{width:40,height:4,background:C.border,borderRadius:99,margin:"14px auto 4px"}}/>
        <div style={{padding:"16px 24px 20px",borderBottom:`1px solid ${C.borderLight}`,marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{background:C.accentBg,borderRadius:12,padding:"9px 10px",display:"flex"}}><Download size={20} color={C.accent}/></div>
            <div>
              <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text,letterSpacing:-.3}}>Export Center</div>
              <div style={{fontSize:12,color:C.textLight,marginTop:1}}>Professional branded documents</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:C.surfaceAlt,border:"none",cursor:"pointer",color:C.textMid,padding:"7px 8px",borderRadius:10,display:"flex"}}><X size={15}/></button>
        </div>
        <div style={{padding:"0 24px"}}>
          <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"10px 14px",marginBottom:18,fontSize:12,color:C.accent,lineHeight:1.5}}>
            💡 HTML reports open in your browser — tap <strong>🖨 Print / Save as PDF</strong> inside the document to save a professional PDF. Everything runs locally on your device.
          </div>
          {EXPORTS.map((ex,i)=>(
            <button key={i} onClick={ex.action} className="ba" style={{display:"flex",alignItems:"center",gap:14,width:"100%",background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:16,padding:"16px 16px",marginBottom:10,cursor:"pointer",textAlign:"left",transition:"all .15s"}}>
              <div style={{width:48,height:48,borderRadius:12,background:ex.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{ex.icon}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                  <span style={{fontSize:14,fontWeight:700,color:ex.color}}>{ex.label}</span>
                  <span style={{fontSize:10,fontWeight:700,background:ex.color+"18",color:ex.color,borderRadius:99,padding:"1px 7px"}}>{ex.tag}</span>
                </div>
                <div style={{fontSize:12,color:C.textLight,lineHeight:1.4}}>{ex.desc}</div>
              </div>
              <Download size={15} color={C.textLight}/>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
function AppInner(){
  const[tab,setTabRaw]=useState("home");
  const[tabHistory,setTabHistory]=useState([]);
  function navTo(t){if(t===tab)return;setTabHistory(h=>[...h.slice(-19),tab]);setTabRaw(t);requestAnimationFrame(()=>requestAnimationFrame(()=>{const el=document.getElementById("fv-scroll");if(el)el.scrollTop=0;}));}
  function goBack(){setTabHistory(h=>{if(!h.length)return h;const p=h[h.length-1];setTabRaw(p);requestAnimationFrame(()=>requestAnimationFrame(()=>{const el=document.getElementById("fv-scroll");if(el)el.scrollTop=0;}));return h.slice(0,-1);});}
  const canGoBack=tabHistory.length>0;
  const[authSession,setAuthSession]=useState(null);
  const[authLoading,setAuthLoading]=useState(true);
  const[pwResetMode]=useState(()=>{try{return localStorage.getItem("fv_pw_reset")==="1";}catch{return false;}});
  const[newPw,setNewPw]=useState("");const[pwMsg,setPwMsg]=useState("");const[pwLoading,setPwLoading]=useState(false);
  const[skipAuth,setSkipAuth]=useState(()=>{try{return localStorage.getItem("fv_skip_auth")==="1";}catch{return false;}});
  const authToken=authSession?.access_token||null;
  // Background token refresh — Supabase tokens expire after 1hr, refresh every 45min
  useEffect(()=>{
    if(!authSession?.refresh_token)return;
    const doRefresh=async()=>{
      try{
        const s=JSON.parse(localStorage.getItem("fv_session")||"null");
        if(!s?.refresh_token)return;
        const res=await fetch(SUPA_URL+"/auth/v1/token?grant_type=refresh_token",{
          method:"POST",headers:{"Content-Type":"application/json","apikey":SUPA_KEY},
          body:JSON.stringify({refresh_token:s.refresh_token})
        });
        const r=await res.json();
        if(r.access_token){
          const newSess={...s,...r};
          localStorage.setItem("fv_session",JSON.stringify(newSess));
          setAuthSession(newSess);
        }
      }catch{}
    };
    const iv=setInterval(doRefresh,45*60*1000);
    return()=>clearInterval(iv);
  },[authSession?.refresh_token]);

  // Auto-sync when user returns to the app (tab focus, phone unlock, etc.)
  useEffect(()=>{
    function onFocus(){
      if(authSession){
        const lastSync=parseInt(localStorage.getItem("fv_last_sync")||"0");
        const now=Date.now();
        if(now-lastSync>30000){ // only sync if 30+ seconds since last sync
          localStorage.setItem("fv_last_sync",String(now));
          loadFromSupabase(authSession);
        }
      }
    }
    const onVis=()=>{if(!document.hidden)onFocus();};
    window.addEventListener("focus",onFocus);
    document.addEventListener("visibilitychange",onVis);
    return()=>{
      window.removeEventListener("focus",onFocus);
      document.removeEventListener("visibilitychange",onVis);
    };
  },[authSession]);

  useEffect(()=>{
    // Handle email confirmation callback — Supabase puts tokens in the URL hash
    const hash = window.location.hash;
    if(hash && hash.includes("access_token=")) {
      const params = new URLSearchParams(hash.replace("#",""));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const type = params.get("type"); // "signup" or "recovery"
      if(accessToken) {
        const sess = {access_token: accessToken, refresh_token: refreshToken, token_type:"bearer"};
        supaFetch("/auth/v1/user",{headers:{"Authorization":"Bearer "+accessToken}}).then(u=>{
          const user = u?.data || u;
          if(user?.id) {
            const fullSess = {...sess, user};
            localStorage.setItem("fv_session", JSON.stringify(fullSess));
            if(type==="recovery") {
              // Password reset flow — sign in but show change-password prompt
              setAuthSession(fullSess);
              localStorage.setItem("fv_pw_reset","1");
            } else {
              handleAuth(fullSess);
            }
          }
          window.history.replaceState(null,"",window.location.pathname);
          setAuthLoading(false);
        }).catch(()=>{window.history.replaceState(null,"",window.location.pathname);setAuthLoading(false);});
        return;
      }
    }
    // Normal boot: validate + refresh existing session
    const s=JSON.parse(localStorage.getItem("fv_session")||"null");
    if(!s?.access_token){setAuthLoading(false);return;}
    // Try to refresh the token first (handles expired access tokens)
    async function tryRefresh(session){
      if(!session?.refresh_token) return session;
      try{
        const res=await fetch(SUPA_URL+"/auth/v1/token?grant_type=refresh_token",{
          method:"POST",
          headers:{"Content-Type":"application/json","apikey":SUPA_KEY},
          body:JSON.stringify({refresh_token:session.refresh_token})
        });
        const r=await res.json();
        if(r.access_token){
          const newSess={...session,...r};
          localStorage.setItem("fv_session",JSON.stringify(newSess));
          return newSess;
        }
      }catch{}
      return session;
    }
    tryRefresh(s).then(sess=>{
      return supaFetch("/auth/v1/user",{headers:{"Authorization":"Bearer "+sess.access_token}}).then(u=>{
        if(u?.data?.id||u?.id){setAuthSession(sess);}else{localStorage.removeItem("fv_session");}
        setAuthLoading(false);
      });
    }).catch(()=>setAuthLoading(false));
  },[]);
  function handleAuth(sess){
    setAuthSession(sess);
    localStorage.setItem("fv_session",JSON.stringify(sess));
    // Only migrate legacy local data if this looks like a returning user
    // (don't pollute a brand-new account with data from a previous offline session)
    try{
      const uid=sess?.user?.id?.slice(0,8);
      if(uid){
        const scope="fv6_"+uid+":";
        const prevSession=localStorage.getItem("fv_session");
        const hasLocalExpenses=localStorage.getItem("fv6:expenses");
        const hasScoped=localStorage.getItem(scope+"expenses");
        // Only migrate if: had a previous session OR has scoped data already
        // Don't migrate raw device data into a fresh account
        if((prevSession||hasScoped)&&hasLocalExpenses&&!hasScoped){
          ["accounts","income","expenses","bills","debts","bgoals","sgoals","cats","trades","taccount","settings","calColors","notifs","balHist","shifts","prof","profSub","dashConfig","appName","greetName"].forEach(k=>{
            const legacy=localStorage.getItem("fv6:"+k);
            const scoped=localStorage.getItem(scope+k);
            if(legacy&&!scoped)localStorage.setItem(scope+k,legacy);
          });
        }
      }
    }catch{}
    // Pull fresh data from Supabase after login (delay slightly to let boot load finish)
    setTimeout(()=>loadFromSupabase(sess), 800);
  }
  async function loadFromSupabase(sess) {
    const uid = sess?.user?.id;
    if (!uid) return;
    setSyncing(true);
    try {
      const res = await supaFetch(`/rest/v1/user_data?user_id=eq.${uid}&select=key,value`);
      if (!res?.data || !Array.isArray(res.data)) return;
      const map = {};
      res.data.forEach(row => { map[row.key] = row.value; });
      // Apply each piece of data to state (same as boot load)
      const apply = (key, setter, merge=false) => {
        if (map[key] === undefined) return;
        const v = map[key];
        if (!v) return;
        if (merge) setter(prev => ({...prev, ...v}));
        else setter(v);
      };
      try { apply("expenses",  setExpenses); } catch {}
      try { apply("bills",     setBills); } catch {}
      try { apply("debts",     setDebts); } catch {}
      try { apply("bgoals",    setBGoals); } catch {}
      try { apply("sgoals",    setSGoals); } catch {}
      try { apply("cats",      setCats); } catch {}
      try { apply("trades",    setTrades); } catch {}
      try { apply("balHist",   setBalHist); } catch {}
      try { apply("shifts",    setShifts); } catch {}
      try { apply("notifs",    setNotifs); } catch {}
      try { apply("accounts",  setAccounts, true); } catch {}
      try { apply("income",    setIncome,   true); } catch {}
      try { apply("settings",  setSettings, true); } catch {}
      try { apply("calColors", setCalColors,true); } catch {}
      try { apply("dashConfig",setDashConfig,true); } catch {}
      try { apply("household", setHousehold,true); } catch {}
      try { apply("taccount",  setTradingAccount); } catch {}
      try { if (map["appName"])  setAppName(map["appName"]); } catch {}
      try { if (map["greetName"]) setGreetName(map["greetName"]); } catch {}
      try { if (map["prof"])     setProfCategory(map["prof"]); } catch {}
      try { if (map["profSub"])  setProfSub(map["profSub"]); } catch {}
      try { if (map["merchantCats"]) window._merchantCats = map["merchantCats"]; } catch {}
      try { if (map["accountRates"]) setAccountRates(prev => ({...prev,...map["accountRates"]})); } catch {}
      try { if (map["onboarded"]) { localStorage.setItem("fv_onboarded","1"); setOnboarded(true); } } catch {}
      // Mirror Supabase data into scoped localStorage for offline use
      const scope = "fv6_" + uid.slice(0,8) + ":";
      res.data.forEach(row => {
        try { localStorage.setItem(scope + row.key, JSON.stringify(row.value)); } catch {}
      });
      localStorage.setItem("fv_last_sync", String(Date.now()));
    } catch(e) { console.error("loadFromSupabase error", e); }
    finally { setSyncing(false); }
  }
  function handleSkip(){localStorage.setItem("fv_skip_auth","1");setSkipAuth(true);}
  function handleSignOut(){
    // Flush any pending debounced writes before signing out
    Object.entries(_ssBuffer).forEach(([bare,buf])=>{
      if(buf.timer){clearTimeout(buf.timer);const uid=_getUserId();if(uid)_flushKey(uid,bare,buf.value);}
    });
    if(authToken)supaFetch("/auth/v1/logout",{method:"POST"});
    setAuthSession(null);
    localStorage.removeItem("fv_session");
    localStorage.removeItem("fv_skip_auth");
    setSkipAuth(false);
  }
  const[ready,setReady]=useState(false);
  const[accounts,setAccounts]=useState({checking:"",savings:"",cushion:"",investments:"",k401:"",roth_ira:"",brokerage:"",crypto:"",hsa:"",property:"",vehicles:""});
  const[income,setIncome]=useState({primary:"",other:"",trading:"",rental:"",dividends:"",freelance:"",payFrequency:"Biweekly",lastPayDate:""});
  const[expenses,setExpenses]=useState([]);
  const[bills,setBills]=useState([]);
  const[debts,setDebts]=useState([]);
  const[budgetGoals,setBGoals]=useState([]);
  const[savingsGoals,setSGoals]=useState([]);
  const[categories,setCats]=useState(DEF_CATS);
  const[accountRates,setAccountRates]=useState(()=>{try{const r=localStorage.getItem("fv_account_rates");return r?JSON.parse(r):{checking:0,savings:0,cushion:0,k401:0,roth_ira:0,brokerage:0,hsa:0,crypto:0};}catch{return{checking:0,savings:0,cushion:0,k401:0,roth_ira:0,brokerage:0,hsa:0,crypto:0};}});
  const[household,setHousehold]=useState({enabled:false,name:"Our Household",members:[{id:"me",name:"Me",emoji:"😊",color:"#6366f1"},{id:"partner",name:"Partner",emoji:"😄",color:"#10b981"}]});
  const[trades,setTrades]=useState([]);
  const[tradingAccount,setTradingAccount]=useState({deposit:"",balance:""});
  const[shifts,setShifts]=useState([]);
  const[balHist,setBalHist]=useState([]);
  const[notifs,setNotifs]=useState([]);
  const[calColors,setCalColors]=useState({expense:C.red,bill:C.amber,today:C.accent,dotStyle:"circle"});
  const[settings,setSettings]=useState({showTrading:true,showCrypto:false,showHealth:true,showSavings:true,showForecast:true,darkMode:false,quickActions:["expense","bill","paycheck","debt","health","budget","savings","insights"]});
  const[monthlySummary,setMonthlySummary]=useState(null);
  const[dashConfig,setDashConfig]=useState({showIncomeChart:true,showMetrics:true,showAccounts:true,showBills:true,showDebts:true,showGoals:true});
  const[appName,setAppName]=useState("Trackfi");
  const[greetName,setGreetName]=useState("");
  const[profCategory,setProfCategory]=useState("healthcare");
  const[profSub,setProfSub]=useState("nurse_rn");
  const[darkMode,setDarkMode]=useState(()=>{try{return localStorage.getItem("fv_dark")==="1";}catch{return false;}});
  const[hidden,setHidden]=useState(false);
  const[heroIdx,setHeroIdx]=useState(0);
  const[pwaPrompt,setPwaPrompt]=useState(null);
  const[pwaInstalled,setPwaInstalled]=useState(()=>{try{return localStorage.getItem("fv_pwa_dismissed")==="1";}catch{return false;}});
  useEffect(()=>{
    const handler=e=>{e.preventDefault();setPwaPrompt(e);};
    window.addEventListener("beforeinstallprompt",handler);
    window.addEventListener("appinstalled",()=>{setPwaInstalled(true);localStorage.setItem("fv_pwa_dismissed","1");});
    return()=>window.removeEventListener("beforeinstallprompt",handler);
  },[]);
  const[pinEnabled,setPinEnabled]=useState(()=>{try{return!!localStorage.getItem("fv_pin_hash");}catch{return false;}});
  const[locked,setLocked]=useState(()=>{try{return!!localStorage.getItem("fv_pin_hash");}catch{return false;}});
  const[onboarded,setOnboarded]=useState(()=>{try{return localStorage.getItem("fv_onboarded")==="1";}catch{return false;}});
  const[modal,setModal]=useState(null);
  const[showExport,setShowExport]=useState(false);
  const[showImport,setShowImport]=useState(false);
  const[form,setForm]=useState({});
  const[editItem,setEditItem]=useState(null);
  const[extraPayDebt,setExtraPayDebt]=useState(0);
  const[confirm,setConfirm]=useState(null);
  const[syncing,setSyncing]=useState(false);
  const[syncStatus,setSyncStatus]=useState(null);
  const[toast,setToast]=useState(null);
  const showToast=(msg,type='success')=>{setToast({msg,type});const dur=msg.length>40?4000:2500;setTimeout(()=>setToast(null),dur);};

  const[isDemoMode,setIsDemoMode]=useState(()=>{try{return localStorage.getItem("fv_demo")==="1";}catch{return false;}});

  useEffect(()=>{
    (async()=>{
      try{
        // Bulk fetch all keys in one query when logged in (1 read vs 21)
        const BOOT_KEYS=["accounts","income","expenses","bills","debts","bgoals","sgoals","cats","trades","taccount","settings","calColors","notifs","balHist","shifts","prof","profSub","dashConfig","appName","greetName","merchantCats","onboarded","accountRates"];
        const uid_boot=_getUserId();
        let _bulkMap={};
        if(uid_boot){
          try{
            const bulk=await supaFetch(`/rest/v1/user_data?user_id=eq.${uid_boot}&select=key,value`);
            if(Array.isArray(bulk?.data))bulk.data.forEach(r=>{_bulkMap[r.key]=r.value;});
          }catch{}
        }
        async function _sg_boot(bare){
          if(_bulkMap[bare]!==undefined)return _bulkMap[bare];
          return sg("fv6:"+bare);
        }
        const keys=["fv6:accounts","fv6:income","fv6:expenses","fv6:bills","fv6:debts","fv6:bgoals","fv6:sgoals","fv6:cats","fv6:trades","fv6:taccount","fv6:settings","fv6:calColors","fv6:notifs","fv6:balHist","fv6:shifts","fv6:prof","fv6:profSub","fv6:dashConfig","fv6:appName","fv6:greetName","fv6:merchantCats"];
        const vals=await Promise.all(keys.map(k=>_sg_boot(k.replace("fv6:",""))));
        const[ac,inc,exp,bll,dbt,bg,sg2,cats,tr,ta,sett,cc,nts,bh,sh,prof,psub,dc,an,gn,mc]=vals;
        try{if(exp&&exp.length)setExpenses(exp);}catch{}
        try{if(bll&&bll.length)setBills(bll);}catch{}
        try{if(dbt&&dbt.length)setDebts(dbt);}catch{}
        try{if(bg&&bg.length)setBGoals(bg);}catch{}
        try{if(sg2&&sg2.length)setSGoals(sg2);}catch{}
        try{if(cats&&cats.length)setCats(cats);}catch{}
        try{if(tr&&tr.length)setTrades(tr);}catch{}
        try{if(ta)setTradingAccount(ta);}catch{}
        try{if(ac)setAccounts(a=>({checking:"",savings:"",cushion:"",investments:"",k401:"",roth_ira:"",brokerage:"",crypto:"",hsa:"",property:"",vehicles:"",...a,...ac}));}catch{}
        try{if(inc)setIncome(a=>({primary:"",other:"",trading:"",rental:"",dividends:"",freelance:"",payFrequency:"Biweekly",lastPayDate:"",...a,...inc}));}catch{}
        try{if(sett)setSettings(a=>({...a,...sett}));}catch{}
        try{const hh=await sg("fv6:household");if(hh)setHousehold(h=>({...h,...hh}));}catch{}
        try{if(cc)setCalColors(a=>({...a,...cc}));}catch{}
        try{if(nts&&nts.length)setNotifs(nts);}catch{}
        try{if(bh&&bh.length)setBalHist(bh);}catch{}
        try{if(sh&&sh.length)setShifts(sh);}catch{}
        try{if(prof)setProfCategory(prof);}catch{}
        try{if(psub)setProfSub(psub);}catch{}
        try{if(dc)setDashConfig(a=>({...a,...dc}));}catch{}
        try{if(an)setAppName(an);}catch{}
        try{if(gn)setGreetName(gn);}catch{}
        try{if(mc)window._merchantCats=mc;}catch{}
        try{const ar=_bulkMap["accountRates"]||(await sg("fv6:accountRates"));if(ar)setAccountRates(prev=>({...prev,...ar}));}catch{}
        try{const ob=_bulkMap["onboarded"]||(await sg("fv6:onboarded"));if(ob){localStorage.setItem("fv_onboarded","1");setOnboarded(true);}}catch{}
      }catch(e){console.error("Load error",e);}
      setReady(true);
    })();
  },[]);

  useEffect(()=>{if(!ready)return;ss("fv6:accounts",accounts);const tod=todayStr();setBalHist(prev=>{const last=prev[prev.length-1];if(last?.date===tod)return prev;const ds=last?Math.floor((new Date(tod)-new Date(last.date+"T00:00:00"))/86400000):999;if(ds<6)return prev;const _bh={date:tod,checking:parseFloat(accounts.checking||0),savings:parseFloat(accounts.savings||0),cushion:parseFloat(accounts.cushion||0),investments:parseFloat(accounts.investments||0),k401:parseFloat(accounts.k401||0),roth_ira:parseFloat(accounts.roth_ira||0),brokerage:parseFloat(accounts.brokerage||0),crypto:parseFloat(accounts.crypto||0),hsa:parseFloat(accounts.hsa||0)};_bh.total=Object.values(_bh).filter(v=>typeof v==="number").reduce((s,v)=>s+v,0);return[...prev,_bh].slice(-104);});},[accounts,ready]);
  // Batched persistence — grouped by change frequency to reduce effect overhead
  useEffect(()=>{if(!ready)return;ss("fv6:expenses",expenses);},[expenses,ready]);
  useEffect(()=>{if(!ready)return;ss("fv6:bills",bills);},[bills,ready]);
  useEffect(()=>{if(!ready)return;ss("fv6:debts",debts);},[debts,ready]);
  useEffect(()=>{if(!ready)return;ss("fv6:trades",trades);},[trades,ready]);
  useEffect(()=>{if(!ready)return;ss("fv6:notifs",notifs);},[notifs,ready]);
  useEffect(()=>{if(!ready)return;ss("fv6:shifts",shifts);},[shifts,ready]);
  // Settings & config (change infrequently)
  useEffect(()=>{
    if(!ready)return;
    ss("fv6:income",income);ss("fv6:bgoals",budgetGoals);ss("fv6:sgoals",savingsGoals);
    ss("fv6:cats",categories);ss("fv6:settings",settings);
  },[income,budgetGoals,savingsGoals,categories,settings,ready]);
  // Profile & display (change rarely)
  useEffect(()=>{
    if(!ready)return;
    ss("fv6:prof",profCategory);ss("fv6:profSub",profSub);
    ss("fv6:appName",appName);ss("fv6:greetName",greetName);
    ss("fv6:dashConfig",dashConfig);ss("fv6:household",household);
  },[profCategory,profSub,appName,greetName,dashConfig,household,ready]);
  useEffect(()=>{try{localStorage.setItem("fv_account_rates",JSON.stringify(accountRates));}catch{};if(ready)ss("fv6:accountRates",accountRates);},[accountRates,ready]);
  const pushNotif=(id,title,body,type)=>{
    setNotifs(p=>{if(p.find(n=>n.id===id))return p;return[{id,title,body,type,time:Date.now(),read:false},...p.slice(0,49)];});
    // Fire real OS notification if permission granted
    try{
      if(notifSupported()&&notifPermission()==="granted"){
        const icons={"danger":"🚨","warning":"⚠️","success":"✅","info":"💡"};
        new window.Notification(title,{body,icon:"/favicon.svg",badge:"/favicon.svg",tag:id,renotify:false});
      }
    }catch(e){}
  };
  const requestNotifPermission=async()=>{
    if(!notifSupported())return"unsupported";
    if(notifPermission()==="granted")return"granted";
    try{const result=await window.Notification.requestPermission();return result;}catch{return"denied";}
  };
  // Monthly summary: show on first open of new month if last month had data
  useEffect(()=>{
    if(!ready)return;
    const now_ms=new Date();
    const curMonth=now_ms.getFullYear()+"-"+String(now_ms.getMonth()+1).padStart(2,"0");
    const seenKey="fv6:lastSummaryMonth";
    try{
      const seen=localStorage.getItem(seenKey);
      if(seen===curMonth)return;// Already shown this month
      const lastMs=new Date(now_ms.getFullYear(),now_ms.getMonth()-1,1);
      const lastKey=lastMs.getFullYear()+"-"+String(lastMs.getMonth()+1).padStart(2,"0");
      const lastExp=expenses.filter(e=>e.date?.startsWith(lastKey));
      if(lastExp.length<2)return;// Not enough data
      const lastTotal=lastExp.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
      const prevMs=new Date(now_ms.getFullYear(),now_ms.getMonth()-2,1);
      const prevKey=prevMs.getFullYear()+"-"+String(prevMs.getMonth()+1).padStart(2,"0");
      const prevTotal=expenses.filter(e=>e.date?.startsWith(prevKey)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
      const catMap=lastExp.reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount)||0);return a},{});
      const topCat=Object.entries(catMap).sort((a,b)=>b[1]-a[1])[0];
      const lastInc=monthlyIncome;
      const savRate=lastInc>0?Math.max(0,(lastInc-lastTotal)/lastInc*100):0;
      setMonthlySummary({month:FULL_MOS[lastMs.getMonth()],total:lastTotal,prevTotal,topCat:topCat?.[0],topAmt:topCat?.[1],txnCount:lastExp.length,savRate});
      localStorage.setItem(seenKey,curMonth);
    }catch(e){}
  },[ready]);
  useEffect(()=>{if(ready)ss("fv6:calColors",calColors);},[calColors,ready]);
  useEffect(()=>{if(ready)ss("fv6:taccount",tradingAccount);},[tradingAccount,ready]);
  useEffect(()=>{try{localStorage.setItem("fv_dark",darkMode?"1":"0");}catch{}},[darkMode]);

  // paycheckMultiplier converts per-paycheck primary income → monthly
  const paycheckMultiplier=income.payFrequency==="Weekly"?4.33:income.payFrequency==="Twice Monthly"?2:income.payFrequency==="Monthly"?1:2.17;
  // monthlyIncome = what actually comes in per month (all sources)
  const monthlyIncome=useMemo(()=>(parseFloat(income.primary||0)*paycheckMultiplier)+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0)),[income,paycheckMultiplier]);
  // totalIncome = alias for monthlyIncome (keeps all existing references working)
  const totalIncome=monthlyIncome;
  const totalAssets=useMemo(()=>(parseFloat(accounts.checking||0))+(parseFloat(accounts.savings||0))+(parseFloat(accounts.cushion||0))+(parseFloat(accounts.investments||0))+(parseFloat(accounts.k401||0))+(parseFloat(accounts.roth_ira||0))+(parseFloat(accounts.brokerage||0))+(parseFloat(accounts.crypto||0))+(parseFloat(accounts.hsa||0))+(parseFloat(accounts.property||0))+(parseFloat(accounts.vehicles||0))+(parseFloat(tradingAccount.balance||0)),[accounts,tradingAccount]);
  const totalExp=useMemo(()=>expenses.reduce((s,e)=>s+(parseFloat(e.amount)||0),0),[expenses]);
  const totalDebt=useMemo(()=>debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0),[debts]);
  const cashflow=totalIncome-totalExp;
  const netWorth=totalAssets-totalDebt;
  // Net Worth milestone checker — fire when assets cross thresholds
  const NW_MILESTONES=[1000,5000,10000,25000,50000,100000,250000,500000,1000000];
  const prevNWRef=React.useRef(null);
  useEffect(()=>{
    if(!ready)return;
    const nw=totalAssets-totalDebt;
    if(prevNWRef.current===null){prevNWRef.current=nw;return;}
    const prev=prevNWRef.current;
    prevNWRef.current=nw;
    if(nw<=prev)return;// only celebrate growth
    const crossed=NW_MILESTONES.filter(m=>prev<m&&nw>=m);
    crossed.forEach(m=>{
      const label=m>=1000000?"$1M 🦄":m>=500000?"$500K":"$"+m.toLocaleString();
      pushNotif("nw_"+m,"🎉 Net Worth Milestone!","You crossed "+label+" net worth — incredible!","success");
      showToast("🎉 "+label+" net worth milestone!","success");launchConfetti();
    });
  },[totalAssets,totalDebt,ready]);

  const overdue=useMemo(()=>bills.filter(b=>!b.paid&&dueIn(b.dueDate)<0),[bills]);
  const dueSoon=useMemo(()=>bills.filter(b=>!b.paid&&dueIn(b.dueDate)>=0&&dueIn(b.dueDate)<=7),[bills]);
  const billsSoonAmt=useMemo(()=>dueSoon.reduce((s,b)=>s+(parseFloat(b.amount)||0),0),[dueSoon]);
  const burnRate=dayOfMonth()>0?totalExp/dayOfMonth():0;
  const projected=burnRate*daysInMonth();
  // Pay frequency helpers — all plain computed values, no hooks needed
  const payFreq=income.payFrequency||"Biweekly";
  const payPeriodDays=payFreq==="Weekly"?7:payFreq==="Biweekly"?14:payFreq==="Twice Monthly"?15:30;
  // payPerPeriod = what lands in your account each paycheck (primary only)  
  const payPerPeriod=parseFloat(income.primary||0);
  // Next payday — computed once, stable string for comparisons
  const _now=new Date();const _tod=_now.getDate();
  const nextPayDate=(()=>{
    // If user set their last payday date, compute next from that anchor
    if(income.lastPayDate){
      const last=new Date(income.lastPayDate+"T00:00:00");
      const next=new Date(last);
      // Advance by pay period until we're past today
      let safety=0;
      while(next<=_now&&safety<60){
        if(payFreq==="Weekly")next.setDate(next.getDate()+7);
        else if(payFreq==="Twice Monthly"){next.getDate()<15?next.setDate(15):next.setMonth(next.getMonth()+1,1);}
        else if(payFreq==="Monthly")next.setMonth(next.getMonth()+1);
        else next.setDate(next.getDate()+14);
        safety++;
      }
      return next;
    }
    if(payFreq==="Twice Monthly"){return _tod<15?new Date(_now.getFullYear(),_now.getMonth(),15):new Date(_now.getFullYear(),_now.getMonth()+1,1);}
    if(payFreq==="Monthly"){return new Date(_now.getFullYear(),_now.getMonth()+1,1);}
    const d=new Date(_now);d.setDate(_now.getDate()+payPeriodDays);return d;
  })();
  const nextPayStr=nextPayDate.toISOString().split("T")[0];
  const daysUntilNextPay=Math.max(1,Math.ceil((nextPayDate-_now)/86400000));
  // Bills due before next paycheck — simple filter, no hook
  const billsBeforeNextPayAmt=bills.reduce((s,b)=>{if(b.paid)return s;const d=(b.dueDate||"");return d&&d<=nextPayStr?s+(parseFloat(b.amount)||0):s;},0);
  // Projected spend until next pay
  const projectedUntilPay=burnRate*daysUntilNextPay;
  // Budget envelopes: reduce sts by the portion of variable budgets remaining until next pay
  // e.g. if haircut budget is $150/mo and next pay is 7 days away, reserve $35 (7/30 * $150)
  const _envelopeMs=_now.getFullYear()+"-"+String(_now.getMonth()+1).padStart(2,"0");
  const envelopeReserve=budgetGoals.reduce((s,g)=>{
    const limit=parseFloat(g.limit||0);if(!limit)return s;
    // Subtract what's already been spent in this category this month
    const spentCat=expenses.filter(e=>e.category===g.category&&(e.date||"").startsWith(_envelopeMs)).reduce((a,e)=>a+(parseFloat(e.amount)||0),0);
    const remaining=Math.max(0,limit-spentCat);
    // Reserve the proportion of remaining budget that covers days until next pay
    const dayFraction=Math.min(1,daysUntilNextPay/30);
    return s+(remaining*dayFraction);
  },0);
  // Other income arriving before next pay (rental, dividends, freelance pro-rated to pay period)
  const otherMonthly=(parseFloat(income.other||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const otherBeforeNextPay=otherMonthly*(daysUntilNextPay/30);
  // Real safe to spend: what's in checking + other income arriving soon, minus obligations
  const sts=Math.max(0,(parseFloat(accounts.checking||0))+otherBeforeNextPay-billsBeforeNextPayAmt-projectedUntilPay-envelopeReserve-200);
  const liquid=(parseFloat(accounts.savings||0))+(parseFloat(accounts.cushion||0));
  const savingsRate=totalIncome>0?Math.max(0,cashflow/totalIncome*100):0;
  const spendingStreak=useMemo(()=>{
    if(expenses.length<3)return 0;
    const dailyAvgBase=burnRate||50;
    let streak=0;
    const today2=new Date();
    for(let i=0;i<30;i++){
      const d=new Date(today2);d.setDate(d.getDate()-i);
      const ds=d.toISOString().split("T")[0];
      const dayTotal=expenses.filter(e=>e.date===ds).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
      if(i===0&&dayTotal===0){continue;}
      if(dayTotal<dailyAvgBase){streak++;}else{break;}
    }
    return streak;
  },[expenses,burnRate]);
  const unreadNotifs=useMemo(()=>notifs.filter(n=>!n.read).length,[notifs]);

  useEffect(()=>{
    if(!ready)return;
    // Clean up stale bill notifications first — remove any notif for a bill
    // that no longer exists or has been marked as paid
    setNotifs(prev=>{
      const billIds=new Set(bills.filter(b=>!b.paid).map(b=>b.id));
      return prev.filter(n=>{
        if(n.id.startsWith('ov_')||n.id.startsWith('due3_')){
          const billId=n.id.replace('ov_','').replace('due3_','');
          return billIds.has(billId);
        }
        return true; // keep all other notification types
      });
    });
    bills.forEach(b=>{if(b.paid)return;const d=dueIn(b.dueDate);if(d<0)pushNotif('ov_'+b.id,'🚨 Overdue: '+b.name,fmt(b.amount)+' was due '+Math.abs(d)+'d ago','danger');else if(d<=3)pushNotif('due3_'+b.id,'⚠️ Due soon: '+b.name,fmt(b.amount)+' due in '+d+' day'+(d!==1?'s':''),'warning');});
    const _now=new Date();const _ms=_now.getFullYear()+'-'+String(_now.getMonth()+1).padStart(2,'0');
    budgetGoals.forEach(g=>{const spent=expenses.filter(e=>e.category===g.category&&e.date?.startsWith(_ms)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);const pct=parseFloat(g.limit)>0?(spent/parseFloat(g.limit)*100):0;if(pct>=100)pushNotif('bud_over_'+g.id,'🔴 Over budget: '+g.category,'Spent '+fmt(spent)+' of '+fmt(g.limit),'danger');else if(pct>=80)pushNotif('bud_warn_'+g.id,'🟡 '+Math.round(pct)+'% used: '+g.category,fmt(Math.max(0,parseFloat(g.limit)-spent))+' remaining','warning');});
    savingsGoals.forEach(g=>{const pct=parseFloat(g.target||1)>0?(parseFloat(g.saved||0)/parseFloat(g.target))*100:0;if(pct>=100){pushNotif('goal_done_'+g.id,'🎉 Goal complete: '+g.name,'You hit your '+fmt(g.target)+' target!','success');launchConfetti();}else if(pct>=75)pushNotif('goal_75_'+g.id,'🎯 75% reached: '+g.name,fmt(Math.max(0,parseFloat(g.target)-parseFloat(g.saved||0)))+' left to go','info');});
    // Payday reminder: notify when payday is tomorrow or today
    const payReminderKey="payremind_"+nextPayStr;
    const daysUntil=Math.ceil((nextPayDate-new Date())/86400000);
    if(daysUntil<=1&&daysUntil>=0&&parseFloat(income.primary||0)>0){
      pushNotif(payReminderKey,daysUntil===0?"💰 Payday is Today!":"💰 Payday Tomorrow!",
        fmt(parseFloat(income.primary||0))+" expected · "+nextPayDate.toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"}),
        "success");
    }
  },[ready,bills,budgetGoals,expenses]);
  const detectedSubs=useMemo(()=>{
    if(expenses.length<2)return[];
    const nameMap={};
    expenses.forEach(e=>{const key=e.name?.toLowerCase().trim();if(!key)return;if(!nameMap[key])nameMap[key]=[];nameMap[key].push(e);});
    const subs=[];
    Object.entries(nameMap).forEach(([name,exps])=>{
      if(exps.length<2)return;
      const sorted=[...exps].sort((a,b)=>a.date?.localeCompare(b.date));
      const amounts=exps.map(e=>parseFloat(e.amount)||0);
      const avgAmt=amounts.reduce((s,a)=>s+a,0)/amounts.length;
      if(!amounts.every(a=>Math.abs(a-avgAmt)<avgAmt*0.1))return;
      const gaps=[];
      for(let i=1;i<sorted.length;i++){gaps.push(Math.round((new Date(sorted[i].date+"T00:00:00")-new Date(sorted[i-1].date+"T00:00:00"))/(1000*60*60*24)));}
      const avgGap=gaps.reduce((s,g)=>s+g,0)/gaps.length;
      let interval=null;
      if(avgGap>=25&&avgGap<=35){interval="Monthly";}else if(avgGap>=6&&avgGap<=8){interval="Weekly";}else if(avgGap>=350&&avgGap<=380){interval="Annual";}
      if(!interval)return;
      subs.push({name:exps[0].name,amount:avgAmt.toFixed(2),interval,occurrences:exps.length,lastDate:sorted[sorted.length-1].date,category:exps[0].category});
    });
    return subs.sort((a,b)=>parseFloat(b.amount)-parseFloat(a.amount));
  },[expenses]);

  const om=(t,d={})=>{setModal(t);setForm(d);};
  const cl=()=>{setModal(null);setForm({});};
  const ff=(k,v)=>setForm(p=>({...p,[k]:v}));

  // ── THE FIX: submit function ──────────────────────────────────────────────
  function submit(){
    if(modal==="expense"){
      if(!form.name||!form.amount)return;
      const amt=parseFloat(form.amount)||0;
      if(amt<=0){showToast("Enter a valid amount","error");return;}
      const now60=Date.now()-60000;
      const isDupe=expenses.some(e=>e.name?.toLowerCase()===form.name.toLowerCase()&&parseFloat(e.amount)===amt&&e.id>now60);
      if(isDupe&&!form.forceAdd){ff("forceAdd",true);showToast("Already logged — tap again to add anyway","error");return;}
      setExpenses(p=>[...p,{id:Date.now(),name:form.name,amount:String(amt),category:form.category||"Misc",date:form.date||todayStr(),notes:form.notes||"",tags:[],owner:form.owner||"shared"}]);try{const mc=window._merchantCats||{};mc[form.name.toLowerCase().trim()]=form.category||"Misc";window._merchantCats=mc;ss("fv6:merchantCats",mc);}catch{}
      showToast("✓ "+form.name+" — "+fmt(amt));try{navigator.vibrate&&navigator.vibrate(40);}catch{}
      cl();
    }else if(modal==="bill"){
      if(!form.name||!form.amount)return;
      const billAmt=parseFloat(form.amount)||0;
      if(billAmt<=0){showToast("Enter a valid amount","error");return;}
      setBills(p=>[...p,{id:Date.now(),name:form.name,amount:String(billAmt),dueDate:form.dueDate||"",recurring:form.recurring||"Monthly",paid:false,autoPay:false}]);
      showToast("✓ "+form.name+" bill added");try{navigator.vibrate&&navigator.vibrate(40);}catch{}
      cl();
    }else if(modal==="debt"){
      if(!form.name||!form.balance)return;
      setDebts(p=>[...p,{id:Date.now(),name:form.name,balance:form.balance,original:form.original||form.balance,rate:form.rate||"",minPayment:form.minPayment||"",type:form.type||""}]);
      showToast("✓ "+form.name+" tracked — "+fmt(form.balance));
      cl();
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const today=todayStr();
  const unread=unreadNotifs;
  const GROUPS=[
    {key:"money",label:"Money",desc:"Accounts, bills & goals",items:[{id:"accounts",icon:Wallet,label:"Accounts & Income"},{id:"debt",icon:CreditCard,label:"Debt Tracker"},{id:"savings",icon:Target,label:"Savings Goals"},{id:"paycheck",icon:DollarSign,label:"Paycheck Planner"},{id:"household",icon:Wallet,label:"Household / Shared"},{id:"recurring",icon:RefreshCw,label:"Recurring"},{id:"calendar",icon:Calendar,label:"Bill Calendar"}]},
    {key:"analytics",label:"Analytics",desc:"Insights & trends",items:[{id:"insights",icon:BarChart2,label:"Spending Insights 📊"},{id:"health",icon:Activity,label:"Health Score"},{id:"cashflow",icon:BarChart2,label:"Income vs Spending"},{id:"networthtrend",icon:TrendingUp,label:"Net Worth Trend"},{id:"trend",icon:TrendingUp,label:"Balance Trend"},{id:"subscriptions",icon:RefreshCw,label:"Subscriptions"}]},
    {key:"work",label:"Work & Reports",desc:"Shifts, trading & docs",items:[{id:"shifts",icon:Clock,label:"Shift Tracker"},...(settings.showTrading?[{id:"trading",icon:TrendingUp,label:"Trading"}]:[]),{id:"statement",icon:FileText,label:"Monthly Statement"},{id:"tax",icon:FileText,label:"Tax Summary"},{id:"physical",icon:Activity,label:"Financial Physical"}]},
    {key:"tools",label:"Tools",desc:"Search & customize",items:[{id:"search",icon:Search,label:"Search"},{id:"notifs",icon:Bell,label:"Notifications"},{id:"categories",icon:Filter,label:"Categories"},{id:"dashsettings",icon:Settings,label:"Dashboard Layout"},{id:"export",icon:Download,label:"Export Data"},{id:"import",icon:FileText,label:"Import Bank CSV"}]},
  ];
  const allTabIds=GROUPS.flatMap(g=>g.items.map(i=>i.id));
  const isMoreTab=allTabIds.includes(tab);
  // Urgent bill badge — red dot if any overdue or due today
  const billUrgent=bills.filter(b=>!b.paid&&dueIn(b.dueDate)<=1&&dueIn(b.dueDate)>=0).length;
  const billOverdue=bills.filter(b=>!b.paid&&dueIn(b.dueDate)<0).length;
  const billNavBadge=billOverdue>0?billOverdue:billUrgent>0?billUrgent:null;
  const NAV=[
    {id:"home",icon:LayoutDashboard,label:"Home"},
    {id:"spend",icon:Wallet,label:"Spending"},
    {id:"bills",icon:CalendarClock,label:"Bills",badge:billNavBadge},
    {id:"chat",icon:MessageCircle,label:"Log"},
    {id:"more",icon:Menu,label:"More",badge:unread>0?unread:null},
  ];

  async function loadDemo(){
    const d=generateDemoData();
    // Full accounts including all investment + retirement fields
    setAccounts({checking:"4280",savings:"11400",cushion:"1800",investments:"8400",
      k401:"28500",roth_ira:"12000",brokerage:"8400",crypto:"1800",hsa:"3200",
      property:"0",vehicles:"12000"});
    // Income: biweekly RN paycheck + freelance side income
    setIncome({primary:"4200",other:"300",trading:"",rental:"",dividends:"",freelance:"500",
      payFrequency:"Biweekly",lastPayDate:""});
    // Core data
    setExpenses(d.expenses);setBills(d.bills);setDebts(d.debts);setSGoals(d.savingsGoals);
    setBGoals(d.budgetGoals);setTrades(d.trades);setShifts(d.shifts);setBalHist(d.balHist);
    // Profile
    setAppName("Trackfi");setGreetName("Victor");setProfCategory("healthcare");setProfSub("nurse_rn");
    // Trading account
    setTradingAccount({deposit:"5000",balance:"5600"});
    // Merchant category map for AI auto-suggest
    try{window._merchantCats=d.merchantCats;ss("fv6:merchantCats",d.merchantCats);}catch{}
    // Household — demo shows a couple sharing expenses
    setHousehold({enabled:true,name:"Victor & Erin",members:[
      {id:"me",name:"Victor",emoji:"🧑‍💼",color:"#6366F1"},
      {id:"partner",name:"Erin",emoji:"👩",color:"#10B981"}
    ]});
    // Calendar colors
    setCalColors({expense:C.red,bill:C.amber,today:C.accent,dotStyle:"circle"});
    // Dashboard config — show everything
    setDashConfig({showIncomeChart:true,showMetrics:true,showAccounts:true,
      showBills:true,showDebts:true,showGoals:true,showForecast:true,showRecent:true});
    // Settings — enable all features
    setSettings(p=>({...p,showTrading:true,showHealth:true,showSavings:true,showForecast:true,
      quickActions:["expense","bill","paycheck","debt","health","budget","savings","insights"]}));
    try{localStorage.setItem("fv_onboarded","1");localStorage.setItem("fv_demo","1");}catch{}
    ss("fv6:onboarded",true);
    setIsDemoMode(true);setOnboarded(true);
  }
  useEffect(()=>{window._loadDemo=loadDemo;return()=>{delete window._loadDemo;};},[]);

  async function exitDemo(){
    setExpenses([]);setBills([]);setDebts([]);setTrades([]);setShifts([]);
    setSGoals([]);setBGoals([]);setBalHist([]);setNotifs([]);
    setAccounts({checking:"",savings:"",cushion:"",investments:"",k401:"",roth_ira:"",brokerage:"",crypto:"",hsa:"",property:"",vehicles:""});
    setIncome({primary:"",other:"",trading:"",rental:"",dividends:"",freelance:""});
    setTradingAccount({deposit:"",balance:""});setAppName("Trackfi");
    setIsDemoMode(false);try{localStorage.removeItem("fv_demo");}catch{}
    navTo("home");
  }

  if(authLoading)return(<div style={{minHeight:"100vh",background:C.navy,display:"flex",alignItems:"center",justifyContent:"center"}}><style>{CSS}</style><div style={{textAlign:"center"}}><div style={{fontFamily:MF,fontSize:28,fontWeight:900,color:"#fff",marginBottom:8}}>💰 Trackfi</div><div style={{fontSize:13,color:"rgba(255,255,255,.5)"}}>Loading...</div></div></div>);

  // Password reset flow — show set-new-password screen
  if(pwResetMode&&authSession){return(
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg,${C.navy} 0%,#1a2a4a 55%,${C.accent} 100%)`,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <style>{CSS}</style>
      <div style={{background:"rgba(255,255,255,.97)",borderRadius:24,width:"100%",maxWidth:400,padding:"32px 28px",boxShadow:"0 32px 80px rgba(0,0,0,.3)"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:36,marginBottom:8}}>🔐</div>
          <div style={{fontFamily:MF,fontSize:22,fontWeight:900,color:C.navy,marginBottom:4}}>Set New Password</div>
          <div style={{fontSize:13,color:C.textLight}}>Choose something strong</div>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>New Password</div>
          <input type="password" value={newPw} onChange={e=>{setNewPw(e.target.value);setPwMsg("");}} placeholder="Min. 6 characters"
            style={{width:"100%",background:"#f8f9fc",border:`1.5px solid ${C.border}`,borderRadius:12,padding:"12px 14px",fontSize:15,color:C.text,outline:"none",boxSizing:"border-box"}}/>
        </div>
        {pwMsg&&<div style={{background:pwMsg.includes("✓")?C.greenBg:C.redBg,border:`1px solid ${pwMsg.includes("✓")?C.greenMid:C.redMid}`,borderRadius:10,padding:"10px 14px",fontSize:13,color:pwMsg.includes("✓")?C.green:C.red,marginBottom:14}}>{pwMsg}</div>}
        <button onClick={async()=>{
          if(newPw.length<6){setPwMsg("Password must be at least 6 characters.");return;}
          setPwLoading(true);
          try{
            const r=await supaFetch("/auth/v1/user",{method:"PUT",body:JSON.stringify({password:newPw})});
            if(r.error){setPwMsg("Failed — try again.");setPwLoading(false);return;}
            localStorage.removeItem("fv_pw_reset");
            setPwMsg("✓ Password updated! Signing you in...");
            setTimeout(()=>handleAuth(authSession),1200);
          }catch{setPwMsg("Network error — try again.");setPwLoading(false);}
        }} disabled={pwLoading||newPw.length<6}
          style={{width:"100%",padding:"15px",borderRadius:14,border:"none",background:pwLoading||newPw.length<6?C.borderLight:`linear-gradient(135deg,${C.accent},${C.teal})`,color:pwLoading||newPw.length<6?C.textFaint:"#fff",fontFamily:MF,fontWeight:800,fontSize:16,cursor:pwLoading||newPw.length<6?"default":"pointer"}}>
          {pwLoading?"Updating...":"Set New Password →"}
        </button>
      </div>
    </div>
  );}
  if(!authSession&&!skipAuth)return <AuthScreen onAuth={handleAuth} onSkip={handleSkip}/>;
  if(!ready)return(<div style={{minHeight:"100vh",background:`linear-gradient(160deg,${C.navy} 0%,${C.navyMid} 100%)`,display:"flex",alignItems:"center",justifyContent:"center"}}><style>{CSS}</style><div style={{textAlign:"center"}}><div style={{fontFamily:MF,fontSize:28,fontWeight:900,color:"#fff",marginBottom:20}}>💰 Trackfi</div><div style={{width:36,height:36,border:"3px solid rgba(255,255,255,.2)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 14px"}}/><div style={{fontSize:13,color:"rgba(255,255,255,.5)"}}>Loading your data...</div></div></div>);
  if(!onboarded&&ready)return(<><style>{CSS}</style><OnboardingWizard onComplete={async d=>{
    if(d.name)setGreetName(d.name);
    setAppName("Trackfi");
    if(d.profCategory)setProfCategory(d.profCategory);if(d.profSub)setProfSub(d.profSub);
    if(d.income)setIncome({primary:"",other:"",trading:"",rental:"",dividends:"",freelance:"",payFrequency:"Biweekly",lastPayDate:"",...d.income});if(d.accounts)setAccounts({...d.accounts});
    // Apply household mode based on use-case selection
    if(d.useCase==="couple"){setHousehold(h=>({...h,enabled:true,name:(d.name?d.name.split(" ")[0]+"'s Household":"Our Household"),members:[{id:"me",name:d.name?d.name.split(" ")[0]:"Me",emoji:"😊",color:"#6366F1"},{id:"partner",name:"Partner",emoji:"😄",color:"#10B981"}]}));}
    else if(d.useCase==="roommates"){setHousehold(h=>({...h,enabled:true,name:"Shared Household",members:[{id:"me",name:d.name?d.name.split(" ")[0]:"Me",emoji:"😊",color:"#6366F1"},{id:"roommate",name:"Roommate",emoji:"🏠",color:"#D97706"}]}));}
    else if(d.useCase==="family"){setHousehold(h=>({...h,enabled:true,name:(d.name?d.name.split(" ")[0]+"'s Family":"Our Family"),members:[{id:"me",name:d.name?d.name.split(" ")[0]:"Me",emoji:"😊",color:"#6366F1"},{id:"partner",name:"Partner",emoji:"😄",color:"#10B981"}]}));}
    else{setHousehold(h=>({...h,enabled:false}));} // "personal" — ensure household is off

    const hasTrading=parseFloat(d.income?.trading||0)>0;
    setSettings(p=>({...p,showTrading:hasTrading,showHealth:true,showSavings:true,showForecast:true}));
    try{localStorage.setItem("fv_onboarded","1");}catch{}
    ss("fv6:onboarded",true);
    setOnboarded(true);
  }}/></>);
  if(locked&&pinEnabled)return(<><style>{CSS}</style><PINLock onUnlock={()=>setLocked(false)} appName={appName} darkMode={darkMode}/></>);

  return(
    <div style={{minHeight:"100vh",background:darkMode?C.navy:C.bg,fontFamily:IF,display:"flex",flexDirection:"column",maxWidth:640,margin:"0 auto",minHeight:"100vh",position:"relative"}}>
      <style>{CSS}</style>
      <div id="fv-scroll" style={{flex:1,overflowY:"auto",padding:"16px 16px 110px"}}>
        {["spend","home","chat","bills"].includes(tab)&&<button className="ba" onClick={()=>tab==="bills"?om("bill"):om("expense")} style={{position:"fixed",right:16,bottom:90,width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent},${C.purple})`,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 20px ${C.accent}50,0 2px 8px rgba(10,22,40,.15)`,zIndex:50,transition:"transform .2s,box-shadow .2s"}}><Plus size={22} color="#fff"/></button>}
        {canGoBack&&tab!=="home"&&<div style={{marginBottom:12}}><button className="ba" onClick={goBack} style={{display:"flex",alignItems:"center",gap:5,background:"transparent",border:"none",cursor:"pointer",color:C.accent,fontWeight:700,fontSize:16,padding:"4px 0"}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>Back</button></div>}

        {tab==="home"&&(
          <div className="fu">

            {/* ── 1. HEADER ─────────────────────────────────────── */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div>
                <div style={{fontFamily:MF,fontSize:22,fontWeight:800,color:C.text,letterSpacing:-.3}}>
                  {new Date().getHours()<12?"Good morning":new Date().getHours()<17?"Good afternoon":"Good evening"}{greetName?" "+greetName.split(" ")[0]:""} {getProfession(profCategory).icon}
                </div>
                <div style={{fontSize:12,color:C.textLight,marginTop:2}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                {(()=>{
                  const sr2=totalIncome>0?Math.max(0,(totalIncome-totalExp)/totalIncome*100):0;
                  const sc=Math.round(Math.min(10,Math.max(1,((sr2>20?100:sr2>10?75:sr2>5?50:25)*.25+(parseFloat(accounts.savings||0)+parseFloat(accounts.cushion||0))>=(totalExp*3)?100:(parseFloat(accounts.savings||0)+parseFloat(accounts.cushion||0))>=(totalExp)?70:40)*.2+(totalDebt===0?100:Math.max(20,100-Math.round(totalDebt/Math.max(1,totalIncome)*100)))*.2+100*.35)/10));
                  const col=sc>=8?C.green:sc>=6?C.accent:sc>=4?C.amber:C.red;
                  return(<button onClick={()=>navTo("health")} style={{background:col+"18",border:`1px solid ${col}44`,borderRadius:99,padding:"5px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                    <div style={{fontFamily:MF,fontWeight:800,fontSize:12,color:col}}>{sc}/10</div>
                    <div style={{fontSize:10,color:col}}>health</div>
                  </button>);
                })()}
                {syncing&&<div style={{width:7,height:7,borderRadius:"50%",background:C.accent,flexShrink:0,animation:"pulse 1.2s ease-in-out infinite"}} title="Syncing..."/>}
                <button className="ba" onClick={()=>setDarkMode(d=>!d)} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"7px 9px",cursor:"pointer",display:"flex",color:C.textMid}}>{darkMode?<Sun size={15}/>:<Moon size={15}/>}</button>
                <button className="ba" onClick={()=>setHidden(h=>!h)} style={{background:hidden?C.accentBg:C.bg,border:`1px solid ${hidden?C.accentMid:C.border}`,borderRadius:10,padding:"7px 9px",cursor:"pointer",display:"flex",color:hidden?C.accent:C.textMid}}>{hidden?<EyeOff size={15}/>:<Eye size={15}/>}</button>
              </div>
            </div>

            {isDemoMode&&expenses.length>0&&(
              <div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(217,119,6,.1)",border:"1px solid rgba(217,119,6,.25)",borderRadius:99,padding:"4px 10px 4px 8px",marginBottom:10,width:"fit-content"}}>
                <span style={{fontSize:10}}>🧪</span>
                <span style={{fontSize:10,fontWeight:600,color:C.amber,letterSpacing:.1}}>Demo</span>
                <button onClick={()=>setConfirm({title:"Exit Demo",message:"Clear all demo data and start fresh.",onConfirm:()=>{exitDemo();setConfirm(null);},danger:false})}
                  style={{background:"rgba(217,119,6,.15)",border:"none",borderRadius:99,padding:"1px 7px",color:C.amber,fontWeight:700,fontSize:9,cursor:"pointer",lineHeight:1.6}}>
                  Exit
                </button>
              </div>
            )}

            {overdue.length>0&&<div onClick={()=>navTo("bills")} style={{background:C.redBg,border:`1px solid ${C.redMid}`,borderRadius:12,padding:"10px 14px",marginBottom:10,display:"flex",gap:8,alignItems:"center",cursor:"pointer"}}><AlertCircle size={15} color={C.red} style={{flexShrink:0}}/><div style={{flex:1,fontSize:13,color:C.red,fontWeight:600}}>{overdue.length} bill{overdue.length!==1?"s":""} overdue — tap to resolve</div><ChevronRight size={13} color={C.red}/></div>}

            {/* ── 2. CAROUSEL — 4 rich cards ─────────────────────── */}
            {(()=>{
              const now_c=new Date();
              const ms_c=now_c.getFullYear()+"-"+String(now_c.getMonth()+1).padStart(2,"0");
              const lastMs_c=new Date(now_c.getFullYear(),now_c.getMonth()-1,1).getFullYear()+"-"+String(new Date(now_c.getFullYear(),now_c.getMonth()-1,1).getMonth()+1).padStart(2,"0");
              const mtdSpend_c=expenses.filter(e=>e.date?.startsWith(ms_c)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
              const lastSpend_c=expenses.filter(e=>e.date?.startsWith(lastMs_c)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
              const momDiff_c=lastSpend_c>0?((mtdSpend_c-lastSpend_c)/lastSpend_c*100):null;
              const dom_c=now_c.getDate(),dim_c=new Date(now_c.getFullYear(),now_c.getMonth()+1,0).getDate();
              const forecast_c=dom_c>0?mtdSpend_c+(mtdSpend_c/dom_c)*(dim_c-dom_c):0;
              const cats_c=Object.entries(expenses.filter(e=>e.date?.startsWith(ms_c)).reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount)||0);return a},{})).sort((a,b)=>b[1]-a[1]);
              const bars_c=Array.from({length:6},(_,i)=>{const d=new Date(now_c.getFullYear(),now_c.getMonth()-5+i,1);const ms2=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");return{m:FULL_MOS[d.getMonth()].slice(0,3),v:expenses.filter(e=>e.date?.startsWith(ms2)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0),cur:i===5};});
              const maxB_c=Math.max(...bars_c.map(b=>b.v),1);
              const overBudget_c=budgetGoals.filter(g=>{const sp=expenses.filter(e=>e.category===g.category&&e.date?.startsWith(ms_c)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);return sp>parseFloat(g.limit||0);});
              const nw_c=totalAssets-totalDebt;
              const prevNW_c=balHist.length>1?(()=>{const p=balHist[balHist.length-2];return(p.checking||0)+(p.savings||0)+(p.cushion||0)+(p.investments||0)-totalDebt;})():null;
              const nwDelta_c=prevNW_c!==null?nw_c-prevNW_c:null;
              const goalsDone_c=savingsGoals.filter(g=>parseFloat(g.saved||0)>=parseFloat(g.target||1)).length;
              const goalsTotal_c=savingsGoals.reduce((s,g)=>s+(parseFloat(g.target||0)),0);
              const goalsSaved_c=savingsGoals.reduce((s,g)=>s+(parseFloat(g.saved||0)),0);
              const goalsPct_c=goalsTotal_c>0?Math.min(100,(goalsSaved_c/goalsTotal_c)*100):0;
              const debtPct_c=debts.length?Math.min(100,(debts.reduce((s,d)=>s+(parseFloat(d.original||d.balance||0)-parseFloat(d.balance||0)),0)/Math.max(1,debts.reduce((s,d)=>s+(parseFloat(d.original||d.balance||0)),0)))*100):0;

              const CARDS=[
                // ── CARD 1: THIS MONTH ──────────────────────────
                {id:"month",render:()=>(
                  <div onClick={()=>navTo("cashflow")} style={{background:`linear-gradient(135deg,${C.navy},${C.navyLight})`,borderRadius:20,padding:"20px 18px",cursor:"pointer"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                      <div>
                        <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>THIS MONTH</div>
                        <div className={hidden?"blurred":"unblurred"} style={{fontFamily:MF,fontSize:38,fontWeight:900,color:"#fff",lineHeight:1,letterSpacing:-1}}>{fmt(mtdSpend_c)}</div>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4,flexWrap:"wrap"}}><span style={{fontSize:11,color:"rgba(255,255,255,.4)"}}>Day {dom_c}/{dim_c} · est {hidden?"***":fmt(forecast_c)}</span>{momDiff_c!==null&&<span style={{fontSize:11,fontWeight:700,color:momDiff_c<=0?C.greenMid:"#fca5a5",background:"rgba(255,255,255,.08)",borderRadius:99,padding:"1px 7px"}}>{momDiff_c>0?"+":""}{momDiff_c.toFixed(0)}% vs last mo</span>}{overBudget_c.length>0&&<span style={{fontSize:11,fontWeight:700,color:"#fca5a5",background:"rgba(239,68,68,.2)",borderRadius:99,padding:"1px 7px"}}>{overBudget_c.length} over budget</span>}</div>
                      </div>
                      <div style={{background:mtdSpend_c<totalIncome*(dom_c/dim_c)*1.05?C.green+"33":"rgba(239,68,68,.25)",borderRadius:99,padding:"4px 10px"}}>
                        <div style={{fontSize:11,fontWeight:700,color:mtdSpend_c<totalIncome*(dom_c/dim_c)*1.05?C.greenMid:"#fca5a5"}}>{mtdSpend_c<totalIncome*(dom_c/dim_c)*1.05?"✓ On track":"⚠ Over pace"}</div>
                      </div>
                    </div>
                    {totalIncome>0&&<><div style={{height:4,background:"rgba(255,255,255,.1)",borderRadius:99,overflow:"hidden",marginBottom:10}}>
                      <div style={{height:"100%",width:Math.min(100,totalIncome>0?(mtdSpend_c/totalIncome)*100:0).toFixed(1)+"%",background:mtdSpend_c>totalIncome*0.9?C.red:mtdSpend_c>totalIncome*0.7?C.amber:C.green,borderRadius:99}}/>
                    </div></>}
                    {bars_c.some(b=>b.v>0)&&<div style={{display:"flex",gap:3,alignItems:"flex-end",height:36,marginBottom:12}}>
                      {bars_c.map((b,i)=>{const h=Math.max(3,Math.round((b.v/maxB_c)*32));return(
                        <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                          <div style={{width:"100%",height:h,background:b.cur?"#fff":"rgba(255,255,255,.2)",borderRadius:"2px 2px 0 0"}}/>
                          <div style={{fontSize:8,color:b.cur?"rgba(255,255,255,.9)":"rgba(255,255,255,.3)",fontWeight:b.cur?700:400}}>{b.m}</div>
                        </div>
                      );})}
                    </div>}
                    <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
                      {savingsRate>0&&<div style={{background:savingsRate>=20?"rgba(52,211,153,.2)":"rgba(255,255,255,.08)",borderRadius:8,padding:"4px 9px",display:"flex",gap:4,alignItems:"center"}}>
                        <span style={{fontSize:11,color:savingsRate>=20?C.greenMid:"rgba(255,255,255,.5)"}}>💾 {savingsRate.toFixed(0)}% saved</span>
                      </div>}
                      {cats_c.slice(0,2).map(([cat,amt],i)=><div key={cat} style={{background:"rgba(255,255,255,.1)",borderRadius:8,padding:"4px 9px",display:"flex",gap:5,alignItems:"center"}}>
                        <div style={{width:6,height:6,borderRadius:"50%",background:PIE_COLORS[i]}}/>
                        <span style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>{cat}</span>
                        <span className={hidden?"blurred":"unblurred"} style={{fontSize:11,fontFamily:MF,fontWeight:700,color:"#fff"}}>{fmt(amt)}</span>
                      </div>)}
                    </div>
                  </div>
                )},
                // ── CARD 2: NET WORTH ────────────────────────────
                {id:"networth",render:()=>(
                  <div onClick={()=>navTo("networthtrend")} style={{background:`linear-gradient(135deg,${C.navy},${C.navyLight})`,borderRadius:20,padding:"20px 18px",cursor:"pointer"}}>
                    <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>NET WORTH</div>
                    <div className={hidden?"blurred":"unblurred"} style={{fontFamily:MF,fontSize:38,fontWeight:900,color:nw_c>=0?C.greenMid:"#fca5a5",lineHeight:1,letterSpacing:-1,marginBottom:4}}>{fmt(nw_c)}</div>
                    {nwDelta_c!==null&&<div style={{fontSize:12,fontWeight:700,color:nwDelta_c>=0?C.greenMid:"#fca5a5",marginBottom:14}}>{nwDelta_c>=0?"▲":"▼"} {hidden?"***":fmt(Math.abs(nwDelta_c))} since last snapshot</div>}
                    {!nwDelta_c&&<div style={{marginBottom:14}}/>}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                      {[["Assets",fmt(totalAssets),C.greenMid],["Debts",fmt(totalDebt),"#fca5a5"],["Liquid",fmt((parseFloat(accounts.checking||0))+(parseFloat(accounts.savings||0))+(parseFloat(accounts.cushion||0))),C.accentMid],["Retirement",fmt((parseFloat(accounts.k401||0))+(parseFloat(accounts.roth_ira||0))+(parseFloat(accounts.hsa||0))),C.teal]].map(([l,v,c])=>(
                        <div key={l} style={{background:"rgba(255,255,255,.07)",borderRadius:10,padding:"8px 10px"}}>
                          <div style={{fontSize:9,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2}}>{l}</div>
                          <div className={hidden?"blurred":"unblurred"} style={{fontFamily:MF,fontWeight:700,fontSize:13,color:c}}>{v}</div>
                        </div>
                      ))}
                    </div>
                    {balHist.length>3&&(()=>{const last6=balHist.slice(-6);const maxV=Math.max(...last6.map(h=>(h.checking||0)+(h.savings||0)+(h.cushion||0)+(h.investments||0)+(h.k401||0)+(h.roth_ira||0)+(h.brokerage||0)+(h.crypto||0)),1);return(<div style={{display:"flex",gap:3,alignItems:"flex-end",height:28}}>
                      {last6.map((h,i)=>{const v=(h.checking||0)+(h.savings||0)+(h.cushion||0)+(h.investments||0)+(h.k401||0)+(h.roth_ira||0)+(h.brokerage||0)+(h.crypto||0);const hh=Math.max(3,Math.round((v/maxV)*24));const isLast=i===last6.length-1;return(<div key={i} style={{flex:1,height:hh,background:isLast?"#fff":"rgba(255,255,255,.25)",borderRadius:"2px 2px 0 0"}}/>);})}
                    </div>);})()}
                  </div>
                )},
                // ── CARD 3: MONEY FLOW ───────────────────────────
                {id:"flow",render:()=>(
                  <div onClick={()=>navTo("paycheck")} style={{background:`linear-gradient(135deg,${C.navy},${C.navyLight})`,borderRadius:20,padding:"20px 18px",cursor:"pointer"}}>
                    <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>MONEY FLOW</div>
                    <div className={hidden?"blurred":"unblurred"} style={{fontFamily:MF,fontSize:38,fontWeight:900,color:cashflow>=0?C.greenMid:"#fca5a5",lineHeight:1,letterSpacing:-1,marginBottom:4}}>{cashflow>=0?"+":""}{fmt(cashflow)}</div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,.5)",marginBottom:14}}>{payFreq==="Biweekly"?"biweekly":"per "+payFreq.toLowerCase()} paycheck · {savingsRate.toFixed(1)}% saved</div>
                    {[["Income/pay",fmt(payPerPeriod),C.greenMid,100],["Expenses",fmt(burnRate*30),C.redMid,totalIncome>0?Math.min(100,(burnRate*30/totalIncome)*100):0],["Bills",fmt(bills.reduce((s,b)=>s+(parseFloat(b.amount)||0),0)),"rgba(255,255,255,.6)",totalIncome>0?Math.min(100,(bills.reduce((s,b)=>s+(parseFloat(b.amount)||0),0)/totalIncome)*100):0],["Debt Min",fmt(debts.reduce((s,d)=>s+(parseFloat(d.minPayment)||0),0)),"rgba(255,255,255,.4)",totalIncome>0?Math.min(100,(debts.reduce((s,d)=>s+(parseFloat(d.minPayment)||0),0)/totalIncome)*100):0]].map(([l,v,c,pct])=>(
                      <div key={l} style={{marginBottom:7}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                          <span style={{fontSize:11,color:"rgba(255,255,255,.6)"}}>{l}</span>
                          <span className={hidden?"blurred":"unblurred"} style={{fontSize:11,fontFamily:MF,fontWeight:700,color:c}}>{v}</span>
                        </div>
                        <div style={{height:3,background:"rgba(255,255,255,.1)",borderRadius:99}}><div style={{height:"100%",width:pct.toFixed(1)+"%",background:c,borderRadius:99}}/></div>
                      </div>
                    ))}
                  </div>
                )},
                // ── CARD 4: GOALS & DEBT ─────────────────────────
                {id:"goals",render:()=>(
                  <div style={{background:`linear-gradient(135deg,${C.navy},${C.navyLight})`,borderRadius:20,padding:"20px 18px"}}>
                    <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:1,marginBottom:14}}>GOALS & DEBT</div>
                    {savingsGoals.length>0&&<div style={{marginBottom:16}} onClick={()=>navTo("savings")}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
                        <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,.8)"}}>Savings Goals</div>
                        <div className={hidden?"blurred":"unblurred"} style={{fontSize:12,color:C.greenMid,fontWeight:700}}>{goalsDone_c}/{savingsGoals.length} done</div>
                      </div>
                      <div style={{height:6,background:"rgba(255,255,255,.1)",borderRadius:99,overflow:"hidden",marginBottom:4}}>
                        <div style={{height:"100%",width:goalsPct_c.toFixed(1)+"%",background:`linear-gradient(90deg,${C.teal},${C.green})`,borderRadius:99}}/>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between"}}>
                        <div className={hidden?"blurred":"unblurred"} style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>{fmt(goalsSaved_c)} saved</div>
                        <div className={hidden?"blurred":"unblurred"} style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>{fmt(goalsTotal_c)} total</div>
                      </div>
                    </div>}
                    {debts.length>0&&<div onClick={()=>navTo("debt")}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
                        <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,.8)"}}>Debt Payoff</div>
                        <div className={hidden?"blurred":"unblurred"} style={{fontSize:12,color:"#fca5a5",fontWeight:700}}>{fmt(totalDebt)} left</div>
                      </div>
                      <div style={{height:6,background:"rgba(255,255,255,.1)",borderRadius:99,overflow:"hidden",marginBottom:4}}>
                        <div style={{height:"100%",width:debtPct_c.toFixed(1)+"%",background:`linear-gradient(90deg,${C.amber},${C.green})`,borderRadius:99}}/>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between"}}>
                        <div className={hidden?"blurred":"unblurred"} style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>{debtPct_c.toFixed(0)}% paid off</div>
                        <div style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>{fmt(debts.reduce((s,d)=>s+(parseFloat(d.minPayment)||0),0))}/mo min</div>
                      </div>
                    </div>}
                    {savingsGoals.length===0&&debts.length===0&&<div style={{textAlign:"center",padding:"20px 0"}}>
                      <div style={{fontSize:13,color:"rgba(255,255,255,.4)",marginBottom:12}}>No goals or debts tracked yet</div>
                      <button onClick={()=>navTo("savings")} style={{background:"rgba(255,255,255,.1)",border:"none",borderRadius:10,padding:"8px 16px",color:"rgba(255,255,255,.7)",fontSize:12,fontWeight:600,cursor:"pointer"}}>Add a Goal →</button>
                    </div>}
                  </div>
                )},
              ];

              const goNext=()=>setHeroIdx(i=>(i+1)%CARDS.length);
              const goPrev=()=>setHeroIdx(i=>(i-1+CARDS.length)%CARDS.length);

              return(
                <div style={{marginBottom:14}}>
                  <div style={{position:"relative"}}>
                    <div
                      onTouchStart={e=>{window._hts=e.touches[0].clientX;window._htsy=e.touches[0].clientY;}}
                      onTouchEnd={e=>{const dx=window._hts-(e.changedTouches[0].clientX||0);const dy=Math.abs((window._htsy||0)-e.changedTouches[0].clientY);if(dy>30)return;if(dx>40)goNext();else if(dx<-40)goPrev();}}>
                      {CARDS[heroIdx].render()}
                    </div>
                    <button onClick={e=>{e.stopPropagation();goPrev();}} style={{position:"absolute",left:-8,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,.15)",border:"none",borderRadius:"50%",width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff",zIndex:10}}>‹</button>
                    <button onClick={e=>{e.stopPropagation();goNext();}} style={{position:"absolute",right:-8,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,.15)",border:"none",borderRadius:"50%",width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff",zIndex:10}}>›</button>
                  </div>
                  <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:6,marginTop:10}}>
                    {CARDS.map((card,i)=><button key={i} onClick={()=>setHeroIdx(i)} style={{background:"none",border:"none",cursor:"pointer",padding:"2px 0",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                      <div style={{width:i===heroIdx?20:6,height:6,borderRadius:99,background:i===heroIdx?C.accent:C.border,transition:"all .3s"}}/>
                      {i===heroIdx&&<div style={{fontSize:9,color:C.accent,fontWeight:700,letterSpacing:.5,textTransform:"uppercase"}}>{card.id==="month"?"This Month":card.id==="networth"?"Net Worth":card.id==="flow"?"Cash Flow":"Goals"}</div>}
                    </button>)}
                  </div>
                </div>
              );
            })()}

            {/* ── 3. QUICK PULSE — 4 stats at a glance ──────────── */}
            {(()=>{
              const now_p=new Date();
              const ms_p=now_p.getFullYear()+"-"+String(now_p.getMonth()+1).padStart(2,"0");
              const mtd_p=expenses.filter(e=>e.date?.startsWith(ms_p)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
              const todayAmt=expenses.filter(e=>e.date===now_p.toISOString().split("T")[0]).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
              const nextBill=bills.filter(b=>!b.paid&&dueIn(b.dueDate)>=0).sort((a,b2)=>dueIn(a.dueDate)-dueIn(b2.dueDate))[0];
              const subCount=detectedSubs?.filter(s=>s.interval==="Monthly").length||0;
              const subTotal=detectedSubs?.filter(s=>s.interval==="Monthly").reduce((s,x)=>s+(parseFloat(x.amount)||0),0)||0;
              const pulseItems=[
                {label:"Today",val:todayAmt>0?fmt(todayAmt):"—",color:todayAmt>0?C.red:C.textFaint,sub:todayAmt>0?expenses.filter(e=>e.date===now_p.toISOString().split("T")[0]).length+" items":"nothing yet",tap:()=>navTo("calendar")},
                {label:"Safe to Spend",val:fmt(sts),color:sts>500?C.green:sts>0?C.amber:C.red,sub:"until next pay",tap:()=>navTo("paycheck")},
                {label:"Next Bill",val:nextBill?fmt(nextBill.amount):"—",color:nextBill&&dueIn(nextBill.dueDate)<=3?C.red:C.amber,sub:nextBill?nextBill.name+" · "+dueIn(nextBill.dueDate)+"d":"all clear",tap:()=>navTo("bills")},
                {label:"Subscriptions",val:subCount>0?fmt(subTotal)+"/mo":"—",color:C.textMid,sub:subCount>0?subCount+" detected":"none found",tap:()=>navTo("subscriptions")},
              ];
              return(<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:14}}>
                {pulseItems.map(p=>(
                  <div key={p.label} onClick={p.tap} style={{background:C.surface,borderRadius:12,padding:"10px 6px",textAlign:"center",cursor:"pointer",boxShadow:"0 1px 3px rgba(10,22,40,.05)"}}>
                    <div className={hidden?"blurred":"unblurred"} style={{fontFamily:MF,fontWeight:800,fontSize:13,color:p.color,lineHeight:1.1,marginBottom:3}}>{p.val}</div>
                    <div style={{fontSize:9,color:C.textLight,fontWeight:600,textTransform:"uppercase",letterSpacing:.3,marginBottom:2}}>{p.label}</div>
                    <div style={{fontSize:9,color:C.textFaint,lineHeight:1.3}}>{p.sub}</div>
                  </div>
                ))}
              </div>);
            })()}

            {/* PWA Install Banner */}
            {pwaPrompt&&!pwaInstalled&&(
              <div style={{background:`linear-gradient(135deg,${C.accent},${C.purple})`,borderRadius:16,padding:"14px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:24,flexShrink:0}}>📲</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:2}}>Add to Home Screen</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>Install Trackfi for offline access & faster loading</div>
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button onClick={async()=>{pwaPrompt.prompt();const r=await pwaPrompt.userChoice;if(r.outcome==="accepted"){setPwaInstalled(true);localStorage.setItem("fv_pwa_dismissed","1");}setPwaPrompt(null);}} style={{background:"rgba(255,255,255,.25)",border:"none",borderRadius:8,padding:"6px 12px",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}}>Install</button>
                  <button onClick={()=>{setPwaPrompt(null);localStorage.setItem("fv_pwa_dismissed","1");setPwaInstalled(true);}} style={{background:"transparent",border:"1px solid rgba(255,255,255,.3)",borderRadius:8,padding:"6px 8px",color:"rgba(255,255,255,.7)",cursor:"pointer",fontSize:11}}>✕</button>
                </div>
              </div>
            )}
            {/* ── 4. INSIGHT TICKER ─────────────────────────────── */}
            {expenses.length>0&&(()=>{
              const now2=new Date();
              const thisMs=now2.getFullYear()+"-"+String(now2.getMonth()+1).padStart(2,"0");
              const lastMs=new Date(now2.getFullYear(),now2.getMonth()-1,1).getFullYear()+"-"+String(new Date(now2.getFullYear(),now2.getMonth()-1,1).getMonth()+1).padStart(2,"0");
              const thisE=expenses.filter(e=>e.date?.startsWith(thisMs)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
              const lastE=expenses.filter(e=>e.date?.startsWith(lastMs)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
              const topCat=Object.entries(expenses.filter(e=>e.date?.startsWith(thisMs)).reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount)||0);return a},{})).sort((a,b)=>b[1]-a[1])[0];
              const nextBill=bills.filter(b=>!b.paid&&dueIn(b.dueDate)>=0).sort((a,b)=>dueIn(a.dueDate)-dueIn(b.dueDate))[0];
              const diff=lastE>0?((thisE-lastE)/lastE*100):0;
              const insights=[
                thisE>0&&lastE>0&&`Spending ${Math.abs(diff).toFixed(0)}% ${diff>0?"more":"less"} than last month`,
                topCat&&`Biggest category: ${topCat[0]} at ${fmt(topCat[1])}`,
                nextBill&&`Next bill: ${nextBill.name} ${fmt(nextBill.amount)} in ${dueIn(nextBill.dueDate)}d`,
                savingsRate>0&&`Saving ${savingsRate.toFixed(1)}% of income — ${savingsRate>=20?"great":"keep going"}`,
                totalDebt>0&&`${fmt(debts.reduce((s,d)=>s+(parseFloat(d.balance||0)*(parseFloat(d.rate||0)/100/12)),0))}/mo in interest costs`,
                overdue.length>0&&`⚠ ${overdue.length} bill${overdue.length!==1?"s":""} overdue — take action now`,
                spendingStreak>2&&`🔥 ${spendingStreak}-day spending streak — below your daily average`,
                savingsGoals.length>0&&`${savingsGoals.filter(g=>parseFloat(g.saved||0)>=parseFloat(g.target||1)).length}/${savingsGoals.length} savings goals complete`,
              ].filter(Boolean);
              if(!insights.length)return null;
              const insight=insights[now2.getDate()%insights.length];
              return(<div onClick={()=>navTo("insights")} style={{background:`linear-gradient(135deg,${C.accentBg},${C.purpleBg})`,border:`1px solid ${C.accentMid}`,borderRadius:14,padding:"12px 14px",marginBottom:14,cursor:"pointer",display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:18,flexShrink:0}}>💡</span><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}><div style={{fontSize:10,fontWeight:700,color:C.accent,textTransform:"uppercase",letterSpacing:.5}}>Spending Insight</div><div style={{fontSize:10,fontWeight:700,color:C.accent,background:C.accent+"18",borderRadius:99,padding:"1px 7px"}}>View Charts →</div></div><div style={{fontSize:13,color:C.text,lineHeight:1.4,fontWeight:500}}>{insight}</div></div></div>);
            })()}

            {/* ── 5. QUICK ACTIONS ──────────────────────────────── */}
            {(()=>{
              const ALL_QA=[
                {id:"expense",l:"Log Expense",ic:"💸",a:()=>om("expense"),bg:C.accentBg,c:C.accent},
                {id:"receipt",l:"Scan Receipt",ic:"📷",a:()=>om("receipt"),bg:C.purpleBg,c:C.purple},
                {id:"bill",l:"Add Bill",ic:"📅",a:()=>om("bill"),bg:C.amberBg,c:C.amber},
                {id:"debt",l:"Add Debt",ic:"💳",a:()=>om("debt"),bg:C.redBg,c:C.red},
                {id:"simulator",l:"Payoff Sim",ic:"🧮",a:()=>debts.length?setModal("simulator"):om("debt"),bg:C.greenBg,c:C.green},
                {id:"budget",l:"Envelopes",ic:"📦",a:()=>om("bgoal_home"),bg:C.purpleBg,c:C.purple},
                {id:"shift",l:"Log Shift",ic:"🏥",a:()=>navTo("shifts"),bg:C.accentBg,c:C.accent},
                {id:"trade",l:"Log Trade",ic:"📈",a:()=>navTo("trading"),bg:C.greenBg,c:C.green},
                {id:"savings",l:"Add Goal",ic:"🎯",a:()=>navTo("savings"),bg:C.amberBg,c:C.amber},
                {id:"insights",l:"Insights",ic:"📊",a:()=>navTo("insights"),bg:C.purpleBg,c:C.purple},
                {id:"paycheck",l:"Paycheck",ic:"💰",a:()=>navTo("paycheck"),bg:C.greenBg,c:C.green},
                {id:"health",l:"Health Score",ic:"❤️",a:()=>navTo("health"),bg:C.redBg,c:C.red},
                {id:"bills_nav",l:"View Bills",ic:"📅",a:()=>navTo("bills"),bg:C.amberBg,c:C.amber},
                {id:"recurring_nav",l:"Recurring",ic:"🔄",a:()=>navTo("recurring"),bg:C.accentBg,c:C.accent},
                {id:"networth",l:"Net Worth",ic:"📈",a:()=>navTo("networthtrend"),bg:C.greenBg,c:C.green},
                {id:"calendar_nav",l:"Calendar",ic:"📅",a:()=>navTo("calendar"),bg:C.amberBg,c:C.amber},
              ];
              const activeIds=settings.quickActions||["expense","bill","paycheck","debt","health","budget","savings","insights"];
              const active=ALL_QA.filter(q=>activeIds.includes(q.id));
              const urgentBillsQA=bills.filter(b=>!b.paid&&dueIn(b.dueDate)<=3&&dueIn(b.dueDate)>=0);
              const overdueQA=bills.filter(b=>!b.paid&&dueIn(b.dueDate)<0);
              return(
                <div style={{marginBottom:14}}>
                  {/* Urgency strip */}
                  {(overdueQA.length>0||urgentBillsQA.length>0)&&(
                    <div onClick={()=>navTo("bills")} style={{background:overdueQA.length>0?C.redBg:C.amberBg,border:`1px solid ${overdueQA.length>0?C.redMid:C.amberMid}`,borderRadius:12,padding:"10px 14px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
                      <div style={{fontSize:13,fontWeight:700,color:overdueQA.length>0?C.red:C.amber}}>
                        {overdueQA.length>0?`⚠️ ${overdueQA.length} bill${overdueQA.length>1?"s":""} overdue — tap to pay`:`📅 ${urgentBillsQA.length} bill${urgentBillsQA.length>1?"s":""} due in 3 days`}
                      </div>
                      <div style={{fontSize:13,fontWeight:800,color:overdueQA.length>0?C.red:C.amber}}>
                        {fmt(overdueQA.length>0?overdueQA.reduce((s,b)=>s+(parseFloat(b.amount)||0),0):urgentBillsQA.reduce((s,b)=>s+(parseFloat(b.amount)||0),0))} →
                      </div>
                    </div>
                  )}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Quick Actions</div>
                    <button onClick={()=>setModal("quickactions")} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:C.textLight,fontWeight:600,display:"flex",alignItems:"center",gap:4}}><Settings size={12}/>Edit</button>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                    {active.slice(0,8).map(q=>(<button key={q.id} onClick={q.a} style={{background:q.bg,borderRadius:14,padding:"14px 6px 12px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:7,border:"none",boxShadow:"0 1px 3px rgba(10,22,40,.06)",transition:"transform .1s,box-shadow .1s"}}><span style={{fontSize:22}}>{q.ic}</span><span style={{fontSize:10,fontWeight:700,color:q.c,lineHeight:1.3,textAlign:"center"}}>{q.l}</span></button>))}
                  </div>
                </div>
              );
            })()}

            {/* ── 6. UPCOMING BILLS ─────────────────────────────── */}
            {/* ── HOUSEHOLD SPLIT CARD — visible when enabled ─── */}
            {/* Month Forecast */}
            {(()=>{
              const _now=new Date();const _ms=_now.getFullYear()+"-"+String(_now.getMonth()+1).padStart(2,"0");
              const _dom=_now.getDate(),_dim=new Date(_now.getFullYear(),_now.getMonth()+1,0).getDate();
              const _mtd=expenses.filter(e=>e.date?.startsWith(_ms)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
              const _proj=_dom>2?(_mtd/_dom)*_dim:0;
              if(_mtd===0||_dom<3)return null;
              const _onTrack=totalIncome<=0||_proj<=totalIncome;
              const _pct=totalIncome>0?Math.min(100,(_mtd/totalIncome)*100):0;
              const _projPct=totalIncome>0?Math.min(100,(_proj/totalIncome)*100):0;
              return(
                <div style={{background:C.surface,borderRadius:16,padding:"14px 16px",marginBottom:14,boxShadow:"0 1px 3px rgba(10,22,40,.06)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div>
                      <div style={{fontSize:10,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:2}}>Month Forecast</div>
                      <div style={{fontFamily:MF,fontWeight:800,fontSize:17,color:_onTrack?C.text:C.red}}>{fmt(_proj)} projected</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:11,fontWeight:700,color:_onTrack?C.green:C.red}}>{_onTrack?"On track ✓":"Over budget"}</div>
                      <div style={{fontFamily:MF,fontWeight:700,fontSize:12,color:_onTrack?C.green:C.red,marginTop:1}}>{_onTrack&&totalIncome>0?fmt(totalIncome-_proj)+" left":!_onTrack?"+"+fmt(_proj-totalIncome):" "}</div>
                    </div>
                  </div>
                  <div style={{position:"relative",height:5,background:C.borderLight,borderRadius:99,overflow:"hidden",marginBottom:4}}>
                    <div style={{position:"absolute",left:0,top:0,height:"100%",width:_pct.toFixed(1)+"%",background:_onTrack?C.accent:C.red,borderRadius:99}}/>
                    {_proj>_mtd&&<div style={{position:"absolute",left:_pct.toFixed(1)+"%",top:0,height:"100%",width:Math.min(_projPct-_pct,100-_pct).toFixed(1)+"%",background:_onTrack?"rgba(99,102,241,.2)":"rgba(220,38,38,.2)"}}/>}
                  </div>
                  <div style={{fontSize:10,color:C.textFaint}}>{fmt(_mtd)} spent · day {_dom} of {_dim}{totalIncome>0?" · "+fmt(totalIncome)+" income":""}</div>
                </div>
              );
            })()}
            {household?.enabled&&household?.members?.length>1&&(()=>{
              const ms_hh=new Date().getFullYear()+"-"+String(new Date().getMonth()+1).padStart(2,"0");
              const thisM=expenses.filter(e=>e.date?.startsWith(ms_hh));
              const totalShared=thisM.filter(e=>e.owner==="shared").reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
              const splitEach=household.members.length>0?totalShared/household.members.length:0;
              const memberSpend=household.members.map(m=>({
                ...m,
                paid:thisM.filter(e=>e.owner===m.id||(m.id==="me"&&!e.owner)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0)
              }));
              const totalAll=thisM.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
              return(
                <div onClick={()=>navTo("household")} style={{background:C.surface,borderRadius:16,padding:"14px 16px",marginBottom:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",cursor:"pointer"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>{household.name||"Household"}</div>
                    <div style={{fontSize:11,color:C.accent,fontWeight:600}}>View split →</div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    {memberSpend.map(m=>{
                      const owes=splitEach-m.paid;
                      return(
                        <div key={m.id} style={{flex:1,background:C.surfaceAlt,borderRadius:10,padding:"9px 10px",textAlign:"center"}}>
                          <div style={{fontSize:16,marginBottom:3}}>{m.emoji}</div>
                          <div style={{fontSize:11,fontWeight:700,color:C.text,marginBottom:1}}>{m.name}</div>
                          <div style={{fontFamily:MF,fontWeight:800,fontSize:13,color:C.red,marginBottom:2}}>{fmt(m.paid)}</div>
                          {Math.abs(owes)>1&&<div style={{fontSize:10,fontWeight:700,color:owes>0?C.red:C.green,background:owes>0?C.redBg:C.greenBg,borderRadius:99,padding:"2px 6px",display:"inline-block"}}>{owes>0?"owes "+fmt(owes):"+ "+fmt(-owes)}</div>}
                        </div>
                      );
                    })}
                    <div style={{flex:1,background:C.accentBg,borderRadius:10,padding:"9px 10px",textAlign:"center"}}>
                      <div style={{fontSize:16,marginBottom:3}}>📊</div>
                      <div style={{fontSize:11,fontWeight:700,color:C.accent,marginBottom:1}}>Total</div>
                      <div style={{fontFamily:MF,fontWeight:800,fontSize:13,color:C.accent}}>{fmt(totalAll)}</div>
                      {totalShared>0&&<div style={{fontSize:10,color:C.accent,opacity:.7}}>{fmt(splitEach)}/ea shared</div>}
                    </div>
                  </div>
                </div>
              );
            })()}

            {bills.filter(b=>!b.paid).length>0&&<div style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Upcoming Bills</div>
                <button onClick={()=>navTo("bills")} style={{fontSize:12,color:C.accent,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>See all</button>
              </div>
              <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
                {bills.filter(b=>!b.paid).sort((a,b2)=>new Date(a.dueDate)-new Date(b2.dueDate)).slice(0,6).map(b=>{
                  const d=dueIn(b.dueDate);
                  const col=d<0?C.red:d<=3?C.red:d<=7?C.amber:C.textMid;
                  const bg2=d<0?C.redBg:d<=7?C.amberBg:C.surface;
                  const br=d<0?C.redMid:d<=7?C.amberMid:C.border;
                  return(<div key={b.id} onClick={()=>navTo("bills")} style={{background:bg2,border:`1px solid ${br}`,borderRadius:12,padding:"10px 12px",flexShrink:0,cursor:"pointer",minWidth:100}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.text,marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:90}}>{b.name}</div>
                    <div className={hidden?"blurred":"unblurred"} style={{fontFamily:MF,fontWeight:800,fontSize:14,color:col,marginBottom:2}}>{fmt(b.amount)}</div>
                    <div style={{fontSize:10,color:col,fontWeight:600,marginBottom:3}}>{d<0?Math.abs(d)+"d late":d===0?"Today":d+"d left"}</div>
                    {totalIncome>0&&<div style={{height:2,background:"rgba(0,0,0,.06)",borderRadius:99,width:"100%"}}><div style={{height:"100%",width:Math.min(100,(parseFloat(b.amount)/totalIncome)*100).toFixed(1)+"%",background:col,borderRadius:99,opacity:.6}}/></div>}
                  </div>);
                })}
              </div>
            </div>}

            {/* ── 7. DEMO CARD (no data) ─────────────────────────── */}
            {expenses.length===0&&<div style={{background:`linear-gradient(135deg,${C.navy} 0%,${C.accent} 100%)`,borderRadius:18,padding:24,marginBottom:14,textAlign:"center"}}>
              <div style={{fontSize:32,marginBottom:10}}>🧪</div>
              <div style={{fontFamily:MF,fontWeight:800,fontSize:18,color:"#fff",marginBottom:6}}>See it in action</div>
              <div style={{fontSize:13,color:"rgba(255,255,255,.8)",marginBottom:18}}>Load a year of realistic data to explore every feature</div>
              <button onClick={()=>setConfirm({title:"Load Demo Data",message:"Replace current data with 1 year of sample data?",onConfirm:()=>{loadDemo();setConfirm(null);},danger:false})} style={{background:"#fff",border:"none",borderRadius:12,padding:"12px 28px",color:C.accent,fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:MF}}>Load Demo Data</button>
            </div>}

            {/* ── 8. RECENT TRANSACTIONS ────────────────────────── */}
            {expenses.length>0&&<div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Recent</div>
                <button onClick={()=>navTo("spend")} style={{fontSize:12,color:C.accent,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>See all</button>
              </div>
              {(()=>{const days=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);const ds=d.toISOString().split("T")[0];const amt=expenses.filter(e=>e.date===ds).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);return{d:ds,amt,day:["Su","Mo","Tu","We","Th","Fr","Sa"][d.getDay()]};});const mx=Math.max(...days.map(d=>d.amt))||1;const today3=new Date().toISOString().split("T")[0];return(<div style={{display:"flex",gap:3,alignItems:"flex-end",height:28,marginBottom:12}}>{days.map(({d,amt,day})=>{const h=Math.max(3,Math.round((amt/mx)*24));const isToday=d===today3;return(<div key={d} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}><div style={{width:"100%",height:h,background:isToday?C.accent:amt>0?C.accentBg:C.borderLight,borderRadius:"2px 2px 0 0"}}/><div style={{fontSize:8,color:isToday?C.accent:C.textFaint,fontWeight:isToday?700:400}}>{day}</div></div>);})}</div>);})()}
              {[...expenses].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,4).map(e=>{
                const cat=categories.find(c=>c.name===e.category);
                return(<div key={e.id} onClick={()=>setEditItem({type:"expense",data:e})} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderBottom:`1px solid ${C.border}`,cursor:"pointer"}}>
                  <div style={{width:34,height:34,borderRadius:9,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{cat?.icon||"💸"}</div>
                  <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:C.text}}>{e.name}</div><div style={{fontSize:11,color:C.textLight}}>{e.date} · {e.category}</div></div>
                  <div className={hidden?"blurred":"unblurred"} style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>-{fmt(e.amount)}</div>
                </div>);
              })}
            </div>}
          </div>
        )}

        {tab==="chat"&&<div style={{height:"calc(100vh - 110px)",display:"flex",flexDirection:"column"}}>
          <div style={{marginBottom:10}}>
            <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text}}>AI Logger</div>
            <div style={{fontSize:13,color:C.textLight,marginTop:1,marginBottom:10}}>Type naturally — "lunch 12", "rent 1200 due 28th", "moved 500 to savings"</div>
            {/* Smart prompt chips */}
            <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
              {(()=>{
                const now_c=new Date();
                const urgentPayBills=bills.filter(b=>!b.paid&&dueIn(b.dueDate)<=3&&dueIn(b.dueDate)>=0).slice(0,2);
                const chips=[
                  {l:"💸 Log Expense",a:()=>om("expense")},
                  {l:"📅 Add Bill",a:()=>om("bill")},
                  {l:"💳 Add Debt",a:()=>om("debt")},
                  {l:"🎯 Add Goal",a:()=>navTo("savings")},
                  {l:"💰 Paycheck Plan",a:()=>navTo("paycheck")},
                  ...urgentPayBills.map(b=>({l:"✓ Pay "+b.name,a:()=>setBills(p=>p.map(x=>x.id===b.id?{...x,paid:true}:x))})),
                ];
                return chips.map((c,i)=>(
                  <div key={i} onClick={c.a} style={{flexShrink:0,background:C.surface,border:`1px solid ${C.border}`,borderRadius:99,padding:"6px 12px",fontSize:11,fontWeight:600,color:C.textMid,cursor:"pointer",whiteSpace:"nowrap",boxShadow:"0 1px 2px rgba(10,22,40,.06)"}}>
                    {c.l}
                  </div>
                ));
              })()}
            </div>
          </div>
          <div style={{flex:1,minHeight:0}}><ChatView categories={categories} expenses={expenses} bills={bills} debts={debts} accounts={accounts} income={income} savingsGoals={savingsGoals} trades={trades} tradingAccount={tradingAccount} setExpenses={setExpenses} setBills={setBills} setDebts={setDebts} setSGoals={setSGoals} setAccounts={setAccounts} setIncome={setIncome} setTrades={setTrades} setBGoals={setBGoals}/></div></div>}
        {tab==="categories"&&<CategoriesView categories={categories} setCategories={setCats} showToast={showToast}/>}
        {tab==="spend"&&<SpendingView expenses={expenses} setExpenses={setExpenses} budgetGoals={budgetGoals} setBGoals={setBGoals} categories={categories} setEditItem={setEditItem} onAdd={()=>om("expense")} showToast={showToast} household={household}/>}
        {tab==="bills"&&<BillsView bills={bills} setBills={setBills} setEditItem={setEditItem} onAdd={()=>om("bill")} showToast={showToast} household={household}/>}
        {tab==="more"&&!isMoreTab&&(
          <div className="fu">
            {/* Account pill at top of More */}
            {authSession?(
              <div style={{background:C.navy,borderRadius:16,padding:"14px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:40,height:40,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:MF,fontWeight:800,fontSize:16,color:"#fff",flexShrink:0}}>{(authSession?.user?.email||"?")[0].toUpperCase()}</div>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:700,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{authSession?.user?.email}</div><div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginTop:2}}>{(()=>{const t=parseInt(localStorage.getItem("fv_last_sync")||"0");const ago=t?Math.floor((Date.now()-t)/1000):null;return ago===null?"Signed in":ago<10?"✓ Just synced":ago<60?"✓ Synced "+ago+"s ago":ago<3600?"✓ Synced "+Math.floor(ago/60)+"m ago":"Signed in";})()}</div></div>
                <button onClick={async()=>{if(authSession&&!syncing){await loadFromSupabase(authSession);showToast("✓ Synced");}}} style={{background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.15)",borderRadius:8,padding:"6px 12px",color:"rgba(255,255,255,.8)",fontSize:12,fontWeight:700,cursor:syncing?"default":"pointer",display:"flex",alignItems:"center",gap:5,opacity:syncing?0.6:1}}>{syncing?"Syncing...":"↻ Sync now"}</button>
                <button onClick={()=>setConfirm({title:"Sign Out",message:"You'll stay in offline mode. Your local data is safe.",onConfirm:()=>{handleSignOut();setConfirm(null);},danger:false})} style={{background:"rgba(255,255,255,.1)",border:"none",borderRadius:8,padding:"6px 12px",color:"rgba(255,255,255,.7)",fontSize:12,fontWeight:600,cursor:"pointer"}}>Sign Out</button>
              </div>
            ):(
              <div style={{background:`linear-gradient(135deg,${C.accent},${C.purple})`,borderRadius:16,padding:"14px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
                <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:2}}>Using offline mode</div><div style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>Sign in to sync across devices</div></div>
                <button onClick={()=>{localStorage.removeItem("fv_skip_auth");setSkipAuth(false);}} style={{background:"rgba(255,255,255,.2)",border:"none",borderRadius:8,padding:"8px 14px",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Sign In</button>
              </div>
            )}
            <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text,marginBottom:2}}>More</div>
            <div style={{fontSize:13,color:C.textLight,marginBottom:16}}>All your financial tools</div>
            {/* Featured shortcuts grid */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:20}}>
              {[
                {id:"health",ic:"❤️",l:"Health",c:C.red,bg:C.redBg},
                {id:"paycheck",ic:"💰",l:"Paycheck",c:C.green,bg:C.greenBg},
                {id:"networthtrend",ic:"📈",l:"Net Worth",c:C.accent,bg:C.accentBg},
                {id:"insights",ic:"📊",l:"Insights",c:C.purple,bg:C.purpleBg},
                {id:"debt",ic:"💳",l:"Debt",c:C.red,bg:C.redBg},
                {id:"savings",ic:"🎯",l:"Goals",c:C.teal,bg:"rgba(13,148,136,.1)"},
                {id:"calendar",ic:"📅",l:"Calendar",c:C.amber,bg:C.amberBg},
                {id:"search",ic:"🔍",l:"Search",c:C.textMid,bg:C.surfaceAlt},{id:"household",ic:"🏠",l:"Household",c:C.accent,bg:C.accentBg},{id:"networthtrend",ic:"💰",l:"HYSA Calc",c:C.green,bg:C.greenBg},
              ].map(({id,ic,l,c,bg})=>(
                <button key={id} onClick={()=>navTo(id)} className="ba" style={{background:bg,borderRadius:14,padding:"12px 4px",display:"flex",flexDirection:"column",alignItems:"center",gap:5,border:"none",cursor:"pointer"}}>
                  <span style={{fontSize:20}}>{ic}</span>
                  <span style={{fontSize:10,fontWeight:700,color:c,lineHeight:1.2,textAlign:"center"}}>{l}</span>
                </button>
              ))}
            </div>
            {GROUPS.map(sec=>(
              <div key={sec.key} style={{marginBottom:22}}>
                <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:10}}><div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.text}}>{sec.label}</div><div style={{fontSize:11,color:C.textLight}}>{sec.desc}</div></div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {sec.items.map(t=>{const badge=t.id==="notifs"&&unread>0?unread:null;return(
                    <button key={t.id} className="ba" onClick={()=>navTo(t.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",background:C.surface,borderRadius:12,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",cursor:"pointer",textAlign:"left",width:"100%"}}>
                      <div style={{width:36,height:36,background:badge?C.redBg:C.accentBg,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,position:"relative"}}><t.icon size={17} color={badge?C.red:C.accent}/>{badge&&<div style={{position:"absolute",top:-4,right:-4,width:16,height:16,background:C.red,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"#fff",border:"2px solid #fff"}}>{badge>9?"9+":badge}</div>}</div>
                      <span style={{fontSize:14,fontWeight:600,color:C.text,flex:1}}>{t.label}</span>
                      <ChevronRight size={15} color={C.textLight}/>
                    </button>
                  );})}
                </div>
              </div>
            ))}
            <button className="ba" onClick={()=>navTo("settings")} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",background:C.accent,borderRadius:12,cursor:"pointer",textAlign:"left",width:"100%",border:"none",marginTop:4}}>
              <div style={{width:36,height:36,background:"rgba(255,255,255,.2)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Settings size={17} color="#fff"/></div>
              <span style={{fontSize:14,fontWeight:700,color:"#fff",flex:1}}>Settings</span>
              <ChevronRight size={15} color="rgba(255,255,255,.7)"/>
            </button>
          </div>
        )}

        {tab==="accounts"&&(
          <div className="fu">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}><div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text}}>Accounts & Income</div><div style={{fontSize:12,color:C.green,fontWeight:600,display:"flex",alignItems:"center",gap:4}}><div style={{width:7,height:7,borderRadius:"50%",background:C.green}}/>Auto-saved</div></div>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
              {[{k:"checking",l:"Checking",ic:"🏦",c:C.navy},{k:"savings",l:"Savings",ic:"💰",c:C.green},{k:"cushion",l:"Cushion / Emergency",ic:"🛡️",c:C.accent}].map(a=>(
                <div key={a.k} style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,display:"flex",alignItems:"center",gap:14}}>
                  <div style={{width:44,height:44,borderRadius:12,background:a.c+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{a.ic}</div>
                  <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:C.text}}>{a.l}</div></div>
                  <input type="number" placeholder="0.00" value={accounts[a.k]||""} onChange={e=>setAccounts(p=>({...p,[a.k]:e.target.value}))} onBlur={e=>{if(e.target.value)showToast("✓ "+a.l+" saved");}} style={{width:130,background:hidden?C.bg:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"8px 10px",fontSize:18,fontFamily:MF,fontWeight:700,color:a.c,outline:"none",textAlign:"right",fontWeight:800,filter:hidden?"blur(8px)":"none"}}/>
                </div>
              ))}
            </div>
            {/* HYSA opportunity tip */}
            {(()=>{
              const liq=(parseFloat(accounts.checking||0))+(parseFloat(accounts.savings||0))+(parseFloat(accounts.cushion||0));
              if(liq<1000)return null;
              const extraPerYr=liq*(4.75-0.5)/100;
              return(
                <div onClick={()=>{}} style={{background:C.greenBg,border:`1px solid ${C.greenMid}`,borderRadius:14,padding:"12px 16px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:C.green,marginBottom:2}}>⚡ HYSA Opportunity</div>
                    <div style={{fontSize:12,color:C.green,opacity:.8}}>Your {fmt(liq)} could earn {fmt(extraPerYr)}/yr more</div>
                  </div>
                  <div style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.green}}>{fmt(extraPerYr/12)}/mo</div>
                </div>
              );
            })()}
            {/* Investment & Retirement Accounts */}
            <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:10,marginTop:4}}>Investments & Retirement</div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
              {[
                {k:"k401",l:"401(k)",ic:"🏢",c:C.accent,desc:"Pre-tax employer retirement"},
                {k:"roth_ira",l:"Roth IRA",ic:"🌱",c:C.green,desc:"Post-tax retirement"},
                {k:"brokerage",l:"Brokerage",ic:"📊",c:C.teal,desc:"Taxable investment account"},
                {k:"hsa",l:"HSA",ic:"🏥",c:C.purple,desc:"Health savings account"},
                {k:"crypto",l:"Crypto",ic:"₿",c:C.amber,desc:"Cryptocurrency portfolio"},
              ].map(a=>(
                <div key={a.k} style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"14px 16px",display:"flex",alignItems:"center",gap:14}}>
                  <div style={{width:44,height:44,borderRadius:12,background:a.c+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{a.ic}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:600,color:C.text}}>{a.l}</div>
                    <div style={{fontSize:11,color:C.textLight}}>{a.desc}</div>
                  </div>
                  <input type="number" placeholder="0.00" value={accounts[a.k]||""} onChange={e=>setAccounts(p=>({...p,[a.k]:e.target.value}))} onBlur={e=>{if(e.target.value)showToast("✓ "+a.l+" saved");}} style={{width:120,background:hidden?C.bg:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"8px 10px",fontSize:16,fontFamily:MF,fontWeight:700,color:a.c,outline:"none",textAlign:"right",filter:hidden?"blur(8px)":"none"}}/>
                </div>
              ))}
            </div>
            {/* Real Estate & Assets */}
            <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:10}}>Real Estate & Assets</div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
              {[
                {k:"property",l:"Property / Real Estate",ic:"🏠",c:C.amber,desc:"Home value or equity"},
                {k:"investments",l:"Other Investments",ic:"📈",c:C.green,desc:"Index funds, ETFs, etc."},
                {k:"vehicles",l:"Vehicles",ic:"🚗",c:C.purple,desc:"Cars, motorcycles, etc."},
              ].map(a=>(
                <div key={a.k} style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"14px 16px",display:"flex",alignItems:"center",gap:14}}>
                  <div style={{width:44,height:44,borderRadius:12,background:a.c+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{a.ic}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:600,color:C.text}}>{a.l}</div>
                    <div style={{fontSize:11,color:C.textLight}}>{a.desc}</div>
                  </div>
                  <input type="number" placeholder="0.00" value={accounts[a.k]||""} onChange={e=>setAccounts(p=>({...p,[a.k]:e.target.value}))} onBlur={e=>{if(e.target.value)showToast("✓ "+a.l+" saved");}} style={{width:120,background:hidden?C.bg:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"8px 10px",fontSize:16,fontFamily:MF,fontWeight:700,color:a.c,outline:"none",textAlign:"right",filter:hidden?"blur(8px)":"none"}}/>
                </div>
              ))}
            </div>
            <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontFamily:MF,fontWeight:700,fontSize:16,color:C.text}}>Income / Paycheck</div>
              <div style={{display:"flex",gap:5}}>
                {["Weekly","Biweekly","Twice Monthly","Monthly"].map(f=>(
                  <button key={f} onClick={()=>setIncome(p=>({...p,payFrequency:f}))}
                    style={{padding:"4px 8px",borderRadius:99,border:`1px solid ${(income.payFrequency||"Biweekly")===f?C.accent:C.border}`,background:(income.payFrequency||"Biweekly")===f?C.accentBg:"transparent",fontSize:10,fontWeight:700,color:(income.payFrequency||"Biweekly")===f?C.accent:C.textLight,cursor:"pointer"}}>
                    {f==="Twice Monthly"?"2x/mo":f}
                  </button>
                ))}
              </div>
            </div>
              {[{k:"primary",l:`${getProfession(profCategory).icon} Primary take-home / paycheck`},{k:"other",l:"Other Income"},{k:"trading",l:"Trading avg"},{k:"rental",l:"Rental Income"},{k:"dividends",l:"Dividends"},{k:"freelance",l:"Freelance"}].map(i=>(
                <div key={i.k} style={{marginBottom:10}}><div style={{fontSize:11,fontWeight:600,color:C.slate,textTransform:"uppercase",letterSpacing:.4,marginBottom:5}}>{i.l}</div><input type="number" placeholder="0.00" value={income[i.k]||""} onChange={e=>setIncome(p=>({...p,[i.k]:e.target.value}))} onBlur={e=>{if(e.target.value)showToast("✓ Income saved");}} style={{width:"100%",background:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"11px 14px",color:C.text,fontSize:14,outline:"none"}}/></div>
              ))}
              <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:10,padding:"10px 14px",marginTop:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                <span style={{fontSize:12,color:C.accent,fontWeight:600}}>Monthly equivalent</span>
                <span style={{fontFamily:MF,fontSize:16,fontWeight:800,color:C.accent}}>{fmt(totalIncome)}</span>
              </div>
              <div style={{fontSize:11,color:C.accent,opacity:.7}}>({income.payFrequency||"Biweekly"} × {income.payFrequency==="Weekly"?"4.33":income.payFrequency==="Twice Monthly"?"2":income.payFrequency==="Monthly"?"1":"2.17"} + other sources)</div>
            </div>
            </div>
          </div>
        )}

        {tab==="debt"&&<DebtView debts={debts} setDebts={setDebts} setModal={setModal} setEditItem={setEditItem} showToast={showToast} extraPayDebt={extraPayDebt} setExtraPayDebt={setExtraPayDebt}/>}
        {tab==="savings"&&<SavingsGoalsView goals={savingsGoals} setGoals={setSGoals} income={income} accounts={accounts} accountRates={accountRates} setAccountRates={setAccountRates} showToast={showToast}/>}
        {tab==="recurring"&&<RecurringView expenses={expenses} setExpenses={setExpenses} categories={categories} showToast={showToast} appReady={ready}/>}
        {tab==="cashflow"&&<IncomeSpendingView expenses={expenses} income={income} bills={bills} trades={trades}/>}
        {tab==="physical"&&<FinancialPhysicalView income={income} expenses={expenses} debts={debts} accounts={accounts} bills={bills} savingsGoals={savingsGoals}/>}
        {tab==="health"&&<HealthScoreView income={income} expenses={expenses} debts={debts} accounts={accounts} bills={bills} onNavigate={navTo}/>}
        {tab==="trading"&&settings.showTrading&&<TradingView trades={trades} setTrades={setTrades} account={tradingAccount} setAccount={setTradingAccount} showToast={showToast}/>}
        {tab==="calendar"&&<CalendarView expenses={expenses} bills={bills} calColors={calColors} setCalColors={setCalColors} setExpenses={setExpenses} onAdd={()=>om("expense")}/>}
        {tab==="shifts"&&<ShiftView shifts={shifts} setShifts={setShifts} income={income} profCategory={profCategory} profSub={profSub} showToast={showToast}/>}
        {tab==="trend"&&<TrendView balHist={balHist} accounts={accounts} expenses={expenses} onNavigate={navTo}/>}
        {tab==="statement"&&<StatementView expenses={expenses} bills={bills} income={income} accounts={accounts} debts={debts} trades={trades} appName={appName} categories={categories} onAdd={()=>om("expense")}/>}
        {tab==="search"&&<SearchView expenses={expenses} bills={bills} debts={debts} trades={trades} categories={categories} setEditItem={setEditItem} onNavigate={navTo}/>}
        {tab==="subscriptions"&&<SubsView detectedSubs={detectedSubs} expenses={expenses} showToast={showToast}/>}
        {tab==="insights"&&<InsightsView expenses={expenses} income={income} bills={bills} debts={debts} budgetGoals={budgetGoals} savingsGoals={savingsGoals}/>}
        {tab==="paycheck"&&<PaycheckView bills={bills} income={income} setIncome={setIncome} expenses={expenses} accounts={accounts} budgetGoals={budgetGoals} onAdd={()=>om("expense")}/>}
        {tab==="networthtrend"&&<NetWorthTrendView balHist={balHist} debts={debts} accounts={accounts} onNavigate={navTo}/>}
        {tab==="tax"&&<TaxView expenses={expenses} income={income} trades={trades} shifts={shifts} appName={appName}/>}
        {tab==="dashsettings"&&<DashSettingsView config={dashConfig} setConfig={setDashConfig} showTrading={settings.showTrading}/>}
        {tab==="household"&&<HouseholdView household={household} setHousehold={setHousehold} expenses={expenses} bills={bills} setBills={setBills} showToast={showToast}/>}
        {tab==="export"&&<div className="fu"><div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,marginBottom:4}}>Export Data</div><div style={{fontSize:13,color:C.textLight,marginBottom:20}}>Download your financial data for spreadsheets, backups, or your accountant.</div><button onClick={()=>setShowExport(true)} style={{display:"flex",alignItems:"center",gap:12,width:"100%",background:`linear-gradient(135deg,${C.accent},${C.purple})`,border:"none",borderRadius:16,padding:"18px 20px",cursor:"pointer",marginBottom:12}}><Download size={22} color="white"/><div style={{textAlign:"left"}}><div style={{fontSize:16,fontWeight:800,color:"#fff"}}>Open Export Center</div><div style={{fontSize:12,color:"rgba(255,255,255,.7)"}}>5 export formats — expenses, net worth, debts, report</div></div></button></div>}
        {tab==="import"&&<div className="fu"><div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,marginBottom:4}}>Import Bank CSV</div><div style={{fontSize:13,color:C.textLight,marginBottom:20}}>Paste or upload a CSV from your bank's website to bulk-import transactions.</div><button onClick={()=>setShowImport(true)} style={{display:"flex",alignItems:"center",gap:12,width:"100%",background:`linear-gradient(135deg,${C.green},${C.teal})`,border:"none",borderRadius:16,padding:"18px 20px",cursor:"pointer",marginBottom:16}}><FileText size={22} color="white"/><div style={{textAlign:"left"}}><div style={{fontSize:16,fontWeight:800,color:"#fff"}}>Open Bank Import</div><div style={{fontSize:12,color:"rgba(255,255,255,.7)"}}>Supports Chase, BofA, Wells Fargo, Capital One, Citi + any CSV</div></div></button><div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"12px 14px",fontSize:13,color:C.accent,lineHeight:1.6}}>💡 100% offline — your bank data never leaves your device. Export CSV from your bank's website, then paste it here. Auto-detects format and categorizes by merchant.</div></div>}
        {tab==="settings"&&<SettingsView settings={settings} setSettings={setSettings} appName={appName} setAppName={setAppName} profCategory={profCategory} setProfCategory={setProfCategory} profSub={profSub} setProfSub={setProfSub} darkMode={darkMode} setDarkMode={setDarkMode} pinEnabled={pinEnabled} setPinEnabled={setPinEnabled} household={household} navTo={navTo} expenses={expenses} bills={bills} debts={debts} trades={trades} accounts={accounts} income={income} shifts={shifts} savingsGoals={savingsGoals} budgetGoals={budgetGoals} setBills={setBills} setDebts={setDebts} setTrades={setTrades} setShifts={setShifts} setSGoals={setSGoals} setBGoals={setBGoals} setAccounts={setAccounts} setIncome={setIncome} setExpenses={setExpenses} categories={categories} setCategories={setCats} greetName={greetName} setGreetName={setGreetName} onResetAllData={()=>setConfirm({title:"Reset All Data",message:"This will permanently delete all your expenses, bills, debts, goals and settings — including synced cloud data. This cannot be undone.",onConfirm:async()=>{setExpenses([]);setBills([]);setDebts([]);setSGoals([]);setBGoals([]);setTrades([]);setShifts([]);setBalHist([]);setNotifs([]);setAccounts({checking:"",savings:"",cushion:"",investments:"",k401:"",roth_ira:"",brokerage:"",crypto:"",hsa:"",property:"",vehicles:""});setIncome({primary:"",other:"",trading:"",rental:"",dividends:"",freelance:"",payFrequency:"Biweekly",lastPayDate:""});setGreetName("");setCats(DEF_CATS);setSettings({showTrading:true,showCrypto:false,showHealth:true,showSavings:true,showForecast:true,quickActions:["expense","bill","paycheck","debt","health","budget","savings","insights"]});setTradingAccount({deposit:"",balance:""});const uid=_getUserId();if(uid){try{await supaFetch(`/rest/v1/user_data?user_id=eq.${uid}`,{method:"DELETE"});}catch{}}showToast("All data cleared","error");setConfirm(null);},danger:true})} onResetOnboarding={()=>{try{localStorage.removeItem("fv_onboarded");}catch{}setOnboarded(false);}} onSignOut={authSession?handleSignOut:null} onSignIn={!authSession&&skipAuth?()=>{localStorage.removeItem("fv_skip_auth");setSkipAuth(false);}:null} userEmail={authSession?.user?.email} showToast={showToast}/>}

        {tab==="notifs"&&(
          <div className="fu">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div><div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text}}>Notifications</div><div style={{fontSize:13,color:C.textLight}}>{notifs.filter(n=>!n.read).length} unread</div></div>
              <div style={{display:"flex",gap:8}}>{notifs.some(n=>!n.read)&&<button className="ba" onClick={()=>setNotifs(p=>p.map(n=>({...n,read:true})))} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:600,color:C.textMid,cursor:"pointer"}}>Mark all read</button>}{notifs.length>0&&<button className="ba" onClick={()=>{setNotifs([]);}} style={{background:C.redBg,border:`1px solid ${C.redMid}`,borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:600,color:C.red,cursor:"pointer"}}>Clear</button>}</div>
            </div>
            {/* Push notification permission banner */}
            {(()=>{
              const perm=notifPermission();
              if(perm==="granted")return(
                <div style={{background:C.greenBg,border:`1px solid ${C.greenMid}`,borderRadius:12,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:16}}>🔔</span>
                  <div style={{flex:1,fontSize:13,color:C.green,fontWeight:500}}>Push notifications <strong>enabled</strong> — you'll get alerts for bills, budgets, and goals</div>
                </div>
              );
              if(perm==="denied")return(
                <div style={{background:C.redBg,border:`1px solid ${C.redMid}`,borderRadius:12,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:16}}>🔕</span>
                  <div style={{flex:1,fontSize:13,color:C.red}}>Push notifications blocked. Enable them in your browser settings to get bill reminders.</div>
                </div>
              );
              if(!notifSupported())return(
                <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"10px 14px",marginBottom:14,fontSize:13,color:C.accent}}>💡 Add Trackfi to your home screen for full push notification support.</div>
              );
              return(
                <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"14px",marginBottom:14}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>🔔 Enable Push Notifications</div>
                  <div style={{fontSize:13,color:C.textLight,marginBottom:12,lineHeight:1.5}}>Get alerts for overdue bills, budget warnings, payday reminders, and goal completions — even when the app is closed.</div>
                  <button onClick={async()=>{const r=await requestNotifPermission();if(r==="granted")showToast("✅ Notifications enabled!");else showToast("Notifications not enabled","error");}} style={{width:"100%",padding:"11px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${C.accent},${C.teal})`,color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>Enable Notifications →</button>
                </div>
              );
            })()}
            {notifs.length===0&&<Empty text="All clear — alerts will show here" icon={Bell}/>}
            {notifs.map(n=>{const S={danger:{bg:C.redBg,br:C.redMid,c:C.red,ic:"🚨"},warning:{bg:C.amberBg,br:C.amberMid,c:C.amber,ic:"⚠️"},success:{bg:C.greenBg,br:C.greenMid,c:C.green,ic:"✅"},info:{bg:C.accentBg,br:C.accentMid,c:C.accent,ic:"💡"}}[n.type]||{bg:C.bg,br:C.border,c:C.text,ic:"🔔"};const ago=Date.now()-n.time;const ta=ago<60000?"just now":ago<3600000?Math.floor(ago/60000)+"m ago":ago<86400000?Math.floor(ago/3600000)+"h ago":Math.floor(ago/86400000)+"d ago";return(<div key={n.id} style={{background:n.read?C.surface:S.bg,border:`1.5px solid ${n.read?C.border:S.br}`,borderRadius:14,padding:"13px 14px",marginBottom:8}}><div style={{display:"flex",gap:10,alignItems:"flex-start"}}><span style={{fontSize:20,flexShrink:0}}>{S.ic}</span><div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:n.read?C.textMid:S.c}}>{n.title}</div><div style={{fontSize:12,color:C.textLight,marginTop:3,lineHeight:1.4}}>{n.body}</div><div style={{fontSize:11,color:C.textLight,marginTop:4}}>{ta}</div></div>{!n.read&&<div style={{width:8,height:8,borderRadius:"50%",background:S.c,flexShrink:0,marginTop:4}}/>}</div><div style={{display:"flex",gap:7,marginTop:10,paddingTop:10,borderTop:`1px solid ${C.border}`}}><button className="ba" onClick={()=>setNotifs(p=>p.map(x=>x.id===n.id?{...x,read:true}:x))} style={{flex:1,background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 0",color:C.textMid,fontWeight:600,fontSize:12,cursor:"pointer"}}>Dismiss</button><button className="ba" onClick={()=>setNotifs(p=>p.filter(x=>x.id!==n.id))} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.textLight,cursor:"pointer",display:"flex",alignItems:"center"}}><X size={13}/></button></div></div>);})}
          </div>
        )}
      </div>

      {monthlySummary&&<div style={{position:"fixed",inset:0,background:"rgba(10,22,40,.7)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setMonthlySummary(null)}>
        <div style={{background:"#fff",borderRadius:24,width:"100%",maxWidth:400,padding:28,boxShadow:"0 32px 80px rgba(0,0,0,.3)"}} onClick={e=>e.stopPropagation()}>
          <div style={{textAlign:"center",marginBottom:20}}>
            <div style={{fontSize:32,marginBottom:8}}>📊</div>
            <div style={{fontFamily:MF,fontSize:22,fontWeight:900,color:C.navy,letterSpacing:-.5}}>{monthlySummary.month} Recap</div>
            <div style={{fontSize:13,color:C.textLight,marginTop:4}}>Here's how last month went</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
            {[
              ["Total Spent",fmt(monthlySummary.total),monthlySummary.prevTotal>0&&monthlySummary.total>monthlySummary.prevTotal?C.red:C.green],
              ["Transactions",String(monthlySummary.txnCount),C.accent],
              ["Savings Rate",monthlySummary.savRate.toFixed(0)+"%",monthlySummary.savRate>=20?C.green:monthlySummary.savRate>=10?C.amber:C.red],
              ["Top Category",monthlySummary.topCat||"—",C.purple],
            ].map(([l,v,c])=>(
              <div key={l} style={{background:C.surfaceAlt,borderRadius:14,padding:"12px 14px"}}>
                <div style={{fontSize:10,color:C.textLight,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{l}</div>
                <div style={{fontFamily:MF,fontWeight:800,fontSize:15,color:c||C.text}}>{v}</div>
              </div>
            ))}
          </div>
          {monthlySummary.prevTotal>0&&<div style={{background:monthlySummary.total>monthlySummary.prevTotal?C.redBg:C.greenBg,border:`1px solid ${monthlySummary.total>monthlySummary.prevTotal?C.redMid:C.greenMid}`,borderRadius:12,padding:"10px 14px",marginBottom:16,fontSize:13,color:monthlySummary.total>monthlySummary.prevTotal?C.red:C.green,fontWeight:500}}>
            {monthlySummary.total>monthlySummary.prevTotal
              ?"⚠️ You spent "+fmt(monthlySummary.total-monthlySummary.prevTotal)+" more than the month before"
              :"✅ You spent "+fmt(monthlySummary.prevTotal-monthlySummary.total)+" less than the month before"}
          </div>}
          <button onClick={()=>setMonthlySummary(null)} style={{width:"100%",padding:"14px",borderRadius:14,border:"none",background:`linear-gradient(135deg,${C.accent},${C.teal})`,color:"#fff",fontFamily:MF,fontWeight:800,fontSize:16,cursor:"pointer"}}>Got it 👍</button>
        </div>
      </div>}
      {toast&&<div onClick={()=>setToast(null)} style={{position:"fixed",bottom:88,left:"50%",transform:"translateX(-50%)",zIndex:200,background:toast.type==="success"?C.green:toast.type==="error"?C.red:C.navy,color:"#fff",borderRadius:14,padding:"12px 20px",fontSize:13,fontWeight:600,boxShadow:"0 8px 32px rgba(10,22,40,.25),0 2px 8px rgba(10,22,40,.15)",display:"flex",alignItems:"center",gap:8,maxWidth:300,animation:"slideUp .22s cubic-bezier(.22,1,.36,1)",backdropFilter:"blur(8px)",letterSpacing:.1,cursor:"pointer"}}>{toast.type==="success"?"✓":toast.type==="error"?"✗":"·"} {toast.msg}</div>}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:640,background:"rgba(255,255,255,.88)",backdropFilter:"blur(32px)",WebkitBackdropFilter:"blur(32px)",borderTop:`1px solid rgba(226,229,238,.5)`,display:"flex",padding:"10px 8px max(14px,env(safe-area-inset-bottom))",zIndex:100,boxShadow:"0 -1px 0 rgba(10,22,40,.04),0 -12px 40px rgba(10,22,40,.07)"}}>
        {NAV.map(n=>{const active=n.id==="more"?isMoreTab||tab==="more":tab===n.id;return(
          <button key={n.id} className="ba" onClick={()=>navTo(n.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"none",border:"none",cursor:"pointer",color:active?C.accent:C.textFaint,position:"relative",borderRadius:12,padding:"4px 12px 6px",background:active?"rgba(99,102,241,.08)":"transparent",transition:"all .18s"}}>
            {n.id==="chat"?(
              <div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",marginTop:-10,boxShadow:`0 4px 12px ${C.accent}55`,marginBottom:2}}>
                <n.icon size={18} color="#fff" strokeWidth={2.2}/>
              </div>
            ):(
              <div style={{position:"relative"}}><n.icon size={21} strokeWidth={active?2.4:1.6}/>{n.badge&&n.badge>0&&<div style={{position:"absolute",top:-4,right:-6,width:16,height:16,background:C.red,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"#fff",border:"2px solid #fff"}}>{n.badge>9?"9+":n.badge}</div>}</div>
            )}
            <span style={{fontSize:10,fontWeight:active?700:500}}>{n.label}</span>
          </button>
        );})}
      </div>

      {modal==="expense"&&<Modal title="Log Expense" icon={Wallet} onClose={cl} onSubmit={submit} submitLabel="Add Expense"><FI label="Name" placeholder="Coffee, groceries, gas..." value={form.name||""} onChange={e=>{ff("name",e.target.value);if(!form.category){const t=e.target.value.toLowerCase().trim();const mc=window._merchantCats||{};if(mc[t]){ff("category",mc[t]);}else{const catMap={"Groceries":["grocery","groceries","publix","kroger","walmart","costco","trader joe","aldi","whole foods","market"],"Fast Food":["mcdonald","burger","wendy","chipotle","taco bell","subway","chick","popeyes","kfc","domino","sonic"],"Restaurants":["restaurant","sushi","dinner out","doordash","ubereats","grubhub","dine"],"Coffee":["starbucks","dunkin","coffee","latte","espresso","cafe","cold brew","dutch bros"],"Gas":["gas","shell","bp","chevron","exxon","fuel","wawa","sheetz","quiktrip"],"Rideshare":["uber","lyft","taxi","ride"],"Subscriptions":["netflix","hulu","spotify","apple music","amazon prime","disney","hbo","membership","subscription"],"Health / Medical":["doctor","pharmacy","cvs","walgreens","medicine","dental","therapy","copay","clinic"],"Gym / Fitness":["gym","planet fitness","fitness","yoga","crossfit","peloton","workout"],"Grooming / Haircuts":["haircut","barber","salon","nails","manicure","wax","spa","sephora","ulta"],"Clothing":["clothes","shoes","nike","adidas","h&m","zara","nordstrom","fashion"],"Entertainment":["movie","game","steam","concert","ticket","bowling","bar","club"],"Travel":["hotel","airbnb","flight","airline","vacation","booking"],"Pets":["pet","petco","petsmart","vet","dog food","cat food"],"Shopping":["amazon","target","best buy","home depot","ikea","walmart","tj maxx"]};for(const[cat,kws]of Object.entries(catMap)){if(kws.some(k=>t.includes(k))){ff("category",cat);break;}}}}}}/><div style={{display:"flex",gap:12}}><FI half label="Amount ($)" type="number" value={form.amount||""} onChange={e=>ff("amount",e.target.value)} autoFocus={!!form.name}/><FI half label="Date" type="date" value={form.date||todayStr()} onChange={e=>ff("date",e.target.value)}/></div><FS label="Category" options={categories.map(c=>c.name)} value={form.category||""} onChange={e=>ff("category",e.target.value)}/><FI label="Notes" placeholder="Optional" value={form.notes||""} onChange={e=>ff("notes",e.target.value)}/>
        {household.enabled&&household.members.length>1&&<div style={{marginBottom:8}}>
          <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Assign to</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {[{id:"shared",name:"Shared",emoji:"🏠"},...household.members].map(m=>(
              <button key={m.id} onClick={()=>ff("owner",m.id)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:99,border:`1.5px solid ${(form.owner||"shared")===m.id?C.accent:C.border}`,background:(form.owner||"shared")===m.id?C.accentBg:"#fff",cursor:"pointer",fontSize:12,fontWeight:(form.owner||"shared")===m.id?700:400,color:(form.owner||"shared")===m.id?C.accent:C.textMid}}>
                <span>{m.emoji}</span><span>{m.name}</span>
              </button>
            ))}
          </div>
        </div>}<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderTop:`1px solid ${C.border}`,marginTop:4}}><div><div style={{fontSize:13,fontWeight:600,color:C.text}}>Recurring</div><div style={{fontSize:12,color:C.textLight}}>Auto-log this monthly</div></div><button onClick={()=>ff("recurring",!form.recurring)} style={{background:"none",border:"none",cursor:"pointer",color:form.recurring?C.accent:C.borderLight,padding:0,display:"flex"}}>{form.recurring?<ToggleRight size={28}/>:<ToggleLeft size={28}/>}</button></div></Modal>}
      {modal==="bill"&&<Modal title="Add Bill" icon={CalendarClock} onClose={cl} onSubmit={submit} submitLabel="Add Bill" accent={C.amber}><FI label="Bill Name" placeholder="Rent, Electric, Netflix..." value={form.name||""} onChange={e=>ff("name",e.target.value)}/><div style={{display:"flex",gap:12}}><FI half label="Amount ($)" type="number" value={form.amount||""} onChange={e=>ff("amount",e.target.value)}/><FI half label="Due Date" type="date" value={form.dueDate||""} onChange={e=>ff("dueDate",e.target.value)}/></div><FS label="Recurring" options={["Monthly","Bi-weekly","Quarterly","Annual","One-time"]} value={form.recurring||""} onChange={e=>ff("recurring",e.target.value)}/>{household.enabled&&household.members.length>1&&<div style={{marginBottom:8}}><div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Paid by</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{[{id:"shared",name:"Shared",emoji:"🏠"},...household.members].map(m=>(<button key={m.id} onClick={()=>ff("paidBy",m.id)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:99,border:`1.5px solid ${(form.paidBy||"shared")===m.id?C.amber:C.border}`,background:(form.paidBy||"shared")===m.id?"#FFFBEB":"#fff",cursor:"pointer",fontSize:12,fontWeight:(form.paidBy||"shared")===m.id?700:400,color:(form.paidBy||"shared")===m.id?C.amber:C.textMid}}><span>{m.emoji}</span><span>{m.name}</span></button>))}</div></div>}</Modal>}
      {modal==="debt"&&<Modal title="Add Debt" icon={CreditCard} onClose={cl} onSubmit={submit} submitLabel="Track Debt" accent={C.red} wide><FI label="Name" placeholder="Car loan, student debt..." value={form.name||""} onChange={e=>ff("name",e.target.value)}/><div style={{display:"flex",gap:12}}><FI half label="Balance ($)" type="number" value={form.balance||""} onChange={e=>ff("balance",e.target.value)}/><FI half label="Original ($)" type="number" value={form.original||""} onChange={e=>ff("original",e.target.value)}/></div><div style={{display:"flex",gap:12}}><FI half label="Rate %" type="number" value={form.rate||""} onChange={e=>ff("rate",e.target.value)}/><FI half label="Min Payment ($)" type="number" value={form.minPayment||""} onChange={e=>ff("minPayment",e.target.value)}/></div></Modal>}
      {modal==="bgoal_home"&&<Modal title="Spending Envelope" icon={Target} onClose={cl} onSubmit={()=>{if(!form.category||!form.limit)return;setBGoals(p=>[...p,{id:Date.now(),...form}]);cl();}} submitLabel="Add Envelope" accent={C.purple}><div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:C.accent,lineHeight:1.5}}>
        💡 Variable expenses like gas, haircuts, groceries. These reserve money in your safe-to-spend before you log them.
      </div>
      <FS label="Category" options={categories.map(c=>c.name)} value={form.category||""} onChange={e=>ff("category",e.target.value)}/><FI label="Note (optional)" placeholder="e.g. haircuts ~2x/month" value={form.note||""} onChange={e=>ff("note",e.target.value)}/><FI label="Monthly Budget ($)" type="number" placeholder="e.g. 150" value={form.limit||""} onChange={e=>ff("limit",e.target.value)}/></Modal>}
      {modal==="receipt"&&<Modal title="Scan Receipt" icon={Scan} onClose={cl} accent={C.purple}><div style={{textAlign:"center",padding:"10px 0 20px"}}><div style={{width:64,height:64,borderRadius:18,background:C.purpleBg,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}><Scan size={30} color={C.purple}/></div><div style={{fontFamily:MF,fontWeight:700,fontSize:16,color:C.text,marginBottom:8}}>Scan Receipt</div><label style={{display:"block",background:C.purple,borderRadius:12,padding:"13px 0",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:10}}>📷 Take Photo<input type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>{const file=e.target.files[0];if(!file)return;cl();om("expense",{name:"Receipt",amount:"",category:"Misc",date:todayStr()});}}/></label><label style={{display:"block",background:C.purpleBg,border:`1px solid ${C.purpleMid}`,borderRadius:12,padding:"13px 0",color:C.purple,fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:10}}>🖼 Choose from Library<input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const file=e.target.files[0];if(!file)return;cl();om("expense",{name:"Receipt",amount:"",category:"Misc",date:todayStr()});}}/></label><button className="ba" onClick={cl} style={{background:C.bg,borderRadius:12,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"12px 0",color:C.textMid,fontWeight:600,fontSize:14,cursor:"pointer",width:"100%"}}>Cancel</button></div></Modal>}
      {modal==="simulator"&&debts.length>0&&(()=>{const dL=debts.map(d=>({...d,bal:parseFloat(d.balance||0),rate:parseFloat(d.rate||0)/100/12,min:parseFloat(d.minPayment||0)}));const tm=dL.reduce((s,d)=>s+d.min,0);const ex=parseFloat(form.extra||"0")||0;function sim(strat){let r=dL.map(d=>({...d}));let mo=0,ti=0;while(r.some(d=>d.bal>0)&&mo<600){mo++;let av=tm+ex;r=r.map(d=>{if(d.bal<=0)return d;const i=d.bal*d.rate;ti+=i;const p=Math.min(d.min,d.bal+i);av-=p;return{...d,bal:Math.max(0,d.bal+i-p)};});const ac=r.filter(d=>d.bal>0);if(ac.length&&av>0){const tgt=strat==="avalanche"?ac.reduce((a,b)=>a.rate>b.rate?a:b):ac.reduce((a,b)=>a.bal<b.bal?a:b);const idx=r.findIndex(d=>d.name===tgt.name);r[idx].bal=Math.max(0,r[idx].bal-av);}}return{months:mo,interest:ti};}const sn=sim("snowball"),av=sim("avalanche"),diff=sn.interest-av.interest;return(<Modal title="Payoff Simulator" icon={Calculator} onClose={cl} accent={C.green} wide><div style={{background:C.navy,borderRadius:14,padding:16,marginBottom:14,color:"#fff"}}><div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",marginBottom:4}}>TOTAL DEBT</div><div style={{fontFamily:MF,fontSize:26,fontWeight:800,color:C.red}}>{fmt(debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0))}</div><div style={{fontSize:12,color:"rgba(255,255,255,.4)",marginTop:2}}>Min payments: {fmt(tm)}/mo</div></div><div style={{marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5}}>Extra Monthly Payment</div><div style={{fontFamily:MF,fontWeight:800,fontSize:18,color:C.accent}}>{ex>0?"+"+fmt(ex):"$0"}</div></div><input type="range" min="0" max="1000" step="25" value={form.extra||0} onChange={e=>ff("extra",e.target.value)} style={{width:"100%",accentColor:C.accent,cursor:"pointer",marginBottom:6}}/><div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.textFaint}}><span>$0</span><span>$500</span><span>$1,000</span></div><div style={{marginTop:8,fontSize:12,color:C.textLight}}>Total: <span style={{fontWeight:700,color:C.text}}>{fmt(tm+ex)}/mo</span></div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>{[{label:"❄️ Snowball",sub:"Smallest first",m:sn.months,i:sn.interest,c:C.accent},{label:"🔥 Avalanche",sub:"Highest rate first",m:av.months,i:av.interest,c:C.green}].map(s=><div key={s.label} style={{background:C.surface,border:`1.5px solid ${s.c}44`,borderRadius:14,padding:14,borderTop:`3px solid ${s.c}`}}><div style={{fontFamily:MF,fontWeight:800,fontSize:13,color:s.c,marginBottom:2}}>{s.label}</div><div style={{fontSize:11,color:C.textLight,marginBottom:10}}>{s.sub}</div><div style={{marginBottom:6}}><div style={{fontSize:10,color:C.textLight,fontWeight:600,marginBottom:2}}>DEBT FREE</div><div style={{fontFamily:MF,fontWeight:800,fontSize:18,color:C.text}}>{s.m>=600?"∞":s.m<12?s.m+"mo":Math.floor(s.m/12)+"y "+(s.m%12)+"mo"}</div></div><div><div style={{fontSize:10,color:C.textLight,fontWeight:600,marginBottom:2}}>INTEREST</div><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.red}}>{fmt(s.i)}</div></div></div>)}</div>{diff>0&&<div style={{background:C.greenBg,border:`1px solid ${C.greenMid}`,borderRadius:12,padding:"11px 14px",fontSize:13,color:C.green,fontWeight:500}}>💡 Avalanche saves <strong>{fmt(diff)}</strong> vs Snowball</div>}</Modal>);})()} 

      {showImport&&<BankImportModal categories={categories} expenses={expenses} setExpenses={setExpenses} household={household} showToast={showToast} onClose={()=>setShowImport(false)}/>}
      {showExport&&<ExportModal expenses={expenses} bills={bills} debts={debts} accounts={accounts} income={income} savingsGoals={savingsGoals} budgetGoals={budgetGoals} trades={trades} shifts={shifts} categories={categories} appName={appName} greetName={greetName} onClose={()=>setShowExport(false)}/>}
      {confirm&&<ConfirmDialog title={confirm.title} message={confirm.message} onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)} danger={confirm.danger}/>}
      {editItem&&editItem.type==="expense"&&<EditModal item={editItem} categories={categories} household={household} onSave={u=>{setExpenses(p=>p.map(x=>x.id===editItem.data.id?{...x,...u}:x));showToast("✓ Expense updated");setEditItem(null);}} onDelete={()=>setConfirm({title:"Delete Expense",message:`Delete "${editItem.data.name}"?`,onConfirm:()=>{setExpenses(p=>p.filter(x=>x.id!==editItem.data.id));setEditItem(null);setConfirm(null);},danger:true})} onClose={()=>setEditItem(null)}/>}
      {editItem&&editItem.type==="bill"&&<EditModal item={editItem} categories={categories} onSave={u=>{setBills(p=>p.map(x=>x.id===editItem.data.id?{...x,...u}:x));showToast("✓ Bill updated");setEditItem(null);}} onDelete={()=>setConfirm({title:"Delete Bill",message:`Delete "${editItem.data.name}"?`,onConfirm:()=>{setBills(p=>p.filter(x=>x.id!==editItem.data.id));setEditItem(null);setConfirm(null);},danger:true})} onClose={()=>setEditItem(null)}/>}
      {editItem&&editItem.type==="debt"&&<EditModal item={editItem} categories={categories} onSave={u=>{setDebts(p=>p.map(x=>x.id===editItem.data.id?{...x,...u}:x));showToast("✓ Debt updated");setEditItem(null);}} onDelete={()=>setConfirm({title:"Delete Debt",message:`Delete "${editItem.data.name}"?`,onConfirm:()=>{setDebts(p=>p.filter(x=>x.id!==editItem.data.id));setEditItem(null);setConfirm(null);},danger:true})} onClose={()=>setEditItem(null)}/>}
      {modal==="quickactions"&&(()=>{
        const QA_ALL=[{id:"expense",l:"Log Expense",ic:"💸"},{id:"receipt",l:"Scan Receipt",ic:"📷"},{id:"bill",l:"Add Bill",ic:"📅"},{id:"debt",l:"Add Debt",ic:"💳"},{id:"simulator",l:"Payoff Sim",ic:"🧮"},{id:"budget",l:"Envelopes",ic:"📦"},{id:"shift",l:"Log Shift",ic:"🏥"},{id:"trade",l:"Log Trade",ic:"📈"},{id:"savings",l:"Add Goal",ic:"🎯"},{id:"networth",l:"Net Worth",ic:"📈"},{id:"insights",l:"Insights",ic:"📊"},{id:"paycheck",l:"Paycheck",ic:"💰"},{id:"health",l:"Health Score",ic:"❤️"},{id:"bills_nav",l:"View Bills",ic:"📅"},{id:"calendar_nav",l:"Calendar",ic:"📅"},{id:"recurring_nav",l:"Recurring",ic:"🔄"}];
        const active=settings.quickActions||["expense","bill","paycheck","debt","health","budget","savings","insights"];
        const toggle=id=>setSettings(p=>{const cur=p.quickActions||["expense","bill","paycheck","debt","health","budget","savings","insights"];const next=cur.includes(id)?cur.filter(x=>x!==id):[...cur,id];return{...p,quickActions:next};});
        return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:9999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setModal(null)}><div style={{background:C.surface,borderRadius:"24px 24px 0 0",padding:28,width:"100%",maxWidth:480,maxHeight:"80vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}><div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text,marginBottom:4}}>Customize Quick Actions</div><div style={{fontSize:13,color:C.textLight,marginBottom:18}}>Choose up to 6 actions</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>{QA_ALL.map(q=>{const on=active.includes(q.id);return(<button key={q.id} onClick={()=>toggle(q.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderRadius:14,border:`2px solid ${on?C.accent:C.border}`,background:on?C.accentBg:"#fff",cursor:"pointer",textAlign:"left"}}><span style={{fontSize:20}}>{q.ic}</span><span style={{fontSize:13,fontWeight:700,color:on?C.accent:C.text}}>{q.l}</span>{on&&<Check size={14} color={C.accent} style={{marginLeft:"auto",flexShrink:0}}/>}</button>);})}</div><button onClick={()=>setModal(null)} style={{width:"100%",padding:"14px",borderRadius:14,border:"none",background:C.accent,color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:MF}}>Done</button></div></div>);
      })()}
    </div>
  );
}

if(typeof window!=="undefined"){
  window.addEventListener("error",function(e){
    console.error("GLOBAL ERROR:",e.message,e.filename,e.lineno,e.colno,e.error?.stack);
  });
}

export default function App(){return(<ErrorBoundary><AppInner/></ErrorBoundary>);}