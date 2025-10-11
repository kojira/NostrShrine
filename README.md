# ⛩️ NostrShrine

Nostr上で動作する、完全フロントエンドの神社アプリケーション。参拝記録やおみくじをNostrのイベントとして管理します。

## 🌟 特徴

- **🙏 参拝機能**: 参拝記録をNostr (kind 3081) に保存
- **🎴 おみくじ**: 運勢をランダムに引いて、結果をNostrに投稿可能
- **🔐 NIP-07認証**: ブラウザ拡張機能（Alby, nos2x等）による安全な認証
- **⚡ 完全フロントエンド**: バックエンド不要、すべてNostrリレー経由
- **🦀 rust-nostr WASM**: 高性能なrust-nostrをWebAssemblyで利用
- **🎨 神社テーマ**: 朱色と金色をベースとした和のデザイン
- **🤖 LLM生成**: 管理者はOpenAI APIを使っておみくじを自動生成

## 📦 技術スタック

- **フロントエンド**: React + TypeScript + Vite
- **UI**: Material-UI (MUI)
- **Nostr**: rust-nostr (WASMバインディング自作)
- **LLM**: OpenAI API (gpt-4o-mini)
- **デプロイ**: GitHub Pages

## 🚀 セットアップ

### 必要な環境

- Node.js 20+
- pnpm 9+
- Rust (stable)
- wasm-pack

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/NostrShrine.git
cd NostrShrine

# 依存関係をインストール
pnpm install

# WASMをビルド
cd rust-nostr-wasm
wasm-pack build --target web --out-dir ../src/wasm
cd ..

# 環境変数を設定
cp .env.example .env
# .envを編集して管理者の公開鍵を設定
```

### 開発サーバー起動

```bash
pnpm run dev
```

http://localhost:5173 でアプリケーションが起動します。

### ビルド

```bash
pnpm run build
```

## 🔧 環境変数

`.env` ファイルで以下の変数を設定できます：

```env
# 管理者の公開鍵（カンマ区切りで複数指定可能）
VITE_ADMIN_PUBKEYS=npub1xxx,npub1yyy

# デフォルトリレー（オプション）
VITE_DEFAULT_RELAY=wss://r.kojira.io
```

## 📱 使い方

### 一般ユーザー

1. NIP-07対応のブラウザ拡張機能（Alby, nos2x等）をインストール
2. 「ログイン」ボタンをクリックして認証
3. **参拝する**: 参拝記録をNostrに投稿
4. **おみくじを引く**: ランダムでおみくじを引いて、結果をNostrに投稿可能

### 管理者

管理者として認証すると、追加の機能が利用できます：

1. **おみくじ生成**: OpenAI APIキーを設定し、LLMでおみくじを生成
2. **一括生成**: 複数のおみくじを一度に生成してNostrに保存
3. **リレー管理**: 接続するリレーの追加・削除

## 📋 Nostrイベント仕様

### kind 3081: 参拝記録

```json
{
  "kind": 3081,
  "content": "{\"shrine_name\":\"NostrShrine\",\"message\":\"参拝しました\",\"visited_at\":1234567890}",
  "tags": [
    ["shrine", "NostrShrine"]
  ]
}
```

### kind 1: おみくじ結果投稿

```json
{
  "kind": 1,
  "content": "🎴 おみくじの結果\n\n運勢: 大吉\n\n...",
  "tags": [
    ["t", "NostrShrine"],
    ["t", "おみくじ"],
    ["fortune", "大吉"]
  ]
}
```

### kind 30394: おみくじデータ（管理者が事前生成）

```json
{
  "kind": 30394,
  "content": "{\"fortune\":\"大吉\",\"general\":\"...\",\"love\":\"...\",\"money\":\"...\"}",
  "tags": [
    ["d", "omikuji-{unique-id}"],
    ["fortune", "大吉"]
  ]
}
```

### kind 10381: 管理者リスト

```json
{
  "kind": 10381,
  "content": "{\"admins\":[\"pubkey1\",\"pubkey2\"],\"updated_at\":1234567890}",
  "tags": [
    ["d", "nostrshrine-admins"],
    ["p", "pubkey1"],
    ["p", "pubkey2"]
  ]
}
```

### kind 10394: アプリ設定

```json
{
  "kind": 10394,
  "content": "{\"daily_omikuji_limit\":3,\"relays\":[\"wss://r.kojira.io\"]}",
  "tags": [
    ["d", "nostrshrine-settings"]
  ]
}
```

## 🏗️ プロジェクト構造

```
NostrShrine/
├── rust-nostr-wasm/        # Rust WASM バインディング
│   ├── src/
│   │   └── lib.rs          # rust-nostr のラッパー
│   └── Cargo.toml
├── src/
│   ├── components/         # Reactコンポーネント
│   │   ├── admin/          # 管理者用コンポーネント
│   │   ├── ShrineVisit.tsx # 参拝コンポーネント
│   │   └── Omikuji.tsx     # おみくじコンポーネント
│   ├── contexts/           # React Context
│   │   ├── AuthContext.tsx # 認証管理
│   │   ├── RelayContext.tsx # リレー接続管理
│   │   └── AdminContext.tsx # 管理者権限管理
│   ├── hooks/              # カスタムフック
│   ├── lib/
│   │   └── nostr/          # Nostrクライアント
│   │       ├── client.ts   # WASMラッパー
│   │       ├── nip07.ts    # NIP-07実装
│   │       ├── relay.ts    # リレー接続
│   │       └── events.ts   # イベント作成
│   ├── services/
│   │   └── llm/            # LLM統合
│   │       ├── types.ts
│   │       ├── openai.ts   # OpenAIプロバイダー
│   │       └── index.ts
│   ├── config/
│   │   └── constants.ts    # 定数定義
│   └── wasm/               # ビルドされたWASM（自動生成）
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Pages デプロイ
└── vite.config.ts
```

## 🤝 コントリビューション

プルリクエストを歓迎します！

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

MIT License

## 🙏 謝辞

- [rust-nostr](https://github.com/rust-nostr/nostr) - 高性能なNostrライブラリ
- [Material-UI](https://mui.com/) - 美しいUIコンポーネント
- [Nostr Protocol](https://github.com/nostr-protocol/nostr) - 分散型プロトコル

---

Made with ❤️ and ⛩️
