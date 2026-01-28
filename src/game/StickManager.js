// StickManager - Verwaltet die Stäbe und ihre Anordnung

import { GAME_CONFIG } from '../data/gameConfig.js';
import { imageLoader, ASSETS } from '../utils/imageLoader.js';
import { hitboxCalculator } from './HitboxCalculator.js';

export class StickManager {
  constructor() {
    this.ownedSticks = [1]; // Start mit Stab 1
    this.currentArrangement = []; // Aktuelle Reihenfolge (Stab-IDs)
    this.sticks = new Map(); // Stab-Daten (id -> stick object)

    this.canvasWidth = GAME_CONFIG.canvas.width;
    this.canvasHeight = GAME_CONFIG.canvas.height;
    
    // Fester Scale-Faktor (wird nur bei Anzahl-Änderung neu berechnet)
    this.currentScale = GAME_CONFIG.sticks.scaleFactor;
    this.lastStickCount = 0;
  }

  /**
   * Initialisiert die Stäbe basierend auf besessenen Stäben
   */
  async initialize(ownedStickIds) {
    this.ownedSticks = [...ownedStickIds].sort((a, b) => a - b);
    this.sticks.clear();

    // Lade und berechne Hitboxen für alle Stäbe
    for (const id of this.ownedSticks) {
      const imagePath = ASSETS.images.sticks[id];
      const image = imageLoader.get(imagePath);

      if (!image) {
        console.error(`Image not found for stick ${id}`);
        continue;
      }

      // Berechne Hitbox
      const hitbox = hitboxCalculator.calculateHitbox(image, id);

      // Erstelle Stab-Objekt
      this.sticks.set(id, {
        id,
        image,
        hitbox,
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
        scale: GAME_CONFIG.sticks.scaleFactor,
        isDragging: false
      });
    }

    // Berechne Scale-Faktor basierend auf Anzahl
    this.calculateScale();
    
    // Shuffle und positioniere
    this.shuffle();
  }

  /**
   * Berechnet den Scale-Faktor basierend auf der Stab-Anzahl
   * Wird nur aufgerufen wenn sich die Anzahl ändert
   */
  calculateScale() {
    const config = GAME_CONFIG.sticks;
    const count = this.ownedSticks.length;
    
    // Nur neu berechnen wenn sich Anzahl geändert hat
    if (count === this.lastStickCount) return;
    this.lastStickCount = count;
    
    // Berechne Gesamtbreite mit Basis-Scale
    let totalWidth = 0;
    for (const id of this.ownedSticks) {
      const stick = this.sticks.get(id);
      if (!stick) continue;
      totalWidth += stick.hitbox.contentBounds.width * config.scaleFactor;
    }
    totalWidth += (count - 1) * config.spacing;
    
    // Dynamische Skalierung wenn zu breit
    const maxWidth = this.canvasWidth - 100;
    if (totalWidth > maxWidth && count > 1) {
      const scaleFactor = maxWidth / totalWidth;
      this.currentScale = config.scaleFactor * scaleFactor;
    } else {
      this.currentScale = config.scaleFactor;
    }
    
    // Aktualisiere Scale für alle Stäbe
    for (const [id, stick] of this.sticks) {
      stick.scale = this.currentScale;
    }
    
    console.log(`Scale berechnet: ${this.currentScale.toFixed(3)} für ${count} Stäbe`);
  }

  /**
   * Mischt die Stäbe (garantiert nicht sortiert)
   */
  shuffle() {
    // Erstelle neue zufällige Anordnung
    this.currentArrangement = [...this.ownedSticks];

    // Fisher-Yates Shuffle
    for (let i = this.currentArrangement.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.currentArrangement[i], this.currentArrangement[j]] =
        [this.currentArrangement[j], this.currentArrangement[i]];
    }

    // Stelle sicher, dass nicht bereits sortiert
    if (this.isSorted() && this.currentArrangement.length > 1) {
      // Tausche die ersten beiden
      [this.currentArrangement[0], this.currentArrangement[1]] =
        [this.currentArrangement[1], this.currentArrangement[0]];
    }

    // Aktualisiere Positionen
    this.updatePositions();
  }

  /**
   * Berechnet und setzt die Positionen aller Stäbe
   * Verwendet den bereits berechneten festen Scale-Faktor
   */
  updatePositions(excludeDragging = true) {
    const config = GAME_CONFIG.sticks;
    const count = this.currentArrangement.length;

    // Berechne Gesamtbreite aller Stäbe mit festem Scale
    let totalWidth = 0;
    const stickWidths = [];

    for (const id of this.currentArrangement) {
      const stick = this.sticks.get(id);
      if (!stick) continue;

      const hitbox = stick.hitbox;
      const scaledWidth = hitbox.contentBounds.width * this.currentScale;
      stickWidths.push(scaledWidth);
      totalWidth += scaledWidth;
    }

    // Füge Abstände hinzu
    totalWidth += (count - 1) * config.spacing;

    // Startposition (zentriert)
    let currentX = (this.canvasWidth - totalWidth) / 2;
    const baseY = config.baseY;

    // Setze Positionen
    for (let i = 0; i < this.currentArrangement.length; i++) {
      const id = this.currentArrangement[i];
      const stick = this.sticks.get(id);
      if (!stick) continue;

      // Überspringe dragging sticks
      if (excludeDragging && stick.isDragging) {
        currentX += stickWidths[i] + config.spacing;
        continue;
      }

      const hitbox = stick.hitbox;

      // Berechne X-Position (berücksichtige Content-Offset)
      const contentOffsetX = hitbox.contentBounds.x * stick.scale;
      stick.targetX = currentX - contentOffsetX;
      stick.targetY = baseY;

      // Setze direkt wenn nicht animiert
      if (!stick.isDragging) {
        stick.x = stick.targetX;
        stick.y = stick.targetY;
      }

      currentX += stickWidths[i] + config.spacing;
    }
  }

  /**
   * Berechnet Positionen mit Lücke für Einfügung
   * Verwendet den festen Scale-Faktor
   */
  updatePositionsWithGap(insertionIndex, excludeStickId) {
    const config = GAME_CONFIG.sticks;
    const gap = GAME_CONFIG.animations.insertionGap;

    // Filtere dragging stick aus
    const arrangement = this.currentArrangement.filter(id => id !== excludeStickId);
    const count = arrangement.length;

    // Berechne Gesamtbreite mit festem Scale
    let totalWidth = 0;
    const stickWidths = [];

    for (const id of arrangement) {
      const stick = this.sticks.get(id);
      if (!stick) continue;

      const hitbox = stick.hitbox;
      const scaledWidth = hitbox.contentBounds.width * this.currentScale;
      stickWidths.push(scaledWidth);
      totalWidth += scaledWidth;
    }

    // Füge Abstände + Lücke hinzu
    totalWidth += (count - 1) * config.spacing + gap;

    // Startposition
    let currentX = (this.canvasWidth - totalWidth) / 2;
    const baseY = config.baseY;

    // Setze Positionen mit Lücke
    for (let i = 0; i < arrangement.length; i++) {
      // Füge Lücke ein
      if (i === insertionIndex) {
        currentX += gap;
      }

      const id = arrangement[i];
      const stick = this.sticks.get(id);
      if (!stick) continue;

      const hitbox = stick.hitbox;
      const contentOffsetX = hitbox.contentBounds.x * stick.scale;

      stick.targetX = currentX - contentOffsetX;
      stick.targetY = baseY;

      currentX += stickWidths[i] + config.spacing;
    }

    // Lücke am Ende
    if (insertionIndex >= arrangement.length) {
      // Keine Aktion nötig, Lücke ist am Ende
    }
  }

  /**
   * Verschiebt einen Stab an eine neue Position
   */
  moveStick(stickId, newIndex) {
    const currentIndex = this.currentArrangement.indexOf(stickId);
    if (currentIndex === -1 || currentIndex === newIndex) return;

    // Entferne von aktueller Position
    this.currentArrangement.splice(currentIndex, 1);

    // Füge an neuer Position ein
    const insertAt = newIndex > currentIndex ? newIndex - 1 : newIndex;
    this.currentArrangement.splice(insertAt, 0, stickId);

    // Aktualisiere Positionen
    this.updatePositions();
  }

  /**
   * Fügt einen Stab an einer bestimmten Position ein
   */
  insertStickAt(stickId, index) {
    // Entferne zuerst
    const currentIndex = this.currentArrangement.indexOf(stickId);
    if (currentIndex !== -1) {
      this.currentArrangement.splice(currentIndex, 1);
    }

    // Füge ein
    const clampedIndex = Math.max(0, Math.min(index, this.currentArrangement.length));
    this.currentArrangement.splice(clampedIndex, 0, stickId);

    // Aktualisiere Positionen
    this.updatePositions();
  }

  /**
   * Prüft ob die Stäbe sortiert sind (aufsteigend nach ID)
   */
  isSorted() {
    for (let i = 1; i < this.currentArrangement.length; i++) {
      if (this.currentArrangement[i] < this.currentArrangement[i - 1]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Findet den Stab an einer Position
   */
  findStickAtPosition(x, y) {
    // Prüfe in umgekehrter Reihenfolge (oberste zuerst)
    for (let i = this.currentArrangement.length - 1; i >= 0; i--) {
      const id = this.currentArrangement[i];
      const stick = this.sticks.get(id);
      if (!stick) continue;

      if (hitboxCalculator.isPointOnStick(x, y, stick)) {
        return stick;
      }
    }
    return null;
  }

  /**
   * Berechnet den Einfüge-Index basierend auf X-Position
   */
  getInsertionIndex(x, excludeStickId) {
    const arrangement = this.currentArrangement.filter(id => id !== excludeStickId);

    for (let i = 0; i < arrangement.length; i++) {
      const stick = this.sticks.get(arrangement[i]);
      if (!stick) continue;

      const hitbox = stick.hitbox;
      const centerX = stick.targetX + (hitbox.contentBounds.x + hitbox.contentBounds.width / 2) * stick.scale;

      if (x < centerX) {
        return i;
      }
    }

    return arrangement.length;
  }

  /**
   * Holt einen Stab
   */
  getStick(id) {
    return this.sticks.get(id);
  }

  /**
   * Holt alle Stäbe in aktueller Anordnung
   */
  getSticksInOrder() {
    return this.currentArrangement.map(id => this.sticks.get(id)).filter(Boolean);
  }

  /**
   * Fügt einen neuen Stab hinzu
   */
  async addStick(id) {
    if (this.ownedSticks.includes(id)) return;

    this.ownedSticks.push(id);
    this.ownedSticks.sort((a, b) => a - b);

    // Lade Bild und Hitbox
    const imagePath = ASSETS.images.sticks[id];
    const image = imageLoader.get(imagePath);

    if (image) {
      const hitbox = hitboxCalculator.calculateHitbox(image, id);

      this.sticks.set(id, {
        id,
        image,
        hitbox,
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
        scale: this.currentScale,
        isDragging: false
      });
      
      // Neu berechnen da sich die Anzahl geändert hat
      this.calculateScale();
    }
  }

  /**
   * Setzt auf Standard-Stäbe zurück
   */
  reset() {
    const defaultSticks = [2, 3, 5, 7, 10, 11, 13];
    this.ownedSticks = [...defaultSticks];
    this.currentArrangement = [...defaultSticks];

    // Entferne alle Verkäufer-Stäbe (1, 4, 6, 8, 9, 12, 14)
    const purchasableSticks = [1, 4, 6, 8, 9, 12, 14];
    for (const id of purchasableSticks) {
      this.sticks.delete(id);
    }

    // Scale neu berechnen (Anzahl hat sich geändert)
    this.lastStickCount = 0;
    this.calculateScale();
    this.updatePositions();
  }

  /**
   * Rendert alle Stäbe
   */
  render(ctx, draggedStickId = null) {
    // Zeichne nicht-gezogene Stäbe zuerst
    for (const id of this.currentArrangement) {
      if (id === draggedStickId) continue;

      const stick = this.sticks.get(id);
      if (!stick || !stick.image) continue;

      const scaledWidth = stick.image.width * stick.scale;
      const scaledHeight = stick.image.height * stick.scale;

      ctx.drawImage(stick.image, stick.x, stick.y, scaledWidth, scaledHeight);
    }

    // Zeichne gezogenen Stab obendrauf
    if (draggedStickId !== null) {
      const stick = this.sticks.get(draggedStickId);
      if (stick && stick.image) {
        const scaledWidth = stick.image.width * stick.scale;
        const scaledHeight = stick.image.height * stick.scale;

        // Leichter Schatten für gezogenen Stab
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;
        ctx.drawImage(stick.image, stick.x, stick.y, scaledWidth, scaledHeight);
        ctx.restore();
      }
    }
  }
}
