import './style.css';
import { Game } from './game/Game.js';

// Title banner — using the SVG asset (new poster data URI is prepared and can be swapped in)
const banner = document.getElementById('title-banner');
if (banner) banner.src = './title-banner.svg';

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);

// ---- Leaderboard helpers (localStorage) ----
const LB_KEY = 'vampireducks_highscores';

function loadScores() {
  try {
    const raw = localStorage.getItem(LB_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveScores(scores) {
  localStorage.setItem(LB_KEY, JSON.stringify(scores.slice(0, 10)));
}

function renderLeaderboard(listEl, scores) {
  listEl.innerHTML = '';
  if (!scores.length) {
    const li = document.createElement('li');
    li.innerHTML = '<span class="name">---</span><span class="score">0</span>';
    listEl.appendChild(li);
    return;
  }
  scores.forEach((entry) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="name">${entry.name}</span><span class="score">${entry.score}</span>`;
    listEl.appendChild(li);
  });
}

function refreshHomeLeaderboard() {
  const scores = loadScores();
  renderLeaderboard(document.getElementById('home-scores'), scores);
}

// Show top 10 on home screen immediately
refreshHomeLeaderboard();

// ---- Start / Restart ----
document.getElementById('start-button').addEventListener('click', () => {
  document.getElementById('start-screen').classList.add('hidden');
  game.start();
});

document.getElementById('restart-button').addEventListener('click', () => {
  document.getElementById('game-over-screen').classList.add('hidden');
  document.getElementById('name-entry').classList.add('hidden');
  document.getElementById('go-leaderboard').classList.add('hidden');
  game.restart();
});

document.getElementById('pause-button').addEventListener('click', () => {
  game.togglePause();
});

document.getElementById('resume-button').addEventListener('click', () => {
  game.togglePause();
});

document.getElementById('mute-button').addEventListener('click', () => {
  game.audio.toggleMute();
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyP' || e.key === 'p' || e.key === 'P') {
    if (!document.getElementById('start-screen').classList.contains('hidden')) return;
    if (!document.getElementById('game-over-screen').classList.contains('hidden')) return;
    game.togglePause();
  }
  if (e.code === 'KeyM' || e.key === 'm' || e.key === 'M') {
    if (!document.getElementById('start-screen').classList.contains('hidden')) return;
    game.audio.toggleMute();
  }
});

// ---- Game Over → name entry / leaderboard ----
game.onGameOver = (finalScore) => {
  const scores = loadScores();
  const qualifies = scores.length < 10 || finalScore > (scores[scores.length - 1]?.score || 0);

  document.getElementById('final-score').textContent = `Score: ${Math.floor(finalScore)}`;
  document.getElementById('game-over-screen').classList.remove('hidden');

  if (qualifies) {
    document.getElementById('name-entry').classList.remove('hidden');
    document.getElementById('go-leaderboard').classList.add('hidden');
    const first = document.getElementById('initial-0');
    first.focus();
    first.select();
  } else {
    document.getElementById('name-entry').classList.add('hidden');
    document.getElementById('go-leaderboard').classList.remove('hidden');
    renderLeaderboard(document.getElementById('go-scores'), scores);
  }
};

document.getElementById('submit-name-button').addEventListener('click', () => {
  const name = [
    document.getElementById('initial-0').value,
    document.getElementById('initial-1').value,
    document.getElementById('initial-2').value
  ].join('').toUpperCase().replace(/[^A-Z]/g, 'A').padEnd(3, 'A').slice(0, 3);

  const score = Math.floor(game.score);
  let scores = loadScores();
  scores.push({ name, score });
  scores.sort((a, b) => b.score - a.score);
  scores = scores.slice(0, 10);
  saveScores(scores);

  document.getElementById('name-entry').classList.add('hidden');
  document.getElementById('go-leaderboard').classList.remove('hidden');
  renderLeaderboard(document.getElementById('go-scores'), scores);
  refreshHomeLeaderboard();
});

// Arcade-style initial inputs: auto-advance, only letters
['initial-0', 'initial-1', 'initial-2'].forEach((id, idx) => {
  const el = document.getElementById(id);
  el.addEventListener('input', () => {
    el.value = el.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 1);
    if (el.value && idx < 2) {
      document.getElementById(`initial-${idx + 1}`).focus();
    }
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !el.value && idx > 0) {
      document.getElementById(`initial-${idx - 1}`).focus();
    }
    if (e.key === 'Enter') {
      document.getElementById('submit-name-button').click();
    }
  });
});

window.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
window.addEventListener('contextmenu', (e) => e.preventDefault());
