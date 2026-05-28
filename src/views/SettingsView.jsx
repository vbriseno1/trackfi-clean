import React, { useState, useRef, useEffect } from "react";
import { Settings as SettingsIcon, Bell, Lock, User, LogOut, ChevronRight, Download, Upload, Trash2, RotateCcw, X, Plus, Database, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";
import { C, MF } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";
import { FS } from "../components/ui.jsx";
import { PINSetup } from "../components/PinLock.jsx";
import { CashAccountsBlock } from "../components/CashAccountsBlock.jsx";
import { PROFESSIONS, getProfession } from "../lib/professions.js";
import { PAID_FROM_OPTIONS, PAID_FROM_FS_LABELS, normalizePaidFrom } from "../lib/accountsLogic.js";
import { cardDebtsList } from "../lib/creditCardTotals.js";
import { cashAccountsByKind } from "../lib/cashAccounts.js";
import { BILL_RESHOW_PRESETS } from "../lib/billsLogic.js";
import { supaFetch } from "../lib/supabase.js";

export default function SettingsView({settings,setSettings,appName,setAppName,greetName,setGreetName,onResetAllData,darkMode,setDarkMode,pinEnabled,setPinEnabled,profCategory,setProfCategory,profSub,setProfSub,expenses,bills,debts,trades,accounts,income,shifts,savingsGoals,budgetGoals,setBills,setDebts,setTrades,setShifts,setSGoals,setBGoals,setAccounts,setIncome,setExpenses,categories,setCategories,onResetOnboarding,onSignOut,onSignIn,userEmail,showToast,household,navTo,backupExport,backupImport,onLoadDemo,cloudSyncBump,supabaseConfigured,skipAuthMode,signedInForSync,netOnline,syncing=false,syncRecoverableError=false}){
  const[nm,setNm]=useState(appName||"");
  const[showPIN,setShowPIN]=useState(false);
  const[showEmailChange,setShowEmailChange]=useState(false);
  const[showPwChange,setShowPwChange]=useState(false);
  const[newEmail,setNewEmail]=useState("");
  const[newPw1,setNewPw1]=useState("");const[newPw2,setNewPw2]=useState("");
  const[acctMsg,setAcctMsg]=useState("");const[acctLoading,setAcctLoading]=useState(false);
  const[pendingImport,setPendingImport]=useState(null);

  const Tog=(k,l,d,ic)=>(<div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${C.border}`}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>{ic}</span><div><div style={{fontSize:14,fontWeight:600,color:C.text}}>{l}</div><div style={{fontSize:12,color:C.textLight}}>{d}</div></div></div><button onClick={()=>setSettings(p=>({...p,[k]:!p[k]}))} style={{background:"none",border:"none",cursor:"pointer",color:settings[k]?C.accent:C.borderLight,padding:0,flexShrink:0}}>{settings[k]?<ToggleRight size={28}/>:<ToggleLeft size={28}/>}</button></div>);

  return(<div className="fu">

    {/* ── Header ─────────────────────────────────── */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{fontFamily:MF,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-.4}}>Settings</div>
    </div>
    {userEmail&&<div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"10px 14px",marginBottom:14,display:"flex",flexWrap:"wrap",alignItems:"center",gap:10,rowGap:8,position:"relative",zIndex:2}}>
      <div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:MF,fontWeight:800,fontSize:13,color:"#fff",flexShrink:0}}>{userEmail[0].toUpperCase()}</div>
      <div style={{flex:"1 1 160px",minWidth:0}}><div style={{fontSize:13,fontWeight:700,color:C.accent,overflowWrap:"anywhere",wordBreak:"break-word"}}>{userEmail}</div><div style={{fontSize:11,color:C.textLight}}>Signed in</div></div>
    </div>}

    {/* ── 1. PROFILE ─────────────────────────────── */}
    <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
        <span style={{fontSize:18}}>👤</span>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Profile</div>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        <div style={{flex:1}}>
          <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>Display Name</div>
          <input value={greetName||""} onChange={e=>setGreetName(e.target.value)} placeholder="Your name" style={{width:"100%",background:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:14,outline:"none"}}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>App Name</div>
          <input value={nm} onChange={e=>setNm(e.target.value)} placeholder="Trackfi" style={{width:"100%",background:C.surfaceAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:14,outline:"none"}}/>
        </div>
      </div>
      <button className="ba" onClick={()=>{if(nm.trim())setAppName(nm.trim());if(greetName?.trim())setGreetName(greetName.trim());showToast&&showToast("✓ Profile saved");}} style={{width:"100%",background:C.accent,border:"none",borderRadius:10,padding:"10px 0",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:14}}>Save Profile</button>
      <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Profession</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
        {PROFESSIONS.map(p=><button key={p.id} onClick={()=>{setProfCategory(p.id);setProfSub(p.subs[0].id);showToast&&showToast("✓ "+p.label);}} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:99,border:`1.5px solid ${profCategory===p.id?C.accent:C.border}`,background:profCategory===p.id?C.accentBg:"#fff",cursor:"pointer"}}><span style={{fontSize:14}}>{p.icon}</span><span style={{fontSize:12,fontWeight:profCategory===p.id?700:500,color:profCategory===p.id?C.accent:C.text}}>{p.label}</span></button>)}
      </div>
      {getProfession(profCategory).subs.length>1&&<div style={{display:"flex",flexWrap:"wrap",gap:6}}>
        {getProfession(profCategory).subs.map(s=><button key={s.id} onClick={()=>{setProfSub(s.id);showToast&&showToast("✓ Role updated");}} style={{padding:"5px 10px",borderRadius:8,border:`1.5px solid ${profSub===s.id?C.accent:C.border}`,background:profSub===s.id?C.accentBg:"#fff",fontSize:11,fontWeight:profSub===s.id?700:400,color:profSub===s.id?C.accent:C.textMid,cursor:"pointer"}}>{s.label}</button>)}
      </div>}
    </div>

    {/* ── 2. MONEY SETUP ─────────────────────────── */}
    <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
        <span style={{fontSize:18}}>💰</span>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Money Setup</div>
        <div style={{marginLeft:"auto",fontSize:11,color:C.green,fontWeight:600,display:"flex",alignItems:"center",gap:4}}><div style={{width:6,height:6,borderRadius:"50%",background:C.green}}/>Auto-saved</div>
      </div>
      <div style={{fontSize:12,fontWeight:700,color:C.textLight,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Pay Frequency</div>
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        {["Weekly","Biweekly","Twice Monthly","Monthly"].map(f=>(
          <button key={f} onClick={()=>{setIncome(p=>({...p,payFrequency:f}));showToast&&showToast("✓ Pay frequency updated");}}
            style={{padding:"7px 14px",borderRadius:99,border:`1.5px solid ${(income.payFrequency||"Biweekly")===f?C.accent:C.border}`,background:(income.payFrequency||"Biweekly")===f?C.accentBg:C.surfaceAlt,fontSize:13,fontWeight:(income.payFrequency||"Biweekly")===f?700:500,color:(income.payFrequency||"Biweekly")===f?C.accent:C.textMid,cursor:"pointer",transition:"all .15s"}}>
            {f}
          </button>
        ))}
      </div>
      <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:10,padding:"9px 12px",marginBottom:14,fontSize:12,color:C.accent}}>
        📅 Enter your <strong>take-home per paycheck</strong> below — the app will calculate your true safe-to-spend based on bills due before your next pay date.
      </div>
      <div style={{fontSize:12,fontWeight:700,color:C.textLight,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Income Per Paycheck</div>
      {[{k:"primary",l:`${getProfession(profCategory).icon} Primary take-home / paycheck`,ph:"2250"},{k:"other",l:"Other / Side Income",ph:"0"},{k:"trading",l:"Trading (avg/mo)",ph:"0"},{k:"rental",l:"Rental Income",ph:"0"},{k:"dividends",l:"Dividends",ph:"0"},{k:"freelance",l:"Freelance",ph:"0"}].map(i=>(
        <div key={i.k} style={{marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:600,color:C.slate,letterSpacing:.3,marginBottom:4}}>{i.l}</div>
          <input type="number" placeholder={i.ph} value={income[i.k]||""} onChange={e=>setIncome(p=>({...p,[i.k]:e.target.value}))} onBlur={e=>{if(e.target.value)showToast&&showToast("✓ Income saved");}} style={{width:"100%",background:C.surfaceAlt,border:`1.5px solid ${income[i.k]?C.accent:C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:14,outline:"none",transition:"border-color .15s"}}/>
        </div>
      ))}
      <div style={{fontSize:12,fontWeight:700,color:C.textLight,textTransform:"uppercase",letterSpacing:.5,marginBottom:8,marginTop:16}}>Account Balances</div>
      {[{k:"checking",l:"🏦 Checking",ph:"0"},{k:"savings",l:"💰 Savings",ph:"0"},{k:"cushion",l:"🛡️ Cushion / Emergency",ph:"0"},{k:"credit_card",l:"💳 Credit card (balance owed)",ph:"0"},{k:"investments",l:"📈 Investments",ph:"0"},{k:"property",l:"🏠 Property",ph:"0"},{k:"vehicles",l:"🚗 Vehicles",ph:"0"}].map(a=>(
        <div key={a.k} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <div style={{flex:1,fontSize:13,color:C.textMid}}>{a.l}</div>
          <input type="number" placeholder={a.ph} value={accounts[a.k]||""} onChange={e=>setAccounts(p=>({...p,[a.k]:e.target.value}))} onBlur={e=>{if(e.target.value)showToast&&showToast("✓ Balance saved");}} style={{width:120,background:C.surfaceAlt,border:`1.5px solid ${accounts[a.k]?C.accent:C.border}`,borderRadius:10,padding:"8px 10px",fontSize:14,fontFamily:MF,fontWeight:700,color:C.text,outline:"none",textAlign:"right",transition:"border-color .15s"}}/>
        </div>
      ))}
      <CashAccountsBlock accounts={accounts} setAccounts={setAccounts} showToast={showToast} variant="settings"/>
      <div style={{fontSize:12,fontWeight:700,color:C.textLight,textTransform:"uppercase",letterSpacing:.5,marginBottom:8,marginTop:4}}>Defaults</div>
      <div style={{fontSize:11,color:C.textLight,marginBottom:8,lineHeight:1.45}}>Used for new expenses, bills, recurring auto-log, and goal deposits. With <strong>multiple</strong> checking, savings, or credit cards, choose defaults here — the app won’t pick for you.</div>
      <FS label="Default: new expenses" options={PAID_FROM_OPTIONS.map(k=>({value:k,label:PAID_FROM_FS_LABELS[k]}))} value={normalizePaidFrom(settings.defaultExpensePaidFrom)} onChange={e=>setSettings(p=>({...p,defaultExpensePaidFrom:e.target.value}))}/>
      <FS label="Default: new bills (when paid)" options={PAID_FROM_OPTIONS.map(k=>({value:k,label:PAID_FROM_FS_LABELS[k]}))} value={normalizePaidFrom(settings.defaultBillPaidFrom)} onChange={e=>setSettings(p=>({...p,defaultBillPaidFrom:e.target.value}))}/>
      {cashAccountsByKind(accounts,"checking").length>=2&&<FS label="Default checking (several accounts)" options={[{value:"",label:"— Choose —"},...cashAccountsByKind(accounts,"checking").map(a=>({value:String(a.id),label:(a.name||"Checking")+" — "+fmt(parseFloat(a.balance||0))}))]} value={settings.defaultCheckingAccountId!=null&&settings.defaultCheckingAccountId!==""?String(settings.defaultCheckingAccountId):""} onChange={e=>setSettings(p=>({...p,defaultCheckingAccountId:e.target.value}))}/>}
      {cashAccountsByKind(accounts,"savings").length>=2&&<FS label="Default savings (several accounts)" options={[{value:"",label:"— Choose —"},...cashAccountsByKind(accounts,"savings").map(a=>({value:String(a.id),label:(a.name||"Savings")+" — "+fmt(parseFloat(a.balance||0))}))]} value={settings.defaultSavingsAccountId!=null&&settings.defaultSavingsAccountId!==""?String(settings.defaultSavingsAccountId):""} onChange={e=>setSettings(p=>({...p,defaultSavingsAccountId:e.target.value}))}/>}
      {cardDebtsList(debts).length>=2&&<FS label="Default credit card (several cards)" options={[{value:"",label:"— Choose —"},...cardDebtsList(debts).map(d=>({value:String(d.id),label:d.name+" — "+fmt(parseFloat(d.balance||0))}))]} value={settings.defaultCreditDebtId!=null&&settings.defaultCreditDebtId!==""?String(settings.defaultCreditDebtId):""} onChange={e=>setSettings(p=>({...p,defaultCreditDebtId:e.target.value}))}/>}
      <div style={{fontSize:12,fontWeight:700,color:C.textLight,textTransform:"uppercase",letterSpacing:.5,marginBottom:8,marginTop:14}}>Bills</div>
      <div style={{fontSize:11,color:C.textLight,marginBottom:8,lineHeight:1.45}}>After you mark a recurring bill paid, it hides in Paid History until the next due is close. This scales how many days ahead it comes back to <strong>Upcoming</strong> (weekly / monthly / etc. each keep their own shape).</div>
      <FS label="Recurring: return to Upcoming" options={BILL_RESHOW_PRESETS.map(p=>({value:String(p),label:p===0.5?"Tighter (0.5× notice)":p===0.75?"Slightly early (0.75×)":p===1?"Balanced (default)":p===1.25?"More notice (1.25×)":p===1.5?"Earlier (1.5×)":p===2?"Much earlier (2×)":"Latest allowed (3×)"}))} value={String(nearestBillReshowPreset(settings.billReshowLeadMultiplier))} onChange={e=>setSettings(p=>({...p,billReshowLeadMultiplier:parseFloat(e.target.value)||1}))}/>
    </div>

    {/* ── 3. APPEARANCE ──────────────────────────── */}
    <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
        <span style={{fontSize:18}}>🎨</span>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Appearance & Security</div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>{darkMode?"🌙":"☀️"}</span><div style={{fontSize:14,fontWeight:600,color:C.text}}>Dark Mode</div></div>
        <button onClick={()=>setDarkMode(d=>{const n=!d;setSettings(s=>({...s,darkMode:n}));return n;})} style={{background:"none",border:"none",cursor:"pointer",color:darkMode?C.accent:C.borderLight,padding:0}}>{darkMode?<ToggleRight size={28}/>:<ToggleLeft size={28}/>}</button>
      </div>
      <div style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>🔒</span><div><div style={{fontSize:14,fontWeight:600,color:C.text}}>PIN Lock</div><div style={{fontSize:12,color:C.textLight}}>{pinEnabled?"Enabled — tap to remove":"Disabled"}</div></div></div>
          <button onClick={()=>{if(pinEnabled){localStorage.removeItem("fv_pin_hash");setPinEnabled(false);showToast&&showToast("PIN removed");}else setShowPIN(true);}} style={{background:"none",border:"none",cursor:"pointer",color:pinEnabled?C.accent:C.borderLight,padding:0}}>{pinEnabled?<ToggleRight size={28}/>:<ToggleLeft size={28}/>}</button>
        </div>
        {showPIN&&<div style={{marginTop:10}}><PINSetup onSave={()=>{setPinEnabled(true);setShowPIN(false);showToast&&showToast("✓ PIN set");}} onCancel={()=>setShowPIN(false)} darkMode={darkMode}/></div>}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>📊</span><div><div style={{fontSize:14,fontWeight:600,color:C.text}}>Data Summary</div><div style={{fontSize:12,color:C.textLight}}>{expenses.length} expenses · {bills.length} bills · {debts.length} debts · {trades.length} trades</div></div></div>
      </div>
    </div>

    {/* ── 4. FEATURES ────────────────────────────── */}
    <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
        <span style={{fontSize:18}}>🔧</span>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Features</div>
      </div>
      {Tog("showTrading","Futures Trading","Track P&L, win rate, equity curve","📈")}
      {/* Household mode toggle in settings */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${C.border}`}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>🏠</span><div><div style={{fontSize:14,fontWeight:600,color:C.text}}>Household / Shared Mode</div><div style={{fontSize:12,color:C.textLight}}>Split expenses with a partner or roommate</div></div></div><button onClick={()=>{navTo&&navTo("household");}} style={{background:household?.enabled?C.accentBg:C.surfaceAlt,border:`1.5px solid ${household?.enabled?C.accent:C.border}`,borderRadius:99,padding:"6px 14px",cursor:"pointer",fontWeight:700,fontSize:12,color:household?.enabled?C.accent:C.textMid}}>{household?.enabled?"On — View →":"Set Up →"}</button></div>
      {Tog("showHealth","Health Score","A–F grade on your finances","🏆")}
      {Tog("showSavings","Savings Goals","Goal rings with projected dates","🎯")}
      {Tog("showForecast","Month Forecast","Burn rate + spending projection","🔮")}
    </div>

    {/* ── Cloud & device ─────────────────────────── */}
    <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <span style={{fontSize:18}}>☁️</span>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Cloud & device</div>
      </div>
      {(()=>{
        void cloudSyncBump;
        let lastSyncLabel="Not yet";
        try{
          const raw=localStorage.getItem("fv_last_sync");
          const ms=raw?parseInt(raw,10):0;
          if(ms>0)lastSyncLabel=new Date(ms).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"});
        }catch{}
        const status=(()=>{
          if(!supabaseConfigured)return{label:"Browser-only mode",detail:"Cloud sign-in is not configured in this build. Your data is saving locally in this browser.",color:C.amber,bg:C.amberBg,border:C.amberMid};
          if(skipAuthMode&&!signedInForSync)return{label:"Device-only mode",detail:"You chose Try without account. Changes save on this device only until you sign in.",color:C.textMid,bg:C.surfaceAlt,border:C.border};
          if(!signedInForSync)return{label:"Local save ready",detail:"Sign in to turn on cloud backup and cross-device sync.",color:C.textMid,bg:C.surfaceAlt,border:C.border};
          if(netOnline===false)return{label:"Offline - saved on this device",detail:"Edits are kept locally and will sync when your connection returns.",color:C.amber,bg:C.amberBg,border:C.amberMid};
          if(syncRecoverableError)return{label:"Cloud refresh failed",detail:"You are still using the copy saved on this device. Tap Try again from the red banner if it appears.",color:C.red,bg:C.redBg,border:C.redMid};
          if(syncing)return{label:"Syncing with cloud",detail:"Checking your latest cloud copy now.",color:C.accent,bg:C.accentBg,border:C.accentMid};
          if(lastSyncLabel==="Not yet")return{label:"Cloud ready",detail:"You are signed in. Your next successful upload or refresh will show a timestamp here.",color:C.accent,bg:C.accentBg,border:C.accentMid};
          return{label:"Synced to cloud",detail:"Last successful cloud refresh: "+lastSyncLabel,color:C.green,bg:C.greenBg,border:C.greenMid};
        })();
        return(
          <>
            <div role="status" aria-label="Save and sync status" style={{background:status.bg,border:`1px solid ${status.border}`,borderRadius:12,padding:"11px 13px",marginBottom:10,lineHeight:1.45}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                <span style={{width:8,height:8,borderRadius:"50%",background:status.color,display:"inline-block",flexShrink:0}}/>
                <strong style={{fontSize:13,color:status.color}}>{status.label}</strong>
              </div>
              <div style={{fontSize:12,color:C.textMid}}>{status.detail}</div>
            </div>
            {!supabaseConfigured&&(
              <div style={{fontSize:13,color:C.amber,background:C.amberBg,border:`1px solid ${C.amberMid}`,borderRadius:10,padding:"10px 12px",marginBottom:10,lineHeight:1.5}}>
                Cloud sign-in and sync aren’t configured in this build (add <code style={{fontSize:11}}>VITE_SUPABASE_URL</code> and <code style={{fontSize:11}}>VITE_SUPABASE_ANON_KEY</code>, then rebuild). Your data stays in this browser only.
              </div>
            )}
            {supabaseConfigured&&skipAuthMode&&!signedInForSync&&(
              <div style={{fontSize:13,color:C.textMid,marginBottom:10,lineHeight:1.5}}>
                You’re using <strong>Try without account</strong> — everything is stored in this browser only and does not sync to the cloud. Sign in from the splash screen to enable backup across devices.
              </div>
            )}
            {supabaseConfigured&&signedInForSync&&(
              <div style={{fontSize:13,color:C.textMid,marginBottom:10,lineHeight:1.45}}>
                <strong>Last successful cloud refresh:</strong> {lastSyncLabel}
                {netOnline===false&&<span style={{display:"block",marginTop:6,color:C.amber}}>You’re offline — edits stay on this device and sync when you reconnect.</span>}
              </div>
            )}
            <div style={{fontSize:12,color:C.textLight,lineHeight:1.5}}>
              <strong>Offline.</strong> Trackfi keeps working without internet. Data lives in this browser; when you’re signed in with cloud configured, changes upload when you’re back online.
            </div>
          </>
        );
      })()}
    </div>

    {/* ── 5. DATA ────────────────────────────────── */}
    <div style={{background:C.surface,borderRadius:18,boxShadow:"0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",padding:18,marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
        <span style={{fontSize:18}}>📦</span>
        <div style={{fontFamily:MF,fontWeight:700,fontSize:14,color:C.text}}>Data</div>
      </div>
      <div style={{fontSize:12,color:C.textLight,marginBottom:8,lineHeight:1.45}}>Includes transactions, bills, debts, goals, household & settle-up history, recurring, notifications, net worth chart data, categories, and preferences — use for moving phones or sharing a restore file with a partner (same account).</div>
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        <button className="ba" onClick={backupExport} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:10,padding:"11px 0",color:C.accent,fontWeight:700,fontSize:13,cursor:"pointer"}}><Download size={14}/>Export JSON</button>
        <label className="ba" style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 0",color:C.textMid,fontWeight:700,fontSize:13,cursor:"pointer"}}><Database size={14}/>Import<input type="file" accept=".json" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f)setPendingImport(f);e.target.value="";}}/></label>
      </div>
      {onLoadDemo&&<button type="button" className="ba" onClick={onLoadDemo} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:C.amberBg,border:`1px solid ${C.amberMid}`,borderRadius:10,padding:"11px 0",color:C.amber,fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:10}}>🧪 Load sample (demo) data</button>}
      {pendingImport&&<div style={{background:C.amberBg,border:`1px solid ${C.amberMid}`,borderRadius:12,padding:"12px 14px",marginBottom:8}}>
        <div style={{fontSize:13,fontWeight:700,color:C.amber,marginBottom:4}}>⚠️ Replace all current data with "{pendingImport.name}"?</div>
        <div style={{fontSize:12,color:C.textMid,marginBottom:10}}>Trackfi validates the whole file before changing anything. If it is malformed, your current data stays untouched. Export a backup first if needed.</div>
        <div style={{display:"flex",gap:8}}>
          <button className="ba" onClick={async()=>{const ok=await backupImport(pendingImport);if(ok)setPendingImport(null);}} style={{flex:1,background:C.amber,border:"none",borderRadius:8,padding:"9px 0",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>Validate & Import</button>
          <button className="ba" onClick={()=>setPendingImport(null)} style={{flex:1,background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 0",color:C.textMid,fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancel</button>
        </div>
      </div>}
      {onResetOnboarding&&<button className="ba" onClick={onResetOnboarding} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 0",color:C.textMid,fontWeight:600,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:8}}><RefreshCw size={13}/>Re-run Setup Wizard</button>}
      {onResetAllData&&<button className="ba" onClick={onResetAllData} style={{width:"100%",background:C.redBg,border:`1px solid ${C.redMid}`,borderRadius:10,padding:"11px 0",color:C.red,fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:8}}><Trash2 size={13}/>Reset All Data</button>}
    </div>

    {/* ── Account ────────────────────────────────── */}
    <div style={{paddingTop:4,borderTop:`1px solid ${C.border}`}}>
      {userEmail&&(()=>{
        return(
          <div style={{marginBottom:8}}>
            {/* Account actions row */}
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <button className="ba" onClick={()=>{setShowEmailChange(e=>!e);setShowPwChange(false);setAcctMsg("");}}
                style={{flex:1,padding:"10px 0",borderRadius:12,border:`1.5px solid ${C.accentMid}`,background:showEmailChange?C.accentBg:"transparent",color:C.accent,fontWeight:700,fontSize:13,cursor:"pointer"}}>
                ✉️ Change Email
              </button>
              <button className="ba" onClick={()=>{setShowPwChange(p=>!p);setShowEmailChange(false);setAcctMsg("");}}
                style={{flex:1,padding:"10px 0",borderRadius:12,border:`1.5px solid ${C.border}`,background:showPwChange?C.surfaceAlt:"transparent",color:C.textMid,fontWeight:700,fontSize:13,cursor:"pointer"}}>
                🔑 Change Password
              </button>
            </div>
            {/* Change email form */}
            {showEmailChange&&<div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:14,padding:14,marginBottom:8}}>
              <div style={{fontSize:12,color:C.textLight,marginBottom:10}}>Current: <strong>{userEmail}</strong></div>
              <input type="email" value={newEmail} onChange={e=>{setNewEmail(e.target.value);setAcctMsg("");}} placeholder="New email address"
                style={{width:"100%",background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:10,padding:"10px 12px",fontSize:14,color:C.text,outline:"none",boxSizing:"border-box",marginBottom:8}}/>
              {acctMsg&&<div style={{fontSize:12,color:acctMsg.includes("✓")?C.green:C.red,marginBottom:8}}>{acctMsg}</div>}
              <button onClick={async()=>{
                if(!newEmail.includes("@")){setAcctMsg("Enter a valid email.");return;}
                setAcctLoading(true);
                try{
                  const r=await supaFetch("/auth/v1/user",{method:"PUT",body:JSON.stringify({email:newEmail})});
                  if(r.error){setAcctMsg("Failed: "+(r.error?.message||"try again"));setAcctLoading(false);return;}
                  setAcctMsg("✓ Confirmation sent to "+newEmail+" — check your inbox.");
                  setNewEmail("");
                }catch{setAcctMsg("Network error.");}
                setAcctLoading(false);
              }} disabled={acctLoading||!newEmail}
                style={{width:"100%",padding:"10px",borderRadius:10,border:"none",background:acctLoading||!newEmail?C.borderLight:C.accent,color:acctLoading||!newEmail?C.textFaint:"#fff",fontWeight:700,fontSize:13,cursor:acctLoading||!newEmail?"default":"pointer"}}>
                {acctLoading?"Sending...":"Send Confirmation"}
              </button>
            </div>}
            {/* Change password form */}
            {showPwChange&&<div style={{background:C.surfaceAlt,border:`1px solid ${C.border}`,borderRadius:14,padding:14,marginBottom:8}}>
              <input type="password" value={newPw1} onChange={e=>{setNewPw1(e.target.value);setAcctMsg("");}} placeholder="New password (min 6 chars)"
                style={{width:"100%",background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:10,padding:"10px 12px",fontSize:14,color:C.text,outline:"none",boxSizing:"border-box",marginBottom:8}}/>
              <input type="password" value={newPw2} onChange={e=>{setNewPw2(e.target.value);setAcctMsg("");}} placeholder="Confirm new password"
                style={{width:"100%",background:"#fff",border:`1.5px solid ${newPw2&&newPw1!==newPw2?C.red:C.border}`,borderRadius:10,padding:"10px 12px",fontSize:14,color:C.text,outline:"none",boxSizing:"border-box",marginBottom:8}}/>
              {acctMsg&&<div style={{fontSize:12,color:acctMsg.includes("✓")?C.green:C.red,marginBottom:8}}>{acctMsg}</div>}
              <button onClick={async()=>{
                if(newPw1.length<6){setAcctMsg("Must be at least 6 characters.");return;}
                if(newPw1!==newPw2){setAcctMsg("Passwords don't match.");return;}
                setAcctLoading(true);
                try{
                  const r=await supaFetch("/auth/v1/user",{method:"PUT",body:JSON.stringify({password:newPw1})});
                  if(r.error){setAcctMsg("Failed: "+(r.error?.message||"try again"));setAcctLoading(false);return;}
                  setAcctMsg("✓ Password updated!");setNewPw1("");setNewPw2("");
                  setTimeout(()=>{setShowPwChange(false);setAcctMsg("");},2000);
                }catch{setAcctMsg("Network error.");}
                setAcctLoading(false);
              }} disabled={acctLoading||newPw1.length<6||newPw1!==newPw2}
                style={{width:"100%",padding:"10px",borderRadius:10,border:"none",background:acctLoading||newPw1.length<6||newPw1!==newPw2?C.borderLight:C.green,color:acctLoading||newPw1.length<6||newPw1!==newPw2?C.textFaint:"#fff",fontWeight:700,fontSize:13,cursor:acctLoading||newPw1.length<6||newPw1!==newPw2?"default":"pointer"}}>
                {acctLoading?"Updating...":"Update Password"}
              </button>
            </div>}
          </div>
        );
      })()}
      {onSignOut&&<button className="ba" onClick={()=>onSignOut()} style={{width:"100%",marginBottom:8,background:C.redBg,border:`1px solid ${C.redMid}`,borderRadius:12,padding:"12px 0",color:C.red,fontWeight:700,fontSize:14,cursor:"pointer"}}>Sign Out</button>}
      {onSignIn&&<button className="ba" onClick={onSignIn} style={{width:"100%",background:`linear-gradient(135deg,${C.accent},${C.green})`,border:"none",borderRadius:12,padding:"12px 0",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>Sign In / Create Account</button>}
    </div>

    <div style={{textAlign:"center",padding:"20px 8px 6px",fontSize:11,color:C.textLight,lineHeight:1.5,letterSpacing:.15}}>
      Trackfi v {__TRACKFI_APP_VERSION__}{import.meta.env.DEV?" · dev":""}
    </div>
  </div>);
}
