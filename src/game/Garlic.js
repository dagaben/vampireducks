import * as THREE from 'three';

/**
 * Normal garlic + Super Garlic (golden, worth 10).
 */
export class GarlicManager {
  constructor(scene) {
    this.scene = scene;
    this.garlics = [];

    this.geo = new THREE.SphereGeometry(0.35, 10, 8);
    this.mat = new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.7 });

    this.superGeo = new THREE.SphereGeometry(0.6, 12, 10);
    this.superMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xaa7700,
      emissiveIntensity: 0.55,
      roughness: 0.35
    });
  }

  spawn(x, z, isSuper = false) {
    const mesh = new THREE.Mesh(
      isSuper ? this.superGeo : this.geo,
      isSuper ? this.superMat : this.mat
    );
    mesh.position.set(x, isSuper ? 0.7 : 0.4, z);
    mesh.castShadow = true;

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, isSuper ? 0.4 : 0.25),
      new THREE.MeshStandardMaterial({ color: 0x4a7c3a })
    );
    stem.position.y = isSuper ? 0.7 : 0.45;
    mesh.add(stem);

    // Extra glow ring for Super Garlic so it stands out
    if (isSuper) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.7, 0.06, 8, 16),
        new THREE.MeshStandardMaterial({
          color: 0xffee88,
          emissive: 0xffcc00,
          emissiveIntensity: 0.6,
          transparent: true,
          opacity: 0.7
        })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.1;
      mesh.add(ring);
    }

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

      const baseY = g.isSuper ? 0.7 : 0.4;
      g.mesh.position.y = baseY + Math.sin(Date.now() * 0.004 + i) * 0.18;
      g.mesh.rotation.y += g.isSuper ? 0.05 : 0.02;

      const dist = playerPos.distanceTo(g.mesh.position);
      if (dist < (g.isSuper ? 1.8 : 1.35)) {
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
