import { z } from "zod";

/**
 * param_schema — fonte única de verdade da personalização (PRD §8).
 * Consumido por: visualizador 3D (Épico 1), formulário dinâmico e preço (Épico 2),
 * validação do pedido (Épico 3) e gerador de 3MF (Épico 5).
 */

export const textParamSchema = z.object({
  key: z.string().min(1),
  type: z.literal("text"),
  label: z.string().min(1),
  min: z.number().int().min(0),
  max: z.number().int().min(1),
  font: z.string().min(1),
  /** Nome do node âncora no GLB (ex: "name_slot") */
  anchor: z.string().min(1),
  /** Caracteres permitidos além de letras (whitelist da fonte) */
  allowedChars: z.string().optional(),
});

export const colorOptionSchema = z.object({
  label: z.string().min(1),
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  /** Referência ao filamento real do lojista (Épico 5, M2) */
  filamentRef: z.string().optional(),
});

export const colorParamSchema = z.object({
  key: z.string().min(1),
  type: z.literal("color"),
  label: z.string().min(1),
  options: z.array(colorOptionSchema).min(1),
  /** Nomes das malhas do GLB que recebem a cor */
  targets: z.array(z.string().min(1)).min(1),
});

export const selectOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  /** Aponta para a variante do produto (ex: "15cm") quando a opção troca o modelo */
  variantRef: z.string().optional(),
  /** Acréscimo/desconto em centavos */
  priceDelta: z.number().int().default(0),
});

export const selectParamSchema = z.object({
  key: z.string().min(1),
  type: z.literal("select"),
  label: z.string().min(1),
  options: z.array(selectOptionSchema).min(1),
});

export const paramSchema = z.discriminatedUnion("type", [
  textParamSchema,
  colorParamSchema,
  selectParamSchema,
]);

export const productParamSchema = z.array(paramSchema);

export const variantSchema = z.object({
  /** Identificador estável referenciado por selectOption.variantRef */
  ref: z.string().min(1),
  label: z.string().min(1),
  /** URL do GLB otimizado para web */
  modelUrl: z.string().min(1),
  /** Caminho do 3MF de produção (Épico 5) */
  productionFile: z.string().optional(),
  priceDelta: z.number().int().default(0),
  /** Ex: "15cm de largura" — exibido no visualizador (V-04) */
  dimensions: z.string().min(1),
});

export const variantsSchema = z.array(variantSchema).min(1);

/** Configuração imutável persistida no pedido (P-03): { pet_name: "THOR", color: "#1E5AA8", size: "15cm" } */
export const orderConfigurationSchema = z.record(z.string(), z.string());

export const customerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  address: z.object({
    street: z.string().min(1),
    number: z.string().min(1),
    complement: z.string().optional(),
    neighborhood: z.string().min(1),
    city: z.string().min(1),
    state: z.string().length(2),
    zip: z.string().regex(/^\d{5}-?\d{3}$/),
  }),
});

export type TextParam = z.infer<typeof textParamSchema>;
export type ColorParam = z.infer<typeof colorParamSchema>;
export type SelectParam = z.infer<typeof selectParamSchema>;
export type Param = z.infer<typeof paramSchema>;
export type ProductParamSchema = z.infer<typeof productParamSchema>;
export type Variant = z.infer<typeof variantSchema>;
export type OrderConfiguration = z.infer<typeof orderConfigurationSchema>;
export type Customer = z.infer<typeof customerSchema>;

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "production",
  "shipped",
  "delivered",
  "canceled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PRODUCT_STATUSES = ["draft", "published"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
