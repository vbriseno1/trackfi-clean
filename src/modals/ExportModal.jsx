import React from "react";
import { Download, X } from "lucide-react";
import { C, MF } from "../lib/uiTokens.js";
import { todayStr } from "../lib/moneyFormat.js";
import { totalCheckingBalance, totalSavingsBalance } from "../lib/cashAccounts.js";
import { escapeHtml } from "../lib/escapeHtml.js";

function safeHexColor(c, fb = "#6366F1") {
  if (typeof c !== "string" || !/^#[0-9A-Fa-f]{3,8}$/.test(c.trim())) return fb;
  return c.trim();
}

export default function ExportModal({expenses,bills,debts,accounts,income,savingsGoals,budgetGoals,trades,shifts,categories,appName,greetName,tradingAccount,onClose}){
  const now=new Date();
  const yr=now.getFullYear();
  const ms=yr+"-"+String(now.getMonth()+1).padStart(2,"0");
  const monthName=now.toLocaleDateString("en-US",{month:"long",year:"numeric"});

  function dlBlob(data,filename,type="text/html"){
    if(type==="text/csv"){
      // CSV: standard blob download works everywhere
      const b=new Blob([data],{type:"text/csv;charset=utf-8;"});
      const u=URL.createObjectURL(b);
      const a=document.createElement("a");
      a.href=u;a.download=filename;a.click();
      setTimeout(()=>URL.revokeObjectURL(u),1000);
    }else{
      // HTML reports: open in new tab via document.write
      // avoids blob: URL CSP restrictions in sandboxed environments
      const w=window.open("","_blank");
      if(w){
        w.document.open();
        w.document.write(data);
        w.document.close();
        w.document.title=filename;
      }else{
        // Fallback if popup blocked: data URI download
        const encoded="data:text/html;charset=utf-8,"+encodeURIComponent(data);
        const a=document.createElement("a");
        a.href=encoded;a.download=filename;a.click();
      }
    }
  }

  const ta=(totalCheckingBalance(accounts))+(totalSavingsBalance(accounts))+(parseFloat(accounts.cushion||0))+(parseFloat(accounts.investments||0))+(parseFloat(accounts.k401||0))+(parseFloat(accounts.roth_ira||0))+(parseFloat(accounts.brokerage||0))+(parseFloat(accounts.crypto||0))+(parseFloat(accounts.hsa||0))+(parseFloat(accounts.property||0))+(parseFloat(accounts.vehicles||0))+(parseFloat(tradingAccount?.balance||0));
  const td=debts.reduce((s,d)=>s+(parseFloat(d.balance||0)),0);
  const nw=ta-td;
  const mult=income.payFrequency==="Weekly"?(52/12):income.payFrequency==="Twice Monthly"?2:income.payFrequency==="Monthly"?1:(26/12);
  const ti=(parseFloat(income.primary||0)*mult)+(parseFloat(income.other||0))+(parseFloat(income.trading||0))+(parseFloat(income.rental||0))+(parseFloat(income.dividends||0))+(parseFloat(income.freelance||0));
  const thisMonthExp=expenses.filter(e=>e.date?.startsWith(ms));
  const mExp=thisMonthExp.reduce((s,e)=>s+(parseFloat(e.amount||0)),0);
  const sr=ti>0?Math.max(0,(ti-mExp)/ti*100):0;
  const catMap=thisMonthExp.reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount||0));return a},{});
  const catSorted=Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
  const liquid=totalCheckingBalance(accounts)+totalSavingsBalance(accounts)+parseFloat(accounts.cushion||0);
  const unpaidBills=bills.filter(b=>!b.paid);
  const totalUnpaid=unpaidBills.reduce((s,b)=>s+(parseFloat(b.amount||0)),0);
  const reportDate=now.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});
  const userName=greetName||(appName||"Trackfi");

  // ── Shared CSS used by all reports ────────────────────────────────────────
  const BASE_CSS=`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Inter',system-ui,sans-serif;background:#F0F2F8;color:#0A1628;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    @page{margin:0.6in 0.7in;size:letter;}
    @media print{body{background:white;}.no-print{display:none!important;}}
    .page{max-width:780px;margin:0 auto;background:white;}

    /* Header */
    .hdr{background:#0A1628;padding:32px 40px 28px;display:flex;justify-content:space-between;align-items:flex-start;}
    .hdr-logo{font-size:24px;font-weight:900;color:white;letter-spacing:-0.5px;}
    .hdr-logo span{color:#6366F1;}
    .hdr-meta{text-align:right;}
    .hdr-meta .report-type{font-size:11px;font-weight:700;color:rgba(255,255,255,0.4);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:4px;}
    .hdr-meta .report-name{font-size:20px;font-weight:800;color:white;letter-spacing:-0.3px;}
    .hdr-meta .report-date{font-size:12px;color:rgba(255,255,255,0.45);margin-top:3px;}

    /* Statement bar */
    .stmt-bar{background:#6366F1;padding:14px 40px;display:flex;justify-content:space-between;align-items:center;}
    .stmt-bar .acct{font-size:13px;color:rgba(255,255,255,0.7);}
    .stmt-bar .acct strong{color:white;font-weight:700;}
    .stmt-bar .period{font-size:12px;color:rgba(255,255,255,0.6);text-align:right;}

    /* Body */
    .body{padding:32px 40px;}

    /* Summary grid */
    .summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:32px;}
    .metric{background:#F8F9FC;border-radius:10px;padding:16px 14px;border-left:3px solid #E2E5EE;}
    .metric.green{border-left-color:#059669;}
    .metric.red{border-left-color:#DC2626;}
    .metric.indigo{border-left-color:#6366F1;}
    .metric.amber{border-left-color:#D97706;}
    .metric .lbl{font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.09em;margin-bottom:6px;}
    .metric .val{font-size:22px;font-weight:800;letter-spacing:-0.5px;line-height:1;}
    .metric .val.green{color:#059669;}
    .metric .val.red{color:#DC2626;}
    .metric .val.indigo{color:#6366F1;}
    .metric .val.amber{color:#D97706;}
    .metric .sub{font-size:11px;color:#9CA3AF;margin-top:4px;}

    /* Section heading */
    .sec-hdr{display:flex;align-items:center;gap:10px;margin:28px 0 14px;padding-bottom:8px;border-bottom:1.5px solid #0A1628;}
    .sec-hdr .dot{width:10px;height:10px;border-radius:50%;background:#6366F1;flex-shrink:0;}
    .sec-hdr h2{font-size:13px;font-weight:800;color:#0A1628;text-transform:uppercase;letter-spacing:0.09em;}

    /* Transaction table */
    table{width:100%;border-collapse:collapse;font-size:13px;}
    thead tr{background:#F8F9FC;}
    th{text-align:left;padding:9px 12px;font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.09em;border-bottom:1px solid #E2E5EE;}
    th.r{text-align:right;}
    td{padding:10px 12px;border-bottom:1px solid #F0F2F8;vertical-align:middle;}
    td.r{text-align:right;}
    tbody tr:last-child td{border-bottom:none;}
    tbody tr:hover{background:#FAFBFF;}
    .debit{color:#DC2626;font-weight:700;}
    .credit{color:#059669;font-weight:700;}
    .cat-pill{display:inline-block;background:#EEF2FF;color:#6366F1;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;letter-spacing:0.04em;}
    tfoot td{font-weight:700;background:#F8F9FC;border-top:1.5px solid #E2E5EE;padding:12px;}

    /* Balance table */
    .bal-section{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px;}
    .bal-group{background:#F8F9FC;border-radius:12px;padding:18px 20px;}
    .bal-group h3{font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.09em;margin-bottom:14px;}
    .bal-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #ECEEF5;font-size:13px;}
    .bal-row:last-child{border-bottom:none;}
    .bal-row .nm{color:#374151;}
    .bal-row .amt{font-weight:700;font-family:'SF Mono',monospace;font-size:12px;}
    .bal-total{display:flex;justify-content:space-between;padding:10px 0 0;margin-top:6px;border-top:2px solid #0A1628;font-weight:800;font-size:14px;}

    /* Progress bar */
    .prog-wrap{height:6px;background:#E2E5EE;border-radius:99px;overflow:hidden;margin-top:5px;}
    .prog-fill{height:100%;border-radius:99px;}

    /* Goal cards */
    .goal-row{display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid #F0F2F8;}
    .goal-ring{position:relative;width:44px;height:44px;flex-shrink:0;}

    /* Net worth bar */
    .nw-bar{background:#0A1628;border-radius:12px;padding:20px 24px;margin-bottom:28px;display:flex;justify-content:space-between;align-items:center;}
    .nw-bar .lft .lbl{font-size:10px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.09em;margin-bottom:4px;}
    .nw-bar .lft .val{font-size:32px;font-weight:900;letter-spacing:-1px;}
    .nw-bar .stats{display:flex;gap:24px;}
    .nw-bar .stat .lbl{font-size:10px;color:rgba(255,255,255,0.4);font-weight:600;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.07em;}
    .nw-bar .stat .val{font-size:16px;font-weight:800;}

    /* Footer */
    .footer{background:#F8F9FC;padding:20px 40px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #E2E5EE;margin-top:8px;}
    .footer .left{font-size:11px;color:#9CA3AF;}
    .footer .right{font-size:11px;color:#9CA3AF;text-align:right;}
    .footer .brand{font-size:13px;font-weight:800;color:#6366F1;margin-bottom:2px;}

    /* Print button */
    .print-btn{position:fixed;bottom:24px;right:24px;background:#6366F1;color:white;border:none;border-radius:12px;padding:14px 24px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 20px rgba(99,102,241,0.4);display:flex;align-items:center;gap:8px;z-index:999;}
    @media print{.print-btn{display:none;}}
  `;

  // ── REPORT 1: Monthly Statement ───────────────────────────────────────────
  function exportMonthlyStatement(){
    const txRows=thisMonthExp.sort((a,b)=>b.date?.localeCompare(a.date)).map(e=>{
      const d=new Date(e.date+"T00:00:00");
      const dateStr=d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
      const amt=parseFloat(e.amount||0);
      return`<tr><td>${escapeHtml(dateStr)}</td><td><strong>${escapeHtml(e.name||"")}</strong></td><td><span class="cat-pill">${escapeHtml(e.category||"")}</span></td><td class="r debit">-$${amt.toFixed(2)}</td></tr>`;
    }).join("");

    const catRowsHtml=catSorted.map(([cat,amt])=>{
      const pct=mExp>0?(amt/mExp*100):0;
      const bar=`<div class="prog-wrap"><div class="prog-fill" style="width:${pct.toFixed(1)}%;background:#6366F1;"></div></div>`;
      return`<tr><td>${escapeHtml(cat)}</td><td>${bar}</td><td class="r">${pct.toFixed(0)}%</td><td class="r debit">$${amt.toFixed(2)}</td></tr>`;
    }).join("");

    const html=`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Trackfi — ${monthNameHtml} Statement</title>
    <style>${BASE_CSS}</style></head><body>
    <div class="page">
    <div class="hdr">
      <div><div class="hdr-logo">💰 <span>trackfi</span></div><div style="font-size:12px;color:rgba(255,255,255,0.35);margin-top:6px;font-weight:500;">Personal Finance</div></div>
      <div class="hdr-meta"><div class="report-type">Monthly Statement</div><div class="report-name">${monthNameHtml}</div><div class="report-date">Prepared ${escapeHtml(reportDate)}</div></div>
    </div>
    <div class="stmt-bar">
      <div class="acct">Account holder: <strong>${userNameHtml}</strong></div>
      <div class="period">Statement period: ${escapeHtml(new Date(yr,now.getMonth(),1).toLocaleDateString("en-US",{month:"short",day:"numeric"}))} – ${escapeHtml(reportDate)}</div>
    </div>
    <div class="body">

    <div class="summary-grid">
      <div class="metric indigo"><div class="lbl">Monthly Income</div><div class="val indigo">$${ti.toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})}</div><div class="sub">${escapeHtml(income.payFrequency||"Monthly")} pay</div></div>
      <div class="metric red"><div class="lbl">Total Spent</div><div class="val red">$${mExp.toFixed(0)}</div><div class="sub">${thisMonthExp.length} transactions</div></div>
      <div class="metric green"><div class="lbl">Remaining</div><div class="val green">$${Math.max(0,ti-mExp).toFixed(0)}</div><div class="sub">${sr.toFixed(0)}% savings rate</div></div>
      <div class="metric amber"><div class="lbl">Checking Balance</div><div class="val amber">$${totalCheckingBalance(accounts).toLocaleString()}</div><div class="sub">as of today</div></div>
    </div>

    <div class="sec-hdr"><div class="dot"></div><h2>Spending by Category</h2></div>
    <table>
      <thead><tr><th>Category</th><th>Breakdown</th><th class="r">% of Spending</th><th class="r">Amount</th></tr></thead>
      <tbody>${catRowsHtml}</tbody>
      <tfoot><tr><td colspan="3"><strong>Total Spending</strong></td><td class="r debit"><strong>$${mExp.toFixed(2)}</strong></td></tr></tfoot>
    </table>

    <div class="sec-hdr"><div class="dot"></div><h2>Transaction Detail</h2></div>
    <table>
      <thead><tr><th>Date</th><th>Description</th><th>Category</th><th class="r">Amount</th></tr></thead>
      <tbody>${txRows||"<tr><td colspan='4' style='text-align:center;color:#9CA3AF;padding:24px'>No transactions this month</td></tr>"}</tbody>
      <tfoot><tr><td colspan="3"><strong>${thisMonthExp.length} transactions</strong></td><td class="r debit"><strong>$${mExp.toFixed(2)}</strong></td></tr></tfoot>
    </table>

    ${unpaidBills.length>0?`
    <div class="sec-hdr"><div class="dot"></div><h2>Outstanding Bills</h2></div>
    <table>
      <thead><tr><th>Bill</th><th>Due Date</th><th>Frequency</th><th class="r">Amount</th></tr></thead>
      <tbody>${unpaidBills.slice(0,10).map(b=>`<tr><td><strong>${escapeHtml(b.name||"")}</strong></td><td>${escapeHtml(b.dueDate||"—")}</td><td>${escapeHtml(b.recurring||"Monthly")}</td><td class="r debit">$${parseFloat(b.amount||0).toFixed(2)}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td colspan="3"><strong>Total Outstanding</strong></td><td class="r debit"><strong>$${totalUnpaid.toFixed(2)}</strong></td></tr></tfoot>
    </table>`:""}

    </div>
    <div class="footer">
      <div class="left"><div class="brand">💰 trackfi</div><div>This document was generated on ${escapeHtml(reportDate)} and is for personal use only.</div></div>
      <div class="right"><div>Document ID: TF-${yr}${String(now.getMonth()+1).padStart(2,"0")}-${Math.random().toString(36).slice(2,8).toUpperCase()}</div><div>Confidential — not for distribution</div></div>
    </div>
    </div>
    <button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
    </body></html>`;
    dlBlob(html,(appName||"trackfi")+"-statement-"+ms+".html");
  }

  // ── REPORT 2: Net Worth Report ────────────────────────────────────────────
  function exportNetWorthReport(){
    const assetItems=[
      {l:"Checking",v:accounts.checking,ic:"🏦"},{l:"Savings",v:accounts.savings,ic:"💰"},
      {l:"Emergency Fund",v:accounts.cushion,ic:"🛡️"},{l:"401(k)",v:accounts.k401,ic:"🏢"},
      {l:"Roth IRA",v:accounts.roth_ira,ic:"🌱"},{l:"Brokerage",v:accounts.brokerage,ic:"📊"},
      {l:"HSA",v:accounts.hsa,ic:"🏥"},{l:"Crypto",v:accounts.crypto,ic:"₿"},
      {l:"Investments",v:accounts.investments,ic:"📈"},{l:"Property",v:accounts.property,ic:"🏠"},
      {l:"Vehicles",v:accounts.vehicles,ic:"🚗"},
    ].filter(a=>parseFloat(a.v||0)>0);

    const debtItems=debts.map(d=>({l:d.name,v:d.balance,rate:d.rate,type:d.type}));
    const goalProgress=savingsGoals.map(g=>{
      const pct=Math.min(100,parseFloat(g.target||1)>0?(parseFloat(g.saved||0)/parseFloat(g.target))*100:0);
      const deg=pct*3.6;
      const r=16,circ=2*Math.PI*r;
      const dash=circ*(pct/100);
      const gc=safeHexColor(g.color,"#6366F1");
      return`<div class="goal-row">
        <svg width="44" height="44" viewBox="0 0 44 44" style="flex-shrink:0">
          <circle cx="22" cy="22" r="${r}" fill="none" stroke="#E2E5EE" stroke-width="5"/>
          <circle cx="22" cy="22" r="${r}" fill="none" stroke="${gc}" stroke-width="5"
            stroke-dasharray="${dash.toFixed(1)} ${circ.toFixed(1)}" stroke-linecap="round"
            transform="rotate(-90 22 22)"/>
          <text x="22" y="26" text-anchor="middle" font-size="9" font-weight="800" fill="${gc}" font-family="Inter,sans-serif">${pct.toFixed(0)}%</text>
        </svg>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;color:#0A1628">${escapeHtml(g.icon||"🎯")} ${escapeHtml(g.name||"")}</div>
          <div style="font-size:11px;color:#9CA3AF;margin-top:2px">$${parseFloat(g.saved||0).toLocaleString()} of $${parseFloat(g.target||0).toLocaleString()} · ${g.monthly?("$"+parseFloat(g.monthly).toFixed(0)+"/mo"):""}</div>
          <div style="margin-top:5px"><div class="prog-wrap"><div class="prog-fill" style="width:${pct.toFixed(1)}%;background:${gc};"></div></div></div>
        </div>
        <div style="font-size:15px;font-weight:800;color:${pct>=100?"#059669":"#6366F1"};flex-shrink:0">${pct>=100?"✓ Done":"$"+Math.max(0,parseFloat(g.target||0)-parseFloat(g.saved||0)).toLocaleString()+" left"}</div>
      </div>`;
    }).join("");

    const html=`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Trackfi — Net Worth Report</title>
    <style>${BASE_CSS}</style></head><body>
    <div class="page">
    <div class="hdr">
      <div><div class="hdr-logo">💰 <span>trackfi</span></div><div style="font-size:12px;color:rgba(255,255,255,0.35);margin-top:6px;font-weight:500;">Personal Finance</div></div>
      <div class="hdr-meta"><div class="report-type">Net Worth Report</div><div class="report-name">${userNameHtml}</div><div class="report-date">As of ${escapeHtml(reportDate)}</div></div>
    </div>
    <div class="stmt-bar">
      <div class="acct">Account holder: <strong>${userNameHtml}</strong></div>
      <div class="period">Report date: <strong>${escapeHtml(reportDate)}</strong></div>
    </div>
    <div class="body">

    <div class="nw-bar">
      <div class="lft"><div class="lbl">Net Worth</div><div class="val" style="color:${nw>=0?"#34D399":"#F87171"}">${nw>=0?"+":"-"}$${Math.abs(nw).toLocaleString("en-US",{minimumFractionDigits:0})}</div></div>
      <div class="stats">
        <div class="stat"><div class="lbl">Total Assets</div><div class="val" style="color:#34D399">$${ta.toLocaleString()}</div></div>
        <div class="stat"><div class="lbl">Total Debt</div><div class="val" style="color:#F87171">$${td.toLocaleString()}</div></div>
        <div class="stat"><div class="lbl">Liquid</div><div class="val" style="color:white">$${liquid.toLocaleString()}</div></div>
      </div>
    </div>

    <div class="bal-section">
      <div class="bal-group">
        <h3>Assets</h3>
        ${assetItems.map(a=>`<div class="bal-row"><span class="nm">${a.ic} ${a.l}</span><span class="amt" style="color:#059669">$${parseFloat(a.v||0).toLocaleString()}</span></div>`).join("")}
        <div class="bal-total"><span>Total Assets</span><span style="color:#059669">$${ta.toLocaleString()}</span></div>
      </div>
      <div class="bal-group">
        <h3>Liabilities</h3>
        ${debtItems.length?debtItems.map(d=>`<div class="bal-row"><span class="nm">💳 ${escapeHtml(d.l||"")}${d.rate?" ("+escapeHtml(String(d.rate))+"%)":" "}</span><span class="amt" style="color:#DC2626">$${parseFloat(d.v||0).toLocaleString()}</span></div>`).join(""):"<div style='color:#9CA3AF;font-size:13px;padding:12px 0'>No debts — debt free! 🎉</div>"}
        ${td>0?`<div class="bal-total"><span>Total Debt</span><span style="color:#DC2626">$${td.toLocaleString()}</span></div>`:""}
      </div>
    </div>

    ${savingsGoals.length>0?`
    <div class="sec-hdr"><div class="dot"></div><h2>Savings Goals</h2></div>
    ${goalProgress}`:""}

    ${debts.length>0?`
    <div class="sec-hdr"><div class="dot"></div><h2>Debt Detail</h2></div>
    <table>
      <thead><tr><th>Name</th><th>Type</th><th class="r">Rate</th><th class="r">Min Payment</th><th class="r">Monthly Interest</th><th class="r">Balance</th></tr></thead>
      <tbody>${debts.map(d=>`<tr><td><strong>${escapeHtml(d.name||"")}</strong></td><td>${escapeHtml(d.type||"—")}</td><td class="r">${escapeHtml(String(d.rate||0))}% APR</td><td class="r">$${parseFloat(d.minPayment||0).toFixed(2)}</td><td class="r" style="color:#DC2626">$${(parseFloat(d.balance||0)*(parseFloat(d.rate||0)/100/12)).toFixed(2)}</td><td class="r debit">$${parseFloat(d.balance||0).toLocaleString()}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td colspan="4"><strong>Totals</strong></td><td class="r" style="color:#DC2626"><strong>$${debts.reduce((s,d)=>s+(parseFloat(d.balance||0)*(parseFloat(d.rate||0)/100/12)),0).toFixed(2)}/mo</strong></td><td class="r debit"><strong>$${td.toLocaleString()}</strong></td></tr></tfoot>
    </table>`:""}

    </div>
    <div class="footer">
      <div class="left"><div class="brand">💰 trackfi</div><div>Net worth snapshot as of ${escapeHtml(reportDate)}. Values reflect manually entered balances.</div></div>
      <div class="right"><div>Document ID: TF-NW-${Math.random().toString(36).slice(2,10).toUpperCase()}</div><div>Confidential — personal use only</div></div>
    </div>
    </div>
    <button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
    </body></html>`;
    dlBlob(html,(appName||"trackfi")+"-networth-"+todayStr()+".html");
  }

  // ── REPORT 3: Annual Summary ──────────────────────────────────────────────
  function exportAnnualSummary(){
    const months=Array.from({length:now.getMonth()+1},(_,i)=>{
      const mStr=yr+"-"+String(i+1).padStart(2,"0");
      const mExps=expenses.filter(e=>e.date?.startsWith(mStr));
      const total=mExps.reduce((s,e)=>s+(parseFloat(e.amount||0)),0);
      const cats=mExps.reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount||0));return a},{});
      const top=Object.entries(cats).sort((a,b)=>b[1]-a[1])[0];
      const mn=new Date(yr,i,1).toLocaleDateString("en-US",{month:"short"});
      return{mn,total,count:mExps.length,top:top?.[0]||"—",topAmt:top?.[1]||0};
    });
    const ytdTotal=months.reduce((s,m)=>s+m.total,0);
    const ytdTxns=months.reduce((s,m)=>s+m.count,0);
    const avgMonth=months.length>0?ytdTotal/months.length:0;
    const maxMonth=Math.max(...months.map(m=>m.total),1);
    const ytdCatMap=expenses.filter(e=>e.date?.startsWith(String(yr))).reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount||0));return a},{});
    const ytdCats=Object.entries(ytdCatMap).sort((a,b)=>b[1]-a[1]);

    const monthBars=months.map(m=>{
      const h=Math.max(4,Math.round((m.total/maxMonth)*80));
      const isHigh=m.total>avgMonth*1.2;
      return`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
        <div style="font-size:10px;color:#9CA3AF;font-weight:600">$${m.total>=1000?(m.total/1000).toFixed(0)+"k":m.total.toFixed(0)}</div>
        <div style="width:100%;height:${h}px;background:${isHigh?"#DC2626":"#6366F1"};border-radius:4px 4px 0 0;opacity:${isHigh?1:0.75}"></div>
        <div style="font-size:10px;color:#374151;font-weight:600">${m.mn}</div>
      </div>`;
    }).join("");

    const html=`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Trackfi — ${yr} Annual Summary</title>
    <style>${BASE_CSS}.chart-wrap{display:flex;gap:6px;align-items:flex-end;height:120px;margin-bottom:8px;}</style></head><body>
    <div class="page">
    <div class="hdr">
      <div><div class="hdr-logo">💰 <span>trackfi</span></div><div style="font-size:12px;color:rgba(255,255,255,0.35);margin-top:6px;font-weight:500;">Personal Finance</div></div>
      <div class="hdr-meta"><div class="report-type">Annual Summary</div><div class="report-name">${yr} Year to Date</div><div class="report-date">Through ${escapeHtml(reportDate)}</div></div>
    </div>
    <div class="stmt-bar">
      <div class="acct">Account holder: <strong>${userNameHtml}</strong></div>
      <div class="period">Year: <strong>Jan – ${escapeHtml(new Date(yr,now.getMonth(),1).toLocaleDateString("en-US",{month:"short"}))} ${yr}</strong></div>
    </div>
    <div class="body">

    <div class="summary-grid">
      <div class="metric red"><div class="lbl">YTD Spending</div><div class="val red">$${ytdTotal.toFixed(0)}</div><div class="sub">${ytdTxns} transactions</div></div>
      <div class="metric indigo"><div class="lbl">Monthly Average</div><div class="val indigo">$${avgMonth.toFixed(0)}</div><div class="sub">across ${months.length} months</div></div>
      <div class="metric green"><div class="lbl">Savings Rate</div><div class="val green">${ti>0?Math.max(0,(ti-avgMonth)/ti*100).toFixed(0):0}%</div><div class="sub">avg monthly</div></div>
      <div class="metric amber"><div class="lbl">Net Worth</div><div class="val amber">${nw>=0?"$"+nw.toLocaleString():"-$"+Math.abs(nw).toLocaleString()}</div><div class="sub">as of today</div></div>
    </div>

    <div class="sec-hdr"><div class="dot"></div><h2>Monthly Spending — ${yr}</h2></div>
    <div style="background:#F8F9FC;border-radius:12px;padding:20px 20px 12px;">
      <div class="chart-wrap">${monthBars}</div>
      <div style="display:flex;gap:16px;font-size:11px;color:#9CA3AF;margin-top:4px">
        <span>● <span style="color:#6366F1">Normal</span></span>
        <span>● <span style="color:#DC2626">Above average</span></span>
        <span style="margin-left:auto">Avg: $${avgMonth.toFixed(0)}/mo</span>
      </div>
    </div>

    <div class="sec-hdr"><div class="dot"></div><h2>Top Spending Categories — YTD</h2></div>
    <table>
      <thead><tr><th>Category</th><th>Breakdown</th><th class="r">% of Spending</th><th class="r">YTD Total</th></tr></thead>
      <tbody>${ytdCats.map(([cat,amt])=>{const pct=ytdTotal>0?(amt/ytdTotal*100):0;return`<tr><td>${escapeHtml(cat)}</td><td><div class="prog-wrap"><div class="prog-fill" style="width:${pct.toFixed(1)}%;background:#6366F1;"></div></div></td><td class="r">${pct.toFixed(0)}%</td><td class="r debit">$${amt.toFixed(2)}</td></tr>`;}).join("")}</tbody>
      <tfoot><tr><td colspan="3"><strong>Total YTD</strong></td><td class="r debit"><strong>$${ytdTotal.toFixed(2)}</strong></td></tr></tfoot>
    </table>

    <div class="sec-hdr"><div class="dot"></div><h2>Month-by-Month Breakdown</h2></div>
    <table>
      <thead><tr><th>Month</th><th class="r">Transactions</th><th>Top Category</th><th class="r">vs Average</th><th class="r">Total</th></tr></thead>
      <tbody>${months.map(m=>{const diff=avgMonth>0?((m.total-avgMonth)/avgMonth*100):0;const col=diff>15?"#DC2626":diff<-15?"#059669":"#6366F1";return`<tr><td><strong>${escapeHtml(m.mn)} ${yr}</strong></td><td class="r">${m.count}</td><td><span class="cat-pill">${escapeHtml(m.top)}</span></td><td class="r" style="color:${col};font-weight:700">${diff>0?"+":""}${diff.toFixed(0)}%</td><td class="r debit">$${m.total.toFixed(2)}</td></tr>`;}).join("")}</tbody>
    </table>

    </div>
    <div class="footer">
      <div class="left"><div class="brand">💰 trackfi</div><div>Annual summary for ${yr}, generated ${escapeHtml(reportDate)}. All values manually tracked.</div></div>
      <div class="right"><div>Document ID: TF-YTD-${yr}-${Math.random().toString(36).slice(2,8).toUpperCase()}</div><div>Confidential — personal use only</div></div>
    </div>
    </div>
    <button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
    </body></html>`;
    dlBlob(html,(appName||"trackfi")+"-annual-"+yr+".html");
  }

  // ── REPORT 4: Raw data CSV (for accountant / spreadsheet) ─────────────────
  function exportRawCSV(){
    const hdr=["Date","Description","Category","Amount","Type","Notes","Owner"];
    const expRows=[...expenses].sort((a,b)=>b.date?.localeCompare(a.date)).map(e=>[
      e.date,(e.name||"").replace(/,/g," "),e.category||"","-"+parseFloat(e.amount||0).toFixed(2),"Expense",(e.notes||"").replace(/,/g," "),e.owner||"me"
    ]);
    const billRows=bills.filter(b=>b.paid).map(b=>[
      b.dueDate||"",(b.name||"").replace(/,/g," "),"Bill","-"+parseFloat(b.amount||0).toFixed(2),"Bill Payment","",b.paidBy||"me"
    ]);
    const allRows=[...expRows,...billRows].sort((a,b)=>b[0].localeCompare(a[0]));
    const csv=[hdr,...allRows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\r\n");
    dlBlob(csv,(appName||"trackfi")+"-transactions-"+yr+".csv","text/csv");
  }

  const EXPORTS=[
    {icon:"📄",label:"Monthly Statement",desc:monthName+" — transactions, categories, bills",action:exportMonthlyStatement,color:C.accent,bg:C.accentBg,tag:"HTML"},
    {icon:"💎",label:"Net Worth Report",desc:"Full balance sheet — assets, debts, goals",action:exportNetWorthReport,color:C.purple,bg:C.purpleBg,tag:"HTML"},
    {icon:"📊",label:"Annual Summary",desc:yr+" year-to-date — trends & category breakdown",action:exportAnnualSummary,color:C.green,bg:C.greenBg,tag:"HTML"},
    {icon:"📋",label:"Raw Transaction Data",desc:"All transactions — for accountants & spreadsheets",action:exportRawCSV,color:C.textMid,bg:C.surfaceAlt,tag:"CSV"},
  ];

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(10,22,40,.55)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.surface,borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto",padding:"0 0 40px",animation:"slideUp .26s cubic-bezier(.22,1,.36,1)",boxShadow:"0 -4px 60px rgba(10,22,40,.22)"}}>
        <div style={{width:40,height:4,background:C.border,borderRadius:99,margin:"14px auto 4px"}}/>
        <div style={{padding:"16px 24px 20px",borderBottom:`1px solid ${C.borderLight}`,marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{background:C.accentBg,borderRadius:12,padding:"9px 10px",display:"flex"}}><Download size={20} color={C.accent}/></div>
            <div>
              <div style={{fontFamily:MF,fontSize:18,fontWeight:800,color:C.text,letterSpacing:-.3}}>Export Center</div>
              <div style={{fontSize:12,color:C.textLight,marginTop:1}}>Professional branded documents</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:C.surfaceAlt,border:"none",cursor:"pointer",color:C.textMid,padding:"7px 8px",borderRadius:10,display:"flex"}}><X size={15}/></button>
        </div>
        <div style={{padding:"0 24px"}}>
          <div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"10px 14px",marginBottom:18,fontSize:12,color:C.accent,lineHeight:1.5}}>
            💡 HTML reports open in your browser — tap <strong>🖨 Print / Save as PDF</strong> inside the document to save a professional PDF. Everything runs locally on your device.
          </div>
          {EXPORTS.map((ex,i)=>(
            <button key={i} onClick={ex.action} className="ba" style={{display:"flex",alignItems:"center",gap:14,width:"100%",background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:16,padding:"16px 16px",marginBottom:10,cursor:"pointer",textAlign:"left",transition:"all .15s"}}>
              <div style={{width:48,height:48,borderRadius:12,background:ex.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{ex.icon}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                  <span style={{fontSize:14,fontWeight:700,color:ex.color}}>{ex.label}</span>
                  <span style={{fontSize:10,fontWeight:700,background:ex.color+"18",color:ex.color,borderRadius:99,padding:"1px 7px"}}>{ex.tag}</span>
                </div>
                <div style={{fontSize:12,color:C.textLight,lineHeight:1.4}}>{ex.desc}</div>
              </div>
              <Download size={15} color={C.textLight}/>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
