import React from "react";
import { C, MF } from "../theme.js";

export function CashAccountsBlock({accounts,setAccounts,showToast,variant="settings",onOpenSettings}){
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
        <div key={row.id||idx} className="fv-cash-row">
          <input placeholder="Account name" value={row.name||""} onChange={e=>setAccounts(p=>{const ca=[...(p.cashAccounts||[])];ca[idx]={...ca[idx],name:e.target.value};return{...p,cashAccounts:ca};})} style={{flex:1,minWidth:0,background:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"10px 12px",fontSize:16,color:C.text,outline:"none",boxSizing:"border-box"}}/>
          <select value={row.kind||"checking"} onChange={e=>setAccounts(p=>{const ca=[...(p.cashAccounts||[])];ca[idx]={...ca[idx],kind:e.target.value};return{...p,cashAccounts:ca};})} style={{background:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"10px 12px",fontSize:16,color:C.text,minHeight:44}}>
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
          </select>
          <input type="number" inputMode="decimal" placeholder="Balance" value={row.balance||""} onChange={e=>setAccounts(p=>{const ca=[...(p.cashAccounts||[])];ca[idx]={...ca[idx],balance:e.target.value};return{...p,cashAccounts:ca};})} onBlur={e=>{if(e.target.value)showToast&&showToast("✓ Balance saved");}} style={{width:110,minWidth:0,background:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"10px 12px",fontSize:16,fontFamily:MF,fontWeight:700,color:C.text,outline:"none",textAlign:"right",boxSizing:"border-box"}}/>
          <button type="button" className="ba" onClick={()=>setAccounts(p=>{const ca=[...(p.cashAccounts||[])];ca.splice(idx,1);return{...p,cashAccounts:ca};})} style={{padding:"10px 14px",borderRadius:10,border:`1px solid ${C.border}`,background:C.bg,fontSize:13,color:C.textMid,cursor:"pointer",minHeight:44}}>Remove</button>
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
