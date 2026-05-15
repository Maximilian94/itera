import type { Metadata } from "next";
import Frustracao from "@/components/lp/plantao/Frustracao";
import Gancho from "@/components/lp/plantao/Gancho";
import PropostaValor from "@/components/lp/plantao/PropostaValor";
import Credibilidade from "@/components/lp/plantao/Credibilidade";

export const metadata: Metadata = {
    title: "Diagnóstico de rotina — estude com mais constância",
    description:
        "Trabalha em plantão e quer passar em concurso de enfermagem? Em 5 minutos, descubra se sua rotina de estudos é realista e o que ajustar para evoluir mesmo com pouco tempo.",
    openGraph: {
        title: "Diagnóstico de rotina — Maximize Enfermagem",
        description:
            "Sua rotina atual está ajudando ou sabotando sua aprovação? Descubra em 5 minutos como estudar com mais constância mesmo entre plantões.",
        type: "website",
        locale: "pt_BR",
    },
};

export default function LpPlantaoPage() {
    return (
        <main>
            <Frustracao />
            <Gancho />
            <PropostaValor />
            <Credibilidade />
        </main>
    );
}
