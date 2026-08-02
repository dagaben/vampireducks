import * as THREE from 'three';
import { CHUNK_SIZE, VIEW_DISTANCE } from '../utils/constants.js';
import { hash, randomRange } from '../utils/helpers.js';

/**
 * Simple procedural forest using chunks.
 * Generates trees, rocks, rivers, bridges, garlic.
 */
export class World {
  constructor(scene, garlicManager) {
    this.scene = scene;
    this.garlicManager = garlicManager;
    this.chunks = new Map();
    this.obstacles = []; // {x, z, radius}

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

    // Large ground
    const groundGeo = new THREE.PlaneGeometry(500, 500);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x4a7c59 });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    scene.add(this.ground);
  }

  update(playerPos) {
    const cx = Math.floor(playerPos.x / CHUNK_SIZE);
    const cz = Math.floor(playerPos.z / CHUNK_SIZE);

    for (let dx = -VIEW_DISTANCE; dx <= VIEW_DISTANCE; dx++) {
      for (let dz = -VIEW_DISTANCE; dz <= VIEW_DISTANCE; dz++) {
        const key = `${cx + dx},${cz + dz}`;
        if (!this.chunks.has(key)) {
          this._generateChunk(cx + dx, cz + dz);
        }
      }
    }
  }

  _generateChunk(cx, cz) {
    const key = `${cx},${cz}`;
    const objects = [];
    const baseX = cx * CHUNK_SIZE;
    const baseZ = cz * CHUNK_SIZE;

    // River chance
    const hasRiver = hash(cx, cz) > 0.72;
    if (hasRiver) {
      const riverGeo = new THREE.PlaneGeometry(CHUNK_SIZE, 6);
      const river = new THREE.Mesh(riverGeo, this.waterMat);
      river.rotation.x = -Math.PI / 2;
      river.position.set(baseX + CHUNK_SIZE / 2, 0.05, baseZ + CHUNK_SIZE / 2);
      this.scene.add(river);
      objects.push(river);

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

    // Trees – skip if too close to world origin (safe spawn zone)
    const treeCount = 7 + Math.floor(hash(cx * 3, cz * 7) * 9);
    for (let i = 0; i < treeCount; i++) {
      const hx = hash(cx + i * 13, cz + i * 17);
      const hz = hash(cx + i * 19, cz + i * 23);
      const x = baseX + hx * CHUNK_SIZE;
      const z = baseZ + hz * CHUNK_SIZE;

      // Safe spawn zone around (0,0)
      if (Math.sqrt(x * x + z * z) < 14) continue;

      // Skip river area
      if (hasRiver && Math.abs(z - (baseZ + CHUNK_SIZE / 2)) < 4) continue;

      this._createTree(x, z, objects);
    }

    // Rocks – also respect safe zone
    const rockCount = 2 + Math.floor(hash(cx * 5, cz * 11) * 4);
    for (let i = 0; i < rockCount; i++) {
      const hx = hash(cx + i * 31, cz + i * 37);
      const hz = hash(cx + i * 41, cz + i * 43);
      const x = baseX + hx * CHUNK_SIZE;
      const z = baseZ + hz * CHUNK_SIZE;

      if (Math.sqrt(x * x + z * z) < 14) continue;

      this._createRock(x, z, objects);
    }

    // Garlic
    const garlicCount = 2 + Math.floor(hash(cx * 7, cz * 9) * 3);
    for (let i = 0; i < garlicCount; i++) {
      const hx = hash(cx + i * 47, cz + i * 53);
      const hz = hash(cx + i * 59, cz + i * 61);
      const x = baseX + hx * (CHUNK_SIZE - 4) + 2;
      const z = baseZ + hz * (CHUNK_SIZE - 4) + 2;

      // Allow garlic a bit closer so player finds some early
      if (Math.sqrt(x * x + z * z) < 6) continue;

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
    this.obstacles.push({ x, z, radius: 0.85 });
  }

  _createRock(x, z, objects) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(randomRange(0.55, 1.2), 0),
      this.rockMat
    );
    rock.position.set(x, 0.45, z);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    this.scene.add(rock);
    objects.push(rock);
    this.obstacles.push({ x, z, radius: 0.95 });
  }

  /**
   * Resolve sphere collision against all obstacles.
   * Pushes the position out of any overlapping obstacle.
   * Returns true if any collision happened.
   */
  resolveCollisions(pos, radius) {
    let collided = false;

    for (const obs of this.obstacles) {
      const dx = pos.x - obs.x;
      const dz = pos.z - obs.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const minDist = radius + obs.radius;

      if (dist < minDist && dist > 0.0001) {
        // Push out along the separation vector
        const push = (minDist - dist) / dist;
        pos.x += dx * push;
        pos.z += dz * push;
        collided = true;
      } else if (dist <= 0.0001) {
        // Exactly on top – push in a default direction
        pos.x += minDist;
        collided = true;
      }
    }

    return collided;
  }

  clear() {
    this.chunks.forEach(chunk => {
      chunk.objects.forEach(obj => this.scene.remove(obj));
    });
    this.chunks.clear();
    this.obstacles = [];
  }
}
