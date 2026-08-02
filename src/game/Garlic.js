import * as THREE from 'three';

/**
 * Normal garlic + Super Garlic (worth 10).
 */
export class GarlicManager {
  constructor(scene) {
    this.scene = scene;
    this.garlics = [];

    // Normal garlic
    this.geo = new THREE.SphereGeometry(0.35, 10, 8);
    this.mat = new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.7 });

    // Super garlic (golden + bigger)
    this.superGeo = new THREE.SphereGeometry(0.55, 12, 10);
    this.superMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0x886600,
      emissiveIntensity: 0.4,
      roughness: 0.4
    });
  }

  spawn(x, z, isSuper = false) {
    const mesh = new THREE.Mesh(
      isSuper ? this.superGeo : this.geo,
      isSuper ? this.superMat : this.mat
    );
    mesh.position.set(x, isSuper ? 0.6 : 0.4, z);
    mesh.castShadow = true;

    // Stem
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, isSuper ? 0.35 : 0.25),
      new THREE.MeshStandardMaterial({ color: 0x4a7c3a })
    );
    stem.position.y = isSuper ? 0.65 : 0.45;
    mesh.add(stem);

    this.scene.add(mesh);
    this.garlics.push({
      mesh,
      collected: false,
      isSuper,
      value: isSuper ? 10 : 1
    });
  }

  update(playerPos, onCollect) {
    for (let i = this.garlics.length - 1; i >= 0; i--) {
      const g = this.garlics[i];
      if (g.collected) continue;

      // Gentle float + spin
      const baseY = g.isSuper ? 0.6 : 0.4;
      g.mesh.position.y = baseY + Math.sin(Date.now() * 0.004 + i) * 0.15;
      g.mesh.rotation.y += g.isSuper ? 0.04 : 0.02;

      const dist = playerPos.distanceTo(g.mesh.position);
      if (dist < (g.isSuper ? 1.6 : 1.3)) {
        g.collected = true;
        this.scene.remove(g.mesh);
        this.garlics.splice(i, 1);
        onCollect(g.value, g.isSuper);
      }
    }
  }

  clear() {
    this.garlics.forEach(g => this.scene.remove(g.mesh));
    this.garlics = [];
  }
}
