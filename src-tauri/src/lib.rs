mod origin;
mod server;

use origin::{is_loopback, parse_server_origin};
use server::{http_client, verify_server, ServerConnection};
use std::sync::Mutex;
use tauri::{Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use url::Url;

const RETURN_URL: &str = "https://yumunio-app.invalid/launcher";

struct AppState {
    client: reqwest::Client,
    launcher_url: Mutex<Option<Url>>,
    verified_server: Mutex<Option<ServerConnection>>,
}

/// Capabilities deny remote IPC. This additional check also guards custom commands
/// if someone accidentally broadens the capability file in a future change.
fn require_launcher(window: &WebviewWindow, state: &AppState) -> Result<(), String> {
    let current = window
        .url()
        .map_err(|_| "画面の状態を確認できませんでした。")?;
    let launcher = state
        .launcher_url
        .lock()
        .map_err(|_| "アプリの状態を確認できませんでした。")?;
    if window.label() != "main" || launcher.as_ref() != Some(&current) {
        return Err("この操作はアプリのサーバー選択画面でのみ利用できます。".into());
    }
    Ok(())
}

#[tauri::command]
async fn probe_server(
    window: WebviewWindow,
    state: tauri::State<'_, AppState>,
    origin: String,
) -> Result<ServerConnection, String> {
    require_launcher(&window, &state)?;
    let origin = parse_server_origin(&origin)?;
    *state
        .verified_server
        .lock()
        .map_err(|_| "アプリの状態を確認できませんでした。")? = None;
    let connection = verify_server(&state.client, &origin).await?;
    // Do not authorize a result if the user left the launcher while the request ran.
    require_launcher(&window, &state)?;
    *state
        .verified_server
        .lock()
        .map_err(|_| "アプリの状態を確認できませんでした。")? = Some(connection.clone());
    Ok(connection)
}

#[tauri::command]
fn connect_server(
    window: WebviewWindow,
    state: tauri::State<'_, AppState>,
    origin: String,
) -> Result<(), String> {
    require_launcher(&window, &state)?;
    let origin = parse_server_origin(&origin)?;
    let connection = state
        .verified_server
        .lock()
        .map_err(|_| "アプリの状態を確認できませんでした。")?
        .take()
        .filter(|connection| connection.origin == origin.origin().ascii_serialization())
        .ok_or("先にサーバーの接続を確認してください。")?;
    let path = if connection.setup_required {
        "/setup"
    } else {
        "/account"
    };
    let target = origin
        .join(path)
        .map_err(|_| "接続先URLを作成できませんでした。")?;
    window
        .navigate(target)
        .map_err(|_| "ログイン画面を開けませんでした。もう一度接続を確認してください。".into())
}

fn return_to_launcher(app: &tauri::AppHandle) {
    let state = app.state::<AppState>();
    let url = state
        .launcher_url
        .lock()
        .ok()
        .and_then(|value| value.clone());
    if let (Some(window), Some(url)) = (app.get_webview_window("main"), url) {
        if let Err(error) = window.navigate(url) {
            eprintln!("Unable to return to the launcher: {error}");
        }
    }
}

fn allowed_navigation(url: &Url, app: &tauri::AppHandle) -> bool {
    if url.as_str() == RETURN_URL {
        let handle = app.clone();
        // Dispatch after this navigation callback has returned to the WebView.
        let _ = app.run_on_main_thread(move || return_to_launcher(&handle));
        return false;
    }
    let state = app.state::<AppState>();
    if let Ok(launcher) = state.launcher_url.lock() {
        if launcher.as_ref() == Some(url) || launcher.is_none() {
            return true;
        }
    }
    // HTTPS redirects are needed for server-configured OAuth. Native APIs remain denied.
    url.scheme() == "https" || (url.scheme() == "http" && is_loopback(url))
}

#[cfg(desktop)]
fn install_menu(app: &tauri::App) -> tauri::Result<()> {
    use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};

    let servers = MenuItemBuilder::with_id("servers", "サーバーを選択…")
        .accelerator("CmdOrCtrl+Shift+S")
        .build(app)?;
    let reload = MenuItemBuilder::with_id("reload", "画面を再読み込み")
        .accelerator("CmdOrCtrl+R")
        .build(app)?;
    let application = SubmenuBuilder::new(app, "Yumunio")
        .item(&servers)
        .item(&reload)
        .separator()
        .quit()
        .build()?;
    let edit = SubmenuBuilder::new(app, "編集")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;
    let menu = MenuBuilder::new(app)
        .items(&[&application, &edit])
        .build()?;
    app.set_menu(menu)?;
    app.on_menu_event(|app, event| match event.id().as_ref() {
        "servers" => return_to_launcher(app),
        "reload" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.reload();
            }
        }
        _ => {}
    });
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            app.manage(AppState {
                client: http_client()?,
                launcher_url: Mutex::new(None),
                verified_server: Mutex::new(None),
            });
            let navigation_handle = app.handle().clone();
            let popup_handle = app.handle().clone();
            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("Yumunio")
                .inner_size(1280.0, 840.0)
                .min_inner_size(340.0, 560.0)
                .on_navigation(move |url| allowed_navigation(url, &navigation_handle))
                .on_new_window(move |url, _features| {
                    // Reuse this WebView so mobile and desktop retain the same cookie jar.
                    if allowed_navigation(&url, &popup_handle) {
                        if let Some(window) = popup_handle.get_webview_window("main") {
                            let _ = window.navigate(url);
                        }
                    }
                    tauri::webview::NewWindowResponse::Deny
                })
                .on_page_load(|window, payload| {
                    let state = window.state::<AppState>();
                    let is_launcher = if let Ok(mut launcher) = state.launcher_url.lock() {
                        // WebView2 initially reports about:blank from window.url().
                        // The first real load is the app-owned WebviewUrl::App above.
                        if launcher.is_none() && payload.url().scheme() != "about" {
                            *launcher = Some(payload.url().clone());
                        }
                        launcher.as_ref() == Some(payload.url())
                    } else {
                        return;
                    };
                    if is_launcher || payload.event() != tauri::webview::PageLoadEvent::Finished {
                        return;
                    }
                    if matches!(payload.url().scheme(), "http" | "https") {
                        // Only navigation UI is injected. No IPC or account data is exposed.
                        let _ = window.eval(include_str!("remote-toolbar.js"));
                    }
                })
                .build()?;
            #[cfg(desktop)]
            install_menu(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![probe_server, connect_server])
        .run(tauri::generate_context!())
        .expect("Unable to start Yumunio");
}
