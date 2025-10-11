use wasm_bindgen::prelude::*;
use nostr::{Event, EventBuilder, EventId, Keys, Kind, PublicKey, Tag, Timestamp};
use nostr::nips::nip19::ToBech32;
use nostr::types::time::Instant;
use serde::{Deserialize, Serialize};

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

#[wasm_bindgen]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

/// NIP-07 インターフェース用のイベント構造体
#[derive(Serialize, Deserialize)]
#[wasm_bindgen]
pub struct NostrEvent {
    #[wasm_bindgen(skip)]
    pub id: String,
    #[wasm_bindgen(skip)]
    pub pubkey: String,
    #[wasm_bindgen(skip)]
    pub created_at: u64,
    #[wasm_bindgen(skip)]
    pub kind: u16,
    #[wasm_bindgen(skip)]
    pub tags: Vec<Vec<String>>,
    #[wasm_bindgen(skip)]
    pub content: String,
    #[wasm_bindgen(skip)]
    pub sig: String,
}

#[wasm_bindgen]
impl NostrEvent {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        NostrEvent {
            id: String::new(),
            pubkey: String::new(),
            created_at: 0,
            kind: 0,
            tags: Vec::new(),
            content: String::new(),
            sig: String::new(),
        }
    }

    #[wasm_bindgen(getter)]
    pub fn id(&self) -> String {
        self.id.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn pubkey(&self) -> String {
        self.pubkey.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn created_at(&self) -> u64 {
        self.created_at
    }

    #[wasm_bindgen(getter)]
    pub fn kind(&self) -> u16 {
        self.kind
    }

    #[wasm_bindgen(getter)]
    pub fn content(&self) -> String {
        self.content.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn sig(&self) -> String {
        self.sig.clone()
    }
}

/// イベントビルダー
#[wasm_bindgen]
pub struct NostrEventBuilder {
    kind: Kind,
    content: String,
    tags: Vec<Tag>,
}

#[wasm_bindgen]
impl NostrEventBuilder {
    #[wasm_bindgen(constructor)]
    pub fn new(kind: u16, content: String) -> Self {
        NostrEventBuilder {
            kind: Kind::from(kind),
            content,
            tags: Vec::new(),
        }
    }

    pub fn add_tag(&mut self, tag_type: String, values: Vec<String>) {
        // Build raw tag buffer: [kind, ...values]
        let mut buf: Vec<String> = Vec::with_capacity(1 + values.len());
        buf.push(tag_type);
        buf.extend(values);
        if let Ok(tag) = Tag::parse(buf) {
            self.tags.push(tag);
        }
    }

    pub fn to_unsigned_event(&self, author_pubkey: String) -> Result<JsValue, JsValue> {
        let pubkey = PublicKey::parse(&author_pubkey)
            .map_err(|e| JsValue::from_str(&format!("Invalid public key: {}", e)))?;

        let supplier = Instant::now();

        let unsigned = EventBuilder::new(self.kind.clone(), self.content.clone())
            .tags(self.tags.clone())
            .build_with_ctx(&supplier, pubkey);

        serde_wasm_bindgen::to_value(&unsigned)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }
}

/// キーペアの生成結果
#[derive(Serialize)]
struct GeneratedKeys {
    public_key: String,
    secret_key: String,
}

/// キーペアの生成
#[wasm_bindgen]
pub fn generate_keys() -> Result<JsValue, JsValue> {
    let keys = Keys::generate();
    let result = GeneratedKeys {
        public_key: keys.public_key().to_hex(),
        secret_key: keys.secret_key().to_secret_hex(),
    };
    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

/// 公開鍵をnpub形式に変換
#[wasm_bindgen]
pub fn public_key_to_npub(hex_pubkey: String) -> Result<String, JsValue> {
    let pubkey = PublicKey::parse(&hex_pubkey)
        .map_err(|e| JsValue::from_str(&format!("Invalid public key: {}", e)))?;
    Ok(pubkey.to_bech32().map_err(|e| JsValue::from_str(&format!("Bech32 encoding error: {}", e)))?)
}

/// npub形式から公開鍵のhexに変換
#[wasm_bindgen]
pub fn npub_to_public_key(npub: String) -> Result<String, JsValue> {
    let pubkey = PublicKey::parse(&npub)
        .map_err(|e| JsValue::from_str(&format!("Invalid npub: {}", e)))?;
    Ok(pubkey.to_hex())
}

/// イベントIDの検証
#[wasm_bindgen]
pub fn verify_event_id(event_json: JsValue) -> Result<bool, JsValue> {
    let event: Event = serde_wasm_bindgen::from_value(event_json)
        .map_err(|e| JsValue::from_str(&format!("Deserialization error: {}", e)))?;
    Ok(event.verify_id())
}

/// イベントの署名検証
#[wasm_bindgen]
pub fn verify_event_signature(event_json: JsValue) -> Result<bool, JsValue> {
    let event: Event = serde_wasm_bindgen::from_value(event_json)
        .map_err(|e| JsValue::from_str(&format!("Deserialization error: {}", e)))?;
    Ok(event.verify_signature())
}

/// 現在のタイムスタンプを取得
#[wasm_bindgen]
pub fn now() -> u64 {
    Timestamp::now().as_u64()
}
