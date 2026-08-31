import { AREA_COLORS, type AreaColor } from "@lifedesk/contracts";

/**
 * The fixed eight-hue area palette.
 *
 * Reference an area's colour by key, never by hex at a call site — that's what
 * keeps an area looking identical in every list, panel, and chart.
 *
 * These are CSS variables so light and dark each get a hand-tuned value.
 * See .claude/rules/design-tokens.md.
 */

export const AREA_COLOR_VAR: Record<AreaColor, string> = {
  clay: "var(--area-clay)",
  amber: "var(--area-amber)",
  olive: "var(--area-olive)",
  teal: "var(--area-teal)",
  indigo: "var(--area-indigo)",
  plum: "var(--area-plum)",
  rose: "var(--area-rose)",
  slate: "var(--area-slate)",
};

export const AREA_COLOR_LABEL: Record<AreaColor, string> = {
  clay: "Clay",
  amber: "Amber",
  olive: "Olive",
  teal: "Teal",
  indigo: "Indigo",
  plum: "Plum",
  rose: "Rose",
  slate: "Slate",
};

export const AREA_COLOR_OPTIONS = AREA_COLORS.map((value) => ({
  value,
  label: AREA_COLOR_LABEL[value],
  cssVar: AREA_COLOR_VAR[value],
}));

/**
 * Pick the next unused colour so two areas never collide. Falls back to
 * cycling once all eight are taken.
 */
export function nextAreaColor(used: readonly AreaColor[]): AreaColor {
  return AREA_COLORS.find((color) => !used.includes(color)) ?? AREA_COLORS[used.length % 8]!;
}
