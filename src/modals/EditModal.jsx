/**
 * Generic add/edit form for the three "core" entities: expense, bill, debt.
 *
 * - `item` is `{ type: "expense" | "bill" | "debt", data: {...} }`. The fields
 *   rendered, validators, and color/icon all switch on `type`.
 * - Expense & bill forms share the paid-from + bank/card resolution UX; bill adds
 *   recurring/auto-pay/loan-link, expense adds owner & tags.
 * - Debt form supports both credit cards and loans; loans optionally create a
 *   linked monthly bill so marking that bill paid reduces the loan principal.
 *
 * Save validation lives here (it knows the union type); the parent receives the
 * final patched form via `onSave`. If `onSave` returns `false` the modal stays
 * open (lets the parent surface its own errors without flickering the modal).
 */
import React, { useState } from "react";
import { Wallet, CalendarClock, CreditCard, ToggleLeft, ToggleRight } from "lucide-react";
import { C, DEBT_PALETTE, debtDisplayColor } from "../theme.js";
import { Modal, FI, FS } from "../components/ui.jsx";
import { ColorSwatchPicker } from "../components/ColorSwatchPicker.jsx";
import {
  normalizePaidFrom, pickDefaultBankAccountId, pickDefaultCreditDebtId,
  validateCashSpendPrerequisites, PAID_FROM_OPTIONS, PAID_FROM_FS_LABELS,
} from "../lib/accountsLogic.js";
import { cardDebtsList } from "../lib/creditCardTotals.js";
import { cashAccountsByKind } from "../lib/cashAccounts.js";
import { loanDebtsList } from "../lib/debtLogic.js";
import { todayStr, fmt } from "../lib/moneyFormat.js";

export default function EditModal({ item, categories, household, debts = [], bills = [], accounts = {}, settings = {}, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(() => {
    if (item.type !== "debt") return { ...item.data };
    const d = item.data;
    const lb = (bills || []).find((b) => String(b.linkedDebtId) === String(d.id));
    const defPf = normalizePaidFrom(settings.defaultBillPaidFrom || "checking");
    return {
      ...d,
      addLoanBill: !!lb,
      loanBillDueDate: lb?.dueDate || todayStr(),
      billPaidFrom: lb ? normalizePaidFrom(lb.paidFrom) : defPf,
      billBankAccountId:
        lb?.bankAccountId != null && String(lb.bankAccountId) !== ""
          ? String(lb.bankAccountId)
          : String(pickDefaultBankAccountId(lb ? normalizePaidFrom(lb.paidFrom) : defPf, accounts, settings) || ""),
    };
  });
  const [editError, setEditError] = useState("");
  const ff = (k, v) => { setEditError(""); setForm((p) => ({ ...p, [k]: v })); };
  const type = item.type;

  function save() {
    if (type === "expense") {
      if (!form.name) { setEditError("Name is required."); return; }
      if (!form.amount || parseFloat(form.amount) <= 0) { setEditError("Enter a valid amount."); return; }
      const pf = normalizePaidFrom(form.paidFrom);
      const effCardE = String(form.creditDebtId || "").trim() || pickDefaultCreditDebtId(settings, debts);
      if (pf === "credit" && cardDebtsList(debts).length && !effCardE) {
        setEditError("Select which credit card, or set a default in Settings \u2192 Defaults.");
        return;
      }
      const cashVE = validateCashSpendPrerequisites(pf, form.bankAccountId, accounts, settings);
      if (cashVE) { setEditError(cashVE); return; }
    }
    if (type === "bill") {
      if (!form.name) { setEditError("Name is required."); return; }
      if (!form.amount || parseFloat(form.amount) <= 0) { setEditError("Enter a valid amount."); return; }
      const bpf = normalizePaidFrom(form.paidFrom);
      const bcds = cardDebtsList(debts);
      const effCardB = String(form.creditDebtId || "").trim() || pickDefaultCreditDebtId(settings, debts);
      if (form.linkedDebtId && bpf === "credit") {
        setEditError("Loan-linked bills must pay from checking or savings.");
        return;
      }
      if (bpf === "credit" && !bcds.length) {
        setEditError("Add a credit card under Debt first.");
        return;
      }
      if (bpf === "credit" && bcds.length && !effCardB) {
        setEditError("Select which credit card pays this bill, or set a default in Settings \u2192 Defaults.");
        return;
      }
      const cashVB = validateCashSpendPrerequisites(bpf, form.bankAccountId, accounts, settings);
      if (cashVB) { setEditError(cashVB); return; }
    }
    if (type === "debt") {
      if (!form.name) { setEditError("Name is required."); return; }
      if (!form.balance) { setEditError("Balance is required."); return; }
      const dk = form.debtKind === "credit_card" ? "credit_card" : "loan";
      const mp = parseFloat(form.minPayment || 0);
      if (dk === "loan" && form.addLoanBill !== false && mp > 0) {
        let bpf = normalizePaidFrom(form.billPaidFrom || settings.defaultBillPaidFrom || "checking");
        if (bpf === "credit") bpf = "checking";
        const loanCashErr = validateCashSpendPrerequisites(bpf, form.billBankAccountId, accounts, settings);
        if (loanCashErr) { setEditError(loanCashErr); return; }
      }
    }
    let savePayload = form;
    if (type === "bill") {
      const bpf = normalizePaidFrom(form.paidFrom);
      const effOut = String(form.creditDebtId || "").trim() || pickDefaultCreditDebtId(settings, debts);
      savePayload = { ...form };
      if (bpf === "credit" && effOut) savePayload.creditDebtId = String(effOut);
      else delete savePayload.creditDebtId;
    }
    if (onSave(savePayload) === false) return;
    onClose();
  }

  const accent = type === "expense" ? C.accent : type === "bill" ? C.amber : C.red;
  const title = type === "expense" ? "Edit Expense" : type === "bill" ? "Edit Bill" : "Edit Debt";
  const Icon = type === "expense" ? Wallet : type === "bill" ? CalendarClock : CreditCard;

  return (
    <Modal title={title} icon={Icon} onClose={onClose} onSubmit={save} submitLabel="Save Changes" accent={accent} wide error={editError}>
      {(type === "expense" || type === "bill") && <FI label="Name" value={form.name || ""} onChange={(e) => ff("name", e.target.value)} />}
      {type === "debt" && <FI label="Debt Name" value={form.name || ""} onChange={(e) => ff("name", e.target.value)} />}
      {type === "expense" && <><div style={{display:"flex",gap:12}}><FI half label="Amount ($)" type="number" value={form.amount||""} onChange={e=>ff("amount",e.target.value)}/><FI half label="Date" type="date" value={form.date||todayStr()} onChange={e=>ff("date",e.target.value)}/></div><FS label="Category" options={categories.map(c=>c.name)} value={form.category||""} onChange={e=>ff("category",e.target.value)}/><FS label="Paid from" options={PAID_FROM_OPTIONS.map(k=>({value:k,label:PAID_FROM_FS_LABELS[k]}))} value={normalizePaidFrom(form.paidFrom)} onChange={e=>{ff("paidFrom",e.target.value);const v=normalizePaidFrom(e.target.value);if(v==="credit")ff("creditDebtId",pickDefaultCreditDebtId(settings,debts)||"");else ff("creditDebtId","");ff("bankAccountId",pickDefaultBankAccountId(v,accounts,settings)||"");}}/>{normalizePaidFrom(form.paidFrom)==="credit"&&cardDebtsList(debts).length>1&&<FS label="Which card" options={cardDebtsList(debts).map(d=>({value:String(d.id),label:d.name+" — "+fmt(parseFloat(d.balance||0))+" principal"}))} value={String(form.creditDebtId||"")} onChange={e=>ff("creditDebtId",e.target.value)}/>}{normalizePaidFrom(form.paidFrom)==="credit"&&cardDebtsList(debts).length===0&&<div style={{fontSize:12,color:C.red,marginBottom:12}}>Add credit cards under Debt (type: Credit card) first.</div>}{normalizePaidFrom(form.paidFrom)==="checking"&&cashAccountsByKind(accounts,"checking").length>1&&<FS label="Which checking" options={cashAccountsByKind(accounts,"checking").map(a=>({value:String(a.id),label:(a.name||"Checking")+" — "+fmt(parseFloat(a.balance||0))}))} value={String(form.bankAccountId||pickDefaultBankAccountId("checking",accounts,settings)||"")} onChange={e=>ff("bankAccountId",e.target.value)}/>}{normalizePaidFrom(form.paidFrom)==="savings"&&cashAccountsByKind(accounts,"savings").length>1&&<FS label="Which savings" options={cashAccountsByKind(accounts,"savings").map(a=>({value:String(a.id),label:(a.name||"Savings")+" — "+fmt(parseFloat(a.balance||0))}))} value={String(form.bankAccountId||pickDefaultBankAccountId("savings",accounts,settings)||"")} onChange={e=>ff("bankAccountId",e.target.value)}/>}<FI label="Notes" value={form.notes||""} onChange={e=>ff("notes",e.target.value)}/>
          {household?.enabled&&household?.members?.length>1&&item?.data?.type!=="bill"&&<div style={{marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Assign to</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {[{id:"shared",name:"Shared",emoji:"🏠"},...(household.members||[])].map(m=>(
                <button key={m.id} onClick={()=>ff("owner",m.id)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:99,border:`1.5px solid ${(form.owner||item?.data?.owner||"shared")===m.id?C.accent:C.border}`,background:(form.owner||item?.data?.owner||"shared")===m.id?C.accentBg:"transparent",cursor:"pointer",fontSize:12,fontWeight:(form.owner||item?.data?.owner||"shared")===m.id?700:400,color:(form.owner||item?.data?.owner||"shared")===m.id?C.accent:C.textMid}}>
                  <span>{m.emoji}</span><span>{m.name}</span>
                </button>
              ))}
            </div>
          </div>}
          <div style={{marginBottom:12}}><div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Tags</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{["food","transport","health","work","personal","family","fun","recurring"].map(tag=>{const on=(form.tags||[]).includes(tag);return(<button key={tag} onClick={()=>ff("tags",on?(form.tags||[]).filter(t=>t!==tag):[...(form.tags||[]),tag])} style={{padding:"5px 12px",borderRadius:99,border:`1.5px solid ${on?C.accent:C.border}`,background:on?C.accentBg:C.surface,color:on?C.accent:C.textMid,fontSize:12,fontWeight:on?700:500,cursor:"pointer"}}>{tag}</button>);})}</div></div></>}
      {type==="bill"&&<><div style={{display:"flex",gap:12}}><FI half label="Amount ($)" type="number" value={form.amount||""} onChange={e=>ff("amount",e.target.value)}/><FI half label="Due Date" type="date" value={form.dueDate||""} onChange={e=>ff("dueDate",e.target.value)}/></div><FS label="Recurring" options={["Weekly","Bi-weekly","Monthly","Quarterly","Annual","One-time"]} value={form.recurring||""} onChange={e=>ff("recurring",e.target.value)}/><FS label="Pay from (when paid)" options={PAID_FROM_OPTIONS.map(k=>({value:k,label:PAID_FROM_FS_LABELS[k]}))} value={normalizePaidFrom(form.paidFrom)} onChange={e=>{ff("paidFrom",e.target.value);const v=normalizePaidFrom(e.target.value);if(v==="credit")ff("creditDebtId",pickDefaultCreditDebtId(settings,debts)||"");else ff("creditDebtId","");if(v==="credit"&&form.linkedDebtId)ff("linkedDebtId","");ff("bankAccountId",pickDefaultBankAccountId(v,accounts,settings)||"");}}/>{loanDebtsList(debts).length>0&&<FS label="Pay down loan (optional)" options={[{value:"",label:"— None —"},...loanDebtsList(debts).map(d=>({value:String(d.id),label:d.name+" — "+fmt(parseFloat(d.balance||0))}))]} value={form.linkedDebtId!=null&&form.linkedDebtId!==""?String(form.linkedDebtId):""} onChange={e=>{const v=e.target.value;if(!v){ff("linkedDebtId","");return;}ff("linkedDebtId",v);if(normalizePaidFrom(form.paidFrom)==="credit"){ff("paidFrom","checking");ff("creditDebtId","");ff("bankAccountId",pickDefaultBankAccountId("checking",accounts,settings)||"");}}}/>}{normalizePaidFrom(form.paidFrom)==="credit"&&cardDebtsList(debts).length>1&&<FS label="Which card pays this bill" options={cardDebtsList(debts).map(d=>({value:String(d.id),label:d.name+" — "+fmt(parseFloat(d.balance||0))+" principal"}))} value={String(form.creditDebtId||"")} onChange={e=>ff("creditDebtId",e.target.value)}/>}{normalizePaidFrom(form.paidFrom)==="credit"&&cardDebtsList(debts).length===0&&<div style={{fontSize:12,color:C.red,marginBottom:12}}>Add credit cards under Debt (type: Credit card) first.</div>}{normalizePaidFrom(form.paidFrom)==="checking"&&cashAccountsByKind(accounts,"checking").length>1&&<FS label="Which checking account" options={cashAccountsByKind(accounts,"checking").map(a=>({value:String(a.id),label:(a.name||"Checking")+" — "+fmt(parseFloat(a.balance||0))}))} value={String(form.bankAccountId||pickDefaultBankAccountId("checking",accounts,settings)||"")} onChange={e=>ff("bankAccountId",e.target.value)}/>}{normalizePaidFrom(form.paidFrom)==="savings"&&cashAccountsByKind(accounts,"savings").length>1&&<FS label="Which savings account" options={cashAccountsByKind(accounts,"savings").map(a=>({value:String(a.id),label:(a.name||"Savings")+" — "+fmt(parseFloat(a.balance||0))}))} value={String(form.bankAccountId||pickDefaultBankAccountId("savings",accounts,settings)||"")} onChange={e=>ff("bankAccountId",e.target.value)}/>}<FI label="Notes (optional)" value={form.notes||""} onChange={e=>ff("notes",e.target.value)}/><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderTop:`1px solid ${C.border}`,marginTop:4}}><div><div style={{fontSize:13,fontWeight:600,color:C.text}}>Auto-Pay</div><div style={{fontSize:12,color:C.textLight,lineHeight:1.4}}>Badge only — does not mark paid or move money. You still tap paid when it clears.</div></div><button onClick={()=>ff("autoPay",!form.autoPay)} style={{background:"none",border:"none",cursor:"pointer",color:form.autoPay?C.accent:C.borderLight,padding:0,display:"flex"}}>{form.autoPay?<ToggleRight size={30}/>:<ToggleLeft size={30}/>}</button></div></>}
      {type==="debt"&&<><FS label="Debt type" options={[{value:"loan",label:"Loan / installment / other"},{value:"credit_card",label:"💳 Credit card"}]} value={form.debtKind==="credit_card"?"credit_card":"loan"} onChange={e=>ff("debtKind",e.target.value)}/><div style={{display:"flex",gap:12}}><FI half label="Balance ($)" type="number" value={form.balance||""} onChange={e=>ff("balance",e.target.value)}/><FI half label="Original ($)" type="number" value={form.original||""} onChange={e=>ff("original",e.target.value)}/></div><div style={{display:"flex",gap:12}}><FI half label="Rate %" type="number" value={form.rate||""} onChange={e=>ff("rate",e.target.value)}/><FI half label="Min Payment ($)" type="number" value={form.minPayment||""} onChange={e=>ff("minPayment",e.target.value)}/></div>{form.debtKind!=="credit_card"&&<><div style={{background:C.accentBg,border:`1px solid ${C.accentMid}`,borderRadius:12,padding:"10px 14px",marginTop:10,marginBottom:8,fontSize:12,color:C.textMid,lineHeight:1.48}}>Add or keep a <strong>monthly bill</strong> that matches this payment. Marking it paid reduces the loan balance by the estimated principal.</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0"}}><div><div style={{fontSize:13,fontWeight:600,color:C.text}}>Linked monthly bill</div><div style={{fontSize:11,color:C.textLight}}>Min. payment amount · Bills tab</div></div><button type="button" className="ba" onClick={()=>ff("addLoanBill",!(form.addLoanBill!==false))} style={{background:"none",border:"none",cursor:"pointer",padding:0,color:form.addLoanBill!==false?C.accent:C.borderLight}}>{form.addLoanBill!==false?<ToggleRight size={30}/>:<ToggleLeft size={30}/>}</button></div>{form.addLoanBill!==false&&parseFloat(form.minPayment||0)>0&&<><FI label="Next bill due" type="date" value={form.loanBillDueDate||todayStr()} onChange={e=>ff("loanBillDueDate",e.target.value)}/><FS label="Bill pays from" options={PAID_FROM_OPTIONS.filter(k=>k!=="credit"&&k!=="none").map(k=>({value:k,label:PAID_FROM_FS_LABELS[k]}))} value={normalizePaidFrom(form.billPaidFrom||settings.defaultBillPaidFrom||"checking")} onChange={e=>{ff("billPaidFrom",e.target.value);ff("billBankAccountId",pickDefaultBankAccountId(normalizePaidFrom(e.target.value),accounts,settings)||"");}}/>{normalizePaidFrom(form.billPaidFrom||settings.defaultBillPaidFrom||"checking")==="checking"&&cashAccountsByKind(accounts,"checking").length>1&&<FS label="Which checking" options={cashAccountsByKind(accounts,"checking").map(a=>({value:String(a.id),label:(a.name||"Checking")+" — "+fmt(parseFloat(a.balance||0))}))} value={String(form.billBankAccountId||pickDefaultBankAccountId("checking",accounts,settings)||"")} onChange={e=>ff("billBankAccountId",e.target.value)}/>}{normalizePaidFrom(form.billPaidFrom||settings.defaultBillPaidFrom||"checking")==="savings"&&cashAccountsByKind(accounts,"savings").length>1&&<FS label="Which savings" options={cashAccountsByKind(accounts,"savings").map(a=>({value:String(a.id),label:(a.name||"Savings")+" — "+fmt(parseFloat(a.balance||0))}))} value={String(form.billBankAccountId||pickDefaultBankAccountId("savings",accounts,settings)||"")} onChange={e=>ff("billBankAccountId",e.target.value)}/>}</>}</>}<div style={{marginTop:10}}><ColorSwatchPicker label="Chart color" shape="rounded" size={28} value={form.color||debtDisplayColor(item.data,debts)} onChange={(hex)=>ff("color",hex)}/><div style={{fontSize:11,color:C.textLight,marginTop:4,lineHeight:1.4}}>Used in the Debt pie and lists. Leave custom blank to keep the auto color.</div></div></>}
      <button className="ba" onClick={() => { onDelete(); onClose(); }} style={{ width: "100%", background: C.redBg, border: `1px solid ${C.redMid}`, borderRadius: 12, padding: "13px 0", color: C.red, fontWeight: 700, fontSize: 14, cursor: "pointer", marginTop: 6 }}>🗑 Delete</button>
    </Modal>
  );
}
