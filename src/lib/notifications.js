/**
 * Browser Notification API shims. Centralized so views/hooks don't have to
 * keep guarding against environments where `window.Notification` is missing
 * (Safari private mode, SSR, tests).
 */
export const notifSupported = () =>
  typeof window !== "undefined" && "Notification" in window;

export const notifPermission = () =>
  notifSupported() ? window.Notification.permission : "denied";

/** Convenience wrapper — never throws, returns the granted permission or "denied". */
export async function requestNotifPermission() {
  if (!notifSupported()) return "denied";
  try {
    const res = await window.Notification.requestPermission();
    return res || "denied";
  } catch {
    return "denied";
  }
}
