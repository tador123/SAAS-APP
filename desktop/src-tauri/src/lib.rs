use tauri::{Manager, RunEvent, WindowEvent};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::path::PathBuf;

mod offline;

// ---------------------------------------------------------------------------
//  Shared state
// ---------------------------------------------------------------------------

pub struct AppState {
    pub db: Mutex<rusqlite::Connection>,
    pub api_base_url: Mutex<String>,
}

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupResult {
    success: bool,
    message: String,
    path: String,
    timestamp: String,
    size_bytes: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SyncStatus {
    pub pending_count: usize,
    pub last_sync: Option<String>,
    pub is_online: bool,
}

// ---------------------------------------------------------------------------
//  Commands
// ---------------------------------------------------------------------------

/// Real network connectivity check – pings the backend health endpoint.
#[tauri::command]
async fn check_online_status(state: tauri::State<'_, AppState>) -> Result<bool, String> {
    let url = {
        let base = state.api_base_url.lock().map_err(|e| e.to_string())?;
        format!("{}/health", base.trim_end_matches('/'))
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    match client.get(&url).send().await {
        Ok(resp) => Ok(resp.status().is_success()),
        Err(_) => Ok(false),
    }
}

/// Create a real local SQLite backup of the offline cache database.
#[tauri::command]
fn create_backup(state: tauri::State<'_, AppState>) -> Result<BackupResult, String> {
    let timestamp = chrono::Utc::now();
    let ts_str = timestamp.format("%Y%m%d_%H%M%S").to_string();

    let backup_dir = get_data_dir().join("backups");
    std::fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;
    let backup_path = backup_dir.join(format!("hotelsaas_backup_{}.db", ts_str));

    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut dst = rusqlite::Connection::open(&backup_path)
        .map_err(|e| format!("Failed to open backup destination: {}", e))?;
    let backup = rusqlite::backup::Backup::new(&db, &mut dst)
        .map_err(|e| format!("Failed to create backup: {}", e))?;
    backup
        .run_to_completion(5, std::time::Duration::from_millis(250), None)
        .map_err(|e| format!("Backup failed: {}", e))?;

    let size = std::fs::metadata(&backup_path)
        .map(|m| m.len())
        .unwrap_or(0);

    Ok(BackupResult {
        success: true,
        message: format!("Backup saved to {}", backup_path.display()),
        path: backup_path.to_string_lossy().to_string(),
        timestamp: timestamp.to_rfc3339(),
        size_bytes: size,
    })
}

/// Print a document via the OS default print mechanism.
/// On Windows this shells out to `print`, on macOS/Linux to `lp` / `lpr`.
#[tauri::command]
fn print_document(content: String, doc_type: String) -> Result<String, String> {
    let tmp_dir = std::env::temp_dir();
    let extension = match doc_type.as_str() {
        "invoice" | "receipt" => "html",
        "pdf" => "pdf",
        _ => "html",
    };
    let file_name = format!("hotelsaas_print_{}.{}", chrono::Utc::now().timestamp(), extension);
    let file_path = tmp_dir.join(&file_name);

    std::fs::write(&file_path, &content).map_err(|e| format!("Failed to write temp file: {}", e))?;

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &file_path.to_string_lossy()])
            .spawn()
            .map_err(|e| format!("Failed to open print dialog: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("Failed to open document: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("Failed to open document: {}", e))?;
    }

    Ok(format!("Opened {} for printing: {}", doc_type, file_path.display()))
}

/// Get system info for diagnostics
#[tauri::command]
fn get_system_info() -> serde_json::Value {
    let data_dir = get_data_dir();
    let db_path = data_dir.join("hotelsaas.db");
    let db_size = std::fs::metadata(&db_path).map(|m| m.len()).unwrap_or(0);

    serde_json::json!({
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "version": env!("CARGO_PKG_VERSION"),
        "app_name": "HotelSaaS Desktop",
        "data_dir": data_dir.to_string_lossy(),
        "db_size_bytes": db_size,
    })
}

/// Configure the backend API URL at runtime.
#[tauri::command]
fn set_api_url(url: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut base = state.api_base_url.lock().map_err(|e| e.to_string())?;
    *base = url;
    Ok(())
}

/// Get the current backend API URL.
#[tauri::command]
fn get_api_url(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let base = state.api_base_url.lock().map_err(|e| e.to_string())?;
    Ok(base.clone())
}

// ---------------------------------------------------------------------------
//  Offline / sync commands  (delegated to offline module)
// ---------------------------------------------------------------------------

#[tauri::command]
fn offline_get_sync_status(state: tauri::State<'_, AppState>) -> Result<SyncStatus, String> {
    offline::get_sync_status(&state)
}

#[tauri::command]
fn offline_cache_entity(
    entity: String,
    data: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    offline::cache_entity(&state, &entity, &data)
}

#[tauri::command]
fn offline_get_cached(entity: String, state: tauri::State<'_, AppState>) -> Result<String, String> {
    offline::get_cached(&state, &entity)
}

#[tauri::command]
fn offline_queue_mutation(
    entity: String,
    method: String,
    path: String,
    body: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    offline::queue_mutation(&state, &entity, &method, &path, body.as_deref())
}

#[tauri::command]
async fn offline_sync_pending(
    state: tauri::State<'_, AppState>,
) -> Result<SyncStatus, String> {
    offline::sync_pending_mutations(&state).await
}

#[tauri::command]
fn offline_clear_cache(state: tauri::State<'_, AppState>) -> Result<(), String> {
    offline::clear_cache(&state)
}

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

fn get_data_dir() -> PathBuf {
    dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("com.hotelsaas.desktop")
}

fn init_database() -> rusqlite::Connection {
    let data_dir = get_data_dir();
    std::fs::create_dir_all(&data_dir).expect("Failed to create data directory");
    let db_path = data_dir.join("hotelsaas.db");

    let conn = rusqlite::Connection::open(&db_path)
        .expect("Failed to open SQLite database");

    // Enable WAL mode for concurrency
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
        .expect("Failed to set pragmas");

    // Create offline cache tables
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS cached_entities (
            entity   TEXT NOT NULL,
            data     TEXT NOT NULL,
            cached_at TEXT NOT NULL DEFAULT (datetime('now')),
            PRIMARY KEY (entity)
        );
        CREATE TABLE IF NOT EXISTS pending_mutations (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            entity    TEXT NOT NULL,
            method    TEXT NOT NULL,
            path      TEXT NOT NULL,
            body      TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS sync_log (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            synced_at  TEXT NOT NULL DEFAULT (datetime('now')),
            mutations  INTEGER NOT NULL DEFAULT 0,
            success    INTEGER NOT NULL DEFAULT 1
        );
        "
    ).expect("Failed to create tables");

    println!("SQLite database initialized at {}", db_path.display());
    conn
}

// ---------------------------------------------------------------------------
//  App entry point
// ---------------------------------------------------------------------------

pub fn run() {
    let db = init_database();
    let default_api = std::env::var("API_BASE_URL")
        .unwrap_or_else(|_| "http://localhost:3001/api".to_string());

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(AppState {
            db: Mutex::new(db),
            api_base_url: Mutex::new(default_api),
        })
        .invoke_handler(tauri::generate_handler![
            check_online_status,
            create_backup,
            print_document,
            get_system_info,
            set_api_url,
            get_api_url,
            offline_get_sync_status,
            offline_cache_entity,
            offline_get_cached,
            offline_queue_mutation,
            offline_sync_pending,
            offline_clear_cache,
        ])
        .setup(|app| {
            // Build tray menu with Show and Quit options
            let show_item = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .on_menu_event(|app_handle, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app_handle.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app_handle.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            println!("HotelSaaS Desktop started successfully");
            println!("Features: Offline SQLite, Real Print, Network Check, Auto-Update, Backup");
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while running HotelSaaS Desktop")
        .run(|app_handle, event| {
            match event {
                RunEvent::WindowEvent {
                    event: WindowEvent::CloseRequested { api, .. },
                    label,
                    ..
                } => {
                    // Minimize to tray instead of closing
                    let window = app_handle.get_webview_window(&label).unwrap();
                    window.hide().unwrap();
                    api.prevent_close();
                }
                _ => {}
            }
        });
}
