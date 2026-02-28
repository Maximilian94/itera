import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Exclusão de Dados",
  description:
    "Instruções para exclusão de dados da Maximize Enfermagem. Saiba como solicitar a remoção dos seus dados pessoais da plataforma.",
};

export default function ExclusaoDeDadosPage() {
  return (
    <main className="container mx-auto min-h-screen max-w-4xl p-8">
      <Link
        href="/"
        className="text-cyan-600 hover:text-cyan-500 hover:underline"
      >
        ← Voltar ao início
      </Link>

      <article className="mt-8 prose prose-slate max-w-none">
        <h1 className="text-4xl font-bold mb-2">Exclusão de Dados</h1>
        <p className="text-slate-500 text-sm">
          Última atualização:{" "}
          {new Date().toLocaleDateString("pt-BR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>

        <p className="lead mt-6">
          Esta página descreve como você pode solicitar a exclusão dos seus
          dados pessoais da plataforma Maximize Enfermagem, em conformidade com
          a Lei Geral de Proteção de Dados (LGPD) e com as políticas de
          plataformas terceiras, como o Facebook.
        </p>

        <h2>1. Direito à Exclusão</h2>
        <p>
          Você tem o direito de solicitar a exclusão dos seus dados pessoais a
          qualquer momento. A Maximize Enfermagem está comprometida em atender
          essas solicitações de forma transparente e dentro dos prazos legais
          estabelecidos pela LGPD.
        </p>

        <h2>2. Como Solicitar a Exclusão</h2>
        <p>Para solicitar a exclusão dos seus dados, siga os passos abaixo:</p>
        <ol>
          <li>
            Envie um e-mail para{" "}
            <a
              href="mailto:contato@maximizeenfermagem.com.br"
              className="text-cyan-600 hover:text-cyan-500"
            >
              contato@maximizeenfermagem.com.br
            </a>{" "}
            com o assunto &quot;Solicitação de Exclusão de Dados&quot;.
          </li>
          <li>
            Informe o endereço de e-mail associado à sua conta na plataforma.
          </li>
          <li>
            Opcionalmente, descreva quais dados você deseja excluir ou indique
            que deseja a exclusão completa da conta e de todos os dados
            associados.
          </li>
        </ol>
        <p>
          Responderemos em até 15 (quinze) dias úteis, conforme previsto na LGPD,
          confirmando o recebimento da solicitação e informando as próximas
          etapas.
        </p>

        <h2>3. Dados que Serão Excluídos</h2>
        <p>Ao atender sua solicitação, excluiremos:</p>
        <ul>
          <li>
            <strong>Dados de cadastro:</strong> nome, endereço de e-mail e
            informações de autenticação
          </li>
          <li>
            <strong>Dados de uso:</strong> histórico de questões respondidas,
            desempenho em simulados e interações com a plataforma
          </li>
          <li>
            <strong>Dados de assinatura:</strong> informações de plano e
            pagamento armazenadas em nossos sistemas (observando que dados
            processados pelo Stripe podem estar sujeitos às políticas de
            retenção desse provedor para fins legais e fiscais)
          </li>
        </ul>

        <h2>4. Exceções e Retenção Legal</h2>
        <p>
          Alguns dados podem ser mantidos por período determinado quando
          necessário para:
        </p>
        <ul>
          <li>Cumprimento de obrigações legais, regulatórias ou fiscais</li>
          <li>Exercício regular de direitos em processos judiciais ou
            administrativos</li>
          <li>Proteção da vida ou da incolumidade física do titular ou de
            terceiros</li>
        </ul>
        <p>
          Nesses casos, informaremos quais dados serão mantidos e o motivo,
          conforme exigido pela LGPD.
        </p>

        <h2>5. Integração com Facebook e Outras Plataformas</h2>
        <p>
          Se você utilizou o login com Facebook ou outras plataformas para
          acessar a Maximize Enfermagem, a exclusão dos dados em nossa
          plataforma não exclui automaticamente seus dados nessas plataformas.
          Para gerenciar ou excluir dados vinculados ao Facebook, acesse as
          configurações de privacidade do Facebook ou entre em contato diretamente
          com o suporte do Facebook.
        </p>

        <h2>6. Contato</h2>
        <p>
          Para solicitar a exclusão dos seus dados ou esclarecer dúvidas sobre
          este processo, entre em contato:{" "}
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
