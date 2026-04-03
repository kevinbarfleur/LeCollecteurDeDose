import type { PitOverrideDef, PitTier, PitClarityLevel } from '~/types/pit'
import overridesRaw from '~/docs/the_pit_v1_overrides.csv?raw'

function parseOverridesCSV(raw: string): PitOverrideDef[] {
  const lines = raw.trim().split('\n')
  if (lines.length < 2) return []

  const header = lines[0].split(',')
  const overrides: PitOverrideDef[] = []

  for (let i = 1; i < lines.length; i++) {
    // Handle quoted CSV fields
    const vals = parseCSVLine(lines[i])
    if (vals.length < header.length) continue

    const get = (col: string) => {
      const idx = header.indexOf(col)
      return idx >= 0 ? vals[idx]?.trim() ?? '' : ''
    }

    overrides.push({
      effectId: get('effect_id'),
      itemName: get('item_name'),
      tier: get('tier') as PitTier,
      slotScope: get('slot_scope').split('|').filter(Boolean),
      clarity: get('clarity') as PitClarityLevel,
      trigger: get('trigger'),
      effectSummary: get('effect_summary'),
      mechanicalNotes: get('mechanical_notes'),
      bossCounter: get('boss_counter'),
      buildRoles: get('build_roles').split('|').filter(Boolean),
    })
  }

  return overrides
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

export const PIT_OVERRIDES: PitOverrideDef[] = parseOverridesCSV(overridesRaw)

export const PIT_OVERRIDES_BY_ID = new Map<string, PitOverrideDef>(
  PIT_OVERRIDES.map(o => [o.effectId, o])
)

export function getOverride(effectId: string): PitOverrideDef | undefined {
  return PIT_OVERRIDES_BY_ID.get(effectId)
}
