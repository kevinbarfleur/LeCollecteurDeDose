/**
 * Represents a mouse position during replay recording
 * Positions are stored as offsets from the card center for responsive replay
 */
export interface DecodedMousePosition {
  x: number;  // Offset horizontal depuis le centre de la carte (en pixels)
  y: number;  // Offset vertical depuis le centre de la carte (en pixels)
  t: number;  // Temps en ms
}

/**
 * Vaal orb outcome types
 */
export type VaalOutcome = 'nothing' | 'foil' | 'destroyed';
