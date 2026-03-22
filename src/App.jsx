import React, { useState, useEffect, useCallback, useMemo } from "react";
import { LayoutDashboard, Wallet, CalendarClock, CreditCard, Target,
  Plus, Trash2, CheckCircle2, Circle, TrendingUp, AlertCircle, X,
  Calculator, Edit3, Save, MessageCircle, Send, DollarSign,
  Check, Sparkles, Bell, Settings, Activity, ToggleLeft, ToggleRight,
  ChevronRight, BarChart2, Menu, Calendar, Eye, EyeOff, Search, Zap,
  FileText, Download, Clock, Moon, Sun, Lock, RefreshCw, ChevronDown,
  Filter, Database, PiggyBank } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, BarChart, Bar, Cell, PieChart, Pie } from "recharts";

const SUPA_URL = "https://lkxznfbcnvsbugffvobw.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxreHpuZmJjbnZzYnVnZmZ2b2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwODQ5MzAsImV4cCI6MjA4OTY2MDkzMH0.Fb1R7H5ltCRSnzTZpgAndrnDXUEPxKfqsy0fZ5ZtAuU";

async function supaFetch(path, opts={}) {
  const s = JSON.parse(localStorage.getItem("fv_session")||"null");
  const token = s?.access_token;
  const headers = {"Content-Type":"application/json","apikey":SUPA_KEY,...(token?{"Authorization":"Bearer "+token}:{}),...(opts.headers||{})};
  try {
    const res = await fetch(SUPA_URL+path, {...opts, headers});
    const data = await res.json().catch(()=>({}));
    if (!res.ok) return {data:null,error:data};
    return {data,error:null};
  } catch(e) { return {data:null,error:{message:e.message}}; }
}

async function signIn(email, password) {
  const res = await fetch(SUPA_URL+"/auth/v1/token?grant_type=password",{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPA_KEY},body:JSON.stringify({email,password})});
  const data = await res.json();
  if (data.access_token) localStorage.setItem("fv_session",JSON.stringify(data));
  return data;
}

async function signUp(email, password) {
  const res = await fetch(SUPA_URL+"/auth/v1/signup",{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPA_KEY},body:JSON.stringify({email,password})});
  const data = await res.json();
  if (data.access_token) localStorage.setItem("fv_session",JSON.stringify(data));
  return data;
}

const C = {
  bg:"#F4F6FB", surface:"#FFFFFF", surfaceAlt:"#F4F6FB",
  border:"#CBD5E1", borderLight:"#DDE3EE",
  navy:"#0D1B2A", navyMid:"#1A3557", navyLight:"#2A4A7F",
  accent:"#2563EB", accentBg:"#EFF6FF", accentMid:"#BFDBFE",
  green:"#10B981", greenBg:"#DCFCE7", greenMid:"#6EE7B7",
  red:"#EF4444", redBg:"#FEE2E2", redMid:"#FCA5A5",
  amber:"#F59E0B", amberBg:"#FEF3C7", amberMid:"#FDE68A",
  purple:"#7C3AED", purpleBg:"#F5F3FF", purpleMid:"#DDD6FE",
  text:"#0D1B2A", textMid:"#334155", textLight:"#64748B", textFaint:"#94A3B8",
  slate:"#64748B",
};
const PIE_COLORS = [C.accent,C.green,C.amber,C.red,C.purple,"#0891B2","#DB2777","#EA580C"];
const MF = "'Manrope',sans-serif";
const IF = "'Inter',sans-serif";
const MOS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DEF_CATS = [
  {id:"food",name:"Food",icon:"🍔"},{id:"housing",name:"Housing",icon:"🏠"},
  {id:"transport",name:"Transport",icon:"🚗"},{id:"bills_cat",name:"Bills",icon:"📄"},
  {id:"health",name:"Health",icon:"🏥"},{id:"personal",name:"Personal",icon:"👤"},
  {id:"entertainment",name:"Entertainment",icon:"🎮"},{id:"savings_cat",name:"Savings",icon:"💰"},
  {id:"misc",name:"Misc",icon:"📦"},
];
const fmt = n => "$"+Number(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtK = n => { const v=Number(n||0); return v>=1000?"$"+(v/1000).toFixed(1)+"k":fmt(v); };
const todayStr = () => new Date().toISOString().split("T")[0];
const dueIn = d => Math.ceil((new Date(d)-new Date(todayStr()))/86400000);
const daysInMonth = () => { const t=new Date(); return new Date(t.getFullYear(),t.getMonth()+1,0).getDate(); };
const dayOfMonth = () => new Date().getDate();
const fmtDate = s => { if(!s)return""; const d=new Date(s+"T00:00:00"); return MOS[d.getMonth()]+" "+d.getDate(); };
const sg = async k => { try { const r=localStorage.getItem(k); return r?JSON.parse(r):null; } catch { return null; } };
const ss = async (k,v) => { try { localStorage.setItem(k,JSON.stringify(v)); } catch {} };

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Manrope:wght@500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{background:#F4F6FB;font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#dde1e7;border-radius:4px}
input,select,button,textarea{font-family:'Inter',sans-serif}
.fu{animation:fadeUp .22s ease both}
.ba{transition:opacity .12s,transform .1s;cursor:pointer;border:none;background:none}.ba:active{transform:scale(.97)}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
input,select{-webkit-appearance:none}
button{-webkit-tap-highlight-color:transparent}
`;

class ErrorBoundary extends React.Component {
  constructor(p){super(p);this.state={err:null};}
  static getDerivedStateFromError(e){return{err:e};}
  componentDidCatch(e,info){console.error("Trackfi Error:",e?.message,info);}
  render(){
    if(this.state.err)return(
      <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <style>{CSS}</style>
        <div style={{background:C.surface,borderRadius:18,padding:28,maxWidth:380,width:"100%",textAlign:"center"}}>
          <div style={{fontSize:36,marginBottom:12}}>⚠️</div>
          <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.navy,marginBottom:8}}>Something went wrong</div>
          <div style={{fontSize:13,color:C.textLight,marginBottom:20}}>{this.state.err?.message||"Unknown error"}</div>
          <button onClick={()=>this.setState({err:null})} style={{background:C.accent,color:"#fff",border:"none",borderRadius:12,padding:"12px 24px",fontFamily:MF,fontWeight:700,fontSize:14,cursor:"pointer",width:"100%"}}>Reload App</button>
        </div>
      </div>
    );
    return this.props.children;
  }
}

function BarProg({pct,color=C.accent,h=5}){
  return <div style={{background:C.borderLight,borderRadius:99,height:h,overflow:"hidden"}}><div style={{width:Math.min(100,Math.max(0,pct))+"%",height:"100%",background:color,borderRadius:99,transition:"width .4s ease"}}/></div>;
}

function Empty({text,icon:Icon=DollarSign,cta,onCta}){
  return(
    <div style={{textAlign:"center",padding:"40px 20px"}}>
      <div style={{width:56,height:56,borderRadius:18,background:C.accentBg,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}><Icon size={24} color={C.accent}/></div>
      <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:4}}>{text}</div>
      {cta&&<button onClick={onCta} style={{marginTop:12,background:C.accent,color:"#fff",border:"none",borderRadius:10,padding:"8px 20px",fontFamily:MF,fontWeight:700,fontSize:13,cursor:"pointer"}}>{cta}</button>}
    </div>
  );
}

function SH({title,sub,onAdd,addLabel="Add",right}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <div>
        <div style={{fontFamily:MF,fontSize:19,fontWeight:800,color:C.text,letterSpacing:-.3}}>{title}</div>
        {sub&&<div style={{fontSize:12,color:C.textLight,marginTop:2}}>{sub}</div>}
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        {right}
        {onAdd&&<button onClick={onAdd} className="ba" style={{background:C.accent,color:"#fff",borderRadius:10,padding:"7px 14px",fontFamily:MF,fontWeight:700,fontSize:13,display:"flex",alignItems:"center",gap:5}}><Plus size={14}/>{addLabel}</button>}
      </div>
    </div>
  );
}

function Modal({title,icon:Icon,onClose,onSubmit,submitLabel="Save",children}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:C.surface,borderRadius:"24px 24px 0 0",padding:24,width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {Icon&&<div style={{background:C.accentBg,borderRadius:10,padding:8}}><Icon size={18} color={C.accent}/></div>}
            <div style={{fontFamily:MF,fontSize:17,fontWeight:800,color:C.text}}>{title}</div>
          </div>
          <button onClick={onClose} className="ba" style={{color:C.textLight}}><X size={20}/></button>
        </div>
        {children}
        {onSubmit&&<button onClick={onSubmit} style={{width:"100%",marginTop:16,background:`linear-gradient(135deg,${C.accent},${C.green})`,color:"#fff",border:"none",borderRadius:14,padding:"14px",fontFamily:MF,fontWeight:800,fontSize:15,cursor:"pointer"}}>{submitLabel}</button>}
      </div>
    </div>
  );
}

function FI({label,half,error,...p}){
  const [focused,setFocused]=useState(false);
  return(
    <div style={{marginBottom:12,width:half?"48%":"100%"}}>
      {label&&<div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>{label}</div>}
      <input {...p} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} style={{width:"100%",background:focused?"#fff":C.surfaceAlt,border:`1.5px solid ${error?C.red:focused?C.accent:C.border}`,borderRadius:10,padding:"11px 14px",color:C.text,fontSize:15,outline:"none",boxSizing:"border-box",...(p.style||{})}}/>
    </div>
  );
}

function FS({label,options,...p}){
  return(
    <div style={{marginBottom:12}}>
      {label&&<div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>{label}</div>}
      <select {...p} style={{width:"100%",background:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"11px 14px",color:C.text,fontSize:15,outline:"none",boxSizing:"border-box"}}>
        {options?.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
      </select>
    </div>
  );
}

function ConfirmDialog({title,message,onConfirm,onCancel,danger}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={e=>{if(e.target===e.currentTarget)onCancel();}}>
      <div style={{background:C.surface,borderRadius:20,padding:24,maxWidth:340,width:"100%",textAlign:"center"}}>
        <div style={{fontFamily:MF,fontSize:17,fontWeight:800,color:C.text,marginBottom:8}}>{title}</div>
        <div style={{fontSize:13,color:C.textLight,marginBottom:20}}>{message}</div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onCancel} style={{flex:1,padding:"12px",borderRadius:12,border:`1px solid ${C.border}`,background:C.surface,color:C.text,fontFamily:MF,fontWeight:700,cursor:"pointer",fontSize:14}}>Cancel</button>
          <button onClick={()=>{onConfirm();onCancel();}} style={{flex:1,padding:"12px",borderRadius:12,border:"none",background:danger?C.red:C.accent,color:"#fff",fontFamily:MF,fontWeight:700,cursor:"pointer",fontSize:14}}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

function AddExpenseModal({form,ff,categories,onClose,onSave}){
  return(
    <Modal title="Log Expense" icon={DollarSign} onClose={onClose} onSubmit={()=>{if(form.name&&form.amount)onSave({id:Date.now(),name:form.name,amount:form.amount,category:form.category||"Misc",date:form.date||todayStr(),notes:form.notes||"",tags:[]});}} submitLabel="Add Expense">
      <FI label="Name" value={form.name||""} onChange={e=>ff("name",e.target.value)} placeholder="Coffee, groceries..."/>
      <FI label="Amount" type="number" value={form.amount||""} onChange={e=>ff("amount",e.target.value)} placeholder="0.00"/>
      <FS label="Category" value={form.category||"Misc"} onChange={e=>ff("category",e.target.value)} options={categories?.map(c=>({value:c.name,label:c.icon+" "+c.name}))||[]}/>
      <FI label="Date" type="date" value={form.date||todayStr()} onChange={e=>ff("date",e.target.value)}/>
      <FI label="Notes (optional)" value={form.notes||""} onChange={e=>ff("notes",e.target.value)} placeholder="Optional notes..."/>
    </Modal>
  );
}

function AddBillModal({form,ff,onClose,onSave}){
  return(
    <Modal title="Add Bill" icon={CalendarClock} onClose={onClose} onSubmit={()=>{if(form.name&&form.amount)onSave({id:Date.now(),name:form.name,amount:form.amount,dueDate:form.dueDate||todayStr(),paid:false,recurring:"Monthly",category:"Bills",autoPay:false});}} submitLabel="Add Bill">
      <FI label="Bill Name" value={form.name||""} onChange={e=>ff("name",e.target.value)} placeholder="Netflix, rent, insurance..."/>
      <FI label="Amount" type="number" value={form.amount||""} onChange={e=>ff("amount",e.target.value)} placeholder="0.00"/>
      <FI label="Due Date" type="date" value={form.dueDate||todayStr()} onChange={e=>ff("dueDate",e.target.value)}/>
      <FS label="Recurring" value={form.recurring||"Monthly"} onChange={e=>ff("recurring",e.target.value)} options={["Monthly","Weekly","Annual","One-time"]}/>
    </Modal>
  );
}

function AddDebtModal({form,ff,onClose,onSave}){
  return(
    <Modal title="Add Debt" icon={CreditCard} onClose={onClose} onSubmit={()=>{if(form.name&&form.balance)onSave({id:Date.now(),name:form.name,balance:form.balance,original:form.balance,rate:form.rate||"0",type:form.type||"Credit Card",minPayment:form.minPayment||"0"});}} submitLabel="Add Debt">
      <FI label="Name" value={form.name||""} onChange={e=>ff("name",e.target.value)} placeholder="Credit card, student loan..."/>
      <FI label="Balance" type="number" value={form.balance||""} onChange={e=>ff("balance",e.target.value)} placeholder="0.00"/>
      <FI label="Interest Rate %" type="number" value={form.rate||""} onChange={e=>ff("rate",e.target.value)} placeholder="0.00"/>
      <FI label="Min Payment" type="number" value={form.minPayment||""} onChange={e=>ff("minPayment",e.target.value)} placeholder="0.00"/>
      <FS label="Type" value={form.type||"Credit Card"} onChange={e=>ff("type",e.target.value)} options={["Credit Card","Student Loan","Car Loan","Mortgage","Medical","Personal Loan","Other"]}/>
    </Modal>
  );
}

function AccountsView({accounts,setAccounts,income,setIncome}){
  return(
    <div className="fu">
      <SH title="Accounts & Income"/>
      <div style={{background:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:18,padding:16,marginBottom:14}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:12}}>💰 Account Balances</div>
        {[["Checking","checking"],["Savings","savings"],["Cushion/Emergency","cushion"],["Investments","investments"],["Property Value","property"],["Vehicles","vehicles"]].map(([lbl,key])=>(
          <FI key={key} label={lbl} type="number" value={accounts[key]||""} onChange={e=>setAccounts(p=>({...p,[key]:e.target.value}))} placeholder="0.00"/>
        ))}
      </div>
      <div style={{background:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:18,padding:16}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:12}}>📊 Monthly Income</div>
        {[["Primary (salary/hourly)","primary"],["Other","other"],["Trading P&L","trading"],["Rental","rental"],["Dividends","dividends"],["Freelance","freelance"]].map(([lbl,key])=>(
          <FI key={key} label={lbl} type="number" value={income[key]||""} onChange={e=>setIncome(p=>({...p,[key]:e.target.value}))} placeholder="0.00"/>
        ))}
      </div>
    </div>
  );
}


// ── VIEW COMPONENTS ─────────────────────────────────────────────────────────

function SpendingView({expenses,setExpenses,budgetGoals,setBGoals,categories,setEditItem}){
  const[showAdd,setShowAdd]=useState(false);const[bForm,setBForm]=useState({});
  const[dateFilter,setDateFilter]=useState("month");
  const now=new Date();
  const filteredExp=useMemo(()=>{
    if(dateFilter==="month"){const m=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");return expenses.filter(e=>e.date?.startsWith(m));}
    if(dateFilter==="week"){const ago=new Date(now);ago.setDate(ago.getDate()-7);return expenses.filter(e=>new Date(e.date)>=ago);}
    return expenses;
  },[expenses,dateFilter]);
  const totalExp=filteredExp.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const catMap=filteredExp.reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount)||0);return a},{});
  const catSorted=Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
  return(
    <div className="fu">
      <SH title="Spending" sub={`Total: ${fmt(totalExp)}`}/>
      <div style={{display:"flex",gap:6,background:C.borderLight,borderRadius:10,padding:3,marginBottom:14}}>
        {[["month","This Month"],["week","7 Days"],["all","All Time"]].map(([id,label])=>(
          <button key={id} className="ba" onClick={()=>setDateFilter(id)} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",background:dateFilter===id?"#fff":"transparent",color:dateFilter===id?C.accent:C.textLight,fontWeight:dateFilter===id?700:500,fontSize:12,cursor:"pointer",boxShadow:dateFilter===id?"0 1px 4px rgba(0,0,0,.08)":"none"}}>{label}</button>
        ))}
      </div>
      {budgetGoals.length>0&&(
        <div style={{marginBottom:16}}>
          <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:10}}>Budgets</div>
          {budgetGoals.map(g=>{
            const sp=expenses.filter(e=>e.category===g.category&&e.date?.startsWith(now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0"))).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
            const lim=parseFloat(g.limit)||1;const pct=(sp/lim)*100;const over=sp>lim;
            return(
              <div key={g.id} style={{background:C.surface,border:`1px solid ${over?C.redMid:C.border}`,borderRadius:12,padding:14,marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
                  <span style={{fontSize:13,fontWeight:600,color:C.text}}>{g.category}</span>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:13,fontWeight:700,color:over?C.red:C.green}}>{fmt(sp)}<span style={{fontWeight:400,color:C.textLight}}> / {fmt(lim)}</span></span>
                    <button onClick={()=>setBGoals(p=>p.filter(x=>x.id!==g.id))} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,display:"flex"}}><X size={12}/></button>
                  </div>
                </div>
                <BarProg pct={pct} color={over?C.red:pct>80?C.amber:C.green} h={6}/>
                {over&&<div style={{fontSize:11,color:C.red,marginTop:4,fontWeight:500}}>Over by {fmt(sp-lim)}</div>}
              </div>
            );
          })}
          <button className="ba" onClick={()=>setShowAdd(true)} style={{display:"flex",alignItems:"center",gap:5,background:"transparent",border:`1px dashed ${C.border}`,borderRadius:10,padding:"8px 14px",color:C.textLight,fontSize:13,cursor:"pointer",width:"100%",justifyContent:"center",marginBottom:14}}><Plus size={13}/>Add Budget Goal</button>
        </div>
      )}
      {catSorted.length>0&&(
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:16,marginBottom:14}}>
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
      {budgetGoals.length===0&&<button className="ba" onClick={()=>setShowAdd(true)} style={{display:"flex",alignItems:"center",gap:5,background:C.purpleBg,border:`1px solid ${C.purpleMid}`,borderRadius:10,padding:"10px 14px",color:C.purple,fontSize:13,cursor:"pointer",marginBottom:14,width:"100%",justifyContent:"center"}}><Target size={13}/>Add Budget Goal</button>}
      <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:10}}>Transactions</div>
      {filteredExp.length===0&&<Empty text="No expenses yet — use AI Logger or the + button" icon={Wallet}/>}
      {filteredExp.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(e=>{
        const cat=categories.find(c=>c.name===e.category);
        return(
          <div key={e.id} style={{marginBottom:8}}><div onClick={()=>setEditItem({type:"expense",data:e})} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,cursor:"pointer"}}>
              <div style={{width:38,height:38,borderRadius:10,background:cat?.color?cat.color+"20":C.accentBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{cat?.icon||"💸"}</div>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:600,color:C.text}}>{e.name}</div><div style={{fontSize:11,color:C.textLight,marginTop:1}}>{e.date}{e.category?` . ${e.category}`:""}{e.notes?` . ${e.notes}`:""}</div>{e.tags?.length>0&&<div style={{display:"flex",gap:4,marginTop:4,flexWrap:"wrap"}}>{e.tags.map(t=><span key={t} style={{fontSize:10,fontWeight:600,background:C.accentBg,color:C.accent,padding:"2px 7px",borderRadius:99}}>{t}</span>)}</div>}</div>
              <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.red,flexShrink:0}}>-{fmt(e.amount)}</div>
            </div>
          </div>
        );
      })}
      {showAdd&&<Modal title="Budget Goal" icon={Target} onClose={()=>setShowAdd(false)} onSubmit={()=>{if(!bForm.category||!bForm.limit)return;setBGoals(p=>[...p,{id:Date.now(),...bForm}]);setShowAdd(false);setBForm({});}} submitLabel="Set Goal" accent={C.purple}><FS label="Category" options={categories.map(c=>c.name)} value={bForm.category||""} onChange={e=>setBForm(p=>({...p,category:e.target.value}))}/><FI label="Monthly Limit ($)" type="number" placeholder="400" value={bForm.limit||""} onChange={e=>setBForm(p=>({...p,limit:e.target.value}))}/></Modal>}
    </div>
  );
}

// --- BILLS VIEW ---------------------------------------------------------------

function BillsView({bills,setBills,setEditItem,onAdd}){
  const overdue=bills.filter(b=>!b.paid&&dueIn(b.dueDate)<0);
  const unpaid=bills.filter(b=>!b.paid);
  const soonAmt=bills.filter(b=>!b.paid&&dueIn(b.dueDate)>=0&&dueIn(b.dueDate)<=7).reduce((s,b)=>s+(parseFloat(b.amount)||0),0);
  return(
    <div className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div><div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text}}>Bills</div><div style={{fontSize:13,color:C.textLight}}>{unpaid.length} unpaid . {overdue.length} overdue</div></div>
        <button onClick={onAdd} style={{width:38,height:38,borderRadius:12,background:C.accent,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Plus size={20} color="#fff"/></button>
      </div>
      {soonAmt>0&&<div style={{background:C.amberBg,border:`1px solid ${C.amberMid}`,borderRadius:12,padding:"11px 15px",marginBottom:14,fontSize:13,color:C.amber,fontWeight:500}}>💸 <strong>{fmt(soonAmt)}</strong> due in the next 7 days</div>}
      {bills.length===0&&<Empty text='No bills yet. Use AI Logger — type "rent 1200 due 28th"' icon={CalendarClock}/>}
      {bills.sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate)).map(b=>{
        const d=dueIn(b.dueDate);
        const uc=b.paid?C.green:d<0?C.red:d<=3?C.red:d<=7?C.amber:C.textLight;
        const ul=b.paid?"Paid ✓":d<0?Math.abs(d)+"d overdue":d===0?"Due today!":d<=7?"Due in "+d+"d":"Due "+fmtDate(b.dueDate);
        return(
          <div key={b.id} style={{marginBottom:8}}><div className="rw" style={{display:"flex",alignItems:"center",gap:12,padding:"14px 14px",background:C.surface,border:`1.5px solid ${b.paid?C.border:d<0?C.redMid:d<=7?C.amberMid:C.border}`,borderRadius:14}}>
              <button onClick={()=>{
                setBills(p=>p.map(x=>{
                  if(x.id!==b.id)return x;
                  const nowPaid=!x.paid;
                  // Auto-advance due date when marking paid
                  if(nowPaid&&x.recurring&&x.recurring!=="One-time"){
                    return{...x,paid:true,dueDate:advanceDueDate(x.dueDate,1),paidDate:todayStr()};
                  }
                  return{...x,paid:nowPaid};
                }));
              }} style={{background:"none",border:"none",cursor:"pointer",color:b.paid?C.green:C.border,padding:0,display:"flex",flexShrink:0}}>{b.paid?<CheckCircle2 size={22}/>:<Circle size={22}/>}</button>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600,color:b.paid?C.textLight:C.text,textDecoration:b.paid?"line-through":"none"}}>{b.name}</div>
                <div style={{fontSize:12,marginTop:2,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{color:uc,fontWeight:500}}>{ul}</span>
                  {b.recurring&&b.recurring!=="One-time"&&<span style={{color:C.textLight}}>{b.recurring}</span>}
                  {b.autoPay&&<span style={{background:C.accentBg,color:C.accent,fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:99}}>AUTO-PAY</span>}
                </div>
              </div>
              <div style={{fontFamily:MF,fontWeight:700,fontSize:15,color:b.paid?C.textLight:C.text}}>{fmt(b.amount)}</div>
              <button className="ba" onClick={()=>setEditItem({type:"bill",data:b})} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,fontSize:11,fontWeight:600,padding:"4px 6px"}}>Edit</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- DEBT VIEW ----------------------------------------------------------------

function DebtView({debts,setDebts,setModal,setEditItem,setConfirm}){
  const [selectedDebt,setSelectedDebt]=useState(null);
  const [strategy,setStrategy]=useState("avalanche");
  const [payModal,setPayModal]=useState(null); // avalanche=highest APR first, snowball=lowest balance first
  const totalDebt=debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0);
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
  const prioritized=[...debts].sort((a,b)=>{
    if(strategy==="avalanche")return(parseFloat(b.rate)||0)-(parseFloat(a.rate)||0);
    return(parseFloat(a.balance)||0)-(parseFloat(b.balance)||0);
  });
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
      {/* ── Header ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div><div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text}}>Debt Tracker</div><div style={{fontSize:13,color:C.textLight}}>{fmt(totalDebt)} total across {debts.length} debt{debts.length!==1?"s":""}</div></div>
        <div style={{display:"flex",gap:8}}>
          {debts.length>0&&<button className="ba" onClick={()=>setModal("simulator")} style={{display:"flex",alignItems:"center",gap:5,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 12px",color:C.textMid,fontWeight:600,fontSize:13,cursor:"pointer"}}><Calculator size={13}/>Sim</button>}
          <button className="ba" onClick={()=>setModal("debt")} style={{width:38,height:38,borderRadius:12,background:C.accent,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Plus size={20} color="#fff"/></button>
        </div>
      </div>

      {debts.length===0&&<Empty text="No debts tracked. Add one to start your payoff plan!" icon={CreditCard}/>}

      {debts.length>0&&<>
        {/* ── Pie Chart ── */}
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:18,padding:20,marginBottom:14}}>
          <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>Debt Breakdown</div>
          <div style={{fontSize:12,color:C.textLight,marginBottom:12}}>Tap a slice to see details</div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <PieChart width={180} height={180}>
              <Pie data={pieData} cx={85} cy={85} innerRadius={48} outerRadius={82} dataKey="value" labelLine={false} label={renderLabel} onClick={(entry)=>setSelectedDebt(selectedDebt?.debt?.id===entry.debt?.id?null:entry)}>
                {pieData.map((entry,i)=>(
                  <Cell key={i} fill={entry.color} stroke={selectedDebt?.debt?.id===entry.debt?.id?"#fff":"transparent"} strokeWidth={selectedDebt?.debt?.id===entry.debt?.id?3:0} style={{cursor:"pointer",opacity:selectedDebt&&selectedDebt.debt?.id!==entry.debt?.id?0.5:1}}/>
                ))}
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

          {/* ── Selected debt detail panel ── */}
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
                      {d.rate&&<span style={{fontSize:11,color:C.textLight,fontWeight:500}}>{d.rate}% APR</span>}
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

        {/* ── Payoff Strategy ── */}
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:18,padding:20,marginBottom:14}}>
          <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>Payoff Strategy</div>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            {[["avalanche","Avalanche","Highest APR first — min interest"],["snowball","Snowball","Lowest balance — fastest wins"]].map(([id,label,desc])=>(
              <button key={id} onClick={()=>setStrategy(id)} style={{flex:1,padding:"10px 8px",borderRadius:12,border:`1.5px solid ${strategy===id?C.accent:C.border}`,background:strategy===id?C.accentBg:C.surface,cursor:"pointer",textAlign:"left"}}>
                <div style={{fontSize:13,fontWeight:700,color:strategy===id?C.accent:C.text,marginBottom:2}}>{label}</div>
                <div style={{fontSize:11,color:C.textLight,lineHeight:1.3}}>{desc}</div>
              </button>
            ))}
          </div>

          <div style={{fontSize:12,fontWeight:600,color:C.textLight,marginBottom:10,textTransform:"uppercase",letterSpacing:.5}}>Priority Order</div>
          {prioritized.map((d,i)=>{
            const proj=calcPayoff(d);
            const bal=parseFloat(d.balance)||0;
            const color=PIE_COLORS[debts.indexOf(d)%PIE_COLORS.length];
            return(
              <div key={d.id} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"12px 0",borderBottom:i<prioritized.length-1?`1px solid ${C.border}`:"none"}}>
                <div style={{width:28,height:28,borderRadius:8,background:color+"20",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:MF,fontWeight:800,fontSize:13,color,flexShrink:0}}>#{i+1}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:2}}>{d.name}</div>
                  <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                    <span style={{fontSize:12,color:C.red,fontWeight:600}}>{fmt(bal)}</span>
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

        {/* ── Paydown Timeline ── */}
        {debts.length>0&&(()=>{
          const now=new Date();
          const timeline=prioritized.map((d,i)=>{
            const proj=calcPayoff(d);
            const color=PIE_COLORS[debts.indexOf(d)%PIE_COLORS.length];
            return({...d,proj,color,rank:i+1});
          }).filter(d=>d.proj.months<600).sort((a,b)=>a.proj.months-b.proj.months);
          if(!timeline.length)return null;
          const maxMonths=Math.max(...timeline.map(d=>d.proj.months),1);
          return(
            <div style={{background:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:18,padding:20,marginBottom:14,boxShadow:"0 1px 4px rgba(13,27,42,.04)"}}>
              <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>Paydown Timeline</div>
              <div style={{fontSize:12,color:C.textLight,marginBottom:16}}>At minimum payment rates</div>
              {timeline.map(d=>(
                <div key={d.id} style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:d.color}}/>
                      <span style={{fontSize:13,fontWeight:600,color:C.text}}>{d.name}</span>
                    </div>
                    <span style={{fontSize:12,color:C.green,fontWeight:600}}>{d.proj.payoffDate}</span>
                  </div>
                  <div style={{height:8,background:C.borderLight,borderRadius:99,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${(d.proj.months/maxMonths)*100}%`,background:d.color,borderRadius:99,transition:"width .6s ease"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
                    <span style={{fontSize:11,color:C.textFaint}}>{d.proj.months} months</span>
                    <span style={{fontSize:11,color:C.red}}>+{fmt(d.proj.totalInterest)} interest</span>
                  </div>
                </div>
              ))}
              <div style={{marginTop:4,paddingTop:12,borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:13,fontWeight:600,color:C.text}}>Total interest cost</span>
                <span style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.red}}>{fmt(timeline.reduce((s,d)=>s+d.proj.totalInterest,0))}</span>
              </div>
            </div>
          );
        })()}
        {/* ── Debt cards (compact) ── */}
        {debts.map(d=>{
          const bal=parseFloat(d.balance)||0,orig=parseFloat(d.original)||bal,pct=Math.min(100,((orig-bal)/orig)*100);
          const mi=(parseFloat(d.rate)||0)/100/12*bal;
          const color=PIE_COLORS[debts.indexOf(d)%PIE_COLORS.length];
          return(
            <div key={d.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:16,marginBottom:8}}>
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
                  <button onClick={()=>setPayModal(d)} style={{background:C.greenBg,border:`1px solid ${C.greenMid}`,borderRadius:8,cursor:"pointer",color:C.green,fontSize:11,fontWeight:700,padding:"4px 8px"}}>+Pay</button>
                  <button onClick={()=>setEditItem({type:"debt",data:d})} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,fontSize:12,fontWeight:600,padding:"4px 6px"}}>Edit</button>
                </div>
              </div>
              {d.original&&<><BarProg pct={pct} color={pct>60?C.green:pct>30?C.accent:C.red} h={6}/><div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:11,color:C.textLight}}><span>{pct.toFixed(0)}% paid off</span><span>of {fmt(orig)}</span></div></>}
            </div>
          );
        })}
      </>}
    {payModal&&<ExtraPayModal debt={payModal} onConfirm={pay=>{setDebts(p=>p.map(x=>x.id===payModal.id?{...x,balance:String(Math.max(0,parseFloat(x.balance||0)-pay))}:x));setSelectedDebt(null);setPayModal(null);}} onClose={()=>setPayModal(null)}/>}
    </div>
  );
}

// --- SAVINGS GOALS ------------------------------------------------------------

function SavingsGoalsView({goals,setGoals,income}){
  const [view,setView]=useState("rings"); // rings | list
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({});
  const ff=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  function add(){if(!form.name||!form.target)return;setGoals(p=>[...p,{id:Date.now().toString(),name:form.name,target:parseFloat(form.target),saved:parseFloat(form.saved||0),monthly:parseFloat(form.monthly||0),icon:form.icon||"🎯",color:form.color||C.accent}]);setForm({});setShowAdd(false);}

  function GoalRing({goal}){
    const pct=Math.min(100,(goal.saved/goal.target)*100);
    const r=44;const circ=2*Math.PI*r;const dash=circ*(pct/100);
    const mo=goal.monthly||0;const rem=Math.max(0,goal.target-goal.saved);
    const months=mo>0?Math.ceil(rem/mo):0;
    return(
      <div style={{background:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:20,padding:20,boxShadow:"0 1px 4px rgba(13,27,42,.04)",display:"flex",flexDirection:"column",alignItems:"center",position:"relative"}}>
        <div style={{position:"relative",width:120,height:120,marginBottom:12}}>
          <svg width="120" height="120" viewBox="0 0 120 120" style={{transform:"rotate(-90deg)"}}>
            <circle cx="60" cy="60" r={r} fill="none" stroke={C.borderLight} strokeWidth="10"/>
            <circle cx="60" cy="60" r={r} fill="none" stroke={goal.color||C.accent} strokeWidth="10"
              strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
              style={{transition:"stroke-dasharray .6s ease"}}/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <div style={{fontSize:24}}>{goal.icon||"🎯"}</div>
            <div style={{fontFamily:MF,fontWeight:800,fontSize:15,color:C.text}}>{pct.toFixed(0)}%</div>
          </div>
        </div>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:2,textAlign:"center"}}>{goal.name}</div>
        <div style={{fontSize:12,color:C.textLight,marginBottom:8,textAlign:"center"}}>{fmt(goal.saved)} of {fmt(goal.target)}</div>
        {months&&<div style={{fontSize:11,color:C.green,fontWeight:600,marginBottom:8}}>{months} months to go</div>}
        <div style={{display:"flex",gap:6,width:"100%"}}>
          <input type="number" placeholder="Add $" onKeyDown={e=>{if(e.key==="Enter"&&e.target.value){const add=parseFloat(e.target.value);setGoals(p=>p.map(g=>g.id===goal.id?{...g,saved:Math.min(g.target,g.saved+add)}:g));e.target.value="";}}} style={{flex:1,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"8px 10px",fontSize:13,color:C.text,outline:"none",background:C.surfaceAlt}}/>
          <button onClick={()=>setGoals(p=>p.filter(g=>g.id!==goal.id))} style={{padding:"8px 10px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,cursor:"pointer",color:C.textLight}}>✕</button>
        </div>
      </div>
    );
  }

  const ICONS=["🎯","🏠","🚗","✈️","💍","📱","🎓","🐕","💪","🌴","🏖️","💰"];
  const COLORS=[C.accent,C.green,C.purple,C.amber,C.red,"#0891B2","#DB2777"];

  return(
    <div className="fu">
      {/* ── View Toggle ── */}
      <div style={{display:"flex",gap:6,background:C.borderLight,borderRadius:12,padding:4,marginBottom:16}}>
        {[["rings","Rings"],["list","List"]].map(([id,l])=>(
          <button key={id} onClick={()=>setView(id)} style={{flex:1,padding:"8px 0",borderRadius:9,border:"none",background:view===id?C.surface:"transparent",color:view===id?C.accent:C.textLight,fontWeight:view===id?700:500,fontSize:13,cursor:"pointer"}}>{l}</button>
        ))}
      </div>
      {/* ── Rings View ── */}
      {view==="rings"&&goals.length>0&&(
        <div style={{background:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:18,padding:20,marginBottom:14}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:16,justifyContent:"center"}}>
            {goals.map((g,i)=>{
              const pct=parseFloat(g.target)>0?(parseFloat(g.saved||0)/parseFloat(g.target))*100:0;
              const colors=["#2563EB","#10B981","#F59E0B","#EF4444","#7C3AED","#0891B2"];
              return(<GoalRing key={g.id} pct={pct} color={g.color||colors[i%colors.length]} icon={g.icon} label={g.name} saved={parseFloat(g.saved||0)} target={parseFloat(g.target||0)}/>);
            })}
          </div>
          {goals.length>0&&<div style={{marginTop:16,paddingTop:14,borderTop:`1px solid ${C.borderLight}`,display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:13,color:C.textLight}}>Total saved</span>
            <span style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.green}}>{fmt(goals.reduce((s,g)=>s+(parseFloat(g.saved||0)),0))}</span>
          </div>}
        </div>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div><div style={{fontFamily:MF,fontSize:19,fontWeight:800,color:C.text,letterSpacing:-.3}}>Savings Goals</div><div style={{fontSize:13,color:C.textLight}}>{goals.length} goal{goals.length!==1?"s":""} tracked</div></div>
        <button onClick={()=>setShowAdd(true)} style={{width:38,height:38,borderRadius:12,background:C.accent,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Plus size={20} color="#fff"/></button>
      </div>
      {goals.length===0&&<div style={{textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:48,marginBottom:12}}>🎯</div><div style={{fontFamily:MF,fontSize:16,fontWeight:700,color:C.text,marginBottom:8}}>No savings goals yet</div><div style={{fontSize:13,color:C.textLight,marginBottom:20}}>Set a goal and watch your ring fill up</div><button onClick={()=>setShowAdd(true)} style={{padding:"12px 24px",borderRadius:14,background:C.accent,border:"none",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>Add First Goal</button></div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        {goals.map(g=><GoalRing key={g.id} goal={g}/>)}
      </div>
      {showAdd&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:9999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowAdd(false)}>
          <div style={{background:"#fff",borderRadius:"24px 24px 0 0",padding:28,width:"100%",maxWidth:480}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:MF,fontSize:17,fontWeight:800,color:C.text,marginBottom:16}}>New Savings Goal</div>
            <FI label="Goal Name" placeholder="Emergency Fund, New Car..." value={form.name||""} onChange={ff("name")} autoFocus/>
            <div style={{display:"flex",gap:10}}><FI half label="Target ($)" type="number" placeholder="5000" value={form.target||""} onChange={ff("target")}/><FI half label="Saved So Far ($)" type="number" placeholder="0" value={form.saved||""} onChange={ff("saved")}/></div>
            <FI label="Monthly Contribution ($)" type="number" placeholder="200" value={form.monthly||""} onChange={ff("monthly")}/>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Icon</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{ICONS.map(ic=><button key={ic} onClick={()=>setForm(p=>({...p,icon:ic}))} style={{fontSize:22,padding:6,borderRadius:10,border:`2px solid ${form.icon===ic?C.accent:C.border}`,background:form.icon===ic?C.accentBg:"#fff",cursor:"pointer"}}>{ic}</button>)}</div>
            </div>
            <div style={{marginBottom:20}}>
              <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Color</div>
              <div style={{display:"flex",gap:8}}>{COLORS.map(c=><button key={c} onClick={()=>setForm(p=>({...p,color:c}))} style={{width:32,height:32,borderRadius:"50%",background:c,border:`3px solid ${form.color===c?"#fff":c}`,outline:form.color===c?`2px solid ${c}`:"none",cursor:"pointer"}}/> )}</div>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:"13px",borderRadius:14,border:`1.5px solid ${C.border}`,background:C.surface,color:C.textMid,fontWeight:700,fontSize:15,cursor:"pointer"}}>Cancel</button>
              <button onClick={add} style={{flex:2,padding:"13px",borderRadius:14,border:"none",background:C.accent,color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:MF}}>Add Goal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function TradingView({trades,setTrades,account,setAccount}){
  const [showAdd,setShowAdd]=useState(false);const [form,setForm]=useState({});const ff=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  function add(){if(!form.symbol||!form.pnl)return;setTrades(p=>[{id:Date.now(),date:form.date||todayStr(),symbol:form.symbol.toUpperCase(),side:form.side||"Long",contracts:form.contracts||"1",entry:form.entry||"",exit:form.exit||"",pnl:form.pnl,note:form.note||""},...p]);setForm({});setShowAdd(false);}
  const totalPnl=trades.reduce((s,t)=>s+(parseFloat(t.pnl)||0),0);const wins=trades.filter(t=>parseFloat(t.pnl)>0);const losses=trades.filter(t=>parseFloat(t.pnl)<0);
  const winRate=trades.length>0?((wins.length/trades.length)*100).toFixed(0):0;const avgWin=wins.length>0?wins.reduce((s,t)=>s+(parseFloat(t.pnl)||0),0)/wins.length:0;const avgLoss=losses.length>0?Math.abs(losses.reduce((s,t)=>s+(parseFloat(t.pnl)||0),0)/losses.length):0;
  const bal=parseFloat(account.balance||0),dep=parseFloat(account.deposit||0),ret=dep>0?((bal-dep)/dep*100).toFixed(1):0;
  const monthly=trades.reduce((a,t)=>{const m=t.date?MOS[new Date(t.date).getMonth()]:"?";a[m]=(a[m]||0)+(parseFloat(t.pnl)||0);return a},{});
  const chartData=Object.entries(monthly).map(([month,pnl])=>({month,pnl}));
  return(<div className="fu">
    <SH title="Futures Trading" sub="P&L, win rate & performance" onAdd={()=>setShowAdd(true)} addLabel="Log Trade"/>
    <div style={{background:`linear-gradient(135deg,${C.navy} 0%,#1a3a6e 100%)`,borderRadius:18,padding:22,marginBottom:14,color:"#fff"}}>
      <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",letterSpacing:.5,textTransform:"uppercase",marginBottom:4}}>Trading Account</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}><div><div style={{fontFamily:MF,fontSize:30,fontWeight:800,color:"#fff",lineHeight:1}}>{fmt(bal)}</div><div style={{fontSize:13,color:"rgba(255,255,255,.5)",marginTop:4}}>Current Balance</div></div><div style={{textAlign:"right"}}><div style={{fontFamily:MF,fontSize:20,fontWeight:700,color:totalPnl>=0?"#4ade80":"#f87171"}}>{totalPnl>=0?"+":""}{fmt(totalPnl)}</div><div style={{fontSize:12,color:"rgba(255,255,255,.4)"}}>Total P&L</div></div></div>
      <div style={{display:"flex",gap:4}}>{[["Deposited",fmt(dep)],["Return",ret+"%"],["Trades",String(trades.length)]].map(([l,v])=><div key={l} style={{flex:1,background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 10px"}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2}}>{l}</div><div style={{fontFamily:MF,fontSize:14,fontWeight:700,color:"#fff"}}>{v}</div></div>)}</div>
    </div>
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:16,marginBottom:14}}><div style={{fontSize:12,fontWeight:600,color:C.slate,marginBottom:10}}>Update Balances</div><div style={{display:"flex",gap:10}}><div style={{flex:1}}><div style={{fontSize:11,color:C.textLight,marginBottom:4}}>Total Deposited</div><input type="number" placeholder="0.00" value={account.deposit||""} onChange={e=>setAccount(p=>({...p,deposit:e.target.value}))} style={{...iS(false),padding:"9px 12px",fontSize:13}}/></div><div style={{flex:1}}><div style={{fontSize:11,color:C.textLight,marginBottom:4}}>Current Balance</div><input type="number" placeholder="0.00" value={account.balance||""} onChange={e=>setAccount(p=>({...p,balance:e.target.value}))} style={{...iS(false),padding:"9px 12px",fontSize:13}}/></div></div></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>{[{l:"Win Rate",v:winRate+"%",c:parseFloat(winRate)>=50?C.green:C.red},{l:"Profit Factor",v:avgLoss>0?(avgWin/avgLoss).toFixed(2):"∞",c:C.accent},{l:"Avg Win",v:fmt(avgWin),c:C.green},{l:"Avg Loss",v:"-"+fmt(avgLoss),c:C.red}].map(s=><div key={s.l} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:14}}><div style={{fontSize:11,fontWeight:600,color:C.slate,textTransform:"uppercase",letterSpacing:.4,marginBottom:4}}>{s.l}</div><div style={{fontFamily:MF,fontSize:22,fontWeight:800,color:s.c}}>{s.v}</div></div>)}</div>
    {chartData.length>0&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:18,marginBottom:14}}><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Monthly P&L</div><ResponsiveContainer width="100%" height={160}><BarChart data={chartData} margin={{left:-20,right:4,top:4,bottom:0}}><XAxis dataKey="month" tick={{fill:C.textLight,fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:C.textLight,fontSize:11}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,fontSize:12}} formatter={v=>[fmt(v),"P&L"]}/><Bar dataKey="pnl" radius={[6,6,0,0]}>{chartData.map((d,i)=><Cell key={i} fill={d.pnl>=0?C.green:C.red}/>)}</Bar></BarChart></ResponsiveContainer></div>}
    <div style={{fontFamily:MF,fontWeight:700,fontSize:15,color:C.text,marginBottom:10}}>Trade Log</div>
    {trades.length===0&&<Empty text="No trades yet. Tap 'Log Trade' to start." icon={BarChart2}/>}
    {trades.map(t=>{const pnl=parseFloat(t.pnl)||0;return(<Row key={t.id} icon={pnl>=0?"📈":"📉"} title={t.symbol} sub={`${t.date} . ${t.side} . ${t.contracts} contract${t.contracts!=="1"?"s":""}${t.note?" . "+t.note:""}`} right={(pnl>=0?"+":"")+fmt(pnl)} rightColor={pnl>=0?C.green:C.red} rightSub={t.entry&&t.exit?t.entry+" - "+t.exit:""} onDelete={()=>setTrades(p=>p.filter(x=>x.id!==t.id))} badge={pnl>=0?{label:"WIN",bg:C.greenBg,color:C.green}:{label:"LOSS",bg:C.redBg,color:C.red}}/>);})}
    {showAdd&&<Modal title="Log Trade" icon={BarChart2} onClose={()=>setShowAdd(false)} onSubmit={add} submitLabel="Log Trade" wide><div style={{display:"flex",gap:12,flexWrap:"wrap"}}><FI half label="Symbol" placeholder="ES, NQ, CL..." value={form.symbol||""} onChange={ff("symbol")}/><FI half label="Date" type="date" value={form.date||todayStr()} onChange={ff("date")}/></div><div style={{display:"flex",gap:10,marginBottom:14}}>{["Long","Short"].map(s=><button key={s} className="ba" onClick={()=>setForm(p=>({...p,side:s}))} style={{flex:1,padding:"10px",borderRadius:10,border:`1.5px solid ${(form.side===s||((!form.side)&&s==="Long"))?C.accent:C.border}`,background:(form.side===s||((!form.side)&&s==="Long"))?C.accentBg:C.surface,color:(form.side===s||((!form.side)&&s==="Long"))?C.accent:C.textMid,fontWeight:700,fontSize:13,cursor:"pointer"}}>{s==="Long"?"📈 Long":"📉 Short"}</button>)}</div><div style={{display:"flex",gap:12,flexWrap:"wrap"}}><FI half label="Contracts" type="number" placeholder="1" value={form.contracts||""} onChange={ff("contracts")}/><FI half label="P&L ($)" type="number" placeholder="+250 or -150" value={form.pnl||""} onChange={ff("pnl")}/></div><div style={{display:"flex",gap:12,flexWrap:"wrap"}}><FI half label="Entry Price" type="number" value={form.entry||""} onChange={ff("entry")}/><FI half label="Exit Price" type="number" value={form.exit||""} onChange={ff("exit")}/></div><FI label="Note" placeholder="Setup, lesson..." value={form.note||""} onChange={ff("note")}/></Modal>}
  </div>);
}

// --- CALENDAR VIEW ------------------------------------------------------------

function ShiftView({shifts,setShifts,income,profCategory,profSub}){
  const [showAdd,setShowAdd]=useState(false);const [form,setForm]=useState({date:todayStr(),type:"Regular",hours:"",rate:"",note:""});const ff=(k,v)=>setForm(p=>({...p,[k]:v}));
  const prof=getProfession(profCategory);const OT=prof.shiftTypes;
  const DEFAULT_RATE=parseFloat(income.primary||0)>0?(((parseFloat(income.primary)/4)/40).toFixed(2)):"";
  function add(){if(!form.hours||!form.rate)return;const mult=OT[form.type]||1;const gross=(parseFloat(form.hours)*parseFloat(form.rate)*mult).toFixed(2);setShifts(p=>[{id:Date.now(),...form,gross,mult},...p]);setForm({date:todayStr(),type:"Regular",hours:"",rate:form.rate,note:""});setShowAdd(false);}
  const now2=new Date();const thisMonth=now2.getFullYear()+"-"+String(now2.getMonth()+1).padStart(2,"0");const ms=shifts.filter(s=>s.date?.startsWith(thisMonth));
  const mh=ms.reduce((s,x)=>s+(parseFloat(x.hours)||0),0),mg=ms.reduce((s,x)=>s+(parseFloat(x.gross)||0),0),mot=ms.filter(s=>s.type!=="Regular").reduce((s,x)=>s+(parseFloat(x.gross)||0),0);
  const ytd=shifts.reduce((s,x)=>s+(parseFloat(x.gross)||0),0);
  const subRole=getProfSub(profCategory,profSub);
  return(<div className="fu">
    <SH title={prof.icon+" "+prof.shiftLabel+" Tracker"} sub={subRole.label+" . Log hours & calculate pay"} onAdd={()=>setShowAdd(true)} addLabel={"Log "+prof.shiftLabel}/>
    <div style={{background:`linear-gradient(135deg,${C.navy} 0%,#1a3a6e 100%)`,borderRadius:18,padding:20,marginBottom:14,color:"#fff"}}><div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>This Month</div><div style={{fontFamily:MF,fontSize:30,fontWeight:800,color:"#fff",marginBottom:14}}>{fmt(mg)}</div><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>{[["Shifts",String(ms.length)],["Hours",mh.toFixed(1)],["OT Pay",fmtK(mot)],["YTD",fmtK(ytd)]].map(([l,v])=><div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 8px"}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2}}>{l}</div><div style={{fontFamily:MF,fontSize:13,fontWeight:700,color:"#fff"}}>{v}</div></div>)}</div></div>
    {!income.primary&&<div style={{background:C.amberBg,border:`1px solid ${C.amberMid}`,borderRadius:12,padding:"11px 14px",marginBottom:14,fontSize:13,color:C.amber,fontWeight:500}}>💡 Set your primary income in Accounts to auto-fill your hourly rate</div>}
    {shifts.length===0&&<Empty text={`No ${prof.shiftLabel.toLowerCase()}s logged yet. Tap 'Log ${prof.shiftLabel}' to start.`} icon={Clock}/>}
    {shifts.slice(0,30).map(s=>{const mult=OT[s.type]||1;const col={Regular:C.accent,Overtime:C.amber,"Double Time":C.red,Night:C.purple,Weekend:C.green,Holiday:C.red}[s.type]||C.accent;return(<div key={s.id} className="rw" style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:"14px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12}}><div style={{width:40,height:40,borderRadius:12,background:col+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Clock size={18} color={col}/></div><div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:600,color:C.text}}>{s.type} {prof.shiftLabel}</div><div style={{fontSize:12,color:C.textLight,marginTop:2}}>{fmtDate(s.date)} . {s.hours}h @ ${s.rate}/hr{mult!==1&&<span style={{color:col,fontWeight:600}}> ×{mult}</span>}{s.note&&" . "+s.note}</div></div><div style={{textAlign:"right",flexShrink:0}}><div style={{fontFamily:MF,fontWeight:800,fontSize:15,color:C.green}}>{fmt(s.gross)}</div><button className="db" onClick={()=>setShifts(p=>p.filter(x=>x.id!==s.id))} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,padding:2,display:"flex",marginLeft:"auto",marginTop:4}}><Trash2 size={13}/></button></div></div>);})}
    {showAdd&&<Modal title={`Log ${prof.shiftLabel}`} icon={Clock} onClose={()=>setShowAdd(false)} onSubmit={add} submitLabel={`Add ${prof.shiftLabel}`} accent={C.green}><FI label="Date" type="date" value={form.date} onChange={e=>ff("date",e.target.value)}/><FS label={`${prof.shiftLabel} Type`} options={Object.keys(OT)} value={form.type} onChange={e=>ff("type",e.target.value)}/><div style={{display:"flex",gap:12}}><FI half label="Hours Worked" type="number" placeholder="8" value={form.hours} onChange={e=>ff("hours",e.target.value)}/><FI half label="Hourly Rate ($)" type="number" placeholder={DEFAULT_RATE||"35.00"} value={form.rate} onChange={e=>ff("rate",e.target.value)}/></div>{form.hours&&form.rate&&<div style={{background:C.greenBg,border:`1px solid ${C.greenMid}`,borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:C.green,fontWeight:600}}>Gross pay: {fmt((parseFloat(form.hours)*parseFloat(form.rate)*(OT[form.type]||1)).toFixed(2))}{form.type!=="Regular"&&<span style={{fontWeight:400}}> ({OT[form.type]}× rate)</span>}</div>}<FI label="Note (optional)" placeholder={prof.notePlaceholder} value={form.note} onChange={e=>ff("note",e.target.value)}/></Modal>}
  </div>);
}

// --- BALANCE TREND ------------------------------------------------------------

function CalendarView({expenses,bills,calColors,setCalColors}){
  const [viewDate,setViewDate]=useState(new Date(TODAY.getFullYear(),TODAY.getMonth(),1));const [selected,setSelected]=useState(null);const [showCustom,setShowCustom]=useState(false);
  const yr=viewDate.getFullYear(),mo=viewDate.getMonth(),first=new Date(yr,mo,1).getDay(),dim=new Date(yr,mo+1,0).getDate();
  const expCol=calColors.expense||C.red,billCol=calColors.bill||C.amber,todayCol=calColors.today||C.accent,dotStyle=calColors.dotStyle||"circle";
  const expByDay={},billByDay={};
  expenses.forEach(e=>{const d=new Date(e.date);if(d.getFullYear()===yr&&d.getMonth()===mo){const day=d.getDate();expByDay[day]=(expByDay[day]||0)+(parseFloat(e.amount)||0);}});
  bills.forEach(b=>{if(!b.dueDate)return;const d=new Date(b.dueDate);if(d.getFullYear()===yr&&d.getMonth()===mo){const day=d.getDate();if(!billByDay[day])billByDay[day]=[];billByDay[day].push(b);}});
  const cells=[];for(let i=0;i<first;i++)cells.push(null);for(let d=1;d<=dim;d++)cells.push(d);
  const selExp=selected?expenses.filter(e=>{const d=new Date(e.date);return d.getFullYear()===yr&&d.getMonth()===mo&&d.getDate()===selected;}):[],selBills=selected?(billByDay[selected]||[]):[];
  const totExp=Object.values(expByDay).reduce((s,v)=>s+v,0),totBills=bills.filter(b=>{if(!b.dueDate)return false;const d=new Date(b.dueDate);return d.getFullYear()===yr&&d.getMonth()===mo;}).reduce((s,b)=>s+(parseFloat(b.amount)||0),0);
  const PRESETS=[C.red,C.accent,C.green,C.amber,C.purple,"#0891B2","#DB2777","#111827",C.slate,"#EA580C"];
  const CP=({label,ck})=>(<div style={{marginBottom:12}}><div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>{label}</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{PRESETS.map(c=><button key={c} onClick={()=>setCalColors(p=>({...p,[ck]:c}))} style={{width:26,height:26,borderRadius:"50%",background:c,border:(calColors[ck]||"")===c?`3px solid ${C.text}`:"3px solid transparent",cursor:"pointer"}}/>)}</div></div>);
  return(<div className="fu">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text}}>Calendar</div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <button className="ba" onClick={()=>setShowCustom(p=>!p)} style={{background:showCustom?C.accentBg:C.bg,border:`1px solid ${showCustom?C.accentMid:C.border}`,borderRadius:8,padding:"6px 12px",cursor:"pointer",color:showCustom?C.accent:C.textMid,fontWeight:600,fontSize:12}}>🎨</button>
        <button className="ba" onClick={()=>setViewDate(new Date(yr,mo-1,1))} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 12px",cursor:"pointer",color:C.textMid,fontWeight:700,fontSize:13}}>‹</button>
        <span style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,minWidth:90,textAlign:"center"}}>{MOS[mo]} {yr}</span>
        <button className="ba" onClick={()=>setViewDate(new Date(yr,mo+1,1))} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 12px",cursor:"pointer",color:C.textMid,fontWeight:700,fontSize:13}}>›</button>
      </div>
    </div>
    {showCustom&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:16,marginBottom:14}}><CP label="Expense Color" ck="expense"/><CP label="Bill Color" ck="bill"/><CP label="Today Color" ck="today"/><div style={{marginBottom:8}}><div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Dot Shape</div><div style={{display:"flex",gap:8}}>{["circle","square","diamond"].map(s=><button key={s} className="ba" onClick={()=>setCalColors(p=>({...p,dotStyle:s}))} style={{flex:1,padding:"8px 0",borderRadius:8,border:`1.5px solid ${dotStyle===s?C.accent:C.border}`,background:dotStyle===s?C.accentBg:C.surface,color:dotStyle===s?C.accent:C.textMid,fontWeight:600,fontSize:12,cursor:"pointer"}}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>)}</div></div><button className="ba" onClick={()=>setCalColors({expense:C.red,bill:C.amber,overdue:"#dc2626",today:C.accent,dotStyle:"circle"})} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 16px",cursor:"pointer",color:C.textMid,fontWeight:600,fontSize:12}}>Reset to Default</button></div>}
    <div style={{display:"flex",gap:8,marginBottom:14}}><div style={{flex:1,background:expCol+"12",borderRadius:10,padding:"10px 14px"}}><div style={{fontSize:11,fontWeight:600,color:expCol,textTransform:"uppercase",letterSpacing:.3,marginBottom:3}}>Spent</div><div style={{fontFamily:MF,fontSize:17,fontWeight:800,color:expCol}}>{fmtK(totExp)}</div></div><div style={{flex:1,background:billCol+"12",borderRadius:10,padding:"10px 14px"}}><div style={{fontSize:11,fontWeight:600,color:billCol,textTransform:"uppercase",letterSpacing:.3,marginBottom:3}}>Bills Due</div><div style={{fontFamily:MF,fontSize:17,fontWeight:800,color:billCol}}>{fmtK(totBills)}</div></div></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:3}}>{["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=><div key={d} style={{textAlign:"center",fontSize:11,fontWeight:700,color:C.textLight,padding:"4px 0"}}>{d}</div>)}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:16}}>{cells.map((day,i)=>{if(!day)return <div key={i}/>;const isToday=day===TODAY.getDate()&&mo===TODAY.getMonth()&&yr===TODAY.getFullYear(),hasBill=!!billByDay[day],hasExp=!!expByDay[day],isSel=selected===day,br=dotStyle==="square"?3:dotStyle==="diamond"?0:"50%",tf=dotStyle==="diamond"?"rotate(45deg)":"none";return(<button key={i} className="ba" onClick={()=>setSelected(isSel?null:day)} style={{border:`1.5px solid ${isSel?todayCol:isToday?todayCol+"66":C.border}`,borderRadius:10,padding:"6px 4px",cursor:"pointer",background:isSel?todayCol+"15":isToday?todayCol+"0d":C.surface,display:"flex",flexDirection:"column",alignItems:"center",gap:2,minHeight:52}}><span style={{fontFamily:MF,fontSize:13,fontWeight:isToday?800:500,color:isSel||isToday?todayCol:C.text}}>{day}</span><div style={{display:"flex",gap:2,justifyContent:"center"}}>{hasExp&&<div style={{width:6,height:6,borderRadius:br,background:expCol,transform:tf}}/>}{hasBill&&<div style={{width:6,height:6,borderRadius:br,background:billCol,transform:tf}}/>}</div>{hasExp&&<span style={{fontSize:9,color:expCol,fontWeight:700,lineHeight:1}}>{fmtK(expByDay[day])}</span>}</button>);})}</div>
    {selected&&(selExp.length>0||selBills.length>0)&&<div style={{background:C.surface,border:`1.5px solid ${todayCol}44`,borderRadius:16,padding:18}}><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:12}}>{MOS[mo]} {selected}</div>{selBills.length>0&&<div style={{marginBottom:selExp.length>0?12:0}}><div style={{fontSize:11,fontWeight:700,color:billCol,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Bills</div>{selBills.map(b=><div key={b.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",background:billCol+"18",borderRadius:9,marginBottom:5}}><span style={{fontSize:13,fontWeight:500,color:C.text}}>{b.name}</span><span style={{fontSize:13,fontWeight:700,color:billCol}}>{fmt(b.amount)}</span></div>)}</div>}{selExp.length>0&&<div><div style={{fontSize:11,fontWeight:700,color:expCol,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Expenses</div>{selExp.map(e=><div key={e.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",background:expCol+"18",borderRadius:9,marginBottom:5}}><span style={{fontSize:13,fontWeight:500,color:C.text}}>{e.name}</span><span style={{fontSize:13,fontWeight:700,color:expCol}}>{fmt(e.amount)}</span></div>)}</div>}</div>}
    {selected&&selExp.length===0&&selBills.length===0&&<div style={{textAlign:"center",padding:"20px",color:C.textLight,fontSize:13}}>Nothing logged on {MOS[mo]} {selected}</div>}
  </div>);
}

// --- SHIFT TRACKER ------------------------------------------------------------

function SearchView({expenses,bills,debts,trades,categories}){
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
      <div style={{fontFamily:MF,fontSize:19,fontWeight:800,color:C.text,marginBottom:4,letterSpacing:-.3}}>Search</div>
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
      {!q&&<div style={{textAlign:"center",padding:"40px 20px",color:C.textLight}}><Search size={32} color={C.border} style={{margin:"0 auto 12px",display:"block"}}/><div style={{fontSize:14,fontWeight:500}}>Start typing to search</div><div style={{fontSize:12,marginTop:4}}>Expenses, bills, debts and trades</div></div>}
      {q&&results.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:C.textLight}}><div style={{fontSize:32,marginBottom:12}}>🔍</div><div style={{fontSize:14,fontWeight:500}}>No results for "{q}"</div></div>}
      {results.map((r,i)=>(
        <div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:"13px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:38,height:38,borderRadius:10,background:r.color+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{r.icon}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:600,color:C.text}}>{r.title}</div>
            <div style={{fontSize:12,color:C.textLight,marginTop:1}}>{r.sub}</div>
          </div>
          <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:r.color,flexShrink:0}}>{r.val}</div>
        </div>
      ))}
      {results.length>0&&<div style={{textAlign:"center",fontSize:12,color:C.textLight,marginTop:8}}>{results.length} result{results.length!==1?"s":""} found</div>}
    </div>
  );
}


function InsightsView({expenses,income,bills,debts,budgetGoals,savingsGoals}){
  const now=new Date();
  const thisMs=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
  const lastMs=new Date(now.getFullYear(),now.getMonth()-1,1).getFullYear()+"-"+String(new Date(now.getFullYear(),now.getMonth()-1,1).getMonth()+1).padStart(2,"0");
  const thisExp=expenses.filter(e=>e.date?.startsWith(thisMs));
  const lastExp=expenses.filter(e=>e.date?.startsWith(lastMs));
  const thisTotal=thisExp.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const lastTotal=lastExp.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const diff=lastTotal>0?((thisTotal-lastTotal)/lastTotal*100):0;
  const ti=(parseFloat(income.primary||0))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const catMap=thisExp.reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount)||0);return a},{});
  const catSorted=Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
  const lastCatMap=lastExp.reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount)||0);return a},{});
  const topMerchants=Object.entries(thisExp.reduce((a,e)=>{a[e.name]=(a[e.name]||0)+(parseFloat(e.amount)||0);return a},{})).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const dailyAvg=thisTotal/Math.max(1,now.getDate());
  const projectedMonth=dailyAvg*new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  return(
    <div className="fu">
      <div style={{fontFamily:MF,fontSize:19,fontWeight:800,color:C.text,marginBottom:4,letterSpacing:-.3}}>Spending Insights</div>
      <div style={{fontSize:13,color:C.textLight,marginBottom:16}}>Deep dive into your spending patterns</div>
      {/* Month comparison */}
      <div style={{background:C.navy,borderRadius:18,padding:20,marginBottom:14,color:"#fff"}}>
        <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>This Month vs Last Month</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:16}}>
          <div><div style={{fontFamily:MF,fontSize:32,fontWeight:800,color:"#fff"}}>{fmt(thisTotal)}</div><div style={{fontSize:12,color:"rgba(255,255,255,.4)",marginTop:2}}>{MOS[now.getMonth()]} spending</div></div>
          <div style={{textAlign:"right"}}><div style={{fontFamily:MF,fontSize:18,fontWeight:700,color:diff>0?C.redMid:C.greenMid}}>{diff>0?"+":""}{diff.toFixed(1)}%</div><div style={{fontSize:12,color:"rgba(255,255,255,.4)"}}>vs {MOS[new Date(now.getFullYear(),now.getMonth()-1,1).getMonth()]}</div></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>{[["Daily avg",fmt(dailyAvg),C.accentMid],["Projected",fmt(projectedMonth),C.amberMid],["Last month",fmt(lastTotal),C.textFaint]].map(([l,v,c])=><div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 8px"}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2}}>{l.toUpperCase()}</div><div style={{fontFamily:MF,fontSize:13,fontWeight:700,color:c}}>{v}</div></div>)}</div>
      </div>
      {/* Category breakdown */}
      {catSorted.length>0&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:18,padding:18,boxShadow:"0 2px 8px rgba(13,27,42,.08)",marginBottom:14}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>By Category</div>
        {catSorted.map(([cat,amt],i)=>{
          const lastAmt=lastCatMap[cat]||0;
          const catDiff=lastAmt>0?((amt-lastAmt)/lastAmt*100):0;
          return(<div key={cat} style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:"50%",background:PIE_COLORS[i%PIE_COLORS.length]}}/><span style={{fontSize:13,fontWeight:600,color:C.text}}>{cat}</span></div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {lastAmt>0&&<span style={{fontSize:11,color:catDiff>10?C.red:catDiff<-10?C.green:C.textLight,fontWeight:600}}>{catDiff>0?"+":""}{catDiff.toFixed(0)}%</span>}
                <span style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.text}}>{fmt(amt)}</span>
              </div>
            </div>
            <BarProg pct={thisTotal>0?amt/thisTotal*100:0} color={PIE_COLORS[i%PIE_COLORS.length]} h={6}/>
          </div>);
        })}
      </div>}
      {/* Top merchants */}
      {topMerchants.length>0&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:18,padding:18,boxShadow:"0 2px 8px rgba(13,27,42,.08)",marginBottom:14}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Top Merchants</div>
        {topMerchants.map(([name,amt],i)=>(
          <div key={name} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderBottom:i<topMerchants.length-1?`1px solid ${C.border}`:"none"}}>
            <div style={{width:32,height:32,borderRadius:8,background:PIE_COLORS[i%PIE_COLORS.length]+"18",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:MF,fontWeight:800,fontSize:13,color:PIE_COLORS[i%PIE_COLORS.length]}}>{i+1}</div>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:C.text}}>{name}</div><div style={{fontSize:11,color:C.textLight}}>{thisExp.filter(e=>e.name===name).length} transactions</div></div>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.red}}>{fmt(amt)}</div>
          </div>
        ))}
      </div>}

      {/* Subscription Detection */}
      {(()=>{
        const nameCount={};
        expenses.forEach(e=>{if(!nameCount[e.name])nameCount[e.name]={count:0,total:0,amounts:[]};nameCount[e.name].count++;nameCount[e.name].total+=parseFloat(e.amount||0);nameCount[e.name].amounts.push(parseFloat(e.amount||0));});
        const subs=Object.entries(nameCount).filter(([n,v])=>v.count>=2&&v.amounts.every(a=>Math.abs(a-v.amounts[0])<1)).map(([name,v])=>({name,amount:v.amounts[0],count:v.count,annual:v.amounts[0]*12})).sort((a,b)=>b.annual-a.annual);
        if(!subs.length)return null;
        return(<div style={{background:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:18,padding:18,marginBottom:14,boxShadow:"0 1px 4px rgba(13,27,42,.04)"}}>
          <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>Detected Subscriptions</div>
          <div style={{fontSize:12,color:C.textLight,marginBottom:12}}>Recurring charges found in your expenses</div>
          {subs.map(s=>(
            <div key={s.name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${C.borderLight}`}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:C.text}}>{s.name}</div>
                <div style={{fontSize:11,color:C.textLight}}>{s.count}x detected - {fmt(s.annual)}/yr</div>
              </div>
              <div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>{fmt(s.amount)}/mo</div>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,marginTop:4,borderTop:`1px solid ${C.border}`}}>
            <span style={{fontSize:13,fontWeight:600,color:C.text}}>Total subscriptions</span>
            <span style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.red}}>{fmt(subs.reduce((s,x)=>s+x.amount,0))}/mo</span>
          </div>
        </div>);
      })()}
      {/* Budget performance */}
      {budgetGoals.length>0&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:18,padding:18,boxShadow:"0 2px 8px rgba(13,27,42,.08)"}}>
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
    </div>
  );
}


function PaycheckView({bills,income,expenses,accounts}){
  const now=new Date();
  const ti=(parseFloat(income.primary||0))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const checking=parseFloat(accounts.checking||0);
  const biweekly=ti/2;
  // Find next payday (assume 15th and last day of month)
  const today=now.getDate();
  let nextPay,daysUntilPay;
  if(today<15){nextPay=new Date(now.getFullYear(),now.getMonth(),15);daysUntilPay=15-today;}else if(today<new Date(now.getFullYear(),now.getMonth()+1,0).getDate()){nextPay=new Date(now.getFullYear(),now.getMonth()+1,0);daysUntilPay=new Date(now.getFullYear(),now.getMonth()+1,0).getDate()-today;}else{nextPay=new Date(now.getFullYear(),now.getMonth()+1,15);daysUntilPay=15;}
  const nextPayStr=nextPay.toISOString().split("T")[0];
  const billsBeforePay=bills.filter(b=>{if(b.paid)return false;const d=new Date(b.dueDate+"T00:00:00");return d<=nextPay;});
  const billsAfterPay=bills.filter(b=>{if(b.paid)return false;const d=new Date(b.dueDate+"T00:00:00");return d>nextPay&&d<=new Date(nextPay.getFullYear(),nextPay.getMonth()+1,nextPay.getDate());});
  const beforeTotal=billsBeforePay.reduce((s,b)=>s+(parseFloat(b.amount)||0),0);
  const afterTotal=billsAfterPay.reduce((s,b)=>s+(parseFloat(b.amount)||0),0);
  const thisMs=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
  const spentSoFar=expenses.filter(e=>e.date?.startsWith(thisMs)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const dailyBurn=spentSoFar/Math.max(1,today);
  const projectedSpend=dailyBurn*daysUntilPay;
  const safeToSpend=Math.max(0,checking-beforeTotal-projectedSpend-200);
  return(
    <div className="fu">
      <div style={{fontFamily:MF,fontSize:19,fontWeight:800,color:C.text,marginBottom:4,letterSpacing:-.3}}>Paycheck Planner</div>
      <div style={{fontSize:13,color:C.textLight,marginBottom:16}}>Plan your spending around your next paycheck</div>
      {/* Next payday card */}
      <div style={{background:`linear-gradient(145deg,${C.navy} 0%,${C.navyLight} 60%,${C.accent} 100%)`,borderRadius:18,padding:20,marginBottom:14,color:"#fff"}}>
        <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Next Payday</div>
        <div style={{fontFamily:MF,fontSize:32,fontWeight:800,color:"#fff",marginBottom:4}}>{daysUntilPay===0?"Today!":daysUntilPay+" days"}</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,.5)",marginBottom:16}}>{nextPay.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>{[["Expected",fmt(biweekly),C.greenMid],["Bills due",fmt(beforeTotal),C.redMid],["Safe to spend",fmt(safeToSpend),safeToSpend>500?C.greenMid:safeToSpend>0?C.amberMid:C.redMid]].map(([l,v,c])=><div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 8px"}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2}}>{l.toUpperCase()}</div><div style={{fontFamily:MF,fontSize:13,fontWeight:700,color:c}}>{v}</div></div>)}</div>
      </div>
      {/* Bills before payday */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:18,padding:18,boxShadow:"0 2px 8px rgba(13,27,42,.08)",marginBottom:12}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>Bills Before Payday</div>
        <div style={{fontSize:12,color:C.textLight,marginBottom:12}}>Due before {nextPay.toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>
        {billsBeforePay.length===0?<div style={{fontSize:13,color:C.green,fontWeight:500}}>✅ No bills due before payday</div>:billsBeforePay.map(b=>{const d=dueIn(b.dueDate);const col=d<0?C.red:d<=3?C.red:d<=7?C.amber:C.textLight;return(<div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${C.border}`}}><div><div style={{fontSize:13,fontWeight:600,color:C.text}}>{b.name}</div><div style={{fontSize:11,color:col,fontWeight:500}}>{d<0?Math.abs(d)+"d overdue":d===0?"Today":d+"d left"}</div></div><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:col}}>{fmt(b.amount)}</div></div>);})}
        {billsBeforePay.length>0&&<div style={{display:"flex",justifyContent:"space-between",paddingTop:10,marginTop:4,borderTop:`1px solid ${C.border}`}}><span style={{fontSize:13,fontWeight:600,color:C.text}}>Total</span><span style={{fontFamily:MF,fontWeight:800,fontSize:15,color:C.red}}>{fmt(beforeTotal)}</span></div>}
      </div>
      {/* Projected spend */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:18,padding:18,boxShadow:"0 2px 8px rgba(13,27,42,.08)",marginBottom:12}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:12}}>Projected Spending</div>
        {[["Daily burn rate",fmt(dailyBurn)+"/day",C.textMid],["Days left",String(daysUntilPay)+" days",C.textMid],["Projected spend",fmt(projectedSpend),projectedSpend>biweekly?C.red:C.amber],["Balance",fmt(checking),C.green],["Bills due","-"+fmt(beforeTotal),C.red],["Safe to spend",fmt(safeToSpend),safeToSpend>500?C.green:safeToSpend>0?C.amber:C.red]].map(([l,v,c])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:13,color:C.textMid}}>{l}</span><span style={{fontFamily:MF,fontWeight:700,fontSize:13,color:c}}>{v}</span></div>)}
      </div>
    </div>
  );
}


function NetWorthTrendView({balHist,debts,accounts}){
  const totalDebt=debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0);
  const totalAssets=(parseFloat(accounts.checking||0))+(parseFloat(accounts.savings||0))+(parseFloat(accounts.cushion||0))+(parseFloat(accounts.investments||0))+(parseFloat(accounts.property||0))+(parseFloat(accounts.vehicles||0));
  const currentNW=totalAssets-totalDebt;
  const chartData=balHist.map(h=>({date:h.date,assets:(h.checking||0)+(h.savings||0)+(h.cushion||0)+(h.investments||0),netWorth:((h.checking||0)+(h.savings||0)+(h.cushion||0)+(h.investments||0))-totalDebt})).slice(-52);
  const firstNW=chartData[0]?.netWorth||currentNW;
  const change=currentNW-firstNW;
  const fD=s=>{if(!s)return"";const d=new Date(s+"T00:00:00");return MOS[d.getMonth()]+" "+d.getDate();};
  const TT=({active,payload,label})=>{if(!active||!payload?.length)return null;return(<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 14px",fontSize:12}}><div style={{fontWeight:700,marginBottom:6}}>{fD(label)}</div>{payload.map(p=><div key={p.dataKey} style={{display:"flex",justifyContent:"space-between",gap:16,marginBottom:2}}><span style={{color:C.textLight}}>{p.name}</span><span style={{fontWeight:700}}>{fmt(p.value)}</span></div>)}</div>);};
  return(
    <div className="fu">
      <div style={{fontFamily:MF,fontSize:19,fontWeight:800,color:C.text,marginBottom:4,letterSpacing:-.3}}>Net Worth Trend</div>
      <div style={{fontSize:13,color:C.textLight,marginBottom:16}}>Track your wealth over time</div>
      {/* Summary card */}
      <div style={{background:`linear-gradient(145deg,${C.navy} 0%,${C.navyLight} 60%,${C.accent} 100%)`,borderRadius:18,padding:20,marginBottom:14,color:"#fff"}}>
        <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Current Net Worth</div>
        <div style={{fontFamily:MF,fontSize:36,fontWeight:800,color:currentNW>=0?C.green:C.red,lineHeight:1,marginBottom:8}}>{fmt(currentNW)}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>{[["Assets",fmt(totalAssets),C.greenMid],["Debt",fmt(totalDebt),C.redMid],["Change",`${change>=0?"+":""}${fmt(change)}`,change>=0?C.greenMid:C.redMid]].map(([l,v,c])=><div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 8px"}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2}}>{l.toUpperCase()}</div><div style={{fontFamily:MF,fontSize:12,fontWeight:700,color:c}}>{v}</div></div>)}</div>
      </div>
      {/* Chart */}
      {chartData.length>1?<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:"18px 4px 12px",marginBottom:14}}>
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
      </div>:<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:32,textAlign:"center",marginBottom:14}}><div style={{fontSize:32,marginBottom:10}}>📈</div><div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:4}}>Building your trend</div><div style={{fontSize:13,color:C.textLight}}>Update your balances regularly to see your net worth grow over time.</div></div>}
      {/* Net Worth Milestones */}
      {(()=>{
        const MILESTONES=[1000,5000,10000,25000,50000,100000,250000,500000,1000000];
        const achieved=MILESTONES.filter(m=>currentNW>=m);
        const next=MILESTONES.find(m=>currentNW<m);
        const prev=achieved[achieved.length-1]||0;
        const pct=next?Math.min(100,((currentNW-prev)/(next-prev))*100):100;
        return(
          <div style={{background:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:18,padding:18,marginBottom:14,boxShadow:"0 1px 4px rgba(13,27,42,.04)"}}>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Net Worth Milestones</div>
            {next&&<div style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:13,color:C.textMid}}>Next milestone</span>
                <span style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.accent}}>{fmt(next)}</span>
              </div>
              <div style={{height:10,background:C.borderLight,borderRadius:99,overflow:"hidden",marginBottom:4}}>
                <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${C.accent},${C.green})`,borderRadius:99,transition:"width .6s"}}/>
              </div>
              <div style={{fontSize:11,color:C.textFaint}}>{fmt(Math.max(0,next-currentNW))} to go - {pct.toFixed(1)}% there</div>
            </div>}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {MILESTONES.map(m=>{
                const done=currentNW>=m;
                return(<div key={m} style={{padding:"10px 8px",borderRadius:12,background:done?C.greenBg:C.surfaceAlt,border:`1.5px solid ${done?C.greenMid:C.borderLight}`,textAlign:"center"}}>
                  <div style={{fontSize:done?16:14,marginBottom:2}}>{done?"✅":"🔒"}</div>
                  <div style={{fontFamily:MF,fontWeight:700,fontSize:11,color:done?C.green:C.textFaint}}>{m>=1000000?"$1M":m>=1000?"$"+(m/1000).toFixed(0)+"k":"$"+m}</div>
                </div>);
              })}
            </div>
          </div>
        );
      })()}
      {/* Asset breakdown */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:18,padding:18,boxShadow:"0 2px 8px rgba(13,27,42,.08)"}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Asset Breakdown</div>
        {[{l:"Checking",v:accounts.checking,ic:"🏦"},{l:"Savings",v:accounts.savings,ic:"💰"},{l:"Cushion",v:accounts.cushion,ic:"🛡️"},{l:"Investments",v:accounts.investments,ic:"📈"},{l:"Property",v:accounts.property,ic:"🏠"},{l:"Vehicles",v:accounts.vehicles,ic:"🚗"}].filter(a=>parseFloat(a.v||0)>0).map(a=>{
          const val=parseFloat(a.v||0);const pct=totalAssets>0?(val/totalAssets*100):0;
          return(<div key={a.l} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><div style={{display:"flex",alignItems:"center",gap:6}}><span>{a.ic}</span><span style={{fontSize:13,fontWeight:600,color:C.text}}>{a.l}</span></div><div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:12,color:C.textLight}}>{pct.toFixed(0)}%</span><span style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.green}}>{fmt(val)}</span></div></div><BarProg pct={pct} color={C.green} h={5}/></div>);
        })}
      </div>
    </div>
  );
}


function TrendView({balHist,accounts,expenses}){
  const [range,setRange]=useState("1M");
  const [mode,setMode]=useState("total");
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
  const fD=s=>{if(!s)return"";const d=new Date(s+"T00:00:00");return MOS[d.getMonth()]+" "+d.getDate();};
  const hasData=chartData.length>1;
  return(
    <div className="fu">
      <div style={{marginBottom:18}}>
        <div style={{fontFamily:MF,fontSize:19,fontWeight:800,color:C.text,letterSpacing:-.3}}>Balance Trend</div>
        <div style={{fontSize:13,color:C.textLight,marginTop:1}}>Track how your money moves over time</div>
      </div>
      <div style={{background:`linear-gradient(145deg,${C.navy} 0%,${C.navyLight} 60%,${C.accent} 100%)`,borderRadius:20,padding:"20px 22px",marginBottom:16,color:"#fff"}}>
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
        {RANGES.map(r=>(
          <button key={r.id} className="ba" onClick={()=>setRange(r.id)} style={{flex:1,padding:"8px 0",borderRadius:9,border:"none",background:range===r.id?C.surface:"transparent",color:range===r.id?C.accent:C.textLight,fontWeight:range===r.id?700:500,fontSize:12,cursor:"pointer"}}>{r.id}</button>
        ))}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        {[{id:"total",l:"Net Balance"},{id:"breakdown",l:"By Account"},{id:"spending",l:"Spending"}].map(m=>(
          <button key={m.id} className="ba" onClick={()=>setMode(m.id)} style={{flex:1,padding:"9px 0",borderRadius:10,border:`1.5px solid ${mode===m.id?C.accent:C.border}`,background:mode===m.id?C.accentBg:C.surface,color:mode===m.id?C.accent:C.textMid,fontWeight:mode===m.id?700:500,fontSize:12,cursor:"pointer"}}>{m.l}</button>
        ))}
      </div>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:18,padding:"20px 4px 8px",marginBottom:16}}>
        {!hasData&&<div style={{height:200,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:C.textLight,padding:20,textAlign:"center"}}><div style={{fontSize:32,marginBottom:10}}>📈</div><div style={{fontSize:14,fontWeight:600,marginBottom:4}}>Building your trend</div><div style={{fontSize:13}}>Update your balances regularly to build your trend line.</div></div>}
        {hasData&&mode==="total"&&<ResponsiveContainer width="100%" height={200}><AreaChart data={chartData} margin={{left:8,right:8,top:4,bottom:0}}><defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={lineCol} stopOpacity={.2}/><stop offset="95%" stopColor={lineCol} stopOpacity={0}/></linearGradient></defs><XAxis dataKey="date" tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={fD} interval="preserveStartEnd"/><YAxis tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v>=1000?(v/1000).toFixed(1)+"k":v)} width={50}/><Tooltip formatter={(v)=>fmt(v)}/><Area type="monotone" dataKey="total" name="Balance" stroke={lineCol} strokeWidth={2.5} fill="url(#tg)" dot={false}/></AreaChart></ResponsiveContainer>}
        {hasData&&mode==="breakdown"&&<ResponsiveContainer width="100%" height={200}><AreaChart data={chartData} margin={{left:8,right:8,top:4,bottom:0}}><XAxis dataKey="date" tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={fD} interval="preserveStartEnd"/><YAxis tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v>=1000?(v/1000).toFixed(1)+"k":v)} width={50}/><Tooltip formatter={(v)=>fmt(v)}/><Area type="monotone" dataKey="checking" name="Checking" stroke={C.navy} strokeWidth={2} fill="transparent"/><Area type="monotone" dataKey="savings" name="Savings" stroke={C.green} strokeWidth={2} fill="transparent"/><Area type="monotone" dataKey="cushion" name="Cushion" stroke={C.accent} strokeWidth={2} fill="transparent"/></AreaChart></ResponsiveContainer>}
        {hasData&&mode==="spending"&&<ResponsiveContainer width="100%" height={200}><BarChart data={spendData} margin={{left:8,right:8,top:4,bottom:0}}><XAxis dataKey="date" tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={fD} interval="preserveStartEnd"/><YAxis tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v>=1000?(v/1000).toFixed(1)+"k":v)} width={50}/><Tooltip formatter={(v)=>fmt(v)}/><Bar dataKey="amount" name="Spent" fill={C.red} radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>}
      </div>
      <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"11px 14px",fontSize:12,color:C.accent}}>{"Tip: Update balances weekly for the best trend line."}</div>
    </div>
  );
}


function StatementView({expenses,bills,income,accounts,debts,trades,appName,categories}){
  const now=new Date();
  const[mo,setMo]=useState(now.getMonth());const[yr,setYr]=useState(now.getFullYear());
  function nav(d){let m=mo+d,y=yr;if(m<0){m=11;y--;}else if(m>11){m=0;y++;}setMo(m);setYr(y);}
  const ms=yr+"-"+String(mo+1).padStart(2,"0");
  const mExp=expenses.filter(e=>e.date?.startsWith(ms));
  const mBills=bills.filter(b=>b.dueDate?.startsWith(ms));
  const mTrades=trades.filter(t=>t.date?.startsWith(ms));
  const totE=mExp.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const totB=mBills.reduce((s,b)=>s+(parseFloat(b.amount)||0),0);
  const tradePnl=mTrades.reduce((s,t)=>s+(parseFloat(t.pnl)||0),0);
  const ti=(parseFloat(income.primary||0))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const catMap=mExp.reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount)||0);return a},{});
  function exportHTML(){const rows=mExp.map(e=>"<tr><td>"+e.date+"</td><td>"+e.name+"</td><td>"+e.category+"</td><td>$"+parseFloat(e.amount).toFixed(2)+"</td></tr>").join("");const html="<html><head><title>"+MOS[mo]+" "+yr+" Statement</title></head><body><h1>"+(appName||"Finances")+" — "+MOS[mo]+" "+yr+"</h1><table border='1'><tr><th>Date</th><th>Name</th><th>Category</th><th>Amount</th></tr>"+rows+"<tr><td colspan='3'><b>Total</b></td><td><b>$"+totE.toFixed(2)+"</b></td></tr></table></body></html>";const b=new Blob([html],{type:"text/html"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=(appName||"finances")+"-"+MOS[mo]+"-"+yr+".html";a.click();URL.revokeObjectURL(u);}
  return(<div className="fu">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
      <div><div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text}}>Monthly Statement</div><div style={{fontSize:13,color:C.textLight}}>{MOS[mo]} {yr}</div></div>
      <div style={{display:"flex",gap:8}}>
        <button className="ba" onClick={()=>nav(-1)} style={{background:C.bg,border:"1px solid "+C.border,borderRadius:10,padding:"8px 12px",cursor:"pointer",color:C.textMid,fontWeight:600}}>←</button>
        <button className="ba" onClick={()=>nav(1)} style={{background:C.bg,border:"1px solid "+C.border,borderRadius:10,padding:"8px 12px",cursor:"pointer",color:C.textMid,fontWeight:600}}>→</button>
        <button className="ba" onClick={exportHTML} style={{background:C.green,border:"none",borderRadius:10,padding:"8px 12px",cursor:"pointer",color:"#fff",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",gap:4}}><Download size={13}/>Export</button>
      </div>
    </div>
    <div style={{background:C.navy,borderRadius:18,padding:20,marginBottom:16,color:"#fff"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {[["Income",fmt(ti),C.greenMid],["Expenses",fmt(totE),C.redMid],["Net",(ti-totE>=0?"+":"")+fmt(ti-totE),ti-totE>=0?C.greenMid:C.redMid]].map(([l,v,c])=><div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"11px 12px"}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:3}}>{l}</div><div style={{fontFamily:MF,fontSize:15,fontWeight:800,color:c}}>{v}</div></div>)}
      </div>
    </div>
    {Object.entries(catMap).sort((a,b)=>b[1]-a[1]).map(([cat,amt],i)=><div key={cat} style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,fontWeight:600,color:C.text}}>{cat}</span><span style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>{fmt(amt)}</span></div><BarProg pct={totE>0?amt/totE*100:0} color={PIE_COLORS[i%PIE_COLORS.length]} h={5}/></div>)}
    {mTrades.length>0&&<div style={{background:C.surface,border:"1px solid "+C.border,borderRadius:14,padding:14,marginTop:12}}><div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.text,marginBottom:4}}>Trading P&L: <span style={{color:tradePnl>=0?C.green:C.red}}>{tradePnl>=0?"+":""}{fmt(tradePnl)}</span></div><div style={{fontSize:12,color:C.textLight}}>{mTrades.length} trades . {mTrades.filter(t=>parseFloat(t.pnl)>0).length} wins</div></div>}
    <div style={{marginTop:12}}>
      <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:10}}>Transactions ({mExp.length})</div>
      {mExp.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(e=>{const cat=categories.find(c=>c.name===e.category);return(<div key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid "+C.border}}><div style={{width:32,height:32,borderRadius:8,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{cat?.icon||"💸"}</div><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:C.text}}>{e.name}</div><div style={{fontSize:11,color:C.textLight}}>{e.date} . {e.category}</div></div><div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>{fmt(e.amount)}</div></div>);})}
      {mExp.length===0&&<Empty text={"No expenses in "+MOS[mo]+" "+yr} icon={FileText}/>}
    </div>
  </div>);
}


function IncomeSpendingView({expenses,income,trades}){
  const[range,setRange]=useState("3M");
  const now=new Date();
  const ti=useMemo(()=>(parseFloat(income.primary||0))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0)),[income]);
  const months=range==="3M"?3:range==="6M"?6:12;
  const data=useMemo(()=>Array.from({length:months},(_,i)=>{
    const d=new Date(now.getFullYear(),now.getMonth()-months+1+i,1);
    const ms=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
    const sp=expenses.filter(e=>e.date?.startsWith(ms)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
    const tp=trades.filter(t=>t.date?.startsWith(ms)).reduce((s,t)=>s+(parseFloat(t.pnl)||0),0);
    const inc=ti+(tp>0?tp:0);
    return{month:MOS[d.getMonth()],income:parseFloat(inc.toFixed(0)),spending:parseFloat(sp.toFixed(0)),saved:parseFloat(Math.max(0,inc-sp).toFixed(0))};
  }),[expenses,income,trades,months]);
  const TT=({active,payload,label})=>{if(!active||!payload?.length)return null;return(<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 14px",fontSize:12}}><div style={{fontWeight:700,marginBottom:6}}>{label}</div>{payload.map(p=><div key={p.dataKey} style={{display:"flex",justifyContent:"space-between",gap:12,marginBottom:2}}><span style={{color:C.textLight}}>{p.name}</span><span style={{fontWeight:700}}>{fmt(p.value)}</span></div>)}</div>);};
  return(
    <div className="fu">
      {/* Income Breakdown */}
      {(()=>{
        const sources=[
          {l:"Primary",v:parseFloat(income.primary||0),c:C.accent},
          {l:"Trading",v:parseFloat(income.trading||0),c:C.green},
          {l:"Freelance",v:parseFloat(income.freelance||0),c:C.purple},
          {l:"Rental",v:parseFloat(income.rental||0),c:C.amber},
          {l:"Dividends",v:parseFloat(income.dividends||0),c:"#0891B2"},
          {l:"Other",v:parseFloat(income.other||0),c:C.textLight},
        ].filter(s=>s.v>0);
        const total=sources.reduce((s,x)=>s+x.v,0);
        if(!total)return null;
        return(
          <div style={{background:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:18,padding:18,marginBottom:14,boxShadow:"0 1px 4px rgba(13,27,42,.04)"}}>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Income Breakdown</div>
            <div style={{display:"flex",alignItems:"center",gap:16}}>
              <PieChart width={120} height={120}>
                <Pie data={sources.map(s=>({name:s.l,value:s.v}))} cx={55} cy={55} innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={2}>
                  {sources.map((s,i)=><Cell key={i} fill={s.c}/>)}
                </Pie>
              </PieChart>
              <div style={{flex:1}}>
                {sources.map(s=>(
                  <div key={s.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:s.c}}/><span style={{fontSize:12,color:C.textMid}}>{s.l}</span></div>
                    <div style={{textAlign:"right"}}>
                      <span style={{fontFamily:MF,fontWeight:700,fontSize:12,color:C.text}}>{fmt(s.v)}</span>
                      <span style={{fontSize:11,color:C.textFaint,marginLeft:4}}>{(s.v/total*100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
      <div style={{fontFamily:MF,fontSize:19,fontWeight:800,color:C.text,marginBottom:4,letterSpacing:-.3}}>Income vs Spending</div>
      <div style={{display:"flex",gap:6,background:C.borderLight,borderRadius:10,padding:3,marginBottom:16}}>
        {["3M","6M","1Y"].map(r=><button key={r} className="ba" onClick={()=>setRange(r)} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",background:range===r?"#fff":"transparent",color:range===r?C.accent:C.textLight,fontWeight:range===r?700:500,fontSize:13,cursor:"pointer"}}>{r}</button>)}
      </div>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:18,padding:"20px 4px 12px",marginBottom:14}}>
        <div style={{display:"flex",gap:16,paddingLeft:16,marginBottom:12}}>{[[C.green,"Income"],[C.red,"Spending"],[C.accent,"Saved"]].map(([c,l])=><div key={l} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:10,borderRadius:3,background:c}}/><span style={{fontSize:12,color:C.textLight}}>{l}</span></div>)}</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{left:8,right:8,top:4,bottom:0}} barGap={3}>
            <XAxis dataKey="month" tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v>=1000?(v/1000).toFixed(0)+"k":v)} width={40}/>
            <Tooltip content={<TT/>}/>
            <Bar dataKey="income" name="Income" fill={C.green} radius={[4,4,0,0]}/>
            <Bar dataKey="spending" name="Spending" fill={C.red} radius={[4,4,0,0]}/>
            <Bar dataKey="saved" name="Saved" fill={C.accent} radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {data.map(m=>{const rate=m.income>0?Math.max(0,(m.income-m.spending)/m.income*100):0;return(<div key={m.month} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:12}}><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,width:32}}>{m.month}</div><div style={{flex:1}}><BarProg pct={m.income>0?m.spending/m.income*100:0} color={m.spending>m.income?C.red:C.green} h={5}/></div><div style={{textAlign:"right",minWidth:80}}><div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>{fmt(m.spending)}</div><div style={{fontSize:11,color:C.textLight}}>{rate.toFixed(0)}% saved</div></div></div>);})}</div>
    </div>
  );
}

// --- DASHBOARD CUSTOMIZE -----------------------------------------------------

function FinancialPhysicalView({income,expenses,debts,accounts,bills,savingsGoals}){
  const ti=(parseFloat(income.primary||0))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
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
  if(ov)priorities.push({ic:"🚨",c:C.red,t:"Pay overdue bills",d:ov+" bill"+(ov!==1?"s":""+" past due — avoid fees")});
  if(liq<1000)priorities.push({ic:"🛡️",c:C.amber,t:"Build $1,000 emergency fund",d:"Have "+fmt(liq)+" — need "+fmt(Math.max(0,1000-liq))+" more"});
  if(dti>36)priorities.push({ic:"💳",c:C.red,t:"Reduce debt load",d:"DTI "+dti.toFixed(1)+"% — target under 28%"});
  if(sr<5&&ti>0)priorities.push({ic:"📉",c:C.amber,t:"Boost savings rate",d:"Currently "+sr.toFixed(1)+"% — target 15-20%"});
  if(efMo<3)priorities.push({ic:"💰",c:C.amber,t:"Grow emergency fund",d:efMo.toFixed(1)+" months saved — target 3-6"});
  if(mi>100)priorities.push({ic:"⚡",c:C.accent,t:"Tackle interest costs",d:"Paying "+fmt(mi)+"/mo in interest"});
  return(<div className="fu">
    <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text,marginBottom:16}}>Financial Physical</div>
    <div style={{background:C.navy,borderRadius:18,padding:20,marginBottom:16,color:"#fff"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {[["Net Worth",fmt(nw),nw>=0?C.greenMid:C.redMid],["Emergency",efMo.toFixed(1)+" mo",efMo>=6?C.greenMid:efMo>=3?C.amberMid:C.redMid],["Savings Rate",sr.toFixed(1)+"%",sr>=15?C.greenMid:sr>=5?C.amberMid:C.redMid],["DTI",dti.toFixed(1)+"%",dti<=28?C.greenMid:dti<=36?C.amberMid:C.redMid]].map(([l,v,c])=><div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"10px 12px"}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:3}}>{l}</div><div style={{fontFamily:MF,fontSize:16,fontWeight:800,color:c}}>{v}</div></div>)}
      </div>
    </div>
    {priorities.length>0&&<div style={{marginBottom:16}}><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:10}}>Top Priorities</div>{priorities.slice(0,3).map((p,i)=><div key={i} style={{background:C.surface,border:"1.5px solid "+p.c+"22",borderRadius:14,padding:14,marginBottom:8,borderLeft:"4px solid "+p.c}}><div style={{display:"flex",gap:10,alignItems:"flex-start"}}><span style={{fontSize:20,flexShrink:0}}>{p.ic}</span><div><div style={{fontSize:13,fontWeight:700,color:C.text}}>{p.t}</div><div style={{fontSize:12,color:C.textMid,marginTop:3,lineHeight:1.5}}>{p.d}</div></div></div></div>)}</div>}
    <div style={{background:C.surface,border:"1px solid "+C.border,borderRadius:16,padding:18}}>
      <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:12}}>Dave Ramsey Steps</div>
      {[[liq>=1000,"$1,000 emergency fund","Have: "+fmt(liq)],[td===0,"Pay off all debt","Total: "+fmt(td)],[efMo>=3,"3-6 months emergency",""+efMo.toFixed(1)+" months saved"],[nw>=0,"Positive net worth",fmt(nw)]].map(([done,t,sub],i)=><div key={i} style={{display:"flex",gap:12,alignItems:"center",padding:"9px 0",borderBottom:i<3?"1px solid "+C.border:""}}><div style={{width:24,height:24,borderRadius:"50%",background:done?C.greenBg:C.bg,border:"2px solid "+(done?C.green:C.border),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:800,color:done?C.green:C.textLight}}>{done?"✓":i+1}</div><div><div style={{fontSize:13,fontWeight:600,color:done?C.textLight:C.text,textDecoration:done?"line-through":"none"}}>{t}</div><div style={{fontSize:11,color:C.textLight,marginTop:2}}>{sub}</div></div></div>)}
    </div>
  </div>);
}


function HealthScoreView({income,expenses,debts,accounts,bills}){
  const ti=(parseFloat(income.primary||0))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const te=expenses.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const td=debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0);
  const tm=debts.reduce((s,d)=>s+(parseFloat(d.minPayment)||0),0);
  const liq=(parseFloat(accounts.savings||0))+(parseFloat(accounts.cushion||0));
  const ov=bills.filter(b=>!b.paid&&dueIn(b.dueDate)<0).length;
  const mExp=te/Math.max(1,new Date().getMonth()+1);
  const sr=ti>0?Math.min(100,Math.max(0,(ti-mExp)/ti*100)):0;
  const dti=ti>0?(tm/ti)*100:0;
  const efMo=mExp>0?liq/mExp:0;
  const srS=sr>=20?100:sr>=10?75:sr>=5?50:sr>0?25:0;
  const dtiS=dti<=15?100:dti<=28?80:dti<=36?60:dti<=43?35:10;
  const efS=efMo>=6?100:efMo>=3?75:efMo>=1?40:10;
  const nwS=td===0?100:ti>0?Math.min(100,Math.max(0,60-(td/ti)*2)):40;
  const psS=Math.max(0,100-ov*20);
  const overall=Math.min(10,Math.max(1,parseFloat(((srS*.25)+(dtiS*.2)+(efS*.2)+(nwS*.2)+(psS*.15))/10).toFixed(1)));
  const col=overall>=8?C.green:overall>=6?C.accent:overall>=4?C.amber:C.red;
  const label=overall>=8?"Excellent 💪":overall>=6?"Good 👍":overall>=4?"Fair ⚡":"Needs Work 📈";
  const gr=s=>s>=85?"A":s>=70?"B":s>=55?"C":s>=40?"D":"F";
  const gc=s=>s>=85?C.green:s>=70?C.accent:s>=55?C.amber:C.red;
  return(
    <div className="fu">
      <div style={{fontFamily:MF,fontSize:19,fontWeight:800,color:C.text,marginBottom:4,letterSpacing:-.3}}>Health Score</div>
      <div style={{fontSize:13,color:C.textLight,marginBottom:16}}>Based on savings, debt, spending & payments</div>
      <div style={{background:C.navy,borderRadius:18,padding:24,marginBottom:16,display:"flex",alignItems:"center",gap:20}}>
        <div style={{textAlign:"center",flexShrink:0}}><div style={{fontFamily:MF,fontSize:52,fontWeight:800,color:col,lineHeight:1}}>{overall}</div><div style={{fontSize:12,color:"rgba(255,255,255,.4)",marginTop:4}}>/10</div></div>
        <div style={{flex:1}}><div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:"#fff",marginBottom:4}}>{label}</div><BarProg pct={overall*10} color={col} h={8}/><div style={{fontSize:12,color:"rgba(255,255,255,.4)",marginTop:6}}>Financial Health Score</div></div>
      </div>
      {[{l:"Savings Rate",s:Math.round(srS),tip:`${sr.toFixed(1)}% — target 20%+`},{l:"Debt-to-Income",s:Math.round(dtiS),tip:`${dti.toFixed(1)}% DTI — under 28% is healthy`},{l:"Emergency Fund",s:Math.round(efS),tip:`${efMo.toFixed(1)} months — target 6 months`},{l:"Debt Load",s:Math.round(nwS),tip:td===0?"No debt — excellent!":fmt(td)+" total debt"},{l:"Payment History",s:psS,tip:ov===0?"All bills current":ov+" overdue bill"+(ov!==1?"s":"")}].map(it=>(
        <div key={it.l} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:14,marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:13,fontWeight:600,color:C.text}}>{it.l}</span><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:13,fontWeight:700,color:gc(it.s)}}>{it.s}/100</span><div style={{width:24,height:24,borderRadius:"50%",background:gc(it.s)+"18",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:MF,fontWeight:800,fontSize:11,color:gc(it.s)}}>{gr(it.s)}</div></div></div>
          <BarProg pct={it.s} color={gc(it.s)} h={5}/>
          <div style={{fontSize:11,color:C.textLight,marginTop:4}}>{it.tip}</div>
        </div>
      ))}
    </div>
  );
}

// --- INCOME vs SPENDING -------------------------------------------------------

function TaxView({expenses,income,trades,shifts,appName}){
  const now=new Date();const yr=now.getFullYear();
  const ti=(parseFloat(income.primary||0))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const annualIncome=ti*12;
  const tradePnl=trades.filter(t=>t.date?.startsWith(String(yr))).reduce((s,t)=>s+(parseFloat(t.pnl)||0),0);
  const shiftEarnings=shifts.filter(s=>s.date?.startsWith(String(yr))).reduce((s,x)=>s+(parseFloat(x.gross)||0),0);
  const catMap=expenses.filter(e=>e.date?.startsWith(String(yr))).reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount)||0);return a},{});
  const totalExp=Object.values(catMap).reduce((s,v)=>s+v,0);
  function exportCSV(){
    const rows=[["Date","Name","Category","Amount"],...expenses.filter(e=>e.date?.startsWith(String(yr))).map(e=>[e.date,e.name,e.category,e.amount])];
    const csv=rows.map(r=>r.join(",")).join("\n");
    const b=new Blob([csv],{type:"text/csv"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`${appName||"trackfi"}-${yr}-expenses.csv`;a.click();URL.revokeObjectURL(u);
  }
  return(
    <div className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text}}>Tax Summary {yr}</div>
        <button onClick={exportCSV} style={{display:"flex",alignItems:"center",gap:5,background:C.green,border:"none",borderRadius:10,padding:"8px 12px",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}}><Download size={13}/>CSV</button>
      </div>
      <div style={{fontSize:13,color:C.textLight,marginBottom:16}}>Year-to-date overview for tax preparation</div>
      <div style={{background:C.navy,borderRadius:18,padding:20,marginBottom:14,color:"#fff"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[["Annual Income",fmt(annualIncome),C.greenMid],["YTD Expenses",fmt(totalExp),C.redMid],["Trading P&L",(tradePnl>=0?"+":"")+fmt(tradePnl),tradePnl>=0?C.greenMid:C.redMid],["Shift Earnings",fmt(shiftEarnings),C.accentMid]].map(([l,v,c])=><div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"10px 12px"}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:3}}>{l.toUpperCase()}</div><div style={{fontFamily:MF,fontSize:15,fontWeight:800,color:c}}>{v}</div></div>)}
        </div>
      </div>
      <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"11px 14px",marginBottom:14,fontSize:13,color:C.accent}}>⚠️ This is for reference only. Consult a tax professional for filing advice.</div>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:18,padding:18,boxShadow:"0 2px 8px rgba(13,27,42,.08)"}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Expenses by Category</div>
        {Object.entries(catMap).sort((a,b)=>b[1]-a[1]).map(([cat,amt],i)=>(
          <div key={cat} style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,fontWeight:600,color:C.text}}>{cat}</span><span style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>{fmt(amt)}</span></div>
            <BarProg pct={totalExp>0?amt/totalExp*100:0} color={PIE_COLORS[i%PIE_COLORS.length]} h={5}/>
          </div>
        ))}
        <div style={{display:"flex",justifyContent:"space-between",paddingTop:12,marginTop:4,borderTop:`1px solid ${C.border}`}}><span style={{fontSize:13,fontWeight:700,color:C.text}}>Total YTD</span><span style={{fontFamily:MF,fontWeight:800,fontSize:15,color:C.red}}>{fmt(totalExp)}</span></div>
      </div>
    </div>
  );
}

function SubsView({detectedSubs,expenses}){
  const monthly=detectedSubs.filter(s=>s.interval==="Monthly");
  const other=detectedSubs.filter(s=>s.interval!=="Monthly");
  const totalMo=monthly.reduce((s,x)=>s+(parseFloat(x.amount)||0),0);
  return(
    <div className="fu">
      <div style={{fontFamily:MF,fontSize:19,fontWeight:800,color:C.text,letterSpacing:-.3,marginBottom:4}}>Subscriptions</div>
      <div style={{fontSize:13,color:C.textLight,marginBottom:16}}>Auto-detected from your expenses</div>
      {detectedSubs.length===0&&<div style={{textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:36,marginBottom:12}}>🔍</div><div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:4}}>No subscriptions detected yet</div><div style={{fontSize:13,color:C.textLight}}>Add more expenses and Trackfi will find recurring patterns automatically.</div></div>}
      {monthly.length>0&&<>
        <div style={{background:C.navy,borderRadius:16,padding:18,marginBottom:14,color:"#fff"}}>
          <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Monthly Subscriptions</div>
          <div style={{fontFamily:MF,fontSize:28,fontWeight:800,color:"#fff",marginBottom:2}}>{fmt(totalMo)}<span style={{fontSize:14,fontWeight:500,color:"rgba(255,255,255,.5)"}}>/mo</span></div>
          <div style={{fontSize:12,color:"rgba(255,255,255,.4)"}}>{fmt(totalMo*12)}/year</div>
        </div>
        {monthly.map((s,i)=>(
          <div key={i} style={{background:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:16,padding:"14px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:40,height:40,borderRadius:12,background:PIE_COLORS[i%PIE_COLORS.length]+"18",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:MF,fontWeight:800,fontSize:14,color:PIE_COLORS[i%PIE_COLORS.length],flexShrink:0}}>🔄</div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:C.text}}>{s.name}</div>
              <div style={{fontSize:12,color:C.textLight,marginTop:1}}>{s.interval} · {s.occurrences} times · Last: {s.lastDate}</div>
            </div>
            <div style={{textAlign:"right"}}><div style={{fontFamily:MF,fontWeight:700,fontSize:15,color:C.red}}>{fmt(s.amount)}</div><div style={{fontSize:11,color:C.textLight}}>{s.category}</div></div>
          </div>
        ))}
      </>}
      {other.length>0&&<>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:10,marginTop:8}}>Other Recurring</div>
        {other.map((s,i)=>(
          <div key={i} style={{background:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:14,padding:"12px 14px",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontSize:13,fontWeight:600,color:C.text}}>{s.name}</div><div style={{fontSize:11,color:C.textLight}}>{s.interval}</div></div>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>{fmt(s.amount)}</div>
          </div>
        ))}
      </>}
    </div>
  );
}


function SettingsView({settings,setSettings,appName,setAppName,darkMode,setDarkMode,pinEnabled,setPinEnabled,profCategory,setProfCategory,profSub,setProfSub,expenses,bills,debts,trades,accounts,income,shifts,savingsGoals,budgetGoals,setBills,setDebts,setTrades,setShifts,setSGoals,setBGoals,setAccounts,setIncome,setExpenses,categories,setCategories,onResetOnboarding}){
  const[nm,setNm]=useState(appName||"");const[showPIN,setShowPIN]=useState(false);const[profTab,setProfTab]=useState(false);
  function exportData(){const d={exportedAt:new Date().toISOString(),appName,accounts,income,expenses,bills,debts,trades,shifts,savingsGoals,budgetGoals,version:"2.0"};const b=new Blob([JSON.stringify(d,null,2)],{type:"application/json"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`${(appName||"finances").replace(/\s+/g,"-")}-backup.json`;a.click();URL.revokeObjectURL(u);}
  async function importData(file){try{const t=await file.text();const d=JSON.parse(t);if(d.accounts)setAccounts(d.accounts);if(d.income)setIncome(d.income);if(d.expenses)setExpenses(d.expenses);if(d.bills)setBills(d.bills);if(d.debts)setDebts(d.debts);if(d.trades)setTrades(d.trades);if(d.shifts)setShifts(d.shifts);if(d.savingsGoals)setSGoals(d.savingsGoals);if(d.budgetGoals)setBGoals(d.budgetGoals);alert("✅ Imported!");}catch(e){alert("❌ "+e.message);}}
  const S=(k,l,d,ic)=>(<div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${C.border}`}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>{ic}</span><div><div style={{fontSize:14,fontWeight:600,color:C.text}}>{l}</div><div style={{fontSize:12,color:C.textLight}}>{d}</div></div></div><button onClick={()=>setSettings(p=>({...p,[k]:!p[k]}))} style={{background:"none",border:"none",cursor:"pointer",color:settings[k]?C.accent:C.borderLight,padding:0}}>{settings[k]?<ToggleRight size={28}/>:<ToggleLeft size={28}/>}</button></div>);
  return(<div className="fu">
    <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text,marginBottom:16}}>Settings</div>
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:16,marginBottom:12}}>
      <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>App Name</div>
      <div style={{display:"flex",gap:8}}><input value={nm} onChange={e=>setNm(e.target.value)} placeholder="Trackfi" style={{flex:1,background:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"10px 13px",color:C.text,fontSize:14,outline:"none"}}/><button className="ba" onClick={()=>nm.trim()&&setAppName(nm.trim())} style={{background:C.accent,border:"none",borderRadius:10,padding:"0 16px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13}}>Save</button></div>
    </div>
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:16,marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5}}>Profession</div><div style={{fontSize:12,fontWeight:600,color:C.accent}}>{getProfession(profCategory).icon} {getProfession(profCategory).label}</div></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
        {PROFESSIONS.map(p=><button key={p.id} onClick={()=>{setProfCategory(p.id);setProfSub(p.subs[0].id);}} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:10,border:`1.5px solid ${profCategory===p.id?C.accent:C.border}`,background:profCategory===p.id?C.accentBg:C.surfaceAlt,cursor:"pointer",textAlign:"left",WebkitTapHighlightColor:"transparent"}}><span style={{fontSize:16}}>{p.icon}</span><span style={{fontSize:12,fontWeight:600,color:profCategory===p.id?C.accent:C.text}}>{p.label}</span></button>)}
      </div>
    </div>
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:16,marginBottom:12}}>
      <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>Appearance & Security</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${C.border}`}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>{darkMode?"🌙":"☀️"}</span><div><div style={{fontSize:14,fontWeight:600,color:C.text}}>Dark Mode</div></div></div><button onClick={()=>setDarkMode(d=>!d)} style={{background:"none",border:"none",cursor:"pointer",color:darkMode?C.accent:C.borderLight,padding:0}}>{darkMode?<ToggleRight size={28}/>:<ToggleLeft size={28}/>}</button></div>
      <div style={{padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>🔒</span><div><div style={{fontSize:14,fontWeight:600,color:C.text}}>PIN Lock</div><div style={{fontSize:12,color:C.textLight}}>{pinEnabled?"Enabled":"Disabled"}</div></div></div><button onClick={()=>{if(pinEnabled){localStorage.removeItem("fv_pin_hash");setPinEnabled(false);}else setShowPIN(true);}} style={{background:"none",border:"none",cursor:"pointer",color:pinEnabled?C.accent:C.borderLight,padding:0}}>{pinEnabled?<ToggleRight size={28}/>:<ToggleLeft size={28}/>}</button></div>
        {showPIN&&<div style={{marginTop:10}}><PINSetup onSave={()=>{setPinEnabled(true);setShowPIN(false);}} onCancel={()=>setShowPIN(false)} darkMode={darkMode}/></div>}
      </div>
      <div style={{display:"flex",gap:8,paddingTop:12}}>
        <button className="ba" onClick={exportData} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:10,padding:"11px 0",color:C.accent,fontWeight:700,fontSize:13,cursor:"pointer"}}><Download size={14}/>Export</button>
        <label className="ba" style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 0",color:C.textMid,fontWeight:700,fontSize:13,cursor:"pointer"}}><Database size={14}/>Import<input type="file" accept=".json" style={{display:"none"}} onChange={async e=>importData(e.target.files[0])}/></label>
      </div>
    </div>
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:16,marginBottom:12}}>
      <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Features</div>
      {S("showTrading","Futures Trading","Track P&L, win rate","📈")}
      {S("showCrypto","Crypto","Add to net worth","🪙")}
      {S("showHealth","Health Score","Gamified financial score","🏆")}
      {S("showSavings","Savings Goals","Track goals with timelines","🎯")}
    </div>
    <button className="ba" onClick={()=>window._loadDemo&&window._loadDemo()} style={{width:"100%",background:`linear-gradient(135deg,${C.accent},${C.green})`,border:"none",borderRadius:12,padding:"12px 0",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:10}}>🧪 Load Demo Data</button>
    {onResetOnboarding&&<button className="ba" onClick={onResetOnboarding} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 0",color:C.textMid,fontWeight:600,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><RefreshCw size={14}/>Re-run Setup Wizard</button>}
    {onSignOut&&<div style={{marginTop:20,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
      {userEmail&&<div style={{fontSize:12,color:C.textLight,textAlign:"center",marginBottom:10}}>{"Signed in as "}{userEmail}</div>}
      <button className="ba" onClick={()=>onSignOut()} style={{width:"100%",background:C.redBg,border:`1px solid ${C.redMid}`,borderRadius:12,padding:"12px 0",color:C.red,fontWeight:700,fontSize:14,cursor:"pointer"}}>{"Sign Out"}</button>
    </div>}
  </div>);
}


function ChatView({categories,expenses,bills,debts,accounts,income,savingsGoals,trades,tradingAccount,setExpenses,setBills,setDebts,setSGoals,setAccounts,setIncome,setTrades,setBGoals}){
  const[msgs,setMsgs]=useState([{role:"a",text:"Hey! Log expenses:\n• \"lunch 12\" - Food $12\n• \"rent 1200 due 28th\" - Bill\n• \"checking 3200\" - Balance\n• \"traded ES long +250\" - Trade\n• \"undo\" - Remove last\nOr ask: \"can I afford $200?\""}]);
  const[input,setInput]=useState("");const[pending,setPending]=useState(null);const[history,setHistory]=useState([]);
  const botRef=useRef();
  useEffect(()=>{botRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,pending]);
  const ti=useMemo(()=>(parseFloat(income.primary||0))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0)),[income]);
  const te=useMemo(()=>expenses.reduce((s,e)=>s+(parseFloat(e.amount)||0),0),[expenses]);
  const ck=parseFloat(accounts.checking||0);
  const bs=bills.filter(b=>!b.paid&&dueIn(b.dueDate)>=0&&dueIn(b.dueDate)<=7).reduce((s,b)=>s+(parseFloat(b.amount)||0),0);
  const sts=Math.max(0,ck-bs-200);
  const burn=dayOfMonth()>0?te/dayOfMonth():0;
  function handleQ(t){
    if(t.includes("afford")||t.includes("safe")){const m=t.match(/[\d,]+/);const a=m?parseFloat(m[0].replace(/,/g,"")):null;if(a)return a<=sts?"Yes! "+fmt(a)+" fits in "+fmt(sts):"No — "+fmt(a)+" exceeds safe-to-spend "+fmt(sts);return "Safe-to-spend: "+fmt(sts);}
    if(t.includes("bill")||t.includes("due")){const up=bills.filter(b=>!b.paid&&dueIn(b.dueDate)>=0&&dueIn(b.dueDate)<=14);const ov=bills.filter(b=>!b.paid&&dueIn(b.dueDate)<0);return(ov.length?"🚨 Overdue: "+ov.map(b=>b.name+" "+fmt(b.amount)).join(", ")+"\n":"")+(up.length?"Due soon: "+up.map(b=>b.name+" "+fmt(b.amount)+" ("+dueIn(b.dueDate)+"d)").join(", "):"No bills due soon");}
    if(t.includes("spend"))return fmt(te)+" spent this month . "+fmt(burn)+"/day burn";
    if(t.includes("balance")||t.includes("account"))return"Checking: "+fmt(accounts.checking)+" . Savings: "+fmt(accounts.savings);
    if(t.includes("debt")){const td=debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0);return debts.length?"Total debt: "+fmt(td)+"\n"+debts.map(d=>"• "+d.name+": "+fmt(d.balance)).join(String.fromCharCode(13,10)):"No debts!";}
    if(t.includes("net worth")){const ta=["checking","savings","cushion","investments"].reduce((s,k)=>s+(parseFloat(accounts[k]||0)),0);const td=debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0);return"Net Worth: "+fmt(ta-td);}
    return null;
  }
  function send(){const text=input.trim();if(!text)return;setInput("");setMsgs(p=>[...p,{role:"u",text}]);const t=text.toLowerCase();const isQ=t.includes("?")||/^(how|what|can|show|is|am|will|when|tell)/.test(t);if(isQ){const ans=handleQ(t);if(ans){setMsgs(p=>[...p,{role:"a",text:ans}]);return;}}const parsed=parseMsg(text,categories,debts);if(!parsed){setMsgs(p=>[...p,{role:"a",text:"Try: lunch 12, rent 1200 due 28th, checking 3200, undo"}]);return;}
    if(parsed.type==="undo"){if(!history.length){setMsgs(p=>[...p,{role:"a",text:"Nothing to undo!"}]);return;}const last=history[history.length-1];if(last.type==="expense")setExpenses(p=>p.filter(x=>x.id!==last.id));else if(last.type==="bill")setBills(p=>p.filter(x=>x.id!==last.id));else if(last.type==="debt")setDebts(p=>p.filter(x=>x.id!==last.id));else if(last.type==="trade")setTrades(p=>p.filter(x=>x.id!==last.id));else if(last.type==="account")setAccounts(p=>({...p,[last.key]:last.oldVal}));setHistory(p=>p.slice(0,-1));setMsgs(p=>[...p,{role:"a",text:"↩️ Undone: "+last.label}]);return;}
    setPending(parsed);setMsgs(p=>[...p,{role:"a",text:"Confirm?"}]);}
  function confirm(){if(!pending)return;const id=Date.now();let lbl="";
    if(pending.type==="expense"){setExpenses(p=>[...p,{id,...pending,notes:""}]);setHistory(p=>[...p,{type:"expense",id,label:pending.name+" "+fmt(pending.amount)}]);lbl="✅ "+pending.name+" ("+fmt(pending.amount)+") logged!";}else if(pending.type==="bill"){setBills(p=>[...p,{id,...pending,paid:false,autoPay:false}]);setHistory(p=>[...p,{type:"bill",id,label:pending.name}]);lbl="✅ "+pending.name+" bill added!";}else if(pending.type==="debt"){if(pending.isUpdate){setDebts(p=>p.map(d=>d.id===pending.matchId?{...d,balance:pending.balance}:d));}else{setDebts(p=>[...p,{id,name:pending.name,balance:pending.balance,rate:pending.rate||"",minPayment:""}]);setHistory(p=>[...p,{type:"debt",id,label:pending.name}]);}lbl="✅ "+pending.name+" saved!";}else if(pending.type==="trade"){setTrades(p=>[{id,date:pending.date,symbol:pending.symbol,side:pending.side,contracts:"1",pnl:pending.pnl,entry:"",exit:"",note:""},...p]);setHistory(p=>[...p,{type:"trade",id,label:pending.symbol+" "+pending.side}]);lbl="✅ "+pending.symbol+" "+(parseFloat(pending.pnl)>=0?"+":"")+fmt(pending.pnl);}else if(pending.type==="account"){const oldVal=accounts[pending.key];setAccounts(p=>({...p,[pending.key]:pending.amount}));setHistory(p=>[...p,{type:"account",key:pending.key,oldVal,label:pending.key}]);lbl="✅ "+pending.key+": "+fmt(pending.amount);}
    setMsgs(p=>[...p,{role:"a",text:lbl||"✅ Saved!"}]);setPending(null);}
  const cr=(l,v)=><div style={{display:"flex",justifyContent:"space-between",padding:"6px 10px",background:C.bg,borderRadius:8,marginBottom:3}}><span style={{fontSize:12,color:C.textLight}}>{l}</span><span style={{fontSize:12,color:C.text,fontWeight:600}}>{v}</span></div>;
  return(<div style={{display:"flex",flexDirection:"column",height:"100%",minHeight:0}}>
    <div style={{background:sts>200?"linear-gradient(135deg,#00C896,#00c46a)":"linear-gradient(135deg,#FF4757,#ff4d5e)",borderRadius:16,padding:"14px 18px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
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


function GoalRing({pct,size=80,color,icon,label,saved,target}){
  const r=30,c=2*Math.PI*r;
  const filled=Math.min(1,pct/100)*c;
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
      <div style={{position:"relative",width:size,height:size}}>
        <svg width={size} height={size} viewBox="0 0 80 80" style={{transform:"rotate(-90deg)"}}>
          <circle cx="40" cy="40" r={r} fill="none" stroke={C.borderLight} strokeWidth="8"/>
          <circle cx="40" cy="40" r={r} fill="none" stroke={color||C.accent} strokeWidth="8"
            strokeDasharray={`${filled} ${c}`} strokeLinecap="round"
            style={{transition:"stroke-dasharray .6s ease"}}/>
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
      {type==="bill"&&<><div style={{display:"flex",gap:12}}><FI half label="Amount ($)" type="number" value={form.amount||""} onChange={e=>ff("amount",e.target.value)}/><FI half label="Due Date" type="date" value={form.dueDate||""} onChange={e=>ff("dueDate",e.target.value)}/></div><FS label="Recurring" options={["Monthly","Bi-weekly","Quarterly","Annual","One-time"]} value={form.recurring||""} onChange={e=>ff("recurring",e.target.value)}/><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderTop:`1px solid ${C.border}`,marginTop:4}}><div><div style={{fontSize:13,fontWeight:600,color:C.text}}>Auto-Pay</div><div style={{fontSize:12,color:C.textLight}}>Mark this bill as automatically paid</div></div><button onClick={()=>ff("autoPay",!form.autoPay)} style={{background:"none",border:"none",cursor:"pointer",color:form.autoPay?C.accent:C.borderLight,padding:0,display:"flex"}}>{form.autoPay?<ToggleRight size={30}/>:<ToggleLeft size={30}/>}</button></div></>}
      {type==="debt"&&<><div style={{display:"flex",gap:12}}><FI half label="Balance ($)" type="number" value={form.balance||""} onChange={e=>ff("balance",e.target.value)}/><FI half label="Original ($)" type="number" value={form.original||""} onChange={e=>ff("original",e.target.value)}/></div><div style={{display:"flex",gap:12}}><FI half label="Rate %" type="number" value={form.rate||""} onChange={e=>ff("rate",e.target.value)}/><FI half label="Min Payment ($)" type="number" value={form.minPayment||""} onChange={e=>ff("minPayment",e.target.value)}/></div></>}
      <button className="ba" onClick={()=>{onDelete();onClose();}} style={{width:"100%",background:C.redBg,border:`1px solid ${C.redMid}`,borderRadius:11,padding:"13px 0",color:C.red,fontWeight:700,fontSize:14,cursor:"pointer",marginTop:6}}>🗑 Delete</button>
    </Modal>
  );
}

// --- TRADING VIEW -------------------------------------------------------------

function SwipeRow({children,onDelete}){
  const[swiped,setSwiped]=useState(false);
  const startX=useRef(0);
  return(
    <div style={{position:"relative",overflow:"hidden",marginBottom:8}}
      onTouchStart={e=>{startX.current=e.touches[0].clientX;}}
      onTouchEnd={e=>{const dx=startX.current-e.changedTouches[0].clientX;if(dx>60)setSwiped(true);else if(dx<-20)setSwiped(false);}}>
      <div style={{transform:swiped?"translateX(-72px)":"translateX(0)",transition:"transform .2s ease"}}>
        {children}
      </div>
      {swiped&&<div style={{position:"absolute",right:0,top:0,bottom:0,width:68,display:"flex",alignItems:"center",justifyContent:"center",background:C.red,borderRadius:"0 14px 14px 0",cursor:"pointer"}} onClick={()=>{onDelete();setSwiped(false);}}>
        <Trash2 size={18} color="#fff"/>
      </div>}
    </div>
  );
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
      const [name,cat,range]=ET[Math.floor(Math.random()*ET.length)];
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


function AuthScreen({onAuth}){
  const[mode,setMode]=useState("login");
  const[email,setEmail]=useState("");
  const[pass,setPass]=useState("");
  const[err,setErr]=useState("");
  const[loading,setLoading]=useState(false);
  async function submit(){
    if(!email.trim()||!pass.trim()){setErr("Please fill in all fields.");return;}
    setLoading(true);setErr("");
    try{
      const r=mode==="login"?await signIn(email.trim(),pass):await signUp(email.trim(),pass);
      if(r.error_description||r.error||r.msg){setErr(r.error_description||r.msg||"Something went wrong.");}else if(r.access_token){onAuth(r);}else{setErr("Check your email to confirm your account.");}
    }catch(e){setErr(e.message||"Network error");}
    setLoading(false);
  }
  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg,${C.navy} 0%,${C.accent} 100%)`,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <style>{CSS}</style>
      <div style={{background:"#fff",borderRadius:24,width:"100%",maxWidth:420,padding:"36px 28px",boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontFamily:MF,fontSize:32,fontWeight:900,color:C.navy,marginBottom:4}}>💰 Trackfi</div>
          <div style={{fontSize:14,color:C.textLight}}>{mode==="login"?"Welcome back":"Create your account"}</div>
        </div>
        {err&&<div style={{background:C.redBg,border:`1px solid ${C.redMid}`,borderRadius:12,padding:"10px 14px",fontSize:13,color:C.red,marginBottom:14}}>{err}</div>}
        <FI label="Email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com" type="email"/>
        <FI label="Password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Password" type="password" onKeyDown={e=>e.key==="Enter"&&submit()}/>
        <button onClick={submit} disabled={loading} style={{width:"100%",padding:"14px",borderRadius:14,border:"none",background:loading?C.border:`linear-gradient(135deg,${C.accent},${C.green})`,color:"#fff",fontFamily:MF,fontWeight:800,fontSize:16,cursor:loading?"default":"pointer",marginBottom:14,marginTop:4}}>{loading?"...":(mode==="login"?"Sign In":"Create Account")}</button>
        <div style={{textAlign:"center",fontSize:13,color:C.textLight}}>
          {mode==="login"?"Don't have an account? ":"Already have an account? "}
          <button onClick={()=>{setMode(mode==="login"?"signup":"login");setErr("");}} style={{background:"none",border:"none",color:C.accent,fontWeight:700,cursor:"pointer",fontSize:13}}>{mode==="login"?"Sign Up":"Sign In"}</button>
        </div>
      </div>
    </div>
  );
}

function AppInner(){
  const[authSession,setAuthSession]=useState(null);
  const[authLoading,setAuthLoading]=useState(true);
  const[ready,setReady]=useState(false);
  const[onboarded,setOnboarded]=useState(()=>{try{return localStorage.getItem("fv_onboarded")==="1";}catch{return false;}});
  const[tab,setTabRaw]=useState("home");
  const[tabHistory,setTabHistory]=useState([]);
  const[darkMode,setDarkMode]=useState(()=>{try{return localStorage.getItem("fv_dark")==="1";}catch{return false;}});
  const[hidden,setHidden]=useState(false);
  const[modal,setModal]=useState(null);
  const[form,setForm]=useState({});
  const[editItem,setEditItem]=useState(null);
  const[confirm,setConfirm]=useState(null);
  const[syncing,setSyncing]=useState(false);
  const[syncStatus,setSyncStatus]=useState(null);
  const[appName,setAppName]=useState("Trackfi");
  const[profCategory,setProfCategory]=useState("healthcare");
  const[profSub,setProfSub]=useState("nurse_rn");
  const[accounts,setAccounts]=useState({checking:"",savings:"",cushion:"",investments:"",property:"",vehicles:""});
  const[income,setIncome]=useState({primary:"",other:"",trading:"",rental:"",dividends:"",freelance:""});
  const[expenses,setExpenses]=useState([]);
  const[bills,setBills]=useState([]);
  const[debts,setDebts]=useState([]);
  const[budgetGoals,setBGoals]=useState([]);
  const[savingsGoals,setSGoals]=useState([]);
  const[categories,setCats]=useState(DEF_CATS);
  const[trades,setTrades]=useState([]);
  const[tradingAccount,setTradingAccount]=useState({deposit:"",balance:""});
  const[shifts,setShifts]=useState([]);
  const[balHist,setBalHist]=useState([]);
  const[notifs,setNotifs]=useState([]);
  const[calColors,setCalColors]=useState({expense:C.red,bill:C.amber,today:C.accent,dotStyle:"circle"});
  const[settings,setSettings]=useState({showTrading:true,showCrypto:false,showHealth:true,showSavings:true,quickActions:["expense","bill","debt","shift","trade","goals"]});
  const[dashConfig,setDashConfig]=useState({showIncomeChart:true,showMetrics:true,showAccounts:true,showBills:true,showDebts:true,showGoals:true});
  const userId=authSession?.user?.id||null;
  const authToken=authSession?.access_token||null;
  const totalIncome=useMemo(()=>(parseFloat(income.primary||0))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0)),[income]);
  const totalAssets=useMemo(()=>(parseFloat(accounts.checking||0))+(parseFloat(accounts.savings||0))+(parseFloat(accounts.cushion||0))+(parseFloat(accounts.investments||0))+(parseFloat(accounts.property||0))+(parseFloat(accounts.vehicles||0)),[accounts]);
  const totalExp=useMemo(()=>expenses.reduce((s,e)=>s+(parseFloat(e.amount)||0),0),[expenses]);
  const totalDebt=useMemo(()=>debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0),[debts]);
  const cashflow=totalIncome-totalExp;
  const netWorth=totalAssets-totalDebt;
  const overdue=useMemo(()=>bills.filter(b=>!b.paid&&dueIn(b.dueDate)<0),[bills]);
  const dueSoon=useMemo(()=>bills.filter(b=>!b.paid&&dueIn(b.dueDate)>=0&&dueIn(b.dueDate)<=7),[bills]);
  const billsSoonAmt=useMemo(()=>dueSoon.reduce((s,b)=>s+(parseFloat(b.amount)||0),0),[dueSoon]);
  const burnRate=dayOfMonth()>0?totalExp/dayOfMonth():0;
  const liquid=(parseFloat(accounts.savings||0))+(parseFloat(accounts.cushion||0));
  const savingsRate=totalIncome>0?Math.max(0,cashflow/totalIncome*100):0;
  const unreadNotifs=useMemo(()=>notifs.filter(n=>!n.read).length,[notifs]);
  const detectedSubs=useMemo(()=>{
    if(expenses.length<2)return[];
    const nm={};
    expenses.forEach(e=>{const k=e.name?.toLowerCase().trim();if(!k)return;if(!nm[k])nm[k]=[];nm[k].push(e);});
    const subs=[];
    Object.entries(nm).forEach(([name,exps])=>{
      if(exps.length<2)return;
      const sorted=[...exps].sort((a,b)=>a.date?.localeCompare(b.date));
      const amounts=exps.map(e=>parseFloat(e.amount)||0);
      const avg=amounts.reduce((s,a)=>s+a,0)/amounts.length;
      if(!amounts.every(a=>Math.abs(a-avg)<avg*0.1))return;
      const gaps=[];
      for(let i=1;i<sorted.length;i++){gaps.push(Math.round((new Date(sorted[i].date+"T00:00:00")-new Date(sorted[i-1].date+"T00:00:00"))/(1000*60*60*24)));}
      const avgGap=gaps.reduce((s,g)=>s+g,0)/gaps.length;
      let interval=null;
      if(avgGap>=25&&avgGap<=35){interval="Monthly";}else if(avgGap>=6&&avgGap<=8){interval="Weekly";}else if(avgGap>=350&&avgGap<=380){interval="Annual";}
      if(!interval)return;
      subs.push({name:exps[0].name,amount:avg.toFixed(2),interval,occurrences:exps.length,lastDate:sorted[sorted.length-1].date,category:exps[0].category});
    });
    return subs.sort((a,b)=>parseFloat(b.amount)-parseFloat(a.amount));
  },[expenses]);
  function navTo(t){if(t===tab)return;setTabHistory(h=>[...h.slice(-19),tab]);setTabRaw(t);}
  function goBack(){setTabHistory(h=>{if(!h.length)return h;const p=h[h.length-1];setTabRaw(p);return h.slice(0,-1);});}
  const canGoBack=tabHistory.length>0;
  const om=(t,d={})=>{setModal(t);setForm(d);};
  const cl=()=>{setModal(null);setForm({});};
  const ff=(k,v)=>setForm(p=>({...p,[k]:v}));
  function pushNotif(id,title,body,type){setNotifs(p=>{if(p.find(n=>n.id===id))return p;return[{id,title,body,type,time:Date.now(),read:false},...p.slice(0,49)];});}
  const GROUPS=[
    {key:"daily",label:"Daily Drivers",items:[{id:"accounts",icon:Wallet,label:"Accounts & Income"},{id:"calendar",icon:Calendar,label:"Calendar"},{id:"paycheck",icon:DollarSign,label:"Paycheck Planner"},{id:"chat",icon:MessageCircle,label:"AI Assistant"}]},
    {key:"work",label:"Work & Income",items:[{id:"shifts",icon:Clock,label:"Shift Tracker"},...(settings.showTrading?[{id:"trading",icon:TrendingUp,label:"Trading"}]:[]),{id:"cashflow",icon:BarChart2,label:"Income vs Spending"}]},
    {key:"reports",label:"Reports",items:[{id:"statement",icon:FileText,label:"Monthly Statement"},{id:"tax",icon:FileText,label:"Tax Summary"},{id:"trend",icon:TrendingUp,label:"Balance Trend"},{id:"networthtrend",icon:TrendingUp,label:"Net Worth Trend"},{id:"physical",icon:Activity,label:"Financial Physical"}]},
    {key:"tools",label:"Tools",items:[{id:"search",icon:Search,label:"Search"},{id:"notifs",icon:Bell,label:"Notifications"},{id:"subscriptions",icon:RefreshCw,label:"Subscriptions"},{id:"insights",icon:Zap,label:"Insights"},{id:"health",icon:Activity,label:"Health Score"},{id:"settings",icon:Settings,label:"Settings"}]},
  ];
  const allTabIds=GROUPS.flatMap(g=>g.items.map(i=>i.id));
  const isMoreTab=allTabIds.includes(tab);
  const NAV=[{id:"home",icon:LayoutDashboard,label:"Home"},{id:"spend",icon:Wallet,label:"Spending"},{id:"bills",icon:CalendarClock,label:"Bills"},{id:"debt",icon:CreditCard,label:"Debt"},{id:"savings",icon:Target,label:"Goals"},{id:"more",icon:Menu,label:"More",...(unreadNotifs>0?{badge:unreadNotifs}:{})}];
  useEffect(()=>{
    const s=JSON.parse(localStorage.getItem("fv_session")||"null");
    if(!s?.access_token){setAuthLoading(false);return;}
    supaFetch("/auth/v1/user",{headers:{"Authorization":"Bearer "+s.access_token}}).then(u=>{if(u?.data?.id||u?.data?.user?.id){setAuthSession(s);}else{localStorage.removeItem("fv_session");}setAuthLoading(false);}).catch(()=>setAuthLoading(false));
  },[]);
  function handleAuth(sess){setAuthSession(sess);localStorage.setItem("fv_session",JSON.stringify(sess));}
  function handleSignOut(){supaFetch("/auth/v1/logout",{method:"POST"});setAuthSession(null);localStorage.removeItem("fv_session");localStorage.removeItem("fv_onboarded");setOnboarded(false);}
  useEffect(()=>{
    (async()=>{
      try{
        if(userId){
          const[expR,billR,debtR,tradeR,shiftR,sgR,bgR,bhR,profR]=await Promise.all([supaFetch(`/rest/v1/expenses?user_id=eq.${userId}&select=*&order=created_at.desc`),supaFetch(`/rest/v1/bills?user_id=eq.${userId}&select=*`),supaFetch(`/rest/v1/debts?user_id=eq.${userId}&select=*`),supaFetch(`/rest/v1/trades?user_id=eq.${userId}&select=*`),supaFetch(`/rest/v1/shifts?user_id=eq.${userId}&select=*`),supaFetch(`/rest/v1/savings_goals?user_id=eq.${userId}&select=*`),supaFetch(`/rest/v1/budget_goals?user_id=eq.${userId}&select=*`),supaFetch(`/rest/v1/balance_history?user_id=eq.${userId}&select=*&order=date.asc`),supaFetch(`/rest/v1/profiles?id=eq.${userId}&select=*`)]);
          if(expR.data?.length)setExpenses(expR.data.map(e=>({...e,amount:String(e.amount||0),tags:e.tags||[]})));
          if(billR.data?.length)setBills(billR.data.map(b=>({...b,amount:String(b.amount||0),dueDate:b.due_date,autoPay:b.auto_pay})));
          if(debtR.data?.length)setDebts(debtR.data.map(d=>({...d,balance:String(d.balance||0),original:String(d.original||d.balance||0),rate:String(d.rate||0),minPayment:String(d.min_payment||0)})));
          if(tradeR.data?.length)setTrades(tradeR.data.map(t=>({...t,pnl:String(t.pnl||0)})));
          if(shiftR.data?.length)setShifts(shiftR.data.map(s=>({...s,hours:String(s.hours||0),gross:String(s.gross||0)})));
          if(sgR.data?.length)setSGoals(sgR.data.map(g=>({...g,target:String(g.target||0),saved:String(g.saved||0),monthly:String(g.monthly||0)})));
          if(bgR.data?.length)setBGoals(bgR.data.map(g=>({...g,limit:String(g.limit_amount||0)})));
          if(bhR.data?.length)setBalHist(bhR.data);
          if(profR.data?.[0]){const p=profR.data[0];if(p.app_name)setAppName(p.app_name);if(p.prof_category)setProfCategory(p.prof_category);if(p.prof_sub)setProfSub(p.prof_sub);}
        }else{
          const keys=["fv6:accounts","fv6:income","fv6:expenses","fv6:bills","fv6:debts","fv6:bgoals","fv6:sgoals","fv6:cats","fv6:trades","fv6:taccount","fv6:settings","fv6:calColors","fv6:notifs","fv6:balHist","fv6:shifts","fv6:prof","fv6:profSub","fv6:dashConfig","fv6:appName"];
          const vals=await Promise.all(keys.map(k=>sg(k)));
          const[ac,inc,exp,bll,dbt,bg,sg2,cats,tr,ta,sett,cc,nts,bh,sh,prof,psub,dc,an]=vals;
          if(ac)setAccounts(a=>({...a,...ac}));if(inc)setIncome(a=>({...a,...inc}));
          if(exp)setExpenses(exp);if(bll)setBills(bll);if(dbt)setDebts(dbt);
          if(bg)setBGoals(bg);if(sg2)setSGoals(sg2);if(cats)setCats(cats);
          if(tr)setTrades(tr);if(ta)setTradingAccount(ta);
          if(sett)setSettings(a=>({...a,...sett}));if(cc)setCalColors(a=>({...a,...cc}));
          if(nts)setNotifs(nts);if(bh)setBalHist(bh);if(sh)setShifts(sh);
          if(prof)setProfCategory(prof);if(psub)setProfSub(psub);
          if(dc)setDashConfig(a=>({...a,...dc}));if(an)setAppName(an);
        }
      }catch(e){console.error("Load error",e);}
      setReady(true);
    })();
  },[userId]);
  useEffect(()=>{if(ready&&!userId)ss("fv6:accounts",accounts);},[accounts,ready]);
  useEffect(()=>{if(ready&&!userId)ss("fv6:income",income);},[income,ready]);
  useEffect(()=>{if(ready&&!userId)ss("fv6:expenses",expenses);},[expenses,ready]);
  useEffect(()=>{if(ready&&!userId)ss("fv6:bills",bills);},[bills,ready]);
  useEffect(()=>{if(ready&&!userId)ss("fv6:debts",debts);},[debts,ready]);
  useEffect(()=>{if(ready&&!userId)ss("fv6:bgoals",budgetGoals);},[budgetGoals,ready]);
  useEffect(()=>{if(ready&&!userId)ss("fv6:sgoals",savingsGoals);},[savingsGoals,ready]);
  useEffect(()=>{if(ready&&!userId)ss("fv6:trades",trades);},[trades,ready]);
  useEffect(()=>{if(ready&&!userId)ss("fv6:notifs",notifs);},[notifs,ready]);
  useEffect(()=>{if(ready&&!userId)ss("fv6:balHist",balHist);},[balHist,ready]);
  useEffect(()=>{if(ready&&!userId)ss("fv6:shifts",shifts);},[shifts,ready]);
  useEffect(()=>{if(ready&&!userId)ss("fv6:settings",settings);},[settings,ready]);
  useEffect(()=>{if(ready&&!userId)ss("fv6:dashConfig",dashConfig);},[dashConfig,ready]);
  useEffect(()=>{if(ready&&!userId)ss("fv6:appName",appName);},[appName,ready]);
  useEffect(()=>{localStorage.setItem("fv_dark",darkMode?"1":"0");},[darkMode]);
  if(authLoading)return(<div style={{minHeight:"100vh",background:C.navy,display:"flex",alignItems:"center",justifyContent:"center"}}><style>{CSS}</style><div style={{textAlign:"center"}}><div style={{fontFamily:MF,fontSize:28,fontWeight:900,color:"#fff",marginBottom:8}}>💰 Trackfi</div><div style={{fontSize:13,color:"rgba(255,255,255,.5)"}}>Loading...</div></div></div>);
  if(!authSession)return <AuthScreen onAuth={handleAuth}/>;
  if(!ready)return(<div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><style>{CSS}</style><div style={{textAlign:"center"}}><div style={{fontFamily:MF,fontSize:18,fontWeight:700,color:C.navy,marginBottom:16}}>Loading your data...</div><div style={{width:40,height:40,border:`3px solid ${C.borderLight}`,borderTopColor:C.accent,borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto"}}/></div></div>);
  if(!onboarded)return(<div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}><style>{CSS}</style><div style={{background:C.surface,borderRadius:24,padding:32,maxWidth:400,width:"100%",textAlign:"center"}}><div style={{fontSize:52,marginBottom:16}}>👋</div><div style={{fontFamily:MF,fontSize:24,fontWeight:800,color:C.navy,marginBottom:8}}>Welcome to Trackfi</div><div style={{fontSize:14,color:C.textLight,marginBottom:24}}>Your personal finance app for healthcare workers and traders.</div><button onClick={()=>{localStorage.setItem("fv_onboarded","1");setOnboarded(true);}} style={{width:"100%",background:`linear-gradient(135deg,${C.accent},${C.green})`,color:"#fff",border:"none",borderRadius:14,padding:"14px",fontFamily:MF,fontWeight:800,fontSize:16,cursor:"pointer"}}>Get Started 🚀</button></div></div>);
  return(
    <div style={{minHeight:"100vh",background:darkMode?C.navy:C.bg,fontFamily:IF,display:"flex",flexDirection:"column",maxWidth:480,margin:"0 auto",position:"relative"}}>
      <style>{CSS}</style>
      <div style={{flex:1,overflowY:"auto",padding:"20px 16px",paddingBottom:90}}>
        {canGoBack&&tab!=="home"&&(<div style={{marginBottom:12}}><button className="ba" onClick={goBack} style={{display:"flex",alignItems:"center",gap:6,color:C.textLight,fontSize:13,fontWeight:600}}><ChevronRight size={16} style={{transform:"rotate(180deg)"}}/> Back</button></div>)}
        {tab==="home"&&(<div className="fu">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
            <div><div style={{fontFamily:MF,fontSize:22,fontWeight:800,color:darkMode?"#fff":C.text}}>{new Date().getHours()<12?"Good morning":new Date().getHours()<17?"Good afternoon":"Good evening"} 👋</div><div style={{fontSize:13,color:darkMode?"rgba(255,255,255,.5)":C.textLight,marginTop:2}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div></div>
            <div style={{display:"flex",gap:8}}>
              <button className="ba" onClick={()=>setHidden(h=>!h)} style={{background:darkMode?C.navyMid:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:10,padding:8}}>{hidden?<Eye size={16} color={darkMode?"#fff":C.textLight}/>:<EyeOff size={16} color={darkMode?"#fff":C.textLight}/>}</button>
              <button className="ba" onClick={()=>setDarkMode(d=>!d)} style={{background:darkMode?C.navyMid:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:10,padding:8}}>{darkMode?<Sun size={16} color="#fff"/>:<Moon size={16} color={C.textLight}/>}</button>
            </div>
          </div>
          <div style={{background:`linear-gradient(145deg,${C.navy} 0%,${C.navyLight} 100%)`,borderRadius:20,padding:20,marginBottom:14,color:"#fff"}}>
            <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Net Worth</div>
            <div style={{fontFamily:MF,fontSize:32,fontWeight:800,letterSpacing:-1,marginBottom:4}}>{hidden?"••••••":fmtK(netWorth)}</div>
            <div style={{display:"flex",gap:16,fontSize:12,color:"rgba(255,255,255,.6)"}}><span>Assets {hidden?"••••":fmtK(totalAssets)}</span><span>Debt {hidden?"••••":fmtK(totalDebt)}</span></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            {[{label:"Monthly Income",val:fmtK(totalIncome),color:C.green},{label:"Monthly Spend",val:fmtK(totalExp),color:C.red},{label:"Cash Flow",val:fmtK(cashflow),color:cashflow>=0?C.green:C.red},{label:"Savings Rate",val:savingsRate.toFixed(0)+"%",color:C.accent}].map(m=>(<div key={m.label} style={{background:darkMode?C.navyMid:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:14,padding:14}}><div style={{fontSize:11,color:C.textLight,marginBottom:4,fontWeight:600}}>{m.label}</div><div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:m.color}}>{hidden?"••••":m.val}</div></div>))}
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:darkMode?"#fff":C.text,marginBottom:10}}>Quick Actions</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {[{label:"Log Expense",icon:"💸",action:()=>om("expense")},{label:"Add Bill",icon:"📅",action:()=>om("bill")},{label:"Add Debt",icon:"💳",action:()=>om("debt")},{label:"Log Shift",icon:"🏥",action:()=>navTo("shifts")},{label:"Log Trade",icon:"📈",action:()=>navTo("trading")},{label:"Add Goal",icon:"🎯",action:()=>navTo("savings")}].map(q=>(<button key={q.label} onClick={q.action} className="ba" style={{background:darkMode?C.navyMid:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:14,padding:"12px 8px",textAlign:"center"}}><div style={{fontSize:22,marginBottom:4}}>{q.icon}</div><div style={{fontSize:11,fontWeight:600,color:darkMode?"#fff":C.text}}>{q.label}</div></button>))}
            </div>
          </div>
          {dueSoon.length>0&&(<div style={{background:C.amberBg,border:`1px solid ${C.amberMid}`,borderRadius:16,padding:14,marginBottom:14}}><div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.amber,marginBottom:8}}>⚠️ {dueSoon.length} bill{dueSoon.length>1?"s":""} due soon</div>{dueSoon.slice(0,3).map(b=>(<div key={b.id} style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"4px 0"}}><span style={{color:C.text}}>{b.name}</span><span style={{fontWeight:700,color:C.amber}}>{fmt(b.amount)} · {dueIn(b.dueDate)}d</span></div>))}</div>)}
          {overdue.length>0&&(<div style={{background:C.redBg,border:`1px solid ${C.redMid}`,borderRadius:16,padding:14,marginBottom:14}}><div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red,marginBottom:8}}>🚨 {overdue.length} overdue bill{overdue.length>1?"s":""}</div>{overdue.slice(0,2).map(b=>(<div key={b.id} style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"4px 0"}}><span style={{color:C.text}}>{b.name}</span><span style={{fontWeight:700,color:C.red}}>{fmt(b.amount)}</span></div>))}</div>)}
          {expenses.length>0&&(<div style={{background:darkMode?C.navyMid:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:18,padding:16,marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:darkMode?"#fff":C.text}}>Recent Expenses</div><button onClick={()=>navTo("spend")} className="ba" style={{fontSize:12,color:C.accent,fontWeight:600}}>See all</button></div>{expenses.slice(0,4).map(e=>(<div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.borderLight}`}}><div><div style={{fontSize:13,fontWeight:600,color:darkMode?"#fff":C.text}}>{e.name}</div><div style={{fontSize:11,color:C.textLight}}>{fmtDate(e.date)} · {e.category}</div></div><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.red}}>-{fmt(e.amount)}</div></div>))}</div>)}
        </div>)}
        {tab==="spend"&&<SpendingView expenses={expenses} setExpenses={setExpenses} budgetGoals={budgetGoals} setBGoals={setBGoals} categories={categories} setCats={setCats} om={om} setEditItem={setEditItem} setModal={setModal} setConfirm={setConfirm}/>}
        {tab==="bills"&&<BillsView bills={bills} setBills={setBills} setEditItem={setEditItem} onAdd={()=>om("bill")} setConfirm={setConfirm}/>}
        {tab==="debt"&&<DebtView debts={debts} setDebts={setDebts} setModal={setModal} setEditItem={setEditItem} setConfirm={setConfirm}/>}
        {tab==="savings"&&<SavingsGoalsView goals={savingsGoals} setGoals={setSGoals} income={income}/>}
        {tab==="accounts"&&<AccountsView accounts={accounts} setAccounts={setAccounts} income={income} setIncome={setIncome}/>}
        {tab==="trading"&&<TradingView trades={trades} setTrades={setTrades} account={tradingAccount} setAccount={setTradingAccount}/>}
        {tab==="shifts"&&<ShiftView shifts={shifts} setShifts={setShifts} income={income} profCategory={profCategory} profSub={profSub}/>}
        {tab==="calendar"&&<CalendarView expenses={expenses} bills={bills} calColors={calColors} setCalColors={setCalColors}/>}
        {tab==="search"&&<SearchView expenses={expenses} bills={bills} debts={debts} trades={trades} categories={categories}/>}
        {tab==="insights"&&<InsightsView expenses={expenses} income={income} bills={bills} debts={debts} budgetGoals={budgetGoals}/>}
        {tab==="paycheck"&&<PaycheckView bills={bills} income={income} expenses={expenses} accounts={accounts}/>}
        {tab==="networthtrend"&&<NetWorthTrendView balHist={balHist} debts={debts} accounts={accounts}/>}
        {tab==="trend"&&<TrendView balHist={balHist} accounts={accounts} expenses={expenses}/>}
        {tab==="statement"&&<StatementView expenses={expenses} bills={bills} income={income} accounts={accounts} debts={debts}/>}
        {tab==="cashflow"&&<IncomeSpendingView expenses={expenses} income={income} trades={trades}/>}
        {tab==="physical"&&<FinancialPhysicalView income={income} expenses={expenses} debts={debts} accounts={accounts} bills={bills}/>}
        {tab==="health"&&<HealthScoreView income={income} expenses={expenses} debts={debts} accounts={accounts} bills={bills} savingsGoals={savingsGoals}/>}
        {tab==="tax"&&<TaxView expenses={expenses} income={income} trades={trades} shifts={shifts} appName={appName}/>}
        {tab==="subscriptions"&&<SubsView expenses={expenses}/>}
        {tab==="chat"&&<ChatView expenses={expenses} income={income} bills={bills} debts={debts} accounts={accounts} netWorth={netWorth} cashflow={cashflow}/>}
        {tab==="notifs"&&(<div className="fu"><SH title="Notifications"/>{notifs.length===0?<Empty text="No notifications yet" icon={Bell}/>:notifs.map(n=>(<div key={n.id} style={{background:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:14,padding:14,marginBottom:8,display:"flex",gap:12}}><div style={{fontSize:20}}>{n.type==="success"?"✅":n.type==="danger"?"🚨":n.type==="warning"?"⚠️":"ℹ️"}</div><div><div style={{fontSize:13,fontWeight:600,color:C.text}}>{n.title}</div><div style={{fontSize:12,color:C.textLight,marginTop:2}}>{n.body}</div></div></div>))}</div>)}
        {tab==="settings"&&<SettingsView settings={settings} setSettings={setSettings} appName={appName} setAppName={setAppName} profCategory={profCategory} setProfCategory={setProfCategory} profSub={profSub} setProfSub={setProfSub} darkMode={darkMode} setDarkMode={setDarkMode} onSignOut={handleSignOut} userEmail={authSession?.user?.email} categories={categories} setCategories={setCats}/>}
        {tab==="more"&&(<div className="fu"><div style={{fontFamily:MF,fontSize:19,fontWeight:800,color:darkMode?"#fff":C.text,marginBottom:16}}>More</div>{GROUPS.map(g=>(<div key={g.key} style={{marginBottom:16}}><div style={{fontSize:11,fontWeight:700,color:C.textLight,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>{g.label}</div><div style={{background:darkMode?C.navyMid:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:16,overflow:"hidden"}}>{g.items.map((item,idx)=>(<button key={item.id} onClick={()=>navTo(item.id)} className="ba" style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderBottom:idx<g.items.length-1?`1px solid ${C.borderLight}`:"none",textAlign:"left"}}><div style={{width:36,height:36,borderRadius:10,background:C.accentBg,display:"flex",alignItems:"center",justifyContent:"center"}}><item.icon size={18} color={C.accent}/></div><div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:darkMode?"#fff":C.text}}>{item.label}</div></div><ChevronRight size={16} color={C.textLight}/></button>))}</div></div>))}<button onClick={handleSignOut} style={{width:"100%",background:C.redBg,border:`1px solid ${C.redMid}`,borderRadius:14,padding:"13px",color:C.red,fontFamily:MF,fontWeight:700,fontSize:14,cursor:"pointer",marginTop:8}}>Sign Out</button></div>)}
      </div>
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:darkMode?C.navy:C.surface,borderTop:`1px solid ${C.borderLight}`,display:"flex",paddingBottom:"env(safe-area-inset-bottom,8px)",zIndex:100}}>
        {NAV.map(n=>{const active=n.id==="more"?isMoreTab||tab==="more":tab===n.id;return(<button key={n.id} onClick={()=>navTo(n.id)} className="ba" style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"10px 0",gap:3,position:"relative"}}>{n.badge&&<div style={{position:"absolute",top:6,right:"25%",background:C.red,color:"#fff",borderRadius:99,fontSize:9,fontWeight:700,minWidth:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px"}}>{n.badge}</div>}<n.icon size={22} color={active?C.accent:darkMode?"rgba(255,255,255,.4)":C.textFaint}/><span style={{fontSize:10,fontWeight:active?700:500,color:active?C.accent:darkMode?"rgba(255,255,255,.4)":C.textFaint}}>{n.label}</span></button>);})}
      </div>
      {modal==="expense"&&<AddExpenseModal form={form} ff={ff} categories={categories} onClose={cl} onSave={data=>{setExpenses(p=>[data,...p]);cl();}}/>}
      {modal==="bill"&&<AddBillModal form={form} ff={ff} onClose={cl} onSave={data=>{setBills(p=>[data,...p]);cl();}}/>}
      {modal==="debt"&&<AddDebtModal form={form} ff={ff} onClose={cl} onSave={data=>{setDebts(p=>[data,...p]);cl();}}/>}
      {editItem&&<EditModal item={editItem} categories={categories} onClose={()=>setEditItem(null)} onSave={updated=>{if(updated.type==="expense"){setExpenses(p=>p.map(x=>x.id===updated.id?updated:x));}if(updated.type==="bill"){setBills(p=>p.map(x=>x.id===updated.id?updated:x));}if(updated.type==="debt"){setDebts(p=>p.map(x=>x.id===updated.id?updated:x));}setEditItem(null);}}/>}
      {confirm&&<ConfirmDialog {...confirm} onCancel={()=>setConfirm(null)}/>}
    </div>
  );
}

export default function App(){return(<ErrorBoundary><AppInner/></ErrorBoundary>);}
