# Prompt — Site Cinematográfico POTINHO

## Briefing

Construa um site de e-commerce cinematográfico para **POTINHO** — marca de comedouros elevados personalizáveis para pets, com gravação do nome do pet.

## Logo

Usar a logo da Potinho anexada (assim que o arquivo for enviado, incorporar nas telas do site e como marca d'água/selo discreto nos vídeos).

## Visuais — Seedance 2.0 via Higgsfield MCP (modo std, 1080p, sem áudio)

Primeiro gerar **UMA imagem de lookbook**: um cachorro e um gato (em still separado ou lado a lado) comendo em um comedouro elevado Potinho, ambiente doméstico aconchegante, luz natural suave, cores vivas — usar essa imagem como referência em todos os clipes para manter consistência do produto.

1. **HERO** — 16:9, o comedouro sobre uma mesa de madeira clara em uma sala iluminada por luz da manhã; um cachorro se aproxima animado e começa a comer; corte suave para um gato fazendo o mesmo em outro comedouro ao lado. Movimento de câmera lento, clima caseiro e afetuoso.
2. **GIRO DO PRODUTO** — clipes 1:1, um por combinação de cor: o comedouro em turntable 360° limpo sobre fundo neutro (bege claro ou branco), destacando as duas cores da peça e o acabamento fosco.
3. **MACRO DE PERSONALIZAÇÃO** — 16:9, close extremo percorrendo a gravação do nome do pet na peça, textura do material, encaixes e acabamento — mostrando o cuidado no detalhe.

## Site

- **Hero** com vídeo do cachorro/gato comendo, nome "POTINHO" em tipografia arredondada e grande, contagem regressiva do drop (com toggle fácil no código para desativar/reconfigurar depois — deixar como flag configurável, não hardcoded).
- **Grade de produto**: o comedouro elevado, disponível em 3 tamanhos, com:
  - Seletor de tamanho: Pequeno, Médio, Grande
  - Preços:
    - Grande — **R$ 149,00** (confirmado)
    - Médio — **R$ 119,00** _(valor provisório — ajustar depois)_
    - Pequeno — **R$ 99,00** _(valor provisório — ajustar depois)_
  - Seletor de até 2 cores (paleta: branco, preto, rosa, cinza, azul, bege, marrom, verde-oliva)
  - Campo de personalização com o nome do pet
  - Botão "Adicionar ao carrinho" (checkout de demonstração, sem processamento real)
  - Card com autoplay do giro 360° ao passar o mouse (hover-to-play)
- **Seção de personalização** com o vídeo macro da gravação do nome — manifesto tipo "Feito para o seu pet, com o nome dele."
- Ícone de carrinho fixo (sticky)
- Faixa "marquee" rolando entre seções com frases como "Feito sob medida" / "Direto pra casa dele"
- Captura de e-mail "Avise-me" para cores esgotadas

## Design

- Paleta viva e lúdica (tons pastel + as cores reais do estoque: branco, preto, rosa, cinza, azul, bege, marrom, verde-oliva)
- Tipografia arredondada e amigável
- Ilustrações simples de patinhas/ossinhos como elementos gráficos sutis

## Validação

Lançar em localhost e confirmar que o hover-to-play funciona em cada card antes de dizer que terminou.

---
