export const BACKUP_ARRAY_KEYS = [
  "expenses",
  "bills",
  "debts",
  "trades",
  "shifts",
  "savingsGoals",
  "budgetGoals",
  "categories",
  "recurrings",
  "settlements",
  "hhBudgets",
  "subDismissed",
  "balHist",
  "notifs",
];

export const BACKUP_OBJECT_KEYS = [
  "accounts",
  "income",
  "settings",
  "calColors",
  "dashConfig",
  "household",
  "tradingAccount",
  "accountRates",
  "merchantCats",
];

export function validateTrackfiBackup(input) {
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["Backup file must contain a JSON object."] };
  }

  const knownKeys = new Set([
    ...BACKUP_ARRAY_KEYS,
    ...BACKUP_OBJECT_KEYS,
    "appName",
    "greetName",
    "onboarded",
    "profCategory",
    "profSub",
    "nwGoal",
    "version",
    "exportedAt",
    "demoModelVersion",
    "app",
  ]);

  const meaningfulKeys = [...BACKUP_ARRAY_KEYS, ...BACKUP_OBJECT_KEYS, "appName", "greetName", "onboarded", "profCategory", "profSub", "nwGoal"];
  if (!meaningfulKeys.some((key) => Object.prototype.hasOwnProperty.call(input, key))) {
    errors.push("This does not look like a Trackfi backup.");
  }

  for (const key of BACKUP_ARRAY_KEYS) {
    if (Object.prototype.hasOwnProperty.call(input, key) && !Array.isArray(input[key])) {
      errors.push(`${key} must be a list.`);
    }
  }

  for (const key of BACKUP_OBJECT_KEYS) {
    if (
      Object.prototype.hasOwnProperty.call(input, key) &&
      input[key] != null &&
      (typeof input[key] !== "object" || Array.isArray(input[key]))
    ) {
      errors.push(`${key} must be an object.`);
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, "onboarded") && typeof input.onboarded !== "boolean") {
    errors.push("onboarded must be true or false.");
  }

  const unknownKeys = Object.keys(input).filter((key) => !knownKeys.has(key));
  return {
    ok: errors.length === 0,
    errors,
    warnings: unknownKeys.length ? [`Ignored unknown fields: ${unknownKeys.slice(0, 6).join(", ")}${unknownKeys.length > 6 ? "..." : ""}`] : [],
  };
}

export function parseTrackfiBackupJson(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["Backup file is not valid JSON."] };
  }

  const validation = validateTrackfiBackup(parsed);
  if (!validation.ok) return validation;
  return { ...validation, data: parsed };
}
