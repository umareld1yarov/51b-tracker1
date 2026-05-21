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

  // ── Дата в шапке главного экрана ──────────────

  function updateDateLabel() {
    const d = new Date();
    const days = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
    const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
    els.dateLabel.textContent =
      `${days[d.getDay() ]}, ${d.getDate()} ${months[d.getMonth()]}`;
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

  // ── Лента записей (Посуточная навигация) ──────

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

  /**
   * Отрисовать ленту за выбранные сутки.
   * @param {Date} targetDate — Объект выбранной даты из календаря app.js
   */
  function renderLog(targetDate) {
    // 1. Генерируем ISO-ключ (YYYY-MM-DD) для запроса к Storage
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const d = String(targetDate.getDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${d}`;

    // 2. Обновляем текстовую метку даты внутри навигации календаря
    const daysShort = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
    const monthsShort = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
    const calLabel = $('calendar-date-label');
    if (calLabel) {
      calLabel.textContent = `${daysShort[targetDate.getDay()]}, ${targetDate.getDate()} ${monthsShort[targetDate.getMonth()]}`;
    }

    // 3. Загружаем данные за этот день
    let entries = Storage.getEntriesByDate(dateKey) || [];
    
    // Сортируем ХРОНОЛОГИЧЕСКИ (от ранних утренних к вечерним)
    entries = [...entries].sort((a, b) => a.startedAt - b.startedAt);

    // 4. Подсчитываем итоги дня для футера и индикатора
    const totals = { focus: 0, waste: 0, base: 0 };
    entries.forEach(e => {
      if (totals[e.tag] !== undefined) totals[e.tag] += e.duration;
    });

    // Обновляем циферки в нижнем футере ленты
    const fSum = $('sum-focus');
    const wSum = $('sum-waste');
    const bSum = $('sum-base');
    if (fSum && wSum && bSum) {
      fSum.textContent = Timer.formatShort(totals.focus);
      wSum.textContent = Timer.formatShort(totals.waste);
      bSum.textContent = Timer.formatShort(totals.base);
    }

    // 5. Управление цветной точкой Бараката дня (🟢 / 🔴 / 🔵)
    const dotEl = $('calendar-dot');
    if (dotEl) {
      if (entries.length === 0) {
        dotEl.style.backgroundColor = 'var(--c-muted)'; // Серый — пусто
      } else if (totals.focus >= totals.waste && totals.focus >= totals.base) {
        dotEl.style.backgroundColor = 'var(--c-focus)'; // Зеленый — продуктивный день
      } else if (totals.waste > totals.focus && totals.waste >= totals.base) {
        dotEl.style.backgroundColor = 'var(--c-waste)'; // Красный — доминируют потери
      } else {
        dotEl.style.backgroundColor = 'var(--c-base)';  // Синий — базовые дела
      }
    }

    // 6. Вывод заглушки, если день пустой
    if (entries.length === 0) {
      els.logList.innerHTML = '<div class="log-empty">Записей за этот день нет</div>';
      return;
    }

    // 7. Сборка HTML структуры списка
    let html = '';
    entries.forEach(e => {
      // Сохраняем startedAt в data-id, чтобы app.js мог открыть модалку при клике
      html += `
        <div class="log-item" data-tag="${e.tag}" data-id="${e.startedAt}">
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
    setInterval(updateDateLabel, 60000);
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
    renderLog, // Теперь принимает объект даты типа Date()
    showExportFeedback,
    showNotesSaved,
  };

})();
