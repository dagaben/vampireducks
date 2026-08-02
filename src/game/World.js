import * as THREE from 'three';
import { CHUNK_SIZE, VIEW_DISTANCE } from '../utils/constants.js';
import { hash, randomRange } from '../utils/helpers.js';

/**
 * Simple procedural forest using chunks.
 * Generates trees, rocks, rivers, garlic spawn points.
 */
export class World {
  constructor(scene, garlicManager) {
    this.scene = scene;
    this.garlicManager = garlicManager;
    this.chunks = new Map(); // key "x,z" → chunk data
    this.obstacles = []; // for simple collision

    // Materials
    this.treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
    this.treeLeafMat = new THREE.MeshStandardMaterial({ color: 0x2d6a3f });
    this.rockMat = new THREE.MeshStandardMaterial({ color: 0x7a7a7a });
    this.waterMat = new THREE.MeshStandardMaterial({
      color: 0x3a8cc9,
      transparent: true,
      opacity: 0.75
    });
    this.bridgeMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });

    // Ground plane (large enough for now)
    const groundGeo = new THREE.PlaneGeometry(400, 400);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x4a7c59 });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    scene.add(this.ground);
  }

  // Call every frame with player position
  update(playerPos) {
    const cx = Math.floor(playerPos.x / CHUNK_SIZE);
    const cz = Math.floor(playerPos.z / CHUNK_SIZE);

    // Generate needed chunks
    for (let dx = -VIEW_DISTANCE; dx <= VIEW_DISTANCE; dx++) {
      for (let dz = -VIEW_DISTANCE; dz <= VIEW_DISTANCE; dz++) {
        const key = `${cx + dx},${cz + dz}`;
        if (!this.chunks.has(key)) {
          this._generateChunk(cx + dx, cz + dz);
        }
      }
    }

    // Optional: unload far chunks later for performance
  }

  _generateChunk(cx, cz) {
    const key = `${cx},${cz}`;
    const objects = [];
    const baseX = cx * CHUNK_SIZE;
    const baseZ = cz * CHUNK_SIZE;

    // Simple river chance
    const hasRiver = hash(cx, cz) > 0.72;
    if (hasRiver) {
      // Horizontal or vertical river strip
      const riverGeo = new THREE.PlaneGeometry(CHUNK_SIZE, 6);
      const river = new THREE.Mesh(riverGeo, this.waterMat);
      river.rotation.x = -Math.PI / 2;
      river.position.set(baseX + CHUNK_SIZE / 2, 0.05, baseZ + CHUNK_SIZE / 2);
      this.scene.add(river);
      objects.push(river);

      // Bridge sometimes
      if (hash(cx + 1, cz) > 0.5) {
        const bridge = new THREE.Mesh(
          new THREE.BoxGeometry(4, 0.3, 7),
          this.bridgeMat
        );
        bridge.position.set(baseX + CHUNK_SIZE / 2, 0.25, baseZ + CHUNK_SIZE / 2);
        bridge.castShadow = true;
        this.scene.add(bridge);
        objects.push(bridge);
      }
    }

    // Trees
    const treeCount = 8 + Math.floor(hash(cx * 3, cz * 7) * 10);
    for (let i = 0; i < treeCount; i++) {
      const hx = hash(cx + i * 13, cz + i * 17);
      const hz = hash(cx + i * 19, cz + i * 23);
      const x = baseX + hx * CHUNK_SIZE;
      const z = baseZ + hz * CHUNK_SIZE;

      // Skip if too close to center of river
      if (hasRiver && Math.abs(z - (baseZ + CHUNK_SIZE / 2)) < 4) continue;

      this._createTree(x, z, objects);
    }

    // Rocks
    const rockCount = 3 + Math.floor(hash(cx * 5, cz * 11) * 5);
    for (let i = 0; i < rockCount; i++) {
      const hx = hash(cx + i * 31, cz + i * 37);
      const hz = hash(cx + i * 41, cz + i * 43);
      const x = baseX + hx * CHUNK_SIZE;
      const z = baseZ + hz * CHUNK_SIZE;
      this._createRock(x, z, objects);
    }

    // Garlic spawns (a few per chunk)
    const garlicCount = 2 + Math.floor(hash(cx * 7, cz * 9) * 3);
    for (let i = 0; i < garlicCount; i++) {
      const hx = hash(cx + i * 47, cz + i * 53);
      const hz = hash(cx + i * 59, cz + i * 61);
      const x = baseX + hx * (CHUNK_SIZE - 4) + 2;
      const z = baseZ + hz * (CHUNK_SIZE - 4) + 2;
      this.garlicManager.spawn(x, z);
    }

    this.chunks.set(key, { objects, cx, cz });
  }

  _createTree(x, z, objects) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.35, 2.2, 6),
      this.treeTrunkMat
    );
    trunk.position.set(x, 1.1, z);
    trunk.castShadow = true;
    this.scene.add(trunk);

    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(1.4, 8, 6),
      this.treeLeafMat
    );
    leaves.position.set(x, 3.0, z);
    leaves.castShadow = true;
    this.scene.add(leaves);

    objects.push(trunk, leaves);
    this.obstacles.push({ x, z, radius: 0.9 });
  }

  _createRock(x, z, objects) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(randomRange(0.6, 1.3), 0),
      this.rockMat
    );
    rock.position.set(x, 0.5, z);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    this.scene.add(rock);
    objects.push(rock);
    this.obstacles.push({ x, z, radius: 1.0 });
  }

  // Very simple collision – returns true if position is blocked
  resolveCollisions(pos, radius) {
    for (const obs of this.obstacles) {
      const dx = pos.x - obs.x;
      const dz = pos.z - obs.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < radius + obs.radius) {
        return true;
      }
    }
    return false;
  }

  clear() {
    // For restart – remove generated objects (simplified)
    this.chunks.forEach(chunk => {
      chunk.objects.forEach(obj => this.scene.remove(obj));
    });
    this.chunks.clear();
    this.obstacles = [];
  }
}
