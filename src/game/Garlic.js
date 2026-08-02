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

  /**
   * @param {number} x
   * @param {number} z
   * @param {boolean} isSuper
   * @param {number} groundY  terrain height at this position
   */
  spawn(x, z, isSuper = false, groundY = 0) {
    const mesh = new THREE.Mesh(
      isSuper ? this.superGeo : this.geo,
      isSuper ? this.superMat : this.mat
    );

    const baseHeight = isSuper ? 0.7 : 0.45;
    mesh.position.set(x, groundY + baseHeight, z);
    mesh.castShadow = true;

    // Remember the ground-relative height for the float animation
    mesh.userData.baseHeight = groundY + baseHeight;

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, isSuper ? 0.4 : 0.25),
      new THREE.MeshStandardMaterial({ color: 0x4a7c3a })
    );
    stem.position.y = isSuper ? 0.55 : 0.35;
    mesh.add(stem);

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
      ring.position.y = 0.05;
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

      // Float animation relative to its own base height
      const base = g.mesh.userData.baseHeight || 0.45;
      g.mesh.position.y = base + Math.sin(Date.now() * 0.004 + i) * 0.18;
      g.mesh.rotation.y += g.isSuper ? 0.05 : 0.02;

      // IMPORTANT: use horizontal (2D) distance only
      // so hills / different Y never break collection
      const dx = playerPos.x - g.mesh.position.x;
      const dz = playerPos.z - g.mesh.position.z;
      const dist2D = Math.sqrt(dx * dx + dz * dz);

      const collectRadius = g.isSuper ? 2.0 : 1.6;

      if (dist2D < collectRadius) {
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
