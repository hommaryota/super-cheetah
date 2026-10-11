# 無敵最強スーパーチーター — リレー記録

3人＋先生＋マネージャー森本さんのリレー記録アプリ。
Cloudflare Pages（フロント）＋ Pages Functions（API）＋ D1（DB）で、全部無料枠で動きます。

- 走順・区間タイムの記録 / 編集 / 削除（森本さんや、メンバー以外の人も任意の名前で登録可）
- チームタイム（公式記録 or 区間合計）と種目ごとのチームベスト
- 区間MVP（100mあたりのペースが最速の人）、自己ベスト更新バッジ
- メンバーごとの距離別PB
- マネージャー森本さんの総評欄

## 構成

```
functions/api/[[route]].ts   /api/races の CRUD（D1）
src/members.ts               メンバー定義（名前・色・キャラの見た目）
src/components/Chibi.tsx     デフォルメキャラ（SVG）
src/pages/                   画面
schema.sql / seed.sql        テーブル定義と 2026/10/11 の初期データ
```

## はじめかた（fish）

```fish
npm install
npx wrangler login
npx wrangler d1 create super-cheetah-db
# 表示された database_id を wrangler.toml に貼る

npm run db:init:local            # ローカルDBを作成＋初期データ
npm run build
npm run dev:api                  # http://localhost:8788 で API＋ビルド済み画面
# 画面をホットリロードで触りたいときは別ターミナルで
npm run dev                      # http://localhost:5173（/api は 8788 にプロキシ）
```

## デプロイ

```fish
npm run db:init:remote           # 本番D1にテーブル作成（初回のみ。※DROPするので2回目以降は実行しない）
npx wrangler pages project create super-cheetah
npm run deploy
```

## 3人だけが見られるようにする

Cloudflare ダッシュボード → Zero Trust → Access → Applications で
`super-cheetah.pages.dev` を Self-hosted アプリとして追加し、
ポリシーに3人＋森本さんのメールアドレスを登録すると、ワンタイムコードでログインする形になります（50ユーザーまで無料）。

## メンバーを変えたいとき

`src/members.ts` の `MEMBERS` を編集。`look` で髪型（fluffy / spiky / bun / side / pony）、
服の色、ハチマキの有無などを変えられます。
