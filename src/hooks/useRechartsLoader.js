/**
 * Lazy-load the recharts module from the network on idle, so the initial paint
 * isn't blocked by ~640KB of charts code. Returns `{ rechartsMod, failed }` —
 * `RechartsReady` reads these via context and shows a skeleton or fallback.
 *
 * Why a hook and not a module-level promise: we want React-managed lifecycle
 * (skipping work after unmount, cancelling idle callbacks in StrictMode dev
 * double-invokes) and we want chunks to load only when an actual app session
 * mounts — not during SSR / Vitest setup.
 */
import { useEffect, useState } from "react";

export function useRechartsLoader() {
  const [rechartsMod, setRechartsMod] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    function load() {
      import("recharts")
        .then((m) => { if (!cancelled) setRechartsMod(m); })
        .catch((e) => { console.error("[Trackfi] recharts load failed", e); if (!cancelled) setFailed(true); });
    }
    let idleId;
    let tId;
    if (typeof requestIdleCallback !== "undefined") {
      idleId = requestIdleCallback(load, { timeout: 2800 });
    } else {
      tId = setTimeout(load, 0);
    }
    return () => {
      cancelled = true;
      if (idleId != null && typeof cancelIdleCallback !== "undefined") cancelIdleCallback(idleId);
      if (tId != null) clearTimeout(tId);
    };
  }, []);

  return { rechartsMod, failed };
}
