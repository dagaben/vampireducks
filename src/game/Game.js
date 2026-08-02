import * as THREE from 'three';
import { Input } from './Input.js';
import { Player } from './Player.js';
import { CameraController } from './Camera.js';
import { World } from './World.js';
import { GarlicManager } from './Garlic.js';
import { DuckManager } from './Duck.js';
import {
  STARTING_LIVES,
  GARLIC_THRESHOLD,
  LIFE_REGAIN_THRESHOLD,
  DIFFICULTY_STEP,
  DUCK_SPAWN_INTERVAL_NIGHT,
  DAY_LENGTH,
  NIGHT_LENGTH,
  INVULN_DURATION
} from '../utils/constants.js';
import { randomRange } from '../utils/helpers.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.isRunning = false;
    this.isPaused = false;
    this.clock = new THREE.Clock();
    this.onGameOver = null; // callback set by main.js

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 45, 130);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      300
    );

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xfff5e0, 1.05);
    this.dirLight.position.set(30, 50, 20);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(2048, 2048);
    this.dirLight.shadow.camera.near = 1;
    this.dirLight.shadow.camera.far = 150;
    this.dirLight.shadow.camera.left = -50;
    this.dirLight.shadow.camera.right = 50;
    this.dirLight.shadow.camera.top = 50;
    this.dirLight.shadow.camera.bottom = -50;
    this.scene.add(this.dirLight);

    this.input = new Input();
    this.garlicManager = new GarlicManager(this.scene);
    this.world = new World(this.scene, this.garlicManager);
    this.player = new Player(this.scene);
    this.cameraController = new CameraController(this.camera, this.player.group);
    this.duckManager = new DuckManager(this.scene);

    this.garlicCount = 0;
    this.totalGarlicCollected = 0;
    this.lives = STARTING_LIVES;
    this.score = 0;
    this.isDay = true;
    this.timeOfDay = 0;
    this.duckSpawnTimer = 0;
    this.difficultyLevel = 0;

    this.updateHUD();
    window.addEventListener('resize', () => this.onResize());
  }

  start() {
    this.isRunning = true;
    this.isPaused = false;
    this.clock.start();
    this.animate();
  }

  togglePause() {
    if (!this.isRunning) return;
    this.isPaused = !this.isPaused;
    const el = document.getElementById('pause-screen');
    if (this.isPaused) {
      el.classList.remove('hidden');
      this.clock.stop();
    } else {
      el.classList.add('hidden');
      this.clock.start();
    }
  }

  restart() {
    this.garlicCount = 0;
    this.totalGarlicCollected = 0;
    this.lives = STARTING_LIVES;
    this.score = 0;
    this.isDay = true;
    this.timeOfDay = 0;
    this.duckSpawnTimer = 0;
    this.difficultyLevel = 0;
    this.isPaused = false;
    document.getElementById('pause-screen').classList.add('hidden');

    this.duckManager.clear();
    this.garlicManager.clear();
    this.world.clear();

    this.player.group.position.set(0, 0.8, 0);
    this.player.velocity.set(0, 0, 0);
    this.player.invulnTimer = 0;
    this.player.group.visible = true;

    this.updateHUD();
    this.applyDayNightVisuals();
    this.start();
  }

  animate() {
    if (!this.isRunning) return;
    requestAnimationFrame(() => this.animate());

    if (this.isPaused) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const delta = Math.min(this.clock.getDelta(), 0.05);

    this.timeOfDay += delta;
    const cycleLen = this.isDay ? DAY_LENGTH : NIGHT_LENGTH;
    if (this.timeOfDay >= cycleLen) {
      this.timeOfDay = 0;
      this.isDay = !this.isDay;

      if (this.isDay) {
        this.duckManager.clear();
        this.duckSpawnTimer = 0;
      } else {
        this.duckSpawnTimer = 1.5;
      }

      this.applyDayNightVisuals();
      this.updateHUD();
    }

    this.player.update(delta, this.input, this.world);
    this.world.update(this.player.position);

    this.garlicManager.update(this.player.position, (value, isSuper) => {
      this.garlicCount += value;
      this.totalGarlicCollected += value;
      this.score += value * 10;
      if (isSuper) this.score += 40;

      if (this.garlicCount >= LIFE_REGAIN_THRESHOLD && this.lives < STARTING_LIVES) {
        this.lives++;
      }

      if (this.totalGarlicCollected > 0 && this.totalGarlicCollected % DIFFICULTY_STEP === 0) {
        this.difficultyLevel++;
      }

      this.updateHUD();
    });

    if (!this.isDay) {
      this.duckSpawnTimer -= delta;
      if (this.duckSpawnTimer <= 0) {
        this.spawnDuckNearPlayer();
        const base = DUCK_SPAWN_INTERVAL_NIGHT;
        this.duckSpawnTimer = base / (1 + this.difficultyLevel * 0.15);
      }

      this.duckManager.update(
        delta,
        this.player,
        true,
        this.world,
        (duck) => this.handleDuckContact(duck)
      );
    }

    this.score += delta * 2;
    this.cameraController.update(delta);
    this.renderer.render(this.scene, this.camera);
  }

  spawnDuckNearPlayer() {
    const angle = Math.random() * Math.PI * 2;
    const dist = randomRange(22, 35);
    const x = this.player.position.x + Math.cos(angle) * dist;
    const z = this.player.position.z + Math.sin(angle) * dist;
    this.duckManager.spawn(x, z);
  }

  handleDuckContact(duck) {
    if (this.player.isInvulnerable || duck.state !== 'alive') return;

    if (this.garlicCount >= GARLIC_THRESHOLD) {
      if (duck.petrify()) {
        this.garlicCount -= GARLIC_THRESHOLD;
        this.score += 50;
        this.updateHUD();
      }
    } else {
      this.lives--;
      this.player.setInvulnerable(INVULN_DURATION);

      const dx = this.player.position.x - duck.position.x;
      const dz = this.player.position.z - duck.position.z;
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      this.player.velocity.x += (dx / len) * 10;
      this.player.velocity.z += (dz / len) * 10;

      this.updateHUD();

      if (this.lives <= 0) {
        this.gameOver();
      }
    }
  }

  applyDayNightVisuals() {
    if (this.isDay) {
      this.scene.background.setHex(0x87ceeb);
      this.scene.fog.color.setHex(0x87ceeb);
      this.ambientLight.intensity = 0.6;
      this.dirLight.intensity = 1.05;
      this.dirLight.color.setHex(0xfff5e0);
    } else {
      this.scene.background.setHex(0x0a1628);
      this.scene.fog.color.setHex(0x0a1628);
      this.ambientLight.intensity = 0.28;
      this.dirLight.intensity = 0.4;
      this.dirLight.color.setHex(0x8899cc);
    }
  }

  updateHUD() {
    document.getElementById('lives').textContent = `❤️ ${this.lives}`;
    document.getElementById('garlic-count').textContent = `🧄 ${this.garlicCount}`;
    document.getElementById('score').textContent = `Score: ${Math.floor(this.score)}`;
    document.getElementById('time-of-day').textContent = this.isDay ? '☀️ Day (safe)' : '🌙 Night (ducks!)';
  }

  gameOver() {
    this.isRunning = false;
    this.isPaused = false;
    document.getElementById('pause-screen').classList.add('hidden');
    if (typeof this.onGameOver === 'function') {
      this.onGameOver(this.score);
    } else {
      document.getElementById('final-score').textContent = `Score: ${Math.floor(this.score)}`;
      document.getElementById('game-over-screen').classList.remove('hidden');
    }
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
