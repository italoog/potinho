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
  photos: [],
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
      font: "Poppins-Bold",
      anchor: "name_slot",
    },
    {
      key: "color",
      type: "color",
      label: "Cor",
      options: [
        { label: "Azul", hex: "#1E5AA8" },
        { label: "Rosa", hex: "#E85D9A" },
        { label: "Preto", hex: "#1A1A1A" },
        { label: "Branco", hex: "#F4F4F4" },
        { label: "Verde", hex: "#2E8B57" },
      ],
      targets: ["base_mesh"],
    },
    {
      key: "size",
      type: "select",
      label: "Tamanho",
      options: [{ label: "M — 15cm", value: "15cm", variantRef: "15cm", priceDelta: 0 }],
    },
  ],
};
