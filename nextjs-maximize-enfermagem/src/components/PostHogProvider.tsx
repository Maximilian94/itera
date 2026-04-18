"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { analytics } from "@/lib/analytics";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    analytics.init();
  }, []);

  useEffect(() => {
    if (!pathname) return;
    analytics.pageview();
  }, [pathname]);

  return <>{children}</>;
}
