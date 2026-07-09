import type { NewProductRow } from "./schema";
import type { ColorOption } from "./types";

/**
 * Produto-piloto do MVP (PRD §1.3 e §8): Comedouro Pet Elevado com Nome Personalizado.
 * Paleta = filamentos disponíveis do lojista. Âncora/fonte = contrato com o Épico 5.
 */

/** Paleta real do estoque (mesma de site-config.ts#stockColors) — base e faixa usam as mesmas cores, na mesma ordem. */
const filamentColors: ColorOption[] = [
  { label: "Branco", hex: "#F4F4F4" },
  { label: "Preto", hex: "#1A1A1A" },
  { label: "Rosa", hex: "#E88BB1" },
  { label: "Cinza", hex: "#9E9E9E" },
  { label: "Azul", hex: "#3D6EB5" },
  { label: "Bege", hex: "#E8D9C8" },
  { label: "Marrom", hex: "#5A4032" },
  { label: "Verde-oliva", hex: "#708238", soldOut: true },
];
export const comedouroPet: Omit<NewProductRow, "id" | "createdAt" | "updatedAt"> = {
  slug: "comedouro-pet",
  name: "Comedouro Pet Elevado com Nome",
  description:
    "Comedouro elevado impresso em 3D com o nome do pet gravado em relevo — não é adesivo, " +
    "não é pintura. O nome, a cor e o tamanho ficam do jeito escolhido, e o resultado aparece " +
    "em 3D antes da compra fechar.",
  photos: [
    "/products/comedouro-pet/montado.png",
    "/products/comedouro-pet/IMG20260309141237.webp",
    "/products/comedouro-pet/tigela.webp",
  ],
  basePrice: 0, // não é mais usado no cálculo — cada tamanho tem seu preço final em variants[].price
  status: "published",
  variants: [
    {
      ref: "5cm",
      label: "P — 5cm",
      // ponytail: reaproveita o GLB de 15cm até o arquivo real de 5cm chegar (2 novos tamanhos a caminho)
      modelUrl: "/models/comedouro-pet/15cm.glb",
      price: 9900, // R$ 99,00
      discountType: null,
      discountValue: null,
      dimensions: "5cm de altura",
      // ponytail: caixa/peso estimados — troque pelas medidas reais da embalagem (cota Melhor Envio)
      shipping: { widthCm: 12, heightCm: 10, lengthCm: 12, weightKg: 0.3 },
    },
    {
      ref: "10cm",
      label: "M — 10cm",
      // ponytail: idem — placeholder até o GLB de 10cm chegar
      modelUrl: "/models/comedouro-pet/15cm.glb",
      price: 11900, // R$ 119,00
      discountType: null,
      discountValue: null,
      dimensions: "10cm de altura",
      // ponytail: caixa/peso estimados — troque pelas medidas reais da embalagem
      shipping: { widthCm: 16, heightCm: 14, lengthCm: 16, weightKg: 0.5 },
    },
    {
      ref: "15cm",
      label: "G — 15cm",
      modelUrl: "/models/comedouro-pet/15cm.glb",
      productionFile: "assets/models/comedouro-pet/15cm.3mf",
      price: 14900, // R$ 149,00
      discountType: null,
      discountValue: null,
      dimensions: "15cm de altura",
      // ponytail: caixa/peso estimados — troque pelas medidas reais da embalagem
      shipping: { widthCm: 20, heightCm: 18, lengthCm: 20, weightKg: 0.8 },
    },
  ],
  paramSchema: [
    {
      key: "pet_name",
      type: "text",
      label: "Nome do pet",
      min: 2,
      max: 10,
      // Fonte web (aprox. da Impact usada na produção — ver asset-manifest.json)
      font: "Anton",
      anchor: "name_slot",
    },
    // O nome é GRAVADO em negativo no produto (não é colorido) —
    // o visualizador simula a gravação com um tom mais escuro da cor de cima (color_base).
    {
      key: "size",
      type: "select",
      label: "Tamanho",
      // priceDelta fica todo na variante (fonte única) — a opção só aponta pra ela
      options: [
        { label: "P — 5cm", value: "5cm", variantRef: "5cm", priceDelta: 0 },
        { label: "M — 10cm", value: "10cm", variantRef: "10cm", priceDelta: 0 },
        { label: "G — 15cm", value: "15cm", variantRef: "15cm", priceDelta: 0 },
      ],
    },
    {
      // base_mesh = corpo da peça, onde o nome é gravado (rótulo "de cima" — ver PotinhoViewer.tsx)
      key: "color_base",
      type: "color",
      label: "Cor de cima",
      options: filamentColors,
      targets: ["base_mesh"],
    },
    {
      // bowl_mesh = faixa decorativa inferior (a tigela em si é de inox, não impressa)
      key: "color_band",
      type: "color",
      label: "Cor da base",
      options: filamentColors,
      targets: ["bowl_mesh"],
    },
  ],
};
