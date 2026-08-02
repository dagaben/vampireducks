import * as THREE from 'three';
import { CHUNK_SIZE, VIEW_DISTANCE } from '../utils/constants.js';
import { hash, randomRange } from '../utils/helpers.js';

/**
 * Gentle hilly forest. Lakes stay clear of trees/rocks.
 */
export class World {
  constructor(scene, garlicManager) {
    this.scene = scene;
    this.garlicManager = garlicManager;
    this.chunks = new Map();
    this.obstacles = [];
    // Water zones: lakes {type:'lake', x, z, radius}
    // rivers {type:'river', x, z, halfW, halfL, horizontal}
    this.waterZones = [];

    this.treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
    this.pineTrunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f });
    this.leafMats = [
      new THREE.MeshStandardMaterial({ color: 0x3a8c4a }),
      new THREE.MeshStandardMaterial({ color: 0x2d6a3f }),
      new THREE.MeshStandardMaterial({ color: 0x4caf50 }),
      new THREE.MeshStandardMaterial({ color: 0x1b5e20 })
    ];
    this.pineLeafMat = new THREE.MeshStandardMaterial({ color: 0x1a4d2e });
    this.bushMat = new THREE.MeshStandardMaterial({ color: 0x4caf50 });
    this.rockMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a });
    this.waterMat = new THREE.MeshStandardMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0.82
    });
    this.bridgeMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
    this.pathMat = new THREE.MeshStandardMaterial({ color: 0xc4a35a });
    this.flowerMats = [
      new THREE.MeshStandardMaterial({ color: 0xffeb3b }),
      new THREE.MeshStandardMaterial({ color: 0xff80ab }),
      new THREE.MeshStandardMaterial({ color: 0xce93d8 }),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    ];

    // Gentle hills only (max ~1.2) so characters can climb
    const groundGeo = new THREE.PlaneGeometry(600, 600, 64, 64);
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getY(i);
      pos.setZ(i, this._noiseHeight(x, z));
    }
    groundGeo.computeVertexNormals();
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x7cb342 });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    scene.add(this.ground);
  }

  // Gentle rolling hills — climbable, no clipping look
  _noiseHeight(x, z) {
    const n1 = Math.sin(x * 0.025) * Math.cos(z * 0.022) * 0.7;
    const n2 = Math.sin(x * 0.05 + 1.3) * Math.cos(z * 0.045) * 0.35;
    return Math.max(0, n1 + n2);
  }

  getHeightAt(x, z) {
    return this._noiseHeight(x, z);
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

  _isOnWater(x, z) {
    for (const w of this.waterZones) {
      if (w.type === 'lake') {
        const dx = x - w.x;
        const dz = z - w.z;
        if (dx * dx + dz * dz < w.radius * w.radius) return true;
      } else if (w.type === 'river') {
        if (w.horizontal) {
          if (Math.abs(z - w.z) < w.halfW && Math.abs(x - w.x) < w.halfL) return true;
        } else {
          if (Math.abs(x - w.x) < w.halfW && Math.abs(z - w.z) < w.halfL) return true;
        }
      }
    }
    // Also predict lakes from neighboring chunks not yet generated
    return this._predictLakeAt(x, z);
  }

  /** Deterministic: would a lake cover this world point? */
  _predictLakeAt(x, z) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const ncx = cx + dx;
        const ncz = cz + dz;
        if (hash(ncx * 2.1, ncz * 3.7) <= 0.88) continue;
        const radius = 3.0 + hash(ncx + 11, ncz + 13) * 2.5; // 3–5.5
        const margin = 2.2; // keep trees well clear of water edge
        const baseX = ncx * CHUNK_SIZE;
        const baseZ = ncz * CHUNK_SIZE;
        const lx = baseX + 8 + hash(ncx + 5, ncz) * (CHUNK_SIZE - 16);
        const lz = baseZ + 8 + hash(ncx, ncz + 9) * (CHUNK_SIZE - 16);
        if (Math.sqrt(lx * lx + lz * lz) <= 18) continue;
        const ddx = x - lx;
        const ddz = z - lz;
        if (ddx * ddx + ddz * ddz < (radius + margin) * (radius + margin)) return true;
      }
    }
    return false;
  }

  _generateChunk(cx, cz) {
    const key = `${cx},${cz}`;
    const objects = [];
    const baseX = cx * CHUNK_SIZE;
    const baseZ = cz * CHUNK_SIZE;

    // === SMALL CLEAN LAKES ===
    if (hash(cx * 2.1, cz * 3.7) > 0.88) {
      const radius = 3.0 + hash(cx + 11, cz + 13) * 2.5;
      const lx = baseX + 8 + hash(cx + 5, cz) * (CHUNK_SIZE - 16);
      const lz = baseZ + 8 + hash(cx, cz + 9) * (CHUNK_SIZE - 16);

      if (Math.sqrt(lx * lx + lz * lz) > 18) {
        const lakeGeo = new THREE.CircleGeometry(radius, 20);
        const lake = new THREE.Mesh(lakeGeo, this.waterMat);
        lake.rotation.x = -Math.PI / 2;
        const h = this.getHeightAt(lx, lz);
        lake.position.set(lx, h + 0.06, lz);
        this.scene.add(lake);
        objects.push(lake);
        // Generous margin so nothing sits on the shore/water
        this.waterZones.push({ type: 'lake', x: lx, z: lz, radius: radius + 2.2 });
      }
    }

    // === NARROW RIVERS + BRIDGES ===
    if (hash(cx * 1.7, cz * 2.3) > 0.78) {
      const riverWidth = 3.2;
      const isHorizontal = hash(cx, cz + 11) > 0.5;
      const rx = baseX + CHUNK_SIZE / 2;
      const rz = baseZ + CHUNK_SIZE / 2;
      const rh = this.getHeightAt(rx, rz);

      const riverGeo = new THREE.PlaneGeometry(
        isHorizontal ? CHUNK_SIZE : riverWidth,
        isHorizontal ? riverWidth : CHUNK_SIZE
      );
      const river = new THREE.Mesh(riverGeo, this.waterMat);
      river.rotation.x = -Math.PI / 2;
      river.position.set(rx, rh + 0.05, rz);
      this.scene.add(river);
      objects.push(river);

      // Strip-shaped exclusion (not a huge circle)
      this.waterZones.push({
        type: 'river',
        x: rx,
        z: rz,
        halfW: riverWidth * 0.5 + 1.5,
        halfL: CHUNK_SIZE * 0.55,
        horizontal: isHorizontal
      });

      if (hash(cx + 3, cz + 4) > 0.35) {
        const bridge = new THREE.Mesh(
          new THREE.BoxGeometry(isHorizontal ? 5 : 3.2, 0.35, isHorizontal ? 3.2 : 5),
          this.bridgeMat
        );
        bridge.position.set(rx, rh + 0.35, rz);
        bridge.castShadow = true;
        this.scene.add(bridge);
        objects.push(bridge);
      }
    }

    // Paths
    if (hash(cx * 4.1, cz * 5.3) > 0.7) {
      const path = new THREE.Mesh(
        new THREE.PlaneGeometry(4, CHUNK_SIZE * 0.7),
        this.pathMat
      );
      path.rotation.x = -Math.PI / 2;
      const px = baseX + 10 + hash(cx, cz) * 20;
      const pz = baseZ + CHUNK_SIZE / 2;
      path.position.set(px, this.getHeightAt(px, pz) + 0.03, pz);
      this.scene.add(path);
      objects.push(path);
    }

    // Trees — never on water (including predicted lakes from neighbors)
    const treeCount = 5 + Math.floor(hash(cx * 3, cz * 7) * 7);
    for (let i = 0; i < treeCount; i++) {
      const hx = hash(cx + i * 13, cz + i * 17);
      const hz = hash(cx + i * 19, cz + i * 23);
      const x = baseX + hx * CHUNK_SIZE;
      const z = baseZ + hz * CHUNK_SIZE;

      if (Math.sqrt(x * x + z * z) < 15) continue;
      if (this._isOnWater(x, z)) continue;

      const typeRoll = hash(cx + i * 29, cz + i * 31);
      if (typeRoll < 0.42) this._createRegularTree(x, z, objects);
      else if (typeRoll < 0.72) this._createPine(x, z, objects);
      else this._createBush(x, z, objects);
    }

    // Rocks
    const rockCount = 1 + Math.floor(hash(cx * 5, cz * 11) * 3);
    for (let i = 0; i < rockCount; i++) {
      const hx = hash(cx + i * 31, cz + i * 37);
      const hz = hash(cx + i * 41, cz + i * 43);
      const x = baseX + hx * CHUNK_SIZE;
      const z = baseZ + hz * CHUNK_SIZE;
      if (Math.sqrt(x * x + z * z) < 14) continue;
      if (this._isOnWater(x, z)) continue;
      this._createRock(x, z, objects);
    }

    // Flowers
    const flowerCount = 6 + Math.floor(hash(cx * 11, cz * 13) * 10);
    for (let i = 0; i < flowerCount; i++) {
      const hx = hash(cx + i * 53, cz + i * 59);
      const hz = hash(cx + i * 61, cz + i * 67);
      const x = baseX + hx * CHUNK_SIZE;
      const z = baseZ + hz * CHUNK_SIZE;
      if (Math.sqrt(x * x + z * z) < 8) continue;
      if (this._isOnWater(x, z)) continue;
      this._createFlower(x, z, objects);
    }

    // Garlic
    const garlicCount = 2 + Math.floor(hash(cx * 7, cz * 9) * 3);
    for (let i = 0; i < garlicCount; i++) {
      const hx = hash(cx + i * 47, cz + i * 53);
      const hz = hash(cx + i * 59, cz + i * 61);
      const x = baseX + hx * (CHUNK_SIZE - 6) + 3;
      const z = baseZ + hz * (CHUNK_SIZE - 6) + 3;

      if (Math.sqrt(x * x + z * z) < 7) continue;
      if (this._isOnWater(x, z)) continue;

      const isSuper = hash(cx + i * 71, cz + i * 73) > 0.78;
      const groundY = this.getHeightAt(x, z);
      this.garlicManager.spawn(x, z, isSuper, groundY);
    }

    this.chunks.set(key, { objects, cx, cz });
  }

  _createRegularTree(x, z, objects) {
    const scale = randomRange(0.75, 1.25);
    const h = this.getHeightAt(x, z);
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2 * scale, 0.3 * scale, 1.9 * scale, 6),
      this.treeTrunkMat
    );
    trunk.position.set(x, h + 0.95 * scale, z);
    trunk.castShadow = true;
    this.scene.add(trunk);

    const leafMat = this.leafMats[Math.floor(Math.random() * this.leafMats.length)];
    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(1.25 * scale, 8, 6),
      leafMat
    );
    leaves.position.set(x, h + 2.5 * scale, z);
    leaves.castShadow = true;
    this.scene.add(leaves);

    objects.push(trunk, leaves);
    this.obstacles.push({ x, z, radius: 0.7 * scale });
  }

  _createPine(x, z, objects) {
    const scale = randomRange(0.85, 1.35);
    const h = this.getHeightAt(x, z);
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16 * scale, 0.26 * scale, 2.6 * scale, 6),
      this.pineTrunkMat
    );
    trunk.position.set(x, h + 1.3 * scale, z);
    trunk.castShadow = true;
    this.scene.add(trunk);

    for (let i = 0; i < 3; i++) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry((1.05 - i * 0.22) * scale, 1.3 * scale, 7),
        this.pineLeafMat
      );
      cone.position.set(x, h + (2.0 + i * 1.05) * scale, z);
      cone.castShadow = true;
      this.scene.add(cone);
      objects.push(cone);
    }
    objects.push(trunk);
    this.obstacles.push({ x, z, radius: 0.65 * scale });
  }

  _createBush(x, z, objects) {
    const scale = randomRange(0.55, 1.05);
    const h = this.getHeightAt(x, z);
    const bush = new THREE.Mesh(
      new THREE.SphereGeometry(0.85 * scale, 8, 6),
      this.bushMat
    );
    bush.position.set(x, h + 0.6 * scale, z);
    bush.scale.y = 0.65;
    bush.castShadow = true;
    this.scene.add(bush);
    objects.push(bush);
    this.obstacles.push({ x, z, radius: 0.8 * scale });
  }

  _createRock(x, z, objects) {
    const h = this.getHeightAt(x, z);
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(randomRange(0.45, 1.0), 0),
      this.rockMat
    );
    rock.position.set(x, h + 0.35, z);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    this.scene.add(rock);
    objects.push(rock);
    this.obstacles.push({ x, z, radius: 0.85 });
  }

  _createFlower(x, z, objects) {
    const h = this.getHeightAt(x, z);
    const mat = this.flowerMats[Math.floor(Math.random() * this.flowerMats.length)];
    const flower = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 5), mat);
    flower.position.set(x, h + 0.12, z);
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
    this.waterZones = [];
  }
}
