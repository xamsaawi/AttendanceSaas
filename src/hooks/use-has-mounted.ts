"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/**
 * Tracks whether the component has hydrated on the client. Useful for
 * deferring UI that depends on browser-only state (e.g. next-themes)
 * until after hydration, without a setState-in-effect antipattern.
 */
export function useHasMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
