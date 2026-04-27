# SunvisorSig

Next.js + Tailwind CSS + Prisma + Cloudflare D1/R2 の SIG アプリケーションです。

## 開発環境の起動手順

詳細は [docs/local-development.md](docs/local-development.md) を参照してください。

### 事前準備

1. `.env.example` を参考に `.env` を作成します。
2. 依存関係をインストールします。

```bash
npm install
```

### ローカルで起動する場合

1. Prisma Client を生成し、migration を適用します。

```bash
npm run db:generate
npm run db:migrate
```

必要なら seed データを入れます。

```bash
npm run db:seed
```

2. 開発サーバーを起動します。

```bash
npm run dev
```

3. ブラウザで `http://localhost:3000/forums` を開きます。
4. フォーラム一覧が表示されれば起動完了です。

補足:
`next dev` / `next build` は Next.js の既定どおり Turbopack を使用します。

seed データのログイン用アカウント:

- `admin@example.com` （全体管理者）
- `acme@example.com`
- `globex@example.com`

共通パスワード:

- `password123`

Prisma schema を変更した場合:

```bash
npm run db:generate
npm run db:migrate
```

その後、`npm run dev` を再起動してください。

招待メール送信:

- `EMAIL_API_URL`, `EMAIL_API_TOKEN`, `EMAIL_FROM` を設定すると HTTP メール API で招待メールを送信します
- メール API 未設定の場合は開発用として招待は作成され、Activation URL はサーバーログへ出力されます

Cloudflare Workers 互換確認:

```bash
npm run preview
```

## 運用コマンド

リリース前チェック:

```bash
docs/release-checklist.md
```

本番運用:

```bash
docs/production.md
```

運用手順:

```bash
docs/operations.md
```

バックアップ / 復旧:

```bash
docs/backup-and-restore.md
```

## テスト

unit test:

```bash
npm run test
```

watch mode:

```bash
npm run test:watch
```

通知フローの integration test:

```bash
npm run db:test-notifications
```

招待アクティベーションの integration test:

```bash
npm run db:test-activation
```

チャンネル購読の integration test:

```bash
npm run db:test-channel-subscriptions
```

フォーラム / チャンネル作成の integration test:

```bash
npm run db:test-creation
```

投稿 / コメント編集の integration test:

```bash
npm run db:test-editing
```

投稿 / コメント作成の integration test:

```bash
npm run db:test-post-comment-creation
```

投稿ステータス変更の integration test:

```bash
npm run db:test-post-status
```

プロフィール更新の integration test:

```bash
npm run db:test-profile
```

フォーラム管理ルールの integration test:

```bash
npm run db:test-forum-management
```

添付ファイル権限の integration test:

```bash
npm run db:test-attachments
```

削除待ちデータの完全削除バッチ:

```bash
npm run db:purge
```

想定運用:

- 1 日 1 回の cron で実行する
- `DeletedPost` / `DeletedComment` / `DeletedAttachment` のうち `purgeAfter` を過ぎたものを削除する
- `public/uploads` 配下の対応ファイルも同時に削除する

削除フローの実動作テスト:

```bash
npm run db:test-deletion
```

このテストでは以下を確認します。

- コメント削除で `DeletedComment` と `DeletedAttachment` に退避されること
- 投稿削除で `DeletedPost` / `DeletedComment` / `DeletedAttachment` に退避されること
- 一般ユーザーは他人の投稿・コメント、およびチャンネル・フォーラムを削除できないこと
- purge 実行で期限切れ退避データとローカルファイルが削除されること
