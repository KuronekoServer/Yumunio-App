use std::net::IpAddr;
use url::Url;

pub fn is_loopback(url: &Url) -> bool {
    match url.host() {
        Some(url::Host::Domain(name)) => name == "localhost",
        Some(url::Host::Ipv4(address)) => IpAddr::V4(address).is_loopback(),
        Some(url::Host::Ipv6(address)) => IpAddr::V6(address).is_loopback(),
        None => false,
    }
}

/// Only server origins are accepted. Never retain a token-bearing login or invite URL.
pub fn parse_server_origin(input: &str) -> Result<Url, String> {
    let input = input.trim();
    if input.is_empty()
        || input.len() > 2048
        || input
            .chars()
            .any(|c| c.is_whitespace() || c.is_control() || c == '\\')
    {
        return Err("有効なサーバーURLを入力してください。".into());
    }
    let value = if input.contains("://") {
        input.to_owned()
    } else {
        format!("https://{input}")
    };
    let url = Url::parse(&value).map_err(|_| "サーバーURLの形式を確認してください。")?;
    if url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.query().is_some()
        || url.fragment().is_some()
        || url.path() != "/"
    {
        return Err("サーバーのURLだけを入力してください。ログインリンクは使えません。".into());
    }
    if url.scheme() != "https" && !(url.scheme() == "http" && is_loopback(&url)) {
        return Err("HTTPSのURLを使用してください。HTTPはlocalhostでのみ利用できます。".into());
    }
    Ok(url)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_origins_and_allows_private_https() {
        for (input, expected) in [
            ("notes.example.com", "https://notes.example.com/"),
            (
                " https://NOTES.example.com:443/ ",
                "https://notes.example.com/",
            ),
            ("https://192.168.1.20:8443", "https://192.168.1.20:8443/"),
            ("http://127.0.0.1:3000", "http://127.0.0.1:3000/"),
            ("http://[::1]:3000", "http://[::1]:3000/"),
        ] {
            assert_eq!(parse_server_origin(input).unwrap().as_str(), expected);
        }
    }

    #[test]
    fn rejects_credentials_tokens_paths_and_insecure_remote_servers() {
        for input in [
            "",
            "javascript:alert(1)",
            "file:///etc/passwd",
            "ftp://example.com",
            "https://user:password@example.com",
            "https://example.com/account",
            "https://example.com/?token=private",
            "https://example.com/#secret",
            "https://example.com/?",
            "https://example.com/#",
            "https://example.com\\@evil.test",
            "http://192.168.1.20",
            "http://localhost.evil.test",
        ] {
            assert!(parse_server_origin(input).is_err(), "Accepted {input}");
        }
        assert!(parse_server_origin("https://exam\nple.com").is_err());
    }
}
