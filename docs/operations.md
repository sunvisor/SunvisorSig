# Operations

## 日常確認

### app / db の生存確認

```bash
curl http://localhost:3000/api/health
```

期待値:

- `200`
- `ok: true`
- `app: "up"`
- `db: "up"`

### アプリ更新後

以下を順に確認する。

1. `/api/health`
2. ログイン
3. フォーラム一覧表示
4. 投稿詳細表示
5. 通知ベル表示

## purge バッチ

### 実行コマンド

```bash
npm run db:purge
```

### 想定運用

- 1 日 1 回
- 深夜帯に実行

### 目的

- `DeletedPost`
- `DeletedComment`
- `DeletedAttachment`

のうち、`purgeAfter` を過ぎたものを完全削除する。

### 例

```bash
cd /path/to/SunvisorSig
docker compose -f docker-compose.prod.yml run --rm app npm run db:purge
```

### cron 例

```cron
0 3 * * * cd /path/to/SunvisorSig && docker compose -f docker-compose.prod.yml run --rm app npm run db:purge >> /var/log/sunvisorsig-purge.log 2>&1
```

## Webhook / メール確認

### 招待メール

- フォーラム設定画面で招待を作成する
- SMTP 設定済みなら受信確認を行う
- SMTP 未設定なら招待一覧のメール文面 preview を使う

### Webhook

- フォーラム設定画面で webhook を登録する
- `テスト送信` を実行する
- 送信先チャットで受信確認する

## 障害時の一次切り分け

### `/api/health` が 503

- DB 接続を疑う
- `DATABASE_URL`
- PostgreSQL の稼働状態
- DB 側 firewall / ネットワーク

### `/api/health` が応答しない

- app コンテナ停止を疑う
- reverse proxy 側のルーティングも確認する

### 画面は開くが通知が来ない

- 単一プロセスで app が動いているか確認する
- webhook は設定画面からテスト送信する
- SSE は app 再起動直後に一時的に切れることがある

