import type { CardTier } from '~/types/card'

// ==========================================
// TIER COLORS - Unified color palette for card tiers
// ==========================================

export interface TierColorConfig {
  primary: string
  secondary: string
  glow: string
}

export const TIER_COLORS: Record<CardTier, TierColorConfig> = {
  T0: { primary: '#c9a227', secondary: '#f5d76e', glow: 'rgba(201, 162, 39, 0.6)' },
  T1: { primary: '#7a6a8a', secondary: '#a294b0', glow: 'rgba(122, 106, 138, 0.5)' },
  T2: { primary: '#5a7080', secondary: '#8aa0b0', glow: 'rgba(90, 112, 128, 0.5)' },
  T3: { primary: '#5a5a5d', secondary: '#7a7a7d', glow: 'rgba(90, 90, 93, 0.4)' },
} as const

// Helper function to get tier colors with fallback
export function getTierColors(tier?: string): TierColorConfig {
  if (!tier) return TIER_COLORS.T3
  const key = tier.toUpperCase() as CardTier
  return TIER_COLORS[key] || TIER_COLORS.T3
}

// ==========================================
// VAAL COLORS - Blood/corruption theme
// ==========================================

export const VAAL_COLORS = {
  primary: '#c83232',
  secondary: '#ff6b6b',
  tertiary: '#8b0000',
  glow: 'rgba(200, 50, 50, 0.7)',
  ember: '#ff4444',
} as const

// ==========================================
// FOIL COLORS - Holographic effect cycle
// ==========================================

export interface FoilColorConfig {
  primary: string
  glow: string
}

export const FOIL_COLORS: FoilColorConfig[] = [
  { primary: '#c0a0ff', glow: 'rgba(192, 160, 255, 0.6)' },
  { primary: '#ffa0c0', glow: 'rgba(255, 160, 192, 0.6)' },
  { primary: '#a0ffc0', glow: 'rgba(160, 255, 192, 0.6)' },
  { primary: '#a0c0ff', glow: 'rgba(160, 192, 255, 0.6)' },
]

// ==========================================
// TIER CONFIG - For card styling (color + glowColor + label)
// Used by types/card.ts for TIER_CONFIG
// ==========================================

export interface TierStyleConfig {
  color: string
  glowColor: string
  label: string
}

export const TIER_STYLE_CONFIG: Record<CardTier, TierStyleConfig> = {
  T0: {
    color: '#6d5a2a',      // Ambre sombre
    glowColor: '#c9a227',  // Lueur chaude
    label: 'T0'
  },
  T1: {
    color: '#3a3445',      // Obsidienne
    glowColor: '#7a6a8a',  // Lueur froide
    label: 'T1'
  },
  T2: {
    color: '#3a4550',      // Ardoise
    glowColor: '#5a7080',  // Éclat subtil
    label: 'T2'
  },
  T3: {
    color: '#2a2a2d',      // Basalte
    glowColor: '#4a4a4d',
    label: 'T3'
  }
}

