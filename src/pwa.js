import { isPhone } from './device.js';

export function createUpdateGate({ playing, reload }) {
  let requested = false;
  let ready = false;
  const resume = () => {
    if (!ready || playing()) return false;
    requested = ready = false;
    reload();
    return true;
  };
  return { request() { requested = true; }, activated(replaced = false) { ready = requested || replaced; return resume(); }, resume };
}

// The shell still works without SW support. Register only the production bundle, never Vite.
export function createPwa({ playing, toast }) {
  const gate = createUpdateGate({ playing, reload: () => location.reload() });
  document.documentElement.dataset.phone = String(isPhone());
  const card = document.createElement('aside');
  card.id = 'offline-card';
  card.className = 'offline-card';
  card.hidden = true;
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', "you're offline");
  card.innerHTML = `<p class="kindline">vyvanse.beer</p><p class="wm">you're offline</p>
    <p>The shelf is here. Games need a connection.</p>
    <div class="ask__acts"><button class="btn" type="button" data-browse>Browse menu</button><button class="btn btn--ghost" type="button" data-retry>Try again</button></div>`;
  document.body.append(card);
  const dismiss = () => { card.hidden = true; };
  const show = () => { card.hidden = false; card.querySelector('button').focus({ preventScroll: true }); };
  card.querySelector('[data-browse]').addEventListener('click', dismiss);
  card.querySelector('[data-retry]').addEventListener('click', () => {
    if (navigator.onLine) { dismiss(); location.reload(); }
    else toast('still offline. reconnect to play.');
  });
  addEventListener('offline', () => !playing() && show());
  addEventListener('online', dismiss);
  if (!navigator.onLine) show();

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    let waiting = null;
    const update = document.createElement('button');
    update.className = 'tog pwa-update';
    update.type = 'button';
    update.hidden = true;
    update.textContent = 'update';
    update.title = 'Install the new launcher and reload the menu';
    document.querySelector('.top__right').prepend(update);
    update.addEventListener('click', () => {
      if (!waiting || playing()) return;
      gate.request();
      waiting.postMessage({ type: 'vyvanse:update' });
    });
    let controlled = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Another launcher window can activate an update too. Every old client must eventually
      // reload into the new shell, while first installation needs no interruption.
      gate.activated(controlled);
      controlled = true;
    });
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(reg => {
      const offer = () => { waiting = reg.waiting; update.hidden = !waiting; };
      offer();
      reg.addEventListener('updatefound', () => reg.installing?.addEventListener('statechange', offer));
      let checked = Date.now();
      document.addEventListener('visibilitychange', () => {
        if (document.hidden || Date.now() - checked < 60 * 60 * 1000) return;
        checked = Date.now();
        reg.update().catch(() => {});
      });
      addEventListener('online', () => reg.update().catch(() => {}));
      reg.update().catch(() => {});
    }).catch(() => toast('offline setup unavailable. the online menu still works.'));
  }
  return { card, dismiss, show, resume: gate.resume, canPlay() { if (navigator.onLine) return true; show(); return false; } };
}
