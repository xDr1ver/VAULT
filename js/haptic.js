/**
 * VAULT: The Haptic Heist — Haptic Feedback Bridge
 * Safe hardware bridge with throttling for Android ERM / iOS Taptic Engine
 */

class HapticBridge {
  constructor() {
    this.tg = window.Telegram?.WebApp;
    this.enabled = true;
    this.lastTriggerTime = 0;
    this.minIntervalMs = 70; // 70ms троттлинг для защиты вибромотора от перегрузки
  }

  selection() {
    if (!this.enabled) return;
    if (this.tg?.HapticFeedback) {
      try {
        this.tg.HapticFeedback.selectionChanged();
      } catch (e) {}
    }
  }

  /**
   * Обычный микро-щелчок деления (Selection Changed)
   */
  tick() {
    if (!this.enabled) return;
    const now = performance.now();
    if (now - this.lastTriggerTime < this.minIntervalMs) return;
    this.lastTriggerTime = now;

    if (this.tg?.HapticFeedback) {
      try {
        this.tg.HapticFeedback.selectionChanged();
      } catch (e) {
        // Fallback
      }
    }
  }

  /**
   * Попадание в целевой паз штифта (Impact Rigid / Heavy)
   */
  sweetSpot() {
    if (!this.enabled) return;
    const now = performance.now();
    if (now - this.lastTriggerTime < this.minIntervalMs) return;
    this.lastTriggerTime = now;

    if (this.tg?.HapticFeedback) {
      try {
        this.tg.HapticFeedback.impactOccurred('rigid');
      } catch (e) {
        // Fallback
      }
    }
  }

  /**
   * Фиксация сувальды (Notification Success)
   */
  pinLocked() {
    if (!this.enabled) return;
    if (this.tg?.HapticFeedback) {
      try {
        this.tg.HapticFeedback.notificationOccurred('success');
      } catch (e) {}
    }
  }

  /**
   * Срыв замка / Ошибка / Сирена (Notification Error / Warning)
   */
  lockJam() {
    if (!this.enabled) return;
    if (this.tg?.HapticFeedback) {
      try {
        this.tg.HapticFeedback.notificationOccurred('error');
      } catch (e) {}
    }
  }
}

window.Haptic = new HapticBridge();
