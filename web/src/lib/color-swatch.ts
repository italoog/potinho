import type { ColorOption } from "@/db/types";

/**
 * CSS `background` pra um swatch de cor: sólido pro caso comum, ou conic-gradient
 * com fatias iguais (2 a 4) quando a opção é um filamento misturado (ColorOption.blend).
 */
export function swatchBackground(option: Pick<ColorOption, "hex" | "blend">): string {
  const colors = option.blend && option.blend.length >= 2 ? option.blend : [option.hex];
  if (colors.length === 1) return colors[0];
  const step = 360 / colors.length;
  const stops = colors.map((c, i) => `${c} ${i * step}deg ${(i + 1) * step}deg`).join(", ");
  return `conic-gradient(${stops})`;
}
