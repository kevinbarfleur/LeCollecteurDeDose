/**
 * useTierColors Composable
 *
 * Provides tier-based color utilities for components.
 * All colors are sourced from constants/colors.ts for consistency.
 */

import { computed } from "vue";
import type { CardTier } from "~/types/card";
import {
  TIER_COLORS,
  getTierColors as getColors,
  getTierCSSVars,
  getTierClass,
  type TierColorConfig,
} from "~/constants/colors";

export interface TierColorUtils {
  /** Get full color configuration for a tier */
  getConfig: (tier: CardTier) => TierColorConfig;
  /** Get primary color for a tier */
  getPrimary: (tier: CardTier) => string;
  /** Get glow color for a tier */
  getGlow: (tier: CardTier) => string;
  /** Get background color for a tier */
  getBg: (tier: CardTier) => string;
  /** Get CSS custom properties object for a tier */
  getCSSVars: (tier: CardTier) => Record<string, string>;
  /** Get Tailwind-compatible class suffix for a tier */
  getClass: (tier: CardTier) => string;
  /** Get box-shadow CSS for tier glow effect */
  getGlowShadow: (tier: CardTier, intensity?: number) => string;
}

/**
 * Composable for tier-based color utilities
 */
export function useTierColors(): TierColorUtils {
  const getConfig = (tier: CardTier): TierColorConfig => {
    return getColors(tier);
  };

  const getPrimary = (tier: CardTier): string => {
    return getColors(tier).primary;
  };

  const getGlow = (tier: CardTier): string => {
    return getColors(tier).glow;
  };

  const getBg = (tier: CardTier): string => {
    return getColors(tier).bg;
  };

  const getCSSVars = (tier: CardTier): Record<string, string> => {
    return getTierCSSVars(tier);
  };

  const getClass = (tier: CardTier): string => {
    return getTierClass(tier);
  };

  const getGlowShadow = (tier: CardTier, intensity: number = 1): string => {
    const colors = getColors(tier);
    const baseOpacity = 0.3 * intensity;
    return `0 0 20px rgba(${colors.glowRgba}, ${baseOpacity})`;
  };

  return {
    getConfig,
    getPrimary,
    getGlow,
    getBg,
    getCSSVars,
    getClass,
    getGlowShadow,
  };
}

/**
 * Reactive composable that provides tier colors for a specific tier ref
 */
export function useTierColorsReactive(tierRef: Ref<CardTier | undefined>) {
  const colors = computed(() => {
    const tier = tierRef.value || "T3";
    return getColors(tier);
  });

  const cssVars = computed(() => {
    const tier = tierRef.value || "T3";
    return getTierCSSVars(tier);
  });

  const tierClass = computed(() => {
    const tier = tierRef.value || "T3";
    return getTierClass(tier);
  });

  return {
    colors,
    cssVars,
    tierClass,
  };
}

// Re-export constants for convenience
export { TIER_COLORS };
