import type { Card } from './card'

/**
 * API Response types for Le Collecteur de Dose API
 */

// Generic API response wrapper
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Player collection response
export interface PlayerCollection {
  playerId: string
  username: string
  cards: Card[]
  totalCards: number
  lastUpdated?: string
}

// Global catalogue response (all available cards)
export interface CatalogueResponse {
  cards: Card[]
  totalCards: number
  lastUpdated?: string
}

// API endpoints type for type-safety
export type ApiEndpoint = 
  | '/catalogue'
  | '/collection'
  | `/collection/${string}`
  | '/health'

// API error
export interface ApiError {
  status: number
  message: string
  code?: string
}
