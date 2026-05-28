import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as Sentry from '@sentry/react';
import { LayoutDashboard, Wallet, CalendarClock, CreditCard, Target, PiggyBank,
  Plus, Trash2, CheckCircle2, Circle, TrendingUp, AlertCircle, X, Scan,
  Calculator, Edit3, Save, MessageCircle, Send, DollarSign,
  Check, Sparkles, Bell, Settings, Activity, ToggleLeft, ToggleRight,
  ChevronRight, BarChart2, Menu, Calendar, Eye, EyeOff, HelpCircle, Search,
  Zap, FileText, Download, Clock, Moon, Sun, Lock,
  Filter, Database, RefreshCw, ChevronDown } from "lucide-react";
import {
  SUPA_URL,
  SUPA_KEY,
  VAPID_PUBLIC_KEY,
  setSessionExpiredHandler,
  triggerSessionExpired,
  supaFetch,
  signUp,
  signIn,
  getScope,
  _getUserId,
  sg,
  ss,
  flushPendingSync,
  cancelPendingDebouncedSync,
  isTrackfiDemoMode,
  clearScopedUserDataCache,
  SCOPED_USER_DATA_KEYS,
  applyPulledUserDataRows,
  clearUserDataRowVersions,
  setUploadConflictHandler,
  setLocalStorageQuotaHandler,
  resetLocalStorageQuotaWarned,
  isSupabaseConfigured,
  setLastSyncUiBumpHandler,
} from "./lib/supabase.js";
import { allocateLoanPayment, round2 } from "./lib/loanSplit.js";
import { simulateMultiDebtPayoff, simRowsFromDebts, singleDebtPayoffMonths } from "./lib/debtPayoffSim.js";
import { shiftRecurringBillDueDate } from "./lib/billDueDates.js";
import { isCreditCardDebt, cardDebtsList, legacyCreditCardOwed } from "./lib/creditCardTotals.js";
import { optimizedSettlementPairs } from "./lib/household.js";
import { parseTrackfiBackupJson } from "./lib/dataBackup.js";
import { fmt, fmtK, todayStr } from "./lib/moneyFormat.js";
import { cashAccountsByKind, totalCheckingBalance, totalSavingsBalance } from "./lib/cashAccounts.js";
import {
  C, PIE_COLORS, DEBT_PALETTE, isValidHexColor, debtDisplayColor,
  MF, IF, MOS, FULL_MOS,
} from "./theme.js";
import { CSS } from "./styles.js";
import { PROFESSIONS, getProfession, getProfSub } from "./lib/professions.js";
import { dueIn, daysInMonth, dayOfMonth, fmtDate, advanceDueDate } from "./lib/dateHelpers.js";
import {
  DEF_SETTINGS, DEF_ACCOUNTS, DEF_INCOME, DEF_HOUSEHOLD, DEF_DASHCONFIG, DEF_CATS, DEF_CALCOLORS,
} from "./lib/defaults.js";
import {
  isLoanDebt, loanDebtsList, debtOwedForBreakdown, sumDebtsPrincipalAndAccrued,
  approxMonthlyInterestOnDebts, debtOriginalBaseline, splitLoanPayment, applyLoanPaymentToDebtRow,
} from "./lib/debtLogic.js";
import {
  normalizePaidFrom, PAID_FROM_OPTIONS, PAID_FROM_FS_LABELS,
  sumMtdCheckingSpend, sumMtdByPaidFrom, dayCheckingSpend,
  hasCashSubaccounts, validateCashSpendPrerequisites, canReverseExpenseBalance,
  totalAppAssets, pickDefaultBankAccountId, pickDefaultCreditDebtId,
  resolveBankAccountIdForExpense, resolveBillSpendIds, accountsHasPositiveBalance,
} from "./lib/accountsLogic.js";
import {
  isBillDueDateUnusable, billPaidDateCalendarPrefix, billsDueTotalInMonth,
  billsMarkedPaidTotalInMonth, billHasLoanUndoSnap, clampBillReshowMultiplier,
  nearestBillReshowPreset, recurringReshowUpcomingWithinDays, rewindRecurringDueDate,
  prepareBillPaidTransition, patchBillForMarkingPaid, commitMarkBillPaid, commitMarkBillsPaidList,
} from "./lib/billsLogic.js";
import {
  computeSafeToSpend, advancePaydayIso, getLatestScheduledPaydayOnOrBefore,
  paycheckPeriodNeedsHandling,
} from "./lib/safeToSpend.js";
import { applyUserDataSnapshot, buildAuthoritativeCloudMap } from "./lib/userData.js";
import { parseMsg, chatMatchBill, chatPickExpenseDate, chatIsStatsQuery } from "./lib/parseMsg.js";
import { hashPIN } from "./lib/pinHash.js";
import {
  generateDemoData,
  DEMO_MODEL_VERSION, DEMO_IDCHECK_PRIMARY, DEMO_IDCHECK_JOINT, DEMO_IDSAVINGS, DEMO_CC_DEBT_ID,
} from "./lib/demoData.js";
import {
  iS, FI, FS, Modal, BarProg, SH, Empty, SwipeRow, ConfirmDialog,
} from "./components/ui.jsx";
import { PINLock, PINSetup } from "./components/PinLock.jsx";
import { EmojiPicker } from "./components/EmojiPicker.jsx";
import AuthScreen from "./components/AuthScreen.jsx";
import OnboardingWizard from "./components/OnboardingWizard.jsx";
import PaycheckDepositModal from "./modals/PaycheckDepositModal.jsx";
import ExtraPayModal from "./modals/ExtraPayModal.jsx";
import EditModal from "./modals/EditModal.jsx";
import ChatView from "./views/ChatView.jsx";
import BankImportModal from "./modals/BankImportModal.jsx";
import ExportModal from "./modals/ExportModal.jsx";

/** Prefer `updated_at` for versioned sync; fall back if the column isn’t exposed (avoids hard sync failure). */
async function supaFetchUserDataRows(uid) {
  const q = encodeURIComponent(uid);
  const primary = await supaFetch(
    `/rest/v1/user_data?user_id=eq.${q}&select=key,value,updated_at`
  );
  if (!primary.error && Array.isArray(primary.data)) return primary;
  return supaFetch(`/rest/v1/user_data?user_id=eq.${q}&select=key,value`);
}

/** Bounded wait so a stuck auth refresh cannot hang the app indefinitely */
async function trackfiAuthRefreshFetch(refreshToken){
  if(!SUPA_URL||!SUPA_KEY||!refreshToken)return null;
  const canAbort=typeof AbortController!=="undefined";
  const ac=canAbort?new AbortController():null;
  const tid=ac?setTimeout(()=>ac.abort(),12000):null;
  try{
    return await fetch(SUPA_URL+"/auth/v1/token?grant_type=refresh_token",{
      method:"POST",
      headers:{"Content-Type":"application/json",apikey:SUPA_KEY},
      body:JSON.stringify({refresh_token:refreshToken}),
      ...(ac?{signal:ac.signal}:{}),
    });
  }catch{
    return null;
  }finally{
    if(tid)clearTimeout(tid);
  }
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

const TODAY = new Date();


const notifSupported  = () => typeof window!=="undefined"&&"Notification" in window;
const notifPermission = () => notifSupported()?window.Notification.permission:"denied";
const RechartsContext=React.createContext(null);
function TrackfiRechartsProvider({mod,failed,dark,children}){
  const value=useMemo(()=>({mod,failed,dark:!!dark}),[mod,failed,dark]);
  return <RechartsContext.Provider value={value}>{children}</RechartsContext.Provider>;
}
function RechartsReady({minHeight,render}){
  const ctx=React.useContext(RechartsContext);
  if(ctx?.failed){
    const dk=!!ctx.dark;
    return <div role="alert" style={{minHeight,width:"100%",borderRadius:12,background:dk?C.navyMid:C.surfaceAlt,border:`1px solid ${dk?"rgba(255,255,255,.14)":C.border}`,display:"flex",alignItems:"center",justifyContent:"center",padding:"12px 14px",fontSize:12,fontWeight:600,color:dk?"rgba(241,245,249,.9)":C.textMid,textAlign:"center",lineHeight:1.4}}>Charts didn’t load. Refresh the page or check your connection.</div>;
  }
  if(!ctx?.mod)return <div className="fv-rechart-skel" style={{minHeight,width:"100%",borderRadius:12}} aria-busy="true"/>;
  return render(ctx.mod);
}

class ErrorBoundary extends React.Component {
  constructor(p){super(p);this.state={err:null};}
  static getDerivedStateFromError(e){return{err:e};}
  componentDidCatch(e,info){
    console.error("Trackfi Error:",e?.message,info);
    if(import.meta.env.VITE_SENTRY_DSN){
      try{
        Sentry.captureException(e,{contexts:{react:{componentStack:info?.componentStack}}});
      }catch{}
    }
  }
  render(){
    if(this.state.err) return(
      <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} role="alert">
        <div style={{background:C.surface,borderRadius:18,padding:28,maxWidth:380,width:"100%",textAlign:"center",boxShadow:"0 4px 24px rgba(0,0,0,.1)"}}>
          <div style={{fontSize:40,marginBottom:12}} aria-hidden>⚠️</div>
          <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text,marginBottom:8}}>Something went wrong</div>
          <div style={{fontSize:13,color:C.textLight,marginBottom:20,lineHeight:1.5}}>{this.state.err?.message||"Unexpected error. Your data in this browser is still saved locally."}</div>
          <button type="button" onClick={()=>this.setState({err:null})} style={{background:C.surfaceAlt,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 24px",color:C.text,fontWeight:700,fontSize:14,cursor:"pointer",width:"100%",marginBottom:8}}>Try again</button>
          <button type="button" onClick={()=>window.location.reload()} style={{background:C.accent,border:"none",borderRadius:10,padding:"12px 24px",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",width:"100%",marginBottom:8}}>Reload app</button>
          <div style={{fontSize:11,color:C.textLight}}>If this keeps happening, export a backup from Settings before reloading.</div>
        </div>
      </div>
    );
    return this.props.children;
  }
}

/** Shared UI for `accounts.cashAccounts` — used on Accounts & Income and Settings → Money Setup */
function CashAccountsBlock({accounts,setAccounts,showToast,variant="settings",onOpenSettings}){
  const hint=variant==="settings"
    ?"Optional: one row per real account. If you list more than one checking or more than one savings, you pick which account when logging expenses — or set defaults below."
    :"Add each real bank account here. The totals in Checking / Savings cards above still count toward net worth; these rows split expenses when you have more than one of the same type.";
  const titleMt=variant==="settings"?14:18;
  return(
    <>
      <div style={{fontSize:12,fontWeight:700,color:C.textLight,textTransform:"uppercase",letterSpacing:.5,marginBottom:8,marginTop:titleMt}}>Multiple checking & savings</div>
      <div style={{fontSize:11,color:C.textLight,marginBottom:10,lineHeight:1.45}}>{hint}</div>
      {variant==="accounts"&&onOpenSettings&&<div style={{fontSize:11,color:C.accent,marginBottom:10,lineHeight:1.45}}>💡 To set which account is pre-selected for new expenses, use <button type="button" onClick={onOpenSettings} style={{background:"none",border:"none",padding:0,cursor:"pointer",color:C.accent,fontWeight:700,textDecoration:"underline"}}>Settings → Money Setup → Defaults</button>.</div>}
      {(accounts.cashAccounts||[]).map((row,idx)=>(
        <div key={row.id||idx} style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:8,alignItems:"center"}}>
          <input placeholder="Account name" value={row.name||""} onChange={e=>setAccounts(p=>{const ca=[...(p.cashAccounts||[])];ca[idx]={...ca[idx],name:e.target.value};return{...p,cashAccounts:ca};})} style={{flex:1,minWidth:140,background:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"8px 10px",fontSize:13,color:C.text,outline:"none"}}/>
          <select value={row.kind||"checking"} onChange={e=>setAccounts(p=>{const ca=[...(p.cashAccounts||[])];ca[idx]={...ca[idx],kind:e.target.value};return{...p,cashAccounts:ca};})} style={{background:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"8px 10px",fontSize:13,color:C.text}}>
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
          </select>
          <input type="number" placeholder="Bal" value={row.balance||""} onChange={e=>setAccounts(p=>{const ca=[...(p.cashAccounts||[])];ca[idx]={...ca[idx],balance:e.target.value};return{...p,cashAccounts:ca};})} onBlur={e=>{if(e.target.value)showToast&&showToast("✓ Balance saved");}} style={{width:110,background:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"8px 10px",fontSize:14,fontFamily:MF,fontWeight:700,color:C.text,outline:"none",textAlign:"right"}}/>
          <button type="button" className="ba" onClick={()=>setAccounts(p=>{const ca=[...(p.cashAccounts||[])];ca.splice(idx,1);return{...p,cashAccounts:ca};})} style={{padding:"8px 10px",borderRadius:10,border:`1px solid ${C.border}`,background:C.bg,fontSize:12,color:C.textMid,cursor:"pointer"}}>Remove</button>
        </div>
      ))}
      <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center",marginBottom:8}}>
        <button type="button" className="ba" onClick={()=>setAccounts(p=>({...p,cashAccounts:[...(p.cashAccounts||[]),{id:Date.now(),name:"",kind:"checking",balance:""}]}))} style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:10,padding:"8px 14px",fontSize:12,fontWeight:600,color:C.accent,cursor:"pointer"}}>+ Add checking / savings account</button>
        <button type="button" className="ba" onClick={()=>showToast&&showToast("✓ Accounts saved")} style={{background:C.surfaceAlt,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 14px",fontSize:12,fontWeight:600,color:C.text,cursor:"pointer"}}>Save</button>
      </div>
      <div style={{fontSize:10,color:C.textFaint,marginBottom:variant==="accounts"?16:12,lineHeight:1.4}}>Edits save as you type; tap Save for confirmation.</div>
    </>
  );
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
  const ti=(parseFloat(income.primary||0)*(income.payFrequency==="Weekly"?(52/12):income.payFrequency==="Twice Monthly"?2:income.payFrequency==="Monthly"?1:(26/12)))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
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
        <div className="insights-hero-grid" style={{marginBottom:16}}>{[["Daily avg",fmt(dailyAvg),C.accentMid],["Projected",fmt(projectedMonth),C.amberMid],["Last month",fmt(lastTotal),C.textFaint]].map(([l,v,c])=><div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 8px",minWidth:0}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2}}>{l.toUpperCase()}</div><div style={{fontFamily:MF,fontSize:13,fontWeight:700,color:c,overflowWrap:"anywhere"}}>{v}</div></div>)}</div>
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
      {catSorted.length>0&&<div style={{background:C.surface,borderRadius:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"14px 14px 6px",marginBottom:14}}><div style={{fontSize:12,fontWeight:600,color:C.textLight,marginBottom:12}}>Top Spending This Month</div><div className="fv-chart-wrap"><RechartsReady minHeight={Math.min(catSorted.length*38+20,220)} render={R=>(<R.ResponsiveContainer width="100%" height={Math.min(catSorted.length*38+20,220)}><R.BarChart data={catSorted.slice(0,5).map(([name,amt])=>({name,amt}))} layout="vertical" barSize={14} margin={{left:0,right:12,top:4,bottom:4}}><R.XAxis type="number" hide/><R.YAxis type="category" dataKey="name" tick={{fontSize:10,fill:C.textMid}} width={68} tickFormatter={v=>(v&&String(v).length>12?String(v).slice(0,11)+"…":v)} axisLine={false} tickLine={false}/><R.Tooltip formatter={v=>[fmt(v),"Spent"]} contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,fontSize:12}}/><R.Bar dataKey="amt" radius={[0,6,6,0]}>{catSorted.slice(0,5).map((_,i)=><R.Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}</R.Bar></R.BarChart></R.ResponsiveContainer>)}/></div></div>}

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
            <RechartsReady minHeight={160} render={R=>(
            <div className="fv-chart-wrap">
            <R.ResponsiveContainer width="100%" height={160}>
              <R.BarChart data={months} margin={{left:0,right:4,top:4,bottom:4}} barSize={22}>
                <R.XAxis dataKey="month" tick={{fill:C.textLight,fontSize:11}} axisLine={false} tickLine={false}/>
                <R.YAxis tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v>=1000?(v/1000).toFixed(0)+"k":v)} width={40}/>
                <R.Tooltip formatter={v=>[fmt(v),"Spent"]} contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,fontSize:12}}/>
                <R.Bar dataKey="total" radius={[5,5,0,0]}>{months.map((m,i)=><R.Cell key={i} fill={m.isCurrent?C.accent:m.total>avgSpend?C.red+"88":C.accent+"55"}/>)}</R.Bar>
              </R.BarChart>
            </R.ResponsiveContainer>
            </div>
            )}/>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8,fontSize:11,color:C.textLight,justifyContent:"center",rowGap:6}}>
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
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:10,marginBottom:16}}>
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

function PaycheckView({bills,income,setIncome,expenses,accounts,budgetGoals=[],onAdd,onRecordPaycheck}){
  const now=new Date();
  const ti=(parseFloat(income.primary||0)*(income.payFrequency==="Weekly"?(52/12):income.payFrequency==="Twice Monthly"?2:income.payFrequency==="Monthly"?1:(26/12)))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const checking=totalCheckingBalance(accounts);
  const payFreq=income.payFrequency||"Biweekly";
  // Pay per period based on frequency
  const payPerPeriod=payFreq==="Weekly"?ti/(52/12):payFreq==="Biweekly"?ti/(26/12):payFreq==="Twice Monthly"?ti/2:ti;
  const payPeriodLabel=payFreq==="Weekly"?"weekly":payFreq==="Biweekly"?"biweekly":payFreq==="Twice Monthly"?"semi-monthly":"monthly";
  // Next payday — uses lastPayDate anchor if set, else freq-based estimate
  const today=now.getDate();
  let nextPay,daysUntilPay;
  if(income.lastPayDate){
    const last=new Date(income.lastPayDate+"T00:00:00");
    const nxt=new Date(last);let safety=0;
    while(nxt<=now&&safety<60){
      if(payFreq==="Weekly")nxt.setDate(nxt.getDate()+7);
      else if(payFreq==="Twice Monthly"){if(nxt.getDate()<15)nxt.setDate(15);else nxt.setMonth(nxt.getMonth()+1,1);}
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
  const spentCheckingMtd=sumMtdCheckingSpend(expenses,thisMs);
  const mSpent=spentSoFar;const _pvMult=income.payFrequency==="Weekly"?(52/12):income.payFrequency==="Twice Monthly"?2:income.payFrequency==="Monthly"?1:(26/12);const ti2=(parseFloat(income.primary||0)*_pvMult)+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const dailyBurnChecking=spentCheckingMtd/Math.max(1,today);
  const projectedSpend=dailyBurnChecking*daysUntilPay;
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
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4,flexWrap:"wrap",gap:8}}>
        <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.3}}>Paycheck Planner</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          {parseFloat(income.primary||0)>0&&income.lastPayDate&&typeof onRecordPaycheck==="function"&&(
            <button type="button" className="ba" onClick={onRecordPaycheck} style={{display:"flex",alignItems:"center",gap:5,background:C.green,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer"}}><DollarSign size={14}/>Record paycheck</button>
          )}
          <button type="button" className="ba" onClick={onAdd} style={{display:"flex",alignItems:"center",gap:5,background:C.accent,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer"}}><Plus size={13}/>Log Spending</button>
        </div>
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
        <div style={{fontSize:11,color:C.textLight,marginBottom:10,lineHeight:1.45}}>Burn & projection use <strong>checking</strong> spending only. Credit card, savings, and “track only” don’t reduce this cash forecast.</div>
        {[["Daily burn (checking)",fmt(dailyBurnChecking)+"/day",C.textMid],["Days until pay",String(daysUntilPay)+" days",C.textMid],["Projected spend",fmt(projectedSpend),projectedSpend>payPerPeriod?C.red:C.amber],["Checking balance",fmt(checking),C.green],["Bills due","-"+fmt(beforeTotal),C.red],["Safe to spend",fmt(safeToSpend),safeToSpend>500?C.green:safeToSpend>0?C.amber:C.red]].map(([l,v,c])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:13,color:C.textMid}}>{l}</span><span style={{fontFamily:MF,fontWeight:700,fontSize:13,color:c}}>{v}</span></div>)}
      </div>
      {budgetGoals.length>0&&(()=>{
        const thisMs=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
        const envelopes=budgetGoals.map(g=>{
          const lim=parseFloat(g.limit||0);
          const spent=expenses.filter(e=>e.category===g.category&&(e.date||"").startsWith(thisMs)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
          const remaining=Math.max(0,lim-spent);
          const reserve=remaining*(Math.min(1,daysUntilPay/30));
          return{...g,lim,spent,reserve};
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
                  <div style={{fontSize:10,color:C.textFaint}}>{fmt(g.spent)} spent · {fmt(g.lim)}/mo</div>
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

function NetWorthTrendView({balHist,debts,accounts,tradingAccount,onNavigate,nwGoal,setNwGoal}){
  const[showGoalInput,setShowGoalInput]=useState(false);
  const[goalInput,setGoalInput]=useState("");
  function saveGoal(){const v=parseFloat(goalInput);if(v>0){const g={target:v,created:Date.now()};setNwGoal(g);setShowGoalInput(false);}}

  const ccOwedNw=legacyCreditCardOwed(accounts,debts);
  const loanOwedNw=sumDebtsPrincipalAndAccrued(debts);
  const totalDebt=loanOwedNw+ccOwedNw;
  const totalOriginal=debts.reduce((s,d)=>s+debtOriginalBaseline(d),0);
  const totalPaidDown=Math.max(0,totalOriginal-loanOwedNw);
  const overallPct=totalOriginal>0?Math.round(totalPaidDown/totalOriginal*100):0;
  const totalAssets=totalCheckingBalance(accounts)+totalSavingsBalance(accounts)+(parseFloat(accounts.cushion||0))+(parseFloat(accounts.investments||0))+(parseFloat(accounts.k401||0))+(parseFloat(accounts.roth_ira||0))+(parseFloat(accounts.brokerage||0))+(parseFloat(accounts.crypto||0))+(parseFloat(accounts.hsa||0))+(parseFloat(accounts.property||0))+(parseFloat(accounts.vehicles||0))+(parseFloat(tradingAccount?.balance||0));
  const currentNW=totalAssets-totalDebt;
  const chartData=balHist.map(h=>{const a=(h.checking||0)+(h.savings||0)+(h.cushion||0)+(h.investments||0)+(h.k401||0)+(h.roth_ira||0)+(h.brokerage||0)+(h.crypto||0)+(h.hsa||0)+(h.property||0)+(h.vehicles||0);const debtAtPoint=h.totalDebt!=null?h.totalDebt:loanOwedNw+ccOwedNw;return{date:h.date,assets:a,netWorth:a-debtAtPoint};}).slice(-52);
  const firstNW=chartData[0]?.netWorth||currentNW;
  const change=currentNW-firstNW;
  const fD=s=>{if(!s)return"";const d=new Date(s+"T00:00:00");return FULL_MOS[d.getMonth()]+" "+d.getDate();};
  const TT=({active,payload,label})=>{if(!active||!payload?.length)return null;const rows=payload.filter(p=>p!=null);if(!rows.length)return null;return(<div style={{background:C.surface,borderRadius:12,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"10px 14px",fontSize:12}}><div style={{fontWeight:700,marginBottom:6}}>{fD(label)}</div>{rows.map((p,i)=><div key={p.dataKey??i} style={{display:"flex",justifyContent:"space-between",gap:16,marginBottom:2}}><span style={{color:C.textLight}}>{p.name}</span><span style={{fontWeight:700}}>{fmt(p.value??0)}</span></div>)}</div>);};
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
        <RechartsReady minHeight={200} render={R=>(
        <R.ResponsiveContainer width="100%" height={200}>
          <R.AreaChart data={chartData} margin={{left:8,right:8,top:4,bottom:0}}>
            <defs>
              <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.green} stopOpacity={.2}/><stop offset="95%" stopColor={C.green} stopOpacity={0}/></linearGradient>
              <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.accent} stopOpacity={.15}/><stop offset="95%" stopColor={C.accent} stopOpacity={0}/></linearGradient>
            </defs>
            <R.XAxis dataKey="date" tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={fD} interval="preserveStartEnd"/>
            <R.YAxis tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v>=1000?(v/1000).toFixed(0)+"k":v)} width={50}/>
            <R.Tooltip content={<TT/>}/>
            <R.Area type="monotone" dataKey="assets" name="Assets" stroke={C.accent} strokeWidth={2} fill="url(#aGrad)" dot={false}/>
            <R.Area type="monotone" dataKey="netWorth" name="Net Worth" stroke={C.green} strokeWidth={2.5} fill="url(#nwGrad)" dot={false}/>
          </R.AreaChart>
        </R.ResponsiveContainer>
        )}/>
      </div>:<div style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:32,textAlign:"center",marginBottom:14}}><div style={{fontSize:32,marginBottom:10}}>📈</div><div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:4}}>Building your trend</div><div style={{fontSize:13,color:C.textLight}}>Update your balances regularly to see your net worth grow over time.</div></div>}
      {(debts.length>0||ccOwedNw>0)&&(()=>{
        // Liability vs asset breakdown stacked bar
        const assetBreakdown=[
          {name:"Liquid",value:totalCheckingBalance(accounts)+totalSavingsBalance(accounts)+parseFloat(accounts.cushion||0),color:C.teal},
          {name:"401k",value:parseFloat(accounts.k401||0),color:C.accent},
          {name:"Roth IRA",value:parseFloat(accounts.roth_ira||0),color:C.green},
          {name:"Brokerage",value:parseFloat(accounts.brokerage||0),color:"#06b6d4"},
          {name:"Crypto",value:parseFloat(accounts.crypto||0),color:C.amber},
          {name:"HSA",value:parseFloat(accounts.hsa||0),color:C.purple},
          {name:"Investments",value:parseFloat(accounts.investments||0),color:"#8b5cf6"},
          {name:"Property",value:parseFloat(accounts.property||0)+parseFloat(accounts.vehicles||0),color:"#64748b"},
        ].filter(a=>a.value>0);
        const debtBreakdown=[...debts.map((d,i)=>({name:d.name,value:debtOwedForBreakdown(d),type:d.type||"Debt",color:["#ef4444","#f97316","#eab308","#ec4899","#f43f5e"][i%5]})),...(ccOwedNw>0?[{name:"Credit card (app)",value:ccOwedNw,type:"",color:"#dc2626"}]:[])].filter(d=>d.value>0);
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
      {nwGoal&&(()=>{const pct=Math.min(100,Math.max(0,(currentNW/nwGoal.target)*100));const rem=Math.max(0,nwGoal.target-currentNW);return(<div style={{background:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:16,padding:18,marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Net Worth Goal</div><div style={{display:"flex",gap:8,alignItems:"center"}}><div style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.accent}}>{fmt(nwGoal.target)}</div><button onClick={()=>setNwGoal(null)} style={{background:"none",border:"none",cursor:"pointer",color:C.textFaint,padding:2}}><X size={13}/></button></div></div><div style={{height:10,background:C.borderLight,borderRadius:99,overflow:"hidden",marginBottom:8}}><div style={{height:"100%",width:pct.toFixed(1)+"%",background:pct>=100?C.green:`linear-gradient(90deg,${C.accent},${C.green})`,borderRadius:99,transition:"width .6s"}}/></div><div style={{display:"flex",justifyContent:"space-between",fontSize:12}}><span style={{color:C.textLight}}>{pct.toFixed(1)}% there · {fmt(currentNW)} now</span><span style={{fontWeight:600,color:pct>=100?C.green:C.text}}>{pct>=100?"🎉 Goal reached!":fmt(rem)+" to go"}</span></div></div>);})()}
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
          <div style={{fontSize:12,color:C.textLight,marginBottom:14}}>What you owe — {debts.length} debt{debts.length!==1?"s":""}{ccOwedNw>0?` · card ${fmt(ccOwedNw)}`:""}</div>
          {debts.map((d)=>{
            const owed=debtOwedForBreakdown(d);
            const pct=totalDebt>0?(owed/totalDebt*100):0;
            const minPay=parseFloat(d.minPayment||0);
            const rate=parseFloat(d.rate||0);
            const monthlyInt=owed*(rate/100/12);
            return(
              <div key={d.id} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:debtDisplayColor(d,debts)}}/>
                    <span style={{fontSize:13,fontWeight:600,color:C.text}}>{d.name}</span>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <span style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>{fmt(owed)}</span>
                    {rate>0&&<span style={{fontSize:11,color:C.textLight,marginLeft:6}}>{rate}% APR</span>}
                  </div>
                </div>
                <BarProg pct={pct} color={debtDisplayColor(d,debts)} h={5}/>
                {(minPay>0||monthlyInt>0)&&<div style={{display:"flex",gap:12,marginTop:4,fontSize:11,color:C.textLight}}>
                  {minPay>0&&<span>Min: {fmt(minPay)}/mo</span>}
                  {monthlyInt>0&&<span style={{color:C.red}}>\u2248 {fmt(monthlyInt)}/mo (APR\u00f712)</span>}
                </div>}
              </div>
            );
          })}
          {ccOwedNw>0&&(()=>{
            const pct=totalDebt>0?(ccOwedNw/totalDebt*100):0;
            return(
              <div style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:"#dc2626"}}/>
                    <span style={{fontSize:13,fontWeight:600,color:C.text}}>Credit card (app balance)</span>
                  </div>
                  <span style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.red}}>{fmt(ccOwedNw)}</span>
                </div>
                <BarProg pct={pct} color="#dc2626" h={5}/>
              </div>
            );
          })()}
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
          const liquid=totalCheckingBalance(accounts)+totalSavingsBalance(accounts)+(parseFloat(accounts.cushion||0));
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
    <div style={{position:"relative",marginBottom:8,borderRadius:16,overflow:"hidden",contentVisibility:"auto",containIntrinsicSize:"72px"}}>
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
function SpendingView({expenses,setExpenses,budgetGoals,setBGoals,categories,setEditItem,onAdd,showToast,showUndoToast,household,applySpend,applyRefund,accounts={},debts=[],settings={}}){
  const[showAdd,setShowAdd]=useState(false);const[bForm,setBForm]=useState({});
  const[dateFilter,setDateFilter]=useState("month");
  const[showChart,setShowChart]=useState(true);
  const[searchQ,setSearchQ]=useState("");
  const[editingBudget,setEditingBudget]=useState(null);
  const[catFilter,setCatFilter]=useState("all");
  const[tagFilter,setTagFilter]=useState("all");
  const[selectMode,setSelectMode]=useState(false);
  const[selected,setSelected]=useState(new Set());
  const[txVisibleCap,setTxVisibleCap]=useState(150);
  const now=new Date();
  useEffect(()=>{setTxVisibleCap(150);},[dateFilter,searchQ,catFilter,tagFilter]);
  const filteredExp=useMemo(()=>{
    let base=expenses;
    if(dateFilter==="month"){const m=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");base=base.filter(e=>e.date?.startsWith(m));}
    else if(dateFilter==="week"){const ago=new Date(now);ago.setDate(ago.getDate()-7);const t=ago.getTime();base=base.filter(e=>{const ed=e.date;if(!ed)return false;const p=Date.parse(ed+"T00:00:00");return!isNaN(p)&&p>=t;});}
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
  const totalExp=useMemo(()=>filteredExp.reduce((s,e)=>s+(parseFloat(e.amount)||0),0),[filteredExp]);
  const prevMonthTotal=useMemo(()=>{if(dateFilter!=="month")return 0;const t=new Date();const prev=new Date(t.getFullYear(),t.getMonth()-1,1);const pm=prev.getFullYear()+"-"+String(prev.getMonth()+1).padStart(2,"0");return expenses.filter(e=>e.date?.startsWith(pm)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);},[expenses,dateFilter]);
  const momDiff=prevMonthTotal>0?((totalExp-prevMonthTotal)/prevMonthTotal*100):0;
  const catSorted=useMemo(()=>{
    const catMap=filteredExp.reduce((a,e)=>{const k=e.category||"Misc";a[k]=(a[k]||0)+(parseFloat(e.amount)||0);return a;},{});
    return Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
  },[filteredExp]);
  const sortedForTx=useMemo(()=>[...filteredExp].sort((a,b)=>(b.date||"").localeCompare(a.date||"")),[filteredExp]);
  const txList=sortedForTx.slice(0,txVisibleCap);
  const allExpenseTags=useMemo(()=>[...new Set(expenses.flatMap(e=>e.tags||[]))].filter(Boolean),[expenses]);
  const allExpenseCats=useMemo(()=>[...new Set(expenses.map(e=>e.category).filter(Boolean))].sort(),[expenses]);
  const catByName=useMemo(()=>{const m=new Map();categories.forEach(c=>m.set(c.name,c));return m;},[categories]);
  function deleteSelectedExpenses(){
    if(selected.size===0)return;
    const rows=expenses.filter(e=>selected.has(e.id));
    let reversed=0;
    rows.forEach(snap=>{
      const ea=parseFloat(snap.amount)||0;
      const pf=normalizePaidFrom(snap.paidFrom);
      const cid=snap.creditDebtId||undefined;
      const bid=resolveBankAccountIdForExpense(pf,snap.bankAccountId,accounts,settings)||undefined;
      if(ea>0&&canReverseExpenseBalance(pf,cid,snap.bankAccountId,accounts,debts,settings)){
        applyRefund&&applyRefund(pf,ea,cid,bid);
        reversed++;
      }
    });
    setExpenses(p=>p.filter(e=>!selected.has(e.id)));
    setSelected(new Set());
    setSelectMode(false);
    const skipped=rows.length-reversed;
    showToast((skipped>0?"Deleted "+rows.length+" expense"+(rows.length!==1?"s":"")+" — "+skipped+" balance reversal"+(skipped!==1?"s":"")+" skipped":"Deleted "+rows.length+" expense"+(rows.length!==1?"s":"")),"error");
  }
  const envelopeMonth=useMemo(()=>{
    const n=new Date();
    const ms_b=n.getFullYear()+"-"+String(n.getMonth()+1).padStart(2,"0");
    const dom_b=n.getDate();
    const dim_b=new Date(n.getFullYear(),n.getMonth()+1,0).getDate();
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
    return{budgets,daysLeft_b,ms_b,n,totalBudgeted,totalSpentB,overCount,warnCount,allGreen};
  },[expenses,budgetGoals]);
  return(
    <div className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}><div style={{display:"flex",gap:10,alignItems:"flex-start"}}><div style={{width:3,height:38,background:`linear-gradient(180deg,${C.accent},${C.purple}88)`,borderRadius:99,marginTop:2,flexShrink:0}}/><div><div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.4,lineHeight:1.2}}>Spending</div><div style={{fontSize:12,color:C.textLight,marginTop:3,fontWeight:500}}>Total: {fmt(totalExp)}</div></div></div><div style={{display:"flex",gap:6}}>{selectMode?<><button className="ba" onClick={deleteSelectedExpenses} style={{background:selected.size>0?C.red:C.redBg,border:`1px solid ${C.redMid}`,borderRadius:10,padding:"8px 12px",color:selected.size>0?"#fff":C.red,fontWeight:700,fontSize:12,cursor:"pointer"}}>Delete {selected.size>0?"("+selected.size+")":""}</button><button className="ba" onClick={()=>{setSelectMode(false);setSelected(new Set());}} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 12px",color:C.textMid,fontWeight:600,fontSize:12,cursor:"pointer"}}>Cancel</button></>:<><button className="ba" onClick={()=>setSelectMode(true)} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 10px",color:C.textMid,fontWeight:600,fontSize:12,cursor:"pointer"}}>Select</button><button className="ba" onClick={onAdd} style={{display:"flex",alignItems:"center",gap:5,background:C.accent,border:"none",borderRadius:10,padding:"8px 16px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",boxShadow:`0 2px 8px ${C.accent}40`}}><Plus size={12}/>Expense</button></> }</div></div>
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
      {allExpenseTags.length>0&&<div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4,marginBottom:8}}>{[{id:"all",label:"All tags"},...allExpenseTags.map(t=>({id:t,label:"#"+t}))].map(({id,label})=>(<button key={id} className="ba" onClick={()=>setTagFilter(id)} style={{flexShrink:0,padding:"5px 10px",borderRadius:99,border:"none",background:tagFilter===id?C.purple:C.surface,color:tagFilter===id?"#fff":C.textLight,fontWeight:tagFilter===id?700:500,fontSize:11,cursor:"pointer",boxShadow:"0 1px 3px rgba(10,22,40,.06)"}}>{label}</button>))}</div>}
      {allExpenseCats.length>=2&&<div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4,marginBottom:12}}>{[{id:"all",label:"All"},...allExpenseCats.map(c=>({id:c,label:c}))].map(({id,label})=>(<button key={id} className="ba" onClick={()=>setCatFilter(id)} style={{flexShrink:0,padding:"6px 12px",borderRadius:99,border:"none",background:catFilter===id?C.accent:C.surface,color:catFilter===id?"#fff":C.textMid,fontWeight:catFilter===id?700:500,fontSize:12,cursor:"pointer",boxShadow:catFilter===id?`0 2px 8px ${C.accent}40`:"0 1px 3px rgba(10,22,40,.06)",transition:"all .15s"}}>{label}</button>))} </div>}
      {searchQ&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"8px 12px",background:filteredExp.length>0?C.accentBg:C.redBg,borderRadius:10,border:"1px solid "+(filteredExp.length>0?C.accent:C.red)}}><Search size={13} color={filteredExp.length>0?C.accent:C.red}/><span style={{fontSize:13,fontWeight:600,color:filteredExp.length>0?C.accent:C.red}}>{filteredExp.length>0?filteredExp.length+" result"+(filteredExp.length!==1?"s":"")+" — "+fmt(totalExp):"No results for "+searchQ}</span></div>}
      {!searchQ&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><div style={{fontSize:12,color:C.textLight}}>{filteredExp.length} transaction{filteredExp.length!==1?"s":""}</div><div style={{display:"flex",alignItems:"center",gap:8}}>{dateFilter==="month"&&prevMonthTotal>0&&<div style={{fontSize:11,fontWeight:700,color:momDiff>0?C.red:C.green,background:momDiff>0?C.redBg:C.greenBg,borderRadius:99,padding:"3px 8px"}}>{momDiff>0?"+":""}{momDiff.toFixed(0)}% vs last mo</div>}<div style={{fontFamily:MF,fontWeight:800,fontSize:16,color:C.red}}>-{fmt(totalExp)}</div></div></div>}
      {!searchQ&&filteredExp.length>0&&(()=>{const catTotals=Object.entries(filteredExp.reduce((m,e)=>{const k=e.category||"Misc";m[k]=(m[k]||0)+(parseFloat(e.amount)||0);return m;},{})).sort((a,b)=>b[1]-a[1]).slice(0,4);const catMax=catTotals[0]?.[1]||1;return(<div style={{background:C.surface,borderRadius:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"12px 14px",marginBottom:14}}>{catTotals.map(([cat,amt])=><div key={cat} style={{marginBottom:7}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12,color:C.textMid,fontWeight:500}}>{cat}</span><span style={{fontSize:12,fontFamily:MF,fontWeight:700,color:C.red}}>-{fmt(amt)}</span></div><div style={{height:5,background:C.borderLight,borderRadius:3}}><div style={{height:5,width:`${(amt/catMax*100).toFixed(1)}%`,background:C.accent,borderRadius:3,transition:"width .4s"}}/></div></div>)}</div>);})()}
      {!searchQ&&(
          <div style={{marginBottom:16}}>
            {/* Budget summary header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div>
                  <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Spending Envelopes — {FULL_MOS[envelopeMonth.n.getMonth()]}</div>
                  <div style={{fontSize:11,color:C.textLight,marginTop:2}}>Variable expenses: gas, haircuts, groceries...</div>
                </div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                {envelopeMonth.overCount>0&&<div style={{fontSize:11,fontWeight:700,color:C.red,background:C.redBg,borderRadius:99,padding:"2px 8px"}}>{envelopeMonth.overCount} over</div>}
                {envelopeMonth.warnCount>0&&<div style={{fontSize:11,fontWeight:700,color:C.amber,background:C.amberBg,borderRadius:99,padding:"2px 8px"}}>{envelopeMonth.warnCount} near limit</div>}
                {envelopeMonth.allGreen&&<div style={{fontSize:11,fontWeight:700,color:C.green,background:C.greenBg,borderRadius:99,padding:"2px 8px"}}>✓ All on track</div>}
                <button className="ba" onClick={()=>setShowAdd(true)} style={{background:C.accent,border:"none",borderRadius:8,padding:"5px 10px",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:3}}><Plus size={10}/>Add</button>
              </div>
            </div>
            {/* Summary bar */}
            {envelopeMonth.budgets.length>0&&<div style={{background:C.surface,borderRadius:14,padding:"12px 14px",marginBottom:12,boxShadow:"0 1px 4px rgba(10,22,40,.06)"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:12,color:C.textLight}}>Total spent <strong style={{color:C.text}}>{fmt(envelopeMonth.totalSpentB)}</strong> of <strong style={{color:C.textMid}}>{fmt(envelopeMonth.totalBudgeted)}</strong></span>
                <span style={{fontSize:12,fontWeight:700,color:envelopeMonth.totalSpentB>envelopeMonth.totalBudgeted?C.red:C.green}}>{envelopeMonth.totalBudgeted>0?((envelopeMonth.totalSpentB/envelopeMonth.totalBudgeted)*100).toFixed(0):0}%</span>
              </div>
              <div style={{height:8,background:C.borderLight,borderRadius:99,overflow:"hidden",marginBottom:6}}>
                <div style={{height:"100%",width:envelopeMonth.totalBudgeted>0?Math.min(100,(envelopeMonth.totalSpentB/envelopeMonth.totalBudgeted)*100).toFixed(1)+"%":"0%",background:envelopeMonth.totalSpentB>envelopeMonth.totalBudgeted?C.red:envelopeMonth.totalSpentB/envelopeMonth.totalBudgeted>0.8?C.amber:C.green,borderRadius:99,transition:"width .4s"}}/>
              </div>
              <div style={{fontSize:11,color:C.textLight}}>{envelopeMonth.daysLeft_b} days left in {FULL_MOS[envelopeMonth.n.getMonth()]}</div>
            </div>}
            {/* Per-category budget cards */}
            {envelopeMonth.budgets.map(g=>(
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
                {g.over&&<div style={{fontSize:11,color:C.red,marginTop:4,fontWeight:600}}>⚠ {fmt(g.sp-g.lim)} over — {envelopeMonth.daysLeft_b} days to recover</div>}
                {g.warn&&!g.over&&<div style={{fontSize:11,color:C.amber,marginTop:4,fontWeight:500}}>Getting close — {fmt(g.rem)} remaining</div>}
              </div>
            ))}
            {envelopeMonth.budgets.length===0&&<button className="ba" onClick={()=>setShowAdd(true)} style={{display:"flex",alignItems:"center",gap:5,background:C.purpleBg,border:`1px solid ${C.purpleMid}`,borderRadius:10,padding:"10px 14px",color:C.purple,fontSize:13,cursor:"pointer",width:"100%",justifyContent:"center",marginBottom:8}}><Target size={13}/>+ Add Spending Envelope</button>}
          </div>
        )}
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
        const daysInMo=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate();
        const isMonthFilter=dateFilter==="month";
        const dailyAvg=isMonthFilter&&dayOfMo>0?(totalExp/dayOfMo):0;
        const forecast=isMonthFilter?totalExp+(dailyAvg*(daysInMo-dayOfMo)):null;
        if(!top)return null;
        return(<div style={{background:C.surface,borderRadius:12,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:'12px 14px',marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontSize:11,color:C.textLight,fontWeight:600,marginBottom:2}}>TOP MERCHANT</div>
            <div style={{fontSize:13,fontWeight:700,color:C.text,textTransform:'capitalize'}}>{top[0]}</div>
            {forecast!=null&&<div style={{fontSize:12,color:C.textLight}}>Month forecast: <span style={{fontWeight:700,color:forecast>totalExp*1.2?C.red:C.amber}}>{fmt(forecast)}</span></div>}
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontFamily:MF,fontWeight:800,fontSize:18,color:C.red}}>{fmt(top[1])}</div>
            <div style={{fontSize:11,color:C.textLight}}>{filteredExp.filter(e=>(e.name||'').toLowerCase().trim()===top[0]).length} visits</div>
          </div>
        </div>);
      })()}
            <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:10}}>Transactions</div>
      {filteredExp.length===0&&<Empty text={expenses.length>0?"No expenses match your current filters — try adjusting the date range or search":"No expenses yet — use AI Logger or the + button"} icon={Wallet}/>}
      {txList.map(e=>{
        const cat=catByName.get(e.category);
        if(selectMode){const isSel=selected.has(e.id);return(<div key={e.id} onClick={()=>setSelected(p=>{const n=new Set(p);if(n.has(e.id))n.delete(e.id);else n.add(e.id);return n;})} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",background:isSel?C.accentBg:C.surface,border:`1.5px solid ${isSel?C.accent:C.border}`,borderRadius:16,marginBottom:8,cursor:"pointer",contentVisibility:"auto",containIntrinsicSize:"72px"}}><div style={{width:22,height:22,borderRadius:"50%",background:isSel?C.accent:C.bg,border:`2px solid ${isSel?C.accent:C.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{isSel&&<Check size={12} color="#fff"/>}</div><div style={{width:34,height:34,borderRadius:10,background:C.accentBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{cat?.icon||"💸"}</div><div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:600,color:C.text}}>{e.name}</div><div style={{fontSize:11,color:C.textLight}}>{e.date} · {e.category}</div></div><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.red,flexShrink:0}}>-{fmt(e.amount)}</div></div>);}
        return(
          <ExpenseRow key={e.id} e={e} cat={cat} onEdit={()=>setEditItem({type:"expense",data:e})} onDelete={()=>{const snap=e;const ea=parseFloat(snap.amount)||0;const pf=normalizePaidFrom(snap.paidFrom);const cid=snap.creditDebtId||undefined;const bid=resolveBankAccountIdForExpense(pf,snap.bankAccountId,accounts,settings)||undefined;const doBal=ea>0&&canReverseExpenseBalance(pf,cid,snap.bankAccountId,accounts,debts,settings);const balMsg=!doBal&&ea>0?(validateCashSpendPrerequisites(pf,snap.bankAccountId,accounts,settings)||(pf==="credit"&&cardDebtsList(debts).length?"Expense had no card selected — balances unchanged.":"")):"";setExpenses(p=>p.filter(x=>x.id!==snap.id));if(applyRefund&&doBal)applyRefund(pf,ea,cid,bid);(showUndoToast||showToast)&&(showUndoToast?showUndoToast("Deleted — "+snap.name,()=>{setExpenses(p=>[...p,snap]);if(applySpend&&doBal)applySpend(pf,ea,cid,bid);}):showToast(ea>0&&!doBal&&balMsg?balMsg:"Deleted","error"));if(ea>0&&!doBal&&balMsg&&showUndoToast)showToast&&showToast(balMsg,"error");}}/>
        );
      })}
      {sortedForTx.length>txVisibleCap&&<button type="button" className="ba" onClick={()=>setTxVisibleCap(c=>c+150)} style={{width:"100%",marginTop:4,marginBottom:8,padding:"12px",borderRadius:12,border:`1px solid ${C.border}`,background:C.surfaceAlt,color:C.accent,fontWeight:700,fontSize:13,cursor:"pointer"}}>Load more ({sortedForTx.length-txVisibleCap} left)</button>}
      {showAdd&&<Modal title="Spending Envelope" icon={Target} onClose={()=>setShowAdd(false)} onSubmit={()=>{if(!bForm.category||!bForm.limit)return;setBGoals(p=>[...p,{id:Date.now(),...bForm}]);setShowAdd(false);setBForm({});}} submitLabel="Add Envelope" accent={C.purple}><div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:C.accent,lineHeight:1.5}}>
        💡 Set a monthly budget for <strong>variable expenses</strong> like gas, haircuts, groceries, dining. These reserve money in your safe-to-spend before you even log them.
      </div>
      <FS label="Category" options={categories.map(c=>c.name)} value={bForm.category||""} onChange={e=>setBForm(p=>({...p,category:e.target.value}))}/><FI label="Note (optional)" placeholder="e.g. haircuts ~2x/month, gas varies" value={bForm.note||""} onChange={e=>setBForm(p=>({...p,note:e.target.value}))}/><FI label="Monthly Budget ($)" type="number" placeholder="e.g. 150" value={bForm.limit||""} onChange={e=>setBForm(p=>({...p,limit:e.target.value}))}/></Modal>}
    </div>
  );
}function BillsView({bills,setBills,setDebts,setEditItem,onAdd,showToast,showUndoToast,household,requestNotifPermission,applySpend,applyRefund,accounts,debts,settings}){
  const[billTab,setBillTab]=useState("upcoming");
  const[notifPerm,setNotifPerm]=useState(()=>notifPermission());
  const payingBillIdsRef=useRef(new Set());
  const bulkPayingRef=useRef(false);
  useEffect(()=>{
    const paying=payingBillIdsRef.current;
    paying.forEach(id=>{
      const row=bills.find(b=>String(b.id)===String(id));
      if(row?.paid)paying.delete(id);
    });
  },[bills]);
  const overdue=bills.filter(b=>!b.paid&&dueIn(b.dueDate)<0);
  const unpaid=bills.filter(b=>!b.paid);
  const paid=bills.filter(b=>b.paid);
  const totalMonthly=unpaid.reduce((s,b)=>s+(parseFloat(b.amount)||0),0);
  const totalPaid=paid.reduce((s,b)=>s+(parseFloat(b.amount)||0),0);
  const pctPaid=(totalMonthly+totalPaid)>0?Math.round(totalPaid/(totalMonthly+totalPaid)*100):0;
  const soonAmt=bills.filter(b=>!b.paid&&dueIn(b.dueDate)>=0&&dueIn(b.dueDate)<=7).reduce((s,b)=>s+(parseFloat(b.amount)||0),0);
  function handleBillPaidChange(x,targetPaid){
    const wasPaid=x.paid;
    const nowPaid=targetPaid;
    if(nowPaid===wasPaid)return;
    const bamt=parseFloat(x.amount)||0;
    const bpf=normalizePaidFrom(x.paidFrom);
    if(nowPaid&&!wasPaid){
      const id=String(x.id);
      if(payingBillIdsRef.current.has(id))return;
      payingBillIdsRef.current.add(id);
      const res=commitMarkBillPaid(x,{debts,setDebts,setBills,accounts,settings,applySpend,onToast:msg=>setTimeout(()=>showToast&&showToast(msg),0),skipToast:!showToast,skipVibrate:false});
      if(!res.ok){payingBillIdsRef.current.delete(id);showToast&&showToast(res.msg,"error");return;}
      return;
    }
    if(!nowPaid&&wasPaid){
      const r=resolveBillSpendIds(x,accounts,debts,settings);
      if(!r.ok){showToast&&showToast(r.msg,"error");return;}
      if(applyRefund&&bamt)applyRefund(bpf,bamt,r.cid,r.bid);
      const addBack=parseFloat(x.loanPrincipalApplied)||0;
      if(x.linkedDebtId&&(addBack>0||x.loanPrevInterestAsOfDate||x.loanPrevAccruedInterest!==undefined))setDebts(p=>p.map(d=>{
        if(String(d.id)!==String(x.linkedDebtId))return d;
        const o={...d};
        if(addBack>0)o.balance=String(round2(parseFloat(d.balance||0)+addBack));
        if(x.loanPrevInterestAsOfDate!=null&&x.loanPrevInterestAsOfDate!=="")o.loanInterestAsOfDate=x.loanPrevInterestAsOfDate;
        if(x.loanPrevAccruedInterest!==undefined){
          const vc=parseFloat(x.loanPrevAccruedInterest)||0;
          if(vc>0.001)o.loanAccruedInterest=String(round2(vc));
          else delete o.loanAccruedInterest;
        }
        return o;
      }));
      setTimeout(()=>showToast&&showToast("Marked unpaid — "+x.name),0);
      setBills(p=>p.map(xx=>{
        if(String(xx.id)!==String(x.id))return xx;
        const cleared={...xx,paid:false,paidDate:undefined,loanPrincipalApplied:undefined,loanPrevInterestAsOfDate:undefined,loanPrevAccruedInterest:undefined};
        if(xx.recurring&&xx.recurring!=="One-time")return{...cleared,dueDate:rewindRecurringDueDate(xx.dueDate,xx.recurring)};
        return cleared;
      }));
    }
  }
  function undoLoanBillPayment(x){
    const pr=parseFloat(x.loanPrincipalApplied)||0;
    if(!x.linkedDebtId)return;
    const hasSnap=pr>0||x.loanPrevInterestAsOfDate!=null||x.loanPrevAccruedInterest!==undefined;
    if(!hasSnap)return;
    const bamt=parseFloat(x.amount)||0;
    const bpf=normalizePaidFrom(x.paidFrom);
    const r=resolveBillSpendIds(x,accounts,debts,settings);
    if(!r.ok){showToast&&showToast(r.msg,"error");return;}
    if(applyRefund&&bamt)applyRefund(bpf,bamt,r.cid,r.bid);
    setDebts(p=>p.map(d=>{
      if(String(d.id)!==String(x.linkedDebtId))return d;
      const o={...d};
      if(pr>0)o.balance=String(round2(parseFloat(d.balance||0)+pr));
      if(x.loanPrevInterestAsOfDate!=null&&x.loanPrevInterestAsOfDate!=="")o.loanInterestAsOfDate=x.loanPrevInterestAsOfDate;
      if(x.loanPrevAccruedInterest!==undefined){
        const vc=parseFloat(x.loanPrevAccruedInterest)||0;
        if(vc>0.001)o.loanAccruedInterest=String(round2(vc));
        else delete o.loanAccruedInterest;
      }
      return o;
    }));
    setBills(p=>p.map(xx=>{
      if(String(xx.id)!==String(x.id))return xx;
      const loanClear={loanPrincipalApplied:undefined,loanPrevInterestAsOfDate:undefined,loanPrevAccruedInterest:undefined,paidDate:undefined};
      if(xx.recurring&&xx.recurring!=="One-time"){
        const prevDue=rewindRecurringDueDate(xx.dueDate,xx.recurring);
        return{...xx,paid:false,dueDate:prevDue,...loanClear};
      }
      return{...xx,paid:false,...loanClear};
    }));
    showToast&&showToast("Undid loan payment — "+x.name);
  }
  function reversePaidBillEffects(x){
    if(!x?.paid)return{reversed:false};
    const bamt=parseFloat(x.amount)||0;
    const bpf=normalizePaidFrom(x.paidFrom);
    const r=resolveBillSpendIds(x,accounts,debts,settings);
    const canRefund=!!r.ok;
    if(canRefund&&applyRefund&&bamt)applyRefund(bpf,bamt,r.cid,r.bid);
    const addBack=parseFloat(x.loanPrincipalApplied)||0;
    if(x.linkedDebtId&&(addBack>0||x.loanPrevInterestAsOfDate||x.loanPrevAccruedInterest!==undefined))setDebts(p=>p.map(d=>{
      if(String(d.id)!==String(x.linkedDebtId))return d;
      const o={...d};
      if(addBack>0)o.balance=String(round2(parseFloat(d.balance||0)+addBack));
      if(x.loanPrevInterestAsOfDate!=null&&x.loanPrevInterestAsOfDate!=="")o.loanInterestAsOfDate=x.loanPrevInterestAsOfDate;
      if(x.loanPrevAccruedInterest!==undefined){
        const vc=parseFloat(x.loanPrevAccruedInterest)||0;
        if(vc>0.001)o.loanAccruedInterest=String(round2(vc));
        else delete o.loanAccruedInterest;
      }
      return o;
    }));
    return{reversed:canRefund};
  }
  return(
  <div className="fu">
      {notifSupported()&&notifPerm==="default"&&bills.length>0&&(
        <div style={{background:"rgba(99,102,241,.07)",border:"1px solid rgba(99,102,241,.2)",borderRadius:14,padding:"12px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:20}}>🔔</span>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text}}>Get bill reminders</div>
            <div style={{fontSize:11,color:C.textMid}}>Notify you when bills are due or overdue</div>
          </div>
          <button onClick={async()=>{const r=await requestNotifPermission();setNotifPerm(r);if(r==="granted")showToast("Bill reminders enabled!");else showToast("Notifications not enabled","error");}}
            style={{background:C.accent,border:"none",borderRadius:10,padding:"7px 12px",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",flexShrink:0}}>
            Enable
          </button>
        </div>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div><div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.4}}>Bills</div><div style={{fontSize:13,color:C.textLight}}>{unpaid.length} unpaid · {overdue.length} overdue</div></div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>{overdue.length>0&&<button className="ba" onClick={()=>{if(bulkPayingRef.current)return;bulkPayingRef.current=true;const bad=overdue.filter(b=>!resolveBillSpendIds(b,accounts,debts,settings).ok);if(bad.length){bulkPayingRef.current=false;showToast&&showToast("Can't pay "+bad.length+" overdue — edit each bill to choose which card or bank account.","error");return;}const res=commitMarkBillsPaidList(overdue,{debts,setDebts,setBills,accounts,settings,applySpend,onToast:msg=>setTimeout(()=>showToast&&showToast(msg),0),skipToast:!showToast,skipVibrate:false});if(!res.ok){bulkPayingRef.current=false;showToast&&showToast(res.msg,"error");return;}setTimeout(()=>{bulkPayingRef.current=false;},750);}} style={{background:C.greenBg,border:`1px solid ${C.greenMid}`,borderRadius:10,padding:"7px 12px",color:C.green,fontWeight:700,fontSize:12,cursor:"pointer"}}>✓ Pay Overdue</button>}<button onClick={onAdd} style={{display:"flex",alignItems:"center",gap:5,background:C.accent,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}><Plus size={13}/>Add Bill</button></div>
      </div>
      {bills.length>0&&<div style={{background:C.surface,borderRadius:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"14px 16px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:12,color:C.textLight,marginBottom:2}}>Unpaid Bills</div>
          <div style={{fontFamily:MF,fontWeight:800,fontSize:20,color:C.text}}>{fmt(totalMonthly)}</div>
          <div style={{fontSize:12,color:C.green,marginTop:2}}>{fmt(totalPaid)} paid · {fmt(totalMonthly+totalPaid)} total</div>
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
              <button type="button" aria-label={b.paid?`Mark ${b.name} unpaid`:`Mark ${b.name} paid`} onClick={()=>handleBillPaidChange(b,!b.paid)} style={{background:"none",border:"none",cursor:"pointer",color:b.paid?C.green:C.border,padding:0,display:"flex",flexShrink:0}}>{b.paid?<CheckCircle2 size={22}/>:<Circle size={22}/>}</button>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600,color:b.paid?C.textLight:C.text,textDecoration:b.paid?"line-through":"none"}}>{b.name}</div>
                <div style={{fontSize:12,marginTop:2,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{color:uc,fontWeight:500}}>{ul}</span>
                  {b.recurring&&b.recurring!=="One-time"&&<span style={{color:C.textLight}}>{b.recurring}</span>}{b.linkedDebtId&&<span style={{color:C.accent,fontSize:11,fontWeight:600}}> · loan payment</span>}{b.linkedDebtId&&!b.paid&&<span style={{fontSize:10,color:C.textFaint,lineHeight:1.35}}> · pays period interest + any accrued pending first, then principal (actual/365)</span>}{b.notes&&<span style={{color:C.textFaint,fontSize:11}}>· {b.notes}</span>}
                  {b.autoPay&&<span title="Label only — does not auto-mark paid or change balances." style={{background:C.accentBg,color:C.accent,fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:99,cursor:"help"}}>AUTO-PAY</span>}{household?.enabled&&b.paidBy&&b.paidBy!=="shared"&&(()=>{const m=household.members.find(x=>x.id===b.paidBy);return m?<span style={{background:m.color+"18",color:m.color,fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:99,border:`1px solid ${m.color}33`}}>{m.emoji} {m.name}</span>:null;})()}
                </div>
              </div>
              <div style={{fontFamily:MF,fontWeight:700,fontSize:16,color:b.paid?C.textLight:C.text}}>{fmt(b.amount)}</div>
              {billTab==="history"&&b.paid&&!billHasLoanUndoSnap(b)&&<button type="button" className="ba" onClick={()=>handleBillPaidChange(b,false)} style={{background:"none",border:"none",cursor:"pointer",color:C.amber,fontSize:11,fontWeight:700,padding:"4px 6px",whiteSpace:"nowrap"}}>Mark unpaid</button>}
              {billHasLoanUndoSnap(b)&&((billTab==="upcoming"&&!b.paid)||(billTab==="history"&&b.paid))&&<button type="button" className="ba" onClick={()=>undoLoanBillPayment(b)} style={{background:"none",border:"none",cursor:"pointer",color:C.amber,fontSize:11,fontWeight:700,padding:"4px 6px",whiteSpace:"nowrap"}}>Undo loan pay</button>}
              <button type="button" className="ba" onClick={()=>setEditItem({type:"bill",data:b})} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,fontSize:11,fontWeight:600,padding:"4px 6px"}}>Edit</button>
              <button className="ba" type="button" aria-label={`Delete ${b.name}`} onClick={()=>{const snap=b;const rev=reversePaidBillEffects(snap);setBills(p=>p.filter(x=>x.id!==snap.id));const msg=snap.paid?(rev.reversed?"Bill removed — payment reversed":"Bill removed — balances unchanged (pay-from no longer resolves)"):"Bill removed";if(snap.paid){showToast&&showToast(msg,"error");}else{(showUndoToast||showToast)&&(showUndoToast?showUndoToast(msg+" — "+snap.name,()=>setBills(p=>[...p,snap])):showToast(msg,"error"));}}} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,padding:"4px 3px",display:"flex"}}><Trash2 size={13}/></button>
            </div>
          </div>
        );
      })}
          </div>
        );
      })()}
    {bills.length>3&&(()=>{
      const now3=new Date();
      const last6=Array.from({length:6},(_,i)=>{
        const d=new Date(now3.getFullYear(),now3.getMonth()-5+i,1);
        const ms=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
        const dueTotal=billsDueTotalInMonth(bills,ms);
        const paidTotal=billsMarkedPaidTotalInMonth(bills,ms);
        const barTotal=Math.max(dueTotal,paidTotal);
        return{month:FULL_MOS[d.getMonth()].slice(0,3),paid:paidTotal,due:dueTotal,barTotal,isCurrent:i===5};
      });
      if(!last6.some(m=>m.barTotal>0))return null;
      const maxB=Math.max(...last6.map(m=>m.barTotal))||1;
      return(<div style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:16,marginBottom:14}}>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>6-Month Bills</div>
        <div style={{fontSize:11,color:C.textLight,marginBottom:12,lineHeight:1.45}}>Bar height is the larger of <strong>due that month</strong> vs <strong>marked paid that month</strong> (recurring payments use the month you tapped paid).</div>
        <div style={{display:'flex',gap:4,alignItems:'flex-end',height:64}}>
          {last6.map((m,i)=>{
            const hTotal=Math.max(4,Math.round((m.barTotal/maxB)*56));
            const hPaid=m.barTotal>0?Math.round((m.paid/m.barTotal)*hTotal):0;
            return(<div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
            <div style={{width:'100%',height:hTotal,background:C.borderLight,borderRadius:'3px 3px 0 0',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',bottom:0,width:'100%',height:hPaid,background:m.isCurrent?C.green:C.accent,borderRadius:'3px 3px 0 0'}}/>
            </div>
            <div style={{fontSize:9,color:m.isCurrent?C.accent:C.textFaint,fontWeight:m.isCurrent?700:400}}>{m.month}</div>
          </div>);})}
        </div>
        <div style={{display:'flex',gap:12,marginTop:8,fontSize:11,flexWrap:'wrap'}}>
          <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:8,height:8,borderRadius:2,background:C.borderLight,border:`1px solid ${C.border}`}}/><span style={{color:C.textLight}}>Scale (due or paid)</span></div>
          <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:8,height:8,borderRadius:2,background:C.accent}}/><span style={{color:C.textLight}}>Marked paid</span></div>
        </div>
      </div>);
    })()}
    </div>
  );
}

function DebtView({debts,setDebts,setBills,setModal,setEditItem,showToast,extraPayDebt=0,setExtraPayDebt,onAddDebt,debtSavePing=0}){
  const[selectedDebt,setSelectedDebt]=useState(null);
  const[strategy,setStrategy]=useState("avalanche");
  const[payModal,setPayModal]=useState(null);
  const simRows=useMemo(()=>simRowsFromDebts(debts),[debts]);
  const baseSim=useMemo(()=>simulateMultiDebtPayoff(simRows,{strategy,extraMonthly:0,maxMonths:600,returnSeries:true}),[simRows,strategy]);
  const extraSim=useMemo(()=>(extraPayDebt>0?simulateMultiDebtPayoff(simRows,{strategy,extraMonthly:Number(extraPayDebt)||0,maxMonths:600,returnSeries:true}):null),[simRows,strategy,extraPayDebt]);
  const chartDebtData=useMemo(()=>{
    const s=baseSim.series;
    if(!s?.length)return[];
    const exS=extraSim?.series;
    const last=s[s.length-1]?.month||0;
    const maxPts=15;
    const step=Math.max(1,Math.ceil(last/Math.max(1,maxPts-1)));
    const out=[];
    for(let mo=0;mo<=last;mo+=step){
      const bp=s.find(x=>x.month>=mo)??s[s.length-1];
      let extraPt;
      if(exS?.length)extraPt=(exS.find(x=>x.month>=mo)??exS[exS.length-1])?.totalOwed;
      out.push({mo,base:bp.totalOwed,extra:extraPt});
    }
    const lastPt=s[s.length-1];
    if(out.length&&lastPt&&out[out.length-1].mo<lastPt.month)out.push({mo:lastPt.month,base:lastPt.totalOwed,extra:exS?.length?(exS[exS.length-1]?.totalOwed):undefined});
    return out;
  },[baseSim.series,extraSim?.series]);
  const totalDebt=debts.reduce((s,d)=>s+debtOwedForBreakdown(d),0);
  const totalOriginal=debts.reduce((s,d)=>s+debtOriginalBaseline(d),0);
  const totalPaidDown=Math.max(0,totalOriginal-totalDebt);
  const overallPct=totalOriginal>0?Math.round(totalPaidDown/totalOriginal*100):0;
  const pieData=debts.map((d)=>({name:d.name,value:debtOwedForBreakdown(d),color:debtDisplayColor(d,debts),debt:d}));
  function calcPayoff(d){
    const owed=debtOwedForBreakdown(d);
    const r=singleDebtPayoffMonths(owed,d?.rate,d?.minPayment);
    if(owed<=0)return{months:0,totalInterest:0,payoffDate:"Paid off"};
    if(!r.feasible)return{months:999,totalInterest:999999,payoffDate:"Never"};
    const d2=new Date();d2.setMonth(d2.getMonth()+r.months);
    return{months:r.months,totalInterest:r.totalInterest,payoffDate:d2.toLocaleDateString("en-US",{month:"long",year:"numeric"})};
  }
  const prioritized=[...debts].sort((a,b)=>strategy==="avalanche"?(parseFloat(b.rate)||0)-(parseFloat(a.rate)||0):debtOwedForBreakdown(a)-debtOwedForBreakdown(b));
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
      <div style={{marginBottom:16}}>
        <div style={{display:"flex",flexWrap:"wrap",justifyContent:"space-between",alignItems:"flex-start",gap:10,minWidth:0}}>
          <div style={{minWidth:0,flex:"1 1 min(200px, 100%)"}}>
            <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.4}}>Debt Tracker</div>
            <div style={{fontSize:13,color:C.textLight}}>{fmt(totalDebt)} total across {debts.length} debt{debts.length!==1?"s":""}</div>
            {debts.length>0&&<div style={{fontSize:11,color:C.textLight,marginTop:6,lineHeight:1.45}}>Saves to this device automatically{debtSavePing?<> · last update {new Date(debtSavePing).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}</>:null}. Sign in for cloud backup.</div>}
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end",flex:"1 1 auto",minWidth:0}}>
            {debts.length>0&&<button type="button" className="ba" onClick={()=>setModal("simulator")} style={{display:"flex",alignItems:"center",gap:5,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 12px",color:C.textMid,fontWeight:600,fontSize:13,cursor:"pointer",whiteSpace:"nowrap"}}><Calculator size={13}/>Sim</button>}
            <button type="button" className="ba" onClick={()=>(onAddDebt||(()=>setModal("debt")))()} style={{display:"flex",alignItems:"center",gap:5,background:C.accent,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",whiteSpace:"nowrap"}}><Plus size={13}/>Add Debt</button>
          </div>
        </div>
        {debts.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8,marginTop:14}}><div style={{background:C.redBg,borderRadius:12,padding:"10px 8px",textAlign:"center",minWidth:0}}><div style={{fontSize:10,color:C.red,marginBottom:2,fontWeight:600,letterSpacing:.5}}>REMAINING</div><div style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.red}}>{fmt(totalDebt)}</div></div><div style={{background:C.greenBg,borderRadius:12,padding:"10px 8px",textAlign:"center",minWidth:0}}><div style={{fontSize:10,color:C.green,marginBottom:2,fontWeight:600,letterSpacing:.5}}>PAID DOWN</div><div style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.green}}>{fmt(totalPaidDown)}</div></div><div style={{background:C.accentBg,borderRadius:12,padding:"10px 8px",textAlign:"center",minWidth:0}}><div style={{fontSize:10,color:C.accent,marginBottom:2,fontWeight:600,letterSpacing:.5}}>PROGRESS</div><div style={{fontFamily:MF,fontWeight:800,fontSize:14,color:C.accent}}>{overallPct}%</div></div></div>}
      </div>
      {debts.length===0&&<Empty text="No debts tracked. Add one to start your payoff plan!" icon={CreditCard}/>}
      {debts.length>0&&<>
        <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:20,marginBottom:14}}>
          <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>Debt Breakdown</div>
          <div style={{fontSize:12,color:C.textLight,marginBottom:12}}>Tap a slice to see details</div>
          <div className="debt-pie-row">
            <div className="fv-chart-wrap" style={{width:"100%",maxWidth:300,margin:"0 auto"}}>
            <RechartsReady minHeight={200} render={R=>(
            <R.ResponsiveContainer width="100%" height={200}>
              <R.PieChart>
              <R.Pie data={pieData} cx="50%" cy="50%" innerRadius="28%" outerRadius="48%" dataKey="value" labelLine={false} label={renderLabel} onClick={(entry)=>setSelectedDebt(selectedDebt?.debt?.id===entry.debt?.id?null:entry)}>
                {pieData.map((entry,i)=>(<R.Cell key={i} fill={entry.color} stroke={selectedDebt?.debt?.id===entry.debt?.id?"#fff":"transparent"} strokeWidth={selectedDebt?.debt?.id===entry.debt?.id?3:0} style={{cursor:"pointer",opacity:selectedDebt&&selectedDebt.debt?.id!==entry.debt?.id?0.5:1}}/>))}
              </R.Pie>
            </R.PieChart>
            </R.ResponsiveContainer>
            )}/>
            </div>
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
            const orig=debtOriginalBaseline(d);
            const pct=orig>0?Math.min(100,((orig-bal)/orig)*100):0;
            return(
              <div style={{marginTop:14,background:selectedDebt.color+"12",border:`1.5px solid ${selectedDebt.color}33`,borderRadius:14,padding:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div><div style={{fontFamily:MF,fontSize:16,fontWeight:800,color:C.text}}>{d.name}</div>
                    <div style={{display:"flex",gap:6,marginTop:3,flexWrap:"wrap"}}>
                      {d.type&&<span style={{fontSize:11,fontWeight:600,background:selectedDebt.color+"20",color:selectedDebt.color,padding:"2px 8px",borderRadius:99}}>{d.type}</span>}
                      {d.rate&&<span style={{fontSize:11,color:C.textLight,fontWeight:500}}>{d.rate}% APR</span>}{(()=>{const po=calcPayoff(d);return po.months>0&&po.months<500?<span style={{fontSize:11,color:C.green,fontWeight:600}}> · payoff {po.months}mo</span>:null;})()}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:MF,fontSize:22,fontWeight:800,color:C.red}}>{fmt(debtOwedForBreakdown(d))}</div>
                    <div style={{fontSize:10,color:C.textLight,marginTop:2,fontWeight:500}}>{isLoanDebt(d)?(parseFloat(d.loanAccruedInterest)>0.001?`${fmt(bal)} principal + ${fmt(d.loanAccruedInterest)} accrued`:"Principal balance"):isCreditCardDebt(d)?"Principal balance":"Owed"}</div>
                  </div>
                </div>
                {isLoanDebt(d)&&(parseFloat(d.loanAccruedInterest)||0)>0.001&&bal>0&&(()=>{const c=parseFloat(d.loanAccruedInterest)||0,t=bal+c;return(<div style={{marginBottom:10}}><div style={{height:8,borderRadius:99,overflow:"hidden",display:"flex",marginBottom:6}}><div style={{width:(100*bal/t).toFixed(1)+"%",background:C.red,transition:"width .3s"}}/><div style={{flex:1,minWidth:0,background:C.amber,opacity:.85}}/></div><div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.textLight}}><span>Principal</span><span>Accrued interest</span></div></div>);})()}
                {orig>bal&&<><BarProg pct={pct} color={selectedDebt.color} h={7}/><div style={{display:"flex",justifyContent:"space-between",marginTop:4,marginBottom:10,fontSize:12,color:C.textLight}}><span>{pct.toFixed(0)}% paid off</span><span>of {fmt(orig)}</span></div></>}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                  {(isCreditCardDebt(d)
                    ?[["Payoff",proj.payoffDate],["Time left",proj.months<600?proj.months+" months":"Too long"],["Total Int.",proj.totalInterest<999999?fmt(proj.totalInterest):"—"],["APR",(d.rate||"0")+"%"]]
                    :[["Payoff",proj.payoffDate],["Time left",proj.months<600?proj.months+" months":"Too long"],["Total Int.",proj.totalInterest<999999?fmt(proj.totalInterest):"Reduce payment"],["Mo. Interest","~\u2248 "+fmt((parseFloat(d.rate)||0)/100/12*debtOwedForBreakdown(d))]]
                  ).map(([l,v])=>(
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
          const totalBal=debts.reduce((s,d)=>s+debtOwedForBreakdown(d),0);
          const totalMin=debts.reduce((s,d)=>{const ow=debtOwedForBreakdown(d);if(ow<=0)return s;const r=(parseFloat(d.rate)||0)/100/12;return s+(parseFloat(d.minPayment)>0?parseFloat(d.minPayment):Math.max(25,ow*0.02+r*ow));},0);
          const withExtra=extraSim;
          const moSaved=withExtra?Math.max(0,baseSim.months-withExtra.months):0;
          const intSaved=withExtra?Math.max(0,baseSim.totalInterest-withExtra.totalInterest):0;
          const dfDate=new Date();dfDate.setMonth(dfDate.getMonth()+baseSim.months);
          const dfDateExtra=withExtra?new Date():null;if(dfDateExtra)dfDateExtra.setMonth(dfDateExtra.getMonth()+withExtra.months);
          const yrs=Math.floor(baseSim.months/12);const mos2=baseSim.months%12;
          const timeStr=yrs>0?yrs+"y "+(mos2>0?mos2+"mo":""):mos2+"mo";
          const stratLabel=strategy==="avalanche"?"highest APR":"smallest balance";
          const stuck=baseSim.capped||!baseSim.debtFree;
          return(
            <div style={{background:`linear-gradient(135deg,${C.navy},${C.navyLight})`,borderRadius:18,padding:20,marginBottom:14,color:"#fff"}}>
              <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>🎯 Debt-Free Projection</div>
              <div style={{fontFamily:MF,fontSize:30,fontWeight:800,color:C.greenMid,marginBottom:2,letterSpacing:-.5}}>{stuck?"Increase payments":dfDate.toLocaleDateString("en-US",{month:"long",year:"numeric"})}</div>
              <div style={{fontSize:13,color:"rgba(255,255,255,.5)",marginBottom:16}}>{stuck?"Payments may not cover interest on one or more debts":`${timeStr} · APR÷12 estimate · minimums on all, roll freed cash to ${stratLabel}`}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8,marginBottom:16}}>
                {[["Total Owed",fmt(totalBal),"#fca5a5"],["Min/mo",fmt(totalMin),"rgba(255,255,255,.8)"],["Total Interest",!stuck?fmt(baseSim.totalInterest):"—","rgba(255,255,255,.6)"]].map(([l,v,c])=>(
                  <div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 8px"}}>
                    <div style={{fontSize:9,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2,textTransform:"uppercase"}}>{l}</div>
                    <div style={{fontFamily:MF,fontSize:12,fontWeight:700,color:c}}>{v}</div>
                  </div>
                ))}
              </div>
              {!stuck&&baseSim.months>0&&baseSim.months<500&&chartDebtData.length>0&&(()=>{
                const chartData=chartDebtData;
                return(
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,.6)",marginBottom:8}}>Payoff Timeline</div>
                    <RechartsReady minHeight={120} render={R=>(
                    <R.ResponsiveContainer width="100%" height={120}>
                      <R.AreaChart data={chartData} margin={{left:0,right:8,top:4,bottom:0}}>
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
                        <R.XAxis dataKey="mo" tick={{fill:"rgba(255,255,255,.3)",fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>v+"mo"}/>
                        <R.YAxis tick={{fill:"rgba(255,255,255,.3)",fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v>=1000?(v/1000).toFixed(0)+"k":v)} width={40}/>
                        <R.Tooltip formatter={(v,n)=>[fmt(v),n==="base"?`Combined (${strategy})`:"With extra"]} contentStyle={{background:C.navy,border:"1px solid rgba(255,255,255,.15)",borderRadius:10,fontSize:11}} labelFormatter={v=>v+"mo"}/>
                        <R.Area type="monotone" dataKey="base" stroke="#fca5a5" strokeWidth={2} fill="url(#debtGrad)" dot={false} name="base"/>
                        {withExtra&&<R.Area type="monotone" dataKey="extra" stroke={C.greenMid} strokeWidth={2} fill="url(#debtGradX)" dot={false} name="extra"/>}
                      </R.AreaChart>
                    </R.ResponsiveContainer>
                    )}/>
                    {withExtra&&<div style={{display:"flex",gap:12,justifyContent:"center",marginTop:4}}>
                      <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"rgba(255,255,255,.5)"}}><div style={{width:12,height:2,background:"#fca5a5",borderRadius:1}}/> {strategy==="avalanche"?"Avalanche baseline":"Snowball baseline"}</div>
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
                {extraPayDebt>0&&withExtra&&withExtra.months<baseSim.months&&<div style={{background:"rgba(52,211,153,.15)",border:"1px solid rgba(52,211,153,.3)",borderRadius:10,padding:"10px 12px"}}>
                  <div style={{fontFamily:MF,fontWeight:800,fontSize:16,color:C.greenMid,marginBottom:2}}>{dfDateExtra.toLocaleDateString("en-US",{month:"long",year:"numeric"})}</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,.6)"}}>🎉 {moSaved} months sooner · save {fmt(intSaved)} in interest</div>
                </div>}
                {extraPayDebt>0&&withExtra&&withExtra.months>=baseSim.months&&<div style={{fontSize:12,color:"rgba(255,255,255,.4)"}}>Already at minimum threshold</div>}
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
            const color=debtDisplayColor(d,debts);
            return(
              <div key={d.id} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"12px 0",borderBottom:i<prioritized.length-1?`1px solid ${C.border}`:"none"}}>
                <div style={{width:28,height:28,borderRadius:8,background:color+"20",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:MF,fontWeight:800,fontSize:13,color,flexShrink:0}}>#{i+1}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:2}}>{d.name}</div>
                  <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                    <span style={{fontSize:12,color:C.red,fontWeight:600}}>{fmt(debtOwedForBreakdown(d))}</span>
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
          const mi=(parseFloat(d.rate)||0)/100/12*debtOwedForBreakdown(d);
          const color=debtDisplayColor(d,debts);
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
                      {!isCreditCardDebt(d)&&mi>0&&<span style={{fontSize:11,color:C.textLight}}>~\u2248 {fmt(mi)}/mo (APR\u00f712)</span>}
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontFamily:MF,fontWeight:800,fontSize:16,color:C.red}}>{fmt(bal)}{isCreditCardDebt(d)&&<span style={{display:"block",fontSize:9,color:C.textLight,fontWeight:500,marginTop:1}}>principal</span>}</span>
                  <button onClick={()=>setPayModal(d)} style={{background:C.greenBg,border:`1px solid ${C.greenMid}`,borderRadius:8,cursor:"pointer",color:C.green,fontSize:11,fontWeight:700,padding:"4px 8px"}}>💳 Pay</button>
                  <button onClick={()=>setEditItem({type:"debt",data:d})} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,fontSize:12,fontWeight:600,padding:"4px 6px"}}>Edit</button>
                  <button onClick={()=>{setDebts(p=>p.filter(x=>x.id!==d.id));setBills&&setBills(p=>p.filter(x=>String(x.linkedDebtId)!==String(d.id)));showToast&&showToast("Debt removed","error");}} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,padding:"4px 3px",display:"flex"}}><Trash2 size={13}/></button>
                </div>
              </div>
              {d.original&&<><BarProg pct={pct} color={pct>60?C.green:pct>30?C.accent:C.red} h={6}/><div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:11,color:C.textLight}}><span>{pct.toFixed(0)}% paid off</span><span>of {fmt(orig)}</span></div></>}
            </div>
          );
        })}
      </>}
  
    {debts.length>0&&(()=>{
      const ex=Number(extraPayDebt)||0;
      const baselineAva=simulateMultiDebtPayoff(simRows,{strategy:"avalanche",extraMonthly:0,maxMonths:600});
      const road=simulateMultiDebtPayoff(simRows,{strategy,extraMonthly:ex,maxMonths:600});
      const sameExtraAva=ex>0&&strategy==="snowball"?simulateMultiDebtPayoff(simRows,{strategy:"avalanche",extraMonthly:ex,maxMonths:600}):null;
      return(
        <div style={{background:C.surface,borderRadius:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:14,marginTop:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Roadmap</div>
            <div style={{display:"flex",gap:4,background:C.borderLight,borderRadius:8,padding:2}}>
              {[["avalanche","⬆ Avalanche"],["snowball","⬇ Snowball"]].map(([s,l])=>(
                <button key={s} type="button" onClick={()=>setStrategy(s)} style={{padding:"5px 10px",borderRadius:6,border:"none",background:strategy===s?C.surface:"transparent",fontWeight:strategy===s?700:500,fontSize:11,cursor:"pointer",color:strategy===s?C.accent:C.textMid}}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{fontSize:11,color:C.textLight,marginBottom:12,lineHeight:1.45}}>
            Each month: accrue <strong>APR÷12</strong> on every open balance, pay each debt's <strong>minimum</strong> (or payoff if less), then send what's left to <strong>{strategy==="avalanche"?"the highest APR debt":"the smallest balance"}</strong>. Matches the navy card + slider. Real loan payments in Trackfi still use <strong>actual/365</strong> between payment dates.
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(148px,1fr))",gap:10,marginBottom:14}}>
            <div style={{background:C.surfaceAlt,borderRadius:10,padding:"10px 12px"}}>
              <div style={{fontSize:10,color:C.textLight,fontWeight:600}}>BASELINE · MINS + AVALANCHE</div>
              <div style={{fontFamily:MF,fontWeight:800,fontSize:15,color:C.text}}>{baselineAva.debtFree?baselineAva.months+" mo":"—"}</div>
              <div style={{fontSize:11,color:C.textLight}}>{baselineAva.debtFree?fmt(baselineAva.totalInterest)+" est. interest":baselineAva.capped?"Raise payments":"—"}</div>
            </div>
            <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:10,padding:"10px 12px"}}>
              <div style={{fontSize:10,color:C.accent,fontWeight:600}}>YOUR PLAN · {strategy.toUpperCase()}{ex>0?" + "+fmt(ex)+"/MO":""}</div>
              <div style={{fontFamily:MF,fontWeight:800,fontSize:15,color:C.text}}>{road.debtFree?road.months+" mo":"—"}</div>
              <div style={{fontSize:11,color:C.textLight}}>{road.debtFree?fmt(road.totalInterest)+" est. interest":road.capped?"Raise payments":"—"}</div>
            </div>
          </div>
          {sameExtraAva&&sameExtraAva.debtFree&&road.debtFree&&(
            <div style={{fontSize:12,color:C.textMid,marginBottom:12,padding:"8px 10px",background:C.greenBg,borderRadius:8,border:`1px solid ${C.greenMid}`}}>
              Same <strong>+{fmt(ex)}/mo</strong> aimed at <strong>highest APR</strong> instead: <strong>{sameExtraAva.months} mo</strong> · {fmt(sameExtraAva.totalInterest)} interest
              {sameExtraAva.months<road.months?<> ({road.months-sameExtraAva.months} mo faster than snowball)</>:sameExtraAva.months>road.months?<> (snowball wins on time here)</>:null}
            </div>
          )}
          {road.milestones.length>0&&(
            <>
              <div style={{fontSize:11,fontWeight:700,color:C.text,marginBottom:6}}>Milestones — loans disappearing ({strategy}{ex>0?", +"+fmt(ex)+"/mo":""})</div>
              <div style={{maxHeight:220,overflowY:"auto",border:`1px solid ${C.border}`,borderRadius:10}}>
                {road.milestones.slice(0,50).map((m,i)=>(
                  <div key={`${m.id}-${i}`} style={{display:"flex",justifyContent:"space-between",gap:8,padding:"8px 12px",borderBottom:i<Math.min(49,road.milestones.length-1)?`1px solid ${C.border}`:"none",fontSize:12}}>
                    <span style={{color:C.text,minWidth:0}}>Mo {m.month}: <strong>{m.name}</strong> paid off</span>
                    <span style={{color:C.textLight,fontFamily:MF,fontSize:11,flexShrink:0}}>{fmt(m.totalOwed)} remaining</span>
                  </div>
                ))}
              </div>
              {road.milestones.length>50&&<div style={{fontSize:11,color:C.textLight,marginTop:6}}>Showing first 50 payoffs.</div>}
            </>
          )}
        </div>
      );
    })()}
        {payModal&&<ExtraPayModal debt={payModal} onConfirm={pay=>{const raw=parseFloat(pay)||0;if(raw<=0)return;const d=payModal;const payDay=todayStr();if(isLoanDebt(d)){const sp=splitLoanPayment(d,raw,payDay);setDebts(p=>p.map(x=>String(x.id)===String(payModal.id)?applyLoanPaymentToDebtRow(x,sp.principal,payDay,sp.newAccruedCarryover):x));const tail=sp.newAccruedCarryover>0.001?` · ${fmt(sp.newAccruedCarryover)} accrued pending`:"";showToast(`Payment applied — ${fmt(sp.principal)} principal, ${fmt(sp.interest)} to interest (${sp.days}d)${tail}`);}else{setDebts(p=>p.map(x=>String(x.id)===String(payModal.id)?{...x,balance:String(Math.max(0,parseFloat(x.balance||0)-raw))}:x));showToast("Payment applied!");}setSelectedDebt(null);setPayModal(null);}} onClose={()=>setPayModal(null)}/>}
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

function SavingsGoalsView({goals,setGoals,income,accounts,accountRates={},setAccountRates,showToast,applySpend,settings={}}){
  const[view,setView]=useState("rings");
  const[editGoal,setEditGoal]=useState(null);
  const[editForm,setEditForm]=useState({});
  const[showAdd,setShowAdd]=useState(false);
  const[form,setForm]=useState({});
  const ff=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  function add(){if(!form.name||!form.target)return;setGoals(p=>[...p,{id:Date.now().toString(),name:form.name,target:parseFloat(form.target),saved:parseFloat(form.saved||0),monthly:parseFloat(form.monthly||0),icon:form.icon||"🎯",color:form.color||C.teal}]);showToast&&showToast("✓ Goal added — "+form.name);setForm({});setShowAdd(false);}
  const depositToGoal=React.useCallback((goal,rawAmt)=>{
    const amt=parseFloat(rawAmt);
    if(!(amt>0))return;
    const ch=cashAccountsByKind(accounts,"checking");
    if(hasCashSubaccounts(accounts)){
      if(ch.length===0){showToast&&showToast("Add a checking account under Accounts & Income first.","error");return;}
      const bid=pickDefaultBankAccountId("checking",accounts,settings)||"";
      if(ch.length>=2&&!bid){showToast&&showToast("Multiple checking accounts: set a default under Settings \u2192 Defaults.","error");return;}
      const finalBid=ch.length===1?String(ch[0].id):bid;
      if(applySpend)applySpend("checking",amt,undefined,finalBid);
    }else{
      if(applySpend)applySpend("checking",amt,undefined,undefined);
    }
    setGoals(p=>p.map(g=>{
      if(String(g.id)!==String(goal.id))return g;
      const tgt=parseFloat(g.target||0);
      const prevS=parseFloat(g.saved||0);
      const newSaved=parseFloat(Math.min(tgt,prevS+amt).toFixed(2));
      const oldPct=tgt>0?Math.floor((prevS/tgt)*4)*25:0;
      const newPct=tgt>0?Math.floor((newSaved/tgt)*4)*25:0;
      if(newPct>oldPct)setTimeout(()=>showToast&&showToast(newSaved>=tgt?"🎉 Goal complete: "+g.name+"!":"🎯 "+newPct+"% reached — "+g.name),100);
      else showToast&&showToast("+"+fmt(amt)+" → "+g.name);
      return{...g,saved:newSaved};
    }));
  },[accounts,settings,applySpend,showToast,setGoals]);
  function GoalRingInner({goal}){
    const pct=Math.min(100,goal.target>0?(goal.saved/goal.target)*100:0);
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
          <input type="number" min="0" placeholder="From checking ($)" id={"dep-"+goal.id} onKeyDown={e=>{if(e.key==="Enter"&&e.target.value){depositToGoal(goal,e.target.value);e.target.value="";}}} style={{flex:1,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"8px 10px",fontSize:13,color:C.text,outline:"none",background:C.surfaceAlt}}/>
          <button onClick={()=>{const inp=document.getElementById("dep-"+goal.id);if(inp?.value){depositToGoal(goal,inp.value);inp.value="";}}} style={{padding:"8px 12px",borderRadius:10,border:"none",background:C.green,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>+</button>
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
            <RechartsReady minHeight={160} render={R=>(
            <R.ResponsiveContainer width="100%" height={160}>
              <R.LineChart data={chartData} margin={{left:-10,right:4,top:4,bottom:0}}>
                <R.XAxis dataKey="month" tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false}/>
                <R.YAxis tick={{fill:C.textLight,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v>=1000?(v/1000).toFixed(0)+"k":v)} width={38}/>
                <R.Tooltip formatter={(v,n)=>[fmt(v),n]} contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,fontSize:12}}/>
                {goals.filter(g=>parseFloat(g.monthly||0)>0).map((g,i)=>(
                  <R.Line key={g.id} type="monotone" dataKey={g.name} stroke={g.color||GOAL_COLORS[i%GOAL_COLORS.length]} strokeWidth={2.5} dot={false} strokeDasharray={i>0?"4 2":"none"}/>
                ))}
              </R.LineChart>
            </R.ResponsiveContainer>
            )}/>
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
              <input type="number" placeholder="From checking ($)" id={"ldep-"+g.id} style={{flex:1,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"8px 10px",fontSize:13,color:C.text,outline:"none",background:C.surfaceAlt}}
                onKeyDown={e=>{if(e.key==="Enter"&&e.target.value){depositToGoal(g,e.target.value);e.target.value="";}}}/>
              <button onClick={()=>{const inp=document.getElementById("ldep-"+g.id);if(inp?.value){depositToGoal(g,inp.value);inp.value="";}}} style={{padding:"8px 12px",borderRadius:10,border:"none",background:C.green,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>+</button>
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
    {chartData.length>0&&<div style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:14}}><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Monthly P&L</div><RechartsReady minHeight={160} render={R=>(<R.ResponsiveContainer width="100%" height={160}><R.BarChart data={chartData} margin={{left:-20,right:4,top:4,bottom:0}}><R.XAxis dataKey="month" tick={{fill:C.textLight,fontSize:11}} axisLine={false} tickLine={false}/><R.YAxis tick={{fill:C.textLight,fontSize:11}} axisLine={false} tickLine={false}/><R.Tooltip contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,fontSize:12}} formatter={v=>[fmt(v),"P&L"]}/><R.Bar dataKey="pnl" radius={[6,6,0,0]}>{chartData.map((d,i)=><R.Cell key={i} fill={d.pnl>=0?C.green:C.red}/>)}</R.Bar></R.BarChart></R.ResponsiveContainer>)}/></div>}
    {equityData.length>1&&<div style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:14}}><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>Equity Curve</div><div style={{fontSize:12,color:C.textLight,marginBottom:14}}>Cumulative account value per trade</div><RechartsReady minHeight={160} render={R=>(<R.ResponsiveContainer width="100%" height={160}><R.AreaChart data={equityData} margin={{left:-20,right:4,top:4,bottom:0}}><defs><linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={equityData[equityData.length-1]?.equity>=(parseFloat(account.deposit||0))?C.green:C.red} stopOpacity={.2}/><stop offset="95%" stopColor={equityData[equityData.length-1]?.equity>=(parseFloat(account.deposit||0))?C.green:C.red} stopOpacity={0}/></linearGradient></defs><R.XAxis dataKey="i" tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false}/><R.YAxis tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v>=1000?(v/1000).toFixed(1)+"k":v)} width={50}/><R.Tooltip formatter={(v,n)=>n==="equity"?[fmt(v),"Account Value"]:[fmt(v),"Trade P&L"]} contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,fontSize:12}}/><R.Area type="monotone" dataKey="equity" name="equity" stroke={equityData[equityData.length-1]?.equity>=(parseFloat(account.deposit||0))?C.green:C.red} strokeWidth={2.5} fill="url(#eqGrad)" dot={false}/></R.AreaChart></R.ResponsiveContainer>)}/></div>}
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
  const billMap=bills.reduce((a,b)=>{if(!b.dueDate)return a;const[by,bm,bd]=b.dueDate.split('-');if(parseInt(by)===yr&&parseInt(bm)===mo+1){const di=parseInt(bd);if(!a[di])a[di]=[];a[di].push(b);}return a},{});
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
        {(()=>{const _now2=new Date();const _isCurrentMo=yr===_now2.getFullYear()&&mo===_now2.getMonth();const _divisor=_isCurrentMo?Math.max(1,_now2.getDate()):dim;return[['Total',fmt(monthTotal),C.red],['Per Day',fmt(monthTotal/_divisor),C.textMid],['Transactions',String(monthExp.length),C.accent]];})().map(([l,v,c])=>(
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
  const _ytdPrefix=String(now2.getFullYear());const ytd=shifts.filter(s=>(s.date||"").startsWith(_ytdPrefix)).reduce((s,x)=>s+(parseFloat(x.gross)||0),0);
  const subRole=getProfSub(profCategory,profSub);
  const weeklyData=useMemo(()=>{const wk={};shifts.forEach(s=>{const d=new Date((s.date||todayStr())+"T00:00:00");d.setDate(d.getDate()-d.getDay());const k=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");if(!wk[k])wk[k]={week:k,gross:0};wk[k].gross+=parseFloat(s.gross||0);});return Object.values(wk).sort((a,b)=>a.week.localeCompare(b.week)).slice(-8).map(w=>({...w,label:w.week.slice(5)}));},[shifts]);
  return(<div className="fu">
    <SH title={prof.icon+" "+prof.shiftLabel+" Tracker"} sub={subRole.label+" · Log hours & calculate pay"} onAdd={()=>setShowAdd(true)} addLabel={"Log "+prof.shiftLabel}/>
    <div style={{background:`linear-gradient(135deg,${C.navy} 0%,#1a3a6e 100%)`,borderRadius:18,padding:20,marginBottom:14,color:"#fff"}}><div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>This Month</div><div style={{fontFamily:MF,fontSize:30,fontWeight:800,color:"#fff",marginBottom:14}}>{fmt(mg)}</div><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>{[["Shifts",String(ms.length)],["Hours",mh.toFixed(1)],["OT Pay",fmtK(mot)],["YTD",fmtK(ytd)]].map(([l,v])=><div key={l} style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 8px"}}><div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,marginBottom:2}}>{l}</div><div style={{fontFamily:MF,fontSize:13,fontWeight:700,color:"#fff"}}>{v}</div></div>)}</div></div>
    {shifts.length===0&&<Empty text={`No ${prof.shiftLabel.toLowerCase()}s logged yet.`} icon={Clock}/>}
    {shifts.slice(0,30).map(s=>{const mult=OT[s.type]||1;const col={Regular:C.accent,Overtime:C.amber,"Double Time":C.red,Night:C.purple,Weekend:C.green,Holiday:C.red}[s.type]||C.accent;return(<div key={s.id} className="rw" style={{background:C.surface,borderRadius:16,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"14px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12}}><div style={{width:40,height:40,borderRadius:12,background:col+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Clock size={18} color={col}/></div><div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:600,color:C.text}}>{s.type} {prof.shiftLabel}</div><div style={{fontSize:12,color:C.textLight,marginTop:2}}>{fmtDate(s.date)} · {s.hours}h @ ${s.rate}/hr{mult!==1&&<span style={{color:col,fontWeight:600}}> ×{mult}</span>}{s.note&&" · "+s.note}</div></div><div style={{textAlign:"right",flexShrink:0}}><div style={{fontFamily:MF,fontWeight:800,fontSize:16,color:C.green}}>{fmt(s.gross)}</div><button className="db" onClick={()=>{setShifts(p=>p.filter(x=>x.id!==s.id));showToast&&showToast("Shift removed","error");}} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,padding:2,display:"flex",marginLeft:"auto",marginTop:4}}><Trash2 size={13}/></button></div></div>);})}
    {weeklyData.length>1&&<div style={{background:C.surface,borderRadius:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"14px 14px 8px",marginBottom:14}}>
      <div style={{fontSize:12,fontWeight:600,color:C.textLight,marginBottom:10}}>Weekly Earnings</div>
      <RechartsReady minHeight={100} render={R=>(<R.ResponsiveContainer width="100%" height={100}><R.BarChart data={weeklyData} barSize={24}><R.XAxis dataKey="label" tick={{fontSize:10,fill:C.textLight}} axisLine={false} tickLine={false}/><R.Tooltip formatter={v=>[fmt(v),"Gross"]} contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,fontSize:12}}/><R.Bar dataKey="gross" fill={C.accent} radius={[4,4,0,0]}/></R.BarChart></R.ResponsiveContainer>)}/>
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
  const cutStr=cutoff.getFullYear()+"-"+String(cutoff.getMonth()+1).padStart(2,"0")+"-"+String(cutoff.getDate()).padStart(2,"0");
  const filtered=balHist.filter(s=>s.date>=cutStr);
  const cur=totalCheckingBalance(accounts)+totalSavingsBalance(accounts)+(parseFloat(accounts.cushion||0))+(parseFloat(accounts.investments||0));
  const chartData=useMemo(()=>filtered.length>0?filtered:[{date:todayStr(),checking:totalCheckingBalance(accounts),savings:totalSavingsBalance(accounts),cushion:parseFloat(accounts.cushion||0),total:cur}],[filtered.length,cur]);
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
        {hasData&&mode==="total"&&<RechartsReady minHeight={200} render={R=>(<R.ResponsiveContainer width="100%" height={200}><R.AreaChart data={chartData} margin={{left:8,right:8,top:4,bottom:0}}><defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={lineCol} stopOpacity={.2}/><stop offset="95%" stopColor={lineCol} stopOpacity={0}/></linearGradient></defs><R.XAxis dataKey="date" tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={fD} interval="preserveStartEnd"/><R.YAxis tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v>=1000?(v/1000).toFixed(1)+"k":v)} width={50}/><R.Tooltip formatter={(v)=>fmt(v)}/><R.Area type="monotone" dataKey="total" name="Balance" stroke={lineCol} strokeWidth={2.5} fill="url(#tg)" dot={false}/></R.AreaChart></R.ResponsiveContainer>)}/>}
        {hasData&&mode==="breakdown"&&<RechartsReady minHeight={200} render={R=>(<R.ResponsiveContainer width="100%" height={200}><R.AreaChart data={chartData} margin={{left:8,right:8,top:4,bottom:0}}><R.XAxis dataKey="date" tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={fD} interval="preserveStartEnd"/><R.YAxis tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v>=1000?(v/1000).toFixed(1)+"k":v)} width={50}/><R.Tooltip formatter={(v)=>fmt(v)}/><R.Area type="monotone" dataKey="checking" name="Checking" stroke={C.navy} strokeWidth={2} fill="transparent"/><R.Area type="monotone" dataKey="savings" name="Savings" stroke={C.green} strokeWidth={2} fill="transparent"/><R.Area type="monotone" dataKey="cushion" name="Cushion" stroke={C.accent} strokeWidth={2} fill="transparent"/></R.AreaChart></R.ResponsiveContainer>)}/>}
        {hasData&&mode==="spending"&&<RechartsReady minHeight={200} render={R=>(<R.ResponsiveContainer width="100%" height={200}><R.BarChart data={spendData} margin={{left:8,right:8,top:4,bottom:0}}><R.XAxis dataKey="date" tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={fD} interval="preserveStartEnd"/><R.YAxis tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v>=1000?(v/1000).toFixed(1)+"k":v)} width={50}/><R.Tooltip formatter={(v)=>fmt(v)}/><R.Bar dataKey="amount" name="Spent" fill={C.red} radius={[4,4,0,0]}/></R.BarChart></R.ResponsiveContainer>)}/>}
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
  const ti=(parseFloat(income.primary||0)*(income.payFrequency==="Weekly"?(52/12):income.payFrequency==="Twice Monthly"?2:income.payFrequency==="Monthly"?1:(26/12)))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
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
  const ti=(parseFloat(income.primary||0)*(income.payFrequency==="Weekly"?(52/12):income.payFrequency==="Twice Monthly"?2:income.payFrequency==="Monthly"?1:(26/12)))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const annualIncome=ti*12;
  const te=expenses.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const td=sumDebtsPrincipalAndAccrued(debts)+legacyCreditCardOwed(accounts,debts);
  const tm=debts.reduce((s,d)=>s+(parseFloat(d.minPayment)||0),0);
  const liq=(totalSavingsBalance(accounts))+(parseFloat(accounts.cushion||0));
  const ta=(totalCheckingBalance(accounts))+(totalSavingsBalance(accounts))+(parseFloat(accounts.cushion||0))+(parseFloat(accounts.investments||0))+(parseFloat(accounts.k401||0))+(parseFloat(accounts.roth_ira||0))+(parseFloat(accounts.brokerage||0))+(parseFloat(accounts.crypto||0))+(parseFloat(accounts.hsa||0))+(parseFloat(accounts.property||0))+(parseFloat(accounts.vehicles||0));
  const mAvg=te/Math.max(1,new Date().getMonth()+1);
  const efMo=mAvg>0?liq/mAvg:0;
  const sr=ti>0?Math.max(0,(ti-mAvg)/ti*100):0;
  const dti=ti>0?(tm/ti)*100:0;
  const nw=ta-td;
  const ov=bills.filter(b=>!b.paid&&dueIn(b.dueDate)<0).length;
  const mi=approxMonthlyInterestOnDebts(debts);
  const priorities=[];
  if(ov)priorities.push({ic:"🚨",c:C.red,t:"Pay overdue bills",d:ov+" bill"+(ov!==1?"s":" ")+"past due"});
  if(liq<1000)priorities.push({ic:"🛡️",c:C.amber,t:"Build $1,000 emergency fund",d:"Have "+fmt(liq)+" — need "+fmt(Math.max(0,1000-liq))+" more"});
  if(dti>36)priorities.push({ic:"💳",c:C.red,t:"Reduce debt load",d:"DTI "+dti.toFixed(1)+"% — target under 28%"});
  if(sr<5&&ti>0)priorities.push({ic:"📉",c:C.amber,t:"Boost savings rate",d:"Currently "+sr.toFixed(1)+"% — target 15-20%"});
  if(efMo<3)priorities.push({ic:"💰",c:C.amber,t:"Grow emergency fund",d:efMo.toFixed(1)+" months saved — target 3-6"});
  if(mi>100)priorities.push({ic:"⚡",c:C.accent,t:"Tackle interest costs",d:"~\u2248 "+fmt(mi)+"/mo at APR\u00f712 on listed debts"});
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

function SettingsView({settings,setSettings,appName,setAppName,greetName,setGreetName,onResetAllData,darkMode,setDarkMode,pinEnabled,setPinEnabled,profCategory,setProfCategory,profSub,setProfSub,expenses,bills,debts,trades,accounts,income,shifts,savingsGoals,budgetGoals,setBills,setDebts,setTrades,setShifts,setSGoals,setBGoals,setAccounts,setIncome,setExpenses,categories,setCategories,onResetOnboarding,onSignOut,onSignIn,userEmail,showToast,household,navTo,backupExport,backupImport,onLoadDemo,cloudSyncBump,supabaseConfigured,skipAuthMode,signedInForSync,netOnline,syncing=false,syncRecoverableError=false}){
  const[nm,setNm]=useState(appName||"");
  const[showPIN,setShowPIN]=useState(false);
  const[showEmailChange,setShowEmailChange]=useState(false);
  const[showPwChange,setShowPwChange]=useState(false);
  const[newEmail,setNewEmail]=useState("");
  const[newPw1,setNewPw1]=useState("");const[newPw2,setNewPw2]=useState("");
  const[acctMsg,setAcctMsg]=useState("");const[acctLoading,setAcctLoading]=useState(false);
  const[pendingImport,setPendingImport]=useState(null);

  const Tog=(k,l,d,ic)=>(<div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${C.border}`}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>{ic}</span><div><div style={{fontSize:14,fontWeight:600,color:C.text}}>{l}</div><div style={{fontSize:12,color:C.textLight}}>{d}</div></div></div><button onClick={()=>setSettings(p=>({...p,[k]:!p[k]}))} style={{background:"none",border:"none",cursor:"pointer",color:settings[k]?C.accent:C.borderLight,padding:0,flexShrink:0}}>{settings[k]?<ToggleRight size={28}/>:<ToggleLeft size={28}/>}</button></div>);

  return(<div className="fu">

    {/* ── Header ─────────────────────────────────── */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.4}}>Settings</div>
    </div>
    {userEmail&&<div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"10px 14px",marginBottom:14,display:"flex",flexWrap:"wrap",alignItems:"center",gap:10,rowGap:8,position:"relative",zIndex:2}}>
      <div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:MF,fontWeight:800,fontSize:13,color:"#fff",flexShrink:0}}>{userEmail[0].toUpperCase()}</div>
      <div style={{flex:"1 1 160px",minWidth:0}}><div style={{fontSize:13,fontWeight:700,color:C.accent,overflowWrap:"anywhere",wordBreak:"break-word"}}>{userEmail}</div><div style={{fontSize:11,color:C.textLight}}>Signed in</div></div>
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
          <input value={greetName||""} onChange={e=>setGreetName(e.target.value)} placeholder="Your name" style={{width:"100%",background:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:14,outline:"none"}}/>
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
      {[{k:"checking",l:"🏦 Checking",ph:"0"},{k:"savings",l:"💰 Savings",ph:"0"},{k:"cushion",l:"🛡️ Cushion / Emergency",ph:"0"},{k:"credit_card",l:"💳 Credit card (balance owed)",ph:"0"},{k:"investments",l:"📈 Investments",ph:"0"},{k:"property",l:"🏠 Property",ph:"0"},{k:"vehicles",l:"🚗 Vehicles",ph:"0"}].map(a=>(
        <div key={a.k} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <div style={{flex:1,fontSize:13,color:C.textMid}}>{a.l}</div>
          <input type="number" placeholder={a.ph} value={accounts[a.k]||""} onChange={e=>setAccounts(p=>({...p,[a.k]:e.target.value}))} onBlur={e=>{if(e.target.value)showToast&&showToast("✓ Balance saved");}} style={{width:120,background:C.surfaceAlt,border:`1.5px solid ${accounts[a.k]?C.accent:C.border}`,borderRadius:10,padding:"8px 10px",fontSize:14,fontFamily:MF,fontWeight:700,color:C.text,outline:"none",textAlign:"right",transition:"border-color .15s"}}/>
        </div>
      ))}
      <CashAccountsBlock accounts={accounts} setAccounts={setAccounts} showToast={showToast} variant="settings"/>
      <div style={{fontSize:12,fontWeight:700,color:C.textLight,textTransform:"uppercase",letterSpacing:.5,marginBottom:8,marginTop:4}}>Defaults</div>
      <div style={{fontSize:11,color:C.textLight,marginBottom:8,lineHeight:1.45}}>Used for new expenses, bills, recurring auto-log, and goal deposits. With <strong>multiple</strong> checking, savings, or credit cards, choose defaults here — the app won’t pick for you.</div>
      <FS label="Default: new expenses" options={PAID_FROM_OPTIONS.map(k=>({value:k,label:PAID_FROM_FS_LABELS[k]}))} value={normalizePaidFrom(settings.defaultExpensePaidFrom)} onChange={e=>setSettings(p=>({...p,defaultExpensePaidFrom:e.target.value}))}/>
      <FS label="Default: new bills (when paid)" options={PAID_FROM_OPTIONS.map(k=>({value:k,label:PAID_FROM_FS_LABELS[k]}))} value={normalizePaidFrom(settings.defaultBillPaidFrom)} onChange={e=>setSettings(p=>({...p,defaultBillPaidFrom:e.target.value}))}/>
      {cashAccountsByKind(accounts,"checking").length>=2&&<FS label="Default checking (several accounts)" options={[{value:"",label:"— Choose —"},...cashAccountsByKind(accounts,"checking").map(a=>({value:String(a.id),label:(a.name||"Checking")+" — "+fmt(parseFloat(a.balance||0))}))]} value={settings.defaultCheckingAccountId!=null&&settings.defaultCheckingAccountId!==""?String(settings.defaultCheckingAccountId):""} onChange={e=>setSettings(p=>({...p,defaultCheckingAccountId:e.target.value}))}/>}
      {cashAccountsByKind(accounts,"savings").length>=2&&<FS label="Default savings (several accounts)" options={[{value:"",label:"— Choose —"},...cashAccountsByKind(accounts,"savings").map(a=>({value:String(a.id),label:(a.name||"Savings")+" — "+fmt(parseFloat(a.balance||0))}))]} value={settings.defaultSavingsAccountId!=null&&settings.defaultSavingsAccountId!==""?String(settings.defaultSavingsAccountId):""} onChange={e=>setSettings(p=>({...p,defaultSavingsAccountId:e.target.value}))}/>}
      {cardDebtsList(debts).length>=2&&<FS label="Default credit card (several cards)" options={[{value:"",label:"— Choose —"},...cardDebtsList(debts).map(d=>({value:String(d.id),label:d.name+" — "+fmt(parseFloat(d.balance||0))}))]} value={settings.defaultCreditDebtId!=null&&settings.defaultCreditDebtId!==""?String(settings.defaultCreditDebtId):""} onChange={e=>setSettings(p=>({...p,defaultCreditDebtId:e.target.value}))}/>}
      <div style={{fontSize:12,fontWeight:700,color:C.textLight,textTransform:"uppercase",letterSpacing:.5,marginBottom:8,marginTop:14}}>Bills</div>
      <div style={{fontSize:11,color:C.textLight,marginBottom:8,lineHeight:1.45}}>After you mark a recurring bill paid, it hides in Paid History until the next due is close. This scales how many days ahead it comes back to <strong>Upcoming</strong> (weekly / monthly / etc. each keep their own shape).</div>
      <FS label="Recurring: return to Upcoming" options={BILL_RESHOW_PRESETS.map(p=>({value:String(p),label:p===0.5?"Tighter (0.5× notice)":p===0.75?"Slightly early (0.75×)":p===1?"Balanced (default)":p===1.25?"More notice (1.25×)":p===1.5?"Earlier (1.5×)":p===2?"Much earlier (2×)":"Latest allowed (3×)"}))} value={String(nearestBillReshowPreset(settings.billReshowLeadMultiplier))} onChange={e=>setSettings(p=>({...p,billReshowLeadMultiplier:parseFloat(e.target.value)||1}))}/>
    </div>

    {/* ── 3. APPEARANCE ──────────────────────────── */}
    <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
        <span style={{fontSize:18}}>🎨</span>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Appearance & Security</div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>{darkMode?"🌙":"☀️"}</span><div style={{fontSize:14,fontWeight:600,color:C.text}}>Dark Mode</div></div>
        <button onClick={()=>setDarkMode(d=>{const n=!d;setSettings(s=>({...s,darkMode:n}));return n;})} style={{background:"none",border:"none",cursor:"pointer",color:darkMode?C.accent:C.borderLight,padding:0}}>{darkMode?<ToggleRight size={28}/>:<ToggleLeft size={28}/>}</button>
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

    {/* ── Cloud & device ─────────────────────────── */}
    <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <span style={{fontSize:18}}>☁️</span>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Cloud & device</div>
      </div>
      {(()=>{
        void cloudSyncBump;
        let lastSyncLabel="Not yet";
        try{
          const raw=localStorage.getItem("fv_last_sync");
          const ms=raw?parseInt(raw,10):0;
          if(ms>0)lastSyncLabel=new Date(ms).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"});
        }catch{}
        const status=(()=>{
          if(!supabaseConfigured)return{label:"Browser-only mode",detail:"Cloud sign-in is not configured in this build. Your data is saving locally in this browser.",color:C.amber,bg:C.amberBg,border:C.amberMid};
          if(skipAuthMode&&!signedInForSync)return{label:"Device-only mode",detail:"You chose Try without account. Changes save on this device only until you sign in.",color:C.textMid,bg:C.surfaceAlt,border:C.border};
          if(!signedInForSync)return{label:"Local save ready",detail:"Sign in to turn on cloud backup and cross-device sync.",color:C.textMid,bg:C.surfaceAlt,border:C.border};
          if(netOnline===false)return{label:"Offline - saved on this device",detail:"Edits are kept locally and will sync when your connection returns.",color:C.amber,bg:C.amberBg,border:C.amberMid};
          if(syncRecoverableError)return{label:"Cloud refresh failed",detail:"You are still using the copy saved on this device. Tap Try again from the red banner if it appears.",color:C.red,bg:C.redBg,border:C.redMid};
          if(syncing)return{label:"Syncing with cloud",detail:"Checking your latest cloud copy now.",color:C.accent,bg:C.accentBg,border:C.accentMid};
          if(lastSyncLabel==="Not yet")return{label:"Cloud ready",detail:"You are signed in. Your next successful upload or refresh will show a timestamp here.",color:C.accent,bg:C.accentBg,border:C.accentMid};
          return{label:"Synced to cloud",detail:"Last successful cloud refresh: "+lastSyncLabel,color:C.green,bg:C.greenBg,border:C.greenMid};
        })();
        return(
          <>
            <div role="status" aria-label="Save and sync status" style={{background:status.bg,border:`1px solid ${status.border}`,borderRadius:12,padding:"11px 13px",marginBottom:10,lineHeight:1.45}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                <span style={{width:8,height:8,borderRadius:"50%",background:status.color,display:"inline-block",flexShrink:0}}/>
                <strong style={{fontSize:13,color:status.color}}>{status.label}</strong>
              </div>
              <div style={{fontSize:12,color:C.textMid}}>{status.detail}</div>
            </div>
            {!supabaseConfigured&&(
              <div style={{fontSize:13,color:C.amber,background:C.amberBg,border:`1px solid ${C.amberMid}`,borderRadius:10,padding:"10px 12px",marginBottom:10,lineHeight:1.5}}>
                Cloud sign-in and sync aren’t configured in this build (add <code style={{fontSize:11}}>VITE_SUPABASE_URL</code> and <code style={{fontSize:11}}>VITE_SUPABASE_ANON_KEY</code>, then rebuild). Your data stays in this browser only.
              </div>
            )}
            {supabaseConfigured&&skipAuthMode&&!signedInForSync&&(
              <div style={{fontSize:13,color:C.textMid,marginBottom:10,lineHeight:1.5}}>
                You’re using <strong>Try without account</strong> — everything is stored in this browser only and does not sync to the cloud. Sign in from the splash screen to enable backup across devices.
              </div>
            )}
            {supabaseConfigured&&signedInForSync&&(
              <div style={{fontSize:13,color:C.textMid,marginBottom:10,lineHeight:1.45}}>
                <strong>Last successful cloud refresh:</strong> {lastSyncLabel}
                {netOnline===false&&<span style={{display:"block",marginTop:6,color:C.amber}}>You’re offline — edits stay on this device and sync when you reconnect.</span>}
              </div>
            )}
            <div style={{fontSize:12,color:C.textLight,lineHeight:1.5}}>
              <strong>Offline.</strong> Trackfi keeps working without internet. Data lives in this browser; when you’re signed in with cloud configured, changes upload when you’re back online.
            </div>
          </>
        );
      })()}
    </div>

    {/* ── 5. DATA ────────────────────────────────── */}
    <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
        <span style={{fontSize:18}}>📦</span>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Data</div>
      </div>
      <div style={{fontSize:12,color:C.textLight,marginBottom:8,lineHeight:1.45}}>Includes transactions, bills, debts, goals, household & settle-up history, recurring, notifications, net worth chart data, categories, and preferences — use for moving phones or sharing a restore file with a partner (same account).</div>
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        <button className="ba" onClick={backupExport} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:10,padding:"11px 0",color:C.accent,fontWeight:700,fontSize:13,cursor:"pointer"}}><Download size={14}/>Export JSON</button>
        <label className="ba" style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 0",color:C.textMid,fontWeight:700,fontSize:13,cursor:"pointer"}}><Database size={14}/>Import<input type="file" accept=".json" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f)setPendingImport(f);e.target.value="";}}/></label>
      </div>
      {onLoadDemo&&<button type="button" className="ba" onClick={onLoadDemo} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:C.amberBg,border:`1px solid ${C.amberMid}`,borderRadius:10,padding:"11px 0",color:C.amber,fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:10}}>🧪 Load sample (demo) data</button>}
      {pendingImport&&<div style={{background:C.amberBg,border:`1px solid ${C.amberMid}`,borderRadius:12,padding:"12px 14px",marginBottom:8}}>
        <div style={{fontSize:13,fontWeight:700,color:C.amber,marginBottom:4}}>⚠️ Replace all current data with "{pendingImport.name}"?</div>
        <div style={{fontSize:12,color:C.textMid,marginBottom:10}}>Trackfi validates the whole file before changing anything. If it is malformed, your current data stays untouched. Export a backup first if needed.</div>
        <div style={{display:"flex",gap:8}}>
          <button className="ba" onClick={async()=>{const ok=await backupImport(pendingImport);if(ok)setPendingImport(null);}} style={{flex:1,background:C.amber,border:"none",borderRadius:8,padding:"9px 0",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>Validate & Import</button>
          <button className="ba" onClick={()=>setPendingImport(null)} style={{flex:1,background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 0",color:C.textMid,fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancel</button>
        </div>
      </div>}
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

    <div style={{textAlign:"center",padding:"20px 8px 6px",fontSize:11,color:C.textLight,lineHeight:1.5,letterSpacing:.15}}>
      Trackfi v {__TRACKFI_APP_VERSION__}{import.meta.env.DEV?" · dev":""}
    </div>
  </div>);
}

function HealthScoreView({income,expenses,debts,accounts,bills,tradingAccount,onNavigate}){
  const ti=(parseFloat(income.primary||0)*(income.payFrequency==="Weekly"?(52/12):income.payFrequency==="Twice Monthly"?2:income.payFrequency==="Monthly"?1:(26/12)))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const _hsAllMs=new Set(expenses.map(e=>e.date?.slice(0,7)).filter(Boolean));
  const te=_hsAllMs.size>0?expenses.reduce((s,e)=>s+(parseFloat(e.amount)||0),0)/Math.max(1,_hsAllMs.size):0;
  const td=sumDebtsPrincipalAndAccrued(debts)+legacyCreditCardOwed(accounts,debts);
  const ta=(totalCheckingBalance(accounts))+(totalSavingsBalance(accounts))+(parseFloat(accounts.cushion||0))+(parseFloat(accounts.investments||0))+(parseFloat(accounts.k401||0))+(parseFloat(accounts.roth_ira||0))+(parseFloat(accounts.brokerage||0))+(parseFloat(accounts.crypto||0))+(parseFloat(accounts.hsa||0))+(parseFloat(accounts.property||0))+(parseFloat(accounts.vehicles||0))+(parseFloat(tradingAccount?.balance||0));
  const liquid=(totalSavingsBalance(accounts))+(parseFloat(accounts.cushion||0));
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
                   p.id==="emergency"?"Move "+fmt(Math.max(0,(ti/12*3)-(totalSavingsBalance(accounts)+parseFloat(accounts.cushion||0))))+" to savings to reach 3-month goal":
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
  const ti=useMemo(()=>(parseFloat(income.primary||0)*(income.payFrequency==="Weekly"?(52/12):income.payFrequency==="Twice Monthly"?2:income.payFrequency==="Monthly"?1:(26/12)))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0)),[income]);
  const months=range==="1M"?1:range==="3M"?3:range==="6M"?6:12;
  const data=useMemo(()=>Array.from({length:months},(_,i)=>{
    const d=new Date(now.getFullYear(),now.getMonth()-months+1+i,1);
    const ms=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
    const sp=expenses.filter(e=>e.date?.startsWith(ms)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
    const tp=trades.filter(t=>t.date?.startsWith(ms)).reduce((s,t)=>s+(parseFloat(t.pnl)||0),0);
    const inc=ti+(tp>0?tp:0);
    return{month:FULL_MOS[d.getMonth()].slice(0,3),income:parseFloat(inc.toFixed(0)),spending:parseFloat(sp.toFixed(0)),saved:parseFloat(Math.max(0,inc-sp).toFixed(0))};
  }),[expenses,income,trades,months]);
  const TT=({active,payload,label})=>{if(!active||!payload?.length)return null;const rows=payload.filter(p=>p!=null);if(!rows.length)return null;return(<div style={{background:C.surface,borderRadius:12,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"10px 14px",fontSize:12}}><div style={{fontWeight:700,marginBottom:6}}>{label}</div>{rows.map((p,i)=><div key={p.dataKey??i} style={{display:"flex",justifyContent:"space-between",gap:12,marginBottom:2}}><span style={{color:C.textLight}}>{p.name}</span><span style={{fontWeight:700}}>{fmt(p.value??0)}</span></div>)}</div>);};
  return(
    <div className="fu">
      {(()=>{
        const sources=[{l:"Primary",v:parseFloat(income.primary||0),c:C.accent},{l:"Trading",v:parseFloat(income.trading||0),c:C.green},{l:"Freelance",v:parseFloat(income.freelance||0),c:C.purple},{l:"Rental",v:parseFloat(income.rental||0),c:C.amber},{l:"Dividends",v:parseFloat(income.dividends||0),c:C.teal},{l:"Other",v:parseFloat(income.other||0),c:C.textLight}].filter(s=>s.v>0);
        const total=sources.reduce((s,x)=>s+x.v,0);
        if(!total)return null;
        return(<div style={{background:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:18,padding:18,marginBottom:14}}>
          <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Income Breakdown</div>
          <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",minWidth:0}}>
            <RechartsReady minHeight={120} render={R=>(<R.PieChart width={120} height={120}><R.Pie data={sources.map(s=>({name:s.l,value:s.v}))} cx={55} cy={55} innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={2}>{sources.map((s,i)=><R.Cell key={i} fill={s.c}/>)}</R.Pie></R.PieChart>)}/>
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
        <RechartsReady minHeight={220} render={R=>(
        <div className="fv-chart-wrap">
        <R.ResponsiveContainer width="100%" height={220}>
          <R.ComposedChart data={data.map(m=>({...m,savingsRate:m.income>0?Math.max(0,((m.income-m.spending)/m.income)*100):0}))} margin={{left:0,right:0,top:4,bottom:4}} barGap={3}>
            <R.XAxis dataKey="month" tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false}/>
            <R.YAxis yAxisId="left" tick={{fill:C.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+(v>=1000?(v/1000).toFixed(0)+"k":v)} width={36}/>
            <R.YAxis yAxisId="right" orientation="right" tick={{fill:C.teal,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>v.toFixed(0)+"%"} width={28}/>
            <R.Tooltip content={<TT/>}/>
            <R.Bar yAxisId="left" dataKey="income" name="Income" fill={C.green} radius={[4,4,0,0]}/>
            <R.Bar yAxisId="left" dataKey="spending" name="Spending" fill={C.red} radius={[4,4,0,0]}/>
            <R.Bar yAxisId="left" dataKey="saved" name="Saved" fill={C.accent} radius={[4,4,0,0]}/>
            <R.Line yAxisId="right" type="monotone" dataKey="savingsRate" name="Savings %" stroke={C.teal} strokeWidth={2.5} dot={{r:3,fill:C.teal}} activeDot={{r:5}}/>
          </R.ComposedChart>
        </R.ResponsiveContainer>
        </div>
        )}/>
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

function TaxView({expenses,income,trades,shifts,appName}){
  const now=new Date();const yr=now.getFullYear();
  const ti=(parseFloat(income.primary||0)*(income.payFrequency==="Weekly"?(52/12):income.payFrequency==="Twice Monthly"?2:income.payFrequency==="Monthly"?1:(26/12)))+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
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


function SubsView({detectedSubs,expenses,showToast,dismissed,setDismissed}){
  const active=detectedSubs.filter(s=>!dismissed.includes(s.name));
  const monthly=active.filter(s=>s.interval==="Monthly");
  const other=active.filter(s=>s.interval!=="Monthly");
  const totalMo=monthly.reduce((s,x)=>s+(parseFloat(x.amount)||0),0);
  const totalAll=active.reduce((s,x)=>{const a=parseFloat(x.amount)||0;if(x.interval==="Monthly")return s+a;if(x.interval==="Weekly")return s+a*(52/12);if(x.interval==="Annual")return s+a/12;return s+a;},0);
  const catMap=active.reduce((a,s)=>{const raw=parseFloat(s.amount)||0;const mo=s.interval==="Weekly"?raw*(52/12):s.interval==="Annual"?raw/12:raw;a[s.category]=(a[s.category]||0)+mo;return a},{});
  const cats=Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
  const maxCat=cats[0]?.[1]||1;
  return(
    <div className="fu">
      <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.3,marginBottom:4}}>Subscriptions</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:13,color:C.textLight}}>Auto-detected from your expenses</div>
        {dismissed.length>0&&<button onClick={()=>setDismissed([])} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:C.accent,fontWeight:600,padding:0}}>Restore {dismissed.length} hidden</button>}
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
function RecurringView({expenses,setExpenses,categories,showToast,appReady,recurrings,setRecurrings,applySpend,defaultExpensePaidFrom,accounts={},settings={},debts=[]}){
  const[showAdd,setShowAdd]=useState(false);
  const[form,setForm]=useState({name:"",amount:"",category:"Food",frequency:"Monthly",nextDate:todayStr(),icon:""});
  const[formErr,setFormErr]=useState("");
  useEffect(()=>{
    if(!appReady)return;
    const today=todayStr();
    const lastRun=localStorage.getItem(getScope()+"recurring_last");
    if(lastRun===today)return; // already ran today — skip
    const newExps=[];
    const updated=recurrings.map(r=>{
      if(r.nextDate<=today&&r.active!==false){
        newExps.push({id:Date.now()+Math.random(),name:r.name,amount:r.amount,category:r.category,date:today,notes:"Auto-logged",paidFrom:normalizePaidFrom(defaultExpensePaidFrom)});
        const _nd=shiftRecurringBillDueDate(r.nextDate,r.frequency,today,true);
        return{...r,nextDate:_nd,lastLogged:today};
      }
      return r;
    });
    if(newExps.length===0){
      try{localStorage.setItem(getScope()+"recurring_last",today);}catch{}
      return;
    }
    let recurCommit=updated;
    if(newExps.length){
      const tot=newExps.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
      const dpf=normalizePaidFrom(defaultExpensePaidFrom);
      const cards=cardDebtsList(debts);
      let creditDebtId=undefined,bankAccountId=undefined;
      if(dpf==="credit"){
        const dc=pickDefaultCreditDebtId(settings,debts);
        if(dc)creditDebtId=dc;
      }else if(dpf==="checking"||dpf==="savings"){
        bankAccountId=resolveBankAccountIdForExpense(dpf,"",accounts,settings)||undefined;
      }
      const creditOk=!(dpf==="credit"&&tot>0&&(!cards.length||!creditDebtId));
      const cashErr=(dpf==="checking"||dpf==="savings")&&tot>0?validateCashSpendPrerequisites(dpf,"",accounts,settings):null;
      const cashOk=!cashErr;
      if(!creditOk||!cashOk){
        recurCommit=recurrings;
        const sk=getScope()+"recurring_skip_err";
        try{
          if(showToast&&localStorage.getItem(sk)!==today){
            if(!creditOk)showToast("Recurring skipped: add cards under Debt or set a default credit card in Settings \u2192 Defaults.","error");
            else showToast(cashErr||"Recurring skipped: fix pay-from under Settings \u2192 Defaults.","error");
            localStorage.setItem(sk,today);
          }
        }catch{}
      }else{
        const tagged=newExps.map(row=>({...row,...(dpf==="credit"&&creditDebtId?{creditDebtId:String(creditDebtId)}:{}),...((dpf==="checking"||dpf==="savings")&&bankAccountId?{bankAccountId:String(bankAccountId)}:{})}));
        if(applySpend&&tot&&(dpf!=="credit"||creditDebtId))applySpend(dpf,tot,creditDebtId,bankAccountId);
        setExpenses(p=>[...p,...tagged]);
        if(showToast){
          if(newExps.length===1)showToast("🔄 Auto-logged: "+newExps[0].name);
          else showToast("🔄 Auto-logged "+newExps.length+" recurring expenses");
        }
      }
    }
    setRecurrings(recurCommit);
    try{
      if(recurCommit===updated){
        const sc=getScope();
        localStorage.setItem(sc+"recurring_last",today);
        localStorage.removeItem(sc+"recurring_skip_err");
      }
    }catch{}
  },[appReady,recurrings,defaultExpensePaidFrom,accounts,settings,debts,applySpend,showToast]);
  const FREQS=["Weekly","Bi-weekly","Monthly","Quarterly","Annual"];
  const ICONS=["🏠","🚗","📱","💪","🎮","📺","☕","🛒","💊","🐕","🎓","⚡","💧","🌐","🎵","🏋️","🍕","✈️","👶","🐱"];
  function add(){if(!form.name){setFormErr("Name is required.");return;}if(!form.amount||isNaN(parseFloat(form.amount))){setFormErr("Enter a valid amount.");return;}setFormErr("");setRecurrings(p=>[...p,{id:Date.now(),name:form.name,amount:form.amount,category:form.category,frequency:form.frequency,nextDate:form.nextDate,icon:form.icon||"🔄",active:true}]);setForm({name:"",amount:"",category:"Food",frequency:"Monthly",nextDate:todayStr(),icon:""});if(showToast)showToast("Recurring added — "+form.name);setShowAdd(false);}
  const active=recurrings.filter(r=>r.active!==false);
  const totalMonthly=active.reduce((s,r)=>{const amt=parseFloat(r.amount||0);if(r.frequency==="Weekly")return s+amt*(52/12);if(r.frequency==="Bi-weekly")return s+amt*(26/12);if(r.frequency==="Monthly")return s+amt;if(r.frequency==="Quarterly")return s+amt/3;if(r.frequency==="Annual")return s+amt/12;return s+amt;},0);
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
      
      {active.length>1&&(()=>{const catData=Object.entries(active.reduce((m,r)=>{const k=r.category||"Other";const mo=parseFloat(r.amount||0)*(r.frequency==="Weekly"?(52/12):r.frequency==="Bi-weekly"?(26/12):r.frequency==="Quarterly"?0.33:r.frequency==="Annual"?0.083:1);m[k]=(m[k]||0)+mo;return m;},{})).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,amt])=>({name,amt}));const mx=catData[0]?.amt||1;return(<div style={{background:C.surface,borderRadius:14,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"14px 14px 8px",marginBottom:14}}><div style={{fontSize:12,fontWeight:600,color:C.textLight,marginBottom:10}}>Monthly by Category</div>{catData.map(({name,amt})=><div key={name} style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12,color:C.textMid}}>{name}</span><span style={{fontSize:12,fontFamily:MF,fontWeight:700,color:C.red}}>{fmt(amt)}/mo</span></div><div style={{height:5,background:C.borderLight,borderRadius:3}}><div style={{height:5,width:`${(amt/mx*100).toFixed(1)}%`,background:C.accent,borderRadius:3}}/></div></div>)}</div>);})()}{recurrings.length===0&&<Empty text="Add rent, subscriptions, or any regular expense — they log automatically when due." icon={RefreshCw} cta="Add First" onCta={()=>setShowAdd(true)}/>}
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
          <button onClick={()=>{const snap=r;setRecurrings(p=>p.filter(x=>x.id!==snap.id));if(showToast)showToast(snap.name+" removed","error",{label:"Undo",fn:()=>setRecurrings(p=>[...p,snap])});}} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,display:"flex"}}><Trash2 size={14}/></button>
        </div>);
      })}
      {showAdd&&<Modal title="Add Recurring" icon={RefreshCw} onClose={()=>{setShowAdd(false);setFormErr("");}} onSubmit={add} submitLabel="Add Recurring" error={formErr}>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>{ICONS.map(ic=><button key={ic} onClick={()=>setForm(p=>({...p,icon:ic}))} style={{fontSize:20,background:form.icon===ic?C.accentBg:C.surfaceAlt,border:form.icon===ic?`2px solid ${C.accent}`:"2px solid transparent",borderRadius:8,padding:"4px 6px",cursor:"pointer"}}>{ic}</button>)}</div>
        <FI label="Name" placeholder="Rent, Netflix, Gym..." value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
        <div style={{display:"flex",gap:12}}><FI half label="Amount ($)" type="number" placeholder="0.00" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))}/><FI half label="Next Due Date" type="date" value={form.nextDate} onChange={e=>setForm(p=>({...p,nextDate:e.target.value}))}/></div>
        <FS label="Frequency" options={FREQS} value={form.frequency} onChange={e=>setForm(p=>({...p,frequency:e.target.value}))}/>
        <FS label="Category" options={categories.map(c=>c.name)} value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}/>
      </Modal>}
    </div>
  );
}

function CategoriesView({categories,setCategories,expenses,setExpenses,showToast}){
  const[showAdd,setShowAdd]=useState(false);
  const[customEmoji,setCustomEmoji]=useState("");
  const[form,setForm]=useState({name:"",icon:""});
  const[editCat,setEditCat]=useState(null);
  const[editForm,setEditForm]=useState({});
  const[editCustomEmoji,setEditCustomEmoji]=useState("");
  const[searchCat,setSearchCat]=useState("");
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
                <button onClick={()=>{const name=cat.name;setCategories(p=>p.filter(c=>c.id!==cat.id));setExpenses&&setExpenses(p=>p.map(e=>e.category===name?{...e,category:"Misc"}:e));showToast&&showToast("Category removed — expenses moved to Misc","error");}} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,display:"flex",padding:"4px 3px"}}><Trash2 size={13}/></button>
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
              {!DEFAULT_IDS.includes(cat.id)&&<><button onClick={()=>{setEditCat(cat);setEditForm({name:cat.name,icon:cat.icon||""});setEditCustomEmoji("");}} style={{background:"none",border:"none",cursor:"pointer",color:C.accent,fontSize:12,fontWeight:600}}>Edit</button><button onClick={()=>{const name=cat.name;setCategories(p=>p.filter(c=>c.id!==cat.id));setExpenses&&setExpenses(p=>p.map(e=>e.category===name?{...e,category:"Misc"}:e));showToast&&showToast("Removed — expenses moved to Misc","error");}} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,display:"flex"}}><Trash2 size={13}/></button></>}
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
      {editCat&&<Modal title="Edit Category" icon={Target} onClose={()=>setEditCat(null)} onSubmit={()=>{const oldName=editCat.name;const newName=editForm.name||editCat.name;const icon=editCustomEmoji.trim()||editForm.icon||editCat.icon;setCategories(p=>p.map(c=>c.id===editCat.id?{...c,name:newName,icon}:c));if(newName!==oldName&&setExpenses)setExpenses(p=>p.map(e=>e.category===oldName?{...e,category:newName}:e));showToast&&showToast("✓ Category updated");setEditCat(null);}} submitLabel="Save">
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

function HouseholdView({household,setHousehold,expenses,bills=[],showToast,setBills,settlements,setSettlements,hhBudgets,setHhBudgets}){
  const[tab,setTab]=useState("split");// split | settle | budget | members
  const[form,setForm]=useState({name:"",emoji:"😊",color:"#6366f1"});
  const EMOJIS_HH=["😊","😄","🧑","👩","👨","🧔","👱","🧑‍💼","👩‍💼","🧑‍⚕️","👩‍⚕️","⭐","🌟","🏠"];
  const COLORS_HH=["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899"];

  const memberLabel=m=>{
    const n=m?.name!=null?String(m.name).trim():"";
    if(m?.id==="me")return n||"You";
    return n||"Member";
  };

  const{now,ms,thisMonthExp,sharedExp,sharedTotal,splitPer,memberStats,avgOwed,balances,settlementPairs}=useMemo(()=>{
    const now=new Date();
    const ms=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
    const thisMonthExp=expenses.filter(e=>e.date?.startsWith(ms));
    const sharedExp=thisMonthExp.filter(e=>e.owner==="shared");
    const sharedTotal=sharedExp.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
    const nMem=Math.max(1,household.members.length);
    const splitPer=sharedTotal/nMem;
    const memberStats=household.members.map(m=>{
      const personal=thisMonthExp.filter(e=>e.owner===m.id||(m.id==="me"&&(!e.owner||e.owner==="me")&&e.owner!=="shared"&&e.owner!=="partner"))
        .reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
      const share=splitPer;
      const totalOwed=personal+share;
      const memberBills=bills.filter(b=>b.paidBy===m.id&&!b.paid);
      const billTotal=memberBills.reduce((s,b)=>s+(parseFloat(b.amount)||0),0);
      return{...m,personal,share,totalOwed,memberBills,billTotal};
    });
    const avgOwed=memberStats.length>0?memberStats.reduce((s,m)=>s+m.totalOwed,0)/memberStats.length:0;
    const balances=memberStats.map(m=>({...m,balance:m.totalOwed-avgOwed}));
    const settlementPairs=optimizedSettlementPairs(balances);
    return{now,ms,thisMonthExp,sharedExp,sharedTotal,splitPer,memberStats,avgOwed,balances,settlementPairs};
  },[expenses,bills,household.members]);

  // ── Split math (in useMemo above): personal + fair share of shared ────────
  // ── Who owes whom (Splitwise-style): balances vs avgOwed ─────────────────
  // Positive balance = paid more than fair share = others owe them
  // Negative balance = paid less = they owe others

  function markSettled(){
    const entry={date:todayStr(),month:ms,
      from:settlementPairs.map(p=>memberLabel(p.from)).filter((v,i,a)=>a.indexOf(v)===i).join(", "),
      to:settlementPairs.map(p=>memberLabel(p.to)).filter((v,i,a)=>a.indexOf(v)===i).join(", "),
      amount:settlementPairs.reduce((s,p)=>s+p.amount,0).toFixed(2),
      pairs:settlementPairs.map(p=>({from:memberLabel(p.from),to:memberLabel(p.to),amount:p.amount.toFixed(2)})),
    };
    const next=[entry,...settlements].slice(0,12);
    setSettlements(next);
    showToast("✅ Settlement saved to history. Expenses and balances stay as-is until you edit them.");
  }

  function saveHhBudgets(next){setHhBudgets(next);}

  const TABS=[{id:"split",label:"Split"},{id:"settle",label:"Settle Up"},{id:"budget",label:"Budget"},{id:"members",label:"Members"}];

  return(
    <div className="fu">
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div>
          <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text}}>{household.name||"Household"}</div>
          <div style={{fontSize:13,color:C.textLight,marginTop:2}}>{household.members.length} member{household.members.length!==1?"s":""} · {household.enabled?"Active":"Disabled"}</div>
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
          <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.max(1,household.members.length)},minmax(0,1fr))`,gap:10,marginBottom:16}}>
            {memberStats.map(m=>(
              <div key={m.id} style={{background:C.surface,borderRadius:16,padding:"14px 12px",textAlign:"center",boxShadow:"0 1px 4px rgba(10,22,40,.07)",minWidth:0}}>
                <div style={{fontSize:24,marginBottom:4}}>{m.emoji}</div>
                <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:6}}>{memberLabel(m)}</div>
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
                      <div style={{fontSize:13,fontWeight:600,color:C.text}}>{memberLabel(m)}</div>
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
          <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"10px 12px",fontSize:12,color:C.accent,lineHeight:1.45,marginBottom:12}}>
            Settle Up currently balances each member's personal spending plus equal share of items tagged Shared. It does not yet track who actually paid for every shared purchase.
          </div>
          <div style={{background:C.surface,borderRadius:16,padding:16,marginBottom:14,boxShadow:"0 1px 4px rgba(10,22,40,.07)"}}>
            <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Current Balances</div>
            {balances.map(m=>{
              const isEven=Math.abs(m.balance)<0.5;
              const isOwed=m.balance>0.5;
              return(
                <div key={m.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.borderLight}`}}>
                  <div style={{width:40,height:40,borderRadius:"50%",background:m.color+"22",border:`2px solid ${m.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{m.emoji}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:C.text}}>{memberLabel(m)}</div>
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
              {settlementPairs.map(p=>(
                <div key={p.from.id+p.to.id} style={{fontSize:13,color:"rgba(255,255,255,.7)",marginBottom:4}}>
                  {p.from.emoji} <strong style={{color:"#fff"}}>{memberLabel(p.from)}</strong> pays {p.to.emoji} <strong style={{color:"#fff"}}>{memberLabel(p.to)}</strong> → <span style={{color:"#34D399",fontWeight:700}}>{fmt(p.amount)}</span>
                </div>
              ))}
              <div style={{fontSize:11,color:"rgba(255,255,255,.65)",marginTop:10,lineHeight:1.45}}>This records who settled the equal shared-cost split; it does not change or delete expenses.</div>
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
                <div style={{fontSize:14,fontWeight:700,color:C.text}}>{memberLabel(m)}</div>
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
            💡 <strong>Live household sync is active.</strong> Each member can log in on their own device with the same Trackfi account — expenses, bills, and goals stay in sync automatically.
          </div>
        </div>
      )}
    </div>
  );
}


function AppInner(){
  const[tab,setTabRaw]=useState("home");
  const[tabHistory,setTabHistory]=useState([]);
  function navTo(t){if(t===tab)return;setTabHistory(h=>[...h.slice(-19),tab]);setTabRaw(t);requestAnimationFrame(()=>requestAnimationFrame(()=>{const el=document.getElementById("fv-scroll");if(el)el.scrollTop=0;}));}
  const navToRef=useRef(navTo);
  navToRef.current=navTo;
  function goBack(){setTabHistory(h=>{if(!h.length)return h;const p=h[h.length-1];setTabRaw(p);requestAnimationFrame(()=>requestAnimationFrame(()=>{const el=document.getElementById("fv-scroll");if(el)el.scrollTop=0;}));return h.slice(0,-1);});}
  const canGoBack=tabHistory.length>0;
  const[rechartsMod,setRechartsMod]=useState(null);
  const[rechartsLoadFailed,setRechartsLoadFailed]=useState(false);
  useEffect(()=>{
    let c=false;
    function load(){
      import("recharts")
        .then(m=>{if(!c)setRechartsMod(m);})
        .catch(e=>{console.error("[Trackfi] recharts load failed",e);if(!c)setRechartsLoadFailed(true);});
    }
    /** Defer to idle so first paint + critical handlers stay unblocked (charts show skeleton until ready). */
    let idleId;
    let tId;
    if(typeof requestIdleCallback!=="undefined"){
      idleId=requestIdleCallback(load,{timeout:2800});
    }else{
      tId=setTimeout(load,0);
    }
    return()=>{
      c=true;
      if(idleId!=null&&typeof cancelIdleCallback!=="undefined")cancelIdleCallback(idleId);
      if(tId!=null)clearTimeout(tId);
    };
  },[]);
  const[darkMode,setDarkMode]=useState(()=>{try{return localStorage.getItem("fv_dark")==="1";}catch{return false;}});
  const _startupParams=useRef((()=>{try{const sp=new URLSearchParams(window.location.search);return{action:sp.get("action"),tab:sp.get("tab")};}catch{return{};}})());
  /** Throttle pulls when app becomes visible (visibility/pageshow can fire in bursts on mobile). */
  const lastVisibilityPullRef=useRef(0);
  const readyRef=useRef(false);
  const[authSession,setAuthSession]=useState(null);
  const[authLoading,setAuthLoading]=useState(true);
  const[pwResetMode,setPwResetMode]=useState(()=>{try{return localStorage.getItem("fv_pw_reset")==="1";}catch{return false;}});
  const[newPw,setNewPw]=useState("");const[pwMsg,setPwMsg]=useState("");const[pwLoading,setPwLoading]=useState(false);
  const[skipAuth,setSkipAuth]=useState(()=>{try{return localStorage.getItem("fv_skip_auth")==="1";}catch{return false;}});
  const[storageQuotaBlocked,setStorageQuotaBlocked]=useState(false);
  const[cloudSyncMetaBump,setCloudSyncMetaBump]=useState(0);
  const[sessionExpired,setSessionExpired]=useState(false);
  useEffect(()=>{
    setSessionExpiredHandler(()=>{
      try{
        const s=JSON.parse(localStorage.getItem("fv_session")||"null");
        if(!s?.access_token)return;
      }catch{return;}
      try{localStorage.removeItem("fv_session");}catch{}
      setAuthSession(null);
      setSessionExpired(true);
    });
    return()=>setSessionExpiredHandler(null);
  },[]);
  const authToken=authSession?.access_token||null;
  const authSessionRef=useRef(authSession);
  useEffect(()=>{authSessionRef.current=authSession;},[authSession]);
  // Background token refresh — Supabase tokens expire after 1hr, refresh every 45min
  useEffect(()=>{
    if(!authSession?.refresh_token)return;
    const doRefresh=async()=>{
      try{
        const s=(()=>{try{return JSON.parse(localStorage.getItem("fv_session")||"null");}catch{return null;}})();
        if(!s?.refresh_token)return;
        const res=await trackfiAuthRefreshFetch(s.refresh_token);
        if(!res)return;
        const r=await res.json().catch(()=>({}));
        if(r.access_token){
          const newSess={...s,...r};
          try{localStorage.setItem("fv_session",JSON.stringify(newSess));}catch{}
          setAuthSession(newSess);
        } else {
          // Refresh token is expired or revoked — session is gone
          triggerSessionExpired();
        }
      }catch{}
    };
    const iv=setInterval(doRefresh,45*60*1000);
    return()=>clearInterval(iv);
  },[authSession?.refresh_token]);

  useEffect(()=>{
    // "Try without account" — don't block on session refresh / network.
    try{
      if(localStorage.getItem("fv_skip_auth")==="1"){
        setAuthLoading(false);
        return undefined;
      }
    }catch{}
    const authMaxMs=isSupabaseConfigured()?12000:5000;
    const authTimeout=setTimeout(()=>setAuthLoading(false),authMaxMs);
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
            try{localStorage.setItem("fv_session", JSON.stringify(fullSess));}catch{}
            if(type==="recovery") {
              // Password reset flow — sign in but show change-password prompt
              setAuthSession(fullSess);
              try{localStorage.setItem("fv_pw_reset","1");}catch{}
            } else {
              handleAuth(fullSess);
            }
          }
          window.history.replaceState(null,"",window.location.pathname);
          setAuthLoading(false);
        }).catch(()=>{window.history.replaceState(null,"",window.location.pathname);setAuthLoading(false);});
        return()=>clearTimeout(authTimeout);
      }
    }
    // Normal boot: validate + refresh existing session
    const s=(()=>{try{return JSON.parse(localStorage.getItem("fv_session")||"null");}catch{return null;}})();
    if(!s?.access_token){setAuthLoading(false);return()=>clearTimeout(authTimeout);}
    // Try to refresh the token first (handles expired access tokens)
    async function tryRefresh(session){
      if(!session?.refresh_token) return session;
      try{
        const res=await trackfiAuthRefreshFetch(session.refresh_token);
        if(!res)return session;
        const r=await res.json().catch(()=>({}));
        if(r.access_token){
          const newSess={...session,...r};
          try{localStorage.setItem("fv_session",JSON.stringify(newSess));}catch{}
          return newSess;
        }
      }catch{}
      return session;
    }
    tryRefresh(s).then(sess=>{
      return supaFetch("/auth/v1/user",{headers:{"Authorization":"Bearer "+sess.access_token}}).then(u=>{
        if(u?.data?.id||u?.id){
          setAuthSession(sess);
        }else if(u?.error&&u.error.status!==401){
          // Offline / transient auth check failure: keep the local session so the app remains usable.
          setAuthSession(sess);
        }else{
          localStorage.removeItem("fv_session");
        }
        setAuthLoading(false);
      });
    }).catch(()=>setAuthLoading(false));
    return()=>clearTimeout(authTimeout);
  },[]);
  function handleAuth(sess){
    const priorSession=(()=>{try{return JSON.parse(localStorage.getItem("fv_session")||"null");}catch{return null;}})();
    const priorScope=(()=>{try{return getScope();}catch{return "";}})();
    setAuthSession(sess);
    try{localStorage.setItem("fv_session",JSON.stringify(sess));}catch{}
    let migratedLocal=false;
    // Migrate device-scoped "Try without account" data into the signed-in scope.
    try{
      const uid=sess?.user?.id?.slice(0,8);
      if(uid){
        const scope="fv6_"+uid+":";
        const priorWasDevice=!priorSession?.user?.id&&priorScope&&priorScope!==scope;
        const copyKeys=SCOPED_USER_DATA_KEYS;
        if(priorWasDevice){
          copyKeys.forEach(k=>{
            const src=localStorage.getItem(priorScope+k);
            const dst=localStorage.getItem(scope+k);
            if(src!=null&&dst==null){
              localStorage.setItem(scope+k,src);
              migratedLocal=true;
            }
          });
        }
        copyKeys.forEach(k=>{
          const legacy=localStorage.getItem("fv6:"+k);
          const scoped=localStorage.getItem(scope+k);
          if(legacy!=null&&scoped==null){
            localStorage.setItem(scope+k,legacy);
            migratedLocal=true;
          }
        });
        if(migratedLocal){
          copyKeys.forEach(k=>{
            try{
              const raw=localStorage.getItem(scope+k);
              if(raw!=null)ss("fv6:"+k,JSON.parse(raw));
            }catch{}
          });
        }
      }
    }catch{}
    // Authoritative pull after migration: boot may have run with a different scope before session was set.
    setTimeout(()=>loadFromSupabase(sess,{background:true,preserveLocalOnEmpty:migratedLocal}),150);
  }
  async function loadFromSupabase(sess,opts={}){
    const background=opts.background===true;
    if(isTrackfiDemoMode())return;
    const uid=sess?.user?.id;
    if(!uid)return;
    if(background&&backgroundPullInFlightRef.current)return backgroundPullInFlightRef.current;
    const gen=++remotePullGenRef.current;
    const exec=(async()=>{
      try{
        await flushPendingSync();
        if(gen!==remotePullGenRef.current)return;
        await new Promise(r=>setTimeout(r,50));
        if(gen!==remotePullGenRef.current)return;
        if(!background)setSyncing(true);
        const res=await supaFetchUserDataRows(uid);
        if(gen!==remotePullGenRef.current)return;
        if(!res?.data||!Array.isArray(res.data)){
          if(navigator.onLine)setSyncRecoverableError(true);
          if(!background)showToast("Sync failed — check your connection","error");
          return;
        }
        cancelPendingDebouncedSync();
        if(res.data.length===0){
          applyPulledUserDataRows([]);
          if(opts.preserveLocalOnEmpty===true){
            cloudLoadedRef.current=true;
          }else{
            resetUserState({clearOnboarding:true,cloudLoadedRefTarget:true});
          }
          setSyncRecoverableError(false);
          try{localStorage.setItem("fv_last_sync",String(Date.now()));}catch{}
          setCloudSyncMetaBump(b=>b+1);
          return;
        }
        applyPulledUserDataRows(res.data);
        const map={};
        res.data.forEach(row=>{map[row.key]=row.value;});
        const fullMap=buildAuthoritativeCloudMap(map);
        setSyncRecoverableError(false);
        applyUserDataSnapshot(fullMap,{
          setExpenses,setBills,setDebts,setBGoals,setSGoals,setCats,setTrades,
          setBalHist,setShifts,setRecurrings,setNotifs,setSettlements,setHhBudgets,
          setNwGoal,setSubDismissed,setAccounts,setIncome,setSettings,setCalColors,
          setDashConfig,setHousehold,setTradingAccount,setAppName,setGreetName,
          setProfCategory,setProfSub,setAccountRates,setOnboarded,
        },{cloudPull:true});
        const pulledSettings=fullMap.settings;
        if(
          pulledSettings&&
          typeof pulledSettings==="object"&&
          Object.prototype.hasOwnProperty.call(pulledSettings,"darkMode")&&
          typeof pulledSettings.darkMode==="boolean"
        ){
          setDarkMode(pulledSettings.darkMode);
        }
        cloudLoadedRef.current=true;
        const scope="fv6_"+uid.slice(0,8)+":";
        for(const key of SCOPED_USER_DATA_KEYS){
          if(!Object.prototype.hasOwnProperty.call(fullMap,key))continue;
          try{localStorage.setItem(scope+key,JSON.stringify(fullMap[key]));}catch{}
        }
        try{localStorage.setItem("fv_last_sync",String(Date.now()));}catch{}
        setCloudSyncMetaBump(b=>b+1);
      }catch(e){
        console.error("loadFromSupabase error",e);
        if(gen===remotePullGenRef.current&&navigator.onLine)setSyncRecoverableError(true);
        if(!background)showToast("Sync failed — check your connection","error");
      }finally{
        if(!background&&gen===remotePullGenRef.current)setSyncing(false);
        if(gen===remotePullGenRef.current)setTimeout(()=>{void flushPendingSync();},0);
      }
    })();
    if(background){
      backgroundPullInFlightRef.current=exec;
      exec.finally(()=>{
        if(backgroundPullInFlightRef.current===exec)backgroundPullInFlightRef.current=null;
      });
    }
    return exec;
  }
  const loadFromSupabaseRef=useRef(loadFromSupabase);
  loadFromSupabaseRef.current=loadFromSupabase;
  function handleSkip(){try{localStorage.setItem("fv_skip_auth","1");}catch{}setSkipAuth(true);}
  function resetUserState(opts={}){
    const clearOnboarding=opts.clearOnboarding!==false;
    setExpenses([]);setBills([]);setDebts([]);setSGoals([]);setBGoals([]);
    setTrades([]);setShifts([]);setBalHist([]);setNotifs([]);setRecurrings([]);
    setSettlements([]);setHhBudgets([]);setNwGoal(null);setSubDismissed([]);
    setAccounts(DEF_ACCOUNTS);
    setIncome(DEF_INCOME);
    setHousehold(DEF_HOUSEHOLD);
    setGreetName("");setProfCategory("healthcare");setProfSub("nurse_rn");
    setAppName("Trackfi");setCats(DEF_CATS);
    setSettings(DEF_SETTINGS);
    setTradingAccount({deposit:"",balance:""});
    setDashConfig(DEF_DASHCONFIG);
    setCalColors(DEF_CALCOLORS(C));
    setAccountRates({checking:0,savings:0,cushion:0,k401:0,roth_ira:0,brokerage:0,hsa:0,crypto:0});
    setIsDemoMode(false);setDarkMode(false);setHidden(false);
    try{localStorage.removeItem("fv_demo");}catch{}
    try{window._merchantCats={};}catch{}
    try{localStorage.removeItem("fv_account_rates");}catch{}
    try{localStorage.removeItem("fv_last_sync");}catch{}
    try{localStorage.removeItem("fv_bills_reset_month");}catch{}
    clearScopedUserDataCache();
    if(clearOnboarding){
      setOnboarded(false);
      try{localStorage.removeItem("fv_onboarded");}catch{}
    }
    cloudLoadedRef.current=opts.cloudLoadedRefTarget===true;
    clearUserDataRowVersions();
  }
  async function handleSignOut(){
    const syncOut=await flushPendingSync();
    if(authSession?.user?.id&&(syncOut?.error||syncOut?.conflict||syncOut?.skipped)){
      showToast("Sign out paused — export a backup or try again online after sync finishes.","error");
      return false;
    }
    // Unsubscribe push notifications so this device stops receiving alerts after sign-out
    try{
      if("serviceWorker" in navigator){
        navigator.serviceWorker.ready.then(reg=>{
          reg.pushManager.getSubscription().then(sub=>{
            if(sub){
              const uid=_getUserId();
              if(uid)supaFetch(`/rest/v1/push_subscriptions?user_id=eq.${encodeURIComponent(uid)}`,{method:"DELETE"});
              sub.unsubscribe();
            }
          });
        });
      }
    }catch{}
    if(authToken)supaFetch("/auth/v1/logout",{method:"POST"});
    clearUserDataRowVersions();
    resetUserState();
    setAuthSession(null);
    try{localStorage.removeItem("fv_session");}catch{}
    try{localStorage.removeItem("fv_skip_auth");}catch{}
    setSkipAuth(false);
    setSyncRecoverableError(false);
    setStorageQuotaBlocked(false);
    resetLocalStorageQuotaWarned();
    return true;
  }
  const[ready,setReady]=useState(false);
  useEffect(()=>{readyRef.current=ready;},[ready]);
  // True once we've successfully loaded at least one round of cloud data.
  // Prevents empty boot state from overwriting real Supabase data on other devices.
  const cloudLoadedRef=useRef(false);
  /** Prevents the monthly recap modal from opening twice in one session / before localStorage writes. */
  const monthlyRecapShownRef=useRef(null);
  /** Increments on each loadFromSupabase call so stale responses never overwrite newer state. */
  const remotePullGenRef=useRef(0);
  /** One coalesced background pull at a time (focus/visibility/online) to avoid UI thrash. */
  const backgroundPullInFlightRef=useRef(null);
  const[accounts,setAccounts]=useState(DEF_ACCOUNTS);
  const[income,setIncome]=useState(DEF_INCOME);
  const[expenses,setExpenses]=useState([]);
  const[bills,setBills]=useState([]);
  const[debts,setDebts]=useState([]);
  const[budgetGoals,setBGoals]=useState([]);
  const[savingsGoals,setSGoals]=useState([]);
  const[categories,setCats]=useState(DEF_CATS);
  const[accountRates,setAccountRates]=useState(()=>{try{const r=localStorage.getItem("fv_account_rates");return r?JSON.parse(r):{checking:0,savings:0,cushion:0,k401:0,roth_ira:0,brokerage:0,hsa:0,crypto:0};}catch{return{checking:0,savings:0,cushion:0,k401:0,roth_ira:0,brokerage:0,hsa:0,crypto:0};}});
  const[household,setHousehold]=useState(DEF_HOUSEHOLD);
  const[trades,setTrades]=useState([]);
  const[tradingAccount,setTradingAccount]=useState({deposit:"",balance:""});
  const[shifts,setShifts]=useState([]);
  const[balHist,setBalHist]=useState([]);
  const[notifs,setNotifs]=useState([]);
  const[calColors,setCalColors]=useState(()=>DEF_CALCOLORS(C));
  const[settings,setSettings]=useState(DEF_SETTINGS);
  const billsNeedingRecurringReshow=useMemo(()=>{
    if(!bills.length)return false;
    return bills.some(b=>{
      if(!b.paid||!b.recurring||b.recurring==="One-time")return false;
      if(isBillDueDateUnusable(b.dueDate))return true;
      const w=recurringReshowUpcomingWithinDays(b.recurring,settings);
      return dueIn(b.dueDate)<=w;
    });
  },[bills,settings]);
  const[monthlySummary,setMonthlySummary]=useState(null);
  const[dashConfig,setDashConfig]=useState(DEF_DASHCONFIG);
  const[appName,setAppName]=useState("Trackfi");
  const[greetName,setGreetName]=useState("");
  const[profCategory,setProfCategory]=useState("healthcare");
  const[profSub,setProfSub]=useState("nurse_rn");
  const[hidden,setHidden]=useState(false);
  const[heroIdx,setHeroIdx]=useState(0);
  const[pwaPrompt,setPwaPrompt]=useState(null);
  const[pwaInstalled,setPwaInstalled]=useState(()=>{try{return localStorage.getItem("fv_pwa_dismissed")==="1";}catch{return false;}});
  const[pwaUpdateReady,setPwaUpdateReady]=useState(false);
  useEffect(()=>{
    const handler=e=>{e.preventDefault();setPwaPrompt(e);};
    window.addEventListener("beforeinstallprompt",handler);
    window.addEventListener("appinstalled",()=>{setPwaInstalled(true);localStorage.setItem("fv_pwa_dismissed","1");});
    return()=>window.removeEventListener("beforeinstallprompt",handler);
  },[]);
  useEffect(()=>{
    const handler=()=>setPwaUpdateReady(true);
    window.addEventListener("trackfi:pwa-update-ready",handler);
    return()=>window.removeEventListener("trackfi:pwa-update-ready",handler);
  },[]);
  const[isOnline,setIsOnline]=useState(()=>navigator.onLine);
  const[syncRecoverableError,setSyncRecoverableError]=useState(false);
  useEffect(()=>{
    function onLeave(){if(_getUserId())flushPendingSync();}
    window.addEventListener("pagehide",onLeave);
    window.addEventListener("beforeunload",onLeave);
    return()=>{window.removeEventListener("pagehide",onLeave);window.removeEventListener("beforeunload",onLeave);};
  },[]);
  const[pinEnabled,setPinEnabled]=useState(()=>{try{return!!localStorage.getItem("fv_pin_hash");}catch{return false;}});
  const[locked,setLocked]=useState(()=>{try{return!!localStorage.getItem("fv_pin_hash");}catch{return false;}});
  const[onboarded,setOnboarded]=useState(()=>{try{return localStorage.getItem("fv_onboarded")==="1";}catch{return false;}});
  const[recurrings,setRecurrings]=useState(()=>{try{const scoped=localStorage.getItem(getScope()+"recurrings");if(scoped)return JSON.parse(scoped);const legacy=localStorage.getItem("fv_recurring");return legacy?JSON.parse(legacy):[];}catch{return[];}});
  const[settlements,setSettlements]=useState(()=>{try{const s=localStorage.getItem(getScope()+"settlements");if(s!==null)return JSON.parse(s);const l=localStorage.getItem("fv_settlements");return l?JSON.parse(l):[];}catch{return[];}});
  const[hhBudgets,setHhBudgets]=useState(()=>{try{const s=localStorage.getItem(getScope()+"hhBudgets");if(s!==null)return JSON.parse(s);const l=localStorage.getItem("fv_hh_budgets");return l?JSON.parse(l):[];}catch{return[];}});
  const[nwGoal,setNwGoal]=useState(()=>{try{const s=localStorage.getItem(getScope()+"nwGoal");if(s!==null){const p=JSON.parse(s);return p;}const l=localStorage.getItem("fv_nwgoal");return l?JSON.parse(l):null;}catch{return null;}});
  const[subDismissed,setSubDismissed]=useState(()=>{try{const s=localStorage.getItem(getScope()+"subDismissed");if(s!==null)return JSON.parse(s);const l=localStorage.getItem("fv_sub_dismissed");return l?JSON.parse(l):[];}catch{return[];}});
  const[modal,setModal]=useState(null);
  const[formError,setFormError]=useState("");
  const[showExport,setShowExport]=useState(false);
  const[showImport,setShowImport]=useState(false);
  const[paycheckDepCtx,setPaycheckDepCtx]=useState(null);
  const[form,setForm]=useState({});
  const[editItem,setEditItem]=useState(null);
  const[extraPayDebt,setExtraPayDebt]=useState(0);
  const[debtSavePing,setDebtSavePing]=useState(0);
  useEffect(()=>{
    if(!ready)return;
    const t=setTimeout(()=>setDebtSavePing(Date.now()),450);
    return()=>clearTimeout(t);
  },[debts,ready]);
  const[confirm,setConfirm]=useState(null);
  const[syncing,setSyncing]=useState(false);
  const[toast,setToast]=useState(null);
  const showToast=(msg,type='success',action=null)=>{setToast({msg,type,action});const dur=type==='error'?4000:type==='info'?3000:action?4000:2500;setTimeout(()=>setToast(t=>t?.msg===msg?null:t),dur);};
  const showUndoToast=(msg,undoFn)=>showToast(msg,"error",{label:"Undo",fn:undoFn});
  const showToastRef=useRef(showToast);
  showToastRef.current=showToast;

  useEffect(()=>{
    setLocalStorageQuotaHandler(()=>{
      setStorageQuotaBlocked(true);
      showToastRef.current(
        "Device storage is full — changes may not save. Export a backup from More → Export Data, then free browser storage.",
        "error",
        { label: "Open Export", fn: () => navToRef.current?.("export") }
      );
    });
    return()=>setLocalStorageQuotaHandler(null);
  },[]);

  useEffect(()=>{
    setLastSyncUiBumpHandler(()=>setCloudSyncMetaBump(b=>b+1));
    return()=>setLastSyncUiBumpHandler(null);
  },[]);

  useEffect(()=>{
    setUploadConflictHandler(()=>{
      const s=authSessionRef.current;
      if(s?.user?.id&&!isTrackfiDemoMode())void loadFromSupabaseRef.current?.(s,{background:true});
    });
    return()=>setUploadConflictHandler(null);
  },[]);

  /** Tab focus / visibility — flush local uploads (version-aware), then pull latest for smooth multi-device rotation. */
  useEffect(()=>{
    async function pullIfDue(){
      const sess=authSessionRef.current;
      if(!sess?.user?.id||isTrackfiDemoMode())return;
      if(!readyRef.current)return;
      const now=Date.now();
      if(now-lastVisibilityPullRef.current<4500)return;
      lastVisibilityPullRef.current=now;
      const { conflict }=await flushPendingSync();
      if(conflict)showToastRef.current("Another device had newer data — this tab was synced to match.","info");
      await loadFromSupabaseRef.current?.(sess,{background:true});
    }
    function onFocus(){
      if(!authSessionRef.current?.user?.id)return;
      void pullIfDue();
    }
    let bgTimestamp=0;
    function onVis(){
      if(document.hidden){
        bgTimestamp=Date.now();
      }else{
        void pullIfDue();
        if(bgTimestamp>0&&Date.now()-bgTimestamp>2*60*1000){
          setPinEnabled(pe=>{if(pe){setLocked(true);}return pe;});
        }
        bgTimestamp=0;
      }
    }
    function onPageShow(e){
      if(!authSessionRef.current?.user?.id||!e.persisted)return;
      void pullIfDue();
    }
    window.addEventListener("focus",onFocus);
    document.addEventListener("visibilitychange",onVis);
    window.addEventListener("pageshow",onPageShow);
    return()=>{
      window.removeEventListener("focus",onFocus);
      document.removeEventListener("visibilitychange",onVis);
      window.removeEventListener("pageshow",onPageShow);
    };
  },[]);

  useEffect(()=>{
    const goOnline=async()=>{
      setIsOnline(true);
      setSyncRecoverableError(false);
      showToastRef.current("Back online — syncing...","success");
      const { conflict }=await flushPendingSync();
      if(conflict)showToastRef.current("Another device had newer data — syncing this device to match.","info");
      const s=authSessionRef.current;
      if(s?.user?.id)await loadFromSupabaseRef.current?.(s,{background:true});
    };
    const goOffline=()=>{setIsOnline(false);};
    window.addEventListener("online",goOnline);
    window.addEventListener("offline",goOffline);
    return()=>{window.removeEventListener("online",goOnline);window.removeEventListener("offline",goOffline);};
  },[]);

  const[isDemoMode,setIsDemoMode]=useState(()=>{try{return localStorage.getItem("fv_demo")==="1";}catch{return false;}});
  const[demoBannerVisible,setDemoBannerVisible]=useState(true);
  // Auto-hide demo banner after 6 seconds, but it can be re-shown by scrolling back to top
  useEffect(()=>{if(!isDemoMode)return;const t=setTimeout(()=>setDemoBannerVisible(false),6000);return()=>clearTimeout(t);},[isDemoMode]);

  useEffect(()=>{
    let bootDone=false;
    const bootSafety=setTimeout(()=>{
      if(!bootDone){
        bootDone=true;
        cloudLoadedRef.current=true;
        setReady(true);
      }
    },12000);
    (async()=>{
      try{
        // Bulk fetch all keys in one query when logged in (1 read vs N).
        // Demo mode: never hydrate from cloud (avoids replacing sample data + contaminating pulls).
        const uid_boot=_getUserId();
        const _demoHydrateKeys=["accounts","income","expenses","bills","debts","bgoals","sgoals","cats","trades","taccount","settings","calColors","notifs","balHist","shifts","prof","profSub","dashConfig","appName","greetName","merchantCats","recurrings","settlements","hhBudgets","nwGoal","subDismissed","household","accountRates","onboarded"];
        let _bulkMap={};
        let cloudHydratedFromBulk=false;
        if(isTrackfiDemoMode()){
          const scope=getScope();
          for(const bare of _demoHydrateKeys){
            try{
              const raw=localStorage.getItem(scope+bare);
              if(raw!==null)_bulkMap[bare]=JSON.parse(raw);
            }catch{}
          }
        }else if(uid_boot){
          try{
            const bulk=await supaFetchUserDataRows(uid_boot);
            if(bulk?.error==null && Array.isArray(bulk.data) && bulk.data.length===0){
              applyPulledUserDataRows([]);
              resetUserState({ clearOnboarding: true, cloudLoadedRefTarget: true });
              return;
            }
            if(bulk?.error==null && Array.isArray(bulk.data) && bulk.data.length>0){
              applyPulledUserDataRows(bulk.data);
              const raw={};
              bulk.data.forEach(r=>{raw[r.key]=r.value;});
              const fullMap=buildAuthoritativeCloudMap(raw);
              applyUserDataSnapshot(fullMap,{
                setExpenses,setBills,setDebts,setBGoals,setSGoals,setCats,setTrades,
                setBalHist,setShifts,setRecurrings,setNotifs,setSettlements,setHhBudgets,
                setNwGoal,setSubDismissed,setAccounts,setIncome,setSettings,setCalColors,
                setDashConfig,setHousehold,setTradingAccount,setAppName,setGreetName,
                setProfCategory,setProfSub,setAccountRates,setOnboarded,
              },{cloudPull:true});
              const bootSettings=fullMap.settings;
              if(
                bootSettings&&
                typeof bootSettings==="object"&&
                Object.prototype.hasOwnProperty.call(bootSettings,"darkMode")&&
                typeof bootSettings.darkMode==="boolean"
              )setDarkMode(bootSettings.darkMode);
              const scope="fv6_"+uid_boot.slice(0,8)+":";
              for(const key of SCOPED_USER_DATA_KEYS){
                if(!Object.prototype.hasOwnProperty.call(fullMap,key))continue;
                try{localStorage.setItem(scope+key,JSON.stringify(fullMap[key]));}catch{}
              }
              cloudLoadedRef.current=true;
              cloudHydratedFromBulk=true;
            }
          }catch{}
        }
        if(cloudHydratedFromBulk){
          return;
        }
        async function _sg_boot(bare){
          if(_bulkMap[bare]!==undefined)return _bulkMap[bare];
          return sg("fv6:"+bare);
        }
        const keys=["fv6:accounts","fv6:income","fv6:expenses","fv6:bills","fv6:debts","fv6:bgoals","fv6:sgoals","fv6:cats","fv6:trades","fv6:taccount","fv6:settings","fv6:calColors","fv6:notifs","fv6:balHist","fv6:shifts","fv6:prof","fv6:profSub","fv6:dashConfig","fv6:appName","fv6:greetName","fv6:merchantCats","fv6:recurrings","fv6:settlements","fv6:hhBudgets","fv6:nwGoal","fv6:subDismissed"];
        const vals=await Promise.all(keys.map(k=>_sg_boot(k.replace("fv6:",""))));
        const bareKeys=["accounts","income","expenses","bills","debts","bgoals","sgoals","cats","trades","taccount","settings","calColors","notifs","balHist","shifts","prof","profSub","dashConfig","appName","greetName","merchantCats","recurrings","settlements","hhBudgets","nwGoal","subDismissed"];
        const bootMap={};
        bareKeys.forEach((k,i)=>{
          const v=vals[i];
          if(uid_boot&&(k in _bulkMap))bootMap[k]=_bulkMap[k];
          else{if(v===undefined||v===null)return;bootMap[k]=v;}
        });
        try{
          let hh=_bulkMap["household"];
          if(hh===undefined){const h=await sg("fv6:household");if(h)hh=h;}
          if(hh!=null&&typeof hh==="object")bootMap.household=hh;
        }catch{}
        try{
          const ar=_bulkMap["accountRates"]!==undefined?_bulkMap["accountRates"]:(await sg("fv6:accountRates"));
          if(ar&&typeof ar==="object")bootMap.accountRates=ar;
        }catch{}
        try{
          const ob=_bulkMap["onboarded"]!==undefined?_bulkMap["onboarded"]:(await sg("fv6:onboarded"));
          if(ob)bootMap.onboarded=ob;
        }catch{}
        applyUserDataSnapshot(bootMap,{
          setExpenses,setBills,setDebts,setBGoals,setSGoals,setCats,setTrades,
          setBalHist,setShifts,setRecurrings,setNotifs,setSettlements,setHhBudgets,
          setNwGoal,setSubDismissed,setAccounts,setIncome,setSettings,setCalColors,
          setDashConfig,setHousehold,setTradingAccount,setAppName,setGreetName,
          setProfCategory,setProfSub,setAccountRates,setOnboarded,
        },{bootDefaults:true});
        const bootSettings = bootMap.settings;
        if(
          bootSettings &&
          typeof bootSettings === "object" &&
          Object.prototype.hasOwnProperty.call(bootSettings,"darkMode") &&
          typeof bootSettings.darkMode === "boolean"
        ){
          setDarkMode(bootSettings.darkMode);
        }
        // After boot hydration: allow ss() effects. (Previously this only flipped for demo _bulkMap, which left
        // browser-only and signed-in localStorage paths stuck with cloudLoadedRef=false — nothing persisted.)
        cloudLoadedRef.current=true;
      }catch(e){console.error("Load error",e);}
      finally{
        clearTimeout(bootSafety);
        if(!bootDone){
          bootDone=true;
          setReady(true);
        }
      }
    })();
    return()=>clearTimeout(bootSafety);
  },[]);

  useEffect(()=>{
    if(!ready)return;
    const{action,tab:startTab}=_startupParams.current;
    if(!action&&!startTab)return;
    const validTabs=["home","bills","spend","chat","debt","savings","accounts","insights","health","cashflow","networthtrend","paycheck","household","recurring","calendar","shifts","categories"];
    if(startTab&&validTabs.includes(startTab))navTo(startTab);
    if(action==="expense")om("expense");
    else if(action==="bill")om("bill");
    _startupParams.current={};
    try{window.history.replaceState(null,"",window.location.pathname);}catch{}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[ready]);

  useEffect(()=>{if(!ready)return;if(_getUserId()&&!cloudLoadedRef.current&&!accountsHasPositiveBalance(accounts))return;ss("fv6:accounts",accounts);const tod=todayStr();setBalHist(prev=>{const last=prev[prev.length-1];if(last?.date===tod)return prev;const ds=last?Math.floor((new Date(tod)-new Date(last.date+"T00:00:00"))/86400000):999;if(ds<6)return prev;const _bh={date:tod,checking:totalCheckingBalance(accounts),savings:totalSavingsBalance(accounts),cushion:parseFloat(accounts.cushion||0),investments:parseFloat(accounts.investments||0),k401:parseFloat(accounts.k401||0),roth_ira:parseFloat(accounts.roth_ira||0),brokerage:parseFloat(accounts.brokerage||0),crypto:parseFloat(accounts.crypto||0),hsa:parseFloat(accounts.hsa||0),property:parseFloat(accounts.property||0),vehicles:parseFloat(accounts.vehicles||0),trading:parseFloat(tradingAccount?.balance||0)};_bh.total=Object.values(_bh).filter(v=>typeof v==="number").reduce((s,v)=>s+v,0);_bh.totalDebt=sumDebtsPrincipalAndAccrued(debts)+legacyCreditCardOwed(accounts,debts);return[...prev,_bh].slice(-104);});},[accounts,debts,tradingAccount,ready]);
  // Batched persistence — grouped by change frequency to reduce effect overhead
  useEffect(()=>{if(!ready)return;if(!balHist.length&&_getUserId()&&!cloudLoadedRef.current)return;ss("fv6:balHist",balHist);},[balHist,ready]);
  useEffect(()=>{if(!ready)return;if(!expenses.length&&_getUserId()&&!cloudLoadedRef.current)return;ss("fv6:expenses",expenses);},[expenses,ready]);
  useEffect(()=>{if(!ready)return;if(!bills.length&&_getUserId()&&!cloudLoadedRef.current)return;ss("fv6:bills",bills);},[bills,ready]);
  useEffect(()=>{if(!ready)return;if(!debts.length&&_getUserId()&&!cloudLoadedRef.current)return;ss("fv6:debts",debts);},[debts,ready]);
  useEffect(()=>{if(!ready)return;if(!trades.length&&_getUserId()&&!cloudLoadedRef.current)return;ss("fv6:trades",trades);},[trades,ready]);
  useEffect(()=>{if(!ready)return;if(!notifs.length&&_getUserId()&&!cloudLoadedRef.current)return;ss("fv6:notifs",notifs);},[notifs,ready]);
  useEffect(()=>{if(!ready)return;if(!shifts.length&&_getUserId()&&!cloudLoadedRef.current)return;ss("fv6:shifts",shifts);},[shifts,ready]);
  useEffect(()=>{if(!ready)return;if(!recurrings.length&&_getUserId()&&!cloudLoadedRef.current)return;ss("fv6:recurrings",recurrings);},[recurrings,ready]);
  useEffect(()=>{if(!ready)return;if(!settlements.length&&_getUserId()&&!cloudLoadedRef.current)return;ss("fv6:settlements",settlements);},[settlements,ready]);
  useEffect(()=>{if(!ready)return;if(!hhBudgets.length&&_getUserId()&&!cloudLoadedRef.current)return;ss("fv6:hhBudgets",hhBudgets);},[hhBudgets,ready]);
  useEffect(()=>{if(!ready)return;if(_getUserId()&&!cloudLoadedRef.current)return;ss("fv6:nwGoal",nwGoal);},[nwGoal,ready]);
  useEffect(()=>{if(!ready)return;if(!subDismissed.length&&_getUserId()&&!cloudLoadedRef.current)return;ss("fv6:subDismissed",subDismissed);},[subDismissed,ready]);
  // Settings & config (change infrequently)
  useEffect(()=>{
    if(!ready)return;
    if(_getUserId()&&!cloudLoadedRef.current)return;
    ss("fv6:income",income);ss("fv6:bgoals",budgetGoals);ss("fv6:sgoals",savingsGoals);
    ss("fv6:cats",categories);ss("fv6:settings",settings);
  },[income,budgetGoals,savingsGoals,categories,settings,ready]);
  // Profile & display (change rarely)
  useEffect(()=>{
    if(!ready)return;
    if(_getUserId()&&!cloudLoadedRef.current)return;
    ss("fv6:prof",profCategory);ss("fv6:profSub",profSub);
    ss("fv6:appName",appName);ss("fv6:greetName",greetName);
    ss("fv6:dashConfig",dashConfig);ss("fv6:household",household);
  },[profCategory,profSub,appName,greetName,dashConfig,household,ready]);
  useEffect(()=>{try{localStorage.setItem("fv_account_rates",JSON.stringify(accountRates));}catch{};if(ready)ss("fv6:accountRates",accountRates);},[accountRates,ready]);
  // Recurring bills marked paid stay in history until the next due is within the cadence-specific window — then they return to Upcoming (unpaid for the new cycle).
  // One-time paid bills stay paid until the user manually marks them unpaid, so balances cannot be double-applied by an automatic reset.
  useEffect(()=>{
    if(!ready||!bills.length||!billsNeedingRecurringReshow)return;
    setBills(p=>p.map(b=>{
      if(!b.paid||!b.recurring||b.recurring==="One-time")return b;
      const cleared={...b,paid:false,paidDate:undefined,loanPrincipalApplied:undefined,loanPrevInterestAsOfDate:undefined,loanPrevAccruedInterest:undefined};
      if(isBillDueDateUnusable(b.dueDate))return cleared;
      const w=recurringReshowUpcomingWithinDays(b.recurring,settings);
      if(dueIn(b.dueDate)>w)return b;
      return cleared;
    }));
  },[ready,billsNeedingRecurringReshow,settings]);
  /** Prevents duplicate system notifications: SW showNotification is async, so two effect runs can both schedule OS before the in-app dedupe row exists. */
  const osNotifCooldownRef=useRef(new Map());
  const pushNotif=(id,title,body,type)=>{
    setNotifs(p=>{
      if(p.find(n=>n.id===id))return p;
      const row={id,title,body,type,time:Date.now(),read:false};
      if(notifSupported()&&notifPermission()==="granted"){
        const now=Date.now();
        const last=osNotifCooldownRef.current.get(id);
        const skipOsCooldown=last!=null&&now-last<12000;
        // Don't buzz the device while the user is already looking at the app — bell list still updates.
        const inForeground=typeof document!=="undefined"&&document.visibilityState==="visible";
        const shouldShowOs=!skipOsCooldown&&!inForeground;
        if(shouldShowOs){
          osNotifCooldownRef.current.set(id,now);
          const opts={body,icon:"/icons/icon-192.png",badge:"/icons/icon-192.png",tag:String(id),renotify:false,data:{url:"/"}};
          try{
            if(navigator.serviceWorker?.controller){
              navigator.serviceWorker.ready.then(reg=>reg.showNotification(title,opts)).catch(()=>{
                new window.Notification(title,opts);
              });
            } else {
              new window.Notification(title,opts);
            }
          }catch(e){}
        }
      }
      return[row,...p.slice(0,49)];
    });
  };
  // On load: if permission already granted and user is logged in, ensure subscription is saved
  useEffect(()=>{
    if(!authSession?.access_token||!VAPID_PUBLIC_KEY)return;
    if(notifPermission()!=="granted")return;
    if(!("serviceWorker"in navigator)||!("PushManager"in window))return;
    (async()=>{
      try{
        const reg=await navigator.serviceWorker.ready;
        const b64=VAPID_PUBLIC_KEY.replace(/-/g,"+").replace(/_/g,"/");
        const raw=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
        const existing=await reg.pushManager.getSubscription();
        const sub=existing||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:raw});
        await supaFetch("/rest/v1/push_subscriptions",{
          method:"POST",
          headers:{"Prefer":"resolution=merge-duplicates"},
          body:JSON.stringify({user_id:authSession.user.id,subscription:sub.toJSON()})
        });
      }catch{}
    })();
  },[authSession?.access_token]);
  const requestNotifPermission=async()=>{
    if(!notifSupported())return"unsupported";
    if(notifPermission()==="default"){
      try{await window.Notification.requestPermission();}catch{}
    }
    if(notifPermission()!=="granted")return"denied";
    // Subscribe this device to push and save to Supabase
    try{
      if(VAPID_PUBLIC_KEY&&authSession?.access_token&&"serviceWorker"in navigator&&"PushManager"in window){
        const reg=await navigator.serviceWorker.ready;
        // Convert VAPID public key from base64url to Uint8Array
        const b64=VAPID_PUBLIC_KEY.replace(/-/g,"+").replace(/_/g,"/");
        const raw=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
        const existing=await reg.pushManager.getSubscription();
        const sub=existing||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:raw});
        await supaFetch("/rest/v1/push_subscriptions",{
          method:"POST",
          headers:{"Prefer":"resolution=merge-duplicates"},
          body:JSON.stringify({user_id:authSession.user.id,subscription:sub.toJSON()})
        });
      }
    }catch(e){}
    return"granted";
  };
  // Monthly recap: once per calendar month per user; gate before setState so rapid re-runs / sync flicker can't reopen it
  useEffect(()=>{
    if(!ready)return;
    const now_ms=new Date();
    const curMonth=now_ms.getFullYear()+"-"+String(now_ms.getMonth()+1).padStart(2,"0");
    const uid=_getUserId()||"local";
    const seenKey="fv_monthly_recap_"+uid;
    try{
      if(monthlyRecapShownRef.current===curMonth)return;
      const seen=localStorage.getItem(seenKey);
      if(seen===curMonth)return;
      const lastMs=new Date(now_ms.getFullYear(),now_ms.getMonth()-1,1);
      const lastKey=lastMs.getFullYear()+"-"+String(lastMs.getMonth()+1).padStart(2,"0");
      const lastExp=expenses.filter(e=>e.date?.startsWith(lastKey));
      if(lastExp.length<2)return;
      const lastTotal=lastExp.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
      const prevMs=new Date(now_ms.getFullYear(),now_ms.getMonth()-2,1);
      const prevKey=prevMs.getFullYear()+"-"+String(prevMs.getMonth()+1).padStart(2,"0");
      const prevTotal=expenses.filter(e=>e.date?.startsWith(prevKey)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
      const catMap=lastExp.reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount)||0);return a},{});
      const topCat=Object.entries(catMap).sort((a,b)=>b[1]-a[1])[0];
      const pf=income.payFrequency||"Biweekly";
      const pm=pf==="Weekly"?(52/12):pf==="Twice Monthly"?2:pf==="Monthly"?1:(26/12);
      const lastInc=(parseFloat(income.primary||0)*pm)+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
      const savRate=lastInc>0?Math.max(0,(lastInc-lastTotal)/lastInc*100):0;
      monthlyRecapShownRef.current=curMonth;
      try{localStorage.setItem(seenKey,curMonth);}catch{}
      setMonthlySummary({month:FULL_MOS[lastMs.getMonth()],total:lastTotal,prevTotal,topCat:topCat?.[0],topAmt:topCat?.[1],txnCount:lastExp.length,savRate});
    }catch(e){}
  },[ready,expenses,income]);
  useEffect(()=>{if(ready)ss("fv6:calColors",calColors);},[calColors,ready]);
  useEffect(()=>{if(ready)ss("fv6:taccount",tradingAccount);},[tradingAccount,ready]);
  useEffect(()=>{try{localStorage.setItem("fv_dark",darkMode?"1":"0");}catch{};document.body.classList.toggle("dark-mode",!!darkMode);},[darkMode]);

  // paycheckMultiplier converts per-paycheck primary income → monthly
  const paycheckMultiplier=income.payFrequency==="Weekly"?(52/12):income.payFrequency==="Twice Monthly"?2:income.payFrequency==="Monthly"?1:(26/12);
  // monthlyIncome = what actually comes in per month (all sources)
  const monthlyIncome=useMemo(()=>(parseFloat(income.primary||0)*paycheckMultiplier)+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0)),[income,paycheckMultiplier]);
  // totalIncome = alias for monthlyIncome (keeps all existing references working)
  const totalIncome=monthlyIncome;
  const totalAssets=useMemo(()=>totalAppAssets(accounts,tradingAccount),[accounts,tradingAccount]);
  const totalExp=useMemo(()=>expenses.reduce((s,e)=>s+(parseFloat(e.amount)||0),0),[expenses]);
  const totalDebt=useMemo(()=>sumDebtsPrincipalAndAccrued(debts)+legacyCreditCardOwed(accounts,debts),[debts,accounts]);
  const thisMonthExp=useMemo(()=>{const n=new Date();const ms=n.getFullYear()+"-"+String(n.getMonth()+1).padStart(2,"0");return expenses.filter(e=>e.date?.startsWith(ms)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);},[expenses]);
  const cashflow=totalIncome-thisMonthExp;
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
    if(!crossed.length)return;
    const uid=_getUserId()||"local";
    const key="fv_nw_celebrated_"+uid;
    let celebrated=new Set();
    try{celebrated=new Set(JSON.parse(localStorage.getItem(key)||"[]"));}catch{}
    crossed.forEach(m=>{
      if(celebrated.has(m))return;
      celebrated.add(m);
      const label=m>=1000000?"$1M 🦄":m>=500000?"$500K":"$"+m.toLocaleString();
      if(settings.notifMilestones!==false){pushNotif("nw_"+m,"🎉 Net Worth Milestone!","You crossed "+label+" net worth — incredible!","success");showToast("🎉 "+label+" net worth milestone!","success");launchConfetti();}
      try{localStorage.setItem(key,JSON.stringify([...celebrated]));}catch{}
    });
  },[totalAssets,totalDebt,ready,settings.notifMilestones]);

  const overdue=useMemo(()=>bills.filter(b=>!b.paid&&dueIn(b.dueDate)<0),[bills]);
  const dueSoon=useMemo(()=>bills.filter(b=>!b.paid&&dueIn(b.dueDate)>=0&&dueIn(b.dueDate)<=7),[bills]);
  const billsSoonAmt=useMemo(()=>dueSoon.reduce((s,b)=>s+(parseFloat(b.amount)||0),0),[dueSoon]);
  const burnRate=dayOfMonth()>0?thisMonthExp/dayOfMonth():0;
  const projected=burnRate*daysInMonth();
  const stsCalc=useMemo(
    ()=>computeSafeToSpend(accounts,income,bills,expenses,budgetGoals),
    [accounts,income,bills,expenses,budgetGoals]
  );
  const sts=stsCalc.sts;
  const nextPayDate=stsCalc.nextPayDate;
  const nextPayStr=stsCalc.nextPayStr;
  const payFreq=stsCalc.payFreq;
  const payPeriodDays=stsCalc.payPeriodDays;
  const burnRateChecking=stsCalc.burnRateChecking;
  // payPerPeriod = what lands in your account each paycheck (primary only)  
  const payPerPeriod=parseFloat(income.primary||0);
  const liquid=(totalSavingsBalance(accounts))+(parseFloat(accounts.cushion||0));
  const savingsRate=totalIncome>0?Math.min(100,Math.max(0,cashflow/totalIncome*100)):0;
  const spendingStreak=useMemo(()=>{
    if(expenses.length<3)return 0;
    const dailyAvgBase=burnRateChecking||50;
    let streak=0;
    const today2=new Date();
    for(let i=0;i<30;i++){
      const d=new Date(today2);d.setDate(d.getDate()-i);
      const ds=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
      const dayTotal=dayCheckingSpend(expenses,ds);
      if(i===0&&dayTotal===0){continue;}
      if(dayTotal<dailyAvgBase){streak++;}else{break;}
    }
    return streak;
  },[expenses,burnRateChecking]);
  const unreadNotifs=useMemo(()=>notifs.filter(n=>!n.read).length,[notifs]);
  const paycheckNudge=useMemo(()=>paycheckPeriodNeedsHandling(income,settings,todayStr()),[income,settings]);
  const openPaycheckDeposit=useCallback(()=>{
    const anchor=String(income.lastPayDate||"").trim();
    if(!anchor){showToast("Set your pay schedule in Paycheck Planner first.","error");return;}
    const t=todayStr();
    const due=getLatestScheduledPaydayOnOrBefore(anchor,income.payFrequency||"Biweekly",t)||t;
    setPaycheckDepCtx({dueDate:due});
  },[income.lastPayDate,income.payFrequency,showToast]);

  useEffect(()=>{
    if(!ready)return;
    // Clean up stale bill notifications first — remove any notif for a bill
    // that no longer exists or has been marked as paid
    setNotifs(prev=>{
      const billIds=new Set(bills.filter(b=>!b.paid).map(b=>String(b.id)));
      return prev.filter(n=>{
        if(n.id.startsWith('ov_')||n.id.startsWith('due3_')){
          const billId=n.id.replace('ov_','').replace('due3_','');
          return billIds.has(billId);
        }
        return true; // keep all other notification types
      });
    });
    bills.forEach(b=>{
      if(b.paid)return;
      const d=dueIn(b.dueDate);
      if(settings.notifBills!==false){
        if(d<0){
          // Bill is now overdue — remove any stale "due soon" notification for it
          setNotifs(prev=>prev.filter(n=>n.id!=='due3_'+b.id));
          pushNotif('ov_'+b.id,'🚨 Overdue: '+b.name,fmt(b.amount)+' was due '+Math.abs(d)+'d ago','danger');
        } else if(d<=3){
          pushNotif('due3_'+b.id,'⚠️ Due soon: '+b.name,fmt(b.amount)+' due in '+d+' day'+(d!==1?'s':''),'warning');
        }
      }
    });
    const _now=new Date();const _ms=_now.getFullYear()+'-'+String(_now.getMonth()+1).padStart(2,'0');
    if(settings.notifBudget!==false&&Array.isArray(budgetGoals)&&Array.isArray(expenses))budgetGoals.forEach(g=>{if(!g.category||!g.limit)return;const spent=expenses.filter(e=>e.category===g.category&&e.date?.startsWith(_ms)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);const pct=parseFloat(g.limit)>0?(spent/parseFloat(g.limit)*100):0;if(pct>=100)pushNotif('bud_over_'+g.id,'🔴 Over budget: '+g.category,'Spent '+fmt(spent)+' of '+fmt(g.limit),'danger');else if(pct>=80)pushNotif('bud_warn_'+g.id,'🟡 '+Math.round(pct)+'% used: '+g.category,fmt(Math.max(0,parseFloat(g.limit)-spent))+' remaining','warning');});
    if(settings.notifSavings!==false&&Array.isArray(savingsGoals))savingsGoals.forEach(g=>{const pct=parseFloat(g.target||1)>0?(parseFloat(g.saved||0)/parseFloat(g.target))*100:0;if(pct>=100){pushNotif('goal_done_'+g.id,'🎉 Goal complete: '+g.name,'You hit your '+fmt(g.target)+' target!','success');const gCk="fv_goal_confetti_"+(_getUserId()||"local")+"_"+g.id;if(!localStorage.getItem(gCk)){try{localStorage.setItem(gCk,"1");}catch{}launchConfetti();}}else if(pct>=75)pushNotif('goal_75_'+g.id,'🎯 75% reached: '+g.name,fmt(Math.max(0,parseFloat(g.target)-parseFloat(g.saved||0)))+' left to go','info');});
    // Payday reminder: notify when payday is tomorrow or today
    const payReminderKey="payremind_"+nextPayStr;
    const daysUntil=Math.ceil((nextPayDate-new Date())/86400000);
    if(settings.notifPayday!==false&&daysUntil<=1&&daysUntil>=0&&parseFloat(income.primary||0)>0){
      pushNotif(payReminderKey,daysUntil===0?"💰 Payday is Today!":"💰 Payday Tomorrow!",
        fmt(parseFloat(income.primary||0))+" expected · "+nextPayDate.toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"}),
        "success");
    }
  },[ready,bills,budgetGoals,expenses,settings,savingsGoals,notifs.length,income,accounts,nextPayStr]);
  const detectedSubs=useMemo(()=>{
    if(expenses.length<2)return[];
    // Only look at expenses from the last 6 months to avoid showing cancelled subs
    const _sixMoAgo=new Date();_sixMoAgo.setMonth(_sixMoAgo.getMonth()-6);
    const _sixMoStr=_sixMoAgo.getFullYear()+"-"+String(_sixMoAgo.getMonth()+1).padStart(2,"0")+"-"+String(_sixMoAgo.getDate()).padStart(2,"0");
    const recentExp=expenses.filter(e=>e.date&&e.date>=_sixMoStr);
    if(recentExp.length<2)return[];
    const nameMap={};
    recentExp.forEach(e=>{const key=e.name?.toLowerCase().trim();if(!key)return;if(!nameMap[key])nameMap[key]=[];nameMap[key].push(e);});
    const subs=[];
    Object.entries(nameMap).forEach(([name,exps])=>{
      if(exps.length<2)return;
      const sorted=[...exps].sort((a,b)=>a.date?.localeCompare(b.date));
      const amounts=exps.map(e=>parseFloat(e.amount)||0);
      const avgAmt=amounts.reduce((s,a)=>s+a,0)/amounts.length;
      if(!amounts.every(a=>Math.abs(a-avgAmt)<avgAmt*0.15))return;
      const gaps=[];
      for(let i=1;i<sorted.length;i++){gaps.push(Math.round((new Date(sorted[i].date+"T00:00:00")-new Date(sorted[i-1].date+"T00:00:00"))/(1000*60*60*24)));}
      const avgGap=gaps.reduce((s,g)=>s+g,0)/gaps.length;
      let interval=null;
      if(avgGap>=25&&avgGap<=35){interval="Monthly";}else if(avgGap>=6&&avgGap<=8){interval="Weekly";}else if(avgGap>=350&&avgGap<=380){interval="Annual";}
      if(!interval)return;
      // Must have a charge within the last 45 days to still be "active"
      const lastDate=sorted[sorted.length-1].date;
      const daysSinceLast=Math.round((new Date()-new Date(lastDate+"T00:00:00"))/(1000*60*60*24));
      if(interval==="Monthly"&&daysSinceLast>45)return;
      if(interval==="Weekly"&&daysSinceLast>14)return;
      subs.push({name:exps[0].name,amount:avgAmt.toFixed(2),interval,occurrences:exps.length,lastDate,category:exps[0].category});
    });
    return subs.sort((a,b)=>parseFloat(b.amount)-parseFloat(a.amount));
  },[expenses]);

  const om=(t,d={})=>{setModal(t);setForm(d);setFormError("");};
  const cl=()=>{setModal(null);setForm({});setFormError("");};
  const ff=(k,v)=>{setFormError("");setForm(p=>({...p,[k]:v}));}
  const applySpend=useCallback((paidFrom,amount,creditDebtId,bankAccountId)=>{
    const pf=normalizePaidFrom(paidFrom);
    const a=parseFloat(amount)||0;
    if(a<=0||pf==="none")return;
    if(pf==="credit"&&creditDebtId!=null&&creditDebtId!==""){
      setDebts(p=>p.map(d=>String(d.id)===String(creditDebtId)?{...d,balance:String(round2(parseFloat(d.balance||0)+a))}:d));
      return;
    }
    if(pf==="checking"&&bankAccountId!=null&&bankAccountId!==""){
      setAccounts(p=>{
        const ca=[...(p.cashAccounts||[])];
        const i=ca.findIndex(x=>String(x.id)===String(bankAccountId)&&x.kind==="checking");
        if(i<0)return p;
        const row=ca[i];
        ca[i]={...row,balance:String(round2(parseFloat(row.balance||0)-a))};
        return{...p,cashAccounts:ca};
      });
      return;
    }
    if(pf==="savings"&&bankAccountId!=null&&bankAccountId!==""){
      setAccounts(p=>{
        const ca=[...(p.cashAccounts||[])];
        const i=ca.findIndex(x=>String(x.id)===String(bankAccountId)&&x.kind==="savings");
        if(i<0)return p;
        const row=ca[i];
        ca[i]={...row,balance:String(round2(parseFloat(row.balance||0)-a))};
        return{...p,cashAccounts:ca};
      });
      return;
    }
    if((pf==="checking"||pf==="savings")&&hasCashSubaccounts(accounts))return;
    setAccounts(p=>{
      const n={...p};
      if(pf==="checking")n.checking=String(round2(parseFloat(p.checking||0)-a));
      else if(pf==="credit")n.credit_card=String(round2(parseFloat(p.credit_card||0)+a));
      else if(pf==="savings")n.savings=String(round2(parseFloat(p.savings||0)-a));
      return n;
    });
  },[]);
  const applyRefund=useCallback((paidFrom,amount,creditDebtId,bankAccountId)=>{
    const pf=normalizePaidFrom(paidFrom);
    const a=parseFloat(amount)||0;
    if(a<=0||pf==="none")return;
    if(pf==="credit"&&creditDebtId!=null&&creditDebtId!==""){
      setDebts(p=>p.map(d=>String(d.id)===String(creditDebtId)?{...d,balance:String(round2(Math.max(0,parseFloat(d.balance||0)-a)))}:d));
      return;
    }
    if(pf==="checking"&&bankAccountId!=null&&bankAccountId!==""){
      setAccounts(p=>{
        const ca=[...(p.cashAccounts||[])];
        const i=ca.findIndex(x=>String(x.id)===String(bankAccountId)&&x.kind==="checking");
        if(i<0)return p;
        const row=ca[i];
        ca[i]={...row,balance:String(round2(parseFloat(row.balance||0)+a))};
        return{...p,cashAccounts:ca};
      });
      return;
    }
    if(pf==="savings"&&bankAccountId!=null&&bankAccountId!==""){
      setAccounts(p=>{
        const ca=[...(p.cashAccounts||[])];
        const i=ca.findIndex(x=>String(x.id)===String(bankAccountId)&&x.kind==="savings");
        if(i<0)return p;
        const row=ca[i];
        ca[i]={...row,balance:String(round2(parseFloat(row.balance||0)+a))};
        return{...p,cashAccounts:ca};
      });
      return;
    }
    if((pf==="checking"||pf==="savings")&&hasCashSubaccounts(accounts))return;
    setAccounts(p=>{
      const n={...p};
      if(pf==="checking")n.checking=String(round2(parseFloat(p.checking||0)+a));
      else if(pf==="credit")n.credit_card=String(round2(Math.max(0,parseFloat(p.credit_card||0)-a)));
      else if(pf==="savings")n.savings=String(round2(parseFloat(p.savings||0)+a));
      return n;
    });
  },[]);
  function reversePaidBillForDelete(bill){
    if(!bill?.paid)return{reversed:false};
    const bamt=parseFloat(bill.amount)||0;
    const bpf=normalizePaidFrom(bill.paidFrom);
    const r=resolveBillSpendIds(bill,accounts,debts,settings);
    const canRefund=!!r.ok;
    if(canRefund&&bamt)applyRefund(bpf,bamt,r.cid,r.bid);
    const addBack=parseFloat(bill.loanPrincipalApplied)||0;
    if(bill.linkedDebtId&&(addBack>0||bill.loanPrevInterestAsOfDate||bill.loanPrevAccruedInterest!==undefined))setDebts(p=>p.map(d=>{
      if(String(d.id)!==String(bill.linkedDebtId))return d;
      const o={...d};
      if(addBack>0)o.balance=String(round2(parseFloat(d.balance||0)+addBack));
      if(bill.loanPrevInterestAsOfDate!=null&&bill.loanPrevInterestAsOfDate!=="")o.loanInterestAsOfDate=bill.loanPrevInterestAsOfDate;
      if(bill.loanPrevAccruedInterest!==undefined){
        const vc=parseFloat(bill.loanPrevAccruedInterest)||0;
        if(vc>0.001)o.loanAccruedInterest=String(round2(vc));
        else delete o.loanAccruedInterest;
      }
      return o;
    }));
    return{reversed:canRefund};
  }
  function saveBillEditWithBalanceAdjustment(before,u){
    const ld=u.linkedDebtId&&String(u.linkedDebtId).trim()!==""?String(u.linkedDebtId):undefined;
    const next={...before,...u,linkedDebtId:ld};
    if(!before.paid){
      setBills(p=>p.map(x=>x.id===before.id?next:x));
      showToast("✓ Bill updated");
      setEditItem(null);
      return true;
    }
    const oldPf=normalizePaidFrom(before.paidFrom);
    const newPf=normalizePaidFrom(next.paidFrom);
    const financialChanged=
      round2(parseFloat(before.amount)||0)!==round2(parseFloat(next.amount)||0)||
      oldPf!==newPf||
      String(before.creditDebtId||"")!==String(next.creditDebtId||"")||
      String(before.bankAccountId||"")!==String(next.bankAccountId||"")||
      String(before.linkedDebtId||"")!==String(next.linkedDebtId||"");
    if(before.linkedDebtId&&financialChanged){
      showToast("Mark this loan payment unpaid before changing amount, pay-from, or linked loan.","error");
      return false;
    }
    if(financialChanged){
      const oldR=resolveBillSpendIds(before,accounts,debts,settings);
      if(!oldR.ok){showToast("Can't update paid bill: original pay-from no longer resolves. Mark it unpaid or fix Accounts/Debt first.","error");return false;}
      const newR=resolveBillSpendIds(next,accounts,debts,settings);
      if(!newR.ok){showToast(newR.msg,"error");return false;}
      const oldAmt=parseFloat(before.amount)||0;
      const newAmt=parseFloat(next.amount)||0;
      if(oldAmt)applyRefund(oldPf,oldAmt,oldR.cid,oldR.bid);
      if(newAmt)applySpend(newPf,newAmt,newR.cid,newR.bid);
    }
    setBills(p=>p.map(x=>x.id===before.id?next:x));
    showToast(financialChanged?"✓ Paid bill updated — balances adjusted":"✓ Bill updated");
    setEditItem(null);
    return true;
  }
  function deleteDebtSafely(debt){
    const did=String(debt?.id);
    const cardExpenseRefs=expenses.filter(e=>String(e.creditDebtId||"")===did);
    const cardBillRefs=bills.filter(b=>String(b.creditDebtId||"")===did);
    const paidLinkedBills=bills.filter(b=>String(b.linkedDebtId||"")===did&&b.paid);
    if(cardExpenseRefs.length){
      showToast("Move or delete "+cardExpenseRefs.length+" expense"+(cardExpenseRefs.length!==1?"s":"")+" from this card before deleting it.","error");
      return false;
    }
    if(cardBillRefs.length){
      showToast("Edit or delete "+cardBillRefs.length+" bill"+(cardBillRefs.length!==1?"s":"")+" using this card before deleting it.","error");
      return false;
    }
    if(paidLinkedBills.length){
      showToast("Mark linked paid bill"+(paidLinkedBills.length!==1?"s":"")+" unpaid or delete them before deleting this loan.","error");
      return false;
    }
    setDebts(p=>p.filter(x=>String(x.id)!==did));
    setBills(p=>p.filter(x=>String(x.linkedDebtId)!==did));
    setEditItem(null);
    setConfirm(null);
    return true;
  }

  // ── THE FIX: submit function ──────────────────────────────────────────────
  function submit(){
    if(modal==="expense"){
      if(!form.name){setFormError("Please enter a name.");return;}
      if(!form.amount){setFormError("Please enter an amount.");return;}
      const amt=parseFloat(form.amount)||0;
      if(amt<=0){setFormError("Amount must be greater than $0.");return;}
      const now60=Date.now()-60000;
      const isDupe=expenses.some(e=>e.name?.toLowerCase()===form.name.toLowerCase()&&parseFloat(e.amount)===amt&&e.id>now60);
      if(isDupe&&!form.forceAdd){ff("forceAdd",true);setFormError("Already logged just now — tap Save again to add anyway.");return;}
      const _pf=normalizePaidFrom(form.paidFrom||settings.defaultExpensePaidFrom);
      const _cards=cardDebtsList(debts);
      const _ch=cashAccountsByKind(accounts,"checking");
      const _sv=cashAccountsByKind(accounts,"savings");
      const _bankCh=String(form.bankAccountId||pickDefaultBankAccountId("checking",accounts,settings)||"");
      const _bankSv=String(form.bankAccountId||pickDefaultBankAccountId("savings",accounts,settings)||"");
      let _cid="";
      if(_pf==="credit"){
        if(!_cards.length){setFormError("Add a credit card under Debt (type: Credit card), then pick which card.");return;}
        _cid=String(form.creditDebtId||"").trim()||pickDefaultCreditDebtId(settings,debts);
        if(!_cid||!_cards.some(c=>String(c.id)===String(_cid))){setFormError("Select which credit card, or set a default under Settings \u2192 Defaults.");return;}
      }
      const _expCashErr=validateCashSpendPrerequisites(_pf,form.bankAccountId,accounts,settings);
      if(_expCashErr){setFormError(_expCashErr);return;}
      let _bid="";
      if(_pf==="checking"){if(_ch.length>=2)_bid=_bankCh;else if(_ch.length===1)_bid=String(_ch[0].id);}
      else if(_pf==="savings"){if(_sv.length>=2)_bid=_bankSv;else if(_sv.length===1)_bid=String(_sv[0].id);}
      setExpenses(p=>[...p,{id:Date.now(),name:form.name,amount:String(amt),category:form.category||"Misc",date:form.date||todayStr(),notes:form.notes||"",tags:[],owner:form.owner||"shared",paidFrom:_pf,...(_cid?{creditDebtId:_cid}:{}),...(_bid?{bankAccountId:_bid}:{})}]);applySpend(_pf,amt,_cid||undefined,_bid||undefined);try{const mc=window._merchantCats||{};mc[form.name.toLowerCase().trim()]=form.category||"Misc";window._merchantCats=mc;ss("fv6:merchantCats",mc);}catch{}
      showToast("✓ "+form.name+" — "+fmt(amt));try{navigator.vibrate&&navigator.vibrate(40);}catch{}
      cl();
    }else if(modal==="bill"){
      if(!form.name){setFormError("Please enter a bill name.");return;}
      if(!form.amount){setFormError("Please enter an amount.");return;}
      const billAmt=parseFloat(form.amount)||0;
      if(billAmt<=0){setFormError("Amount must be greater than $0.");return;}
      const _bpf=normalizePaidFrom(form.paidFrom||settings.defaultBillPaidFrom);
      const _bc=cardDebtsList(debts);
      const _bch=cashAccountsByKind(accounts,"checking");
      const _bsv=cashAccountsByKind(accounts,"savings");
      const _bbankCh=String(form.bankAccountId||pickDefaultBankAccountId("checking",accounts,settings)||"");
      const _bbankSv=String(form.bankAccountId||pickDefaultBankAccountId("savings",accounts,settings)||"");
      let _bcid="";
      if(_bpf==="credit"){
        if(!_bc.length){setFormError("Add a credit card under Debt (type: Credit card), then pick which card.");return;}
        _bcid=String(form.creditDebtId||"").trim()||pickDefaultCreditDebtId(settings,debts);
        if(!_bcid||!_bc.some(c=>String(c.id)===String(_bcid))){setFormError("Select which credit card pays this bill, or set a default under Settings \u2192 Defaults.");return;}
      }
      const _billCashErr=validateCashSpendPrerequisites(_bpf,form.bankAccountId,accounts,settings);
      if(_billCashErr){setFormError(_billCashErr);return;}
      let _bbid="";
      if(_bpf==="checking"){if(_bch.length>=2)_bbid=_bbankCh;else if(_bch.length===1)_bbid=String(_bch[0].id);}
      else if(_bpf==="savings"){if(_bsv.length>=2)_bbid=_bbankSv;else if(_bsv.length===1)_bbid=String(_bsv[0].id);}
      setBills(p=>[...p,{id:Date.now(),name:form.name,amount:String(billAmt),dueDate:form.dueDate||todayStr(),recurring:form.recurring||"Monthly",paid:false,autoPay:!!form.autoPay,paidBy:form.paidBy||"me",paidFrom:_bpf,...(_bcid?{creditDebtId:_bcid}:{}),...(_bbid?{bankAccountId:_bbid}:{})}]);
      showToast("✓ "+form.name+" bill added");try{navigator.vibrate&&navigator.vibrate(40);}catch{}
      cl();
    }else if(modal==="debt"){
      if(!form.name){setFormError("Please enter a name.");return;}
      if(!form.balance){setFormError("Please enter the current balance.");return;}
      const _dk=form.debtKind==="credit_card"?"credit_card":"loan";
      const _debtId=Date.now();
      const _minP=parseFloat(form.minPayment||0);
      const _addBill=_dk==="loan"&&_minP>0&&form.addLoanBill!==false;
      if(_addBill){
        let _bpf=normalizePaidFrom(form.billPaidFrom||settings.defaultBillPaidFrom||"checking");
        if(_bpf==="credit")_bpf="checking";
        const _bch=cashAccountsByKind(accounts,"checking");
        const _bsv=cashAccountsByKind(accounts,"savings");
        const _bbankCh=String(form.billBankAccountId||pickDefaultBankAccountId("checking",accounts,settings)||"");
        const _bbankSv=String(form.billBankAccountId||pickDefaultBankAccountId("savings",accounts,settings)||"");
        const _loanModalCash=validateCashSpendPrerequisites(_bpf,form.billBankAccountId,accounts,settings);
        if(_loanModalCash){setFormError(_loanModalCash);return;}
      }
      setDebts(p=>[...p,{id:_debtId,name:form.name,balance:form.balance,original:form.original||form.balance,rate:form.rate||"",minPayment:form.minPayment||"",type:form.type||"",debtKind:_dk,color:(form.color&&isValidHexColor(form.color)?form.color.trim():DEBT_PALETTE[p.length%DEBT_PALETTE.length]),...(_dk!=="credit_card"?{loanInterestAsOfDate:todayStr()}:{})}]);
      if(_addBill){
        let _bpf=normalizePaidFrom(form.billPaidFrom||settings.defaultBillPaidFrom||"checking");
        if(_bpf==="credit")_bpf="checking";
        const _bch=cashAccountsByKind(accounts,"checking");
        const _bsv=cashAccountsByKind(accounts,"savings");
        const _bbankCh=String(form.billBankAccountId||pickDefaultBankAccountId("checking",accounts,settings)||"");
        const _bbankSv=String(form.billBankAccountId||pickDefaultBankAccountId("savings",accounts,settings)||"");
        let _bbid="";
        if(_bpf==="checking"){if(_bch.length>=2)_bbid=_bbankCh;else if(_bch.length===1)_bbid=String(_bch[0].id);}
        else if(_bpf==="savings"){if(_bsv.length>=2)_bbid=_bbankSv;else if(_bsv.length===1)_bbid=String(_bsv[0].id);}
        const _due=form.loanBillDueDate||todayStr();
        setBills(p=>[...p,{id:_debtId+1,name:(form.name||"Loan")+" payment",amount:String(_minP),dueDate:_due,recurring:"Monthly",paid:false,autoPay:false,paidBy:form.paidBy||"me",paidFrom:_bpf,linkedDebtId:String(_debtId),...(_bbid?{bankAccountId:_bbid}:{})}]);
      }
      showToast("✓ "+form.name+" tracked — "+fmt(form.balance)+(_addBill?" · monthly bill added":""));
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
    const _lpd=new Date();_lpd.setDate(_lpd.getDate()-11);
    const lastPayDate=_lpd.getFullYear()+"-"+String(_lpd.getMonth()+1).padStart(2,"0")+"-"+String(_lpd.getDate()).padStart(2,"0");
    // Legacy checking/savings empty when cashAccounts drive totals (matches real multi-account users)
    setAccounts({checking:"",savings:"",cushion:"1800",credit_card:"0",investments:"8400",
      k401:"28500",roth_ira:"12000",brokerage:"8400",crypto:"1800",hsa:"3200",
      property:"0",vehicles:"12000",
      cashAccounts:[
        {id:DEMO_IDCHECK_PRIMARY,name:"Primary Checking",kind:"checking",balance:"3100"},
        {id:DEMO_IDCHECK_JOINT,name:"Joint Bills",kind:"checking",balance:"1180"},
        {id:DEMO_IDSAVINGS,name:"High-Yield Savings",kind:"savings",balance:"11400"},
      ],
    });
    // Income: biweekly RN paycheck + freelance + lastPayDate for safe-to-spend / payday UI
    setIncome({primary:"4200",other:"300",trading:"",rental:"",dividends:"",freelance:"500",
      payFrequency:"Biweekly",lastPayDate});
    // Core data (+ sync-key-aligned extras: recurrings, settlements, hhBudgets, nwGoal, rates)
    setExpenses(d.expenses);setBills(d.bills);setDebts(d.debts);setSGoals(d.savingsGoals);
    setBGoals(d.budgetGoals);setTrades(d.trades);setShifts(d.shifts);setBalHist(d.balHist);
    setRecurrings(d.recurrings||[]);setSettlements(d.settlements||[]);setHhBudgets(d.hhBudgets||[]);
    setNwGoal(d.nwGoal??null);setAccountRates(d.accountRates||{checking:0,savings:0,cushion:0,k401:0,roth_ira:0,brokerage:0,hsa:0,crypto:0});
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
    setDashConfig(DEF_DASHCONFIG);
    // Settings — all product surfaces + default bank picks for multi cashAccounts
    setSettings(p=>({...p,showTrading:true,showHealth:true,showSavings:true,showForecast:true,showCrypto:true,
      defaultExpensePaidFrom:"checking",defaultBillPaidFrom:"checking",
      defaultCheckingAccountId:String(DEMO_IDCHECK_PRIMARY),defaultSavingsAccountId:String(DEMO_IDSAVINGS),
      quickActions:["expense","bill","paycheck","debt","health","budget","savings","insights"]}));
    setSubDismissed([]);
    if(import.meta.env.DEV){
      window.__trackfiDemoInfo={
        modelVersion:d.demoModelVersion,
        backupSchema:"3.1",
        includes:["cashAccounts×3","debtKind+creditDebtId","bankAccountId on spends","bill paidBy+card bills","tags","track-only spends","recurrings","settlements","hhBudgets","nwGoal","accountRates","lastPayDate"],
      };
      console.info("[Trackfi demo] model "+d.demoModelVersion+" — inspect window.__trackfiDemoInfo");
    }
    try{localStorage.setItem("fv_onboarded","1");localStorage.setItem("fv_demo","1");}catch{}
    ss("fv6:onboarded",true);
    setIsDemoMode(true);setOnboarded(true);
  }
  useEffect(()=>{window._loadDemo=loadDemo;return()=>{delete window._loadDemo;};},[]);
  // Dev-only: stress-test Spending + safe-to-spend with thousands of rows (console: __trackfiStress.add(5000))
  useEffect(()=>{
    if(!import.meta.env.DEV)return;
    const pad=m=>String(m).padStart(2,"0");
    window.__trackfiStress={
      add(n=2000){
        const d=new Date();
        const ms=d.getFullYear()+"-"+pad(d.getMonth()+1);
        const t0=performance.now();
        const batch=[];
        for(let i=0;i<n;i++){
          const day=1+(i%28);
          batch.push({id:"stress_"+t0+"_"+i,name:"Stress "+i,amount:String((i%250)+1),category:i%3===0?"Groceries":i%3===1?"Gas":"Misc",date:ms+"-"+pad(day),notes:"",tags:[],paidFrom:"checking",bankAccountId:String(DEMO_IDCHECK_PRIMARY)});
        }
        const t1=performance.now();
        setExpenses(p=>[...p,...batch]);
        console.info("[Trackfi stress] generated "+n+" rows in "+(t1-t0).toFixed(1)+"ms; appending to state… Open Spending → All Time, use Load more.");
      },
      clear(){setExpenses(p=>p.filter(e=>!String(e.id).startsWith("stress_")));console.info("[Trackfi stress] removed synthetic stress_* expenses");},
    };
    return()=>{try{delete window.__trackfiStress;}catch{}};
  },[]);

  async function exitDemo(){
    const uid=authSession?.user?.id;
    // Signed-in: don't clear onboarding — resetUserState() would drop fv_onboarded and show the wizard again.
    resetUserState({clearOnboarding:!uid});
    setAppName("Trackfi");
    try{delete window.__trackfiDemoInfo;}catch{}
    try{localStorage.removeItem("fv_demo");}catch{}
    if(uid&&authSession){
      await loadFromSupabase(authSession);
    }
    navTo("home");
  }
  /** Opens confirm dialog; safe for users who already have synced expenses (CTA is not limited to empty state). */
  function requestLoadDemo(){
    const hasLocalData=expenses.length>0||bills.length>0||debts.length>0||trades.length>0
      ||savingsGoals.length>0||budgetGoals.length>0
      ||Math.abs(parseFloat(accounts.checking||0))>0.009||Math.abs(parseFloat(accounts.savings||0))>0.009
      ||Math.abs(parseFloat(accounts.cushion||0))>0.009
      ||(accounts.cashAccounts||[]).some(a=>Math.abs(parseFloat(a.balance||0))>0.009);
    const signedIn=!!authSession?.user?.id;
    setConfirm({
      title:"Try sample data?",
      message:!hasLocalData
        ?"Load a full year of sample expenses, bills, and goals so you can tap through every feature. Nothing changes until you confirm."
        :signedIn
          ?"Sample data stays on this device only — it does not sync to your account. When you’re done, tap Exit demo on Home and your cloud data loads again."
          :"Loads sample data locally so you can explore. If you already entered real numbers here, export a backup under Settings → Data first, then import it later if you need to.",
      onConfirm:()=>{loadDemo();setConfirm(null);},
      danger:false
    });
  }

  function backupExport(){
    try{
      const d={
        app:"trackfi",
        exportedAt:new Date().toISOString(),
        version:"3.2",
        ...(typeof window!=="undefined"&&window.__trackfiDemoInfo?.modelVersion?{demoModelVersion:window.__trackfiDemoInfo.modelVersion}:{}),
        appName,greetName,onboarded,accounts,income,expenses,bills,debts,trades,shifts,savingsGoals,budgetGoals,
        categories,settings,calColors,dashConfig,household,recurrings,settlements,hhBudgets,nwGoal,subDismissed,
        profCategory,profSub,tradingAccount,accountRates,balHist,notifs,
        merchantCats:typeof window!=="undefined"?window._merchantCats:void 0
      };
      const b=new Blob([JSON.stringify(d,null,2)],{type:"application/json"});
      const u=URL.createObjectURL(b);
      const a=document.createElement("a");
      a.href=u;
      a.download=`${(appName||"finances").replace(/\s+/g,"-")}-backup.json`;
      a.rel="noopener";
      a.style.display="none";
      document.body.appendChild(a);
      a.click();
      setTimeout(()=>{try{URL.revokeObjectURL(u);a.remove();}catch{}},4000);
      showToast("✓ Full backup downloaded");
    }catch(e){
      console.error("Backup export failed",e);
      showToast("Backup export failed — try again after refreshing.","error");
    }
  }
  async function backupImport(file){
    try{
      const t=await file.text();
      const parsed=parseTrackfiBackupJson(t);
      if(!parsed.ok){
        showToast&&showToast("Import blocked — "+(parsed.errors?.[0]||"invalid backup file"),"error");
        return false;
      }
      const d=parsed.data;
      if(d.accounts)setAccounts(p=>({...p,...d.accounts}));
      if(d.income)setIncome(p=>({...p,...d.income}));
      if(Array.isArray(d.expenses))setExpenses(d.expenses);
      if(Array.isArray(d.bills))setBills(d.bills);
      if(Array.isArray(d.debts))setDebts(d.debts);
      if(Array.isArray(d.trades))setTrades(d.trades);
      if(Array.isArray(d.shifts))setShifts(d.shifts);
      if(Array.isArray(d.savingsGoals))setSGoals(d.savingsGoals);
      if(Array.isArray(d.budgetGoals))setBGoals(d.budgetGoals);
      if(Array.isArray(d.categories))setCats(d.categories);
      if(d.settings)setSettings(p=>({...p,...d.settings}));
      if(d.calColors)setCalColors(p=>({...p,...d.calColors}));
      if(d.dashConfig)setDashConfig(p=>({...p,...d.dashConfig}));
      if(d.household)setHousehold(p=>({...p,...d.household}));
      if(Array.isArray(d.recurrings))setRecurrings(d.recurrings);
      if(Array.isArray(d.settlements))setSettlements(d.settlements);
      if(Array.isArray(d.hhBudgets))setHhBudgets(d.hhBudgets);
      if(d.nwGoal!==undefined)setNwGoal(d.nwGoal);
      if(Array.isArray(d.subDismissed))setSubDismissed(d.subDismissed);
      if(d.profCategory)setProfCategory(d.profCategory);
      if(d.profSub)setProfSub(d.profSub);
      if(d.tradingAccount)setTradingAccount(p=>({...p,...d.tradingAccount}));
      if(d.accountRates)setAccountRates(p=>({...p,...d.accountRates}));
      if(Array.isArray(d.balHist))setBalHist(d.balHist);
      if(Array.isArray(d.notifs))setNotifs(d.notifs);
      if(d.appName)setAppName(d.appName);
      if(d.greetName!==undefined)setGreetName(d.greetName);
      if(d.onboarded===true){try{localStorage.setItem("fv_onboarded","1");}catch{}setOnboarded(true);ss("fv6:onboarded",true);}
      else if(d.onboarded===false){try{localStorage.removeItem("fv_onboarded");}catch{}setOnboarded(false);ss("fv6:onboarded",false);}
      if(d.merchantCats)try{window._merchantCats=d.merchantCats;ss("fv6:merchantCats",d.merchantCats);}catch{}
      showToast&&showToast(isTrackfiDemoMode()?"✅ Backup imported (on this device — sample mode doesn\u2019t sync to the cloud).":"✅ Backup validated and imported — saving to your account\u2026");
      if(parsed.warnings?.length)console.warn("[Trackfi] Backup import warnings:",parsed.warnings);
      return true;
    }catch(e){showToast&&showToast("Import failed — "+(e?.message||"try another backup file"),"error");return false;}
  }
  async function handleResetAllData(){
    const syncOut=await flushPendingSync();
    if(authSession?.user?.id&&(syncOut?.error||syncOut?.conflict||syncOut?.skipped)){
      showToast("Reset paused — export a backup or try again online after sync finishes.","error");
      return false;
    }
    const uid=_getUserId();
    if(uid){
      const out=await supaFetch(`/rest/v1/user_data?user_id=eq.${encodeURIComponent(uid)}`,{method:"DELETE"});
      if(out?.error){
        showToast("Reset paused — cloud data could not be deleted. Try again while online.","error");
        return false;
      }
    }
    resetUserState();
    setOnboarded(false);
    try{localStorage.removeItem("fv_onboarded");}catch{}
    setSyncRecoverableError(false);
    setStorageQuotaBlocked(false);
    resetLocalStorageQuotaWarned();
    showToast("All data cleared","error");
    return true;
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
            setPwResetMode(false);
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
  if(sessionExpired&&!authSession&&!skipAuth){
    return(
      <div style={{minHeight:"100vh",background:`linear-gradient(160deg,${C.navy} 0%,#1a2a4a 55%,${C.accent} 100%)`,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <style>{CSS}</style>
        <div style={{background:C.surface,borderRadius:20,padding:28,maxWidth:340,width:"100%",boxShadow:"0 24px 64px rgba(10,22,40,.25)",textAlign:"center"}}>
          <div style={{fontSize:36,marginBottom:12}}>🔒</div>
          <div style={{fontFamily:MF,fontSize:17,fontWeight:800,color:C.text,marginBottom:8}}>Session expired</div>
          <div style={{fontSize:13,color:C.textMid,marginBottom:22,lineHeight:1.5}}>Sign in again to sync across devices. Your data on this device is still here.</div>
          <button type="button" onClick={()=>setSessionExpired(false)} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${C.accent},${C.teal})`,color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer",marginBottom:10,fontFamily:MF}}>
            Sign in again
          </button>
          <button type="button" onClick={()=>{setSessionExpired(false);handleSkip();}} style={{width:"100%",padding:"10px",borderRadius:12,border:`1px solid ${C.border}`,background:"none",color:C.textMid,fontWeight:600,fontSize:13,cursor:"pointer"}}>
            Continue without account
          </button>
        </div>
      </div>
    );
  }
  if(!authSession&&!skipAuth)return <AuthScreen onAuth={handleAuth} onSkip={handleSkip}/>;
  if(!ready)return(<div style={{minHeight:"100vh",background:`linear-gradient(160deg,${C.navy} 0%,${C.navyMid} 100%)`,display:"flex",alignItems:"center",justifyContent:"center"}}><style>{CSS}</style><div style={{textAlign:"center"}}><div style={{fontFamily:MF,fontSize:28,fontWeight:900,color:"#fff",marginBottom:20}}>💰 Trackfi</div><div style={{width:36,height:36,border:"3px solid rgba(255,255,255,.2)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 14px"}}/><div style={{fontSize:13,color:"rgba(255,255,255,.5)"}}>Loading your data...</div></div></div>);
  if(!onboarded&&ready)return(<><style>{CSS}</style><OnboardingWizard onComplete={async d=>{
    if(d.name)setGreetName(d.name);
    setAppName("Trackfi");
    if(d.profCategory)setProfCategory(d.profCategory);if(d.profSub)setProfSub(d.profSub);
    if(d.income)setIncome({primary:"",other:"",trading:"",rental:"",dividends:"",freelance:"",payFrequency:"Biweekly",lastPayDate:"",...d.income});if(d.accounts)setAccounts(p=>({...p,...d.accounts}));
    // Apply household mode based on use-case selection
    if(d.useCase==="couple"){setHousehold(h=>({...h,enabled:true,name:(d.name?d.name.split(" ")[0]+"'s Household":"Our Household"),members:[{id:"me",name:d.name?d.name.split(" ")[0]:"Me",emoji:"😊",color:"#6366F1"},{id:"partner",name:"Partner",emoji:"😄",color:"#10B981"}]}));}
    else if(d.useCase==="roommates"){setHousehold(h=>({...h,enabled:true,name:"Shared Household",members:[{id:"me",name:d.name?d.name.split(" ")[0]:"Me",emoji:"😊",color:"#6366F1"},{id:"roommate",name:"Roommate",emoji:"🏠",color:"#D97706"}]}));}
    else if(d.useCase==="family"){setHousehold(h=>({...h,enabled:true,name:(d.name?d.name.split(" ")[0]+"'s Family":"Our Family"),members:[{id:"me",name:d.name?d.name.split(" ")[0]:"Me",emoji:"😊",color:"#6366F1"},{id:"partner",name:"Partner",emoji:"😄",color:"#10B981"}]}));}
    else{setHousehold({enabled:false,name:"My Finances",members:[{id:"me",name:d.name?d.name.split(" ")[0]:"Me",emoji:"😊",color:"#6366F1"}]});} // "personal" — single user, no partner member

    const hasTrading=parseFloat(d.income?.trading||0)>0;
    setSettings(p=>({...p,showTrading:hasTrading,showHealth:true,showSavings:true,showForecast:true}));
    try{localStorage.setItem("fv_onboarded","1");localStorage.removeItem("fv_pending_name");}catch{}
    ss("fv6:onboarded",true);
    setOnboarded(true);
  }}/></>);
  if(locked&&pinEnabled)return(<><style>{CSS}</style><PINLock onUnlock={()=>setLocked(false)} appName={appName} darkMode={darkMode}/></>);

  return(
    <TrackfiRechartsProvider mod={rechartsMod} failed={rechartsLoadFailed} dark={darkMode}>
    <div style={{flex:1,minHeight:0,width:"100%",maxWidth:640,margin:"0 auto",background:darkMode?C.navy:C.bg,fontFamily:IF,display:"flex",flexDirection:"column",position:"relative",overflow:"hidden",boxSizing:"border-box",height:"100%",maxHeight:"100dvh"}}>
      <style>{CSS}</style>
      <div id="fv-scroll" style={{flex:1,minHeight:0,minWidth:0,width:"100%",overflowY:"auto",overflowX:"hidden",WebkitOverflowScrolling:"touch",padding:"max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-left)) max(110px, calc(88px + env(safe-area-inset-bottom))) max(16px, env(safe-area-inset-right))",boxSizing:"border-box"}}>
        {!isOnline&&<div role="status" style={{position:"sticky",top:0,zIndex:35,marginBottom:12,background:"#1e293b",color:"#f1f5f9",fontSize:12,fontWeight:600,textAlign:"center",padding:"10px 12px",borderRadius:10,letterSpacing:.2,lineHeight:1.35}}>{authSession?.user?.id&&isSupabaseConfigured()?"📡 No internet — edits stay on this device and sync when you’re back online.":skipAuth?"📡 No internet — you can keep editing; everything stays in this browser.":"📡 No internet — you can keep editing on this device."}</div>}
        {pwaUpdateReady&&<div role="status" style={{position:"sticky",top:0,zIndex:35,marginBottom:12,background:C.accent,border:`1px solid ${C.accentMid}`,color:"#fff",fontSize:12,fontWeight:600,textAlign:"center",padding:"10px 12px",borderRadius:10,letterSpacing:.2,lineHeight:1.35,display:"flex",alignItems:"center",justifyContent:"center",gap:10,flexWrap:"wrap"}}><span>New version available — reload to get the latest fixes.</span><button type="button" className="ba" onClick={async()=>{try{const reg=await navigator.serviceWorker?.getRegistration?.();if(reg?.waiting){navigator.serviceWorker.addEventListener("controllerchange",()=>window.location.reload(),{once:true});reg.waiting.postMessage({type:"SKIP_WAITING"});setTimeout(()=>window.location.reload(),1500);return;}navigator.serviceWorker?.controller?.postMessage({type:"SKIP_WAITING"});}catch{}window.location.reload();}} style={{background:"rgba(255,255,255,.22)",border:"1px solid rgba(255,255,255,.35)",borderRadius:8,padding:"4px 12px",color:"#fff",fontSize:12,fontWeight:800,cursor:"pointer"}}>Reload</button><button type="button" className="ba" onClick={()=>setPwaUpdateReady(false)} style={{background:"transparent",border:"1px solid rgba(255,255,255,.35)",borderRadius:8,padding:"4px 10px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Later</button></div>}
        {storageQuotaBlocked&&<div role="alert" style={{position:"sticky",top:0,zIndex:35,marginBottom:12,background:C.amber,border:`1px solid ${C.amberMid}`,color:"#78350f",fontSize:12,fontWeight:600,textAlign:"center",padding:"10px 12px",borderRadius:10,letterSpacing:.2,lineHeight:1.35,display:"flex",alignItems:"center",justifyContent:"center",gap:10,flexWrap:"wrap"}}><span>Storage full — this browser can’t save more data. Export a backup, then free space or clear old data.</span><button type="button" className="ba" onClick={()=>navTo("export")} style={{background:"rgba(255,255,255,.35)",border:"1px solid rgba(120,53,15,.25)",borderRadius:8,padding:"4px 12px",color:"#451a03",fontSize:12,fontWeight:700,cursor:"pointer"}}>Export</button><button type="button" className="ba" onClick={()=>{setStorageQuotaBlocked(false);resetLocalStorageQuotaWarned();}} style={{background:"transparent",border:"1px solid rgba(120,53,15,.35)",borderRadius:8,padding:"4px 12px",color:"#451a03",fontSize:12,fontWeight:700,cursor:"pointer"}}>Dismiss</button></div>}
        {syncRecoverableError&&isOnline&&authSession?.user?.id&&isSupabaseConfigured()&&<div role="alert" style={{position:"sticky",top:0,zIndex:35,marginBottom:12,background:C.red,border:`1px solid ${C.redMid}`,color:"#fff",fontSize:12,fontWeight:600,textAlign:"center",padding:"10px 12px",borderRadius:10,letterSpacing:.2,lineHeight:1.35,display:"flex",alignItems:"center",justifyContent:"center",gap:10,flexWrap:"wrap"}}><span>Couldn’t refresh data from the cloud. You’re still using what’s on this device.</span><button type="button" className="ba" onClick={()=>{void loadFromSupabase(authSession);}} style={{background:"rgba(255,255,255,.2)",border:"1px solid rgba(255,255,255,.35)",borderRadius:8,padding:"4px 12px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Try again</button></div>}
        {["spend","home","bills"].includes(tab)&&<button className="ba" type="button" aria-label={tab==="bills"?"Add bill":"Log expense"} onClick={()=>tab==="bills"?om("bill"):om("expense")} style={{position:"fixed",right:"max(16px, env(safe-area-inset-right))",bottom:"max(90px, calc(78px + env(safe-area-inset-bottom)))",width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent},${C.purple})`,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 20px ${C.accent}50,0 2px 8px rgba(10,22,40,.15)`,zIndex:50,transition:"transform .2s,box-shadow .2s"}}><Plus size={22} color="#fff"/></button>}
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
                  const sr2=totalIncome>0?Math.max(0,(totalIncome-thisMonthExp)/totalIncome*100):0;
                  const _liq2=totalSavingsBalance(accounts)+parseFloat(accounts.cushion||0);
                  const _ef2=totalIncome>0?_liq2/totalIncome:0;
                  const sc=Math.round(Math.min(10,Math.max(1,((sr2>20?100:sr2>10?75:sr2>5?50:25)*.25+(_ef2>=3?100:_ef2>=1?70:40))*.2+(totalDebt===0?100:Math.max(20,100-Math.round(totalDebt/Math.max(1,totalIncome)*100)))*.2+100*.35)/10));
                  const col=sc>=8?C.green:sc>=6?C.accent:sc>=4?C.amber:C.red;
                  return(<button onClick={()=>navTo("health")} style={{background:col+"18",border:`1px solid ${col}44`,borderRadius:99,padding:"5px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                    <div style={{fontFamily:MF,fontWeight:800,fontSize:12,color:col}}>{sc}/10</div>
                    <div style={{fontSize:10,color:col}}>health</div>
                  </button>);
                })()}
                {syncing&&<div style={{width:7,height:7,borderRadius:"50%",background:C.accent,flexShrink:0,animation:"pulse 1.2s ease-in-out infinite"}} title="Syncing..."/>}
                <button type="button" className="ba" aria-label={darkMode?"Switch to light mode":"Switch to dark mode"} aria-pressed={darkMode} onClick={()=>setDarkMode(d=>{const n=!d;setSettings(s=>({...s,darkMode:n}));return n;})} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"7px 9px",cursor:"pointer",display:"flex",color:C.textMid}}>{darkMode?<Sun size={15}/>:<Moon size={15}/>}</button>
                <button type="button" className="ba" aria-label={hidden?"Show balances":"Hide balances"} aria-pressed={hidden} onClick={()=>setHidden(h=>!h)} style={{background:hidden?C.accentBg:C.bg,border:`1px solid ${hidden?C.accentMid:C.border}`,borderRadius:10,padding:"7px 9px",cursor:"pointer",display:"flex",color:hidden?C.accent:C.textMid}}>{hidden?<EyeOff size={15}/>:<Eye size={15}/>}</button>
              </div>
            </div>

            {isDemoMode&&expenses.length>0&&(
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,width:"fit-content"}}>
                {demoBannerVisible&&(
                  <div style={{display:"flex",alignItems:"center",gap:4,background:"rgba(217,119,6,.08)",border:"1px solid rgba(217,119,6,.2)",borderRadius:99,padding:"3px 8px",animation:"fadeIn .3s ease"}}>
                    <span style={{fontSize:9}}>🧪</span>
                    <span style={{fontSize:9,fontWeight:600,color:C.amber,letterSpacing:.1}}>Demo mode</span>
                    <button onClick={()=>setDemoBannerVisible(false)}
                      style={{background:"none",border:"none",cursor:"pointer",color:C.amber,padding:"0 2px",fontSize:10,lineHeight:1,opacity:.6,marginLeft:2}}>×</button>
                  </div>
                )}
                <button onClick={()=>setConfirm({title:"Exit Demo",message:authSession?.user?.id?"Exit demo and restore your synced data from the cloud.":"Clear all demo data and start fresh.",onConfirm:()=>{exitDemo();setConfirm(null);},danger:false})}
                  style={{background:"rgba(217,119,6,.12)",border:"1px solid rgba(217,119,6,.2)",borderRadius:99,padding:"2px 10px",color:C.amber,fontWeight:700,fontSize:9,cursor:"pointer",lineHeight:1.6}}>
                  Exit Demo
                </button>
              </div>
            )}
            {!isDemoMode&&(
              <div style={{marginBottom:14,textAlign:"center"}}>
                <button type="button" className="ba" onClick={requestLoadDemo}
                  style={{background:C.surfaceAlt,border:`1px solid ${C.border}`,borderRadius:99,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:600,color:C.textMid}}>
                  🧪 Try sample data
                </button>
                <div style={{fontSize:10,color:C.textFaint,marginTop:6,lineHeight:1.4}}>Explore the app with a full year of demo transactions</div>
              </div>
            )}

            {overdue.length>0&&<div onClick={()=>navTo("bills")} style={{background:C.redBg,border:`1px solid ${C.redMid}`,borderRadius:12,padding:"10px 14px",marginBottom:10,display:"flex",gap:8,alignItems:"center",cursor:"pointer"}}><AlertCircle size={15} color={C.red} style={{flexShrink:0}}/><div style={{flex:1,fontSize:13,color:C.red,fontWeight:600}}>{overdue.length} bill{overdue.length!==1?"s":""} overdue — tap to resolve</div><ChevronRight size={13} color={C.red}/></div>}

            {ready&&paycheckNudge.show&&paycheckNudge.due&&(
              <div style={{background:C.greenBg,border:`1px solid ${C.greenMid}`,borderRadius:12,padding:"10px 14px",marginBottom:10,display:"flex",flexWrap:"wrap",gap:10,alignItems:"center"}}>
                <div style={{flex:"1 1 220px",fontSize:13,color:C.text,fontWeight:600,lineHeight:1.45}}>
                  Paycheck for <strong>{fmtDate(paycheckNudge.due)}</strong> — record your deposit so checking and safe-to-spend stay accurate.
                </div>
                <div style={{display:"flex",gap:8,flexShrink:0}}>
                  <button type="button" className="ba" onClick={()=>setPaycheckDepCtx({dueDate:paycheckNudge.due})} style={{background:C.green,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}}>Record deposit</button>
                  <button type="button" className="ba" onClick={()=>setSettings(s=>({...s,paycheckNudgeLastHandledPeriod:paycheckNudge.due}))} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 12px",color:C.textMid,fontWeight:600,fontSize:12,cursor:"pointer"}}>Not now</button>
                </div>
              </div>
            )}

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
                      {[["Assets",fmt(totalAssets),C.greenMid],["Debts",fmt(totalDebt),"#fca5a5"],["Liquid",fmt(totalCheckingBalance(accounts)+totalSavingsBalance(accounts)+(parseFloat(accounts.cushion||0))),C.accentMid],["Retirement",fmt((parseFloat(accounts.k401||0))+(parseFloat(accounts.roth_ira||0))+(parseFloat(accounts.hsa||0))),C.teal]].map(([l,v,c])=>(
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
                    {[["Income/pay",fmt(payPerPeriod),C.greenMid,100],["This Month",fmt(thisMonthExp),C.redMid,totalIncome>0?Math.min(100,(thisMonthExp/totalIncome)*100):0],["Bills",fmt(bills.filter(b=>!b.paid).reduce((s,b)=>s+(parseFloat(b.amount)||0),0)),"rgba(255,255,255,.6)",totalIncome>0?Math.min(100,(bills.filter(b=>!b.paid).reduce((s,b)=>s+(parseFloat(b.amount)||0),0)/totalIncome)*100):0],["Debt Min",fmt(debts.reduce((s,d)=>s+(parseFloat(d.minPayment)||0),0)),"rgba(255,255,255,.4)",totalIncome>0?Math.min(100,(debts.reduce((s,d)=>s+(parseFloat(d.minPayment)||0),0)/totalIncome)*100):0]].map(([l,v,c,pct])=>(
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
            {dashConfig.showMetrics!==false&&(()=>{
              const now_p=new Date();
              const _todayLocal=now_p.getFullYear()+"-"+String(now_p.getMonth()+1).padStart(2,"0")+"-"+String(now_p.getDate()).padStart(2,"0");
              const todayAmt=expenses.filter(e=>e.date===_todayLocal).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
              const nextBill=bills.filter(b=>!b.paid&&dueIn(b.dueDate)>=0).sort((a,b2)=>dueIn(a.dueDate)-dueIn(b2.dueDate))[0];
              const subCount=detectedSubs?.filter(s=>s.interval==="Monthly").length||0;
              const subTotal=detectedSubs?.filter(s=>s.interval==="Monthly").reduce((s,x)=>s+(parseFloat(x.amount)||0),0)||0;
              const pulseItems=[
                {label:"Today",val:todayAmt>0?fmt(todayAmt):"—",color:todayAmt>0?C.red:C.textFaint,sub:todayAmt>0?expenses.filter(e=>e.date===_todayLocal).length+" items":"nothing yet",tap:()=>navTo("calendar")},
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
                totalDebt>0&&`~\u2248 ${fmt(approxMonthlyInterestOnDebts(debts))}/mo interest (APR\u00f712 on balances)`,
                overdue.length>0&&`⚠ ${overdue.length} bill${overdue.length!==1?"s":""} overdue — take action now`,
                spendingStreak>2&&`🔥 ${spendingStreak}-day streak — checking spend below your daily average`,
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
                {id:"receipt",l:"Add from Photo",ic:"📷",a:()=>om("receipt"),bg:C.purpleBg,c:C.purple},
                {id:"bill",l:"Add Bill",ic:"📅",a:()=>om("bill"),bg:C.amberBg,c:C.amber},
                {id:"debt",l:"Add Debt",ic:"💳",a:()=>om("debt",{addLoanBill:true,loanBillDueDate:todayStr()}),bg:C.redBg,c:C.red},
                {id:"simulator",l:"Payoff Sim",ic:"🧮",a:()=>debts.length?setModal("simulator"):om("debt",{addLoanBill:true,loanBillDueDate:todayStr()}),bg:C.greenBg,c:C.green},
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
            {dashConfig.showForecast!==false&&(()=>{
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

            {dashConfig.showBills!==false&&bills.filter(b=>!b.paid).length>0&&<div style={{marginBottom:14}}>
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

            {/* ── 7. RECENT TRANSACTIONS ────────────────────────── */}
            {dashConfig.showRecent!==false&&expenses.length>0&&<div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Recent</div>
                <button onClick={()=>navTo("spend")} style={{fontSize:12,color:C.accent,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>See all</button>
              </div>
              {(()=>{const days=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);const ds=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");const amt=expenses.filter(e=>e.date===ds).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);return{d:ds,amt,day:["Su","Mo","Tu","We","Th","Fr","Sa"][d.getDay()]};});const mx=Math.max(...days.map(d=>d.amt))||1;const today3=todayStr();return(<div style={{display:"flex",gap:3,alignItems:"flex-end",height:28,marginBottom:12}}>{days.map(({d,amt,day})=>{const h=Math.max(3,Math.round((amt/mx)*24));const isToday=d===today3;return(<div key={d} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}><div style={{width:"100%",height:h,background:isToday?C.accent:amt>0?C.accentBg:C.borderLight,borderRadius:"2px 2px 0 0"}}/><div style={{fontSize:8,color:isToday?C.accent:C.textFaint,fontWeight:isToday?700:400}}>{day}</div></div>);})}</div>);})()}
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

        {tab==="chat"&&<div style={{height:"calc(100dvh - 150px)",maxHeight:"calc(100dvh - 150px)",display:"flex",flexDirection:"column",minHeight:0,paddingBottom:4}}>
          <div style={{marginBottom:10}}>
            <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text}}>AI Logger</div>
            <div style={{fontSize:13,color:C.textLight,marginTop:1,marginBottom:10}}>Paid-from aware — "lunch 12", "coffee 6 on card", "split spending", "rent 1200 due 28th"</div>
            {/* Smart prompt chips */}
            <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
              {(()=>{
                const now_c=new Date();
                const urgentPayBills=bills.filter(b=>!b.paid&&dueIn(b.dueDate)<=3&&dueIn(b.dueDate)>=0).slice(0,2);
                const chips=[
                  {l:"💸 Log Expense",a:()=>om("expense")},
                  {l:"📅 Add Bill",a:()=>om("bill")},
                  {l:"💳 Add Debt",a:()=>om("debt",{addLoanBill:true,loanBillDueDate:todayStr()})},
                  {l:"🎯 Add Goal",a:()=>navTo("savings")},
                  {l:"💰 Paycheck Plan",a:()=>navTo("paycheck")},
                  ...urgentPayBills.map(b=>({l:"✓ Pay "+b.name,a:()=>{const res=commitMarkBillPaid(b,{debts,setDebts,setBills,accounts,settings,applySpend,onToast:msg=>showToast&&showToast(msg),skipToast:!showToast,skipVibrate:false});if(!res.ok)showToast&&showToast(res.msg,"error");}})),
                ];
                return chips.map((c,i)=>(
                  <div key={i} onClick={c.a} style={{flexShrink:0,background:C.surface,border:`1px solid ${C.border}`,borderRadius:99,padding:"6px 12px",fontSize:11,fontWeight:600,color:C.textMid,cursor:"pointer",whiteSpace:"nowrap",boxShadow:"0 1px 2px rgba(10,22,40,.06)"}}>
                    {c.l}
                  </div>
                ));
              })()}
            </div>
          </div>
          <div style={{flex:1,minHeight:0}}><ChatView categories={categories} expenses={expenses} bills={bills} debts={debts} accounts={accounts} income={income} savingsGoals={savingsGoals} trades={trades} tradingAccount={tradingAccount} budgetGoals={budgetGoals} setExpenses={setExpenses} setBills={setBills} setDebts={setDebts} setSGoals={setSGoals} setAccounts={setAccounts} setIncome={setIncome} setTrades={setTrades} setBGoals={setBGoals} applySpend={applySpend} applyRefund={applyRefund} defaultExpensePaidFrom={settings.defaultExpensePaidFrom||"checking"} defaultBillPaidFrom={settings.defaultBillPaidFrom||"checking"} settings={settings} showToast={showToast}/></div></div>}
        {tab==="categories"&&<CategoriesView categories={categories} setCategories={setCats} expenses={expenses} setExpenses={setExpenses} showToast={showToast}/>}
        {tab==="spend"&&<SpendingView expenses={expenses} setExpenses={setExpenses} budgetGoals={budgetGoals} setBGoals={setBGoals} categories={categories} setEditItem={setEditItem} onAdd={()=>om("expense")} showToast={showToast} showUndoToast={showUndoToast} household={household} applySpend={applySpend} applyRefund={applyRefund} accounts={accounts} debts={debts} settings={settings}/>}
        {tab==="bills"&&<BillsView bills={bills} setBills={setBills} setDebts={setDebts} setEditItem={setEditItem} onAdd={()=>om("bill")} showToast={showToast} showUndoToast={showUndoToast} household={household} requestNotifPermission={requestNotifPermission} applySpend={applySpend} applyRefund={applyRefund} accounts={accounts} debts={debts} settings={settings}/>}
        {tab==="more"&&!isMoreTab&&(
          <div className="fu">
            {/* Account pill at top of More */}
            {authSession?(
              <div style={{background:C.navy,borderRadius:16,padding:"14px 16px",marginBottom:16,display:"flex",flexWrap:"wrap",alignItems:"flex-start",gap:12,rowGap:10}}>
                <div style={{width:40,height:40,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:MF,fontWeight:800,fontSize:16,color:"#fff",flexShrink:0}}>{(authSession?.user?.email||"?")[0].toUpperCase()}</div>
                <div style={{flex:"1 1 180px",minWidth:0}}><div style={{fontSize:14,fontWeight:700,color:"#fff",overflowWrap:"anywhere",wordBreak:"break-word"}}>{authSession?.user?.email}</div><div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginTop:2}}>{(()=>{const t=parseInt(localStorage.getItem("fv_last_sync")||"0");const ago=t?Math.floor((Date.now()-t)/1000):null;return ago===null?"Signed in":ago<10?"✓ Just synced":ago<60?"✓ Synced "+ago+"s ago":ago<3600?"✓ Synced "+Math.floor(ago/60)+"m ago":"Signed in";})()}</div></div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8,marginLeft:"auto",flex:"0 1 auto",justifyContent:"flex-end"}}>
                  <button onClick={async()=>{if(authSession&&!syncing){await loadFromSupabase(authSession);showToast("✓ Synced");}}} style={{background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.15)",borderRadius:8,padding:"6px 12px",color:"rgba(255,255,255,.8)",fontSize:12,fontWeight:700,cursor:syncing?"default":"pointer",display:"flex",alignItems:"center",gap:5,opacity:syncing?0.6:1,whiteSpace:"nowrap"}}>{syncing?"Syncing...":"↻ Sync now"}</button>
                  <button onClick={()=>setConfirm({title:"Sign Out",message:"You'll stay in offline mode. Your local data is safe.",onConfirm:async()=>{const ok=await handleSignOut();if(ok)setConfirm(null);},danger:false})} style={{background:"rgba(255,255,255,.1)",border:"none",borderRadius:8,padding:"6px 12px",color:"rgba(255,255,255,.7)",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>Sign Out</button>
                </div>
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
                {id:"search",ic:"🔍",l:"Search",c:C.textMid,bg:C.surfaceAlt},{id:"household",ic:"🏠",l:"Household",c:C.accent,bg:C.accentBg},{id:"savings",ic:"💰",l:"HYSA Goal",c:C.green,bg:C.greenBg},
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
                <div key={a.k} style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,display:"flex",flexWrap:"wrap",alignItems:"center",gap:12,rowGap:10,minWidth:0,boxSizing:"border-box",maxWidth:"100%"}}>
                  <div style={{width:44,height:44,borderRadius:12,background:a.c+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{a.ic}</div>
                  <div style={{flex:"1 1 120px",minWidth:0,maxWidth:"100%"}}><div style={{fontSize:14,fontWeight:600,color:C.text}}>{a.l}</div></div>
                  <input type="number" min="0" placeholder="0.00" value={accounts[a.k]||""} onChange={e=>{const v=e.target.value;if(v===""||parseFloat(v)>=0)setAccounts(p=>({...p,[a.k]:v}));}} onBlur={e=>{if(e.target.value)showToast("✓ "+a.l+" saved");}} style={{flex:"1 1 120px",width:130,maxWidth:"100%",minWidth:0,background:hidden?C.bg:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"8px 10px",fontSize:18,fontFamily:MF,fontWeight:800,color:a.c,outline:"none",textAlign:"right",filter:hidden?"blur(8px)":"none",boxSizing:"border-box"}}/>
                </div>
              ))}
            </div>
            <CashAccountsBlock accounts={accounts} setAccounts={setAccounts} showToast={showToast} variant="accounts" onOpenSettings={()=>navTo("settings")}/>
            {/* HYSA opportunity tip */}
            {(()=>{
              const liq=totalCheckingBalance(accounts)+totalSavingsBalance(accounts)+(parseFloat(accounts.cushion||0));
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
                  <input type="number" min="0" placeholder="0.00" value={accounts[a.k]||""} onChange={e=>{const v=e.target.value;if(v===""||parseFloat(v)>=0)setAccounts(p=>({...p,[a.k]:v}));}} onBlur={e=>{if(e.target.value)showToast("✓ "+a.l+" saved");}} style={{width:120,background:hidden?C.bg:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"8px 10px",fontSize:16,fontFamily:MF,fontWeight:700,color:a.c,outline:"none",textAlign:"right",filter:hidden?"blur(8px)":"none"}}/>
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
              <div style={{fontSize:11,color:C.accent,opacity:.7}}>({income.payFrequency||"Biweekly"} × {income.payFrequency==="Weekly"?"4.33×":income.payFrequency==="Twice Monthly"?"2×":income.payFrequency==="Monthly"?"1×":"2.17×"} + other sources)</div>
            </div>
            </div>
          </div>
        )}

        {tab==="debt"&&<DebtView debts={debts} setDebts={setDebts} setBills={setBills} setModal={setModal} setEditItem={setEditItem} showToast={showToast} extraPayDebt={extraPayDebt} setExtraPayDebt={setExtraPayDebt} debtSavePing={debtSavePing} onAddDebt={()=>om("debt",{addLoanBill:true,loanBillDueDate:todayStr()})}/>}
        {tab==="savings"&&<SavingsGoalsView goals={savingsGoals} setGoals={setSGoals} income={income} accounts={accounts} accountRates={accountRates} setAccountRates={setAccountRates} showToast={showToast} applySpend={applySpend} settings={settings}/>}
        {tab==="recurring"&&<RecurringView expenses={expenses} setExpenses={setExpenses} categories={categories} showToast={showToast} appReady={ready} recurrings={recurrings} setRecurrings={setRecurrings} applySpend={applySpend} defaultExpensePaidFrom={settings.defaultExpensePaidFrom||"checking"} accounts={accounts} settings={settings} debts={debts}/>}
        {tab==="cashflow"&&<IncomeSpendingView expenses={expenses} income={income} bills={bills} trades={trades}/>}
        {tab==="physical"&&<FinancialPhysicalView income={income} expenses={expenses} debts={debts} accounts={accounts} bills={bills} savingsGoals={savingsGoals}/>}
        {tab==="health"&&<HealthScoreView income={income} expenses={expenses} debts={debts} accounts={accounts} bills={bills} tradingAccount={tradingAccount} onNavigate={navTo}/>}
        {tab==="trading"&&settings.showTrading&&<TradingView trades={trades} setTrades={setTrades} account={tradingAccount} setAccount={setTradingAccount} showToast={showToast}/>}
        {tab==="calendar"&&<CalendarView expenses={expenses} bills={bills} calColors={calColors} setCalColors={setCalColors} setExpenses={setExpenses} onAdd={()=>om("expense")}/>}
        {tab==="shifts"&&<ShiftView shifts={shifts} setShifts={setShifts} income={income} profCategory={profCategory} profSub={profSub} showToast={showToast}/>}
        {tab==="trend"&&<TrendView balHist={balHist} accounts={accounts} expenses={expenses} onNavigate={navTo}/>}
        {tab==="statement"&&<StatementView expenses={expenses} bills={bills} income={income} accounts={accounts} debts={debts} trades={trades} appName={appName} categories={categories} onAdd={()=>om("expense")}/>}
        {tab==="search"&&<SearchView expenses={expenses} bills={bills} debts={debts} trades={trades} categories={categories} setEditItem={setEditItem} onNavigate={navTo}/>}
        {tab==="subscriptions"&&<SubsView detectedSubs={detectedSubs} expenses={expenses} showToast={showToast} dismissed={subDismissed} setDismissed={setSubDismissed}/>}
        {tab==="insights"&&<InsightsView expenses={expenses} income={income} bills={bills} debts={debts} budgetGoals={budgetGoals} savingsGoals={savingsGoals}/>}
        {tab==="paycheck"&&<PaycheckView bills={bills} income={income} setIncome={setIncome} expenses={expenses} accounts={accounts} budgetGoals={budgetGoals} onAdd={()=>om("expense")} onRecordPaycheck={openPaycheckDeposit}/>}
        {tab==="networthtrend"&&<NetWorthTrendView balHist={balHist} debts={debts} accounts={accounts} tradingAccount={tradingAccount} onNavigate={navTo} nwGoal={nwGoal} setNwGoal={setNwGoal}/>}
        {tab==="tax"&&<TaxView expenses={expenses} income={income} trades={trades} shifts={shifts} appName={appName}/>}
        {tab==="dashsettings"&&<DashSettingsView config={dashConfig} setConfig={setDashConfig} showTrading={settings.showTrading}/>}
        {tab==="household"&&<HouseholdView household={household} setHousehold={setHousehold} expenses={expenses} bills={bills} setBills={setBills} showToast={showToast} settlements={settlements} setSettlements={setSettlements} hhBudgets={hhBudgets} setHhBudgets={setHhBudgets}/>}
        {tab==="export"&&<div className="fu"><div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,marginBottom:4}}>Export Data</div><div style={{fontSize:13,color:C.textLight,marginBottom:20}}>Download your financial data for spreadsheets, backups, or your accountant.</div><button onClick={()=>setShowExport(true)} style={{display:"flex",alignItems:"center",gap:12,width:"100%",background:`linear-gradient(135deg,${C.accent},${C.purple})`,border:"none",borderRadius:16,padding:"18px 20px",cursor:"pointer",marginBottom:12}}><Download size={22} color="white"/><div style={{textAlign:"left"}}><div style={{fontSize:16,fontWeight:800,color:"#fff"}}>Open Export Center</div><div style={{fontSize:12,color:"rgba(255,255,255,.7)"}}>5 export formats — expenses, net worth, debts, report</div></div></button></div>}
        {tab==="import"&&<div className="fu"><div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,marginBottom:4}}>Import Bank CSV</div><div style={{fontSize:13,color:C.textLight,marginBottom:20}}>Paste or upload a CSV from your bank's website to bulk-import transactions.</div><button onClick={()=>setShowImport(true)} style={{display:"flex",alignItems:"center",gap:12,width:"100%",background:`linear-gradient(135deg,${C.green},${C.teal})`,border:"none",borderRadius:16,padding:"18px 20px",cursor:"pointer",marginBottom:16}}><FileText size={22} color="white"/><div style={{textAlign:"left"}}><div style={{fontSize:16,fontWeight:800,color:"#fff"}}>Open Bank Import</div><div style={{fontSize:12,color:"rgba(255,255,255,.7)"}}>Supports Chase, BofA, Wells Fargo, Capital One, Citi + any CSV</div></div></button><div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"12px 14px",fontSize:13,color:C.accent,lineHeight:1.6}}>💡 100% offline — your bank data never leaves your device. Export CSV from your bank's website, then paste it here. Auto-detects format and categorizes by merchant.</div></div>}
        {tab==="settings"&&<SettingsView settings={settings} setSettings={setSettings} appName={appName} setAppName={setAppName} profCategory={profCategory} setProfCategory={setProfCategory} profSub={profSub} setProfSub={setProfSub} darkMode={darkMode} setDarkMode={setDarkMode} pinEnabled={pinEnabled} setPinEnabled={setPinEnabled} household={household} navTo={navTo} expenses={expenses} bills={bills} debts={debts} trades={trades} accounts={accounts} income={income} shifts={shifts} savingsGoals={savingsGoals} budgetGoals={budgetGoals} setBills={setBills} setDebts={setDebts} setTrades={setTrades} setShifts={setShifts} setSGoals={setSGoals} setBGoals={setBGoals} setAccounts={setAccounts} setIncome={setIncome} setExpenses={setExpenses} categories={categories} setCategories={setCats} greetName={greetName} setGreetName={setGreetName} backupExport={backupExport} backupImport={backupImport} onResetAllData={()=>setConfirm({title:"Reset All Data",message:"This removes expenses, bills, debts, goals, household, recurring, notifications, chart history, categories, and settings from this device, and deletes synced cloud rows for this account. Your session stays signed in; PIN and other browser site data outside cleared keys are unchanged. Export JSON under Data first if you need a backup. This cannot be undone.",onConfirm:async()=>{const ok=await handleResetAllData();if(ok)setConfirm(null);},danger:true})} onResetOnboarding={()=>{try{localStorage.removeItem("fv_onboarded");}catch{}setOnboarded(false);}} onSignOut={authSession?handleSignOut:null} onSignIn={!authSession&&skipAuth?()=>{localStorage.removeItem("fv_skip_auth");setSkipAuth(false);}:null} userEmail={authSession?.user?.email} showToast={showToast} onLoadDemo={isDemoMode?undefined:requestLoadDemo} cloudSyncBump={cloudSyncMetaBump} supabaseConfigured={isSupabaseConfigured()} skipAuthMode={skipAuth} signedInForSync={!!authSession?.user?.id} netOnline={isOnline} syncing={syncing} syncRecoverableError={syncRecoverableError}/>}

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
            {/* Notification preferences */}
            <div style={{background:C.surface,borderRadius:16,padding:"4px 14px",marginBottom:14,border:`1px solid ${C.borderLight}`}}>
              <div style={{fontSize:11,fontWeight:700,color:C.textFaint,letterSpacing:.6,textTransform:"uppercase",padding:"10px 0 6px"}}>Alert Preferences</div>
              {[
                {k:"notifBills",    ic:"📅", label:"Bill reminders",      desc:"Overdue & due within 3 days"},
                {k:"notifBudget",   ic:"📦", label:"Budget warnings",     desc:"At 80% and over limit"},
                {k:"notifSavings",  ic:"🎯", label:"Savings goals",       desc:"75% reached & goal complete"},
                {k:"notifPayday",   ic:"💰", label:"Payday reminders",    desc:"Today and tomorrow alerts"},
                {k:"notifMilestones",ic:"🎉",label:"Net worth milestones",desc:"Celebration when you hit a new high"},
              ].map(({k,ic,label,desc})=>(
                <div key={k} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.borderLight}`}}>
                  <span style={{fontSize:18,flexShrink:0}}>{ic}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.text}}>{label}</div>
                    <div style={{fontSize:11,color:C.textLight}}>{desc}</div>
                  </div>
                  <button onClick={()=>setSettings(p=>({...p,[k]:p[k]===false?true:false}))}
                    style={{background:"none",border:"none",cursor:"pointer",color:settings[k]===false?C.borderLight:C.accent,padding:0,flexShrink:0}}>
                    {settings[k]===false?<ToggleLeft size={26}/>:<ToggleRight size={26}/>}
                  </button>
                </div>
              ))}
              <div style={{height:6}}/>
            </div>
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
      {toast&&<div role="status" aria-live={toast.type==="error"?"assertive":"polite"} aria-atomic="true" style={{position:"fixed",bottom:88,left:"50%",transform:"translateX(-50%)",zIndex:200,background:toast.type==="success"?C.green:toast.type==="error"?C.red:C.navy,color:"#fff",borderRadius:14,padding:"12px 18px",fontSize:13,fontWeight:600,boxShadow:"0 8px 32px rgba(10,22,40,.25),0 2px 8px rgba(10,22,40,.15)",display:"flex",alignItems:"center",gap:10,maxWidth:340,animation:"slideUp .22s cubic-bezier(.22,1,.36,1)",backdropFilter:"blur(8px)",letterSpacing:.1,cursor:"pointer"}} onClick={()=>setToast(null)}>
        <span>{toast.type==="success"?"✓":toast.type==="error"?"✗":"·"} {toast.msg}</span>
        {toast.action&&<button onClick={e=>{e.stopPropagation();toast.action.fn();setToast(null);}} style={{background:"rgba(255,255,255,.22)",border:"none",borderRadius:8,padding:"3px 10px",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",flexShrink:0,marginLeft:4}}>{toast.action.label}</button>}
      </div>}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:"min(640px, 100vw)",boxSizing:"border-box",background:"rgba(255,255,255,.88)",backdropFilter:"blur(32px)",WebkitBackdropFilter:"blur(32px)",borderTop:`1px solid rgba(226,229,238,.5)`,display:"flex",padding:"10px max(8px, env(safe-area-inset-left)) max(14px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-right))",zIndex:100,boxShadow:"0 -1px 0 rgba(10,22,40,.04),0 -12px 40px rgba(10,22,40,.07)",overflowX:"hidden"}}>
        {NAV.map(n=>{const active=n.id==="more"?isMoreTab||tab==="more":tab===n.id;return(
          <button key={n.id} className="ba" onClick={()=>navTo(n.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:active?"rgba(99,102,241,.08)":"transparent",border:"none",cursor:"pointer",color:active?C.accent:C.textFaint,position:"relative",borderRadius:12,padding:"4px 12px 6px",transition:"all .18s"}}>
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

      {modal==="expense"&&<Modal title="Log Expense" icon={Wallet} onClose={cl} onSubmit={submit} submitLabel="Add Expense" error={formError}><FI label="Name" placeholder="Coffee, groceries, gas..." value={form.name||""} onChange={e=>{ff("name",e.target.value);if(!form.category){const t=e.target.value.toLowerCase().trim();const mc=window._merchantCats||{};if(mc[t]){ff("category",mc[t]);}else{const catMap={"Groceries":["grocery","groceries","publix","kroger","walmart","costco","trader joe","aldi","whole foods","market"],"Fast Food":["mcdonald","burger","wendy","chipotle","taco bell","subway","chick","popeyes","kfc","domino","sonic"],"Restaurants":["restaurant","sushi","dinner out","doordash","ubereats","grubhub","dine"],"Coffee":["starbucks","dunkin","coffee","latte","espresso","cafe","cold brew","dutch bros"],"Gas":["gas","shell","bp","chevron","exxon","fuel","wawa","sheetz","quiktrip"],"Rideshare":["uber","lyft","taxi","ride"],"Subscriptions":["netflix","hulu","spotify","apple music","amazon prime","disney","hbo","membership","subscription"],"Health / Medical":["doctor","pharmacy","cvs","walgreens","medicine","dental","therapy","copay","clinic"],"Gym / Fitness":["gym","planet fitness","fitness","yoga","crossfit","peloton","workout"],"Grooming / Haircuts":["haircut","barber","salon","nails","manicure","wax","spa","sephora","ulta"],"Clothing":["clothes","shoes","nike","adidas","h&m","zara","nordstrom","fashion"],"Entertainment":["movie","game","steam","concert","ticket","bowling","bar","club"],"Travel":["hotel","airbnb","flight","airline","vacation","booking"],"Pets":["pet","petco","petsmart","vet","dog food","cat food"],"Shopping":["amazon","target","best buy","home depot","ikea","walmart","tj maxx"]};for(const[cat,kws]of Object.entries(catMap)){if(kws.some(k=>t.includes(k))){ff("category",cat);break;}}}}}}/><div style={{display:"flex",gap:12}}><FI half label="Amount ($)" type="number" value={form.amount||""} onChange={e=>ff("amount",e.target.value)} autoFocus={!!form.name}/><FI half label="Date" type="date" value={form.date||todayStr()} onChange={e=>ff("date",e.target.value)}/></div><FS label="Category" options={categories.map(c=>c.name)} value={form.category||""} onChange={e=>ff("category",e.target.value)}/><FS label="Paid from" options={PAID_FROM_OPTIONS.map(k=>({value:k,label:PAID_FROM_FS_LABELS[k]}))} value={normalizePaidFrom(form.paidFrom||settings.defaultExpensePaidFrom)} onChange={e=>{ff("paidFrom",e.target.value);const v=normalizePaidFrom(e.target.value);if(v==="credit")ff("creditDebtId",pickDefaultCreditDebtId(settings,debts)||"");else ff("creditDebtId","");ff("bankAccountId",pickDefaultBankAccountId(v,accounts,settings)||"");}}/>{normalizePaidFrom(form.paidFrom||settings.defaultExpensePaidFrom)==="credit"&&cardDebtsList(debts).length>1&&<FS label="Which card" options={cardDebtsList(debts).map(d=>({value:String(d.id),label:d.name+" — "+fmt(parseFloat(d.balance||0))+" principal"}))} value={String(form.creditDebtId||"")} onChange={e=>ff("creditDebtId",e.target.value)}/>}{normalizePaidFrom(form.paidFrom||settings.defaultExpensePaidFrom)==="credit"&&cardDebtsList(debts).length===0&&<div style={{fontSize:12,color:C.red,marginBottom:12,lineHeight:1.45}}>Add each card under <strong>More → Debt</strong> and set type to <strong>Credit card</strong> before charging here.</div>}{normalizePaidFrom(form.paidFrom||settings.defaultExpensePaidFrom)==="checking"&&cashAccountsByKind(accounts,"checking").length>1&&<FS label="Which checking" options={cashAccountsByKind(accounts,"checking").map(a=>({value:String(a.id),label:(a.name||"Checking")+" — "+fmt(parseFloat(a.balance||0))}))} value={String(form.bankAccountId||pickDefaultBankAccountId("checking",accounts,settings)||"")} onChange={e=>ff("bankAccountId",e.target.value)}/>}{normalizePaidFrom(form.paidFrom||settings.defaultExpensePaidFrom)==="savings"&&cashAccountsByKind(accounts,"savings").length>1&&<FS label="Which savings" options={cashAccountsByKind(accounts,"savings").map(a=>({value:String(a.id),label:(a.name||"Savings")+" — "+fmt(parseFloat(a.balance||0))}))} value={String(form.bankAccountId||pickDefaultBankAccountId("savings",accounts,settings)||"")} onChange={e=>ff("bankAccountId",e.target.value)}/>}<FI label="Notes" placeholder="Optional" value={form.notes||""} onChange={e=>ff("notes",e.target.value)}/>
        {household.enabled&&household.members.length>1&&<div style={{marginBottom:8}}>
          <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Assign to</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {[{id:"shared",name:"Shared",emoji:"🏠"},...household.members].map(m=>(
              <button key={m.id} onClick={()=>ff("owner",m.id)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:99,border:`1.5px solid ${(form.owner||"shared")===m.id?C.accent:C.border}`,background:(form.owner||"shared")===m.id?C.accentBg:"#fff",cursor:"pointer",fontSize:12,fontWeight:(form.owner||"shared")===m.id?700:400,color:(form.owner||"shared")===m.id?C.accent:C.textMid}}>
                <span>{m.emoji}</span><span>{m.name}</span>
              </button>
            ))}
          </div>
        </div>}<div style={{padding:"9px 12px",borderRadius:10,background:C.accentBg,border:`1px solid ${C.accentMid}`,marginTop:10,fontSize:12,color:C.accent,lineHeight:1.5}}>🔄 For auto-logged recurring expenses (Netflix, rent, etc.), use <strong>More → Recurring</strong>.</div></Modal>}
      {modal==="bill"&&<Modal title="Add Bill" icon={CalendarClock} onClose={cl} onSubmit={submit} submitLabel="Add Bill" accent={C.amber} error={formError}><FI label="Bill Name" placeholder="Rent, Electric, Netflix..." value={form.name||""} onChange={e=>ff("name",e.target.value)}/><div className="modal-field-row"><FI half label="Amount ($)" type="number" value={form.amount||""} onChange={e=>ff("amount",e.target.value)}/><FI half label="Due Date" type="date" value={form.dueDate||""} onChange={e=>ff("dueDate",e.target.value)}/></div><FS label="Recurring" options={["Weekly","Bi-weekly","Monthly","Quarterly","Annual","One-time"]} value={form.recurring||""} onChange={e=>ff("recurring",e.target.value)}/><FS label="Pay from (when you mark paid)" options={PAID_FROM_OPTIONS.map(k=>({value:k,label:PAID_FROM_FS_LABELS[k]}))} value={normalizePaidFrom(form.paidFrom||settings.defaultBillPaidFrom)} onChange={e=>{ff("paidFrom",e.target.value);const v=normalizePaidFrom(e.target.value);if(v==="credit")ff("creditDebtId",pickDefaultCreditDebtId(settings,debts)||"");else ff("creditDebtId","");ff("bankAccountId",pickDefaultBankAccountId(v,accounts,settings)||"");}}/>{normalizePaidFrom(form.paidFrom||settings.defaultBillPaidFrom)==="credit"&&cardDebtsList(debts).length>1&&<FS label="Which card pays this bill" options={cardDebtsList(debts).map(d=>({value:String(d.id),label:d.name+" — "+fmt(parseFloat(d.balance||0))+" principal"}))} value={String(form.creditDebtId||"")} onChange={e=>ff("creditDebtId",e.target.value)}/>}{normalizePaidFrom(form.paidFrom||settings.defaultBillPaidFrom)==="credit"&&cardDebtsList(debts).length===0&&<div style={{fontSize:12,color:C.red,marginBottom:12,lineHeight:1.45}}>Add each card under <strong>More → Debt</strong> (type: <strong>Credit card</strong>) first.</div>}{normalizePaidFrom(form.paidFrom||settings.defaultBillPaidFrom)==="checking"&&cashAccountsByKind(accounts,"checking").length>1&&<FS label="Which checking account" options={cashAccountsByKind(accounts,"checking").map(a=>({value:String(a.id),label:(a.name||"Checking")+" — "+fmt(parseFloat(a.balance||0))}))} value={String(form.bankAccountId||pickDefaultBankAccountId("checking",accounts,settings)||"")} onChange={e=>ff("bankAccountId",e.target.value)}/>}{normalizePaidFrom(form.paidFrom||settings.defaultBillPaidFrom)==="savings"&&cashAccountsByKind(accounts,"savings").length>1&&<FS label="Which savings account" options={cashAccountsByKind(accounts,"savings").map(a=>({value:String(a.id),label:(a.name||"Savings")+" — "+fmt(parseFloat(a.balance||0))}))} value={String(form.bankAccountId||pickDefaultBankAccountId("savings",accounts,settings)||"")} onChange={e=>ff("bankAccountId",e.target.value)}/>}{household.enabled&&household.members.length>1&&<div style={{marginBottom:8}}><div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Paid by</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{[{id:"shared",name:"Shared",emoji:"🏠"},...household.members].map(m=>(<button key={m.id} onClick={()=>ff("paidBy",m.id)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:99,border:`1.5px solid ${(form.paidBy||"shared")===m.id?C.amber:C.border}`,background:(form.paidBy||"shared")===m.id?"#FFFBEB":"#fff",cursor:"pointer",fontSize:12,fontWeight:(form.paidBy||"shared")===m.id?700:400,color:(form.paidBy||"shared")===m.id?C.amber:C.textMid}}><span>{m.emoji}</span><span>{m.name}</span></button>))}</div></div>}<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderTop:`1px solid ${C.border}`,marginTop:4}}><div><div style={{fontSize:13,fontWeight:600,color:C.text}}>Auto-Pay</div><div style={{fontSize:12,color:C.textLight,lineHeight:1.4}}>Badge only — does not mark paid or move money. You still tap paid when it clears.</div></div><button type="button" onClick={()=>ff("autoPay",!form.autoPay)} style={{background:"none",border:"none",cursor:"pointer",color:form.autoPay?C.accent:C.borderLight,padding:0,display:"flex"}}>{form.autoPay?<ToggleRight size={30}/>:<ToggleLeft size={30}/>}</button></div></Modal>}
      {modal==="debt"&&<Modal title="Add Debt" icon={CreditCard} onClose={cl} onSubmit={submit} submitLabel="Track Debt" accent={C.red} wide error={formError}><FI label="Name" placeholder="Car loan, Chase Sapphire, Amex..." value={form.name||""} onChange={e=>ff("name",e.target.value)}/><FS label="Debt type" options={[{value:"loan",label:"Loan / installment / other"},{value:"credit_card",label:"💳 Credit card (charges go here)"}]} value={form.debtKind==="credit_card"?"credit_card":"loan"} onChange={e=>ff("debtKind",e.target.value)}/><div className="modal-field-row"><FI half label="Balance ($)" type="number" value={form.balance||""} onChange={e=>ff("balance",e.target.value)}/><FI half label="Original ($)" type="number" value={form.original||""} onChange={e=>ff("original",e.target.value)}/></div><div className="modal-field-row"><FI half label="Rate %" type="number" value={form.rate||""} onChange={e=>ff("rate",e.target.value)}/><FI half label="Min Payment ($)" type="number" value={form.minPayment||""} onChange={e=>ff("minPayment",e.target.value)}/></div>{form.debtKind!=="credit_card"&&<><div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"10px 14px",marginTop:10,marginBottom:8,fontSize:12,color:C.textMid,lineHeight:1.45}}>Loans with a min. payment can add a matching <strong>monthly bill</strong> automatically. Marking that bill paid updates this loan’s balance (principal portion).</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0"}}><div><div style={{fontSize:13,fontWeight:600,color:C.text}}>Add monthly bill</div><div style={{fontSize:11,color:C.textLight}}>Same amount as min. payment · Bills tab</div></div><button type="button" className="ba" onClick={()=>ff("addLoanBill",!(form.addLoanBill!==false))} style={{background:"none",border:"none",cursor:"pointer",padding:0,color:form.addLoanBill!==false?C.accent:C.borderLight}}>{form.addLoanBill!==false?<ToggleRight size={30}/>:<ToggleLeft size={30}/>}</button></div>{form.addLoanBill!==false&&parseFloat(form.minPayment||0)>0&&<><FI label="First bill due" type="date" value={form.loanBillDueDate||todayStr()} onChange={e=>ff("loanBillDueDate",e.target.value)}/><FS label="Bill pays from" options={PAID_FROM_OPTIONS.filter(k=>k!=="credit"&&k!=="none").map(k=>({value:k,label:PAID_FROM_FS_LABELS[k]}))} value={normalizePaidFrom(form.billPaidFrom||settings.defaultBillPaidFrom||"checking")} onChange={e=>{ff("billPaidFrom",e.target.value);ff("billBankAccountId",pickDefaultBankAccountId(normalizePaidFrom(e.target.value),accounts,settings)||"");}}/>{normalizePaidFrom(form.billPaidFrom||settings.defaultBillPaidFrom||"checking")==="checking"&&cashAccountsByKind(accounts,"checking").length>1&&<FS label="Which checking" options={cashAccountsByKind(accounts,"checking").map(a=>({value:String(a.id),label:(a.name||"Checking")+" — "+fmt(parseFloat(a.balance||0))}))} value={String(form.billBankAccountId||pickDefaultBankAccountId("checking",accounts,settings)||"")} onChange={e=>ff("billBankAccountId",e.target.value)}/>}{normalizePaidFrom(form.billPaidFrom||settings.defaultBillPaidFrom||"checking")==="savings"&&cashAccountsByKind(accounts,"savings").length>1&&<FS label="Which savings" options={cashAccountsByKind(accounts,"savings").map(a=>({value:String(a.id),label:(a.name||"Savings")+" — "+fmt(parseFloat(a.balance||0))}))} value={String(form.billBankAccountId||pickDefaultBankAccountId("savings",accounts,settings)||"")} onChange={e=>ff("billBankAccountId",e.target.value)}/>}</>}</>}<div style={{marginTop:12}}><div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Chart color</div><div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>{DEBT_PALETTE.map(hex=>{const auto=DEBT_PALETTE[debts.length%DEBT_PALETTE.length];const sel=(form.color&&isValidHexColor(form.color)?form.color.trim():auto).toLowerCase();return(<button key={hex} type="button" className="ba" onClick={()=>ff("color",hex)} aria-label={hex} style={{width:28,height:28,borderRadius:8,background:hex,border:`2px solid ${sel===hex.toLowerCase()?C.accent:C.border}`,cursor:"pointer",padding:0}}/>);})}</div><FI label="Custom (#hex)" placeholder="Optional — overrides swatch" value={form.color||""} onChange={e=>ff("color",e.target.value)}/><div style={{fontSize:11,color:C.textLight,marginTop:6,lineHeight:1.4}}>Pie chart & debt list dots. Empty = next color in rotation ({DEBT_PALETTE[debts.length%DEBT_PALETTE.length]}).</div></div></Modal>}
      {modal==="bgoal_home"&&<Modal title="Spending Envelope" icon={Target} onClose={cl} onSubmit={()=>{if(!form.category||!form.limit)return;setBGoals(p=>[...p,{id:Date.now(),...form}]);cl();}} submitLabel="Add Envelope" accent={C.purple}><div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:C.accent,lineHeight:1.5}}>
        💡 Variable expenses like gas, haircuts, groceries. These reserve money in your safe-to-spend before you log them.
      </div>
      <FS label="Category" options={categories.map(c=>c.name)} value={form.category||""} onChange={e=>ff("category",e.target.value)}/><FI label="Note (optional)" placeholder="e.g. haircuts ~2x/month" value={form.note||""} onChange={e=>ff("note",e.target.value)}/><FI label="Monthly Budget ($)" type="number" placeholder="e.g. 150" value={form.limit||""} onChange={e=>ff("limit",e.target.value)}/></Modal>}
      {modal==="receipt"&&<Modal title="Add from Photo" icon={Scan} onClose={cl} accent={C.purple}><div style={{textAlign:"center",padding:"10px 0 20px"}}><div style={{width:64,height:64,borderRadius:18,background:C.purpleBg,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}><Scan size={30} color={C.purple}/></div><div style={{fontFamily:MF,fontWeight:700,fontSize:16,color:C.text,marginBottom:6}}>Add from Photo</div><div style={{fontSize:12,color:C.textMid,marginBottom:16,lineHeight:1.5}}>Take or choose a photo — you'll fill in the expense details after.</div><label style={{display:"block",background:C.purple,borderRadius:12,padding:"13px 0",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:10}}>📷 Take Photo<input type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>{const file=e.target.files[0];if(!file)return;cl();om("expense",{name:"Receipt",amount:"",category:"Misc",date:todayStr()});}}/></label><label style={{display:"block",background:C.purpleBg,border:`1px solid ${C.purpleMid}`,borderRadius:12,padding:"13px 0",color:C.purple,fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:10}}>🖼 Choose from Library<input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const file=e.target.files[0];if(!file)return;cl();om("expense",{name:"Receipt",amount:"",category:"Misc",date:todayStr()});}}/></label><button className="ba" onClick={cl} style={{background:C.bg,borderRadius:12,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:"12px 0",color:C.textMid,fontWeight:600,fontSize:14,cursor:"pointer",width:"100%"}}>Cancel</button></div></Modal>}
            {modal==="simulator"&&debts.length>0&&(()=>{
        const rows=simRowsFromDebts(debts);
        const tm=rows.filter(r=>r.bal>0.01).reduce((s,r)=>s+r.min,0);
        const ex=Math.max(0,Number(extraPayDebt)||0);
        const sn=simulateMultiDebtPayoff(rows,{strategy:"snowball",extraMonthly:ex,maxMonths:600});
        const av=simulateMultiDebtPayoff(rows,{strategy:"avalanche",extraMonthly:ex,maxMonths:600});
        const minBase=simulateMultiDebtPayoff(rows,{strategy:"avalanche",extraMonthly:0,maxMonths:600});
        const diff=Math.max(0,sn.totalInterest-av.totalInterest);
        const fmtMo=m=>!m||m>=600?"∞":m<12?m+"mo":Math.floor(m/12)+"y "+(m%12)+"mo";
        const avRoad=av;
        return(
          <Modal title="Payoff Simulator" icon={Calculator} onClose={cl} accent={C.green} wide>
            <div style={{fontSize:12,color:C.textLight,lineHeight:1.55,marginBottom:14,padding:"10px 12px",background:C.surfaceAlt,borderRadius:12,border:`1px solid ${C.border}`}}>
              Uses <strong>APR÷12</strong> for this preview. Logged payments still use <strong>actual/365</strong> on loans. Each month: pay every open debt's minimum, then send what's left (including the slider) to the strategy. Paid-off debts drop out of the minimum total.
            </div>
            <div style={{background:C.navy,borderRadius:14,padding:16,marginBottom:14,color:"#fff"}}>
              <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",marginBottom:4}}>TOTAL DEBT</div>
              <div style={{fontFamily:MF,fontSize:26,fontWeight:800,color:C.red}}>{fmt(sumDebtsPrincipalAndAccrued(debts))}</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.45)",marginTop:6,lineHeight:1.45}}>
                Active minimums now: <strong>{fmt(tm)}/mo</strong>
                <br/>
                Minimums + high-rate first, no extra: {minBase.debtFree?<><strong>{fmtMo(minBase.months)}</strong> · {fmt(minBase.totalInterest)} est. interest</>:"raise payments on at least one debt"}
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5}}>Extra monthly (after mins)</div>
                <div style={{fontFamily:MF,fontWeight:800,fontSize:18,color:C.accent}}>{ex>0?"+"+fmt(ex):"$0"}</div>
              </div>
              <input type="range" min="0" max="1000" step="25" value={extraPayDebt} onChange={e=>setExtraPayDebt(parseFloat(e.target.value)||0)} style={{width:"100%",accentColor:C.accent,cursor:"pointer",marginBottom:6}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.textFaint}}><span>$0</span><span>$500</span><span>$1,000</span></div>
              <div style={{marginTop:8,fontSize:12,color:C.textLight}}>Cash to debt (est.): <span style={{fontWeight:700,color:C.text}}>{fmt(tm+ex)}/mo</span></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,158px),1fr))",gap:10,marginBottom:14,width:"100%",minWidth:0,boxSizing:"border-box"}}>
              {[{label:"🔥 Avalanche",sub:"Highest APR first",r:av,c:C.green},{label:"❄️ Snowball",sub:"Smallest balance first",r:sn,c:C.accent}].map(s=>(
                <div key={s.label} style={{background:C.surface,border:`1.5px solid ${s.c}44`,borderRadius:14,padding:14,borderTop:`3px solid ${s.c}`,minWidth:0,boxSizing:"border-box"}}>
                  <div style={{fontFamily:MF,fontWeight:800,fontSize:13,color:s.c,marginBottom:2}}>{s.label}</div>
                  <div style={{fontSize:11,color:C.textLight,marginBottom:10}}>{s.sub}</div>
                  <div style={{marginBottom:6}}>
                    <div style={{fontSize:10,color:C.textLight,fontWeight:600,marginBottom:2}}>DEBT FREE</div>
                    <div style={{fontFamily:MF,fontWeight:800,fontSize:18,color:C.text}}>{fmtMo(s.r.months)}</div>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:C.textLight,fontWeight:600,marginBottom:2}}>INTEREST (est.)</div>
                    <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.red}}>{s.r.debtFree?fmt(s.r.totalInterest):"—"}</div>
                  </div>
                </div>
              ))}
            </div>
            {diff>0.01&&<div style={{background:C.greenBg,border:`1px solid ${C.greenMid}`,borderRadius:12,padding:"11px 14px",fontSize:13,color:C.green,fontWeight:500}}>💡 At +{fmt(ex)}/mo, avalanche saves <strong>{fmt(diff)}</strong> vs snowball</div>}
            {avRoad.milestones.length>0&&ex>0&&(
              <div style={{marginTop:12}}>
                <div style={{fontSize:11,fontWeight:700,color:C.slate,marginBottom:6}}>First payoffs (avalanche + extra)</div>
                <div style={{fontSize:12,color:C.text,lineHeight:1.65}}>
                  {avRoad.milestones.slice(0,5).map((m,i)=>(<div key={String(m.id)+"_"+i}>Month {m.month}: <strong>{m.name}</strong></div>))}
                </div>
              </div>
            )}
          </Modal>
        );
      })()} 

      {showImport&&<BankImportModal categories={categories} expenses={expenses} setExpenses={setExpenses} household={household} showToast={showToast} onClose={()=>setShowImport(false)}/>}
      {showExport&&<ExportModal expenses={expenses} bills={bills} debts={debts} accounts={accounts} income={income} savingsGoals={savingsGoals} budgetGoals={budgetGoals} trades={trades} shifts={shifts} categories={categories} appName={appName} greetName={greetName} tradingAccount={tradingAccount} onClose={()=>setShowExport(false)}/>}
      {paycheckDepCtx&&<PaycheckDepositModal ctx={paycheckDepCtx} onClose={()=>setPaycheckDepCtx(null)} accounts={accounts} income={income} settings={settings} setAccounts={setAccounts} setIncome={setIncome} setSettings={setSettings} showToast={showToast}/>}
      {confirm&&<ConfirmDialog title={confirm.title} message={confirm.message} onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)} danger={confirm.danger}/>}
      {editItem&&editItem.type==="expense"&&<EditModal item={editItem} categories={categories} household={household} debts={debts} accounts={accounts} settings={settings} onSave={u=>{const oldA=parseFloat(editItem.data.amount)||0;const newA=parseFloat(u.amount)||0;const oldP=normalizePaidFrom(editItem.data.paidFrom);const newP=normalizePaidFrom(u.paidFrom);const oldC=editItem.data.creditDebtId?String(editItem.data.creditDebtId):"";const newC=newP==="credit"?(String(u.creditDebtId||"").trim()||pickDefaultCreditDebtId(settings,debts)):"";const oldB=resolveBankAccountIdForExpense(oldP,editItem.data.bankAccountId,accounts,settings);const newB=resolveBankAccountIdForExpense(newP,u.bankAccountId,accounts,settings);if(newP==="credit"&&cardDebtsList(debts).length&&!newC){showToast("Select which credit card, or set a default in Settings \u2192 Defaults","error");return false;}if(newP==="credit"&&!cardDebtsList(debts).length){showToast("Add a credit card debt first","error");return false;}if(oldA>0&&oldP!=="none"&&!canReverseExpenseBalance(oldP,oldC,editItem.data.bankAccountId,accounts,debts,settings)){showToast("Can\u2019t save: this expense no longer has valid pay-from targets for balance moves. Delete it or fix Accounts/Debt first.","error");return false;}applyRefund(oldP,oldA,oldC||undefined,oldB||undefined);applySpend(newP,newA,newC||undefined,newB||undefined);setExpenses(p=>p.map(x=>x.id===editItem.data.id?{...x,...u,paidFrom:newP,creditDebtId:newP==="credit"?newC:undefined,bankAccountId:newB||undefined}:x));showToast("✓ Expense updated");setEditItem(null);return true;}} onDelete={()=>setConfirm({title:"Delete Expense",message:`Delete "${editItem.data.name}"?`,onConfirm:()=>{const ob=resolveBankAccountIdForExpense(normalizePaidFrom(editItem.data.paidFrom),editItem.data.bankAccountId,accounts,settings);const oa=parseFloat(editItem.data.amount)||0;const opf=normalizePaidFrom(editItem.data.paidFrom);const ocbd=canReverseExpenseBalance(opf,editItem.data.creditDebtId,editItem.data.bankAccountId,accounts,debts,settings);if(applyRefund&&oa>0&&ocbd)applyRefund(opf,oa,editItem.data.creditDebtId||undefined,ob||undefined);else if(oa>0&&!ocbd)showToast("Deleted — balances unchanged (expense had invalid pay-from).","error");setExpenses(p=>p.filter(x=>x.id!==editItem.data.id));setEditItem(null);setConfirm(null);},danger:true})} onClose={()=>setEditItem(null)}/>}
      {editItem&&editItem.type==="bill"&&<EditModal item={editItem} categories={categories} debts={debts} accounts={accounts} settings={settings} onSave={u=>saveBillEditWithBalanceAdjustment(editItem.data,u)} onDelete={()=>setConfirm({title:"Delete Bill",message:`Delete "${editItem.data.name}"?`,onConfirm:()=>{const rev=reversePaidBillForDelete(editItem.data);setBills(p=>p.filter(x=>x.id!==editItem.data.id));if(editItem.data.paid)showToast(rev.reversed?"Bill removed — payment reversed":"Bill removed — balances unchanged (pay-from no longer resolves)","error");setEditItem(null);setConfirm(null);},danger:true})} onClose={()=>setEditItem(null)}/>}
      {editItem&&editItem.type==="debt"&&<EditModal key={editItem.data.id} item={editItem} categories={categories} household={household} debts={debts} bills={bills} accounts={accounts} settings={settings} onSave={u=>{const {addLoanBill,loanBillDueDate,billPaidFrom,billBankAccountId,...debtRest}=u;const did=editItem.data.id;const dk=u.debtKind==="credit_card"?"credit_card":"loan";const resetIntAcc=dk!=="credit_card"&&(parseFloat(debtRest.balance||0)!==parseFloat(editItem.data.balance||0)||String(debtRest.rate??"")!==String(editItem.data.rate??""));const becameLoan=dk!=="credit_card"&&editItem.data.debtKind==="credit_card";setDebts(p=>p.map(x=>String(x.id)!==String(did)?x:(()=>{const row={...x,...debtRest};if(resetIntAcc||becameLoan){row.loanInterestAsOfDate=todayStr();delete row.loanAccruedInterest;}return row;})()));setBills(p=>{if(dk==="credit_card")return p.filter(b=>String(b.linkedDebtId)!==String(did));const mp=parseFloat(u.minPayment||0);const want=addLoanBill!==false&&mp>0;if(want){let bpf=normalizePaidFrom(billPaidFrom||settings.defaultBillPaidFrom||"checking");if(bpf==="credit")bpf="checking";const bch=cashAccountsByKind(accounts,"checking");const bsv=cashAccountsByKind(accounts,"savings");let bbid="";if(bpf==="checking"){if(bch.length>=2)bbid=String(billBankAccountId||pickDefaultBankAccountId("checking",accounts,settings)||"");else if(bch.length===1)bbid=String(bch[0].id);}else if(bpf==="savings"){if(bsv.length>=2)bbid=String(billBankAccountId||pickDefaultBankAccountId("savings",accounts,settings)||"");else if(bsv.length===1)bbid=String(bsv[0].id);}const due=loanBillDueDate||todayStr();const payName=(u.name||"Loan")+" payment";const linked=p.filter(b=>String(b.linkedDebtId)===String(did));if(linked.length)return p.map(b=>String(b.linkedDebtId)!==String(did)?b:{...b,name:payName,amount:String(mp),dueDate:due,paidFrom:bpf,...(bbid?{bankAccountId:bbid}:{})});return[...p,{id:Date.now(),name:payName,amount:String(mp),dueDate:due,recurring:"Monthly",paid:false,autoPay:false,paidBy:"me",paidFrom:bpf,linkedDebtId:String(did),...(bbid?{bankAccountId:bbid}:{})}];}return p.filter(b=>String(b.linkedDebtId)!==String(did));});showToast("✓ Debt updated");setEditItem(null);}} onDelete={()=>setConfirm({title:"Delete Debt",message:`Delete "${editItem.data.name}"?`,onConfirm:()=>deleteDebtSafely(editItem.data),danger:true})} onClose={()=>setEditItem(null)}/>}
      {modal==="quickactions"&&(()=>{
        const QA_ALL=[{id:"expense",l:"Log Expense",ic:"💸"},{id:"receipt",l:"Add from Photo",ic:"📷"},{id:"bill",l:"Add Bill",ic:"📅"},{id:"debt",l:"Add Debt",ic:"💳"},{id:"simulator",l:"Payoff Sim",ic:"🧮"},{id:"budget",l:"Envelopes",ic:"📦"},{id:"shift",l:"Log Shift",ic:"🏥"},{id:"trade",l:"Log Trade",ic:"📈"},{id:"savings",l:"Add Goal",ic:"🎯"},{id:"networth",l:"Net Worth",ic:"📈"},{id:"insights",l:"Insights",ic:"📊"},{id:"paycheck",l:"Paycheck",ic:"💰"},{id:"health",l:"Health Score",ic:"❤️"},{id:"bills_nav",l:"View Bills",ic:"📅"},{id:"calendar_nav",l:"Calendar",ic:"📅"},{id:"recurring_nav",l:"Recurring",ic:"🔄"}];
        const active=settings.quickActions||["expense","bill","paycheck","debt","health","budget","savings","insights"];
        const toggle=id=>setSettings(p=>{const cur=p.quickActions||["expense","bill","paycheck","debt","health","budget","savings","insights"];const next=cur.includes(id)?cur.filter(x=>x!==id):cur.length<8?[...cur,id]:cur;return{...p,quickActions:next};});
        return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:9999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setModal(null)}><div style={{background:C.surface,borderRadius:"24px 24px 0 0",padding:28,width:"100%",maxWidth:480,maxHeight:"80vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}><div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text,marginBottom:4}}>Customize Quick Actions</div><div style={{fontSize:13,color:C.textLight,marginBottom:18}}>Choose up to 8 actions</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>{QA_ALL.map(q=>{const on=active.includes(q.id);return(<button key={q.id} onClick={()=>toggle(q.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderRadius:14,border:`2px solid ${on?C.accent:C.border}`,background:on?C.accentBg:"#fff",cursor:"pointer",textAlign:"left"}}><span style={{fontSize:20}}>{q.ic}</span><span style={{fontSize:13,fontWeight:700,color:on?C.accent:C.text}}>{q.l}</span>{on&&<Check size={14} color={C.accent} style={{marginLeft:"auto",flexShrink:0}}/>}</button>);})}</div><button onClick={()=>setModal(null)} style={{width:"100%",padding:"14px",borderRadius:14,border:"none",background:C.accent,color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:MF}}>Done</button></div></div>);
      })()}
    </div>
    </TrackfiRechartsProvider>
  );
}

if(typeof window!=="undefined"){
  window.addEventListener("error",function(e){
    console.error("GLOBAL ERROR:",e.message,e.filename,e.lineno,e.colno,e.error?.stack);
  });
}

export default function App(){
  return(
    <ErrorBoundary>
      <div style={{flex:1,minHeight:0,height:"100%",maxHeight:"100dvh",width:"100%",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <AppInner/>
      </div>
    </ErrorBoundary>
  );
}