// GameCanvas - Canvas-Management und Rendering

import { GAME_CONFIG } from '../data/gameConfig.js';

export class GameCanvas {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');

    this.width = GAME_CONFIG.canvas.width;
    this.height = GAME_CONFIG.canvas.height;

    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;

    this.setupCanvas();
    this.setupResizeHandler();
  }

  setupCanvas() {
    // Setze interne Canvas-Größe
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Berechne Skalierung für Display
    this.updateScale();

    // Deaktiviere Image Smoothing für Pixel-Art
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  setupResizeHandler() {
    window.addEventListener('resize', () => this.updateScale());
    this.updateScale();
  }

  updateScale() {
    const container = this.canvas.parentElement;
    const containerWidth = container.clientWidth - 40;
    const containerHeight = container.clientHeight - 150;

    const scaleX = containerWidth / this.width;
    const scaleY = containerHeight / this.height;
    this.scale = Math.min(scaleX, scaleY, 1);

    // CSS-Größe setzen
    this.canvas.style.width = `${this.width * this.scale}px`;
    this.canvas.style.height = `${this.height * this.scale}px`;

    // Offset für Zentrierung berechnen
    const rect = this.canvas.getBoundingClientRect();
    this.offsetX = rect.left;
    this.offsetY = rect.top;
  }

  /**
   * Konvertiert Screen-Koordinaten zu Canvas-Koordinaten
   */
  screenToCanvas(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (screenX - rect.left) / this.scale,
      y: (screenY - rect.top) / this.scale
    };
  }

  /**
   * Löscht das Canvas
   */
  clear() {
    this.ctx.fillStyle = GAME_CONFIG.canvas.backgroundColor;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  /**
   * Zeichnet ein Bild
   */
  drawImage(image, x, y, width = null, height = null) {
    if (!image) return;

    if (width && height) {
      this.ctx.drawImage(image, x, y, width, height);
    } else {
      this.ctx.drawImage(image, x, y);
    }
  }

  /**
   * Zeichnet ein Bild zentriert
   */
  drawImageCentered(image, centerX, centerY, width = null, height = null) {
    if (!image) return;

    const w = width || image.width;
    const h = height || image.height;

    this.ctx.drawImage(image, centerX - w / 2, centerY - h / 2, w, h);
  }

  /**
   * Zeichnet Text
   */
  drawText(text, x, y, options = {}) {
    const {
      font = '24px Remnant',
      color = '#ffffff',
      align = 'left',
      baseline = 'middle'
    } = options;

    this.ctx.font = font;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = baseline;
    this.ctx.fillText(text, x, y);
  }

  /**
   * Zeichnet ein Rechteck
   */
  drawRect(x, y, width, height, options = {}) {
    const {
      fill = null,
      stroke = null,
      lineWidth = 1,
      radius = 0
    } = options;

    this.ctx.beginPath();

    if (radius > 0) {
      this.ctx.roundRect(x, y, width, height, radius);
    } else {
      this.ctx.rect(x, y, width, height);
    }

    if (fill) {
      this.ctx.fillStyle = fill;
      this.ctx.fill();
    }

    if (stroke) {
      this.ctx.strokeStyle = stroke;
      this.ctx.lineWidth = lineWidth;
      this.ctx.stroke();
    }
  }

  /**
   * Zeichnet eine Linie
   */
  drawLine(x1, y1, x2, y2, options = {}) {
    const {
      color = '#ffffff',
      lineWidth = 2,
      dash = []
    } = options;

    this.ctx.beginPath();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.setLineDash(dash);
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  /**
   * Speichert den aktuellen Context-Zustand
   */
  save() {
    this.ctx.save();
  }

  /**
   * Stellt den Context-Zustand wieder her
   */
  restore() {
    this.ctx.restore();
  }

  /**
   * Setzt einen Clip-Bereich
   */
  clip(x, y, width, height) {
    this.ctx.beginPath();
    this.ctx.rect(x, y, width, height);
    this.ctx.clip();
  }

  /**
   * Setzt Transparenz
   */
  setAlpha(alpha) {
    this.ctx.globalAlpha = alpha;
  }

  /**
   * Setzt Schatten
   */
  setShadow(color, blur, offsetX = 0, offsetY = 0) {
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = blur;
    this.ctx.shadowOffsetX = offsetX;
    this.ctx.shadowOffsetY = offsetY;
  }

  /**
   * Entfernt Schatten
   */
  clearShadow() {
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
  }
}
