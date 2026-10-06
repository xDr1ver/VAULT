/**
 * VAULT: The Haptic Heist — Dial Controller & Canvas Engine (v2.0)
 * High-DPI Canvas 2D, Inertia Physics, Enhanced Industrial Visuals
 */

class SafeDial {
  constructor(canvasEl, options = {}) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');

    // Настройки лимба
    this.TOTAL_DIVISIONS = 100;
    this.DEG_PER_DIV = 360 / this.TOTAL_DIVISIONS; // 3.6°
    this.HOLD_REQUIRED_MS = 400; // 400ms удержание для срабатывания сувальды
    this.TOLERANCE_DIVISIONS = 1.4; // Допустимая погрешность (±1.4 деления)

    // Состояние вращения
    this.currentAngle = 0; // в градусах
    this.angularVelocity = 0; // скорость инерции
    this.friction = 0.93; // трение свободного хода
    this.isDragging = false;
    this.activePointerId = null;
    this.lastPointerAngle = 0;
    this.lastDivision = -1;

    // Направление движения (1: CW, -1: CCW, 0: idle)
    this.currentDirection = 0;

    // Состояние штифта
    this.targetPin = null;
    this.requiredDirection = 'CW';
    this.holdStartTime = null;
    this.isLocked = false;

    // DOM-элементы отклика
    this.needleEl = document.getElementById('needle');
    this.progressBarEl = document.getElementById('holdRingFill');
    this.CIRCUMFERENCE = 2 * Math.PI * 41; // 257.6

    // Колбэки
    this.onTick = options.onTick || null;
    this.onSweetSpotTick = options.onSweetSpotTick || null;
    this.onPinSolved = options.onPinSolved || null;
    this.onAngleChanged = options.onAngleChanged || null;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Слушатели Pointer Events
    this.canvas.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    window.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    window.addEventListener('pointerup', (e) => this.handlePointerUp(e));
    window.addEventListener('pointercancel', (e) => this.handlePointerUp(e));

    // Анимационный луп
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);
    this.draw();
  }

  setTarget(pinNumber, direction = 'CW') {
    this.targetPin = pinNumber % this.TOTAL_DIVISIONS;
    this.requiredDirection = direction;
    this.holdStartTime = null;
    this.resetHoldRing();
  }

  getNormalizedValue() {
    const norm = ((-this.currentAngle % 360) + 360) % 360;
    return Math.round(norm / this.DEG_PER_DIV) % this.TOTAL_DIVISIONS;
  }

  getDistanceToTarget() {
    if (this.targetPin === null) return 999;
    const cur = this.getNormalizedValue();
    const diff = Math.abs(cur - this.targetPin);
    return Math.min(diff, this.TOTAL_DIVISIONS - diff);
  }

  resetHoldRing() {
    if (this.progressBarEl) {
      this.progressBarEl.style.strokeDashoffset = this.CIRCUMFERENCE;
      this.progressBarEl.style.stroke = 'var(--accent-amber)';
    }
    if (this.needleEl) {
      this.needleEl.classList.remove('in-sweet-spot');
    }
  }

  getPointerAngle(e) {
    const rect = this.canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
  }

  handlePointerDown(e) {
    if (this.isLocked) return;
    window.AudioEngine?.init();

    this.isDragging = true;
    this.activePointerId = e.pointerId;
    this.canvas.setPointerCapture(e.pointerId);
    this.lastPointerAngle = this.getPointerAngle(e);
    this.angularVelocity = 0;
  }

  handlePointerMove(e) {
    if (!this.isDragging || e.pointerId !== this.activePointerId || this.isLocked) return;

    const angle = this.getPointerAngle(e);
    let delta = angle - this.lastPointerAngle;

    // Нормализация прыжка через -180 / +180
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    this.angularVelocity = delta;
    this.currentAngle += delta;
    this.lastPointerAngle = angle;

    // Направление вращения
    if (delta > 0.05) {
      this.currentDirection = 1; // CW
    } else if (delta < -0.05) {
      this.currentDirection = -1; // CCW
    }

    this.processTickCheck();
  }

  handlePointerUp(e) {
    if (e && e.pointerId !== this.activePointerId) return;
    this.isDragging = false;
    this.activePointerId = null;
    this.holdStartTime = null;
    this.resetHoldRing();
  }

  processTickCheck() {
    const curVal = this.getNormalizedValue();
    if (curVal !== this.lastDivision) {
      this.lastDivision = curVal;

      if (this.onAngleChanged) {
        this.onAngleChanged(curVal, this.currentDirection);
      }

      const dist = this.getDistanceToTarget();
      const isCorrectDir = (this.requiredDirection === 'CW' && this.currentDirection >= 0) ||
                           (this.requiredDirection === 'CCW' && this.currentDirection <= 0);

      if (dist <= this.TOLERANCE_DIVISIONS && isCorrectDir) {
        this.needleEl?.classList.add('in-sweet-spot');
        if (this.onSweetSpotTick) this.onSweetSpotTick(curVal);
      } else {
        this.needleEl?.classList.remove('in-sweet-spot');
        if (this.onTick) this.onTick(curVal);
      }
    }
  }

  updateHoldProgress() {
    if (this.isLocked || this.targetPin === null) return;

    const dist = this.getDistanceToTarget();
    const isCorrectDir = (this.requiredDirection === 'CW' && this.currentDirection >= 0) ||
                         (this.requiredDirection === 'CCW' && this.currentDirection <= 0);

    if (dist <= this.TOLERANCE_DIVISIONS && Math.abs(this.angularVelocity) < 1.4 && isCorrectDir) {
      if (!this.holdStartTime) {
        this.holdStartTime = performance.now();
      }

      const elapsed = performance.now() - this.holdStartTime;
      const progress = Math.min(elapsed / this.HOLD_REQUIRED_MS, 1.0);

      if (this.progressBarEl) {
        const offset = this.CIRCUMFERENCE * (1 - progress);
        this.progressBarEl.style.strokeDashoffset = offset;
      }

      if (progress >= 1.0) {
        this.holdStartTime = null;
        if (this.onPinSolved) {
          this.onPinSolved(this.targetPin);
        }
      }
    } else {
      if (this.holdStartTime !== null) {
        this.holdStartTime = null;
        this.resetHoldRing();
      }
    }
  }

  animate() {
    if (!this.isDragging && Math.abs(this.angularVelocity) > 0.05 && !this.isLocked) {
      this.currentAngle += this.angularVelocity;
      this.angularVelocity *= this.friction;
      this.processTickCheck();
    } else if (!this.isDragging) {
      this.angularVelocity = 0;
    }

    this.updateHoldProgress();
    this.draw();
    requestAnimationFrame(this.animate);
  }

  draw() {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = w * 0.46;

    this.ctx.clearRect(0, 0, w, h);

    // 1. Внешний корпус сейфа
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = '#0E1217';
    this.ctx.fill();
    this.ctx.lineWidth = 3.5;
    this.ctx.strokeStyle = '#2B3747';
    this.ctx.stroke();

    // Градиентная фаска обода
    const rimGrad = this.ctx.createRadialGradient(cx, cy, radius * 0.74, cx, cy, radius);
    rimGrad.addColorStop(0, '#18212D');
    rimGrad.addColorStop(0.7, '#10151C');
    rimGrad.addColorStop(1, '#06080B');
    this.ctx.fillStyle = rimGrad;
    this.ctx.fill();

    // 2. Вращающийся лимб
    this.ctx.translate(cx, cy);
    this.ctx.rotate((this.currentAngle * Math.PI) / 180);

    // Лицевая поверхность диска (Текстура матированной оружейной стали)
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius * 0.94, 0, Math.PI * 2);
    const faceGrad = this.ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.94);
    faceGrad.addColorStop(0, '#161E28');
    faceGrad.addColorStop(0.65, '#0E131A');
    faceGrad.addColorStop(1, '#080A0E');
    this.ctx.fillStyle = faceGrad;
    this.ctx.fill();
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeStyle = '#232D3B';
    this.ctx.stroke();

    // Внутренняя канавка
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius * 0.65, 0, Math.PI * 2);
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    this.ctx.stroke();

    // 3. Насечки и цифры
    for (let i = 0; i < this.TOTAL_DIVISIONS; i++) {
      const rad = (i * this.DEG_PER_DIV * Math.PI) / 180;
      const isMajor = i % 10 === 0;
      const isMid = i % 5 === 0 && !isMajor;

      const tickLen = isMajor ? 19 : (isMid ? 13 : 8);
      const outerR = radius * 0.94 - 4;
      const innerR = outerR - tickLen;

      const x1 = Math.cos(rad) * outerR;
      const y1 = Math.sin(rad) * outerR;
      const x2 = Math.cos(rad) * innerR;
      const y2 = Math.sin(rad) * innerR;

      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.lineWidth = isMajor ? 2.4 : (isMid ? 1.6 : 1.1);
      this.ctx.strokeStyle = isMajor ? '#E2E8F0' : (isMid ? '#64748B' : '#2D3748');
      this.ctx.stroke();

      // Оцифровка
      if (isMajor) {
        const textR = innerR - 14;
        const tx = Math.cos(rad) * textR;
        const ty = Math.sin(rad) * textR;

        this.ctx.save();
        this.ctx.translate(tx, ty);
        this.ctx.rotate(rad + Math.PI / 2);
        this.ctx.fillStyle = '#94A3B8';
        this.ctx.font = '700 11px "JetBrains Mono", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(i.toString().padStart(2, '0'), 0, 0);
        this.ctx.restore();
      }
    }

    this.ctx.restore();
  }
}

window.SafeDial = SafeDial;
