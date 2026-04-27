# Local Development

このプロジェクトのローカル開発は、普段の編集用と Cloudflare Workers 互換確認用の 2 系統で運用します。

## 推奨モード

### 1. 普段の開発: Next.js dev server

UI や通常の機能開発では `next dev` を使います。D1/R2 は Wrangler の local binding を経由します。

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

起動後は `http://localhost:3000/forums` を開きます。

seed アカウント:

- `admin@example.com`
- `acme@example.com`
- `globex@example.com`

共通パスワード:

- `password123`

### 2. Cloudflare 互換確認: OpenNext preview

Workers runtime に近い状態で確認する場合は preview を使います。

```bash
npm run preview
```

このコマンドは OpenNext build 後に Wrangler preview を起動します。デプロイ前には最低 1 回はこのモードでログイン、投稿、コメント、添付ファイル、招待作成を確認してください。

## 環境変数

Next.js dev server は `.env` を使います。Cloudflare preview は `.dev.vars` を使います。

最小設定:

```env
DATABASE_URL="file:./dev.db"
APP_URL="http://localhost:3000"
AUTH_SECRET="replace-this-with-a-long-random-string"
EMAIL_API_URL=""
EMAIL_API_TOKEN=""
EMAIL_FROM="SunvisorSig <no-reply@example.com>"
```

ローカルでは `EMAIL_API_URL` と `EMAIL_API_TOKEN` を空にして構いません。この場合、招待は作成され、Activation URL はサーバーログに出ます。

実際に招待メールを送る場合、`EMAIL_API_URL` にはメールサービスの送信 API エンドポイントを設定します。現在の実装は `Authorization: Bearer ...` と JSON body `{ from, to, subject, text }` を送る形です。

Resend を使う例:

```env
EMAIL_API_URL="https://api.resend.com/emails"
EMAIL_API_TOKEN="re_xxxxxxxxx"
EMAIL_FROM="SunvisorSig <no-reply@your-verified-domain.example>"
```

Resend の送信 API は `POST /emails` で、`from`, `to`, `subject`, `text` を受け取ります。`EMAIL_FROM` は検証済みドメインの送信元を使ってください。

## D1 / R2 のローカルデータ

`npm run db:migrate` は Wrangler の local D1 に migration を適用します。`npm run db:seed` は local D1 に seed を投入し、R2 local binding に seed 添付ファイルを作成します。

ローカルデータは Wrangler の管理領域に保存されます。状態を作り直したい場合は、`npm run db:migrate` と `npm run db:seed` を再実行します。

## 確認コマンド

```bash
npm run lint
npm run typecheck
npm run test
npx opennextjs-cloudflare build
```

Cloudflare 向けの変更を入れた場合は、最後の OpenNext build まで通すのを基準にします。
