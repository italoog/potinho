---
name: potinho-design
description: Design system da marca potinho (e-commerce de comedouros elevados personalizados). This skill should be used when creating or modifying ANY page, section, or UI component in the web app — new pages (checkout, pedido, admin, institucional), new sections on the home, e-mails transacionais, or reviews of visual consistency. Contains brand tokens, typography, component recipes (buttons, cards, chips, inputs), layout, motion, and accessibility rules that keep new UI indistinguishable from the existing site.
---

# potinho — Design System

Sistema de design da marca **potinho**: comedouros elevados impressos em 3D, personalizados com o nome do pet. Todo novo UI deve parecer que sempre existiu no site. Na dúvida, abrir um componente existente em `web/src/components/potinho/` e copiar o padrão.

## 1. Essência da marca

- **Voz:** afetuosa, caseira, direta. Fala com o tutor sobre "ele" (o pet). Ex.: "direto pra casa dele", "feito para o seu pet, com o nome dele."
- **Idioma:** pt-BR informal ("pra", "pro" são bem-vindos em copy).
- **lowercase é identidade:** títulos, botões e a própria marca ("potinho") são sempre minúsculos (`lowercase` no Tailwind). Exceções: o NOME DO PET é sempre `uppercase tracking-widest` (referência à gravação na peça), e labels de seção usam `uppercase tracking-widest`.
- **Emojis com parcimônia:** no máximo um 🐾 em CTA principal.
- **Tom visual:** quente, artesanal, cinematográfico. Sombras em tom chocolate, nunca preto puro. Cantos sempre muito arredondados.

## 2. Tokens

Definidos em `web/src/app/globals.css` no bloco `@theme inline` (Tailwind v4 — novos tokens entram lá, nunca hardcoded nos componentes).

### Cores da marca (UI)

| Token Tailwind | Hex | Papel |
|---|---|---|
| `potinho-chocolate` | `#5A4032` | Cor primária: CTAs, títulos de seção, ícones, footer |
| `potinho-bege` | `#E8D9C8` | Superfície de destaque, bordas, texto sobre chocolate |
| `potinho-fundo` | `#FAF8F5` | Fundo de página e de inputs |
| `potinho-cinza` | `#B7AEA5` | Bordas sutis, rings de swatches, placeholder |
| `potinho-texto` | `#2D2D2D` | Texto principal; overlays escuros (`potinho-texto/40` + blur) |

Hierarquia de texto por opacidade: corpo `text-potinho-texto`, secundário `/70` ou `/75`, terciário `/60`, legendas `/50`–`/55`. Erros: `text-rose-500`; badge de contagem do carrinho: `bg-rose-400`.

### Sombras

| Classe | Uso |
|---|---|
| `shadow-potinho-card` | Cards e painéis brancos (customizer, cards de produto) |
| `shadow-potinho-media` | Molduras de vídeo/imagem grandes |
| `shadow-lg` | Elementos flutuantes pequenos (logo, botão do carrinho, CTA hero) |

### Paleta de estoque (produto ≠ UI)

As 8 cores de filamento vivem em `stockColors` (`web/src/lib/site-config.ts`) com `id`, `label`, `hex`, `light?` (precisa de ring no seletor) e `soldOut?` (dispara captura de e-mail). **Nunca duplicar esses hex em componentes** — sempre importar de `site-config.ts` ou ler do `paramSchema` do produto. Cores de estoque aparecem só via `style={{ backgroundColor: hex }}` em swatches circulares.

### Raios

`rounded-full` (botões, pills, swatches, badges) · `rounded-3xl` (cards, seções, molduras) · `rounded-2xl` (elementos internos: inputs, opções de tamanho, itens de lista).

## 3. Tipografia

- **Fonte:** Poppins (400/500/600/700), carregada em `web/src/app/layout.tsx` como `--font-poppins`. Ativar por página no elemento raiz: `font-[family-name:var(--font-poppins)]`.
- **Escala:**
  - Marca no hero: `text-5xl sm:text-7xl md:text-8xl font-bold lowercase tracking-tight`
  - Título de seção (h2): `text-3xl sm:text-5xl font-bold lowercase text-potinho-chocolate`
  - Título de card/painel (h3): `text-lg`–`text-2xl font-bold lowercase`
  - Corpo: `text-base`/`text-lg`, secundário com opacidade
  - Eyebrow/legend: `text-xs`/`text-sm font-semibold uppercase tracking-widest text-potinho-chocolate`
  - Preço: `font-bold text-potinho-chocolate` (destaque: `text-3xl`)

## 4. Receitas de componentes

Copiar as strings de classe exatamente; variar só o necessário.

### Botão primário (pill)
```tsx
<button className="rounded-full bg-potinho-chocolate px-8 py-4 text-base font-semibold lowercase text-potinho-bege transition-colors hover:bg-potinho-texto">
```
Menor: `px-5 py-2.5 text-sm`. Desabilitado: `disabled:cursor-not-allowed disabled:opacity-40` (com `enabled:hover:...`).

### Botão secundário (outline)
```tsx
<button className="rounded-full border-2 border-potinho-chocolate px-6 py-3 text-sm font-semibold lowercase text-potinho-chocolate transition-colors hover:bg-potinho-chocolate hover:text-potinho-bege">
```

### Botão invertido (sobre foto/vídeo escuro)
```tsx
<a className="rounded-full bg-white px-8 py-4 text-base font-semibold lowercase text-potinho-chocolate shadow-lg transition-transform hover:scale-105">
```

### Card
```tsx
<article className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-potinho-card transition-transform duration-300 hover:-translate-y-1">
```
Painel de formulário: `rounded-3xl bg-white p-6 shadow-potinho-card sm:p-8`. Seção destacada sobre o fundo: `rounded-3xl bg-white/70 p-6 sm:p-8`.

### Input de texto
```tsx
<input className="w-full rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-5 py-3.5 text-lg font-semibold uppercase tracking-widest text-potinho-texto placeholder:normal-case placeholder:font-normal placeholder:tracking-normal placeholder:text-potinho-cinza focus:border-potinho-chocolate focus:outline-none" />
```
(uppercase/tracking só quando o valor é o nome do pet; campos comuns usam texto normal.)

### Opção selecionável (toggle/chip)
Estado via `aria-pressed` + classes condicionais:
```tsx
className={`... rounded-2xl border-2 transition-colors ${
  active ? "border-potinho-chocolate bg-potinho-fundo" : "border-potinho-bege hover:border-potinho-cinza"
}`}
```

### Swatch de cor
```tsx
<button title={c.label} aria-pressed={active}
  className={`h-10 w-10 rounded-full ring-1 ring-potinho-cinza/30 transition-transform hover:scale-110 ${
    active ? "outline outline-[3px] outline-offset-2 outline-potinho-chocolate" : ""}`}
  style={{ backgroundColor: c.hex }} />
```
Cores com `light: true` precisam de `ring-1 ring-potinho-cinza`.

### Badge/eyebrow
```tsx
<span className="w-fit rounded-full bg-potinho-bege px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-potinho-chocolate">
```
Sobre mídia: `bg-white/85 backdrop-blur text-potinho-chocolate` ou `bg-potinho-chocolate text-potinho-bege`.

### Nota informativa
```tsx
<p className="rounded-2xl bg-potinho-fundo px-4 py-3 text-xs leading-relaxed text-potinho-texto/70">
```

### Fieldset de formulário
```tsx
<fieldset>
  <legend className="mb-3 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">tamanho</legend>
  ...
</fieldset>
```

### Gaveta/modal
Overlay `fixed inset-0 z-50` com `bg-potinho-texto/40 backdrop-blur-sm` clicável para fechar + painel `bg-potinho-fundo shadow-2xl`, `role="dialog"` e `aria-label`. Ver `CartUI.tsx`.

### Ícones
`PawIcon` e `BoneIcon` (SVG `currentColor`) exportados de `web/src/components/potinho/Marquee.tsx` — **reusar, não redesenhar**. Como decoração de seção: absolutos, `text-potinho-bege`, levemente rotacionados (`rotate-[-15deg]`, `rotate-12`), tamanhos `h-10`–`h-12`. Como bullet: `h-4 w-4 shrink-0 text-potinho-chocolate`.

### Marquee
Entre seções, usar `<Marquee />` / `<Marquee inverted />` (alterna chocolate↔bege). Frases em `marqueePhrases` no `site-config.ts`.

## 5. Layout

- **Container de seção:** `mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20`.
- **Mobile-first:** base = celular; `sm:` e `lg:` expandem. Grids: `grid gap-6 sm:grid-cols-2 lg:grid-cols-4` (cards) ou `grid items-center gap-10 lg:grid-cols-2` (mídia + texto).
- **Hero:** `min-h-[92vh]`, vídeo `absolute inset-0 object-cover` + overlay `bg-gradient-to-t from-potinho-texto/70 via-potinho-texto/20 to-potinho-texto/30`, conteúdo `z-10` centrado.
- **Footer:** `bg-potinho-chocolate text-potinho-bege`, logo redonda, links `hover:underline`.
- **Elementos sticky:** botão do carrinho `fixed right-5 top-5 z-40 h-14 w-14 rounded-full` (não criar outro elemento fixo nesse canto).
- Camadas z: conteúdo hero `z-10` · carrinho fixo `z-40` · gaveta/modais `z-50`.

## 6. Vídeo e mídia

- Vídeos sempre `muted loop playsInline` (+ `autoPlay` quando ambiente, `poster` sempre que houver).
- Hover-to-play (padrão TurntableCard): desktop `onMouseEnter` play / `onMouseLeave` pausa+reset; touch alterna no toque; `preload="metadata"`; `.play().catch()` para autoplay bloqueado; hint visível quando pausado ("passe o mouse · giro 360°" / "toque · giro 360°").
- Assets de marketing (vídeos, posters) são referenciados só via `site-config.ts`.
- Logo: `/brand/logo.png`, sempre `rounded-full object-cover`.
- Componentes pesados (three.js) entram com `next/dynamic` + `ssr: false` e um placeholder `rounded-3xl bg-gradient-to-b from-white to-potinho-bege/60` do mesmo tamanho.

## 7. Motion

- **Entrada:** classe `potinho-fade-up` (definida em `globals.css`).
- **Hover:** cards `hover:-translate-y-1`, botões flutuantes/swatches `hover:scale-105`/`110`, botões sólidos mudam cor (`hover:bg-potinho-texto`).
- **Scroll:** `scrollIntoView({ behavior: "smooth", block: "center" })` para levar o usuário ao customizer.
- **Novas animações:** keyframes prefixados `potinho-*` em `globals.css`, sempre com fallback `@media (prefers-reduced-motion: reduce)`.
- Feedback temporário de ação (ex.: "adicionado ✓") por ~2,5s via state + `setTimeout`.

## 8. Acessibilidade e testes

- Toggles usam `aria-pressed`; botões só-ícone usam `aria-label` descritivo em pt-BR minúsculo.
- Decoração (marquee, ícones soltos) recebe `aria-hidden`.
- Foco visível: `focus:border-potinho-chocolate` em inputs; não remover outline sem substituto.
- Elementos que testes E2E tocam ganham `data-testid` em kebab-case (`add-to-cart`, `cart-button`, `go-to-checkout`, `turntable-{id}`).
- Preços: sempre centavos inteiros + `formatBRL` de `web/src/lib/money.ts` — nunca formatar moeda na mão.

## 9. Arquitetura (onde vive o quê)

| Conteúdo | Arquivo |
|---|---|
| Tokens CSS/tema | `web/src/app/globals.css` (`@theme inline`) |
| Config editável do lojista (countdown, cores de estoque, vídeos, frases) | `web/src/lib/site-config.ts` |
| Produto, variantes, `paramSchema` | `web/src/lib/products.ts` |
| Preço/moeda | `web/src/lib/pricing.ts`, `web/src/lib/money.ts` |
| Componentes da marca | `web/src/components/potinho/` |
| Viewer 3D | `web/src/components/viewer/` |

Valores que o lojista pode querer mudar (datas, preços, frases, flags) **nunca** ficam hardcoded em componente — vão para `site-config.ts` como o `dropCountdown` (`enabled: boolean`).

## 10. Não fazer

- ❌ Title Case ou CAIXA ALTA em títulos/botões (exceto nome do pet e eyebrows).
- ❌ Sombras pretas (`shadow-black/...`) ou novas sombras arbitrárias — usar os tokens `shadow-potinho-*`.
- ❌ Novas cores fora dos tokens da marca + paleta de estoque (exceção: `rose-400/500` para erro/badge).
- ❌ Cantos retos ou `rounded-md`/`rounded-lg` — o mínimo visual da marca é `rounded-2xl`.
- ❌ Outra fonte que não Poppins nas páginas da marca.
- ❌ Duplicar hex de estoque, preços ou frases em componentes.
- ❌ Ícones de bibliotecas externas quando `PawIcon`/`BoneIcon` ou um SVG inline de 3 linhas resolvem.

## Checklist antes de entregar UI nova

1. Tudo minúsculo? Nome do pet em uppercase?
2. Só tokens `potinho-*` (+ estoque via `site-config`)?
3. `rounded-2xl`+ e sombra chocolate?
4. Mobile-first, testado em viewport estreito?
5. `aria-*` nos controles e `data-testid` no que o E2E toca?
6. Nada hardcoded que o lojista vá querer editar?
