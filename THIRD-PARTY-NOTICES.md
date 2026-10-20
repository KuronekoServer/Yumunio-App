# 依存ライブラリ

Yumunio App の独自コードは MIT License です。直接依存の概要は次のとおりです。実際に解決するバージョンは `package-lock.json` と `src-tauri/Cargo.lock` に固定します。

| 依存                    | 用途                         | ライセンス       |
| ----------------------- | ---------------------------- | ---------------- |
| Tauri / Tauri API / CLI | ネイティブアプリとIPC        | MIT / Apache-2.0 |
| Vite                    | フロントエンドの開発・ビルド | MIT              |
| TypeScript              | 型検証                       | Apache-2.0       |
| Prettier                | 公開ソースの書式統一         | MIT              |
| serde / serde_json      | Rust のJSON処理              | MIT / Apache-2.0 |
| reqwest                 | サーバーの公開API確認        | MIT / Apache-2.0 |
| url                     | URLの解析                    | MIT / Apache-2.0 |

OSの WebView ランタイムは各プラットフォームの条件に従います。推移的依存の著作権表示とライセンスも配布時に確認してください。サーバーの画面や文書をアプリの配布物へ同梱しません。

`public/icon.svg` と接続画面の紙面装飾はこのプロジェクト用に作成した素材です。外部フォントや写真素材をダウンロードする処理はありません。
