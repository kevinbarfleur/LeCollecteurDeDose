/**
 * Types for Live Room streaming feature
 * Allows hosts to broadcast their card openings in real-time to spectators
 */

export interface LiveRoom {
  id: string;
  host_id: string; // Twitch user ID
  host_name: string;
  host_avatar: string | null;
  room_code: string; // Short shareable code
  is_active: boolean;
  spectator_count: number;
  created_at: string;
  closed_at: string | null;
}

export interface LiveRoomInsert {
  id?: string;
  host_id: string;
  host_name: string;
  host_avatar?: string | null;
  room_code?: string;
  is_active?: boolean;
  spectator_count?: number;
  created_at?: string;
  closed_at?: string | null;
}

/**
 * Live broadcast event types
 * These are sent via Supabase Realtime Broadcast
 */
export type LiveEventType = 
  | 'card_placed'      // Card placed on altar
  | 'card_ejected'     // Card ejected from altar
  | 'vaal_started'     // Vaal orb drag started
  | 'vaal_position'    // Vaal orb position update (cursor tracking)
  | 'vaal_cancelled'   // Vaal orb drag cancelled
  | 'vaal_dropped'     // Vaal orb dropped on card
  | 'outcome_revealed' // Outcome animation complete
  | 'room_closed';     // Host closed the room

export interface LiveCardInfo {
  cardId: string;
  cardName: string;
  cardTier: string;
  cardFoil: boolean;
  cardImage: string;
}

export interface LiveEventCardPlaced {
  type: 'card_placed';
  card: LiveCardInfo;
  timestamp: number;
}

export interface LiveEventCardEjected {
  type: 'card_ejected';
  timestamp: number;
}

export interface LiveEventVaalStarted {
  type: 'vaal_started';
  timestamp: number;
}

export interface LiveEventVaalPosition {
  type: 'vaal_position';
  // Position relative to card center (same as replay system)
  x: number;
  y: number;
  timestamp: number;
}

export interface LiveEventVaalCancelled {
  type: 'vaal_cancelled';
  timestamp: number;
}

export interface LiveEventVaalDropped {
  type: 'vaal_dropped';
  timestamp: number;
}

export interface LiveEventOutcomeRevealed {
  type: 'outcome_revealed';
  outcome: string; // VaalOutcome type
  resultCardId: string | null; // For transform outcomes
  timestamp: number;
}

export interface LiveEventRoomClosed {
  type: 'room_closed';
  timestamp: number;
}

export type LiveEvent = 
  | LiveEventCardPlaced
  | LiveEventCardEjected
  | LiveEventVaalStarted
  | LiveEventVaalPosition
  | LiveEventVaalCancelled
  | LiveEventVaalDropped
  | LiveEventOutcomeRevealed
  | LiveEventRoomClosed;

/**
 * Presence state for spectators
 */
export interface SpectatorPresence {
  online_key: string;
  online_at: string;
  userId: string;
  username: string;
  userAvatar: string | null;
}

/**
 * Room state as seen by spectators
 */
export interface SpectatorRoomState {
  isConnected: boolean;
  hostName: string;
  hostAvatar: string | null;
  spectatorCount: number;
  currentCard: LiveCardInfo | null;
  isVaalActive: boolean;
  vaalPosition: { x: number; y: number } | null;
}
