// AudioManager - Verwaltet Musik und Sound-Effekte mit Howler.js

import { Howl, Howler } from 'howler';
import { ASSETS } from '../utils/imageLoader.js';

export class AudioManager {
  constructor() {
    this.sounds = {};
    this.music = null;
    this.musicVolume = 0.5;
    this.sfxVolume = 0.5;
    this.initialized = false;
  }

  /**
   * Initialisiert alle Audio-Dateien
   */
  async initialize() {
    if (this.initialized) return;

    // Hintergrundmusik mit normalem Loop
    this.music = new Howl({
      src: [ASSETS.audio.background],
      loop: true,
      volume: this.musicVolume,
      html5: true
    });

    // Sound-Effekte
    this.sounds = {
      collectStab: new Howl({
        src: [ASSETS.audio.collectStab],
        volume: this.sfxVolume
      }),
      dropStab: new Howl({
        src: [ASSETS.audio.dropStab],
        volume: this.sfxVolume
      }),
      collectDiamond: new Howl({
        src: [ASSETS.audio.collectDiamond],
        volume: this.sfxVolume
      }),
      levelUp: new Howl({
        src: [ASSETS.audio.levelUp],
        volume: this.sfxVolume
      }),
      purchase: new Howl({
        src: [ASSETS.audio.purchase],
        volume: this.sfxVolume
      }),
      portal: new Howl({
        src: [ASSETS.audio.portal],
        volume: this.sfxVolume,
        loop: true // Portal-Sound loopt
      })
    };

    this.initialized = true;
  }

  /**
   * Spielt einen Sound-Effekt ab
   */
  play(soundName) {
    if (!this.initialized) return;

    const sound = this.sounds[soundName];
    if (sound) {
      sound.play();
    }
  }

  /**
   * Spielt einen Sound als Loop ab
   */
  playLoop(soundName) {
    if (!this.initialized) return;

    const sound = this.sounds[soundName];
    if (sound && !sound.playing()) {
      sound.play();
    }
  }

  /**
   * Stoppt einen bestimmten Sound
   */
  stopSound(soundName) {
    if (!this.initialized) return;

    const sound = this.sounds[soundName];
    if (sound) {
      sound.stop();
    }
  }

  /**
   * Faded einen Sound aus und stoppt ihn dann
   */
  fadeOutSound(soundName, duration = 1000) {
    if (!this.initialized) return;

    const sound = this.sounds[soundName];
    if (sound && sound.playing()) {
      sound.fade(this.sfxVolume, 0, duration);
      setTimeout(() => {
        sound.stop();
        sound.volume(this.sfxVolume); // Reset volume für nächstes Mal
      }, duration);
    }
  }

  /**
   * Startet die Hintergrundmusik
   */
  playMusic() {
    if (!this.initialized || !this.music) return;

    if (!this.music.playing()) {
      this.music.play();
    }
  }

  /**
   * Stoppt die Hintergrundmusik
   */
  stopMusic() {
    if (this.music) {
      this.music.stop();
    }
  }

  /**
   * Pausiert die Hintergrundmusik
   */
  pauseMusic() {
    if (this.music) {
      this.music.pause();
    }
  }

  /**
   * Startet die Musik von Anfang an
   */
  restartMusic() {
    if (!this.initialized || !this.music) return;
    
    this.music.stop();
    this.music.seek(0);
    this.music.play();
  }

  /**
   * Setzt die Musiklautstärke
   */
  setMusicVolume(volume) {
    this.musicVolume = volume;
    if (this.music) {
      this.music.volume(volume);
    }
  }

  /**
   * Setzt die Effektlautstärke
   */
  setSfxVolume(volume) {
    this.sfxVolume = volume;
    for (const sound of Object.values(this.sounds)) {
      sound.volume(volume);
    }
  }

  /**
   * Mutet alles
   */
  mute() {
    Howler.mute(true);
  }

  /**
   * Entmutet alles
   */
  unmute() {
    Howler.mute(false);
  }

  /**
   * Prüft ob gemutet
   */
  isMuted() {
    return Howler._muted;
  }
}
