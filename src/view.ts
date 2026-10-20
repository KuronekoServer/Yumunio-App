import { icon } from './icons';

const html = String.raw;

export function createLauncherView(nativeAvailable: boolean): string {
  // Templates contain repository-owned markup only. Server-provided values use textContent.
  return html`
    <div class="app-layout">
      <aside class="sidebar" aria-label="サーバーの管理">
        <a class="brand" href="#" aria-label="Yumunio ホーム"
          ><img src="/icon.svg" alt="" width="30" height="30" /><span>Yumunio</span></a
        >
        <button class="new-server sidebar-action" type="button">
          ${icon('plus')}<span>サーバーを追加</span><kbd>⌘ K</kbd>
        </button>
        <div class="server-section-heading">
          <span>マイサーバー</span><span class="server-count">0</span>
        </div>
        <div class="server-list"></div>
        <div class="sidebar-bottom">
          <button class="sidebar-action" data-dialog="settings-dialog" type="button">
            ${icon('settings')}<span>設定</span>
          </button>
          <div class="local-note">${icon('shield')}<span>接続先は、この端末に保存。</span></div>
        </div>
      </aside>
      <main class="main">
        <header class="topbar">
          <span class="breadcrumb">ワークスペースに接続</span
          ><button class="help-button" data-dialog="help-dialog" type="button">
            ${icon('help')}<span>接続について</span>
          </button>
        </header>
        <div class="welcome-layout">
          <section class="connection-section" aria-labelledby="welcome-title">
            <div class="eyebrow"><span class="eyebrow-line"></span>YOUR SPACE, YOUR SERVER</div>
            <h1 id="welcome-title">あなたの場所へ、<br /><span>つながろう。</span></h1>
            <p class="intro">
              ノートも、アイデアも、チームの仕事も。<br />いつもの Yumunio
              を、あなたのサーバーから。
            </p>
            <section class="connection-card" aria-label="接続先の入力">
              <div class="card-heading">
                <span class="step-number">01</span>
                <h2>サーバーに接続</h2>
              </div>
              <form id="connection-form" novalidate>
                <label for="server-url">サーバーURL</label>
                <div class="url-field">
                  ${icon('globe')}<input
                    id="server-url"
                    name="serverUrl"
                    type="url"
                    inputmode="url"
                    autocomplete="url"
                    autocapitalize="none"
                    spellcheck="false"
                    placeholder="https://notes.example.com"
                    maxlength="2048"
                    aria-describedby="url-hint connection-message"
                    required
                  /><button
                    class="clear-input icon-button"
                    type="button"
                    aria-label="URLを消去"
                    hidden
                  >
                    ${icon('close')}
                  </button>
                </div>
                <p class="field-hint" id="url-hint">
                  管理者から案内されたサーバーのURLを入力してください。
                </p>
                <div
                  id="connection-message"
                  class="connection-message"
                  role="status"
                  aria-live="polite"
                  hidden
                ></div>
                <div id="verified-server" class="verified-server" hidden>
                  <span class="verified-symbol">${icon('check')}</span>
                  <div><strong id="verified-name"></strong><span id="verified-origin"></span></div>
                  <span class="status-pill">接続を確認</span>
                </div>
                <button class="primary-button" id="connect-button" type="submit">
                  <span>接続先を確認する</span>${icon('arrow')}
                </button>
                <button class="change-server text-button" type="button" hidden>
                  別のURLを入力する
                </button>
              </form>
              <div class="privacy-note">
                ${icon('shield')}
                <p>
                  ログイン情報とデータは、<br class="small-only" />接続先のサーバーで管理されます。
                </p>
              </div>
            </section>
            <p class="first-time">
              はじめて使いますか？
              <button data-dialog="help-dialog" type="button">
                接続の手順を見る ${icon('arrow')}
              </button>
            </p>
          </section>
          <aside class="story" aria-label="Yumunioについて">
            <div class="story-visual" aria-hidden="true">
              <div class="orbit orbit-one"></div>
              <div class="orbit orbit-two"></div>
              <div class="floating-label"><span class="tiny-dot"></span>余白から、はじまる。</div>
              <div class="paper paper-back"></div>
              <div class="paper paper-front">
                <div class="paper-top">
                  <span class="paper-symbol">y.</span><span class="paper-dots">•••</span>
                </div>
                <div class="paper-title">小さなアイデアを、<br />次の一歩に。</div>
                <div class="paper-line long"></div>
                <div class="paper-line"></div>
                <div class="paper-grid">
                  <div>
                    <span class="mini-label">IDEA</span>
                    <div class="mini-line"></div>
                    <div class="mini-line short"></div>
                  </div>
                  <div>
                    <span class="mini-label">MAKE IT</span>
                    <div class="mini-check">✓ <span></span></div>
                    <div class="mini-check">✓ <span></span></div>
                  </div>
                </div>
                <div class="paper-bottom"><span></span><span></span><span></span><i></i></div>
              </div>
              <div class="leaf leaf-one"></div>
              <div class="leaf leaf-two"></div>
              <span class="spark spark-one">✳</span><span class="spark spark-two">+</span>
              <div class="visual-caption">A LITTLE ROOM FOR BIG IDEAS.</div>
            </div>
            <div class="story-copy">
              <h2>考える場所を、自由に。</h2>
              <p>
                使うサーバーも、使うデバイスも、あなた次第。<br />いつものワークスペースを、どこにいても。
              </p>
            </div>
            <div class="platforms" aria-label="Windows、macOS、Android、iPhone、タブレットに対応">
              ${icon('laptop')}<span>Desktop</span><span class="platform-divider"></span
              ><svg
                class="icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.65"
                aria-hidden="true"
              >
                <rect x="7" y="2" width="10" height="20" rx="2" />
                <path d="M10 18h4" /></svg
              ><span>Mobile & Tablet</span>
            </div>
          </aside>
        </div>
        <footer class="footer">
          <span><span class="tiny-dot"></span>オープンソース。あなたのサーバーで。</span
          ><span class="version">v0.1.0${nativeAvailable ? '' : ' · 画面プレビュー'}</span>
        </footer>
      </main>
      <nav class="mobile-nav" aria-label="アプリの操作">
        <button class="new-server active" type="button">${icon('plus')}<span>接続する</span></button
        ><button id="show-servers" type="button">${icon('server')}<span>マイサーバー</span></button
        ><button data-dialog="settings-dialog" type="button">
          ${icon('settings')}<span>設定</span>
        </button>
      </nav>
    </div>
    <dialog id="help-dialog" class="app-dialog">
      <div class="dialog-heading">
        <h2>いつもの場所へ、3つのステップ。</h2>
        <button class="close-dialog icon-button" type="button" aria-label="閉じる">
          ${icon('close')}
        </button>
      </div>
      <ol class="help-steps">
        <li>
          <strong>サーバーのURLを入力</strong>
          <p>セルフホストしている Yumunio の公開URLを入力します。例: https://notes.example.com</p>
        </li>
        <li>
          <strong>接続先を確認</strong>
          <p>サーバーが応答したら、表示された接続先を確認してログイン画面を開きます。</p>
        </li>
        <li>
          <strong>サーバーにログイン</strong>
          <p>
            接続先のアカウントでログインします。利用できるログイン方法はサーバーの設定によって異なります。
          </p>
        </li>
      </ol>
      <div class="help-callout">
        接続中は画面の「サーバー」ボタンから戻れます。パソコンではアプリのメニューも利用できます。
      </div>
      <p class="dialog-note">
        自分でサーバーを用意する場合は、<a
          href="https://github.com/KuronekoServer/Yumunio"
          target="_blank"
          rel="noreferrer"
          >Yumunio の公開リポジトリ</a
        >をご覧ください。
      </p>
    </dialog>
    <dialog id="settings-dialog" class="app-dialog">
      <div class="dialog-heading">
        <h2>アプリの設定</h2>
        <button class="close-dialog icon-button" type="button" aria-label="閉じる">
          ${icon('close')}
        </button>
      </div>
      <fieldset class="theme-settings">
        <legend>表示テーマ</legend>
        <div class="theme-options">
          <label
            ><input type="radio" name="theme" value="system" />${icon('laptop')}<span
              >端末に合わせる</span
            ></label
          ><label
            ><input type="radio" name="theme" value="light" />${icon('sun')}<span
              >ライト</span
            ></label
          ><label
            ><input type="radio" name="theme" value="dark" />${icon('moon')}<span
              >ダーク</span
            ></label
          >
        </div>
      </fieldset>
      <div class="settings-note">
        <strong>この端末に保存されるもの</strong>
        <p>
          サーバーのURL・表示名・最後に開いた日時・表示テーマ。接続先を削除しても、サーバーのデータやログイン状態は削除されません。
        </p>
        <p>ログアウトは、接続先のアカウント画面から行ってください。</p>
      </div>
      <div class="about-app">
        <img src="/icon.svg" alt="" width="38" height="38" />
        <div><strong>Yumunio</strong><span>0.1.0 · MIT License</span></div>
      </div>
    </dialog>
    <dialog id="servers-dialog" class="app-dialog">
      <div class="dialog-heading">
        <h2>マイサーバー</h2>
        <button class="close-dialog icon-button" type="button" aria-label="閉じる">
          ${icon('close')}
        </button>
      </div>
      <div class="mobile-server-list server-list"></div>
      <button class="new-server secondary-button" type="button">
        ${icon('plus')}サーバーを追加
      </button>
    </dialog>
    <div class="toast" role="status" aria-live="polite" hidden></div>
  `;
}
