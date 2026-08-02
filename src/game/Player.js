import * as THREE from 'three';
import { PLAYER_SPEED, JUMP_FORCE, GRAVITY, PLAYER_RADIUS, PLAYER_HEIGHT } from '../utils/constants.js';

/**
 * Cute chibi CatDog player controller.
 * Uses a simple capsule-like representation (we'll improve visuals later).
 */
export class Player {
  constructor(scene) {
    this.scene = scene;

    // Visual – simple cute chibi body (box + spheres for now)
    this.group = new THREE.Group();

    // Body
    const bodyGeo = new THREE.CapsuleGeometry(0.55, 0.5, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffb366 }); // warm orange-ish
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.castShadow = true;
    this.group.add(this.body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.48, 12, 10);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc88 });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.y = 0.95;
    this.head.castShadow = true;
    this.group.add(this.head);

    // Ears (cat-like)
    const earGeo = new THREE.ConeGeometry(0.18, 0.35, 6);
    const earMat = new THREE.MeshStandardMaterial({ color: 0xffaa55 });
    const earL = new THREE.Mesh(earGeo, earMat);
    earL.position.set(-0.28, 1.35, 0);
    earL.rotation.z = 0.3;
    this.group.add(earL);
    const earR = earL.clone();
    earR.position.x = 0.28;
    earR.rotation.z = -0.3;
    this.group.add(earR);

    // Simple snout / dog nose
    const noseGeo = new THREE.SphereGeometry(0.15, 8, 6);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x442211 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, 0.9, 0.42);
    this.group.add(nose);

    this.group.position.y = PLAYER_HEIGHT / 2;
    scene.add(this.group);

    // Physics state
    this.velocity = new THREE.Vector3();
    this.onGround = true;
    this.radius = PLAYER_RADIUS;

    // Facing direction for future animations
    this.facing = new THREE.Vector3(0, 0, 1);
  }

  get position() {
    return this.group.position;
  }

  update(delta, input, world) {
    const move = input.getMovementVector();

    // Horizontal movement
    this.velocity.x = move.x * PLAYER_SPEED;
    this.velocity.z = move.z * PLAYER_SPEED;

    // Jump
    if (input.consumeJump() && this.onGround) {
      this.velocity.y = JUMP_FORCE;
      this.onGround = false;
    }

    // Gravity
    this.velocity.y -= GRAVITY * delta;

    // Apply velocity
    const nextPos = this.group.position.clone();
    nextPos.x += this.velocity.x * delta;
    nextPos.z += this.velocity.z * delta;
    nextPos.y += this.velocity.y * delta;

    // Simple ground collision
    if (nextPos.y <= PLAYER_HEIGHT / 2) {
      nextPos.y = PLAYER_HEIGHT / 2;
      this.velocity.y = 0;
      this.onGround = true;
    }

    // World collision (trees, rocks) – very simple sphere vs objects
    if (world) {
      const blocked = world.resolveCollisions(nextPos, this.radius);
      if (blocked) {
        // keep previous x/z if blocked, still allow y
        nextPos.x = this.group.position.x;
        nextPos.z = this.group.position.z;
      }
    }

    this.group.position.copy(nextPos);

    // Rotate to face movement direction
    if (move.x !== 0 || move.z !== 0) {
      this.facing.set(move.x, 0, move.z).normalize();
      const angle = Math.atan2(move.x, move.z);
      this.group.rotation.y = angle;
    }
  }

  // Called when jumping on a duck
  bounce() {
    this.velocity.y = JUMP_FORCE * 0.75;
    this.onGround = false;
  }
}
