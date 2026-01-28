// Verkäufer-Daten

export const SELLERS = {
  1: {
    name: 'Kevin',
    stickId: 1,
    pfpBefore: 'kevin1',
    pfpAfter: 'kevin2'
  },
  4: {
    name: 'Mützi',
    stickId: 4,
    pfpBefore: 'muetzi1',
    pfpAfter: 'muetzi2'
  },
  6: {
    name: 'Schlorpfian',
    stickId: 6,
    pfpBefore: 'schlorpf1',
    pfpAfter: 'schlorpf2'
  },
  8: {
    name: 'Beppo',
    stickId: 8,
    pfpBefore: 'beppo1',
    pfpAfter: 'beppo2'
  },
  9: {
    name: 'Doppelzopfine',
    stickId: 9,
    pfpBefore: 'doppelzopfine1',
    pfpAfter: 'doppelzopfine2'
  },
  12: {
    name: 'Berft',
    stickId: 12,
    pfpBefore: 'berft1',
    pfpAfter: 'berft2'
  },
  14: {
    name: 'Handbert',
    stickId: 14,
    pfpBefore: 'handbert1',
    pfpAfter: 'handbert2'
  }
};

// Hilfsfunktion: Verkäufer für Stab-ID finden
export function getSellerForStick(stickId) {
  return SELLERS[stickId] || null;
}

// Hilfsfunktion: Alle Verkäufer als Array
export function getAllSellers() {
  return Object.values(SELLERS);
}
