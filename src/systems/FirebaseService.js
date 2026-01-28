// FirebaseService - Verwaltet Firebase Auth und Firestore für Leaderboard

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit,
  updateDoc 
} from 'firebase/firestore';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

// Firebase Konfiguration
const firebaseConfig = {
  apiKey: "AIzaSyDPtxtoMtQgaTcSCFCmkIv1w9gcZRZLVSI",
  authDomain: "staebe-e8481.firebaseapp.com",
  projectId: "staebe-e8481",
  storageBucket: "staebe-e8481.firebasestorage.app",
  messagingSenderId: "135614621617",
  appId: "1:135614621617:web:08fd44744328bb00723f90",
  measurementId: "G-7FRLJMJ9V6"
};

class FirebaseService {
  constructor() {
    this.app = null;
    this.db = null;
    this.auth = null;
    this.currentUser = null;
    this.onAuthChange = null;
  }

  /**
   * Initialisiert Firebase
   */
  initialize() {
    try {
      this.app = initializeApp(firebaseConfig);
      this.db = getFirestore(this.app);
      this.auth = getAuth(this.app);

      // Auth State Listener
      onAuthStateChanged(this.auth, (user) => {
        this.currentUser = user;
        if (this.onAuthChange) {
          this.onAuthChange(user);
        }
      });

      console.log('Firebase initialized!');
      return true;
    } catch (error) {
      console.error('Firebase initialization failed:', error);
      return false;
    }
  }

  /**
   * Registriert einen neuen Benutzer
   * @param {string} username - Benutzername
   * @param {string} password - Passwort
   * @returns {Promise<{success: boolean, error?: string, userId?: string}>}
   */
  async register(username, password) {
    try {
      // Email-Format: username@staebe.game (für Firebase Auth)
      const email = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@staebe.game`;
      
      // User erstellen
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const userId = userCredential.user.uid;

      // Profil in Firestore anlegen
      await setDoc(doc(this.db, 'players', userId), {
        username: username,
        totalXP: 0,
        level: 1,
        diamonds: 0,
        prestigeLevel: 0,
        ownedSticksCount: 7, // Standard-Stäbe
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });

      console.log('User registered:', username);
      return { success: true, userId };
    } catch (error) {
      console.error('Registration failed:', error);
      let errorMessage = 'Registrierung fehlgeschlagen';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Dieser Benutzername ist bereits vergeben';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Passwort muss mindestens 6 Zeichen haben';
      }
      
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Meldet einen Benutzer an
   * @param {string} username - Benutzername
   * @param {string} password - Passwort
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async login(username, password) {
    try {
      const email = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@staebe.game`;
      await signInWithEmailAndPassword(this.auth, email, password);
      console.log('User logged in:', username);
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      let errorMessage = 'Anmeldung fehlgeschlagen';
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Falscher Benutzername oder Passwort';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Falscher Benutzername oder Passwort';
      }
      
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Meldet den aktuellen Benutzer ab
   */
  async logout() {
    try {
      await signOut(this.auth);
      console.log('User logged out');
      return { success: true };
    } catch (error) {
      console.error('Logout failed:', error);
      return { success: false, error: 'Abmeldung fehlgeschlagen' };
    }
  }

  /**
   * Aktualisiert die Spielerdaten in Firebase (vollständiger Spielstand)
   * @param {Object} gameState - Aktueller Spielstand
   */
  async updatePlayerData(gameState) {
    if (!this.currentUser) return { success: false, error: 'Nicht angemeldet' };

    try {
      const playerRef = doc(this.db, 'players', this.currentUser.uid);
      await updateDoc(playerRef, {
        // Leaderboard-relevante Daten
        totalXP: gameState.totalXP,
        level: gameState.level,
        diamonds: gameState.diamonds,
        prestigeLevel: gameState.prestigeLevel,
        ownedSticksCount: gameState.ownedSticks.length,
        // Vollständiger Spielstand
        gameState: {
          currentXP: gameState.currentXP,
          totalXP: gameState.totalXP,
          level: gameState.level,
          diamonds: gameState.diamonds,
          ownedSticks: gameState.ownedSticks,
          prestigeLevel: gameState.prestigeLevel,
          xpMultiplier: gameState.xpMultiplier,
          totalSorts: gameState.totalSorts,
          totalDiamondsEarned: gameState.totalDiamondsEarned,
          musicVolume: gameState.musicVolume,
          sfxVolume: gameState.sfxVolume
        },
        lastUpdated: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      console.error('Failed to update player data:', error);
      return { success: false, error: 'Speichern fehlgeschlagen' };
    }
  }

  /**
   * Lädt den Spielstand aus Firebase
   * @returns {Promise<Object|null>}
   */
  async loadGameState() {
    if (!this.currentUser) return null;

    try {
      const playerRef = doc(this.db, 'players', this.currentUser.uid);
      const playerSnap = await getDoc(playerRef);
      
      if (playerSnap.exists()) {
        const data = playerSnap.data();
        if (data.gameState) {
          return {
            ...data.gameState,
            playerName: data.username
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to load game state:', error);
      return null;
    }
  }

  /**
   * Holt das Leaderboard (Top 50 Spieler)
   * @returns {Promise<Array>}
   */
  async getLeaderboard() {
    try {
      const playersRef = collection(this.db, 'players');
      const q = query(playersRef, orderBy('totalXP', 'desc'), limit(50));
      const querySnapshot = await getDocs(q);

      const leaderboard = [];
      querySnapshot.forEach((doc) => {
        leaderboard.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return leaderboard;
    } catch (error) {
      console.error('Failed to get leaderboard:', error);
      return [];
    }
  }

  /**
   * Holt das Profil des aktuellen Benutzers
   * @returns {Promise<Object|null>}
   */
  async getCurrentPlayerProfile() {
    if (!this.currentUser) return null;

    try {
      const playerRef = doc(this.db, 'players', this.currentUser.uid);
      const playerSnap = await getDoc(playerRef);
      
      if (playerSnap.exists()) {
        return { id: playerSnap.id, ...playerSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Failed to get player profile:', error);
      return null;
    }
  }

  /**
   * Prüft ob ein Benutzer eingeloggt ist
   */
  isLoggedIn() {
    return this.currentUser !== null;
  }

  /**
   * Gibt die User ID zurück
   */
  getUserId() {
    return this.currentUser?.uid || null;
  }
}

// Singleton Export
export const firebaseService = new FirebaseService();
