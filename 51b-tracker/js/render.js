/*
  js/render.js — Отрисовка интерфейса
  Отвечает за: все обновления DOM — таймер, лента, шкала Бараката, статы
  Когда менять: при изменении структуры HTML или визуальной логики отображения
  Не путать с: timer.js (логика подсчёта) и storage.js (данные)
               Этот файл ТОЛЬКО читает данные и рисует, никогда не пишет в storage
*/

const Render = (() => {

  // ── Кэш элементов DOM ────────────────────────

  const $ = id => document.getElementById(id);

  const els = {
    dateLabel:      $('date-label'),
    currentTag:     $('current-tag'),
    currentName:    $('current-name'),
    timerDisplay:   $('timer-display'),
    barakatFill:    $('barakat-fill'),
    barakatEnemy:   $('barakat-enemy'),
    barakatRatio:   $('barakat-ratio'),
    barakatFocus:   $('barakat-focus-time'),
    barakatWaste:   $('barakat-waste-time'),
    statFocus:      $('stat-focus'),
    statWaste:      $('stat-waste'),
    statBase:       $('stat-base'),
    logList:        $('log-list'),
    exportFeedback: $('export-feedback'),
    notesSaved:     $('notes-saved'),
  };

  // ── Дата в шапке ─────────────────────────────

  function updateDateLabel() {
    const d = new Date();
    const days = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
    const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
    els.dateLabel.textContent =
      `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
  }

  // ── Текущая активность ───────────────────────

  const TAG_NAMES = {
    focus: '▲ Чистый фокус',
    waste: '▼ Пожиратель',
    base:  '◆ Базовые нужды',
  };

  function updateCurrentActivity() {
    const current = Storage.getCurrent();
    if (!current) {
      els.currentTag.textContent = '—';
      els.currentTag.removeAttribute('data-tag');
      els.currentName.textContent = 'Нажми «Сменить активность»';
      return;
    }
    els.currentTag.textContent = TAG_NAMES[current.tag] || current.tag;
    els.currentTag.setAttribute('data-tag', current.tag);
    els.currentName.textContent = current.name;
  }

  // ── Таймер ───────────────────────────────────

  function updateTimer(seconds) {
    els.timerDisplay.textContent = Timer.formatHMS(seconds);
  }

  // ── Шкала Бараката ───────────────────────────

  function updateBarakat() {
    const stats = Timer.getTodayStats();
    const focusSec = stats.focus;
    const wasteSec = stats.waste;
    const total    = focusSec + wasteSec;

    if (total === 0) {
      els.barakatFill.style.width  = '0%';
      els.barakatEnemy.style.width = '0%';
      els.barakatRatio.textContent = '—';
    } else {
      const focusPct = Math.round((focusSec / total) * 100);
      const wastePct = 100 - focusPct;
      els.barakatFill.style.width  = focusPct + '%';
      els.barakatEnemy.style.width = wastePct + '%';
      els.barakatRatio.textContent = `${focusPct}% / ${wastePct}%`;
    }

    els.barakatFocus.textContent = 'Фокус: ' + Timer.formatShort(focusSec);
    els.barakatWaste.textContent = 'Потери: ' + Timer.formatShort(wasteSec);
  }

  // ── Мини-статы ───────────────────────────────

  function updateDayStats() {
    const stats = Timer.getTodayStats();
    els.statFocus.querySelector('.stat-val').textContent = Timer.formatShort(stats.focus);
    els.statWaste.querySelector('.stat-val').textContent = Timer.formatShort(stats.waste);
    els.statBase.querySelector('.stat-val').textContent  = Timer.formatShort(stats.base);
  }

  // ── Лента записей ────────────────────────────

  const TAG_LABELS = {
    focus: 'Фокус',
    waste: 'Потери',
    base:  'Базовые',
  };

  /** Timestamp → 'HH:MM' */
  function _time(ts) {
    const d = new Date(ts);
    return String(d.getHours()).padStart(2, '0') + ':'
         + String(d.getMinutes()).padStart(2, '0');
  }

  /** 'YYYY-MM-DD' → 'ДД.ММ.ГГГГ' */
  function _formatDate(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.${y}`;
  }

  /**
   * Отрисовать ленту.
   * @param {string} filter — 'today' | 'week' | 'all'
   */
  function renderLog(filter) {
    let entries;
    if (filter === 'today') {
      entries = Storage.getEntriesByDate(Storage.todayKey());
    } else if (filter === 'week') {
      entries = Storage.getEntriesLastDays(7);
    } else {
      entries = Storage.getEntries();
    }

    entries = [...entries].sort((a, b) => b.startedAt - a.startedAt); // новые сверху

    if (entries.length === 0) {
      els.logList.innerHTML = '<div class="log-empty">Записей пока нет</div>';
      return;
    }

    // Группируем по дате
    const byDate = {};
    entries.forEach(e => {
      if (!byDate[e.date]) byDate[e.date] = [];
      byDate[e.date].push(e);
    });

    const dates = Object.keys(byDate).sort().reverse();
    const today = Storage.todayKey();
    let html = '';

    dates.forEach(date => {
      const label = date === today ? 'Сегодня' : _formatDate(date);
      html += `<div class="log-date-sep">${label}</div>`;

      byDate[date].forEach(e => {
        html += `
          <div class="log-item" data-tag="${e.tag}">
            <div class="log-item-bar"></div>
            <div class="log-item-body">
              <div class="log-item-name">${_escape(e.name)}</div>
              <div class="log-item-time">
                ${_time(e.startedAt)} – ${_time(e.endedAt)}
                &nbsp;·&nbsp; ${TAG_LABELS[e.tag] || e.tag}
              </div>
            </div>
            <div class="log-item-dur">${Timer.formatShort(e.duration)}</div>
          </div>
        `;
      });
    });

    els.logList.innerHTML = html;
  }

  /** Экранирование HTML в пользовательских строках */
  function _escape(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Фидбэк сообщения ────────────────────────

  let _feedbackTimeout = null;

  function showExportFeedback(text) {
    els.exportFeedback.textContent = text;
    els.exportFeedback.classList.add('visible');
    clearTimeout(_feedbackTimeout);
    _feedbackTimeout = setTimeout(() => {
      els.exportFeedback.classList.remove('visible');
    }, 2500);
  }

  let _notesSavedTimeout = null;

  function showNotesSaved() {
    els.notesSaved.textContent = '✓ Сохранено';
    els.notesSaved.classList.add('visible');
    clearTimeout(_notesSavedTimeout);
    _notesSavedTimeout = setTimeout(() => {
      els.notesSaved.classList.remove('visible');
    }, 2000);
  }

  // ── Главный апдейт (вызывается каждую секунду) ──

  function updateMain(elapsed) {
    updateTimer(elapsed);
    updateBarakat();
    updateDayStats();
  }

  // ── Инициализация ────────────────────────────

  function init() {
    updateDateLabel();
    setInterval(updateDateLabel, 60000); // обновляем дату раз в минуту
    updateCurrentActivity();
    updateBarakat();
    updateDayStats();

    const current = Storage.getCurrent();
    if (current) {
      const elapsed = Math.floor((Date.now() - current.startedAt) / 1000);
      updateTimer(elapsed);
    }
  }

  return {
    init,
    updateMain,
    updateCurrentActivity,
    updateBarakat,
    updateDayStats,
    renderLog,
    showExportFeedback,
    showNotesSaved,
  };

})();
