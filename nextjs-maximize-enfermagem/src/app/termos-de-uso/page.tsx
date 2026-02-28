import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description:
    "Termos de Uso da Maximize Enfermagem. Conheça as condições de uso da plataforma de questões para concursos de enfermagem.",
};

export default function TermosDeUsoPage() {
  return (
    <main className="container mx-auto min-h-screen max-w-4xl p-8">
      <Link
        href="/"
        className="text-cyan-600 hover:text-cyan-500 hover:underline"
      >
        ← Voltar ao início
      </Link>

      <article className="mt-8 prose prose-slate max-w-none">
        <h1 className="text-4xl font-bold mb-2">Termos de Uso</h1>
        <p className="text-slate-500 text-sm">
          Última atualização:{" "}
          {new Date().toLocaleDateString("pt-BR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>

        <p className="lead mt-6">
          Ao acessar ou utilizar a plataforma Maximize Enfermagem, você aceita
          os presentes Termos de Uso. Leia-os com atenção antes de utilizar
          nossos serviços.
        </p>

        <h2>1. Aceitação dos Termos</h2>
        <p>
          O uso da plataforma implica na aceitação integral destes Termos de
          Uso. Se você não concordar com qualquer disposição, não utilize o
          serviço. O cadastro e o uso continuado constituem aceitação tácita das
          condições aqui estabelecidas.
        </p>

        <h2>2. Descrição do Serviço</h2>
        <p>
          A Maximize Enfermagem é uma plataforma de questões e simulados
          voltada para concursos públicos de enfermagem. Oferecemos questões
          comentadas, metodologia baseada em evidências (Retrieval Practice,
          Repetição Espaçada, Feedback Imediato) e acompanhamento de
          desempenho. O serviço pode ser oferecido em planos gratuitos ou
          pagos, conforme disponibilidade.
        </p>

        <h2>3. Cadastro e Conta</h2>
        <p>
          Para utilizar funcionalidades completas da plataforma, é necessário
          criar uma conta fornecendo dados verdadeiros e atualizados. Você é
          responsável por manter a confidencialidade de sua senha e por todas
          as atividades realizadas em sua conta. Em caso de uso não autorizado,
          notifique-nos imediatamente.
        </p>

        <h2>4. Uso Aceitável</h2>
        <p>Você concorda em utilizar a plataforma de forma lícita e ética.</p>
        <h3>É proibido:</h3>
        <ul>
          <li>Compartilhar credenciais de acesso com terceiros</li>
          <li>Reproduzir, distribuir ou comercializar o conteúdo das questões sem autorização</li>
          <li>Utilizar sistemas automatizados para extrair dados em massa</li>
          <li>Praticar atos que prejudiquem o funcionamento da plataforma ou de outros usuários</li>
          <li>Violar leis aplicáveis ou direitos de terceiros</li>
        </ul>

        <h2>5. Propriedade Intelectual</h2>
        <p>
          Todo o conteúdo da plataforma (questões, comentários, textos,
          metodologias e materiais) é de propriedade da Maximize Enfermagem ou
          de seus licenciadores. O uso da plataforma não concede qualquer direito
          de propriedade sobre o conteúdo, exceto o direito de acesso conforme
          o plano contratado.
        </p>

        <h2>6. Assinaturas e Pagamentos</h2>
        <p>
          Planos pagos são processados via Stripe. Ao assinar, você autoriza
          cobranças recorrentes conforme o plano escolhido. Os valores podem
          ser alterados com aviso prévio. O não pagamento pode resultar na
          suspensão ou cancelamento do acesso.
        </p>

        <h2>7. Cancelamento e Reembolso</h2>
        <p>
          O cancelamento da assinatura pode ser feito a qualquer momento,
          cessando as cobranças futuras. O acesso permanece até o fim do
          período já pago. Políticas de reembolso seguem as condições do Stripe
          e podem ser consultadas em nossa página de planos ou mediante contato.
        </p>

        <h2>8. Limitação de Responsabilidade</h2>
        <p>
          A plataforma é fornecida &quot;como está&quot;. Não garantimos que o
          conteúdo das questões ou simulados reflita exatamente o que será
          cobrado em concursos específicos. O uso do serviço é por sua conta e
          risco. Na máxima extensão permitida por lei, não nos responsabilizamos
          por danos indiretos, incidentais ou consequenciais decorrentes do uso
          ou da impossibilidade de uso da plataforma.
        </p>

        <h2>9. Lei Aplicável</h2>
        <p>
          Estes Termos são regidos pelas leis da República Federativa do Brasil.
          Eventuais disputas serão submetidas ao foro da comarca do domicílio
          do usuário, com renúncia a qualquer outro, por mais privilegiado que
          seja.
        </p>

        <h2>10. Alterações</h2>
        <p>
          Podemos alterar estes Termos a qualquer momento. Alterações
          significativas serão comunicadas por e-mail ou aviso na plataforma.
          O uso continuado após as alterações constitui aceitação dos novos
          termos.
        </p>

        <h2>11. Contato</h2>
        <p>
          Para dúvidas sobre estes Termos de Uso, entre em contato:{" "}
          <a
            href="mailto:contato@maximizeenfermagem.com.br"
            className="text-cyan-600 hover:text-cyan-500"
          >
            contato@maximizeenfermagem.com.br
          </a>
          .
        </p>
      </article>
    </main>
  );
}
