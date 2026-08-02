import './style.css';
import { TITLE_POSTER_SRC } from './titlePoster.js';
import { Game } from './game/Game.js';

// Set the title banner from the embedded poster
const banner = document.getElementById('title-banner');
if (banner) {
  banner.src = TITLE_POSTER_SRC;
}

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);

document.getElementById('start-button').addEventListener('click', () => {
  document.getElementById('start-screen').classList.add('hidden');
  game.start();
});

document.getElementById('restart-button').addEventListener('click', () => {
  document.getElementById('game-over-screen').classList.add('hidden');
  game.restart();
});

document.getElementById('pause-button').addEventListener('click', () => {
  game.togglePause();
});

document.getElementById('resume-button').addEventListener('click', () => {
  game.togglePause();
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyP' || e.key === 'p' || e.key === 'P') {
    // Only while playing (not on start/game over)
    if (!document.getElementById('start-screen').classList.contains('hidden')) return;
    if (!document.getElementById('game-over-screen').classList.contains('hidden')) return;
    game.togglePause();
  }
});

window.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
window.addEventListener('contextmenu', (e) => e.preventDefault());
