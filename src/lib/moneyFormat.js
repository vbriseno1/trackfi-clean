export function fmt(n) {
  const v = Number(n);
  return "$" + (isNaN(v) ? 0 : v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function fmtK(n) {
  const v = Number(n || 0);
  return v >= 1000 ? "$" + (v / 1000).toFixed(1) + "k" : fmt(v);
}
export function todayStr() {
  const n = new Date();
  return n.getFullYear() + "-" + String(n.getMonth() + 1).padStart(2, "0") + "-" + String(n.getDate()).padStart(2, "0");
}
