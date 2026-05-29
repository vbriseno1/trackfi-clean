import React, { useState, useMemo } from "react";
import { Plus, Target, X, ChevronRight, Trash2, Calendar } from "lucide-react";
import { C, MF, PIE_COLORS, FULL_MOS } from "../theme.js";
import { fmt, todayStr } from "../lib/moneyFormat.js";
import { Modal, FI, FS, BarProg } from "../components/ui.jsx";
import { GoalRing } from "../components/GoalRing.jsx";
import { RechartsReady, ChartPanel, useChartTheme } from "../components/RechartsBridge.jsx";
import { chartColor } from "../lib/chartTheme.js";
import { EmojiPicker } from "../components/EmojiPicker.jsx";
import { ColorSwatchPicker } from "../components/ColorSwatchPicker.jsx";
import { CHOOSEABLE_COLORS } from "../lib/colorPalettes.js";
import { normalizePaidFrom, pickDefaultBankAccountId, hasCashSubaccounts, PAID_FROM_OPTIONS, PAID_FROM_FS_LABELS } from "../lib/accountsLogic.js";
import { cashAccountsByKind } from "../lib/cashAccounts.js";

export default function SavingsGoalsView({goals,setGoals,income,accounts,accountRates={},setAccountRates,showToast,applySpend,settings={}}){
  const ct=useChartTheme();
  const[view,setView]=useState("rings");
  const[editGoal,setEditGoal]=useState(null);
  const[editForm,setEditForm]=useState({});
  const[showAdd,setShowAdd]=useState(false);
  const[form,setForm]=useState({});
  const ff=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  function add(){if(!form.name||!form.target)return;setGoals(p=>[...p,{id:Date.now().toString(),name:form.name,target:parseFloat(form.target),saved:parseFloat(form.saved||0),monthly:parseFloat(form.monthly||0),icon:form.icon||"🎯",color:form.color||defaultGoalColor}]);showToast&&showToast("Goal added — "+form.name);setForm({});setShowAdd(false);}
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
      if(newPct>oldPct)setTimeout(()=>showToast&&showToast(newSaved>=tgt?"Goal complete: "+g.name:newPct+"% reached — "+g.name),100);
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
        <div onClick={()=>{setEditGoal(goal);setEditForm({name:goal.name,target:String(goal.target),monthly:String(goal.monthly||0),saved:String(goal.saved||0),color:goal.color||defaultGoalColor});}} style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,marginBottom:2,textAlign:"center",cursor:"pointer"}}>{goal.name} <span style={{fontSize:11,color:C.textLight}}>✎</span></div>
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
  const defaultGoalColor=CHOOSEABLE_COLORS[5];
  return(
    <div className="fu fv-view-root">
      <div style={{display:"flex",gap:6,background:C.borderLight,borderRadius:12,padding:4,marginBottom:16}}>
        {[["rings","Rings"],["list","List"],["earn","Earn"]].map(([id,l])=>(<button key={id} type="button" className="ba" onClick={()=>setView(id)} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",background:view===id?C.surface:"transparent",color:view===id?C.accent:C.textLight,fontWeight:view===id?700:500,fontSize:13,cursor:"pointer",boxShadow:view===id?"0 1px 3px rgba(15,23,42,.08)":"none"}}>{l}</button>))}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:goals.length>0?10:16}}>
        <div><div className="fv-page-title">Savings Goals</div><div className="fv-page-sub">{goals.length} goal{goals.length!==1?"s":""} · {fmt(goals.reduce((s,g)=>s+(parseFloat(g.saved||0)),0))} saved total</div></div>
        <button onClick={()=>setShowAdd(true)} style={{display:"flex",alignItems:"center",gap:5,background:C.accent,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer"}}><Plus size={13}/>Add Goal</button>
      </div>
      {goals.length>0&&(()=>{
        const totalTarget=goals.reduce((s,g)=>s+(parseFloat(g.target||0)),0);
        const totalSaved=goals.reduce((s,g)=>s+(parseFloat(g.saved||0)),0);
        if(!totalTarget)return null;
        const pct=Math.min(100,(totalSaved/totalTarget)*100);
        const complete=goals.filter(g=>parseFloat(g.saved||0)>=parseFloat(g.target||1)).length;
        const nearComplete=goals.filter(g=>{const p=parseFloat(g.target||1)>0?(parseFloat(g.saved||0)/parseFloat(g.target))*100:0;return p>=75&&p<100;});
        return(
          <div className="fv-hero-panel" style={{marginBottom:14}}>
            <div className="fv-stat-label" style={{color:"rgba(255,255,255,.55)",marginBottom:4}}>All goals</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:10}}>
              <div><div style={{fontFamily:MF,fontWeight:800,fontSize:26,color:"#fff"}}>{fmt(totalSaved)}</div><div style={{fontSize:12,color:"rgba(255,255,255,.5)"}}>of {fmt(totalTarget)} total</div></div>
              <div style={{textAlign:"right"}}><div style={{fontFamily:MF,fontWeight:800,fontSize:22,color:C.positiveMid}}>{pct.toFixed(0)}%</div><div style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>{complete}/{goals.length} complete</div></div>
            </div>
            <div style={{height:8,background:"rgba(255,255,255,.12)",borderRadius:99,overflow:"hidden",marginBottom:nearComplete.length?8:0}}>
              <div style={{height:"100%",width:pct.toFixed(1)+"%",background:C.positiveMid,borderRadius:99,transition:"width .6s"}}/>
            </div>
            {nearComplete.length>0&&<div style={{fontSize:12,color:C.amberMid,fontWeight:500}}>{nearComplete.map(g=>g.name).join(", ")} almost done</div>}
          </div>
        );
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
        return(
          <ChartPanel title="12-month projection" subtitle="Where each goal lands with monthly contributions">
            <RechartsReady minHeight={160} render={R=>(
            <R.ResponsiveContainer width="100%" height={160}>
              <R.LineChart data={chartData} margin={ct.marginWide}>
                <R.CartesianGrid stroke={ct.gridStroke} strokeDasharray="3 3" vertical={false}/>
                <R.XAxis dataKey="month" tick={ct.axisTickSm} axisLine={false} tickLine={false}/>
                <R.YAxis tick={ct.axisTickSm} axisLine={false} tickLine={false} tickFormatter={ct.formatYAxis} width={42}/>
                <R.Tooltip formatter={(v,n)=>[fmt(v),n]} contentStyle={ct.tooltipStyle}/>
                {goals.filter(g=>parseFloat(g.monthly||0)>0).map((g,i)=>(
                  <R.Line key={g.id} type="monotone" dataKey={g.name} stroke={g.color||chartColor(i)} strokeWidth={ct.areaStrokeWidth} dot={false} strokeDasharray={i>0?"4 2":"none"}/>
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
                  <div style={{width:10,height:2,background:g.color||chartColor(i),borderRadius:1}}/>
                  <span style={{color:C.textMid,fontWeight:500}}>{g.name}</span>
                  {months2>0&&<span style={{color:C.textLight}}>·{months2}mo</span>}
                </div>);
              })}
            </div>
          </ChartPanel>
        );
      })()}
      {goals.length===0&&<div className="fv-card" style={{textAlign:"center",padding:"40px 20px",marginBottom:16}}><Target size={32} color={C.textLight} style={{margin:"0 auto 12px"}}/><div style={{fontFamily:MF,fontSize:16,fontWeight:700,color:C.text,marginBottom:8}}>No savings goals yet</div><div style={{fontSize:13,color:C.textLight,marginBottom:20}}>Set a goal and watch your ring fill up</div><button onClick={()=>setShowAdd(true)} style={{padding:"12px 24px",borderRadius:14,background:C.accent,border:"none",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>Add First Goal</button></div>}
      {view==="rings"&&<div className="fv-grid-2" style={{marginBottom:16}}>
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
              <button onClick={()=>{setEditGoal(g);setEditForm({name:g.name,target:String(g.target),monthly:String(g.monthly||0),saved:String(g.saved||0),color:g.color||defaultGoalColor});}} style={{padding:"8px 10px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,cursor:"pointer",fontSize:12,color:C.textMid,fontWeight:600}}>Edit</button>
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
            <div className="fv-hero-panel" style={{marginBottom:14}}>
              <div className="fv-stat-label" style={{color:"rgba(255,255,255,.55)",marginBottom:4}}>Your money earns</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:10}}>
                <div>
                  <div style={{fontFamily:MF,fontWeight:900,fontSize:32,color:C.positiveMid,letterSpacing:-1}}>{fmt(totalYearlyEarnings)}/yr</div>
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
                <div className="fv-page-title" style={{fontSize:14,marginBottom:2}}>Personalized tips</div>
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
      {editGoal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:9999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setEditGoal(null)}>
          <div style={{background:"#fff",borderRadius:"24px 24px 0 0",padding:28,width:"100%",maxWidth:480}} onClick={e=>e.stopPropagation()}>
            <div className="fv-page-title" style={{fontSize:18,marginBottom:16}}>Edit goal</div>
            <FI label="Goal Name" value={editForm.name||""} onChange={e=>setEditForm(p=>({...p,name:e.target.value}))}/>
            <div style={{display:"flex",gap:10}}>
              <FI half label="Target ($)" type="number" value={editForm.target||""} onChange={e=>setEditForm(p=>({...p,target:e.target.value}))}/>
              <FI half label="Saved ($)" type="number" value={editForm.saved||""} onChange={e=>setEditForm(p=>({...p,saved:e.target.value}))}/>
            </div>
            <FI label="Monthly Contribution ($)" type="number" value={editForm.monthly||""} onChange={e=>setEditForm(p=>({...p,monthly:e.target.value}))}/>
            <div style={{marginBottom:16}}>
              <ColorSwatchPicker label="Color" value={editForm.color||defaultGoalColor} onChange={(c)=>setEditForm(p=>({...p,color:c}))}/>
            </div>
            <div style={{display:"flex",gap:10,marginTop:8}}>
              <button onClick={()=>setEditGoal(null)} style={{flex:1,padding:"13px",borderRadius:14,border:`1.5px solid ${C.border}`,background:C.surface,color:C.textMid,fontWeight:700,fontSize:16,cursor:"pointer"}}>Cancel</button>
              <button onClick={()=>{setGoals(p=>p.map(g=>g.id===editGoal.id?{...g,name:editForm.name||g.name,target:parseFloat(editForm.target)||g.target,saved:parseFloat(editForm.saved||0),monthly:parseFloat(editForm.monthly||0),color:editForm.color||g.color}:g));showToast&&showToast("Goal updated!");setEditGoal(null);}} style={{flex:2,padding:"13px",borderRadius:14,border:"none",background:C.accent,color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:MF}}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
            {showAdd&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:9999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowAdd(false)}>
          <div style={{background:"#fff",borderRadius:"24px 24px 0 0",padding:28,width:"100%",maxWidth:480}} onClick={e=>e.stopPropagation()}>
            <div className="fv-page-title" style={{fontSize:18,marginBottom:16}}>New savings goal</div>
            <FI label="Goal Name" placeholder="Emergency Fund, New Car..." value={form.name||""} onChange={ff("name")} autoFocus/>
            <div style={{display:"flex",gap:10}}><FI half label="Target ($)" type="number" placeholder="5000" value={form.target||""} onChange={ff("target")}/><FI half label="Saved So Far ($)" type="number" placeholder="0" value={form.saved||""} onChange={ff("saved")}/></div>
            <FI label="Monthly Contribution ($)" type="number" placeholder="200" value={form.monthly||""} onChange={ff("monthly")}/>
            <div style={{marginBottom:12}}><div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Icon</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{ICONS.map(ic=><button key={ic} onClick={()=>setForm(p=>({...p,icon:ic}))} style={{fontSize:22,padding:6,borderRadius:10,border:`2px solid ${form.icon===ic?C.accent:C.border}`,background:form.icon===ic?C.accentBg:"#fff",cursor:"pointer"}}>{ic}</button>)}</div></div>
            <div style={{marginBottom:20}}><ColorSwatchPicker label="Color" value={form.color||defaultGoalColor} onChange={(c)=>setForm(p=>({...p,color:c}))}/></div>
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
