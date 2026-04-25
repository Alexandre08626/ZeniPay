// Robust auto-refresh hook for any page that shows live data.
//
// Fires `load` on:
//   - mount (handled by the consumer's own useEffect)
//   - the tab becoming visible (visibilitychange) — survives every
//     OS / browser tab-throttling regime
//   - the window regaining focus (focus event) — covers "switched
//     between two app windows" without changing visibility
//   - a recurring interval while the tab is visible (default 10s).
//     Browsers throttle setInterval to ~1 minute when the tab is
//     hidden, but visibilitychange covers that case anyway.
//
// Pass it any async loader. Stable across renders.

"use client";

import { useEffect } from "react";

export interface UseAutoRefreshOpts {
  intervalMs?: number;
  /** Skip auto-refresh — useful while the user is editing a form. */
  paused?: boolean;
}

export function useAutoRefresh(load: () => void | Promise<void>, opts: UseAutoRefreshOpts = {}) {
  const { intervalMs = 10_000, paused = false } = opts;

  useEffect(() => {
    if (paused) return;

    const safeLoad = () => { void load(); };

    // Visibility — fires when the tab becomes active again.
    const onVis = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        safeLoad();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", safeLoad);

    // Interval ticks while the tab is visible.
    let id: ReturnType<typeof setInterval> | null = null;
    const startInterval = () => {
      if (id != null) return;
      id = setInterval(() => {
        if (document.visibilityState === "visible") safeLoad();
      }, intervalMs);
    };
    const stopInterval = () => {
      if (id != null) { clearInterval(id); id = null; }
    };
    startInterval();

    // Pause/resume the interval based on visibility too — saves
    // background CPU even though setInterval is throttled.
    const onVisToggle = () => {
      if (document.visibilityState === "visible") startInterval(); else stopInterval();
    };
    document.addEventListener("visibilitychange", onVisToggle);

    return () => {
      stopInterval();
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("visibilitychange", onVisToggle);
      window.removeEventListener("focus", safeLoad);
    };
  }, [load, intervalMs, paused]);
}
