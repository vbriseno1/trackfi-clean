import React, { useState, useMemo } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { C, MF, FULL_MOS } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";

const TODAY = new Date();

export default function CalendarView({expenses,bills,calColors,setCalColors,setExpenses,onAdd}){
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
    <div className="fu fv-view-root">
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
      {monthTotal>0&&<div className="fv-grid-3" style={{marginBottom:12}}>
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
