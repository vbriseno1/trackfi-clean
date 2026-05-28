import React, { useState, useMemo, useEffect } from "react";
import { Plus, Search, X, Filter, Tag, Wallet, Check, Scale, Target } from "lucide-react";
import { C, MF, FULL_MOS, PIE_COLORS } from "../theme.js";
import { fmt, todayStr } from "../lib/moneyFormat.js";
import { BarProg, SH, Empty, Modal, FI, FS } from "../components/ui.jsx";
import { ExpenseRow } from "../components/ExpenseRow.jsx";
import { normalizePaidFrom, sumMtdByPaidFrom, canReverseExpenseBalance, resolveBankAccountIdForExpense, validateCashSpendPrerequisites, PAID_FROM_OPTIONS, PAID_FROM_FS_LABELS } from "../lib/accountsLogic.js";
import { cardDebtsList } from "../lib/creditCardTotals.js";
import { cashAccountsByKind } from "../lib/cashAccounts.js";
export default function SpendingView({expenses,setExpenses,budgetGoals,setBGoals,categories,setEditItem,onAdd,showToast,showUndoToast,household,applySpend,applyRefund,accounts={},debts=[],settings={}}){
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
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,gap:10}}><div style={{minWidth:0,flex:1}}><div className="fv-page-title">Spending</div><div className="fv-page-sub">Total: {fmt(totalExp)}{dateFilter==="month"&&prevMonthTotal>0?` · ${momDiff>=0?"+":""}${momDiff.toFixed(0)}% vs last month`:""}</div></div><div style={{display:"flex",gap:6,flexShrink:0}}>{selectMode?<><button className="ba" onClick={deleteSelectedExpenses} style={{background:selected.size>0?C.red:C.redBg,border:`1px solid ${C.redMid}`,borderRadius:10,padding:"8px 12px",color:selected.size>0?"#fff":C.red,fontWeight:700,fontSize:12,cursor:"pointer"}}>Delete {selected.size>0?"("+selected.size+")":""}</button><button className="ba" onClick={()=>{setSelectMode(false);setSelected(new Set());}} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 12px",color:C.textMid,fontWeight:600,fontSize:12,cursor:"pointer"}}>Cancel</button></>:<><button className="ba" onClick={()=>setSelectMode(true)} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 10px",color:C.textMid,fontWeight:600,fontSize:12,cursor:"pointer"}}>Select</button><button className="ba" onClick={onAdd} style={{display:"flex",alignItems:"center",gap:5,background:C.accent,border:"none",borderRadius:10,padding:"8px 16px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",boxShadow:`0 2px 8px ${C.accent}40`}}><Plus size={12}/>Expense</button></> }</div></div>
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
      {!searchQ&&filteredExp.length>=7&&(()=>{const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];const dow=[0,1,2,3,4,5,6].map(d=>filteredExp.filter(e=>new Date(e.date+"T00:00:00").getDay()===d).reduce((s,e)=>s+(parseFloat(e.amount)||0),0));const max=Math.max(...dow)||1;const topDay=dow.indexOf(max);return(<div className="fv-card" style={{padding:16,marginBottom:14}}><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:12}}>Spending by day</div><div style={{display:"flex",gap:4,alignItems:"flex-end",height:60}}>{dow.map((amt,d)=>{const h=Math.max(4,Math.round((amt/max)*52));return(<div key={d} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><div style={{width:"100%",height:h,background:d===topDay?C.accent:C.accentBg,borderRadius:"4px 4px 0 0",transition:"height .4s",opacity:d===topDay?1:.85}}/><div style={{fontSize:9,color:d===topDay?C.accent:C.textFaint,fontWeight:d===topDay?700:400}}>{DAYS[d]}</div></div>);})}</div><div style={{fontSize:11,color:C.textLight,marginTop:8}}>{DAYS[topDay]} is your highest spending day · {fmt(max)}</div></div>);})()}

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
}
