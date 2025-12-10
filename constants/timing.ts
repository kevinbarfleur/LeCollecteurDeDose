/**
 * Animation timing constants used throughout the application
 * Centralizes all magic numbers for easier maintenance
 */

export const ANIMATION_TIMING = {
  // Card entry/exit animations
  CARD_ENTRY: 850,
  CARD_EXIT: 500,
  
  // Foil transformation phases
  FOIL_TRANSFORM: {
    BUILD_UP: 200,
    FLASH: 100,
    SETTLE: 400,
  },
  
  // Destruction animation phases
  DESTRUCTION: {
    SHAKE: 300,
    IMAGE_DISINTEGRATE: 800,
    CARD_DISINTEGRATE: 1200,
    CLEANUP: 1200,
  },
  
  // Other timings
  SNAPSHOT_DELAY: 800,
  SHARE_MODAL_DELAY: 2100,
  NOTHING_EFFECT: 400,
  RECORDING_SAVE_DELAY: 2000,
  REPLAY_START_DELAY: 1500,
  OUTCOME_DISPLAY_DELAY: 800,
} as const;

/**
 * Disintegration effect configuration
 */
export const DISINTEGRATION = {
  FRAMES: 64,
  IMAGE_FRAMES: 48,
  REPETITION_COUNT: 2,
  
  // Duration in seconds for CSS transitions
  IMAGE_DURATION: 0.8,
  IMAGE_DELAY_MULTIPLIER: 0.4,
  CARD_DURATION: 0.9,
  CARD_DELAY_MULTIPLIER: 0.7,
} as const;

/**
 * Heartbeat effect configuration
 */
export const HEARTBEAT = {
  BASE_SPEED: 2, // seconds
  PANIC_SPEED: 0.25, // seconds at max panic
  BASE_SCALE: 1.005,
  MAX_PANIC_SCALE: 1.05,
  MAX_DISTANCE: 400, // pixels - beyond this = base intensity
  MIN_DISTANCE: 50, // pixels - at or below this = max intensity
} as const;

/**
 * Mouse recording configuration
 */
export const RECORDING = {
  SAMPLE_INTERVAL: 50, // ms - 20fps is sufficient for smooth replay
} as const;

export type AnimationTiming = typeof ANIMATION_TIMING;
export type DisintegrationConfig = typeof DISINTEGRATION;
export type HeartbeatConfig = typeof HEARTBEAT;
export type RecordingConfig = typeof RECORDING;

