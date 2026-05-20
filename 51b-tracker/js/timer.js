/*
  js/timer.js — Логика таймера и смены активности
  Отвечает за: запуск/остановку таймера, смену активности, подсчёт статистики дня
  Когда менять: если меняется логика смены активностей или расчёт шкалы Бараката
  Не путать с: render.js (таймер НЕ трогает DOM, только считает)
               storage.js (таймер использует Storage, но не дублирует его)
*/

const Timer = (() => {

  let _intervalId = null;
  let _onTick = null;   // callback(secondsElapsed) — вызывается каждую секунду

  // ── Запуск интервала ─────────────────────────

  function _startInterval() {
    _stopInterval();
    _intervalId = setInterval(() => {
      const current = Storage.getCurrent();
      if (!current) return;
      const elapsed = Math.floor((Date.now() - current.startedAt) / 1000);
      if (_onTick) _onTick(elapsed);
    }, 1000);
  }

  function _stopInterval() {
    if (_intervalId) {
      clearInterval(_intervalId);
      _intervalId = null;
    }
  }

  // ── Инициализация при загрузке ───────────────

  /**
   * Вызывается при старте приложения.
   * Если в localStorage есть незакрытая текущая активность — возобновляем таймер.
   * @param {Function} onTick  — callback(elapsed) каждую секунду
   * @param {Function} onChange — callback() при смене активности
   */
  function init(onTick, onChange) {
    _onTick = onTick;
    _onChange = onChange;
    const current = Storage.getCurrent();
    if (current) {
      _startInterval();
    }
  }

  let _onChange = null;

  // ── Сменить активность ───────────────────────

  /**
   * Закрывает текущую активность (если есть) и открывает новую.
   * @param {string} name  — название новой активности
   * @param {string} tag   — 'focus' | 'waste' | 'base'
   */
  function switchActivity(name, tag) {
    const now = Date.now();

    // Закрываем предыдущую
    const prev = Storage.getCurrent();
    if (prev) {
      const minDuration = 5; // секунд — игнорируем случайные клики < 5с
      const duration = Math.floor((now - prev.startedAt) / 1000);
      if (duration >= minDuration) {
        const entry = Storage.buildEntry(prev, now);
        Storage.addEntry(entry);
      }
    }

    // Создаём новую
    const current = {
      id:        String(now),
      name:      name.trim(),
      tag:       tag,
      startedAt: now,
    };
    Storage.setCurrent(current);
    _startInterval();

    if (_onChange) _onChange();
  }

  // ── Подсчёт статистики дня ───────────────────

  /**
   * Возвращает объект с суммарным временем по тегам за сегодня (в секундах).
   * Учитывает и завершённые записи, и текущую активность.
   * @returns {{ focus: number, waste: number, base: number }}
   */
  function getTodayStats() {
    const today = Storage.todayKey();
    const entries = Storage.getEntriesByDate(today);

    const stats = { focus: 0, waste: 0, base: 0 };

    entries.forEach(e => {
      if (stats[e.tag] !== undefined) stats[e.tag] += e.duration;
    });

    // Добавляем текущую (незакрытую) активность
    const current = Storage.getCurrent();
    if (current) {
      const elapsed = Math.floor((Date.now() - current.startedAt) / 1000);
      // Проверяем, что текущая активность тоже за сегодня
      if (Storage.dateKey(current.startedAt) === today) {
        if (stats[current.tag] !== undefined) stats[current.tag] += elapsed;
      }
    }

    return stats;
  }

  // ── Форматирование времени ───────────────────

  /** Секунды → 'HH:MM:SS' */
  function formatHMS(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [
      String(h).padStart(2, '0'),
      String(m).padStart(2, '0'),
      String(s).padStart(2, '0'),
    ].join(':');
  }

  /** Секунды → короткий формат 'Xч Yм' или 'Yм' */
  function formatShort(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}ч ${m}м`;
    return `${m}м`;
  }

  return {
    init,
    switchActivity,
    getTodayStats,
    formatHMS,
    formatShort,
  };

})();
