import './style.css';
import { Game } from './game/Game.js';

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);

// Temporary: use the existing SVG banner
const banner = document.getElementById('title-banner');
if (banner) {
  banner.src = './title-banner.svg';
  banner.setAttribute('width', '900');
  banner.setAttribute('height', '420');
}

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
    if (!document.getElementById('start-screen').classList.contains('hidden')) return;
    if (!document.getElementById('game-over-screen').classList.contains('hidden')) return;
    game.togglePause();
  }
});

window.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
window.addEventListener('contextmenu', (e) => e.preventDefault());
