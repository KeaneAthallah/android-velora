/** HSL triplet → RN color string. React Native accepts `hsl(h, s%, l%)` and
 *  `hsla(h, s%, l%, a)`. */
export function hsl(triplet: string, alpha?: number): string {
  const [h, s, l] = triplet.split(" ").map((v) => v.replace("%", ""));
  if (alpha != null && alpha < 1) {
    return `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
  }
  return `hsl(${h}, ${s}%, ${l}%)`;
}

/** Hex shorthand so small helpers can return hex when a color is used in many
 *  places. */
export function hex(triplet: string): string {
  // Map the known Velora triplets to their hex equivalents for ergonomics.
  const map: Record<string, string> = {
    "251 65% 54%": "#5B3FD6",
    "252 26% 96%": "#F4F3F8",
    "0 0% 100%": "#FFFFFF",
    "248 16% 10%": "#16151D",
    "248 10% 26%": "#3D3B4A",
    "248 7% 44%": "#6B6879",
    "252 19% 91%": "#E4E1EF",
    "252 12% 82%": "#D3CFE2",
    "153 73% 28%": "#0F7A4D",
    "34 100% 30%": "#9A5B00",
    "4 76% 40%": "#B3261E",
    "205 78% 34%": "#0B5FA5",
  };
  return map[triplet] ?? hsl(triplet);
}

/* ----------------------------------------------------------------
 *  Light palette — warm paper, ink navigation, one violet signal.
 *  Mirrors frontend-velora/app/globals.css (:root).
 * ---------------------------------------------------------------- */
export const light = {
  // Surfaces
  canvas: hsl("252 26% 96%"), // #F4F3F8
  canvasDeep: hsl("252 24% 93%"),
  surface: hsl("0 0% 100%"), // white card
  surfaceMuted: hsl("252 30% 97%"),
  surfaceStrong: hsl("252 24% 93.5%"),
  overlay: hsl("0 0% 0%", 0.5),

  // Ink
  ink: hsl("248 16% 10%"), // #16151D
  inkSecondary: hsl("248 10% 26%"), // #3D3B4A
  inkMuted: hsl("248 7% 44%"), // #6B6879
  inkInverse: hsl("250 40% 97%"),
  inkInverseMuted: hsl("250 18% 74%"),

  // Structure
  border: hsl("252 19% 91%"), // #E4E1EF
  borderStrong: hsl("252 12% 82%"), // #D3CFE2
  input: hsl("252 14% 86%"),
  ring: hsl("251 65% 54%"), // #5B3FD6
  ringPressed: hsl("251 65% 46%"),

  // Signal
  primary: hsl("251 65% 54%"), // #5B3FD6
  primaryHover: hsl("251 65% 46%"),
  primaryPress: hsl("251 65% 40%"),
  primaryForeground: hsl("0 0% 100%"),
  primarySoft: hsl("252 75% 95%"),

  // Neutrals / secondary
  secondary: hsl("252 22% 95%"),
  secondaryForeground: hsl("248 16% 16%"),
  muted: hsl("252 24% 95.5%"),
  mutedForeground: hsl("248 7% 39%"),
  placeholder: hsl("248 6% 52%"),

  // Semantics
  success: hsl("153 73% 28%"),
  successBg: hsl("152 45% 94%"),
  successBorder: hsl("152 35% 84%"),
  warning: hsl("34 100% 30%"),
  warningBg: hsl("38 100% 94%"),
  warningBorder: hsl("37 82% 82%"),
  danger: hsl("4 76% 40%"),
  dangerHover: hsl("4 76% 34%"),
  dangerBg: hsl("3 100% 96%"),
  dangerBorder: hsl("3 84% 89%"),
  info: hsl("205 78% 34%"),
  infoBg: hsl("203 100% 95%"),
  infoBorder: hsl("203 78% 86%"),
};

/* ----------------------------------------------------------------
 *  Dark palette — deep indigo canvas, near-white ink, brighter violet.
 *  Mirrors .dark in globals.css.
 * ---------------------------------------------------------------- */
export const dark = {
  // Surfaces
  canvas: hsl("250 30% 8%"), // #0f0d1c
  canvasDeep: hsl("250 28% 9.5%"),
  surface: hsl("250 26% 11%"), // card
  surfaceMuted: hsl("250 22% 14.5%"),
  surfaceStrong: hsl("250 20% 18%"),
  overlay: hsl("0 0% 0%", 0.55),

  // Ink
  ink: hsl("250 30% 97%"), // near-white
  inkSecondary: hsl("250 16% 74%"),
  inkMuted: hsl("250 12% 60%"),
  inkInverse: hsl("250 30% 9%"),
  inkInverseMuted: hsl("250 14% 64%"),

  // Structure
  border: hsl("250 20% 21%"),
  borderStrong: hsl("250 18% 30%"),
  input: hsl("250 18% 28%"),
  ring: hsl("251 80% 70%"),
  ringPressed: hsl("251 80% 78%"),

  // Signal
  primary: hsl("251 80% 70%"), // brighter violet
  primaryHover: hsl("251 80% 74%"),
  primaryPress: hsl("251 80% 80%"),
  primaryForeground: hsl("250 35% 9%"),
  primarySoft: hsl("251 40% 22%"),

  // Neutrals / secondary
  secondary: hsl("250 22% 15%"),
  secondaryForeground: hsl("250 30% 94%"),
  muted: hsl("250 22% 14%"),
  mutedForeground: hsl("250 12% 65%"),
  placeholder: hsl("250 10% 52%"),

  // Semantics
  success: hsl("152 48% 58%"),
  successBg: hsl("153 40% 14%"),
  successBorder: hsl("153 28% 24%"),
  warning: hsl("38 88% 62%"),
  warningBg: hsl("33 52% 14%"),
  warningBorder: hsl("33 42% 25%"),
  danger: hsl("4 82% 68%"),
  dangerHover: hsl("4 82% 74%"),
  dangerBg: hsl("4 45% 14%"),
  dangerBorder: hsl("4 35% 26%"),
  info: hsl("203 82% 66%"),
  infoBg: hsl("205 50% 14%"),
  infoBorder: hsl("205 40% 25%"),
};
