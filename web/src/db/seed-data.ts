import type { NewProductRow } from "./schema";

/**
 * Produto-piloto do MVP (PRD §1.3 e §8): Comedouro Pet Elevado com Nome Personalizado.
 * Paleta = filamentos disponíveis do lojista. Âncora/fonte = contrato com o Épico 5.
 */
export const comedouroPet: Omit<NewProductRow, "id" | "createdAt" | "updatedAt"> = {
  slug: "comedouro-pet",
  name: "Comedouro Pet Elevado com Nome",
  description:
    "Comedouro elevado impresso em 3D com o nome do seu pet gravado. " +
    "Personalize o nome, a cor e o tamanho — e veja o resultado em 3D antes de comprar.",
  photos: [
    "/products/comedouro-pet/montado.png",
    "/products/comedouro-pet/IMG20260309141237.webp",
    "/products/comedouro-pet/tigela.webp",
  ],
  basePrice: 8990, // R$ 89,90
  status: "published",
  variants: [
    {
      ref: "15cm",
      label: "M — 15cm",
      modelUrl: "/models/comedouro-pet/15cm.glb",
      productionFile: "assets/models/comedouro-pet/15cm.3mf",
      priceDelta: 0,
      dimensions: "15cm de largura",
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
    {
      key: "color_base",
      type: "color",
      label: "Cor da base",
      options: [
        { label: "Cinza", hex: "#9E9E9E" },
        { label: "Azul", hex: "#1E5AA8" },
        { label: "Rosa", hex: "#E85D9A" },
        { label: "Preto", hex: "#1A1A1A" },
        { label: "Branco", hex: "#F4F4F4" },
      ],
      targets: ["base_mesh"],
    },
    {
      // Parte "AZUL" do 3MF: faixa decorativa inferior da base (a tigela é de inox, não impressa)
      key: "color_band",
      type: "color",
      label: "Cor da faixa",
      options: [
        { label: "Azul", hex: "#1E5AA8" },
        { label: "Rosa", hex: "#E85D9A" },
        { label: "Preto", hex: "#1A1A1A" },
        { label: "Branco", hex: "#F4F4F4" },
        { label: "Verde", hex: "#2E8B57" },
      ],
      targets: ["bowl_mesh"],
    },
    // O nome é GRAVADO em negativo no produto (não é colorido) —
    // o visualizador simula a gravação com um tom mais escuro da cor da base.
    {
      key: "size",
      type: "select",
      label: "Tamanho",
      options: [{ label: "M — 15cm", value: "15cm", variantRef: "15cm", priceDelta: 0 }],
    },
  ],
};
