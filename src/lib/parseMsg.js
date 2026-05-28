/**
 * Natural-language parser for the AI Log tab.
 *
 * `parseMsg(text, categories, debts, bills, opts)` returns one of:
 *   - { type:"expense",  name, amount, category, date, paidFrom, creditDebtId? }
 *   - { type:"bill",     name, amount, dueDate, recurring, autoPay, paidFrom, creditDebtId? }
 *   - { type:"debt",     name, balance, rate, isUpdate, matchId? }
 *   - { type:"income",   key, amount }
 *   - { type:"account",  key, amount, text? }
 *   - { type:"trade",    symbol, side, pnl, date, contracts }
 *   - { type:"billPaid", billId, name }
 *   - { type:"undo" }
 *   - null
 *
 * Pure function — no React, no state. All keyword tables live here so chat + manual
 * entry can share them (and so we can test parsing without rendering the UI).
 */
import { cardDebtsList } from "./creditCardTotals.js";
import { normalizePaidFrom } from "./accountsLogic.js";
import { todayStr } from "./moneyFormat.js";

/** Loose bill-name match for chat commands ("paid electric", "mark rent as paid"). */
export function chatMatchBill(bills, phrase) {
  if (!bills || !bills.length || !phrase) return null;
  const q = String(phrase).toLowerCase().replace(/^(the|my|a)\s+/i, "").trim();
  if (!q) return null;
  const exact = bills.find((b) => (b.name || "").toLowerCase() === q);
  if (exact) return exact;
  return (
    bills.find((b) => {
      const n = (b.name || "").toLowerCase();
      return n && (n.includes(q) || q.includes(n));
    }) || null
  );
}

/** Expense date from natural language + optional ISO in message. Falls back to today. */
export function chatPickExpenseDate(text) {
  const t = text.toLowerCase();
  const dt = new Date();
  const _localDs = (d2) =>
    d2.getFullYear() + "-" + String(d2.getMonth() + 1).padStart(2, "0") + "-" + String(d2.getDate()).padStart(2, "0");
  if (t.includes("tomorrow")) { const d = new Date(dt); d.setDate(d.getDate() + 1); return _localDs(d); }
  if (t.includes("yesterday")) { const d = new Date(dt); d.setDate(d.getDate() - 1); return _localDs(d); }
  const ago = text.match(/\b(\d{1,2})\s*days?\s*ago\b/i);
  if (ago) { const d = new Date(dt); d.setDate(d.getDate() - parseInt(ago[1], 10)); return _localDs(d); }
  const iso = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) {
    const y = iso[1], mo = iso[2].padStart(2, "0"), da = iso[3].padStart(2, "0");
    return y + "-" + mo + "-" + da;
  }
  const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const lastDayM = t.match(/last\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
  if (lastDayM) {
    const target = DAYS.indexOf(lastDayM[1].toLowerCase());
    const d = new Date(dt);
    const curr = d.getDay();
    const diff = curr >= target ? curr - target : curr - target + 7;
    d.setDate(d.getDate() - Math.max(diff, 1));
    return _localDs(d);
  }
  return todayStr();
}

/** Route stats questions before action parsing (includes phrases that are not real questions). */
export function chatIsStatsQuery(t) {
  const s = t.trim();
  const s0 = s.replace(/[?.!,;:]+$/g, "").trim();
  if (s0 === "undo" || s0.startsWith("undo last") || s0.includes("undo that")) return false;
  if (s.includes("?")) return true;
  if (/^(how|what|when|where|why|can|could|should|would|is|are|am|do|does|did|will|tell|summarize|calculate|compare)\b/i.test(s)) return true;
  if (/^(show|list)\s+(me\s+)?(my\s+)?(balance|balances|bills|debts|goals|income|spending|budget|net|worth|payday|subscriptions|transactions|trades|health|categories|envelope|envelopes|savings|checking|accounts?)/i.test(s)) return true;
  if (/^my\s+(balance|balances|bills|debts|goals|income|spending|budget|net|worth|payday|subscriptions|transactions|trades|savings|checking|accounts?)/i.test(s)) return true;
  if (/\b(split spending|safe to spend|spending by paid|paid from breakdown|year to date|ytd spending)\b/i.test(s)) return true;
  return false;
}

/**
 * Merchant → category keyword table. Used by the chat parser and could also be reused
 * by the expense modal so the two stay in lockstep. Order matters when multiple match —
 * the highest keyword hit count wins.
 */
export const CATEGORY_KEYWORDS = {
  Groceries: ["grocery","groceries","publix","kroger","whole foods","trader joe","aldi","costco","walmart","food lion","safeway","wegmans","sprouts","market"],
  "Fast Food": ["mcdonald","burger king","wendy","chick-fil","taco bell","subway","chipotle","popeyes","kfc","domino","pizza hut","panda","five guys","sonic","whataburger","jack in","in-n-out","cookout"],
  Restaurants: ["restaurant","dinner","lunch","sushi","thai","italian","steakhouse","dine","bistro","grill","eatery","doordash","ubereats","grubhub","postmates","dine in","ate out"],
  Coffee: ["starbucks","dunkin","coffee","latte","espresso","cappuccino","cold brew","dutch bros","caribou","peets","coffee shop","cafe"],
  Gas: ["gas","shell","bp","chevron","exxon","mobil","speedway","pilot","loves","quiktrip","fuel","gasoline","wawa","sheetz"],
  Rideshare: ["uber","lyft","taxi","cab","via","ride"],
  "Rent / Mortgage": ["rent","mortgage","landlord","lease","apartment","housing"],
  Utilities: ["electric","electricity","water","gas bill","internet","cable","wifi","xfinity","comcast","duke energy","pg&e","utility","sewage","trash"],
  Phone: ["phone","verizon","att","t-mobile","sprint","cricket","straight talk","metro","boost","wireless"],
  Subscriptions: ["netflix","hulu","spotify","apple music","amazon prime","youtube premium","disney","hbo","paramount","peacock","crunchyroll","audible","icloud","dropbox","adobe","subscription","membership","annual"],
  "Health / Medical": ["doctor","hospital","pharmacy","cvs","walgreens","rite aid","medicine","prescription","dental","dentist","therapy","therapist","copay","urgent care","clinic","optometrist","chiropractor"],
  "Gym / Fitness": ["gym","planet fitness","la fitness","anytime fitness","equinox","ymca","fitness","crossfit","orangetheory","workout","yoga","pilates","peloton"],
  "Grooming / Haircuts": ["haircut","barber","salon","great clips","supercuts","hair","nails","manicure","pedicure","wax","massage","spa","beauty","ulta","sephora"],
  Clothing: ["clothes","clothing","shoes","nike","adidas","h&m","zara","gap","old navy","forever21","shein","nordstrom","macy","fashion nova","foot locker"],
  Entertainment: ["movie","netflix","theater","amc","regal","game","steam","playstation","xbox","nintendo","concert","ticket","ticketmaster","event","bowling","arcade","club","bar","nightlife"],
  Travel: ["hotel","airbnb","vrbo","flight","airline","southwest","delta","united","american airlines","frontier","spirit","booking","expedia","hotel","motel","resort","vacation","travel"],
  Pets: ["pet","petco","petsmart","vet","veterinary","dog","cat","animal","pet food","grooming","pet supply"],
  Shopping: ["amazon","target","walmart","best buy","home depot","lowes","ikea","tj maxx","marshalls","ross","kohls","jcpenney","dollar tree","dollar general","shopping"],
  "Dining Out": ["dinner out","brunch","happy hour","date night","anniversary","celebration dinner"],
  Transport: ["parking","toll","car wash","oil change","tire","mechanic","auto","midas","jiffy lube","advance auto","napa"],
};

const ACCOUNT_KEYWORDS = {
  checking: ["checking", "check", "debit"],
  savings: ["savings", "saving"],
  cushion: ["cushion", "buffer", "emergency fund", "e-fund"],
  investments: ["investments", "investment account", "mutual fund"],
  k401: ["401", "401k", "four oh one"],
  roth_ira: ["roth", "roth ira"],
  brokerage: ["brokerage", "taxable"],
  crypto: ["crypto", "bitcoin", "btc", "ethereum"],
  hsa: ["hsa", "health savings"],
  property: ["property", "home value", "house value"],
  vehicles: ["vehicles", "car value", "auto value"],
};

const TRADE_KEYWORDS = ["traded", "long ", "short ", "es ", "nq ", "cl ", "gc ", "futures", "position"];
const DEBT_KEYWORDS = ["loan", "debt", "credit card", "owe", "balance update", "pay off"];
const BILL_KEYWORDS = ["bill","rent","mortgage","electric","water","internet","phone","insurance","netflix","spotify","gym","hulu","due","subscription","car payment"];

export function parseMsg(text, categories, debts, bills, opts = {}) {
  const defExp = normalizePaidFrom(opts.defaultExpensePaidFrom || "checking");
  const defBill = normalizePaidFrom(opts.defaultBillPaidFrom || "checking");
  const cards = cardDebtsList(debts);
  const t = text.toLowerCase().trim();

  // Mark bill paid (before amount-based parsing)
  if (bills && bills.length) {
    let hit = null;
    const tryPhrase = (ph) => {
      const b = chatMatchBill(bills, ph);
      if (b && !b.paid) hit = b;
    };
    let m = text.match(/^\s*(?:mark\s+)?(.+?)\s+as\s+paid\s*\.?\s*$/i);
    if (m) tryPhrase(m[1]);
    if (!hit) {
      m = text.match(/^\s*paid\s+(?:my\s+|the\s+)?(.+?)\s*\.?\s*$/i);
      if (m && !/^\d+$/.test(m[1].trim())) tryPhrase(m[1]);
    }
    if (!hit) {
      m = text.match(/^\s*(.+?)\s+paid\s*\.?\s*$/i);
      if (m && !/^\d/.test(m[1].trim()) && m[1].trim().length > 1) tryPhrase(m[1]);
    }
    if (hit) return { type: "billPaid", billId: hit.id, name: hit.name };
  }

  // Pre-process: split bill / tip
  const splitM = t.match(/split\s*(\d+)/i);
  const splitBy = splitM ? parseInt(splitM[1]) : 1;
  const tipM = t.match(/(?:plus|\+|tip)\s*(\d+)%/i);
  const tipPct = tipM ? parseFloat(tipM[1]) / 100 : 0;
  const am = text.match(/\$?([\d,]+(?:\.\d{1,2})?)/);
  const rawAmount = am ? parseFloat(am[1].replace(/,/g, "")) : null;
  const amount = rawAmount != null ? String(((rawAmount * (1 + tipPct)) / splitBy).toFixed(2)) : null;
  const dt = new Date();
  const date = chatPickExpenseDate(text);

  // Transfer detection (moved/transferred X to savings/checking)
  if ((t.includes("moved") || t.includes("transferred") || t.includes("transfer")) && amount) {
    if (t.includes("saving")) return { type: "account", key: "savings", amount, text: "Moved to savings" };
    if (t.includes("checking")) return { type: "account", key: "checking", amount, text: "Moved to checking" };
  }

  const dueM = t.match(/due(?:\s+the)?\s+(\d{1,2})(?:st|nd|rd|th)?/) || t.match(/on(?:\s+the)?\s+(\d{1,2})(?:st|nd|rd|th)/);
  let dueDate = null;
  if (dueM) {
    const d = new Date(dt.getFullYear(), dt.getMonth(), parseInt(dueM[1]));
    if (d < dt) d.setMonth(d.getMonth() + 1);
    dueDate = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  const tUndo = t.replace(/[?.!,;:]+$/g, "").trim();
  if (tUndo === "undo" || tUndo.startsWith("undo last") || tUndo.includes("undo that")) return { type: "undo" };

  for (const [key, kws] of Object.entries(ACCOUNT_KEYWORDS)) {
    if (kws.some((k) => t.includes(k)) && amount && !/\b(bill|expense|spent|loan|debt|due)\b/.test(t))
      return { type: "account", key, amount };
  }

  if (amount) {
    if (/\b(freelance|contracting|1099|side hustle|gig work)\b/.test(t)) return { type: "income", key: "freelance", amount };
    if (/\bdividend/.test(t)) return { type: "income", key: "dividends", amount };
    if (/\brental\b/.test(t)) return { type: "income", key: "rental", amount };
    if (/\btrading income|options income\b/.test(t) || (t.includes("trading") && t.includes("income"))) return { type: "income", key: "trading", amount };
    if (/\bother income|bonus\b/.test(t) || (t.includes("other") && /\bincome|month\b/.test(t))) return { type: "income", key: "other", amount };
    if (
      (t.includes("primary income") ||
        t.includes("salary set") ||
        t.includes("income set") ||
        /\bpaycheck\b/.test(t) ||
        /\bsalary\b/.test(t) ||
        /\bprimary\b/.test(t) ||
        /\btake[\s-]?home\b/.test(t) ||
        /\bper pay\b/.test(t)) &&
      !/\b(other|freelance|rental|dividend|trading income)\b/.test(t)
    )
      return { type: "income", key: "primary", amount };
  }

  if (TRADE_KEYWORDS.some((k) => t.includes(k)) && amount) {
    const sym = (text.match(/\b(ES|NQ|CL|GC|SI|ZB|YM|MES|MNQ|RTY)\b/i) || [])[1]?.toUpperCase() || "FUTURE";
    const side = t.includes("short") ? "Short" : "Long";
    const pnl = t.includes("-") || t.includes("loss") || t.includes("lost") ? "-" + amount : amount;
    return { type: "trade", symbol: sym, side, pnl, date, contracts: "1" };
  }

  if (DEBT_KEYWORDS.some((k) => t.includes(k)) && amount) {
    const match = debts.find((d) => d.name.toLowerCase().split(" ").some((w) => t.includes(w) && w.length > 3));
    const name =
      match
        ? match.name
        : text
            .replace(/\$?[\d,]+(?:\.\d{1,2})?/g, "")
            .replace(/loan|debt|owe|balance|update|credit card/gi, "")
            .trim()
            .split(" ")
            .filter(Boolean)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ") || "Debt";
    const rateM = t.match(/(\d+(?:\.\d+)?)\s*%/);
    return { type: "debt", name, balance: amount, rate: rateM ? rateM[1] : "", isUpdate: !!match, matchId: match?.id };
  }

  if ((BILL_KEYWORDS.some((k) => t.includes(k)) || dueDate) && amount) {
    let name = text.replace(/\$?[\d,]+(?:\.\d{1,2})?/g, "").replace(/bill|due(?:\s+the)?\s+\d{1,2}(?:st|nd|rd|th)?/gi, "").trim();
    name = name.split(" ").filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || "Bill";
    let billPf = defBill;
    if (/\b(cc|credit card|on card|amex|visa|mastercard|discover)\b/i.test(t)) billPf = "credit";
    let recurring = "Monthly";
    if (/\bweekly\b/.test(t) && !/\bbi-?weekly\b/.test(t)) recurring = "Weekly";
    else if (/\bbi-?weekly\b|every other week\b/.test(t)) recurring = "Bi-weekly";
    else if (/\bannual|yearly\b/.test(t)) recurring = "Annual";
    else if (/\bquarterly\b/.test(t)) recurring = "Quarterly";
    else if (/\bone[\s-]?time|single\b/.test(t)) recurring = "One-time";
    let billCid = "";
    if (billPf === "credit" && cards.length) {
      const hit =
        cards.find((c) => {
          const n = (c.name || "").toLowerCase();
          return n && t.includes(n);
        }) ||
        cards.find((c) => {
          const parts = (c.name || "").toLowerCase().split(/\s+/).filter((w) => w.length > 2);
          return parts.some((w) => t.includes(w));
        });
      if (hit) billCid = String(hit.id);
      else if (cards.length === 1) billCid = String(cards[0].id);
    }
    return { type: "bill", name, amount, dueDate: dueDate || "", recurring, autoPay: false, paidFrom: billPf, ...(billCid ? { creditDebtId: billCid } : {}) };
  }

  if (amount) {
    let category = "Misc";
    let best = 0;
    for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
      const s = kws.filter((k) => t.includes(k)).length;
      if (s > best) { best = s; category = cat; }
    }
    if (best === 0) {
      for (const c of categories) {
        if (t.includes(c.name.toLowerCase())) { category = c.name; break; }
      }
    }
    let name = text
      .replace(/\$?[\d,]+(?:\.\d{1,2})?/g, "")
      .replace(/^\s*(?:add\s+)?(?:an?\s+)?(?:expense\s*:?\s*|log\s+|logged\s+|spent\s+|bought\s+|paid\s+)/gi, "")
      .replace(/\b(for|on|the|a|my|at|to|today|yesterday|tomorrow)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    name = name.split(" ").filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || "Expense";
    let expPf = defExp;
    if (/\b(cc|credit card|on card|amex|visa|mastercard|discover)\b/i.test(t)) expPf = "credit";
    let creditDebtId = "";
    if (expPf === "credit" && cards.length) {
      const hit =
        cards.find((c) => {
          const n = (c.name || "").toLowerCase();
          return n && t.includes(n);
        }) ||
        cards.find((c) => {
          const parts = (c.name || "").toLowerCase().split(/\s+/).filter((w) => w.length > 2);
          return parts.some((w) => t.includes(w));
        });
      if (hit) creditDebtId = String(hit.id);
    }
    return { type: "expense", name, amount, category, date, paidFrom: expPf, creditDebtId: creditDebtId || undefined };
  }

  return null;
}
