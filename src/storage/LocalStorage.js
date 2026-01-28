// LocalStorage - Speichert und lädt den Spielstand

import { INITIAL_STATE, GAME_CONFIG } from '../data/gameConfig.js';

class GameStateManager {
  constructor() {
    this.STORAGE_KEY = 'anordnen_save';
    this.state = null;
    this.listeners = new Map();
  }

  /**
   * Lädt den Spielstand
   */
  load() {
    const saved = localStorage.getItem(this.STORAGE_KEY);

    if (saved) {
      try {
        this.state = JSON.parse(saved);
        this.migrateIfNeeded();
      } catch (e) {
        console.error('Failed to load save:', e);
        this.state = { ...INITIAL_STATE };
      }
    } else {
      this.state = { ...INITIAL_STATE };
    }

    return this.state;
  }

  /**
   * Speichert den Spielstand
   */
  save() {
    this.state.lastSaved = Date.now();
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
  }

  /**
   * Aktualisiert den Spielstand
   */
  update(changes) {
    const oldState = { ...this.state };
    Object.assign(this.state, changes);

    // Benachrichtige Listener
    for (const [key, value] of Object.entries(changes)) {
      if (this.listeners.has(key)) {
        this.listeners.get(key).forEach(cb => cb(value, oldState[key]));
      }
    }

    // Auto-save
    this.save();
  }

  /**
   * Subscribes zu Änderungen
   */
  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push(callback);

    // Rückgabe einer Unsubscribe-Funktion
    return () => {
      const listeners = this.listeners.get(key);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  /**
   * Migriert alte Spielstände
   */
  migrateIfNeeded() {
    // Füge fehlende Felder hinzu
    for (const [key, value] of Object.entries(INITIAL_STATE)) {
      if (!(key in this.state)) {
        this.state[key] = value;
      }
    }

    // Version Migration
    if (!this.state.version || this.state.version < 2) {
      // v2: Standard-Stäbe sind jetzt 2,3,5,7,10,11,13 statt nur 1
      // Prüfe ob wir den alten State haben (nur Stab 1)
      if (this.state.ownedSticks.length === 1 && this.state.ownedSticks[0] === 1) {
        // Setze auf neue Standard-Stäbe
        this.state.ownedSticks = [...INITIAL_STATE.ownedSticks];
      } else {
        // Füge Standard-Stäbe hinzu, falls sie fehlen
        const defaultSticks = [2, 3, 5, 7, 10, 11, 13];
        for (const stick of defaultSticks) {
          if (!this.state.ownedSticks.includes(stick)) {
            this.state.ownedSticks.push(stick);
          }
        }
        this.state.ownedSticks.sort((a, b) => a - b);
      }
      this.state.version = 2;
    }
    
    // v3: Diamanten-Multiplikator hinzufügen
    if (this.state.version < 3) {
      // Berechne Diamanten-Multiplikator basierend auf Prestige-Level
      const prestigeConfig = GAME_CONFIG.prestige || { diamondMultiplierBonus: 0.25 };
      this.state.diamondMultiplier = 1 + (this.state.prestigeLevel * prestigeConfig.diamondMultiplierBonus);
      this.state.version = 3;
    }
    
    this.save();
  }

  /**
   * Setzt den Spielstand zurück (für Prestige)
   */
  resetForPrestige() {
    const prestigeConfig = GAME_CONFIG.prestige || { xpMultiplierBonus: 0.25 };
    const newPrestigeLevel = this.state.prestigeLevel + 1;
    const newXPMultiplier = 1 + (newPrestigeLevel * prestigeConfig.xpMultiplierBonus);

    this.state = {
      ...INITIAL_STATE,
      version: 3,
      prestigeLevel: newPrestigeLevel,
      xpMultiplier: newXPMultiplier,
      diamondMultiplier: 1.0, // Kein Diamanten-Multiplikator mehr
      playerName: this.state.playerName,
      musicVolume: this.state.musicVolume,
      sfxVolume: this.state.sfxVolume,
      // Behalte Level und Total XP
      level: this.state.level,
      totalXP: this.state.totalXP,
      // Standard-Stäbe zurücksetzen
      ownedSticks: [2, 3, 5, 7, 10, 11, 13]
    };

    this.save();
    return this.state;
  }

  /**
   * Setzt alles komplett zurück
   */
  fullReset() {
    this.state = { ...INITIAL_STATE };
    this.save();
    return this.state;
  }

  /**
   * Holt den aktuellen Spielstand
   */
  getState() {
    return this.state;
  }
}

// Singleton
export const gameStateManager = new GameStateManager();
