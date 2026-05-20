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

  // ── Инициализация модулей ────────────────────

  Render.init();

  Timer.init(
    // Каждую секунду → обновляем UI главного экрана
    (elapsed) => {
      Render.updateMain(elapsed);
    },
    // При смене активности → обновляем текущий блок и лог
    () => {
      Render.updateCurrentActivity();
      Render.updateBarakat();
      Render.updateDayStats();
      if (currentLogFilter) Render.renderLog(currentLogFilter);
    }
  );

  // ── Навигация ────────────────────────────────

  const navBtns   = document.querySelectorAll('.nav-btn');
  const screens   = document.querySelectorAll('.screen');
  let activeScreen = 'main';
  let currentLogFilter = 'today';

  function switchScreen(screenId) {
    activeScreen = screenId;
    navBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.screen === screenId);
    });
    screens.forEach(s => {
      s.classList.toggle('active', s.id === `screen-${screenId}`);
    });

    // При переходе на ленту — перерисовываем
    if (screenId === 'log') {
      Render.renderLog(currentLogFilter);
    }

    // При переходе на манифест — загружаем текст
    if (screenId === 'notes') {
      document.getElementById('notes-area').value = Storage.getNotes();
    }
  }

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => switchScreen(btn.dataset.screen));
  });

  // ── Фильтр ленты ─────────────────────────────

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn')
        .forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentLogFilter = btn.dataset.filter;
      Render.renderLog(currentLogFilter);
    });
  });

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
    // Задержка нужна, чтобы клавиатура не мешала анимации
    setTimeout(() => modalInput.focus(), 300);
  }

  function closeModal() {
    modal.classList.remove('open');
    modalInput.blur();
  }

  btnSwitch.addEventListener('click', openModal);

  btnCancel.addEventListener('click', closeModal);

  // Закрытие по клику на оверлей
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Выбор тега
  tagBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedTag = btn.dataset.tag;
      tagBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  // Подтверждение — Enter или кнопка
  modalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmSwitch();
  });

  btnConfirm.addEventListener('click', confirmSwitch);

  function confirmSwitch() {
    const name = modalInput.value.trim();
    if (!name) {
      modalInput.style.borderColor = 'var(--c-waste)';
      setTimeout(() => {
        modalInput.style.borderColor = '';
      }, 800);
      modalInput.focus();
      return;
    }
    closeModal();
    Timer.switchActivity(name, selectedTag);
  }

  // ── Экспорт ───────────────────────────────────

  document.querySelectorAll('.btn-export').forEach(btn => {
    btn.addEventListener('click', async () => {
      const range = btn.dataset.range;
      const ok = await Export.copyToClipboard(range);
      if (ok) {
        const labels = { today: 'Сегодня', week: 'Неделя', all: 'Всё время' };
        Render.showExportFeedback(`✓ ${labels[range]} скопировано в буфер`);
      } else {
        Render.showExportFeedback('✗ Не удалось скопировать');
      }
    });
  });

  // ── Манифест / Заметки ────────────────────────

  document.getElementById('btn-save-notes').addEventListener('click', () => {
    const text = document.getElementById('notes-area').value;
    Storage.setNotes(text);
    Render.showNotesSaved();
  });

  // ── Автосохранение манифеста при уходе ───────

  document.getElementById('notes-area').addEventListener('blur', () => {
    const text = document.getElementById('notes-area').value;
    Storage.setNotes(text);
  });

});
