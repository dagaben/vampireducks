import * as THREE from 'three';
import { DUCK_SPEED_BASE, PETRIFY_DURATION } from '../utils/constants.js';
import { distance2D } from '../utils/helpers.js';

/**
 * Rubber Vampire Duck – funny waddling enemy.
 */
export class Duck {
  constructor(scene, x, z) {
    this.scene = scene;
    this.state = 'alive'; // alive | petrified | dead
    this.petrifyTimer = 0;

    this.group = new THREE.Group();

    // Body – classic rubber duck yellow
    const bodyGeo = new THREE.SphereGeometry(0.55, 12, 10);
    bodyGeo.scale(1, 0.85, 1.15);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffdd44 });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.castShadow = true;
    this.group.add(this.body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.38, 10, 8);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, 0.45, 0.45);
    this.group.add(head);

    // Beak
    const beakGeo = new THREE.ConeGeometry(0.18, 0.35, 6);
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xff8800 });
    const beak = new THREE.Mesh(beakGeo, beakMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.4, 0.75);
    this.group.add(beak);

    // Vampire cape (simple)
    const capeGeo = new THREE.PlaneGeometry(0.9, 0.7);
    const capeMat = new THREE.MeshStandardMaterial({
      color: 0x220022,
      side: THREE.DoubleSide
    });
    const cape = new THREE.Mesh(capeGeo, capeMat);
    cape.position.set(0, 0.2, -0.35);
    cape.rotation.x = 0.3;
    this.group.add(cape);

    // Eyes (red glow-ish)
    const eyeGeo = new THREE.SphereGeometry(0.08, 6, 6);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0x880000 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.15, 0.55, 0.7);
    this.group.add(eyeL);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.15;
    this.group.add(eyeR);

    this.group.position.set(x, 0.55, z);
    scene.add(this.group);

    this.speed = DUCK_SPEED_BASE;
    this.velocity = new THREE.Vector3();
  }

  get position() {
    return this.group.position;
  }

  update(delta, playerPos, isNight) {
    if (this.state === 'petrified') {
      this.petrifyTimer -= delta;
      if (this.petrifyTimer <= 0) {
        this.state = 'dead';
        this.scene.remove(this.group);
      }
      return;
    }

    if (this.state !== 'alive') return;

    // Simple chase
    const dx = playerPos.x - this.group.position.x;
    const dz = playerPos.z - this.group.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 0.1) {
      const speed = this.speed * (isNight ? 1.25 : 1.0);
      this.velocity.x = (dx / dist) * speed;
      this.velocity.z = (dz / dist) * speed;

      this.group.position.x += this.velocity.x * delta;
      this.group.position.z += this.velocity.z * delta;

      // Face player
      this.group.rotation.y = Math.atan2(dx, dz);

      // Funny waddle bob
      this.group.position.y = 0.55 + Math.sin(Date.now() * 0.012) * 0.08;
    }
  }

  petrify() {
    if (this.state !== 'alive') return false;
    this.state = 'petrified';
    this.petrifyTimer = PETRIFY_DURATION;

    // Turn gray / stone look
    this.group.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.material.color.setHex(0x888888);
        child.material.emissive?.setHex(0x000000);
      }
    });
    return true;
  }

  // Simple collision radius
  get radius() {
    return 0.7;
  }
}

export class DuckManager {
  constructor(scene) {
    this.scene = scene;
    this.ducks = [];
    this.spawnTimer = 0;
  }

  spawn(x, z) {
    const duck = new Duck(this.scene, x, z);
    this.ducks.push(duck);
  }

  update(delta, player, isNight, onPetrify, onHit) {
    // Update existing
    for (let i = this.ducks.length - 1; i >= 0; i--) {
      const d = this.ducks[i];
      d.update(delta, player.position, isNight);

      if (d.state === 'dead') {
        this.ducks.splice(i, 1);
        continue;
      }

      // Collision with player
      if (d.state === 'alive') {
        const dist = distance2D(
          d.position.x, d.position.z,
          player.position.x, player.position.z
        );
        if (dist < d.radius + player.radius) {
          // Check if player is jumping on it (higher y and falling)
          if (player.position.y > 1.2 && player.velocity.y < 0) {
            // Bounce + maybe small reward later
            player.bounce();
          } else {
            // Contact – let Game decide based on garlic
            onHit(d);
          }
        }
      }
    }
  }

  clear() {
    this.ducks.forEach(d => this.scene.remove(d.group));
    this.ducks = [];
  }
}
