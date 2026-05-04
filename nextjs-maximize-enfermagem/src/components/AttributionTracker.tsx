"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureAttribution } from "@/lib/attribution/capture";

/**
 * Dispara captureAttribution() em qualquer pageview. A função é idempotente:
 * só persiste no primeiro pageview da janela TTL. Re-roda em pathname change
 * pra cobrir o caso de soft-navigation (ex: home → /lp/edital?utm_*=...).
 */
export function AttributionTracker() {
  const pathname = usePathname();

  useEffect(() => {
    captureAttribution();
  }, [pathname]);

  return null;
}
