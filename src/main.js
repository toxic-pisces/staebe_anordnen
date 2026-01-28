// main.js - Einstiegspunkt der Anwendung

import { Game } from './game/Game.js';
import './styles/main.css';

// Warte auf DOM
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Starting Anordnen...');

  // Hole Canvas Element
  const canvas = document.getElementById('game-canvas');

  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }

  // Erstelle und initialisiere Spiel
  const game = new Game(canvas);

  try {
    // Zeige Ladebildschirm
    showLoadingScreen();

    // Initialisiere
    await game.initialize();

    // Verstecke Ladebildschirm
    hideLoadingScreen();

    // Starte Spiel
    game.start();

    // Expose für Debugging
    window.game = game;

    console.log('Game started successfully!');
  } catch (error) {
    console.error('Failed to start game:', error);
    showErrorScreen(error.message);
  }
});

function showLoadingScreen() {
  // Einfacher Ladetext
  const container = document.getElementById('game-container');
  const loading = document.createElement('div');
  loading.id = 'loading-screen';
  loading.innerHTML = `
    <div style="
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      font-family: 'Remnant', sans-serif;
      font-size: 32px;
      color: #fff;
    ">
      <p>Lädt...</p>
    </div>
  `;
  container.appendChild(loading);
}

function hideLoadingScreen() {
  const loading = document.getElementById('loading-screen');
  if (loading) {
    loading.remove();
  }
}

function showErrorScreen(message) {
  hideLoadingScreen();
  const container = document.getElementById('game-container');
  const error = document.createElement('div');
  error.innerHTML = `
    <div style="
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      font-family: sans-serif;
      color: #ff6b6b;
    ">
      <h2>Fehler beim Laden</h2>
      <p>${message}</p>
      <button onclick="location.reload()" style="
        margin-top: 20px;
        padding: 10px 20px;
        font-size: 16px;
        cursor: pointer;
      ">Neu laden</button>
    </div>
  `;
  container.appendChild(error);
}
