# potinho — Economia, Frete e Precificação

**Criado:** 2026-07-13 · **Origem:** investigação de frete caro (Tauá-CE) + cálculo de margem pra promoção de frete grátis.

---

## 1. Custo e preço do comedouro G — 15cm

| Item | Valor |
|---|---|
| Custo de produção | R$ 40,00 |
| Embalagem (1 caixa) | R$ 5,00 |
| Preço de venda | R$ 149,00 |
| Peso da peça (sem caixa) | 278g |
| Dimensões da peça | 150 × 186 × 186 mm (altura × largura × comprimento) |

**Pendente:** medidas (peça + caixa fechada) dos tamanhos P (5cm) e M (10cm) — só o G foi medido até agora. Dimensões/peso da caixa fechada (produto + embalagem) do G também não foram confirmadas — os valores acima são só do produto.

## 2. Taxas do Mercado Pago (Checkout Pro)

Verificado em 2026-07-13 — **taxas mudam, reconfirmar antes de usar em decisões futuras.**

| Forma de pagamento | Taxa |
|---|---|
| Pix | 0,99% |
| Cartão de crédito à vista | 4,98% |
| Cartão parcelado 12x | 4,99% |
| Débito à vista | 1,99% |

Fontes: [mercadopago.com.br/ajuda/33399](https://www.mercadopago.com.br/ajuda/33399), [calculadoradetaxas.com.br/mercado-pago/taxas](https://www.calculadoradetaxas.com.br/mercado-pago/taxas)

## 3. Por que o frete parece caro saindo de Tauá

Origem atual: Tauá-CE (`STORE_ORIGIN_CEP=63660000`). Testado com pacote 16×24×10cm via calculadora da SuperFrete (sem custo, é só consulta) — destino Av. Paulista, São Paulo.

### 3.1 Cotação real por peso (Tauá → São Paulo)

| Peso | PAC | SEDEX |
|---|---|---|
| 400g (1 peça) | R$ 71,49 | R$ 88,88 |
| 800g | R$ 73,99 | R$ 91,79 |
| 1.000g | R$ 73,99 (mesma faixa de 800g) | — |

Loggi e Jadlog **não aparecem como opção** saindo de Tauá — essas transportadoras não cobrem coleta lá.

### 3.2 Cotação real por origem (mesmo pacote, mesmo destino)

| Origem | PAC | SEDEX | Loggi |
|---|---|---|---|
| Tauá-CE (atual) | R$ 71,49 | R$ 88,88 | não oferece |
| Crateús-CE (cidade vizinha maior) | R$ 71,49 (idêntico) | R$ 88,88 (idêntico) | não oferece |
| Fortaleza-CE (capital) | R$ 22,39 | R$ 55,20 | **R$ 6,29** |

### 3.3 Conclusões

- **Não é bug nem erro de medida** — os valores batem com o peso/dimensão reais do produto e com a distância real.
- **Cidade vizinha maior (Crateús) não ajuda.** Correios trata o interior do Ceará como uma zona tarifária única — preço idêntico a Tauá até o centavo.
- **Só uma capital muda o preço de verdade.** Fortaleza reduz o PAC em ~68% e destrava Loggi/Jadlog. É o motivo mais provável de um concorrente conseguir ~R$35: provavelmente despacha de uma capital ou hub logístico, não do interior.
- **A SuperFrete já aplica desconto real** — a tabela cheia dos Correios é uns 25-30% mais cara que o preço com desconto mostrado.
- **Mini Envios (PAC Mini) não é opção pra esse produto** — limite de 300g e 4cm de altura máxima; nem o tamanho P (5cm de altura) cabe nisso.
- **A tabela dos Correios não é simétrica por direção** — o mesmo pacote de São Paulo pra Tauá custa menos (PAC R$50,18) do que de Tauá pra São Paulo.

**Se decidir mudar a origem de despacho no futuro** (ponto de coleta em Fortaleza, parceiro logístico etc.), isso teria impacto real — não é só teoria. O campo a trocar seria `STORE_ORIGIN_CEP` (e os demais `STORE_ORIGIN_*`) em `web/.env.local` e nas env vars de produção da Vercel.

## 4. Margem — frete grátis a partir de 2 peças

Frete usado no cálculo: R$73,99 (faixa 800g-1kg, Tauá → São Paulo, PAC — ver seção 3.1). Embalagem assumida como **1 caixa compartilhada** mesmo pra 2 peças (não confirmado se ela é individual por peça).

### 4.1 Uma peça (sem frete grátis — cliente paga o frete)

| | Pix | Cartão de crédito |
|---|---|---|
| Faturamento | R$ 149,00 | R$ 149,00 |
| Custo de produção | R$ 40,00 | R$ 40,00 |
| Embalagem | R$ 5,00 | R$ 5,00 |
| Taxa Mercado Pago | R$ 1,48 | R$ 7,42 |
| **Lucro** | **R$ 102,52** | **R$ 96,58** |
| **Margem** | **68,8%** | **64,8%** |

### 4.2 Duas peças (frete grátis — ela absorve o frete)

| | Pix | Cartão de crédito |
|---|---|---|
| Faturamento | R$ 298,00 | R$ 298,00 |
| Custo de produção | R$ 80,00 | R$ 80,00 |
| Embalagem | R$ 5,00 | R$ 5,00 |
| Frete | R$ 73,99 | R$ 73,99 |
| Taxa Mercado Pago | R$ 2,95 | R$ 14,84 |
| **Lucro** | **R$ 136,06** | **R$ 124,17** |
| **Margem** | **45,7%** | **41,7%** |

### 4.3 Conclusão

Mesmo no cenário mais caro (2 peças, frete grátis, cliente paga no cartão à vista), a margem fica em **41,7%** e o lucro em reais quase dobra em relação a vender 1 peça só (R$124 vs. R$97). A promoção de frete grátis a partir de 2 peças parece financeiramente sustentável.

**Nota de implementação:** o sistema de cupons já existente no site (`web/src/lib/coupons.ts`) exige que o cliente digite um código — não há hoje uma regra automática de "frete grátis a partir de N itens" baseada só na quantidade do carrinho. Se essa promoção for pra frente, precisa de uma feature nova (ou um cupom manual divulgado, como atalho mais simples).
