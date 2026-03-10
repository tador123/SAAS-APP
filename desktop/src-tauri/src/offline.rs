use crate::{AppState, SyncStatus};

/// Get the current sync status: pending mutations count, last sync time, online check.
pub fn get_sync_status(state: &AppState) -> Result<SyncStatus, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let pending_count: usize = db
        .query_row("SELECT COUNT(*) FROM pending_mutations", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let last_sync: Option<String> = db
        .query_row(
            "SELECT synced_at FROM sync_log ORDER BY id DESC LIMIT 1",
            [],
            |row| row.get(0),
        )
        .ok();

    // Quick online check (non-blocking: just check if we have a URL configured)
    let is_online = {
        let base = state.api_base_url.lock().map_err(|e| e.to_string())?;
        !base.is_empty()
    };

    Ok(SyncStatus {
        pending_count,
        last_sync,
        is_online,
    })
}

/// Cache an entity's JSON data for offline access.
pub fn cache_entity(state: &AppState, entity: &str, data: &str) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT OR REPLACE INTO cached_entities (entity, data, cached_at)
         VALUES (?1, ?2, datetime('now'))",
        rusqlite::params![entity, data],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Retrieve cached entity data. Returns the JSON string or an error if not found.
pub fn get_cached(state: &AppState, entity: &str) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.query_row(
        "SELECT data FROM cached_entities WHERE entity = ?1",
        rusqlite::params![entity],
        |row| row.get::<_, String>(0),
    )
    .map_err(|e| format!("No cached data for '{}': {}", entity, e))
}

/// Queue a mutation (POST/PUT/DELETE) to be replayed when back online.
pub fn queue_mutation(
    state: &AppState,
    entity: &str,
    method: &str,
    path: &str,
    body: Option<&str>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO pending_mutations (entity, method, path, body)
         VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![entity, method, path, body],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Replay all pending mutations against the live API, then record sync result.
pub async fn sync_pending_mutations(state: &AppState) -> Result<SyncStatus, String> {
    // 1. Read pending mutations
    let mutations: Vec<(i64, String, String, Option<String>)> = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let mut stmt = db
            .prepare("SELECT id, method, path, body FROM pending_mutations ORDER BY id ASC")
            .map_err(|e| e.to_string())?;
        stmt.query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Option<String>>(3)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect()
    };

    if mutations.is_empty() {
        return get_sync_status(state);
    }

    let base_url = {
        let base = state.api_base_url.lock().map_err(|e| e.to_string())?;
        base.clone()
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let total = mutations.len();
    let mut synced_ids: Vec<i64> = Vec::new();

    // 2. Replay each mutation
    for (id, method, path, body) in &mutations {
        let url = format!("{}{}", base_url.trim_end_matches('/'), path);
        let request = match method.as_str() {
            "POST" => {
                let mut req = client.post(&url);
                if let Some(b) = body {
                    req = req.header("Content-Type", "application/json").body(b.clone());
                }
                req
            }
            "PUT" | "PATCH" => {
                let mut req = client.put(&url);
                if let Some(b) = body {
                    req = req.header("Content-Type", "application/json").body(b.clone());
                }
                req
            }
            "DELETE" => client.delete(&url),
            _ => continue,
        };

        match request.send().await {
            Ok(resp) if resp.status().is_success() || resp.status().as_u16() == 404 => {
                // 404 = entity already deleted remotely, treat as success
                synced_ids.push(*id);
            }
            Ok(resp) => {
                eprintln!(
                    "Sync failed for mutation {}: HTTP {}",
                    id,
                    resp.status()
                );
                // Stop on first server error to preserve ordering
                break;
            }
            Err(e) => {
                eprintln!("Sync network error for mutation {}: {}", id, e);
                break;
            }
        }
    }

    // 3. Remove synced mutations & log
    {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        for id in &synced_ids {
            let _ = db.execute("DELETE FROM pending_mutations WHERE id = ?1", [id]);
        }
        let _ = db.execute(
            "INSERT INTO sync_log (mutations, success) VALUES (?1, ?2)",
            rusqlite::params![synced_ids.len() as i64, if synced_ids.len() == total { 1 } else { 0 }],
        );
    }

    get_sync_status(state)
}

/// Clear ALL cached data and pending mutations (factory reset of local data).
pub fn clear_cache(state: &AppState) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute_batch(
        "DELETE FROM cached_entities; DELETE FROM pending_mutations; DELETE FROM sync_log;",
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
