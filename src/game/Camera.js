import * as THREE from 'three';

/**
 * Smooth isometric-style follow camera.
 */
export class CameraController {
  constructor(camera, target) {
    this.camera = camera;
    this.target = target;

    // Ideal offset for nice isometric feel
    this.offset = new THREE.Vector3(18, 22, 18);
    this.lookOffset = new THREE.Vector3(0, 1, 0);

    this.smoothness = 4.5;
  }

  update(delta) {
    if (!this.target) return;

    const desired = this.target.position.clone().add(this.offset);
    this.camera.position.lerp(desired, 1 - Math.exp(-this.smoothness * delta));

    const lookAt = this.target.position.clone().add(this.lookOffset);
    this.camera.lookAt(lookAt);
  }

  setTarget(mesh) {
    this.target = mesh;
  }
}
