/**
 * Handles both desktop keyboard and mobile virtual joystick + jump.
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

    // Mobile joystick
    this._setupJoystick();
    this._setupJumpButton();
  }

  _setupJoystick() {
    const zone = document.getElementById('joystick-zone');
    if (!zone) return;

    let startX = 0, startY = 0;
    const maxDist = 55;

    const onStart = (e) => {
      const t = e.touches ? e.touches[0] : e;
      const rect = zone.getBoundingClientRect();
      startX = t.clientX;
      startY = t.clientY;
      this.joystick.active = true;
      e.preventDefault();
    };

    const onMove = (e) => {
      if (!this.joystick.active) return;
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

    const onEnd = () => {
      this.joystick.x = 0;
      this.joystick.y = 0;
      this.joystick.active = false;
    };

    zone.addEventListener('touchstart', onStart, { passive: false });
    zone.addEventListener('touchmove', onMove, { passive: false });
    zone.addEventListener('touchend', onEnd);
    zone.addEventListener('touchcancel', onEnd);

    // Also support mouse for testing
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

  getMovementVector() {
    let x = 0;
    let z = 0;

    // Keyboard
    if (this.keys.ArrowUp) z -= 1;
    if (this.keys.ArrowDown) z += 1;
    if (this.keys.ArrowLeft) x -= 1;
    if (this.keys.ArrowRight) x += 1;

    // Joystick (y is inverted for screen coords)
    if (this.joystick.active) {
      x += this.joystick.x;
      z += this.joystick.y;
    }

    // Normalize
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
