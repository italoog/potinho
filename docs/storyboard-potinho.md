# potinho — Storyboard de Produção

**Criado:** 2026-07-19 · **Status:** ✅ PRODUZIDO (corte bruto em `docs/midia-gerada/corte-bruto-despertador.mp4`)

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
