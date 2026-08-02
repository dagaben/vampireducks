/**
 * Handles both desktop keyboard and mobile virtual joystick + jump + pinch zoom.
 */
export class Input {
  constructor() {
    this.keys = {
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false,
      KeyJ: false
    };

    this.joystick = { x: 0, y: 0, active: false };
    this.jumpPressed = false;
    this.jumpJustPressed = false;

    // Pinch zoom state
    this.pinchZoomDelta = 0;
    this._pinchStartDist = 0;
    this._pinching = false;

    // Keyboard
    window.addEventListener('keydown', (e) => {
      if (this.keys.hasOwnProperty(e.code)) {
        this.keys[e.code] = true;
        if (e.code === 'KeyJ') {
          this.jumpJustPressed = true;
          this.jumpPressed = true;
        }
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.keys.hasOwnProperty(e.code)) {
        this.keys[e.code] = false;
        if (e.code === 'KeyJ') this.jumpPressed = false;
      }
    });

    this._setupJoystick();
    this._setupJumpButton();
    this._setupPinchZoom();
  }

  _setupJoystick() {
    const zone = document.getElementById('joystick-zone');
    if (!zone) return;

    let startX = 0, startY = 0;
    const maxDist = 55;

    const onStart = (e) => {
      if (e.touches && e.touches.length > 1) return;
      const t = e.touches ? e.touches[0] : e;
      startX = t.clientX;
      startY = t.clientY;
      this.joystick.active = true;
      e.preventDefault();
    };

    const onMove = (e) => {
      if (!this.joystick.active) return;
      if (e.touches && e.touches.length > 1) return;
      const t = e.touches ? e.touches[0] : e;
      let dx = t.clientX - startX;
      let dy = t.clientY - startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxDist) {
        dx = (dx / dist) * maxDist;
        dy = (dy / dist) * maxDist;
      }
      this.joystick.x = dx / maxDist;
      this.joystick.y = dy / maxDist;
      e.preventDefault();
    };

    const onEnd = (e) => {
      if (e.touches && e.touches.length > 0) return;
      this.joystick.x = 0;
      this.joystick.y = 0;
      this.joystick.active = false;
    };

    zone.addEventListener('touchstart', onStart, { passive: false });
    zone.addEventListener('touchmove', onMove, { passive: false });
    zone.addEventListener('touchend', onEnd);
    zone.addEventListener('touchcancel', onEnd);

    zone.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
  }

  _setupJumpButton() {
    const btn = document.getElementById('jump-button');
    if (!btn) return;

    const press = (e) => {
      this.jumpJustPressed = true;
      this.jumpPressed = true;
      e.preventDefault();
    };
    const release = () => {
      this.jumpPressed = false;
    };

    btn.addEventListener('touchstart', press, { passive: false });
    btn.addEventListener('touchend', release);
    btn.addEventListener('mousedown', press);
    btn.addEventListener('mouseup', release);
  }

  _setupPinchZoom() {
    const getDistance = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        this._pinching = true;
        this._pinchStartDist = getDistance(e.touches);
        this.joystick.active = false;
        this.joystick.x = 0;
        this.joystick.y = 0;
        e.preventDefault();
      }
    };

    const onTouchMove = (e) => {
      if (!this._pinching || e.touches.length !== 2) return;
      const dist = getDistance(e.touches);
      const delta = dist - this._pinchStartDist;
      this.pinchZoomDelta += delta;
      this._pinchStartDist = dist;
      e.preventDefault();
    };

    const onTouchEnd = (e) => {
      if (e.touches.length < 2) {
        this._pinching = false;
        this._pinchStartDist = 0;
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);
  }

  consumePinchZoomDelta() {
    const d = this.pinchZoomDelta;
    this.pinchZoomDelta = 0;
    return d;
  }

  getMovementVector() {
    let x = 0;
    let z = 0;

    if (this.keys.ArrowUp) z -= 1;
    if (this.keys.ArrowDown) z += 1;
    if (this.keys.ArrowLeft) x -= 1;
    if (this.keys.ArrowRight) x += 1;

    if (this.joystick.active) {
      x += this.joystick.x;
      z += this.joystick.y;
    }

    const len = Math.sqrt(x * x + z * z);
    if (len > 1) {
      x /= len;
      z /= len;
    }
    return { x, z };
  }

  consumeJump() {
    if (this.jumpJustPressed) {
      this.jumpJustPressed = false;
      return true;
    }
    return false;
  }
}
