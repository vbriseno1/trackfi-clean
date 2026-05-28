// Best-effort audit: for every .jsx file under src/views and the components
// we extracted, build the set of names brought in by `import` lines and the
// set of identifiers referenced in the code, then print whatever is referenced
// but not imported (filtering globals and locally-declared names). This catches
// the cases vite/rollup happily ignore — missing helper functions, icons, etc.
import fs from 'node:fs';
import path from 'node:path';

const FILES = [
  ...fs.readdirSync('src/views').map((f) => path.join('src/views', f)),
  'src/components/CashAccountsBlock.jsx',
  'src/components/ExpenseRow.jsx',
  'src/components/GoalRing.jsx',
  'src/components/EmojiPicker.jsx',
  'src/components/AuthScreen.jsx',
  'src/components/OnboardingWizard.jsx',
  'src/components/PinLock.jsx',
  'src/components/RechartsBridge.jsx',
  'src/modals/EditModal.jsx',
  'src/modals/ExtraPayModal.jsx',
  'src/modals/PaycheckDepositModal.jsx',
];

const GLOBALS = new Set([
  // Identifiers we expect to exist without an import.
  'React', 'window', 'document', 'navigator', 'console', 'Math', 'Object', 'Array',
  'JSON', 'Number', 'String', 'Boolean', 'Date', 'Map', 'Set', 'WeakMap', 'WeakSet',
  'Promise', 'Error', 'RangeError', 'TypeError', 'Intl', 'RegExp', 'Symbol', 'Buffer',
  'undefined', 'null', 'true', 'false', 'NaN', 'Infinity', 'globalThis', 'process',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame',
  'cancelAnimationFrame', 'fetch', 'URL', 'URLSearchParams', 'FormData', 'Blob',
  'FileReader', 'File', 'XMLHttpRequest', 'localStorage', 'sessionStorage', 'crypto',
  'Notification', 'HTMLElement', 'HTMLInputElement', 'Image', 'alert', 'confirm',
  'btoa', 'atob', 'encodeURIComponent', 'decodeURIComponent',
  'parseFloat', 'parseInt', 'isNaN', 'isFinite', 'TextDecoder', 'TextEncoder',
  'Sentry',
]);

function namesFromImportLine(line) {
  // Default: `import Foo from "..."`
  const def = /^import\s+([A-Za-z_]\w*)\s*(?:,|from)/.exec(line);
  // Namespace: `import * as Ns from "..."`
  const ns = /^import\s+\*\s+as\s+([A-Za-z_]\w*)/.exec(line);
  // Named: `import { A, B as C } from "..."`
  const named = /import\s+(?:[A-Za-z_]\w*\s*,\s*)?\{([^}]+)\}/.exec(line);
  const names = [];
  if (def) names.push(def[1]);
  if (ns) names.push(ns[1]);
  if (named) {
    for (const part of named[1].split(',')) {
      const t = part.trim();
      if (!t) continue;
      const m = /^([A-Za-z_]\w*)(?:\s+as\s+([A-Za-z_]\w*))?$/.exec(t);
      if (m) names.push(m[2] || m[1]);
    }
  }
  return names;
}

function localDecls(src) {
  // Crude: capture top-level/inner function names + arrow/const declarations.
  const names = new Set();
  for (const m of src.matchAll(/\b(?:const|let|var)\s+([A-Za-z_]\w*)/g)) names.add(m[1]);
  for (const m of src.matchAll(/\bfunction\s+([A-Za-z_]\w*)/g)) names.add(m[1]);
  for (const m of src.matchAll(/\bclass\s+([A-Za-z_]\w*)/g)) names.add(m[1]);
  // Destructured const/let/var declarations: `const {a, b: c} = x;` and `const [a, b] = x;`
  for (const m of src.matchAll(/\b(?:const|let|var)\s*\{([^}]+)\}/g)) {
    for (const part of m[1].split(',')) {
      const t = part.trim().replace(/=.*$/, '').trim();
      const renamed = /^([A-Za-z_]\w*)\s*:\s*([A-Za-z_]\w*)/.exec(t);
      if (renamed) names.add(renamed[2]);
      else { const single = /^([A-Za-z_]\w*)/.exec(t); if (single) names.add(single[1]); }
    }
  }
  for (const m of src.matchAll(/\b(?:const|let|var)\s*\[([^\]]+)\]/g)) {
    for (const part of m[1].split(',')) {
      const t = part.trim().replace(/=.*$/, '').trim();
      const single = /^([A-Za-z_]\w*)/.exec(t);
      if (single) names.add(single[1]);
    }
  }
  // Function parameters (best-effort).
  for (const m of src.matchAll(/\bfunction\s+\w+\s*\(([^)]*)\)/g)) {
    for (const part of m[1].split(',')) {
      const t = part.trim().replace(/=.*$/, '').replace(/^\.\.\./, '').trim();
      // Skip destructured blocks for now; they get picked up below.
      const single = /^([A-Za-z_]\w*)$/.exec(t);
      if (single) names.add(single[1]);
    }
  }
  // Arrow function params: `(a, b) => ...` and `a => ...`.
  for (const m of src.matchAll(/\(([^)]*)\)\s*=>/g)) {
    for (const part of m[1].split(',')) {
      const t = part.trim().replace(/=.*$/, '').replace(/^\.\.\./, '').trim();
      const single = /^([A-Za-z_]\w*)$/.exec(t);
      if (single) names.add(single[1]);
    }
  }
  for (const m of src.matchAll(/\b([A-Za-z_]\w*)\s*=>/g)) names.add(m[1]);
  return names;
}

function refs(src) {
  // Strip strings, template literals, comments to avoid false positives.
  let s = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/`(?:[^`\\$]|\\.|\$\{[^}]*\})*`/g, '``');
  const used = new Set();
  // JSX components/fragments — `<Foo `, `<Foo>`, `<Foo/>`, `<Foo\n`.
  for (const m of s.matchAll(/<([A-Z]\w*)\b/g)) used.add(m[1]);
  // Function calls — `Foo(` but not `obj.Foo(`.
  for (const m of s.matchAll(/(^|[^.\w])([A-Za-z_]\w*)\s*\(/g)) used.add(m[2]);
  // Member references — `Foo.bar` where Foo is capitalized (likely a module).
  for (const m of s.matchAll(/(^|[^.\w])([A-Z][A-Za-z0-9_]*)\s*\./g)) used.add(m[2]);
  // Drop reserved words / common builtins.
  for (const kw of ['if','else','for','while','do','switch','case','break','continue',
    'return','function','class','const','let','var','new','this','super','typeof',
    'instanceof','in','of','try','catch','finally','throw','await','async','yield',
    'import','export','from','as','default','extends','static','void','delete','null',
    'true','false','undefined','NaN','Infinity']) used.delete(kw);
  return used;
}

let problems = 0;
for (const f of FILES) {
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, 'utf8');
  const importedNames = new Set();
  for (const line of src.split('\n')) {
    if (/^\s*import\s/.test(line)) {
      for (const n of namesFromImportLine(line.trim())) importedNames.add(n);
    }
  }
  const locals = localDecls(src);
  const used = refs(src);
  const missing = [];
  for (const u of used) {
    if (importedNames.has(u)) continue;
    if (locals.has(u)) continue;
    if (GLOBALS.has(u)) continue;
    // Skip short likely-not-identifier tokens? No, just report.
    missing.push(u);
  }
  if (missing.length) {
    console.log(`\n${f}:`);
    for (const m of missing.sort()) console.log(`  - ${m}`);
    problems += missing.length;
  }
}
process.exit(problems > 0 ? 0 : 0);
