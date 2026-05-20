/*
  js/storage.js — Работа с хранилищем (localStorage)
  Отвечает за: чтение, запись и удаление всех данных приложения
  Когда менять: если переходишь на IndexedDB/Supabase — замени только этот файл,
                остальные модули трогать не нужно
  Не путать с: timer.js (логика таймера) и render.js (отрисовка)

  Структура данных в localStorage:
    'tracker_entries'  → JSON массив завершённых записей
    'tracker_current'  → JSON объект текущей активности (или null)
    'tracker_notes'    → строка — текст манифеста

  Структура одной записи (entry):
    {
      id:        string   — уникальный ID (timestamp при создании)
      name:      string   — название активности
      tag:       string   — 'focus' | 'waste' | 'base'
      startedAt: number   — Unix timestamp (ms) начала
      endedAt:   number   — Unix timestamp (ms) конца
      duration:  number   — длительность в секундах
      date:      string   — 'YYYY-MM-DD' дата начала
    }

  Структура текущей активности (current):
    {
      id:        string
      name:      string
      tag:       string
      startedAt: number
    }
*/

const Storage = (() => {

  const KEYS = {
    ENTRIES:  'tracker_entries',
    CURRENT:  'tracker_current',
    NOTES:    'tracker_notes',
  };

  // ── Вспомогательные ──────────────────────────

  function _read(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function _write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  // ── Записи (entries) ─────────────────────────

  /** Получить все завершённые записи */
  function getEntries() {
    return _read(KEYS.ENTRIES) || [];
  }

  /** Сохранить новую запись */
  function addEntry(entry) {
    const entries = getEntries();
    entries.push(entry);
    return _write(KEYS.ENTRIES, entries);
  }

  /** Получить записи за конкретную дату ('YYYY-MM-DD') */
  function getEntriesByDate(dateStr) {
    return getEntries().filter(e => e.date === dateStr);
  }

  /** Получить записи за последние N дней */
  function getEntriesLastDays(n) {
    const cutoff = Date.now() - n * 24 * 60 * 60 * 1000;
    return getEntries().filter(e => e.startedAt >= cutoff);
  }

  // ── Текущая активность ───────────────────────

  /** Получить текущую активность (или null) */
  function getCurrent() {
    return _read(KEYS.CURRENT);
  }

  /** Установить текущую активность */
  function setCurrent(current) {
    return _write(KEYS.CURRENT, current);
  }

  /** Очистить текущую активность */
  function clearCurrent() {
    localStorage.removeItem(KEYS.CURRENT);
  }

  // ── Манифест ─────────────────────────────────

  function getNotes() {
    return localStorage.getItem(KEYS.NOTES) || '';
  }

  function setNotes(text) {
    localStorage.setItem(KEYS.NOTES, text);
  }

  // ── Утилиты ──────────────────────────────────

  /** Форматировать дату как 'YYYY-MM-DD' из timestamp */
  function dateKey(ts) {
    const d = new Date(ts);
    return d.getFullYear() + '-'
      + String(d.getMonth() + 1).padStart(2, '0') + '-'
      + String(d.getDate()).padStart(2, '0');
  }

  /** Создать новую запись из текущей активности */
  function buildEntry(current, endedAt) {
    const duration = Math.floor((endedAt - current.startedAt) / 1000);
    return {
      id:        current.id,
      name:      current.name,
      tag:       current.tag,
      startedAt: current.startedAt,
      endedAt:   endedAt,
      duration:  duration,
      date:      dateKey(current.startedAt),
    };
  }

  /** Сегодняшняя дата как 'YYYY-MM-DD' */
  function todayKey() {
    return dateKey(Date.now());
  }

  return {
    getEntries,
    addEntry,
    getEntriesByDate,
    getEntriesLastDays,
    getCurrent,
    setCurrent,
    clearCurrent,
    getNotes,
    setNotes,
    buildEntry,
    todayKey,
    dateKey,
  };

})();
