// Image Loader - Lädt und cached alle Bilder

class ImageLoader {
  constructor() {
    this.cache = new Map();
    this.loading = new Map();
  }

  /**
   * Lädt ein einzelnes Bild
   * @param {string} path - Pfad zum Bild
   * @returns {Promise<HTMLImageElement>}
   */
  async load(path) {
    // Prüfe Cache
    if (this.cache.has(path)) {
      return this.cache.get(path);
    }

    // Prüfe ob bereits geladen wird
    if (this.loading.has(path)) {
      return this.loading.get(path);
    }

    // Lade Bild
    const loadPromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(path, img);
        this.loading.delete(path);
        resolve(img);
      };
      img.onerror = () => {
        this.loading.delete(path);
        reject(new Error(`Failed to load image: ${path}`));
      };
      img.src = path;
    });

    this.loading.set(path, loadPromise);
    return loadPromise;
  }

  /**
   * Lädt mehrere Bilder parallel
   * @param {string[]} paths - Array von Bildpfaden
   * @returns {Promise<Map<string, HTMLImageElement>>}
   */
  async loadAll(paths) {
    const results = await Promise.all(
      paths.map(async (path) => {
        const img = await this.load(path);
        return [path, img];
      })
    );
    return new Map(results);
  }

  /**
   * Holt ein Bild aus dem Cache
   * @param {string} path - Pfad zum Bild
   * @returns {HTMLImageElement|null}
   */
  get(path) {
    return this.cache.get(path) || null;
  }

  /**
   * Prüft ob ein Bild im Cache ist
   * @param {string} path - Pfad zum Bild
   * @returns {boolean}
   */
  has(path) {
    return this.cache.has(path);
  }
}

// Singleton-Instanz
export const imageLoader = new ImageLoader();

// Asset-Pfade
export const ASSETS = {
  images: {
    diamond: '/assets/images/dia.png',
    levelBarEmpty: '/assets/images/levelbar-empty.png',
    levelBarFull: '/assets/images/levelbar-full.png',
    shopTemplate: '/assets/images/shop-template.png',

    // Level-Bar Frames (1 = leer, 10 = voll)
    levelBarFrames: Array.from({ length: 10 }, (_, i) =>
      `/assets/images/levelbar-${i + 1}.png`
    ),

    sticks: Object.fromEntries(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(i => [
        i,
        `/assets/images/sticks/stab-${i}.png`
      ])
    ),

    portal: Array.from({ length: 16 }, (_, i) =>
      `/assets/images/portal/portal-${i + 1}.png`
    ),

    sellers: {
      kevin1: '/assets/images/sellers/kevin1.png',
      kevin2: '/assets/images/sellers/kevin2.jpg',
      muetzi1: '/assets/images/sellers/muetzi1.png',
      muetzi2: '/assets/images/sellers/muetzi2.jpg',
      beppo1: '/assets/images/sellers/beppo1.png',
      beppo2: '/assets/images/sellers/beppo2.png',
      berft1: '/assets/images/sellers/berft1.png',
      berft2: '/assets/images/sellers/berft2.png',
      doppelzopfine1: '/assets/images/sellers/doppelzopfine1.jpg',
      doppelzopfine2: '/assets/images/sellers/doppelzopfine2.jpg',
      schlorpf1: '/assets/images/sellers/schlorpf1.png',
      schlorpf2: '/assets/images/sellers/schlorpf2.png',
      handbert1: '/assets/images/sellers/handbert1.png',
      handbert2: '/assets/images/sellers/handbert2.png'
    }
  },

  audio: {
    background: '/assets/audio/hintergrund1.mp3',
    portal: '/assets/audio/portal.mp3',
    collectDiamond: '/assets/audio/collect-diamond.mp3',
    levelUp: '/assets/audio/level-up.mp3',
    purchase: '/assets/audio/purchase.mp3',
    collectStab: '/assets/audio/collect-stab.wav',
    dropStab: '/assets/audio/drop-stab.wav'
  }
};

/**
 * Lädt alle benötigten Assets für das Spiel
 * @param {number[]} ownedStickIds - IDs der besessenen Stäbe
 * @returns {Promise<void>}
 */
export async function preloadGameAssets(ownedStickIds = [1]) {
  const imagesToLoad = [
    ASSETS.images.diamond,
    ASSETS.images.levelBarEmpty,
    ASSETS.images.levelBarFull,
    ASSETS.images.shopTemplate,
    // Level-Bar Frames
    ...ASSETS.images.levelBarFrames,
    // Lade nur besessene Stäbe + alle kaufbaren
    ...Object.values(ASSETS.images.sticks),
    // Portal-Frames
    ...ASSETS.images.portal,
    // Verkäufer-Bilder
    ...Object.values(ASSETS.images.sellers)
  ];

  console.log(`Loading ${imagesToLoad.length} images...`);
  await imageLoader.loadAll(imagesToLoad);
  console.log('All images loaded!');
}
