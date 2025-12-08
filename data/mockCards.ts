import type { Card } from '~/types/card'

// All available cards in the game (catalog)
export const allCards: Card[] = [
  {
    uid: 900003,
    id: 'grizzlab',
    name: 'Grizzlab',
    itemClass: 'Golden Mask',
    rarity: 'Unique',
    tier: 'T0',
    flavourText: 'Revered by all Doseurs, the Grizzlab rules the Temple of the Dose.',
    wikiUrl: '',
    gameData: {
      weight: 0.7,
      img: ''
    }
  },
  {
    uid: 14,
    id: 'voidforge',
    name: 'Voidforge',
    itemClass: 'Infernal Sword',
    rarity: 'Unique',
    tier: 'T1',
    flavourText: 'Infinity waits patiently beyond the edge of steel.',
    wikiUrl: 'https://www.poewiki.net/wiki/Voidforge',
    gameData: {
      weight: 0.8,
      img: 'https://web.poecdn.com/image/Art/2DItems/Weapons/TwoHandWeapons/TwoHandSwords/Voidforge.png'
    }
  },
  {
    uid: 16,
    id: 'voices',
    name: 'Voices',
    itemClass: 'Large Cluster Jewel',
    rarity: 'Unique',
    tier: 'T1',
    flavourText: 'Countless whispers, one terrible chorus.',
    wikiUrl: 'https://www.poewiki.net/wiki/Voices',
    gameData: {
      weight: 0.8,
      img: 'https://web.poecdn.com/image/Art/2DItems/Jewels/Voices.png'
    }
  },
  {
    uid: 20,
    id: 'headhunter',
    name: 'Headhunter',
    itemClass: 'Leather Belt',
    rarity: 'Unique',
    tier: 'T0',
    flavourText: 'A life for a life.',
    wikiUrl: 'https://www.poewiki.net/wiki/Headhunter',
    gameData: {
      weight: 0.5,
      img: 'https://web.poecdn.com/image/Art/2DItems/Belts/Headhunter.png'
    }
  },
  {
    uid: 22,
    id: 'mageblood',
    name: 'Mageblood',
    itemClass: 'Heavy Belt',
    rarity: 'Unique',
    tier: 'T0',
    flavourText: 'The power of alchemy runs through your veins.',
    wikiUrl: 'https://www.poewiki.net/wiki/Mageblood',
    gameData: {
      weight: 0.4,
      img: 'https://web.poecdn.com/image/Art/2DItems/Belts/Mageblood.png'
    }
  },
  {
    uid: 25,
    id: 'aegis-aurora',
    name: 'Aegis Aurora',
    itemClass: 'Champion Kite Shield',
    rarity: 'Unique',
    tier: 'T2',
    flavourText: 'To find a light in the darkness, you must first become the dark.',
    wikiUrl: 'https://www.poewiki.net/wiki/Aegis_Aurora',
    gameData: {
      weight: 1.2,
      img: 'https://web.poecdn.com/image/Art/2DItems/Armours/Shields/AegisAurora.png'
    }
  },
  {
    uid: 28,
    id: 'ashes-of-the-stars',
    name: 'Ashes of the Stars',
    itemClass: 'Onyx Amulet',
    rarity: 'Unique',
    tier: 'T1',
    flavourText: 'What remains when the universe ends?',
    wikiUrl: 'https://www.poewiki.net/wiki/Ashes_of_the_Stars',
    gameData: {
      weight: 0.9,
      img: 'https://web.poecdn.com/image/Art/2DItems/Amulets/AshesOfTheStars.png'
    }
  },
  {
    uid: 32,
    id: 'wanderlust',
    name: 'Wanderlust',
    itemClass: 'Wool Shoes',
    rarity: 'Unique',
    tier: 'T3',
    flavourText: 'The road never truly ends.',
    wikiUrl: 'https://www.poewiki.net/wiki/Wanderlust',
    gameData: {
      weight: 1,
      img: 'https://web.poecdn.com/image/Art/2DItems/Armours/Boots/Wanderlust.png'
    }
  },
  {
    uid: 35,
    id: 'goldrim',
    name: 'Goldrim',
    itemClass: 'Leather Cap',
    rarity: 'Unique',
    tier: 'T3',
    flavourText: 'No enemy of mine will ever have to wonder who killed them.',
    wikiUrl: 'https://www.poewiki.net/wiki/Goldrim',
    gameData: {
      weight: 1.5,
      img: 'https://web.poecdn.com/image/Art/2DItems/Armours/Helmets/Goldrim.png'
    }
  },
  {
    uid: 38,
    id: 'tabula-rasa',
    name: 'Tabula Rasa',
    itemClass: 'Simple Robe',
    rarity: 'Unique',
    tier: 'T3',
    flavourText: 'The only limit is your imagination.',
    wikiUrl: 'https://www.poewiki.net/wiki/Tabula_Rasa',
    gameData: {
      weight: 1.2,
      img: 'https://web.poecdn.com/image/Art/2DItems/Armours/BodyArmours/TabulaRasa.png'
    }
  },
  {
    uid: 40,
    id: 'devoto-devotion',
    name: "Devoto's Devotion",
    itemClass: 'Nightmare Bascinet',
    rarity: 'Unique',
    tier: 'T2',
    flavourText: 'Swift as thought, strong as faith.',
    wikiUrl: 'https://www.poewiki.net/wiki/Devoto%27s_Devotion',
    gameData: {
      weight: 1.1,
      img: 'https://web.poecdn.com/image/Art/2DItems/Armours/Helmets/DevotosDevotion.png'
    }
  },
  {
    uid: 42,
    id: 'starforge',
    name: 'Starforge',
    itemClass: 'Infernal Sword',
    rarity: 'Unique',
    tier: 'T2',
    flavourText: 'The stars are dying. One by one, their light fades.',
    wikiUrl: 'https://www.poewiki.net/wiki/Starforge',
    gameData: {
      weight: 1.0,
      img: 'https://web.poecdn.com/image/Art/2DItems/Weapons/TwoHandWeapons/TwoHandSwords/Starforge.png'
    }
  }
]

// Mock user collection (simulating a viewer's cards)
// Only cards with WORKING images for better visual testing
// Now includes duplicates to test the stack feature
// Includes foil variations to test the foil effect system
export const mockUserCollection: Card[] = [
  // T0 - Légendaires (1 standard + 1 foil Headhunter)
  {
    uid: 20,
    id: 'headhunter',
    name: 'Headhunter',
    itemClass: 'Leather Belt',
    rarity: 'Unique',
    tier: 'T0',
    flavourText: 'A life for a life.',
    wikiUrl: 'https://www.poewiki.net/wiki/Headhunter',
    gameData: {
      weight: 0.5,
      img: 'https://web.poecdn.com/image/Art/2DItems/Belts/Headhunter.png'
    },
    variation: 'standard'
  },
  {
    uid: 21,
    id: 'headhunter',
    name: 'Headhunter',
    itemClass: 'Leather Belt',
    rarity: 'Unique',
    tier: 'T0',
    flavourText: 'A life for a life.',
    wikiUrl: 'https://www.poewiki.net/wiki/Headhunter',
    gameData: {
      weight: 0.5,
      img: 'https://web.poecdn.com/image/Art/2DItems/Belts/Headhunter.png'
    },
    variation: 'foil'
  },
  // T1 - Épiques (1 foil Ashes of the Stars)
  {
    uid: 28,
    id: 'ashes-of-the-stars',
    name: 'Ashes of the Stars',
    itemClass: 'Onyx Amulet',
    rarity: 'Unique',
    tier: 'T1',
    flavourText: 'What remains when the universe ends?',
    wikiUrl: 'https://www.poewiki.net/wiki/Ashes_of_the_Stars',
    gameData: {
      weight: 0.9,
      img: 'https://web.poecdn.com/image/Art/2DItems/Weapons/TwoHandWeapons/TwoHandSwords/Starforge.png' // dont change, temporary
    },
    variation: 'foil'
  },
  // T2 - Peu communs (2 Starforge standard + 1 foil)
  {
    uid: 42,
    id: 'starforge',
    name: 'Starforge',
    itemClass: 'Infernal Sword',
    rarity: 'Unique',
    tier: 'T2',
    flavourText: 'The stars are dying. One by one, their light fades.',
    wikiUrl: 'https://www.poewiki.net/wiki/Starforge',
    gameData: {
      weight: 1.0,
      img: 'https://web.poecdn.com/image/Art/2DItems/Weapons/TwoHandWeapons/TwoHandSwords/Starforge.png'
    },
    variation: 'standard'
  },
  {
    uid: 43,
    id: 'starforge',
    name: 'Starforge',
    itemClass: 'Infernal Sword',
    rarity: 'Unique',
    tier: 'T2',
    flavourText: 'The stars are dying. One by one, their light fades.',
    wikiUrl: 'https://www.poewiki.net/wiki/Starforge',
    gameData: {
      weight: 1.0,
      img: 'https://web.poecdn.com/image/Art/2DItems/Weapons/TwoHandWeapons/TwoHandSwords/Starforge.png'
    },
    variation: 'standard'
  },
  {
    uid: 44,
    id: 'starforge',
    name: 'Starforge',
    itemClass: 'Infernal Sword',
    rarity: 'Unique',
    tier: 'T2',
    flavourText: 'The stars are dying. One by one, their light fades.',
    wikiUrl: 'https://www.poewiki.net/wiki/Starforge',
    gameData: {
      weight: 1.0,
      img: 'https://web.poecdn.com/image/Art/2DItems/Weapons/TwoHandWeapons/TwoHandSwords/Starforge.png'
    },
    variation: 'foil'
  },
  // T3 - Communs (3 Wanderlust, many Tabula Rasa + 2 foil Tabula)
  {
    uid: 32,
    id: 'wanderlust',
    name: 'Wanderlust',
    itemClass: 'Wool Shoes',
    rarity: 'Unique',
    tier: 'T3',
    flavourText: 'The road never truly ends.',
    wikiUrl: 'https://www.poewiki.net/wiki/Wanderlust',
    gameData: {
      weight: 1,
      img: 'https://web.poecdn.com/image/Art/2DItems/Armours/Boots/Wanderlust.png'
    },
    variation: 'standard'
  },
  {
    uid: 33,
    id: 'wanderlust',
    name: 'Wanderlust',
    itemClass: 'Wool Shoes',
    rarity: 'Unique',
    tier: 'T3',
    flavourText: 'The road never truly ends.',
    wikiUrl: 'https://www.poewiki.net/wiki/Wanderlust',
    gameData: {
      weight: 1,
      img: 'https://web.poecdn.com/image/Art/2DItems/Armours/Boots/Wanderlust.png'
    },
    variation: 'standard'
  },
  {
    uid: 34,
    id: 'wanderlust',
    name: 'Wanderlust',
    itemClass: 'Wool Shoes',
    rarity: 'Unique',
    tier: 'T3',
    flavourText: 'The road never truly ends.',
    wikiUrl: 'https://www.poewiki.net/wiki/Wanderlust',
    gameData: {
      weight: 1,
      img: 'https://web.poecdn.com/image/Art/2DItems/Armours/Boots/Wanderlust.png'
    },
    variation: 'standard'
  },
  // Tabula Rasa - mix of standard and foil
  {
    uid: 38,
    id: 'tabula-rasa',
    name: 'Tabula Rasa',
    itemClass: 'Simple Robe',
    rarity: 'Unique',
    tier: 'T3',
    flavourText: 'The only limit is your imagination.',
    wikiUrl: 'https://www.poewiki.net/wiki/Tabula_Rasa',
    gameData: {
      weight: 1.2,
      img: 'https://web.poecdn.com/image/Art/2DItems/Armours/BodyArmours/TabulaRasa.png'
    },
    variation: 'standard'
  },
  {
    uid: 39,
    id: 'tabula-rasa',
    name: 'Tabula Rasa',
    itemClass: 'Simple Robe',
    rarity: 'Unique',
    tier: 'T3',
    flavourText: 'The only limit is your imagination.',
    wikiUrl: 'https://www.poewiki.net/wiki/Tabula_Rasa',
    gameData: {
      weight: 1.2,
      img: 'https://web.poecdn.com/image/Art/2DItems/Armours/BodyArmours/TabulaRasa.png'
    },
    variation: 'foil'  // First foil Tabula
  },
  {
    uid: 40,
    id: 'tabula-rasa',
    name: 'Tabula Rasa',
    itemClass: 'Simple Robe',
    rarity: 'Unique',
    tier: 'T3',
    flavourText: 'The only limit is your imagination.',
    wikiUrl: 'https://www.poewiki.net/wiki/Tabula_Rasa',
    gameData: {
      weight: 1.2,
      img: 'https://web.poecdn.com/image/Art/2DItems/Armours/BodyArmours/TabulaRasa.png'
    },
    variation: 'standard'
  },
  {
    uid: 41,
    id: 'tabula-rasa',
    name: 'Tabula Rasa',
    itemClass: 'Simple Robe',
    rarity: 'Unique',
    tier: 'T3',
    flavourText: 'The only limit is your imagination.',
    wikiUrl: 'https://www.poewiki.net/wiki/Tabula_Rasa',
    gameData: {
      weight: 1.2,
      img: 'https://web.poecdn.com/image/Art/2DItems/Armours/BodyArmours/TabulaRasa.png'
    },
    variation: 'foil'  // Second foil Tabula
  },
  {
    uid: 45,
    id: 'tabula-rasa',
    name: 'Tabula Rasa',
    itemClass: 'Simple Robe',
    rarity: 'Unique',
    tier: 'T3',
    flavourText: 'The only limit is your imagination.',
    wikiUrl: 'https://www.poewiki.net/wiki/Tabula_Rasa',
    gameData: {
      weight: 1.2,
      img: 'https://web.poecdn.com/image/Art/2DItems/Armours/BodyArmours/TabulaRasa.png'
    },
    variation: 'standard'
  },
  {
    uid: 46,
    id: 'tabula-rasa',
    name: 'Tabula Rasa',
    itemClass: 'Simple Robe',
    rarity: 'Unique',
    tier: 'T3',
    flavourText: 'The only limit is your imagination.',
    wikiUrl: 'https://www.poewiki.net/wiki/Tabula_Rasa',
    gameData: {
      weight: 1.2,
      img: 'https://web.poecdn.com/image/Art/2DItems/Armours/BodyArmours/TabulaRasa.png'
    },
    variation: 'standard'
  },
  {
    uid: 47,
    id: 'tabula-rasa',
    name: 'Tabula Rasa',
    itemClass: 'Simple Robe',
    rarity: 'Unique',
    tier: 'T3',
    flavourText: 'The only limit is your imagination.',
    wikiUrl: 'https://www.poewiki.net/wiki/Tabula_Rasa',
    gameData: {
      weight: 1.2,
      img: 'https://web.poecdn.com/image/Art/2DItems/Armours/BodyArmours/TabulaRasa.png'
    },
    variation: 'standard'
  },
  {
    uid: 48,
    id: 'tabula-rasa',
    name: 'Tabula Rasa',
    itemClass: 'Simple Robe',
    rarity: 'Unique',
    tier: 'T3',
    flavourText: 'The only limit is your imagination.',
    wikiUrl: 'https://www.poewiki.net/wiki/Tabula_Rasa',
    gameData: {
      weight: 1.2,
      img: 'https://web.poecdn.com/image/Art/2DItems/Armours/BodyArmours/TabulaRasa.png'
    },
    variation: 'standard'
  },
  // Additional Tabula Rasa for testing scroll (all standard)
  { uid: 52, id: 'tabula-rasa', name: 'Tabula Rasa', itemClass: 'Simple Robe', rarity: 'Unique', tier: 'T3', flavourText: 'The only limit is your imagination.', wikiUrl: 'https://www.poewiki.net/wiki/Tabula_Rasa', gameData: { weight: 1.2, img: 'https://web.poecdn.com/image/Art/2DItems/Armours/BodyArmours/TabulaRasa.png' }, variation: 'standard' },
  { uid: 53, id: 'tabula-rasa', name: 'Tabula Rasa', itemClass: 'Simple Robe', rarity: 'Unique', tier: 'T3', flavourText: 'The only limit is your imagination.', wikiUrl: 'https://www.poewiki.net/wiki/Tabula_Rasa', gameData: { weight: 1.2, img: 'https://web.poecdn.com/image/Art/2DItems/Armours/BodyArmours/TabulaRasa.png' }, variation: 'standard' },
  { uid: 54, id: 'tabula-rasa', name: 'Tabula Rasa', itemClass: 'Simple Robe', rarity: 'Unique', tier: 'T3', flavourText: 'The only limit is your imagination.', wikiUrl: 'https://www.poewiki.net/wiki/Tabula_Rasa', gameData: { weight: 1.2, img: 'https://web.poecdn.com/image/Art/2DItems/Armours/BodyArmours/TabulaRasa.png' }, variation: 'standard' },
  { uid: 55, id: 'tabula-rasa', name: 'Tabula Rasa', itemClass: 'Simple Robe', rarity: 'Unique', tier: 'T3', flavourText: 'The only limit is your imagination.', wikiUrl: 'https://www.poewiki.net/wiki/Tabula_Rasa', gameData: { weight: 1.2, img: 'https://web.poecdn.com/image/Art/2DItems/Armours/BodyArmours/TabulaRasa.png' }, variation: 'standard' },
  { uid: 56, id: 'tabula-rasa', name: 'Tabula Rasa', itemClass: 'Simple Robe', rarity: 'Unique', tier: 'T3', flavourText: 'The only limit is your imagination.', wikiUrl: 'https://www.poewiki.net/wiki/Tabula_Rasa', gameData: { weight: 1.2, img: 'https://web.poecdn.com/image/Art/2DItems/Armours/BodyArmours/TabulaRasa.png' }, variation: 'standard' }
]

