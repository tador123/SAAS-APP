/**
 * Tauri bridge — provides access to native Tauri commands.
 * Falls back gracefully when running in a regular browser.
 */

const isTauri = () => typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;

let invoke = null;

async function getInvoke() {
  if (invoke) return invoke;
  if (!isTauri()) return null;
  try {
    const mod = await import('@tauri-apps/api/core');
    invoke = mod.invoke;
    return invoke;
  } catch {
    return null;
  }
}

export const tauriBridge = {
  isAvailable: isTauri,

  async checkOnlineStatus() {
    const fn = await getInvoke();
    if (!fn) return navigator.onLine;
    try {
      return await fn('check_online_status');
    } catch {
      return navigator.onLine;
    }
  },

  async createBackup() {
    const fn = await getInvoke();
    if (!fn) throw new Error('Backup is only available in the desktop app');
    return await fn('create_backup');
  },

  async printDocument(content, docType = 'html') {
    const fn = await getInvoke();
    if (!fn) {
      // Browser fallback: use window.print
      const printWindow = window.open('', '_blank');
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.print();
      return 'Opened browser print dialog';
    }
    return await fn('print_document', { content, docType });
  },

  async getSystemInfo() {
    const fn = await getInvoke();
    if (!fn) return { platform: 'web', arch: navigator.userAgent, version: '1.0.0', app_name: 'HotelSaaS Web' };
    return await fn('get_system_info');
  },

  async setApiUrl(url) {
    const fn = await getInvoke();
    if (!fn) return;
    return await fn('set_api_url', { url });
  },

  async getApiUrl() {
    const fn = await getInvoke();
    if (!fn) return import.meta.env.VITE_API_URL || '/api';
    return await fn('get_api_url');
  },

  async getSyncStatus() {
    const fn = await getInvoke();
    if (!fn) return { pending_count: 0, last_sync: null, is_online: navigator.onLine };
    return await fn('offline_get_sync_status');
  },

  async cacheEntity(entity, data) {
    const fn = await getInvoke();
    if (!fn) return;
    return await fn('offline_cache_entity', { entity, data: JSON.stringify(data) });
  },

  async getCached(entity) {
    const fn = await getInvoke();
    if (!fn) return null;
    try {
      const raw = await fn('offline_get_cached', { entity });
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async queueMutation(entity, method, path, body) {
    const fn = await getInvoke();
    if (!fn) return;
    return await fn('offline_queue_mutation', { entity, method, path, body: body ? JSON.stringify(body) : null });
  },

  async syncPending() {
    const fn = await getInvoke();
    if (!fn) return { pending_count: 0, last_sync: null, is_online: true };
    return await fn('offline_sync_pending');
  },

  async clearCache() {
    const fn = await getInvoke();
    if (!fn) return;
    return await fn('offline_clear_cache');
  },
};

export default tauriBridge;
