import type { Metadata } from "next";
import { Wizard } from "@/components/diagnostico/Wizard";

export const metadata: Metadata = {
  title: "Diagnóstico de estudo — Maximize Enfermagem",
  description:
    "Em ~3 minutos, descubra seu perfil de estudo para concursos de Enfermagem e o que mudar primeiro pra render mais.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Diagnóstico de estudo — Maximize Enfermagem",
    description:
      "Descubra seu perfil de estudo em 3 minutos: rotina, método, retenção e prioridade.",
    type: "website",
    locale: "pt_BR",
  },
};

export default function DiagnosticoPage() {
  return <Wizard />;
}
