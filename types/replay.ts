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
 * Types of events that can occur during a replay
 */
export type ReplayEventType = 
  | 'recording_start'  // Recording began
  | 'orb_pickup'       // User picked up the Vaal orb
  | 'card_hover'       // Cursor entered the card area
  | 'card_leave'       // Cursor left the card area
  | 'orb_drop'         // User dropped the orb (action trigger)
  | 'outcome_resolved' // Outcome was determined
  | 'recording_end';   // Recording ended

/**
 * A discrete event that occurred during recording
 * Events are synchronized by timestamp, not position
 */
export interface ReplayEvent {
  type: ReplayEventType;
  t: number;  // Timestamp in ms from recording start
  data?: {
    x?: number;      // Position at event time (if relevant)
    y?: number;
    outcome?: string; // For outcome_resolved event
  };
}

/**
 * Enhanced replay data structure (v2)
 * Backward compatible with v1 (array of positions)
 */
export interface ReplayDataV2 {
  version: 2;
  positions: DecodedMousePosition[];  // Compressed/simplified path
  events: ReplayEvent[];              // Discrete events with timestamps
  metadata?: {
    originalPointCount?: number;      // Before compression
    compressionRatio?: number;        // Compression effectiveness
    recordingDuration?: number;       // Total duration in ms
  };
}

/**
 * Type guard to check if replay data is v2 format
 */
export const isReplayDataV2 = (data: unknown): data is ReplayDataV2 => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'version' in data &&
    (data as ReplayDataV2).version === 2 &&
    'positions' in data &&
    'events' in data
  );
};

/**
 * Convert legacy v1 data (array of positions) to v2 format
 * Allows seamless playback of old replays
 */
export const migrateToV2 = (
  legacyData: DecodedMousePosition[]
): ReplayDataV2 => {
  if (!Array.isArray(legacyData) || legacyData.length === 0) {
    return {
      version: 2,
      positions: [],
      events: [],
    };
  }

  const lastPos = legacyData[legacyData.length - 1];
  // Legacy format added 2000ms padding, so drop time was at t - 2000
  const dropTime = lastPos.t - 2000;

  return {
    version: 2,
    positions: legacyData,
    events: [
      { type: 'recording_start', t: 0 },
      { type: 'orb_drop', t: Math.max(0, dropTime) },
      { type: 'recording_end', t: lastPos.t },
    ],
    metadata: {
      recordingDuration: lastPos.t,
    },
  };
};

// Re-export VaalOutcome from centralized location
export type { VaalOutcome } from './vaalOutcome';
export { 
  VAAL_OUTCOMES, 
  getOutcomeConfig, 
  rollVaalOutcome, 
  getShareModalContent,
  getForcedOutcomeOptions,
} from './vaalOutcome';
