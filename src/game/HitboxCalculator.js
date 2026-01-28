// HitboxCalculator - Berechnet Hitboxen basierend auf nicht-transparenten Pixeln

import { GAME_CONFIG } from '../data/gameConfig.js';

export class HitboxCalculator {
  constructor() {
    this.hitboxCache = new Map();
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
  }

  /**
   * Berechnet die Hitbox für ein Bild basierend auf Alpha-Werten
   * @param {HTMLImageElement} image - Das Bild
   * @param {string|number} id - ID für Cache
   * @returns {Object} Hitbox-Daten
   */
  calculateHitbox(image, id) {
    if (this.hitboxCache.has(id)) {
      return this.hitboxCache.get(id);
    }

    const { alphaThreshold, padding } = GAME_CONFIG.hitbox;

    // Canvas auf Bildgröße setzen
    this.offscreenCanvas.width = image.width;
    this.offscreenCanvas.height = image.height;

    // Bild zeichnen
    this.offscreenCtx.clearRect(0, 0, image.width, image.height);
    this.offscreenCtx.drawImage(image, 0, 0);

    // Pixel-Daten holen
    const imageData = this.offscreenCtx.getImageData(0, 0, image.width, image.height);
    const pixels = imageData.data;

    // Grenzen finden
    let minX = image.width;
    let maxX = 0;
    let minY = image.height;
    let maxY = 0;

    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        const alpha = pixels[(y * image.width + x) * 4 + 3];

        if (alpha > alphaThreshold) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }

    // Hitbox mit Padding
    const hitbox = {
      // Bounding Box relativ zum Bild
      localBounds: {
        x: Math.max(0, minX - padding),
        y: Math.max(0, minY - padding),
        width: Math.min(image.width - minX + padding * 2, image.width),
        height: Math.min(image.height - minY + padding * 2, image.height)
      },
      // Original-Bildgröße
      imageWidth: image.width,
      imageHeight: image.height,
      // Tatsächliche Grenzen ohne Padding (für Positionierung)
      contentBounds: {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      },
      // Alpha-Map für präzisere Kollision (downsampled)
      alphaMap: this.createAlphaMap(pixels, image.width, image.height, alphaThreshold)
    };

    this.hitboxCache.set(id, hitbox);
    return hitbox;
  }

  /**
   * Erstellt eine kompakte Alpha-Map (2x downsampled)
   */
  createAlphaMap(pixels, width, height, threshold) {
    const mapWidth = Math.ceil(width / 2);
    const mapHeight = Math.ceil(height / 2);
    const map = new Uint8Array(mapWidth * mapHeight);

    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        let solid = false;

        // Prüfe 2x2 Bereich
        for (let dy = 0; dy < 2 && !solid; dy++) {
          for (let dx = 0; dx < 2 && !solid; dx++) {
            const px = x * 2 + dx;
            const py = y * 2 + dy;

            if (px < width && py < height) {
              const alpha = pixels[(py * width + px) * 4 + 3];
              if (alpha > threshold) solid = true;
            }
          }
        }

        map[y * mapWidth + x] = solid ? 1 : 0;
      }
    }

    return { data: map, width: mapWidth, height: mapHeight };
  }

  /**
   * Prüft ob ein Punkt innerhalb der Hitbox liegt
   * @param {number} localX - X relativ zum Bild
   * @param {number} localY - Y relativ zum Bild
   * @param {Object} hitbox - Hitbox-Daten
   * @param {boolean} usePrecise - Verwende Alpha-Map für präzise Kollision
   * @returns {boolean}
   */
  isPointInHitbox(localX, localY, hitbox, usePrecise = true) {
    const b = hitbox.localBounds;

    // Schnelle Bounding-Box-Prüfung
    if (localX < b.x || localX > b.x + b.width ||
        localY < b.y || localY > b.y + b.height) {
      return false;
    }

    // Präzise Alpha-Map-Prüfung
    if (usePrecise && hitbox.alphaMap) {
      const map = hitbox.alphaMap;
      const mapX = Math.floor(localX / 2);
      const mapY = Math.floor(localY / 2);

      if (mapX >= 0 && mapX < map.width && mapY >= 0 && mapY < map.height) {
        return map.data[mapY * map.width + mapX] === 1;
      }
    }

    return true;
  }

  /**
   * Prüft ob ein globaler Punkt einen Stab trifft
   * @param {number} globalX - Globale X-Position
   * @param {number} globalY - Globale Y-Position
   * @param {Object} stick - Stab-Objekt mit position und scale
   * @returns {boolean}
   */
  isPointOnStick(globalX, globalY, stick) {
    const hitbox = this.hitboxCache.get(stick.id);
    if (!hitbox) return false;

    // Transformiere zu lokalen Koordinaten
    const localX = (globalX - stick.x) / stick.scale;
    const localY = (globalY - stick.y) / stick.scale;

    return this.isPointInHitbox(localX, localY, hitbox);
  }

  /**
   * Holt gecachte Hitbox
   */
  getHitbox(id) {
    return this.hitboxCache.get(id) || null;
  }

  /**
   * Löscht Cache
   */
  clearCache() {
    this.hitboxCache.clear();
  }
}

// Singleton
export const hitboxCalculator = new HitboxCalculator();
