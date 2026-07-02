# PRD — Loja de Produtos 3D Personalizáveis (MVP)

**Versão:** 1.0 · **Data:** 02/07/2026 · **Status:** Rascunho para validação
**Codinome do projeto:** *Forja3D* (nome provisório)

---

## 1. Visão Geral

### 1.1 O problema
Vender produtos impressos em 3D personalizados hoje exige um fluxo manual e cheio de atrito: o cliente vê o produto no Instagram, chama no direct, descreve a personalização por texto ("quero com o nome Thor, na cor azul"), o vendedor edita o modelo manualmente no Bambu Studio, envia foto para aprovação, negocia pagamento por Pix/link avulso e controla tudo em planilha ou no próprio chat. Esse processo é lento, gera erros de interpretação (nome escrito errado, cor diferente da esperada) e não escala.

### 1.2 A solução
Uma plataforma web onde o cliente, ao clicar em um link na bio ou nos stories do Instagram, abre uma **página de produto com visualizador 3D interativo em tempo real**. Ele personaliza o produto dentro de limites definidos pelo lojista (ex: texto do nome, cores, tamanho pré-definido), vê o resultado instantaneamente no modelo 3D, e finaliza a compra com pagamento via Stripe. O lojista recebe o pedido em um dashboard com todas as especificações prontas para produção.

### 1.3 Produto-piloto
O MVP será lançado com um único produto real: **Comedouro Pet Elevado com Nome Personalizado** (modelo já existente em 3MF, criado no Bambu Studio, com texto editável e variação de 15cm).

Parâmetros personalizáveis pelo cliente neste produto:
- **Nome do pet** (texto gravado no produto)
- **Cores** (paleta definida pelo lojista, limitada aos filamentos disponíveis)
- **Tamanho** (opções pré-definidas: ex. P / M-15cm / G)

### 1.4 O que este produto NÃO é (no MVP)
- Não é um marketplace multi-vendedor — é uma loja de um único lojista.
- Não é um editor 3D livre — o cliente só altera o que o lojista liberar.
- Não gera arquivos de impressão (G-code/3MF final) automaticamente — a produção continua manual no MVP.
- Não tem app nativo — é web mobile-first (o tráfego vem do Instagram, logo ~90% mobile).

---

## 2. Objetivos e Métricas de Sucesso

| Objetivo | Métrica (North Star em negrito) | Meta MVP (90 dias) |
|---|---|---|
| Converter tráfego do Instagram em pedidos | **Taxa de conversão link → pedido pago** | ≥ 2% |
| Provar o valor do visualizador 3D | % de visitantes que interagem com o 3D (rotação/personalização) | ≥ 40% |
| Eliminar erros de personalização | Pedidos com retrabalho por erro de especificação | 0 (spec vem estruturada) |
| Reduzir tempo operacional do lojista | Tempo entre pedido e início da produção | < 5 min para ler o pedido |
| Validar pagamento online | % de checkouts iniciados que completam pagamento | ≥ 60% |

---

## 3. Personas

**Cliente final — "Mariana, 28, tutora de pet"**
Chegou pelo Instagram, está no celular, quer ver como fica o nome do cachorro dela no produto *antes* de pagar. Tem paciência de ~2 minutos. Se o site demorar a carregar ou o 3D travar, ela desiste.

**Lojista/Admin — "Você, maker/empreendedor"**
Modela em Bambu Studio, tem impressoras 3D e filamentos de cores específicas. Precisa: (1) cadastrar produtos e definir *o que* o cliente pode mexer, (2) receber pedidos com especificação inequívoca, (3) receber o dinheiro via Stripe, (4) atualizar o status do pedido.

---

## 4. Jornada do Usuário (fluxo principal)

```
Instagram (bio/story) 
   → Link do produto 
   → Página com visualizador 3D carregando (< 3s para primeiro render)
   → Cliente gira/zoom no modelo
   → Digita o nome do pet → nome aparece NO MODELO em tempo real
   → Escolhe cor (preview instantâneo) e tamanho
   → "Finalizar pedido" → dados de contato + entrega
   → Checkout Stripe → pagamento aprovado
   → Tela de confirmação + e-mail com resumo (imagem do produto configurado)
   → Lojista recebe notificação → pedido aparece no dashboard
```

---

## 5. Requisitos Funcionais

### ÉPICO 1 — Visualizador 3D Interativo ⭐ (coração do MVP)

| ID | Requisito | Prioridade |
|---|---|---|
| V-01 | Renderizar o modelo 3D no navegador (mobile e desktop) com rotação orbital, zoom e pan por toque/mouse | P0 |
| V-02 | Aplicar o **texto digitado pelo cliente** no modelo em tempo real (< 500ms), na posição, fonte e curvatura definidas pelo lojista | P0 |
| V-03 | Trocar **cores** de partes específicas do modelo em tempo real, a partir de paleta restrita configurada pelo lojista | P0 |
| V-04 | Alternar entre **tamanhos pré-definidos** (variantes do modelo), exibindo dimensões reais (ex: "15cm de largura") | P0 |
| V-05 | Limite de caracteres e validação do texto (ex: 2–10 caracteres, sem emojis/caracteres não suportados pela fonte), com feedback claro | P0 |
| V-06 | Carregamento otimizado: modelo comprimido (glTF/GLB + Draco), placeholder/skeleton durante o load, meta < 3s em 4G | P0 |
| V-07 | Gerar **snapshot (imagem PNG)** da configuração final do cliente — usada na confirmação, no e-mail e no dashboard | P1 |
| V-08 | Iluminação e ambiente de estúdio (HDRI) para o produto parecer "de verdade", não um render cru | P1 |
| V-09 | Fallback: se WebGL não estiver disponível, exibir carrossel de fotos + formulário de personalização tradicional | P2 |

**Nota técnica:** o 3MF do Bambu Studio é o arquivo de *produção*. Para a web, cada produto/variante será convertido para **GLB otimizado** (pipeline de conversão faz parte do onboarding de produto, não do runtime).

### ÉPICO 2 — Catálogo e Motor de Personalização Configurável

| ID | Requisito | Prioridade |
|---|---|---|
| C-01 | Cadastro de produto pelo admin: nome, descrição, fotos, modelo 3D (GLB por variante), preço base | P0 |
| C-02 | **Schema de parâmetros por produto**: o admin define quais campos o cliente vê. Tipos suportados no MVP: `texto` (com limites e fonte), `cor` (paleta), `seleção` (opções pré-definidas, ex: tamanho) | P0 |
| C-03 | Cada opção pode ter **modificador de preço** (ex: tamanho G = +R$ 15) com preço total recalculado ao vivo | P0 |
| C-04 | URL amigável e única por produto (ex: `loja.com/p/comedouro-pet`) — é esse o link que vai no Instagram | P0 |
| C-05 | Meta tags Open Graph (imagem, título, preço) para o link ficar bonito quando compartilhado | P1 |
| C-06 | Produto pode ser ativado/desativado (rascunho vs. publicado) | P1 |

> **Por que schema configurável já no MVP?** Porque é o requisito explícito de futuro: novos produtos com parâmetros diferentes não podem exigir código novo. O comedouro é apenas a primeira instância do schema (`texto: nome do pet`, `cor`, `seleção: tamanho`).

### ÉPICO 3 — Pedido e Pagamento (Stripe)

| ID | Requisito | Prioridade |
|---|---|---|
| P-01 | Checkout com dados do cliente: nome, WhatsApp/telefone, e-mail, endereço de entrega | P0 |
| P-02 | Pagamento via **Stripe Checkout** (cartão; Pix se disponível na conta Stripe BR) | P0 |
| P-03 | O pedido persiste a **configuração completa e imutável**: valores de cada parâmetro + snapshot da imagem | P0 |
| P-04 | Webhook da Stripe confirma pagamento → pedido muda para "Pago" automaticamente | P0 |
| P-05 | E-mail de confirmação ao cliente com resumo, imagem do produto configurado e prazo estimado | P1 |
| P-06 | Cálculo de frete simplificado no MVP: valor fixo ou por região (tabela configurada pelo admin) | P1 |
| P-07 | Página de status do pedido acessível por link único (sem exigir cadastro/login do cliente) | P2 |

### ÉPICO 4 — Dashboard do Lojista

| ID | Requisito | Prioridade |
|---|---|---|
| D-01 | Login seguro do admin (único usuário no MVP) | P0 |
| D-02 | Lista de pedidos com: data, cliente, produto, **todos os parâmetros escolhidos**, imagem snapshot, valor, status do pagamento | P0 |
| D-03 | **Notificação de novo pedido pago** (e-mail no MVP; WhatsApp/push em fase 2) | P0 |
| D-04 | Fluxo de status do pedido: `Pago → Em produção → Enviado → Entregue` (+ código de rastreio opcional) | P1 |
| D-05 | Métricas básicas: vendas do mês (R$), nº de pedidos, produto mais vendido, funil visita → personalização → pedido | P1 |
| D-06 | Exportação de pedidos (CSV) | P2 |

### ÉPICO 5 — Geração Automática do Arquivo de Produção ⭐ (o diferencial: "abrir e imprimir")

**Visão:** ao confirmar o pagamento, o sistema gera automaticamente o **3MF de produção com a personalização já aplicada** (nome gravado, tamanho correto, cores mapeadas). O lojista baixa o arquivo do pedido, abre no Bambu Studio e imprime — sem editar nada.

| ID | Requisito | Prioridade |
|---|---|---|
| G-01 | Ao confirmar pagamento, disparar job assíncrono de geração do arquivo de produção (fila de processamento) | P1 |
| G-02 | Gerar geometria do texto no servidor com a **mesma fonte e parâmetros** usados no modelo original, e aplicá-la (união/gravação booleana) na âncora definida pelo lojista | P1 |
| G-03 | Selecionar automaticamente a malha base da variante de tamanho escolhida | P1 |
| G-04 | Validar a malha resultante (manifold, sem furos/auto-interseções) antes de disponibilizar; se falhar, marcar pedido para produção manual + alertar lojista | P1 |
| G-05 | Exportar 3MF de projeto compatível com Bambu Studio, com objetos nomeados e organizados | P1 |
| G-06 | Mapear cores escolhidas → filamentos/extrusoras no 3MF (paleta do lojista vinculada aos filamentos reais do AMS) | P2 |
| G-07 | Botão "Baixar arquivo de produção" no pedido do dashboard + link no e-mail de notificação | P1 |
| G-08 | Reprocessar arquivo sob demanda (ex: após correção de dado do pedido) | P2 |

**Maturidade escalonada (para não travar o lançamento):**

| Nível | O que o lojista faz | Quando |
|---|---|---|
| **M0 — Manual guiado** | Lê a spec no dashboard e edita o 3MF base no Bambu Studio (Text Tool) | Lançamento |
| **M1 — Semi-automático** | Baixa o 3MF já com nome + tamanho aplicados; ajusta cor no slicer (~30s) | Fase 1.5 (logo após o lançamento) |
| **M2 — Abrir e imprimir** | Baixa o 3MF completo com cores/filamentos mapeados; abre → fatia → imprime | Fase 2 |

> **Por que não M2 direto no lançamento?** A geração de malha por código é o componente de maior risco técnico do projeto (booleanas de texto podem gerar geometria inválida; mapeamento de cor no formato Bambu tem particularidades de configuração). Escalonar garante que a loja fatura desde a semana 6 enquanto o pipeline amadurece com pedidos reais — e cada nível já reduz drasticamente seu trabalho manual.

---

## 6. Requisitos Não-Funcionais

- **Mobile-first obrigatório:** todo o fluxo (incluindo o 3D) projetado primeiro para tela de celular e navegador in-app do Instagram.
- **Performance:** LCP < 3s em 4G; modelo 3D ≤ 2–4 MB por variante; 30+ fps na rotação em celulares intermediários.
- **Compatibilidade:** Chrome/Safari mobile atuais + navegador embutido do Instagram (crítico e traiçoeiro — testar cedo).
- **Segurança:** pagamentos 100% na Stripe (nenhum dado de cartão toca o servidor); HTTPS; validação server-side dos parâmetros e do preço (o preço final é sempre recalculado no backend — nunca confiar no valor vindo do front).
- **LGPD:** coleta mínima de dados, política de privacidade, consentimento no checkout.
- **Idioma/moeda:** pt-BR e BRL no MVP.

---

## 7. Stack Sugerida (referência, não imposição)

| Camada | Sugestão | Justificativa |
|---|---|---|
| Frontend | Next.js + React Three Fiber (Three.js) + drei | Padrão de mercado para 3D na web; SSR ajuda no OG/SEO |
| Texto 3D | Geometria de texto gerada em runtime (troika-three-text ou TextGeometry) posicionada via âncoras definidas no modelo | Personalização instantânea sem reprocessar o mesh |
| Formatos 3D | GLB + compressão Draco/Meshopt; pipeline 3MF → GLB no onboarding | Peso mínimo, carregamento rápido |
| Backend | Next.js API routes ou Node (NestJS/Fastify) | Simplicidade para um dev/time pequeno |
| Banco | PostgreSQL (produtos, schema de parâmetros em JSONB, pedidos) | JSONB casa perfeitamente com parâmetros dinâmicos |
| Pagamentos | Stripe Checkout + Webhooks | Requisito do projeto |
| Infra | Vercel + storage (S3/R2) para modelos e snapshots | Deploy rápido, CDN global para os GLB |
| E-mail | Resend / SendGrid | Confirmações e notificações |
| Geração de produção (Épico 5) | Worker Python (trimesh + manifold3d) ou Blender headless, em fila (ex: worker próprio/Railway) para gerar o 3MF do pedido | Booleanas robustas de texto + exportação 3MF; roda fora do request HTTP |

---

## 8. Modelo de Dados (essência)

```
Product
 ├─ id, slug, name, description, base_price, status
 ├─ variants[]  (ex: tamanho 15cm) → { label, model_url(GLB), price_delta, dimensions }
 └─ param_schema (JSONB) — ex:
     [
       { key:"pet_name", type:"text",  label:"Nome do pet",
         min:2, max:10, font:"Poppins-Bold", anchor:"name_slot" },
       { key:"color",    type:"color", label:"Cor",
         options:[{label:"Azul",hex:"#1E5AA8"},{label:"Rosa",hex:"#E85D9A"}, ...],
         targets:["base_mesh"] },
       { key:"size",     type:"select", label:"Tamanho",
         options:[{label:"M — 15cm", variant_ref:"15cm", price_delta:0}, ...] }
     ]

Order
 ├─ id, created_at, status, stripe_session_id, total_amount
 ├─ customer { name, email, phone, address }
 ├─ product_ref + configuration (JSONB imutável: {pet_name:"THOR", color:"#1E5AA8", size:"15cm"})
 └─ snapshot_url (PNG da configuração)
```

---

## 9. Escopo — Dentro vs. Fora

**✅ Dentro do MVP (lançamento — nível M0)**
Visualizador 3D com texto/cor/tamanho ao vivo · 1 produto real (comedouro pet) · schema de parâmetros configurável · checkout Stripe · dashboard com pedidos + notificação por e-mail · snapshot da configuração · métricas básicas · arquitetura já preparada para o Épico 5 (âncoras de texto, fontes e malhas por variante armazenadas desde o dia 1).

**🎯 Fase 1.5 (prioridade máxima pós-lançamento — níveis M1 → M2)**
Geração automática do 3MF de produção: primeiro com nome + tamanho aplicados (M1), depois com cores/filamentos mapeados (M2) — o objetivo final "**abrir e imprimir**".

**❌ Fora do escopo (backlog fase 2+)**
Geração de G-code fatiado por impressora específica · notificação por WhatsApp · cupons e promoções · contas/login de cliente · múltiplos lojistas · AR ("veja na sua casa") · upload de imagem/logo pelo cliente · cálculo de frete via Correios/Melhor Envio em tempo real · avaliações de clientes.

---

## 10. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| 3D pesado/travando no navegador in-app do Instagram | Alto (mata a conversão) | Otimização agressiva de malha, teste no in-app browser desde a semana 1, fallback V-09 |
| Fonte/curvatura do texto na web ≠ resultado impresso | Médio (frustração do cliente) | Usar a mesma fonte do Bambu Studio; disclaimer visual "representação aproximada"; snapshot aprovado pelo cliente |
| Cliente digita nome com caracteres não imprimíveis | Médio | Validação V-05 com whitelist de caracteres da fonte |
| Fraude/manipulação de preço no front | Alto | Recalcular preço no backend a partir do schema (NFR de segurança) |
| Pix indisponível na Stripe para a conta | Médio (Pix domina no BR) | Verificar elegibilidade cedo; plano B: cartão no MVP, Pix via fase 2 |
| Booleana de texto gera malha inválida/não imprimível (Épico 5) | Alto (produto com defeito) | Validação G-04 obrigatória (manifold check) + fallback automático para produção manual + biblioteca robusta (manifold3d) |
| Divergência entre o 3D visto pelo cliente e o 3MF gerado | Médio (cliente recebe algo diferente) | Mesma fonte, mesmas âncoras e mesmos parâmetros compartilhados entre visualizador e gerador (fonte única de verdade no schema) |

---

## 11. Fases e Marcos

**MVP — 6 semanas até faturar:**

1. **Semana 1–2 — Fundação do 3D:** pipeline 3MF→GLB do comedouro; visualizador com rotação/zoom; texto dinâmico funcionando no modelo. *Já definindo âncoras e fontes no formato que o Épico 5 vai consumir.*
2. **Semana 3 — Personalização completa:** cores, tamanhos, preço dinâmico, validações, snapshot.
3. **Semana 4 — Comércio:** checkout, Stripe, webhooks, e-mails.
4. **Semana 5 — Dashboard:** pedidos, notificação, status.
5. **Semana 6 — Polimento e teste real:** teste no in-app do Instagram, performance, beta com 5–10 clientes reais, ajustes, **lançamento (nível M0)**.

**Fase 1.5 — Semanas 7–10 ("abrir e imprimir"):**

6. **Semana 7–8 — Nível M1:** worker de geração; texto booleano aplicado à variante correta; validação de malha; 3MF baixável no pedido. *Testar imprimindo pedidos reais em paralelo com o processo manual até confiar 100%.*
7. **Semana 9–10 — Nível M2:** mapeamento de cores → filamentos no 3MF; cadastro dos filamentos do lojista vinculado à paleta de cada produto. **Meta final: abrir → fatiar → imprimir.**

---

## 12. Critérios de Aceite (Definition of Done)

**MVP (lançamento):**
- [ ] Um cliente consegue, **pelo celular e vindo do Instagram**, personalizar o comedouro (nome + cor + tamanho), ver o resultado em 3D e pagar — sem falar com ninguém.
- [ ] O nome digitado aparece no modelo 3D em menos de meio segundo.
- [ ] O pedido pago aparece no dashboard com 100% da especificação + imagem, e o lojista é notificado por e-mail.
- [ ] Cadastrar um **segundo produto com parâmetros diferentes** não exige alteração de código — apenas configuração de schema.
- [ ] Preço cobrado na Stripe = preço recalculado no servidor, sempre.

**Fase 1.5 (visão completa):**
- [ ] Pedido pago gera automaticamente um 3MF que abre no Bambu Studio **sem nenhuma edição** e imprime o produto exatamente como o cliente viu na tela (nome, tamanho e cores).
- [ ] Se a geração falhar por qualquer motivo, o pedido cai em produção manual com alerta — nenhum pedido fica travado.
- [ ] O que o cliente vê no visualizador e o que sai da impressora são geometricamente idênticos (mesma fonte, mesma posição, mesma escala).

---

*Documento vivo — próxima revisão após validação técnica do pipeline 3MF → GLB, teste do visualizador no navegador in-app do Instagram e prova de conceito da geração booleana de texto (Épico 5).*
