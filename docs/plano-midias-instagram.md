# potinho — Plano de Mídias para Instagram, Meta Ads e Vídeo Curto

**Criado:** 2026-07-19
**Objetivo:** produzir criativos (feed + story) para @potinho.pet e para tráfego pago no Meta, com a copy dirigindo a criação.
**Como usar:** este arquivo é o prompt de execução. Abra uma sessão, aponte para ele e siga as fases **na ordem**. Não pule os gates.

---

## 0. Regras inegociáveis

Estas regras valem para toda a execução. Se qualquer fase conflitar com elas, a regra vence.

1. **A copy manda.** A skill `especialista-light-copy-ladeira` decide o ângulo, o gancho, o roteiro e **se aparece gente ou não** nos vídeos. Nenhum roteiro visual é escrito antes da copy existir.
2. **Emoção converte, preço não.** O eixo é o vínculo tutor↔pet e o produto único com o nome dele. **Não** abrir com preço, desconto ou "promoção".
3. **Frete grátis a partir de 2 peças não entra em vídeo nenhum.** Zero menção em roteiro, texto na tela, locução ou legenda de post. Fica restrito ao primary text do gerenciador do Meta, entre parênteses, no fim. Pode ser descontinuado a qualquer momento — não pode sustentar nenhum criativo. (A barra de oferta no site é decisão futura do dono, fora do escopo deste plano.)
4. **Sem culpa.** Nenhuma linha pode fazer o tutor se sentir mau dono. Nada de negligência, reparação, coitadinho ou "ele merecia melhor". O pet da marca é privilegiado, não vítima. Quem se sente acusado não compra — se defende.
5. **Nenhum crédito é gasto antes dos dois gates de aprovação** (Fase 1 e Fase 2).
6. **Fidelidade ao produto real.** O comedouro gerado tem que ser reconhecível como o produto das fotos em `docs/fotos-reais-comedouros/`. Ver a Bíblia Visual (Fase 3.1) — ela entra em **todo** prompt de geração.

---

## 1. Contexto travado

### 1.1 Produto (extraído das fotos reais)

Comedouro elevado impresso em 3D, formato de cilindro/balde com base cônica levemente alargada.

| Elemento | Descrição verificada |
|---|---|
| Estrutura | Corpo cilíndrico em duas peças/duas cores (ex.: topo branco fosco + base preta brilhante), separadas por uma linha diagonal em "V" invertido |
| Tigela | Inox removível, encaixada no topo, borda espelhada visível |
| Personalização | Nome do pet em **alto-relevo**, letras maiúsculas espaçadas, na face frontal (ex.: `CHARLIE`, `ZEUS`) |
| Detalhe | Duas aberturas ovais laterais (alças/vazados) |
| Acabamento | Camadas finas de impressão 3D visíveis de perto — isso é característica artesanal, não defeito. Vale mostrar no macro. |
| Tamanhos | P (5cm), M (10cm), G (15cm) |
| Preço G | R$ 149,00 (**não usar como gancho** — ver regra 2) |

### 1.2 Marca

Fonte: `.claude/skills/potinho-design/SKILL.md`

- **Voz:** afetuosa, caseira, direta. Fala com o tutor sobre "ele" (o pet).
- **lowercase é identidade.** A marca é sempre `potinho`, minúsculo. **Exceção:** o NOME DO PET é sempre MAIÚSCULO E ESPAÇADO — é referência direta à gravação na peça. Essa regra vale para legendas, textos na tela dos vídeos e miniaturas.
- **Paleta (para overlays, cartelas e grafismos):**
  | Papel | Hex |
  |---|---|
  | Chocolate (primária) | `#5A4032` |
  | Bege | `#E8D9C8` |
  | Fundo | `#FAF8F5` |
  | Cinza | `#B7AEA5` |
  | Texto | `#2D2D2D` |
- **Tipografia:** Poppins (400–700). Cantos muito arredondados. Sombras em tom chocolate, **nunca preto puro**.
- **Emoji:** no máximo um 🐾, só em CTA.

### 1.3 Assets disponíveis

| Asset | Caminho | Uso |
|---|---|---|
| Fotos reais do produto | `docs/fotos-reais-comedouros/` (~45 arquivos) | Referência de identidade nos prompts **e** matéria-prima dos posts estáticos de feed |
| Logo (fundo transparente) | `docs/logo/ChatGPT_Image_19_de_jul._de_2026__16_15_00-removebg-preview.png` | Selo discreto nos vídeos, canto inferior |
| Logo (versões com fundo) | `docs/logo/ChatGPT Image *.png` | Avatar, cartela final |
| Prompt do site | `docs/potinho-prompt-cinematico.md` | Referência de linguagem visual já aprovada pelo dono |
| Economia do produto | `docs/economia-frete-precificacao.md` | Contexto de margem (não vira copy) |

**Fotos com melhor aproveitamento** (verificadas): `IMG_20260529_144357.jpg` (produto branco/preto com CHARLIE, granito escuro — melhor foto de identidade) e `IMG_20260501_190346.jpg` (produto dourado com ZEUS na impressora, luz azul — ótima para o ângulo "feito à mão pra ele").

### 1.4 Canais e destinos

| Canal | Formato | Destino |
|---|---|---|
| Feed Instagram | 4:5 e 1:1 | Orgânico |
| Stories/Reels Instagram | 9:16 | **Teste A/B: metade pro site `potinho.pet`, metade pro perfil `@potinho.pet`** |
| Meta Ads (FB + IG) | 9:16 e 1:1 | Mesmo teste A/B acima |
| TikTok / YouTube Shorts | 9:16 | Reaproveitamento do mesmo master 9:16 |

O teste de destino é decisão do dono e **não muda o criativo** — muda só o CTA final e o link. Cada roteiro de story deve prever **duas variações de cartela final**: uma para o site e uma para o perfil. Nota: em anúncio pago de story, quem leva o clique é o **botão nativo do Meta** ("Saiba mais"), não a cartela — a cartela reforça, o botão converte. "Arrasta pra cima" não existe mais; no orgânico o link vai via sticker de link.

---

## 2. Fase 1 — Copy (a skill decide tudo)

**Executor:** skill `especialista-light-copy-ladeira`
**Saída:** `docs/copy-anuncios-potinho.md`
**Gate:** aprovação explícita do dono antes de seguir.

### Briefing a entregar para a skill

> Produto: comedouro elevado impresso em 3D, personalizado com o nome do pet em alto-relevo, tigela de inox removível, duas cores combináveis, três tamanhos. Marca: potinho (@potinho.pet, potinho.pet). Feito peça por peça, sob encomenda.
>
> Público: tutores de cachorro e gato que tratam o pet como membro da família, ativos no Instagram, que já compram coisas "desnecessárias" pro pet por afeto.
>
> Eixo obrigatório: **emoção**. O que se vende é o pet ter uma coisa que é dele, com o nome dele, que ninguém mais tem. Não vender preço, não vender desconto, não abrir com oferta.
>
> Benefício secundário (usar só se fizer sentido, nunca como gancho, pode sumir no futuro): frete grátis a partir de 2 comedouros.
>
> Canais: Meta Ads (Instagram + Facebook), tráfego frio. Formato principal: story/reels de 9 a 15 segundos. Também precisa de legendas para 9 posts de feed orgânico.
>
> Restrições de marca: pt-BR informal ("pra", "pro" liberados). A marca é sempre minúscula: `potinho`. O nome do pet é sempre MAIÚSCULO E ESPAÇADO. No máximo um 🐾, só em CTA.

### O que a skill deve devolver

- [ ] **Ângulo central** e a razão dele (qual dor/desejo do tutor está sendo acionado)
- [ ] **3 ganchos distintos** para os 3 primeiros segundos do story — cada um testável separadamente no Meta
- [ ] **3 roteiros completos** de story (9–15s), com o texto falado ou escrito **segundo a segundo**
- [ ] **Decisão explícita: aparece pessoa ou não?** Se sim, quem é, o que faz e por quê. Se não, o que carrega a emoção no lugar. *Esta decisão é da copy e vincula toda a Fase 3.*
- [ ] **CTA em duas versões** por roteiro (site / perfil)
- [ ] **9 legendas** de feed, cada uma amarrada a um dos posts da grade da Fase 4
- [ ] **Primary text + headline** para o gerenciador de anúncios do Meta

> ⛔ **GATE 1.** Apresentar a copy ao dono. Só avançar com aprovação. Se ele pedir ajuste, revisar dentro da própria skill de copy — não "consertar" copy fora dela.

---

## 3. Fase 2 — Roteiro visual (derivado da copy aprovada)

**Saída:** `docs/storyboard-potinho.md`
**Gate:** aprovação explícita do dono antes de gastar qualquer crédito.

Para cada roteiro aprovado na Fase 1, escrever um storyboard com:

| Campo | Conteúdo |
|---|---|
| Plano a plano | 1 linha por corte, com duração em segundos |
| Prompt Higgsfield | O prompt literal que será enviado, já com a Bíblia Visual embutida |
| Modelo e parâmetros | Modelo, aspect ratio, duração, resolução, áudio on/off |
| Texto na tela | Frase exata (vinda da copy), posição, momento de entrada |
| Áudio | Trilha, locução ou silêncio |
| Custo estimado | Em créditos (ver 3.2) |

> ⛔ **GATE 2.** Apresentar o storyboard + custo total estimado. Só gerar com aprovação.

### 3.1 Bíblia Visual — bloco obrigatório em todo prompt

Copiar este bloco dentro de **todo** prompt de imagem ou vídeo, sem editar a descrição do produto:

```
PRODUTO (fidelidade obrigatória): comedouro pet elevado impresso em 3D. Corpo
cilíndrico de duas peças em duas cores foscas, divididas por uma linha diagonal
em "V" invertido. Tigela de aço inox removível encaixada no topo, com borda
espelhada visível. O nome do pet em letras maiúsculas em ALTO-RELEVO na face
frontal, espaçadas. Duas aberturas ovais nas laterais. Proporção: altura
ligeiramente maior que a largura, base levemente cônica.

ESTILO: cinematográfico e caseiro. Luz natural quente de manhã ou fim de tarde,
suave e direcional. Profundidade de campo rasa. Cores quentes e terrosas —
chocolate #5A4032, bege #E8D9C8, off-white #FAF8F5. Sombras em tom chocolate,
NUNCA preto puro. Ambiente doméstico brasileiro real e vivido: cozinha, sala,
piso de porcelanato ou madeira.

PROIBIDO: texto ou logotipo gerado pela IA na imagem; visual de estúdio
publicitário estéril; iluminação azulada ou fria; produto flutuando; mais de um
nome no mesmo comedouro; letras deformadas ou ilegíveis.
```

**Sobre o nome gravado:** IA de vídeo erra texto com frequência. Duas saídas, em ordem de preferência:
1. Enquadrar o nome **de perfil ou parcialmente fora de quadro**, deixando a leitura para o texto sobreposto na edição.
2. Se o nome precisa ser legível: gerar o plano **sem** nome e sobrepor o texto na edição, com Poppins bold maiúsculo espaçado.

Nunca aceitar um clipe com nome deformado — isso destrói a credibilidade justamente no atributo que se está vendendo.

### 3.2 Orçamento de créditos

**Saldo atual: 110 créditos, plano starter.** (verificado em 2026-07-19)

### Tabela de custo real

Medida com `get_cost: true` — preflight que retorna o preço **sem submeter job e sem gastar crédito**. Sempre preflightar antes de gerar qualquer coisa.

| Geração | Config | Créditos |
|---|---|---|
| Vídeo `seedance_2_0_mini` | 720p, 9:16, 5s, sem áudio | **12,5** |
| Vídeo `seedance_2_0_mini` | 720p, 9:16, 10s, sem áudio | **25** |
| Vídeo `seedance_2_0` std | 1080p, 9:16, 5s, sem áudio | **45** |
| Imagem `nano_banana_pro` | 1k, 4:5 | **2** |
| Locução `text2speech_v2` variante `elevenlabs` | 1 linha (~90 caracteres) | **0,3** |

**Leitura dos números:**

- Vídeo é linear no tempo: **2,5 cr/segundo** no mini, **9 cr/segundo** no std. O std custa **3,6× mais** — só entra depois que o roteiro estiver validado no mini.
- **Imagem é barata** (2 cr). Errar imagem-mestra é irrelevante; errar vídeo dói.
- **Locução é praticamente de graça** (0,3 cr/linha). Ver seção 3.4.

### Regra estrutural: gerar POR PLANO, nunca o roteiro inteiro

Um roteiro de 14s com 5 cortes gerado num único job é o jeito mais caro de errar: se 3 segundos saem ruins, os 35 créditos inteiros morrem. Em vez disso:

- Quebrar o roteiro em **3 clipes de 4–5s** (um job por plano ou par de planos).
- Cada clipe usa a imagem-mestra como referência de identidade.
- A montagem, os cortes, o texto na tela e o som acontecem **na edição** (CapCut ou equivalente — os cortes secos entre clipes gerados separadamente são exatamente o ritmo que o roteiro pede).
- Uma falha custa 10–12,5 cr (regenera só o plano ruim), não 35.

### Cenário A — dentro dos 110 créditos

**110 créditos compram UM story de anúncio bem feito — não três.**

Exemplo com o Roteiro 3 ("O despertador", 14s), quebrado em 3 clipes:

| Item | Cálculo | Créditos |
|---|---|---|
| Imagem-mestra (3 tentativas) | 3 × 2 | 6 |
| Clipe 1 — corredor/chegada, 5s | 12,5 | 12,5 |
| Clipe 2 — comendo + macro inox, 5s | 12,5 | 12,5 |
| Clipe 3 — tilt revelando o nome + olhar, 4s | 10 | 10 |
| Retentativas (~1 por clipe) | ~3 × 12 | ~36 |
| Locução (4 linhas) | 4 × 0,3 | ~1 |
| **Total estimado** | | **~78** |
| **Folga** | | **~32** |

Escolher **um** roteiro — a recomendação da copy é o Roteiro 3, melhor retenção — e produzir ele direito. Um criativo bom vale mais que três medianos, e no Meta o teste A/B só faz sentido quando cada variante teve chance de ficar boa.

**Regra do Cenário A:** preflight → gerar um clipe → avaliar → só então o próximo. Sem lote. Saldo abaixo de 12,5 cr, parar e avisar o dono.

### Cenário B — com recarga

Para os **3 roteiros** com margem real de erro:

Mesma regra de geração por plano. Cada roteiro ≈ 3 clipes + ~1 retentativa por clipe ≈ **~72 cr no mini**.

| Item | Cálculo | Créditos |
|---|---|---|
| Imagem-mestra (4 tentativas) | 4 × 2 | 8 |
| 3 roteiros completos no mini | 3 × ~72 | ~215 |
| Upgrade do roteiro VENCEDOR para std 1080p | 14s × 9 cr/s | ~130 |
| Vídeos de feed (giro 360°, macro) — 3 × 5s mini | 3 × 12,5 | ~38 |
| Locução (12 linhas) | 12 × 0,3 | ~4 |
| **Total** | | **~395** |

Sem o upgrade (720p é aceitável para Reels/Stories, que recomprimem tudo mesmo): **~265 créditos**. Upgrade pra std só depois que o Meta apontar o vencedor — pagar 1080p em criativo que vai perder o teste é desperdício.

**Recomendação:** o pacote de 500 créditos cobre tudo com folga. Se a ideia for validar antes de investir, o Cenário A com 1 roteiro já responde se o criativo funciona.

**Regra de ouro:** orçar 3 tentativas por clipe aprovado. IA de vídeo erra, e orçar só o resultado final é o erro clássico que trava a produção no meio.

### 3.4 Locução — resolvido dentro do Higgsfield

**Não é necessário assinar ElevenLabs.** O Higgsfield expõe a ElevenLabs como variante do `text2speech_v2`:

```
generate_audio(model: "text2speech_v2", variant: "elevenlabs",
               voice_type: "preset", voice_id: "<de list_voices>", prompt: "<a linha>")
```

Custo: **0,3 crédito por linha.** Os 3 roteiros inteiros somam ~12 linhas ≈ **4 créditos**.

Comparação com assinar direto:

| Caminho | Custo | Licença comercial |
|---|---|---|
| ElevenLabs via Higgsfield | ~4 cr no total | ⚠️ regida pelos termos do Higgsfield — **verificar antes do anúncio pago** |
| ElevenLabs Free | R$ 0 | ❌ **Não tem** — inviável para anúncio pago |
| ElevenLabs Starter | US$ 6/mês | ✅ Sim, + clonagem de voz instantânea |
| Voz do dono no celular | R$ 0 | ✅ É dele |

**DECIDIDO (2026-07-19): o dono não grava nada caseiro — locução é sintética.** Prototipar timbres via Higgsfield a 0,3 cr/linha; pro anúncio final, confirmar licença comercial nos termos do Higgsfield ou assinar ElevenLabs Starter (US$6/mês, licença explícita) e regerar as linhas finais lá. Direção de voz para TTS: seção 11 de `docs/copy-anuncios-potinho.md`.

> ⚠️ **Pendência jurídica:** antes de subir anúncio pago com voz sintética gerada via Higgsfield, confirmar nos termos de uso do Higgsfield se a saída tem licença comercial. Não assumir que tem.

### 3.3 Escolha de modelo

| Situação | Modelo | Por quê |
|---|---|---|
| Padrão (orçamento apertado) | `seedance_2_0_mini` | Aceita imagens de referência, mantém identidade, 9:16, barato |
| Qualidade final (com recarga) | `seedance_2_0` `mode: std` 1080p | Melhor fidelidade, 1080p, referências múltiplas |
| Se a copy pedir pessoa falando | `marketing_studio_video` com preset UGC | Avatar + produto, formato nativo de anúncio |

`generate_audio: false` por padrão. Áudio nativo de IA em português costuma soar artificial — trilha e locução entram na edição, com a copy aprovada. **Exceção:** se a copy pedir UGC falado, o áudio vem do Marketing Studio e precisa de aprovação auditiva antes de ir pro ar.

---

## 4. Fase 3 — Geração

Ordem obrigatória. Cada etapa depende da anterior.

### 4.1 Imagem-mestra de referência

Antes de qualquer vídeo, gerar **uma** imagem do produto que servirá de referência de identidade em todos os clipes. Isso é o que garante que o comedouro do clipe 1 seja o mesmo do clipe 3.

Entradas: 2 a 3 fotos reais como `image_references` (obrigatoriamente incluir `IMG_20260529_144357.jpg`) + Bíblia Visual.

Aprovar a imagem-mestra com o dono antes de seguir. Uma imagem-mestra ruim contamina toda a produção.

### 4.2 Clipes de story (prioridade máxima)

Um clipe por gancho aprovado. Para cada um:

1. Gerar com a imagem-mestra como referência
2. Conferir contra o checklist de qualidade (4.4)
3. Aprovado → próximo. Reprovado → **ajustar o prompt**, não repetir o mesmo. Máximo 3 tentativas por clipe; na 4ª, parar e replanejar o plano com o dono.

### 4.3 Feed

**DECISÃO DO DONO (2026-07-19): nenhuma foto real nas mídias.** Todo o feed é gerado por IA ou reaproveitado da produção de vídeo. As fotos reais em `docs/fotos-reais-comedouros/` seguem sendo usadas apenas como **referência de fidelidade nos prompts** — nunca publicadas.

### 4.4 Checklist de qualidade — todo clipe passa

- [ ] O comedouro está fiel: duas cores, linha diagonal em V, tigela inox, aberturas ovais
- [ ] Nenhum texto deformado visível (ou o nome está fora de foco/quadro por decisão)
- [ ] Luz quente, sombras chocolate, nada azulado
- [ ] O pet parece um pet real, sem anatomia estranha (patas, olhos, dentes)
- [ ] Os 3 primeiros segundos param o dedo, sozinhos, no mudo
- [ ] Legível em tela de celular com o som desligado
- [ ] Zona segura 9:16 respeitada: nada essencial nos 250px do topo nem nos 350px de baixo
- [ ] Selo da logo discreto, canto inferior, sem competir com o produto

---

## 5. Fase 4 — Entrega

### 5.1 Grade de feed (9 posts)

Ordem pensada para quem chega no perfil pela primeira vez e bate o olho na grade inteira. Legendas vêm da Fase 1.

| # | Post | Formato | Fonte |
|---|---|---|---|
| 1 | Produto branco/preto com CHARLIE, granito escuro | 4:5 | Foto real |
| 2 | Macro do nome em alto-relevo | 4:5 | Foto real ou macro gerado |
| 3 | Pet comendo no comedouro | 4:5 | Vídeo (Cenário B) ou foto real |
| 4 | As duas cores lado a lado | 1:1 | Foto real |
| 5 | Bastidor: peça na impressora 3D (ZEUS, luz azul) | 4:5 | Foto real — **única exceção autorizada à regra de luz quente**, é bastidor real e a autenticidade compensa |
| 6 | Giro 360° do produto | 1:1 | Vídeo |
| 7 | Comparativo: comedouro no chão × elevado | 4:5 | Foto real ou gerado |
| 8 | Detalhe da tigela inox saindo pra lavar | 4:5 | Foto real |
| 9 | Cartela de marca: "feito pra ele, com o nome dele" | 1:1 | Design, sem geração |

### 5.2 Stories e anúncios

Para cada roteiro aprovado, entregar:

- Master 9:16 em 1080p
- Duas versões de cartela final (site / perfil)
- Versão 1:1 para posicionamento de feed no Meta (usar a ferramenta `reframe`, não regerar)
- Primary text + headline prontos para colar no gerenciador

### 5.3 Reaproveitamento

O master 9:16 vai direto para TikTok e YouTube Shorts. Ajustes: TikTok pede texto na tela mais alto (a UI cobre mais o rodapé); Shorts pede uma miniatura própria.

---

## 6. Ordem de execução — resumo

```
1. Copy (skill Ladeira)          → docs/copy-anuncios-potinho.md
   ⛔ GATE 1: dono aprova a copy
2. Storyboard + orçamento         → docs/storyboard-potinho.md
   ⛔ GATE 2: dono aprova roteiro e custo
3. Sonda de custo (1 clipe)       → recalcular o plano com o número real
4. Imagem-mestra                  → dono aprova
5. Clipes de story                → um por vez, checklist a cada um
6. Feed                           → foto real tratada
7. Entrega + variações de CTA
```

---

## 7. Pendências e decisões futuras do dono

- Barra de oferta de frete grátis no site (o dono faz depois; fora deste escopo)
- Se o frete grátis a partir de 2 peças é permanente — hoje tratado como temporário
- Recarga de créditos Higgsfield: decidir depois de ver o custo real medido na sonda (3.2)
- Pixel do Meta instalado e testado em `potinho.pet` antes de rodar o teste A/B de destino
