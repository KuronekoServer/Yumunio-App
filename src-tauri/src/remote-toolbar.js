(() => {
  if (window.top !== window || document.getElementById('yumunio-app-navigation')) return;

  const host = document.createElement('div');
  host.id = 'yumunio-app-navigation';
  const root = host.attachShadow({ mode: 'closed' });
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = `‹ サーバー · ${location.host}`;
  button.setAttribute('aria-label', `${location.host} からサーバー選択画面に戻る`);
  button.title = 'Yumunio アプリのサーバー選択に戻る';

  // Use CSSOM properties so strict server style-src policies can remain intact.
  Object.assign(host.style, {
    position: 'fixed',
    bottom: 'max(12px, env(safe-area-inset-bottom))',
    right: 'max(12px, env(safe-area-inset-right))',
    zIndex: '2147483646',
    maxWidth: 'calc(100vw - 24px)',
    colorScheme: 'light dark',
  });
  Object.assign(button.style, {
    display: 'block',
    maxWidth: '100%',
    minHeight: '44px',
    padding: '10px 15px',
    border: '1px solid #7b877b55',
    borderRadius: '24px',
    background: 'light-dark(#f8faf5, #253127)',
    color: 'light-dark(#34594d, #c6ddc2)',
    font: '12px/1.5 system-ui, sans-serif',
    boxShadow: '0 3px 18px #0002',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  });
  // Older WebKit releases do not implement light-dark().
  if (!CSS.supports('color', 'light-dark(white, black)')) {
    button.style.background = '#f8faf5';
    button.style.color = '#34594d';
  }
  button.addEventListener('click', () => {
    location.assign('https://yumunio-app.invalid/launcher');
  });
  root.append(button);
  document.documentElement.append(host);
})();
