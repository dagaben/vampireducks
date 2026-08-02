import * as THREE from 'three';

/**
 * Main Game class – orchestrates everything.
 * This is a placeholder that will be expanded into the full game.
 */
export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.isRunning = false;
    this.clock = new THREE.Clock();

    // Core Three.js setup (will be refined)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // sky blue for day

    // Temporary camera – will become proper isometric follow camera
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 25, 25);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;

    // Placeholder ground so something is visible immediately
    const groundGeo = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x4a7c59 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Simple light
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(20, 40, 10);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    // Placeholder player (simple colored box for now)
    const playerGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const playerMat = new THREE.MeshStandardMaterial({ color: 0xffaa66 });
    this.playerMesh = new THREE.Mesh(playerGeo, playerMat);
    this.playerMesh.position.y = 0.6;
    this.playerMesh.castShadow = true;
    this.scene.add(this.playerMesh);

    // Game state
    this.garlicCount = 0;
    this.lives = 5;
    this.score = 0;
    this.isDay = true;

    // Bind resize
    window.addEventListener('resize', () => this.onResize());
  }

  start() {
    this.isRunning = true;
    this.clock.start();
    this.animate();
    console.log('Vampire Ducks – Game started (placeholder version)');
  }

  restart() {
    this.garlicCount = 0;
    this.lives = 5;
    this.score = 0;
    this.playerMesh.position.set(0, 0.6, 0);
    this.updateHUD();
    this.start();
  }

  animate() {
    if (!this.isRunning) return;
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    // Temporary simple movement (will be replaced by proper Input + Player)
    // Just so the placeholder is alive

    this.renderer.render(this.scene, this.camera);
  }

  updateHUD() {
    document.getElementById('lives').textContent = `❤️ ${this.lives}`;
    document.getElementById('garlic-count').textContent = `🧄 ${this.garlicCount}`;
    document.getElementById('score').textContent = `Score: ${this.score}`;
    document.getElementById('time-of-day').textContent = this.isDay ? '☀️ Day' : '🌙 Night';
  }

  gameOver() {
    this.isRunning = false;
    document.getElementById('final-score').textContent = `Score: ${this.score}`;
    document.getElementById('game-over-screen').classList.remove('hidden');
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
