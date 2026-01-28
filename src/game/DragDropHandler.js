// DragDropHandler - Verwaltet Drag & Drop mit smooth Animationen

import { gsap } from 'gsap';
import { GAME_CONFIG } from '../data/gameConfig.js';

export class DragDropHandler {
  constructor(gameCanvas, stickManager, audioManager = null) {
    this.canvas = gameCanvas;
    this.stickManager = stickManager;
    this.audioManager = audioManager;

    this.draggedStick = null;
    this.dragOffset = { x: 0, y: 0 };
    this.insertionIndex = -1;
    this.lastInsertionIndex = -1;

    this.isDragging = false;
    this.dragStartPos = { x: 0, y: 0 };
    this.DRAG_THRESHOLD = 5;

    this.onSortComplete = null; // Callback

    this.setupEventListeners();
  }

  setupEventListeners() {
    const canvas = this.canvas.canvas;

    // Pointer Events für Maus und Touch
    canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    canvas.addEventListener('pointermove', this.onPointerMove.bind(this));
    canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
    canvas.addEventListener('pointercancel', this.onPointerUp.bind(this));
    canvas.addEventListener('pointerleave', this.onPointerUp.bind(this));

    // Verhindere Standard-Touch-Verhalten
    canvas.style.touchAction = 'none';
  }

  onPointerDown(event) {
    const point = this.canvas.screenToCanvas(event.clientX, event.clientY);

    // Finde Stab unter Cursor
    const stick = this.stickManager.findStickAtPosition(point.x, point.y);

    if (stick) {
      this.draggedStick = stick;
      this.dragStartPos = { x: point.x, y: point.y };

      // Berechne Offset vom Klickpunkt zur Stab-Position
      this.dragOffset = {
        x: point.x - stick.x,
        y: point.y - stick.y
      };

      // Sound abspielen
      if (this.audioManager) {
        this.audioManager.play('collectStab');
      }
    }
  }

  onPointerMove(event) {
    if (!this.draggedStick) return;

    const point = this.canvas.screenToCanvas(event.clientX, event.clientY);

    // Prüfe Drag-Threshold
    if (!this.isDragging) {
      const dx = point.x - this.dragStartPos.x;
      const dy = point.y - this.dragStartPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > this.DRAG_THRESHOLD) {
        this.isDragging = true;
        this.draggedStick.isDragging = true;
      } else {
        return;
      }
    }

    // Aktualisiere Stab-Position
    this.draggedStick.x = point.x - this.dragOffset.x;
    this.draggedStick.y = point.y - this.dragOffset.y;

    // Berechne Einfüge-Index basierend auf Stab-Mitte
    const hitbox = this.draggedStick.hitbox;
    const stickCenterX = this.draggedStick.x +
      (hitbox.contentBounds.x + hitbox.contentBounds.width / 2) * this.draggedStick.scale;

    this.insertionIndex = this.stickManager.getInsertionIndex(stickCenterX, this.draggedStick.id);

    // Animiere andere Stäbe wenn sich Index ändert
    if (this.insertionIndex !== this.lastInsertionIndex) {
      this.lastInsertionIndex = this.insertionIndex;
      this.animateSticksToMakeRoom();
    }
  }

  onPointerUp(event) {
    if (!this.draggedStick) return;

    const stick = this.draggedStick;
    const wasDragging = this.isDragging;
    const finalInsertionIndex = this.insertionIndex >= 0 ? this.insertionIndex :
      this.stickManager.currentArrangement.indexOf(stick.id);

    // Reset state FIRST
    stick.isDragging = false;
    this.draggedStick = null;
    this.isDragging = false;
    this.insertionIndex = -1;
    this.lastInsertionIndex = -1;

    if (wasDragging) {
      // Füge Stab an Position ein (oder behalte alte Position)
      this.stickManager.insertStickAt(stick.id, finalInsertionIndex);

      // Animiere alle Stäbe zu ihren finalen Positionen
      const duration = GAME_CONFIG.animations.stickSlideDuration;

      for (const id of this.stickManager.currentArrangement) {
        const s = this.stickManager.getStick(id);
        if (!s) continue;

        gsap.killTweensOf(s); // Stoppe laufende Animationen
        gsap.to(s, {
          x: s.targetX,
          y: s.targetY,
          duration: duration,
          ease: 'power2.out'
        });
      }

      // Sound abspielen
      if (this.audioManager) {
        this.audioManager.play('dropStab');
      }

      // Prüfe ob sortiert (mit kleiner Verzögerung für Animation)
      setTimeout(() => {
        if (this.stickManager.isSorted()) {
          if (this.onSortComplete) {
            this.onSortComplete();
          }
        }
      }, duration * 1000);
    } else {
      // Kein echter Drag - setze Position zurück
      this.stickManager.updatePositions();
    }
  }

  animateSticksToMakeRoom() {
    if (!this.draggedStick) return;

    // Berechne Positionen mit Lücke
    this.stickManager.updatePositionsWithGap(this.insertionIndex, this.draggedStick.id);

    // Animiere alle nicht-gezogenen Stäbe zu ihren Zielpositionen
    const duration = GAME_CONFIG.animations.stickSlideDuration;

    for (const id of this.stickManager.currentArrangement) {
      if (id === this.draggedStick.id) continue;

      const stick = this.stickManager.getStick(id);
      if (!stick) continue;

      gsap.to(stick, {
        x: stick.targetX,
        y: stick.targetY,
        duration: duration,
        ease: 'power2.out'
      });
    }
  }

  /**
   * Rendert die Einfügeanzeige (deaktiviert - Benutzer wollte keinen Indikator)
   */
  renderInsertionIndicator(ctx) {
    // Keine visuelle Anzeige mehr - die Lücke zwischen den Stäben reicht als Feedback
  }

  /**
   * Gibt den aktuell gezogenen Stab zurück
   */
  getDraggedStick() {
    return this.draggedStick;
  }

  /**
   * Prüft ob gerade gezogen wird
   */
  isDraggingStick() {
    return this.isDragging;
  }
}
