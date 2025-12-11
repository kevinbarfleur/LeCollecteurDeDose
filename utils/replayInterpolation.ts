/**
 * Replay interpolation and path optimization utilities
 * Provides smooth cursor playback using Catmull-Rom splines
 * and efficient storage using Douglas-Peucker path simplification
 */

import type { DecodedMousePosition } from '~/types/replay';

/**
 * Catmull-Rom spline interpolation
 * Creates smooth curves through control points without overshooting
 * 
 * @param p0 - Point before the segment start
 * @param p1 - Segment start point
 * @param p2 - Segment end point  
 * @param p3 - Point after the segment end
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated value
 */
export const catmullRom = (
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number
): number => {
  const t2 = t * t;
  const t3 = t2 * t;
  
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
};

/**
 * Interpolate a position using Catmull-Rom splines
 * Handles edge cases at the start/end of the path
 */
export const interpolateCatmullRom = (
  positions: DecodedMousePosition[],
  elapsed: number
): { x: number; y: number } | null => {
  if (positions.length === 0) return null;
  if (positions.length === 1) return { x: positions[0].x, y: positions[0].y };
  
  // Find the segment index for current time
  let segmentIndex = 0;
  for (let i = 0; i < positions.length - 1; i++) {
    if (positions[i + 1].t > elapsed) {
      segmentIndex = i;
      break;
    }
    segmentIndex = i;
  }
  
  // Clamp to valid range
  if (elapsed <= positions[0].t) {
    return { x: positions[0].x, y: positions[0].y };
  }
  if (elapsed >= positions[positions.length - 1].t) {
    const last = positions[positions.length - 1];
    return { x: last.x, y: last.y };
  }
  
  // Get 4 control points for Catmull-Rom (clamp at boundaries)
  const p0 = positions[Math.max(0, segmentIndex - 1)];
  const p1 = positions[segmentIndex];
  const p2 = positions[Math.min(positions.length - 1, segmentIndex + 1)];
  const p3 = positions[Math.min(positions.length - 1, segmentIndex + 2)];
  
  // Calculate t within the current segment
  const segmentDuration = p2.t - p1.t;
  const t = segmentDuration === 0 ? 0 : (elapsed - p1.t) / segmentDuration;
  
  return {
    x: catmullRom(p0.x, p1.x, p2.x, p3.x, t),
    y: catmullRom(p0.y, p1.y, p2.y, p3.y, t)
  };
};

/**
 * Calculate perpendicular distance from a point to a line segment
 * Used by Douglas-Peucker algorithm
 */
const perpendicularDistance = (
  point: DecodedMousePosition,
  lineStart: DecodedMousePosition,
  lineEnd: DecodedMousePosition
): number => {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  
  // Line length squared
  const lineLengthSq = dx * dx + dy * dy;
  
  if (lineLengthSq === 0) {
    // Start and end are the same point
    const pdx = point.x - lineStart.x;
    const pdy = point.y - lineStart.y;
    return Math.sqrt(pdx * pdx + pdy * pdy);
  }
  
  // Project point onto line
  const t = Math.max(0, Math.min(1, 
    ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lineLengthSq
  ));
  
  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;
  
  const distX = point.x - projX;
  const distY = point.y - projY;
  
  return Math.sqrt(distX * distX + distY * distY);
};

/**
 * Douglas-Peucker path simplification algorithm
 * Reduces the number of points while preserving the overall shape
 * 
 * @param points - Array of positions to simplify
 * @param epsilon - Maximum deviation allowed (in pixels)
 * @returns Simplified array of positions
 */
export const douglasPeucker = (
  points: DecodedMousePosition[],
  epsilon: number
): DecodedMousePosition[] => {
  if (points.length <= 2) return [...points];
  
  // Find the point with maximum distance from the line
  let maxDistance = 0;
  let maxIndex = 0;
  
  const start = points[0];
  const end = points[points.length - 1];
  
  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], start, end);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }
  
  // If max distance exceeds epsilon, recursively simplify
  if (maxDistance > epsilon) {
    const left = douglasPeucker(points.slice(0, maxIndex + 1), epsilon);
    const right = douglasPeucker(points.slice(maxIndex), epsilon);
    
    // Combine results, removing duplicate point at junction
    return [...left.slice(0, -1), ...right];
  }
  
  // Otherwise, return just start and end
  return [start, end];
};

/**
 * Adaptive sampling configuration
 */
export interface AdaptiveSamplingConfig {
  /** Minimum time between samples in ms */
  minInterval: number;
  /** Maximum time between samples in ms */
  maxInterval: number;
  /** Minimum distance to trigger a sample (pixels) */
  minDistance: number;
  /** Distance threshold for high-frequency sampling (pixels) */
  highActivityDistance: number;
}

export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveSamplingConfig = {
  minInterval: 16,      // ~60fps max
  maxInterval: 100,     // At least 10fps when moving
  minDistance: 2,       // Ignore micro-movements
  highActivityDistance: 15, // Fast movement threshold
};

/**
 * Determines if a new sample should be recorded based on adaptive criteria
 * Records more frequently during fast/complex movements, less during slow/linear ones
 */
export const shouldSample = (
  currentX: number,
  currentY: number,
  lastPosition: DecodedMousePosition | null,
  timeSinceLastSample: number,
  config: AdaptiveSamplingConfig = DEFAULT_ADAPTIVE_CONFIG
): boolean => {
  // Always sample if no previous position
  if (!lastPosition) return true;
  
  // Always sample if max interval exceeded
  if (timeSinceLastSample >= config.maxInterval) return true;
  
  // Skip if minimum interval not reached
  if (timeSinceLastSample < config.minInterval) return false;
  
  // Calculate distance from last position
  const dx = currentX - lastPosition.x;
  const dy = currentY - lastPosition.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Skip if movement is too small
  if (distance < config.minDistance) return false;
  
  // Fast movement = always sample
  if (distance >= config.highActivityDistance) return true;
  
  // Medium movement = sample based on time
  // More distance = sample sooner
  const dynamicInterval = config.maxInterval - 
    (distance / config.highActivityDistance) * (config.maxInterval - config.minInterval);
  
  return timeSinceLastSample >= dynamicInterval;
};

/**
 * Estimate the velocity at a given point in the path
 * Useful for understanding movement intensity
 */
export const estimateVelocity = (
  positions: DecodedMousePosition[],
  index: number
): number => {
  if (positions.length < 2 || index < 0 || index >= positions.length) return 0;
  
  // Use neighboring points to estimate velocity
  const prev = positions[Math.max(0, index - 1)];
  const next = positions[Math.min(positions.length - 1, index + 1)];
  
  const dx = next.x - prev.x;
  const dy = next.y - prev.y;
  const dt = next.t - prev.t;
  
  if (dt === 0) return 0;
  
  return Math.sqrt(dx * dx + dy * dy) / dt;
};
