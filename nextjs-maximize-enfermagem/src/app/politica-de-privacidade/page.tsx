import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Política de Privacidade da Maximize Enfermagem. Conheça como tratamos seus dados pessoais em conformidade com a LGPD.",
};

export default function PoliticaDePrivacidadePage() {
  return (
    <main className="container mx-auto min-h-screen max-w-4xl p-8">
      <Link
        href="/"
        className="text-cyan-600 hover:text-cyan-500 hover:underline"
      >
        ← Voltar ao início
      </Link>

      <article className="mt-8 prose prose-slate max-w-none">
        <h1 className="text-4xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-slate-500 text-sm">
          Última atualização:{" "}
          {new Date().toLocaleDateString("pt-BR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>

        <p className="lead mt-6">
          A Maximize Enfermagem está comprometida com a proteção dos seus dados
          pessoais. Esta política descreve como coletamos, usamos e protegemos
          suas informações, em conformidade com a Lei Geral de Proteção de
          Dados (LGPD - Lei nº 13.709/2018).
        </p>

        <h2>1. Identificação do Controlador</h2>
        <p>
          O controlador dos seus dados pessoais é a Maximize Enfermagem,
          plataforma de questões para concursos públicos de enfermagem. Para
          contato sobre questões de privacidade:{" "}
          <a
            href="mailto:contato@maximizeenfermagem.com.br"
            className="text-cyan-600 hover:text-cyan-500"
          >
            contato@maximizeenfermagem.com.br
          </a>
          .
        </p>

        <h2>2. Dados Coletados</h2>
        <p>Coletamos os seguintes tipos de dados:</p>
        <ul>
          <li>
            <strong>Dados de cadastro:</strong> nome, endereço de e-mail e
            senha (esta última é armazenada de forma criptografada pelo nosso
            provedor de autenticação).
          </li>
          <li>
            <strong>Dados de uso:</strong> questões respondidas, desempenho em
            simulados, histórico de estudos e interações com a plataforma.
          </li>
          <li>
            <strong>Dados de pagamento:</strong> processados de forma segura
            pelo Stripe; não armazenamos números de cartão de crédito em nossos
            servidores.
          </li>
          <li>
            <strong>Dados técnicos:</strong> endereço IP, tipo de navegador e
            dispositivo, para fins de segurança e melhoria do serviço.
          </li>
        </ul>

        <h2>3. Finalidade do Tratamento</h2>
        <p>Utilizamos seus dados para:</p>
        <ul>
          <li>Fornecer e personalizar o serviço de questões e simulados</li>
          <li>Processar assinaturas e pagamentos</li>
          <li>Enviar comunicações sobre a plataforma (quando autorizado)</li>
          <li>Melhorar nossos produtos e experiência do usuário</li>
          <li>Cumprir obrigações legais e regulatórias</li>
        </ul>

        <h2>4. Base Legal</h2>
        <p>
          O tratamento dos seus dados está fundamentado em: execução de
          contrato, consentimento (quando aplicável), cumprimento de obrigação
          legal e legítimo interesse para melhorar nossos serviços.
        </p>

        <h2>5. Compartilhamento de Dados</h2>
        <p>
          Podemos compartilhar dados com prestadores de serviço essenciais ao
          funcionamento da plataforma, como:
        </p>
        <ul>
          <li>
            <strong>Clerk:</strong> autenticação e gestão de contas
          </li>
          <li>
            <strong>Stripe:</strong> processamento de pagamentos
          </li>
          <li>
            <strong>Provedores de hospedagem:</strong> infraestrutura e
            armazenamento
          </li>
        </ul>
        <p>
          Esses prestadores são contratados sob acordos que garantem a
          proteção dos seus dados e o cumprimento da LGPD.
        </p>

        <h2>6. Direitos do Titular</h2>
        <p>Você tem direito a:</p>
        <ul>
          <li>Confirmar a existência de tratamento de dados</li>
          <li>Acessar seus dados</li>
          <li>Corrigir dados incompletos ou desatualizados</li>
          <li>Solicitar a exclusão dos dados (respeitadas as exceções legais)</li>
          <li>Solicitar a portabilidade dos dados</li>
          <li>Revogar o consentimento, quando aplicável</li>
        </ul>
        <p>
          Para exercer esses direitos, entre em contato pelo e-mail{" "}
          <a
            href="mailto:contato@maximizeenfermagem.com.br"
            className="text-cyan-600 hover:text-cyan-500"
          >
            contato@maximizeenfermagem.com.br
          </a>
          .
        </p>

        <h2>7. Retenção e Segurança</h2>
        <p>
          Mantemos seus dados pelo tempo necessário para cumprir as finalidades
          descritas ou exigências legais. Adotamos medidas técnicas e
          organizacionais para proteger seus dados contra acesso não autorizado,
          perda ou alteração.
        </p>

        <h2>8. Cookies</h2>
        <p>
          Utilizamos cookies e tecnologias similares para manter sua sessão,
          lembrar preferências e analisar o uso da plataforma. Você pode
          configurar seu navegador para recusar cookies, mas isso pode afetar
          algumas funcionalidades.
        </p>

        <h2>9. Alterações</h2>
        <p>
          Esta política pode ser atualizada. Alterações significativas serão
          comunicadas por e-mail ou por aviso na plataforma. A data da última
          atualização está indicada no início deste documento.
        </p>

        <h2>10. Contato</h2>
        <p>
          Dúvidas sobre esta política ou sobre o tratamento dos seus dados
          podem ser enviadas para{" "}
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
