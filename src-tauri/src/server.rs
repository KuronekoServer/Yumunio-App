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
    // Independent public checks share the pool and run together.
    let (health, instance, authentication) = futures_util::future::join3(
        read_json::<Health>(client, endpoint("/health")),
        read_json::<Instance>(client, endpoint("/api/instance")),
        read_json::<Authentication>(client, endpoint("/api/auth/config")),
    )
    .await;
    let health = health?;
    if !["node", "worker"].contains(&health.runtime.as_str())
        || !["ok", "setup-required"].contains(&health.status.as_str())
    {
        return Err("このサーバーは現在利用できません。Yumunio の設定を確認してください。".into());
    }
    let instance = instance?;
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
        let authentication = authentication?;
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};
    use std::net::TcpListener;
    use std::thread;
    use std::time::{Duration, Instant};

    fn fixture(
        setup_required: bool,
        authentication_enabled: bool,
    ) -> (Url, thread::JoinHandle<usize>) {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let address = listener.local_addr().unwrap();
        listener.set_nonblocking(true).unwrap();
        let task = thread::spawn(move || {
            let mut connections = Vec::new();
            let deadline = Instant::now() + Duration::from_secs(4);
            // No response is released until all three requests have arrived.
            // A sequential implementation therefore cannot pass this fixture.
            while connections.len() < 3 && Instant::now() < deadline {
                match listener.accept() {
                    Ok((stream, _)) => connections.push(stream),
                    Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                        thread::sleep(Duration::from_millis(2));
                    }
                    Err(error) => panic!("Synthetic listener: {error}"),
                }
            }
            let count = connections.len();
            for mut stream in connections {
                stream.set_nonblocking(false).unwrap();
                stream
                    .set_read_timeout(Some(Duration::from_secs(4)))
                    .unwrap();
                let mut request = Vec::new();
                while !request.windows(4).any(|part| part == b"\r\n\r\n") {
                    let mut chunk = [0u8; 512];
                    let length = stream.read(&mut chunk).unwrap();
                    assert!(length > 0, "Synthetic client closed before its headers");
                    request.extend_from_slice(&chunk[..length]);
                    assert!(request.len() <= 4096, "Synthetic request header limit");
                }
                let request = String::from_utf8_lossy(&request);
                let body = if request.starts_with("GET /health ") {
                    serde_json::json!({"status":if setup_required {"setup-required"} else {"ok"},"runtime":"node"})
                } else if request.starts_with("GET /api/instance ") {
                    serde_json::json!({"schemaVersion":1,"applicationName":"Yumunio","organizationName":null})
                } else {
                    assert!(request.starts_with("GET /api/auth/config "));
                    serde_json::json!({"enabled":authentication_enabled})
                }.to_string();
                write!(stream,"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",body.len(),body).unwrap();
            }
            count
        });
        (Url::parse(&format!("http://{address}")).unwrap(), task)
    }

    #[test]
    fn verifies_all_public_endpoints_in_parallel() {
        let (origin, task) = fixture(false, true);
        let connection =
            tauri::async_runtime::block_on(verify_server(&http_client().unwrap(), &origin))
                .unwrap();
        assert!(!connection.setup_required);
        assert_eq!(connection.application_name, "Yumunio");
        assert_eq!(task.join().unwrap(), 3);
    }

    #[test]
    fn refuses_a_configured_server_without_authentication() {
        let (origin, task) = fixture(false, false);
        let result =
            tauri::async_runtime::block_on(verify_server(&http_client().unwrap(), &origin));
        assert!(matches!(result, Err(message) if message.contains("アカウント認証")));
        assert_eq!(task.join().unwrap(), 3);
    }

    #[test]
    fn accepts_setup_without_treating_disabled_authentication_as_a_configured_instance() {
        let (origin, task) = fixture(true, false);
        let connection =
            tauri::async_runtime::block_on(verify_server(&http_client().unwrap(), &origin))
                .unwrap();
        assert!(connection.setup_required);
        assert_eq!(task.join().unwrap(), 3);
    }
}
