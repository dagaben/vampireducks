import * as THREE from 'three';
import { CHUNK_SIZE, VIEW_DISTANCE } from '../utils/constants.js';
import { hash, randomRange } from '../utils/helpers.js';

/**
 * Procedural forest with small lakes, diverse trees, light grass + flowers.
 */
export class World {
  constructor(scene, garlicManager) {
    this.scene = scene;
    this.garlicManager = garlicManager;
    this.chunks = new Map();
    this.obstacles = [];

    // Materials – lighter grass
    this.treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
    this.pineTrunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f });

    // Different greens
    this.leafMats = [
      new THREE.MeshStandardMaterial({ color: 0x3a8c4a }), // bright
      new THREE.MeshStandardMaterial({ color: 0x2d6a3f }), // medium
      new THREE.MeshStandardMaterial({ color: 0x4caf50 }), // fresh
      new THREE.MeshStandardMaterial({ color: 0x1b5e20 })  // dark
    ];

    this.pineLeafMat = new THREE.MeshStandardMaterial({ color: 0x1a4d2e });
    this.bushMat = new THREE.MeshStandardMaterial({ color: 0x4caf50 });
    this.rockMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a });
    this.waterMat = new THREE.MeshStandardMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0.8
    });
    this.flowerMats = [
      new THREE.MeshStandardMaterial({ color: 0xffeb3b }), // yellow
      new THREE.MeshStandardMaterial({ color: 0xff80ab }), // pink
      new THREE.MeshStandardMaterial({ color: 0xce93d8 }), // purple
      new THREE.MeshStandardMaterial({ color: 0xffffff })  // white
    ];

    // Light green grass
    const groundGeo = new THREE.PlaneGeometry(500, 500);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x7cb342 }); // lighter green
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

    // === SMALL LAKES / PONDS (not huge rivers) ===
    // Only ~18% chance, and much smaller
    if (hash(cx, cz) > 0.82) {
      const lakeSize = randomRange(5, 9);
      const lakeGeo = new THREE.CircleGeometry(lakeSize, 16);
      const lake = new THREE.Mesh(lakeGeo, this.waterMat);
      lake.rotation.x = -Math.PI / 2;
      const lx = baseX + CHUNK_SIZE * 0.3 + hash(cx + 2, cz) * CHUNK_SIZE * 0.4;
      const lz = baseZ + CHUNK_SIZE * 0.3 + hash(cx, cz + 3) * CHUNK_SIZE * 0.4;
      lake.position.set(lx, 0.04, lz);
      this.scene.add(lake);
      objects.push(lake);
    }

    // === DIVERSE TREES ===
    const treeCount = 6 + Math.floor(hash(cx * 3, cz * 7) * 8);
    for (let i = 0; i < treeCount; i++) {
      const hx = hash(cx + i * 13, cz + i * 17);
      const hz = hash(cx + i * 19, cz + i * 23);
      const x = baseX + hx * CHUNK_SIZE;
      const z = baseZ + hz * CHUNK_SIZE;

      if (Math.sqrt(x * x + z * z) < 14) continue; // safe spawn zone

      const typeRoll = hash(cx + i * 29, cz + i * 31);
      if (typeRoll < 0.45) {
        this._createRegularTree(x, z, objects);
      } else if (typeRoll < 0.75) {
        this._createPine(x, z, objects);
      } else {
        this._createBush(x, z, objects);
      }
    }

    // Rocks
    const rockCount = 2 + Math.floor(hash(cx * 5, cz * 11) * 4);
    for (let i = 0; i < rockCount; i++) {
      const hx = hash(cx + i * 31, cz + i * 37);
      const hz = hash(cx + i * 41, cz + i * 43);
      const x = baseX + hx * CHUNK_SIZE;
      const z = baseZ + hz * CHUNK_SIZE;
      if (Math.sqrt(x * x + z * z) < 14) continue;
      this._createRock(x, z, objects);
    }

    // Flowers (decorative, no collision)
    const flowerCount = 8 + Math.floor(hash(cx * 11, cz * 13) * 12);
    for (let i = 0; i < flowerCount; i++) {
      const hx = hash(cx + i * 53, cz + i * 59);
      const hz = hash(cx + i * 61, cz + i * 67);
      const x = baseX + hx * CHUNK_SIZE;
      const z = baseZ + hz * CHUNK_SIZE;
      if (Math.sqrt(x * x + z * z) < 8) continue;
      this._createFlower(x, z, objects);
    }

    // Garlic + occasional Super Garlic
    const garlicCount = 2 + Math.floor(hash(cx * 7, cz * 9) * 3);
    for (let i = 0; i < garlicCount; i++) {
      const hx = hash(cx + i * 47, cz + i * 53);
      const hz = hash(cx + i * 59, cz + i * 61);
      const x = baseX + hx * (CHUNK_SIZE - 4) + 2;
      const z = baseZ + hz * (CHUNK_SIZE - 4) + 2;
      if (Math.sqrt(x * x + z * z) < 6) continue;

      // ~12% chance of Super Garlic
      const isSuper = hash(cx + i * 71, cz + i * 73) > 0.88;
      this.garlicManager.spawn(x, z, isSuper);
    }

    this.chunks.set(key, { objects, cx, cz });
  }

  _createRegularTree(x, z, objects) {
    const scale = randomRange(0.8, 1.3);
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22 * scale, 0.32 * scale, 2.0 * scale, 6),
      this.treeTrunkMat
    );
    trunk.position.set(x, 1.0 * scale, z);
    trunk.castShadow = true;
    this.scene.add(trunk);

    const leafMat = this.leafMats[Math.floor(Math.random() * this.leafMats.length)];
    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(1.3 * scale, 8, 6),
      leafMat
    );
    leaves.position.set(x, 2.7 * scale, z);
    leaves.castShadow = true;
    this.scene.add(leaves);

    objects.push(trunk, leaves);
    this.obstacles.push({ x, z, radius: 0.75 * scale });
  }

  _createPine(x, z, objects) {
    const scale = randomRange(0.9, 1.4);
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18 * scale, 0.28 * scale, 2.8 * scale, 6),
      this.pineTrunkMat
    );
    trunk.position.set(x, 1.4 * scale, z);
    trunk.castShadow = true;
    this.scene.add(trunk);

    // Layered cones for pine look
    for (let i = 0; i < 3; i++) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry((1.1 - i * 0.25) * scale, 1.4 * scale, 7),
        this.pineLeafMat
      );
      cone.position.set(x, (2.2 + i * 1.1) * scale, z);
      cone.castShadow = true;
      this.scene.add(cone);
      objects.push(cone);
    }

    objects.push(trunk);
    this.obstacles.push({ x, z, radius: 0.7 * scale });
  }

  _createBush(x, z, objects) {
    const scale = randomRange(0.6, 1.1);
    const bush = new THREE.Mesh(
      new THREE.SphereGeometry(0.9 * scale, 8, 6),
      this.bushMat
    );
    bush.position.set(x, 0.7 * scale, z);
    bush.scale.y = 0.7;
    bush.castShadow = true;
    this.scene.add(bush);

    objects.push(bush);
    this.obstacles.push({ x, z, radius: 0.85 * scale });
  }

  _createRock(x, z, objects) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(randomRange(0.5, 1.1), 0),
      this.rockMat
    );
    rock.position.set(x, 0.4, z);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    this.scene.add(rock);
    objects.push(rock);
    this.obstacles.push({ x, z, radius: 0.9 });
  }

  _createFlower(x, z, objects) {
    const mat = this.flowerMats[Math.floor(Math.random() * this.flowerMats.length)];
    const flower = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 5),
      mat
    );
    flower.position.set(x, 0.15, z);
    this.scene.add(flower);
    objects.push(flower);
  }

  resolveCollisions(pos, radius) {
    let collided = false;
    for (const obs of this.obstacles) {
      const dx = pos.x - obs.x;
      const dz = pos.z - obs.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const minDist = radius + obs.radius;

      if (dist < minDist && dist > 0.0001) {
        const push = (minDist - dist) / dist;
        pos.x += dx * push;
        pos.z += dz * push;
        collided = true;
      } else if (dist <= 0.0001) {
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
