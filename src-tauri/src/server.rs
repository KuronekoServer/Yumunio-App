use reqwest::{redirect::Policy, Client};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use url::Url;

const MAX_RESPONSE_BYTES: usize = 64 * 1024;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerConnection {
    pub origin: String,
    pub application_name: String,
    pub organization_name: Option<String>,
    pub runtime: String,
    pub setup_required: bool,
}

#[derive(Deserialize)]
struct Health {
    status: String,
    runtime: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Instance {
    schema_version: u32,
    application_name: String,
    organization_name: Option<String>,
}

#[derive(Deserialize)]
struct Authentication {
    enabled: bool,
}

pub fn http_client() -> Result<Client, reqwest::Error> {
    Client::builder()
        .user_agent(concat!("Yumunio-App/", env!("CARGO_PKG_VERSION")))
        .connect_timeout(Duration::from_secs(5))
        .timeout(Duration::from_secs(10))
        .redirect(Policy::none())
        .build()
}

async fn read_json<T: serde::de::DeserializeOwned>(client: &Client, url: Url) -> Result<T, String> {
    let mut response = client.get(url).send().await.map_err(|error| {
        if error.is_timeout() {
            "サーバーからの応答がありません。URLとネットワークを確認してください。".to_owned()
        } else {
            "接続できませんでした。サーバーのURL・接続状況・HTTPS証明書を確認してください。"
                .to_owned()
        }
    })?;
    if response.status().is_redirection() {
        return Err("別のURLへ転送されています。転送先の正規のURLを入力してください。".into());
    }
    if !response.status().is_success() {
        return Err(format!(
            "サーバーが接続を受け付けていません（HTTP {}）。管理者に確認してください。",
            response.status().as_u16()
        ));
    }
    if response
        .content_length()
        .is_some_and(|length| length > MAX_RESPONSE_BYTES as u64)
    {
        return Err("サーバーからの応答が大きすぎます。".into());
    }
    let mut bytes = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| "サーバーの応答を読み取れませんでした。")?
    {
        if bytes.len() + chunk.len() > MAX_RESPONSE_BYTES {
            return Err("サーバーからの応答が大きすぎます。".into());
        }
        bytes.extend_from_slice(&chunk);
    }
    serde_json::from_slice(&bytes).map_err(|_| {
        "Yumunio の応答を確認できませんでした。URLとサーバーのバージョンを確認してください。".into()
    })
}

pub async fn verify_server(client: &Client, origin: &Url) -> Result<ServerConnection, String> {
    let endpoint = |path| {
        origin
            .join(path)
            .expect("Repository-owned absolute endpoint")
    };
    let health: Health = read_json(client, endpoint("/health")).await?;
    if !["node", "worker"].contains(&health.runtime.as_str())
        || !["ok", "setup-required"].contains(&health.status.as_str())
    {
        return Err("このサーバーは現在利用できません。Yumunio の設定を確認してください。".into());
    }
    let instance: Instance = read_json(client, endpoint("/api/instance")).await?;
    let valid_name = |name: &str, limit| {
        !name.trim().is_empty()
            && name.chars().count() <= limit
            && !name.chars().any(|c| {
                c.is_control()
                    || ('\u{202a}'..='\u{202e}').contains(&c)
                    || ('\u{2066}'..='\u{2069}').contains(&c)
            })
    };
    if instance.schema_version != 1
        || !valid_name(&instance.application_name, 80)
        || instance
            .organization_name
            .as_ref()
            .is_some_and(|name| !valid_name(name, 120))
    {
        return Err("対応する Yumunio サーバーの情報を確認できませんでした。".into());
    }
    let setup_required = health.status == "setup-required";
    if !setup_required {
        let authentication: Authentication =
            read_json(client, endpoint("/api/auth/config")).await?;
        if !authentication.enabled {
            return Err(
                "このサーバーではアカウント認証が有効になっていません。管理者に確認してください。"
                    .into(),
            );
        }
    }
    Ok(ServerConnection {
        origin: origin.origin().ascii_serialization(),
        application_name: instance.application_name,
        organization_name: instance.organization_name,
        runtime: health.runtime,
        setup_required,
    })
}
