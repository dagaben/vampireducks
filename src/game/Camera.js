import * as THREE from 'three';

/**
 * Smooth isometric-style follow camera with pinch-to-zoom support.
 */
export class CameraController {
  constructor(camera, target) {
    this.camera = camera;
    this.target = target;

    // Ideal offset for nice isometric feel (base distance)
    this.baseOffset = new THREE.Vector3(18, 22, 18);
    this.offset = this.baseOffset.clone();
    this.lookOffset = new THREE.Vector3(0, 1, 0);

    this.smoothness = 4.5;

    // Zoom (1 = default, smaller = closer, larger = farther)
    this.zoom = 1.0;
    this.minZoom = 0.55;
    this.maxZoom = 1.85;
    this._targetZoom = 1.0;
  }

  /** Apply a multiplicative zoom delta (e.g. from pinch). Positive = zoom in. */
  applyZoomDelta(delta) {
    // delta > 0 → zoom in (smaller offset)
    this._targetZoom = THREE.MathUtils.clamp(
      this._targetZoom - delta * 0.012,
      this.minZoom,
      this.maxZoom
    );
  }

  setZoom(value) {
    this._targetZoom = THREE.MathUtils.clamp(value, this.minZoom, this.maxZoom);
  }

  update(delta) {
    if (!this.target) return;

    // Smooth zoom
    this.zoom += (this._targetZoom - this.zoom) * Math.min(1, 8 * delta);
    this.offset.copy(this.baseOffset).multiplyScalar(this.zoom);

    const desired = this.target.position.clone().add(this.offset);
    this.camera.position.lerp(desired, 1 - Math.exp(-this.smoothness * delta));

    const lookAt = this.target.position.clone().add(this.lookOffset);
    this.camera.lookAt(lookAt);
  }

  setTarget(mesh) {
    this.target = mesh;
  }
}
