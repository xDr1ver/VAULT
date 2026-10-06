/**
 * VAULT: The Haptic Heist — Game Loop Controller
 * 3-Tumbler Progression, Session Timer, Push-Your-Luck Cashout, Win/Fail States
 */

class VaultGame {
  constructor() {
    // UI элементы
    this.sessionTimerEl = document.getElementById('sessionTimer');
    this.statusTextEl = document.getElementById('statusText');
    this.statusPillEl = document.getElementById('statusPill');
    this.stakeMultEl = document.getElementById('stakeMult');
    this.stakeAmountEl = document.getElementById('stakeAmount');
    this.cashoutAmountEl = document.getElementById('cashoutAmount');
    this.btnCashout = document.getElementById('btnCashout');
    this.btnReset = document.getElementById('btnReset');
    this.centerCoreEl = document.getElementById('centerCore');
    this.needleEl = document.getElementById('needle');

    // Модальное окно
    this.modalBackdrop = document.getElementById('modalBackdrop');
    this.modalBadge = document.getElementById('modalBadge');
    this.modalTitle = document.getElementById('modalTitle');
    this.modalSubtitle = document.getElementById('modalSubtitle');
    this.modalReward = document.getElementById('modalReward');
    this.statTime = document.getElementById('statTime');
    this.btnModalRestart = document.getElementById('btnModalRestart');
    this.btnModalShare = document.getElementById('btnModalShare');

    // Состояние сессии
    this.currentStep = 0; // 0, 1, 2
    this.totalSteps = 3;
    this.timeRemaining = 45.00;
    this.timerInterval = null;
    this.isGameOver = false;
    this.startTime = 0;

    // Ступени множителей куша
    this.tiers = [
      { mult: 'x1.5', amount: 1500, dir: 'CW' },
      { mult: 'x3.5', amount: 4500, dir: 'CCW' },
      { mult: 'x12.0', amount: 18000, dir: 'CW' },
      { mult: 'x50.0', amount: 65000, dir: 'JACKPOT' }
    ];

    // Инициализация диска
    const canvas = document.getElementById('vaultCanvas');
    this.dial = new SafeDial(canvas, {
      onTick: (val) => {
        window.AudioEngine?.playTick();
        window.Haptic?.tick();
      },
      onSweetSpotTick: (val) => {
        window.AudioEngine?.playSweetSpotTick();
        window.Haptic?.sweetSpot();
        this.updateStatusText('ШТИФТ НАЙДЕН! УДЕРЖИВАЙТЕ...', 'var(--accent-amber)');
      },
      onPinSolved: (pin) => {
        this.handlePinSolved(pin);
      },
      onAngleChanged: (val, dir) => {
        this.updateAngleDisplay(val, dir);
      }
    });

    this.bindEvents();
    this.startNewGame();
  }

  bindEvents() {
    this.btnCashout.addEventListener('click', () => this.handleCashout());
    this.btnReset.addEventListener('click', () => this.handleResetTumbler());
    this.btnModalRestart.addEventListener('click', () => this.startNewGame());
    this.btnModalShare.addEventListener('click', () => this.handleShare());
  }

  startNewGame() {
    this.isGameOver = false;
    this.currentStep = 0;
    this.timeRemaining = 45.00;
    this.startTime = performance.now();
    this.modalBackdrop.classList.remove('visible');
    document.body.classList.remove('shake');

    // Генерация 3 случайных секретных чисел с гарантированным расстоянием
    this.pins = [
      Math.floor(Math.random() * 80) + 10,
      Math.floor(Math.random() * 80) + 10,
      Math.floor(Math.random() * 80) + 10
    ];

    this.updateHUD();
    this.setupCurrentStep();
    this.startTimer();
  }

  setupCurrentStep() {
    const tier = this.tiers[this.currentStep];
    this.dial.isLocked = false;
    this.dial.setTarget(this.pins[this.currentStep], tier.dir);

    // Сброс визуала керна
    this.centerCoreEl.style.backgroundColor = '#18202A';
    this.centerCoreEl.style.transform = 'scale(1)';

    const dirText = tier.dir === 'CW' ? 'ПО ЧАСОВОЙ СТРЕЛКЕ (CW ↻)' : 'ПРОТИВ ЧАСОВОЙ (CCW ↺)';
    this.updateStatusText(`ВРАЩАЙТЕ ${dirText}`, 'var(--accent-cyan)');

    // Обновление слотов сувальд в HUD
    for (let i = 0; i < this.totalSteps; i++) {
      const slot = document.getElementById(`slot${i}`);
      slot.className = 'tumbler-slot';
      const icon = slot.querySelector('.tumbler-icon');

      if (i < this.currentStep) {
        slot.classList.add('completed');
        icon.innerText = '✓';
      } else if (i === this.currentStep) {
        slot.classList.add('active');
        icon.innerText = '●';
      } else {
        slot.classList.add('locked');
        icon.innerText = '🔒';
      }
    }
  }

  handlePinSolved(pin) {
    if (this.isGameOver) return;
    this.dial.isLocked = true;

    window.AudioEngine?.playTumblerLock();
    window.Haptic?.pinLocked();

    // Анимация фиксации керна
    this.centerCoreEl.style.backgroundColor = 'var(--accent-emerald)';
    this.centerCoreEl.style.transform = 'scale(1.25)';

    this.currentStep++;

    if (this.currentStep >= this.totalSteps) {
      // ПОЛНЫЙ ВЗЛОМ СЕЙФА (ДЖЕКПОТ)
      this.handleJackpotWin();
    } else {
      // Переход к следующей сувальде
      this.updateStatusText(`СУВАЛЬДА ЗАФИКСИРОВАНА!`, 'var(--accent-emerald)');
      setTimeout(() => {
        this.setupCurrentStep();
        this.updateHUD();
      }, 700);
    }
  }

  handleJackpotWin() {
    this.stopTimer();
    this.isGameOver = true;

    window.AudioEngine?.playUnlockChord();
    window.Haptic?.pinLocked();

    const elapsed = ((performance.now() - this.startTime) / 1000).toFixed(1);
    const reward = this.tiers[3].amount;

    this.needleEl.classList.add('locked');
    this.showModal({
      badge: 'ВЗЛОМАНО',
      title: 'СЕЙФ РАСПАХНУТ!',
      subtitle: 'Все 3 сувальды сорваны чисто.',
      reward: `$${reward.toLocaleString('en-US')} SAFE`,
      time: `${elapsed} с`,
      precision: '99.4%',
      rank: 'S-Class Phantom'
    });
  }

  handleCashout() {
    if (this.isGameOver) return;
    this.stopTimer();
    this.isGameOver = true;

    const currentReward = this.tiers[this.currentStep].amount;
    const elapsed = ((performance.now() - this.startTime) / 1000).toFixed(1);

    window.AudioEngine?.playUnlockChord();
    window.Haptic?.pinLocked();

    this.showModal({
      badge: 'КУШ ЗАФИКСИРОВАН',
      title: 'УСПЕШНЫЙ ПОБЕГ!',
      subtitle: 'Ты вовремя забрал банк без риска.',
      reward: `$${currentReward.toLocaleString('en-US')} SAFE`,
      time: `${elapsed} с`,
      precision: '96.5%',
      rank: 'Pro Safe Cracker'
    });
  }

  handleLockJam() {
    this.stopTimer();
    this.isGameOver = true;
    this.dial.isLocked = true;

    window.AudioEngine?.playLockJam();
    window.Haptic?.lockJam();

    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 400);

    const elapsed = ((performance.now() - this.startTime) / 1000).toFixed(1);

    this.showModal({
      badge: 'СИРЕНА',
      title: 'ВЗЛОМ ПРОВАЛЕН!',
      subtitle: 'Время вышло или замок заблокирован охраной.',
      reward: '$0 SAFE',
      time: `${elapsed} с`,
      precision: '0%',
      rank: 'Busted Amateur'
    });
  }

  handleResetTumbler() {
    if (this.isGameOver) return;
    window.AudioEngine?.playTick();
    this.dial.setTarget(this.pins[this.currentStep], this.tiers[this.currentStep].dir);
    this.updateStatusText('СУВАЛЬДА СБРОШЕНА. НАЧНИТЕ ЗАНОВО', 'var(--accent-amber)');
  }

  updateHUD() {
    const tier = this.tiers[this.currentStep];
    this.stakeMultEl.innerText = tier.mult;
    this.stakeAmountEl.innerText = `$${tier.amount.toLocaleString('en-US')}`;
    this.cashoutAmountEl.innerText = `$${tier.amount.toLocaleString('en-US')} SAFE`;
  }

  updateAngleDisplay(val, dir) {
    if (this.dial.getDistanceToTarget() > 1.5) {
      const tier = this.tiers[this.currentStep];
      const dirLabel = tier.dir === 'CW' ? 'CW ↻' : 'CCW ↺';
      this.updateStatusText(`ПОИСК: ${val.toString().padStart(2, '0')} (${dirLabel})`, 'var(--text-main)');
    }
  }

  updateStatusText(text, color = 'var(--text-main)') {
    this.statusTextEl.innerText = text;
    this.statusTextEl.style.color = color;
  }

  startTimer() {
    this.stopTimer();
    const intervalMs = 50;

    this.timerInterval = setInterval(() => {
      this.timeRemaining -= intervalMs / 1000;

      if (this.timeRemaining <= 0) {
        this.timeRemaining = 0;
        this.sessionTimerEl.innerText = '00.00';
        this.handleLockJam();
      } else {
        this.sessionTimerEl.innerText = this.timeRemaining.toFixed(2);
        if (this.timeRemaining < 10) {
          this.sessionTimerEl.style.color = 'var(--accent-crimson)';
        } else {
          this.sessionTimerEl.style.color = 'var(--text-main)';
        }
      }
    }, intervalMs);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  showModal({ badge, title, subtitle, reward, time, precision, rank }) {
    this.modalBadge.innerText = badge;
    this.modalTitle.innerText = title;
    this.modalSubtitle.innerText = subtitle;
    this.modalReward.innerText = reward;
    this.statTime.innerText = time;
    document.getElementById('statPrecision').innerText = precision;
    document.getElementById('statRank').innerText = rank;

    this.modalBackdrop.classList.add('visible');
  }

  handleShare() {
    const tg = window.Telegram?.WebApp;
    const shareText = `Я только что взломал Сейф за ${this.statTime.innerText} и забрал ${this.modalReward.innerText}! Сможешь быстрее?`;

    if (tg?.switchInlineQuery) {
      tg.switchInlineQuery(shareText, ['users', 'groups']);
    } else {
      navigator.clipboard?.writeText(shareText);
      alert('Результат скопирован в буфер обмена!');
    }
  }
}

// Запуск после готовности DOM
window.addEventListener('DOMContentLoaded', () => {
  window.Game = new VaultGame();
});
