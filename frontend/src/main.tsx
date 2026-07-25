import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

// The service worker is registered by vite-plugin-pwa (registerType:
// 'autoUpdate'), which installs a new worker in the background but leaves the
// running page on its old JavaScript. An installed PWA can go days without a
// manual reload, so it ends up talking to a newer backend with a stale client.
// Reload once the new worker takes control.
if ('serviceWorker' in navigator) {
  // Null on a first-ever install; there's no stale page to replace in that case
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
