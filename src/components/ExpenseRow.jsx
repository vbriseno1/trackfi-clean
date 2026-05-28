import React from "react";
import { Trash2 } from "lucide-react";
import { C, MF } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";

export function ExpenseRow({e,cat,onEdit,onDelete}){
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
