/**
 * Utility functions for logging collection state in a consistent format
 */

import type { Card } from '~/types/card'
import { calculateCardCounts } from './collectionSync'

export interface CollectionState {
  totalCards: number
  vaalOrbs: number
  cardCounts: Map<number, { normal: number; foil: number }>
  cardsByUid: Map<number, Card[]>
}

/**
 * Calculate collection state from cards array
 */
export function calculateCollectionState(cards: Card[], vaalOrbs: number = 0): CollectionState {
  const cardCounts = calculateCardCounts(cards)
  const cardsByUid = new Map<number, Card[]>()
  
  for (const card of cards) {
    const baseUid = Math.floor(card.uid)
    if (!cardsByUid.has(baseUid)) {
      cardsByUid.set(baseUid, [])
    }
    cardsByUid.get(baseUid)!.push(card)
  }
  
  return {
    totalCards: cards.length,
    vaalOrbs,
    cardCounts,
    cardsByUid,
  }
}

/**
 * Log collection state in a detailed, readable format
 */
export function logCollectionState(
  label: string,
  cards: Card[],
  vaalOrbs: number = 0,
  context?: Record<string, any>
): void {
  const state = calculateCollectionState(cards, vaalOrbs)
  
  // Build summary
  const summary: Record<string, any> = {
    label,
    totalCards: state.totalCards,
    vaalOrbs: state.vaalOrbs,
    uniqueCards: state.cardCounts.size,
    cardDetails: {} as Record<string, any>,
  }
  
  // Add card details
  for (const [baseUid, count] of state.cardCounts.entries()) {
    const cardsForUid = state.cardsByUid.get(baseUid) || []
    const firstCard = cardsForUid[0]
    
    summary.cardDetails[String(baseUid)] = {
      name: firstCard?.name || `UID ${baseUid}`,
      normal: count.normal,
      foil: count.foil,
      total: count.normal + count.foil,
      instances: cardsForUid.map(c => ({
        uid: c.uid,
        foil: c.foil,
      })),
    }
  }
  
  // Add context if provided
  if (context) {
    summary.context = context
  }
  
  // Only log in development mode
  if (import.meta.dev) {
    // Stringify large objects for better console readability
    const summaryString = JSON.stringify(summary, null, 2)
    console.log(`[CollectionState] ${label}:`)
    console.log(summaryString)
  }
}

/**
 * Log collection state comparison (before/after)
 */
export function logCollectionStateComparison(
  label: string,
  beforeCards: Card[],
  beforeVaalOrbs: number,
  afterCards: Card[],
  afterVaalOrbs: number,
  context?: Record<string, any>
): void {
  const beforeState = calculateCollectionState(beforeCards, beforeVaalOrbs)
  const afterState = calculateCollectionState(afterCards, afterVaalOrbs)
  
  // Calculate differences
  const cardChanges: Record<string, any> = {}
  const allUids = new Set([...beforeState.cardCounts.keys(), ...afterState.cardCounts.keys()])
  
  for (const baseUid of allUids) {
    const beforeCount = beforeState.cardCounts.get(baseUid) || { normal: 0, foil: 0 }
    const afterCount = afterState.cardCounts.get(baseUid) || { normal: 0, foil: 0 }
    
    const normalDelta = afterCount.normal - beforeCount.normal
    const foilDelta = afterCount.foil - beforeCount.foil
    
    if (normalDelta !== 0 || foilDelta !== 0) {
      const cardsForUid = afterState.cardsByUid.get(baseUid) || beforeState.cardsByUid.get(baseUid) || []
      const firstCard = cardsForUid[0]
      
      cardChanges[String(baseUid)] = {
        name: firstCard?.name || `UID ${baseUid}`,
        before: { normal: beforeCount.normal, foil: beforeCount.foil },
        after: { normal: afterCount.normal, foil: afterCount.foil },
        delta: { normal: normalDelta, foil: foilDelta },
      }
    }
  }
  
  const comparison = {
    label,
    before: {
      totalCards: beforeState.totalCards,
      vaalOrbs: beforeVaalOrbs,
      uniqueCards: beforeState.cardCounts.size,
    },
    after: {
      totalCards: afterState.totalCards,
      vaalOrbs: afterVaalOrbs,
      uniqueCards: afterState.cardCounts.size,
    },
    changes: {
      totalCardsDelta: afterState.totalCards - beforeState.totalCards,
      vaalOrbsDelta: afterVaalOrbs - beforeVaalOrbs,
      cardChanges,
    },
  }
  
  if (context) {
    comparison.context = context
  }
  
  // Only log in development mode
  if (import.meta.dev) {
    // Stringify large objects for better console readability
    const comparisonString = JSON.stringify(comparison, null, 2)
    console.log(`[CollectionState] ${label} (Comparison):`)
    console.log(comparisonString)
  }
}

