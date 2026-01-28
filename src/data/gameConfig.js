// Spielkonfiguration

export const GAME_CONFIG = {
  // Canvas-Einstellungen
  canvas: {
    width: 1200,
    height: 700,
    backgroundColor: '#4A90B8'
  },

  // === BELOHNUNGEN ===
  // Basis-XP pro Sortierung (wird mit Stab-Anzahl multipliziert)
  baseXPPerSort: 10,
  
  // Basis-Diamanten pro Sortierung
  baseDiamondsPerSort: 2,

  // XP für Level-Up (skaliert exponentiell)
  xpPerLevel: (level) => Math.floor(100 * Math.pow(1.15, level - 1)),

  // Bonus XP pro gekauftem Stab (summiert sich)
  stickXPBonus: {
    1: 5,    // Kevin
    4: 10,   // Mützi  
    6: 20,   // Schlorpfian
    8: 35,   // Beppo
    9: 55,   // Doppelzopfine
    12: 80,  // Berft
    14: 120  // Handbert
  },

  // Bonus Diamanten pro gekauftem Stab (summiert sich)
  stickDiamondBonus: {
    1: 2,    // Kevin: +1 💎
    4: 4,    // Mützi: +1 💎
    6: 8,    // Schlorpfian: +2 💎
    8: 12,    // Beppo: +3 💎
    9: 16,    // Doppelzopfine: +4 💎
    12: 20,   // Berft: +5 💎
    14: 40    // Handbert: +8 💎
  },

  // === PRESTIGE SYSTEM ===
  prestige: {
    // XP-Multiplikator: +25% pro Prestige-Level
    xpMultiplierBonus: 0.25
  },

  // Animationen
  animations: {
    stickSlideDuration: 0.2,
    insertionGap: 80,
    successMessageDuration: 1500
  },

  // Hitbox
  hitbox: {
    alphaThreshold: 10,
    padding: 5
  },

  // Stab-Positionierung
  sticks: {
    baseY: 100,
    spacing: 20,
    maxDisplayHeight: 500,
    scaleFactor: 0.25
  }
};

// === STAB-PREISE (Basis, wird mit Prestige-Multiplikator skaliert) ===
export const STICK_BASE_PRICES = {
  1: 25,      // Kevin
  4: 50,      // Mützi
  6: 100,     // Schlorpfian
  8: 200,     // Beppo
  9: 400,     // Doppelzopfine
  12: 600,    // Berft
  14: 1000    // Handbert
};

// Rückwärtskompatibilität
export const STICK_PRICES = STICK_BASE_PRICES;

// Standard-Stäbe (hat man von Anfang an, keine Verkäufer)
export const DEFAULT_STICKS = [2, 3, 5, 7, 10, 11, 13];

// Verkäufbare Stäbe (alle mit Verkäufern)
export const PURCHASABLE_STICKS = [1, 4, 6, 8, 9, 12, 14];

// Alle Stab-IDs
export const ALL_STICK_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

// Initial State - startet mit den 7 Standard-Stäben
export const INITIAL_STATE = {
  level: 1,
  currentXP: 0,
  totalXP: 0,
  diamonds: 0, // Start mit 0 Diamanten
  ownedSticks: [2, 3, 5, 7, 10, 11, 13],
  prestigeLevel: 0,
  xpMultiplier: 1.0,
  diamondMultiplier: 1.0, // Neu: Diamanten-Multiplikator
  totalSorts: 0,
  totalDiamondsEarned: 0,
  playerName: '',
  musicVolume: 50,
  sfxVolume: 50,
  lastSaved: null,
  version: 3
};

