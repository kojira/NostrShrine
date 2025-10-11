# NostrShrine アーキテクチャ設計

## 概要

NostrShrineは、完全にフロントエンドで動作する神社アプリケーションです。すべてのデータはNostrプロトコルを使用してリレーサーバー上に分散保存されます。

## システム構成

```
┌─────────────────────────────────────────────────────┐
│                   ブラウザ                             │
│  ┌─────────────────────────────────────────────┐   │
│  │          React Application                   │   │
│  │  ┌──────────────────────────────────────┐  │   │
│  │  │  rust-nostr WASM Bindings           │  │   │
│  │  │  (暗号化、署名、イベント生成)         │  │   │
│  │  └──────────────────────────────────────┘  │   │
│  │                                              │   │
│  │  ┌──────────────────────────────────────┐  │   │
│  │  │  NIP-07 Browser Extension            │  │   │
│  │  │  (Alby, nos2x等)                     │  │   │
│  │  └──────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────┬───────────────────────────────────┘
                  │ WebSocket
                  │
        ┌─────────┴──────────┐
        │                    │
   ┌────▼─────┐      ┌──────▼────┐
   │  Nostr   │      │   Nostr   │
   │  Relay 1 │      │   Relay N │
   └──────────┘      └───────────┘
```

## コンポーネント構成

### 1. フロントエンド (React + TypeScript)

#### コンポーネント階層

```
App
├── AuthProvider (認証状態管理)
│   └── RelayProvider (リレー接続管理)
│       └── AdminProvider (管理者権限管理)
│           └── UI Components
│               ├── ShrineVisit (参拝)
│               ├── Omikuji (おみくじ)
│               └── Admin
│                   └── OmikujiGenerator (おみくじ生成)
```

#### 主要モジュール

- **`lib/nostr/`**: Nostrクライアント実装
  - `client.ts`: rust-nostr WASMラッパー
  - `nip07.ts`: NIP-07ブラウザ拡張連携
  - `relay.ts`: リレー接続とサブスクリプション管理
  - `events.ts`: Nostrイベント作成ヘルパー

- **`contexts/`**: グローバル状態管理
  - `AuthContext.tsx`: 認証状態（NIP-07）
  - `RelayContext.tsx`: リレー接続とイベント送信
  - `AdminContext.tsx`: 管理者権限判定

- **`services/llm/`**: LLM統合
  - `openai.ts`: OpenAI APIクライアント
  - プロバイダーパターンで他のLLMにも拡張可能

### 2. WASM Bindings (rust-nostr)

Rustで実装されたNostrライブラリをWASMにコンパイルし、JavaScriptから利用可能にします。

**主な機能:**
- キーペア生成
- イベント署名検証
- npub/hex変換
- 未署名イベント生成

## データフロー

### 参拝フロー

```
1. ユーザーが「参拝する」ボタンをクリック
2. useShrineVisit フックが呼ばれる
3. createShrineVisitEvent で kind 3081 イベントを生成
4. NIP-07 (window.nostr) でイベントに署名
5. RelayContext の publishEvent でリレーに送信
6. リレーが OK を返す
7. UIに完了メッセージを表示
```

### おみくじフロー

```
1. ユーザーが「おみくじを引く」ボタンをクリック
2. useOmikuji フックがリレーから kind 30394 イベントを取得
3. ランダムに1つ選択
4. おみくじ結果を表示
5. (オプション) kind 1 で結果をNostrに投稿
6. ローカルストレージに引いた回数を記録（1日の上限管理）
```

### おみくじ生成フロー (管理者)

```
1. 管理者がOpenAI API Keyを設定
2. 「生成して保存」ボタンをクリック
3. OpenAI API (gpt-4o-mini) におみくじ生成を依頼
4. JSON形式でおみくじデータを受信
5. createOmikujiDataEvent で kind 30394 イベントを生成
6. NIP-07でイベントに署名
7. リレーに送信して保存
```

## Nostrイベント設計

### kind 3081: 参拝記録

参拝した記録を保存します。

```json
{
  "kind": 3081,
  "content": "{\"shrine_name\":\"NostrShrine\",\"message\":\"参拝しました\",\"visited_at\":1234567890}",
  "tags": [
    ["shrine", "NostrShrine"]
  ]
}
```

### kind 30394: おみくじデータ (Parameterized Replaceable)

管理者が事前生成したおみくじデータ。`d`タグで一意に識別されます。

```json
{
  "kind": 30394,
  "content": "{\"fortune\":\"大吉\",\"general\":\"...\",\"love\":\"...\"}",
  "tags": [
    ["d", "omikuji-{unique-id}"],
    ["fortune", "大吉"]
  ]
}
```

### kind 10381: 管理者リスト (Replaceable)

アプリケーションの管理者リストを保存します。

```json
{
  "kind": 10381,
  "content": "{\"admins\":[\"pubkey1\",\"pubkey2\"]}",
  "tags": [
    ["d", "nostrshrine-admins"],
    ["p", "pubkey1"],
    ["p", "pubkey2"]
  ]
}
```

### kind 10394: アプリ設定 (Replaceable)

アプリケーションの設定を保存します。

```json
{
  "kind": 10394,
  "content": "{\"daily_omikuji_limit\":3,\"relays\":[\"wss://r.kojira.io\"]}",
  "tags": [
    ["d", "nostrshrine-settings"]
  ]
}
```

### kind 1: おみくじ結果投稿

ユーザーがおみくじ結果をタイムラインに投稿する際に使用します。

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

## セキュリティ

### 認証

- NIP-07準拠のブラウザ拡張機能を使用
- 秘密鍵はブラウザ拡張機能で管理され、アプリケーションには露出しない
- イベント署名はすべてブラウザ拡張機能で実行

### 管理者権限

1. **環境変数**: `.env`ファイルで初期管理者を設定
2. **Nostrイベント**: kind 10381 で管理者リストを動的に更新可能
3. **クライアント側検証**: ログイン中のユーザーの公開鍵が管理者リストに含まれるかチェック

### データ保護

- すべてのデータはNostrリレー上に公開される
- プライベートなデータは保存しない設計
- APIキー（OpenAI）はブラウザのローカルストレージに保存（管理者のみ）

## パフォーマンス最適化

### ビルド最適化

- Viteによる高速ビルド
- Code Splitting (react-vendor, mui-vendor)
- WASM最適化 (`opt-level = "z"`, `lto = true`)

### リレー接続

- 複数リレーへの並列接続
- 自動再接続機能
- サブスクリプションの効率的な管理

### ローカルキャッシュ

- おみくじの引いた回数をlocalStorageで管理
- APIキーの永続化
- リレー設定の保存

## デプロイ

### GitHub Pages

1. GitHub Actionsで自動デプロイ
2. WASMのビルドも含めて完全自動化
3. `main`ブランチへのpushで自動的にデプロイ

### 必要な設定

- GitHub Pages を有効化
- Actions の権限設定 (pages: write, id-token: write)

## 拡張性

### LLMプロバイダーの追加

`services/llm/`に新しいプロバイダーを追加することで、OpenAI以外のLLMにも対応可能。

```typescript
export class AnthropicProvider implements LLMProvider {
  name = 'Anthropic'
  
  async generateOmikuji(): Promise<OmikujiResult> {
    // 実装
  }
}
```

### カスタムイベント種別の追加

`config/constants.ts`でKINDを定義し、`lib/nostr/events.ts`でイベント作成関数を追加。

## 今後の拡張案

- 🎯 おみくじの統計表示
- 📊 参拝回数の履歴グラフ
- 🎨 テーマのカスタマイズ
- 🌐 多言語対応
- 📱 PWA対応（オフライン動作）
- 🔔 通知機能
- 👥 ソーシャル機能（おみくじシェア）

