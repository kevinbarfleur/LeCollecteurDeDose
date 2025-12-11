import type { Card } from './card'

/**
 * API Response types for Le Collecteur de Dose Data API
 */

// Generic API response wrapper
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Single user's collection data from the API
export interface UserCollectionData {
  cards: Card[]
  vaalOrb?: number
}

// All user collections response (keyed by pseudo/username)
// GET /api/userCollection returns { "pseudo1": { cards: [...], vaalOrb: 12 }, "pseudo2": {...} }
export type UserCollectionsResponse = Record<string, UserCollectionData>

// Player collection (normalized for internal use)
export interface PlayerCollection {
  pseudo: string
  cards: Card[]
  vaalOrb: number
  totalCards: number
}

// Global catalogue response (all available cards)
export interface CatalogueResponse {
  cards: Card[]
  totalCards: number
  lastUpdated?: string
}

// Update collection request body
export interface UpdateCollectionRequest {
  [pseudo: string]: {
    cards: Card[]
    vaalOrb?: number
  }
}

// API endpoints type for type-safety
export type ApiEndpoint = 
  | '/api/userCollection'
  | '/api/catalogue'
  | '/api/collection/update'

// API error
export interface ApiError {
  status: number
  message: string
  code?: string
}
