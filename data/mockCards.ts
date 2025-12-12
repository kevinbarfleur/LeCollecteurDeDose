import type { Card } from '~/types/card'
import poeUniquesData from './poe_uniques.json'

// All available cards in the game (catalog) - imported from the POE uniques database
export const allCards: Card[] = poeUniquesData as Card[]

// Helper to get a card by id from the database
export function getCardById(id: string): Card | undefined {
  return allCards.find(card => card.id === id)
}

// Helper to get a card by name from the database
export function getCardByName(name: string): Card | undefined {
  return allCards.find(card => card.name === name)
}

// Helper to get cards by tier
export function getCardsByTier(tier: 'T0' | 'T1' | 'T2' | 'T3'): Card[] {
  return allCards.filter(card => card.tier === tier)
}

/**
 * Mock user collection - Simulating a realistic player's collection
 * 
 * This represents a player who has been playing for a while:
 * - Lots of common T3 items with many duplicates
 * - Some T2 items with occasional duplicates
 * - A few T1 items (lucky drops)
 * - Maybe 1-2 T0 legendary items (very lucky)
 * - Some foil variants scattered around
 * 
 * Total: ~80 cards
 */

// Generate unique uid for collection cards
let collectionUid = 100000

function createCollectionCard(baseCard: Card | undefined, isFoil = false): Card | undefined {
  if (!baseCard) return undefined
  return {
    ...baseCard,
    uid: collectionUid++,
    foil: isFoil || undefined
  }
}

// Get cards from the database using actual IDs
const cardDb = {
  // T0 - Legendary items
  headhunter: getCardById('headhunter'),
  mageblood: getCardById('mageblood'),
  watchers_eye: getCardById('watchers_eye'),
  the_squire: getCardById('the_squire'),
  thread_of_hope: getCardById('thread_of_hope'),
  brutal_restraint: getCardById('brutal_restraint'),
  lethal_pride: getCardById('lethal_pride'),
  militant_faith: getCardById('militant_faith'),
  glorious_vanity: getCardById('glorious_vanity'),
  the_retch: getCardById('the_retch'),
  the_pandemonius: getCardById('the_pandemonius'),
  the_covenant: getCardById('the_covenant'),
  the_brass_dome: getCardById('the_brass_dome'),
  mark_of_the_elder: getCardById('mark_of_the_elder'),
  presence_of_chayula: getCardById('presence_of_chayula'),
  mark_of_the_shaper: getCardById('mark_of_the_shaper'),
  kaoms_heart: getCardById('kaoms_heart'),
  atziris_step: getCardById('atziris_step'),
  solstice_vigil: getCardById('solstice_vigil'),
  bereks_respite: getCardById('bereks_respite'),
  crystallised_omniscience: getCardById('crystallised_omniscience'),
  ashes_of_the_stars: getCardById('ashes_of_the_stars'),
  impossible_escape: getCardById('impossible_escape'),
  ventors_gamble: getCardById('ventors_gamble'),
  badge_of_the_brotherhood: getCardById('badge_of_the_brotherhood'),
  split_personality: getCardById('split_personality'),
  unnatural_instinct: getCardById('unnatural_instinct'),
  shavronnes_wrappings: getCardById('shavronnes_wrappings'),
  starforge: getCardById('starforge'),
  voidforge: getCardById('voidforge'),
  
  // T1 - Epic items
  megalomaniac: getCardById('megalomaniac'),
  perseverance: getCardById('perseverance'),
  auls_uprising: getCardById('auls_uprising'),
  carcass_jack: getCardById('carcass_jack'),
  darkray_vectors: getCardById('darkray_vectors'),
  rats_nest: getCardById('rats_nest'),
  belly_of_the_beast: getCardById('belly_of_the_beast'),
  inpulsas_broken_heart: getCardById('inpulsas_broken_heart'),
  abyssus: getCardById('abyssus'),
  hrimsorrow: getCardById('hrimsorrow'),
  starkonjas_head: getCardById('starkonjas_head'),
  devotos_devotion: getCardById('devotos_devotion'),
  heatshiver: getCardById('heatshiver'),
  nebulis: getCardById('nebulis'),
  cospris_malice: getCardById('cospris_malice'),
  soul_taker: getCardById('soul_taker'),
  hand_of_wisdom_and_action: getCardById('hand_of_wisdom_and_action'),
  the_taming: getCardById('the_taming'),
  the_anvil: getCardById('the_anvil'),
  the_pariah: getCardById('the_pariah'),
  the_hungry_loop: getCardById('the_hungry_loop'),
  the_balance_of_terror: getCardById('the_balance_of_terror'),
  the_eternal_struggle: getCardById('the_eternal_struggle'),
  the_primordial_chain: getCardById('the_primordial_chain'),
  the_golden_rule: getCardById('the_golden_rule'),
  the_red_nightmare: getCardById('the_red_nightmare'),
  the_front_line: getCardById('the_front_line'),
  the_druggery: getCardById('the_druggery'),
  
  // T2 - Uncommon items (mid-tier)
  circle_of_anguish: getCardById('circle_of_anguish'),
  circle_of_guilt: getCardById('circle_of_guilt'),
  vivinsect: getCardById('vivinsect'),
  tasalios_sign: getCardById('tasalios_sign'),
  the_light_of_meaning: getCardById('the_light_of_meaning'),
  the_magnate: getCardById('the_magnate'),
  the_interrogation: getCardById('the_interrogation'),
  the_queens_hunger: getCardById('the_queens_hunger'),
  the_coming_calamity: getCardById('the_coming_calamity'),
  the_flow_untethered: getCardById('the_flow_untethered'),
  the_torrents_reclamation: getCardById('the_torrents_reclamation'),
  the_ivory_tower: getCardById('the_ivory_tower'),
  the_three_dragons: getCardById('the_three_dragons'),
  the_rat_cage: getCardById('the_rat_cage'),
  the_iron_fortress: getCardById('the_iron_fortress'),
  
  // T3 - Common items
  bloodsoaked_medallion: getCardById('bloodsoaked_medallion'),
  perandus_signet: getCardById('perandus_signet'),
  uzazas_meadow: getCardById('uzazas_meadow'),
  ahkelis_valley: getCardById('ahkelis_valley'),
  uzazas_mountain: getCardById('uzazas_mountain'),
  putembos_meadow: getCardById('putembos_meadow'),
  atziris_splendour: getCardById('atziris_splendour'),
  tainted_pact: getCardById('tainted_pact'),
  replica_winterheart: getCardById('replica_winterheart'),
  prosperos_protection: getCardById('prosperos_protection'),
  heartbound_loop: getCardById('heartbound_loop'),
  leaderships_price: getCardById('leaderships_price'),
  putembos_mountain: getCardById('putembos_mountain'),
  replica_doedres_damning: getCardById('replica_doedres_damning'),
  icefang_orbit: getCardById('icefang_orbit'),
  le_heup_of_all: getCardById('le_heup_of_all'),
  profane_proxy: getCardById('profane_proxy'),
  doedres_damning: getCardById('doedres_damning'),
  valyrium: getCardById('valyrium'),
  blackflame: getCardById('blackflame'),
  faminebind: getCardById('faminebind'),
  doedres_tongue: getCardById('doedres_tongue'),
  victarios_acuity: getCardById('victarios_acuity'),
  stormfire: getCardById('stormfire'),
  coiling_whisper: getCardById('coiling_whisper'),
  emberwake: getCardById('emberwake'),
  stranglegasp: getCardById('stranglegasp'),
  voideye: getCardById('voideye'),
  soul_tether: getCardById('soul_tether'),
  valakos_sign: getCardById('valakos_sign'),
  bloodgrip: getCardById('bloodgrip'),
  tawhanukus_timing: getCardById('tawhanukus_timing'),
  blackheart: getCardById('blackheart'),
  firesong: getCardById('firesong'),
  voice_of_the_storm: getCardById('voice_of_the_storm'),
  fertile_mind: getCardById('fertile_mind'),
  sidhebreath: getCardById('sidhebreath'),
  fury_valve: getCardById('fury_valve'),
  kikazaru: getCardById('kikazaru'),
  intuitive_leap: getCardById('intuitive_leap'),
  primordial_might: getCardById('primordial_might'),
  inspired_learning: getCardById('inspired_learning'),
  might_of_the_meek: getCardById('might_of_the_meek'),
  rain_of_splinters: getCardById('rain_of_splinters'),
  ryslathas_coil: getCardById('ryslathas_coil'),
  meginords_girdle: getCardById('meginords_girdle'),
  prismweave: getCardById('prismweave'),
  siegebreaker: getCardById('siegebreaker'),
  leash_of_oblation: getCardById('leash_of_oblation'),
  maligaros_restraint: getCardById('maligaros_restraint'),
  primordial_harmony: getCardById('primordial_harmony'),
  primordial_eminence: getCardById('primordial_eminence'),
  one_with_nothing: getCardById('one_with_nothing'),
  pure_talent: getCardById('pure_talent'),
  olesyas_delight: getCardById('olesyas_delight'),
  pacifism: getCardById('pacifism'),
  tempered_spirit: getCardById('tempered_spirit'),
  brute_force_solution: getCardById('brute_force_solution'),
  sublime_vision: getCardById('sublime_vision'),
  kitavas_teachings: getCardById('kitavas_teachings')
}

// Build the realistic player collection
const collectionCards: (Card | undefined)[] = [
  // ========== T3 COMMONS - Many duplicates (typical for a player) ==========
  
  // Le Heup of All - Common leveling ring
  createCollectionCard(cardDb.le_heup_of_all),
  createCollectionCard(cardDb.le_heup_of_all),
  createCollectionCard(cardDb.le_heup_of_all),
  createCollectionCard(cardDb.le_heup_of_all),
  createCollectionCard(cardDb.le_heup_of_all),
  createCollectionCard(cardDb.le_heup_of_all, true), // 1 foil
  
  // Blackheart - Chaos damage ring
  createCollectionCard(cardDb.blackheart),
  createCollectionCard(cardDb.blackheart),
  createCollectionCard(cardDb.blackheart),
  
  // Bloodgrip - Life recovery amulet
  createCollectionCard(cardDb.bloodgrip),
  createCollectionCard(cardDb.bloodgrip),
  createCollectionCard(cardDb.bloodgrip),
  createCollectionCard(cardDb.bloodgrip),
  
  // Sidhebreath - Minion amulet
  createCollectionCard(cardDb.sidhebreath),
  createCollectionCard(cardDb.sidhebreath),
  
  // Kikazaru - Curse reduction ring
  createCollectionCard(cardDb.kikazaru),
  createCollectionCard(cardDb.kikazaru),
  createCollectionCard(cardDb.kikazaru),
  createCollectionCard(cardDb.kikazaru),
  createCollectionCard(cardDb.kikazaru, true), // foil
  
  // Meginord's Girdle - Strength belt
  createCollectionCard(cardDb.meginords_girdle),
  createCollectionCard(cardDb.meginords_girdle),
  createCollectionCard(cardDb.meginords_girdle),
  
  // Prismweave - Elemental attack belt
  createCollectionCard(cardDb.prismweave),
  createCollectionCard(cardDb.prismweave),
  createCollectionCard(cardDb.prismweave, true),
  
  // Soul Tether - Energy shield belt
  createCollectionCard(cardDb.soul_tether),
  createCollectionCard(cardDb.soul_tether),
  
  // Voideye - Socket ring
  createCollectionCard(cardDb.voideye),
  createCollectionCard(cardDb.voideye),
  
  // Doedre's Damning - Extra curse ring
  createCollectionCard(cardDb.doedres_damning),
  createCollectionCard(cardDb.doedres_damning),
  createCollectionCard(cardDb.doedres_damning),
  createCollectionCard(cardDb.doedres_damning),
  createCollectionCard(cardDb.doedres_damning, true),
  
  // Circle of Anguish - Herald rings
  createCollectionCard(cardDb.circle_of_anguish),
  createCollectionCard(cardDb.circle_of_anguish),
  createCollectionCard(cardDb.circle_of_guilt),
  createCollectionCard(cardDb.circle_of_guilt),
  
  // Stormfire - Ignite ring
  createCollectionCard(cardDb.stormfire),
  createCollectionCard(cardDb.stormfire),
  
  // Emberwake - Fire ring
  createCollectionCard(cardDb.emberwake),
  
  // Jewels (common) - Players farm lots of these
  createCollectionCard(cardDb.intuitive_leap),
  createCollectionCard(cardDb.intuitive_leap),
  createCollectionCard(cardDb.primordial_might),
  createCollectionCard(cardDb.primordial_might),
  createCollectionCard(cardDb.primordial_might),
  createCollectionCard(cardDb.inspired_learning),
  createCollectionCard(cardDb.inspired_learning),
  createCollectionCard(cardDb.inspired_learning, true),
  createCollectionCard(cardDb.might_of_the_meek),
  createCollectionCard(cardDb.might_of_the_meek),
  createCollectionCard(cardDb.rain_of_splinters),
  createCollectionCard(cardDb.rain_of_splinters),
  createCollectionCard(cardDb.rain_of_splinters),
  createCollectionCard(cardDb.rain_of_splinters),
  createCollectionCard(cardDb.primordial_harmony),
  createCollectionCard(cardDb.primordial_harmony),
  createCollectionCard(cardDb.primordial_eminence),
  createCollectionCard(cardDb.pure_talent),
  createCollectionCard(cardDb.pacifism),
  createCollectionCard(cardDb.tempered_spirit),
  createCollectionCard(cardDb.tempered_spirit),
  createCollectionCard(cardDb.brute_force_solution),
  createCollectionCard(cardDb.brute_force_solution),
  createCollectionCard(cardDb.sublime_vision),
  createCollectionCard(cardDb.fertile_mind),
  createCollectionCard(cardDb.firesong),
  createCollectionCard(cardDb.kitavas_teachings),
  createCollectionCard(cardDb.kitavas_teachings),
  
  // Amulets
  createCollectionCard(cardDb.victarios_acuity),
  createCollectionCard(cardDb.doedres_tongue),
  createCollectionCard(cardDb.doedres_tongue),
  createCollectionCard(cardDb.stranglegasp),
  createCollectionCard(cardDb.voice_of_the_storm),
  createCollectionCard(cardDb.fury_valve),
  createCollectionCard(cardDb.bloodsoaked_medallion),
  createCollectionCard(cardDb.bloodsoaked_medallion),
  createCollectionCard(cardDb.tainted_pact),
  
  // Rings
  createCollectionCard(cardDb.valyrium),
  createCollectionCard(cardDb.blackflame),
  createCollectionCard(cardDb.coiling_whisper),
  createCollectionCard(cardDb.valakos_sign),
  createCollectionCard(cardDb.profane_proxy),
  createCollectionCard(cardDb.profane_proxy),
  createCollectionCard(cardDb.heartbound_loop),
  createCollectionCard(cardDb.icefang_orbit),
  createCollectionCard(cardDb.replica_doedres_damning),
  
  // Belts
  createCollectionCard(cardDb.faminebind),
  createCollectionCard(cardDb.ryslathas_coil),
  createCollectionCard(cardDb.ryslathas_coil),
  createCollectionCard(cardDb.siegebreaker),
  createCollectionCard(cardDb.leash_of_oblation),
  createCollectionCard(cardDb.maligaros_restraint),
  createCollectionCard(cardDb.olesyas_delight),
  
  // ========== T2 UNCOMMONS - Mid-tier items ==========
  
  // The Magnate - Damage belt
  createCollectionCard(cardDb.the_magnate),
  createCollectionCard(cardDb.the_magnate),
  
  // The Flow Untethered - Harbinger belt
  createCollectionCard(cardDb.the_flow_untethered),
  
  // The Torrent's Reclamation - Quiver belt
  createCollectionCard(cardDb.the_torrents_reclamation),
  createCollectionCard(cardDb.the_torrents_reclamation, true), // foil
  
  // The Ivory Tower - ES body armour
  createCollectionCard(cardDb.the_ivory_tower),
  
  // The Coming Calamity - Herald chest
  createCollectionCard(cardDb.the_coming_calamity),
  createCollectionCard(cardDb.the_coming_calamity),
  
  // The Three Dragons - Elemental helmet
  createCollectionCard(cardDb.the_three_dragons),
  createCollectionCard(cardDb.the_three_dragons),
  createCollectionCard(cardDb.the_three_dragons),
  
  // The Iron Fortress - Block chest
  createCollectionCard(cardDb.the_iron_fortress),
  
  // The Light of Meaning - Jewel
  createCollectionCard(cardDb.the_light_of_meaning),
  createCollectionCard(cardDb.the_light_of_meaning),
  
  // The Interrogation - Secrets jewel
  createCollectionCard(cardDb.the_interrogation),
  
  // The Rat Cage - Fire damage chest
  createCollectionCard(cardDb.the_rat_cage),

  // ========== T1 EPICS - A few lucky drops ==========
  
  // Megalomaniac - Cluster jewel
  createCollectionCard(cardDb.megalomaniac),
  createCollectionCard(cardDb.megalomaniac),
  createCollectionCard(cardDb.megalomaniac, true),
  
  // Carcass Jack - AoE chest
  createCollectionCard(cardDb.carcass_jack),
  
  // Belly of the Beast - Life chest
  createCollectionCard(cardDb.belly_of_the_beast),
  
  // Starkonja's Head - Evasion helmet
  createCollectionCard(cardDb.starkonjas_head),
  createCollectionCard(cardDb.starkonjas_head),
  
  // Devoto's Devotion - Speed helmet
  createCollectionCard(cardDb.devotos_devotion),
  
  // Inpulsa's Broken Heart - Shock chest
  createCollectionCard(cardDb.inpulsas_broken_heart),
  
  // Darkray Vectors - Frenzy boots
  createCollectionCard(cardDb.darkray_vectors),
  
  // Rat's Nest - Crit helmet
  createCollectionCard(cardDb.rats_nest),
  
  // The Taming - Unique ring
  createCollectionCard(cardDb.the_taming),
  
  // The Balance of Terror - Curse jewel
  createCollectionCard(cardDb.the_balance_of_terror),
  
  // The Golden Rule - Poison jewel
  createCollectionCard(cardDb.the_golden_rule),
  
  // The Primordial Chain - Golem amulet
  createCollectionCard(cardDb.the_primordial_chain),
  
  // The Pariah - Socket ring
  createCollectionCard(cardDb.the_pariah),
  
  // The Hungry Loop - Skill ring
  createCollectionCard(cardDb.the_hungry_loop),
  
  // Perseverance belt
  createCollectionCard(cardDb.perseverance),
  
  // ========== T0 LEGENDARIES - Very rare! Player got lucky ==========
  
  // Thread of Hope - Player's best drop!
  createCollectionCard(cardDb.thread_of_hope),
  
  // Brutal Restraint - Timeless jewel
  createCollectionCard(cardDb.brutal_restraint),
  
  // Lethal Pride - Another timeless jewel (foil!)
  createCollectionCard(cardDb.lethal_pride, true),
  
  // Ventor's Gamble - MF ring
  createCollectionCard(cardDb.ventors_gamble),
  
  // Berek's Respite - Elemental ring
  createCollectionCard(cardDb.bereks_respite)
]

// Filter out undefined cards and ensure unique UIDs
export const mockUserCollection: Card[] = collectionCards
  .filter((card): card is Card => card !== undefined)

// Statistics about the collection for debugging
export const collectionStats = {
  total: mockUserCollection.length,
  byTier: {
    T0: mockUserCollection.filter(c => c.tier === 'T0').length,
    T1: mockUserCollection.filter(c => c.tier === 'T1').length,
    T2: mockUserCollection.filter(c => c.tier === 'T2').length,
    T3: mockUserCollection.filter(c => c.tier === 'T3').length
  },
  foils: mockUserCollection.filter(c => c.foil === true).length,
  uniqueCards: new Set(mockUserCollection.map(c => c.id)).size
}

