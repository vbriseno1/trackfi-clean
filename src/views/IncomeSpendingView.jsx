import React, { useState, useMemo } from "react";
import { C, MF, FULL_MOS } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";
import { RechartsReady, ChartPanel, useChartTheme } from "../components/RechartsBridge.jsx";
import { chartColor } from "../lib/chartTheme.js";
import { BarProg } from "../components/ui.jsx";

export default function IncomeSpendingView({expenses,income,trades,bills=[]}){
  const ct=useChartTheme();
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
  return(
    <div className="fu">
      {(()=>{
        const sources=[{l:"Primary",v:parseFloat(income.primary||0)},{l:"Trading",v:parseFloat(income.trading||0)},{l:"Freelance",v:parseFloat(income.freelance||0)},{l:"Rental",v:parseFloat(income.rental||0)},{l:"Dividends",v:parseFloat(income.dividends||0)},{l:"Other",v:parseFloat(income.other||0)}].filter(s=>s.v>0);
        const total=sources.reduce((s,x)=>s+x.v,0);
        if(!total)return null;
        return(
          <ChartPanel title="Income breakdown" subtitle="Configured income sources">
            <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",minWidth:0}}>
              <RechartsReady minHeight={120} render={R=>(
                <R.PieChart width={120} height={120}>
                  <R.Pie data={sources.map(s=>({name:s.l,value:s.v}))} cx={55} cy={55} innerRadius={36} outerRadius={52} dataKey="value" paddingAngle={2} stroke="none">
                    {sources.map((s,i)=><R.Cell key={s.l} fill={chartColor(i)}/>)}
                  </R.Pie>
                  <R.Tooltip formatter={(v)=>fmt(v)} contentStyle={ct.tooltipStyle}/>
                </R.PieChart>
              )}/>
              <div style={{flex:1,minWidth:120}}>{sources.map((s,i)=>(<div key={s.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:2,background:chartColor(i)}}/><span style={{fontSize:12,color:C.textMid}}>{s.l}</span></div><div style={{textAlign:"right"}}><span style={{fontFamily:MF,fontWeight:700,fontSize:12,color:C.text}}>{fmt(s.v)}</span><span style={{fontSize:11,color:C.textFaint,marginLeft:4}}>{(s.v/total*100).toFixed(0)}%</span></div></div>))}</div>
            </div>
          </ChartPanel>
        );
      })()}
      <div className="fv-page-title" style={{marginBottom:4}}>Income vs spending</div>
      <div className="fv-page-sub" style={{marginBottom:12}}>Compare cash flow over time</div>
      <div style={{display:"flex",gap:6,background:C.borderLight,borderRadius:10,padding:3,marginBottom:16}}>
        {["1M","3M","6M","1Y"].map(r=><button key={r} type="button" className="ba" onClick={()=>setRange(r)} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",background:range===r?C.surface:"transparent",color:range===r?C.accent:C.textLight,fontWeight:range===r?700:500,fontSize:13,cursor:"pointer",boxShadow:range===r?"0 1px 3px rgba(15,23,42,.08)":"none"}}>{r}</button>)}
      </div>
      <ChartPanel title="Monthly comparison" subtitle="Bars: income, spending, saved · line: savings rate">
        <div style={{display:"flex",gap:12,paddingLeft:4,marginBottom:10,flexWrap:"wrap"}}>{[[C.positive,"Income"],[C.negative,"Spending"],[C.accent,"Saved"],[C.teal,"Savings %"]].map(([c,l])=><div key={l} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:10,borderRadius:2,background:c}}/><span style={{fontSize:12,color:C.textLight}}>{l}</span></div>)}</div>
        <RechartsReady minHeight={220} render={R=>(
          <R.ResponsiveContainer width="100%" height={220}>
            <R.ComposedChart data={data.map(m=>({...m,savingsRate:m.income>0?Math.max(0,((m.income-m.spending)/m.income)*100):0}))} margin={ct.marginWide} barGap={3}>
              <R.CartesianGrid stroke={ct.gridStroke} strokeDasharray="3 3" vertical={false}/>
              <R.XAxis dataKey="month" tick={ct.axisTickSm} axisLine={false} tickLine={false}/>
              <R.YAxis yAxisId="left" tick={ct.axisTickSm} axisLine={false} tickLine={false} tickFormatter={ct.formatYAxis} width={40}/>
              <R.YAxis yAxisId="right" orientation="right" tick={{...ct.axisTickSm,fill:C.teal}} axisLine={false} tickLine={false} tickFormatter={v=>v.toFixed(0)+"%"} width={32}/>
              <R.Tooltip contentStyle={ct.tooltipStyle} formatter={(v,n)=>[n==="savingsRate"?v.toFixed(0)+"%":fmt(v),n==="savingsRate"?"Savings %":n]}/>
              <R.Bar yAxisId="left" dataKey="income" name="Income" fill={C.positive} radius={ct.barRadius}/>
              <R.Bar yAxisId="left" dataKey="spending" name="Spending" fill={C.negative} radius={ct.barRadius}/>
              <R.Bar yAxisId="left" dataKey="saved" name="Saved" fill={C.accent} radius={ct.barRadius}/>
              <R.Line yAxisId="right" type="monotone" dataKey="savingsRate" name="Savings %" stroke={C.teal} strokeWidth={2} dot={{r:2,fill:C.teal}} activeDot={{r:4}}/>
            </R.ComposedChart>
          </R.ResponsiveContainer>
        )}/>
      </ChartPanel>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {data.map(m=>{const rate=m.income>0?Math.max(0,(m.income-m.spending)/m.income*100):0;return(<div key={m.month} className="fv-card" style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:12,marginBottom:0}}><div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text,width:32}}>{m.month}</div><div style={{flex:1}}><BarProg pct={m.income>0?m.spending/m.income*100:0} color={m.spending>m.income?C.negative:C.positive} h={5}/></div><div style={{textAlign:"right",minWidth:80}}><div style={{fontFamily:MF,fontWeight:700,fontSize:13,color:C.negative}}>{fmt(m.spending)}</div><div style={{fontSize:11,color:C.textLight}}>{rate.toFixed(0)}% saved</div></div></div>);})}
      </div>
    </div>
  );
}
