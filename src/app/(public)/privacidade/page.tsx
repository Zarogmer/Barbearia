import Link from "next/link";

export const metadata = {
  title: "Política de privacidade — Lustro",
};

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href="/"
        className="text-xs text-muted-foreground hover:underline"
      >
        ← Voltar
      </Link>
      <h1 className="mt-4 mb-2 text-3xl font-bold tracking-tight">
        Política de privacidade
      </h1>
      <p className="mb-8 text-xs text-muted-foreground">
        Última atualização: 17 de junho de 2026 · Compatível com LGPD (Lei
        13.709/18)
      </p>

      <article className="prose prose-sm max-w-none space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold">1. Controlador</h2>
          <p>
            <strong>Vinícius Gomes</strong>, responsável pela operação do
            Lustro, atua como controlador dos dados de donos de barbearia
            (assinantes). Para os clientes finais (quem agenda), o dono da
            barbearia é o controlador e o Lustro atua como operador.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">2. Que dados coletamos</h2>
          <p>De donos de barbearia (assinantes):</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>Nome, email, telefone (WhatsApp), senha (hash bcrypt)</li>
            <li>Nome da barbearia, slug, endereço, foto, descrição</li>
            <li>Histórico de pagamentos via Stripe (não armazenamos cartão)</li>
            <li>Logs técnicos: IP, user-agent, timestamps de ações</li>
          </ul>
          <p className="mt-3">De clientes finais (quem agenda):</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>Nome, telefone (WhatsApp), email (opcional)</li>
            <li>Histórico de agendamentos, mensagens trocadas</li>
            <li>Aniversário (opcional, para envio de saudação)</li>
            <li>Fotos antes/depois (se o dono fizer upload)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">3. Bases legais (LGPD art. 7º)</h2>
          <ul className="ml-6 list-disc space-y-1">
            <li>
              <strong>Execução de contrato</strong>: criar conta, processar
              pagamentos, agendar
            </li>
            <li>
              <strong>Consentimento</strong>: envio de WhatsApp com código de
              confirmação e lembretes
            </li>
            <li>
              <strong>Legítimo interesse</strong>: segurança da plataforma,
              prevenção de fraude, melhoria do serviço
            </li>
            <li>
              <strong>Obrigação legal</strong>: dados fiscais e contábeis
              decorrentes das assinaturas
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">4. Com quem compartilhamos</h2>
          <ul className="ml-6 list-disc space-y-1">
            <li>
              <strong>Stripe</strong> — processamento de pagamentos
              (PCI-DSS Level 1)
            </li>
            <li>
              <strong>Vercel</strong> — hospedagem da aplicação
            </li>
            <li>
              <strong>Neon / Railway</strong> — banco de dados PostgreSQL
            </li>
            <li>
              <strong>Resend</strong> — envio de emails transacionais
            </li>
            <li>
              <strong>Evolution API / Meta WhatsApp</strong> — envio de
              mensagens via WhatsApp
            </li>
            <li>
              <strong>Sentry</strong> — monitoramento de erros (anonimizado)
            </li>
            <li>
              <strong>Cloudinary</strong> — armazenamento de imagens
            </li>
          </ul>
          <p className="mt-3">
            Não vendemos nem alugamos dados pessoais para terceiros.
            Subprocessadores acima são selecionados por compliance com LGPD e
            GDPR.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">5. Retenção</h2>
          <p>
            Dados de conta ativa: enquanto a assinatura existir. Após exclusão
            da conta: 30 dias em carência + remoção permanente. Dados fiscais
            (notas, comprovantes Stripe): 5 anos conforme legislação tributária
            brasileira.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">6. Seus direitos (LGPD art. 18)</h2>
          <p>Como titular, você pode a qualquer momento:</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>Confirmar se tratamos seus dados</li>
            <li>Acessar / exportar (botão em Configurações → Minha conta)</li>
            <li>Corrigir dados incorretos</li>
            <li>
              Pedir exclusão (mesma tela, com 30 dias de carência pra
              reativação)
            </li>
            <li>Solicitar portabilidade</li>
            <li>Revogar consentimento (ex: opt-out de WhatsApp marketing)</li>
            <li>Saber com quem compartilhamos seus dados (seção 4)</li>
          </ul>
          <p className="mt-3">
            Para qualquer pedido envie email para{" "}
            <a href="mailto:privacidade@lustro.app">privacidade@lustro.app</a>.
            Respondemos em até 15 dias.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">7. Segurança</h2>
          <p>
            HTTPS obrigatório em todas as conexões, senhas armazenadas com
            bcrypt cost 12, isolamento multi-tenant garantido por Row-Level
            Security no PostgreSQL. Tokens de reset/OTP têm TTL curto e são
            hasheados. Acesso a dados de produção restrito ao controlador.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">8. Crianças e adolescentes</h2>
          <p>
            O Lustro não é direcionado a menores de 18 anos como assinantes
            (dono de barbearia). Para clientes finais agendando serviços, a
            decisão de coletar dados de menores cabe ao dono da barbearia, que
            deve obter consentimento dos pais conforme art. 14 da LGPD.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">9. Cookies</h2>
          <p>
            Usamos cookies essenciais (sessão de login, CSRF) e analíticos
            anonimizados (Sentry). Não usamos cookies de marketing/tracking
            externo nem compartilhamos com redes de publicidade.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">10. Mudanças nesta política</h2>
          <p>
            Atualizações relevantes são comunicadas por email com 30 dias de
            antecedência. O histórico de versões fica disponível mediante
            solicitação.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">11. Encarregado (DPO)</h2>
          <p>
            Vinícius Gomes ·{" "}
            <a href="mailto:privacidade@lustro.app">privacidade@lustro.app</a>
          </p>
        </section>
      </article>
    </main>
  );
}
