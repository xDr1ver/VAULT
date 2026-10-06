/**
 * VAULT: The Haptic Heist — Full Game Controller & Multi-Screen Engine
 * Handles Heist Loop, Noise Meter, Bunker Safe Constructor, PvP Raids, Settings & Story Sharing.
 */

class VaultGame {
  constructor() {
    this.tg = window.Telegram?.WebApp;

    // 1. UI ЭЛЕМЕНТЫ ВЗЛОМА (HEIST)
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

    // Шумомер (Noise Meter)
    this.noiseMeterBar = document.getElementById('noiseMeterBar');
    this.noiseValEl = document.getElementById('noiseVal');
    this.noiseFillEl = document.getElementById('noiseFill');
    this.noiseEnabled = true;

    // Модальное окно результатов
    this.modalBackdrop = document.getElementById('modalBackdrop');
    this.modalBadge = document.getElementById('modalBadge');
    this.modalTitle = document.getElementById('modalTitle');
    this.modalSubtitle = document.getElementById('modalSubtitle');
    this.modalReward = document.getElementById('modalReward');
    this.statTime = document.getElementById('statTime');
    this.statPrecision = document.getElementById('statPrecision');
    this.statRank = document.getElementById('statRank');
    this.btnModalRestart = document.getElementById('btnModalRestart');
    this.btnModalStory = document.getElementById('btnModalStory');
    this.btnModalShare = document.getElementById('btnModalShare');

    // Нативный тост
    this.toastEl = document.getElementById('tgToast');
    this.toastMsgEl = document.getElementById('toastMsg');
    this.toastTimer = null;

    // 2. СОСТОЯНИЕ СЕССИИ ВЗЛОМА
    this.currentStep = 0; // 0, 1, 2
    this.totalSteps = 3;
    this.timeRemaining = 45.00;
    this.maxTime = 45.00;
    this.timerInterval = null;
    this.isGameOver = false;
    this.startTime = 0;
    this.totalAttempts = 0;
    this.userBalance = 24500;

    // Стандартные ступени куша
    this.tiers = [
      { mult: 'x1.5', amount: 1500, dir: 'CW' },
      { mult: 'x3.5', amount: 4500, dir: 'CCW' },
      { mult: 'x12.0', amount: 18000, dir: 'CW' },
      { mult: 'x50.0', amount: 65000, dir: 'JACKPOT' }
    ];

    // Активные штифты и ловушки текущего взлома
    this.pins = [42, 18, 73];
    this.falseGates = [27, 64];

    // 3. БУНКЕР (PVP КОНСТРУКТОР СЕЙФА)
    this.bunkerPins = [42, 18, 73];
    this.bunkerTraps = [27, 64];
    this.bunkerPool = 10000;

    // 4. ИНИЦИАЛИЗАЦИЯ 3D-ДИСКА
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
      onFalseGateTick: (val) => {
        this.handleFalseGate(val);
      },
      onNoiseChanged: (noise) => {
        this.handleNoiseUpdate(noise);
      },
      onPinSolved: (pin) => {
        this.handlePinSolved(pin);
      },
      onAngleChanged: (val, dir) => {
        this.updateAngleDisplay(val, dir);
      }
    });

    // 5. ИНИЦИАЛИЗАЦИЯ СИСТЕМ
    this.initUserProfile();
    this.bindEvents();
    this.bindTabs();
    this.bindBunkerControls();
    this.bindSettingsControls();
    this.renderRaidsList();

    // Проверка Deep-Link (startapp=v_...)
    const deepLoaded = this.checkDeepLink();
    if (!deepLoaded) {
      this.startNewGame();
    }
  }

  // =========================================================================
  // ИНИЦИАЛИЗАЦИЯ И ПРОФИЛЬ TELEGRAM
  // =========================================================================
  initUserProfile() {
    const user = this.tg?.initDataUnsafe?.user;
    const nameEl = document.getElementById('profileName');
    const subEl = document.getElementById('profileSub');
    const avatarEl = document.getElementById('profileAvatar');
    const balEl = document.getElementById('profileBalance');
    const topBalEl = document.getElementById('topBalanceText');

    this.userName = user ? (user.first_name || 'Ghost') : 'Ghost Operative';
    const initials = this.userName[0].toUpperCase();

    if (nameEl) nameEl.innerText = this.userName;
    if (subEl) subEl.innerText = user?.username ? `@${user.username} • Rank S` : 'ID: 84920412 • Rank S';
    if (avatarEl) avatarEl.innerHTML = `<span>${initials}</span>`;
    if (balEl) balEl.innerText = `$${this.userBalance.toLocaleString('en-US')} SAFE`;
    if (topBalEl) topBalEl.innerText = `$${this.userBalance.toLocaleString('en-US')} SAFE`;
  }

  // =========================================================================
  // ПЕРЕКЛЮЧАТЕЛЬ ЭКРАНОВ И ТАБОВ
  // =========================================================================
  bindTabs() {
    const tabs = document.querySelectorAll('.tg-tab-bar .tab-item');
    const screens = document.querySelectorAll('.screen-view');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetId = tab.getAttribute('data-target');
        if (!targetId) return;

        window.Haptic?.selection();

        // Смена активного таба
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Смена активного экрана
        screens.forEach(s => s.classList.remove('active'));
        const activeScreen = document.getElementById(targetId);
        if (activeScreen) {
          activeScreen.classList.add('active');
        }

        // Если вернулись на экран Взлома — калибруем размер Canvas
        if (targetId === 'screenHeist') {
          setTimeout(() => this.dial?.resize(), 50);
        }
      });
    });
  }

  switchToTab(tabId) {
    const tab = document.getElementById(tabId);
    if (tab) tab.click();
  }

  // =========================================================================
  // ПРИВЯЗКА СОБЫТИЙ И УПРАВЛЕНИЯ
  // =========================================================================
  bindEvents() {
    this.btnCashout.addEventListener('click', () => this.handleCashout());
    this.btnReset.addEventListener('click', () => this.handleResetTumbler());
    this.btnModalRestart.addEventListener('click', () => this.startNewGame());
    this.btnModalShare.addEventListener('click', () => this.handleShareChat());
    this.btnModalStory.addEventListener('click', () => this.handleShareStory());

    // Селектор ранга сверху — переход в настройки
    document.getElementById('rankSelector')?.addEventListener('click', () => {
      this.switchToTab('tabSettings');
    });
  }

  // =========================================================================
  // ИГРОВОЙ ЦИКЛ (HEIST LOOP)
  // =========================================================================
  startNewGame(customConfig = null) {
    this.isGameOver = false;
    this.currentStep = 0;
    this.modalBackdrop.classList.remove('visible');
    document.body.classList.remove('shake');
    this.needleEl.classList.remove('locked');

    if (customConfig) {
      this.pins = customConfig.pins || [40, 70, 20];
      this.falseGates = customConfig.traps || [15, 85];
      this.timeRemaining = customConfig.time || 45.00;
      this.maxTime = this.timeRemaining;
      if (customConfig.tiers) {
        this.tiers = customConfig.tiers;
      }
    } else {
      // Генерация 3 случайных штифтов с расстоянием >= 15
      this.pins = [
        Math.floor(Math.random() * 80) + 10,
        Math.floor(Math.random() * 80) + 10,
        Math.floor(Math.random() * 80) + 10
      ];
      this.falseGates = [
        (this.pins[0] + 25) % 100,
        (this.pins[1] + 35) % 100
      ];
      this.timeRemaining = 45.00;
      this.maxTime = 45.00;
    }

    this.startTime = performance.now();
    this.updateHUD();
    this.setupCurrentStep();
    this.startTimer();
  }

  setupCurrentStep() {
    const tier = this.tiers[this.currentStep];
    this.dial.isLocked = false;
    this.dial.setTarget(this.pins[this.currentStep], tier.dir, this.falseGates);

    // Сброс визуала керна
    this.centerCoreEl.style.backgroundColor = '#18202A';
    this.centerCoreEl.style.transform = 'scale(1)';

    const dirText = tier.dir === 'CW' ? 'ПО ЧАСОВОЙ СТРЕЛКЕ (CW ↻)' : 'ПРОТИВ ЧАСОВОЙ (CCW ↺)';
    this.updateStatusText(`ВРАЩАЙТЕ ${dirText}`, 'var(--accent-cyan)');

    const SVG_ICONS = {
      completed: `<svg class="icon-svg" viewBox="0 0 20 20" fill="none"><path d="M4 10.5L8 14.5L16 6.5" stroke="var(--accent-emerald)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      active: `<svg class="icon-svg active-pulse" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.4"/><circle cx="10" cy="10" r="3.5" fill="currentColor"/><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3"/></svg>`,
      locked: `<svg class="icon-svg" viewBox="0 0 20 20" fill="none"><rect x="5" y="8" width="10" height="9" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M7 8V5.5C7 3.8 8.3 2.5 10 2.5C11.7 2.5 13 3.8 13 5.5V8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="10" cy="12.5" r="1.2" fill="currentColor"/></svg>`
    };

    // Обновление слотов сувальд в HUD
    for (let i = 0; i < this.totalSteps; i++) {
      const slot = document.getElementById(`slot${i}`);
      if (!slot) continue;
      slot.className = 'tumbler-slot';
      const icon = slot.querySelector('.tumbler-icon');

      if (i < this.currentStep) {
        slot.classList.add('completed');
        if (icon) icon.innerHTML = SVG_ICONS.completed;
      } else if (i === this.currentStep) {
        slot.classList.add('active');
        if (icon) icon.innerHTML = SVG_ICONS.active;
      } else {
        slot.classList.add('locked');
        if (icon) icon.innerHTML = SVG_ICONS.locked;
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

    this.userBalance += reward;
    this.updateBalanceUI();

    this.needleEl.classList.add('locked');
    this.showModal({
      badge: 'ВЗЛОМАНО',
      title: 'СЕЙФ РАСПАХНУТ!',
      subtitle: 'Все 3 сувальды сорваны чисто без шума.',
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

    this.userBalance += currentReward;
    this.updateBalanceUI();

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

  handleLockJam(reason = 'Время вышло') {
    this.stopTimer();
    this.isGameOver = true;
    this.dial.isLocked = true;

    window.AudioEngine?.playLockJam();
    window.Haptic?.lockJam();

    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 400);

    const elapsed = ((performance.now() - this.startTime) / 1000).toFixed(1);

    this.showModal({
      badge: 'ТРЕВОГА',
      title: 'ВЗЛОМ ПРОВАЛЕН!',
      subtitle: reason,
      reward: '$0 SAFE',
      time: `${elapsed} с`,
      precision: '0%',
      rank: 'Busted Amateur'
    });
  }

  handleResetTumbler() {
    if (this.isGameOver) return;
    window.AudioEngine?.playTick();
    this.dial.setTarget(this.pins[this.currentStep], this.tiers[this.currentStep].dir, this.falseGates);
    this.updateStatusText('СУВАЛЬДА СБРОШЕНА. НАЧНИТЕ ЗАНОВО', 'var(--accent-amber)');
  }

  // =========================================================================
  // МЕХАНИКА ШУМОМЕРА (NOISE METER) И ЛОЖНЫХ ПАЗОВ
  // =========================================================================
  handleNoiseUpdate(noise) {
    if (!this.noiseEnabled || this.isGameOver) return;

    if (this.noiseFillEl) {
      this.noiseFillEl.style.width = `${Math.min(100, noise)}%`;
    }
    if (this.noiseValEl) {
      this.noiseValEl.innerText = `${Math.round(noise)}%`;
    }

    if (noise > 70) {
      this.noiseMeterBar?.classList.add('warning');
    } else {
      this.noiseMeterBar?.classList.remove('warning');
    }

    // Если шум достиг 100% — срабатывает акустическая сирена
    if (noise >= 100) {
      window.AudioEngine?.playAlarmSiren();
      this.handleLockJam('Сейсмодатчик охраны зафиксировал резкий шум!');
    }
  }

  handleFalseGate(val) {
    window.AudioEngine?.playFalseGate();
    window.Haptic?.tick();

    this.updateStatusText(`ЛОЖНЫЙ ПАЗ! (${val})`, 'var(--accent-crimson)');
    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 180);
  }

  // =========================================================================
  // ТАЙМЕР И ИНДИКАЦИЯ
  // =========================================================================
  updateHUD() {
    const tier = this.tiers[this.currentStep];
    if (this.stakeMultEl) this.stakeMultEl.innerText = tier.mult;
    if (this.stakeAmountEl) this.stakeAmountEl.innerText = `$${tier.amount.toLocaleString('en-US')}`;
    if (this.cashoutAmountEl) this.cashoutAmountEl.innerText = `$${tier.amount.toLocaleString('en-US')} SAFE`;
  }

  updateAngleDisplay(val, dir) {
    if (this.dial.getDistanceToTarget() > 1.5) {
      const tier = this.tiers[this.currentStep];
      const dirLabel = tier.dir === 'CW' ? 'CW ↻' : 'CCW ↺';
      this.updateStatusText(`ПОИСК: ${val.toString().padStart(2, '0')} (${dirLabel})`, 'var(--text-main)');
    }
  }

  updateStatusText(text, color = 'var(--text-main)') {
    if (this.statusTextEl) {
      this.statusTextEl.innerText = text;
      this.statusTextEl.style.color = color;
    }
  }

  startTimer() {
    this.stopTimer();
    const intervalMs = 50;

    this.timerInterval = setInterval(() => {
      this.timeRemaining -= intervalMs / 1000;

      if (this.timeRemaining <= 0) {
        this.timeRemaining = 0;
        if (this.sessionTimerEl) this.sessionTimerEl.innerText = '00.00';
        this.handleLockJam('Время взлома истекло!');
      } else {
        if (this.sessionTimerEl) {
          this.sessionTimerEl.innerText = this.timeRemaining.toFixed(2);
          if (this.timeRemaining < 10) {
            this.sessionTimerEl.style.color = 'var(--accent-crimson)';
          } else {
            this.sessionTimerEl.style.color = 'var(--text-main)';
          }
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

  updateBalanceUI() {
    const balEl = document.getElementById('profileBalance');
    const topBalEl = document.getElementById('topBalanceText');
    if (balEl) balEl.innerText = `$${this.userBalance.toLocaleString('en-US')} SAFE`;
    if (topBalEl) topBalEl.innerText = `$${this.userBalance.toLocaleString('en-US')} SAFE`;
  }

  // =========================================================================
  // МОДАЛЬНОЕ ОКНО
  // =========================================================================
  showModal({ badge, title, subtitle, reward, time, precision, rank }) {
    if (this.modalBadge) this.modalBadge.innerText = badge;
    if (this.modalTitle) this.modalTitle.innerText = title;
    if (this.modalSubtitle) this.modalSubtitle.innerText = subtitle;
    if (this.modalReward) this.modalReward.innerText = reward;
    if (this.statTime) this.statTime.innerText = time;
    if (this.statPrecision) this.statPrecision.innerText = precision;
    if (this.statRank) this.statRank.innerText = rank;

    this.lastWinData = { badge, title, reward, time, rank };
    this.modalBackdrop.classList.add('visible');
  }

  // =========================================================================
  // БУНКЕР (PVP КОНСТРУКТОР СЕЙФА)
  // =========================================================================
  bindBunkerControls() {
    // Кнопки-степперы для изменения кода штифтов
    document.querySelectorAll('.tumbler-num-stepper button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pinIdx = parseInt(btn.getAttribute('data-pin-idx'), 10);
        const delta = parseInt(btn.getAttribute('data-delta'), 10);
        if (isNaN(pinIdx) || isNaN(delta)) return;

        window.Haptic?.tick();
        this.bunkerPins[pinIdx] = (this.bunkerPins[pinIdx] + delta + 100) % 100;
        const valEl = document.getElementById(`cfgPin${pinIdx}`);
        if (valEl) valEl.innerText = this.bunkerPins[pinIdx].toString().padStart(2, '0');
      });
    });

    // Кнопка рандомизации ловушек
    document.getElementById('btnRerollTraps')?.addEventListener('click', () => {
      window.Haptic?.tick();
      this.bunkerTraps = [
        Math.floor(Math.random() * 85) + 5,
        Math.floor(Math.random() * 85) + 5
      ];
      document.getElementById('cfgTrap0').innerText = this.bunkerTraps[0].toString().padStart(2, '0');
      document.getElementById('cfgTrap1').innerText = this.bunkerTraps[1].toString().padStart(2, '0');
      this.showToast('Ложные пазы обновлены!');
    });

    // Кнопка бросить вызов в Telegram
    document.getElementById('btnShareBunker')?.addEventListener('click', () => {
      this.shareBunkerChallenge();
    });

    // Кнопка скопировать ссылку
    document.getElementById('btnCopyBunkerLink')?.addEventListener('click', () => {
      const link = this.generateBunkerLink();
      this.copyToClipboard(link, 'Ссылка на твой сейф скопирована!');
    });

    // Кнопка проверить свой сейф (Practice mode)
    document.getElementById('btnTestBunker')?.addEventListener('click', () => {
      this.switchToTab('tabHeist');
      this.showToast('Тестовый взлом своего сейфа запущен!');
      this.startNewGame({
        pins: [...this.bunkerPins],
        traps: [...this.bunkerTraps],
        time: 45.00
      });
    });
  }

  generateBunkerLink() {
    const payload = {
      p: this.bunkerPins,
      t: this.bunkerTraps,
      b: this.bunkerPool,
      o: this.userName
    };
    const encoded = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `https://t.me/open_vault_bot/play?startapp=v_${encoded}`;
  }

  shareBunkerChallenge() {
    const link = this.generateBunkerLink();
    const challengeText = `🔐 Я создал неприступный сейф с кушем $${this.bunkerPool.toLocaleString('en-US')} SAFE!\nПопробуй взломать его: ${link}`;

    if (this.tg?.switchInlineQuery) {
      this.tg.switchInlineQuery(challengeText);
    } else {
      this.copyToClipboard(challengeText, 'Вызов скопирован! Отправь его друзьям');
    }
  }

  // =========================================================================
  // РЕЙДЫ (ДОСКА ЗАКАЗОВ СИНДИКАТА)
  // =========================================================================
  renderRaidsList() {
    const container = document.getElementById('raidsList');
    if (!container) return;

    const raidsData = [
      {
        id: 'raid-1',
        title: "Банк Синдиката 'Омега'",
        author: "@shadow_boss",
        diff: 'hard',
        diffText: 'Экстрим',
        trapsCount: '3 ловушки',
        reward: '$45,000 SAFE',
        pins: [33, 78, 12],
        traps: [25, 50, 90],
        time: 35.00
      },
      {
        id: 'raid-2',
        title: "Хранилище Кибер-Триады",
        author: "@neon_viper",
        diff: 'medium',
        diffText: 'Профи',
        trapsCount: '2 ловушки',
        reward: '$18,500 SAFE',
        pins: [15, 62, 88],
        traps: [40, 75],
        time: 40.00
      },
      {
        id: 'raid-3',
        title: "Сейф кибер-кита @ton_whale",
        author: "@ton_whale",
        diff: 'medium',
        diffText: 'Средне',
        trapsCount: '1 ловушка',
        reward: '$8,000 SAFE',
        pins: [21, 55, 30],
        traps: [68],
        time: 45.00
      },
      {
        id: 'raid-4',
        title: "Тайник Новичка",
        author: "@rookie_heist",
        diff: 'easy',
        diffText: 'Легко',
        trapsCount: 'Без ловушек',
        reward: '$3,200 SAFE',
        pins: [10, 45, 80],
        traps: [],
        time: 50.00
      }
    ];

    container.innerHTML = raidsData.map(r => `
      <div class="raid-card">
        <div class="raid-card-top">
          <div class="raid-title-wrap">
            <span class="raid-card-title">${r.title}</span>
            <span class="raid-card-author">Защитник: ${r.author} • ${r.trapsCount}</span>
          </div>
          <span class="raid-diff-badge diff-${r.diff}">${r.diffText}</span>
        </div>
        <div class="raid-card-bottom">
          <div class="raid-reward-box">
            <span class="raid-reward-lbl">НАГРАДА ЗА ВЗЛОМ</span>
            <span class="raid-reward-val tabular-nums">${r.reward}</span>
          </div>
          <button class="btn-raid-launch" data-raid-id="${r.id}">ВЗЛОМАТЬ</button>
        </div>
      </div>
    `).join('');

    // Привязка кликов запуска рейдов
    container.querySelectorAll('.btn-raid-launch').forEach(btn => {
      btn.addEventListener('click', () => {
        const raidId = btn.getAttribute('data-raid-id');
        const targetRaid = raidsData.find(r => r.id === raidId);
        if (!targetRaid) return;

        window.Haptic?.sweetSpot();
        this.switchToTab('tabHeist');
        this.showToast(`Рейд на "${targetRaid.title}" начался!`);

        this.startNewGame({
          pins: targetRaid.pins,
          traps: targetRaid.traps,
          time: targetRaid.time,
          tiers: [
            { mult: 'x1.0', amount: Math.round(parseInt(targetRaid.reward.replace(/[^0-9]/g, '')) * 0.1), dir: 'CW' },
            { mult: 'x2.5', amount: Math.round(parseInt(targetRaid.reward.replace(/[^0-9]/g, '')) * 0.35), dir: 'CCW' },
            { mult: 'x6.0', amount: Math.round(parseInt(targetRaid.reward.replace(/[^0-9]/g, '')) * 0.7), dir: 'CW' },
            { mult: 'MAX', amount: parseInt(targetRaid.reward.replace(/[^0-9]/g, '')), dir: 'JACKPOT' }
          ]
        });
      });
    });
  }

  // =========================================================================
  // НАСТРОЙКИ (SETTINGS & THEMES)
  // =========================================================================
  bindSettingsControls() {
    const toggleHaptic = document.getElementById('toggleHaptic');
    const toggleSound = document.getElementById('toggleSound');
    const toggleNoise = document.getElementById('toggleNoise');

    toggleHaptic?.addEventListener('change', (e) => {
      if (window.Haptic) window.Haptic.enabled = e.target.checked;
      this.showToast(e.target.checked ? 'Вибрация включена' : 'Вибрация отключена');
    });

    toggleSound?.addEventListener('change', (e) => {
      if (window.AudioEngine) window.AudioEngine.enabled = e.target.checked;
      this.showToast(e.target.checked ? 'Звук включен' : 'Звук отключен');
    });

    toggleNoise?.addEventListener('change', (e) => {
      this.noiseEnabled = e.target.checked;
      this.showToast(e.target.checked ? 'Сейсмодатчик активен' : 'Сейсмодатчик отключен');
    });

    // Переключатель тем
    const chips = document.querySelectorAll('.theme-picker .theme-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const theme = chip.getAttribute('data-theme');
        this.applyTheme(theme);
      });
    });
  }

  applyTheme(theme) {
    window.Haptic?.tick();
    const root = document.documentElement;

    if (theme === 'gold') {
      root.style.setProperty('--accent-cyan', '#F59E0B');
      root.style.setProperty('--accent-amber', '#FCD34D');
      this.showToast('Тема: Syndicate Gold');
    } else if (theme === 'emerald') {
      root.style.setProperty('--accent-cyan', '#10B981');
      root.style.setProperty('--accent-amber', '#34D399');
      this.showToast('Тема: Matrix Neon');
    } else {
      root.style.setProperty('--accent-cyan', '#38BDF8');
      root.style.setProperty('--accent-amber', '#F59E0B');
      this.showToast('Тема: Cyber Obsidian');
    }
  }

  // =========================================================================
  // ШЕРИНГ В TELEGRAM STORIES И ЧАТ
  // =========================================================================
  handleShareChat() {
    const time = this.statTime.innerText;
    const reward = this.modalReward.innerText;
    const shareText = `🔓 Я только что взломал Сейф за ${time} и сорвал банк ${reward}!\nПопробуй повторить в @open_vault_bot`;

    if (this.tg?.switchInlineQuery) {
      this.tg.switchInlineQuery(shareText);
    } else {
      this.copyToClipboard(shareText, 'Результат скопирован! Отправь другу');
    }
  }

  async handleShareStory() {
    window.Haptic?.sweetSpot();
    const canvas = document.getElementById('storyCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const w = 1080;
    const h = 1920;
    canvas.width = w;
    canvas.height = h;

    // 1. Градиентный кибер-фон
    const bgGrad = ctx.createRadialGradient(w / 2, h * 0.35, 100, w / 2, h / 2, w);
    bgGrad.addColorStop(0, '#1E293B');
    bgGrad.addColorStop(0.4, '#0F172A');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Декоративные неоновые круги
    ctx.save();
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.42, 340, 0, Math.PI * 2);
    ctx.lineWidth = 14;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.shadowColor = '#38BDF8';
    ctx.shadowBlur = 40;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(w / 2, h * 0.42, 280, 0, Math.PI * 2);
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
    ctx.shadowColor = '#F59E0B';
    ctx.shadowBlur = 30;
    ctx.stroke();
    ctx.restore();

    // 3. Заголовки Story
    ctx.save();
    ctx.textAlign = 'center';

    // Бренд
    ctx.font = '800 36px "Inter", sans-serif';
    ctx.fillStyle = '#38BDF8';
    ctx.fillText('VAULT: THE HAPTIC HEIST', w / 2, 220);

    // Главный трофей
    ctx.font = '900 82px "Inter", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('СЕЙФ РАСПАХНУТ!', w / 2, 330);

    // Куш
    ctx.font = '900 110px "JetBrains Mono", monospace';
    ctx.fillStyle = '#10B981';
    ctx.shadowColor = '#10B981';
    ctx.shadowBlur = 35;
    ctx.fillText(this.lastWinData?.reward || '$15,000 SAFE', w / 2, h * 0.45);
    ctx.restore();

    // 4. Карточка статистики
    ctx.save();
    const cardY = h * 0.65;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.roundRect?.(w / 2 - 380, cardY, 760, 260, 36) || ctx.fillRect(w / 2 - 380, cardY, 760, 260);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = '700 34px "Inter", sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('ВРЕМЯ ВЗЛОМА', w / 2 - 180, cardY + 80);
    ctx.fillText('РАНГ', w / 2 + 180, cardY + 80);

    ctx.font = '900 56px "JetBrains Mono", monospace';
    ctx.fillStyle = '#F59E0B';
    ctx.fillText(this.lastWinData?.time || '18.4 с', w / 2 - 180, cardY + 160);

    ctx.fillStyle = '#38BDF8';
    ctx.fillText(this.lastWinData?.rank || 'S-Class', w / 2 + 180, cardY + 160);
    ctx.restore();

    // 5. Футер с призывом
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '700 42px "Inter", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Сможешь быстрее? Сыграй сейчас:', w / 2, h * 0.88);
    ctx.font = '800 48px "JetBrains Mono", monospace';
    ctx.fillStyle = '#38BDF8';
    ctx.fillText('@open_vault_bot/play', w / 2, h * 0.92);
    ctx.restore();

    // 6. Вызов Telegram Bot API shareToStory
    try {
      if (typeof this.tg?.shareToStory === 'function') {
        const dataUrl = canvas.toDataURL('image/png');
        this.tg.shareToStory(dataUrl, {
          text: 'Взломал сейф на скорость! @open_vault_bot',
          widget_link: {
            url: 'https://t.me/open_vault_bot/play',
            name: 'Играть в VAULT'
          }
        });
        return;
      }
    } catch (e) {
      console.warn('shareToStory failed or not supported:', e);
    }

    // Fallback: копируем вызов и информируем игрока
    const shareText = `🔓 Я только что взломал Сейф за ${this.statTime.innerText} и сорвал банк ${this.modalReward.innerText}! https://t.me/open_vault_bot/play`;
    this.copyToClipboard(shareText, 'Рекорд готов! Отправь друзьям в Telegram');
  }

  // =========================================================================
  // ПРОВЕРКА DEEP-LINK
  // =========================================================================
  checkDeepLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const startParam = this.tg?.initDataUnsafe?.start_param || urlParams.get('startapp') || urlParams.get('tgWebAppStartParam');

    if (startParam && startParam.startsWith('v_')) {
      try {
        const rawB64 = startParam.substring(2).replace(/-/g, '+').replace(/_/g, '/');
        const jsonStr = atob(rawB64);
        const data = JSON.parse(jsonStr);

        if (Array.isArray(data.p) && data.p.length === 3) {
          this.showToast(`🎯 Загружен сейф от ${data.o || 'игрока'}!`);
          this.startNewGame({
            pins: data.p,
            traps: data.t || [],
            time: 40.00,
            tiers: [
              { mult: 'x1.0', amount: Math.round((data.b || 10000) * 0.15), dir: 'CW' },
              { mult: 'x2.5', amount: Math.round((data.b || 10000) * 0.4), dir: 'CCW' },
              { mult: 'x6.0', amount: Math.round((data.b || 10000) * 0.8), dir: 'CW' },
              { mult: 'JACKPOT', amount: data.b || 10000, dir: 'JACKPOT' }
            ]
          });
          return true;
        }
      } catch (err) {
        console.error('Failed to parse start_param:', err);
      }
    }
    return false;
  }

  // =========================================================================
  // УТИЛИТЫ: ТОСТ И БУФЕР ОБМЕНА
  // =========================================================================
  showToast(msg) {
    if (!this.toastEl || !this.toastMsgEl) return;
    this.toastMsgEl.innerText = msg;
    this.toastEl.classList.add('visible');

    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastEl.classList.remove('visible');
    }, 2400);
  }

  copyToClipboard(text, successMsg = 'Скопировано!') {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast(successMsg);
      }).catch(() => {
        this.fallbackCopy(text, successMsg);
      });
    } else {
      this.fallbackCopy(text, successMsg);
    }
  }

  fallbackCopy(text, successMsg) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      this.showToast(successMsg);
    } catch (e) {
      prompt('Скопируйте ссылку вручную:', text);
    }
    document.body.removeChild(ta);
  }
}

// Запуск после готовности DOM
window.addEventListener('DOMContentLoaded', () => {
  window.Game = new VaultGame();
});
