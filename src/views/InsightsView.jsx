import React, { useState } from "react";
import { C, MF, FULL_MOS, PIE_COLORS } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";
import { BarProg } from "../components/ui.jsx";
import { RechartsReady, ChartPanel, useChartTheme } from "../components/RechartsBridge.jsx";
import { chartColor } from "../lib/chartTheme.js";
import CategoryDrillView from "./CategoryDrillView.jsx";

export default function InsightsView({expenses,income,bills,debts,budgetGoals,savingsGoals}){
  const ct=useChartTheme();
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
    <div className="fu fv-view-root">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <div className="fv-page-title">Spending Insights</div>

      </div>
      <div className="fv-page-sub" style={{marginBottom:14}}>Deep dive into your spending patterns</div>

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

      <div className="fv-hero-panel" style={{marginBottom:14}}>
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
      {catSorted.length>0&&<ChartPanel title="Top spending this month"><RechartsReady minHeight={Math.min(catSorted.length*38+20,220)} render={R=>(<R.ResponsiveContainer width="100%" height={Math.min(catSorted.length*38+20,220)}><R.BarChart data={catSorted.slice(0,5).map(([name,amt])=>({name,amt}))} layout="vertical" barSize={12} margin={ct.margin}><R.CartesianGrid stroke={ct.gridStroke} strokeDasharray="3 3" horizontal={false}/><R.XAxis type="number" hide/><R.YAxis type="category" dataKey="name" tick={ct.axisTickSm} width={72} tickFormatter={v=>(v&&String(v).length>12?String(v).slice(0,11)+"…":v)} axisLine={false} tickLine={false}/><R.Tooltip formatter={v=>[fmt(v),"Spent"]} contentStyle={ct.tooltipStyle}/><R.Bar dataKey="amt" radius={[0,4,4,0]}>{catSorted.slice(0,5).map((_,i)=><R.Cell key={i} fill={chartColor(i)}/>)}</R.Bar></R.BarChart></R.ResponsiveContainer>)}/></ChartPanel>}

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
          <ChartPanel title="6-month trend" subtitle={`Avg ${fmt(avgSpend)}/mo · ${thisTotal>avgSpend?"above":"below"} average this month`}>
            <RechartsReady minHeight={168} render={R=>(
            <R.ResponsiveContainer width="100%" height={168}>
              <R.BarChart data={months} margin={ct.marginWide} barSize={20}>
                <R.CartesianGrid stroke={ct.gridStroke} strokeDasharray="3 3" vertical={false}/>
                <R.XAxis dataKey="month" tick={ct.axisTick} axisLine={false} tickLine={false}/>
                <R.YAxis tick={ct.axisTickSm} axisLine={false} tickLine={false} tickFormatter={ct.formatYAxis} width={44}/>
                <R.Tooltip formatter={v=>[fmt(v),"Spent"]} contentStyle={ct.tooltipStyle}/>
                <R.Bar dataKey="total" radius={ct.barRadius}>{months.map((m,i)=><R.Cell key={i} fill={m.isCurrent?C.accent:m.total>avgSpend?C.negative+"99":C.border}/>)}</R.Bar>
              </R.BarChart>
            </R.ResponsiveContainer>
            )}/>
          </ChartPanel>
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
                    <div style={{width:"100%",height:h,background:isTop?C.accent:C.borderLight,borderRadius:"3px 3px 0 0",transition:"height .35s ease"}}/>
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
            <div className="insights-hero-grid" style={{marginBottom:16}}>
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
