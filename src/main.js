import './style.css';
import { Game } from './game/Game.js';

// Entry point
const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);

// Start screen button
document.getElementById('start-button').addEventListener('click', () => {
  document.getElementById('start-screen').classList.add('hidden');
  game.start();
});

// Restart button
document.getElementById('restart-button').addEventListener('click', () => {
  document.getElementById('game-over-screen').classList.add('hidden');
  game.restart();
});

// Prevent scrolling / context menu on mobile
window.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
window.addEventListener('contextmenu', (e) => e.preventDefault());
