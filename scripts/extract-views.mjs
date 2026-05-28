// One-shot extractor for Round 4: pulls every remaining view function out of
// src/App.jsx into its own file under src/views/ (or src/components/ for a
// couple of helpers), preserving its body verbatim and prepending only the
// imports the file actually needs.
//
// Strategy: scan App.jsx for `^function Name(...){`, walk braces to find the
// matching closing `}`, slice that range, write `<header>\nexport default <fn>\n`,
// then rewrite App.jsx with all extracted ranges removed (and one import line
// added at the top per extracted view).

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const APP_PATH = path.join(ROOT, 'src', 'App.jsx');

// Each entry tells the extractor where to put the function and which `lib/`
// imports its body references. Header strings are inserted verbatim.
const TARGETS = [
  {
    name: 'CashAccountsBlock',
    out: 'src/components/CashAccountsBlock.jsx',
    isDefault: false,
    header: `import React from "react";
import { C, MF } from "../theme.js";
`,
  },
  {
    name: 'SearchView',
    out: 'src/views/SearchView.jsx',
    isDefault: true,
    header: `import React, { useState, useMemo } from "react";
import { Search, X, ChevronRight } from "lucide-react";
import { C, MF } from "../theme.js";
import { fmt, fmtDate } from "../lib/moneyFormat.js";
`,
  },
  {
    name: 'CategoryDrillView',
    out: 'src/views/CategoryDrillView.jsx',
    isDefault: true,
    header: `import React, { useState } from "react";
import { C, MF, FULL_MOS } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";
`,
  },
  {
    name: 'InsightsView',
    out: 'src/views/InsightsView.jsx',
    isDefault: true,
    header: `import React, { useState } from "react";
import { C, MF, FULL_MOS, PIE_COLORS } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";
import { BarProg } from "../components/ui.jsx";
import { RechartsReady } from "../components/RechartsBridge.jsx";
import CategoryDrillView from "./CategoryDrillView.jsx";
`,
  },
  {
    name: 'PaycheckView',
    out: 'src/views/PaycheckView.jsx',
    isDefault: true,
    header: `import React, { useState } from "react";
import { DollarSign, Plus } from "lucide-react";
import { C, MF } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";
import { BarProg } from "../components/ui.jsx";
import { totalCheckingBalance } from "../lib/cashAccounts.js";
import { sumMtdCheckingSpend } from "../lib/accountsLogic.js";
import { dueIn } from "../lib/dateHelpers.js";
`,
  },
  {
    name: 'NetWorthTrendView',
    out: 'src/views/NetWorthTrendView.jsx',
    isDefault: true,
    header: `import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { C, MF, FULL_MOS, debtDisplayColor } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";
import { BarProg } from "../components/ui.jsx";
import { RechartsReady } from "../components/RechartsBridge.jsx";
import { totalCheckingBalance, totalSavingsBalance } from "../lib/cashAccounts.js";
import { legacyCreditCardOwed } from "../lib/creditCardTotals.js";
import { sumDebtsPrincipalAndAccrued, debtOwedForBreakdown, debtOriginalBaseline } from "../lib/debtLogic.js";
`,
  },
  {
    name: 'ExpenseRow',
    out: 'src/components/ExpenseRow.jsx',
    isDefault: false,
    header: `import React from "react";
import { Trash2 } from "lucide-react";
import { C, MF } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";
`,
  },
  {
    name: 'SpendingView',
    out: 'src/views/SpendingView.jsx',
    isDefault: true,
    header: `import React, { useState, useMemo } from "react";
import { Plus, Search, X, Filter, Tag, Wallet, Trash2 } from "lucide-react";
import { C, MF, FULL_MOS } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";
import { BarProg, SH, Empty } from "../components/ui.jsx";
import { ExpenseRow } from "../components/ExpenseRow.jsx";
import { normalizePaidFrom, sumMtdByPaidFrom, canReverseExpenseBalance, PAID_FROM_OPTIONS, PAID_FROM_FS_LABELS } from "../lib/accountsLogic.js";
import { cardDebtsList } from "../lib/creditCardTotals.js";
import { cashAccountsByKind } from "../lib/cashAccounts.js";
`,
  },
  {
    name: 'DebtView',
    out: 'src/views/DebtView.jsx',
    isDefault: true,
    header: `import React, { useState, useMemo, useEffect } from "react";
import { Plus, CreditCard, TrendingDown, ChevronRight, ChevronLeft, Wallet, X } from "lucide-react";
import { C, MF, debtDisplayColor, PIE_COLORS } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";
import { BarProg } from "../components/ui.jsx";
import { RechartsReady } from "../components/RechartsBridge.jsx";
import { isLoanDebt, splitLoanPayment, debtOwedForBreakdown, sumDebtsPrincipalAndAccrued, approxMonthlyInterestOnDebts, debtOriginalBaseline, loanDebtsList } from "../lib/debtLogic.js";
import { simRowsFromDebts } from "../lib/debtPayoffSim.js";
import { cardDebtsList } from "../lib/creditCardTotals.js";
import { todayStr } from "../lib/moneyFormat.js";
import { round2 } from "../lib/loanSplit.js";
`,
  },
  {
    name: 'GoalRing',
    out: 'src/components/GoalRing.jsx',
    isDefault: false,
    header: `import React from "react";
import { C, MF } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";
`,
  },
  {
    name: 'SavingsGoalsView',
    out: 'src/views/SavingsGoalsView.jsx',
    isDefault: true,
    header: `import React, { useState, useMemo } from "react";
import { Plus, Target, X, ChevronRight, Trash2, Calendar } from "lucide-react";
import { C, MF, PIE_COLORS } from "../theme.js";
import { fmt, todayStr } from "../lib/moneyFormat.js";
import { Modal, FI, FS, BarProg } from "../components/ui.jsx";
import { GoalRing } from "../components/GoalRing.jsx";
import { RechartsReady } from "../components/RechartsBridge.jsx";
import { EmojiPicker } from "../components/EmojiPicker.jsx";
import { normalizePaidFrom, PAID_FROM_OPTIONS, PAID_FROM_FS_LABELS } from "../lib/accountsLogic.js";
import { cashAccountsByKind } from "../lib/cashAccounts.js";
`,
  },
  {
    name: 'TradingView',
    out: 'src/views/TradingView.jsx',
    isDefault: true,
    header: `import React, { useState } from "react";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import { C, MF } from "../theme.js";
import { fmt, todayStr } from "../lib/moneyFormat.js";
import { Modal, FI, FS } from "../components/ui.jsx";
`,
  },
  {
    name: 'CalendarView',
    out: 'src/views/CalendarView.jsx',
    isDefault: true,
    header: `import React, { useState, useMemo } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { C, MF, FULL_MOS } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";
`,
  },
  {
    name: 'ShiftView',
    out: 'src/views/ShiftView.jsx',
    isDefault: true,
    header: `import React, { useState } from "react";
import { Plus } from "lucide-react";
import { C, MF } from "../theme.js";
import { fmt, todayStr } from "../lib/moneyFormat.js";
import { Modal, FI } from "../components/ui.jsx";
import { getProfSub } from "../lib/professions.js";
`,
  },
  {
    name: 'TrendView',
    out: 'src/views/TrendView.jsx',
    isDefault: true,
    header: `import React, { useMemo } from "react";
import { C, MF, FULL_MOS } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";
import { RechartsReady } from "../components/RechartsBridge.jsx";
import { totalCheckingBalance, totalSavingsBalance } from "../lib/cashAccounts.js";
`,
  },
  {
    name: 'StatementView',
    out: 'src/views/StatementView.jsx',
    isDefault: true,
    header: `import React, { useState, useMemo } from "react";
import { Plus, Download, Printer } from "lucide-react";
import { C, MF, FULL_MOS } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";
import { totalCheckingBalance, totalSavingsBalance } from "../lib/cashAccounts.js";
`,
  },
  {
    name: 'FinancialPhysicalView',
    out: 'src/views/FinancialPhysicalView.jsx',
    isDefault: true,
    header: `import React from "react";
import { C, MF } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";
import { totalCheckingBalance, totalSavingsBalance } from "../lib/cashAccounts.js";
import { sumDebtsPrincipalAndAccrued } from "../lib/debtLogic.js";
`,
  },
  {
    name: 'SettingsView',
    out: 'src/views/SettingsView.jsx',
    isDefault: true,
    header: `import React, { useState, useRef, useEffect } from "react";
import { Settings as SettingsIcon, Bell, Lock, User, LogOut, ChevronRight, Download, Upload, Trash2, RotateCcw, X, Plus } from "lucide-react";
import { C, MF } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";
import { FS } from "../components/ui.jsx";
import { CashAccountsBlock } from "../components/CashAccountsBlock.jsx";
import { PROFESSIONS, getProfession } from "../lib/professions.js";
import { PAID_FROM_OPTIONS, PAID_FROM_FS_LABELS, normalizePaidFrom } from "../lib/accountsLogic.js";
import { cardDebtsList } from "../lib/creditCardTotals.js";
`,
  },
  {
    name: 'HealthScoreView',
    out: 'src/views/HealthScoreView.jsx',
    isDefault: true,
    header: `import React from "react";
import { C, MF } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";
import { BarProg } from "../components/ui.jsx";
import { totalCheckingBalance, totalSavingsBalance } from "../lib/cashAccounts.js";
import { sumDebtsPrincipalAndAccrued } from "../lib/debtLogic.js";
`,
  },
  {
    name: 'IncomeSpendingView',
    out: 'src/views/IncomeSpendingView.jsx',
    isDefault: true,
    header: `import React, { useMemo } from "react";
import { C, MF, FULL_MOS } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";
import { RechartsReady } from "../components/RechartsBridge.jsx";
`,
  },
  {
    name: 'DashSettingsView',
    out: 'src/views/DashSettingsView.jsx',
    isDefault: true,
    header: `import React from "react";
import { ToggleLeft, ToggleRight } from "lucide-react";
import { C, MF } from "../theme.js";
`,
  },
  {
    name: 'TaxView',
    out: 'src/views/TaxView.jsx',
    isDefault: true,
    header: `import React, { useMemo } from "react";
import { C, MF } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";
`,
  },
  {
    name: 'SubsView',
    out: 'src/views/SubsView.jsx',
    isDefault: true,
    header: `import React, { useMemo } from "react";
import { X } from "lucide-react";
import { C, MF } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";
`,
  },
  {
    name: 'RecurringView',
    out: 'src/views/RecurringView.jsx',
    isDefault: true,
    header: `import React, { useState, useEffect } from "react";
import { Plus, Calendar, Trash2 } from "lucide-react";
import { C, MF } from "../theme.js";
import { fmt, todayStr } from "../lib/moneyFormat.js";
import { Modal, FI, FS, ConfirmDialog, SwipeRow } from "../components/ui.jsx";
import { EmojiPicker } from "../components/EmojiPicker.jsx";
import { normalizePaidFrom, pickDefaultBankAccountId, pickDefaultCreditDebtId, PAID_FROM_OPTIONS, PAID_FROM_FS_LABELS } from "../lib/accountsLogic.js";
import { cardDebtsList } from "../lib/creditCardTotals.js";
import { cashAccountsByKind } from "../lib/cashAccounts.js";
`,
  },
  {
    name: 'CategoriesView',
    out: 'src/views/CategoriesView.jsx',
    isDefault: true,
    header: `import React, { useState } from "react";
import { Plus, Search, X, Trash2, Target } from "lucide-react";
import { C, MF } from "../theme.js";
import { Modal, FI } from "../components/ui.jsx";
import { EmojiPicker } from "../components/EmojiPicker.jsx";
`,
  },
  {
    name: 'HouseholdView',
    out: 'src/views/HouseholdView.jsx',
    isDefault: true,
    header: `import React, { useState, useMemo } from "react";
import { Plus, X, Trash2, Users, Wallet } from "lucide-react";
import { C, MF } from "../theme.js";
import { fmt, todayStr } from "../lib/moneyFormat.js";
import { Modal, FI, FS, BarProg } from "../components/ui.jsx";
`,
  },
];

// Build a map of every top-level construct that starts at column 0 — these are
// safe boundaries because none of our function bodies have lines that begin in
// column 0. The map tells us where each named function ends (the next
// boundary). Avoids the JS tokenizer entirely.
function buildBoundaries(src) {
  const lines = src.split('\n');
  const boundaries = []; // {name, startLine, startIdx}
  let idx = 0;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    // Match any top-level declaration that starts in column 0.
    const m = /^(function\s+(\w+)|class\s+(\w+)|const\s+(\w+)|let\s+(\w+)|var\s+(\w+)|export\s+|import\s+)/.exec(ln);
    if (m) {
      const name = m[2] || m[3] || m[4] || m[5] || m[6] || null;
      boundaries.push({ name, startLine: i, startIdx: idx, raw: ln });
    }
    idx += ln.length + 1; // +1 for newline
  }
  // Sentinel for end-of-file.
  boundaries.push({ name: null, startLine: lines.length, startIdx: src.length, raw: '' });
  return boundaries;
}

function extractFunctionByBoundaries(src, name, boundaries) {
  const idx = boundaries.findIndex((b) => b.name === name && /^function\s/.test(b.raw));
  if (idx < 0) throw new Error(`Function ${name} not found`);
  const cur = boundaries[idx];
  const next = boundaries[idx + 1];
  const start = cur.startIdx;
  let end = next.startIdx;
  // Trim trailing blank line before the next boundary so files look tidy.
  while (end > start && (src[end - 1] === '\n' || src[end - 1] === '\r')) end--;
  return { start, end: end, body: src.slice(start, end) };
}

function extractFunction(src, name) {
  const re = new RegExp(`^function\\s+${name}\\s*\\(`, 'm');
  const match = re.exec(src);
  if (!match) throw new Error(`Function ${name} not found`);
  const start = match.index;
  // Walk parens to find the end of the parameter list — destructured params
  // like `({a={}, b=[]})` contain their own braces we must ignore.
  let p = match.index + match[0].length;
  let pDepth = 1;
  for (; p < src.length && pDepth > 0; p++) {
    const c = src[p];
    if (c === '(') pDepth++;
    else if (c === ')') pDepth--;
  }
  const sigEnd = src.indexOf('{', p);
  if (sigEnd === -1) throw new Error(`Open brace not found for ${name}`);

  // Mode stack: 'code' (default), or 'tpl' with a saved depth marker so that
  // matching `}` inside `${...}` correctly pops us back to the template.
  const stack = [{ mode: 'code' }];
  let depth = 0;
  let i = sigEnd;
  // Track the previous non-whitespace code character — needed to disambiguate
  // `/` (divide) from `/` (regex). Crude but covers our codebase.
  let lastSig = '';

  const isRegexStart = () => {
    if (!lastSig) return true;
    return /[=({,;:!?&|+\-*%~^<>[\]\n]/.test(lastSig) || /\b(return|typeof|in|of|void|delete|throw|new|case|do|else)\b/.test(lastSig);
  };

  for (; i < src.length; i++) {
    const c = src[i];
    const top = stack[stack.length - 1];

    if (top.mode === 'lineCmt') {
      if (c === '\n') stack.pop();
      continue;
    }
    if (top.mode === 'blockCmt') {
      if (c === '*' && src[i + 1] === '/') { stack.pop(); i++; }
      continue;
    }
    if (top.mode === 'str') {
      if (c === '\\') { i++; continue; }
      if (c === top.quote) stack.pop();
      continue;
    }
    if (top.mode === 'regex') {
      if (c === '\\') { i++; continue; }
      if (top.inClass) { if (c === ']') top.inClass = false; continue; }
      if (c === '[') { top.inClass = true; continue; }
      if (c === '/') { stack.pop(); /* skip flags */ while (/[a-z]/.test(src[i + 1] || '')) i++; lastSig = '/'; }
      continue;
    }
    if (top.mode === 'tpl') {
      if (c === '\\') { i++; continue; }
      if (c === '`') { stack.pop(); lastSig = '`'; continue; }
      if (c === '$' && src[i + 1] === '{') {
        // Enter interpolation: push code mode that pops when its `}` is found.
        stack.push({ mode: 'code', tplReturn: true, baseDepth: depth });
        depth++;
        i++; // consume `{`
        lastSig = '';
        continue;
      }
      continue;
    }

    // code mode
    if (c === '/' && src[i + 1] === '/') { stack.push({ mode: 'lineCmt' }); i++; continue; }
    if (c === '/' && src[i + 1] === '*') { stack.push({ mode: 'blockCmt' }); i++; continue; }
    if (c === '/' && isRegexStart()) { stack.push({ mode: 'regex', inClass: false }); continue; }
    if (c === '"' || c === "'") { stack.push({ mode: 'str', quote: c }); continue; }
    if (c === '`') { stack.push({ mode: 'tpl' }); continue; }
    if (c === '{') { depth++; if (!/\s/.test(c)) lastSig = c; continue; }
    if (c === '}') {
      depth--;
      // If this `}` closes an interpolation, pop back to the template.
      if (top.tplReturn && depth === top.baseDepth) { stack.pop(); lastSig = '}'; continue; }
      if (depth === 0 && stack.length === 1) { i++; lastSig = c; break; }
      lastSig = c;
      continue;
    }
    if (!/\s/.test(c)) lastSig = c;
  }
  const end = i;
  const body = src.slice(start, end);
  return { start, end, body };
}

function main() {
  let src = fs.readFileSync(APP_PATH, 'utf8');
  const boundaries = buildBoundaries(src);
  // Sort by start position descending so we splice from the bottom up and
  // earlier indices stay valid.
  const cuts = TARGETS.map((t) => {
    const { start, end, body } = extractFunctionByBoundaries(src, t.name, boundaries);
    return { ...t, start, end, body };
  }).sort((a, b) => b.start - a.start);

  const importLines = [];

  for (const cut of cuts) {
    const dest = path.join(ROOT, cut.out);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    // Convert plain `function Name(` to either `export default function Name(`
    // or `export function Name(`, depending on the target's preferred shape.
    const exported = cut.isDefault
      ? cut.body.replace(/^function\s+/, 'export default function ')
      : cut.body.replace(/^function\s+/, 'export function ');
    fs.writeFileSync(dest, cut.header + '\n' + exported + '\n');
    importLines.push({ name: cut.name, out: cut.out, isDefault: cut.isDefault });

    // Remove the function body from App.jsx (plus the trailing newline).
    let endTrim = cut.end;
    if (src[endTrim] === '\n') endTrim++;
    src = src.slice(0, cut.start) + src.slice(endTrim);
  }

  // Now add imports at the top of App.jsx, right after the last existing import.
  const importBlock = importLines
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((i) => {
      const rel = './' + i.out.replace(/^src\//, '');
      return i.isDefault
        ? `import ${i.name} from "${rel}";`
        : `import { ${i.name} } from "${rel}";`;
    })
    .join('\n');

  // Locate the last `import ... from "...";` near the top and insert after it.
  const importMatches = [...src.matchAll(/^import [^;]+;\s*$/gm)];
  const lastImport = importMatches[importMatches.length - 1];
  const insertAt = lastImport.index + lastImport[0].length;
  src = src.slice(0, insertAt) + '\n' + importBlock + src.slice(insertAt);

  fs.writeFileSync(APP_PATH, src);
  console.log(`Extracted ${cuts.length} functions. App.jsx now ${src.split('\n').length} lines.`);
}

main();
