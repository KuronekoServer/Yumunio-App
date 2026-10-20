import './styles.css';
import { icon } from './icons';
import { createLauncherView } from './view';
import { connectServer, nativeAvailable, probeServer } from './native';
import type { ServerConnection } from './native';
import { readPreferences, writePreferences } from './profiles';
import type { Theme } from './profiles';
import { normalizeServerUrl } from './server-url';

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = createLauncherView(nativeAvailable);

function element<T extends HTMLElement>(selector: string): T {
  return app.querySelector<T>(selector)!;
}

const form = element<HTMLFormElement>('#connection-form');
const urlInput = element<HTMLInputElement>('#server-url');
const connectButton = element<HTMLButtonElement>('#connect-button');
const message = element<HTMLDivElement>('#connection-message');
const verifiedCard = element<HTMLDivElement>('#verified-server');
const changeButton = element<HTMLButtonElement>('.change-server');
const clearButton = element<HTMLButtonElement>('.clear-input');
const preferences = readPreferences();
let connection: ServerConnection | null = null;
let busy = false;
let toastTimer = 0;

function toast(text: string): void {
  const notice = element<HTMLDivElement>('.toast');
  clearTimeout(toastTimer);
  notice.textContent = text;
  notice.hidden = false;
  toastTimer = window.setTimeout(() => {
    notice.hidden = true;
  }, 4500);
}

function persist(): void {
  if (!writePreferences(preferences))
    toast('この端末に設定を保存できませんでした。接続は続けられます。');
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  element<HTMLInputElement>(`input[name="theme"][value="${theme}"]`).checked = true;
}

function closeDialogs(): void {
  for (const dialog of app.querySelectorAll<HTMLDialogElement>('dialog[open]')) dialog.close();
}

function resetConnection(clearUrl = false): void {
  connection = null;
  verifiedCard.hidden = true;
  changeButton.hidden = true;
  message.hidden = true;
  urlInput.readOnly = false;
  urlInput.removeAttribute('aria-invalid');
  connectButton.querySelector('span')!.textContent = '接続先を確認する';
  if (clearUrl) urlInput.value = '';
  clearButton.hidden = !urlInput.value;
}

function renderServers(): void {
  element('.server-count').textContent = String(preferences.servers.length);
  for (const list of app.querySelectorAll<HTMLDivElement>('.server-list')) {
    list.replaceChildren();
    if (!preferences.servers.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-servers';
      empty.innerHTML = `${icon('server')}<p>まだ、接続先がありません。</p><span>一度つなげたサーバーが<br>ここに並びます。</span>`;
      list.append(empty);
    }
    for (const server of preferences.servers) {
      const row = document.createElement('div');
      row.className = 'server-row';
      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'saved-server';
      const avatar = document.createElement('span');
      avatar.className = 'server-avatar';
      avatar.textContent = Array.from(server.name)[0] || 'Y';
      const description = document.createElement('span');
      const name = document.createElement('strong');
      name.textContent = server.name;
      const address = document.createElement('small');
      address.textContent = new URL(server.origin).host;
      description.append(name, address);
      open.append(avatar, description);
      open.title = `${server.name} — ${server.origin}`;
      open.addEventListener('click', () => {
        if (busy) return;
        resetConnection();
        urlInput.value = server.origin;
        clearButton.hidden = false;
        closeDialogs();
        form.requestSubmit();
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'remove-server icon-button';
      remove.setAttribute('aria-label', `${server.name} の接続先を削除`);
      remove.innerHTML = icon('trash');
      remove.addEventListener('click', () => {
        preferences.servers = preferences.servers.filter((item) => item.origin !== server.origin);
        persist();
        renderServers();
        toast('この端末から接続先を削除しました。');
      });
      row.append(open, remove);
      list.append(row);
    }
  }
}

function setBusy(value: boolean): void {
  busy = value;
  connectButton.disabled = value;
  urlInput.disabled = value;
  clearButton.disabled = value;
  changeButton.disabled = value;
  form.setAttribute('aria-busy', String(value));
  connectButton.classList.toggle('loading', value);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (busy) return;
  message.hidden = true;
  urlInput.removeAttribute('aria-invalid');
  try {
    const origin = normalizeServerUrl(urlInput.value);
    urlInput.value = origin;
    setBusy(true);
    if (connection?.origin === origin) {
      connectButton.querySelector('span')!.textContent = 'ワークスペースを開いています…';
      const profile = {
        origin,
        name: connection.organizationName || connection.applicationName,
        lastOpened: new Date().toISOString(),
      };
      preferences.servers = [
        profile,
        ...preferences.servers.filter((server) => server.origin !== origin),
      ].slice(0, 20);
      // Persist before navigation: the current document is destroyed when the server opens.
      persist();
      renderServers();
      await connectServer(origin);
    } else {
      connectButton.querySelector('span')!.textContent = '接続を確認しています…';
      connection = await probeServer(origin);
      element('#verified-name').textContent =
        connection.organizationName || connection.applicationName;
      element('#verified-origin').textContent = connection.origin;
      verifiedCard.hidden = false;
      changeButton.hidden = false;
      urlInput.readOnly = true;
      clearButton.hidden = true;
    }
  } catch (error) {
    message.textContent =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : '接続できませんでした。URLとネットワークを確認してください。';
    message.hidden = false;
    urlInput.setAttribute('aria-invalid', 'true');
  } finally {
    setBusy(false);
    connectButton.querySelector('span')!.textContent = connection
      ? connection.setupRequired
        ? 'サーバーの初期設定を開く'
        : 'ログイン画面を開く'
      : '接続先を確認する';
  }
});

urlInput.addEventListener('input', () => {
  resetConnection();
});
changeButton.addEventListener('click', () => {
  resetConnection();
  urlInput.focus();
});
clearButton.addEventListener('click', () => {
  resetConnection(true);
  urlInput.focus();
});

for (const button of app.querySelectorAll<HTMLButtonElement>('.new-server')) {
  button.addEventListener('click', () => {
    if (busy) return;
    closeDialogs();
    resetConnection(true);
    urlInput.focus();
  });
}
element<HTMLAnchorElement>('.brand').addEventListener('click', (event) => {
  event.preventDefault();
  if (!busy) {
    resetConnection(true);
    urlInput.focus();
  }
});
for (const button of app.querySelectorAll<HTMLButtonElement>('[data-dialog]')) {
  button.addEventListener('click', () =>
    element<HTMLDialogElement>(`#${button.dataset.dialog}`).showModal(),
  );
}
element('#show-servers').addEventListener('click', () =>
  element<HTMLDialogElement>('#servers-dialog').showModal(),
);
for (const button of app.querySelectorAll<HTMLButtonElement>('.close-dialog')) {
  button.addEventListener('click', () => button.closest('dialog')!.close());
}
for (const dialog of app.querySelectorAll<HTMLDialogElement>('dialog')) {
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      dialog.close();
  });
}
for (const radio of app.querySelectorAll<HTMLInputElement>('input[name="theme"]')) {
  radio.addEventListener('change', () => {
    preferences.theme = radio.value as Theme;
    applyTheme(preferences.theme);
    persist();
  });
}

document.addEventListener('keydown', (event) => {
  if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
  if (event.key.toLowerCase() === 'k') {
    event.preventDefault();
    if (!busy) {
      closeDialogs();
      resetConnection();
      urlInput.focus();
      urlInput.select();
    }
  }
  if (event.key === ',') {
    event.preventDefault();
    closeDialogs();
    element<HTMLDialogElement>('#settings-dialog').showModal();
  }
});

if (!/Mac|iPhone|iPad/u.test(navigator.userAgent)) element('kbd').textContent = 'Ctrl K';
applyTheme(preferences.theme);
renderServers();
