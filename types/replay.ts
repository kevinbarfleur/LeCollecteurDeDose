import LZString from 'lz-string';

export interface ReplayData {
  v: 1;
  u: string;
  a: string;
  c: {
    id: string;
    var: string;
    uid: number;
    tier: string;
    foil: boolean;
  };
  m: number[];
  r: 'n' | 'f' | 'd';
  ts: number;
}

export interface DecodedMousePosition {
  x: number;  // Position relative à la fenêtre (0-1)
  y: number;  // Position relative à la fenêtre (0-1)
  t: number;  // Temps en ms
}

export function encodeReplayData(data: ReplayData): string {
  const json = JSON.stringify(data);
  return LZString.compressToEncodedURIComponent(json);
}

export function decodeReplayData(encoded: string): ReplayData | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    return JSON.parse(json) as ReplayData;
  } catch (e) {
    console.error('Failed to decode replay data:', e);
    return null;
  }
}

export function flattenMousePositions(positions: DecodedMousePosition[]): number[] {
  const result: number[] = [];
  for (const pos of positions) {
    result.push(
      Math.round(pos.x * 10000) / 10000,
      Math.round(pos.y * 10000) / 10000,
      pos.t
    );
  }
  return result;
}

export function unflattenMousePositions(flat: number[]): DecodedMousePosition[] {
  const result: DecodedMousePosition[] = [];
  for (let i = 0; i < flat.length; i += 3) {
    result.push({
      x: flat[i],
      y: flat[i + 1],
      t: flat[i + 2]
    });
  }
  return result;
}

export type VaalOutcomeCode = 'n' | 'f' | 'd';

export function outcomeToCode(outcome: 'nothing' | 'foil' | 'destroyed'): VaalOutcomeCode {
  switch (outcome) {
    case 'nothing': return 'n';
    case 'foil': return 'f';
    case 'destroyed': return 'd';
  }
}

export function codeToOutcome(code: VaalOutcomeCode): 'nothing' | 'foil' | 'destroyed' {
  switch (code) {
    case 'n': return 'nothing';
    case 'f': return 'foil';
    case 'd': return 'destroyed';
  }
}

