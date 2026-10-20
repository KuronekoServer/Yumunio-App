# Yumunio App

セルフホストしている [Yumunio](https://github.com/KuronekoServer/Yumunio) に接続する、MIT ライセンスの Tauri 2 アプリです。Windows・macOS・Android・iPhone・iPad・Android タブレット・折りたたみ端末を対象にしています。

サーバーのURLを入力し、接続先を確認してから、そのサーバーのログイン画面を開きます。認証・ページ編集・データベース・共同編集にはサーバーの既存の画面を使用します。サーバー側のコードをアプリに複製しないため、サーバーで公開された機能をそのまま利用できます。

## できること

- HTTPS サーバーの接続確認。Node / Cloudflare Workers の両方に対応。
- 複数サーバーの保存・再接続・削除。保存するのは接続先の情報だけです。
- サーバーのメール・パスワード認証、登録、管理者が設定した外部ログインへの遷移。
- ライト・ダーク・端末に合わせる表示テーマ。
- スマートフォンの下部ナビゲーション、タブレットの左右分割、折りたたみ画面のヒンジを避けるレイアウト。
- サーバー画面の「サーバー」ボタン、またはデスクトップメニューから接続先の選択へ戻る。

外部ログインの提供元によっては埋め込み WebView でのログインが制限されます。各提供元の実機検証は必要です。システムブラウザーからの認証引き継ぎ・独立したオフライン編集・ネイティブ通知は現在実装していません。

## 開発を始める

[Tauri の前提条件](https://v2.tauri.app/start/prerequisites/)をインストールしてください。Node.js 24.16 以上、Rust stable、Windows では C++ Build Tools と WebView2、macOS では Xcode が必要です。

Apple 向けの最低バージョンは macOS 12.3 / iOS・iPadOS 15.4 です。画面で使用する標準の dialog と小さいビューポート単位を利用できる WebKit を前提にしています。

```sh
npm ci
npm run app:dev
```

画面だけをブラウザーで確認する場合は `npm run dev` を使います。ブラウザープレビューは任意の接続先への CORS 回避処理を提供せず、サーバー接続はネイティブアプリで行います。

## プラットフォームごとのビルド

| 対象                            | ビルド環境                     | コマンド                                         |
| ------------------------------- | ------------------------------ | ------------------------------------------------ |
| Windows                         | Windows + MSVC + WebView2      | `npm run app:build`                              |
| macOS                           | macOS + Xcode                  | `npm run app:build`                              |
| Android・タブレット・折りたたみ | Android SDK / NDK + JDK        | `npm run android:init` → `npm run android:build` |
| iPhone・iPad                    | macOS + Xcode + Apple 開発環境 | `npm run ios:init` → `npm run ios:build`         |

Android の開発は `npm run android:dev`、iOS の開発は `npm run ios:dev` です。`android:init` は生成された Activity をリサイズ可能に設定します。`src-tauri/Info.ios.plist` は iPhone / iPad の回転・マルチタスク・ローカルネットワークの利用目的を指定します。

モバイルの初期化は各開発環境で一度実行します。生成される `src-tauri/gen/` は公開ソースに含めません。署名鍵・Apple Team・プロビジョニング・Play Console / App Store の設定は配布者の環境で指定してください。初期状態で署名済みの配布物やストア公開を行う処理はありません。

## 接続先の要件

`https://notes.example.com` のような、Yumunio の**オリジン**を入力します。パス・クエリ・フラグメント・ユーザー名・パスワードを含むURLは保存しません。現在の Yumunio はルート配信を前提としているため、サブディレクトリへの配置には対応していません。

接続確認は次の公開エンドポイントを使用します。

| API                    | 確認する情報                                            |
| ---------------------- | ------------------------------------------------------- |
| `GET /health`          | `status: ok / setup-required`、`runtime: node / worker` |
| `GET /api/instance`    | `schemaVersion: 1`、公開アプリ名・組織名                |
| `GET /api/auth/config` | アカウント認証が有効であること。初期設定前は省略        |

初期設定済みなら `/account`、未設定なら `/setup` を開きます。HTTP リダイレクトは確認時に追跡しません。リバースプロキシや別の認証ゲートが応答する場合は、正規URLや公開エンドポイントの設定を確認してください。

HTTPS 証明書の検証を無効化する機能はありません。開発時はデスクトップの `http://localhost:ポート`、`http://127.0.0.1:ポート`、`http://[::1]:ポート` も入力できます。スマートフォンの localhost はスマートフォン自身を指します。端末での接続には、その端末から到達できる HTTPS サーバーを使用してください。

## 検証

```sh
npm run check
npm run format:check
npm run build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo test --manifest-path src-tauri/Cargo.toml --locked
cargo clippy --manifest-path src-tauri/Cargo.toml --locked --all-targets -- -D warnings
```

CI は Windows と macOS で同じ検証を行います。モバイルの手動起動ワークフローもあります。実行ログやスクリーンショットはリポジトリ外の一時ディレクトリに保存してください。ネイティブのビルド結果も公開ディレクトリの外に出す場合は `CARGO_TARGET_DIR` を指定できます。

実施済みの確認と未検証の環境は [検証状況](docs/verification.md) に記録しています。

## ソースの見方

| 場所                               | 役割                                        |
| ---------------------------------- | ------------------------------------------- |
| `src/main.ts`                      | 接続画面・保存した接続先・設定ダイアログ    |
| `src/server-url.ts`                | 入力時のURL検証                             |
| `src/profiles.ts`                  | 接続先とテーマの端末内保存                  |
| `src/native.ts`                    | 型付きの Tauri コマンド呼び出し             |
| `src/tokens.css`・`src/styles.css` | 色・寸法・レスポンシブ表示                  |
| `src-tauri/src/origin.rs`          | ネイティブ境界でのURL再検証                 |
| `src-tauri/src/server.rs`          | 応答サイズ・タイムアウト付きの公開API確認   |
| `src-tauri/src/lib.rs`             | 接続先の遷移・IPC制限・デスクトップメニュー |
| `src-tauri/src/remote-toolbar.js`  | 接続先から選択画面へ戻る小さな操作UI        |

[構成と認証](docs/architecture.md)、[画面デザイン](docs/design.md)、[開発への参加](CONTRIBUTING.md)、[脆弱性の報告](SECURITY.md)も参照してください。

画面のHTMLは `src/view.ts` に分け、`src/main.ts` は操作の制御を担当します。`npm run format` で公開ソースの書式を揃えられます。

MIT License · Copyright 2026 KuronekoServer
