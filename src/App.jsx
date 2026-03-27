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

// 🔑 Replace with your Supabase project URL when ready
const SUPA_URL = "https://lkxznfbcnvsbugffvobw.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxreHpuZmJjbnZzYnVnZmZ2b2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwODQ5MzAsImV4cCI6MjA4OTY2MDkzMH0.Fb1R7H5ltCRSnzTZpgAndrnDXUEPxKfqsy0fZ5ZtAuU";

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
    const res = await fetch(SUPA_URL+"/auth/v1/signup", {
      method:"POST", headers:{"Content-Type":"application/json","apikey":SUPA_KEY},
      body: JSON.stringify({email, password})
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
const dueIn  = d => Math.ceil((new Date(d)-new Date(todayStr()))/86400000);
const daysInMonth = () => { const t=new Date(); return new Date(t.getFullYear(),t.getMonth()+1,0).getDate(); };
const dayOfMonth  = () => new Date().getDate();
const fmtDate = s => { if(!s)return""; const d=new Date(s+"T00:00:00"); return FULL_MOS[d.getMonth()]+" "+d.getDate(); };
const getScope=()=>{try{const s=JSON.parse(localStorage.getItem("fv_session")||"null");if(s?.user?.id)return"fv6_"+s.user.id.slice(0,8)+":";let d=localStorage.getItem("fv_device_id");if(!d){d="d_"+Math.random().toString(36).slice(2,10);localStorage.setItem("fv_device_id",d);}return"fv6_"+d+":";}catch{return"fv6_local:";}};
const sg = async k => { try { const r=localStorage.getItem(getScope()+k.replace("fv6:","")); if(r!==null)return JSON.parse(r); const legacy=localStorage.getItem(k); return legacy?JSON.parse(legacy):null; } catch { return null; } };
const ss = async (k,v) => { try { localStorage.setItem(getScope()+k.replace("fv6:",""),JSON.stringify(v)); } catch {} };
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
@keyframes spin{to{transform:rotate(360deg)}}
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
  const[d,setD]=useState({name:"",appName:"Trackfi",profCategory:"healthcare",profSub:"nurse_rn",income:{primary:"",other:"",trading:"",rental:"",dividends:"",freelance:""},accounts:{checking:"",savings:"",cushion:"",investments:""}});
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
    {title:"Almost there! 🎉",body:(
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {d.name&&<div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"12px 14px",marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:600,color:C.accent,marginBottom:4}}>Welcome, {d.name.split(" ")[0]}! Here's what we've set up:</div>
        <div style={{display:"flex",flexDirection:"column",gap:3}}>
          <div style={{fontSize:12,color:C.textMid}}>✓ Profile — {getProfession(d.profCategory).icon} {getProfSub(d.profCategory,d.profSub).label}</div>
          {parseFloat(d.income?.primary||0)>0&&<div style={{fontSize:12,color:C.textMid}}>✓ Take-home — {fmt(parseFloat(d.income.primary))} / {(d.income?.payFrequency||"biweekly").toLowerCase()} paycheck</div>}
        </div>
      </div>}
      <div style={{fontSize:13,color:C.textLight,lineHeight:1.6,marginBottom:12}}>Last step — add your account balances to unlock net worth tracking and safe-to-spend. Totally optional, you can skip and add later.</div>
        {[{k:"checking",l:"Checking",ic:"🏦",ph:"2500"},{k:"savings",l:"Savings",ic:"💰",ph:"5000"},{k:"cushion",l:"Emergency / Cushion",ic:"🛡️",ph:"1000"},{k:"investments",l:"Investments (401k, etc)",ic:"📈",ph:"0"}].map(a=>(
          <div key={a.k} style={{display:"flex",alignItems:"center",gap:12,background:C.surfaceAlt,borderRadius:12,padding:"11px 14px"}}>
            <span style={{fontSize:20,flexShrink:0}}>{a.ic}</span>
            <div style={{flex:1,fontSize:13,fontWeight:600,color:C.text}}>{a.l}</div>
            <input type="number" placeholder={a.ph} value={d.accounts?.[a.k]||""}
              onChange={e=>setD(p=>({...p,accounts:{...(p.accounts||{}),[a.k]:e.target.value}}))}
              style={{width:110,background:"#fff",border:`1.5px solid ${parseFloat(d.accounts?.[a.k]||0)>0?C.accent:C.border}`,borderRadius:10,padding:"8px 10px",fontSize:15,fontFamily:MF,fontWeight:700,color:C.text,outline:"none",textAlign:"right"}}/>
          </div>
        ))}
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
    // ── Can I afford / safe to spend ──────────────────────────
    if(t.includes("afford")||t.includes("safe to spend")||t.includes("safe to")){
      const m=t.match(/[\d,]+/);const a=m?parseFloat(m[0].replace(/,/g,"")):null;
      if(a)return a<=sts?"✅ Yes — "+fmt(a)+" fits. You have "+fmt(sts)+" safe to spend until "+chatNextPay.toLocaleDateString("en-US",{month:"short",day:"numeric"})+".":"❌ No — "+fmt(a)+" exceeds your safe-to-spend of "+fmt(sts)+". Short by "+fmt(a-sts)+".";
      return"Safe to spend: "+fmt(sts)+"
Checking: "+fmt(ck)+" · Bills before payday: "+fmt(bs)+"
Next pay: "+chatNextPay.toLocaleDateString("en-US",{month:"short",day:"numeric"});
    }
    // ── Bills & due dates ─────────────────────────────────────
    if(t.includes("bill")||t.includes("due")||t.includes("upcoming")){
      const ov=bills.filter(b=>!b.paid&&dueIn(b.dueDate)<0);
      const soon=bills.filter(b=>!b.paid&&dueIn(b.dueDate)>=0&&dueIn(b.dueDate)<=14);
      const later=bills.filter(b=>!b.paid&&dueIn(b.dueDate)>14);
      let resp="";
      if(ov.length)resp+="🚨 OVERDUE ("+fmt(ov.reduce((s,b)=>s+(parseFloat(b.amount)||0),0))+"):
"+ov.map(b=>"• "+b.name+" "+fmt(b.amount)+" — "+Math.abs(dueIn(b.dueDate))+"d overdue").join("
")+"

";
      if(soon.length)resp+="📅 Due soon:
"+soon.map(b=>"• "+b.name+" "+fmt(b.amount)+" — "+dueIn(b.dueDate)+"d left").join("
")+"

";
      if(later.length)resp+="Later: "+later.map(b=>b.name+" "+fmt(b.amount)).join(", ");
      return resp.trim()||"✅ No bills due soon!";
    }
    // ── Spending by category ──────────────────────────────────
    if(t.includes("spend on")||t.includes("spent on")||t.includes("how much")||t.includes("category")||t.includes("categor")){
      // Try to find specific category mentioned
      const catMatch=categories.find(c=>t.includes(c.name.toLowerCase()));
      if(catMatch){
        const catAmt=_catTotals[catMatch.name]||0;
        const catTxns=_thisExp.filter(e=>e.category===catMatch.name);
        return catMatch.name+" this month: "+fmt(catAmt)+" ("+catTxns.length+" transactions)"+
          (catTxns.length>0?"
Recent: "+catTxns.slice(-3).map(e=>e.name+" "+fmt(e.amount)).join(", "):"");
      }
      // Show top categories
      if(_topCats.length>0)return"Top spending this month:
"+_topCats.slice(0,6).map((([cat,amt],i)=>(i+1)+". "+cat+": "+fmt(amt))).join("
")+"

Total: "+fmt(_thisTotal);
      return"No spending logged this month yet.";
    }
    // ── General spending / how am I doing ────────────────────
    if(t.includes("how am i")||t.includes("doing this month")||t.includes("this month")||t.includes("spend")){
      const pace=_thisTotal;const dom=new Date().getDate();const dim=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate();
      const projected=(pace/dom)*dim;
      const diff=_prevTotal>0?((pace-_prevTotal)/_prevTotal*100):0;
      return"📊 "+FULL_MOS[new Date().getMonth()]+" so far: "+fmt(pace)+"
Burn rate: "+fmt(pace/dom)+"/day
Projected month-end: "+fmt(projected)+
        (_prevTotal>0?"
"+(diff>0?"⬆️ "+diff.toFixed(0)+"% more":"⬇️ "+Math.abs(diff).toFixed(0)+"% less")+" than last month":"");
    }
    // ── Accounts / balances ───────────────────────────────────
    if(t.includes("balance")||t.includes("account")||t.includes("checking")||t.includes("saving")){
      const total=["checking","savings","cushion","investments"].reduce((s,k)=>s+(parseFloat(accounts[k]||0)),0);
      return"💳 Checking: "+fmt(accounts.checking)+"
💰 Savings: "+fmt(accounts.savings)+
        (parseFloat(accounts.cushion||0)>0?"
🛡️ Cushion: "+fmt(accounts.cushion):"")+
        (parseFloat(accounts.investments||0)>0?"
📈 Investments: "+fmt(accounts.investments):"")+
        "
Total liquid: "+fmt(total);
    }
    // ── Payday / paycheck ────────────────────────────────────
    if(t.includes("payday")||t.includes("paycheck")||t.includes("pay day")||t.includes("next pay")||t.includes("get paid")){
      const days=Math.max(0,Math.ceil((chatNextPay-chatNow)/86400000));
      return"💰 Next payday: "+chatNextPay.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})+
        (days===0?" (Today!)":" ("+days+" days)")+
        "
Expected: "+fmt(parseFloat(income.primary||0))+
        "
Safe to spend until then: "+fmt(sts);
    }
    // ── Income breakdown ──────────────────────────────────────
    if(t.includes("income")||t.includes("earn")||t.includes("make")||t.includes("salary")){
      const sources=[];
      if(income.primary)sources.push("💵 Paycheck ("+income.payFrequency+"): "+fmt(income.primary));
      if(income.other)sources.push("📋 Other: "+fmt(income.other)+"/mo");
      if(income.rental)sources.push("🏠 Rental: "+fmt(income.rental)+"/mo");
      if(income.dividends)sources.push("📈 Dividends: "+fmt(income.dividends)+"/mo");
      if(income.freelance)sources.push("💻 Freelance: "+fmt(income.freelance)+"/mo");
      const mult=chatPayFreq==="Weekly"?4.33:chatPayFreq==="Twice Monthly"?2:chatPayFreq==="Monthly"?1:2.17;
      const monthly=(parseFloat(income.primary||0)*mult)+(parseFloat(income.other||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
      return(sources.length?sources.join("
"):("No income set yet"))+"

Monthly total: "+fmt(monthly)+"
Annual est: "+fmt(monthly*12);
    }
    // ── Goals ────────────────────────────────────────────────
    if(t.includes("goal")||t.includes("saving for")||t.includes("savings goal")){
      if(!savingsGoals.length)return"No savings goals set yet. Say 'add a goal' to create one!";
      return"🎯 Savings Goals:
"+savingsGoals.map(g=>{
        const pct=Math.min(100,(parseFloat(g.saved||0)/parseFloat(g.target||1))*100);
        const rem=Math.max(0,parseFloat(g.target||0)-parseFloat(g.saved||0));
        const mo=parseFloat(g.monthly||0);
        const months=mo>0?Math.ceil(rem/mo):null;
        return(g.icon||"🎯")+" "+g.name+": "+fmt(g.saved||0)+" / "+fmt(g.target)+" ("+pct.toFixed(0)+"%)"+(months?" · "+months+"mo to go":"");
      }).join("
");
    }
    // ── Envelopes / budgets ───────────────────────────────────
    if(t.includes("envelope")||t.includes("budget")||t.includes("reserved")){
      if(!setBGoals||!savingsGoals)return"No envelopes set.";
      // access budgetGoals via the prop
      const allEnvs=typeof setBGoals==="function"?[]:[];
      return"Use the Envelopes section in Spending to manage your variable budgets.";
    }
    // ── Debt ─────────────────────────────────────────────────
    if(t.includes("debt")||t.includes("loan")||t.includes("credit card")||t.includes("owe")){
      const td=debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0);
      const monthlyInt=debts.reduce((s,d)=>s+(parseFloat(d.balance||0)*(parseFloat(d.rate||0)/100/12)),0);
      if(!debts.length)return"✅ No debts tracked! Add one with 'car loan 15000 at 6%'";
      return"💳 Total debt: "+fmt(td)+"
Monthly interest: "+fmt(monthlyInt)+"

"+debts.map(d=>"• "+d.name+": "+fmt(d.balance)+(d.rate?" @ "+d.rate+"%":"")).join("
");
    }
    // ── Net worth ─────────────────────────────────────────────
    if(t.includes("net worth")||t.includes("worth")){
      const ta=["checking","savings","cushion","investments","property","vehicles"].reduce((s,k)=>s+(parseFloat(accounts[k]||0)),0);
      const td=debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0);
      return"📊 Net Worth: "+fmt(ta-td)+"
Assets: "+fmt(ta)+" · Debts: "+fmt(td);
    }
    // ── Top expense / biggest ─────────────────────────────────
    if(t.includes("biggest")||t.includes("largest")||t.includes("most")){
      const top=_thisExp.slice().sort((a,b)=>parseFloat(b.amount)-parseFloat(a.amount))[0];
      const topCat=_topCats[0];
      return(top?"💸 Biggest transaction: "+top.name+" "+fmt(top.amount)+" on "+top.date+"
":"")+(topCat?"📦 Biggest category: "+topCat[0]+" "+fmt(topCat[1]):"");
    }
    // ── Savings rate ─────────────────────────────────────────
    if(t.includes("savings rate")||t.includes("saving rate")||t.includes("savings %")){
      const mult=chatPayFreq==="Weekly"?4.33:chatPayFreq==="Twice Monthly"?2:chatPayFreq==="Monthly"?1:2.17;
      const monthly=(parseFloat(income.primary||0)*mult)+(parseFloat(income.other||0));
      const sr=monthly>0?Math.max(0,(monthly-_thisTotal)/monthly*100):0;
      return"💾 Savings rate: "+sr.toFixed(1)+"%
Income: "+fmt(monthly)+"/mo · Spent: "+fmt(_thisTotal)+" · Saving: "+fmt(Math.max(0,monthly-_thisTotal));
    }
    // ── Subscriptions ─────────────────────────────────────────
    if(t.includes("subscription")||t.includes("recurring charge")){
      const nameMap={};expenses.forEach(e=>{const k=e.name?.toLowerCase().trim();if(!k)return;if(!nameMap[k])nameMap[k]=[];nameMap[k].push(e);});
      const subs=Object.values(nameMap).filter(v=>v.length>=2&&v.map(x=>parseFloat(x.amount)).every((a,_,arr)=>Math.abs(a-arr[0])<1));
      return subs.length?"🔄 Detected "+subs.length+" recurring charges:
"+subs.map(v=>"• "+v[0].name+": "+fmt(v[0].amount)+"/mo").join("
")+"
Total: "+fmt(subs.reduce((s,v)=>s+parseFloat(v[0].amount),0))+"/mo":"No recurring charges detected yet.";
    }
    // ── Health score ──────────────────────────────────────────
    if(t.includes("health")||t.includes("score")||t.includes("grade")){
      const mult=chatPayFreq==="Weekly"?4.33:chatPayFreq==="Twice Monthly"?2:chatPayFreq==="Monthly"?1:2.17;
      const monthly=(parseFloat(income.primary||0)*mult)+(parseFloat(income.other||0));
      const sr=monthly>0?Math.max(0,(monthly-_thisTotal)/monthly*100):0;
      const liquid=parseFloat(accounts.savings||0)+parseFloat(accounts.cushion||0);
      const moExpH=_thisTotal||1;
      const ef=liquid/moExpH;
      const td=debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0);
      const s1=sr>=20?100:sr>=15?85:sr>=10?70:sr>=5?50:30;
      const s2=ef>=6?100:ef>=3?80:ef>=1?55:30;
      const s3=td===0?100:60;
      const overall=Math.round(((s1*.3)+(s2*.3)+(s3*.4))/10);
      const grade=overall>=9?"A+":overall>=8?"A":overall>=7?"B":overall>=6?"C":overall>=5?"D":"F";
      return"❤️ Health Score: "+overall+"/10 ("+grade+")
• Savings rate: "+sr.toFixed(0)+"%
• Emergency fund: "+ef.toFixed(1)+" months
• Debt load: "+(td===0?"Debt free ✅":fmt(td)+" total")+"
Open Health Score tab for full breakdown.";
    }
    // ── Help / what can you do ────────────────────────────────
    if(t.includes("help")||t.includes("what can")||t.includes("commands")||t.includes("how do")){
      return"💬 I can help with:
• "lunch 12" → log expense
• "rent 1200 due 28th" → add bill
• "checking 3200" → update balance
• "can I afford $200?" → check budget
• "how am I doing?" → month recap
• "what did I spend on groceries?"
• "what's my net worth?"
• "when's my next payday?"
• "what are my goals?"
• "show my income"
• "undo" → undo last entry";
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
    <div style={{background:sts>200?`linear-gradient(135deg,${C.green},${C.teal})`:`linear-gradient(135deg,${C.red},#c41230)`,borderRadius:16,padding:"14px 18px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div><div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.7)",textTransform:"uppercase",letterSpacing:.5}}>Safe to Spend</div><div style={{fontFamily:MF,fontSize:28,fontWeight:800,color:"#fff"}}>{fmt(sts)}</div></div>
      <div style={{textAlign:"right",fontSize:12,color:"rgba(255,255,255,.7)"}}><div>{fmt(burn)}/day</div>{history.length>0&&<div style={{fontSize:11}}>type "undo"</div>}</div>
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
  const[q,setQ]=useState("");const[filter,setFilter]=useState("all");
  const results=useMemo(()=>{
    if(!q.trim())return[];
    const t=q.toLowerCase();
    const res=[];
    if(filter==="all"||filter==="expenses")expenses.forEach(e=>{if(e.name?.toLowerCase().includes(t)||e.category?.toLowerCase().includes(t)||e.notes?.toLowerCase().includes(t))res.push({type:"expense",data:e,title:e.name,sub:e.date+" - "+e.category,val:"-"+fmt(e.amount),color:C.red,icon:"💸"});});
    if(filter==="all"||filter==="bills")bills.forEach(b=>{if(b.name?.toLowerCase().includes(t))res.push({type:"bill",data:b,title:b.name,sub:"Due "+fmtDate(b.dueDate)+(b.paid?" - Paid":""),val:fmt(b.amount),color:b.paid?C.green:C.amber,icon:"📅"});});
    if(filter==="all"||filter==="debts")debts.forEach(d=>{if(d.name?.toLowerCase().includes(t))res.push({type:"debt",data:d,title:d.name,sub:(d.type||"Debt")+" - "+d.rate+"%APR",val:fmt(d.balance),color:C.red,icon:"💳"});});
    if(filter==="all"||filter==="trades")trades.forEach(t2=>{if(t2.symbol?.toLowerCase().includes(t)||t2.note?.toLowerCase().includes(t))res.push({type:"trade",data:t2,title:t2.symbol+" "+t2.side,sub:t2.date+(t2.note?" - "+t2.note:""),val:(parseFloat(t2.pnl)>=0?"+":"")+fmt(t2.pnl),color:parseFloat(t2.pnl)>=0?C.green:C.red,icon:parseFloat(t2.pnl)>=0?"📈":"📉"});});
    return res.slice(0,50);
  },[q,filter,expenses,bills,debts,trades]);
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

function InsightsView({expenses,income,bills,debts,budgetGoals,savingsGoals}){
  const[drillCat,setDrillCat]=useState(null);
  const now=new Date();
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
      <div style={{fontSize:13,color:C.textLight,marginBottom:16}}>Deep dive into your spending patterns</div>
      <div style={{background:C.navy,borderRadius:18,padding:20,marginBottom:14,color:"#fff"}}>
        <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>This Month vs Last Month</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:16}}>
          <div><div style={{fontFamily:MF,fontSize:32,fontWeight:800,color:"#fff"}}>{fmt(thisTotal)}</div><div style={{fontSize:12,color:"rgba(255,255,255,.4)",marginTop:2}}>{FULL_MOS[now.getMonth()]} spending</div></div>
          <div style={{textAlign:"right"}}><div style={{fontFamily:MF,fontSize:18,fontWeight:700,color:diff>0?C.redMid:C.greenMid}}>{diff>0?"+":""}{diff.toFixed(1)}%</div><div style={{fontSize:12,color:"rgba(255,255,255,.4)"}}>vs {FULL_MOS[new Date(now.getFullYear(),now.getMonth()-1,1).getMonth()]}</div></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>{[["Daily avg",fmt(dailyAvg),C.accentMid],["Projected",fmt(projectedMonth),C.amberMid],["Last month",fmt(lastTotal),C.textFaint]].map(([l,v,c])=><div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 8px"}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2}}>{l.toUpperCase()}</div><div style={{fontFamily:MF,fontSize:13,fontWeight:700,color:c}}>{v}</div></div>)}</div>
      </div>
      {catSorted.length>0&&<div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:14}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>By Category</div>
        {catSorted.map(([cat,amt],i)=>{
          const lastAmt=lastCatMap[cat]||0;
          const catDiff=lastAmt>0?((amt-lastAmt)/lastAmt*100):0;
          const isOpen=drillCat===cat;
          const catTxns=thisExp.filter(e=>e.category===cat).sort((a,b)=>new Date(b.date)-new Date(a.date));
          return(<div key={cat} style={{marginBottom:8}}>
            <div onClick={()=>setDrillCat(isOpen?null:cat)} style={{display:"flex",justifyContent:"space-between",marginBottom:5,cursor:"pointer",padding:"6px 8px",borderRadius:10,background:isOpen?PIE_COLORS[i%PIE_COLORS.length]+"12":"transparent",border:isOpen?`1px solid ${PIE_COLORS[i%PIE_COLORS.length]}30`:"1px solid transparent",transition:"background .15s"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:"50%",background:PIE_COLORS[i%PIE_COLORS.length]}}/><span style={{fontSize:13,fontWeight:600,color:C.text}}>{cat}</span><span style={{fontSize:10,color:C.textLight,fontWeight:500}}>{catTxns.length} txn{catTxns.length!==1?"s":""}</span></div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {lastAmt>0&&<span style={{fontSize:11,color:catDiff>10?C.red:catDiff<-10?C.green:C.textLight,fontWeight:600}}>{catDiff>0?"+":""}{catDiff.toFixed(0)}%</span>}
                <span style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.text}}>{fmt(amt)}</span>
                <span style={{fontSize:10,color:PIE_COLORS[i%PIE_COLORS.length],fontWeight:700}}>{isOpen?"▲":"▼"}</span>
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
  const safeToSpend=Math.max(0,checking+_pvOtherProRated-beforeTotal-projectedSpend-_pvEnvReserve-200);
  return(
    <div className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.3}}>Paycheck Planner</div>
        <button className="ba" onClick={onAdd} style={{display:"flex",alignItems:"center",gap:5,background:C.accent,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer"}}><Plus size={13}/>Log Spending</button>
      </div>
      {(()=>{
        const[editSched,setEditSched]=React.useState(false);
        const[localFreq,setLocalFreq]=React.useState(payFreq);
        const[localDate,setLocalDate]=React.useState(income.lastPayDate||"");
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
  const totalAssets=(parseFloat(accounts.checking||0))+(parseFloat(accounts.savings||0))+(parseFloat(accounts.cushion||0))+(parseFloat(accounts.investments||0))+(parseFloat(accounts.property||0))+(parseFloat(accounts.vehicles||0));
  const currentNW=totalAssets-totalDebt;
  const chartData=balHist.map(h=>({date:h.date,assets:(h.checking||0)+(h.savings||0)+(h.cushion||0)+(h.investments||0),netWorth:((h.checking||0)+(h.savings||0)+(h.cushion||0)+(h.investments||0))-totalDebt})).slice(-52);
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
          {name:"Checking",value:parseFloat(accounts.checking||0),color:C.teal},
          {name:"Savings",value:parseFloat(accounts.savings||0)+(parseFloat(accounts.cushion||0)),color:C.green},
          {name:"Investments",value:parseFloat(accounts.investments||0),color:C.accent},
          {name:"Property",value:parseFloat(accounts.property||0)+(parseFloat(accounts.vehicles||0)),color:C.purple},
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
}function SpendingView({expenses,setExpenses,budgetGoals,setBGoals,categories,setEditItem,onAdd,showToast}){
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
    if(tagFilter!=="all"){base=base.filter(e=>(e.tags||[]).includes(tagFilter));}
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
}function BillsView({bills,setBills,setEditItem,onAdd,showToast}){
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
      {bills.sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate)).map(b=>{
        const d=dueIn(b.dueDate);
        const uc=b.paid?C.green:d<0?C.red:d<=3?C.red:d<=7?C.amber:C.textLight;
        const ul=b.paid?"Paid ✓":d<0?Math.abs(d)+"d overdue":d===0?"Due today!":d<=7?"Due in "+d+"d":"Due "+fmtDate(b.dueDate);
        return(
          <div key={b.id} style={{marginBottom:8}}>
            <div className="rw" style={{display:"flex",alignItems:"center",gap:12,padding:"14px 14px",background:C.surface,border:`1.5px solid ${b.paid?C.border:d<0?C.redMid:d<=7?C.amberMid:C.border}`,borderRadius:14}}>
              <button onClick={()=>{setBills(p=>p.map(x=>{if(x.id!==b.id)return x;const nowPaid=!x.paid;if(nowPaid)setTimeout(()=>showToast&&showToast("✓ Paid — "+x.name),0);if(nowPaid&&x.recurring&&x.recurring!=="One-time"){return{...x,paid:true,dueDate:advanceDueDate(x.dueDate,1),paidDate:todayStr()};}return{...x,paid:nowPaid};}));}} style={{background:"none",border:"none",cursor:"pointer",color:b.paid?C.green:C.border,padding:0,display:"flex",flexShrink:0}}>{b.paid?<CheckCircle2 size={22}/>:<Circle size={22}/>}</button>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600,color:b.paid?C.textLight:C.text,textDecoration:b.paid?"line-through":"none"}}>{b.name}</div>
                <div style={{fontSize:12,marginTop:2,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{color:uc,fontWeight:500}}>{ul}</span>
                  {b.recurring&&b.recurring!=="One-time"&&<span style={{color:C.textLight}}>{b.recurring}</span>}{b.notes&&<span style={{color:C.textFaint,fontSize:11}}>· {b.notes}</span>}
                  {b.autoPay&&<span style={{background:C.accentBg,color:C.accent,fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:99}}>AUTO-PAY</span>}
                </div>
              </div>
              <div style={{fontFamily:MF,fontWeight:700,fontSize:16,color:b.paid?C.textLight:C.text}}>{fmt(b.amount)}</div>
              <button className="ba" onClick={()=>setEditItem({type:"bill",data:b})} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,fontSize:11,fontWeight:600,padding:"4px 6px"}}>Edit</button>
              <button className="ba" onClick={()=>{setBills(p=>p.filter(x=>x.id!==b.id));showToast&&showToast("Bill removed","error");}} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,padding:"4px 3px",display:"flex"}}><Trash2 size={13}/></button>
            </div>
          </div>
        );
      })}
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
    const minPay=d.minPayment?parseFloat(d.minPayment):Math.max(25,bal*0.02+(rate*bal));
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
                <input type="range" min="0" max="500" step="25" value={extraPayDebt} onChange={e=>setExtraPayDebt(parseInt(e.target.value))} style={{width:"100%",accentColor:C.green,cursor:"pointer",marginBottom:8}}/>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"rgba(255,255,255,.3)",marginBottom:extraPayDebt>0?10:0}}><span>$0</span><span>$250</span><span>$500</span></div>
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

function SavingsGoalsView({goals,setGoals,income,showToast}){
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
        {[["rings","Rings"],["list","List"]].map(([id,l])=>(<button key={id} onClick={()=>setView(id)} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",background:view===id?C.surface:"transparent",color:view===id?C.accent:C.textLight,fontWeight:view===id?700:500,fontSize:13,cursor:"pointer"}}>{l}</button>))}
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

function EditModal({item,categories,onSave,onDelete,onClose}){
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
      {type==="expense"&&<><div style={{display:"flex",gap:12}}><FI half label="Amount ($)" type="number" value={form.amount||""} onChange={e=>ff("amount",e.target.value)}/><FI half label="Date" type="date" value={form.date||todayStr()} onChange={e=>ff("date",e.target.value)}/></div><FS label="Category" options={categories.map(c=>c.name)} value={form.category||""} onChange={e=>ff("category",e.target.value)}/><FI label="Notes" value={form.notes||""} onChange={e=>ff("notes",e.target.value)}/><div style={{marginBottom:12}}><div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Tags</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{["food","transport","health","work","personal","family","fun","recurring"].map(tag=>{const on=(form.tags||[]).includes(tag);return(<button key={tag} onClick={()=>ff("tags",on?(form.tags||[]).filter(t=>t!==tag):[...(form.tags||[]),tag])} style={{padding:"5px 12px",borderRadius:99,border:`1.5px solid ${on?C.accent:C.border}`,background:on?C.accentBg:C.surface,color:on?C.accent:C.textMid,fontSize:12,fontWeight:on?700:500,cursor:"pointer"}}>{tag}</button>);})}</div></div></>}
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
  const ta=(parseFloat(accounts.checking||0))+(parseFloat(accounts.savings||0))+(parseFloat(accounts.cushion||0))+(parseFloat(accounts.investments||0))+(parseFloat(accounts.property||0))+(parseFloat(accounts.vehicles||0));
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

function SettingsView({settings,setSettings,appName,setAppName,greetName,setGreetName,onResetAllData,darkMode,setDarkMode,pinEnabled,setPinEnabled,profCategory,setProfCategory,profSub,setProfSub,expenses,bills,debts,trades,accounts,income,shifts,savingsGoals,budgetGoals,setBills,setDebts,setTrades,setShifts,setSGoals,setBGoals,setAccounts,setIncome,setExpenses,categories,setCategories,onResetOnboarding,onSignOut,onSignIn,userEmail,showToast}){
  const[nm,setNm]=useState(appName||"");
  const[showPIN,setShowPIN]=useState(false);

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
      {onSignOut&&<button className="ba" onClick={()=>onSignOut()} style={{width:"100%",marginBottom:8,background:C.redBg,border:`1px solid ${C.redMid}`,borderRadius:12,padding:"12px 0",color:C.red,fontWeight:700,fontSize:14,cursor:"pointer"}}>Sign Out</button>}
      {onSignIn&&<button className="ba" onClick={onSignIn} style={{width:"100%",background:`linear-gradient(135deg,${C.accent},${C.green})`,border:"none",borderRadius:12,padding:"12px 0",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>Sign In / Create Account</button>}
    </div>

  </div>);
}
function generateDemoData(){
  const now=new Date(),yr=now.getFullYear();
  const expenses=[],bills=[],debts=[],trades=[],shifts=[],savingsGoals=[],budgetGoals=[],balHist=[];
  const ET=[
    ["Chipotle","Food",[11,15]],["Publix Groceries","Food",[80,160]],["Starbucks","Food",[6,9]],
    ["McDonald's","Food",[8,14]],["DoorDash","Food",[22,45]],["Shell Gas","Transport",[50,85]],
    ["Uber","Transport",[12,28]],["Netflix","Subscriptions",[15,16]],["Spotify","Subscriptions",[10,11]],
    ["Apple iCloud","Subscriptions",[3,3]],["Gym Membership","Subscriptions",[45,45]],
    ["Walgreens","Health",[15,60]],["Target","Personal",[35,120]],["Amazon","Personal",[25,95]],
    ["Barber","Personal",[30,35]],["AMC Movies","Entertainment",[18,30]],
    ["Cheesecake Factory","Food",[45,75]],["Home Depot","Housing",[35,180]],
    ["Car Wash","Transport",[15,25]],["CVS Pharmacy","Health",[18,45]],
  ];
  for(let mo=0;mo<12;mo++){
    const isFutureMo=mo>now.getMonth(),isCurMo=mo===now.getMonth();
    const dim=new Date(yr,mo+1,0).getDate();
    const maxDay=isFutureMo?0:isCurMo?Math.max(1,now.getDate()-1):dim;
    if(!maxDay)continue;
    const count=20+Math.floor(Math.random()*16);
    for(let i=0;i<count;i++){
      const[name,cat,range]=ET[Math.floor(Math.random()*ET.length)];
      const day=1+Math.floor(Math.random()*Math.max(1,maxDay-1));
      const amt=(range[0]+Math.random()*(range[1]-range[0])).toFixed(2);
      expenses.push({id:Date.now()+mo*10000+i,name,category:cat,amount:amt,date:yr+"-"+String(mo+1).padStart(2,"0")+"-"+String(day).padStart(2,"0"),notes:""});
    }
  }
  const BT=[["Rent","1450","01"],["Electric","87","15"],["Internet (Xfinity)","65","22"],["Phone (T-Mobile)","95","08"],["Renters Insurance","22","01"],["Car Insurance","148","10"],["Hulu","18","18"],["Student Loan","320","05"]];
  const today2=new Date();
  BT.forEach(([name,amount,day],idx)=>{
    for(let mo2=0;mo2<12;mo2++){
      const due=yr+"-"+String(mo2+1).padStart(2,"0")+"-"+day;
      bills.push({id:(idx+1)*100+mo2,name,amount,dueDate:due,paid:new Date(due+"T00:00:00")<today2,recurring:"Monthly",autoPay:false});
    }
  });
  debts.push(
    {id:2001,name:"Student Loans",balance:"18400",original:"24000",rate:"5.75",minPayment:"320",type:"Student Loan"},
    {id:2002,name:"Car Loan",balance:"9200",original:"15000",rate:"6.9",minPayment:"285",type:"Car Loan"},
    {id:2003,name:"Capital One Visa",balance:"2340",original:"3000",rate:"22.99",minPayment:"58",type:"Credit Card"}
  );
  const syms=["ES","NQ","CL","GC","MES","MNQ"];
  for(let mo=0;mo<12;mo++){
    const n=6+Math.floor(Math.random()*8);
    for(let i=0;i<n;i++){
      const isWin=Math.random()>0.42;
      const pnl=isWin?(80+Math.random()*620).toFixed(0):"-"+(60+Math.random()*340).toFixed(0);
      const day=2+Math.floor(Math.random()*25);
      trades.push({id:Date.now()+50000+mo*200+i,date:yr+"-"+String(mo+1).padStart(2,"0")+"-"+String(day).padStart(2,"0"),symbol:syms[Math.floor(Math.random()*syms.length)],side:Math.random()>0.5?"Long":"Short",contracts:"1",pnl,entry:"",exit:"",note:isWin?"Good setup":"Stopped out"});
    }
  }
  const ST=["Regular","Regular","Regular","Overtime","Night","Weekend"];
  const mults={Regular:1,Overtime:1.5,Night:1.15,Weekend:1.25};
  for(let mo=0;mo<12;mo++){
    for(let wk=0;wk<4;wk++){
      const day=Math.min(wk*7+1+Math.floor(Math.random()*5),28);
      const type=ST[Math.floor(Math.random()*ST.length)];
      const hours=(type==="Overtime"?12:(8+Math.random()*4)).toFixed(1);
      const rate="36.50";
      shifts.push({id:Date.now()+80000+mo*100+wk,date:yr+"-"+String(mo+1).padStart(2,"0")+"-"+String(day).padStart(2,"0"),type,hours,rate,gross:(parseFloat(hours)*parseFloat(rate)*(mults[type]||1)).toFixed(2),note:"ICU"});
    }
  }
  savingsGoals.push(
    {id:3001,name:"Emergency Fund",icon:"🛡️",target:"18000",saved:"9400",monthly:"400"},
    {id:3002,name:"New Car",icon:"🚗",target:"8000",saved:"2100",monthly:"250"},
    {id:3003,name:"Vacation",icon:"✈️",target:"3500",saved:"850",monthly:"150"},
    {id:3004,name:"Trading Account",icon:"📈",target:"10000",saved:"5200",monthly:"200"}
  );
  budgetGoals.push(
    {id:4001,category:"Food",limit:"600"},{id:4002,category:"Transport",limit:"200"},
    {id:4003,category:"Entertainment",limit:"150"},{id:4004,category:"Personal",limit:"200"},{id:4005,category:"Subscriptions",limit:"100"}
  );
  let bal=3200;
  for(let mo=0;mo<12;mo++){
    for(let wk=0;wk<4;wk++){
      const day=wk*7+1;if(day>28)continue;
      bal=Math.max(1800,bal+(Math.random()-.4)*400);
      balHist.push({date:yr+"-"+String(mo+1).padStart(2,"0")+"-"+String(day).padStart(2,"0"),checking:parseFloat((bal*.6).toFixed(0)),savings:parseFloat((bal*.3).toFixed(0)),cushion:parseFloat((bal*.1).toFixed(0)),investments:parseFloat((12000+mo*180+Math.random()*300).toFixed(0)),total:parseFloat(bal.toFixed(0))});
    }
  }
  return{expenses,bills,debts,trades,shifts,savingsGoals,budgetGoals,balHist};
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
}function SpendingView({expenses,setExpenses,budgetGoals,setBGoals,categories,setEditItem,onAdd,showToast}){
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
    if(tagFilter!=="all"){base=base.filter(e=>(e.tags||[]).includes(tagFilter));}
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
}function BillsView({bills,setBills,setEditItem,onAdd,showToast}){
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
      {bills.sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate)).map(b=>{
        const d=dueIn(b.dueDate);
        const uc=b.paid?C.green:d<0?C.red:d<=3?C.red:d<=7?C.amber:C.textLight;
        const ul=b.paid?"Paid ✓":d<0?Math.abs(d)+"d overdue":d===0?"Due today!":d<=7?"Due in "+d+"d":"Due "+fmtDate(b.dueDate);
        return(
          <div key={b.id} style={{marginBottom:8}}>
            <div className="rw" style={{display:"flex",alignItems:"center",gap:12,padding:"14px 14px",background:C.surface,border:`1.5px solid ${b.paid?C.border:d<0?C.redMid:d<=7?C.amberMid:C.border}`,borderRadius:14}}>
              <button onClick={()=>{setBills(p=>p.map(x=>{if(x.id!==b.id)return x;const nowPaid=!x.paid;if(nowPaid)setTimeout(()=>showToast&&showToast("✓ Paid — "+x.name),0);if(nowPaid&&x.recurring&&x.recurring!=="One-time"){return{...x,paid:true,dueDate:advanceDueDate(x.dueDate,1),paidDate:todayStr()};}return{...x,paid:nowPaid};}));}} style={{background:"none",border:"none",cursor:"pointer",color:b.paid?C.green:C.border,padding:0,display:"flex",flexShrink:0}}>{b.paid?<CheckCircle2 size={22}/>:<Circle size={22}/>}</button>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600,color:b.paid?C.textLight:C.text,textDecoration:b.paid?"line-through":"none"}}>{b.name}</div>
                <div style={{fontSize:12,marginTop:2,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{color:uc,fontWeight:500}}>{ul}</span>
                  {b.recurring&&b.recurring!=="One-time"&&<span style={{color:C.textLight}}>{b.recurring}</span>}{b.notes&&<span style={{color:C.textFaint,fontSize:11}}>· {b.notes}</span>}
                  {b.autoPay&&<span style={{background:C.accentBg,color:C.accent,fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:99}}>AUTO-PAY</span>}
                </div>
              </div>
              <div style={{fontFamily:MF,fontWeight:700,fontSize:16,color:b.paid?C.textLight:C.text}}>{fmt(b.amount)}</div>
              <button className="ba" onClick={()=>setEditItem({type:"bill",data:b})} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,fontSize:11,fontWeight:600,padding:"4px 6px"}}>Edit</button>
              <button className="ba" onClick={()=>{setBills(p=>p.filter(x=>x.id!==b.id));showToast&&showToast("Bill removed","error");}} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,padding:"4px 3px",display:"flex"}}><Trash2 size={13}/></button>
            </div>
          </div>
        );
      })}
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
    const minPay=d.minPayment?parseFloat(d.minPayment):Math.max(25,bal*0.02+(rate*bal));
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
                <input type="range" min="0" max="500" step="25" value={extraPayDebt} onChange={e=>setExtraPayDebt(parseInt(e.target.value))} style={{width:"100%",accentColor:C.green,cursor:"pointer",marginBottom:8}}/>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"rgba(255,255,255,.3)",marginBottom:extraPayDebt>0?10:0}}><span>$0</span><span>$250</span><span>$500</span></div>
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

function SavingsGoalsView({goals,setGoals,income,showToast}){
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
        {[["rings","Rings"],["list","List"]].map(([id,l])=>(<button key={id} onClick={()=>setView(id)} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",background:view===id?C.surface:"transparent",color:view===id?C.accent:C.textLight,fontWeight:view===id?700:500,fontSize:13,cursor:"pointer"}}>{l}</button>))}
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

function EditModal({item,categories,onSave,onDelete,onClose}){
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
      {type==="expense"&&<><div style={{display:"flex",gap:12}}><FI half label="Amount ($)" type="number" value={form.amount||""} onChange={e=>ff("amount",e.target.value)}/><FI half label="Date" type="date" value={form.date||todayStr()} onChange={e=>ff("date",e.target.value)}/></div><FS label="Category" options={categories.map(c=>c.name)} value={form.category||""} onChange={e=>ff("category",e.target.value)}/><FI label="Notes" value={form.notes||""} onChange={e=>ff("notes",e.target.value)}/><div style={{marginBottom:12}}><div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Tags</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{["food","transport","health","work","personal","family","fun","recurring"].map(tag=>{const on=(form.tags||[]).includes(tag);return(<button key={tag} onClick={()=>ff("tags",on?(form.tags||[]).filter(t=>t!==tag):[...(form.tags||[]),tag])} style={{padding:"5px 12px",borderRadius:99,border:`1.5px solid ${on?C.accent:C.border}`,background:on?C.accentBg:C.surface,color:on?C.accent:C.textMid,fontSize:12,fontWeight:on?700:500,cursor:"pointer"}}>{tag}</button>);})}</div></div></>}
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
  const ta=(parseFloat(accounts.checking||0))+(parseFloat(accounts.savings||0))+(parseFloat(accounts.cushion||0))+(parseFloat(accounts.investments||0))+(parseFloat(accounts.property||0))+(parseFloat(accounts.vehicles||0));
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

function SettingsView({settings,setSettings,appName,setAppName,greetName,setGreetName,onResetAllData,darkMode,setDarkMode,pinEnabled,setPinEnabled,profCategory,setProfCategory,profSub,setProfSub,expenses,bills,debts,trades,accounts,income,shifts,savingsGoals,budgetGoals,setBills,setDebts,setTrades,setShifts,setSGoals,setBGoals,setAccounts,setIncome,setExpenses,categories,setCategories,onResetOnboarding,onSignOut,onSignIn,userEmail,showToast}){
  const[nm,setNm]=useState(appName||"");
  const[showPIN,setShowPIN]=useState(false);

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
      {onSignOut&&<button className="ba" onClick={()=>onSignOut()} style={{width:"100%",marginBottom:8,background:C.redBg,border:`1px solid ${C.redMid}`,borderRadius:12,padding:"12px 0",color:C.red,fontWeight:700,fontSize:14,cursor:"pointer"}}>Sign Out</button>}
      {onSignIn&&<button className="ba" onClick={onSignIn} style={{width:"100%",background:`linear-gradient(135deg,${C.accent},${C.green})`,border:"none",borderRadius:12,padding:"12px 0",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>Sign In / Create Account</button>}
    </div>

  </div>);
}
function generateDemoData(){
  const now=new Date(),yr=now.getFullYear();
  const expenses=[],bills=[],debts=[],trades=[],shifts=[],savingsGoals=[],budgetGoals=[],balHist=[];
  const ET=[
    ["Chipotle","Food",[11,15]],["Publix Groceries","Food",[80,160]],["Starbucks","Food",[6,9]],
    ["McDonald's","Food",[8,14]],["DoorDash","Food",[22,45]],["Shell Gas","Transport",[50,85]],
    ["Uber","Transport",[12,28]],["Netflix","Subscriptions",[15,16]],["Spotify","Subscriptions",[10,11]],
    ["Apple iCloud","Subscriptions",[3,3]],["Gym Membership","Subscriptions",[45,45]],
    ["Walgreens","Health",[15,60]],["Target","Personal",[35,120]],["Amazon","Personal",[25,95]],
    ["Barber","Personal",[30,35]],["AMC Movies","Entertainment",[18,30]],
    ["Cheesecake Factory","Food",[45,75]],["Home Depot","Housing",[35,180]],
    ["Car Wash","Transport",[15,25]],["CVS Pharmacy","Health",[18,45]],
  ];
  for(let mo=0;mo<12;mo++){
    const isFutureMo=mo>now.getMonth(),isCurMo=mo===now.getMonth();
    const dim=new Date(yr,mo+1,0).getDate();
    const maxDay=isFutureMo?0:isCurMo?Math.max(1,now.getDate()-1):dim;
    if(!maxDay)continue;
    const count=20+Math.floor(Math.random()*16);
    for(let i=0;i<count;i++){
      const[name,cat,range]=ET[Math.floor(Math.random()*ET.length)];
      const day=1+Math.floor(Math.random()*Math.max(1,maxDay-1));
      const amt=(range[0]+Math.random()*(range[1]-range[0])).toFixed(2);
      expenses.push({id:Date.now()+mo*10000+i,name,category:cat,amount:amt,date:yr+"-"+String(mo+1).padStart(2,"0")+"-"+String(day).padStart(2,"0"),notes:""});
    }
  }
  const BT=[["Rent","1450","01"],["Electric","87","15"],["Internet (Xfinity)","65","22"],["Phone (T-Mobile)","95","08"],["Renters Insurance","22","01"],["Car Insurance","148","10"],["Hulu","18","18"],["Student Loan","320","05"]];
  const today2=new Date();
  BT.forEach(([name,amount,day],idx)=>{
    for(let mo2=0;mo2<12;mo2++){
      const due=yr+"-"+String(mo2+1).padStart(2,"0")+"-"+day;
      bills.push({id:(idx+1)*100+mo2,name,amount,dueDate:due,paid:new Date(due+"T00:00:00")<today2,recurring:"Monthly",autoPay:false});
    }
  });
  debts.push(
    {id:2001,name:"Student Loans",balance:"18400",original:"24000",rate:"5.75",minPayment:"320",type:"Student Loan"},
    {id:2002,name:"Car Loan",balance:"9200",original:"15000",rate:"6.9",minPayment:"285",type:"Car Loan"},
    {id:2003,name:"Capital One Visa",balance:"2340",original:"3000",rate:"22.99",minPayment:"58",type:"Credit Card"}
  );
  const syms=["ES","NQ","CL","GC","MES","MNQ"];
  for(let mo=0;mo<12;mo++){
    const n=6+Math.floor(Math.random()*8);
    for(let i=0;i<n;i++){
      const isWin=Math.random()>0.42;
      const pnl=isWin?(80+Math.random()*620).toFixed(0):"-"+(60+Math.random()*340).toFixed(0);
      const day=2+Math.floor(Math.random()*25);
      trades.push({id:Date.now()+50000+mo*200+i,date:yr+"-"+String(mo+1).padStart(2,"0")+"-"+String(day).padStart(2,"0"),symbol:syms[Math.floor(Math.random()*syms.length)],side:Math.random()>0.5?"Long":"Short",contracts:"1",pnl,entry:"",exit:"",note:isWin?"Good setup":"Stopped out"});
    }
  }
  const ST=["Regular","Regular","Regular","Overtime","Night","Weekend"];
  const mults={Regular:1,Overtime:1.5,Night:1.15,Weekend:1.25};
  for(let mo=0;mo<12;mo++){
    for(let wk=0;wk<4;wk++){
      const day=Math.min(wk*7+1+Math.floor(Math.random()*5),28);
      const type=ST[Math.floor(Math.random()*ST.length)];
      const hours=(type==="Overtime"?12:(8+Math.random()*4)).toFixed(1);
      const rate="36.50";
      shifts.push({id:Date.now()+80000+mo*100+wk,date:yr+"-"+String(mo+1).padStart(2,"0")+"-"+String(day).padStart(2,"0"),type,hours,rate,gross:(parseFloat(hours)*parseFloat(rate)*(mults[type]||1)).toFixed(2),note:"ICU"});
    }
  }
  savingsGoals.push(
    {id:3001,name:"Emergency Fund",icon:"🛡️",target:"18000",saved:"9400",monthly:"400"},
    {id:3002,name:"New Car",icon:"🚗",target:"8000",saved:"2100",monthly:"250"},
    {id:3003,name:"Vacation",icon:"✈️",target:"3500",saved:"850",monthly:"150"},
    {id:3004,name:"Trading Account",icon:"📈",target:"10000",saved:"5200",monthly:"200"}
  );
  budgetGoals.push(
    {id:4001,category:"Food",limit:"600"},{id:4002,category:"Transport",limit:"200"},
    {id:4003,category:"Entertainment",limit:"150"},{id:4004,category:"Personal",limit:"200"},{id:4005,category:"Subscriptions",limit:"100"}
  );
  let bal=3200;
  for(let mo=0;mo<12;mo++){
    for(let wk=0;wk<4;wk++){
      const day=wk*7+1;if(day>28)continue;
      bal=Math.max(1800,bal+(Math.random()-.4)*400);
      balHist.push({date:yr+"-"+String(mo+1).padStart(2,"0")+"-"+String(day).padStart(2,"0"),checking:parseFloat((bal*.6).toFixed(0)),savings:parseFloat((bal*.3).toFixed(0)),cushion:parseFloat((bal*.1).toFixed(0)),investments:parseFloat((12000+mo*180+Math.random()*300).toFixed(0)),total:parseFloat(bal.toFixed(0))});
    }
  }
  return{expenses,bills,debts,trades,shifts,savingsGoals,budgetGoals,balHist};
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