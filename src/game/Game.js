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
  DUCK_SPAWN_INTERVAL_DAY,
  DUCK_SPAWN_INTERVAL_NIGHT,
  DAY_LENGTH,
  NIGHT_LENGTH
} from '../utils/constants.js';
import { randomRange } from '../utils/helpers.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.isRunning = false;
    this.clock = new THREE.Clock();

    // Three.js core
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 40, 120);

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

    // Lighting
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xfff5e0, 1.0);
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

    // Systems
    this.input = new Input();
    this.garlicManager = new GarlicManager(this.scene);
    this.world = new World(this.scene, this.garlicManager);
    this.player = new Player(this.scene);
    this.cameraController = new CameraController(this.camera, this.player.group);
    this.duckManager = new DuckManager(this.scene);

    // Game state
    this.garlicCount = 0;
    this.totalGarlicCollected = 0; // for difficulty & life regain
    this.lives = STARTING_LIVES;
    this.score = 0;
    this.isDay = true;
    this.timeOfDay = 0; // seconds into current cycle
    this.duckSpawnTimer = 0;
    this.difficultyLevel = 0;

    this.updateHUD();

    window.addEventListener('resize', () => this.onResize());
  }

  start() {
    this.isRunning = true;
    this.clock.start();
    this.animate();
  }

  restart() {
    // Reset state
    this.garlicCount = 0;
    this.totalGarlicCollected = 0;
    this.lives = STARTING_LIVES;
    this.score = 0;
    this.isDay = true;
    this.timeOfDay = 0;
    this.duckSpawnTimer = 0;
    this.difficultyLevel = 0;

    // Clear entities
    this.duckManager.clear();
    this.garlicManager.clear();
    this.world.clear();

    // Reset player
    this.player.group.position.set(0, 0.7, 0);
    this.player.velocity.set(0, 0, 0);

    this.updateHUD();
    this.applyDayNightVisuals();
    this.start();
  }

  animate() {
    if (!this.isRunning) return;
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.05); // clamp large spikes

    // Day / Night cycle
    this.timeOfDay += delta;
    const cycleLen = this.isDay ? DAY_LENGTH : NIGHT_LENGTH;
    if (this.timeOfDay >= cycleLen) {
      this.timeOfDay = 0;
      this.isDay = !this.isDay;
      this.applyDayNightVisuals();
      this.updateHUD();
    }

    // Player
    this.player.update(delta, this.input, this.world);

    // World chunks
    this.world.update(this.player.position);

    // Garlic collection
    this.garlicManager.update(this.player.position, () => {
      this.garlicCount++;
      this.totalGarlicCollected++;
      this.score += 10;

      // Life regain
      if (this.garlicCount >= LIFE_REGAIN_THRESHOLD && this.lives < STARTING_LIVES) {
        this.lives++;
        // Keep garlic at 100 as requested
      }

      // Difficulty step
      if (this.totalGarlicCollected > 0 && this.totalGarlicCollected % DIFFICULTY_STEP === 0) {
        this.difficultyLevel++;
      }

      this.updateHUD();
    });

    // Duck spawning
    this.duckSpawnTimer -= delta;
    if (this.duckSpawnTimer <= 0) {
      this.spawnDuckNearPlayer();
      const base = this.isDay ? DUCK_SPAWN_INTERVAL_DAY : DUCK_SPAWN_INTERVAL_NIGHT;
      this.duckSpawnTimer = base / (1 + this.difficultyLevel * 0.15);
    }

    // Ducks update + collision logic
    this.duckManager.update(
      delta,
      this.player,
      !this.isDay,
      null,
      (duck) => this.handleDuckContact(duck)
    );

    // Score from survival
    this.score += delta * 2;

    // Camera
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
    if (this.garlicCount >= GARLIC_THRESHOLD) {
      // Petrify!
      if (duck.petrify()) {
        this.garlicCount -= GARLIC_THRESHOLD;
        this.score += 50;
        // Play meowbuf later
        this.updateHUD();
      }
    } else {
      // Lose a life
      this.lives--;
      this.updateHUD();

      // Knockback player a bit
      const dx = this.player.position.x - duck.position.x;
      const dz = this.player.position.z - duck.position.z;
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      this.player.velocity.x += (dx / len) * 8;
      this.player.velocity.z += (dz / len) * 8;

      if (this.lives <= 0) {
        this.gameOver();
      }
    }
  }

  applyDayNightVisuals() {
    if (this.isDay) {
      this.scene.background.setHex(0x87ceeb);
      this.scene.fog.color.setHex(0x87ceeb);
      this.ambientLight.intensity = 0.55;
      this.dirLight.intensity = 1.0;
      this.dirLight.color.setHex(0xfff5e0);
    } else {
      this.scene.background.setHex(0x0a1628);
      this.scene.fog.color.setHex(0x0a1628);
      this.ambientLight.intensity = 0.25;
      this.dirLight.intensity = 0.35;
      this.dirLight.color.setHex(0x8899cc);
    }
  }

  updateHUD() {
    document.getElementById('lives').textContent = `❤️ ${this.lives}`;
    document.getElementById('garlic-count').textContent = `🧄 ${this.garlicCount}`;
    document.getElementById('score').textContent = `Score: ${Math.floor(this.score)}`;
    document.getElementById('time-of-day').textContent = this.isDay ? '☀️ Day' : '🌙 Night';
  }

  gameOver() {
    this.isRunning = false;
    document.getElementById('final-score').textContent = `Score: ${Math.floor(this.score)}`;
    document.getElementById('game-over-screen').classList.remove('hidden');
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
