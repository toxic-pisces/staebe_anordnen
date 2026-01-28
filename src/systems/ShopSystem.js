// ShopSystem - Verwaltet den Shop und Käufe

import { STICK_BASE_PRICES, PURCHASABLE_STICKS, DEFAULT_STICKS, GAME_CONFIG } from '../data/gameConfig.js';
import { SELLERS } from '../data/sellerData.js';

export class ShopSystem {
  constructor(stateManager, audioManager = null) {
    this.stateManager = stateManager;
    this.audioManager = audioManager;
    this.onPurchase = null; // Callback
  }

  /**
   * Gibt alle Shop-Items zurück
   */
  getShopItems() {
    const state = this.stateManager.getState();

    return PURCHASABLE_STICKS.map(stickId => {
      const seller = SELLERS[stickId];
      const price = STICK_BASE_PRICES[stickId];
      const owned = state.ownedSticks.includes(stickId);
      const canAfford = state.diamonds >= price;

      return {
        stickId,
        seller,
        price,
        owned,
        canAfford
      };
    });
  }

  /**
   * Kauft einen Stab
   */
  purchaseStick(stickId) {
    const state = this.stateManager.getState();
    const price = STICK_BASE_PRICES[stickId];

    // Prüfe ob bereits besessen
    if (state.ownedSticks.includes(stickId)) {
      return { success: false, reason: 'already_owned' };
    }

    // Prüfe ob genug Diamanten
    if (state.diamonds < price) {
      return { success: false, reason: 'not_enough_diamonds' };
    }

    // Kaufe
    const newOwnedSticks = [...state.ownedSticks, stickId].sort((a, b) => a - b);

    this.stateManager.update({
      diamonds: state.diamonds - price,
      ownedSticks: newOwnedSticks
    });

    // Sound abspielen
    if (this.audioManager) {
      this.audioManager.play('purchase');
    }

    // Callback
    if (this.onPurchase) {
      this.onPurchase(stickId);
    }

    return { success: true };
  }

  /**
   * Prüft ob alle Stäbe gekauft wurden
   */
  allSticksPurchased() {
    const state = this.stateManager.getState();
    return PURCHASABLE_STICKS.every(id => state.ownedSticks.includes(id));
  }

  /**
   * Gibt den nächsten nicht gekauften Stab zurück
   */
  getNextPurchasableStick() {
    const state = this.stateManager.getState();
    return PURCHASABLE_STICKS.find(id => !state.ownedSticks.includes(id));
  }
}
