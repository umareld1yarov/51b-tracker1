/*
  sw.js — Service Worker (офлайн-режим PWA)
  Отвечает за: кэширование всех файлов приложения для работы без интернета
  Когда менять: при добавлении новых файлов в проект (добавь в CACHE_FILES)
                или при значительном обновлении — смени CACHE_NAME версию
  Не путать с: storage.js (это данные пользователя, а sw.js — файлы приложения)
*/

const CACHE_NAME = 'tracker-51b-v1';

const CACHE_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/storage.js',
  '/js/timer.js',
  '/js/export.js',
  '/js/render.js',
  '/js/app.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Установка: кэшируем все файлы
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CACHE_FILES))
  );
  self.skipWaiting();
});

// Активация: удаляем старые кэши
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Запросы: сначала кэш, потом сеть
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
