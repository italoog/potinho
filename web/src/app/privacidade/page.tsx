export const metadata = { title: "política de privacidade — potinho" };

const PRIVACY_CONTACT_EMAIL = "contato@potinho.com.br";
/** Data da última revisão de conteúdo desta política — atualize ao editar o texto abaixo. */
const LAST_UPDATED = "agosto de 2026";

/**
 * LGPD (NFR §6, 7.3 AC4; Lei 13.709/2018): coleta mínima, finalidade e base legal explícitas,
 * lista de operadores/terceiros (nunca "não compartilhamos" genérico — isso ficaria falso no dia
 * em que qualquer integração nova entrar, ex.: Meta Pixel), direitos do titular (art. 18) e canal
 * de contato do controlador. Sempre que uma integração nova tratar dado pessoal (novo gateway de
 * pagamento, pixel, ferramenta de e-mail, provider de storage), esta página tem que ser
 * atualizada no mesmo PR — decisão consciente, não delegar pra "depois".
 */
export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-potinho-fundo px-4 pb-10 pt-24 font-[family-name:var(--font-poppins)] text-potinho-texto sm:pb-16">
      <article className="mx-auto flex max-w-2xl flex-col gap-6 rounded-3xl bg-white p-6 shadow-potinho-card sm:p-8">
        <h1 className="text-2xl font-bold lowercase text-potinho-chocolate sm:text-3xl">
          política de privacidade
        </h1>
        <p className="leading-relaxed text-potinho-texto">
          A potinho é a controladora dos seus dados pessoais nesta loja. Coletamos apenas o
          necessário para processar e entregar o seu pedido — nome, e-mail, telefone, CPF/CNPJ e
          endereço de entrega, além da personalização escolhida (nome do pet, cor, tamanho) — com
          base na execução do contrato de compra e venda e no cumprimento de obrigações legais
          (fiscais e do Código de Defesa do Consumidor), conforme o art. 7º, incisos II e V, da Lei
          Geral de Proteção de Dados (Lei 13.709/2018).
        </p>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">
            como usamos seus dados
          </h2>
          <ul className="flex flex-col gap-2 leading-relaxed text-potinho-texto">
            <li>produzir e enviar o produto personalizado que você comprou;</li>
            <li>calcular o frete e emitir a etiqueta de envio com a transportadora;</li>
            <li>processar o pagamento e emitir os documentos fiscais exigidos por lei;</li>
            <li>enviar a confirmação e atualizações de status do pedido por e-mail;</li>
            <li>atender solicitações de suporte;</li>
            <li>medir o desempenho dos nossos anúncios (ver &ldquo;cookies e pixels&rdquo; abaixo).</li>
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">
            com quem compartilhamos
          </h2>
          <p className="leading-relaxed text-potinho-texto">
            Nunca vendemos seus dados. Compartilhamos apenas o estritamente necessário com
            prestadores que nos ajudam a operar a loja, cada um tratando o dado só para a
            finalidade abaixo:
          </p>
          <ul className="flex flex-col gap-2 leading-relaxed text-potinho-texto">
            <li>
              <strong className="font-semibold">Mercado Pago</strong> — processa o pagamento; não
              temos acesso aos dados completos do seu cartão;
            </li>
            <li>
              <strong className="font-semibold">Correios / SuperFrete</strong> — recebem nome,
              endereço e telefone para calcular o frete e entregar o pedido;
            </li>
            <li>
              <strong className="font-semibold">Resend</strong> — envia os e-mails transacionais
              (confirmação de pedido, link de acesso à conta);
            </li>
            <li>
              <strong className="font-semibold">Vercel e Neon</strong> — hospedam o site e o banco
              de dados;
            </li>
            <li>
              <strong className="font-semibold">Meta (Facebook/Instagram)</strong> — recebe eventos
              de navegação e compra via Meta Pixel, para medir e otimizar nossos anúncios.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">
            cookies e pixels de rastreamento
          </h2>
          <p className="leading-relaxed text-potinho-texto">
            Usamos o Meta Pixel para entender quais páginas você visita, quais produtos vê e quando
            finaliza uma compra — isso nos ajuda a medir e melhorar os anúncios que você pode ver no
            Facebook/Instagram. Esses eventos são enviados à Meta Platforms, que os trata segundo a{" "}
            <a
              href="https://www.facebook.com/privacy/policy/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              própria política de privacidade
            </a>{" "}
            dela. Não usamos essa ferramenta para nenhuma outra finalidade além de publicidade.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">
            conta (opcional)
          </h2>
          <p className="leading-relaxed text-potinho-texto">
            Você pode comprar sem criar conta — o pedido fica acessível pelo link de acompanhamento
            enviado por e-mail. Se preferir, pode criar uma conta (login por link mágico, sem senha)
            pra ver todos os seus pedidos num só lugar. Pedidos feitos com o mesmo e-mail antes da
            conta existir são vinculados automaticamente no primeiro login.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">
            não armazenamos dados de cartão
          </h2>
          <p className="leading-relaxed text-potinho-texto">
            O pagamento é processado integralmente pelo Mercado Pago — não guardamos número de
            cartão, CVV ou senha em nenhum momento.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">
            por quanto tempo guardamos seus dados
          </h2>
          <p className="leading-relaxed text-potinho-texto">
            Os dados do pedido em si (nome, endereço, itens comprados, valores) são mantidos pelo
            prazo mínimo exigido pela legislação fiscal, cível e de defesa do consumidor brasileira
            — normalmente até 5 anos após a compra. Dados de navegação enviados à Meta via Pixel
            seguem o prazo de retenção da própria Meta. Você pode pedir a antecipação da exclusão
            dos dados que não têm retenção legal obrigatória a qualquer momento (ver
            &ldquo;seus direitos&rdquo; abaixo).
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">
            seus direitos (LGPD)
          </h2>
          <p className="leading-relaxed text-potinho-texto">
            Conforme o art. 18 da LGPD, você pode solicitar, a qualquer momento:
          </p>
          <ul className="flex flex-col gap-2 leading-relaxed text-potinho-texto">
            <li>confirmação de que tratamos seus dados, e acesso a eles;</li>
            <li>correção de dados incompletos, inexatos ou desatualizados;</li>
            <li>anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei;</li>
            <li>portabilidade dos seus dados a outro fornecedor;</li>
            <li>eliminação dos dados tratados com o seu consentimento (ressalvado o que a lei exige manter, ex.: dados fiscais);</li>
            <li>informação sobre com quem compartilhamos seus dados (ver &ldquo;com quem compartilhamos&rdquo; acima);</li>
            <li>revogação do consentimento, quando o tratamento depender dele.</li>
          </ul>
          <p className="leading-relaxed text-potinho-texto">
            Pela própria conta, você pode excluir a conta a qualquer momento (&ldquo;excluir minha
            conta&rdquo;) — os dados de login (nome e e-mail) são anonimizados e os pedidos deixam
            de ficar vinculados a uma conta, sem apagar o histórico do pedido em si (retido pelo
            prazo legal citado acima). Para qualquer outro pedido relacionado aos seus dados,
            escreva para{" "}
            <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`} className="underline">
              {PRIVACY_CONTACT_EMAIL}
            </a>{" "}
            — respondemos em até 15 dias, prazo do art. 19 da LGPD.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">
            segurança
          </h2>
          <p className="leading-relaxed text-potinho-texto">
            Adotamos medidas técnicas e administrativas razoáveis para proteger seus dados contra
            acesso não autorizado, perda ou vazamento — conexão criptografada (HTTPS) em todo o
            site, senha de acesso ao painel administrativo restrita à equipe, e nenhum dado de
            cartão passa pelos nossos servidores.
          </p>
        </section>

        <p className="text-xs text-potinho-texto/50">
          esta política pode ser atualizada para refletir mudanças na loja ou na legislação —
          última atualização: {LAST_UPDATED}.
        </p>
      </article>
    </main>
  );
}
