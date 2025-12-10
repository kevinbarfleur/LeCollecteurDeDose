/**
 * Represents a mouse position during replay recording
 * Positions are stored as offsets from the card center for responsive replay
 */
export interface DecodedMousePosition {
  x: number;  // Offset horizontal depuis le centre de la carte (en pixels)
  y: number;  // Offset vertical depuis le centre de la carte (en pixels)
  t: number;  // Temps en ms
}

// Re-export VaalOutcome from centralized location
export type { VaalOutcome } from './vaalOutcome';
export { 
  VAAL_OUTCOMES, 
  getOutcomeConfig, 
  rollVaalOutcome, 
  getShareModalContent,
  getForcedOutcomeOptions,
} from './vaalOutcome';
