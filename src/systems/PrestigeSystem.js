// PrestigeSystem - Verwaltet das Portal und Prestige

import { GAME_CONFIG } from '../data/gameConfig.js';

export class PrestigeSystem {
  constructor(stateManager, shopSystem, audioManager = null) {
    this.stateManager = stateManager;
    this.shopSystem = shopSystem;
    this.audioManager = audioManager;
    this.onPrestige = null; // Callback
  }

  /**
   * Prüft ob Portal verfügbar ist
   */
  isPortalAvailable() {
    return this.shopSystem.allSticksPurchased();
  }

  /**
   * Führt Prestige durch
   */
  activatePortal() {
    if (!this.isPortalAvailable()) {
      return { success: false, reason: 'not_available' };
    }

    // Reset für Prestige
    const newState = this.stateManager.resetForPrestige();

    // Callback
    if (this.onPrestige) {
      this.onPrestige(newState.prestigeLevel, newState.xpMultiplier);
    }

    return {
      success: true,
      prestigeLevel: newState.prestigeLevel,
      xpMultiplier: newState.xpMultiplier
    };
  }

  /**
   * Gibt aktuellen Prestige-Level zurück
   */
  getPrestigeLevel() {
    return this.stateManager.getState().prestigeLevel;
  }

  /**
   * Gibt aktuellen XP-Multiplikator zurück
   */
  getXPMultiplier() {
    return this.stateManager.getState().xpMultiplier;
  }

  /**
   * Gibt den XP-Bonus für das nächste Prestige zurück
   */
  getNextPrestigeBonus() {
    const currentLevel = this.getPrestigeLevel();
    const currentMultiplier = this.getXPMultiplier();
    const prestigeBonus = GAME_CONFIG.prestige?.xpMultiplierBonus || 0.25;
    const nextMultiplier = 1 + ((currentLevel + 1) * prestigeBonus);
    return {
      current: currentMultiplier,
      next: nextMultiplier,
      bonus: prestigeBonus
    };
  }
}
