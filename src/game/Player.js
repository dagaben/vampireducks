import * as THREE from 'three';
import { PLAYER_SPEED, JUMP_FORCE, GRAVITY, PLAYER_RADIUS, PLAYER_HEIGHT } from '../utils/constants.js';

/**
 * Detailed cute chibi CatDog — follows gentle terrain height.
 * Air control + momentum so jumping no longer cancels forward movement.
 */
export class Player {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    const s = 1.15;

    const bodyGeo = new THREE.CapsuleGeometry(0.52 * s, 0.55 * s, 6, 10);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffb366 });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.castShadow = true;
    this.group.add(this.body);

    const headGeo = new THREE.SphereGeometry(0.5 * s, 14, 12);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc88 });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.y = 1.0 * s;
    this.head.castShadow = true;
    this.group.add(this.head);

    const earGeo = new THREE.ConeGeometry(0.2 * s, 0.4 * s, 6);
    const earMat = new THREE.MeshStandardMaterial({ color: 0xffaa55 });
    const earL = new THREE.Mesh(earGeo, earMat);
    earL.position.set(-0.3 * s, 1.42 * s, 0);
    earL.rotation.z = 0.35;
    this.group.add(earL);
    const earR = earL.clone();
    earR.position.x = 0.3 * s;
    earR.rotation.z = -0.35;
    this.group.add(earR);

    const innerEarGeo = new THREE.ConeGeometry(0.1 * s, 0.22 * s, 5);
    const innerEarMat = new THREE.MeshStandardMaterial({ color: 0xffaaaa });
    const innerL = new THREE.Mesh(innerEarGeo, innerEarMat);
    innerL.position.set(-0.3 * s, 1.4 * s, 0.02);
    innerL.rotation.z = 0.35;
    this.group.add(innerL);
    const innerR = innerL.clone();
    innerR.position.x = 0.3 * s;
    innerR.rotation.z = -0.35;
    this.group.add(innerR);

    const eyeWhiteGeo = new THREE.SphereGeometry(0.13 * s, 8, 6);
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const eyeL = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
    eyeL.position.set(-0.18 * s, 1.08 * s, 0.4 * s);
    this.group.add(eyeL);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.18 * s;
    this.group.add(eyeR);

    const pupilGeo = new THREE.SphereGeometry(0.07 * s, 6, 5);
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const pupilL = new THREE.Mesh(pupilGeo, pupilMat);
    pupilL.position.set(-0.18 * s, 1.08 * s, 0.5 * s);
    this.group.add(pupilL);
    const pupilR = pupilL.clone();
    pupilR.position.x = 0.18 * s;
    this.group.add(pupilR);

    const noseGeo = new THREE.SphereGeometry(0.12 * s, 8, 6);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x3a2211 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, 0.95 * s, 0.48 * s);
    this.group.add(nose);

    const mouthGeo = new THREE.TorusGeometry(0.1 * s, 0.025 * s, 6, 10, Math.PI);
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x552211 });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, 0.82 * s, 0.45 * s);
    mouth.rotation.x = Math.PI;
    this.group.add(mouth);

    const pawGeo = new THREE.SphereGeometry(0.18 * s, 8, 6);
    const pawMat = new THREE.MeshStandardMaterial({ color: 0xffaa66 });
    const pawFL = new THREE.Mesh(pawGeo, pawMat);
    pawFL.position.set(-0.35 * s, -0.55 * s, 0.25 * s);
    pawFL.scale.set(1, 0.7, 1.2);
    this.group.add(pawFL);
    const pawFR = pawFL.clone();
    pawFR.position.x = 0.35 * s;
    this.group.add(pawFR);

    const pawBL = pawFL.clone();
    pawBL.position.set(-0.3 * s, -0.55 * s, -0.3 * s);
    this.group.add(pawBL);
    const pawBR = pawFL.clone();
    pawBR.position.set(0.3 * s, -0.55 * s, -0.3 * s);
    this.group.add(pawBR);

    const tailGeo = new THREE.CapsuleGeometry(0.08 * s, 0.5 * s, 4, 6);
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xffb366 });
    const tail = new THREE.Mesh(tailGeo, tailMat);
    tail.position.set(0, 0.1 * s, -0.55 * s);
    tail.rotation.x = 0.6;
    this.group.add(tail);

    this.group.position.set(0, PLAYER_HEIGHT / 2, 0);
    scene.add(this.group);

    this.velocity = new THREE.Vector3();
    this.onGround = true;
    this.radius = PLAYER_RADIUS;
    this.facing = new THREE.Vector3(0, 0, 1);
    this.invulnTimer = 0;

    // Remember last horizontal input so we keep moving while airborne
    this._lastMoveX = 0;
    this._lastMoveZ = 0;
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
      this.group.visible = Math.floor(this.invulnTimer * 10) % 2 === 0;
    } else {
      this.group.visible = true;
    }

    const move = input.getMovementVector();
    const hasInput = move.x !== 0 || move.z !== 0;

    if (hasInput) {
      // Full control on ground and in air
      this.velocity.x = move.x * PLAYER_SPEED;
      this.velocity.z = move.z * PLAYER_SPEED;
      this._lastMoveX = move.x;
      this._lastMoveZ = move.z;
    } else if (this.onGround) {
      // Stop when grounded and no input
      this.velocity.x = 0;
      this.velocity.z = 0;
      this._lastMoveX = 0;
      this._lastMoveZ = 0;
    } else {
      // Airborne with no input → keep previous horizontal momentum
      this.velocity.x = this._lastMoveX * PLAYER_SPEED;
      this.velocity.z = this._lastMoveZ * PLAYER_SPEED;
    }

    if (input.consumeJump() && this.onGround) {
      this.velocity.y = JUMP_FORCE;
      this.onGround = false;
      // Ensure we carry the direction we had at the moment of the jump
      if (hasInput) {
        this._lastMoveX = move.x;
        this._lastMoveZ = move.z;
      }
    }

    this.velocity.y -= GRAVITY * delta;

    const nextPos = this.group.position.clone();

    // Horizontal movement (always applied, including mid-air)
    nextPos.x += this.velocity.x * delta;
    if (world) world.resolveCollisions(nextPos, this.radius);

    nextPos.z += this.velocity.z * delta;
    if (world) world.resolveCollisions(nextPos, this.radius);

    // Terrain height under feet
    const terrainY = world ? world.getHeightAt(nextPos.x, nextPos.z) : 0;
    const groundY = terrainY + PLAYER_HEIGHT / 2;

    nextPos.y += this.velocity.y * delta;

    // Stick to ground when walking / landing
    if (nextPos.y <= groundY + 0.08) {
      nextPos.y = groundY;
      this.velocity.y = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    this.group.position.copy(nextPos);

    // Face the direction of movement (use last move when airborne with no input)
    const faceX = hasInput ? move.x : this._lastMoveX;
    const faceZ = hasInput ? move.z : this._lastMoveZ;
    if (faceX !== 0 || faceZ !== 0) {
      this.facing.set(faceX, 0, faceZ).normalize();
      this.group.rotation.y = Math.atan2(faceX, faceZ);
    }
  }

  bounce() {
    this.velocity.y = JUMP_FORCE * 0.75;
    this.onGround = false;
  }
}
