import type { Metadata } from "next";
import Frustracao from "@/components/lp/edital/Frustracao";
import Gancho from "@/components/lp/edital/Gancho";
import PropostaValor from "@/components/lp/edital/PropostaValor";
import Credibilidade from "@/components/lp/edital/Credibilidade";

export const metadata: Metadata = {
    title: "Diagnóstico do edital — descubra o que estudar primeiro",
    description:
        "Edital gigante de enfermagem? Em 5 minutos, descubra os 3 assuntos que mais caem no seu concurso e onde você está em cada um. Diagnóstico gratuito.",
    openGraph: {
        title: "Diagnóstico do edital — Maximize Enfermagem",
        description:
            "Em 5 minutos, descubra exatamente o que estudar primeiro do edital de enfermagem do seu concurso.",
        type: "website",
        locale: "pt_BR",
    },
};

export default function LpEditalPage() {
    return (
        <main>
            <Frustracao />
            <Gancho />
            <PropostaValor />
            <Credibilidade />
        </main>
    );
}
