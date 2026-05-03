"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const HIDE_PREFIXES = ["/diagnostico"];

interface SiteChromeProps {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}

/**
 * Renderiza Header e Footer em todas as rotas, exceto naquelas listadas em
 * HIDE_PREFIXES (ex: o wizard `/diagnostico`, que tem chrome próprio
 * Typeform-like). Mantém Header/Footer como componentes simples (server
 * component no caso do Footer) — o toggle vive aqui.
 */
export function SiteChrome({ header, footer, children }: SiteChromeProps) {
  const pathname = usePathname() ?? "";
  const hideChrome = HIDE_PREFIXES.some((p) => pathname.startsWith(p));

  if (hideChrome) {
    return <>{children}</>;
  }

  return (
    <>
      {header}
      {children}
      {footer}
    </>
  );
}
