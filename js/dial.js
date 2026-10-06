/**
 * VAULT: The Haptic Heist — 3D Volumetric Vault Dial & Particle Engine
 * Multi-layer 3D metal shading, mechanical spokes, neon trenches, and spark physics.
 */

class SafeDial {
  constructor(canvasEl, options = {}) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');

    // Настройки лимба
    this.TOTAL_DIVISIONS = 100;
    this.DEG_PER_DIV = 360 / this.TOTAL_DIVISIONS; // 3.6°
    this.HOLD_REQUIRED_MS = 400;
    this.TOLERANCE_DIVISIONS = 1.4;

    // Состояние вращения
    this.currentAngle = 0;
    this.angularVelocity = 0;
    this.friction = 0.93;
    this.isDragging = false;
    this.activePointerId = null;
    this.lastPointerAngle = 0;
    this.lastDivision = -1;
    this.currentDirection = 0;

    // Состояние штифта
    this.targetPin = null;
    this.requiredDirection = 'CW';
    this.holdStartTime = null;
    this.isLocked = false;

    // DOM-элементы
    this.needleEl = document.getElementById('needle');
    this.progressBarEl = document.getElementById('holdRingFill');
    this.CIRCUMFERENCE = 2 * Math.PI * 43; // 270.17

    // Колбэки
    this.onTick = options.onTick || null;
    this.onSweetSpotTick = options.onSweetSpotTick || null;
    this.onPinSolved = options.onPinSolved || null;
    this.onAngleChanged = options.onAngleChanged || null;

    // Система искр (Spark Particles Engine)
    this.sparks = [];

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Pointer Events
    this.canvas.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    window.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    window.addEventListener('pointerup', (e) => this.handlePointerUp(e));
    window.addEventListener('pointercancel', (e) => this.handlePointerUp(e));

    // Render loop
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

    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    this.angularVelocity = delta;
    this.currentAngle += delta;
    this.lastPointerAngle = angle;

    if (delta > 0.05) {
      this.currentDirection = 1; // CW
    } else if (delta < -0.05) {
      this.currentDirection = -1; // CCW
    }

    // Рождение искр при быстром вращении
    if (Math.abs(delta) > 1.8) {
      this.spawnSparks(2);
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

  spawnSparks(count = 2) {
    const rect = this.canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const r = rect.width * 0.44;

    for (let i = 0; i < count; i++) {
      const angle = (this.currentAngle + Math.random() * 360) * (Math.PI / 180);
      this.sparks.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        vx: (Math.random() - 0.5) * 4 + Math.cos(angle) * 2,
        vy: (Math.random() - 0.5) * 4 + Math.sin(angle) * 2,
        life: 1.0,
        decay: 0.03 + Math.random() * 0.04,
        size: 1.5 + Math.random() * 2,
        color: Math.random() > 0.3 ? '#FFAA00' : '#FFDD66'
      });
    }
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
        this.spawnSparks(4);
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

      // Искры в момент удержания
      if (Math.random() > 0.6) this.spawnSparks(1);

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

    // =========================================================================
    // 1. ВНЕШНИЙ БРОНИРОВАННЫЙ КОРПУС СЕЙФА (3D ARMOR CASING)
    // =========================================================================
    this.ctx.save();

    // Глубокая объемная тень
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    this.ctx.shadowBlur = 28;
    this.ctx.shadowOffsetY = 14;
    this.ctx.fillStyle = '#0B0F16';
    this.ctx.fill();
    this.ctx.restore();

    // Металлическая фаска обода (Многоступенчатый 3D скос)
    const rimGrad = this.ctx.createRadialGradient(cx, cy - radius * 0.15, radius * 0.75, cx, cy, radius);
    rimGrad.addColorStop(0, '#2D3848');
    rimGrad.addColorStop(0.35, '#182230');
    rimGrad.addColorStop(0.7, '#0C121B');
    rimGrad.addColorStop(1, '#05080C');
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = rimGrad;
    this.ctx.fill();
    this.ctx.lineWidth = 3.5;
    this.ctx.strokeStyle = '#3E4D63';
    this.ctx.stroke();

    // 12 индустриальных болтов/заклепок по периметру (как на 3D аватаре)
    for (let b = 0; b < 12; b++) {
      const bRad = (b * 30 * Math.PI) / 180;
      const bx = cx + Math.cos(bRad) * (radius - 8);
      const by = cy + Math.sin(bRad) * (radius - 8);

      // Тень болта
      this.ctx.beginPath();
      this.ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
      this.ctx.fillStyle = '#080A0E';
      this.ctx.fill();

      // Шляпка болта со световым бликом
      this.ctx.beginPath();
      this.ctx.arc(bx - 0.5, by - 0.5, 2.5, 0, Math.PI * 2);
      this.ctx.fillStyle = '#4A5B73';
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.arc(bx - 1, by - 1, 1, 0, Math.PI * 2);
      this.ctx.fillStyle = '#8FA0B8';
      this.ctx.fill();
    }

    // =========================================================================
    // 2. НЕОНОВАЯ ЭНЕРГЕТИЧЕСКАЯ КАНАВКА (NEON TRENCH - КАК НА АВАТАРЕ)
    // =========================================================================
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius * 0.90, 0, Math.PI * 2);
    this.ctx.lineWidth = 4;
    this.ctx.strokeStyle = '#080C12';
    this.ctx.stroke();

    // Неоновое свечение канавки
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius * 0.89, 0, Math.PI * 2);
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
    this.ctx.shadowColor = '#F59E0B';
    this.ctx.shadowBlur = 10;
    this.ctx.stroke();
    this.ctx.restore();

    // =========================================================================
    // 3. ВРАЩАЮЩАЯСЯ ЧАСТЬ: ЗУБЧАТОЕ КОЛЬЦО И ДИСК (3D DIAL)
    // =========================================================================
    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.rotate((this.currentAngle * Math.PI) / 180);

    // Механическое зубчатое кольцо (Gear Teeth Ring)
    const gearR = radius * 0.87;
    for (let g = 0; g < 40; g++) {
      const gAngle = (g * 9 * Math.PI) / 180;
      const gx1 = Math.cos(gAngle) * gearR;
      const gy1 = Math.sin(gAngle) * gearR;
      const gx2 = Math.cos(gAngle) * (gearR - 4);
      const gy2 = Math.sin(gAngle) * (gearR - 4);
      this.ctx.beginPath();
      this.ctx.moveTo(gx1, gy1);
      this.ctx.lineTo(gx2, gy2);
      this.ctx.lineWidth = 2;
      this.ctx.strokeStyle = '#1D2736';
      this.ctx.stroke();
    }

    // Лицевая поверхность диска (Анизотропная шлифованная сталь)
    const dialR = radius * 0.85;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, dialR, 0, Math.PI * 2);
    const dialGrad = this.ctx.createRadialGradient(0, -dialR * 0.2, dialR * 0.1, 0, 0, dialR);
    dialGrad.addColorStop(0, '#222D3D');
    dialGrad.addColorStop(0.4, '#151D28');
    dialGrad.addColorStop(0.75, '#0E141E');
    dialGrad.addColorStop(1, '#080B10');
    this.ctx.fillStyle = dialGrad;
    this.ctx.fill();
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = '#2D3B4E';
    this.ctx.stroke();

    // Неоновое кольцо подсветки шкалы (Amber Neon Ring)
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(0, 0, dialR - 10, 0, Math.PI * 2);
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
    this.ctx.shadowColor = '#F59E0B';
    this.ctx.shadowBlur = 8;
    this.ctx.stroke();
    this.ctx.restore();

    // 4 статусные метки изумрудного/янтарного цвета (как на аватаре: 0, 25, 50, 75)
    for (let m = 0; m < 4; m++) {
      const mRad = (m * 90 * Math.PI) / 180;
      const mx = Math.cos(mRad) * (dialR - 10);
      const my = Math.sin(mRad) * (dialR - 10);
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(mx, my, 3, 0, Math.PI * 2);
      this.ctx.fillStyle = m % 2 === 0 ? '#10B981' : '#F59E0B';
      this.ctx.shadowColor = m % 2 === 0 ? '#10B981' : '#F59E0B';
      this.ctx.shadowBlur = 10;
      this.ctx.fill();
      this.ctx.restore();
    }

    // Насечки и оцифровка
    for (let i = 0; i < this.TOTAL_DIVISIONS; i++) {
      const rad = (i * this.DEG_PER_DIV * Math.PI) / 180;
      const isMajor = i % 10 === 0;
      const isMid = i % 5 === 0 && !isMajor;

      const tickLen = isMajor ? 18 : (isMid ? 11 : 6);
      const outerR = dialR - 14;
      const innerR = outerR - tickLen;

      const x1 = Math.cos(rad) * outerR;
      const y1 = Math.sin(rad) * outerR;
      const x2 = Math.cos(rad) * innerR;
      const y2 = Math.sin(rad) * innerR;

      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.lineWidth = isMajor ? 2.5 : (isMid ? 1.5 : 1);
      this.ctx.strokeStyle = isMajor ? '#F59E0B' : (isMid ? '#94A3B8' : '#334155');
      this.ctx.stroke();

      // Оцифровка
      if (isMajor) {
        const textR = innerR - 12;
        const tx = Math.cos(rad) * textR;
        const ty = Math.sin(rad) * textR;

        this.ctx.save();
        this.ctx.translate(tx, ty);
        this.ctx.rotate(rad + Math.PI / 2);
        this.ctx.fillStyle = '#FFAA00';
        this.ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
        this.ctx.shadowBlur = 6;
        this.ctx.font = '800 11.5px "JetBrains Mono", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(i.toString().padStart(2, '0'), 0, 0);
        this.ctx.restore();
      }
    }

    // =========================================================================
    // 4. ТРИ ОБЪЕМНЫЕ МЕХАНИЧЕСКИЕ РУЧКИ-ШПИЛЬКИ (3D TURN HANDLES КАК НА АВАТАРЕ)
    // =========================================================================
    const handleAngles = [0, 120, 240];
    const hubR = dialR * 0.46;

    for (const hAngle of handleAngles) {
      const hRad = (hAngle * Math.PI) / 180;
      const hLength = dialR * 0.68;
      const hx1 = Math.cos(hRad) * hubR;
      const hy1 = Math.sin(hRad) * hubR;
      const hx2 = Math.cos(hRad) * hLength;
      const hy2 = Math.sin(hRad) * hLength;

      // Тень цилиндрической ручки
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.moveTo(hx1, hy1 + 4);
      this.ctx.lineTo(hx2, hy2 + 4);
      this.ctx.lineWidth = 12;
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
      this.ctx.lineCap = 'round';
      this.ctx.stroke();
      this.ctx.restore();

      // Металлическое тело ручки (3D Cylinder Shading)
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.moveTo(hx1, hy1);
      this.ctx.lineTo(hx2, hy2);
      this.ctx.lineWidth = 9;
      this.ctx.lineCap = 'round';
      const handleGrad = this.ctx.createLinearGradient(hx1 - 5, hy1 - 5, hx1 + 5, hy1 + 5);
      handleGrad.addColorStop(0, '#5A6B82');
      handleGrad.addColorStop(0.5, '#A0B1C7');
      handleGrad.addColorStop(1, '#232C3A');
      this.ctx.strokeStyle = handleGrad;
      this.ctx.stroke();

      // Набалдашник ручки (Рукоять)
      this.ctx.beginPath();
      this.ctx.arc(hx2, hy2, 5.5, 0, Math.PI * 2);
      this.ctx.fillStyle = '#1B2430';
      this.ctx.fill();
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeStyle = '#8E9FB5';
      this.ctx.stroke();
      this.ctx.restore();
    }

    this.ctx.restore();

    // =========================================================================
    // 5. ЧАСТИЦЫ ИСКР (SPARK PARTICLES RENDERER)
    // =========================================================================
    for (let s = this.sparks.length - 1; s >= 0; s--) {
      const sp = this.sparks[s];
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.life -= sp.decay;

      if (sp.life <= 0) {
        this.sparks.splice(s, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(sp.x, sp.y, sp.size * sp.life, 0, Math.PI * 2);
      this.ctx.fillStyle = sp.color;
      this.ctx.shadowColor = sp.color;
      this.ctx.shadowBlur = 8;
      this.ctx.globalAlpha = sp.life;
      this.ctx.fill();
      this.ctx.restore();
    }
  }
}

window.SafeDial = SafeDial;
