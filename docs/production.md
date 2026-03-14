# Production

このプロジェクトの v1 本番運用は、以下の前提で進める。

- `app` は Docker で単一プロセス運用
- `db` は外部 PostgreSQL
- 添付ファイルは `public/uploads` を Docker volume で永続化
- SSE は現状の in-memory event bus のまま使う

## 構成

- app: Docker コンテナ 1 つ
- db: 外部 PostgreSQL
- uploads: Docker volume
- reverse proxy / HTTPS: サーバー側で別途用意

## 必要ファイル

- `Dockerfile.prod`
- `docker-compose.prod.yml`
- `.env.production`

`.env.production` は `.env.production.example` を元に作る。

## 初回デプロイ

1. `.env.production` を作成する
2. image を build する
3. migration を適用する
4. app を起動する

```bash
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy
docker compose -f docker-compose.prod.yml up -d app
```

起動確認:

```bash
curl http://localhost:3000/api/health
```

## 更新手順

本番更新は、まずこれで十分。

1. サーバー上のソースを更新する
2. image を rebuild する
3. migration を適用する
4. app を再起動する

```bash
git pull
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy
docker compose -f docker-compose.prod.yml up -d app
```

更新後の確認:

```bash
curl http://localhost:3000/api/health
```

## 停止

```bash
docker compose -f docker-compose.prod.yml down
```

## 注意

- `docker compose down` をしても `uploads_data` volume は残る
- DB は compose 管理外なので、バックアップと監視は別途必要
- 複数 app インスタンスに増やすと、SSE 通知はそのままでは整合しない
- 本番では seed データを投入しない
- `AUTH_SECRET` は十分に長いランダム値へ変更する
- webhook URL は secret として扱う

## 関連ドキュメント

- `docs/operations.md`
- `docs/backup-and-restore.md`
