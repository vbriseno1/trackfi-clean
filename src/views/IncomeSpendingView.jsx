import React, { useState, useMemo } from "react";
import { C, MF, FULL_MOS } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";
import { RechartsReady } from "../components/RechartsBridge.jsx";
import { BarProg } from "../components/ui.jsx";

export default function IncomeSpendingView({expenses,income,trades,bills=[]}){
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
