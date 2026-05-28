import React, { useState, useEffect } from "react";
import { Plus, Calendar, Trash2 } from "lucide-react";
import { C, MF } from "../theme.js";
import { fmt, todayStr } from "../lib/moneyFormat.js";
import { Modal, FI, FS, ConfirmDialog, SwipeRow, Empty } from "../components/ui.jsx";
import { EmojiPicker } from "../components/EmojiPicker.jsx";
import { normalizePaidFrom, pickDefaultBankAccountId, pickDefaultCreditDebtId, resolveBankAccountIdForExpense, validateCashSpendPrerequisites, PAID_FROM_OPTIONS, PAID_FROM_FS_LABELS } from "../lib/accountsLogic.js";
import { fmtDate } from "../lib/dateHelpers.js";
import { shiftRecurringBillDueDate } from "../lib/billDueDates.js";
import { getScope } from "../lib/supabase.js";
import { cardDebtsList } from "../lib/creditCardTotals.js";
import { cashAccountsByKind } from "../lib/cashAccounts.js";

export default function RecurringView({expenses,setExpenses,categories,showToast,appReady,recurrings,setRecurrings,applySpend,defaultExpensePaidFrom,accounts={},settings={},debts=[]}){
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
