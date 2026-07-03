export const metadata = { title: "Política de Privacidade — Forja3D" };

/** LGPD (NFR §6): coleta mínima, finalidade explícita. */
export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10">
      <article className="prose prose-zinc mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-sm">
        <h1>Política de Privacidade</h1>
        <p>
          A Forja3D coleta apenas os dados necessários para processar e entregar o seu pedido:
          nome, e-mail, telefone e endereço de entrega, além da personalização escolhida.
        </p>
        <h2>Como usamos seus dados</h2>
        <ul>
          <li>Produzir e enviar o produto personalizado que você comprou;</li>
          <li>Enviar a confirmação e atualizações de status do pedido por e-mail;</li>
          <li>Atender solicitações de suporte.</li>
        </ul>
        <h2>O que NÃO fazemos</h2>
        <ul>
          <li>Não vendemos nem compartilhamos seus dados com terceiros para marketing;</li>
          <li>Não armazenamos dados de cartão — o pagamento é processado integralmente pela Stripe.</li>
        </ul>
        <h2>Seus direitos (LGPD)</h2>
        <p>
          Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento
          respondendo ao e-mail de confirmação do pedido.
        </p>
      </article>
    </main>
  );
}
