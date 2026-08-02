import * as THREE from 'three';
import { CHUNK_SIZE, VIEW_DISTANCE } from '../utils/constants.js';
import { hash, randomRange } from '../utils/helpers.js';

/**
 * Forest world — lakes & rivers stay permanently clear of trees/rocks.
 * Higher-resolution terrain, denser trees (~+30%) and more bushes.
 * Rivers are narrow so the player can jump across them.
 */
export class World {
  constructor(scene, garlicManager) {
    this.scene = scene;
    this.garlicManager = garlicManager;
    this.chunks = new Map();
    this.obstacles = [];
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
    this.bushMat2 = new THREE.MeshStandardMaterial({ color: 0x3d8b4a });
    this.rockMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a });
    this.waterMat = new THREE.MeshStandardMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0.85
    });
    this.bridgeMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
    this.pathMat = new THREE.MeshStandardMaterial({ color: 0xc4a35a });
    this.flowerMats = [
      new THREE.MeshStandardMaterial({ color: 0xffeb3b }),
      new THREE.MeshStandardMaterial({ color: 0xff80ab }),
      new THREE.MeshStandardMaterial({ color: 0xce93d8 }),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    ];

    // Higher resolution ground (was 64x64 → 128x128)
    const groundGeo = new THREE.PlaneGeometry(600, 600, 128, 128);
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

  _noiseHeight(x, z) {
    const n1 = Math.sin(x * 0.025) * Math.cos(z * 0.022) * 0.65;
    const n2 = Math.sin(x * 0.05 + 1.3) * Math.cos(z * 0.045) * 0.32;
    const n3 = Math.sin(x * 0.09 + 0.7) * Math.cos(z * 0.08) * 0.18;
    return Math.max(0, n1 + n2 + n3);
  }

  getHeightAt(x, z) {
    return this._noiseHeight(x, z);
  }

  _lakeParams(cx, cz) {
    if (hash(cx * 2 + 17, cz * 3 + 31) <= 0.88) return null;
    const radius = 3.0 + hash(cx + 11, cz + 13) * 1.8;
    const baseX = cx * CHUNK_SIZE;
    const baseZ = cz * CHUNK_SIZE;
    const lx = baseX + 10 + hash(cx + 5, cz + 2) * (CHUNK_SIZE - 20);
    const lz = baseZ + 10 + hash(cx + 3, cz + 9) * (CHUNK_SIZE - 20);
    if (Math.sqrt(lx * lx + lz * lz) <= 20) return null;
    return { lx, lz, radius };
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
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const MARGIN = 7.0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const p = this._lakeParams(cx + dx, cz + dz);
        if (!p) continue;
        const ddx = x - p.lx;
        const ddz = z - p.lz;
        if (ddx * ddx + ddz * ddz < (p.radius + MARGIN) * (p.radius + MARGIN)) return true;
      }
    }
    return false;
  }

  _generateChunk(cx, cz) {
    const key = `${cx},${cz}`;
    const objects = [];
    const baseX = cx * CHUNK_SIZE;
    const baseZ = cz * CHUNK_SIZE;

    const lake = this._lakeParams(cx, cz);
    if (lake) {
      const { lx, lz, radius } = lake;
      const lakeGeo = new THREE.CircleGeometry(radius, 32);
      const mesh = new THREE.Mesh(lakeGeo, this.waterMat);
      mesh.rotation.x = -Math.PI / 2;
      const h = this.getHeightAt(lx, lz);
      mesh.position.set(lx, h + 0.08, lz);
      this.scene.add(mesh);
      objects.push(mesh);
      this.waterZones.push({ type: 'lake', x: lx, z: lz, radius: radius + 7.0 });
    }

    if (hash(cx * 1.7, cz * 2.3) > 0.78) {
      const riverWidth = 2.0;
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
      river.position.set(rx, rh + 0.06, rz);
      this.scene.add(river);
      objects.push(river);

      this.waterZones.push({
        type: 'river',
        x: rx,
        z: rz,
        halfW: riverWidth * 0.5 + 3.0,
        halfL: CHUNK_SIZE * 0.55,
        horizontal: isHorizontal
      });

      const bridge = new THREE.Mesh(
        new THREE.BoxGeometry(isHorizontal ? 6 : 2.4, 0.35, isHorizontal ? 2.4 : 6),
        this.bridgeMat
      );
      bridge.position.set(rx, rh + 0.35, rz);
      bridge.castShadow = true;
      this.scene.add(bridge);
      objects.push(bridge);
    }

    if (hash(cx * 4.1, cz * 5.3) > 0.7) {
      const px = baseX + 10 + hash(cx, cz) * 20;
      const pz = baseZ + CHUNK_SIZE / 2;
      if (!this._isOnWater(px, pz)) {
        const path = new THREE.Mesh(
          new THREE.PlaneGeometry(4, CHUNK_SIZE * 0.7),
          this.pathMat
        );
        path.rotation.x = -Math.PI / 2;
        path.position.set(px, this.getHeightAt(px, pz) + 0.03, pz);
        this.scene.add(path);
        objects.push(path);
      }
    }

    // Trees ~+30%
    const treeCount = 7 + Math.floor(hash(cx * 3, cz * 7) * 9);
    for (let i = 0; i < treeCount; i++) {
      const hx = hash(cx + i * 13, cz + i * 17);
      const hz = hash(cx + i * 19, cz + i * 23);
      const x = baseX + hx * CHUNK_SIZE;
      const z = baseZ + hz * CHUNK_SIZE;

      if (Math.sqrt(x * x + z * z) < 15) continue;
      if (this._isOnWater(x, z)) continue;

      const typeRoll = hash(cx + i * 29, cz + i * 31);
      if (typeRoll < 0.48) this._createRegularTree(x, z, objects);
      else if (typeRoll < 0.82) this._createPine(x, z, objects);
      else this._createBush(x, z, objects);
    }

    // Extra dedicated bushes
    const bushCount = 5 + Math.floor(hash(cx * 13, cz * 17) * 8);
    for (let i = 0; i < bushCount; i++) {
      const hx = hash(cx + i * 71, cz + i * 73);
      const hz = hash(cx + i * 79, cz + i * 83);
      const x = baseX + hx * CHUNK_SIZE;
      const z = baseZ + hz * CHUNK_SIZE;

      if (Math.sqrt(x * x + z * z) < 12) continue;
      if (this._isOnWater(x, z)) continue;
      this._createBush(x, z, objects);
    }

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

    const garlicCount = 3 + Math.floor(hash(cx * 7, cz * 9) * 3);
    let placed = 0;
    for (let i = 0; i < garlicCount + 4; i++) {
      if (placed >= garlicCount) break;
      const hx = hash(cx + i * 47, cz + i * 53);
      const hz = hash(cx + i * 59, cz + i * 61);
      const x = baseX + hx * (CHUNK_SIZE - 8) + 4;
      const z = baseZ + hz * (CHUNK_SIZE - 8) + 4;

      if (Math.sqrt(x * x + z * z) < 7) continue;
      if (this._isOnWater(x, z)) continue;

      placed++;
      const isSuper = placed % 10 === 0 || hash(cx + i * 71, cz + i * 73) > 0.92;
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
    const scale = randomRange(0.5, 1.1);
    const h = this.getHeightAt(x, z);
    const mat = Math.random() > 0.5 ? this.bushMat : this.bushMat2;
    const bush = new THREE.Mesh(
      new THREE.SphereGeometry(0.85 * scale, 8, 6),
      mat
    );
    bush.position.set(x, h + 0.55 * scale, z);
    bush.scale.y = 0.65;
    bush.castShadow = true;
    this.scene.add(bush);
    objects.push(bush);
    this.obstacles.push({ x, z, radius: 0.75 * scale });
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
