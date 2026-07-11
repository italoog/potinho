/**
 * Configuração central da home cinematográfica POTINHO.
 * Tudo que é "editável pelo lojista" (countdown, preços, cores, vídeos) vive aqui.
 */

/**
 * Contagem regressiva do drop.
 * Para DESATIVAR: enabled: false.
 * Para reconfigurar: mude target (ISO 8601 com fuso de Brasília).
 */
export const dropCountdown = {
  enabled: false,
  target: "2026-07-31T20:00:00-03:00",
  label: "primeiro drop",
} as const;

export interface StockColor {
  id: string;
  label: string;
  hex: string;
  /** Cor clara precisa de borda no seletor. */
  light?: boolean;
  /** Esgotada → dispara captura de e-mail "Avise-me". */
  soldOut?: boolean;
}

/** Paleta real do estoque de filamentos. */
export const stockColors: StockColor[] = [
  { id: "branco", label: "Branco", hex: "#F4F4F4", light: true },
  { id: "preto", label: "Preto", hex: "#1A1A1A" },
  { id: "rosa", label: "Rosa", hex: "#E88BB1" },
  { id: "cinza", label: "Cinza", hex: "#9E9E9E" },
  { id: "azul", label: "Azul", hex: "#3D6EB5" },
  { id: "bege", label: "Bege", hex: "#E8D9C8", light: true },
  { id: "marrom", label: "Marrom", hex: "#5A4032" },
  { id: "verde-oliva", label: "Verde-oliva", hex: "#708238", soldOut: true },
];

export interface TurntableClip {
  id: string;
  /** Nome gravado no clipe (só ilustrativo). */
  petName: string;
  colorTopId: string;
  colorBottomId: string;
  video: string;
  highlight?: boolean;
}

/** Cards da grade com giro 360° (hover-to-play). */
export const turntableClips: TurntableClip[] = [
  {
    id: "bege-marrom",
    petName: "THOR",
    colorTopId: "bege",
    colorBottomId: "marrom",
    video: "/videos/giro-bege-marrom.mp4",
    highlight: true,
  },
  {
    id: "branco-preto",
    petName: "LUNA",
    colorTopId: "branco",
    colorBottomId: "preto",
    video: "/videos/giro-branco-preto.mp4",
  },
  {
    id: "rosa-branco",
    petName: "MEL",
    colorTopId: "rosa",
    colorBottomId: "branco",
    video: "/videos/giro-rosa-branco.mp4",
  },
  {
    id: "azul-cinza",
    petName: "BOB",
    colorTopId: "azul",
    colorBottomId: "cinza",
    video: "/videos/giro-azul-cinza.mp4",
  },
];

export const heroVideo = {
  src: "/videos/hero.mp4",
  poster: "/videos/hero-poster.webp",
} as const;

export const macroVideo = {
  src: "/videos/macro-personalizacao.mp4",
  poster: "/videos/macro-poster.webp",
} as const;

export const marqueePhrases = [
  "feito sob medida",
  "direto pra casa dele",
  "com o nome dele",
  "impresso com carinho",
  "tigela de inox removível",
];

export function getColor(id: string): StockColor {
  const c = stockColors.find((c) => c.id === id);
  if (!c) throw new Error(`Cor desconhecida: ${id}`);
  return c;
}
