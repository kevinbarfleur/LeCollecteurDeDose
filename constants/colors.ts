import type { CardTier } from "~/types/card";

export interface TierColorConfig {
  primary: string;
  secondary: string;
  bg: string;
  glow: string;
  glowRgba: string;
}

export const TIER_COLORS: Record<CardTier, TierColorConfig> = {
  T0: {
    primary: "#c9a227", // Gold - Lueur chaude
    secondary: "#f5d76e",
    bg: "#6d5a2a", // Ambre sombre
    glow: "rgba(201, 162, 39, 0.6)",
    glowRgba: "201, 162, 39",
  },
  T1: {
    primary: "#7a6a8a", // Purple - Lueur froide
    secondary: "#a294b0",
    bg: "#3a3445", // Obsidienne
    glow: "rgba(122, 106, 138, 0.5)",
    glowRgba: "122, 106, 138",
  },
  T2: {
    primary: "#5a7080", // Blue/Steel - Éclat subtil
    secondary: "#8aa0b0",
    bg: "#3a4550", // Ardoise
    glow: "rgba(90, 112, 128, 0.5)",
    glowRgba: "90, 112, 128",
  },
  T3: {
    primary: "#5a5a5d", // Gray - Basalte
    secondary: "#7a7a7d",
    bg: "#2a2a2d",
    glow: "rgba(90, 90, 93, 0.4)",
    glowRgba: "90, 90, 93",
  },
} as const;

export const VAAL_COLORS = {
  primary: "#c83232",
  secondary: "#ff6b6b",
  tertiary: "#8b0000",
  glow: "rgba(200, 50, 50, 0.7)",
  ember: "#ff4444",
} as const;

export interface FoilColorConfig {
  primary: string;
  glow: string;
}

export const FOIL_COLORS: FoilColorConfig[] = [
  { primary: "#c0a0ff", glow: "rgba(192, 160, 255, 0.6)" },
  { primary: "#ffa0c0", glow: "rgba(255, 160, 192, 0.6)" },
  { primary: "#a0ffc0", glow: "rgba(160, 255, 192, 0.6)" },
  { primary: "#a0c0ff", glow: "rgba(160, 192, 255, 0.6)" },
] as const;

export const COLORS = {
  bg: {
    primary: "#0a0a0c",
    DEFAULT: "#0c0c0e",
    surface: "#151518",
    surfaceLight: "#1a1a1f",
    elevated: "#1a1a1f",
  },
  border: {
    DEFAULT: "#2a2a30",
    light: "#3a3a40",
  },
  text: {
    primary: "#e8e6e3",
    DEFAULT: "#c8c8c8",
    dim: "#7f7f7f",
    muted: "#5a5a60",
    secondary: "rgba(140, 130, 120, 0.85)",
  },
  accent: {
    DEFAULT: "#af6025",
    light: "#c97a3a",
    dark: "#8a4d1e",
    glow: "rgba(175, 96, 37, 0.4)",
    glowSubtle: "rgba(175, 96, 37, 0.15)",
  },
  tiers: TIER_COLORS,
  vaal: VAAL_COLORS,
  foil: FOIL_COLORS,
  status: {
    success: "#4a9f5a",
    error: "#c45050",
    warning: "#c9a227",
  },
  unique: "#af6025",
} as const;

export const tailwindColors = {
  poe: {
    bg: COLORS.bg.DEFAULT,
    surface: COLORS.bg.surface,
    "surface-light": COLORS.bg.surfaceLight,
    border: COLORS.border.DEFAULT,
    "border-light": COLORS.border.light,
    text: COLORS.text.DEFAULT,
    "text-dim": COLORS.text.dim,
    "text-muted": COLORS.text.muted,
  },
  accent: {
    DEFAULT: COLORS.accent.DEFAULT,
    light: COLORS.accent.light,
    dark: COLORS.accent.dark,
    glow: COLORS.accent.glow,
    "glow-subtle": COLORS.accent.glowSubtle,
  },
  tier: {
    t0: TIER_COLORS.T0.bg,
    "t0-glow": TIER_COLORS.T0.primary,
    t1: TIER_COLORS.T1.bg,
    "t1-glow": TIER_COLORS.T1.primary,
    t2: TIER_COLORS.T2.bg,
    "t2-glow": TIER_COLORS.T2.primary,
    t3: TIER_COLORS.T3.bg,
    "t3-glow": TIER_COLORS.T3.primary,
  },
  unique: COLORS.unique,
};

export const tailwindBoxShadows = {
  card: "0 4px 20px rgba(0, 0, 0, 0.5)",
  "card-hover": "0 8px 40px rgba(0, 0, 0, 0.7)",
  "glow-accent": `0 0 15px ${COLORS.accent.glow}`,
  "glow-accent-subtle": `0 0 10px ${COLORS.accent.glowSubtle}`,
  "glow-t0": `0 0 20px ${TIER_COLORS.T0.glow}`,
  "glow-t1": `0 0 15px ${TIER_COLORS.T1.glow}`,
  "glow-t2": `0 0 10px ${TIER_COLORS.T2.glow}`,
  "glow-t3": `0 0 8px ${TIER_COLORS.T3.glow}`,
};

export function getTierColors(tier: CardTier): TierColorConfig {
  return TIER_COLORS[tier] || TIER_COLORS.T3;
}

export function getTierCSSVars(tier: CardTier): Record<string, string> {
  const colors = getTierColors(tier);
  return {
    "--tier-color": colors.primary,
    "--tier-glow": colors.glow,
    "--tier-bg": colors.bg,
    "--tier-secondary": colors.secondary,
  };
}

export function getTierClass(tier: CardTier): string {
  return tier.toLowerCase();
}

export const cssCustomProperties = {
  "--color-accent": COLORS.accent.DEFAULT,
  "--color-accent-light": COLORS.accent.light,
  "--color-accent-dark": COLORS.accent.dark,
  "--color-accent-glow": COLORS.accent.glow,
  "--color-accent-glow-subtle": COLORS.accent.glowSubtle,

  "--color-bg": COLORS.bg.DEFAULT,
  "--color-surface": COLORS.bg.surface,
  "--color-surface-light": COLORS.bg.surfaceLight,
  "--color-border": COLORS.border.DEFAULT,
  "--color-border-light": COLORS.border.light,

  "--color-text": COLORS.text.DEFAULT,
  "--color-text-dim": COLORS.text.dim,
  "--color-text-muted": COLORS.text.muted,

  "--color-tier-t0": TIER_COLORS.T0.primary,
  "--color-tier-t0-bg": TIER_COLORS.T0.bg,
  "--color-tier-t1": TIER_COLORS.T1.primary,
  "--color-tier-t1-bg": TIER_COLORS.T1.bg,
  "--color-tier-t2": TIER_COLORS.T2.primary,
  "--color-tier-t2-bg": TIER_COLORS.T2.bg,
  "--color-tier-t3": TIER_COLORS.T3.primary,
  "--color-tier-t3-bg": TIER_COLORS.T3.bg,
} as const;
