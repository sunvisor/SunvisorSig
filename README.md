# SunvisorSig

Next.js + Tailwind CSS + Prisma + PostgreSQL + Docker の開発用ひな形です。

## 開発環境の起動手順

### 事前準備

1. `.env.example` を参考に `.env` を作成します。
2. 依存関係をインストールします。

```bash
npm install
```

### ローカルで起動する場合

1. 開発サーバーを起動します。

```bash
npm run dev
```

2. ブラウザで `http://localhost:3000` を開きます。
3. `Hello World` が表示されれば起動完了です。

補足:
`next dev` / `next build` は Next.js の既定どおり Turbopack を使用します。

### Docker で起動する場合

1. アプリケーションと PostgreSQL を起動します。

```bash
docker compose up --build
```

2. ブラウザで `http://localhost:3000` を開きます。
3. `Hello World` が表示されれば起動完了です。

バックグラウンドで起動する場合:

```bash
docker compose up --build -d
```

停止する場合:

```bash
docker compose down
```
