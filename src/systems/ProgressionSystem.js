// ProgressionSystem - Verwaltet XP, Level und Diamanten

import { GAME_CONFIG, PURCHASABLE_STICKS } from '../data/gameConfig.js';

export class ProgressionSystem {
  constructor(stateManager, audioManager = null) {
    this.stateManager = stateManager;
    this.audioManager = audioManager;
    this.onLevelUp = null; // Callback
  }

  /**
   * Berechnet den XP-Bonus für einen bestimmten Stab
   */
  getStickXPBonus(stickId) {
    return GAME_CONFIG.stickXPBonus[stickId] || 0;
  }

  /**
   * Berechnet den Diamant-Bonus für einen bestimmten Stab
   */
  getStickDiamondBonus(stickId) {
    return GAME_CONFIG.stickDiamondBonus[stickId] || 0;
  }

  /**
   * Berechnet den gesamten XP-Bonus aller besessenen Stäbe
   */
  getTotalXPBonus(ownedSticks) {
    let bonus = 0;
    for (const stickId of ownedSticks) {
      bonus += this.getStickXPBonus(stickId);
    }
    return bonus;
  }

  /**
   * Berechnet den gesamten Diamant-Bonus aller besessenen Stäbe
   */
  getTotalDiamondBonus(ownedSticks) {
    let bonus = 0;
    for (const stickId of ownedSticks) {
      bonus += this.getStickDiamondBonus(stickId);
    }
    return bonus;
  }

  /**
   * Berechnet die erwarteten Belohnungen für eine Sortierung (ohne sie auszuführen)
   */
  calculateRewards(stickCount) {
    const state = this.stateManager.getState();
    
    // XP Berechnung
    const baseXP = GAME_CONFIG.baseXPPerSort * stickCount;
    const xpBonus = this.getTotalXPBonus(state.ownedSticks);
    const xpMultiplier = state.xpMultiplier || 1;
    const xpEarned = Math.floor((baseXP + xpBonus) * xpMultiplier);
    
    // Diamanten Berechnung
    const baseDiamonds = GAME_CONFIG.baseDiamondsPerSort;
    const diamondBonus = this.getTotalDiamondBonus(state.ownedSticks);
    const diamondMultiplier = state.diamondMultiplier || 1;
    const diamondsEarned = Math.floor((baseDiamonds + diamondBonus) * diamondMultiplier);
    
    return {
      xp: xpEarned,
      diamonds: diamondsEarned,
      xpMultiplier,
      diamondMultiplier,
      baseXP,
      xpBonus,
      baseDiamonds,
      diamondBonus
    };
  }

  /**
   * Wird aufgerufen wenn eine Sortierung abgeschlossen ist
   * @param {number} stickCount - Anzahl der sortierten Stäbe
   * @returns {Object} - Belohnungsinfos
   */
  onSortComplete(stickCount) {
    const state = this.stateManager.getState();
    const rewards = this.calculateRewards(stickCount);

    // Berechne neues Level
    let newXP = state.currentXP + rewards.xp;
    let newLevel = state.level;
    let leveledUp = false;

    // Level-Up Prüfung - XP-Überschuss wird ins nächste Level übernommen
    let xpNeededForCurrentLevel = GAME_CONFIG.xpPerLevel(newLevel);
    while (newXP >= xpNeededForCurrentLevel) {
      newXP -= xpNeededForCurrentLevel;
      newLevel++;
      leveledUp = true;
      xpNeededForCurrentLevel = GAME_CONFIG.xpPerLevel(newLevel);
    }

    // Aktualisiere State
    this.stateManager.update({
      currentXP: newXP,
      totalXP: state.totalXP + rewards.xp,
      diamonds: state.diamonds + rewards.diamonds,
      level: newLevel,
      totalSorts: state.totalSorts + 1,
      totalDiamondsEarned: state.totalDiamondsEarned + rewards.diamonds
    });

    // Level-Up Event
    if (leveledUp) {
      if (this.audioManager) {
        this.audioManager.play('levelUp');
      }
      if (this.onLevelUp) {
        this.onLevelUp(newLevel);
      }
    }

    // Diamond Sound
    if (this.audioManager) {
      this.audioManager.play('collectDiamond');
    }

    return {
      xpEarned: rewards.xp,
      diamondsEarned: rewards.diamonds,
      leveledUp,
      newLevel,
      newXP
    };
  }

  /**
   * Gibt XP-Fortschritt für aktuelles Level zurück (0-1)
   */
  getXPProgress() {
    const state = this.stateManager.getState();
    const xpNeeded = GAME_CONFIG.xpPerLevel(state.level);
    return state.currentXP / xpNeeded;
  }

  /**
   * Gibt XP bis zum nächsten Level zurück
   */
  getXPToNextLevel() {
    const state = this.stateManager.getState();
    const xpNeeded = GAME_CONFIG.xpPerLevel(state.level);
    return xpNeeded - state.currentXP;
  }
}
