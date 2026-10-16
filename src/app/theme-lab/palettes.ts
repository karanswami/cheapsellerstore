export const PALETTES = [
  { id: "violet", name: "Neon Violet", note: "Obsidian + violet + cyan. Classic esports.", swatch: ["#0a0a14", "#8b5cf6", "#22d3ee"] },
  { id: "lime", name: "Toxic Lime", note: "Carbon + acid lime + magenta. Loud, modern.", swatch: ["#090c09", "#a3e635", "#e879f9"] },
  { id: "ember", name: "Crimson Ember", note: "Black + red + amber. Aggressive, hot.", swatch: ["#0d0908", "#f43f3f", "#f59e0b"] },
  { id: "arctic", name: "Arctic Pulse", note: "Midnight navy + ice blue + pink. Clean, techy.", swatch: ["#070d17", "#38bdf8", "#f472b6"] },
  { id: "gold", name: "Royal Gold", note: "Warm black + gold + violet. Premium, VIP.", swatch: ["#0b0a08", "#f5b942", "#a78bfa"] },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];
