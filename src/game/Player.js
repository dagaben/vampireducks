import * as THREE from 'three';
import { PLAYER_SPEED, JUMP_FORCE, GRAVITY, PLAYER_RADIUS, PLAYER_HEIGHT } from '../utils/constants.js';

/**
 * Cute chibi CatDog player controller (15% bigger).
 */
export class Player {
  constructor(scene) {
    this.scene = scene;

    this.group = new THREE.Group();

    // Scale factor for 15% bigger
    const s = 1.15;

    // Body
    const bodyGeo = new THREE.CapsuleGeometry(0.55 * s, 0.5 * s, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffb366 });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.castShadow = true;
    this.group.add(this.body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.48 * s, 12, 10);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc88 });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.y = 0.95 * s;
    this.head.castShadow = true;
    this.group.add(this.head);

    // Ears (cat-like)
    const earGeo = new THREE.ConeGeometry(0.18 * s, 0.35 * s, 6);
    const earMat = new THREE.MeshStandardMaterial({ color: 0xffaa55 });
    const earL = new THREE.Mesh(earGeo, earMat);
    earL.position.set(-0.28 * s, 1.35 * s, 0);
    earL.rotation.z = 0.3;
    this.group.add(earL);
    const earR = earL.clone();
    earR.position.x = 0.28 * s;
    earR.rotation.z = -0.3;
    this.group.add(earR);

    // Snout / dog nose
    const noseGeo = new THREE.SphereGeometry(0.15 * s, 8, 6);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x442211 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, 0.9 * s, 0.42 * s);
    this.group.add(nose);

    this.group.position.set(0, PLAYER_HEIGHT / 2, 0);
    scene.add(this.group);

    this.velocity = new THREE.Vector3();
    this.onGround = true;
    this.radius = PLAYER_RADIUS;
    this.facing = new THREE.Vector3(0, 0, 1);

    // Visual feedback for invulnerability
    this.invulnTimer = 0;
  }

  get position() {
    return this.group.position;
  }

  setInvulnerable(duration) {
    this.invulnTimer = duration;
  }

  get isInvulnerable() {
    return this.invulnTimer > 0;
  }

  update(delta, input, world) {
    if (this.invulnTimer > 0) {
      this.invulnTimer -= delta;
      // Blink effect while invulnerable
      this.group.visible = Math.floor(this.invulnTimer * 10) % 2 === 0;
    } else {
      this.group.visible = true;
    }

    const move = input.getMovementVector();

    this.velocity.x = move.x * PLAYER_SPEED;
    this.velocity.z = move.z * PLAYER_SPEED;

    if (input.consumeJump() && this.onGround) {
      this.velocity.y = JUMP_FORCE;
      this.onGround = false;
    }

    this.velocity.y -= GRAVITY * delta;

    const nextPos = this.group.position.clone();

    // Axis-separated movement
    nextPos.x += this.velocity.x * delta;
    if (world) world.resolveCollisions(nextPos, this.radius);

    nextPos.z += this.velocity.z * delta;
    if (world) world.resolveCollisions(nextPos, this.radius);

    nextPos.y += this.velocity.y * delta;

    if (nextPos.y <= PLAYER_HEIGHT / 2) {
      nextPos.y = PLAYER_HEIGHT / 2;
      this.velocity.y = 0;
      this.onGround = true;
    }

    this.group.position.copy(nextPos);

    if (move.x !== 0 || move.z !== 0) {
      this.facing.set(move.x, 0, move.z).normalize();
      this.group.rotation.y = Math.atan2(move.x, move.z);
    }
  }

  bounce() {
    this.velocity.y = JUMP_FORCE * 0.75;
    this.onGround = false;
  }
}
