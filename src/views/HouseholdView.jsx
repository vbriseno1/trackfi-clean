import React, { useState, useMemo } from "react";
import { Plus, X, Trash2, Users, Wallet } from "lucide-react";
import { C, MF } from "../theme.js";
import { fmt, todayStr } from "../lib/moneyFormat.js";
import { Modal, FI, FS, BarProg } from "../components/ui.jsx";
import { optimizedSettlementPairs } from "../lib/household.js";

export default function HouseholdView({household,setHousehold,expenses,bills=[],showToast,setBills,settlements,setSettlements,hhBudgets,setHhBudgets}){
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
          <div className="fv-page-title">{household.name||"Household"}</div>
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
