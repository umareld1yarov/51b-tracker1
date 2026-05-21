/*
  js/app.js — Точка входа, оркестратор приложения
  Отвечает за: инициализацию всех модулей, навигацию, обработку событий UI
  Когда менять: при добавлении нового экрана, новой кнопки или глобальной логики
  Не путать с: остальные модули — каждый отвечает только за свою область

  Порядок инициализации:
    1. storage.js (уже загружен, IIFE)
    2. timer.js   (уже загружен, IIFE)
    3. export.js  (уже загружен, IIFE)
    4. render.js  (уже загружен, IIFE)
    5. app.js     → DOMContentLoaded → всё связываем
*/

document.addEventListener('DOMContentLoaded', () => {

  // ── Service Worker ───────────────────────────
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // ── Глобальное состояние текущей даты ─────────
  let currentSelectedDate = new Date(); // Хранит день, который сейчас открыт в ленте

  // ── Инициализация модулей ────────────────────

  Render.init();

  Timer.init(
    // Каждую секунду → обновляем UI главного экрана
    (elapsed) => {
      Render.updateMain(elapsed);
    },
    // При смене активности → обновляем текущий блок и ленту (если мы на её экране)
    () => {
      Render.updateCurrentActivity();
      Render.updateBarakat();
      Render.updateDayStats();
      if (activeScreen === 'log') {
        Render.renderLog(currentSelectedDate);
      }
    }
  );

  // ── Навигация по экранам ──────────────────────

  const navBtns    = document.querySelectorAll('.nav-btn');
  const screens    = document.querySelectorAll('.screen');
  let activeScreen = 'main';

  function switchScreen(screenId) {
    activeScreen = screenId;
    navBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.screen === screenId);
    });
    screens.forEach(s => {
      s.classList.toggle('active', s.id === `screen-${screenId}`);
    });

    // При переходе на ленту — рендерим выбранный день
    if (screenId === 'log') {
      Render.renderLog(currentSelectedDate);
    }

    // При переходе на манифест — загружаем текст
    if (screenId === 'notes') {
      document.getElementById('notes-area').value = Storage.getNotes();
    }
  }

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => switchScreen(btn.dataset.screen));
  });

  // ── Посуточный календарь (Навигация) ──────────

  const btnPrev = document.getElementById('cal-prev');
  const btnNext = document.getElementById('cal-next');

  if (btnPrev && btnNext) {
    btnPrev.addEventListener('click', () => {
      currentSelectedDate.setDate(currentSelectedDate.getDate() - 1);
      Render.renderLog(currentSelectedDate);
    });

    btnNext.addEventListener('click', () => {
      currentSelectedDate.setDate(currentSelectedDate.getDate() + 1);
      Render.renderLog(currentSelectedDate);
    });
  }

  // ── Модальное окно смены активности ──────────

  const modal        = document.getElementById('modal-overlay');
  const modalInput   = document.getElementById('modal-input');
  const tagBtns      = document.querySelectorAll('.tag-btn');
  const btnSwitch    = document.getElementById('btn-switch');
  const btnCancel    = document.getElementById('btn-cancel');
  const btnConfirm   = document.getElementById('btn-confirm');

  let selectedTag = 'focus';

  function openModal() {
    modalInput.value = '';
    selectedTag = 'focus';
    tagBtns.forEach(b => {
      b.classList.toggle('selected', b.dataset.tag === 'focus');
    });
    modal.classList.add('open');
    setTimeout(() => modalInput.focus(), 300);
  }

  function closeModal() {
    modal.classList.remove('open');
    modalInput.blur();
  }

  if (btnSwitch)  btnSwitch.addEventListener('click', openModal);
  if (btnCancel)  btnCancel.addEventListener('click', closeModal);

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  tagBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedTag = btn.dataset.tag;
      tagBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  modalInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmSwitch();
  });

  if (btnConfirm) btnConfirm.addEventListener('click', confirmSwitch);

  function confirmSwitch() {
    const name = modalInput.value.trim();
    if (!name) {
      modalInput.style.borderColor = 'var(--c-waste)';
      setTimeout(() => { modalInput.style.borderColor = ''; }, 800);
      modalInput.focus();
      return;
    }
    closeModal();
    Timer.switchActivity(name, selectedTag);
  }

  // ── Нижняя шторка деталей активности ───────────

  const detailModal = document.getElementById('detail-modal-overlay');
  const detailName  = document.getElementById('detail-name');
  const detailTime  = document.getElementById('detail-time');
  const btnDelLog   = document.getElementById('btn-delete-log');
  const btnCloseDet = document.getElementById('btn-close-detail');

  let activeLogId = null; // Будет хранить startedAt выбранной записи

  // Открытие деталей при клике на элемент ленты (делегирование событий)
  document.getElementById('log-list')?.addEventListener('click', (e) => {
    const item = e.target.closest('.log-item');
    if (!item) return;

    const logId = parseInt(item.dataset.id, 10);
    const entry = Storage.getEntries().find(x => x.startedAt === logId);
    
    if (entry) {
      activeLogId = logId;
      detailName.textContent = entry.name;
      
      const start = new Date(entry.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const end = new Date(entry.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      detailTime.textContent = `${start} – ${end} (${Timer.formatShort(entry.duration)})`;
      
      detailModal.classList.add('open');
    }
  });

  function closeDetailModal() {
    detailModal?.classList.remove('open');
    activeLogId = null;
  }

  btnCloseDet?.addEventListener('click', closeDetailModal);
  detailModal?.addEventListener('click', (e) => {
    if (e.target === detailModal) closeDetailModal();
  });

  // Удаление записи
  btnDelLog?.addEventListener('click', () => {
    if (!activeLogId) return;
    
    if (confirm('Удалить эту запись из истории?')) {
      Storage.deleteEntry(activeLogId);
      closeDetailModal();
      Render.renderLog(currentSelectedDate); // Обновляем текущие сутки
      Render.updateBarakat();               // Пересчитываем глобальные счетчики
      Render.updateDayStats();
    }
  });

  // ── Глобальный Экспорт / Экспорт дня ───────────

  document.querySelectorAll('.btn-export').forEach(btn => {
    btn.addEventListener('click', async () => {
      let range = btn.dataset.range;
      let toastText = '';

      if (range === 'day') {
        // Формируем YYYY-MM-DD из просматриваемой даты календаря
        const y = currentSelectedDate.getFullYear();
        const m = String(currentSelectedDate.getMonth() + 1).padStart(2, '0');
        const d = String(currentSelectedDate.getDate()).padStart(2, '0');
        range = `${y}-${m}-${d}`;
        toastText = `✓ Отчет за ${d}.${m} скопирован`;
      } else {
        const labels = { today: 'Сегодня', week: 'Неделя', all: 'Всё время' };
        toastText = `✓ ${labels[range] || 'Данные'} скопированы в буфер`;
      }

      const ok = await Export.copyToClipboard(range);
      if (ok) {
        Render.showExportFeedback(toastText);
      } else {
        Render.showExportFeedback('✗ Не удалось скопировать');
      }
    });
  });

  // ── Манифест / Заметки ────────────────────────

  const btnSaveNotes = document.getElementById('btn-save-notes');
  const notesArea    = document.getElementById('notes-area');

  btnSaveNotes?.addEventListener('click', () => {
    if (notesArea) {
      Storage.setNotes(notesArea.value);
      Render.showNotesSaved();
    }
  });

  notesArea?.addEventListener('blur', () => {
    Storage.setNotes(notesArea.value);
  });

});
