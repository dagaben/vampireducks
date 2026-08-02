import * as THREE from 'three';
import { randomRange } from '../utils/helpers.js';

/**
 * Single garlic collectible + manager for many of them.
 */
export class GarlicManager {
  constructor(scene) {
    this.scene = scene;
    this.garlics = [];
    this.geometry = new THREE.SphereGeometry(0.35, 10, 8);
    this.material = new THREE.MeshStandardMaterial({
      color: 0xe8e0c8,
      roughness: 0.7
    });
  }

  spawn(x, z) {
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.position.set(x, 0.4, z);
    mesh.castShadow = true;

    // Tiny stem
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x4a7c3a })
    );
    stem.position.y = 0.45;
    mesh.add(stem);

    this.scene.add(mesh);
    this.garlics.push({ mesh, collected: false });
  }

  update(playerPos, onCollect) {
    for (let i = this.garlics.length - 1; i >= 0; i--) {
      const g = this.garlics[i];
      if (g.collected) continue;

      // Gentle float animation
      g.mesh.position.y = 0.4 + Math.sin(Date.now() * 0.004 + i) * 0.12;
      g.mesh.rotation.y += 0.02;

      const dist = playerPos.distanceTo(g.mesh.position);
      if (dist < 1.3) {
        g.collected = true;
        this.scene.remove(g.mesh);
        this.garlics.splice(i, 1);
        onCollect();
      }
    }
  }

  clear() {
    this.garlics.forEach(g => this.scene.remove(g.mesh));
    this.garlics = [];
  }
}
