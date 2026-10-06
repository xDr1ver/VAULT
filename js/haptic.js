/**
 * VAULT: The Haptic Heist — Haptic Feedback Bridge
 * Safe hardware bridge with throttling for Android ERM / iOS Taptic Engine
 */

class HapticBridge {
  constructor() {
    this.tg = window.Telegram?.WebApp;
    this.lastTriggerTime = 0;
    this.minIntervalMs = 70; // 70ms троттлинг для защиты вибромотора от перегрузки
  }

  /**
   * Обычный микро-щелчок деления (Selection Changed)
   */
  tick() {
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
    if (this.tg?.HapticFeedback) {
      try {
        this.tg.HapticFeedback.notificationOccurred('error');
      } catch (e) {}
    }
  }
}

window.Haptic = new HapticBridge();
