# Backup and Restore

## 対象

最低限バックアップすべきものは以下。

- PostgreSQL
- `public/uploads`
- `.env.production`

## PostgreSQL

DB は compose 管理外なので、PostgreSQL 側の標準バックアップを使う。

### 例

```bash
pg_dump "$DATABASE_URL" > sunvisorsig-$(date +%F).sql
```

### 推奨

- 1 日 1 回
- 少なくとも 7 世代保持
- 復元テストを定期的に実施

## 添付ファイル

添付は `public/uploads` に保存される。  
本番では `uploads_data` volume を使っているので、その volume を定期バックアップする。

### 対象

- 投稿添付
- コメント添付
- 削除待ち期間中の添付ファイル

## 復旧

### app のみ再起動

```bash
docker compose -f docker-compose.prod.yml up -d app
```

### DB 復旧

1. PostgreSQL を復旧する
2. 必要なら dump を restore する
3. app を再起動する
4. `/api/health` を確認する

### 添付ファイル復旧

1. `uploads_data` を復旧する
2. DB と uploads の世代が揃っていることを確認する
3. 投稿詳細から添付を開いて確認する

## 注意

- DB と uploads は同じ時点のバックアップを使うのが望ましい
- 個別削除の退避データも DB 側に含まれる
- チャンネル削除 / フォーラム削除は物理削除なので、復旧にはバックアップが必要

