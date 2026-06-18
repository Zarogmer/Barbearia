import Link from "next/link";

export const metadata = {
  title: "Termos de uso — Lustro",
};

export default function TermosPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href="/"
        className="text-xs text-muted-foreground hover:underline"
      >
        ← Voltar
      </Link>
      <h1 className="mt-4 mb-2 text-3xl font-bold tracking-tight">
        Termos de uso
      </h1>
      <p className="mb-8 text-xs text-muted-foreground">
        Última atualização: 17 de junho de 2026
      </p>

      <article className="prose prose-sm max-w-none space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold">1. Quem somos</h2>
          <p>
            O Lustro é uma plataforma de agendamento online para barbearias e
            salões de beleza, operada por <strong>Vinícius Gomes</strong>{" "}
            (&quot;Lustro&quot;, &quot;nós&quot;). Estes termos regem o uso da
            plataforma por donos de barbearia (assinantes) e por clientes que
            agendam serviços pelas vitrines públicas.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">2. Conta e responsabilidade</h2>
          <p>
            Ao criar uma conta, você é responsável por manter suas credenciais
            seguras e por toda atividade feita pela sua conta. Apenas pessoas
            físicas com idade igual ou superior a 18 anos podem ser donos de
            uma organização.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">3. Trial e assinatura</h2>
          <p>
            Novas barbearias têm 14 dias de trial gratuito a partir do
            cadastro. Após esse período, o acesso ao painel administrativo só é
            mantido com uma assinatura ativa. Cobranças são processadas via
            Stripe e podem ser canceladas a qualquer momento pelo portal de
            gerenciamento.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">4. Uso aceitável</h2>
          <p>É proibido usar a plataforma para:</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>Enviar spam ou mensagens não autorizadas pelos clientes finais</li>
            <li>Coletar ou expor dados de terceiros sem consentimento</li>
            <li>Tentar burlar limites técnicos, contadores ou bloqueios</li>
            <li>Distribuir malware ou conteúdo ilegal</li>
            <li>Violar direitos autorais, de marca ou de imagem</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">5. Conteúdo do cliente</h2>
          <p>
            Você mantém todos os direitos sobre dados que envia (clientes,
            agendamentos, fotos, mensagens). Concede ao Lustro licença limitada
            para armazenar, processar e exibir esse conteúdo apenas no que for
            necessário para prestar o serviço.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">6. WhatsApp</h2>
          <p>
            A integração com WhatsApp usa a Evolution API e depende do número
            que você conecta. O Lustro não é responsável por bloqueios feitos
            pelo WhatsApp/Meta ao seu número em caso de envio massivo ou
            conteúdo abusivo. Use com bom senso — o WhatsApp não é um SMS
            transacional.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">7. Suspensão e exclusão</h2>
          <p>
            Podemos suspender ou encerrar contas que violem estes termos. Você
            pode pedir a exclusão da sua conta a qualquer momento em{" "}
            <strong>Configurações → Minha conta</strong>. A exclusão tem 30
            dias de carência — durante esse período os dados ficam preservados
            para reativação; depois são removidos definitivamente.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">8. Disponibilidade</h2>
          <p>
            Trabalhamos pra manter o serviço sempre disponível, mas não
            garantimos uptime contínuo. Manutenções programadas, falhas de
            terceiros (Vercel, Neon/Railway, Stripe, Evolution) ou imprevistos
            podem causar indisponibilidade temporária.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">9. Limitação de responsabilidade</h2>
          <p>
            O Lustro é fornecido &quot;como está&quot;. Na máxima extensão
            permitida pela lei brasileira, não somos responsáveis por lucros
            cessantes, danos indiretos ou perda de dados decorrentes do uso da
            plataforma. Nossa responsabilidade máxima por qualquer reclamação
            está limitada ao valor pago por você nos últimos 12 meses.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">10. Mudanças nos termos</h2>
          <p>
            Podemos atualizar estes termos. Mudanças relevantes serão
            comunicadas por email com 30 dias de antecedência. Continuar usando
            a plataforma após uma mudança significa aceitar a nova versão.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">11. Foro</h2>
          <p>
            Estes termos são regidos pela legislação brasileira. Fica eleito o
            foro da comarca de São Paulo/SP para qualquer disputa.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">12. Contato</h2>
          <p>
            Dúvidas: <a href="mailto:contato@lustro.app">contato@lustro.app</a>
          </p>
        </section>
      </article>
    </main>
  );
}
