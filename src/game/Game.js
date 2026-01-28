// Game.js - Haupt-Game-Controller

import { GameCanvas } from './GameCanvas.js';
import { StickManager } from './StickManager.js';
import { DragDropHandler } from './DragDropHandler.js';
import { AudioManager } from '../systems/AudioManager.js';
import { ProgressionSystem } from '../systems/ProgressionSystem.js';
import { ShopSystem } from '../systems/ShopSystem.js';
import { PrestigeSystem } from '../systems/PrestigeSystem.js';
import { PortalAnimation } from './PortalAnimation.js';
import { gameStateManager } from '../storage/LocalStorage.js';
import { imageLoader, preloadGameAssets, ASSETS } from '../utils/imageLoader.js';
import { GAME_CONFIG } from '../data/gameConfig.js';

// Firebase wird dynamisch geladen
let firebaseService = null;

export class Game {
  constructor(canvasElement) {
    this.canvasElement = canvasElement;
    this.gameCanvas = null;
    this.stickManager = null;
    this.dragDropHandler = null;
    this.audioManager = null;
    this.progressionSystem = null;
    this.shopSystem = null;
    this.prestigeSystem = null;
    this.portalAnimation = null;

    this.isRunning = false;
    this.lastTime = 0;

    // UI Elemente
    this.diamondCountEl = document.getElementById('diamond-count');
    this.diamondIconEl = document.getElementById('diamond-icon');
    this.levelNumberEl = document.getElementById('level-number');
    this.levelBarEl = document.getElementById('level-bar');
    this.xpCurrentEl = document.getElementById('xp-current');
    this.xpNeededEl = document.getElementById('xp-needed');
    this.successMessageEl = document.getElementById('success-message');
    this.rewardTextEl = document.getElementById('reward-text');
    this.portalBtn = document.getElementById('portal-btn');
    this.portalBtnContainer = document.getElementById('portal-button-container');

    // Level-Bar Animation State
    this.levelBarAnimating = false;
    this.currentDisplayedFrame = 1;
  }

  async initialize() {
    console.log('Initializing game...');

    // Lade Spielstand
    gameStateManager.load();
    const state = gameStateManager.getState();

    // Lade Assets
    await preloadGameAssets(state.ownedSticks);

    // Initialisiere Canvas
    this.gameCanvas = new GameCanvas(this.canvasElement);

    // Initialisiere Audio
    this.audioManager = new AudioManager();
    await this.audioManager.initialize();
    this.audioManager.setMusicVolume(state.musicVolume / 100);
    this.audioManager.setSfxVolume(state.sfxVolume / 100);

    // Initialisiere Systeme
    this.progressionSystem = new ProgressionSystem(gameStateManager, this.audioManager);
    this.shopSystem = new ShopSystem(gameStateManager, this.audioManager);
    this.prestigeSystem = new PrestigeSystem(gameStateManager, this.shopSystem, this.audioManager);

    // Initialisiere Portal Animation
    const portalCanvas = document.getElementById('portal-canvas');
    this.portalAnimation = new PortalAnimation(portalCanvas, this.audioManager);
    this.portalAnimation.onAnimationComplete = () => this.onPortalAnimationComplete();
    this.portalAnimation.onGrowComplete = () => this.onPortalGrowComplete();

    // Initialisiere StickManager
    this.stickManager = new StickManager();
    await this.stickManager.initialize(state.ownedSticks);

    // Initialisiere DragDropHandler
    this.dragDropHandler = new DragDropHandler(
      this.gameCanvas,
      this.stickManager,
      this.audioManager
    );

    // Callbacks setzen
    this.dragDropHandler.onSortComplete = () => this.onSortComplete();
    this.shopSystem.onPurchase = (stickId) => this.onStickPurchased(stickId);
    this.prestigeSystem.onPrestige = () => this.onPrestige();

    // UI initialisieren
    this.initializeUI();
    this.updateUI();

    // Event Listeners für UI
    this.setupUIEventListeners();

    // Initialisiere Firebase NACH allem anderen (optional - Spiel funktioniert auch ohne)
    try {
      const module = await import('../systems/FirebaseService.js');
      firebaseService = module.firebaseService;
      firebaseService.initialize();
      firebaseService.onAuthChange = (user) => this.onAuthStateChanged(user);
      console.log('Firebase ready');
    } catch (error) {
      console.warn('Firebase konnte nicht initialisiert werden:', error);
      firebaseService = null;
    }

    console.log('Game initialized!');
  }

  initializeUI() {
    const state = gameStateManager.getState();

    // Setze Bilder
    this.diamondIconEl.src = ASSETS.images.diamond;
    
    // Level-Bar: Berechne initiales Frame basierend auf XP-Fortschritt
    const progress = this.progressionSystem.getXPProgress();
    this.currentDisplayedFrame = this.getFrameForProgress(progress);
    this.levelBarEl.src = ASSETS.images.levelBarFrames[this.currentDisplayedFrame - 1];

    // Volume Sliders
    const musicVolume = document.getElementById('music-volume');
    const sfxVolume = document.getElementById('sfx-volume');
    if (musicVolume) musicVolume.value = state.musicVolume;
    if (sfxVolume) sfxVolume.value = state.sfxVolume;
  }

  /**
   * Berechnet das Frame (1-10) basierend auf dem XP-Fortschritt (0-1)
   * Frame 1 = 0% (leer), Frame 10 = 100% (voll)
   */
  getFrameForProgress(progress) {
    // 9 Kästchen = 9 Stufen zwischen Frame 1 und 10
    // progress 0 = Frame 1, progress 1 = Frame 10
    const frame = Math.floor(progress * 9) + 1;
    return Math.min(Math.max(frame, 1), 10);
  }

  setupUIEventListeners() {
    // Shop Button
    document.getElementById('shop-btn').addEventListener('click', () => {
      this.showShop();
    });

    // Shop Close
    document.getElementById('shop-close-btn').addEventListener('click', () => {
      this.hideShop();
    });

    // Leaderboard Button
    document.getElementById('leaderboard-btn').addEventListener('click', () => {
      this.showLeaderboard();
    });

    // Leaderboard Close
    document.getElementById('leaderboard-close-btn').addEventListener('click', () => {
      this.hideLeaderboard();
    });

    // Auth Tabs
    document.getElementById('login-tab').addEventListener('click', () => {
      this.switchAuthTab('login');
    });
    document.getElementById('register-tab').addEventListener('click', () => {
      this.switchAuthTab('register');
    });

    // Login (Leaderboard)
    document.getElementById('login-submit-btn').addEventListener('click', () => {
      this.handleLogin();
    });

    // Register (Leaderboard)
    document.getElementById('register-submit-btn').addEventListener('click', () => {
      this.handleRegister();
    });

    // Logout (Leaderboard)
    document.getElementById('logout-btn').addEventListener('click', () => {
      this.handleLogout();
    });

    // Sync Button (Leaderboard)
    document.getElementById('sync-btn').addEventListener('click', () => {
      this.syncPlayerData();
    });

    // Settings Auth Tabs
    document.getElementById('settings-login-tab').addEventListener('click', () => {
      this.switchSettingsAuthTab('login');
    });
    document.getElementById('settings-register-tab').addEventListener('click', () => {
      this.switchSettingsAuthTab('register');
    });

    // Settings Login
    document.getElementById('settings-login-btn').addEventListener('click', () => {
      this.handleSettingsLogin();
    });

    // Settings Register
    document.getElementById('settings-register-btn').addEventListener('click', () => {
      this.handleSettingsRegister();
    });

    // Settings Logout
    document.getElementById('settings-logout-btn').addEventListener('click', () => {
      this.handleLogout();
    });

    // Settings Sync
    document.getElementById('settings-sync-btn').addEventListener('click', () => {
      this.syncPlayerData();
    });

    // Settings Button
    document.getElementById('settings-btn').addEventListener('click', () => {
      this.showSettings();
    });

    // Settings Close
    document.getElementById('settings-close-btn').addEventListener('click', () => {
      this.hideSettings();
    });

    // Settings Save
    document.getElementById('settings-save-btn').addEventListener('click', () => {
      this.saveSettings();
    });

    // Credits Button (in Settings)
    document.getElementById('credits-btn').addEventListener('click', () => {
      this.showCredits();
    });

    // Credits Close
    document.getElementById('credits-close-btn').addEventListener('click', () => {
      this.hideCredits();
    });

    // Portal Button
    this.portalBtn.addEventListener('click', () => {
      this.showPortalConfirm();
    });

    // Portal Confirmation Buttons
    document.getElementById('portal-confirm-yes-btn').addEventListener('click', () => {
      this.hidePortalConfirm();
      this.showPortal();
    });

    document.getElementById('portal-confirm-no-btn').addEventListener('click', () => {
      this.hidePortalConfirm();
    });

    // Click auf Overlay schließt es (außer Portal - das spielt automatisch ab)
    document.querySelectorAll('.overlay').forEach(overlay => {
      if (overlay.id === 'portal-overlay') return; // Portal spielt automatisch ab
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.add('hidden');
        }
      });
    });
  }

  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastTime = performance.now();

    // Versuche Musik sofort zu starten (klappt evtl. nicht wegen Browser-Policy)
    this.audioManager.playMusic();

    // Falls Browser blockiert, starte beim ersten Klick
    const startMusic = () => {
      if (!this.audioManager.music.playing()) {
        this.audioManager.playMusic();
      }
      document.removeEventListener('click', startMusic);
      document.removeEventListener('keydown', startMusic);
      document.removeEventListener('pointerdown', startMusic);
    };
    document.addEventListener('click', startMusic);
    document.addEventListener('keydown', startMusic);
    document.addEventListener('pointerdown', startMusic);

    this.gameLoop(this.lastTime);
  }

  gameLoop(timestamp) {
    if (!this.isRunning) return;

    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  update(deltaTime) {
    // Aktualisierungen hier
  }

  render() {
    const ctx = this.gameCanvas.ctx;

    // Clear
    this.gameCanvas.clear();

    // Rendere Stäbe
    const draggedStick = this.dragDropHandler.getDraggedStick();
    this.stickManager.render(ctx, draggedStick?.id);

    // Rendere Einfügeanzeige
    this.dragDropHandler.renderInsertionIndicator(ctx);
  }

  updateUI() {
    const state = gameStateManager.getState();

    // Diamanten
    this.diamondCountEl.textContent = state.diamonds;

    // Level
    this.levelNumberEl.textContent = `Lvl ${state.level}`;

    // Level Bar (ohne Animation - direktes Update)
    const progress = this.progressionSystem.getXPProgress();
    const targetFrame = this.getFrameForProgress(progress);
    if (!this.levelBarAnimating) {
      this.currentDisplayedFrame = targetFrame;
      this.levelBarEl.src = ASSETS.images.levelBarFrames[this.currentDisplayedFrame - 1];
    }

    // XP Tooltip aktualisieren
    const xpNeeded = GAME_CONFIG.xpPerLevel(state.level);
    if (this.xpCurrentEl) this.xpCurrentEl.textContent = state.currentXP;
    if (this.xpNeededEl) this.xpNeededEl.textContent = xpNeeded;

    // Portal Button
    if (this.prestigeSystem.isPortalAvailable()) {
      this.portalBtnContainer.classList.remove('hidden');
    } else {
      this.portalBtnContainer.classList.add('hidden');
    }
  }

  /**
   * Animiert die Level-Bar Frame für Frame
   * @param {number} startFrame - Start-Frame (1-10)
   * @param {number} endFrame - Ziel-Frame (1-10)
   * @param {boolean} leveledUp - Ob ein Level-Up stattfand
   * @param {number} newLevel - Das neue Level (falls Level-Up)
   */
  animateLevelBar(startFrame, endFrame, leveledUp = false, newLevel = 1) {
    if (this.levelBarAnimating) return;
    
    this.levelBarAnimating = true;
    const frameDelay = 100; // 100ms pro Frame
    
    // Wenn Level-Up: Erst bis 10 füllen, dann zurück zu 1, dann zum Ziel
    if (leveledUp) {
      // Phase 1: Bis 10 füllen
      this.animateFrames(startFrame, 10, frameDelay, () => {
        // Update Level-Anzeige
        this.levelNumberEl.textContent = `Lvl ${newLevel}`;
        
        // Phase 2: Zurück auf 1 (Level-Up Reset)
        setTimeout(() => {
          this.currentDisplayedFrame = 1;
          this.levelBarEl.src = ASSETS.images.levelBarFrames[0];
          
          // Phase 3: Zum Ziel-Frame animieren
          setTimeout(() => {
            this.animateFrames(1, endFrame, frameDelay, () => {
              this.levelBarAnimating = false;
            });
          }, 200);
        }, 300);
      });
    } else {
      // Normale Animation ohne Level-Up
      this.animateFrames(startFrame, endFrame, frameDelay, () => {
        this.levelBarAnimating = false;
      });
    }
  }

  /**
   * Animiert von einem Frame zum anderen
   */
  animateFrames(from, to, delay, onComplete) {
    if (from === to) {
      if (onComplete) onComplete();
      return;
    }

    const direction = from < to ? 1 : -1;
    let current = from;

    const animate = () => {
      current += direction;
      this.currentDisplayedFrame = current;
      this.levelBarEl.src = ASSETS.images.levelBarFrames[current - 1];

      if (current !== to) {
        setTimeout(animate, delay);
      } else {
        if (onComplete) onComplete();
      }
    };

    setTimeout(animate, delay);
  }

  onSortComplete() {
    const stickCount = this.stickManager.ownedSticks.length;
    
    // Merke den aktuellen Frame VOR dem XP-Gewinn
    const oldProgress = this.progressionSystem.getXPProgress();
    const startFrame = this.getFrameForProgress(oldProgress);
    
    // XP und Diamanten hinzufügen
    const reward = this.progressionSystem.onSortComplete(stickCount);

    // Zeige Erfolgsmeldung
    this.showSuccessMessage(reward);

    // Diamanten sofort aktualisieren
    const state = gameStateManager.getState();
    this.diamondCountEl.textContent = state.diamonds;

    // Portal Button aktualisieren
    if (this.prestigeSystem.isPortalAvailable()) {
      this.portalBtnContainer.classList.remove('hidden');
    } else {
      this.portalBtnContainer.classList.add('hidden');
    }

    // Nach dem Success-Screen: Level-Bar Animation starten
    setTimeout(() => {
      // Berechne das Ziel-Frame basierend auf neuem XP-Fortschritt
      const newProgress = this.progressionSystem.getXPProgress();
      const endFrame = this.getFrameForProgress(newProgress);
      
      // XP Tooltip aktualisieren
      const xpNeeded = GAME_CONFIG.xpPerLevel(state.level);
      if (this.xpCurrentEl) this.xpCurrentEl.textContent = state.currentXP;
      if (this.xpNeededEl) this.xpNeededEl.textContent = xpNeeded;

      // Animiere Level-Bar
      this.animateLevelBar(startFrame, endFrame, reward.leveledUp, reward.newLevel);

      // Shuffle Stäbe
      this.stickManager.shuffle();
    }, GAME_CONFIG.animations.successMessageDuration);
  }

  showSuccessMessage(reward) {
    this.rewardTextEl.textContent = `+${reward.xpEarned} XP | +${reward.diamondsEarned} 💎`;
    this.successMessageEl.classList.remove('hidden');

    setTimeout(() => {
      this.successMessageEl.classList.add('hidden');
    }, GAME_CONFIG.animations.successMessageDuration);
  }

  async onStickPurchased(stickId) {
    // Füge Stab zum Manager hinzu
    await this.stickManager.addStick(stickId);

    // Re-initialisiere mit neuen Stäben
    const state = gameStateManager.getState();
    await this.stickManager.initialize(state.ownedSticks);

    // Aktualisiere UI
    this.updateUI();
    this.updateShopUI();
  }

  onPrestige() {
    // Zurücksetzen
    this.stickManager.reset();

    // Re-initialisiere
    const state = gameStateManager.getState();
    this.stickManager.initialize(state.ownedSticks);

    // Aktualisiere UI
    this.updateUI();
    // NICHT hidePortal() aufrufen - das macht die Portal-Animation selbst
  }

  showShop() {
    document.getElementById('shop-overlay').classList.remove('hidden');
    this.updateShopUI();
  }

  hideShop() {
    document.getElementById('shop-overlay').classList.add('hidden');
  }

  updateShopUI() {
    const shopItems = document.getElementById('shop-items');
    const items = this.shopSystem.getShopItems();
    const state = gameStateManager.getState();
    const xpMultiplier = state.xpMultiplier || 1;

    shopItems.innerHTML = '';

    items.forEach(item => {
      const div = document.createElement('div');
      div.className = `shop-item ${item.owned ? 'owned' : ''} ${!item.canAfford && !item.owned ? 'cant-afford' : ''}`;

      const pfpImage = item.owned ? item.seller.pfpAfter : item.seller.pfpBefore;
      const pfpPath = ASSETS.images.sellers[pfpImage];

      // Hole den spezifischen Bonus für diesen Stab und berechne mit XP-Multiplikator
      const baseXpBonus = GAME_CONFIG.stickXPBonus[item.stickId] || 0;
      const xpBonus = Math.floor(baseXpBonus * xpMultiplier);
      const diamondBonus = GAME_CONFIG.stickDiamondBonus[item.stickId] || 0;

      div.innerHTML = `
        <div class="shop-item-content">
          <img class="shop-item-pfp" src="${pfpPath}" alt="${item.seller.name}">
          <div class="shop-item-info">
            <span class="shop-item-name">${item.seller.name}</span>
            <span class="shop-item-bonus">+${xpBonus} EP | +${diamondBonus} <img src="${ASSETS.images.diamond}" alt="Diamant" class="inline-diamond"> pro Runde</span>
          </div>
          <div class="shop-item-action">
            ${item.owned
              ? `<span class="shop-item-owned-badge">GEKAUFT</span>`
              : `<div class="shop-item-price">
                   <img src="${ASSETS.images.diamond}" alt="Diamant">
                   <span>${item.price}</span>
                 </div>`
            }
          </div>
        </div>
      `;

      if (!item.owned && item.canAfford) {
        div.addEventListener('click', () => {
          this.shopSystem.purchaseStick(item.stickId);
          this.updateShopUI();
          this.updateUI();
        });
      }

      shopItems.appendChild(div);
    });
  }

  showLeaderboard() {
    document.getElementById('leaderboard-overlay').classList.remove('hidden');
    this.updateAuthUI();
    this.loadLeaderboard();
  }

  hideLeaderboard() {
    document.getElementById('leaderboard-overlay').classList.add('hidden');
  }

  switchAuthTab(tab) {
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (tab === 'login') {
      loginTab.classList.add('active');
      registerTab.classList.remove('active');
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
    } else {
      loginTab.classList.remove('active');
      registerTab.classList.add('active');
      loginForm.classList.add('hidden');
      registerForm.classList.remove('hidden');
    }
  }

  async handleLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    if (!username || !password) {
      errorEl.textContent = 'Bitte alle Felder ausfüllen';
      errorEl.classList.remove('hidden');
      return;
    }

    const result = await firebaseService.login(username, password);
    
    if (result.success) {
      errorEl.classList.add('hidden');
      this.updateAuthUI();
      this.loadLeaderboard();
    } else {
      errorEl.textContent = result.error;
      errorEl.classList.remove('hidden');
    }
  }

  async handleRegister() {
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    const errorEl = document.getElementById('register-error');

    if (!username || !password) {
      errorEl.textContent = 'Bitte alle Felder ausfüllen';
      errorEl.classList.remove('hidden');
      return;
    }

    if (password.length < 6) {
      errorEl.textContent = 'Passwort muss mindestens 6 Zeichen haben';
      errorEl.classList.remove('hidden');
      return;
    }

    const result = await firebaseService.register(username, password);
    
    if (result.success) {
      errorEl.classList.add('hidden');
      // Automatisch Daten synchronisieren nach Registrierung
      await this.syncPlayerData();
      this.updateAuthUI();
      this.loadLeaderboard();
    } else {
      errorEl.textContent = result.error;
      errorEl.classList.remove('hidden');
    }
  }

  async handleLogout() {
    if (!firebaseService) return;
    await firebaseService.logout();
    this.updateAuthUI();
    this.updateSettingsAuthUI();
  }

  async syncPlayerData() {
    if (!firebaseService || !firebaseService.isLoggedIn()) return;
    
    // Update Sync-Status
    const syncStatus = document.getElementById('settings-sync-status');
    if (syncStatus) {
      syncStatus.textContent = '⏳ Synchronisiere...';
      syncStatus.className = 'settings-sync-status syncing';
    }

    const state = gameStateManager.getState();
    const result = await firebaseService.updatePlayerData(state);
    
    if (result.success) {
      console.log('Daten synchronisiert!');
      if (syncStatus) {
        syncStatus.textContent = '✓ Synchronisiert';
        syncStatus.className = 'settings-sync-status';
      }
      this.loadLeaderboard();
    } else {
      console.error('Sync fehlgeschlagen:', result.error);
      if (syncStatus) {
        syncStatus.textContent = '✗ Fehler';
        syncStatus.className = 'settings-sync-status error';
      }
    }
  }

  async onAuthStateChanged(user) {
    this.updateAuthUI();
    this.updateSettingsAuthUI();
    
    if (user && firebaseService) {
      // Spielstand aus Firebase laden
      const cloudState = await firebaseService.loadGameState();
      
      if (cloudState) {
        const localState = gameStateManager.getState();
        
        // Vergleiche: Cloud hat mehr XP = Cloud-Stand laden
        if (cloudState.totalXP > localState.totalXP) {
          console.log('Cloud-Spielstand geladen (mehr XP)');
          gameStateManager.update(cloudState);
          
          // Spiel neu initialisieren mit Cloud-Stand
          await this.reloadGameState();
        } else if (localState.totalXP > cloudState.totalXP) {
          // Lokaler Stand ist weiter = hochladen
          console.log('Lokaler Spielstand ist weiter, synchronisiere...');
          await this.syncPlayerData();
        }
      } else {
        // Kein Cloud-Stand vorhanden, lokalen hochladen
        await this.syncPlayerData();
      }
      
      this.loadLeaderboard();
    }
  }

  async reloadGameState() {
    const state = gameStateManager.getState();
    
    // StickManager neu initialisieren
    await this.stickManager.initialize(state.ownedSticks);
    
    // UI aktualisieren
    this.updateUI();
    
    // Audio-Settings anwenden
    this.audioManager.setMusicVolume(state.musicVolume / 100);
    this.audioManager.setSfxVolume(state.sfxVolume / 100);
  }

  // Settings Auth Tab wechseln
  switchSettingsAuthTab(tab) {
    const loginTab = document.getElementById('settings-login-tab');
    const registerTab = document.getElementById('settings-register-tab');
    const loginForm = document.getElementById('settings-login-form');
    const registerForm = document.getElementById('settings-register-form');

    if (tab === 'login') {
      loginTab.classList.add('active');
      registerTab.classList.remove('active');
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
    } else {
      loginTab.classList.remove('active');
      registerTab.classList.add('active');
      loginForm.classList.add('hidden');
      registerForm.classList.remove('hidden');
    }
  }

  async handleSettingsLogin() {
    if (!firebaseService) return;
    
    const username = document.getElementById('settings-login-username').value.trim();
    const password = document.getElementById('settings-login-password').value;
    const errorEl = document.getElementById('settings-login-error');

    if (!username || !password) {
      errorEl.textContent = 'Bitte alle Felder ausfüllen';
      errorEl.classList.remove('hidden');
      return;
    }

    const result = await firebaseService.login(username, password);
    
    if (result.success) {
      errorEl.classList.add('hidden');
      // Auth State Change Handler kümmert sich um den Rest
    } else {
      errorEl.textContent = result.error;
      errorEl.classList.remove('hidden');
    }
  }

  async handleSettingsRegister() {
    if (!firebaseService) return;
    
    const username = document.getElementById('settings-register-username').value.trim();
    const password = document.getElementById('settings-register-password').value;
    const errorEl = document.getElementById('settings-register-error');

    if (!username || !password) {
      errorEl.textContent = 'Bitte alle Felder ausfüllen';
      errorEl.classList.remove('hidden');
      return;
    }

    if (password.length < 6) {
      errorEl.textContent = 'Passwort muss mindestens 6 Zeichen haben';
      errorEl.classList.remove('hidden');
      return;
    }

    const result = await firebaseService.register(username, password);
    
    if (result.success) {
      errorEl.classList.add('hidden');
      // Automatisch Daten synchronisieren nach Registrierung
      await this.syncPlayerData();
    } else {
      errorEl.textContent = result.error;
      errorEl.classList.remove('hidden');
    }
  }

  updateSettingsAuthUI() {
    const authSection = document.getElementById('settings-auth');
    const loggedInSection = document.getElementById('settings-logged-in');
    const usernameEl = document.getElementById('settings-username');

    if (firebaseService && firebaseService.isLoggedIn()) {
      authSection.classList.add('hidden');
      loggedInSection.classList.remove('hidden');
      
      // Username aus Firestore holen
      firebaseService.getCurrentPlayerProfile().then(profile => {
        if (profile && usernameEl) {
          usernameEl.textContent = profile.username;
        }
      });
    } else {
      authSection.classList.remove('hidden');
      loggedInSection.classList.add('hidden');
    }
  }

  updateAuthUI() {
    const authSection = document.getElementById('auth-section');
    const loggedInSection = document.getElementById('logged-in-section');
    const currentUsername = document.getElementById('current-username');

    if (firebaseService && firebaseService.isLoggedIn()) {
      authSection.classList.add('hidden');
      loggedInSection.classList.remove('hidden');
      
      // Username aus Firestore holen
      firebaseService.getCurrentPlayerProfile().then(profile => {
        if (profile) {
          currentUsername.textContent = profile.username;
        }
      });
    } else {
      authSection.classList.remove('hidden');
      loggedInSection.classList.add('hidden');
    }
  }

  async loadLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    
    if (!firebaseService) {
      list.innerHTML = '<p style="text-align: center; opacity: 0.7;">Firebase nicht verfügbar</p>';
      return;
    }
    
    list.innerHTML = '<p style="text-align: center; opacity: 0.7;">Lade...</p>';

    const leaderboard = await firebaseService.getLeaderboard();
    const currentUserId = firebaseService.getUserId();

    if (leaderboard.length === 0) {
      list.innerHTML = '<p style="text-align: center; opacity: 0.7;">Noch keine Spieler im Leaderboard</p>';
      return;
    }

    list.innerHTML = '';
    leaderboard.forEach((player, index) => {
      const isCurrentPlayer = player.id === currentUserId;
      const div = document.createElement('div');
      div.className = `leaderboard-entry ${isCurrentPlayer ? 'current-player' : ''}`;
      
      div.innerHTML = `
        <span class="leaderboard-rank">${index + 1}</span>
        <span class="leaderboard-name">${player.username}</span>
        <span class="leaderboard-stats">
          <span class="leaderboard-level">Lvl ${player.level}</span>
          <span class="leaderboard-xp">${player.totalXP} XP</span>
        </span>
      `;
      
      list.appendChild(div);
    });
  }

  showSettings() {
    document.getElementById('settings-overlay').classList.remove('hidden');
    this.updateSettingsAuthUI();
    this.updateSettingsInfoUI();
  }
  
  /**
   * Aktualisiert die Spielinfo-Sektion in den Einstellungen
   */
  updateSettingsInfoUI() {
    const state = gameStateManager.getState();
    const stickCount = this.stickManager ? this.stickManager.ownedSticks.length : 7;
    const rewards = this.progressionSystem.calculateRewards(stickCount);
    
    // Belohnungen
    const rewardXpEl = document.getElementById('info-reward-xp');
    const rewardDiamondsEl = document.getElementById('info-reward-diamonds');
    if (rewardXpEl) rewardXpEl.textContent = `+${rewards.xp} XP`;
    if (rewardDiamondsEl) rewardDiamondsEl.textContent = `+${rewards.diamonds}`;
    
    // Prestige und Multiplikatoren
    const prestigeLevel = state.prestigeLevel || 0;
    const prestigeLevelEl = document.getElementById('info-prestige-level');
    const xpMultEl = document.getElementById('info-xp-mult');
    const totalSortsEl = document.getElementById('info-total-sorts');
    
    if (prestigeLevelEl) prestigeLevelEl.textContent = prestigeLevel;
    if (xpMultEl) xpMultEl.textContent = `×${(state.xpMultiplier || 1).toFixed(2)} EP`;
    if (totalSortsEl) totalSortsEl.textContent = state.totalSorts || 0;
    
    // Zeige/verstecke Multiplikator-Zeile basierend auf Prestige
    const multiplierRow = document.getElementById('info-multiplier-row');
    const prestigeRow = document.getElementById('info-prestige-row');
    if (multiplierRow) {
      multiplierRow.style.display = prestigeLevel > 0 ? 'flex' : 'none';
    }
  }

  hideSettings() {
    document.getElementById('settings-overlay').classList.add('hidden');
  }

  showCredits() {
    this.hideSettings();
    document.getElementById('credits-overlay').classList.remove('hidden');
  }

  hideCredits() {
    document.getElementById('credits-overlay').classList.add('hidden');
  }

  saveSettings() {
    const musicVolume = parseInt(document.getElementById('music-volume').value);
    const sfxVolume = parseInt(document.getElementById('sfx-volume').value);

    gameStateManager.update({
      musicVolume,
      sfxVolume
    });

    this.audioManager.setMusicVolume(musicVolume / 100);
    this.audioManager.setSfxVolume(sfxVolume / 100);

    // Auto-sync wenn eingeloggt
    if (firebaseService && firebaseService.isLoggedIn()) {
      this.syncPlayerData();
    }

    this.hideSettings();
  }

  showPortalConfirm() {
    if (!this.prestigeSystem.isPortalAvailable()) return;
    document.getElementById('portal-confirm-overlay').classList.remove('hidden');
  }

  hidePortalConfirm() {
    document.getElementById('portal-confirm-overlay').classList.add('hidden');
  }

  showPortal() {
    if (!this.prestigeSystem.isPortalAvailable()) return;

    const overlay = document.getElementById('portal-overlay');
    overlay.classList.remove('hidden');
    overlay.classList.add('active');

    // Musik pausieren
    this.audioManager.pauseMusic();

    // Portal Animation starten - nach Animation wird automatisch confirmPortal aufgerufen
    this.portalAnimation.start();
  }

  hidePortal() {
    const overlay = document.getElementById('portal-overlay');
    overlay.classList.add('hidden');
    overlay.classList.remove('active');
  }

  confirmPortal() {
    // Portal Sound stoppen
    this.audioManager.stopSound('portal');
    
    this.hidePortal();
    this.prestigeSystem.activatePortal();
    
    // 2 Sekunden Pause, dann Willkommensnachricht zeigen
    setTimeout(() => {
      this.showPrestigeWelcome();
    }, 2000);
  }

  /**
   * Wird aufgerufen wenn die Grow-Phase endet (Portal hat Bildschirm gefüllt)
   * Hier wird das Prestige aktiviert, damit man die neue Welt im Hintergrund sieht
   */
  onPortalGrowComplete() {
    // Prestige jetzt aktivieren (neue Welt laden)
    this.prestigeSystem.activatePortal();
  }

  /**
   * Wird aufgerufen wenn die gesamte Portal-Animation fertig ist (nach Reverse)
   */
  onPortalAnimationComplete() {
    this.hidePortal();
    // Willkommensnachricht sofort zeigen
    this.showPrestigeWelcome();
  }

  showPrestigeWelcome() {
    const welcomeEl = document.getElementById('prestige-welcome');
    welcomeEl.classList.remove('hidden');
    
    // Close Button Handler für beide Buttons
    const buttons = welcomeEl.querySelectorAll('.prestige-welcome-btn');
    const closeHandler = () => {
      welcomeEl.classList.add('hidden');
      // Musik erst jetzt starten
      this.audioManager.restartMusic();
      // Event Listener entfernen
      buttons.forEach(btn => btn.removeEventListener('click', closeHandler));
    };
    buttons.forEach(btn => btn.addEventListener('click', closeHandler));
  }

  stop() {
    this.isRunning = false;
    this.audioManager.stopMusic();
  }
}
