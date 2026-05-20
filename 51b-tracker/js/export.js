/*
  js/export.js — Генерация текстового лога для ИИ
  Отвечает за: форматирование записей в читаемый текст и копирование в буфер
  Когда менять: если хочешь изменить формат экспортируемого текста
  Не путать с: storage.js (данные) и render.js (интерфейс)
*/

const Export = (() => {

  // ── Метки тегов ──────────────────────────────

  const TAG_LABELS = {
    focus: 'Чистый фокус',
    waste: 'Пожиратель времени',
    base:  'Базовые нужды',
  };

  // ── Вспомогательные ──────────────────────────

  /** Timestamp → 'HH:MM' */
  function _time(ts) {
    const d = new Date(ts);
    return String(d.getHours()).padStart(2, '0') + ':'
         + String(d.getMinutes()).padStart(2, '0');
  }

  /** 'YYYY-MM-DD' → читаемый вид 'ДД.ММ.ГГГГ' */
  function _formatDate(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.${y}`;
  }

  /** Секунды → 'Xч Yм' или 'Yм' */
  function _dur(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}ч ${m}м`;
    return `${m}м`;
  }

  /** Сгруппировать записи по дате */
  function _groupByDate(entries) {
    const map = {};
    entries.forEach(e => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    // Сортируем даты
    return Object.keys(map)
      .sort()
      .map(date => ({ date, entries: map[date].sort((a, b) => a.startedAt - b.startedAt) }));
  }

  /** Подсчёт итогов по тегам */
  function _calcTotals(entries) {
    const totals = { focus: 0, waste: 0, base: 0 };
    entries.forEach(e => {
      if (totals[e.tag] !== undefined) totals[e.tag] += e.duration;
    });
    return totals;
  }

  /** Сформировать блок текста для одного дня */
  function _buildDayBlock(dateStr, entries) {
    const lines = [`Аудит за ${_formatDate(dateStr)}:\n`];

    entries.forEach(e => {
      const start = _time(e.startedAt);
      const end   = _time(e.endedAt);
      const label = TAG_LABELS[e.tag] || e.tag;
      lines.push(`${start} - ${end} [${label}]: ${e.name} (${_dur(e.duration)})`);
    });

    const totals = _calcTotals(entries);
    lines.push('');
    lines.push(
      `Итог: Чистый фокус — ${_dur(totals.focus)} | ` +
      `Пожиратели — ${_dur(totals.waste)} | ` +
      `Базовые — ${_dur(totals.base)}`
    );

    return lines.join('\n');
  }

  // ── Публичные методы генерации ────────────────

  /** Лог за сегодня */
  function buildToday() {
    const today = Storage.todayKey();
    const entries = Storage.getEntriesByDate(today).sort((a, b) => a.startedAt - b.startedAt);
    if (entries.length === 0) return '— Записей за сегодня нет —';
    return _buildDayBlock(today, entries);
  }

  /** Лог за последние 7 дней */
  function buildWeek() {
    const entries = Storage.getEntriesLastDays(7);
    if (entries.length === 0) return '— Записей за неделю нет —';

    const groups = _groupByDate(entries);
    const blocks = groups.map(g => _buildDayBlock(g.date, g.entries));

    // Итог по неделе
    const totals = _calcTotals(entries);
    const summary = [
      '\n══════════════════════════════',
      'ИТОГ ЗА НЕДЕЛЮ:',
      `Чистый фокус — ${_dur(totals.focus)}`,
      `Пожиратели   — ${_dur(totals.waste)}`,
      `Базовые      — ${_dur(totals.base)}`,
    ].join('\n');

    return blocks.join('\n\n────────────────────────────\n\n') + '\n' + summary;
  }

  /** Лог за всё время */
  function buildAll() {
    const entries = Storage.getEntries();
    if (entries.length === 0) return '— Записей нет —';

    const groups = _groupByDate(entries);
    const blocks = groups.map(g => _buildDayBlock(g.date, g.entries));

    const totals = _calcTotals(entries);
    const summary = [
      '\n══════════════════════════════',
      `ИТОГ ЗА ВСЁ ВРЕМЯ (${groups.length} дн.):`,
      `Чистый фокус — ${_dur(totals.focus)}`,
      `Пожиратели   — ${_dur(totals.waste)}`,
      `Базовые      — ${_dur(totals.base)}`,
    ].join('\n');

    return blocks.join('\n\n────────────────────────────\n\n') + '\n' + summary;
  }

  // ── Копирование в буфер ───────────────────────

  /**
   * Копирует текст в буфер обмена.
   * @param {string} range — 'today' | 'week' | 'all'
   * @returns {Promise<boolean>}
   */
  async function copyToClipboard(range) {
    let text = '';
    if (range === 'today') text = buildToday();
    else if (range === 'week') text = buildWeek();
    else text = buildAll();

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback для старых браузеров
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      return ok;
    }
  }

  return {
    buildToday,
    buildWeek,
    buildAll,
    copyToClipboard,
  };

})();
