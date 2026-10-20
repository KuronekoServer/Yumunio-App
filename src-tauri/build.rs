fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&["probe_server", "connect_server"]),
    ))
    .expect("Failed to build Yumunio app resources");
}
