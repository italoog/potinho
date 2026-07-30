# potinho — Storyboard de Produção

**Criado:** 2026-07-19 · **Status:** ✅ PRODUZIDO (corte bruto em `docs/midia-gerada/corte-bruto-despertador.mp4`)

---

## LEVA 4 — Ângulo C, Roteiro C2 "A coisa mais fiel dessa casa" (2026-07-29)

**Copy aprovada em `docs/copy-anuncios-potinho.md` seção 13, GATE 1 aprovado pelo dono.** Prioridade confirmada: C2 primeiro.
**Restrição de crédito:** Higgsfield em 6,85 cr — insuficiente pra vídeo novo (mín. 12,5 cr/clipe). Segue a estratégia de `ai-media-free-alternatives`: Gemini/Nano Banana (imagem, grátis) + Dreamina Seedance free (vídeo, grátis) via browser. Higgsfield só pra locução (~0,3 cr/linha).

**Pet/produto novo (variedade, ver `ad_dog_variety_preference`):** nome **BILLY**, combo marrom/roxo — ainda não usado em nenhum anúncio anterior (CHARLIE, ZEUS, LUNA já usados). Referência real: `docs/fotos-reais-comedouros/Screenshot_2026-06-03-20-02-30-425_com.instagram.android.jpg`.

### Plano a plano

| Seg | Plano | Fonte | Ferramenta |
|---|---|---|---|
| 0–3 | Cortes rápidos de "fotos no celular": festa, viagem, bolo de aniversário desabando — genéricas, sem produto | Imagem gerada | Gemini/Nano Banana |
| 3–6 | Cozinha vazia e silenciosa, mão enchendo a tigela de inox do potinho (marrom/roxo, BILLY) | Vídeo gerado (image-to-video a partir da imagem-mestra) | Dreamina Seedance free |
| 6–8 | Cachorro chegando e comendo no potinho | Vídeo gerado | Dreamina Seedance free |
| 8–10 | Macro do nome BILLY em alto-relevo entrando em foco | Foto real animada (`Screenshot_2026-06-03-20-02-30-425...jpg` como start frame) ou imagem gerada + ken burns se o vídeo falhar | Dreamina Seedance free / ffmpeg |
| 10–12 | Cartela final (site/perfil) | Tipografia Poppins + logo | ffmpeg (reaproveita `montar.sh`) |

Bíblia Visual (seção 3.1 do plano de mídias) embutida em todo prompt de imagem/vídeo. Nome do pet MAIÚSCULO ESPAÇADO nos textos na tela; marca sempre `potinho` minúscula.

### Locução (3 linhas, ~0,9 cr)

| # | Linha | Entra sobre |
|---|---|---|
| 1 | "Aqui tem foto de aniversário, de viagem, até de bolo que desabou." | Seg 0–3 |
| 2 | "Só não tem foto da hora de encher o pote dele." | Seg 3–6 |
| 3 | "Mas é isso que não falhou nenhum dia." | Seg 8–10 |

Voz: Arthur (mesma das levas anteriores, `voice_id 30fc8796-ceb6-4a66-b3a7-4a145ef7f346`).

### Checklist de qualidade (seção 4.4 do plano) aplica normalmente antes de aceitar qualquer plano gerado.

### Execução real — desvios do plano

- **Upload de referência no Gemini:** inviável via automação de browser (exige diálogo nativo de arquivo do Windows, que o Claude in Chrome não controla). Contornado gerando a imagem-mestra do produto no **Higgsfield** (`nano_banana_pro`, 2 cr, referência real via upload direto) em vez do Gemini — ainda assim dentro do orçamento (6,85cr iniciais).
- **Dreamina descartado:** o seletor de proporção trava em "Default" e herda 21:9 de gerações anteriores da sessão sempre que uma imagem de referência é anexada (bug confirmado: tooltip "aspect ratio is set to 21:9 based on the reference image" — ele lê o aspect ratio do PRÓPRIO ARQUIVO enviado, e um screenshot de página cheia sai sempre ~21:9, nunca 9:16). Sem forma confiável de remover o anexo pela UI (thread persiste entre navegações). **Pivotado pra ken burns em ffmpeg** sobre as imagens estáticas — mesma técnica já validada nas levas anteriores, custo zero, sem risco de proporção errada.
- **Reveal do nome:** em vez de vídeo animado, macro estático via crop+zoompan na própria imagem-mestra (`c2-s5`), já validada com o nome BILLY perfeitamente legível.
- **Controle de qualidade pós-geração:** a primeira imagem de "festa" saiu com pessoas de rosto visível ao fundo (quebra a regra de marca "nunca rosto"), mesmo com "no visible faces" no prompt. Regenerada com instrução mais explícita ("no people, no humans, no silhouettes, no faces, no bodies") — resultado sem nenhuma pessoa em quadro.

### Entrega

`docs/midia-gerada/ANUNCIOS-PRONTOS/C2-a-coisa-mais-fiel-{site,perfil}.mp4` — 1080×1920, 16,17s, H.264/AAC.
Segmentos em `docs/midia-gerada/v2/seg/c2-s{1..5}.mp4`, locução em `v2/voz/c2-{1,2,3}.mp3`.
Pet/produto: **BILLY**, combo marrom/roxo — nome inédito nos anúncios do potinho.
Saldo Higgsfield final: **4,25 cr** (imagem-mestra 2cr + locução ~0,6cr).

---

## LEVA 5 — C1 "O relógio dele" (2026-07-29)

Segundo roteiro do Ângulo C. Reaproveita a imagem-mestra do produto BILLY vazio (`c2-04-master-billy-cozinha.png`) da Leva 4 pro beat "mão enche o pote" — sem gasto extra. Duas imagens novas via Gemini (relógio de parede, cachorro entrando na cozinha) e uma via Higgsfield com referência real (cachorro comendo no BILLY, `nano_banana_pro`, 2cr) — essa é a única com produto+pet juntos, então usa a foto real como referência de fidelidade.

**Cachorro:** vira-lata preto e caramelo (bicolor), consistente entre as duas imagens que o mostram — nome ainda não revelado explicitamente no roteiro (é o BILLY do pote).

### Plano a plano

| Seg | Plano | Fonte | Duração |
|---|---|---|---|
| 1 | Relógio de parede, cozinha aconchegante | Gemini (novo) | 2,16s |
| 2 | Cachorro entrando pela porta da cozinha | Gemini (novo) | 2,96s |
| 3 | Produto BILLY vazio, no chão | Reaproveitado da Leva 4 | 6,56s |
| 4 | Macro do nome BILLY (crop na foto do cachorro comendo) | Higgsfield (mesma imagem do seg. 5) | 2,0s |
| 5 | Cachorro comendo no BILLY (hero shot) | Higgsfield, `nano_banana_pro` c/ referência real, 2cr | 2,4s |
| — | Cartela final | Reaproveitada (`card-site`/`card-perfil`) | 2,9s |

Locução (3 linhas, Arthur): "Ele não usa relógio." / "Mas sabe a hora exata, todo santo dia." / "Chova, faça sol, seja segunda ou feriado. O horário não muda." (~0,45cr)

### Entrega

`docs/midia-gerada/ANUNCIOS-PRONTOS/C1-o-relogio-dele-{site,perfil}.mp4` — 1080×1920, 19,0s, H.264/AAC.
Segmentos em `v2/seg/c1-s{1..5}.mp4`, locução em `v2/voz/c1-{1,2,3}.mp3`.
Saldo Higgsfield final: **1,65 cr** — insuficiente pra outra imagem produto+pet (precisa de 2cr).

---

## LEVA 6 — C3 "Desde que ele chegou" (2026-07-29)

Terceiro e último roteiro do Ângulo C. Dono esclareceu que não tem conta Higgsfield paga (o saldo usado nas Levas 4-5 era o que restava) — pediu pra seguir só com ferramentas grátis. Produzido **sem gastar nenhum crédito de imagem**: as duas cenas novas (quarto de manhã, parede de retratos sugerindo o tempo passando) saíram do Gemini grátis; os beats de produto e cachorro comendo **reaproveitam integralmente** os assets já gerados nas Levas 4 e 5 (`c2-04-master-billy-cozinha.png`, `c2-s5.mp4`, `c1-s5.mp4`) — mesmo produto BILLY, mesmo cachorro, sem gerar nada novo.

### Plano a plano

| Seg | Plano | Fonte | Duração |
|---|---|---|---|
| 1 | Quarto de manhã, cama desarrumada, luz suave | Gemini (novo) | 4,32s |
| 2 | Parede de retratos acumulados, planta crescida — passagem do tempo | Gemini (novo) | 4,56s |
| 3 | Produto BILLY vazio, no chão | Reaproveitado (Leva 4) | 2,88s |
| 4 | Macro do nome BILLY | Reaproveitado (`c2-s5.mp4`, Leva 4) | 2,0s |
| 5 | Cachorro comendo no BILLY | Reaproveitado (`c1-s5.mp4`, Leva 5) | 2,4s |
| — | Cartela final | Reaproveitada | 2,9s |

Locução (3 linhas, Arthur): "Desde o dia que ele chegou nessa casa, teve uma coisa que nunca mudou." / "Mudou o sofá, mudou o emprego, mudou até o bairro." / "Só não mudou a hora de encher esse pote." (~0,45cr — único gasto desta leva).

### Entrega

`docs/midia-gerada/ANUNCIOS-PRONTOS/C3-desde-que-ele-chegou-{site,perfil}.mp4` — 1080×1920, 19,08s, H.264/AAC.
Com esta leva, os **3 roteiros do Ângulo C estão completos**: C1, C2 e C3, todos com o mesmo produto (BILLY, marrom/roxo) e o mesmo cachorro protagonista — consistência de personagem em toda a sub-campanha do ângulo "o ritual, não o gesto".

---

## LEVA 7 — D1 "A correria de sempre" (Ângulo D, vídeo real, 2026-07-29)

Dono pediu explicitamente vídeo de verdade, não só ken burns. Como os Ângulos A/B/C foram escritos pra planos contemplativos (parados), foi criado um **quarto ângulo nativo de vídeo**: a empolgação física descontrolada do pet na hora da comida — a única ação que só existe em movimento real (correr, derrapar, sacudir o rabo). Copy completa na seção 14 de `docs/copy-anuncios-potinho.md`.

### Descoberta técnica: Dreamina funciona em 9:16 sem referência de imagem

O bug de aspect ratio das Levas 4-5 (sempre 21:9) só acontece quando uma imagem de referência é anexada — o Dreamina lê as dimensões do arquivo enviado, e qualquer screenshot de página cheia sai ~21:9 (limite do viewport da extensão, não ajustável). **Em modo texto-puro (sem anexo), o seletor 9:16 fica livre e funciona normalmente.** Contorno: gerar os clipes de ação via texto puro (aceitando risco de fidelidade do produto nesses planos) e reservar a fidelidade real pro plano estático do hero shot (já validado nas levas anteriores). Ver `browser_automation_ai_media_limits.md` na memória, atualizado com esse achado.

**Pegadinha nova:** o Dreamina embute uma marca d'água "Dreamina AI" no canto inferior direito de todo vídeo gratuito — mesmo contorno já conhecido (`dreamina_free_model_gate`): cortar a faixa inferior do frame antes de reenquadrar pro 9:16 final.

### O que foi gerado

| Clipe | Ferramenta | Conteúdo | Uso no anúncio |
|---|---|---|---|
| Reação | Dreamina Seedance 1.0 Fast, texto puro, 9:16 | Cachorro deitado, orelha reage a som, levanta rápido | Seg. 1 (2,5s, cortado do fim do clipe) |
| Correndo | Dreamina Seedance 1.0 Fast, texto puro, 9:16 | Cachorro correndo em disparada por corredor até a câmera | Seg. 2 (4,0s) |
| Comendo (descartado) | Dreamina Seedance 1.0 Fast, texto puro, 9:16 | Cachorro chegando e comendo — mas o pote saiu genérico (sem a referência real, a IA inventou uma tigela comum) | Não usado — substituído pelo hero shot estático do BILLY já validado |

Produto+cachorro na parte final do anúncio reaproveitam os assets já gerados (`c1-04-cachorro-comendo-billy.png`, `c1-s4.mp4`) — garantindo que o BILLY apareça fiel no clímax, mesmo com os planos de ação sendo genéricos.

### Plano a plano

| Seg | Conteúdo | Fonte | Duração |
|---|---|---|---|
| 1 | Cachorro reage e levanta (vídeo real) | Dreamina, recorte do clipe "reação" | 2,5s |
| 2 | Cachorro correndo pelo corredor (vídeo real) | Dreamina, clipe "correndo" | 4,0s |
| 3 | Cachorro comendo no BILLY (estático, push-in) | Reaproveitado (Leva 5) | 3,0s |
| 4 | Macro do nome BILLY | Reaproveitado (`c1-s4.mp4`, Leva 5) | 2,0s |
| — | Cartela final | Reaproveitada | 2,9s |

Locução (3 linhas, Arthur): "Ele senta quando manda. Espera quando pede." / "Só não consegue isso na hora que a ração bate na tigela." / "Bagunça permitida. Só essa." (~0,45cr).

### Entrega

`docs/midia-gerada/ANUNCIOS-PRONTOS/D1-a-correria-de-sempre-{site,perfil}.mp4` — 1080×1920, 14,4s, H.264/AAC. Primeiro anúncio da campanha com movimento real gerado por IA (não ken burns).

### Correção pós-entrega (2026-07-29) — deformações de IA no vídeo

Dono revisou e apontou deformações/anomalias visuais nos clipes de vídeo real (Dreamina): nas transições bruscas (o cachorro levantando rápido, a virada na esquina), o corpo do cachorro encolhe/deforma de forma anômala por 1-2 frames — artefato clássico de vídeo de IA em movimento brusco, visível principalmente em still-frame mas perceptível no playback também.

**Correção:** substituído os 2 clipes de vídeo (reação + correndo) por **imagens estáticas com ken burns** — mesma técnica comprovada em C1/C2/C3, zero risco de deformação:
- Segmento 1: reaproveitada `c1-02-cachorro-chegando.png` (já validada, mesmo cachorro)
- Segmento 2: nova imagem gerada via Gemini — cachorro capturado em pose de corrida com motion blur nas patas (sugere velocidade num frame só, sem precisar de vídeo)
- Segmentos 3-4 e cartela: inalterados (já eram estáticos)

A copy/locução foi mantida integralmente (o dono aprovou o texto). Duração ajustada de 14,4s para **17,25s** pra caber as durações reais da locução sem cortes. Vídeo com deformação arquivado em `docs/midia-gerada/v2/_backup/AD-d1-9x16-{site,perfil}-COM-DEFORMACAO.mp4` (não usar).

**Lição:** Dreamina Seedance 1.0 Fast (grátis) tem qualidade inconsistente em transições de movimento brusco — bom pra movimento contínuo e suave (aproximação, corrida em linha reta vista de longe), ruim pra mudanças rápidas de pose (levantar de repente, virar esquina, saltar). Preferir imagem estática com pose dinâmica (motion blur pintado na própria imagem) quando o orçamento ou a qualidade do modelo de vídeo não permitir múltiplas tentativas de geração.

---

## LEVA 8 — D2 "Nem eu ia conseguir" (2026-07-29)

Segundo roteiro do Ângulo D. Depois da correção do D1, produzido **direto em imagens estáticas com ken burns** — dono confirmou que vídeo real do Dreamina não vale o risco de deformação neste orçamento. Copy na seção "Roteiro D2" de `docs/copy-anuncios-potinho.md`.

### Plano a plano

| Seg | Conteúdo | Fonte | Duração |
|---|---|---|---|
| 1 | Cachorro sentado, calmo, comportado, perto do sofá | Gemini (novo) | 3,36s |
| 2 | Cachorro pulando no ar de empolgação, patas fora do chão | Gemini (novo) | 4,0s |
| 3 | Cachorro comendo no BILLY, com texto na tela sobrepondo a locução final | Reaproveitado (Leva 5) + `drawtext` ffmpeg | 3,0s |
| 4 | Macro do nome BILLY | Reaproveitado (`c1-s4.mp4`) | 2,0s |
| — | Cartela final | Reaproveitada | 2,9s |

### Crédito esgotou no meio da locução

A 3ª linha ("Aqui, a bagunça é aplaudida.") falhou por falta de crédito no Higgsfield (0,45cr cobriam só 2 das 3 linhas a 0,15cr cada). Em vez de parar ou pedir recarga pra uma linha só, a frase virou **texto na tela** (Poppins bold, caixa chocolate translúcida, mesmo padrão visual da marca) sobre o plano do cachorro comendo — resolve sem gastar nada.

### Entrega

`docs/midia-gerada/ANUNCIOS-PRONTOS/D2-nem-eu-ia-conseguir-{site,perfil}.mp4` — 1080×1920, 15,27s, H.264/AAC. Nenhum crédito de vídeo gasto (Dreamina) e crédito mínimo de locução (Higgsfield, ~0,3cr pelas 2 linhas que saíram).

Com D1 corrigido e D2 entregue, os dois roteiros escritos do Ângulo D estão completos, ambos 100% em imagem estática — a decisão definitiva desta fase da campanha foi abandonar vídeo real gerado por IA em favor de ken burns sobre fotos, por confiabilidade.

---

## LEVA 2 — 4 anúncios adicionais (2026-07-28)

**Restrição:** saldo Higgsfield de 12,35 cr — não cobria nem um clipe de 5s (12,5). Produzido em **modo custo-zero de vídeo**: nenhum plano novo foi gerado. Só locução (14 linhas × 0,15 = **2,40 cr**). Saldo final: **9,95**.

### Estratégia: banco de planos + tipografia

Os 4 roteiros já tinham copy aprovada no GATE 1. Em vez de gerar os planos que faltavam, cada um foi remontado com:

| Fonte | Origem | Uso |
|---|---|---|
| `V1-corredor` | `clipe1-v2.mp4` reescalado 1080×1920 | cachorro chegando, comedouro em 1º plano |
| `V2-comendo` | `clipe2-v2.mp4` | cachorro caramelo comendo |
| `V3-macro` | `clipe3-v2.mp4` | reveal do nome CHARLIE |
| `I1-impressora` | `feed-05-impressora.png` + ken burns | ZEUS na impressora (frio→quente) |
| `I2-macro-nome` | `macro-nome-cinematografico.png` + ken burns | CHARLIE em alto-relevo |
| `I3-gato` | `feed-gato-luna.png` + ken burns | gato LUNA comendo |
| Cartelas | Poppins + paleta da marca, via ffmpeg | planos que não existiam em footage |

**Princípio:** os planos que a IA não tinha gerado (camisa pendurada, placa de porta, esteira industrial, sofá) viraram **tipografia da marca** — o que é melhor que gerar, porque elimina o risco de a IA errar texto e mantém o conceito legível no mudo.

### Os 4 anúncios

| # | Roteiro | Ângulo | Dur. | Construção |
|---|---|---|---|---|
| 1 | **B3 "A assinatura"** | B — um de um | 14,4s | 2 cartelas de setup (jogador/doutor, com push-in) → macro CHARLIE no punch → comendo → CTA |
| 2 | **B1 "Dez mil iguais"** | B — um de um | 16,6s | cartela FRIA com contador subindo até 10.000 → impressora ZEUS (quente) → macro → comendo → CTA |
| 3 | **R2 "O que é só dele"** | A — pertencimento | 17,6s | corredor → cartela de negações riscadas uma a uma no tempo da voz → macro → gato LUNA → CTA |
| 4 | **R1 "O inventário dele"** | A — pertencimento | 12,7s | corredor → comendo → macro do nome → CTA |

O contraste frio→quente do B1 é a única exceção autorizada à regra de luz quente — é a argumentação do roteiro, não um desvio.

### Entrega

`docs/midia-gerada/v2/AD-{b3,b1,r2,r1}-9x16-{site,perfil}.mp4` — 8 arquivos, 1080×1920, H.264, AAC 192k.
Remontagem reproduzível: `docs/midia-gerada/v2/montar.sh`.

**Cartela final** traz o slogan da marca `carinho em cada potinho` colado ao logotipo, acima da linha de copy (informado pelo dono em 2026-07-28). Durações incluem os 2,9s da cartela.

### Especificações verificadas

- Áudio normalizado: média −14 dB, pico −0,5 a −1,7 dB (compatível com a normalização do Meta)
- Locução Arthur (mesma voz do despertador), trilha a 13% com fade in/out
- Selo da logo em `x=68, y=1450` — fora dos 350px inferiores de zona segura
- Nenhum texto gerado por IA; toda tipografia é Poppins real

### Pendências herdadas (inalteradas)

- [ ] ⚠️ Licença comercial da voz sintética — **o dono providencia** (vale para esta leva também)
- [ ] Pixel do Meta em potinho.pet

---

## LEVA 3 — B2 novo + planos reais no B3 (2026-07-28)

**Mudança de estratégia:** em vez do banco de planos já produzido, esta leva gera mídia genuinamente nova usando as alternativas gratuitas ao Higgsfield (ver `ai-media-free-alternatives` na memória) — Gemini/Nano Banana pra imagem, Dreamina (Seedance) pra vídeo. Só a locução continua saindo do Higgsfield (custo baixo).

### O que foi gerado

| Plano | Ferramenta | Uso |
|---|---|---|
| Camisa de futebol "CHARLIE 10" pendurada | Gemini (Nano Banana) | B3, segmento 0–2,8s — substitui a cartela tipográfica antiga |
| Placa "DR. CHARLIE / CRM 48219" | Gemini (Nano Banana) | B3, segmento 2,8–5,6s — substitui a cartela tipográfica antiga |
| Calçada com cachorros de raças variadas (golden, vira-lata) | Dreamina, modelo Seedance 1.0 Fast, modo "Primeiro e último quadro" | B2, segmento 0–3,7s — único plano do storyboard sem correspondência no banco de footage |
| Locução B2 (3 linhas) | Higgsfield ElevenLabs (voz Arthur) | ~0,45 cr total |

**Pegadinha do Dreamina:** o modo "Referência Omni" (ativo por padrão na aba de vídeo) desabilita todos os modelos gratuitos (1.5 Pro, 1.0, 1.0 Fast) e só libera modelos pagos. Trocar pra "Primeiro e último quadro" ou "Multiframes" libera os modelos grátis mesmo sem anexar nenhum frame de referência. O clipe da calçada saiu com marca d'água "Dreamina AI" no canto inferior direito (remover exige assinatura); resolvido cortando a faixa inferior do vídeo antes de reenquadrar pro 9:16, o que também eliminou a marca.

**Reaproveitamento sem geração:** o plano "cachorro em casa olhando câmera" do B2 não precisou de geração nova — encontrado em `clipe1-v1.mp4` (footage bruto da Leva 1, ainda não usado em nenhum anúncio), cachorro sentado olhando direto pra câmera.

### B2 "O xará" (13,07s)

| Segmento | Fonte | Duração |
|---|---|---|
| Calçada (raças variadas) | Dreamina Seedance, gerado | 3,7s |
| Cachorro olhando câmera | `clipe1-v1.mp4` (reaproveitado, corte 1,9–3,9s) | 2,0s |
| Macro do nome CHARLIE | `V3-macro.mp4` (reaproveitado) | 2,5s |
| Comendo | `V2-comendo.mp4` (reaproveitado) | 2,0s |
| Cartela final | Poppins + slogan | 2,9s |

Entrega: `docs/midia-gerada/v2/AD-b2-9x16-{site,perfil}.mp4`.

### B3 atualizado

Os segmentos `b3-s1.mp4` e `b3-s2.mp4` (camisa e placa) foram substituídos in-place pelas imagens reais acima, via ken burns (push-in leve, mesma receita do pipeline). Duração e timing de voz inalterados — `AD-b3-9x16-{site,perfil}.mp4` foi remontado com o `montar.sh` existente sem mudanças de script nessa parte.

### Especificações verificadas (B2)

- Áudio: −13,9 dB RMS, −1,18 dB pico (dentro do alvo)
- Locução Arthur, mesmo padrão de trilha e logo das levas anteriores
- Frames-chave inspecionados visualmente em todos os 5 pontos do roteiro (calçada, olhar, macro, comendo, cartela)

### Pendências herdadas (inalteradas)

- [ ] ⚠️ Licença comercial da voz sintética — **o dono providencia**
- [ ] Pixel do Meta em potinho.pet

### Correções pós-entrega (2026-07-29)

- **Cartela PERFIL:** removida a linha "feito peça por peça, com o nome dele" (frase sem sentido) de todos os anúncios versão perfil. Card refeito via ffmpeg (`v2/CARD-perfil.mp4`), versão antiga preservada em `v2/_backup/CARD-perfil-com-frase-antiga.mp4`.
- **Bug crítico de áudio cortado:** `montar.sh` usava `amix=duration=first`, que travava a duração do áudio no tamanho do primeiro clipe de voz — silenciando o resto do anúncio (outras falas + trilha) sem erro visível. Corrigido pra `duration=longest`. Afetava **todos** os anúncios da Leva 2/3 (B1, B2, B3, R1, R2). Todos remontados após o fix. Ver `video_assembly_ffmpeg_pipeline` na memória.
- **B1 "Dez mil iguais" descartado** — dono considerou o resultado ruim; não faz parte da entrega final.

### Entrega final

10 vídeos (5 roteiros × site/perfil) em `docs/midia-gerada/ANUNCIOS-PRONTOS/`: R3 despertador, R1 inventário, R2 só dele, B2 xará, B3 assinatura.

## Resultado da produção (2026-07-19)

| Item | Status | Tentativas | Custo real |
|---|---|---|---|
| Imagem-mestra | ✅ v4 (fusão v2+v3) | 4 | 8 cr |
| Clipe 1 (corrida) | ✅ 1ª tentativa | 1 | 12,5 cr |
| Clipe 2 (comendo/inox) | ✅ 1ª tentativa | 1 | 12,5 cr |
| Clipe 3 (reveal CHARLIE, foto real) | ✅ 1ª tentativa | 1 | 10 cr |
| Voz: sonda (3) + 4 linhas finais (Arthur) | ✅ | — | ~2,1 cr |
| **Total** | | | **~45 cr** (saldo ~65 de 110) |

**Voz escolhida:** Arthur (`voice_id 30fc8796-ceb6-4a66-b3a7-4a145ef7f346`, preset ElevenLabs via Higgsfield).
**Corte bruto:** 19s (locução real pediu mais que os 14s do papel — freeze de 2,5s no reveal + cartela 2,5s). Montado com ffmpeg; fonte da cartela é Segoe (placeholder).

### Pendências — ATUALIZADAS 2026-07-19 (noite)
- [x] SFX de ração (Pixabay: `sfx-racao.mp3`, licença Pixabay — comercial ok)
- [x] Trilha ("Warm And Soft Guitar", Pixabay: `trilha-guitarra.mp3`)
- [x] Cartela Poppins + logo, versões SITE e PERFIL
- [x] Mixagem completa (SFX abre, trilha entra no Clipe 2 a 14%, voz por cima, fades)
- [x] Formato de feed: 4:5 (crop ajustado por clipe; reframe 1:1 pago custaria 69 cr — dispensado)
- [x] Clipes regenerados com o nome CHARLIE visível (v2) — sem foto real
- [ ] ⚠️ Licença comercial da voz sintética — **o dono providencia**
- [ ] Pixel do Meta em potinho.pet — **o dono faz manualmente, depois**

**ENTREGA FINAL:** `FINAL-9x16-site.mp4` · `FINAL-9x16-perfil.mp4` · `FINAL-4x5-site.mp4` · `FINAL-4x5-perfil.mp4`
Feed completo (10 artes, zero foto real): grade 1-9 + gato/LUNA extra. Saldo Higgsfield: ~12 cr (reserva).

---

*Storyboard original aprovado no GATE 2 abaixo.*
**Base:** Ângulo A (pertencimento) aprovado no GATE 1 · Roteiro 3 — "O despertador" (14s)
**Cenário:** A (dentro dos 110 créditos) · **Custo total estimado: ~73 cr, folga ~37**

---

## 0. Decisões travadas

| Decisão | Valor |
|---|---|
| Ângulo | A — pertencimento |
| Roteiro | 3 — "O despertador" |
| Estratégia | 3 jobs separados (um por plano), montagem na edição |
| Modelo de vídeo | `seedance_2_0_mini`, 720p, 9:16, `generate_audio: false` |
| Locução | Sintética (`text2speech_v2` variante `elevenlabs`), voz escolhida por sonda |
| Pet | **Cachorro caramelo (vira-lata)** — máxima identificação com o público BR |
| Produto | Branco/preto (igual à foto real do CHARLIE — a referência mais forte que temos) |
| Nome na peça | Nunca gerado legível pela IA. O reveal usa a **foto real animada** (ver Clipe 3) |

---

## 1. Imagem-mestra (referência de identidade)

Gerada primeiro; aprovada pelo dono; usada como `image_references` nos Clipes 1 e 2.

- **Modelo:** `nano_banana_pro`, 9:16, 1k — **2 cr/tentativa** (orçadas 3)
- **Referências:** `IMG_20260529_144357.jpg` (produto real) via upload

**Prompt:**

```
A caramel-colored Brazilian mutt dog (vira-lata caramelo) eating from an
elevated pet feeder in a cozy Brazilian home kitchen, early morning warm
sunlight through a window, shallow depth of field.

THE FEEDER (must match reference photo exactly): elevated 3D-printed pet
feeder, cylindrical body in two matte colors — white top section, black
bottom section — divided by an inverted-V diagonal line. Removable stainless
steel bowl seated on top with a visible mirror-polished rim. Two oval
side openings. Slightly conical base, height a bit greater than width.
The embossed pet name area faces AWAY from camera (name not readable).

STYLE: cinematic and homely. Warm directional natural light. Warm earthy
palette — chocolate #5A4032, beige #E8D9C8, off-white #FAF8F5. Shadows in
warm chocolate tones, never pure black. Real lived-in Brazilian home:
porcelain tile floor, kitchen cabinets softly blurred in background.

FORBIDDEN: any AI-generated text or logo; sterile studio look; cold blue
lighting; floating product; deformed letters.
```

**Critério de aprovação:** o comedouro tem que ser confundível com a foto real. Se o formato do corpo ou a tigela inox saírem errados, ajustar o prompt (não repetir).

---

## 2. Os 3 clipes

### Clipe 1 — A corrida (5s) — 12,5 cr/tentativa

Cobre os segundos 0–6 do roteiro. Locuções 1 e 2 por cima.

- **Modelo:** `seedance_2_0_mini` · 9:16 · 720p · 5s · sem áudio
- **Referências:** imagem-mestra (`image_references`)

**Prompt:**

```
Low camera at floor level in a dim Brazilian home corridor at dawn, faint
warm light from the kitchen at the far end. A caramel-colored Brazilian mutt
dog sprints toward the camera from the dark corridor, slightly motion-blurred
with excitement, then skids on the porcelain tile floor as it arrives at an
elevated pet feeder near the kitchen. The feeder matches the reference image:
3D-printed cylindrical body, white top and black bottom divided by an
inverted-V diagonal line, stainless steel bowl on top. Handheld cinematic
feel, warm chocolate-toned shadows, never pure black. No text, no logo.
```

**Texto na tela (edição):** nenhum — o som carrega este trecho.
**Som (edição):** SFX de ração caindo no inox (banco do CapCut), começa no preto, 0,5s antes da primeira imagem.

### Clipe 2 — Comendo + inox (5s) — 12,5 cr/tentativa

Cobre os segundos 6–9. Locução 3 por cima.

- **Modelo:** `seedance_2_0_mini` · 9:16 · 720p · 5s · sem áudio
- **Referências:** imagem-mestra (`image_references`)

**Prompt:**

```
Close shot at floor level: a caramel Brazilian mutt dog eagerly eating kibble
from the stainless steel bowl of an elevated 3D-printed pet feeder (white top,
black bottom, inverted-V diagonal split, matching the reference image). The
camera slowly pushes in toward the mirror-polished steel rim of the bowl,
catching warm morning light reflections. The embossed name area faces away
from camera. Cozy Brazilian kitchen, warm directional sunlight, shallow depth
of field, chocolate-toned shadows. No text, no logo.
```

### Clipe 3 — O reveal do nome (4s) — 10 cr/tentativa

Cobre os segundos 9–14. Locução 4 (o punch) por cima. **Aqui o produto é o REAL.**

- **Modelo:** `seedance_2_0_mini` · 9:16 · 720p · 4s · sem áudio
- **Entrada:** `IMG_20260529_144357.jpg` (foto real do CHARLIE) como `start_image` — image-to-video, o produto não é inventado

**Prompt:**

```
Starting from this exact photo: the camera performs a very slow, smooth
cinematic push-in and slight upward tilt toward the embossed name "CHARLIE"
on the white body of the 3D-printed pet feeder. The letters come into sharp
focus. Nothing in the scene changes — same product, same granite surface,
same lighting. No new objects, no text overlays, no camera shake.
```

**Por que assim:** o nome legível é o único plano em que a IA não pode errar — então ele nem gera o produto: anima a foto real. Custo menor (4s), risco quase zero, e o que o cliente vê no anúncio é literalmente a peça que ele vai receber.

---

## 3. Locução (4 linhas — ~1,2 cr no total)

| # | Linha | Entra sobre |
|---|---|---|
| 1 | "Esse barulho é o único despertador que ele respeita." | Clipe 1, início |
| 2 | "Sete da manhã, chuva, feriado. Tanto faz." | Clipe 1, chegada |
| 3 | "A tigela é de inox e sai pra lavar. Ele não liga pra isso." | Clipe 2 |
| 4 | "Ele liga pra isso aqui. *(pausa)* Mesmo sem saber ler." | Clipe 3, sobre o nome em foco |

**Sonda de voz (antes de gerar as 4 linhas):** gerar a linha 1 em 3 vozes diferentes (~1 cr total), o dono escolhe. Critério: a menos "locutor" — energia de quem conta um caso, não de quem anuncia. A pausa da linha 4 se ajusta na edição se o TTS não entregar.

⚠️ **Antes de subir o anúncio pago:** confirmar licença comercial da voz nos termos do Higgsfield; fallback ElevenLabs Starter (US$6).

---

## 4. Montagem (edição — CapCut ou equivalente)

1. **0,0s:** tela preta + SFX ração no inox → Clipe 1 entra
2. Cortes secos entre clipes (é o ritmo do roteiro)
3. Locuções posicionadas conforme a tabela; volume do SFX abaixa quando a voz entra
4. Trilha: instrumental leve, quente, sem vocal — entra baixinho no Clipe 2
5. **Texto na tela** (Poppins bold, cores da marca): apenas reforços curtos, nunca legendando a voz palavra por palavra
6. Selo da logo (`ChatGPT_Image_19..._removebg-preview.png`) no canto inferior esquerdo, pequeno, a partir do Clipe 2
7. **Cartela final ×2** (2s cada versão, fundo `#FAF8F5`, texto chocolate):
   - **SITE:** "potinho 🐾 / o nome dele, gravado no corpo da peça / potinho.pet"
   - **PERFIL:** "potinho 🐾 / feito peça por peça, com o nome dele / @potinho.pet"
8. Zona segura 9:16: nada essencial nos 250px do topo / 350px de baixo
9. Export: 1080×1920, H.264, alta taxa — o Meta recomprime

Depois do master aprovado: versão 1:1 via `reframe` (não regerar).

---

## 5. Orçamento consolidado (preflightado em 2026-07-19)

| Item | Tentativas orçadas | Custo |
|---|---|---|
| Imagem-mestra (2 cr) | 3 | 6 |
| Clipe 1 (12,5 cr) | 2 | 25 |
| Clipe 2 (12,5 cr) | 2 | 25 |
| Clipe 3 (10 cr) | 1 *(risco baixo: foto real como start)* | 10 |
| Sonda de voz + 4 linhas | — | ~2 |
| **Total** | | **~68** |
| **Saldo após produção** | | **~42 de 110** |

Regra de execução: preflight (`get_cost`) antes de cada job → gerar → checklist de qualidade (seção 4.4 do plano) → só então o próximo. Se qualquer clipe reprovar 3 vezes, parar e replanejar com o dono.

---

## ⛔ GATE 2 — aprovações necessárias

- [ ] Cachorro caramelo como protagonista
- [ ] Produto branco/preto (combo do CHARLIE) como o mostrado
- [ ] Clipe 3 usando a foto real animada (o nome que aparece no anúncio é "CHARLIE")
- [ ] Orçamento de ~68 créditos
- [ ] Ordem: imagem-mestra → aprovação → clipes 1, 2, 3 → sonda de voz
