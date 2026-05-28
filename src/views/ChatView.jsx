/**
 * Natural-language finance chat — the "AI Log" tab.
 *
 * Two paths:
 *   1. **Stats**  (`chatIsStatsQuery` true) — runs `handleQ` which is a big regex
 *      ladder that responds to "what's my balance", "bills due", "ytd", etc.
 *      Pure-read, no state mutations.
 *   2. **Action** (`parseMsg` returns a non-null type) — stages the action into
 *      `pending`, asks the user to confirm the paid-from on expenses (because
 *      that decision changes which account/card moves), then commits it.
 *
 * Undo stack tracks the most recent action so `undo` reverses balance side effects
 * via `applyRefund` / restoring the pre-pay bill snapshot.
 *
 * NOTE: this file consciously imports from many `lib/` modules — the chat is a
 * thin orchestrator over the same logic the rest of the app uses, so any bug in
 * "spend from credit then undo" gets fixed in `accountsLogic.js` once, not here.
 */
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Send } from "lucide-react";
import { C, MF, FULL_MOS } from "../theme.js";
import { parseMsg, chatIsStatsQuery } from "../lib/parseMsg.js";
import {
  normalizePaidFrom, pickDefaultBankAccountId, pickDefaultCreditDebtId,
  totalAppAssets, canReverseExpenseBalance, validateCashSpendPrerequisites,
  resolveBankAccountIdForExpense, resolveBillSpendIds, sumMtdByPaidFrom,
  PAID_FROM_FS_LABELS,
} from "../lib/accountsLogic.js";
import { cardDebtsList, legacyCreditCardOwed } from "../lib/creditCardTotals.js";
import { cashAccountsByKind, totalCheckingBalance, totalSavingsBalance } from "../lib/cashAccounts.js";
import {
  sumDebtsPrincipalAndAccrued, approxMonthlyInterestOnDebts, debtOwedForBreakdown,
} from "../lib/debtLogic.js";
import { computeSafeToSpend } from "../lib/safeToSpend.js";
import { commitMarkBillPaid } from "../lib/billsLogic.js";
import { dueIn } from "../lib/dateHelpers.js";
import { fmt } from "../lib/moneyFormat.js";
import { round2 } from "../lib/loanSplit.js";

export default function ChatView({ categories, expenses, bills, debts, accounts, income, savingsGoals, trades, tradingAccount, budgetGoals = [], setExpenses, setBills, setDebts, setSGoals, setAccounts, setIncome, setTrades, setBGoals, applySpend, applyRefund, defaultExpensePaidFrom, defaultBillPaidFrom, settings, showToast }) {
  const [msgs, setMsgs] = useState([{ role: "a", text: "Hey! Natural-language finance logger — confirm paid-from on expenses before saving.\n\n\
WRITE:\n• Expense: lunch 12 · add expense coffee 5.50 · groceries 80 yesterday · starbucks 4 tomorrow · 15% tip\n\
• Card: … on card · … chase visa (matches card name)\n\
• Bill: rent 1500 due 1st · electric 90 weekly · gym 50 annual\n\
• Paid: paid rent · mark electric as paid · netflix paid\n\
• Balances: checking 3200 · savings 10k · roth 25000 · hsa 1200 · moved 200 to savings\n\
• Income / mo: salary 4000 · freelance 800 · dividends 50 · other income 200\n\
• Debt / trade: car loan 12000 at 6% · long ES +450\n\
• Split: dinner 120 split 3\n\
UNDO: undo\n\n\
ASK: split spending · my balances · bills · can I afford $200? · spending on Groceries · goals · debt · net worth · \
budget · trades · ytd · recent expenses · payday · help" }]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(null);
  const [history, setHistory] = useState([]);
  const [expConfirm, setExpConfirm] = useState(null);
  const botRef = useRef();

  useEffect(() => { botRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, pending]);
  useEffect(() => {
    if (pending?.type === "expense") {
      const pf = normalizePaidFrom(pending.paidFrom ?? defaultExpensePaidFrom);
      const cards = cardDebtsList(debts);
      let cid = pending.creditDebtId ? String(pending.creditDebtId) : "";
      if (pf === "credit" && cards.length && (!cid || !cards.some((c) => String(c.id) === cid))) {
        cid = pickDefaultCreditDebtId(settings, debts) || "";
      }
      const bid = pickDefaultBankAccountId(pf, accounts, settings) || "";
      setExpConfirm({ paidFrom: pf, creditDebtId: cid, bankAccountId: bid });
    } else setExpConfirm(null);
  }, [pending, debts, defaultExpensePaidFrom, accounts, settings]);

  const chPick = cashAccountsByKind(accounts, "checking");
  const svPick = cashAccountsByKind(accounts, "savings");
  const ti = useMemo(
    () => (parseFloat(income.primary || 0) * (income.payFrequency === "Weekly" ? (52 / 12) : income.payFrequency === "Twice Monthly" ? 2 : income.payFrequency === "Monthly" ? 1 : (26 / 12))) +
      (parseFloat(income.other || 0)) + (parseFloat(income.trading || 0)) + (parseFloat(income.rental || 0)) +
      (parseFloat(income.dividends || 0)) + (parseFloat(income.freelance || 0)),
    [income]
  );
  const ccOwed = legacyCreditCardOwed(accounts, debts);
  const chatNow = new Date();
  const safeToSpendChat = useMemo(
    () => computeSafeToSpend(accounts, income, bills, expenses, budgetGoals || [], new Date()),
    [accounts, income, bills, expenses, budgetGoals]
  );
  const ck = safeToSpendChat.checkingBalance;
  const sts = safeToSpendChat.sts;
  const bs = safeToSpendChat.billsBeforeNextPayAmt;
  const chatNextPay = safeToSpendChat.nextPayDate;
  const chatPayFreq = safeToSpendChat.payFreq;
  const burn = safeToSpendChat.burnRateChecking;
  const _chatMs = safeToSpendChat.envelopeMonthKey;
  const _chatSplit = sumMtdByPaidFrom(expenses, _chatMs);
  const _chatMtd = _chatSplit.checking + _chatSplit.credit + _chatSplit.savings + _chatSplit.none;
  const _thisMs = _chatMs;
  const _thisExp = expenses.filter((e) => e.date?.startsWith(_thisMs));
  const _thisTotal = _thisExp.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const _prevMs = (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); })();
  const _prevTotal = expenses.filter((e) => e.date?.startsWith(_prevMs)).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const _catTotals = _thisExp.reduce((a, e) => { a[e.category] = (a[e.category] || 0) + (parseFloat(e.amount) || 0); return a; }, {});
  const _topCats = Object.entries(_catTotals).sort((a, b) => b[1] - a[1]);

  /** Undo chat-initiated bill payment: refund + loan row restore + bill row from pre-pay snapshot. */
  function revertBillPaidFromChat(last) {
    const snap = last.snap;
    if (!snap || snap.id == null) { showToast && showToast("Nothing to undo for that payment.", "error"); return false; }
    const cur = bills.find((x) => String(x.id) === String(snap.id));
    if (!cur) { showToast && showToast("Can\u2019t undo — that bill is no longer in your list.", "error"); return false; }
    const bamt = parseFloat(snap.amount) || 0;
    const bpf = normalizePaidFrom(snap.paidFrom);
    const r = resolveBillSpendIds(snap, accounts, debts, settings);
    if (!r.ok) { showToast && showToast(r.msg, "error"); return false; }
    if (applyRefund && bamt) applyRefund(bpf, bamt, r.cid, r.bid);
    const addBack = parseFloat(cur.loanPrincipalApplied) || 0;
    if (snap.linkedDebtId && (addBack > 0 || cur.loanPrevInterestAsOfDate != null || cur.loanPrevAccruedInterest !== undefined)) {
      setDebts((p) => p.map((d) => {
        if (String(d.id) !== String(snap.linkedDebtId)) return d;
        const o = { ...d };
        if (addBack > 0) o.balance = String(round2(parseFloat(d.balance || 0) + addBack));
        if (cur.loanPrevInterestAsOfDate != null && cur.loanPrevInterestAsOfDate !== "") o.loanInterestAsOfDate = cur.loanPrevInterestAsOfDate;
        if (cur.loanPrevAccruedInterest !== undefined) {
          const vc = parseFloat(cur.loanPrevAccruedInterest) || 0;
          if (vc > 0.001) o.loanAccruedInterest = String(round2(vc));
          else delete o.loanAccruedInterest;
        }
        return o;
      }));
    }
    setBills((p) => p.map((xx) => String(xx.id) === String(snap.id) ? snap : xx));
    return true;
  }

  const CHAT_UNDO_EXPENSE_BALANCE_TOAST = "Undone — balances unchanged (pay-from no longer resolves the same targets).";

  function handleQ(t){
    if(t.includes("afford")||t.includes("safe to spend")||t.includes("safe to")){
      const m=t.match(/[\d,]+/);const a=m?parseFloat(m[0].replace(/,/g,"")):null;
      if(a)return a<=sts?"\u2705 Yes \u2014 "+fmt(a)+" fits. You have "+fmt(sts)+" safe to spend until "+chatNextPay.toLocaleDateString("en-US",{month:"short",day:"numeric"})+".":"\u274c No \u2014 "+fmt(a)+" exceeds your safe-to-spend of "+fmt(sts)+". Short by "+fmt(a-sts)+".";
      return"Safe to spend: "+fmt(sts)+" \u2014 cash path (checking burn projection; credit card charges don\u2019t reduce this).\nChecking: "+fmt(ck)+(ccOwed>0?"\n\ud83d\udcb3 Card balance owed (in app): "+fmt(ccOwed):"")+"\nBills before payday: "+fmt(bs)+"\nNext pay: "+chatNextPay.toLocaleDateString("en-US",{month:"short",day:"numeric"});
    }
    if((t.includes("split")&&t.includes("spend"))||t.includes("checking vs credit")||t.includes("paid from")||t.includes("paidfrom")){
      return"\ud83d\udcca This month by paid-from:\n\ud83c\udfe6 Checking: "+fmt(_chatSplit.checking)+"\n\ud83d\udcb3 Credit card: "+fmt(_chatSplit.credit)+"\n\ud83d\udcb0 Savings: "+fmt(_chatSplit.savings)+"\n\ud83d\udccb Track only: "+fmt(_chatSplit.none)+"\n\nTotal in categories: "+fmt(_chatMtd);
    }
    const _qBills=t.includes("bill")||t.includes("due")||t.includes("upcoming");
    const _chkSav=(t.includes("checking")||t.includes("savings"))&&!_qBills&&!t.includes("rate")&&!t.includes("goal")&&!t.includes("goals");
    const _howMuchCash=!_qBills&&t.includes("how much")&&!t.includes("spent")&&!t.includes("spend on")&&!t.includes("spent on")&&!t.includes("spending")&&(t.includes("checking")||t.includes("savings")||t.includes("account")||t.includes("accounts")||t.includes("cash")||t.includes("liquid")||/\b(do i have|have in|i have left|in the bank)\b/.test(t));
    const _acctCash=(t.includes("account")||t.includes("accounts"))&&!t.includes("health")&&!_qBills&&(t.includes("bank")||t.includes("balance")||/\bwhat'?s\b/.test(t)||t.includes("what is")||t.includes("total")||t.includes("worth"));
    if(t.includes("balance")||t.includes("balances")||_chkSav||_howMuchCash||_acctCash){
      const chkBal=totalCheckingBalance(accounts);
      const savBal=totalSavingsBalance(accounts);
      const cushion=parseFloat(accounts.cushion||0);
      const liquid=chkBal+savBal+cushion;
      const inv=parseFloat(accounts.investments||0);
      const k401=parseFloat(accounts.k401||0);
      const roth=parseFloat(accounts.roth_ira||0);
      const hsa=parseFloat(accounts.hsa||0);
      const retBal=k401+roth+hsa;
      const br=parseFloat(accounts.brokerage||0);
      const cry=parseFloat(accounts.crypto||0);
      const prop=parseFloat(accounts.property||0);
      const veh=parseFloat(accounts.vehicles||0);
      const tb=parseFloat(tradingAccount?.balance||0);
      const ta=totalAppAssets(accounts,tradingAccount);
      const showTrading=tb>0||/\btrading (bal|balance|acct|account)\b/.test(t);
      let out="\ud83d\udcb3 Checking: "+fmt(chkBal)+"\n\ud83d\udcb0 Savings: "+fmt(savBal);
      if(cushion>0)out+="\n\ud83d\udee1\ufe0f Cushion: "+fmt(cushion);
      out+="\n\ud83d\udca7 Liquid (checking + savings + cushion): "+fmt(liquid);
      if(inv>0)out+="\n\ud83d\udcc8 Investments: "+fmt(inv);
      if(retBal>0)out+="\n\ud83c\udfe6 Retirement (401k + Roth + HSA): "+fmt(retBal);
      if(br+cry>0)out+="\n\ud83d\udcca Brokerage + crypto: "+fmt(br+cry);
      if(showTrading)out+="\n\ud83d\udcc8 Trading (app): "+fmt(tb);
      if(prop>0)out+="\n\ud83c\udfe0 Property: "+fmt(prop);
      if(veh>0)out+="\n\ud83d\ude97 Vehicles: "+fmt(veh);
      if(ccOwed>0)out+="\n\ud83d\udcb3 Credit card owed (app): "+fmt(ccOwed);
      out+="\nTotal assets (app): "+fmt(ta);
      return out;
    }
    if(t.includes("bill")||t.includes("due")||t.includes("upcoming")){
      const ov=bills.filter(b=>!b.paid&&dueIn(b.dueDate)<0);
      const soon=bills.filter(b=>!b.paid&&dueIn(b.dueDate)>=0&&dueIn(b.dueDate)<=14);
      const later=bills.filter(b=>!b.paid&&dueIn(b.dueDate)>14);
      let resp="";
      if(ov.length)resp+="\ud83d\udea8 OVERDUE ("+fmt(ov.reduce((s,b)=>s+(parseFloat(b.amount)||0),0))+"):\n"+ov.map(b=>"\u2022 "+b.name+" "+fmt(b.amount)+" \u2014 "+Math.abs(dueIn(b.dueDate))+"d overdue").join("\n")+"\n\n";
      if(soon.length)resp+="\ud83d\udcc5 Due soon:\n"+soon.map(b=>"\u2022 "+b.name+" "+fmt(b.amount)+" \u2014 "+dueIn(b.dueDate)+"d left").join("\n")+"\n\n";
      if(later.length)resp+="Later: "+later.map(b=>b.name+" "+fmt(b.amount)).join(", ");
      return resp.trim()||"\u2705 No bills due soon!";
    }
    if(t.includes("spend on")||t.includes("spent on")||t.includes("how much")||t.includes("categor")){
      const catMatch=categories.find(c=>t.includes(c.name.toLowerCase()));
      if(catMatch){
        const catAmt=_catTotals[catMatch.name]||0;
        const catTxns=_thisExp.filter(e=>e.category===catMatch.name);
        return catMatch.name+" this month: "+fmt(catAmt)+" ("+catTxns.length+" transactions)"+(catTxns.length>0?"\nRecent: "+catTxns.slice(-3).map(e=>e.name+" "+fmt(e.amount)).join(", "):"");
      }
      if(_topCats.length>0)return"Top spending this month:\n"+_topCats.slice(0,6).map(([cat,amt],i)=>(i+1)+". "+cat+": "+fmt(amt)).join("\n")+"\n\nTotal: "+fmt(_thisTotal);
      return"No spending logged this month yet.";
    }
    if(t.includes("ytd")||t.includes("year to date")){
      const y=chatNow.getFullYear();
      const ytd=expenses.filter(e=>e.date&&e.date.startsWith(String(y))).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
      const n=expenses.filter(e=>e.date&&e.date.startsWith(String(y))).length;
      return"\ud83d\udcc5 "+y+" YTD spending: "+fmt(ytd)+" ("+n+" transactions)";
    }
    if(t.includes("how am i")||t.includes("doing this month")||t.includes("this month")||(t.includes("spend")&&!t.includes("spend on")&&!t.includes("ytd")&&!t.includes("year to date"))){
      const dom=new Date().getDate();const dim=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate();
      const projected=dom>0?(_thisTotal/dom)*dim:0;
      const diff=_prevTotal>0?((_thisTotal-_prevTotal)/_prevTotal*100):0;
      const splitLn=_chatSplit.credit+_chatSplit.none+_chatSplit.savings>0?"\nBy paid-from: "+fmt(_chatSplit.checking)+" chk · "+fmt(_chatSplit.credit)+" card · "+fmt(_chatSplit.savings)+" sav · "+fmt(_chatSplit.none)+" track":"";
      return"\ud83d\udcca "+FULL_MOS[new Date().getMonth()]+" so far: "+fmt(_thisTotal)+splitLn+"\nBurn (all): "+fmt(dom>0?_thisTotal/dom:0)+"/day\nProjected month-end: "+fmt(projected)+(_prevTotal>0?"\n"+(diff>0?"\u2b06\ufe0f "+diff.toFixed(0)+"% more":"\u2b07\ufe0f "+Math.abs(diff).toFixed(0)+"% less")+" than last month":"");
    }
    if(t.includes("payday")||t.includes("paycheck")||t.includes("pay day")||t.includes("next pay")||t.includes("get paid")){
      const days=Math.max(0,Math.ceil((chatNextPay-chatNow)/86400000));
      return"\ud83d\udcb0 Next payday: "+chatNextPay.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})+(days===0?" (Today!)":" ("+days+" days)")+"\nExpected: "+fmt(parseFloat(income.primary||0))+"\nSafe to spend until then: "+fmt(sts);
    }
    if(t.includes("income")||t.includes("earn")||t.includes("salary")||(t.includes("make")&&t.includes("month"))){
      const sources=[];
      if(income.primary)sources.push("\ud83d\udcb5 Paycheck ("+income.payFrequency+"): "+fmt(income.primary));
      if(income.other)sources.push("\ud83d\udccb Other: "+fmt(income.other)+"/mo");
      if(income.trading)sources.push("\ud83d\udcc8 Trading: "+fmt(income.trading)+"/mo");
      if(income.rental)sources.push("\ud83c\udfe0 Rental: "+fmt(income.rental)+"/mo");
      if(income.dividends)sources.push("\ud83d\udcca Dividends: "+fmt(income.dividends)+"/mo");
      if(income.freelance)sources.push("\ud83d\udcbb Freelance: "+fmt(income.freelance)+"/mo");
      const monthly=ti;
      return(sources.length?sources.join("\n"):"No income set yet")+"\n\nMonthly total: "+fmt(monthly)+"\nAnnual est: "+fmt(monthly*12);
    }
    if(t.includes("budget")||t.includes("envelope")||(t.includes("category")&&t.includes("limit"))){
      if(!budgetGoals||!budgetGoals.length)return"No budget envelopes yet — add them under Budget in the menu.";
      const lines=budgetGoals.map(g=>{
        const lim=parseFloat(g.limit||0);if(!lim)return(g.category||"Cat")+": no limit set";
        const spent=_thisExp.filter(e=>e.category===g.category).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
        const pct=Math.min(100,lim>0?(spent/lim)*100:0);
        return(g.category||"—")+": "+fmt(spent)+" / "+fmt(lim)+" ("+pct.toFixed(0)+"%)";
      });
      return"\ud83d\udccb Budget vs MTD spend:\n"+lines.join("\n");
    }
    if(t.includes("trade")||t.includes("p&l")||t.includes("pnl")||t.includes("win rate")||(t.includes("futures")&&t.includes("how"))){
      if(!trades.length)return"No trades logged. Example: long ES +450";
      const pnls=trades.map(x=>parseFloat(x.pnl)||0);const wins=pnls.filter(p=>p>0).length;
      const total=pnls.reduce((s,p)=>s+p,0);
      return"\ud83d\udcc8 Trades: "+trades.length+" · Win rate: "+(pnls.length?((wins/pnls.length)*100).toFixed(0):"0")+"%\nNet P&L: "+(total>=0?"+":"")+fmt(total)+"\nLast: "+(trades[0]?trades[0].symbol+" "+trades[0].side+" "+fmt(trades[0].pnl):"—");
    }
    if(t.includes("recent")&&(t.includes("expense")||t.includes("transaction")||t.includes("purchase")||t.includes("spent"))){
      const last=[...expenses].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).slice(0,8);
      if(!last.length)return"No expenses yet.";
      return"Latest expenses:\n"+last.map(e=>(e.date||"—")+" · "+e.name+" · "+fmt(e.amount)+" · "+(e.category||"")).join("\n");
    }
    if(t.includes("liquid")||t.includes("cash on hand")||(t.includes("how much")&&t.includes("cash"))){
      const liq=totalCheckingBalance(accounts)+totalSavingsBalance(accounts)+parseFloat(accounts.cushion||0);
      return"\ud83d\udcb0 Liquid (checking + savings + cushion): "+fmt(liq);
    }
    if((t.includes("unpaid")||t.includes("outstanding"))&&t.includes("bill")){
      const u=bills.filter(b=>!b.paid);
      if(!u.length)return"\u2705 No unpaid bills.";
      return"\ud83d\udccb Unpaid bills ("+u.length+"): "+fmt(u.reduce((s,b)=>s+(parseFloat(b.amount)||0),0))+"\n"+u.slice(0,10).map(b=>"\u2022 "+b.name+" "+fmt(b.amount)+" due "+(b.dueDate||"—")).join("\n");
    }
    if(t.includes("goal")||t.includes("saving for")||t.includes("savings goal")){
      if(!savingsGoals.length)return"No savings goals set yet. Tap Goals in the menu to add one!";
      return"\ud83c\udfaf Savings Goals:\n"+savingsGoals.map(g=>{const pct=Math.min(100,(parseFloat(g.saved||0)/parseFloat(g.target||1))*100);const rem=Math.max(0,parseFloat(g.target||0)-parseFloat(g.saved||0));const mo=parseFloat(g.monthly||0);const months=mo>0?Math.ceil(rem/mo):null;return(g.icon||"\ud83c\udfaf")+" "+g.name+": "+fmt(g.saved||0)+" / "+fmt(g.target)+" ("+pct.toFixed(0)+"%)"+( months?" \u00b7 "+months+"mo to go":"");}).join("\n");
    }
    if(t.includes("debt")||t.includes("loan")||(t.includes("credit card")&&!t.includes("split"))||t.includes("owe")){
      const td=sumDebtsPrincipalAndAccrued(debts)+ccOwed;
      const monthlyInt=approxMonthlyInterestOnDebts(debts);
      const lines=[];
      if(ccOwed>0)lines.push("\ud83d\udcb3 Credit card (app balance): "+fmt(ccOwed));
      if(debts.length)lines.push(...debts.map(d=>"\u2022 "+d.name+": "+fmt(debtOwedForBreakdown(d))+(d.rate?" @ "+d.rate+"%":"")));
      if(!lines.length)return"\u2705 No debt or card balance in the app. Add loans with e.g. 'car loan 15000 at 6%'. Card charges from \"Credit card\" add to Settings \u2192 Credit card owed.";
      return"\ud83d\udcb3 Total owed: "+fmt(td)+(ccOwed>0&&debts.length?" (includes app card + debt list)":"")+"\n~\u2248 monthly interest on debts (APR\u00f712): "+fmt(monthlyInt)+"\n\n"+lines.join("\n");
    }
    if(t.includes("net worth")||t.includes("worth")){
      const ta=totalAppAssets(accounts,tradingAccount);
      const td=sumDebtsPrincipalAndAccrued(debts)+ccOwed;
      return"\ud83d\udcca Net Worth: "+fmt(ta-td)+"\nAssets: "+fmt(ta)+" \u00b7 Debts (loans + app card): "+fmt(td);
    }
    if(t.includes("biggest")||t.includes("largest")||t.includes("most spent")){
      const top=_thisExp.slice().sort((a,b)=>parseFloat(b.amount)-parseFloat(a.amount))[0];
      const topCat=_topCats[0];
      return(top?"💸 Biggest: "+top.name+" "+fmt(top.amount)+" on "+top.date+"\n":"")+(topCat?"📦 Top category: "+topCat[0]+" "+fmt(topCat[1]):"");
    }
    if(t.includes("last week")||t.includes("this week")){
      const now2=new Date();const day=now2.getDay();
      const weekStart=new Date(now2);weekStart.setDate(now2.getDate()-(t.includes("last week")?day+7:day));weekStart.setHours(0,0,0,0);
      const weekEnd=new Date(weekStart);weekEnd.setDate(weekStart.getDate()+7);
      const weekExp=expenses.filter(e=>{const d=new Date((e.date||"")+"T00:00:00");return d>=weekStart&&d<weekEnd;});
      const weekTotal=weekExp.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
      const weekCats=Object.entries(weekExp.reduce((a,e)=>{a[e.category]=(a[e.category]||0)+(parseFloat(e.amount)||0);return a},{})).sort((a,b)=>b[1]-a[1]);
      return(t.includes("last week")?"Last week":"This week")+": "+fmt(weekTotal)+" across "+weekExp.length+" transactions"+(weekCats.length?" · Top: "+weekCats[0][0]+" "+fmt(weekCats[0][1]):"");
    }
    if(t.includes("average")||t.includes("avg")||t.includes("typical")){
      const dom2=chatNow.getDate();
      return"📊 Daily average: "+fmt(_thisTotal/Math.max(1,dom2))+" · At this pace: "+fmt((_thisTotal/Math.max(1,dom2))*new Date(chatNow.getFullYear(),chatNow.getMonth()+1,0).getDate())+" this month";
    }
    if(t.includes("savings rate")||t.includes("saving rate")){
      const mult=chatPayFreq==="Weekly"?(52/12):chatPayFreq==="Twice Monthly"?2:chatPayFreq==="Monthly"?1:(26/12);
      const monthly=(parseFloat(income.primary||0)*mult)+(parseFloat(income.other||0));
      const sr=monthly>0?Math.max(0,(monthly-_thisTotal)/monthly*100):0;
      return"\ud83d\udcbe Savings rate: "+sr.toFixed(1)+"%\nIncome: "+fmt(monthly)+"/mo \u00b7 Spent: "+fmt(_thisTotal)+" \u00b7 Saving: "+fmt(Math.max(0,monthly-_thisTotal));
    }
    if(t.includes("subscription")||t.includes("recurring charge")){
      const nameMap={};expenses.forEach(e=>{const k=e.name?.toLowerCase().trim();if(!k)return;if(!nameMap[k])nameMap[k]=[];nameMap[k].push(e);});
      const subs=Object.values(nameMap).filter(v=>v.length>=2&&v.map(x=>parseFloat(x.amount)).every((a,_,arr)=>Math.abs(a-arr[0])<1));
      return subs.length?"\ud83d\udd04 Detected "+subs.length+" recurring charges:\n"+subs.map(v=>"\u2022 "+v[0].name+": "+fmt(v[0].amount)+"/mo").join("\n")+"\nTotal: "+fmt(subs.reduce((s,v)=>s+parseFloat(v[0].amount),0))+"/mo":"No recurring charges detected yet.";
    }
    if(t.includes("health")||t.includes("score")||t.includes("grade")){
      const mult=chatPayFreq==="Weekly"?(52/12):chatPayFreq==="Twice Monthly"?2:chatPayFreq==="Monthly"?1:(26/12);
      const monthly=(parseFloat(income.primary||0)*mult)+(parseFloat(income.other||0));
      const sr=monthly>0?Math.max(0,(monthly-_thisTotal)/monthly*100):0;
      const liquid=totalSavingsBalance(accounts)+parseFloat(accounts.cushion||0);
      const moExpH=_thisTotal||1;const ef=liquid/moExpH;
      const td=sumDebtsPrincipalAndAccrued(debts)+ccOwed;
      const s1=sr>=20?100:sr>=15?85:sr>=10?70:sr>=5?50:30;
      const s2=ef>=6?100:ef>=3?80:ef>=1?55:30;
      const s3=td===0?100:60;
      const overall=Math.round(((s1*.3)+(s2*.3)+(s3*.4))/10);
      const grade=overall>=9?"A+":overall>=8?"A":overall>=7?"B":overall>=6?"C":overall>=5?"D":"F";
      return"\u2764\ufe0f Health Score: "+overall+"/10 ("+grade+")\n\u2022 Savings rate: "+sr.toFixed(0)+"%\n\u2022 Emergency fund: "+ef.toFixed(1)+" months\n\u2022 Debt: "+(td===0?"Debt free \u2705":fmt(td)+" total")+"\nOpen Health Score tab for full breakdown.";
    }
    if(t.includes("compare")||t.includes("vs last")||t.includes("last month")&&t.includes("vs")){
      if(!_prevTotal)return"No data from last month yet.";
      const diff=_thisTotal-_prevTotal;const pct=Math.abs(diff/_prevTotal*100).toFixed(0);
      const top=_topCats[0];
      return(diff>0?"📈 Up "+pct+"% vs last month — spending "+fmt(diff)+" more.":"📉 Down "+pct+"% vs last month — "+fmt(Math.abs(diff))+" less. Nice!")+(top?"\nBiggest category: "+top[0]+" "+fmt(top[1]):"");
    }
    if(t.includes("on track")||t.includes("pace")||t.includes("budget for")){
      const mult=chatPayFreq==="Weekly"?(52/12):chatPayFreq==="Twice Monthly"?2:chatPayFreq==="Monthly"?1:(26/12);
      const monthly=(parseFloat(income.primary||0)*mult)+(parseFloat(income.other||0));
      if(!monthly)return"Set your income first so I can check your pace.";
      const dom=chatNow.getDate();const dim=new Date(chatNow.getFullYear(),chatNow.getMonth()+1,0).getDate();
      const pace=(monthly/dim)*dom;const diff=_thisTotal-pace;
      return diff<=0?"✅ On track — "+fmt(Math.abs(diff))+" under pace for the month.":"⚠️ "+fmt(diff)+" over pace. Projected: "+fmt((_thisTotal/Math.max(1,dom))*dim)+" vs "+fmt(monthly)+" income.";
    }
    if((t.includes("where")&&(t.includes("spend")||t.includes("most")))||(t.includes("what")&&t.includes("most"))){
      if(!_topCats.length)return"No spending logged yet this month.";
      return"💸 Where you're spending most:\n"+_topCats.slice(0,5).map(([c,a],i)=>(i+1)+". "+c+": "+fmt(a)).join("\n")+"\nTotal: "+fmt(_thisTotal);
    }
    if(t.includes("help")||t.includes("what can")||t.includes("commands")||t.includes("how do")||t.includes("examples")){
      return"\ud83d\udcac Quick ref —\n\
\u2022 Expense: lunch 12 · add expense uber 23 on card · gas 45 yesterday\n\
\u2022 Bill: internet 70 due 15th weekly · paid netflix\n\
\u2022 Balance: checking 2500 · roth 40000 · moved 100 to savings\n\
\u2022 Income: salary 5000 · freelance 1200 · dividends 25\n\
\u2022 Ask: split spending · my bills · budget · trades · ytd · recent expenses · liquid · net worth · can I afford $80?\n\
\u2022 undo";
    }
    return null;
  }

  function send(){const text=input.trim();if(!text)return;setInput("");setMsgs(p=>[...p,{role:"u",text}]);const t=text.toLowerCase();const isQ=chatIsStatsQuery(t);if(isQ){const ans=handleQ(t);if(ans){setMsgs(p=>[...p,{role:"a",text:ans}]);return;}}const parsed=parseMsg(text,categories,debts,bills,{defaultExpensePaidFrom,defaultBillPaidFrom,settings});if(parsed?.type==="billPaid"){const b=bills.find(x=>x.id===parsed.billId);if(!b){setMsgs(p=>[...p,{role:"a",text:"Couldn\u2019t find that bill."}]);return;}if(b.paid){setMsgs(p=>[...p,{role:"a",text:parsed.name+" is already marked paid."}]);return;}const billSnapPrePay=JSON.parse(JSON.stringify(b));const _paidRes=commitMarkBillPaid(b,{debts,setDebts,setBills,accounts,settings,applySpend,skipToast:true,skipVibrate:true});if(!_paidRes.ok){setMsgs(p=>[...p,{role:"a",text:_paidRes.msg}]);showToast&&showToast(_paidRes.msg,"error");return;}const _loanLine=_paidRes.tip&&_paidRes.tip.trim()?"\n"+_paidRes.tip.trim():"";setHistory(p=>[...p,{type:"billPaid",snap:billSnapPrePay,label:"Paid "+parsed.name}]);setMsgs(p=>[...p,{role:"a",text:"\u2705 Marked "+parsed.name+" as paid."+_loanLine}]);return;}if(!parsed){setMsgs(p=>[...p,{role:"a",text:"I didn\u2019t catch that. Try: lunch 12 · paid electric · rent 900 due 1st · checking 3200 · split spending\nOr tap help for a full list."}]);return;}
    if(parsed.type==="undo"){if(!history.length){setMsgs(p=>[...p,{role:"a",text:"Nothing to undo!"}]);return;}const last=history[history.length-1];if(last.type==="expense"){setExpenses(p=>p.filter(x=>x.id!==last.id));const refund=last.amt!=null?last.amt:parseFloat(expenses.find(e=>e.id===last.id)?.amount)||0;const rp=normalizePaidFrom(last.paidFrom);const _rv=canReverseExpenseBalance(rp,last.creditDebtId,last.bankAccountId,accounts,debts,settings);if(applyRefund&&refund&&_rv)applyRefund(rp,refund,last.creditDebtId||undefined,last.bankAccountId||undefined);else if(refund>0&&!_rv){showToast&&showToast(CHAT_UNDO_EXPENSE_BALANCE_TOAST,"error");}}else if(last.type==="billPaid"){if(!revertBillPaidFromChat(last))return;}else if(last.type==="bill")setBills(p=>p.filter(x=>x.id!==last.id));else if(last.type==="debt")setDebts(p=>p.filter(x=>x.id!==last.id));else if(last.type==="trade")setTrades(p=>p.filter(x=>x.id!==last.id));else if(last.type==="account")setAccounts(p=>({...p,[last.key]:last.oldVal}));setHistory(p=>p.slice(0,-1));setMsgs(p=>[...p,{role:"a",text:"↩️ Undone: "+last.label}]);return;}
    setPending(parsed);setMsgs(p=>[...p,{role:"a",text:parsed.type==="expense"?"Review paid-from below, then Save.":parsed.type==="income"?"Confirm income field update below.":"Confirm?"}]);}
  function confirm(){if(!pending)return;const id=Date.now();let lbl="";
    if(pending.type==="expense"){const _ea=parseFloat(pending.amount)||0;const _pf=normalizePaidFrom(expConfirm?.paidFrom??pending.paidFrom??defaultExpensePaidFrom);const _cards=cardDebtsList(debts);if(_pf==="credit"){if(!_cards.length){setMsgs(p=>[...p,{role:"a",text:"Add a credit card under More → Debt (type: Credit card), then try again."}]);return;}const _cid=String(expConfirm?.creditDebtId||"");if(!_cid||!_cards.some(c=>String(c.id)===_cid)){setMsgs(p=>[...p,{role:"a",text:"Tap which card below, or set a default under Settings \u2192 Defaults."}]);return;}setExpenses(p=>[...p,{id,name:pending.name,amount:pending.amount,category:pending.category,date:pending.date,notes:"",paidFrom:_pf,creditDebtId:_cid}]);setHistory(p=>[...p,{type:"expense",id,label:pending.name+" "+fmt(pending.amount),amt:_ea,paidFrom:_pf,creditDebtId:_cid}]);if(applySpend&&_ea)applySpend(_pf,_ea,_cid,undefined);lbl="✅ "+pending.name+" ("+fmt(pending.amount)+") on "+(_cards.find(c=>String(c.id)===_cid)?.name||"card")+"!";}else{const _cashErr=validateCashSpendPrerequisites(_pf,expConfirm?.bankAccountId,accounts,settings);if(_cashErr){setMsgs(p=>[...p,{role:"a",text:_cashErr}]);return;}const _bid=resolveBankAccountIdForExpense(_pf,expConfirm?.bankAccountId,accounts,settings);const _ch=cashAccountsByKind(accounts,"checking");const _sv=cashAccountsByKind(accounts,"savings");const row={id,name:pending.name,amount:pending.amount,category:pending.category,date:pending.date,notes:"",paidFrom:_pf};if(_bid)row.bankAccountId=_bid;setExpenses(p=>[...p,row]);setHistory(p=>[...p,{type:"expense",id,label:pending.name+" "+fmt(pending.amount),amt:_ea,paidFrom:_pf,...(_bid?{bankAccountId:_bid}:{})}]);if(applySpend&&_ea)applySpend(_pf,_ea,undefined,_bid||undefined);const _cn=_ch.find(c=>String(c.id)===_bid)?.name;const _sn=_sv.find(c=>String(c.id)===_bid)?.name;lbl="✅ "+pending.name+" ("+fmt(pending.amount)+")"+(_cn?" — "+_cn:_sn?" — "+_sn:"")+"!";}}else if(pending.type==="bill"){setBills(p=>[...p,{id,...pending,paid:false,autoPay:false,paidFrom:normalizePaidFrom(pending.paidFrom||defaultBillPaidFrom)}]);setHistory(p=>[...p,{type:"bill",id,label:pending.name}]);lbl="✅ "+pending.name+" bill added!";}else if(pending.type==="debt"){if(pending.isUpdate){setDebts(p=>p.map(d=>d.id===pending.matchId?{...d,balance:pending.balance}:d));}else{setDebts(p=>[...p,{id,name:pending.name,balance:pending.balance,rate:pending.rate||"",minPayment:""}]);setHistory(p=>[...p,{type:"debt",id,label:pending.name}]);}lbl="✅ "+pending.name+" saved!";}else if(pending.type==="trade"){setTrades(p=>[{id,date:pending.date,symbol:pending.symbol,side:pending.side,contracts:"1",pnl:pending.pnl,entry:"",exit:"",note:""},...p]);setHistory(p=>[...p,{type:"trade",id,label:pending.symbol+" "+pending.side}]);lbl="✅ "+pending.symbol+" "+(parseFloat(pending.pnl)>=0?"+":"")+fmt(pending.pnl);}else if(pending.type==="income"){const k=pending.key;setIncome(p=>({...p,[k]:pending.amount}));lbl="✅ Income · "+String(k).replace(/_/g," ")+": "+fmt(pending.amount)+" (per pay period where applicable — adjust in Accounts & Income).";}else if(pending.type==="account"){const oldVal=accounts[pending.key];setAccounts(p=>({...p,[pending.key]:pending.amount}));setHistory(p=>[...p,{type:"account",key:pending.key,oldVal,label:pending.key}]);lbl="✅ "+pending.key+": "+fmt(pending.amount);}
    setMsgs(p=>[...p,{role:"a",text:lbl||"✅ Saved!"}]);setPending(null);}
  const cr=(l,v)=><div style={{display:"flex",justifyContent:"space-between",padding:"6px 10px",background:C.bg,borderRadius:8,marginBottom:3}}><span style={{fontSize:12,color:C.textLight}}>{l}</span><span style={{fontSize:12,color:C.text,fontWeight:600}}>{v}</span></div>;
  return(<div style={{display:"flex",flexDirection:"column",height:"100%",minHeight:0}}>
    <div style={{background:sts>200?C.greenBg:C.redBg,border:`1px solid ${sts>200?C.greenMid:C.redMid}`,borderRadius:12,padding:"8px 14px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:11,color:sts>200?C.green:C.red,fontWeight:600}}>Safe to spend</span>
        <span style={{fontFamily:MF,fontSize:15,fontWeight:800,color:sts>200?C.green:C.red}}>{fmt(sts)}</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10,fontSize:11,color:C.textLight}}>
        <span title="Checking burn (MTD)">{fmt(burn)}/day chk</span>
        {ccOwed>0&&<span title="Credit card balance owed in app">\ud83d\udcb3{fmt(ccOwed)}</span>}
        {history.length>0&&<span style={{color:C.accent,cursor:"pointer"}} onClick={()=>{setMsgs(p=>[...p,{role:"u",text:"undo"}]);const last=history[history.length-1];if(!last)return;if(last.type==="expense"){setExpenses(p=>p.filter(x=>x.id!==last.id));const refund=last.amt!=null?last.amt:parseFloat(expenses.find(e=>e.id===last.id)?.amount)||0;const rp=normalizePaidFrom(last.paidFrom);const _rvH=canReverseExpenseBalance(rp,last.creditDebtId,last.bankAccountId,accounts,debts,settings);if(applyRefund&&refund&&_rvH)applyRefund(rp,refund,last.creditDebtId||undefined,last.bankAccountId||undefined);else if(refund>0&&!_rvH)showToast&&showToast(CHAT_UNDO_EXPENSE_BALANCE_TOAST,"error");}else if(last.type==="billPaid"){if(!revertBillPaidFromChat(last))return;}else if(last.type==="bill")setBills(p=>p.filter(x=>x.id!==last.id));else if(last.type==="debt")setDebts(p=>p.filter(x=>x.id!==last.id));else if(last.type==="trade")setTrades(p=>p.filter(x=>x.id!==last.id));else if(last.type==="account")setAccounts(p=>({...p,[last.key]:last.oldVal}));setHistory(p=>p.slice(0,-1));setMsgs(p=>[...p,{role:"a",text:"↩️ Undone: "+last.label}]);}}>↩ Undo</span>}
      </div>
    </div>
    <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:8,paddingBottom:pending?88:10,minHeight:0}}>
      {msgs.map((m,i)=><div key={i} style={{display:"flex",justifyContent:m.role==="u"?"flex-end":"flex-start",minWidth:0}}><div style={{maxWidth:"86%",minWidth:0,padding:"11px 14px",borderRadius:m.role==="u"?"18px 18px 4px 18px":"18px 18px 18px 4px",background:m.role==="u"?C.accent:"#fff",color:m.role==="u"?"#fff":C.text,fontSize:14,lineHeight:1.55,border:m.role==="a"?"1px solid "+C.border:"none",whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{m.text}</div></div>)}
      {pending&&<div style={{background:C.surface,border:"1.5px solid "+C.accentMid,borderRadius:16,padding:18}}><div style={{fontSize:11,fontWeight:700,color:C.accent,textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>Confirm</div>{pending.type==="income"&&cr("Income line",String(pending.key||"").replace(/_/g," "))}{pending.name&&cr("Name",pending.name)}{(pending.amount||pending.balance)&&cr("Amount",fmt(pending.amount||pending.balance))}{pending.type==="expense"&&expConfirm&&(<><div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:8,marginTop:4}}>Paid from</div><div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>{[{k:"checking",l:"🏦 Checking"},{k:"credit",l:"💳 Credit"},{k:"savings",l:"💰 Savings"},{k:"none",l:"📋 Track only"}].map(({k,l})=><button key={k} type="button" className="ba" onClick={()=>setExpConfirm(p=>{const next={...(p||{}),paidFrom:k};if(k==="credit")next.creditDebtId=pickDefaultCreditDebtId(settings,debts)||"";next.bankAccountId=pickDefaultBankAccountId(k,accounts,settings)||"";return next;})} style={{padding:"8px 12px",borderRadius:10,border:`1.5px solid ${normalizePaidFrom(expConfirm.paidFrom)===k?C.accent:C.border}`,background:normalizePaidFrom(expConfirm.paidFrom)===k?C.accentBg:C.bg,color:normalizePaidFrom(expConfirm.paidFrom)===k?C.accent:C.textMid,fontWeight:normalizePaidFrom(expConfirm.paidFrom)===k?700:600,fontSize:12,cursor:"pointer"}}>{l}</button>)}</div>{normalizePaidFrom(expConfirm.paidFrom)==="credit"&&cardDebtsList(debts).length>1&&<><div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Which card</div><div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:4}}>{cardDebtsList(debts).map(d=><button key={d.id} type="button" className="ba" onClick={()=>setExpConfirm(p=>({...p,creditDebtId:String(d.id)}))} style={{padding:"8px 12px",borderRadius:10,border:`1.5px solid ${String(expConfirm.creditDebtId)===String(d.id)?C.accent:C.border}`,background:String(expConfirm.creditDebtId)===String(d.id)?C.accentBg:C.bg,color:String(expConfirm.creditDebtId)===String(d.id)?C.accent:C.textMid,fontWeight:String(expConfirm.creditDebtId)===String(d.id)?700:600,fontSize:12,cursor:"pointer",maxWidth:"100%"}}>{d.name} <span style={{opacity:.75}}>({fmt(parseFloat(d.balance||0))})</span></button>)}</div></>}{normalizePaidFrom(expConfirm.paidFrom)==="credit"&&cardDebtsList(debts).length>1&&<div style={{fontSize:11,color:C.textLight,marginBottom:8,lineHeight:1.45}}>Or set a default card under <strong>Settings → Defaults</strong>.</div>}{normalizePaidFrom(expConfirm.paidFrom)==="credit"&&cardDebtsList(debts).length===0&&<div style={{fontSize:12,color:C.red,marginBottom:10,lineHeight:1.45}}>Add each card under <strong>More → Debt</strong> (type: <strong>Credit card</strong>). You can't charge a card until at least one is listed.</div>}{normalizePaidFrom(expConfirm.paidFrom)==="checking"&&chPick.length>1&&<><div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Which checking</div><div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:4}}>{chPick.map(a=><button key={a.id} type="button" className="ba" onClick={()=>setExpConfirm(p=>({...p,bankAccountId:String(a.id)}))} style={{padding:"8px 12px",borderRadius:10,border:`1.5px solid ${String(expConfirm.bankAccountId)===String(a.id)?C.accent:C.border}`,background:String(expConfirm.bankAccountId)===String(a.id)?C.accentBg:C.bg,color:String(expConfirm.bankAccountId)===String(a.id)?C.accent:C.textMid,fontWeight:String(expConfirm.bankAccountId)===String(a.id)?700:600,fontSize:12,cursor:"pointer",maxWidth:"100%"}}>{a.name||"Checking"} <span style={{opacity:.75}}>({fmt(parseFloat(a.balance||0))})</span></button>)}</div></>}{normalizePaidFrom(expConfirm.paidFrom)==="savings"&&svPick.length>1&&<><div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Which savings</div><div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:4}}>{svPick.map(a=><button key={a.id} type="button" className="ba" onClick={()=>setExpConfirm(p=>({...p,bankAccountId:String(a.id)}))} style={{padding:"8px 12px",borderRadius:10,border:`1.5px solid ${String(expConfirm.bankAccountId)===String(a.id)?C.accent:C.border}`,background:String(expConfirm.bankAccountId)===String(a.id)?C.accentBg:C.bg,color:String(expConfirm.bankAccountId)===String(a.id)?C.accent:C.textMid,fontWeight:String(expConfirm.bankAccountId)===String(a.id)?700:600,fontSize:12,cursor:"pointer",maxWidth:"100%"}}>{a.name||"Savings"} <span style={{opacity:.75}}>({fmt(parseFloat(a.balance||0))})</span></button>)}</div></>}</>)}{pending.type==="expense"&&!expConfirm&&pending.paidFrom&&cr("Paid from",PAID_FROM_FS_LABELS[normalizePaidFrom(pending.paidFrom)])}{pending.type==="bill"&&pending.paidFrom&&cr("Pay from",PAID_FROM_FS_LABELS[normalizePaidFrom(pending.paidFrom)])}{pending.category&&cr("Category",pending.category)}{pending.symbol&&cr("Trade",pending.symbol+" "+(parseFloat(pending.pnl)>=0?"+":"")+fmt(pending.pnl))}<div style={{display:"flex",gap:8,marginTop:12}}><button className="ba" onClick={confirm} style={{flex:1,background:C.green,border:"none",borderRadius:10,padding:"11px 0",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>✅ Save</button><button className="ba" onClick={()=>setPending(null)} style={{flex:1,background:C.bg,border:"1px solid "+C.border,borderRadius:10,padding:"11px 0",color:C.textMid,fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancel</button></div></div>}
      <div ref={botRef}/>
    </div>
    <div style={{display:"flex",gap:8,paddingTop:10,borderTop:"1px solid "+C.border,flexShrink:0,minWidth:0,alignItems:"center"}}>
      <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="e.g. coffee 6 · paid electric · ytd · budget · salary 5200 · help" style={{flex:1,minWidth:0,maxWidth:"100%",background:C.bg,border:"1.5px solid "+C.border,borderRadius:12,padding:"11px 14px",color:C.text,fontSize:14,outline:"none",boxSizing:"border-box"}}/>
      <button className="ba" onClick={send} disabled={!input.trim()} style={{background:input.trim()?C.accent:C.border,border:"none",borderRadius:12,padding:"0 16px",cursor:input.trim()?"pointer":"default",display:"flex",alignItems:"center",color:input.trim()?"#fff":C.textLight}}><Send size={17}/></button>
    </div>
  </div>);
}
