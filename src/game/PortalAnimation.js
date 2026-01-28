// PortalAnimation - Verwaltet die Portal-Animation

import { ASSETS, imageLoader } from '../utils/imageLoader.js';

export class PortalAnimation {
  constructor(canvas, audioManager) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audioManager = audioManager;
    
    // Animation State
    this.isPlaying = false;
    this.currentFrame = 0;
    this.frameDelay = 100; // ms pro Frame
    this.lastFrameTime = 0;
    
    // Animation Phases
    this.phase = 'forward'; // 'forward', 'grow', 'reverse'
    this.growScale = 1;
    this.growSpeed = 0.04;
    this.rotation = 0;
    
    // Callbacks
    this.onAnimationComplete = null;
    this.onGrowComplete = null; // Wird aufgerufen wenn Grow endet, bevor Reverse startet
    
    // Bilder werden bei start() geladen
    this.frames = [];
  }

  /**
   * Startet die Portal-Animation
   */
  start() {
    this.isPlaying = true;
    this.currentFrame = 0;
    this.phase = 'forward';
    this.growScale = 1;
    this.rotation = 0;
    this.lastFrameTime = performance.now();
    
    // Frames laden (frisch aus dem Cache holen)
    this.frames = ASSETS.images.portal.map(path => imageLoader.get(path));
    console.log(`Portal Animation: ${this.frames.length} frames loaded`);
    
    // Resize Canvas auf Viewport-Größe
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    
    // Audio starten
    if (this.audioManager) {
      this.audioManager.playLoop('portal');
    }
    
    // Animation Loop starten
    this.animate();
  }

  /**
   * Stoppt die Animation
   */
  stop() {
    this.isPlaying = false;
    
    // Audio ausfaden statt abrupt stoppen
    if (this.audioManager) {
      this.audioManager.fadeOutSound('portal', 800);
    }
  }

  /**
   * Animation Loop
   */
  animate() {
    if (!this.isPlaying) return;
    
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    
    // Phase 2: Grow Animation (Portal wächst und füllt Bildschirm)
    if (this.phase === 'grow') {
      this.growScale += this.growSpeed;
      this.rotation += 0.02;
      
      // Wenn groß genug, starte Reverse-Animation
      if (this.growScale >= 4) {
        this.phase = 'reverse';
        this.currentFrame = this.frames.length - 1;
        this.lastFrameTime = now;
        console.log(`Portal Animation: Starting reverse phase`);
        
        // Callback für Prestige (neue Welt laden)
        if (this.onGrowComplete) {
          this.onGrowComplete();
        }
      }
      
      this.render();
      requestAnimationFrame(() => this.animate());
      return;
    }
    
    // Phase 3: Reverse Animation (Frames rückwärts, transparenter Hintergrund)
    if (this.phase === 'reverse') {
      if (deltaTime >= this.frameDelay) {
        this.lastFrameTime = now;
        this.currentFrame--;
        
        // Wenn erstes Frame erreicht, Animation beenden
        if (this.currentFrame <= 0) {
          this.currentFrame = 0;
          this.stop();
          if (this.onAnimationComplete) {
            this.onAnimationComplete();
          }
          return;
        }
      }
      
      this.render();
      requestAnimationFrame(() => this.animate());
      return;
    }
    
    // Phase 1: Forward Animation (alle Frames durchspielen)
    if (deltaTime >= this.frameDelay) {
      this.lastFrameTime = now;
      this.currentFrame++;
      
      // Wenn alle Frames durch sind, starte Grow-Animation
      if (this.currentFrame >= this.frames.length) {
        this.currentFrame = this.frames.length - 1;
        this.phase = 'grow';
        console.log(`Portal Animation: Starting grow phase`);
      }
    }
    
    // Zeichnen
    this.render();
    
    // Nächster Frame
    requestAnimationFrame(() => this.animate());
  }

  /**
   * Rendert das Portal
   */
  render() {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Hintergrund je nach Phase
    if (this.phase === 'reverse') {
      // Transparenter Hintergrund - man sieht das Spiel dahinter
      ctx.clearRect(0, 0, width, height);
    } else if (this.phase === 'grow') {
      // Fade zu Schwarz während Grow
      const fadeProgress = Math.min(1, (this.growScale - 1) / 2.5);
      const r = Math.floor(74 * (1 - fadeProgress));
      const g = Math.floor(144 * (1 - fadeProgress));
      const b = Math.floor(184 * (1 - fadeProgress));
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(0, 0, width, height);
    } else {
      // Normaler blauer Hintergrund
      ctx.fillStyle = '#4A90B8';
      ctx.fillRect(0, 0, width, height);
    }
    
    // Aktuelles Frame
    const frame = this.frames[this.currentFrame];
    if (!frame) return;
    
    // Portal-Größe - Breite = Bildschirmbreite, Höhe proportional
    let displayWidth = width;
    let displayHeight = width; // Quadratisch basierend auf Breite
    
    if (this.phase === 'grow') {
      displayWidth = width * this.growScale;
      displayHeight = width * this.growScale;
    }
    
    // Zentrieren
    const x = (width - displayWidth) / 2;
    const y = (height - displayHeight) / 2;
    
    ctx.save();
    
    // Rotation nur während Grow
    if (this.phase === 'grow') {
      ctx.translate(width / 2, height / 2);
      ctx.rotate(this.rotation);
      ctx.translate(-width / 2, -height / 2);
    }
    
    // Portal zeichnen
    ctx.drawImage(frame, x, y, displayWidth, displayHeight);
    
    ctx.restore();
  }
}
