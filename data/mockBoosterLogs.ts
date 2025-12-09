import type { Card, CardTier } from '~/types/card';
import { allCards } from './mockCards';

export interface BoosterContent {
  uid: number;
  card: Card;
  isFoil: boolean;
}

export interface BoosterLog {
  id: string;
  username: string;
  timestamp: Date;
  content: BoosterContent[];
  hasHighTier: boolean;
  highestTier: CardTier | null;
}

const twitchUsernames = [
  'xQc_le_goat',
  'PogChampMaster',
  'Kappa_King_42',
  'StreamSniper99',
  'NoLifeGamer',
  'SaltLord420',
  'MonkaS_Andy',
  'PepeHands_',
  'LUL_is_life',
  'TriHard7777',
  'CoolStoryBob',
  'WeirdChamp_',
  'Sadge_moment',
  'EZClap_',
  'Copium_dealer',
  'Hopium_addict',
  'OMEGALUL_',
  'PauseChamp_',
  'Aware_Andy',
  'Clueless_',
  'Based_gamer',
  'Cringe_lord',
  'PepegaAim',
  'Malding_',
  'Bogged_trader',
  'GIGACHAD_',
  'VeryPog',
  'Jebaited_',
  'BlessRNG_',
  'FeelsBadMan_',
  'FeelsGoodMan_',
  'HeyGuys_',
  'BibleThump_',
  'DansGame_',
  'WutFace_',
  'PJSalt_',
  'ResidentSleeper',
  'NotLikeThis_',
  'TakeMyEnergy',
  'PowerUpL_',
  'Exile_de_Wraeclast',
  'Ziz_wannabe',
  'Mathil_fan',
  'Empyrian_simp',
  'PathOfMemes',
  'VaalOrNoB',
  'MirrorDropper',
  'HeadhunterDream',
  'MagebloodHunter',
  'DivineOrb_',
  'ExaltedSlam',
  'ChaosSpammer',
  'MapSustain',
  'JuicerOfMaps',
  'SSF_Andy',
  'TradeLeagueEnjoyer',
  'GGG_please',
  'NecroBotEnjoyer',
  'SlamAndPray',
  'CraftingGambler',
  'YoloAnnul',
  'BrickMyItem',
  'DoubleCorrGang',
  'VaalItOrFail',
  'Le_Doseur_OG',
  'DoseurDeChoc',
  'MaxiDose',
  'MiniDose',
  'DoubleDose',
  'TrippleDose',
  'UltraDoseur',
  'MegaDoseur',
  'GigaDoseur',
  'NanoDoseur',
  'Doseur_Supreme',
  'Doseur_Ultime',
  'LeDoseMax',
  'OverDose_',
  'SousDose_',
  'UneDose_',
  'DeuxDoses_',
  'TroisDoses_',
  'Injecteur_De_Dose',
  'LaCaveADose',
  'LeFournisseur',
  'LeDistributeur',
  'DoseMatinale',
];

function getCardByTier(tier: CardTier): Card {
  const filteredCards = allCards.filter(c => c.tier === tier);
  return filteredCards[Math.floor(Math.random() * filteredCards.length)];
}

function getRandomWeightedCard(): Card {
  const tiers: CardTier[] = ['T0', 'T1', 'T2', 'T3'];
  // T0 très rare mais pas impossible, T1 rare, T2/T3 communs
  const weights = [0.002, 0.05, 0.30, 0.648];
  const random = Math.random();
  let cumulative = 0;
  let selectedTier: CardTier = 'T3';
  
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (random < cumulative) {
      selectedTier = tiers[i];
      break;
    }
  }
  
  return getCardByTier(selectedTier);
}

function getGuaranteedHighTierCard(): Card {
  const highTiers: CardTier[] = ['T0', 'T1', 'T2'];
  // T0 ~2%, T1 ~15%, T2 ~83% - équilibré pour voir quelques T0 sur 60 logs
  const weights = [0.02, 0.15, 0.83];
  const random = Math.random();
  let cumulative = 0;
  let selectedTier: CardTier = 'T2';
  
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (random < cumulative) {
      selectedTier = highTiers[i];
      break;
    }
  }
  
  return getCardByTier(selectedTier);
}

function rollFoil(): boolean {
  return Math.random() < 0.12; // ~12% de chance d'être foil
}

function generateBoosterContent(): BoosterContent[] {
  const content: BoosterContent[] = [];
  let uidCounter = 1;
  
  const guaranteedHighTier = getGuaranteedHighTierCard();
  content.push({ uid: uidCounter++, card: guaranteedHighTier, isFoil: rollFoil() });
  
  for (let i = 0; i < 4; i++) {
    content.push({ uid: uidCounter++, card: getRandomWeightedCard(), isFoil: rollFoil() });
  }
  
  return content.sort((a, b) => {
    const tierOrder: Record<CardTier, number> = { T0: 0, T1: 1, T2: 2, T3: 3 };
    return tierOrder[a.card.tier as CardTier] - tierOrder[b.card.tier as CardTier];
  });
}

function getHighestTier(content: BoosterContent[]): CardTier {
  const tierOrder: Record<CardTier, number> = { T0: 0, T1: 1, T2: 2, T3: 3 };
  let highest: CardTier = 'T3';
  
  for (const item of content) {
    if (tierOrder[item.card.tier as CardTier] < tierOrder[highest]) {
      highest = item.card.tier as CardTier;
    }
  }
  
  return highest;
}

function generateRandomTimestamp(hoursAgo: number): Date {
  const now = new Date();
  const msAgo = hoursAgo * 60 * 60 * 1000;
  const randomOffset = Math.random() * msAgo;
  return new Date(now.getTime() - randomOffset);
}

function generateBoosterLog(id: string, hoursAgoMax: number): BoosterLog {
  const username = twitchUsernames[Math.floor(Math.random() * twitchUsernames.length)];
  const content = generateBoosterContent();
  const highestTier = getHighestTier(content);
  
  return {
    id,
    username,
    timestamp: generateRandomTimestamp(hoursAgoMax),
    content,
    hasHighTier: highestTier === 'T0' || highestTier === 'T1',
    highestTier,
  };
}

export function generateMockBoosterLogs(count: number = 50): BoosterLog[] {
  const logs: BoosterLog[] = [];
  
  for (let i = 0; i < count; i++) {
    const hoursAgo = (i / count) * 72;
    logs.push(generateBoosterLog(`log-${i}`, hoursAgo));
  }
  
  return logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

export const mockBoosterLogs = generateMockBoosterLogs(60);

