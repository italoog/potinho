export const metadata = { title: "Política de Privacidade — potinho" };

/** LGPD (NFR §6, 7.3 AC4): coleta mínima, finalidade explícita, conta opcional e retenção fiscal. */
export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-zinc-50 py-10 pl-20 pr-4">
      <article className="prose prose-zinc mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-sm">
        <h1>Política de Privacidade</h1>
        <p>
          A potinho coleta apenas os dados necessários para processar e entregar o seu pedido:
          nome, e-mail, telefone e endereço de entrega, além da personalização escolhida.
        </p>
        <h2>Como usamos seus dados</h2>
        <ul>
          <li>Produzir e enviar o produto personalizado que você comprou;</li>
          <li>Enviar a confirmação e atualizações de status do pedido por e-mail;</li>
          <li>Atender solicitações de suporte.</li>
        </ul>
        <h2>Conta (opcional)</h2>
        <p>
          Você pode comprar sem criar conta — o pedido fica acessível pelo link de acompanhamento
          enviado por e-mail. Se preferir, pode criar uma conta (login por link mágico, sem senha)
          pra ver todos os seus pedidos num só lugar. Pedidos feitos com o mesmo e-mail antes da
          conta existir são vinculados automaticamente no primeiro login.
        </p>
        <h2>O que NÃO fazemos</h2>
        <ul>
          <li>Não vendemos nem compartilhamos seus dados com terceiros para marketing;</li>
          <li>Não armazenamos dados de cartão — o pagamento é processado integralmente pelo Mercado Pago.</li>
        </ul>
        <h2>Seus direitos (LGPD)</h2>
        <p>
          Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento
          respondendo ao e-mail de confirmação do pedido, ou pela própria conta (&ldquo;excluir
          minha conta&rdquo;). Ao excluir a conta, seus dados de login (nome e e-mail) são
          anonimizados e os pedidos deixam de ficar vinculados a uma conta. Os dados do pedido em
          si (endereço, valores, itens) permanecem armazenados mesmo após a exclusão da conta,
          pelo prazo exigido pela legislação fiscal e contábil brasileira.
        </p>
      </article>
    </main>
  );
}
