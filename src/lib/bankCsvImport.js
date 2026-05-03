export const BANK_CSV_FORMATS = [
  {
    name: "Chase",
    detect: (h) => h.includes("transaction date") || h.includes("post date"),
    date: (r) => r[0] || r[1],
    desc: (r) => r[2],
    amt: (r) => -parseFloat((r[3] || r[4] || "0").replace(/[^0-9.-]/g, "")),
  },
  {
    name: "Bank of America",
    detect: (h) => h.toLowerCase().includes("posted date") || h.toLowerCase().includes("payee"),
    date: (r) => r[0],
    desc: (r) => r[2] || r[1],
    amt: (r) => parseFloat((r[4] || r[3] || "0").replace(/[^0-9.-]/g, "")),
  },
  {
    name: "Wells Fargo",
    detect: (h) =>
      /amount/i.test(h) &&
      !/transaction date/i.test(h) &&
      h.split(",").length >= 4,
    date: (r) => r[0],
    desc: (r) => r[4],
    amt: (r) => parseFloat((r[1] || "0").replace(/[^0-9.-]/g, "")),
  },
  {
    name: "Capital One",
    detect: (h) => h.toLowerCase().includes("transaction date") && h.toLowerCase().includes("debit"),
    date: (r) => r[0],
    desc: (r) => r[2],
    amt: (r) => {
      const d = parseFloat((r[4] || "").replace(/[^0-9.-]/g, ""));
      const c = parseFloat((r[5] || "").replace(/[^0-9.-]/g, ""));
      return d > 0 ? d : -c;
    },
  },
  {
    name: "Citi",
    detect: (h) =>
      h.toLowerCase().includes("status") &&
      h.toLowerCase().includes("debit") &&
      h.toLowerCase().includes("credit"),
    date: (r) => r[1],
    desc: (r) => r[2],
    amt: (r) => {
      const d = parseFloat((r[3] || "").replace(/[^0-9.-]/g, ""));
      const c = parseFloat((r[4] || "").replace(/[^0-9.-]/g, ""));
      return d > 0 ? d : -c;
    },
  },
  {
    name: "Generic",
    detect: () => true,
    date: (r) => r[0],
    desc: (r) => r[1],
    amt: (r) => Math.abs(parseFloat((r[2] || r[3] || "0").replace(/[^0-9.-]/g, ""))),
  },
];

export const BANK_CSV_CAT_RULES = [
  { r: /grocery|groceries|publix|kroger|safeway|trader joe|whole foods|aldi|costco|walmart|wegmans|sprouts/i, c: "Groceries" },
  {
    r: /mcdonald|burger king|wendy|chick-fil|taco bell|subway|chipotle|popeyes|kfc|domino|sonic|five guys|sonic|whataburger/i,
    c: "Fast Food",
  },
  { r: /restaurant|doordash|grubhub|ubereats|postmates|dine|sushi|bistro|steakhouse|grill/i, c: "Restaurants" },
  { r: /starbucks|dunkin|coffee|latte|espresso|dutch bros|caribou|peet/i, c: "Coffee" },
  { r: /shell|bp|chevron|exxon|mobil|speedway|wawa|sheetz|pilot|loves|quiktrip|fuel|gas\s/i, c: "Gas" },
  { r: /uber|lyft|taxi|cab\b/i, c: "Rideshare" },
  {
    r: /netflix|hulu|spotify|apple music|disney|hbo|paramount|peacock|youtube premium|crunchyroll|adobe|dropbox|icloud/i,
    c: "Subscriptions",
  },
  { r: /cvs|walgreens|rite aid|pharmacy|medical|doctor|hospital|dental|dentist|urgent care|copay/i, c: "Health / Medical" },
  { r: /planet fitness|la fitness|anytime fitness|equinox|ymca|crossfit|orangetheory|peloton|gym/i, c: "Gym / Fitness" },
  { r: /barber|salon|great clips|supercuts|hair|nails|manicure|spa|massage|ulta|sephora|wax/i, c: "Grooming / Haircuts" },
  { r: /nike|adidas|h&m|zara|gap|old navy|nordstrom|target|forever 21|shein|clothing|clothes|shoes/i, c: "Clothing" },
  { r: /amazon|target|walmart|best buy|home depot|lowes|ikea|tj maxx|marshalls|ross|kohls/i, c: "Shopping" },
  { r: /petco|petsmart|vet|veterinary|pet food|chewy/i, c: "Pets" },
  { r: /movie|amc|regal|theater|concert|ticketmaster|steam|playstation|xbox|nintendo|bowling/i, c: "Entertainment" },
  { r: /hotel|airbnb|vrbo|flight|airline|southwest|delta|united|frontier|spirit|booking|expedia|vacation/i, c: "Travel" },
  { r: /rent|mortgage|landlord|lease|apartment/i, c: "Rent / Mortgage" },
  { r: /electric|utility|water|internet|cable|xfinity|comcast|att|verizon|t-mobile|phone/i, c: "Utilities" },
  { r: /bar|nightclub|happy hour|brunch|dining out/i, c: "Dining Out" },
];

export function autoCategoryBankCsv(desc, merchantCats = {}, rules = BANK_CSV_CAT_RULES) {
  if (!desc) return "Misc";
  const dl = desc.toLowerCase().trim();
  if (merchantCats[dl]) return merchantCats[dl];
  for (const { r, c } of rules) {
    if (r.test(dl)) return c;
  }
  return "Misc";
}

function parseCsvRow(line) {
  const cols = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQ = !inQ;
    else if (ch === "," && !inQ) {
      cols.push(cur.trim().replace(/^"|"$/g, ""));
      cur = "";
    } else cur += ch;
  }
  cols.push(cur.trim().replace(/^"|"$/g, ""));
  return cols;
}

/**
 * Parse pasted bank CSV text into expense-shaped rows (includes synthetic ids).
 * @param {string} text
 * @param {{ merchantCats?: Record<string, string>, nowMs?: number }} [opts]
 */
export function parseBankCsvText(text, opts = {}) {
  const merchantCats = opts.merchantCats || {};
  const nowMs = typeof opts.nowMs === "number" ? opts.nowMs : Date.now();
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = lines[0].toLowerCase();
  const fmt = BANK_CSV_FORMATS.find((f) => f.detect(header)) || BANK_CSV_FORMATS[BANK_CSV_FORMATS.length - 1];
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const r = parseCsvRow(lines[i]);
    if (r.length < 2) continue;
    const rawDate = fmt.date(r) || "";
    const name = (fmt.desc(r) || "").trim();
    const rawAmt = fmt.amt(r);
    if (!name || Number.isNaN(rawAmt) || rawAmt <= 0) continue;
    let date = "";
    const dm = rawDate.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (dm) {
      const yr = dm[3].length === 2 ? "20" + dm[3] : dm[3];
      date = `${yr}-${dm[1].padStart(2, "0")}-${dm[2].padStart(2, "0")}`;
    } else if (/\d{4}-\d{2}-\d{2}/.test(rawDate)) date = rawDate.slice(0, 10);
    if (!date) continue;
    rows.push({
      id: `imp_${nowMs}_${i}`,
      name,
      amount: rawAmt.toFixed(2),
      date,
      category: autoCategoryBankCsv(name, merchantCats),
      notes: "Imported",
      owner: "me",
      paidFrom: "none",
    });
  }
  return rows;
}
