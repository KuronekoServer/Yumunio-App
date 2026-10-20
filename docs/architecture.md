# 構成と認証

## 接続の流れ

1. 同梱された接続画面で利用者がサーバーのオリジンを指定する。
2. TypeScript と Rust の両方でURLを検証する。
3. Rust の HTTP クライアントが `/health`・`/api/instance`・`/api/auth/config` を確認する。
4. 接続先の公開名とURLを画面に表示する。
5. 利用者が「ログイン画面を開く」を選択したら、確認済みのオリジンの `/account` へ同じ WebView を遷移させる。
6. 以降はサーバーの Web アプリが認証、ワークスペースの選択、編集、同期を処理する。

`setup-required` のサーバーは、手順5で `/setup` を開きます。接続確認はサーバーが申告する公開APIとの互換性確認です。接続先の信頼性は、利用者が指定したURLとHTTPS証明書に基づきます。

## 同じオリジンでログインする理由

現在の Yumunio は Better Auth を `/api/auth` に配置し、サーバーの公開オリジンを信頼する設定です。ブラウザー向けの画面も、同じオリジンの Cookie・API・WebSocket を使用します。

アプリ独自のパスワードフォームや Cookie 転送プロキシを作らず、WebView をサーバーのオリジンへ遷移させます。Cookie の設定・読み取り・ログアウトはサーバーとOSの WebView が管理します。ネイティブ側の接続確認クライアントは Cookie jar を持ちません。アプリがパスワードやセッショントークンを保存する処理もありません。

接続先ごとの Cookie と Web Storage は WebView のオリジンで分離されます。同じオリジンで複数のアカウントを同時利用するための独立プロファイルはありません。アカウントを切り替える場合はサーバー側でログアウトします。リストから接続先を削除しても Cookie は消去しません。

## ネイティブ権限

`launcher` capability は同梱画面にだけ適用し、`remote.urls` は指定しません。許可するコマンドは `probe_server` と `connect_server` だけです。`build.rs` でアプリのコマンドを ACL の対象として宣言し、Rust 内でも呼び出し元が同梱画面の完全なURLであることを確認します。

接続先にはファイルシステム、シェル、任意HTTPリクエスト、OS操作のIPC権限を渡しません。確認済みのオリジンを Rust の状態に保持し、その接続確認が成功したオリジンにだけ `connect_server` で遷移できます。

HTTP クライアントはリダイレクトを追跡せず、接続5秒・リクエスト10秒のタイムアウトと、JSON応答64 KiBの上限を設定します。証明書検証を無効化しません。TLS ルートは同梱した rustls / WebPKI を使用するため、組織独自の CA をOSへ追加するだけでは接続できない場合があります。

## サーバー選択へ戻る操作

WebView の読込完了後に、公開HTTP(S)ページへ小さなナビゲーションボタンを追加します。閉じた Shadow DOM と CSSOM を使い、サーバーの CSP を書き換えません。ボタンは現在のページのホスト名を表示します。OAuth の画面も現在のホスト名を確認できます。

ボタンが指定する `https://yumunio-app.invalid/launcher` は Rust のナビゲーションフックで遮断し、ネットワークへ送らず同梱画面へ戻します。このURLは外部入力やコマンド引数を受け付けません。デスクトップにはメニューと `Ctrl/Cmd + Shift + S` の代替操作もあります。

新規ウィンドウ要求は同じ WebView で開きます。HTTPS の認証遷移を許可しますが、`file:`・`javascript:`・任意の外部アプリスキームへのトップレベル遷移は許可しません。プロバイダーがシステムブラウザーでのOAuthを必須とする場合、PKCEとサーバー側の引き継ぎAPIが必要です。現在のサーバーにはその契約がないため実装していません。

接続先のページ自体がボタンを削除したり、読込が完了しなかったりする場合に備え、アプリを再起動すれば必ず同梱画面から始まります。モバイルのOSによる戻る操作・ダウンロード・ファイル選択・外部ログインは、配布前に実機で確認してください。

## 対応端末

画面幅760px以下では下部ナビゲーション、それより広い画面ではサーバー一覧を左に配置します。幅1140px以下では装飾を省いて接続操作の領域を確保します。縦横の回転やウィンドウのリサイズで入力状態を作り直しません。

同梱画面は標準の `dialog` と `svh` を使うため、macOS 12.3 / iOS・iPadOS 15.4 以降を対象にします。[WebKit の Safari 15.4 の案内](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/)に対応機能が記載されています。

`horizontal-viewport-segments` と `env(viewport-segment-*)` を実装する WebView では、左右の画面領域とヒンジの幅を使って配置します。非対応の WebView では通常の幅に応じたレイアウトを使用します。折りたたみハードウェアやiPadの Split View での実機動作を確認したという意味ではありません。

## 参考にした公式資料

- [Tauri 2 の前提条件](https://v2.tauri.app/start/prerequisites/)
- [Tauri capabilities とリモートAPI権限](https://v2.tauri.app/security/capabilities/)
- [Tauri WebviewWindowBuilder](https://docs.rs/tauri/latest/tauri/webview/struct.WebviewWindowBuilder.html)
- [Tauri プラットフォーム設定](https://v2.tauri.app/reference/config/)

Yumunio のローカルソース `apps/server/server.mjs`・`apps/worker/worker.js`・`packages/identity/src/index.js`・`packages/identity/src/instance.js` を確認して接続契約を合わせています。サーバーの接続APIの変更は不要です。編集画面の自動保存の変更は、Yumunio 本体のリポジトリで管理します。
