export const metadata = { title: "política de privacidade — potinho" };

/** LGPD (NFR §6, 7.3 AC4): coleta mínima, finalidade explícita, conta opcional e retenção fiscal. */
export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-potinho-fundo px-4 pb-10 pt-24 font-[family-name:var(--font-poppins)] text-potinho-texto sm:pb-16">
      <article className="mx-auto flex max-w-2xl flex-col gap-6 rounded-3xl bg-white p-6 shadow-potinho-card sm:p-8">
        <h1 className="text-2xl font-bold lowercase text-potinho-chocolate sm:text-3xl">
          política de privacidade
        </h1>
        <p className="leading-relaxed text-potinho-texto">
          A potinho coleta apenas os dados necessários para processar e entregar o seu pedido:
          nome, e-mail, telefone e endereço de entrega, além da personalização escolhida.
        </p>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">
            como usamos seus dados
          </h2>
          <ul className="flex flex-col gap-2 leading-relaxed text-potinho-texto">
            <li>produzir e enviar o produto personalizado que você comprou;</li>
            <li>enviar a confirmação e atualizações de status do pedido por e-mail;</li>
            <li>atender solicitações de suporte.</li>
          </ul>
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
            o que não fazemos
          </h2>
          <ul className="flex flex-col gap-2 leading-relaxed text-potinho-texto">
            <li>não vendemos nem compartilhamos seus dados com terceiros para marketing;</li>
            <li>não armazenamos dados de cartão — o pagamento é processado integralmente pelo Mercado Pago.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">
            seus direitos (LGPD)
          </h2>
          <p className="leading-relaxed text-potinho-texto">
            Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento
            respondendo ao e-mail de confirmação do pedido, ou pela própria conta (&ldquo;excluir
            minha conta&rdquo;). Ao excluir a conta, seus dados de login (nome e e-mail) são
            anonimizados e os pedidos deixam de ficar vinculados a uma conta. Os dados do pedido em
            si (endereço, valores, itens) permanecem armazenados mesmo após a exclusão da conta,
            pelo prazo exigido pela legislação fiscal e contábil brasileira.
          </p>
        </section>
      </article>
    </main>
  );
}
